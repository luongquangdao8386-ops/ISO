// Phiên bản & ban hành (phiên 1b): danh sách đang xử lý, soạn phiên bản mới, xem / sửa nháp, gửi duyệt, duyệt, trả lại, ban hành, hủy.
// Quyền phía app chỉ để ẩn/hiện nút (data.js); máy chủ kiểm lại và trả FORBIDDEN trước khi hỏi PIN.
import { bi, biText, esc, fmtDate, fmtDateTime, badge, nameText, uuid, session } from '../core.js';
import { ICON, toast, dialog, $ } from '../ui.js';
import { byId, recs, items, users, userName, isSecretary, today, canCreateVersion, versionEditable, canApprove, canReturnVersion, canCancelVersion, VERSION_OPEN, can } from '../data.js';
import { navigate, refresh } from '../router.js';
import { afterCommit } from '../app.js';
import { bilingualInputs, dateInput, wireForm, readField, showErrors, writeOnline, writeWithPin, writeFail, busy, assistedFields } from '../form.js';
import { docButton, wireDocButtons, uploadVersionFile, checkFile, KIND_ACCEPT, fmtSize } from '../files.js';
import { pendingFor } from '../pending.js';
import { statusDot } from './catalog.js';

const pair = (vi, zh) => (vi || zh ? `${vi ? `<span class="vi">${esc(vi)}</span>` : ''}${vi && zh ? '<br>' : ''}${zh ? `<span class="zh muted">${esc(zh)}</span>` : ''}` : '');
const kv = (labelKey, value) => (value ? `<div class="kv"><span>${bi(labelKey)}</span><strong>${value}</strong></div>` : '');
const needNet = (view) => {
  if (navigator.onLine) return false;
  view.innerHTML = `<div class="card empty-state">${ICON.sync}<p class="muted">${bi('sync.need_network')}</p></div>`;
  return true;
};

/** Tóm tắt thay đổi hai dòng Việt / Trung, bên dịch máy có nhãn "dịch máy · 机器翻译" */
function summaryHtml(v) {
  const m = v.i18n_meta && v.i18n_meta.change_summary;
  const tag = (lang) => (m && m.state === 'MACHINE' && m.src !== lang ? ` <span class="tag mt">${bi('tag.machine_translated')}</span>` : '');
  const vi = v.change_summary_vi ? `<span class="vi">${esc(v.change_summary_vi)}</span>${tag('vi')}` : '';
  const zh = v.change_summary_zh ? `<span class="zh muted">${esc(v.change_summary_zh)}</span>${tag('zh')}` : '';
  return vi && zh ? vi + '<br>' + zh : vi || zh;
}

/** Huy hiệu trạng thái phiên bản (+ "gắn tệp" với bản ATTACH) */
export function vBadge(v) {
  return badge('vstate.' + v.state) + (v.vtype === 'ATTACH' ? ' ' + badge('vtype.ATTACH') : '');
}

/** Một dòng phiên bản trong danh sách */
export function versionRow(v, it, { showItem = false, um = null } = {}) {
  const when = v.state === 'ISSUED' || v.state === 'SUPERSEDED' ? fmtDate(v.issued_at) : fmtDateTime(v.updated_at);
  return `<li><a class="cat-row ver-row" href="#/version/${encodeURIComponent(v.version_id)}">
    <span class="cat-top"><span class="code">${showItem && it ? esc(it.code) + ' · ' : ''}${bi('ver.rev_n', { N: esc(v.rev) })}</span>${vBadge(v)}</span>
    ${showItem && it ? `<span class="cat-name">${esc(nameText(it))}</span>` : ''}
    <span class="cat-meta">${esc(v.change_summary_vi || v.change_summary_zh || '')}</span>
    <span class="cat-meta muted">${esc(when || '')}${um && v.author_id ? ' · ' + esc(userName(um, v.author_id)) : ''}${v.state === 'DRAFT' && v.returned_at ? ` · <span class="t-red-text">${bi('ver.returned')}</span>` : ''}</span>
    ${ICON.chevron}</a></li>`;
}

/** Hộp thoại nhập lý do / ghi chú; trả chuỗi (đã cắt) hoặc null khi bỏ */
async function askText(titleKey, labelKey, { required = false, note = '' } = {}) {
  for (;;) {
    const v = await dialog({
      title: bi(titleKey),
      body: `${note ? `<p class="muted small">${note}</p>` : ''}<label class="fld"><span>${bi(labelKey)}${required ? ' <span class="req">*</span>' : ''}</span><textarea class="inp" rows="3" maxlength="500" id="dlg-text"></textarea></label>`,
      actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('btn.confirm'), kind: 'primary', read: (w) => $('#dlg-text', w).value.trim() }]
    });
    if (v === null || v === undefined) return null;
    if (required && !v) { toast(bi('field.required'), 'err'); continue; }
    return v;
  }
}

async function confirmBox(titleKey, bodyHtml, okKey, kind = 'primary') {
  return dialog({ title: bi(titleKey), body: bodyHtml, actions: [{ label: bi('btn.cancel'), value: false }, { label: bi(okKey), kind, value: true }] });
}

/* ====================== Danh sách phiên bản đang xử lý (/versions) ====================== */

const TABS = ['review', 'issue', 'returned', 'drafts', 'open'];
let curTab = '';

export async function renderVersions(view, { shell, query }) {
  shell.setScreen({ title: 'nav.versions', back: '/' });
  const p = await pendingFor();
  const list = await items();
  const itMap = new Map(list.map((x) => [x.item_id, x]));
  const open = (await recs('VERSION')).filter((v) => VERSION_OPEN.has(v.state) && itMap.has(v.item_id));
  const by = { review: p.review, issue: p.issue, returned: p.returned, drafts: p.drafts, open };
  if (query && TABS.includes(query.f)) curTab = query.f;
  if (!TABS.includes(curTab)) curTab = TABS.find((t) => by[t].length) || 'open';
  const um = await users();
  const shown = by[curTab].slice().sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  view.innerHTML = `<div class="chips tabs">${TABS.filter((t) => t === 'open' || t === curTab || by[t].length || (t === 'issue' && isSecretary())).map((t) => `<button type="button" class="chip${t === curTab ? ' on' : ''}" data-tab="${t}">${bi('ver.tab.' + t)} <b>${by[t].length}</b></button>`).join('')}</div>
    ${shown.length ? `<ul class="cat-list">${shown.map((v) => versionRow(v, itMap.get(v.item_id), { showItem: true, um })).join('')}</ul>`
      : `<div class="card empty-state">${ICON.check}<p class="muted">${bi('ver.none')}</p><a class="btn" href="#/catalog">${ICON.library}<span>${bi('nav.catalog')}</span></a></div>`}
    <p class="muted small">${bi('ver.how')}</p>`;
  view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { curTab = b.dataset.tab; renderVersions(view, { shell, query: {} }); }));
}

/* ====================== Soạn phiên bản mới (/version/new/:item) ====================== */

/** Ô chọn tệp (PDF bắt buộc, tệp gốc tùy chọn) */
function fileField(kind, required) {
  return `<div class="fld file-fld" data-field="${kind === 'PDF' ? 'pdf' : 'source'}">
    <label for="f-file-${kind}">${bi(kind === 'PDF' ? 'ver.pdf' : 'ver.source')}${required ? ' <span class="req">*</span>' : ''}</label>
    <input class="inp" type="file" id="f-file-${kind}" accept="${esc(KIND_ACCEPT[kind])}">
    <div class="hint">${bi(kind === 'PDF' ? 'ver.pdf_hint' : 'ver.source_hint')}</div><div class="ferr" role="alert"></div></div>`;
}

export async function renderVersionNew(view, { shell, params, query }) {
  const it = await byId('ITEM', params.item);
  const attach = !!(query && query.attach);
  const vtype = attach ? 'ATTACH' : 'REVISION';
  const back = it ? '/item/' + encodeURIComponent(it.item_id) : '/catalog';
  shell.setScreen({ title: attach ? 'ver.attach_title' : 'item.new_version', back });
  if (!it) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('item.not_found')}</p></div>`; return; }
  if (needNet(view)) return;
  const vers = (await recs('VERSION')).filter((v) => v.item_id === it.item_id);
  const openV = vers.find((v) => VERSION_OPEN.has(v.state));
  if (openV) {
    view.innerHTML = `<div class="card"><p class="banner warn">${bi('ver.open_exists', { N: esc(openV.rev) })}</p><a class="btn primary" href="#/version/${encodeURIComponent(openV.version_id)}">${bi('ver.open_it')}</a></div>`;
    return;
  }
  if (!(await can('version.save')) || !canCreateVersion(it, vtype)) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi(it.status === 'NA' ? 'ver.item_na' : 'err.forbidden')}</p></div>`; return; }
  // Soạn theo phiếu đề nghị đã chấp thuận (2d): chọn sẵn phiếu ?req= hoặc phiếu đầu tiên; "Không theo phiếu" vẫn được
  const reqs = attach ? [] : (await recs('DOCREQ')).filter((q) => q.item_id === it.item_id && q.state === 'APPROVED' && q.req_type !== 'CANCEL');
  const reqSel = reqs.find((q) => q.request_id === (query && query.req)) || reqs[0] || null;
  const nextRev = attach ? String(Number(it.current_rev) || 1).padStart(2, '0')
    : String(Math.max(Number(it.current_rev) || (it.status === 'ISSUED' ? 1 : 0), ...vers.filter((v) => v.state === 'ISSUED' || v.state === 'SUPERSEDED').map((v) => Number(v.rev) || 0)) + 1).padStart(2, '0');
  view.innerHTML = `<form class="card form ver-form" novalidate>
    <div class="rec-top"><span class="code big">${esc(it.code)}</span>${statusDot(it.status)}</div>
    <p class="item-name">${pair(it.name_vi, it.name_zh)}</p>
    <p class="banner ${attach ? 'warn' : 'info'} small">${attach ? bi('ver.attach_note', { N: esc(nextRev) }) : bi('ver.new_note', { N: esc(nextRev) })}</p>
    ${reqs.length ? `<label class="fld"><span>${bi('dr.by_request')}</span><select class="inp sel" id="f-request_id">${reqs.map((q) => `<option value="${esc(q.request_id)}"${q === reqSel ? ' selected' : ''}>${esc(q.code)} · ${esc(String(q.reason_vi || q.reason_zh || '').slice(0, 60))}</option>`).join('')}<option value="">${bi('dr.no_request')}</option></select><div class="hint">${bi('dr.by_request_hint')}</div></label>` : ''}
    ${attach ? '' : bilingualInputs('change_summary', reqSel ? { change_summary_vi: reqSel.content_vi || reqSel.reason_vi || '', change_summary_zh: reqSel.content_vi || reqSel.reason_vi ? '' : reqSel.content_zh || reqSel.reason_zh || '' } : null, { labelKey: 'ver.summary', area: true, maxlength: 1000, suggest: 'change_summary' })}
    ${attach ? '' : dateInput('effective_date', 'ver.effective', '')}
    ${fileField('PDF', true)}
    ${fileField('SOURCE', false)}
    <p class="form-err err"></p>
    <div class="row">
      <a class="btn" href="#${back}">${bi('btn.cancel')}</a>
      ${attach ? `<button type="submit" class="btn primary" data-go="issue">${ICON.check}<span>${bi('ver.save_issue')}</span></button>`
        : `<button type="submit" class="btn" data-go="save">${bi('ver.save_draft')}</button>
           <button type="submit" class="btn primary" data-go="submit">${bi('ver.save_submit')}</button>`}
    </div>
    <p class="muted small">${bi(attach ? 'ver.attach_how' : 'ver.flow_note')}</p>
  </form>`;
  const form = $('form', view);
  wireForm(form);
  let go = 'save';
  form.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { go = b.dataset.go; }));
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const errs = [];
    const pdf = $('#f-file-PDF', form).files[0];
    const src = $('#f-file-SOURCE', form).files[0];
    if (!pdf) errs.push({ field: 'pdf', key: 'ver.pdf_required' });
    else { const e = checkFile(pdf, 'PDF'); if (e) errs.push({ field: 'pdf', key: e }); }
    if (src) { const e = checkFile(src, 'SOURCE'); if (e) errs.push({ field: 'source', key: e }); }
    const p = { version_id: uuid(), item_id: it.item_id, vtype };
    const rqv = readField(form, 'request_id');
    if (rqv) p.request_id = rqv;
    if (!attach) {
      p.change_summary_vi = readField(form, 'change_summary_vi');
      p.change_summary_zh = readField(form, 'change_summary_zh');
      if (!p.change_summary_vi && !p.change_summary_zh) errs.push({ field: 'change_summary', key: 'field.one_lang' });
      const eff = readField(form, 'effective_date');
      if (eff === null) errs.push({ field: 'effective_date', key: 'field.invalid_date' }); else p.effective_date = eff;
      const as = assistedFields(form);
      if (!as.ok) errs.push(...as.errors);
      else if (as.bases.length) p.i18n_assisted = as.bases;
    }
    if (errs.length) { showErrors(form, errs); return; }
    const btns = form.querySelectorAll('button[type=submit]');
    btns.forEach((b) => busy(b, true));
    const done = (ok) => { btns.forEach((b) => busy(b, false)); return ok; };
    let r = await writeOnline('version.save', p, { expected_version: 0 });
    if (!r.ok) { done(); if (r.code === 'VALIDATION_ERROR') showErrors(form, r.errors); else writeFail(r); return; }
    let rv = r.record_version;
    const goDetail = async (msgKey) => { await afterCommit(); if (msgKey) toast(bi(msgKey), 'ok'); navigate('/version/' + encodeURIComponent(p.version_id), { replace: true }); };
    toast(bi('ver.uploading'), '');
    r = await uploadVersionFile(p.version_id, 'PDF', pdf);
    if (!r.ok) { done(); writeFail(r); await goDetail(''); return; }
    rv = r.record_version;
    if (src) {
      r = await uploadVersionFile(p.version_id, 'SOURCE', src);
      if (!r.ok) { done(); writeFail(r); await goDetail(''); return; }
      rv = r.record_version;
    }
    if (go === 'submit') {
      r = await writeOnline('version.submit', { version_id: p.version_id }, { expected_version: rv });
      done();
      if (!r.ok) writeFail(r);
      await goDetail(r.ok ? 'ver.submitted_ok' : 'form.saved');
      return;
    }
    if (go === 'issue') {
      r = await writeWithPin('version.issue', { version_id: p.version_id }, { expected_version: rv });
      done();
      if (!r.ok) writeFail(r);
      await goDetail(r.ok ? 'ver.issued_ok' : 'form.saved');
      return;
    }
    done();
    await goDetail('form.saved');
  });
}

/* ====================== Chi tiết phiên bản (/version/:id) ====================== */

export async function renderVersion(view, ctx) {
  const { shell, params } = ctx;
  const v = await byId('VERSION', params.id);
  const it = v ? await byId('ITEM', v.item_id) : null;
  shell.setScreen({ title: 'ver.title', back: it ? '/item/' + encodeURIComponent(it.item_id) : '/versions' });
  if (!v || !it) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('ver.not_found')}</p><a class="btn" href="#/versions">${bi('nav.versions')}</a></div>`; return; }
  const um = await users();
  const who = (id) => esc(userName(um, id) || '');
  const editable = v.state === 'DRAFT' && versionEditable(it, v);
  const online = navigator.onLine;
  const acts = [];
  if (v.state === 'DRAFT' && editable && v.vtype !== 'ATTACH') acts.push(`<button type="button" class="btn primary" id="v-submit" ${v.pdf_doc_id && online ? '' : 'disabled'}>${ICON.up}<span>${bi('ver.submit')}</span></button>`);
  if (v.state === 'DRAFT' && v.vtype === 'ATTACH' && isSecretary()) acts.push(`<button type="button" class="btn primary" id="v-issue" ${v.pdf_doc_id && online ? '' : 'disabled'}>${ICON.check}<span>${bi('ver.issue')}</span></button>`);
  if (v.state === 'IN_REVIEW' && canApprove(it, v)) acts.push(`<button type="button" class="btn primary" id="v-approve" ${online ? '' : 'disabled'}>${ICON.check}<span>${bi('ver.approve')}</span></button>`);
  if (v.state === 'APPROVED' && isSecretary()) acts.push(`<button type="button" class="btn primary" id="v-issue" ${online ? '' : 'disabled'}>${ICON.check}<span>${bi('ver.issue')}</span></button>`);
  if ((v.state === 'IN_REVIEW' || v.state === 'APPROVED') && canReturnVersion(it, v)) acts.push(`<button type="button" class="btn" id="v-return" ${online ? '' : 'disabled'}>${ICON.back}<span>${bi('ver.return')}</span></button>`);
  if (VERSION_OPEN.has(v.state) && canCancelVersion(it, v)) acts.push(`<button type="button" class="btn danger" id="v-cancel" ${online ? '' : 'disabled'}>${ICON.trash}<span>${bi('ver.cancel')}</span></button>`);
  let wait = '';
  if (v.state === 'IN_REVIEW' && !canApprove(it, v)) wait = bi(it.level === 'COMPANY' ? 'ver.wait_admin' : 'ver.wait_head');
  if (v.state === 'APPROVED' && !isSecretary()) wait = bi('ver.wait_issue');
  if (v.state === 'DRAFT' && editable && v.vtype !== 'ATTACH' && !v.pdf_doc_id) wait = bi('ver.need_pdf');
  view.innerHTML = `<div class="item ver">
    <section class="card item-head">
      <div class="rec-top"><a class="code big" href="#/item/${encodeURIComponent(it.item_id)}">${esc(it.code)}</a>${vBadge(v)}</div>
      <h2 class="item-name">${pair(it.name_vi, it.name_zh)}</h2>
      <div class="rec-badges">${badge('level_doc.' + (it.level || 'DEPT'))} <strong>${bi('ver.rev_n', { N: esc(v.rev) })}</strong></div>
      ${v.state === 'DRAFT' && v.return_reason ? `<p class="banner err small">${bi('ver.returned_by', { U: who(v.returned_by), D: esc(fmtDateTime(v.returned_at)) })}: ${esc(v.return_reason)}</p>` : ''}
      ${v.state === 'SUPERSEDED' ? `<p class="banner warn small">${bi('ver.superseded_note')}</p>` : ''}
      ${v.state === 'CANCELLED' ? `<p class="banner small">${bi('ver.cancelled_note')}${v.cancel_reason ? ': ' + esc(v.cancel_reason) : ''}</p>` : ''}
    </section>
    <section class="card"><h3>${bi('ver.files')}</h3>
      <div class="row doc-row">${docButton(v.pdf_doc_id, 'PDF', v.pdf_file_name, v.pdf_size) || `<span class="muted">${bi('ver.no_pdf')}</span>`}
        ${docButton(v.source_doc_id, 'SOURCE', v.source_file_name, v.source_size)}</div>
      ${editable ? `<div class="row up-row">
        <label class="btn small file${v.pdf_doc_id ? '' : ' primary'}">${ICON.upload}<span>${bi(v.pdf_doc_id ? 'ver.replace_pdf' : 'ver.upload_pdf')}</span><input type="file" data-up="PDF" accept="${esc(KIND_ACCEPT.PDF)}" hidden></label>
        <label class="btn small file">${ICON.upload}<span>${bi(v.source_doc_id ? 'ver.replace_source' : 'ver.upload_source')}</span><input type="file" data-up="SOURCE" accept="${esc(KIND_ACCEPT.SOURCE)}" hidden></label></div>
        <p class="muted small">${bi('ver.files_hint')}</p>` : ''}
    </section>
    <section class="card"><h3>${bi('ver.info')}</h3>
      ${v.change_summary_vi || v.change_summary_zh ? `<div class="kv-block"><span class="muted small">${bi('ver.summary')}</span><p>${summaryHtml(v)}</p></div>` : ''}
      ${kv('ver.effective', esc(fmtDate(v.effective_date)))}
      ${kv('ver.author', who(v.author_id) + (v.created_at ? ` <span class="muted small">${esc(fmtDateTime(v.created_at))}</span>` : ''))}
      ${kv('ver.submitted', v.submitted_at ? `${who(v.submitted_by)} <span class="muted small">${esc(fmtDateTime(v.submitted_at))}</span>` : '')}
      ${kv('ver.approved', v.approved_at ? `${who(v.approved_by)} <span class="muted small">${esc(fmtDateTime(v.approved_at))}</span>${v.approve_note ? '<br>' + esc(v.approve_note) : ''}` : '')}
      ${kv('ver.issued', v.issued_at ? `${who(v.issued_by)} <span class="muted small">${esc(fmtDate(v.issued_at))}</span>` : '')}
      ${kv('ver.superseded', v.superseded_at ? esc(fmtDateTime(v.superseded_at)) : '')}
      ${kv('ver.cancelled', v.cancelled_at ? `${who(v.cancelled_by)} <span class="muted small">${esc(fmtDateTime(v.cancelled_at))}</span>` : '')}
    </section>
    ${editable ? `<form class="card form ver-edit" novalidate><h3>${bi('ver.edit')}</h3>
      ${bilingualInputs('change_summary', v, { labelKey: 'ver.summary', area: true, maxlength: 1000, required: v.vtype !== 'ATTACH', suggest: 'change_summary' })}
      ${dateInput('effective_date', 'ver.effective', v.effective_date)}
      <p class="form-err err"></p>
      <div class="row"><button type="submit" class="btn" id="v-save" ${online ? '' : 'disabled'}>${bi('btn.save')}</button></div></form>` : ''}
    ${wait ? `<p class="banner info small">${wait}</p>` : ''}
    ${acts.length ? `<div class="row item-actions">${acts.join('')}</div>` : ''}
    ${!online && (acts.length || editable) ? `<p class="muted small">${bi('sync.need_network')}</p>` : ''}
  </div>`;
  wireDocButtons(view);
  const again = async (msgKey) => { await afterCommit(); if (msgKey) toast(bi(msgKey), 'ok'); if (ctx.isCurrent && !ctx.isCurrent()) return; refresh(); };
  const exp = () => v.record_version;
  // Tải tệp lên ngay khi chọn
  view.querySelectorAll('input[data-up]').forEach((inp) => inp.addEventListener('change', async () => {
    const f = inp.files && inp.files[0];
    inp.value = '';
    if (!f) return;
    const e = checkFile(f, inp.dataset.up);
    if (e) { toast(bi(e), 'err'); return; }
    const lab = inp.closest('label');
    busy(lab, true);
    toast(bi('ver.uploading_n', { S: esc(fmtSize(f.size)) }), '');
    const r = await uploadVersionFile(v.version_id, inp.dataset.up, f);
    busy(lab, false);
    if (!r.ok) { writeFail(r); return; }
    await again('ver.uploaded');
  }));
  const form = $('form.ver-edit', view);
  if (form) {
    wireForm(form);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const p = { version_id: v.version_id, change_summary_vi: readField(form, 'change_summary_vi'), change_summary_zh: readField(form, 'change_summary_zh') };
      const errs = [];
      const eff = readField(form, 'effective_date');
      if (eff === null) errs.push({ field: 'effective_date', key: 'field.invalid_date' }); else p.effective_date = eff;
      if (v.vtype !== 'ATTACH' && !p.change_summary_vi && !p.change_summary_zh) errs.push({ field: 'change_summary', key: 'field.one_lang' });
      const as = assistedFields(form);
      if (!as.ok) errs.push(...as.errors); else if (as.bases.length) p.i18n_assisted = as.bases;
      if (errs.length) { showErrors(form, errs); return; }
      const btn = $('#v-save', form);
      busy(btn, true);
      const r = await writeOnline('version.save', p, { expected_version: exp() });
      busy(btn, false);
      if (r.ok) { await again('form.saved'); return; }
      if (r.code === 'VALIDATION_ERROR') { showErrors(form, r.errors); return; }
      writeFail(r);
    });
  }
  const on = (id, fn) => { const b = $('#' + id, view); if (b) b.addEventListener('click', async () => { busy(b, true); try { await fn(); } finally { busy(b, false); } }); };
  on('v-submit', async () => {
    const r = await writeOnline('version.submit', { version_id: v.version_id }, { expected_version: exp() });
    if (r.ok) return again('ver.submitted_ok');
    writeFail(r);
  });
  on('v-approve', async () => {
    const note = await askText('ver.approve', 'ver.approve_note', { note: session.user && v.author_id === session.user.user_id ? biText('ver.self_note') : '' });
    if (note === null) return;
    const r = await writeWithPin('version.approve', { version_id: v.version_id, note }, { expected_version: exp() });
    if (r.ok) return again('ver.approved_ok');
    writeFail(r);
  });
  on('v-return', async () => {
    const reason = await askText('ver.return', 'field.reason', { required: true });
    if (reason === null) return;
    const r = await writeWithPin('version.return', { version_id: v.version_id, reason }, { expected_version: exp() });
    if (r.ok) return again('ver.returned_ok');
    writeFail(r);
  });
  on('v-issue', async () => {
    const cur = it.current_rev && it.current_version_id && it.current_version_id !== v.version_id ? biText('ver.issue_old', { C: it.current_rev }) : '';
    // Bản in của lần đang hiệu lực sẽ thành "cần thu hồi" (2d)
    const held = v.vtype === 'ATTACH' ? [] : (await recs('DIST')).filter((d) => d.item_id === it.item_id && d.state === 'ACTIVE');
    const ok = await confirmBox('ver.issue', `<p>${bi(v.vtype === 'ATTACH' ? 'ver.issue_attach_confirm' : 'ver.issue_confirm', { N: esc(v.rev), D: esc(fmtDate(today())) })}</p>${cur ? `<p class="muted small">${esc(cur)}</p>` : ''}${held.length ? `<p class="banner warn small">${bi('dist.will_recall', { N: held.length })}</p>` : ''}`, 'ver.issue');
    if (!ok) return;
    const r = await writeWithPin('version.issue', { version_id: v.version_id }, { expected_version: exp() });
    if (r.ok) return again('ver.issued_ok');
    writeFail(r);
  });
  on('v-cancel', async () => {
    const reason = await askText('ver.cancel', 'field.reason', { note: biText('ver.cancel_note') });
    if (reason === null) return;
    const r = await writeOnline('version.cancel', { version_id: v.version_id, reason }, { expected_version: exp() });
    if (r.ok) return again('ver.cancelled_ok');
    writeFail(r);
  });
}
