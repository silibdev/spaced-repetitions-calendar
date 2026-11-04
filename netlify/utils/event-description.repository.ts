import { DB } from './db-connector';
import {
  bulkCheckLastUpdate,
  BulkRequestBodyData,
  checkLastUpdate,
  getUpdatedAtFromRow,
  RepositoryResult,
  RequestBody,
} from './utils';
import { Tables } from './database.type';

export const EventDescriptionRepository = {
  async getEventDescription(
    userId: string,
    eventId: string,
  ): Promise<RepositoryResult<string>> {
    const rows = await DB.query<Tables<'eventdescription'>>(
      'SELECT "user", id, description, updated_at FROM eventdescription WHERE "user" = $1 AND id = $2 LIMIT 1',
      [userId, eventId],
    );
    const settingsRow = rows[0] || null;
    const data: string = settingsRow?.description || '';
    const updatedAt = getUpdatedAtFromRow(settingsRow);
    console.log('get event description', eventId);
    return { data, updatedAt };
  },

  async postEventDescription(
    userId: string,
    eventId: string,
    { data: description, lastUpdatedAt }: RequestBody,
  ): Promise<RepositoryResult<string>> {
    const checkError = await checkLastUpdate(
      DB.query<{ updated_at: string | Date | null }>(
        'SELECT updated_at FROM eventdescription WHERE "user" = $1 AND id = $2',
        [userId, eventId],
      ),
      lastUpdatedAt,
    );
    if (checkError) return checkError;
    const updatedAt = new Date().toISOString();
    await DB.query(
      `INSERT INTO eventdescription ("user", id, description, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("user", id)
       DO UPDATE SET description = EXCLUDED.description, updated_at = EXCLUDED.updated_at`,
      [userId, eventId, description, updatedAt],
    );
    console.log('post eventDescription 1');
    return { data: 'ok', updatedAt };
  },

  async deleteEventDescription(
    userId: string,
    eventId: string,
  ): Promise<RepositoryResult<string>> {
    const rows = await DB.query<Tables<'eventdescription'>>(
      'DELETE FROM eventdescription WHERE "user" = $1 AND id = $2 RETURNING "user", id, description, updated_at',
      [userId, eventId],
    );
    const eventDescriptionRow = rows[0] || null;
    const data: string = eventDescriptionRow?.description || '';
    const updatedAt = getUpdatedAtFromRow(eventDescriptionRow);
    console.log('delete eventDescription', data);
    return { data, updatedAt };
  },

  async bulkGetEventDescription(
    userId: string,
    ids: string[],
  ): Promise<RepositoryResult<Record<string, RepositoryResult<string>>>> {
    if (!ids || ids.length === 0) {
      return { data: {}, updatedAt: new Date().toISOString() };
    }
    const rows = await DB.query<Tables<'eventdescription'>>(
      'SELECT id, description, updated_at FROM eventdescription WHERE "user" = $1 AND id = ANY($2)',
      [userId, ids],
    );
    const returnData = rows.reduce(
      (acc, row) => {
        const id: string = 'id=' + row.id;
        acc[id] = {
          data: row.description || '',
          updatedAt: getUpdatedAtFromRow(row),
        };
        return acc;
      },
      {} as Record<string, RepositoryResult<string>>,
    );
    return { data: returnData, updatedAt: new Date().toISOString() };
  },

  async bulkPostEventDescription(
    userId: string,
    bulkData: BulkRequestBodyData[],
  ): Promise<RepositoryResult<Record<string, RepositoryResult<string>>>> {
    if (!bulkData || bulkData.length === 0) {
      return { data: {}, updatedAt: new Date().toISOString() };
    }
    const ids = bulkData.map(
      (bd) => new URLSearchParams(bd.queryParams).get('id') as string,
    );
    const bulkLastUpdates = bulkData.reduce(
      (acc, bd) => {
        acc[bd.queryParams] = bd.body?.lastUpdatedAt!;
        return acc;
      },
      {} as Record<string, string>,
    );

    const checkErrors = await bulkCheckLastUpdate(
      DB.query<{ id: string; updated_at: string | Date | null }>(
        'SELECT id, updated_at FROM eventdescription WHERE "user" = $1 AND id = ANY($2)',
        [userId, ids],
      ),
      'id',
      bulkLastUpdates,
    );
    if (checkErrors) return checkErrors;

    const updatedAt = new Date().toISOString();

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const description = bulkData[i].body?.data;
      await DB.query(
        `INSERT INTO eventdescription ("user", id, description, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("user", id)
         DO UPDATE SET description = EXCLUDED.description, updated_at = EXCLUDED.updated_at`,
        [userId, id, description, updatedAt],
      );
    }
    console.log('post eventDescription bulk', bulkData.length);

    const returnData = bulkData.reduce(
      (acc, bd) => {
        acc[bd.queryParams] = { data: '{"ok":"ok"}', updatedAt };
        return acc;
      },
      {} as Record<string, RepositoryResult<string>>,
    );
    return { data: returnData, updatedAt };
  },
};
