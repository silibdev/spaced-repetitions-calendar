import { RepositoryResult, RequestBody } from './utils';
import { DB, db_formatter } from './db-connector';
import sharp from 'sharp';

export const PhotosRepository = {

  async getPhoto(userId: string, eventId: string, photoId: string) {
    console.log('getPhoto', {userId, eventId, photoId});
    const result = await DB.execute("SELECT name, photo FROM Photo WHERE user=:userId AND eventId=:eventId AND id=:photoId", {userId, eventId, photoId});
    const photoRow: any = result.rows[0];
    const photoBuffer = Buffer.from(photoRow.photo, 'binary').toString('base64');
    console.log('get photo', userId, eventId, 'photoId', photoId);
    return {photo: photoBuffer, name: photoRow.name};
  },

  async getPhotos(userId: string, eventId: string): Promise<RepositoryResult<any>> {
    console.log('getPhotos', {userId, eventId});
    const result = await DB.execute("SELECT id, name, thumbnail FROM Photo WHERE user=:userId AND eventId=:eventId ORDER BY name ASC", {userId, eventId});
    const photos: any[] = result.rows;
    photos.forEach(p => {
      const thumbnailString = Buffer.from(p.thumbnail, 'binary').toString('base64');
      p.thumbnail = thumbnailString;
    });
    console.log('get photos', userId, eventId, 'photos', photos.length);
    return {data: photos, updatedAt: ''};
  },

  async postPhotos(userId: string, eventId: string, {data: {newPhotos, photoMetadata}}: RequestBody<any>): Promise<RepositoryResult<string>> {
    console.log('postPhotos', {userId, eventId});
    // const checkError = await checkLastUpdate(DB.execute("SELECT updated_at FROM EventDescription WHERE user=:userId AND id=:id", {userId, id: eventId}), lastUpdatedAt);
    // if (checkError) return checkError;
    const updatedAt = new Date().toISOString();

    if (newPhotos) {
      await this.addNewPhotos(userId, eventId, newPhotos, updatedAt);
    }

    if (photoMetadata) {
      await this.modifyPhotos(userId, eventId, photoMetadata, updatedAt);
    }

    return {data: 'ok', updatedAt};
  },

  async addNewPhotos(userId: string, eventId: string, newPhotos: any, updatedAt: string) {
    let photos: any[];
    if (newPhotos instanceof Array) {
      photos = newPhotos;
    } else {
      photos = [newPhotos];
    }

    const values = (await Promise.all(photos.map( async (f: any) => {
      const thumbnail = await sharp(f.content).resize({
        width: 300,
        height: 300,
        fit: 'inside'
      }).toBuffer();
      return db_formatter('(?, ?, UUID(), ?, FROM_BASE64(?), FROM_BASE64(?), ?)', [
        userId,
        eventId,
        f.filename,
        f.content.toString('base64'),
        thumbnail.toString('base64'),
        updatedAt
      ])
    }))).join(',');
    const query = `INSERT INTO Photo (user, eventId, id, name, photo, thumbnail, updated_at) VALUES ${values}`;
    const result = await DB.execute(query);
    console.log('new photos', result.insertId);
  },

  async modifyPhotos(userId: string, eventId: string, photosToModify: any, updatedAt: string) {
    let photos: any[];
    if (photosToModify instanceof Array) {
      photos = photosToModify;
    } else {
      photos = [photosToModify];
    }

    const photoMapped = photos.map((f: any) => JSON.parse(f));

    const values = photoMapped.filter(p => !p.toDelete)
      .map((f: any) => db_formatter('(?, ?, ?, ?, ?)', [
      userId,
      eventId,
      f.id,
      f.name,
      updatedAt
    ])).join(',');
    const queryModify = `INSERT INTO Photo (user, eventId, id, name, updated_at) VALUES ${values} ON DUPLICATE KEY UPDATE name=VALUES(name), updated_at=VALUES(updated_at)`;
    const result = await DB.execute(queryModify);
    console.log('modified photos', result.insertId);
  },

  async deletePhoto(userId: string, eventId: string, photoId: string): Promise<RepositoryResult<{ id: string }>> {
    const queryDelete = `DELETE FROM Photo WHERE user = :userId AND eventId = :eventId AND id = :photoId`;
    const resultDelete = await DB.execute(queryDelete, {userId, eventId, photoId});
    console.log('deleted photo', resultDelete.insertId);
    return {data: {id: photoId}, updatedAt: new Date().toISOString()};
  }
}
