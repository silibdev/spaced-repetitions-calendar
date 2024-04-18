import { getPhotoPath, PHOTO_STORAGE, RepositoryResult } from './utils';
import { DB } from './db-connector';

export const DataRepository = {
  async deleteData(userId: string): Promise<RepositoryResult<string>> {
    await Promise.all([
      DB.from('settings').delete().eq('user', userId),
      DB.from('eventlist').delete().eq('user', userId),
      DB.from('eventdescription').delete().eq('user', userId),
      DB.from('eventdetail').delete().eq('user', userId).select().then(async events => {
        // FOR ALL EVENTS
        const ids = (events.data || [])?.map(e => e.id);
        const photos = await DB.from('photo').select('id').eq('user', userId).in('eventid', ids)
        // CREATE PATH TO STORAGE
        const paths = (photos.data || []).map(p => getPhotoPath(userId, p.id));
        // DELETE THEM
        if (paths.length) {
          await DB.storage.from(PHOTO_STORAGE).remove(paths);
        }
      }),
      DB.from('qnastatus').delete().eq('user', userId),
      DB.from('qnatemplate').delete().eq('user', userId),
      DB.from('photo').delete().eq('user', userId)
    ]);
    return Promise.resolve({data: 'Done', updatedAt: new Date().toISOString()})
  }
}
