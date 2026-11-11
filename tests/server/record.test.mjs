// Hồ sơ (phiên 1c, nghiệm thu Đợt 1 mục 5, 6): nộp khi mất mạng (hàng chờ → sync.push), nộp theo khoảng ngày phủ đúng các kỳ,
// tệp đi sau; trả lại làm kỳ đó về chưa có; bảng kỳ ✓ ! – với biểu ngày, tuần, tháng, năm; biểu khi phát sinh không bao giờ quá hạn;
// máy chủ và app (js/periods.js) tính cùng một kết quả.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, uuid, fakeJpegB64, OWNER_PIN } from '../helpers.mjs';
import { itemRecordStatus, periodOf, lastPeriods, periodsInRange, isoWeekKey } from '../../js/periods.js';

const NOW = '2026-11-11T08:00:00+07:00'; // Thứ Tư, tuần 2026-W46

function seeded() {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  return { env, owner };
}
const item = (env, code) => env.rows('Items').find((x) => x.code === code);
const rec = (env, id) => env.rows('Records').find((x) => x.record_id === id);
const fakePdfB64 = (n = 2000) => { const b = Buffer.alloc(n, 32); Buffer.from('%PDF-1.4\n').copy(b); return b.toString('base64'); };

/** Gửi một thao tác như hàng chờ trên máy (sync.push) */
function push(c, action, payload, opId = uuid()) {
  return c.call('sync.push', { op: { action, operation_id: opId, expected_version: 0, payload, local_created_at: '2026-11-10T21:00:00+07:00' } });
}
function submit(c, env, code, from, to, extra = {}) {
  const id = uuid();
  const r = c.write('record.submit', { record_id: id, item_id: item(env, code).item_id, period_from: from, period_to: to, pages: 1, ...extra });
  return { id, r };
}
function statusOf(c, env, code) {
  const r = c.call('record.status', { item_id: item(env, code).item_id });
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.data.items[0];
}
const cellMap = (s) => Object.fromEntries(s.cells.map((x) => [x.key, x.st]));

/** Máy chủ (record.status của owner, thấy mọi biểu) và app (js/periods.js) cho cùng kết quả trên mọi biểu */
function assertSameAsClient(env, owner) {
  const srv = owner.call('record.status', {});
  assert.equal(srv.ok, true, JSON.stringify(srv));
  env.g.dbReset_();
  const settings = env.g.settings_();
  const recs = env.rows('Records').filter((r) => r.status === 'SUBMITTED');
  const items = env.rows('Items');
  assert.equal(srv.data.items.length, items.length);
  for (const s of srv.data.items) {
    const it = items.find((x) => x.item_id === s.item_id);
    const c = itemRecordStatus(it, recs.filter((r) => r.item_id === it.item_id), { today: srv.data.today, grace: settings.record_grace_days, startSetting: settings.records_start_date || '' });
    const pick = (o) => ({ type: o.type, counted: o.counted, reason: o.reason, start: o.start, cells: o.cells.map((x) => x.key + ':' + x.st).join(','), due: o.due_key + ':' + o.due_st, overdue: o.overdue, late_n: o.late_n, last: o.last_date, count: o.count });
    assert.deepEqual(pick(c), pick(s), it.code);
  }
  return srv.data;
}

test('mã kỳ: ngày, tuần ISO, tháng, quý, nửa năm, năm; 12 kỳ gần nhất; kỳ trong khoảng ngày', () => {
  assert.deepEqual(periodOf('WEEK', '2026-11-11'), { key: '2026-W46', from: '2026-11-09', to: '2026-11-15' });
  assert.equal(isoWeekKey('2026-01-01'), '2026-W01');
  assert.equal(isoWeekKey('2027-01-01'), '2026-W53');
  assert.deepEqual(periodOf('MONTH', '2028-02-10'), { key: '2028-02', from: '2028-02-01', to: '2028-02-29' });
  assert.deepEqual(periodOf('QUARTER', '2026-11-11'), { key: '2026-Q4', from: '2026-10-01', to: '2026-12-31' });
  assert.deepEqual(periodOf('HALF', '2026-05-01'), { key: '2026-H1', from: '2026-01-01', to: '2026-06-30' });
  assert.deepEqual(periodOf('YEAR', '2026-11-11'), { key: '2026', from: '2026-01-01', to: '2026-12-31' });
  assert.equal(periodOf('EVENT', '2026-11-11'), null);
  const days = lastPeriods('DAY', '2026-11-11');
  assert.equal(days.length, 12);
  assert.equal(days[0].key, '2026-10-31');
  assert.equal(days[11].key, '2026-11-11');
  assert.equal(lastPeriods('MONTH', '2026-11-11')[0].key, '2025-12');
  assert.deepEqual(periodsInRange('WEEK', '2026-10-01', '2026-10-31').map((p) => p.key), ['2026-W40', '2026-W41', '2026-W42', '2026-W43', '2026-W44']);
  // Máy chủ ra cùng mã kỳ
  const env = freshServer({ now: NOW });
  for (const t of ['DAY', 'WEEK', 'MONTH', 'QUARTER', 'HALF', 'YEAR']) {
    for (const d of ['2026-01-01', '2026-12-31', '2027-01-03', '2028-02-29', '2026-06-30', '2026-07-01']) {
      assert.deepEqual(JSON.parse(JSON.stringify(env.g.periodOf_(t, d))), periodOf(t, d), t + ' ' + d);
    }
    assert.deepEqual(JSON.parse(JSON.stringify(env.g.lastPeriods_(t, '2026-11-11', 12))), lastPeriods(t, '2026-11-11', 12), t);
  }
});

test('nộp khi mất mạng: record.submit rồi ảnh đi sau qua hàng chờ; khoảng ngày phủ đúng các kỳ; ✓ ! – theo record_grace_days', () => {
  const { env, owner } = seeded();
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  const it = item(env, 'BM-SX-02-01'); // hằng ngày, ● ban hành 20/01/2026
  const id = uuid();
  const opSubmit = uuid();
  let r = push(sx, 'record.submit', { record_id: id, item_id: it.item_id, period_from: '2026-10-25', period_to: '2026-11-05', pages: 2, note: 'Quyển sổ cuối tháng 10' }, opSubmit);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.state, 'COMMITTED');
  // Gửi lại đúng thao tác (mất phản hồi): không tạo hồ sơ thứ hai
  r = push(sx, 'record.submit', { record_id: id, item_id: it.item_id, period_from: '2026-10-25', period_to: '2026-11-05', pages: 2, note: 'Quyển sổ cuối tháng 10' }, opSubmit);
  assert.equal(r.code, 'DUPLICATE_OPERATION');
  assert.equal(env.rows('Records').length, 1);
  let row = rec(env, id);
  assert.equal(row.code, 'HS-2611-0001');
  assert.equal(row.status, 'SUBMITTED');
  assert.equal(row.dept_code, 'SX');
  assert.equal(row.period_type, 'DAY');
  assert.equal(row.record_date, '2026-11-05');
  assert.equal(row.client_created_at, '2026-11-10T21:00:00+07:00');
  assert.deepEqual(row.files_json, []);
  // Hai trang ảnh (đi sau, cùng hàng chờ)
  for (const n of [2, 1]) {
    r = push(sx, 'doc.upload', { document_id: uuid(), entity_type: 'RECORD', entity_id: id, kind: 'PHOTO', mime_type: 'image/jpeg', file_name: `trang-${n}.jpg`, content_b64: fakeJpegB64(), page_no: n });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.data.entity_type, 'RECORD');
  }
  row = rec(env, id);
  assert.deepEqual(row.files_json.map((f) => [f.page_no, f.file_name, f.kind]), [[1, 'trang-1.jpg', 'PHOTO'], [2, 'trang-2.jpg', 'PHOTO']]);
  assert.equal(row.record_version, 3);
  const docs = env.rows('Documents').filter((d) => d.entity_type === 'RECORD');
  assert.equal(docs.length, 2);
  assert.ok([...env.drive._files.values()].some((f) => /^BM-SX-02-01_HS-2611-0001_p1_/.test(f.name)), 'tên tệp trên Drive');
  // Hồ sơ thứ hai cùng tháng: mã tăng
  const b = submit(sx, env, 'BM-SX-02-01', '2026-11-06', '2026-11-06');
  assert.equal(b.r.ok, true, JSON.stringify(b.r));
  assert.equal(rec(env, b.id).code, 'HS-2611-0002');
  // Bảng kỳ (12 ngày: 31/10 … 11/11): 31/10–06/11 ✓ · 07/11 quá 3 ngày → ! · 08/11–11/11 chưa tới hạn
  const s = statusOf(sx, env, 'BM-SX-02-01');
  assert.equal(s.type, 'DAY');
  assert.equal(s.counted, true);
  assert.equal(s.start, '2026-01-20');
  const m = cellMap(s);
  assert.equal(s.cells.length, 12);
  for (const d of ['2026-10-31', '2026-11-01', '2026-11-05', '2026-11-06']) assert.equal(m[d], 'OK', d);
  assert.equal(m['2026-11-07'], 'LATE');
  for (const d of ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11']) assert.equal(m[d], 'DUE', d);
  assert.equal(s.due_key, '2026-11-07');
  assert.equal(s.overdue, true);
  assert.equal(s.late_n, 1);
  assert.equal(s.last_date, '2026-11-06');
  assert.equal(s.count, 2);
  // Ảnh tải về qua máy chủ: người trong bộ phận được, bộ phận khác không
  const kd = userClient(env, 'KD2', 2, '583925', { depts: 'KD' });
  r = sx.call('doc.get', { document_id: docs[0].document_id });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.mime_type, 'image/jpeg');
  assert.equal(kd.call('doc.get', { document_id: docs[0].document_id }).code, 'FORBIDDEN');
  // Đồng bộ: SX thấy hồ sơ của SX; KD không; cấp 1 không nhận hồ sơ
  assert.ok(sx.call('sync.bootstrap', {}).data.records.RECORD.some((x) => x.record_id === id));
  assert.ok(!(kd.call('sync.bootstrap', {}).data.records.RECORD || []).some((x) => x.record_id === id));
  const look = userClient(env, 'SX1', 1, '583929', { depts: 'SX' });
  assert.equal((look.call('sync.bootstrap', {}).data.records.RECORD || []).length, 0);
  assert.equal(look.call('record.status', {}).code, 'FORBIDDEN');
  const ch = sx.call('sync.changes', { cursor: 0 }).data.changes.filter((x) => x.entity_type === 'RECORD');
  assert.ok(ch.length >= 2);
  // Nhật ký
  assert.ok(env.rows('AuditLogs').some((a) => a.action === 'record.submit' && a.entity_id === id));
  assertSameAsClient(env, owner);
});

test('nộp hồ sơ: kiểm quyền, biểu nhận hồ sơ, ngày, số trang, loại tệp', () => {
  const { env } = seeded();
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  const sx2b = userClient(env, 'SX2B', 2, '583931', { depts: 'SX' });
  const kd = userClient(env, 'KD2', 2, '583925', { depts: 'KD' });
  const look = userClient(env, 'KD1', 1, '583923', { depts: 'KD' });
  const tk = userClient(env, 'TK2', 2, '583922', { depts: 'ISO', secretary: true });
  const code = (r) => (r.errors && r.errors[0] ? r.errors[0].code : r.code);
  assert.equal(submit(kd, env, 'BM-SX-02-01', '2026-11-10', '2026-11-10').r.code, 'FORBIDDEN');
  assert.equal(submit(look, env, 'BM-KD-01-04', '2026-11-10', '2026-11-10').r.code, 'FORBIDDEN');
  // Biểu in từ M&E: không nộp ở đây; biểu ○ chưa có, ✕ không áp dụng: không nộp
  assert.equal(code(submit(tk, env, 'BM-CĐ-03-03', '2026-11-10', '2026-11-10').r), 'RECORD_FROM_APP');
  assert.equal(code(submit(tk, env, 'BM-ISO-03-01', '2026-11-10', '2026-11-10').r), 'ITEM_NO_RECORD');
  assert.equal(code(submit(tk, env, 'BM-CĐ-01-05', '2026-11-10', '2026-11-10').r), 'ITEM_NO_RECORD');
  // Biểu ◐ đang soạn (sổ giấy đang dùng) và "Một phần M&E" vẫn nộp được
  assert.equal(submit(sx, env, 'BM-SX-02-03', '2026-11-10', '2026-11-10').r.ok, true);
  assert.equal(submit(tk, env, 'BM-CL-05-02', '2026-01-01', '2026-12-31').r.ok, true);
  assert.equal(code(submit(sx, env, 'BM-SX-02-01', '2026-11-10', '2026-11-01').r), 'RANGE_INVALID');
  assert.equal(code(submit(sx, env, 'BM-SX-02-01', '2025-01-01', '2026-02-10').r), 'RANGE_TOO_LONG');
  assert.equal(code(submit(sx, env, 'BM-SX-02-01', '2027-01-01', '2027-01-01').r), 'DATE_OUT_OF_RANGE');
  assert.equal(code(submit(sx, env, 'BM-SX-02-01', '2026-11-31', '2026-11-31').r), 'INVALID_DATE');
  assert.equal(code(submit(sx, env, 'BM-SX-02-01', '2026-11-10', '2026-11-10', { pages: 0 }).r), 'PAGES_INVALID');
  assert.equal(code(submit(sx, env, 'BM-SX-02-01', '2026-11-10', '2026-11-10', { pages: 31 }).r), 'PAGES_INVALID');
  // Tệp: loại theo việc, chữ ký byte, quyền người nộp
  const { id } = submit(sx, env, 'BM-SX-02-01', '2026-11-10', '2026-11-10');
  const up = (c, extra) => c.write('doc.upload', { document_id: uuid(), entity_type: 'RECORD', entity_id: id, kind: 'PHOTO', mime_type: 'image/jpeg', file_name: 'a.jpg', content_b64: fakeJpegB64(), ...extra });
  assert.equal(code(up(sx, { kind: 'PDF', mime_type: 'application/pdf', content_b64: fakePdfB64() })), 'INVALID_VALUE');
  assert.equal(code(up(sx, { mime_type: 'application/pdf' })), 'FILE_TYPE');
  assert.equal(code(up(sx, { content_b64: fakePdfB64() })), 'FILE_TYPE');
  assert.equal(up(sx, { kind: 'FILE', mime_type: 'application/pdf', file_name: 'so.pdf', content_b64: fakePdfB64() }).ok, true);
  assert.equal(up(sx2b).code, 'FORBIDDEN'); // nhân viên khác cùng bộ phận không gắn tệp vào hồ sơ của người khác
  assert.equal(up(tk).ok, true); // Thư ký ISO gắn được
  assert.equal(rec(env, id).files_json.length, 2);
  // record.submit qua hàng chờ: action PIN không vào hàng chờ
  const r = sx.call('sync.push', { op: { action: 'record.return', operation_id: uuid(), payload: { record_id: id, reason: 'x' } } });
  assert.equal(r.code, 'REAUTH_REQUIRED');
});

test('trả lại hồ sơ nộp sai: nhân viên FORBIDDEN trước khi hỏi PIN; trưởng bộ phận (PIN) trả lại kèm lý do → kỳ về chưa có; Thư ký ISO cấp 2 trả lại được', () => {
  const { env, owner } = seeded();
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  const head = userClient(env, 'SX3', 3, '583924', { depts: 'SX' });
  const clHead = userClient(env, 'CL3', 3, '583921', { depts: 'CL' });
  const tk = userClient(env, 'TK2', 2, '583922', { depts: 'ISO', secretary: true });
  const a = submit(sx, env, 'BM-SX-02-01', '2026-11-01', '2026-11-07');
  assert.equal(a.r.ok, true);
  assert.equal(cellMap(statusOf(sx, env, 'BM-SX-02-01'))['2026-11-03'], 'OK');
  const ev = () => rec(env, a.id).record_version;
  // Nhân viên (người nộp) không trả lại; trưởng bộ phận khác cũng không — chưa bị hỏi PIN
  assert.equal(sx.write('record.return', { record_id: a.id, reason: 'x' }, { expected_version: ev() }).code, 'FORBIDDEN');
  assert.equal(clHead.write('record.return', { record_id: a.id, reason: 'x' }, { expected_version: ev() }).code, 'FORBIDDEN');
  let r = head.write('record.return', { record_id: a.id, reason: 'x' }, { expected_version: ev() });
  assert.equal(r.code, 'REAUTH_REQUIRED');
  head.pin('583924');
  r = head.write('record.return', { record_id: a.id, reason: '' }, { expected_version: ev() });
  assert.equal(r.code, 'VALIDATION_ERROR');
  r = head.write('record.return', { record_id: a.id, reason: 'Ảnh mờ, chụp lại trang 2' }, { expected_version: ev() });
  assert.equal(r.ok, true, JSON.stringify(r));
  const row = rec(env, a.id);
  assert.equal(row.status, 'RETURNED');
  assert.equal(row.return_reason, 'Ảnh mờ, chụp lại trang 2');
  assert.equal(row.returned_by, env.rows('Users').find((u) => u.employee_code === 'SX3').user_id);
  // Kỳ về như chưa có
  const s = statusOf(sx, env, 'BM-SX-02-01');
  assert.equal(cellMap(s)['2026-11-03'], 'LATE');
  assert.equal(s.count, 0);
  // Trả lại lần nữa: trạng thái không cho (trước PIN)
  assert.equal(head.write('record.return', { record_id: a.id, reason: 'y' }, { expected_version: ev() }).errors[0].code, 'STATUS_INVALID');
  // Thư ký ISO (cấp 2) trả lại hồ sơ của bộ phận khác
  const b = submit(sx, env, 'BM-SX-02-01', '2026-11-08', '2026-11-08');
  tk.pin('583922');
  r = tk.write('record.return', { record_id: b.id, reason: 'Nộp nhầm biểu' }, { expected_version: rec(env, b.id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  // Xung đột phiên bản bản ghi
  const c = submit(sx, env, 'BM-SX-02-01', '2026-11-09', '2026-11-09');
  r = head.write('record.return', { record_id: c.id, reason: 'z' }, { expected_version: 99 });
  assert.equal(r.code, 'VERSION_CONFLICT');
  assertSameAsClient(env, owner);
});

test('bảng kỳ biểu tuần, tháng, năm; khi phát sinh không quá hạn; ngày bắt đầu tính (records_start_date, ban hành lại không lùi); in từ M&E không tính', () => {
  const { env, owner } = seeded();
  const kd = userClient(env, 'KD2', 2, '583925', { depts: 'KD' });
  const tk = userClient(env, 'TK4', 4, '583930', { secretary: true });
  // Tuần: nộp tuần 45 (02–08/11) → W45 ✓; W46 (hiện tại) –; W44 kết thúc 01/11 + 3 ngày < 11/11 → ! và là kỳ đến hạn xét
  assert.equal(submit(kd, env, 'BM-KD-01-04', '2026-11-02', '2026-11-08').r.ok, true);
  let s = statusOf(kd, env, 'BM-KD-01-04');
  let m = cellMap(s);
  assert.equal(s.type, 'WEEK');
  assert.equal(m['2026-W45'], 'OK');
  assert.equal(m['2026-W46'], 'DUE');
  assert.equal(m['2026-W44'], 'LATE');
  assert.equal(s.due_key, '2026-W44');
  assert.equal(s.overdue, true);
  // Biểu hằng tháng (Thư ký ISO đổi chu kỳ 31 ngày): nộp tháng 10 → không quá hạn
  owner.pin(OWNER_PIN);
  const cl = item(env, 'BM-CL-01-01');
  let r = owner.write('item.edit', { item_id: cl.item_id, period_days: 31 }, { expected_version: cl.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(submit(tk, env, 'BM-CL-01-01', '2026-10-01', '2026-10-31').r.ok, true);
  s = statusOf(tk, env, 'BM-CL-01-01');
  m = cellMap(s);
  assert.equal(s.type, 'MONTH');
  assert.equal(m['2026-10'], 'OK');
  assert.equal(m['2026-11'], 'DUE');
  assert.equal(m['2026-09'], 'LATE');
  assert.equal(m['2026-02'], 'LATE'); // ban hành 01/02/2026: tháng 02 trở đi tính
  assert.equal(m['2026-01'], 'NA'); // kết thúc trước ngày bắt đầu tính → không tính
  assert.equal(s.due_key, '2026-10');
  assert.equal(s.overdue, false);
  // Năm: ban hành 10/01/2026, chưa có hồ sơ → 2026 chưa tới hạn, các năm trước không tính, chưa có kỳ đến hạn xét
  s = statusOf(tk, env, 'BM-NS-01-02');
  assert.equal(s.type, 'YEAR');
  assert.equal(cellMap(s)['2026'], 'DUE');
  assert.equal(cellMap(s)['2025'], 'NA');
  assert.equal(s.due_key, '');
  assert.equal(s.overdue, false);
  // Khi phát sinh: không có kỳ, chỉ lần nộp gần nhất
  assert.equal(submit(tk, env, 'BM-ISO-02-01', '2026-11-03', '2026-11-03').r.ok, true);
  s = statusOf(tk, env, 'BM-ISO-02-01');
  assert.equal(s.type, 'EVENT');
  assert.deepEqual(s.cells, []);
  assert.equal(s.overdue, false);
  assert.equal(s.last_date, '2026-11-03');
  assert.equal(s.count, 1);
  // In từ M&E, chưa ban hành: không tính
  assert.equal(statusOf(tk, env, 'BM-CĐ-04-03').reason, 'NOT_ISSUED');
  const ce = item(env, 'BM-CĐ-04-03');
  env.g.dbReset_();
  env.g.systemWrite_([{ sheet: 'Items', mode: 'update', row: { ...ce, status: 'ISSUED', issued_at: '2026-01-01', issued_source: 'IMPORT', record_version: ce.record_version + 1 } }]);
  s = statusOf(tk, env, 'BM-CĐ-04-03');
  assert.equal(s.reason, 'FROM_APP');
  assert.ok(s.cells.every((x) => x.st === 'NA'));
  assert.equal(s.overdue, false);
  // Ngày bắt đầu tính cho biểu ● nhập từ Excel: 01/11/2026 → ngày trước đó không tính
  r = owner.write('settings.edit', { changes: { records_start_date: '2026-11-01' } });
  assert.equal(r.ok, true, JSON.stringify(r));
  env.g.cache_().remove('cfg:settings');
  s = statusOf(tk, env, 'BM-SX-01-01');
  m = cellMap(s);
  assert.equal(s.start, '2026-11-01');
  assert.equal(m['2026-10-31'], 'NA');
  assert.equal(m['2026-11-01'], 'LATE');
  assert.equal(m['2026-11-07'], 'LATE');
  assert.equal(m['2026-11-08'], 'DUE');
  // Ban hành lần 02 trong app: ngày bắt đầu tính giữ 01/11 (không lùi về ngày ban hành mới)
  const it = item(env, 'BM-SX-01-01');
  const vid = uuid();
  assert.equal(tk.write('version.save', { version_id: vid, item_id: it.item_id, change_summary_vi: 'Lần 2' }).ok, true);
  r = tk.write('doc.upload', { document_id: uuid(), entity_type: 'VERSION', entity_id: vid, kind: 'PDF', mime_type: 'application/pdf', file_name: 'a.pdf', content_b64: fakePdfB64() });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(tk.write('version.submit', { version_id: vid }, { expected_version: r.record_version }).ok, true);
  tk.pin('583930');
  const ver = () => env.rows('Versions').find((v) => v.version_id === vid).record_version;
  assert.equal(tk.write('version.approve', { version_id: vid }, { expected_version: ver() }).ok, true);
  assert.equal(tk.write('version.issue', { version_id: vid }, { expected_version: ver() }).ok, true);
  const it2 = item(env, 'BM-SX-01-01');
  assert.equal(it2.issued_at, '2026-11-11');
  assert.equal(it2.records_from, '2026-11-01');
  assert.equal(statusOf(tk, env, 'BM-SX-01-01').start, '2026-11-01');
  // Biểu ○ ban hành lần đầu trong app: bắt đầu tính từ hôm nay
  const n0 = item(env, 'BM-ISO-05-01');
  const v2 = uuid();
  assert.equal(tk.write('version.save', { version_id: v2, item_id: n0.item_id, change_summary_vi: 'Lần đầu' }).ok, true);
  r = tk.write('doc.upload', { document_id: uuid(), entity_type: 'VERSION', entity_id: v2, kind: 'PDF', mime_type: 'application/pdf', file_name: 'b.pdf', content_b64: fakePdfB64() });
  assert.equal(tk.write('version.submit', { version_id: v2 }, { expected_version: r.record_version }).ok, true);
  const ver2 = () => env.rows('Versions').find((v) => v.version_id === v2).record_version;
  assert.equal(tk.write('version.approve', { version_id: v2 }, { expected_version: ver2() }).ok, true);
  assert.equal(tk.write('version.issue', { version_id: v2 }, { expected_version: ver2() }).ok, true);
  assert.equal(item(env, 'BM-ISO-05-01').records_from, '2026-11-11');
  // Trạng thái hệ thống có dòng hồ sơ
  const h = env.g.healthRows_().find((x) => x.key === 'records');
  assert.ok(h && /Đã nộp \d+/.test(h.value), JSON.stringify(h));
  assertSameAsClient(env, owner);
});

test('record.status: bộ đệm theo phiên bản bảng — nộp xong thấy ngay; cấp 3 chỉ thấy bộ phận mình', () => {
  const { env } = seeded();
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  const head = userClient(env, 'CL3', 3, '583921', { depts: 'CL' });
  const before = statusOf(sx, env, 'BM-SX-02-01');
  assert.equal(cellMap(before)['2026-11-10'], 'DUE');
  assert.equal(submit(sx, env, 'BM-SX-02-01', '2026-11-10', '2026-11-10').r.ok, true);
  assert.equal(cellMap(statusOf(sx, env, 'BM-SX-02-01'))['2026-11-10'], 'OK');
  const cl = head.call('record.status', {});
  assert.equal(cl.ok, true);
  assert.ok(cl.data.items.length > 0);
  const its = env.rows('Items');
  assert.ok(cl.data.items.every((x) => { const it = its.find((y) => y.item_id === x.item_id); return it.dept_code === 'CL' || it.dept_code === 'ISO'; }));
  assert.equal(typeof cl.data.overdue_count, 'number');
});

test('máy chủ dán Code.gs 1c mà quên migrateSchema: đồng bộ vẫn chạy; hồ sơ từ hàng chờ tự thêm sheet Records rồi ghi', () => {
  const { env, owner } = seeded();
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  const biz = env.ssApp.openById(env.props.getProperty('BUSINESS_SPREADSHEET_ID'));
  biz.deleteSheet(biz.getSheetByName('Records'));
  env.g.dbReset_();
  env.g.withWriteLock_(() => { const st = env.g.readState_(); env.g.stateWrite_(st, { schema_version: ['STRING', '1.0.1'] }, 'TEST'); });
  env.g.cache_().remove('sys:state');
  const b = sx.call('sync.bootstrap', {});
  assert.equal(b.ok, true, JSON.stringify(b).slice(0, 300));
  assert.equal(b.data.records.RECORD, undefined);
  env.g.dbReset_();
  assert.equal(env.g.healthRows_().find((x) => x.key === 'records').status, 'WARN');
  const r = push(sx, 'record.submit', { record_id: uuid(), item_id: item(env, 'BM-SX-02-01').item_id, period_from: '2026-11-10', period_to: '2026-11-10', pages: 1 });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(biz.getSheetByName('Records'));
  assert.equal(env.rows('Records').length, 1);
  assert.equal(owner.call('record.status', {}).ok, true);
});
