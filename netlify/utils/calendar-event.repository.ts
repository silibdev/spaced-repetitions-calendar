import { sql } from './db-connector';
import { RepositoryResult, RequestBody } from './utils';
import { Tables } from './database.type';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';

export const CalendarEventRepository = {
  async getEventList(userId: string, middleDate: Date): Promise<RepositoryResult<any[]>> {
    const prev = startOfMonth(addMonths(middleDate, -1)).toISOString();
    const next = endOfMonth(addMonths(middleDate, 1)).toISOString();
    console.log({ prev, next });
    const rows = await sql`SELECT id, start, "user", details, masterid FROM "db".calendarevent WHERE "user" = ${userId}`;
    const list = (rows as Tables<'calendarevent'>[]).map(({ id, start, details, masterid }) =>
      Object.assign({ id, start: new Date(start).toISOString(), linkedSpacedRepId: masterid }, details),
    );
    return { data: list, updatedAt: new Date().toISOString() };
  },

  async postEventList(userId: string, { data: list }: RequestBody<any[]>): Promise<RepositoryResult<any[]>> {
    const updatedAt = new Date().toISOString();
    for (const { id, linkedSpacedRepId, start, ...details } of list) {
      await sql`INSERT INTO "db".calendarevent ("user", id, masterid, start, details)
        VALUES (${userId}, ${id}, ${linkedSpacedRepId ?? null}, ${start}, ${JSON.stringify(details)}::jsonb)
        ON CONFLICT ("user", id, start) DO UPDATE SET masterid = EXCLUDED.masterid, details = EXCLUDED.details`;
    }
    return { data: list, updatedAt };
  },

  async deleteEvent(userId: string, eventId: string): Promise<RepositoryResult<any>> {
    const events = await sql`DELETE FROM "db".calendarevent WHERE "user" = ${userId} AND (id = ${eventId} OR masterid = ${eventId}) RETURNING *`;
    return { data: events as Tables<'calendarevent'>[], updatedAt: new Date().toISOString() };
  },
};
