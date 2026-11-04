import { sql } from './db-connector';
import { getUpdatedAtFromRow, RepositoryResult, RequestBody } from './utils';
import { Tables, TablesInsert } from './database.type';

export const QNAsRepository = {
  async getQNA(userId: string, masterId: string, eventId: string, qnaId: string): Promise<RepositoryResult<any>> {
    const updatedAt = new Date().toISOString();
    await sql`INSERT INTO "db".qnastatus ("user", eventid, id, updated_at, status) VALUES (${userId}, ${eventId}, ${qnaId}, ${updatedAt}, NULL) ON CONFLICT ("user", eventid, id) DO NOTHING`;
    const rows = await sql`SELECT t.id, t.question, t.answer, s.status, s.updated_at FROM "db".qnatemplate AS t LEFT JOIN "db".qnastatus AS s ON s."user" = t."user" AND s.id = t.id AND s.eventid = ${eventId} WHERE t."user" = ${userId} AND t.eventid = ${masterId} AND t.id = ${qnaId} LIMIT 1`;
    const row = rows[0];
    const qna = { id: row?.id, question: row?.question, answer: row?.answer, status: row?.status };
    return { data: qna, updatedAt: getUpdatedAtFromRow(row) };
  },

  async getQNAs(userId: string, masterId: string, eventId: string): Promise<RepositoryResult<any>> {
    const templates = await sql`SELECT id, question, answer FROM "db".qnatemplate WHERE "user" = ${userId} AND eventid = ${masterId}`;
    const questionIds = templates.map((row: any) => row.id);
    const updatedAt = new Date().toISOString();
    for (const id of questionIds) {
      await sql`INSERT INTO "db".qnastatus ("user", eventid, id, updated_at, status) VALUES (${userId}, ${eventId}, ${id}, ${updatedAt}, NULL) ON CONFLICT ("user", eventid, id) DO NOTHING`;
    }
    const statuses = questionIds.length
      ? await sql`SELECT id, status FROM "db".qnastatus WHERE "user" = ${userId} AND eventid = ${eventId} AND id = ANY(${questionIds})`
      : [];
    const statusById = new Map(statuses.map((row: any) => [row.id, row.status]));
    return { data: templates.map((row: any) => ({ ...row, status: statusById.get(row.id) })), updatedAt: '' };
  },

  async postQNA(userId: string, masterId: string, eventId: string, { data: qna }: RequestBody<any>): Promise<RepositoryResult<any>> {
    const updatedAt = new Date().toISOString();
    const template: TablesInsert<'qnatemplate'> = { user: userId, eventid: masterId, id: qna.id, question: qna.question, answer: qna.answer, updated_at: updatedAt };
    const templateRows = await sql`INSERT INTO "db".qnatemplate ("user", eventid, id, question, answer, updated_at) VALUES (${template.user}, ${template.eventid}, ${template.id ?? null}, ${template.question ?? null}, ${template.answer ?? null}, ${updatedAt}) ON CONFLICT ("user", eventid, id) DO UPDATE SET question = EXCLUDED.question, answer = EXCLUDED.answer, updated_at = EXCLUDED.updated_at RETURNING id`;
    const id = templateRows[0].id;
    const status: TablesInsert<'qnastatus'> = { user: userId, eventid: eventId, id, status: qna.status, updated_at: updatedAt };
    await sql`INSERT INTO "db".qnastatus ("user", eventid, id, status, updated_at) VALUES (${status.user}, ${status.eventid}, ${status.id}, ${status.status ?? null}, ${updatedAt}) ON CONFLICT ("user", eventid, id) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`;
    return { data: { id }, updatedAt };
  },

  async deleteQNA(userId: string, masterId: string, _eventId: string, qnaId: string): Promise<RepositoryResult<{ id: string }>> {
    await sql`DELETE FROM "db".qnastatus WHERE "user" = ${userId} AND id = ${qnaId}`;
    await sql`DELETE FROM "db".qnatemplate WHERE "user" = ${userId} AND eventid = ${masterId} AND id = ${qnaId}`;
    return { data: { id: qnaId }, updatedAt: new Date().toISOString() };
  },
};
