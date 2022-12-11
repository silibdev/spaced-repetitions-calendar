import { Handler, HandlerResponse } from "@netlify/functions";
import { createHandler, createResponse } from '../utils/utils';
import { DataRepository } from '../utils/data.repository';

const handler: Handler = createHandler({
  deleteResource: deleteData
})

async function deleteData(userId: string): Promise<HandlerResponse> {
  const dataDeleted = await DataRepository.deleteData(userId);
  return createResponse(dataDeleted);
}

export { handler };
