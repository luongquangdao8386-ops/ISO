// Chi tiết biểu / tài liệu (phần thông tin, phiên 1a): mục đích, tần suất, Lập → Duyệt, thời gian lưu, điều khoản ISO, chủ đề BRCGS,
// lần ban hành, hạn rà soát, nơi làm, biểu liên quan. Phiên bản & lịch sử (1b), hồ sơ 12 kỳ (1c), tem QR (Đợt 2) hiện "Sắp có".
// Sửa thông tin (Thư ký ISO, cấp 4): /item/:id/edit, thêm mới /item/new.
import { bi, biText, esc, fmtDate, nameText, uuid, badge } from '../core.js';
import { ICON, toast } from '../ui.js';
import { byId, items, recs, depts, isSecretary, users, userName, groupText, KINDS, WHERES } from '../data.js';
import { navigate } from '../router.js';
import { afterCommit } from '../app.js';
import { textInput, textArea, selectInput, numberInput, bilingualInputs, wireForm, readField, showErrors, writeOnline, writeFail, busy, assistedFields } from '../form.js';
import { statusDot } from './catalog.js';

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
  // Tem quét có lần ban hành khác bản hiện hành → bản in đã lỗi thời (tem QR đầy đủ ở phiên 1c, in tem ở Đợt 2)
  const scanned = query && query.r ? String(query.r) : '';
  const stale = scanned && it.current_rev && scanned.padStart(2, '0') !== String(it.current_rev).padStart(2, '0');
  const iso = [['ISO 9001', it.iso9001], ['ISO 14001', it.iso14001], ['ISO 45001', it.iso45001], ['ISO 50001', it.iso50001]].filter((x) => x[1]);
  view.innerHTML = `<div class="item">
    ${scanned ? `<p class="banner ${stale ? 'err' : 'ok'}">${stale ? bi('item.stale', { R: esc(scanned), C: esc(it.current_rev) }) : bi('item.current', { R: esc(it.current_rev || scanned) })}</p>` : ''}
    <section class="card item-head">
      <div class="rec-top"><span class="code big">${esc(it.code)}</span>${statusDot(it.status)} ${badge('status.' + (it.status || 'NONE'))}</div>
      <h2 class="item-name">${pair(it.name_vi, it.name_zh)}</h2>
      <div class="rec-badges">${badge('kind.' + (it.kind || 'FORM'))} ${badge('level_doc.' + (it.level || 'DEPT'))}${it.priority ? ' ' + badge('cat.prio_n', { N: it.priority }) : ''}${it.status === 'ISSUED' && it.file_missing ? ' ' + badge('cat.no_file') : ''}</div>
      ${it.status === 'ISSUED' && it.file_missing ? `<p class="banner warn small">${bi('item.no_file_note')}</p>` : ''}
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
      ${row('item.review_due', esc(fmtDate(it.review_due) || '—'))}
      ${row('item.qr', `<span class="code small">${esc(it.qr_key || '')}</span>`)}
    </section>
    <section class="card soon-card"><div class="card-head"><h3>${bi('item.versions')}</h3><span class="tag soon">${bi('soon.tag')}</span></div><p class="muted small">${bi('item.versions_soon')}</p></section>
    <section class="card soon-card"><div class="card-head"><h3>${bi('item.records')}</h3><span class="tag soon">${bi('soon.tag')}</span></div><p class="muted small">${bi('item.records_soon')}</p></section>
    <div class="row item-actions">
      <button type="button" class="btn" disabled title="${esc(biText('soon.tag'))}">${ICON.upload}<span>${bi('item.submit_record')}</span><span class="tag soon">${bi('soon.tag')}</span></button>
      <button type="button" class="btn" disabled title="${esc(biText('soon.tag'))}">${ICON.edit}<span>${bi('item.new_version')}</span><span class="tag soon">${bi('soon.tag')}</span></button>
      <button type="button" class="btn" disabled title="${esc(biText('soon.tag'))}">${ICON.qr}<span>${bi('item.qr_label')}</span><span class="tag soon">${bi('soon.tag')}</span></button>
    </div>
    ${rel.length ? `<section class="card"><h3>${bi('item.related')}</h3><ul class="cat-list">${rel.slice(0, 30).map((x) => `<li><a class="cat-row" href="#/item/${encodeURIComponent(x.item_id)}"><span class="cat-top"><span class="code">${esc(x.code)}</span>${statusDot(x.status)}</span><span class="cat-name">${esc(x.name_vi || x.name_zh)}</span>${ICON.chevron}</a></li>`).join('')}</ul></section>` : ''}
  </div>`;
}

/* ---------------- Thêm / sửa thông tin biểu (Thư ký ISO, cấp 4) ---------------- */

export async function renderItemForm(view, { shell, params }) {
  const isNew = !params.id;
  const it = isNew ? null : await byId('ITEM', params.id);
  const back = isNew ? '/catalog' : '/item/' + encodeURIComponent(params.id);
  shell.setScreen({ title: isNew ? 'cat.add' : ['Sửa thông tin biểu', '编辑表单信息'], back });
  if (!isSecretary()) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('err.forbidden')}</p></div>`; return; }
  if (!isNew && !it) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('item.not_found')}</p></div>`; return; }
  if (!navigator.onLine) { view.innerHTML = `<div class="card empty-state">${ICON.sync}<p class="muted">${bi('sync.need_network')}</p></div>`; return; }
  const deps = (await depts()).filter((d) => d.active !== false);
  const groups = (await recs('GROUP')).slice().sort((a, b) => String(a.group_key).localeCompare(String(b.group_key)));
  const um = await users();
  const r = it || { kind: 'FORM', level: 'DEPT', where: 'MANUAL' };
  const grpOpts = (dept) => groups.filter((g) => !dept || g.dept_code === dept).map((g) => [g.group_key, esc(g.group_key + ' · ' + groupText(g))]);
  view.innerHTML = `<form class="card form item-form" novalidate>
    ${isNew ? textInput('code', 'cat.code', '', { required: true, maxlength: 40, upper: true, placeholder: 'BM-ISO-02-05', hint: biText('item.code_hint') }) : `<div class="kv"><span>${bi('cat.code')}</span><strong class="code">${esc(it.code)}</strong></div>`}
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
    const btn = form.querySelector('#it-save');
    busy(btn, true);
    const res = await writeOnline('item.edit', p, { expected_version: isNew ? 0 : it.record_version });
    busy(btn, false);
    if (res.ok) { toast(bi('form.saved'), 'ok'); await afterCommit(); navigate('/item/' + encodeURIComponent(p.item_id), { replace: true }); return; }
    if (res.code === 'VALIDATION_ERROR') { showErrors(form, res.errors); return; }
    writeFail(res);
  });
}
