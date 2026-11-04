import { getPhotoPath, ParsedFile, RepositoryResult, RequestBody } from './utils';
import { DB } from './db-connector';
import { Tables, TablesInsert } from './database.type';
import { getObject, putObject, deleteObjects } from './object-storage';
import sharp from 'sharp';

export const PhotosRepository = {
  _imageFromDBToAPI(image: string): string {
    return Buffer.from(image.substring(2), 'hex').toString('base64');
  },

  _imageFromAPIToDB(image: Buffer): string {
    return '\\x' + image.toString('hex');
  },

  async _getPhotoFromStorage(user: string, id: string) {
    const photo = await getObject(getPhotoPath(user, id));
    return photo?.toString('base64') ?? null;
  },

  async _uploadPhotoToStorage(user: string, id: string, photo: ParsedFile) {
    await putObject(getPhotoPath(user, id), Buffer.from(photo.content), photo.mimeType);
  },

  async _deletePhotoFromStorage(user: string, id: string) {
    await deleteObjects([getPhotoPath(user, id)]);
  },

  async getPhoto(userId: string, eventId: string, photoId: string) {
    const [result, photoBuffer] = await Promise.all([
      DB.from('photo').select('name').eq('user', userId).eq('eventid', eventId).eq('id', photoId).maybeSingle(),
      this._getPhotoFromStorage(userId, photoId),
    ]);
    const photoRow: Pick<Tables<'photo'>, 'name'> | null = result.data;
    if (!photoRow) throw new Error('Photo not found');
    return { photo: photoBuffer, name: photoRow.name };
  },

  async getPhotos(userId: string, eventId: string): Promise<RepositoryResult<any>> {
    const result = await DB.from('photo').select('id, name, thumbnail').eq('user', userId).eq('eventid', eventId).order('name', { ascending: true });
    const photos: Pick<Tables<'photo'>, 'id' | 'name' | 'thumbnail'>[] = result.data || [];
    photos.forEach((photo) => {
      photo.thumbnail = photo.thumbnail && this._imageFromDBToAPI(photo.thumbnail);
    });
    return { data: photos, updatedAt: '' };
  },

  async postPhotos(userId: string, eventId: string, { data: { newPhotos, photoMetadata } }: RequestBody<any>): Promise<RepositoryResult<string>> {
    const updatedAt = new Date().toISOString();
    if (newPhotos) await this.addNewPhotos(userId, eventId, newPhotos, updatedAt);
    if (photoMetadata) await this.modifyPhotos(userId, eventId, photoMetadata, updatedAt);
    return { data: 'ok', updatedAt };
  },

  async addNewPhotos(userId: string, eventId: string, newPhotos: any, updatedAt: string) {
    const photos: ParsedFile[] = Array.isArray(newPhotos) ? newPhotos : [newPhotos];
    await Promise.all(photos.map(async (photo) => {
      const thumbnail = await sharp(photo.content).resize({ width: 300, height: 300, fit: 'inside' }).toBuffer();
      const values: TablesInsert<'photo'> = {
        user: userId,
        eventid: eventId,
        name: photo.filename,
        updated_at: updatedAt,
        thumbnail: this._imageFromAPIToDB(thumbnail),
      };
      const uploaded = await DB.from('photo').upsert(values).select('id').single();
      try {
        await this._uploadPhotoToStorage(userId, uploaded.data.id, photo);
      } catch (error) {
        await DB.from('photo').delete().eq('user', userId).eq('id', uploaded.data.id);
        throw error;
      }
    }));
  },

  async modifyPhotos(userId: string, eventId: string, photosToModify: any, updatedAt: string) {
    const photos: any[] = Array.isArray(photosToModify) ? photosToModify : [photosToModify];
    const mapped = photos.map((photo) => typeof photo === 'string' ? JSON.parse(photo) : photo);
    const values: TablesInsert<'photo'>[] = mapped.filter((photo) => !photo.toDelete).map((photo) => ({
      user: userId, eventid: eventId, id: photo.id, name: photo.name, updated_at: updatedAt,
    }));
    if (values.length) await DB.from('photo').upsert(values);
  },

  async deletePhoto(userId: string, eventId: string, photoId: string): Promise<RepositoryResult<{ id: string }>> {
    await this._deletePhotoFromStorage(userId, photoId);
    await DB.from('photo').delete().eq('user', userId).eq('eventid', eventId).eq('id', photoId);
    return { data: { id: photoId }, updatedAt: new Date().toISOString() };
  },
};
