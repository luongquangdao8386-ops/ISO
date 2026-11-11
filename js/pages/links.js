// Kết nối M&E / Checksheet (Đợt 2, phiên 2a — Quản trị): link /exec + mã kết nối của từng app, Thử kết nối (không lưu), Lưu (PIN,
// thử lại trước khi lưu), Ngắt kết nối (PIN), Cập nhật ngay; lần lấy gần nhất, mã biểu lạ; biểu nhận ngày có hồ sơ từ app kia và
// biểu nơi làm M&E / Checksheet chưa nhận ngày nào (để soát mã biểu bên app kia). App ISO chỉ đọc, không ghi sang M&E / Checksheet.
import { api, bi, biText, esc, badge, fmtDate, fmtDateTime, nameText, resMsg } from '../core.js';
import { $, ICON, toast, dialog } from '../ui.js';
import { isWide } from '../shell.js';
import { roleLevel, can, items, recs, evidenceSources, periodTypeOf } from '../data.js';
import { writeWithPin, writeOnline, busy } from '../form.js';
import { syncNow } from '../app.js';
import { evidenceSourceOf } from '../periods.js';

const SOURCES = ['ME', 'CS'];
const LONG = 150000; // thử / lấy 400 ngày từ app kia: tới vài chục giây
const EXEC_RE = /^https:\/\/script\.google\.com\/(a\/macros\/[^/]+|macros)\/s\/[A-Za-z0-9_-]{20,}\/exec$/;

/** Lời báo khi không lấy được (máy chủ trả LINK_FAILED {reason}) */
export function linkErrText(r) {
  const reason = r && r.data && r.data.reason;
  if (r && r.code === 'LINK_FAILED' && reason) return bi('link.err.' + reason);
  if (r && r.code === 'VALIDATION_ERROR' && r.errors && r.errors.length) return esc(r.errors.map((e) => `${e.message_vi} · ${e.message_zh || ''}`).join(' · '));
  return esc(resMsg(r));
}

function statusBadge(s) {
  if (!s.linked) return badge('link.st.OFF');
  if (s.last_status === 'FAILED') return badge('link.st.FAILED');
  return badge('link.st.ON');
}

function srcCard(s, open) {
  const st = s.stats || {};
  const unk = s.unknown || [];
  const kv = (k, v) => `<div class="kv"><span>${bi(k)}</span><strong>${v}</strong></div>`;
  const form = `<div class="lk-form" id="lk-form-${s.source}"${s.linked && !open ? ' hidden' : ''}>
    <label class="lbl" for="lk-url-${s.source}">${bi('link.exec_url')}</label>
    <input class="inp" id="lk-url-${s.source}" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="300" placeholder="https://script.google.com/macros/s/…/exec">
    <label class="lbl" for="lk-key-${s.source}">${bi('link.key')}</label>
    <input class="inp" id="lk-key-${s.source}" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="200">
    <p class="muted small">${bi('link.key_hint.' + s.source)}</p>
    <div class="row"><button type="button" class="btn" data-test="${s.source}">${ICON.check}<span>${bi('link.test')}</span></button>
      <button type="button" class="btn primary" data-save="${s.source}">${ICON.link}<span>${bi('link.save')}</span></button></div>
  </div>`;
  return `<section class="card lk-card" id="lk-${s.source}"><div class="card-head"><h2>${bi('link.src.' + s.source)}</h2>${statusBadge(s)}</div>
    ${s.linked ? `${kv('link.exec_url', `<span class="code">${esc(s.exec_url_tail)}</span>`)}
      ${kv('link.last_at', `${esc(fmtDateTime(s.last_at) || '—')}${s.last_status ? ' ' + badge('link.last.' + s.last_status) : ''}`)}
      ${s.last_status === 'FAILED' ? kv('link.ok_at', esc(fmtDateTime(s.ok_at) || '—')) : ''}
      ${st.matched !== undefined ? kv('link.matched', bi('link.matched_n', { N: st.matched, D: st.dates })) : ''}
      ${s.last_status === 'FAILED' && s.last_error ? `<p class="banner warn small">${bi('link.err.' + s.last_error)}</p>` : ''}
      ${unk.length ? `<details class="lk-unk"><summary>${bi('link.unknown_n', { N: unk.length })}</summary><p class="muted small">${bi('link.unknown_hint')}</p>
        <ul class="plain small">${unk.map((u) => `<li><span class="code">${esc(u.code)}</span> · ${bi('link.days_n', { N: u.n })}</li>`).join('')}</ul></details>` : ''}
      <div class="row"><button type="button" class="btn small" data-sync="${s.source}">${ICON.sync}<span>${bi('link.sync_now')}</span></button>
        <button type="button" class="btn small" data-edit="${s.source}"${open ? ' hidden' : ''}>${ICON.edit}<span>${bi('link.change')}</span></button>
        <button type="button" class="btn small danger" data-clear="${s.source}">${bi('link.clear')}</button></div>`
    : `<p class="muted small">${bi('link.off_hint.' + s.source)}</p>`}
    ${form}<div class="lk-res" id="lk-res-${s.source}" aria-live="polite"></div></section>`;
}

/** Kết quả thử / lấy: số dòng ngày, số biểu ghép được, mã lạ */
function resultHtml(t, saved) {
  return `<div class="banner info small">${bi(saved ? 'link.saved_res' : 'link.test_ok', { D: t.dates, N: t.matched })}
    ${t.unknown_n ? `<br>${bi('link.unknown_n', { N: t.unknown_n })}: ${t.unknown.slice(0, 12).map((u) => `<span class="code">${esc(u.code)}</span>`).join(', ')}${t.unknown_n > 12 ? '…' : ''}` : ''}
    ${t.bad ? `<br>${bi('link.bad_n', { N: t.bad })}` : ''}</div>`;
}

/** Biểu nhận ngày có hồ sơ từ app kia (dữ liệu đã đồng bộ) và biểu nơi làm M&E / Checksheet chưa nhận ngày nào */
async function itemsCard() {
  const list = await items();
  const ev = (await recs('EVIDENCE')).filter((e) => !e.archived_at && Number(e.count) > 0);
  const srcs = evidenceSources();
  const by = new Map();
  for (const e of ev) {
    const k = e.item_id + '|' + e.source;
    const a = by.get(k) || { item_id: e.item_id, source: e.source, last: '', n: 0 };
    a.n += Number(e.count) || 0;
    if (String(e.last_date) > a.last) a.last = String(e.last_date);
    by.set(k, a);
  }
  const itMap = new Map(list.map((x) => [x.item_id, x]));
  const got = [...by.values()].filter((a) => itMap.has(a.item_id)).sort((a, b) => String(itMap.get(a.item_id).code).localeCompare(String(itMap.get(b.item_id).code)));
  const haveIds = new Set(got.map((a) => a.item_id));
  // Biểu in hẳn từ app (nơi làm M&E / Checksheet) mà app đã nối chưa gửi ngày nào: thường do mã biểu bên app kia khác mã danh mục
  const missing = list.filter((it) => (it.where === 'ME' || it.where === 'CS') && srcs[evidenceSourceOf(it)] && !haveIds.has(it.item_id) && it.status !== 'NA');
  if (!got.length && !missing.length) return '';
  const row = (it, tail) => `<li><a class="cat-row" href="#/item/${encodeURIComponent(it.item_id)}"><span class="cat-top"><span class="code">${esc(it.code)}</span>${badge('where.' + (it.where || 'MANUAL'))}</span>
    <span class="cat-name">${esc(nameText(it))}</span><span class="cat-meta">${tail}</span>${ICON.chevron}</a></li>`;
  return `<section class="card"><h2>${bi('link.items_title')}</h2><p class="muted small">${bi('link.items_hint')}</p>
    ${got.length ? `<ul class="cat-list">${got.map((a) => row(itMap.get(a.item_id), bi('link.got.' + a.source, { D: esc(fmtDate(a.last)), N: a.n }))).join('')}</ul>` : ''}
    ${missing.length ? `<h3>${bi('link.missing_title', { N: missing.length })}</h3><p class="muted small">${bi('link.missing_hint')}</p>
      <ul class="cat-list">${missing.map((it) => row(it, bi('period.' + periodTypeOf(it)))).join('')}</ul>` : ''}</section>`;
}

export async function renderLinks(view, ctx) {
  const { shell } = ctx;
  shell.setScreen({ title: 'nav.links', back: isWide() ? null : '/account' });
  if (roleLevel() < 4) {
    view.innerHTML = `<div class="card empty-state">${ICON.link}<p class="muted">${bi('link.no_access')}</p></div>`;
    return;
  }
  if (!(await can('link.info'))) { view.innerHTML = `<div class="card empty-state">${ICON.sync}<p class="muted">${bi('link.server_old')}</p></div>`; return; }
  if (!navigator.onLine) { view.innerHTML = `<div class="card empty-state">${ICON.sync}<p class="muted">${bi('sync.need_network')}</p></div>${await itemsCard()}`; return; }
  if (!view.querySelector('.lk')) view.innerHTML = '<div class="spinner" role="status"></div>';
  const r = await api('link.info', {}, { retry: true });
  if (ctx.isCurrent && !ctx.isCurrent()) return;
  if (!r.ok) { view.innerHTML = `<div class="card">${esc(resMsg(r))}</div>`; return; }
  const info = r.data;
  const open = new Set();
  const again = async () => { const x = await api('link.info', {}, { retry: true }); if (x.ok) { Object.assign(info, x.data); } draw(); };
  const draw = async () => {
    const anyLinked = SOURCES.some((s) => info.sources[s].linked);
    const bothLinked = SOURCES.every((s) => info.sources[s].linked);
    view.innerHTML = `<div class="lk">
      <section class="card"><p>${bi('link.what')}</p><p class="muted small">${bi('link.what2', { N: info.feed_days })}</p>
        ${anyLinked && !info.trigger ? `<p class="banner warn small">${bi('link.no_trigger')}</p>` : ''}
        ${bothLinked ? `<div class="row"><button type="button" class="btn primary" id="lk-sync-all">${ICON.sync}<span>${bi('link.sync_all')}</span></button></div>` : ''}</section>
      ${SOURCES.map((s) => srcCard(info.sources[s], open.has(s))).join('')}
      ${await itemsCard()}
    </div>`;
    wire();
  };
  const inputs = (src) => ({ exec_url: $('#lk-url-' + src, view).value.trim(), key: $('#lk-key-' + src, view).value.trim() });
  const check = (src, v) => {
    if (!EXEC_RE.test(v.exec_url)) { toast(bi('link.bad_url'), 'err'); $('#lk-url-' + src, view).focus(); return false; }
    if (v.key.length < 24) { toast(bi('link.bad_key'), 'err'); $('#lk-key-' + src, view).focus(); return false; }
    return true;
  };
  const show = (src, html) => { const b = $('#lk-res-' + src, view); if (b) b.innerHTML = html; };
  const afterChange = async () => {
    // Cài đặt evidence_sources và dòng EVIDENCE đổi: tải lại dữ liệu trên máy để bảng kỳ tính theo app vừa nối
    await syncNow({ quiet: true });
    if (ctx.isCurrent && !ctx.isCurrent()) return;
    await again();
  };
  const wire = () => {
    view.querySelectorAll('[data-test]').forEach((b) => b.addEventListener('click', async () => {
      const src = b.dataset.test;
      const v = inputs(src);
      if (!check(src, v)) return;
      busy(b, true);
      show(src, `<p class="muted small">${bi('link.testing')}</p>`);
      const x = await api('link.test', { source: src, ...v }, { timeoutMs: LONG });
      busy(b, false);
      show(src, x.ok ? resultHtml(x.data.test, false) : `<p class="banner warn small">${linkErrText(x)}</p>`);
    }));
    view.querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', async () => {
      const src = b.dataset.save;
      const v = inputs(src);
      if (!check(src, v)) return;
      busy(b, true);
      show(src, `<p class="muted small">${bi('link.testing')}</p>`);
      const x = await writeWithPin('link.set', { source: src, ...v }, { timeoutMs: LONG });
      busy(b, false);
      if (!x.ok) { show(src, x.code === 'REAUTH_REQUIRED' ? '' : `<p class="banner warn small">${linkErrText(x)}</p>`); return; }
      toast(bi('link.saved'), 'ok');
      open.delete(src);
      await afterChange();
      show(src, resultHtml(x.data.sync, true));
    }));
    view.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
      const src = b.dataset.edit;
      open.add(src);
      $('#lk-form-' + src, view).hidden = false;
      b.hidden = true;
      $('#lk-url-' + src, view).focus();
    }));
    view.querySelectorAll('[data-clear]').forEach((b) => b.addEventListener('click', async () => {
      const src = b.dataset.clear;
      const ok = await dialog({ title: bi('link.clear'), body: `<p>${bi('link.clear_confirm.' + src)}</p>`, actions: [{ label: bi('btn.cancel'), value: false }, { label: bi('link.clear'), kind: 'primary danger', value: true }] });
      if (!ok) return;
      busy(b, true);
      const x = await writeWithPin('link.set', { source: src, clear: true }, { timeoutMs: LONG });
      busy(b, false);
      if (!x.ok) { if (x.code !== 'REAUTH_REQUIRED') toast(linkErrText(x), 'err'); return; }
      toast(bi('link.cleared'), 'ok');
      await afterChange();
    }));
    const runSync = async (b, source) => {
      busy(b, true);
      const x = await writeOnline('evidence.sync', source ? { source } : {}, { timeoutMs: LONG * 2 });
      busy(b, false);
      if (!x.ok) { toast(linkErrText(x), 'err'); return; }
      const res = x.data.results || {};
      const bad = Object.keys(res).filter((k) => !res[k].ok);
      if (bad.length) toast(bad.map((k) => `${biText('link.src_short.' + k)}: ${biText('link.err.' + (res[k].reason || 'REMOTE_ERROR'))}`).join(' · '), 'err');
      else toast(bi('link.synced'), 'ok');
      await afterChange();
      for (const k of Object.keys(res)) if (res[k].ok) show(k, resultHtml(res[k].sync, true));
    };
    view.querySelectorAll('[data-sync]').forEach((b) => b.addEventListener('click', () => runSync(b, b.dataset.sync)));
    const all = $('#lk-sync-all', view);
    if (all) all.addEventListener('click', () => runSync(all, ''));
  };
  await draw();
}
