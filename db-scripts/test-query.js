import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import * as LZUTF8 from 'lzutf8';
import { readFileSync, writeFileSync } from 'node:fs';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('Set DATABASE_URL in the environment first');
const sql = neon(connectionString);
const bucket = 'db-photos';
const s3 = new S3Client({
  region: process.env['AWS_REGION'],
  endpoint: process.env['AWS_ENDPOINT_URL_S3'],
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env['AWS_ACCESS_KEY_ID'] || '',
    secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] || '',
  },
});

const userIdZil1 = '7193e14a-9a8b-4809-989a-efd547666acc';
const userIdAltea = 'b6f09585-8795-4950-bdfe-438fa25f4750';
const userIdCornelius = 'ec9aa59f-19a1-411b-8f65-f9188756fc08';
const userIdJeffrey = '27c6dc43-3c2f-421e-982a-89c227eaa15c';
const userId = userIdCornelius;
const eventId = '0.624622211023278';
const qnaMasterEventId = '0.624622211023278';
const qnaEventId = '0.07939692916690477';
const qnaId = '13703e8d-6b40-11ee-ab23-ea5db5d63640';
const photoId = '7faa2962-5899-11ee-b2a8-86b64d8a47d5';

// SIMPLE READ
// const result = await sql`SELECT * FROM "db".settings WHERE "user" = ${userId}`;

// READ WITH JOIN (event list and its settings timestamp)
// const result = await sql`SELECT e.updated_at AS eventlist_updated_at, s.updated_at AS settings_updated_at FROM "db".eventlist e LEFT JOIN "db".settings s USING ("user") WHERE e."user" = ${userId}`;

// READ BYTEA thumbnail from PostgreSQL
// const [photo] = await sql`SELECT thumbnail, name FROM "db".photo WHERE "user" = ${userId} AND eventid = ${eventId} AND id = ${photoId}`;
// if (!photo) throw new Error('Not found');
// const thumbnailBuffer = Buffer.from(photo.thumbnail.replace(/^\\\\x/, ''), 'hex');
// writeFileSync(photo.name, thumbnailBuffer);

// INSERT/UPDATE BYTEA thumbnail
// const imageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=';
// const imageHex = `\\x${Buffer.from(imageBase64, 'base64').toString('hex')}`;
// await sql`INSERT INTO "db".photo ("user", eventid, name, thumbnail) VALUES (${userId}, ${eventId}, 'test.png', ${imageHex}) ON CONFLICT ("user", id) DO UPDATE SET thumbnail = EXCLUDED.thumbnail`;

// JOIN Q&A templates and event-specific statuses
// const qnas = await sql`SELECT t.id, t.question, t.answer, s.status FROM "db".qnatemplate t LEFT JOIN "db".qnastatus s ON s."user" = t."user" AND s.id = t.id AND s.eventid = ${qnaEventId} WHERE t."user" = ${userId} AND t.eventid = ${qnaMasterEventId}`;
// console.log(qnas);

// OBJECT STORAGE: upload, download, delete
// const imageBuffer = Buffer.from(imageBase64, 'base64');
// await s3.send(new PutObjectCommand({ Bucket: bucket, Key: `${userId}/${photoId}`, Body: imageBuffer, ContentType: 'image/png' }));
// const download = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: `${userId}/${photoId}` }));
// if (download.Body) writeFileSync('downloaded-photo.png', Buffer.from(await download.Body.transformToByteArray()));
// await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: `${userId}/${photoId}` }));

// INSPECT bucket object presence with a known key; S3-compatible APIs do not expose SQL joins.
// const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: `${userId}/${photoId}` }));
// console.log(object.ContentType, object.ContentLength);

// MIGRATE legacy BYTEA photos to the Neon S3-compatible bucket (manual; uncomment deliberately).
// const photos = await sql`SELECT id, name, photo FROM "db".photo WHERE "user" = ${userId} AND photo IS NOT NULL`;
// for (const row of photos) {
//   const body = Buffer.from(String(row.photo).replace(/^\\\\x/, ''), 'hex');
//   const extension = String(row.name || '').split('.').pop()?.toLowerCase();
//   const contentType = extension ? `image/${extension}` : 'application/octet-stream';
//   await s3.send(new PutObjectCommand({ Bucket: bucket, Key: `${userId}/${row.id}`, Body: body, ContentType: contentType }));
// }

// RECOVERY an object from a legacy photo column
// const [legacy] = await sql`SELECT photo, name FROM "db".photo WHERE "user" = ${userId} AND id = ${photoId}`;
// if (legacy?.photo) writeFileSync(legacy.name, Buffer.from(String(legacy.photo).replace(/^\\\\x/, ''), 'hex'));

// MIGRATION TO calendarevent from the compressed legacy eventlist (manual; modifies database).
// const [eventListRow] = await sql`SELECT list FROM "db".eventlist WHERE "user" = ${userId}`;
// const eventList = JSON.parse(LZUTF8.default.decompress(eventListRow.list, { outputEncoding: 'String', inputEncoding: 'Base64' }));
// console.log(eventList.length, ' events to insert');
// let notInserted = [];
// let count = 0;
// for (const event of eventList) {
//   try {
//     const details = { done: event.done, repetitionNumber: event.repetitionNumber };
//     await sql`INSERT INTO "db".calendarevent ("user", id, masterid, start, details) VALUES (${userId}, ${event.id}, ${event.linkedSpacedRepId || null}, ${new Date(event.start)}, ${JSON.stringify(details)}::jsonb) ON CONFLICT ("user", id, start) DO UPDATE SET masterid = EXCLUDED.masterid, details = EXCLUDED.details`;
//     count += 1;
//   } catch (error) {
//     console.error('Failed event', event.id, error);
//     notInserted.push(event.id);
//   }
// }
// console.log({ total: eventList.length, inserted: count, notInserted });
// const sample = await sql`SELECT * FROM "db".calendarevent WHERE "user" = ${userId} LIMIT 10`;
// console.log(sample);

// Keep a harmless connection check runnable by default.
const result = await sql`SELECT current_schema() AS current_schema, current_database() AS current_database`;
console.log(result);

// Ensure imported helpers remain easy to use when uncommenting manual examples.
void [userIdZil1, userIdAltea, userIdJeffrey, eventId, qnaId, photoId, readFileSync, DeleteObjectCommand];
