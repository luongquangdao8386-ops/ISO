// Khắc phục (Đợt 3, phiên 3a — hướng A: phạm vi Cơ điện, phiếu theo BM-CĐ-14-02), mã KP-yymm-001.
// /capa: sổ khắc phục (Việc của tôi · Đang xử lý · Chờ kiểm tra hiệu lực · Quá hạn · Đã đóng · Tất cả); /capa/new: lập phiếu (từ chi tiết
// biểu: ?item=); /capa/:id: phiếu — thông tin, nguyên nhân gốc, hành động (thêm, sửa, báo xong, mở lại, hủy), ảnh / tệp bằng chứng, gửi kiểm
// tra hiệu lực, kiểm tra hiệu lực (PIN), hủy phiếu (PIN), in phiếu (báo cáo PDF / Excel); /capa/:id/edit: sửa phiếu.
// Ghi cần mạng (ảnh / tệp vào hàng chờ như hồ sơ, có mạng tự gửi). Quyền phía app chỉ để ẩn/hiện nút (data.js); máy chủ kiểm lại và trả
// FORBIDDEN trước khi hỏi PIN.
import { bi, biText, esc, fmtDate, fmtDateTime, badge, nameText, uuid, session, blobToB64, b64ToBytes } from '../core.js';
import { ICON, toast, dialog, $ } from '../ui.js';
import { byId, recs, items, depts, users, userName, isSecretary, roleLevel, today, addDaysIso, can, capaOn, CAPA_SOURCES, canCreateCapa,
  canEditCapa, canDoCapaAction, canVerifyCapa, canCancelCapa, canCapaFiles, capaOverdue, capaActsOf } from '../data.js';
import { navigate, refresh } from '../router.js';
import { app, afterCommit, syncNow, updateSyncStatus } from '../app.js';
import { enqueue, queueItems } from '../sync.js';
import { textInput, selectInput, bilingualInputs, dateInput, wireForm, readField, showErrors, writeOnline, writeWithPin, writeFail, busy } from '../form.js';
import { docButton, wireDocButtons, checkFile, recordFileKind, mimeOf, KIND_ACCEPT, viewImage } from '../files.js';
import { processPhoto } from '../media.js';
import { statusDot } from './catalog.js';

const MAX_FILES = 30;

const pair = (vi, zh, meta, base) => {
  const m = meta && meta[base];
  const tag = (lang) => (m && m.state === 'MACHINE' && m.src !== lang ? ` <span class="tag mt">${bi('tag.machine_translated')}</span>` : '');
  const a = vi ? `<span class="vi">${esc(vi).replace(/\n/g, '<br>')}</span>${tag('vi')}` : '';
  const b = zh ? `<span class="zh muted">${esc(zh).replace(/\n/g, '<br>')}</span>${tag('zh')}` : '';
  return a && b ? a + '<br>' + b : a || b;
};
const kv = (labelKey, value) => (value ? `<div class="kv"><span>${bi(labelKey)}</span><strong>${value}</strong></div>` : '');
const block = (labelKey, value) => `<div class="kv-block"><span class="muted small">${bi(labelKey)}</span><p>${value || `<span class="muted">${bi('capa.none_yet')}</span>`}</p></div>`;
const needNet = (view) => {
  if (navigator.onLine) return false;
  view.innerHTML = `<div class="card empty-state">${ICON.sync}<p class="muted">${bi('sync.need_network')}</p></div>`;
  return true;
};
const myId = () => session.user && session.user.user_id;

/** Tóm tắt phiếu (một dòng): tóm tắt, không có thì đầu mô tả */
export function capaTitle(c) {
  const t = [c.title_vi, c.title_zh].filter(Boolean).join(' · ');
  if (t) return t;
  const s = String(c.problem_vi || c.problem_zh || '').split('\n')[0];
  return s.length > 120 ? s.slice(0, 117) + '…' : s;
}

/** Huy hiệu trạng thái (+ Quá hạn) */
export function capaBadges(c, acts) {
  return badge('capa.state.' + c.state) + (capaOverdue(c, acts) ? ' ' + badge('capa.overdue') : '');
}

/** Một dòng phiếu trong danh sách */
export function capaRow(c, acts, um) {
  const live = acts.filter((a) => a.state !== 'CANCELLED');
  const done = live.filter((a) => a.state === 'DONE').length;
  const due = c.state === 'VERIFYING' ? bi('capa.verify_due_short', { D: esc(fmtDate(c.verify_due)) }) : c.state === 'OPEN' ? bi('capa.due_short', { D: esc(fmtDate(c.due_date)) }) : '';
  return `<li><a class="cat-row capa-row" href="#/capa/${encodeURIComponent(c.capa_id)}">
    <span class="cat-top"><span class="code">${esc(c.code)}</span>${capaBadges(c, acts)}</span>
    <span class="cat-name">${esc(capaTitle(c))}</span>
    <span class="cat-meta muted">${esc(c.dept_code)} · ${esc(fmtDate(c.found_date))} · ${bi('capa.src_short.' + c.source)}${c.owner_user_id ? ' · ' + esc(userName(um, c.owner_user_id)) : ''}${due ? ' · ' + due : ''}${live.length ? ' · ' + bi('capa.acts_n', { D: done, N: live.length }) : ''}</span>
    ${ICON.chevron}</a></li>`;
}

/** Hộp thoại nhập chữ (lý do) */
async function askText(titleKey, labelKey, { required = false, note = '' } = {}) {
  for (;;) {
    const v = await dialog({
      title: bi(titleKey),
      body: `${note ? `<p class="muted small">${note}</p>` : ''}<label class="fld"><span>${bi(labelKey)}${required ? ' <span class="req">*</span>' : ''}</span><textarea class="inp" rows="3" maxlength="1000" id="dlg-text"></textarea></label>`,
      actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('btn.confirm'), kind: 'primary', read: (w) => $('#dlg-text', w).value.trim() }]
    });
    if (v === null || v === undefined) return null;
    if (required && !v) { toast(bi('field.required'), 'err'); continue; }
    return v;
  }
}

/** Người dùng đang hoạt động để chọn người phụ trách */
async function userOptions() {
  const um = await users();
  return [...um.values()].filter((u) => u.active !== false).sort((a, b) => String(a.display_name).localeCompare(String(b.display_name)))
    .map((u) => [u.user_id, `${esc(u.display_name)} (${esc(u.employee_code)})`]);
}

/** Phiếu khắc phục + hành động theo phiếu */
async function capaActMap() {
  const m = new Map();
  for (const a of await recs('CAPA_ACT')) {
    if (a.archived_at) continue;
    const l = m.get(a.capa_id) || [];
    l.push(a);
    m.set(a.capa_id, l);
  }
  return m;
}

/* ====================== Sổ khắc phục (/capa) ====================== */

const TABS = ['mine', 'open', 'verify', 'overdue', 'closed', 'all'];
let curTab = '';

export async function renderCapas(view, { shell, query }) {
  shell.setScreen({ title: 'nav.capa', back: '/' });
  if (!(await capaOn())) { view.innerHTML = `<div class="card empty-state">${ICON.repairs}<p class="muted">${bi('capa.server_old')}</p></div>`; return; }
  if (!isSecretary() && roleLevel() < 2) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('err.forbidden')}</p></div>`; return; }
  const all = (await recs('CAPA')).filter((c) => !c.archived_at);
  const am = await capaActMap();
  const actsOf = (c) => am.get(c.capa_id) || [];
  const uid = myId();
  const live = (c) => c.state === 'OPEN' || c.state === 'VERIFYING';
  const by = {
    mine: all.filter((c) => live(c) && (c.owner_user_id === uid || actsOf(c).some((a) => a.state === 'OPEN' && a.owner_user_id === uid) || (c.state === 'VERIFYING' && canVerifyCapa(c)))),
    open: all.filter((c) => c.state === 'OPEN'),
    verify: all.filter((c) => c.state === 'VERIFYING'),
    overdue: all.filter((c) => capaOverdue(c, actsOf(c))),
    closed: all.filter((c) => c.state === 'CLOSED'),
    all
  };
  if (query && TABS.includes(query.f)) curTab = query.f;
  if (!TABS.includes(curTab)) curTab = TABS.find((t) => t !== 'all' && t !== 'closed' && by[t].length) || 'all';
  const um = await users();
  const dueOf = (c) => (c.state === 'VERIFYING' ? c.verify_due : c.due_date) || '9999';
  const shown = by[curTab].slice().sort((a, b) => (curTab === 'all' || curTab === 'closed'
    ? String(b.code).localeCompare(String(a.code))
    : String(dueOf(a)).localeCompare(String(dueOf(b))) || String(a.code).localeCompare(String(b.code))));
  const canNew = isSecretary() || (await depts()).some((d) => d.active !== false && canCreateCapa(d.dept_code));
  view.innerHTML = `<div class="row list-head">${canNew ? `<a class="btn primary" href="#/capa/new" id="capa-new">${ICON.plus}<span>${bi('capa.new')}</span></a>` : ''}
      ${await can('report.run') ? `<a class="btn" href="#/reports?kind=CAPA">${ICON.reports}<span>${bi('capa.log_report')}</span></a>` : ''}</div>
    <div class="chips tabs">${TABS.filter((t) => t === 'all' || t === curTab || by[t].length).map((t) => `<button type="button" class="chip${t === curTab ? ' on' : ''}" data-tab="${t}">${bi('capa.tab.' + t)} <b>${by[t].length}</b></button>`).join('')}</div>
    ${shown.length ? `<ul class="cat-list">${shown.map((c) => capaRow(c, actsOf(c), um)).join('')}</ul>`
      : `<div class="card empty-state">${ICON.check}<p class="muted">${bi(all.length ? 'capa.none_tab' : 'capa.none')}</p></div>`}
    <p class="muted small">${bi('capa.how')}</p>`;
  view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { curTab = b.dataset.tab; renderCapas(view, { shell, query: {} }); }));
}

/* ====================== Lập / sửa phiếu (/capa/new, /capa/:id/edit) ====================== */

export async function renderCapaForm(view, { shell, params, query }) {
  const editing = !!(params && params.id);
  const c = editing ? await byId('CAPA', params.id) : null;
  const q = query || {};
  const it0 = !editing && q.item ? await byId('ITEM', q.item) : null;
  const backTo = editing ? '/capa/' + encodeURIComponent(params.id) : it0 ? '/item/' + encodeURIComponent(it0.item_id) : '/capa';
  shell.setScreen({ title: editing ? 'capa.edit' : 'capa.new', back: backTo });
  if (!(await capaOn())) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('capa.server_old')}</p></div>`; return; }
  if (editing && !c) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('capa.not_found')}</p></div>`; return; }
  if (editing && (!canEditCapa(c) || c.state !== 'OPEN')) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('capa.no_edit')}</p></div>`; return; }
  if (needNet(view)) return;
  const deps = (await depts()).filter((d) => d.active !== false && (canCreateCapa(d.dept_code) || (c && c.dept_code === d.dept_code)));
  if (!deps.length) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('err.forbidden')}</p></div>`; return; }
  const list = await items();
  let source = c ? c.source : (CAPA_SOURCES.includes(q.source) ? q.source : 'EQUIPMENT');
  let dept = c ? c.dept_code : (it0 && deps.some((d) => d.dept_code === it0.dept_code) ? it0.dept_code : (deps.length === 1 ? deps[0].dept_code : ''));
  const uOpts = await userOptions();
  const t = today();
  const itemOpts = (dp) => list.filter((x) => !dp || x.dept_code === dp).map((x) => [x.item_id, `${esc(x.code)} · ${esc(x.name_vi || x.name_zh || '')}`]);
  view.innerHTML = `<form class="card form capa-form" novalidate>
    <div class="fld" data-field="source"><label>${bi('capa.source')} <span class="req">*</span></label>
      <div class="chips" role="radiogroup">${CAPA_SOURCES.map((s) => `<button type="button" class="chip${s === source ? ' on' : ''}" data-src="${s}" role="radio" aria-checked="${s === source}">${bi('capa.src.' + s)}</button>`).join('')}</div><div class="ferr"></div></div>
    <div class="form-grid">
      ${selectInput('dept_code', 'capa.dept', deps.map((d) => [d.dept_code, esc(d.dept_code + ' · ' + nameText(d))]), dept, { required: true })}
      ${dateInput('found_date', 'capa.found_date', c ? c.found_date : t, { required: true })}
      ${textInput('found_by_name', 'capa.found_by', c ? c.found_by_name : '', { maxlength: 120, hint: biText('capa.found_by_hint') })}
      ${textInput('ref_text', 'capa.ref', c ? c.ref_text : '', { maxlength: 200, hint: biText('capa.ref_hint') })}
    </div>
    <div id="capa-item">${selectInput('item_id', 'capa.item', itemOpts(dept), c ? c.item_id : (it0 ? it0.item_id : ''), { empty: 'capa.item_none', hint: biText('capa.item_hint') })}</div>
    ${bilingualInputs('title', c, { labelKey: 'capa.title_f', maxlength: 300, required: false })}
    ${bilingualInputs('problem', c, { labelKey: 'capa.problem', area: true, maxlength: 3000 })}
    ${bilingualInputs('correction', c, { labelKey: 'capa.correction', area: true, maxlength: 3000, required: false })}
    ${bilingualInputs('cause', c, { labelKey: 'capa.cause', area: true, maxlength: 3000, required: false })}
    <p class="muted small">${bi('capa.cause_hint')}</p>
    <div class="form-grid">
      ${selectInput('owner_user_id', 'capa.owner', uOpts, c ? c.owner_user_id : myId(), { empty: '' })}
      ${dateInput('due_date', 'capa.due_date', c ? c.due_date : addDaysIso(t, 30), { required: true })}
    </div>
    <p class="form-err err"></p>
    <div class="row"><a class="btn" href="#${backTo}">${bi('btn.cancel')}</a>
      <button type="submit" class="btn primary" id="capa-save">${ICON.check}<span>${bi(editing ? 'btn.save' : 'capa.create')}</span></button></div>
    ${editing ? '' : `<p class="muted small">${bi('capa.flow_note')}</p>`}
  </form>`;
  const form = $('form', view);
  wireForm(form);
  form.querySelectorAll('[data-src]').forEach((b) => b.addEventListener('click', () => {
    source = b.dataset.src;
    form.querySelectorAll('[data-src]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
  }));
  $('#f-dept_code', form).addEventListener('change', (e) => {
    dept = e.target.value;
    const cur = readField(form, 'item_id');
    const box = $('#capa-item', form);
    const keep = list.some((x) => x.item_id === cur && (!dept || x.dept_code === dept)) ? cur : '';
    box.innerHTML = selectInput('item_id', 'capa.item', itemOpts(dept), keep, { empty: 'capa.item_none', hint: biText('capa.item_hint') });
  });
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const p = { capa_id: editing ? c.capa_id : uuid(), source };
    const errs = [];
    p.dept_code = readField(form, 'dept_code');
    if (!p.dept_code) errs.push({ field: 'dept_code', key: 'field.required' });
    p.item_id = readField(form, 'item_id') || '';
    p.owner_user_id = readField(form, 'owner_user_id') || '';
    ['found_by_name', 'ref_text', 'title_vi', 'title_zh', 'problem_vi', 'problem_zh', 'correction_vi', 'correction_zh', 'cause_vi', 'cause_zh'].forEach((k) => { p[k] = readField(form, k) || ''; });
    if (!p.problem_vi && !p.problem_zh) errs.push({ field: 'problem', key: 'field.one_lang' });
    const found = readField(form, 'found_date');
    const due = readField(form, 'due_date');
    if (!found) errs.push({ field: 'found_date', key: found === null ? 'field.invalid_date' : 'field.required' }); else p.found_date = found;
    if (!due) errs.push({ field: 'due_date', key: due === null ? 'field.invalid_date' : 'field.required' }); else p.due_date = due;
    if (found && due && due < found) errs.push({ field: 'due_date', key: 'capa.due_before_found' });
    if (errs.length) { showErrors(form, errs); return; }
    const btn = $('#capa-save', form);
    busy(btn, true);
    const r = await writeOnline('capa.save', p, { expected_version: editing ? c.record_version : 0 });
    busy(btn, false);
    if (r.ok) {
      await afterCommit();
      toast(editing ? bi('form.saved') : bi('capa.created_ok', { C: esc((r.data && r.data.record && r.data.record.code) || '') }), 'ok');
      navigate('/capa/' + encodeURIComponent(p.capa_id), { replace: true });
      return;
    }
    if (r.code === 'VALIDATION_ERROR') { showErrors(form, r.errors); return; }
    writeFail(r);
  });
}

/* ====================== Chi tiết phiếu (/capa/:id) ====================== */

/** Hộp thoại thêm / sửa hành động; trả payload hoặc null (bỏ) */
async function actionDialog(c, a, prev) {
  const v = prev || a || {};
  const uOpts = await userOptions();
  const ownerSel = v.owner_user_id !== undefined ? v.owner_user_id : (a ? a.owner_user_id : c.owner_user_id);
  return dialog({
    title: bi(a ? 'capa.act_edit' : 'capa.act_add'),
    wide: true,
    body: `<div class="form capa-act-form">
      <label class="fld"><span>${bi('capa.atype')}</span><select class="inp sel" id="ca-type">${['CORRECTIVE', 'PREVENTIVE'].map((x) => `<option value="${x}"${(v.atype || 'CORRECTIVE') === x ? ' selected' : ''}>${esc(biText('capa.atype.' + x))}</option>`).join('')}</select></label>
      <fieldset class="bi-pair"><legend>${bi('capa.act_content')} <span class="req">*</span></legend>
        <label class="fld"><span>${bi('i18n.lang_vi')}</span><textarea class="inp" rows="2" maxlength="2000" id="ca-vi">${esc(v.content_vi || '')}</textarea></label>
        <label class="fld"><span>${bi('i18n.lang_zh')}</span><textarea class="inp" rows="2" maxlength="2000" id="ca-zh">${esc(v.content_zh || '')}</textarea></label>
        <div class="hint">${bi('field.one_lang')}</div></fieldset>
      <label class="fld"><span>${bi('capa.act_owner')}</span><select class="inp sel" id="ca-owner"><option value="">${esc(biText('capa.act_owner_none'))}</option>${uOpts.map(([id, t]) => `<option value="${esc(id)}"${id === ownerSel ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="fld"><span>${bi('capa.assignee')}</span><input class="inp" type="text" maxlength="120" id="ca-assignee" value="${esc(v.assignee_name || '')}" autocomplete="off"><div class="hint">${bi('capa.assignee_hint')}</div></label>
      <label class="fld"><span>${bi('capa.act_due')} <span class="req">*</span></span><input class="inp" type="date" id="ca-due" value="${esc(v.due_date || addDaysIso(today(), 14))}"></label>
    </div>`,
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('btn.save'), kind: 'primary', read: (w) => ({
      atype: $('#ca-type', w).value, content_vi: $('#ca-vi', w).value.trim(), content_zh: $('#ca-zh', w).value.trim(),
      owner_user_id: $('#ca-owner', w).value, assignee_name: $('#ca-assignee', w).value.trim(), due_date: $('#ca-due', w).value
    }) }]
  });
}

/** Hộp thoại báo xong hành động */
async function doneDialog(a, prev) {
  const v = prev || {};
  return dialog({
    title: bi('capa.act_done_title', { N: a.seq }),
    body: `<p class="small">${esc(a.content_vi || a.content_zh || '')}</p>
      <label class="fld"><span>${bi('capa.done_date')} <span class="req">*</span></span><input class="inp" type="date" id="cd-date" value="${esc(v.done_date || today())}"></label>
      <fieldset class="bi-pair"><legend>${bi('capa.result')} <span class="req">*</span></legend>
        <label class="fld"><span>${bi('i18n.lang_vi')}</span><textarea class="inp" rows="3" maxlength="2000" id="cd-vi">${esc(v.result_vi !== undefined ? v.result_vi : a.result_vi || '')}</textarea></label>
        <label class="fld"><span>${bi('i18n.lang_zh')}</span><textarea class="inp" rows="2" maxlength="2000" id="cd-zh">${esc(v.result_zh !== undefined ? v.result_zh : a.result_zh || '')}</textarea></label>
        <div class="hint">${bi('capa.result_hint')}</div></fieldset>`,
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('capa.act_done'), kind: 'primary', read: (w) => ({
      done_date: $('#cd-date', w).value, result_vi: $('#cd-vi', w).value.trim(), result_zh: $('#cd-zh', w).value.trim()
    }) }]
  });
}

/** Hộp thoại ghi nguyên nhân gốc */
async function causeDialog(c) {
  return dialog({
    title: bi('capa.cause_btn'),
    wide: true,
    body: `<p class="muted small">${bi('capa.cause_hint')}</p>
      <label class="fld"><span>${bi('i18n.lang_vi')}</span><textarea class="inp" rows="4" maxlength="3000" id="cc-vi">${esc(c.cause_vi || '')}</textarea></label>
      <label class="fld"><span>${bi('i18n.lang_zh')}</span><textarea class="inp" rows="3" maxlength="3000" id="cc-zh">${esc(c.cause_zh || '')}</textarea></label>
      <div class="hint">${bi('field.one_lang')}</div>`,
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('btn.save'), kind: 'primary', read: (w) => ({ cause_vi: $('#cc-vi', w).value.trim(), cause_zh: $('#cc-zh', w).value.trim() }) }]
  });
}

/** Hộp thoại kiểm tra hiệu lực */
async function verifyDialog(c, prev) {
  const v = prev || {};
  const res = v.result || '';
  return dialog({
    title: bi('capa.verify_title', { N: (Number(c.verify_count) || 0) + 1 }),
    body: `<p class="muted small">${bi('capa.verify_note_hint')}</p>
      <div class="chips" role="radiogroup" id="cv-res">${['EFFECTIVE', 'NOT_EFFECTIVE'].map((x) => `<button type="button" class="chip${res === x ? ' on' : ''}" data-res="${x}" role="radio" aria-checked="${res === x}">${bi('capa.result.' + x)}</button>`).join('')}</div>
      <label class="fld"><span>${bi('capa.verify_date')}</span><input class="inp" type="date" id="cv-date" value="${esc(v.verify_date || today())}"></label>
      <fieldset class="bi-pair"><legend>${bi('capa.verify_note')} <span class="req">*</span></legend>
        <label class="fld"><span>${bi('i18n.lang_vi')}</span><textarea class="inp" rows="3" maxlength="2000" id="cv-vi">${esc(v.note_vi || '')}</textarea></label>
        <label class="fld"><span>${bi('i18n.lang_zh')}</span><textarea class="inp" rows="2" maxlength="2000" id="cv-zh">${esc(v.note_zh || '')}</textarea></label>
        <div class="hint">${bi('field.one_lang')}</div></fieldset>`,
    onOpen: (w) => w.querySelectorAll('[data-res]').forEach((b) => b.addEventListener('click', () => {
      w.querySelectorAll('[data-res]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
    })),
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('capa.verify_save'), kind: 'primary', read: (w) => {
      const on = w.querySelector('[data-res].on');
      return { result: on ? on.dataset.res : '', verify_date: $('#cv-date', w).value, note_vi: $('#cv-vi', w).value.trim(), note_zh: $('#cv-zh', w).value.trim() };
    } }]
  });
}

function actionHtml(c, a, um, { online }) {
  const t = today();
  const od = a.state === 'OPEN' && a.due_date && a.due_date < t;
  const who = [a.owner_user_id ? userName(um, a.owner_user_id) : '', a.assignee_name].filter(Boolean).join(' · ');
  const btns = [];
  if (c.state === 'OPEN') {
    if (a.state === 'OPEN' && canDoCapaAction(c, a)) btns.push(`<button type="button" class="btn small primary" data-adone="${esc(a.action_id)}" ${online ? '' : 'disabled'}>${ICON.check}<span>${bi('capa.act_done')}</span></button>`);
    if (a.state === 'OPEN' && canEditCapa(c)) {
      btns.push(`<button type="button" class="btn small" data-aedit="${esc(a.action_id)}" ${online ? '' : 'disabled'}>${ICON.edit}<span>${bi('btn.edit')}</span></button>`);
      btns.push(`<button type="button" class="btn small" data-acancel="${esc(a.action_id)}" ${online ? '' : 'disabled'}>${ICON.x}<span>${bi('capa.act_cancel')}</span></button>`);
    }
    if (a.state === 'DONE' && (canEditCapa(c) || a.done_by === myId())) btns.push(`<button type="button" class="btn small" data-aundo="${esc(a.action_id)}" ${online ? '' : 'disabled'}>${ICON.refresh}<span>${bi('capa.act_reopen')}</span></button>`);
  }
  return `<li class="capa-act${a.state === 'CANCELLED' ? ' muted' : ''}" data-act="${esc(a.action_id)}">
    <div class="rec-top"><strong>${bi('capa.act_n', { N: a.seq })}</strong>${badge('capa.atype.' + a.atype)} ${badge('capa.astate.' + a.state)}${od ? ' ' + badge('capa.overdue') : ''}${Number(a.round) ? ` <span class="muted small">${bi('capa.round_n', { N: a.round })}</span>` : ''}</div>
    <p class="capa-act-text">${pair(a.content_vi, a.content_zh, a.i18n_meta, 'content')}</p>
    <div class="muted small">${who ? `${bi('capa.act_owner')}: ${esc(who)} · ` : ''}<span class="${od ? 't-red-text' : ''}">${bi('capa.act_due')}: ${esc(fmtDate(a.due_date))}</span></div>
    ${a.state === 'DONE' ? `<div class="small capa-act-done">${bi('capa.done_on', { D: esc(fmtDate(a.done_date)), U: esc(userName(um, a.done_by)) })}<br>${pair(a.result_vi, a.result_zh, a.i18n_meta, 'result')}</div>` : ''}
    ${a.state === 'CANCELLED' ? `<div class="small">${bi('capa.act_cancelled', { U: esc(userName(um, a.cancelled_by)) })}${a.cancel_reason ? ': ' + esc(a.cancel_reason) : ''}</div>` : ''}
    ${btns.length ? `<div class="row">${btns.join('')}</div>` : ''}
  </li>`;
}

export async function renderCapa(view, ctx) {
  const { shell, params } = ctx;
  const c = await byId('CAPA', params.id);
  shell.setScreen({ title: 'capa.title', back: '/capa' });
  if (!c) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('capa.not_found')}</p><a class="btn" href="#/capa">${bi('nav.capa')}</a></div>`; return; }
  const acts = await capaActsOf(c.capa_id);
  const live = acts.filter((a) => a.state !== 'CANCELLED');
  const gone = acts.filter((a) => a.state === 'CANCELLED');
  const it = c.item_id ? await byId('ITEM', c.item_id) : null;
  const um = await users();
  const who = (id) => esc(userName(um, id) || '');
  const online = navigator.onLine && !app.offline;
  const t = today();
  const edit = c.state === 'OPEN' && canEditCapa(c);
  const od = capaOverdue(c, acts);
  const files = c.files_json || [];
  const qOps = (await queueItems().catch(() => [])).filter((o) => o.action === 'doc.upload' && o.parent_id === c.capa_id && o.user_id === myId() && o.dataset_epoch === session.epoch);
  const canFiles = canCapaFiles(c, acts) && files.length + qOps.length < MAX_FILES;
  const hist = c.verify_history_json || [];
  const lastNo = hist.length && hist[hist.length - 1].result === 'NOT_EFFECTIVE' && c.state === 'OPEN' ? hist[hist.length - 1] : null;
  // Gửi kiểm tra hiệu lực: điều kiện như máy chủ (nguyên nhân gốc, không còn hành động mở, có hành động đã xong)
  const openActs = live.filter((a) => a.state === 'OPEN').length;
  const doneActs = live.filter((a) => a.state === 'DONE').length;
  const hasCause = !!(c.cause_vi || c.cause_zh);
  const readyHint = !hasCause ? 'capa.need_cause' : openActs ? 'capa.need_done' : !doneActs ? 'capa.need_action' : '';
  const acts2 = [];
  if (edit) acts2.push(`<button type="button" class="btn primary" id="capa-complete" ${online && !readyHint ? '' : 'disabled'}>${ICON.up}<span>${bi('capa.complete')}</span></button>`);
  if (c.state === 'VERIFYING' && canVerifyCapa(c)) acts2.push(`<button type="button" class="btn primary" id="capa-verify" ${online ? '' : 'disabled'}>${ICON.check}<span>${bi('capa.verify')}</span></button>`);
  if (c.state === 'VERIFYING' && canEditCapa(c)) acts2.push(`<button type="button" class="btn" id="capa-uncomplete" ${online ? '' : 'disabled'}>${ICON.back}<span>${bi('capa.uncomplete')}</span></button>`);
  if ((c.state === 'OPEN' || c.state === 'VERIFYING') && canCancelCapa(c)) acts2.push(`<button type="button" class="btn danger" id="capa-cancel" ${online ? '' : 'disabled'}>${ICON.trash}<span>${bi('capa.cancel')}</span></button>`);
  let wait = '';
  if (c.state === 'VERIFYING' && !canVerifyCapa(c)) wait = bi('capa.wait_verify', { D: esc(fmtDate(c.verify_due)) });
  view.innerHTML = `<div class="item capa">
    <section class="card item-head">
      <div class="rec-top"><span class="code big">${esc(c.code)}</span>${capaBadges(c, acts)}</div>
      <h2 class="item-name capa-name">${esc(capaTitle(c))}</h2>
      <div class="rec-badges">${badge('capa.src.' + c.source)} <span class="small">${esc(c.dept_code)}</span></div>
      ${c.state === 'CLOSED' ? `<p class="banner ok small">${bi('capa.closed_by', { U: who(c.verified_by), D: esc(fmtDate(c.verify_date || c.closed_at)) })}</p>` : ''}
      ${c.state === 'CANCELLED' ? `<p class="banner small">${bi('capa.cancelled_by', { U: who(c.cancelled_by), D: esc(fmtDate(c.cancelled_at)) })}${c.cancel_reason ? ': ' + esc(c.cancel_reason) : ''}</p>` : ''}
      ${c.state === 'VERIFYING' ? `<p class="banner info small">${bi('capa.verifying_note', { D: esc(fmtDate(c.verify_due)) })}</p>` : ''}
      ${lastNo ? `<p class="banner err small">${bi('capa.not_effective_note', { N: lastNo.n, D: esc(fmtDate(lastNo.date)) })}${lastNo.note_vi || lastNo.note_zh ? ': ' + esc(lastNo.note_vi || lastNo.note_zh) : ''}</p>` : ''}
    </section>
    <section class="card"><div class="card-head"><h3>${bi('capa.info')}</h3>${edit ? `<a class="btn tiny" href="#/capa/${encodeURIComponent(c.capa_id)}/edit" id="capa-edit">${ICON.edit}<span>${bi('btn.edit')}</span></a>` : ''}</div>
      ${kv('capa.found_date', esc(fmtDate(c.found_date)))}
      ${kv('capa.found_by', esc(c.found_by_name || ''))}
      ${kv('capa.dept', esc(c.dept_code))}
      ${it ? kv('capa.item', `<a href="#/item/${encodeURIComponent(it.item_id)}"><span class="code">${esc(it.code)}</span></a> ${statusDot(it.status)} ${esc(nameText(it))}`) : ''}
      ${kv('capa.ref', esc(c.ref_text || ''))}
      ${kv('capa.owner', who(c.owner_user_id))}
      ${kv('capa.due_date', `<span class="${od && c.state === 'OPEN' ? 't-red-text' : ''}">${esc(fmtDate(c.due_date))}</span>`)}
      ${kv('capa.created', `${who(c.created_by)} <span class="muted small">${esc(fmtDateTime(c.created_at))}</span>`)}
      ${block('capa.problem', pair(c.problem_vi, c.problem_zh, c.i18n_meta, 'problem'))}
      ${block('capa.correction', pair(c.correction_vi, c.correction_zh, c.i18n_meta, 'correction'))}
    </section>
    <section class="card capa-cause"><div class="card-head"><h3>${bi('capa.cause')}</h3>${edit ? `<button type="button" class="btn tiny" id="capa-cause-btn" ${online ? '' : 'disabled'}>${ICON.edit}<span>${bi(hasCause ? 'btn.edit' : 'capa.cause_btn')}</span></button>` : ''}</div>
      ${hasCause ? `<p>${pair(c.cause_vi, c.cause_zh, c.i18n_meta, 'cause')}</p>` : `<p class="muted small">${bi('capa.cause_empty')}</p>`}
    </section>
    <section class="card capa-acts"><div class="card-head"><h3>${bi('capa.actions')} <span class="muted small">${bi('capa.acts_n', { D: doneActs, N: live.length })}</span></h3>
      ${edit ? `<button type="button" class="btn tiny primary" id="capa-act-add" ${online ? '' : 'disabled'}>${ICON.plus}<span>${bi('capa.act_add')}</span></button>` : ''}</div>
      ${live.length ? `<ul class="plain capa-act-list">${live.map((a) => actionHtml(c, a, um, { online })).join('')}</ul>` : `<p class="muted small">${bi('capa.acts_empty')}</p>`}
      ${gone.length ? `<details class="ver-hist"><summary>${bi('capa.acts_cancelled_n', { N: gone.length })}</summary><ul class="plain capa-act-list">${gone.map((a) => actionHtml(c, a, um, { online })).join('')}</ul></details>` : ''}
    </section>
    <section class="card capa-files"><h3>${bi('capa.files')}</h3>
      ${files.length ? `<div class="row doc-row">${files.map((f) => docButton(f.document_id, f.kind, f.file_name, f.size_bytes)).join('')}</div>` : ''}
      ${qOps.length ? `<div class="rec-pages q">${qOps.map((o) => `<button type="button" class="rec-thumb" data-q="${esc(o.operation_id)}">${/^image\//.test(o.payload.mime_type) ? `<img alt="" data-b64="${esc(o.operation_id)}">` : ICON.file}<span class="small">${esc(o.payload.file_name || '')}</span></button>`).join('')}</div>
        <p class="muted small">${bi('rec.files_wait', { N: qOps.length })}</p>` : ''}
      ${!files.length && !qOps.length ? `<p class="muted small">${bi('capa.files_none')}</p>` : ''}
      ${canFiles ? `<div class="row"><label class="btn small file">${ICON.camera}<span>${bi('capa.files_add')}</span><input type="file" id="capa-file" accept="${esc(KIND_ACCEPT.RECORD)}" multiple hidden></label></div>` : ''}
    </section>
    ${hist.length || c.state === 'VERIFYING' ? `<section class="card capa-verify"><h3>${bi('capa.verify_sec')}</h3>
      ${c.state === 'VERIFYING' ? kv('capa.verify_due', `<span class="${c.verify_due && c.verify_due < t ? 't-red-text' : ''}">${esc(fmtDate(c.verify_due))}</span>`) : ''}
      ${hist.length ? `<ul class="plain">${hist.slice().reverse().map((h) => `<li class="capa-vh"><div class="rec-top"><strong>${bi('capa.verify_n', { N: h.n })}</strong>${badge('capa.result.' + h.result)}</div>
        <div class="muted small">${esc(fmtDate(h.date))} · ${who(h.by)}</div><p class="small">${pair(h.note_vi, h.note_zh)}</p></li>`).join('')}</ul>` : ''}
    </section>` : ''}
    ${wait ? `<p class="banner info small">${wait}</p>` : ''}
    ${edit && readyHint ? `<p class="muted small">${bi(readyHint)}</p>` : ''}
    ${acts2.length ? `<div class="row item-actions">${acts2.join('')}</div>` : ''}
    ${await can('report.run') ? `<a class="small rp-link" href="#/reports?kind=CAPA&capa=${encodeURIComponent(c.capa_id)}">${ICON.print} ${bi('capa.print')} ›</a>` : ''}
    ${!online && acts2.length ? `<p class="muted small">${bi('sync.need_network')}</p>` : ''}
  </div>`;
  wireDocButtons(view);
  const again = async (msgKey, vars) => { await afterCommit(); if (msgKey) toast(bi(msgKey, vars), 'ok'); if (ctx.isCurrent && !ctx.isCurrent()) return; refresh(); };
  const on = (sel, fn) => view.querySelectorAll(sel).forEach((b) => b.addEventListener('click', async () => { busy(b, true); try { await fn(b); } finally { busy(b, false); } }));
  const actById = (id) => acts.find((a) => a.action_id === id);
  // Thêm / sửa hành động: lỗi thì mở lại hộp thoại với chữ đã gõ
  const saveAction = async (a) => {
    let prev = null;
    for (;;) {
      const v = await actionDialog(c, a, prev);
      if (!v) return;
      prev = v;
      if (!v.content_vi && !v.content_zh) { toast(bi('capa.need_content'), 'err'); continue; }
      if (!v.due_date) { toast(bi('capa.need_due'), 'err'); continue; }
      const p = { action_id: a ? a.action_id : uuid(), capa_id: c.capa_id, ...v };
      const res = await writeOnline('capa.action.save', p, { expected_version: a ? a.record_version : 0 });
      if (res.ok) return again(a ? 'form.saved' : 'capa.act_added');
      writeFail(res);
      if (res.code !== 'VALIDATION_ERROR') return;
    }
  };
  on('#capa-act-add', () => saveAction(null));
  on('[data-aedit]', (b) => saveAction(actById(b.dataset.aedit)));
  on('[data-adone]', async (b) => {
    const a = actById(b.dataset.adone);
    let prev = null;
    for (;;) {
      const v = await doneDialog(a, prev);
      if (!v) return;
      prev = v;
      if (!v.result_vi && !v.result_zh) { toast(bi('capa.need_result'), 'err'); continue; }
      const res = await writeOnline('capa.action.done', { action_id: a.action_id, ...v }, { expected_version: a.record_version });
      if (res.ok) return again('capa.act_done_ok');
      writeFail(res);
      if (res.code !== 'VALIDATION_ERROR') return;
    }
  });
  on('[data-aundo]', async (b) => {
    const a = actById(b.dataset.aundo);
    const ok = await dialog({ title: bi('capa.act_reopen'), body: `<p>${bi('capa.act_reopen_confirm', { N: a.seq })}</p>`, actions: [{ label: bi('btn.cancel'), value: false }, { label: bi('capa.act_reopen'), kind: 'primary', value: true }] });
    if (!ok) return;
    const res = await writeOnline('capa.action.done', { action_id: a.action_id, undo: true }, { expected_version: a.record_version });
    if (res.ok) return again('form.saved');
    writeFail(res);
  });
  on('[data-acancel]', async (b) => {
    const a = actById(b.dataset.acancel);
    const reason = await askText('capa.act_cancel', 'field.reason', { required: true });
    if (reason === null) return;
    const res = await writeOnline('capa.action.cancel', { action_id: a.action_id, reason }, { expected_version: a.record_version });
    if (res.ok) return again('form.saved');
    writeFail(res);
  });
  on('#capa-cause-btn', async () => {
    const v = await causeDialog(c);
    if (!v) return;
    const res = await writeOnline('capa.save', { capa_id: c.capa_id, ...v }, { expected_version: c.record_version });
    if (res.ok) return again('form.saved');
    writeFail(res);
  });
  on('#capa-complete', async () => {
    const days = Number((session.settings || {}).capa_verify_days ?? 30);
    const v = await dialog({
      title: bi('capa.complete'),
      body: `<p>${bi('capa.complete_confirm')}</p><label class="fld"><span>${bi('capa.verify_due')}</span><input class="inp" type="date" id="cp-due" value="${esc(addDaysIso(today(), days))}"></label>
        <p class="muted small">${bi('capa.complete_note', { N: days })}</p>`,
      actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('capa.complete'), kind: 'primary', read: (w) => ({ verify_due: $('#cp-due', w).value }) }]
    });
    if (!v) return;
    const res = await writeOnline('capa.complete', { capa_id: c.capa_id, verify_due: v.verify_due || '' }, { expected_version: c.record_version });
    if (res.ok) return again('capa.completed_ok');
    writeFail(res);
  });
  on('#capa-uncomplete', async () => {
    const ok = await dialog({ title: bi('capa.uncomplete'), body: `<p>${bi('capa.uncomplete_confirm')}</p>`, actions: [{ label: bi('btn.cancel'), value: false }, { label: bi('capa.uncomplete'), kind: 'primary', value: true }] });
    if (!ok) return;
    const res = await writeOnline('capa.complete', { capa_id: c.capa_id, undo: true }, { expected_version: c.record_version });
    if (res.ok) return again('form.saved');
    writeFail(res);
  });
  on('#capa-verify', async () => {
    let prev = null;
    for (;;) {
      const v = await verifyDialog(c, prev);
      if (!v) return;
      prev = v;
      if (!v.result) { toast(bi('capa.need_verify_result'), 'err'); continue; }
      if (!v.note_vi && !v.note_zh) { toast(bi('capa.need_verify_note'), 'err'); continue; }
      const res = await writeWithPin('capa.verify', { capa_id: c.capa_id, ...v }, { expected_version: c.record_version });
      if (res.ok) return again(v.result === 'EFFECTIVE' ? 'capa.closed_ok' : 'capa.reopened_ok');
      writeFail(res);
      if (res.code !== 'VALIDATION_ERROR') return;
    }
  });
  on('#capa-cancel', async () => {
    const reason = await askText('capa.cancel', 'field.reason', { required: true, note: biText('capa.cancel_note') });
    if (reason === null) return;
    const res = await writeWithPin('capa.cancel', { capa_id: c.capa_id, reason }, { expected_version: c.record_version });
    if (res.ok) return again('capa.cancelled_ok');
    writeFail(res);
  });
  // Ảnh / tệp: vào hàng chờ (có mạng tự gửi) như hồ sơ
  const byOp = new Map(qOps.map((o) => [o.operation_id, o]));
  view.querySelectorAll('img[data-b64]').forEach((img) => {
    const o = byOp.get(img.dataset.b64);
    if (o && o.payload.content_b64) img.src = URL.createObjectURL(new Blob([b64ToBytes(o.payload.content_b64)], { type: o.payload.mime_type }));
  });
  view.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
    const o = byOp.get(b.dataset.q);
    if (o && /^image\//.test(o.payload.mime_type)) viewImage(new File([b64ToBytes(o.payload.content_b64)], o.payload.file_name || 'anh.jpg', { type: o.payload.mime_type }));
  }));
  const add = $('#capa-file', view);
  if (add) add.addEventListener('change', async (e) => {
    const fs = [...(e.target.files || [])];
    e.target.value = '';
    if (!fs.length) return;
    const lab = add.closest('label');
    busy(lab, true);
    let n = files.length + qOps.length;
    let added = 0;
    try {
      for (const f of fs) {
        if (n >= MAX_FILES) { toast(bi('capa.too_many_files'), 'err'); break; }
        const kind = recordFileKind(f);
        let blob = f, name = f.name, mime = mimeOf(f);
        if (kind === 'PHOTO') {
          try { const out = await processPhoto(f); blob = out.main; name = (f.name || 'anh').replace(/\.[^.]*$/, '') + '.jpg'; mime = 'image/jpeg'; } catch (err) { toast(bi('rec.photo_failed', { F: f.name || '' }), 'err'); continue; }
        } else if (kind === 'FILE') {
          const er = checkFile(f, 'FILE');
          if (er) { toast(bi(er), 'err'); continue; }
        } else { toast(bi('file.need_record'), 'err'); continue; }
        n++;
        await enqueue('doc.upload', { document_id: uuid(), entity_type: 'CAPA', entity_id: c.capa_id, kind, mime_type: mime, file_name: name, content_b64: await blobToB64(blob), page_no: n },
          { entity_type: 'DOCUMENT', entity_id: '', parent_id: c.capa_id, expected_version: 0 });
        added++;
      }
    } finally { busy(lab, false); }
    if (!added) return;
    await updateSyncStatus();
    toast(bi('capa.files_added', { N: added }), 'ok');
    if (navigator.onLine && !app.offline) await syncNow({ quiet: true });
    if (ctx.isCurrent && !ctx.isCurrent()) return;
    refresh();
  });
}

/* ====================== Thẻ ở chi tiết biểu ====================== */

/** Phiếu khắc phục liên quan đến biểu (và ghi chú khi biểu là phiếu / sổ khắc phục lập trong app); nút Lập phiếu khắc phục */
export async function itemCapaCard(it) {
  if (!(await capaOn()) || (!isSecretary() && roleLevel() < 2)) return '';
  const st = session.settings || {};
  const isForm = it.code && (it.code === st.capa_form_code || it.code === st.capa_log_form_code);
  const all = (await recs('CAPA')).filter((c) => !c.archived_at);
  const list = all.filter((c) => c.item_id === it.item_id).sort((a, b) => String(b.code).localeCompare(String(a.code)));
  const canNew = canCreateCapa(it.dept_code) && it.status !== 'NA';
  if (!isForm && !list.length && !canNew) return '';
  const am = await capaActMap();
  const um = await users();
  const open = list.filter((c) => c.state === 'OPEN' || c.state === 'VERIFYING');
  return `<section class="card capa-card"><h3>${bi('capa.card_title')}</h3>
    ${isForm ? `<p class="small">${bi('capa.card_form', { N: all.filter((c) => c.state !== 'CANCELLED').length })} <a href="#/capa">${bi('nav.capa')} ›</a></p>` : ''}
    ${open.length ? `<ul class="cat-list">${open.map((c) => capaRow(c, am.get(c.capa_id) || [], um)).join('')}</ul>` : (!isForm ? `<p class="muted small">${bi('capa.card_none')}</p>` : '')}
    ${list.length > open.length ? `<details class="ver-hist"><summary>${bi('capa.card_old_n', { N: list.length - open.length })}</summary><ul class="cat-list">${list.filter((c) => !open.includes(c)).map((c) => capaRow(c, am.get(c.capa_id) || [], um)).join('')}</ul></details>` : ''}
    ${canNew ? `<div class="row"><a class="btn small" href="#/capa/new${isForm ? '' : '?item=' + encodeURIComponent(it.item_id)}">${ICON.plus}<span>${bi('capa.new')}</span></a></div>` : ''}
  </section>`;
}
