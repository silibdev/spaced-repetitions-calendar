import { DB } from './db-connector';
import { RepositoryResult } from './utils';

export const LastUpdatesRepository = {
  async getLastUpdates(userId: string): Promise<RepositoryResult<any>> {
    const [listResult, settingsResult, eventResult, descriptionResult] = await Promise.all([
      DB.from('eventlist').select('updated_at').eq('user', userId).maybeSingle(),
      DB.from('settings').select('updated_at').eq('user', userId).maybeSingle(),
      DB.from('eventdetail').select('id, updated_at').eq('user', userId),
      DB.from('eventdescription').select('id, updated_at').eq('user', userId),
    ]);
    const descriptions = new Map((descriptionResult.data || []).map((row: any) => [row.id, row.updated_at]));
    const eventDescriptions = (eventResult.data || []).map((row: any) => ({ id: row.id, updatedAt: descriptions.get(row.id) }));
    const eventDetails = (eventResult.data || []).map((row: any) => ({ id: row.id, updatedAt: row.updated_at }));
    return {
      data: {
        eventList: listResult.data?.updated_at,
        eventDescriptions,
        eventDetails,
        settings: settingsResult.data?.updated_at,
      },
      updatedAt: '',
    };
  },
};
