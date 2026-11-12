/* 32_capa: Khắc phục (Đợt 3, phiên 3a), mã KP-yymm-001. Hướng A người dùng chốt 12/11/2026: giữ phạm vi Cơ điện, phiếu theo biểu
 * BM-CĐ-14-02 (Settings capa_form_code / capa_log_form_code — mở rộng toàn công ty thì đổi sang BM-ISO-04-01 phiếu, BM-ISO-04-02 sổ).
 * Luồng (ISO 9001 điều 10.2):
 *  1. Lập phiếu (cấp 2+ trong bộ phận, Thư ký ISO): nguồn phát hiện, bộ phận chịu trách nhiệm, mô tả sự không phù hợp, xử lý tức thời,
 *     người phụ trách, hạn hoàn thành; biểu liên quan, tham chiếu (số phiếu sửa chữa M&E, thiết bị, đợt đánh giá…) tùy chọn. → Đang xử lý
 *  2. Phân tích nguyên nhân gốc, lập hành động khắc phục / phòng ngừa (nội dung, người phụ trách trong app hoặc tên người thực hiện, hạn).
 *  3. Người phụ trách hành động báo xong (ngày hoàn thành, kết quả); ảnh / tệp bằng chứng gắn vào phiếu (doc.upload entity CAPA).
 *  4. Xong mọi hành động + có nguyên nhân gốc → Gửi kiểm tra hiệu lực (hạn kiểm tra mặc định + capa_verify_days ngày). → Chờ kiểm tra hiệu lực
 *  5. Kiểm tra hiệu lực (PIN; Thư ký ISO, trưởng bộ phận; không phải người phụ trách phiếu — cấp 4 được khi admin_self_approval):
 *     Có hiệu lực → Đã đóng; Không hiệu lực → Đang xử lý lại (thêm hành động bổ sung, kiểm tra lần sau), mọi lần kiểm tra đều lưu.
 *  Hủy phiếu lập nhầm: Thư ký ISO, người lập (PIN, lý do).
 * Gmail (19_mail.js): CAPA_DUE hành động đến hạn → người phụ trách hành động 7, 1, 0 ngày trước hạn, quá hạn mỗi 7 ngày (phiếu chưa có
 * hành động đang mở → người phụ trách phiếu theo hạn của phiếu); CAPA_VERIFY hạn kiểm tra hiệu lực → trưởng bộ phận / Thư ký ISO.
 * Báo cáo (27_reports.js, loại CAPA): một phiếu để in ký, hoặc sổ theo dõi khắc phục theo năm.
 *
 * Phiên 3b — khiếu nại khách hàng (8D) và yêu cầu khắc phục nhà cung cấp (SCAR) là phiếu khắc phục có nguồn COMPLAINT / SUPPLIER (cùng số
 * KP-yymm-001, cùng luồng). Người dùng chốt 12/11/2026 giữ phạm vi Cơ điện: phiếu thuộc bộ phận trong phạm vi (khiếu nại do lỗi thiết bị;
 * SCAR gửi nhà cung cấp vật tư, nhà thầu thuê ngoài của cơ điện), in theo mẫu BM-KD-02-01 / BM-KD-02-02 / BM-MH-01-06 (Settings
 * complaint_form_code, d8_form_code, scar_form_code). Thêm đối tác (khách hàng / nhà cung cấp), sản phẩm / vật tư, lô, số lượng, mức độ,
 * nhóm 8D (D1), nguyên nhân lọt (D4), ngày gửi SCAR, hạn phản hồi (mặc định ngày tiếp nhận + capa_reply_days). capa.reply ghi phản hồi
 * khách hàng / trả lời của nhà cung cấp — bắt buộc trước khi đóng phiếu (kiểm tra hiệu lực Có hiệu lực). Khiếu nại kết luận không có cơ sở
 * (complaint_valid NO): không bắt buộc hành động khắc phục, vẫn ghi kết luận (nguyên nhân), phản hồi khách hàng và xác nhận đóng.
 * Gmail CAPA_REPLY: hạn phản hồi → người phụ trách phiếu 7, 1, 0 ngày trước hạn, quá hạn mỗi 7 ngày. */

/* ---------------- Quyền ---------------- */

/** Thấy phiếu: cấp 2+ / Thư ký ISO, bộ phận trong phạm vi áp dụng; phiếu của bộ phận mình (mọi bộ phận khi không giới hạn), phiếu mình
 *  lập / phụ trách, phiếu có hành động mình phụ trách (actOwners: {user_id: 1}) */
function capaVisible_(u, c, actOwners) {
  if (!c || !inScopeDept_(c.dept_code)) return false;
  if (!isSecretary_(u) && Number(u.role_level) < 2) return false;
  if (seesAllDepts_(u) || userDepts_(u).indexOf(c.dept_code) >= 0) return true;
  return c.owner_user_id === u.user_id || c.created_by === u.user_id || !!(actOwners && actOwners[u.user_id]);
}

/** Lập phiếu cho bộ phận: cấp 2+ trong bộ phận, Thư ký ISO */
function canCreateCapa_(u, dept) {
  return isSecretary_(u) || (Number(u.role_level) >= 2 && deptWritable_(u, dept));
}

/** Sửa phiếu, nguyên nhân, thêm / sửa / hủy hành động, gửi kiểm tra hiệu lực: Thư ký ISO, trưởng bộ phận (cấp 3 trong bộ phận),
 *  người phụ trách phiếu, người lập */
function canEditCapa_(u, c) {
  if (!c || !inScopeDept_(c.dept_code)) return false;
  if (isSecretary_(u)) return true;
  if (Number(u.role_level) >= 3 && deptWritable_(u, c.dept_code)) return true;
  return Number(u.role_level) >= 2 && (c.owner_user_id === u.user_id || c.created_by === u.user_id);
}

/** Báo xong một hành động: người sửa được phiếu, người phụ trách hành động */
function canDoCapaAction_(u, c, a) {
  return canEditCapa_(u, c) || (Number(u.role_level) >= 2 && !!a.owner_user_id && a.owner_user_id === u.user_id);
}

/** Kiểm tra hiệu lực: Thư ký ISO, trưởng bộ phận (cấp 3 trong bộ phận); người phụ trách phiếu không tự kiểm tra (cấp 4 được khi
 *  admin_self_approval — app có thể chỉ có owner + Thư ký ISO) */
function canVerifyCapa_(u, c) {
  if (!c || !inScopeDept_(c.dept_code)) return false;
  var lvl = Number(u.role_level);
  if (lvl >= 4) return c.owner_user_id !== u.user_id || !!setting_('admin_self_approval');
  if (c.owner_user_id === u.user_id) return false;
  return isSecretary_(u) || (lvl === 3 && deptWritable_(u, c.dept_code));
}

/** Hủy phiếu lập nhầm: Thư ký ISO, người lập */
function canCancelCapa_(u, c) {
  return !!c && inScopeDept_(c.dept_code) && (isSecretary_(u) || (Number(u.role_level) >= 2 && c.created_by === u.user_id));
}

/* ---------------- Tiện ích ---------------- */

/** Bảng tính đã có sheet Capas, CapaActions và cột của 3b (Capas.reply_due) */
function capaSchemaReady_() {
  try { return sheetExists_('Capas') && sheetExists_('CapaActions') && hdr_('Capas').idx.reply_due !== undefined; } catch (e) { return false; }
}

/** Dán Code.gs 3a / 3b mà chưa chạy migrateSchema: lần ghi đầu tiên tự thêm sheet Capas, CapaActions, cột khiếu nại / SCAR */
function ensureCapaSchema_() {
  if (capaSchemaReady_()) return;
  autoMigrate_();
  dbReset_();
  if (!capaSchemaReady_()) throw apiError_('SYSTEM_NOT_READY');
}

/** Phiếu có đối tác bên ngoài: khiếu nại khách hàng (8D), SCAR nhà cung cấp */
function capaIsParty_(source) { return CAPA_PARTY_SOURCES_.indexOf(String(source || '')) >= 0; }

/** Khiếu nại / SCAR chưa phản hồi mà quá hạn phản hồi (phiếu chưa đóng) */
function capaReplyLate_(c, today) {
  return capaIsParty_(c.source) && (c.state === 'OPEN' || c.state === 'VERIFYING') && !c.reply_date && !!c.reply_due && String(c.reply_due) < today;
}

function capaActionsOf_(capaId) {
  return readRows_('CapaActions').filter(function (a) { return a.capa_id === capaId && !a.archived_at; });
}

/** Người phụ trách các hành động (chưa hủy) của phiếu: {user_id: 1} */
function capaActOwners_(acts) {
  var o = {};
  acts.forEach(function (a) { if (a.owner_user_id && a.state !== 'CANCELLED') o[a.owner_user_id] = 1; });
  return o;
}

/** Người dùng đang hoạt động (chọn người phụ trách) */
function capaUserOk_(id) {
  var d = userDirectory_()[id];
  return !!(d && d.active);
}

/** Phiếu + hành động (ngoài khóa) cho kiểm quyền; NOT_FOUND khi không có, FORBIDDEN khi không xem được */
function loadCapa_(ctx, id) {
  ensureCapaSchema_();
  if (!isUuidV4_(id)) throw validationError_([fieldError_('capa_id', 'ID_INVALID')]);
  var c = findOne_('Capas', 'capa_id', id);
  if (!c || c.archived_at) throw apiError_('NOT_FOUND');
  var acts = capaActionsOf_(id);
  if (!capaVisible_(ctx.user, c, capaActOwners_(acts))) throw apiError_('FORBIDDEN');
  return { c: c, acts: acts };
}

/** Hành động + phiếu của nó (ngoài khóa) */
function loadCapaAct_(ctx, id) {
  ensureCapaSchema_();
  if (!isUuidV4_(id)) throw validationError_([fieldError_('action_id', 'ID_INVALID')]);
  var a = findOne_('CapaActions', 'action_id', id);
  if (!a || a.archived_at) throw apiError_('NOT_FOUND');
  var x = loadCapa_(ctx, a.capa_id);
  x.a = a;
  return x;
}

/** Đọc lại dưới khóa ghi (so expected_version khi checkVersion); trả bản sao để sửa */
function lockedCapa_(ctx, id, checkVersion) {
  var cur = findOne_('Capas', 'capa_id', id);
  if (!cur) throw apiError_('NOT_FOUND');
  if (checkVersion) assertVersion_(ctx, cur, 'CAPA', 'Capas');
  var row = clone_(cur); delete row.__row;
  return row;
}

function lockedCapaAct_(ctx, id) {
  var cur = findOne_('CapaActions', 'action_id', id);
  if (!cur) throw apiError_('NOT_FOUND');
  assertVersion_(ctx, cur, 'CAPA_ACT', 'CapaActions');
  var row = clone_(cur); delete row.__row;
  return row;
}

/** Ghi lại phiếu (không tăng record_version) để phiếu có sync_revision mới: app nhận lại phiếu khi hành động đổi (tiến độ, người phụ trách
 *  hành động ở bộ phận khác mới thấy phiếu) */
function capaTouch_(capaRow) {
  return { sheet: 'Capas', mode: 'update', row: capaRow };
}

function capaResult_(ctx, row, extra) {
  var out = { entity_type: 'CAPA', entity_id: row.capa_id, record_version: row.record_version, record: projectRow_(ctx, row) };
  if (extra) Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
  return out;
}

function capaActResult_(ctx, row, capaRow) {
  return { entity_type: 'CAPA_ACT', entity_id: row.action_id, record_version: row.record_version, record: projectRow_(ctx, row),
    capa: capaRow ? projectRow_(ctx, capaRow) : null };
}

/** Ngày dạng yyyy-mm-dd từ payload: undefined = không gửi; '' = để trống; lỗi đẩy vào errs */
function capaDateIn_(errs, p, key) {
  if (p[key] === undefined || p[key] === null) return undefined;
  var v = trimStr_(p[key]);
  if (v && !isDateStr_(v)) { errs.push(fieldError_(key, 'INVALID_DATE')); return undefined; }
  return v;
}

function capaTextLen_(errs, p, key, max) {
  if (p[key] !== undefined && p[key] !== null && trimStr_(p[key]).length > max) errs.push(fieldError_(key.replace(/_(vi|zh)$/, ''), 'TOO_LONG'));
}

/** Tóm tắt phiếu (một dòng): tóm tắt, không có thì đầu mô tả */
function capaName_(c) {
  var t = mailName_(c, 'title');
  if (t) return t;
  var s = String(c.problem_vi || c.problem_zh || '').split('\n')[0];
  return s.length > 120 ? s.slice(0, 117) + '…' : s;
}

/* ---------------- capa.save ---------------- */

/**
 * capa.save {capa_id, source, dept_code, item_id?, ref_text?, found_date, found_by_name?, title_vi/zh?, problem_vi/zh (bắt buộc một thứ
 * tiếng), correction_vi/zh?, cause_vi/zh?, owner_user_id?, due_date}. expected_version 0 = lập phiếu (máy chủ cấp mã KP-yymm-001, Đang xử lý);
 * khác 0 = sửa phiếu đang xử lý. Người phụ trách mặc định = người lập.
 * Khiếu nại / SCAR (3b) thêm: party_name (bắt buộc), party_contact?, product_text?, lot_text?, qty_text?, severity? MINOR | MAJOR | CRITICAL,
 * complaint_valid? '' | YES | NO (chỉ khiếu nại), team_text? (nhóm 8D), escape_vi/zh? (nguyên nhân lọt), sent_date? (ngày gửi SCAR),
 * reply_due? (trống = ngày tiếp nhận + capa_reply_days).
 */
function capaSave_(ctx) {
  ensureCapaSchema_();
  var p = ctx.req.payload || {};
  var u = ctx.user;
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  if (!isUuidV4_(p.capa_id)) throw validationError_([fieldError_('capa_id', 'ID_INVALID')]);
  var cur = isNew ? null : loadCapa_(ctx, p.capa_id).c;
  if (cur && cur.state !== 'OPEN') throw stateInvalid_();
  var errs = [];
  var today = todayVN_();
  var source = p.source === undefined ? (cur ? cur.source : '') : String(p.source || '');
  if (CAPA_SOURCES_.indexOf(source) < 0) errs.push(fieldError_('source', source ? 'INVALID_VALUE' : 'REQUIRED'));
  var dept = p.dept_code === undefined ? (cur ? cur.dept_code : '') : trimStr_(p.dept_code);
  if (!dept) errs.push(fieldError_('dept_code', 'REQUIRED'));
  else if (!findOne_('Depts', 'dept_code', dept)) errs.push(fieldError_('dept_code', 'DEPT_UNKNOWN'));
  else if (!inScopeDept_(dept)) errs.push(fieldError_('dept_code', 'APP_SCOPE'));
  var itemId = p.item_id === undefined ? (cur ? cur.item_id : '') : trimStr_(p.item_id);
  if (itemId) {
    if (!isUuidV4_(itemId)) errs.push(fieldError_('item_id', 'ID_INVALID'));
    else {
      var it = findOne_('Items', 'item_id', itemId);
      if (!it || it.archived_at || !itemVisible_(u, it)) errs.push(fieldError_('item_id', 'NOT_FOUND'));
    }
  }
  var found = capaDateIn_(errs, p, 'found_date');
  if (found === undefined && cur) found = cur.found_date;
  if (!found && !errs.some(function (e) { return e.field === 'found_date'; })) errs.push(fieldError_('found_date', 'REQUIRED'));
  else if (found && found > today) errs.push(fieldError_('found_date', 'DATE_FUTURE'));
  var due = capaDateIn_(errs, p, 'due_date');
  if (due === undefined && cur) due = cur.due_date;
  if (!due && !errs.some(function (e) { return e.field === 'due_date'; })) errs.push(fieldError_('due_date', 'REQUIRED'));
  else if (due && found && due < found) errs.push(fieldError_('due_date', 'RANGE_INVALID'));
  var owner = p.owner_user_id === undefined ? (cur ? cur.owner_user_id : u.user_id) : (trimStr_(p.owner_user_id) || u.user_id);
  if (owner !== (cur ? cur.owner_user_id : u.user_id) && !capaUserOk_(owner)) errs.push(fieldError_('owner_user_id', 'NOT_FOUND'));
  capaTextLen_(errs, p, 'ref_text', 200);
  capaTextLen_(errs, p, 'found_by_name', 120);
  ['title_vi', 'title_zh'].forEach(function (k) { capaTextLen_(errs, p, k, 300); });
  ['problem_vi', 'problem_zh', 'correction_vi', 'correction_zh', 'cause_vi', 'cause_zh', 'escape_vi', 'escape_zh'].forEach(function (k) { capaTextLen_(errs, p, k, 3000); });
  requireOneLang_(errs, p, cur, 'problem');
  // Khiếu nại / SCAR: đối tác, sản phẩm, lô, số lượng, mức độ, kết luận có cơ sở, nhóm 8D, ngày gửi SCAR, hạn phản hồi
  var party = capaIsParty_(source);
  var px = {};
  [['party_name', 200], ['party_contact', 200], ['product_text', 200], ['lot_text', 200], ['qty_text', 100], ['team_text', 500]].forEach(function (f) {
    var v = p[f[0]] === undefined || p[f[0]] === null ? (cur ? String(cur[f[0]] || '') : '') : trimStr_(p[f[0]]);
    if (v.length > f[1]) errs.push(fieldError_(f[0], 'TOO_LONG'));
    px[f[0]] = v;
  });
  if (party && !px.party_name) errs.push(fieldError_('party_name', 'REQUIRED'));
  var sev = p.severity === undefined || p.severity === null ? (cur ? String(cur.severity || '') : '') : String(p.severity || '');
  if (sev && CAPA_SEVERITIES_.indexOf(sev) < 0) errs.push(fieldError_('severity', 'INVALID_VALUE'));
  var valid = p.complaint_valid === undefined || p.complaint_valid === null ? (cur ? String(cur.complaint_valid || '') : '') : String(p.complaint_valid || '');
  if (CAPA_VALIDS_.indexOf(valid) < 0) errs.push(fieldError_('complaint_valid', 'INVALID_VALUE'));
  if (source !== 'COMPLAINT') valid = '';
  var sent = capaDateIn_(errs, p, 'sent_date');
  if (sent === undefined) sent = cur ? String(cur.sent_date || '') : '';
  if (sent && (sent > today || (found && sent < found))) errs.push(fieldError_('sent_date', 'CAPA_DATE'));
  var rdue = capaDateIn_(errs, p, 'reply_due');
  if (rdue === undefined) rdue = cur ? String(cur.reply_due || '') : '';
  if (party && !rdue && found && isDateStr_(found) && !errs.some(function (e) { return e.field === 'reply_due'; })) {
    rdue = addDaysIso_(found, Math.max(1, Number(setting_('capa_reply_days')) || 7));
  }
  if (rdue && found && rdue < found) errs.push(fieldError_('reply_due', 'RANGE_INVALID'));
  if (errs.length) throw validationError_(errs);
  if (isNew) {
    if (!canCreateCapa_(u, dept)) throw apiError_('FORBIDDEN');
  } else if (!canEditCapa_(u, cur) || (dept !== cur.dept_code && !canCreateCapa_(u, dept))) {
    throw apiError_('FORBIDDEN');
  }
  var tr = applyTranslations_('Capas', ['title', 'problem', 'correction', 'cause', 'escape'], p, cur); // dịch ngoài khóa ghi
  return executeWrite_(ctx, {
    entity_type: 'CAPA', entity_id: p.capa_id,
    build: function (st) {
      var row, su = {};
      if (isNew) {
        assertNewId_('Capas', 'capa_id', p.capa_id);
        row = cNew_(ctx, {
          capa_id: p.capa_id, code: allocCode_(st, su, 'CAPA'), source: '', dept_code: '', item_id: '', ref_text: '', found_date: '', found_by_name: '',
          title_vi: '', title_zh: '', problem_vi: '', problem_zh: '', correction_vi: '', correction_zh: '', cause_vi: '', cause_zh: '',
          owner_user_id: '', due_date: '', state: 'OPEN', files_json: [], completed_at: '', completed_by: '', verify_due: '', verify_count: 0,
          verified_at: '', verified_by: '', verify_date: '', verify_result: '', verify_note_vi: '', verify_note_zh: '', verify_history_json: [],
          closed_at: '', cancelled_at: '', cancelled_by: '', cancel_reason: '', party_name: '', party_contact: '', product_text: '', lot_text: '',
          qty_text: '', severity: '', complaint_valid: '', team_text: '', escape_vi: '', escape_zh: '', sent_date: '', reply_due: '', reply_date: '',
          reply_note_vi: '', reply_note_zh: '', reply_at: '', reply_by: ''
        });
      } else {
        row = lockedCapa_(ctx, p.capa_id, true);
        if (row.state !== 'OPEN') throw stateInvalid_();
        cUpdate_(ctx, row);
      }
      var before = isNew ? null : { source: row.source, dept_code: row.dept_code, due_date: row.due_date, owner_user_id: row.owner_user_id };
      row.source = source; row.dept_code = dept; row.item_id = itemId || ''; row.found_date = found; row.due_date = due; row.owner_user_id = owner;
      if (p.ref_text !== undefined) row.ref_text = trimStr_(p.ref_text);
      if (p.found_by_name !== undefined) row.found_by_name = trimStr_(p.found_by_name);
      Object.keys(px).forEach(function (k) { row[k] = px[k]; });
      row.severity = sev; row.complaint_valid = valid; row.sent_date = sent; row.reply_due = rdue;
      Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
      row.i18n_meta = Object.assign({}, row.i18n_meta || {}, tr.meta);
      return {
        writes: [{ sheet: 'Capas', mode: isNew ? 'insert' : 'update', row: row }], state: su,
        result: capaResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'CAPA', entity_id: row.capa_id, before_json: before,
          after_json: { code: row.code, source: row.source, dept_code: row.dept_code, due_date: row.due_date, owner_user_id: row.owner_user_id, created: isNew,
            party_name: party ? row.party_name : undefined, reply_due: party ? row.reply_due : undefined, complaint_valid: row.complaint_valid || undefined } }
      };
    }
  });
}

/* ---------------- Hành động ---------------- */

/**
 * capa.action.save {action_id, capa_id (thêm mới), atype CORRECTIVE | PREVENTIVE, content_vi/zh, owner_user_id?, assignee_name?, due_date}.
 * expected_version 0 = thêm hành động (phiếu Đang xử lý, tối đa 30); khác 0 = sửa hành động chưa xong. Không chọn người phụ trách và không ghi
 * tên người thực hiện → người phụ trách phiếu.
 */
function capaActionSave_(ctx) {
  ensureCapaSchema_();
  var p = ctx.req.payload || {};
  var u = ctx.user;
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  if (!isUuidV4_(p.action_id)) throw validationError_([fieldError_('action_id', 'ID_INVALID')]);
  var x, cur = null;
  if (isNew) x = loadCapa_(ctx, p.capa_id);
  else { x = loadCapaAct_(ctx, p.action_id); cur = x.a; }
  var c = x.c;
  if (!canEditCapa_(u, c)) throw apiError_('FORBIDDEN');
  if (c.state !== 'OPEN' || (cur && cur.state !== 'OPEN')) throw stateInvalid_();
  var errs = [];
  var atype = p.atype === undefined ? (cur ? cur.atype : 'CORRECTIVE') : String(p.atype || 'CORRECTIVE');
  if (CAPA_ACT_TYPES_.indexOf(atype) < 0) errs.push(fieldError_('atype', 'INVALID_VALUE'));
  var due = capaDateIn_(errs, p, 'due_date');
  if (due === undefined && cur) due = cur.due_date;
  if (!due && !errs.some(function (e) { return e.field === 'due_date'; })) errs.push(fieldError_('due_date', 'REQUIRED'));
  else if (due && c.found_date && due < c.found_date) errs.push(fieldError_('due_date', 'RANGE_INVALID'));
  var owner = p.owner_user_id === undefined ? (cur ? cur.owner_user_id : '') : trimStr_(p.owner_user_id);
  var assignee = p.assignee_name === undefined ? (cur ? cur.assignee_name : '') : trimStr_(p.assignee_name);
  if (assignee.length > 120) errs.push(fieldError_('assignee_name', 'TOO_LONG'));
  if (owner && owner !== (cur ? cur.owner_user_id : '') && !capaUserOk_(owner)) errs.push(fieldError_('owner_user_id', 'NOT_FOUND'));
  if (!owner && !assignee) owner = c.owner_user_id;
  ['content_vi', 'content_zh'].forEach(function (k) { capaTextLen_(errs, p, k, 2000); });
  requireOneLang_(errs, p, cur, 'content');
  if (isNew && x.acts.filter(function (a) { return a.state !== 'CANCELLED'; }).length >= CAPA_MAX_ACTIONS_) errs.push(fieldError_('action_id', 'TOO_MANY_ACTIONS'));
  if (errs.length) throw validationError_(errs);
  var tr = applyTranslations_('CapaActions', ['content'], p, cur);
  return executeWrite_(ctx, {
    entity_type: 'CAPA_ACT', entity_id: p.action_id,
    build: function () {
      var cRow = lockedCapa_(ctx, c.capa_id, false);
      if (cRow.state !== 'OPEN') throw stateInvalid_();
      var row;
      if (isNew) {
        assertNewId_('CapaActions', 'action_id', p.action_id);
        var acts = capaActionsOf_(c.capa_id);
        if (acts.filter(function (a) { return a.state !== 'CANCELLED'; }).length >= CAPA_MAX_ACTIONS_) throw validationError_([fieldError_('action_id', 'TOO_MANY_ACTIONS')]);
        var seq = acts.reduce(function (m, a) { return Math.max(m, Number(a.seq) || 0); }, 0) + 1;
        row = cNew_(ctx, {
          action_id: p.action_id, capa_id: c.capa_id, seq: seq, atype: atype, content_vi: '', content_zh: '', owner_user_id: '', assignee_name: '',
          due_date: '', state: 'OPEN', done_date: '', done_at: '', done_by: '', result_vi: '', result_zh: '', cancelled_at: '', cancelled_by: '',
          cancel_reason: '', round: Number(cRow.verify_count) || 0
        });
      } else {
        row = lockedCapaAct_(ctx, p.action_id);
        if (row.state !== 'OPEN') throw stateInvalid_();
        cUpdate_(ctx, row);
      }
      row.atype = atype; row.owner_user_id = owner || ''; row.assignee_name = assignee; row.due_date = due;
      Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
      row.i18n_meta = Object.assign({}, row.i18n_meta || {}, tr.meta);
      return {
        writes: [{ sheet: 'CapaActions', mode: isNew ? 'insert' : 'update', row: row }, capaTouch_(cRow)],
        result: capaActResult_(ctx, row, cRow), record_version: row.record_version,
        audit: { entity_type: 'CAPA_ACT', entity_id: row.action_id, before_json: null,
          after_json: { capa: cRow.code, seq: row.seq, atype: row.atype, due_date: row.due_date, owner_user_id: row.owner_user_id, created: isNew } }
      };
    }
  });
}

/**
 * capa.action.done {action_id, done_date, result_vi/zh} — báo xong (ngày hoàn thành ≤ hôm nay, kết quả / bằng chứng bắt buộc một thứ tiếng);
 * {action_id, undo: true} — mở lại hành động đã báo xong (phiếu còn Đang xử lý).
 */
function capaActionDone_(ctx) {
  var p = ctx.req.payload || {};
  var u = ctx.user;
  var x = loadCapaAct_(ctx, p.action_id);
  var c = x.c, a = x.a;
  var undo = p.undo === true;
  if (undo ? !(canEditCapa_(u, c) || a.done_by === u.user_id) : !canDoCapaAction_(u, c, a)) throw apiError_('FORBIDDEN');
  if (c.state !== 'OPEN' || a.state !== (undo ? 'DONE' : 'OPEN')) throw stateInvalid_();
  var errs = [];
  var date = '';
  var tr = null;
  if (!undo) {
    date = capaDateIn_(errs, p, 'done_date');
    if (!date && !errs.length) errs.push(fieldError_('done_date', 'REQUIRED'));
    else if (date && (date > todayVN_() || (c.found_date && date < c.found_date))) errs.push(fieldError_('done_date', 'CAPA_DATE'));
    ['result_vi', 'result_zh'].forEach(function (k) { capaTextLen_(errs, p, k, 2000); });
    requireOneLang_(errs, p, null, 'result');
    if (errs.length) throw validationError_(errs);
    tr = applyTranslations_('CapaActions', ['result'], p, a);
  }
  return executeWrite_(ctx, {
    entity_type: 'CAPA_ACT', entity_id: a.action_id,
    build: function () {
      var cRow = lockedCapa_(ctx, c.capa_id, false);
      if (cRow.state !== 'OPEN') throw stateInvalid_();
      var row = lockedCapaAct_(ctx, a.action_id);
      if (row.state !== (undo ? 'DONE' : 'OPEN')) throw stateInvalid_();
      cUpdate_(ctx, row);
      if (undo) {
        row.state = 'OPEN'; row.done_date = ''; row.done_at = ''; row.done_by = '';
      } else {
        row.state = 'DONE'; row.done_date = date; row.done_at = isoVN_(now_()); row.done_by = u.user_id;
        Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
        row.i18n_meta = Object.assign({}, row.i18n_meta || {}, tr.meta);
      }
      return {
        writes: [{ sheet: 'CapaActions', mode: 'update', row: row }, capaTouch_(cRow)],
        result: capaActResult_(ctx, row, cRow), record_version: row.record_version,
        audit: { entity_type: 'CAPA_ACT', entity_id: row.action_id, before_json: { state: undo ? 'DONE' : 'OPEN' },
          after_json: { state: row.state, capa: cRow.code, seq: row.seq, done_date: row.done_date } }
      };
    }
  });
}

/** capa.action.cancel {action_id, reason}: bỏ hành động chưa xong (lập nhầm, không cần nữa) kèm lý do */
function capaActionCancel_(ctx) {
  var p = ctx.req.payload || {};
  var x = loadCapaAct_(ctx, p.action_id);
  var c = x.c, a = x.a;
  if (!canEditCapa_(ctx.user, c)) throw apiError_('FORBIDDEN');
  if (c.state !== 'OPEN' || a.state !== 'OPEN') throw stateInvalid_();
  var reason = reasonText_(p, 'reason', true, 1000);
  return executeWrite_(ctx, {
    entity_type: 'CAPA_ACT', entity_id: a.action_id,
    build: function () {
      var cRow = lockedCapa_(ctx, c.capa_id, false);
      if (cRow.state !== 'OPEN') throw stateInvalid_();
      var row = lockedCapaAct_(ctx, a.action_id);
      if (row.state !== 'OPEN') throw stateInvalid_();
      cUpdate_(ctx, row);
      row.state = 'CANCELLED'; row.cancelled_at = isoVN_(now_()); row.cancelled_by = ctx.user.user_id; row.cancel_reason = reason;
      return {
        writes: [{ sheet: 'CapaActions', mode: 'update', row: row }, capaTouch_(cRow)],
        result: capaActResult_(ctx, row, cRow), record_version: row.record_version,
        audit: { entity_type: 'CAPA_ACT', entity_id: row.action_id, before_json: { state: 'OPEN' }, after_json: { state: 'CANCELLED', capa: cRow.code, seq: row.seq }, reason: reason }
      };
    }
  });
}

/* ---------------- Gửi kiểm tra hiệu lực, kiểm tra hiệu lực, hủy ---------------- */

/** Phiếu đủ điều kiện gửi kiểm tra hiệu lực: có nguyên nhân gốc, không còn hành động đang mở, có ít nhất một hành động đã xong (khiếu nại kết
 *  luận không có cơ sở: không bắt buộc hành động — nguyên nhân là kết luận điều tra) */
function capaCompleteErrors_(c, acts) {
  var errs = [];
  if (!trimStr_(c.cause_vi) && !trimStr_(c.cause_zh)) errs.push(fieldError_('cause', 'CAPA_NO_CAUSE'));
  if (acts.some(function (a) { return a.state === 'OPEN'; })) errs.push(fieldError_('actions', 'CAPA_ACTIONS_OPEN'));
  else if (!capaNoActionOk_(c) && !acts.some(function (a) { return a.state === 'DONE'; })) errs.push(fieldError_('actions', 'CAPA_NO_ACTION'));
  return errs;
}

/** Khiếu nại kết luận không có cơ sở: đóng được không cần hành động khắc phục */
function capaNoActionOk_(c) { return c.source === 'COMPLAINT' && c.complaint_valid === 'NO'; }

/** Đóng phiếu (Có hiệu lực) khiếu nại / SCAR cần đã ghi phản hồi */
function capaCloseErrors_(c, result) {
  return result === 'EFFECTIVE' && capaIsParty_(c.source) && !c.reply_date ? [fieldError_('reply', 'CAPA_NO_REPLY')] : [];
}

/**
 * capa.complete {capa_id, verify_due?} — xong hành động: Đang xử lý → Chờ kiểm tra hiệu lực (hạn kiểm tra mặc định hôm nay + capa_verify_days);
 * {capa_id, undo: true} — Chờ kiểm tra hiệu lực → Đang xử lý (thêm hành động trước khi kiểm tra).
 */
function capaComplete_(ctx) {
  var p = ctx.req.payload || {};
  var x = loadCapa_(ctx, p.capa_id);
  var c = x.c;
  var undo = p.undo === true;
  if (!canEditCapa_(ctx.user, c)) throw apiError_('FORBIDDEN');
  if (c.state !== (undo ? 'VERIFYING' : 'OPEN')) throw stateInvalid_();
  var today = todayVN_();
  var vdue = '';
  if (!undo) {
    var errs = capaCompleteErrors_(c, x.acts);
    var d = capaDateIn_(errs, p, 'verify_due');
    vdue = d || addDaysIso_(today, Math.max(0, Number(setting_('capa_verify_days')) || 30));
    if (d && d < today) errs.push(fieldError_('verify_due', 'DATE_PAST'));
    if (errs.length) throw validationError_(errs);
  }
  return executeWrite_(ctx, {
    entity_type: 'CAPA', entity_id: c.capa_id,
    build: function () {
      var row = lockedCapa_(ctx, c.capa_id, true);
      if (row.state !== (undo ? 'VERIFYING' : 'OPEN')) throw stateInvalid_();
      if (!undo) {
        var e2 = capaCompleteErrors_(row, capaActionsOf_(c.capa_id));
        if (e2.length) throw validationError_(e2);
      }
      cUpdate_(ctx, row);
      if (undo) { row.state = 'OPEN'; row.completed_at = ''; row.completed_by = ''; row.verify_due = ''; }
      else { row.state = 'VERIFYING'; row.completed_at = isoVN_(now_()); row.completed_by = ctx.user.user_id; row.verify_due = vdue; }
      return {
        writes: [{ sheet: 'Capas', mode: 'update', row: row }], result: capaResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'CAPA', entity_id: row.capa_id, before_json: { state: undo ? 'VERIFYING' : 'OPEN' }, after_json: { state: row.state, code: row.code, verify_due: row.verify_due } }
      };
    }
  });
}

function precheckCapaVerify_(ctx) {
  var p = ctx.req.payload || {};
  var x = loadCapa_(ctx, p.capa_id);
  if (!canVerifyCapa_(ctx.user, x.c)) throw apiError_('FORBIDDEN');
  if (x.c.state !== 'VERIFYING') throw stateInvalid_();
  var e = capaCloseErrors_(x.c, String(p.result || '')); // chưa phản hồi khách hàng / nhà cung cấp: báo trước khi hỏi PIN
  if (e.length) throw validationError_(e);
}

function precheckCapaCancel_(ctx) {
  var x = loadCapa_(ctx, (ctx.req.payload || {}).capa_id);
  if (!canCancelCapa_(ctx.user, x.c)) throw apiError_('FORBIDDEN');
  if (x.c.state !== 'OPEN' && x.c.state !== 'VERIFYING') throw stateInvalid_();
}

/**
 * capa.verify {capa_id, result EFFECTIVE | NOT_EFFECTIVE, verify_date?, note_vi/zh} (PIN): Có hiệu lực → Đã đóng; Không hiệu lực → Đang xử lý
 * (lần kiểm tra +1, thêm hành động bổ sung rồi gửi kiểm tra lại). Mọi lần kiểm tra lưu ở verify_history_json.
 */
function capaVerify_(ctx) {
  var p = ctx.req.payload || {};
  var x = loadCapa_(ctx, p.capa_id);
  var c = x.c;
  if (!canVerifyCapa_(ctx.user, c)) throw apiError_('FORBIDDEN');
  if (c.state !== 'VERIFYING') throw stateInvalid_();
  var errs = [];
  var result = String(p.result || '');
  if (result !== 'EFFECTIVE' && result !== 'NOT_EFFECTIVE') errs.push(fieldError_('result', result ? 'INVALID_VALUE' : 'REQUIRED'));
  var date = capaDateIn_(errs, p, 'verify_date');
  if (!date && !errs.some(function (e) { return e.field === 'verify_date'; })) date = todayVN_();
  if (date && (date > todayVN_() || (c.found_date && date < c.found_date))) errs.push(fieldError_('verify_date', 'CAPA_DATE'));
  var input = { verify_note_vi: p.note_vi, verify_note_zh: p.note_zh };
  ['verify_note_vi', 'verify_note_zh'].forEach(function (k) { capaTextLen_(errs, input, k, 2000); });
  requireOneLang_(errs, input, null, 'verify_note');
  errs = errs.concat(capaCloseErrors_(c, result));
  if (errs.length) throw validationError_(errs);
  var tr = applyTranslations_('Capas', ['verify_note'], input, null);
  return executeWrite_(ctx, {
    entity_type: 'CAPA', entity_id: c.capa_id,
    build: function () {
      var row = lockedCapa_(ctx, c.capa_id, true);
      if (row.state !== 'VERIFYING') throw stateInvalid_();
      var e2 = capaCloseErrors_(row, result);
      if (e2.length) throw validationError_(e2);
      cUpdate_(ctx, row);
      var nowIso = isoVN_(now_());
      var hist = Array.isArray(row.verify_history_json) ? row.verify_history_json.slice() : [];
      hist.push({ n: hist.length + 1, date: date, at: nowIso, by: ctx.user.user_id, result: result,
        note_vi: tr.values.verify_note_vi || '', note_zh: tr.values.verify_note_zh || '', due: row.verify_due || '' });
      row.verify_history_json = hist;
      row.verified_at = nowIso; row.verified_by = ctx.user.user_id; row.verify_date = date; row.verify_result = result;
      row.verify_note_vi = tr.values.verify_note_vi || ''; row.verify_note_zh = tr.values.verify_note_zh || '';
      row.i18n_meta = Object.assign({}, row.i18n_meta || {}, tr.meta);
      if (result === 'EFFECTIVE') { row.state = 'CLOSED'; row.closed_at = nowIso; }
      else { row.state = 'OPEN'; row.verify_count = (Number(row.verify_count) || 0) + 1; row.completed_at = ''; row.completed_by = ''; row.verify_due = ''; }
      return {
        writes: [{ sheet: 'Capas', mode: 'update', row: row }], result: capaResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'CAPA', entity_id: row.capa_id, before_json: { state: 'VERIFYING' }, after_json: { state: row.state, code: row.code, result: result, n: hist.length } }
      };
    }
  });
}

/** capa.cancel {capa_id, reason} (PIN): hủy phiếu lập nhầm / trùng — Thư ký ISO, người lập */
function capaCancel_(ctx) {
  var p = ctx.req.payload || {};
  var x = loadCapa_(ctx, p.capa_id);
  var c = x.c;
  if (!canCancelCapa_(ctx.user, c)) throw apiError_('FORBIDDEN');
  if (c.state !== 'OPEN' && c.state !== 'VERIFYING') throw stateInvalid_();
  var reason = reasonText_(p, 'reason', true, 1000);
  return executeWrite_(ctx, {
    entity_type: 'CAPA', entity_id: c.capa_id,
    build: function () {
      var row = lockedCapa_(ctx, c.capa_id, true);
      if (row.state !== 'OPEN' && row.state !== 'VERIFYING') throw stateInvalid_();
      var before = row.state;
      cUpdate_(ctx, row);
      row.state = 'CANCELLED'; row.cancelled_at = isoVN_(now_()); row.cancelled_by = ctx.user.user_id; row.cancel_reason = reason;
      return {
        writes: [{ sheet: 'Capas', mode: 'update', row: row }], result: capaResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'CAPA', entity_id: row.capa_id, before_json: { state: before }, after_json: { state: 'CANCELLED', code: row.code }, reason: reason }
      };
    }
  });
}

/* ---------------- Phản hồi khiếu nại / trả lời SCAR (3b) ---------------- */

/**
 * capa.reply {capa_id, reply_date, note_vi/zh} — khiếu nại: ngày và nội dung phản hồi khách hàng (gửi báo cáo 8D, kết luận); SCAR: ngày và
 * tóm tắt trả lời của nhà cung cấp (nguyên nhân, hành động họ cam kết — ghi tiếp vào nguyên nhân / hành động của phiếu).
 * {capa_id, undo: true} — bỏ phản hồi đã ghi (ghi nhầm). Phiếu Đang xử lý / Chờ kiểm tra hiệu lực; người sửa được phiếu.
 */
function capaReply_(ctx) {
  var p = ctx.req.payload || {};
  var x = loadCapa_(ctx, p.capa_id);
  var c = x.c;
  if (!canEditCapa_(ctx.user, c)) throw apiError_('FORBIDDEN');
  if (c.state !== 'OPEN' && c.state !== 'VERIFYING') throw stateInvalid_();
  if (!capaIsParty_(c.source)) throw validationError_([fieldError_('source', 'CAPA_NOT_PARTY')]);
  var undo = p.undo === true;
  if (undo && !c.reply_date) throw stateInvalid_();
  var errs = [], date = '', tr = null;
  if (!undo) {
    date = capaDateIn_(errs, p, 'reply_date');
    if (!date && !errs.length) errs.push(fieldError_('reply_date', 'REQUIRED'));
    else if (date && (date > todayVN_() || (c.found_date && date < c.found_date) || (c.sent_date && date < c.sent_date))) errs.push(fieldError_('reply_date', 'CAPA_DATE'));
    var input = { reply_note_vi: p.note_vi, reply_note_zh: p.note_zh };
    ['reply_note_vi', 'reply_note_zh'].forEach(function (k) { capaTextLen_(errs, input, k, 3000); });
    requireOneLang_(errs, input, null, 'reply_note');
    if (errs.length) throw validationError_(errs);
    tr = applyTranslations_('Capas', ['reply_note'], input, null);
  }
  return executeWrite_(ctx, {
    entity_type: 'CAPA', entity_id: c.capa_id,
    build: function () {
      var row = lockedCapa_(ctx, c.capa_id, true);
      if (row.state !== 'OPEN' && row.state !== 'VERIFYING') throw stateInvalid_();
      if (undo && !row.reply_date) throw stateInvalid_();
      var before = { reply_date: row.reply_date || '' };
      cUpdate_(ctx, row);
      if (undo) {
        row.reply_date = ''; row.reply_note_vi = ''; row.reply_note_zh = ''; row.reply_at = ''; row.reply_by = '';
        if (row.i18n_meta) { row.i18n_meta = clone_(row.i18n_meta); delete row.i18n_meta.reply_note; }
      } else {
        row.reply_date = date; row.reply_at = isoVN_(now_()); row.reply_by = ctx.user.user_id;
        row.reply_note_vi = tr.values.reply_note_vi || ''; row.reply_note_zh = tr.values.reply_note_zh || '';
        row.i18n_meta = Object.assign({}, row.i18n_meta || {}, tr.meta);
      }
      return {
        writes: [{ sheet: 'Capas', mode: 'update', row: row }], result: capaResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'CAPA', entity_id: row.capa_id, before_json: before, after_json: { code: row.code, reply_date: row.reply_date || '', undo: undo || undefined } }
      };
    }
  });
}

/* ---------------- Tệp (doc.upload / doc.get, 12_docs.js) ---------------- */

/** Gắn ảnh / tệp vào phiếu: người sửa được phiếu, người phụ trách một hành động (chưa hủy); phiếu Đang xử lý / Chờ kiểm tra hiệu lực */
function canCapaFiles_(u, c, acts) {
  if (c.state !== 'OPEN' && c.state !== 'VERIFYING') return false;
  return canEditCapa_(u, c) || canVerifyCapa_(u, c) || (Number(u.role_level) >= 2 && !!capaActOwners_(acts)[u.user_id]);
}

/* ---------------- Đồng bộ (13_sync.js) ---------------- */

/** Người phụ trách hành động theo phiếu (đọc một lần cho mỗi lượt đồng bộ) */
function syncCapaOwners_(aux) {
  if (!aux.capaOwners) {
    aux.capaOwners = {};
    if (sheetExists_('CapaActions')) {
      aux.tc.rows('CapaActions').forEach(function (a) {
        if (a.archived_at || a.state === 'CANCELLED' || !a.owner_user_id) return;
        (aux.capaOwners[a.capa_id] = aux.capaOwners[a.capa_id] || {})[a.owner_user_id] = 1;
      });
    }
  }
  return aux.capaOwners;
}

function syncCapaMap_(aux) {
  if (!aux.capas) {
    aux.capas = {};
    if (sheetExists_('Capas')) aux.tc.rows('Capas').forEach(function (c) { aux.capas[c.capa_id] = c; });
  }
  return aux.capas;
}

/** Phiếu gửi xuống app khi người dùng thấy phiếu; hành động gửi theo phiếu */
function syncCapaVisible_(ctx, capa, aux) {
  return !!capa && !capa.archived_at && capaVisible_(ctx.user, capa, syncCapaOwners_(aux)[capa.capa_id]);
}

/* ---------------- Gmail nhắc hạn (19_mail.js) ---------------- */

/** Mốc nhắc khắc phục theo số ngày còn lại: 7, 1, 0 ngày trước hạn; quá hạn mỗi 7 ngày. null khi còn hơn 7 ngày */
function capaStage_(dr) {
  if (dr === null || dr === undefined || isNaN(dr) || dr > 7) return null;
  if (dr > 1) return 'D7';
  if (dr === 1) return 'D1';
  if (dr > -7) return 'D0';
  return 'OD' + Math.floor(-dr / 7);
}

/** Người kiểm tra hiệu lực nhận nhắc: trưởng bộ phận (nếu được kiểm tra phiếu này); không có thì Thư ký ISO / Quản trị, ưu tiên người
 *  khác người phụ trách phiếu */
function capaVerifiers_(mc, c) {
  var d = mc.depts[c.dept_code];
  var h = d && d.head_user_id ? mc.byId[d.head_user_id] : null;
  if (h && h.active && canVerifyCapa_(h, c)) return [h.user_id];
  var pool = mc.secretaries.filter(function (u) { return canVerifyCapa_(u, c); });
  if (!pool.length) pool = mc.users.filter(function (u) { return u.active && Number(u.role_level) >= 4 && canVerifyCapa_(u, c); });
  var others = pool.filter(function (u) { return u.user_id !== c.owner_user_id; });
  return (others.length ? others : pool).map(function (u) { return u.user_id; });
}

/** Việc cần nhắc của khắc phục (thêm vào mailDesired_): CAPA_DUE, CAPA_VERIFY, CAPA_REPLY (3b) */
function capaMailNotes_(mc, out) {
  if (!sheetExists_('Capas') || !sheetExists_('CapaActions')) return;
  var today = mc.today;
  var capas = readRows_('Capas').filter(function (c) { return !c.archived_at && inScopeDept_(c.dept_code) && (c.state === 'OPEN' || c.state === 'VERIFYING'); });
  if (!capas.length) return;
  var byCapa = {};
  readRows_('CapaActions').forEach(function (a) { if (!a.archived_at) (byCapa[a.capa_id] = byCapa[a.capa_id] || []).push(a); });
  var secIds = mc.secretaries.map(function (u) { return u.user_id; });
  var act = function (id) { return id && mc.byId[id] && mc.byId[id].active ? id : ''; };
  capas.forEach(function (c) {
    var base = function (extra) {
      var d = { code: c.code, name: capaName_(c), dept_code: c.dept_code, dept: deptName_(mc, c.dept_code), path: '/capa/' + c.capa_id };
      Object.keys(extra).forEach(function (k) { d[k] = extra[k]; });
      return d;
    };
    var list = byCapa[c.capa_id] || [];
    // Khiếu nại / SCAR chưa phản hồi → người phụ trách phiếu theo hạn phản hồi (3b)
    if (capaIsParty_(c.source) && !c.reply_date && isDateStr_(String(c.reply_due || ''))) {
      var st4 = capaStage_(daysBetweenIso_(today, c.reply_due));
      if (st4) {
        out.push({
          kind: 'CAPA_REPLY', entity_type: 'CAPA', entity_id: c.capa_id, stage: c.reply_due + ':' + st4, due_date: c.reply_due,
          to: act(c.owner_user_id) ? [c.owner_user_id] : secIds, queue: true,
          detail: base({ due: c.reply_due, owner: userName_(mc, c.owner_user_id), mark: st4, source: c.source, party: c.party_name || '' })
        });
      }
    }
    if (c.state === 'OPEN') {
      var open = list.filter(function (a) { return a.state === 'OPEN'; });
      open.forEach(function (a) {
        if (!isDateStr_(String(a.due_date || ''))) return;
        var stage = capaStage_(daysBetweenIso_(today, a.due_date));
        if (!stage) return;
        var to = act(a.owner_user_id) ? [a.owner_user_id] : (act(c.owner_user_id) ? [c.owner_user_id] : secIds);
        out.push({
          kind: 'CAPA_DUE', entity_type: 'CAPA_ACT', entity_id: a.action_id, stage: a.due_date + ':' + stage, due_date: a.due_date, to: to, queue: true,
          detail: base({ seq: a.seq, content: mailName_(a, 'content'), due: a.due_date, owner: userName_(mc, a.owner_user_id) || a.assignee_name || '', mark: stage })
        });
      });
      // Phiếu chưa có hành động đang mở (chưa lập kế hoạch, hoặc đã xong mà chưa gửi kiểm tra hiệu lực) → người phụ trách phiếu, theo hạn phiếu
      if (!open.length && isDateStr_(String(c.due_date || ''))) {
        var st2 = capaStage_(daysBetweenIso_(today, c.due_date));
        if (st2) {
          out.push({
            kind: 'CAPA_DUE', entity_type: 'CAPA', entity_id: c.capa_id, stage: c.due_date + ':' + st2, due_date: c.due_date,
            to: act(c.owner_user_id) ? [c.owner_user_id] : secIds, queue: true,
            detail: base({ due: c.due_date, owner: userName_(mc, c.owner_user_id), mark: st2, whole: list.some(function (a) { return a.state === 'DONE'; }) ? 'DONE' : 'PLAN' })
          });
        }
      }
    } else if (isDateStr_(String(c.verify_due || ''))) {
      var st3 = capaStage_(daysBetweenIso_(today, c.verify_due));
      if (!st3) return;
      out.push({
        kind: 'CAPA_VERIFY', entity_type: 'CAPA', entity_id: c.capa_id, stage: c.verify_due + ':' + st3, due_date: c.verify_due, to: capaVerifiers_(mc, c), queue: true,
        detail: base({ due: c.verify_due, owner: userName_(mc, c.owner_user_id), mark: st3, round: (Number(c.verify_count) || 0) + 1 })
      });
    }
  });
}

/* ---------------- Báo cáo (27_reports.js, loại CAPA) ---------------- */

/** Phiếu quá hạn: đang xử lý mà quá hạn phiếu hoặc có hành động đang mở quá hạn; chờ kiểm tra hiệu lực mà quá hạn kiểm tra; khiếu nại /
 *  SCAR chưa phản hồi mà quá hạn phản hồi (3b) */
function capaOverdue_(c, acts, today) {
  if (capaReplyLate_(c, today)) return true;
  if (c.state === 'OPEN') {
    if (c.due_date && c.due_date < today) return true;
    return acts.some(function (a) { return a.state === 'OPEN' && a.due_date && a.due_date < today; });
  }
  return c.state === 'VERIFYING' && !!c.verify_due && c.verify_due < today;
}

function reportCapaRow_(c, acts, items, dir, today) {
  var it = c.item_id ? items[c.item_id] : null;
  var live = acts.filter(function (a) { return a.state !== 'CANCELLED'; }).sort(function (a, b) { return (Number(a.seq) || 0) - (Number(b.seq) || 0); });
  var last = (c.verify_history_json || []).slice(-1)[0] || null;
  return {
    capa_id: c.capa_id, code: c.code, source: c.source, dept_code: c.dept_code, state: c.state, overdue: capaOverdue_(c, acts, today),
    item_code: it ? it.code : '', item_name_vi: it ? it.name_vi || '' : '', item_name_zh: it ? it.name_zh || '' : '', ref_text: c.ref_text || '',
    found_date: String(c.found_date || ''), found_by_name: c.found_by_name || '', title_vi: c.title_vi || '', title_zh: c.title_zh || '',
    problem_vi: c.problem_vi || '', problem_zh: c.problem_zh || '', correction_vi: c.correction_vi || '', correction_zh: c.correction_zh || '',
    cause_vi: c.cause_vi || '', cause_zh: c.cause_zh || '', owner: reportUserName_(dir, c.owner_user_id), due_date: String(c.due_date || ''),
    created_by: reportUserName_(dir, c.created_by), created_at: String(c.created_at || ''), completed_at: String(c.completed_at || ''),
    verify_due: String(c.verify_due || ''), closed_at: String(c.closed_at || ''), verify_count: Number(c.verify_count) || 0,
    cancelled_at: String(c.cancelled_at || ''), cancel_reason: c.cancel_reason || '', files: (c.files_json || []).length,
    acts_total: live.length, acts_done: live.filter(function (a) { return a.state === 'DONE'; }).length,
    actions: live.map(function (a) {
      return { seq: Number(a.seq) || 0, atype: a.atype, content_vi: a.content_vi || '', content_zh: a.content_zh || '', round: Number(a.round) || 0,
        owner: reportUserName_(dir, a.owner_user_id) || a.assignee_name || '', assignee: a.owner_user_id && a.assignee_name ? a.assignee_name : '',
        due_date: String(a.due_date || ''), state: a.state, overdue: a.state === 'OPEN' && !!a.due_date && a.due_date < today,
        done_date: String(a.done_date || ''), result_vi: a.result_vi || '', result_zh: a.result_zh || '' };
    }),
    verify: (c.verify_history_json || []).map(function (h) {
      return { n: h.n, date: String(h.date || ''), by: reportUserName_(dir, h.by), result: h.result, note_vi: h.note_vi || '', note_zh: h.note_zh || '' };
    }),
    last_result: last ? last.result : '', last_by: last ? reportUserName_(dir, last.by) : '', last_date: last ? String(last.date || '') : '',
    // Khiếu nại / SCAR (3b)
    party_name: c.party_name || '', party_contact: c.party_contact || '', product_text: c.product_text || '', lot_text: c.lot_text || '',
    qty_text: c.qty_text || '', severity: c.severity || '', complaint_valid: c.complaint_valid || '', team_text: c.team_text || '',
    escape_vi: c.escape_vi || '', escape_zh: c.escape_zh || '', sent_date: String(c.sent_date || ''), reply_due: String(c.reply_due || ''),
    reply_date: String(c.reply_date || ''), reply_note_vi: c.reply_note_vi || '', reply_note_zh: c.reply_note_zh || '',
    reply_by: reportUserName_(dir, c.reply_by), reply_late: capaReplyLate_(c, today)
  };
}

/** Lọc sổ theo loại: ALL · INTERNAL (khắc phục nội bộ) · COMPLAINT · SUPPLIER */
function capaSourceMatch_(src, filter) {
  if (!filter || filter === 'ALL') return true;
  if (filter === 'INTERNAL') return !capaIsParty_(src);
  return src === filter;
}

/** Ô "Phản hồi" của khiếu nại / SCAR: ngày phản hồi, hoặc Chưa · hạn */
function capaReplyTile_(r) {
  if (r.reply_date) return { k: 'rpt.t.capa_reply.' + r.source, v: dmy_(r.reply_date), tone: 'green' };
  return { k: 'rpt.t.capa_reply.' + r.source, v: lab_('rpt.capa_no_reply', { D: dmy_(r.reply_due) || '—' }), tone: r.reply_late ? 'red' : 'amber' };
}

/**
 * Báo cáo CAPA: {capa_id, form CAR | RECEIPT | D8 | SCAR} → một phiếu (in ký theo mẫu); {dept, year, state ALL | OPEN | OVERDUE | VERIFYING |
 * CLOSED, source ALL | INTERNAL | COMPLAINT | SUPPLIER} → sổ theo dõi khắc phục / khiếu nại / SCAR
 */
function reportCapa_(ctx, f, today) {
  var items = {};
  readRows_('Items').forEach(function (it) { items[it.item_id] = it; });
  var dir = userDirectory_();
  var byCapa = {};
  if (sheetExists_('CapaActions')) readRows_('CapaActions').forEach(function (a) { if (!a.archived_at) (byCapa[a.capa_id] = byCapa[a.capa_id] || []).push(a); });
  var all = (sheetExists_('Capas') ? readRows_('Capas') : []).filter(function (c) {
    return !c.archived_at && capaVisible_(ctx.user, c, capaActOwners_(byCapa[c.capa_id] || []));
  });
  if (f.capa_id) {
    var one = all.filter(function (c) { return c.capa_id === f.capa_id; })[0];
    if (!one) {
      var ex = sheetExists_('Capas') ? findOne_('Capas', 'capa_id', f.capa_id) : null;
      if (ex && !ex.archived_at) throw apiError_('FORBIDDEN');
      throw validationError_([fieldError_('filters.capa_id', 'NOT_FOUND')]);
    }
    if (!capaFormOk_(f.form || 'CAR', one.source)) throw validationError_([fieldError_('filters.form', 'INVALID_VALUE')]);
    var r = reportCapaRow_(one, byCapa[one.capa_id] || [], items, dir, today);
    var stTile = { k: 'rpt.t.capa_state', v: lab_('capa.state.' + r.state), tone: r.state === 'CLOSED' ? 'green' : r.state === 'CANCELLED' ? 'muted' : (r.overdue ? 'red' : 'amber') };
    var dueTile = { k: 'rpt.t.capa_due', v: fmtDateVN_(r.due_date), tone: r.overdue && r.state === 'OPEN' ? 'red' : '' };
    return {
      data: { one: r }, rows: 1,
      tiles: [
        stTile,
        capaIsParty_(r.source) ? capaReplyTile_(r) : dueTile,
        { k: 'rpt.t.capa_actions', v: r.acts_done + '/' + r.acts_total },
        { k: 'rpt.t.capa_verify', v: r.last_result ? lab_('capa.result.' + r.last_result) : (r.verify_due ? fmtDateVN_(r.verify_due) : '—'),
          tone: r.last_result === 'EFFECTIVE' && r.state === 'CLOSED' ? 'green' : (r.last_result === 'NOT_EFFECTIVE' ? 'red' : '') }
      ]
    };
  }
  var y = String(f.year);
  var cnt = { total: 0, open: 0, overdue: 0, verifying: 0, closed: 0 };
  var rows = [];
  all.forEach(function (c) {
    if (String(c.found_date || c.created_at || '').slice(0, 4) !== y) return;
    if (f.dept && c.dept_code !== f.dept) return;
    if (!capaSourceMatch_(c.source, f.source)) return;
    if (c.state === 'CANCELLED' && f.state !== 'ALL') return;
    var acts = byCapa[c.capa_id] || [];
    var od = capaOverdue_(c, acts, today);
    if (c.state !== 'CANCELLED') cnt.total++;
    if (c.state === 'OPEN') cnt.open++;
    if (c.state === 'VERIFYING') cnt.verifying++;
    if (c.state === 'CLOSED') cnt.closed++;
    if (od) cnt.overdue++;
    if (f.state === 'OVERDUE' ? !od : (f.state !== 'ALL' && f.state !== c.state)) return;
    rows.push(reportCapaRow_(c, acts, items, dir, today));
  });
  rows.sort(function (a, b) { return String(a.code).localeCompare(String(b.code)); });
  return {
    data: { depts: reportGroupByDept_(rows, reportDepts_()), counts: cnt, year: f.year, source: f.source || 'ALL' },
    rows: rows.length,
    tiles: [
      { k: 'rpt.t.capa_total', v: String(cnt.total) },
      { k: 'rpt.t.capa_open', v: String(cnt.open + cnt.verifying), tone: cnt.open + cnt.verifying ? 'amber' : '' },
      { k: 'rpt.t.capa_overdue', v: String(cnt.overdue), tone: cnt.overdue ? 'red' : '' },
      { k: 'rpt.t.capa_closed', v: String(cnt.closed), tone: cnt.closed ? 'green' : '' }
    ]
  };
}

var CAPA_TONE_ = { OPEN: 'amber', VERIFYING: 'navy', CLOSED: 'green', CANCELLED: 'muted' };

/** Kết quả kiểm tra hiệu lực (một dòng) */
function capaVerifyText_(r) {
  if (r.state === 'CANCELLED') return lab_('capa.state.CANCELLED') + (r.cancel_reason ? ': ' + r.cancel_reason : '');
  if (r.last_result) return lab_('capa.result.' + r.last_result) + '\n' + [dmy_(r.last_date), r.last_by].filter(function (x) { return x; }).join(' · ');
  if (r.verify_due) return lab_('rpt.capa_verify_due', { D: dmy_(r.verify_due) });
  return '';
}

/** Phản hồi khiếu nại / trả lời SCAR (một ô): ngày + nội dung, hoặc Chưa · hạn */
function capaReplyText_(r) {
  if (r.reply_date) return dmy_(r.reply_date) + (r.reply_by ? ' · ' + r.reply_by : '') + (r.reply_note_vi || r.reply_note_zh ? '\n' + biNl_(r.reply_note_vi, r.reply_note_zh) : '');
  return lab_('rpt.capa_no_reply', { D: dmy_(r.reply_due) || '—' });
}

/** Bảng hành động của phiếu (lọc loại: '' tất cả · CORRECTIVE · PREVENTIVE) */
function capaActsTable_(r, atype) {
  var head = [labNl_('rpt.col.capa_type'), labNl_('rpt.col.capa_action'), labNl_('rpt.col.capa_owner'), labNl_('rpt.col.capa_due'),
    labNl_('rpt.col.capa_done'), labNl_('rpt.col.capa_result'), labNl_('rpt.col.status')];
  var types = ['text', 'text', 'text', 'date', 'date', 'text', 'text'];
  var tones = [];
  var rows = r.actions.filter(function (a) { return !atype || a.atype === atype; }).map(function (a) {
    tones.push(['', '', '', a.overdue ? 'red' : '', '', '', a.state === 'DONE' ? 'green' : (a.overdue ? 'red' : 'amber')]);
    return [labNl_('capa.atype.' + a.atype) + (a.round ? '\n' + lab_('capa.round_n', { N: a.round }) : ''), biNl_(a.content_vi, a.content_zh),
      a.owner + (a.assignee ? '\n' + a.assignee : ''), dmy_(a.due_date), dmy_(a.done_date), biNl_(a.result_vi, a.result_zh), labNl_('capa.astate.' + a.state)];
  });
  return rptTable_(head, types, rows, tones);
}

/** Các dòng kiểm tra hiệu lực / đóng / hủy của phiếu */
function capaVerifyKv_(r) {
  var ver = [];
  r.verify.forEach(function (h) {
    ver.push([lab_('capa.verify_n', { N: h.n }), lab_('capa.result.' + h.result) + ' · ' + [dmy_(h.date), h.by].filter(function (x) { return x; }).join(' · ') +
      (h.note_vi || h.note_zh ? '\n' + biNl_(h.note_vi, h.note_zh) : '')]);
  });
  if (r.state === 'VERIFYING') ver.push([lab_('capa.verify_due'), dmy_(r.verify_due)]);
  if (r.state === 'CLOSED') ver.push([lab_('rpt.kv.capa_closed'), dmy_(r.closed_at)]);
  if (r.state === 'CANCELLED') ver.push([lab_('capa.state.CANCELLED'), dmy_(r.cancelled_at) + (r.cancel_reason ? ' · ' + r.cancel_reason : '')]);
  if (!ver.length) ver.push([lab_('rpt.col.status'), lab_('capa.state.' + r.state)]);
  return ver;
}

/** Thông tin đối tác của khiếu nại / SCAR (các dòng kv, bỏ dòng trống) */
function capaPartyKv_(r) {
  var src = r.source;
  var kv = [[lab_('capa.party.' + src), r.party_name], [lab_('capa.party_contact'), r.party_contact], [lab_('capa.product.' + src), r.product_text],
    [lab_('capa.lot.' + src), r.lot_text], [lab_('capa.qty'), r.qty_text], [lab_('capa.severity'), r.severity ? lab_('capa.sev.' + r.severity) : '']];
  return kv.filter(function (x) { return x[1]; });
}

/** Bố cục báo cáo CAPA (28_report_pdf.js reportLayout_) */
function layoutCapa_(snap) {
  var d = snap.data;
  if (d.one) {
    var r = d.one;
    var form = (snap.filters || {}).form || 'CAR';
    var lastVer = r.verify.length ? r.verify[r.verify.length - 1] : null;
    var notes = r.files ? [lab_('rpt.capa_files', { N: r.files })] : [];
    var valid = r.complaint_valid ? lab_('capa.valid.' + r.complaint_valid) : lab_('capa.valid.PENDING');
    if (form === 'RECEIPT') {
      var info = [[lab_('rpt.kv.capa_no'), r.code], [lab_('capa.found_date.COMPLAINT'), dmy_(r.found_date)]].concat(capaPartyKv_(r));
      if (r.ref_text) info.push([lab_('capa.ref.COMPLAINT'), r.ref_text]);
      info.push([lab_('capa.found_by.COMPLAINT'), r.found_by_name || r.created_by]);
      info.push([lab_('capa.dept'), r.dept_code]);
      return {
        sections: [
          { heading: lab_('rpt.sec.rcpt_info'), kv: info },
          { heading: lab_('rpt.sec.rcpt_problem'), kv: [[lab_('capa.problem.COMPLAINT'), biNl_(r.problem_vi, r.problem_zh)]] },
          { heading: lab_('rpt.sec.rcpt_first'), kv: [[lab_('capa.correction.COMPLAINT'), biNl_(r.correction_vi, r.correction_zh) || '—'], [lab_('capa.valid'), valid],
            [lab_('capa.owner'), r.owner], [lab_('capa.reply_due.COMPLAINT'), dmy_(r.reply_due)], [lab_('capa.due_date'), dmy_(r.due_date)]] }
        ],
        notes: notes,
        sign: { prepared: lab_('rpt.sign.rcpt_by'), approved: lab_('rpt.sign.rcpt_owner'), prepared_name: r.found_by_name || r.created_by, approved_name: r.owner }
      };
    }
    if (form === 'D8') {
      var d0 = [[lab_('rpt.kv.capa_no'), r.code], [lab_('capa.found_date.COMPLAINT'), dmy_(r.found_date)]].concat(capaPartyKv_(r));
      if (r.ref_text) d0.push([lab_('capa.ref.COMPLAINT'), r.ref_text]);
      d0.push([lab_('capa.valid'), valid]);
      var d4 = [[lab_('capa.cause'), biNl_(r.cause_vi, r.cause_zh) || '—']];
      if (r.escape_vi || r.escape_zh) d4.push([lab_('capa.escape'), biNl_(r.escape_vi, r.escape_zh)]);
      var d8 = capaVerifyKv_(r);
      d8.unshift([lab_('capa.reply.COMPLAINT'), capaReplyText_(r)]);
      return {
        sections: [
          { heading: lab_('rpt.sec.d0'), kv: d0 },
          { heading: lab_('rpt.sec.d1'), kv: [[lab_('capa.team_lead'), r.owner], [lab_('capa.team'), r.team_text || '—']] },
          { heading: lab_('rpt.sec.d2'), kv: [[lab_('capa.problem.COMPLAINT'), biNl_(r.problem_vi, r.problem_zh)]] },
          { heading: lab_('rpt.sec.d3'), kv: [[lab_('capa.correction.COMPLAINT'), biNl_(r.correction_vi, r.correction_zh) || '—']] },
          { heading: lab_('rpt.sec.d4'), kv: d4 },
          { heading: lab_('rpt.sec.d56'), table: capaActsTable_(r, 'CORRECTIVE') },
          { heading: lab_('rpt.sec.d7'), table: capaActsTable_(r, 'PREVENTIVE') },
          { heading: lab_('rpt.sec.d8'), kv: d8 }
        ],
        notes: notes,
        sign: { prepared: lab_('rpt.sign.d8_lead'), approved: lab_('rpt.sign.capa_verifier'), prepared_name: r.owner, approved_name: lastVer ? lastVer.by : '' }
      };
    }
    if (form === 'SCAR') {
      var s1 = [[lab_('rpt.kv.scar_no'), r.code]].concat(capaPartyKv_(r));
      s1.push([lab_('capa.found_date'), dmy_(r.found_date)]);
      s1.push([lab_('capa.sent_date'), dmy_(r.sent_date) || '—']);
      s1.push([lab_('capa.reply_due.SUPPLIER'), dmy_(r.reply_due)]);
      if (r.ref_text) s1.push([lab_('capa.ref'), r.ref_text]);
      var s3 = [[lab_('capa.reply.SUPPLIER'), capaReplyText_(r)], [lab_('capa.cause'), biNl_(r.cause_vi, r.cause_zh) || '—']];
      if (r.escape_vi || r.escape_zh) s3.push([lab_('capa.escape'), biNl_(r.escape_vi, r.escape_zh)]);
      return {
        sections: [
          { heading: lab_('rpt.sec.scar_info'), kv: s1 },
          { heading: lab_('rpt.sec.scar_nc'), kv: [[lab_('capa.problem'), biNl_(r.problem_vi, r.problem_zh)], [lab_('capa.correction.SUPPLIER'), biNl_(r.correction_vi, r.correction_zh) || '—'],
            [lab_('rpt.kv.scar_request'), lab_('rpt.scar_request', { D: dmy_(r.reply_due) || '—' })]] },
          { heading: lab_('rpt.sec.scar_reply'), kv: s3 },
          { heading: lab_('rpt.sec.scar_actions'), table: capaActsTable_(r, '') },
          { heading: lab_('rpt.sec.scar_verify'), kv: capaVerifyKv_(r) }
        ],
        notes: notes,
        sign: { prepared: lab_('rpt.sign.scar_by'), middle: lab_('rpt.sign.scar_supplier'), approved: lab_('rpt.sign.capa_verifier'),
          prepared_name: r.owner, middle_name: r.party_contact || r.party_name, approved_name: lastVer ? lastVer.by : '' }
      };
    }
    var nc = [
      [lab_('rpt.kv.capa_no'), r.code],
      [lab_('capa.found_date'), dmy_(r.found_date)],
      [lab_('capa.source'), lab_('capa.src.' + r.source)],
      [lab_('rpt.col.dept'), r.dept_code],
      [lab_('capa.found_by'), r.found_by_name || r.created_by]
    ];
    if (capaIsParty_(r.source)) nc = nc.concat(capaPartyKv_(r));
    if (r.item_code) nc.push([lab_('capa.item'), r.item_code + ' · ' + biText_(r.item_name_vi, r.item_name_zh)]);
    if (r.ref_text) nc.push([lab_('capa.ref'), r.ref_text]);
    if (r.title_vi || r.title_zh) nc.push([lab_('capa.title_f'), biNl_(r.title_vi, r.title_zh)]);
    nc.push([lab_('capa.problem'), biNl_(r.problem_vi, r.problem_zh)]);
    nc.push([lab_('capa.correction'), biNl_(r.correction_vi, r.correction_zh) || '—']);
    nc.push([lab_('capa.owner'), r.owner]);
    nc.push([lab_('capa.due_date'), dmy_(r.due_date)]);
    var cause = [[lab_('capa.cause'), biNl_(r.cause_vi, r.cause_zh) || '—']];
    if (r.escape_vi || r.escape_zh) cause.push([lab_('capa.escape'), biNl_(r.escape_vi, r.escape_zh)]);
    var ver = capaVerifyKv_(r);
    if (capaIsParty_(r.source)) ver.unshift([lab_('capa.reply.' + r.source), capaReplyText_(r)]);
    return {
      sections: [
        { heading: lab_('rpt.sec.capa_nc'), kv: nc },
        { heading: lab_('rpt.sec.capa_cause'), kv: cause },
        { heading: lab_('rpt.sec.capa_actions'), table: capaActsTable_(r, '') },
        { heading: lab_('rpt.sec.capa_verify'), kv: ver }
      ],
      notes: notes,
      sign: { prepared: lab_('rpt.sign.capa_owner'), approved: lab_('rpt.sign.capa_verifier'), prepared_name: r.owner, approved_name: lastVer ? lastVer.by : '' }
    };
  }
  var party = d.source === 'COMPLAINT' || d.source === 'SUPPLIER';
  var headL, typesL;
  if (party) {
    headL = [labNl_('rpt.col.capa_no'), labNl_('capa.found_date.' + d.source), labNl_('capa.party.' + d.source), labNl_('capa.problem'), labNl_('rpt.col.capa_cause'),
      labNl_('rpt.col.capa_owner'), labNl_('capa.reply_due.' + d.source), labNl_('capa.reply.' + d.source), labNl_('rpt.col.capa_progress'), labNl_('rpt.col.status'), labNl_('rpt.col.capa_verify')];
    typesL = ['code', 'date', 'text', 'text', 'text', 'text', 'date', 'text', 'mid', 'text', 'text'];
  } else {
    headL = [labNl_('rpt.col.capa_no'), labNl_('capa.found_date'), labNl_('capa.source'), labNl_('capa.problem'), labNl_('rpt.col.capa_cause'),
      labNl_('rpt.col.capa_owner'), labNl_('rpt.col.capa_due'), labNl_('rpt.col.capa_progress'), labNl_('rpt.col.status'), labNl_('rpt.col.capa_verify')];
    typesL = ['code', 'date', 'text', 'text', 'text', 'text', 'date', 'mid', 'text', 'text'];
  }
  var secs = [];
  d.depts.forEach(function (g) {
    var tonesL = [];
    var rowsL = g.rows.map(function (r2) {
      var what = (r2.title_vi || r2.title_zh) ? biNl_(r2.title_vi, r2.title_zh) : biNl_(r2.problem_vi, r2.problem_zh);
      var stTone = r2.overdue ? 'red' : (CAPA_TONE_[r2.state] || '');
      var verTone = r2.last_result === 'NOT_EFFECTIVE' && r2.state !== 'CLOSED' ? 'red' : (r2.state === 'CLOSED' ? 'green' : '');
      var stText = labNl_('capa.state.' + r2.state) + (r2.overdue ? '\n' + lab_('capa.overdue') : '');
      if (party) {
        tonesL.push(['', '', '', '', '', '', r2.reply_late ? 'red' : '', r2.reply_date ? 'green' : (r2.reply_late ? 'red' : 'amber'), '', stTone, verTone]);
        return [r2.code, dmy_(r2.found_date), [r2.party_name, r2.product_text, r2.lot_text].filter(function (x) { return x; }).join('\n'), what,
          biNl_(r2.cause_vi, r2.cause_zh), r2.owner, dmy_(r2.reply_due), r2.reply_date ? dmy_(r2.reply_date) : lab_('rpt.capa_not_yet'),
          r2.acts_done + '/' + r2.acts_total, stText, capaVerifyText_(r2)];
      }
      tonesL.push(['', '', '', '', '', '', r2.overdue && r2.state === 'OPEN' ? 'red' : '', '', stTone, verTone]);
      return [r2.code, dmy_(r2.found_date), labNl_('capa.src.' + r2.source) + (r2.party_name ? '\n' + r2.party_name : ''), what, biNl_(r2.cause_vi, r2.cause_zh),
        r2.owner, dmy_(r2.due_date), r2.acts_done + '/' + r2.acts_total, stText, capaVerifyText_(r2)];
    });
    secs.push({ heading: g.dept_code + ' · ' + biText_(g.name_vi, g.name_zh) + ' — ' + lab_('rpt.capa_n', { N: g.rows.length }), table: rptTable_(headL, typesL, rowsL, tonesL) });
  });
  if (!secs.length) secs.push({ table: rptTable_(headL, typesL, [], null) });
  return { sections: secs, notes: [lab_(party ? 'rpt.note.capa_party' : 'rpt.note.capa')] };
}

/* ---------------- Trạng thái hệ thống ---------------- */

/** Dòng healthCheck `capa`: [ok, giá trị, ghi chú] — số phiếu theo trạng thái, hành động / kiểm tra hiệu lực quá hạn (việc nghiệp vụ, không
 *  làm dòng thành cảnh báo; chỉ thiếu sheet mới là cảnh báo) */
function capaHealth_() {
  if (!sheetExists_('Capas') || !sheetExists_('CapaActions')) return [false, 'Thiếu sheet Capas / CapaActions', 'Chạy migrateSchema'];
  var today = todayVN_();
  var cs = readRows_('Capas').filter(function (c) { return !c.archived_at && inScopeDept_(c.dept_code); });
  var open = {};
  cs.forEach(function (c) { if (c.state === 'OPEN') open[c.capa_id] = 1; });
  var late = readRows_('CapaActions').filter(function (a) { return !a.archived_at && a.state === 'OPEN' && open[a.capa_id] && a.due_date && a.due_date < today; }).length;
  var cnt = function (s) { return cs.filter(function (c) { return c.state === s; }).length; };
  var vlate = cs.filter(function (c) { return c.state === 'VERIFYING' && c.verify_due && c.verify_due < today; }).length;
  var live = cs.filter(function (c) { return c.state === 'OPEN' || c.state === 'VERIFYING'; });
  var nSrc = function (src) { return live.filter(function (c) { return c.source === src; }).length; };
  var rlate = cs.filter(function (c) { return capaReplyLate_(c, today); }).length;
  var cols = capaSchemaReady_() ? '' : 'Thiếu cột khiếu nại / SCAR — chạy migrateSchema';
  return [!cols, 'Đang xử lý ' + cnt('OPEN') + ' · chờ kiểm tra hiệu lực ' + cnt('VERIFYING') + ' · đã đóng ' + cnt('CLOSED') +
    ' · hành động quá hạn ' + late + ' · quá hạn kiểm tra hiệu lực ' + vlate + ' · khiếu nại đang mở ' + nSrc('COMPLAINT') + ' · SCAR đang mở ' + nSrc('SUPPLIER') +
    ' · quá hạn phản hồi ' + rlate, cols || (late || vlate || rlate ? 'Khắc phục → Quá hạn' : '')];
}
