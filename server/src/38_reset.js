/* 38_reset: Xóa sạch dữ liệu (Đợt 4, phiên 4c — nghiệm thu Đợt 4 "xóa sạch dữ liệu (owner) chạy được"). Người dùng chốt 13/11/2026: chọn lúc xóa
 * giữ hay xóa danh mục; chỉ thử trên giả lập (app chạy thẳng THẬT, không bấm trên THẬT khi chưa thật sự cần).
 * Chỉ owner (cấp 4 + is_system_owner), PIN, gõ đúng chữ XÓA TOÀN BỘ. Các bước (một lượt gọi, tối đa ~4,5 phút):
 *  1. Bật bảo trì (mọi người khác nhận SYSTEM_MAINTENANCE — app mở dữ liệu trên máy, dải đỏ "đang bảo trì").
 *  2. Sao lưu ngay (backupDataRun_) — phải VERIFIED, không thì tắt bảo trì, không xóa gì (RESET_BACKUP_FAILED).
 *  3. Dưới khóa ghi: đổi DATASET_EPOCH + thu hồi mọi phiên (DATASET_RESET: mọi máy kể cả owner đăng nhập lại, app xóa dữ liệu cũ trên máy);
 *     xóa các bảng nghiệp vụ (phiên bản, hồ sơ, ngày có hồ sơ từ M&E/Checksheet — tự lấy lại trong vòng 1 giờ, phiếu đề nghị, phân phối,
 *     khắc phục, sản phẩm không phù hợp, đánh giá nội bộ, xem xét lãnh đạo, báo cáo đã lưu, lô nhập Excel, Operations); Documents của các bảng
 *     đó; nhật ký thao tác nghiệp vụ (giữ đăng nhập, người dùng, cài đặt, sao lưu, hệ thống…); thư Gmail đang chờ → SKIPPED RESET.
 *     - Giữ danh mục (KEEP_CATALOG): giữ biểu / tài liệu (tình trạng, lần và ngày ban hành, hạn rà soát, mã tem QR), nhóm, điều khoản, kho tệp mẫu;
 *       biểu ● mất tệp phiên bản → "chưa có tệp" như vừa nhập từ Excel; ngày bắt đầu tính hồ sơ = hôm nay.
 *     - Xóa cả danh mục (ALL): xóa thêm biểu, nhóm, điều khoản, kho tệp mẫu; nhập lại file Excel tổng sau đó (ngày bắt đầu tính hồ sơ đặt lại
 *       khi nhập).
 *     Luôn giữ: người dùng, PIN, phiên (đã thu hồi), bộ phận, cài đặt, logo, ảnh nền, kết nối M&E / Checksheet, Gmail (người nhận, nhật ký đã
 *     gửi), bộ đếm mã (HS, KP, NC, BC… không quay lại 001), sao lưu cũ.
 *  4. Tắt bảo trì; bỏ tệp Drive của các dòng đã xóa vào thùng rác (hết thời gian thì phần còn lại để trigger runBackgroundJobs làm tiếp). */

var RESET_CONFIRM_TEXT_ = 'XÓA TOÀN BỘ';
var RESET_MODES_ = ['KEEP_CATALOG', 'ALL'];
/** Bảng xóa ở cả hai cách (Operations: nhật ký chống gửi trùng — không đếm) */
var RESET_WIPE_ALWAYS_ = ['Versions', 'Records', 'Evidence', 'DocRequests', 'Distributions', 'Capas', 'CapaActions', 'Ncrs', 'AuditPrograms', 'Audits',
  'AuditChecks', 'AuditFindings', 'MgmtReviews', 'ReportRuns', 'ImportBatches', 'ImportRows', 'Operations'];
/** Thêm khi xóa cả danh mục */
var RESET_WIPE_CATALOG_ = ['Items', 'Groups', 'Clauses', 'TplFiles'];
/** Nhật ký giữ lại: đăng nhập, PIN, phiên, người dùng, cài đặt, sao lưu, hệ thống, bộ phận, Gmail, kết nối, logo, ảnh nền, hàm chạy tay */
var RESET_KEEP_AUDIT_RE_ = /^(auth|pin|session|user|settings|backup|system|dept|mail|link|bg|admin|sample)\.|^report\.logo/;
var RESET_BUDGET_MS_ = 270000;
var RESET_RUNNING_MS_ = 15 * 60000;

/** Chữ xác nhận: chấp nhận hai kiểu bỏ dấu (XÓA / XOÁ), chữ thường, khoảng trắng thừa (bài học M&E d4.6) */
function resetConfirmOk_(s) {
  var t = String(s || '').normalize('NFC').trim().replace(/\s+/g, ' ').toUpperCase().replace(/OÁ/g, 'ÓA');
  return t === RESET_CONFIRM_TEXT_;
}

function resetRunning_() {
  var t = Number(prop_('RESET_RUNNING') || 0);
  return !!t && Date.now() - t < RESET_RUNNING_MS_;
}

/** Số dòng sẽ xóa theo cách xóa (không đọc nội dung tệp) */
function resetPlan_(mode) {
  var keepCat = mode === 'KEEP_CATALOG';
  var counts = {};
  RESET_WIPE_ALWAYS_.concat(keepCat ? [] : RESET_WIPE_CATALOG_).forEach(function (n) {
    if (n === 'Operations' || !sheetExists_(n)) return;
    counts[n] = readRows_(n).filter(function (r) { return !r.archived_at; }).length;
  });
  var docs = readRows_('Documents').filter(function (d) { return !(keepCat && d.entity_type === 'TPL'); });
  counts.Documents = docs.length;
  var out = { mode: mode, counts: counts };
  if (keepCat) {
    var items = readRows_('Items').filter(function (it) { return !it.archived_at; });
    out.items_kept = items.length;
    out.items_issued = items.filter(function (it) { return it.status === 'ISSUED'; }).length;
    out.tpl_kept = sheetExists_('TplFiles') ? readRows_('TplFiles').filter(function (t) { return !t.archived_at && t.state !== 'DELETED'; }).length : 0;
  }
  return out;
}

function precheckSystemReset_(ctx) {
  var p = ctx.req.payload || {};
  var errs = [];
  if (RESET_MODES_.indexOf(p.mode) < 0) errs.push(fieldError_('mode', p.mode ? 'INVALID_VALUE' : 'REQUIRED'));
  if (!resetConfirmOk_(p.confirm)) errs.push(fieldError_('confirm', 'RESET_CONFIRM'));
  if (resetRunning_()) errs.push(fieldError_('state', 'RESET_RUNNING'));
  if (errs.length) throw validationError_(errs);
}

/** Ghi kết quả lần xóa sạch vào SystemState (ngoài khóa ghi của lần xóa) */
function resetNote_(o) {
  withWriteLock_(function () {
    var st = readState_();
    var su = {};
    if (o.status) { su.last_reset_status = ['STRING', o.status]; su.last_reset_error = ['STRING', o.error || '']; }
    if (o.at) su.last_reset_at = ['DATETIME', o.at];
    if (o.mode) su.last_reset_mode = ['STRING', o.mode];
    if (o.by) su.last_reset_by = ['STRING', o.by];
    if (o.ref !== undefined) su.last_reset_ref = ['STRING', o.ref];
    if (o.trash_left !== undefined) su.reset_trash_left = ['INT', o.trash_left];
    stateWrite_(st, su, o.by || SYSTEM_USER);
  });
  cache_().remove('sys:state');
}

/** system.reset.info: số dòng sẽ xóa theo hai cách, lần sao lưu gần nhất, lần xóa sạch gần nhất */
function systemResetInfo_(ctx) {
  dbReset_();
  var st = readState_();
  var dir = userDirectory_();
  return {
    env: envName_(), confirm_text: RESET_CONFIRM_TEXT_, running: resetRunning_(),
    plans: { KEEP_CATALOG: resetPlan_('KEEP_CATALOG'), ALL: resetPlan_('ALL') },
    last_backup: { at: stateGet_(st, 'last_backup_at', ''), status: stateGet_(st, 'last_backup_status', ''), ref: stateGet_(st, 'last_backup_ref', '') },
    last: stateGet_(st, 'last_reset_status', '') ? {
      at: stateGet_(st, 'last_reset_at', ''), status: stateGet_(st, 'last_reset_status', ''), mode: stateGet_(st, 'last_reset_mode', ''),
      by: reportUserName_(dir, stateGet_(st, 'last_reset_by', '')), ref: stateGet_(st, 'last_reset_ref', ''), error: stateGet_(st, 'last_reset_error', ''),
      counts: stateGet_(st, 'last_reset_counts', null), trash_left: Number(stateGet_(st, 'reset_trash_left', 0)) || 0
    } : null
  };
}

/** Xóa mọi dòng dữ liệu (giữ tiêu đề, không xóa hàng — như M&E) */
function resetClearRows_(name) {
  var sheet = sh_(name);
  var last = sheet.getLastRow();
  if (last >= 2) sheet.getRange(2, 1, last - 1, Math.max(1, sheet.getLastColumn())).clearContent();
}

/** Viết lại sheet chỉ còn các dòng giữ lại */
function resetRewrite_(name, keep) {
  resetClearRows_(name);
  insertRows_(name, keep.map(function (r) { var o = clone_(r); delete o.__row; return o; }));
}

/**
 * system.reset {mode: KEEP_CATALOG | ALL, confirm: 'XÓA TOÀN BỘ'} — chỉ owner, PIN. Trả {mode, backup, counts, items_reset, sessions,
 * files_trashed, files_left}. Phản hồi mang dataset_epoch mới; mọi phiên đã thu hồi → app đưa về màn đăng nhập.
 */
function systemReset_(ctx) {
  precheckSystemReset_(ctx);
  var mode = ctx.req.payload.mode;
  var t0 = Date.now();
  var by = ctx.user.user_id;
  setProp_('RESET_RUNNING', String(t0));
  var res = null, bk = null, noted = false;
  try {
    setMaintenance_(true);
    bk = backupDataRun_();
    if (!bk || bk.status !== 'VERIFIED') {
      resetNote_({ status: 'FAILED', error: 'Sao lưu trước khi xóa: ' + (bk ? bk.status : 'lỗi') + (bk && bk.error ? ' — ' + bk.error : ''), at: isoVN_(now_()), mode: mode, by: by, ref: bk ? bk.folder : '' });
      noted = true;
      var e0 = fieldError_('backup', 'RESET_BACKUP_FAILED');
      e0.message_vi += ' (' + (bk ? bk.status : '?') + ')';
      e0.message_zh += '（' + (bk ? bk.status : '?') + '）';
      throw validationError_([e0]);
    }
    res = withWriteLock_(function () { return resetWipe_(ctx, mode, bk.folder); });
    // Xóa cả danh mục: nạp lại điều khoản ISO 14001 / 45001 / 50001 (ISO 9001, BRCGS có lại khi nhập file Excel tổng)
    if (mode === 'ALL') { dbReset_(); seedStdClauses_(); }
  } catch (e) {
    if (!noted) {
      try { resetNote_({ status: 'FAILED', error: String(e && (e.apiCode || e.message) || e).slice(0, 200), at: isoVN_(now_()), mode: mode, by: by, ref: bk ? bk.folder : '' }); }
      catch (e2) { /* vẫn báo lỗi gốc */ }
    }
    throw e;
  } finally {
    try { setMaintenance_(false); } catch (e3) { console.error('setMaintenance_(false) ' + (e3 && e3.message)); }
    delProp_('RESET_RUNNING');
  }
  var tr = resetTrashFiles_(res.trash, t0 + RESET_BUDGET_MS_);
  try { resetNote_({ status: 'OK', trash_left: tr.left }); } catch (e4) { /* đã ghi ở resetWipe_ */ }
  clearSysCaches_();
  log_('Xóa sạch (' + mode + '): sao lưu ' + bk.folder + ', ' + JSON.stringify(res.counts) + ', tệp vào thùng rác ' + tr.done + ', còn ' + tr.left + '.');
  return { mode: mode, backup: bk.folder, counts: res.counts, items_reset: res.items_reset, sessions: res.sessions, files_trashed: tr.done, files_left: tr.left };
}

/** Phần xóa (dưới khóa ghi). Trả {counts, trash: [drive_file_id], items_reset, sessions} */
function resetWipe_(ctx, mode, ref) {
  var keepCat = mode === 'KEEP_CATALOG';
  var by = ctx.user.user_id;
  dbReset_();
  // 1. Thế hệ dữ liệu mới, thu hồi mọi phiên (kể cả owner) — làm trước để lỗi giữa chừng cũng buộc mọi máy tải lại từ đầu
  var epoch = uuid_();
  setProp_('DATASET_EPOCH', epoch);
  clearSysCaches_();
  var tms = now_().getTime();
  var sessions = 0;
  readRows_('Sessions').forEach(function (s) { if (isSessionActive_(s, tms)) { revokeSessionRow_(s, 'DATASET_RESET'); sessions++; } });
  // 2. Ngày bắt đầu tính hồ sơ: giữ danh mục → hôm nay (hồ sơ cũ đã xóa); xóa cả danh mục → đặt lại khi nhập file Excel tổng
  writeSetting_('records_start_date', keepCat ? todayVN_() : '', by);
  var st = readState_();
  var rev = Number(stateGet_(st, 'sync_revision', 0)) + 1;
  var nowIso = isoVN_(now_());
  var counts = {};
  // 3. Tệp: dòng Documents của các bảng bị xóa (giữ danh mục: giữ tệp của kho tệp mẫu)
  var trash = [];
  var docs = readRows_('Documents');
  var keepDocs = docs.filter(function (d) { return keepCat && d.entity_type === 'TPL'; });
  docs.forEach(function (d) {
    if (keepCat && d.entity_type === 'TPL') return;
    if (d.drive_file_id) trash.push(String(d.drive_file_id));
    if (d.thumb_drive_file_id) trash.push(String(d.thumb_drive_file_id));
  });
  counts.Documents = docs.length - keepDocs.length;
  resetRewrite_('Documents', keepDocs);
  // 4. Bảng nghiệp vụ
  RESET_WIPE_ALWAYS_.concat(keepCat ? [] : RESET_WIPE_CATALOG_).forEach(function (name) {
    if (!sheetExists_(name)) return;
    if (name !== 'Operations') counts[name] = readRows_(name).filter(function (r) { return !r.archived_at; }).length;
    resetClearRows_(name);
  });
  // 5. Giữ danh mục: biểu như vừa nhập lại từ Excel — ● mất tệp phiên bản → "chưa có tệp"; bỏ nối phiên bản, ngày bắt đầu tính riêng
  var itemsReset = 0;
  if (keepCat) {
    var byRow = {};
    readRows_('Items').forEach(function (it) {
      if (it.archived_at) return;
      var row = clone_(it);
      var rn = row.__row;
      delete row.__row;
      row.current_version_id = ''; row.records_from = '';
      if (row.status === 'ISSUED') { row.issued_source = 'IMPORT'; row.file_missing = true; itemsReset++; }
      row.record_version = (Number(row.record_version) || 0) + 1; row.updated_at = nowIso; row.updated_by = by;
      row.sync_revision = rev; row.dataset_epoch = epoch;
      byRow[rn] = row;
    });
    if (Object.keys(byRow).length) writeRowsBulk_('Items', byRow);
  }
  // 6. Nhật ký: chỉ giữ thao tác quản trị, đăng nhập
  var logs = readRows_('AuditLogs');
  var keepLogs = logs.filter(function (l) { return RESET_KEEP_AUDIT_RE_.test(String(l.action || '')); });
  counts.AuditLogs = logs.length - keepLogs.length;
  resetRewrite_('AuditLogs', keepLogs);
  // 7. Gmail: thư chưa gửi được thì bỏ (nhật ký thư đã gửi giữ để chống gửi trùng)
  var mailFix = {};
  readRows_('NotificationLogs').forEach(function (n) {
    if (['QUEUED', 'SENDING', 'FAILED', 'UNKNOWN'].indexOf(String(n.status)) < 0) return;
    var o = clone_(n); var rn = o.__row; delete o.__row;
    o.status = 'SKIPPED'; o.error_code = 'RESET';
    mailFix[rn] = o;
  });
  if (Object.keys(mailFix).length) writeRowsBulk_('NotificationLogs', mailFix);
  // 8. SystemState: thế hệ mới, mọi bảng đổi mốc (app tải lại toàn bộ), kết quả lần xóa
  var su = { dataset_epoch: ['STRING', epoch], sync_revision: ['INT', rev], settings_rev: ['INT', rev],
    last_reset_at: ['DATETIME', nowIso], last_reset_by: ['STRING', by], last_reset_mode: ['STRING', mode], last_reset_status: ['STRING', 'OK'],
    last_reset_ref: ['STRING', ref], last_reset_counts: ['JSON', counts], last_reset_error: ['STRING', ''], reset_trash_left: ['INT', trash.length] };
  if (!keepCat) su.last_import_at = ['DATETIME', ''];
  Object.keys(SHEETS).forEach(function (n) { if (SHEETS[n].book === 'B' && n !== 'SystemState') su['table_rev.' + n] = ['INT', rev]; });
  su['table_rev.Users'] = ['INT', rev];
  stateWrite_(st, su, by);
  writeAudit_({ user_id: by, device_id: ctx.req.device_id, action: 'system.reset', entity_type: 'SYSTEM', entity_id: APP_ID, before_json: null,
    after_json: { mode: mode, backup: ref, counts: counts, items_reset: itemsReset, sessions: sessions, files: trash.length }, operation_id: ctx.req.operation_id || '',
    auth_basis: 'OWNER' });
  clearSysCaches_();
  cache_().remove('users:dir');
  return { counts: counts, trash: trash, items_reset: itemsReset, sessions: sessions };
}

/* ---------------- Tệp vào thùng rác ---------------- */

var RESET_LEFT_FILE_ = NAME_PREFIX + 'XoaSach_TepConLai.json';

/** Bỏ tệp vào thùng rác tới hạn giờ; phần còn lại ghi vào tệp danh sách (trigger runBackgroundJobs làm tiếp). Trả {done, left} */
function resetTrashFiles_(ids, deadline) {
  var list = (ids || []).concat(resetLeftRead_());
  var seen = {};
  list = list.filter(function (x) { if (!x || seen[x]) return false; seen[x] = true; return true; });
  var done = 0, i = 0;
  for (; i < list.length; i++) {
    if (Date.now() > deadline) break;
    try { DriveApp.getFileById(list[i]).setTrashed(true); } catch (e) { /* tệp đã mất / đã ở thùng rác */ }
    done++;
  }
  var left = list.slice(i);
  resetLeftWrite_(left);
  return { done: done, left: left.length };
}

function resetLeftRead_() {
  var id = prop_('RESET_TRASH_FILE');
  if (!id) return [];
  try { return JSON.parse(DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8')) || []; } catch (e) { return []; }
}

function resetLeftWrite_(left) {
  var id = prop_('RESET_TRASH_FILE');
  if (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* bỏ qua */ } delProp_('RESET_TRASH_FILE'); }
  if (!left.length) return;
  var f = appFolder_().createFile(Utilities.newBlob(JSON.stringify(left), 'application/json', RESET_LEFT_FILE_));
  setProp_('RESET_TRASH_FILE', f.getId());
}

/** Trigger runBackgroundJobs: làm tiếp phần tệp còn lại của lần xóa sạch (tối đa ~2 phút mỗi lần) */
function resetTrashLeftover_(t0) {
  if (!prop_('RESET_TRASH_FILE')) return;
  var r = resetTrashFiles_([], t0 + 120000);
  try { resetNote_({ trash_left: r.left }); } catch (e) { /* bỏ qua */ }
  log_('Xóa sạch: bỏ thêm ' + r.done + ' tệp vào thùng rác, còn ' + r.left + '.');
}

/* ---------------- Trạng thái hệ thống ---------------- */

function resetHealth_(st) {
  var status = stateGet_(st, 'last_reset_status', '');
  if (!status) return [true, 'Chưa xóa sạch lần nào', ''];
  var at = String(stateGet_(st, 'last_reset_at', ''));
  var when = fmtDateVN_(at) + ' ' + at.slice(11, 16);
  var mode = stateGet_(st, 'last_reset_mode', '') === 'ALL' ? 'xóa cả danh mục' : 'giữ danh mục';
  if (status === 'FAILED') {
    return [false, 'Lần gần nhất ' + when + ' bị lỗi: ' + String(stateGet_(st, 'last_reset_error', '')),
      'Tài khoản → Quản trị → Xóa sạch dữ liệu → chạy lại (dữ liệu trước khi xóa ở bản sao lưu ' + String(stateGet_(st, 'last_reset_ref', '') || '—') + ')'];
  }
  var left = Number(stateGet_(st, 'reset_trash_left', 0)) || 0;
  return [true, 'Lần gần nhất ' + when + ' · ' + mode + ' · sao lưu trước khi xóa ' + String(stateGet_(st, 'last_reset_ref', '')),
    left ? 'Còn ' + left + ' tệp chờ bỏ vào thùng rác (trigger runBackgroundJobs làm tiếp)' : ''];
}
