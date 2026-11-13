/* 34_ncr: Sản phẩm không phù hợp (Đợt 3, phiên 3c), mã NC-yymm-001. Người dùng chốt 13/11/2026: giữ phạm vi Cơ điện — phiếu thuộc bộ phận
 * trong phạm vi (hàng lỗi do thiết bị, sự cố máy; vật tư, phụ tùng cơ điện không phù hợp), in theo mẫu biểu CL (Settings ncr_form_code
 * BM-CL-04-01 phiếu, ncr_log_form_code BM-CL-04-02 sổ, ncr_decision_form_code BM-CL-04-04 biên bản xử lý — sửa được ở Cấu hình).
 * Luồng (ISO 9001 điều 8.7, BRCGS Packaging — sản phẩm không phù hợp):
 *  1. Lập phiếu (cấp 2+ trong bộ phận, Thư ký ISO): nơi phát hiện, sản phẩm / vật tư, lô, số lượng, mô tả, biện pháp cách ly và nhận dạng
 *     (thẻ treo, khu vực riêng), nơi để hàng cách ly, nguyên nhân sơ bộ, người phụ trách xử lý. → Chờ quyết định (hạn ncr_decide_days ngày)
 *  2. Người có thẩm quyền quyết định xử lý (PIN): trưởng bộ phận (cấp 3 trong bộ phận) hoặc Quản trị (cấp 4); nhân nhượng / dùng nguyên
 *     trạng và hủy bỏ chỉ cấp 4 (người dùng chốt 13/11/2026). Người lập phiếu không tự quyết định (cấp 4 được khi admin_self_approval).
 *     Một phiếu nhiều dòng (cách xử lý + số lượng + ghi chú), chỉ đạo, hạn thực hiện, có cần phiếu khắc phục không; nhân nhượng ghi căn cứ
 *     (khách hàng đồng ý…). → Đang xử lý. Quyết định lại khi đang xử lý (vd làm lại không đạt → hủy); mọi lần lưu ở lịch sử.
 *  3. Xong xử lý (PIN; người sửa được phiếu, người quyết định): ngày xong, kết quả, kiểm tra lại (bắt buộc Đạt khi có làm lại / sửa chữa /
 *     hạ cấp); cần phiếu khắc phục thì phải đã lập. → Đã đóng.
 *  Phiếu khắc phục lập từ phiếu này: capa.save có ncr_id (Capas.source NCR, Capas.ncr_id; Ncrs.capa_id).
 *  Hủy phiếu lập nhầm: Thư ký ISO, người lập (PIN, lý do).
 * Gmail (19_mail.js): NCR_DECIDE chờ quyết định → trưởng bộ phận / Quản trị theo hạn quyết định; NCR_DUE đang xử lý → người phụ trách theo
 * hạn thực hiện — mốc 7, 1, 0 ngày trước hạn, quá hạn mỗi 7 ngày (như khắc phục).
 * Báo cáo (27_reports.js, loại NCR): một phiếu (mẫu NCR phiếu / DECISION biên bản xử lý) hoặc sổ theo dõi theo năm. */

/* ---------------- Quyền ---------------- */

/** Thấy phiếu: cấp 2+ / Thư ký ISO, bộ phận trong phạm vi; phiếu của bộ phận mình (mọi bộ phận khi không giới hạn), phiếu mình lập / phụ trách */
function ncrVisible_(u, n) {
  if (!n || !inScopeDept_(n.dept_code)) return false;
  if (!isSecretary_(u) && Number(u.role_level) < 2) return false;
  if (seesAllDepts_(u) || userDepts_(u).indexOf(n.dept_code) >= 0) return true;
  return n.owner_user_id === u.user_id || n.created_by === u.user_id;
}

/** Lập phiếu cho bộ phận: cấp 2+ trong bộ phận, Thư ký ISO */
function canCreateNcr_(u, dept) {
  return isSecretary_(u) || (Number(u.role_level) >= 2 && deptWritable_(u, dept));
}

/** Sửa phiếu (chờ quyết định / đang xử lý): Thư ký ISO, trưởng bộ phận (cấp 3 trong bộ phận), người phụ trách, người lập */
function canEditNcr_(u, n) {
  if (!n || !inScopeDept_(n.dept_code)) return false;
  if (isSecretary_(u)) return true;
  if (Number(u.role_level) >= 3 && deptWritable_(u, n.dept_code)) return true;
  return Number(u.role_level) >= 2 && (n.owner_user_id === u.user_id || n.created_by === u.user_id);
}

/** Quyết định xử lý: trưởng bộ phận (cấp 3 trong bộ phận), Quản trị (cấp 4); người lập phiếu không tự quyết định (cấp 4 được khi
 *  admin_self_approval — app có thể chỉ có owner + Thư ký ISO). Nhân nhượng / hủy bỏ kiểm thêm ở canDecideLines_ */
function canDecideNcr_(u, n) {
  if (!n || !inScopeDept_(n.dept_code)) return false;
  var lvl = Number(u.role_level);
  if (lvl >= 4) return n.created_by !== u.user_id || !!setting_('admin_self_approval');
  return lvl === 3 && deptWritable_(u, n.dept_code) && n.created_by !== u.user_id;
}

/** Quyết định có nhân nhượng / hủy bỏ */
function ncrNeedsTop_(lines) {
  return (lines || []).some(function (l) { return NCR_TOP_DISPOSITIONS_.indexOf(l && l.d) >= 0; });
}

/** Xác nhận xong xử lý (đóng phiếu): người sửa được phiếu, người quyết định được */
function canCloseNcr_(u, n) {
  return canEditNcr_(u, n) || canDecideNcr_(u, n);
}

/** Hủy phiếu lập nhầm: Thư ký ISO, người lập */
function canCancelNcr_(u, n) {
  return !!n && inScopeDept_(n.dept_code) && (isSecretary_(u) || (Number(u.role_level) >= 2 && n.created_by === u.user_id));
}

/** Gắn ảnh / tệp: phiếu chờ quyết định / đang xử lý; người sửa được phiếu, người quyết định */
function canNcrFiles_(u, n) {
  return (n.state === 'OPEN' || n.state === 'DECIDED') && (canEditNcr_(u, n) || canDecideNcr_(u, n));
}

/* ---------------- Tiện ích ---------------- */

/** Bảng tính đã có sheet Ncrs và cột Capas.ncr_id (3c) */
function ncrSchemaReady_() {
  try { return sheetExists_('Ncrs') && capaSchemaReady_() && hdr_('Capas').idx.ncr_id !== undefined; } catch (e) { return false; }
}

/** Dán Code.gs 3c mà chưa chạy migrateSchema: lần ghi đầu tiên tự thêm sheet Ncrs, cột Capas.ncr_id */
function ensureNcrSchema_() {
  if (ncrSchemaReady_()) return;
  autoMigrate_();
  dbReset_();
  if (!ncrSchemaReady_()) throw apiError_('SYSTEM_NOT_READY');
}

/** Phiếu (ngoài khóa) cho kiểm quyền; NOT_FOUND khi không có, FORBIDDEN khi không xem được */
function loadNcr_(ctx, id) {
  ensureNcrSchema_();
  if (!isUuidV4_(id)) throw validationError_([fieldError_('ncr_id', 'ID_INVALID')]);
  var n = findOne_('Ncrs', 'ncr_id', id);
  if (!n || n.archived_at) throw apiError_('NOT_FOUND');
  if (!ncrVisible_(ctx.user, n)) throw apiError_('FORBIDDEN');
  return n;
}

/** Đọc lại dưới khóa ghi (so expected_version khi checkVersion); trả bản sao để sửa */
function lockedNcr_(ctx, id, checkVersion) {
  var cur = findOne_('Ncrs', 'ncr_id', id);
  if (!cur) throw apiError_('NOT_FOUND');
  if (checkVersion) assertVersion_(ctx, cur, 'NCR', 'Ncrs');
  var row = clone_(cur); delete row.__row;
  return row;
}

function ncrResult_(ctx, row) {
  return { entity_type: 'NCR', entity_id: row.ncr_id, record_version: row.record_version, record: projectRow_(ctx, row) };
}

/** Tên phiếu (một dòng): sản phẩm — đầu mô tả */
function ncrName_(n) {
  var s = String(n.problem_vi || n.problem_zh || '').split('\n')[0];
  if (s.length > 100) s = s.slice(0, 97) + '…';
  return [n.product_text, s].filter(function (x) { return x; }).join(' — ');
}

/** Phiếu quá hạn: chờ quyết định quá hạn quyết định; đang xử lý quá hạn thực hiện */
function ncrOverdue_(n, today) {
  if (n.state === 'OPEN') return !!n.decide_due && String(n.decide_due) < today;
  if (n.state === 'DECIDED') return !!n.exec_due && String(n.exec_due) < today;
  return false;
}

/** Phiếu khắc phục đang gắn (chưa hủy) */
function ncrLiveCapa_(n) {
  if (!n.capa_id || !sheetExists_('Capas')) return null;
  var c = findOne_('Capas', 'capa_id', n.capa_id);
  return c && !c.archived_at && c.state !== 'CANCELLED' ? c : null;
}

/** Hạn quyết định mặc định: ngày phát hiện + ncr_decide_days */
function ncrDecideDue_(found) {
  return found && isDateStr_(found) ? addDaysIso_(found, Math.max(0, Number(setting_('ncr_decide_days')) || 2)) : '';
}

/** Chuẩn hóa dòng quyết định [{d, qty, note}]; lỗi đẩy vào errs */
function ncrLinesIn_(errs, raw) {
  if (!Array.isArray(raw) || !raw.length) { errs.push(fieldError_('lines', 'REQUIRED')); return []; }
  if (raw.length > NCR_MAX_LINES_) { errs.push(fieldError_('lines', 'TOO_MANY_LINES')); return []; }
  var out = [];
  raw.forEach(function (l, i) {
    l = l || {};
    var d = String(l.d || '');
    if (NCR_DISPOSITIONS_.indexOf(d) < 0) errs.push(fieldError_('lines.' + i + '.d', d ? 'INVALID_VALUE' : 'REQUIRED'));
    var qty = trimStr_(l.qty || ''), note = trimStr_(l.note || '');
    if (qty.length > 100) errs.push(fieldError_('lines.' + i + '.qty', 'TOO_LONG'));
    if (note.length > 300) errs.push(fieldError_('lines.' + i + '.note', 'TOO_LONG'));
    out.push({ d: d, qty: qty, note: note });
  });
  return out;
}

/* ---------------- ncr.save ---------------- */

/**
 * ncr.save {ncr_id, stage, dept_code, ref_text?, found_date, found_by_name?, product_text (bắt buộc), lot_text?, qty_text?, party_name?,
 * severity? MINOR | MAJOR | CRITICAL, problem_vi/zh (bắt buộc một thứ tiếng), contain_vi/zh?, hold_place?, cause_vi/zh?, owner_user_id?}.
 * expected_version 0 = lập phiếu (máy chủ cấp mã NC-yymm-001, Chờ quyết định, hạn quyết định = ngày phát hiện + ncr_decide_days);
 * khác 0 = sửa phiếu chờ quyết định / đang xử lý. Người phụ trách mặc định = người lập.
 */
function ncrSave_(ctx) {
  ensureNcrSchema_();
  var p = ctx.req.payload || {};
  var u = ctx.user;
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  if (!isUuidV4_(p.ncr_id)) throw validationError_([fieldError_('ncr_id', 'ID_INVALID')]);
  var cur = isNew ? null : loadNcr_(ctx, p.ncr_id);
  if (cur && cur.state !== 'OPEN' && cur.state !== 'DECIDED') throw stateInvalid_();
  var errs = [];
  var today = todayVN_();
  var stage = p.stage === undefined ? (cur ? cur.stage : '') : String(p.stage || '');
  if (NCR_STAGES_.indexOf(stage) < 0) errs.push(fieldError_('stage', stage ? 'INVALID_VALUE' : 'REQUIRED'));
  var dept = p.dept_code === undefined ? (cur ? cur.dept_code : '') : trimStr_(p.dept_code);
  if (!dept) errs.push(fieldError_('dept_code', 'REQUIRED'));
  else if (!findOne_('Depts', 'dept_code', dept)) errs.push(fieldError_('dept_code', 'DEPT_UNKNOWN'));
  else if (!inScopeDept_(dept)) errs.push(fieldError_('dept_code', 'APP_SCOPE'));
  var found = capaDateIn_(errs, p, 'found_date');
  if (found === undefined && cur) found = cur.found_date;
  if (!found && !errs.some(function (e) { return e.field === 'found_date'; })) errs.push(fieldError_('found_date', 'REQUIRED'));
  else if (found && found > today) errs.push(fieldError_('found_date', 'DATE_FUTURE'));
  if (cur && cur.state === 'DECIDED' && found && cur.decision_date && found > cur.decision_date) errs.push(fieldError_('found_date', 'NCR_DATE'));
  var owner = p.owner_user_id === undefined ? (cur ? cur.owner_user_id : u.user_id) : (trimStr_(p.owner_user_id) || u.user_id);
  if (owner !== (cur ? cur.owner_user_id : u.user_id) && !capaUserOk_(owner)) errs.push(fieldError_('owner_user_id', 'NOT_FOUND'));
  var tx = {};
  [['ref_text', 200], ['found_by_name', 120], ['product_text', 200], ['lot_text', 200], ['qty_text', 100], ['party_name', 200], ['hold_place', 200]].forEach(function (f) {
    var v = p[f[0]] === undefined || p[f[0]] === null ? (cur ? String(cur[f[0]] || '') : '') : trimStr_(p[f[0]]);
    if (v.length > f[1]) errs.push(fieldError_(f[0], 'TOO_LONG'));
    tx[f[0]] = v;
  });
  if (!tx.product_text) errs.push(fieldError_('product_text', 'REQUIRED'));
  var sev = p.severity === undefined || p.severity === null ? (cur ? String(cur.severity || '') : '') : String(p.severity || '');
  if (sev && CAPA_SEVERITIES_.indexOf(sev) < 0) errs.push(fieldError_('severity', 'INVALID_VALUE'));
  ['problem_vi', 'problem_zh', 'contain_vi', 'contain_zh', 'cause_vi', 'cause_zh'].forEach(function (k) { capaTextLen_(errs, p, k, 3000); });
  requireOneLang_(errs, p, cur, 'problem');
  if (errs.length) throw validationError_(errs);
  if (isNew) {
    if (!canCreateNcr_(u, dept)) throw apiError_('FORBIDDEN');
  } else if (!canEditNcr_(u, cur) || (dept !== cur.dept_code && !canCreateNcr_(u, dept))) {
    throw apiError_('FORBIDDEN');
  }
  var tr = applyTranslations_('Ncrs', ['problem', 'contain', 'cause'], p, cur); // dịch ngoài khóa ghi
  return executeWrite_(ctx, {
    entity_type: 'NCR', entity_id: p.ncr_id,
    build: function (st) {
      var row, su = {};
      if (isNew) {
        assertNewId_('Ncrs', 'ncr_id', p.ncr_id);
        row = cNew_(ctx, {
          ncr_id: p.ncr_id, code: allocCode_(st, su, 'NCR'), stage: '', dept_code: '', ref_text: '', found_date: '', found_by_name: '', product_text: '',
          lot_text: '', qty_text: '', party_name: '', severity: '', problem_vi: '', problem_zh: '', contain_vi: '', contain_zh: '', hold_place: '',
          cause_vi: '', cause_zh: '', owner_user_id: '', decide_due: '', state: 'OPEN', files_json: [], decision_json: [], decision_note_vi: '',
          decision_note_zh: '', decision_date: '', decided_at: '', decided_by: '', exec_due: '', need_capa: '', concession_text: '',
          decision_history_json: [], done_date: '', result_vi: '', result_zh: '', recheck: '', closed_at: '', closed_by: '', capa_id: '',
          cancelled_at: '', cancelled_by: '', cancel_reason: ''
        });
      } else {
        row = lockedNcr_(ctx, p.ncr_id, true);
        if (row.state !== 'OPEN' && row.state !== 'DECIDED') throw stateInvalid_();
        cUpdate_(ctx, row);
      }
      var before = isNew ? null : { stage: row.stage, dept_code: row.dept_code, found_date: row.found_date, owner_user_id: row.owner_user_id, qty_text: row.qty_text };
      row.stage = stage; row.dept_code = dept; row.found_date = found; row.owner_user_id = owner; row.severity = sev;
      Object.keys(tx).forEach(function (k) { row[k] = tx[k]; });
      if (row.state === 'OPEN') row.decide_due = ncrDecideDue_(found); // hạn quyết định theo ngày phát hiện (sửa ngày thì tính lại)
      Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
      row.i18n_meta = Object.assign({}, row.i18n_meta || {}, tr.meta);
      return {
        writes: [{ sheet: 'Ncrs', mode: isNew ? 'insert' : 'update', row: row }], state: su,
        result: ncrResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'NCR', entity_id: row.ncr_id, before_json: before,
          after_json: { code: row.code, stage: row.stage, dept_code: row.dept_code, found_date: row.found_date, owner_user_id: row.owner_user_id,
            product_text: row.product_text, qty_text: row.qty_text, created: isNew } }
      };
    }
  });
}

/* ---------------- ncr.decide ---------------- */

/** Kiểm dữ liệu quyết định (trước PIN và trong handler); trả {lines, need, date, due, concession} */
function ncrDecideInput_(ctx, n, errs) {
  var p = ctx.req.payload || {};
  var today = todayVN_();
  var lines = ncrLinesIn_(errs, p.lines);
  var need = String(p.need_capa || '');
  if (need !== 'YES' && need !== 'NO') errs.push(fieldError_('need_capa', need ? 'INVALID_VALUE' : 'REQUIRED'));
  var date = capaDateIn_(errs, p, 'decision_date');
  if (!date && !errs.some(function (e) { return e.field === 'decision_date'; })) date = today;
  if (date && (date > today || (n.found_date && date < n.found_date))) errs.push(fieldError_('decision_date', 'NCR_DATE'));
  var due = capaDateIn_(errs, p, 'exec_due');
  if (!due && !errs.some(function (e) { return e.field === 'exec_due'; }) && date) due = addDaysIso_(date, Math.max(0, Number(setting_('ncr_exec_days')) || 7));
  if (due && date && due < date) errs.push(fieldError_('exec_due', 'RANGE_INVALID'));
  var concession = trimStr_(p.concession_text || '');
  if (concession.length > 500) errs.push(fieldError_('concession_text', 'TOO_LONG'));
  if (lines.some(function (l) { return l.d === 'CONCESSION'; }) && !concession) errs.push(fieldError_('concession_text', 'REQUIRED'));
  if (!lines.some(function (l) { return l.d === 'CONCESSION'; })) concession = '';
  var input = { decision_note_vi: p.note_vi, decision_note_zh: p.note_zh };
  ['decision_note_vi', 'decision_note_zh'].forEach(function (k) { capaTextLen_(errs, input, k, 2000); });
  // Nhân nhượng / hủy bỏ chỉ Quản trị (cấp 4) quyết định
  if (ncrNeedsTop_(lines) && Number(ctx.user.role_level) < 4) errs.push(fieldError_('lines', 'NCR_TOP_ONLY'));
  return { lines: lines, need: need, date: date, due: due, concession: concession, input: input };
}

function precheckNcrDecide_(ctx) {
  var n = loadNcr_(ctx, (ctx.req.payload || {}).ncr_id);
  if (!canDecideNcr_(ctx.user, n)) throw apiError_('FORBIDDEN');
  if (n.state !== 'OPEN' && n.state !== 'DECIDED') throw stateInvalid_();
  var errs = [];
  ncrDecideInput_(ctx, n, errs); // dữ liệu sai, nhân nhượng / hủy bỏ khi không phải cấp 4: báo trước khi hỏi PIN
  if (errs.length) throw validationError_(errs);
}

/**
 * ncr.decide {ncr_id, lines [{d, qty, note}] (1–6 dòng), note_vi/zh? (chỉ đạo, lý do), decision_date? (mặc định hôm nay), exec_due? (mặc định
 * + ncr_exec_days), need_capa YES | NO, concession_text (bắt buộc khi có nhân nhượng)} (PIN): Chờ quyết định → Đang xử lý; đang xử lý thì
 * quyết định lại (lịch sử giữ mọi lần).
 */
function ncrDecide_(ctx) {
  var p = ctx.req.payload || {};
  var n = loadNcr_(ctx, p.ncr_id);
  if (!canDecideNcr_(ctx.user, n)) throw apiError_('FORBIDDEN');
  if (n.state !== 'OPEN' && n.state !== 'DECIDED') throw stateInvalid_();
  var errs = [];
  var x = ncrDecideInput_(ctx, n, errs);
  if (errs.length) throw validationError_(errs);
  var tr = applyTranslations_('Ncrs', ['decision_note'], x.input, null);
  return executeWrite_(ctx, {
    entity_type: 'NCR', entity_id: n.ncr_id,
    build: function () {
      var row = lockedNcr_(ctx, n.ncr_id, true);
      if (row.state !== 'OPEN' && row.state !== 'DECIDED') throw stateInvalid_();
      var before = { state: row.state, lines: row.decision_json || [] };
      cUpdate_(ctx, row);
      var nowIso = isoVN_(now_());
      var hist = Array.isArray(row.decision_history_json) ? row.decision_history_json.slice() : [];
      hist.push({ n: hist.length + 1, date: x.date, at: nowIso, by: ctx.user.user_id, lines: x.lines, note_vi: tr.values.decision_note_vi || '',
        note_zh: tr.values.decision_note_zh || '', need_capa: x.need, concession_text: x.concession, exec_due: x.due });
      row.decision_history_json = hist;
      row.decision_json = x.lines; row.decision_date = x.date; row.decided_at = nowIso; row.decided_by = ctx.user.user_id;
      row.exec_due = x.due; row.need_capa = x.need; row.concession_text = x.concession;
      row.decision_note_vi = tr.values.decision_note_vi || ''; row.decision_note_zh = tr.values.decision_note_zh || '';
      if (row.i18n_meta) { row.i18n_meta = clone_(row.i18n_meta); delete row.i18n_meta.decision_note; }
      row.i18n_meta = Object.assign({}, row.i18n_meta || {}, tr.meta);
      row.state = 'DECIDED';
      return {
        writes: [{ sheet: 'Ncrs', mode: 'update', row: row }], result: ncrResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'NCR', entity_id: row.ncr_id, before_json: before,
          after_json: { state: 'DECIDED', code: row.code, n: hist.length, lines: x.lines, need_capa: x.need, exec_due: x.due, concession: x.concession || undefined } }
      };
    }
  });
}

/* ---------------- ncr.close ---------------- */

/** Điều kiện đóng: kiểm tra lại Đạt khi có làm lại / sửa chữa / hạ cấp; cần phiếu khắc phục thì phải đã lập (chưa hủy) */
function ncrCloseErrors_(n, recheck) {
  var errs = [];
  if (NCR_RECHECKS_.indexOf(recheck) < 0) errs.push(fieldError_('recheck', recheck ? 'INVALID_VALUE' : 'REQUIRED'));
  else if (recheck !== 'PASS' && (n.decision_json || []).some(function (l) { return NCR_RECHECK_DISPOSITIONS_.indexOf(l.d) >= 0; })) errs.push(fieldError_('recheck', 'NCR_RECHECK'));
  if (n.need_capa === 'YES' && !ncrLiveCapa_(n)) errs.push(fieldError_('capa', 'NCR_NEED_CAPA'));
  return errs;
}

function precheckNcrClose_(ctx) {
  var p = ctx.req.payload || {};
  var n = loadNcr_(ctx, p.ncr_id);
  if (!canCloseNcr_(ctx.user, n)) throw apiError_('FORBIDDEN');
  if (n.state !== 'DECIDED') throw stateInvalid_();
  var e = ncrCloseErrors_(n, String(p.recheck || ''));
  if (e.length) throw validationError_(e);
}

/**
 * ncr.close {ncr_id, done_date, result_vi/zh, recheck PASS | NA} (PIN): Đang xử lý → Đã đóng — ngày xong xử lý (từ ngày quyết định tới hôm
 * nay), kết quả (số lượng đã làm lại đạt, đã hủy, đã trả…), kiểm tra lại sản phẩm sau xử lý.
 */
function ncrClose_(ctx) {
  var p = ctx.req.payload || {};
  var n = loadNcr_(ctx, p.ncr_id);
  if (!canCloseNcr_(ctx.user, n)) throw apiError_('FORBIDDEN');
  if (n.state !== 'DECIDED') throw stateInvalid_();
  var errs = [];
  var date = capaDateIn_(errs, p, 'done_date');
  if (!date && !errs.length) errs.push(fieldError_('done_date', 'REQUIRED'));
  else if (date && (date > todayVN_() || (n.decision_date && date < n.decision_date))) errs.push(fieldError_('done_date', 'NCR_DATE'));
  ['result_vi', 'result_zh'].forEach(function (k) { capaTextLen_(errs, p, k, 3000); });
  requireOneLang_(errs, p, null, 'result');
  var recheck = String(p.recheck || '');
  errs = errs.concat(ncrCloseErrors_(n, recheck));
  if (errs.length) throw validationError_(errs);
  var tr = applyTranslations_('Ncrs', ['result'], p, null);
  return executeWrite_(ctx, {
    entity_type: 'NCR', entity_id: n.ncr_id,
    build: function () {
      var row = lockedNcr_(ctx, n.ncr_id, true);
      if (row.state !== 'DECIDED') throw stateInvalid_();
      var e2 = ncrCloseErrors_(row, recheck);
      if (e2.length) throw validationError_(e2);
      cUpdate_(ctx, row);
      row.state = 'CLOSED'; row.done_date = date; row.recheck = recheck; row.closed_at = isoVN_(now_()); row.closed_by = ctx.user.user_id;
      row.result_vi = tr.values.result_vi || ''; row.result_zh = tr.values.result_zh || '';
      row.i18n_meta = Object.assign({}, row.i18n_meta || {}, tr.meta);
      return {
        writes: [{ sheet: 'Ncrs', mode: 'update', row: row }], result: ncrResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'NCR', entity_id: row.ncr_id, before_json: { state: 'DECIDED' }, after_json: { state: 'CLOSED', code: row.code, done_date: date, recheck: recheck } }
      };
    }
  });
}

/* ---------------- ncr.cancel ---------------- */

function precheckNcrCancel_(ctx) {
  var n = loadNcr_(ctx, (ctx.req.payload || {}).ncr_id);
  if (!canCancelNcr_(ctx.user, n)) throw apiError_('FORBIDDEN');
  if (n.state !== 'OPEN' && n.state !== 'DECIDED') throw stateInvalid_();
}

/** ncr.cancel {ncr_id, reason} (PIN): hủy phiếu lập nhầm / trùng — Thư ký ISO, người lập */
function ncrCancel_(ctx) {
  var p = ctx.req.payload || {};
  var n = loadNcr_(ctx, p.ncr_id);
  if (!canCancelNcr_(ctx.user, n)) throw apiError_('FORBIDDEN');
  if (n.state !== 'OPEN' && n.state !== 'DECIDED') throw stateInvalid_();
  var reason = reasonText_(p, 'reason', true, 1000);
  return executeWrite_(ctx, {
    entity_type: 'NCR', entity_id: n.ncr_id,
    build: function () {
      var row = lockedNcr_(ctx, n.ncr_id, true);
      if (row.state !== 'OPEN' && row.state !== 'DECIDED') throw stateInvalid_();
      var before = row.state;
      cUpdate_(ctx, row);
      row.state = 'CANCELLED'; row.cancelled_at = isoVN_(now_()); row.cancelled_by = ctx.user.user_id; row.cancel_reason = reason;
      return {
        writes: [{ sheet: 'Ncrs', mode: 'update', row: row }], result: ncrResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'NCR', entity_id: row.ncr_id, before_json: { state: before }, after_json: { state: 'CANCELLED', code: row.code }, reason: reason }
      };
    }
  });
}

/* ---------------- Phiếu khắc phục lập từ phiếu NC (32_capa.js capa.save có ncr_id) ---------------- */

/** Phiếu NC còn lập được phiếu khắc phục: chưa có, hoặc phiếu đã gắn bị hủy */
function ncrCapaFree_(n) {
  if (!n.capa_id) return true;
  var c = sheetExists_('Capas') ? findOne_('Capas', 'capa_id', n.capa_id) : null;
  return !c || !!c.archived_at || c.state === 'CANCELLED';
}

/** Kiểm phiếu NC trước khi lập phiếu khắc phục từ nó (ngoài khóa); lỗi đẩy vào errs; trả phiếu NC hoặc null */
function ncrForCapa_(ctx, ncrId, errs) {
  ensureNcrSchema_();
  if (!isUuidV4_(ncrId)) { errs.push(fieldError_('ncr_id', 'ID_INVALID')); return null; }
  var n = findOne_('Ncrs', 'ncr_id', ncrId);
  if (!n || n.archived_at || !ncrVisible_(ctx.user, n)) { errs.push(fieldError_('ncr_id', 'NOT_FOUND')); return null; }
  if (n.state === 'CANCELLED') { errs.push(fieldError_('ncr_id', 'STATUS_INVALID')); return null; }
  if (!ncrCapaFree_(n)) { errs.push(fieldError_('ncr_id', 'NCR_HAS_CAPA')); return null; }
  return n;
}

/** Dưới khóa ghi: gắn phiếu khắc phục mới vào phiếu NC (không tăng record_version — app nhận lại phiếu qua sync_revision mới) */
function ncrLinkCapaWrite_(ncrId, capaId) {
  var cur = findOne_('Ncrs', 'ncr_id', ncrId);
  if (!cur || cur.state === 'CANCELLED') throw validationError_([fieldError_('ncr_id', 'STATUS_INVALID')]);
  if (!ncrCapaFree_(cur)) throw validationError_([fieldError_('ncr_id', 'NCR_HAS_CAPA')]);
  var row = clone_(cur); delete row.__row;
  row.capa_id = capaId;
  return { sheet: 'Ncrs', mode: 'update', row: row };
}

/* ---------------- Đồng bộ (13_sync.js) ---------------- */

function syncNcrVisible_(ctx, n) {
  return !!n && !n.archived_at && ncrVisible_(ctx.user, n);
}

/* ---------------- Gmail nhắc hạn (19_mail.js) ---------------- */

/** Người quyết định nhận nhắc: trưởng bộ phận (nếu được quyết định phiếu này); không có thì Quản trị (cấp 4) được quyết định; không ai thì
 *  Thư ký ISO */
function ncrDeciders_(mc, n) {
  var d = mc.depts[n.dept_code];
  var h = d && d.head_user_id ? mc.byId[d.head_user_id] : null;
  if (h && h.active && canDecideNcr_(h, n)) return [h.user_id];
  var pool = mc.users.filter(function (u) { return u.active && Number(u.role_level) >= 4 && canDecideNcr_(u, n); });
  var others = pool.filter(function (u) { return u.user_id !== n.created_by; });
  pool = others.length ? others : pool;
  return pool.length ? pool.map(function (u) { return u.user_id; }) : mc.secretaries.map(function (u) { return u.user_id; });
}

/** Cách xử lý (một dòng chữ): "Làm lại 300 tờ; Hủy bỏ 200 tờ" */
function ncrLinesText_(lines) {
  return (lines || []).map(function (l) { return lab_('ncr.disp.' + l.d) + (l.qty ? ' ' + l.qty : ''); }).join('; ');
}

/** Việc cần nhắc của sản phẩm không phù hợp (thêm vào mailDesired_): NCR_DECIDE, NCR_DUE */
function ncrMailNotes_(mc, out) {
  if (!sheetExists_('Ncrs')) return;
  var today = mc.today;
  var secIds = mc.secretaries.map(function (u) { return u.user_id; });
  readRows_('Ncrs').forEach(function (n) {
    if (n.archived_at || !inScopeDept_(n.dept_code) || (n.state !== 'OPEN' && n.state !== 'DECIDED')) return;
    var due = String((n.state === 'OPEN' ? n.decide_due : n.exec_due) || '');
    if (!isDateStr_(due)) return;
    var mark = capaStage_(daysBetweenIso_(today, due));
    if (!mark) return;
    var owner = n.owner_user_id && mc.byId[n.owner_user_id] && mc.byId[n.owner_user_id].active ? n.owner_user_id : '';
    out.push({
      kind: n.state === 'OPEN' ? 'NCR_DECIDE' : 'NCR_DUE', entity_type: 'NCR', entity_id: n.ncr_id, stage: n.state + ':' + due + ':' + mark, due_date: due,
      to: n.state === 'OPEN' ? ncrDeciders_(mc, n) : (owner ? [owner] : secIds), queue: true,
      detail: { code: n.code, name: ncrName_(n), dept_code: n.dept_code, dept: deptName_(mc, n.dept_code), path: '/ncr/' + n.ncr_id, due: due, mark: mark,
        qty: n.qty_text || '', lines: n.state === 'DECIDED' ? ncrLinesText_(n.decision_json) : '', owner: userName_(mc, n.owner_user_id) }
    });
  });
}

/* ---------------- Báo cáo (27_reports.js, loại NCR) ---------------- */

function reportNcrRow_(n, dir, capas, today) {
  var c = n.capa_id ? capas[n.capa_id] : null;
  var hist = Array.isArray(n.decision_history_json) ? n.decision_history_json : [];
  return {
    ncr_id: n.ncr_id, code: n.code, stage: n.stage, dept_code: n.dept_code, state: n.state, overdue: ncrOverdue_(n, today),
    ref_text: n.ref_text || '', found_date: String(n.found_date || ''), found_by_name: n.found_by_name || '', product_text: n.product_text || '',
    lot_text: n.lot_text || '', qty_text: n.qty_text || '', party_name: n.party_name || '', severity: n.severity || '',
    problem_vi: n.problem_vi || '', problem_zh: n.problem_zh || '', contain_vi: n.contain_vi || '', contain_zh: n.contain_zh || '',
    hold_place: n.hold_place || '', cause_vi: n.cause_vi || '', cause_zh: n.cause_zh || '', owner: reportUserName_(dir, n.owner_user_id),
    decide_due: String(n.decide_due || ''), created_by: reportUserName_(dir, n.created_by), created_at: String(n.created_at || ''),
    lines: Array.isArray(n.decision_json) ? n.decision_json : [], decision_note_vi: n.decision_note_vi || '', decision_note_zh: n.decision_note_zh || '',
    decision_date: String(n.decision_date || ''), decided_by: reportUserName_(dir, n.decided_by), exec_due: String(n.exec_due || ''),
    need_capa: n.need_capa || '', concession_text: n.concession_text || '',
    history: hist.map(function (h) {
      return { n: h.n, date: String(h.date || ''), by: reportUserName_(dir, h.by), lines: h.lines || [], note_vi: h.note_vi || '', note_zh: h.note_zh || '',
        need_capa: h.need_capa || '', concession_text: h.concession_text || '', exec_due: String(h.exec_due || '') };
    }),
    done_date: String(n.done_date || ''), result_vi: n.result_vi || '', result_zh: n.result_zh || '', recheck: n.recheck || '',
    closed_at: String(n.closed_at || ''), closed_by: reportUserName_(dir, n.closed_by), capa_code: c ? c.code : '', capa_state: c ? c.state : '',
    cancelled_at: String(n.cancelled_at || ''), cancel_reason: n.cancel_reason || '', files: (n.files_json || []).length
  };
}

/**
 * Báo cáo NCR: {ncr_id, form NCR | DECISION} → một phiếu (phiếu sản phẩm không phù hợp / biên bản xử lý); {dept, year, state ALL | OPEN |
 * DECIDED | OVERDUE | CLOSED} → sổ theo dõi sản phẩm không phù hợp theo năm phát hiện
 */
function reportNcr_(ctx, f, today) {
  var dir = userDirectory_();
  var capas = {};
  if (sheetExists_('Capas')) readRows_('Capas').forEach(function (c) { if (!c.archived_at) capas[c.capa_id] = c; });
  var all = (sheetExists_('Ncrs') ? readRows_('Ncrs') : []).filter(function (n) { return !n.archived_at && ncrVisible_(ctx.user, n); });
  if (f.ncr_id) {
    var one = all.filter(function (n) { return n.ncr_id === f.ncr_id; })[0];
    if (!one) {
      var ex = sheetExists_('Ncrs') ? findOne_('Ncrs', 'ncr_id', f.ncr_id) : null;
      if (ex && !ex.archived_at) throw apiError_('FORBIDDEN');
      throw validationError_([fieldError_('filters.ncr_id', 'NOT_FOUND')]);
    }
    var r = reportNcrRow_(one, dir, capas, today);
    var due = r.state === 'OPEN' ? r.decide_due : r.state === 'DECIDED' ? r.exec_due : '';
    return {
      data: { one: r }, rows: 1,
      tiles: [
        { k: 'rpt.t.ncr_state', v: lab_('ncr.state.' + r.state), tone: r.state === 'CLOSED' ? 'green' : r.state === 'CANCELLED' ? 'muted' : (r.overdue ? 'red' : 'amber') },
        { k: 'rpt.t.ncr_qty', v: r.qty_text || '—' },
        { k: r.state === 'OPEN' ? 'rpt.t.ncr_decide_due' : 'rpt.t.ncr_exec_due', v: due ? fmtDateVN_(due) : (r.done_date ? fmtDateVN_(r.done_date) : '—'), tone: r.overdue ? 'red' : '' },
        { k: 'rpt.t.ncr_capa', v: r.capa_code || (r.need_capa === 'YES' ? lab_('ncr.capa_missing') : '—'), tone: r.need_capa === 'YES' && !r.capa_code ? 'red' : '' }
      ]
    };
  }
  var y = String(f.year);
  var cnt = { total: 0, open: 0, decided: 0, overdue: 0, closed: 0 };
  var rows = [];
  all.forEach(function (n) {
    if (String(n.found_date || n.created_at || '').slice(0, 4) !== y) return;
    if (f.dept && n.dept_code !== f.dept) return;
    if (n.state === 'CANCELLED' && f.state !== 'ALL') return;
    var od = ncrOverdue_(n, today);
    if (n.state !== 'CANCELLED') cnt.total++;
    if (n.state === 'OPEN') cnt.open++;
    if (n.state === 'DECIDED') cnt.decided++;
    if (n.state === 'CLOSED') cnt.closed++;
    if (od) cnt.overdue++;
    if (f.state === 'OVERDUE' ? !od : (f.state !== 'ALL' && f.state !== n.state)) return;
    rows.push(reportNcrRow_(n, dir, capas, today));
  });
  rows.sort(function (a, b) { return String(a.code).localeCompare(String(b.code)); });
  return {
    data: { depts: reportGroupByDept_(rows, reportDepts_()), counts: cnt, year: f.year },
    rows: rows.length,
    tiles: [
      { k: 'rpt.t.ncr_total', v: String(cnt.total) },
      { k: 'rpt.t.ncr_open', v: String(cnt.open), tone: cnt.open ? 'amber' : '' },
      { k: 'rpt.t.ncr_decided', v: String(cnt.decided), tone: cnt.decided ? 'amber' : '' },
      { k: 'rpt.t.ncr_overdue', v: String(cnt.overdue), tone: cnt.overdue ? 'red' : '' },
      { k: 'rpt.t.ncr_closed', v: String(cnt.closed), tone: cnt.closed ? 'green' : '' }
    ]
  };
}

var NCR_TONE_ = { OPEN: 'amber', DECIDED: 'navy', CLOSED: 'green', CANCELLED: 'muted' };

/** Bảng dòng quyết định: cách xử lý · số lượng · ghi chú */
function ncrLinesTable_(lines) {
  var tones = [];
  var rows = (lines || []).map(function (l) {
    tones.push([NCR_TOP_DISPOSITIONS_.indexOf(l.d) >= 0 ? 'red' : 'navy', '', '']);
    return [labNl_('ncr.disp.' + l.d), l.qty || '', l.note || ''];
  });
  return rptTable_([labNl_('ncr.disp'), labNl_('ncr.line_qty'), labNl_('ncr.line_note')], ['text', 'text', 'text'], rows, tones);
}

/** Các dòng nhãn – giá trị của quyết định hiện hành */
function ncrDecisionKv_(r) {
  if (!r.lines.length) {
    return [[lab_('ncr.decision'), r.state === 'CANCELLED' ? '—' : lab_('ncr.not_decided', { D: dmy_(r.decide_due) || '—' })]];
  }
  var kv = [];
  if (r.decision_note_vi || r.decision_note_zh) kv.push([lab_('ncr.decision_note'), biNl_(r.decision_note_vi, r.decision_note_zh)]);
  if (r.concession_text) kv.push([lab_('ncr.concession'), r.concession_text]);
  kv.push([lab_('ncr.decided_by'), [r.decided_by, dmy_(r.decision_date)].filter(function (x) { return x; }).join(' · ')]);
  kv.push([lab_('ncr.exec_due'), dmy_(r.exec_due)]);
  kv.push([lab_('ncr.need_capa'), lab_('ncr.need_capa.' + (r.need_capa || 'NO')) + (r.capa_code ? ' · ' + r.capa_code + ' (' + lab_('capa.state.' + r.capa_state) + ')' : '')]);
  return kv;
}

/** Kết quả xử lý / đóng / hủy */
function ncrResultKv_(r) {
  var kv = [];
  if (r.state === 'CLOSED') {
    kv.push([lab_('ncr.done_date'), dmy_(r.done_date)]);
    kv.push([lab_('ncr.result'), biNl_(r.result_vi, r.result_zh)]);
    kv.push([lab_('ncr.recheck'), lab_('ncr.recheck.' + (r.recheck || 'NA'))]);
    kv.push([lab_('ncr.closed_by_kv'), [r.closed_by, dmy_(r.closed_at)].filter(function (x) { return x; }).join(' · ')]);
  } else if (r.state === 'CANCELLED') {
    kv.push([lab_('ncr.state.CANCELLED'), dmy_(r.cancelled_at) + (r.cancel_reason ? ' · ' + r.cancel_reason : '')]);
  } else {
    kv.push([lab_('rpt.col.status'), lab_('ncr.state.' + r.state) + (r.state === 'DECIDED' ? ' · ' + lab_('ncr.exec_due') + ' ' + dmy_(r.exec_due) : '')]);
  }
  if (r.capa_code && r.need_capa !== 'YES') kv.push([lab_('ncr.capa'), r.capa_code + ' (' + lab_('capa.state.' + r.capa_state) + ')']);
  return kv;
}

/** Bố cục báo cáo NCR (28_report_pdf.js reportLayout_) */
function layoutNcr_(snap) {
  var d = snap.data;
  if (d.one) {
    var r = d.one;
    var form = (snap.filters || {}).form || 'NCR';
    var notes = r.files ? [lab_('rpt.ncr_files', { N: r.files })] : [];
    var prod = [[lab_('rpt.kv.ncr_no'), r.code], [lab_('ncr.found_date'), dmy_(r.found_date)], [lab_('ncr.stage'), lab_('ncr.stage.' + r.stage)],
      [lab_('rpt.col.dept'), r.dept_code], [lab_('ncr.found_by'), r.found_by_name || r.created_by], [lab_('ncr.product'), r.product_text],
      [lab_('ncr.lot'), r.lot_text], [lab_('ncr.qty'), r.qty_text], [lab_('ncr.party'), r.party_name],
      [lab_('capa.severity'), r.severity ? lab_('capa.sev.' + r.severity) : ''], [lab_('ncr.ref'), r.ref_text]].filter(function (x) { return x[1]; });
    if (form === 'DECISION') {
      var secs = [
        { heading: lab_('rpt.sec.ncrd_product'), kv: prod.concat([[lab_('ncr.problem'), biNl_(r.problem_vi, r.problem_zh)], [lab_('ncr.hold_place'), r.hold_place || '—']]) },
        { heading: lab_('rpt.sec.ncrd_decision'), table: ncrLinesTable_(r.lines) },
        { kv: ncrDecisionKv_(r) }
      ];
      if (r.history.length > 1) {
        var hRows = r.history.slice(0, -1).map(function (h) {
          return [String(h.n), dmy_(h.date), h.by, ncrLinesText_(h.lines), biNl_(h.note_vi, h.note_zh)];
        });
        secs.push({ heading: lab_('rpt.sec.ncrd_history'), table: rptTable_([labNl_('ncr.decision_n'), labNl_('ncr.decision_date'), labNl_('ncr.decided_by'),
          labNl_('ncr.disp'), labNl_('ncr.decision_note')], ['mid', 'date', 'text', 'text', 'text'], hRows, null) });
      }
      secs.push({ heading: lab_('rpt.sec.ncrd_result'), kv: ncrResultKv_(r) });
      return {
        sections: secs, notes: notes,
        sign: { prepared: lab_('rpt.sign.ncr_decider'), middle: lab_('rpt.sign.ncr_executor'), approved: lab_('rpt.sign.ncr_closer'),
          prepared_name: r.decided_by, middle_name: r.owner, approved_name: r.closed_by }
      };
    }
    var desc = [[lab_('ncr.problem'), biNl_(r.problem_vi, r.problem_zh)], [lab_('ncr.contain'), biNl_(r.contain_vi, r.contain_zh) || '—'],
      [lab_('ncr.hold_place'), r.hold_place || '—']];
    if (r.cause_vi || r.cause_zh) desc.push([lab_('ncr.cause'), biNl_(r.cause_vi, r.cause_zh)]);
    desc.push([lab_('ncr.owner'), r.owner]);
    return {
      sections: [
        { heading: lab_('rpt.sec.ncr_info'), kv: prod },
        { heading: lab_('rpt.sec.ncr_desc'), kv: desc },
        r.lines.length ? { heading: lab_('rpt.sec.ncr_decision'), table: ncrLinesTable_(r.lines) } : { heading: lab_('rpt.sec.ncr_decision'), kv: ncrDecisionKv_(r) },
        r.lines.length ? { kv: ncrDecisionKv_(r) } : null,
        { heading: lab_('rpt.sec.ncr_result'), kv: ncrResultKv_(r) }
      ].filter(function (x) { return x; }),
      notes: notes,
      sign: { prepared: lab_('rpt.sign.ncr_by'), middle: lab_('rpt.sign.ncr_decider'), approved: lab_('rpt.sign.ncr_closer'),
        prepared_name: r.found_by_name || r.created_by, middle_name: r.decided_by, approved_name: r.closed_by }
    };
  }
  var head = [labNl_('rpt.col.ncr_no'), labNl_('ncr.found_date'), labNl_('ncr.stage'), labNl_('rpt.col.ncr_product'), labNl_('ncr.qty'), labNl_('ncr.problem'),
    labNl_('ncr.decision'), labNl_('rpt.col.ncr_due'), labNl_('ncr.result'), labNl_('ncr.capa'), labNl_('rpt.col.status')];
  var types = ['code', 'date', 'text', 'text', 'text', 'text', 'text', 'date', 'text', 'code', 'text'];
  var secs2 = [];
  d.depts.forEach(function (g) {
    var tones = [];
    var rows = g.rows.map(function (r2) {
      var due = r2.state === 'OPEN' ? r2.decide_due : r2.state === 'DECIDED' ? r2.exec_due : '';
      var res = r2.state === 'CLOSED' ? dmy_(r2.done_date) + ' · ' + lab_('ncr.recheck.' + (r2.recheck || 'NA')) + '\n' + biNl_(r2.result_vi, r2.result_zh)
        : r2.state === 'CANCELLED' ? r2.cancel_reason : '';
      tones.push(['', '', '', '', '', '', '', r2.overdue ? 'red' : '', '', r2.need_capa === 'YES' && !r2.capa_code ? 'red' : '', r2.overdue ? 'red' : (NCR_TONE_[r2.state] || '')]);
      return [r2.code, dmy_(r2.found_date), labNl_('ncr.stage_short.' + r2.stage), [r2.product_text, r2.lot_text].filter(function (x) { return x; }).join('\n'),
        r2.qty_text, biNl_(r2.problem_vi, r2.problem_zh), r2.lines.length ? ncrLinesText_(r2.lines) : '', dmy_(due), res,
        r2.capa_code || (r2.need_capa === 'YES' ? lab_('ncr.capa_missing') : ''), labNl_('ncr.state.' + r2.state) + (r2.overdue ? '\n' + lab_('capa.overdue') : '')];
    });
    secs2.push({ heading: g.dept_code + ' · ' + biText_(g.name_vi, g.name_zh) + ' — ' + lab_('rpt.ncr_n', { N: g.rows.length }), table: rptTable_(head, types, rows, tones) });
  });
  if (!secs2.length) secs2.push({ table: rptTable_(head, types, [], null) });
  return { sections: secs2, notes: [lab_('rpt.note.ncr')] };
}

/* ---------------- Trạng thái hệ thống ---------------- */

/** Dòng healthCheck `ncr`: [ok, giá trị, ghi chú] — số phiếu theo trạng thái, quá hạn (việc nghiệp vụ, không làm dòng thành cảnh báo; chỉ thiếu
 *  sheet / cột mới là cảnh báo) */
function ncrHealth_() {
  if (!ncrSchemaReady_()) return [false, 'Thiếu sheet Ncrs / cột Capas.ncr_id', 'Chạy migrateSchema'];
  var today = todayVN_();
  var ns = readRows_('Ncrs').filter(function (n) { return !n.archived_at && inScopeDept_(n.dept_code); });
  var cnt = function (s) { return ns.filter(function (n) { return n.state === s; }).length; };
  var lateD = ns.filter(function (n) { return n.state === 'OPEN' && ncrOverdue_(n, today); }).length;
  var lateE = ns.filter(function (n) { return n.state === 'DECIDED' && ncrOverdue_(n, today); }).length;
  var noCapa = ns.filter(function (n) { return n.state === 'DECIDED' && n.need_capa === 'YES' && !ncrLiveCapa_(n); }).length;
  return [true, 'Chờ quyết định ' + cnt('OPEN') + ' · đang xử lý ' + cnt('DECIDED') + ' · đã đóng ' + cnt('CLOSED') + ' · quá hạn quyết định ' + lateD +
    ' · quá hạn xử lý ' + lateE + ' · cần phiếu khắc phục chưa lập ' + noCapa, lateD || lateE || noCapa ? 'Sản phẩm không phù hợp → Quá hạn' : ''];
}
