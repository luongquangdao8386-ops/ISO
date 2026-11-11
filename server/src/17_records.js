/* 17_records: hồ sơ (phiên 1c, mục 6.2–6.3 đặc tả).
 * Nộp hồ sơ: record.submit (làm được khi mất mạng, vào hàng chờ) rồi doc.upload từng ảnh / tệp (entity RECORD) đi sau.
 * Ghi nhận ngay, không chờ duyệt; trưởng bộ phận / Thư ký ISO trả lại hồ sơ nộp sai (record.return, PIN) → kỳ đó tính lại như chưa có.
 * Một lần nộp phủ một kỳ hoặc một khoảng ngày (vd cả quyển sổ tháng 10 của biểu hằng ngày): kỳ nào giao với khoảng đó là có hồ sơ.
 * Tình trạng hồ sơ theo kỳ (record.status, bộ đệm 5 phút): ✓ Đúng hạn · ! Quá hạn (kỳ đã kết thúc quá record_grace_days ngày mà chưa có)
 * · – Chưa tới hạn · Không tính (biểu chưa ban hành, không áp dụng, in từ M&E/Checksheet, kỳ trước ngày bắt đầu tính). Biểu khi phát
 * sinh (EVENT) không bao giờ quá hạn, chỉ có lần nộp gần nhất. App tính giống hệt ở js/periods.js (dùng được khi mất mạng).
 * Đợt 2 (2a): kỳ cũng ✓ khi app M&E / Checksheet có hồ sơ trong kỳ (sheet Evidence, 18_evidence.js); biểu nơi làm M&E / Checksheet
 * được tính khi app đó đã nối (Settings.evidence_sources), kỳ trước khoảng còn giữ ngày từ app kia (evidenceFrom_) không tính. */

/* ---------------- Quyền ---------------- */

/** Nộp hồ sơ: cấp 2+ trong bộ phận của biểu, Thư ký ISO, cấp 4 (Thư ký nộp thay các bộ phận) */
function canSubmitRecord_(u, it) {
  return isSecretary_(u) || (Number(u.role_level) >= 2 && deptWritable_(u, it.dept_code));
}

/** Trả lại hồ sơ nộp sai: trưởng bộ phận (cấp 3 trong bộ phận), Thư ký ISO, cấp 4 */
function canReturnRecord_(u, it) {
  return isSecretary_(u) || (Number(u.role_level) >= 3 && deptWritable_(u, it.dept_code));
}

/** Xem hồ sơ, bảng kỳ, tệp hồ sơ: cấp 2+ hoặc Thư ký ISO, trong phạm vi biểu (cấp 1 Tra cứu không xem tổng hợp) */
function canSeeRecords_(u, it) {
  return !!it && (isSecretary_(u) || Number(u.role_level) >= 2) && itemVisible_(u, it);
}

/** Gắn tệp cho hồ sơ: người nộp, trưởng bộ phận, Thư ký ISO */
function canRecordFiles_(u, it, rec) {
  if (isSecretary_(u)) return true;
  if (!deptWritable_(u, it.dept_code)) return false;
  return rec.submitted_by === u.user_id ? Number(u.role_level) >= 2 : Number(u.role_level) >= 3;
}

/** Biểu nhận hồ sơ: ● đang hiệu lực hoặc ◐ đang soạn (sổ giấy đang dùng); không nhận ○ chưa có biểu, ✕ ngừng dùng,
 *  biểu in từ M&E / Checksheet (ngày có hồ sơ lấy từ app kia ở Đợt 2). "Một phần M&E/Checksheet" vẫn nộp bổ sung được. */
function recordItemCheck_(it) {
  if (!it || it.status === 'NA' || it.status === 'NONE' || !it.status) return 'ITEM_NO_RECORD';
  if (it.where === 'ME' || it.where === 'CS') return 'RECORD_FROM_APP';
  return '';
}

/* ---------------- Tiện ích ---------------- */

/**
 * Dán Code.gs 1c mà chưa chạy migrateSchema: lần nộp hồ sơ đầu tiên tự thêm sheet Records (và cột Items.records_from) —
 * hồ sơ trong hàng chờ của iPhone không bị từ chối chỉ vì máy chủ thiếu sheet.
 */
function ensureRecordsSheet_() {
  if (sheetExists_('Records')) return;
  autoMigrate_();
  dbReset_();
  if (!sheetExists_('Records')) throw apiError_('SYSTEM_NOT_READY');
}

function loadRecord_(ctx, id) {
  ensureRecordsSheet_();
  if (!isUuidV4_(id)) throw validationError_([fieldError_('record_id', 'ID_INVALID')]);
  var r = findOne_('Records', 'record_id', id);
  if (!r || r.archived_at) throw apiError_('NOT_FOUND');
  var it = findOne_('Items', 'item_id', r.item_id);
  if (!it) throw apiError_('NOT_FOUND');
  if (!canSeeRecords_(ctx.user, it)) throw apiError_('FORBIDDEN');
  return { r: r, it: it };
}

function recordResult_(ctx, row) {
  return { entity_type: 'RECORD', entity_id: row.record_id, record_version: row.record_version, record: projectRow_(ctx, row) };
}

/** Loại kỳ của biểu: cột period_type, không có thì suy từ chu kỳ hồ sơ (ngày) */
function itemPeriodType_(it) {
  return PERIOD_TYPES_.indexOf(it.period_type) >= 0 ? it.period_type : periodTypeFromDays_(it.period_days);
}

/**
 * Ngày bắt đầu tính hồ sơ của biểu (mục 6.3): records_from (đặt khi ban hành lần đầu trong app, không lùi khi ban hành lại);
 * biểu ● nhập từ Excel = records_start_date (Cài đặt), muộn hơn thì ngày ban hành ở cột V; còn lại = ngày ban hành.
 */
function recordsStart_(it, startSetting) {
  if (it.records_from) return String(it.records_from);
  if (it.issued_source === 'IMPORT') {
    if (startSetting && it.issued_at && String(it.issued_at) > startSetting) return String(it.issued_at);
    return startSetting || String(it.issued_at || '');
  }
  return String(it.issued_at || '');
}

/**
 * Biểu có tính hồ sơ không: {type, counted, reason, start, src}. reason: NOT_ISSUED (○ ◐ ✕) · FROM_APP (nơi làm M&E / Checksheet
 * mà app đó chưa nối) · NO_START (chưa có ngày bắt đầu tính). src: app đã nối cung cấp ngày có hồ sơ cho biểu ('' nếu không) —
 * khi đó ngày bắt đầu tính không sớm hơn evidenceFrom_ (kỳ cũ hơn không còn ngày từ app kia: không tính, không báo quá hạn).
 * Giống hệt countInfo() trong js/periods.js.
 */
function recordCountInfo_(it, startSetting, today, srcs) {
  var type = itemPeriodType_(it);
  var src = evidenceSourceOf_(it);
  var live = !!(src && srcs && srcs[src]);
  var reason = it.status !== 'ISSUED' ? 'NOT_ISSUED' : ((it.where === 'ME' || it.where === 'CS') && !live ? 'FROM_APP' : '');
  var start = reason ? '' : recordsStart_(it, startSetting);
  if (!reason && !isDateStr_(start)) { reason = 'NO_START'; start = ''; }
  if (!reason && live && type !== 'EVENT') {
    var ef = evidenceFrom_(type, today);
    if (ef > start) start = ef;
  }
  return { type: type, counted: !reason, reason: reason, start: start, src: live ? src : '' };
}

/**
 * Tình trạng hồ sơ của một biểu: n kỳ gần nhất (cũ → mới) và kỳ "đến hạn xét" gần nhất.
 * recs: hồ sơ SUBMITTED của biểu; evs: dòng Evidence (ngày có hồ sơ từ M&E / Checksheet) của biểu; srcs: app đã nối {ME, CS}.
 * Trả {type, counted, reason, start, src, cells:[{key, from, to, st}], due_key, due_st, overdue, late_n, last_date, count}.
 * Ô OK khi có hồ sơ giao với kỳ hoặc dòng Evidence (số lượt > 0) giao với kỳ. count = số hồ sơ + số lượt từ app kia.
 * Kỳ "đến hạn xét" = kỳ mới nhất đã kết thúc quá số ngày cho phép trễ; Quá hạn ở đó → biểu tính là "hồ sơ quá hạn" ở trang chủ.
 * Giống hệt itemRecordStatus() trong js/periods.js.
 */
function itemRecordStatus_(it, recs, today, grace, startSetting, n, evs, srcs) {
  evs = evs || [];
  var ci = recordCountInfo_(it, startSetting, today, srcs);
  var type = ci.type, counted = ci.counted, start = ci.start;
  var last = '', cnt = recs.length;
  recs.forEach(function (r) { var d = String(r.period_to || r.record_date || ''); if (d > last) last = d; });
  evs.forEach(function (e) { var d = String(e.last_date || ''); if (d > last) last = d; cnt += Number(e.count) || 0; });
  var out = { type: type, counted: counted, reason: ci.reason, start: start, src: ci.src, cells: [], due_key: '', due_st: '', overdue: false, late_n: 0, last_date: last, count: cnt };
  if (type === 'EVENT') return out;
  var cellState = function (p) {
    for (var i = 0; i < recs.length; i++) if (String(recs[i].period_from) <= p.to && String(recs[i].period_to) >= p.from) return 'OK';
    for (var j = 0; j < evs.length; j++) if (Number(evs[j].count) > 0 && String(evs[j].period_from) <= p.to && String(evs[j].period_to) >= p.from) return 'OK';
    if (!counted || p.to < start) return 'NA';
    return addDaysIso_(p.to, grace) < today ? 'LATE' : 'DUE';
  };
  lastPeriods_(type, today, n).forEach(function (p) {
    var s = cellState(p);
    if (s === 'LATE') out.late_n++;
    out.cells.push({ key: p.key, from: p.from, to: p.to, st: s });
  });
  if (counted) {
    var p = periodOf_(type, today);
    for (var g = 0; g < 800 && p && !(addDaysIso_(p.to, grace) < today); g++) p = periodOf_(type, addDaysIso_(p.from, -1));
    if (p && p.to >= start) {
      out.due_key = p.key;
      out.due_st = cellState(p);
      out.overdue = out.due_st === 'LATE';
    }
  }
  return out;
}

function graceDays_() {
  var g = Number(setting_('record_grace_days'));
  return g >= 0 ? Math.floor(g) : 3;
}

/* ---------------- record.submit ---------------- */

/**
 * record.submit {record_id, item_id, period_from, period_to, record_date?, pages, note?} — expected_version 0.
 * Mã HS-yymm-0001 do máy chủ cấp. pages = số ảnh / tệp sẽ gửi sau bằng doc.upload (1–30). Khoảng ngày tối đa 400 ngày.
 */
function recordSubmit_(ctx) {
  var p = ctx.req.payload || {};
  var errs = [];
  if (!isUuidV4_(p.record_id)) errs.push(fieldError_('record_id', 'ID_INVALID'));
  if (!isUuidV4_(p.item_id)) errs.push(fieldError_('item_id', 'ID_INVALID'));
  if (Number(ctx.req.expected_version || 0) !== 0) errs.push(fieldError_('expected_version', 'INVALID_VALUE'));
  var from = trimStr_(p.period_from), to = trimStr_(p.period_to);
  if (!isDateStr_(from)) errs.push(fieldError_('period_from', 'INVALID_DATE'));
  if (!isDateStr_(to)) errs.push(fieldError_('period_to', 'INVALID_DATE'));
  var rdate = p.record_date === undefined || p.record_date === null ? '' : trimStr_(p.record_date);
  if (rdate && !isDateStr_(rdate)) errs.push(fieldError_('record_date', 'INVALID_DATE'));
  var pages = Number(p.pages);
  if (!(pages >= 1 && pages <= RECORD_MAX_FILES_ && Math.floor(pages) === pages)) errs.push(fieldError_('pages', 'PAGES_INVALID'));
  var note = trimStr_(p.note);
  if (note.length > 500) errs.push(fieldError_('note', 'TOO_LONG'));
  if (errs.length) throw validationError_(errs);
  var today = todayVN_();
  if (from > to) errs.push(fieldError_('period_to', 'RANGE_INVALID'));
  else if (daysBetweenIso_(from, to) >= RECORD_MAX_RANGE_DAYS_) errs.push(fieldError_('period_to', 'RANGE_TOO_LONG'));
  if (from < '2000-01-01' || from > addDaysIso_(today, 31)) errs.push(fieldError_('period_from', 'DATE_OUT_OF_RANGE'));
  if (errs.length) throw validationError_(errs);
  ensureRecordsSheet_();
  var it = findOne_('Items', 'item_id', p.item_id);
  if (!it || it.archived_at) throw validationError_([fieldError_('item_id', 'NOT_FOUND')]);
  if (!itemVisible_(ctx.user, it) || !canSubmitRecord_(ctx.user, it)) throw apiError_('FORBIDDEN');
  var bad = recordItemCheck_(it);
  if (bad) throw validationError_([fieldError_('item_id', bad)]);
  if (!rdate) rdate = to < today ? to : (from > today ? from : today);
  return executeWrite_(ctx, {
    entity_type: 'RECORD', entity_id: p.record_id,
    build: function (st) {
      assertNewId_('Records', 'record_id', p.record_id);
      var cur = findOne_('Items', 'item_id', p.item_id);
      var bad2 = recordItemCheck_(cur);
      if (bad2) throw validationError_([fieldError_('item_id', bad2)]);
      var su = {};
      var code = allocCode_(st, su, 'RECORD', now_());
      var row = cNew_(ctx, {
        record_id: p.record_id, code: code, item_id: cur.item_id, dept_code: cur.dept_code, period_type: itemPeriodType_(cur),
        period_from: from, period_to: to, record_date: rdate, pages: pages, files_json: [], note: note, status: 'SUBMITTED',
        submitted_at: isoVN_(now_()), submitted_by: ctx.user.user_id, client_created_at: String(ctx.req.client_time || '').slice(0, 40),
        returned_at: '', returned_by: '', return_reason: '', void_at: '', void_by: '', void_reason: ''
      });
      return {
        writes: [{ sheet: 'Records', mode: 'insert', row: row }], state: su,
        result: recordResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'RECORD', entity_id: row.record_id, before_json: null,
          after_json: { code: code, item_id: row.item_id, period_from: from, period_to: to, pages: pages, via_queue: !!ctx.viaPush } }
      };
    }
  });
}

/* ---------------- record.return (trưởng bộ phận, Thư ký ISO; PIN) ---------------- */

/** Kiểm quyền + trạng thái trước khi hỏi PIN (09_api PRECHECK_) */
function precheckRecordReturn_(ctx) {
  var x = loadRecord_(ctx, (ctx.req.payload || {}).record_id);
  if (!canReturnRecord_(ctx.user, x.it)) throw apiError_('FORBIDDEN');
  if (x.r.status !== 'SUBMITTED') throw validationError_([fieldError_('state', 'STATUS_INVALID')]);
}

/** record.return {record_id, reason}: hồ sơ nộp sai → RETURNED kèm lý do; kỳ đó tính lại như chưa có, người nộp thấy ở Chờ bạn xử lý */
function recordReturn_(ctx) {
  var p = ctx.req.payload || {};
  var x = loadRecord_(ctx, p.record_id);
  if (!canReturnRecord_(ctx.user, x.it)) throw apiError_('FORBIDDEN');
  if (x.r.status !== 'SUBMITTED') throw validationError_([fieldError_('state', 'STATUS_INVALID')]);
  var reason = trimStr_(p.reason);
  if (!reason) throw validationError_([fieldError_('reason', 'REQUIRED')]);
  if (reason.length > 500) throw validationError_([fieldError_('reason', 'TOO_LONG')]);
  return executeWrite_(ctx, {
    entity_type: 'RECORD', entity_id: p.record_id,
    build: function () {
      var cur = findOne_('Records', 'record_id', p.record_id);
      if (!cur) throw apiError_('NOT_FOUND');
      assertVersion_(ctx, cur, 'RECORD', 'Records');
      if (cur.status !== 'SUBMITTED') throw validationError_([fieldError_('state', 'STATUS_INVALID')]);
      var row = clone_(cur); delete row.__row;
      row.status = 'RETURNED';
      row.returned_at = isoVN_(now_());
      row.returned_by = ctx.user.user_id;
      row.return_reason = reason;
      cUpdate_(ctx, row);
      return {
        writes: [{ sheet: 'Records', mode: 'update', row: row }], result: recordResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'RECORD', entity_id: row.record_id, before_json: { status: 'SUBMITTED' },
          after_json: { status: 'RETURNED', code: row.code, item_id: row.item_id }, reason: reason }
      };
    }
  });
}

/* ---------------- record.status (máy chủ tính, bộ đệm 5 phút) ---------------- */

var CELL_FROM_CODE_ = { O: 'OK', L: 'LATE', D: 'DUE', N: 'NA' };

/**
 * Tình trạng hồ sơ của mọi biểu, gọn để đệm: {today, grace, start_setting, sources, n, items: {item_id: [type, counted, reason, start,
 * chuỗi ô (O L D N, cũ → mới), due_key, due_st, late_n, last_date, count, src]}}. Khóa đệm theo phiên bản bảng Items/Records/Evidence,
 * hôm nay, số ngày cho phép trễ, ngày bắt đầu tính, app đã nối → không bao giờ trả số cũ sau khi có ghi; hết hạn sau
 * record_status_cache_seconds.
 */
function recordStatusAll_() {
  var st = readState_();
  var today = todayVN_();
  var grace = graceDays_();
  var startSet = String(setting_('records_start_date') || '');
  var srcs = evidenceSources_();
  var srcStr = evidenceSourcesStr_(srcs);
  var n = 12;
  var key = 'rs2:' + (sysProps_().dataset_epoch || '') + ':' + Number(stateGet_(st, 'table_rev.Records', 0)) + ':' +
    Number(stateGet_(st, 'table_rev.Items', 0)) + ':' + Number(stateGet_(st, 'table_rev.Evidence', 0)) + ':' + today + ':' + grace + ':' +
    startSet + ':' + srcStr + ':' + (st.map.schema_version || '');
  var c = cache_();
  try { var hit = c.get(key); if (hit) return JSON.parse(hit); } catch (e) { /* tính lại */ }
  var hasRec = sheetExists_('Records'), hasEv = sheetExists_('Evidence');
  var tc = tableCache_(['Items'].concat(hasRec ? ['Records'] : [], hasEv ? ['Evidence'] : []), st);
  var byItem = {}, evByItem = {};
  if (hasRec) {
    tc.rows('Records').forEach(function (r) {
      if (r.archived_at || r.status !== 'SUBMITTED') return;
      (byItem[r.item_id] = byItem[r.item_id] || []).push(r);
    });
  }
  if (hasEv) {
    tc.rows('Evidence').forEach(function (e) {
      if (e.archived_at || !(Number(e.count) > 0)) return;
      (evByItem[e.item_id] = evByItem[e.item_id] || []).push(e);
    });
  }
  var out = { today: today, grace: grace, start_setting: startSet, sources: srcStr, n: n, items: {} };
  tc.rows('Items').forEach(function (it) {
    if (it.archived_at) return;
    var s = itemRecordStatus_(it, byItem[it.item_id] || [], today, grace, startSet, n, evByItem[it.item_id] || [], srcs);
    out.items[it.item_id] = [s.type, s.counted ? 1 : 0, s.reason, s.start, s.cells.map(function (x) { return CELL_CODES_[x.st]; }).join(''),
      s.due_key, s.due_st ? CELL_CODES_[s.due_st] : '', s.late_n, s.last_date, s.count, s.src];
  });
  try {
    var ttl = Math.max(60, Math.min(21600, Number(setting_('record_status_cache_seconds')) || 300));
    c.put(key, JSON.stringify(out), ttl);
  } catch (e2) { /* đệm đầy: bỏ qua */ }
  return out;
}

/** Bản gọn → bản đủ cho một biểu (mã kỳ tính lại từ loại kỳ và hôm nay) */
function expandRecordStatus_(it, a, today, n) {
  var cells = [];
  if (a[0] !== 'EVENT') {
    var ps = lastPeriods_(a[0], today, n);
    for (var i = 0; i < ps.length; i++) cells.push({ key: ps[i].key, from: ps[i].from, to: ps[i].to, st: CELL_FROM_CODE_[a[4].charAt(i)] || 'NA' });
  }
  return {
    item_id: it.item_id, code: it.code, dept_code: it.dept_code, type: a[0], counted: !!a[1], reason: a[2], start: a[3], cells: cells,
    due_key: a[5], due_st: a[6] ? CELL_FROM_CODE_[a[6]] : '', overdue: a[6] === 'L', late_n: a[7], last_date: a[8], count: a[9], src: a[10] || ''
  };
}

/**
 * record.status {dept_code?, item_id?}: tình trạng hồ sơ 12 kỳ gần nhất của các biểu người dùng xem được (cấp 2+, Thư ký ISO).
 * Trả {today, grace, start_setting, items: [...], overdue_count}.
 */
function recordStatus_(ctx) {
  var p = ctx.req.payload || {};
  var all = recordStatusAll_();
  var items = tableCache_(['Items'], readState_()).rows('Items');
  var list = [];
  var overdue = 0;
  items.forEach(function (it) {
    if (it.archived_at || !all.items[it.item_id] || !canSeeRecords_(ctx.user, it)) return;
    if (p.dept_code && it.dept_code !== p.dept_code) return;
    if (p.item_id && it.item_id !== p.item_id) return;
    var s = expandRecordStatus_(it, all.items[it.item_id], all.today, all.n);
    if (s.overdue) overdue++;
    list.push(s);
  });
  return { today: all.today, grace: all.grace, start_setting: all.start_setting, sources: all.sources || '', n: all.n, items: list, overdue_count: overdue };
}
