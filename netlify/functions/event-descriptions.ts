import { Handler, HandlerResponse } from "@netlify/functions";
import { createHandler, createResponse } from '../utils/utils';
import { EventDetailRepository } from '../utils/event-detail.repository';
import { EventDescriptionRepository } from '../utils/event-description.repository';

const handler: Handler = createHandler({
  getResource: getEventDescription,
  postResource: postEventDescription,
  deleteResource: deleteEventDescription
})

async function getEventDescription(userId: string, {id}: {id: string}): Promise<HandlerResponse> {
  const eventDescription = await EventDescriptionRepository.getEventDescription(userId, id);
  return createResponse(eventDescription);
}

async function postEventDescription(userId: string, eventDescriptionToSave: string, {id}: {id: string}): Promise<HandlerResponse> {
  const eventDescription = await EventDescriptionRepository.postEventDescription(userId, eventDescriptionToSave, id);
  return createResponse(eventDescription);
}

async function deleteEventDescription(userId: string, {id}: {id: string}): Promise<HandlerResponse> {
  const eventDescription = await EventDescriptionRepository.deleteEventDescription(userId, id);
  return createResponse(eventDescription);
}

export { handler };
