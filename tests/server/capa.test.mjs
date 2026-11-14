// Khắc phục (Đợt 3, phiên 3a — hướng A: phạm vi Cơ điện, phiếu theo BM-CĐ-14-02): lập phiếu KP-yymm-001, hành động (thêm, sửa, báo xong,
// mở lại, bỏ), nguyên nhân gốc bắt buộc trước khi gửi kiểm tra hiệu lực, kiểm tra hiệu lực (PIN, không phải người phụ trách phiếu) — không
// hiệu lực → thêm hành động bổ sung → có hiệu lực → đóng; hủy phiếu (PIN); quyền + phạm vi đồng bộ (người phụ trách hành động ở bộ phận khác
// thấy phiếu); ảnh / tệp; Gmail 7, 1, 0 ngày + quá hạn mỗi 7 ngày; báo cáo phiếu / sổ (PDF); Trạng thái hệ thống; quên migrateSchema.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, uuid, fakeJpegB64, OWNER_PIN } from '../helpers.mjs';

const NOW = '2026-11-12T08:00:00+07:00'; // Thứ Năm
const DAY = 86400000;

function seeded(scope = 'CĐ') {
  const env = freshServer({ now: NOW, scope });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  env.g.dbReset_();
  return { env, owner };
}
const capa = (env, id) => env.rows('Capas').find((x) => x.capa_id === id);
const act = (env, id) => env.rows('CapaActions').find((x) => x.action_id === id);
const item = (env, code) => env.rows('Items').find((x) => x.code === code);
const uidOf = (env, code) => env.rows('Users').find((u) => u.employee_code === code).user_id;
const fields = (r) => (r.errors || []).map((e) => e.field + ':' + e.code).sort();

/** Lập phiếu nhanh (người lập c); trả capa_id */
function newCapa(c, extra = {}) {
  const id = uuid();
  const r = c.write('capa.save', { capa_id: id, source: 'EQUIPMENT', dept_code: 'CĐ', found_date: '2026-11-12', due_date: '2026-12-12', problem_vi: 'Máy nén khí số 2 dừng do quá nhiệt', ...extra });
  assert.equal(r.ok, true, JSON.stringify(r));
  return id;
}
function addAct(c, env, capaId, extra = {}) {
  const id = uuid();
  const r = c.write('capa.action.save', { action_id: id, capa_id: capaId, content_vi: 'Vệ sinh két giải nhiệt', due_date: '2026-11-20', ...extra });
  assert.equal(r.ok, true, JSON.stringify(r));
  return id;
}

test('lập phiếu: kiểm dữ liệu, phạm vi Cơ điện (bộ phận ngoài phạm vi APP_SCOPE), quyền theo bộ phận / cấp, mã KP-2611-001, người phụ trách mặc định, dịch máy', () => {
  const { env } = seeded();
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const cd1 = userClient(env, 'CD1', 1, '583921', { depts: 'CĐ' });
  const sx2 = userClient(env, 'SX2', 2, '583922', { depts: 'SX' });
  // Thiếu nguồn, ngày phát hiện, hạn, mô tả
  let r = cd2.write('capa.save', { capa_id: uuid(), dept_code: 'CĐ' });
  assert.equal(r.code, 'VALIDATION_ERROR');
  assert.deepEqual(fields(r), ['due_date:REQUIRED', 'found_date:REQUIRED', 'problem:REQUIRED_ONE_LANGUAGE', 'source:REQUIRED']);
  // Ngày phát hiện sau hôm nay, hạn trước ngày phát hiện, nguồn lạ, bộ phận ngoài phạm vi
  r = cd2.write('capa.save', { capa_id: uuid(), source: 'XX', dept_code: 'SX', found_date: '2026-11-13', due_date: '2026-11-01', problem_vi: 'a' });
  assert.deepEqual(fields(r), ['dept_code:APP_SCOPE', 'due_date:RANGE_INVALID', 'found_date:DATE_FUTURE', 'source:INVALID_VALUE']);
  // Cấp 1 không có quyền (bảng quyền cấp 2), SX không lập cho CĐ
  assert.equal(cd1.write('capa.save', { capa_id: uuid() }).code, 'FORBIDDEN');
  r = sx2.write('capa.save', { capa_id: uuid(), source: 'EQUIPMENT', dept_code: 'CĐ', found_date: '2026-11-12', due_date: '2026-12-12', problem_vi: 'x' });
  assert.equal(r.code, 'FORBIDDEN');
  // Lập phiếu: mã KP-2611-001, Đang xử lý, người phụ trách = người lập, biểu liên quan, dịch máy
  const it = item(env, 'BM-CĐ-04-03');
  const id = newCapa(cd2, { item_id: it.item_id, ref_text: 'SC-2611-014', found_by_name: 'Tổ trưởng ca 2', title_vi: 'Máy nén khí quá nhiệt', correction_vi: 'Chuyển sang máy nén số 1' });
  let c = capa(env, id);
  assert.equal(c.code, 'KP-2611-001');
  assert.equal(c.state, 'OPEN');
  assert.equal(c.owner_user_id, uidOf(env, 'CD2'));
  assert.equal(c.item_id, it.item_id);
  assert.equal(c.ref_text, 'SC-2611-014');
  assert.ok(c.problem_zh && c.title_zh && c.correction_zh, 'dịch máy sang tiếng Trung');
  assert.equal(c.verify_count, 0);
  assert.equal(newCapa(cd2) && env.rows('Capas').length, 2);
  assert.deepEqual(env.rows('Capas').map((x) => x.code).sort(), ['KP-2611-001', 'KP-2611-002']);
  // Sửa phiếu: người lập được; SX không thấy phiếu → FORBIDDEN; expected_version sai → VERSION_CONFLICT
  r = cd2.write('capa.save', { capa_id: id, due_date: '2026-12-20' }, { expected_version: c.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  c = capa(env, id);
  assert.equal(c.due_date, '2026-12-20');
  assert.equal(c.code, 'KP-2611-001');
  assert.equal(sx2.write('capa.save', { capa_id: id, due_date: '2026-12-21' }, { expected_version: c.record_version }).code, 'FORBIDDEN');
  assert.equal(cd2.write('capa.save', { capa_id: id, due_date: '2026-12-21' }, { expected_version: 1 }).code, 'VERSION_CONFLICT');
  // Người phụ trách không tồn tại
  r = cd2.write('capa.save', { capa_id: id, owner_user_id: uuid() }, { expected_version: c.record_version });
  assert.deepEqual(fields(r), ['owner_user_id:NOT_FOUND']);
  // Trùng operation_id: không ghi lại
  const op = uuid();
  const id3 = uuid();
  const p3 = { capa_id: id3, source: 'AUDIT', dept_code: 'CĐ', found_date: '2026-11-10', due_date: '2026-11-30', problem_vi: 'Đánh giá phát hiện thiếu hồ sơ bảo trì' };
  assert.equal(cd2.write('capa.save', p3, { operation_id: op }).ok, true);
  assert.equal(cd2.write('capa.save', p3, { operation_id: op }).code, 'DUPLICATE_OPERATION');
  assert.equal(env.rows('Capas').length, 3);
});

test('luồng đủ: hành động → nguyên nhân gốc → gửi kiểm tra hiệu lực → không hiệu lực (PIN, không phải người phụ trách) → hành động bổ sung → có hiệu lực → đóng; ảnh / tệp; hủy phiếu', () => {
  const { env, owner } = seeded();
  const g = env.g;
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const head = userClient(env, 'CD3', 3, '583923', { depts: 'CĐ' });
  const sx2 = userClient(env, 'SX2', 2, '583922', { depts: 'SX' });
  const other = userClient(env, 'KV2', 2, '583924', { depts: 'KV' });
  const id = newCapa(cd2);
  // Hành động: hạn trước ngày phát hiện, người phụ trách lạ, thiếu nội dung
  let r = cd2.write('capa.action.save', { action_id: uuid(), capa_id: id, due_date: '2026-11-01', owner_user_id: uuid() });
  assert.deepEqual(fields(r), ['content:REQUIRED_ONE_LANGUAGE', 'due_date:RANGE_INVALID', 'owner_user_id:NOT_FOUND']);
  // Người không sửa được phiếu không thêm hành động
  assert.equal(sx2.write('capa.action.save', { action_id: uuid(), capa_id: id, content_vi: 'x', due_date: '2026-11-20' }).code, 'FORBIDDEN');
  const a1 = addAct(cd2, env, id); // phụ trách mặc định = người phụ trách phiếu
  const a2 = addAct(cd2, env, id, { atype: 'PREVENTIVE', content_vi: 'Lắp cảm biến nhiệt độ báo động', owner_user_id: uidOf(env, 'SX2'), due_date: '2026-11-25' });
  const a3 = addAct(cd2, env, id, { content_vi: 'Đổi lịch bảo trì', owner_user_id: '', assignee_name: 'Anh Tùng (thầu)' });
  assert.equal(act(env, a1).owner_user_id, uidOf(env, 'CD2'));
  assert.equal(act(env, a1).seq, 1);
  assert.equal(act(env, a2).seq, 2);
  assert.equal(act(env, a2).atype, 'PREVENTIVE');
  assert.equal(act(env, a3).owner_user_id, '');
  assert.equal(act(env, a3).assignee_name, 'Anh Tùng (thầu)');
  assert.ok(act(env, a2).content_zh, 'dịch máy nội dung hành động');
  // Phạm vi đồng bộ: SX2 phụ trách hành động 2 → thấy phiếu và mọi hành động; KV2 không thấy
  const bsx = sx2.call('sync.bootstrap', {}).data.records;
  assert.deepEqual((bsx.CAPA || []).map((x) => x.capa_id), [id]);
  assert.equal((bsx.CAPA_ACT || []).length, 3);
  const bkv = other.call('sync.bootstrap', {}).data.records;
  assert.equal((bkv.CAPA || []).length, 0);
  assert.equal((bkv.CAPA_ACT || []).length, 0);
  assert.equal(other.write('capa.action.done', { action_id: a2, done_date: '2026-11-12', result_vi: 'x' }, { expected_version: 1 }).code, 'FORBIDDEN');
  // Gửi kiểm tra hiệu lực khi chưa có nguyên nhân, còn hành động mở → lỗi
  r = cd2.write('capa.complete', { capa_id: id }, { expected_version: capa(env, id).record_version });
  assert.deepEqual(fields(r), ['actions:CAPA_ACTIONS_OPEN', 'cause:CAPA_NO_CAUSE']);
  // Báo xong: SX2 (người phụ trách hành động 2) báo xong; kết quả bắt buộc; ngày sau hôm nay bị từ chối
  r = sx2.write('capa.action.done', { action_id: a2, done_date: '2026-11-12' }, { expected_version: act(env, a2).record_version });
  assert.deepEqual(fields(r), ['result:REQUIRED_ONE_LANGUAGE']);
  r = sx2.write('capa.action.done', { action_id: a2, done_date: '2026-11-13', result_vi: 'x' }, { expected_version: act(env, a2).record_version });
  assert.deepEqual(fields(r), ['done_date:CAPA_DATE']);
  r = sx2.write('capa.action.done', { action_id: a2, done_date: '2026-11-12', result_vi: 'Đã lắp cảm biến, thử báo động đạt' }, { expected_version: act(env, a2).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(act(env, a2).state, 'DONE');
  assert.equal(act(env, a2).done_by, uidOf(env, 'SX2'));
  // SX2 không sửa / bỏ được hành động (chỉ người sửa được phiếu)
  assert.equal(sx2.write('capa.action.cancel', { action_id: a1, reason: 'x' }, { expected_version: act(env, a1).record_version }).code, 'FORBIDDEN');
  // Mở lại rồi báo xong lại
  r = sx2.write('capa.action.done', { action_id: a2, undo: true }, { expected_version: act(env, a2).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(act(env, a2).state, 'OPEN');
  assert.equal(act(env, a2).done_date, '');
  assert.equal(act(env, a2).result_vi, 'Đã lắp cảm biến, thử báo động đạt', 'giữ kết quả đã ghi');
  r = cd2.write('capa.action.done', { action_id: a2, done_date: '2026-11-12', result_vi: 'Đã lắp cảm biến, thử báo động đạt' }, { expected_version: act(env, a2).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = cd2.write('capa.action.done', { action_id: a1, done_date: '2026-11-12', result_vi: 'Đã vệ sinh két' }, { expected_version: act(env, a1).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  // Bỏ hành động 3 (lý do bắt buộc)
  assert.equal(cd2.write('capa.action.cancel', { action_id: a3 }, { expected_version: act(env, a3).record_version }).code, 'VALIDATION_ERROR');
  r = cd2.write('capa.action.cancel', { action_id: a3, reason: 'Gộp vào hành động 1' }, { expected_version: act(env, a3).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(act(env, a3).state, 'CANCELLED');
  // Còn thiếu nguyên nhân gốc
  r = cd2.write('capa.complete', { capa_id: id }, { expected_version: capa(env, id).record_version });
  assert.deepEqual(fields(r), ['cause:CAPA_NO_CAUSE']);
  r = cd2.write('capa.save', { capa_id: id, cause_vi: 'Két giải nhiệt bám bụi, chưa có trong lịch bảo trì tuần' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  // Ảnh bằng chứng: người phụ trách hành động gắn được; người ngoài không
  r = sx2.write('doc.upload', { document_id: uuid(), entity_type: 'CAPA', entity_id: id, kind: 'PHOTO', mime_type: 'image/jpeg', file_name: 'cam-bien.jpg', content_b64: fakeJpegB64(), page_no: 1 });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(capa(env, id).files_json.length, 1);
  assert.match(env.drive._files.get(env.rows('Documents').find((d) => d.entity_type === 'CAPA').drive_file_id).name, /^KP-2611-001_p1_/);
  assert.equal(other.write('doc.upload', { document_id: uuid(), entity_type: 'CAPA', entity_id: id, kind: 'PHOTO', mime_type: 'image/jpeg', file_name: 'x.jpg', content_b64: fakeJpegB64() }).code, 'FORBIDDEN');
  const docId = capa(env, id).files_json[0].document_id;
  assert.equal(head.call('doc.get', { document_id: docId }).ok, true);
  assert.equal(other.call('doc.get', { document_id: docId }).code, 'FORBIDDEN');
  // Gửi kiểm tra hiệu lực: hạn mặc định + 30 ngày
  r = cd2.write('capa.complete', { capa_id: id }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  let c = capa(env, id);
  assert.equal(c.state, 'VERIFYING');
  assert.equal(c.verify_due, '2026-12-12');
  assert.equal(c.completed_by, uidOf(env, 'CD2'));
  // Đang chờ kiểm tra: không sửa phiếu, không thêm hành động
  assert.equal(cd2.write('capa.save', { capa_id: id, due_date: '2026-12-30' }, { expected_version: c.record_version }).errors[0].code, 'STATUS_INVALID');
  assert.equal(cd2.write('capa.action.save', { action_id: uuid(), capa_id: id, content_vi: 'x', due_date: '2026-11-20' }).errors[0].code, 'STATUS_INVALID');
  // Kiểm tra hiệu lực: người phụ trách phiếu (cấp 2) và người ngoài → FORBIDDEN trước khi hỏi PIN; trưởng BP chưa nhập PIN → REAUTH_REQUIRED
  assert.equal(cd2.write('capa.verify', { capa_id: id, result: 'EFFECTIVE', note_vi: 'x' }, { expected_version: c.record_version }).code, 'FORBIDDEN');
  assert.equal(sx2.write('capa.verify', { capa_id: id, result: 'EFFECTIVE', note_vi: 'x' }, { expected_version: c.record_version }).code, 'FORBIDDEN');
  assert.equal(head.write('capa.verify', { capa_id: id, result: 'EFFECTIVE', note_vi: 'x' }, { expected_version: c.record_version }).code, 'REAUTH_REQUIRED');
  assert.equal(head.pin('583923').ok, true);
  r = head.write('capa.verify', { capa_id: id, result: 'X' }, { expected_version: c.record_version });
  assert.deepEqual(fields(r), ['result:INVALID_VALUE', 'verify_note:REQUIRED_ONE_LANGUAGE']);
  // 20 ngày sau: máy nén lại quá nhiệt → Không hiệu lực
  env.clock.advance(20 * DAY);
  assert.equal(head.pin('583923').ok, true);
  r = head.write('capa.verify', { capa_id: id, result: 'NOT_EFFECTIVE', note_vi: 'Ngày 30/11 máy nén số 2 lại báo quá nhiệt' }, { expected_version: c.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  c = capa(env, id);
  assert.equal(c.state, 'OPEN');
  assert.equal(c.verify_count, 1);
  assert.equal(c.verify_due, '');
  assert.equal(c.verify_result, 'NOT_EFFECTIVE');
  assert.equal(c.verify_history_json.length, 1);
  assert.equal(c.verify_history_json[0].date, '2026-12-02');
  assert.ok(c.verify_note_zh, 'dịch máy nhận xét');
  // Hành động bổ sung (lần kiểm tra 1) → xong → gửi kiểm tra lại → Có hiệu lực → Đã đóng
  const a4 = addAct(cd2, env, id, { content_vi: 'Thay quạt két giải nhiệt', due_date: '2026-12-05' });
  assert.equal(act(env, a4).round, 1);
  assert.equal(act(env, a4).seq, 4);
  r = cd2.write('capa.action.done', { action_id: a4, done_date: '2026-12-02', result_vi: 'Đã thay quạt' }, { expected_version: act(env, a4).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = cd2.write('capa.complete', { capa_id: id, verify_due: '2026-12-20' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(capa(env, id).verify_due, '2026-12-20');
  // Mở lại trước khi kiểm tra rồi gửi lại
  r = cd2.write('capa.complete', { capa_id: id, undo: true }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(capa(env, id).state, 'OPEN');
  r = cd2.write('capa.complete', { capa_id: id, verify_due: '2026-12-01' }, { expected_version: capa(env, id).record_version });
  assert.deepEqual(fields(r), ['verify_due:DATE_PAST']);
  r = cd2.write('capa.complete', { capa_id: id }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  // Thư ký ISO cấp 4 (owner) kiểm tra: Có hiệu lực → Đã đóng
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  r = owner.write('capa.verify', { capa_id: id, result: 'EFFECTIVE', verify_date: '2026-12-02', note_vi: 'Theo dõi 1 tuần, nhiệt độ ổn định' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  c = capa(env, id);
  assert.equal(c.state, 'CLOSED');
  assert.ok(c.closed_at);
  assert.equal(c.verify_history_json.length, 2);
  assert.deepEqual(c.verify_history_json.map((h) => h.result), ['NOT_EFFECTIVE', 'EFFECTIVE']);
  // Đã đóng: không gắn tệp, không hủy
  r = cd2.write('doc.upload', { document_id: uuid(), entity_type: 'CAPA', entity_id: id, kind: 'PHOTO', mime_type: 'image/jpeg', file_name: 'x.jpg', content_b64: fakeJpegB64() });
  assert.equal(r.code, 'VALIDATION_ERROR');
  assert.equal(owner.write('capa.cancel', { capa_id: id, reason: 'x' }, { expected_version: c.record_version }).errors[0].code, 'STATUS_INVALID');
  // Hủy phiếu lập nhầm: người lập (PIN), lý do bắt buộc; người khác cấp 2 không hủy được
  const id2 = newCapa(cd2, { found_date: '2026-12-02', due_date: '2026-12-30' });
  assert.equal(sx2.write('capa.cancel', { capa_id: id2, reason: 'x' }, { expected_version: 1 }).code, 'FORBIDDEN');
  assert.equal(cd2.write('capa.cancel', { capa_id: id2, reason: 'Trùng phiếu KP-2611-001' }, { expected_version: 1 }).code, 'REAUTH_REQUIRED');
  assert.equal(cd2.pin('583920').ok, true);
  assert.equal(cd2.write('capa.cancel', { capa_id: id2 }, { expected_version: 1 }).code, 'VALIDATION_ERROR');
  r = cd2.write('capa.cancel', { capa_id: id2, reason: 'Trùng phiếu KP-2611-001' }, { expected_version: 1 });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(capa(env, id2).state, 'CANCELLED');
  assert.equal(capa(env, id2).code, 'KP-2612-001', 'mã theo tháng lập phiếu');
  // Nhật ký
  g.dbReset_();
  const acts = env.rows('AuditLogs').map((a) => a.action);
  ['capa.save', 'capa.action.save', 'capa.action.done', 'capa.action.cancel', 'capa.complete', 'capa.verify', 'capa.cancel'].forEach((x) => assert.ok(acts.includes(x), x));
});

test('Gmail: hành động đến hạn 7, 1, 0 ngày → người phụ trách hành động; quá hạn mỗi 7 ngày; phiếu chưa có hành động → người phụ trách phiếu; hạn kiểm tra hiệu lực → Thư ký ISO', () => {
  const { env, owner } = seeded();
  const g = env.g;
  const setEmail = (code, email) => {
    g.dbReset_();
    const u = g.readRows_('Users').find((x) => x.employee_code === code);
    g.withWriteLock_(() => g.writeCells_('Users', u.__row, { email, email_confirmed_at: g.isoVN_(new env.clock.Date()), email_confirmed_by: 'TEST' }));
    g.dbReset_();
  };
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  userClient(env, 'TK4', 4, '583925', { secretary: true });
  setEmail('CD2', 'cd2@example.com');
  setEmail('TK4', 'tk4@example.com');
  g.withWriteLock_(() => g.writeSetting_('gmail_enabled', true, 'TEST'));
  g.dbReset_();
  const id = newCapa(cd2, { due_date: '2026-11-30' });
  const a1 = addAct(cd2, env, id, { due_date: '2026-11-19' }); // còn 7 ngày
  const id2 = newCapa(cd2, { due_date: '2026-11-13', problem_vi: 'Rò rỉ khí nén đường ống xưởng 3' }); // chưa có hành động, còn 1 ngày
  const run = () => { g.dbReset_(); g.sendDueMail(); g.dbReset_(); };
  const to = (e) => env.mail.sent.filter((m) => m.to === e);
  const stages = (eid) => env.rows('NotificationLogs').filter((n) => n.entity_id === eid && n.status === 'SENT').map((n) => n.stage);
  run();
  // CD2: hành động 1 (mốc D7) + phiếu 2 chưa có hành động (mốc D1) trong một thư
  assert.equal(to('cd2@example.com').length, 1);
  const body = to('cd2@example.com')[0].body;
  assert.match(body, /Hành động khắc phục đến hạn/);
  assert.match(body, /KP-2611-001/);
  assert.match(body, /Hành động 1 · 措施1: Vệ sinh két giải nhiệt/);
  assert.match(body, /KP-2611-002/);
  assert.match(body, /Phiếu chưa có hành động khắc phục/);
  assert.equal(to('tk4@example.com').length, 0);
  assert.deepEqual(stages(a1), ['2026-11-19:D7']);
  assert.deepEqual(stages(id2), ['2026-11-13:D1']);
  // Chạy lại cùng ngày: không gửi trùng
  run();
  assert.equal(to('cd2@example.com').length, 1);
  // 18/11 (còn 1 ngày) → D1; 19/11 (hôm nay) → D0; 22/11 (quá 3 ngày) không nhắc lại; 26/11 (quá 7 ngày) → OD1
  env.clock.advance(6 * DAY);
  run();
  assert.deepEqual(stages(a1), ['2026-11-19:D7', '2026-11-19:D1']);
  assert.match(to('cd2@example.com').slice(-1)[0].body, /còn · 剩余 1 ngày/);
  env.clock.advance(DAY);
  run();
  assert.deepEqual(stages(a1), ['2026-11-19:D7', '2026-11-19:D1', '2026-11-19:D0']);
  assert.match(to('cd2@example.com').slice(-1)[0].body, /hôm nay · 今天/);
  env.clock.advance(3 * DAY);
  run();
  assert.equal(stages(a1).length, 3, 'quá hạn 3 ngày: chưa nhắc lại');
  env.clock.advance(4 * DAY);
  run();
  assert.deepEqual(stages(a1), ['2026-11-19:D7', '2026-11-19:D1', '2026-11-19:D0', '2026-11-19:OD1']);
  assert.match(to('cd2@example.com').slice(-1)[0].body, /quá hạn · 已逾期 7 ngày/);
  assert.deepEqual(stages(id2), ['2026-11-13:D1', '2026-11-13:D0', '2026-11-13:OD1']);
  // Báo xong + nguyên nhân + gửi kiểm tra hiệu lực (hạn 7 ngày sau) → Thư ký ISO nhận nhắc mốc D7
  let r = cd2.write('capa.action.done', { action_id: a1, done_date: '2026-11-26', result_vi: 'Xong' }, { expected_version: act(env, a1).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = cd2.write('capa.save', { capa_id: id, cause_vi: 'Bụi' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = cd2.write('capa.complete', { capa_id: id, verify_due: '2026-12-03' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  run();
  assert.equal(to('tk4@example.com').length, 1);
  assert.match(to('tk4@example.com')[0].body, /Kiểm tra hiệu lực khắc phục đến hạn/);
  assert.match(to('tk4@example.com')[0].body, /Kiểm tra hiệu lực lần 1/);
  // Hàng chờ cũ của hành động 1 (đã xong) không còn được gửi: không có dòng QUEUED của CAPA_ACT
  assert.ok(!env.rows('NotificationLogs').some((n) => n.kind === 'CAPA_DUE' && n.entity_id === a1 && n.status === 'QUEUED'));
  // Xem trước trong màn Gmail có hai loại mới
  assert.equal(owner.call('mail.view', {}).ok, true);
  const kinds = owner.call('mail.view', {}).data.preview.map((p) => p.kind);
  assert.ok(kinds.includes('CAPA_VERIFY') && kinds.includes('CAPA_DUE'), kinds.join(','));
  // Phiếu hủy / đóng thôi nhắc
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  r = owner.write('capa.cancel', { capa_id: id2, reason: 'Lập nhầm' }, { expected_version: capa(env, id2).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  const kinds2 = owner.call('mail.view', {}).data.preview.filter((p) => p.entity_id === id2);
  assert.equal(kinds2.length, 0);
});

test('báo cáo: một phiếu (in ký, mã biểu BM-CĐ-14-02 theo cài đặt) và sổ theo dõi năm (lọc tình trạng, quá hạn); PDF; quyền; tên tệp', () => {
  const { env, owner } = seeded();
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const cd1 = userClient(env, 'CD1', 1, '583921', { depts: 'CĐ' });
  const id = newCapa(cd2, { title_vi: 'Máy nén khí quá nhiệt', cause_vi: 'Két bám bụi' });
  addAct(cd2, env, id, { due_date: '2026-11-13' });
  const id2 = newCapa(cd2, { found_date: '2026-11-01', due_date: '2026-11-05', source: 'AUDIT', problem_vi: 'Thiếu hồ sơ bảo trì tháng 10' });
  // Phiếu 1
  let r = cd2.call('report.run', { kind: 'CAPA', filters: { capa_id: id } });
  assert.equal(r.ok, true, JSON.stringify(r));
  let lay = r.data.layout;
  assert.equal(r.data.report.form_code, 'BM-CĐ-14-02');
  assert.equal(lay.title_vi, 'Phiếu yêu cầu hành động khắc phục');
  assert.ok(lay.meta_right.some((m) => m[1].startsWith('BM-CĐ-14-02')));
  assert.equal(lay.sections.length, 4);
  assert.ok(lay.sections[0].kv.some((k) => k[1] === 'KP-2611-001'));
  assert.ok(lay.sections[1].kv[0][1].startsWith('Két bám bụi'));
  assert.equal(lay.sections[2].table.rows.length, 1);
  assert.match(lay.sign.prepared, /Người phụ trách/);
  assert.equal(lay.sign.prepared_name, 'CD2');
  // Sổ theo dõi: 2 phiếu, phiếu 2 quá hạn
  r = cd2.call('report.run', { kind: 'CAPA', filters: { year: 2026, state: 'ALL' } });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.layout.title_vi, 'Sổ theo dõi hành động khắc phục');
  assert.equal(r.data.report.rows, 2);
  assert.equal(r.data.report.tiles.find((t) => t.k === 'rpt.t.capa_overdue').v, '1');
  r = cd2.call('report.run', { kind: 'CAPA', filters: { year: 2026, state: 'OVERDUE' } });
  assert.equal(r.data.report.rows, 1);
  assert.equal(r.data.report.data.depts[0].rows[0].capa_id, id2);
  assert.equal(cd2.call('report.run', { kind: 'CAPA', filters: { year: 2026, state: 'XX' } }).code, 'VALIDATION_ERROR');
  // Cấp 1 không xem báo cáo khắc phục
  assert.equal(cd1.call('report.run', { kind: 'CAPA', filters: { year: 2026 } }).code, 'FORBIDDEN');
  // Đổi mã biểu ở Cấu hình (mở rộng toàn công ty) → phiếu in BM-ISO-04-01
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  r = owner.write('settings.edit', { changes: { capa_form_code: 'bm-iso-04-01' } });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(owner.write('settings.edit', { changes: { capa_log_form_code: 'BM ISO??' } }).code, 'VALIDATION_ERROR');
  r = owner.call('report.run', { kind: 'CAPA', filters: { capa_id: id } });
  assert.equal(r.data.report.form_code, 'BM-ISO-04-01');
  // Lưu PDF: mã BC, tên tệp phiếu
  r = cd2.write('report.save', { report_run_id: uuid(), kind: 'CAPA', filters: { capa_id: id }, format: 'PDF' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.file_name, 'BC-2611-001_phieu-khac-phuc_KP-2611-001.pdf');
  r = cd2.write('report.save', { report_run_id: uuid(), kind: 'CAPA', filters: { year: 2026, state: 'ALL' }, format: 'XLSX' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.file_name, 'BC-2611-002_so-theo-doi-khac-phuc.xlsx');
});

test('Trạng thái hệ thống: dòng Khắc phục; quên migrateSchema: lập phiếu đầu tiên tự thêm sheet; migrateSchema báo đúng dòng nhật ký', () => {
  const { env, owner } = seeded();
  const g = env.g;
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  newCapa(cd2, { due_date: '2026-11-12' });
  let h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'capa');
  assert.equal(h.status, 'OK');
  assert.match(h.value, /Đang xử lý 1 · chờ kiểm tra hiệu lực 0 · đã đóng 0/);
  // Máy chủ 2e (chưa có Capas, CapaActions): đăng nhập vẫn chạy, lập phiếu đầu tiên tự thêm sheet
  const { env: env2, owner: own2 } = seeded();
  const g2 = env2.g;
  const b = g2.book_('B');
  b.deleteSheet(b.getSheetByName('Capas'));
  b.deleteSheet(b.getSheetByName('CapaActions'));
  g2.withWriteLock_(() => g2.stateWrite_(g2.readState_(), { schema_version: ['STRING', '1.0.7'] }, 'TEST'));
  g2.cache_().removeAll(['sys:state']);
  g2.dbReset_();
  assert.equal(own2.call('sync.bootstrap', {}).ok, true);
  h = own2.call('system.status', {}).data.checks.find((x) => x.key === 'capa');
  assert.equal(h.status, 'WARN');
  const r = own2.write('capa.save', { capa_id: uuid(), source: 'OTHER', dept_code: 'CĐ', found_date: '2026-11-12', due_date: '2026-11-30', problem_vi: 'x' });
  assert.equal(r.ok, true, JSON.stringify(r));
  g2.dbReset_();
  assert.equal(g2.sheetExists_('Capas'), true);
  assert.equal(g2.stateGet_(g2.readState_(), 'schema_version', ''), g2.SCHEMA_VERSION);
  // Chạy migrateSchema bằng tay trên máy chủ 2e → nhật ký
  const { env: env3 } = seeded();
  const g3 = env3.g;
  const b3 = g3.book_('B');
  b3.deleteSheet(b3.getSheetByName('Capas'));
  b3.deleteSheet(b3.getSheetByName('CapaActions'));
  g3.dbReset_();
  env3.logs.length = 0;
  g3.migrateSchema();
  assert.ok(env3.logs.some((l) => l === 'migrateSchema xong. Thêm: Capas; CapaActions. schema_version=1.0.14'), env3.logs.join('\n'));
  void g;
});
