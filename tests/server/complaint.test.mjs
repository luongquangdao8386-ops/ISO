// Khiếu nại khách hàng (8D) và SCAR nhà cung cấp (Đợt 3, phiên 3b — người dùng chốt 12/11/2026 giữ phạm vi Cơ điện): phiếu khắc phục có nguồn
// COMPLAINT / SUPPLIER, đối tác bắt buộc, hạn phản hồi mặc định, phản hồi khách hàng / trả lời nhà cung cấp (capa.reply) bắt buộc trước khi đóng
// (báo trước khi hỏi PIN), khiếu nại không có cơ sở không cần hành động; quá hạn phản hồi; Gmail CAPA_REPLY; báo cáo phiếu tiếp nhận / 8D /
// SCAR (3 ô ký) / sổ theo loại; Trạng thái hệ thống; cập nhật từ bản 3a (thiếu cột) — tự thêm cột, migrateSchema báo đúng dòng nhật ký.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, uuid, OWNER_PIN } from '../helpers.mjs';

const NOW = '2026-11-12T08:00:00+07:00'; // Thứ Năm
const DAY = 86400000;
const NEW_COLS = ['party_name', 'party_contact', 'product_text', 'lot_text', 'qty_text', 'severity', 'complaint_valid', 'team_text', 'escape_vi', 'escape_zh',
  'sent_date', 'reply_due', 'reply_date', 'reply_note_vi', 'reply_note_zh', 'reply_at', 'reply_by'];

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
const uidOf = (env, code) => env.rows('Users').find((u) => u.employee_code === code).user_id;
const fields = (r) => (r.errors || []).map((e) => e.field + ':' + e.code).sort();

/** Tiếp nhận khiếu nại nhanh; trả capa_id */
function newComplaint(c, extra = {}) {
  const id = uuid();
  const r = c.write('capa.save', {
    capa_id: id, source: 'COMPLAINT', dept_code: 'CĐ', found_date: '2026-11-10', due_date: '2026-12-10', party_name: 'Công ty Bao bì ABC',
    party_contact: 'Chị Lan, 0901 234 567', product_text: 'Hộp giấy 3 lớp HG-120', lot_text: 'LOT 2611-07', qty_text: '2.000 hộp', severity: 'MAJOR',
    problem_vi: 'Hộp bị lệch màu in, khách trả lại 2.000 hộp', correction_vi: 'Cách ly lô hàng trong kho, kiểm 100% lô còn lại', team_text: 'QA Hùng, SX Minh, CĐ Tuấn',
    ...extra
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  return id;
}
function newScar(c, extra = {}) {
  const id = uuid();
  const r = c.write('capa.save', {
    capa_id: id, source: 'SUPPLIER', dept_code: 'CĐ', found_date: '2026-11-11', due_date: '2026-12-11', party_name: 'Công ty Vòng bi XYZ',
    party_contact: 'Anh Phong', product_text: 'Vòng bi 6205-2RS', lot_text: 'PO-2611-033', qty_text: '20 cái', problem_vi: 'Vòng bi kêu, rơ ngay khi lắp',
    correction_vi: 'Ngừng dùng lô vòng bi, đổi hàng', sent_date: '2026-11-11', ...extra
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  return id;
}
function addAct(c, capaId, extra = {}) {
  const id = uuid();
  const r = c.write('capa.action.save', { action_id: id, capa_id: capaId, content_vi: 'Hiệu chỉnh bộ cấp mực máy in 2', due_date: '2026-11-20', ...extra });
  assert.equal(r.ok, true, JSON.stringify(r));
  return id;
}
function doneAct(c, env, aid, date = '2026-11-12') {
  const r = c.write('capa.action.done', { action_id: aid, done_date: date, result_vi: 'Đã làm xong' }, { expected_version: act(env, aid).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
}

test('khiếu nại: kiểm dữ liệu (khách hàng bắt buộc, mức độ, đánh giá, hạn phản hồi), hạn phản hồi mặc định, dịch máy nguyên nhân lọt, phản hồi chỉ cho khiếu nại / SCAR', () => {
  const { env } = seeded();
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  let r = cd2.write('capa.save', { capa_id: uuid(), source: 'COMPLAINT', dept_code: 'CĐ', found_date: '2026-11-10', due_date: '2026-12-10', problem_vi: 'x',
    severity: 'XX', complaint_valid: 'MAYBE', reply_due: '2026-11-01', sent_date: '2026-11-13' });
  assert.equal(r.code, 'VALIDATION_ERROR');
  assert.deepEqual(fields(r), ['complaint_valid:INVALID_VALUE', 'party_name:REQUIRED', 'reply_due:RANGE_INVALID', 'sent_date:CAPA_DATE', 'severity:INVALID_VALUE']);
  const id = newComplaint(cd2, { escape_vi: 'Kiểm tra màu chỉ lấy mẫu đầu ca' });
  let c = capa(env, id);
  assert.equal(c.code, 'KP-2611-001');
  assert.equal(c.source, 'COMPLAINT');
  assert.equal(c.party_name, 'Công ty Bao bì ABC');
  assert.equal(c.severity, 'MAJOR');
  assert.equal(c.reply_due, '2026-11-17', 'mặc định ngày tiếp nhận + capa_reply_days (7)');
  assert.equal(c.team_text, 'QA Hùng, SX Minh, CĐ Tuấn');
  assert.ok(c.escape_zh, 'dịch máy nguyên nhân lọt');
  assert.equal(c.complaint_valid, '');
  // Sửa: đánh giá Có cơ sở, đổi hạn phản hồi; sửa chỉ nguyên nhân giữ nguyên các trường khiếu nại
  r = cd2.write('capa.save', { capa_id: id, complaint_valid: 'YES', reply_due: '2026-11-15' }, { expected_version: c.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = cd2.write('capa.save', { capa_id: id, cause_vi: 'Bộ cấp mực máy in 2 mòn' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  c = capa(env, id);
  assert.equal(c.complaint_valid, 'YES');
  assert.equal(c.reply_due, '2026-11-15');
  assert.equal(c.party_name, 'Công ty Bao bì ABC');
  assert.equal(c.cause_vi, 'Bộ cấp mực máy in 2 mòn');
  // Phiếu nội bộ: complaint_valid bị bỏ, không có phản hồi
  const id2 = uuid();
  r = cd2.write('capa.save', { capa_id: id2, source: 'EQUIPMENT', dept_code: 'CĐ', found_date: '2026-11-12', due_date: '2026-11-30', problem_vi: 'Rò khí', complaint_valid: 'YES' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(capa(env, id2).complaint_valid, '');
  assert.equal(capa(env, id2).reply_due, '');
  r = cd2.write('capa.reply', { capa_id: id2, reply_date: '2026-11-12', note_vi: 'x' }, { expected_version: capa(env, id2).record_version });
  assert.deepEqual(fields(r), ['source:CAPA_NOT_PARTY']);
  // Bộ phận ngoài phạm vi (KD) vẫn bị chặn với khiếu nại — giữ phạm vi Cơ điện
  r = cd2.write('capa.save', { capa_id: uuid(), source: 'COMPLAINT', dept_code: 'KD', found_date: '2026-11-10', due_date: '2026-12-10', party_name: 'A', problem_vi: 'x' });
  assert.deepEqual(fields(r), ['dept_code:APP_SCOPE']);
});

test('khiếu nại đi hết 8D: D3 → D4 (nguyên nhân + nguyên nhân lọt) → D5–D7 → gửi kiểm tra → đóng bị chặn khi chưa phản hồi khách hàng (báo trước PIN) → phản hồi → có hiệu lực → đóng', () => {
  const { env } = seeded();
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const tk = userClient(env, 'TK4', 4, '583925', { secretary: true });
  const id = newComplaint(cd2);
  const a1 = addAct(cd2, id);
  const a2 = addAct(cd2, id, { atype: 'PREVENTIVE', content_vi: 'Thêm bước đo màu bằng máy đo mỗi 500 tờ', due_date: '2026-11-25' });
  doneAct(cd2, env, a1);
  doneAct(cd2, env, a2);
  let r = cd2.write('capa.save', { capa_id: id, cause_vi: 'Bộ cấp mực mòn làm lượng mực không đều', escape_vi: 'Chỉ kiểm màu mẫu đầu ca' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = cd2.write('capa.complete', { capa_id: id, verify_due: '2026-12-12' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(capa(env, id).state, 'VERIFYING');
  // Đóng khi chưa phản hồi khách hàng: lỗi trước khi hỏi PIN (tk chưa nhập PIN)
  r = tk.write('capa.verify', { capa_id: id, result: 'EFFECTIVE', note_vi: 'Hai lô sau không lệch màu' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.code, 'VALIDATION_ERROR', JSON.stringify(r));
  assert.deepEqual(fields(r), ['reply:CAPA_NO_REPLY']);
  // Phản hồi: ngày trước ngày tiếp nhận / sau hôm nay, thiếu nội dung → lỗi
  r = cd2.write('capa.reply', { capa_id: id, reply_date: '2026-11-09', note_vi: 'x' }, { expected_version: capa(env, id).record_version });
  assert.deepEqual(fields(r), ['reply_date:CAPA_DATE']);
  r = cd2.write('capa.reply', { capa_id: id, reply_date: '2026-11-13', note_vi: 'x' }, { expected_version: capa(env, id).record_version });
  assert.deepEqual(fields(r), ['reply_date:CAPA_DATE']);
  r = cd2.write('capa.reply', { capa_id: id, reply_date: '2026-11-12' }, { expected_version: capa(env, id).record_version });
  assert.deepEqual(fields(r), ['reply_note:REQUIRED_ONE_LANGUAGE']);
  // Người ngoài bộ phận không ghi được
  const sx2 = userClient(env, 'SX2', 2, '583922', { depts: 'SX' });
  assert.equal(sx2.write('capa.reply', { capa_id: id, reply_date: '2026-11-12', note_vi: 'x' }, { expected_version: capa(env, id).record_version }).code, 'FORBIDDEN');
  r = cd2.write('capa.reply', { capa_id: id, reply_date: '2026-11-12', note_vi: 'Đã gửi báo cáo 8D, đổi 2.000 hộp' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  let c = capa(env, id);
  assert.equal(c.reply_date, '2026-11-12');
  assert.equal(c.reply_by, uidOf(env, 'CD2'));
  assert.ok(c.reply_note_zh, 'dịch máy nội dung phản hồi');
  // Bỏ phản hồi (ghi nhầm) rồi ghi lại
  r = cd2.write('capa.reply', { capa_id: id, undo: true }, { expected_version: c.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(capa(env, id).reply_date, '');
  assert.equal(capa(env, id).reply_note_vi, '');
  r = cd2.write('capa.reply', { capa_id: id, undo: true }, { expected_version: capa(env, id).record_version });
  assert.deepEqual(fields(r), ['state:STATUS_INVALID']);
  r = cd2.write('capa.reply', { capa_id: id, reply_date: '2026-11-12', note_vi: 'Đã gửi báo cáo 8D, đổi 2.000 hộp' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  // Kiểm tra hiệu lực (PIN): có hiệu lực → đóng
  assert.equal(tk.pin('583925').ok, true);
  r = tk.write('capa.verify', { capa_id: id, result: 'EFFECTIVE', note_vi: 'Hai lô giao sau không lệch màu, khách xác nhận' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  c = capa(env, id);
  assert.equal(c.state, 'CLOSED');
  // Phiếu đã đóng: không ghi / bỏ phản hồi
  assert.deepEqual(fields(cd2.write('capa.reply', { capa_id: id, undo: true }, { expected_version: c.record_version })), ['state:STATUS_INVALID']);
  // Nhật ký
  const logs = env.rows('AuditLogs').filter((l) => l.action === 'capa.reply');
  assert.equal(logs.length, 3);
});

test('khiếu nại không có cơ sở: không cần hành động, vẫn cần nguyên nhân (kết luận) và phản hồi; SCAR: ngày gửi, trả lời trước ngày gửi bị chặn, không hiệu lực được khi chưa trả lời', () => {
  const { env } = seeded();
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const tk = userClient(env, 'TK4', 4, '583925', { secretary: true });
  assert.equal(tk.pin('583925').ok, true);
  const id = newComplaint(cd2, { complaint_valid: 'NO' });
  let r = cd2.write('capa.complete', { capa_id: id }, { expected_version: capa(env, id).record_version });
  assert.deepEqual(fields(r), ['cause:CAPA_NO_CAUSE'], 'không đòi hành động');
  r = cd2.write('capa.save', { capa_id: id, cause_vi: 'Kết luận: khách bảo quản nơi ẩm, không phải lỗi in' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = cd2.write('capa.complete', { capa_id: id, verify_due: '2026-11-12' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = cd2.write('capa.reply', { capa_id: id, reply_date: '2026-11-12', note_vi: 'Đã gửi thư giải thích kèm kết quả kiểm lô lưu' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = tk.write('capa.verify', { capa_id: id, result: 'EFFECTIVE', note_vi: 'Đồng ý kết luận' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(capa(env, id).state, 'CLOSED');
  // Khiếu nại có cơ sở mà không có hành động → CAPA_NO_ACTION như phiếu thường
  const id2 = newComplaint(cd2, { complaint_valid: 'YES', cause_vi: 'x' });
  r = cd2.write('capa.complete', { capa_id: id2 }, { expected_version: capa(env, id2).record_version });
  assert.deepEqual(fields(r), ['actions:CAPA_NO_ACTION']);
  // SCAR
  const s = newScar(cd2);
  let c = capa(env, s);
  assert.equal(c.code, 'KP-2611-003');
  assert.equal(c.sent_date, '2026-11-11');
  assert.equal(c.reply_due, '2026-11-18');
  r = cd2.write('capa.save', { capa_id: s, sent_date: '2026-11-10' }, { expected_version: c.record_version });
  assert.deepEqual(fields(r), ['sent_date:CAPA_DATE'], 'ngày gửi trước ngày phát hiện');
  r = cd2.write('capa.save', { capa_id: s, sent_date: '2026-11-12' }, { expected_version: c.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = cd2.write('capa.reply', { capa_id: s, reply_date: '2026-11-11', note_vi: 'x' }, { expected_version: capa(env, s).record_version });
  assert.deepEqual(fields(r), ['reply_date:CAPA_DATE'], 'trả lời trước ngày gửi');
  const a = addAct(cd2, s, { content_vi: 'Nhà cung cấp đổi lô, kiểm 100% trước khi giao', owner_user_id: '', assignee_name: 'Công ty Vòng bi XYZ' });
  assert.equal(act(env, a).assignee_name, 'Công ty Vòng bi XYZ');
  doneAct(cd2, env, a);
  r = cd2.write('capa.save', { capa_id: s, cause_vi: 'Lô hàng lỗi phớt chặn bụi' }, { expected_version: capa(env, s).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = cd2.write('capa.complete', { capa_id: s }, { expected_version: capa(env, s).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  // Không hiệu lực vẫn ghi được khi chưa trả lời; đóng thì cần trả lời
  r = tk.write('capa.verify', { capa_id: s, result: 'NOT_EFFECTIVE', note_vi: 'Lô giao lại vẫn kêu' }, { expected_version: capa(env, s).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(capa(env, s).state, 'OPEN');
  doneAct(cd2, env, addAct(cd2, s, { content_vi: 'Đổi nhà sản xuất vòng bi', assignee_name: 'Công ty Vòng bi XYZ' }));
  r = cd2.write('capa.complete', { capa_id: s }, { expected_version: capa(env, s).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = tk.write('capa.verify', { capa_id: s, result: 'EFFECTIVE', note_vi: 'x' }, { expected_version: capa(env, s).record_version });
  assert.deepEqual(fields(r), ['reply:CAPA_NO_REPLY']);
  r = cd2.write('capa.reply', { capa_id: s, reply_date: '2026-11-12', note_vi: 'NCC trả lời: lỗi phớt, đổi nhà sản xuất' }, { expected_version: capa(env, s).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = tk.write('capa.verify', { capa_id: s, result: 'EFFECTIVE', note_vi: '3 lô sau đạt' }, { expected_version: capa(env, s).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(capa(env, s).state, 'CLOSED');
});

test('quá hạn phản hồi: sổ Quá hạn, Trạng thái hệ thống; Gmail CAPA_REPLY 7, 1, 0 ngày → người phụ trách phiếu, thôi nhắc khi đã phản hồi', () => {
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
  const late = newComplaint(cd2, { found_date: '2026-11-01', reply_due: '2026-11-05', party_name: 'Khách Trễ' });
  const soon = newScar(cd2, { reply_due: '2026-11-19' }); // còn 7 ngày
  // Quá hạn phản hồi → tab Quá hạn của sổ, Trạng thái hệ thống
  let r = cd2.call('report.run', { kind: 'CAPA', filters: { year: 2026, state: 'OVERDUE' } });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.data.report.data.depts[0].rows.map((x) => x.capa_id), [late]);
  const h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'capa');
  assert.equal(h.status, 'OK');
  assert.match(h.value, /khiếu nại đang mở 1 · SCAR đang mở 1 · quá hạn phản hồi 1/);
  // Gmail
  const run = () => { g.dbReset_(); g.sendDueMail(); g.dbReset_(); };
  const to = (e) => env.mail.sent.filter((m) => m.to === e);
  const stages = (eid) => env.rows('NotificationLogs').filter((n) => n.entity_id === eid && n.kind === 'CAPA_REPLY' && n.status === 'SENT').map((n) => n.stage);
  run();
  assert.equal(to('cd2@example.com').length, 1);
  const body = to('cd2@example.com')[0].body;
  assert.match(body, /Khiếu nại \/ SCAR đến hạn phản hồi/);
  assert.match(body, /Phản hồi khách hàng Khách Trễ/);
  assert.match(body, /Chờ nhà cung cấp Công ty Vòng bi XYZ trả lời SCAR/);
  assert.match(body, /quá hạn · 已逾期 7 ngày/);
  assert.deepEqual(stages(late), ['2026-11-05:OD1']);
  assert.deepEqual(stages(soon), ['2026-11-19:D7']);
  // Ghi phản hồi → thôi nhắc
  r = cd2.write('capa.reply', { capa_id: late, reply_date: '2026-11-12', note_vi: 'Đã gọi điện xin lỗi, gửi kết quả điều tra' }, { expected_version: capa(env, late).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  env.clock.advance(6 * DAY);
  run();
  assert.deepEqual(stages(soon), ['2026-11-19:D7', '2026-11-19:D1']);
  assert.deepEqual(stages(late), ['2026-11-05:OD1'], 'đã phản hồi: thôi nhắc');
  // Màn Gmail: loại mới trong xem trước
  const kinds = owner.call('mail.view', {}).data.preview.map((p) => p.kind);
  assert.ok(kinds.includes('CAPA_REPLY'), kinds.join(','));
  assert.ok(owner.call('mail.view', {}).data.preview.filter((p) => p.kind === 'CAPA_REPLY').every((p) => p.entity_id === soon));
});

test('báo cáo: phiếu tiếp nhận (BM-KD-02-01), 8D (BM-KD-02-02, D0–D8), SCAR (BM-MH-01-06, 3 ô ký), mẫu mặc định theo loại, mẫu sai loại bị chặn; sổ theo loại; PDF; tên tệp; đổi mã biểu', () => {
  const { env, owner } = seeded();
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const id = newComplaint(cd2, { ref_text: 'Email KH 05/11', escape_vi: 'Chỉ kiểm màu đầu ca', cause_vi: 'Bộ cấp mực mòn' });
  doneAct(cd2, env, addAct(cd2, id));
  addAct(cd2, id, { atype: 'PREVENTIVE', content_vi: 'Đo màu mỗi 500 tờ' });
  const s = newScar(cd2);
  const internal = uuid();
  assert.equal(cd2.write('capa.save', { capa_id: internal, source: 'EQUIPMENT', dept_code: 'CĐ', found_date: '2026-11-12', due_date: '2026-11-30', problem_vi: 'Rò khí' }).ok, true);
  // Mẫu mặc định: khiếu nại → 8D
  let r = cd2.call('report.run', { kind: 'CAPA', filters: { capa_id: id } });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.report.filters.form, 'D8');
  assert.equal(r.data.report.form_code, 'BM-KD-02-02');
  let lay = r.data.layout;
  assert.equal(lay.title_vi, 'Báo cáo 8D xử lý khiếu nại khách hàng');
  assert.deepEqual(lay.sections.map((x) => x.heading.split(' · ')[0].split('.')[0]), ['D0', 'D1', 'D2', 'D3', 'D4', 'D5–D6', 'D7', 'D8']);
  assert.ok(lay.sections[0].kv.some((k) => k[1] === 'Công ty Bao bì ABC'));
  assert.ok(lay.sections[1].kv.some((k) => k[1] === 'QA Hùng, SX Minh, CĐ Tuấn'));
  assert.ok(lay.sections[4].kv.some((k) => k[1].startsWith('Chỉ kiểm màu đầu ca')), 'nguyên nhân lọt ở D4');
  assert.equal(lay.sections[5].table.rows.length, 1, 'D5–D6: hành động khắc phục');
  assert.equal(lay.sections[6].table.rows.length, 1, 'D7: phòng ngừa');
  assert.ok(lay.sections[7].kv[0][1].startsWith('Chưa · hạn 17/11/2026'));
  assert.match(lay.sign.prepared, /Trưởng nhóm 8D/);
  assert.ok(lay.meta_left.some((m) => m[1] === 'Công ty Bao bì ABC'));
  assert.ok(r.data.report.tiles.some((t) => t.k === 'rpt.t.capa_reply.COMPLAINT'));
  // Phiếu tiếp nhận
  r = cd2.call('report.run', { kind: 'CAPA', filters: { capa_id: id, form: 'RECEIPT' } });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.report.form_code, 'BM-KD-02-01');
  assert.equal(r.data.layout.title_vi, 'Phiếu tiếp nhận khiếu nại khách hàng');
  assert.equal(r.data.layout.sections.length, 3);
  assert.ok(r.data.layout.sections[0].kv.some((k) => k[1] === 'Email KH 05/11'));
  // Phiếu khắc phục (CAR) của khiếu nại: thêm dòng khách hàng
  r = cd2.call('report.run', { kind: 'CAPA', filters: { capa_id: id, form: 'CAR' } });
  assert.equal(r.data.report.form_code, 'BM-CĐ-14-02');
  assert.ok(r.data.layout.sections[0].kv.some((k) => k[1] === 'Công ty Bao bì ABC'));
  // Mẫu sai loại
  assert.deepEqual(fields(cd2.call('report.run', { kind: 'CAPA', filters: { capa_id: id, form: 'SCAR' } })), ['filters.form:INVALID_VALUE']);
  assert.deepEqual(fields(cd2.call('report.run', { kind: 'CAPA', filters: { capa_id: internal, form: 'D8' } })), ['filters.form:INVALID_VALUE']);
  assert.deepEqual(fields(cd2.call('report.run', { kind: 'CAPA', filters: { capa_id: id, form: 'XX' } })), ['filters.form:INVALID_VALUE']);
  // SCAR: mẫu mặc định, 3 ô ký
  r = cd2.call('report.run', { kind: 'CAPA', filters: { capa_id: s } });
  assert.equal(r.data.report.filters.form, 'SCAR');
  assert.equal(r.data.report.form_code, 'BM-MH-01-06');
  lay = r.data.layout;
  assert.equal(lay.title_vi, 'Phiếu yêu cầu khắc phục nhà cung cấp (SCAR)');
  assert.equal(lay.sections.length, 5);
  assert.match(lay.sign.middle, /Đại diện nhà cung cấp/);
  assert.equal(lay.sign.middle_name, 'Anh Phong');
  assert.ok(lay.sections[1].kv.some((k) => /trả lời trước 18\/11\/2026/.test(k[1])));
  // Phiếu nội bộ: mặc định CAR, không có ô giữa
  r = cd2.call('report.run', { kind: 'CAPA', filters: { capa_id: internal } });
  assert.equal(r.data.report.filters.form, 'CAR');
  assert.equal(r.data.layout.sign.middle, '');
  // Sổ theo loại
  r = cd2.call('report.run', { kind: 'CAPA', filters: { year: 2026, state: 'ALL', source: 'COMPLAINT' } });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.layout.title_vi, 'Sổ theo dõi khiếu nại khách hàng');
  assert.equal(r.data.report.rows, 1);
  assert.equal(r.data.layout.sections[0].table.head.length, 11);
  assert.ok(r.data.layout.meta_left.some((m) => /Khiếu nại khách hàng/.test(m[1])));
  r = cd2.call('report.run', { kind: 'CAPA', filters: { year: 2026, state: 'ALL', source: 'SUPPLIER' } });
  assert.equal(r.data.layout.title_vi, 'Sổ theo dõi yêu cầu khắc phục nhà cung cấp (SCAR)');
  assert.equal(r.data.report.rows, 1);
  r = cd2.call('report.run', { kind: 'CAPA', filters: { year: 2026, state: 'ALL', source: 'INTERNAL' } });
  assert.equal(r.data.report.rows, 1);
  assert.equal(r.data.layout.title_vi, 'Sổ theo dõi hành động khắc phục');
  r = cd2.call('report.run', { kind: 'CAPA', filters: { year: 2026, state: 'ALL' } });
  assert.equal(r.data.report.rows, 3);
  assert.ok(r.data.layout.sections[0].table.rows.some((row) => /Công ty Bao bì ABC/.test(row[2])), 'sổ chung ghi tên khách hàng dưới nguồn');
  assert.deepEqual(fields(cd2.call('report.run', { kind: 'CAPA', filters: { year: 2026, source: 'XX' } })), ['filters.source:INVALID_VALUE']);
  // Lưu PDF: tên tệp theo mẫu; PDF SCAR có 3 ô ký
  r = cd2.write('report.save', { report_run_id: uuid(), kind: 'CAPA', filters: { capa_id: id, form: 'D8' }, format: 'PDF' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.file_name, 'BC-2611-001_bao-cao-8d_KP-2611-001.pdf');
  const pdf = Buffer.from(r.data.content_b64, 'base64').toString('utf8');
  for (const t of ['BÁO CÁO 8D', 'BM-KD-02-02', 'D4. Nguyên nhân gốc', 'Công ty Bao bì ABC']) assert.ok(pdf.includes(t), t);
  r = cd2.write('report.save', { report_run_id: uuid(), kind: 'CAPA', filters: { capa_id: id, form: 'RECEIPT' }, format: 'XLSX' });
  assert.equal(r.data.file_name, 'BC-2611-002_tiep-nhan-khieu-nai_KP-2611-001.xlsx');
  r = cd2.write('report.save', { report_run_id: uuid(), kind: 'CAPA', filters: { capa_id: s }, format: 'PDF' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.file_name, 'BC-2611-003_scar_KP-2611-002.pdf');
  const pdf2 = Buffer.from(r.data.content_b64, 'base64').toString('utf8');
  for (const t of ['Người lập SCAR', 'Đại diện nhà cung cấp', 'Người kiểm tra hiệu lực', 'BM-MH-01-06']) assert.ok(pdf2.includes(t), t);
  r = cd2.write('report.save', { report_run_id: uuid(), kind: 'CAPA', filters: { year: 2026, state: 'ALL', source: 'COMPLAINT' }, format: 'XLSX' });
  assert.equal(r.data.file_name, 'BC-2611-004_so-theo-doi-khieu-nai.xlsx');
  // Đổi mã biểu ở Cấu hình
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  r = owner.write('settings.edit', { changes: { d8_form_code: 'bm-cđ-14-03' } });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(owner.write('settings.edit', { changes: { scar_form_code: 'SCAR??' } }).code, 'VALIDATION_ERROR');
  assert.equal(owner.write('settings.edit', { changes: { capa_reply_days: 0 } }).code, 'VALIDATION_ERROR');
  r = owner.call('report.run', { kind: 'CAPA', filters: { capa_id: id } });
  assert.equal(r.data.report.form_code, 'BM-CĐ-14-03');
  // Cài đặt gửi xuống app
  const st = cd2.call('sync.bootstrap', {}).data.settings;
  for (const k of ['complaint_form_code', 'd8_form_code', 'scar_form_code', 'capa_reply_days']) assert.ok(k in st, k);
});

test('cập nhật từ bản 3a (Capas chưa có cột khiếu nại / SCAR): Trạng thái hệ thống cảnh báo; tiếp nhận khiếu nại đầu tiên tự thêm cột; migrateSchema báo đúng dòng nhật ký', () => {
  const strip = (env) => {
    const g = env.g;
    g.dbReset_();
    const idx = g.hdr_('Capas').idx;
    NEW_COLS.forEach((c) => g.sh_('Capas').getRange(1, idx[c] + 1).setValue(''));
    g.withWriteLock_(() => g.stateWrite_(g.readState_(), { schema_version: ['STRING', '1.0.8'] }, 'TEST'));
    g.cache_().remove('sys:state');
    g.dbReset_();
  };
  const { env, owner } = seeded();
  const g = env.g;
  strip(env);
  assert.equal(owner.call('sync.bootstrap', {}).ok, true);
  let h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'capa');
  assert.equal(h.status, 'WARN');
  const id = newComplaint(owner);
  g.dbReset_();
  assert.equal(capa(env, id).party_name, 'Công ty Bao bì ABC', 'cột mới đã được thêm và ghi');
  assert.equal(g.stateGet_(g.readState_(), 'schema_version', ''), g.SCHEMA_VERSION);
  h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'capa');
  assert.equal(h.status, 'OK');
  // Máy chủ khác cùng trạng thái: chạy migrateSchema bằng tay → nhật ký
  const { env: env2 } = seeded();
  strip(env2);
  env2.logs.length = 0;
  env2.g.migrateSchema();
  const want = 'migrateSchema xong. Thêm: Capas(' + NEW_COLS.join(',') + '). schema_version=1.0.13';
  assert.ok(env2.logs.some((l) => l === want), env2.logs.join('\n'));
  // Cài đặt mới có trong Settings
  env2.g.dbReset_();
  const keys = env2.g.readRows_('Settings').map((x) => x.setting_key);
  for (const k of ['complaint_form_code', 'd8_form_code', 'scar_form_code', 'capa_reply_days']) assert.ok(keys.includes(k), k);
});
