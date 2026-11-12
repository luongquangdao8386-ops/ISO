// Excel (mục 6 đặc tả): Tải mẫu · Xuất danh mục · Nhập lô (xem trước rồi ghi), cùng khuôn file Excel tổng.
// Xuất: Trưởng bộ phận (bộ phận mình — dữ liệu trên máy đã theo phạm vi), Thư ký ISO, Quản trị. Nhập: Thư ký ISO, Quản trị.
// Lô nhập là lô nhạy cảm: người ghi khác người nhập (trừ Quản trị); mỗi lượt ghi tối đa 100 dòng, hỏi PIN.
import { bi, biText, esc, fmtDateTime, fmtNumber, session, isoNowVN, uuid, api, resMsg, badge } from '../core.js';
import { ICON, toast, dialog } from '../ui.js';
import { loadXlsx, sha256Hex, polishXlsx } from '../xlsx.js';
import { buildCatalogWorkbook, parseCatalogWorkbook, exportName } from '../catalog-xlsx.js';
import { items, recs, roleLevel, isSecretary, today, seesAll } from '../data.js';
import { shareFileNow } from '../media.js';
import { writeOnline, writeWithPin, writeFail, busy, evBtn } from '../form.js';
import { navigate } from '../router.js';
import { afterCommit } from '../app.js';

const PART = 200;
const spinner = '<div class="spinner" role="status"></div>';

/** Tệp .xlsx đúng khuôn từ dữ liệu trên máy (empty: mẫu trống) */
export async function catalogFile({ empty = false } = {}) {
  const X = await loadXlsx();
  const data = {
    items: empty ? [] : await items(), groups: await recs('GROUP'), depts: await recs('DEPT'), clauses: await recs('CLAUSE'),
    grace: Number(session.settings.record_grace_days ?? 3), epoch: session.epoch || '', exported_at: isoNowVN().slice(0, 16).replace('T', ' '), empty
  };
  const { wb, polish } = buildCatalogWorkbook(X, data);
  const bytes = polishXlsx(X, X.write(wb, { type: 'array', bookType: 'xlsx', compression: true }), polish);
  return new File([bytes], exportName(today(), empty), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const ACTION_TONE = { ADD: 't-green', UPDATE: 't-amber', SAME: 't-grey', ERROR: 't-red', SKIP: 't-grey' };
const actBadge = (a) => `<span class="badge ${ACTION_TONE[a] || 't-grey'}">${bi('imp.act.' + a)}</span>`;
const FIELD_KEY = (f) => 'col.' + f;

function rowsHtml(rows, { onlyChanged = true } = {}) {
  // Dòng ngoài phạm vi áp dụng (SKIP, 2e) không liệt kê — chỉ đếm ở phần tóm tắt
  const list = onlyChanged ? rows.filter((r) => r.action !== 'SAME' && r.action !== 'SKIP') : rows;
  if (!list.length) return `<p class="banner ok">${bi('imp.no_change')}</p>`;
  return `<div class="table-wrap"><table class="tbl imp-rows"><thead><tr><th class="num">${bi('imp.row')}</th><th>${bi('cat.code')}</th><th>${bi('imp.action')}</th><th>${bi('imp.detail')}</th></tr></thead>
    <tbody>${list.slice(0, 400).map((r) => `<tr><td class="num">${r.row_number}</td><td class="code">${esc(r.code || '')}</td><td>${actBadge(r.action)}${r.committed_at ? ` <span class="badge t-green">${bi('imp.written')}</span>` : ''}</td>
      <td class="small">${(r.errors || []).map((e) => `<div class="t-red-text">${esc(e.field || '')}: ${esc(e.message_vi || e.code)} · ${esc(e.message_zh || '')}</div>`).join('')}${(r.changes || []).length ? `<span class="muted">${(r.changes || []).map((c) => esc(biText(FIELD_KEY(c)))).join(', ')}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
}

function batchSummary(b) {
  return `<div class="imp-sum">
    <span>${bi('imp.total', { N: fmtNumber(b.total_rows) })}</span>
    <span class="t-green-text">${bi('imp.n_add', { N: b.add_count })}</span>
    <span class="t-amber-text">${bi('imp.n_update', { N: b.update_count })}</span>
    <span class="muted">${bi('imp.n_same', { N: b.same_count })}</span>
    <span class="t-red-text">${bi('imp.n_error', { N: b.error_count })}</span>
    ${b.skip_count ? `<span class="muted">${bi('imp.n_skip', { N: b.skip_count })}</span>` : ''}
    ${b.clause_count ? `<span>${bi('imp.n_clause', { N: b.clause_count })}</span>` : ''}</div>`;
}

/** Ghi lô: lặp import.commit tới khi hết dòng (mỗi lượt ≤ 100 dòng) */
async function commitBatch(id, out) {
  const ok = await dialog({ title: bi('imp.commit'), body: `<p>${bi('imp.commit_confirm')}</p>`, actions: [{ label: bi('btn.cancel'), value: false }, { label: bi('imp.commit'), kind: 'primary', value: true }] });
  if (!ok) return false;
  let total = 0, rowErr = [];
  for (let i = 0; i < 20; i++) {
    out.innerHTML = `<p class="banner info"><span class="spinner tiny" aria-hidden="true"></span> ${bi('imp.committing', { N: total })}</p>`;
    const r = await writeWithPin('import.commit', { import_batch_id: id });
    if (!r.ok) { writeFail(r); out.innerHTML = ''; return total > 0; }
    total += r.data.committed || 0;
    rowErr = rowErr.concat(r.data.row_errors || []);
    if (!r.data.remaining) break;
  }
  await afterCommit();
  out.innerHTML = `<p class="banner ok">${bi('imp.committed', { N: total })}</p>${rowErr.length ? `<p class="banner warn">${bi('imp.row_errors', { N: rowErr.length })}: ${rowErr.slice(0, 20).map((e) => esc(e.code)).join(', ')}</p>` : ''}`;
  toast(bi('imp.committed', { N: total }), 'ok');
  return true;
}

async function previewFile(file, box) {
  box.innerHTML = `<p class="banner info"><span class="spinner tiny" aria-hidden="true"></span> ${bi('imp.reading')}</p>`;
  let parsed, sha;
  try {
    const X = await loadXlsx();
    const buf = await file.arrayBuffer();
    sha = await sha256Hex(buf);
    parsed = parseCatalogWorkbook(X, X.read(buf, { type: 'array', cellDates: true }));
  } catch (e) {
    box.innerHTML = `<p class="banner err">${bi('imp.read_fail')}: ${esc(e && e.message)}</p>`;
    return;
  }
  if (parsed.errors.includes('TEMPLATE_UNKNOWN') || !parsed.rows.length) {
    box.innerHTML = `<p class="banner err">${bi('imp.template_unknown')}</p>`;
    return;
  }
  const id = uuid();
  const parts = [];
  for (let i = 0; i < parsed.rows.length; i += PART) parts.push(parsed.rows.slice(i, i + PART));
  let res = null;
  const rows = [];
  for (let i = 0; i < parts.length; i++) {
    box.innerHTML = `<p class="banner info"><span class="spinner tiny" aria-hidden="true"></span> ${bi('imp.checking', { A: i + 1, B: parts.length })}</p>`;
    const payload = { import_batch_id: id, file_name: file.name, source_sha256: sha, meta: Object.keys(parsed.meta).length ? parsed.meta : null, part: { index: i, count: parts.length }, rows: parts[i] };
    if (i === 0) payload.clauses = parsed.clauses;
    res = await writeOnline('import.preview', payload);
    if (!res.ok) {
      box.innerHTML = `<p class="banner err">${esc(resMsg(res))}${(res.errors || []).slice(0, 5).map((e) => `<br>${esc(e.message_vi || e.code)} · ${esc(e.message_zh || '')}`).join('')}</p>`;
      return;
    }
    rows.push(...res.data.rows);
    if (res.data.all_rows) rows.splice(0, rows.length, ...res.data.all_rows);
  }
  const b = res.data.batch;
  const graceNote = parsed.grace !== null && parsed.grace !== undefined && Number(parsed.grace) !== Number(session.settings.record_grace_days ?? 3)
    ? `<p class="banner warn small">${bi('imp.grace_diff', { A: parsed.grace, B: session.settings.record_grace_days ?? 3 })}</p>` : '';
  const canCommit = roleLevel() === 4;
  const nothing = !b.add_count && !b.update_count && !b.clause_count;
  box.innerHTML = `<section class="card"><h3>${bi('imp.preview')} · ${esc(file.name)}</h3>
    ${batchSummary(b)}${graceNote}
    ${nothing ? `<p class="banner ok">${bi('imp.no_change')}</p>` : rowsHtml(rows)}
    ${b.error_count ? `<p class="banner warn small">${bi('imp.errors_skip')}</p>` : ''}
    <div class="row">${nothing ? '' : (canCommit ? `<button type="button" class="btn primary" id="imp-commit">${ICON.upload}<span>${bi('imp.commit')}</span></button>` : `<p class="banner info small">${bi('imp.need_other')}</p>`)}
      <button type="button" class="btn" id="imp-cancel">${bi(nothing ? 'btn.close' : 'imp.cancel')}</button></div>
    <div id="imp-out"></div></section>`;
  const c = box.querySelector('#imp-commit');
  if (c) c.addEventListener('click', async (ev) => { busy(evBtn(ev), true); const done = await commitBatch(id, box.querySelector('#imp-out')); busy(evBtn(ev), false); if (done) c.remove(); });
  box.querySelector('#imp-cancel').addEventListener('click', async () => {
    if (!nothing) { const r = await writeOnline('import.cancel', { import_batch_id: id }); if (!r.ok) { writeFail(r); return; } }
    box.innerHTML = '';
  });
}

async function batchesHtml() {
  if (!navigator.onLine) return `<p class="muted small">${bi('sync.need_network')}</p>`;
  const r = await api('import.list', {}, { retry: true });
  if (!r.ok) return `<p class="muted small">${esc(resMsg(r))}</p>`;
  if (!r.data.items.length) return `<p class="muted small">${bi('imp.none')}</p>`;
  return `<ul class="list batches">${r.data.items.map((b) => `<li><a class="kv link-row" href="#/excel/batch/${esc(b.import_batch_id)}">
    <span><strong>${esc(b.file_name || '—')}</strong> ${badge('imp.status.' + b.status)}${b.can_commit ? ` <span class="badge t-amber">${bi('imp.wait_commit')}</span>` : ''}<br>
      <span class="muted small">${esc(fmtDateTime(b.imported_at))} · ${esc(b.imported_by_name)} · ${bi('imp.total', { N: b.total_rows })} · +${b.add_count} · ~${b.update_count} · ✕${b.error_count}</span></span>${ICON.chevron}</a></li>`).join('')}</ul>`;
}

export async function renderExcel(view, { shell }) {
  shell.setScreen({ title: 'nav.excel' });
  const lvl = roleLevel(), sec = isSecretary();
  if (lvl < 3 && !sec) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('err.forbidden')}</p></div>`; return; }
  const n = (await items()).length;
  view.innerHTML = `<section class="card"><h2>${bi('xl.export')}</h2>
      <p class="muted small">${bi('xl.export_note')}</p>
      ${seesAll() ? '' : `<p class="muted small">${bi('xl.scope_note')}</p>`}
      <div class="row"><button type="button" class="btn primary" id="xl-export">${ICON.download}<span>${bi('xl.export_btn', { N: n })}</span></button>
        <button type="button" class="btn" id="xl-template">${ICON.excel}<span>${bi('xl.template')}</span></button></div>
      <p class="muted small">${bi('xl.format_note')}</p></section>
    ${sec ? `<section class="card"><h2>${bi('xl.import')}</h2>
      <p class="muted small">${bi('xl.import_note')}</p>
      ${navigator.onLine ? `<label class="btn file primary">${ICON.upload}<span>${bi('xl.choose')}</span><input type="file" id="xl-file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden></label>` : `<p class="muted">${bi('sync.need_network')}</p>`}
      <div id="xl-preview"></div></section>
    <section class="card"><h2>${bi('xl.batches')}</h2><div id="xl-batches">${spinner}</div></section>` : ''}`;
  const exp = view.querySelector('#xl-export'), tpl = view.querySelector('#xl-template');
  const make = async (ev, empty) => {
    const b = evBtn(ev);
    busy(b, true);
    try { const f = await catalogFile({ empty }); busy(b, false); await shareFileNow(f); } catch (e) { busy(b, false); toast(bi('xl.export_fail') + ' ' + esc(e && e.message), 'err'); }
  };
  exp.addEventListener('click', (ev) => make(ev, false));
  tpl.addEventListener('click', (ev) => make(ev, true));
  const inp = view.querySelector('#xl-file');
  if (inp) inp.addEventListener('change', async () => {
    const f = inp.files && inp.files[0];
    inp.value = '';
    if (!f) return;
    await previewFile(f, view.querySelector('#xl-preview'));
    const bx = view.querySelector('#xl-batches');
    if (bx) bx.innerHTML = await batchesHtml();
  });
  const bx = view.querySelector('#xl-batches');
  if (bx) bx.innerHTML = await batchesHtml();
}

/** Một lô nhập: các dòng, Ghi (người khác người nhập, hoặc Quản trị), Bỏ lô */
export async function renderBatch(view, { shell, params }) {
  shell.setScreen({ title: 'xl.batch', back: '/excel' });
  if (!navigator.onLine) { view.innerHTML = `<div class="card empty-state">${ICON.sync}<p class="muted">${bi('sync.need_network')}</p></div>`; return; }
  view.innerHTML = spinner;
  const r = await api('import.rows', { import_batch_id: params.id }, { retry: true });
  if (!r.ok) { view.innerHTML = `<div class="card">${esc(resMsg(r))}</div>`; return; }
  const b = r.data.batch;
  const open = b.status === 'PREVIEWED' || b.status === 'COMMITTING';
  view.innerHTML = `<section class="card"><h2>${esc(b.file_name)} ${badge('imp.status.' + b.status)}</h2>
    <p class="muted small">${bi('imp.by', { U: esc(b.imported_by_name), T: esc(fmtDateTime(b.imported_at)) })}${b.committed_by_name ? ` · ${bi('imp.committed_by', { U: esc(b.committed_by_name) })}` : ''}</p>
    ${batchSummary(b)}
    ${r.data.clauses ? `<p class="muted small">${bi('imp.clauses_diff', { A: r.data.clauses.add, U: r.data.clauses.update, D: r.data.clauses.deactivate })}</p>` : ''}
    ${open && !b.can_commit ? `<p class="banner info small">${bi('imp.need_other')}</p>` : ''}
    <div class="row">${open && b.can_commit ? `<button type="button" class="btn primary" id="bt-commit">${ICON.upload}<span>${bi('imp.commit')}</span></button>` : ''}
      ${open || b.status === 'STAGING' ? `<button type="button" class="btn danger" id="bt-cancel">${bi('imp.cancel')}</button>` : ''}</div>
    <div id="bt-out"></div></section>
    <section class="card"><h3>${bi('imp.rows')}</h3>${rowsHtml(r.data.rows)}</section>`;
  const again = () => renderBatch(view, { shell, params });
  const c = view.querySelector('#bt-commit');
  if (c) c.addEventListener('click', async (ev) => { busy(evBtn(ev), true); const done = await commitBatch(params.id, view.querySelector('#bt-out')); busy(evBtn(ev), false); if (done) setTimeout(again, 800); });
  const x = view.querySelector('#bt-cancel');
  if (x) x.addEventListener('click', async () => {
    const ok = await dialog({ title: bi('imp.cancel'), body: `<p>${bi('imp.cancel_confirm')}</p>`, actions: [{ label: bi('btn.close'), value: false }, { label: bi('imp.cancel'), kind: 'danger', value: true }] });
    if (!ok) return;
    const res = await writeOnline('import.cancel', { import_batch_id: params.id });
    if (res.ok) { toast(bi('imp.cancelled'), 'ok'); navigate('/excel', { replace: true }); } else writeFail(res);
  });
}
