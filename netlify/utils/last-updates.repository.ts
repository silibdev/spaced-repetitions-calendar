import { sql } from './db-connector';
import { RepositoryResult } from './utils';

export const LastUpdatesRepository = {
  async getLastUpdates(userId: string): Promise<RepositoryResult<any>> {
    const [listRows, settingsRows, details, descriptions] = await Promise.all([
      sql`SELECT updated_at FROM "db".eventlist WHERE "user" = ${userId} LIMIT 1`,
      sql`SELECT updated_at FROM "db".settings WHERE "user" = ${userId} LIMIT 1`,
      sql`SELECT id, updated_at FROM "db".eventdetail WHERE "user" = ${userId}`,
      sql`SELECT id, updated_at FROM "db".eventdescription WHERE "user" = ${userId}`,
    ]);
    return {
      data: {
        eventList: listRows[0]?.updated_at,
        eventDescriptions: descriptions.map((row: any) => ({ id: row.id, updatedAt: row.updated_at })),
        eventDetails: details.map((row: any) => ({ id: row.id, updatedAt: row.updated_at })),
        settings: settingsRows[0]?.updated_at,
      },
      updatedAt: '',
    };
  },
};
