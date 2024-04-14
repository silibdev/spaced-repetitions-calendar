import { RepositoryResult } from './utils';
import { DB } from './db-connector';

export const DataRepository = {
  async deleteData(userId: string): Promise<RepositoryResult<string>> {
    await DB.from('settings').delete().eq('user', userId);
    await DB.from('eventlist').delete().eq('user', userId);
    await DB.from('eventdescription').delete().eq('user', userId);
    await DB.from('eventdetail').delete().eq('user', userId);
    await DB.from('qnastatus').delete().eq('user', userId);
    await DB.from('qnatemplate').delete().eq('user', userId);
    await DB.from('photo').delete().eq('user', userId);

    return Promise.resolve({data: 'Done', updatedAt: new Date().toISOString()})
  }
}
