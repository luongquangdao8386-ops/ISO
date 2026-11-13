/* 13_sync: sync.bootstrap, sync.changes, sync.push, sync.getOperationStatus (cùng giao thức như M&E, Checksheet)
 * Biểu/tài liệu chỉ gửi xuống trong phạm vi bộ phận của người dùng (itemVisible_); bộ phận, nhóm, điều khoản gửi đủ. */

var SYNC_ENTITIES_ = [
  { type: 'DEPT', sheet: 'Depts' },
  { type: 'GROUP', sheet: 'Groups' },
  { type: 'ITEM', sheet: 'Items', scoped: true },
  { type: 'CLAUSE', sheet: 'Clauses' },
  // Phiên bản (1b): theo phạm vi của biểu; cấp 1 (Tra cứu) chỉ nhận bản đang hiệu lực và lỗi thời
  { type: 'VERSION', sheet: 'Versions', scoped: 'item' },
  // Hồ sơ (1c): theo phạm vi của biểu; cấp 2+ và Thư ký ISO (cấp 1 Tra cứu không xem hồ sơ)
  { type: 'RECORD', sheet: 'Records', scoped: 'record' },
  // Ngày có hồ sơ từ M&E / Checksheet (2a): như hồ sơ — cấp 2+ và Thư ký ISO, theo phạm vi của biểu
  { type: 'EVIDENCE', sheet: 'Evidence', scoped: 'record' },
  // Phiếu đề nghị tài liệu (2d): cấp 2+ / Thư ký ISO — phiếu của mình, của bộ phận mình
  { type: 'DOCREQ', sheet: 'DocRequests', scoped: 'docreq' },
  // Sổ phân phối & thu hồi (2d): như hồ sơ — cấp 2+ và Thư ký ISO, theo phạm vi của biểu
  { type: 'DIST', sheet: 'Distributions', scoped: 'record' },
  // Kho tệp mẫu (2e): tệp đang dùng — mọi cấp; tệp đã thay — cấp 3+, Thư ký ISO; tệp đã bỏ — xóa khỏi máy (TOMBSTONE)
  { type: 'TPL', sheet: 'TplFiles', scoped: 'tpl' },
  // Khắc phục (3a): phiếu — cấp 2+ / Thư ký ISO, bộ phận mình, phiếu mình lập / phụ trách / có hành động mình phụ trách; hành động theo phiếu
  { type: 'CAPA', sheet: 'Capas', scoped: 'capa' },
  { type: 'CAPA_ACT', sheet: 'CapaActions', scoped: 'capa_act' },
  // Sản phẩm không phù hợp (3c): cấp 2+ / Thư ký ISO, bộ phận mình, phiếu mình lập / phụ trách
  { type: 'NCR', sheet: 'Ncrs', scoped: 'ncr' },
  // Đánh giá nội bộ (4a): chương trình — cấp 2+, Thư ký ISO, Đánh giá viên; đợt — Thư ký ISO, Đánh giá viên, người trong đoàn, cấp 2+ của
  // bộ phận được đánh giá; checklist theo đợt
  { type: 'AUD_PROG', sheet: 'AuditPrograms', scoped: 'aud_prog' },
  { type: 'AUDIT', sheet: 'Audits', scoped: 'audit' },
  { type: 'AUD_CHK', sheet: 'AuditChecks', scoped: 'aud_chk' }
];

/** Bảng đồng bộ có sheet trên máy chủ (bản mới thêm sheet mà máy chủ chưa chạy migrateSchema thì bỏ qua, không làm hỏng đăng nhập) */
function syncEntities_() {
  return SYNC_ENTITIES_.filter(function (e) { return sheetExists_(e.sheet); });
}

/** Biểu theo item_id (đọc một lần cho mỗi lượt đồng bộ) */
function syncItemMap_(aux) {
  if (!aux.items) {
    aux.items = {};
    aux.tc.rows('Items').forEach(function (r) { aux.items[r.item_id] = r; });
  }
  return aux.items;
}

/** Dòng → bản ghi gửi client; null nếu không gửi (ngoài phạm vi bộ phận) */
function syncProject_(ctx, ent, row, aux) {
  if (ent.scoped === 'docreq') return docreqVisible_(ctx.user, row) ? projectRow_(ctx, row) : null;
  if (ent.scoped === 'tpl') return tplVisible_(ctx.user, row) ? projectRow_(ctx, row) : null;
  if (ent.scoped === 'capa') return syncCapaVisible_(ctx, row, aux) ? projectRow_(ctx, row) : null;
  if (ent.scoped === 'ncr') return syncNcrVisible_(ctx, row) ? projectRow_(ctx, row) : null;
  if (ent.scoped === 'aud_prog') return syncAuditProgVisible_(ctx, row) ? projectRow_(ctx, row) : null;
  if (ent.scoped === 'audit') return syncAuditVisible_(ctx, row) ? projectRow_(ctx, row) : null;
  if (ent.scoped === 'aud_chk') return !row.archived_at && syncAuditVisible_(ctx, syncAuditMap_(aux)[row.audit_id]) ? projectRow_(ctx, row) : null;
  if (ent.scoped === 'capa_act') return syncCapaVisible_(ctx, syncCapaMap_(aux)[row.capa_id], aux) ? projectRow_(ctx, row) : null;
  if (ent.scoped === 'record') {
    return canSeeRecords_(ctx.user, syncItemMap_(aux)[row.item_id]) ? projectRow_(ctx, row) : null;
  }
  if (ent.scoped === 'item') {
    var it = syncItemMap_(aux)[row.item_id];
    if (!it || !itemVisible_(ctx.user, it)) return null;
    if (Number(ctx.user.role_level) < 2 && !isSecretary_(ctx.user) && row.state !== 'ISSUED' && row.state !== 'SUPERSEDED') return null;
    return projectRow_(ctx, row);
  }
  if (ent.scoped && !itemVisible_(ctx.user, row)) return null;
  return projectRow_(ctx, row);
}

function syncBootstrap_(ctx) {
  var p = ctx.req.payload || {};
  var pageSize = Math.min(2000, setting_('sync_page_size') || 500);
  var tok = String(p.page_token || '0:0').split(':');
  var ei = Number(tok[0]) || 0, off = Number(tok[1]) || 0;
  var st = readState_();
  var cursor = p.page_token && p.sync_cursor ? Number(p.sync_cursor) : Number(stateGet_(st, 'sync_revision', 0));
  var ents = syncEntities_();
  var tc = tableCache_(ents.slice(ei).map(function (e) { return e.sheet; }), st);
  var aux = { tc: tc };
  var records = {};
  var count = 0;
  var next = null;
  var t0 = Date.now();
  var budget = Math.max(2000, Math.min(15000, Number(p.budget_ms) || 15000));
  for (; ei < ents.length; ei++) {
    var ent = ents[ei];
    if (count && Date.now() - t0 > budget) { next = ei + ':0'; break; }
    var rows = tc.rows(ent.sheet);
    var list = records[ent.type] = records[ent.type] || [];
    for (var i = off; i < rows.length; i++) {
      if (count >= pageSize || Date.now() - t0 > budget) { next = ei + ':' + i; break; }
      if (rows[i].archived_at) continue;
      var o = syncProject_(ctx, ent, rows[i], aux);
      if (o) { list.push(o); count++; }
    }
    off = 0;
    if (next) break;
  }
  var out = { records: records, next_page_token: next, sync_cursor: String(cursor) };
  if (!p.page_token) {
    out.user = publicUser_(ctx.user);
    out.settings = clientSettings_();
    out.permissions = permissionSummary_(ctx);
    out.server_version = SERVER_VERSION;
    out.released_dot = releasedDot_();
    out.env = envName_();
    out.server_today = todayVN_();
    out.users = userDirList_();
    out.settings_rev = Number(stateGet_(st, 'settings_rev', 0));
  }
  return out;
}

/** Tên người dùng (mã, tên hiển thị) để hiện người soạn, người phụ trách */
function userDirList_() {
  var dir = userDirectory_();
  return Object.keys(dir).map(function (id) {
    return { user_id: id, employee_code: dir[id].employee_code, display_name: dir[id].display_name, active: dir[id].active,
      dept_codes: dir[id].dept_codes || '', auditor: !!dir[id].auditor, iso_secretary: !!dir[id].iso_secretary, role_level: dir[id].role_level || 0 };
  });
}

function clientSettings_() {
  var s = settings_();
  var out = {};
  SETTINGS_DEFAULTS.forEach(function (d) { if (d[3]) out[d[0]] = s[d[0]]; });
  return out;
}

function syncChanges_(ctx) {
  var p = ctx.req.payload || {};
  var cursor = Number(p.cursor);
  if (!(cursor >= 0)) throw validationError_([fieldError_('cursor', 'INVALID_VALUE')]);
  var limit = Math.min(500, Number(p.limit) || 500);
  var st = readState_();
  var head = Number(stateGet_(st, 'sync_revision', 0));
  var changes = [];
  var ents = syncEntities_().filter(function (ent) { return Number(stateGet_(st, 'table_rev.' + ent.sheet, 0)) > cursor; });
  var tc = ents.length ? tableCache_(ents.map(function (e) { return e.sheet; }), st) : null;
  var aux = { tc: tc };
  ents.forEach(function (ent) {
    var key = sheetSchema_(ent.sheet).key;
    tc.rows(ent.sheet).forEach(function (r) {
      if (!(Number(r.sync_revision || 0) > cursor)) return;
      var o = r.archived_at ? null : syncProject_(ctx, ent, r, aux);
      changes.push({
        entity_type: ent.type, entity_id: r[key], op: o ? 'UPSERT' : 'TOMBSTONE',
        record_version: r.record_version, sync_revision: r.sync_revision, data: o
      });
    });
  });
  changes.sort(function (a, b) { return a.sync_revision - b.sync_revision; });
  var hasMore = false;
  if (changes.length > limit) {
    var cut = changes[limit - 1].sync_revision;
    var k = limit;
    while (k < changes.length && changes[k].sync_revision === cut) k++;
    hasMore = k < changes.length;
    changes = changes.slice(0, k);
  }
  var nextCursor = hasMore ? changes[changes.length - 1].sync_revision : head;
  var out = {
    changes: changes, next_cursor: String(nextCursor), has_more: hasMore,
    perm_version: 1, sync_cursor: String(nextCursor), server_today: todayVN_(), server_version: SERVER_VERSION,
    released_dot: releasedDot_()
  };
  if (Number(stateGet_(st, 'table_rev.Users', 0)) > cursor) out.users = userDirList_();
  out.settings_rev = Number(stateGet_(st, 'settings_rev', 0));
  return out;
}

/** Một thao tác của hàng chờ offline */
function syncPush_(ctx) {
  var op = (ctx.req.payload || {}).op;
  if (!op || typeof op !== 'object' || typeof op.action !== 'string') throw validationError_([fieldError_('op', 'REQUIRED')]);
  var def = ACTION_REGISTRY[op.action];
  if (!def) throw apiError_('FORBIDDEN');
  if (def.net === 'pin') throw apiError_('REAUTH_REQUIRED');
  if (def.net !== 'offline') throw validationError_([fieldError_('op.action', 'NEEDS_NETWORK')]);
  var inner = {
    api_contract_version: ctx.req.api_contract_version, action: op.action, payload: op.payload || {},
    token: ctx.req.token, operation_id: op.operation_id, dataset_epoch: ctx.req.dataset_epoch,
    device_id: ctx.req.device_id, expected_version: op.expected_version, app_version: ctx.req.app_version,
    client_time: op.local_created_at
  };
  var env;
  try {
    env = dispatchInner_(inner, true);
  } catch (e) {
    env = errorToResponse_(inner, e);
  }
  return { __envelope: env };
}

function syncOpStatus_(ctx) {
  var id = (ctx.req.payload || {}).operation_id;
  if (!isUuidV4_(id)) throw validationError_([fieldError_('operation_id', 'ID_INVALID')]);
  var ex = findOne_('Operations', 'operation_id', id);
  if (!ex || ex.user_id !== ctx.user.user_id) return { operation_id: id, state: 'NOT_FOUND' };
  return {
    operation_id: id, state: ex.state, result_code: ex.result_code, action: ex.action,
    committed_at: ex.committed_at, result: ex.result_json || null,
    record_version: ex.result_json ? ex.result_json.record_version : null
  };
}
