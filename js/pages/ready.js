// Kiểm tra ISO · 审核准备 (25/11/2026, người dùng yêu cầu): một danh sách nhìn vào là biết biểu nào đã có (in được ngay khi đánh giá viên
// yêu cầu), biểu nào còn thiếu để bổ sung. Đã có = có tệp mẫu trong Kho tệp mẫu, hoặc biểu in từ app M&E / Checksheet (js/readyx.js).
// 26/11/2026 thêm Đã làm / Chưa làm (biểu đã có hồ sơ chưa — người dùng: "nhiều biểu ra rồi mà chưa biết biểu nào đã làm biểu nào
// chưa") và nút Ghi đã làm (→ Nộp hồ sơ; hồ sơ giấy không cần ảnh, ghi nơi lưu).
// Tổng Có mẫu X/Y · Đã làm D/Y; lọc Tất cả / Thiếu mẫu / Chưa làm / Đã làm, bộ phận; danh sách theo nhóm, nút In (tải riêng biểu);
// tải danh sách ra Excel (logo công ty ở đầu, như báo cáo). Tính trên máy từ dữ liệu đã đồng bộ; nút In cần mạng (tệp trên Drive).
// Quyền như Phủ điều khoản: cấp 2+ và Thư ký ISO. iPhone: lọc bằng nút và ô chọn, không có ô gõ (không bật bàn phím).
import { bi, biText, esc, nameText, fmtDate, session } from '../core.js';
import { ICON, setViewHtml, freshFilters, dialog, toast, $ } from '../ui.js';
import { items, recs, depts, can, canSeeRecords, isSecretary, seesAll, myDepts, groupText, today, scopeNames, scopeBi, recordsDoneMap, recordStatusMap,
  canSubmitRecord, recordCheck } from '../data.js';
import { tplMap, tplButton, wireTplButtons, paperText } from './tpl.js';
import { statusDot } from './catalog.js';
import { readyRows, readySummary, readyFilter, READY_FILTERS } from '../readyx.js';
import { openFile } from '../files.js';
import { isTouchMobile } from '../media.js';

const INIT = { f: '', dept: '' };
const state = { ...INIT };

function applyQuery(q) {
  if (!q) return;
  if (READY_FILTERS.includes(String(q.f || ''))) state.f = String(q.f || '');
  if (q.dept !== undefined) state.dept = String(q.dept);
}

const isXlsx = (t) => /spreadsheetml/.test((t && t.mime_type) || '') || /\.xlsx$/i.test((t && t.file_name) || '');
/** "vi\nzh" cho tiêu đề cột Excel */
const nl = (key) => biText(key).split(' · ').join('\n');

/** Dòng "cách có": tệp mẫu (bộ · sheet · khổ giấy) / in từ app / còn thiếu (kèm nơi làm khi là Một phần, Đề xuất) */
function howText(r) {
  if (r.how === 'TPL') {
    const t = r.tpl.t, s = r.tpl.s;
    const p = paperText(s);
    return `${bi('rd.how.TPL')}: ${esc(t.set_code || t.file_name)} · ${esc(s.n)}${p ? ' · ' + p : ''}${r.tpl.sub ? ' · ' + bi('tpl.sub') : ''}${r.app ? ' · ' + bi('rd.also_app.' + r.app) : ''}`;
  }
  if (r.how) return bi('rd.how.' + r.how);
  const w = r.it.where && r.it.where !== 'MANUAL' && r.it.where !== 'ME' && r.it.where !== 'CS' ? ' · ' + bi('where.' + r.it.where) : '';
  return bi('rd.no_tpl') + w;
}
/** Chữ thường (Excel) */
function howPlain(r) {
  if (r.how === 'TPL') {
    const t = r.tpl.t, s = r.tpl.s;
    return `${biText('rd.how.TPL')}: ${t.set_code || t.file_name} · ${s.n}${r.app ? ' · ' + biText('rd.also_app.' + r.app) : ''}`;
  }
  if (r.how) return biText('rd.how.' + r.how);
  return biText('rd.no_tpl') + (r.it.where && !['MANUAL', 'ME', 'CS'].includes(r.it.where) ? ' · ' + biText('where.' + r.it.where) : '');
}

/** Dòng "đã làm": ngày hồ sơ gần nhất, số lần, nguồn; chưa làm thì lý do (biểu in từ app, biểu chưa soạn) */
function doneText(r, st) {
  const late = st && st.overdue ? ` · <span class="t-red-text">! ${bi('rd.overdue')}</span>` : '';
  if (r.done) {
    const d = r.done;
    return `<span class="t-green-text">✓ ${bi('rd.done_last', { D: esc(fmtDate(d.last)) })}</span> · ${bi('rd.done_n', { N: d.n })}${d.src === 'APP' || d.src === 'QUEUE' ? ' · ' + bi('rd.done_src.' + d.src) : ''}${late}`;
  }
  const why = recordCheck(r.it);
  return `<span class="rd-todo-t">○ ${bi('rd.todo')}</span>${why === 'RECORD_FROM_APP' ? ' · ' + bi('rd.todo_app') : why === 'ITEM_NO_RECORD' ? ' · ' + bi('rd.todo_none') : ''}${late}`;
}

function rowHtml(r, st) {
  const it = r.it;
  const href = `#/item/${encodeURIComponent(it.item_id)}`;
  const btn = r.tpl ? tplButton(r.tpl.t.document_id, isXlsx(r.tpl.t) ? r.tpl.s.n : '', 'rd.print', 'btn small') : '';
  const mark = canSubmitRecord(it) && !recordCheck(it)
    ? `<a class="btn small${r.done ? '' : ' primary'} rd-mark" href="#/record/new?item=${encodeURIComponent(it.item_id)}">${ICON.check}<span>${bi('rd.mark_done')}</span></a>` : '';
  return `<li class="rd-row ${r.have ? 's-HAVE' : 's-MISSING'} ${r.done ? 'd-DONE' : 'd-TODO'}" data-code="${esc(it.code)}">
    <div class="rd-main">
      <div class="cat-top"><a class="code" href="${href}">${esc(it.code)}</a>${statusDot(it.status)}<span class="rd-tags"><span class="tag ${r.have ? 't-green' : 't-red'} rd-tag">${r.have ? '✓ ' + bi('rd.have') : '✗ ' + bi('rd.missing')}</span><span class="tag ${r.done ? 't-green' : 't-amber'} rd-dtag">${r.done ? '✓ ' + bi('rd.done') : '○ ' + bi('rd.todo')}</span></span></div>
      <a class="rd-name" href="${href}">${esc(it.name_vi || it.name_zh || '')}</a>${it.name_vi && it.name_zh ? `<div class="cat-zh">${esc(it.name_zh)}</div>` : ''}
      <div class="rd-how muted small">${howText(r)}</div>
      <div class="rd-done small">${doneText(r, st)}</div>
    </div>
    ${btn || mark ? `<div class="rd-act">${btn}${mark}</div>` : ''}
  </li>`;
}

export async function renderReady(view, ctx) {
  const { shell, query } = ctx;
  shell.setScreen({ title: 'nav.ready', back: '/', actions: canSeeRecords() ? [{ icon: 'excel', label: biText('rd.export'), id: 'rd-xlsx', onClick: () => exportXlsx() }] : [] });
  if (!canSeeRecords()) {
    view.innerHTML = `<div class="card empty-state">${ICON.check}<p class="muted">${bi('rd.no_access')}</p><a class="btn" href="#/templates">${ICON.folder}<span>${bi('nav.templates')}</span></a></div>`;
    return;
  }
  if (ctx.entered) { freshFilters(ctx, state, INIT); applyQuery(query); }
  const all = await items();
  const { byItem } = await tplMap();
  const deps = await depts();
  const deptOpts = deps.filter((d) => all.some((x) => x.dept_code === d.dept_code));
  if (state.dept && !deptOpts.some((d) => d.dept_code === state.dept)) state.dept = '';
  const grpMap = new Map((await recs('GROUP')).map((g) => [g.group_key, g]));
  const doneMap = await recordsDoneMap();
  const stMap = await recordStatusMap(all);
  const scope = await scopeNames();
  const canUp = isSecretary() && await can('tpl.upload');
  let cur = { rows: [], sum: null, na: [] };

  const draw = () => {
    const scoped = state.dept ? all.filter((x) => x.dept_code === state.dept) : all;
    const { rows, na } = readyRows(scoped, byItem, doneMap);
    const sum = readySummary(rows);
    const shown = readyFilter(rows, state.f);
    cur = { rows: shown, sum, na };
    const bar = (pct, cls = '') => `<div class="rd-bar${cls}" role="img" aria-label="${esc(String(pct))}%"><i style="width:${pct}%"></i></div>`;
    // Hai khối: Mẫu để in (có mẫu / thiếu mẫu) · Đã làm (đã có hồ sơ / chưa làm)
    const head = `<section class="card rd-sum"><div class="rd-two">
      <div class="rd-col rd-col-tpl"><div class="rd-k">${bi('rd.sum_tpl')}</div>
        <div class="rd-big"><span class="rd-n">${sum.have}</span><span class="rd-of">/${sum.total}</span> <span class="rd-lab">${bi('rd.have_of')}</span></div>
        ${bar(sum.pct)}
        <div class="rd-line">${sum.missing ? `<b class="t-red-text">✗ ${bi('rd.missing_n', { N: sum.missing })}</b>` : `<b class="t-green-text">✓ ${bi('rd.all_have')}</b>`}</div>
        <div class="muted small">${bi('rd.break', { A: sum.TPL, B: sum.ME, C: sum.CS })}</div></div>
      <div class="rd-col rd-col-done"><div class="rd-k">${bi('rd.sum_done')}</div>
        <div class="rd-big"><span class="rd-n rd-n-done">${sum.done}</span><span class="rd-of">/${sum.total}</span> <span class="rd-lab">${bi('rd.done_of')}</span></div>
        ${bar(sum.donePct, ' rd-bar-done')}
        <div class="rd-line">${sum.todo ? `<b class="t-amber-text">○ ${bi('rd.todo_n', { N: sum.todo })}</b>` : `<b class="t-green-text">✓ ${bi('rd.all_done')}</b>`}</div></div>
      </div>
      ${na.length ? `<div class="muted small">${bi('rd.na_n', { N: na.length })}</div>` : ''}
      ${scope ? `<div class="muted small">${scopeBi('scope.short', scope)}</div>` : ''}${seesAll() ? '' : `<div class="muted small">${bi('cov.scope_note', { D: esc(myDepts().join(', ')) })}</div>`}
    </section>`;
    const chips = `<div class="chips rd-chips" role="group" aria-label="${esc(biText('rd.filter'))}">
      <button type="button" class="chip${state.f === '' ? ' on' : ''}" data-f="">${bi('cat.all')} <b>${sum.total}</b></button>
      <button type="button" class="chip rd-chip-miss${state.f === 'MISSING' ? ' on' : ''}" data-f="MISSING">✗ ${bi('rd.missing')} <b>${sum.missing}</b></button>
      <button type="button" class="chip rd-chip-todo${state.f === 'TODO' ? ' on' : ''}" data-f="TODO">○ ${bi('rd.todo')} <b>${sum.todo}</b></button>
      <button type="button" class="chip${state.f === 'DONE' ? ' on' : ''}" data-f="DONE">✓ ${bi('rd.done')} <b>${sum.done}</b></button></div>`;
    const deptSel = deptOpts.length > 1 || state.dept ? `<label class="fld rg-dept"><span>${bi('cat.dept')}</span><select class="inp sel" id="rd-dept">
      <option value="">${esc(biText(seesAll() ? 'cov.all_company' : 'cat.all'))}</option>${deptOpts.map((d) => `<option value="${esc(d.dept_code)}"${state.dept === d.dept_code ? ' selected' : ''}>${esc(nameText(d))}</option>`).join('')}</select></label>` : '';
    let body;
    if (!rows.length) {
      body = `<div class="card empty-state">${ICON.library}<p class="muted">${bi('rd.empty')}</p></div>`;
    } else if (!shown.length) {
      body = `<div class="card empty-state"><p class="muted">${bi(state.f === 'MISSING' ? 'rd.none_missing' : state.f === 'TODO' ? 'rd.all_done' : 'cat.none_filter')}</p></div>`;
    } else {
      let last = null;
      const parts = [];
      for (const r of shown) {
        const g = r.it.group_key || '';
        if (g !== last) {
          if (last !== null) parts.push('</ul>');
          parts.push(`<h3 class="cov-group-h">${esc(groupText(grpMap.get(g), g) || '—')}</h3><ul class="rd-list">`);
          last = g;
        }
        parts.push(rowHtml(r, stMap.get(r.it.item_id)));
      }
      parts.push('</ul>');
      body = parts.join('');
    }
    const up = canUp && sum.missing && state.f === 'MISSING' ? `<p><a class="btn small" href="#/templates/upload">${ICON.upload}<span>${bi('tpl.upload')}</span></a></p>` : '';
    setViewHtml(view, `<div class="rd">${head}${chips}${deptSel}${up}${body}
      <p class="muted small rd-how-note">${bi('rd.how_note')}</p><p class="muted small">${bi('tpl.print_hint')}</p></div>`);
    wire();
  };
  const wire = () => {
    view.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { state.f = b.dataset.f; draw(); }));
    const sel = view.querySelector('#rd-dept');
    if (sel) sel.addEventListener('change', () => { state.dept = sel.value; draw(); });
    wireTplButtons(view);
  };

  /** Tải danh sách đang xem ra Excel: logo công ty ở đầu (như báo cáo), bảng Mã · Tên · Nhóm · Có / Thiếu · Cách có · Tình trạng */
  async function exportXlsx() {
    const btn = document.getElementById('rd-xlsx');
    if (btn) btn.disabled = true;
    try {
      const [{ reportExcelFile }, { reportLogo }] = await Promise.all([import('../report-xlsx.js'), import('../report-logo.js')]);
      let logo = null;
      try { logo = await reportLogo(); } catch (e) { logo = null; }
      const s = cur.sum;
      const d = today();
      const dmy = fmtDate(d);
      const title = biText('rd.x_title').split(' · ');
      const fLab = { MISSING: 'rd.missing', HAVE: 'rd.have', TODO: 'rd.todo', DONE: 'rd.done' };
      const filt = [state.f ? biText(fLab[state.f]) : biText('cat.all'),
        state.dept ? nameText(deps.find((x) => x.dept_code === state.dept)) : ''].filter(Boolean).join(' · ');
      const lay = {
        code: 'Kiem tra ISO', title_vi: title[0], title_zh: title[1] || '',
        meta_left: [[biText('rpt.f.scope'), scope ? `${scope.vi} · ${scope.zh}` : biText('cov.all_company')], [biText('rd.filter'), filt]],
        meta_right: [[biText('rd.x_date'), dmy], [biText('rpt.prepared_by'), (session.user && session.user.display_name) || '']],
        tiles: [
          { label: biText('rd.have'), value: `${s.have}/${s.total}`, tone: s.missing ? '' : 'green' },
          { label: biText('rd.missing'), value: String(s.missing), tone: s.missing ? 'red' : 'green' },
          { label: biText('rd.done'), value: `${s.done}/${s.total}`, tone: s.todo ? 'amber' : 'green' },
          { label: biText('rd.todo'), value: String(s.todo), tone: s.todo ? 'amber' : 'green' }
        ],
        sections: [{
          table: {
            head: [nl('rd.x_code'), nl('rd.x_name'), nl('cat.group'), nl('rd.x_have'), nl('rd.x_how'), nl('rd.x_done_col'), nl('cat.status')],
            types: ['code', 'text', 'text', 'mid', 'text', 'text', 'text'],
            rows: cur.rows.map((r) => [r.it.code, [r.it.name_vi, r.it.name_zh].filter(Boolean).join('\n'), groupText(grpMap.get(r.it.group_key), r.it.group_key) || '',
              r.have ? '✓ ' + biText('rd.have') : '✗ ' + biText('rd.missing'), howPlain(r),
              r.done ? `✓ ${fmtDate(r.done.last)} · ${biText('rd.done_n', { N: r.done.n })}` : '○ ' + biText('rd.todo'), biText('status.' + (r.it.status || 'NONE'))]),
            tones: cur.rows.map((r) => ['', '', '', r.have ? 'green' : 'red', '', r.done ? 'green' : 'amber', ''])
          }
        }],
        notes: [biText('rd.how_note')].concat(cur.na.length ? [biText('rd.na_n', { N: cur.na.length })] : []),
        none: biText('rpt.none'),
        sign: { prepared: biText('rpt.prepared_by'), approved: biText('rpt.approved_by'), hint: biText('rpt.sign_hint'), prepared_name: (session.user && session.user.display_name) || '', approved_name: '' },
        footer: `ISO · 体系管理 · ${title[0]} · ${dmy}`
      };
      const suf = { MISSING: '_thieu_mau', HAVE: '_co_mau', TODO: '_chua_lam', DONE: '_da_lam' }[state.f] || '';
      const file = await reportExcelFile(lay, logo, `Kiem_tra_ISO_${d}${suf}.xlsx`);
      if (!isTouchMobile()) { openFile(file).catch(() => {}); toast(bi('rd.x_done'), 'ok'); return; }
      await dialog({
        title: bi('rd.x_ready'),
        body: `<p class="muted small">${esc(file.name)}</p><button type="button" class="btn primary block" id="rd-open">${ICON.download}<span>${bi('rp.open_file')}</span></button>`,
        actions: [{ label: bi('btn.close'), value: true }],
        onOpen: (w) => $('#rd-open', w).addEventListener('click', () => { openFile(file).catch(() => {}); })
      });
    } catch (e) {
      toast(esc(String((e && e.message) || e)), 'err');
    } finally {
      if (btn) btn.disabled = false;
    }
  }
  draw();
}
