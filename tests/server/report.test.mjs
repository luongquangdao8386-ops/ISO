// Báo cáo (Đợt 2, phiên 2c): 4 báo cáo do máy chủ tính, lưu có số BC-yymm-001, PDF dựng bằng Google Docs (giả lập DocumentApp kiểm
// đúng tên phương thức), Excel dựng trên máy từ cùng bố cục. Kiểm: quyền theo loại báo cáo và phạm vi bộ phận; số liệu Tình trạng hồ sơ
// khớp js/periods.js (cách app tính bảng kỳ); Phủ điều khoản khớp js/coverage.js (cách Excel đếm); lịch sử phiên bản; lưu → cùng
// report_run_id cùng số, cùng số liệu (bản chụp), PDF giữ lại không dựng lại; báo cáo đã lưu theo người lập / Thư ký ISO; logo trên
// PDF; dán Code.gs 2c quên migrateSchema.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, uuid, OWNER_PIN, fakePngB64 } from '../helpers.mjs';
import { periodOf, countInfo, periodCell, addDays } from '../../js/periods.js';
import { coverageRows } from '../../js/coverage.js';

const NOW = '2026-11-12T09:00:00+07:00'; // Thứ Năm

function setItem(env, code, patch) {
  const g = env.g;
  g.dbReset_();
  const it = g.readRows_('Items').find((x) => x.code === code);
  const row = { ...it, ...patch, record_version: (it.record_version || 0) + 1 };
  delete row.__row;
  g.systemWrite_([{ sheet: 'Items', mode: 'update', row }]);
  g.dbReset_();
}

function seeded() {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  env.g.dbReset_();
  return { env, owner };
}

const item = (env, code) => env.rows('Items').find((x) => x.code === code);
const submit = (c, env, code, from, to) => {
  const r = c.write('record.submit', { record_id: uuid(), item_id: item(env, code).item_id, period_from: from, period_to: to, pages: 1 });
  assert.equal(r.ok, true, JSON.stringify(r));
  return r;
};
const run = (c, kind, filters = {}) => c.call('report.run', { kind, filters });
const codesOf = (rep) => rep.data.depts.flatMap((d) => d.rows.map((r) => r.code));

test('quyền: cấp 1 chỉ Danh mục + Lịch sử phiên bản trong phạm vi; cấp 2 chỉ bộ phận mình + tài liệu chung; bộ lọc sai báo lỗi', () => {
  const { env, owner } = seeded();
  const kd1 = userClient(env, 'KD1', 1, '583921', { depts: 'KD' });
  const sx2 = userClient(env, 'SX2', 2, '583922', { depts: 'SX' });
  // Cấp 1: Tình trạng hồ sơ, Phủ điều khoản → FORBIDDEN
  assert.equal(run(kd1, 'RECORDS').code, 'FORBIDDEN');
  assert.equal(run(kd1, 'COVERAGE').code, 'FORBIDDEN');
  const c1 = run(kd1, 'CATALOG', { scope: 'ALL' });
  assert.equal(c1.ok, true, JSON.stringify(c1));
  const set1 = new Set(c1.data.report.data.depts.map((d) => d.dept_code));
  assert.deepEqual([...set1].sort(), ['ISO', 'KD']); // bộ phận mình + tài liệu chung (ISO)
  assert.equal(c1.data.report.scope_depts, 'KD');
  // Lịch sử phiên bản: biểu ngoài phạm vi → FORBIDDEN
  assert.equal(run(kd1, 'VERSIONS', { item_id: item(env, 'BM-CL-01-01').item_id }).code, 'FORBIDDEN');
  assert.equal(run(kd1, 'VERSIONS', { item_id: item(env, 'BM-KD-01-04').item_id }).ok, true);
  // Cấp 1 không lưu được báo cáo Tình trạng hồ sơ
  assert.equal(kd1.write('report.save', { report_run_id: uuid(), kind: 'RECORDS', filters: {}, format: 'XLSX' }).code, 'FORBIDDEN');
  // Cấp 2: tình trạng hồ sơ chỉ SX (+ ISO chung)
  const r2 = run(sx2, 'RECORDS');
  assert.equal(r2.ok, true);
  assert.ok(r2.data.report.data.depts.every((d) => ['SX', 'ISO'].includes(d.dept_code)));
  // Bộ lọc sai
  assert.equal(run(owner, 'NOPE').code, 'VALIDATION_ERROR');
  assert.equal(run(owner, 'CATALOG', { dept: 'XX' }).code, 'VALIDATION_ERROR');
  assert.equal(run(owner, 'RECORDS', { grain: 'MONTH', end: '2026-12' }).code, 'VALIDATION_ERROR'); // kỳ chưa tới
  assert.equal(run(owner, 'RECORDS', { grain: 'MONTH', n: 13 }).code, 'VALIDATION_ERROR');
  assert.equal(run(owner, 'RECORDS', { grain: 'QUARTER', end: '2026-11' }).code, 'VALIDATION_ERROR');
  assert.equal(run(owner, 'VERSIONS', {}).code, 'VALIDATION_ERROR');
});

test('Danh mục tài liệu hiện hành: chỉ ●, % ban hành = ● / (tổng − ✕), hạn rà soát quá / sắp tới, lọc bộ phận, mẫu BM-ISO-02-01', () => {
  const { env, owner } = seeded();
  setItem(env, 'BM-KD-01-04', { review_due: '2026-11-01' }); // quá hạn rà soát
  setItem(env, 'BM-NS-01-02', { review_due: '2026-11-30' }); // trong 30 ngày
  const r = run(owner, 'CATALOG');
  assert.equal(r.ok, true, JSON.stringify(r));
  const rep = r.data.report;
  const all = env.rows('Items');
  const issued = all.filter((x) => x.status === 'ISSUED');
  const na = all.filter((x) => x.status === 'NA').length;
  assert.deepEqual(codesOf(rep).sort(), issued.map((x) => x.code).sort());
  assert.equal(rep.data.counts.total, all.length);
  const pct = Math.round(issued.length / (all.length - na) * 1000) / 10;
  assert.equal(rep.tiles.find((t) => t.k === 'rpt.t.issued_pct').v, String(pct).replace('.', ',') + ' %');
  assert.equal(rep.tiles.find((t) => t.k === 'rpt.t.review_overdue').v, '1');
  const kd = rep.data.depts.find((d) => d.dept_code === 'KD').rows[0];
  assert.equal(kd.review_state, 'OVERDUE');
  assert.equal(rep.data.depts.find((d) => d.dept_code === 'NS').rows[0].review_state, 'SOON');
  // Biểu mẫu mà báo cáo thay: BM-ISO-02-01 đang ● lần 1
  assert.equal(rep.form_code, 'BM-ISO-02-01');
  assert.equal(rep.form_rev, '01');
  // Bố cục: phần theo bộ phận, cột Ghi chú báo quá hạn rà soát (đỏ)
  const lay = r.data.layout;
  const sec = lay.sections.find((s) => s.heading.startsWith('KD · '));
  assert.ok(sec.table.rows[0].join('|').includes('Quá hạn rà soát'));
  assert.equal(sec.table.tones[0][6], 'red');
  assert.ok(lay.meta_right.some((l) => l[1].startsWith('BM-ISO-02-01')));
  // Tất cả tình trạng + lọc bộ phận
  const r2 = run(owner, 'CATALOG', { scope: 'ALL', dept: 'CĐ' });
  assert.deepEqual(codesOf(r2.data.report).sort(), all.filter((x) => x.dept_code === 'CĐ').map((x) => x.code).sort());
  assert.match(r2.data.report.dept_label, /^CĐ · Cơ điện/);
});

/** Ô báo cáo theo đúng quy tắc của bảng kỳ trong app (js/periods.js) — đối chiếu với máy chủ */
function expectedCells(it, recs, rep, { today, grace, startSetting = '' }) {
  const d = rep.data;
  const info = countInfo(it, startSetting, { today });
  const from = d.from, to = d.to;
  const cols = d.cols;
  const colOf = (x) => cols.findIndex((c) => x >= c.from && x <= c.to);
  const acc = cols.map(() => ({ n: 0, ok: 0, late: 0 }));
  for (let p = periodOf(info.type, from); p && p.from <= to; p = periodOf(info.type, addDays(p.to, 1))) {
    if (p.from > today) continue;
    const c = periodCell(p, recs, [], { counted: info.counted, start: info.start, today, grace, evs: [] });
    if (c.st === 'NA') continue;
    const k = colOf(p.to < to ? p.to : to);
    acc[k].n++;
    if (c.st === 'OK') acc[k].ok++; else if (c.st === 'LATE') acc[k].late++;
  }
  return acc.map((a) => {
    if (!a.n) return '';
    if (a.n === 1) return a.ok ? '✓' : (a.late ? '!' : '–');
    return (a.late ? '! ' : '') + a.ok + '/' + a.n;
  });
}

test('Tình trạng hồ sơ: ô tháng / quý khớp bảng kỳ của app (js/periods.js); biểu khi phát sinh đếm lần nộp; trả lại → kỳ về chưa có', () => {
  const { env, owner } = seeded();
  setItem(env, 'BM-CL-01-01', { period_type: 'MONTH', period_days: 31, records_from: '2026-06-01' });
  submit(owner, env, 'BM-SX-01-01', '2026-10-01', '2026-10-31'); // sổ ngày cả tháng 10
  submit(owner, env, 'BM-SX-01-01', '2026-11-03', '2026-11-04');
  submit(owner, env, 'BM-CL-01-01', '2026-09-20', '2026-09-20');
  submit(owner, env, 'BM-KD-01-04', '2026-11-02', '2026-11-08'); // tuần W45
  submit(owner, env, 'BM-ISO-02-01', '2026-10-15', '2026-10-15'); // khi phát sinh
  const r = run(owner, 'RECORDS', { grain: 'MONTH', end: '2026-11', n: 6 });
  assert.equal(r.ok, true, JSON.stringify(r));
  const rep = r.data.report;
  assert.deepEqual(rep.data.cols.map((c) => c.key), ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
  const today = '2026-11-12', grace = 3;
  const recs = env.rows('Records').filter((x) => x.status === 'SUBMITTED');
  const rows = rep.data.depts.flatMap((d) => d.rows);
  let checked = 0;
  for (const row of rows) {
    if (row.type === 'EVENT') continue;
    const it = env.rows('Items').find((x) => x.item_id === row.item_id);
    const exp = expectedCells(it, recs.filter((x) => x.item_id === it.item_id), rep, { today, grace });
    assert.deepEqual(row.cells.map((c) => c.t), exp, row.code);
    checked++;
  }
  assert.ok(checked >= 5);
  const sx = rows.find((x) => x.code === 'BM-SX-01-01');
  assert.equal(sx.cells[4].t, '31/31'); assert.equal(sx.cells[4].s, 'OK');
  assert.equal(sx.cells[5].t, '! 2/12'); assert.equal(sx.cells[5].s, 'LATE'); // 1–8/11 quá hạn (trừ 3, 4), 9–12/11 chưa tới hạn
  const cl = rows.find((x) => x.code === 'BM-CL-01-01');
  assert.deepEqual(cl.cells.map((c) => c.t), ['!', '!', '!', '✓', '!', '–']);
  assert.equal(cl.rate, 20);
  const ev = rows.find((x) => x.code === 'BM-ISO-02-01');
  assert.equal(ev.type, 'EVENT');
  assert.deepEqual(ev.cells.map((c) => c.t), ['', '', '', '', '1', '']);
  // Không tính: ○ ◐ (◐ có hồ sơ vẫn hiện), ✕, M&E / Checksheet chưa nối
  const nc = rep.data.not_counted;
  assert.ok(nc.NOT_ISSUED > 0 && nc.NA === 1);
  assert.ok(!rows.some((x) => x.code === 'BM-CĐ-04-03'));
  // Tổng hợp theo bộ phận: hàng Tổng cuối
  const lay = r.data.layout;
  assert.equal(lay.sections[0].total_row, true);
  const tot = lay.sections[0].table.rows.at(-1);
  assert.equal(tot[3], String(rep.data.totals.ok));
  // Theo quý: Q3 của biểu tháng = 1/3, có quá hạn
  const q = run(owner, 'RECORDS', { grain: 'QUARTER', end: '2026-Q4', n: 2 });
  const clq = q.data.report.data.depts.flatMap((d) => d.rows).find((x) => x.code === 'BM-CL-01-01');
  assert.deepEqual(clq.cells.map((c) => c.t), ['! 1/3', '! 0/2']);
  for (const row of q.data.report.data.depts.flatMap((d) => d.rows)) {
    if (row.type === 'EVENT') continue;
    const it = env.rows('Items').find((x) => x.item_id === row.item_id);
    assert.deepEqual(row.cells.map((c) => c.t), expectedCells(it, recs.filter((x) => x.item_id === it.item_id), q.data.report, { today, grace }), row.code);
  }
  // Trả lại hồ sơ tháng 9 của biểu tháng → ô 09/2026 thành quá hạn
  const rec = env.rows('Records').find((x) => x.item_id === cl.item_id);
  owner.pin(OWNER_PIN);
  assert.equal(owner.write('record.return', { record_id: rec.record_id, reason: 'thử' }, { expected_version: rec.record_version }).ok, true);
  const r3 = run(owner, 'RECORDS', { grain: 'MONTH', end: '2026-11', n: 6 });
  assert.equal(r3.data.report.data.depts.flatMap((d) => d.rows).find((x) => x.code === 'BM-CL-01-01').cells[3].t, '!');
});

test('Phủ điều khoản: khớp js/coverage.js (cách đếm của file Excel tổng); kèm mã biểu; phạm vi của cấp 2', () => {
  const { env, owner } = seeded();
  const r = run(owner, 'COVERAGE', { std: 'BOTH', codes: true });
  assert.equal(r.ok, true, JSON.stringify(r));
  const items = env.rows('Items'), clauses = env.rows('Clauses');
  for (const s of r.data.report.data.stds) {
    const exp = coverageRows(items, clauses, s.std);
    assert.deepEqual(s.rows.map((x) => [x.key, x.n, x.issued, x.app, x.state, x.mandatory]), exp.map((x) => [x.key, x.n, x.issued, x.app, x.state, x.mandatory]), s.std);
    s.rows.forEach((x, i) => assert.deepEqual(x.codes.map((c) => c.code).sort(), exp[i].items.map((it) => it.code).sort()));
  }
  const lay = r.data.layout;
  assert.equal(lay.sections.length, 2);
  assert.ok(lay.sections[0].table.head.at(-1).startsWith('Mã biểu'));
  // Không kèm mã biểu; chỉ BRCGS
  const r2 = run(owner, 'COVERAGE', { std: 'BRC', codes: false });
  assert.equal(r2.data.report.data.stds.length, 1);
  assert.equal(r2.data.report.data.stds[0].rows[0].codes, undefined);
  // Cấp 2 SX: đếm trên biểu trong phạm vi xem (SX + tài liệu chung)
  const sx2 = userClient(env, 'SX2', 2, '583922', { depts: 'SX' });
  const r3 = run(sx2, 'COVERAGE', { std: 'ISO9001' });
  const vis = items.filter((x) => x.dept_code === 'SX' || x.dept_code === 'ISO' || x.kind === 'MANUAL' || x.kind === 'POLICY');
  assert.deepEqual(r3.data.report.data.stds[0].rows.map((x) => x.n), coverageRows(vis, clauses, 'ISO9001').map((x) => x.n));
});

test('Lịch sử phiên bản: theo lần, bỏ bản đã hủy; cấp 1 chỉ thấy bản đang hiệu lực / lỗi thời; biểu ● nhập Excel có dòng ghi chú', () => {
  const { env, owner } = seeded();
  const g = env.g;
  const it = item(env, 'BM-KD-01-04');
  const owId = env.rows('Users').find((u) => u.is_system_owner).user_id;
  const v = (rev, state, extra = {}) => g.cNewSystem_({ version_id: uuid(), item_id: it.item_id, vtype: 'REVISION', rev, state, author_id: owId,
    change_summary_vi: 'Sửa lần ' + rev, change_summary_zh: '', effective_date: '', ...extra });
  g.dbReset_();
  g.systemWrite_([
    { sheet: 'Versions', mode: 'insert', row: v('01', 'SUPERSEDED', { issued_at: '2026-02-10T08:00:00+07:00', effective_date: '2026-02-10', superseded_at: '2026-10-01T08:00:00+07:00' }) },
    { sheet: 'Versions', mode: 'insert', row: v('02', 'ISSUED', { approved_by: owId, approved_at: '2026-09-30T10:00:00+07:00', issued_by: owId, issued_at: '2026-10-01T08:00:00+07:00', effective_date: '2026-10-05' }) },
    { sheet: 'Versions', mode: 'insert', row: v('03', 'CANCELLED') },
    { sheet: 'Versions', mode: 'insert', row: v('03', 'DRAFT') }
  ]);
  setItem(env, 'BM-KD-01-04', { current_rev: '02', issued_at: '2026-10-01' });
  const r = run(owner, 'VERSIONS', { item_id: it.item_id });
  assert.equal(r.ok, true, JSON.stringify(r));
  const d = r.data.report.data;
  assert.deepEqual(d.rows.map((x) => [x.rev, x.state]), [['01', 'SUPERSEDED'], ['02', 'ISSUED'], ['03', 'DRAFT']]);
  assert.equal(d.rows[1].effective_date, '2026-10-05');
  assert.equal(d.rows[1].approved_by, 'Chủ hệ thống');
  assert.equal(d.imported, null);
  assert.equal(r.data.report.tiles.find((t) => t.k === 'rpt.t.revisions').v, '2');
  const kd1 = userClient(env, 'KD1', 1, '583921', { depts: 'KD' });
  const r1 = run(kd1, 'VERSIONS', { item_id: it.item_id });
  assert.deepEqual(r1.data.report.data.rows.map((x) => x.rev), ['01', '02']);
  // Biểu ● nhập từ Excel chưa có phiên bản trong app: một dòng "Nhập từ danh mục Excel"
  const r2 = run(owner, 'VERSIONS', { item_id: item(env, 'QT-ISO-01').item_id });
  assert.equal(r2.data.report.data.imported.rev, '02');
  assert.match(r2.data.layout.sections[1].table.rows[0][1], /Nhập từ danh mục Excel/);
});

test('lưu báo cáo: số BC-2611-001, cùng report_run_id cùng số và số liệu, PDF giữ lại; báo cáo đã lưu theo người lập; logo trên PDF', () => {
  const { env, owner } = seeded();
  const g = env.g;
  const id1 = uuid();
  const p1 = owner.write('report.save', { report_run_id: id1, kind: 'CATALOG', filters: {}, format: 'PDF' });
  assert.equal(p1.ok, true, JSON.stringify(p1).slice(0, 400));
  assert.equal(p1.data.run.code, 'BC-2611-001');
  assert.equal(p1.data.file_name, 'BC-2611-001_danh-muc-tai-lieu.pdf');
  const pdf = Buffer.from(p1.data.content_b64, 'base64').toString('utf8');
  assert.ok(pdf.startsWith('%PDF'));
  for (const s of ['DANH MỤC TÀI LIỆU HIỆN HÀNH', '现行文件清单', 'BC-2611-001', 'BM-ISO-02-01', 'Người lập · 编制人', 'Người duyệt · 审核人', 'Chủ hệ thống']) assert.ok(pdf.includes(s), s);
  assert.ok(!pdf.includes('[IMAGE]')); // chưa có logo
  // Tài liệu Docs tạm đã vào thùng rác; trang ngang A4
  const docs = [...env.drive._docs.values()];
  assert.equal(docs.length, 1);
  assert.equal(docs[0].page.w, 842);
  // Tải Excel cùng báo cáo: cùng số, có bố cục; PDF lần hai không dựng lại
  const x1 = owner.write('report.save', { report_run_id: id1, format: 'XLSX' });
  assert.equal(x1.ok, true);
  assert.equal(x1.data.run.code, 'BC-2611-001');
  assert.equal(x1.data.report.code, 'BC-2611-001');
  assert.equal(x1.data.file_name, 'BC-2611-001_danh-muc-tai-lieu.xlsx');
  assert.ok(x1.data.layout.meta_right.some((l) => l[1] === 'BC-2611-001'));
  const p2 = owner.write('report.save', { report_run_id: id1, format: 'PDF' });
  assert.equal(p2.data.content_b64, p1.data.content_b64);
  assert.equal(env.drive._docs.size, 1);
  // Bản chụp: đổi dữ liệu sau khi lưu → báo cáo đã lưu giữ số cũ
  const before = x1.data.report.data.counts.issued;
  setItem(env, 'BM-NS-01-02', { status: 'NA' });
  const x2 = owner.write('report.save', { report_run_id: id1, format: 'XLSX' });
  assert.equal(x2.data.report.data.counts.issued, before);
  assert.equal(run(owner, 'CATALOG').data.report.data.counts.issued, before - 1);
  // Báo cáo thứ hai: số kế tiếp; gửi lại cùng operation_id (mất phản hồi) không cấp số mới
  const op = uuid(), id2 = uuid();
  const a = owner.call('report.save', { report_run_id: id2, kind: 'COVERAGE', filters: {}, format: 'XLSX' }, { operation_id: op, expected_version: 0 });
  const b = owner.call('report.save', { report_run_id: id2, kind: 'COVERAGE', filters: {}, format: 'XLSX' }, { operation_id: op, expected_version: 0 });
  assert.equal(a.data.run.code, 'BC-2611-002');
  assert.equal(b.data.run.code, 'BC-2611-002');
  assert.equal(env.rows('ReportRuns').length, 2);
  // Tệp trên Drive có dòng Documents (sao lưu, nối lại ID khi khôi phục)
  const docsRows = env.rows('Documents').filter((d) => d.entity_type === 'REPORT_RUN');
  assert.deepEqual(docsRows.map((d) => d.kind).sort(), ['PDF', 'SNAPSHOT', 'SNAPSHOT']);
  // Báo cáo đã lưu: người lập thấy của mình; Thư ký ISO thấy tất cả; người khác không tải được
  const sx2 = userClient(env, 'SX2', 2, '583922', { depts: 'SX' });
  const s1 = sx2.write('report.save', { report_run_id: uuid(), kind: 'CATALOG', filters: { dept: 'SX' }, format: 'XLSX' });
  assert.equal(s1.data.run.code, 'BC-2611-003');
  assert.deepEqual(sx2.call('report.list', {}).data.items.map((x) => x.code), ['BC-2611-003']);
  assert.equal(sx2.write('report.save', { report_run_id: id1, format: 'XLSX' }).code, 'FORBIDDEN');
  const tk = userClient(env, 'TK', 2, '583923', { secretary: true });
  assert.equal(tk.call('report.list', {}).data.items.length, 3);
  assert.equal(owner.call('report.list', { kind: 'CATALOG' }).data.items.length, 2);
  // Logo công ty → đầu trang PDF có ảnh (báo cáo mới)
  owner.pin(OWNER_PIN);
  assert.equal(owner.write('report.logo.set', { mime_type: 'image/png', content_b64: fakePngB64() }).ok, true);
  const p3 = owner.write('report.save', { report_run_id: uuid(), kind: 'RECORDS', filters: {}, format: 'PDF' });
  assert.equal(p3.ok, true, JSON.stringify(p3).slice(0, 300));
  const t3 = Buffer.from(p3.data.content_b64, 'base64').toString('utf8');
  assert.ok(t3.startsWith('%PDF-1.4\n[IMAGE]'));
  assert.ok(t3.includes('BC-2611-004'));
  // Trạng thái hệ thống: dòng Báo cáo đã lưu
  g.dbReset_();
  const h = g.healthRows_().find((x) => x.key === 'reports');
  assert.equal(h.status, 'OK');
  assert.match(h.value, /Đã lưu 4 báo cáo/);
});

test('dán Code.gs 2c chưa chạy migrateSchema: xem trước chạy; lưu báo cáo tự thêm sheet ReportRuns; migrateSchema báo thêm ReportRuns', () => {
  const { env, owner } = seeded();
  const g = env.g;
  g.dbReset_();
  const book = g.book_('B');
  book.deleteSheet(book.getSheetByName('ReportRuns'));
  g.withWriteLock_(() => g.stateWrite_(g.readState_(), { schema_version: ['STRING', '1.0.4'] }, 'TEST'));
  g.cache_().remove('sys:state');
  g.dbReset_();
  assert.equal(g.sheetExists_('ReportRuns'), false);
  assert.equal(g.healthRows_().find((x) => x.key === 'reports').status, 'WARN');
  assert.equal(owner.call('report.list', {}).data.items.length, 0);
  assert.equal(run(owner, 'CATALOG').ok, true);
  const s = owner.write('report.save', { report_run_id: uuid(), kind: 'CATALOG', filters: {}, format: 'XLSX' });
  assert.equal(s.ok, true, JSON.stringify(s).slice(0, 300));
  assert.equal(s.data.run.code, 'BC-2611-001');
  g.dbReset_();
  assert.equal(g.sheetExists_('ReportRuns'), true);
  assert.equal(g.stateGet_(g.readState_(), 'schema_version', ''), g.SCHEMA_VERSION);
  // Máy chủ khác: chạy migrateSchema bằng tay → nhật ký có ReportRuns
  const { env: env2 } = seeded();
  const b2 = env2.g.book_('B');
  b2.deleteSheet(b2.getSheetByName('ReportRuns'));
  env2.g.dbReset_();
  env2.logs.length = 0;
  env2.g.migrateSchema();
  assert.ok(env2.logs.some((l) => /migrateSchema xong\. Thêm: ReportRuns\. schema_version=1\.0\.\d+/.test(l)), env2.logs.join('\n'));
});
