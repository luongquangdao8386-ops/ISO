// Phủ điều khoản (phiên 1d, mục 5 đặc tả "Phủ điều khoản", nghiệm thu Đợt 1 mục 7): thẻ ISO 9001, ISO 14001, ISO 45001, ISO 50001
// (ba chuẩn sau thêm 14/11/2026) và BRCGS —
// điều khoản → số biểu, đã ban hành, in từ app, trạng thái; bấm một dòng xem danh sách biểu (mở chi tiết biểu hoặc Danh mục đã lọc).
// Đếm như hai trang Phủ của file Excel tổng (js/coverage.js). Tính trên máy từ dữ liệu đã đồng bộ, dùng được khi mất mạng.
// Quyền: cấp 2+ (bộ phận mình + tài liệu chung), Thư ký ISO / cấp 4 toàn công ty; cấp 1 Tra cứu không xem tổng hợp.
// iPhone: lọc bằng nút và ô chọn, không có ô gõ (không bật bàn phím).
import { bi, biText, esc, nameText, badge } from '../core.js';
import { ICON, dialog, setViewHtml, freshFilters } from '../ui.js';
import { isWide } from '../shell.js';
import { items, recs, depts, isSecretary, seesAll, myDepts, canSeeRecords } from '../data.js';
import { coverageRows, coverageSummary, COV_STATES, STDS, STD_SHORT, STD_COL, isIsoStd, unmatchedCodes } from '../coverage.js';
import { statusDot } from './catalog.js';

const INIT = { std: 'ISO9001', f: '', dept: '' };
const state = { ...INIT };

function applyQuery(q) {
  if (!q) return;
  if (STDS.includes(q.std)) state.std = q.std;
  if (q.f !== undefined) state.f = String(q.f);
  if (q.dept !== undefined) state.dept = String(q.dept);
  if (state.f && !COV_STATES[state.std].includes(state.f)) state.f = '';
}

/** Lọc Danh mục theo điều khoản: ?iso=7.5 (ISO 9001, như trước), ?brc=…, chuẩn khác ?std=ISO14001&cl=6.1.2 */
export function catalogQuery(std, key) {
  const k = encodeURIComponent(key);
  if (std === 'BRC') return `brc=${k}`;
  if (std === 'ISO9001') return `iso=${k}`;
  return `std=${encodeURIComponent(std)}&cl=${k}`;
}

/** Nhóm điều khoản (dòng tiêu đề nhóm) */
const groupOf = (c) => nameText(c, 'group');

function metaHtml(r) {
  return `${bi('home.items_n', { N: r.n })} · ${bi('cov.issued_n', { N: r.issued })} · ${bi('cov.app_n', { N: r.app })}${r.mandatory ? ` · <span class="t-red-text">${bi('cov.mandatory')}</span>` : ''}`;
}

/** Hộp thoại một điều khoản: danh sách biểu (bấm mở chi tiết), nút Mở trong Danh mục */
async function openClause(r, std, deptMap) {
  const c = r.clause;
  const list = r.items.slice().sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.code).localeCompare(String(b.code)));
  const go = await dialog({
    title: `${esc(c.key)}${c.name_vi || c.name_zh ? ' · ' + esc(nameText(c)) : ''}`,
    body: `<p>${badge('cov.st.' + r.state)} <span class="muted small">${metaHtml(r)}</span></p>
      ${list.length ? `<ul class="cat-list cov-items">${list.map((it) => `<li><a class="cat-row" href="#/item/${encodeURIComponent(it.item_id)}">
        <span class="cat-top"><span class="code">${esc(it.code)}</span>${statusDot(it.status)}</span>
        <span class="cat-name">${esc(it.name_vi || it.name_zh || '')}</span>
        <span class="cat-meta">${esc(deptMap.get(it.dept_code) ? deptMap.get(it.dept_code).name_vi : it.dept_code)}${it.where ? ' · ' + bi('where.' + it.where) : ''}</span>${ICON.chevron}</a></li>`).join('')}</ul>`
        : `<p class="muted">${bi(r.mandatory ? 'cov.none_mandatory' : 'cov.none_items')}</p>`}`,
    actions: [{ label: bi('btn.close'), value: false }].concat(list.length ? [{ label: bi('cov.open_catalog'), kind: 'primary', value: true }] : []),
    onOpen: (wrap) => wrap.querySelectorAll('a[href^="#/item/"]').forEach((a) => a.addEventListener('click', () => wrap.remove()))
  });
  if (go) import('../router.js').then((m) => m.navigate(`/catalog?${catalogQuery(std, c.key)}${state.dept ? '&dept=' + encodeURIComponent(state.dept) : ''}`));
}

export async function renderCoverage(view, ctx) {
  const { shell, query } = ctx;
  shell.setScreen({ title: 'nav.coverage' });
  if (!canSeeRecords()) {
    view.innerHTML = `<div class="card empty-state">${ICON.checklist}<p class="muted">${bi('cov.no_access')}</p><a class="btn" href="#/catalog">${ICON.library}<span>${bi('nav.catalog')}</span></a></div>`;
    return;
  }
  if (ctx.entered) { freshFilters(ctx, state, INIT); applyQuery(query); }
  const all = await items();
  const clauses = await recs('CLAUSE');
  const deps = await depts();
  const deptMap = new Map(deps.map((d) => [d.dept_code, d]));
  const deptOpts = deps.filter((d) => all.some((x) => x.dept_code === d.dept_code));
  const sec = isSecretary();
  let rows = [];
  const draw = () => {
    const scope = state.dept ? all.filter((x) => x.dept_code === state.dept) : all;
    // ISO 9001, BRCGS luôn có thẻ; ISO 14001 / 45001 / 50001 khi máy chủ đã nạp điều khoản
    const stdList = STDS.filter((s) => s === 'ISO9001' || s === 'BRC' || clauses.some((c) => c.std === s && c.active !== false));
    if (!stdList.includes(state.std)) state.std = 'ISO9001';
    const byStd = Object.fromEntries(stdList.map((s) => [s, coverageRows(scope, clauses, s)]));
    rows = byStd[state.std];
    const sum = coverageSummary(rows);
    const shownRows = rows.filter((r) => !state.f || r.state === state.f);
    // iPhone: 5 thẻ trên một hàng — chỉ số hiệu chuẩn (9001, 14001…) và số điều khoản; máy tính: đủ "ISO 14001" + "26 điều khoản"
    const tabs = `<div class="tabs-bar cov-tabs" role="tablist">${stdList.map((s) => `<button type="button" class="tab${state.std === s ? ' on' : ''}" role="tab" aria-selected="${state.std === s}" data-std="${s}" title="${esc(STD_SHORT[s])}">
      <strong class="cov-tab-n">${s === 'BRC' ? 'BRCGS' : `<span class="cov-tab-iso">ISO </span>${STD_SHORT[s].slice(4)}`}</strong><span class="small cov-tab-c">${bi(s === 'BRC' ? 'cov.topics_n' : 'cov.clauses_n', { N: byStd[s].length })}</span><span class="small cov-tab-cn">${byStd[s].length}</span></button>`).join('')}</div>`;
    const chips = `<div class="chips" role="group" aria-label="${esc(biText('cov.state'))}">
      <button type="button" class="chip${state.f ? '' : ' on'}" data-f="">${bi('cat.all')} <b>${sum.total}</b></button>
      ${COV_STATES[state.std].map((k) => `<button type="button" class="chip cov-chip s-${k}${state.f === k ? ' on' : ''}" data-f="${k}">${bi('cov.st.' + k)} <b>${sum[k]}</b></button>`).join('')}</div>`;
    const deptSel = deptOpts.length > 1 || state.dept ? `<label class="fld rg-dept"><span>${bi('cat.dept')}</span><select class="inp sel" id="cov-dept">
      <option value="">${esc(biText(seesAll() ? 'cov.all_company' : 'cat.all'))}</option>${deptOpts.map((d) => `<option value="${esc(d.dept_code)}"${state.dept === d.dept_code ? ' selected' : ''}>${esc(nameText(d))}</option>`).join('')}</select></label>` : '';
    const scopeNote = seesAll() ? '' : `<p class="muted small">${bi('cov.scope_note', { D: esc(myDepts().join(', ')) })}</p>`;
    const iso = isIsoStd(state.std);
    const head = `<h2 class="cov-std-h">${bi('std.name.' + state.std)}</h2>` + (iso
      ? `<p class="muted small">${bi('cov.iso_sum', { N: sum.total, M: sum.mandatory, X: sum.MISSING })}</p>`
      : `<p class="muted small">${bi('cov.brc_sum', { N: sum.total, X: sum.NONE })}</p>`);
    // Mã ghi ở cột của chuẩn mà không khớp điều khoản nào (ghi sai mã, hoặc danh sách điều khoản thiếu)
    const odd = iso && rows.length ? unmatchedCodes(scope, clauses, state.std) : [];
    const oddHtml = odd.length ? `<details class="cov-odd"><summary>${bi('cov.odd', { N: odd.length, C: STD_COL[state.std], S: STD_SHORT[state.std] })}</summary>
      <ul>${odd.map((o) => `<li><b class="code">${esc(o.code)}</b> — ${esc(o.items.join(', '))}</li>`).join('')}</ul><p class="muted small">${bi('cov.odd_how')}</p></details>` : '';
    let body;
    if (!rows.length) {
      body = `<div class="card empty-state">${ICON.checklist}<p class="muted">${bi(clauses.some((c) => c.std === state.std) ? 'cov.none_filter' : 'cov.empty')}</p>${sec && !clauses.some((c) => c.std === state.std) ? `<a class="btn primary" href="#/excel">${ICON.excel}<span>${bi('nav.excel')}</span></a>` : ''}</div>`;
    } else if (!shownRows.length) {
      body = `<div class="card empty-state"><p class="muted">${bi('cat.none_filter')}</p></div>`;
    } else {
      let last = null;
      const idx = (r) => rows.indexOf(r);
      if (isWide()) {
        const cols = 7;
        body = `<div class="table-wrap"><table class="tbl clickable cov-tbl"><thead><tr><th>${bi(state.std === 'BRC' ? 'cov.topic' : 'cov.clause')}</th><th>${bi('cov.content')}</th>
          ${iso ? `<th>${bi('cov.mandatory_short')}</th>` : ''}<th class="num">${bi('cov.items')}</th><th class="num">${bi('cov.issued')}</th><th class="num">${bi('cov.app')}</th><th>${bi('cov.state')}</th></tr></thead><tbody>
          ${shownRows.map((r) => {
            const g = groupOf(r.clause);
            const gh = g && g !== last ? `<tr class="cov-group"><td colspan="${iso ? cols : cols - 1}">${esc(g)}</td></tr>` : '';
            last = g || last;
            return `${gh}<tr data-k="${idx(r)}" class="cov-tr s-${r.state}"><td class="code">${esc(r.key)}</td><td><div>${esc(r.clause.name_vi || '')}</div>${r.clause.name_zh ? `<div class="muted small zh">${esc(r.clause.name_zh)}</div>` : ''}</td>
              ${iso ? `<td>${r.mandatory ? bi('cov.yes') : '–'}</td>` : ''}<td class="num">${r.n}</td><td class="num">${r.issued}</td><td class="num">${r.app}</td><td>${badge('cov.st.' + r.state)}</td></tr>`;
          }).join('')}</tbody></table></div>`;
      } else {
        body = `<div class="cov-list">${shownRows.map((r) => {
          const g = groupOf(r.clause);
          const gh = g && g !== last ? `<h3 class="cov-group-h">${esc(g)}</h3>` : '';
          last = g || last;
          return `${gh}<button type="button" class="cat-row cov-row s-${r.state}" data-k="${idx(r)}">
            <span class="cat-top"><span class="code">${esc(r.key)}</span>${badge('cov.st.' + r.state)}</span>
            ${r.clause.name_vi ? `<span class="cat-name">${esc(r.clause.name_vi)}</span>` : ''}${r.clause.name_zh ? `<span class="cat-zh">${esc(r.clause.name_zh)}</span>` : ''}
            <span class="cat-meta">${metaHtml(r)}</span>${ICON.chevron}</button>`;
        }).join('')}</div>`;
      }
    }
    setViewHtml(view, `<div class="cov">${tabs}${chips}${deptSel}${scopeNote}${head}${body}${oddHtml}
      <p class="muted small cov-how">${bi(iso ? 'cov.how_iso' : 'cov.how_brc', { S: STD_SHORT[state.std], C: STD_COL[state.std] })}</p></div>`);
    wire();
  };
  const wire = () => {
    view.querySelectorAll('[data-std]').forEach((b) => b.addEventListener('click', () => { state.std = b.dataset.std; if (state.f && !COV_STATES[state.std].includes(state.f)) state.f = ''; draw(); }));
    view.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { state.f = b.dataset.f; draw(); }));
    const sel = view.querySelector('#cov-dept');
    if (sel) sel.addEventListener('change', () => { state.dept = sel.value; draw(); });
    view.querySelectorAll('[data-k]').forEach((el) => el.addEventListener('click', () => { const r = rows[Number(el.dataset.k)]; if (r) openClause(r, state.std, deptMap); }));
  };
  draw();
}
