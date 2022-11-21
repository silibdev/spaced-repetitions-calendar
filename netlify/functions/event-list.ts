import { Handler, HandlerResponse } from "@netlify/functions";
import { createHandler, createResponse } from '../utils/utils';
import { EventListRepository } from '../utils/event-list.repository';

const handler: Handler = createHandler({
  getResource: getEventList,
  postResource: postEventList
})

async function getEventList(userId: string): Promise<HandlerResponse> {
  const eventList = await EventListRepository.getEventList(userId);
  return createResponse(eventList);
}

async function postEventList(userId: string, eventListToSave: string): Promise<HandlerResponse> {
  const eventList = await EventListRepository.postEventList(userId, eventListToSave);
  return createResponse(eventList);
}

export { handler };
