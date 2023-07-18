import { RepositoryResult, RequestBody } from './utils';

export const PhotosRepository = {
  async getPhotos(userId: string, eventId: string): Promise<RepositoryResult<string>> {
    console.log('getPhotos', {userId, eventId});
    return {data: 'ok', updatedAt: new Date().toISOString()};
    // const result = await DB.execute("SELECT description, updated_at FROM EventDescription WHERE user=:userId AND id=:id", {userId, id: eventId});
    // const settingsRow: Record<string, any> = result.rows[0];
    // const data: string = (settingsRow && settingsRow['description']) || '';
    // const updatedAt = getUpdatedAtFromRow(settingsRow);
    // console.log('get event description', eventId);
    // return {data, updatedAt};
  },

  async postPhotos(userId: string, eventId: string, body: RequestBody): Promise<RepositoryResult<string>> {
    console.log('postPhotos', {userId, eventId, body});
    return {data: 'ok', updatedAt: new Date().toISOString()};
    // const checkError = await checkLastUpdate(DB.execute("SELECT updated_at FROM EventDescription WHERE user=:userId AND id=:id", {userId, id: eventId}), lastUpdatedAt);
    // if (checkError) return checkError;
    // const query = "INSERT INTO EventDescription (user, id, description, updated_at) VALUES(:userId, :id, :description, :updatedAt) ON DUPLICATE KEY UPDATE description=:description, updated_at=:updatedAt";
    // const updatedAt = new Date().toISOString();
    // const params = {
    //   userId,
    //   description,
    //   id: eventId,
    //   updatedAt
    // }
    // const result = await DB.execute(query, params);
    // console.log('post eventDescription', result.insertId);
    // return {data: 'ok', updatedAt};
  }
}
