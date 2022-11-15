import {connect} from '@planetscale/database';
import fetch, {Headers, Request, Response} from 'node-fetch';
// @ts-ignore
globalThis.fetch = fetch
// @ts-ignore
globalThis.Headers = Headers
// @ts-ignore
globalThis.Request = Request
// @ts-ignore
globalThis.Response = Response

const config = {
  host: process.env['DATABASE_HOST'],
  username: process.env['DATABASE_USERNAME'],
  password: process.env['DATABASE_PASSWORD']
}

const conn = connect(config);

export namespace Repository {
  export async function getSettings(): Promise<string> {
    const result = await conn.execute("SELECT data FROM Settings");
    const settingsRow: Record<string, any> = result.rows[0];
    const settings = (settingsRow && settingsRow['data']) || '';
    console.log('get settings', settings);
    return settings;
  }

  export async function postSettings(settingsToSave: string): Promise<string> {
    const query = "INSERT INTO Settings (user, data) VALUES(:user, :data) ON DUPLICATE KEY UPDATE data=:data";
    const params = {
      user: 'test',
      data: settingsToSave
    }
    const result = await conn.execute(query, params);
    console.log('post settings', result);
    return 'ok';
  }
}
