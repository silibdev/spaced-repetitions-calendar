import { DB } from './db-connector';
import { checkLastUpdate, getUpdatedAtFromRow, RepositoryResult, RequestBody } from './utils';

export const EventListRepository = {
  async getEventList(userId: string): Promise<RepositoryResult<string>> {
    const result = await DB.execute("SELECT list, updated_at FROM EventList WHERE user=:userId", {userId});
    const eventListRow: Record<string, any> = result.rows[0];
    const list: string = (eventListRow && eventListRow['list']) || '';
    const updatedAt = getUpdatedAtFromRow(eventListRow);
    console.log('get eventList', userId);
    return {data: list, updatedAt};
  },

  async postEventList(userId: string, {data: list, lastUpdatedAt}: RequestBody): Promise<RepositoryResult<string>> {
    const checkError = await checkLastUpdate(DB.execute("SELECT updated_at FROM EventList WHERE user=:userId", {userId}), lastUpdatedAt);
    if (checkError) return checkError;
    const query = "INSERT INTO EventList (user, list, updated_at) VALUES(:userId, :list, :updatedAt) ON DUPLICATE KEY UPDATE list=:list, updated_at=:updatedAt";
    const updatedAt = new Date().toISOString();
    const params = {
      userId,
      list,
      updatedAt
    }
    const result = await DB.execute(query, params);
    console.log('post list', result.insertId);
    return {data: 'ok', updatedAt};
  },

  async deleteEventList(userId: string): Promise<RepositoryResult<string>> {
    const result = await DB.execute("DELETE FROM EventList WHERE userId=:userId", {userId});
    const listRow: Record<string, any> = result.rows[0];
    const list: string = (listRow && listRow['list']) || '';
    const updatedAt = getUpdatedAtFromRow(listRow);
    console.log('delete list', list);
    return {data: list, updatedAt};
  }
}
