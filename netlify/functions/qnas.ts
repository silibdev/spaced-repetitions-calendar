import { Handler, HandlerResponse } from '@netlify/functions';
import { createHandler, createResponse, RequestBody } from '../utils/utils';
import { QNAsRepository } from '../utils/qnas.repository';

const handler: Handler = createHandler({
  getResource: getQNAs,
  postResource: postQNA,
  deleteResource: deleteQNA,
});

async function getQNAs(
  userId: string,
  {
    id,
    qnaId,
    masterId,
  }: {
    id: string;
    masterId: string;
    qnaId?: string;
  },
): Promise<HandlerResponse> {
  if (qnaId) {
    const qnas = await QNAsRepository.getQNA(userId, masterId, id, qnaId);
    return createResponse(qnas);
  } else {
    const qna = await QNAsRepository.getQNAs(userId, masterId, id);
    return createResponse(qna);
  }
}

async function postQNA(
  userId: string,
  body: RequestBody,
  {
    id,
    masterId,
  }: {
    id: string;
    masterId: string;
  },
): Promise<HandlerResponse> {
  const qna = await QNAsRepository.postQNA(userId, masterId, id, body);
  return createResponse(qna);
}

async function deleteQNA(
  userId: string,
  {
    id,
    masterId,
    qnaId,
  }: {
    id: string;
    masterId: string;
    qnaId: string;
  },
): Promise<HandlerResponse> {
  const eventDetail = await QNAsRepository.deleteQNA(
    userId,
    masterId,
    id,
    qnaId,
  );
  return createResponse(eventDetail);
}

export { handler };
