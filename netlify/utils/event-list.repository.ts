import { DB } from './db-connector';

export const EventListRepository = {
  async getEventList(userId: string): Promise<string> {
    const result = await DB.execute("SELECT list FROM EventList WHERE user=:userId", {userId});
    const settingsRow: Record<string, any> = result.rows[0];
    const list = (settingsRow && settingsRow['list']) || '';
    console.log('get settings', list);
    return list;
  },

  async postEventList(userId: string, list: string): Promise<string> {
    const query = "INSERT INTO EventList (user, list) VALUES(:userId, :list) ON DUPLICATE KEY UPDATE list=:list";
    const params = {
      userId,
      list
    }
    const result = await DB.execute(query, params);
    console.log('post list', result);
    return 'ok';
  },

  async deleteEventList(userId: string) {
    const result = await DB.execute("DELETE FROM EventList WHERE userId=:userId", {userId});
    const listRow: Record<string, any> = result.rows[0];
    const list = (listRow && listRow['list']) || '';
    console.log('delete list', list);
    return list;
  }
}
