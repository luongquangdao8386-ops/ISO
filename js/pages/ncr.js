// Sản phẩm không phù hợp (Đợt 3, phiên 3c — người dùng chốt 13/11/2026 giữ phạm vi Cơ điện, in theo mẫu BM-CL-04-01 / 04-02 / 04-04), mã NC-yymm-001.
// /ncr: sổ (Việc của tôi · Chờ quyết định · Đang xử lý · Quá hạn · Đã đóng · Tất cả); /ncr/new: lập phiếu; /ncr/:id: phiếu — thông tin, cách ly,
// quyết định xử lý (PIN; trưởng bộ phận / Quản trị — nhân nhượng, hủy bỏ chỉ cấp 4), lập phiếu khắc phục từ phiếu này, ảnh / tệp, xong xử lý
// và đóng (PIN), hủy phiếu (PIN), in phiếu / biên bản xử lý (báo cáo PDF / Excel); /ncr/:id/edit: sửa phiếu.
// Ghi cần mạng (ảnh / tệp vào hàng chờ như hồ sơ, có mạng tự gửi). Quyền phía app chỉ để ẩn/hiện nút (data.js); máy chủ kiểm lại và trả
// FORBIDDEN / lỗi dữ liệu trước khi hỏi PIN.
import { bi, biText, esc, fmtDate, fmtDateTime, badge, nameText, uuid, session, blobToB64, b64ToBytes } from '../core.js';
import { ICON, toast, dialog, $ } from '../ui.js';
import { byId, recs, depts, users, userName, isSecretary, roleLevel, today, addDaysIso, can, capaOn, CAPA_SEVERITIES, ncrOn, NCR_STAGES,
  NCR_DISPOSITIONS, NCR_TOP_DISPOSITIONS, canCreateNcr, canEditNcr, canDecideNcr, canDecideTop, canCloseNcr, canCancelNcr, canNcrFiles,
  ncrOverdue, ncrNeedsRecheck, canCreateCapa } from '../data.js';
import { navigate, refresh } from '../router.js';
import { app, afterCommit, syncNow, updateSyncStatus } from '../app.js';
import { enqueue, queueItems } from '../sync.js';
import { textInput, selectInput, bilingualInputs, dateInput, wireForm, readField, showErrors, writeOnline, writeWithPin, writeFail, busy } from '../form.js';
import { docButton, wireDocButtons, checkFile, recordFileKind, mimeOf, KIND_ACCEPT, viewImage } from '../files.js';
import { processPhoto } from '../media.js';

const MAX_FILES = 30;
const MAX_LINES = 6;

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
const live = (n) => n.state === 'OPEN' || n.state === 'DECIDED';

/** Tên phiếu (một dòng): sản phẩm — đầu mô tả */
export function ncrTitle(n) {
  let s = String(n.problem_vi || n.problem_zh || '').split('\n')[0];
  if (s.length > 100) s = s.slice(0, 97) + '…';
  return [n.product_text, s].filter(Boolean).join(' — ');
}

/** Cách xử lý (một dòng chữ) */
export function linesText(lines) {
  return (lines || []).map((l) => `${bi('ncr.disp.' + l.d)}${l.qty ? ' ' + esc(l.qty) : ''}`).join('; ');
}

export function ncrBadges(n) {
  return badge('ncr.state.' + n.state) + (ncrOverdue(n) ? ' ' + badge('capa.overdue') : '');
}

/** Một dòng phiếu trong danh sách */
export function ncrRow(n, um) {
  const due = n.state === 'OPEN' ? bi('ncr.decide_due_short', { D: esc(fmtDate(n.decide_due)) }) : n.state === 'DECIDED' ? bi('capa.due_short', { D: esc(fmtDate(n.exec_due)) }) : '';
  return `<li><a class="cat-row ncr-row" href="#/ncr/${encodeURIComponent(n.ncr_id)}">
    <span class="cat-top"><span class="code">${esc(n.code)}</span>${ncrBadges(n)}</span>
    <span class="cat-name">${esc(ncrTitle(n))}</span>
    <span class="cat-meta muted">${esc(n.dept_code)} · ${esc(fmtDate(n.found_date))} · ${bi('ncr.stage_short.' + n.stage)}${n.qty_text ? ' · ' + esc(n.qty_text) : ''}${n.owner_user_id ? ' · ' + esc(userName(um, n.owner_user_id)) : ''}${due ? ` · <span class="${ncrOverdue(n) ? 't-red-text' : ''}">${due}</span>` : ''}${n.state === 'DECIDED' && (n.decision_json || []).length ? ' · ' + linesText(n.decision_json) : ''}</span>
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

async function userOptions() {
  const um = await users();
  return [...um.values()].filter((u) => u.active !== false).sort((a, b) => String(a.display_name).localeCompare(String(b.display_name)))
    .map((u) => [u.user_id, `${esc(u.display_name)} (${esc(u.employee_code)})`]);
}

/* ====================== Sổ (/ncr) ====================== */

const TABS = ['mine', 'decide', 'doing', 'overdue', 'closed', 'all'];
let curTab = '';

export async function renderNcrs(view, { shell, query }) {
  shell.setScreen({ title: 'nav.ncr', back: '/' });
  if (!(await ncrOn())) { view.innerHTML = `<div class="card empty-state">${ICON.alert}<p class="muted">${bi('ncr.server_old')}</p></div>`; return; }
  if (!isSecretary() && roleLevel() < 2) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('err.forbidden')}</p></div>`; return; }
  const all = (await recs('NCR')).filter((n) => !n.archived_at);
  const uid = myId();
  const by = {
    mine: all.filter((n) => live(n) && (n.owner_user_id === uid || (n.state === 'OPEN' && canDecideNcr(n)))),
    decide: all.filter((n) => n.state === 'OPEN'),
    doing: all.filter((n) => n.state === 'DECIDED'),
    overdue: all.filter((n) => ncrOverdue(n)),
    closed: all.filter((n) => n.state === 'CLOSED'),
    all
  };
  if (query && TABS.includes(query.f)) curTab = query.f;
  if (!TABS.includes(curTab)) curTab = TABS.find((t) => t !== 'all' && t !== 'closed' && by[t].length) || 'all';
  const um = await users();
  const dueOf = (n) => (n.state === 'OPEN' ? n.decide_due : n.exec_due) || '9999';
  const shown = by[curTab].slice().sort((a, b) => (curTab === 'all' || curTab === 'closed'
    ? String(b.code).localeCompare(String(a.code))
    : String(dueOf(a)).localeCompare(String(dueOf(b))) || String(a.code).localeCompare(String(b.code))));
  const canNew = isSecretary() || (await depts()).some((d) => d.active !== false && canCreateNcr(d.dept_code));
  view.innerHTML = `<div class="row list-head ncr-head">${canNew ? `<a class="btn primary" href="#/ncr/new" id="ncr-new">${ICON.plus}<span>${bi('ncr.new')}</span></a>` : ''}
      ${await can('report.run') ? `<a class="btn" href="#/reports?kind=NCR" id="ncr-log">${ICON.reports}<span>${bi('ncr.log_report')}</span></a>` : ''}</div>
    <div class="chips tabs">${TABS.filter((t) => t === 'all' || t === curTab || by[t].length).map((t) => `<button type="button" class="chip${t === curTab ? ' on' : ''}" data-tab="${t}">${bi('ncr.tab.' + t)} <b>${by[t].length}</b></button>`).join('')}</div>
    ${shown.length ? `<ul class="cat-list">${shown.map((n) => ncrRow(n, um)).join('')}</ul>`
      : `<div class="card empty-state">${ICON.check}<p class="muted">${bi(all.length ? 'capa.none_tab' : 'ncr.none')}</p></div>`}
    <p class="muted small">${bi('ncr.how')}</p>`;
  view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { curTab = b.dataset.tab; renderNcrs(view, { shell, query: {} }); }));
}

/* ====================== Lập / sửa phiếu (/ncr/new, /ncr/:id/edit) ====================== */

const chipGroup = (name, opts, val, { allowNone = false } = {}) => `<div class="chips" role="radiogroup" data-chips="${name}"${allowNone ? ' data-none="1"' : ''}>${opts.map(([v, lab]) => `<button type="button" class="chip${v === val ? ' on' : ''}" data-v="${esc(v)}" role="radio" aria-checked="${v === val}">${bi(lab)}</button>`).join('')}</div>`;
const chipVal = (form, name) => { const on = form.querySelector(`[data-chips="${name}"] .chip.on`); return on ? on.dataset.v : ''; };

const TEXT = ['found_by_name', 'ref_text', 'product_text', 'lot_text', 'qty_text', 'party_name', 'hold_place'];
const BI = ['problem', 'contain', 'cause'];

export async function renderNcrForm(view, { shell, params }) {
  const editing = !!(params && params.id);
  const n = editing ? await byId('NCR', params.id) : null;
  const backTo = editing ? '/ncr/' + encodeURIComponent(params.id) : '/ncr';
  const title = editing ? 'ncr.edit' : 'ncr.new';
  shell.setScreen({ title, back: backTo });
  if (!(await ncrOn())) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('ncr.server_old')}</p></div>`; return; }
  if (editing && !n) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('ncr.not_found')}</p></div>`; return; }
  if (editing && (!canEditNcr(n) || !live(n))) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('ncr.no_edit')}</p></div>`; return; }
  if (needNet(view)) return;
  const deps = (await depts()).filter((d) => d.active !== false && (canCreateNcr(d.dept_code) || (n && n.dept_code === d.dept_code)));
  if (!deps.length) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('err.forbidden')}</p></div>`; return; }
  const t = today();
  const v = {
    stage: n ? n.stage : 'PROCESS', dept_code: n ? n.dept_code : (deps.length === 1 ? deps[0].dept_code : ''), found_date: n ? n.found_date : t,
    owner_user_id: n ? n.owner_user_id : myId(), severity: n ? n.severity || '' : '', i18n_meta: n ? n.i18n_meta : null
  };
  TEXT.forEach((k) => { v[k] = n ? n[k] || '' : ''; });
  BI.forEach((b) => { v[b + '_vi'] = n ? n[b + '_vi'] || '' : ''; v[b + '_zh'] = n ? n[b + '_zh'] || '' : ''; });
  const uOpts = await userOptions();
  const decideDays = Number((session.settings || {}).ncr_decide_days ?? 2);
  view.innerHTML = `<form class="card form ncr-form" novalidate>
    <div class="fld" data-field="stage"><label>${bi('ncr.stage')} <span class="req">*</span></label>${chipGroup('stage', NCR_STAGES.map((s) => [s, 'ncr.stage.' + s]), v.stage)}<div class="ferr"></div></div>
    <div class="form-grid">
      ${selectInput('dept_code', 'ncr.dept', deps.map((d) => [d.dept_code, esc(d.dept_code + ' · ' + nameText(d))]), v.dept_code, { required: true })}
      ${dateInput('found_date', 'ncr.found_date', v.found_date, { required: true, hint: editing ? '' : biText('ncr.found_date_hint', { N: decideDays }) })}
      ${textInput('found_by_name', 'ncr.found_by', v.found_by_name, { maxlength: 120, hint: biText('capa.found_by_hint') })}
      ${textInput('ref_text', 'ncr.ref', v.ref_text, { maxlength: 200, hint: biText('ncr.ref_hint') })}
    </div>
    <fieldset class="ncr-prod"><legend>${bi('ncr.product_sec')}</legend>
      <div class="form-grid">
        ${textInput('product_text', 'ncr.product', v.product_text, { maxlength: 200, required: true, hint: biText('ncr.product_hint') })}
        ${textInput('lot_text', 'ncr.lot', v.lot_text, { maxlength: 200 })}
        ${textInput('qty_text', 'ncr.qty', v.qty_text, { maxlength: 100, hint: biText('ncr.qty_hint') })}
        ${textInput('party_name', 'ncr.party', v.party_name, { maxlength: 200, hint: biText('ncr.party_hint') })}
      </div>
      <div class="fld" data-field="severity"><label>${bi('capa.severity')}</label>${chipGroup('severity', CAPA_SEVERITIES.map((x) => [x, 'capa.sev.' + x]), v.severity, { allowNone: true })}<div class="ferr"></div></div>
    </fieldset>
    ${bilingualInputs('problem', v, { labelKey: 'ncr.problem', area: true, maxlength: 3000 })}
    ${bilingualInputs('contain', v, { labelKey: 'ncr.contain', area: true, maxlength: 3000, required: false })}
    <p class="muted small">${bi('ncr.contain_hint')}</p>
    ${textInput('hold_place', 'ncr.hold_place', v.hold_place, { maxlength: 200 })}
    ${bilingualInputs('cause', v, { labelKey: 'ncr.cause', area: true, maxlength: 3000, required: false })}
    ${selectInput('owner_user_id', 'ncr.owner', uOpts, v.owner_user_id, { empty: '', hint: biText('ncr.owner_hint') })}
    <p class="form-err err"></p>
    <div class="row"><a class="btn" href="#${backTo}">${bi('btn.cancel')}</a>
      <button type="submit" class="btn primary" id="ncr-save">${ICON.check}<span>${bi(editing ? 'btn.save' : 'capa.create')}</span></button></div>
    ${editing ? '' : `<p class="muted small">${bi('ncr.flow_note')}</p>`}
  </form>`;
  const form = $('form', view);
  wireForm(form);
  form.querySelectorAll('[data-chips]').forEach((g) => g.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => {
    const off = g.dataset.none === '1' && b.classList.contains('on');
    g.querySelectorAll('[data-v]').forEach((x) => { const on = !off && x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); });
  })));
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const p = { ncr_id: editing ? n.ncr_id : uuid() };
    const errs = [];
    p.stage = chipVal(form, 'stage');
    if (!p.stage) errs.push({ field: 'stage', key: 'field.required' });
    p.dept_code = readField(form, 'dept_code');
    if (!p.dept_code) errs.push({ field: 'dept_code', key: 'field.required' });
    p.owner_user_id = readField(form, 'owner_user_id') || '';
    p.severity = chipVal(form, 'severity');
    TEXT.forEach((k) => { p[k] = readField(form, k) || ''; });
    BI.forEach((b) => ['vi', 'zh'].forEach((l) => { p[b + '_' + l] = readField(form, b + '_' + l) || ''; }));
    if (!p.product_text) errs.push({ field: 'product_text', key: 'field.required' });
    if (!p.problem_vi && !p.problem_zh) errs.push({ field: 'problem', key: 'field.one_lang' });
    const found = readField(form, 'found_date');
    if (!found) errs.push({ field: 'found_date', key: found === null ? 'field.invalid_date' : 'field.required' }); else p.found_date = found;
    if (errs.length) { showErrors(form, errs); return; }
    const btn = $('#ncr-save', form);
    busy(btn, true);
    const r = await writeOnline('ncr.save', p, { expected_version: editing ? n.record_version : 0 });
    busy(btn, false);
    if (r.ok) {
      await afterCommit();
      toast(editing ? bi('form.saved') : bi('capa.created_ok', { C: esc((r.data && r.data.record && r.data.record.code) || '') }), 'ok');
      navigate('/ncr/' + encodeURIComponent(p.ncr_id), { replace: true });
      return;
    }
    if (r.code === 'VALIDATION_ERROR') { showErrors(form, r.errors); return; }
    writeFail(r);
  });
}

/* ====================== Chi tiết phiếu (/ncr/:id) ====================== */

/** Một dòng cách xử lý trong hộp thoại quyết định */
function lineHtml(l, i, top) {
  return `<div class="ncr-line" data-line="${i}">
    <select class="inp sel" data-k="d" aria-label="${esc(biText('ncr.disp'))}"><option value="">${esc(biText('field.choose'))}</option>${NCR_DISPOSITIONS.map((d) => `<option value="${d}"${l.d === d ? ' selected' : ''}${NCR_TOP_DISPOSITIONS.includes(d) && !top ? ' disabled' : ''}>${esc(biText('ncr.disp.' + d))}${NCR_TOP_DISPOSITIONS.includes(d) && !top ? ' — ' + esc(biText('ncr.top_only_short')) : ''}</option>`).join('')}</select>
    <input class="inp" type="text" maxlength="100" data-k="qty" value="${esc(l.qty || '')}" placeholder="${esc(biText('ncr.line_qty'))}" autocomplete="off">
    <input class="inp" type="text" maxlength="300" data-k="note" value="${esc(l.note || '')}" placeholder="${esc(biText('ncr.line_note'))}" autocomplete="off">
    <button type="button" class="icon-btn" data-del="${i}" aria-label="${esc(biText('btn.delete'))}">${ICON.x}</button>
  </div>`;
}

/** Hộp thoại quyết định xử lý; trả payload hoặc null */
async function decideDialog(n, prev) {
  const top = canDecideTop();
  const v = prev || {
    lines: (n.decision_json || []).length ? n.decision_json.map((l) => ({ ...l })) : [{ d: '', qty: n.qty_text || '', note: '' }],
    need_capa: n.need_capa || '', concession_text: n.concession_text || '', decision_date: today(),
    exec_due: n.state === 'DECIDED' && n.exec_due ? n.exec_due : addDaysIso(today(), Number((session.settings || {}).ncr_exec_days ?? 7)),
    note_vi: '', note_zh: ''
  };
  let lines = v.lines.map((l) => ({ ...l }));
  const read = (w) => {
    lines = [...w.querySelectorAll('.ncr-line')].map((r) => ({ d: r.querySelector('[data-k="d"]').value, qty: r.querySelector('[data-k="qty"]').value.trim(), note: r.querySelector('[data-k="note"]').value.trim() }));
    return lines;
  };
  const drawLines = (w) => {
    $('#nd-lines', w).innerHTML = lines.map((l, i) => lineHtml(l, i, top)).join('');
    $('#nd-add', w).disabled = lines.length >= MAX_LINES;
    w.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { read(w); lines.splice(Number(b.dataset.del), 1); if (!lines.length) lines.push({ d: '', qty: '', note: '' }); drawLines(w); }));
    w.querySelectorAll('[data-k="d"]').forEach((s) => s.addEventListener('change', () => { read(w); $('#nd-conc', w).hidden = !lines.some((l) => l.d === 'CONCESSION'); }));
    $('#nd-conc', w).hidden = !lines.some((l) => l.d === 'CONCESSION');
  };
  return dialog({
    title: bi(n.state === 'DECIDED' ? 'ncr.redecide' : 'ncr.decide'),
    wide: true,
    body: `<p class="muted small">${bi(top ? 'ncr.decide_hint' : 'ncr.decide_hint_top')}</p>
      <div class="fld"><span>${bi('ncr.disp')} <span class="req">*</span></span><div id="nd-lines" class="ncr-lines"></div>
        <button type="button" class="btn small" id="nd-add">${ICON.plus}<span>${bi('ncr.line_add')}</span></button></div>
      <label class="fld" id="nd-conc"><span>${bi('ncr.concession')} <span class="req">*</span></span><textarea class="inp" rows="2" maxlength="500" id="nd-conc-text">${esc(v.concession_text || '')}</textarea><div class="hint">${bi('ncr.concession_hint')}</div></label>
      <div class="fld"><span>${bi('ncr.need_capa')} <span class="req">*</span></span><div class="chips" role="radiogroup" id="nd-capa">${['YES', 'NO'].map((x) => `<button type="button" class="chip${v.need_capa === x ? ' on' : ''}" data-cap="${x}" role="radio" aria-checked="${v.need_capa === x}">${bi('ncr.need_capa.' + x)}</button>`).join('')}</div><div class="hint">${bi('ncr.need_capa_hint')}</div></div>
      <div class="form-grid">
        <label class="fld"><span>${bi('ncr.decision_date')}</span><input class="inp" type="date" id="nd-date" value="${esc(v.decision_date || today())}"></label>
        <label class="fld"><span>${bi('ncr.exec_due')}</span><input class="inp" type="date" id="nd-due" value="${esc(v.exec_due || '')}"></label>
      </div>
      <fieldset class="bi-pair"><legend>${bi('ncr.decision_note')}</legend>
        <label class="fld"><span>${bi('i18n.lang_vi')}</span><textarea class="inp" rows="2" maxlength="2000" id="nd-vi">${esc(v.note_vi || '')}</textarea></label>
        <label class="fld"><span>${bi('i18n.lang_zh')}</span><textarea class="inp" rows="2" maxlength="2000" id="nd-zh">${esc(v.note_zh || '')}</textarea></label>
        <div class="hint">${bi('ncr.decision_note_hint')}</div></fieldset>`,
    onOpen: (w) => {
      drawLines(w);
      $('#nd-add', w).addEventListener('click', () => { read(w); if (lines.length < MAX_LINES) lines.push({ d: '', qty: '', note: '' }); drawLines(w); });
      w.querySelectorAll('[data-cap]').forEach((b) => b.addEventListener('click', () => {
        w.querySelectorAll('[data-cap]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
      }));
    },
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('ncr.decide_save'), kind: 'primary', read: (w) => {
      const on = w.querySelector('[data-cap].on');
      return { lines: read(w).filter((l) => l.d || l.qty || l.note), need_capa: on ? on.dataset.cap : '', concession_text: $('#nd-conc-text', w).value.trim(),
        decision_date: $('#nd-date', w).value, exec_due: $('#nd-due', w).value, note_vi: $('#nd-vi', w).value.trim(), note_zh: $('#nd-zh', w).value.trim() };
    } }]
  });
}

/** Hộp thoại xong xử lý — đóng phiếu */
async function closeDialog(n, prev) {
  const must = ncrNeedsRecheck(n);
  const v = prev || { done_date: today(), result_vi: '', result_zh: '', recheck: must ? 'PASS' : '' };
  return dialog({
    title: bi('ncr.close'),
    wide: true,
    body: `<p class="small">${bi('ncr.close_lines')}: <strong>${linesText(n.decision_json)}</strong></p>
      <label class="fld"><span>${bi('ncr.done_date')} <span class="req">*</span></span><input class="inp" type="date" id="nc-date" value="${esc(v.done_date || today())}"></label>
      <fieldset class="bi-pair"><legend>${bi('ncr.result')} <span class="req">*</span></legend>
        <label class="fld"><span>${bi('i18n.lang_vi')}</span><textarea class="inp" rows="3" maxlength="3000" id="nc-vi">${esc(v.result_vi || '')}</textarea></label>
        <label class="fld"><span>${bi('i18n.lang_zh')}</span><textarea class="inp" rows="2" maxlength="3000" id="nc-zh">${esc(v.result_zh || '')}</textarea></label>
        <div class="hint">${bi('ncr.result_hint')}</div></fieldset>
      <div class="fld"><span>${bi('ncr.recheck')} <span class="req">*</span></span><div class="chips" role="radiogroup" id="nc-re">${['PASS', 'NA'].map((x) => `<button type="button" class="chip${v.recheck === x ? ' on' : ''}" data-re="${x}" role="radio" aria-checked="${v.recheck === x}"${x === 'NA' && must ? ' disabled' : ''}>${bi('ncr.recheck.' + x)}</button>`).join('')}</div>
        <div class="hint">${bi(must ? 'ncr.recheck_must' : 'ncr.recheck_hint')}</div></div>`,
    onOpen: (w) => w.querySelectorAll('[data-re]').forEach((b) => b.addEventListener('click', () => {
      w.querySelectorAll('[data-re]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
    })),
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('ncr.close_save'), kind: 'primary', read: (w) => {
      const on = w.querySelector('[data-re].on');
      return { done_date: $('#nc-date', w).value, result_vi: $('#nc-vi', w).value.trim(), result_zh: $('#nc-zh', w).value.trim(), recheck: on ? on.dataset.re : '' };
    } }]
  });
}

/** Thẻ quyết định xử lý hiện hành + các lần trước */
function decisionHtml(n, who) {
  const lines = n.decision_json || [];
  const hist = Array.isArray(n.decision_history_json) ? n.decision_history_json : [];
  if (!lines.length) return `<p class="small ${ncrOverdue(n) ? 't-red-text' : 'muted'}">${bi('ncr.not_decided', { D: esc(fmtDate(n.decide_due)) })}</p>`;
  return `<ul class="plain ncr-lines-view">${lines.map((l) => `<li><span class="ncr-disp">${badge('ncr.disp.' + l.d)}</span> <strong>${esc(l.qty || '')}</strong>${l.note ? ` <span class="muted small">${esc(l.note)}</span>` : ''}</li>`).join('')}</ul>
    ${n.concession_text ? kv('ncr.concession', esc(n.concession_text)) : ''}
    ${n.decision_note_vi || n.decision_note_zh ? block('ncr.decision_note', pair(n.decision_note_vi, n.decision_note_zh, n.i18n_meta, 'decision_note')) : ''}
    ${kv('ncr.decided_by', `${who(n.decided_by)} · ${esc(fmtDate(n.decision_date))}`)}
    ${n.state === 'DECIDED' ? kv('ncr.exec_due', `<span class="${ncrOverdue(n) ? 't-red-text' : ''}">${esc(fmtDate(n.exec_due))}</span>`) : ''}
    ${kv('ncr.need_capa', bi('ncr.need_capa.' + (n.need_capa || 'NO')))}
    ${hist.length > 1 ? `<details class="ver-hist"><summary>${bi('ncr.history_n', { N: hist.length - 1 })}</summary><ul class="plain">${hist.slice(0, -1).reverse().map((h) => `<li class="ncr-hist"><div class="rec-top"><strong>${bi('ncr.decision_n_t', { N: h.n })}</strong> <span class="muted small">${esc(fmtDate(h.date))} · ${who(h.by)}</span></div>
      <div class="small">${linesText(h.lines)}</div>${h.note_vi || h.note_zh ? `<p class="small">${pair(h.note_vi, h.note_zh)}</p>` : ''}</li>`).join('')}</ul></details>` : ''}`;
}

export async function renderNcr(view, ctx) {
  const { shell, params } = ctx;
  const n = await byId('NCR', params.id);
  shell.setScreen({ title: 'ncr.title', back: '/ncr' });
  if (!n) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('ncr.not_found')}</p><a class="btn" href="#/ncr">${bi('nav.ncr')}</a></div>`; return; }
  const um = await users();
  const who = (id) => esc(userName(um, id) || '');
  const online = navigator.onLine && !app.offline;
  const edit = live(n) && canEditNcr(n);
  const files = n.files_json || [];
  const qOps = (await queueItems().catch(() => [])).filter((o) => o.action === 'doc.upload' && o.parent_id === n.ncr_id && o.user_id === myId() && o.dataset_epoch === session.epoch);
  const canFiles = canNcrFiles(n) && files.length + qOps.length < MAX_FILES;
  const capa = n.capa_id ? await byId('CAPA', n.capa_id) : null;
  const capaLive = capa && !capa.archived_at && capa.state !== 'CANCELLED' ? capa : null;
  const capaReady = await capaOn();
  const canCapa = capaReady && n.state !== 'CANCELLED' && !capaLive && canCreateCapa(n.dept_code);
  const needCapa = n.state === 'DECIDED' && n.need_capa === 'YES' && !capaLive;
  const decided = (n.decision_json || []).length > 0;
  const btns = [];
  if (live(n) && canDecideNcr(n)) btns.push(`<button type="button" class="btn ${n.state === 'OPEN' ? 'primary' : ''}" id="ncr-decide" ${online ? '' : 'disabled'}>${ICON.check}<span>${bi(n.state === 'DECIDED' ? 'ncr.redecide' : 'ncr.decide')}</span></button>`);
  if (n.state === 'DECIDED' && canCloseNcr(n)) btns.push(`<button type="button" class="btn primary" id="ncr-close" ${online && !needCapa ? '' : 'disabled'}>${ICON.check}<span>${bi('ncr.close')}</span></button>`);
  if (live(n) && canCancelNcr(n)) btns.push(`<button type="button" class="btn danger" id="ncr-cancel" ${online ? '' : 'disabled'}>${ICON.trash}<span>${bi('ncr.cancel')}</span></button>`);
  let wait = '';
  if (n.state === 'OPEN' && !canDecideNcr(n)) wait = bi(n.created_by === myId() && roleLevel() >= 3 ? 'ncr.wait_decide_self' : 'ncr.wait_decide', { D: esc(fmtDate(n.decide_due)) });
  const reportOn = await can('report.run');
  const st = session.settings || {};
  view.innerHTML = `<div class="item ncr">
    <section class="card item-head">
      <div class="rec-top"><span class="code big">${esc(n.code)}</span>${ncrBadges(n)}</div>
      <h2 class="item-name ncr-name">${esc(ncrTitle(n))}</h2>
      <div class="rec-badges">${badge('ncr.stage.' + n.stage)}${n.severity ? ' ' + badge('capa.sev.' + n.severity) : ''} <span class="small">${esc(n.dept_code)}</span></div>
      ${n.state === 'CLOSED' ? `<p class="banner ok small">${bi('ncr.closed_by', { U: who(n.closed_by), D: esc(fmtDate(n.done_date || n.closed_at)) })}</p>` : ''}
      ${n.state === 'CANCELLED' ? `<p class="banner small">${bi('capa.cancelled_by', { U: who(n.cancelled_by), D: esc(fmtDate(n.cancelled_at)) })}${n.cancel_reason ? ': ' + esc(n.cancel_reason) : ''}</p>` : ''}
      ${n.state === 'OPEN' ? `<p class="banner ${ncrOverdue(n) ? 'err' : 'info'} small">${bi('ncr.open_note', { D: esc(fmtDate(n.decide_due)) })}</p>` : ''}
      ${needCapa ? `<p class="banner err small">${bi('ncr.need_capa_note')}</p>` : ''}
    </section>
    <section class="card"><div class="card-head"><h3>${bi('ncr.info')}</h3>${edit ? `<a class="btn tiny" href="#/ncr/${encodeURIComponent(n.ncr_id)}/edit" id="ncr-edit">${ICON.edit}<span>${bi('btn.edit')}</span></a>` : ''}</div>
      ${kv('ncr.found_date', esc(fmtDate(n.found_date)))}
      ${kv('ncr.found_by', esc(n.found_by_name || ''))}
      ${kv('ncr.dept', esc(n.dept_code))}
      ${kv('ncr.ref', esc(n.ref_text || ''))}
      ${kv('ncr.product', esc(n.product_text || ''))}
      ${kv('ncr.lot', esc(n.lot_text || ''))}
      ${kv('ncr.qty', esc(n.qty_text || ''))}
      ${kv('ncr.party', esc(n.party_name || ''))}
      ${kv('ncr.owner', who(n.owner_user_id))}
      ${kv('capa.created', `${who(n.created_by)} <span class="muted small">${esc(fmtDateTime(n.created_at))}</span>`)}
      ${block('ncr.problem', pair(n.problem_vi, n.problem_zh, n.i18n_meta, 'problem'))}
      ${block('ncr.contain', pair(n.contain_vi, n.contain_zh, n.i18n_meta, 'contain'))}
      ${kv('ncr.hold_place', esc(n.hold_place || ''))}
      ${n.cause_vi || n.cause_zh ? block('ncr.cause', pair(n.cause_vi, n.cause_zh, n.i18n_meta, 'cause')) : ''}
    </section>
    <section class="card ncr-decision"><h3>${bi('ncr.decision')}</h3>${decisionHtml(n, who)}</section>
    ${n.state === 'CLOSED' ? `<section class="card ncr-result"><h3>${bi('ncr.result_sec')}</h3>
      ${kv('ncr.done_date', esc(fmtDate(n.done_date)))}
      ${block('ncr.result', pair(n.result_vi, n.result_zh, n.i18n_meta, 'result'))}
      ${kv('ncr.recheck', badge('ncr.recheck.' + (n.recheck || 'NA')))}
      ${kv('ncr.closed_by_kv', `${who(n.closed_by)} · ${esc(fmtDateTime(n.closed_at))}`)}</section>` : ''}
    <section class="card ncr-capa"><h3>${bi('ncr.capa')}</h3>
      ${capa ? `<a class="cat-row" href="#/capa/${encodeURIComponent(capa.capa_id)}" id="ncr-capa-link"><span class="cat-top"><span class="code">${esc(capa.code)}</span>${badge('capa.state.' + capa.state)}</span><span class="cat-name">${esc(capa.title_vi || capa.title_zh || String(capa.problem_vi || capa.problem_zh || '').split('\n')[0])}</span>${ICON.chevron}</a>` : ''}
      ${!capaLive ? `<p class="muted small">${bi(n.need_capa === 'YES' ? 'ncr.capa_need' : 'ncr.capa_none')}</p>` : ''}
      ${canCapa ? `<div class="row"><a class="btn small${needCapa ? ' primary' : ''}" id="ncr-capa-new" href="#/capa/new?ncr=${encodeURIComponent(n.ncr_id)}">${ICON.plus}<span>${bi('capa.new')}</span></a></div>` : ''}
    </section>
    <section class="card ncr-files"><h3>${bi('capa.files')}</h3>
      ${files.length ? `<div class="row doc-row">${files.map((f) => docButton(f.document_id, f.kind, f.file_name, f.size_bytes)).join('')}</div>` : ''}
      ${qOps.length ? `<div class="rec-pages q">${qOps.map((o) => `<button type="button" class="rec-thumb" data-q="${esc(o.operation_id)}">${/^image\//.test(o.payload.mime_type) ? `<img alt="" data-b64="${esc(o.operation_id)}">` : ICON.file}<span class="small">${esc(o.payload.file_name || '')}</span></button>`).join('')}</div>
        <p class="muted small">${bi('rec.files_wait', { N: qOps.length })}</p>` : ''}
      ${!files.length && !qOps.length ? `<p class="muted small">${bi('ncr.files_none')}</p>` : ''}
      ${canFiles ? `<div class="row"><label class="btn small file">${ICON.camera}<span>${bi('capa.files_add')}</span><input type="file" id="ncr-file" accept="${esc(KIND_ACCEPT.RECORD)}" multiple hidden></label></div>` : ''}
    </section>
    ${wait ? `<p class="banner info small">${wait}</p>` : ''}
    ${needCapa && canCloseNcr(n) ? `<p class="muted small">${bi('ncr.close_need_capa')}</p>` : ''}
    ${btns.length ? `<div class="row item-actions">${btns.join('')}</div>` : ''}
    ${reportOn ? `<div class="capa-prints ncr-prints">${['NCR'].concat(decided ? ['DECISION'] : []).map((f) => {
      const code = st[f === 'NCR' ? 'ncr_form_code' : 'ncr_decision_form_code'] || '';
      return `<a class="small rp-link" data-form="${f}" href="#/reports?kind=NCR&ncr=${encodeURIComponent(n.ncr_id)}&form=${f}">${ICON.print} ${bi('ncr.print.' + f)}${code ? ` <span class="code">${esc(code)}</span>` : ''} ›</a>`;
    }).join('')}</div>` : ''}
    ${!online && btns.length ? `<p class="muted small">${bi('sync.need_network')}</p>` : ''}
  </div>`;
  wireDocButtons(view);
  const again = async (msgKey, vars) => { await afterCommit(); if (msgKey) toast(bi(msgKey, vars), 'ok'); if (ctx.isCurrent && !ctx.isCurrent()) return; refresh(); };
  const on = (sel, fn) => view.querySelectorAll(sel).forEach((b) => b.addEventListener('click', async () => { busy(b, true); try { await fn(b); } finally { busy(b, false); } }));
  on('#ncr-decide', async () => {
    let prev = null;
    for (;;) {
      const v = await decideDialog(n, prev);
      if (!v) return;
      prev = v;
      if (!v.lines.length || v.lines.some((l) => !l.d)) { toast(bi('ncr.need_lines'), 'err'); continue; }
      if (v.lines.some((l) => l.d === 'CONCESSION') && !v.concession_text) { toast(bi('ncr.need_concession'), 'err'); continue; }
      if (!v.need_capa) { toast(bi('ncr.need_need_capa'), 'err'); continue; }
      const res = await writeWithPin('ncr.decide', { ncr_id: n.ncr_id, ...v }, { expected_version: n.record_version });
      if (res.ok) return again('ncr.decided_ok');
      writeFail(res);
      if (res.code !== 'VALIDATION_ERROR') return;
    }
  });
  on('#ncr-close', async () => {
    let prev = null;
    for (;;) {
      const v = await closeDialog(n, prev);
      if (!v) return;
      prev = v;
      if (!v.done_date) { toast(bi('ncr.need_done_date'), 'err'); continue; }
      if (!v.result_vi && !v.result_zh) { toast(bi('ncr.need_result'), 'err'); continue; }
      if (!v.recheck) { toast(bi('ncr.need_recheck'), 'err'); continue; }
      const res = await writeWithPin('ncr.close', { ncr_id: n.ncr_id, ...v }, { expected_version: n.record_version });
      if (res.ok) return again('ncr.closed_ok');
      writeFail(res);
      if (res.code !== 'VALIDATION_ERROR') return;
    }
  });
  on('#ncr-cancel', async () => {
    const reason = await askText('ncr.cancel', 'field.reason', { required: true, note: biText('ncr.cancel_note') });
    if (reason === null) return;
    const res = await writeWithPin('ncr.cancel', { ncr_id: n.ncr_id, reason }, { expected_version: n.record_version });
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
  const add = $('#ncr-file', view);
  if (add) add.addEventListener('change', async (e) => {
    const fs = [...(e.target.files || [])];
    e.target.value = '';
    if (!fs.length) return;
    const lab = add.closest('label');
    busy(lab, true);
    let cnt = files.length + qOps.length;
    let added = 0;
    try {
      for (const f of fs) {
        if (cnt >= MAX_FILES) { toast(bi('capa.too_many_files'), 'err'); break; }
        const kind = recordFileKind(f);
        let blob = f, name = f.name, mime = mimeOf(f);
        if (kind === 'PHOTO') {
          try { const out = await processPhoto(f); blob = out.main; name = (f.name || 'anh').replace(/\.[^.]*$/, '') + '.jpg'; mime = 'image/jpeg'; } catch (err) { toast(bi('rec.photo_failed', { F: f.name || '' }), 'err'); continue; }
        } else if (kind === 'FILE') {
          const er = checkFile(f, 'FILE');
          if (er) { toast(bi(er), 'err'); continue; }
        } else { toast(bi('file.need_record'), 'err'); continue; }
        cnt++;
        await enqueue('doc.upload', { document_id: uuid(), entity_type: 'NCR', entity_id: n.ncr_id, kind, mime_type: mime, file_name: name, content_b64: await blobToB64(blob), page_no: cnt },
          { entity_type: 'DOCUMENT', entity_id: '', parent_id: n.ncr_id, expected_version: 0 });
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

/** Phiếu NC gốc của phiếu khắc phục (dùng ở màn khắc phục) */
export async function ncrOfCapa(c) {
  return c && c.ncr_id ? byId('NCR', c.ncr_id) : null;
}
