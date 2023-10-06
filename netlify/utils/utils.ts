import { Handler, HandlerContext, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { ExecutedQuery } from '@planetscale/database/dist';
import Busboy from 'busboy';

export function getUser(context: HandlerContext): { userId: string } | HandlerResponse {
  if (!context.clientContext || !context.clientContext['user']) {
    return {
      statusCode: 401, body: "Unauthorized"
    };
  }
  const userId: string = context.clientContext['user'].sub;
  return {userId};
}

export function getBody(body: string | null): RequestBody | HandlerResponse {
  const {data, lastUpdatedAt, method} = JSON.parse(body || '{}');
  if (data === undefined || data === null) {
    return {
      statusCode: 500,
      body: "No data in body"
    }
  }
  return {data, lastUpdatedAt, method};
}

export interface RequestBody<D = string> {
  data: D,
  lastUpdatedAt?: string,
  method?: 'GET' | 'POST'
}

export type BulkRequestBodyData = { queryParams: string, body?: any };
export type BulkRequestBody = RequestBody<BulkRequestBodyData[]>;

export interface ResourceHandler {
  getResource?: (userId: string, queryParams?: any) => Promise<HandlerResponse>;
  postResource?: (userId: string, body: RequestBody, queryParams?: any) => Promise<HandlerResponse>;
  deleteResource?: (userId: string, queryParams?: any) => Promise<HandlerResponse>;
  bulkResource?: (userId: string, body: BulkRequestBody) => Promise<HandlerResponse>;
}

export function createHandler({getResource, postResource, deleteResource, bulkResource}: ResourceHandler): Handler {
  return async (event, context) => {
    let response: HandlerResponse | undefined;
    const userOrError = getUser(context);
    if (!('userId' in userOrError)) {
      return userOrError;
    }
    const userId = userOrError.userId;
    const queryParams = event.queryStringParameters;
    console.log('query', queryParams);
    switch (event.httpMethod) {
      case "GET":
        if (getResource) {
          response = await getResource(userId, queryParams);
        }
        break;
      case "POST":
        let bodyOrError;
        if (!event.headers['content-type']?.includes('json')) {
          const data = await parseMultipartForm(event);
          bodyOrError = {data} as RequestBody<any>;
          console.log('form data post');
        } else {
          bodyOrError = getBody(event.body);
        }
        if (!('data' in bodyOrError)) {
          console.log('error in body')
          return bodyOrError;
        }
        if (queryParams && 'bulk' in queryParams) {
          const bulkBody = bodyOrError as RequestBody<any>;
          if (!('data' in bulkBody) || !('method' in bulkBody)) {
            response = {
              statusCode: 500,
              body: "Bulk body is not correct"
            }
          } else {
            if (bulkResource) {
              response = await bulkResource(userId, bulkBody);
            } else {
              response = {statusCode: 500, body: "Bulk operation not allowed"}
            }
          }
        } else {
          if (postResource) {
            response = await postResource(userId, bodyOrError, queryParams);
          }
        }
        break;
      case "DELETE":
        if (deleteResource) {
          response = await deleteResource(userId, queryParams);
        }
    }
    if (!response) {
      return {statusCode: 405, body: "Method Not Allowed"};
    }
    return response;
  };
}

export interface RepositoryResult<D> {
  updatedAt: string,
  data: D,
  statusCode?: number
}

export function getUpdatedAtFromRow(row: any | undefined): string {
  return row?.updated_at || '';
}

export function createResponse<T>({data, updatedAt, statusCode}: RepositoryResult<T>): HandlerResponse {
  return {
    statusCode: statusCode || 200,
    body: JSON.stringify({data, updatedAt})
  }
}

// Undefined means everything is ok
export async function checkLastUpdate(query: Promise<ExecutedQuery>, lastUpdatedAt?: string): Promise<RepositoryResult<string> | undefined> {
  if (!lastUpdatedAt) {
    return undefined;
  }
  const updatedAtResult = await query;
  if (!updatedAtResult.rows.length) {
    return undefined;
  }
  const lastUpdateFromDb = getUpdatedAtFromRow(updatedAtResult.rows[0]);
  if (lastUpdateFromDb === lastUpdatedAt) {
    return undefined;
  }
  return ({data: 'OUT-OF-SYNC', statusCode: 500, updatedAt: lastUpdateFromDb});
}

// Undefined means everything is ok
export async function bulkCheckLastUpdate(query: Promise<ExecutedQuery>, idColumn: string, lastUpdatedAt?: Record<string, string>): Promise<RepositoryResult<Record<string, RepositoryResult<string>>> | undefined> {
  if (!lastUpdatedAt) {
    return undefined;
  }
  const updatedAtResult = await query;
  if (!updatedAtResult.rows.length) {
    return undefined;
  }

  const rowsOutOfSync = updatedAtResult.rows
    .filter((row: Record<string, any>) => lastUpdatedAt[row[idColumn]] && getUpdatedAtFromRow(row) !== lastUpdatedAt[row[idColumn]])
    .map((row: Record<string, any>) => ({
      id: row[idColumn],
      result: {data: 'OUT-OF-SYNC', statusCode: 500, updatedAt: getUpdatedAtFromRow(row)} as RepositoryResult<string>
    }));

  if (!rowsOutOfSync.length) {
    return undefined;
  }
  const errors = rowsOutOfSync.reduce((acc, err) => {
      acc[err.id] = {
        data: err.result.data,
        updatedAt: err.result.updatedAt,
        statusCode: err.result.statusCode
      };
      return acc;
    }, {} as Record<string, RepositoryResult<string>>);
  return {data: errors, statusCode: 500, updatedAt: new Date().toISOString()};
}

function parseMultipartForm(event: HandlerEvent) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: {
        'content-type': event.headers['content-type'] || event.headers['Content-Type']
      }
    });
    const result: any = {
    };

    const addField = (fieldname: string, value: any) => {
      const oldField = result[fieldname];
      if (!oldField) {
        result[fieldname] = value;
      } else if (oldField instanceof Array) {
        oldField.push(value);
      } else {
        result[fieldname] = [oldField, value];
      }
    }

    busboy.on('file', (fieldname, file, {filename, encoding,mimeType}) => {
      let content: any;

      file.on('data', (data) => {
        content = data;
      });

      file.on('end', () => {
        if (content) {
          const myFile = {
            filename, mimeType, encoding, content
          };
          addField(fieldname, myFile);
        }
      });
    });

    busboy.on('field', (fieldname, value) => {
      addField(fieldname, value)
    });

    busboy.on('error', error => {
      reject(error);
    });

    busboy.on('finish', () => {
      resolve(result);
    });

    const encoding = (event.isBase64Encoded ? "base64" : "binary");

    busboy.write(event.body, encoding);
    busboy.end();
  });
}
