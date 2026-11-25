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

const unesc = (s) => String(s).replace(/&#x([0-9a-fA-F]+);/g, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
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
    out.push({ name: attr(m[0], 'name') || '', state: attr(m[0], 'state') || 'visible', path: rid ? target[rid] || '' : '', rid: rid || '', tag: m[0] });
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

/* ---------------- Tách biểu: chỉ giữ sheet của một biểu (25/11/2026) ---------------- */

const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Đường dẫn trong gói từ Target của .rels (tương đối với thư mục của phần chứa rels) */
function resolvePart(base, target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').slice(0, -1);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}
const relsOf = (part) => { const i = part.lastIndexOf('/'); return (i < 0 ? '' : part.slice(0, i + 1)) + '_rels/' + part.slice(i + 1) + '.rels'; };

/** Phần (part) mà một phần trỏ tới qua .rels của nó (bỏ liên kết ngoài): [path] */
function relTargets(z, part) {
  const x = z.get(relsOf(part));
  if (!x) return [];
  const out = [];
  for (const m of x.matchAll(/<Relationship\b[^>]*>/g)) {
    if (attr(m[0], 'TargetMode') === 'External') continue;
    const t = attr(m[0], 'Target');
    if (t) out.push(resolvePart(part, t));
  }
  return out;
}
/** Mọi phần đi tới được từ các phần gốc (theo .rels, đệ quy) */
function reach(z, roots) {
  const seen = new Set();
  const stack = roots.slice();
  while (stack.length) {
    const p = stack.pop();
    if (!p || seen.has(p)) continue;
    seen.add(p);
    relTargets(z, p).forEach((t) => stack.push(t));
  }
  return seen;
}

/** Công thức có tham chiếu tới sheet bị bỏ ('Tên sheet'!, TênSheet!) hoặc tên vùng bị bỏ */
function refTester(names, droppedNames) {
  const res = [];
  names.forEach((n) => {
    const q = reEsc(n.replace(/'/g, "''"));
    res.push(new RegExp(`'${q}'!`));
    // Tham chiếu nhiều sheet 'A:B'!A1 có một đầu là sheet bị bỏ
    res.push(new RegExp(`'${q}:[^']*'!`), new RegExp(`'[^']*:${q}'!`));
    if (/^[A-Za-z_À-ỹ][\w.À-ỹ]*$/.test(n)) res.push(new RegExp(`(^|[^\\w.'\\u00C0-\\u1EF9])${reEsc(n)}!`));
  });
  droppedNames.forEach((n) => res.push(new RegExp(`(^|[^\\w.])${reEsc(n)}($|[^\\w.(])`)));
  return (text) => res.some((re) => re.test(unesc(text)));
}

/** Sheet giữ lại: công thức / xác thực dữ liệu / liên kết trỏ sang sheet bị bỏ → giữ giá trị đang hiện, bỏ phần trỏ sang.
 *  linkRid: Map(rId → Target) của liên kết dạng "#'Sheet'!A1" ghi qua .rels (một số chương trình ghi như vậy thay vì location) */
function cutRefs(x, broken, linkRid = new Map()) {
  // Công thức dùng chung (t="shared"): ô gốc trỏ sang sheet bị bỏ thì bỏ cả nhóm si đó
  const badSi = new Set();
  for (const m of x.matchAll(/<f\b([^>]*)>([\s\S]*?)<\/f>/g)) {
    if (attr(m[0], 't') === 'shared' && attr(m[0], 'ref') !== null && broken(m[2])) badSi.add(attr(m[0], 'si'));
  }
  x = x.replace(/<c\b([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g, (all, a, end, inner) => {
    if (inner === undefined || !/<f\b/.test(inner)) return all;
    const fm = /<f\b[^>]*?(?:\/>|>([\s\S]*?)<\/f>)/.exec(inner);
    const ftag = fm[0];
    const bad = broken(fm[1] || '') || (attr(ftag, 't') === 'shared' && badSi.has(attr(ftag, 'si')));
    if (!bad) return all;
    let rest = inner.replace(ftag, '');
    let at = a;
    if (attr(a, 't') === 'str') {
      const v = /<v>([\s\S]*?)<\/v>/.exec(rest);
      at = a.replace(/\st="str"/, ' t="inlineStr"');
      rest = `<is><t xml:space="preserve">${v ? v[1] : ''}</t></is>`;
    }
    return rest ? `<c${at}>${rest}</c>` : `<c${at}/>`;
  });
  // Xác thực dữ liệu (danh sách lấy từ sheet khác)
  x = x.replace(/<dataValidation\b[^>]*?(?:\/>|>[\s\S]*?<\/dataValidation>)/g, (dv) => (broken(dv.replace(/<[^>]+>/g, ' ')) ? '' : dv));
  x = x.replace(/<dataValidations\b[^>]*>([\s\S]*?)<\/dataValidations>/g, (all, body) => {
    const n = (body.match(/<dataValidation\b/g) || []).length;
    return n ? all.replace(/(<dataValidations\b[^>]*?\scount=")\d+"/, `$1${n}"`) : '';
  });
  x = x.replace(/<x14:dataValidation\b[^>]*>[\s\S]*?<\/x14:dataValidation>/g, (dv) => (broken(dv.replace(/<[^>]+>/g, ' ')) ? '' : dv));
  x = x.replace(/<x14:dataValidations\b[^>]*>([\s\S]*?)<\/x14:dataValidations>/g, (all, body) => {
    const n = (body.match(/<x14:dataValidation\b/g) || []).length;
    return n ? all.replace(/(<x14:dataValidations\b[^>]*?\scount=")\d+"/, `$1${n}"`) : '';
  });
  x = x.replace(/<ext\b[^>]*>\s*<\/ext>/g, '').replace(/<extLst>\s*<\/extLst>/g, '');
  // Liên kết trong tệp (vd về Mục lục)
  x = x.replace(/<hyperlink\b[^>]*\/>/g, (h) => {
    const loc = attr(h, 'location');
    const rid = attr(h, 'r:id');
    const tgt = rid && linkRid.has(rid) ? linkRid.get(rid).replace(/^#/, '') : '';
    const dec = (v) => { try { return decodeURIComponent(v); } catch (e) { return v; } };
    return [loc, tgt].some((v) => v && (broken(xmlEsc(v)) || broken(xmlEsc(dec(v))))) ? '' : h;
  });
  x = x.replace(/<hyperlinks>\s*<\/hyperlinks>/g, '');
  return x;
}

/**
 * Tệp chỉ còn các sheet `keep` (một biểu + sheet phụ của nó), mở sẵn ở sheet `active`. Bỏ phần của sheet khác (bản vẽ, ghi chú, ảnh
 * chỉ sheet đó dùng), tên vùng của sheet bị bỏ, chuỗi tính (calcChain), docProps/app.xml (danh sách sheet cũ); sheet giữ lại có công
 * thức / danh sách chọn / liên kết trỏ sang sheet bị bỏ thì giữ giá trị đang hiện. Định dạng, vùng in, khổ giấy, ảnh của sheet giữ lại
 * giữ nguyên. Không có sheet nào trong keep → trả nguyên tệp.
 */
export function onlySheets(X, bytes, keep, active) {
  const z = openZip(X, bytes);
  const list = bookSheets(z);
  const want = new Set(keep || []);
  const kept = list.filter((s) => want.has(s.name));
  if (!kept.length) return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const gone = list.filter((s) => !want.has(s.name));
  const act = kept.some((s) => s.name === active) ? active : kept[0].name;
  if (!gone.length) return openAtSheet(X, bytes, act);
  const goneNames = gone.map((s) => s.name);

  // workbook.xml: sheet, tên vùng (localSheetId đánh lại theo thứ tự mới), activeTab
  let wb = z.get('xl/workbook.xml');
  const newIdx = new Map(kept.map((s, i) => [list.indexOf(s), i]));
  gone.forEach((s) => { wb = wb.replace(s.tag, ''); });
  const sheetRef = refTester(goneNames, []);
  const dropped = [];
  wb = wb.replace(/<definedName\b([^>]*)>([\s\S]*?)<\/definedName>/g, (all, a, body) => {
    const loc = attr(all, 'localSheetId');
    if (loc !== null) {
      if (!newIdx.has(Number(loc))) return '';
      if (sheetRef(body)) return '';
      return all.replace(/\slocalSheetId="\d+"/, ` localSheetId="${newIdx.get(Number(loc))}"`);
    }
    if (sheetRef(body)) { dropped.push(attr(all, 'name')); return ''; }
    return all;
  });
  wb = wb.replace(/<definedNames>\s*<\/definedNames>/, '');
  wb = wb.replace(/<workbookView\b[^>]*?\/?>/, (tag) => tag.replace(/\s(activeTab|firstSheet)="[^"]*"/g, ''));
  z.put('xl/workbook.xml', wb);

  // Phần cần giữ: đi từ gốc gói + workbook (trừ sheet bị bỏ, calcChain); phần chỉ sheet bị bỏ dùng → xóa
  let wrels = z.get('xl/_rels/workbook.xml.rels') || '';
  const goneRid = new Set(gone.map((s) => s.rid));
  wrels = wrels.replace(/<Relationship\b[^>]*\/?>/g, (r) => (goneRid.has(attr(r, 'Id')) || /\/calcChain$/.test(attr(r, 'Type') || '') ? '' : r));
  z.put('xl/_rels/workbook.xml.rels', wrels);
  let root = z.get('_rels/.rels') || '';
  root = root.replace(/<Relationship\b[^>]*\/?>/g, (r) => (/docProps\/app\.xml$/.test(attr(r, 'Target') || '') ? '' : r));
  z.put('_rels/.rels', root);
  const live = reach(z, ['xl/workbook.xml'].concat(relTargets(z, '')));
  const dead = new Set(['xl/calcChain.xml', 'docProps/app.xml']);
  reach(z, gone.map((s) => s.path)).forEach((p) => { if (!live.has(p)) dead.add(p); });
  let ct = z.get('[Content_Types].xml') || '';
  dead.forEach((p) => {
    for (const q of [p, relsOf(p)]) {
      if (X.CFB.find(z.zip, '/' + q)) X.CFB.utils.cfb_del(z.zip, '/' + q);
      ct = ct.replace(new RegExp(`<Override\\b[^>]*PartName="/${reEsc(q)}"[^>]*/>`, 'g'), '');
    }
  });
  z.put('[Content_Types].xml', ct);

  // Sheet giữ lại: bỏ tham chiếu sang sheet bị bỏ
  const broken = refTester(goneNames, dropped.filter(Boolean));
  kept.forEach((s) => {
    const x = s.path ? z.get(s.path) : null;
    if (!x) return;
    const linkRid = new Map();
    for (const m of (z.get(relsOf(s.path)) || '').matchAll(/<Relationship\b[^>]*>/g)) {
      const t = attr(m[0], 'Target') || '';
      if (/\/hyperlink$/.test(attr(m[0], 'Type') || '') && t.startsWith('#')) linkRid.set(attr(m[0], 'Id'), t);
    }
    const y = cutRefs(x, broken, linkRid);
    if (y !== x) z.put(s.path, y);
  });
  const out = z.CFB.write(z.zip, { fileType: 'zip', type: 'array', compression: true });
  return openAtSheet(X, out, act);
}

/** Tên tệp của một biểu tách riêng: "BM-CĐ-04-03" → "BM-CD-04-03.xlsx" (bỏ ký tự không dùng được trong tên tệp) */
export function sheetFileName(name) {
  return String(name || 'bieu').replace(/[Đđ]/g, (c) => (c === 'Đ' ? 'D' : 'd')).replace(/[\\/:*?"<>|]+/g, '-').trim() + '.xlsx';
}

/** Sheet đang chọn khi mở tệp (để kiểm): tên sheet theo activeTab */
export function activeSheet(X, bytes) {
  const z = openZip(X, bytes);
  const list = bookSheets(z);
  const v = /<workbookView\b[^>]*>/.exec(z.get('xl/workbook.xml') || '');
  const i = v ? Number(attr(v[0], 'activeTab') || 0) : 0;
  return list[i] ? list[i].name : '';
}
