// Kho tệp mẫu (2e): đọc tệp Excel mẫu (tên sheet, khổ giấy, hướng trang) và mở sẵn đúng sheet khi tải về; ghép sheet ↔ biểu theo mã.
// Không import gì (test Node chạy thẳng). X = SheetJS (chỉ dùng X.CFB để đọc / ghi gói zip — không dựng lại workbook, giữ nguyên
// định dạng, công thức, vùng in, ghi chú, biểu đồ của tệp gốc).

const enc = () => new TextEncoder();
const dec = () => new TextDecoder();

/** Mã biểu chuẩn hóa để so: NFC, chữ hoa, Đ → D, bỏ dấu cách, gạch dài → '-' (giống normFormCode_ của máy chủ) */
export function normCode(s) {
  let t = String(s || '');
  try { t = t.normalize('NFC'); } catch (e) { /* bỏ qua */ }
  return t.toUpperCase().replace(/Đ/g, 'D').replace(/\s+/g, '').replace(/[‐-―−]/g, '-');
}

/** Bảng mã chuẩn hóa → biểu */
export function itemIndex(items) {
  const idx = new Map();
  for (const it of items || []) {
    if (!it || !it.code || it.archived_at) continue;
    const k = normCode(it.code);
    if (!idx.has(k)) idx.set(k, it);
  }
  return idx;
}

/**
 * Biểu của một tên sheet: đúng mã; không có thì mã cha (bỏ đuôi a…i, -TD, -TH, -ML: BM-CĐ-03-03a → BM-CĐ-03-03), như evMatchItem_.
 * Trả {it, sub} (sub = sheet phụ của biểu) hoặc null.
 */
export function matchSheet(idx, name) {
  let k = normCode(name);
  for (let g = 0; g < 4 && k; g++) {
    if (idx.has(k)) return { it: idx.get(k), sub: g > 0 };
    const m = /^(.*\d)(?:[A-Z]|-[A-Z]{1,3})$/.exec(k);
    if (!m) return null;
    k = m[1];
  }
  return null;
}

/** Bộ biểu của một tên: BM-<bộ phận>-<nhóm> (BM-CD-04_… → BM-CĐ-04 theo danh sách mã bộ phận), giống tplSetCodeOf_ */
export function setCodeOf(s, deptCodes) {
  let t = String(s || '');
  try { t = t.normalize('NFC'); } catch (e) { /* bỏ qua */ }
  const m = /BM[-_ ]([A-Za-zĐđ]{1,6})[-_ ](\d{2})/.exec(t);
  if (!m) return null;
  const want = normCode(m[1]);
  const dept = (deptCodes || []).find((d) => normCode(d) === want);
  if (!dept) return null;
  return { set_code: `BM-${dept}-${m[2]}`, dept_code: dept, group_key: `${dept}-${m[2]}` };
}

/** Bộ biểu của tệp: bộ có nhiều sheet nhất; không có thì từ tên tệp (giống tplSetOf_) */
export function setOf(sheets, fileName, deptCodes) {
  const cnt = new Map();
  let best = null;
  for (const s of sheets || []) {
    const x = setCodeOf(s.n, deptCodes);
    if (!x) continue;
    const c = cnt.get(x.set_code) || { x, n: 0 };
    c.n++;
    cnt.set(x.set_code, c);
    if (!best || c.n > best.n) best = c;
  }
  return best ? best.x : setCodeOf(fileName, deptCodes);
}

/* ---------------- Gói zip của tệp xlsx ---------------- */

const unesc = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const attr = (tag, name) => { const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag); return m ? unesc(m[1]) : null; };

function openZip(X, bytes) {
  const CFB = X.CFB;
  const zip = CFB.read(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), { type: 'array' });
  const get = (p) => { const f = CFB.find(zip, '/' + p); return f ? dec().decode(f.content) : null; };
  const put = (p, s) => { const buf = enc().encode(s); const f = CFB.find(zip, '/' + p); if (f) { f.content = buf; f.size = buf.length; } };
  return { CFB, zip, get, put };
}

/** Sheet của workbook theo thứ tự: [{name, state, path}] (path = đường dẫn phần sheet trong gói, vd xl/worksheets/sheet3.xml) */
function bookSheets(z) {
  const wb = z.get('xl/workbook.xml');
  if (!wb) throw new Error('NOT_XLSX');
  const rels = z.get('xl/_rels/workbook.xml.rels') || '';
  const target = {};
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], 'Id'), t = attr(m[0], 'Target');
    if (id && t) target[id] = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '');
  }
  const out = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*\/?>/g)) {
    const rid = attr(m[0], 'r:id') || attr(m[0], 'r:Id');
    out.push({ name: attr(m[0], 'name') || '', state: attr(m[0], 'state') || 'visible', path: rid ? target[rid] || '' : '' });
  }
  return out;
}

const PAPER = { 9: 'A4', 8: 'A3', 11: 'A5', 1: 'LETTER' };

/**
 * Đọc tên sheet, khổ giấy, hướng trang của tệp xlsx (không dựng workbook): [{n, p, o, h}] — p: A4 | A3 | A5 | LETTER | OTHER | ''
 * (không ghi khổ), o: P dọc | L ngang | '', h: true khi sheet ẩn. Sai gói (không phải xlsx) ném lỗi.
 */
export function readSheets(X, bytes) {
  const z = openZip(X, bytes);
  return bookSheets(z).map((s) => {
    const xml = s.path ? z.get(s.path) : null;
    const ps = xml ? /<pageSetup\b[^>]*\/?>/.exec(xml) : null;
    let p = '', o = '';
    if (ps) {
      const size = attr(ps[0], 'paperSize');
      p = size === null ? '' : PAPER[Number(size)] || 'OTHER';
      const or = attr(ps[0], 'orientation');
      o = or === 'landscape' ? 'L' : or === 'portrait' ? 'P' : '';
    }
    const out = { n: s.name, p, o };
    if (s.state !== 'visible') out.h = true;
    return out;
  });
}

/**
 * Tệp xlsx mở sẵn ở sheet `name` (sheet đang chọn khi mở trong Excel; Ctrl+P → "In sheet hiện tại" in đúng biểu đó):
 * đặt activeTab ở workbook.xml và tabSelected của các sheet. Mọi thứ khác giữ nguyên. Không có sheet đó thì trả nguyên tệp.
 */
export function openAtSheet(X, bytes, name) {
  const z = openZip(X, bytes);
  const list = bookSheets(z);
  const i = list.findIndex((s) => s.name === name);
  if (i < 0) return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let wb = z.get('xl/workbook.xml');
  if (/<workbookView\b/.test(wb)) {
    wb = wb.replace(/<workbookView\b[^>]*?\/?>/, (tag) => {
      const selfClose = /\/>$/.test(tag);
      const first = Number(attr(tag, 'firstSheet') || 0);
      let t = tag.replace(/\s(activeTab|firstSheet)="[^"]*"/g, '').replace(/\s*\/?>$/, '');
      t += ` activeTab="${i}"`;
      if (first) t += ` firstSheet="${Math.min(first, i)}"`;
      return t + (selfClose ? '/>' : '>');
    });
  } else {
    wb = wb.replace(/<sheets>/, `<bookViews><workbookView activeTab="${i}"/></bookViews><sheets>`);
  }
  z.put('xl/workbook.xml', wb);
  list.forEach((s, j) => {
    if (!s.path) return;
    let x = z.get(s.path);
    if (!x) return;
    const before = x;
    x = x.replace(/(<sheetView\b[^>]*?)\stabSelected="[^"]*"/g, '$1');
    if (j === i) {
      if (/<sheetView\b/.test(x)) x = x.replace(/<sheetView\b/, '<sheetView tabSelected="1"');
      else {
        const tag = '<sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>';
        const at = /<(sheetFormatPr|cols|sheetData)\b/.exec(x);
        if (at) x = x.slice(0, at.index) + tag + x.slice(at.index);
      }
    }
    if (x !== before) z.put(s.path, x);
  });
  return z.CFB.write(z.zip, { fileType: 'zip', type: 'array', compression: true });
}

/** Sheet đang chọn khi mở tệp (để kiểm): tên sheet theo activeTab */
export function activeSheet(X, bytes) {
  const z = openZip(X, bytes);
  const list = bookSheets(z);
  const v = /<workbookView\b[^>]*>/.exec(z.get('xl/workbook.xml') || '');
  const i = v ? Number(attr(v[0], 'activeTab') || 0) : 0;
  return list[i] ? list[i].name : '';
}
