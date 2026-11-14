// Kiểm soát tài liệu (Đợt 2, phiên 2d): phiếu đề nghị ban hành / sửa đổi / hủy (BM-ISO-02-02) — gửi, xem xét (PIN, không tự duyệt,
// cấp công ty chỉ cấp 4), soạn phiên bản theo phiếu → ban hành → Đã thực hiện; tài liệu mới theo phiếu; hủy theo phiếu → ✕; sổ phân
// phối & thu hồi (BM-ISO-02-03) — phát, ban hành lần mới → cần thu hồi, thu hồi + phát bản mới (PIN), sửa / bỏ dòng; phạm vi đồng bộ;
// 2 báo cáo mới; Trạng thái hệ thống; dán Code.gs 2d quên migrateSchema.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, uuid, OWNER_PIN } from '../helpers.mjs';

const NOW = '2026-11-12T08:00:00+07:00';
const DAY = 86400000;

function fakePdfB64(size = 3000) {
  const b = Buffer.alloc(size, 32);
  Buffer.from('%PDF-1.7\n').copy(b);
  return b.toString('base64');
}

function seeded() {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  return { env, owner };
}
const item = (env, code) => env.rows('Items').find((x) => x.code === code);
const req = (env, id) => env.rows('DocRequests').find((x) => x.request_id === id);
const ver = (env, id) => env.rows('Versions').find((x) => x.version_id === id);
const dist = (env, id) => env.rows('Distributions').find((x) => x.dist_id === id);
const uid = (env, code) => env.rows('Users').find((u) => u.employee_code === code).user_id;

/** Nháp phiên bản + PDF; trả {id, rv} */
function draft(c, env, itemId, extra = {}) {
  const id = uuid();
  let r = c.write('version.save', { version_id: id, item_id: itemId, change_summary_vi: 'Sửa theo phiếu', ...extra });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = c.write('doc.upload', { document_id: uuid(), entity_type: 'VERSION', entity_id: id, kind: 'PDF', mime_type: 'application/pdf', file_name: 'x.pdf', content_b64: fakePdfB64() });
  assert.equal(r.ok, true, JSON.stringify(r));
  return { id, rv: r.record_version };
}

/** Gửi duyệt → duyệt → ban hành (người duyệt / ban hành đã nhập PIN) */
function issue(env, author, approver, issuer, id, rv) {
  let r = author.write('version.submit', { version_id: id }, { expected_version: rv });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = approver.write('version.approve', { version_id: id }, { expected_version: ver(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = issuer.write('version.issue', { version_id: id }, { expected_version: ver(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
}

test('phiếu sửa đổi: gửi → DN-2611-001, người đề nghị / trưởng BP khác không xem xét, trưởng BP chấp thuận (PIN) → soạn theo phiếu → hủy bản nháp bỏ gắn → ban hành → Đã thực hiện', () => {
  const { env, owner } = seeded();
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  const head = userClient(env, 'SX3', 3, '583924', { depts: 'SX' });
  const kd3 = userClient(env, 'KD3', 3, '583925', { depts: 'KD' });
  const tk = userClient(env, 'TK2', 2, '583922', { depts: 'ISO', secretary: true });
  const it = item(env, 'BM-SX-02-01');
  const id = uuid();
  // Thiếu lý do / nội dung sửa → lỗi; loại lạ → lỗi
  let r = sx.write('docreq.save', { request_id: id, req_type: 'REVISE', item_id: it.item_id });
  assert.equal(r.code, 'VALIDATION_ERROR');
  assert.deepEqual(r.errors.map((e) => e.field).sort(), ['content', 'reason']);
  assert.equal(sx.write('docreq.save', { request_id: id, req_type: 'XX', item_id: it.item_id, reason_vi: 'a' }).errors[0].field, 'req_type');
  r = sx.write('docreq.save', { request_id: id, req_type: 'REVISE', item_id: it.item_id, reason_vi: 'Thêm cột thời gian dừng máy', content_vi: 'Thêm cột "Dừng máy (phút)"', want_date: '2026-11-30' });
  assert.equal(r.ok, true, JSON.stringify(r));
  let q = req(env, id);
  assert.equal(q.code, 'DN-2611-001');
  assert.equal(q.state, 'SUBMITTED');
  assert.equal(q.dept_code, 'SX');
  assert.equal(q.level, 'DEPT');
  assert.equal(q.submitted_by, uid(env, 'SX2'));
  assert.ok(q.reason_zh, 'dịch máy sang tiếng Trung');
  // Sửa phiếu đang chờ: người đề nghị được, người khác bộ phận không
  r = sx.write('docreq.save', { request_id: id, content_vi: 'Thêm cột "Dừng máy (phút)" và "Nguyên nhân"' }, { expected_version: q.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  q = req(env, id);
  assert.equal(kd3.write('docreq.save', { request_id: id, content_vi: 'x' }, { expected_version: q.record_version }).code, 'FORBIDDEN');
  // Xem xét: người đề nghị (cấp 2), trưởng BP khác bộ phận, Thư ký ISO cấp 2 → FORBIDDEN trước khi hỏi PIN
  assert.equal(sx.write('docreq.approve', { request_id: id }, { expected_version: q.record_version }).code, 'FORBIDDEN');
  assert.equal(kd3.write('docreq.approve', { request_id: id }, { expected_version: q.record_version }).code, 'FORBIDDEN');
  assert.equal(tk.write('docreq.approve', { request_id: id }, { expected_version: q.record_version }).code, 'FORBIDDEN');
  assert.equal(head.write('docreq.approve', { request_id: id }, { expected_version: q.record_version }).code, 'REAUTH_REQUIRED');
  head.pin('583924');
  r = head.write('docreq.approve', { request_id: id, note: 'Đồng ý' }, { expected_version: q.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  q = req(env, id);
  assert.equal(q.state, 'APPROVED');
  assert.equal(q.decided_by, uid(env, 'SX3'));
  assert.equal(q.decide_note, 'Đồng ý');
  // Đã chấp thuận: không sửa, không xem xét lại
  assert.equal(sx.write('docreq.save', { request_id: id, content_vi: 'y' }, { expected_version: q.record_version }).errors[0].code, 'STATUS_INVALID');
  // Phiếu của tài liệu khác không dùng được
  assert.equal(sx.write('version.save', { version_id: uuid(), item_id: item(env, 'BM-SX-02-03').item_id, change_summary_vi: 'x', request_id: id }).errors[0].code, 'REQUEST_ITEM');
  // Soạn theo phiếu: phiếu gắn phiên bản; hủy bản nháp → phiếu bỏ gắn (vẫn Đã chấp thuận)
  let d = draft(sx, env, it.item_id, { request_id: id });
  assert.equal(ver(env, d.id).request_id, id);
  assert.equal(req(env, id).version_id, d.id);
  // Rút phiếu khi đang có bản soạn theo phiếu → phải hủy bản đó trước
  tk.pin('583922');
  assert.equal(tk.write('docreq.cancel', { request_id: id }, { expected_version: req(env, id).record_version }).errors[0].code, 'REQUEST_VERSION_OPEN');
  r = sx.write('version.cancel', { version_id: d.id, reason: 'Soạn lại' }, { expected_version: d.rv });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(req(env, id).version_id, '');
  assert.equal(req(env, id).state, 'APPROVED');
  d = draft(sx, env, it.item_id, { request_id: id });
  issue(env, sx, head, tk, d.id, d.rv);
  q = req(env, id);
  assert.equal(q.state, 'DONE');
  assert.equal(q.version_id, d.id);
  assert.equal(q.done_by, uid(env, 'TK2'));
  assert.match(q.done_note, /Ban hành lần 02/);
  assert.equal(item(env, 'BM-SX-02-01').current_rev, '02');
  // Phiếu đã thực hiện không dùng lại được
  assert.equal(sx.write('version.save', { version_id: uuid(), item_id: it.item_id, change_summary_vi: 'x', request_id: id }).errors[0].code, 'REQUEST_NOT_APPROVED');
  // Số phiếu tiếp theo trong tháng
  r = sx.write('docreq.save', { request_id: uuid(), req_type: 'REVISE', item_id: it.item_id, reason_vi: 'b', content_vi: 'c' });
  assert.equal(r.data.record.code, 'DN-2611-002');
  owner.pin(OWNER_PIN);
});

test('cấp công ty chỉ cấp 4 xem xét (Quản trị tự xem xét được); không chấp thuận cần lý do; rút lại; Thư ký đánh dấu đã thực hiện', () => {
  const { env, owner } = seeded();
  const iso3 = userClient(env, 'ISO3', 3, '583930', { depts: 'ISO' });
  const tk = userClient(env, 'TK2', 2, '583922', { depts: 'ISO', secretary: true });
  const it = item(env, 'BM-ISO-02-01');
  const a = uuid(), b = uuid(), c = uuid();
  for (const id of [a, b, c]) assert.equal(tk.write('docreq.save', { request_id: id, req_type: 'REVISE', item_id: it.item_id, reason_vi: 'r', content_vi: 'n', requester_name: 'Nguyễn Văn A (Kho)' }).ok, true);
  assert.equal(req(env, a).level, 'COMPANY');
  assert.equal(req(env, a).requester_name, 'Nguyễn Văn A (Kho)');
  // Trưởng bộ phận ISO cấp 3 không xem xét tài liệu cấp công ty
  assert.equal(iso3.write('docreq.approve', { request_id: a }, { expected_version: 1 }).code, 'FORBIDDEN');
  owner.pin(OWNER_PIN);
  // Không chấp thuận: lý do bắt buộc
  let r = owner.write('docreq.reject', { request_id: a }, { expected_version: 1 });
  assert.equal(r.errors[0].code, 'REQUIRED');
  r = owner.write('docreq.reject', { request_id: a, reason: 'Chưa cần thiết' }, { expected_version: 1 });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(req(env, a).state, 'REJECTED');
  assert.equal(req(env, a).decide_note, 'Chưa cần thiết');
  // Owner tự đề nghị rồi tự xem xét (admin_self_approval)
  const o = uuid();
  assert.equal(owner.write('docreq.save', { request_id: o, req_type: 'REVISE', item_id: it.item_id, reason_vi: 'r', content_vi: 'n' }).ok, true);
  assert.equal(owner.write('docreq.approve', { request_id: o }, { expected_version: 1 }).ok, true);
  // Rút lại: chờ xem xét — người gửi (Thư ký); đã chấp thuận — Thư ký
  assert.equal(tk.write('docreq.cancel', { request_id: b, reason: 'Trùng phiếu' }, { expected_version: 1 }).ok, true);
  assert.equal(req(env, b).state, 'CANCELLED');
  assert.equal(owner.write('docreq.approve', { request_id: c }, { expected_version: 1 }).ok, true);
  // Đã thực hiện (việc làm ngoài app): Thư ký, PIN, ghi chú bắt buộc
  assert.equal(tk.write('docreq.done', { request_id: c, note: 'x' }, { expected_version: 2 }).code, 'REAUTH_REQUIRED');
  tk.pin('583922');
  assert.equal(tk.write('docreq.done', { request_id: c }, { expected_version: 2 }).errors[0].code, 'REQUIRED');
  r = tk.write('docreq.done', { request_id: c, note: 'Đã sửa trên bản giấy, chờ nhập lại danh mục' }, { expected_version: 2 });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(req(env, c).state, 'DONE');
  assert.equal(iso3.write('docreq.done', { request_id: o, note: 'x' }, { expected_version: 2 }).code, 'FORBIDDEN');
});

test('phiếu ban hành mới: trong bộ phận mình; mã trùng báo lỗi; Thư ký thêm vào danh mục theo phiếu → soạn → ban hành → Đã thực hiện. Phiếu hủy → đặt ✕ theo phiếu', () => {
  const { env, owner } = seeded();
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  owner.pin(OWNER_PIN);
  // Cấp 2 SX đề nghị tài liệu mới cho bộ phận khác → FORBIDDEN
  assert.equal(sx.write('docreq.save', { request_id: uuid(), req_type: 'NEW', dept_code: 'CL', title_vi: 'x', reason_vi: 'y' }).code, 'FORBIDDEN');
  assert.equal(sx.write('docreq.save', { request_id: uuid(), req_type: 'NEW', dept_code: 'SX', new_code: 'BM-SX-02-01', title_vi: 'x', reason_vi: 'y' }).errors[0].code, 'CODE_DUPLICATE');
  const n = uuid();
  let r = sx.write('docreq.save', { request_id: n, req_type: 'NEW', dept_code: 'SX', new_code: 'bm-sx-03-01', new_kind: 'FORM', title_vi: 'Sổ theo dõi khuôn in', reason_vi: 'Chưa có biểu theo dõi khuôn' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(req(env, n).new_code, 'BM-SX-03-01');
  assert.equal(req(env, n).level, 'DEPT');
  assert.equal(owner.write('docreq.approve', { request_id: n }, { expected_version: 1 }).ok, true);
  // Thêm vào danh mục theo phiếu
  const newId = uuid();
  r = owner.write('item.edit', { item_id: newId, code: 'BM-SX-03-01', dept_code: 'SX', name_vi: 'Sổ theo dõi khuôn in', request_id: n });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(req(env, n).item_id, newId);
  assert.equal(req(env, n).state, 'APPROVED');
  // Phiếu đã gắn tài liệu không gắn tài liệu khác
  assert.equal(owner.write('item.edit', { item_id: uuid(), code: 'BM-SX-03-02', dept_code: 'SX', name_vi: 'x', request_id: n }).errors[0].code, 'REQUEST_ITEM');
  const d = draft(owner, env, newId, { request_id: n });
  issue(env, owner, owner, owner, d.id, d.rv);
  assert.equal(req(env, n).state, 'DONE');
  assert.equal(item(env, 'BM-SX-03-01').status, 'ISSUED');
  assert.equal(item(env, 'BM-SX-03-01').current_rev, '01');
  // Phiếu hủy → đặt ✕ theo phiếu (lý do mặc định ghi số phiếu)
  const cx = uuid();
  const it = item(env, 'BM-SX-02-03');
  assert.equal(sx.write('docreq.save', { request_id: cx, req_type: 'CANCEL', item_id: it.item_id, reason_vi: 'Gộp vào BM-SX-02-01' }).ok, true);
  assert.equal(owner.write('docreq.approve', { request_id: cx }, { expected_version: 1 }).ok, true);
  r = owner.write('item.setNa', { item_id: it.item_id, na: true, request_id: cx }, { expected_version: it.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(item(env, 'BM-SX-02-03').status, 'NA');
  assert.match(item(env, 'BM-SX-02-03').na_reason, /DN-2611-002/);
  assert.equal(req(env, cx).state, 'DONE');
  // Phiếu hủy biểu đã ✕ → lỗi
  assert.equal(sx.write('docreq.save', { request_id: uuid(), req_type: 'CANCEL', item_id: it.item_id, reason_vi: 'x' }).errors[0].code, 'ITEM_NA');
});

test('phạm vi: cấp 2 bộ phận khác không nhận phiếu, sổ phân phối; cấp 1 không nhận; Thư ký nhận tất cả', () => {
  const { env, owner } = seeded();
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  const kd = userClient(env, 'KD2', 2, '583921', { depts: 'KD' });
  const sx1 = userClient(env, 'SX1', 1, '583926', { depts: 'SX' });
  const tk = userClient(env, 'TK2', 2, '583922', { depts: 'ISO', secretary: true });
  const it = item(env, 'BM-SX-02-01');
  // Cấp 2 KD đề nghị sửa tài liệu chung của ISO (xem được) → phiếu thuộc bộ phận ISO
  const iso = item(env, 'BM-ISO-02-04');
  assert.equal(kd.write('docreq.save', { request_id: uuid(), req_type: 'REVISE', item_id: iso.item_id, reason_vi: 'r', content_vi: 'c' }).ok, true);
  // Cấp 2 KD không xem được biểu SX → không đề nghị được
  assert.equal(kd.write('docreq.save', { request_id: uuid(), req_type: 'REVISE', item_id: it.item_id, reason_vi: 'r', content_vi: 'c' }).code, 'FORBIDDEN');
  assert.equal(sx.write('docreq.save', { request_id: uuid(), req_type: 'REVISE', item_id: it.item_id, reason_vi: 'r', content_vi: 'c' }).ok, true);
  assert.equal(tk.write('dist.issue', { item_id: it.item_id, rows: [{ dist_id: uuid(), dept_code: 'SX', holder: 'Tổ in 1', copies: 2 }] }).ok, true);
  const got = (c) => {
    const b = c.call('sync.bootstrap', {});
    assert.equal(b.ok, true, JSON.stringify(b).slice(0, 300));
    return { req: (b.data.records.DOCREQ || []).length, dist: (b.data.records.DIST || []).length };
  };
  assert.deepEqual(got(sx), { req: 1, dist: 1 });
  assert.deepEqual(got(kd), { req: 1, dist: 0 }); // chỉ phiếu của mình (thuộc ISO)
  assert.deepEqual(got(sx1), { req: 0, dist: 0 });
  assert.deepEqual(got(tk), { req: 2, dist: 1 });
  assert.deepEqual(got(owner), { req: 2, dist: 1 });
});

test('sổ phân phối: Thư ký phát bản lần đang hiệu lực; ban hành lần mới → cần thu hồi; quá 7 ngày → Trạng thái hệ thống cảnh báo; thu hồi + phát bản mới (PIN); sửa, bỏ dòng ghi nhầm', () => {
  const { env, owner } = seeded();
  const head = userClient(env, 'SX3', 3, '583924', { depts: 'SX' });
  const tk = userClient(env, 'TK2', 2, '583922', { depts: 'ISO', secretary: true });
  const it = item(env, 'BM-SX-02-01');
  const a = uuid(), b = uuid(), c = uuid();
  // Không phải Thư ký → FORBIDDEN; biểu chưa ban hành → lỗi; nơi nhận sai → lỗi theo dòng
  assert.equal(head.write('dist.issue', { item_id: it.item_id, rows: [{ dist_id: a, dept_code: 'SX', holder: 'x' }] }).code, 'FORBIDDEN');
  assert.equal(tk.write('dist.issue', { item_id: item(env, 'BM-SX-02-03').item_id, rows: [{ dist_id: a, dept_code: 'SX', holder: 'x' }] }).errors[0].code, 'ITEM_NOT_ISSUED');
  let r = tk.write('dist.issue', { item_id: it.item_id, rows: [{ dist_id: a, dept_code: 'XX', holder: 'x' }, { dist_id: b, dept_code: 'SX', copies: 0 }] });
  assert.deepEqual(r.errors.map((e) => e.field), ['rows.0.dept_code', 'rows.1.copies']);
  assert.equal(tk.write('dist.issue', { item_id: it.item_id, dist_date: '2026-12-01', rows: [{ dist_id: a, dept_code: 'SX' }] }).errors[0].code, 'DATE_FUTURE');
  r = tk.write('dist.issue', { item_id: it.item_id, dist_date: '2026-11-10', note: 'Phát lần đầu', rows: [
    { dist_id: a, dept_code: 'SX', holder: 'Tổ in 1 – kệ biểu mẫu', copies: 2 },
    { dist_id: b, dept_code: 'SX', holder: 'Tổ in 2', copies: 1 },
    { dist_id: c, dept_code: 'CL', holder: 'Phòng QC', copies: 1 }] });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(dist(env, a).rev, '01'); // ● nhập Excel không ghi lần = 01
  assert.equal(dist(env, a).state, 'ACTIVE');
  assert.equal(dist(env, a).dist_date, '2026-11-10');
  const g = env.g;
  g.dbReset_();
  assert.equal(g.distDue_(dist(env, a), item(env, 'BM-SX-02-01')), '');
  let h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'doc_control');
  assert.equal(h.status, 'OK');
  assert.match(h.value, /Bản in đang phát 3 nơi \(4 bản\) · cần thu hồi 0/);
  // Sửa dòng ghi nhầm (số bản), bỏ dòng ghi nhầm
  r = tk.write('dist.edit', { dist_id: b, copies: 3 }, { expected_version: 1 });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(dist(env, b).copies, 3);
  assert.equal(tk.write('dist.edit', { dist_id: b, void: true }, { expected_version: 2 }).errors[0].code, 'REQUIRED');
  assert.equal(tk.write('dist.edit', { dist_id: b, void: true, reason: 'Ghi nhầm' }, { expected_version: 2 }).ok, true);
  assert.equal(dist(env, b).state, 'VOID');
  // Ban hành lần 02 → hai dòng còn lại cần thu hồi
  owner.pin(OWNER_PIN);
  const vid = uuid();
  assert.equal(owner.write('version.save', { version_id: vid, item_id: it.item_id, change_summary_vi: 'Lần 2' }).ok, true);
  r = owner.write('doc.upload', { document_id: uuid(), entity_type: 'VERSION', entity_id: vid, kind: 'PDF', mime_type: 'application/pdf', file_name: 'x.pdf', content_b64: fakePdfB64() });
  issue(env, owner, owner, owner, vid, r.record_version);
  g.dbReset_();
  const it2 = item(env, 'BM-SX-02-01');
  assert.equal(g.distDue_(dist(env, a), it2), 'DUE');
  assert.equal(g.distDue_(dist(env, c), it2), 'DUE');
  h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'doc_control');
  assert.equal(h.status, 'OK'); // mới ban hành, chưa quá 7 ngày
  assert.match(h.value, /cần thu hồi 2/);
  env.clock.advance(8 * DAY);
  h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'doc_control');
  assert.equal(h.status, 'WARN');
  assert.match(h.value, /quá hạn 2/);
  // Thu hồi: PIN; dòng đã bỏ không thu hồi được; thu hồi + phát bản lần 02 cho cùng nơi nhận
  const na = uuid(), nc = uuid();
  assert.equal(tk.write('dist.recall', { dist_ids: [a, c], reissue: true, new_ids: { [a]: na, [c]: nc } }).code, 'REAUTH_REQUIRED');
  tk.pin('583922');
  assert.equal(tk.write('dist.recall', { dist_ids: [b] }).errors[0].code, 'STATUS_INVALID');
  assert.equal(head.write('dist.recall', { dist_ids: [a] }).code, 'FORBIDDEN');
  r = tk.write('dist.recall', { dist_ids: [a, c], recalled_date: '2026-11-19', note: 'Đã hủy bản cũ', reissue: true, new_ids: { [a]: na, [c]: nc } });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.recalled, 2);
  assert.equal(r.data.reissued, 2);
  assert.equal(dist(env, a).state, 'RECALLED');
  assert.equal(dist(env, a).recalled_date, '2026-11-19');
  assert.equal(dist(env, a).replaced_by_id, na);
  assert.equal(dist(env, na).rev, '02');
  assert.equal(dist(env, na).holder, 'Tổ in 1 – kệ biểu mẫu');
  assert.equal(dist(env, na).copies, 2);
  assert.equal(dist(env, na).version_id, vid);
  h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'doc_control');
  assert.equal(h.status, 'OK');
  assert.match(h.value, /Bản in đang phát 2 nơi \(3 bản\) · cần thu hồi 0/);
  // Đặt ✕ → bản đang dùng cần thu hồi
  owner.pin(OWNER_PIN);
  r = owner.write('item.setNa', { item_id: it.item_id, na: true, reason: 'Ngừng dùng' }, { expected_version: item(env, 'BM-SX-02-01').record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  g.dbReset_();
  assert.equal(g.distDue_(dist(env, na), item(env, 'BM-SX-02-01')), 'DUE');
  // Gửi trùng thao tác (cùng operation_id) không thu hồi hai lần
  const op = uuid();
  const r1 = tk.call('dist.recall', { dist_ids: [na] }, { operation_id: op });
  const r2 = tk.call('dist.recall', { dist_ids: [na] }, { operation_id: op });
  assert.equal(r1.ok, true);
  assert.equal(r2.code, 'DUPLICATE_OPERATION');
});

test('báo cáo Sổ phân phối & thu hồi, Phiếu đề nghị (một phiếu + sổ theo năm): quyền, số liệu, PDF có tên người đề nghị / người xem xét', () => {
  const { env, owner } = seeded();
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  const sx1 = userClient(env, 'SX1', 1, '583926', { depts: 'SX' });
  const it = item(env, 'BM-SX-02-01');
  owner.pin(OWNER_PIN);
  const d1 = uuid(), d2 = uuid();
  assert.equal(owner.write('dist.issue', { item_id: it.item_id, rows: [{ dist_id: d1, dept_code: 'SX', holder: 'Tổ in 1', copies: 2 }, { dist_id: d2, dept_code: 'CL', holder: 'QC', copies: 1 }] }).ok, true);
  assert.equal(sx1.call('report.run', { kind: 'DIST', filters: {} }).code, 'FORBIDDEN');
  let r = sx.call('report.run', { kind: 'DIST', filters: {} });
  assert.equal(r.ok, true, JSON.stringify(r).slice(0, 300));
  assert.equal(r.data.report.form_code, 'BM-ISO-02-03');
  assert.deepEqual(r.data.report.data.depts.map((x) => x.dept_code), ['SX', 'CL']);
  assert.equal(r.data.layout.tiles[1].value, '3');
  r = sx.call('report.run', { kind: 'DIST', filters: { dept: 'CL', state: 'DUE' } });
  assert.equal(r.data.report.rows, 0);
  assert.equal(sx.call('report.run', { kind: 'DIST', filters: { state: 'XX' } }).code, 'VALIDATION_ERROR');
  // Phiếu
  const q = uuid();
  assert.equal(sx.write('docreq.save', { request_id: q, req_type: 'REVISE', item_id: it.item_id, reason_vi: 'Thêm cột', content_vi: 'Cột dừng máy' }).ok, true);
  assert.equal(owner.write('docreq.approve', { request_id: q, note: 'OK' }, { expected_version: 1 }).ok, true);
  r = sx.call('report.run', { kind: 'DOCREQ', filters: { request_id: q } });
  assert.equal(r.ok, true, JSON.stringify(r).slice(0, 300));
  assert.equal(r.data.report.form_code, 'BM-ISO-02-02');
  assert.equal(r.data.layout.sign.prepared_name, 'SX2');
  assert.equal(r.data.layout.sign.approved_name, 'Chủ hệ thống');
  r = sx.call('report.run', { kind: 'DOCREQ', filters: { year: 2026 } });
  assert.equal(r.data.report.rows, 1);
  assert.equal(r.data.layout.tiles[2].value, '1'); // đã chấp thuận chưa thực hiện
  assert.equal(sx.call('report.run', { kind: 'DOCREQ', filters: { year: 2027 } }).code, 'VALIDATION_ERROR');
  const s = sx.write('report.save', { report_run_id: uuid(), kind: 'DOCREQ', filters: { request_id: q }, format: 'PDF' });
  assert.equal(s.ok, true, JSON.stringify(s).slice(0, 300));
  assert.equal(s.data.file_name, 'BC-2611-001_de-nghi-tai-lieu_DN-2611-001.pdf');
  const pdf = Buffer.from(s.data.content_b64, 'base64').toString('utf8');
  for (const t of ['PHIẾU ĐỀ NGHỊ', 'BM-ISO-02-02', 'DN-2611-001', 'Người đề nghị', 'Người xem xét', 'SX2', 'Chủ hệ thống', 'Cột dừng máy']) assert.ok(pdf.includes(t), t);
  const s2 = owner.write('report.save', { report_run_id: uuid(), kind: 'DIST', filters: {}, format: 'PDF' });
  assert.equal(s2.ok, true, JSON.stringify(s2).slice(0, 300));
  const pdf2 = Buffer.from(s2.data.content_b64, 'base64').toString('utf8');
  for (const t of ['SỔ PHÂN PHỐI', 'BM-ISO-02-03', 'Tổ in 1', 'Đang dùng']) assert.ok(pdf2.includes(t), t);
});

test('dán Code.gs 2d chưa chạy migrateSchema: đăng nhập chạy, gửi phiếu tự thêm sheet; migrateSchema báo đúng dòng nhật ký', () => {
  const { env, owner } = seeded();
  const g = env.g;
  // Giả lập máy chủ 2c: chưa có DocRequests, Distributions, cột Versions.request_id
  const b = g.book_('B');
  b.deleteSheet(b.getSheetByName('DocRequests'));
  b.deleteSheet(b.getSheetByName('Distributions'));
  g.dbReset_();
  g.sh_('Versions').getRange(1, g.hdr_('Versions').idx.request_id + 1).setValue('');
  g.withWriteLock_(() => g.stateWrite_(g.readState_(), { schema_version: ['STRING', '1.0.5'] }, 'TEST'));
  g.cache_().remove('sys:state');
  g.dbReset_();
  assert.equal(owner.call('sync.bootstrap', {}).ok, true);
  const h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'doc_control');
  assert.equal(h.status, 'WARN');
  // Máy chủ khác cùng trạng thái: chạy migrateSchema bằng tay → nhật ký
  const { env: env2 } = seeded();
  const b2 = env2.g.book_('B');
  b2.deleteSheet(b2.getSheetByName('DocRequests'));
  b2.deleteSheet(b2.getSheetByName('Distributions'));
  env2.g.dbReset_();
  env2.g.sh_('Versions').getRange(1, env2.g.hdr_('Versions').idx.request_id + 1).setValue('');
  env2.g.dbReset_();
  env2.logs.length = 0;
  env2.g.migrateSchema();
  assert.ok(env2.logs.some((l) => l === 'migrateSchema xong. Thêm: Versions(request_id); DocRequests; Distributions. schema_version=1.0.14'), env2.logs.join('\n'));
  // Quên migrateSchema: gửi phiếu đầu tiên tự thêm
  const r = owner.write('docreq.save', { request_id: uuid(), req_type: 'REVISE', item_id: item(env, 'BM-SX-02-01').item_id, reason_vi: 'r', content_vi: 'c' });
  assert.equal(r.ok, true, JSON.stringify(r));
  g.dbReset_();
  assert.equal(g.sheetExists_('DocRequests'), true);
  assert.equal(g.stateGet_(g.readState_(), 'schema_version', ''), g.SCHEMA_VERSION);
});
