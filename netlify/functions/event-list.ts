import { Handler, HandlerResponse } from '@netlify/functions';
import { createHandler, createResponse, RequestBody } from '../utils/utils';
import { EventListRepository } from '../utils/event-list.repository';

const handler: Handler = createHandler({
  getResource: getEventList,
  postResource: postEventList,
});

async function getEventList(userId: string): Promise<HandlerResponse> {
  const eventList = await EventListRepository.getEventList(userId);
  return createResponse(eventList);
}

async function postEventList(
  userId: string,
  body: RequestBody,
): Promise<HandlerResponse> {
  const eventList = await EventListRepository.postEventList(userId, body);
  return createResponse(eventList);
}

export { handler };
