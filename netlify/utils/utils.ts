import { Handler, HandlerContext, HandlerResponse } from '@netlify/functions';
import { ExecutedQuery } from '@planetscale/database/dist';

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

export type BulkRequestBody = RequestBody<any>

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
        const bodyOrError = getBody(event.body);
        if (!('data' in bodyOrError)) {
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
