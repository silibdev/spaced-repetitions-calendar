import { sql } from './db-connector';
import { getUpdatedAtFromRow, RepositoryResult, RequestBody } from './utils';
import { Tables } from './database.type';

export const SettingsRepository = {
  async getSettings(userId: string): Promise<RepositoryResult<string>> {
    const rows = await sql`SELECT data, updated_at FROM "db".settings WHERE "user" = ${userId} LIMIT 1`;
    const row = rows[0] as Tables<'settings'> | undefined;
    return { data: row?.data || '', updatedAt: getUpdatedAtFromRow(row) };
  },

  async postSettings(userId: string, { data: settingsToSave, lastUpdatedAt }: RequestBody): Promise<RepositoryResult<string>> {
    if (lastUpdatedAt) {
      const rows = await sql`SELECT updated_at FROM "db".settings WHERE "user" = ${userId}`;
      if (rows.length && getUpdatedAtFromRow(rows[0]) !== lastUpdatedAt) {
        return { data: 'OUT-OF-SYNC', statusCode: 500, updatedAt: getUpdatedAtFromRow(rows[0]) };
      }
    }
    const updatedAt = new Date().toISOString();
    await sql`INSERT INTO "db".settings ("user", data, updated_at) VALUES (${userId}, ${settingsToSave}, ${updatedAt}) ON CONFLICT ("user") DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`;
    return { data: '{"ok":"ok"}', updatedAt };
  },

  async deleteSettings(userId: string): Promise<RepositoryResult<string>> {
    const rows = await sql`DELETE FROM "db".settings WHERE "user" = ${userId} RETURNING data, updated_at`;
    const row = rows[0] as Tables<'settings'> | undefined;
    return { data: row?.data || '', updatedAt: getUpdatedAtFromRow(row) };
  },
};
