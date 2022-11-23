import { Handler, HandlerResponse } from "@netlify/functions";
import { createHandler, createResponse, RequestBody } from '../utils/utils';
import { EventDetailRepository } from '../utils/event-detail.repository';

const handler: Handler = createHandler({
  getResource: getEventDetail,
  postResource: postEventDetail,
  deleteResource: deleteEventDetail
})

async function getEventDetail(userId: string, {id}: {id: string}): Promise<HandlerResponse> {
  const eventDetail = await EventDetailRepository.getEventDetail(userId, id);
  return createResponse(eventDetail);
}

async function postEventDetail(userId: string, body: RequestBody, {id}: {id: string}): Promise<HandlerResponse> {
  const eventDetail = await EventDetailRepository.postEventDetail(userId, id, body);
  return createResponse(eventDetail);
}

async function deleteEventDetail(userId: string, {id}: {id: string}): Promise<HandlerResponse> {
  const eventDetail = await EventDetailRepository.deleteEventDetail(userId, id);
  return createResponse(eventDetail);
}

export { handler };
