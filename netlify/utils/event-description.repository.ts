import { DB } from './db-connector';

export const EventDescriptionRepository = {
  async getEventDescription(userId: string, eventId: string): Promise<string> {
    const result = await DB.execute("SELECT description FROM EventDescription WHERE user=:userId AND id=:id", {userId, id: eventId});
    const settingsRow: Record<string, any> = result.rows[0];
    const eventDescription = (settingsRow && settingsRow['description']) || '';
    console.log('get event description', eventDescription);
    return eventDescription;
  },

  async postEventDescription(userId: string, eventId: string, description: string): Promise<string> {
    const query = "INSERT INTO EventDescription (user, id, description) VALUES(:userId, :id, :description) ON DUPLICATE KEY UPDATE description=:description";
    const params = {
      userId,
      description,
      id: eventId
    }
    const result = await DB.execute(query, params);
    console.log('post eventDescription', result);
    return 'ok';
  },

  async deleteEventDescription(userId: string, eventId: string) {
    const result = await DB.execute("DELETE FROM EventDescription WHERE user=:userId AND id=:id", {userId, id: eventId});
    const eventDescriptionRow: Record<string, any> = result.rows[0];
    const eventDescription = (eventDescriptionRow && eventDescriptionRow['description']) || '';
    console.log('delete eventDescription', eventDescription);
    return eventDescription;
  }
}
