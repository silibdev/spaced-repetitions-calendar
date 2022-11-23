import { DB } from './db-connector';
import { getUpdatedAtFromRow, RepositoryResult } from './utils';

export const LastUpdatesRepository = {
  async getLastUpdates(userId: string): Promise<RepositoryResult<any>> {
    const evResult = await DB.execute("SELECT updated_at FROM EventList WHERE user=:userId", {userId});
    const eventListUpdateRow: Record<string, any> = evResult.rows[0];
    const eventListUpdate = getUpdatedAtFromRow(eventListUpdateRow);
    console.log({eventListUpdate});

    const eventResult = await DB.execute("SELECT DET.id as id, DET.updated_at as det_update, DES.updated_at as des_update FROM EventDetail as DET JOIN EventDescription as DES ON DES.id=DET.id WHERE DET.user=:userId", {userId});

    const detUpdates: any[] = [];
    const desUpdates: any[] = [];

    eventResult.rows.forEach((row: any) => {
      const id = row['id']
      desUpdates.push({
        id, updatedAt: row['des_update']
      });
      detUpdates.push({
        id, updatedAt: row['det_update']
      });
    });

    return {
      data: {
        eventList: eventListUpdate,
        eventDescriptions:
        desUpdates,
        eventDetails:
        detUpdates
      },
      updatedAt: ''
    };
  }
}
