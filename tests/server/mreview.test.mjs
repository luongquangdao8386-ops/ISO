// Xem xét lãnh đạo (Đợt 4, phiên 4c — BM-ISO-05-01; nghiệm thu Đợt 4 "báo cáo đầu vào xem xét lãnh đạo tự gom số liệu"): lập / sửa (Thư ký
// ISO), mã XL-yy-01, kiểm dữ liệu; số liệu tự gom theo kỳ (khiếu nại, SCAR, sản phẩm không phù hợp, khắc phục, tài liệu, phủ điều khoản, hồ sơ
// đúng hạn — khớp báo cáo Tình trạng hồ sơ, đánh giá nội bộ) trong phạm vi áp dụng; ghi Đã họp (PIN, kiểm trước PIN) chốt số liệu; quyết định
// (người phụ trách báo xong, Thư ký hủy); lần sau hiện tình trạng quyết định lần trước; quyền xem / đồng bộ; báo cáo + PDF; Trạng thái hệ thống;
// cập nhật từ bản 4b.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, uuid, OWNER_PIN, setScope } from '../helpers.mjs';

const NOW = '2026-12-05T08:00:00+07:00';
const TK_PIN = '583926';

function seeded(scope = '') {
  const env = freshServer({ now: NOW, scope });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  env.g.dbReset_();
  const tk = userClient(env, 'TK2', 2, TK_PIN, { depts: 'ISO', secretary: true });
  return { env, owner, tk };
}
const mr = (env, id) => { env.g.dbReset_(); return env.rows('MgmtReviews').find((x) => x.review_id === id); };
const fields = (r) => (r.errors || []).map((e) => e.field + ':' + e.code).sort();
const uidOf = (env, code) => env.rows('Users').find((u) => u.employee_code === code).user_id;
const save = (c, env, id, p) => c.write('mreview.save', { review_id: id, ...p }, { expected_version: mr(env, id).record_version });
const blocks = (st) => Object.fromEntries(Object.entries(st.blocks).map(([k, rows]) => [k, Object.fromEntries(rows.map((x) => [x.k.replace('mr.s.', ''), x.v]))]));

function newReview(c, p = {}) {
  const id = uuid();
  const r = c.write('mreview.save', { review_id: id, period_from: '2026-01-01', period_to: '2026-11-30', ...p });
  assert.equal(r.ok, true, JSON.stringify(r));
  return { id, code: r.data.record.code };
}

/** Dữ liệu trong kỳ: 1 khắc phục nội bộ, 1 khiếu nại nặng, 1 SCAR, 1 NC đầu vào; ngoài kỳ: 1 khắc phục (vẫn đang mở) */
function seedActivity(c) {
  const base = { dept_code: 'CĐ', due_date: '2026-12-31' };
  let r = c.write('capa.save', { capa_id: uuid(), source: 'EQUIPMENT', found_date: '2026-03-10', problem_vi: 'Máy nén khí dừng', ...base });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = c.write('capa.save', { capa_id: uuid(), source: 'INSPECTION', found_date: '2025-12-01', problem_vi: 'Ngoài kỳ', ...base });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = c.write('capa.save', { capa_id: uuid(), source: 'COMPLAINT', found_date: '2026-04-01', party_name: 'Khách A', severity: 'MAJOR', problem_vi: 'Lô hàng lỗi in', ...base });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = c.write('capa.save', { capa_id: uuid(), source: 'SUPPLIER', found_date: '2026-05-02', party_name: 'NCC Phụ tùng', problem_vi: 'Vòng bi sai mã', ...base });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = c.write('ncr.save', { ncr_id: uuid(), stage: 'INCOMING', dept_code: 'CĐ', found_date: '2026-06-01', product_text: 'Vòng bi 6205', problem_vi: 'Sai kích thước' });
  assert.equal(r.ok, true, JSON.stringify(r));
}

test('lập / sửa: Thư ký ISO, mã XL-26-01, kiểm dữ liệu; cấp 3 chỉ xem; cấp 1–2 không thấy; đồng bộ', () => {
  const { env, owner, tk } = seeded();
  const head = userClient(env, 'SX3', 3, '583924', { depts: 'SX' });
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  let r = tk.write('mreview.save', { review_id: uuid(), period_from: '2026-12-01', period_to: '2026-01-01', meeting_date: 'x' });
  assert.deepEqual(fields(r), ['meeting_date:INVALID_DATE', 'period_to:RANGE_INVALID']);
  r = tk.write('mreview.save', { review_id: uuid(), period_from: '2024-01-01', period_to: '2026-11-30' });
  assert.deepEqual(fields(r), ['period_to:MR_PERIOD_LONG']);
  r = tk.write('mreview.save', { review_id: uuid(), period_from: '2026-01-01', period_to: '2027-06-30' });
  assert.deepEqual(fields(r), ['period_to:MR_PERIOD_FUTURE']);
  r = tk.write('mreview.save', { review_id: uuid(), period_from: '2026-01-01', period_to: '2026-11-30', in_context_vi: 'x'.repeat(4001) });
  assert.deepEqual(fields(r), ['in_context:TOO_LONG']);
  assert.equal(head.write('mreview.save', { review_id: uuid(), period_from: '2026-01-01', period_to: '2026-11-30' }).code, 'FORBIDDEN');
  const { id, code } = newReview(tk, { meeting_date: '2026-12-04', in_context_vi: 'Khách hàng mới yêu cầu BRCGS' });
  assert.equal(code, 'XL-26-01');
  let row = mr(env, id);
  assert.equal(row.state, 'DRAFT');
  assert.equal(row.year, 2026);
  assert.ok(row.in_context_zh, 'dịch máy nhận xét'); // máy chủ giả dịch được
  // Quyết định: kiểm dữ liệu
  r = save(tk, env, id, { decisions: [{ id: 'x', kind: 'IMPROVE', text_vi: 'a' }, { id: uuid(), kind: 'ZZ' }, { id: uuid(), kind: 'CHANGE', text_vi: 'b', owner_user_id: uuid(), due: '31/12' }] });
  assert.deepEqual(fields(r), ['decisions.0.id:ID_INVALID', 'decisions.1.kind:INVALID_VALUE', 'decisions.1.text:REQUIRED_ONE_LANGUAGE', 'decisions.2.due:INVALID_DATE', 'decisions.2.owner_user_id:NOT_FOUND']);
  // Đồng bộ: Thư ký, cấp 3 thấy; cấp 2 không thấy
  const types = (c) => (c.call('sync.bootstrap', {}).data.records.MREVIEW || []).map((x) => x.code);
  assert.deepEqual(types(tk), ['XL-26-01']);
  assert.deepEqual(types(head), ['XL-26-01']);
  assert.deepEqual(types(sx), []);
  assert.equal(sx.call('mreview.stats', { review_id: id }).code, 'FORBIDDEN');
  assert.equal(head.call('mreview.stats', { review_id: id }).ok, true);
  // Cấp 2 phụ trách một quyết định thì thấy cuộc đó
  r = save(tk, env, id, { decisions: [{ id: uuid(), kind: 'RESOURCE', text_vi: 'Bổ sung thợ điện', owner_user_id: uidOf(env, 'SX2'), due: '2027-03-31' }] });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(types(sx), ['XL-26-01']);
  // Lần thứ hai trong năm: XL-26-02
  assert.equal(newReview(owner).code, 'XL-26-02');
});

test('số liệu tự gom theo kỳ: khiếu nại, SCAR, sản phẩm không phù hợp, khắc phục, tài liệu, phủ điều khoản, hồ sơ (khớp báo cáo Tình trạng hồ sơ)', () => {
  const { env, owner, tk } = seeded();
  seedActivity(owner);
  const { id } = newReview(tk);
  const r = tk.call('mreview.stats', { review_id: id });
  assert.equal(r.ok, true, JSON.stringify(r));
  const st = r.data.stats;
  assert.equal(st.live, true);
  const d = st.data, b = blocks(st);
  assert.equal(d.prev, null);
  assert.equal(b.prev.prev_none, '—');
  // c1 khiếu nại
  assert.equal(d.complaint.new, 1);
  assert.equal(d.complaint.by_sev.MAJOR, 1);
  assert.equal(d.complaint.valid.PENDING, 1);
  assert.equal(b.satisfaction.cmp_sev, '0 / 1 / 0');
  // c7 SCAR
  assert.equal(d.supplier.new, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(d.supplier.parties)), [{ name: 'NCC Phụ tùng', n: 1 }]);
  assert.equal(b.supplier.scar_top, 'NCC Phụ tùng (1)');
  // c3 sản phẩm không phù hợp
  assert.equal(d.ncr.new, 1);
  assert.equal(d.ncr.by_stage.INCOMING, 1);
  assert.equal(b.process.ncr_stage, '1 / 0 / 0 / 0 / 0 / 0');
  assert.equal(d.ncr.open, 1);
  // c4 khắc phục nội bộ: phiếu ngoài kỳ không đếm là mới nhưng vẫn đang mở
  assert.equal(d.capa.new, 1);
  assert.equal(d.capa.by_source.EQUIPMENT, 1);
  assert.equal(d.capa.open, 2);
  assert.equal(b.capa.capa_src, '1 / 0 / 0 / 0 / 0 / 0 / 0');
  // c5 tài liệu + phủ điều khoản (như healthCheck coverage)
  env.g.dbReset_();
  const items = env.rows('Items').filter((x) => !x.archived_at);
  assert.equal(d.docs.items, items.length);
  assert.equal(d.docs.issued, items.filter((x) => x.status === 'ISSUED').length);
  const cov = env.g.coverageCounts_(items, env.rows('Clauses'));
  assert.equal(d.coverage.iso_covered, cov.iso_covered);
  assert.equal(d.coverage.iso_missing, cov.missing);
  // c5 hồ sơ: khớp báo cáo Tình trạng hồ sơ theo tháng 01–11/2026
  const rr = owner.call('report.run', { kind: 'RECORDS', filters: { grain: 'MONTH', end: '2026-11', n: 11 } });
  assert.equal(rr.ok, true, JSON.stringify(rr));
  const t = rr.data.report.data.totals;
  assert.equal(d.records.ok, t.ok);
  assert.equal(d.records.late, t.late);
  assert.equal(d.records.tracked, t.items);
  assert.equal(d.records.cols.length, 11);
  // c6 đánh giá nội bộ: chưa có chương trình
  assert.equal(d.audit.program, null);
  assert.equal(b.audit.aud_prog_none, '—');
  // Có chương trình năm (nháp) → hiện mã + trạng thái + phủ
  assert.equal(tk.write('iaudit.program.save', { program_id: uuid(), year: 2026 }).ok, true);
  const st2 = tk.call('mreview.stats', { review_id: id }).data.stats;
  assert.equal(st2.data.audit.program.code, 'DG-26');
  const row = st2.blocks.audit.find((x) => x.k === 'mr.s.aud_prog');
  assert.equal(row.s, 'aud.prog.state.DRAFT');
  // Phạm vi Cơ điện: số liệu chỉ của bộ phận trong phạm vi
  setScope(env, 'CĐ');
  const st3 = tk.call('mreview.stats', { review_id: id }).data.stats.data;
  assert.equal(st3.scope, 'CĐ');
  assert.equal(st3.docs.items, items.filter((x) => x.dept_code === 'CĐ').length);
  assert.equal(st3.capa.new, 1);
});

test('ghi Đã họp (PIN, kiểm trước PIN) chốt số liệu; đầu vào khóa; quyết định: người phụ trách báo xong, Thư ký hủy; mở lại; lần sau hiện tình trạng', () => {
  const { env, owner, tk } = seeded();
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  const kd = userClient(env, 'KD2', 2, '583921', { depts: 'KD' });
  seedActivity(owner);
  const { id } = newReview(tk);
  // Thiếu ngày họp, chủ trì, kết luận → báo trước khi hỏi PIN
  let r = tk.write('mreview.hold', { review_id: id }, { expected_version: mr(env, id).record_version });
  assert.deepEqual(fields(r), ['chair_name:REQUIRED', 'conclusion:REQUIRED_ONE_LANGUAGE', 'meeting_date:REQUIRED']);
  r = save(tk, env, id, { meeting_date: '2026-12-10', chair_name: 'Giám đốc nhà máy', conclusion_vi: 'Hệ thống phù hợp, có hiệu lực' });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = tk.write('mreview.hold', { review_id: id }, { expected_version: mr(env, id).record_version });
  assert.deepEqual(fields(r), ['meeting_date:MR_MEETING_FUTURE']);
  const d1 = uuid(), d2 = uuid(), d3 = uuid();
  r = save(tk, env, id, { meeting_date: '2026-12-04', attendees_text: 'Giám đốc, Thư ký ISO, trưởng các bộ phận', decisions: [
    { id: d1, kind: 'IMPROVE', text_vi: 'Lắp cảm biến nhiệt máy nén khí', owner_user_id: uidOf(env, 'SX2'), due: '2027-01-31' },
    { id: d2, kind: 'RESOURCE', text_vi: 'Tuyển thêm 1 thợ điện', owner_name: 'Phòng nhân sự', due: '2026-12-01' },
    { id: d3, kind: 'CHANGE', text_zh: '修订维修程序' }] });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(owner.write('mreview.hold', { review_id: id }, { expected_version: mr(env, id).record_version }).code, 'REAUTH_REQUIRED');
  assert.equal(sx.write('mreview.hold', { review_id: id }, { expected_version: mr(env, id).record_version }).code, 'FORBIDDEN');
  assert.equal(tk.write('mreview.hold', { review_id: id }, { expected_version: mr(env, id).record_version }).code, 'REAUTH_REQUIRED');
  assert.equal(tk.pin(TK_PIN).ok, true);
  r = tk.write('mreview.hold', { review_id: id }, { expected_version: mr(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  let row = mr(env, id);
  assert.equal(row.state, 'HELD');
  assert.equal(row.stats_json.live, false);
  assert.equal(row.stats_json.data.capa.new, 1);
  // Số liệu đã chốt: thêm khắc phục mới trong kỳ không đổi bản chốt
  owner.write('capa.save', { capa_id: uuid(), source: 'PROCESS', dept_code: 'CĐ', found_date: '2026-11-20', due_date: '2026-12-31', problem_vi: 'Sau khi họp' });
  assert.equal(tk.call('mreview.stats', { review_id: id }).data.stats.data.capa.new, 1);
  // Đầu vào khóa; kết luận, quyết định sửa được
  r = save(tk, env, id, { in_context_vi: 'Sửa sau họp' });
  assert.deepEqual(fields(r), ['state:MR_HELD_LOCKED']);
  r = save(tk, env, id, { period_to: '2026-10-31' });
  assert.deepEqual(fields(r), ['state:MR_HELD_LOCKED']);
  r = save(tk, env, id, { conclusion_zh: '体系适宜有效' });
  assert.equal(r.ok, true, JSON.stringify(r));
  // Quyết định: người phụ trách báo xong; người khác bị cấm; người phụ trách không hủy được
  assert.equal(kd.write('mreview.decision', { review_id: id, decision_id: d1, state: 'DONE' }, { expected_version: mr(env, id).record_version }).code, 'FORBIDDEN');
  assert.equal(sx.write('mreview.decision', { review_id: id, decision_id: d1, state: 'CANCELLED', note: 'x' }, { expected_version: mr(env, id).record_version }).code, 'FORBIDDEN');
  r = sx.write('mreview.decision', { review_id: id, decision_id: d1, state: 'DONE', done_date: '2026-12-20' }, { expected_version: mr(env, id).record_version });
  assert.deepEqual(fields(r), ['done_date:DATE_FUTURE']);
  r = sx.write('mreview.decision', { review_id: id, decision_id: d1, state: 'DONE', note: 'Đã lắp 2 cảm biến' }, { expected_version: mr(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  row = mr(env, id);
  assert.equal(row.decisions_json.find((x) => x.id === d1).state, 'DONE');
  assert.equal(row.decisions_json.find((x) => x.id === d1).done_date, '2026-12-05');
  r = tk.write('mreview.decision', { review_id: id, decision_id: d3, state: 'CANCELLED' }, { expected_version: mr(env, id).record_version });
  assert.deepEqual(fields(r), ['note:REQUIRED']);
  assert.equal(tk.write('mreview.decision', { review_id: id, decision_id: d3, state: 'CANCELLED', note: 'Gộp vào quyết định 1' }, { expected_version: mr(env, id).record_version }).ok, true);
  // Quyết định đã xong / hủy không bỏ khỏi danh sách được
  r = save(tk, env, id, { decisions: [{ id: d2, kind: 'RESOURCE', text_vi: 'Tuyển thêm 1 thợ điện', owner_name: 'Phòng nhân sự', due: '2026-12-01' }] });
  assert.deepEqual(fields(r), ['decisions:MR_DECISION_KEEP']);
  // Mở lại khi đã có quyết định xong → báo trước PIN
  r = tk.write('mreview.hold', { review_id: id, undo: true }, { expected_version: mr(env, id).record_version });
  assert.deepEqual(fields(r), ['decisions:MR_DECISION_DONE']);
  // Hủy cuộc đã họp: không được
  assert.equal(tk.write('mreview.cancel', { review_id: id, reason: 'x' }, { expected_version: mr(env, id).record_version }).code, 'VALIDATION_ERROR');
  // Lần sau: mục a hiện tình trạng quyết định lần trước (1 xong, 1 quá hạn, 1 hủy)
  const n2 = newReview(tk, { period_from: '2026-12-01', period_to: '2026-12-05' });
  const st = tk.call('mreview.stats', { review_id: n2.id }).data.stats;
  assert.equal(st.data.prev.code, 'XL-26-01');
  assert.equal(st.data.prev.done, 1);
  assert.equal(st.data.prev.late, 1);
  assert.equal(st.data.prev.cancelled, 1);
  assert.equal(blocks(st).prev.prev_dec, '1 / 1 / 1 / 1');
  const late = st.data.prev.decisions.find((x) => x.id === d2);
  assert.equal(late.owner, 'Phòng nhân sự');
  assert.equal(late.late, true);
  // Hủy cuộc đang chuẩn bị (PIN đã nhập trong 5 phút)
  r = tk.write('mreview.cancel', { review_id: n2.id }, { expected_version: mr(env, n2.id).record_version });
  assert.equal(r.code, 'VALIDATION_ERROR');
  r = tk.write('mreview.cancel', { review_id: n2.id, reason: 'Lập nhầm' }, { expected_version: mr(env, n2.id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(mr(env, n2.id).state, 'CANCELLED');
  assert.equal(tk.call('mreview.stats', { review_id: n2.id }).code, 'VALIDATION_ERROR');
  // Mở lại được khi chưa quyết định nào xong (cuộc thứ ba)
  const n3 = newReview(tk, { meeting_date: '2026-12-05', chair_name: 'GĐ', conclusion_vi: 'Ổn' });
  assert.equal(tk.write('mreview.hold', { review_id: n3.id }, { expected_version: mr(env, n3.id).record_version }).ok, true);
  r = tk.write('mreview.hold', { review_id: n3.id, undo: true }, { expected_version: mr(env, n3.id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  row = mr(env, n3.id);
  assert.equal(row.state, 'DRAFT');
  assert.equal(row.stats_json, null);
});

test('báo cáo BM-ISO-05-01: xem trước, PDF + tên tệp, Excel; quyền; mã biểu theo Cấu hình; Trạng thái hệ thống', () => {
  const { env, owner, tk } = seeded();
  const head = userClient(env, 'SX3', 3, '583924', { depts: 'SX' });
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  seedActivity(owner);
  let h = owner.call('system.status', {}).data.checks.find((c) => c.key === 'mreview');
  assert.equal(h.status, 'OK');
  assert.match(h.value, /Chưa có cuộc xem xét đã họp · đang chuẩn bị 0/);
  const { id } = newReview(tk, { meeting_date: '2026-12-04', chair_name: 'Giám đốc nhà máy', conclusion_vi: 'Hệ thống phù hợp', in_objectives_vi: 'Đạt 4/5 mục tiêu' });
  let r = tk.call('report.run', { kind: 'MREVIEW', filters: { review_id: id } });
  assert.equal(r.ok, true, JSON.stringify(r));
  let lay = r.data.layout;
  assert.equal(r.data.report.title_vi, 'Báo cáo đầu vào xem xét lãnh đạo');
  assert.equal(r.data.report.form_code, 'BM-ISO-05-01');
  const heads = lay.sections.map((s) => s.heading || '');
  assert.ok(heads.some((x) => x.startsWith('a) Tình trạng các hành động')));
  assert.ok(heads.some((x) => x.startsWith('f) Cơ hội cải tiến')));
  const c2 = lay.sections.find((s) => (s.heading || '').startsWith('c2)'));
  assert.deepEqual(JSON.parse(JSON.stringify(c2.kv)), [['Nhận xét · 意见', 'Đạt 4/5 mục tiêu\n' + mr(env, id).in_objectives_zh]]);
  const c1 = lay.sections.find((s) => (s.heading || '').startsWith('c1)'));
  assert.ok(c1.kv.some((x) => x[0].startsWith('Khiếu nại khách hàng tiếp nhận trong kỳ') && x[1] === '1'));
  assert.equal(lay.sign.prepared_name, 'TK2');
  assert.equal(lay.sign.approved_name, 'Giám đốc nhà máy');
  assert.match(lay.notes.join('\n'), /9\.3\.2/);
  // Quyền: cấp 2 không phụ trách quyết định → FORBIDDEN; cấp 3 xem được
  assert.equal(sx.call('report.run', { kind: 'MREVIEW', filters: { review_id: id } }).code, 'FORBIDDEN');
  assert.equal(head.call('report.run', { kind: 'MREVIEW', filters: { review_id: id } }).ok, true);
  assert.deepEqual(fields(tk.call('report.run', { kind: 'MREVIEW', filters: {} })), ['filters.review_id:REQUIRED']);
  // Đã họp: tiêu đề có đầu ra, mục quyết định
  assert.equal(save(tk, env, id, { decisions: [{ id: uuid(), kind: 'IMPROVE', text_vi: 'Lắp cảm biến', owner_name: 'Tổ cơ điện', due: '2027-02-28' }] }).ok, true);
  assert.equal(tk.pin(TK_PIN).ok, true);
  assert.equal(tk.write('mreview.hold', { review_id: id }, { expected_version: mr(env, id).record_version }).ok, true);
  r = tk.call('report.run', { kind: 'MREVIEW', filters: { review_id: id } });
  lay = r.data.layout;
  assert.equal(r.data.report.title_vi, 'Đầu vào và kết quả xem xét lãnh đạo');
  const dec = lay.sections.find((s) => (s.heading || '').startsWith('Quyết định, hành động'));
  assert.equal(dec.table.rows.length, 1);
  assert.equal(dec.table.rows[0][3], 'Tổ cơ điện');
  assert.ok(lay.sections.some((s) => s.note && /chốt lúc ghi Đã họp/.test(s.note)));
  // PDF + tên tệp; Excel cùng số
  const runId = uuid();
  r = tk.write('report.save', { report_run_id: runId, kind: 'MREVIEW', filters: { review_id: id }, format: 'PDF' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.file_name, 'BC-2612-001_xem-xet-lanh-dao_XL-26-01.pdf');
  r = tk.write('report.save', { report_run_id: runId, kind: 'MREVIEW', filters: { review_id: id }, format: 'XLSX' });
  assert.equal(r.data.file_name, 'BC-2612-001_xem-xet-lanh-dao_XL-26-01.xlsx');
  // Mã biểu sửa ở Cấu hình
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  assert.equal(owner.write('settings.edit', { changes: { mreview_form_code: 'bm-cđ-15-01' }, reason: 'Phạm vi cơ điện' }).ok, true);
  assert.equal(tk.call('report.run', { kind: 'MREVIEW', filters: { review_id: id } }).data.report.form_code, 'BM-CĐ-15-01');
  h = owner.call('system.status', {}).data.checks.find((c) => c.key === 'mreview');
  assert.match(h.value, /Gần nhất XL-26-01 họp 04\/12\/2026 · đang chuẩn bị 0 · quyết định đang làm 1 · quá hạn 0/);
});

test('cập nhật từ bản 4b: chưa chạy migrateSchema — lập cuộc đầu tiên tự thêm sheet; migrateSchema báo đúng dòng nhật ký', () => {
  const env = freshServer({ now: NOW });
  ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  const bs = env.g.book_('B');
  bs.deleteSheet(bs.getSheetByName('MgmtReviews'));
  env.g.dbReset_();
  env.g.withWriteLock_(() => { const st = env.g.readState_(); env.g.stateWrite_(st, { schema_version: ['STRING', '1.0.12'] }); });
  env.g.cache_().removeAll(['sys:state']);
  const tk = userClient(env, 'TK2', 2, TK_PIN, { depts: 'ISO', secretary: true });
  const owner2 = userClient(env, 'AD4', 4, '583930', {});
  const h = owner2.call('system.status', {}).data.checks.find((c) => c.key === 'mreview');
  assert.equal(h.status, 'WARN');
  assert.equal(tk.call('sync.bootstrap', {}).ok, true);
  const { code } = newReview(tk);
  assert.equal(code, 'XL-26-01');
  env.g.dbReset_();
  assert.ok(env.g.sheetExists_('MgmtReviews'));
  // Máy chủ khác: dán Code.gs rồi chạy migrateSchema
  const env2 = freshServer({ now: NOW });
  const b2 = env2.g.book_('B');
  b2.deleteSheet(b2.getSheetByName('MgmtReviews'));
  env2.g.dbReset_();
  env2.logs.length = 0;
  env2.g.migrateSchema();
  assert.ok(env2.logs.some((l) => l === 'migrateSchema xong. Thêm: MgmtReviews. schema_version=1.0.13'), env2.logs.join('\n'));
});
