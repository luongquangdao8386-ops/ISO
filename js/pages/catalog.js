// Danh mục biểu mẫu & tài liệu: lọc bộ phận, nhóm, loại, nơi làm, tình trạng, ưu tiên; tìm theo mã, tên Việt hoặc Trung.
// iPhone: lọc bằng nút và ô chọn (không bật bàn phím); ô tìm giữ nguyên khi vẽ lại (setViewHtml + wireSearch như M&E);
// danh sách dài dựng từng đợt (listChunk: iPhone 50, web 100).
import { bi, biText, esc, nameText } from '../core.js';
import { ICON, setViewHtml, wireSearch, listChunk, wireMore, freshFilters } from '../ui.js';
import { isWide } from '../shell.js';
import { items, depts, recs, isSecretary, seesAll, myDepts, groupText, itemHay, foldVi, STATUS_SYMBOL, STATUSES, KINDS, WHERES, catalogSummary, reviewSoon, today } from '../data.js';
import { isoMatch, brcMatch } from '../coverage.js';

// iso / brc: lọc theo điều khoản ISO 9001 / chủ đề BRCGS (mở từ màn Phủ điều khoản, đếm như file Excel)
const INIT = { q: '', dept: '', group: '', kind: '', where: '', status: '', prio: '', f: '', iso: '', brc: '', open: false };
const state = { ...INIT };

/** Hình tình trạng ○ ◐ ● ✕ vẽ bằng CSS (chữ ◐ của phông iPhone quá nhỏ); ký hiệu chữ chỉ ở file Excel */
export function stIcon(st) {
  const k = STATUSES.includes(st) ? st : 'NONE';
  return `<i class="st-ico st-${k}" aria-hidden="true"></i>`;
}
/** Chấm tình trạng biểu (có chữ khi di chuột / đọc màn hình) */
export function statusDot(st) {
  const k = STATUSES.includes(st) ? st : 'NONE';
  return `<span class="st-dot st-${k}" role="img" title="${esc(biText('status.' + k))} (${STATUS_SYMBOL[k]})" aria-label="${esc(biText('status.' + k))}">${stIcon(k)}</span>`;
}

function applyQuery(query) {
  if (!query) return;
  ['dept', 'group', 'kind', 'where', 'status', 'prio', 'f', 'iso', 'brc'].forEach((k) => { if (query[k] !== undefined) state[k] = String(query[k]); });
  if (query.f === 'issued') { state.status = 'ISSUED'; state.f = ''; }
}

function filterList(list) {
  const q = foldVi(state.q.trim());
  const words = q.split(/\s+/).filter(Boolean);
  return list.filter((it) => {
    if (state.dept && it.dept_code !== state.dept) return false;
    if (state.group && it.group_key !== state.group) return false;
    if (state.kind && it.kind !== state.kind) return false;
    if (state.where && (it.where || 'MANUAL') !== state.where) return false;
    if (state.status && it.status !== state.status) return false;
    if (state.prio && String(it.priority || '') !== (state.prio === '-' ? '' : state.prio)) return false;
    if (state.f === 'nofile' && !(it.status === 'ISSUED' && it.file_missing)) return false;
    if (state.f === 'review' && !reviewSoon(it, today())) return false;
    if (state.iso && !isoMatch(it, state.iso)) return false;
    if (state.brc && !brcMatch(it, state.brc)) return false;
    if (words.length) { const hay = itemHay(it); if (!words.every((w) => hay.includes(w))) return false; }
    return true;
  });
}

const opt = (v, label, cur) => `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${label}</option>`;

export async function renderCatalog(view, ctx) {
  const { shell, query } = ctx;
  const sec = isSecretary();
  shell.setScreen({
    title: 'nav.catalog',
    actions: sec ? [{ icon: 'plus', label: biText('cat.add'), id: 'cat-add', onClick: () => import('../router.js').then((r) => r.navigate('/item/new')) }] : []
  });
  // Mở từ chỗ khác (trang chủ, menu): bộ lọc về như đầu rồi áp tham số (?dept=, ?f=); quay lại bằng ‹ thì giữ nguyên
  if (ctx.entered) { freshFilters(ctx, state, INIT); applyQuery(query); }
  const all = await items();
  const deps = await depts();
  const groups = await recs('GROUP');
  const depMap = new Map(deps.map((d) => [d.dept_code, d]));
  const grpMap = new Map(groups.map((g) => [g.group_key, g]));
  const draw = () => {
    const list = filterList(all);
    const sig = JSON.stringify({ ...state, open: 0 });
    const { shown, more } = listChunk('catalog', list, sig);
    const counts = {};
    const base = all.filter((x) => (!state.dept || x.dept_code === state.dept) && (!state.iso || isoMatch(x, state.iso)) && (!state.brc || brcMatch(x, state.brc)));
    STATUSES.forEach((s) => { counts[s] = base.filter((x) => x.status === s).length; });
    const deptOpts = deps.filter((d) => all.some((x) => x.dept_code === d.dept_code));
    const grpOpts = groups.filter((g) => (!state.dept || g.dept_code === state.dept) && all.some((x) => x.group_key === g.group_key))
      .sort((a, b) => String(a.group_key).localeCompare(String(b.group_key)));
    const nFilt = ['dept', 'group', 'kind', 'where', 'prio', 'f'].filter((k) => state[k]).length;
    const scopeNote = seesAll() ? '' : `<p class="muted small">${bi('cat.scope_note', { D: myDepts().join(', ') })}</p>`;
    const clauseChip = state.iso || state.brc ? `<div class="chips cov-filter"><button type="button" class="chip on" id="cf-clause">${bi(state.iso ? 'cat.f_iso' : 'cat.f_brc', { K: esc(state.iso || state.brc) })} ${ICON.x}</button></div>` : '';
    const chips = `<div class="chips" role="group" aria-label="${esc(biText('cat.status'))}">
      <button type="button" class="chip${state.status ? '' : ' on'}" data-st="">${bi('cat.all')} <b>${base.length}</b></button>
      ${STATUSES.map((s) => `<button type="button" class="chip${state.status === s ? ' on' : ''}" data-st="${s}">${stIcon(s)} ${bi('status.' + s)} <b>${counts[s]}</b></button>`).join('')}</div>`;
    const filters = `<details class="filters"${state.open || nFilt ? ' open' : ''}><summary>${ICON.search}<span>${bi('cat.filters')}</span>${nFilt ? ` <span class="badge t-navy">${nFilt}</span>` : ''}</summary>
      <div class="form-grid">
        <label class="fld"><span>${bi('cat.dept')}</span><select class="inp sel" id="cf-dept">${opt('', biText('cat.all'), state.dept)}${deptOpts.map((d) => opt(d.dept_code, esc(nameText(d)), state.dept)).join('')}</select></label>
        <label class="fld"><span>${bi('cat.group')}</span><select class="inp sel" id="cf-group">${opt('', biText('cat.all'), state.group)}${grpOpts.map((g) => opt(g.group_key, esc(groupText(g)), state.group)).join('')}</select></label>
        <label class="fld"><span>${bi('cat.kind')}</span><select class="inp sel" id="cf-kind">${opt('', biText('cat.all'), state.kind)}${KINDS.map((k) => opt(k, esc(biText('kind.' + k)), state.kind)).join('')}</select></label>
        <label class="fld"><span>${bi('cat.where')}</span><select class="inp sel" id="cf-where">${opt('', biText('cat.all'), state.where)}${WHERES.map((k) => opt(k, esc(biText('where.' + k)), state.where)).join('')}</select></label>
        <label class="fld"><span>${bi('cat.priority')}</span><select class="inp sel" id="cf-prio">${opt('', biText('cat.all'), state.prio)}${['1', '2', '3'].map((k) => opt(k, esc(biText('cat.prio_n', { N: k })), state.prio)).join('')}${opt('-', esc(biText('cat.prio_none')), state.prio)}</select></label>
        ${sec ? `<label class="fld"><span>${bi('cat.special')}</span><select class="inp sel" id="cf-f">${opt('', biText('cat.all'), state.f)}${opt('nofile', esc(biText('cat.no_file')), state.f)}${opt('review', esc(biText('cat.review_soon')), state.f)}</select></label>` : ''}
      </div>
      ${nFilt ? `<button type="button" class="btn small" id="cf-clear">${ICON.x}<span>${bi('cat.clear')}</span></button>` : ''}</details>`;
    const s = catalogSummary(list);
    const head = `<div class="cat-sum muted small">${bi('cat.count', { N: list.length })} · ${stIcon('ISSUED')} ${s.issued} · ${stIcon('DRAFTING')} ${s.drafting} · ${stIcon('NONE')} ${s.none} · ${stIcon('NA')} ${s.na}</div>`;
    const body = !list.length ? `<div class="card empty-state">${ICON.library}<p class="muted">${all.length ? bi('cat.none_filter') : bi(sec ? 'cat.empty_sec' : 'cat.empty')}</p>${!all.length && sec ? `<a class="btn primary" href="#/excel">${ICON.excel}<span>${bi('nav.excel')}</span></a>` : ''}</div>`
      : isWide()
        ? `<div class="table-wrap"><table class="tbl clickable cat-tbl"><thead><tr><th>${bi('cat.code')}</th><th>${bi('cat.name')}</th><th>${bi('cat.dept')}</th><th>${bi('cat.group')}</th><th>${bi('cat.where')}</th><th class="num">${bi('cat.priority_short')}</th><th>${bi('cat.rev')}</th><th>${bi('cat.status')}</th></tr></thead>
          <tbody>${shown.map((it) => `<tr data-href="/item/${encodeURIComponent(it.item_id)}"><td class="code">${esc(it.code)}</td><td><div>${esc(it.name_vi || '')}</div><div class="muted small zh">${esc(it.name_zh || '')}</div></td>
            <td class="small">${esc(depMap.get(it.dept_code) ? depMap.get(it.dept_code).name_vi : it.dept_code)}</td><td class="small">${esc(groupText(grpMap.get(it.group_key), it.group_key))}</td>
            <td class="small">${it.where ? bi('where.' + it.where) : ''}</td><td class="num">${it.priority || ''}</td><td>${it.current_rev ? esc(it.current_rev) : ''}</td><td>${statusDot(it.status)}${it.status === 'ISSUED' && it.file_missing ? ` <span class="tag warn">${bi('cat.no_file_short')}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>${more}`
        : `<ul class="cat-list">${shown.map((it) => `<li><a class="cat-row" href="#/item/${encodeURIComponent(it.item_id)}">
            <span class="cat-top"><span class="code">${esc(it.code)}</span>${statusDot(it.status)}</span>
            <span class="cat-name">${esc(it.name_vi || it.name_zh || '')}</span>${it.name_vi && it.name_zh ? `<span class="cat-zh">${esc(it.name_zh)}</span>` : ''}
            <span class="cat-meta">${esc(depMap.get(it.dept_code) ? depMap.get(it.dept_code).name_vi : it.dept_code)}${it.current_rev ? ` · ${bi('cat.rev_n', { N: esc(it.current_rev) })}` : ''}${it.priority ? ` · ${bi('cat.prio_n', { N: it.priority })}` : ''}${it.status === 'ISSUED' && it.file_missing ? ` · <span class="t-amber-text">${bi('cat.no_file_short')}</span>` : ''}</span>
            ${ICON.chevron}</a></li>`).join('')}</ul>${more}`;
    setViewHtml(view, `<div class="cat">
      <div class="search-row"><div class="field search">${ICON.search}<input id="cat-q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="${esc(biText('cat.search_ph'))}" value="${esc(state.q)}"></div></div>
      ${chips}${clauseChip}${filters}${scopeNote}${head}${body}</div>`);
    wire();
  };
  const wire = () => {
    wireSearch(view, '#cat-q', (v) => { state.q = v; }, draw);
    view.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => { state.status = b.dataset.st; draw(); }));
    const sel = (id, k) => { const el = view.querySelector('#' + id); if (el) el.addEventListener('change', () => { state[k] = el.value; if (k === 'dept') state.group = ''; state.open = true; draw(); }); };
    sel('cf-dept', 'dept'); sel('cf-group', 'group'); sel('cf-kind', 'kind'); sel('cf-where', 'where'); sel('cf-prio', 'prio'); sel('cf-f', 'f');
    const cc = view.querySelector('#cf-clause');
    if (cc) cc.addEventListener('click', () => { state.iso = ''; state.brc = ''; draw(); });
    const clr = view.querySelector('#cf-clear');
    if (clr) clr.addEventListener('click', () => { Object.assign(state, { dept: '', group: '', kind: '', where: '', prio: '', f: '', iso: '', brc: '', open: true }); draw(); });
    const det = view.querySelector('details.filters');
    if (det) det.addEventListener('toggle', () => { state.open = det.open; });
    view.querySelectorAll('tr[data-href]').forEach((tr) => tr.addEventListener('click', () => import('../router.js').then((r) => r.navigate(tr.dataset.href))));
    wireMore(view, draw);
  };
  draw();
}
