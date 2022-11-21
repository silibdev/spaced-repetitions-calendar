import { DB } from './db-connector';

export const EventDetailRepository = {
  async getEventDetail(userId: string, eventId: string): Promise<string> {
    const result = await DB.execute("SELECT detail FROM EventDetail WHERE user=:userId AND id=:id", {userId, id: eventId});
    const settingsRow: Record<string, any> = result.rows[0];
    console.log(settingsRow);
    const eventDetail = (settingsRow && settingsRow['detail']) || '';
    console.log('get event detail', eventDetail);
    return eventDetail;
  },

  async postEventDetail(userId: string, eventId: string, detail: string): Promise<string> {
    const query = "INSERT INTO EventDetail (user, id, detail) VALUES(:userId, :id, :detail) ON DUPLICATE KEY UPDATE detail=:detail";
    const params = {
      userId,
      detail,
      id: eventId
    }
    const result = await DB.execute(query, params);
    console.log('post eventDetail', result);
    return 'ok';
  },

  async deleteEventDetail(userId: string, eventId: string) {
    const result = await DB.execute("DELETE FROM EventDetail WHERE user=:userId AND id=:id", {userId, id: eventId});
    const eventDetailRow: Record<string, any> = result.rows[0];
    const eventDetail = (eventDetailRow && eventDetailRow['detail']) || '';
    console.log('delete eventDetail', eventDetail);
    return eventDetail;
  }
}
