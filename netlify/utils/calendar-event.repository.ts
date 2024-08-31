import { DB } from './db-connector';
import { RepositoryResult } from './utils';
import { Tables } from './database.type';
import { addMonths } from 'date-fns';

export const CalendarEventRepository = {
  async getEventList(
    userId: string,
    middleDate: Date,
  ): Promise<RepositoryResult<any[]>> {
    const prev = addMonths(middleDate, -1).toISOString();
    const next = addMonths(middleDate, 1).toISOString();
    console.log({ prev, next });
    const result = await DB.from('calendarevent')
      .select()
      .eq('user', userId)
      .gte('start', prev)
      .lte('start', next);
    const eventList: Tables<'calendarevent'>[] | null = result.data;
    const list =
      eventList?.map(({ id, start, user, details, masterid }) =>
        Object.assign(
          {
            id,
            start: new Date(start).toISOString(),
            linkedSpacedRepId: masterid,
          },
          details,
        ),
      ) || [];
    const updatedAt = new Date().toISOString();
    console.log('get eventList', userId);
    return { data: list, updatedAt };
  },

  // async postEventList(userId: string, {data: list, lastUpdatedAt}: RequestBody): Promise<RepositoryResult<string>> {
  //   const checkError = await checkLastUpdate(
  //     DB.from('eventlist')
  //       .select('updated_at')
  //       .eq('user', userId),
  //     lastUpdatedAt);
  //   if (checkError) return checkError;
  //   const updatedAt = new Date().toISOString();
  //   const values: Tables<'eventlist'> = {
  //     user: userId,
  //     list,
  //     updated_at: updatedAt
  //   }
  //   const result = await DB.from('eventlist').upsert(values);
  //   console.log('post list', result.count);
  //   return {data: 'ok', updatedAt};
  // },
  //
  // async deleteEventList(userId: string): Promise<RepositoryResult<string>> {
  //   const result = await DB.from('eventlist')
  //     .delete()
  //     .eq('user', userId)
  //     .select()
  //     .maybeSingle();
  //   const listRow: Tables<'eventlist'> | null = result.data;
  //   const list: string = listRow?.list || '';
  //   const updatedAt = getUpdatedAtFromRow(listRow);
  //   console.log('delete list', list);
  //   return {data: list, updatedAt};
  // }
};
