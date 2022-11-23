import { DB } from './db-connector';
import { checkLastUpdate, getUpdatedAtFromRow, RepositoryResult, RequestBody } from './utils';

export const SettingsRepository = {
  async getSettings(userId: string): Promise<RepositoryResult<string>> {
    const result = await DB.execute("SELECT data, updated_at FROM Settings WHERE user=:userId", {userId});
    const settingsRow: Record<string, any> = result.rows[0];
    const settings: string = (settingsRow && settingsRow['data']) || '';
    const updatedAt = getUpdatedAtFromRow(settingsRow);
    console.log('get settings', settings);
    return {data: settings, updatedAt};
  },

  async postSettings(userId: string, {data: settingsToSave, lastUpdatedAt}: RequestBody): Promise<RepositoryResult<string>> {
    const checkError = await checkLastUpdate(DB.execute("SELECT updated_at FROM Settings WHERE user=:userId", {userId}), lastUpdatedAt);
    if (checkError) return checkError;
    const query = "INSERT INTO Settings (user, data, updated_at) VALUES(:userId, :data, :updatedAt) ON DUPLICATE KEY UPDATE data=:data, updated_at=:updatedAt";
    const updatedAt = new Date().toISOString();
    const params = {
      userId,
      data: settingsToSave,
      updatedAt
    }
    const result = await DB.execute(query, params);
    console.log('post settings', result);
    return {data: '{"ok":"ok"}', updatedAt};
  },

  async deleteSettings(userId: string): Promise<RepositoryResult<string>> {
    const result = await DB.execute("DELETE FROM Settings WHERE userId=:userId", {userId});
    const settingsRow: Record<string, any> = result.rows[0];
    const settings: string = (settingsRow && settingsRow['data']) || '';
    const updatedAt = getUpdatedAtFromRow(settingsRow);
    console.log('delete settings', settings);
    return {data: settings, updatedAt};
  }
}
