import {
  getPhotoPath,
  ParsedFile,
  PHOTO_STORAGE,
  RepositoryResult,
  RequestBody,
} from './utils';
import { DB } from './db-connector';
import { StorageClient } from './storage-connector';
import { Tables, TablesInsert } from './database.type';
import sharp from 'sharp';

export const PhotosRepository = {
  _imageFromDBToAPI(image: string | Buffer): string {
    if (Buffer.isBuffer(image)) {
      return image.toString('base64');
    }
    if (typeof image === 'string') {
      if (image.startsWith('\\x')) {
        return Buffer.from(image.substring(2), 'hex').toString('base64');
      }
      return Buffer.from(image, 'binary').toString('base64');
    }
    return '';
  },

  _imageFromAPIToDB(image: Buffer): string {
    return '\\x' + image.toString('hex');
  },

  async _getPhotoFromStorage(user: string, id: string) {
    console.log({ user, id });
    const path = getPhotoPath(user, id);
    const photoBuffer = await StorageClient.download(PHOTO_STORAGE, path);

    if (!photoBuffer) return null;

    return photoBuffer.toString('base64');
  },

  async _uploadPhotoToStorage(
    user: string,
    id: string,
    photo: ParsedFile,
    { upsert } = { upsert: false },
  ) {
    const path = getPhotoPath(user, id);
    await StorageClient.upload(
      PHOTO_STORAGE,
      path,
      photo.content,
      photo.mimeType,
    );
  },

  async _deletePhotoFromStorage(user: string, id: string) {
    const path = getPhotoPath(user, id);
    await StorageClient.remove(PHOTO_STORAGE, [path]);
  },

  async getPhoto(userId: string, eventId: string, photoId: string) {
    console.log('getPhoto', { userId, eventId, photoId });
    const [result, photoBuffer] = await Promise.all([
      DB.query<Pick<Tables<'photo'>, 'name'>>(
        'SELECT name FROM photo WHERE "user" = $1 AND eventid = $2 AND id = $3 LIMIT 1',
        [userId, eventId, photoId],
      ),
      this._getPhotoFromStorage(userId, photoId),
    ]);
    const photoRow = result[0] || null;
    if (!photoRow) throw 'Photo not found';
    console.log('get photo', userId, eventId, 'photoId', photoId);
    return { photo: photoBuffer, name: photoRow.name };
  },

  async getPhotos(
    userId: string,
    eventId: string,
  ): Promise<RepositoryResult<any>> {
    console.log('getPhotos', { userId, eventId });
    const rows = await DB.query<
      Pick<Tables<'photo'>, 'id' | 'name' | 'thumbnail'>
    >(
      'SELECT id, name, thumbnail FROM photo WHERE "user" = $1 AND eventid = $2 ORDER BY name ASC',
      [userId, eventId],
    );
    const photos = rows || [];
    photos.forEach((p) => {
      const thumbnailString =
        p.thumbnail && this._imageFromDBToAPI(p.thumbnail);
      p.thumbnail = thumbnailString;
    });
    console.log('get photos', userId, eventId, 'photos', photos.length);
    return { data: photos, updatedAt: '' };
  },

  async postPhotos(
    userId: string,
    eventId: string,
    { data: { newPhotos, photoMetadata } }: RequestBody<any>,
  ): Promise<RepositoryResult<string>> {
    console.log('postPhotos', { userId, eventId });
    const updatedAt = new Date().toISOString();

    if (newPhotos) {
      await this.addNewPhotos(userId, eventId, newPhotos, updatedAt);
    }

    if (photoMetadata) {
      await this.modifyPhotos(userId, eventId, photoMetadata, updatedAt);
    }

    return { data: 'ok', updatedAt };
  },

  async addNewPhotos(
    userId: string,
    eventId: string,
    newPhotos: any,
    updatedAt: string,
  ) {
    let photos: ParsedFile[];
    if (newPhotos instanceof Array) {
      photos = newPhotos;
    } else {
      photos = [newPhotos];
    }

    await Promise.all(
      photos.map(async (f) => {
        const thumbnail = await sharp(f.content)
          .resize({
            width: 300,
            height: 300,
            fit: 'inside',
          })
          .toBuffer();
        const thumbnailHex = this._imageFromAPIToDB(thumbnail);

        const insertedRows = await DB.query<{ id: string }>(
          `INSERT INTO photo ("user", eventid, name, updated_at, thumbnail)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [userId, eventId, f.filename, updatedAt, thumbnailHex],
        );
        const photoId = insertedRows[0]?.id;
        await this._uploadPhotoToStorage(userId, photoId, f);
      }),
    );

    console.log('new photos', photos.length);
  },

  async modifyPhotos(
    userId: string,
    eventId: string,
    photosToModify: any,
    updatedAt: string,
  ) {
    let photos: any[];
    if (photosToModify instanceof Array) {
      photos = photosToModify;
    } else {
      photos = [photosToModify];
    }

    const photoMapped = photos.map((f: any) => JSON.parse(f));

    const photosToUpdate = photoMapped.filter((p: any) => !p.toDelete);

    for (const f of photosToUpdate) {
      await DB.query(
        `INSERT INTO photo ("user", eventid, id, name, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("user", id)
         DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at`,
        [userId, eventId, f.id, f.name, updatedAt],
      );
    }
    console.log('modified photos', photosToUpdate.length);
  },

  async deletePhoto(
    userId: string,
    eventId: string,
    photoId: string,
  ): Promise<RepositoryResult<{ id: string }>> {
    const [resultDelete] = await Promise.all([
      DB.query(
        'DELETE FROM photo WHERE "user" = $1 AND eventid = $2 AND id = $3 RETURNING id',
        [userId, eventId, photoId],
      ),
      this._deletePhotoFromStorage(userId, photoId),
    ]);
    console.log('deleted photo', resultDelete.length);
    return { data: { id: photoId }, updatedAt: new Date().toISOString() };
  },
};
