import { Handler, HandlerResponse } from "@netlify/functions";
import { createHandler, createResponse } from '../utils/utils';
import { LastUpdatesRepository } from '../utils/last-updates.repository';

const handler: Handler = createHandler({
  getResource: getLastUpdates
})

async function getLastUpdates(userId: string): Promise<HandlerResponse> {
  const eventList = await LastUpdatesRepository.getLastUpdates(userId);
  return createResponse(eventList);
}

export { handler };
