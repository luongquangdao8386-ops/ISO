// Xóa sạch dữ liệu (Đợt 4, phiên 4c — nghiệm thu Đợt 4 "xóa sạch dữ liệu (owner) chạy được"; người dùng chốt 13/11/2026: chọn lúc xóa giữ hay
// xóa danh mục, chỉ thử trên giả lập): chỉ owner, PIN, gõ XÓA TOÀN BỘ (nhận cả XOÁ) — kiểm trước PIN; sao lưu VERIFIED trước khi xóa (không đạt
// thì không xóa gì); giữ danh mục: biểu ● thành chưa có tệp, tem QR giữ, kho tệp mẫu giữ; xóa cả danh mục; mọi phiên thu hồi (DATASET_RESET),
// đăng nhập lại được; tệp Drive vào thùng rác (hết giờ → trigger làm tiếp); nhật ký giữ thao tác quản trị; bộ đếm mã không lùi; Trạng thái hệ thống.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, makeClient, uuid, OWNER_PIN, OWNER_CODE, fakeJpegB64 } from '../helpers.mjs';

const NOW = '2026-12-05T08:00:00+07:00';
const TK_PIN = '583926';

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
const fields = (r) => (r.errors || []).map((e) => e.field + ':' + e.code).sort();
const rows = (env, s) => { env.g.dbReset_(); return env.rows(s); };
const item = (env, code) => rows(env, 'Items').find((x) => x.code === code);

/**
 * Máy chủ có đủ loại dữ liệu: phiên bản lần 02 ban hành có PDF (BM-SX-02-01), hồ sơ có ảnh, phiếu khắc phục, phiếu NC, chương trình đánh giá,
 * xem xét lãnh đạo, báo cáo đã lưu (bản chụp + PDF), một tệp mẫu (giữ khi giữ danh mục).
 */
function seeded() {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  env.g.dbReset_();
  const tk = userClient(env, 'TK2', 2, TK_PIN, { depts: 'ISO', secretary: true });
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  // Phiên bản lần 02 (Thư ký soạn, owner duyệt, Thư ký ban hành)
  const it = item(env, 'BM-SX-02-01');
  const vid = uuid();
  let r = tk.write('version.save', { version_id: vid, item_id: it.item_id, change_summary_vi: 'Sửa mục 3', effective_date: '2026-12-05' });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = tk.write('doc.upload', { document_id: uuid(), entity_type: 'VERSION', entity_id: vid, kind: 'PDF', mime_type: 'application/pdf', file_name: 'a.pdf', content_b64: fakePdfB64() });
  assert.equal(r.ok, true, JSON.stringify(r));
  const v = () => rows(env, 'Versions').find((x) => x.version_id === vid);
  assert.equal(tk.write('version.submit', { version_id: vid }, { expected_version: v().record_version }).ok, true);
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  assert.equal(owner.write('version.approve', { version_id: vid }, { expected_version: v().record_version }).ok, true);
  assert.equal(tk.pin(TK_PIN).ok, true);
  r = tk.write('version.issue', { version_id: vid }, { expected_version: v().record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  // Hồ sơ có ảnh
  const rid = uuid();
  r = sx.write('record.submit', { record_id: rid, item_id: it.item_id, period_from: '2026-12-01', period_to: '2026-12-04', pages: 1 });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = sx.write('doc.upload', { document_id: uuid(), entity_type: 'RECORD', entity_id: rid, kind: 'PHOTO', mime_type: 'image/jpeg', file_name: 'p1.jpg', content_b64: fakeJpegB64(), page_no: 1 });
  assert.equal(r.ok, true, JSON.stringify(r));
  // Khắc phục, NC, chương trình đánh giá, xem xét lãnh đạo
  r = owner.write('capa.save', { capa_id: uuid(), source: 'EQUIPMENT', dept_code: 'CĐ', found_date: '2026-12-01', due_date: '2026-12-31', problem_vi: 'Máy nén khí dừng' });
  assert.equal(r.data.record.code, 'KP-2612-001');
  assert.equal(owner.write('ncr.save', { ncr_id: uuid(), stage: 'PROCESS', dept_code: 'SX', found_date: '2026-12-02', product_text: 'Hộp giấy', problem_vi: 'Lem màu' }).ok, true);
  assert.equal(tk.write('iaudit.program.save', { program_id: uuid(), year: 2026 }).ok, true);
  assert.equal(tk.write('mreview.save', { review_id: uuid(), period_from: '2026-01-01', period_to: '2026-11-30' }).ok, true);
  // Báo cáo đã lưu (bản chụp + PDF)
  r = owner.write('report.save', { report_run_id: uuid(), kind: 'CATALOG', filters: {}, format: 'PDF' });
  assert.equal(r.ok, true, JSON.stringify(r));
  // Tệp mẫu
  r = tk.write('tpl.upload', { tpl_id: uuid(), document_id: uuid(), file_name: 'BM-CD-04_Sua_chua.xlsx', mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    content_b64: fakeXlsxB64(), sheets: [{ n: 'BM-CĐ-04-03', p: 'A4', o: 'L', h: false }] });
  assert.equal(r.ok, true, JSON.stringify(r));
  env.g.dbReset_();
  return { env, owner, tk, sx, itemId: it.item_id };
}

const driveFile = (env, id) => env.g.DriveApp.getFileById(id);

test('chỉ owner; chữ xác nhận, cách xóa kiểm trước PIN; thông tin số dòng sẽ xóa', () => {
  const { env, owner, tk } = seeded();
  const ad = userClient(env, 'AD4', 4, '583930', {});
  assert.equal(ad.call('system.reset.info', {}).code, 'FORBIDDEN');
  assert.equal(ad.write('system.reset', { mode: 'ALL', confirm: 'XÓA TOÀN BỘ' }).code, 'FORBIDDEN');
  assert.equal(tk.write('system.reset', { mode: 'ALL', confirm: 'XÓA TOÀN BỘ' }).code, 'FORBIDDEN');
  const fresh = makeClient(env);
  fresh.token = owner.token;
  // Lỗi dữ liệu trả ngay, không hỏi PIN
  assert.deepEqual(fields(fresh.write('system.reset', { mode: 'X', confirm: 'xóa' })), ['confirm:RESET_CONFIRM', 'mode:INVALID_VALUE']);
  assert.deepEqual(fields(fresh.write('system.reset', { confirm: 'XÓA TOÀN BỘ' })), ['mode:REQUIRED']);
  // Đúng chữ (cả kiểu XOÁ, chữ thường, khoảng trắng thừa) → mới hỏi PIN
  assert.equal(fresh.write('system.reset', { mode: 'KEEP_CATALOG', confirm: '  xoá   toàn bộ ' }).code, 'REAUTH_REQUIRED');
  const info = owner.call('system.reset.info', {});
  assert.equal(info.ok, true, JSON.stringify(info));
  const keep = info.data.plans.KEEP_CATALOG, all = info.data.plans.ALL;
  assert.equal(info.data.confirm_text, 'XÓA TOÀN BỘ');
  assert.equal(keep.counts.Versions, 1);
  assert.equal(keep.counts.Records, 1);
  assert.equal(keep.counts.MgmtReviews, 1);
  assert.equal(keep.counts.Items, undefined);
  assert.equal(keep.counts.Documents, 4); // PDF phiên bản, ảnh hồ sơ, bản chụp + PDF báo cáo (tệp mẫu giữ)
  assert.equal(all.counts.Documents, 5);
  assert.equal(all.counts.Items, rows(env, 'Items').length);
  assert.equal(all.counts.TplFiles, 1);
  assert.equal(keep.tpl_kept, 1);
  assert.equal(info.data.last, null);
  // Đang chạy (lượt khác) → báo trước PIN
  env.props.setProperty('RESET_RUNNING', String(new env.clock.Date().getTime()));
  assert.deepEqual(fields(owner.write('system.reset', { mode: 'ALL', confirm: 'XÓA TOÀN BỘ' })), ['state:RESET_RUNNING']);
  env.props.deleteProperty('RESET_RUNNING');
});

test('giữ danh mục: sao lưu VERIFIED trước; xóa nghiệp vụ, giữ biểu (● thành chưa có tệp, tem QR giữ), tệp mẫu; mọi phiên đăng nhập lại; mã không lùi', () => {
  const { env, owner, tk, sx, itemId } = seeded();
  const before = rows(env, 'Items').find((x) => x.item_id === itemId);
  assert.equal(before.current_rev, '02');
  assert.equal(before.file_missing, false);
  const docs0 = rows(env, 'Documents');
  const tplDoc = docs0.find((d) => d.entity_type === 'TPL');
  const gone = docs0.filter((d) => d.entity_type !== 'TPL').map((d) => d.drive_file_id);
  const nItems = rows(env, 'Items').length;
  // Thư Gmail đang chờ → bỏ
  env.g.withWriteLock_(() => env.g.insertRows_('NotificationLogs', [{ notification_id: uuid(), dedupe_key: 'x', run_date: '2026-12-05', recipient_id: 'u', entity_type: 'ITEM',
    entity_id: itemId, stage: 'D7', status: 'QUEUED', kind: 'REVIEW_DUE', via: 'PRIMARY' }]));
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  const r = owner.write('system.reset', { mode: 'KEEP_CATALOG', confirm: 'XOÁ TOÀN BỘ' }, { changes_since: 0 });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.changes, undefined, 'không kèm thay đổi theo cursor cũ');
  assert.equal(r.data.mode, 'KEEP_CATALOG');
  assert.equal(r.data.counts.Versions, 1);
  assert.equal(r.data.counts.Records, 1);
  assert.equal(r.data.counts.Capas, 1);
  assert.equal(r.data.counts.Ncrs, 1);
  assert.equal(r.data.counts.AuditPrograms, 1);
  assert.equal(r.data.counts.MgmtReviews, 1);
  assert.equal(r.data.counts.ReportRuns, 1);
  assert.equal(r.data.counts.Documents, 4);
  assert.equal(r.data.files_trashed, gone.length);
  assert.equal(r.data.files_left, 0);
  assert.ok(r.data.sessions >= 3);
  // Sao lưu trước khi xóa
  const st = env.g.readState_();
  assert.equal(env.g.stateGet_(st, 'last_backup_status', ''), 'VERIFIED');
  assert.equal(env.g.stateGet_(st, 'last_reset_ref', ''), r.data.backup);
  assert.equal(env.g.stateGet_(st, 'last_reset_status', ''), 'OK');
  assert.equal(env.props.getProperty('MAINTENANCE_MODE'), 'false');
  assert.equal(env.props.getProperty('RESET_RUNNING'), null);
  // Bảng nghiệp vụ trống; danh mục giữ
  for (const s of ['Versions', 'Records', 'Capas', 'Ncrs', 'AuditPrograms', 'MgmtReviews', 'ReportRuns', 'ImportBatches', 'Operations']) assert.equal(rows(env, s).length, 0, s);
  assert.equal(rows(env, 'Items').length, nItems);
  assert.equal(rows(env, 'TplFiles').length, 1);
  assert.ok(rows(env, 'Clauses').length > 0 && rows(env, 'Groups').length > 0);
  const after = rows(env, 'Items').find((x) => x.item_id === itemId);
  assert.equal(after.status, 'ISSUED');
  assert.equal(after.current_rev, '02');
  assert.equal(after.issued_at, before.issued_at);
  assert.equal(after.qr_key, before.qr_key);
  assert.equal(after.file_missing, true);
  assert.equal(after.issued_source, 'IMPORT');
  assert.equal(after.current_version_id, '');
  // Tệp: PDF / ảnh / báo cáo vào thùng rác; tệp mẫu giữ
  const docs1 = rows(env, 'Documents');
  assert.deepEqual(docs1.map((d) => d.document_id), [tplDoc.document_id]);
  gone.forEach((id) => assert.equal(driveFile(env, id).isTrashed(), true));
  assert.equal(driveFile(env, tplDoc.drive_file_id).isTrashed(), false);
  // Nhật ký: chỉ còn thao tác quản trị / đăng nhập + system.reset
  const acts = rows(env, 'AuditLogs').map((a) => a.action);
  assert.ok(acts.includes('system.reset'));
  assert.ok(!acts.some((a) => /^(version|record|capa|ncr|iaudit|mreview|report\.save|doc|tpl)\./.test(a)), acts.join(','));
  // Gmail chờ → SKIPPED RESET
  assert.equal(rows(env, 'NotificationLogs').find((n) => n.dedupe_key === 'x').status, 'SKIPPED');
  // Ngày bắt đầu tính hồ sơ = hôm nay
  assert.equal(env.g.setting_('records_start_date'), '2026-12-05');
  // Mọi phiên: DATASET_RESET; đăng nhập lại được và thấy danh mục
  assert.equal(owner.call('sync.bootstrap', {}).code, 'DATASET_RESET');
  assert.equal(sx.call('sync.changes', { cursor: 0 }).code, 'DATASET_RESET');
  const o2 = makeClient(env);
  assert.equal(o2.login(OWNER_CODE, OWNER_PIN).ok, true);
  const b = o2.call('sync.bootstrap', {});
  assert.equal(b.ok, true);
  assert.equal((b.data.records.ITEM || []).length, nItems);
  assert.equal((b.data.records.VERSION || []).length, 0);
  assert.equal(b.data.settings.records_start_date, '2026-12-05');
  // Bộ đếm mã không lùi
  const t2 = makeClient(env);
  assert.equal(t2.login('TK2', TK_PIN).ok, true);
  const c = o2.write('capa.save', { capa_id: uuid(), source: 'EQUIPMENT', dept_code: 'CĐ', found_date: '2026-12-05', due_date: '2026-12-31', problem_vi: 'Sau xóa sạch' });
  assert.equal(c.data.record.code, 'KP-2612-002');
  // Trạng thái hệ thống
  const h = o2.call('system.status', {}).data.checks.find((x) => x.key === 'reset');
  assert.equal(h.status, 'OK');
  assert.match(h.value, /Lần gần nhất 05\/12\/2026 \d\d:\d\d · giữ danh mục · sao lưu trước khi xóa 2026-12-05_/);
  // Thông tin lần xóa
  const info = o2.call('system.reset.info', {}).data;
  assert.equal(info.last.status, 'OK');
  assert.equal(info.last.mode, 'KEEP_CATALOG');
  assert.equal(info.last.counts.Versions, 1);
});

test('xóa cả danh mục: biểu, nhóm, điều khoản, tệp mẫu; ngày bắt đầu tính hồ sơ đặt lại khi nhập', () => {
  const { env, owner } = seeded();
  const tplFile = rows(env, 'Documents').find((d) => d.entity_type === 'TPL').drive_file_id;
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  const r = owner.write('system.reset', { mode: 'ALL', confirm: 'XÓA TOÀN BỘ' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(r.data.counts.Items > 0);
  for (const s of ['Items', 'Groups', 'Clauses', 'TplFiles', 'Documents', 'Versions', 'Records']) assert.equal(rows(env, s).length, 0, s);
  assert.equal(driveFile(env, tplFile).isTrashed(), true);
  assert.equal(env.g.setting_('records_start_date'), '');
  assert.ok(rows(env, 'Users').length >= 3, 'người dùng giữ nguyên');
  assert.ok(rows(env, 'Depts').length === 10, 'bộ phận giữ nguyên');
  const o2 = makeClient(env);
  assert.equal(o2.login(OWNER_CODE, OWNER_PIN).ok, true);
  const checks = o2.call('system.status', {}).data.checks;
  assert.equal(checks.find((x) => x.key === 'items').status, 'WARN');
  assert.match(checks.find((x) => x.key === 'reset').value, /xóa cả danh mục/);
});

test('sao lưu không đạt: không xóa gì, tắt bảo trì, báo lỗi; tệp nhiều quá thời gian: trigger nền làm tiếp', () => {
  const { env, owner } = seeded();
  const nV = rows(env, 'Versions').length;
  const epoch = env.props.getProperty('DATASET_EPOCH');
  const real = env.g.backupDataRun_;
  env.g.backupDataRun_ = () => ({ status: 'FAILED', folder: '2026-12-05_0800', error: 'Hết dung lượng Drive' });
  assert.equal(owner.pin(OWNER_PIN).ok, true);
  let r = owner.write('system.reset', { mode: 'KEEP_CATALOG', confirm: 'XÓA TOÀN BỘ' });
  assert.deepEqual(fields(r), ['backup:RESET_BACKUP_FAILED']);
  assert.match(r.errors[0].message_vi, /\(FAILED\)/);
  assert.equal(rows(env, 'Versions').length, nV);
  assert.equal(env.props.getProperty('DATASET_EPOCH'), epoch);
  assert.equal(env.props.getProperty('MAINTENANCE_MODE'), 'false');
  assert.equal(owner.call('sync.bootstrap', {}).ok, true, 'phiên còn nguyên');
  let h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'reset');
  assert.equal(h.status, 'WARN');
  assert.match(h.value, /bị lỗi: Sao lưu trước khi xóa: FAILED — Hết dung lượng Drive/);
  // Lần sau: hết thời gian bỏ tệp vào thùng rác → phần còn lại để trigger nền
  env.g.backupDataRun_ = real;
  env.g.RESET_BUDGET_MS_ = -1000;
  r = owner.write('system.reset', { mode: 'KEEP_CATALOG', confirm: 'XÓA TOÀN BỘ' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.files_trashed, 0);
  assert.equal(r.data.files_left, 4);
  assert.ok(env.props.getProperty('RESET_TRASH_FILE'));
  const o2 = makeClient(env);
  assert.equal(o2.login(OWNER_CODE, OWNER_PIN).ok, true);
  h = o2.call('system.status', {}).data.checks.find((x) => x.key === 'reset');
  assert.equal(h.status, 'OK');
  assert.match(h.note, /Còn 4 tệp chờ bỏ vào thùng rác/);
  env.g.dbReset_();
  env.g.runBackgroundJobs();
  assert.equal(env.props.getProperty('RESET_TRASH_FILE'), null);
  h = o2.call('system.status', {}).data.checks.find((x) => x.key === 'reset');
  assert.equal(h.note, '');
});
