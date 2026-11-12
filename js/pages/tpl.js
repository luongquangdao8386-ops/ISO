// Kho tệp mẫu · 模板库 (2e, người dùng yêu cầu 12/11/2026): bộ biểu Excel đã căn chỉnh in (mỗi sheet một mã biểu) và tệp Word / PDF mẫu.
// Mọi cấp xem và tải; tệp Excel tải về mở sẵn đúng sheet của biểu (Ctrl+P → In sheet hiện tại). Thư ký ISO / cấp 4 tải lên nhiều tệp
// một lần (app đọc tên sheet + khổ giấy, ghép sheet ↔ biểu theo mã như máy chủ), tệp cùng bộ thay tệp cũ, bỏ tệp tải nhầm (PIN).
// Chi tiết biểu có thẻ "Tệp mẫu" (itemTplCard). Tải về cần mạng (tệp nằm trên Drive riêng tư của máy chủ, qua doc.get).
import { bi, biText, esc, fmtDate, nameText, uuid, blobToB64, session, resMsg } from '../core.js';
import { ICON, toast, dialog, $, $$, setViewHtml, wireSearch } from '../ui.js';
import { items, recs, isSecretary, roleLevel, can, tplActive, tplOn, scopeNames, scopeBi, allDepts, foldVi, users, userName, inScopeDept } from '../data.js';
import { loadXlsx } from '../xlsx.js';
import { readSheets, openAtSheet, itemIndex, matchSheet, setOf, normCode } from '../tplx.js';
import { fetchDoc, openFile, fmtSize, mimeOf } from '../files.js';
import { isTouchMobile } from '../media.js';
import { writeOnline, writeWithPin, writeFail, busy } from '../form.js';
import { afterCommit } from '../app.js';
import { navigate, refresh } from '../router.js';

const TPL_EXT = ['xlsx', 'xls', 'docx', 'doc', 'pdf'];
const ACCEPT = '.xlsx,.xls,.docx,.doc,.pdf';
const extOf = (name) => String(name || '').split('.').pop().toLowerCase();
const isXlsx = (t) => /spreadsheetml/.test(t.mime_type || '') || extOf(t.file_name) === 'xlsx';

/** Khổ giấy + hướng: "A4 dọc", "A3 ngang" */
export function paperText(s) {
  if (!s || !s.p) return '';
  const p = s.p === 'OTHER' ? biText('tpl.paper_other') : s.p === 'LETTER' ? 'Letter' : s.p;
  return esc(`${p}${s.o ? ' ' + biText('tpl.o_' + s.o) : ''}`);
}
const paperTag = (s) => (s && s.p ? `<span class="tag${s.p === 'A3' ? ' t-amber' : ''}">${paperText(s)}</span>` : '');

/** Sheet ↔ biểu của các tệp đang dùng: {byItem: Map(item_id → [{t, s, sub}]), sets: [{t, rows: [{s, it, sub}]}]} */
export async function tplMap() {
  const active = await tplActive();
  const idx = itemIndex(await items());
  const byItem = new Map();
  const sets = active.map((t) => {
    const rows = (Array.isArray(t.sheets_json) ? t.sheets_json : []).map((s) => {
      const m = matchSheet(idx, s.n);
      if (m) {
        const a = byItem.get(m.it.item_id) || [];
        a.push({ t, s, sub: m.sub });
        byItem.set(m.it.item_id, a);
      }
      return { s, it: m ? m.it : null, sub: m ? m.sub : false };
    });
    return { t, rows };
  });
  // Biểu có đúng sheet trước, sheet phụ sau
  for (const a of byItem.values()) a.sort((x, y) => Number(x.sub) - Number(y.sub));
  return { byItem, sets };
}

/* ---------------- Tải tệp mẫu (mở sẵn sheet) ---------------- */

const made = new Map(); // document_id|sheet → File

async function tplFile(docId, sheet) {
  const key = docId + '|' + (sheet || '');
  if (made.has(key)) return { ok: true, file: made.get(key) };
  const r = await fetchDoc(docId);
  if (!r.ok) return r;
  let file = r.file;
  if (sheet && extOf(file.name) === 'xlsx') {
    try {
      const X = await loadXlsx();
      const bytes = openAtSheet(X, new Uint8Array(await file.arrayBuffer()), sheet);
      file = new File([bytes], file.name, { type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (e) { /* tệp lạ: trả nguyên tệp */ }
  }
  made.set(key, file);
  return { ok: true, file };
}

/** Nút tải: <button data-tpl-doc="document_id" data-sheet="tên sheet"> — lần đầu tải về, iPhone chạm lần nữa để Mở / Lưu */
export function tplButton(docId, sheet, labelKey = 'tpl.get', cls = 'btn small') {
  const ready = made.has(docId + '|' + (sheet || ''));
  return `<button type="button" class="${cls} tpl-get" data-tpl-doc="${esc(docId)}" data-sheet="${esc(sheet || '')}">${ICON.download}<span class="doc-label">${bi(ready ? 'file.open_save' : labelKey)}</span></button>`;
}

export function wireTplButtons(root) {
  $$('button[data-tpl-doc]', root).forEach((b) => b.addEventListener('click', async () => {
    const key = b.dataset.tplDoc + '|' + (b.dataset.sheet || '');
    if (made.has(key)) { openFile(made.get(key)).catch(() => {}); return; }
    if (!navigator.onLine) { toast(bi('sync.need_network'), 'err'); return; }
    b.disabled = true; b.classList.add('busy');
    const r = await tplFile(b.dataset.tplDoc, b.dataset.sheet);
    b.disabled = false; b.classList.remove('busy');
    if (!r.ok) { toast(esc(resMsg(r)), 'err'); return; }
    const lab = b.querySelector('.doc-label');
    if (lab) lab.innerHTML = bi('file.open_save');
    // Máy tính: tải xuống luôn (còn trong lượt bấm); iPhone phải chạm lần nữa để mở bảng Chia sẻ
    if (!isTouchMobile()) openFile(r.file).catch(() => {});
    else toast(bi('file.ready_tap'), 'ok');
  }));
}

/* ---------------- Thẻ "Tệp mẫu" ở chi tiết biểu ---------------- */

export async function itemTplCard(it) {
  if (!it || !(await tplOn())) return '';
  const { byItem } = await tplMap();
  const list = byItem.get(it.item_id) || [];
  const sec = isSecretary();
  const xl = list.some((x) => isXlsx(x.t));
  return `<section class="card tpl-card" id="item-tpl"><div class="card-head"><h3>${bi('tpl.item_title')}</h3><a class="small" href="#/templates">${bi('nav.templates')} ›</a></div>
    ${list.length ? `<ul class="tpl-rows">${list.map((x) => `<li class="tpl-row"><div class="tpl-main"><span class="code">${esc(x.s.n)}</span> ${paperTag(x.s)}${x.sub ? ` <span class="tag">${esc(biText('tpl.sub'))}</span>` : ''}
        <div class="muted small">${esc(x.t.file_name)}${x.t.set_code ? ' · ' + esc(x.t.set_code) : ''}</div></div>
        ${tplButton(x.t.document_id, isXlsx(x.t) ? x.s.n : '', 'tpl.get_form')}</li>`).join('')}</ul>
      ${xl ? `<p class="muted small">${bi('tpl.print_hint')}</p>` : ''}`
    : `<p class="muted small">${bi('tpl.item_none')}</p>${sec && await can('tpl.upload') ? `<a class="btn small" href="#/templates/upload">${ICON.upload}<span>${bi('tpl.upload')}</span></a>` : ''}`}
  </section>`;
}

/* ---------------- Màn Kho tệp mẫu ---------------- */

const state = { q: '' };

export async function renderTemplates(view, ctx) {
  const { shell } = ctx;
  if (ctx.entered) state.q = '';
  const sec = isSecretary();
  const canUp = sec && await can('tpl.upload');
  shell.setScreen({
    title: 'nav.templates', back: '/',
    actions: canUp ? [{ icon: 'upload', label: biText('tpl.upload'), id: 'tpl-up', onClick: () => navigate('/templates/upload') }] : []
  });
  // Thư ký ISO mà máy chủ chưa lên 2e (chưa có tpl.upload, chưa có tệp nào): báo cập nhật máy chủ; người khác thấy "chưa có tệp mẫu"
  if (sec && !canUp && !(await tplOn())) {
    view.innerHTML = `<div class="card empty-state">${ICON.folder}<p class="muted">${bi('tpl.server_old')}</p></div>`;
    return;
  }
  const { sets } = await tplMap();
  const all = (await items()).filter((x) => x.status !== 'NA');
  const um = await users();
  const scope = await scopeNames();
  const mgr = sec || roleLevel() >= 3;
  const old = mgr ? (await recs('TPL')).filter((t) => t.state === 'REPLACED' && !t.archived_at).sort((a, b) => String(b.replaced_at).localeCompare(String(a.replaced_at))) : [];
  const covered = new Set();
  sets.forEach((x) => x.rows.forEach((r) => { if (r.it) covered.add(r.it.item_id); }));
  const missing = all.filter((x) => !covered.has(x.item_id));
  const nSheets = sets.reduce((n, x) => n + x.rows.length, 0);

  const sheetRow = (t, r, showFile = false) => `<li class="tpl-sheet${r.it ? '' : ' muted'}"><div class="tpl-main"><span class="code">${esc(r.s.n)}</span> ${paperTag(r.s)}${r.sub ? ` <span class="tag">${esc(biText('tpl.sub'))}</span>` : ''}${r.s.h ? ` <span class="tag">${esc(biText('tpl.hidden'))}</span>` : ''}
      ${r.it ? `<a class="tpl-it small" href="#/item/${encodeURIComponent(r.it.item_id)}">${r.sub ? `${esc(r.it.code)} · ` : ''}${esc(nameText(r.it))}</a>` : `<div class="muted small">${bi('tpl.no_item')}</div>`}${showFile ? `<div class="muted small">${esc(t.file_name)}</div>` : ''}</div>
    ${isXlsx(t) && !r.s.h ? tplButton(t.document_id, r.s.n, 'tpl.get_sheet', 'btn tiny') : ''}</li>`;

  const draw = () => {
    const words = foldVi(state.q.trim()).split(/\s+/).filter(Boolean);
    const qn = normCode(state.q.trim());
    const hit = (t, r) => {
      if (!words.length) return true;
      const hay = foldVi([r.s.n, r.it ? r.it.code : '', r.it ? r.it.name_vi : '', r.it ? r.it.name_zh : '', t.title_vi, t.title_zh, t.file_name].join(' '));
      return words.every((w) => hay.includes(w)) || (qn.length >= 4 && normCode(r.s.n).includes(qn));
    };
    let body;
    if (!sets.length) {
      body = `<div class="card empty-state">${ICON.folder}<p class="muted">${bi(canUp ? 'tpl.empty_sec' : 'tpl.empty')}</p>${canUp ? `<a class="btn primary" href="#/templates/upload">${ICON.upload}<span>${bi('tpl.upload')}</span></a>` : ''}</div>`;
    } else if (words.length) {
      const found = [];
      sets.forEach(({ t, rows }) => rows.forEach((r) => { if (hit(t, r)) found.push({ t, r }); }));
      body = found.length ? `<section class="card"><p class="muted small">${bi('tpl.found_n', { N: found.length })}</p><ul class="tpl-sheets">${found.slice(0, 200).map(({ t, r }) => sheetRow(t, r, true)).join('')}</ul></section>`
        : `<div class="card empty-state"><p class="muted">${bi('tpl.none_found')}</p></div>`;
    } else {
      body = sets.map(({ t, rows }) => {
        const a4 = rows.filter((r) => r.s.p === 'A4').length, a3 = rows.filter((r) => r.s.p === 'A3').length;
        const forms = new Set(rows.filter((r) => r.it).map((r) => r.it.item_id)).size;
        return `<section class="card tpl-set" data-set="${esc(t.tpl_id)}">
          <div class="rec-top"><span class="code">${esc(t.set_code || extOf(t.file_name).toUpperCase())}</span><span class="muted small">${rows.length ? bi('tpl.sheets_n', { N: rows.length }) + (a4 ? ' · A4 ' + a4 : '') + (a3 ? ' · A3 ' + a3 : '') : ''}</span></div>
          <div class="rec-name">${esc(t.title_vi || t.file_name)}</div>${t.title_zh ? `<div class="muted small zh">${esc(t.title_zh)}</div>` : ''}
          <div class="muted small">${esc(t.file_name)} · ${esc(fmtSize(t.size_bytes))} · ${bi('tpl.uploaded', { D: esc(fmtDate(t.uploaded_at)), U: esc(userName(um, t.uploaded_by)) })}${rows.length ? ' · ' + bi('tpl.forms_n', { N: forms }) : ''}</div>
          ${t.note ? `<p class="small">${esc(t.note)}</p>` : ''}
          <div class="row tpl-acts">${tplButton(t.document_id, '', 'tpl.get_all', 'btn small primary')}
            ${sec ? `<button type="button" class="btn small" data-edit="${esc(t.tpl_id)}">${ICON.edit}<span>${bi('tpl.edit')}</span></button><button type="button" class="btn small danger" data-del="${esc(t.tpl_id)}">${ICON.x}<span>${bi('tpl.delete')}</span></button>` : ''}</div>
          ${rows.length ? `<details class="tpl-det"><summary>${bi('tpl.sheet_list', { N: rows.length })}</summary><ul class="tpl-sheets">${rows.map((r) => sheetRow(t, r)).join('')}</ul></details>` : ''}
        </section>`;
      }).join('');
    }
    const miss = sets.length && missing.length && (sec || roleLevel() >= 2) ? `<details class="card tpl-miss"><summary>${bi('tpl.missing_n', { N: missing.length })}</summary><ul class="cat-list">${missing.slice(0, 300).map((x) => `<li><a class="cat-row" href="#/item/${encodeURIComponent(x.item_id)}"><span class="cat-top"><span class="code">${esc(x.code)}</span></span><span class="cat-name">${esc(nameText(x))}</span>${ICON.chevron}</a></li>`).join('')}</ul></details>` : '';
    const olds = old.length ? `<details class="card tpl-old"><summary>${bi('tpl.old_n', { N: old.length })}</summary><ul class="tpl-sheets">${old.map((t) => `<li class="tpl-sheet"><div class="tpl-main"><span class="code">${esc(t.set_code || '')}</span> <span class="small">${esc(t.file_name)}</span><div class="muted small">${bi('tpl.uploaded', { D: esc(fmtDate(t.uploaded_at)), U: esc(userName(um, t.uploaded_by)) })} · ${bi('tpl.replaced_at', { D: esc(fmtDate(t.replaced_at)) })}</div></div>${tplButton(t.document_id, '', 'tpl.get_all', 'btn tiny')}</li>`).join('')}</ul></details>` : '';
    setViewHtml(view, `<div class="tpl">
      <p class="muted small">${bi('tpl.what')}${scope ? ' ' + scopeBi('tpl.scope', scope) : ''}</p>
      ${sets.length ? `<div class="search-row"><div class="field search">${ICON.search}<input id="tpl-q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="${esc(biText('tpl.search_ph'))}" value="${esc(state.q)}"></div></div>
      <div class="cat-sum muted small">${bi('tpl.summary', { F: sets.length, S: nSheets, C: covered.size, T: all.length })}</div>` : ''}
      ${body}${miss}${olds}</div>`);
    wire();
  };
  const wire = () => {
    wireSearch(view, '#tpl-q', (v) => { state.q = v; }, draw);
    wireTplButtons(view);
    $$('[data-del]', view).forEach((b) => b.addEventListener('click', () => delTpl(b.dataset.del)));
    $$('[data-edit]', view).forEach((b) => b.addEventListener('click', () => editTpl(b.dataset.edit)));
  };
  draw();
}

async function delTpl(id) {
  const t = (await recs('TPL')).find((x) => x.tpl_id === id);
  if (!t) return;
  if (!navigator.onLine) { toast(bi('sync.need_network'), 'err'); return; }
  const reason = await dialog({
    title: bi('tpl.delete'),
    body: `<p>${bi('tpl.delete_q', { F: esc(t.file_name) })}</p><p class="muted small">${bi('tpl.delete_note')}</p><label class="fld"><span>${bi('field.reason')} <span class="req">*</span></span><textarea class="inp" rows="2" maxlength="300" id="tpl-reason"></textarea></label>`,
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('tpl.delete'), kind: 'danger', read: (w) => $('#tpl-reason', w).value.trim() }]
  });
  if (reason === null || reason === undefined) return;
  if (!reason) { toast(bi('tpl.reason_req'), 'err'); return; }
  const r = await writeWithPin('tpl.delete', { tpl_id: id, reason }, { expected_version: t.record_version });
  if (!r.ok) { writeFail(r); return; }
  await afterCommit();
  toast(bi(r.data && r.data.restored ? 'tpl.deleted_restored' : 'tpl.deleted'), 'ok');
  refresh();
}

async function editTpl(id) {
  const t = (await recs('TPL')).find((x) => x.tpl_id === id);
  if (!t) return;
  const v = await dialog({
    title: bi('tpl.edit'),
    body: `<label class="fld"><span>${bi('tpl.title_vi')}</span><input class="inp" id="tp-vi" maxlength="200" value="${esc(t.title_vi || '')}"></label>
      <label class="fld"><span>${bi('tpl.title_zh')}</span><input class="inp" id="tp-zh" maxlength="200" value="${esc(t.title_zh || '')}"></label>
      <label class="fld"><span>${bi('item.note')}</span><textarea class="inp" id="tp-note" rows="2" maxlength="300">${esc(t.note || '')}</textarea></label>`,
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('btn.save'), kind: 'primary', read: (w) => ({ title_vi: $('#tp-vi', w).value.trim(), title_zh: $('#tp-zh', w).value.trim(), note: $('#tp-note', w).value.trim() }) }]
  });
  if (!v) return;
  if (!navigator.onLine) { toast(bi('sync.need_network'), 'err'); return; }
  const r = await writeOnline('tpl.edit', { tpl_id: id, ...v }, { expected_version: t.record_version });
  if (!r.ok) { writeFail(r); return; }
  await afterCommit();
  toast(bi('tpl.saved'), 'ok');
  refresh();
}

/* ---------------- Tải tệp mẫu lên (Thư ký ISO, cấp 4) ---------------- */

/** Đọc một tệp chọn: {file, ext, sheets, set, err, forms, replaces} */
async function inspect(file, ctx) {
  const ext = extOf(file.name);
  const out = { file, ext, sheets: [], set: null, err: '', forms: 0, replaces: null };
  if (!TPL_EXT.includes(ext)) { out.err = 'tpl.err_type'; return out; }
  const st = session.settings || {};
  const max = isTouchMobile() ? Number(st.doc_mobile_upload_max_bytes || 5242880) : Number(st.doc_max_bytes || 10485760);
  if (!file.size) { out.err = 'file.empty'; return out; }
  if (file.size > max) { out.err = isTouchMobile() ? 'file.too_big_mobile' : 'file.too_big'; return out; }
  if (ext === 'xlsx') {
    try {
      const X = await loadXlsx();
      out.sheets = readSheets(X, new Uint8Array(await file.arrayBuffer()));
    } catch (e) { out.err = 'tpl.err_read'; return out; }
  }
  out.set = setOf(out.sheets, file.name, ctx.deptCodes);
  if (out.set && !inScopeDept(out.set.dept_code)) { out.err = 'tpl.err_scope'; return out; }
  out.forms = new Set(out.sheets.map((s) => matchSheet(ctx.idx, s.n)).filter(Boolean).map((m) => m.it.item_id)).size;
  out.replaces = ctx.active.find((t) => (out.set ? t.set_code === out.set.set_code : !t.set_code && String(t.file_name).toLowerCase() === file.name.toLowerCase())) || null;
  return out;
}

export async function renderTplUpload(view, { shell }) {
  shell.setScreen({ title: 'tpl.upload', back: '/templates' });
  if (!isSecretary() || !(await can('tpl.upload'))) { view.innerHTML = `<div class="card"><p class="banner warn">${bi(await can('tpl.upload') || !isSecretary() ? 'tpl.only_sec' : 'tpl.server_old')}</p></div>`; return; }
  const ctx = { deptCodes: (await allDepts()).map((d) => d.dept_code), idx: itemIndex(await items()), active: await tplActive() };
  let picked = [];
  let running = false;
  const st = (x) => x.done ? `<span class="t-green-text">${bi('tpl.up_done')}</span>` : x.fail ? `<span class="t-red-text">${esc(x.fail)}</span>` : x.err ? `<span class="t-red-text">${bi(x.err)}</span>` : x.busy ? `<span class="muted">${bi('tpl.up_busy')}</span>` : '';
  const draw = () => {
    const ok = picked.filter((x) => !x.err && !x.done);
    view.innerHTML = `<div class="tpl-up">
      <section class="card"><p>${bi('tpl.up_what')}</p><p class="muted small">${bi('tpl.up_note')}</p>
        <label class="btn primary file-btn">${ICON.upload}<span>${bi('tpl.pick')}</span><input type="file" id="tpl-files" multiple accept="${ACCEPT}" hidden></label></section>
      ${picked.length ? `<section class="card"><h3>${bi('tpl.preview_n', { N: picked.length })}</h3><ul class="tpl-sheets">${picked.map((x, i) => `<li class="tpl-sheet" data-i="${i}"><div class="tpl-main">
          <span class="code">${esc(x.set ? x.set.set_code : x.ext.toUpperCase())}</span> <span class="small">${esc(x.file.name)}</span>
          <div class="muted small">${esc(fmtSize(x.file.size))}${x.sheets.length ? ' · ' + bi('tpl.sheets_n', { N: x.sheets.length }) + ' · ' + bi('tpl.forms_n', { N: x.forms }) : ''}${x.replaces ? ' · ' + bi('tpl.replaces', { F: esc(x.replaces.file_name) }) : ''}</div>
          <div class="small">${st(x)}</div></div></li>`).join('')}</ul>
        <div class="row"><button type="button" class="btn primary" id="tpl-go" ${ok.length && !running ? '' : 'disabled'}>${ICON.upload}<span>${bi('tpl.up_go', { N: ok.length })}</span></button>
          ${picked.some((x) => x.done) && !running ? `<a class="btn" href="#/templates">${bi('nav.templates')} ›</a>` : ''}</div></section>` : ''}
    </div>`;
    $('#tpl-files', view).addEventListener('change', async (e) => {
      const files = [...e.target.files];
      if (!files.length) return;
      picked = [];
      for (const f of files) picked.push(await inspect(f, ctx));
      draw();
    });
    const go = $('#tpl-go', view);
    if (go) go.addEventListener('click', async () => {
      if (!navigator.onLine) { toast(bi('sync.need_network'), 'err'); return; }
      running = true;
      busy(go, true);
      let n = 0;
      for (const x of picked) {
        if (x.err || x.done) continue;
        x.busy = true; draw();
        const r = await writeOnline('tpl.upload', {
          tpl_id: uuid(), document_id: uuid(), file_name: x.file.name, mime_type: mimeOf(x.file), content_b64: await blobToB64(x.file),
          sheets: x.ext === 'xlsx' ? x.sheets : undefined
        }, { expected_version: 0, timeoutMs: 180000 });
        x.busy = false;
        if (r.ok) { x.done = true; n++; } else x.fail = resMsg(r);
      }
      running = false;
      if (n) { await afterCommit(); toast(bi('tpl.up_ok', { N: n }), 'ok'); }
      ctx.active = await tplActive();
      draw();
    });
  };
  draw();
}
