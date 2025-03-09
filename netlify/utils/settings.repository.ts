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
    const result = await DB.from('settings')
      .select()
      .eq('user', userId)
      .maybeSingle();
    const settingsRow: Tables<'settings'> | null = result.data;
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
      DB.from('settings').select('updated_at').eq('user', userId),
      lastUpdatedAt,
    );
    if (checkError) return checkError;
    const updatedAt = new Date().toISOString();
    const values: Tables<'settings'> = {
      user: userId,
      data: settingsToSave,
      updated_at: updatedAt,
    };
    const result = await DB.from('settings').upsert(values);
    console.log('post settings', result.count);
    return { data: '{"ok":"ok"}', updatedAt };
  },

  async deleteSettings(userId: string): Promise<RepositoryResult<string>> {
    const result = await DB.from('settings')
      .delete()
      .eq('user', userId)
      .select()
      .maybeSingle();
    const settingsRow: Tables<'settings'> | null = result.data;
    const settings: string = settingsRow?.data || '';
    const updatedAt = getUpdatedAtFromRow(settingsRow);
    console.log('delete settings', settings);
    return { data: settings, updatedAt };
  },
};
