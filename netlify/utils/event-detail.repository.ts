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

export const EventDetailRepository = {
  async getEventDetail(
    userId: string,
    eventId: string,
  ): Promise<RepositoryResult<string>> {
    const rows = await DB.query<Tables<'eventdetail'>>(
      'SELECT "user", id, detail, updated_at FROM eventdetail WHERE "user" = $1 AND id = $2 LIMIT 1',
      [userId, eventId],
    );
    const row = rows[0] || null;
    const data: string = row?.detail || '';
    const updatedAt = getUpdatedAtFromRow(row);
    console.log('get event detail', eventId);
    return { data, updatedAt };
  },

  async postEventDetail(
    userId: string,
    eventId: string,
    { data: detail, lastUpdatedAt }: RequestBody,
  ): Promise<RepositoryResult<string>> {
    const checkError = await checkLastUpdate(
      DB.query<{ updated_at: string | Date | null }>(
        'SELECT updated_at FROM eventdetail WHERE "user" = $1 AND id = $2',
        [userId, eventId],
      ),
      lastUpdatedAt,
    );
    if (checkError) return checkError;
    const updatedAt = new Date().toISOString();
    await DB.query(
      `INSERT INTO eventdetail ("user", id, detail, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("user", id)
       DO UPDATE SET detail = EXCLUDED.detail, updated_at = EXCLUDED.updated_at`,
      [userId, eventId, detail, updatedAt],
    );
    console.log('post eventDetail 1');
    return { data: '{"ok":"ok"}', updatedAt };
  },

  async deleteEventDetail(
    userId: string,
    eventId: string,
  ): Promise<RepositoryResult<string>> {
    const rows = await DB.query<Tables<'eventdetail'>>(
      'DELETE FROM eventdetail WHERE "user" = $1 AND id = $2 RETURNING "user", id, detail, updated_at',
      [userId, eventId],
    );
    const eventDetailRow = rows[0] || null;
    const eventDetail: string = eventDetailRow?.detail || '';
    const updatedAt = getUpdatedAtFromRow(eventDetailRow);
    console.log('delete eventDetail', eventDetail);
    return { data: eventDetail, updatedAt };
  },

  async bulkGetEventDetail(
    userId: string,
    ids: string[],
  ): Promise<RepositoryResult<Record<string, RepositoryResult<string>>>> {
    if (!ids || ids.length === 0) {
      return { data: {}, updatedAt: new Date().toISOString() };
    }
    const rows = await DB.query<Tables<'eventdetail'>>(
      'SELECT id, detail, updated_at FROM eventdetail WHERE "user" = $1 AND id = ANY($2)',
      [userId, ids],
    );
    const returnData = rows.reduce(
      (acc, row) => {
        acc['id=' + row.id] = {
          data: row.detail || '',
          updatedAt: getUpdatedAtFromRow(row),
        };
        return acc;
      },
      {} as Record<string, RepositoryResult<string>>,
    );
    return { data: returnData, updatedAt: new Date().toISOString() };
  },

  async bulkPostEventDetail(
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
        'SELECT id, updated_at FROM eventdetail WHERE "user" = $1 AND id = ANY($2)',
        [userId, ids],
      ),
      'id',
      bulkLastUpdates,
    );
    if (checkErrors) return checkErrors;

    const updatedAt = new Date().toISOString();

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const detail = bulkData[i].body?.data;
      await DB.query(
        `INSERT INTO eventdetail ("user", id, detail, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("user", id)
         DO UPDATE SET detail = EXCLUDED.detail, updated_at = EXCLUDED.updated_at`,
        [userId, id, detail, updatedAt],
      );
    }
    console.log('post eventDetail bulk', bulkData.length);

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
