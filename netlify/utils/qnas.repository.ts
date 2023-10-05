import { getUpdatedAtFromRow, RepositoryResult, RequestBody } from './utils';
import { DB, db_formatter } from './db-connector';

export const QNAsRepository = {

  async getQNA(userId: string, masterId: string, eventId: string, qnaId: string): Promise<RepositoryResult<any>> {
    console.log('getQNA', {userId, eventId, qnaId});
    const result = await DB.execute(`
      SELECT T.id, T.question, T.answer, S.status
      FROM QNATemplate as T
      JOIN QNAStatus as S ON (T.id = S.id AND T.user = S.user)
      WHERE T.user=:userId AND T.eventId=:masterId AND S.id=:qnaId AND S.eventId=:eventId
    `, {userId, eventId, qnaId, masterId});
    const qnaRow: any = result.rows[0];
    const updatedAt = getUpdatedAtFromRow(qnaRow);
    console.log('get qna', userId, eventId, 'qnaId', qnaId);
    return {data: qnaRow, updatedAt};
  },

  async getQNAs(userId: string, masterId: string, eventId: string): Promise<RepositoryResult<any>> {
    console.log('getQNAs', {userId, eventId});
    const result = await DB.execute(`
      SELECT T.id, T.question, T.answer, S.status
      FROM QNATemplate as T
      JOIN QNAStatus as S ON (T.user = S.user AND T.id = S.id)
      WHERE T.user=:userId AND T.eventId=:masterId AND S.eventId=:eventId
    `, {userId, eventId, masterId});
    const qnas: any[] = result.rows;
    console.log('get qnas', userId, eventId, 'qnas', qnas.length);
    return {data: qnas, updatedAt: ''};
  },

  async postQNA(userId: string, masterId: string, eventId: string, {data: qna}: RequestBody<any>): Promise<RepositoryResult<any>> {
    const updatedAt = new Date().toISOString();
    const [templateResult, statusResult, id] = await DB.transaction(async tx => {
      await tx.execute('SET @QNAID = COALESCE(:id, UUID())', {id: qna.id});

      const tQuery = `
        INSERT INTO QNATemplate (user, eventId, id, question, answer, updated_at)
        VALUES(:userId, :masterId, @QNAID, :question, :answer, :updatedAt)
        ON DUPLICATE KEY UPDATE question=:question, answer=:answer, updated_at=:updatedAt
      `;
      const tParams = {
        userId,
        question: qna.question,
        answer: qna.answer,
        masterId,
        updatedAt
      }
      const tResult = await tx.execute(tQuery, tParams);

      const sQuery = `
        INSERT INTO QNAStatus (user, eventId, id, status, updated_at)
        VALUES(:userId, :eventId, @QNAID, :status, :updatedAt)
        ON DUPLICATE KEY UPDATE status=:status, updated_at=:updatedAt
      `;
      const sParams = {
        userId,
        status: qna.status,
        eventId,
        updatedAt
      }
      const sResult = await tx.execute(sQuery, sParams);

      const idResult = await tx.execute('SELECT id FROM QNATemplate WHERE user=:userId AND eventId=:masterId AND id=@QNAID', {
        userId,
        masterId
      });

      const id = (idResult.rows[0] as any).id;
      return [tResult, sResult, id]
    });

    console.log('post qna', {templateResult, statusResult});
    return {data: {id}, updatedAt};
  },

  async deleteQNA(userId: string, masterId: string, eventId: string, qnaId: string): Promise<RepositoryResult<{ id: string }>> {
    const [templateResult, statusResult] = await DB.transaction(async tx => {
      const tQuery = `
        DELETE FROM QNATemplate WHERE user = :userId AND eventId = :masterId AND id = :qnaId
      `;
      const tParams = {
        userId,
        qnaId,
        masterId
      }
      const tResult = await tx.execute(tQuery, tParams);

      const sQuery = `
        DELETE FROM QNAStatus WHERE user = :userId AND id = :qnaId
      `;
      const sParams = {
        userId,
        qnaId
      }
      const sResult = await tx.execute(sQuery, sParams);

      return [tResult.insertId, sResult.insertId]
    });

    console.log('delete qna', {templateResult, statusResult});

    return {data: {id: qnaId}, updatedAt: new Date().toISOString()};
  },

  async bulkGetQNA(userId: string, bulkQueryParamsString: string[]): Promise<RepositoryResult<any>> {
    const bulkQueryParams = bulkQueryParamsString.map(q => new URLSearchParams(q));
    const ids = bulkQueryParams.map(q => db_formatter('(:ids)', {ids: [q.get('masterId'), q.get('id')]}));
    const result = await DB.execute(`
      SELECT T.id, T.eventId as masterId, S.eventId as eventId, T.question, T.answer, S.status
      FROM QNATemplate as T
      JOIN QNAStatus as S ON (T.user = S.user AND T.id = S.id)
      WHERE T.user=:userId AND (T.eventId, S.eventId) IN (${ids.join(', ')})
    `, {userId});

    const returnData = result.rows.reduce<Record<string, RepositoryResult<any[]>>>((acc, row: Record<string, any>, i) => {
      const {eventId, masterId, ...qna} = row;
      const id = `id=${eventId}&masterId=${masterId}`;
      if (!acc[id]) {
        acc[id] = {
          data: [],
          updatedAt: ''
        };
      }
      acc[id].data.push(qna);
      return acc;
    }, {});

    return {data: returnData, updatedAt: new Date().toISOString()};
  }
}
