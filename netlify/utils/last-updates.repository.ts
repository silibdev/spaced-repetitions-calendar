import { DB } from './db-connector';
import { RepositoryResult } from './utils';

export const LastUpdatesRepository = {
  async getLastUpdates(userId: string): Promise<RepositoryResult<any>> {
    const result = await DB.execute("SELECT EL.updated_at as el_update, S.updated_at as s_update FROM EventList as EL JOIN Settings as S ON EL.user=S.user WHERE EL.user=:userId", {userId});
    const row: Record<string, any> = result.rows[0];
    const eventListUpdate = row && row['el_update'];
    const settingsUpdate = row && row['s_update'];
    console.log({eventListUpdate, settingsUpdate});

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
        eventDescriptions: desUpdates,
        eventDetails: detUpdates,
        settings: settingsUpdate
      },
      updatedAt: ''
    };
  }
}
