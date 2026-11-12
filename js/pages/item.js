// Chi tiết biểu / tài liệu: mục đích, tần suất, Lập → Duyệt, thời gian lưu, điều khoản ISO, chủ đề BRCGS, lần ban hành, hạn rà soát,
// nơi làm, biểu liên quan (1a); phiên bản hiện hành (xem PDF, tải tệp gốc), bản đang soạn, lịch sử phiên bản, Soạn phiên bản mới,
// gắn tệp cho biểu ● nhập từ Excel, đặt Không áp dụng ✕ / dùng lại, Đã rà soát (1b); hồ sơ 12 kỳ gần nhất, Nộp hồ sơ, mở từ tem QR
// (…/#/f/<mã>?r=<lần>): tem của bản đã lỗi thời báo đỏ (1c). Phiên 2d: phiếu đề nghị sửa đổi / hủy của tài liệu, bản in đang phát và
// cần thu hồi, In tem QR (/labels?item=); đặt ✕ theo phiếu hủy đã chấp thuận; thêm tài liệu mới theo phiếu (/item/new?req=).
// Sửa thông tin (Thư ký ISO, cấp 4): /item/:id/edit, thêm mới /item/new.
import { bi, biText, esc, fmtDate, nameText, uuid, badge, session } from '../core.js';
import { ICON, toast, dialog, $ } from '../ui.js';
import { byId, items, recs, depts, isSecretary, users, userName, groupText, KINDS, WHERES, versionsOf, canCreateVersion, reviewSoon, daysBetween, today, VERSION_OPEN, can } from '../data.js';
import { navigate, refresh } from '../router.js';
import { afterCommit } from '../app.js';
import { textInput, textArea, selectInput, numberInput, bilingualInputs, wireForm, readField, showErrors, writeOnline, writeWithPin, writeFail, busy, assistedFields } from '../form.js';
import { docButton, wireDocButtons } from '../files.js';
import { statusDot } from './catalog.js';
import { versionRow, vBadge } from './version.js';
import { itemRecordsCard, wireItemRecords } from './records.js';
import { canSubmitRecord, recordCheck } from '../data.js';
import { itemRequestsCard, approvedCancelFor } from './docreq.js';
import { itemDistCard } from './dist.js';
import { itemTplCard, wireTplButtons } from './tpl.js';

const PERIOD_OF = (d) => {
  if (d === null || d === undefined || d === '') return 'EVENT';
  const n = Number(d);
  return n <= 1 ? 'DAY' : n <= 7 ? 'WEEK' : n <= 31 ? 'MONTH' : n <= 92 ? 'QUARTER' : n <= 183 ? 'HALF' : 'YEAR';
};

const row = (labelKey, value) => (value ? `<div class="kv"><span>${bi(labelKey)}</span><strong>${value}</strong></div>` : '');
const lines = (s) => esc(s || '').replace(/\n/g, '<br>');
const pair = (vi, zh) => (vi || zh ? `${vi ? `<span class="vi">${esc(vi)}</span>` : ''}${vi && zh ? '<br>' : ''}${zh ? `<span class="zh muted">${esc(zh)}</span>` : ''}` : '');

export async function renderItem(view, { shell, params, query }) {
  const it = await byId('ITEM', params.id);
  const sec = isSecretary();
  shell.setScreen({
    title: ['Chi tiết biểu', '表单详情'], back: '/catalog',
    actions: it && sec ? [{ icon: 'edit', label: biText('btn.edit'), id: 'it-edit', onClick: () => navigate('/item/' + encodeURIComponent(it.item_id) + '/edit') }] : []
  });
  if (!it) { view.innerHTML = `<div class="card empty-state">${ICON.library}<p class="muted">${bi('item.not_found')}</p><a class="btn" href="#/catalog">${bi('nav.catalog')}</a></div>`; return; }
  const dep = (await depts()).find((d) => d.dept_code === it.dept_code);
  const grp = (await recs('GROUP')).find((g) => g.group_key === it.group_key);
  const um = await users();
  const rel = (await items()).filter((x) => x.group_key === it.group_key && x.item_id !== it.item_id);
  // Tem quét (…/#/f/<mã>?r=<lần>): lần trên tem khác lần đang hiệu lực → bản in đã lỗi thời (báo đỏ); biểu ✕ → đã ngừng dùng;
  // biểu chưa ban hành (○ ◐) mà tem có lần → chưa có bản hiện hành. Biểu ● nhập từ Excel không ghi lần coi như lần 01.
  const scanned = query && query.r ? String(query.r) : '';
  const curRev = it.current_rev || (it.status === 'ISSUED' ? '01' : '');
  const norm = (x) => String(x || '').replace(/^0+(?=\d)/, '').padStart(2, '0');
  const scanState = !scanned ? '' : it.status === 'NA' ? 'na' : !curRev ? 'none' : norm(scanned) !== norm(curRev) ? 'stale' : 'ok';
  const canRec = canSubmitRecord(it) && !recordCheck(it) && await can('record.submit');
  const iso = [['ISO 9001', it.iso9001], ['ISO 14001', it.iso14001], ['ISO 45001', it.iso45001], ['ISO 50001', it.iso50001]].filter((x) => x[1]);
  const vers = await versionsOf(it.item_id);
  const curV = vers.find((v) => v.version_id === it.current_version_id) || null;
  const openV = vers.find((v) => VERSION_OPEN.has(v.state)) || null;
  const hist = vers.filter((v) => v !== curV && v !== openV);
  // Máy chủ chưa lên bản 1b (chưa có version.*): không hiện nút phiên bản
  const vOn = await can('version.save');
  const canNew = vOn && !openV && canCreateVersion(it, 'REVISION');
  const canAttach = vOn && !openV && it.status === 'ISSUED' && it.file_missing && canCreateVersion(it, 'ATTACH');
  const manage = sec && await can('item.setNa');
  const t = today();
  const dueDays = it.review_due ? daysBetween(t, it.review_due) : null;
  const dueHtml = it.review_due ? esc(fmtDate(it.review_due)) + (it.status === 'ISSUED' && reviewSoon(it, t)
    ? ` <span class="badge ${dueDays < 0 ? 't-red' : 't-amber'}">${bi(dueDays < 0 ? 'item.review_over' : 'item.review_in', { N: Math.abs(dueDays) })}</span>` : '') : '—';
  view.innerHTML = `<div class="item">
    ${scanState ? `<div class="banner ${scanState === 'ok' ? 'ok' : scanState === 'none' ? 'warn' : 'err'} scan-banner"><p>${scanState === 'stale' ? bi('item.stale', { R: esc(scanned), C: esc(curRev) })
      : scanState === 'na' ? bi('item.scan_na') : scanState === 'none' ? bi('item.scan_none', { R: esc(scanned) }) : bi('item.current', { R: esc(curRev) })}</p>
      ${canRec && scanState !== 'na' ? `<a class="btn small primary" href="#/record/new?item=${encodeURIComponent(it.item_id)}">${ICON.upload}<span>${bi('item.submit_record')}</span></a>` : ''}</div>` : ''}
    <section class="card item-head">
      <div class="rec-top"><span class="code big">${esc(it.code)}</span>${statusDot(it.status)} ${badge('status.' + (it.status || 'NONE'))}</div>
      <h2 class="item-name">${pair(it.name_vi, it.name_zh)}</h2>
      <div class="rec-badges">${badge('kind.' + (it.kind || 'FORM'))} ${badge('level_doc.' + (it.level || 'DEPT'))}${it.priority ? ' ' + badge('cat.prio_n', { N: it.priority }) : ''}${it.status === 'ISSUED' && it.file_missing ? ' ' + badge('cat.no_file') : ''}</div>
      ${it.status === 'ISSUED' && it.file_missing ? `<p class="banner warn small">${bi(sec ? 'item.no_file_sec' : 'item.no_file_note')}</p>` : ''}
      ${it.status === 'NA' && it.na_reason ? `<p class="banner small">${bi('item.na_reason')}: ${esc(it.na_reason)}</p>` : ''}
    </section>
    <section class="card"><h3>${bi('item.info')}</h3>
      ${row('item.purpose', pair(it.purpose_vi, it.purpose_zh))}
      ${row('cat.dept', esc(dep ? nameText(dep) : it.dept_code))}
      ${row('cat.group', esc(groupText(grp, it.group_key)))}
      ${row('item.freq', pair(it.freq_vi, it.freq_zh))}
      ${row('item.period', bi('period.' + PERIOD_OF(it.period_days)) + (it.period_days ? ` <span class="muted small">(${esc(it.period_days)} ${bi('item.days')})</span>` : ''))}
      ${row('item.flow', lines(it.flow))}
      ${row('item.keep', lines(it.keep))}
      ${row('cat.where', it.where ? bi('where.' + it.where) : '')}
      ${row('item.where_note', lines(it.where_note))}
      ${row('item.law', lines(it.law))}
      ${row('item.cls', lines(it.cls))}
      ${row('item.owner', esc(userName(um, it.owner_user_id)))}
      ${row('item.note', lines(it.note))}
    </section>
    <section class="card"><h3>${bi('item.standards')}</h3>
      ${iso.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><strong class="code">${esc(v)}</strong></div>`).join('') || `<p class="muted small">${bi('item.no_clause')}</p>`}
      ${row('item.brc', lines(it.brc_topics))}
    </section>
    <section class="card"><h3>${bi('item.issue')}</h3>
      ${row('cat.rev', esc(it.current_rev || '—'))}
      ${row('item.issued_at', esc(fmtDate(it.issued_at) || '—'))}
      ${row('item.review_due', dueHtml)}
      ${it.reviewed_at ? row('item.reviewed', `${esc(userName(um, it.reviewed_by))} <span class="muted small">${esc(fmtDate(it.reviewed_at))}</span>`) : ''}
      ${row('item.qr', `<span class="code small">${esc(it.qr_key || '')}</span>`)}
    </section>
    <section class="card ver-card"><h3>${bi('item.versions')}</h3>
      ${curV ? `<div class="ver-cur"><div class="rec-top"><strong>${bi('ver.current_n', { N: esc(curV.rev) })}</strong>${vBadge(curV)}</div>
          <div class="muted small">${bi('item.issued_at')}: ${esc(fmtDate(curV.issued_at))}${curV.effective_date && curV.effective_date !== curV.issued_at ? ` · ${bi('ver.effective')}: ${esc(fmtDate(curV.effective_date))}` : ''}</div>
          ${curV.change_summary_vi || curV.change_summary_zh ? `<p class="small">${esc(curV.change_summary_vi || curV.change_summary_zh)}</p>` : ''}
          <div class="row doc-row">${docButton(curV.pdf_doc_id, 'PDF', curV.pdf_file_name, curV.pdf_size)}${docButton(curV.source_doc_id, 'SOURCE', curV.source_file_name, curV.source_size)}</div>
          <a class="small" href="#/version/${encodeURIComponent(curV.version_id)}">${bi('ver.details')} ›</a></div>`
        : `<p class="muted small">${bi(it.status === 'ISSUED' ? 'ver.no_current_file' : 'ver.no_current')}</p>`}
      ${openV ? `<p class="lbl">${bi('ver.open')}</p><ul class="cat-list">${versionRow(openV, it, { um })}</ul>` : ''}
      ${hist.length ? `<details class="ver-hist"><summary>${bi('ver.history_n', { N: hist.length })}</summary><ul class="cat-list">${hist.map((v) => versionRow(v, it, { um })).join('')}</ul></details>` : ''}
      ${await can('report.run') ? `<a class="small rp-link" href="#/reports?kind=VERSIONS&item=${encodeURIComponent(it.item_id)}">${ICON.reports} ${bi('rp.version_report')} ›</a>` : ''}
    </section>
    ${await itemTplCard(it)}
    ${await itemRecordsCard(it)}
    ${await itemRequestsCard(it)}
    ${await itemDistCard(it)}
    <div class="row item-actions">
      ${canAttach ? `<a class="btn primary" href="#/version/new/${encodeURIComponent(it.item_id)}?attach=1">${ICON.upload}<span>${bi('ver.attach_btn')}</span></a>` : ''}
      ${canNew ? `<a class="btn${canAttach ? '' : ' primary'}" href="#/version/new/${encodeURIComponent(it.item_id)}">${ICON.edit}<span>${bi('item.new_version')}</span></a>` : ''}
      ${openV ? `<a class="btn primary" href="#/version/${encodeURIComponent(openV.version_id)}">${ICON.edit}<span>${bi('ver.open_it')}</span></a>` : ''}
      ${canRec ? `<a class="btn" href="#/record/new?item=${encodeURIComponent(it.item_id)}">${ICON.upload}<span>${bi('item.submit_record')}</span></a>` : ''}
      ${it.status === 'ISSUED' && (sec || Number(session.user && session.user.role_level) >= 2) ? `<a class="btn" href="#/labels?item=${encodeURIComponent(it.item_id)}">${ICON.qr}<span>${bi('item.qr_label')}</span></a>` : ''}
    </div>
    ${manage ? `<section class="card"><h3>${bi('item.manage')}</h3><div class="row">
      ${it.status === 'ISSUED' ? `<button type="button" class="btn small" id="it-review">${ICON.check}<span>${bi('item.review_btn')}</span></button>` : ''}
      ${it.status === 'NA' ? `<button type="button" class="btn small" id="it-unna">${ICON.refresh}<span>${bi('item.unna_btn')}</span></button>`
        : `<button type="button" class="btn small danger" id="it-na" ${openV ? 'disabled' : ''}>${ICON.x}<span>${bi('item.na_btn')}</span></button>`}
      </div>${openV && it.status !== 'NA' ? `<p class="muted small">${bi('item.na_open')}</p>` : ''}<p class="muted small">${bi('item.manage_note')}</p></section>` : ''}
    ${rel.length ? `<section class="card"><h3>${bi('item.related')}</h3><ul class="cat-list">${rel.slice(0, 30).map((x) => `<li><a class="cat-row" href="#/item/${encodeURIComponent(x.item_id)}"><span class="cat-top"><span class="code">${esc(x.code)}</span>${statusDot(x.status)}</span><span class="cat-name">${esc(x.name_vi || x.name_zh)}</span>${ICON.chevron}</a></li>`).join('')}</ul></section>` : ''}
  </div>`;
  wireDocButtons(view);
  wireTplButtons(view);
  await wireItemRecords(view, it);
  const again = async (key) => { await afterCommit(); toast(bi(key), 'ok'); refresh(); };
  const on = (id, fn) => { const b = $('#' + id, view); if (b) b.addEventListener('click', async () => { if (!navigator.onLine) { toast(bi('sync.need_network'), 'err'); return; } busy(b, true); try { await fn(); } finally { busy(b, false); } }); };
  on('it-na', async () => {
    const rq = await approvedCancelFor(it.item_id);
    const reason = await dialog({
      title: bi('item.na_btn'),
      body: `<p class="muted small">${bi('item.na_note')}</p>${rq ? `<p class="banner info small">${bi('dr.na_by_req', { C: esc(rq.code) })}</p>` : ''}<label class="fld"><span>${bi('field.reason')}${rq ? '' : ' <span class="req">*</span>'}</span><textarea class="inp" rows="3" maxlength="300" id="na-reason"></textarea></label>`,
      actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('item.na_btn'), kind: 'danger', read: (w) => $('#na-reason', w).value.trim() }]
    });
    if (reason === null || reason === undefined) return;
    if (!reason && !rq) { toast(bi('field.required'), 'err'); return; }
    const r = await writeWithPin('item.setNa', { item_id: it.item_id, na: true, reason, ...(rq ? { request_id: rq.request_id } : {}) }, { expected_version: it.record_version });
    if (r.ok) return again('item.na_done');
    writeFail(r);
  });
  on('it-unna', async () => {
    const r = await writeWithPin('item.setNa', { item_id: it.item_id, na: false }, { expected_version: it.record_version });
    if (r.ok) return again('item.unna_done');
    writeFail(r);
  });
  on('it-review', async () => {
    const note = await dialog({
      title: bi('item.review_btn'),
      body: `<p class="muted small">${bi('item.review_note')}</p><label class="fld"><span>${bi('item.note')}</span><textarea class="inp" rows="2" maxlength="300" id="rv-note"></textarea></label>`,
      actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('item.review_btn'), kind: 'primary', read: (w) => $('#rv-note', w).value.trim() }]
    });
    if (note === null || note === undefined) return;
    const r = await writeWithPin('item.review', { item_id: it.item_id, note }, { expected_version: it.record_version });
    if (r.ok) return again('item.review_done');
    writeFail(r);
  });
}

/* ---------------- Thêm / sửa thông tin biểu (Thư ký ISO, cấp 4) ---------------- */

export async function renderItemForm(view, { shell, params, query }) {
  const isNew = !params.id;
  const it = isNew ? null : await byId('ITEM', params.id);
  // Thêm tài liệu mới theo phiếu đề nghị ban hành mới đã chấp thuận (2d): điền sẵn mã, bộ phận, tên, loại
  const rq = isNew && query && query.req ? await byId('DOCREQ', query.req) : null;
  const fromReq = rq && rq.state === 'APPROVED' && rq.req_type === 'NEW' && !rq.item_id ? rq : null;
  const back = isNew ? '/catalog' : '/item/' + encodeURIComponent(params.id);
  shell.setScreen({ title: isNew ? 'cat.add' : ['Sửa thông tin biểu', '编辑表单信息'], back });
  if (!isSecretary()) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('err.forbidden')}</p></div>`; return; }
  if (!isNew && !it) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('item.not_found')}</p></div>`; return; }
  if (!navigator.onLine) { view.innerHTML = `<div class="card empty-state">${ICON.sync}<p class="muted">${bi('sync.need_network')}</p></div>`; return; }
  const deps = (await depts()).filter((d) => d.active !== false);
  const groups = (await recs('GROUP')).slice().sort((a, b) => String(a.group_key).localeCompare(String(b.group_key)));
  const um = await users();
  const r = it || (fromReq ? { kind: fromReq.new_kind || 'FORM', level: fromReq.level || 'DEPT', where: 'MANUAL', dept_code: fromReq.dept_code, name_vi: fromReq.title_vi, name_zh: fromReq.title_zh, code: fromReq.new_code }
    : { kind: 'FORM', level: 'DEPT', where: 'MANUAL' });
  const grpOpts = (dept) => groups.filter((g) => !dept || g.dept_code === dept).map((g) => [g.group_key, esc(g.group_key + ' · ' + groupText(g))]);
  view.innerHTML = `<form class="card form item-form" novalidate>
    ${fromReq ? `<p class="banner info small">${bi('dr.add_item_note', { C: esc(fromReq.code) })}</p>` : ''}
    ${isNew ? textInput('code', 'cat.code', r.code || '', { required: true, maxlength: 40, upper: true, placeholder: 'BM-ISO-02-05', hint: biText('item.code_hint') }) : `<div class="kv"><span>${bi('cat.code')}</span><strong class="code">${esc(it.code)}</strong></div>`}
    <div class="form-grid">
      ${selectInput('kind', 'cat.kind', KINDS.map((k) => [k, bi('kind.' + k)]), r.kind, { empty: '' })}
      ${selectInput('level', 'item.level', ['DEPT', 'COMPANY'].map((k) => [k, bi('level_doc.' + k)]), r.level, { empty: '' })}
      ${selectInput('dept_code', 'cat.dept', deps.map((d) => [d.dept_code, esc(nameText(d))]), r.dept_code, { required: true })}
      ${selectInput('group_key', 'cat.group', grpOpts(r.dept_code), r.group_key, { empty: 'item.group_auto' })}
    </div>
    ${bilingualInputs('name', r, { labelKey: 'cat.name', suggest: 'name' })}
    ${bilingualInputs('purpose', r, { labelKey: 'item.purpose', required: false, area: true, maxlength: 1000 })}
    ${bilingualInputs('freq', r, { labelKey: 'item.freq', required: false })}
    <div class="form-grid">
      ${numberInput('period_days', 'item.period_days', r.period_days, { integer: true, hint: biText('item.period_hint') })}
      ${selectInput('priority', 'cat.priority', ['1', '2', '3'].map((k) => [k, bi('cat.prio_n', { N: k })]), r.priority || '', { empty: 'cat.prio_none' })}
      ${selectInput('where', 'cat.where', WHERES.map((k) => [k, bi('where.' + k)]), r.where || 'MANUAL', { empty: '' })}
      ${selectInput('owner_user_id', 'item.owner', [...um.values()].filter((u) => u.active !== false).map((u) => [u.user_id, esc(u.employee_code + ' · ' + u.display_name)]), r.owner_user_id || '')}
    </div>
    ${textInput('where_note', 'item.where_note', r.where_note, { maxlength: 300 })}
    <div class="form-grid">
      ${textInput('iso9001', 'item.iso9001', r.iso9001, { maxlength: 200, placeholder: '7.5.3; 8.5.2' })}
      ${textInput('iso14001', 'item.iso14001', r.iso14001, { maxlength: 200 })}
      ${textInput('iso45001', 'item.iso45001', r.iso45001, { maxlength: 200 })}
      ${textInput('iso50001', 'item.iso50001', r.iso50001, { maxlength: 200 })}
    </div>
    ${textArea('brc_topics', 'item.brc', r.brc_topics, { rows: 2 })}
    ${textArea('flow', 'item.flow', r.flow, { rows: 2 })}
    ${textArea('keep', 'item.keep', r.keep, { rows: 2 })}
    ${textArea('law', 'item.law', r.law, { rows: 2 })}
    ${textInput('cls', 'item.cls', r.cls, { maxlength: 200 })}
    ${textArea('note', 'item.note', r.note, { rows: 2 })}
    <p class="muted small">${bi('item.status_note')}</p>
    <p class="form-err err"></p>
    <div class="row"><a class="btn" href="#${back}">${bi('btn.cancel')}</a><button type="submit" class="btn primary" id="it-save">${bi('btn.save')}</button></div>
  </form>`;
  const form = view.querySelector('form');
  wireForm(form);
  form.querySelector('#f-dept_code').addEventListener('change', (e) => {
    const g = form.querySelector('#f-group_key');
    g.innerHTML = [['', bi('item.group_auto')], ...grpOpts(e.target.value)].map(([v, t]) => `<option value="${esc(v)}">${t}</option>`).join('');
  });
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const p = { item_id: isNew ? uuid() : it.item_id };
    const errs = [];
    if (isNew) { p.code = readField(form, 'code'); if (!p.code) errs.push({ field: 'code', key: 'field.required' }); }
    ['kind', 'level', 'dept_code', 'group_key', 'name_vi', 'name_zh', 'purpose_vi', 'purpose_zh', 'freq_vi', 'freq_zh', 'where', 'where_note', 'owner_user_id',
      'iso9001', 'iso14001', 'iso45001', 'iso50001', 'brc_topics', 'flow', 'keep', 'law', 'cls', 'note'].forEach((k) => { const v = readField(form, k); if (v !== undefined) p[k] = v; });
    const pd = readField(form, 'period_days');
    if (Number.isNaN(pd)) errs.push({ field: 'period_days', key: 'field.invalid' }); else p.period_days = pd;
    p.priority = readField(form, 'priority') || '';
    if (!p.dept_code) errs.push({ field: 'dept_code', key: 'field.required' });
    if (!p.name_vi && !p.name_zh) errs.push({ field: 'name', key: 'field.one_lang' });
    const as = assistedFields(form);
    if (!as.ok) errs.push(...as.errors);
    if (errs.length) { showErrors(form, errs); return; }
    if (as.bases.length) p.i18n_assisted = as.bases;
    if (isNew && !p.group_key) delete p.group_key;
    if (fromReq) p.request_id = fromReq.request_id;
    const btn = form.querySelector('#it-save');
    busy(btn, true);
    const res = await writeOnline('item.edit', p, { expected_version: isNew ? 0 : it.record_version });
    busy(btn, false);
    if (res.ok) { toast(bi('form.saved'), 'ok'); await afterCommit(); navigate('/item/' + encodeURIComponent(p.item_id), { replace: true }); return; }
    if (res.code === 'VALIDATION_ERROR') { showErrors(form, res.errors); return; }
    writeFail(res);
  });
}
