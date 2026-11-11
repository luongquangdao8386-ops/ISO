// Nhập / xuất file Excel tổng: 221 dòng (dữ liệu giả cùng khuôn), đúng 4 tình trạng ○ ◐ ● ✕, xem trước theo lượt ≤ 200 dòng,
// ghi ≤ 100 dòng/lượt, lô nhạy cảm (người ghi khác người nhập), xuất ra rồi nhập lại báo "Không đổi", dòng lỗi, ROW_CHANGED.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, uuid, OWNER_PIN } from '../helpers.mjs';
import { xlsx } from '../xlsx-node.mjs';
import { buildCatalogWorkbook, parseCatalogWorkbook, SHEET } from '../../js/catalog-xlsx.js';
import { polishXlsx } from '../../js/xlsx.js';

const NOW = '2026-11-06T08:00:00+07:00';
const X = xlsx();
const DEPTS = [['ISO', 24], ['BRC', 27], ['CL', 20], ['CB', 9], ['KD', 8], ['SX', 7], ['KV', 7], ['NS', 7], ['MH', 6], ['CĐ', 106]];
const WHERE = ['MANUAL', 'ME', 'CS', 'ME_PART', 'CS_PART', 'CS_PROPOSED'];

/** 221 biểu giả: CĐ 106 (100 ◐, 3 ●, 3 ✕), biểu mới 115 ở 9 bộ phận (106 ○, 9 ●) — cùng số biểu từng bộ phận như file tổng, tên giả */
function fakeCatalog() {
  const items = [], groups = [];
  let n = 0;
  DEPTS.forEach(([dep, cnt]) => {
    for (let i = 0; i < cnt; i++) {
      const g = String(1 + Math.floor(i / 8)).padStart(2, '0');
      const key = `${dep}-${g}`;
      if (!groups.some((x) => x.group_key === key)) groups.push({ group_key: key, dept_code: dep, name_vi: dep === 'CĐ' ? `NHÓM ${g}` : `Nhóm ${g}`, name_zh: `第${g}组`, label: dep === 'CĐ' ? `${g}. NHÓM ${g} · ${g}. 第${g}组` : `${g}. Nhóm ${g} · 第${g}组` });
      n++;
      let status = dep === 'CĐ' ? 'DRAFTING' : 'NONE';
      if (dep === 'CĐ' && i < 3) status = 'ISSUED';
      if (dep === 'CĐ' && i >= 3 && i < 6) status = 'NA';
      if (dep !== 'CĐ' && i === 0) status = 'ISSUED';
      items.push({
        code: `BM-${dep}-${g}-${String(i % 8 + 1).padStart(2, '0')}`, name_vi: `Biểu giả ${n}`, name_zh: `测试表${n}`, purpose_vi: i % 3 ? `Mục đích ${n}` : '', purpose_zh: i % 3 ? `用途${n}` : '',
        dept_code: dep, group_key: key, iso9001: i % 4 === 0 ? '7.5.3; 8.5.2' : (i % 4 === 1 ? '9.2' : ''), brc_topics: i % 5 === 0 ? 'Truy xuất; Kiểm soát vật lạ' : '',
        freq_vi: 'Hằng tháng', freq_zh: '每月', flow: 'Nhân viên → Trưởng bộ phận', keep: '3 năm\n3年', priority: dep === 'CĐ' ? null : (i % 3) + 1, where: WHERE[i % 6],
        where_note: '', status, current_rev: status === 'ISSUED' ? '01' : '', issued_at: status === 'ISSUED' ? '2026-01-05' : '', period_days: [1, 7, 31, 92, 183, 366, null][i % 7],
        note: i % 9 === 0 ? 'Ghi chú; liên quan BM-ISO-02-01' : '', sort_order: n, law: '', cls: dep === 'CĐ' ? 'A – ISO yêu cầu\nA – ISO要求' : ''
      });
    }
  });
  return { items, groups };
}

function workbookBytes(data) {
  const { wb, polish } = buildCatalogWorkbook(X, data);
  return polishXlsx(X, X.write(wb, { type: 'array', bookType: 'xlsx', compression: true }), polish);
}

/** Gửi xem trước theo lượt ≤ 200 dòng như app */
function preview(c, parsed, name = 'tong.xlsx') {
  const id = uuid();
  const parts = [];
  for (let i = 0; i < parsed.rows.length; i += 200) parts.push(parsed.rows.slice(i, i + 200));
  let res;
  const rows = [];
  parts.forEach((p, i) => {
    res = c.write('import.preview', { import_batch_id: id, file_name: name, source_sha256: 'x', meta: Object.keys(parsed.meta).length ? parsed.meta : null, part: { index: i, count: parts.length }, rows: p, clauses: i === 0 ? parsed.clauses : undefined });
    assert.equal(res.ok, true, JSON.stringify(res).slice(0, 500));
    rows.push(...res.data.rows);
    if (res.data.all_rows) rows.splice(0, rows.length, ...res.data.all_rows);
  });
  return { id, batch: res.data.batch, rows };
}

function commitAll(c, id) {
  const calls = [];
  for (let i = 0; i < 10; i++) {
    const r = c.write('import.commit', { import_batch_id: id });
    calls.push(r);
    if (!r.ok || !r.data.remaining) break;
  }
  return calls;
}

test('nhập file Excel tổng 221 dòng: 2 lượt xem trước, ghi 3 lượt (100+100+21), đúng 4 tình trạng; xuất rồi nhập lại báo Không đổi', () => {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  const tk = userClient(env, 'TK1', 2, '583920', { depts: 'ISO', secretary: true });
  const tk2 = userClient(env, 'TK2', 2, '583921', { depts: 'ISO', secretary: true });
  const depts = owner.call('sync.bootstrap', {}).data.records.DEPT;
  const { items, groups } = fakeCatalog();
  const clauses = [
    { std: 'ISO9001', key: '7.5.3', group_vi: 'Hỗ trợ', group_zh: '支持', name_vi: 'Kiểm soát thông tin dạng văn bản', name_zh: '成文信息的控制', mandatory_record: true, sort_order: 1, active: true },
    { std: 'ISO9001', key: '9.2', group_vi: 'Đánh giá', group_zh: '评价', name_vi: 'Đánh giá nội bộ', name_zh: '内部审核', mandatory_record: true, sort_order: 2, active: true },
    { std: 'ISO9001', key: '10.2', group_vi: 'Cải tiến', group_zh: '改进', name_vi: 'Khắc phục', name_zh: '纠正措施', mandatory_record: true, sort_order: 3, active: true },
    { std: 'BRC', key: 'Truy xuất', group_vi: 'Hệ thống chất lượng', group_zh: '质量体系', name_vi: 'Truy xuất nguồn gốc', name_zh: '可追溯性', mandatory_record: false, sort_order: 1, active: true }
  ];
  const bytes = workbookBytes({ items, groups, depts, clauses, grace: 3, epoch: '', exported_at: '2026-11-06' });
  const wb = X.read(bytes, { type: 'array', cellDates: true });
  assert.deepEqual([...wb.SheetNames], [SHEET.summary, SHEET.catalog, SHEET.iso, SHEET.brc, SHEET.guide, '_meta']);
  const parsed = parseCatalogWorkbook(X, wb);
  assert.equal(parsed.rows.length, 221);
  assert.equal(parsed.rows[0].row_number, 5, 'dữ liệu từ dòng 5');
  assert.equal(parsed.clauses.length, 4);
  assert.equal(parsed.grace, 3);
  const pv = preview(tk, parsed);
  assert.equal(pv.batch.total_rows, 221);
  assert.equal(pv.batch.add_count, 221);
  assert.equal(pv.batch.error_count, 0, JSON.stringify(pv.rows.filter((r) => r.action === 'ERROR').slice(0, 3)));
  assert.equal(pv.batch.status, 'PREVIEWED');
  assert.equal(pv.batch.clause_count, 4);
  // Lô nhạy cảm: người nhập không tự ghi (trừ cấp 4)
  tk.pin('583920');
  assert.equal(tk.write('import.commit', { import_batch_id: pv.id }).errors[0].code, 'IMPORT_SAME_USER');
  // Người khác chưa nhập lại PIN → REAUTH_REQUIRED; có PIN → ghi 3 lượt
  assert.equal(tk2.write('import.commit', { import_batch_id: pv.id }).code, 'REAUTH_REQUIRED');
  tk2.pin('583921');
  const calls = commitAll(tk2, pv.id);
  assert.deepEqual(calls.map((r) => r.ok && r.data.committed), [100, 100, 21]);
  assert.equal(calls[2].data.batch.status, 'COMPLETED');
  assert.equal(calls[0].data.clauses, 4, 'điều khoản ghi ở lượt đầu');
  const rows = env.rows('Items');
  assert.equal(rows.length, 221);
  const count = (s) => rows.filter((r) => r.status === s).length;
  assert.deepEqual([count('NONE'), count('DRAFTING'), count('ISSUED'), count('NA')], [106, 100, 12, 3]);
  const issued = rows.find((r) => r.status === 'ISSUED');
  assert.equal(issued.file_missing, true, 'biểu ● nhập từ Excel chưa có tệp → gắn cờ');
  assert.equal(issued.issued_source, 'IMPORT');
  assert.equal(issued.review_due, '2027-01-05', 'hạn rà soát = ngày ban hành + 12 tháng');
  assert.equal(rows.find((r) => r.code === 'BM-CĐ-01-01').group_key, 'CĐ-01');
  assert.equal(env.rows('Groups').find((g) => g.group_key === 'CĐ-01').label, '01. NHÓM 01 · 01. 第01组');
  assert.equal(env.g.setting_('records_start_date'), '2026-11-06', 'ngày bắt đầu tính hồ sơ = ngày nhập danh mục đầu tiên');
  assert.equal(env.rows('Clauses').length, 4);
  // Xuất từ dữ liệu máy chủ rồi nhập lại: Không đổi
  const rec = owner.call('sync.bootstrap', {}).data.records;
  const again = parseCatalogWorkbook(X, X.read(workbookBytes({ items: rec.ITEM, groups: rec.GROUP, depts: rec.DEPT, clauses: rec.CLAUSE, grace: 3, epoch: env.props.getProperty('DATASET_EPOCH'), exported_at: 'x' }), { type: 'array', cellDates: true }));
  assert.equal(again.rows.length, 221);
  const pv2 = preview(tk, again);
  assert.equal(pv2.batch.same_count, 221, JSON.stringify(pv2.rows.filter((r) => r.action !== 'SAME').slice(0, 3)));
  assert.equal(pv2.batch.clause_count, 0);
});

test('dòng lỗi (ký hiệu tình trạng, bộ phận, trùng mã, ngày), sửa một dòng → UPDATE; biểu bị sửa sau xem trước → ROW_CHANGED; tệp không đúng khuôn', () => {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  owner.pin(OWNER_PIN);
  const rec = owner.call('sync.bootstrap', {}).data.records;
  const parsed = parseCatalogWorkbook(X, X.read(workbookBytes({ items: rec.ITEM, groups: rec.GROUP, depts: rec.DEPT, clauses: rec.CLAUSE, grace: 3, epoch: env.props.getProperty('DATASET_EPOCH') }), { type: 'array', cellDates: true }));
  const byCode = (c) => parsed.rows.find((r) => r.cells.B === c);
  byCode('BM-KD-02-01').cells.T = '?';
  byCode('BM-CB-01-02').cells.E = 'Phòng không có';
  byCode('BM-SX-01-01').cells.B = 'BM-SX-02-01';
  byCode('BM-CL-01-01').cells.V = '31/02/2026';
  byCode('BM-NS-01-02').cells.C = 'Kế hoạch đào tạo năm (sửa)\n年度培训计划';
  byCode('BM-NS-01-02').cells.W = '183';
  parsed.rows.push({ row_number: 99, cells: { B: 'BM-KD-03-01', C: 'Biểu mới\n新表', E: 'Kinh doanh · 销售', F: '03. Báo giá · 报价', T: '○' } });
  const pv = preview(owner, parsed);
  const act = (c) => pv.rows.find((r) => r.code === c);
  assert.equal(act('BM-KD-02-01').errors[0].code, 'STATUS_SYMBOL');
  assert.equal(act('BM-CB-01-02').errors[0].code, 'DEPT_UNKNOWN');
  const dup = pv.rows.filter((r) => r.code === 'BM-SX-02-01');
  assert.equal(dup.length, 2);
  assert.ok(dup.every((r) => r.action === 'ERROR' && r.errors.some((e) => e.code === 'CODE_DUPLICATE_FILE')), 'trùng mã: cả hai dòng lỗi, không dòng nào đè dòng kia');
  assert.equal(act('BM-CL-01-01').errors[0].code, 'INVALID_DATE');
  assert.equal(act('BM-NS-01-02').action, 'UPDATE');
  assert.deepEqual(act('BM-NS-01-02').changes.sort(), ['name_vi', 'period_days']);
  assert.equal(act('BM-KD-03-01').action, 'ADD');
  assert.equal(pv.batch.error_count, 5);
  // Biểu bị sửa trong app sau khi xem trước → dòng đó không ghi
  const it = env.rows('Items').find((x) => x.code === 'BM-NS-01-02');
  assert.equal(owner.write('item.edit', { item_id: it.item_id, note: 'sửa trong app' }, { expected_version: it.record_version }).ok, true);
  const calls = commitAll(owner, pv.id);
  const last = calls[calls.length - 1];
  assert.equal(last.ok, true, JSON.stringify(last));
  assert.equal(calls[0].data.committed, 1, 'chỉ ghi dòng thêm mới');
  assert.deepEqual(calls[0].data.row_errors.map((e) => e.error), ['ROW_CHANGED']);
  assert.ok(env.rows('Items').some((x) => x.code === 'BM-KD-03-01' && x.group_key === 'KD-03'));
  // Lô đã xong không ghi lại được, không bỏ được
  assert.equal(owner.write('import.commit', { import_batch_id: pv.id }).errors[0].code, 'BATCH_STATE');
  assert.equal(owner.write('import.cancel', { import_batch_id: pv.id }).errors[0].code, 'BATCH_STATE');
  // Tệp không đúng khuôn
  const bad = X.utils.book_new();
  X.utils.book_append_sheet(bad, X.utils.aoa_to_sheet([['a', 'b']]), 'Sheet1');
  assert.ok(parseCatalogWorkbook(X, bad).errors.includes('TEMPLATE_UNKNOWN'));
  // Tệp xuất trước lần đặt lại dữ liệu (khác dataset_epoch)
  const r = owner.write('import.preview', { import_batch_id: uuid(), file_name: 'x', meta: { template_key: 'iso_catalog', version: '1', dataset_epoch: 'khac' }, part: { index: 0, count: 1 }, rows: [] });
  assert.equal(r.errors[0].code, 'TEMPLATE_OLD_EPOCH');
});

test('xuất Excel đúng khuôn DM-ISO-01: 5 sheet, tiêu đề dòng 4, công thức cột Y/AA, Phủ ISO/BRCGS, Tổng hợp theo bộ phận; cố định D5, nền vàng, danh sách chọn, tô màu, cột ẩn', () => {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  const rec = owner.call('sync.bootstrap', {}).data.records;
  const bytes = workbookBytes({ items: rec.ITEM, groups: rec.GROUP, depts: rec.DEPT, clauses: rec.CLAUSE, grace: 3, epoch: 'e', exported_at: '2026-11-11 08:00' });
  const zip = X.CFB.read(new Uint8Array(bytes), { type: 'array' });
  const xml = (p) => new TextDecoder().decode(X.CFB.find(zip, '/' + p).content);
  const s2 = xml('xl/worksheets/sheet2.xml');
  assert.match(s2, /<pane xSplit="3" ySplit="4" topLeftCell="D5" activePane="bottomRight" state="frozen"\/>/);
  assert.match(s2, /<dataValidation type="list"[^>]*sqref="T5:T600"><formula1>"○,◐,●,✕"<\/formula1>/);
  assert.match(s2, /<dataValidation type="list"[^>]*sqref="R5:R600"><formula1>'Hướng dẫn - 说明'!\$F\$5:\$F\$10<\/formula1>/);
  assert.match(s2, /<dataValidation type="date" operator="greaterThanOrEqual"[^>]*sqref="V5:V600 X5:X600"><formula1>DATE\(2015,1,1\)<\/formula1>/);
  assert.match(s2, /<conditionalFormatting sqref="Y5:Y600"><cfRule type="expression"[^>]*><formula>LEFT\(Y5,7\)=&quot;Quá hạn&quot;<\/formula>/);
  assert.match(s2, /<col min="27" max="27"[^>]*hidden="(1|true)"/);
  const st = xml('xl/styles.xml');
  assert.match(st, /FFFFF2CC/);
  assert.match(st, /FF1F3864/);
  assert.match(st, /formatCode="dd\/mm\/yyyy"/);
  const wb = X.read(bytes, { type: 'array', cellFormula: true });
  const cat = wb.Sheets[SHEET.catalog];
  assert.equal(cat.B4.v, 'Mã biểu mẫu\n表单编号');
  assert.equal(cat.R4.v, 'Nơi làm\n完成方式');
  assert.equal(cat.Y5.f, `IF(B5="","",IF(T5="✕","Không áp dụng · 不适用",IF(W5="","Khi phát sinh · 发生时记录",IF(X5="","Chưa có hồ sơ · 暂无记录",IF(TODAY()-X5<=W5+'Tổng hợp - 汇总'!$D$4,"Đúng hạn · 按期","Quá hạn · 逾期")))))`);
  assert.equal(cat.AA600.f, '";"&SUBSTITUTE(G600," ","")&";"', 'công thức tới dòng 600');
  const sum = wb.Sheets[SHEET.summary];
  assert.equal(sum.D4.v, 3);
  assert.equal(sum.B7.f, "COUNTA('Danh mục tổng - 总清单'!$B$5:$B$600)");
  assert.equal(sum.B10.v, 'Ban ISO · 体系办');
  assert.equal(sum.C10.f, "COUNTIF('Danh mục tổng - 总清单'!$E$5:$E$600,$B10)");
  assert.equal(sum.B20.v, 'Tổng · 合计', '10 bộ phận ở dòng 10–19, dòng tổng 20');
  const iso = wb.Sheets[SHEET.iso];
  assert.equal(iso.A4.v, 'Điều khoản\n条款');
  assert.equal(iso.D5.f, `COUNTIF('Danh mục tổng - 总清单'!$AA$5:$AA$600,"*;"&$A5&"*")`);
  assert.equal(iso.G5.f, 'IF(D5=0,IF(LEFT(C5,2)="Có","Thiếu biểu – bắt buộc · 缺表单（强制）","Chưa có biểu · 无表单"),IF(E5=0,"Có biểu, chưa ban hành · 有表单未发布","Đã có · 已覆盖"))');
  const brc = wb.Sheets[SHEET.brc];
  assert.equal(brc.H4.v, 'Khóa chủ đề\n主题关键字');
  assert.equal(brc.D5.f, `COUNTIF('Danh mục tổng - 总清单'!$K$5:$K$600,"*"&$H5&"*")`);
  assert.equal(wb.Sheets[SHEET.guide].F10.v, 'Làm tay → App ISO · 手工→ISO App');
  // Điều khoản bắt buộc: "Có · 是" đọc lại được
  const back = parseCatalogWorkbook(X, X.read(bytes, { type: 'array', cellDates: true }));
  const m0 = rec.CLAUSE.filter((c) => c.std === 'ISO9001' && c.mandatory_record).length;
  assert.ok(m0 > 0);
  assert.equal(back.clauses.filter((c) => c.std === 'ISO9001' && c.mandatory_record).length, m0);
});
