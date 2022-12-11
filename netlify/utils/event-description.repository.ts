import { DB, db_formatter } from './db-connector';
import { bulkCheckLastUpdate, checkLastUpdate, getUpdatedAtFromRow, RepositoryResult, RequestBody } from './utils';

export const EventDescriptionRepository = {
  async getEventDescription(userId: string, eventId: string): Promise<RepositoryResult<string>> {
    const result = await DB.execute("SELECT description, updated_at FROM EventDescription WHERE user=:userId AND id=:id", {userId, id: eventId});
    const settingsRow: Record<string, any> = result.rows[0];
    const data: string = (settingsRow && settingsRow['description']) || '';
    const updatedAt = getUpdatedAtFromRow(settingsRow);
    console.log('get event description', eventId);
    return {data, updatedAt};
  },

  async postEventDescription(userId: string, eventId: string, {data: description, lastUpdatedAt}: RequestBody): Promise<RepositoryResult<string>> {
    const checkError = await checkLastUpdate(DB.execute("SELECT updated_at FROM EventDescription WHERE user=:userId AND id=:id", {userId, id: eventId}), lastUpdatedAt);
    if (checkError) return checkError;
    const query = "INSERT INTO EventDescription (user, id, description, updated_at) VALUES(:userId, :id, :description, :updatedAt) ON DUPLICATE KEY UPDATE description=:description, updated_at=:updatedAt";
    const updatedAt = new Date().toISOString();
    const params = {
      userId,
      description,
      id: eventId,
      updatedAt
    }
    const result = await DB.execute(query, params);
    console.log('post eventDescription', result.insertId);
    return {data: 'ok', updatedAt};
  },

  async deleteEventDescription(userId: string, eventId: string): Promise<RepositoryResult<string>> {
    const result = await DB.execute("DELETE FROM EventDescription WHERE user=:userId AND id=:id", {userId, id: eventId});
    const eventDescriptionRow: Record<string, any> = result.rows[0];
    const data: string = (eventDescriptionRow && eventDescriptionRow['description']) || '';
    const updatedAt = getUpdatedAtFromRow(eventDescriptionRow)
    console.log('delete eventDescription', data);
    return {data, updatedAt};
  },

  async bulkGetEventDescription(userId: string, ids: string[]): Promise<RepositoryResult<Record<string, RepositoryResult<string>>>> {
    const result = await DB.execute("SELECT id, description, updated_at FROM EventDescription WHERE user=:userId AND id IN (:ids)", {userId, ids});
    const returnData = result.rows.reduce<Record<string, RepositoryResult<string>>>( (acc, row: any) => {
      const id: string = row['id'];
      acc[id] = {
        data: row['description'],
        updatedAt: getUpdatedAtFromRow(row)
      };
      return acc;
    }, {});
    return {data: returnData, updatedAt: new Date().toISOString()};
  },

  async bulkPostEventDescription(userId: string, bulkData: { id: string, data: RequestBody }[]): Promise<RepositoryResult<Record<string, RepositoryResult<string>>>> {
    const ids = bulkData.map(bd => bd.id);
    const bulkLastUpdates = bulkData.map(bd => bd.data.lastUpdatedAt!);

    const checkErrors = await bulkCheckLastUpdate(DB.execute("SELECT id, updated_at FROM EventDescription WHERE user=:userId AND id IN (:ids)", {userId, ids}), 'id', bulkLastUpdates);
    if (checkErrors) return checkErrors;

    // CREATE QUERY
    const updatedAt = new Date().toISOString();
    // CREATE VALUES FOR QUERY
    const values = bulkData
      .map( bd => db_formatter('(?,?,?,?)', [userId, bd.id, bd.data.data, updatedAt]))
      .join(',');
    const query = `INSERT INTO EventDescription (user, id, description, updated_at) VALUES ${values} ON DUPLICATE KEY UPDATE description=VALUES(description), updated_at=VALUES(updated_at)`;

    const result = await DB.execute(query);
    console.log('post eventDescription', result.insertId);

    const returnData = bulkData.reduce( (acc, bd) => {
      acc[bd.id] = {data: '{"ok":"ok"}', updatedAt};
      return acc;
    }, {} as Record<string, RepositoryResult<string>>);
    return {data: returnData, updatedAt};
  }
}
