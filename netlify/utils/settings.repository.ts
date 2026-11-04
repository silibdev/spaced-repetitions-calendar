import { DB } from './db-connector';
import {
  checkLastUpdate,
  getUpdatedAtFromRow,
  RepositoryResult,
  RequestBody,
} from './utils';
import { Tables } from './database.type';

export const SettingsRepository = {
  async getSettings(userId: string): Promise<RepositoryResult<string>> {
    const rows = await DB.query<Tables<'settings'>>(
      'SELECT "user", data, updated_at FROM settings WHERE "user" = $1 LIMIT 1',
      [userId],
    );
    const settingsRow = rows[0] || null;
    const settings: string = settingsRow?.data || '';
    const updatedAt = getUpdatedAtFromRow(settingsRow);
    console.log('get settings', userId);
    return { data: settings, updatedAt };
  },

  async postSettings(
    userId: string,
    { data: settingsToSave, lastUpdatedAt }: RequestBody,
  ): Promise<RepositoryResult<string>> {
    const checkError = await checkLastUpdate(
      DB.query<{ updated_at: string | Date | null }>(
        'SELECT updated_at FROM settings WHERE "user" = $1',
        [userId],
      ),
      lastUpdatedAt,
    );
    if (checkError) return checkError;
    const updatedAt = new Date().toISOString();
    await DB.query(
      `INSERT INTO settings ("user", data, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT ("user")
       DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
      [userId, settingsToSave, updatedAt],
    );
    console.log('post settings 1');
    return { data: '{"ok":"ok"}', updatedAt };
  },

  async deleteSettings(userId: string): Promise<RepositoryResult<string>> {
    const rows = await DB.query<Tables<'settings'>>(
      'DELETE FROM settings WHERE "user" = $1 RETURNING "user", data, updated_at',
      [userId],
    );
    const settingsRow = rows[0] || null;
    const settings: string = settingsRow?.data || '';
    const updatedAt = getUpdatedAtFromRow(settingsRow);
    console.log('delete settings', settings);
    return { data: settings, updatedAt };
  },
};
