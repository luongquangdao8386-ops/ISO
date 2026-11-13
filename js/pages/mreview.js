// Xem xét lãnh đạo (Đợt 4, phiên 4c — BM-ISO-05-01; người dùng chốt 13/11/2026 giữ phạm vi Cơ điện), mã XL-yy-01.
// /mreview: các cuộc xem xét (Thư ký ISO, cấp 3+; người phụ trách quyết định chỉ thấy cuộc có quyết định của mình); /mreview/new,
// /mreview/:id/edit: kỳ xem xét, ngày họp, chủ trì, thành phần, nhận xét 12 mục đầu vào (ISO 9001 điều 9.3.2), kết luận;
// /mreview/:id: số liệu tự gom theo kỳ (đang chuẩn bị: tính lúc xem — mreview.stats; đã họp: bản chốt), nhận xét từng mục, kết luận, quyết
// định (thêm / sửa — Thư ký ISO; xong / mở lại — người phụ trách; hủy — Thư ký ISO), ghi Đã họp (PIN, chốt số liệu), mở lại, hủy, in
// BM-ISO-05-01 (báo cáo PDF / Excel). Ghi cần mạng. Quyền phía app chỉ để ẩn/hiện nút (data.js); máy chủ kiểm lại.
import { api, bi, biText, esc, fmtDate, fmtDateTime, badge, uuid, resMsg } from '../core.js';
import { ICON, toast, dialog, $ } from '../ui.js';
import { byId, recs, users, userName, today, addDaysIso, mreviewOn, MR_INPUTS, MR_MANUAL, MR_DECISION_KINDS, mrDecisions, canSeeMreview,
  canEditMreview, canDoDecision, mrDecisionLate } from '../data.js';
import { navigate, refresh } from '../router.js';
import { afterCommit } from '../app.js';
import { textInput, dateInput, bilingualInputs, wireForm, readField, showErrors, writeOnline, writeWithPin, writeFail, busy } from '../form.js';

const MAX_DECISIONS = 30;

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
const notOn = (view) => { view.innerHTML = `<div class="card empty-state">${ICON.trend}<p class="muted">${bi('mr.server_old')}</p></div>`; };
const period = (r) => `${esc(fmtDate(r.period_from))} – ${esc(fmtDate(r.period_to))}`;
const TONE = { green: 't-green-text', red: 't-red-text', amber: 't-amber-text', navy: 'navy-text', muted: 'muted' };

/** Tình trạng quyết định của một cuộc đã họp: {n, open, late} */
function decCount(r) {
  const ds = mrDecisions(r);
  return { n: ds.length, open: ds.filter((d) => (d.state || 'OPEN') === 'OPEN').length, late: ds.filter((d) => mrDecisionLate(d)).length };
}

/** Hộp thoại nhập chữ (lý do, ghi chú) */
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

/* ====================== Danh sách (/mreview) ====================== */

export async function renderMreviews(view, { shell }) {
  shell.setScreen({ title: 'nav.mreview', back: '/' });
  if (!(await mreviewOn())) { notOn(view); return; }
  const all = (await recs('MREVIEW')).filter((r) => !r.archived_at && canSeeMreview(r))
    .sort((a, b) => String(b.code).localeCompare(String(a.code)));
  const sec = canEditMreview();
  view.innerHTML = `<div class="row list-head mr-head">${sec ? `<a class="btn primary" href="#/mreview/new" id="mr-new">${ICON.plus}<span>${bi('mr.new')}</span></a>` : ''}</div>
    ${all.length ? `<ul class="cat-list">${all.map((r) => {
      const c = decCount(r);
      return `<li><a class="cat-row mr-row" href="#/mreview/${encodeURIComponent(r.review_id)}">
        <span class="cat-top"><span class="code">${esc(r.code)}</span>${badge('mr.state.' + r.state)}</span>
        <span class="cat-name">${bi('mr.period')}: ${period(r)}</span>
        <span class="cat-meta muted">${r.meeting_date ? `${bi('mr.meeting_date')} ${esc(fmtDate(r.meeting_date))}` : bi('mr.no_meeting')}${r.chair_name ? ' · ' + esc(r.chair_name) : ''}${c.n ? ` · ${bi('mr.dec_count', { N: c.n, O: c.open })}` : ''}${c.late ? ` · <span class="t-red-text">${bi('mr.dec_late_n', { N: c.late })}</span>` : ''}</span>
        ${ICON.chevron}</a></li>`;
    }).join('')}</ul>` : `<div class="card empty-state">${ICON.trend}<p class="muted">${bi('mr.none')}</p></div>`}
    <p class="muted small">${bi('mr.how')}</p>`;
}

/* ====================== Lập / sửa (/mreview/new, /mreview/:id/edit) ====================== */

export async function renderMreviewForm(view, { shell, params }) {
  const editing = !!(params && params.id);
  const r = editing ? await byId('MREVIEW', params.id) : null;
  const backTo = editing ? '/mreview/' + encodeURIComponent(params.id) : '/mreview';
  shell.setScreen({ title: editing ? 'mr.edit' : 'mr.new', back: backTo });
  if (!(await mreviewOn())) { notOn(view); return; }
  if (!canEditMreview() || (editing && (!r || r.state === 'CANCELLED'))) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi(editing && !r ? 'mr.not_found' : 'err.forbidden')}</p></div>`; return; }
  if (needNet(view)) return;
  const held = !!r && r.state === 'HELD';
  const t = today();
  // Kỳ mặc định: từ ngày sau cuối kỳ của lần xem xét gần nhất (không có: đầu năm) tới hôm nay
  const prev = (await recs('MREVIEW')).filter((x) => !x.archived_at && x.state === 'HELD').sort((a, b) => String(b.period_to).localeCompare(String(a.period_to)))[0];
  const v = r || { period_from: prev && prev.period_to < t ? addDaysIso(prev.period_to, 1) : t.slice(0, 4) + '-01-01', period_to: t, meeting_date: '', place_text: '', chair_name: '', attendees_text: '' };
  view.innerHTML = `<form class="card form mr-form" novalidate>
    ${held ? `<div class="banner">${bi('mr.held_edit_note')}</div>` : ''}
    <div class="form-grid">
      ${held ? `<div class="kv"><span>${bi('mr.period')}</span><strong>${period(r)}</strong></div><div class="kv"><span>${bi('mr.meeting_date')}</span><strong>${esc(fmtDate(r.meeting_date))}</strong></div>`
        : `${dateInput('period_from', 'mr.period_from', v.period_from, { required: true })}${dateInput('period_to', 'mr.period_to', v.period_to, { required: true, hint: biText('mr.period_hint') })}
      ${dateInput('meeting_date', 'mr.meeting_date', v.meeting_date || '', { hint: biText('mr.meeting_hint') })}`}
      ${textInput('place_text', 'mr.place', v.place_text || '', { maxlength: 200 })}
      ${textInput('chair_name', 'mr.chair', v.chair_name || '', { maxlength: 120, hint: biText('mr.chair_hint') })}
    </div>
    <label class="fld" data-field="attendees_text"><span>${bi('mr.attendees')}</span><textarea class="inp" id="f-attendees_text" rows="2" maxlength="1500">${esc(v.attendees_text || '')}</textarea><div class="ferr"></div></label>
    ${held ? '' : `<h3>${bi('rpt.sec.mr_inputs')}</h3><p class="muted small">${bi('mr.inputs_hint')}</p>
      ${MR_INPUTS.map((k) => `<div class="mr-in-edit">${bilingualInputs('in_' + k, r, { labelKey: 'mr.in.' + k, area: true, maxlength: 4000, required: false })}
        <p class="muted small">${bi(MR_MANUAL.includes(k) ? 'mr.manual_hint' : 'mr.auto_hint')}</p></div>`).join('')}`}
    <h3>${bi('rpt.sec.mr_outputs')}</h3>
    ${bilingualInputs('conclusion', r, { labelKey: 'mr.conclusion', area: true, maxlength: 4000, required: false })}
    <p class="muted small">${bi('mr.conclusion_hint')}</p>
    <p class="form-err err"></p>
    <div class="row"><a class="btn" href="#${backTo}">${bi('btn.cancel')}</a>
      <button type="submit" class="btn primary" id="mr-save">${ICON.check}<span>${bi(editing ? 'btn.save' : 'mr.create')}</span></button></div>
  </form>`;
  const form = $('form', view);
  wireForm(form);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const p = { review_id: editing ? r.review_id : uuid() };
    const errs = [];
    if (!held) {
      ['period_from', 'period_to', 'meeting_date'].forEach((k) => {
        const d = readField(form, k);
        if (d === null) errs.push({ field: k, key: 'field.invalid_date' }); else p[k] = d || '';
      });
      if (!p.period_from) errs.push({ field: 'period_from', key: 'field.required' });
      if (!p.period_to) errs.push({ field: 'period_to', key: 'field.required' });
      MR_INPUTS.forEach((k) => ['vi', 'zh'].forEach((l) => { p['in_' + k + '_' + l] = readField(form, 'in_' + k + '_' + l) || ''; }));
    }
    ['place_text', 'chair_name', 'attendees_text'].forEach((k) => { p[k] = readField(form, k) || ''; });
    ['vi', 'zh'].forEach((l) => { p['conclusion_' + l] = readField(form, 'conclusion_' + l) || ''; });
    if (errs.length) { showErrors(form, errs); return; }
    const btn = $('#mr-save', form);
    busy(btn, true);
    const res = await writeOnline('mreview.save', p, { expected_version: editing ? r.record_version : 0 });
    busy(btn, false);
    if (res.ok) {
      await afterCommit();
      toast(editing ? bi('form.saved') : bi('mr.created_ok', { C: esc((res.data && res.data.record && res.data.record.code) || '') }), 'ok');
      navigate('/mreview/' + encodeURIComponent(p.review_id), { replace: true });
      return;
    }
    if (res.code === 'VALIDATION_ERROR') { showErrors(form, res.errors); return; }
    writeFail(res);
  });
}

/* ====================== Chi tiết (/mreview/:id) ====================== */

/** Số liệu một mục: dòng nhãn — giá trị (màu), nhãn đuôi */
function blockHtml(rows) {
  return (rows || []).map((x) => `<div class="kv mr-stat"><span>${bi(x.k)}</span><strong class="${TONE[x.t] || ''}">${esc(x.v)}${x.s ? ' · ' + bi(x.s) : ''}</strong></div>`).join('');
}

/** Một quyết định trong danh sách */
function decisionHtml(d, i, r, um) {
  const st = d.state || 'OPEN';
  const late = mrDecisionLate(d);
  const owner = d.owner_user_id ? esc(userName(um, d.owner_user_id) || '') : esc(d.owner_name || '');
  const held = r.state === 'HELD';
  const acts = [];
  if (held && st === 'OPEN' && canDoDecision(d)) acts.push(`<button type="button" class="btn small" data-dec-done="${esc(d.id)}">${ICON.check}<span>${bi('mr.dec_done')}</span></button>`);
  if (held && st === 'DONE' && canDoDecision(d)) acts.push(`<button type="button" class="btn small" data-dec-open="${esc(d.id)}">${bi('mr.dec_reopen')}</button>`);
  if (canEditMreview() && r.state !== 'CANCELLED' && st === 'OPEN') acts.push(`<button type="button" class="btn small" data-dec-ed="${esc(d.id)}">${ICON.edit}<span>${bi('btn.edit')}</span></button>`);
  if (canEditMreview() && held && st === 'OPEN') acts.push(`<button type="button" class="btn small" data-dec-cancel="${esc(d.id)}">${bi('mr.dec_cancel')}</button>`);
  if (canEditMreview() && r.state === 'DRAFT' && st === 'OPEN') acts.push(`<button type="button" class="btn small" data-dec-rm="${esc(d.id)}">${ICON.trash}<span>${bi('btn.delete')}</span></button>`);
  return `<li class="mr-dec" id="mr-dec-${esc(d.id)}"><div class="rec-top"><strong>${i + 1}. ${bi('mr.kind.' + d.kind)}</strong> ${badge('mr.dstate.' + st)}${late ? ' ' + badge('capa.overdue') : ''}</div>
    <p>${pair(d.text_vi, d.text_zh)}</p>
    <div class="muted small">${owner ? `${bi('mr.dec_owner')}: ${owner}` : bi('mr.dec_no_owner')}${d.due ? ` · ${bi('mr.dec_due')}: <span class="${late ? 't-red-text' : ''}">${esc(fmtDate(d.due))}</span>` : ''}${st === 'DONE' && d.done_date ? ` · ${bi('mr.dec_done_at', { D: esc(fmtDate(d.done_date)) })}` : ''}</div>
    ${d.note ? `<p class="small">${esc(d.note)}</p>` : ''}
    ${acts.length ? `<div class="row">${acts.join('')}</div>` : ''}</li>`;
}

/** Hộp thoại quyết định (thêm / sửa) */
async function decisionDialog(d, um) {
  const v = d || { kind: 'IMPROVE', text_vi: '', text_zh: '', owner_user_id: '', owner_name: '', due: '' };
  const uOpts = [...um.values()].filter((u) => u.active !== false).sort((a, b) => String(a.display_name).localeCompare(String(b.display_name)));
  return dialog({
    title: bi(d ? 'mr.dec_edit' : 'mr.dec_add'),
    wide: true,
    body: `<div class="fld"><span>${bi('mr.kind')} <span class="req">*</span></span><div class="chips" role="radiogroup" id="md-kind">${MR_DECISION_KINDS.map((k) => `<button type="button" class="chip${v.kind === k ? ' on' : ''}" data-k="${k}" role="radio" aria-checked="${v.kind === k}">${bi('mr.kind.' + k)}</button>`).join('')}</div></div>
      <fieldset class="bi-pair"><legend>${bi('mr.dec_text')} <span class="req">*</span></legend>
        <label class="fld"><span>${bi('i18n.lang_vi')}</span><textarea class="inp" rows="2" maxlength="1000" id="md-vi">${esc(v.text_vi || '')}</textarea></label>
        <label class="fld"><span>${bi('i18n.lang_zh')}</span><textarea class="inp" rows="2" maxlength="1000" id="md-zh">${esc(v.text_zh || '')}</textarea></label>
        <div class="hint">${bi('mr.dec_text_hint')}</div></fieldset>
      <div class="form-grid">
        <label class="fld"><span>${bi('mr.dec_owner_app')}</span><select class="inp sel" id="md-owner"><option value="">${esc(biText('mr.dec_owner_outside'))}</option>${uOpts.map((u) => `<option value="${esc(u.user_id)}"${u.user_id === v.owner_user_id ? ' selected' : ''}>${esc(u.display_name)} (${esc(u.employee_code)})</option>`).join('')}</select></label>
        <label class="fld" id="md-name-fld"><span>${bi('mr.dec_owner_name')}</span><input class="inp" type="text" maxlength="120" id="md-name" value="${esc(v.owner_name || '')}" autocomplete="off"></label>
        <label class="fld"><span>${bi('mr.dec_due')}</span><input class="inp" type="date" id="md-due" value="${esc(v.due || '')}"></label>
      </div>`,
    onOpen: (w) => {
      w.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => w.querySelectorAll('[data-k]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); })));
      const sync = () => { $('#md-name-fld', w).hidden = !!$('#md-owner', w).value; };
      $('#md-owner', w).addEventListener('change', sync);
      sync();
    },
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('btn.save'), kind: 'primary', read: (w) => {
      const on = w.querySelector('[data-k].on');
      const ou = $('#md-owner', w).value;
      return { id: d ? d.id : uuid(), kind: on ? on.dataset.k : '', text_vi: $('#md-vi', w).value.trim(), text_zh: $('#md-zh', w).value.trim(),
        owner_user_id: ou, owner_name: ou ? '' : $('#md-name', w).value.trim(), due: $('#md-due', w).value };
    } }]
  });
}

/** Danh sách quyết định gửi lên mreview.save */
const decPayload = (list) => list.map((d) => ({ id: d.id, kind: d.kind, text_vi: d.text_vi || '', text_zh: d.text_zh || '', owner_user_id: d.owner_user_id || '', owner_name: d.owner_name || '', due: d.due || '' }));

export async function renderMreview(view, ctx) {
  const { shell, params } = ctx;
  const r = await byId('MREVIEW', params.id);
  shell.setScreen({ title: 'mr.title', back: '/mreview' });
  if (!(await mreviewOn())) { notOn(view); return; }
  if (!r || !canSeeMreview(r)) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('mr.not_found')}</p><a class="btn" href="#/mreview">${bi('nav.mreview')}</a></div>`; return; }
  const um = await users();
  const who = (id) => esc(userName(um, id) || '');
  const sec = canEditMreview();
  const ds = mrDecisions(r);
  const held = r.state === 'HELD', draft = r.state === 'DRAFT';
  const canReopen = sec && held && !ds.some((d) => d.state === 'DONE');
  const statsAt = held && r.stats_json ? r.stats_json.at : '';
  view.innerHTML = `<section class="card mr-card">
      <div class="card-head"><h2><span class="code">${esc(r.code)}</span> ${badge('mr.state.' + r.state)}</h2></div>
      ${kv('mr.period', period(r))}
      ${kv('mr.meeting_date', r.meeting_date ? esc(fmtDate(r.meeting_date)) : `<span class="muted">${bi('mr.no_meeting')}</span>`)}
      ${kv('mr.place', esc(r.place_text || ''))}
      ${kv('mr.chair', esc(r.chair_name || ''))}
      ${r.attendees_text ? `<div class="kv-block"><span class="muted small">${bi('mr.attendees')}</span><p>${esc(r.attendees_text).replace(/\n/g, '<br>')}</p></div>` : ''}
      ${held ? `<div class="banner ok">${bi('mr.held_note', { D: esc(fmtDateTime(r.held_at)), B: who(r.held_by) })}</div>` : ''}
      ${r.state === 'CANCELLED' ? `<div class="banner">${bi('mr.cancelled_note', { R: esc(r.cancel_reason || '') })}</div>` : ''}
      <div class="row mr-actions">
        ${sec && r.state !== 'CANCELLED' ? `<a class="btn" href="#/mreview/${encodeURIComponent(r.review_id)}/edit" id="mr-edit">${ICON.edit}<span>${bi('btn.edit')}</span></a>` : ''}
        ${sec && draft ? `<button type="button" class="btn primary" id="mr-hold">${ICON.check}<span>${bi('mr.hold')}</span></button>` : ''}
        ${canReopen ? `<button type="button" class="btn" id="mr-reopen">${bi('mr.reopen')}</button>` : ''}
        ${sec && draft ? `<button type="button" class="btn danger" id="mr-cancel">${bi('mr.cancel')}</button>` : ''}
        ${r.state !== 'CANCELLED' ? `<a class="btn rp-link" href="#/reports?kind=MREVIEW&review=${encodeURIComponent(r.review_id)}">${ICON.print}<span>${bi('mr.print')}</span></a>` : ''}
      </div>
      ${sec && draft ? `<p class="muted small">${bi('mr.hold_hint')}</p>` : ''}
    </section>
    <section class="card mr-inputs"><div class="card-head"><h2>${bi('rpt.sec.mr_inputs')}</h2>${draft ? `<button type="button" class="btn small" id="mr-stats-reload">${ICON.refresh}<span>${bi('mr.stats_reload')}</span></button>` : ''}</div>
      <p class="muted small" id="mr-stats-note">${held ? bi('mr.stats_frozen', { D: esc(fmtDateTime(statsAt)) }) : r.state === 'CANCELLED' ? '' : bi('mr.stats_live')}</p>
      <div id="mr-sections">${sectionsHtml(r, held && r.stats_json ? r.stats_json : null, draft)}</div>
    </section>
    <section class="card mr-outputs"><h2>${bi('rpt.sec.mr_outputs')}</h2>
      <div class="kv-block"><span class="muted small">${bi('mr.conclusion')}</span><p>${pair(r.conclusion_vi, r.conclusion_zh, r.i18n_meta, 'conclusion') || `<span class="muted">${bi('mr.conclusion_none')}</span>`}</p></div>
      <h3>${bi('rpt.sec.mr_decisions')}</h3>
      ${ds.length ? `<ul class="plain mr-decs">${ds.map((d, i) => decisionHtml(d, i, r, um)).join('')}</ul>` : `<p class="muted small">${bi('mr.decisions_none')}</p>`}
      ${sec && r.state !== 'CANCELLED' && ds.length < MAX_DECISIONS ? `<button type="button" class="btn small" id="mr-dec-add">${ICON.plus}<span>${bi('mr.dec_add')}</span></button>` : ''}
      <p class="muted small">${bi('mr.dec_hint')}</p>
    </section>`;

  const reload = async () => { await afterCommit(); refresh(); };
  const loadStats = async () => {
    const box = $('#mr-sections', view);
    if (!box || !draft) return;
    if (!navigator.onLine) { $('#mr-stats-note', view).innerHTML = bi('mr.stats_offline'); return; }
    box.querySelectorAll('.mr-stats').forEach((s) => { s.innerHTML = '<div class="spinner small" aria-hidden="true"></div>'; });
    const res = await api('mreview.stats', { review_id: r.review_id }, { retry: true, timeoutMs: 90000 });
    if (!res.ok) { $('#mr-stats-note', view).innerHTML = esc(resMsg(res)); box.querySelectorAll('.mr-stats').forEach((s) => { s.innerHTML = ''; }); return; }
    box.innerHTML = sectionsHtml(r, res.data.stats, draft);
    $('#mr-stats-note', view).innerHTML = bi('mr.stats_live_at', { D: esc(fmtDateTime(res.data.stats.at)) });
  };
  const on = (id, fn) => { const el = view.querySelector('#' + id); if (el) el.addEventListener('click', async () => { el.disabled = true; try { await fn(); } finally { el.disabled = false; } }); };
  on('mr-stats-reload', loadStats);
  on('mr-hold', async () => {
    const miss = [];
    if (!r.meeting_date) miss.push(biText('mr.meeting_date'));
    else if (r.meeting_date > today()) miss.push(biText('mr.meeting_future'));
    if (!String(r.chair_name || '').trim()) miss.push(biText('mr.chair'));
    if (!r.conclusion_vi && !r.conclusion_zh) miss.push(biText('mr.conclusion'));
    if (miss.length) { toast(bi('mr.hold_missing', { L: esc(miss.join('; ')) }), 'err'); return; }
    const ok = await dialog({ title: bi('mr.hold'), body: `<p>${bi('mr.hold_confirm', { C: esc(r.code), D: esc(fmtDate(r.meeting_date)) })}</p>`,
      actions: [{ label: bi('btn.cancel'), value: false }, { label: bi('mr.hold'), kind: 'primary', value: true }] });
    if (!ok) return;
    const res = await writeWithPin('mreview.hold', { review_id: r.review_id }, { expected_version: r.record_version, timeoutMs: 120000 });
    if (res.ok) { toast(bi('mr.held_ok'), 'ok'); await reload(); return; }
    writeFail(res);
  });
  on('mr-reopen', async () => {
    const ok = await dialog({ title: bi('mr.reopen'), body: `<p>${bi('mr.reopen_confirm')}</p>`, actions: [{ label: bi('btn.cancel'), value: false }, { label: bi('mr.reopen'), kind: 'primary', value: true }] });
    if (!ok) return;
    const res = await writeWithPin('mreview.hold', { review_id: r.review_id, undo: true }, { expected_version: r.record_version });
    if (res.ok) { toast(bi('form.saved'), 'ok'); await reload(); return; }
    writeFail(res);
  });
  on('mr-cancel', async () => {
    const reason = await askText('mr.cancel', 'mr.cancel_reason', { required: true });
    if (!reason) return;
    const res = await writeWithPin('mreview.cancel', { review_id: r.review_id, reason }, { expected_version: r.record_version });
    if (res.ok) { toast(bi('form.saved'), 'ok'); await reload(); return; }
    writeFail(res);
  });
  const saveDecisions = async (list) => {
    const res = await writeOnline('mreview.save', { review_id: r.review_id, decisions: decPayload(list) }, { expected_version: r.record_version });
    if (res.ok) { toast(bi('form.saved'), 'ok'); await reload(); return true; }
    if (res.code === 'VALIDATION_ERROR') { toast(esc((res.errors || []).map((e) => e.message_vi ? `${e.message_vi} · ${e.message_zh}` : e.code).join(' · ') || resMsg(res)), 'err'); return false; }
    writeFail(res);
    return false;
  };
  on('mr-dec-add', async () => {
    const d = await decisionDialog(null, um);
    if (!d) return;
    if (!d.kind || (!d.text_vi && !d.text_zh)) { toast(bi('mr.dec_need'), 'err'); return; }
    await saveDecisions(ds.concat([d]));
  });
  view.querySelectorAll('[data-dec-ed]').forEach((b) => b.addEventListener('click', async () => {
    const cur = ds.find((x) => x.id === b.dataset.decEd);
    const d = await decisionDialog(cur, um);
    if (!d) return;
    if (!d.kind || (!d.text_vi && !d.text_zh)) { toast(bi('mr.dec_need'), 'err'); return; }
    await saveDecisions(ds.map((x) => (x.id === d.id ? { ...x, ...d } : x)));
  }));
  view.querySelectorAll('[data-dec-rm]').forEach((b) => b.addEventListener('click', async () => {
    const ok = await dialog({ title: bi('btn.delete'), body: `<p>${bi('mr.dec_rm_confirm')}</p>`, actions: [{ label: bi('btn.cancel'), value: false }, { label: bi('btn.delete'), kind: 'primary danger', value: true }] });
    if (!ok) return;
    await saveDecisions(ds.filter((x) => x.id !== b.dataset.decRm));
  }));
  const decState = async (id, state, extra = {}) => {
    const res = await writeOnline('mreview.decision', { review_id: r.review_id, decision_id: id, state, ...extra }, { expected_version: r.record_version });
    if (res.ok) { toast(bi('form.saved'), 'ok'); await reload(); return; }
    writeFail(res);
  };
  view.querySelectorAll('[data-dec-done]').forEach((b) => b.addEventListener('click', async () => {
    const v = await dialog({
      title: bi('mr.dec_done'),
      body: `<label class="fld"><span>${bi('mr.dec_done_date')}</span><input class="inp" type="date" id="mdd-date" value="${esc(today())}"></label>
        <label class="fld"><span>${bi('mr.dec_note')}</span><textarea class="inp" rows="2" maxlength="1000" id="mdd-note"></textarea></label>`,
      actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('mr.dec_done'), kind: 'primary', read: (w) => ({ done_date: $('#mdd-date', w).value, note: $('#mdd-note', w).value.trim() }) }]
    });
    if (!v) return;
    await decState(b.dataset.decDone, 'DONE', v);
  }));
  view.querySelectorAll('[data-dec-open]').forEach((b) => b.addEventListener('click', () => decState(b.dataset.decOpen, 'OPEN')));
  view.querySelectorAll('[data-dec-cancel]').forEach((b) => b.addEventListener('click', async () => {
    const note = await askText('mr.dec_cancel', 'mr.cancel_reason', { required: true });
    if (!note) return;
    await decState(b.dataset.decCancel, 'CANCELLED', { note });
  }));
  if (draft) loadStats();
}

/** 12 mục đầu vào: số liệu tự gom (stats: {data, blocks} hoặc null khi chưa tải) + nhận xét */
function sectionsHtml(r, stats, draft) {
  return MR_INPUTS.map((k) => {
    const note = pair(r['in_' + k + '_vi'], r['in_' + k + '_zh'], r.i18n_meta, 'in_' + k);
    const auto = !MR_MANUAL.includes(k);
    let prevList = '';
    if (k === 'prev' && stats && stats.data && stats.data.prev && stats.data.prev.decisions.length) {
      prevList = `<ul class="plain mr-prev">${stats.data.prev.decisions.map((d) => `<li><span>${d.n}. ${bi('mr.kind.' + d.kind)}: ${pair(d.text_vi, d.text_zh)}</span>
        <span class="small">${badge('mr.dstate.' + d.state)}${d.late ? ' ' + badge('capa.overdue') : ''}${d.owner ? ' · ' + esc(d.owner) : ''}${d.due ? ' · ' + esc(fmtDate(d.due)) : ''}</span></li>`).join('')}</ul>`;
    }
    return `<div class="mr-sec" data-sec="${k}"><h3>${bi('mr.in.' + k)}</h3>
      ${auto ? `<div class="mr-stats">${stats ? blockHtml(stats.blocks[k]) : (draft ? '<div class="spinner small" aria-hidden="true"></div>' : '')}</div>${prevList}` : ''}
      <div class="kv-block"><span class="muted small">${bi('mr.input_note')}</span><p>${note || `<span class="muted">${bi(auto ? 'mr.note_none' : 'mr.note_manual_none')}</span>`}</p></div></div>`;
  }).join('');
}
