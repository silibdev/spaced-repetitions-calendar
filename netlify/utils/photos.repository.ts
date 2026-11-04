import { sql } from './db-connector';
import { getPhotoPath, ParsedFile, RepositoryResult, RequestBody } from './utils';
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
    const [rows, photo] = await Promise.all([
      sql`SELECT name FROM "db".photo WHERE "user" = ${userId} AND eventid = ${eventId} AND id = ${photoId} LIMIT 1`,
      this._getPhotoFromStorage(userId, photoId),
    ]);
    const photoRow = rows[0] as Pick<Tables<'photo'>, 'name'> | undefined;
    if (!photoRow) throw new Error('Photo not found');
    return { photo, name: photoRow.name };
  },

  async getPhotos(userId: string, eventId: string): Promise<RepositoryResult<any>> {
    const rows = await sql`SELECT id, name, thumbnail FROM "db".photo WHERE "user" = ${userId} AND eventid = ${eventId} ORDER BY name ASC`;
    const photos = rows as Pick<Tables<'photo'>, 'id' | 'name' | 'thumbnail'>[];
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
      const rows = await sql`INSERT INTO "db".photo ("user", eventid, name, updated_at, thumbnail) VALUES (${userId}, ${eventId}, ${photo.filename}, ${updatedAt}, ${this._imageFromAPIToDB(thumbnail)}) ON CONFLICT ("user", id) DO UPDATE SET eventid = EXCLUDED.eventid, name = EXCLUDED.name, updated_at = EXCLUDED.updated_at, thumbnail = EXCLUDED.thumbnail RETURNING id`;
      const id = rows[0]?.id;
      if (!id) throw new Error('Neon did not return an id for the inserted photo');
      try {
        await this._uploadPhotoToStorage(userId, id, photo);
      } catch (error) {
        await sql`DELETE FROM "db".photo WHERE "user" = ${userId} AND id = ${id}`;
        throw error;
      }
    }));
  },

  async modifyPhotos(userId: string, eventId: string, photosToModify: any, updatedAt: string) {
    const photos: any[] = Array.isArray(photosToModify) ? photosToModify : [photosToModify];
    const mapped = photos.map((photo) => typeof photo === 'string' ? JSON.parse(photo) : photo);
    for (const photo of mapped.filter((item) => !item.toDelete)) {
      await sql`INSERT INTO "db".photo ("user", eventid, id, name, updated_at) VALUES (${userId}, ${eventId}, ${photo.id}, ${photo.name}, ${updatedAt}) ON CONFLICT ("user", id) DO UPDATE SET eventid = EXCLUDED.eventid, name = EXCLUDED.name, updated_at = EXCLUDED.updated_at`;
    }
  },

  async deletePhoto(userId: string, eventId: string, photoId: string): Promise<RepositoryResult<{ id: string }>> {
    await this._deletePhotoFromStorage(userId, photoId);
    await sql`DELETE FROM "db".photo WHERE "user" = ${userId} AND eventid = ${eventId} AND id = ${photoId}`;
    return { data: { id: photoId }, updatedAt: new Date().toISOString() };
  },
};
