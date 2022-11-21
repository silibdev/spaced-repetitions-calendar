import { Handler, HandlerResponse } from "@netlify/functions";
import { SettingsRepository } from "../utils/settings.repository";
import { createHandler, createResponse } from '../utils/utils';

const handler: Handler = createHandler({
  getResource: getSettings,
  postResource: postSettings
})

async function getSettings(userId: string): Promise<HandlerResponse> {
  const settings = await SettingsRepository.getSettings(userId);
  return createResponse(settings);
}

async function postSettings(userId: string, settingsToSave: string): Promise<HandlerResponse> {
  const settings = await SettingsRepository.postSettings(userId, settingsToSave);
  return createResponse(settings);
}

export { handler };
