import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';
import fetch, { Headers, Request, Response } from 'node-fetch';
import { Database } from './database.type';

// @ts-ignore
globalThis.fetch = fetch
// @ts-ignore
globalThis.Headers = Headers
// @ts-ignore
globalThis.Request = Request
// @ts-ignore
globalThis.Response = Response

const url = process.env['DATABASE_URL']!;
const key = process.env['DATABASE_KEY']!;
const config: SupabaseClientOptions<'db'> = {
  db: {schema: 'db'}
};

export const DB = createClient<Database>(url, key, config);
