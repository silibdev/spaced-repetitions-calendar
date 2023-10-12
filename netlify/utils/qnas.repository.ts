import { getUpdatedAtFromRow, RepositoryResult, RequestBody } from './utils';
import { DB } from './db-connector';

export const QNAsRepository = {

  async getQNA(userId: string, masterId: string, eventId: string, qnaId: string): Promise<RepositoryResult<any>> {
    console.log('getQNA', {userId, eventId, qnaId});
    const {qnaRow, updatedAt} = await DB.transaction(async tx => {
      //Check if statuses are present
      const r = await tx.execute(`
        SELECT id, eventId
        FROM QNAStatus
        WHERE user = :userId
        AND eventId = :eventId
        AND id = :questionId
      `, {userId, eventId, qnaId});
      // If multiple => error
      if (r.rows.length > 1) {
        throw new Error(`There should be only one question status for user:${userId}, event:${eventId}, qna:${qnaId}. Instead you got ${r.rows.length}`);
      }

      // If not present => create it
      if (r.rows.length === 0) {
        await tx.execute(`
          INSERT INTO QNAStatus (user, eventId, id, updated_at)
          VALUES (:userId, :eventId, :questionId, :updatedAt)
        `, {userId, eventId, qnaId, updatedAt: new Date().toISOString()});
      }

      const result = await tx.execute(`
        SELECT T.id, T.question, T.answer, S.status
        FROM QNATemplate as T
        LEFT JOIN QNAStatus as S ON (T.id = S.id AND T.user = S.user)
        WHERE T.user=:userId AND T.eventId=:masterId AND S.id=:qnaId AND S.eventId=:eventId
      `, {userId, eventId, qnaId, masterId});
      const qnaRow: any = result.rows[0];
      const updatedAt = getUpdatedAtFromRow(qnaRow);
      console.log('get qna', userId, eventId, 'qnaId', qnaId);
      return {qnaRow, updatedAt};
    })
    return {data: qnaRow, updatedAt};
  },

  async getQNAs(userId: string, masterId: string, eventId: string): Promise<RepositoryResult<any>> {
    console.log('getQNAs', {userId, eventId});
    const qnas = await DB.transaction(async tx => {
      const updatedAt = new Date().toISOString();
      //check which statuses are present
      // 1. get questions ids
      const r = await tx.execute(`
          SELECT id
          FROM QNATemplate
          WHERE user = :userId
          AND eventId = :masterId
        `, {userId, masterId});
      const questionIds: string[] = r.rows.map((r: any) => r.id);

      if (questionIds.length) {
        // 2. get questions without statuses
        const r2 = await tx.execute(`
          SELECT id, eventId
          FROM QNAStatus
          WHERE user = :userId
          AND eventId = :eventId
          AND id in (:questionIds)
        `, {userId, eventId, questionIds});
        const questionsWithStatus = r2.rows.map((r: any) => r.id);
        const missingQuestions = questionIds.filter(id => !questionsWithStatus.includes(id));

        for (const questionId of missingQuestions) {
          await tx.execute(`
            INSERT INTO QNAStatus (user, eventId, id, updated_at)
            VALUES (:userId, :eventId, :questionId, :updatedAt)
          `, {userId, eventId, questionId, updatedAt});
        }
      }

      const result = await tx.execute(`
        SELECT T.id, T.question, T.answer, S.status
        FROM QNATemplate as T
        LEFT JOIN QNAStatus as S ON (T.user = S.user AND T.id = S.id)
        WHERE T.user=:userId AND T.eventId=:masterId AND S.eventId=:eventId
      `, {userId, eventId, masterId});
      const qnas: any[] = result.rows;
      console.log('get qnas', userId, eventId, 'qnas', qnas.length);
      return qnas;
    });
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

  // EventId is not used because when deleting a qna you have to delete all statuses for all events
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
  }
}
