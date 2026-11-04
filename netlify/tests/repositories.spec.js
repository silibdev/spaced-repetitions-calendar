import assert from 'assert';
import { DB } from '../utils/db-connector.ts';
import { StorageClient, PHOTO_STORAGE_BUCKET } from '../utils/storage-connector.ts';
import { SettingsRepository } from '../utils/settings.repository.ts';
import { EventListRepository } from '../utils/event-list.repository.ts';
import { EventDetailRepository } from '../utils/event-detail.repository.ts';
import { EventDescriptionRepository } from '../utils/event-description.repository.ts';
import { CalendarEventRepository } from '../utils/calendar-event.repository.ts';
import { QNAsRepository } from '../utils/qnas.repository.ts';
import { LastUpdatesRepository } from '../utils/last-updates.repository.ts';
import { PhotosRepository } from '../utils/photos.repository.ts';
import { DataRepository } from '../utils/data.repository.ts';

async function runTests() {
  console.log('--- Starting Neon & S3 Repositories Unit Tests with Mocks ---');

  // Track queries and mock responses
  const executedQueries = [];
  const queryResponses = new Map();

  DB.query = async (text, params) => {
    executedQueries.push({ text, params });
    for (const [key, val] of queryResponses.entries()) {
      if (text.includes(key)) {
        return typeof val === 'function' ? val(params) : val;
      }
    }
    return [];
  };

  // Track storage calls
  const storageOps = [];
  StorageClient.download = async (bucket, key) => {
    storageOps.push({ op: 'download', bucket, key });
    if (key.includes('existing')) {
      return Buffer.from('fake-photo-data');
    }
    return null;
  };
  StorageClient.upload = async (bucket, key, body, contentType) => {
    storageOps.push({ op: 'upload', bucket, key, contentType });
  };
  StorageClient.remove = async (bucket, keys) => {
    storageOps.push({ op: 'remove', bucket, keys });
  };

  const testUser = 'user-123';

  // 1. Test SettingsRepository
  console.log('Testing SettingsRepository...');
  queryResponses.set('SELECT "user", data, updated_at FROM settings', [
    { user: testUser, data: '{"theme":"dark"}', updated_at: '2026-11-04T10:00:00.000Z' }
  ]);
  const settingsRes = await SettingsRepository.getSettings(testUser);
  assert.strictEqual(settingsRes.data, '{"theme":"dark"}');
  assert.strictEqual(settingsRes.updatedAt, '2026-11-04T10:00:00.000Z');

  await SettingsRepository.postSettings(testUser, { data: '{"theme":"light"}' });
  assert.ok(executedQueries.some(q => q.text.includes('INSERT INTO settings')));

  await SettingsRepository.deleteSettings(testUser);
  assert.ok(executedQueries.some(q => q.text.includes('DELETE FROM settings')));
  console.log('✓ SettingsRepository passed.');

  // 2. Test EventListRepository
  console.log('Testing EventListRepository...');
  queryResponses.set('SELECT "user", list, updated_at FROM eventlist', [
    { user: testUser, list: 'event-list-data', updated_at: '2026-11-04T10:00:00.000Z' }
  ]);
  const listRes = await EventListRepository.getEventList(testUser);
  assert.strictEqual(listRes.data, 'event-list-data');

  await EventListRepository.postEventList(testUser, { data: 'new-list' });
  assert.ok(executedQueries.some(q => q.text.includes('INSERT INTO eventlist')));
  console.log('✓ EventListRepository passed.');

  // 3. Test EventDetailRepository
  console.log('Testing EventDetailRepository...');
  queryResponses.set('SELECT "user", id, detail, updated_at FROM eventdetail', [
    { user: testUser, id: 'event-1', detail: 'detail-content', updated_at: '2026-11-04T10:00:00.000Z' }
  ]);
  queryResponses.set('SELECT id, detail, updated_at FROM eventdetail', [
    { id: 'event-1', detail: 'detail-content', updated_at: '2026-11-04T10:00:00.000Z' }
  ]);
  const detailRes = await EventDetailRepository.getEventDetail(testUser, 'event-1');
  assert.strictEqual(detailRes.data, 'detail-content');

  await EventDetailRepository.postEventDetail(testUser, 'event-1', { data: 'updated-detail' });
  assert.ok(executedQueries.some(q => q.text.includes('INSERT INTO eventdetail')));

  const bulkDetailRes = await EventDetailRepository.bulkGetEventDetail(testUser, ['event-1']);
  assert.ok(bulkDetailRes.data['id=event-1']);
  console.log('✓ EventDetailRepository passed.');

  // 4. Test EventDescriptionRepository
  console.log('Testing EventDescriptionRepository...');
  queryResponses.set('SELECT "user", id, description, updated_at FROM eventdescription', [
    { user: testUser, id: 'event-1', description: 'desc-content', updated_at: '2026-11-04T10:00:00.000Z' }
  ]);
  const descRes = await EventDescriptionRepository.getEventDescription(testUser, 'event-1');
  assert.strictEqual(descRes.data, 'desc-content');

  await EventDescriptionRepository.postEventDescription(testUser, 'event-1', { data: 'updated-desc' });
  assert.ok(executedQueries.some(q => q.text.includes('INSERT INTO eventdescription')));
  console.log('✓ EventDescriptionRepository passed.');

  // 5. Test CalendarEventRepository
  console.log('Testing CalendarEventRepository...');
  queryResponses.set('SELECT "user", id, masterid, start, details FROM calendarevent', [
    {
      user: testUser,
      id: 'cal-1',
      masterid: 'master-1',
      start: '2026-11-04T10:00:00.000Z',
      details: { repetitionNumber: 1, done: false }
    }
  ]);
  const calRes = await CalendarEventRepository.getEventList(testUser, new Date());
  assert.strictEqual(calRes.data.length, 1);
  assert.strictEqual(calRes.data[0].id, 'cal-1');
  assert.strictEqual(calRes.data[0].repetitionNumber, 1);
  console.log('✓ CalendarEventRepository passed.');

  // 6. Test QNAsRepository
  console.log('Testing QNAsRepository...');
  queryResponses.set('SELECT t.id, t.question, t.answer, s.status, s.updated_at', [
    { id: 'qna-1', question: 'Q1', answer: 'A1', status: 'OK', updated_at: '2026-11-04T10:00:00.000Z' }
  ]);
  const qnaRes = await QNAsRepository.getQNA(testUser, 'master-1', 'event-1', 'qna-1');
  assert.strictEqual(qnaRes.data.id, 'qna-1');
  assert.strictEqual(qnaRes.data.question, 'Q1');
  assert.strictEqual(qnaRes.data.status, 'OK');
  console.log('✓ QNAsRepository passed.');

  // 7. Test LastUpdatesRepository
  console.log('Testing LastUpdatesRepository...');
  queryResponses.set('SELECT\n         el.updated_at AS eventlist_updated_at', [
    { eventlist_updated_at: '2026-11-04T10:00:00.000Z', settings_updated_at: '2026-11-04T10:00:00.000Z' }
  ]);
  queryResponses.set('SELECT\n         ed.id,\n         ed.updated_at AS detail_updated_at', [
    { id: 'ev-1', detail_updated_at: '2026-11-04T10:00:00.000Z', desc_updated_at: '2026-11-04T10:00:00.000Z' }
  ]);
  const lastUpdatesRes = await LastUpdatesRepository.getLastUpdates(testUser);
  assert.strictEqual(lastUpdatesRes.data.eventList, '2026-11-04T10:00:00.000Z');
  assert.strictEqual(lastUpdatesRes.data.settings, '2026-11-04T10:00:00.000Z');
  assert.strictEqual(lastUpdatesRes.data.eventDetails.length, 1);
  console.log('✓ LastUpdatesRepository passed.');

  // 8. Test PhotosRepository & S3 Storage
  console.log('Testing PhotosRepository with S3 db-photos...');
  queryResponses.set('SELECT name FROM photo', [
    { name: 'photo1.jpg' }
  ]);
  const photoRes = await PhotosRepository.getPhoto(testUser, 'ev-1', 'existing-photo');
  assert.strictEqual(photoRes.name, 'photo1.jpg');
  assert.ok(photoRes.photo);
  assert.ok(storageOps.some(op => op.op === 'download' && op.bucket === PHOTO_STORAGE_BUCKET));

  await PhotosRepository.deletePhoto(testUser, 'ev-1', 'existing-photo');
  assert.ok(storageOps.some(op => op.op === 'remove' && op.bucket === PHOTO_STORAGE_BUCKET));
  console.log('✓ PhotosRepository & S3 storage passed.');

  // 9. Test DataRepository
  console.log('Testing DataRepository deleteData...');
  queryResponses.set('SELECT id FROM photo WHERE "user" = $1', [
    { id: 'p1' }, { id: 'p2' }
  ]);
  await DataRepository.deleteData(testUser);
  assert.ok(storageOps.some(op => op.op === 'remove' && op.keys.includes(`${testUser}/p1`)));
  assert.ok(executedQueries.some(q => q.text.includes('DELETE FROM settings')));
  assert.ok(executedQueries.some(q => q.text.includes('DELETE FROM calendarevent')));
  console.log('✓ DataRepository deleteData passed.');

  console.log('\n--- ALL REPOSITORY AND S3 INTEGRATION TESTS PASSED! ---');
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
