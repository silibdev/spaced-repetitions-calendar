import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let sqlClient: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> {
  if (!sqlClient) {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not defined');
    }
    sqlClient = neon(connectionString);
  }
  return sqlClient;
}

/**
 * Execute a query against Neon in the 'db' schema.
 * Using sql.transaction to execute 'SET search_path TO db;' followed by the query,
 * or running the parameterized query directly with search_path.
 */
export async function query<T = any>(
  text: string,
  params: any[] = [],
): Promise<T[]> {
  const sql = getDb();
  // Neon sql.transaction executes statements sequentially in a single HTTP request
  const results = await (sql as any).transaction([
    (sql as any)`SET search_path TO db`,
    (sql as any)(text, params),
  ]);
  // results[1] is the query result rows
  return (results[1] || []) as T[];
}

export const DB = {
  query,
};
