// Báo cáo (Đợt 2, phiên 2c): 4 báo cáo do máy chủ tính (27_reports.js) — Danh mục tài liệu hiện hành (thay BM-ISO-02-01), Tình trạng
// hồ sơ theo bộ phận và kỳ (tháng / quý), Phủ điều khoản ISO 9001 và BRCGS, Lịch sử phiên bản của một tài liệu; phiên 2d thêm Sổ phân phối
// & thu hồi (thay BM-ISO-02-03) và Phiếu đề nghị tài liệu (một phiếu để in ký, hoặc sổ theo dõi năm — thay BM-ISO-02-02); phiên 3a thêm
// Khắc phục (một phiếu để in ký, hoặc sổ theo dõi khắc phục năm — mã biểu theo cài đặt, mặc định BM-CĐ-14-02).
// Chọn báo cáo + bộ lọc → Xem báo cáo (bản xem trước như trang in, chưa có số) → Tải PDF (máy chủ dựng bằng Google Docs, A4 ngang,
// logo công ty) / Tải Excel (dựng trên máy, js/report-xlsx.js): lần tải đầu lưu báo cáo và cấp số BC-yymm-001; tải tiếp (PDF rồi
// Excel) cùng bộ lọc → cùng số, cùng số liệu. Báo cáo đã lưu: tải lại PDF / Excel đúng như lúc lập.
// Cần mạng. Bộ lọc là nút chọn, không có ô gõ (iPhone không bật bàn phím).
import { api, bi, biText, esc, nameText, resMsg, uuid, b64ToBytes, fmtDateTime, session } from '../core.js';
import { $, ICON, toast, dialog, freshFilters } from '../ui.js';
import { isWide } from '../shell.js';
import { items, depts, recs, can, seesAll, canSeeRecords, isSecretary, today, capaOn, capaForms, capaDefaultForm } from '../data.js';
import { busy } from '../form.js';
import { openFile } from '../files.js';
import { reportLogo } from '../report-logo.js';
import { reportExcelFile } from '../report-xlsx.js';

const KINDS = ['CATALOG', 'RECORDS', 'COVERAGE', 'VERSIONS', 'DIST', 'DOCREQ', 'CAPA'];
const KIND_ICON = { CATALOG: 'library', RECORDS: 'file', COVERAGE: 'checklist', VERSIONS: 'archive', DIST: 'print', DOCREQ: 'edit', CAPA: 'repairs' };
const NEED_RECORDS = { RECORDS: 1, COVERAGE: 1, DIST: 1, DOCREQ: 1, CAPA: 1 };
const N_OPTS = { MONTH: [3, 6, 12], QUARTER: [2, 4, 8] };
const N_DEF = { MONTH: 6, QUARTER: 4 };
const LONG = 180000; // máy chủ dựng PDF bằng Google Docs: tới cả phút với danh mục lớn

const INIT = { kind: 'CATALOG', dept: '', scope: 'ISSUED', grain: 'MONTH', end: '', n: 6, std: 'BOTH', codes: true, item: '', dstate: 'ALL', year: 0, rstate: 'ALL', req: '', capa: '', cstate: 'ALL', cform: '', csource: 'ALL' };
const state = { ...INIT };
/** Bản xem trước / báo cáo đang làm: {sig, runId, code, layout, logo} — đổi bộ lọc thì bỏ */
let cur = null;

/** Loại báo cáo người dùng xem được (như reportKindAllowed_ của máy chủ) */
export function kindAllowed(kind) {
  return NEED_RECORDS[kind] ? canSeeRecords() : KINDS.includes(kind);
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
  if (s.kind === 'DIST') return { dept: s.dept, state: s.dstate };
  if (s.kind === 'DOCREQ') return s.req ? { request_id: s.req } : { dept: s.dept, year: Number(s.year) || Number(today().slice(0, 4)), state: s.rstate };
  if (s.kind === 'CAPA') return s.capa ? { capa_id: s.capa, form: s.cform || 'CAR' } : { dept: s.dept, year: Number(s.year) || Number(today().slice(0, 4)), state: s.cstate, source: s.csource || 'ALL' };
  return { item_id: s.item };
}
const sigOf = (s) => JSON.stringify([s.kind, filtersOf(s)]);

function applyQuery(q) {
  if (!q) return;
  if (KINDS.includes(q.kind)) state.kind = q.kind;
  if (q.item) state.item = String(q.item);
  if (q.dept !== undefined) state.dept = String(q.dept);
  if (q.std && ['BOTH', 'ISO9001', 'BRC'].includes(q.std)) state.std = q.std;
  if (q.req) state.req = String(q.req);
  if (q.capa) state.capa = String(q.capa);
  if (q.form) state.cform = String(q.form);
  if (q.source && ['ALL', 'INTERNAL', 'COMPLAINT', 'SUPPLIER'].includes(q.source)) state.csource = q.source;
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
    <div class="paper-sign${lay.sign.middle ? ' three' : ''}">
      ${signCols(lay.sign).map(([h, n]) => `<div><div>${esc(h)}</div><div class="muted small">${esc(lay.sign.hint)}</div><div class="sign-line"></div><div class="sign-name">${n ? esc(n) : '&nbsp;'}</div></div>`).join('')}
    </div>
  </div>`;
}

/** Ô ký: [[tiêu đề, tên]] — hai ô (Người lập · Người duyệt) hoặc ba ô khi có ô giữa (SCAR: đại diện nhà cung cấp) */
function signCols(sg) {
  return sg.middle ? [[sg.prepared, sg.prepared_name], [sg.middle, sg.middle_name], [sg.approved, sg.approved_name]] : [[sg.prepared, sg.prepared_name], [sg.approved, sg.approved_name]];
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
function filterText(run, deptMap, itemMap, reqMap = new Map(), capaMap = new Map()) {
  const f = run.filters || {};
  const parts = [];
  if (run.kind === 'VERSIONS') { const it = itemMap.get(f.item_id); parts.push(it ? esc(it.code) : ''); } else parts.push(f.dept ? esc(nameText(deptMap.get(f.dept)) || f.dept) : bi('rpt.all_depts'));
  if (run.kind === 'CATALOG') parts.push(bi('rpt.scope.' + (f.scope || 'ISSUED')));
  if (run.kind === 'RECORDS') parts.push(`${esc(keyLabel(f.grain, f.end))} · ${bi('rp.n.' + f.grain, { N: f.n })}`);
  if (run.kind === 'COVERAGE') parts.push(bi('rpt.std.' + (f.std || 'BOTH')));
  if (run.kind === 'DIST') parts.push(bi('rpt.dist_state.' + (f.state || 'ALL')));
  if (run.kind === 'CAPA') {
    if (f.capa_id) { parts.length = 0; parts.push(esc((capaMap.get(f.capa_id) || {}).code || '')); if (f.form && f.form !== 'CAR') parts.push(bi('rpt.capa_form.' + f.form)); }
    else { parts.push(esc(String(f.year || '')) + ' · ' + bi('rpt.capa_state.' + (f.state || 'ALL'))); if (f.source && f.source !== 'ALL') parts.push(bi('rpt.capa_source.' + f.source)); }
  }
  if (run.kind === 'DOCREQ') { if (f.request_id) { parts.length = 0; parts.push(esc((reqMap.get(f.request_id) || {}).code || '')); } else parts.push(esc(String(f.year || '')) + ' · ' + bi('rpt.req_state.' + (f.state || 'ALL'))); }
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
  const capaReady = await capaOn();
  const kindOk = (k) => kindAllowed(k) && (k !== 'CAPA' || capaReady);
  if (!kindOk(state.kind)) state.kind = 'CATALOG';
  const all = await items();
  const deps = await depts();
  const deptMap = new Map(deps.map((d) => [d.dept_code, d]));
  const itemMap = new Map(all.map((x) => [x.item_id, x]));
  const deptOpts = deps.filter((d) => all.some((x) => x.dept_code === d.dept_code));
  const sorted = all.slice().sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.code).localeCompare(String(b.code)));
  if (state.kind === 'VERSIONS' && !itemMap.has(state.item)) state.item = (sorted.find((x) => x.status === 'ISSUED') || sorted[0] || {}).item_id || '';
  // Phiếu đề nghị (2d): chọn một phiếu (in ký) hoặc sổ theo dõi năm
  const reqList = (await recs('DOCREQ')).filter((r) => !r.archived_at).sort((a, b) => String(b.code).localeCompare(String(a.code)));
  const reqMap = new Map(reqList.map((r) => [r.request_id, r]));
  if (state.req && !reqMap.has(state.req)) state.req = '';
  const thisYear = Number(today().slice(0, 4));
  // Khắc phục (3a): chọn một phiếu (in ký) hoặc sổ theo dõi năm
  const capaList = (await recs('CAPA')).filter((c) => !c.archived_at).sort((a, b) => String(b.code).localeCompare(String(a.code)));
  const capaMap = new Map(capaList.map((c) => [c.capa_id, c]));
  if (state.capa && !capaMap.has(state.capa)) state.capa = '';
  // Mẫu in của phiếu (3b): khiếu nại → tiếp nhận / 8D / phiếu khắc phục; SCAR → SCAR / phiếu khắc phục
  const fixForm = () => { const c = capaMap.get(state.capa); if (c && !capaForms(c).includes(state.cform)) state.cform = capaDefaultForm(c); };
  fixForm();
  const years = [...new Set([thisYear, ...reqList.map((r) => Number(String(r.submitted_at).slice(0, 4))), ...capaList.map((c) => Number(String(c.found_date).slice(0, 4)))].filter((y) => y > 2000))].sort((a, b) => b - a);
  if (!state.year) state.year = thisYear;
  let saved = null; // báo cáo đã lưu (report.list)

  const sel = (id, label, opts, val) => `<label class="fld"><span>${bi(label)}</span><select class="inp sel" id="${id}">${opts.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  const filtersHtml = () => {
    const k = state.kind;
    const out = [];
    if (k === 'DOCREQ') out.push(sel('rf-req', 'rpt.f.req', [['', biText('rp.req_log')]].concat(reqList.slice(0, 300).map((r) => [r.request_id, `${r.code} · ${biText('dr.type.' + r.req_type).split(' · ')[0]} · ${(itemMap.get(r.item_id) || {}).code || r.new_code || ''}`])), state.req));
    if (k === 'CAPA') out.push(sel('rf-capa', 'rpt.f.capa', [['', biText('rp.capa_log')]].concat(capaList.slice(0, 300).map((c) => [c.capa_id, `${c.code} · ${String(c.title_vi || c.title_zh || c.problem_vi || c.problem_zh || '').split('\n')[0].slice(0, 60)}`])), state.capa));
    if (k !== 'VERSIONS' && !(k === 'DOCREQ' && state.req) && !(k === 'CAPA' && state.capa)) out.push(sel('rf-dept', k === 'DIST' ? 'dist.recipient' : 'rpt.f.dept', [['', biText(seesAll() ? 'rpt.all_depts' : 'cat.all')]].concat((k === 'DIST' ? deps : deptOpts).map((d) => [d.dept_code, `${d.dept_code} · ${nameText(d)}`])), state.dept));
    if (k === 'DIST') out.push(sel('rf-dstate', 'rpt.f.dist_state', ['ALL', 'ACTIVE', 'DUE', 'RECALLED'].map((x) => [x, biText('rpt.dist_state.' + x)]), state.dstate));
    if (k === 'DOCREQ' && !state.req) {
      out.push(sel('rf-year', 'rpt.f.year', years.map((y) => [y, String(y)]), state.year));
      out.push(sel('rf-rstate', 'rpt.f.req_state', ['ALL', 'OPEN', 'DONE', 'REJECTED'].map((x) => [x, biText('rpt.req_state.' + x)]), state.rstate));
    }
    if (k === 'CAPA' && state.capa) out.push(sel('rf-cform', 'rpt.f.capa_form', capaForms(capaMap.get(state.capa)).map((x) => [x, biText('rpt.capa_form.' + x)]), state.cform));
    if (k === 'CAPA' && !state.capa) {
      out.push(sel('rf-csource', 'rpt.f.capa_source', ['ALL', 'INTERNAL', 'COMPLAINT', 'SUPPLIER'].map((x) => [x, biText('rpt.capa_source.' + x)]), state.csource));
      out.push(sel('rf-year', 'rpt.f.year', years.map((y) => [y, String(y)]), state.year));
      out.push(sel('rf-cstate', 'rpt.f.capa_state', ['ALL', 'OPEN', 'OVERDUE', 'VERIFYING', 'CLOSED'].map((x) => [x, biText('rpt.capa_state.' + x)]), state.cstate));
    }
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
      <div class="cat-meta">${filterText(r, deptMap, itemMap, reqMap, capaMap)}${isSecretary() && r.generated_by_name ? ' · ' + esc(r.generated_by_name) : ''}</div>
      <div class="row"><button type="button" class="btn small" data-rpdf="${esc(r.report_run_id)}">${ICON.file}<span>${bi('rp.pdf')}</span></button>
        <button type="button" class="btn small" data-rxlsx="${esc(r.report_run_id)}">${ICON.excel}<span>${bi('rp.excel')}</span></button></div></li>`).join('')}</ul>`;
  };

  const previewHtml = () => {
    if (!cur || !cur.layout) return `<div class="card empty-state rp-empty">${ICON.reports}<p class="muted">${bi('rp.preview_hint')}</p></div>`;
    return `${cur.logo ? '' : `<p class="muted small">${bi('rp.no_logo')}${Number(session.user && session.user.role_level) >= 4 ? ` <a href="#/admin/report-logo">${bi('admin.report_logo')}</a>` : ''}</p>`}${paperHtml(cur.layout, cur.logo)}`;
  };

  const draw = () => {
    const kinds = KINDS.filter(kindOk);
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
    on('rf-dstate', (el) => { state.dstate = el.value; });
    on('rf-req', (el) => { state.req = el.value; });
    on('rf-year', (el) => { state.year = Number(el.value); });
    on('rf-rstate', (el) => { state.rstate = el.value; });
    on('rf-capa', (el) => { state.capa = el.value; state.cform = ''; fixForm(); });
    on('rf-cform', (el) => { state.cform = el.value; });
    on('rf-csource', (el) => { state.csource = el.value; });
    on('rf-cstate', (el) => { state.cstate = el.value; });
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
