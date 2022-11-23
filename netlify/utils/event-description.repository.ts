import { DB } from './db-connector';
import { checkLastUpdate, getUpdatedAtFromRow, RepositoryResult, RequestBody } from './utils';

export const EventDescriptionRepository = {
  async getEventDescription(userId: string, eventId: string): Promise<RepositoryResult<string>> {
    const result = await DB.execute("SELECT description, updated_at FROM EventDescription WHERE user=:userId AND id=:id", {userId, id: eventId});
    const settingsRow: Record<string, any> = result.rows[0];
    const data: string = (settingsRow && settingsRow['description']) || '';
    const updatedAt = getUpdatedAtFromRow(settingsRow);
    console.log('get event description', data);
    return {data, updatedAt};
  },

  async postEventDescription(userId: string, eventId: string, {data: description, lastUpdatedAt}: RequestBody): Promise<RepositoryResult<string>> {
    const checkError = await checkLastUpdate(DB.execute("SELECT updated_at FROM EventDescription WHERE user=:userId AND id=:id", {userId, id: eventId}), lastUpdatedAt);
    if (checkError) return checkError;
    const query = "INSERT INTO EventDescription (user, id, description, updated_at) VALUES(:userId, :id, :description, :updatedAt) ON DUPLICATE KEY UPDATE description=:description, updated_at=:updatedAt";
    const updatedAt = new Date().toISOString();
    const params = {
      userId,
      description,
      id: eventId,
      updatedAt
    }
    const result = await DB.execute(query, params);
    console.log('post eventDescription', result);
    return {data: 'ok', updatedAt};
  },

  async deleteEventDescription(userId: string, eventId: string): Promise<RepositoryResult<string>> {
    const result = await DB.execute("DELETE FROM EventDescription WHERE user=:userId AND id=:id", {userId, id: eventId});
    const eventDescriptionRow: Record<string, any> = result.rows[0];
    const data: string = (eventDescriptionRow && eventDescriptionRow['description']) || '';
    const updatedAt = getUpdatedAtFromRow(eventDescriptionRow)
    console.log('delete eventDescription', data);
    return {data, updatedAt};
  }
}
