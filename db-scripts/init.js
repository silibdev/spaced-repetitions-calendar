import 'dotenv/config'
import fetch, {Headers, Request, Response} from 'node-fetch';

globalThis.fetch = fetch
globalThis.Headers = Headers
globalThis.Request = Request
globalThis.Response = Response

import {connect} from '@planetscale/database';
import {readFileSync} from "fs";

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
}

const conn = connect(config);
const createDb = readFileSync('./create-db.sql');
const toExecute = createDb.toString().split('\n\n');
Promise.all(
  toExecute.map(
    (query, i) => conn.execute(query)
      .then(results => console.log(i, results))
  )).then(() => console.log('done'));
