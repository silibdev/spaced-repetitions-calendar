import { getUpdatedAtFromRow, RepositoryResult, RequestBody } from './utils';
import { DB } from './db-connector';
import { Tables, TablesInsert } from './database.type';

export const QNAsRepository = {

  async getQNA(userId: string, masterId: string, eventId: string, qnaId: string): Promise<RepositoryResult<any>> {
    console.log('getQNA', {userId, eventId, qnaId});

    const values: Tables<'qnastatus'> = {
      user: userId,
      id: qnaId,
      eventid: eventId,
      updated_at: new Date().toISOString(),
      status: null
    };
    await DB.from('qnastatus').upsert(values, {ignoreDuplicates: true});

    const result = await DB.from('qnatemplate')
      .select('id, question, answer, qnastatus (status)')
      .eq('user', userId)
      .eq('eventid', masterId)
      .eq('id', qnaId)
      .eq('qnastatus.eventid', eventId)
      .maybeSingle();
    const qnaRow = {
      id: result.data?.id,
      question: result.data?.question,
      answer: result.data?.answer,
      status: result.data?.qnastatus[0].status
    };
    const updatedAt = getUpdatedAtFromRow(qnaRow);
    console.log('get qna', userId, eventId, 'qnaId', qnaId);

    return {data: qnaRow, updatedAt};
  },

  async getQNAs(userId: string, masterId: string, eventId: string): Promise<RepositoryResult<any>> {
    console.log('getQNAs', {userId, eventId});
    const updatedAt = new Date().toISOString();

    //check which statuses are present
    // 1. get questions ids
    const r = await DB.from('qnatemplate')
      .select('id')
      .eq('user', userId)
      .eq('eventid', masterId);
    const questionIds: string[] = (r.data || []).map((r) => r.id);

    if (questionIds.length) {
      const values: Tables<'qnastatus'>[] = questionIds.map(id => ({
        user: userId,
        eventid: eventId,
        id,
        updated_at: updatedAt,
        status: null
      }));
      // 2. Add statuses that are missing
      await DB.from('qnastatus').upsert(values, {ignoreDuplicates: true});
    }

    const result = await DB.from('qnatemplate')
      .select('id, question, answer, qnastatus (status)')
      .eq('user', userId)
      .eq('eventid', masterId)
      .eq('qnastatus.eventid', eventId);
    const qnas = (result.data || []).map(qna => ({
      id: qna.id,
      question: qna.question,
      answer: qna.answer,
      status: qna.qnastatus[0].status
    }));
    console.log('get qnas', userId, eventId, 'qnas', qnas.length);

    return {data: qnas, updatedAt: ''};
  },

  async postQNA(userId: string, masterId: string, eventId: string, {data: qna}: RequestBody<any>): Promise<RepositoryResult<any>> {
    const updatedAt = new Date().toISOString();

    const tValues: TablesInsert<'qnatemplate'> = {
      user: userId,
      eventid: masterId,
      id: qna.id,
      question: qna.question,
      answer: qna.answer,
      updated_at: updatedAt
    };
    const tResult = await DB.from('qnatemplate').upsert(tValues).select().single();
    qna.id = tResult.data!.id;

    const sValues: TablesInsert<'qnastatus'> = {
      user: userId,
      eventid: eventId,
      id: qna.id,
      status: qna.status,
      updated_at: updatedAt
    };
    const sResult = await DB.from('qnastatus').upsert(sValues).select().single();

    const id = qna.id;

    console.log('post qna', tResult.data, sResult.data, id);
    return {data: {id}, updatedAt};
  },

  // EventId is not used because when deleting a qna you have to delete all statuses for all events
  async deleteQNA(userId: string, masterId: string, eventId: string, qnaId: string): Promise<RepositoryResult<{
    id: string
  }>> {
    const sResult = await DB.from('qnastatus')
      .delete()
      .eq('user', userId)
      .eq('id', qnaId);

    const tResult = await DB.from('qnatemplate')
      .delete()
      .eq('user', userId)
      .eq('eventid', masterId)
      .eq('id', qnaId);

    console.log('delete qna', tResult.count, sResult.count);

    return {data: {id: qnaId}, updatedAt: new Date().toISOString()};
  }
}
