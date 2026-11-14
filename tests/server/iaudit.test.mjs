// Đánh giá nội bộ (Đợt 4, phiên 4a — người dùng chốt 13/11/2026 giữ phạm vi Cơ điện): chương trình năm DG-yy (một chương trình mỗi năm, Thư
// ký ISO lập), đợt (thêm / sửa khi chương trình Nháp, phạm vi, tháng trong năm, điều khoản thuộc chuẩn), phủ điều khoản (giống js/coverage.js),
// gửi duyệt (phải phủ hết), duyệt (PIN, cấp mã DG-yy-01 theo tháng, không tự duyệt), trả lại, sửa chương trình đã duyệt (lần 02), hủy;
// kế hoạch đợt: đoàn đánh giá (cờ Đánh giá viên, không đánh giá bộ phận mình, người ngoài app), checklist (thêm nhiều câu, sửa, xóa), chốt kế
// hoạch, bắt đầu, ghi kết quả (bằng chứng không dịch máy); đồng bộ theo quyền; Gmail AUDIT_SOON; báo cáo chương trình / kế hoạch / checklist;
// Trạng thái hệ thống; cập nhật từ bản 3c (chưa có 3 sheet).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, uuid, OWNER_PIN } from '../helpers.mjs';
import { auditCoverage } from '../../js/coverage.js';

const NOW = '2026-11-12T08:00:00+07:00'; // Thứ Năm
const DAY = 86400000;

function seeded(scope = 'CĐ') {
  const env = freshServer({ now: NOW, scope });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  env.g.dbReset_();
  const tk = userClient(env, 'TK2', 2, '583926', { depts: 'ISO', secretary: true });
  return { env, owner, tk };
}
const rowOf = (env, sheet, key, id) => { env.g.dbReset_(); return env.rows(sheet).find((x) => x[key] === id); };
const prog = (env, id) => rowOf(env, 'AuditPrograms', 'program_id', id);
const aud = (env, id) => rowOf(env, 'Audits', 'audit_id', id);
const chk = (env, id) => rowOf(env, 'AuditChecks', 'check_id', id);
const uidOf = (env, code) => env.rows('Users').find((u) => u.employee_code === code).user_id;
const fields = (r) => (r.errors || []).map((e) => e.field + ':' + e.code).sort();
const clauseIds = (env, std) => { env.g.dbReset_(); return env.rows('Clauses').filter((c) => c.std === std).map((c) => c.clause_id); };
const ISO = (k) => 'ISO9001|' + k;
const BRC = (k) => 'BRC|' + k;

/** Chương trình ISO 9001 + BRCGS như trước khi có ISO 14001/45001/50001 (bỏ trống stds = mọi chuẩn — xem test riêng) */
function newProgram(c, extra = {}) {
  const id = uuid();
  const r = c.write('iaudit.program.save', { program_id: id, year: 2026, stds: ['ISO9001', 'BRC'], ...extra });
  assert.equal(r.ok, true, JSON.stringify(r));
  return id;
}
function addAudit(c, pid, extra = {}) {
  const id = uuid();
  const r = c.write('iaudit.save', { audit_id: id, program_id: pid, dept_code: 'CĐ', plan_month: '2026-03', title_vi: 'Bảo trì, sửa chữa thiết bị', clauses: [ISO('7.1.3')], ...extra });
  assert.equal(r.ok, true, JSON.stringify(r));
  return id;
}
const saveAudit = (c, env, id, p) => c.write('iaudit.save', { audit_id: id, ...p }, { expected_version: aud(env, id).record_version });
const submit = (c, env, pid, extra = {}) => c.write('iaudit.program.submit', { program_id: pid, ...extra }, { expected_version: prog(env, pid).record_version });
const approve = (c, env, pid, extra = {}) => c.write('iaudit.program.approve', { program_id: pid, ...extra }, { expected_version: prog(env, pid).record_version });

/** Chương trình 2026 đã duyệt: một đợt tháng 11 phủ mọi điều khoản mẫu; trả {pid, aid} */
function approvedProgram(env, owner, tk) {
  const pid = newProgram(tk);
  const aid = addAudit(tk, pid, { plan_month: '2026-11', clauses: clauseIds(env, 'ISO9001').concat(clauseIds(env, 'BRC')) });
  assert.equal(submit(tk, env, pid).ok, true);
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  const r = approve(owner, env, pid);
  assert.equal(r.ok, true, JSON.stringify(r));
  return { pid, aid };
}

test('chương trình năm: lập (Thư ký ISO), một chương trình mỗi năm; đợt kiểm dữ liệu, phạm vi; phủ điều khoản giống app; gửi duyệt phải phủ hết; Không áp dụng; duyệt (PIN) cấp mã DG-26-01 theo tháng; trả lại, rút lại; sửa chương trình đã duyệt → lần 02', () => {
  const { env, owner, tk } = seeded();
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const cd3 = userClient(env, 'CD3', 3, '583923', { depts: 'CĐ' });
  assert.equal(cd3.write('iaudit.program.save', { program_id: uuid(), year: 2026 }).code, 'FORBIDDEN');
  assert.deepEqual(fields(tk.write('iaudit.program.save', { program_id: uuid(), year: 2030 })), ['year:INVALID_VALUE']);
  assert.deepEqual(fields(tk.write('iaudit.program.save', { program_id: uuid(), year: 2026, stds: ['ISO9001', 'XX'] })), ['stds:INVALID_VALUE']);
  const pid = newProgram(tk, { objective_vi: 'Đánh giá sự phù hợp của hệ thống' });
  let p = prog(env, pid);
  assert.equal(p.code, 'DG-26');
  assert.equal(p.state, 'DRAFT');
  assert.equal(p.stds, 'ISO9001,BRC');
  assert.ok(p.objective_zh, 'dịch máy mục tiêu');
  assert.deepEqual(fields(tk.write('iaudit.program.save', { program_id: uuid(), year: 2026 })), ['year:AUDIT_YEAR_TAKEN']);
  // Đợt: kiểm dữ liệu, chỉ Thư ký ISO thêm
  let r = tk.write('iaudit.save', { audit_id: uuid(), program_id: pid, dept_code: 'SX', plan_month: '2027-01', clauses: ['XX'] });
  assert.deepEqual(fields(r), ['clauses.0:INVALID_VALUE', 'dept_code:APP_SCOPE', 'plan_month:AUDIT_NOT_IN_YEAR', 'title:REQUIRED_ONE_LANGUAGE']);
  assert.equal(cd3.write('iaudit.save', { audit_id: uuid(), program_id: pid, dept_code: 'CĐ', plan_month: '2026-03', title_vi: 'x', clauses: [ISO('7.1.3')] }).code, 'FORBIDDEN');
  const a1 = addAudit(tk, pid, { plan_month: '2026-03', clauses: [BRC('Dao và vật sắc'), ISO('7.1.5'), ISO('7.1.3')] });
  const a2 = addAudit(tk, pid, { plan_month: '2026-02', title_vi: 'Năng lực, đào tạo cơ điện', clauses: [ISO('7.2')] });
  assert.deepEqual(aud(env, a1).clauses_json, [ISO('7.1.3'), ISO('7.1.5'), BRC('Dao và vật sắc')], 'theo thứ tự điều khoản');
  assert.equal(aud(env, a1).code, '', 'chưa cấp mã khi Nháp');
  assert.ok(aud(env, a1).title_zh, 'dịch máy nội dung');
  // Phủ điều khoản: máy chủ = app (js/coverage.js)
  const covApp = () => {
    env.g.dbReset_();
    const rows = auditCoverage(env.rows('Clauses'), ['ISO9001', 'BRC'], env.rows('Audits').filter((x) => x.program_id === pid), prog(env, pid).na_json || []);
    return rows.map((x) => x.clause.clause_id + ':' + x.state);
  };
  const covSrv = () => {
    env.g.dbReset_();
    return JSON.parse(JSON.stringify(env.g.auditCoverageOf_(prog(env, pid)).map((x) => x.clause.clause_id + ':' + x.state)));
  };
  assert.deepEqual(covSrv(), covApp());
  assert.equal(covApp().filter((x) => x.endsWith(':AUDIT')).length, 4);
  // Gửi duyệt khi chưa phủ hết → lỗi kèm số điều khoản thiếu
  r = submit(tk, env, pid);
  assert.deepEqual(fields(r), ['coverage:AUDIT_NOT_COVERED']);
  assert.match(r.errors[0].message_vi, /\(13: /);
  // Không áp dụng: điều khoản lạ / thiếu lý do bị chặn; phần còn lại Không áp dụng
  assert.deepEqual(fields(tk.write('iaudit.program.save', { program_id: pid, na: [{ c: 'ISO9001|99', r: 'x' }, { c: ISO('8.4'), r: '' }] }, { expected_version: prog(env, pid).record_version })),
    ['na.0.c:INVALID_VALUE', 'na.1.r:REQUIRED']);
  const missing = covSrv().filter((x) => x.endsWith(':MISSING')).map((x) => x.split(':')[0]);
  r = tk.write('iaudit.program.save', { program_id: pid, na: missing.map((c) => ({ c, r: 'Ngoài phạm vi Cơ điện' })) }, { expected_version: prog(env, pid).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(covSrv(), covApp());
  assert.equal(covSrv().filter((x) => x.endsWith(':MISSING')).length, 0);
  // Bỏ chuẩn BRCGS khi còn đợt có chủ đề BRCGS → chặn
  assert.deepEqual(fields(tk.write('iaudit.program.save', { program_id: pid, stds: ['ISO9001'] }, { expected_version: prog(env, pid).record_version })), ['stds:AUDIT_STD_USED']);
  // Gửi duyệt → rút lại → gửi lại
  assert.equal(cd2.write('iaudit.program.submit', { program_id: pid }, { expected_version: prog(env, pid).record_version }).code, 'FORBIDDEN');
  assert.equal(submit(tk, env, pid).ok, true);
  assert.equal(prog(env, pid).state, 'IN_REVIEW');
  assert.equal(submit(tk, env, pid, { undo: true }).ok, true);
  assert.equal(prog(env, pid).state, 'DRAFT');
  assert.equal(submit(tk, env, pid).ok, true);
  // Chờ duyệt: không thêm / sửa phần chương trình
  assert.deepEqual(fields(tk.write('iaudit.save', { audit_id: uuid(), program_id: pid, dept_code: 'CĐ', plan_month: '2026-05', title_vi: 'x', clauses: [ISO('7.2')] })), ['program:AUDIT_PROG_LOCKED']);
  assert.deepEqual(fields(saveAudit(tk, env, a2, { plan_month: '2026-04' })), ['program:AUDIT_PROG_LOCKED']);
  assert.deepEqual(fields(tk.write('iaudit.program.save', { program_id: pid, na: [] }, { expected_version: prog(env, pid).record_version })), ['state:STATUS_INVALID']);
  // Duyệt: Thư ký cấp 2 không duyệt (cấp 4); Quản trị duyệt cần PIN; trả lại cần lý do
  assert.equal(approve(tk, env, pid).code, 'FORBIDDEN');
  assert.equal(approve(owner, env, pid).code, 'REAUTH_REQUIRED');
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  assert.deepEqual(fields(owner.write('iaudit.program.return', { program_id: pid, reason: '' }, { expected_version: prog(env, pid).record_version })), ['reason:REQUIRED']);
  assert.equal(owner.write('iaudit.program.return', { program_id: pid, reason: 'Thêm đợt tháng 6' }, { expected_version: prog(env, pid).record_version }).ok, true);
  p = prog(env, pid);
  assert.equal(p.state, 'DRAFT');
  assert.equal(p.return_reason, 'Thêm đợt tháng 6');
  assert.equal(submit(tk, env, pid).ok, true);
  assert.equal(prog(env, pid).return_reason, '');
  r = approve(owner, env, pid, { note: 'Đồng ý' });
  assert.equal(r.ok, true, JSON.stringify(r));
  p = prog(env, pid);
  assert.equal(p.state, 'APPROVED');
  assert.equal(p.rev, '01');
  assert.equal(p.approved_by, uidOf(env, 'NV-001'));
  assert.equal(aud(env, a2).code, 'DG-26-01', 'tháng 2 trước');
  assert.equal(aud(env, a1).code, 'DG-26-02');
  // Đã duyệt: kế hoạch đợt sửa được, phần chương trình bị khóa
  assert.deepEqual(fields(saveAudit(tk, env, a1, { clauses: [ISO('7.1.3')] })), ['program:AUDIT_PROG_LOCKED']);
  assert.equal(saveAudit(tk, env, a1, { place_text: 'Xưởng cơ điện' }).ok, true);
  // Sửa chương trình (PIN, lý do) → Nháp → thêm đợt → duyệt lần 02, đợt mới DG-26-03
  assert.equal(cd3.write('iaudit.program.reopen', { program_id: pid, reason: 'x' }, { expected_version: prog(env, pid).record_version }).code, 'FORBIDDEN');
  assert.equal(tk.pin('583926').ok, true);
  assert.equal(tk.write('iaudit.program.reopen', { program_id: pid, reason: 'Thêm đợt tháng 12' }, { expected_version: prog(env, pid).record_version }).ok, true);
  assert.equal(prog(env, pid).state, 'DRAFT');
  const a3 = addAudit(tk, pid, { plan_month: '2026-01', title_vi: 'Đợt bổ sung', clauses: [ISO('7.5')] });
  assert.equal(submit(tk, env, pid).ok, true);
  assert.equal(approve(owner, env, pid).ok, true);
  p = prog(env, pid);
  assert.equal(p.rev, '02');
  assert.equal(p.history_json.length, 2);
  assert.equal(p.history_json[1].reopen_reason, 'Thêm đợt tháng 12');
  assert.equal(aud(env, a3).code, 'DG-26-03', 'mã cũ giữ nguyên, đợt mới số tiếp');
  assert.equal(aud(env, a2).code, 'DG-26-01');
  // Không tự duyệt: Quản trị gửi duyệt rồi tự duyệt khi admin_self_approval tắt
  env.g.withWriteLock_(() => env.g.writeSetting_('admin_self_approval', false, 'TEST'));
  const p27 = newProgram(owner, { year: 2027 });
  addAudit(owner, p27, { plan_month: '2027-01', clauses: clauseIds(env, 'ISO9001').concat(clauseIds(env, 'BRC')) });
  assert.equal(owner.write('iaudit.program.submit', { program_id: p27 }, { expected_version: prog(env, p27).record_version }).ok, true);
  assert.equal(approve(owner, env, p27).code, 'FORBIDDEN');
  env.g.withWriteLock_(() => env.g.writeSetting_('admin_self_approval', true, 'TEST'));
  assert.equal(approve(owner, env, p27).ok, true);
  env.g.dbReset_();
  assert.equal(env.rows('Audits').find((x) => x.program_id === p27).code, 'DG-27-01', 'đánh số theo năm của chương trình');
  const acts = env.rows('AuditLogs').map((a) => a.action);
  ['iaudit.program.save', 'iaudit.program.submit', 'iaudit.program.approve', 'iaudit.program.return', 'iaudit.program.reopen', 'iaudit.save'].forEach((x) => assert.ok(acts.includes(x), x));
});

test('kế hoạch đợt: đoàn đánh giá (Đánh giá viên, không đánh giá bộ phận mình, người ngoài app, một trưởng đoàn), checklist, chốt kế hoạch, bắt đầu từ ngày đánh giá, ghi kết quả; quyền và đồng bộ', () => {
  const { env, owner, tk } = seeded();
  const audCL = userClient(env, 'AUDCL', 2, '583931', { depts: 'CL', auditor: true });
  const audCD = userClient(env, 'AUDCD', 2, '583932', { depts: 'CĐ', auditor: true });
  const sx2 = userClient(env, 'SX2', 2, '583921', { depts: 'SX' });
  const cd2 = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const cd1 = userClient(env, 'CD1', 1, '583922', { depts: 'CĐ' });
  const { pid, aid } = approvedProgram(env, owner, tk);
  const uCL = uidOf(env, 'AUDCL'), uCD = uidOf(env, 'AUDCD'), uSX = uidOf(env, 'SX2');
  // Đoàn đánh giá: kiểm từng dòng
  assert.deepEqual(fields(saveAudit(tk, env, aid, { team: [{ u: uCD, r: 'L' }] })), ['team.0:AUDIT_OWN_DEPT']);
  assert.deepEqual(fields(saveAudit(tk, env, aid, { team: [{ u: uSX, r: 'L' }] })), ['team.0:AUDIT_NOT_AUDITOR']);
  assert.deepEqual(fields(saveAudit(tk, env, aid, { team: [{ n: 'Nguyễn Văn A', d: 'CĐ', r: 'L' }] })), ['team.0:AUDIT_OWN_DEPT']);
  assert.deepEqual(fields(saveAudit(tk, env, aid, { team: [{ n: 'A', r: 'L' }, { n: 'B', r: 'L' }] })), ['team:AUDIT_ONE_LEAD']);
  assert.deepEqual(fields(saveAudit(tk, env, aid, { team: [{ n: '' }, { u: uCL }, { u: uCL }] })), ['team.0:REQUIRED', 'team.2:AUDIT_TEAM_DUP']);
  assert.deepEqual(fields(saveAudit(tk, env, aid, { team: Array.from({ length: 7 }, (_, i) => ({ n: 'N' + i })) })), ['team:AUDIT_TEAM_MAX']);
  assert.deepEqual(fields(saveAudit(tk, env, aid, { audit_date: '2027-01-05' })), ['audit_date:AUDIT_NOT_IN_YEAR']);
  let r = saveAudit(tk, env, aid, { audit_date: '2026-11-20', time_text: '8:00 – 11:00', place_text: 'Xưởng cơ điện', auditee_text: 'Trưởng bộ phận Cơ điện',
    team: [{ u: uCL, r: 'L' }, { n: 'Trần Thị B', d: 'CL', r: 'M' }], note_vi: 'Chuẩn bị sổ bảo trì 2026' });
  assert.equal(r.ok, true, JSON.stringify(r));
  let a = aud(env, aid);
  assert.equal(a.lead_user_id, uCL);
  assert.deepEqual(a.team_json.map((t) => t.n), ['AUDCL', 'Trần Thị B']);
  // Trưởng đoàn sửa được kế hoạch; người khác (trưởng bộ phận được đánh giá, Đánh giá viên ngoài đoàn) thì không
  const cd3 = userClient(env, 'CD3', 3, '583923', { depts: 'CĐ' });
  assert.equal(saveAudit(audCL, env, aid, { time_text: '8:30 – 11:30' }).ok, true);
  assert.equal(saveAudit(cd3, env, aid, { time_text: '9:00' }).code, 'FORBIDDEN');
  assert.equal(saveAudit(audCD, env, aid, { time_text: '9:00' }).code, 'FORBIDDEN');
  // Chốt kế hoạch cần checklist
  assert.deepEqual(fields(audCL.write('iaudit.ready', { audit_id: aid }, { expected_version: aud(env, aid).record_version })), ['checks:AUDIT_NO_CHECKS']);
  // Checklist: thêm nhiều câu (điều khoản phải thuộc đợt), câu chung, sửa, xóa
  const l1 = uuid(), l2 = uuid();
  assert.deepEqual(fields(audCL.write('iaudit.check.add', { audit_id: aid, lines: [{ check_id: uuid(), clause_id: 'ISO9001|99', question_vi: 'x' }] })), ['lines.0.clause_id:AUDIT_CLAUSE_NOT_IN']);
  r = audCL.write('iaudit.check.add', { audit_id: aid, lines: [
    { check_id: l1, clause_id: ISO('7.1.3'), question_vi: 'Điều khoản 7.1.3: bảo trì có đúng kế hoạch?', question_zh: '条款7.1.3：是否按计划维护？' },
    { check_id: l2, clause_id: ISO('7.1.5'), question_vi: 'Dụng cụ đo có được hiệu chuẩn?' }] });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.added, 2);
  assert.equal(chk(env, l1).seq, 1);
  assert.equal(chk(env, l2).seq, 2);
  assert.equal(chk(env, l2).i18n_meta.question.state, 'PENDING', 'thêm nhiều câu: dịch ở nền');
  const g3 = uuid();
  assert.equal(audCL.write('iaudit.check.save', { check_id: g3, audit_id: aid, question_vi: 'Câu chung tạm' }).ok, true);
  assert.equal(chk(env, g3).clause_id, '');
  assert.equal(cd2.write('iaudit.check.save', { check_id: uuid(), audit_id: aid, question_vi: 'x' }).code, 'FORBIDDEN');
  assert.equal(audCL.write('iaudit.check.save', { check_id: g3, question_vi: 'Hồ sơ năng lực thợ điện?' }, { expected_version: chk(env, g3).record_version }).ok, true);
  assert.equal(chk(env, g3).question_vi, 'Hồ sơ năng lực thợ điện?');
  assert.equal(audCL.write('iaudit.check.save', { check_id: g3, remove: true }, { expected_version: chk(env, g3).record_version }).ok, true);
  assert.ok(chk(env, g3).archived_at);
  // Chốt kế hoạch; đã chốt thì bỏ trưởng đoàn bị chặn
  r = audCL.write('iaudit.ready', { audit_id: aid }, { expected_version: aud(env, aid).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(aud(env, aid).state, 'READY');
  assert.deepEqual(fields(saveAudit(tk, env, aid, { team: [{ n: 'Trần Thị B', d: 'CL', r: 'M' }] })), ['team:AUDIT_NO_LEAD']);
  // Bắt đầu: chưa tới ngày → chặn; tới ngày → Đang đánh giá
  assert.deepEqual(fields(audCL.write('iaudit.start', { audit_id: aid }, { expected_version: aud(env, aid).record_version })), ['audit_date:AUDIT_NOT_YET']);
  env.clock.advance(8 * DAY); // 20/11
  assert.equal(audCL.write('iaudit.start', { audit_id: aid }, { expected_version: aud(env, aid).record_version }).ok, true);
  assert.equal(aud(env, aid).state, 'IN_PROGRESS');
  // Ghi kết quả: người được đánh giá không ghi; Không phù hợp phải có bằng chứng; bằng chứng không dịch máy
  const rec = (c, id, p) => c.write('iaudit.check.record', { check_id: id, ...p }, { expected_version: chk(env, id).record_version });
  assert.equal(rec(cd2, l1, { result: 'C' }).code, 'FORBIDDEN');
  assert.deepEqual(fields(rec(audCL, l1, { result: 'NC' })), ['evidence:AUDIT_EVIDENCE']);
  assert.deepEqual(fields(rec(audCL, l1, { result: 'XX' })), ['result:INVALID_VALUE']);
  assert.equal(rec(audCL, l1, { result: 'NC', evidence_vi: 'Máy nén khí số 2 quá hạn bảo trì tháng 10' }).ok, true);
  let c1 = chk(env, l1);
  assert.equal(c1.result, 'NC');
  assert.equal(c1.evidence_zh, '', 'bằng chứng không dịch máy');
  assert.equal(c1.checked_by, uCL);
  assert.equal(rec(tk, l2, { result: 'C' }).ok, true, 'Thư ký ISO ghi thay người ngoài app');
  // Đã có kết quả: không xóa câu hỏi, không quay lại chưa bắt đầu
  assert.deepEqual(fields(audCL.write('iaudit.check.save', { check_id: l1, remove: true }, { expected_version: chk(env, l1).record_version })), ['result:AUDIT_HAS_RESULTS']);
  assert.deepEqual(fields(audCL.write('iaudit.start', { audit_id: aid, undo: true }, { expected_version: aud(env, aid).record_version })), ['checks:AUDIT_HAS_RESULTS']);
  // Đang đánh giá: không sửa kế hoạch
  assert.deepEqual(fields(saveAudit(tk, env, aid, { place_text: 'x' })), ['state:STATUS_INVALID']);
  // Đồng bộ: chương trình — cấp 2+; đợt + checklist — Thư ký, Đánh giá viên, bộ phận được đánh giá; cấp 1 không thấy
  const seen = (c, type) => (c.call('sync.bootstrap', {}).data.records[type] || []).map((x) => Object.values(x)[0]);
  assert.deepEqual(seen(cd2, 'AUD_PROG').length, 1);
  assert.deepEqual(seen(cd2, 'AUDIT'), [aid]);
  assert.equal(seen(cd2, 'AUD_CHK').length, 2, 'câu đã xóa không gửi');
  assert.deepEqual(seen(sx2, 'AUD_PROG').length, 1);
  assert.deepEqual(seen(sx2, 'AUDIT'), [], 'bộ phận khác không thấy đợt');
  assert.deepEqual(seen(sx2, 'AUD_CHK'), []);
  assert.deepEqual(seen(audCD, 'AUDIT'), [aid], 'Đánh giá viên thấy mọi đợt');
  assert.deepEqual(seen(cd1, 'AUD_PROG'), []);
  assert.deepEqual(seen(cd1, 'AUDIT'), []);
  // Danh bạ người dùng gửi xuống app có cờ Đánh giá viên, bộ phận (chọn đoàn đánh giá)
  const users = tk.call('sync.bootstrap', {}).data.users;
  const ucl = users.find((u) => u.user_id === uCL);
  assert.equal(ucl.auditor, true);
  assert.equal(ucl.dept_codes, 'CL');
  assert.equal(users.find((u) => u.user_id === uidOf(env, 'TK2')).iso_secretary, true);
  env.g.dbReset_();
  const acts = env.rows('AuditLogs').map((x) => x.action);
  ['iaudit.ready', 'iaudit.start', 'iaudit.check.add', 'iaudit.check.save', 'iaudit.check.record'].forEach((x) => assert.ok(acts.includes(x), x));
});

test('bỏ đợt khỏi chương trình Nháp (chưa mã: bỏ hẳn; có mã: hủy, lý do), hủy chương trình (PIN; có đợt đang đánh giá thì chặn trước PIN)', () => {
  const { env, owner, tk } = seeded();
  const { pid, aid } = approvedProgram(env, owner, tk);
  assert.equal(tk.pin('583926').ok, true);
  // Đã duyệt: không bỏ đợt
  assert.deepEqual(fields(tk.write('iaudit.cancel', { audit_id: aid, reason: 'x' }, { expected_version: aud(env, aid).record_version })), ['program:AUDIT_PROG_LOCKED']);
  assert.equal(tk.write('iaudit.program.reopen', { program_id: pid, reason: 'Dời đợt' }, { expected_version: prog(env, pid).record_version }).ok, true);
  const a2 = addAudit(tk, pid, { plan_month: '2026-12' });
  assert.equal(tk.write('iaudit.cancel', { audit_id: a2 }, { expected_version: aud(env, a2).record_version }).ok, true);
  assert.ok(aud(env, a2).archived_at, 'đợt chưa mã: bỏ hẳn');
  assert.deepEqual(fields(tk.write('iaudit.cancel', { audit_id: aid, reason: '' }, { expected_version: aud(env, aid).record_version })), ['reason:REQUIRED']);
  // Hủy chương trình khi có đợt đang đánh giá → chặn trước PIN
  const { env: env2, owner: o2, tk: tk2 } = seeded();
  const x = approvedProgram(env2, o2, tk2);
  env2.g.withWriteLock_(() => env2.g.writeCells_('Audits', env2.g.findOne_('Audits', 'audit_id', x.aid).__row, { state: 'IN_PROGRESS' }));
  env2.g.dbReset_();
  assert.deepEqual(fields(tk2.write('iaudit.program.cancel', { program_id: x.pid, reason: 'x' }, { expected_version: prog(env2, x.pid).record_version })), ['audits:AUDIT_STARTED']);
  // Hủy được: đợt chưa đánh giá cũng hủy
  const r = tk.write('iaudit.program.cancel', { program_id: pid, reason: 'Dữ liệu thử' }, { expected_version: prog(env, pid).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(prog(env, pid).state, 'CANCELLED');
  assert.equal(aud(env, aid).state, 'CANCELLED');
  // Năm đó lập lại được chương trình mới
  assert.ok(newProgram(tk));
});

test('Gmail AUDIT_SOON: đợt có ngày đánh giá trong 7 ngày tới → trưởng đoàn, người trong đoàn, trưởng bộ phận được đánh giá; một lần cho mỗi ngày đánh giá, dời ngày thì báo lại', () => {
  const { env, owner, tk } = seeded();
  const g = env.g;
  const setEmail = (code, email) => {
    g.dbReset_();
    const u = g.readRows_('Users').find((x) => x.employee_code === code);
    g.withWriteLock_(() => g.writeCells_('Users', u.__row, { email, email_confirmed_at: g.isoVN_(new env.clock.Date()), email_confirmed_by: 'TEST' }));
    g.dbReset_();
  };
  userClient(env, 'AUDCL', 2, '583931', { depts: 'CL', auditor: true });
  userClient(env, 'CD3', 3, '583923', { depts: 'CĐ' });
  setEmail('AUDCL', 'audcl@example.com');
  setEmail('CD3', 'cd3@example.com');
  g.dbReset_();
  const d = g.readRows_('Depts').find((x) => x.dept_code === 'CĐ');
  g.withWriteLock_(() => g.writeCells_('Depts', d.__row, { head_user_id: uidOf(env, 'CD3') }));
  g.withWriteLock_(() => g.writeSetting_('gmail_enabled', true, 'TEST'));
  g.withWriteLock_(() => g.writeSetting_('app_base_url', 'https://example.test/ISO/', 'TEST'));
  g.dbReset_();
  const { aid } = approvedProgram(env, owner, tk);
  assert.equal(saveAudit(tk, env, aid, { audit_date: '2026-11-20', time_text: '8:00', place_text: 'Xưởng cơ điện', team: [{ u: uidOf(env, 'AUDCL'), r: 'L' }, { n: 'Trần Thị B', d: 'CL' }] }).ok, true);
  const run = () => { g.dbReset_(); g.sendDueMail(); g.dbReset_(); };
  const to = (e) => env.mail.sent.filter((m) => m.to === e);
  run(); // 12/11: còn 8 ngày
  assert.equal(to('audcl@example.com').length, 0);
  env.clock.advance(DAY); // 13/11: còn 7 ngày
  run();
  assert.equal(to('audcl@example.com').length, 1);
  assert.equal(to('cd3@example.com').length, 1);
  const body = to('cd3@example.com')[0].body;
  assert.match(body, /Đánh giá nội bộ sắp tới/);
  assert.match(body, /DG-26-01 — Bảo trì, sửa chữa thiết bị/);
  assert.match(body, /Ngày đánh giá · 审核日期: 20\/11\/2026 8:00 \(còn · 剩余 7 ngày/);
  assert.match(body, /AUDCL \(trưởng đoàn · 组长\), Trần Thị B/);
  assert.match(body, /https:\/\/example\.test\/ISO\/#\/audit\//);
  env.clock.advance(DAY);
  run();
  assert.equal(to('audcl@example.com').length, 1, 'không gửi lại');
  // Dời ngày → báo lại khi còn ≤ 7 ngày
  assert.equal(saveAudit(tk, env, aid, { audit_date: '2026-11-21' }).ok, true);
  run();
  assert.equal(to('audcl@example.com').length, 2);
  const kinds = owner.call('mail.view', {}).data.preview.map((p) => p.kind);
  assert.ok(kinds.includes('AUDIT_SOON'), kinds.join(','));
});

test('báo cáo: chương trình (BM-ISO-03-01: lịch, phủ ISO 9001 / BRCGS, các lần duyệt), kế hoạch (03-02: đoàn, chuẩn mực), checklist (03-03: kết quả); quyền; PDF, tên tệp; Cấu hình; Trạng thái hệ thống', () => {
  const { env, owner, tk } = seeded();
  const audCL = userClient(env, 'AUDCL', 2, '583931', { depts: 'CL', auditor: true });
  const sx2 = userClient(env, 'SX2', 2, '583921', { depts: 'SX' });
  const cd1 = userClient(env, 'CD1', 1, '583922', { depts: 'CĐ' });
  const pid = newProgram(tk);
  const a1 = addAudit(tk, pid, { plan_month: '2026-11', clauses: clauseIds(env, 'ISO9001').slice(0, 5).concat(clauseIds(env, 'BRC')) });
  const rest = clauseIds(env, 'ISO9001').slice(5);
  assert.equal(tk.write('iaudit.program.save', { program_id: pid, na: rest.map((c) => ({ c, r: 'Ngoài phạm vi Cơ điện' })) }, { expected_version: prog(env, pid).record_version }).ok, true);
  assert.equal(submit(tk, env, pid).ok, true);
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  assert.equal(approve(owner, env, pid).ok, true);
  assert.equal(saveAudit(tk, env, a1, { audit_date: '2026-11-12', team: [{ u: uidOf(env, 'AUDCL'), r: 'L' }, { n: 'Trần Thị B', d: 'CL' }], auditee_text: 'Trưởng CĐ' }).ok, true);
  const q1 = uuid();
  assert.equal(audCL.write('iaudit.check.add', { audit_id: a1, lines: [{ check_id: q1, clause_id: ISO('7.1.3'), question_vi: 'Bảo trì đúng kế hoạch?', question_zh: '按计划维护？' }, { check_id: uuid(), clause_id: '', question_vi: 'Câu chung' }] }).ok, true);
  assert.equal(audCL.write('iaudit.ready', { audit_id: a1 }, { expected_version: aud(env, a1).record_version }).ok, true);
  assert.equal(audCL.write('iaudit.start', { audit_id: a1 }, { expected_version: aud(env, a1).record_version }).ok, true);
  assert.equal(audCL.write('iaudit.check.record', { check_id: q1, result: 'OBS', evidence_vi: 'Sổ bảo trì ghi thiếu chữ ký' }, { expected_version: chk(env, q1).record_version }).ok, true);
  // Chương trình
  let r = tk.call('report.run', { kind: 'AUDIT', filters: { program_id: pid } });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.report.form_code, 'BM-ISO-03-01');
  assert.equal(r.data.report.title_vi, 'Chương trình đánh giá nội bộ');
  let lay = r.data.layout;
  const t = Object.fromEntries(lay.tiles.map((x) => [x.label, x.value]));
  assert.equal(t['Số đợt đánh giá · 审核次数'], '1');
  assert.equal(t['Phủ ISO 9001 · ISO 9001覆盖'], '11/11');
  assert.equal(t['Phủ BRCGS · BRCGS覆盖'], '6/6');
  const sched = lay.sections.find((s) => /Lịch đánh giá/.test(s.heading || ''));
  assert.equal(sched.table.rows[0][0], 'DG-26-01');
  assert.match(sched.table.rows[0][5], /Trưởng đoàn · 组长: AUDCL\nTrần Thị B \(CL\)/);
  const isoCov = lay.sections.find((s) => /Phủ điều khoản ISO 9001/.test(s.heading || ''));
  assert.match(isoCov.heading, /5 có đợt · 6 không áp dụng · tổng 11/);
  assert.ok(isoCov.table.rows.some((x) => x[3] === 'Ngoài phạm vi Cơ điện'));
  assert.ok(lay.sections.some((s) => /Các lần duyệt chương trình/.test(s.heading || '')));
  assert.equal(lay.sign.approved_name, 'Chủ hệ thống');
  assert.equal(cd1.call('report.run', { kind: 'AUDIT', filters: { program_id: pid } }).code, 'FORBIDDEN');
  assert.deepEqual(fields(tk.call('report.run', { kind: 'AUDIT', filters: {} })), ['filters.program_id:REQUIRED']);
  // Kế hoạch đợt
  r = tk.call('report.run', { kind: 'AUDIT', filters: { audit_id: a1 } });
  assert.equal(r.data.report.form_code, 'BM-ISO-03-02');
  assert.equal(r.data.report.title_vi, 'Kế hoạch đánh giá nội bộ');
  lay = r.data.layout;
  assert.equal(lay.sign.prepared_name, 'AUDCL');
  assert.equal(lay.sign.middle_name, 'Trưởng CĐ');
  const team = lay.sections.find((s) => /Đoàn đánh giá/.test(s.heading || ''));
  assert.deepEqual(team.table.rows.map((x) => x[1]), ['AUDCL', 'Trần Thị B']);
  const crit = lay.sections.find((s) => /Chuẩn mực đánh giá/.test(s.heading || ''));
  assert.equal(crit.table.rows.length, 11);
  assert.equal(sx2.call('report.run', { kind: 'AUDIT', filters: { audit_id: a1 } }).code, 'FORBIDDEN', 'bộ phận khác không xem đợt');
  // Checklist có kết quả
  r = tk.call('report.run', { kind: 'AUDIT', filters: { audit_id: a1, form: 'CHECKLIST' } });
  assert.equal(r.data.report.form_code, 'BM-ISO-03-03');
  lay = r.data.layout;
  const cl = lay.sections.find((s) => s.table);
  assert.equal(cl.table.rows.length, 2);
  assert.match(cl.table.rows[0][4], /Cần cải tiến/);
  assert.match(cl.table.rows[0][3], /Sổ bảo trì ghi thiếu chữ ký/);
  assert.equal(cl.table.tones[0][4], 'amber');
  assert.deepEqual(fields(tk.call('report.run', { kind: 'AUDIT', filters: { audit_id: a1, form: 'XX' } })), ['filters.form:INVALID_VALUE']);
  // Lưu PDF / Excel: tên tệp
  r = tk.write('report.save', { report_run_id: uuid(), kind: 'AUDIT', filters: { program_id: pid }, format: 'PDF' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.file_name, 'BC-2611-001_chuong-trinh-danh-gia-noi-bo_DG-26.pdf');
  const pdf = Buffer.from(r.data.content_b64, 'base64').toString('utf8');
  for (const s of ['CHƯƠNG TRÌNH ĐÁNH GIÁ NỘI BỘ', 'BM-ISO-03-01', 'Lịch đánh giá', 'Ngoài phạm vi Cơ điện', 'Người lập (Thư ký ISO)']) assert.ok(pdf.includes(s), s);
  r = tk.write('report.save', { report_run_id: uuid(), kind: 'AUDIT', filters: { audit_id: a1 }, format: 'XLSX' });
  assert.equal(r.data.file_name, 'BC-2611-002_ke-hoach-danh-gia_DG-26-01.xlsx');
  r = tk.write('report.save', { report_run_id: uuid(), kind: 'AUDIT', filters: { audit_id: a1, form: 'CHECKLIST' }, format: 'XLSX' });
  assert.equal(r.data.file_name, 'BC-2611-003_checklist-danh-gia_DG-26-01.xlsx');
  // Cấu hình: mã biểu viết hoa; số ngày báo trước ngoài giới hạn bị chặn; cài đặt gửi xuống app
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  assert.equal(owner.write('settings.edit', { changes: { audit_plan_form_code: 'bm-cđ-15-02' } }).ok, true);
  assert.equal(owner.write('settings.edit', { changes: { audit_notice_days: 99 } }).code, 'VALIDATION_ERROR');
  assert.equal(owner.call('report.run', { kind: 'AUDIT', filters: { audit_id: a1 } }).data.report.form_code, 'BM-CĐ-15-02');
  const st = tk.call('sync.bootstrap', {}).data.settings;
  for (const k of ['audit_program_form_code', 'audit_plan_form_code', 'audit_checklist_form_code', 'audit_notice_days']) assert.ok(k in st, k);
  // Trạng thái hệ thống
  const h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'iaudit');
  assert.equal(h.status, 'OK');
  assert.equal(h.value, 'DG-26 Đã duyệt lần 01 · 1 đợt · phủ ISO 9001 11/11 · BRCGS 6/6 · đã chốt kế hoạch 0 · đang đánh giá 1 · trễ kế hoạch 0 · đã báo cáo chờ đóng 0 · đã đóng 0 · phát hiện không phù hợp chưa có phiếu khắc phục 0');
});

test('cập nhật từ bản 3c (chưa có AuditPrograms, Audits, AuditChecks): đăng nhập chạy, Trạng thái hệ thống cảnh báo; lập chương trình đầu tiên tự thêm; migrateSchema báo đúng dòng nhật ký; bộ đệm danh bạ cũ đọc lại', () => {
  const strip = (env) => {
    const g = env.g;
    g.dbReset_();
    const b = g.book_('B');
    ['AuditPrograms', 'Audits', 'AuditChecks'].forEach((n) => b.deleteSheet(b.getSheetByName(n)));
    g.withWriteLock_(() => g.stateWrite_(g.readState_(), { schema_version: ['STRING', '1.0.10'] }, 'TEST'));
    g.cache_().removeAll(['sys:state']);
    g.dbReset_();
  };
  const { env, owner, tk } = seeded();
  const g = env.g;
  strip(env);
  assert.equal(owner.call('sync.bootstrap', {}).ok, true);
  let h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'iaudit');
  assert.equal(h.status, 'WARN');
  const pid = newProgram(tk);
  g.dbReset_();
  assert.equal(g.sheetExists_('AuditChecks'), true);
  assert.equal(prog(env, pid).code, 'DG-26');
  assert.equal(g.stateGet_(g.readState_(), 'schema_version', ''), g.SCHEMA_VERSION);
  h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'iaudit');
  assert.equal(h.status, 'OK');
  assert.match(h.value, /^DG-26 Nháp · 0 đợt · phủ ISO 9001 0\/11 · BRCGS 0\/6/);
  // Bộ đệm danh bạ của bản trước (không có cờ Đánh giá viên) → đọc lại từ Users
  const old = {};
  g.readRows_('Users').forEach((u) => { old[u.user_id] = { employee_code: u.employee_code, display_name: u.display_name, active: true }; });
  g.cache_().put('users:dir', JSON.stringify(old), 600);
  g.dbReset_();
  assert.ok('auditor' in g.userDirectory_()[Object.keys(old)[0]]);
  // Máy chủ khác cùng trạng thái: chạy migrateSchema bằng tay → nhật ký
  const { env: env2 } = seeded();
  strip(env2);
  env2.logs.length = 0;
  env2.g.migrateSchema();
  assert.ok(env2.logs.some((l) => l === 'migrateSchema xong. Thêm: AuditPrograms; Audits; AuditChecks. schema_version=1.0.14'), env2.logs.join('\n'));
  env2.g.dbReset_();
  const keys = env2.g.readRows_('Settings').map((x) => x.setting_key);
  for (const k of ['audit_program_form_code', 'audit_plan_form_code', 'audit_checklist_form_code', 'audit_notice_days']) assert.ok(keys.includes(k), k);
});

test('ISO 14001 / 45001 / 50001 (14/11/2026): máy chủ tự nạp điều khoản; chương trình mới mặc định mọi chuẩn; phủ hết mới gửi duyệt; báo cáo và Trạng thái hệ thống theo từng chuẩn; chương trình cũ không ghi chuẩn = ISO 9001 + BRCGS', () => {
  const { env, owner, tk } = seeded();
  // Điều khoản nạp sẵn (39_stds.js): số điều khoản, bắt buộc lưu hồ sơ, nhóm
  const cls = (std) => { env.g.dbReset_(); return env.rows('Clauses').filter((c) => c.std === std); };
  assert.deepEqual(['ISO14001', 'ISO45001', 'ISO50001'].map((s) => [cls(s).length, cls(s).filter((c) => c.mandatory_record).length]), [[26, 16], [30, 18], [27, 16]]);
  const c612 = cls('ISO14001').find((c) => c.key === '6.1.2');
  assert.deepEqual([c612.name_vi, c612.name_zh, c612.group_vi, c612.group_zh], ['Khía cạnh môi trường', '环境因素', '6. Hoạch định', '6. 策划']);
  // Lập chương trình không ghi chuẩn → mọi chuẩn
  const pid = uuid();
  let r = tk.write('iaudit.program.save', { program_id: pid, year: 2026 });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(prog(env, pid).stds, 'ISO9001,ISO14001,ISO45001,ISO50001,BRC');
  const aid = addAudit(tk, pid, { plan_month: '2026-11', clauses: ['ISO50001|6.3', 'ISO14001|8.2', ISO('7.1.3'), 'ISO45001|8.1.4'] });
  assert.deepEqual(aud(env, aid).clauses_json, [ISO('7.1.3'), 'ISO14001|8.2', 'ISO45001|8.1.4', 'ISO50001|6.3'], 'theo thứ tự chuẩn rồi điều khoản');
  // Phủ: máy chủ = app với 5 chuẩn
  const covApp = () => {
    env.g.dbReset_();
    return auditCoverage(env.rows('Clauses'), ['ISO9001', 'ISO14001', 'ISO45001', 'ISO50001', 'BRC'], env.rows('Audits').filter((x) => x.program_id === pid), prog(env, pid).na_json || [])
      .map((x) => x.clause.clause_id + ':' + x.state);
  };
  const covSrv = () => { env.g.dbReset_(); return JSON.parse(JSON.stringify(env.g.auditCoverageOf_(prog(env, pid)).map((x) => x.clause.clause_id + ':' + x.state))); };
  assert.deepEqual(covSrv(), covApp());
  assert.equal(covSrv().length, 11 + 26 + 30 + 27 + 6);
  r = submit(tk, env, pid);
  assert.deepEqual(fields(r), ['coverage:AUDIT_NOT_COVERED']);
  const missing = covSrv().filter((x) => x.endsWith(':MISSING')).map((x) => x.split(':')[0]);
  assert.ok(missing.includes('ISO45001|6.1.2'));
  r = tk.write('iaudit.program.save', { program_id: pid, na: missing.map((c) => ({ c, r: 'Đợt sau' })) }, { expected_version: prog(env, pid).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(submit(tk, env, pid).ok, true);
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  assert.equal(approve(owner, env, pid).ok, true);
  // Trạng thái hệ thống: phủ theo từng chuẩn
  const h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'iaudit');
  assert.match(h.value, /phủ ISO 9001 11\/11 · ISO 14001 26\/26 · ISO 45001 30\/30 · ISO 50001 27\/27 · BRCGS 6\/6/);
  // Báo cáo chương trình: mỗi chuẩn một ô số và một mục phủ; lịch ghi điều khoản kèm tên chuẩn
  r = tk.call('report.run', { kind: 'AUDIT', filters: { program_id: pid } });
  assert.equal(r.ok, true, JSON.stringify(r));
  const lay = r.data.layout;
  const t = Object.fromEntries(lay.tiles.map((x) => [x.label, x.value]));
  assert.equal(t['Phủ ISO 14001 · ISO 14001覆盖'], '26/26');
  assert.equal(t['Phủ ISO 50001 · ISO 50001覆盖'], '27/27');
  const heads = lay.sections.map((s) => s.heading || '').filter((x) => /^Phủ /.test(x)).map((x) => x.split(' — ')[0]);
  assert.deepEqual(heads, ['Phủ điều khoản ISO 9001 · ISO 9001条款覆盖', 'Phủ điều khoản ISO 14001 · ISO 14001条款覆盖', 'Phủ điều khoản ISO 45001 · ISO 45001条款覆盖',
    'Phủ điều khoản ISO 50001 · ISO 50001条款覆盖', 'Phủ chủ đề BRCGS Packaging · BRCGS包装主题覆盖']);
  const sched = lay.sections.find((s) => /Lịch đánh giá/.test(s.heading || ''));
  assert.equal(sched.table.rows[0][4], '7.1.3; ISO 14001: 8.2; ISO 45001: 8.1.4; ISO 50001: 6.3');
  // Kế hoạch đợt: bảng chuẩn mực ghi tên chuẩn
  r = tk.call('report.run', { kind: 'AUDIT', filters: { audit_id: aid } });
  const crit = r.data.layout.sections.find((s) => s.table && /Chuẩn mực/.test(s.heading || ''));
  assert.deepEqual(crit.table.rows.map((x) => x[0] + ' ' + x[1]), ['ISO 9001 7.1.3', 'ISO 14001 8.2', 'ISO 45001 8.1.4', 'ISO 50001 6.3']);
  assert.equal(env.g.auditClauseLabel_({ std: 'ISO45001', key: '8.1.4' }), 'ISO 45001 · 8.1.4');
  assert.equal(env.g.auditClauseLabel_({ std: 'ISO9001', key: '7.1.3' }), '7.1.3');
  // Chương trình cũ không ghi chuẩn (trước bản này) → ISO 9001 + BRCGS
  assert.deepEqual(JSON.parse(JSON.stringify(env.g.auditStdsOf_({ stds: '' }))), ['ISO9001', 'BRC']);
});
