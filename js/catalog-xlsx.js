// File Excel tổng (mục 6 đặc tả): xuất danh mục đúng khuôn để xuất → sửa → nhập lại được (báo "Không đổi"), đọc tệp người dùng chọn.
// Sheet: Tổng hợp - 汇总 (D4 = số ngày cho phép trễ) · Danh mục tổng - 总清单 (tiêu đề dòng 4, dữ liệu từ dòng 5, công thức dòng 5–600,
// cố định ô D5) · Phủ ISO 9001 - 条款覆盖 · Phủ ISO 14001 / 45001 / 50001 (thêm 14/11/2026, cột khóa ẩn AB / AC / AD) · Phủ BRCGS - BRCGS覆盖 ·
// Hướng dẫn - 说明; thêm sheet _meta (template_key, version, dataset_epoch). Tệp không có sheet Phủ của một chuẩn → điều khoản chuẩn đó giữ nguyên.
// Hàm thuần (nhận đối tượng XLSX), dùng được cả trong test Node.
import { isoMatch, brcMatch, STD_COL, STD_SHORT } from './coverage.js';

export const SHEET = {
  summary: 'Tổng hợp - 汇总',
  catalog: 'Danh mục tổng - 总清单',
  iso: 'Phủ ISO 9001 - 条款覆盖',
  iso14001: 'Phủ ISO 14001 - 条款覆盖',
  iso45001: 'Phủ ISO 45001 - 条款覆盖',
  iso50001: 'Phủ ISO 50001 - 条款覆盖',
  brc: 'Phủ BRCGS - BRCGS覆盖',
  guide: 'Hướng dẫn - 说明'
};
export const TEMPLATE_KEY = 'iso_catalog';
export const TEMPLATE_VERSION = '1';
const HEAD_ROW = 4, FIRST = 5, LAST = 600;
const CAT = `'${SHEET.catalog}'`;
/** Các chuẩn ISO: sheet Phủ, cột khóa ẩn của Danh mục tổng (";"&SUBSTITUTE(cột," ","")&";"), phiên bản tiêu chuẩn ghi ở chú thích */
export const ISO_SHEETS = [
  { std: 'ISO9001', sheet: SHEET.iso, key: 'AA', ed: 'ISO 9001:2015', zh: '质量' },
  { std: 'ISO14001', sheet: SHEET.iso14001, key: 'AB', ed: 'ISO 14001:2015', zh: '环境' },
  { std: 'ISO45001', sheet: SHEET.iso45001, key: 'AC', ed: 'ISO 45001:2018', zh: '职业健康安全' },
  { std: 'ISO50001', sheet: SHEET.iso50001, key: 'AD', ed: 'ISO 50001:2018', zh: '能源' }
];
const KEY_COLS = ISO_SHEETS.map((x) => x.key);

/** Cột A–AA của Danh mục tổng như file DM-ISO-01: [chữ cột, tiêu đề (hai dòng), độ rộng, kiểu ô dữ liệu] */
export const COLS = [
  ['A', 'STT\n序号', 5, 'cell'],
  ['B', 'Mã biểu mẫu\n表单编号', 14, 'code'],
  ['C', 'Tên biểu mẫu\n表单名称', 32, 'cell_left'],
  ['D', 'Mục đích & nội dung chính\n用途及主要内容', 46, 'cell_left'],
  ['E', 'Bộ phận\n部门', 14, 'cell_left'],
  ['F', 'Nhóm\n类别', 20, 'cell_left'],
  ['G', 'ISO 9001\n质量', 9.5, 'cell'],
  ['H', 'ISO 14001\n环境', 9.5, 'cell'],
  ['I', 'ISO 45001\n职业健康安全', 9.5, 'cell'],
  ['J', 'ISO 50001\n能源', 9.5, 'cell'],
  ['K', 'BRCGS Packaging\n(chủ đề · 主题)', 18, 'cell_left'],
  ['L', 'Căn cứ pháp luật VN\n越南法规依据', 20, 'cell_left'],
  ['M', 'Phân loại\n类别', 14, 'cell_left'],
  ['N', 'Tần suất\n频次', 15, 'cell_left'],
  ['O', 'Lập → Duyệt\n填写 → 审核', 21, 'cell_left'],
  ['P', 'Thời gian lưu\n保存期限', 15, 'cell_left'],
  ['Q', 'Ưu tiên\n优先级', 7.5, 'cell'],
  ['R', 'Nơi làm\n完成方式', 16, 'cell_left'],
  ['S', 'In ở đâu / còn thiếu\n打印位置/欠缺', 30, 'cell_left'],
  ['T', 'Tình trạng biểu\n表单状态', 9, 'input_t'],
  ['U', 'Lần ban hành\n版次', 8, 'input'],
  ['V', 'Ngày ban hành\n发布日期', 11.5, 'input_date'],
  ['W', 'Chu kỳ hồ sơ (ngày)\n记录周期（天）', 10, 'input'],
  ['X', 'Ngày hồ sơ gần nhất\n最近记录日期', 11.5, 'input_date'],
  ['Y', 'Tình trạng hồ sơ\n记录状态', 15, 'cell'],
  ['Z', 'Ghi chú / liên quan\n备注/关联', 30, 'input_left'],
  ['AA', 'khóa ISO 9001 (ẩn)', 6, 'cell'],
  ['AB', 'khóa ISO 14001 (ẩn)', 6, 'cell'],
  ['AC', 'khóa ISO 45001 (ẩn)', 6, 'cell'],
  ['AD', 'khóa ISO 50001 (ẩn)', 6, 'cell']
];

export const WHERE_TEXT = {
  ME: 'M&E · 机电App', CS: 'Checksheet · 点检表', ME_PART: 'Một phần M&E · 部分机电App', CS_PART: 'Một phần Checksheet · 部分点检表',
  CS_PROPOSED: 'Đề xuất Checksheet · 建议用点检表', MANUAL: 'Làm tay → App ISO · 手工→ISO App'
};
const WHERE_ORDER = ['ME', 'CS', 'ME_PART', 'CS_PART', 'CS_PROPOSED', 'MANUAL'];
const SYMBOL = { NONE: '○', DRAFTING: '◐', ISSUED: '●', NA: '✕' };
/** Phân loại (cột M) ở trang Tổng hợp: [nhãn, mẫu COUNTIF] */
const CLASSES = [
  ['A – ISO yêu cầu · ISO要求', 'A – ISO yêu cầu*'],
  ['A – BRCGS yêu cầu · BRCGS要求', 'A – BRCGS*'],
  ['A – ISO & BRCGS yêu cầu · ISO及BRCGS要求', 'A – ISO & BRCGS*'],
  ['A+B – ISO & pháp luật · ISO及法规', 'A+B*'],
  ['B – Pháp luật · 法规要求', 'B – *'],
  ['C – Khuyến nghị · 建议', 'C – *']
];

const bi2 = (vi, zh) => (vi && zh ? `${vi}\n${zh}` : (vi || zh || ''));
const dept1 = (d) => (d ? (d.name_vi && d.name_zh ? `${d.name_vi} · ${d.name_zh}` : (d.name_vi || d.name_zh || d.dept_code)) : '');
const EPOCH = Date.UTC(1899, 11, 30);
function isoSerial(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? (Date.UTC(+m[1], +m[2] - 1, +m[3]) - EPOCH) / 86400000 : null;
}
function serialIso(n) {
  const d = new Date(EPOCH + Math.round(Number(n)) * 86400000);
  return d.toISOString().slice(0, 10);
}
function groupLabel(g) {
  if (!g) return '';
  if (g.label) return g.label;
  const num = String(g.group_key || '').split('-').pop();
  const name = g.name_vi && g.name_zh ? `${g.name_vi} · ${g.name_zh}` : (g.name_vi || g.name_zh || '');
  return (/^\d+$/.test(num) ? num + '. ' : '') + name;
}

/** Ô chữ (giữ nguyên, không thành công thức), số, ngày, công thức */
const S = (v) => ({ t: 's', v: String(v ?? '') });
const N = (v) => ({ t: 'n', v: Number(v) });
const F = (f, t = 's') => ({ t, f, v: t === 'n' ? 0 : '' });
const rng = (c) => `${CAT}!$${c}$${FIRST}:$${c}$${LAST}`;

/**
 * Dựng workbook đúng khuôn file Excel tổng DM-ISO-01. data: {items, groups, depts, clauses, grace, epoch, exported_at, empty}
 * Trả {wb, polish} — polish: tham số cho polishXlsx (kiểu ô, gộp ô, cố định, danh sách chọn, tô màu).
 */
export function buildCatalogWorkbook(X, data) {
  const groups = new Map((data.groups || []).map((g) => [g.group_key, g]));
  const deptList = (data.depts || []).filter((d) => d.active !== false).slice().sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
  const depts = new Map((data.depts || []).map((d) => [d.dept_code, d]));
  const items = data.empty ? [] : (data.items || []).slice().sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.code).localeCompare(String(b.code)));
  const wb = X.utils.book_new();
  const polish = {};
  const put = (ws, ref, o) => { if (o) ws[ref] = o; };
  const merges = (ws, list) => { ws['!merges'] = list.map((r) => X.utils.decode_range(r)); };
  const today = String(data.exported_at || '').slice(0, 10);

  /* ---- Tổng hợp ---- */
  const sum = {};
  put(sum, 'B1', S('TỔNG HỢP BIỂU MẪU ISO TOÀN NHÀ MÁY · 全厂ISO表单汇总'));
  put(sum, 'B2', S('Số liệu tự tính từ trang "Danh mục tổng". Chỉ sửa ô nền vàng. · 数据由“总清单”自动计算，仅修改黄色单元格。'));
  put(sum, 'B4', S('Số ngày cho phép trễ khi xét hồ sơ đúng hạn · 记录逾期宽限天数'));
  put(sum, 'D4', N(data.grace ?? 3));
  put(sum, 'E4', S('ngày · 天'));
  const heads6 = [['B', 'Tổng số biểu\n表单总数'], ['D', 'Đã ban hành\n已发布'], ['F', '% ban hành\n发布率'], ['H', 'In từ app\n(M&E + Checksheet)\n由App打印'],
    ['J', 'Ưu tiên 1 chưa ban hành\n优先级1未发布'], ['L', 'Hồ sơ quá hạn\n逾期记录'], ['N', 'Điều khoản ISO bắt buộc chưa có biểu\n(9001 · 14001 · 45001 · 50001)\nISO强制条款缺表单'], ['P', 'Chủ đề BRCGS chưa có biểu\nBRCGS主题缺表单']];
  heads6.forEach(([c, t]) => put(sum, c + '6', S(t)));
  put(sum, 'B7', F(`COUNTA(${rng('B')})`, 'n'));
  put(sum, 'D7', F(`COUNTIF(${rng('T')},"●")`, 'n'));
  put(sum, 'F7', F(`IFERROR(D7/(B7-COUNTIF(${rng('T')},"✕")),0)`, 'n'));
  put(sum, 'H7', F(`COUNTIF(${rng('R')},"M&E*")+COUNTIF(${rng('R')},"Checksheet*")`, 'n'));
  put(sum, 'J7', F(`COUNTIFS(${rng('Q')},1,${rng('T')},"<>●",${rng('T')},"<>✕")`, 'n'));
  put(sum, 'L7', F(`COUNTIF(${rng('Y')},"Quá hạn*")`, 'n'));
  put(sum, 'N7', F(ISO_SHEETS.map((x) => `COUNTIF('${x.sheet}'!$G$5:$G$60,"Thiếu*")`).join('+'), 'n'));
  put(sum, 'P7', F(`COUNTIF('${SHEET.brc}'!$G$5:$G$60,"Chưa*")`, 'n'));
  put(sum, 'B8', S('Theo bộ phận · 按部门'));
  const heads9 = ['Bộ phận\n部门', 'Số biểu\n表单数', 'M&E\n机电App', 'Checksheet\n点检表', 'Một phần app\n部分App', 'Đề xuất Checksheet\n建议点检表', 'Làm tay → App ISO\n手工→ISO App',
    '○ Chưa có\n未建立', '◐ Đang soạn\n编制中', '● Đã ban hành\n已发布', '✕ Không áp dụng\n不适用', '% ban hành\n发布率', 'Ưu tiên 1\n优先级1', 'Ưu tiên 1 đã ban hành\n优先级1已发布', 'Hồ sơ quá hạn\n逾期记录'];
  heads9.forEach((t, i) => put(sum, X.utils.encode_col(1 + i) + '9', S(t)));
  const dr0 = 10;
  deptList.forEach((d, i) => {
    const r = dr0 + i;
    const E = `${rng('E')},$B${r}`;
    put(sum, 'B' + r, S(dept1(d)));
    put(sum, 'C' + r, F(`COUNTIF(${rng('E')},$B${r})`, 'n'));
    ['M&E*', 'Checksheet*', 'Một phần*', 'Đề xuất*', 'Làm tay*'].forEach((w, k) => put(sum, X.utils.encode_col(3 + k) + r, F(`COUNTIFS(${E},${rng('R')},"${w}")`, 'n')));
    ['○', '◐', '●', '✕'].forEach((t, k) => put(sum, X.utils.encode_col(8 + k) + r, F(`COUNTIFS(${E},${rng('T')},"${t}")`, 'n')));
    put(sum, 'M' + r, F(`IFERROR(K${r}/(C${r}-L${r}),0)`, 'n'));
    put(sum, 'N' + r, F(`COUNTIFS(${E},${rng('Q')},1)`, 'n'));
    put(sum, 'O' + r, F(`COUNTIFS(${E},${rng('Q')},1,${rng('T')},"●")`, 'n'));
    put(sum, 'P' + r, F(`COUNTIFS(${E},${rng('Y')},"Quá hạn*")`, 'n'));
  });
  const dr1 = dr0 + Math.max(1, deptList.length) - 1;
  const tr = dr1 + 1;
  put(sum, 'B' + tr, S('Tổng · 合计'));
  'CDEFGHIJKLNOP'.split('').forEach((c) => put(sum, c + tr, F(`SUM(${c}${dr0}:${c}${dr1})`, 'n')));
  put(sum, 'M' + tr, F(`IFERROR(K${tr}/(C${tr}-L${tr}),0)`, 'n'));
  const ck = tr + 1;
  put(sum, 'B' + ck, S('Kiểm tra: tổng các cột Nơi làm phải bằng Số biểu · 校验：各完成方式合计应等于表单数'));
  put(sum, 'H' + ck, F(`IF(SUM(D${tr}:H${tr})=C${tr},"Khớp · 一致","Lệch · 不一致")`));
  const cs = ck + 1, ch = cs + 1, c0 = ch + 1;
  put(sum, 'B' + cs, S('Theo phân loại · 按类别'));
  ['Phân loại\n类别', 'Số biểu\n表单数', '● Đã ban hành\n已发布', '% ban hành\n发布率'].forEach((t, i) => put(sum, X.utils.encode_col(1 + i) + ch, S(t)));
  CLASSES.forEach(([label, pat], i) => {
    const r = c0 + i;
    put(sum, 'B' + r, S(label));
    put(sum, 'C' + r, F(`COUNTIF(${rng('M')},"${pat}")`, 'n'));
    put(sum, 'D' + r, F(`COUNTIFS(${rng('M')},"${pat}",${rng('T')},"●")`, 'n'));
    put(sum, 'E' + r, F(`IFERROR(D${r}/C${r},0)`, 'n'));
  });
  const c1 = c0 + CLASSES.length - 1, ct = c1 + 1;
  put(sum, 'B' + ct, S('Tổng · 合计'));
  put(sum, 'C' + ct, F(`SUM(C${c0}:C${c1})`, 'n'));
  put(sum, 'D' + ct, F(`SUM(D${c0}:D${c1})`, 'n'));
  put(sum, 'E' + ct, F(`IFERROR(D${ct}/C${ct},0)`, 'n'));
  sum['!ref'] = `A1:Q${ct}`;
  sum['!cols'] = [3, 36, 9, 9, 11, 10, 11, 12, 9, 9, 9, 9, 10, 9, 11, 10, 9].map((w) => ({ wch: w }));
  merges(sum, ['B1:P1', 'B2:P2', 'B4:C4', 'B6:C6', 'D6:E6', 'F6:G6', 'H6:I6', 'J6:K6', 'L6:M6', 'N6:O6', 'P6:Q6', 'B7:C7', 'D7:E7', 'F7:G7', 'H7:I7', 'J7:K7', 'L7:M7', 'N7:O7', 'P7:Q7', 'B8:P8', `B${cs}:H${cs}`]);
  X.utils.book_append_sheet(wb, sum, SHEET.summary);
  const sumH = { 1: 25.5, 2: 15, 4: 25.5, 6: 51.75, 7: 33.75, 8: 17.15, 9: 51.75, [ch]: 30 };
  for (let r = dr0; r <= tr; r++) sumH[r] = 19.5;
  for (let r = c0; r <= ct; r++) sumH[r] = 24;
  polish[1] = {
    freeze: 'A3',
    styles: [['B1:B1', 'title'], ['B2:B2', 'note_plain'], ['B4:B4', 'label'], ['D4:D4', 'input_bold'], ['E4:E4', 'plain'],
      ['B6:Q6', 'head', true], ['B7:Q7', 'big', true], ['F7:G7', 'big_pct', true], ['B8:B8', 'section'], ['B9:P9', 'head', true],
      [`B${dr0}:B${tr}`, 'label', true], [`C${dr0}:P${tr}`, 'cell', true], [`M${dr0}:M${tr}`, 'pct', true], [`C${tr}:P${tr}`, 'total', true], [`M${tr}:M${tr}`, 'pct_b', true],
      [`B${ck}:B${ck}`, 'plain'], [`H${ck}:H${ck}`, 'label'], [`B${cs}:B${cs}`, 'section'], [`B${ch}:E${ch}`, 'head', true],
      [`B${c0}:B${ct}`, 'label', true], [`C${c0}:D${ct}`, 'cell', true], [`E${c0}:E${ct}`, 'pct', true]],
    rowHeights: sumH
  };

  /* ---- Danh mục tổng ---- */
  const ws = {};
  put(ws, 'A1', S('DANH MỤC BIỂU MẪU ISO TOÀN NHÀ MÁY · ISO 9001 · ISO 14001 · ISO 45001 · ISO 50001 · BRCGS PACKAGING\n全厂ISO表单总清单（ISO 9001 · ISO 14001 · ISO 45001 · ISO 50001 · BRCGS包装材料）'));
  put(ws, 'A2', S(`Mã tài liệu: DM-ISO-01 · Xuất từ app ISO ngày ${today} · Người lập: …………… · Người duyệt: ……………\n文件编号：DM-ISO-01 · 由ISO系统导出 ${today} · 编制：…………… · 审核：……………`));
  put(ws, 'I2', S('Tình trạng biểu: ○ chưa có · ◐ đang soạn · ● đã ban hành · ✕ không áp dụng  |  Ô nền vàng là ô nhập  |  Nơi làm: M&E / Checksheet = in từ app, không soạn lại\n表单状态：○ 未建立 · ◐ 编制中 · ● 已发布 · ✕ 不适用  |  黄色单元格为填写栏  |  完成方式：机电App/点检表＝由App打印，无需另行编制'));
  COLS.forEach(([c, title]) => put(ws, c + HEAD_ROW, S(title)));
  const grace = `'${SHEET.summary}'!$D$4`;
  const lastRow = FIRST + Math.max(items.length, 1) - 1;
  for (let r = FIRST; r <= LAST; r++) {
    const it = items[r - FIRST];
    if (it) {
      const g = groups.get(it.group_key);
      const row = {
        A: N(r - FIRST + 1), B: S(it.code), C: S(bi2(it.name_vi, it.name_zh)), D: S(bi2(it.purpose_vi, it.purpose_zh)), E: S(dept1(depts.get(it.dept_code)) || it.dept_code),
        F: S(groupLabel(g)), G: S(it.iso9001 || ''), H: S(it.iso14001 || ''), I: S(it.iso45001 || ''), J: S(it.iso50001 || ''), K: S(it.brc_topics || ''),
        L: S(it.law || ''), M: S(it.cls || ''), N: S(bi2(it.freq_vi, it.freq_zh)), O: S(it.flow || ''), P: S(it.keep || ''),
        Q: it.priority ? N(it.priority) : null, R: S(WHERE_TEXT[it.where] || ''), S: S(it.where_note || ''), T: S(SYMBOL[it.status] || '○'),
        U: it.current_rev ? { t: 's', v: String(it.current_rev), z: '@' } : null,
        V: it.issued_at ? { t: 'n', v: isoSerial(it.issued_at), z: 'dd\\/mm\\/yyyy' } : null,
        W: it.period_days ? N(it.period_days) : null, Z: S(it.note || '')
      };
      Object.entries(row).forEach(([c, o]) => { if (o && !(o.t === 's' && o.v === '' && !o.z)) put(ws, c + r, o); });
    }
    // Công thức như file gốc (dòng 5–600 đều có để thêm dòng mới vẫn được tính)
    put(ws, 'Y' + r, F(`IF(B${r}="","",IF(T${r}="✕","Không áp dụng · 不适用",IF(W${r}="","Khi phát sinh · 发生时记录",IF(X${r}="","Chưa có hồ sơ · 暂无记录",IF(TODAY()-X${r}<=W${r}+${grace},"Đúng hạn · 按期","Quá hạn · 逾期")))))`));
    ISO_SHEETS.forEach((x) => put(ws, x.key + r, F(`";"&SUBSTITUTE(${STD_COL[x.std]}${r}," ","")&";"`)));
  }
  ws['!ref'] = `A1:AD${LAST}`;
  ws['!cols'] = COLS.map(([c, , w]) => (KEY_COLS.includes(c) ? { wch: w, hidden: true } : { wch: w }));
  merges(ws, ['A1:Z1', 'A2:H2', 'I2:Z2']);
  X.utils.book_append_sheet(wb, ws, SHEET.catalog);
  const catH = { 1: 42, 2: 39.75, 3: 6, 4: 51.75 };
  for (let r = FIRST; r <= lastRow; r++) catH[r] = 66;
  polish[2] = {
    freeze: 'D5',
    styles: [['A1:A1', 'title_c'], ['A2:A2', 'note'], ['I2:I2', 'note'], ['A4:AD4', 'head', true],
      ...COLS.map(([c, , , kind]) => [`${c}${FIRST}:${c}${Math.max(lastRow, FIRST + 49)}`, kind, true])],
    rowHeights: catH,
    validations: [
      { sqref: `T${FIRST}:T${LAST}`, list: ['○', '◐', '●', '✕'] },
      { sqref: `Q${FIRST}:Q${LAST}`, list: ['1', '2', '3'] },
      { sqref: `R${FIRST}:R${LAST}`, listRef: `'${SHEET.guide}'!$F$5:$F$10` },
      { sqref: `V${FIRST}:V${LAST} X${FIRST}:X${LAST}`, type: 'date', min: 'DATE(2015,1,1)' },
      { sqref: `W${FIRST}:W${LAST}`, type: 'whole', min: '0' }
    ],
    conditional: [
      { sqref: `Y${FIRST}:Y${LAST}`, rules: [{ op: 'expr', formula: `LEFT(Y${FIRST},7)="Quá hạn"`, style: 'bad' }, { op: 'expr', formula: `LEFT(Y${FIRST},8)="Đúng hạn"`, style: 'good' }, { op: 'expr', formula: `LEFT(Y${FIRST},6)="Chưa c"`, style: 'warn' }] },
      { sqref: `T${FIRST}:T${LAST}`, rules: [{ op: 'expr', formula: `T${FIRST}="●"`, style: 'good' }, { op: 'expr', formula: `T${FIRST}="◐"`, style: 'warn' }] },
      { sqref: `R${FIRST}:R${LAST}`, rules: [{ op: 'expr', formula: `OR(LEFT(R${FIRST},3)="M&E",LEFT(R${FIRST},10)="Checksheet")`, style: 'app' }] }
    ]
  };

  /* ---- Phủ ISO 9001 / 14001 / 45001 / 50001 ---- */
  const cls = (data.clauses || []).filter((c) => c.active !== false).sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
  const brc = cls.filter((c) => c.std === 'BRC');
  const statusIso = (r) => `IF(D${r}=0,IF(LEFT(C${r},2)="Có","Thiếu biểu – bắt buộc · 缺表单（强制）","Chưa có biểu · 无表单"),IF(E${r}=0,"Có biểu, chưa ban hành · 有表单未发布","Đã có · 已覆盖"))`;
  const covCf = (last) => [{ sqref: `G5:G${last}`, rules: [{ op: 'expr', formula: 'LEFT(G5,5)="Thiếu"', style: 'bad' }, { op: 'expr', formula: 'LEFT(G5,5)="Chưa "', style: 'warn' },
    { op: 'expr', formula: 'LEFT(G5,6)="Có biể"', style: 'pale' }, { op: 'expr', formula: 'LEFT(G5,5)="Đã có"', style: 'good' }] }];
  let sheetNo = 3;
  ISO_SHEETS.forEach((x) => {
    const iso = cls.filter((c) => c.std === x.std);
    const name = STD_SHORT[x.std];
    const col = STD_COL[x.std];
    const wi = {};
    put(wi, 'A1', S(`PHỦ ĐIỀU KHOẢN ${name} · ${name}条款覆盖`));
    put(wi, 'A2', S(`Đếm số biểu trong Danh mục tổng có ghi điều khoản ở cột ${name} (cột ${col}, kể cả điều khoản con, ví dụ 7.1.5 gồm 7.1.5.2). "Bắt buộc lưu hồ sơ" = ${x.ed} yêu cầu duy trì hoặc lưu giữ thông tin dạng văn bản. Cột "Biểu liên quan" là danh sách lúc xuất file; số đếm tự cập nhật.\n`
      + `统计总清单中${name}列（${col}列）注明该条款（含子条款）的表单数。“强制保存记录”＝${x.ed}要求保持或保留成文信息。“相关表单”为导出时清单，计数自动更新。`));
    ['Điều khoản\n条款', 'Nội dung\n内容', 'Bắt buộc lưu hồ sơ\n强制保存记录', 'Số biểu\n表单数', '● Đã ban hành\n已发布', 'In từ app\n由App打印', 'Trạng thái\n状态', 'Biểu liên quan (lúc xuất file)\n相关表单（导出时）']
      .forEach((t, i) => put(wi, X.utils.encode_col(i) + '4', S(t)));
    iso.forEach((c, i) => {
      const r = 5 + i;
      const k = `"*;"&$A${r}&"*"`;
      put(wi, 'A' + r, S(c.key));
      put(wi, 'B' + r, S(bi2(c.name_vi, c.name_zh)));
      put(wi, 'C' + r, S(c.mandatory_record ? 'Có · 是' : '–'));
      put(wi, 'D' + r, F(`COUNTIF(${rng(x.key)},${k})`, 'n'));
      put(wi, 'E' + r, F(`COUNTIFS(${rng(x.key)},${k},${rng('T')},"●")`, 'n'));
      put(wi, 'F' + r, F(`COUNTIFS(${rng(x.key)},${k},${rng('R')},"M&E*")+COUNTIFS(${rng(x.key)},${k},${rng('R')},"Checksheet*")`, 'n'));
      put(wi, 'G' + r, F(statusIso(r)));
      put(wi, 'H' + r, S(items.filter((it) => isoMatch(it, c.key, x.std)).map((it) => it.code).join(', ')));
    });
    const isoLast = 4 + Math.max(1, iso.length);
    wi['!ref'] = `A1:H${isoLast}`;
    wi['!cols'] = [9, 34, 11, 8, 10, 9, 22, 70].map((w) => ({ wch: w }));
    merges(wi, ['A1:H1', 'A2:H2']);
    X.utils.book_append_sheet(wb, wi, x.sheet);
    polish[sheetNo++] = {
      freeze: 'C5',
      styles: [['A1:A1', 'title'], ['A2:A2', 'note'], ['A4:H4', 'head', true], [`A5:G${isoLast}`, 'cell', true], [`B5:B${isoLast}`, 'cell_left', true], [`H5:H${isoLast}`, 'cell_left', true]],
      rowHeights: { 1: 24, 2: 39.75, 4: 39.75 },
      conditional: covCf(isoLast)
    };
  });

  /* ---- Phủ BRCGS ---- */
  const wbr = {};
  put(wbr, 'A1', S('PHỦ YÊU CẦU BRCGS PACKAGING MATERIALS · BRCGS包装材料要求覆盖'));
  put(wbr, 'A2', S('Ghi theo nhóm và chủ đề yêu cầu, chưa ghi số điều khoản. Đối chiếu số điều khoản với bản BRCGS Packaging Materials đang áp dụng (Issue 7: phát hành 10/2024, hiệu lực 04/2025) khi có bản tiêu chuẩn. Số đếm lấy theo cột BRCGS của Danh mục tổng (khóa chủ đề ở cột H).\n'
    + '按要求类别及主题标注，暂未标条款号。取得标准文本后与现行BRCGS包装材料标准（第7版：2024年10月发布，2025年4月生效）核对条款号。计数取自总清单BRCGS列（H列为主题关键字）。'));
  ['Nhóm yêu cầu\n要求类别', 'Chủ đề\n主题', '', 'Số biểu\n表单数', '● Đã ban hành\n已发布', 'In từ app\n由App打印', 'Trạng thái\n状态', 'Khóa chủ đề\n主题关键字', 'Biểu liên quan (lúc xuất file)\n相关表单（导出时）']
    .forEach((t, i) => { if (t) put(wbr, X.utils.encode_col(i) + '4', S(t)); });
  brc.forEach((c, i) => {
    const r = 5 + i;
    const k = `"*"&$H${r}&"*"`;
    put(wbr, 'A' + r, S(c.group_vi && c.group_zh ? `${c.group_vi} · ${c.group_zh}` : (c.group_vi || c.group_zh || '')));
    put(wbr, 'B' + r, S(bi2(c.name_vi, c.name_zh)));
    put(wbr, 'D' + r, F(`COUNTIF(${rng('K')},${k})`, 'n'));
    put(wbr, 'E' + r, F(`COUNTIFS(${rng('K')},${k},${rng('T')},"●")`, 'n'));
    put(wbr, 'F' + r, F(`COUNTIFS(${rng('K')},${k},${rng('R')},"M&E*")+COUNTIFS(${rng('K')},${k},${rng('R')},"Checksheet*")`, 'n'));
    put(wbr, 'G' + r, F(`IF(D${r}=0,"Chưa có biểu · 无表单",IF(E${r}=0,"Có biểu, chưa ban hành · 有表单未发布","Đã có · 已覆盖"))`));
    put(wbr, 'H' + r, S(c.key));
    put(wbr, 'I' + r, S(items.filter((it) => brcMatch(it, c.key)).map((it) => it.code).join(', ')));
  });
  const brcLast = 4 + Math.max(1, brc.length);
  wbr['!ref'] = `A1:I${brcLast}`;
  wbr['!cols'] = [24, 26, 2, 8, 10, 9, 22, 18, 60].map((w, i) => (i === 2 ? { wch: w, hidden: true } : { wch: w }));
  merges(wbr, ['A1:I1', 'A2:I2']);
  X.utils.book_append_sheet(wb, wbr, SHEET.brc);
  polish[sheetNo++] = {
    freeze: 'C5',
    styles: [['A1:A1', 'title'], ['A2:A2', 'note'], ['A4:I4', 'head', true], [`A5:I${brcLast}`, 'cell_left', true], [`C5:H${brcLast}`, 'cell', true]],
    rowHeights: { 1: 24, 2: 39.75, 4: 39.75 },
    conditional: covCf(brcLast)
  };

  /* ---- Hướng dẫn ---- */
  const gd = {};
  put(gd, 'A1', S('HƯỚNG DẪN SỬ DỤNG DANH MỤC TỔNG · 总清单使用说明'));
  put(gd, 'A3', S('Mục\n项目')); put(gd, 'B3', S('Nội dung\n内容'));
  const guide = [
    ['Mục đích\n目的', 'Một danh mục cho toàn nhà máy: biết biểu nào đã có, biểu nào in từ app M&E / Checksheet nên không cần soạn lại, biểu nào còn thiếu theo điều khoản ISO 9001, ISO 14001, ISO 45001, ISO 50001 và BRCGS Packaging; theo dõi hồ sơ có được ghi đúng hạn không. Tệp này xuất từ app ISO; sửa xong nhập lại vào app (Excel → Nhập lô).\n全厂统一清单：掌握已建立的表单、可由机电App/点检表打印而无需另行编制的表单、按ISO 9001、ISO 14001、ISO 45001、ISO 50001及BRCGS包装材料条款仍欠缺的表单；跟踪记录是否按期填写。本文件由ISO系统导出，修改后可重新导入。'],
    ['Cấu trúc mã\n编号规则', 'BM-<bộ phận>-xx-yy: xx = nhóm, yy = số thứ tự. Mã bộ phận: ' + deptList.map((d) => `${d.dept_code} = ${dept1(d)}`).join(' · ') + '.\nBM-<部门>-xx-yy：xx＝类别，yy＝序号。'],
    ['Ô cần nhập\n填写栏', 'Nền vàng ở trang Danh mục tổng: Tình trạng biểu, Lần ban hành, Ngày ban hành, Chu kỳ hồ sơ (ngày), Ngày hồ sơ gần nhất, Ghi chú. Trang Tổng hợp: ô D4 (số ngày cho phép trễ, mặc định 3). Các cột khác là nội dung danh mục; trang Tổng hợp và các trang Phủ tự tính. Danh sách điều khoản ở các trang Phủ sửa được (thêm dòng, sửa tên, cột Bắt buộc) rồi nhập lại.\n总清单黄色栏：表单状态、版次、发布日期、记录周期（天）、最近记录日期、备注。汇总页：D4（宽限天数，默认3）。其余为清单内容；汇总页及各覆盖页自动计算。覆盖页的条款清单可修改（增行、改名称、强制栏）后重新导入。'],
    ['Tình trạng biểu\n表单状态', '○ chưa có · ◐ đang soạn · ● đã ban hành · ✕ không áp dụng.\n○ 未建立 · ◐ 编制中 · ● 已发布 · ✕ 不适用。'],
    ['Tình trạng hồ sơ\n记录状态', 'Tự tính: Đúng hạn / Quá hạn (so Ngày hồ sơ gần nhất với hôm nay, theo Chu kỳ + số ngày cho phép trễ); Chưa có hồ sơ; Khi phát sinh (biểu không có chu kỳ); Không áp dụng. Chu kỳ hồ sơ (ngày): 1 ngày · 7 tuần · 31 tháng · 92 quý · 183 nửa năm · 366 năm.\n自动计算：按期/逾期；暂无记录；发生时记录；不适用。周期（天）：1日·7周·31月·92季·183半年·366年。'],
    ['Nơi làm\n完成方式', 'M&E / Checksheet: in từ app, không soạn biểu giấy. Một phần: app làm được một phần, xem cột "In ở đâu / còn thiếu". Đề xuất Checksheet: biểu kiểm tra định kỳ nên làm bằng app Checksheet. Làm tay → App ISO: nộp hồ sơ bằng ảnh / tệp trong app ISO.\n机电App/点检表：由App打印。部分：App可完成部分。建议点检表：定期检查类表单建议用点检表App。手工→ISO App：在ISO App中以照片/文件提交记录。'],
    ['Ưu tiên\n优先级', '1 = cần có trước đánh giá chứng nhận · 2 = nên có · 3 = tùy chọn.\n1＝认证审核前必须具备 · 2＝建议具备 · 3＝可选。'],
    ['Phân loại\n类别', 'A – ISO yêu cầu · A – BRCGS yêu cầu · A – ISO & BRCGS yêu cầu: tiêu chuẩn yêu cầu lưu / duy trì thông tin → làm trước. B – Pháp luật, A+B: theo pháp luật. C – Khuyến nghị.\nA类：标准要求保留/保持成文信息 → 优先编制。B类、A+B类：法规要求。C类：建议。'],
    ['Nhập lại vào app\n导入系统', 'Giữ nguyên tên sheet, dòng tiêu đề (dòng 4) và thứ tự cột; dữ liệu từ dòng 5. App so theo Mã biểu mẫu: chưa có → thêm, có rồi → sửa, giống hệt → Không đổi. Cột Ngày hồ sơ gần nhất và Tình trạng hồ sơ do app tự tính, bỏ qua khi nhập. Không sửa, không xóa sheet _meta.\n保持工作表名称、标题行（第4行）及列顺序不变；数据从第5行开始。系统按表单编号比对：无→新增，有→修改，相同→不变。最近记录日期及记录状态由系统计算，导入时忽略。请勿修改或删除_meta工作表。'],
    ['Thêm biểu mới\n新增表单', 'Ghi vào dòng trống tiếp theo của Danh mục tổng (dòng 5 đến 600 đã có công thức). Ghi đúng tên Bộ phận như danh sách ở trang Tổng hợp để được đếm.\n在总清单下一空行填写（第5至600行已有公式）。部门名称须与汇总页一致才能计数。']
  ];
  guide.forEach(([a, b], i) => { put(gd, 'A' + (4 + i), S(a)); put(gd, 'B' + (4 + i), S(b)); });
  put(gd, 'F4', S('Danh sách Nơi làm · 完成方式列表'));
  WHERE_ORDER.forEach((w, i) => put(gd, 'F' + (5 + i), S(WHERE_TEXT[w])));
  const gLast = 3 + guide.length;
  gd['!ref'] = `A1:F${Math.max(gLast, 10)}`;
  gd['!cols'] = [22, 100, 3, 3, 3, 34].map((w) => ({ wch: w }));
  merges(gd, ['A1:B1']);
  X.utils.book_append_sheet(wb, gd, SHEET.guide);
  const gH = { 1: 21.6, 3: 24.6 };
  for (let r = 4; r <= gLast; r++) gH[r] = 60;
  polish[sheetNo++] = { styles: [['A1:A1', 'title'], ['A3:B3', 'head', true], [`A4:A${gLast}`, 'label', true], [`B4:B${gLast}`, 'cell_left', true], ['F4:F4', 'side_head'], ['F5:F10', 'cell_left', true]], rowHeights: gH };

  const meta = X.utils.aoa_to_sheet([['template_key', TEMPLATE_KEY], ['version', TEMPLATE_VERSION], ['dataset_epoch', data.epoch || ''], ['exported_at', data.exported_at || '']]);
  X.utils.book_append_sheet(wb, meta, '_meta');
  return { wb, polish };
}

/* ---------------- Đọc tệp ---------------- */

/** Ô → giá trị gửi máy chủ: chữ (NFC), số → chuỗi số, ô ngày → YYYY-MM-DD */
function cellValue(x, col) {
  if (!x || x.v === undefined || x.v === null) return '';
  if (x.t === 'd' || Object.prototype.toString.call(x.v) === '[object Date]') {
    const d = x.v;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  if (x.t === 'n') {
    if (col === 'V' && x.v > 20000 && x.v < 80000) return serialIso(x.v);
    return String(Math.round(x.v * 1e6) / 1e6);
  }
  if (x.t === 'b') return x.v ? 'TRUE' : 'FALSE';
  return String(x.v).normalize('NFC');
}

const norm = (s) => String(s || '').normalize('NFC').toLowerCase();
function findSheet(wb, name, re) {
  if (wb.Sheets[name]) return wb.Sheets[name];
  const k = wb.SheetNames.find((n) => re.test(norm(n)));
  return k ? wb.Sheets[k] : null;
}

/** Ô tiêu đề cột: chữ ngắn (dòng đầu ≤ 30 ký tự) khớp mẫu — không nhầm với dòng tiêu đề sheet, dòng ghi chú */
function isHead(x, re) {
  if (!x || x.v === undefined || x.v === null) return false;
  const first = String(x.v).split('\n')[0].trim();
  return first.length <= 30 && re.test(norm(x.v));
}

/** Dòng tiêu đề: dòng đầu (≤ 12) có ô tiêu đề khớp mẫu */
function headerRow(X, ws, re, maxCol = 30) {
  const range = X.utils.decode_range(ws['!ref']);
  for (let r = range.s.r; r <= Math.min(range.e.r, 11); r++) {
    for (let c = 0; c <= Math.min(range.e.c, maxCol); c++) {
      if (isHead(ws[X.utils.encode_cell({ r, c })], re)) return r;
    }
  }
  return -1;
}

/** Cột theo tiêu đề (ô dòng tiêu đề khớp mẫu đầu tiên) */
function colBy(X, ws, hr, re, skip = []) {
  const range = X.utils.decode_range(ws['!ref']);
  for (let c = 0; c <= range.e.c; c++) {
    if (skip.includes(c)) continue;
    if (isHead(ws[X.utils.encode_cell({ r: hr, c })], re)) return c;
  }
  return -1;
}

/** "Có · 是" (file DM-ISO-01, Excel đếm theo LEFT(C,2)="Có"), "Có", "x", "✓"… → true; "–", trống → false */
const yes = (v) => /^(có|co\b|yes|y$|x$|✓|✔|true$|1$|是|须|必须)/i.test(String(v || '').trim());

/** Điều khoản ISO từ sheet Phủ ISO 9001 / 14001 / 45001 / 50001: cột Điều khoản, Tên, Nhóm, Bắt buộc lưu hồ sơ; dòng không có số điều
 *  khoản = tên nhóm. Sheet không có cột nhóm, dòng nhóm (file xuất từ app) → group không ghi: máy chủ giữ nhóm đang có. */
function readIso(X, ws, std = 'ISO9001') {
  if (!ws || !ws['!ref']) return [];
  const hr = headerRow(X, ws, /điều khoản|条款/);
  if (hr < 0) return [];
  const range = X.utils.decode_range(ws['!ref']);
  const cKey = colBy(X, ws, hr, /điều khoản|条款/);
  const cName = colBy(X, ws, hr, /tên|nội dung|yêu cầu|名称|内容|要求/, [cKey]);
  const cGroup = colBy(X, ws, hr, /nhóm|chương|分组|章/, [cKey, cName]);
  const cMand = colBy(X, ws, hr, /bắt buộc|须|必须|必需/, [cKey, cName, cGroup]);
  const out = [];
  let grp = '';
  let grpSeen = cGroup >= 0;
  for (let r = hr + 1; r <= range.e.r; r++) {
    const v = (c) => (c < 0 ? '' : cellValue(ws[X.utils.encode_cell({ r, c })]).trim());
    const key = v(cKey);
    if (cGroup >= 0 && v(cGroup)) grp = v(cGroup);
    if (!key) continue;
    if (!/^\d+(\.\d+)*$/.test(key)) { grp = key; grpSeen = true; continue; }
    const row = { std, key, name: v(cName), mandatory_record: yes(v(cMand)), sort_order: out.length + 1 };
    if (grpSeen) row.group = grp;
    out.push(row);
  }
  return out;
}

/** Chủ đề BRCGS từ sheet Phủ BRCGS: khóa ở cột H (nếu tiêu đề có cột H), không thì cột Chủ đề */
function readBrc(X, ws) {
  if (!ws || !ws['!ref']) return [];
  const hr = headerRow(X, ws, /chủ đề|主题/);
  if (hr < 0) return [];
  const range = X.utils.decode_range(ws['!ref']);
  const cTopic = colBy(X, ws, hr, /chủ đề|主题/);
  const hH = ws[X.utils.encode_cell({ r: hr, c: 7 })];
  const cKey = hH && hH.v !== undefined && String(hH.v).trim() ? 7 : cTopic;
  const cGroup = colBy(X, ws, hr, /nhóm|分组|类/, [cTopic, cKey]);
  const out = [];
  let grp = '';
  for (let r = hr + 1; r <= range.e.r; r++) {
    const v = (c) => (c < 0 ? '' : cellValue(ws[X.utils.encode_cell({ r, c })]).trim());
    if (cGroup >= 0 && v(cGroup)) grp = v(cGroup);
    const key = v(cKey).split('\n')[0].trim();
    if (!key) continue;
    out.push({ std: 'BRC', key, name: cTopic !== cKey ? v(cTopic) : v(cTopic), group: grp, mandatory_record: false, sort_order: out.length + 1 });
  }
  return out;
}

/**
 * Đọc workbook: {meta, rows: [{row_number, cells: {A..Z}}], clauses, grace, errors: [mã lỗi]}.
 * Dữ liệu ở sheet Danh mục tổng, tiêu đề ở dòng có ô "Mã biểu mẫu" (mặc định dòng 4); dòng không có mã (dòng nhóm, dòng trống) bỏ qua.
 */
export function parseCatalogWorkbook(X, wb) {
  const errors = [];
  const meta = {};
  const ms = wb.Sheets._meta;
  if (ms) X.utils.sheet_to_json(ms, { header: 1 }).forEach((r) => { if (r[0]) meta[String(r[0])] = String(r[1] ?? ''); });
  const ws = findSheet(wb, SHEET.catalog, /danh mục tổng|总清单/);
  if (!ws || !ws['!ref']) return { meta, rows: [], clauses: [], errors: ['TEMPLATE_UNKNOWN'] };
  let hr = headerRow(X, ws, /mã biểu|表单编号/, 3);
  if (hr < 0) { errors.push('TEMPLATE_UNKNOWN'); hr = HEAD_ROW - 1; }
  const range = X.utils.decode_range(ws['!ref']);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const rows = [];
  for (let r = hr + 1; r <= range.e.r; r++) {
    const b = ws[X.utils.encode_cell({ r, c: 1 })];
    if (!b || b.v === undefined || String(b.v).trim() === '') continue;
    const cells = {};
    letters.forEach((L, c) => {
      if (L === 'X' || L === 'Y') return;
      const v = cellValue(ws[X.utils.encode_cell({ r, c })], L);
      if (v !== '') cells[L] = v;
    });
    rows.push({ row_number: r + 1, cells });
  }
  // ISO 9001: tên sheet cũ có thể chỉ "Phủ ISO …" / "…条款覆盖" — không nhầm với sheet 14001 / 45001 / 50001
  const isoRe = { ISO9001: /phủ iso 9001|^(?!.*(14001|45001|50001)).*(phủ iso|条款覆盖)/, ISO14001: /phủ iso 14001|14001.*覆盖/,
    ISO45001: /phủ iso 45001|45001.*覆盖/, ISO50001: /phủ iso 50001|50001.*覆盖/ };
  const clauses = ISO_SHEETS.flatMap((x) => readIso(X, findSheet(wb, x.sheet, isoRe[x.std]), x.std)).concat(readBrc(X, findSheet(wb, SHEET.brc, /phủ brc|brcgs覆盖/)));
  const sum = findSheet(wb, SHEET.summary, /tổng hợp|汇总/);
  const d4raw = sum && sum.D4 ? sum.D4.v : null;
  const d4 = d4raw !== null && d4raw !== undefined && d4raw !== '' && isFinite(Number(d4raw)) ? Number(d4raw) : null;
  return { meta, rows, clauses, grace: d4, errors };
}

/** Tên tệp xuất: Danh_muc_ISO_tong_yyyy-mm-dd.xlsx */
export function exportName(today, empty = false) {
  return empty ? 'Mau_Danh_muc_ISO_tong.xlsx' : `Danh_muc_ISO_tong_${today}.xlsx`;
}
