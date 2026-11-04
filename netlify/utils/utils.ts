import { Handler, HandlerContext, HandlerEvent, HandlerResponse } from '@netlify/functions';
import Busboy from 'busboy';

export function getUser(context: HandlerContext): { userId: string } | HandlerResponse {
  if (!context.clientContext || !context.clientContext['user']) return { statusCode: 401, body: 'Unauthorized' };
  return { userId: context.clientContext['user'].sub };
}

export function getBody(body: string | null): RequestBody | HandlerResponse {
  const { data, lastUpdatedAt, method } = JSON.parse(body || '{}');
  if (data === undefined || data === null) return { statusCode: 500, body: 'No data in body' };
  return { data, lastUpdatedAt, method };
}

export interface RequestBody<D = string> { data: D; lastUpdatedAt?: string; method?: 'GET' | 'POST' }
export type BulkRequestBodyData = { queryParams: string; body?: any };
export type BulkRequestBody = RequestBody<BulkRequestBodyData[]>;
export interface ResourceHandler<P> {
  getResource?: (userId: string, queryParams?: any) => Promise<HandlerResponse>;
  postResource?: (userId: string, body: RequestBody<P>, queryParams?: any) => Promise<HandlerResponse>;
  deleteResource?: (userId: string, queryParams?: any) => Promise<HandlerResponse>;
  bulkResource?: (userId: string, body: BulkRequestBody) => Promise<HandlerResponse>;
}

export function createHandler<P>({ getResource, postResource, deleteResource, bulkResource }: ResourceHandler<P>): Handler {
  return async (event, context) => {
    const userOrError = getUser(context);
    if (!('userId' in userOrError)) return userOrError;
    const { userId } = userOrError;
    const queryParams = event.queryStringParameters;
    let response: HandlerResponse | undefined;
    switch (event.httpMethod) {
      case 'GET':
        if (getResource) response = await getResource(userId, queryParams);
        break;
      case 'POST': {
        const bodyOrError = !event.headers['content-type']?.includes('json')
          ? { data: await parseMultipartForm(event) } as RequestBody<any>
          : getBody(event.body);
        if (!('data' in bodyOrError)) return bodyOrError;
        if (queryParams && 'bulk' in queryParams) {
          const bulkBody = bodyOrError as RequestBody<any>;
          if (!('method' in bulkBody)) return { statusCode: 500, body: 'Bulk body is not correct' };
          response = bulkResource ? await bulkResource(userId, bulkBody) : { statusCode: 500, body: 'Bulk operation not allowed' };
        } else if (postResource) response = await postResource(userId, bodyOrError, queryParams);
        break;
      }
      case 'DELETE':
        if (deleteResource) response = await deleteResource(userId, queryParams);
        break;
    }
    return response || { statusCode: 405, body: 'Method Not Allowed' };
  };
}

export interface RepositoryResult<D> { updatedAt: string; data: D; statusCode?: number }
export function getUpdatedAtFromRow(row: any | undefined): string { return row?.updated_at || ''; }
export function createResponse<T>({ data, updatedAt, statusCode }: RepositoryResult<T>): HandlerResponse {
  return { statusCode: statusCode || 200, body: JSON.stringify({ data, updatedAt }) };
}

export async function bulkCheckLastUpdate(query: PromiseLike<{ data: any[] }>, idColumn: string, lastUpdatedAt?: Record<string, string>): Promise<RepositoryResult<Record<string, RepositoryResult<string>>> | undefined> {
  if (!lastUpdatedAt) return undefined;
  const result = await query;
  const errors: Record<string, RepositoryResult<string>> = {};
  for (const row of result.data) {
    const id = row[idColumn];
    if (lastUpdatedAt[id] && getUpdatedAtFromRow(row) !== lastUpdatedAt[id]) {
      errors[id] = { data: 'OUT-OF-SYNC', statusCode: 500, updatedAt: getUpdatedAtFromRow(row) };
    }
  }
  return Object.keys(errors).length ? { data: errors, statusCode: 500, updatedAt: new Date().toISOString() } : undefined;
}

export interface ParsedFile<C = any> { filename: string; mimeType: string; encoding: string; content: C }
function parseMultipartForm(event: HandlerEvent): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: { 'content-type': event.headers['content-type'] || event.headers['Content-Type'] } });
    const result: Record<string, any> = {};
    const addField = (name: string, value: any) => {
      if (result[name] === undefined) result[name] = value;
      else if (Array.isArray(result[name])) result[name].push(value);
      else result[name] = [result[name], value];
    };
    busboy.on('file', (fieldname, file, { filename, encoding, mimeType }) => {
      const chunks: Buffer[] = [];
      file.on('data', (chunk: Buffer) => chunks.push(chunk));
      file.on('error', reject);
      file.on('end', () => addField(fieldname, { filename, mimeType, encoding, content: Buffer.concat(chunks) }));
    });
    busboy.on('field', addField);
    busboy.on('error', reject);
    busboy.on('finish', () => resolve(result));
    busboy.write(event.body || '', event.isBase64Encoded ? 'base64' : 'binary');
    busboy.end();
  });
}

export function getPhotoPath(user: string, id: string): string { return `${user}/${id}`; }
