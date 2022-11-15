import { Handler, HandlerResponse } from "@netlify/functions";
import { Repository } from "../utils/repository";

const handler: Handler = async (event, _) => {
  let response: HandlerResponse | undefined;
  switch (event.httpMethod) {
    case "GET":
      response = await getSettings();
      break;
    case "POST":
      const {data} = JSON.parse(event.body || '');
      if (!data) {
        return {
          statusCode: 500,
          body: "No data in body"
        }
      }
      response = await postSettings(data);
      break;
  }
  if (!response) {
    return {statusCode: 405, body: "Method Not Allowed"};
  }
  return response;
};

async function getSettings(): Promise<HandlerResponse> {
  const settings = await Repository.getSettings();
  return {
    statusCode: 200,
    body: JSON.stringify({data: settings})
  }
}

async function postSettings(settingsToSave: string): Promise<HandlerResponse> {
  const settings = await Repository.postSettings(settingsToSave);
  return {
    statusCode: 200,
    body: JSON.stringify({data: settings})
  }
}

export { handler };
