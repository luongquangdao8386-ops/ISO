// Trang chủ (cùng khuôn trang chủ M&E, Checksheet): biểu tượng app trên nền nhà máy, ô Chờ bạn xử lý, 4 ô số, lưới ô module.
// Tổng biểu, % ban hành, điều khoản bắt buộc thiếu biểu tính từ danh mục trên máy; Chờ bạn xử lý phần phiên bản (1b); hồ sơ quá hạn
// = số biểu có kỳ đến hạn xét gần nhất bị Quá hạn, hồ sơ bị trả lại (1c); lịch tuần (phiên 1d) hiện "Sắp có".
// Ô module của phiên/đợt sau mờ "Sắp có · 即将推出".
import { bi, biText, esc, fmtDate, fmtNumber, session } from '../core.js';
import { brandHtml, ICON } from '../ui.js';
import { isWide } from '../shell.js';
import { items, recs, roleLevel, isSecretary, today, weekday, catalogSummary, canSeeRecords, recordStatusMap, recordsOn } from '../data.js';
import { queueItems } from '../sync.js';
import { pendingFor } from '../pending.js';
import { stIcon } from './catalog.js';

/** Điều khoản ISO 9001 bắt buộc lưu hồ sơ mà chưa có biểu (cách đếm như file Excel: mã ở cột G bắt đầu bằng điều khoản) */
export function missingMandatory(list, clauses) {
  const keys = list.map((it) => ';' + String(it.iso9001 || '').replace(/ /g, '') + ';');
  return clauses.filter((c) => c.std === 'ISO9001' && c.active !== false && c.mandatory_record)
    .filter((c) => !keys.some((k) => k.includes(';' + c.key))).length;
}

/**
 * Ô "Chờ bạn xử lý" (phiên 1b): phiên bản chờ bạn duyệt, chờ ban hành, bị trả lại, nháp của bạn; biểu ● chưa có tệp và tài liệu
 * sắp/quá hạn rà soát (Thư ký ISO). Hồ sơ bị trả lại ở phiên 1c.
 */
async function pendingHtml() {
  const p = await pendingFor();
  const rows = [
    [p.review.length, 'home.pend_review', '/versions?f=review', 't-red-text'],
    [p.issue.length, 'home.pend_issue', '/versions?f=issue', 't-red-text'],
    [p.returned.length, 'home.pend_returned', '/versions?f=returned', 't-red-text'],
    [p.rec_returned.length, 'home.pend_rec_returned', p.rec_returned.length === 1 ? '/record/' + encodeURIComponent(p.rec_returned[0].record_id) : '/records?f=returned', 't-red-text'],
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
    ${tile(esc(String(miss)), 'home.stat_missing', '/coverage', miss ? 't-red-text' : '', bi('home.stat_missing_sub'))}
  </section>`;
}

/** Lưới ô module (3 cột như M&E); ô của phiên/đợt sau mờ "Sắp có" */
async function gridHtml(list) {
  const lvl = roleLevel();
  const sec = isSecretary();
  const uid = session.user && session.user.user_id;
  const q = (await queueItems().catch(() => [])).filter((o) => o.user_id === uid && o.dataset_epoch === session.epoch).length;
  const tiles = [
    { key: 'catalog', icon: 'library', href: '/catalog', tail: bi('home.items_n', { N: list.length }) },
    { key: 'records', icon: 'file', href: '/records', lvl: 2, show: canSeeRecords() },
    { key: 'coverage', icon: 'checklist', href: '/coverage', soon: 1, lvl: 2 },
    { key: 'excel', icon: 'excel', href: '/excel', show: lvl >= 3 || sec },
    { key: 'reports', icon: 'reports', href: '/reports', soon: 1 },
    { key: 'capa', icon: 'repairs', href: '/capa', soon: 1, lvl: 2 },
    { key: 'audits', icon: 'inspections', href: '/audits', soon: 1, lvl: 2 },
    { key: 'links', icon: 'link', href: '/links', soon: 1, lvl: 4 },
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

export async function renderHome(view, { shell }) {
  shell.setScreen({ title: 'nav.home', home: true });
  const wide = isWide();
  const u = session.user || {};
  const t = today();
  const list = await items();
  const flags = [u.iso_secretary ? bi('role.secretary') : '', u.auditor ? bi('role.auditor') : ''].filter(Boolean).join(' · ');
  view.innerHTML = `<div class="home">
    <div class="home-hero">${brandHtml()}<div class="home-who">${esc(u.display_name || '')} · ${bi('level.' + roleLevel())}${flags ? ' · ' + flags : ''}<br>${bi('weekday.' + weekday(t))} ${esc(fmtDate(t))}</div></div>
    <div class="home-body${wide ? ' wide' : ''}">
      <div class="home-left">${await pendingHtml()}${await statsHtml(list)}
        <section class="card home-week soon-card"><div class="card-head"><h2>${bi('home.week')}</h2><span class="tag soon">${bi('soon.tag')}</span></div><p class="muted small">${bi('home.week_soon')}</p></section></div>
      <div class="home-right">${await gridHtml(list)}</div>
      ${wide ? `<div class="home-bottom">${await deptTableHtml(list)}</div>` : ''}
    </div></div>`;
  view.querySelectorAll('tr[data-href]').forEach((tr) => tr.addEventListener('click', () => import('../router.js').then((r) => r.navigate(tr.dataset.href))));
}
