/* 29_docreq: Phiếu đề nghị ban hành / sửa đổi / hủy tài liệu (Đợt 2, phiên 2d — thay BM-ISO-02-02, BM-CĐ-01-08), mã DN-yymm-001.
 * Loại: NEW ban hành tài liệu mới · REVISE sửa đổi tài liệu đang có · CANCEL hủy (ngừng dùng, ✕).
 * Luồng: người đề nghị (cấp 2+, Thư ký ISO nhập thay được — ghi tên người đề nghị) gửi phiếu → Chờ xem xét (SUBMITTED) →
 * người có quyền duyệt tài liệu đó (trưởng bộ phận với tài liệu cấp bộ phận, cấp 4 với cấp công ty; người đề nghị không tự duyệt, cấp 4
 * được khi admin_self_approval) Chấp thuận (APPROVED) hoặc Không chấp thuận (REJECTED, kèm lý do), hỏi PIN →
 * Thư ký ISO / người soạn thực hiện: REVISE / NEW soạn phiên bản theo phiếu (version.save request_id; NEW trước đó thêm tài liệu vào danh mục
 * bằng item.edit request_id) → ban hành phiên bản đó thì phiếu tự thành Đã thực hiện (DONE); CANCEL: Thư ký đặt Không áp dụng
 * (item.setNa request_id) → DONE. Việc làm ngoài app: Thư ký bấm "Đã thực hiện" kèm ghi chú (docreq.done, PIN).
 * Rút lại phiếu: người đề nghị khi còn chờ xem xét; Thư ký ISO khi chờ xem xét hoặc đã chấp thuận (CANCELLED).
 * Ai cũng đề nghị sửa / hủy được tài liệu mình xem được (đề nghị là ý kiến, người duyệt là chủ tài liệu); đề nghị tài liệu mới: trong
 * bộ phận mình. Xem phiếu: cấp 2+ / Thư ký ISO — phiếu của mình, phiếu của bộ phận mình (Thư ký ISO, cấp 4: tất cả). */

/* ---------------- Quyền ---------------- */

/** Cấp duyệt của phiếu: theo tài liệu (REVISE, CANCEL); tài liệu mới theo mã đề xuất / loại / bộ phận */
function docreqLevel_(type, it, newCode, newKind, dept) {
  if (it) return it.level === 'COMPANY' ? 'COMPANY' : 'DEPT';
  if (newCode) return levelFor_(newCode, newKind || kindFromCode_(newCode));
  if (newKind === 'MANUAL' || newKind === 'POLICY' || dept === 'ISO' || dept === 'BRC') return 'COMPANY';
  return 'DEPT';
}

/** Người dùng thấy phiếu: cấp 2+ / Thư ký ISO; phiếu của mình, của bộ phận mình (mọi bộ phận khi không giới hạn) */
function docreqVisible_(u, r) {
  if (!r || (!isSecretary_(u) && Number(u.role_level) < 2)) return false;
  return r.submitted_by === u.user_id || seesAllDepts_(u) || userDepts_(u).indexOf(r.dept_code) >= 0;
}

/** Xem xét (chấp thuận / không chấp thuận): như duyệt phiên bản (canApprove_ ở 16_versions.js), người đề nghị không tự xem xét */
function canDecideReq_(u, r) {
  var lvl = Number(u.role_level);
  if (lvl >= 4) return r.submitted_by !== u.user_id || !!setting_('admin_self_approval');
  if (r.submitted_by === u.user_id || r.level === 'COMPANY') return false;
  return lvl === 3 && deptWritable_(u, r.dept_code);
}

/** Sửa phiếu đang chờ xem xét: người đề nghị, Thư ký ISO */
function canEditReq_(u, r) {
  return r.state === 'SUBMITTED' && (r.submitted_by === u.user_id || isSecretary_(u));
}

/** Rút lại: chờ xem xét — người đề nghị, Thư ký ISO; đã chấp thuận (chưa thực hiện) — Thư ký ISO */
function canCancelReq_(u, r) {
  if (r.state === 'APPROVED') return isSecretary_(u);
  return canEditReq_(u, r);
}

/* ---------------- Tiện ích ---------------- */

/** Dán Code.gs 2d mà chưa chạy migrateSchema: lần ghi đầu tiên tự thêm sheet DocRequests, Distributions, cột Versions.request_id */
function ensureDocControlSchema_() {
  if (sheetExists_('DocRequests') && sheetExists_('Distributions')) return;
  autoMigrate_();
  dbReset_();
  if (!sheetExists_('DocRequests') || !sheetExists_('Distributions')) throw apiError_('SYSTEM_NOT_READY');
}

function loadReq_(ctx, id) {
  ensureDocControlSchema_();
  if (!isUuidV4_(id)) throw validationError_([fieldError_('request_id', 'ID_INVALID')]);
  var r = findOne_('DocRequests', 'request_id', id);
  if (!r || r.archived_at) throw apiError_('NOT_FOUND');
  if (!docreqVisible_(ctx.user, r)) throw apiError_('FORBIDDEN');
  return r;
}

function lockedReq_(ctx, id, checkVersion) {
  var cur = findOne_('DocRequests', 'request_id', id);
  if (!cur) throw apiError_('NOT_FOUND');
  if (checkVersion) assertVersion_(ctx, cur, 'DOCREQ', 'DocRequests');
  var row = clone_(cur); delete row.__row;
  return row;
}

function docreqResult_(ctx, row, extra) {
  var out = { entity_type: 'DOCREQ', entity_id: row.request_id, record_version: row.record_version, record: projectRow_(ctx, row) };
  if (extra) Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
  return out;
}

/** Phiếu đã chấp thuận dùng cho việc thực hiện (phiên bản, thêm tài liệu, đặt ✕) — đọc dưới khóa ghi; sai thì VALIDATION_ERROR */
function docreqForAction_(id, types, itemId) {
  if (!isUuidV4_(id)) throw validationError_([fieldError_('request_id', 'ID_INVALID')]);
  if (!sheetExists_('DocRequests')) throw validationError_([fieldError_('request_id', 'NOT_FOUND')]);
  var r = findOne_('DocRequests', 'request_id', id);
  if (!r || r.archived_at) throw validationError_([fieldError_('request_id', 'NOT_FOUND')]);
  if (r.state !== 'APPROVED') throw validationError_([fieldError_('request_id', 'REQUEST_NOT_APPROVED')]);
  if (types.indexOf(r.req_type) < 0) throw validationError_([fieldError_('request_id', 'REQUEST_TYPE')]);
  if (itemId !== undefined && r.item_id !== itemId) throw validationError_([fieldError_('request_id', 'REQUEST_ITEM')]);
  var row = clone_(r); delete row.__row;
  return row;
}

/** Phiếu → Đã thực hiện (dưới khóa ghi, trong cùng thao tác ghi) */
function docreqMarkDone_(ctx, row, note, versionId) {
  row.state = 'DONE';
  row.done_at = isoVN_(now_());
  row.done_by = ctx.user.user_id;
  row.done_note = note || '';
  if (versionId) row.version_id = versionId;
  cUpdate_(ctx, row);
  return { sheet: 'DocRequests', mode: 'update', row: row };
}

/* ---------------- docreq.save ---------------- */

/**
 * docreq.save {request_id, req_type, item_id (REVISE, CANCEL), dept_code + new_code? + new_kind? + title_vi/zh (NEW),
 *  reason_vi/zh (bắt buộc một thứ tiếng), content_vi/zh, want_date, requester_name}
 * expected_version 0 = gửi phiếu mới (máy chủ cấp mã DN-yymm-001, trạng thái Chờ xem xét); khác 0 = sửa phiếu đang chờ xem xét.
 */
function docreqSave_(ctx) {
  ensureDocControlSchema_();
  var p = ctx.req.payload || {};
  var u = ctx.user;
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  var errs = [];
  if (!isUuidV4_(p.request_id)) errs.push(fieldError_('request_id', 'ID_INVALID'));
  var cur = isNew ? null : loadReq_(ctx, p.request_id);
  var type = cur ? cur.req_type : String(p.req_type || '');
  if (DOCREQ_TYPES_.indexOf(type) < 0) errs.push(fieldError_('req_type', 'INVALID_VALUE'));
  var want = p.want_date === undefined ? undefined : trimStr_(p.want_date);
  if (want && !isDateStr_(want)) errs.push(fieldError_('want_date', 'INVALID_DATE'));
  var reqName = p.requester_name === undefined ? undefined : trimStr_(p.requester_name);
  if (reqName && reqName.length > 120) errs.push(fieldError_('requester_name', 'TOO_LONG'));
  ['reason_vi', 'reason_zh', 'content_vi', 'content_zh', 'title_vi', 'title_zh'].forEach(function (k) {
    if (p[k] !== undefined && trimStr_(p[k]).length > (/^title/.test(k) ? 300 : 2000)) errs.push(fieldError_(k.replace(/_(vi|zh)$/, ''), 'TOO_LONG'));
  });
  var it = null, dept = cur ? cur.dept_code : '', newCode = cur ? cur.new_code : '', newKind = cur ? cur.new_kind : '';
  if (!errs.length && isNew && type !== 'NEW') {
    if (!isUuidV4_(p.item_id)) errs.push(fieldError_('item_id', 'ID_INVALID'));
    else {
      it = findOne_('Items', 'item_id', p.item_id);
      if (!it || it.archived_at) throw apiError_('NOT_FOUND');
      if (!itemVisible_(u, it)) throw apiError_('FORBIDDEN');
      if (type === 'CANCEL' && it.status === 'NA') errs.push(fieldError_('item_id', 'ITEM_NA'));
      if (type === 'REVISE' && it.status === 'NA') errs.push(fieldError_('item_id', 'ITEM_NA'));
      dept = it.dept_code;
    }
  }
  if (type === 'NEW' && (isNew || cur.state === 'SUBMITTED')) {
    if (p.dept_code !== undefined) dept = trimStr_(p.dept_code);
    if (!dept) errs.push(fieldError_('dept_code', 'REQUIRED'));
    else if (!findOne_('Depts', 'dept_code', dept)) errs.push(fieldError_('dept_code', 'DEPT_UNKNOWN'));
    if (p.new_code !== undefined) {
      newCode = trimStr_(p.new_code).toUpperCase().replace(/\s+/g, '');
      if (newCode && !ITEM_CODE_RE_.test(newCode)) errs.push(fieldError_('new_code', 'CODE_INVALID'));
      else if (newCode && findRowNums_('Items', 'code', newCode).length) errs.push(fieldError_('new_code', 'CODE_DUPLICATE'));
    }
    if (p.new_kind !== undefined) {
      newKind = trimStr_(p.new_kind);
      if (newKind && ITEM_KINDS_.indexOf(newKind) < 0) errs.push(fieldError_('new_kind', 'KIND_INVALID'));
    }
    requireOneLang_(errs, p, cur, 'title');
  }
  requireOneLang_(errs, p, cur, 'reason');
  if (type === 'REVISE') requireOneLang_(errs, p, cur, 'content');
  if (errs.length) throw validationError_(errs);
  if (isNew) {
    if (!isSecretary_(u) && Number(u.role_level) < 2) throw apiError_('FORBIDDEN');
    if (type === 'NEW' && !isSecretary_(u) && !deptWritable_(u, dept)) throw apiError_('FORBIDDEN');
  } else if (!canEditReq_(u, cur)) {
    if (cur.state !== 'SUBMITTED') throw stateInvalid_();
    throw apiError_('FORBIDDEN');
  }
  var fields = ['reason', 'content'].concat(type === 'NEW' ? ['title'] : []);
  var tr = applyTranslations_('DocRequests', fields, p, cur); // dịch ngoài khóa ghi
  return executeWrite_(ctx, {
    entity_type: 'DOCREQ', entity_id: p.request_id,
    build: function (st) {
      var row, su = {};
      if (isNew) {
        assertNewId_('DocRequests', 'request_id', p.request_id);
        if (it) {
          var it2 = findOne_('Items', 'item_id', it.item_id);
          if (!it2 || it2.status === 'NA') throw validationError_([fieldError_('item_id', 'ITEM_NA')]);
          it = it2;
        }
        row = cNew_(ctx, {
          request_id: p.request_id, code: allocCode_(st, su, 'DOC_REQUEST'), req_type: type, item_id: it ? it.item_id : '',
          dept_code: dept, level: docreqLevel_(type, it, newCode, newKind, dept), new_code: type === 'NEW' ? newCode : '',
          new_kind: type === 'NEW' ? newKind : '', title_vi: '', title_zh: '', reason_vi: '', reason_zh: '', content_vi: '', content_zh: '',
          want_date: want || '', requester_name: reqName || '', state: 'SUBMITTED', submitted_at: isoVN_(now_()), submitted_by: u.user_id,
          decided_at: '', decided_by: '', decide_note: '', version_id: '', item_linked_at: '', done_at: '', done_by: '', done_note: '',
          cancelled_at: '', cancelled_by: '', cancel_reason: ''
        });
      } else {
        row = lockedReq_(ctx, p.request_id, true);
        if (row.state !== 'SUBMITTED') throw stateInvalid_();
        cUpdate_(ctx, row);
        if (want !== undefined) row.want_date = want;
        if (reqName !== undefined) row.requester_name = reqName;
        if (type === 'NEW') {
          row.dept_code = dept; row.new_code = newCode; row.new_kind = newKind;
          row.level = docreqLevel_(type, null, newCode, newKind, dept);
        }
      }
      Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
      row.i18n_meta = tr.meta;
      return {
        writes: [{ sheet: 'DocRequests', mode: isNew ? 'insert' : 'update', row: row }], state: su,
        result: docreqResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'DOCREQ', entity_id: row.request_id, before_json: null,
          after_json: { code: row.code, req_type: row.req_type, item_id: row.item_id, dept_code: row.dept_code, created: isNew } }
      };
    }
  });
}

/* ---------------- Xem xét, rút lại, đã thực hiện ---------------- */

function precheckDocreqDecide_(ctx) {
  var r = loadReq_(ctx, (ctx.req.payload || {}).request_id);
  if (!canDecideReq_(ctx.user, r)) throw apiError_('FORBIDDEN');
  if (r.state !== 'SUBMITTED') throw stateInvalid_();
}

function precheckDocreqDone_(ctx) {
  var r = loadReq_(ctx, (ctx.req.payload || {}).request_id);
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  if (r.state !== 'APPROVED') throw stateInvalid_();
}

/** Khung chung: kiểm quyền + trạng thái (ngoài khóa), đọc lại dưới khóa, so expected_version, apply(row) đổi trạng thái */
function docreqTransition_(ctx, opts) {
  var p = ctx.req.payload || {};
  var r0 = loadReq_(ctx, p.request_id);
  if (!opts.allowed(ctx.user, r0)) throw apiError_('FORBIDDEN');
  if (opts.from.indexOf(r0.state) < 0) throw stateInvalid_();
  var text = opts.text ? reasonText_(p, opts.text.field, opts.text.required, 1000) : '';
  return executeWrite_(ctx, {
    entity_type: 'DOCREQ', entity_id: p.request_id,
    build: function () {
      var row = lockedReq_(ctx, p.request_id, true);
      if (opts.from.indexOf(row.state) < 0) throw stateInvalid_();
      var before = row.state;
      cUpdate_(ctx, row);
      opts.apply(row, text);
      return {
        writes: [{ sheet: 'DocRequests', mode: 'update', row: row }], result: docreqResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'DOCREQ', entity_id: row.request_id, before_json: { state: before }, after_json: { state: row.state, code: row.code }, reason: text }
      };
    }
  });
}

/** docreq.approve {request_id, note}: Chờ xem xét → Chấp thuận (PIN) */
function docreqApprove_(ctx) {
  return docreqTransition_(ctx, {
    allowed: canDecideReq_, from: ['SUBMITTED'], text: { field: 'note', required: false },
    apply: function (row, note) {
      row.state = 'APPROVED'; row.decided_at = isoVN_(now_()); row.decided_by = ctx.user.user_id; row.decide_note = note;
    }
  });
}

/** docreq.reject {request_id, reason}: Chờ xem xét → Không chấp thuận kèm lý do (PIN) */
function docreqReject_(ctx) {
  return docreqTransition_(ctx, {
    allowed: canDecideReq_, from: ['SUBMITTED'], text: { field: 'reason', required: true },
    apply: function (row, reason) {
      row.state = 'REJECTED'; row.decided_at = isoVN_(now_()); row.decided_by = ctx.user.user_id; row.decide_note = reason;
    }
  });
}

/** docreq.cancel {request_id, reason}: rút lại phiếu. Đang có phiên bản soạn theo phiếu thì hủy phiên bản đó trước. */
function docreqCancel_(ctx) {
  var r0 = loadReq_(ctx, (ctx.req.payload || {}).request_id);
  if (r0.version_id && sheetExists_('Versions')) {
    var v = findOne_('Versions', 'version_id', r0.version_id);
    if (v && VERSION_OPEN_[v.state]) throw validationError_([fieldError_('request_id', 'REQUEST_VERSION_OPEN')]);
  }
  return docreqTransition_(ctx, {
    allowed: canCancelReq_, from: ['SUBMITTED', 'APPROVED'], text: { field: 'reason', required: false },
    apply: function (row, reason) {
      row.state = 'CANCELLED'; row.cancelled_at = isoVN_(now_()); row.cancelled_by = ctx.user.user_id; row.cancel_reason = reason;
    }
  });
}

/** docreq.done {request_id, note}: Thư ký ISO đánh dấu đã thực hiện (việc làm ngoài app), ghi chú bắt buộc (PIN) */
function docreqDone_(ctx) {
  return docreqTransition_(ctx, {
    allowed: function (u) { return isSecretary_(u); }, from: ['APPROVED'], text: { field: 'note', required: true },
    apply: function (row, note) {
      row.state = 'DONE'; row.done_at = isoVN_(now_()); row.done_by = ctx.user.user_id; row.done_note = note;
    }
  });
}

/* ---------------- Nối với phiên bản, danh mục (gọi từ 11_catalog, 16_versions — dưới khóa ghi) ---------------- */

/** version.save tạo phiên bản REVISION theo phiếu: phiếu REVISE / NEW đã chấp thuận của đúng tài liệu → gắn version_id */
function docreqLinkVersion_(ctx, requestId, itemId, versionId) {
  var row = docreqForAction_(requestId, ['REVISE', 'NEW'], itemId);
  if (row.version_id && sheetExists_('Versions')) {
    var v = findOne_('Versions', 'version_id', row.version_id);
    if (v && VERSION_OPEN_[v.state] && v.version_id !== versionId) throw validationError_([fieldError_('request_id', 'REQUEST_VERSION_OPEN')]);
  }
  row.version_id = versionId;
  cUpdate_(ctx, row);
  return { sheet: 'DocRequests', mode: 'update', row: row };
}

/** Hủy phiên bản soạn theo phiếu: phiếu bỏ gắn để soạn lại (vẫn Đã chấp thuận) */
function docreqUnlinkVersion_(ctx, requestId, versionId) {
  if (!requestId || !sheetExists_('DocRequests')) return null;
  var r = findOne_('DocRequests', 'request_id', requestId);
  if (!r || r.version_id !== versionId || r.state !== 'APPROVED') return null;
  var row = clone_(r); delete row.__row;
  row.version_id = '';
  cUpdate_(ctx, row);
  return { sheet: 'DocRequests', mode: 'update', row: row };
}

/** Ban hành phiên bản soạn theo phiếu: phiếu → Đã thực hiện */
function docreqOnIssue_(ctx, requestId, version) {
  if (!requestId || !sheetExists_('DocRequests')) return null;
  var r = findOne_('DocRequests', 'request_id', requestId);
  if (!r || r.state !== 'APPROVED') return null;
  var row = clone_(r); delete row.__row;
  return docreqMarkDone_(ctx, row, lab_('dr.done_issue', { N: version.rev }), version.version_id);
}

/** Thêm tài liệu mới vào danh mục theo phiếu NEW đã chấp thuận (chưa gắn tài liệu) */
function docreqLinkItem_(ctx, requestId, itemId) {
  var row = docreqForAction_(requestId, ['NEW']);
  if (row.item_id) throw validationError_([fieldError_('request_id', 'REQUEST_ITEM')]);
  row.item_id = itemId;
  row.item_linked_at = isoVN_(now_());
  cUpdate_(ctx, row);
  return { sheet: 'DocRequests', mode: 'update', row: row };
}

/** Đặt Không áp dụng theo phiếu CANCEL đã chấp thuận của đúng tài liệu → Đã thực hiện */
function docreqOnNa_(ctx, requestId, itemId) {
  var row = docreqForAction_(requestId, ['CANCEL'], itemId);
  return docreqMarkDone_(ctx, row, lab_('dr.done_na'), '');
}

/* ---------------- Trạng thái hệ thống ---------------- */

/** Dòng healthCheck `doc_control`: [ok, giá trị, ghi chú] — phiếu chờ xem xét / đã chấp thuận chưa thực hiện, bản in cần thu hồi */
function docControlHealth_() {
  if (!sheetExists_('DocRequests') || !sheetExists_('Distributions')) return [false, 'Thiếu sheet DocRequests / Distributions', 'Chạy migrateSchema'];
  var reqs = readRows_('DocRequests').filter(function (r) { return !r.archived_at; });
  var cnt = function (s) { return reqs.filter(function (r) { return r.state === s; }).length; };
  var dist = distStats_(todayVN_());
  var note = dist.overdue ? 'Bản in lần cũ chưa thu hồi quá ' + (Number(setting_('dist_recall_days')) || 7) + ' ngày: Sổ phân phối → Cần thu hồi' : '';
  return [!dist.overdue, 'Phiếu đề nghị: chờ xem xét ' + cnt('SUBMITTED') + ' · đã chấp thuận chưa thực hiện ' + cnt('APPROVED') + ' · đã thực hiện ' + cnt('DONE') +
    ' · Bản in đang phát ' + dist.active + ' nơi (' + dist.copies + ' bản) · cần thu hồi ' + dist.due + (dist.overdue ? ' (quá hạn ' + dist.overdue + ')' : ''), note];
}
