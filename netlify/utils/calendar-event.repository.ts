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
    const eventList = await DB.query<Tables<'calendarevent'>>(
      'SELECT "user", id, masterid, start, details FROM calendarevent WHERE "user" = $1',
      [userId],
    );
    const list =
      eventList?.map(({ id, start, user, details, masterid }) =>
        Object.assign(
          {
            id,
            start: new Date(start).toISOString(),
            linkedSpacedRepId: masterid,
          },
          typeof details === 'string' ? JSON.parse(details) : details,
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
    const updatedAt = new Date().toISOString();
    for (const item of list) {
      const { id, linkedSpacedRepId, start, ...details } = item;
      await DB.query(
        `INSERT INTO calendarevent ("user", id, masterid, start, details)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("user", id, start)
         DO UPDATE SET masterid = EXCLUDED.masterid, details = EXCLUDED.details`,
        [userId, id, linkedSpacedRepId || null, start, JSON.stringify(details)],
      );
    }
    console.log('post list', list.length);
    return { data: list, updatedAt };
  },

  async deleteEvent(
    userId: string,
    eventId: string,
  ): Promise<RepositoryResult<any>> {
    const events = await DB.query<Tables<'calendarevent'>>(
      'DELETE FROM calendarevent WHERE "user" = $1 AND (id = $2 OR masterid = $2) RETURNING "user", id, masterid, start, details',
      [userId, eventId],
    );
    console.log(
      'delete events',
      events?.map((e) => e.id),
    );
    return { data: events, updatedAt: new Date().toISOString() };
  },
};
