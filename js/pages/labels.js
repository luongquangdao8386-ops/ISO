// In tem QR của biểu (Đợt 2, phiên 2d): chọn biểu đang hiệu lực (●), cỡ tem 70×37 mm (24 tem / tờ A4, 3 × 8) hoặc 105×74 mm
// (8 tem / tờ A4, 2 × 4), số tem mỗi biểu, bắt đầu từ ô (tờ tem đã dùng dở) → In (khổ A4, lề 0) hoặc Tải ảnh PNG của mã để chèn vào
// đầu biểu Excel. Tem ghi mã, tên Việt / Trung, lần ban hành; QR là link …/#/f/<qr_key>?r=<lần> — quét bằng nút Quét của app: tem
// của lần cũ báo đỏ "Bản in này đã lỗi thời". Không logo trên tem. Làm được khi mất mạng (dữ liệu trên máy).
import { bi, biText, esc, fmtDate, nameText } from '../core.js';
import { ICON, toast, $, $$, setViewHtml, wireSearch } from '../ui.js';
import { items, depts, isSecretary, roleLevel, curRevOf, itemHay, foldVi } from '../data.js';
import { busy } from '../form.js';
import { openFile } from '../files.js';
import { qrMatrix, qrSvg, qrPngFile, itemQrUrl, loadQr } from '../qr.js';

/** Cỡ tem: kích thước (mm), số cột × hàng trên tờ A4 (210 × 297 mm), cạnh QR (mm) */
export const SIZES = {
  S: { w: 70, h: 37, cols: 3, rows: 8, qr: 31 },
  L: { w: 105, h: 74, cols: 2, rows: 4, qr: 52 }
};

const st = { size: 'S', copies: 1, start: 1, dept: '', q: '', picked: new Set(), qItem: '' };

/** HTML một tem */
function labelHtml(it, m, size) {
  const z = SIZES[size];
  const rev = curRevOf(it);
  return `<div class="qrl qrl-${size}">${qrSvg(m, z.qr + 'mm')}
    <div class="qrl-text"><div class="qrl-code">${esc(it.code)}</div>
      <div class="qrl-name">${esc(it.name_vi || '')}</div>${it.name_zh ? `<div class="qrl-zh">${esc(it.name_zh)}</div>` : ''}
      <div class="qrl-rev">${esc(biText('lbl.rev', { N: rev }))}</div>
      ${size === 'L' && it.issued_at ? `<div class="qrl-date">${esc(biText('lbl.issued', { D: fmtDate(it.issued_at) }))}</div>` : ''}
      <div class="qrl-hint">${esc(biText('lbl.scan_hint'))}</div></div></div>`;
}

/** Các tờ A4 (mảng HTML từng tờ): mỗi tờ cols × rows ô; ô trống ở đầu tờ đầu (bắt đầu từ ô start) */
export async function sheetPages(list, { size = 'S', copies = 1, start = 1 } = {}) {
  const z = SIZES[size];
  const per = z.cols * z.rows;
  const cells = [];
  for (let i = 1; i < start; i++) cells.push('<div class="qrl qrl-empty"></div>');
  for (const it of list) {
    const m = await qrMatrix(itemQrUrl(it, curRevOf(it)));
    const one = labelHtml(it, m, size);
    for (let k = 0; k < copies; k++) cells.push(one);
  }
  const pages = [];
  for (let i = 0; i < cells.length; i += per) pages.push(cells.slice(i, i + per));
  return pages.map((p) => `<div class="qrl-sheet qrl-sheet-${size}">${p.join('')}</div>`);
}

/** In: dựng vùng in riêng ngoài khung app, gọi in của trình duyệt, gỡ sau khi in */
async function printSheets(html) {
  let root = document.getElementById('print-root');
  if (root) root.remove();
  root = document.createElement('div');
  root.id = 'print-root';
  root.innerHTML = html;
  document.body.appendChild(root);
  document.body.classList.add('printing-labels');
  // Gỡ sau khi in xong (afterprint). Vùng in luôn ẩn trên màn hình nên còn sót cũng không sao; lần in sau dựng lại.
  const done = () => { document.body.classList.remove('printing-labels'); const r = document.getElementById('print-root'); if (r) r.remove(); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  await new Promise((r) => setTimeout(r, 50));
  window.print();
}

export async function renderLabels(view, ctx) {
  const { shell, query } = ctx;
  shell.setScreen({ title: 'lbl.title', back: '/' });
  if (!isSecretary() && roleLevel() < 2) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('err.forbidden')}</p></div>`; return; }
  if (ctx.entered) { st.picked = new Set(); st.q = ''; st.dept = ''; st.start = 1; st.qItem = ''; }
  const all = (await items()).filter((x) => x.status === 'ISSUED' && x.qr_key);
  // Mở từ chi tiết biểu (?item=): chọn sẵn biểu đó (một lần cho mỗi lần mở, bỏ chọn rồi thì thôi)
  if (query && query.item && query.item !== st.qItem && all.some((x) => x.item_id === query.item)) { st.picked.add(String(query.item)); st.qItem = String(query.item); }
  try { await loadQr(); } catch (e) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('lbl.load_fail')}</p></div>`; return; }
  const deps = (await depts()).filter((d) => all.some((x) => x.dept_code === d.dept_code));
  const z = () => SIZES[st.size];
  const filtered = () => {
    const q = foldVi(st.q.trim());
    return all.filter((x) => (!st.dept || x.dept_code === st.dept) && (!q || itemHay(x).includes(q)));
  };
  const picked = () => all.filter((x) => st.picked.has(x.item_id));
  const listHtml = () => {
    const f = filtered();
    if (!all.length) return `<p class="muted small">${bi('lbl.none_issued')}</p>`;
    return `<div class="row"><label class="pick-chk"><input type="checkbox" id="lb-all"${f.length && f.every((x) => st.picked.has(x.item_id)) ? ' checked' : ''}><span>${bi('lbl.pick_all', { N: f.length })}</span></label></div>
      <ul class="lbl-pick">${f.slice(0, 400).map((x) => `<li><label class="pick-chk"><input type="checkbox" data-pick="${esc(x.item_id)}"${st.picked.has(x.item_id) ? ' checked' : ''}><span><span class="code">${esc(x.code)}</span> · ${bi('ver.rev_n', { N: esc(curRevOf(x)) })} · ${esc(nameText(x))}</span></label></li>`).join('')}</ul>`;
  };
  const sumHtml = () => {
    const n = picked().length * st.copies;
    const per = z().cols * z().rows;
    const pages = n ? Math.ceil((n + st.start - 1) / per) : 0;
    return bi('lbl.summary', { N: picked().length, T: n, P: pages });
  };
  const draw = async () => {
    const per = z().cols * z().rows;
    if (st.start > per) st.start = 1;
    const p = picked();
    setViewHtml(view, `<div class="labels rp-web">
      <div class="rp-left">
        <section class="card"><h2>${bi('lbl.pick')}</h2>
          <div class="row lbl-filter"><label class="fld inline"><span>${bi('cat.dept')}</span><select class="inp sel" id="lb-dept"><option value="">${bi('cat.all')}</option>${deps.map((d) => `<option value="${esc(d.dept_code)}"${d.dept_code === st.dept ? ' selected' : ''}>${esc(d.dept_code + ' · ' + nameText(d))}</option>`).join('')}</select></label>
            <input class="inp search" type="search" id="lb-q" value="${esc(st.q)}" placeholder="${esc(biText('lbl.search'))}" autocomplete="off"></div>
          <div id="lb-list">${listHtml()}</div></section>
        <section class="card"><h2>${bi('lbl.options')}</h2>
          <div class="chips" role="radiogroup">${Object.keys(SIZES).map((k) => `<button type="button" class="chip${k === st.size ? ' on' : ''}" data-size="${k}" role="radio" aria-checked="${k === st.size}">${bi('lbl.size.' + k)}</button>`).join('')}</div>
          <div class="form-grid">
            <label class="fld"><span>${bi('lbl.copies')}</span><select class="inp sel" id="lb-copies">${Array.from({ length: per }, (_, i) => i + 1).map((n) => `<option${n === st.copies ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="fld"><span>${bi('lbl.start')}</span><select class="inp sel" id="lb-start">${Array.from({ length: per }, (_, i) => i + 1).map((n) => `<option${n === st.start ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
          </div>
          <p class="small" id="lb-sum">${sumHtml()}</p>
          <div class="row"><button type="button" class="btn primary" id="lb-print" ${p.length ? '' : 'disabled'}>${ICON.print}<span>${bi('lbl.print')}</span></button>
            <button type="button" class="btn" id="lb-png" ${p.length === 1 ? '' : 'disabled'}>${ICON.download}<span>${bi('lbl.png')}</span></button></div>
          <p class="muted small">${bi('lbl.print_note')}</p>
          ${p.length > 1 ? `<p class="muted small">${bi('lbl.png_one')}</p>` : ''}</section>
      </div>
      <div class="rp-right"><section class="card"><h2>${bi('lbl.preview')}</h2><div class="lbl-preview" id="lb-prev">${p.length ? '' : `<p class="muted small">${bi('lbl.preview_hint')}</p>`}</div></section></div>
    </div>`);
    if (p.length) {
      // Xem trước tờ đầu (thu nhỏ)
      const pages = await sheetPages(p.slice(0, Math.ceil(per / st.copies) + 1), { size: st.size, copies: st.copies, start: st.start });
      const box = $('#lb-prev', view);
      if (box) box.innerHTML = `<div class="lbl-scale">${pages[0] || ''}</div>`;
    }
    wire();
  };
  const redrawList = () => { const b = $('#lb-list', view); if (b) { b.innerHTML = listHtml(); wireList(); } };
  const wireList = () => {
    $$('[data-pick]', view).forEach((c) => c.addEventListener('change', () => { if (c.checked) st.picked.add(c.dataset.pick); else st.picked.delete(c.dataset.pick); draw(); }));
    const a = $('#lb-all', view);
    if (a) a.addEventListener('change', () => { filtered().forEach((x) => { if (a.checked) st.picked.add(x.item_id); else st.picked.delete(x.item_id); }); draw(); });
  };
  const wire = () => {
    wireList();
    $('#lb-dept', view).addEventListener('change', (e) => { st.dept = e.target.value; redrawList(); });
    wireSearch(view, '#lb-q', (t) => { st.q = t; }, async () => redrawList());
    $$('[data-size]', view).forEach((b) => b.addEventListener('click', () => { st.size = b.dataset.size; st.copies = Math.min(st.copies, SIZES[st.size].cols * SIZES[st.size].rows); draw(); }));
    $('#lb-copies', view).addEventListener('change', (e) => { st.copies = Number(e.target.value); draw(); });
    $('#lb-start', view).addEventListener('change', (e) => { st.start = Number(e.target.value); draw(); });
    $('#lb-print', view).addEventListener('click', async (ev) => {
      const btn = ev.currentTarget;
      busy(btn, true);
      try { await printSheets((await sheetPages(picked(), { size: st.size, copies: st.copies, start: st.start })).join('')); } finally { busy(btn, false); }
    });
    $('#lb-png', view).addEventListener('click', async (ev) => {
      const it = picked()[0];
      if (!it) return;
      const btn = ev.currentTarget;
      busy(btn, true);
      try {
        const rev = curRevOf(it);
        const file = await qrPngFile(itemQrUrl(it, rev), [it.code, biText('lbl.rev', { N: rev })], `QR_${String(it.code).replace(/[\/\\:*?"<>|\s]+/g, '-')}_lan${rev}.png`);
        await openFile(file);
      } catch (e) { toast(esc(String(e && e.message || e)), 'err'); } finally { busy(btn, false); }
    });
  };
  await draw();
}
