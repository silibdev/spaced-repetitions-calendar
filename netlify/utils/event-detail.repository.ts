import { DB } from './db-connector';
import { checkLastUpdate, getUpdatedAtFromRow, RepositoryResult, RequestBody } from './utils';

export const EventDetailRepository = {
  async getEventDetail(userId: string, eventId: string): Promise<RepositoryResult<string>> {
    const result = await DB.execute("SELECT detail, updated_at FROM EventDetail WHERE user=:userId AND id=:id", {userId, id: eventId});
    const settingsRow: Record<string, any> = result.rows[0];
    console.log(settingsRow);
    const data: string = (settingsRow && settingsRow['detail']) || '';
    const updatedAt = getUpdatedAtFromRow(settingsRow);
    console.log('get event detail', eventId);
    return {data, updatedAt};
  },

  async postEventDetail(userId: string, eventId: string, {data: detail, lastUpdatedAt}: RequestBody): Promise<RepositoryResult<string>> {
    const checkError = await checkLastUpdate(DB.execute("SELECT updated_at FROM EventDetail WHERE user=:userId AND id=:id", {userId, id: eventId}), lastUpdatedAt);
    if (checkError) return checkError;
    const query = "INSERT INTO EventDetail (user, id, detail, updated_at) VALUES(:userId, :id, :detail, :updatedAt) ON DUPLICATE KEY UPDATE detail=:detail, updated_at=:updatedAt";
    const updatedAt = new Date().toISOString();
    const params = {
      userId,
      detail,
      id: eventId,
      updatedAt
    }
    const result = await DB.execute(query, params);
    console.log('post eventDetail', result.insertId);
    return {data: '{"ok":"ok"}', updatedAt};
  },

  async deleteEventDetail(userId: string, eventId: string): Promise<RepositoryResult<string>> {
    const result = await DB.execute("DELETE FROM EventDetail WHERE user=:userId AND id=:id", {userId, id: eventId});
    const eventDetailRow: Record<string, any> = result.rows[0];
    const eventDetail: string = (eventDetailRow && eventDetailRow['detail']) || '';
    const updatedAt = getUpdatedAtFromRow(eventDetailRow);
    console.log('delete eventDetail', eventDetail);
    return {data: eventDetail, updatedAt};
  }
}
