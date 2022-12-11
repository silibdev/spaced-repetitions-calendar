import { RepositoryResult } from './utils';
import { DB } from './db-connector';

export const DataRepository = {
  async deleteData(userId: string): Promise<RepositoryResult<string>> {
    const result = await DB.execute(`
DELETE S, EL, EDES, EDET
      FROM Settings as S
      JOIN EventList as EL ON S.user = EL.user
      JOIN EventDescription as EDES ON S.user = EDES.user
      JOIN EventDetail as EDET ON S.user = EDET.user
     WHERE S.user=:userId
`, {userId});
    return Promise.resolve({data: 'Done', updatedAt: new Date().toISOString()})
  }
}
