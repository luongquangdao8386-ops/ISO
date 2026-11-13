// Phát hiện đánh giá nội bộ, báo cáo đánh giá, đóng đợt (Đợt 4, phiên 4b — người dùng chốt 13/11/2026: NC lớn · NC nhỏ · Cần cải tiến; đóng
// đợt khi phiếu khắc phục đã đóng): ghi phát hiện từ câu Không phù hợp / Cần cải tiến hoặc nhập tay (người trong đoàn, khi đang đánh giá),
// đúng loại theo kết quả câu, mỗi câu một phát hiện; gửi báo cáo (Thư ký ISO, trưởng đoàn) khi đủ kết quả và phát hiện; lập phiếu khắc phục từ
// phát hiện (nguồn AUDIT, mỗi phát hiện một phiếu còn hiệu lực — nghiệm thu Đợt 4 "mỗi phát hiện tạo được phiếu khắc phục"); đóng đợt (Thư ký
// ISO, PIN, kiểm trước PIN) khi phiếu đã đóng; đồng bộ; báo cáo BM-ISO-03-04 + PDF; phiếu CAR ghi phát hiện gốc; Trạng thái hệ thống; cập
// nhật từ bản 4a.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, uuid, OWNER_PIN } from '../helpers.mjs';

const NOW = '2026-11-12T08:00:00+07:00'; // Thứ Năm
const DAY = 86400000;
const TK_PIN = '583926';

function seeded() {
  const env = freshServer({ now: NOW, scope: 'CĐ' });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  env.g.dbReset_();
  const tk = userClient(env, 'TK2', 2, TK_PIN, { depts: 'ISO', secretary: true });
  return { env, owner, tk };
}
const rowOf = (env, sheet, key, id) => { env.g.dbReset_(); return env.rows(sheet).find((x) => x[key] === id); };
const prog = (env, id) => rowOf(env, 'AuditPrograms', 'program_id', id);
const aud = (env, id) => rowOf(env, 'Audits', 'audit_id', id);
const chk = (env, id) => rowOf(env, 'AuditChecks', 'check_id', id);
const fnd = (env, id) => rowOf(env, 'AuditFindings', 'finding_id', id);
const capa = (env, id) => rowOf(env, 'Capas', 'capa_id', id);
const uidOf = (env, code) => env.rows('Users').find((u) => u.employee_code === code).user_id;
const fields = (r) => (r.errors || []).map((e) => e.field + ':' + e.code).sort();
const clauseIds = (env, std) => { env.g.dbReset_(); return env.rows('Clauses').filter((c) => c.std === std).map((c) => c.clause_id); };
const ISO = (k) => 'ISO9001|' + k;

/**
 * Đợt DG-26-01 (bộ phận CĐ) đang đánh giá hôm nay; trưởng đoàn AUDCL (Đánh giá viên bộ phận CL), thành viên AUDKV (Đánh giá viên KV);
 * 4 câu hỏi: q1 7.1.3, q2 7.1.5, q3 7.2, q4 chung. Trả {aid, q: [q1..q4], audCL, audKV}.
 */
function auditInProgress(env, owner, tk) {
  const audCL = userClient(env, 'AUDCL', 2, '583931', { depts: 'CL', auditor: true });
  const audKV = userClient(env, 'AUDKV', 2, '583933', { depts: 'KV', auditor: true });
  const pid = uuid();
  assert.equal(tk.write('iaudit.program.save', { program_id: pid, year: 2026 }).ok, true);
  const aid = uuid();
  let r = tk.write('iaudit.save', { audit_id: aid, program_id: pid, dept_code: 'CĐ', plan_month: '2026-11', title_vi: 'Bảo trì, sửa chữa thiết bị',
    clauses: clauseIds(env, 'ISO9001').concat(clauseIds(env, 'BRC')) });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(tk.write('iaudit.program.submit', { program_id: pid }, { expected_version: prog(env, pid).record_version }).ok, true);
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  assert.equal(owner.write('iaudit.program.approve', { program_id: pid }, { expected_version: prog(env, pid).record_version }).ok, true);
  r = tk.write('iaudit.save', { audit_id: aid, audit_date: '2026-11-12', auditee_text: 'Trưởng bộ phận Cơ điện',
    team: [{ u: uidOf(env, 'AUDCL'), r: 'L' }, { u: uidOf(env, 'AUDKV'), r: 'M' }] }, { expected_version: aud(env, aid).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  const q = [uuid(), uuid(), uuid(), uuid()];
  r = audCL.write('iaudit.check.add', { audit_id: aid, lines: [
    { check_id: q[0], clause_id: ISO('7.1.3'), question_vi: 'Thiết bị được bảo trì đúng kế hoạch?', question_zh: '设备是否按计划维护？' },
    { check_id: q[1], clause_id: ISO('7.1.5'), question_vi: 'Dụng cụ đo còn hạn hiệu chuẩn?', question_zh: '测量器具是否在校准有效期内？' },
    { check_id: q[2], clause_id: ISO('7.2'), question_vi: 'Thợ cơ điện được đào tạo?', question_zh: '机电人员是否经过培训？' },
    { check_id: q[3], clause_id: '', question_vi: 'Hồ sơ lưu đúng nơi?', question_zh: '记录是否按规定存放？' }] });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(audCL.write('iaudit.ready', { audit_id: aid }, { expected_version: aud(env, aid).record_version }).ok, true);
  assert.equal(audCL.write('iaudit.start', { audit_id: aid }, { expected_version: aud(env, aid).record_version }).ok, true);
  return { aid, q, audCL, audKV };
}
const rec = (c, env, id, p) => c.write('iaudit.check.record', { check_id: id, ...p }, { expected_version: chk(env, id).record_version });
const saveF = (c, env, id, p) => c.write('iaudit.finding.save', { finding_id: id, ...p }, { expected_version: fnd(env, id).record_version });
function addF(c, aid, p) {
  const id = uuid();
  const r = c.write('iaudit.finding.save', { finding_id: id, audit_id: aid, ...p });
  assert.equal(r.ok, true, JSON.stringify(r));
  return id;
}
const report = (c, env, aid, p) => c.write('iaudit.report', { audit_id: aid, ...p }, { expected_version: aud(env, aid).record_version });
function capaFrom(c, findingId, extra = {}) {
  const id = uuid();
  const r = c.write('capa.save', { capa_id: id, finding_id: findingId, source: 'OTHER', dept_code: 'CĐ', found_date: '2026-11-12', due_date: '2026-12-12',
    problem_vi: 'Sổ bảo trì tháng 10 thiếu 2 lần', ...extra });
  assert.equal(r.ok, true, JSON.stringify(r));
  return id;
}
/** Đưa phiếu khắc phục tới Đã đóng: nguyên nhân, một hành động xong, gửi kiểm tra hiệu lực, Thư ký ISO kiểm tra Có hiệu lực (PIN) */
function closeCapa(env, owner, verifier, verifierPin, id) {
  let r = owner.write('capa.save', { capa_id: id, cause_vi: 'Chưa có người thay khi thợ nghỉ phép' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  const act = uuid();
  r = owner.write('capa.action.save', { action_id: act, capa_id: id, content_vi: 'Phân công người thay', due_date: '2026-11-20' });
  assert.equal(r.ok, true, JSON.stringify(r));
  env.g.dbReset_();
  const a = env.rows('CapaActions').find((x) => x.action_id === act);
  r = owner.write('capa.action.done', { action_id: act, done_date: env.g.todayVN_(), result_vi: 'Đã phân công' }, { expected_version: a.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = owner.write('capa.complete', { capa_id: id, verify_due: env.g.todayVN_() }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(verifier.pin(verifierPin).ok, true);
  r = verifier.write('capa.verify', { capa_id: id, result: 'EFFECTIVE', note_vi: 'Kiểm tra sổ tháng 11 đủ' }, { expected_version: capa(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(capa(env, id).state, 'CLOSED');
}

test('phát hiện: từ câu Không phù hợp / Cần cải tiến (đúng loại, mỗi câu một phát hiện) hoặc nhập tay; mã DG-26-01/01; quyền người trong đoàn; câu có phát hiện không đổi kết quả sai loại; gửi báo cáo khi đủ kết quả và phát hiện; khóa sau báo cáo; đồng bộ', () => {
  const { env, owner, tk } = seeded();
  const { aid, q, audCL, audKV } = auditInProgress(env, owner, tk);
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const cd3 = userClient(env, 'CD3', 3, '583923', { depts: 'CĐ' });
  const sx2 = userClient(env, 'SX2', 2, '583921', { depts: 'SX' });
  assert.equal(rec(audKV, env, q[0], { result: 'NC', evidence_vi: 'Sổ bảo trì tháng 10 thiếu 2 lần bảo dưỡng máy nén khí' }).ok, true);
  assert.equal(rec(audKV, env, q[1], { result: 'OBS', evidence_vi: 'Nhãn hiệu chuẩn mờ, khó đọc' }).ok, true);
  assert.equal(rec(audKV, env, q[2], { result: 'C' }).ok, true);
  // Kiểm dữ liệu
  assert.deepEqual(fields(audKV.write('iaudit.finding.save', { finding_id: uuid(), audit_id: aid })), ['content:REQUIRED_ONE_LANGUAGE', 'ftype:REQUIRED']);
  assert.deepEqual(fields(audKV.write('iaudit.finding.save', { finding_id: uuid(), audit_id: aid, check_id: q[2], ftype: 'MINOR', content_vi: 'x' })), ['check_id:AUDIT_CHECK_NOT_NC']);
  assert.deepEqual(fields(audKV.write('iaudit.finding.save', { finding_id: uuid(), audit_id: aid, check_id: q[1], ftype: 'MINOR', content_vi: 'x' })), ['ftype:AUDIT_FINDING_TYPE']);
  assert.deepEqual(fields(audKV.write('iaudit.finding.save', { finding_id: uuid(), audit_id: aid, ftype: 'XX', clause_id: 'ISO9001|99', content_vi: 'x' })), ['clause_id:AUDIT_CLAUSE_NOT_IN', 'ftype:INVALID_VALUE']);
  // Quyền: chỉ người trong đoàn / Thư ký ISO; bộ phận được đánh giá, người ngoài không ghi được
  for (const c of [cd2, cd3]) assert.equal(c.write('iaudit.finding.save', { finding_id: uuid(), audit_id: aid, ftype: 'OBS', content_vi: 'x' }).code, 'FORBIDDEN');
  assert.equal(sx2.write('iaudit.finding.save', { finding_id: uuid(), audit_id: aid, ftype: 'OBS', content_vi: 'x' }).code, 'FORBIDDEN');
  // Ghi từ câu: điều khoản lấy từ câu; mã theo đợt
  const f1 = addF(audKV, aid, { check_id: q[0], ftype: 'MAJOR', content_vi: 'Chưa bảo trì máy nén khí đúng kế hoạch', evidence_vi: 'Sổ BM-CĐ-03-03 tháng 10' });
  let f = fnd(env, f1);
  assert.equal(f.code, 'DG-26-01/01');
  assert.equal(f.clause_id, ISO('7.1.3'));
  assert.equal(f.content_zh, '', 'không dịch máy nội dung phát hiện');
  const f2 = addF(audCL, aid, { check_id: q[1], ftype: 'OBS', content_vi: 'Nên thay nhãn hiệu chuẩn bền hơn' });
  assert.equal(fnd(env, f2).code, 'DG-26-01/02');
  assert.deepEqual(fields(audKV.write('iaudit.finding.save', { finding_id: uuid(), audit_id: aid, check_id: q[0], ftype: 'MINOR', content_vi: 'x' })), ['check_id:AUDIT_CHECK_HAS_FINDING']);
  // Câu có phát hiện: không đổi sang kết quả sai loại
  assert.deepEqual(fields(rec(audKV, env, q[0], { result: 'C' })), ['result:AUDIT_HAS_FINDING']);
  assert.deepEqual(fields(rec(audKV, env, q[0], { result: 'OBS' })), ['result:AUDIT_HAS_FINDING']);
  assert.equal(rec(audKV, env, q[0], { result: 'NC', evidence_vi: 'Sổ bảo trì tháng 10 thiếu 2 lần bảo dưỡng máy nén khí (đã xem)' }).ok, true);
  // Sửa phát hiện: MAJOR → MINOR; nhập tay một phát hiện rồi bỏ
  assert.equal(saveF(audCL, env, f1, { ftype: 'MINOR' }).ok, true);
  assert.equal(fnd(env, f1).ftype, 'MINOR');
  const fx = addF(audKV, aid, { ftype: 'OBS', content_vi: 'Ghi nhầm' });
  assert.equal(fnd(env, fx).code, 'DG-26-01/03');
  assert.equal(saveF(audKV, env, fx, { remove: true }).ok, true);
  assert.ok(fnd(env, fx).archived_at);
  // Báo cáo: chỉ Thư ký ISO / trưởng đoàn; đủ kết quả; câu NC / OBS có phát hiện; kết luận bắt buộc; ngày báo cáo trong khoảng
  assert.equal(report(audKV, env, aid, { summary_vi: 'x' }).code, 'FORBIDDEN');
  let r = report(audCL, env, aid, {});
  assert.deepEqual(fields(r), ['checks:AUDIT_UNRECORDED', 'summary:REQUIRED_ONE_LANGUAGE']);
  assert.match(r.errors.find((e) => e.code === 'AUDIT_UNRECORDED').message_vi, /\(1: 4\)/);
  assert.equal(rec(audKV, env, q[3], { result: 'NC', evidence_vi: 'Hồ sơ hiệu chuẩn để lẫn trong tủ vật tư' }).ok, true);
  r = report(audCL, env, aid, { summary_vi: 'Hệ thống phù hợp, cần khắc phục bảo trì', report_date: '2026-11-11' });
  assert.deepEqual(fields(r), ['findings:AUDIT_FINDING_MISSING', 'report_date:AUDIT_REPORT_DATE']);
  assert.match(r.errors.find((e) => e.code === 'AUDIT_FINDING_MISSING').message_vi, /\(1: 4\)/);
  const f3 = addF(audKV, aid, { check_id: q[3], ftype: 'MINOR', content_vi: 'Hồ sơ hiệu chuẩn không lưu đúng nơi', content_zh: '校准记录未按规定存放' });
  assert.equal(fnd(env, f3).code, 'DG-26-01/03', 'số bỏ trước được dùng lại khi chưa báo cáo');
  // Chưa báo cáo: không lập phiếu khắc phục từ phát hiện
  assert.deepEqual(fields(cd2.write('capa.save', { capa_id: uuid(), finding_id: f1, dept_code: 'CĐ', found_date: '2026-11-12', due_date: '2026-12-12', problem_vi: 'x' })),
    ['finding_id:AUDIT_NOT_REPORTED']);
  r = report(audCL, env, aid, { summary_vi: 'Hệ thống bảo trì cơ bản phù hợp; hai điểm không phù hợp nhỏ', strength_vi: 'Sổ giao ca đầy đủ' });
  assert.equal(r.ok, true, JSON.stringify(r));
  let a = aud(env, aid);
  assert.equal(a.state, 'REPORTED');
  assert.equal(a.report_date, '2026-11-12');
  assert.equal(a.reported_by, uidOf(env, 'AUDCL'));
  assert.equal(a.summary_zh, '', 'không dịch máy kết luận');
  // Sau báo cáo: phát hiện, checklist khóa
  assert.deepEqual(fields(saveF(audKV, env, f2, { content_vi: 'y' })), ['state:STATUS_INVALID']);
  assert.deepEqual(fields(rec(audKV, env, q[2], { result: 'OBS', evidence_vi: 'x' })), ['state:STATUS_INVALID']);
  // Rút báo cáo (chưa có phiếu khắc phục) rồi gửi lại
  assert.equal(report(audCL, env, aid, { undo: true }).ok, true);
  assert.equal(aud(env, aid).state, 'IN_PROGRESS');
  assert.equal(aud(env, aid).summary_vi, 'Hệ thống bảo trì cơ bản phù hợp; hai điểm không phù hợp nhỏ', 'giữ kết luận để gửi lại');
  assert.equal(report(tk, env, aid, {}).ok, true, 'Thư ký ISO gửi lại, kết luận cũ');
  // Đồng bộ: bộ phận được đánh giá (cấp 2 CĐ), đoàn thấy phát hiện; bộ phận khác không
  const ids = (c) => (c.call('sync.bootstrap', {}).data.records.AUD_FND || []).map((x) => x.finding_id).sort();
  const live = [f1, f2, f3].sort();
  assert.deepEqual(ids(cd2), live);
  assert.deepEqual(ids(audKV), live);
  assert.deepEqual(ids(sx2), []);
  // Bắt đầu lại đợt khi đã có phát hiện / kết quả: vẫn chặn như 4a
  a = aud(env, aid);
  assert.equal(a.state, 'REPORTED');
});

test('phiếu khắc phục từ phát hiện (nghiệm thu Đợt 4: mỗi phát hiện tạo được phiếu): nguồn AUDIT, gắn hai chiều không tăng phiên bản phát hiện; mỗi phát hiện một phiếu còn hiệu lực; không rút báo cáo; đóng đợt (Thư ký ISO, PIN, kiểm trước PIN) khi phiếu đã đóng', () => {
  const { env, owner, tk } = seeded();
  const { aid, q, audCL, audKV } = auditInProgress(env, owner, tk);
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const sx2 = userClient(env, 'SX2', 2, '583921', { depts: 'SX' });
  for (const [i, res] of [[0, 'NC'], [1, 'OBS'], [2, 'C'], [3, 'NC']]) assert.equal(rec(audKV, env, q[i], { result: res, evidence_vi: res === 'C' ? '' : 'Bằng chứng ' + i }).ok, true);
  const f1 = addF(audKV, aid, { check_id: q[0], ftype: 'MAJOR', content_vi: 'Chưa bảo trì máy nén khí đúng kế hoạch' });
  const f2 = addF(audKV, aid, { check_id: q[1], ftype: 'OBS', content_vi: 'Nên thay nhãn hiệu chuẩn' });
  const f3 = addF(audKV, aid, { check_id: q[3], ftype: 'MINOR', content_vi: 'Hồ sơ hiệu chuẩn để lẫn' });
  assert.equal(report(audCL, env, aid, { summary_vi: 'Kết luận' }).ok, true);
  // Lập phiếu: nguồn ép AUDIT, gắn hai chiều; phát hiện không tăng record_version
  const v1 = fnd(env, f1).record_version;
  assert.equal(sx2.write('capa.save', { capa_id: uuid(), finding_id: f1, dept_code: 'SX', found_date: '2026-11-12', due_date: '2026-12-12', problem_vi: 'x' }).code, 'VALIDATION_ERROR');
  const c1 = capaFrom(cd2, f1);
  let c = capa(env, c1);
  assert.equal(c.source, 'AUDIT');
  assert.equal(c.finding_id, f1);
  assert.equal(fnd(env, f1).capa_id, c1);
  assert.equal(fnd(env, f1).record_version, v1);
  assert.deepEqual(fields(cd2.write('capa.save', { capa_id: uuid(), finding_id: f1, dept_code: 'CĐ', found_date: '2026-11-12', due_date: '2026-12-12', problem_vi: 'x' })),
    ['finding_id:AUDIT_FINDING_HAS_CAPA']);
  assert.deepEqual(fields(cd2.write('capa.save', { capa_id: c1, source: 'OTHER' }, { expected_version: c.record_version })), ['source:CAPA_AUDIT_ONLY']);
  // Có phiếu khắc phục: không rút báo cáo
  assert.deepEqual(fields(report(audCL, env, aid, { undo: true })), ['findings:AUDIT_HAS_CAPA']);
  // Đóng đợt: chỉ Thư ký ISO; thiếu phiếu / phiếu chưa đóng → báo trước khi hỏi PIN
  assert.equal(audCL.write('iaudit.close', { audit_id: aid }, { expected_version: aud(env, aid).record_version }).code, 'FORBIDDEN');
  let r = tk.write('iaudit.close', { audit_id: aid }, { expected_version: aud(env, aid).record_version });
  assert.deepEqual(fields(r), ['findings:AUDIT_CAPA_OPEN', 'findings:AUDIT_FINDING_NO_CAPA']);
  assert.match(r.errors.find((e) => e.code === 'AUDIT_FINDING_NO_CAPA').message_vi, /DG-26-01\/03/);
  assert.match(r.errors.find((e) => e.code === 'AUDIT_CAPA_OPEN').message_vi, /DG-26-01\/01 → KP-2611-001/);
  // Phiếu đã hủy: phát hiện lập lại được phiếu mới
  assert.equal(tk.pin(TK_PIN).ok, true);
  assert.equal(tk.write('capa.cancel', { capa_id: c1, reason: 'Lập nhầm' }, { expected_version: capa(env, c1).record_version }).ok, true);
  const c1b = capaFrom(cd2, f1);
  assert.equal(fnd(env, f1).capa_id, c1b);
  // Mỗi phát hiện (kể cả cần cải tiến) lập được phiếu
  const c2 = capaFrom(cd2, f2, { problem_vi: 'Nhãn hiệu chuẩn mờ' });
  const c3 = capaFrom(tk, f3, { problem_vi: 'Hồ sơ hiệu chuẩn để lẫn' });
  assert.equal(capa(env, c3).source, 'AUDIT');
  // Đóng các phiếu: phiếu cần cải tiến còn mở vẫn chặn đóng đợt
  closeCapa(env, cd2, tk, TK_PIN, c1b);
  closeCapa(env, tk, owner, OWNER_PIN, c3); // phiếu Thư ký ISO lập: Quản trị kiểm tra hiệu lực
  r = tk.write('iaudit.close', { audit_id: aid }, { expected_version: aud(env, aid).record_version });
  assert.deepEqual(fields(r), ['findings:AUDIT_CAPA_OPEN']);
  assert.match(r.errors[0].message_vi, /DG-26-01\/02/);
  closeCapa(env, cd2, tk, TK_PIN, c2);
  // Đủ điều kiện: hỏi PIN (chưa nhập PIN trong 5 phút) → đóng
  env.clock.advance(10 * 60 * 1000);
  assert.equal(tk.write('iaudit.close', { audit_id: aid, note: 'Đã kiểm tra 3 phiếu' }, { expected_version: aud(env, aid).record_version }).code, 'REAUTH_REQUIRED');
  assert.equal(tk.pin(TK_PIN).ok, true);
  r = tk.write('iaudit.close', { audit_id: aid, note: 'Đã kiểm tra 3 phiếu' }, { expected_version: aud(env, aid).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  const a = aud(env, aid);
  assert.equal(a.state, 'CLOSED');
  assert.equal(a.closed_by, uidOf(env, 'TK2'));
  assert.equal(a.close_note, 'Đã kiểm tra 3 phiếu');
  assert.deepEqual(fields(tk.write('iaudit.close', { audit_id: aid }, { expected_version: a.record_version })), ['state:STATUS_INVALID']);
  // Đợt đã đóng: không lập phiếu khắc phục mới
  assert.equal(tk.write('capa.cancel', { capa_id: c2, reason: 'x' }, { expected_version: capa(env, c2).record_version }).code, 'VALIDATION_ERROR', 'phiếu đã đóng không hủy');
  // Trạng thái hệ thống
  const h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'iaudit');
  assert.match(h.value, / · đã báo cáo chờ đóng 0 · đã đóng 1 · phát hiện không phù hợp chưa có phiếu khắc phục 0$/);
  // Hủy chương trình có đợt đã đóng → chặn
  assert.equal(tk.write('iaudit.program.cancel', { program_id: a.program_id, reason: 'x' }, { expected_version: prog(env, a.program_id).record_version }).code, 'VALIDATION_ERROR');
});

test('báo cáo đánh giá BM-ISO-03-04: phát hiện, phiếu khắc phục, kết luận, 3 ô ký; PDF, tên tệp; phiếu khắc phục in ghi phát hiện gốc; Cấu hình; Trạng thái hệ thống trước khi đóng', () => {
  const { env, owner, tk } = seeded();
  const { aid, q, audCL, audKV } = auditInProgress(env, owner, tk);
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const sx2 = userClient(env, 'SX2', 2, '583921', { depts: 'SX' });
  for (const [i, res] of [[0, 'NC'], [1, 'OBS'], [2, 'C'], [3, 'NA']]) assert.equal(rec(audKV, env, q[i], { result: res, evidence_vi: res === 'NC' || res === 'OBS' ? 'Bằng chứng ' + i : '' }).ok, true);
  const f1 = addF(audKV, aid, { check_id: q[0], ftype: 'MAJOR', content_vi: 'Chưa bảo trì máy nén khí đúng kế hoạch', content_zh: '空压机未按计划维护', evidence_vi: 'Sổ tháng 10 thiếu 2 lần' });
  addF(audKV, aid, { check_id: q[1], ftype: 'OBS', content_vi: 'Nên thay nhãn hiệu chuẩn' });
  // Đang đánh giá: in được bản nháp báo cáo
  let r = tk.call('report.run', { kind: 'AUDIT', filters: { audit_id: aid, form: 'REPORT' } });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(report(audCL, env, aid, { summary_vi: 'Phù hợp một phần', strength_vi: 'Sổ giao ca đầy đủ' }).ok, true);
  const c1 = capaFrom(cd2, f1);
  r = tk.call('report.run', { kind: 'AUDIT', filters: { audit_id: aid, form: 'REPORT' } });
  assert.equal(r.data.report.form_code, 'BM-ISO-03-04');
  assert.equal(r.data.report.title_vi, 'Báo cáo đánh giá nội bộ');
  const lay = r.data.layout;
  const t = Object.fromEntries(lay.tiles.map((x) => [x.label, x.value]));
  assert.equal(t['Không phù hợp lớn · 严重不符合'], '1');
  assert.equal(t['Không phù hợp nhỏ · 一般不符合'], '0');
  assert.equal(t['Cần cải tiến · 改进建议'], '1');
  assert.equal(t['Phiếu khắc phục đã đóng · 已关闭的纠正措施单'], '0/1');
  const fs = lay.sections.find((s) => /Phát hiện đánh giá/.test(s.heading || ''));
  assert.match(fs.heading, /1 không phù hợp lớn · 0 không phù hợp nhỏ · 1 cần cải tiến/);
  assert.equal(fs.table.rows.length, 2);
  assert.equal(fs.table.rows[0][0], 'DG-26-01/01');
  assert.match(fs.table.rows[0][1], /Không phù hợp lớn/);
  assert.equal(fs.table.rows[0][2], '7.1.3');
  assert.match(fs.table.rows[0][3], /Chưa bảo trì máy nén khí đúng kế hoạch\n空压机未按计划维护\nBằng chứng, ghi chép · 证据、记录: Sổ tháng 10 thiếu 2 lần/);
  assert.equal(fs.table.rows[0][4], '1');
  assert.match(fs.table.rows[0][5], /^KP-2611-001\nĐang xử lý/);
  assert.equal(fs.table.tones[0][1], 'red');
  assert.equal(fs.table.rows[1][5], '', 'cần cải tiến chưa có phiếu: để trống');
  assert.ok(lay.sections.some((s) => (s.kv || []).some((x) => /Phù hợp một phần/.test(x[1]))));
  assert.ok(lay.sections.some((s) => (s.kv || []).some((x) => /Sổ giao ca đầy đủ/.test(x[1]))));
  const res = lay.sections.find((s) => /Kết quả checklist/.test(s.heading || ''));
  assert.deepEqual(res.kv.map((x) => x[1]), ['4', '1', '1', '1', '1']);
  assert.equal(lay.sign.prepared_name, 'AUDCL');
  assert.equal(lay.sign.middle_name, 'Trưởng bộ phận Cơ điện');
  assert.ok(lay.sign.middle, '3 ô ký');
  assert.equal(sx2.call('report.run', { kind: 'AUDIT', filters: { audit_id: aid, form: 'REPORT' } }).code, 'FORBIDDEN');
  // PDF, tên tệp
  r = tk.write('report.save', { report_run_id: uuid(), kind: 'AUDIT', filters: { audit_id: aid, form: 'REPORT' }, format: 'PDF' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.file_name, 'BC-2611-001_bao-cao-danh-gia_DG-26-01.pdf');
  const pdf = Buffer.from(r.data.content_b64, 'base64').toString('utf8');
  for (const s of ['BÁO CÁO ĐÁNH GIÁ NỘI BỘ', 'BM-ISO-03-04', 'DG-26-01/01', 'KP-2611-001', 'Kết luận đánh giá', 'Đại diện bộ phận được đánh giá']) assert.ok(pdf.includes(s), s);
  // Phiếu khắc phục in: ghi phát hiện gốc
  r = tk.call('report.run', { kind: 'CAPA', filters: { capa_id: c1 } });
  assert.equal(r.ok, true, JSON.stringify(r));
  const kv = r.data.layout.sections.flatMap((s) => s.kv || []);
  assert.ok(kv.some((x) => /Từ phát hiện đánh giá nội bộ/.test(x[0]) && /DG-26-01\/01 · Không phù hợp lớn/.test(x[1])), JSON.stringify(kv));
  // Cấu hình: mã biểu báo cáo
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  assert.equal(owner.write('settings.edit', { changes: { audit_report_form_code: 'bm-cđ-15-04' } }).ok, true);
  assert.equal(owner.call('report.run', { kind: 'AUDIT', filters: { audit_id: aid, form: 'REPORT' } }).data.report.form_code, 'BM-CĐ-15-04');
  assert.ok('audit_report_form_code' in tk.call('sync.bootstrap', {}).data.settings);
  // Trạng thái hệ thống
  const h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'iaudit');
  assert.match(h.value, / · đã báo cáo chờ đóng 1 · đã đóng 0 · phát hiện không phù hợp chưa có phiếu khắc phục 0$/);
});

test('cập nhật từ bản 4a (chưa có sheet AuditFindings, cột báo cáo của Audits, cột Capas.finding_id): đăng nhập chạy; ghi phát hiện đầu tiên tự thêm; migrateSchema báo đúng dòng nhật ký', () => {
  const AUD_COLS = ['report_date', 'strength_vi', 'strength_zh', 'summary_vi', 'summary_zh', 'reported_at', 'reported_by', 'closed_at', 'closed_by', 'close_note'];
  const strip = (env) => {
    const g = env.g;
    g.dbReset_();
    const b = g.book_('B');
    b.deleteSheet(b.getSheetByName('AuditFindings'));
    const ia = g.hdr_('Audits').idx;
    AUD_COLS.forEach((c) => g.sh_('Audits').getRange(1, ia[c] + 1).setValue(''));
    g.sh_('Capas').getRange(1, g.hdr_('Capas').idx.finding_id + 1).setValue('');
    g.withWriteLock_(() => g.stateWrite_(g.readState_(), { schema_version: ['STRING', '1.0.11'] }, 'TEST'));
    g.cache_().removeAll(['sys:state']);
    g.dbReset_();
  };
  const { env, owner, tk } = seeded();
  const g = env.g;
  const { aid, q, audKV } = auditInProgress(env, owner, tk);
  assert.equal(rec(audKV, env, q[0], { result: 'NC', evidence_vi: 'x' }).ok, true);
  strip(env);
  assert.equal(owner.call('sync.bootstrap', {}).ok, true);
  assert.equal(owner.call('system.status', {}).ok, true);
  const f1 = addF(audKV, aid, { check_id: q[0], ftype: 'MINOR', content_vi: 'Chưa bảo trì đúng kế hoạch' });
  g.dbReset_();
  assert.equal(g.sheetExists_('AuditFindings'), true);
  assert.equal(fnd(env, f1).code, 'DG-26-01/01');
  assert.equal(g.stateGet_(g.readState_(), 'schema_version', ''), g.SCHEMA_VERSION);
  // Máy chủ khác cùng trạng thái: chạy migrateSchema bằng tay → nhật ký
  const { env: env2 } = seeded();
  strip(env2);
  env2.logs.length = 0;
  env2.g.migrateSchema();
  const want = 'migrateSchema xong. Thêm: Capas(finding_id); Audits(' + AUD_COLS.join(',') + '); AuditFindings. schema_version=1.0.13';
  assert.ok(env2.logs.some((l) => l === want), env2.logs.join('\n'));
  env2.g.dbReset_();
  assert.ok(env2.g.readRows_('Settings').some((x) => x.setting_key === 'audit_report_form_code'));
});
