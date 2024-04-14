import 'dotenv/config'
import {createClient} from '@supabase/supabase-js';
import fetch, {Headers, Request, Response} from 'node-fetch';

// @ts-ignore
globalThis.fetch = fetch
// @ts-ignore
globalThis.Headers = Headers
// @ts-ignore
globalThis.Request = Request
// @ts-ignore
globalThis.Response = Response

const url = process.env['DATABASE_URL'];
const key = process.env['DATABASE_KEY'];
const config = {
  db: {schema: 'db'}
};

export const DB = createClient(url, key, config);

const userId = '7193e14a-9a8b-4809-989a-efd547666acc'; //Zil1
const eventId = '0.624622211023278';
const qnaMasterEventId = '0.624622211023278';
const qnaEventId = '0.07939692916690477';
const qnaId = '13703e8d-6b40-11ee-ab23-ea5db5d63640';
const photoId = '7faa2962-5899-11ee-b2a8-86b64d8a47d5';

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

console.log('Done');

