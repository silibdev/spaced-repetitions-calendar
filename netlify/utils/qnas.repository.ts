import { getUpdatedAtFromRow, RepositoryResult, RequestBody } from './utils';
import { DB } from './db-connector';
import { Tables, TablesInsert } from './database.type';

export const QNAsRepository = {
  async getQNA(
    userId: string,
    masterId: string,
    eventId: string,
    qnaId: string,
  ): Promise<RepositoryResult<any>> {
    console.log('getQNA', { userId, eventId, qnaId });

    const updatedAtNow = new Date().toISOString();
    await DB.query(
      `INSERT INTO qnastatus ("user", eventid, id, status, updated_at)
       VALUES ($1, $2, $3, NULL, $4)
       ON CONFLICT ("user", eventid, id) DO NOTHING`,
      [userId, eventId, qnaId, updatedAtNow],
    );

    const rows = await DB.query<{
      id: string;
      question: string | null;
      answer: string | null;
      status: string | null;
      updated_at: string | Date | null;
    }>(
      `SELECT t.id, t.question, t.answer, s.status, s.updated_at
       FROM qnatemplate t
       LEFT JOIN qnastatus s ON s."user" = t."user" AND s.id = t.id AND s.eventid = $4
       WHERE t."user" = $1 AND t.eventid = $2 AND t.id = $3
       LIMIT 1`,
      [userId, masterId, qnaId, eventId],
    );

    const first = rows[0] || null;
    const qnaRow = {
      id: first?.id,
      question: first?.question,
      answer: first?.answer,
      status: first?.status,
    };
    const updatedAt = getUpdatedAtFromRow(first);
    console.log('get qna', userId, eventId, 'qnaId', qnaId);

    return { data: qnaRow, updatedAt };
  },

  async getQNAs(
    userId: string,
    masterId: string,
    eventId: string,
  ): Promise<RepositoryResult<any>> {
    console.log('getQNAs', { userId, eventId });
    const updatedAt = new Date().toISOString();

    // 1. get questions ids
    const questions = await DB.query<{ id: string }>(
      'SELECT id FROM qnatemplate WHERE "user" = $1 AND eventid = $2',
      [userId, masterId],
    );
    const questionIds: string[] = questions.map((r) => r.id);

    if (questionIds.length) {
      for (const id of questionIds) {
        await DB.query(
          `INSERT INTO qnastatus ("user", eventid, id, status, updated_at)
           VALUES ($1, $2, $3, NULL, $4)
           ON CONFLICT ("user", eventid, id) DO NOTHING`,
          [userId, eventId, id, updatedAt],
        );
      }
    }

    const rows = await DB.query<{
      id: string;
      question: string | null;
      answer: string | null;
      status: string | null;
    }>(
      `SELECT t.id, t.question, t.answer, s.status
       FROM qnatemplate t
       JOIN qnastatus s ON s."user" = t."user" AND s.id = t.id AND s.eventid = $3
       WHERE t."user" = $1 AND t.eventid = $2`,
      [userId, masterId, eventId],
    );

    const qnas = rows.map((qna) => ({
      id: qna.id,
      question: qna.question,
      answer: qna.answer,
      status: qna.status,
    }));
    console.log('get qnas', userId, eventId, 'qnas', qnas.length);

    return { data: qnas, updatedAt: '' };
  },

  async postQNA(
    userId: string,
    masterId: string,
    eventId: string,
    { data: qna }: RequestBody<any>,
  ): Promise<RepositoryResult<any>> {
    const updatedAt = new Date().toISOString();

    let id = qna.id;
    if (id) {
      await DB.query(
        `INSERT INTO qnatemplate ("user", eventid, id, question, answer, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ("user", eventid, id)
         DO UPDATE SET question = EXCLUDED.question, answer = EXCLUDED.answer, updated_at = EXCLUDED.updated_at`,
        [userId, masterId, id, qna.question, qna.answer, updatedAt],
      );
    } else {
      const generatedRows = await DB.query<{ id: string }>(
        `INSERT INTO qnatemplate ("user", eventid, question, answer, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [userId, masterId, qna.question, qna.answer, updatedAt],
      );
      id = generatedRows[0]?.id;
    }
    qna.id = id;

    await DB.query(
      `INSERT INTO qnastatus ("user", eventid, id, status, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("user", eventid, id)
       DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`,
      [userId, eventId, id, qna.status, updatedAt],
    );

    console.log('post qna', id);
    return { data: { id }, updatedAt };
  },

  async deleteQNA(
    userId: string,
    masterId: string,
    eventId: string,
    qnaId: string,
  ): Promise<
    RepositoryResult<{
      id: string;
    }>
  > {
    const sResult = await DB.query(
      'DELETE FROM qnastatus WHERE "user" = $1 AND id = $2',
      [userId, qnaId],
    );

    const tResult = await DB.query(
      'DELETE FROM qnatemplate WHERE "user" = $1 AND eventid = $2 AND id = $3',
      [userId, masterId, qnaId],
    );

    console.log('delete qna', tResult.length, sResult.length);

    return { data: { id: qnaId }, updatedAt: new Date().toISOString() };
  },
};
