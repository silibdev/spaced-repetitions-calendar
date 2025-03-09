import { DB } from './db-connector';
import { RepositoryResult, RequestBody } from './utils';
import { Tables } from './database.type';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';

export const CalendarEventRepository = {
  async getEventList(
    userId: string,
    middleDate: Date,
  ): Promise<RepositoryResult<any[]>> {
    const prev = startOfMonth(addMonths(middleDate, -1)).toISOString();
    const next = endOfMonth(addMonths(middleDate, 1)).toISOString();
    console.log({ prev, next });
    const result = await DB.from('calendarevent').select().eq('user', userId);
    // .gte('start', prev)
    // .lte('start', next);
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

  // any = SpecificSpacedRepModel
  async postEventList(
    userId: string,
    { data: list, lastUpdatedAt }: RequestBody<any[]>,
  ): Promise<RepositoryResult<any[]>> {
    // const checkError = await checkLastUpdate(
    //   DB.from('eventlist')
    //     .select('updated_at')
    //     .eq('user', userId),
    //   lastUpdatedAt);
    // if (checkError) return checkError;
    const updatedAt = new Date().toISOString();
    const values: Tables<'calendarevent'>[] = list.map(
      ({ id, linkedSpacedRepId, start, ...details }) => ({
        user: userId,
        id: id,
        masterid: linkedSpacedRepId,
        start: start,
        details,
      }),
    );
    const result = await DB.from('calendarevent').upsert(values);
    console.log('post list', result.count);
    return { data: list, updatedAt };
  },

  async deleteEvent(
    userId: string,
    eventId: string,
  ): Promise<RepositoryResult<any>> {
    const result = await DB.from('calendarevent')
      .delete()
      .eq('user', userId)
      .or(`id.eq.${eventId},masterid.eq.${eventId}`)
      .select();
    const events: Tables<'calendarevent'>[] | null = result.data;
    console.log(
      'delete events',
      events?.map((e) => e.id),
    );
    return { data: events, updatedAt: new Date().toISOString() };
  },
};
