import { DB } from './db-connector';
import {
  bulkCheckLastUpdate,
  BulkRequestBodyData,
  checkLastUpdate,
  getUpdatedAtFromRow,
  RepositoryResult,
  RequestBody
} from './utils';
import { Tables } from './database.type';

export const EventDescriptionRepository = {
  async getEventDescription(userId: string, eventId: string): Promise<RepositoryResult<string>> {
    const result = await DB
      .from('eventdescription')
      .select()
      .eq('user', userId)
      .eq('id', eventId)
      .maybeSingle();
    const settingsRow: Tables<'eventdescription'> | null = result.data;
    const data: string = settingsRow?.description || '';
    const updatedAt = getUpdatedAtFromRow(settingsRow);
    console.log('get event description', eventId);
    return {data, updatedAt};
  },

  async postEventDescription(userId: string, eventId: string, {
    data: description,
    lastUpdatedAt
  }: RequestBody): Promise<RepositoryResult<string>> {
    const checkError = await checkLastUpdate(
      DB.from('eventdescription')
        .select('updated_at').eq('user', userId)
        .eq('id', eventId),
      lastUpdatedAt);
    if (checkError) return checkError;
    const updatedAt = new Date().toISOString();
    const values: Tables<'eventdescription'> = {
      user: userId,
      description,
      id: eventId,
      updated_at: updatedAt
    }
    const result = await DB.from('eventdescription').upsert(values);
    console.log('post eventDescription', result.count);
    return {data: 'ok', updatedAt};
  },

  async deleteEventDescription(userId: string, eventId: string): Promise<RepositoryResult<string>> {
    const result = await DB.from('eventdescription')
      .delete()
      .eq('user', userId)
      .eq('id', eventId)
      .select().maybeSingle();
    const eventDescriptionRow: Tables<'eventdescription'> | null = result.data;
    const data: string = eventDescriptionRow?.description || '';
    const updatedAt = getUpdatedAtFromRow(eventDescriptionRow)
    console.log('delete eventDescription', data);
    return {data, updatedAt};
  },

  async bulkGetEventDescription(userId: string, ids: string[]): Promise<RepositoryResult<Record<string, RepositoryResult<string>>>> {
    const result = await DB.from('eventdescription')
      .select('id, description, updated_at')
      .eq('user', userId)
      .in('id', ids);
    const returnData = (result.data || []).reduce((acc, row) => {
      const id: string = 'id=' + row.id;
      acc[id] = {
        data: row.description || '',
        updatedAt: getUpdatedAtFromRow(row)
      };
      return acc;
    }, {} as Record<string, RepositoryResult<string>>);
    return {data: returnData, updatedAt: new Date().toISOString()};
  },

  async bulkPostEventDescription(userId: string, bulkData: BulkRequestBodyData[]): Promise<RepositoryResult<Record<string, RepositoryResult<string>>>> {
    const ids = bulkData.map(bd => new URLSearchParams(bd.queryParams).get('id') as string);
    const bulkLastUpdates = bulkData.reduce((acc, bd) => {
      acc[bd.queryParams] = bd.body?.lastUpdatedAt!;
      return acc;
    }, {} as Record<string, string>);

    const checkErrors = await bulkCheckLastUpdate(
      DB.from('eventdescription')
        .select('id, updated_at')
        .eq('user', userId)
        .in('id', ids),
      'id',
      bulkLastUpdates);
    if (checkErrors) return checkErrors;

    // CREATE QUERY
    const updatedAt = new Date().toISOString();
    // CREATE VALUES FOR QUERY
    const values: Tables<'eventdescription'>[] = bulkData
      .map((bd, index) => ({
        user: userId,
        id: ids[index],
        description: bd.body?.data,
        updated_at: updatedAt
      }));
    const result = await DB.from('eventdescription').upsert(values);
    console.log('post eventDescription', result.count);

    const returnData = bulkData.reduce((acc, bd) => {
      acc[bd.queryParams] = {data: '{"ok":"ok"}', updatedAt};
      return acc;
    }, {} as Record<string, RepositoryResult<string>>);
    return {data: returnData, updatedAt};
  }
}
