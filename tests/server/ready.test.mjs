// Kiểm tra ISO (js/readyx.js): biểu "Đã có" khi có tệp mẫu trong Kho tệp mẫu (kể cả chỉ có sheet phụ) hoặc in từ app M&E / Checksheet;
// Một phần / Đề xuất chưa có tệp mẫu vẫn thiếu; ✕ không tính; thứ tự theo nhóm → thứ tự danh mục → mã; đếm, lọc.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readyRows, readySummary, readyFilter } from '../../js/readyx.js';
import { freshServer, ownerClient, uuid } from '../helpers.mjs';

const it = (code, o = {}) => ({ item_id: 'id-' + code, code, group_key: code.split('-').slice(1, 3).join('-'), status: 'DRAFTING', where: 'MANUAL', sort_order: 0, ...o });
const tpl = (set, n, sub = false) => ({ t: { document_id: 'doc-' + set, set_code: set, file_name: set + '.xlsx' }, s: { n, p: 'A4', o: 'P' }, sub });

test('Đã có / Thiếu, cách có, thứ tự, đếm, lọc', () => {
  const items = [
    it('BM-CĐ-08-01', { where: 'ME_PART', sort_order: 9 }),
    it('BM-CĐ-04-03', { where: 'ME', sort_order: 5 }),
    it('BM-CĐ-04-01', { sort_order: 4 }),
    it('BM-CĐ-03-03', { where: 'ME', sort_order: 3 }),
    it('BM-CĐ-02-05', { where: 'CS', sort_order: 2 }),
    it('BM-CĐ-07-02', { where: 'CS_PROPOSED', sort_order: 7 }),
    it('BM-CĐ-01-05', { status: 'NA', sort_order: 1 }),
    it('BM-CĐ-03-04', { status: 'NONE', sort_order: 3 })
  ];
  const byItem = new Map([
    ['id-BM-CĐ-04-03', [tpl('BM-CĐ-04', 'BM-CĐ-04-03'), tpl('BM-CĐ-04', 'BM-CĐ-04-03-TH', true)]],
    ['id-BM-CĐ-03-04', [tpl('BM-CĐ-03', 'BM-CĐ-03-04a', true)]]
  ]);
  const { rows, na } = readyRows(items, byItem);
  assert.deepEqual(na.map((x) => x.code), ['BM-CĐ-01-05'], '✕ không tính');
  assert.deepEqual(rows.map((r) => [r.it.code, r.have, r.how, r.app]), [
    ['BM-CĐ-02-05', true, 'CS', 'CS'],
    ['BM-CĐ-03-03', true, 'ME', 'ME'],
    ['BM-CĐ-03-04', true, 'TPL', ''],
    ['BM-CĐ-04-01', false, '', ''],
    ['BM-CĐ-04-03', true, 'TPL', 'ME'],
    ['BM-CĐ-07-02', false, '', ''],
    ['BM-CĐ-08-01', false, '', '']
  ]);
  assert.equal(rows.find((r) => r.it.code === 'BM-CĐ-04-03').tpl.s.n, 'BM-CĐ-04-03', 'sheet đúng mã trước sheet phụ');
  assert.equal(rows.find((r) => r.it.code === 'BM-CĐ-03-04').tpl.sub, true, 'chỉ có sheet phụ vẫn tính là có tệp mẫu (như Kho)');
  const s = readySummary(rows);
  assert.deepEqual(s, { total: 7, have: 4, missing: 3, pct: 57.1, TPL: 2, ME: 1, CS: 1, done: 0, todo: 7, donePct: 0 });
  assert.deepEqual(readyFilter(rows, 'MISSING').map((r) => r.it.code), ['BM-CĐ-04-01', 'BM-CĐ-07-02', 'BM-CĐ-08-01']);
  assert.equal(readyFilter(rows, 'HAVE').length, 4);
  assert.equal(readyFilter(rows, '').length, 7);
  assert.deepEqual(readySummary([]), { total: 0, have: 0, missing: 0, pct: 0, TPL: 0, ME: 0, CS: 0, done: 0, todo: 0, donePct: 0 });
  // Đã làm (26/11/2026): biểu có hồ sơ
  const done = new Map([['id-BM-CĐ-04-01', { last: '2026-11-20', n: 2, src: 'REC' }], ['id-BM-CĐ-03-03', { last: '2026-11-21', n: 5, src: 'APP' }]]);
  const r2 = readyRows(items, byItem, done).rows;
  assert.deepEqual(r2.filter((r) => r.done).map((r) => [r.it.code, r.done.last]), [['BM-CĐ-03-03', '2026-11-21'], ['BM-CĐ-04-01', '2026-11-20']]);
  const s2 = readySummary(r2);
  assert.deepEqual([s2.done, s2.todo, s2.donePct], [2, 5, 28.6]);
  assert.deepEqual(readyFilter(r2, 'TODO').map((r) => r.it.code), ['BM-CĐ-02-05', 'BM-CĐ-03-04', 'BM-CĐ-04-03', 'BM-CĐ-07-02', 'BM-CĐ-08-01']);
  assert.deepEqual(readyFilter(r2, 'DONE').map((r) => r.it.code), ['BM-CĐ-03-03', 'BM-CĐ-04-01']);
});

test('máy chủ: hồ sơ giấy không kèm ảnh (pages 0) cần Ghi chú; tắt cài đặt record_no_file thì bắt ảnh; cài đặt gửi xuống app', () => {
  const env = freshServer({ now: '2026-11-26T08:00:00+07:00' });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  env.g.dbReset_();
  assert.equal(owner.call('sync.bootstrap', {}).data.settings.record_no_file, true);
  const it = env.rows('Items').find((x) => x.code === 'BM-CĐ-08-01');
  const sub = (extra) => owner.write('record.submit', { record_id: uuid(), item_id: it.item_id, period_from: '2026-11-20', period_to: '2026-11-20', ...extra });
  const f = (r) => (r.errors || []).map((e) => e.field + ':' + e.code);
  assert.deepEqual(f(sub({ pages: 0 })), ['note:REQUIRED']);
  assert.deepEqual(f(sub({ pages: '' })), ['pages:PAGES_INVALID']);
  const ok = sub({ pages: 0, note: 'Tủ hồ sơ cơ điện' });
  assert.equal(ok.ok, true, JSON.stringify(ok));
  env.g.dbReset_();
  assert.equal(env.rows('Records')[0].pages, 0);
  // Trạng thái hệ thống không báo thiếu tệp cho hồ sơ giấy
  const h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'records');
  assert.doesNotMatch(h.value + ' ' + (h.note || ''), /thiếu tệp [1-9]/);
  env.g.withWriteLock_(() => env.g.writeSetting_('record_no_file', false, 'TEST'));
  env.g.cache_().removeAll(['cfg:settings']);
  env.g.dbReset_();
  assert.deepEqual(f(sub({ pages: 0, note: 'Tủ hồ sơ' })), ['pages:PAGES_INVALID']);
  assert.equal(sub({ pages: 1, note: '' }).ok, true);
});
