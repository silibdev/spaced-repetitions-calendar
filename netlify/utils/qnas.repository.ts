import { getUpdatedAtFromRow, RepositoryResult, RequestBody } from './utils';
import { DB } from './db-connector';
import { Tables, TablesInsert } from './database.type';

export const QNAsRepository = {
  async getQNA(userId: string, masterId: string, eventId: string, qnaId: string): Promise<RepositoryResult<any>> {
    const statusValues: Tables<'qnastatus'> = { user: userId, id: qnaId, eventid: eventId, updated_at: new Date().toISOString(), status: null };
    await DB.from('qnastatus').upsert(statusValues, { ignoreDuplicates: true });
    const result = await DB.from('qnatemplate').select('id, question, answer').eq('user', userId).eq('eventid', masterId).eq('id', qnaId).maybeSingle();
    const status = await DB.from('qnastatus').select('status').eq('user', userId).eq('eventid', eventId).eq('id', qnaId).maybeSingle();
    const qnaRow = { id: result.data?.id, question: result.data?.question, answer: result.data?.answer, status: status.data?.status };
    return { data: qnaRow, updatedAt: getUpdatedAtFromRow(qnaRow) };
  },

  async getQNAs(userId: string, masterId: string, eventId: string): Promise<RepositoryResult<any>> {
    const updatedAt = new Date().toISOString();
    const templates = await DB.from('qnatemplate').select('id, question, answer').eq('user', userId).eq('eventid', masterId);
    const questionIds: string[] = (templates.data || []).map((row: any) => row.id);
    if (questionIds.length) {
      const values: Tables<'qnastatus'>[] = questionIds.map((id) => ({ user: userId, eventid: eventId, id, updated_at: updatedAt, status: null }));
      await DB.from('qnastatus').upsert(values, { ignoreDuplicates: true });
    }
    const statuses = questionIds.length
      ? await DB.from('qnastatus').select('id, status').eq('user', userId).eq('eventid', eventId).in('id', questionIds)
      : { data: [] };
    const statusById = new Map((statuses.data || []).map((row: any) => [row.id, row.status]));
    const qnas = (templates.data || []).map((row: any) => ({ id: row.id, question: row.question, answer: row.answer, status: statusById.get(row.id) }));
    return { data: qnas, updatedAt: '' };
  },

  async postQNA(userId: string, masterId: string, eventId: string, { data: qna }: RequestBody<any>): Promise<RepositoryResult<any>> {
    const updatedAt = new Date().toISOString();
    const template: TablesInsert<'qnatemplate'> = { user: userId, eventid: masterId, id: qna.id, question: qna.question, answer: qna.answer, updated_at: updatedAt };
    const tResult = await DB.from('qnatemplate').upsert(template).select('id').single();
    qna.id = tResult.data.id;
    const status: TablesInsert<'qnastatus'> = { user: userId, eventid: eventId, id: qna.id, status: qna.status, updated_at: updatedAt };
    await DB.from('qnastatus').upsert(status);
    return { data: { id: qna.id }, updatedAt };
  },

  async deleteQNA(userId: string, masterId: string, _eventId: string, qnaId: string): Promise<RepositoryResult<{ id: string }>> {
    await DB.from('qnastatus').delete().eq('user', userId).eq('id', qnaId);
    await DB.from('qnatemplate').delete().eq('user', userId).eq('eventid', masterId).eq('id', qnaId);
    return { data: { id: qnaId }, updatedAt: new Date().toISOString() };
  },
};
