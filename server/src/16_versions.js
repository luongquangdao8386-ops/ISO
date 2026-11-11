/* 16_versions: phiên bản & ban hành (phiên 1b, mục 6.1 đặc tả).
 * Nháp DRAFT → (Gửi duyệt) IN_REVIEW → (Duyệt) APPROVED → (Ban hành) ISSUED → (bản mới ban hành) SUPERSEDED.
 * Trả lại: IN_REVIEW/APPROVED → DRAFT kèm lý do. Hủy: bản đang mở → CANCELLED. Mỗi biểu một bản đang hiệu lực, một bản đang mở.
 * ATTACH: biểu ● nhập từ Excel chưa có tệp → Thư ký ISO gắn PDF cho đúng lần ban hành đang hiệu lực rồi ban hành thẳng (không duyệt lại,
 * vì bản giấy đã ban hành), cờ "chưa có tệp" tắt.
 * Quyền: soạn — cấp 2+ trong bộ phận, Thư ký ISO; duyệt cấp bộ phận — trưởng bộ phận (cấp 3 trong bộ phận) hoặc cấp 4; cấp công ty —
 * cấp 4; người soạn không tự duyệt (cấp 4 được, admin_self_approval); ban hành — Thư ký ISO hoặc cấp 4. Quyền kiểm trước khi hỏi PIN
 * (PRECHECK_ trong 09_api). App có thể chỉ có owner + Thư ký ISO (cấp 4): hai người này làm thay trưởng bộ phận. */

/* ---------------- Quyền ---------------- */

/** Tạo phiên bản cho biểu */
function canCreateVersion_(u, it, vtype) {
  if (vtype === 'ATTACH') return isSecretary_(u);
  return isSecretary_(u) || (Number(u.role_level) >= 2 && deptWritable_(u, it.dept_code));
}

/** Sửa nháp, tải tệp, gửi duyệt, hủy: người soạn (cấp 2+ trong bộ phận), trưởng bộ phận, Thư ký ISO */
function versionEditable_(u, it, v) {
  if (isSecretary_(u)) return true;
  if (!deptWritable_(u, it.dept_code)) return false;
  if (v && v.author_id === u.user_id) return Number(u.role_level) >= 2;
  return Number(u.role_level) >= 3;
}

/** Duyệt (và trả lại bản chờ duyệt): cấp 4 mọi tài liệu (kể cả bản mình soạn khi admin_self_approval);
 *  cấp 3 tài liệu cấp bộ phận trong bộ phận mình, không phải bản mình soạn */
function canApprove_(u, it, v) {
  var lvl = Number(u.role_level);
  if (lvl >= 4) return v.author_id !== u.user_id || !!setting_('admin_self_approval');
  if (v.author_id === u.user_id) return false;
  if (it.level === 'COMPANY') return false;
  return lvl === 3 && deptWritable_(u, it.dept_code);
}

/** Trả lại: bản chờ duyệt — người duyệt được; bản đã duyệt — người duyệt hoặc người ban hành (Thư ký ISO, cấp 4) */
function canReturn_(u, it, v) {
  if (v.state === 'APPROVED' && isSecretary_(u)) return true;
  return canApprove_(u, it, v);
}

/** Hủy: người sửa được nháp (bản nháp, chờ duyệt); bản đã duyệt chỉ Thư ký ISO, cấp 4 */
function canCancelVersion_(u, it, v) {
  if (v.state === 'APPROVED') return isSecretary_(u);
  return versionEditable_(u, it, v);
}

/* ---------------- Tiện ích ---------------- */

function padRev_(n) {
  n = Number(n) || 0;
  return n < 10 ? '0' + n : String(n);
}

/** Lần ban hành kế tiếp: lớn nhất trong các bản đã ban hành / lỗi thời và lần ban hành của danh mục, cộng 1.
 *  Biểu ● nhập từ Excel không ghi lần ban hành coi như đang ở lần 01. */
function nextRev_(it, versions) {
  var base = Number(it.current_rev) || (it.status === 'ISSUED' ? 1 : 0);
  versions.forEach(function (v) {
    if (v.state === 'ISSUED' || v.state === 'SUPERSEDED') base = Math.max(base, Number(v.rev) || 0);
  });
  return padRev_(base + 1);
}

function versionsOf_(itemId) {
  return readRows_('Versions').filter(function (v) { return v.item_id === itemId && !v.archived_at; });
}

function openVersionOf_(versions, exceptId) {
  for (var i = 0; i < versions.length; i++) if (VERSION_OPEN_[versions[i].state] && versions[i].version_id !== exceptId) return versions[i];
  return null;
}

/** Phiên bản + biểu (ngoài khóa) cho kiểm quyền; NOT_FOUND khi không có, FORBIDDEN khi ngoài phạm vi */
function loadVersion_(ctx, id) {
  if (!isUuidV4_(id)) throw validationError_([fieldError_('version_id', 'ID_INVALID')]);
  var v = findOne_('Versions', 'version_id', id);
  if (!v || v.archived_at) throw apiError_('NOT_FOUND');
  var it = findOne_('Items', 'item_id', v.item_id);
  if (!it) throw apiError_('NOT_FOUND');
  if (!itemVisible_(ctx.user, it)) throw apiError_('FORBIDDEN');
  return { v: v, it: it };
}

function stateInvalid_() {
  return validationError_([fieldError_('state', 'STATUS_INVALID')]);
}

/** Đọc lại dưới khóa ghi, so expected_version; trả bản sao để sửa (không có __row) */
function lockedVersion_(ctx, id) {
  var cur = findOne_('Versions', 'version_id', id);
  if (!cur) throw apiError_('NOT_FOUND');
  assertVersion_(ctx, cur, 'VERSION', 'Versions');
  var row = clone_(cur); delete row.__row;
  return row;
}

function lockedItem_(id) {
  var cur = findOne_('Items', 'item_id', id);
  if (!cur) throw apiError_('NOT_FOUND');
  var row = clone_(cur); delete row.__row;
  return row;
}

function versionResult_(ctx, v, item) {
  var out = { entity_type: 'VERSION', entity_id: v.version_id, record_version: v.record_version, record: projectRow_(ctx, v) };
  if (item) out.item = projectRow_(ctx, item);
  return out;
}

function reasonText_(p, field, required, max) {
  var t = trimStr_(p[field]);
  if (required && !t) throw validationError_([fieldError_(field, 'REQUIRED')]);
  if (t.length > (max || 500)) throw validationError_([fieldError_(field, 'TOO_LONG')]);
  return t;
}

/* ---------------- Kiểm trước khi hỏi PIN (09_api PRECHECK_) ---------------- */

function precheckApprove_(ctx) {
  var x = loadVersion_(ctx, (ctx.req.payload || {}).version_id);
  if (!canApprove_(ctx.user, x.it, x.v)) throw apiError_('FORBIDDEN');
  if (x.v.state !== 'IN_REVIEW') throw stateInvalid_();
}

function precheckReturn_(ctx) {
  var x = loadVersion_(ctx, (ctx.req.payload || {}).version_id);
  if (!canReturn_(ctx.user, x.it, x.v)) throw apiError_('FORBIDDEN');
  if (x.v.state !== 'IN_REVIEW' && x.v.state !== 'APPROVED') throw stateInvalid_();
}

function precheckIssue_(ctx) {
  var x = loadVersion_(ctx, (ctx.req.payload || {}).version_id);
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  var ok = x.v.vtype === 'ATTACH' ? x.v.state === 'DRAFT' : x.v.state === 'APPROVED';
  if (!ok) throw stateInvalid_();
  if (!x.v.pdf_doc_id) throw validationError_([fieldError_('pdf', 'PDF_REQUIRED')]);
}

/* ---------------- version.save ---------------- */

/**
 * version.save {version_id, item_id (khi tạo), vtype: REVISION | ATTACH, change_summary_vi/zh, effective_date}
 * expected_version 0 = tạo nháp mới (lần ban hành do máy chủ cấp); khác 0 = sửa nháp. Biểu ○ có nháp đầu tiên → ◐ đang soạn.
 */
function versionSave_(ctx) {
  var p = ctx.req.payload || {};
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  var errs = [];
  if (!isUuidV4_(p.version_id)) errs.push(fieldError_('version_id', 'ID_INVALID'));
  var vtype = p.vtype === undefined || p.vtype === '' ? 'REVISION' : String(p.vtype);
  if (VERSION_TYPES_.indexOf(vtype) < 0) errs.push(fieldError_('vtype', 'INVALID_VALUE'));
  if (isNew && !isUuidV4_(p.item_id)) errs.push(fieldError_('item_id', 'ID_INVALID'));
  var eff = p.effective_date === undefined ? undefined : trimStr_(p.effective_date);
  if (eff && !isDateStr_(eff)) errs.push(fieldError_('effective_date', 'INVALID_DATE'));
  if (errs.length) throw validationError_(errs);
  var cur = null, it;
  if (isNew) {
    it = findOne_('Items', 'item_id', p.item_id);
    if (!it) throw apiError_('NOT_FOUND');
    if (!itemVisible_(ctx.user, it) || !canCreateVersion_(ctx.user, it, vtype)) throw apiError_('FORBIDDEN');
  } else {
    var x = loadVersion_(ctx, p.version_id);
    cur = x.v; it = x.it; vtype = cur.vtype || 'REVISION';
    if (!versionEditable_(ctx.user, it, cur)) throw apiError_('FORBIDDEN');
    if (cur.state !== 'DRAFT') throw stateInvalid_();
  }
  var input = clone_(p);
  if (vtype === 'ATTACH' && !trimStr_(input.change_summary_vi) && !trimStr_(input.change_summary_zh) && !cur) {
    input.change_summary_vi = 'Gắn tệp cho bản đang hiệu lực (nhập từ danh mục Excel)';
    input.change_summary_zh = '为现行版本附加文件（从Excel目录导入）';
  }
  if (vtype === 'REVISION') requireOneLang_(errs, input, cur, 'change_summary');
  if (errs.length) throw validationError_(errs);
  var tr = applyTranslations_('Versions', ['change_summary'], input, cur); // dịch ngoài khóa ghi
  return executeWrite_(ctx, {
    entity_type: 'VERSION', entity_id: p.version_id,
    build: function () {
      var row, item = null, writes = [];
      if (isNew) {
        assertNewId_('Versions', 'version_id', p.version_id);
        item = lockedItem_(p.item_id);
        var versions = versionsOf_(item.item_id);
        if (item.status === 'NA') throw validationError_([fieldError_('item_id', 'ITEM_NA')]);
        if (openVersionOf_(versions)) throw validationError_([fieldError_('item_id', 'VERSION_OPEN')]);
        var rev;
        if (vtype === 'ATTACH') {
          if (item.status !== 'ISSUED' || item.current_version_id) throw stateInvalid_();
          rev = padRev_(Number(item.current_rev) || 1);
        } else {
          rev = nextRev_(item, versions);
        }
        row = cNew_(ctx, {
          version_id: p.version_id, item_id: item.item_id, vtype: vtype, rev: rev, state: 'DRAFT', effective_date: eff || '',
          author_id: ctx.user.user_id, pdf_doc_id: '', pdf_file_name: '', pdf_size: null, source_doc_id: '', source_file_name: '',
          source_size: null, source_mime: '', submitted_at: '', submitted_by: '', approved_at: '', approved_by: '', approve_note: '',
          issued_at: '', issued_by: '', superseded_at: '', superseded_by_id: '', returned_at: '', returned_by: '', return_reason: '',
          cancelled_at: '', cancelled_by: '', cancel_reason: '', item_status_before: item.status
        });
        if (vtype === 'REVISION' && item.status === 'NONE') {
          item.status = 'DRAFTING';
          cUpdate_(ctx, item);
          writes.push({ sheet: 'Items', mode: 'update', row: item });
        } else item = null;
      } else {
        row = lockedVersion_(ctx, p.version_id);
        if (row.state !== 'DRAFT') throw stateInvalid_();
        cUpdate_(ctx, row);
        if (eff !== undefined) row.effective_date = eff;
      }
      Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
      row.i18n_meta = tr.meta;
      writes.unshift({ sheet: 'Versions', mode: isNew ? 'insert' : 'update', row: row });
      return {
        writes: writes, result: versionResult_(ctx, row, item), record_version: row.record_version,
        audit: { entity_type: 'VERSION', entity_id: row.version_id, before_json: null,
          after_json: { item_id: row.item_id, rev: row.rev, vtype: row.vtype, state: row.state, created: isNew } }
      };
    }
  });
}

/* ---------------- Chuyển trạng thái ---------------- */

/**
 * Khung chung: kiểm quyền + trạng thái (ngoài khóa), đọc lại dưới khóa, so expected_version, gọi apply(row, ctx2) để đổi.
 * apply trả {item?: dòng Items đã sửa, extra?: writes thêm, audit_after}.
 */
function versionTransition_(ctx, opts) {
  var p = ctx.req.payload || {};
  var x = loadVersion_(ctx, p.version_id);
  if (opts.allowed && !opts.allowed(ctx.user, x.it, x.v)) throw apiError_('FORBIDDEN');
  if (opts.from.indexOf(x.v.state) < 0 || (opts.check && !opts.check(x.v))) throw stateInvalid_();
  var pre = opts.prepare ? opts.prepare(p, x) : null;
  return executeWrite_(ctx, {
    entity_type: 'VERSION', entity_id: p.version_id,
    build: function () {
      var row = lockedVersion_(ctx, p.version_id);
      if (opts.from.indexOf(row.state) < 0 || (opts.check && !opts.check(row))) throw stateInvalid_();
      var before = row.state;
      cUpdate_(ctx, row);
      var out = opts.apply(row, pre) || {};
      var writes = [{ sheet: 'Versions', mode: 'update', row: row }].concat(out.extra || []);
      if (out.item) writes.push({ sheet: 'Items', mode: 'update', row: out.item });
      return {
        writes: writes, result: versionResult_(ctx, row, out.item), record_version: row.record_version,
        audit: { entity_type: 'VERSION', entity_id: row.version_id, before_json: { state: before },
          after_json: Object.assign({ state: row.state, rev: row.rev, item_id: row.item_id }, out.audit_after || {}), reason: out.reason || '' }
      };
    }
  });
}

function hasPdf_(v) { return !!v.pdf_doc_id; }

/** version.submit {version_id}: Nháp → Chờ duyệt (cần PDF). Bản ATTACH không qua duyệt. */
function versionSubmit_(ctx) {
  var x0 = loadVersion_(ctx, (ctx.req.payload || {}).version_id);
  if (versionEditable_(ctx.user, x0.it, x0.v) && x0.v.state === 'DRAFT' && x0.v.vtype !== 'ATTACH' && !hasPdf_(x0.v)) {
    throw validationError_([fieldError_('pdf', 'PDF_REQUIRED')]);
  }
  return versionTransition_(ctx, {
    allowed: versionEditable_, from: ['DRAFT'],
    check: function (v) { return v.vtype !== 'ATTACH' && hasPdf_(v); },
    apply: function (row) {
      row.state = 'IN_REVIEW';
      row.submitted_at = isoVN_(now_());
      row.submitted_by = ctx.user.user_id;
    }
  });
}

/** version.approve {version_id, note}: Chờ duyệt → Đã duyệt (PIN) */
function versionApprove_(ctx) {
  return versionTransition_(ctx, {
    allowed: canApprove_, from: ['IN_REVIEW'],
    prepare: function (p) { return { note: reasonText_(p, 'note', false, 500) }; },
    apply: function (row, pre) {
      row.state = 'APPROVED';
      row.approved_at = isoVN_(now_());
      row.approved_by = ctx.user.user_id;
      row.approve_note = pre.note;
      return { audit_after: { self: row.author_id === ctx.user.user_id } };
    }
  });
}

/** version.return {version_id, reason}: Chờ duyệt / Đã duyệt → Nháp kèm lý do (PIN) */
function versionReturn_(ctx) {
  return versionTransition_(ctx, {
    allowed: canReturn_, from: ['IN_REVIEW', 'APPROVED'],
    prepare: function (p) { return { reason: reasonText_(p, 'reason', true, 500) }; },
    apply: function (row, pre) {
      row.state = 'DRAFT';
      row.returned_at = isoVN_(now_());
      row.returned_by = ctx.user.user_id;
      row.return_reason = pre.reason;
      row.approved_at = ''; row.approved_by = ''; row.approve_note = '';
      return { reason: pre.reason };
    }
  });
}

/** version.cancel {version_id, reason}: hủy bản đang mở. Biểu ○ thành ◐ vì bản nháp này thì trả về ○. */
function versionCancel_(ctx) {
  return versionTransition_(ctx, {
    allowed: canCancelVersion_, from: ['DRAFT', 'IN_REVIEW', 'APPROVED'],
    prepare: function (p) { return { reason: reasonText_(p, 'reason', false, 500) }; },
    apply: function (row, pre) {
      row.state = 'CANCELLED';
      row.cancelled_at = isoVN_(now_());
      row.cancelled_by = ctx.user.user_id;
      row.cancel_reason = pre.reason;
      var item = lockedItem_(row.item_id);
      if (row.item_status_before === 'NONE' && item.status === 'DRAFTING' && !item.current_version_id &&
        !openVersionOf_(versionsOf_(item.item_id), row.version_id)) {
        item.status = 'NONE';
        cUpdate_(ctx, item);
        return { item: item, reason: pre.reason };
      }
      return { reason: pre.reason };
    }
  });
}

/**
 * version.issue {version_id}: Thư ký ISO / cấp 4 ban hành (PIN).
 * REVISION: Đã duyệt → Đang hiệu lực; bản đang hiệu lực trước → Lỗi thời; danh mục: lần ban hành, ngày ban hành = hôm nay,
 * hạn rà soát = ngày ban hành + doc_review_months, tình trạng ●, tắt cờ chưa có tệp.
 * ATTACH: Nháp (có PDF) → Đang hiệu lực, giữ lần và ngày ban hành của danh mục.
 */
function versionIssue_(ctx) {
  return versionTransition_(ctx, {
    allowed: function (u) { return isSecretary_(u); },
    from: ['APPROVED', 'DRAFT'],
    check: function (v) { return hasPdf_(v) && (v.vtype === 'ATTACH' ? v.state === 'DRAFT' : v.state === 'APPROVED'); },
    apply: function (row) {
      var today = todayVN_();
      var nowIso = isoVN_(now_());
      var item = lockedItem_(row.item_id);
      if (item.status === 'NA') throw validationError_([fieldError_('item_id', 'ITEM_NA')]);
      var extra = [];
      var superseded = [];
      versionsOf_(item.item_id).forEach(function (o) {
        if (o.version_id === row.version_id || o.state !== 'ISSUED') return;
        var r = clone_(o); delete r.__row;
        r.state = 'SUPERSEDED';
        r.superseded_at = nowIso;
        r.superseded_by_id = row.version_id;
        cUpdate_(ctx, r);
        extra.push({ sheet: 'Versions', mode: 'update', row: r });
        superseded.push(r.rev);
      });
      var months = Number(setting_('doc_review_months') || 12);
      if (row.vtype === 'ATTACH') {
        row.issued_at = item.issued_at || today;
        if (!item.issued_at) item.issued_at = row.issued_at;
        if (!item.review_due) item.review_due = addMonthsIso_(item.issued_at, months);
        if (!item.current_rev) item.current_rev = row.rev;
        item.issued_source = item.issued_source || 'IMPORT';
      } else {
        row.issued_at = today;
        item.issued_at = today;
        item.current_rev = row.rev;
        item.review_due = addMonthsIso_(today, months);
        item.issued_source = 'APP';
      }
      if (!row.effective_date) row.effective_date = row.issued_at;
      row.state = 'ISSUED';
      row.issued_by = ctx.user.user_id;
      item.current_version_id = row.version_id;
      item.status = 'ISSUED';
      item.file_missing = false;
      item.na_reason = '';
      item.na_prev_status = '';
      cUpdate_(ctx, item);
      return { item: item, extra: extra, audit_after: { superseded: superseded, review_due: item.review_due, vtype: row.vtype } };
    }
  });
}

/* ---------------- item.setNa, item.review (Thư ký ISO, cấp 4, PIN) ---------------- */

/**
 * item.setNa {item_id, na: true, reason} — ngừng dùng biểu (✕), hồ sơ cũ giữ nguyên; {na: false} — dùng lại (về tình trạng trước).
 * Không đặt ✕ khi biểu còn phiên bản đang mở (hủy hoặc ban hành trước).
 */
function itemSetNa_(ctx) {
  var p = ctx.req.payload || {};
  if (!isUuidV4_(p.item_id)) throw validationError_([fieldError_('item_id', 'ID_INVALID')]);
  var na = p.na !== false;
  var reason = na ? reasonText_(p, 'reason', true, 300) : '';
  var it0 = findOne_('Items', 'item_id', p.item_id);
  if (!it0) throw apiError_('NOT_FOUND');
  return executeWrite_(ctx, {
    entity_type: 'ITEM', entity_id: p.item_id,
    build: function () {
      var cur = findOne_('Items', 'item_id', p.item_id);
      if (!cur) throw apiError_('NOT_FOUND');
      assertVersion_(ctx, cur, 'ITEM', 'Items');
      var row = clone_(cur); delete row.__row;
      var before = row.status;
      if (na) {
        if (row.status === 'NA') throw stateInvalid_();
        if (openVersionOf_(versionsOf_(row.item_id))) throw validationError_([fieldError_('item_id', 'VERSION_OPEN')]);
        row.na_prev_status = row.status;
        row.status = 'NA';
        row.na_reason = reason;
      } else {
        if (row.status !== 'NA') throw stateInvalid_();
        var back = ITEM_STATUS_.indexOf(row.na_prev_status) >= 0 && row.na_prev_status !== 'NA' ? row.na_prev_status : '';
        row.status = back || (row.current_version_id || (row.issued_source === 'IMPORT' && row.issued_at) ? 'ISSUED' : 'NONE');
        row.na_reason = '';
        row.na_prev_status = '';
      }
      cUpdate_(ctx, row);
      return {
        writes: [{ sheet: 'Items', mode: 'update', row: row }],
        result: { entity_type: 'ITEM', entity_id: row.item_id, record_version: row.record_version, record: projectRow_(ctx, row) },
        record_version: row.record_version,
        audit: { entity_type: 'ITEM', entity_id: row.item_id, before_json: { status: before }, after_json: { status: row.status }, reason: reason }
      };
    }
  });
}

/**
 * item.review {item_id, note}: đã rà soát định kỳ, tài liệu giữ nguyên — hạn rà soát mới = hôm nay + doc_review_months.
 * Chỉ biểu đang hiệu lực (●). Sửa nội dung thì soạn phiên bản mới thay vì bấm nút này.
 */
function itemReview_(ctx) {
  var p = ctx.req.payload || {};
  if (!isUuidV4_(p.item_id)) throw validationError_([fieldError_('item_id', 'ID_INVALID')]);
  var note = reasonText_(p, 'note', false, 300);
  return executeWrite_(ctx, {
    entity_type: 'ITEM', entity_id: p.item_id,
    build: function () {
      var cur = findOne_('Items', 'item_id', p.item_id);
      if (!cur) throw apiError_('NOT_FOUND');
      assertVersion_(ctx, cur, 'ITEM', 'Items');
      if (cur.status !== 'ISSUED') throw stateInvalid_();
      var row = clone_(cur); delete row.__row;
      var before = row.review_due;
      row.review_due = addMonthsIso_(todayVN_(), Number(setting_('doc_review_months') || 12));
      row.reviewed_at = isoVN_(now_());
      row.reviewed_by = ctx.user.user_id;
      cUpdate_(ctx, row);
      return {
        writes: [{ sheet: 'Items', mode: 'update', row: row }],
        result: { entity_type: 'ITEM', entity_id: row.item_id, record_version: row.record_version, record: projectRow_(ctx, row) },
        record_version: row.record_version,
        audit: { entity_type: 'ITEM', entity_id: row.item_id, before_json: { review_due: before }, after_json: { review_due: row.review_due }, reason: note }
      };
    }
  });
}
