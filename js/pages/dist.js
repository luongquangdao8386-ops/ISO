// Sổ phân phối & thu hồi bản in (Đợt 2, phiên 2d — thay BM-ISO-02-03).
// /dist: sổ theo tình trạng (Cần thu hồi · Đang dùng · Đã thu hồi · Tất cả), lọc nơi nhận, theo tài liệu (?item=); Thư ký ISO chọn các
// dòng cần thu hồi → Thu hồi (PIN), có thể phát luôn bản lần đang hiệu lực cho đúng các nơi đó; bấm dòng → sửa / bỏ dòng ghi nhầm / thu hồi.
// /dist/new/:item: phát bản in của lần đang hiệu lực cho một hay nhiều nơi nhận (bộ phận, người / vị trí, số bản).
// Ban hành lần mới (hoặc đặt ✕): bản của lần cũ thành "Cần thu hồi" (tính trên máy theo lần ban hành, như máy chủ).
import { bi, biText, esc, fmtDate, nameText, uuid } from '../core.js';
import { ICON, toast, dialog, $, $$ } from '../ui.js';
import { byId, recs, items, depts, users, userName, isSecretary, roleLevel, curRevOf, distState, distOverdue, distDueSince, docControlOn, can, today } from '../data.js';
import { navigate, refresh } from '../router.js';
import { afterCommit } from '../app.js';
import { textInput, dateInput, wireForm, readField, showErrors, writeOnline, writeWithPin, writeFail, busy } from '../form.js';
import { isWide } from '../shell.js';

const TABS = ['DUE', 'ACTIVE', 'RECALLED', 'ALL'];
const st = { tab: '', dept: '', item: '' };
const sel = new Set();

const stBadge = (s, over) => `<span class="badge ${s === 'DUE' ? (over ? 't-red' : 't-amber') : s === 'ACTIVE' ? 't-green' : 't-grey'}">${bi('dist.state.' + s)}${s === 'DUE' && over ? ' !' : ''}</span>`;

function guard(view) {
  if (!isSecretary() && roleLevel() < 2) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('err.forbidden')}</p></div>`; return true; }
  return false;
}

/* ====================== Sổ (/dist) ====================== */

export async function renderDist(view, ctx) {
  const { shell, query } = ctx;
  shell.setScreen({ title: 'nav.dist', back: '/' });
  if (!(await docControlOn())) { view.innerHTML = `<div class="card empty-state">${ICON.archive}<p class="muted">${bi('dr.server_old')}</p></div>`; return; }
  if (guard(view)) return;
  if (ctx.entered) { st.tab = ''; st.dept = ''; st.item = ''; sel.clear(); }
  if (query && TABS.includes(query.f)) st.tab = query.f;
  if (query && query.item !== undefined) st.item = String(query.item);
  const sec = isSecretary();
  const itMap = new Map((await items()).map((x) => [x.item_id, x]));
  const deps = await depts();
  const um = await users();
  const t = today();
  const all = (await recs('DIST')).filter((d) => d.state !== 'VOID' && !d.archived_at && itMap.has(d.item_id))
    .map((d) => { const it = itMap.get(d.item_id); return { d, it, s: distState(d, it), over: distOverdue(d, it, t) }; });
  const scoped = all.filter((x) => (!st.dept || x.d.dept_code === st.dept) && (!st.item || x.d.item_id === st.item));
  const count = (k) => scoped.filter((x) => k === 'ALL' || x.s === k).length;
  if (!TABS.includes(st.tab)) st.tab = count('DUE') ? 'DUE' : 'ACTIVE';
  const shown = scoped.filter((x) => st.tab === 'ALL' || x.s === st.tab)
    .sort((a, b) => (Number(a.it.sort_order) || 0) - (Number(b.it.sort_order) || 0) || String(a.it.code).localeCompare(String(b.it.code)) || String(b.d.dist_date).localeCompare(String(a.d.dist_date)));
  for (const id of [...sel]) if (!shown.some((x) => x.d.dist_id === id && x.d.state === 'ACTIVE')) sel.delete(id);
  const fIt = st.item ? itMap.get(st.item) : null;
  const pick = sec && (st.tab === 'DUE' || st.tab === 'ACTIVE');
  const wide = isWide();
  const rowHtml = (x) => {
    const { d, it, s, over } = x;
    const chk = pick ? `<input type="checkbox" class="dist-chk" data-id="${esc(d.dist_id)}"${sel.has(d.dist_id) ? ' checked' : ''} aria-label="${esc(biText('dist.select'))}">` : '';
    const due = s === 'DUE' ? `<span class="small ${over ? 't-red-text' : 't-amber-text'}">${bi(it.status === 'NA' ? 'dist.due_na' : 'dist.due_rev', { N: esc(curRevOf(it)), D: esc(fmtDate(distDueSince(it))) })}</span>` : '';
    if (wide) {
      return `<tr data-id="${esc(d.dist_id)}">${pick ? `<td>${chk}</td>` : ''}<td class="code"><a href="#/item/${encodeURIComponent(it.item_id)}">${esc(it.code)}</a></td><td>${esc(nameText(it))}</td>
        <td class="mid">${esc(d.rev)}</td><td>${esc(d.dept_code)}</td><td>${esc(d.holder || '')}</td><td class="num">${esc(String(d.copies || 1))}</td><td class="mid">${esc(fmtDate(d.dist_date))}</td>
        <td>${stBadge(s, over)}${due ? '<br>' + due : ''}${d.state === 'RECALLED' ? `<br><span class="muted small">${esc(fmtDate(d.recalled_date))} · ${esc(userName(um, d.recalled_by))}</span>` : ''}</td>
        <td><button type="button" class="btn tiny" data-open="${esc(d.dist_id)}">${ICON.more}</button></td></tr>`;
    }
    return `<li class="dist-row card${s === 'DUE' ? ' due' : ''}">${chk}<button type="button" class="dist-main" data-open="${esc(d.dist_id)}">
      <span class="cat-top"><span class="code">${esc(it.code)} · ${bi('ver.rev_n', { N: esc(d.rev) })}</span>${stBadge(s, over)}</span>
      <span class="cat-name">${esc(nameText(it))}</span>
      <span class="cat-meta">${esc(d.dept_code)} · ${esc(d.holder || '')} · ${bi('dist.copies_n', { N: d.copies || 1 })} · ${esc(fmtDate(d.dist_date))}</span>${due ? `<span class="cat-meta">${due}</span>` : ''}</button></li>`;
  };
  const deptOpts = deps.filter((d) => all.some((x) => x.d.dept_code === d.dept_code));
  view.innerHTML = `<div class="dist">
    ${fIt ? `<p class="banner info small">${bi('dist.filter_item', { C: esc(fIt.code) })} <a href="#/dist" id="dist-all">${bi('dist.show_all')}</a>${sec && fIt.status === 'ISSUED' ? ` · <a href="#/dist/new/${encodeURIComponent(fIt.item_id)}">${bi('dist.issue_btn')}</a>` : ''}</p>` : ''}
    <div class="row list-head">
      <label class="fld inline"><span>${bi('dist.recipient')}</span><select class="inp sel" id="dist-dept"><option value="">${bi('cat.all')}</option>${deptOpts.map((d) => `<option value="${esc(d.dept_code)}"${d.dept_code === st.dept ? ' selected' : ''}>${esc(d.dept_code + ' · ' + nameText(d))}</option>`).join('')}</select></label>
      ${await can('report.run') ? `<a class="btn" href="#/reports?kind=DIST${st.dept ? '&dept=' + encodeURIComponent(st.dept) : ''}">${ICON.reports}<span>${bi('dist.report')}</span></a>` : ''}
    </div>
    <div class="chips tabs">${TABS.map((k) => `<button type="button" class="chip${k === st.tab ? ' on' : ''}" data-tab="${k}">${bi(k === 'ALL' ? 'dist.tab_all' : 'dist.state.' + k)} <b>${count(k)}</b></button>`).join('')}</div>
    ${pick && shown.length ? `<div class="row dist-bulk"><label class="pick-chk"><input type="checkbox" id="dist-allchk"${shown.length && shown.every((x) => sel.has(x.d.dist_id)) ? ' checked' : ''}><span>${bi('dist.select_all')}</span></label>
      <button type="button" class="btn primary" id="dist-recall" ${sel.size ? '' : 'disabled'}>${ICON.archive}<span>${bi('dist.recall_n', { N: sel.size })}</span></button></div>` : ''}
    ${shown.length ? (wide ? `<div class="table-wrap"><table class="tbl dist-tbl"><thead><tr>${pick ? '<th></th>' : ''}<th>${bi('cat.code')}</th><th>${bi('cat.name')}</th><th class="mid">${bi('cat.rev')}</th><th>${bi('dist.recipient')}</th><th>${bi('dist.holder')}</th><th class="num">${bi('dist.copies')}</th><th class="mid">${bi('dist.date')}</th><th>${bi('cat.status')}</th><th></th></tr></thead><tbody>${shown.map(rowHtml).join('')}</tbody></table></div>`
      : `<ul class="dist-list">${shown.map(rowHtml).join('')}</ul>`)
      : `<div class="card empty-state">${ICON.archive}<p class="muted">${bi(st.tab === 'DUE' ? 'dist.none_due' : 'dist.none')}</p></div>`}
    <p class="muted small">${bi(sec ? 'dist.how_sec' : 'dist.how')}</p>
  </div>`;
  const again = () => renderDist(view, { ...ctx, entered: false, query: {} });
  $$('[data-tab]', view).forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.tab; sel.clear(); again(); }));
  const dsel = $('#dist-dept', view);
  if (dsel) dsel.addEventListener('change', () => { st.dept = dsel.value; sel.clear(); again(); });
  const allLink = $('#dist-all', view);
  if (allLink) allLink.addEventListener('click', (e) => { e.preventDefault(); st.item = ''; navigate('/dist', { replace: true }); });
  $$('.dist-chk', view).forEach((c) => c.addEventListener('change', () => { if (c.checked) sel.add(c.dataset.id); else sel.delete(c.dataset.id); again(); }));
  const ac = $('#dist-allchk', view);
  if (ac) ac.addEventListener('change', () => { shown.forEach((x) => { if (ac.checked) sel.add(x.d.dist_id); else sel.delete(x.d.dist_id); }); again(); });
  const rb = $('#dist-recall', view);
  if (rb) rb.addEventListener('click', async () => {
    const list = shown.filter((x) => sel.has(x.d.dist_id));
    if (await recallDialog(list)) { sel.clear(); await afterCommit(); refresh(); }
  });
  $$('[data-open]', view).forEach((b) => b.addEventListener('click', async () => {
    const x = all.find((y) => y.d.dist_id === b.dataset.open);
    if (x && await rowDialog(x, um)) { await afterCommit(); refresh(); }
  }));
}

/** Hộp thoại thu hồi các dòng đã chọn: ngày thu hồi, ghi chú, phát bản lần đang hiệu lực cho cùng nơi nhận. Trả true khi đã ghi */
async function recallDialog(list) {
  if (!list.length) return false;
  if (!navigator.onLine) { toast(bi('sync.need_network'), 'err'); return false; }
  const canRe = list.some((x) => x.it.status === 'ISSUED');
  const anyCur = list.some((x) => x.s === 'ACTIVE');
  const t = today();
  const v = await dialog({
    title: bi('dist.recall_title', { N: list.length }),
    body: `<ul class="small dist-dlg-list">${list.slice(0, 12).map((x) => `<li><span class="code">${esc(x.it.code)}</span> · ${bi('ver.rev_n', { N: esc(x.d.rev) })} · ${esc(x.d.dept_code)} · ${esc(x.d.holder || '')} (${x.d.copies || 1})</li>`).join('')}${list.length > 12 ? `<li>… +${list.length - 12}</li>` : ''}</ul>
      <label class="fld"><span>${bi('dist.recalled_date')}</span><input class="inp" type="date" id="rc-date" value="${esc(t)}" max="${esc(t)}"></label>
      <label class="fld"><span>${bi('dist.recall_note')}${anyCur ? ' <span class="req">*</span>' : ''}</span><input class="inp" type="text" id="rc-note" maxlength="300" placeholder="${esc(biText('dist.recall_note_ph'))}"></label>
      ${canRe ? `<label class="fld chk"><input type="checkbox" id="rc-re" checked><span>${bi('dist.reissue')}</span></label>` : ''}
      ${anyCur ? `<p class="muted small">${bi('dist.recall_current_note')}</p>` : ''}`,
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('dist.recall_btn'), kind: 'primary', read: (w) => ({ date: $('#rc-date', w).value, note: $('#rc-note', w).value.trim(), re: !!($('#rc-re', w) && $('#rc-re', w).checked) }) }]
  });
  if (!v) return false;
  const ids = list.map((x) => x.d.dist_id);
  const p = { dist_ids: ids, recalled_date: v.date || t, note: v.note, reissue: v.re };
  if (v.re) { p.new_ids = {}; ids.forEach((id) => { p.new_ids[id] = uuid(); }); }
  const r = await writeWithPin('dist.recall', p);
  if (!r.ok) { writeFail(r); return false; }
  toast(bi(r.data && r.data.reissued ? 'dist.recalled_re_ok' : 'dist.recalled_ok', { N: (r.data && r.data.recalled) || ids.length, M: (r.data && r.data.reissued) || 0 }), 'ok');
  return true;
}

/** Hộp thoại một dòng: chi tiết; Thư ký ISO: sửa (ghi nhầm), bỏ dòng, thu hồi. Trả true khi đã ghi */
async function rowDialog(x, um) {
  const { d, it, s, over } = x;
  const sec = isSecretary();
  const body = `<div class="kv"><span>${bi('cat.code')}</span><strong><a href="#/item/${encodeURIComponent(it.item_id)}" class="code">${esc(it.code)}</a></strong></div>
    <div class="kv"><span>${bi('cat.name')}</span><strong>${esc(nameText(it))}</strong></div>
    <div class="kv"><span>${bi('cat.rev')}</span><strong>${esc(d.rev)}${curRevOf(it) && s === 'DUE' ? ` → ${esc(curRevOf(it))}` : ''}</strong></div>
    <div class="kv"><span>${bi('dist.recipient')}</span><strong>${esc(d.dept_code)} · ${esc(d.holder || '')}</strong></div>
    <div class="kv"><span>${bi('dist.copies')}</span><strong>${esc(String(d.copies || 1))}</strong></div>
    <div class="kv"><span>${bi('dist.date')}</span><strong>${esc(fmtDate(d.dist_date))} · ${esc(userName(um, d.created_by))}</strong></div>
    ${d.note ? `<div class="kv"><span>${bi('item.note')}</span><strong>${esc(d.note)}</strong></div>` : ''}
    <div class="kv"><span>${bi('cat.status')}</span><strong>${stBadge(s, over)}</strong></div>
    ${d.state === 'RECALLED' ? `<div class="kv"><span>${bi('dist.recalled_date')}</span><strong>${esc(fmtDate(d.recalled_date))} · ${esc(userName(um, d.recalled_by))}${d.recall_note ? '<br>' + esc(d.recall_note) : ''}</strong></div>` : ''}`;
  const acts = [{ label: bi('btn.close'), value: null }];
  if (sec && d.state === 'ACTIVE') {
    acts.push({ label: bi('dist.edit'), value: 'edit' });
    acts.push({ label: bi('dist.recall_btn'), kind: 'primary', value: 'recall' });
  }
  const a = await dialog({ title: bi('dist.row_title'), body, actions: acts });
  if (a === 'recall') return recallDialog([x]);
  if (a !== 'edit') return false;
  if (!navigator.onLine) { toast(bi('sync.need_network'), 'err'); return false; }
  const deps = (await depts()).filter((q) => q.active !== false);
  const v = await dialog({
    title: bi('dist.edit'),
    body: `<label class="fld"><span>${bi('dist.recipient')}</span><select class="inp sel" id="de-dept">${deps.map((q) => `<option value="${esc(q.dept_code)}"${q.dept_code === d.dept_code ? ' selected' : ''}>${esc(q.dept_code + ' · ' + nameText(q))}</option>`).join('')}</select></label>
      <label class="fld"><span>${bi('dist.holder')}</span><input class="inp" type="text" id="de-holder" maxlength="120" value="${esc(d.holder || '')}"></label>
      <label class="fld"><span>${bi('dist.copies')}</span><select class="inp sel" id="de-copies">${Array.from({ length: 20 }, (_, i) => i + 1).map((n) => `<option${n === Number(d.copies) ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="fld"><span>${bi('item.note')}</span><input class="inp" type="text" id="de-note" maxlength="300" value="${esc(d.note || '')}"></label>
      <hr><label class="fld chk"><input type="checkbox" id="de-void"><span>${bi('dist.void')}</span></label>`,
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('btn.save'), kind: 'primary', read: (w) => ({ dept: $('#de-dept', w).value, holder: $('#de-holder', w).value.trim(), copies: Number($('#de-copies', w).value), note: $('#de-note', w).value.trim(), void: $('#de-void', w).checked }) }]
  });
  if (!v) return false;
  let p = { dist_id: d.dist_id, dept_code: v.dept, holder: v.holder, copies: v.copies, note: v.note };
  if (v.void) {
    const reason = await dialog({ title: bi('dist.void'), body: `<label class="fld"><span>${bi('field.reason')} <span class="req">*</span></span><input class="inp" type="text" id="dv-r" maxlength="300"></label>`,
      actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('btn.confirm'), kind: 'danger', read: (w) => $('#dv-r', w).value.trim() }] });
    if (!reason) { if (reason === '') toast(bi('field.required'), 'err'); return false; }
    p = { dist_id: d.dist_id, void: true, reason };
  }
  const r = await writeOnline('dist.edit', p, { expected_version: d.record_version });
  if (!r.ok) { writeFail(r); return false; }
  toast(bi(v.void ? 'dist.voided_ok' : 'form.saved'), 'ok');
  return true;
}

/* ====================== Phát bản in (/dist/new/:item) ====================== */

export async function renderDistNew(view, { shell, params }) {
  const it = await byId('ITEM', params.item);
  const back = it ? '/item/' + encodeURIComponent(it.item_id) : '/dist';
  shell.setScreen({ title: 'dist.issue_btn', back });
  if (!it) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('item.not_found')}</p></div>`; return; }
  if (!isSecretary() || !(await can('dist.issue'))) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('err.forbidden')}</p></div>`; return; }
  if (it.status !== 'ISSUED') { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('dist.not_issued')}</p></div>`; return; }
  if (!navigator.onLine) { view.innerHTML = `<div class="card empty-state">${ICON.sync}<p class="muted">${bi('sync.need_network')}</p></div>`; return; }
  const deps = (await depts()).filter((d) => d.active !== false);
  const cur = (await recs('DIST')).filter((d) => d.item_id === it.item_id && d.state === 'ACTIVE');
  const rev = curRevOf(it);
  let n = 1;
  const rowHtml = (i) => `<div class="dist-in" data-i="${i}">
    <label class="fld" data-field="rows.${i}.dept_code"><span>${bi('dist.recipient')} <span class="req">*</span></span><select class="inp sel" name="dept"><option value="">${bi('field.choose')}</option>${deps.map((d) => `<option value="${esc(d.dept_code)}"${d.dept_code === it.dept_code && i === 0 ? ' selected' : ''}>${esc(d.dept_code + ' · ' + nameText(d))}</option>`).join('')}</select><div class="ferr"></div></label>
    <label class="fld" data-field="rows.${i}.holder"><span>${bi('dist.holder')}</span><input class="inp" type="text" name="holder" maxlength="120" placeholder="${esc(biText('dist.holder_ph'))}" autocomplete="off"><div class="ferr"></div></label>
    <label class="fld num" data-field="rows.${i}.copies"><span>${bi('dist.copies')}</span><select class="inp sel" name="copies">${Array.from({ length: 20 }, (_, k) => k + 1).map((c) => `<option>${c}</option>`).join('')}</select><div class="ferr"></div></label>
    ${i ? `<button type="button" class="icon-btn dist-del" aria-label="${esc(biText('btn.delete'))}">${ICON.trash}</button>` : ''}</div>`;
  view.innerHTML = `<form class="card form dist-form" novalidate>
    <div class="rec-top"><span class="code big">${esc(it.code)}</span><strong>${bi('ver.rev_n', { N: esc(rev) })}</strong></div>
    <p class="item-name">${esc(nameText(it))}</p>
    ${cur.length ? `<p class="banner info small">${bi('dist.existing_n', { N: cur.length })} <a href="#/dist?item=${encodeURIComponent(it.item_id)}&f=ALL">${bi('dist.view_book')}</a></p>` : ''}
    ${it.file_missing ? `<p class="banner warn small">${bi('dist.no_file_note')}</p>` : ''}
    <div id="dist-rows">${rowHtml(0)}</div>
    <button type="button" class="btn small" id="dist-add">${ICON.plus}<span>${bi('dist.add_row')}</span></button>
    <div class="form-grid">${dateInput('dist_date', 'dist.date', today())}${textInput('note', 'item.note', '', { maxlength: 300 })}</div>
    <p class="form-err err"></p>
    <div class="row"><a class="btn" href="#${back}">${bi('btn.cancel')}</a><button type="submit" class="btn primary" id="dist-save">${ICON.check}<span>${bi('dist.save')}</span></button></div>
    <p class="muted small">${bi('dist.issue_note')}</p>
  </form>`;
  const form = $('form', view);
  wireForm(form);
  const box = $('#dist-rows', form);
  $('#dist-add', form).addEventListener('click', () => {
    if (box.children.length >= 30) return;
    box.insertAdjacentHTML('beforeend', rowHtml(n++));
  });
  box.addEventListener('click', (e) => { const b = e.target.closest('.dist-del'); if (b) b.closest('.dist-in').remove(); });
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const rows = [...box.querySelectorAll('.dist-in')].map((el) => ({ dist_id: uuid(), dept_code: el.querySelector('[name=dept]').value, holder: el.querySelector('[name=holder]').value.trim(), copies: Number(el.querySelector('[name=copies]').value) }));
    // Đánh lại chỉ số trường lỗi theo thứ tự dòng đang hiện
    [...box.querySelectorAll('.dist-in')].forEach((el, i) => el.querySelectorAll('[data-field]').forEach((f) => { f.dataset.field = f.dataset.field.replace(/^rows\.\d+\./, 'rows.' + i + '.'); }));
    const errs = [];
    rows.forEach((r, i) => { if (!r.dept_code) errs.push({ field: 'rows.' + i + '.dept_code', key: 'field.required' }); });
    const date = readField(form, 'dist_date');
    if (date === null) errs.push({ field: 'dist_date', key: 'field.invalid_date' });
    if (errs.length) { showErrors(form, errs); return; }
    const btn = $('#dist-save', form);
    busy(btn, true);
    const r = await writeOnline('dist.issue', { item_id: it.item_id, dist_date: date || today(), note: readField(form, 'note') || '', rows });
    busy(btn, false);
    if (r.ok) { await afterCommit(); toast(bi('dist.issued_ok', { N: rows.length }), 'ok'); navigate('/dist?item=' + encodeURIComponent(it.item_id) + '&f=ACTIVE', { replace: true }); return; }
    if (r.code === 'VALIDATION_ERROR') { showErrors(form, r.errors); return; }
    writeFail(r);
  });
}

/* ====================== Thẻ ở chi tiết tài liệu ====================== */

/** Bản in đang phát của tài liệu: số nơi / bản đang dùng, cần thu hồi; nút Phát bản in (Thư ký ISO), Sổ phân phối */
export async function itemDistCard(it) {
  if (!(await docControlOn()) || (!isSecretary() && roleLevel() < 2)) return '';
  const t = today();
  const list = (await recs('DIST')).filter((d) => d.item_id === it.item_id && d.state === 'ACTIVE');
  const due = list.filter((d) => distState(d, it) === 'DUE');
  const over = due.filter((d) => distOverdue(d, it, t));
  const cur = list.filter((d) => distState(d, it) === 'ACTIVE');
  const copies = cur.reduce((s, d) => s + (Number(d.copies) || 1), 0);
  const sec = isSecretary();
  if (!list.length && !(sec && it.status === 'ISSUED')) return '';
  return `<section class="card dist-card"><h3>${bi('dist.card_title')}</h3>
    ${cur.length ? `<p class="small">${bi('dist.card_cur', { N: cur.length, C: copies, R: esc(curRevOf(it)) })}: ${cur.slice(0, 6).map((d) => esc(d.dept_code + (d.holder ? ' · ' + d.holder : ''))).join('; ')}${cur.length > 6 ? '…' : ''}</p>` : `<p class="muted small">${bi('dist.card_none')}</p>`}
    ${due.length ? `<p class="banner ${over.length ? 'err' : 'warn'} small">${bi('dist.card_due', { N: due.length })}</p>` : ''}
    <div class="row">${sec && it.status === 'ISSUED' ? `<a class="btn small${due.length ? '' : ' primary'}" href="#/dist/new/${encodeURIComponent(it.item_id)}">${ICON.plus}<span>${bi('dist.issue_btn')}</span></a>` : ''}
      <a class="btn small${due.length ? ' primary' : ''}" href="#/dist?item=${encodeURIComponent(it.item_id)}${due.length ? '&f=DUE' : '&f=ALL'}">${ICON.archive}<span>${bi('dist.view_book')}</span></a></div>
  </section>`;
}
