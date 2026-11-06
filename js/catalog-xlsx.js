// File Excel tổng (mục 6 đặc tả): xuất danh mục đúng khuôn để xuất → sửa → nhập lại được (báo "Không đổi"), đọc tệp người dùng chọn.
// 5 sheet: Tổng hợp - 汇总 (D4 = số ngày cho phép trễ) · Danh mục tổng - 总清单 (tiêu đề dòng 4, dữ liệu từ dòng 5, công thức dòng 5–600,
// cố định ô D5) · Phủ ISO 9001 - 条款覆盖 · Phủ BRCGS - BRCGS覆盖 · Hướng dẫn - 说明; thêm sheet _meta (template_key, version, dataset_epoch).
// Hàm thuần (nhận đối tượng XLSX), dùng được cả trong test Node.

export const SHEET = {
  summary: 'Tổng hợp - 汇总',
  catalog: 'Danh mục tổng - 总清单',
  iso: 'Phủ ISO 9001 - 条款覆盖',
  brc: 'Phủ BRCGS - BRCGS覆盖',
  guide: 'Hướng dẫn - 说明'
};
export const TEMPLATE_KEY = 'iso_catalog';
export const TEMPLATE_VERSION = '1';
const HEAD_ROW = 4, FIRST = 5, LAST = 600;
const CAT = `'${SHEET.catalog}'`;

/** Cột A–AA của Danh mục tổng: [chữ cột, tiêu đề Việt, tiêu đề Trung, độ rộng, kiểu ô (input: nền vàng, calc: công thức)] */
export const COLS = [
  ['A', 'STT', '序号', 5, 'center'],
  ['B', 'Mã biểu mẫu', '表单编号', 15, 'input'],
  ['C', 'Tên biểu mẫu', '表单名称', 34, 'input'],
  ['D', 'Mục đích & nội dung', '用途及内容', 40, 'input'],
  ['E', 'Bộ phận', '部门', 16, 'input'],
  ['F', 'Nhóm', '分组', 22, 'input'],
  ['G', 'ISO 9001', 'ISO 9001', 10, 'input'],
  ['H', 'ISO 14001', 'ISO 14001', 10, 'input'],
  ['I', 'ISO 45001', 'ISO 45001', 10, 'input'],
  ['J', 'ISO 50001', 'ISO 50001', 10, 'input'],
  ['K', 'BRCGS Packaging (chủ đề)', 'BRCGS包装（主题）', 20, 'input'],
  ['L', 'Căn cứ pháp luật VN', '越南法规依据', 18, 'input'],
  ['M', 'Phân loại', '类别', 14, 'input'],
  ['N', 'Tần suất', '频次', 16, 'input'],
  ['O', 'Lập → Duyệt', '填写 → 审核', 20, 'input'],
  ['P', 'Thời gian lưu', '保存期限', 16, 'input'],
  ['Q', 'Ưu tiên', '优先级', 7, 'input_center'],
  ['R', 'Nơi làm', '执行位置', 18, 'input'],
  ['S', 'In ở đâu / còn thiếu', '打印位置/缺项', 20, 'input'],
  ['T', 'Tình trạng biểu', '表单状态', 8, 'input_center'],
  ['U', 'Lần ban hành', '发布次数', 7, 'input_center'],
  ['V', 'Ngày ban hành', '发布日期', 11, 'input_center'],
  ['W', 'Chu kỳ hồ sơ (ngày)', '记录周期（天）', 9, 'input_center'],
  ['X', 'Ngày hồ sơ gần nhất', '最近记录日期', 11, 'calc'],
  ['Y', 'Tình trạng hồ sơ', '记录状态', 14, 'calc'],
  ['Z', 'Ghi chú / liên quan', '备注/相关', 24, 'input'],
  ['AA', 'khóa ISO 9001', 'ISO 9001键', 4, 'calc']
];

export const WHERE_TEXT = {
  ME: 'M&E · 机电App', CS: 'Checksheet · 点检表', ME_PART: 'Một phần M&E · 部分机电App', CS_PART: 'Một phần Checksheet · 部分点检表',
  CS_PROPOSED: 'Đề xuất Checksheet · 建议用点检表', MANUAL: 'Làm tay → App ISO · 手工→ISO App'
};
const SYMBOL = { NONE: '○', DRAFTING: '◐', ISSUED: '●', NA: '✕' };

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

/**
 * Dựng workbook. data: {items, groups, depts, clauses, grace, epoch, exported_at, empty}
 * Trả {wb, polish} — polish: tham số cho polishXlsx (kiểu ô, cố định, danh sách chọn, tô màu).
 */
export function buildCatalogWorkbook(X, data) {
  const enc = X.utils.encode_cell;
  const groups = new Map((data.groups || []).map((g) => [g.group_key, g]));
  const depts = new Map((data.depts || []).map((d) => [d.dept_code, d]));
  const items = data.empty ? [] : (data.items || []).slice().sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.code).localeCompare(String(b.code)));
  const wb = X.utils.book_new();
  const polish = {};

  /* ---- Tổng hợp ---- */
  const sum = {};
  const put = (ws, ref, o) => { ws[ref] = o; };
  put(sum, 'A1', S('TỔNG HỢP DANH MỤC BIỂU MẪU & TÀI LIỆU ISO · ISO表单及文件汇总'));
  put(sum, 'A2', S('Số liệu tự tính từ sheet Danh mục tổng. Ô D4 dùng cho cột Tình trạng hồ sơ. · 数据由总清单自动计算，D4用于记录状态列。'));
  put(sum, 'A3', S('Chỉ tiêu · 指标')); put(sum, 'D3', S('Giá trị · 数值'));
  put(sum, 'A4', S('Số ngày cho phép trễ khi xét hồ sơ · 记录允许延迟天数')); put(sum, 'D4', N(data.grace ?? 3));
  const rng = (c) => `${CAT}!$${c}$${FIRST}:$${c}$${LAST}`;
  const lines = [
    ['Tổng số biểu · 表单总数', `COUNTA(${rng('B')})`, 'n'],
    ['Đã ban hành (●) · 已发布', `COUNTIF(${rng('T')},"●")`, 'n'],
    ['Đang soạn (◐) · 编写中', `COUNTIF(${rng('T')},"◐")`, 'n'],
    ['Chưa có (○) · 未编写', `COUNTIF(${rng('T')},"○")`, 'n'],
    ['Không áp dụng (✕) · 不适用', `COUNTIF(${rng('T')},"✕")`, 'n'],
    ['% ban hành = ● / (tổng − ✕) · 发布率', 'IFERROR(D6/(D5-D9),0)', 'pct'],
    ['In từ app (M&E, Checksheet) · 系统打印', `COUNTIF(${rng('R')},"M&E*")+COUNTIF(${rng('R')},"Checksheet*")`, 'n'],
    ['Ưu tiên 1 chưa ban hành · 优先级1未发布', `COUNTIFS(${rng('Q')},1,${rng('T')},"<>●",${rng('T')},"<>✕")`, 'n'],
    ['Hồ sơ quá hạn · 记录逾期', `COUNTIF(${rng('Y')},"Quá hạn*")`, 'n']
  ];
  lines.forEach(([label, f, kind], i) => { put(sum, 'A' + (5 + i), S(label)); put(sum, 'D' + (5 + i), F(f, 'n')); });
  sum['!ref'] = `A1:D${4 + lines.length}`;
  sum['!cols'] = [{ wch: 46 }, { wch: 2 }, { wch: 2 }, { wch: 12 }];
  sum['!merges'] = [X.utils.decode_range('A1:D1'), X.utils.decode_range('A2:D2')];
  X.utils.book_append_sheet(wb, sum, SHEET.summary);
  polish[1] = {
    styles: [['A1:A1', 'title'], ['A2:A2', 'note'], ['A3:D3', 'head', true], ['A4:A13', 'cell'], ['D4:D4', 'input_center'], ['D5:D13', 'calc'], ['D10:D10', 'pct']],
    rowHeights: { 2: 30 }
  };

  /* ---- Danh mục tổng ---- */
  const ws = {};
  put(ws, 'A1', S('DANH MỤC TỔNG BIỂU MẪU & TÀI LIỆU ISO 9001 / 14001 / 45001 / 50001 + BRCGS PACKAGING · 体系表单及文件总清单'));
  put(ws, 'A2', S('Tình trạng biểu: ○ chưa có · ◐ đang soạn · ● đã ban hành · ✕ không áp dụng — Ưu tiên 1 = cần trước đánh giá chứng nhận — Chu kỳ hồ sơ: 1 ngày, 7 tuần, 31 tháng, 92 quý, 183 nửa năm, 366 năm, trống = khi phát sinh · '
    + '表单状态：○未编写 · ◐编写中 · ●已发布 · ✕不适用'));
  put(ws, 'A3', S(`Xuất từ app ISO · 由ISO系统导出 — ${data.exported_at || ''}`));
  COLS.forEach(([c, vi, zh]) => put(ws, c + HEAD_ROW, S(`${vi}\n${zh}`)));
  const grace = `'${SHEET.summary}'!$D$4`;
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
    put(ws, 'Y' + r, F(`IF(B${r}="","",IF(T${r}<>"●","",IF(W${r}="","Khi phát sinh · 发生时",IF(X${r}="","Chưa có · 无记录",IF(TODAY()-X${r}>W${r}+${grace},"Quá hạn · 逾期","Đúng hạn · 按时")))))`));
    put(ws, 'AA' + r, F(`";"&SUBSTITUTE(G${r}," ","")&";"`));
  }
  ws['!ref'] = `A1:AA${LAST}`;
  ws['!cols'] = COLS.map(([c, , , w]) => (c === 'AA' ? { wch: w, hidden: true } : { wch: w }));
  ws['!merges'] = [X.utils.decode_range('A1:Z1'), X.utils.decode_range('A2:Z2'), X.utils.decode_range('A3:Z3')];
  X.utils.book_append_sheet(wb, ws, SHEET.catalog);
  const last = Math.max(FIRST, FIRST + items.length - 1);
  polish[2] = {
    freeze: 'D5',
    styles: [['A1:A1', 'title'], ['A2:A2', 'note'], ['A3:A3', 'note'], ['A4:AA4', 'head', true],
      ...COLS.map(([c, , , , kind]) => [`${c}${FIRST}:${c}${Math.max(last, FIRST + 49)}`, kind, true])],
    rowHeights: { 2: 30, 4: 42 },
    validations: [
      { sqref: `T${FIRST}:T${LAST}`, list: ['○', '◐', '●', '✕'] },
      { sqref: `Q${FIRST}:Q${LAST}`, list: ['1', '2', '3'] },
      { sqref: `R${FIRST}:R${LAST}`, list: Object.values(WHERE_TEXT) }
    ],
    conditional: [
      { sqref: `T${FIRST}:T${LAST}`, rules: [{ op: 'equal', value: '●', style: 'good' }, { op: 'equal', value: '◐', style: 'warn' }, { op: 'equal', value: '✕', style: 'grey' }] },
      { sqref: `Y${FIRST}:Y${LAST}`, rules: [{ op: 'beginsWith', value: 'Quá hạn', style: 'bad' }, { op: 'beginsWith', value: 'Đúng hạn', style: 'good' }] }
    ]
  };

  /* ---- Phủ ISO 9001 ---- */
  const cls = (data.clauses || []).filter((c) => c.active !== false).sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
  const iso = cls.filter((c) => c.std === 'ISO9001');
  const brc = cls.filter((c) => c.std === 'BRC');
  const wi = {};
  put(wi, 'A1', S('PHỦ ĐIỀU KHOẢN ISO 9001 · ISO 9001条款覆盖'));
  put(wi, 'A2', S('Biểu thuộc điều khoản X khi một mã ở cột G của Danh mục tổng bắt đầu bằng X (9.2 đếm cả 9.2.2). · 当总清单G列以X开头时计入。'));
  ['Nhóm\n分组', 'Điều khoản\n条款', 'Tên điều khoản\n条款名称', 'Bắt buộc lưu hồ sơ\n须保存记录', 'Số biểu\n表单数', 'Đã ban hành\n已发布', 'In từ app\n系统打印', 'Trạng thái\n状态']
    .forEach((h, i) => put(wi, X.utils.encode_col(i) + '3', S(h)));
  iso.forEach((c, i) => {
    const r = 4 + i;
    const k = `"*;"&B${r}&"*"`;
    put(wi, 'A' + r, S(bi2(c.group_vi, c.group_zh)));
    put(wi, 'B' + r, S(c.key));
    put(wi, 'C' + r, S(bi2(c.name_vi, c.name_zh)));
    put(wi, 'D' + r, S(c.mandatory_record ? 'Có' : 'Không'));
    put(wi, 'E' + r, F(`COUNTIF(${rng('AA')},${k})`, 'n'));
    put(wi, 'F' + r, F(`COUNTIFS(${rng('AA')},${k},${rng('T')},"●")`, 'n'));
    put(wi, 'G' + r, F(`COUNTIFS(${rng('AA')},${k},${rng('R')},"M&E*")+COUNTIFS(${rng('AA')},${k},${rng('R')},"Checksheet*")`, 'n'));
    put(wi, 'H' + r, F(`IF(E${r}=0,IF(D${r}="Có","Thiếu biểu – bắt buộc","Chưa có biểu"),IF(F${r}=0,"Có biểu, chưa ban hành","Đã có"))`));
  });
  wi['!ref'] = `A1:H${Math.max(3, 3 + iso.length)}`;
  wi['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 40 }, { wch: 10 }, { wch: 8 }, { wch: 9 }, { wch: 9 }, { wch: 22 }];
  wi['!merges'] = [X.utils.decode_range('A1:H1'), X.utils.decode_range('A2:H2')];
  X.utils.book_append_sheet(wb, wi, SHEET.iso);
  const isoLast = 3 + Math.max(1, iso.length);
  polish[3] = {
    freeze: 'C4',
    styles: [['A1:A1', 'title'], ['A2:A2', 'note'], ['A3:H3', 'head', true], [`A4:D${isoLast}`, 'cell', true], [`B4:B${isoLast}`, 'center', true], [`D4:D${isoLast}`, 'center', true], [`E4:H${isoLast}`, 'calc', true]],
    rowHeights: { 2: 30, 3: 30 },
    conditional: [{ sqref: `H4:H${isoLast}`, rules: [{ op: 'beginsWith', value: 'Thiếu', style: 'bad' }, { op: 'beginsWith', value: 'Có biểu', style: 'warn' }, { op: 'beginsWith', value: 'Đã có', style: 'good' }] }]
  };

  /* ---- Phủ BRCGS ---- */
  const wbr = {};
  put(wbr, 'A1', S('PHỦ CHỦ ĐỀ BRCGS PACKAGING (Issue 7) · BRCGS包装主题覆盖'));
  put(wbr, 'A2', S('Biểu thuộc chủ đề khi cột K của Danh mục tổng chứa khóa ở cột H. · 当总清单K列包含H列关键词时计入。'));
  ['Nhóm\n分组', 'Chủ đề\n主题', 'Số biểu\n表单数', 'Đã ban hành\n已发布', 'In từ app\n系统打印', 'Trạng thái\n状态', 'Ghi chú\n备注', 'Khóa chủ đề\n主题关键词']
    .forEach((h, i) => put(wbr, X.utils.encode_col(i) + '3', S(h)));
  brc.forEach((c, i) => {
    const r = 4 + i;
    const k = `"*"&H${r}&"*"`;
    put(wbr, 'A' + r, S(bi2(c.group_vi, c.group_zh)));
    put(wbr, 'B' + r, S(bi2(c.name_vi, c.name_zh)));
    put(wbr, 'C' + r, F(`COUNTIF(${rng('K')},${k})`, 'n'));
    put(wbr, 'D' + r, F(`COUNTIFS(${rng('K')},${k},${rng('T')},"●")`, 'n'));
    put(wbr, 'E' + r, F(`COUNTIFS(${rng('K')},${k},${rng('R')},"M&E*")+COUNTIFS(${rng('K')},${k},${rng('R')},"Checksheet*")`, 'n'));
    put(wbr, 'F' + r, F(`IF(C${r}=0,"Chưa có biểu",IF(D${r}=0,"Có biểu, chưa ban hành","Đã có"))`));
    put(wbr, 'H' + r, S(c.key));
  });
  wbr['!ref'] = `A1:H${Math.max(3, 3 + brc.length)}`;
  wbr['!cols'] = [{ wch: 20 }, { wch: 36 }, { wch: 8 }, { wch: 9 }, { wch: 9 }, { wch: 22 }, { wch: 14 }, { wch: 22 }];
  wbr['!merges'] = [X.utils.decode_range('A1:H1'), X.utils.decode_range('A2:H2')];
  X.utils.book_append_sheet(wb, wbr, SHEET.brc);
  const brcLast = 3 + Math.max(1, brc.length);
  polish[4] = {
    freeze: 'C4',
    styles: [['A1:A1', 'title'], ['A2:A2', 'note'], ['A3:H3', 'head', true], [`A4:B${brcLast}`, 'cell', true], [`C4:F${brcLast}`, 'calc', true], [`G4:H${brcLast}`, 'cell', true]],
    rowHeights: { 2: 30, 3: 30 },
    conditional: [{ sqref: `F4:F${brcLast}`, rules: [{ op: 'beginsWith', value: 'Chưa có', style: 'bad' }, { op: 'beginsWith', value: 'Có biểu', style: 'warn' }, { op: 'beginsWith', value: 'Đã có', style: 'good' }] }]
  };

  /* ---- Hướng dẫn ---- */
  const guide = [
    ['HƯỚNG DẪN · 说明', ''],
    ['', ''],
    ['Mục · 项目', 'Nội dung · 内容'],
    ['Nhập lại vào app · 导入系统', 'Sửa ô nền vàng ở sheet Danh mục tổng (dữ liệu từ dòng 5), lưu tệp, vào app ISO → Excel → Nhập lô. App so theo Mã biểu mẫu: có rồi → sửa, chưa có → thêm, giống hệt → Không đổi.'],
    ['Cột C, D, N', 'Dòng 1 tiếng Việt, dòng 2 tiếng Trung (Alt+Enter để xuống dòng).'],
    ['Cột E', 'Tên bộ phận đúng như danh sách của app (vd "Chất lượng QA/QC · 质量").'],
    ['Cột F', 'Nhóm "01. Tên Việt · 中文"; nhóm lấy từ mã BM-<bộ phận>-xx-yy.'],
    ['Cột G–J', 'Điều khoản ISO, nhiều điều khoản cách nhau bằng "; ".'],
    ['Cột T', '○ chưa có · ◐ đang soạn · ● đã ban hành · ✕ không áp dụng. Biểu ● nhập từ Excel mà chưa có tệp được ban hành, gắn cờ "chưa có tệp".'],
    ['Cột W', 'Chu kỳ hồ sơ (ngày): 1, 7, 31, 92, 183, 366; trống = khi phát sinh (không tính quá hạn).'],
    ['Cột X, Y', 'App tự tính, bỏ qua khi nhập.'],
    ['Sheet _meta', 'Không sửa, không xóa: app dùng để nhận ra tệp xuất từ app.']
  ];
  const wg = X.utils.aoa_to_sheet(guide);
  wg['!cols'] = [{ wch: 26 }, { wch: 90 }];
  X.utils.book_append_sheet(wb, wg, SHEET.guide);
  polish[5] = { styles: [['A1:A1', 'title'], ['A3:B3', 'head', true], [`A4:B${guide.length}`, 'cell', true]] };

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

const yes = (v) => /^(có|co|yes|y|x|✓|✔|true|1|是|须|必须|bắt buộc)$/i.test(String(v || '').trim());

/** Điều khoản ISO 9001 từ sheet Phủ ISO 9001: cột Điều khoản, Tên, Nhóm, Bắt buộc lưu hồ sơ; dòng không có số điều khoản = tên nhóm */
function readIso(X, ws) {
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
  for (let r = hr + 1; r <= range.e.r; r++) {
    const v = (c) => (c < 0 ? '' : cellValue(ws[X.utils.encode_cell({ r, c })]).trim());
    const key = v(cKey);
    if (cGroup >= 0 && v(cGroup)) grp = v(cGroup);
    if (!key) continue;
    if (!/^\d+(\.\d+)*$/.test(key)) { grp = key; continue; }
    out.push({ std: 'ISO9001', key, name: v(cName), group: grp, mandatory_record: yes(v(cMand)), sort_order: out.length + 1 });
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
  const clauses = readIso(X, findSheet(wb, SHEET.iso, /phủ iso|条款覆盖/)).concat(readBrc(X, findSheet(wb, SHEET.brc, /phủ brc|brcgs覆盖/)));
  const sum = findSheet(wb, SHEET.summary, /tổng hợp|汇总/);
  const d4 = sum && sum.D4 && sum.D4.t === 'n' ? sum.D4.v : null;
  return { meta, rows, clauses, grace: d4, errors };
}

/** Tên tệp xuất: Danh_muc_ISO_tong_yyyy-mm-dd.xlsx */
export function exportName(today, empty = false) {
  return empty ? 'Mau_Danh_muc_ISO_tong.xlsx' : `Danh_muc_ISO_tong_${today}.xlsx`;
}
