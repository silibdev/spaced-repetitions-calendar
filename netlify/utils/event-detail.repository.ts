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
    const result = await DB.from('eventdetail')
      .select()
      .eq('user', userId)
      .eq('id', eventId)
      .maybeSingle();
    const row: Tables<'eventdetail'> | null = result.data;
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
      DB.from('eventdetail').select().eq('user', userId).eq('id', eventId),
      lastUpdatedAt,
    );
    if (checkError) return checkError;
    const updatedAt = new Date().toISOString();
    const values: Tables<'eventdetail'> = {
      user: userId,
      detail,
      id: eventId,
      updated_at: updatedAt,
    };
    const result = await DB.from('eventdetail').upsert(values);
    console.log('post eventDetail', result.count);
    return { data: '{"ok":"ok"}', updatedAt };
  },

  async deleteEventDetail(
    userId: string,
    eventId: string,
  ): Promise<RepositoryResult<string>> {
    const result = await DB.from('eventdetail')
      .delete()
      .eq('user', userId)
      .eq('id', eventId)
      .select()
      .maybeSingle();
    const eventDetailRow: Tables<'eventdetail'> | null = result.data;
    const eventDetail: string = eventDetailRow?.detail || '';
    const updatedAt = getUpdatedAtFromRow(eventDetailRow);
    console.log('delete eventDetail', eventDetail);
    return { data: eventDetail, updatedAt };
  },

  async bulkGetEventDetail(
    userId: string,
    ids: string[],
  ): Promise<RepositoryResult<Record<string, RepositoryResult<string>>>> {
    const result = await DB.from('eventdetail')
      .select()
      .eq('user', userId)
      .in('id', ids);
    const returnData = (result.data || []).reduce(
      (acc, row: any) => {
        acc['id=' + row['id']] = {
          data: row['detail'],
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
      DB.from('eventdetail')
        .select('id, updated_at')
        .eq('user', userId)
        .in('id', ids),
      'id',
      bulkLastUpdates,
    );
    if (checkErrors) return checkErrors;

    // CREATE QUERY
    const updatedAt = new Date().toISOString();
    // CREATE VALUES FOR QUERY
    const values: Tables<'eventdetail'>[] = bulkData.map((bd, index) => ({
      user: userId,
      id: ids[index],
      detail: bd.body?.data,
      updated_at: updatedAt,
    }));

    const result = await DB.from('eventdetail').upsert(values);
    console.log('post eventDetail', result.count);

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
