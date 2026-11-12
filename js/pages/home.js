// Trang chủ (cùng khuôn trang chủ M&E, Checksheet): biểu tượng app trên nền nhà máy, ô Chờ bạn xử lý, 4 ô số, lịch tuần, lưới ô module.
// Tổng biểu, % ban hành, điều khoản bắt buộc thiếu biểu tính từ danh mục trên máy (như trang Tổng hợp của file Excel); hồ sơ quá hạn
// = số biểu có kỳ đến hạn xét gần nhất bị Quá hạn. Chờ bạn xử lý: phiên bản (1b), hồ sơ bị trả lại (1c), hồ sơ quá hạn cần nộp,
// tài liệu sắp/quá hạn rà soát, thao tác gửi không được (1d). Lịch tuần (1d): hồ sơ đến hạn trong tuần, ‹ › đổi tuần.
// Ô module của đợt sau mờ "Sắp có · 即将推出".
import { bi, biText, esc, fmtDate, fmtNumber, session, nameText } from '../core.js';
import { brandHtml, ICON } from '../ui.js';
import { isWide } from '../shell.js';
import { items, recs, roleLevel, isSecretary, today, weekday, catalogSummary, canSeeRecords, recordStatusMap, recordsOn, recordWeek } from '../data.js';
import { queueItems } from '../sync.js';
import { pendingFor } from '../pending.js';
import { missingMandatory } from '../coverage.js';
import { isoWeekKey } from '../periods.js';
import { stIcon } from './catalog.js';

/**
 * Ô "Chờ bạn xử lý": phiên bản chờ bạn duyệt, chờ ban hành, bị trả lại, nháp của bạn; hồ sơ bị trả lại; biểu quá hạn hồ sơ bạn nộp
 * được; thao tác gửi không được; biểu ● chưa có tệp (Thư ký ISO); tài liệu sắp/quá hạn rà soát (Thư ký ISO, người phụ trách).
 */
async function pendingHtml() {
  const p = await pendingFor();
  const rows = [
    [p.review.length, 'home.pend_review', '/versions?f=review', 't-red-text'],
    [p.issue.length, 'home.pend_issue', '/versions?f=issue', 't-red-text'],
    [p.returned.length, 'home.pend_returned', '/versions?f=returned', 't-red-text'],
    [p.rec_returned.length, 'home.pend_rec_returned', p.rec_returned.length === 1 ? '/record/' + encodeURIComponent(p.rec_returned[0].record_id) : '/records?f=returned', 't-red-text'],
    [p.rec_late.length, 'home.pend_rec_late', p.rec_late.length === 1 ? '/record/new?item=' + encodeURIComponent(p.rec_late[0].item_id) : '/records?f=late', 't-red-text'],
    [p.send_problems.length, 'home.pend_send_problems', '/account/drafts', 't-red-text'],
    [p.drafts.length, 'home.pend_drafts', '/versions?f=drafts', ''],
    [p.nofile.length, 'home.no_file_n', '/catalog?f=nofile', ''],
    [p.review_due.length, 'home.pend_review_due', '/catalog?f=review', '']
  ].filter((r) => r[0]);
  if (!rows.length) return '';
  return `<section class="card pend-card"><div class="pend-title">${ICON.alert}<strong>${bi('home.pending_me')}</strong></div>
    <div class="pend-rows">${rows.map(([n, key, href, cls]) => `<a class="pend-row" href="#${href}"><span class="${cls}">${bi(key, { N: n })}</span>${ICON.chevron}</a>`).join('')}</div></section>`;
}

/** 4 ô số */
async function statsHtml(list) {
  const s = catalogSummary(list);
  const miss = missingMandatory(list, await recs('CLAUSE'));
  let overdue = 0;
  const recOn = canSeeRecords() && await recordsOn();
  if (recOn) for (const s of (await recordStatusMap(list)).values()) if (s.overdue) overdue++;
  const tile = (val, key, href, cls = '', sub = '') => `<a class="stat${cls ? ' ' + cls : ''}" href="#${href}"><span class="stat-val">${val}</span><span class="stat-label">${bi(key)}</span>${sub ? `<span class="stat-sub">${sub}</span>` : ''}</a>`;
  return `<section class="stats" aria-label="${esc(biText('home.stats'))}">
    ${tile(esc(fmtNumber(s.total)), 'home.stat_total', '/catalog', '', `${stIcon('ISSUED')} ${s.issued} · ${stIcon('DRAFTING')} ${s.drafting} · ${stIcon('NONE')} ${s.none} · ${stIcon('NA')} ${s.na}`)}
    ${tile(esc(String(s.pct).replace('.', ',')) + '%', 'home.stat_pct', '/catalog?f=issued', s.pct >= 80 ? 't-green-text' : '')}
    ${recOn ? tile(esc(String(overdue)), 'home.stat_overdue', '/records?f=late', overdue ? 't-red-text' : '', bi('home.stat_overdue_sub'))
      : tile('—', 'home.stat_overdue', '/records', 'soon', bi('rec.no_access_short'))}
    ${tile(esc(String(miss)), 'home.stat_missing', !canSeeRecords() ? '/catalog' : miss ? '/coverage?f=MISSING' : '/coverage', miss ? 't-red-text' : '', bi('home.stat_missing_sub'))}
  </section>`;
}

/* ---------------- Lịch tuần: hồ sơ đến hạn ---------------- */

const SYM = { OK: '✓', PEND: '✓', LATE: '!', DUE: '–', NA: '' };
let weekOff = 0;
let weekData = null;

/** Nội dung thẻ Lịch tuần (tuần lệch weekOff tuần so với tuần này) */
async function weekBody() {
  const t = today();
  const w = weekData = await recordWeek(weekOff);
  const dd = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  const nav = `<div class="wk-nav"><button type="button" class="icon-btn" data-wk="-1" aria-label="${esc(biText('home.week_prev'))}">${ICON.back}</button>
    <span class="wk-title"><strong>${bi('period.week', { N: isoWeekKey(w.mon).slice(-2) })}</strong> <span class="muted small">${dd(w.mon)} – ${dd(w.sun)}/${w.sun.slice(0, 4)}</span></span>
    <button type="button" class="icon-btn" data-wk="1" aria-label="${esc(biText('home.week_next'))}">${ICON.chevron}</button>
    ${weekOff ? `<button type="button" class="btn tiny" data-wk="0">${bi('home.week')}</button>` : ''}</div>`;
  const daily = w.daily.length ? `<div class="wk-daily"><div class="wk-grid wk-head"><span class="wk-lbl muted small">${bi('period.DAY')}</span>${w.days.map((d) => `<span class="wk-dh${d === t ? ' today' : ''}"><b>${bi('wd.' + weekday(d))}</b><i>${d.slice(8, 10)}</i></span>`).join('')}</div>
    ${w.daily.map((x, i) => `<div class="wk-grid"><a class="wk-lbl code" href="#/item/${encodeURIComponent(x.it.item_id)}" title="${esc(nameText(x.it))}">${esc(x.it.code)}</a>${x.cells.map((c, j) => `<button type="button" class="rg-cell c-${c.st}${c.from === t ? ' today' : ''}" data-wd="${i}:${j}" aria-label="${esc(x.it.code)} ${esc(c.key)}: ${esc(biText('cell.' + c.st))}">${SYM[c.st]}</button>`).join('')}</div>`).join('')}</div>` : '';
  const agenda = w.agenda.length ? `<div class="wk-agenda">${w.agenda.map((d) => `<div class="wk-day${d.date === t ? ' today' : ''}"><div class="wk-day-h">${bi('weekday.' + weekday(d.date))} <span class="muted">${dd(d.date)}</span>${d.date === t ? ` <span class="tag">${bi('home.today')}</span>` : ''}</div>
    ${d.list.map((x, k) => `<button type="button" class="wk-row" data-wa="${esc(d.date)}:${k}"><i class="rg-cell c-${x.cell.st}">${SYM[x.cell.st]}</i>
      <span class="wk-txt"><span><span class="code">${esc(x.it.code)}</span> · ${esc(x.it.name_vi || x.it.name_zh || '')}</span>
      <span class="muted small">${bi('period.' + x.info.type)} · ${esc(x.cell.key)}${x.carry ? ` · <span class="t-red-text">${bi('home.week_deadline', { D: dd(x.deadline) })}</span>` : (x.cell.st === 'DUE' || x.cell.st === 'LATE' ? ` · ${bi('home.week_deadline', { D: dd(x.deadline) })}` : '')}</span></span>${ICON.chevron}</button>`).join('')}</div>`).join('')}</div>` : '';
  const empty = !daily && !agenda ? `<p class="muted small">${bi('home.week_empty')}</p>` : '';
  return `${nav}${daily}${agenda}${empty}<p class="muted small wk-note">${bi('home.week_note', { N: Number((session.settings || {}).record_grace_days ?? 3) })}</p>`;
}

async function weekHtml() {
  if (!canSeeRecords()) return '';
  if (!(await recordsOn())) return `<section class="card home-week"><div class="card-head"><h2>${bi('home.week')}</h2></div><p class="muted small">${bi('rec.server_old')}</p></section>`;
  return `<section class="card home-week" id="home-week"><div class="card-head"><h2>${bi('home.week_title')}</h2><a class="btn tiny" href="#/records">${ICON.file}<span>${bi('nav.records')}</span></a></div><div class="wk-body">${await weekBody()}</div></section>`;
}

/** Bấm trong thẻ Lịch tuần: đổi tuần; bấm ô / dòng → hộp thoại kỳ (hồ sơ của kỳ, Nộp hồ sơ kỳ này) như bảng kỳ */
function wireWeek(view) {
  const card = view.querySelector('#home-week');
  if (!card) return;
  card.addEventListener('click', async (e) => {
    const nb = e.target.closest('[data-wk]');
    if (nb) {
      weekOff = nb.dataset.wk === '0' ? 0 : weekOff + Number(nb.dataset.wk);
      const body = card.querySelector('.wk-body');
      body.innerHTML = await weekBody();
      return;
    }
    const w = weekData;
    if (!w) return;
    let it = null, cell = null, info = null;
    const dc = e.target.closest('[data-wd]');
    const ar = e.target.closest('[data-wa]');
    if (dc) { const [i, j] = dc.dataset.wd.split(':').map(Number); const x = w.daily[i]; if (x) { it = x.it; info = x.info; cell = x.cells[j]; } }
    else if (ar) {
      const [date, k] = ar.dataset.wa.split(':');
      const d = w.agenda.find((a) => a.date === date);
      const x = d && d.list[Number(k)];
      if (x) { it = x.it; info = x.info; cell = x.cell; }
    }
    if (!it || !cell) return;
    const m = await import('./records.js');
    m.openCell(it, { type: info.type, start: info.start, reason: info.reason, counted: info.counted, cells: [cell] }, 0);
  });
}

/** Lưới ô module (3 cột như M&E); ô của đợt sau mờ "Sắp có" */
async function gridHtml(list) {
  const lvl = roleLevel();
  const sec = isSecretary();
  const uid = session.user && session.user.user_id;
  const q = (await queueItems().catch(() => [])).filter((o) => o.user_id === uid && o.dataset_epoch === session.epoch).length;
  const tiles = [
    { key: 'catalog', icon: 'library', href: '/catalog', tail: bi('home.items_n', { N: list.length }) },
    { key: 'records', icon: 'file', href: '/records', lvl: 2, show: canSeeRecords() },
    { key: 'coverage', icon: 'checklist', href: '/coverage', show: canSeeRecords() },
    { key: 'excel', icon: 'excel', href: '/excel', show: lvl >= 3 || sec },
    { key: 'reports', icon: 'reports', href: '/reports' },
    { key: 'capa', icon: 'repairs', href: '/capa', soon: 1, lvl: 2 },
    { key: 'audits', icon: 'inspections', href: '/audits', soon: 1, lvl: 2 },
    { key: 'links', icon: 'link', href: '/links', lvl: 4 },
    { key: 'drafts', icon: 'sync', href: '/account/drafts', tail: q ? bi('sync.queued_count', { N: q }) : bi('home.none_drafts') }
  ].filter((x) => (x.show !== undefined ? x.show : !x.lvl || lvl >= x.lvl));
  return `<section class="grid9" aria-label="${esc(biText('menu.title'))}">${tiles.map((x) => `<a class="tile${x.soon ? ' soon' : ''}" href="#${x.href}">${ICON[x.icon]}<span class="tile-label">${bi('tile.' + x.key)}</span>${x.soon ? `<span class="tile-count tag soon">${bi('soon.tag')}</span>` : (x.tail ? `<span class="tile-count">${x.tail}</span>` : '')}</a>`).join('')}</section>`;
}

/** Biểu theo bộ phận (web): số biểu, ● đã ban hành, % */
async function deptTableHtml(list) {
  const deps = (await recs('DEPT')).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const rows = deps.map((d) => ({ d, s: catalogSummary(list.filter((x) => x.dept_code === d.dept_code)) })).filter((x) => x.s.total);
  if (!rows.length) return '';
  return `<section class="card home-depts"><div class="card-head"><h2>${bi('home.by_dept')}</h2><a class="btn tiny" href="#/catalog">${ICON.library}<span>${bi('nav.catalog')}</span></a></div>
    <div class="table-wrap"><table class="tbl clickable"><thead><tr><th>${bi('cat.dept')}</th><th class="num">${bi('home.stat_total')}</th><th class="num">${stIcon('ISSUED')} ${bi('status.ISSUED')}</th><th class="num">${stIcon('DRAFTING')} ${bi('status.DRAFTING')}</th><th class="num">${stIcon('NONE')} ${bi('status.NONE')}</th><th class="num">${stIcon('NA')} ${bi('status.NA')}</th><th class="num">${bi('home.stat_pct')}</th></tr></thead>
    <tbody>${rows.map(({ d, s }) => `<tr data-href="/catalog?dept=${encodeURIComponent(d.dept_code)}"><td>${esc(d.name_vi)} · ${esc(d.name_zh)}</td><td class="num">${s.total}</td><td class="num">${s.issued}</td><td class="num">${s.drafting}</td><td class="num">${s.none}</td><td class="num">${s.na}</td><td class="num">${String(s.pct).replace('.', ',')}%</td></tr>`).join('')}</tbody></table></div></section>`;
}

export async function renderHome(view, ctx) {
  const { shell } = ctx;
  shell.setScreen({ title: 'nav.home', home: true });
  if (ctx.entered) weekOff = 0;
  const wide = isWide();
  const u = session.user || {};
  const t = today();
  const list = await items();
  const flags = [u.iso_secretary ? bi('role.secretary') : '', u.auditor ? bi('role.auditor') : ''].filter(Boolean).join(' · ');
  view.innerHTML = `<div class="home">
    <div class="home-hero">${brandHtml()}<div class="home-who">${esc(u.display_name || '')} · ${bi('level.' + roleLevel())}${flags ? ' · ' + flags : ''}<br>${bi('weekday.' + weekday(t))} ${esc(fmtDate(t))}</div></div>
    <div class="home-body${wide ? ' wide' : ''}">
      <div class="home-left">${await pendingHtml()}${await statsHtml(list)}${await weekHtml()}</div>
      <div class="home-right">${await gridHtml(list)}</div>
      ${wide ? `<div class="home-bottom">${await deptTableHtml(list)}</div>` : ''}
    </div></div>`;
  view.querySelectorAll('tr[data-href]').forEach((tr) => tr.addEventListener('click', () => import('../router.js').then((r) => r.navigate(tr.dataset.href))));
  wireWeek(view);
}
