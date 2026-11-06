// Excel trên trình duyệt (phụ lục 1.5 mục 3.15 Nhập Excel, 5.4.6): SheetJS CE 0.20.3 nạp theo nhu cầu (không cache vỏ app)
let loading = null;

/** Nạp vendor/xlsx-0.20.3.full.min.js một lần (CSP script-src 'self') */
export function loadXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (!loading) {
    loading = new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = 'vendor/xlsx-0.20.3.full.min.js';
      s.onload = () => ok(window.XLSX);
      s.onerror = () => { loading = null; fail(new Error('xlsx')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** SHA-256 hex của nội dung tệp (source_sha256) */
export async function sha256Hex(buf) {
  const d = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
/** 'YYYY-MM-DD' → số ngày Excel (ô ngày thật, giờ Việt Nam) */
function isoToSerial(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? (Date.UTC(+m[1], +m[2] - 1, +m[3]) - EXCEL_EPOCH) / 86400000 : null;
}
/** Date của ô ngày (SheetJS cellDates, giờ máy) → 'YYYY-MM-DD', có giờ thì 'YYYY-MM-DD HH:MM' (cột thời điểm, Đợt 2) */
function dateToIso(d) {
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return d.getHours() || d.getMinutes() ? `${day} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : day;
}

/** Một ô theo kiểu (5.4.6): số #,##0 / #,##0.0##, ngày dd/mm/yyyy, mã @ giữ số 0, chữ luôn là chuỗi (không thành công thức) */
export function cell(type, v) {
  if (v === null || v === undefined || v === '') return type === 'code' ? { t: 's', v: '', z: '@' } : null;
  if (type === 'num' && typeof v === 'number' && isFinite(v)) return { t: 'n', v, z: Number.isInteger(v) ? '#,##0' : '#,##0.0##' };
  if (type === 'date') { const n = isoToSerial(v); if (n !== null) return { t: 'n', v: n, z: 'dd\\/mm\\/yyyy' }; }
  if (type === 'bool') return { t: 'b', v: v === true };
  return { t: 's', v: String(v), z: type === 'code' ? '@' : undefined };
}

/** Sheet từ dòng khóa, dòng nhãn, dữ liệu */
export function buildSheet(X, keys, labels, types, rows, { textRows = 0 } = {}) {
  const ws = {};
  const put = (r, c, o) => { if (o) { if (o.z === undefined) delete o.z; ws[X.utils.encode_cell({ r, c })] = o; } };
  keys.forEach((k, c) => {
    put(0, c, { t: 's', v: k });
    put(1, c, { t: 's', v: labels[c] ? `${labels[c][0]} · ${labels[c][1]}` : '' });
  });
  rows.forEach((row, i) => row.forEach((v, c) => put(i + 2, c, cell(types[c], v))));
  // Mẫu trống: ô mã/chữ định dạng @ sẵn để Excel không bỏ số 0 đầu
  for (let r = rows.length + 2; r < textRows + 2; r++) types.forEach((t, c) => { if (t === 'code') put(r, c, { t: 's', v: '', z: '@' }); });
  const lastRow = Math.max(1, rows.length + 1, textRows + 1);
  ws['!ref'] = X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: Math.max(0, keys.length - 1) } });
  ws['!cols'] = keys.map((k, c) => ({ wch: Math.min(40, Math.max(12, String(labels[c] ? labels[c][0] : k).length + 4)) }));
  return ws;
}

/** Sheet dạng bảng đơn giản (hướng dẫn, danh mục, điều kiện lọc) */
export function aoaSheet(X, aoa) {
  return X.utils.aoa_to_sheet(aoa.map((r) => r.map((v) => (v === null || v === undefined ? '' : v))));
}

/**
 * Ghi workbook thành File .xlsx. image (d4.11, logo công ty ở báo cáo): {sheet: số thứ tự sheet (1 = sheet đầu), bytes, mime, wPx, hPx}
 * — SheetJS bản cộng đồng không ghi ảnh, nên chèn vào gói zip sau khi ghi (ảnh neo ô A1, giữ tỷ lệ).
 */
export function workbookFile(X, wb, name, image = null) {
  let bytes = X.write(wb, { type: 'array', bookType: 'xlsx', compression: true });
  if (image) bytes = withSheetImage(X, bytes, image);
  return new File([bytes], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const EMU_PER_PX = 9525;
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/** Chèn một ảnh vào sheet thứ `sheet` của tệp xlsx (zip): media, drawing, quan hệ của sheet, thẻ <drawing> */
export function withSheetImage(X, bytes, { sheet = 1, bytes: img, mime = 'image/png', wPx, hPx }) {
  const CFB = X.CFB;
  const zip = CFB.read(new Uint8Array(bytes), { type: 'array' });
  const enc = new TextEncoder(), dec = new TextDecoder();
  const get = (p) => { const f = CFB.find(zip, '/' + p); return f ? dec.decode(f.content) : null; };
  const put = (p, data) => {
    const buf = typeof data === 'string' ? enc.encode(data) : data;
    const f = CFB.find(zip, '/' + p);
    if (f) { f.content = buf; f.size = buf.length; } else CFB.utils.cfb_add(zip, '/' + p, buf);
  };
  const ext = mime === 'image/jpeg' ? 'jpeg' : 'png';
  const cx = Math.round(wPx * EMU_PER_PX), cy = Math.round(hPx * EMU_PER_PX);
  const media = `me_logo.${ext}`, drawing = 'drawing_me1.xml', rid = 'rIdMeLogo1';
  put(`xl/media/${media}`, img);
  put(`xl/drawings/${drawing}`, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    + `xmlns:r="${NS_R}"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>${4 * EMU_PER_PX}</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>${4 * EMU_PER_PX}</xdr:rowOff></xdr:from>`
    + `<xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>`
    + '<xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>'
    + `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>`
    + '</xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>');
  put(`xl/drawings/_rels/${drawing}.rels`, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + `<Relationship Id="rId1" Type="${NS_R}/image" Target="../media/${media}"/></Relationships>`);
  const relsPath = `xl/worksheets/_rels/sheet${sheet}.xml.rels`;
  const rels = get(relsPath) || '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  put(relsPath, rels.replace('</Relationships>', `<Relationship Id="${rid}" Type="${NS_R}/drawing" Target="../drawings/${drawing}"/></Relationships>`));
  let sx = get(`xl/worksheets/sheet${sheet}.xml`);
  if (!/xmlns:r=/.test(sx)) sx = sx.replace('<worksheet ', `<worksheet xmlns:r="${NS_R}" `);
  // <drawing> đứng trước legacyDrawing/tableParts/extLst… theo thứ tự của lược đồ worksheet
  const tag = `<drawing r:id="${rid}"/>`;
  const after = /<(legacyDrawing|legacyDrawingHF|drawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b/.exec(sx);
  sx = after ? sx.slice(0, after.index) + tag + sx.slice(after.index) : sx.replace('</worksheet>', tag + '</worksheet>');
  put(`xl/worksheets/sheet${sheet}.xml`, sx);
  let ct = get('[Content_Types].xml');
  if (!new RegExp(`Extension="${ext}"`).test(ct)) ct = ct.replace('<Override ', `<Default Extension="${ext}" ContentType="${mime}"/><Override `);
  ct = ct.replace('</Types>', `<Override PartName="/xl/drawings/${drawing}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
  put('[Content_Types].xml', ct);
  return CFB.write(zip, { fileType: 'zip', type: 'array', compression: true });
}

/** Giải mã CSV: UTF-8 (fatal) rồi Windows-1258; chuẩn hóa NFC (Excel tiếng Việt lưu dấu rời) */
function decodeCsv(buf) {
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { text = new TextDecoder('windows-1258').decode(buf); }
  return text.replace(/^﻿/, '').normalize('NFC');
}

/**
 * Đọc tệp nhập theo mẫu: {sha, meta, rows: [{sheet, row_number, values, formulas}], missing: [sheet]}
 * Chỉ lấy giá trị; ô có công thức ghi vào formulas để máy chủ báo lỗi theo dòng.
 */
export async function readImportFile(file, sheetNames) {
  const X = await loadXlsx();
  const buf = await file.arrayBuffer();
  const sha = await sha256Hex(buf);
  const csv = /\.csv$/i.test(file.name);
  const wb = csv ? X.read(decodeCsv(buf), { type: 'string', raw: true }) : X.read(buf, { type: 'array', cellDates: true, cellFormula: true, cellNF: false });
  const meta = {};
  const ms = wb.Sheets._meta;
  if (ms) X.utils.sheet_to_json(ms, { header: 1 }).forEach((r) => { if (r[0]) meta[String(r[0])] = String(r[1] ?? ''); });
  const rows = [];
  const missing = [];
  sheetNames.forEach((name, si) => {
    const ws = wb.Sheets[name] || (csv && si === 0 ? wb.Sheets[wb.SheetNames[0]] : null);
    if (!ws || !ws['!ref']) { missing.push(name); return; }
    const range = X.utils.decode_range(ws['!ref']);
    const keys = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const h = ws[X.utils.encode_cell({ r: 0, c })];
      keys[c] = h && h.v !== undefined ? String(h.v).trim() : '';
    }
    for (let r = 2; r <= range.e.r; r++) {
      const values = {};
      const formulas = [];
      let any = false;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const k = keys[c];
        if (!k || k === 'i18n_machine_fields') continue;
        const x = ws[X.utils.encode_cell({ r, c })];
        let v = '';
        if (x) {
          if (x.f) formulas.push(k);
          if (x.t === 'd' && x.v instanceof Date) v = dateToIso(x.v);
          else if (x.t === 'n' || x.t === 'b') v = x.v;
          else if (x.t === 's' || x.t === 'str') v = String(x.v).normalize('NFC');
          else if (x.v !== undefined) v = String(x.v);
        }
        if (v !== '' || x && x.f) any = true;
        values[k] = v;
      }
      if (any) rows.push({ sheet: name, row_number: r + 1, values, formulas });
    }
  });
  return { sha, meta, rows, missing };
}


/* ---------------- Định dạng sau khi ghi (SheetJS bản cộng đồng không ghi kiểu ô) ----------------
 * File Excel tổng có nền vàng ô nhập, tiêu đề đậm, xuống dòng, cố định ô, danh sách chọn (○ ◐ ● ✕), tô màu theo tình trạng.
 * Sau khi SheetJS ghi tệp, sửa trực tiếp XML trong gói zip: thêm font/nền/viền/căn lề vào styles.xml, gắn s= cho ô (tạo ô trống
 * có kiểu nếu cần), <pane> cố định, <dataValidations>, <conditionalFormatting> (dxf). */

const XSTYLE = {
  title: { font: { b: 1, sz: 14, color: '17324F' } },
  note: { font: { i: 1, sz: 10, color: '5B6875' }, wrap: 1 },
  head: { font: { b: 1, sz: 10 }, fill: 'D6DCE4', border: 1, wrap: 1, h: 'center', v: 'center' },
  group: { font: { b: 1, sz: 10, color: '17324F' }, fill: 'E6ECF3', border: 1 },
  cell: { font: { sz: 10 }, border: 1, wrap: 1, v: 'top' },
  center: { font: { sz: 10 }, border: 1, wrap: 1, v: 'top', h: 'center' },
  input: { font: { sz: 10 }, fill: 'FFF2CC', border: 1, wrap: 1, v: 'top' },
  input_center: { font: { sz: 10 }, fill: 'FFF2CC', border: 1, wrap: 1, v: 'top', h: 'center' },
  calc: { font: { sz: 10, color: '5B6875' }, fill: 'F2F2F2', border: 1, wrap: 1, v: 'top', h: 'center' },
  pct: { font: { sz: 10, b: 1 }, border: 1, h: 'center', numFmt: 10 }
};
const XDXF = {
  good: { font: '006100', fill: 'C6EFCE' },
  warn: { font: '9C5700', fill: 'FFEB9C' },
  bad: { font: '9C0006', fill: 'FFC7CE' },
  grey: { font: '595959', fill: 'D9D9D9' }
};
const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function colNum(letters) { let n = 0; for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64; return n; }
function colName(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function parseRef(ref) { const m = /^([A-Z]+)(\d+)$/.exec(ref); return { c: colNum(m[1]), r: Number(m[2]) }; }
function parseRange(rg) { const [a, b] = rg.split(':'); const s = parseRef(a), e = parseRef(b || a); return { s, e }; }

/**
 * sheets: {sheetIndex(1-based): {freeze: 'D5', styles: [[range, name, fillEmpty?]], validations: [{sqref, list}], conditional: [{sqref, rules: [{op:'equal'|'beginsWith', value, style}]}], rowHeights: {r: pt}}}
 */
export function polishXlsx(X, bytes, sheets) {
  const CFB = X.CFB;
  const zip = CFB.read(new Uint8Array(bytes), { type: 'array' });
  const enc = new TextEncoder(), dec = new TextDecoder();
  const get = (p) => { const f = CFB.find(zip, '/' + p); return f ? dec.decode(f.content) : null; };
  const put = (p, s) => { const buf = enc.encode(s); const f = CFB.find(zip, '/' + p); if (f) { f.content = buf; f.size = buf.length; } else CFB.utils.cfb_add(zip, '/' + p, buf); };
  let st = get('xl/styles.xml');
  const listOf = (tag) => { const m = new RegExp(`<${tag} count="\\d+">([\\s\\S]*?)</${tag}>`).exec(st); return m ? m[1] : ''; };
  const fonts = (listOf('fonts').match(/<font>[\s\S]*?<\/font>|<font\/>/g) || []);
  const fills = (listOf('fills').match(/<fill>[\s\S]*?<\/fill>/g) || []);
  const borders = (listOf('borders').match(/<border>[\s\S]*?<\/border>|<border\/>/g) || []);
  const xfs = (listOf('cellXfs').match(/<xf [^>]*\/>|<xf [^>]*>[\s\S]*?<\/xf>/g) || []);
  const dxfs = [];
  const fontId = (f) => {
    const x = `<font>${f.b ? '<b/>' : ''}${f.i ? '<i/>' : ''}<sz val="${f.sz || 10}"/><color rgb="FF${f.color || '000000'}"/><name val="Calibri"/><family val="2"/></font>`;
    let i = fonts.indexOf(x); if (i < 0) { fonts.push(x); i = fonts.length - 1; } return i;
  };
  const fillId = (rgb) => {
    if (!rgb) return 0;
    const x = `<fill><patternFill patternType="solid"><fgColor rgb="FF${rgb}"/><bgColor indexed="64"/></patternFill></fill>`;
    let i = fills.indexOf(x); if (i < 0) { fills.push(x); i = fills.length - 1; } return i;
  };
  const borderId = (on) => {
    if (!on) return 0;
    const x = '<border><left style="thin"><color rgb="FFC9D3DF"/></left><right style="thin"><color rgb="FFC9D3DF"/></right><top style="thin"><color rgb="FFC9D3DF"/></top><bottom style="thin"><color rgb="FFC9D3DF"/></bottom><diagonal/></border>';
    let i = borders.indexOf(x); if (i < 0) { borders.push(x); i = borders.length - 1; } return i;
  };
  const xfCache = new Map();
  /** Kiểu ô = kiểu có sẵn (định dạng số của SheetJS) + kiểu tên */
  const xfFor = (baseS, name) => {
    const key = baseS + '|' + name;
    if (xfCache.has(key)) return xfCache.get(key);
    const base = xfs[baseS] || xfs[0] || '';
    const nm = /numFmtId="(\d+)"/.exec(base);
    const d = XSTYLE[name];
    const num = d.numFmt !== undefined ? d.numFmt : (nm ? Number(nm[1]) : 0);
    const al = d.wrap || d.h || d.v ? `<alignment${d.h ? ` horizontal="${d.h}"` : ''}${d.v ? ` vertical="${d.v}"` : ''}${d.wrap ? ' wrapText="1"' : ''}/>` : '';
    const x = `<xf numFmtId="${num}" fontId="${fontId(d.font || {})}" fillId="${fillId(d.fill)}" borderId="${borderId(d.border)}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"${al ? ' applyAlignment="1">' + al + '</xf>' : '/>'}`;
    xfs.push(x);
    const id = xfs.length - 1;
    xfCache.set(key, id);
    return id;
  };
  const dxfId = (name) => {
    const d = XDXF[name];
    const x = `<dxf><font><color rgb="FF${d.font}"/></font><fill><patternFill><bgColor rgb="FF${d.fill}"/></patternFill></fill></dxf>`;
    let i = dxfs.indexOf(x); if (i < 0) { dxfs.push(x); i = dxfs.length - 1; } return i;
  };
  for (const [idx, spec] of Object.entries(sheets)) {
    const path = `xl/worksheets/sheet${idx}.xml`;
    let sx = get(path);
    if (!sx) continue;
    // Kiểu theo từng ô: ô sau ghi đè ô trước
    const want = new Map();
    const fillEmpty = new Map();
    for (const [rg, name, fill] of spec.styles || []) {
      const { s, e } = parseRange(rg);
      for (let r = s.r; r <= e.r; r++) for (let c = s.c; c <= e.c; c++) { const k = colName(c) + r; want.set(k, name); if (fill) fillEmpty.set(k, true); else fillEmpty.delete(k); }
    }
    const rowsWanted = new Map();
    for (const k of fillEmpty.keys()) { const p = parseRef(k); if (!rowsWanted.has(p.r)) rowsWanted.set(p.r, []); rowsWanted.get(p.r).push(p.c); }
    const heights = spec.rowHeights || {};
    const rowXml = (r, inner, attrs = '') => `<row r="${r}"${attrs}${heights[r] ? ` ht="${heights[r]}" customHeight="1"` : ''}>${inner}</row>`;
    const styleCells = (r, inner) => {
      const cells = new Map();
      (inner.match(/<c r="[A-Z]+\d+"[^>]*\/>|<c r="[A-Z]+\d+"[^>]*>[\s\S]*?<\/c>/g) || []).forEach((cx) => { const ref = /<c r="([A-Z]+)\d+"/.exec(cx)[1]; cells.set(colNum(ref), cx); });
      (rowsWanted.get(r) || []).forEach((c) => { if (!cells.has(c)) cells.set(c, `<c r="${colName(c)}${r}"/>`); });
      return [...cells.keys()].sort((a, b) => a - b).map((c) => {
        let cx = cells.get(c);
        const name = want.get(colName(c) + r);
        if (!name) return cx;
        const sm = /^<c r="[A-Z]+\d+"([^>]*?)(\/?)>/.exec(cx);
        const attrs = sm[1];
        const base = Number((/ s="(\d+)"/.exec(attrs) || [0, 0])[1]);
        const nattrs = attrs.replace(/ s="\d+"/, '') + ` s="${xfFor(base, name)}"`;
        return cx.replace(/^<c r="([A-Z]+\d+)"[^>]*?(\/?)>/, (m0, ref, sl) => `<c r="${ref}"${nattrs}${sl}>`);
      }).join('');
    };
    const seenRows = new Set();
    sx = sx.replace(/<row r="(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g, (m0, rn, attrs, inner) => {
      const r = Number(rn);
      seenRows.add(r);
      return rowXml(r, styleCells(r, inner || ''), attrs.replace(/ ht="[^"]*"| customHeight="[^"]*"/g, ''));
    });
    // Dòng chưa có ô nào mà cần ô trống có kiểu
    const extra = [...rowsWanted.keys()].filter((r) => !seenRows.has(r)).sort((a, b) => a - b);
    if (extra.length) {
      sx = sx.replace(/<sheetData>([\s\S]*?)<\/sheetData>|<sheetData\/>/, (m0, inner) => {
        const rows = (inner || '').match(/<row r="\d+"[\s\S]*?<\/row>/g) || [];
        extra.forEach((r) => rows.push(rowXml(r, styleCells(r, ''))));
        rows.sort((a, b) => Number(/<row r="(\d+)"/.exec(a)[1]) - Number(/<row r="(\d+)"/.exec(b)[1]));
        return `<sheetData>${rows.join('')}</sheetData>`;
      });
    }
    if (spec.freeze) {
      const p = parseRef(spec.freeze);
      const xs = p.c - 1, ys = p.r - 1;
      const pane = `<pane${xs ? ` xSplit="${xs}"` : ''}${ys ? ` ySplit="${ys}"` : ''} topLeftCell="${spec.freeze}" activePane="${xs && ys ? 'bottomRight' : ys ? 'bottomLeft' : 'topRight'}" state="frozen"/>`;
      sx = sx.replace(/<sheetView workbookViewId="0"\/>/, `<sheetView workbookViewId="0">${pane}</sheetView>`);
    }
    let tail = '';
    if (spec.conditional && spec.conditional.length) {
      let prio = 1;
      tail += spec.conditional.map((cf) => `<conditionalFormatting sqref="${cf.sqref}">${cf.rules.map((ru) => {
        const first = cf.sqref.split(/[\s:]/)[0];
        if (ru.op === 'beginsWith') return `<cfRule type="beginsWith" dxfId="${dxfId(ru.style)}" priority="${prio++}" operator="beginsWith" text="${xmlEsc(ru.value)}"><formula>LEFT(${first},${ru.value.length})="${xmlEsc(ru.value)}"</formula></cfRule>`;
        return `<cfRule type="cellIs" dxfId="${dxfId(ru.style)}" priority="${prio++}" operator="equal"><formula>"${xmlEsc(ru.value)}"</formula></cfRule>`;
      }).join('')}</conditionalFormatting>`).join('');
    }
    if (spec.validations && spec.validations.length) {
      tail += `<dataValidations count="${spec.validations.length}">${spec.validations.map((v) => `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${v.sqref}"><formula1>"${xmlEsc(v.list.join(','))}"</formula1></dataValidation>`).join('')}</dataValidations>`;
    }
    if (tail) {
      // Thứ tự lược đồ: sheetData … mergeCells, phoneticPr, conditionalFormatting, dataValidations, hyperlinks …, ignoredErrors
      const anchor = /<(hyperlinks|printOptions|pageMargins|pageSetup|headerFooter|rowBreaks|colBreaks|customProperties|cellWatches|ignoredErrors|smartTags|drawing|legacyDrawing|tableParts|extLst)\b/.exec(sx);
      sx = anchor ? sx.slice(0, anchor.index) + tail + sx.slice(anchor.index) : sx.replace('</worksheet>', tail + '</worksheet>');
    }
    put(path, sx);
  }
  st = st.replace(/<fonts count="\d+">[\s\S]*?<\/fonts>/, `<fonts count="${fonts.length}">${fonts.join('')}</fonts>`)
    .replace(/<fills count="\d+">[\s\S]*?<\/fills>/, `<fills count="${fills.length}">${fills.join('')}</fills>`)
    .replace(/<borders count="\d+">[\s\S]*?<\/borders>/, `<borders count="${borders.length}">${borders.join('')}</borders>`)
    .replace(/<cellXfs count="\d+">[\s\S]*?<\/cellXfs>/, `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>`)
    .replace(/<dxfs count="\d+"\/>|<dxfs count="\d+">[\s\S]*?<\/dxfs>/, `<dxfs count="${dxfs.length}">${dxfs.join('')}</dxfs>`);
  put('xl/styles.xml', st);
  return CFB.write(zip, { fileType: 'zip', type: 'array', compression: true });
}
