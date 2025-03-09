import { DB } from './db-connector';
import { RepositoryResult } from './utils';

export const LastUpdatesRepository = {
  async getLastUpdates(userId: string): Promise<RepositoryResult<any>> {
    const result = await DB.from('eventlist')
      .select(
        `
      updated_at,
      settings (
        updated_at
      )
      `,
      )
      .eq('user', userId)
      .maybeSingle();
    const row = result.data;
    const eventListUpdate = row?.updated_at;
    const settingsUpdate = row?.settings?.updated_at;
    console.log({ eventListUpdate, settingsUpdate });

    const eventResult = await DB.from('eventdetail')
      .select(
        `
      id,
      updated_at,
      eventdescription (
        updated_at
      )
      `,
      )
      .eq('user', userId);
    const detUpdates: any[] = [];
    const desUpdates: any[] = [];

    (eventResult.data || []).forEach((row) => {
      const id = row.id;
      desUpdates.push({
        id,
        updatedAt: row.eventdescription?.updated_at,
      });
      detUpdates.push({
        id,
        updatedAt: row.updated_at,
      });
    });

    return {
      data: {
        eventList: eventListUpdate,
        eventDescriptions: desUpdates,
        eventDetails: detUpdates,
        settings: settingsUpdate,
      },
      updatedAt: '',
    };
  },
};
