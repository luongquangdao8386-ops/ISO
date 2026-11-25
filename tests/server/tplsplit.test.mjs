// Tải một biểu từ Kho tệp mẫu (25/11/2026, người dùng: "tải cái nào riêng cái đó thôi"): js/tplx.js onlySheets giữ sheet của biểu
// (+ sheet phụ), bỏ sheet khác cùng bản vẽ / ghi chú / ảnh chỉ chúng dùng, calcChain, docProps/app.xml; đánh lại localSheetId vùng in;
// công thức / danh sách chọn / liên kết trỏ sang sheet bị bỏ → giữ giá trị đang hiện. Gói kết quả phải hợp lệ (rels trỏ tới phần có
// thật, phần nào cũng có kiểu nội dung) — Excel không báo "sửa tệp". Dựng tệp bằng SheetJS rồi vá XML (repo không chứa tệp .xlsx).
import test from 'node:test';
import assert from 'node:assert/strict';
import { xlsx } from '../xlsx-node.mjs';
import { onlySheets, openAtSheet, readSheets, activeSheet, sheetFileName } from '../../js/tplx.js';

const X = xlsx();
const dec = new TextDecoder(), enc = new TextEncoder();
const TOC = 'Mục lục - 目录';
const NAMES = [TOC, 'BM-CĐ-04-01', 'BM-CĐ-04-03', 'BM-CĐ-04-03-TH'];
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

function zipOf(bytes) { return X.CFB.read(new Uint8Array(bytes), { type: 'array' }); }
function get(zip, p) { const f = X.CFB.find(zip, '/' + p); return f ? dec.decode(f.content) : null; }
function put(zip, p, s) {
  const buf = typeof s === 'string' ? enc.encode(s) : s;
  const f = X.CFB.find(zip, '/' + p);
  if (f) { f.content = buf; f.size = buf.length; } else X.CFB.utils.cfb_add(zip, '/' + p, buf);
}
const sheetPath = (i) => `xl/worksheets/sheet${i + 1}.xml`;

/** Bộ biểu giống bộ thật: Mục lục có liên kết tới từng biểu; mỗi biểu có công thức lấy từ Mục lục, vùng in; vá thêm công thức dùng chung,
 *  danh sách chọn (thường + x14), liên kết về Mục lục, bản vẽ (ảnh dùng chung), calcChain */
function sample() {
  const wb = X.utils.book_new();
  const toc = X.utils.aoa_to_sheet([['Mã', 'Tên', '', 'DS'], ...NAMES.slice(1).map((n) => [n, 'Biểu ' + n, '', 'Có'])]);
  X.utils.book_append_sheet(wb, toc, TOC);
  NAMES.slice(1).forEach((n) => {
    const ws = X.utils.aoa_to_sheet([['[TÊN CÔNG TY]', '', n], [1], [2], [3]]);
    ws.C5 = { t: 's', v: 'Biểu BM-CĐ-04-01', f: `'${TOC}'!B2` };
    ws.D5 = { t: 'n', v: 3, f: `COUNTA('${TOC}'!A2:A4)` };
    ws.E5 = { t: 'n', v: 6, f: 'SUM(A2:A4)' };
    ws.F5 = { t: 'n', v: 2, f: 'COUNTA(DS_DAT)' };
    ws['!ref'] = 'A1:H12';
    ws['!merges'] = [X.utils.decode_range('A1:B1')];
    X.utils.book_append_sheet(wb, ws, n);
  });
  wb.Sheets['BM-CĐ-04-03-TH'].G2 = { t: 'n', v: 12, f: "'BM-CĐ-04-03'!E5*2" };
  wb.Workbook = { Names: [
    { Name: '_xlnm.Print_Area', Sheet: 1, Ref: "'BM-CĐ-04-01'!$A$1:$H$12" },
    { Name: '_xlnm.Print_Area', Sheet: 2, Ref: "'BM-CĐ-04-03'!$A$1:$H$12" },
    { Name: '_xlnm.Print_Area', Sheet: 3, Ref: "'BM-CĐ-04-03-TH'!$A$1:$H$12" },
    { Name: 'DS_DAT', Ref: `'${TOC}'!$D$2:$D$4` }
  ] };
  const zip = zipOf(X.write(wb, { type: 'array', bookType: 'xlsx' }));
  let ct = get(zip, '[Content_Types].xml');
  // Biểu: công thức dùng chung lấy từ Mục lục (ô gốc + ô con), danh sách chọn, liên kết về Mục lục và sang sheet phụ
  NAMES.slice(1).forEach((n, k) => {
    const i = k + 1;
    let x = get(zip, sheetPath(i));
    x = x.replace(/<\/sheetData>/, `<row r="10"><c r="A10"><f t="shared" ref="A10:B10" si="0">'${TOC}'!A2</f><v>9</v></c><c r="B10"><f t="shared" si="0"/><v>8</v></c><c r="C10"><f t="shared" ref="C10:D10" si="1">A2*2</f><v>2</v></c><c r="D10"><f t="shared" si="1"/><v>4</v></c></row></sheetData>`);
    const dv = `<dataValidations count="2"><dataValidation type="list" allowBlank="1" sqref="G2:G4"><formula1>'${TOC}'!$D$2:$D$4</formula1></dataValidation><dataValidation type="list" sqref="H2:H4"><formula1>"Đạt,Không đạt"</formula1></dataValidation></dataValidations>`;
    const links = `<hyperlinks><hyperlink ref="A12" location="'${TOC}'!A1" display="Mục lục"/><hyperlink ref="B12" location="'BM-CĐ-04-03-TH'!A1" display="TH"/></hyperlinks>`;
    x = x.replace('</mergeCells>', `</mergeCells>${dv}${links}`);
    assert.ok(x.includes(dv), 'đã vá danh sách chọn');
    x = x.replace('</worksheet>', `<drawing r:id="rIdD${i}"/><extLst><ext uri="{CCE6A557-97BC-4b89-ADB6-D9C93CAAB3DF}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main"><x14:dataValidations count="1" xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main"><x14:dataValidation type="list"><x14:formula1><xm:f>'${TOC}'!$D$2:$D$4</xm:f></x14:formula1><xm:sqref>F2:F4</xm:sqref></x14:dataValidation></x14:dataValidations></ext></extLst></worksheet>`);
    if (!/xmlns:r=/.test(x)) x = x.replace(/<worksheet\b/, '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"');
    put(zip, sheetPath(i), x);
    const rp = `xl/worksheets/_rels/sheet${i + 1}.xml.rels`;
    const rels = get(zip, rp) || '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    put(zip, rp, rels.replace('</Relationships>', `<Relationship Id="rIdD${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${i}.xml"/></Relationships>`));
    put(zip, `xl/drawings/drawing${i}.xml`, '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"/>');
    // Ảnh dùng chung của mọi biểu (logo) + ảnh riêng của 04-01
    put(zip, `xl/drawings/_rels/drawing${i}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>${i === 1 ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image2.png"/>' : ''}</Relationships>`);
    ct = ct.replace('</Types>', `<Override PartName="/xl/drawings/drawing${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
  });
  put(zip, 'xl/media/image1.png', PNG);
  put(zip, 'xl/media/image2.png', PNG);
  if (!/Extension="png"/.test(ct)) ct = ct.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>');
  // calcChain
  put(zip, 'xl/calcChain.xml', '<calcChain xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><c r="C5" i="2"/></calcChain>');
  ct = ct.replace('</Types>', '<Override PartName="/xl/calcChain.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml"/></Types>');
  put(zip, 'xl/_rels/workbook.xml.rels', get(zip, 'xl/_rels/workbook.xml.rels').replace('</Relationships>', '<Relationship Id="rIdCC" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/calcChain" Target="calcChain.xml"/></Relationships>'));
  put(zip, '[Content_Types].xml', ct);
  return new Uint8Array(X.CFB.write(zip, { fileType: 'zip', type: 'array' }));
}

/** Gói hợp lệ: rels trỏ tới phần có thật; Override có phần; phần nào cũng có kiểu nội dung */
function packageErrors(bytes) {
  const zip = zipOf(bytes);
  const files = zip.FullPaths.filter((p) => !p.endsWith('/')).map((p) => p.replace(/^Root Entry\//, '').replace(/^\//, '')).filter((p) => !/\u0001/.test(p));
  const has = new Set(files);
  const errs = [];
  const ct = get(zip, '[Content_Types].xml');
  const defs = [...ct.matchAll(/<Default\b[^>]*Extension="([^"]+)"/g)].map((m) => m[1].toLowerCase());
  const ovr = [...ct.matchAll(/<Override\b[^>]*PartName="([^"]+)"/g)].map((m) => m[1].slice(1));
  ovr.forEach((p) => { if (!has.has(p)) errs.push('Override thừa: ' + p); });
  files.forEach((p) => { if (p !== '[Content_Types].xml' && !ovr.includes(p) && !defs.includes(p.split('.').pop().toLowerCase())) errs.push('Thiếu kiểu: ' + p); });
  files.filter((p) => p.endsWith('.rels')).forEach((rp) => {
    const base = rp === '_rels/.rels' ? '' : rp.replace(/_rels\/([^/]+)\.rels$/, '$1');
    for (const m of get(zip, rp).matchAll(/<Relationship\b[^>]*>/g)) {
      if (/TargetMode="External"/.test(m[0])) continue;
      const t = /Target="([^"]+)"/.exec(m[0])[1];
      const parts = t.startsWith('/') ? [] : base.split('/').slice(0, -1);
      for (const s of (t.startsWith('/') ? t.slice(1) : t).split('/')) { if (s === '..') parts.pop(); else if (s && s !== '.') parts.push(s); }
      if (!has.has(parts.join('/'))) errs.push(`${rp} → ${t}`);
    }
  });
  return { errs, has };
}

test('một biểu + sheet phụ: chỉ còn sheet của biểu, mở sẵn đúng sheet; gói hợp lệ; phần chỉ sheet bị bỏ dùng thì xóa, ảnh dùng chung giữ', () => {
  const src = sample();
  assert.deepEqual(packageErrors(src).errs, [], 'tệp gốc hợp lệ');
  const out = onlySheets(X, src, ['BM-CĐ-04-03', 'BM-CĐ-04-03-TH'], 'BM-CĐ-04-03');
  assert.deepEqual(readSheets(X, out).map((s) => s.n), ['BM-CĐ-04-03', 'BM-CĐ-04-03-TH']);
  assert.equal(activeSheet(X, out), 'BM-CĐ-04-03');
  const { errs, has } = packageErrors(out);
  assert.deepEqual(errs, []);
  assert.ok(!has.has('xl/drawings/drawing1.xml') && !has.has('xl/drawings/_rels/drawing1.xml.rels'), 'bản vẽ của 04-01 bị xóa');
  assert.ok(has.has('xl/drawings/drawing2.xml') && has.has('xl/drawings/drawing3.xml'));
  assert.ok(has.has('xl/media/image1.png'), 'ảnh dùng chung giữ');
  assert.ok(!has.has('xl/media/image2.png'), 'ảnh chỉ 04-01 dùng bị xóa');
  assert.ok(!has.has('xl/calcChain.xml') && !has.has('docProps/app.xml'));
  assert.ok(!has.has('xl/worksheets/sheet1.xml') && !has.has('xl/worksheets/sheet2.xml'));
  const zip = zipOf(out);
  const wbx = get(zip, 'xl/workbook.xml');
  // Vùng in: localSheetId đánh lại 0, 1; tên vùng trỏ sang Mục lục bỏ
  assert.deepEqual([...wbx.matchAll(/<definedName\b[^>]*localSheetId="(\d+)"[^>]*>([^<]*)</g)].map((m) => [m[1], m[2].replace(/&apos;/g, "'")]),
    [['0', "'BM-CĐ-04-03'!$A$1:$H$12"], ['1', "'BM-CĐ-04-03-TH'!$A$1:$H$12"]]);
  assert.ok(!/DS_DAT/.test(wbx));
  const book = X.read(out, { type: 'array', cellFormula: true });
  const s3 = book.Sheets['BM-CĐ-04-03'], th = book.Sheets['BM-CĐ-04-03-TH'];
  // Công thức trỏ sang Mục lục / tên vùng bị bỏ → giá trị đang hiện; công thức trong biểu, sang sheet phụ giữ nguyên
  assert.deepEqual([s3.C5.v, s3.C5.f, s3.D5.v, s3.D5.f, s3.F5.v, s3.F5.f], ['Biểu BM-CĐ-04-01', undefined, 3, undefined, 2, undefined]);
  assert.equal(s3.E5.f, 'SUM(A2:A4)');
  assert.equal(th.G2.f, "'BM-CĐ-04-03'!E5*2");
  // Công thức dùng chung: nhóm trỏ Mục lục bỏ cả ô gốc và ô con (giữ 9, 8); nhóm trong sheet giữ
  assert.deepEqual([s3.A10.v, s3.A10.f, s3.B10.v, s3.B10.f], [9, undefined, 8, undefined]);
  assert.equal(s3.C10.f, 'A2*2');
  const x3 = get(zip, 'xl/worksheets/sheet3.xml');
  assert.match(x3, /<f t="shared" si="1"\/>/);
  assert.doesNotMatch(x3, /si="0"/);
  // Danh sách chọn từ Mục lục bỏ (cả x14), danh sách tự ghi giữ; liên kết về Mục lục bỏ, sang sheet phụ giữ
  assert.match(x3, /<dataValidations count="1"><dataValidation type="list" sqref="H2:H4">/);
  assert.doesNotMatch(x3, /x14:dataValidation|<extLst>/);
  assert.doesNotMatch(x3, /Mục lục|M&#7909;c/);
  assert.match(x3, /<hyperlink ref="B12" location="'BM-CĐ-04-03-TH'!A1"/);
  assert.match(x3, /<drawing r:id="rIdD2"\/>/, 'ảnh của biểu giữ nguyên');
  // Mở lại bằng SheetJS đủ dữ liệu, gộp ô
  assert.deepEqual(JSON.parse(JSON.stringify(s3['!merges'].map((m) => X.utils.encode_range(m)))), ['A1:B1']);
});

test('sheet không mang mã biểu (Mục lục) chỉ chính nó; giữ cả tệp = chỉ mở sẵn sheet; sheet không có → nguyên tệp; tên tệp', () => {
  const src = sample();
  const toc = onlySheets(X, src, [TOC], TOC);
  assert.deepEqual(readSheets(X, toc).map((s) => s.n), [TOC]);
  assert.deepEqual(packageErrors(toc).errs, []);
  assert.ok(!packageErrors(toc).has.has('xl/media/image1.png'), 'không còn bản vẽ nào → ảnh bỏ');
  const all = onlySheets(X, src, NAMES, 'BM-CĐ-04-01');
  assert.deepEqual(readSheets(X, all).map((s) => s.n), NAMES);
  assert.deepEqual([...all], [...openAtSheet(X, src, 'BM-CĐ-04-01')]);
  assert.equal(onlySheets(X, src, ['BM-CĐ-99-99'], 'BM-CĐ-99-99'), src);
  assert.equal(sheetFileName('BM-CĐ-04-03'), 'BM-CD-04-03.xlsx');
  assert.equal(sheetFileName('Mục lục / 目录'), 'Mục lục - 目录.xlsx');
});
