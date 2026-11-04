import { sql } from './db-connector';
import { getPhotoPath, RepositoryResult } from './utils';
import { deleteObjects } from './object-storage';

export const DataRepository = {
  async deleteData(userId: string): Promise<RepositoryResult<string>> {
    const photos = await sql`SELECT id FROM "db".photo WHERE "user" = ${userId}`;
    const keys = photos.map((photo: { id: string }) => getPhotoPath(userId, photo.id));
    await deleteObjects(keys);

    await sql`DELETE FROM "db".qnastatus WHERE "user" = ${userId}`;
    await sql`DELETE FROM "db".photo WHERE "user" = ${userId}`;
    await sql`DELETE FROM "db".qnatemplate WHERE "user" = ${userId}`;
    await sql`DELETE FROM "db".eventdescription WHERE "user" = ${userId}`;
    await sql`DELETE FROM "db".eventdetail WHERE "user" = ${userId}`;
    await sql`DELETE FROM "db".calendarevent WHERE "user" = ${userId}`;
    await sql`DELETE FROM "db".eventlist WHERE "user" = ${userId}`;
    await sql`DELETE FROM "db".settings WHERE "user" = ${userId}`;

    return { data: 'Done', updatedAt: new Date().toISOString() };
  },
};
