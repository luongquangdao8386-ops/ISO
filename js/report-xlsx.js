// Báo cáo Excel (Đợt 2, phiên 2c): dựng trên máy từ đúng bố cục máy chủ trả (report.save XLSX → layout, cùng bố cục với PDF):
// logo công ty ở ô A1 (Quản trị tải lên), tiêu đề hai dòng, thông tin (bộ lọc | số báo cáo BC-…, ngày lập, người lập), ô số tóm tắt,
// các phần (bảng có tiêu đề cột, màu chữ theo tình trạng; bảng nhãn – giá trị), chú thích, khối ký Người lập / Người duyệt.
// Ngày dd/mm/yyyy ghi thành ô ngày thật, số thành ô số (lọc, sắp xếp được trong Excel).
import { loadXlsx, cell, polishXlsx, withSheetImage } from './xlsx.js';
import { logoBytes, logoSize } from './report-logo.js';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DMY = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Ô của bảng theo kiểu cột: số → ô số, ngày dd/mm/yyyy → ô ngày, còn lại chữ */
function tableCell(type, v) {
  const s = v === null || v === undefined ? '' : String(v);
  if (type === 'num' && /^-?\d+$/.test(s)) return { t: 'n', v: Number(s), z: '#,##0' };
  const m = DMY.exec(s);
  if (type === 'date' && m) return cell('date', `${m[3]}-${m[2]}-${m[1]}`);
  return { t: 's', v: s };
}

const ALIGN = { num: 'r', date: 'c', mid: 'c', code: 'l', text: 'l' };

/**
 * Bố cục → sheet: {ws, styles: [[ô, kiểu]], heights: {dòng: pt}}. top: số dòng trống chừa cho logo.
 * Số cột = bảng rộng nhất (+ cột #), tối thiểu 4 (ô số tóm tắt).
 */
export function layoutSheet(X, lay, { top = 0 } = {}) {
  const ws = {};
  const styles = [];
  const heights = {};
  const merges = [];
  const width = Math.max(5, ...lay.sections.map((s) => (s.table ? s.table.head.length + 1 : 3)));
  const colLen = new Array(width).fill(6);
  let r = top; // dòng 0-based
  const ref = (rr, c) => X.utils.encode_cell({ r: rr, c });
  const put = (rr, c, o, style) => {
    if (!o) return;
    if (o.z === undefined) delete o.z;
    ws[ref(rr, c)] = o;
    if (style) styles.push([ref(rr, c), style]);
  };
  const text = (s) => ({ t: 's', v: String(s === null || s === undefined ? '' : s) });
  const note = (s, style = 'rpt_note') => { put(r, 0, text(s), style); merges.push({ s: { r, c: 0 }, e: { r, c: width - 1 } }); r++; };
  const grow = (c, s) => { const n = String(s || '').split('\n').reduce((m, x) => Math.max(m, x.length), 0); if (n > colLen[c]) colLen[c] = n; };

  put(r, 0, text(String(lay.title_vi || '').toUpperCase()), 'rpt_title'); merges.push({ s: { r, c: 0 }, e: { r, c: width - 1 } }); heights[r + 1] = 22; r++;
  if (lay.title_zh) { put(r, 0, text(lay.title_zh), 'rpt_title_zh'); merges.push({ s: { r, c: 0 }, e: { r, c: width - 1 } }); r++; }
  r++;
  // Thông tin: trái cột A (gộp nửa trái), phải nửa sau
  const half = Math.max(2, Math.floor(width / 2));
  const lines = Math.max(lay.meta_left.length, lay.meta_right.length);
  for (let i = 0; i < lines; i++) {
    const L = lay.meta_left[i], R = lay.meta_right[i];
    if (L) { put(r, 0, text(`${L[0]}: ${L[1]}`), 'rpt_meta'); merges.push({ s: { r, c: 0 }, e: { r, c: half - 1 } }); }
    if (R) { put(r, half, text(`${R[0]}: ${R[1]}`), 'rpt_meta_r'); merges.push({ s: { r, c: half }, e: { r, c: width - 1 } }); }
    r++;
  }
  r++;
  // Ô số tóm tắt từ cột B (cột A là cột # hẹp): nhãn một dòng (xuống dòng trong ô), số dòng dưới; 4 ô một hàng
  for (let i = 0; i < lay.tiles.length; i += 4) {
    lay.tiles.slice(i, i + 4).forEach((t, k) => {
      put(r, k + 1, text(t.label), 'rpt_tile_l');
      put(r + 1, k + 1, text(t.value), 'rpt_tile_v' + (t.tone ? '_' + t.tone : ''));
      grow(k + 1, String(t.value));
    });
    heights[r + 1] = 30; heights[r + 2] = 22;
    r += 2;
  }
  // Các phần
  for (const s of lay.sections) {
    r++;
    if (s.heading) { put(r, 0, text(s.heading), 'section'); merges.push({ s: { r, c: 0 }, e: { r, c: width - 1 } }); r++; }
    if (s.kv) {
      // Nhãn gộp cột A–B, giá trị gộp từ cột C tới hết
      for (const [k, v] of s.kv) {
        put(r, 0, text(k), 'rpt_kv_l'); put(r, 1, text(''), 'rpt_kv_l');
        merges.push({ s: { r, c: 0 }, e: { r, c: 1 } });
        put(r, 2, text(v), 'rpt_l');
        for (let c = 3; c < width; c++) put(r, c, text(''), 'rpt_l');
        merges.push({ s: { r, c: 2 }, e: { r, c: width - 1 } });
        r++;
      }
    }
    if (s.table) {
      const tb = s.table;
      const head = ['#', ...tb.head];
      const types = ['num', ...tb.types];
      head.forEach((h, c) => { put(r, c, text(h), 'rpt_head'); grow(c, h); });
      r++;
      if (!tb.rows.length) { put(r, 1, text(lay.none || ''), 'rpt_note'); r++; }
      tb.rows.forEach((row, i) => {
        const total = s.total_row && i === tb.rows.length - 1;
        const tones = (tb.tones && tb.tones[i]) || [];
        put(r, 0, total ? text('') : { t: 'n', v: i + 1 }, total ? 'rpt_tot_r' : 'rpt_r_muted');
        row.forEach((v, c) => {
          const ty = tb.types[c] || 'text';
          const tone = tones[c] && String(v || '') ? '_' + tones[c] : '';
          put(r, c + 1, tableCell(ty, v), (total ? 'rpt_tot_' : 'rpt_') + ALIGN[ty] + (total ? '' : tone));
          grow(c + 1, ty === 'text' && String(v || '').length > 60 ? String(v).slice(0, 60) : v);
        });
        r++;
      });
    }
    if (s.note) note(s.note);
  }
  r++;
  (lay.notes || []).forEach((n) => note(n));
  // Khối ký: Người lập (tên người lập) · Người duyệt; SCAR (3b) thêm ô giữa Đại diện nhà cung cấp
  r += 1;
  const sg = lay.sign;
  const cols = sg.middle ? [[sg.prepared, sg.prepared_name], [sg.middle, sg.middle_name], [sg.approved, sg.approved_name]] : [[sg.prepared, sg.prepared_name], [sg.approved, sg.approved_name]];
  const n = cols.length;
  const span = Math.max(1, Math.floor(width / n));
  const starts = cols.map((_, i) => (n === 2 ? (i === 0 ? 0 : Math.max(half, 2)) : i * span));
  const ends = starts.map((st, i) => (i === n - 1 ? width - 1 : starts[i + 1] - 1));
  const signRow = (vals, style, skipEmpty) => {
    cols.forEach((_, i) => { const v = vals[i]; if (!skipEmpty || v) put(r, starts[i], text(v || ''), style); merges.push({ s: { r, c: starts[i] }, e: { r, c: Math.max(starts[i], ends[i]) } }); });
    r++;
  };
  signRow(cols.map((x) => x[0]), 'rpt_sign_h');
  signRow(cols.map(() => sg.hint), 'rpt_sign_hint');
  r += 3;
  signRow(cols.map((x) => x[1] || ''), 'rpt_sign_name', true);
  r++;
  note(lay.footer || '', 'rpt_note');
  ws['!ref'] = X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, r - 1), c: width - 1 } });
  ws['!merges'] = merges;
  ws['!cols'] = colLen.map((n, c) => ({ wch: c === 0 ? 5 : Math.max(8, Math.min(40, n + 2)) }));
  ws['!margins'] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };
  return { ws, styles, heights, rows: r, width };
}

/** Trang in: A4 ngang, vừa một trang theo chiều ngang (dài bao nhiêu trang cũng được) — như PDF */
export function withPageSetup(X, bytes) {
  const CFB = X.CFB;
  const zip = CFB.read(new Uint8Array(bytes), { type: 'array' });
  const f = CFB.find(zip, '/xl/worksheets/sheet1.xml');
  let sx = new TextDecoder().decode(f.content);
  if (!/<sheetPr/.test(sx)) sx = sx.replace(/(<worksheet\b[^>]*>)/, '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
  const ps = '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>';
  sx = /<pageMargins[^>]*\/>/.test(sx) ? sx.replace(/(<pageMargins[^>]*\/>)/, '$1' + ps) : sx.replace('</worksheet>', ps + '</worksheet>');
  const buf = new TextEncoder().encode(sx);
  f.content = buf; f.size = buf.length;
  return CFB.write(zip, { fileType: 'zip', type: 'array', compression: true });
}

/** Tệp Excel của một báo cáo (logo ở A1 khi có) */
export async function reportExcelFile(lay, logo, name) {
  const X = await loadXlsx();
  const { ws, styles, heights } = layoutSheet(X, lay, { top: logo ? 4 : 0 });
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, ws, (lay.code || 'Bao cao').slice(0, 31));
  let bytes = X.write(wb, { type: 'array', bookType: 'xlsx', compression: true });
  bytes = polishXlsx(X, bytes, { 1: { styles, rowHeights: heights } });
  bytes = withPageSetup(X, bytes);
  if (logo) {
    const sz = await logoSize(logo, 56);
    bytes = withSheetImage(X, bytes, { sheet: 1, bytes: logoBytes(logo), mime: logo.mime, wPx: sz.w, hPx: sz.h });
  }
  return new File([bytes], name, { type: XLSX_MIME });
}
