// Đánh giá nội bộ (Đợt 4, phiên 4a — người dùng chốt 13/11/2026 giữ phạm vi Cơ điện; in theo mẫu BM-ISO-03-01 / 03-02 / 03-03).
// /audits: chương trình năm DG-yy — thông tin, các đợt (tháng, bộ phận, nội dung, điều khoản), phủ điều khoản ISO 9001 + BRCGS (đợt / Không
// áp dụng kèm lý do / chưa có), gửi duyệt, duyệt / trả lại (Quản trị, PIN), sửa chương trình đã duyệt (PIN, lý do), hủy (PIN), in chương trình.
// /audits/program/new, /audits/program/:id/edit: thông tin chương trình. /audit/new?program=, /audit/:id/edit: đợt + kế hoạch đợt (ngày, đoàn
// đánh giá — đánh giá viên không đánh giá bộ phận mình). /audit/:id: đợt — kế hoạch, điều khoản kèm biểu liên quan (tình trạng hồ sơ),
// checklist (gợi ý câu hỏi từ điều khoản và biểu, thêm / sửa / xóa, ghi kết quả + bằng chứng), chốt kế hoạch, bắt đầu đánh giá, in kế hoạch /
// checklist. Phiên 4b: phát hiện (từ câu Không phù hợp / Cần cải tiến hoặc nhập tay; NC lớn · NC nhỏ · Cần cải tiến), gửi / rút báo cáo đánh giá
// (BM-ISO-03-04), lập phiếu khắc phục từ phát hiện (#/capa/new?finding=), đóng đợt (Thư ký ISO, PIN) khi mọi phát hiện không phù hợp có phiếu
// khắc phục đã đóng, in báo cáo. Ghi cần mạng. Quyền phía app chỉ để ẩn/hiện nút (data.js); máy chủ kiểm lại.
import { bi, biText, esc, fmtDate, fmtDateTime, badge, nameText, uuid, session, L } from '../core.js';
import { ICON, toast, dialog, $ } from '../ui.js';
import { byId, recs, items, depts, allDepts, users, userName, isSecretary, roleLevel, today, can, auditOn, canSeeAudits, AUDIT_STDS, AUDIT_RESULTS,
  programStds, auditTeam, auditLead, canPlanAudit, canRecordAudit, canEditChecks, canApproveProgram, auditLate, auditsOf, checksOf, scopeNames,
  canSeeRecords, recordStatusMap, findingOn, findingsOf, findingCapa, findingIsNc, findingTypeFits, AUDIT_FINDING_TYPES, canReportAudit,
  canCloseAudit, auditReportGaps, auditCloseGaps, canCreateCapa } from '../data.js';
import { navigate, refresh } from '../router.js';
import { afterCommit } from '../app.js';
import { textInput, selectInput, bilingualInputs, dateInput, wireForm, readField, showErrors, writeOnline, writeWithPin, writeFail, busy } from '../form.js';
import { auditCoverage, auditCovCount, clauseMatch, STD_SHORT } from '../coverage.js';
import { stIcon } from './catalog.js';

const MAX_TEAM = 6;
/** Tên ngắn của chuẩn trên nút chọn (tên riêng, giống nhau ở hai thứ tiếng) */

const pair = (vi, zh, meta, base) => {
  const m = meta && meta[base];
  const tag = (lang) => (m && m.state === 'MACHINE' && m.src !== lang ? ` <span class="tag mt">${bi('tag.machine_translated')}</span>` : '');
  const a = vi ? `<span class="vi">${esc(vi).replace(/\n/g, '<br>')}</span>${tag('vi')}` : '';
  const b = zh ? `<span class="zh muted">${esc(zh).replace(/\n/g, '<br>')}</span>${tag('zh')}` : '';
  return a && b ? a + '<br>' + b : a || b;
};
const kv = (labelKey, value) => (value ? `<div class="kv"><span>${bi(labelKey)}</span><strong>${value}</strong></div>` : '');
const needNet = (view) => {
  if (navigator.onLine) return false;
  view.innerHTML = `<div class="card empty-state">${ICON.sync}<p class="muted">${bi('sync.need_network')}</p></div>`;
  return true;
};
const monthText = (m) => (/^\d{4}-\d{2}$/.test(String(m || '')) ? `${String(m).slice(5)}/${String(m).slice(0, 4)}` : esc(m || ''));
/** Nhãn điều khoản: "7.1.5" hoặc "BRCGS · Kiểm soát vật lạ" */
/** Nhãn điều khoản: ISO 9001 chỉ số (như trước), chuẩn khác có tên chuẩn đứng trước — "ISO 14001 · 6.1.2", "BRCGS · …" (như máy chủ) */
const clausePrefix = (c) => (c && c.std !== 'ISO9001' ? `${STD_SHORT[c.std] || c.std} · ` : '');
const clauseLab = (c) => (c ? `${esc(clausePrefix(c))}${esc(c.key)}` : '');
/** Một nhãn có biến, lấy riêng phần Việt / Trung: fillLang('aud.sq.iso', 0, {K, N}) */
function fillLang(key, i, vars) {
  return String((L[key] || [key, key])[i] || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

/** Tên chương trình: tiêu đề riêng, không có thì "Chương trình đánh giá nội bộ năm 2026" */
export function progTitle(pg) {
  return pg.title_vi || pg.title_zh ? pair(pg.title_vi, pg.title_zh) : bi('aud.prog_default', { Y: esc(pg.year) });
}
function progBadges(pg) {
  return badge('aud.prog.state.' + pg.state) + (pg.rev ? ` <span class="tag">${bi('aud.rev_n', { N: esc(pg.rev) })}</span>` : '');
}
export function auditBadges(a) {
  return badge('aud.state.' + a.state) + (auditLate(a) ? ' ' + badge('aud.late') : '');
}
const auditCode = (a) => (a.code ? esc(a.code) : `<span class="muted">${bi('aud.no_code')}</span>`);
const auditTitle = (a) => esc(a.title_vi || a.title_zh || '');

/** Hộp thoại nhập chữ (lý do) */
async function askText(titleKey, labelKey, { required = false, note = '', value = '' } = {}) {
  for (;;) {
    const v = await dialog({
      title: bi(titleKey),
      body: `${note ? `<p class="muted small">${note}</p>` : ''}<label class="fld"><span>${bi(labelKey)}${required ? ' <span class="req">*</span>' : ''}</span><textarea class="inp" rows="3" maxlength="1000" id="dlg-text">${esc(value)}</textarea></label>`,
      actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('btn.confirm'), kind: 'primary', read: (w) => $('#dlg-text', w).value.trim() }]
    });
    if (v === null || v === undefined) return null;
    if (required && !v) { toast(bi('field.required'), 'err'); continue; }
    return v;
  }
}

function notOn(view, key = 'aud.server_old') {
  view.innerHTML = `<div class="card empty-state">${ICON.inspections}<p class="muted">${bi(key)}</p></div>`;
}

/** Số biểu liên quan của mỗi điều khoản (trong phạm vi, bỏ ✕): Map clause_id → [biểu] */
function formsByClause(list, clauses) {
  const m = new Map();
  for (const c of clauses) m.set(c.clause_id, list.filter((it) => it.status !== 'NA' && clauseMatch(c.std, it, c.key)));
  return m;
}

/* ====================== Chương trình năm (/audits) ====================== */

let curYear = 0;
let covStd = 'ISO9001';
let covF = '';

/** Một đợt trong danh sách */
function auditRow(a, checks, um) {
  const lead = auditLead(a);
  const done = checks.filter((c) => c.result).length;
  const when = a.audit_date ? `${esc(fmtDate(a.audit_date))}${a.time_text ? ' ' + esc(a.time_text) : ''}` : bi('aud.month_only', { M: monthText(a.plan_month) });
  return `<li><a class="cat-row aud-row" href="#/audit/${encodeURIComponent(a.audit_id)}">
    <span class="cat-top"><span class="code">${auditCode(a)}</span>${auditBadges(a)}</span>
    <span class="cat-name">${auditTitle(a)}</span>
    <span class="cat-meta muted">${esc(a.dept_code)} · <span class="${auditLate(a) ? 't-red-text' : ''}">${when}</span> · ${bi('aud.clauses_n', { N: (a.clauses_json || []).length })}${lead ? ' · ' + bi('aud.lead_short') + ': ' + esc(lead.n || userName(um, lead.u)) : ''}${checks.length ? ' · ' + bi('aud.checks_done', { D: done, N: checks.length }) : ''}</span>
    ${ICON.chevron}</a></li>`;
}

/** Thẻ phủ điều khoản của chương trình */
function coverageHtml(pg, cov, formsMap, editable) {
  const stds = programStds(pg);
  if (!stds.includes(covStd)) covStd = stds[0];
  const rows = cov.filter((r) => r.std === covStd);
  const cnt = auditCovCount(cov, covStd);
  const shown = rows.filter((r) => !covF || r.state === covF);
  const groups = [];
  for (const r of shown) {
    const g = nameText(r.clause, 'group') || '';
    if (!groups.length || groups[groups.length - 1].g !== g) groups.push({ g, rows: [] });
    groups[groups.length - 1].rows.push(r);
  }
  const right = (r) => (r.state === 'AUDIT' ? r.audits.map((a) => `<span class="tag aud-tag">${a.code ? esc(a.code) : esc(monthText(a.plan_month))}</span>`).join(' ')
    : r.state === 'NA' ? `<span class="tag">${bi('aud.cov.NA')}</span>` : `<span class="tag t-red">${bi('aud.cov.MISSING')}</span>`);
  return `<section class="card aud-cov" id="aud-cov">
    <div class="card-head"><h3>${bi('aud.cov_title')}</h3>${editable && cnt.missing ? `<button type="button" class="btn tiny" id="aud-na-all">${bi('aud.na_all', { N: cnt.missing })}</button>` : ''}</div>
    <div class="chips tabs">${stds.map((s) => { const c = auditCovCount(cov, s); return `<button type="button" class="chip${s === covStd ? ' on' : ''}" data-std="${s}">${STD_SHORT[s]} <b class="${c.missing ? 't-red-text' : ''}">${c.audit + c.na}/${c.total}</b></button>`; }).join('')}</div>
    <div class="chips">${['', 'MISSING', 'AUDIT', 'NA'].map((f) => `<button type="button" class="chip${f === covF ? ' on' : ''}" data-cf="${f}">${bi(f ? 'aud.cov.' + f : 'cat.all')} <b>${f ? cnt[f === 'AUDIT' ? 'audit' : f === 'NA' ? 'na' : 'missing'] : cnt.total}</b></button>`).join('')}</div>
    ${shown.length ? `<ul class="plain aud-cov-list">${groups.map((g) => `${g.g ? `<li class="aud-cov-group muted small">${esc(g.g)}</li>` : ''}${g.rows.map((r) => {
      const n = (formsMap.get(r.clause.clause_id) || []).length;
      return `<li><button type="button" class="aud-cov-row st-${r.state}" data-c="${esc(r.clause.clause_id)}"><span class="aud-cov-key"><b>${esc(r.key)}</b> <span>${esc(nameText(r.clause))}</span>
        <span class="muted small">${bi('home.items_n', { N: n })}${r.state === 'NA' && r.na ? ' · ' + esc(r.na) : ''}</span></span><span class="aud-cov-right">${right(r)}</span></button></li>`;
    }).join('')}`).join('')}</ul>` : `<p class="muted small">${bi('aud.cov_none')}</p>`}
    <p class="muted small">${bi('aud.cov_how')}</p>
  </section>`;
}

/** Hộp thoại một điều khoản: đợt có điều khoản, biểu liên quan, đánh dấu / bỏ Không áp dụng (chương trình Nháp, Thư ký ISO) */
async function clauseDialog(pg, r, forms, editable) {
  const c = r.clause;
  const naNow = (pg.na_json || []).find((x) => x.c === c.clause_id);
  const v = await dialog({
    title: `${clauseLab(c)} · ${esc(nameText(c))}`,
    wide: true,
    body: `<p>${badge('aud.cov.' + r.state)}</p>
      ${r.audits.length ? `<ul class="plain">${r.audits.map((a) => `<li><a href="#/audit/${encodeURIComponent(a.audit_id)}" class="aud-link">${a.code ? esc(a.code) : bi('aud.no_code')} · ${monthText(a.plan_month)} · ${esc(a.dept_code)} · ${auditTitle(a)}</a></li>`).join('')}</ul>` : ''}
      <p class="small"><strong>${bi('aud.related_forms')}</strong>: ${forms.length ? forms.slice(0, 20).map((it) => `<span class="code">${esc(it.code)}</span>`).join(', ') + (forms.length > 20 ? ' …' : '') : `<span class="muted">${bi('aud.no_forms')}</span>`}</p>
      ${editable && r.state !== 'AUDIT' ? `<label class="fld"><span>${bi('aud.na_reason')}</span><textarea class="inp" rows="2" maxlength="200" id="cl-na">${esc(naNow ? naNow.r : '')}</textarea><div class="hint">${bi('aud.na_hint')}</div></label>` : ''}
      ${!editable && r.state === 'NA' ? `<p class="small">${bi('aud.na_reason')}: ${esc(r.na)}</p>` : ''}`,
    onOpen: (w) => w.querySelectorAll('a.aud-link').forEach((a) => a.addEventListener('click', () => w.remove())),
    actions: [{ label: bi('btn.close'), value: null }].concat(editable && r.state !== 'AUDIT' ? (naNow ? [{ label: bi('aud.na_remove'), value: { remove: true } }] : [])
      .concat([{ label: bi('aud.na_save'), kind: 'primary', read: (w) => ({ reason: $('#cl-na', w).value.trim() }) }]) : [])
  });
  return v;
}

async function saveNa(pg, na) {
  const res = await writeOnline('iaudit.program.save', { program_id: pg.program_id, na }, { expected_version: pg.record_version });
  if (res.ok) { await afterCommit(); refresh(); return true; }
  writeFail(res);
  return false;
}

export async function renderAudits(view, ctx) {
  const { shell, query } = ctx;
  shell.setScreen({ title: 'nav.audits', back: '/' });
  if (!(await auditOn())) { notOn(view); return; }
  if (!canSeeAudits()) { notOn(view, 'err.forbidden'); return; }
  const t = today();
  const ty = Number(t.slice(0, 4));
  if (query && query.y && Number(query.y) > 2000) curYear = Number(query.y);
  if (!curYear) curYear = ty;
  const progs = (await recs('AUD_PROG')).filter((p) => !p.archived_at);
  const years = [...new Set([ty, curYear, ...progs.map((p) => Number(p.year))])].filter((y) => y > 2000).sort((a, b) => b - a);
  const pg = progs.find((p) => Number(p.year) === curYear && p.state !== 'CANCELLED') || null;
  const cancelled = progs.filter((p) => Number(p.year) === curYear && p.state === 'CANCELLED');
  const sec = isSecretary();
  const yearChips = `<div class="chips tabs aud-years">${years.map((y) => `<button type="button" class="chip${y === curYear ? ' on' : ''}" data-y="${y}">${y}</button>`).join('')}</div>`;
  const wireYears = () => view.querySelectorAll('[data-y]').forEach((b) => b.addEventListener('click', () => { curYear = Number(b.dataset.y); renderAudits(view, { ...ctx, query: {} }); }));
  if (!pg) {
    const canNew = sec && curYear >= ty - 1 && curYear <= ty + 1;
    view.innerHTML = `${yearChips}<div class="card empty-state">${ICON.inspections}<p class="muted">${bi('aud.no_program', { Y: curYear })}</p>
      ${canNew ? `<a class="btn primary" id="aud-prog-new" href="#/audits/program/new?y=${curYear}">${ICON.plus}<span>${bi('aud.prog_new', { Y: curYear })}</span></a>` : ''}</div>
      ${cancelled.length ? `<p class="muted small">${cancelled.map((p) => bi('aud.prog_cancelled', { C: esc(p.code), R: esc(p.cancel_reason || '') })).join('<br>')}</p>` : ''}
      <p class="muted small">${bi('aud.how')}</p>`;
    wireYears();
    return;
  }
  const um = await users();
  const audits = await auditsOf(pg.program_id);
  const liveA = audits.filter((a) => a.state !== 'CANCELLED');
  const allChecks = await recs('AUD_CHK');
  const checksBy = (id) => allChecks.filter((c) => c.audit_id === id && !c.archived_at);
  const clauses = await recs('CLAUSE');
  const cov = auditCoverage(clauses, programStds(pg), liveA, pg.na_json || []);
  const formsMap = formsByClause(await items(), clauses);
  const draft = pg.state === 'DRAFT';
  const editable = draft && sec;
  const missing = cov.filter((r) => r.state === 'MISSING').length;
  const btns = [];
  if (editable) btns.push(`<a class="btn" id="aud-prog-edit" href="#/audits/program/${encodeURIComponent(pg.program_id)}/edit">${ICON.edit}<span>${bi('aud.prog_edit')}</span></a>`);
  if (editable) btns.push(`<a class="btn" id="aud-add" href="#/audit/new?program=${encodeURIComponent(pg.program_id)}">${ICON.plus}<span>${bi('aud.add')}</span></a>`);
  if (editable) btns.push(`<button type="button" class="btn primary" id="aud-submit">${ICON.check}<span>${bi('aud.submit')}</span></button>`);
  if (pg.state === 'IN_REVIEW' && sec) btns.push(`<button type="button" class="btn" id="aud-withdraw">${bi('aud.withdraw')}</button>`);
  if (pg.state === 'IN_REVIEW' && canApproveProgram(pg)) {
    btns.push(`<button type="button" class="btn primary" id="aud-approve">${ICON.check}<span>${bi('aud.approve')}</span></button>`);
    btns.push(`<button type="button" class="btn" id="aud-return">${bi('aud.return')}</button>`);
  }
  if (pg.state === 'APPROVED' && sec) btns.push(`<button type="button" class="btn" id="aud-reopen">${ICON.edit}<span>${bi('aud.reopen')}</span></button>`);
  if (sec) btns.push(`<button type="button" class="btn danger" id="aud-prog-cancel">${ICON.trash}<span>${bi('aud.prog_cancel')}</span></button>`);
  const reportOn = await can('report.run');
  const st = session.settings || {};
  let banner = '';
  if (draft && pg.return_reason) banner = `<p class="banner err small">${bi('aud.returned_note', { R: esc(pg.return_reason) })}</p>`;
  else if (draft && pg.reopen_reason) banner = `<p class="banner info small">${bi('aud.reopened_note', { R: esc(pg.reopen_reason) })}</p>`;
  else if (pg.state === 'IN_REVIEW') banner = `<p class="banner info small">${bi(canApproveProgram(pg) ? 'aud.review_me' : 'aud.review_wait')}</p>`;
  else if (draft && missing) banner = `<p class="banner small">${bi('aud.missing_note', { N: missing })}</p>`;
  view.innerHTML = `${yearChips}<div class="item aud-prog">
    <section class="card item-head">
      <div class="rec-top"><span class="code big">${esc(pg.code)}</span>${progBadges(pg)}</div>
      <h2 class="item-name">${progTitle(pg)}</h2>
      ${pg.state === 'APPROVED' ? `<p class="small muted">${bi('aud.approved_by', { U: esc(userName(um, pg.approved_by)), D: esc(fmtDate(pg.approved_at)) })}</p>` : ''}
      ${banner}
      ${kv('aud.stds', programStds(pg).map((s) => bi('aud.std.' + s)).join(' · '))}
      ${pg.objective_vi || pg.objective_zh ? `<div class="kv-block"><span class="muted small">${bi('aud.objective')}</span><p>${pair(pg.objective_vi, pg.objective_zh, pg.i18n_meta, 'objective')}</p></div>` : ''}
      ${pg.scope_vi || pg.scope_zh ? `<div class="kv-block"><span class="muted small">${bi('aud.scope')}</span><p>${pair(pg.scope_vi, pg.scope_zh, pg.i18n_meta, 'scope')}</p></div>` : ''}
    </section>
    <section class="card aud-list"><div class="card-head"><h3>${bi('aud.list_title', { N: liveA.length })}</h3></div>
      ${audits.length ? `<ul class="cat-list">${audits.map((a) => auditRow(a, checksBy(a.audit_id), um)).join('')}</ul>` : `<p class="muted small">${bi('aud.list_none')}</p>`}
    </section>
    ${coverageHtml(pg, cov, formsMap, editable)}
    ${btns.length ? `<div class="row item-actions">${btns.join('')}</div>` : ''}
    ${reportOn ? `<div class="capa-prints aud-prints"><a class="small rp-link" data-form="PROGRAM" href="#/reports?kind=AUDIT&prog=${encodeURIComponent(pg.program_id)}">${ICON.print} ${bi('aud.print.PROGRAM')}${st.audit_program_form_code ? ` <span class="code">${esc(st.audit_program_form_code)}</span>` : ''} ›</a></div>` : ''}
    <p class="muted small">${bi('aud.how')}</p>
  </div>`;
  wireYears();
  const again = async (msgKey, vars) => { await afterCommit(); if (msgKey) toast(bi(msgKey, vars), 'ok'); if (ctx.isCurrent && !ctx.isCurrent()) return; refresh(); };
  const on = (sel, fn) => view.querySelectorAll(sel).forEach((b) => b.addEventListener('click', async () => { busy(b, true); try { await fn(b); } finally { busy(b, false); } }));
  view.querySelectorAll('[data-std]').forEach((b) => b.addEventListener('click', () => { covStd = b.dataset.std; covF = ''; refresh(); }));
  view.querySelectorAll('[data-cf]').forEach((b) => b.addEventListener('click', () => { covF = b.dataset.cf; refresh(); }));
  view.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', async () => {
    const r = cov.find((x) => x.clause.clause_id === b.dataset.c);
    if (!r) return;
    const v = await clauseDialog(pg, r, formsMap.get(r.clause.clause_id) || [], editable);
    if (!v) return;
    const na = (pg.na_json || []).filter((x) => x.c !== r.clause.clause_id);
    if (!v.remove) {
      if (!v.reason) { toast(bi('aud.na_need_reason'), 'err'); return; }
      na.push({ c: r.clause.clause_id, r: v.reason });
    }
    await saveNa(pg, na);
  }));
  on('#aud-na-all', async () => {
    const names = await scopeNames();
    const def = names ? fillLang('aud.na_default', 0, { D: names.vi }) + ' · ' + fillLang('aud.na_default', 1, { D: names.zh }) : '';
    const list = cov.filter((r) => r.std === covStd && r.state === 'MISSING');
    const reason = await askText('aud.na_all_title', 'aud.na_reason', { required: true, value: def, note: biText('aud.na_all_note', { N: list.length, S: biText('aud.std.' + covStd) }) });
    if (reason === null) return;
    const na = (pg.na_json || []).concat(list.map((r) => ({ c: r.clause.clause_id, r: reason.slice(0, 200) })));
    if (await saveNa(pg, na)) toast(bi('aud.na_all_ok', { N: list.length }), 'ok');
  });
  on('#aud-submit', async () => {
    const res = await writeOnline('iaudit.program.submit', { program_id: pg.program_id }, { expected_version: pg.record_version });
    if (res.ok) return again('aud.submitted_ok');
    writeFail(res);
  });
  on('#aud-withdraw', async () => {
    const res = await writeOnline('iaudit.program.submit', { program_id: pg.program_id, undo: true }, { expected_version: pg.record_version });
    if (res.ok) return again('aud.withdrawn_ok');
    writeFail(res);
  });
  on('#aud-approve', async () => {
    const note = await askText('aud.approve', 'aud.approve_note', { note: biText('aud.approve_hint', { N: liveA.filter((a) => !a.code).length }) });
    if (note === null) return;
    const res = await writeWithPin('iaudit.program.approve', { program_id: pg.program_id, note }, { expected_version: pg.record_version });
    if (res.ok) return again('aud.approved_ok');
    writeFail(res);
  });
  on('#aud-return', async () => {
    const reason = await askText('aud.return', 'field.reason', { required: true });
    if (reason === null) return;
    const res = await writeWithPin('iaudit.program.return', { program_id: pg.program_id, reason }, { expected_version: pg.record_version });
    if (res.ok) return again('aud.returned_ok');
    writeFail(res);
  });
  on('#aud-reopen', async () => {
    const reason = await askText('aud.reopen', 'aud.reopen_reason', { required: true, note: biText('aud.reopen_note') });
    if (reason === null) return;
    const res = await writeWithPin('iaudit.program.reopen', { program_id: pg.program_id, reason }, { expected_version: pg.record_version });
    if (res.ok) return again('aud.reopened_ok');
    writeFail(res);
  });
  on('#aud-prog-cancel', async () => {
    const reason = await askText('aud.prog_cancel', 'field.reason', { required: true, note: biText('aud.prog_cancel_note') });
    if (reason === null) return;
    const res = await writeWithPin('iaudit.program.cancel', { program_id: pg.program_id, reason }, { expected_version: pg.record_version });
    if (res.ok) return again('aud.prog_cancelled_ok');
    writeFail(res);
  });
}

/* ====================== Thông tin chương trình (/audits/program/new, /audits/program/:id/edit) ====================== */

export async function renderProgramForm(view, ctx) {
  const { shell, params, query } = ctx;
  const editing = !!(params && params.id);
  const pg = editing ? await byId('AUD_PROG', params.id) : null;
  shell.setScreen({ title: editing ? 'aud.prog_edit' : 'aud.prog_new_title', back: '/audits' });
  if (!(await auditOn())) { notOn(view); return; }
  if (!isSecretary() || (editing && (!pg || pg.state !== 'DRAFT'))) { notOn(view, editing && !pg ? 'aud.not_found' : 'aud.no_edit'); return; }
  if (needNet(view)) return;
  const ty = Number(today().slice(0, 4));
  const taken = new Set((await recs('AUD_PROG')).filter((p) => !p.archived_at && p.state !== 'CANCELLED').map((p) => Number(p.year)));
  const yearOpts = [ty - 1, ty, ty + 1].filter((y) => !taken.has(y));
  if (!editing && !yearOpts.length) { notOn(view, 'aud.years_taken'); return; }
  const qy = Number(query && query.y);
  const year = editing ? Number(pg.year) : (yearOpts.includes(qy) ? qy : (yearOpts.includes(ty) ? ty : yearOpts[0]));
  const names = await scopeNames();
  const v = pg ? { ...pg } : {
    title_vi: '', title_zh: '', objective_vi: fillLang('aud.objective_default', 0, {}), objective_zh: fillLang('aud.objective_default', 1, {}),
    scope_vi: names ? fillLang('aud.scope_default', 0, { D: names.vi }) : '', scope_zh: names ? fillLang('aud.scope_default', 1, { D: names.zh }) : ''
  };
  // Chỉ chuẩn đã có điều khoản trên máy chủ (máy chủ chưa lên bản có ISO 14001/45001/50001 thì không hiện ba chuẩn đó)
  const clsAll = await recs('CLAUSE');
  const pStds = pg ? programStds(pg) : [];
  const avail = AUDIT_STDS.filter((x) => pStds.includes(x) || clsAll.some((c) => c.std === x && c.active !== false && !c.archived_at));
  let stds = pg ? pStds : (avail.length ? avail.slice() : AUDIT_STDS.filter((x) => x === 'ISO9001' || x === 'BRC'));
  view.innerHTML = `<form class="card form aud-prog-form" novalidate>
    ${editing ? kv('aud.year', esc(year)) : selectInput('year', 'aud.year', yearOpts.map((y) => [y, String(y)]), year, { required: true, empty: '' })}
    <div class="fld" data-field="stds"><label>${bi('aud.stds')} <span class="req">*</span></label>
      <div class="chips" id="pf-stds">${(avail.length ? avail : stds).map((s) => `<button type="button" class="chip${stds.includes(s) ? ' on' : ''}" data-s="${s}" aria-pressed="${stds.includes(s)}">${bi('aud.std.' + s)}</button>`).join('')}</div>
      <div class="hint">${bi('aud.stds_hint')}</div><div class="ferr"></div></div>
    ${bilingualInputs('title', v, { labelKey: 'aud.prog_title', required: false, maxlength: 200 })}
    <p class="muted small">${bi('aud.prog_title_hint', { Y: esc(year) })}</p>
    ${bilingualInputs('objective', v, { labelKey: 'aud.objective', required: false, area: true, maxlength: 2000 })}
    ${bilingualInputs('scope', v, { labelKey: 'aud.scope', required: false, area: true, maxlength: 2000 })}
    <p class="form-err err"></p>
    <div class="row"><a class="btn" href="#/audits">${bi('btn.cancel')}</a>
      <button type="submit" class="btn primary" id="pf-save">${ICON.check}<span>${bi(editing ? 'btn.save' : 'aud.prog_create')}</span></button></div>
    ${editing ? '' : `<p class="muted small">${bi('aud.prog_flow')}</p>`}
  </form>`;
  const form = $('form', view);
  wireForm(form);
  form.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => {
    b.classList.toggle('on');
    b.setAttribute('aria-pressed', String(b.classList.contains('on')));
  }));
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    stds = [...form.querySelectorAll('[data-s].on')].map((b) => b.dataset.s);
    if (!stds.length) { showErrors(form, [{ field: 'stds', key: 'field.required' }]); return; }
    const p = { program_id: editing ? pg.program_id : uuid(), stds };
    if (!editing) p.year = Number(readField(form, 'year'));
    ['title', 'objective', 'scope'].forEach((b) => ['vi', 'zh'].forEach((l) => { p[b + '_' + l] = readField(form, b + '_' + l) || ''; }));
    const btn = $('#pf-save', form);
    busy(btn, true);
    const r = await writeOnline('iaudit.program.save', p, { expected_version: editing ? pg.record_version : 0 });
    busy(btn, false);
    if (r.ok) {
      await afterCommit();
      toast(bi(editing ? 'form.saved' : 'aud.prog_created_ok', { C: esc((r.data && r.data.record && r.data.record.code) || '') }), 'ok');
      curYear = editing ? Number(pg.year) : p.year;
      navigate('/audits?y=' + curYear, { replace: true });
      return;
    }
    if (r.code === 'VALIDATION_ERROR') { showErrors(form, r.errors); return; }
    writeFail(r);
  });
}

/* ====================== Đợt đánh giá + kế hoạch đợt (/audit/new?program=, /audit/:id/edit) ====================== */

/** Người trong app chọn được vào đoàn: Đánh giá viên, Thư ký ISO, Quản trị (máy chủ cũ không gửi cờ → mọi người đang hoạt động) */
async function auditorOptions() {
  const all = [...(await users()).values()].filter((u) => u.active !== false);
  const known = all.some((u) => u.auditor !== undefined);
  return all.filter((u) => !known || u.auditor || u.iso_secretary || Number(u.role_level) >= 4)
    .sort((a, b) => String(a.display_name).localeCompare(String(b.display_name)));
}

function memberHtml(t, i, opts, deptList) {
  return `<div class="aud-member" data-i="${i}">
    <select class="inp sel" data-k="u" aria-label="${esc(biText('aud.member'))}"><option value="">${esc(biText('aud.member_outside'))}</option>${opts.map((u) => `<option value="${esc(u.user_id)}"${t.u === u.user_id ? ' selected' : ''}>${esc(u.display_name)} (${esc(u.employee_code)})${u.dept_codes ? ' · ' + esc(u.dept_codes) : ''}</option>`).join('')}</select>
    <input class="inp" type="text" maxlength="80" data-k="n" value="${esc(t.u ? '' : t.n || '')}" placeholder="${esc(biText('aud.member_name'))}" autocomplete="off"${t.u ? ' hidden' : ''}>
    <select class="inp sel" data-k="d" aria-label="${esc(biText('aud.member_dept'))}"><option value="">${esc(biText('aud.member_dept'))}</option>${deptList.map((d) => `<option value="${esc(d.dept_code)}"${t.d === d.dept_code ? ' selected' : ''}>${esc(d.dept_code)} · ${esc(nameText(d))}</option>`).join('')}</select>
    <label class="check aud-lead"><input type="radio" name="aud-lead" data-k="r"${t.r === 'L' ? ' checked' : ''}><span>${bi('aud.role.L')}</span></label>
    <button type="button" class="icon-btn" data-del="${i}" aria-label="${esc(biText('btn.delete'))}">${ICON.x}</button>
  </div>`;
}

/** Ô chọn điều khoản theo chuẩn → nhóm; ghi chú số biểu liên quan, đợt khác đã có điều khoản đó */
function clausePickerHtml(stds, clauses, chosen, formsMap, others) {
  return `<fieldset class="aud-clauses" data-field="clauses"><legend>${bi('aud.clauses')} <span class="req">*</span></legend>
    <div class="hint">${bi('aud.clauses_hint')}</div>
    ${stds.map((std) => {
      const list = clauses.filter((c) => c.std === std && c.active !== false && !c.archived_at)
        .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.key).localeCompare(String(b.key)));
      const groups = [];
      for (const c of list) {
        const g = nameText(c, 'group') || '';
        if (!groups.length || groups[groups.length - 1].g !== g) groups.push({ g, list: [] });
        groups[groups.length - 1].list.push(c);
      }
      return `<div class="aud-cl-std"><h4>${bi('aud.std.' + std)}</h4>${groups.map((g, gi) => `<div class="aud-cl-group">
        <div class="aud-cl-gh"><span class="muted small">${esc(g.g)}</span><button type="button" class="btn tiny" data-grp="${std}-${gi}">${bi('aud.pick_group')}</button></div>
        ${g.list.map((c) => {
          const n = (formsMap.get(c.clause_id) || []).length;
          const o = others.filter((a) => (a.clauses_json || []).includes(c.clause_id));
          return `<label class="check aud-cl" data-g="${std}-${gi}"><input type="checkbox" value="${esc(c.clause_id)}"${chosen.includes(c.clause_id) ? ' checked' : ''}><span><b>${esc(c.key)}</b> ${esc(nameText(c))}
            <span class="muted small">· ${bi('home.items_n', { N: n })}${o.length ? ' · ' + bi('aud.in_other', { C: o.map((a) => esc(a.code || monthText(a.plan_month))).join(', ') }) : ''}</span></span></label>`;
        }).join('')}</div>`).join('')}</div>`;
    }).join('')}
    <div class="ferr" role="alert"></div></fieldset>`;
}

export async function renderAuditForm(view, ctx) {
  const { shell, params, query } = ctx;
  const editing = !!(params && params.id);
  const a = editing ? await byId('AUDIT', params.id) : null;
  const pg = await byId('AUD_PROG', a ? a.program_id : (query && query.program));
  const backTo = editing ? '/audit/' + encodeURIComponent(params.id) : '/audits';
  shell.setScreen({ title: editing ? 'aud.edit' : 'aud.add', back: backTo });
  if (!(await auditOn())) { notOn(view); return; }
  if (!pg || (editing && !a)) { notOn(view, 'aud.not_found'); return; }
  if (!a && pg.state !== 'DRAFT') { notOn(view, 'aud.no_edit'); return; }
  const live = !a || a.state === 'PLANNED' || a.state === 'READY';
  const progEdit = live && isSecretary() && pg.state === 'DRAFT';
  const planEdit = live && (!a ? isSecretary() : canPlanAudit(a));
  if (!progEdit && !planEdit) { notOn(view, 'aud.no_edit'); return; }
  if (needNet(view)) return;
  const deps = (await depts()).filter((d) => d.active !== false);
  const allDeps = (await allDepts()).filter((d) => d.active !== false);
  const clauses = await recs('CLAUSE');
  const formsMap = formsByClause(await items(), clauses);
  const others = (await auditsOf(pg.program_id)).filter((x) => x.state !== 'CANCELLED' && (!a || x.audit_id !== a.audit_id));
  const opts = await auditorOptions();
  const um = await users();
  const y = Number(pg.year);
  const months = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
  const v = a ? { ...a } : { dept_code: deps.length === 1 ? deps[0].dept_code : '', plan_month: '', title_vi: '', title_zh: '', clauses_json: [], team_json: [], note_vi: '', note_zh: '' };
  let team = auditTeam(v).map((x) => ({ ...x }));
  const clMap = new Map(clauses.map((c) => [c.clause_id, c]));
  const progRO = `<section class="aud-ro">${kv('aud.dept', esc(v.dept_code))}${kv('aud.month', monthText(v.plan_month))}${kv('aud.title_f', auditTitle(v))}
    ${kv('aud.clauses', (v.clauses_json || []).map((id) => clauseLab(clMap.get(id)) || esc(id)).join('; '))}
    <p class="muted small">${bi(pg.state === 'DRAFT' ? 'aud.prog_ro_secretary' : 'aud.prog_ro_locked')}</p></section>`;
  view.innerHTML = `<form class="card form aud-form" novalidate>
    <p class="muted small">${bi('aud.in_program', { C: esc(pg.code), Y: esc(pg.year) })}${a && a.code ? ' · <span class="code">' + esc(a.code) + '</span>' : ''}</p>
    <h3>${bi('aud.sec_program')}</h3>
    ${progEdit ? `<div class="form-grid">
        ${selectInput('dept_code', 'aud.dept', deps.map((d) => [d.dept_code, esc(d.dept_code + ' · ' + nameText(d))]), v.dept_code, { required: true })}
        ${selectInput('plan_month', 'aud.month', months.map((m) => [m, monthText(m)]), v.plan_month, { required: true })}
      </div>
      ${bilingualInputs('title', v, { labelKey: 'aud.title_f', area: true, maxlength: 300 })}
      <p class="muted small">${bi('aud.title_hint')}</p>
      ${clausePickerHtml(programStds(pg), clauses, v.clauses_json || [], formsMap, others)}` : progRO}
    ${planEdit ? `<h3>${bi('aud.sec_plan')}</h3>
      <p class="muted small">${bi(a ? 'aud.plan_hint' : 'aud.plan_hint_new')}</p>
      <div class="form-grid">
        ${dateInput('audit_date', 'aud.date', v.audit_date || '', { hint: biText('aud.date_hint', { Y: y }) })}
        ${textInput('time_text', 'aud.time', v.time_text || '', { maxlength: 100, placeholder: '8:00 – 11:00' })}
        ${textInput('place_text', 'aud.place', v.place_text || '', { maxlength: 200 })}
        ${textInput('auditee_text', 'aud.auditee', v.auditee_text || '', { maxlength: 200, hint: biText('aud.auditee_hint') })}
      </div>
      <fieldset class="aud-team" data-field="team"><legend>${bi('aud.team')}</legend>
        <div id="team-rows"></div>
        <button type="button" class="btn small" id="team-add">${ICON.plus}<span>${bi('aud.member_add')}</span></button>
        <div class="hint">${bi('aud.team_hint')}</div><div class="ferr" role="alert"></div></fieldset>
      ${bilingualInputs('note', v, { labelKey: 'aud.note', area: true, maxlength: 2000, required: false })}` : ''}
    <p class="form-err err"></p>
    <div class="row"><a class="btn" href="#${backTo}">${bi('btn.cancel')}</a>
      <button type="submit" class="btn primary" id="af-save">${ICON.check}<span>${bi(editing ? 'btn.save' : 'aud.add_save')}</span></button></div>
  </form>`;
  const form = $('form', view);
  wireForm(form);
  const readTeam = () => {
    const box = $('#team-rows', form);
    if (!box) return team;
    team = [...box.querySelectorAll('.aud-member')].map((r) => {
      const u = r.querySelector('[data-k="u"]').value;
      const usr = u ? um.get(u) : null;
      return { u, n: u ? (usr ? usr.display_name : '') : r.querySelector('[data-k="n"]').value.trim(), d: r.querySelector('[data-k="d"]').value, r: r.querySelector('[data-k="r"]').checked ? 'L' : 'M' };
    });
    return team;
  };
  const drawTeam = () => {
    const box = $('#team-rows', form);
    if (!box) return;
    box.innerHTML = team.map((t, i) => memberHtml(t, i, opts, allDeps)).join('');
    $('#team-add', form).disabled = team.length >= MAX_TEAM;
    box.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { readTeam(); team.splice(Number(b.dataset.del), 1); drawTeam(); }));
    box.querySelectorAll('[data-k="u"]').forEach((s) => s.addEventListener('change', () => {
      const row = s.closest('.aud-member');
      const n = row.querySelector('[data-k="n"]');
      n.hidden = !!s.value;
      const usr = s.value ? um.get(s.value) : null;
      const dd = usr && String(usr.dept_codes || '').split(',').map((x) => x.trim()).filter(Boolean);
      if (dd && dd.length === 1) row.querySelector('[data-k="d"]').value = dd[0];
    }));
  };
  if ($('#team-add', form)) {
    if (!team.length) team.push({ u: '', n: '', d: '', r: 'L' });
    drawTeam();
    $('#team-add', form).addEventListener('click', () => { readTeam(); if (team.length < MAX_TEAM) team.push({ u: '', n: '', d: '', r: team.some((x) => x.r === 'L') ? 'M' : 'L' }); drawTeam(); });
  }
  form.querySelectorAll('[data-grp]').forEach((b) => b.addEventListener('click', () => {
    const boxes = [...form.querySelectorAll(`.aud-cl[data-g="${b.dataset.grp}"] input`)];
    const all = boxes.every((x) => x.checked);
    boxes.forEach((x) => { x.checked = !all; });
  }));
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const p = { audit_id: editing ? a.audit_id : uuid() };
    if (!editing) p.program_id = pg.program_id;
    const errs = [];
    let dept = v.dept_code;
    if (progEdit) {
      p.dept_code = dept = readField(form, 'dept_code');
      if (!p.dept_code) errs.push({ field: 'dept_code', key: 'field.required' });
      p.plan_month = readField(form, 'plan_month');
      if (!p.plan_month) errs.push({ field: 'plan_month', key: 'field.required' });
      ['vi', 'zh'].forEach((l) => { p['title_' + l] = readField(form, 'title_' + l) || ''; });
      if (!p.title_vi && !p.title_zh) errs.push({ field: 'title', key: 'field.one_lang' });
      p.clauses = [...form.querySelectorAll('.aud-clauses input:checked')].map((x) => x.value);
      if (!p.clauses.length) errs.push({ field: 'clauses', key: 'aud.need_clauses' });
    }
    if (planEdit) {
      const d = readField(form, 'audit_date');
      if (d === null) errs.push({ field: 'audit_date', key: 'field.invalid_date' }); else p.audit_date = d || '';
      ['time_text', 'place_text', 'auditee_text'].forEach((k) => { p[k] = readField(form, k) || ''; });
      ['vi', 'zh'].forEach((l) => { p['note_' + l] = readField(form, 'note_' + l) || ''; });
      p.team = readTeam().filter((t) => t.u || t.n);
      if (p.team.some((t) => t.d && t.d === dept) || p.team.some((t) => t.u && um.get(t.u) && String(um.get(t.u).dept_codes || '').split(',').map((x) => x.trim()).includes(dept))) {
        errs.push({ field: 'team', key: 'aud.own_dept' });
      }
      if (p.team.filter((t) => t.r === 'L').length > 1) errs.push({ field: 'team', key: 'aud.one_lead' });
    }
    if (errs.length) { showErrors(form, errs); return; }
    const btn = $('#af-save', form);
    busy(btn, true);
    const r = await writeOnline('iaudit.save', p, { expected_version: editing ? a.record_version : 0 });
    busy(btn, false);
    if (r.ok) {
      await afterCommit();
      toast(bi(editing ? 'form.saved' : 'aud.added_ok'), 'ok');
      navigate(editing ? '/audit/' + encodeURIComponent(p.audit_id) : '/audits?y=' + y, { replace: true });
      return;
    }
    if (r.code === 'VALIDATION_ERROR') { showErrors(form, r.errors); return; }
    writeFail(r);
  });
}

/* ====================== Đợt đánh giá (/audit/:id) ====================== */

/** Câu hỏi gợi ý cho một điều khoản: hai thứ tiếng, kèm mã biểu cần xem hồ sơ */
function suggestLine(c, forms) {
  const codes = forms.slice(0, 8).map((it) => it.code);
  const vars = (i) => ({ K: c.std === 'ISO9001' || c.std === 'BRC' ? c.key : `${STD_SHORT[c.std]} ${c.key}`, N: (i === 0 ? c.name_vi || c.name_zh : c.name_zh || c.name_vi) || '', C: codes.join(i === 0 ? ', ' : '、') });
  const key = c.std === 'BRC' ? 'aud.sq.brc' : 'aud.sq.iso';
  return {
    clause_id: c.clause_id,
    question_vi: fillLang(key, 0, vars(0)) + (codes.length ? fillLang('aud.sq.forms', 0, vars(0)) : ''),
    question_zh: fillLang(key, 1, vars(1)) + (codes.length ? fillLang('aud.sq.forms', 1, vars(1)) : '')
  };
}

/** Hộp thoại gợi ý câu hỏi; trả danh sách dòng đã chọn hoặc null */
async function suggestDialog(lines, has) {
  return dialog({
    title: bi('aud.suggest'),
    wide: true,
    body: `<p class="muted small">${bi('aud.suggest_hint')}</p>
      <ul class="plain aud-sugg">${lines.map((l, i) => `<li><label class="check"><input type="checkbox" data-sg="${i}"${has.has(l.clause_id) ? '' : ' checked'}><span>${esc(l.question_vi)}<br><span class="muted">${esc(l.question_zh)}</span>${has.has(l.clause_id) ? `<br><span class="small muted">${bi('aud.suggest_has')}</span>` : ''}</span></label></li>`).join('')}</ul>`,
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('aud.suggest_add'), kind: 'primary', read: (w) => [...w.querySelectorAll('[data-sg]:checked')].map((x) => lines[Number(x.dataset.sg)]) }]
  });
}

/** Hộp thoại thêm / sửa câu hỏi */
async function checkDialog(a, clMap, c, prev) {
  const v = prev || { clause_id: c ? c.clause_id || '' : '', question_vi: c ? c.question_vi || '' : '', question_zh: c ? c.question_zh || '' : '' };
  return dialog({
    title: bi(c ? 'aud.check_edit' : 'aud.check_add'),
    wide: true,
    body: `<label class="fld"><span>${bi('aud.clause')}</span><select class="inp sel" id="ck-cl"><option value="">${esc(biText('aud.clause_general'))}</option>${(a.clauses_json || []).map((id) => { const cl = clMap.get(id); return `<option value="${esc(id)}"${v.clause_id === id ? ' selected' : ''}>${cl ? clauseLab(cl) + ' · ' + esc(nameText(cl)) : esc(id)}</option>`; }).join('')}</select></label>
      <fieldset class="bi-pair"><legend>${bi('aud.question')} <span class="req">*</span></legend>
        <label class="fld"><span>${bi('i18n.lang_vi')}</span><textarea class="inp" rows="3" maxlength="1000" id="ck-vi">${esc(v.question_vi)}</textarea></label>
        <label class="fld"><span>${bi('i18n.lang_zh')}</span><textarea class="inp" rows="2" maxlength="1000" id="ck-zh">${esc(v.question_zh)}</textarea></label>
        <div class="hint">${bi('field.one_lang')}</div></fieldset>`,
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('btn.save'), kind: 'primary', read: (w) => ({ clause_id: $('#ck-cl', w).value, question_vi: $('#ck-vi', w).value.trim(), question_zh: $('#ck-zh', w).value.trim() }) }]
  });
}

/** Hộp thoại ghi kết quả một câu hỏi */
async function recordDialog(c, prev) {
  const v = prev || { result: c.result || '', evidence_vi: c.evidence_vi || '', evidence_zh: c.evidence_zh || '' };
  return dialog({
    title: bi('aud.record'),
    wide: true,
    body: `<p class="small">${pair(c.question_vi, c.question_zh)}</p>
      <div class="fld"><span>${bi('aud.result')} <span class="req">*</span></span><div class="chips" role="radiogroup" id="rc-res">${AUDIT_RESULTS.map((x) => `<button type="button" class="chip${v.result === x ? ' on' : ''}" data-res="${x}" role="radio" aria-checked="${v.result === x}">${bi('aud.result.' + x)}</button>`).join('')}</div>
        <div class="hint">${bi('aud.result_hint')}</div></div>
      <fieldset class="bi-pair"><legend>${bi('aud.evidence')}</legend>
        <label class="fld"><span>${bi('i18n.lang_vi')}</span><textarea class="inp" rows="3" maxlength="3000" id="rc-vi">${esc(v.evidence_vi)}</textarea></label>
        <label class="fld"><span>${bi('i18n.lang_zh')}</span><textarea class="inp" rows="2" maxlength="3000" id="rc-zh">${esc(v.evidence_zh)}</textarea></label>
        <div class="hint">${bi('aud.evidence_hint')}</div></fieldset>`,
    onOpen: (w) => w.querySelectorAll('[data-res]').forEach((b) => b.addEventListener('click', () => {
      w.querySelectorAll('[data-res]').forEach((x) => { const on = x === b && !b.classList.contains('on'); x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); });
    })),
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('btn.save'), kind: 'primary', read: (w) => {
      const on = w.querySelector('[data-res].on');
      return { result: on ? on.dataset.res : '', evidence_vi: $('#rc-vi', w).value.trim(), evidence_zh: $('#rc-zh', w).value.trim() };
    } }]
  });
}

/** Phát hiện điền sẵn từ câu checklist: Không phù hợp → NC nhỏ, Cần cải tiến → cần cải tiến; nội dung "Chưa đáp ứng: <câu hỏi>", bằng chứng
 *  của câu */
function findingFromCheck(c) {
  if (!c) return { check_id: '', ftype: '', clause_id: '', content_vi: '', content_zh: '', evidence_vi: '', evidence_zh: '' };
  const q = (i) => (i === 0 ? c.question_vi || c.question_zh : c.question_zh || c.question_vi) || '';
  return { check_id: c.check_id, ftype: c.result === 'OBS' ? 'OBS' : 'MINOR', clause_id: c.clause_id || '',
    content_vi: fillLang('aud.fnd_from_q', 0, { Q: q(0) }), content_zh: fillLang('aud.fnd_from_q', 1, { Q: q(1) }),
    evidence_vi: c.evidence_vi || '', evidence_zh: c.evidence_zh || '' };
}

/** Hộp thoại ghi / sửa phát hiện. f: phát hiện đang sửa (null = thêm); check0: câu checklist khi bấm Ghi phát hiện ở câu đó */
async function findingDialog(a, clMap, checks, findings, f, check0, prev) {
  const taken = new Set(findings.filter((x) => x.check_id && (!f || x.finding_id !== f.finding_id)).map((x) => x.check_id));
  const free = checks.filter((c) => (c.result === 'NC' || c.result === 'OBS') && !taken.has(c.check_id));
  const v = prev || (f ? { check_id: f.check_id || '', ftype: f.ftype || '', clause_id: f.clause_id || '', content_vi: f.content_vi || '', content_zh: f.content_zh || '',
    evidence_vi: f.evidence_vi || '', evidence_zh: f.evidence_zh || '' } : findingFromCheck(check0));
  const byCk = new Map(checks.map((c) => [c.check_id, c]));
  const ckLab = (c) => `${c.seq}. ${biText('aud.result.' + c.result)} — ${String(c.question_vi || c.question_zh || '').slice(0, 80)}`;
  return dialog({
    title: bi(f ? 'aud.fnd_edit' : 'aud.fnd_add'),
    wide: true,
    body: `<label class="fld"><span>${bi('aud.fnd_check')}</span><select class="inp sel" id="fd-ck"><option value="">${esc(biText('aud.fnd_check_none'))}</option>${free.map((c) => `<option value="${esc(c.check_id)}"${v.check_id === c.check_id ? ' selected' : ''}>${esc(ckLab(c))}</option>`).join('')}</select>
        <span class="hint">${bi('aud.fnd_check_hint')}</span></label>
      <div class="fld"><span>${bi('aud.ftype')} <span class="req">*</span></span><div class="chips" role="radiogroup" id="fd-type">${AUDIT_FINDING_TYPES.map((x) => `<button type="button" class="chip${v.ftype === x ? ' on' : ''}" data-ft="${x}" role="radio" aria-checked="${v.ftype === x}">${bi('aud.ftype.' + x)}</button>`).join('')}</div>
        <div class="hint">${bi('aud.ftype_hint')}</div></div>
      <label class="fld"><span>${bi('aud.clause')}</span><select class="inp sel" id="fd-cl"><option value="">${esc(biText('aud.clause_general'))}</option>${(a.clauses_json || []).map((id) => { const cl = clMap.get(id); return `<option value="${esc(id)}"${v.clause_id === id ? ' selected' : ''}>${cl ? clauseLab(cl) + ' · ' + esc(nameText(cl)) : esc(id)}</option>`; }).join('')}</select></label>
      <fieldset class="bi-pair"><legend>${bi('aud.finding_content')} <span class="req">*</span></legend>
        <label class="fld"><span>${bi('i18n.lang_vi')}</span><textarea class="inp" rows="3" maxlength="3000" id="fd-vi">${esc(v.content_vi)}</textarea></label>
        <label class="fld"><span>${bi('i18n.lang_zh')}</span><textarea class="inp" rows="2" maxlength="3000" id="fd-zh">${esc(v.content_zh)}</textarea></label>
        <div class="hint">${bi('aud.fnd_content_hint')}</div></fieldset>
      <fieldset class="bi-pair"><legend>${bi('aud.evidence')}</legend>
        <label class="fld"><span>${bi('i18n.lang_vi')}</span><textarea class="inp" rows="2" maxlength="3000" id="fd-evi">${esc(v.evidence_vi)}</textarea></label>
        <label class="fld"><span>${bi('i18n.lang_zh')}</span><textarea class="inp" rows="2" maxlength="3000" id="fd-ezh">${esc(v.evidence_zh)}</textarea></label>
        <div class="hint">${bi('aud.fnd_no_mt')}</div></fieldset>`,
    onOpen: (w) => {
      const setType = (t) => w.querySelectorAll('[data-ft]').forEach((x) => { const on = x.dataset.ft === t; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); });
      w.querySelectorAll('[data-ft]').forEach((b) => b.addEventListener('click', () => setType(b.dataset.ft)));
      $('#fd-ck', w).addEventListener('change', (e) => {
        const c = byCk.get(e.target.value);
        if (!c) return;
        const d = findingFromCheck(c);
        const cur = w.querySelector('[data-ft].on');
        if (!cur || !findingTypeFits(c.result, cur.dataset.ft)) setType(d.ftype);
        $('#fd-cl', w).value = d.clause_id;
        if (!$('#fd-vi', w).value.trim() && !$('#fd-zh', w).value.trim()) { $('#fd-vi', w).value = d.content_vi; $('#fd-zh', w).value = d.content_zh; }
        if (!$('#fd-evi', w).value.trim() && !$('#fd-ezh', w).value.trim()) { $('#fd-evi', w).value = d.evidence_vi; $('#fd-ezh', w).value = d.evidence_zh; }
      });
    },
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('btn.save'), kind: 'primary', read: (w) => {
      const on = w.querySelector('[data-ft].on');
      return { check_id: $('#fd-ck', w).value, ftype: on ? on.dataset.ft : '', clause_id: $('#fd-cl', w).value, content_vi: $('#fd-vi', w).value.trim(),
        content_zh: $('#fd-zh', w).value.trim(), evidence_vi: $('#fd-evi', w).value.trim(), evidence_zh: $('#fd-ezh', w).value.trim() };
    } }]
  });
}

/** Hộp thoại gửi báo cáo đánh giá: ngày báo cáo, điểm mạnh, kết luận (không dịch máy) */
async function reportDialog(a, cnt, prev) {
  const t = today();
  const v = prev || { report_date: a.report_date || t, strength_vi: a.strength_vi || '', strength_zh: a.strength_zh || '', summary_vi: a.summary_vi || '', summary_zh: a.summary_zh || '' };
  return dialog({
    title: bi('aud.report'),
    wide: true,
    body: `<p class="small">${bi('aud.report_counts', cnt)}</p>
      <label class="fld"><span>${bi('aud.report_date')} <span class="req">*</span></span><input type="date" class="inp" id="rp-date" value="${esc(v.report_date)}" min="${esc(a.audit_date || '')}" max="${esc(t)}"></label>
      <fieldset class="bi-pair"><legend>${bi('aud.strength')}</legend>
        <label class="fld"><span>${bi('i18n.lang_vi')}</span><textarea class="inp" rows="2" maxlength="3000" id="rp-svi">${esc(v.strength_vi)}</textarea></label>
        <label class="fld"><span>${bi('i18n.lang_zh')}</span><textarea class="inp" rows="2" maxlength="3000" id="rp-szh">${esc(v.strength_zh)}</textarea></label></fieldset>
      <fieldset class="bi-pair"><legend>${bi('aud.summary')} <span class="req">*</span></legend>
        <label class="fld"><span>${bi('i18n.lang_vi')}</span><textarea class="inp" rows="3" maxlength="3000" id="rp-vi">${esc(v.summary_vi)}</textarea></label>
        <label class="fld"><span>${bi('i18n.lang_zh')}</span><textarea class="inp" rows="2" maxlength="3000" id="rp-zh">${esc(v.summary_zh)}</textarea></label>
        <div class="hint">${bi('aud.summary_hint')}</div></fieldset>
      <p class="muted small">${bi('aud.report_note')}</p>`,
    actions: [{ label: bi('btn.cancel'), value: null }, { label: bi('aud.report_send'), kind: 'primary', read: (w) => ({
      report_date: $('#rp-date', w).value, strength_vi: $('#rp-svi', w).value.trim(), strength_zh: $('#rp-szh', w).value.trim(),
      summary_vi: $('#rp-vi', w).value.trim(), summary_zh: $('#rp-zh', w).value.trim() }) }]
  });
}

/** Biểu liên quan của một điều khoản (mã, ○◐●, ! khi kỳ gần nhất quá hạn hồ sơ) */
function formChips(forms, sm) {
  if (!forms.length) return `<span class="muted small">${bi('aud.no_forms')}</span>`;
  return forms.slice(0, 12).map((it) => {
    const s = sm && sm.get(it.item_id);
    return `<a class="aud-fchip" href="#/item/${encodeURIComponent(it.item_id)}">${stIcon(it.status)}<span class="code">${esc(it.code)}</span>${s && s.overdue ? ' <b class="t-red-text">!</b>' : ''}</a>`;
  }).join(' ') + (forms.length > 12 ? ` <span class="muted small">+${forms.length - 12}</span>` : '');
}

export async function renderAudit(view, ctx) {
  const { shell, params } = ctx;
  const a = await byId('AUDIT', params.id);
  shell.setScreen({ title: 'aud.title', back: '/audits' });
  if (!(await auditOn())) { notOn(view); return; }
  if (!a || a.archived_at) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('aud.not_found')}</p><a class="btn" href="#/audits">${bi('nav.audits')}</a></div>`; return; }
  const pg = await byId('AUD_PROG', a.program_id);
  const um = await users();
  const who = (id) => esc(userName(um, id) || '');
  const checks = await checksOf(a.audit_id);
  const fOn = await findingOn();
  const findings = fOn ? await findingsOf(a.audit_id) : [];
  const capaMap = new Map((await recs('CAPA')).map((c) => [c.capa_id, c]));
  const clauses = await recs('CLAUSE');
  const clMap = new Map(clauses.map((c) => [c.clause_id, c]));
  const formsMap = formsByClause(await items(), clauses);
  const sm = canSeeRecords() ? await recordStatusMap() : null;
  const online = navigator.onLine;
  const t = today();
  const plan = canPlanAudit(a);
  const editChecks = canEditChecks(a);
  const recordable = a.state === 'IN_PROGRESS' && canRecordAudit(a);
  const live = a.state === 'PLANNED' || a.state === 'READY';
  const canEdit = live && (plan || (isSecretary() && pg && pg.state === 'DRAFT'));
  const team = auditTeam(a);
  const cnt = { C: 0, NC: 0, OBS: 0, NA: 0 };
  checks.forEach((c) => { if (c.result) cnt[c.result]++; });
  const done = checks.filter((c) => c.result).length;
  const btns = [];
  if (a.state === 'PLANNED' && plan) btns.push(`<button type="button" class="btn primary" id="aud-ready" ${online ? '' : 'disabled'}>${ICON.check}<span>${bi('aud.ready')}</span></button>`);
  if (a.state === 'READY' && plan) btns.push(`<button type="button" class="btn" id="aud-unready" ${online ? '' : 'disabled'}>${bi('aud.unready')}</button>`);
  if (a.state === 'READY' && canRecordAudit(a)) btns.push(`<button type="button" class="btn primary" id="aud-start" ${online && String(a.audit_date || '') <= t ? '' : 'disabled'}>${ICON.checklist}<span>${bi('aud.start')}</span></button>`);
  if (a.state === 'IN_PROGRESS' && canRecordAudit(a) && !done && !findings.length) btns.push(`<button type="button" class="btn" id="aud-unstart" ${online ? '' : 'disabled'}>${bi('aud.unstart')}</button>`);
  // Báo cáo, đóng đợt (4b)
  const gaps = auditReportGaps(checks, findings);
  const cgaps = auditCloseGaps(findings, capaMap);
  const linked = findings.some((f) => findingCapa(f, capaMap) || (f.capa_id && !capaMap.has(f.capa_id)));
  if (fOn && a.state === 'IN_PROGRESS' && canReportAudit(a)) btns.push(`<button type="button" class="btn primary" id="aud-report" ${online && checks.length ? '' : 'disabled'}>${ICON.check}<span>${bi('aud.report')}</span></button>`);
  if (fOn && a.state === 'REPORTED' && canReportAudit(a) && !linked) btns.push(`<button type="button" class="btn" id="aud-unreport" ${online ? '' : 'disabled'}>${bi('aud.unreport')}</button>`);
  if (fOn && a.state === 'REPORTED' && canCloseAudit()) btns.push(`<button type="button" class="btn primary" id="aud-close" ${online && !cgaps.noCapa.length && !cgaps.open.length ? '' : 'disabled'}>${ICON.check}<span>${bi('aud.close')}</span></button>`);
  if (live && isSecretary() && pg && pg.state === 'DRAFT') btns.push(`<button type="button" class="btn danger" id="aud-cancel" ${online ? '' : 'disabled'}>${ICON.trash}<span>${bi(a.code ? 'aud.cancel' : 'aud.remove')}</span></button>`);
  let banner = '';
  if (a.state === 'PLANNED' && pg && pg.state !== 'APPROVED') banner = `<p class="banner small">${bi('aud.need_approval')}</p>`;
  else if (a.state === 'PLANNED') banner = `<p class="banner ${auditLate(a) ? 'err' : 'info'} small">${bi('aud.planned_note')}</p>`;
  else if (a.state === 'READY') banner = `<p class="banner ${auditLate(a) ? 'err' : 'info'} small">${bi(String(a.audit_date) <= t ? 'aud.ready_today' : 'aud.ready_note', { D: esc(fmtDate(a.audit_date)) })}</p>`;
  else if (a.state === 'IN_PROGRESS') banner = `<p class="banner info small">${bi(fOn ? 'aud.in_progress_note_4b' : 'aud.in_progress_note', { D: done, N: checks.length })}</p>`;
  else if (a.state === 'REPORTED') banner = `<p class="banner info small">${bi('aud.reported_note', { D: esc(fmtDate(a.report_date || a.reported_at)) })}</p>`;
  else if (a.state === 'CLOSED') banner = `<p class="banner ok small">${bi('aud.closed_note', { D: esc(fmtDate(a.closed_at)), U: who(a.closed_by) })}</p>`;
  else if (a.state === 'CANCELLED') banner = `<p class="banner small">${bi('capa.cancelled_by', { U: who(a.cancelled_by), D: esc(fmtDate(a.cancelled_at)) })}${a.cancel_reason ? ': ' + esc(a.cancel_reason) : ''}</p>`;
  const reportOn = await can('report.run');
  const st = session.settings || {};
  const fndByCheck = new Map(findings.filter((f) => f.check_id).map((f) => [f.check_id, f]));
  const byCheckSeq = new Map(checks.map((c) => [c.check_id, c.seq]));
  const editFnd = a.state === 'IN_PROGRESS' && recordable;
  const capaCell = (f) => {
    const c = findingCapa(f, capaMap);
    if (c) return `<a class="aud-capa-link" href="#/capa/${encodeURIComponent(c.capa_id)}"><span class="code">${esc(c.code)}</span></a> ${badge('capa.state.' + c.state)}`;
    if (f.capa_id && !capaMap.has(f.capa_id)) return `<span class="muted small">${bi('aud.capa_hidden')}</span>`;
    const can2 = a.state === 'REPORTED' && canCreateCapa(a.dept_code);
    return `${findingIsNc(f) ? `<span class="t-red-text small">${bi('aud.capa_none')}</span>` : `<span class="muted small">${bi('aud.capa_optional')}</span>`}
      ${can2 ? `<a class="btn tiny${findingIsNc(f) ? ' primary' : ''}" data-capa="${esc(f.finding_id)}" href="#/capa/new?finding=${encodeURIComponent(f.finding_id)}">${ICON.plus}<span>${bi('aud.capa_new')}</span></a>` : ''}`;
  };
  const findingsHtml = () => {
    const cntF = { MAJOR: 0, MINOR: 0, OBS: 0 };
    findings.forEach((f) => { cntF[f.ftype] = (cntF[f.ftype] || 0) + 1; });
    return `<section class="card aud-findings"><div class="card-head"><h3>${bi('aud.findings')} <span class="muted small">${findings.length ? AUDIT_FINDING_TYPES.filter((x) => cntF[x]).map((x) => `${biText('aud.ftype.' + x)} ${cntF[x]}`).join(' · ') : ''}</span></h3></div>
      ${findings.length ? `<ul class="plain aud-find-list">${findings.map((f) => {
        const cl = clMap.get(f.clause_id);
        return `<li class="aud-find" id="aud-f-${esc(f.finding_id)}" data-id="${esc(f.finding_id)}">
          <div class="aud-check-top"><span class="code">${esc(f.code)}</span>${cl ? ` <span class="code">${clauseLab(cl)}</span>` : ''}${byCheckSeq.has(f.check_id) ? ` <span class="muted small">${bi('aud.check_n', { N: esc(byCheckSeq.get(f.check_id)) })}</span>` : ''} ${badge('aud.ftype.' + f.ftype)}</div>
          <p class="small">${pair(f.content_vi, f.content_zh)}</p>
          ${f.evidence_vi || f.evidence_zh ? `<div class="aud-ev small"><span class="muted">${bi('aud.evidence')}:</span> ${pair(f.evidence_vi, f.evidence_zh)}</div>` : ''}
          ${a.state !== 'IN_PROGRESS' ? `<div class="small aud-find-capa">${bi('aud.capa')}: ${capaCell(f)}</div>` : ''}
          ${editFnd ? `<div class="row aud-check-btns"><button type="button" class="btn tiny" data-fed="${esc(f.finding_id)}" ${online ? '' : 'disabled'}>${ICON.edit}<span>${bi('btn.edit')}</span></button>
            <button type="button" class="btn tiny" data-frm="${esc(f.finding_id)}" ${online ? '' : 'disabled'}>${ICON.trash}<span>${bi('btn.delete')}</span></button></div>` : ''}
        </li>`;
      }).join('')}</ul>` : `<p class="muted small">${bi('aud.findings_none')}</p>`}
      ${a.state === 'IN_PROGRESS' && gaps.missing.length ? `<p class="small t-red-text aud-fnd-missing">${bi('aud.fnd_missing', { N: gaps.missing.length, S: gaps.missing.map((c) => c.seq).join(', ') })}</p>` : ''}
      ${editFnd ? `<div class="row"><button type="button" class="btn small" id="aud-fnd-add" ${online ? '' : 'disabled'}>${ICON.plus}<span>${bi('aud.fnd_add')}</span></button></div>` : ''}
      ${a.state === 'REPORTED' ? `<p class="muted small">${bi('aud.capa_hint')}</p>` : ''}
    </section>`;
  };
  const reportHtml = () => `<section class="card aud-report-view"><h3>${bi('aud.report_title')}</h3>
      ${kv('aud.report_date', esc(fmtDate(a.report_date)))}
      ${a.reported_by ? kv('aud.reported_by', `${who(a.reported_by)} · ${esc(fmtDateTime(a.reported_at))}`) : ''}
      ${a.strength_vi || a.strength_zh ? `<div class="kv-block"><span class="muted small">${bi('aud.strength')}</span><p>${pair(a.strength_vi, a.strength_zh)}</p></div>` : ''}
      <div class="kv-block"><span class="muted small">${bi('aud.summary')}</span><p>${pair(a.summary_vi, a.summary_zh)}</p></div>
      ${a.state === 'CLOSED' ? kv('aud.closed_at', `${esc(fmtDate(a.closed_at))} · ${who(a.closed_by)}`) + (a.close_note ? kv('aud.close_note', esc(a.close_note)) : '') : ''}
    </section>`;
  view.innerHTML = `<div class="item aud">
    <section class="card item-head">
      <div class="rec-top"><span class="code big">${auditCode(a)}</span>${auditBadges(a)}</div>
      <h2 class="item-name">${pair(a.title_vi, a.title_zh, a.i18n_meta, 'title')}</h2>
      <p class="small">${esc(a.dept_code)} · ${pg ? `<a href="#/audits?y=${esc(pg.year)}">${esc(pg.code)}</a> ${badge('aud.prog.state.' + pg.state)}` : ''}</p>
      ${banner}
    </section>
    <section class="card aud-plan"><div class="card-head"><h3>${bi('aud.sec_plan')}</h3>${canEdit ? `<a class="btn tiny" id="aud-edit" href="#/audit/${encodeURIComponent(a.audit_id)}/edit">${ICON.edit}<span>${bi('btn.edit')}</span></a>` : ''}</div>
      ${kv('aud.month', monthText(a.plan_month))}
      ${kv('aud.date', a.audit_date ? `<span class="${auditLate(a) ? 't-red-text' : ''}">${esc(fmtDate(a.audit_date))}</span>${a.time_text ? ' · ' + esc(a.time_text) : ''}` : `<span class="muted">${bi('aud.date_none')}</span>`)}
      ${kv('aud.place', esc(a.place_text || ''))}
      ${kv('aud.auditee', esc(a.auditee_text || ''))}
      <div class="kv-block"><span class="muted small">${bi('aud.team')}</span>${team.length ? `<ul class="plain aud-team-view">${team.map((m) => `<li>${m.r === 'L' ? badge('aud.role.L') + ' ' : ''}<strong>${esc(m.n || userName(um, m.u))}</strong>${m.d ? ` <span class="muted small">${esc(m.d)}</span>` : ''}${m.u ? '' : ` <span class="muted small">${bi('aud.outside_short')}</span>`}</li>`).join('')}</ul>` : `<p class="muted small">${bi('aud.team_none')}</p>`}</div>
      ${a.note_vi || a.note_zh ? `<div class="kv-block"><span class="muted small">${bi('aud.note')}</span><p>${pair(a.note_vi, a.note_zh, a.i18n_meta, 'note')}</p></div>` : ''}
      ${a.state === 'READY' || a.ready_at ? kv('aud.ready_by', `${who(a.ready_by)} · ${esc(fmtDateTime(a.ready_at))}`) : ''}
    </section>
    <section class="card aud-clauses-view"><h3>${bi('aud.clauses')} <span class="muted small">${(a.clauses_json || []).length}</span></h3>
      <ul class="plain">${(a.clauses_json || []).map((id) => { const c = clMap.get(id); return `<li class="aud-cl-row"><div><b>${clauseLab(c) || esc(id)}</b> ${c ? esc(nameText(c)) : ''}</div><div class="aud-forms">${formChips(formsMap.get(id) || [], sm)}</div></li>`; }).join('')}</ul>
      <p class="muted small">${bi('aud.forms_hint')}</p>
    </section>
    <section class="card aud-checks"><div class="card-head"><h3>${bi('aud.checklist')} <span class="muted small">${checks.length ? bi('aud.checks_done', { D: done, N: checks.length }) : ''}</span></h3></div>
      ${done ? `<p class="small">${AUDIT_RESULTS.filter((x) => cnt[x]).map((x) => `${badge('aud.result.' + x)} ${cnt[x]}`).join(' · ')}</p>` : ''}
      ${checks.length ? `<ul class="plain aud-check-list">${checks.map((c) => {
        const cl = clMap.get(c.clause_id);
        return `<li class="aud-check" data-id="${esc(c.check_id)}">
          <div class="aud-check-top"><strong>${esc(c.seq)}.</strong> ${cl ? `<span class="code">${clauseLab(cl)}</span>` : `<span class="muted small">${bi('aud.clause_general')}</span>`} ${c.result ? badge('aud.result.' + c.result) : ''}</div>
          <p class="small">${pair(c.question_vi, c.question_zh, c.i18n_meta, 'question')}</p>
          ${c.evidence_vi || c.evidence_zh ? `<div class="aud-ev small"><span class="muted">${bi('aud.evidence')}:</span> ${pair(c.evidence_vi, c.evidence_zh)}${c.checked_by ? ` <span class="muted">— ${who(c.checked_by)}</span>` : ''}</div>` : ''}
          ${fndByCheck.has(c.check_id) ? `<div class="small aud-check-fnd">${bi('aud.fnd_short')}: <span class="code">${esc(fndByCheck.get(c.check_id).code)}</span> ${badge('aud.ftype.' + fndByCheck.get(c.check_id).ftype)}</div>` : ''}
          <div class="row aud-check-btns">
            ${recordable ? `<button type="button" class="btn tiny${c.result ? '' : ' primary'}" data-rec="${esc(c.check_id)}" ${online ? '' : 'disabled'}>${bi(c.result ? 'aud.record_edit' : 'aud.record')}</button>` : ''}
            ${fOn && recordable && (c.result === 'NC' || c.result === 'OBS') && !fndByCheck.has(c.check_id) ? `<button type="button" class="btn tiny primary" data-fck="${esc(c.check_id)}" ${online ? '' : 'disabled'}>${ICON.plus}<span>${bi('aud.fnd_from_check')}</span></button>` : ''}
            ${editChecks && !c.result ? `<button type="button" class="btn tiny" data-ed="${esc(c.check_id)}" ${online ? '' : 'disabled'}>${ICON.edit}<span>${bi('btn.edit')}</span></button>
              <button type="button" class="btn tiny" data-rm="${esc(c.check_id)}" ${online ? '' : 'disabled'}>${ICON.trash}<span>${bi('btn.delete')}</span></button>` : ''}
          </div></li>`;
      }).join('')}</ul>` : `<p class="muted small">${bi('aud.checks_none')}</p>`}
      ${editChecks ? `<div class="row"><button type="button" class="btn small" id="aud-suggest" ${online ? '' : 'disabled'}>${ICON.checklist}<span>${bi('aud.suggest')}</span></button>
        <button type="button" class="btn small" id="aud-check-add" ${online ? '' : 'disabled'}>${ICON.plus}<span>${bi('aud.check_add')}</span></button></div>` : ''}
      ${a.state === 'IN_PROGRESS' && !fOn ? `<p class="muted small">${bi('aud.next_4b')}</p>` : ''}
    </section>
    ${fOn && (a.state === 'IN_PROGRESS' || a.state === 'REPORTED' || a.state === 'CLOSED') ? findingsHtml() : ''}
    ${fOn && (a.state === 'REPORTED' || a.state === 'CLOSED') ? reportHtml() : ''}
    ${btns.length ? `<div class="row item-actions">${btns.join('')}</div>` : ''}
    ${a.state === 'READY' && String(a.audit_date || '') > t && canRecordAudit(a) ? `<p class="muted small">${bi('aud.start_wait', { D: esc(fmtDate(a.audit_date)) })}</p>` : ''}
    ${a.state === 'REPORTED' && canCloseAudit() && (cgaps.noCapa.length || cgaps.open.length) ? `<p class="muted small aud-close-wait">${bi('aud.close_wait', { A: cgaps.noCapa.length, B: cgaps.open.length })}</p>` : ''}
    ${reportOn ? `<div class="capa-prints aud-prints">${['PLAN', 'CHECKLIST'].concat(fOn && ['IN_PROGRESS', 'REPORTED', 'CLOSED'].includes(a.state) ? ['REPORT'] : []).map((f) => {
      const code = st[{ PLAN: 'audit_plan_form_code', CHECKLIST: 'audit_checklist_form_code', REPORT: 'audit_report_form_code' }[f]] || '';
      return `<a class="small rp-link" data-form="${f}" href="#/reports?kind=AUDIT&audit=${encodeURIComponent(a.audit_id)}&form=${f}">${ICON.print} ${bi('aud.print.' + f)}${code ? ` <span class="code">${esc(code)}</span>` : ''} ›</a>`;
    }).join('')}</div>` : ''}
    ${!online && (btns.length || editChecks || recordable) ? `<p class="muted small">${bi('sync.need_network')}</p>` : ''}
  </div>`;
  const again = async (msgKey, vars) => { await afterCommit(); if (msgKey) toast(bi(msgKey, vars), 'ok'); if (ctx.isCurrent && !ctx.isCurrent()) return; refresh(); };
  const on = (sel, fn) => view.querySelectorAll(sel).forEach((b) => b.addEventListener('click', async () => { busy(b, true); try { await fn(b); } finally { busy(b, false); } }));
  const step = async (action, payload, okKey) => {
    const res = await writeOnline(action, payload, { expected_version: a.record_version });
    if (res.ok) return again(okKey);
    writeFail(res);
  };
  on('#aud-ready', () => step('iaudit.ready', { audit_id: a.audit_id }, 'aud.ready_ok'));
  on('#aud-unready', () => step('iaudit.ready', { audit_id: a.audit_id, undo: true }, 'aud.unready_ok'));
  on('#aud-start', () => step('iaudit.start', { audit_id: a.audit_id }, 'aud.started_ok'));
  on('#aud-unstart', () => step('iaudit.start', { audit_id: a.audit_id, undo: true }, 'aud.unstarted_ok'));
  on('#aud-cancel', async () => {
    const reason = await askText(a.code ? 'aud.cancel' : 'aud.remove', 'field.reason', { required: !!a.code, note: biText(a.code ? 'aud.cancel_note' : 'aud.remove_note') });
    if (reason === null) return;
    const res = await writeOnline('iaudit.cancel', { audit_id: a.audit_id, reason }, { expected_version: a.record_version });
    if (res.ok) { await afterCommit(); toast(bi('aud.cancelled_ok'), 'ok'); navigate('/audits?y=' + (pg ? pg.year : ''), { replace: true }); return; }
    writeFail(res);
  });
  on('#aud-suggest', async () => {
    const lines = (a.clauses_json || []).map((id) => clMap.get(id)).filter(Boolean).map((c) => suggestLine(c, formsMap.get(c.clause_id) || []));
    const has = new Set(checks.map((c) => c.clause_id).filter(Boolean));
    const pick = await suggestDialog(lines, has);
    if (!pick || !pick.length) return;
    const res = await writeOnline('iaudit.check.add', { audit_id: a.audit_id, lines: pick.map((l) => ({ check_id: uuid(), ...l })) });
    if (res.ok) return again('aud.checks_added', { N: pick.length });
    writeFail(res);
  });
  on('#aud-check-add', async () => {
    let prev = null;
    for (;;) {
      const v = await checkDialog(a, clMap, null, prev);
      if (!v) return;
      prev = v;
      if (!v.question_vi && !v.question_zh) { toast(bi('field.one_lang'), 'err'); continue; }
      const res = await writeOnline('iaudit.check.save', { check_id: uuid(), audit_id: a.audit_id, ...v });
      if (res.ok) return again('aud.check_saved');
      writeFail(res);
      if (res.code !== 'VALIDATION_ERROR') return;
    }
  });
  const byCheck = new Map(checks.map((c) => [c.check_id, c]));
  on('[data-ed]', async (b) => {
    const c = byCheck.get(b.dataset.ed);
    let prev = null;
    for (;;) {
      const v = await checkDialog(a, clMap, c, prev);
      if (!v) return;
      prev = v;
      if (!v.question_vi && !v.question_zh) { toast(bi('field.one_lang'), 'err'); continue; }
      const res = await writeOnline('iaudit.check.save', { check_id: c.check_id, ...v }, { expected_version: c.record_version });
      if (res.ok) return again('aud.check_saved');
      writeFail(res);
      if (res.code !== 'VALIDATION_ERROR') return;
    }
  });
  on('[data-rm]', async (b) => {
    const c = byCheck.get(b.dataset.rm);
    const ok = await dialog({ title: bi('aud.check_remove'), body: `<p class="small">${pair(c.question_vi, c.question_zh)}</p>`,
      actions: [{ label: bi('btn.cancel'), value: false }, { label: bi('btn.delete'), kind: 'danger', value: true }] });
    if (!ok) return;
    const res = await writeOnline('iaudit.check.save', { check_id: c.check_id, remove: true }, { expected_version: c.record_version });
    if (res.ok) return again('aud.check_removed');
    writeFail(res);
  });
  on('[data-rec]', async (b) => {
    const c = byCheck.get(b.dataset.rec);
    let prev = null;
    for (;;) {
      const v = await recordDialog(c, prev);
      if (!v) return;
      prev = v;
      if (!v.result) { toast(bi('aud.need_result'), 'err'); continue; }
      if ((v.result === 'NC' || v.result === 'OBS') && !v.evidence_vi && !v.evidence_zh) { toast(bi('aud.need_evidence'), 'err'); continue; }
      const res = await writeOnline('iaudit.check.record', { check_id: c.check_id, ...v }, { expected_version: c.record_version });
      if (res.ok) return again('aud.recorded_ok');
      writeFail(res);
      if (res.code !== 'VALIDATION_ERROR') return;
    }
  });
  // Phát hiện (4b)
  const saveFinding = async (f, check0) => {
    let prev = null;
    for (;;) {
      const v = await findingDialog(a, clMap, checks, findings, f, check0, prev);
      if (!v) return;
      prev = v;
      if (!v.ftype) { toast(bi('aud.fnd_need_type'), 'err'); continue; }
      if (!v.content_vi && !v.content_zh) { toast(bi('field.one_lang'), 'err'); continue; }
      const ck = v.check_id ? byCheck.get(v.check_id) : null;
      if (ck && !findingTypeFits(ck.result, v.ftype)) { toast(bi('aud.fnd_type_fit'), 'err'); continue; }
      const res = f ? await writeOnline('iaudit.finding.save', { finding_id: f.finding_id, ...v }, { expected_version: f.record_version })
        : await writeOnline('iaudit.finding.save', { finding_id: uuid(), audit_id: a.audit_id, ...v });
      if (res.ok) return again('aud.fnd_saved');
      writeFail(res);
      if (res.code !== 'VALIDATION_ERROR') return;
    }
  };
  const byFnd = new Map(findings.map((f) => [f.finding_id, f]));
  on('[data-fck]', (b) => saveFinding(null, byCheck.get(b.dataset.fck)));
  on('#aud-fnd-add', () => saveFinding(null, null));
  on('[data-fed]', (b) => saveFinding(byFnd.get(b.dataset.fed), null));
  on('[data-frm]', async (b) => {
    const f = byFnd.get(b.dataset.frm);
    const ok = await dialog({ title: bi('aud.fnd_remove'), body: `<p class="small"><span class="code">${esc(f.code)}</span> ${pair(f.content_vi, f.content_zh)}</p>`,
      actions: [{ label: bi('btn.cancel'), value: false }, { label: bi('btn.delete'), kind: 'danger', value: true }] });
    if (!ok) return;
    const res = await writeOnline('iaudit.finding.save', { finding_id: f.finding_id, remove: true }, { expected_version: f.record_version });
    if (res.ok) return again('aud.fnd_removed');
    writeFail(res);
  });
  on('#aud-report', async () => {
    if (gaps.unrecorded.length) { toast(bi('aud.report_unrecorded', { N: gaps.unrecorded.length }), 'err'); return; }
    if (gaps.missing.length) { toast(bi('aud.fnd_missing', { N: gaps.missing.length, S: gaps.missing.map((c) => c.seq).join(', ') }), 'err'); return; }
    const cntF = { A: 0, B: 0, C: 0 };
    findings.forEach((f) => { if (f.ftype === 'MAJOR') cntF.A++; else if (f.ftype === 'MINOR') cntF.B++; else cntF.C++; });
    let prev = null;
    for (;;) {
      const v = await reportDialog(a, cntF, prev);
      if (!v) return;
      prev = v;
      if (!v.summary_vi && !v.summary_zh) { toast(bi('aud.summary_need'), 'err'); continue; }
      const res = await writeOnline('iaudit.report', { audit_id: a.audit_id, ...v }, { expected_version: a.record_version });
      if (res.ok) return again('aud.reported_ok');
      writeFail(res);
      if (res.code !== 'VALIDATION_ERROR') return;
    }
  });
  on('#aud-unreport', () => step('iaudit.report', { audit_id: a.audit_id, undo: true }, 'aud.unreported_ok'));
  on('#aud-close', async () => {
    const note = await askText('aud.close', 'aud.close_note', { note: biText('aud.close_confirm') });
    if (note === null) return;
    const res = await writeWithPin('iaudit.close', { audit_id: a.audit_id, note }, { expected_version: a.record_version });
    if (res.ok) return again('aud.closed_ok');
    writeFail(res);
  });
}
