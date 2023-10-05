import { Handler, HandlerResponse } from "@netlify/functions";
import { BulkRequestBody, createHandler, createResponse, RepositoryResult, RequestBody } from '../utils/utils';
import { EventDescriptionRepository } from '../utils/event-description.repository';

const handler: Handler = createHandler({
  getResource: getEventDescription,
  postResource: postEventDescription,
  deleteResource: deleteEventDescription,
  bulkResource: bulkEventDescription
})

async function getEventDescription(userId: string, {id}: {id: string}): Promise<HandlerResponse> {
  const eventDescription = await EventDescriptionRepository.getEventDescription(userId, id);
  return createResponse(eventDescription);
}

async function postEventDescription(userId: string, body: RequestBody, {id}: {id: string}): Promise<HandlerResponse> {
  const eventDescription = await EventDescriptionRepository.postEventDescription(userId, id, body);
  return createResponse(eventDescription);
}

async function deleteEventDescription(userId: string, {id}: {id: string}): Promise<HandlerResponse> {
  const eventDescription = await EventDescriptionRepository.deleteEventDescription(userId, id);
  return createResponse(eventDescription);
}

async function bulkEventDescription(userId: string, {data, method}: BulkRequestBody): Promise<HandlerResponse> {
  let response: RepositoryResult<Record<string, RepositoryResult<string>> | string>;
  switch (method) {
    case 'GET':
      const ids = data.map(d => new URLSearchParams(d.queryParams).get('id') as string);
      response = await EventDescriptionRepository.bulkGetEventDescription(userId, ids);
      break;
    case 'POST':
      response = await EventDescriptionRepository.bulkPostEventDescription(userId, data);
      break;
    default:
      response = {data: 'impossible', statusCode: 500, updatedAt: new Date().toISOString()};
  }
  return createResponse(response);
}

export { handler };
