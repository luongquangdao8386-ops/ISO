// Phiên bản & ban hành (phiên 1b, nghiệm thu Đợt 1 mục 4): soạn → gửi duyệt → duyệt / trả lại → ban hành; người soạn không tự duyệt
// (cấp 4 được); bản cũ thành lỗi thời; hạn rà soát; đặt ✕; biểu ● nhập từ Excel chưa có tệp → gắn tệp; tải tệp qua máy chủ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, uuid, OWNER_PIN } from '../helpers.mjs';

const NOW = '2026-11-11T08:00:00+07:00';

function fakePdfB64(size = 3000) {
  const b = Buffer.alloc(size, 32);
  Buffer.from('%PDF-1.7\n').copy(b);
  return b.toString('base64');
}
function fakeXlsxB64(size = 2500) {
  const b = Buffer.alloc(size, 1);
  Buffer.from([0x50, 0x4b, 0x03, 0x04]).copy(b);
  return b.toString('base64');
}
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function seeded() {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  return { env, owner };
}
const item = (env, code) => env.rows('Items').find((x) => x.code === code);
const ver = (env, id) => env.rows('Versions').find((x) => x.version_id === id);

/** Tạo nháp + tải PDF (+ tệp gốc); trả {id, rv} */
function draft(c, env, code, { summary = 'Sửa mục 3', source = false, vtype } = {}) {
  const id = uuid();
  const it = item(env, code);
  let r = c.write('version.save', { version_id: id, item_id: it.item_id, change_summary_vi: summary, effective_date: '2026-11-20', ...(vtype ? { vtype } : {}) });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = c.write('doc.upload', { document_id: uuid(), entity_type: 'VERSION', entity_id: id, kind: 'PDF', mime_type: 'application/pdf', file_name: 'C:\\fakepath\\' + code + '.pdf', content_b64: fakePdfB64() });
  assert.equal(r.ok, true, JSON.stringify(r));
  let rv = r.record_version;
  if (source) {
    r = c.write('doc.upload', { document_id: uuid(), entity_type: 'VERSION', entity_id: id, kind: 'SOURCE', mime_type: XLSX, file_name: code + '.xlsx', content_b64: fakeXlsxB64() });
    assert.equal(r.ok, true, JSON.stringify(r));
    rv = r.record_version;
  }
  return { id, rv };
}

test('soạn → gửi duyệt → trưởng bộ phận duyệt → Thư ký ISO ban hành: lần 02, bản cũ lỗi thời, hạn rà soát +12 tháng', () => {
  const { env, owner } = seeded();
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  const head = userClient(env, 'SX3', 3, '583924', { depts: 'SX' });
  const tk = userClient(env, 'TK2', 2, '583922', { depts: 'ISO', secretary: true });
  // Biểu ● lần 1 nhập từ Excel (chưa có tệp): ban hành lần 02 qua app
  const it0 = item(env, 'BM-SX-02-01');
  assert.equal(it0.status, 'ISSUED');
  assert.equal(it0.file_missing, true);
  const { id, rv } = draft(sx, env, 'BM-SX-02-01', { source: true });
  let v = ver(env, id);
  assert.equal(v.rev, '02');
  assert.equal(v.state, 'DRAFT');
  assert.equal(v.author_id, env.rows('Users').find((u) => u.employee_code === 'SX2').user_id);
  assert.equal(v.pdf_file_name, 'BM-SX-02-01.pdf'); // bỏ đường dẫn C:\fakepath\
  assert.equal(v.source_file_name, 'BM-SX-02-01.xlsx');
  assert.equal(v.source_mime, XLSX);
  // Một biểu chỉ một bản đang mở
  let r = sx.write('version.save', { version_id: uuid(), item_id: it0.item_id, change_summary_vi: 'x' });
  assert.equal(r.errors[0].code, 'VERSION_OPEN');
  r = sx.write('version.submit', { version_id: id }, { expected_version: rv });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(ver(env, id).state, 'IN_REVIEW');
  // Người soạn (cấp 2) không duyệt: FORBIDDEN trước khi hỏi PIN (chưa có reauth_token)
  r = sx.write('version.approve', { version_id: id }, { expected_version: r.record_version });
  assert.equal(r.code, 'FORBIDDEN');
  // Thư ký ISO cấp 2 không duyệt (chỉ ban hành)
  assert.equal(tk.write('version.approve', { version_id: id }, { expected_version: ver(env, id).record_version }).code, 'FORBIDDEN');
  // Trưởng bộ phận: chưa nhập PIN → REAUTH_REQUIRED; nhập PIN → duyệt
  r = head.write('version.approve', { version_id: id }, { expected_version: ver(env, id).record_version });
  assert.equal(r.code, 'REAUTH_REQUIRED');
  head.pin('583924');
  r = head.write('version.approve', { version_id: id, note: 'Đồng ý' }, { expected_version: ver(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  v = ver(env, id);
  assert.equal(v.state, 'APPROVED');
  assert.equal(v.approve_note, 'Đồng ý');
  // Trưởng bộ phận không ban hành (chỉ Thư ký ISO, cấp 4)
  assert.equal(head.write('version.issue', { version_id: id }, { expected_version: v.record_version }).code, 'FORBIDDEN');
  tk.pin('583922');
  r = tk.write('version.issue', { version_id: id }, { expected_version: v.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  v = ver(env, id);
  assert.equal(v.state, 'ISSUED');
  assert.equal(v.issued_at, '2026-11-11');
  assert.equal(v.effective_date, '2026-11-20');
  const it1 = item(env, 'BM-SX-02-01');
  assert.equal(it1.current_version_id, id);
  assert.equal(it1.current_rev, '02');
  assert.equal(it1.issued_at, '2026-11-11');
  assert.equal(it1.review_due, '2027-11-11');
  assert.equal(it1.status, 'ISSUED');
  assert.equal(it1.file_missing, false);
  assert.equal(it1.issued_source, 'APP');
  assert.equal(r.data.item.current_rev, '02');
  // Lần 03: bản 02 thành lỗi thời
  const d3 = draft(sx, env, 'BM-SX-02-01', { summary: 'Thêm cột ca' });
  assert.equal(ver(env, d3.id).rev, '03');
  assert.equal(sx.write('version.submit', { version_id: d3.id }, { expected_version: d3.rv }).ok, true);
  assert.equal(head.write('version.approve', { version_id: d3.id }, { expected_version: ver(env, d3.id).record_version }).ok, true);
  assert.equal(tk.write('version.issue', { version_id: d3.id }, { expected_version: ver(env, d3.id).record_version }).ok, true);
  assert.equal(ver(env, id).state, 'SUPERSEDED');
  assert.equal(ver(env, id).superseded_by_id, d3.id);
  assert.equal(item(env, 'BM-SX-02-01').current_rev, '03');
  // Đồng bộ: người cấp 2 bộ phận SX nhận phiên bản; người bộ phận khác không
  const b = sx.call('sync.bootstrap', {}).data.records;
  assert.ok(b.VERSION.some((x) => x.version_id === d3.id));
  const kd = userClient(env, 'KD2', 2, '583925', { depts: 'KD' });
  assert.ok(!(kd.call('sync.bootstrap', {}).data.records.VERSION || []).some((x) => x.version_id === d3.id));
  // Nhật ký: duyệt + ban hành
  const acts = env.rows('AuditLogs').filter((a) => a.entity_id === id).map((a) => a.action);
  assert.ok(acts.includes('version.approve') && acts.includes('version.issue'), acts.join(','));
  owner.pin(OWNER_PIN);
});

test('trả lại có lý do → nháp; sửa nháp, gửi lại; cấp công ty chỉ cấp 4 duyệt; trưởng bộ phận khác bị FORBIDDEN', () => {
  const { env } = seeded();
  const tk = userClient(env, 'TK2', 2, '583922', { depts: 'ISO', secretary: true });
  const clHead = userClient(env, 'CL3', 3, '583921', { depts: 'CL' });
  const isoHead = userClient(env, 'ISO3', 3, '583926', { depts: 'ISO' });
  const adm = userClient(env, 'AD4', 4, '583927');
  // BM-ISO-03-01: ○ cấp công ty; nháp đầu tiên → ◐, lần 01
  const { id, rv } = draft(tk, env, 'BM-ISO-03-01', { summary: 'Ban hành lần đầu' });
  assert.equal(ver(env, id).rev, '01');
  assert.equal(item(env, 'BM-ISO-03-01').status, 'DRAFTING');
  assert.equal(tk.write('version.submit', { version_id: id }, { expected_version: rv }).ok, true);
  // Cấp công ty: trưởng bộ phận ISO (cấp 3) cũng không duyệt
  assert.equal(isoHead.write('version.approve', { version_id: id }, { expected_version: ver(env, id).record_version }).code, 'FORBIDDEN');
  assert.equal(clHead.write('version.return', { version_id: id, reason: 'x' }, { expected_version: ver(env, id).record_version }).code, 'FORBIDDEN');
  // Cấp 4 trả lại: thiếu lý do → lỗi; có lý do → nháp
  adm.pin('583927');
  let r = adm.write('version.return', { version_id: id, reason: '' }, { expected_version: ver(env, id).record_version });
  assert.equal(r.code, 'VALIDATION_ERROR');
  r = adm.write('version.return', { version_id: id, reason: 'Thiếu mục phạm vi' }, { expected_version: ver(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  let v = ver(env, id);
  assert.equal(v.state, 'DRAFT');
  assert.equal(v.return_reason, 'Thiếu mục phạm vi');
  // Sửa nháp (tóm tắt chỉ nhập tiếng Việt → dịch máy), sửa đè bản cũ → xung đột
  r = tk.write('version.save', { version_id: id, change_summary_vi: 'Ban hành lần đầu, thêm phạm vi' }, { expected_version: v.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(tk.write('version.save', { version_id: id, change_summary_vi: 'y' }, { expected_version: v.record_version }).code, 'VERSION_CONFLICT');
  v = ver(env, id);
  assert.equal(v.change_summary_zh, '[zh-CN] Ban hành lần đầu, thêm phạm vi');
  assert.equal(v.i18n_meta.change_summary.state, 'MACHINE');
  assert.equal(tk.write('version.submit', { version_id: id }, { expected_version: v.record_version }).ok, true);
  r = adm.write('version.approve', { version_id: id }, { expected_version: ver(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  // Đã duyệt: Thư ký ISO trả lại được (thấy sai trước khi ban hành)
  tk.pin('583922');
  r = tk.write('version.return', { version_id: id, reason: 'Sai ngày hiệu lực' }, { expected_version: ver(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(ver(env, id).approved_by, '');
  // Hủy nháp: biểu về ○ vì trước nháp là ○
  r = tk.write('version.cancel', { version_id: id, reason: 'Soạn lại' }, { expected_version: ver(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(ver(env, id).state, 'CANCELLED');
  assert.equal(item(env, 'BM-ISO-03-01').status, 'NONE');
  // Hủy rồi: số lần ban hành dùng lại 01
  const d2 = draft(tk, env, 'BM-ISO-03-01');
  assert.equal(ver(env, d2.id).rev, '01');
});

test('chỉ có owner + Thư ký ISO cấp 4: tự soạn, tự duyệt, ban hành (PIN 5 phút dùng chung); tắt admin_self_approval thì không tự duyệt', () => {
  const { env, owner } = seeded();
  const tk = userClient(env, 'TK4', 4, '583930', { secretary: true });
  const { id, rv } = draft(tk, env, 'BM-CL-04-01', { summary: 'Lần đầu' });
  assert.equal(tk.write('version.submit', { version_id: id }, { expected_version: rv }).ok, true);
  tk.pin('583930');
  let r = tk.write('version.approve', { version_id: id }, { expected_version: ver(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = tk.write('version.issue', { version_id: id }, { expected_version: ver(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(item(env, 'BM-CL-04-01').status, 'ISSUED');
  // Quản trị tắt tự duyệt
  owner.pin(OWNER_PIN);
  r = owner.write('settings.edit', { changes: { admin_self_approval: false } });
  assert.equal(r.ok, true, JSON.stringify(r));
  const d2 = draft(tk, env, 'BM-CL-04-01', { summary: 'Lần 2' });
  assert.equal(tk.write('version.submit', { version_id: d2.id }, { expected_version: d2.rv }).ok, true);
  env.g.cache_().remove('cfg:settings');
  assert.equal(tk.write('version.approve', { version_id: d2.id }, { expected_version: ver(env, d2.id).record_version }).code, 'FORBIDDEN');
  assert.equal(owner.write('version.approve', { version_id: d2.id }, { expected_version: ver(env, d2.id).record_version }).ok, true);
});

test('biểu ● nhập từ Excel chưa có tệp: Thư ký ISO gắn PDF cho lần đang hiệu lực, ban hành thẳng (giữ lần, ngày ban hành); cờ chưa có tệp tắt', () => {
  const { env } = seeded();
  const tk = userClient(env, 'TK2', 2, '583922', { depts: 'ISO', secretary: true });
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  const it0 = item(env, 'QT-ISO-01');
  assert.equal(it0.file_missing, true);
  assert.equal(it0.current_rev, '02');
  // Nhân viên không gắn tệp kiểu ATTACH
  assert.equal(sx.write('version.save', { version_id: uuid(), item_id: item(env, 'BM-SX-02-01').item_id, vtype: 'ATTACH' }).code, 'FORBIDDEN');
  const { id, rv } = draft(tk, env, 'QT-ISO-01', { summary: '', vtype: 'ATTACH' });
  let v = ver(env, id);
  assert.equal(v.vtype, 'ATTACH');
  assert.equal(v.rev, '02');
  assert.match(v.change_summary_vi, /Gắn tệp/);
  // Không gửi duyệt bản ATTACH
  assert.equal(tk.write('version.submit', { version_id: id }, { expected_version: rv }).code, 'VALIDATION_ERROR');
  tk.pin('583922');
  const r = tk.write('version.issue', { version_id: id }, { expected_version: rv });
  assert.equal(r.ok, true, JSON.stringify(r));
  const it1 = item(env, 'QT-ISO-01');
  assert.equal(it1.file_missing, false);
  assert.equal(it1.current_version_id, id);
  assert.equal(it1.current_rev, '02');
  assert.equal(it1.issued_at, '2025-12-01');
  assert.equal(it1.review_due, '2026-12-01');
  assert.equal(it1.issued_source, 'IMPORT');
  v = ver(env, id);
  assert.equal(v.issued_at, '2025-12-01');
  // Bản ATTACH chỉ khi chưa có bản hiện hành
  assert.equal(tk.write('version.save', { version_id: uuid(), item_id: it1.item_id, vtype: 'ATTACH' }).code, 'VALIDATION_ERROR');
});

test('doc.upload / doc.get: PDF bắt buộc khi gửi duyệt, đúng loại tệp, tải lại thay tệp cũ; tải về qua máy chủ theo quyền', () => {
  const { env } = seeded();
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  const kd1 = userClient(env, 'KD1', 1, '583931', { depts: 'KD' });
  const sx1 = userClient(env, 'SX1', 1, '583932', { depts: 'SX' });
  const tk = userClient(env, 'TK4', 4, '583930', { secretary: true });
  const it = item(env, 'BM-SX-01-01');
  const id = uuid();
  let r = sx.write('version.save', { version_id: id, item_id: it.item_id, change_summary_vi: 'Sửa' });
  assert.equal(r.ok, true);
  // Chưa có PDF → không gửi duyệt
  r = sx.write('version.submit', { version_id: id }, { expected_version: r.record_version });
  assert.equal(r.errors[0].code, 'PDF_REQUIRED');
  // Sai loại: PDF giả mạo, tệp gốc dạng ảnh, nội dung không khớp đuôi
  const up = (extra) => sx.write('doc.upload', { document_id: uuid(), entity_type: 'VERSION', entity_id: id, kind: 'PDF', mime_type: 'application/pdf', file_name: 'a.pdf', content_b64: fakePdfB64(), ...extra });
  assert.equal(up({ content_b64: fakeXlsxB64() }).errors[0].code, 'FILE_TYPE');
  assert.equal(up({ kind: 'SOURCE', mime_type: 'image/jpeg' }).errors[0].code, 'FILE_TYPE');
  assert.equal(up({ kind: 'OTHER' }).errors[0].code, 'INVALID_VALUE');
  // Người bộ phận khác không tải tệp vào nháp
  const kd2 = userClient(env, 'KD2', 2, '583925', { depts: 'KD' });
  assert.equal(kd2.write('doc.upload', { document_id: uuid(), entity_type: 'VERSION', entity_id: id, kind: 'PDF', mime_type: 'application/pdf', file_name: 'a.pdf', content_b64: fakePdfB64() }).code, 'FORBIDDEN');
  r = up({});
  assert.equal(r.ok, true, JSON.stringify(r));
  const doc1 = r.data.document_id;
  r = up({ file_name: 'b.pdf', content_b64: fakePdfB64(5000) });
  assert.equal(r.ok, true);
  const doc2 = r.data.document_id;
  const docs = env.rows('Documents');
  assert.equal(docs.find((d) => d.document_id === doc1).active, false);
  assert.equal(docs.find((d) => d.document_id === doc2).active, true);
  assert.equal(env.drive._files.get(docs.find((d) => d.document_id === doc1).drive_file_id).trashed, true);
  assert.equal(ver(env, id).pdf_doc_id, doc2);
  assert.equal(ver(env, id).pdf_size, 5000);
  // Gửi lại cùng operation_id → không tạo tệp thứ hai
  const op = uuid();
  const n0 = env.drive._files.size;
  const body = { document_id: uuid(), entity_type: 'VERSION', entity_id: id, kind: 'SOURCE', mime_type: XLSX, file_name: 'g.xlsx', content_b64: fakeXlsxB64() };
  assert.equal(sx.write('doc.upload', body, { operation_id: op }).ok, true);
  const again = sx.write('doc.upload', body, { operation_id: op });
  assert.equal(again.code, 'DUPLICATE_OPERATION');
  assert.ok(env.drive._files.size <= n0 + 2);
  assert.equal([...env.drive._files.values()].filter((f) => !f.trashed && /_goc_/.test(f.name)).length, 1);
  // Tải về: nháp — cấp 2 bộ phận SX được; cấp 1 SX không; bộ phận khác không
  r = sx.call('doc.get', { document_id: doc2 });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(Buffer.from(r.data.content_b64, 'base64').length, 5000);
  assert.equal(r.data.file_name, 'b.pdf');
  assert.equal(sx1.call('doc.get', { document_id: doc2 }).code, 'FORBIDDEN');
  assert.equal(kd1.call('doc.get', { document_id: doc2 }).code, 'FORBIDDEN');
  // Ban hành: cấp 1 bộ phận SX tải được bản đang hiệu lực; bản nháp không gửi xuống cấp 1
  r = sx.write('version.submit', { version_id: id }, { expected_version: ver(env, id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  tk.pin('583930');
  assert.equal(tk.write('version.approve', { version_id: id }, { expected_version: ver(env, id).record_version }).ok, true);
  assert.equal(tk.write('version.issue', { version_id: id }, { expected_version: ver(env, id).record_version }).ok, true);
  assert.equal(sx1.call('doc.get', { document_id: doc2 }).ok, true);
  // Tải tệp vào bản đã ban hành → không được
  assert.equal(up({}).errors[0].code, 'STATUS_INVALID');
  const d2 = uuid();
  assert.equal(sx.write('version.save', { version_id: d2, item_id: it.item_id, change_summary_vi: 'Lần 3' }).ok, true);
  const vs1 = sx1.call('sync.bootstrap', {}).data.records.VERSION || [];
  assert.ok(vs1.some((x) => x.version_id === id) && !vs1.some((x) => x.version_id === d2));
});

test('item.setNa: ✕ kèm lý do (PIN, Thư ký ISO), không khi đang có bản mở; dùng lại về tình trạng cũ. item.review: gia hạn rà soát', () => {
  const { env } = seeded();
  const tk = userClient(env, 'TK2', 2, '583922', { depts: 'ISO', secretary: true });
  const head = userClient(env, 'CL3', 3, '583921', { depts: 'CL' });
  const it = item(env, 'BM-CL-01-01');
  // Không phải Thư ký: FORBIDDEN trước khi hỏi PIN
  assert.equal(head.write('item.setNa', { item_id: it.item_id, na: true, reason: 'x' }, { expected_version: it.record_version }).code, 'FORBIDDEN');
  assert.equal(tk.write('item.setNa', { item_id: it.item_id, na: true, reason: 'x' }, { expected_version: it.record_version }).code, 'REAUTH_REQUIRED');
  tk.pin('583922');
  assert.equal(tk.write('item.setNa', { item_id: it.item_id, na: true, reason: '' }, { expected_version: it.record_version }).code, 'VALIDATION_ERROR');
  let r = tk.write('item.setNa', { item_id: it.item_id, na: true, reason: 'Gộp vào BM-CL-01-02' }, { expected_version: it.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  let x = item(env, 'BM-CL-01-01');
  assert.equal(x.status, 'NA');
  assert.equal(x.na_reason, 'Gộp vào BM-CL-01-02');
  // ✕: không soạn phiên bản
  assert.equal(tk.write('version.save', { version_id: uuid(), item_id: x.item_id, change_summary_vi: 'x' }).errors[0].code, 'ITEM_NA');
  r = tk.write('item.setNa', { item_id: x.item_id, na: false }, { expected_version: x.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  x = item(env, 'BM-CL-01-01');
  assert.equal(x.status, 'ISSUED');
  assert.equal(x.na_reason, '');
  // Có bản đang mở → không đặt ✕
  const y = item(env, 'BM-CL-04-01');
  assert.equal(tk.write('version.save', { version_id: uuid(), item_id: y.item_id, change_summary_vi: 'x' }).ok, true);
  const y2 = item(env, 'BM-CL-04-01');
  assert.equal(tk.write('item.setNa', { item_id: y2.item_id, na: true, reason: 'x' }, { expected_version: y2.record_version }).errors[0].code, 'VERSION_OPEN');
  // Đã rà soát: hạn mới = hôm nay + 12 tháng; biểu chưa ban hành thì không
  r = tk.write('item.review', { item_id: x.item_id, note: 'Rà soát 2026, không đổi' }, { expected_version: x.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  x = item(env, 'BM-CL-01-01');
  assert.equal(x.review_due, '2027-11-11');
  assert.ok(x.reviewed_at.startsWith('2026-11-11'));
  assert.equal(tk.write('item.review', { item_id: y2.item_id }, { expected_version: y2.record_version }).code, 'VALIDATION_ERROR');
  // Nhập lại đúng dòng Excel cũ: không đổi, giữ hạn rà soát đã gia hạn
  const g = env.g;
  const sample = g.SAMPLE_ITEMS_.find((s) => s[0] === 'BM-CL-01-01');
  const n = g.normCatalogRow_(g.sampleCells_(sample), g.deptLookup_(env.rows('Depts')), 5);
  assert.equal(JSON.stringify(g.itemChanges_(x, n.fields)), '[]');
  assert.equal(g.itemRowFromImport_({ user: { user_id: 'TEST' } }, x, x.code, n.fields, '2026-11-11T09:00:00+07:00').review_due, '2027-11-11');
});

test('máy chủ dán Code.gs mới mà chưa chạy migrateSchema: đăng nhập/đồng bộ vẫn chạy; trigger nền tự thêm sheet Versions', () => {
  const { env, owner } = seeded();
  // Giả lập máy chủ bản 1a: xóa sheet Versions, schema_version cũ
  const biz = env.ssApp.openById(env.props.getProperty('BUSINESS_SPREADSHEET_ID'));
  biz.deleteSheet(biz.getSheetByName('Versions'));
  env.g.dbReset_();
  env.g.withWriteLock_(() => { const st = env.g.readState_(); env.g.stateWrite_(st, { schema_version: ['STRING', '1.0.0'] }, 'TEST'); });
  env.g.cache_().remove('sys:state');
  const b = owner.call('sync.bootstrap', {});
  assert.equal(b.ok, true, JSON.stringify(b).slice(0, 300));
  assert.equal(b.data.records.VERSION, undefined);
  assert.equal(owner.call('sync.changes', { cursor: 0 }).ok, true);
  env.g.dbReset_();
  env.g.runBackgroundJobs();
  env.g.dbReset_();
  assert.ok(biz.getSheetByName('Versions'));
  assert.equal(env.g.stateGet_(env.g.readState_(), 'schema_version', ''), env.g.SCHEMA_VERSION);
  assert.ok(Array.isArray(owner.call('sync.bootstrap', {}).data.records.VERSION || []));
});

test('adminNoiLaiTep: khôi phục từ bản chép — đổi ID tệp theo file_map.json, chạy lại không đổi thêm', () => {
  const { env } = seeded();
  const tk = userClient(env, 'TK4', 4, '583930', { secretary: true });
  const { id } = draft(tk, env, 'BM-NS-01-02', { summary: 'x' });
  const doc = env.rows('Documents').find((d) => d.entity_id === id);
  const folder = env.drive.getFolderById(env.props.getProperty('DRIVE_ROOT_FOLDER_ID'));
  const copy = folder.createFile(env.g.Utilities.newBlob(Buffer.from('%PDF-copy'), 'application/pdf', 'copy.pdf'));
  folder.createFile(env.g.Utilities.newBlob(Buffer.from(JSON.stringify({ [doc.drive_file_id]: { id: copy.getId(), name: 'x', path: '' } })), 'application/json', 'file_map.json'));
  env.g.dbReset_();
  let r = env.g.adminNoiLaiTep();
  assert.equal(r.changed, 1);
  assert.equal(env.rows('Documents').find((d) => d.document_id === doc.document_id).drive_file_id, copy.getId());
  env.g.dbReset_();
  r = env.g.adminNoiLaiTep();
  assert.equal(r.changed, 0);
  assert.equal(r.same, 1);
  const got = tk.call('doc.get', { document_id: doc.document_id });
  assert.equal(Buffer.from(got.data.content_b64, 'base64').toString(), '%PDF-copy');
});
