// Phiếu đề nghị ban hành / sửa đổi / hủy tài liệu (Đợt 2, phiên 2d — thay BM-ISO-02-02, BM-CĐ-01-08), mã DN-yymm-001.
// /requests: danh sách (Chờ tôi xem xét · Chờ thực hiện · Của tôi · Tất cả); /request/new: gửi phiếu (từ chi tiết tài liệu: ?item=&type=);
// /request/:id: xem phiếu, sửa khi còn chờ xem xét, Chấp thuận / Không chấp thuận (PIN), thực hiện theo phiếu (soạn phiên bản, thêm vào
// danh mục, đặt ✕), Đã thực hiện (Thư ký ISO, PIN), Rút lại, In phiếu (báo cáo PDF / Excel). Cần mạng để gửi, xem xét.
// Quyền phía app chỉ để ẩn/hiện nút (data.js); máy chủ kiểm lại và trả FORBIDDEN trước khi hỏi PIN.
import { bi, biText, esc, fmtDate, fmtDateTime, badge, nameText, uuid, session } from '../core.js';
import { ICON, toast, dialog, $ } from '../ui.js';
import { byId, recs, items, depts, users, userName, isSecretary, roleLevel, deptWritable, can, canRequest, canDecideReq, canEditReq,
  canCancelReq, canCreateVersion, VERSION_OPEN, KINDS, curRevOf, docControlOn } from '../data.js';
import { navigate, refresh } from '../router.js';
import { afterCommit } from '../app.js';
import { textInput, selectInput, bilingualInputs, dateInput, wireForm, readField, showErrors, writeOnline, writeWithPin, writeFail, busy } from '../form.js';
import { pendingFor } from '../pending.js';
import { statusDot } from './catalog.js';

const pair = (vi, zh, meta, base) => {
  const m = meta && meta[base];
  const tag = (lang) => (m && m.state === 'MACHINE' && m.src !== lang ? ` <span class="tag mt">${bi('tag.machine_translated')}</span>` : '');
  const a = vi ? `<span class="vi">${esc(vi).replace(/\n/g, '<br>')}</span>${tag('vi')}` : '';
  const b = zh ? `<span class="zh muted">${esc(zh).replace(/\n/g, '<br>')}</span>${tag('zh')}` : '';
  return a && b ? a + '<br>' + b : a || b;
};
const kv = (labelKey, value) => (value ? `<div class="kv"><span>${bi(labelKey)}</span><strong>${value}</strong></div>` : '');
const needNet = (view) => {
  if (navigator.onLine) return false;
  view.innerHTML = `<div class="card empty-state">${ICON.sync}<p class="muted">${bi('sync.need_network')}</p></div>`;
  return true;
};

/** Huy hiệu loại + trạng thái phiếu */
export function reqBadges(r) { return badge('dr.type.' + r.req_type) + ' ' + badge('dr.state.' + r.state); }

/** Tài liệu của phiếu: mã · tên (NEW: mã / tên đề xuất) */
function reqDoc(r, it) {
  if (it) return { code: it.code, name: nameText(it) };
  return { code: r.new_code || biText('dr.no_code'), name: [r.title_vi, r.title_zh].filter(Boolean).join(' · ') };
}

/** Một dòng phiếu trong danh sách */
export function requestRow(r, it, um) {
  const d = reqDoc(r, it);
  const who = r.requester_name || userName(um, r.submitted_by);
  return `<li><a class="cat-row dr-row" href="#/request/${encodeURIComponent(r.request_id)}">
    <span class="cat-top"><span class="code">${esc(r.code)}</span>${reqBadges(r)}</span>
    <span class="cat-name"><span class="code">${esc(d.code)}</span> · ${esc(d.name)}</span>
    <span class="cat-meta muted">${esc(fmtDate(r.submitted_at))} · ${esc(who)}${r.reason_vi || r.reason_zh ? ' · ' + esc(String(r.reason_vi || r.reason_zh).slice(0, 80)) : ''}</span>
    ${ICON.chevron}</a></li>`;
}

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

/* ====================== Danh sách (/requests) ====================== */

const TABS = ['review', 'todo', 'mine', 'all'];
let curTab = '';

export async function renderRequests(view, { shell, query }) {
  shell.setScreen({ title: 'nav.requests', back: '/' });
  if (!(await docControlOn())) { view.innerHTML = `<div class="card empty-state">${ICON.edit}<p class="muted">${bi('dr.server_old')}</p></div>`; return; }
  if (!isSecretary() && roleLevel() < 2) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('err.forbidden')}</p></div>`; return; }
  const p = await pendingFor();
  const itMap = new Map((await items()).map((x) => [x.item_id, x]));
  const all = (await recs('DOCREQ')).filter((r) => !r.archived_at);
  const uid = session.user && session.user.user_id;
  const by = {
    review: p.req_review,
    todo: all.filter((r) => r.state === 'APPROVED'),
    mine: all.filter((r) => r.submitted_by === uid),
    all
  };
  if (query && TABS.includes(query.f)) curTab = query.f;
  if (!TABS.includes(curTab)) curTab = TABS.find((t) => t !== 'all' && by[t].length) || 'all';
  const um = await users();
  const shown = by[curTab].slice().sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)));
  view.innerHTML = `<div class="row list-head"><a class="btn primary" href="#/request/new">${ICON.plus}<span>${bi('dr.new')}</span></a>
      ${await can('report.run') ? `<a class="btn" href="#/reports?kind=DOCREQ">${ICON.reports}<span>${bi('dr.log_report')}</span></a>` : ''}</div>
    <div class="chips tabs">${TABS.filter((t) => t === 'all' || t === curTab || by[t].length).map((t) => `<button type="button" class="chip${t === curTab ? ' on' : ''}" data-tab="${t}">${bi('dr.tab.' + t)} <b>${by[t].length}</b></button>`).join('')}</div>
    ${shown.length ? `<ul class="cat-list">${shown.map((r) => requestRow(r, itMap.get(r.item_id), um)).join('')}</ul>`
      : `<div class="card empty-state">${ICON.check}<p class="muted">${bi('dr.none')}</p></div>`}
    <p class="muted small">${bi('dr.how')}</p>`;
  view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { curTab = b.dataset.tab; renderRequests(view, { shell, query: {} }); }));
}

/* ====================== Gửi phiếu (/request/new) ====================== */

export async function renderRequestNew(view, { shell, query }) {
  const q = query || {};
  const it0 = q.item ? await byId('ITEM', q.item) : null;
  shell.setScreen({ title: 'dr.new', back: it0 ? '/item/' + encodeURIComponent(it0.item_id) : '/requests' });
  if (!(await docControlOn())) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('dr.server_old')}</p></div>`; return; }
  if (!isSecretary() && roleLevel() < 2) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('err.forbidden')}</p></div>`; return; }
  if (needNet(view)) return;
  let type = ['NEW', 'REVISE', 'CANCEL'].includes(q.type) ? q.type : (it0 ? 'REVISE' : 'REVISE');
  const list = (await items()).filter((x) => x.status !== 'NA');
  const deps = (await depts()).filter((d) => d.active !== false);
  const myDeps = deps.filter((d) => isSecretary() || deptWritable(d.dept_code));
  let itemId = it0 && canRequest(it0) ? it0.item_id : '';
  // Ô chọn tài liệu: lọc Bộ phận + Tình trạng (chỉ ô chọn, không bật bàn phím iPhone) → danh sách ngắn; chọn xong hiện mã, tình trạng
  const pick = { dept: it0 ? it0.dept_code : '', st: '' };
  const pickHtml = () => {
    const inDept = list.filter((x) => !pick.dept || x.dept_code === pick.dept);
    const shown = inDept.filter((x) => !pick.st || (x.status || 'NONE') === pick.st);
    const it = itemId ? list.find((x) => x.item_id === itemId) : null;
    const cnt = (st) => inDept.filter((x) => (x.status || 'NONE') === st).length;
    const opt = (v, t, cur) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(t)}</option>`;
    return `<div class="form-grid">
        <label class="fld"><span>${bi('cat.dept')}</span><select class="inp sel" id="dp-dept">${opt('', biText('cat.all') + ` (${list.length})`, pick.dept)}${deps.map((d) => { const n = list.filter((x) => x.dept_code === d.dept_code).length; return n ? opt(d.dept_code, `${d.dept_code} · ${nameText(d)} (${n})`, pick.dept) : ''; }).join('')}</select></label>
        <label class="fld"><span>${bi('cat.status')}</span><select class="inp sel" id="dp-st">${opt('', biText('cat.all') + ` (${inDept.length})`, pick.st)}${['DRAFTING', 'ISSUED', 'NONE'].map((k) => opt(k, `${biText('status.' + k)} (${cnt(k)})`, pick.st)).join('')}</select></label>
      </div>
      <label class="fld wide" data-field="item_id"><span>${bi('dr.doc_n', { N: shown.length })} <span class="req">*</span></span><select class="inp sel" id="f-item_id">${opt('', shown.length ? biText('dr.pick_item') : biText('dr.pick_none'), itemId)}${shown.map((x) => opt(x.item_id, `${x.code} · ${x.name_vi || x.name_zh || ''}`, itemId)).join('')}</select><div class="ferr"></div></label>
      ${it ? `<p class="small dr-picked"><span class="code">${esc(it.code)}</span> ${statusDot(it.status)} ${badge('status.' + (it.status || 'NONE'))}${curRevOf(it) ? ' · ' + bi('ver.rev_n', { N: esc(curRevOf(it)) }) : ''} · ${badge('level_doc.' + (it.level || 'DEPT'))}<br>${esc(nameText(it))}</p>` : ''}
      <p class="muted small">${bi('dr.pick_hint')}</p>`;
  };
  const wirePick = (form) => {
    const box = $('#dr-pick', form);
    if (!box) return;
    const again = () => { box.innerHTML = pickHtml(); wirePick(form); };
    $('#dp-dept', box).addEventListener('change', (e) => { pick.dept = e.target.value; if (itemId && !list.some((x) => x.item_id === itemId && (!pick.dept || x.dept_code === pick.dept))) itemId = ''; again(); });
    $('#dp-st', box).addEventListener('change', (e) => { pick.st = e.target.value; if (itemId && !list.some((x) => x.item_id === itemId && (!pick.st || (x.status || 'NONE') === pick.st))) itemId = ''; again(); });
    $('#f-item_id', box).addEventListener('change', (e) => { itemId = e.target.value; again(); });
  };
  const draw = () => {
    // Giữ chữ đã gõ khi đổi loại phiếu (vẽ lại cả form)
    const old = $('form.dr-form', view);
    const keep = {};
    if (old) old.querySelectorAll('input[id^="f-"], textarea[id^="f-"]').forEach((el) => { if (el.value) keep[el.id] = el.value; });
    view.innerHTML = `<form class="card form dr-form" novalidate>
      <div class="chips" role="radiogroup">${['REVISE', 'NEW', 'CANCEL'].map((t) => `<button type="button" class="chip${t === type ? ' on' : ''}" data-type="${t}" role="radio" aria-checked="${t === type}">${bi('dr.type.' + t)}</button>`).join('')}</div>
      <p class="muted small">${bi('dr.type_hint.' + type)}</p>
      ${type === 'NEW' ? `<div class="form-grid">
          ${selectInput('dept_code', 'cat.dept', myDeps.map((d) => [d.dept_code, esc(d.dept_code + ' · ' + nameText(d))]), q.dept || (myDeps.length === 1 ? myDeps[0].dept_code : ''), { required: true })}
          ${selectInput('new_kind', 'cat.kind', KINDS.map((k) => [k, bi('kind.' + k)]), 'FORM', { empty: '' })}
          ${textInput('new_code', 'dr.new_code', '', { maxlength: 40, upper: true, placeholder: 'BM-SX-03-01', hint: biText('dr.new_code_hint') })}
        </div>${bilingualInputs('title', null, { labelKey: 'dr.new_title', maxlength: 300 })}`
        : `<div id="dr-pick">${pickHtml()}</div>`}
      ${bilingualInputs('reason', null, { labelKey: 'dr.reason', area: true, maxlength: 2000 })}
      ${type === 'CANCEL' ? '' : bilingualInputs('content', null, { labelKey: type === 'NEW' ? 'dr.content_new' : 'dr.content', area: true, maxlength: 2000, required: type === 'REVISE' })}
      <div class="form-grid">
        ${dateInput('want_date', 'dr.want_date', '')}
        ${isSecretary() ? textInput('requester_name', 'dr.requester_name', '', { maxlength: 120, hint: biText('dr.requester_hint') }) : ''}
      </div>
      <p class="form-err err"></p>
      <div class="row"><a class="btn" href="#${it0 ? '/item/' + encodeURIComponent(it0.item_id) : '/requests'}">${bi('btn.cancel')}</a>
        <button type="submit" class="btn primary" id="dr-send">${ICON.up}<span>${bi('dr.send')}</span></button></div>
      <p class="muted small">${bi('dr.flow_note')}</p>
    </form>`;
    const form = $('form', view);
    Object.keys(keep).forEach((id) => { const el = form.querySelector('#' + CSS.escape(id)); if (el && !el.value) el.value = keep[id]; });
    wireForm(form);
    form.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => { type = b.dataset.type; draw(); }));
    wirePick(form);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const p = { request_id: uuid(), req_type: type };
      const errs = [];
      ['reason_vi', 'reason_zh', 'content_vi', 'content_zh', 'title_vi', 'title_zh', 'requester_name'].forEach((k) => { const v = readField(form, k); if (v) p[k] = v; });
      if (type === 'NEW') {
        p.dept_code = readField(form, 'dept_code');
        p.new_kind = readField(form, 'new_kind') || '';
        p.new_code = readField(form, 'new_code') || '';
        if (!p.dept_code) errs.push({ field: 'dept_code', key: 'field.required' });
        if (!p.title_vi && !p.title_zh) errs.push({ field: 'title', key: 'field.one_lang' });
      } else {
        p.item_id = itemId;
        if (!itemId) errs.push({ field: 'item_id', key: 'field.required' });
      }
      if (!p.reason_vi && !p.reason_zh) errs.push({ field: 'reason', key: 'field.one_lang' });
      if (type === 'REVISE' && !p.content_vi && !p.content_zh) errs.push({ field: 'content', key: 'field.one_lang' });
      const want = readField(form, 'want_date');
      if (want === null) errs.push({ field: 'want_date', key: 'field.invalid_date' }); else if (want) p.want_date = want;
      if (errs.length) { showErrors(form, errs); return; }
      const btn = $('#dr-send', form);
      busy(btn, true);
      const r = await writeOnline('docreq.save', p, { expected_version: 0 });
      busy(btn, false);
      if (r.ok) { await afterCommit(); toast(bi('dr.sent_ok', { C: esc((r.data && r.data.record && r.data.record.code) || '') }), 'ok'); navigate('/request/' + encodeURIComponent(p.request_id), { replace: true }); return; }
      if (r.code === 'VALIDATION_ERROR') { showErrors(form, r.errors); return; }
      writeFail(r);
    });
  };
  draw();
}

/* ====================== Chi tiết phiếu (/request/:id) ====================== */

export async function renderRequest(view, ctx) {
  const { shell, params } = ctx;
  const r = await byId('DOCREQ', params.id);
  shell.setScreen({ title: 'dr.title', back: '/requests' });
  if (!r) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('dr.not_found')}</p><a class="btn" href="#/requests">${bi('nav.requests')}</a></div>`; return; }
  const it = r.item_id ? await byId('ITEM', r.item_id) : null;
  const um = await users();
  const who = (id) => esc(userName(um, id) || '');
  const sec = isSecretary();
  const online = navigator.onLine;
  const vers = it ? (await recs('VERSION')).filter((v) => v.item_id === it.item_id) : [];
  const linked = r.version_id ? vers.find((v) => v.version_id === r.version_id) : null;
  const openV = vers.find((v) => VERSION_OPEN.has(v.state));
  const d = reqDoc(r, it);
  const acts = [];
  if (canDecideReq(r)) {
    acts.push(`<button type="button" class="btn primary" id="dr-approve" ${online ? '' : 'disabled'}>${ICON.check}<span>${bi('dr.approve')}</span></button>`);
    acts.push(`<button type="button" class="btn danger" id="dr-reject" ${online ? '' : 'disabled'}>${ICON.x}<span>${bi('dr.reject')}</span></button>`);
  }
  let todo = '';
  if (r.state === 'APPROVED') {
    if (r.req_type === 'CANCEL') {
      if (sec && it && it.status !== 'NA') acts.push(`<button type="button" class="btn primary danger" id="dr-na" ${online && !openV ? '' : 'disabled'}>${ICON.x}<span>${bi('dr.do_na')}</span></button>`);
      todo = bi(sec ? (openV ? 'dr.todo_cancel_open' : 'dr.todo_cancel') : 'dr.wait_secretary');
    } else if (r.req_type === 'NEW' && !it) {
      if (sec && await can('item.edit')) acts.push(`<a class="btn primary" href="#/item/new?req=${encodeURIComponent(r.request_id)}">${ICON.plus}<span>${bi('dr.do_add_item')}</span></a>`);
      todo = bi(sec ? 'dr.todo_new' : 'dr.wait_secretary');
    } else if (linked && VERSION_OPEN.has(linked.state)) {
      acts.push(`<a class="btn primary" href="#/version/${encodeURIComponent(linked.version_id)}">${ICON.edit}<span>${bi('dr.open_version', { N: esc(linked.rev) })}</span></a>`);
      todo = bi('dr.todo_drafting', { N: esc(linked.rev) });
    } else if (it && openV) {
      todo = bi('dr.todo_other_open', { N: esc(openV.rev) });
      acts.push(`<a class="btn" href="#/version/${encodeURIComponent(openV.version_id)}">${ICON.edit}<span>${bi('ver.open_it')}</span></a>`);
    } else if (it && canCreateVersion(it, 'REVISION') && await can('version.save')) {
      acts.push(`<a class="btn primary" href="#/version/new/${encodeURIComponent(it.item_id)}?req=${encodeURIComponent(r.request_id)}">${ICON.edit}<span>${bi('dr.do_version')}</span></a>`);
      todo = bi('dr.todo_version');
    } else todo = bi('dr.wait_secretary');
    if (sec) acts.push(`<button type="button" class="btn" id="dr-done" ${online ? '' : 'disabled'}>${ICON.check}<span>${bi('dr.done')}</span></button>`);
  }
  if (canCancelReq(r)) acts.push(`<button type="button" class="btn" id="dr-cancel" ${online ? '' : 'disabled'}>${ICON.trash}<span>${bi('dr.cancel')}</span></button>`);
  let wait = '';
  if (r.state === 'SUBMITTED' && !canDecideReq(r)) wait = bi(r.level === 'COMPANY' ? 'dr.wait_admin' : 'dr.wait_head');
  const editable = canEditReq(r);
  view.innerHTML = `<div class="item dr">
    <section class="card item-head">
      <div class="rec-top"><span class="code big">${esc(r.code)}</span>${reqBadges(r)}</div>
      <h2 class="item-name">${it ? `<a class="code" href="#/item/${encodeURIComponent(it.item_id)}">${esc(d.code)}</a>` : `<span class="code">${esc(d.code)}</span>`}<br>${it ? pair(it.name_vi, it.name_zh) : pair(r.title_vi, r.title_zh, r.i18n_meta, 'title')}</h2>
      <div class="rec-badges">${badge('level_doc.' + (r.level || 'DEPT'))}${it && curRevOf(it) ? ` <strong>${bi('ver.rev_n', { N: esc(curRevOf(it)) })}</strong>` : ''}${r.new_kind ? ' ' + badge('kind.' + r.new_kind) : ''}</div>
      ${r.state === 'REJECTED' ? `<p class="banner err small">${bi('dr.rejected_by', { U: who(r.decided_by), D: esc(fmtDateTime(r.decided_at)) })}: ${esc(r.decide_note || '')}</p>` : ''}
      ${r.state === 'DONE' ? `<p class="banner ok small">${bi('dr.done_by', { U: who(r.done_by), D: esc(fmtDate(r.done_at)) })}${r.done_note ? ': ' + esc(r.done_note) : ''}</p>` : ''}
      ${r.state === 'CANCELLED' ? `<p class="banner small">${bi('dr.cancelled_by', { U: who(r.cancelled_by), D: esc(fmtDate(r.cancelled_at)) })}${r.cancel_reason ? ': ' + esc(r.cancel_reason) : ''}</p>` : ''}
    </section>
    <section class="card"><h3>${bi('dr.info')}</h3>
      ${kv('dr.reason', pair(r.reason_vi, r.reason_zh, r.i18n_meta, 'reason'))}
      ${kv(r.req_type === 'NEW' ? 'dr.content_new' : 'dr.content', pair(r.content_vi, r.content_zh, r.i18n_meta, 'content'))}
      ${kv('cat.dept', esc(r.dept_code))}
      ${kv('dr.want_date', esc(fmtDate(r.want_date)))}
      ${kv('dr.requester', esc(r.requester_name || userName(um, r.submitted_by)) + (r.requester_name ? ` <span class="muted small">${bi('dr.entered_by', { U: who(r.submitted_by) })}</span>` : ''))}
      ${kv('dr.submitted', esc(fmtDateTime(r.submitted_at)))}
      ${r.decided_at && r.state !== 'REJECTED' ? kv('dr.decided', `${who(r.decided_by)} <span class="muted small">${esc(fmtDateTime(r.decided_at))}</span>${r.decide_note ? '<br>' + esc(r.decide_note) : ''}`) : ''}
      ${linked ? kv('dr.version', `<a href="#/version/${encodeURIComponent(linked.version_id)}">${bi('ver.rev_n', { N: esc(linked.rev) })}</a> ${badge('vstate.' + linked.state)}`) : ''}
    </section>
    ${editable ? `<form class="card form dr-edit" novalidate><h3>${bi('dr.edit')}</h3>
      ${r.req_type === 'NEW' ? bilingualInputs('title', r, { labelKey: 'dr.new_title', maxlength: 300 }) + textInput('new_code', 'dr.new_code', r.new_code, { maxlength: 40, upper: true, hint: biText('dr.new_code_hint') }) : ''}
      ${bilingualInputs('reason', r, { labelKey: 'dr.reason', area: true, maxlength: 2000 })}
      ${r.req_type === 'CANCEL' ? '' : bilingualInputs('content', r, { labelKey: r.req_type === 'NEW' ? 'dr.content_new' : 'dr.content', area: true, maxlength: 2000, required: r.req_type === 'REVISE' })}
      ${dateInput('want_date', 'dr.want_date', r.want_date)}
      <p class="form-err err"></p>
      <div class="row"><button type="submit" class="btn" id="dr-save" ${online ? '' : 'disabled'}>${bi('btn.save')}</button></div></form>` : ''}
    ${wait ? `<p class="banner info small">${wait}</p>` : ''}
    ${todo ? `<p class="banner info small">${todo}</p>` : ''}
    ${acts.length ? `<div class="row item-actions">${acts.join('')}</div>` : ''}
    ${await can('report.run') ? `<a class="small rp-link" href="#/reports?kind=DOCREQ&req=${encodeURIComponent(r.request_id)}">${ICON.print} ${bi('dr.print')} ›</a>` : ''}
    ${!online && acts.length ? `<p class="muted small">${bi('sync.need_network')}</p>` : ''}
  </div>`;
  const again = async (msgKey) => { await afterCommit(); if (msgKey) toast(bi(msgKey), 'ok'); if (ctx.isCurrent && !ctx.isCurrent()) return; refresh(); };
  const exp = () => r.record_version;
  const on = (id, fn) => { const b = $('#' + id, view); if (b) b.addEventListener('click', async () => { busy(b, true); try { await fn(); } finally { busy(b, false); } }); };
  on('dr-approve', async () => {
    const note = await askText('dr.approve', 'dr.decide_note', { note: session.user && r.submitted_by === session.user.user_id ? biText('dr.self_note') : '' });
    if (note === null) return;
    const res = await writeWithPin('docreq.approve', { request_id: r.request_id, note }, { expected_version: exp() });
    if (res.ok) return again('dr.approved_ok');
    writeFail(res);
  });
  on('dr-reject', async () => {
    const reason = await askText('dr.reject', 'field.reason', { required: true });
    if (reason === null) return;
    const res = await writeWithPin('docreq.reject', { request_id: r.request_id, reason }, { expected_version: exp() });
    if (res.ok) return again('dr.rejected_ok');
    writeFail(res);
  });
  on('dr-cancel', async () => {
    const reason = await askText('dr.cancel', 'field.reason', { note: biText('dr.cancel_note') });
    if (reason === null) return;
    const res = await writeOnline('docreq.cancel', { request_id: r.request_id, reason }, { expected_version: exp() });
    if (res.ok) return again('dr.cancelled_ok');
    writeFail(res);
  });
  on('dr-done', async () => {
    const note = await askText('dr.done', 'dr.done_note', { required: true, note: biText('dr.done_hint') });
    if (note === null) return;
    const res = await writeWithPin('docreq.done', { request_id: r.request_id, note }, { expected_version: exp() });
    if (res.ok) return again('dr.done_ok');
    writeFail(res);
  });
  on('dr-na', async () => {
    const ok = await dialog({ title: bi('dr.do_na'), body: `<p>${bi('dr.na_confirm', { C: esc(it.code), R: esc(r.code) })}</p><p class="muted small">${bi('item.na_note')}</p>`,
      actions: [{ label: bi('btn.cancel'), value: false }, { label: bi('dr.do_na'), kind: 'danger', value: true }] });
    if (!ok) return;
    const res = await writeWithPin('item.setNa', { item_id: it.item_id, na: true, request_id: r.request_id }, { expected_version: it.record_version });
    if (res.ok) return again('dr.done_ok');
    writeFail(res);
  });
  const form = $('form.dr-edit', view);
  if (form) {
    wireForm(form);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const p = { request_id: r.request_id };
      const errs = [];
      ['reason_vi', 'reason_zh', 'content_vi', 'content_zh', 'title_vi', 'title_zh', 'new_code'].forEach((k) => { const v = readField(form, k); if (v !== undefined) p[k] = v || ''; });
      if (!p.reason_vi && !p.reason_zh) errs.push({ field: 'reason', key: 'field.one_lang' });
      if (r.req_type === 'REVISE' && !p.content_vi && !p.content_zh) errs.push({ field: 'content', key: 'field.one_lang' });
      if (r.req_type === 'NEW' && !p.title_vi && !p.title_zh) errs.push({ field: 'title', key: 'field.one_lang' });
      const want = readField(form, 'want_date');
      if (want === null) errs.push({ field: 'want_date', key: 'field.invalid_date' }); else p.want_date = want || '';
      if (errs.length) { showErrors(form, errs); return; }
      const btn = $('#dr-save', form);
      busy(btn, true);
      const res = await writeOnline('docreq.save', p, { expected_version: exp() });
      busy(btn, false);
      if (res.ok) return again('form.saved');
      if (res.code === 'VALIDATION_ERROR') { showErrors(form, res.errors); return; }
      writeFail(res);
    });
  }
}

/* ====================== Thẻ ở chi tiết tài liệu ====================== */

/** Phiếu đề nghị của tài liệu (đang xử lý + gần đây) và nút Đề nghị sửa đổi / hủy */
export async function itemRequestsCard(it) {
  if (!(await docControlOn()) || (!isSecretary() && roleLevel() < 2)) return '';
  const list = (await recs('DOCREQ')).filter((r) => r.item_id === it.item_id && !r.archived_at)
    .sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)));
  const open = list.filter((r) => r.state === 'SUBMITTED' || r.state === 'APPROVED');
  const um = await users();
  const can2 = canRequest(it);
  return `<section class="card dr-card"><h3>${bi('dr.card_title')}</h3>
    ${open.length ? `<ul class="cat-list">${open.map((r) => requestRow(r, it, um)).join('')}</ul>` : `<p class="muted small">${bi('dr.card_none')}</p>`}
    ${list.length > open.length ? `<details class="ver-hist"><summary>${bi('dr.card_old_n', { N: list.length - open.length })}</summary><ul class="cat-list">${list.filter((r) => !open.includes(r)).map((r) => requestRow(r, it, um)).join('')}</ul></details>` : ''}
    ${can2 ? `<div class="row"><a class="btn small" href="#/request/new?item=${encodeURIComponent(it.item_id)}&type=REVISE">${ICON.edit}<span>${bi('dr.ask_revise')}</span></a>
      <a class="btn small" href="#/request/new?item=${encodeURIComponent(it.item_id)}&type=CANCEL">${ICON.x}<span>${bi('dr.ask_cancel')}</span></a></div>` : ''}
  </section>`;
}

/** Phiếu đã chấp thuận dùng được khi soạn phiên bản của tài liệu (REVISE / NEW đã gắn tài liệu, chưa có bản đang mở theo phiếu) */
export async function approvedRequestsFor(itemId) {
  return (await recs('DOCREQ')).filter((r) => r.item_id === itemId && r.state === 'APPROVED' && r.req_type !== 'CANCEL' && !r.archived_at);
}

/** Phiếu hủy đã chấp thuận của tài liệu (đặt ✕ theo phiếu) */
export async function approvedCancelFor(itemId) {
  return (await recs('DOCREQ')).find((r) => r.item_id === itemId && r.state === 'APPROVED' && r.req_type === 'CANCEL' && !r.archived_at) || null;
}

