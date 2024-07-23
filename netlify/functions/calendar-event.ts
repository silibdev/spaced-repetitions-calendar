import { Handler, HandlerResponse } from "@netlify/functions";
import { createHandler, createResponse } from '../utils/utils';
import { CalendarEventRepository } from '../utils/calendar-event.repository';


const handler: Handler = createHandler({
  getResource: getCalendarEvent,
  // postResource: postEventList
})

async function getCalendarEvent(userId: string, {date}: {date: string}): Promise<HandlerResponse> {
  let middleDate = new Date();
  try {
    middleDate = new Date(date);
  } catch (e) {}
  const eventList = await CalendarEventRepository.getEventList(userId, middleDate);
  return createResponse(eventList);
}

// async function postEventList(userId: string, body: RequestBody): Promise<HandlerResponse> {
//   const eventList = await EventListRepository.postEventList(userId, body);
//   return createResponse(eventList);
// }

export { handler };
