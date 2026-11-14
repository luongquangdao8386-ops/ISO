// Đợt 2 phiên 2e (người dùng yêu cầu 12/11/2026 "chỉ phạm vi cơ điện + Kho tệp mẫu"):
// - Phạm vi áp dụng (Settings.scope_depts, mặc định CĐ): biểu ngoài phạm vi ẩn với mọi người (đồng bộ, hồ sơ, báo cáo, Gmail, Trạng thái
//   hệ thống), không thêm / chuyển biểu sang bộ phận ngoài phạm vi, nhập Excel tổng bỏ qua dòng ngoài phạm vi (SKIP); đổi phạm vi → app
//   tải lại toàn bộ; migrateSchema thêm cài đặt cũng làm app tải lại.
// - Kho tệp mẫu (TplFiles): tải lên (Thư ký ISO / cấp 4), nhận bộ BM-CĐ-xx từ tên sheet / tên tệp, tệp cùng bộ thay tệp cũ, quyền xem /
//   tải theo cấp, bỏ tệp tải nhầm (PIN, quyền trước PIN) → tệp trước dùng lại; ghép sheet ↔ biểu của app (js/tplx.js) = máy chủ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, uuid, OWNER_PIN, setScope } from '../helpers.mjs';
import { xlsx } from '../xlsx-node.mjs';
import { buildCatalogWorkbook, parseCatalogWorkbook } from '../../js/catalog-xlsx.js';
import { polishXlsx } from '../../js/xlsx.js';
import { readSheets, openAtSheet, activeSheet, itemIndex, matchSheet, setOf, normCode } from '../../js/tplx.js';

const NOW = '2026-11-12T09:00:00+07:00';
const X = xlsx();

function seeded(scope = 'CĐ') {
  const env = freshServer({ now: NOW, scope });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  env.g.dbReset_();
  return { env, owner };
}
const itemOf = (env, code) => env.rows('Items').find((x) => x.code === code);

/** Tệp xlsx mẫu: sheet Mục lục + các sheet mang mã (sheet phụ a / -TH), một sheet A3 ngang (pageSetup chèn vào XML) */
function tplWorkbook(names, a3 = []) {
  const wb = X.utils.book_new();
  names.forEach((n) => X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([[n], ['Ô nền vàng: điền']]), n));
  let bytes = X.write(wb, { type: 'array', bookType: 'xlsx', compression: true });
  const CFB = X.CFB;
  const zip = CFB.read(new Uint8Array(bytes), { type: 'array' });
  names.forEach((n, i) => {
    const f = CFB.find(zip, `/xl/worksheets/sheet${i + 1}.xml`);
    let x = new TextDecoder().decode(f.content);
    const ps = a3.includes(n) ? '<pageSetup paperSize="8" orientation="landscape"/>' : '<pageSetup paperSize="9" orientation="portrait"/>';
    x = /<pageMargins[^>]*\/>/.test(x) ? x.replace(/(<pageMargins[^>]*\/>)/, `$1${ps}`) : x.replace('</worksheet>', ps + '</worksheet>');
    const buf = new TextEncoder().encode(x);
    f.content = buf; f.size = buf.length;
  });
  bytes = CFB.write(zip, { fileType: 'zip', type: 'array', compression: true });
  return new Uint8Array(bytes);
}
const b64 = (u8) => Buffer.from(u8).toString('base64');
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function upload(c, fileName, bytes, sheets, extra = {}) {
  return c.write('tpl.upload', { tpl_id: uuid(), document_id: uuid(), file_name: fileName, mime_type: XLSX_MIME, content_b64: b64(bytes), sheets, ...extra });
}

/* ====================== Phạm vi áp dụng ====================== */

test('phạm vi CĐ: đồng bộ chỉ biểu cơ điện (kể cả Quản trị), không thêm/chuyển biểu ra ngoài phạm vi, đổi phạm vi → app tải lại', () => {
  const { env, owner } = seeded('CĐ');
  const all = env.rows('Items');
  const cd = all.filter((x) => x.dept_code === 'CĐ');
  assert.ok(cd.length >= 5 && all.length > cd.length);
  let b = owner.call('sync.bootstrap', {}).data;
  assert.equal(b.settings.scope_depts, 'CĐ');
  assert.deepEqual(b.records.ITEM.map((x) => x.code).sort(), cd.map((x) => x.code).sort(), 'Quản trị cũng chỉ thấy biểu trong phạm vi');
  // Thư ký ISO, nhân viên SX (ngoài phạm vi): không thấy biểu nào của SX
  const sx = userClient(env, 'SX1', 2, '583931', { depts: 'SX' });
  assert.equal(sx.call('sync.bootstrap', {}).data.records.ITEM.length, 0);
  // Mở thẳng biểu ngoài phạm vi: không thấy
  const sxItem = all.find((x) => x.dept_code === 'SX');
  assert.equal(owner.call('record.status', { item_id: sxItem.item_id }).data.items.length, 0);
  // Thêm / chuyển biểu sang bộ phận ngoài phạm vi
  let r = owner.write('item.edit', { item_id: uuid(), code: 'BM-SX-09-01', kind: 'FORM', dept_code: 'SX', name_vi: 'Thử' });
  assert.equal(r.errors[0].code, 'APP_SCOPE');
  const it = itemOf(env, 'BM-CĐ-04-03');
  r = owner.write('item.edit', { item_id: it.item_id, dept_code: 'SX' }, { expected_version: it.record_version });
  assert.equal(r.errors[0].code, 'APP_SCOPE');
  r = owner.write('item.edit', { item_id: sxItem.item_id, note: 'x' }, { expected_version: sxItem.record_version });
  assert.equal(r.code, 'NOT_FOUND');
  // Phiếu đề nghị ban hành mới cho bộ phận ngoài phạm vi
  r = owner.write('docreq.save', { request_id: uuid(), req_type: 'NEW', dept_code: 'SX', title_vi: 'Biểu mới', reason_vi: 'cần' });
  assert.equal(r.errors[0].code, 'APP_SCOPE');
  // Đổi phạm vi (Quản trị, PIN): chuẩn hóa mã, mã lạ báo lỗi; settings_rev đổi → app tải lại toàn bộ
  const rev0 = Number(b.settings_rev);
  owner.pin(OWNER_PIN);
  r = owner.write('settings.edit', { changes: { scope_depts: 'cđ, XX' } });
  assert.equal(r.errors[0].code, 'SCOPE_DEPT');
  r = owner.write('settings.edit', { changes: { scope_depts: 'cđ; sx' } });
  assert.equal(r.ok, true, JSON.stringify(r));
  const ch = owner.call('sync.changes', { cursor: 0 }).data;
  assert.ok(Number(ch.settings_rev) > rev0, 'settings_rev tăng → app gọi lại bootstrap');
  b = owner.call('sync.bootstrap', {}).data;
  assert.equal(b.settings.scope_depts, 'CĐ,SX');
  assert.equal(b.records.ITEM.length, all.filter((x) => x.dept_code === 'CĐ' || x.dept_code === 'SX').length);
  // Bỏ chọn hết = toàn công ty
  assert.equal(owner.write('settings.edit', { changes: { scope_depts: '' } }).ok, true);
  assert.equal(owner.call('sync.bootstrap', {}).data.records.ITEM.length, all.length);
});

test('phạm vi CĐ: Trạng thái hệ thống, Gmail, báo cáo chỉ tính biểu trong phạm vi', () => {
  const { env, owner } = seeded('CĐ');
  const checks = owner.call('system.status', {}).data.checks;
  const sc = checks.find((x) => x.key === 'scope');
  assert.equal(sc.value, 'CĐ');
  const n = env.rows('Items').filter((x) => x.dept_code === 'CĐ').length;
  assert.match(sc.note, new RegExp(`^${n} biểu trong phạm vi · \\d+ biểu ngoài phạm vi`));
  assert.equal(checks.find((x) => x.key === 'items').value, n);
  // Báo cáo Danh mục tài liệu: chỉ biểu cơ điện
  const rep = owner.call('report.run', { kind: 'CATALOG', filters: { scope: 'ALL' } });
  assert.equal(rep.ok, true, JSON.stringify(rep).slice(0, 300));
  const codes = JSON.stringify(rep.data);
  assert.ok(codes.includes('BM-CĐ-04-03') && !codes.includes('BM-SX-02-01'));
  // Gmail: toàn công ty có việc cần nhắc của biểu ngoài cơ điện; phạm vi CĐ thì không còn
  const outIds = new Set(env.rows('Items').filter((it) => it.dept_code !== 'CĐ').map((it) => it.item_id));
  const desired = () => { env.g.dbReset_(); return env.g.mailDesired_(env.g.mailCtx_('2026-11-16'), { all: true }); };
  setScope(env, '');
  assert.ok(desired().some((w) => outIds.has(w.entity_id)), 'toàn công ty: có nhắc biểu ngoài cơ điện');
  setScope(env, 'CĐ');
  assert.ok(desired().every((w) => !outIds.has(w.entity_id)));
});

test('phạm vi CĐ: nhập Excel tổng bỏ qua dòng ngoài phạm vi (SKIP, không ghi), xuất lại nhập lại Không đổi', () => {
  const env = freshServer({ now: NOW, scope: 'CĐ' });
  const owner = ownerClient(env);
  const depts = owner.call('sync.bootstrap', {}).data.records.DEPT;
  const items = [], groups = [];
  [['CĐ', 6], ['SX', 3], ['KD', 2]].forEach(([dep, cnt]) => {
    groups.push({ group_key: `${dep}-01`, dept_code: dep, name_vi: `Nhóm ${dep}`, name_zh: '组', label: `01. Nhóm ${dep} · 组` });
    for (let i = 0; i < cnt; i++) items.push({ code: `BM-${dep}-01-0${i + 1}`, name_vi: `Biểu ${dep} ${i + 1}`, name_zh: `表${i}`, dept_code: dep, group_key: `${dep}-01`, status: 'DRAFTING', where: 'MANUAL', sort_order: items.length + 1, keep: '3 năm' });
  });
  const { wb, polish } = buildCatalogWorkbook(X, { items, groups, depts, clauses: [], grace: 3, epoch: '', exported_at: '2026-11-12' });
  const bytes = polishXlsx(X, X.write(wb, { type: 'array', bookType: 'xlsx', compression: true }), polish);
  const parsed = parseCatalogWorkbook(X, X.read(bytes, { type: 'array', cellDates: true }));
  assert.equal(parsed.rows.length, 11);
  const id = uuid();
  const pv = owner.write('import.preview', { import_batch_id: id, file_name: 'tong.xlsx', source_sha256: 'x', meta: null, part: { index: 0, count: 1 }, rows: parsed.rows, clauses: [] });
  assert.equal(pv.ok, true, JSON.stringify(pv).slice(0, 400));
  assert.equal(pv.data.batch.add_count, 6);
  assert.equal(pv.data.batch.skip_count, 5);
  assert.equal(pv.data.batch.error_count, 0);
  assert.equal(pv.data.all_rows.filter((r) => r.action === 'SKIP').length, 5);
  owner.pin(OWNER_PIN);
  const cm = owner.write('import.commit', { import_batch_id: id });
  assert.equal(cm.ok, true, JSON.stringify(cm).slice(0, 300));
  assert.equal(cm.data.committed, 6);
  assert.equal(cm.data.batch.status, 'COMPLETED');
  assert.deepEqual(env.rows('Items').map((x) => x.dept_code).sort(), Array(6).fill('CĐ'));
  // Nhập lại cùng tệp: 6 Không đổi, 5 bỏ qua
  const pv2 = owner.write('import.preview', { import_batch_id: uuid(), file_name: 'tong.xlsx', source_sha256: 'x', meta: null, part: { index: 0, count: 1 }, rows: parsed.rows, clauses: [] });
  assert.equal(pv2.data.batch.same_count, 6);
  assert.equal(pv2.data.batch.skip_count, 5);
});

test('migrateSchema từ 2d: thêm TplFiles + cài đặt scope_depts = CĐ và làm app tải lại (settings_rev tăng); nhật ký đúng', () => {
  const env = freshServer({ now: NOW, scope: 'CĐ' });
  const owner = ownerClient(env);
  const g = env.g;
  // Giả lập máy chủ 2d: chưa có TplFiles, chưa có dòng scope_depts trong Settings
  g.book_('B').deleteSheet(g.book_('B').getSheetByName('TplFiles'));
  g.dbReset_();
  const rn = g.findRowNums_('Settings', 'setting_key', 'scope_depts')[0];
  g.sh_('Settings').deleteRow(rn);
  g.withWriteLock_(() => g.stateWrite_(g.readState_(), { schema_version: ['STRING', '1.0.6'] }, 'TEST'));
  g.cache_().removeAll(['sys:state', 'cfg:settings']);
  g.dbReset_();
  const rev0 = Number(owner.call('sync.changes', { cursor: 0 }).data.settings_rev);
  env.logs.length = 0;
  g.migrateSchema();
  assert.ok(env.logs.some((l) => l === 'migrateSchema xong. Thêm: TplFiles. schema_version=1.0.14'), env.logs.join('\n'));
  g.cache_().removeAll(['sys:state', 'cfg:settings']);
  assert.ok(Number(owner.call('sync.changes', { cursor: 0 }).data.settings_rev) > rev0);
  assert.equal(owner.call('sync.bootstrap', {}).data.settings.scope_depts, 'CĐ');
  // Chạy lại: không thêm gì, không tăng nữa
  const rev1 = Number(owner.call('sync.changes', { cursor: 0 }).data.settings_rev);
  env.logs.length = 0;
  g.migrateSchema();
  assert.ok(env.logs.some((l) => l === 'migrateSchema xong. Thêm: không có. schema_version=1.0.14'), env.logs.join('\n'));
  g.cache_().removeAll(['sys:state', 'cfg:settings']);
  assert.equal(Number(owner.call('sync.changes', { cursor: 0 }).data.settings_rev), rev1);
});

/* ====================== Kho tệp mẫu ====================== */

test('Kho tệp mẫu: đọc sheet + khổ giấy, mở sẵn sheet; ghép sheet ↔ biểu của app = máy chủ (mã con, -TD, Đ/D)', () => {
  const names = ['Mục lục - 目录', 'BM-CĐ-04-01', 'BM-CĐ-04-03', 'BM-CĐ-04-03-TH', 'BM-CĐ-04-03-ML', 'BM-CĐ-04-06a', 'BM-CD-03-03b'];
  const bytes = tplWorkbook(names, ['BM-CĐ-04-03']);
  const sh = readSheets(X, bytes);
  assert.deepEqual(sh.map((s) => s.n), names);
  assert.deepEqual(sh.find((s) => s.n === 'BM-CĐ-04-03'), { n: 'BM-CĐ-04-03', p: 'A3', o: 'L' });
  assert.deepEqual(sh.find((s) => s.n === 'BM-CĐ-04-01'), { n: 'BM-CĐ-04-01', p: 'A4', o: 'P' });
  const out = openAtSheet(X, bytes, 'BM-CĐ-04-03-TH');
  assert.equal(activeSheet(X, out), 'BM-CĐ-04-03-TH');
  const zip = X.CFB.read(out, { type: 'array' });
  const sel = names.map((n, i) => /tabSelected="1"/.test(new TextDecoder().decode(X.CFB.find(zip, `/xl/worksheets/sheet${i + 1}.xml`).content)));
  assert.deepEqual(sel, names.map((n) => n === 'BM-CĐ-04-03-TH'), 'đúng một sheet được chọn');
  // Dữ liệu sheet giữ nguyên
  const wb2 = X.read(out, { type: 'array' });
  assert.equal(wb2.Sheets['BM-CĐ-04-03']['A1'].v, 'BM-CĐ-04-03');
  // Bộ biểu
  const depts = ['ISO', 'KD', 'CĐ', 'SX'];
  assert.equal(setOf(sh, 'x.xlsx', depts).set_code, 'BM-CĐ-04');
  assert.equal(setOf([], 'BM-CD-11_Moi-truong.xlsx', depts).set_code, 'BM-CĐ-11');
  assert.equal(setOf([], 'Danh_muc_bieu_mau.xlsx', depts), null);
  // Ghép: app = máy chủ
  const { env } = seeded('');
  const items = env.rows('Items');
  const idx = itemIndex(items);
  const sidx = env.g.evItemIndex_(items);
  for (const n of names.concat(['BM-CĐ-08-01', 'bm-cđ-02-05', 'BM-CĐ-01-05-TD', 'BM-CĐ-99-01'])) {
    const a = matchSheet(idx, n);
    const s = env.g.evMatchItem_(sidx, n);
    assert.equal(a ? a.it.item_id : null, s ? s.item_id : null, n);
  }
  assert.equal(matchSheet(idx, 'BM-CĐ-04-03-TH').it.code, 'BM-CĐ-04-03');
  assert.equal(matchSheet(idx, 'BM-CĐ-04-03-TH').sub, true);
  assert.equal(matchSheet(idx, 'BM-CD-03-03b').it.code, 'BM-CĐ-03-03');
  assert.equal(matchSheet(idx, 'Mục lục - 目录'), null);
  assert.equal(normCode('BM–CĐ-04 01'), 'BM-CD-0401');
});

test('Kho tệp mẫu: tải lên (Thư ký ISO / cấp 4), tệp cùng bộ thay tệp cũ, quyền xem / tải theo cấp, bỏ tệp tải nhầm (PIN) → tệp trước dùng lại', () => {
  const { env, owner } = seeded('CĐ');
  const names = ['Mục lục - 目录', 'BM-CĐ-04-01', 'BM-CĐ-04-03', 'BM-CĐ-04-03-TH'];
  const bytes = tplWorkbook(names, ['BM-CĐ-04-03']);
  const sheets = readSheets(X, bytes);
  // Nhân viên cấp 2: không tải lên được
  const nv = userClient(env, 'NV1', 2, '583941', { depts: 'CĐ' });
  assert.equal(upload(nv, 'BM-CD-04_Sua-chua.xlsx', bytes, sheets).code, 'FORBIDDEN');
  // Sai loại tệp (khai PDF mà nội dung là xlsx), danh sách sheet sai
  assert.equal(owner.write('tpl.upload', { tpl_id: uuid(), document_id: uuid(), file_name: 'a.pdf', mime_type: 'application/pdf', content_b64: b64(bytes) }).errors[0].code, 'FILE_TYPE');
  assert.equal(upload(owner, 'a.xlsx', bytes, [{ n: '' }]).errors[0].code, 'TPL_SHEETS');
  // Thư ký ISO cấp 2 (không giới hạn bộ phận) tải lên
  const tk = userClient(env, 'TK1', 2, '583942', { secretary: true });
  const r1 = upload(tk, 'BM-CD-04_Sua-chua.xlsx', bytes, sheets, { note: 'Bản căn chỉnh in' });
  assert.equal(r1.ok, true, JSON.stringify(r1).slice(0, 300));
  const t1 = r1.data.record;
  assert.equal(t1.set_code, 'BM-CĐ-04');
  assert.equal(t1.dept_code, 'CĐ');
  assert.equal(t1.state, 'ACTIVE');
  assert.equal(t1.sheet_count, 4);
  assert.deepEqual(t1.sheets_json[2], { n: 'BM-CĐ-04-03', p: 'A3', o: 'L' });
  const grp = env.rows('Groups').find((x) => x.group_key === 'CĐ-04');
  assert.equal(t1.title_vi, grp ? grp.name_vi : 'BM-CD-04_Sua-chua');
  // Trùng operation_id: không thêm tệp
  const docs0 = env.rows('Documents').filter((d) => d.entity_type === 'TPL').length;
  assert.equal(docs0, 1);
  // Bộ của bộ phận ngoài phạm vi
  const sxBytes = tplWorkbook(['BM-SX-02-01']);
  assert.equal(upload(owner, 'BM-SX-02_San-xuat.xlsx', sxBytes, readSheets(X, sxBytes)).errors[0].code, 'APP_SCOPE');
  // Tra cứu cấp 1: thấy tệp đang dùng, tải được nội dung đúng
  const tc = userClient(env, 'TC1', 1, '583943', { depts: 'CĐ' });
  let tpl = tc.call('sync.bootstrap', {}).data.records.TPL;
  assert.deepEqual(tpl.map((x) => x.tpl_id), [t1.tpl_id]);
  const g1 = tc.call('doc.get', { document_id: t1.document_id });
  assert.equal(g1.ok, true, JSON.stringify(g1).slice(0, 300));
  assert.equal(g1.data.content_b64, b64(bytes));
  assert.equal(g1.data.file_name, 'BM-CD-04_Sua-chua.xlsx');
  // Tải lên lần nữa cùng bộ → tệp cũ REPLACED
  const bytes2 = tplWorkbook(names.concat(['BM-CĐ-04-07']));
  const r2 = upload(owner, 'BM-CD-04_Sua-chua (2).xlsx', bytes2, readSheets(X, bytes2));
  assert.equal(r2.ok, true);
  assert.deepEqual(r2.data.replaced, [t1.tpl_id]);
  const t2 = r2.data.record;
  const old = env.rows('TplFiles').find((x) => x.tpl_id === t1.tpl_id);
  assert.equal(old.state, 'REPLACED');
  assert.equal(old.replaced_by_id, t2.tpl_id);
  // Cấp 1: tệp cũ rời máy (TOMBSTONE), không tải được; cấp 3 vẫn xem / tải được
  const chg = tc.call('sync.changes', { cursor: 0 }).data.changes.filter((c) => c.entity_type === 'TPL');
  assert.deepEqual(chg.map((c) => [c.entity_id === t1.tpl_id ? 'old' : 'new', c.op]).sort(), [['new', 'UPSERT'], ['old', 'TOMBSTONE']]);
  assert.equal(tc.call('doc.get', { document_id: t1.document_id }).code, 'FORBIDDEN');
  const tb = userClient(env, 'TB1', 3, '583944', { depts: 'CĐ' });
  assert.equal(tb.call('sync.bootstrap', {}).data.records.TPL.length, 2);
  assert.equal(tb.call('doc.get', { document_id: t1.document_id }).ok, true);
  // Sửa tên (Thư ký ISO)
  const e1 = owner.write('tpl.edit', { tpl_id: t2.tpl_id, title_vi: 'Sửa chữa', title_zh: '维修', note: '' }, { expected_version: t2.record_version });
  assert.equal(e1.ok, true, JSON.stringify(e1).slice(0, 300));
  assert.equal(e1.data.record.title_vi, 'Sửa chữa');
  // Bỏ tệp: không có quyền → FORBIDDEN trước khi hỏi PIN; Thư ký ISO → hỏi PIN → bỏ, tệp trước dùng lại, Drive vào thùng rác
  assert.equal(nv.write('tpl.delete', { tpl_id: t2.tpl_id, reason: 'x' }, { expected_version: e1.data.record.record_version }).code, 'FORBIDDEN');
  assert.equal(tk.write('tpl.delete', { tpl_id: t2.tpl_id, reason: 'Tải nhầm' }, { expected_version: e1.data.record.record_version }).code, 'REAUTH_REQUIRED');
  tk.pin('583942');
  const dl = tk.write('tpl.delete', { tpl_id: t2.tpl_id, reason: 'Tải nhầm' }, { expected_version: e1.data.record.record_version });
  assert.equal(dl.ok, true, JSON.stringify(dl).slice(0, 300));
  assert.equal(dl.data.restored, t1.tpl_id);
  const rows = env.rows('TplFiles');
  assert.equal(rows.find((x) => x.tpl_id === t2.tpl_id).state, 'DELETED');
  assert.equal(rows.find((x) => x.tpl_id === t1.tpl_id).state, 'ACTIVE');
  const d2 = env.rows('Documents').find((d) => d.document_id === t2.document_id);
  assert.equal(d2.active, false);
  assert.equal(env.drive._files.get(d2.drive_file_id).trashed, true);
  assert.equal(tc.call('doc.get', { document_id: t2.document_id }).code, 'NOT_FOUND');
  tpl = tc.call('sync.bootstrap', {}).data.records.TPL;
  assert.deepEqual(tpl.map((x) => x.tpl_id), [t1.tpl_id]);
  // Bỏ lần nữa → không còn đang dùng
  assert.equal(tk.write('tpl.delete', { tpl_id: t2.tpl_id, reason: 'x' }, { expected_version: dl.data.record.record_version }).code, 'NOT_FOUND');
  // Trạng thái hệ thống
  const h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'templates');
  const nCd = env.rows('Items').filter((x) => x.dept_code === 'CĐ' && x.status !== 'NA').length;
  assert.equal(h.value, `1 tệp · 4 sheet · 1/${nCd} biểu trong phạm vi có tệp mẫu`);
  // Nhật ký
  const acts = env.rows('AuditLogs').map((a) => a.action).filter((a) => /^tpl\./.test(a));
  assert.deepEqual(acts, ['tpl.upload', 'tpl.upload', 'tpl.edit', 'tpl.delete']);
});

test('Kho tệp mẫu: tệp Word / PDF không có sheet (bộ lấy từ tên tệp, cùng tên tệp thì thay), trùng operation_id không tạo thêm tệp; quên migrateSchema thì tự thêm sheet', () => {
  const { env, owner } = seeded('CĐ');
  const pdf = Buffer.alloc(3000, 32); Buffer.from('%PDF-1.7\n').copy(pdf);
  const p1 = { tpl_id: uuid(), document_id: uuid(), file_name: 'Huong_dan_in.pdf', mime_type: 'application/pdf', content_b64: pdf.toString('base64'), sheets: [{ n: 'bỏ qua' }] };
  const opId = uuid();
  const r1 = owner.call('tpl.upload', p1, { operation_id: opId, expected_version: 0 });
  assert.equal(r1.ok, true, JSON.stringify(r1).slice(0, 300));
  assert.equal(r1.data.record.set_code, '');
  assert.deepEqual(r1.data.record.sheets_json, []);
  assert.equal(r1.data.record.title_vi, 'Huong_dan_in');
  const again = owner.call('tpl.upload', p1, { operation_id: opId, expected_version: 0 });
  assert.equal(again.code, 'DUPLICATE_OPERATION');
  assert.equal(env.rows('Documents').filter((d) => d.entity_type === 'TPL').length, 1);
  assert.equal([...env.drive._files.values()].filter((f) => /^TM_/.test(f.name) && !f.trashed).length, 1);
  // Cùng tên tệp (không rõ bộ) → thay
  const r2 = owner.write('tpl.upload', { ...p1, tpl_id: uuid(), document_id: uuid() });
  assert.deepEqual(r2.data.replaced, [r1.data.record.tpl_id]);
  // Tệp Word theo tên BM-CD-12_… → bộ BM-CĐ-12
  const docx = tplWorkbook(['x']); // gói zip (PK) như docx
  const r3 = owner.write('tpl.upload', { tpl_id: uuid(), document_id: uuid(), file_name: 'BM-CD-12_Dao-tao.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', content_b64: b64(docx) });
  assert.equal(r3.data.record.set_code, 'BM-CĐ-12');
  // Máy chủ 2e chưa chạy migrateSchema (chưa có TplFiles): lần tải lên đầu tiên tự thêm sheet
  const { env: env2, owner: o2 } = seeded('CĐ');
  env2.g.book_('B').deleteSheet(env2.g.book_('B').getSheetByName('TplFiles'));
  env2.g.withWriteLock_(() => env2.g.stateWrite_(env2.g.readState_(), { schema_version: ['STRING', '1.0.6'] }, 'TEST'));
  env2.g.cache_().remove('sys:state');
  env2.g.dbReset_();
  assert.equal(o2.call('sync.bootstrap', {}).ok, true, 'đăng nhập / đồng bộ vẫn chạy khi thiếu sheet');
  const r4 = o2.write('tpl.upload', { ...p1, tpl_id: uuid(), document_id: uuid() });
  assert.equal(r4.ok, true, JSON.stringify(r4).slice(0, 300));
  env2.g.dbReset_();
  assert.equal(env2.g.sheetExists_('TplFiles'), true);
});
