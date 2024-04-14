import { imageFromAPIToDB, imageFromDBToAPI, RepositoryResult, RequestBody } from './utils';
import { DB } from './db-connector';
import sharp from 'sharp';
import { Tables } from './database.type';

export const PhotosRepository = {

  async getPhoto(userId: string, eventId: string, photoId: string) {
    console.log('getPhoto', {userId, eventId, photoId});
    const result = await DB.from('photo')
      .select('name, photo')
      .eq('user', userId)
      .eq('eventid', eventId)
      .eq('id', photoId)
      .maybeSingle();
    const photoRow: Pick<Tables<'photo'>, 'name' | 'photo'> | null = result.data;
    if (!photoRow) throw 'Photo not found';
    const photoBuffer = imageFromDBToAPI(photoRow.photo!);
    console.log('get photo', userId, eventId, 'photoId', photoId);
    return {photo: photoBuffer, name: photoRow.name};
  },

  async getPhotos(userId: string, eventId: string): Promise<RepositoryResult<any>> {
    console.log('getPhotos', {userId, eventId});
    const result = await DB.from('photo')
      .select('id, name, thumbnail')
      .eq('user', userId)
      .eq('eventid', eventId)
      .order('name', {ascending: true});
    const photos: Pick<Tables<'photo'>, 'id' | 'name' | 'thumbnail'>[] = result.data || [];
    photos.forEach(p => {
      const thumbnailString = imageFromDBToAPI(p.thumbnail!)
      p.thumbnail = thumbnailString;
    });
    console.log('get photos', userId, eventId, 'photos', photos.length);
    return {data: photos, updatedAt: ''};
  },

  async postPhotos(userId: string, eventId: string, {
    data: {
      newPhotos,
      photoMetadata
    }
  }: RequestBody<any>): Promise<RepositoryResult<string>> {
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

    const values: Omit<Tables<'photo'>, 'id'>[] = (await Promise.all(photos.map(async (f: any) => {
      const thumbnail = await sharp(f.content).resize({
        width: 300,
        height: 300,
        fit: 'inside'
      }).toBuffer();
      const values = {
        user: userId,
        // id is generated automatically by default value in sql
        eventid: eventId,
        name: f.filename,
        photo: imageFromAPIToDB(f.content),
        thumbnail: imageFromAPIToDB(thumbnail),
        updated_at: updatedAt
      }
      return values;
    })));
    const result = await DB.from('photo').upsert(values);
    console.log('new photos', result.count);
  },

  async modifyPhotos(userId: string, eventId: string, photosToModify: any, updatedAt: string) {
    let photos: any[];
    if (photosToModify instanceof Array) {
      photos = photosToModify;
    } else {
      photos = [photosToModify];
    }

    const photoMapped = photos.map((f: any) => JSON.parse(f));

    const values: Omit<Tables<'photo'>, 'thumbnail' | 'photo'>[] = photoMapped.filter(p => !p.toDelete)
      .map((f: any) => ({
        user: userId,
        eventid: eventId,
        id: f.id,
        name: f.name,
        updated_at: updatedAt
      }));
    const result = await DB.from('photo').upsert(values);
    console.log('modified photos', result.count);
  },

  async deletePhoto(userId: string, eventId: string, photoId: string): Promise<RepositoryResult<{ id: string }>> {
    const resultDelete = await DB.from('photo')
      .delete()
      .eq('user', userId)
      .eq('eventid', eventId)
      .eq('id', photoId);
    console.log('deleted photo', resultDelete.count);
    return {data: {id: photoId}, updatedAt: new Date().toISOString()};
  }
}
