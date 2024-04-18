import { getPhotoPath, ParsedFile, PHOTO_STORAGE, RepositoryResult, RequestBody } from './utils';
import { DB } from './db-connector';
import { Tables, TablesInsert } from './database.type';
import sharp from 'sharp';

export const PhotosRepository = {
  _imageFromDBToAPI(image: string): string {
    return Buffer.from(image.substring(2), 'hex').toString('base64');
  },

  _imageFromAPIToDB(image: Buffer): string {
    return '\\x' + image.toString('hex');
  },

  async _getPhotoFromStorage(user: string, id: string) {
    console.log({user, id});
    const path = getPhotoPath(user, id);
    const photo = await DB.storage.from(PHOTO_STORAGE).download(path);

    if (!photo.data) return null;

    const photoBuffer = await photo.data.arrayBuffer();
    return Buffer.from(photoBuffer).toString('base64');
  },

  async _uploadPhotoToStorage(user: string, id: string, photo: ParsedFile, {upsert} = {upsert: false}) {
    const path = getPhotoPath(user, id);
    await DB.storage.from(PHOTO_STORAGE).upload(path, photo.content, {upsert, contentType: photo.mimeType});
  },

  async _deletePhotoFromStorage(user: string, id: string) {
    const path = getPhotoPath(user, id);
    await DB.storage.from(PHOTO_STORAGE).remove([path]);
  },

  async getPhoto(userId: string, eventId: string, photoId: string) {
    console.log('getPhoto', {userId, eventId, photoId});
    const [result, photoBuffer] = await Promise.all([
      DB.from('photo')
        .select('name')
        .eq('user', userId)
        .eq('eventid', eventId)
        .eq('id', photoId)
        .maybeSingle(),
      this._getPhotoFromStorage(userId, photoId)
    ]);
    const photoRow: Pick<Tables<'photo'>, 'name'> | null = result.data;
    if (!photoRow) throw 'Photo not found';
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
      const thumbnailString = p.thumbnail && this._imageFromDBToAPI(p.thumbnail)
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
    let photos: ParsedFile[];
    if (newPhotos instanceof Array) {
      photos = newPhotos;
    } else {
      photos = [newPhotos];
    }

    await Promise.all(
      photos.map(async f => {
        const thumbnail = await sharp(f.content).resize({
          width: 300,
          height: 300,
          fit: 'inside'
        }).toBuffer();
        const values: TablesInsert<'photo'> = {
          user: userId,
          // id is generated automatically by default value in sql
          eventid: eventId,
          name: f.filename,
          updated_at: updatedAt,
          thumbnail: this._imageFromAPIToDB(thumbnail)
        };
        const uploaded = await DB.from('photo').upsert(values).select().single();
        await this._uploadPhotoToStorage(userId, uploaded.data!.id, f);
      })
    );

    console.log('new photos', photos.length);
  },

  async modifyPhotos(userId: string, eventId: string, photosToModify: any, updatedAt: string) {
    let photos: any[];
    if (photosToModify instanceof Array) {
      photos = photosToModify;
    } else {
      photos = [photosToModify];
    }

    const photoMapped = photos.map((f: any) => JSON.parse(f));

    const values: TablesInsert<'photo'>[] = photoMapped.filter(p => !p.toDelete)
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
    const [resultDelete] = await Promise.all([
      DB.from('photo')
        .delete()
        .eq('user', userId)
        .eq('eventid', eventId)
        .eq('id', photoId),
      this._deletePhotoFromStorage(userId, photoId)
    ]);
    console.log('deleted photo', resultDelete.count);
    return {data: {id: photoId}, updatedAt: new Date().toISOString()};
  }
}
