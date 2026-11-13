// Gmail nhắc hạn (Đợt 2, phiên 2b — Quản trị): bật / tắt, giờ gửi, hạn mức Gmail còn lại (dùng chung M&E, Checksheet), người nhận
// (email do Quản trị nhập và xác nhận; đổi email thì phải xác nhận lại), Gửi thử, Gửi ngay, việc cần nhắc tính tới hôm nay, nhật ký gửi
// (gửi lại thư lỗi / chưa rõ đã gửi). Máy chủ tính và gửi (19_mail.js); màn này cần mạng.
import { api, bi, esc, badge, fmtDate, fmtDateTime, resMsg } from '../core.js';
import { $, $$, ICON, toast, dialog } from '../ui.js';
import { isWide } from '../shell.js';
import { roleLevel, can } from '../data.js';
import { writeWithPin, writeFail, busy } from '../form.js';

const KINDS = ['REC_OVERDUE', 'REVIEW_DUE', 'VERSION_WAIT', 'CAPA_DUE', 'CAPA_VERIFY', 'CAPA_REPLY', 'NCR_DECIDE', 'NCR_DUE', 'AUDIT_SOON'];
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

const kv = (k, v) => `<div class="kv"><span>${bi(k)}</span><strong>${v}</strong></div>`;

function emailState(r) {
  if (!r.email) return badge('mail.email_none');
  return badge(r.confirmed_at ? 'mail.email_ok' : 'mail.email_unconfirmed');
}

function rolesText(r) {
  const out = [];
  if (r.roles.heads.length) out.push(bi('mail.role.head', { D: esc(r.roles.heads.join(', ')) }));
  if (r.roles.secretary) out.push(bi(r.roles.secretary_fallback ? 'mail.role.secretary_fallback' : 'mail.role.secretary'));
  if (r.roles.docs) out.push(bi('mail.role.docs', { N: r.roles.docs }));
  if (r.roles.admin) out.push(bi('mail.role.admin'));
  return out.length ? out.join(' · ') : `<span class="muted">${bi('mail.role.none')}</span>`;
}

function statusCard(d) {
  const s = d.settings;
  const lr = d.last_run || {};
  const res = lr.result || null;
  const quota = d.quota !== null && d.quota !== undefined ? bi('mail.quota_val', { N: d.quota }) : bi('mail.quota_unknown');
  return `<section class="card" id="ml-status"><div class="card-head"><h2>${bi('admin.mail')}</h2>${badge(s.gmail_enabled ? 'mail.on' : 'mail.off')}</div>
    <p class="muted small">${bi('mail.what', { H: s.email_hour })}</p>
    ${s.gmail_enabled ? '' : `<p class="banner info small">${bi('mail.off_note')}</p>`}
    ${s.gmail_enabled && !d.trigger ? `<p class="banner warn small">${bi('mail.no_trigger')}</p>` : ''}
    ${kv('mail.hour', bi('mail.hour_val', { H: s.email_hour }))}
    ${kv('mail.quota', quota)}
    <p class="muted small">${bi('mail.quota_note', { R: s.mail_quota_reserve })}</p>
    ${kv('mail.last_run', lr.at ? bi('mail.last_val', { T: esc(fmtDateTime(lr.at)), S: res ? res.sent : 0, F: res ? res.failed : 0 }) : bi('mail.never'))}
    ${res && res.quota_stop ? `<p class="banner warn small">${bi('mail.quota_stop')}</p>` : ''}
    <div class="row">
      <button type="button" class="btn${s.gmail_enabled ? '' : ' primary'}" id="ml-toggle">${bi(s.gmail_enabled ? 'mail.btn_off' : 'mail.btn_on')}</button>
      <button type="button" class="btn" id="ml-hour">${ICON.calendar}<span>${bi('mail.btn_hour')}</span></button>
      ${s.gmail_enabled ? `<button type="button" class="btn" id="ml-run">${ICON.sync}<span>${bi('mail.btn_run')}</span></button>` : ''}
    </div></section>`;
}

function recipientsCard(d) {
  const row = (r) => {
    const acts = r.can_edit ? `<div class="row">
        <button type="button" class="btn small" data-email="${esc(r.user_id)}">${ICON.edit}<span>${bi('mail.btn_email')}</span></button>
        ${r.email && !r.confirmed_at ? `<button type="button" class="btn small primary" data-confirm="${esc(r.user_id)}">${ICON.check}<span>${bi('mail.btn_confirm')}</span></button>` : ''}
        ${r.confirmed_at ? `<button type="button" class="btn small" data-test="${esc(r.user_id)}">${bi('mail.btn_test')}</button>
          <button type="button" class="btn small" data-unconfirm="${esc(r.user_id)}">${bi('mail.btn_unconfirm')}</button>` : ''}</div>`
      : `<p class="muted small">${bi('mail.owner_only')}</p>`;
    return `<div class="card rec-card ml-rcpt" data-user="${esc(r.user_id)}"><div class="rec-top"><span class="code">${esc(r.employee_code)}</span>${emailState(r)}</div>
      <div class="rec-name">${esc(r.display_name)}</div>
      <div class="small">${r.email ? `<span class="ml-email">${esc(r.email)}</span>` : ''}</div>
      ${r.confirmed_at ? `<div class="muted small">${bi('mail.confirmed_by', { T: esc(fmtDateTime(r.confirmed_at)), N: esc(r.confirmed_by_name || '') })}</div>` : ''}
      <div class="muted small">${rolesText(r)}</div>
      <div class="rec-actions">${acts}</div></div>`;
  };
  return `<section class="card" id="ml-rcpt"><h2>${bi('mail.rcpt_title')}</h2><p class="muted small">${bi('mail.rcpt_hint')}</p>
    ${!d.recipients.some((r) => r.confirmed_at) ? `<p class="banner warn small">${bi('mail.need_recipient')}</p>` : ''}
    <div class="cards">${d.recipients.map(row).join('')}</div></section>`;
}

function previewCard(d) {
  const byUser = new Map();
  for (const p of d.preview) {
    if (!byUser.has(p.user_id)) byUser.set(p.user_id, []);
    byUser.get(p.user_id).push(p);
  }
  const names = new Map(d.recipients.map((r) => [r.user_id, r.display_name]));
  const line = (p) => `<li><a class="cat-row" href="#${esc(p.path)}"><span class="cat-top"><span class="code">${esc(p.code)}</span>${badge('mail.kind_short.' + p.kind)}${badge('mail.st.' + p.state)}</span>
    <span class="cat-name">${esc(p.name)}</span>
    <span class="cat-meta">${p.due_date ? bi('mail.due.' + p.kind, { D: esc(fmtDate(p.due_date)) }) : ''}${p.via === 'FALLBACK' && p.for_names ? ' · ' + bi('mail.fallback', { N: esc(p.for_names) }) : ''}</span>${ICON.chevron}</a></li>`;
  const groups = [...byUser.entries()].map(([uid, list]) => {
    list.sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || String(a.code).localeCompare(String(b.code)));
    return `<details class="ml-prev" open><summary><strong>${esc(names.get(uid) || uid)}</strong> · ${bi('mail.preview_n', { N: list.length })}</summary>
      <ul class="cat-list">${list.map(line).join('')}</ul></details>`;
  }).join('');
  return `<section class="card" id="ml-preview"><h2>${bi('mail.preview_title')}</h2>
    <p class="muted small">${bi('mail.preview_note', { D: esc(fmtDate(d.next_monday)) })}</p>
    ${d.unreachable.length ? `<p class="banner warn small">${bi('mail.unreachable', { N: d.unreachable.length })}</p>` : ''}
    ${groups || `<p class="muted">${bi('mail.preview_none')}</p>`}</section>`;
}

function rulesCard(d) {
  return `<section class="card"><h2>${bi('mail.rules_title')}</h2><ul class="plain small">
    ${KINDS.map((k) => `<li>${badge('mail.kind_short.' + k)} ${bi('mail.rule.' + k, { N: d.settings.version_wait_days })}</li>`).join('')}</ul></section>`;
}

function canResend(l) {
  return l.status === 'UNKNOWN' || (l.status === 'FAILED' && l.attempt_count >= 3);
}

function logCard(d) {
  if (!d.logs.length) return `<section class="card"><h2>${bi('mail.log_title')}</h2><p class="muted">${bi('mail.log_none')}</p></section>`;
  const when = (l) => esc(fmtDateTime(l.sent_at || l.attempt_at || l.queued_at));
  const err = (l) => (l.error_code && l.status !== 'SENT' ? `<div class="muted small">${esc(l.error_code)}${l.attempt_count ? ' · ' + bi('mail.tries', { N: l.attempt_count }) : ''}</div>` : '');
  const act = (l) => (canResend(l) ? `<button type="button" class="btn small" data-resend="${esc(l.notification_id)}">${bi('mail.btn_resend')}</button>` : '');
  const body = isWide()
    ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>${bi('mail.col_time')}</th><th>${bi('mail.col_to')}</th><th>${bi('mail.col_item')}</th><th>${bi('mail.col_state')}</th><th></th></tr></thead>
      <tbody>${d.logs.map((l) => `<tr><td>${when(l)}</td><td>${esc(l.recipient)}<div class="muted small">${esc(l.email)}</div></td>
        <td>${l.kind ? badge('mail.kind_short.' + l.kind) : ''} <span class="code">${esc(l.code)}</span><div class="small">${esc(l.name)}</div></td>
        <td>${badge('mail.st.' + l.status)}${err(l)}</td><td>${act(l)}</td></tr>`).join('')}</tbody></table></div>`
    : `<div class="cards">${d.logs.map((l) => `<div class="card rec-card"><div class="rec-top"><span class="code">${esc(l.code)}</span>${badge('mail.st.' + l.status)}</div>
        <div class="rec-name">${esc(l.name)}</div><div class="muted small">${l.kind ? badge('mail.kind_short.' + l.kind) : ''} ${esc(l.recipient)} · ${when(l)}</div>${err(l)}
        ${canResend(l) ? `<div class="rec-actions">${act(l)}</div>` : ''}</div>`).join('')}</div>`;
  return `<section class="card" id="ml-log"><h2>${bi('mail.log_title')}</h2>${body}</section>`;
}

/** Hộp nhập email: trả {email, confirm} hoặc null */
async function emailDialog(r) {
  return dialog({
    title: `${bi('mail.btn_email')} · ${esc(r.display_name)}`,
    body: `<label class="lbl" for="ml-email-in">${bi('mail.email_label')}</label>
      <input class="inp" id="ml-email-in" type="email" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="120" value="${esc(r.email || '')}">
      <label class="check"><input type="checkbox" id="ml-email-ok" checked><span>${bi('mail.confirm_check')}</span></label>`,
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('btn.save'), kind: 'primary', read: (w) => ({ email: $('#ml-email-in', w).value.trim(), confirm: $('#ml-email-ok', w).checked }) }]
  });
}

export async function renderMail(view, ctx) {
  const { shell } = ctx;
  shell.setScreen({ title: 'admin.mail', back: '/account' });
  if (roleLevel() < 4) { view.innerHTML = `<div class="card empty-state">${ICON.lock}<p class="muted">${bi('mail.no_access')}</p></div>`; return; }
  if (!(await can('mail.view'))) { view.innerHTML = `<div class="card empty-state">${ICON.sync}<p class="muted">${bi('mail.server_old')}</p></div>`; return; }
  if (!navigator.onLine) { view.innerHTML = `<div class="card empty-state">${ICON.sync}<p class="muted">${bi('sync.need_network')}</p></div>`; return; }
  if (!view.querySelector('.ml')) view.innerHTML = '<div class="spinner" role="status"></div>';
  const r = await api('mail.view', {}, { retry: true });
  if (ctx.isCurrent && !ctx.isCurrent()) return;
  if (!r.ok) { view.innerHTML = `<div class="card">${esc(resMsg(r))}</div>`; return; }
  const d = r.data;
  view.innerHTML = `<div class="ml">${statusCard(d)}${recipientsCard(d)}${previewCard(d)}${rulesCard(d)}${logCard(d)}</div>`;
  const again = () => renderMail(view, ctx);
  const rcpt = (id) => d.recipients.find((x) => x.user_id === id);

  const setRecipient = async (btn, u, payload, okKey) => {
    busy(btn, true);
    const res = await writeWithPin('mail.recipient.set', { user_id: u.user_id, ...payload }, { expected_version: u.record_version });
    busy(btn, false);
    if (res.ok) { toast(bi(okKey), 'ok'); again(); return; }
    writeFail(res);
  };

  $('#ml-toggle', view).addEventListener('click', async (ev) => {
    const on = !d.settings.gmail_enabled;
    if (!on && !await dialog({ title: bi('mail.btn_off'), body: `<p>${bi('mail.off_confirm')}</p>`, actions: [{ label: bi('btn.cancel'), value: false }, { label: bi('mail.btn_off'), kind: 'danger', value: true }] })) return;
    const btn = ev.currentTarget;
    busy(btn, true);
    const res = await writeWithPin('mail.settings.set', { gmail_enabled: on });
    busy(btn, false);
    if (res.ok) { toast(bi(on ? 'mail.saved_on' : 'mail.saved_off'), 'ok'); again(); return; }
    writeFail(res);
  });
  $('#ml-hour', view).addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    const h = await dialog({
      title: bi('mail.btn_hour'),
      body: `<label class="lbl" for="ml-hour-in">${bi('mail.hour')}</label><select class="inp sel" id="ml-hour-in">
        ${Array.from({ length: 24 }, (_, i) => `<option value="${i}"${i === d.settings.email_hour ? ' selected' : ''}>${String(i).padStart(2, '0')}:00</option>`).join('')}</select>`,
      actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('btn.save'), kind: 'primary', read: (w) => Number($('#ml-hour-in', w).value) }]
    });
    if (h === null || h === undefined || h === d.settings.email_hour) return;
    busy(btn, true);
    const res = await writeWithPin('mail.settings.set', { email_hour: h });
    busy(btn, false);
    if (res.ok) { toast(bi('mail.saved_hour'), 'ok'); again(); return; }
    writeFail(res);
  });
  const run = $('#ml-run', view);
  if (run) run.addEventListener('click', async (ev) => {
    if (!await dialog({ title: bi('mail.btn_run'), body: `<p>${bi('mail.run_confirm')}</p>`, actions: [{ label: bi('btn.cancel'), value: false }, { label: bi('mail.btn_run'), kind: 'primary', value: true }] })) return;
    const btn = ev.currentTarget;
    busy(btn, true);
    const res = await writeWithPin('mail.run', {}, { timeoutMs: 150000 });
    busy(btn, false);
    if (res.ok) { toast(bi('mail.run_done', { S: res.data.sent, F: res.data.failed, Q: res.data.queued }), res.data.failed ? 'err' : 'ok'); again(); return; }
    writeFail(res);
  });
  $$('[data-email]', view).forEach((b) => b.addEventListener('click', async () => {
    const u = rcpt(b.dataset.email);
    const v = await emailDialog(u);
    if (!v) return;
    if (v.email && !EMAIL_RE.test(v.email)) { toast(bi('mail.bad_email'), 'err'); return; }
    await setRecipient(b, u, { email: v.email, confirm: !!(v.email && v.confirm) }, v.email && v.confirm ? 'mail.email_confirmed' : 'mail.email_saved');
  }));
  $$('[data-confirm]', view).forEach((b) => b.addEventListener('click', () => setRecipient(b, rcpt(b.dataset.confirm), { confirm: true }, 'mail.email_confirmed')));
  $$('[data-unconfirm]', view).forEach((b) => b.addEventListener('click', () => setRecipient(b, rcpt(b.dataset.unconfirm), { confirm: false }, 'mail.email_unconfirmed_saved')));
  $$('[data-test]', view).forEach((b) => b.addEventListener('click', async () => {
    const u = rcpt(b.dataset.test);
    if (!await dialog({ title: bi('mail.btn_test'), body: `<p>${bi('mail.test_confirm', { E: esc(u.email) })}</p>`, actions: [{ label: bi('btn.cancel'), value: false }, { label: bi('mail.btn_test'), kind: 'primary', value: true }] })) return;
    busy(b, true);
    const res = await writeWithPin('mail.test', { user_id: u.user_id }, { timeoutMs: 120000 });
    busy(b, false);
    if (!res.ok) { writeFail(res); return; }
    if (res.data.ok) toast(bi('mail.test_sent', { E: esc(res.data.to), N: res.data.items }), 'ok');
    else toast(bi('mail.test_failed', { E: esc(res.data.error) }), 'err');
    again();
  }));
  $$('[data-resend]', view).forEach((b) => b.addEventListener('click', async () => {
    if (!await dialog({ title: bi('mail.btn_resend'), body: `<p>${bi('mail.resend_confirm')}</p>`, actions: [{ label: bi('btn.cancel'), value: false }, { label: bi('mail.btn_resend'), kind: 'primary', value: true }] })) return;
    busy(b, true);
    const res = await writeWithPin('mail.resend', { notification_id: b.dataset.resend });
    busy(b, false);
    if (res.ok) { toast(bi(res.data.status === 'SENT' ? 'mail.resent' : 'mail.test_failed', { E: esc(res.data.error || '') }), res.data.status === 'SENT' ? 'ok' : 'err'); again(); return; }
    writeFail(res);
  }));
}
