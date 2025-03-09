import { Handler, HandlerResponse } from '@netlify/functions';
import { createHandler, createResponse, RequestBody } from '../utils/utils';
import { CalendarEventRepository } from '../utils/calendar-event.repository';

const handler: Handler = createHandler({
  getResource: getCalendarEvent,
  postResource: postEventList,
  deleteResource: deleteCalendarEvent,
});

async function getCalendarEvent(
  userId: string,
  { date }: { date: string },
): Promise<HandlerResponse> {
  let middleDate = new Date();
  try {
    middleDate = new Date(date);
  } catch (e) {}
  const eventList = await CalendarEventRepository.getEventList(
    userId,
    middleDate,
  );
  return createResponse(eventList);
}

async function postEventList(
  userId: string,
  body: RequestBody<any[]>,
): Promise<HandlerResponse> {
  const eventList = await CalendarEventRepository.postEventList(userId, body);
  return createResponse(eventList);
}

async function deleteCalendarEvent(
  userId: string,
  { id }: { id: string },
): Promise<HandlerResponse> {
  const events = await CalendarEventRepository.deleteEvent(userId, id);
  return createResponse(events);
}

export { handler };
