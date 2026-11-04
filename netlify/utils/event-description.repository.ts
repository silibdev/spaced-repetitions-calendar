import { sql } from './db-connector';
import { bulkCheckLastUpdate, BulkRequestBodyData, getUpdatedAtFromRow, RepositoryResult, RequestBody } from './utils';
import { Tables } from './database.type';

export const EventDescriptionRepository = {
  async getEventDescription(userId: string, eventId: string): Promise<RepositoryResult<string>> {
    const rows = await sql`SELECT description, updated_at FROM "db".eventdescription WHERE "user" = ${userId} AND id = ${eventId} LIMIT 1`;
    const row = rows[0] as Tables<'eventdescription'> | undefined;
    return { data: row?.description || '', updatedAt: getUpdatedAtFromRow(row) };
  },

  async postEventDescription(userId: string, eventId: string, { data: description, lastUpdatedAt }: RequestBody): Promise<RepositoryResult<string>> {
    if (lastUpdatedAt) {
      const rows = await sql`SELECT updated_at FROM "db".eventdescription WHERE "user" = ${userId} AND id = ${eventId}`;
      if (rows.length && getUpdatedAtFromRow(rows[0]) !== lastUpdatedAt) {
        return { data: 'OUT-OF-SYNC', statusCode: 500, updatedAt: getUpdatedAtFromRow(rows[0]) };
      }
    }
    const updatedAt = new Date().toISOString();
    await sql`INSERT INTO "db".eventdescription ("user", id, description, updated_at) VALUES (${userId}, ${eventId}, ${description}, ${updatedAt}) ON CONFLICT ("user", id) DO UPDATE SET description = EXCLUDED.description, updated_at = EXCLUDED.updated_at`;
    return { data: 'ok', updatedAt };
  },

  async deleteEventDescription(userId: string, eventId: string): Promise<RepositoryResult<string>> {
    const rows = await sql`DELETE FROM "db".eventdescription WHERE "user" = ${userId} AND id = ${eventId} RETURNING description, updated_at`;
    const row = rows[0] as Tables<'eventdescription'> | undefined;
    return { data: row?.description || '', updatedAt: getUpdatedAtFromRow(row) };
  },

  async bulkGetEventDescription(userId: string, ids: string[]): Promise<RepositoryResult<Record<string, RepositoryResult<string>>>> {
    const rows = ids.length ? await sql`SELECT id, description, updated_at FROM "db".eventdescription WHERE "user" = ${userId} AND id = ANY(${ids})` : [];
    const data = (rows as Tables<'eventdescription'>[]).reduce((acc, row) => {
      acc[`id=${row.id}`] = { data: row.description || '', updatedAt: getUpdatedAtFromRow(row) };
      return acc;
    }, {} as Record<string, RepositoryResult<string>>);
    return { data, updatedAt: new Date().toISOString() };
  },

  async bulkPostEventDescription(userId: string, bulkData: BulkRequestBodyData[]): Promise<RepositoryResult<Record<string, RepositoryResult<string>>>> {
    const ids = bulkData.map((item) => new URLSearchParams(item.queryParams).get('id') as string);
    const rows = ids.length ? await sql`SELECT id, updated_at FROM "db".eventdescription WHERE "user" = ${userId} AND id = ANY(${ids})` : [];
    const lastUpdates = Object.fromEntries(bulkData.map((item, index) => [ids[index], item.body?.lastUpdatedAt || ''])) as Record<string, string>;
    const check = await bulkCheckLastUpdate(Promise.resolve({ data: rows }), 'id', lastUpdates);
    if (check) return check;

    const updatedAt = new Date().toISOString();
    for (let index = 0; index < bulkData.length; index += 1) {
      const id = ids[index];
      const description = bulkData[index].body?.data;
      await sql`INSERT INTO "db".eventdescription ("user", id, description, updated_at) VALUES (${userId}, ${id}, ${description}, ${updatedAt}) ON CONFLICT ("user", id) DO UPDATE SET description = EXCLUDED.description, updated_at = EXCLUDED.updated_at`;
    }
    const data = Object.fromEntries(bulkData.map((item) => [item.queryParams, { data: '{"ok":"ok"}', updatedAt }])) as Record<string, RepositoryResult<string>>;
    return { data, updatedAt };
  },
};
