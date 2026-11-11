// Hồ sơ (phiên 1c, mục 6.2–6.3 đặc tả): bảng kỳ theo bộ phận (mỗi biểu một dòng, 12 kỳ gần nhất: ✓ đúng hạn · ! quá hạn ·
// – chưa tới hạn · trống không tính), nộp hồ sơ (chụp nhiều trang hoặc chọn tệp, theo kỳ hoặc khoảng ngày, làm được khi mất mạng:
// record.submit rồi doc.upload vào hàng chờ, có mạng tự gửi), chi tiết hồ sơ, trả lại hồ sơ nộp sai (trưởng bộ phận / Thư ký ISO, PIN).
// Tình trạng tính trên máy (js/periods.js, giống record.status của máy chủ) từ dữ liệu đã đồng bộ + hồ sơ đang chờ gửi.
import { bi, biText, esc, fmtDate, fmtDateTime, badge, nameText, uuid, session, blobToB64, b64ToBytes } from '../core.js';
import { ICON, toast, dialog, $, setViewHtml, wireSearch, freshFilters, listChunk, wireMore } from '../ui.js';
import { isWide } from '../shell.js';
import { byId, recs, items, depts, users, userName, today, seesAll, myDepts, itemHay, foldVi, canSeeRecords, canSubmitRecord, canReturnRecord,
  canRecordFiles, recordCheck, periodTypeOf, recordsOf, recordStatusMap, invalidateRecordStatus, invalidate, recordsOn } from '../data.js';
import { enqueue, queueItems } from '../sync.js';
import { navigate, refresh } from '../router.js';
import { app, syncNow, afterCommit, updateSyncStatus } from '../app.js';
import { dateInput, wireForm, readField, showErrors, writeWithPin, writeFail, busy } from '../form.js';
import { docButton, wireDocButtons, checkFile, recordFileKind, mimeOf, KIND_ACCEPT, fmtSize, viewImage } from '../files.js';
import { processPhoto } from '../media.js';
import { openScanner, parseScan, resolveScan } from '../scan.js';
import { periodOf, periodsInRange, lastPeriods, periodTicks, addDays, daysBetween, isDate } from '../periods.js';
import { statusDot } from './catalog.js';
import { pendingFor } from '../pending.js';

const SECTION_TYPES = ['DAY', 'WEEK', 'MONTH', 'QUARTER', 'HALF', 'YEAR'];
const SYM = { OK: '✓', PEND: '✓', LATE: '!', DUE: '–', NA: '' };
const MAX_FILES = 30;

/* ====================== Thành phần dùng chung ====================== */

/** Khoảng kỳ "01/10/2026 – 31/10/2026" (một ngày thì một ngày) */
export function rangeText(from, to) {
  return from === to ? esc(fmtDate(from)) : `${esc(fmtDate(from))} – ${esc(fmtDate(to))}`;
}

/** Tên kỳ đầy đủ: "Tuần 46 · 09/11–15/11/2026", "Tháng 11/2026"… */
export function periodName(type, p) {
  switch (type) {
    case 'DAY': return esc(fmtDate(p.from));
    case 'WEEK': return `${bi('period.week', { N: p.key.slice(-2) })} · ${rangeText(p.from, p.to)}`;
    case 'MONTH': return `${bi('period.month', { M: p.key.slice(5, 7) })}/${esc(p.key.slice(0, 4))}`;
    case 'QUARTER': return `${esc(p.key.slice(-2))}/${esc(p.key.slice(0, 4))} · ${rangeText(p.from, p.to)}`;
    case 'HALF': return `${esc(p.key.slice(-2))}/${esc(p.key.slice(0, 4))} · ${rangeText(p.from, p.to)}`;
    case 'YEAR': return esc(p.key);
    default: return '';
  }
}

/** Hàng đầu cột (12 kỳ) của một loại kỳ */
export function ticksHtml(type, t = today()) {
  return `<div class="rg-ticks" aria-hidden="true">${lastPeriods(type, t).map((p) => { const [a, b] = periodTicks(type, p); return `<span><b>${esc(a)}</b>${b ? `<i>${esc(b)}</i>` : ''}</span>`; }).join('')}</div>`;
}

/** Dải 12 ô tình trạng của một biểu; bấm ô → hộp thoại kỳ (data-cell = chỉ số ô) */
export function cellsHtml(s, itemId) {
  return `<div class="rg-cells" role="group">${s.cells.map((c, i) => `<button type="button" class="rg-cell c-${c.st}" data-item="${esc(itemId)}" data-cell="${i}" title="${esc(c.key)} · ${esc(biText('cell.' + c.st))}" aria-label="${esc(c.key)}: ${esc(biText('cell.' + c.st))}">${SYM[c.st]}</button>`).join('')}</div>`;
}

export function legendHtml() {
  return `<div class="rg-legend small">${['OK', 'PEND', 'LATE', 'DUE', 'NA'].map((k) => `<span><i class="rg-cell c-${k}">${SYM[k]}</i>${bi('cell.' + k)}</span>`).join('')}</div>`;
}

/** Ghi chú khi biểu không tính hồ sơ */
export function reasonHtml(s) {
  if (!s || s.counted) return '';
  return `<p class="muted small">${bi('rec.reason.' + s.reason)}</p>`;
}

/** Huy hiệu trạng thái hồ sơ (máy chủ hoặc hàng chờ) */
export function recBadge(r) {
  if (r.queued) return badge(r.op_state === 'REJECTED' ? 'rec.st.REJECTED' : r.op_state === 'CONFLICT' ? 'rec.st.REJECTED' : 'rec.st.QUEUED');
  return badge('rec.st.' + (r.status || 'SUBMITTED'));
}

/** Một dòng hồ sơ trong danh sách */
export function recordRow(r, it, { showItem = false, um = null } = {}) {
  const n = r.queued ? Number(r.pages || 0) : (r.files_json || []).length;
  return `<li><a class="cat-row rec-row" href="#/record/${encodeURIComponent(r.record_id)}">
    <span class="cat-top"><span class="code">${r.code ? esc(r.code) : bi('rec.no_code')}${showItem && it ? ' · ' + esc(it.code) : ''}</span>${recBadge(r)}</span>
    ${showItem && it ? `<span class="cat-name">${esc(nameText(it))}</span>` : ''}
    <span class="cat-meta">${rangeText(r.period_from, r.period_to)} · ${bi('rec.files_short', { N: n })}${um && r.submitted_by ? ' · ' + esc(userName(um, r.submitted_by)) : ''}</span>
    ${r.status === 'RETURNED' && r.return_reason ? `<span class="cat-meta t-red-text">${esc(r.return_reason)}</span>` : ''}
    ${ICON.chevron}</a></li>`;
}

/** Hồ sơ của biểu: trên máy chủ + đang chờ gửi trên máy này (mới nhất trước) */
async function recordsWithQueued(itemId) {
  const server = await recordsOf(itemId);
  const have = new Set(server.map((r) => r.record_id));
  const q = (await queuedRecordOps()).filter((o) => o.payload.item_id === itemId && !have.has(o.payload.record_id)).map(queuedAsRecord);
  return q.concat(server);
}

/** record.submit của tôi còn trong hàng chờ */
async function queuedRecordOps() {
  const uid = session.user && session.user.user_id;
  return (await queueItems().catch(() => [])).filter((o) => o.action === 'record.submit' && o.user_id === uid && o.dataset_epoch === session.epoch);
}
function queuedAsRecord(o) {
  return { ...o.payload, queued: true, op_state: o.state, operation_id: o.operation_id, submitted_by: o.user_id, submitted_at: o.local_created_at, errors: o.errors || [] };
}

/**
 * Hộp thoại một ô: kỳ, hồ sơ phủ kỳ đó (đã ghi nhận / chờ gửi), nút Nộp hồ sơ kỳ này.
 */
export async function openCell(it, s, idx) {
  const c = s.cells[idx];
  if (!c) return;
  const type = s.type;
  const list = [...(c.recs || []), ...(c.pend || []).map((p) => ({ ...p, queued: true }))];
  const can = canSubmitRecord(it) && !recordCheck(it);
  const um = await users();
  const go = await dialog({
    title: `${esc(it.code)} · ${periodName(type, c)}`,
    body: `<p>${badge('cell.' + c.st)} <span class="muted small">${rangeText(c.from, c.to)}</span></p>
      ${list.length ? `<ul class="cat-list">${list.map((r) => recordRow(r, it, { um })).join('')}</ul>` : `<p class="muted">${bi('rec.cell_none')}</p>`}
      ${c.st === 'NA' && !list.length ? reasonHtml(s) || `<p class="muted small">${bi('rec.before_start', { D: esc(fmtDate(s.start)) })}</p>` : ''}`,
    actions: [{ label: bi('btn.close'), value: false }].concat(can ? [{ label: bi('rec.submit_period'), kind: 'primary', value: true }] : [])
  });
  if (go) navigate(`/record/new?item=${encodeURIComponent(it.item_id)}&p=${encodeURIComponent(c.key)}`);
}

/** Gắn hộp thoại cho các ô */
export function wireCells(root, itemMap, statusMap) {
  root.querySelectorAll('.rg-cell[data-cell]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const it = itemMap.get(b.dataset.item);
    const s = statusMap.get(b.dataset.item);
    if (it && s) openCell(it, s, Number(b.dataset.cell));
  }));
  // Danh sách hồ sơ trong hộp thoại: bấm dòng thì hộp thoại đóng theo (đi sang màn hồ sơ)
  document.addEventListener('click', closeModalOnLink, { once: false });
}
function closeModalOnLink(e) {
  const a = e.target.closest && e.target.closest('.modal a[href^="#/record/"]');
  if (a) { const m = a.closest('.modal'); if (m) m.remove(); }
}

/* ====================== Bảng kỳ (/records) ====================== */

const INIT = { q: '', dept: '', f: '' };
const state = { ...INIT };

export async function renderRecords(view, ctx) {
  const { shell, query } = ctx;
  shell.setScreen({
    title: 'nav.records',
    actions: canSeeRecords() ? [{ icon: 'plus', label: biText('item.submit_record'), id: 'rg-new', onClick: () => navigate('/record/new') }] : []
  });
  if (!canSeeRecords()) {
    view.innerHTML = `<div class="card empty-state">${ICON.file}<p class="muted">${bi('rec.no_access')}</p><a class="btn" href="#/catalog">${ICON.library}<span>${bi('nav.catalog')}</span></a></div>`;
    return;
  }
  if (!(await recordsOn())) { view.innerHTML = `<div class="card empty-state">${ICON.sync}<p class="muted">${bi('rec.server_old')}</p></div>`; return; }
  if (ctx.entered) {
    freshFilters(ctx, state, INIT);
    const mine = myDepts();
    if (!seesAll() && mine.length === 1) state.dept = mine[0];
    if (query && query.f) state.f = String(query.f);
    if (query && query.dept) state.dept = String(query.dept);
  }
  const all = await items();
  const sm = await recordStatusMap();
  const deps = await depts();
  const depMap = new Map(deps.map((d) => [d.dept_code, d]));
  const itemMap = new Map(all.map((x) => [x.item_id, x]));
  // Biểu trong bảng: đang tính hồ sơ, hoặc đã có hồ sơ / hồ sơ chờ gửi (vd biểu ◐ đang dùng sổ giấy)
  const shownAll = all.filter((it) => { const s = sm.get(it.item_id); return s && (s.counted || s.count || s.pend_n); });
  const fromApp = all.filter((it) => { const s = sm.get(it.item_id); return s && s.reason === 'FROM_APP'; });
  const t = today();
  const returned = (await pendingFor()).rec_returned;
  const um = await users();
  const draw = () => {
    const q = foldVi(state.q.trim()).split(/\s+/).filter(Boolean);
    const inDept = shownAll.filter((it) => !state.dept || it.dept_code === state.dept);
    const lateN = inDept.filter((it) => sm.get(it.item_id).overdue).length;
    const list = inDept.filter((it) => {
      const s = sm.get(it.item_id);
      if (state.f === 'late' && !s.overdue) return false;
      if (state.f === 'any' && !s.late_n) return false;
      if (q.length) { const hay = itemHay(it); if (!q.every((w) => hay.includes(w))) return false; }
      return true;
    });
    const deptOpts = deps.filter((d) => shownAll.some((x) => x.dept_code === d.dept_code));
    const chips = `<div class="chips" role="group">
      <button type="button" class="chip${state.f === '' ? ' on' : ''}" data-f="">${bi('cat.all')} <b>${inDept.length}</b></button>
      <button type="button" class="chip${state.f === 'late' ? ' on' : ''}" data-f="late">${bi('rec.f_late')} <b>${lateN}</b></button>
      <button type="button" class="chip${state.f === 'any' ? ' on' : ''}" data-f="any">${bi('rec.f_any')} <b>${inDept.filter((it) => sm.get(it.item_id).late_n).length}</b></button>
      ${returned.length || state.f === 'returned' ? `<button type="button" class="chip${state.f === 'returned' ? ' on' : ''}" data-f="returned">${bi('rec.f_returned')} <b>${returned.length}</b></button>` : ''}</div>`;
    const deptSel = deptOpts.length > 1 || state.dept ? `<label class="fld rg-dept"><span>${bi('cat.dept')}</span><select class="inp sel" id="rg-dept">
      <option value="">${esc(biText('cat.all'))}</option>${deptOpts.map((d) => `<option value="${esc(d.dept_code)}"${state.dept === d.dept_code ? ' selected' : ''}>${esc(nameText(d))}</option>`).join('')}</select></label>` : '';
    const sections = SECTION_TYPES.map((type) => {
      const rows = list.filter((it) => sm.get(it.item_id).type === type);
      if (!rows.length) return '';
      const { shown, more } = listChunk('rg-' + type, rows, JSON.stringify(state));
      return `<section class="card rg-sec"><div class="rg-head"><h2>${bi('period.' + type)} <span class="muted small">· ${bi('home.items_n', { N: rows.length })}</span></h2>${ticksHtml(type, t)}</div>
        <ul class="rg-list">${shown.map((it) => {
          const s = sm.get(it.item_id);
          return `<li class="rg-row${s.overdue ? ' late' : ''}"><a class="rg-info" href="#/item/${encodeURIComponent(it.item_id)}"><span class="code">${esc(it.code)}</span>${s.counted ? '' : statusDot(it.status)}
            <span class="rg-name">${esc(it.name_vi || it.name_zh || '')}</span><span class="rg-meta muted small">${esc(depMap.get(it.dept_code) ? depMap.get(it.dept_code).name_vi : it.dept_code)}${s.late_n ? ` · <span class="t-red-text">${bi('rec.late_n', { N: s.late_n })}</span>` : ''}</span></a>
            ${cellsHtml(s, it.item_id)}</li>`;
        }).join('')}</ul>${more}</section>`;
    }).join('');
    const ev = list.filter((it) => sm.get(it.item_id).type === 'EVENT');
    const evHtml = ev.length ? `<section class="card rg-sec"><div class="rg-head"><h2>${bi('period.EVENT')} <span class="muted small">· ${bi('home.items_n', { N: ev.length })}</span></h2><p class="muted small">${bi('rec.event_note')}</p></div>
      <ul class="cat-list">${ev.map((it) => { const s = sm.get(it.item_id); return `<li><a class="cat-row" href="#/item/${encodeURIComponent(it.item_id)}">
        <span class="cat-top"><span class="code">${esc(it.code)}</span>${s.pend_n ? badge('rec.st.QUEUED') : ''}</span><span class="cat-name">${esc(it.name_vi || it.name_zh || '')}</span>
        <span class="cat-meta">${s.count ? bi('rec.event_last', { D: esc(fmtDate(s.last_date)), N: s.count }) : bi('rec.event_none')}</span>${ICON.chevron}</a></li>`; }).join('')}</ul></section>` : '';
    if (state.f === 'returned') {
      setViewHtml(view, `<div class="rg">${chips}<p class="muted small">${bi('rec.returned_hint')}</p>
        ${returned.length ? `<ul class="cat-list">${returned.map((r) => recordRow(r, itemMap.get(r.item_id), { showItem: true, um })).join('')}</ul>` : `<div class="card empty-state">${ICON.check}<p class="muted">${bi('draft.empty')}</p></div>`}</div>`);
      wire();
      return;
    }
    const empty = !shownAll.length ? `<div class="card empty-state">${ICON.file}<p class="muted">${bi('rec.empty_counted')}</p><a class="btn" href="#/catalog">${ICON.library}<span>${bi('nav.catalog')}</span></a></div>`
      : !list.length ? `<div class="card empty-state"><p class="muted">${bi('cat.none_filter')}</p></div>` : '';
    setViewHtml(view, `<div class="rg">
      <div class="search-row"><div class="field search">${ICON.search}<input id="rg-q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="${esc(biText('cat.search_ph'))}" value="${esc(state.q)}"></div></div>
      ${chips}${deptSel}${legendHtml()}
      <p class="muted small">${bi('rec.how', { N: Number((session.settings || {}).record_grace_days ?? 3) })}</p>
      ${empty}${sections}${evHtml}
      ${fromApp.length ? `<p class="muted small rg-app">${bi('rec.from_app_n', { N: fromApp.length })}</p>` : ''}
      <div class="row"><a class="btn primary" href="#/record/new">${ICON.upload}<span>${bi('item.submit_record')}</span></a></div></div>`);
    wire();
  };
  const wire = () => {
    wireSearch(view, '#rg-q', (v) => { state.q = v; }, draw);
    view.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { state.f = b.dataset.f; draw(); }));
    const sel = view.querySelector('#rg-dept');
    if (sel) sel.addEventListener('change', () => { state.dept = sel.value; draw(); });
    wireCells(view, itemMap, sm);
    wireMore(view, draw);
  };
  draw();
}

/* ====================== Nộp hồ sơ (/record/new) ====================== */

/** Biểu người này nộp được, biểu quá hạn lên đầu */
async function submittable() {
  const all = await items();
  const sm = await recordStatusMap();
  return all.filter((it) => canSubmitRecord(it) && !recordCheck(it))
    .sort((a, b) => (sm.get(b.item_id).overdue ? 1 : 0) - (sm.get(a.item_id).overdue ? 1 : 0) || (sm.get(b.item_id).counted ? 1 : 0) - (sm.get(a.item_id).counted ? 1 : 0));
}

const pickState = { q: '' };

async function renderPicker(view, ctx) {
  const list = await submittable();
  const sm = await recordStatusMap();
  if (ctx.entered) pickState.q = '';
  const draw = () => {
    const q = foldVi(pickState.q.trim()).split(/\s+/).filter(Boolean);
    const rows = list.filter((it) => !q.length || q.every((w) => itemHay(it).includes(w)));
    const { shown, more } = listChunk('rec-pick', rows, pickState.q);
    setViewHtml(view, `<div class="rec-pick">
      <p class="muted small">${bi('rec.pick_hint')}</p>
      <div class="row"><button type="button" class="btn primary" id="rp-scan">${ICON.scan}<span>${bi('nav.scan_qr')}</span></button></div>
      <div class="search-row"><div class="field search">${ICON.search}<input id="rp-q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="${esc(biText('cat.search_ph'))}" value="${esc(pickState.q)}"></div></div>
      ${rows.length ? `<ul class="cat-list">${shown.map((it) => { const s = sm.get(it.item_id); return `<li><a class="cat-row" href="#/record/new?item=${encodeURIComponent(it.item_id)}">
        <span class="cat-top"><span class="code">${esc(it.code)}</span>${s.overdue ? badge('cell.LATE') : statusDot(it.status)}</span>
        <span class="cat-name">${esc(it.name_vi || it.name_zh || '')}</span><span class="cat-meta">${bi('period.' + s.type)}${s.count ? ' · ' + bi('rec.last_short', { D: esc(fmtDate(s.last_date)) }) : ''}</span>${ICON.chevron}</a></li>`; }).join('')}</ul>${more}`
        : `<div class="card empty-state"><p class="muted">${bi(list.length ? 'cat.none_filter' : 'rec.pick_none')}</p></div>`}</div>`);
    wireSearch(view, '#rp-q', (v) => { pickState.q = v; }, draw);
    wireMore(view, draw);
    const sc = view.querySelector('#rp-scan');
    if (sc && !sc._wired) {
      sc._wired = true;
      sc.addEventListener('click', () => openScanner({
        onResult: async (raw, info) => {
          const r = await resolveScan(parseScan(raw, info.manual));
          if (r.qr_state === 'OK') navigate('/record/new?item=' + encodeURIComponent(r.item_id), { replace: true });
          else toast(bi(r.qr_state === 'FOREIGN' ? 'qr_foreign' : 'qr_unavailable'), 'err');
        }
      }));
    }
  };
  draw();
}

/** Kỳ gợi ý: kỳ đã kết thúc gần nhất còn thiếu hồ sơ (! hoặc –), không có thì kỳ hiện tại */
function suggestPeriod(s, t) {
  const cur = periodOf(s.type, t);
  for (let i = s.cells.length - 1; i >= 0; i--) {
    const c = s.cells[i];
    if (c.to < t && (c.st === 'LATE' || c.st === 'DUE')) return c.key;
    if (c.to < t && (c.st === 'OK' || c.st === 'PEND')) break;
  }
  return cur.key;
}

/** Khoảng ngày gợi ý cho biểu hằng ngày/tuần: từ ngày sau lần nộp gần nhất (trong 62 ngày) hoặc đầu tháng, tới hôm nay */
function suggestRange(s, t) {
  let from = t.slice(0, 8) + '01';
  if (s.last_date && daysBetween(s.last_date, t) <= 62 && s.last_date < t) from = addDays(s.last_date, 1);
  if (s.start && from < s.start && s.start <= t) from = s.start;
  return { from, to: t };
}

export async function renderRecordNew(view, ctx) {
  const { shell, query } = ctx;
  const it = query && query.item ? await byId('ITEM', query.item) : null;
  shell.setScreen({ title: 'item.submit_record', back: it ? '/item/' + encodeURIComponent(it.item_id) : '/records' });
  if (!canSeeRecords()) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('rec.no_access')}</p></div>`; return; }
  if (!(await recordsOn())) { view.innerHTML = `<div class="card empty-state">${ICON.sync}<p class="muted">${bi('rec.server_old')}</p></div>`; return; }
  if (!it) { await renderPicker(view, ctx); return; }
  const bad = recordCheck(it);
  if (bad || !canSubmitRecord(it)) {
    view.innerHTML = `<div class="card empty-state"><p><span class="code">${esc(it.code)}</span></p><p class="muted">${bad ? bi('rec.no_record.' + bad) : bi('err.forbidden')}</p>
      <a class="btn" href="#/item/${encodeURIComponent(it.item_id)}">${bi('btn.back')}</a></div>`;
    return;
  }
  const sm = await recordStatusMap();
  const s = sm.get(it.item_id);
  const type = s.type;
  const t = today();
  const periods = type === 'EVENT' ? [] : lastPeriods(type, t).slice().reverse();
  const want = query && query.p ? String(query.p) : '';
  const sugKey = want && periods.some((p) => p.key === want) ? want : (type === 'EVENT' ? '' : suggestPeriod(s, t));
  const rangeFirst = (type === 'DAY' || type === 'WEEK') && !want;
  const sr = suggestRange(s, t);
  const qFrom = query && isDate(query.from) ? query.from : '', qTo = query && isDate(query.to) ? query.to : '';
  let mode = qFrom && qTo ? 'range' : rangeFirst ? 'range' : 'one';
  const pages = []; // {kind, file, name, url?, size}
  view.innerHTML = `<form class="card form rec-form" novalidate>
    <div class="rec-top"><a class="code big" href="#/item/${encodeURIComponent(it.item_id)}">${esc(it.code)}</a>${statusDot(it.status)}</div>
    <p class="item-name">${esc(it.name_vi || '')}${it.name_zh ? `<br><span class="zh muted">${esc(it.name_zh)}</span>` : ''}</p>
    <p class="muted small">${bi('item.period')}: <strong>${bi('period.' + type)}</strong>${s.count ? ' · ' + bi('rec.last_short', { D: esc(fmtDate(s.last_date)) }) : ''}${s.counted ? '' : ' · ' + bi('rec.reason_short.' + s.reason)}</p>
    ${type === 'EVENT' ? dateInput('event_date', 'rec.event_date', t, { required: true })
      : `<fieldset class="rec-period"><legend>${bi('rec.period')} <span class="req">*</span></legend>
        <div class="chips" role="group"><button type="button" class="chip" data-mode="one">${bi(type === 'DAY' ? 'rec.mode_day' : 'rec.mode_one')}</button><button type="button" class="chip" data-mode="range">${bi('rec.mode_range')}</button></div>
        <div class="rec-one">${type === 'DAY' ? dateInput('day', 'rec.date', want || t)
          : `<div class="fld" data-field="period"><label for="f-period">${bi('rec.period')}</label><select class="inp sel" id="f-period">${periods.map((p, i) => {
            const c = s.cells[s.cells.length - 1 - i];
            return `<option value="${esc(p.key)}"${p.key === sugKey ? ' selected' : ''}>${esc(p.key)} (${esc(fmtDate(p.from))}–${esc(fmtDate(p.to))}) · ${esc(biText('cell.' + (c ? c.st : 'NA')))}</option>`;
          }).join('')}</select><div class="ferr"></div></div>`}</div>
        <div class="rec-range">${dateInput('from', 'rec.from', qFrom || sr.from)}${dateInput('to', 'rec.to', qTo || sr.to)}<div class="hint">${bi('rec.range_hint')}</div></div>
        <p class="rec-cover small" aria-live="polite"></p><div class="ferr"></div></fieldset>`}
    <fieldset class="rec-files" data-field="pages"><legend>${bi('rec.pages')} <span class="req">*</span></legend>
      <div class="row"><label class="btn primary file">${ICON.camera}<span>${bi('rec.take_photo')}</span><input type="file" id="rf-cam" accept="image/*" capture="environment" hidden></label>
        <label class="btn file">${ICON.upload}<span>${bi('rec.pick_files')}</span><input type="file" id="rf-pick" accept="${esc(KIND_ACCEPT.RECORD)}" multiple hidden></label></div>
      <ol class="rec-pages"></ol><div class="hint">${bi('rec.pages_hint')}</div><div class="ferr" role="alert"></div></fieldset>
    <div class="fld" data-field="note"><label for="f-note">${bi('rec.note')}</label><textarea class="inp" id="f-note" rows="2" maxlength="500"></textarea><div class="ferr"></div></div>
    <p class="form-err err"></p>
    <div class="row"><a class="btn" href="#/item/${encodeURIComponent(it.item_id)}">${bi('btn.cancel')}</a><button type="submit" class="btn primary" id="rf-save">${ICON.check}<span>${bi('rec.save')}</span></button></div>
    <p class="muted small">${bi(navigator.onLine && !app.offline ? 'rec.save_note' : 'rec.offline_note')}</p>
  </form>`;
  const form = $('form', view);
  wireForm(form);
  const setMode = (m) => {
    mode = m;
    form.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
    const one = $('.rec-one', form), rg = $('.rec-range', form);
    if (one) one.hidden = m !== 'one';
    if (rg) rg.hidden = m !== 'range';
    cover();
  };
  /** Khoảng [from, to] đang chọn; null khi ngày sai */
  const chosen = () => {
    if (type === 'EVENT') { const d = readField(form, 'event_date'); return d ? { from: d, to: d } : null; }
    if (mode === 'range') { const a = readField(form, 'from'), b = readField(form, 'to'); return a && b ? { from: a, to: b } : null; }
    if (type === 'DAY') { const d = readField(form, 'day'); return d ? { from: d, to: d } : null; }
    const k = $('#f-period', form).value;
    const p = periods.find((x) => x.key === k);
    return p ? { from: p.from, to: p.to } : null;
  };
  const cover = () => {
    const box = $('.rec-cover', form);
    if (!box) return;
    const c = chosen();
    if (!c || c.from > c.to) { box.innerHTML = ''; return; }
    const ps = periodsInRange(type, c.from, c.to, 500);
    const have = ps.filter((p) => s.cells.some((x) => x.key === p.key && (x.st === 'OK' || x.st === 'PEND'))).length;
    box.innerHTML = `${bi('rec.covers_n', { N: ps.length })}: ${esc(ps.slice(0, 4).map((p) => p.key).join(', '))}${ps.length > 4 ? ' … ' + esc(ps[ps.length - 1].key) : ''}${have ? ` · <span class="t-amber-text">${bi('rec.already_n', { N: have })}</span>` : ''}`;
  };
  form.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  form.addEventListener('change', cover);
  form.addEventListener('input', (e) => { if (e.target.matches('input[data-date]')) cover(); });
  if (type !== 'EVENT') setMode(mode);

  /* Ảnh / tệp */
  const drawPages = () => {
    $('.rec-pages', form).innerHTML = pages.map((p, i) => `<li class="rec-page">${p.kind === 'PHOTO' ? `<img src="${p.url}" alt="">` : `<span class="rec-file">${ICON.file}<b>${esc(p.name.split('.').pop().toUpperCase())}</b></span>`}
      <span class="small">${bi('rec.page_n', { N: i + 1 })}<br><span class="muted">${esc(fmtSize(p.size))}</span></span>
      <button type="button" class="icon-btn" data-rm="${i}" aria-label="${esc(biText('btn.delete'))}">${ICON.x}</button></li>`).join('');
    form.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => {
      const [p] = pages.splice(Number(b.dataset.rm), 1);
      if (p && p.url) URL.revokeObjectURL(p.url);
      drawPages();
    }));
    form.querySelectorAll('.rec-page img').forEach((img, i) => img.addEventListener('click', () => {
      const p = pages.filter((x) => x.kind === 'PHOTO')[i];
      if (p) viewImage(new File([p.blob], p.name, { type: 'image/jpeg' }));
    }));
  };
  const addFiles = async (files) => {
    const errBox = $('.rec-files > .ferr', form);
    errBox.textContent = '';
    const save = $('#rf-save', form);
    busy(save, true);
    try {
      let i = 0;
      for (const f of files) {
        i++;
        if (pages.length >= MAX_FILES) { errBox.textContent = biText('rec.too_many'); break; }
        const kind = recordFileKind(f);
        if (kind === 'FILE') {
          const e = checkFile(f, 'FILE');
          if (e) { errBox.textContent = biText(e) + ' — ' + f.name; continue; }
          pages.push({ kind, file: f, blob: f, name: f.name, size: f.size, mime: mimeOf(f) });
        } else if (kind === 'PHOTO') {
          if (files.length > 1) toast(bi('rec.processing', { N: i, T: files.length }), '');
          try {
            const out = await processPhoto(f);
            const name = (f.name || 'anh').replace(/\.[^.]*$/, '') + '.jpg';
            pages.push({ kind, blob: out.main, name, size: out.main.size, mime: 'image/jpeg', url: URL.createObjectURL(out.thumb) });
          } catch (e) { errBox.textContent = biText('rec.photo_failed', { F: f.name || '' }); }
        } else {
          errBox.textContent = biText('file.need_record') + ' — ' + (f.name || '');
        }
      }
    } finally { busy(save, false); }
    drawPages();
  };
  ['#rf-cam', '#rf-pick'].forEach((sel) => $(sel, form).addEventListener('change', async (e) => {
    const fs = [...(e.target.files || [])];
    e.target.value = '';
    if (fs.length) await addFiles(fs);
  }));

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const errs = [];
    const c = chosen();
    if (!c) errs.push({ field: type === 'EVENT' ? 'event_date' : mode === 'range' ? 'from' : type === 'DAY' ? 'day' : 'period', key: 'field.invalid_date' });
    else if (c.from > c.to) errs.push({ field: 'to', key: 'rec.range_invalid' });
    else if (daysBetween(c.from, c.to) >= 400) errs.push({ field: 'to', key: 'rec.range_long' });
    else if (c.from > addDays(t, 31)) errs.push({ field: mode === 'range' ? 'from' : 'day', key: 'rec.date_future' });
    if (!pages.length) errs.push({ field: 'pages', key: 'rec.need_page' });
    if (errs.length) { showErrors(form, errs); return; }
    const save = $('#rf-save', form);
    busy(save, true);
    try {
      const id = uuid();
      const note = $('#f-note', form).value.trim();
      await enqueue('record.submit', { record_id: id, item_id: it.item_id, period_from: c.from, period_to: c.to, record_date: type === 'EVENT' ? c.from : '', pages: pages.length, note },
        { entity_type: 'RECORD', entity_id: id, expected_version: 0 });
      let n = 0;
      for (const p of pages) {
        n++;
        await enqueue('doc.upload', { document_id: uuid(), entity_type: 'RECORD', entity_id: id, kind: p.kind, mime_type: p.mime, file_name: p.name, content_b64: await blobToB64(p.blob), page_no: n },
          { entity_type: 'DOCUMENT', entity_id: '', parent_id: id, expected_version: 0 });
      }
      pages.forEach((p) => { if (p.url) URL.revokeObjectURL(p.url); });
      invalidate();
      invalidateRecordStatus();
      await updateSyncStatus();
      const online = navigator.onLine && !app.offline;
      toast(bi(online ? 'rec.saved_sending' : 'rec.saved_queued'), 'ok');
      navigate('/record/' + encodeURIComponent(id), { replace: true });
      if (online) {
        const r = await syncNow({ quiet: true });
        if (r && r.ok) refreshIfShowing(id);
      }
    } finally { busy(save, false); }
  });
}

function refreshIfShowing(id) {
  if ((location.hash || '').startsWith('#/record/' + encodeURIComponent(id)) && !document.querySelector('.modal')) refresh();
}

/* ====================== Chi tiết hồ sơ (/record/:id) ====================== */

export async function renderRecord(view, ctx) {
  const { shell, params } = ctx;
  let r = await byId('RECORD', params.id);
  const qOps = (await queueItems().catch(() => [])).filter((o) => (o.action === 'record.submit' && o.entity_id === params.id) || o.parent_id === params.id);
  const qSubmit = qOps.find((o) => o.action === 'record.submit');
  if (!r && qSubmit) r = queuedAsRecord(qSubmit);
  const it = r ? await byId('ITEM', r.item_id) : null;
  shell.setScreen({ title: 'rec.title', back: it ? '/item/' + encodeURIComponent(it.item_id) : '/records' });
  if (!r) {
    view.innerHTML = `<div class="card empty-state">${ICON.file}<p class="muted">${bi('rec.not_found')}</p><a class="btn" href="#/records">${bi('nav.records')}</a></div>`;
    return;
  }
  const um = await users();
  const who = (id) => esc(userName(um, id) || '');
  const type = r.period_type || (it ? periodTypeOf(it) : 'EVENT');
  const covered = type === 'EVENT' ? [] : periodsInRange(type, r.period_from, r.period_to, 500);
  const files = r.files_json || [];
  const qUploads = qOps.filter((o) => o.action === 'doc.upload');
  const online = navigator.onLine && !app.offline;
  const canRet = !r.queued && r.status === 'SUBMITTED' && it && canReturnRecord(it);
  const canAdd = !r.queued && r.status !== 'VOID' && it && canRecordFiles(it, r) && files.length + qUploads.length < MAX_FILES;
  view.innerHTML = `<div class="item rec-detail">
    <section class="card item-head">
      <div class="rec-top"><span class="code big">${r.code ? esc(r.code) : bi('rec.no_code')}</span>${recBadge(r)}</div>
      ${it ? `<p class="item-name"><a href="#/item/${encodeURIComponent(it.item_id)}"><span class="code">${esc(it.code)}</span></a> · ${esc(nameText(it))}</p>` : ''}
      ${r.status === 'RETURNED' ? `<p class="banner err small">${bi('rec.returned_by', { U: who(r.returned_by), D: esc(fmtDateTime(r.returned_at)) })}: ${esc(r.return_reason)}</p>` : ''}
      ${r.queued ? `<p class="banner ${r.op_state === 'REJECTED' || r.op_state === 'CONFLICT' ? 'err' : 'warn'} small">${bi(r.op_state === 'REJECTED' || r.op_state === 'CONFLICT' ? 'rec.rejected_note' : 'rec.queued_note')}
        ${(r.errors || []).map((e) => ' ' + esc(e.message_vi || e.code)).join('')} <a href="#/account/drafts">${bi('draft.title')} ›</a></p>` : ''}
    </section>
    <section class="card"><h3>${bi('rec.info')}</h3>
      <div class="kv"><span>${bi(type === 'EVENT' ? 'rec.event_date' : 'rec.period')}</span><strong>${rangeText(r.period_from, r.period_to)}</strong></div>
      ${covered.length ? `<div class="kv"><span>${bi('rec.covers')}</span><strong>${bi('rec.covers_n', { N: covered.length })}: ${esc(covered.slice(0, 6).map((p) => p.key).join(', '))}${covered.length > 6 ? ' …' : ''}</strong></div>` : ''}
      <div class="kv"><span>${bi('rec.submitted')}</span><strong>${who(r.submitted_by)} <span class="muted small">${esc(fmtDateTime(r.submitted_at))}</span></strong></div>
      ${r.note ? `<div class="kv-block"><span class="muted small">${bi('rec.note')}</span><p>${esc(r.note)}</p></div>` : ''}
    </section>
    <section class="card"><h3>${bi('rec.pages')}</h3>
      ${files.length ? `<div class="row doc-row">${files.map((f) => docButton(f.document_id, f.kind, f.file_name, f.size_bytes, f.kind === 'PHOTO' ? '' : '')).join('')}</div>` : ''}
      ${qUploads.length ? `<div class="rec-pages q">${qUploads.map((o) => `<button type="button" class="rec-thumb" data-q="${esc(o.operation_id)}">${/^image\//.test(o.payload.mime_type) ? `<img alt="" data-b64="${esc(o.operation_id)}">` : ICON.file}<span class="small">${bi('rec.page_n', { N: o.payload.page_no || '' })}</span></button>`).join('')}</div>
        <p class="muted small">${bi('rec.files_wait', { N: qUploads.length })}</p>` : ''}
      ${!r.queued && files.length < Number(r.pages || 0) && !qUploads.length ? `<p class="banner warn small">${bi('rec.files_missing', { N: files.length, T: r.pages })}</p>` : ''}
      ${!files.length && !qUploads.length ? `<p class="muted small">${bi('rec.no_files')}</p>` : ''}
      ${canAdd ? `<div class="row"><label class="btn small file">${ICON.camera}<span>${bi('rec.add_files')}</span><input type="file" id="rd-add" accept="${esc(KIND_ACCEPT.RECORD)}" multiple hidden></label></div>` : ''}
    </section>
    <div class="row item-actions">
      ${canRet ? `<button type="button" class="btn danger" id="rd-return" ${online ? '' : 'disabled'}>${ICON.back}<span>${bi('rec.return')}</span></button>` : ''}
      ${it && (r.status === 'RETURNED' || (r.queued && r.op_state === 'REJECTED')) && canSubmitRecord(it) && !recordCheck(it) ? `<a class="btn primary" href="#/record/new?item=${encodeURIComponent(it.item_id)}&from=${encodeURIComponent(r.period_from)}&to=${encodeURIComponent(r.period_to)}">${ICON.upload}<span>${bi('rec.resubmit')}</span></a>` : ''}
      ${it ? `<a class="btn" href="#/item/${encodeURIComponent(it.item_id)}">${ICON.library}<span>${bi('rec.to_item')}</span></a>` : ''}
    </div>
    ${canRet && !online ? `<p class="muted small">${bi('sync.need_network')}</p>` : ''}
    ${canRet ? `<p class="muted small">${bi('rec.return_note')}</p>` : ''}
  </div>`;
  wireDocButtons(view);
  // Ảnh còn trong hàng chờ: xem từ máy
  const byOp = new Map(qUploads.map((o) => [o.operation_id, o]));
  view.querySelectorAll('img[data-b64]').forEach((img) => {
    const o = byOp.get(img.dataset.b64);
    if (o && o.payload.content_b64) img.src = URL.createObjectURL(new Blob([b64ToBytes(o.payload.content_b64)], { type: o.payload.mime_type }));
  });
  view.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
    const o = byOp.get(b.dataset.q);
    if (o && /^image\//.test(o.payload.mime_type)) viewImage(new File([b64ToBytes(o.payload.content_b64)], o.payload.file_name || 'anh.jpg', { type: o.payload.mime_type }));
  }));
  const ret = $('#rd-return', view);
  if (ret) ret.addEventListener('click', async () => {
    const reason = await dialog({
      title: bi('rec.return'),
      body: `<p class="muted small">${bi('rec.return_note')}</p><label class="fld"><span>${bi('field.reason')} <span class="req">*</span></span><textarea class="inp" rows="3" maxlength="500" id="rr-reason"></textarea></label>`,
      actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('rec.return'), kind: 'danger', read: (w) => $('#rr-reason', w).value.trim() }]
    });
    if (reason === null || reason === undefined) return;
    if (!reason) { toast(bi('field.reason_required'), 'err'); return; }
    busy(ret, true);
    const res = await writeWithPin('record.return', { record_id: r.record_id, reason }, { expected_version: r.record_version });
    busy(ret, false);
    if (!res.ok) { writeFail(res); return; }
    await afterCommit();
    invalidateRecordStatus();
    toast(bi('rec.returned_ok'), 'ok');
    if (ctx.isCurrent && !ctx.isCurrent()) return;
    refresh();
  });
  const add = $('#rd-add', view);
  if (add) add.addEventListener('change', async (e) => {
    const fs = [...(e.target.files || [])];
    e.target.value = '';
    if (!fs.length) return;
    const lab = add.closest('label');
    busy(lab, true);
    let n = files.length + qUploads.length;
    let added = 0;
    try {
      for (const f of fs) {
        if (n >= MAX_FILES) { toast(bi('rec.too_many'), 'err'); break; }
        const kind = recordFileKind(f);
        let blob = f, name = f.name, mime = mimeOf(f);
        if (kind === 'PHOTO') {
          try { const out = await processPhoto(f); blob = out.main; name = (f.name || 'anh').replace(/\.[^.]*$/, '') + '.jpg'; mime = 'image/jpeg'; } catch (err) { toast(bi('rec.photo_failed', { F: f.name || '' }), 'err'); continue; }
        } else if (kind === 'FILE') {
          const er = checkFile(f, 'FILE');
          if (er) { toast(bi(er), 'err'); continue; }
        } else { toast(bi('file.need_record'), 'err'); continue; }
        n++;
        await enqueue('doc.upload', { document_id: uuid(), entity_type: 'RECORD', entity_id: r.record_id, kind, mime_type: mime, file_name: name, content_b64: await blobToB64(blob), page_no: n },
          { entity_type: 'DOCUMENT', entity_id: '', parent_id: r.record_id, expected_version: 0 });
        added++;
      }
    } finally { busy(lab, false); }
    if (!added) return;
    await updateSyncStatus();
    toast(bi('rec.added'), 'ok');
    if (navigator.onLine && !app.offline) await syncNow({ quiet: true });
    if (ctx.isCurrent && !ctx.isCurrent()) return;
    refresh();
  });
}

/* ====================== Phần "Hồ sơ" trong chi tiết biểu ====================== */

/** Thẻ hồ sơ 12 kỳ gần nhất + hồ sơ gần đây cho màn chi tiết biểu (item.js) */
export async function itemRecordsCard(it) {
  if (!canSeeRecords() || !(await recordsOn())) return '';
  const s = (await recordStatusMap()).get(it.item_id);
  if (!s) return '';
  const list = (await recordsWithQueued(it.item_id)).slice(0, 8);
  const um = await users();
  const bad = recordCheck(it);
  const can = !bad && canSubmitRecord(it);
  const strip = s.type === 'EVENT'
    ? `<p class="small">${s.count ? bi('rec.event_last', { D: esc(fmtDate(s.last_date)), N: s.count }) : bi('rec.event_none')} · <span class="muted">${bi('rec.event_note')}</span></p>`
    : `<div class="rg-item">${ticksHtml(s.type)}${cellsHtml(s, it.item_id)}</div>${legendHtml()}
       ${s.counted ? `<p class="muted small">${bi('rec.start', { D: esc(fmtDate(s.start)) })} · ${bi('rec.grace', { N: Number((session.settings || {}).record_grace_days ?? 3) })}${s.overdue ? ` · <span class="t-red-text">${bi('rec.overdue_now', { K: esc(s.due_key) })}</span>` : ''}</p>` : ''}`;
  return `<section class="card rec-card-item" id="item-records"><div class="card-head"><h3>${bi('item.records')}</h3>${can ? `<a class="btn small primary" href="#/record/new?item=${encodeURIComponent(it.item_id)}">${ICON.upload}<span>${bi('item.submit_record')}</span></a>` : ''}</div>
    ${strip}${reasonHtml(s)}${bad === 'RECORD_FROM_APP' && s.reason !== 'FROM_APP' ? `<p class="muted small">${bi('rec.no_record.RECORD_FROM_APP')}</p>` : ''}
    ${list.length ? `<p class="lbl">${bi('rec.recent')}</p><ul class="cat-list">${list.map((r) => recordRow(r, it, { um })).join('')}</ul>` : ''}</section>`;
}

/** Gắn hộp thoại ô cho thẻ hồ sơ trong chi tiết biểu */
export async function wireItemRecords(root, it) {
  const s = (await recordStatusMap()).get(it.item_id);
  if (!s) return;
  wireCells(root, new Map([[it.item_id, it]]), new Map([[it.item_id, s]]));
}
