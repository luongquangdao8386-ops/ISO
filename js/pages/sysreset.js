// Xóa sạch dữ liệu (Đợt 4, phiên 4c — chỉ owner; người dùng chốt 13/11/2026: chọn lúc xóa giữ hay xóa danh mục). Tài khoản → Quản trị →
// Xóa sạch dữ liệu. Máy chủ sao lưu (phải VERIFIED) rồi mới xóa; đổi thế hệ dữ liệu → mọi máy (kể cả máy này) đăng nhập lại, app xóa dữ liệu
// cũ trên máy. Gõ đúng chữ XÓA TOÀN BỘ (nhận cả XOÁ, chữ thường — bài học M&E d4.6) rồi nhập PIN.
import { api, bi, esc, fmtDateTime, resMsg } from '../core.js';
import { ICON, toast, dialog, $ } from '../ui.js';
import { can } from '../data.js';
import { app } from '../app.js';
import { writeWithPin, writeFail, busy } from '../form.js';

const CONFIRM = 'XÓA TOÀN BỘ';
const MODES = ['KEEP_CATALOG', 'ALL'];
/** Bảng theo thứ tự hiện trên màn (nhãn reset.t.<bảng>) */
const TABLES = ['Items', 'Groups', 'Clauses', 'TplFiles', 'Versions', 'Records', 'Evidence', 'DocRequests', 'Distributions', 'Capas', 'CapaActions', 'Ncrs',
  'AuditPrograms', 'Audits', 'AuditChecks', 'AuditFindings', 'MgmtReviews', 'ReportRuns', 'ImportBatches', 'ImportRows', 'Documents', 'AuditLogs'];

/** Chuẩn hóa chữ xác nhận như máy chủ (resetConfirmOk_): NFC, khoảng trắng, chữ hoa, OÁ → ÓA */
export function confirmNorm(s) {
  return String(s || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleUpperCase('vi').replace(/OÁ/g, 'ÓA');
}

let mode = 'KEEP_CATALOG';

export async function renderReset(view, { shell }) {
  shell.setScreen({ title: 'admin.reset', back: '/account' });
  if (!(await can('system.reset'))) { view.innerHTML = `<div class="card empty-state"><p class="muted">${bi('err.forbidden')}</p></div>`; return; }
  if (!navigator.onLine) { view.innerHTML = `<div class="card empty-state">${ICON.sync}<p class="muted">${bi('sync.need_network')}</p></div>`; return; }
  view.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  const r = await api('system.reset.info', {}, { retry: true, timeoutMs: 90000 });
  if (!r.ok) { view.innerHTML = `<div class="card empty-state"><p class="err">${esc(resMsg(r))}</p></div>`; return; }
  const info = r.data;
  const plan = (m) => info.plans[m] || { counts: {} };
  const countsHtml = (m) => {
    const c = plan(m).counts || {};
    const rows = TABLES.filter((t) => c[t]).map((t) => `<li><span>${bi('reset.t.' + t)}</span><strong>${esc(String(c[t]))}</strong></li>`);
    return rows.length ? `<ul class="plain xs-counts">${rows.join('')}</ul>` : `<p class="muted small">${bi('reset.nothing')}</p>`;
  };
  const last = info.last;
  const lb = info.last_backup || {};
  const draw = () => {
    const p = plan(mode);
    view.innerHTML = `<section class="card xs-card">
      <h2>${bi('admin.reset')}</h2>
      <div class="banner ${info.env === 'THAT' ? 'err' : 'info'}">${bi(info.env === 'THAT' ? 'reset.env_that' : 'reset.env_thu')}</div>
      <p>${bi('reset.intro')}</p>
      <div class="kv"><span>${bi('reset.last_backup')}</span><strong>${lb.at ? esc(fmtDateTime(lb.at)) + ' · ' + esc(lb.status || '') : '—'}</strong></div>
      ${last ? `<div class="kv"><span>${bi('reset.last')}</span><strong class="${last.status === 'FAILED' ? 't-red-text' : ''}">${esc(fmtDateTime(last.at))} · ${bi('reset.mode_short.' + (last.mode || 'KEEP_CATALOG'))} · ${bi('reset.st.' + last.status)}${last.by ? ' · ' + esc(last.by) : ''}</strong></div>
        ${last.status === 'FAILED' && last.error ? `<p class="small t-red-text">${esc(last.error)}</p>` : ''}${last.trash_left ? `<p class="muted small">${bi('reset.trash_left', { N: last.trash_left })}</p>` : ''}` : ''}
      ${info.running ? `<div class="banner err">${bi('reset.running')}</div>` : ''}
    </section>
    <section class="card"><h2>${bi('reset.pick')}</h2>
      <div class="chips" role="radiogroup" id="rs-mode">${MODES.map((m) => `<button type="button" class="chip${mode === m ? ' on' : ''}" data-mode="${m}" role="radio" aria-checked="${mode === m}">${bi('reset.mode.' + m)}</button>`).join('')}</div>
      <p class="small">${bi('reset.mode_hint.' + mode)}</p>
      ${mode === 'KEEP_CATALOG' ? `<p class="small">${bi('reset.keep_items', { N: p.items_kept || 0, I: p.items_issued || 0, T: p.tpl_kept || 0 })}</p>` : ''}
      <h3>${bi('reset.will_delete')}</h3>${countsHtml(mode)}
      <h3>${bi('reset.always_keep')}</h3><p class="small">${bi('reset.always_keep_list')}</p>
    </section>
    <section class="card xs-confirm"><h2>${bi('reset.confirm_title')}</h2>
      <p class="small">${bi('reset.steps')}</p>
      <label class="fld"><span>${bi('reset.type', { T: CONFIRM })}</span><input class="inp" type="text" id="rs-text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${esc(CONFIRM)}"></label>
      <p class="small t-red-text" id="rs-text-hint" hidden>${bi('reset.type_wrong', { T: CONFIRM })}</p>
      <div class="row"><button type="button" class="btn primary danger" id="rs-go" disabled>${ICON.trash}<span>${bi('reset.go')}</span></button></div>
      <p class="muted small" id="rs-wait" hidden>${bi('reset.wait')}</p>
    </section>`;
    view.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; draw(); }));
    const inp = $('#rs-text', view), go = $('#rs-go', view), hint = $('#rs-text-hint', view);
    inp.addEventListener('input', () => {
      const ok = confirmNorm(inp.value) === CONFIRM;
      go.disabled = !ok;
      hint.hidden = ok || confirmNorm(inp.value).length < CONFIRM.length;
    });
    go.addEventListener('click', async () => {
      const yes = await dialog({ title: bi('reset.go'), body: `<p>${bi('reset.last_confirm.' + mode)}</p>`,
        actions: [{ label: bi('btn.cancel'), value: false }, { label: bi('reset.go'), kind: 'primary danger', value: true }] });
      if (!yes) return;
      busy(go, true);
      $('#rs-wait', view).hidden = false;
      const res = await writeWithPin('system.reset', { mode, confirm: inp.value }, { timeoutMs: 330000 });
      busy(go, false);
      $('#rs-wait', view).hidden = true;
      if (!res.ok) {
        if (res.code === 'VALIDATION_ERROR') { toast(esc((res.errors || []).map((e) => `${e.message_vi} · ${e.message_zh}`).join(' · ') || resMsg(res)), 'err'); return; }
        writeFail(res);
        return;
      }
      const d = res.data || {};
      const c = d.counts || {};
      await dialog({
        title: bi('reset.done'),
        body: `<p>${bi('reset.done_body', { B: esc(d.backup || '') })}</p>
          <ul class="plain xs-counts">${TABLES.filter((t) => c[t]).map((t) => `<li><span>${bi('reset.t.' + t)}</span><strong>${esc(String(c[t]))}</strong></li>`).join('') || `<li>${bi('reset.nothing')}</li>`}</ul>
          ${d.files_left ? `<p class="small">${bi('reset.trash_left', { N: d.files_left })}</p>` : ''}
          <p class="small">${bi('reset.relogin')}</p>`,
        actions: [{ label: bi('btn.relogin'), kind: 'primary', value: true }]
      });
      if (app.onSessionError) await app.onSessionError({ code: 'DATASET_RESET' });
    });
  };
  draw();
  if (info.running) toast(bi('reset.running'), 'err');
}
