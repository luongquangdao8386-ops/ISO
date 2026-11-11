// Phủ điều khoản (phiên 1d, nghiệm thu Đợt 1 mục 7): số của màn Phủ điều khoản (js/coverage.js) khớp hai trang Phủ của file Excel
// tổng trên cùng dữ liệu. Xuất workbook bằng buildCatalogWorkbook rồi tính lại công thức COUNTIF/COUNTIFS theo cách của Excel
// (ký tự đại diện * ?, không phân biệt hoa thường) trên chính các ô của file — không dùng mã của js/coverage.js.
// Thêm: lịch tuần trang chủ (js/periods.js weekAgenda).
import test from 'node:test';
import assert from 'node:assert/strict';
import { xlsx } from '../xlsx-node.mjs';
import { buildCatalogWorkbook, SHEET } from '../../js/catalog-xlsx.js';
import { coverageRows, coverageSummary, missingMandatory } from '../../js/coverage.js';
import { weekAgenda, mondayOf, periodOf } from '../../js/periods.js';
import { freshServer, ownerClient } from '../helpers.mjs';

const X = xlsx();

const it = (code, o) => ({ item_id: 'id-' + code, code, name_vi: 'Biểu ' + code, name_zh: '表 ' + code, dept_code: code.split('-')[1], group_key: code.split('-').slice(1, 3).join('-'),
  status: 'NONE', where: 'MANUAL', iso9001: '', brc_topics: '', sort_order: 0, ...o });
const ITEMS = [
  it('BM-ISO-02-01', { iso9001: '7.5.3; 7.5.2', status: 'ISSUED', brc_topics: 'Kiểm soát tài liệu' }),
  it('BM-ISO-03-01', { iso9001: '9.2.2' }),
  it('BM-CĐ-06-05', { iso9001: '7.1.5.2', status: 'ISSUED', where: 'ME', brc_topics: 'Hiệu chuẩn thiết bị đo' }),
  it('BM-CL-04-01', { iso9001: '8.7; 10.2', status: 'DRAFTING', where: 'CS_PROPOSED', brc_topics: 'Sản phẩm không phù hợp; Truy xuất' }),
  it('BM-KV-01-01', { iso9001: '8.5.4', status: 'ISSUED', where: 'CS', brc_topics: 'truy xuất nguồn gốc lô hàng' }),
  it('BM-SX-02-01', { iso9001: '7.1.5\n8.5.1', status: 'ISSUED', where: 'ME_PART' }),
  it('BM-MH-01-01', { iso9001: '8.4;8.1', status: 'NA' }),
  it('BM-NS-01-01', { iso9001: '7.10', status: 'ISSUED' }),
  it('BM-BRC-01-01', { iso9001: '', status: 'ISSUED', where: 'CS', brc_topics: 'Kiểm soát TÀI LIỆU, hồ sơ' })
].map((x, i) => ({ ...x, sort_order: i + 1 }));
const cl = (std, key, o = {}) => ({ clause_id: std + '|' + key, std, key, name_vi: 'Điều ' + key, name_zh: '条 ' + key, group_vi: o.g || '', group_zh: '', mandatory_record: !!o.m, sort_order: o.n, active: o.active !== false });
const CLAUSES = [
  cl('ISO9001', '4.1', { n: 1, g: '4 Bối cảnh' }), cl('ISO9001', '6.3', { n: 2, m: true, g: '6 Hoạch định' }), cl('ISO9001', '7.1', { n: 3, g: '7 Hỗ trợ' }),
  cl('ISO9001', '7.1.5', { n: 4, m: true, g: '7 Hỗ trợ' }), cl('ISO9001', '7.5.3', { n: 5, m: true }), cl('ISO9001', '8.1', { n: 6 }), cl('ISO9001', '8.5.1', { n: 7, m: true }),
  cl('ISO9001', '9.2', { n: 8, m: true }), cl('ISO9001', '10.2', { n: 9, m: true }), cl('ISO9001', '9.3', { n: 10, m: true, active: false }),
  cl('BRC', 'Kiểm soát tài liệu', { n: 1, g: 'Hệ thống' }), cl('BRC', 'Truy xuất', { n: 2 }), cl('BRC', 'Hiệu chuẩn', { n: 3 }), cl('BRC', 'Kiểm soát dao', { n: 4 })
];

/* ---------- COUNTIF như Excel ---------- */
function wildRe(pat) {
  let s = '';
  for (let i = 0; i < pat.length; i++) {
    const ch = pat[i];
    if (ch === '~' && i + 1 < pat.length) { s += pat[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); continue; }
    s += ch === '*' ? '[\\s\\S]*' : ch === '?' ? '[\\s\\S]' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + s + '$', 'i');
}
const txt = (c) => (c && c.v !== undefined ? String(c.v) : '');
/** Cột của Danh mục tổng dòng 5–600 (AA tính theo công thức của ô: ";"&SUBSTITUTE(G," ","")&";") */
function column(ws, col) {
  const out = [];
  for (let r = 5; r <= 600; r++) {
    if (col === 'AA') {
      assert.equal(ws['AA' + r].f, `";"&SUBSTITUTE(G${r}," ","")&";"`);
      out.push(';' + txt(ws['G' + r]).split(' ').join('') + ';');
    } else out.push(txt(ws[col + r]));
  }
  return out;
}
function countifs(cols, ...pairs) {
  let n = 0;
  for (let i = 0; i < cols.B.length; i++) {
    let ok = true;
    for (let k = 0; k < pairs.length; k += 2) if (!wildRe(pairs[k + 1]).test(cols[pairs[k]][i])) { ok = false; break; }
    if (ok) n++;
  }
  return n;
}
/** "COUNTIF('Danh mục tổng - 总清单'!$AA$5:$AA$600,"*;"&$A5&"*")" → [['AA', '"*;"&$A5&"*"']] — để kiểm công thức đúng khuôn */
const RANGE = (c) => `'${SHEET.catalog}'!\\$${c}\\$5:\\$${c}\\$600`;

function exported() {
  const { wb } = buildCatalogWorkbook(X, { items: ITEMS, groups: [], depts: [], clauses: CLAUSES, grace: 3, epoch: 'e', exported_at: '2026-11-11T08:00:00+07:00' });
  return X.read(X.write(wb, { type: 'array', bookType: 'xlsx' }), { type: 'array', cellFormula: true });
}

test('Phủ ISO 9001: số biểu, đã ban hành, in từ app, trạng thái khớp công thức của file Excel', () => {
  const wb = exported();
  const cat = wb.Sheets[SHEET.catalog];
  const cols = { B: column(cat, 'B'), AA: column(cat, 'AA'), T: column(cat, 'T'), R: column(cat, 'R'), K: column(cat, 'K') };
  const ws = wb.Sheets[SHEET.iso];
  const rows = coverageRows(ITEMS, CLAUSES, 'ISO9001');
  assert.equal(rows.length, 9, 'điều khoản ngừng dùng không tính');
  rows.forEach((row, i) => {
    const r = 5 + i;
    const key = txt(ws['A' + r]);
    assert.equal(key, row.key);
    assert.match(ws['D' + r].f, new RegExp(`^COUNTIF\\(${RANGE('AA')},"\\*;"&\\$A${r}&"\\*"\\)$`));
    assert.match(ws['E' + r].f, new RegExp(`^COUNTIFS\\(${RANGE('AA')},"\\*;"&\\$A${r}&"\\*",${RANGE('T')},"●"\\)$`));
    const k = '*;' + key + '*';
    const D = countifs(cols, 'AA', k), E = countifs(cols, 'AA', k, 'T', '●');
    const F = countifs(cols, 'AA', k, 'R', 'M&E*') + countifs(cols, 'AA', k, 'R', 'Checksheet*');
    const C = txt(ws['C' + r]);
    const G = D === 0 ? (C.slice(0, 2) === 'Có' ? 'MISSING' : 'NONE') : (E === 0 ? 'NOT_ISSUED' : 'OK');
    assert.deepEqual([row.n, row.issued, row.app, row.state], [D, E, F, G], 'điều khoản ' + key);
    assert.equal(txt(ws['H' + r]), row.items.map((x) => x.code).join(', '), 'cột Biểu liên quan');
  });
  const by = Object.fromEntries(rows.map((r) => [r.key, r]));
  // 9.2 gồm 9.2.2; 7.1 gồm 7.1.5.2 và 7.10 (như Excel); xuống dòng trong ô G không tách điều khoản; ✕ vẫn đếm
  assert.deepEqual(by['9.2'].items.map((x) => x.code), ['BM-ISO-03-01']);
  assert.deepEqual(by['7.1'].items.map((x) => x.code), ['BM-CĐ-06-05', 'BM-SX-02-01', 'BM-NS-01-01']);
  assert.deepEqual(by['8.5.1'].items.map((x) => x.code), []);
  assert.equal(by['8.1'].n, 1);
  assert.equal(by['7.1.5'].app, 1, 'M&E tính, Một phần M&E không tính');
  assert.equal(by['6.3'].state, 'MISSING');
  assert.equal(by['4.1'].state, 'NONE');
  assert.equal(by['9.2'].state, 'NOT_ISSUED');
  assert.equal(by['7.5.3'].state, 'OK');
  const s = coverageSummary(rows);
  assert.deepEqual([s.total, s.mandatory, s.MISSING], [9, 6, 2]);
  assert.equal(missingMandatory(ITEMS, CLAUSES), 2, 'ô "Điều khoản ISO 9001 bắt buộc chưa có biểu" (Tổng hợp N7)');
  assert.equal(wb.Sheets[SHEET.summary].N7.f, `COUNTIF('${SHEET.iso}'!$G$5:$G$60,"Thiếu*")`);
});

test('Phủ BRCGS: biểu thuộc chủ đề khi cột K chứa khóa (không phân biệt hoa thường), khớp công thức của file Excel', () => {
  const wb = exported();
  const cat = wb.Sheets[SHEET.catalog];
  const cols = { B: column(cat, 'B'), T: column(cat, 'T'), R: column(cat, 'R'), K: column(cat, 'K') };
  const ws = wb.Sheets[SHEET.brc];
  const rows = coverageRows(ITEMS, CLAUSES, 'BRC');
  assert.equal(rows.length, 4);
  rows.forEach((row, i) => {
    const r = 5 + i;
    const key = txt(ws['H' + r]);
    assert.equal(key, row.key);
    assert.match(ws['D' + r].f, new RegExp(`^COUNTIF\\(${RANGE('K')},"\\*"&\\$H${r}&"\\*"\\)$`));
    const k = '*' + key + '*';
    const D = countifs(cols, 'K', k), E = countifs(cols, 'K', k, 'T', '●');
    const F = countifs(cols, 'K', k, 'R', 'M&E*') + countifs(cols, 'K', k, 'R', 'Checksheet*');
    const G = D === 0 ? 'NONE' : (E === 0 ? 'NOT_ISSUED' : 'OK');
    assert.deepEqual([row.n, row.issued, row.app, row.state], [D, E, F, G], 'chủ đề ' + key);
    assert.equal(txt(ws['I' + r]), row.items.map((x) => x.code).join(', '));
  });
  const by = Object.fromEntries(rows.map((r) => [r.key, r]));
  assert.deepEqual(by['Truy xuất'].items.map((x) => x.code), ['BM-CL-04-01', 'BM-KV-01-01'], 'chữ thường vẫn khớp');
  assert.deepEqual(by['Kiểm soát tài liệu'].items.map((x) => x.code), ['BM-ISO-02-01', 'BM-BRC-01-01'], 'chữ hoa vẫn khớp');
  assert.equal(by['Kiểm soát dao'].state, 'NONE');
  assert.equal(by['Truy xuất'].app, 1);
  assert.equal(coverageSummary(rows).NONE, 1, 'ô "Chủ đề BRCGS chưa có biểu" (Tổng hợp P7)');
});

test('Lịch tuần: biểu ngày 7 ô, kỳ khác ở ngày kết thúc, kỳ đã hết còn hạn nộp ở ngày hạn chót, khi phát sinh không hiện', () => {
  const today = '2026-11-11'; // Thứ Tư, tuần 46 (09/11–15/11)
  const mon = mondayOf(today);
  assert.equal(mon, '2026-11-09');
  const base = { status: 'ISSUED', where: 'MANUAL', issued_source: 'APP', issued_at: '2026-01-05', records_from: '2026-01-05' };
  const day = { ...it('BM-SX-02-01', base), period_type: 'DAY', records_from: '2026-11-10' };
  const week = { ...it('BM-SX-01-01', base), period_type: 'WEEK' };
  const month = { ...it('BM-CL-01-01', base), period_type: 'MONTH' };
  const monthDone = { ...it('BM-CL-01-02', base), period_type: 'MONTH' };
  const year = { ...it('BM-NS-01-01', base), period_type: 'YEAR' };
  const ev = { ...it('BM-KD-01-01', base), period_type: 'EVENT' };
  const draft = { ...it('BM-KV-01-02', base), period_type: 'WEEK', status: 'DRAFTING' };
  const app = { ...it('BM-CĐ-04-07', base), period_type: 'DAY', where: 'CS' };
  const rec = (from, to) => ({ period_from: from, period_to: to, status: 'SUBMITTED' });
  const w = weekAgenda([
    { it: day, recs: [rec('2026-11-10', '2026-11-10')], pending: [rec('2026-11-11', '2026-11-11')] },
    { it: week, recs: [] }, { it: month, recs: [] }, { it: monthDone, recs: [rec('2026-10-01', '2026-10-31')] },
    { it: year, recs: [] }, { it: ev, recs: [] }, { it: draft, recs: [] }, { it: app, recs: [] }
  ], { mon, today, grace: 3 });
  assert.deepEqual(w.days, ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']);
  assert.equal(w.daily.length, 1, 'chỉ biểu ● làm tay hằng ngày (không tính biểu ◐, biểu in từ Checksheet)');
  assert.deepEqual(w.daily[0].cells.map((c) => c.st), ['NA', 'OK', 'PEND', 'DUE', 'DUE', 'DUE', 'DUE'], 'trước ngày bắt đầu tính → NA');
  const at = (d) => (w.agenda.find((a) => a.date === d) || { list: [] }).list.map((x) => `${x.it.code}:${x.cell.key}:${x.cell.st}${x.carry ? ':carry' : ''}`);
  assert.deepEqual(at('2026-11-15'), ['BM-SX-01-01:2026-W46:DUE'], 'kỳ tuần ở Chủ nhật');
  // Tuần 45 kết thúc Chủ nhật 08/11 (tuần trước), hạn chót 11/11 rơi vào tuần này và chưa có hồ sơ → hiện ở 11/11 (carry)
  assert.deepEqual(at('2026-11-11'), ['BM-SX-01-01:2026-W45:DUE:carry']);
  // Tháng 10 kết thúc 31/10, hạn chót 03/11 — trước Thứ Hai 09/11 → không hiện
  assert.deepEqual(w.agenda.map((a) => a.date), ['2026-11-11', '2026-11-15']);
  // Tuần sau tuần chứa 30/11: tháng 11 kết thúc thứ Hai 30/11
  const w2 = weekAgenda([{ it: month, recs: [] }, { it: year, recs: [] }], { mon: '2026-11-30', today, grace: 3 });
  assert.deepEqual(w2.agenda.map((a) => [a.date, a.list.map((x) => x.cell.key + ':' + x.cell.st)]), [['2026-11-30', ['2026-11:DUE']]]);
  // Tuần 28/12–03/01: năm 2026 kết thúc 31/12; tuần sau đó (04/01–10/01) còn hạn chót 03/01 → không; với grace 5 → hạn 05/01 hiện (carry)
  const w3 = weekAgenda([{ it: year, recs: [] }], { mon: '2026-12-28', today, grace: 3 });
  assert.deepEqual(w3.agenda.map((a) => a.date), ['2026-12-31']);
  const w4 = weekAgenda([{ it: year, recs: [] }, { it: monthDone, recs: [rec('2026-12-01', '2026-12-31')] }], { mon: '2027-01-04', today: '2027-01-06', grace: 5 });
  assert.deepEqual(w4.agenda.map((a) => [a.date, a.list.map((x) => `${x.it.code}:${x.cell.key}:${x.cell.st}${x.carry ? ':carry' : ''}`)]),
    [['2027-01-05', ['BM-NS-01-01:2026:LATE:carry']]], 'kỳ đã có hồ sơ thì không nhắc ở ngày hạn chót');
  assert.equal(periodOf('WEEK', '2026-11-15').to, '2026-11-15');
});

test('Trạng thái hệ thống: dòng Phủ điều khoản của máy chủ cùng số với app (dữ liệu mẫu + một điều khoản bắt buộc chưa có biểu)', () => {
  const env = freshServer({ now: '2026-11-06T08:00:00+07:00' });
  ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  const rowOf = () => { env.g.dbReset_(); return env.g.healthRows_().find((x) => x.key === 'coverage'); };
  let h = rowOf();
  const calc = () => {
    const items = env.rows('Items'), clauses = env.rows('Clauses');
    const iso = coverageRows(items, clauses, 'ISO9001'), brc = coverageRows(items, clauses, 'BRC');
    return `ISO 9001: ${iso.filter((r) => r.n).length}/${iso.length} điều khoản có biểu · bắt buộc chưa có biểu ${iso.filter((r) => r.state === 'MISSING').length} · BRCGS: ${brc.filter((r) => r.n).length}/${brc.length} chủ đề có biểu`;
  };
  assert.equal(h.status, 'OK');
  assert.equal(h.value, calc());
  env.g.systemWrite_([{ sheet: 'Clauses', mode: 'insert', row: env.g.cNewSystem_({ clause_id: 'ISO9001|6.2', std: 'ISO9001', key: '6.2', group_vi: '', group_zh: '', name_vi: 'Mục tiêu', name_zh: '目标', mandatory_record: true, sort_order: 20, active: true }) }], { action: 'test.clause', entity_type: 'SYSTEM' });
  h = rowOf();
  assert.equal(h.status, 'WARN');
  assert.equal(h.value, calc());
  assert.match(h.note, /6\.2/);
});
