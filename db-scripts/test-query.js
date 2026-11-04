import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('Set DATABASE_URL in the environment first');
const sql = neon(connectionString);

const result = await sql.query('SELECT current_schema() AS current_schema, current_database() AS current_database');
console.log(result);
