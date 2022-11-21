import { Handler, HandlerContext, HandlerResponse } from '@netlify/functions';

export function getUser(context: HandlerContext): { userId: string } | HandlerResponse {
  if (!context.clientContext || !context.clientContext['user']) {
    return {
      statusCode: 401, body: "Unauthorized"
    };
  }
  const userId: string = context.clientContext['user'].sub;
  return {userId};
}

export function getBody(body: string | null): { data: string } | HandlerResponse {
  const {data} = JSON.parse(body || '{}');
  if (!data) {
    return {
      statusCode: 500,
      body: "No data in body"
    }
  }
  return {data};
}

export interface ResourceHandler {
  getResource?: (userId: string, queryParams?: any) => Promise<HandlerResponse>;
  postResource?: (userId: string, data: string, queryParams?: any) => Promise<HandlerResponse>;
  deleteResource?: (userID: string, queryParams?: any) => Promise<HandlerResponse>;
}

export function createHandler({getResource, postResource, deleteResource}: ResourceHandler): Handler {
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
        if (postResource) {
          const dataOrError = getBody(event.body);
          if (!('data' in dataOrError)) {
            return dataOrError;
          }
          response = await postResource(userId, dataOrError.data, queryParams);
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

export function createResponse(data: string): HandlerResponse {
  return {
    statusCode: 200,
    body: JSON.stringify({data})
  }
}
