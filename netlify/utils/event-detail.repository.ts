import { DB, db_formatter } from './db-connector';
import { bulkCheckLastUpdate, checkLastUpdate, getUpdatedAtFromRow, RepositoryResult, RequestBody } from './utils';

export const EventDetailRepository = {
  async getEventDetail(userId: string, eventId: string): Promise<RepositoryResult<string>> {
    const result = await DB.execute("SELECT detail, updated_at FROM EventDetail WHERE user=:userId AND id=:id", {userId, id: eventId});
    const row: Record<string, any> = result.rows[0];
    console.log(row);
    const data: string = (row && row['detail']) || '';
    const updatedAt = getUpdatedAtFromRow(row);
    console.log('get event detail', eventId);
    return {data, updatedAt};
  },

  async postEventDetail(userId: string, eventId: string, {data: detail, lastUpdatedAt}: RequestBody): Promise<RepositoryResult<string>> {
    const checkError = await checkLastUpdate(DB.execute("SELECT updated_at FROM EventDetail WHERE user=:userId AND id=:id", {userId, id: eventId}), lastUpdatedAt);
    if (checkError) return checkError;
    const query = "INSERT INTO EventDetail (user, id, detail, updated_at) VALUES(:userId, :id, :detail, :updatedAt) ON DUPLICATE KEY UPDATE detail=:detail, updated_at=:updatedAt";
    const updatedAt = new Date().toISOString();
    const params = {
      userId,
      detail,
      id: eventId,
      updatedAt
    }
    const result = await DB.execute(query, params);
    console.log('post eventDetail', result.insertId);
    return {data: '{"ok":"ok"}', updatedAt};
  },

  async deleteEventDetail(userId: string, eventId: string): Promise<RepositoryResult<string>> {
    const result = await DB.execute("DELETE FROM EventDetail WHERE user=:userId AND id=:id", {userId, id: eventId});
    const eventDetailRow: Record<string, any> = result.rows[0];
    const eventDetail: string = (eventDetailRow && eventDetailRow['detail']) || '';
    const updatedAt = getUpdatedAtFromRow(eventDetailRow);
    console.log('delete eventDetail', eventDetail);
    return {data: eventDetail, updatedAt};
  },

  async bulkGetEventDetail(userId: string, ids: string[]): Promise<RepositoryResult<Record<string, RepositoryResult<string>>>> {
    const result = await DB.execute("SELECT id, detail, updated_at FROM EventDetail WHERE user=:userId AND id IN (:ids)", {userId, ids});
    const returnData = result.rows.reduce<Record<string, RepositoryResult<string>>>( (acc, row: any) => {
      acc[row['id']] = {
        data: row['detail'],
        updatedAt: getUpdatedAtFromRow(row)
      };
      return acc;
    }, {});
    return {data: returnData, updatedAt: new Date().toISOString()};
  },

  async bulkPostEventDetail(userId: string, bulkData: { id: string, data: RequestBody }[]): Promise<RepositoryResult<Record<string, RepositoryResult<string>>>> {
    const ids = bulkData.map(bd => bd.id);
    const bulkLastUpdates = bulkData.map(bd => bd.data.lastUpdatedAt!);

    const checkErrors = await bulkCheckLastUpdate(DB.execute("SELECT id, updated_at FROM EventDetail WHERE user=:userId AND id IN (:ids)", {userId, ids}), 'id', bulkLastUpdates);
    if (checkErrors) return checkErrors;

    // CREATE QUERY
    const updatedAt = new Date().toISOString();
    // CREATE VALUES FOR QUERY
    const values = bulkData
      .map( bd => db_formatter('(?,?,?,?)', [userId, bd.id, bd.data.data, updatedAt]))
      .join(',');
    const query = `INSERT INTO EventDetail (user, id, detail, updated_at) VALUES ${values} ON DUPLICATE KEY UPDATE detail=VALUES(detail), updated_at=VALUES(updated_at)`;

    const result = await DB.execute(query);
    console.log('post eventDetail', result.insertId);

    const returnData = bulkData.reduce( (acc, bd) => {
      acc[bd.id] = {data: '{"ok":"ok"}', updatedAt};
      return acc;
    }, {} as Record<string, RepositoryResult<string>>);
    return {data: returnData, updatedAt};
  }
}
