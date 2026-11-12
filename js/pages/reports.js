// Báo cáo (Đợt 2, phiên 2c): 4 báo cáo do máy chủ tính (27_reports.js) — Danh mục tài liệu hiện hành (thay BM-ISO-02-01), Tình trạng
// hồ sơ theo bộ phận và kỳ (tháng / quý), Phủ điều khoản ISO 9001 và BRCGS, Lịch sử phiên bản của một tài liệu.
// Chọn báo cáo + bộ lọc → Xem báo cáo (bản xem trước như trang in, chưa có số) → Tải PDF (máy chủ dựng bằng Google Docs, A4 ngang,
// logo công ty) / Tải Excel (dựng trên máy, js/report-xlsx.js): lần tải đầu lưu báo cáo và cấp số BC-yymm-001; tải tiếp (PDF rồi
// Excel) cùng bộ lọc → cùng số, cùng số liệu. Báo cáo đã lưu: tải lại PDF / Excel đúng như lúc lập.
// Cần mạng. Bộ lọc là nút chọn, không có ô gõ (iPhone không bật bàn phím).
import { api, bi, biText, esc, nameText, resMsg, uuid, b64ToBytes, fmtDateTime, session } from '../core.js';
import { $, ICON, toast, dialog, freshFilters } from '../ui.js';
import { isWide } from '../shell.js';
import { items, depts, can, seesAll, canSeeRecords, isSecretary, today } from '../data.js';
import { busy } from '../form.js';
import { openFile } from '../files.js';
import { reportLogo } from '../report-logo.js';
import { reportExcelFile } from '../report-xlsx.js';

const KINDS = ['CATALOG', 'RECORDS', 'COVERAGE', 'VERSIONS'];
const KIND_ICON = { CATALOG: 'library', RECORDS: 'file', COVERAGE: 'checklist', VERSIONS: 'archive' };
const N_OPTS = { MONTH: [3, 6, 12], QUARTER: [2, 4, 8] };
const N_DEF = { MONTH: 6, QUARTER: 4 };
const LONG = 180000; // máy chủ dựng PDF bằng Google Docs: tới cả phút với danh mục lớn

const INIT = { kind: 'CATALOG', dept: '', scope: 'ISSUED', grain: 'MONTH', end: '', n: 6, std: 'BOTH', codes: true, item: '' };
const state = { ...INIT };
/** Bản xem trước / báo cáo đang làm: {sig, runId, code, layout, logo} — đổi bộ lọc thì bỏ */
let cur = null;

/** Loại báo cáo người dùng xem được (như reportKindAllowed_ của máy chủ) */
export function kindAllowed(kind) {
  return kind === 'RECORDS' || kind === 'COVERAGE' ? canSeeRecords() : KINDS.includes(kind);
}

const pad2 = (n) => (n < 10 ? '0' : '') + n;
/** Mã kỳ tháng/quý chứa ngày iso */
function periodKey(grain, iso) {
  const y = iso.slice(0, 4), m = Number(iso.slice(5, 7));
  return grain === 'MONTH' ? iso.slice(0, 7) : `${y}-Q${Math.ceil(m / 3)}`;
}
/** n kỳ gần nhất (mới → cũ) để chọn "Đến kỳ" */
function lastKeys(grain, n) {
  const out = [];
  let y = Number(today().slice(0, 4)), m = Number(today().slice(5, 7));
  if (grain === 'QUARTER') m = Math.ceil(m / 3) * 3;
  for (let i = 0; i < n; i++) {
    out.push(grain === 'MONTH' ? `${y}-${pad2(m)}` : `${y}-Q${m / 3}`);
    m -= grain === 'MONTH' ? 1 : 3;
    if (m <= 0) { m += 12; y--; }
  }
  return out;
}
const keyLabel = (grain, k) => (grain === 'MONTH' ? `${k.slice(5, 7)}/${k.slice(0, 4)}` : `${k.slice(5)}/${k.slice(0, 4)}`);

/** Bộ lọc gửi máy chủ theo loại báo cáo */
function filtersOf(s) {
  if (s.kind === 'CATALOG') return { dept: s.dept, scope: s.scope };
  if (s.kind === 'RECORDS') return { dept: s.dept, grain: s.grain, end: s.end || periodKey(s.grain, today()), n: Number(s.n) || N_DEF[s.grain] };
  if (s.kind === 'COVERAGE') return { dept: s.dept, std: s.std, codes: !!s.codes };
  return { item_id: s.item };
}
const sigOf = (s) => JSON.stringify([s.kind, filtersOf(s)]);

function applyQuery(q) {
  if (!q) return;
  if (KINDS.includes(q.kind)) state.kind = q.kind;
  if (q.item) state.item = String(q.item);
  if (q.dept !== undefined) state.dept = String(q.dept);
  if (q.std && ['BOTH', 'ISO9001', 'BRC'].includes(q.std)) state.std = q.std;
}

/* ---------------- Bản xem trước (cùng bố cục với PDF, Excel) ---------------- */

const nl = (s) => esc(s === null || s === undefined ? '' : s).replace(/\n/g, '<br>');
const TONE_CLS = { green: 't-green-text', red: 't-red-text', amber: 't-amber-text', muted: 'muted', navy: 'navy-text' };
const ALIGN_CLS = { num: 'num', date: 'mid', mid: 'mid', code: 'code', text: '' };

function tableHtml(tb, total, none) {
  if (!tb.rows.length) return `<p class="muted small">${esc(none || '')}</p>`;
  return `<div class="table-wrap"><table class="tbl paper-tbl rp-tbl"><thead><tr><th class="num">#</th>${tb.head.map((h, c) => `<th class="${ALIGN_CLS[tb.types[c]] || ''}">${nl(h)}</th>`).join('')}</tr></thead>
    <tbody>${tb.rows.map((r, i) => {
      const tot = total && i === tb.rows.length - 1;
      const tones = (tb.tones && tb.tones[i]) || [];
      return `<tr${tot ? ' class="rp-total"' : ''}><td class="num muted">${tot ? '' : i + 1}</td>${r.map((v, c) => `<td class="${[ALIGN_CLS[tb.types[c]] || '', v ? TONE_CLS[tones[c]] || '' : ''].join(' ').trim()}">${nl(v)}</td>`).join('')}</tr>`;
    }).join('')}</tbody></table></div>`;
}

export function paperHtml(lay, logo) {
  const meta = (l) => `<div>${esc(l[0])}: <strong>${esc(l[1])}</strong></div>`;
  return `<div class="paper rp-paper">
    ${logo ? `<div class="paper-brand"><img class="paper-logo" src="${esc(logo.url)}" alt=""></div>` : ''}
    <h2 class="paper-title"><span class="vi">${esc(String(lay.title_vi || '').toUpperCase())}</span><span class="zh">${esc(lay.title_zh || '')}</span></h2>
    <div class="paper-meta"><div>${lay.meta_left.map(meta).join('')}</div><div class="paper-meta-r" id="rp-meta-r">${lay.meta_right.map(meta).join('')}</div></div>
    <div class="paper-tiles">${lay.tiles.map((t) => `<div class="paper-tile"><div class="pt-label">${esc(t.label)}</div><div class="pt-value ${TONE_CLS[t.tone] || ''}">${esc(t.value)}</div></div>`).join('')}</div>
    ${lay.sections.map((s) => `${s.heading ? `<h3>${esc(s.heading)}</h3>` : ''}
      ${s.kv ? `<div class="table-wrap"><table class="tbl rp-kv"><tbody>${s.kv.map((k) => `<tr><th>${esc(k[0])}</th><td>${nl(k[1])}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${s.table ? tableHtml(s.table, s.total_row, lay.none) : ''}${s.note ? `<p class="muted small">${esc(s.note)}</p>` : ''}`).join('')}
    ${(lay.notes || []).map((n) => `<p class="muted small">${esc(n)}</p>`).join('')}
    <div class="paper-sign">
      <div><div>${esc(lay.sign.prepared)}</div><div class="muted small">${esc(lay.sign.hint)}</div><div class="sign-line"></div><div class="sign-name">${esc(lay.sign.prepared_name || '')}</div></div>
      <div><div>${esc(lay.sign.approved)}</div><div class="muted small">${esc(lay.sign.hint)}</div><div class="sign-line"></div><div class="sign-name">&nbsp;</div></div>
    </div>
  </div>`;
}

/* ---------------- Tải PDF / Excel ---------------- */

/** Tệp đã sẵn sàng: iPhone chỉ mở bảng Chia sẻ trong một lần chạm mới, nên đưa nút "Mở / lưu tệp" */
function offerFile(file, titleHtml) {
  return dialog({
    title: titleHtml,
    body: `<p class="muted small rp-file-name">${esc(file.name)}</p><button type="button" class="btn primary block" id="of-open">${ICON.download}<span>${bi('rp.open_file')}</span></button>`,
    actions: [{ label: bi('btn.close'), value: true }],
    onOpen: (w) => $('#of-open', w).addEventListener('click', () => { openFile(file).catch(() => {}); })
  });
}

/**
 * Lưu (lần đầu: cấp số BC) rồi tải. Mất phản hồi (mạng chập chờn, quá giờ chờ) → gửi lại cùng report_run_id: máy chủ dùng lại báo cáo
 * đã lưu, không cấp số mới. Trả {ok, run, file} hoặc phản hồi lỗi.
 */
export async function saveAndBuild({ runId, kind, filters, format }) {
  const payload = { report_run_id: runId, kind, filters, format };
  let r = await api('report.save', payload, { write: true, timeoutMs: LONG });
  for (let i = 0; i < 2 && !r.ok && (r.code === 'UNKNOWN_RESULT' || r.code === 'NETWORK_ERROR' || r.code === 'SERVER_BUSY'); i++) {
    await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
    r = await api('report.save', payload, { write: true, timeoutMs: LONG });
  }
  if (!r.ok) return r;
  const d = r.data;
  if (format === 'PDF') return { ok: true, run: d.run, file: new File([b64ToBytes(d.content_b64)], d.file_name, { type: d.mime_type || 'application/pdf' }) };
  const logo = await reportLogo(d.logo_rev).catch(() => null);
  const file = await reportExcelFile(d.layout, logo, d.file_name);
  return { ok: true, run: d.run, layout: d.layout, file };
}

async function download(btn, job, after) {
  if (!navigator.onLine) { toast(bi('rp.need_network'), 'err'); return; }
  busy(btn, true);
  if (job.format === 'PDF') toast(bi('rp.building'));
  let res;
  try { res = await saveAndBuild(job); } catch (e) { res = { ok: false, code: 'ERROR', message_vi: String(e && e.message || e) }; }
  busy(btn, false);
  if (!res.ok) { toast(esc(resMsg(res)), 'err'); return; }
  if (after) after(res);
  await offerFile(res.file, bi(job.format === 'PDF' ? 'rp.pdf_ready' : 'rp.excel_ready', { C: esc(res.run.code) }));
}

/* ---------------- Màn Báo cáo ---------------- */

/** Mô tả bộ lọc của một báo cáo đã lưu */
function filterText(run, deptMap, itemMap) {
  const f = run.filters || {};
  const parts = [];
  if (run.kind === 'VERSIONS') { const it = itemMap.get(f.item_id); parts.push(it ? esc(it.code) : ''); } else parts.push(f.dept ? esc(nameText(deptMap.get(f.dept)) || f.dept) : bi('rpt.all_depts'));
  if (run.kind === 'CATALOG') parts.push(bi('rpt.scope.' + (f.scope || 'ISSUED')));
  if (run.kind === 'RECORDS') parts.push(`${esc(keyLabel(f.grain, f.end))} · ${bi('rp.n.' + f.grain, { N: f.n })}`);
  if (run.kind === 'COVERAGE') parts.push(bi('rpt.std.' + (f.std || 'BOTH')));
  return parts.filter(Boolean).join(' · ');
}

export async function renderReports(view, ctx) {
  const { shell, query } = ctx;
  shell.setScreen({ title: 'nav.reports', wide: true });
  if (!(await can('report.run'))) {
    view.innerHTML = `<div class="card empty-state">${ICON.reports}<p class="muted">${bi('rp.server_old')}</p></div>`;
    return;
  }
  if (ctx.entered) { freshFilters(ctx, state, INIT); applyQuery(query); cur = null; }
  if (!kindAllowed(state.kind)) state.kind = 'CATALOG';
  const all = await items();
  const deps = await depts();
  const deptMap = new Map(deps.map((d) => [d.dept_code, d]));
  const itemMap = new Map(all.map((x) => [x.item_id, x]));
  const deptOpts = deps.filter((d) => all.some((x) => x.dept_code === d.dept_code));
  const sorted = all.slice().sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.code).localeCompare(String(b.code)));
  if (state.kind === 'VERSIONS' && !itemMap.has(state.item)) state.item = (sorted.find((x) => x.status === 'ISSUED') || sorted[0] || {}).item_id || '';
  let saved = null; // báo cáo đã lưu (report.list)

  const sel = (id, label, opts, val) => `<label class="fld"><span>${bi(label)}</span><select class="inp sel" id="${id}">${opts.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  const filtersHtml = () => {
    const k = state.kind;
    const out = [];
    if (k !== 'VERSIONS') out.push(sel('rf-dept', 'rpt.f.dept', [['', biText(seesAll() ? 'rpt.all_depts' : 'cat.all')]].concat(deptOpts.map((d) => [d.dept_code, `${d.dept_code} · ${nameText(d)}`])), state.dept));
    if (k === 'CATALOG') out.push(sel('rf-scope', 'rpt.f.scope', [['ISSUED', biText('rpt.scope.ISSUED')], ['ALL', biText('rpt.scope.ALL')]], state.scope));
    if (k === 'RECORDS') {
      const keys = lastKeys(state.grain, state.grain === 'MONTH' ? 24 : 8);
      if (!state.end || !keys.includes(state.end)) state.end = keys[0];
      if (!N_OPTS[state.grain].includes(Number(state.n))) state.n = N_DEF[state.grain];
      out.push(sel('rf-grain', 'rpt.f.period', [['MONTH', biText('rp.grain.MONTH')], ['QUARTER', biText('rp.grain.QUARTER')]], state.grain));
      out.push(sel('rf-end', 'rpt.f.end', keys.map((x) => [x, keyLabel(state.grain, x)]), state.end));
      out.push(sel('rf-n', 'rpt.f.n', N_OPTS[state.grain].map((n) => [n, biText('rp.n.' + state.grain, { N: n })]), state.n));
    }
    if (k === 'COVERAGE') {
      out.push(sel('rf-std', 'rpt.f.std', ['BOTH', 'ISO9001', 'BRC'].map((s) => [s, biText('rpt.std.' + s)]), state.std));
      out.push(`<label class="fld chk"><input type="checkbox" id="rf-codes"${state.codes ? ' checked' : ''}><span>${bi('rpt.f.codes')}</span></label>`);
    }
    if (k === 'VERSIONS') {
      out.push(`<label class="fld wide"><span>${bi('rpt.f.item')}</span><select class="inp sel" id="rf-item">${deptOpts.map((d) => {
        const list = sorted.filter((x) => x.dept_code === d.dept_code);
        return `<optgroup label="${esc(d.dept_code + ' · ' + nameText(d))}">${list.map((x) => `<option value="${esc(x.item_id)}"${x.item_id === state.item ? ' selected' : ''}>${esc(x.code)} · ${esc(x.name_vi || x.name_zh || '')}</option>`).join('')}</optgroup>`;
      }).join('')}</select></label>`);
    }
    return out.join('');
  };

  const savedHtml = () => {
    if (saved === null) return `<div class="loading"><div class="spinner small"></div></div>`;
    if (saved.error) return `<p class="muted small">${esc(saved.error)}</p>`;
    if (!saved.items.length) return `<p class="muted small">${bi('rp.saved_none')}</p>`;
    return `<ul class="cat-list rp-saved">${saved.items.slice(0, 50).map((r) => `<li class="rp-run" data-run="${esc(r.report_run_id)}">
      <div class="cat-top"><span class="code">${esc(r.code)}</span><span class="muted small">${esc(fmtDateTime(r.generated_at))}</span></div>
      <div class="cat-name">${bi('rpt.kind.' + r.kind)}</div>
      <div class="cat-meta">${filterText(r, deptMap, itemMap)}${isSecretary() && r.generated_by_name ? ' · ' + esc(r.generated_by_name) : ''}</div>
      <div class="row"><button type="button" class="btn small" data-rpdf="${esc(r.report_run_id)}">${ICON.file}<span>${bi('rp.pdf')}</span></button>
        <button type="button" class="btn small" data-rxlsx="${esc(r.report_run_id)}">${ICON.excel}<span>${bi('rp.excel')}</span></button></div></li>`).join('')}</ul>`;
  };

  const previewHtml = () => {
    if (!cur || !cur.layout) return `<div class="card empty-state rp-empty">${ICON.reports}<p class="muted">${bi('rp.preview_hint')}</p></div>`;
    return `${cur.logo ? '' : `<p class="muted small">${bi('rp.no_logo')}${Number(session.user && session.user.role_level) >= 4 ? ` <a href="#/admin/report-logo">${bi('admin.report_logo')}</a>` : ''}</p>`}${paperHtml(cur.layout, cur.logo)}`;
  };

  const draw = () => {
    const kinds = KINDS.filter(kindAllowed);
    view.innerHTML = `<div class="rp-web">
      <div class="rp-left">
        <section class="card"><h2>${bi('rp.pick')}</h2><div class="rp-list" role="tablist">${kinds.map((k) => `<button type="button" class="card rp-item${state.kind === k ? ' on' : ''}" data-kind="${k}" role="tab" aria-selected="${state.kind === k}">
          <span class="rp-ico">${ICON[KIND_ICON[k]]}</span><span class="rp-text"><strong>${bi('rpt.kind.' + k)}</strong><span class="muted small">${bi('rpt.desc.' + k)}</span></span>${ICON.chevron}</button>`).join('')}</div></section>
        <section class="card rp-filter-card"><h2>${bi('rp.filters')}</h2><div class="rf-grid">${filtersHtml()}</div>
          <div class="row rp-actions"><button type="button" class="btn primary" id="rp-run">${ICON.eye}<span>${bi('rp.run')}</span></button>
            <button type="button" class="btn" id="rp-pdf">${ICON.file}<span>${bi('rp.pdf')}</span></button>
            <button type="button" class="btn" id="rp-xlsx">${ICON.excel}<span>${bi('rp.excel')}</span></button></div>
          <p class="muted small">${bi('rp.save_note')}</p></section>
        ${isWide() ? `<section class="card"><h2>${bi(isSecretary() ? 'rp.saved' : 'rp.saved_mine')}</h2><div id="rp-saved">${savedHtml()}</div></section>` : ''}
      </div>
      <div class="rp-right rp-preview"><section class="card"><div class="card-head"><h2>${bi('rp.preview')}</h2>${cur && cur.code ? `<span class="badge t-navy">${esc(cur.code)}</span>` : ''}</div><div id="rp-prev">${previewHtml()}</div></section>
        ${isWide() ? '' : `<section class="card"><h2>${bi(isSecretary() ? 'rp.saved' : 'rp.saved_mine')}</h2><div id="rp-saved">${savedHtml()}</div></section>`}</div>
    </div>`;
    wire();
  };

  const filterChanged = () => { if (cur && cur.sig !== sigOf(state)) cur = null; draw(); };
  const job = (format) => {
    const sig = sigOf(state);
    if (!cur || cur.sig !== sig) cur = { sig, runId: uuid(), code: '', layout: null, logo: null };
    return { runId: cur.runId, kind: state.kind, filters: filtersOf(state), format };
  };
  const afterSave = (res) => {
    if (cur && cur.runId === res.run.report_run_id) {
      cur.code = res.run.code;
      if (!cur.layout && res.layout) cur.layout = res.layout;
      if (cur.layout) {
        const k = cur.layout.meta_right.findIndex((l) => l[0] === biText('rpt.number'));
        if (k >= 0) cur.layout.meta_right[k] = [cur.layout.meta_right[k][0], res.run.code];
      }
    }
    saved = null;
    draw();
    loadSaved();
  };
  const loadSaved = async () => {
    const r = await api('report.list', {}, { retry: true });
    saved = r.ok ? r.data : { error: resMsg(r) };
    const box = view.querySelector('#rp-saved');
    if (box) { box.innerHTML = savedHtml(); wireSaved(); }
  };
  const wireSaved = () => {
    const runOf = (id) => saved && saved.items && saved.items.find((x) => x.report_run_id === id);
    view.querySelectorAll('[data-rpdf],[data-rxlsx]').forEach((b) => b.addEventListener('click', () => {
      const run = runOf(b.dataset.rpdf || b.dataset.rxlsx);
      if (!run) return;
      download(b, { runId: run.report_run_id, kind: run.kind, filters: run.filters, format: b.dataset.rpdf ? 'PDF' : 'XLSX' });
    }));
  };
  const wire = () => {
    view.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => {
      if (state.kind === b.dataset.kind) return;
      state.kind = b.dataset.kind;
      if (state.kind === 'VERSIONS' && !itemMap.has(state.item)) state.item = (sorted.find((x) => x.status === 'ISSUED') || sorted[0] || {}).item_id || '';
      cur = null;
      draw();
      if (!isWide()) { const fc = view.querySelector('.rp-filter-card'); if (fc && fc.scrollIntoView) fc.scrollIntoView({ block: 'start' }); }
    }));
    const on = (id, fn) => { const el = view.querySelector('#' + id); if (el) el.addEventListener('change', () => { fn(el); filterChanged(); }); };
    on('rf-dept', (el) => { state.dept = el.value; });
    on('rf-scope', (el) => { state.scope = el.value; });
    on('rf-grain', (el) => { state.grain = el.value; state.end = ''; state.n = N_DEF[state.grain]; });
    on('rf-end', (el) => { state.end = el.value; });
    on('rf-n', (el) => { state.n = Number(el.value); });
    on('rf-std', (el) => { state.std = el.value; });
    on('rf-codes', (el) => { state.codes = el.checked; });
    on('rf-item', (el) => { state.item = el.value; });
    $('#rp-run', view).addEventListener('click', async (ev) => {
      const btn = ev.currentTarget;
      if (!navigator.onLine) { toast(bi('rp.need_network'), 'err'); return; }
      busy(btn, true);
      const r = await api('report.run', { kind: state.kind, filters: filtersOf(state) }, { retry: true, timeoutMs: 120000 });
      busy(btn, false);
      if (!r.ok) { toast(esc(resMsg(r)), 'err'); return; }
      const sig = sigOf(state);
      const keep = cur && cur.sig === sig && cur.code ? cur : null;
      const logo = await reportLogo(r.data.logo_rev).catch(() => null);
      cur = { sig, runId: keep ? keep.runId : uuid(), code: keep ? keep.code : '', layout: r.data.layout, logo };
      if (keep) { const k = cur.layout.meta_right.findIndex((l) => l[0] === biText('rpt.number')); if (k >= 0) cur.layout.meta_right[k] = [cur.layout.meta_right[k][0], keep.code]; }
      draw();
      if (!isWide()) { const p = view.querySelector('.rp-preview'); if (p && p.scrollIntoView) p.scrollIntoView({ block: 'start' }); }
    });
    $('#rp-pdf', view).addEventListener('click', (ev) => download(ev.currentTarget, job('PDF'), afterSave));
    $('#rp-xlsx', view).addEventListener('click', (ev) => download(ev.currentTarget, job('XLSX'), afterSave));
    wireSaved();
  };
  draw();
  if (navigator.onLine) loadSaved(); else { saved = { error: biText('rp.need_network') }; const box = view.querySelector('#rp-saved'); if (box) box.innerHTML = savedHtml(); }
  // Mở từ chi tiết biểu / phủ điều khoản / hồ sơ (?kind=…): xem luôn
  if (query && query.kind && navigator.onLine && !cur) { const b = view.querySelector('#rp-run'); if (b) b.click(); }
}
