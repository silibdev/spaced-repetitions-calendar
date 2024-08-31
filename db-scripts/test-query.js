import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fetch, { Headers, Request, Response } from 'node-fetch';

// @ts-ignore
globalThis.fetch = fetch;
// @ts-ignore
globalThis.Headers = Headers;
// @ts-ignore
globalThis.Request = Request;
// @ts-ignore
globalThis.Response = Response;

const url = process.env['DATABASE_URL'];
const key = process.env['DATABASE_KEY'];
const config = {
  db: { schema: 'db' },
};

export const DB = createClient(url, key, config);

const userId = '7193e14a-9a8b-4809-989a-efd547666acc'; //Zil1
const userIdAltea = 'b6f09585-8795-4950-bdfe-438fa25f4750';
// const userId = userIdAltea;
const eventId = '0.624622211023278';
const qnaMasterEventId = '0.624622211023278';
const qnaEventId = '0.07939692916690477';
const qnaId = '13703e8d-6b40-11ee-ab23-ea5db5d63640';
const photoId = '7faa2962-5899-11ee-b2a8-86b64d8a47d5';
const storageBucket = 'db.photo';

// SIMPLE READ
// const result = await DB.from('settings').select();

// READ WITH JOIN
// const result = await DB.from('eventlist').select(`
//     updated_at,
//     settings (
//       updated_at
//     )
//     `).eq('user', userId).maybeSingle();

// READ BYTEA
// const result= await DB.from('photo').select().eq('user', userId).eq('eventid', eventId).eq('id', photoId).maybeSingle();
// if (!result.data) throw 'Not found';
// console.log(result.data.thumbnail);
// const photo = Buffer.from(result.data.thumbnail.substring(2), 'hex').toString('base64');
// console.log('decoded');
// console.log(photo)
// fs.writeFileSync(result.data.name, photo, 'base64');

// UPLOAD BYTEA
// const imageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII=';
// const imageHex = '\\x' + Buffer.from(imageBase64, 'base64').toString('hex');
// const values = {
//   user: userId,
//   eventid: eventId,
//   thumbnail: imageHex,
//   photo: imageHex,
//   name: 'test.png'
// }
// const result = await DB.from('photo').upsert(values).select();
// console.log(result.data);

// JOIN
// const result = await DB.from('qnatemplate')
//   .select('id, question, answer, qnastatus (status)')
//   .eq('user', userId)
//   .eq('eventid', qnaMasterEventId)
//   //.eq('id', qnaId)
//   .eq('qnastatus.eventid', qnaEventId);
// result.data.forEach( qna => {
//   console.log({id: qna.id, question: qna.question, status: qna.qnastatus[0].status, statusLenght: qna.qnastatus.length});
// });

// TEST STORAGE
// const imageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII=';
// const imageBuffer = Buffer.from(imageBase64, 'base64');
//
// const resultUp = await DB.storage.from(storageBucket).upload('myTest.png', imageBuffer, {contentType: 'image/png'});
// {
//   path: 'myTest.png',
//     id: '76dd3da6-49cb-4be8-8c09-8558519a4678',
//   fullPath: 'db.photo/myTest.png'
// }
// console.log('resultUp', resultUp);

// const result = await DB.schema('storage').from('objects').select();

// const result = await DB.storage.from(storageBucket).remove(['fold/myTest.png']);
// console.log(result);

// MIGRATE TO STORAGE
// const photoOnDB = await DB.from('eventdetail').select().eq('user', userId)
//   .then(events => {
//     const ids = (events.data || [])?.map(e => e.id);
//     return DB.from('photo').select('id, name, eventid')
//       .eq('user', userId)
//       .in('eventid', ids)
//       .not('photo', 'is', null);
//   });
//
// console.log(photoOnDB.error);
// console.log(photoOnDB.data?.length);
// console.log(photoOnDB.data?.map(p => ({id: p.id, name: p.name})));
//
// const count = {ok: 0, error: 0, alreadyPresent: 0};
// const impossible = [];
// await Promise.all(photoOnDB.data?.map(async (p, i) => {
//   const alreadyPresent = await DB.schema('storage').from('objects').select().like('name', '%' + p.id + '%').maybeSingle();
//   if (alreadyPresent.data) {
//     count.alreadyPresent += 1;
//     return;
//   }
//
//   const photoDownload = await DB.from('photo').select('photo').eq('id', p.id).single();
//   if (!photoDownload.data) {
//     console.log({userId, id: p.id, name: p.name, error: photoDownload.error});
//     count.error += 1;
//     impossible.push(p.id);
//     return;
//   }
//   const photo = Buffer.from(photoDownload.data.photo.substring(2), 'hex');
//   const mimeSplit = p.name.split('.');
//   const mime = mimeSplit[mimeSplit.length - 1];
//   const {data, error} = await DB.storage.from(storageBucket).upload(`${userId}/${p.id}`, photo, {contentType: 'image/' + mime});
//   if (error) {
//     console.log(2, {userId, id: p.id, name: p.name, error});
//   }
//   count.ok += 1;
// }));
// console.log({count});
// console.log(impossible);

// RECOVERY
// const toMove = [];
//
// const photoDB = await DB.from('photo').select('photo, name, id').eq('id', toMove[0].id).single();
// if (photoDB.error) {
//   console.log({error: photoDB.error});
// }
// const p = photoDB.data;
// console.log(p.name, p.id);
// const photo = Buffer.from(p.photo.substring(2), 'hex');
// const mimeSplit = p.name.split('.');
// const mime = mimeSplit[mimeSplit.length - 1];
// const result = await DB.storage.from(storageBucket).upload(`${userId}/${p.id}`, photo, {contentType: 'image/' + mime});
// console.log(result);

/*
const eventListCompressedResult = await DB.from('eventlist').select().eq('user', userId).single();
const eventListCompressed = eventListCompressedResult.data.list;
const eventList = JSON.parse(LZUTF8.decompress(eventListCompressed, {
  outputEncoding: 'String',
  inputEncoding: 'Base64'
}));
//{"id":"0.7141991718870142","linkedSpacedRepId":"0.07884715725606184","repetitionNumber":90,"start":"2022-03-09T07:46:32.764Z","done":true}
console.log(eventList.length, ' to insert');

let notInserted = [];
let batch = [];
let count = 0;
for (const event of eventList) {
  if (batch.length === 0 ) {
    console.log('Inserted', count);
  }

  batch.push({
    user: userId,
    id: event.id,
    masterid: event.linkedSpacedRepId,
    start: new Date(event.start),
    details: {
      done: event.done,
      repetitionNumber: event.repetitionNumber,
    }
  });

  if (batch.length === 100) {
    try {
      await DB.from('calendarevent').upsert(batch);
      count += 100;
    } catch (e) {
      console.log(e.message);
      notInserted.push(...batch.map(e => e.id));
    }
    batch = [];
  }
}

if (batch.length !== 0) {
  try {
    await DB.from('calendarevent').upsert(batch);
    count += batch.length;
  } catch (e) {
    console.log(e.message);
    notInserted.push(...batch.map(e => e.id));
  }
  batch = [];
}

console.log({notInserted});
console.log({
  total: eventList.length,
  notInserted: notInserted.length,
  diff: eventList.length - notInserted.length,
  count
});
*/

const res = await DB.from('calendarevent').select().limit(10);
console.log(res);

console.log('Done');
