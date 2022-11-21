import { DB } from './db-connector';

export const SettingsRepository = {
  async getSettings(userId: string): Promise<string> {
    const result = await DB.execute("SELECT data FROM Settings WHERE user=:userId", {userId});
    const settingsRow: Record<string, any> = result.rows[0];
    const settings = (settingsRow && settingsRow['data']) || '';
    console.log('get settings', settings);
    return settings;
  },

  async postSettings(userId: string, settingsToSave: string): Promise<string> {
    const query = "INSERT INTO Settings (user, data) VALUES(:userId, :data) ON DUPLICATE KEY UPDATE data=:data";
    const params = {
      userId,
      data: settingsToSave
    }
    const result = await DB.execute(query, params);
    console.log('post settings', result);
    return 'ok';
  },

  async deleteSettings(userId: string) {
    const result = await DB.execute("DELETE FROM Settings WHERE userId=:userId", {userId});
    const settingsRow: Record<string, any> = result.rows[0];
    const settings = (settingsRow && settingsRow['data']) || '';
    console.log('delete settings', settings);
    return settings;
  }
}
