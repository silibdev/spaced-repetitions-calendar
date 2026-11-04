import { getPhotoPath, PHOTO_STORAGE, RepositoryResult } from './utils';
import { DB } from './db-connector';
import { StorageClient } from './storage-connector';

export const DataRepository = {
  async deleteData(userId: string): Promise<RepositoryResult<string>> {
    // 1. Fetch photo ids for all events belonging to the user
    const photos = await DB.query<{ id: string }>(
      'SELECT id FROM photo WHERE "user" = $1',
      [userId],
    );
    const paths = (photos || []).map((p) => getPhotoPath(userId, p.id));

    // 2. Remove files from storage
    if (paths.length > 0) {
      await StorageClient.remove(PHOTO_STORAGE, paths);
    }

    // 3. Delete records from all tables
    await Promise.all([
      DB.query('DELETE FROM settings WHERE "user" = $1', [userId]),
      DB.query('DELETE FROM eventlist WHERE "user" = $1', [userId]),
      DB.query('DELETE FROM eventdescription WHERE "user" = $1', [userId]),
      DB.query('DELETE FROM eventdetail WHERE "user" = $1', [userId]),
      DB.query('DELETE FROM qnastatus WHERE "user" = $1', [userId]),
      DB.query('DELETE FROM qnatemplate WHERE "user" = $1', [userId]),
      DB.query('DELETE FROM photo WHERE "user" = $1', [userId]),
      DB.query('DELETE FROM calendarevent WHERE "user" = $1', [userId]),
    ]);

    return Promise.resolve({
      data: 'Done',
      updatedAt: new Date().toISOString(),
    });
  },
};
