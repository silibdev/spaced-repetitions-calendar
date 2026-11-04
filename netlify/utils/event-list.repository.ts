import { sql } from './db-connector';
import { getUpdatedAtFromRow, RepositoryResult, RequestBody } from './utils';
import { Tables } from './database.type';

export const EventListRepository = {
  async getEventList(userId: string): Promise<RepositoryResult<string>> {
    const rows = await sql`SELECT list, updated_at FROM "db".eventlist WHERE "user" = ${userId} LIMIT 1`;
    const row = rows[0] as Tables<'eventlist'> | undefined;
    return { data: row?.list || '', updatedAt: getUpdatedAtFromRow(row) };
  },

  async postEventList(userId: string, { data: list, lastUpdatedAt }: RequestBody): Promise<RepositoryResult<string>> {
    if (lastUpdatedAt) {
      const rows = await sql`SELECT updated_at FROM "db".eventlist WHERE "user" = ${userId}`;
      if (rows.length && getUpdatedAtFromRow(rows[0]) !== lastUpdatedAt) {
        return { data: 'OUT-OF-SYNC', statusCode: 500, updatedAt: getUpdatedAtFromRow(rows[0]) };
      }
    }
    const updatedAt = new Date().toISOString();
    await sql`INSERT INTO "db".eventlist ("user", list, updated_at) VALUES (${userId}, ${list}, ${updatedAt}) ON CONFLICT ("user") DO UPDATE SET list = EXCLUDED.list, updated_at = EXCLUDED.updated_at`;
    return { data: 'ok', updatedAt };
  },

  async deleteEventList(userId: string): Promise<RepositoryResult<string>> {
    const rows = await sql`DELETE FROM "db".eventlist WHERE "user" = ${userId} RETURNING list, updated_at`;
    const row = rows[0] as Tables<'eventlist'> | undefined;
    return { data: row?.list || '', updatedAt: getUpdatedAtFromRow(row) };
  },
};
