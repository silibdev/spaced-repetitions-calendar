import { RepositoryResult, RequestBody } from './utils';
import { DB, db_formatter } from './db-connector';

export const PhotosRepository = {
  async getPhotos(userId: string, eventId: string): Promise<RepositoryResult<any>> {
    console.log('getPhotos', {userId, eventId});
    const result = await DB.execute("SELECT id, name, photo FROM Photo WHERE user=:userId AND eventId=:eventId", {userId, eventId});
    const photos: any[] = result.rows;
    photos.forEach(p => {
      const photoString = Buffer.from(p.photo, 'binary').toString('base64');
      p.photo = photoString;
      p.thumbnail = photoString;
    });
    console.log('get photos', userId, eventId, 'photos', photos.length);
    return {data: photos, updatedAt: ''};
  },

  async postPhotos(userId: string, eventId: string, {data: {newPhotos}}: RequestBody<any>): Promise<RepositoryResult<string>> {
    console.log('postPhotos', {userId, eventId, newPhotos});
    // const checkError = await checkLastUpdate(DB.execute("SELECT updated_at FROM EventDescription WHERE user=:userId AND id=:id", {userId, id: eventId}), lastUpdatedAt);
    // if (checkError) return checkError;
    const updatedAt = new Date().toISOString();
    let photos: any[];
    if (newPhotos && !(newPhotos instanceof Array)) {
      photos = [newPhotos];
    } else {
      photos = newPhotos;
    }
    const values = photos.map((f: any) => db_formatter('(?, ?, ?, ?, FROM_BASE64(?))', [
      userId,
      eventId,
      Math.random().toString(),
      f.filename,
      f.content.toString('base64'),
      // updatedAt
    ])).join(',');
    // const query = "INSERT INTO Photo (user, eventId, id, name, photo, updated_at) VALUES"
    const query = `INSERT INTO Photo (user, eventId, id, name, photo) VALUES ${values}`;
    const result = await DB.execute(query);
    console.log('post photos', result.insertId);
    return {data: 'ok', updatedAt};
  }
}
