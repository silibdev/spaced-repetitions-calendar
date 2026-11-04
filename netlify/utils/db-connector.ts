import { neon } from '@neondatabase/serverless';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL must be configured for Neon');
}

/** Neon SQL client. All application tables are explicitly qualified with schema db. */
export const sql = neon(connectionString);
