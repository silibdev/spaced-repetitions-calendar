import { DB } from './db-connector';
import {
  checkLastUpdate,
  getUpdatedAtFromRow,
  RepositoryResult,
  RequestBody,
} from './utils';
import { Tables } from './database.type';

export const EventListRepository = {
  async getEventList(userId: string): Promise<RepositoryResult<string>> {
    const rows = await DB.query<Tables<'eventlist'>>(
      'SELECT "user", list, updated_at FROM eventlist WHERE "user" = $1 LIMIT 1',
      [userId],
    );
    const eventListRow = rows[0] || null;
    const list: string = eventListRow?.list || '';
    const updatedAt = getUpdatedAtFromRow(eventListRow);
    console.log('get eventList', userId);
    return { data: list, updatedAt };
  },

  async postEventList(
    userId: string,
    { data: list, lastUpdatedAt }: RequestBody,
  ): Promise<RepositoryResult<string>> {
    const checkError = await checkLastUpdate(
      DB.query<{ updated_at: string | Date | null }>(
        'SELECT updated_at FROM eventlist WHERE "user" = $1',
        [userId],
      ),
      lastUpdatedAt,
    );
    if (checkError) return checkError;
    const updatedAt = new Date().toISOString();
    await DB.query(
      `INSERT INTO eventlist ("user", list, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT ("user")
       DO UPDATE SET list = EXCLUDED.list, updated_at = EXCLUDED.updated_at`,
      [userId, list, updatedAt],
    );
    console.log('post list 1');
    return { data: 'ok', updatedAt };
  },

  async deleteEventList(userId: string): Promise<RepositoryResult<string>> {
    const rows = await DB.query<Tables<'eventlist'>>(
      'DELETE FROM eventlist WHERE "user" = $1 RETURNING "user", list, updated_at',
      [userId],
    );
    const listRow = rows[0] || null;
    const list: string = listRow?.list || '';
    const updatedAt = getUpdatedAtFromRow(listRow);
    console.log('delete list', list);
    return { data: list, updatedAt };
  },
};
