import { DB } from './db-connector';
import {
  checkLastUpdate,
  getUpdatedAtFromRow,
  RepositoryResult,
  RequestBody,
} from './utils';
import { Tables } from './database.type';

export const EventListRepository = {
  async getEventList(userId: string): Promise<RepositoryResult<string>> {
    const result = await DB.from('eventlist')
      .select()
      .eq('user', userId)
      .maybeSingle();
    const eventListRow: Tables<'eventlist'> | null = result.data;
    const list: string = eventListRow?.list || '';
    const updatedAt = getUpdatedAtFromRow(eventListRow);
    console.log('get eventList', userId);
    return { data: list, updatedAt };
  },

  async postEventList(
    userId: string,
    { data: list, lastUpdatedAt }: RequestBody,
  ): Promise<RepositoryResult<string>> {
    const checkError = await checkLastUpdate(
      DB.from('eventlist').select('updated_at').eq('user', userId),
      lastUpdatedAt,
    );
    if (checkError) return checkError;
    const updatedAt = new Date().toISOString();
    const values: Tables<'eventlist'> = {
      user: userId,
      list,
      updated_at: updatedAt,
    };
    const result = await DB.from('eventlist').upsert(values);
    console.log('post list', result.count);
    return { data: 'ok', updatedAt };
  },

  async deleteEventList(userId: string): Promise<RepositoryResult<string>> {
    const result = await DB.from('eventlist')
      .delete()
      .eq('user', userId)
      .select()
      .maybeSingle();
    const listRow: Tables<'eventlist'> | null = result.data;
    const list: string = listRow?.list || '';
    const updatedAt = getUpdatedAtFromRow(listRow);
    console.log('delete list', list);
    return { data: list, updatedAt };
  },
};
