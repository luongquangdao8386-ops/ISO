// Sản phẩm không phù hợp (Đợt 3, phiên 3c — người dùng chốt 13/11/2026 giữ phạm vi Cơ điện; trưởng bộ phận + cấp 4 quyết định, nhân nhượng /
// hủy bỏ chỉ cấp 4): lập phiếu NC-yymm-001, hạn quyết định, quyết định nhiều dòng (PIN, kiểm trước PIN), quyết định lại có lịch sử, đóng
// (kiểm tra lại, cần phiếu khắc phục), hủy, ảnh / tệp, phiếu khắc phục lập từ phiếu NC (nguồn NCR), đồng bộ theo phạm vi, Gmail NCR_DECIDE /
// NCR_DUE, báo cáo phiếu / biên bản / sổ, Trạng thái hệ thống, cập nhật từ bản 3b (chưa có sheet Ncrs, cột Capas.ncr_id).
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
const ncr = (env, id) => { env.g.dbReset_(); return env.rows('Ncrs').find((x) => x.ncr_id === id); };
const capa = (env, id) => { env.g.dbReset_(); return env.rows('Capas').find((x) => x.capa_id === id); };
const uidOf = (env, code) => env.rows('Users').find((u) => u.employee_code === code).user_id;
const fields = (r) => (r.errors || []).map((e) => e.field + ':' + e.code).sort();

/** Lập phiếu nhanh; trả ncr_id */
function newNcr(c, extra = {}) {
  const id = uuid();
  const r = c.write('ncr.save', {
    ncr_id: id, stage: 'PROCESS', dept_code: 'CĐ', found_date: '2026-11-11', product_text: 'Hộp giấy HG-120', lot_text: 'LSX 2611-07',
    qty_text: '500 tờ', ref_text: 'Máy in số 2', problem_vi: 'Lệch màu do trục mực máy in 2 bị mòn', contain_vi: 'Treo thẻ đỏ, để khu vực cách ly',
    hold_place: 'Kho cách ly số 1', ...extra
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  return id;
}
const decide = (c, env, id, extra = {}) => c.write('ncr.decide', {
  ncr_id: id, lines: [{ d: 'REWORK', qty: '300 tờ', note: 'In lại' }], need_capa: 'NO', ...extra
}, { expected_version: ncr(env, id).record_version });

test('lập phiếu: kiểm dữ liệu, phạm vi Cơ điện, quyền theo bộ phận / cấp, mã NC-2611-001, hạn quyết định, người phụ trách mặc định, dịch máy; sửa khi chờ quyết định', () => {
  const { env, owner } = seeded();
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const sx2 = userClient(env, 'SX2', 2, '583921', { depts: 'SX' });
  const cd1 = userClient(env, 'CD1', 1, '583922', { depts: 'CĐ' });
  let r = cd2.write('ncr.save', { ncr_id: uuid(), stage: 'XX', dept_code: 'SX', found_date: '2026-11-13' });
  assert.equal(r.code, 'VALIDATION_ERROR');
  assert.deepEqual(fields(r), ['dept_code:APP_SCOPE', 'found_date:DATE_FUTURE', 'problem:REQUIRED_ONE_LANGUAGE', 'product_text:REQUIRED', 'stage:INVALID_VALUE']);
  assert.equal(cd1.write('ncr.save', { ncr_id: uuid(), stage: 'PROCESS', dept_code: 'CĐ', found_date: '2026-11-11', product_text: 'x', problem_vi: 'x' }).code, 'FORBIDDEN');
  assert.equal(sx2.write('ncr.save', { ncr_id: uuid(), stage: 'PROCESS', dept_code: 'CĐ', found_date: '2026-11-11', product_text: 'x', problem_vi: 'x' }).code, 'FORBIDDEN');
  const id = newNcr(cd2, { severity: 'MAJOR' });
  let n = ncr(env, id);
  assert.equal(n.code, 'NC-2611-001');
  assert.equal(n.state, 'OPEN');
  assert.equal(n.decide_due, '2026-11-13', 'ngày phát hiện + ncr_decide_days (2)');
  assert.equal(n.owner_user_id, uidOf(env, 'CD2'));
  assert.ok(n.problem_zh && n.contain_zh, 'dịch máy mô tả, cách ly');
  assert.equal(n.severity, 'MAJOR');
  // Sửa: đổi ngày phát hiện → hạn quyết định tính lại; người ngoài bộ phận cấp 2 không sửa được; cấp 1 không thấy phiếu (đồng bộ)
  r = cd2.write('ncr.save', { ncr_id: id, found_date: '2026-11-12', qty_text: '520 tờ' }, { expected_version: n.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  n = ncr(env, id);
  assert.equal(n.decide_due, '2026-11-14');
  assert.equal(n.qty_text, '520 tờ');
  assert.equal(sx2.write('ncr.save', { ncr_id: id, qty_text: '1' }, { expected_version: n.record_version }).code, 'FORBIDDEN');
  const seen = (c) => (c.call('sync.bootstrap', {}).data.records.NCR || []).map((x) => x.ncr_id);
  assert.deepEqual(seen(cd2), [id]);
  assert.deepEqual(seen(sx2), []);
  assert.deepEqual(seen(cd1), [], 'cấp 1 Tra cứu không thấy phiếu');
  assert.deepEqual(seen(owner), [id]);
  // Ảnh: người lập gắn được, người ngoài bộ phận không; tải về theo quyền xem phiếu
  r = cd2.write('doc.upload', { document_id: uuid(), entity_type: 'NCR', entity_id: id, kind: 'PHOTO', mime_type: 'image/jpeg', file_name: 'hang-loi.jpg', content_b64: fakeJpegB64() });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(sx2.write('doc.upload', { document_id: uuid(), entity_type: 'NCR', entity_id: id, kind: 'PHOTO', mime_type: 'image/jpeg', file_name: 'x.jpg', content_b64: fakeJpegB64() }).code, 'FORBIDDEN');
  const doc = ncr(env, id).files_json[0];
  assert.equal(doc.file_name, 'hang-loi.jpg');
  assert.equal(owner.call('doc.get', { document_id: doc.document_id }).ok, true);
  assert.equal(sx2.call('doc.get', { document_id: doc.document_id }).code, 'FORBIDDEN');
});

test('quyết định xử lý: trưởng bộ phận / cấp 4 (PIN), không tự quyết định, nhân nhượng / hủy bỏ chỉ cấp 4 (báo trước PIN), nhiều dòng, quyết định lại có lịch sử; đóng phiếu (kiểm tra lại, PIN); hủy phiếu', () => {
  const { env, owner } = seeded();
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const head = userClient(env, 'CD3', 3, '583923', { depts: 'CĐ' });
  const sx3 = userClient(env, 'SX3', 3, '583924', { depts: 'SX' });
  const id = newNcr(cd2);
  // Cấp 2 (người lập) không quyết định; cấp 3 bộ phận khác không; cấp 3 trong bộ phận chưa nhập PIN → REAUTH_REQUIRED
  assert.equal(decide(cd2, env, id).code, 'FORBIDDEN');
  assert.equal(decide(sx3, env, id).code, 'FORBIDDEN');
  assert.equal(decide(head, env, id).code, 'REAUTH_REQUIRED');
  // Trưởng bộ phận chọn hủy bỏ / nhân nhượng → báo NCR_TOP_ONLY trước khi hỏi PIN (chưa nhập PIN vẫn báo lỗi dữ liệu)
  let r = decide(head, env, id, { lines: [{ d: 'SCRAP', qty: '200 tờ' }] });
  assert.equal(r.code, 'VALIDATION_ERROR');
  assert.deepEqual(fields(r), ['lines:NCR_TOP_ONLY']);
  r = head.write('ncr.decide', { ncr_id: id, lines: [{ d: 'CONCESSION' }, { d: 'XX' }], need_capa: 'MAYBE', decision_date: '2026-11-10', exec_due: '2026-11-01' }, { expected_version: ncr(env, id).record_version });
  assert.deepEqual(fields(r), ['concession_text:REQUIRED', 'decision_date:NCR_DATE', 'exec_due:RANGE_INVALID', 'lines.1.d:INVALID_VALUE', 'lines:NCR_TOP_ONLY', 'need_capa:INVALID_VALUE']);
  assert.deepEqual(fields(head.write('ncr.decide', { ncr_id: id, lines: [], need_capa: 'NO' }, { expected_version: ncr(env, id).record_version })), ['lines:REQUIRED']);
  // Trưởng bộ phận quyết định làm lại 300 tờ (PIN): hạn thực hiện mặc định + 7 ngày; dịch máy chỉ đạo
  assert.equal(head.pin('583923').ok, true);
  r = decide(head, env, id, { note_vi: 'In lại trên máy 1' });
  assert.equal(r.ok, true, JSON.stringify(r));
  let n = ncr(env, id);
  assert.equal(n.state, 'DECIDED');
  assert.equal(n.decision_date, '2026-11-12');
  assert.equal(n.exec_due, '2026-11-19');
  assert.equal(n.decided_by, uidOf(env, 'CD3'));
  assert.deepEqual(n.decision_json, [{ d: 'REWORK', qty: '300 tờ', note: 'In lại' }]);
  assert.ok(n.decision_note_zh, 'dịch máy chỉ đạo');
  assert.equal(n.decision_history_json.length, 1);
  // Đang xử lý vẫn sửa được thông tin; cấp 4 (owner) quyết định lại: làm lại 300 + hủy 200 + cần phiếu khắc phục
  r = cd2.write('ncr.save', { ncr_id: id, cause_vi: 'Trục mực mòn' }, { expected_version: n.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  r = decide(owner, env, id, { lines: [{ d: 'REWORK', qty: '300 tờ' }, { d: 'SCRAP', qty: '200 tờ', note: 'Hư nặng' }], need_capa: 'YES', exec_due: '2026-11-25' });
  assert.equal(r.ok, true, JSON.stringify(r));
  n = ncr(env, id);
  assert.equal(n.decision_history_json.length, 2);
  assert.deepEqual(n.decision_history_json.map((h) => h.lines.map((l) => l.d).join('+')), ['REWORK', 'REWORK+SCRAP']);
  assert.equal(n.decision_note_vi, '', 'quyết định lại không ghi chỉ đạo thì bỏ chỉ đạo cũ');
  assert.equal(n.need_capa, 'YES');
  // Đóng: người không có quyền → FORBIDDEN; có làm lại mà chọn Không cần kiểm tra lại → NCR_RECHECK; cần phiếu khắc phục chưa lập → NCR_NEED_CAPA
  assert.equal(userClient(env, 'SX2', 2, '583921', { depts: 'SX' }).write('ncr.close', { ncr_id: id, recheck: 'PASS' }, { expected_version: n.record_version }).code, 'FORBIDDEN');
  r = cd2.write('ncr.close', { ncr_id: id, done_date: '2026-11-12', result_vi: 'x', recheck: 'NA' }, { expected_version: n.record_version });
  assert.deepEqual(fields(r), ['capa:NCR_NEED_CAPA', 'recheck:NCR_RECHECK']);
  // Lập phiếu khắc phục từ phiếu NC (nguồn NCR, gắn hai chiều); lập thêm phiếu thứ hai → NCR_HAS_CAPA
  const cid = uuid();
  r = cd2.write('capa.save', { capa_id: cid, ncr_id: id, source: 'EQUIPMENT', dept_code: 'CĐ', found_date: '2026-11-12', due_date: '2026-12-12', problem_vi: 'Lệch màu do trục mực mòn' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(capa(env, cid).source, 'NCR', 'phiếu từ NC luôn có nguồn NCR');
  assert.equal(capa(env, cid).ncr_id, id);
  assert.equal(ncr(env, id).capa_id, cid);
  assert.equal(ncr(env, id).record_version, n.record_version, 'gắn phiếu khắc phục không tăng record_version của phiếu NC');
  assert.deepEqual(fields(cd2.write('capa.save', { capa_id: uuid(), ncr_id: id, dept_code: 'CĐ', found_date: '2026-11-12', due_date: '2026-12-12', problem_vi: 'x' })), ['ncr_id:NCR_HAS_CAPA']);
  // Nguồn NCR không chọn tay, không đổi sang nguồn khác
  assert.deepEqual(fields(cd2.write('capa.save', { capa_id: uuid(), source: 'NCR', dept_code: 'CĐ', found_date: '2026-11-12', due_date: '2026-12-12', problem_vi: 'x' })), ['source:CAPA_NCR_ONLY']);
  assert.deepEqual(fields(cd2.write('capa.save', { capa_id: cid, source: 'EQUIPMENT' }, { expected_version: capa(env, cid).record_version })), ['source:CAPA_NCR_ONLY']);
  // Đóng: kiểm tra lại Đạt, chưa nhập PIN → REAUTH_REQUIRED; ngày xong trước ngày quyết định → NCR_DATE
  n = ncr(env, id);
  assert.equal(cd2.write('ncr.close', { ncr_id: id, done_date: '2026-11-12', result_vi: 'x', recheck: 'PASS' }, { expected_version: n.record_version }).code, 'REAUTH_REQUIRED');
  assert.equal(cd2.pin('583920').ok, true);
  assert.deepEqual(fields(cd2.write('ncr.close', { ncr_id: id, done_date: '2026-11-11', recheck: 'PASS' }, { expected_version: n.record_version })), ['done_date:NCR_DATE', 'result:REQUIRED_ONE_LANGUAGE']);
  r = cd2.write('ncr.close', { ncr_id: id, done_date: '2026-11-12', result_vi: 'Đã in lại 300 tờ đạt, hủy 200 tờ có biên bản', recheck: 'PASS' }, { expected_version: n.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  n = ncr(env, id);
  assert.equal(n.state, 'CLOSED');
  assert.equal(n.closed_by, uidOf(env, 'CD2'));
  assert.ok(n.result_zh, 'dịch máy kết quả');
  // Đã đóng: không sửa, không quyết định, không gắn ảnh, không hủy
  assert.equal(cd2.write('ncr.save', { ncr_id: id, qty_text: '1' }, { expected_version: n.record_version }).errors[0].code, 'STATUS_INVALID');
  assert.equal(owner.write('ncr.cancel', { ncr_id: id, reason: 'x' }, { expected_version: n.record_version }).errors[0].code, 'STATUS_INVALID');
  assert.equal(cd2.write('doc.upload', { document_id: uuid(), entity_type: 'NCR', entity_id: id, kind: 'PHOTO', mime_type: 'image/jpeg', file_name: 'x.jpg', content_b64: fakeJpegB64() }).code, 'VALIDATION_ERROR');
  // Chỉ trả nhà cung cấp → đóng với Không cần kiểm tra lại
  const id2 = newNcr(cd2, { stage: 'INCOMING', product_text: 'Vòng bi 6205', party_name: 'Công ty Vòng bi XYZ', qty_text: '20 cái' });
  assert.equal(head.pin('583923').ok, true);
  assert.equal(decide(head, env, id2, { lines: [{ d: 'RETURN', qty: '20 cái' }] }).ok, true);
  r = cd2.write('ncr.close', { ncr_id: id2, done_date: '2026-11-12', result_vi: 'Đã trả 20 cái, NCC đổi hàng', recheck: 'NA' }, { expected_version: ncr(env, id2).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  // Hủy phiếu lập nhầm: người lập (PIN), lý do bắt buộc; người khác cấp 3 không phải người lập, không phải Thư ký → FORBIDDEN
  const id3 = newNcr(cd2, { product_text: 'Trùng' });
  assert.equal(head.write('ncr.cancel', { ncr_id: id3, reason: 'x' }, { expected_version: 1 }).code, 'FORBIDDEN');
  assert.equal(cd2.write('ncr.cancel', { ncr_id: id3 }, { expected_version: 1 }).code, 'VALIDATION_ERROR');
  r = cd2.write('ncr.cancel', { ncr_id: id3, reason: 'Trùng phiếu NC-2611-002' }, { expected_version: 1 });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(ncr(env, id3).state, 'CANCELLED');
  assert.equal(ncr(env, id3).code, 'NC-2611-003');
  // Cấp 4 lập phiếu tự quyết định được (admin_self_approval mặc định bật); tắt thì không
  const id4 = newNcr(owner, { product_text: 'Tự quyết' });
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  assert.equal(decide(owner, env, id4).ok, true);
  env.g.dbReset_();
  env.g.withWriteLock_(() => env.g.writeSetting_('admin_self_approval', false, 'TEST'));
  env.g.dbReset_();
  const id5 = newNcr(owner, { product_text: 'Không tự quyết' });
  assert.equal(decide(owner, env, id5).code, 'FORBIDDEN');
  // Nhật ký
  env.g.dbReset_();
  const acts = env.rows('AuditLogs').map((a) => a.action);
  ['ncr.save', 'ncr.decide', 'ncr.close', 'ncr.cancel'].forEach((x) => assert.ok(acts.includes(x), x));
});

test('Gmail: chờ quyết định → trưởng bộ phận (hạn quyết định), đang xử lý → người phụ trách (hạn thực hiện); mốc 7, 1, 0, quá hạn mỗi 7 ngày; xong thì thôi nhắc', () => {
  const { env, owner } = seeded();
  const g = env.g;
  const setEmail = (code, email) => {
    g.dbReset_();
    const u = g.readRows_('Users').find((x) => x.employee_code === code);
    g.withWriteLock_(() => g.writeCells_('Users', u.__row, { email, email_confirmed_at: g.isoVN_(new env.clock.Date()), email_confirmed_by: 'TEST' }));
    g.dbReset_();
  };
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const head = userClient(env, 'CD3', 3, '583923', { depts: 'CĐ' });
  setEmail('CD2', 'cd2@example.com');
  setEmail('CD3', 'cd3@example.com');
  // Trưởng bộ phận Cơ điện = CD3
  g.dbReset_();
  const d = g.readRows_('Depts').find((x) => x.dept_code === 'CĐ');
  g.withWriteLock_(() => g.writeCells_('Depts', d.__row, { head_user_id: uidOf(env, 'CD3') }));
  g.withWriteLock_(() => g.writeSetting_('gmail_enabled', true, 'TEST'));
  g.withWriteLock_(() => g.writeSetting_('app_base_url', 'https://example.test/ISO/', 'TEST'));
  g.dbReset_();
  const id = newNcr(cd2); // hạn quyết định 13/11 (còn 1 ngày)
  const run = () => { g.dbReset_(); g.sendDueMail(); g.dbReset_(); };
  const to = (e) => env.mail.sent.filter((m) => m.to === e);
  const stages = (kind) => env.rows('NotificationLogs').filter((x) => x.entity_id === id && x.kind === kind && x.status === 'SENT').map((x) => x.recipient_id + '|' + x.stage);
  run();
  assert.equal(to('cd3@example.com').length, 1);
  assert.match(to('cd3@example.com')[0].body, /Sản phẩm không phù hợp chờ quyết định xử lý/);
  assert.match(to('cd3@example.com')[0].body, /NC-2611-001 — Hộp giấy HG-120 — Lệch màu/);
  assert.match(to('cd3@example.com')[0].body, /https:\/\/example\.test\/ISO\/#\/ncr\//);
  assert.deepEqual(stages('NCR_DECIDE'), [uidOf(env, 'CD3') + '|OPEN:2026-11-13:D1']);
  assert.equal(to('cd2@example.com').length, 0);
  // Quyết định → nhắc người phụ trách theo hạn thực hiện
  assert.equal(head.pin('583923').ok, true);
  assert.equal(decide(head, env, id, { exec_due: '2026-11-20' }).ok, true);
  env.clock.advance(DAY);
  run();
  assert.deepEqual(stages('NCR_DUE'), [uidOf(env, 'CD2') + '|DECIDED:2026-11-20:D7']);
  assert.match(to('cd2@example.com')[0].body, /Thực hiện quyết định xử lý · 执行处置决定: Làm lại · 返工 300 tờ/);
  env.clock.advance(9 * DAY); // 22/11: quá hạn 2 ngày
  run();
  assert.deepEqual(stages('NCR_DUE'), [uidOf(env, 'CD2') + '|DECIDED:2026-11-20:D7', uidOf(env, 'CD2') + '|DECIDED:2026-11-20:D0']);
  // Màn Gmail xem trước có loại mới; đóng phiếu → thôi nhắc
  const kinds = owner.call('mail.view', {}).data.preview.map((p) => p.kind);
  assert.ok(kinds.includes('NCR_DUE'), kinds.join(','));
  assert.equal(cd2.pin('583920').ok, true);
  assert.equal(cd2.write('ncr.close', { ncr_id: id, done_date: '2026-11-22', result_vi: 'Xong', recheck: 'PASS' }, { expected_version: ncr(env, id).record_version }).ok, true);
  env.clock.advance(7 * DAY);
  run();
  assert.equal(stages('NCR_DUE').length, 2, 'đã đóng: thôi nhắc');
});

test('báo cáo: phiếu (BM-CL-04-01, 3 ô ký), biên bản xử lý (BM-CL-04-04, lịch sử quyết định), sổ theo dõi (BM-CL-04-02) lọc tình trạng; phiếu khắc phục từ NC in số phiếu NC; PDF, tên tệp, đổi mã biểu; Trạng thái hệ thống', () => {
  const { env, owner } = seeded();
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const sx2 = userClient(env, 'SX2', 2, '583921', { depts: 'SX' });
  const id = newNcr(cd2, { party_name: 'Khách ABC', cause_vi: 'Trục mực mòn' });
  newNcr(cd2, { product_text: 'Vòng bi 6205', found_date: '2026-11-01' }); // quá hạn quyết định
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  assert.equal(decide(owner, env, id).ok, true);
  assert.equal(decide(owner, env, id, { lines: [{ d: 'REWORK', qty: '300 tờ' }, { d: 'CONCESSION', qty: '200 tờ' }], concession_text: 'Khách ABC đồng ý qua email 12/11', need_capa: 'YES' }).ok, true);
  const cid = uuid();
  assert.equal(cd2.write('capa.save', { capa_id: cid, ncr_id: id, dept_code: 'CĐ', found_date: '2026-11-11', due_date: '2026-12-11', problem_vi: 'Lệch màu' }).ok, true);
  // Một phiếu
  let r = cd2.call('report.run', { kind: 'NCR', filters: { ncr_id: id } });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.report.form_code, 'BM-CL-04-01');
  assert.equal(r.data.report.title_vi, 'Phiếu báo sản phẩm không phù hợp');
  const lay = r.data.layout;
  assert.equal(lay.sign.middle, 'Người quyết định xử lý · 处置决定人');
  const decT = lay.sections.find((s) => s.table);
  assert.deepEqual(decT.table.rows.map((x) => x[1]), ['300 tờ', '200 tờ']);
  assert.ok(lay.sections.some((s) => (s.kv || []).some((k) => /Căn cứ nhân nhượng/.test(k[0]) && /email 12\/11/.test(k[1]))));
  assert.ok(lay.sections.some((s) => (s.kv || []).some((k) => /KP-2611-001/.test(k[1]))), 'số phiếu khắc phục');
  assert.equal(sx2.call('report.run', { kind: 'NCR', filters: { ncr_id: id } }).code, 'FORBIDDEN');
  // Biên bản xử lý: lịch sử quyết định
  r = cd2.call('report.run', { kind: 'NCR', filters: { ncr_id: id, form: 'DECISION' } });
  assert.equal(r.data.report.form_code, 'BM-CL-04-04');
  assert.equal(r.data.report.title_vi, 'Biên bản xử lý sản phẩm không phù hợp');
  assert.ok(r.data.layout.sections.some((s) => /Các lần quyết định trước/.test(s.heading || '')));
  assert.deepEqual(fields(cd2.call('report.run', { kind: 'NCR', filters: { ncr_id: id, form: 'XX' } })), ['filters.form:INVALID_VALUE']);
  // Sổ: tất cả / quá hạn / chờ quyết định
  r = cd2.call('report.run', { kind: 'NCR', filters: { year: 2026, state: 'ALL' } });
  assert.equal(r.data.report.form_code, 'BM-CL-04-02');
  assert.equal(r.data.report.rows, 2);
  r = cd2.call('report.run', { kind: 'NCR', filters: { year: 2026, state: 'OVERDUE' } });
  assert.equal(r.data.report.rows, 1);
  assert.match(r.data.layout.sections[0].table.rows[0][3], /Vòng bi 6205/);
  assert.deepEqual(fields(cd2.call('report.run', { kind: 'NCR', filters: { year: 2026, state: 'XX' } })), ['filters.state:INVALID_VALUE']);
  // Phiếu khắc phục từ NC: in số phiếu NC
  r = cd2.call('report.run', { kind: 'CAPA', filters: { capa_id: cid } });
  assert.ok(r.data.layout.sections[0].kv.some((k) => /Từ phiếu sản phẩm không phù hợp/.test(k[0]) && /NC-2611-001/.test(k[1])));
  // Lưu PDF / Excel: tên tệp; PDF có 3 ô ký
  r = cd2.write('report.save', { report_run_id: uuid(), kind: 'NCR', filters: { ncr_id: id }, format: 'PDF' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.file_name, 'BC-2611-001_phieu-sp-khong-phu-hop_NC-2611-001.pdf');
  const pdf = Buffer.from(r.data.content_b64, 'base64').toString('utf8');
  for (const t of ['PHIẾU BÁO SẢN PHẨM KHÔNG PHÙ HỢP', 'BM-CL-04-01', 'Người lập phiếu', 'Người quyết định xử lý', 'Người xác nhận đóng', 'Nhân nhượng']) assert.ok(pdf.includes(t), t);
  r = cd2.write('report.save', { report_run_id: uuid(), kind: 'NCR', filters: { ncr_id: id, form: 'DECISION' }, format: 'XLSX' });
  assert.equal(r.data.file_name, 'BC-2611-002_bien-ban-xu-ly_NC-2611-001.xlsx');
  r = cd2.write('report.save', { report_run_id: uuid(), kind: 'NCR', filters: { year: 2026, state: 'ALL' }, format: 'XLSX' });
  assert.equal(r.data.file_name, 'BC-2611-003_so-theo-doi-sp-khong-phu-hop.xlsx');
  // Đổi mã biểu ở Cấu hình (viết hoa), hạn quyết định ngoài giới hạn bị chặn
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  assert.equal(owner.write('settings.edit', { changes: { ncr_form_code: 'bm-cđ-14-04' } }).ok, true);
  assert.equal(owner.write('settings.edit', { changes: { ncr_decide_days: 99 } }).code, 'VALIDATION_ERROR');
  assert.equal(owner.call('report.run', { kind: 'NCR', filters: { ncr_id: id } }).data.report.form_code, 'BM-CĐ-14-04');
  const st = cd2.call('sync.bootstrap', {}).data.settings;
  for (const k of ['ncr_form_code', 'ncr_log_form_code', 'ncr_decision_form_code', 'ncr_decide_days', 'ncr_exec_days']) assert.ok(k in st, k);
  // Trạng thái hệ thống
  const h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'ncr');
  assert.equal(h.status, 'OK');
  assert.match(h.value, /Chờ quyết định 1 · đang xử lý 1 · đã đóng 0 · quá hạn quyết định 1 · quá hạn xử lý 0 · cần phiếu khắc phục chưa lập 0/);
});

test('cập nhật từ bản 3b (chưa có sheet Ncrs, cột Capas.ncr_id): đăng nhập chạy, Trạng thái hệ thống cảnh báo; lập phiếu đầu tiên tự thêm; migrateSchema báo đúng dòng nhật ký', () => {
  const strip = (env) => {
    const g = env.g;
    g.dbReset_();
    const b = g.book_('B');
    b.deleteSheet(b.getSheetByName('Ncrs'));
    g.sh_('Capas').getRange(1, g.hdr_('Capas').idx.ncr_id + 1).setValue('');
    g.withWriteLock_(() => g.stateWrite_(g.readState_(), { schema_version: ['STRING', '1.0.9'] }, 'TEST'));
    g.cache_().removeAll(['sys:state']);
    g.dbReset_();
  };
  const { env, owner } = seeded();
  const g = env.g;
  strip(env);
  assert.equal(owner.call('sync.bootstrap', {}).ok, true);
  let h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'ncr');
  assert.equal(h.status, 'WARN');
  const id = newNcr(owner);
  g.dbReset_();
  assert.equal(g.sheetExists_('Ncrs'), true);
  assert.equal(ncr(env, id).code, 'NC-2611-001');
  assert.ok(g.hdr_('Capas').idx.ncr_id !== undefined);
  assert.equal(g.stateGet_(g.readState_(), 'schema_version', ''), g.SCHEMA_VERSION);
  h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'ncr');
  assert.equal(h.status, 'OK');
  // Máy chủ khác cùng trạng thái: chạy migrateSchema bằng tay → nhật ký
  const { env: env2 } = seeded();
  strip(env2);
  env2.logs.length = 0;
  env2.g.migrateSchema();
  assert.ok(env2.logs.some((l) => l === 'migrateSchema xong. Thêm: Capas(ncr_id); Ncrs. schema_version=1.0.12'), env2.logs.join('\n'));
  env2.g.dbReset_();
  const keys = env2.g.readRows_('Settings').map((x) => x.setting_key);
  for (const k of ['ncr_form_code', 'ncr_log_form_code', 'ncr_decision_form_code', 'ncr_decide_days', 'ncr_exec_days']) assert.ok(keys.includes(k), k);
});
