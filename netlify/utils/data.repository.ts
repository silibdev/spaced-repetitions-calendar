import { getPhotoPath, RepositoryResult } from './utils';
import { DB } from './db-connector';
import { deleteObjects } from './object-storage';

export const DataRepository = {
  async deleteData(userId: string): Promise<RepositoryResult<string>> {
    const photos = await DB.from('photo').select('id').eq('user', userId);
    const keys = (photos.data || []).map((photo: { id: string }) => getPhotoPath(userId, photo.id));
    await deleteObjects(keys);

    // Delete dependent rows before their parent rows to respect foreign keys.
    await DB.from('qnastatus').delete().eq('user', userId);
    await DB.from('photo').delete().eq('user', userId);
    await DB.from('qnatemplate').delete().eq('user', userId);
    await DB.from('eventdescription').delete().eq('user', userId);
    await DB.from('eventdetail').delete().eq('user', userId);
    await DB.from('calendarevent').delete().eq('user', userId);
    await DB.from('eventlist').delete().eq('user', userId);
    await DB.from('settings').delete().eq('user', userId);

    return { data: 'Done', updatedAt: new Date().toISOString() };
  },
};
