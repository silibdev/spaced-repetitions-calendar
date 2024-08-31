import { Handler, HandlerResponse } from '@netlify/functions';
import {
  BulkRequestBody,
  createHandler,
  createResponse,
  RepositoryResult,
  RequestBody,
} from '../utils/utils';
import { EventDetailRepository } from '../utils/event-detail.repository';

const handler: Handler = createHandler({
  getResource: getEventDetail,
  postResource: postEventDetail,
  deleteResource: deleteEventDetail,
  bulkResource: bulkEventDetail,
});

async function getEventDetail(
  userId: string,
  { id }: { id: string },
): Promise<HandlerResponse> {
  const eventDetail = await EventDetailRepository.getEventDetail(userId, id);
  return createResponse(eventDetail);
}

async function postEventDetail(
  userId: string,
  body: RequestBody,
  { id }: { id: string },
): Promise<HandlerResponse> {
  const eventDetail = await EventDetailRepository.postEventDetail(
    userId,
    id,
    body,
  );
  return createResponse(eventDetail);
}

async function deleteEventDetail(
  userId: string,
  { id }: { id: string },
): Promise<HandlerResponse> {
  const eventDetail = await EventDetailRepository.deleteEventDetail(userId, id);
  return createResponse(eventDetail);
}

async function bulkEventDetail(
  userId: string,
  { data, method }: BulkRequestBody,
): Promise<HandlerResponse> {
  let response: RepositoryResult<
    Record<string, RepositoryResult<string>> | string
  >;
  switch (method) {
    case 'GET':
      const ids = data.map(
        (d) => new URLSearchParams(d.queryParams).get('id') as string,
      );
      response = await EventDetailRepository.bulkGetEventDetail(userId, ids);
      break;
    case 'POST':
      response = await EventDetailRepository.bulkPostEventDetail(userId, data);
      break;
    default:
      response = {
        data: 'impossible',
        statusCode: 500,
        updatedAt: new Date().toISOString(),
      };
  }
  return createResponse(response);
}

export { handler };
