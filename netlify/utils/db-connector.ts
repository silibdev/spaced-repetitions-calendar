import { connect } from '@planetscale/database';
import fetch, { Headers, Request, Response } from 'node-fetch';

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

export const DB = connect(config);
