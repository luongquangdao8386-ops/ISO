/* 35_iaudit: Đánh giá nội bộ (Đợt 4, phiên 4a) — chương trình năm (BM-ISO-03-01, mã DG-yy), đợt đánh giá + kế hoạch đợt (BM-ISO-03-02,
 * mã DG-yy-01), checklist (BM-ISO-03-03). Mã biểu in theo Settings audit_program_form_code / audit_plan_form_code / audit_checklist_form_code
 * (sửa ở Cấu hình). Người dùng chốt 13/11/2026 giữ phạm vi Cơ điện: đợt đánh giá chỉ cho bộ phận trong phạm vi áp dụng; điều khoản ISO 9001 /
 * chủ đề BRCGS không liên quan đánh dấu "Không áp dụng" kèm lý do (vẫn tính là đã phủ).
 * Luồng (ISO 9001 điều 9.2, BRCGS Packaging — đánh giá nội bộ):
 *  1. Thư ký ISO / Quản trị lập chương trình năm (một chương trình mỗi năm): mục tiêu, phạm vi, chuẩn (ISO 9001, BRCGS), các đợt đánh giá
 *     (tháng, bộ phận, quá trình / nội dung, điều khoản). Phủ điều khoản: mỗi điều khoản / chủ đề phải có ít nhất một đợt hoặc Không áp dụng.
 *  2. Gửi duyệt (phải phủ hết) → Quản trị (cấp 4) duyệt (PIN; người gửi không tự duyệt trừ admin_self_approval) hoặc trả lại (lý do).
 *     Duyệt: các đợt chưa có mã được cấp DG-yy-01… theo tháng; lần duyệt tăng 01, 02…
 *  3. Sửa chương trình đã duyệt (PIN, lý do) → về Nháp, thêm / bỏ / dời đợt rồi gửi duyệt lại (lần 02…). Bộ phận, tháng, nội dung, điều
 *     khoản của đợt chỉ sửa khi chương trình là Nháp; kế hoạch đợt (ngày, giờ, địa điểm, đoàn, đại diện, ghi chú, checklist) sửa lúc nào cũng
 *     được trước khi đánh giá.
 *  4. Kế hoạch đợt: Thư ký ISO hoặc trưởng đoàn lập ngày, đoàn đánh giá (người trong app có cờ Đánh giá viên / Thư ký ISO, hoặc ghi tên người
 *     ngoài app kèm bộ phận công tác) — đánh giá viên không đánh giá bộ phận của chính mình; checklist (câu hỏi theo điều khoản, gợi ý từ
 *     các biểu liên quan trong danh mục). Chốt kế hoạch (chương trình đã duyệt, có ngày, trưởng đoàn, ít nhất một câu hỏi) → Gmail báo trước.
 *  5. Bắt đầu đánh giá (từ ngày đánh giá) → ghi kết quả từng câu: Phù hợp · Không phù hợp · Cần cải tiến · Không áp dụng + bằng chứng.
 *     Phát hiện → phiếu khắc phục, báo cáo đánh giá (BM-ISO-03-04), đóng đợt: phiên 4b (36_finding.js).
 * Bằng chứng / ghi chép đánh giá không dịch máy (kết luận đánh giá — mục 4 đặc tả); câu hỏi, nội dung, ghi chú kế hoạch có dịch máy. */

/* ---------------- Quyền ---------------- */

/** Thấy chương trình: cấp 2+, Thư ký ISO, Đánh giá viên */
function auditProgVisible_(u, pg) {
  return !!pg && (isSecretary_(u) || Number(u.role_level) >= 2 || !!u.auditor);
}

function auditTeam_(a) { return a && Array.isArray(a.team_json) ? a.team_json : []; }

/** Người trong đoàn đánh giá (người dùng app) */
function auditMember_(u, a) {
  return auditTeam_(a).some(function (t) { return t && t.u && t.u === u.user_id; });
}

/** Thấy đợt đánh giá: bộ phận trong phạm vi; Thư ký ISO, Đánh giá viên, người trong đoàn; cấp 2+ của bộ phận được đánh giá */
function auditVisible_(u, a) {
  if (!a || !inScopeDept_(a.dept_code)) return false;
  if (isSecretary_(u) || u.auditor || auditMember_(u, a)) return true;
  if (Number(u.role_level) < 2) return false;
  var mine = userDepts_(u);
  return !mine.length || mine.indexOf(a.dept_code) >= 0;
}

/** Lập kế hoạch đợt (ngày, đoàn, checklist), chốt kế hoạch, bắt đầu: Thư ký ISO, trưởng đoàn */
function canPlanAudit_(u, a) {
  return isSecretary_(u) || (!!a && !!a.lead_user_id && a.lead_user_id === u.user_id);
}

/** Ghi kết quả checklist: Thư ký ISO, trưởng đoàn, người trong đoàn */
function canRecordAudit_(u, a) {
  return canPlanAudit_(u, a) || auditMember_(u, a);
}

/** Duyệt / trả lại chương trình: Quản trị (cấp 4); người gửi duyệt không tự duyệt (được khi admin_self_approval) */
function canApproveProgram_(u, pg) {
  return Number(u.role_level) >= 4 && (pg.submitted_by !== u.user_id || !!setting_('admin_self_approval'));
}

/* ---------------- Tiện ích ---------------- */

function iauditSchemaReady_() {
  try { return sheetExists_('AuditPrograms') && sheetExists_('Audits') && sheetExists_('AuditChecks'); } catch (e) { return false; }
}

/** Dán Code.gs 4a mà chưa chạy migrateSchema: lần ghi đầu tiên tự thêm 3 sheet */
function ensureIauditSchema_() {
  if (iauditSchemaReady_()) return;
  autoMigrate_();
  dbReset_();
  if (!iauditSchemaReady_()) throw apiError_('SYSTEM_NOT_READY');
}

function auditStdsOf_(pg) {
  var s = deptList_(pg && pg.stds);
  return s.length ? AUDIT_STDS_.filter(function (x) { return s.indexOf(x) >= 0; }) : AUDIT_STDS_LEGACY_.slice();
}

/** Mã chương trình: DG-26 */
function auditProgCode_(year) { return 'DG-' + String(year).slice(2); }

/** Chương trình (ngoài khóa) cho kiểm quyền */
function loadAuditProgram_(ctx, id) {
  ensureIauditSchema_();
  if (!isUuidV4_(id)) throw validationError_([fieldError_('program_id', 'ID_INVALID')]);
  var pg = findOne_('AuditPrograms', 'program_id', id);
  if (!pg || pg.archived_at) throw apiError_('NOT_FOUND');
  if (!auditProgVisible_(ctx.user, pg)) throw apiError_('FORBIDDEN');
  return pg;
}

/** Đợt + chương trình (ngoài khóa) */
function loadAudit_(ctx, id) {
  ensureIauditSchema_();
  if (!isUuidV4_(id)) throw validationError_([fieldError_('audit_id', 'ID_INVALID')]);
  var a = findOne_('Audits', 'audit_id', id);
  if (!a || a.archived_at) throw apiError_('NOT_FOUND');
  if (!auditVisible_(ctx.user, a)) throw apiError_('FORBIDDEN');
  var pg = findOne_('AuditPrograms', 'program_id', a.program_id);
  if (!pg) throw apiError_('NOT_FOUND');
  return { a: a, pg: pg };
}

function lockedRow_(ctx, sheet, key, id, entityType, checkVersion) {
  var cur = findOne_(sheet, key, id);
  if (!cur) throw apiError_('NOT_FOUND');
  if (checkVersion) assertVersion_(ctx, cur, entityType, sheet);
  var row = clone_(cur); delete row.__row;
  return row;
}

/** Đợt còn trong chương trình (chưa bỏ, chưa hủy) */
function liveAudits_(programId) {
  return findAll_('Audits', 'program_id', programId).filter(function (a) { return !a.archived_at && a.state !== 'CANCELLED'; });
}

function auditChecksOf_(auditId) {
  return findAll_('AuditChecks', 'audit_id', auditId).filter(function (c) { return !c.archived_at; })
    .sort(function (a, b) { return (Number(a.seq) || 0) - (Number(b.seq) || 0); });
}

/** Điều khoản đang dùng của một chuẩn theo thứ tự (như js/coverage.js clausesOf) */
function auditClausesOf_(clauses, std) {
  return clauses.filter(function (c) { return c.std === std && c.active !== false && !c.archived_at; }).sort(function (a, b) {
    return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.key).localeCompare(String(b.key));
  });
}

/**
 * Phủ điều khoản của chương trình (giống js/coverage.js auditCoverage — test so hai bên): mỗi điều khoản / chủ đề của các chuẩn trong
 * chương trình → đợt đánh giá có điều khoản đó (AUDIT) · Không áp dụng kèm lý do (NA) · chưa có (MISSING).
 */
function auditCoverageSrv_(clauses, stds, audits, na) {
  var naMap = {};
  (na || []).forEach(function (x) { if (x && x.c) naMap[x.c] = x.r || ''; });
  var live = (audits || []).filter(function (a) { return a.state !== 'CANCELLED' && !a.archived_at; });
  var rows = [];
  stds.forEach(function (std) {
    auditClausesOf_(clauses, std).forEach(function (c) {
      var hit = live.filter(function (a) { return (a.clauses_json || []).indexOf(c.clause_id) >= 0; });
      var isNa = Object.prototype.hasOwnProperty.call(naMap, c.clause_id);
      rows.push({ clause: c, std: std, key: c.key, audits: hit, na: hit.length ? '' : (isNa ? naMap[c.clause_id] : ''),
        state: hit.length ? 'AUDIT' : isNa ? 'NA' : 'MISSING' });
    });
  });
  return rows;
}

function auditCoverageOf_(pg, audits) {
  return auditCoverageSrv_(readRows_('Clauses'), auditStdsOf_(pg), audits || liveAudits_(pg.program_id), pg.na_json || []);
}

/** Đợt trễ kế hoạch: chưa đánh giá mà ngày đánh giá đã qua, hoặc chưa có ngày mà tháng dự kiến đã qua */
function auditLate_(a, today) {
  if (a.state !== 'PLANNED' && a.state !== 'READY') return false;
  if (a.audit_date) return String(a.audit_date) < today;
  return !!a.plan_month && String(a.plan_month) < today.slice(0, 7);
}

/** Trưởng đoàn (dòng đoàn có r = L) */
function auditLeadOf_(team) {
  return (team || []).filter(function (t) { return t && t.r === 'L'; })[0] || null;
}

function auditProgResult_(ctx, row) {
  return { entity_type: 'AUD_PROG', entity_id: row.program_id, record_version: row.record_version, record: projectRow_(ctx, row) };
}
function auditResult_(ctx, row) {
  return { entity_type: 'AUDIT', entity_id: row.audit_id, record_version: row.record_version, record: projectRow_(ctx, row) };
}
function auditCheckResult_(ctx, row) {
  return { entity_type: 'AUD_CHK', entity_id: row.check_id, record_version: row.record_version, record: projectRow_(ctx, row) };
}

/** Lỗi trước khi gửi duyệt / duyệt: có ít nhất một đợt, phủ hết điều khoản */
function auditProgramReadyErrors_(pg) {
  var audits = liveAudits_(pg.program_id);
  if (!audits.length) return [fieldError_('audits', 'AUDIT_NO_AUDITS')];
  var miss = auditCoverageOf_(pg, audits).filter(function (r) { return r.state === 'MISSING'; });
  if (!miss.length) return [];
  var e = fieldError_('coverage', 'AUDIT_NOT_COVERED');
  var keys = miss.slice(0, 8).map(function (r) { return r.key; }).join(', ') + (miss.length > 8 ? '…' : '');
  e.message_vi += ' (' + miss.length + ': ' + keys + ')';
  e.message_zh += '（' + miss.length + '：' + keys + '）';
  return [e];
}

/** Chuẩn của chương trình từ payload: mảng con của AUDIT_STDS_, không rỗng */
function auditStdsIn_(errs, raw) {
  var arr = Array.isArray(raw) ? raw : String(raw || '').split(',');
  var out = [];
  arr.forEach(function (x) {
    x = String(x || '').trim();
    if (!x) return;
    if (AUDIT_STDS_.indexOf(x) < 0) { errs.push(fieldError_('stds', 'INVALID_VALUE')); return; }
    if (out.indexOf(x) < 0) out.push(x);
  });
  if (!out.length && !errs.some(function (e) { return e.field === 'stds'; })) errs.push(fieldError_('stds', 'REQUIRED'));
  return AUDIT_STDS_.filter(function (s) { return out.indexOf(s) >= 0; });
}

/** Danh sách Không áp dụng [{c, r}] từ payload: điều khoản có trong Clauses thuộc chuẩn của chương trình, lý do bắt buộc */
function auditNaIn_(errs, raw, stds, byId) {
  if (!Array.isArray(raw)) { errs.push(fieldError_('na', 'INVALID_VALUE')); return []; }
  if (raw.length > AUDIT_MAX_NA_) { errs.push(fieldError_('na', 'INVALID_VALUE')); return []; }
  var out = [], idx = {};
  raw.forEach(function (x, i) {
    x = x || {};
    var c = String(x.c || ''), r = trimStr_(x.r || '');
    var cl = byId[c];
    if (!cl || cl.active === false || stds.indexOf(cl.std) < 0) { errs.push(fieldError_('na.' + i + '.c', 'INVALID_VALUE')); return; }
    if (!r) { errs.push(fieldError_('na.' + i + '.r', 'REQUIRED')); return; }
    if (r.length > 200) { errs.push(fieldError_('na.' + i + '.r', 'TOO_LONG')); return; }
    if (idx[c] !== undefined) out[idx[c]] = { c: c, r: r };
    else { idx[c] = out.length; out.push({ c: c, r: r }); }
  });
  return out;
}

/** Đoàn đánh giá từ payload [{u?, n, d?, r: L | M}]: người trong app phải có cờ Đánh giá viên hoặc là Thư ký ISO / Quản trị; người ngoài app
 *  ghi tên (+ bộ phận công tác); không ai thuộc bộ phận được đánh giá; tối đa một trưởng đoàn */
function auditTeamIn_(errs, raw, dept) {
  if (!Array.isArray(raw)) raw = [];
  if (raw.length > AUDIT_MAX_TEAM_) { errs.push(fieldError_('team', 'AUDIT_TEAM_MAX')); return []; }
  var out = [], seen = {}, leads = 0;
  raw.forEach(function (t, i) {
    t = t || {};
    var uid = trimStr_(t.u || ''), name = trimStr_(t.n || ''), d = trimStr_(t.d || ''), r = t.r === 'L' ? 'L' : 'M';
    var f = 'team.' + i;
    if (uid) {
      var usr = findOne_('Users', 'user_id', uid);
      if (!usr || !usr.active) { errs.push(fieldError_(f, 'NOT_FOUND')); return; }
      if (seen[uid]) { errs.push(fieldError_(f, 'AUDIT_TEAM_DUP')); return; }
      seen[uid] = 1;
      if (!usr.auditor && !isSecretary_(usr)) errs.push(fieldError_(f, 'AUDIT_NOT_AUDITOR'));
      if (dept && deptList_(usr.dept_codes).indexOf(dept) >= 0) errs.push(fieldError_(f, 'AUDIT_OWN_DEPT'));
      name = usr.display_name || name;
    } else if (!name) { errs.push(fieldError_(f, 'REQUIRED')); return; }
    if (name.length > 80) errs.push(fieldError_(f, 'TOO_LONG'));
    if (d) {
      if (!findOne_('Depts', 'dept_code', d)) errs.push(fieldError_(f, 'DEPT_UNKNOWN'));
      else if (d === dept) errs.push(fieldError_(f, 'AUDIT_OWN_DEPT'));
    }
    if (r === 'L') leads++;
    out.push({ u: uid, n: name, d: d, r: r });
  });
  if (leads > 1) errs.push(fieldError_('team', 'AUDIT_ONE_LEAD'));
  return out;
}

/** Danh sách điều khoản của đợt từ payload: clause_id có trong Clauses, thuộc chuẩn của chương trình; giữ thứ tự Clauses */
function auditClausesIn_(errs, raw, stds, byId) {
  if (!Array.isArray(raw) || !raw.length) { errs.push(fieldError_('clauses', 'REQUIRED')); return []; }
  if (raw.length > AUDIT_MAX_CLAUSES_) { errs.push(fieldError_('clauses', 'INVALID_VALUE')); return []; }
  var ok = {};
  raw.forEach(function (c, i) {
    var cl = byId[String(c || '')];
    if (!cl || cl.active === false || stds.indexOf(cl.std) < 0) errs.push(fieldError_('clauses.' + i, 'INVALID_VALUE'));
    else ok[cl.clause_id] = cl;
  });
  return Object.keys(ok).map(function (k) { return ok[k]; }).sort(function (a, b) {
    return AUDIT_STDS_.indexOf(a.std) - AUDIT_STDS_.indexOf(b.std) || (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.key).localeCompare(String(b.key));
  }).map(function (c) { return c.clause_id; });
}

function auditClauseMap_() {
  var m = {};
  readRows_('Clauses').forEach(function (c) { if (!c.archived_at) m[c.clause_id] = c; });
  return m;
}

function sameList_(a, b) {
  a = a || []; b = b || [];
  return a.length === b.length && a.every(function (x, i) { return x === b[i]; });
}

/* ---------------- iaudit.program.save ---------------- */

/**
 * iaudit.program.save {program_id, year (khi lập), title_vi/zh?, objective_vi/zh?, scope_vi/zh?, stds ['ISO9001','BRC'], na [{c: clause_id,
 * r: lý do}]} — Thư ký ISO / Quản trị. expected_version 0 = lập chương trình năm (một chương trình chưa hủy mỗi năm; năm nay ± 1);
 * khác 0 = sửa khi Nháp.
 */
function auditProgramSave_(ctx) {
  ensureIauditSchema_();
  var p = ctx.req.payload || {};
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  if (!isUuidV4_(p.program_id)) throw validationError_([fieldError_('program_id', 'ID_INVALID')]);
  var cur = isNew ? null : loadAuditProgram_(ctx, p.program_id);
  if (cur && cur.state !== 'DRAFT') throw stateInvalid_();
  var errs = [];
  var ty = Number(todayVN_().slice(0, 4));
  var year = cur ? Number(cur.year) : Number(p.year);
  if (isNew) {
    if (!(year >= ty - 1 && year <= ty + 1) || Math.floor(year) !== year) errs.push(fieldError_('year', 'INVALID_VALUE'));
    else if (readRows_('AuditPrograms').some(function (x) { return !x.archived_at && x.state !== 'CANCELLED' && Number(x.year) === year; })) {
      errs.push(fieldError_('year', 'AUDIT_YEAR_TAKEN'));
    }
  } else if (p.year !== undefined && p.year !== null && p.year !== '' && Number(p.year) !== year) {
    errs.push(fieldError_('year', 'INVALID_VALUE'));
  }
  var stds = p.stds === undefined ? (cur ? auditStdsOf_(cur) : AUDIT_STDS_.slice()) : auditStdsIn_(errs, p.stds);
  var byId = auditClauseMap_();
  if (cur && p.stds !== undefined) {
    // Bỏ một chuẩn mà còn đợt có điều khoản của chuẩn đó
    var used = liveAudits_(cur.program_id).some(function (a) {
      return (a.clauses_json || []).some(function (c) { return byId[c] && stds.indexOf(byId[c].std) < 0; });
    });
    if (used) errs.push(fieldError_('stds', 'AUDIT_STD_USED'));
  }
  var na = p.na === undefined ? (cur ? (cur.na_json || []).filter(function (x) { return byId[x.c] && stds.indexOf(byId[x.c].std) >= 0; }) : [])
    : auditNaIn_(errs, p.na, stds, byId);
  ['title', 'objective', 'scope'].forEach(function (f) { ['_vi', '_zh'].forEach(function (l) { capaTextLen_(errs, p, f + l, f === 'title' ? 200 : 2000); }); });
  if (errs.length) throw validationError_(errs);
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  var tr = applyTranslations_('AuditPrograms', ['title', 'objective', 'scope'], p, cur);
  return executeWrite_(ctx, {
    entity_type: 'AUD_PROG', entity_id: p.program_id,
    build: function () {
      var row;
      if (isNew) {
        assertNewId_('AuditPrograms', 'program_id', p.program_id);
        // Hai người cùng lập chương trình một năm: kiểm lại dưới khóa
        if (readRows_('AuditPrograms').some(function (x) { return !x.archived_at && x.state !== 'CANCELLED' && Number(x.year) === year; })) {
          throw validationError_([fieldError_('year', 'AUDIT_YEAR_TAKEN')]);
        }
        row = cNew_(ctx, {
          program_id: p.program_id, code: auditProgCode_(year), year: year, title_vi: '', title_zh: '', objective_vi: '', objective_zh: '',
          scope_vi: '', scope_zh: '', stds: '', na_json: [], state: 'DRAFT', rev: '', submitted_at: '', submitted_by: '', approved_at: '',
          approved_by: '', approve_note: '', returned_at: '', returned_by: '', return_reason: '', reopened_at: '', reopened_by: '',
          reopen_reason: '', history_json: [], cancelled_at: '', cancelled_by: '', cancel_reason: ''
        });
      } else {
        row = lockedRow_(ctx, 'AuditPrograms', 'program_id', p.program_id, 'AUD_PROG', true);
        if (row.state !== 'DRAFT') throw stateInvalid_();
        cUpdate_(ctx, row);
      }
      var before = isNew ? null : { stds: row.stds, na: (row.na_json || []).length };
      row.stds = stds.join(',');
      row.na_json = na;
      Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
      row.i18n_meta = Object.assign({}, row.i18n_meta || {}, tr.meta);
      return {
        writes: [{ sheet: 'AuditPrograms', mode: isNew ? 'insert' : 'update', row: row }],
        result: auditProgResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'AUD_PROG', entity_id: row.program_id, before_json: before,
          after_json: { code: row.code, year: row.year, stds: row.stds, na: na.length, created: isNew } }
      };
    }
  });
}

/* ---------------- Gửi duyệt / duyệt / trả lại / sửa / hủy chương trình ---------------- */

/** iaudit.program.submit {program_id} (Nháp → Chờ duyệt; phải có đợt và phủ hết điều khoản) hoặc {program_id, undo: true} (rút lại) */
function auditProgramSubmit_(ctx) {
  var p = ctx.req.payload || {};
  var pg = loadAuditProgram_(ctx, p.program_id);
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  var undo = p.undo === true;
  if (pg.state !== (undo ? 'IN_REVIEW' : 'DRAFT')) throw stateInvalid_();
  if (!undo) {
    var errs = auditProgramReadyErrors_(pg);
    if (errs.length) throw validationError_(errs);
  }
  return executeWrite_(ctx, {
    entity_type: 'AUD_PROG', entity_id: pg.program_id,
    build: function () {
      var row = lockedRow_(ctx, 'AuditPrograms', 'program_id', pg.program_id, 'AUD_PROG', true);
      if (row.state !== (undo ? 'IN_REVIEW' : 'DRAFT')) throw stateInvalid_();
      cUpdate_(ctx, row);
      if (undo) { row.state = 'DRAFT'; row.submitted_at = ''; row.submitted_by = ''; }
      else { row.state = 'IN_REVIEW'; row.submitted_at = isoVN_(now_()); row.submitted_by = ctx.user.user_id; row.return_reason = ''; }
      return {
        writes: [{ sheet: 'AuditPrograms', mode: 'update', row: row }], result: auditProgResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'AUD_PROG', entity_id: row.program_id, before_json: { state: undo ? 'IN_REVIEW' : 'DRAFT' }, after_json: { state: row.state, code: row.code } }
      };
    }
  });
}

function precheckAuditApprove_(ctx) {
  var pg = loadAuditProgram_(ctx, (ctx.req.payload || {}).program_id);
  if (!canApproveProgram_(ctx.user, pg)) throw apiError_('FORBIDDEN');
  if (pg.state !== 'IN_REVIEW') throw stateInvalid_();
  var errs = auditProgramReadyErrors_(pg);
  if (errs.length) throw validationError_(errs);
}

/** iaudit.program.approve {program_id, note?} (PIN): Chờ duyệt → Đã duyệt; cấp mã DG-yy-01… cho đợt chưa có mã (theo tháng); lần duyệt +1 */
function auditProgramApprove_(ctx) {
  var p = ctx.req.payload || {};
  var pg = loadAuditProgram_(ctx, p.program_id);
  if (!canApproveProgram_(ctx.user, pg)) throw apiError_('FORBIDDEN');
  if (pg.state !== 'IN_REVIEW') throw stateInvalid_();
  var errs = auditProgramReadyErrors_(pg);
  if (errs.length) throw validationError_(errs);
  var note = reasonText_(p, 'note', false, 500);
  return executeWrite_(ctx, {
    entity_type: 'AUD_PROG', entity_id: pg.program_id,
    build: function (st) {
      var row = lockedRow_(ctx, 'AuditPrograms', 'program_id', pg.program_id, 'AUD_PROG', true);
      if (row.state !== 'IN_REVIEW') throw stateInvalid_();
      var su = {};
      var writes = [];
      var newCodes = [];
      liveAudits_(row.program_id).filter(function (a) { return !a.code; }).sort(function (a, b) {
        return String(a.plan_month).localeCompare(String(b.plan_month)) || String(a.created_at).localeCompare(String(b.created_at));
      }).forEach(function (a) {
        var ar = clone_(a); delete ar.__row;
        ar.code = allocCode_(st, su, 'AUDIT', row.year + '-01-01');
        cUpdate_(ctx, ar);
        newCodes.push(ar.code);
        writes.push({ sheet: 'Audits', mode: 'update', row: ar });
      });
      cUpdate_(ctx, row);
      var nowIso = isoVN_(now_());
      row.rev = pad2_(Number(row.rev || 0) + 1);
      row.state = 'APPROVED'; row.approved_at = nowIso; row.approved_by = ctx.user.user_id; row.approve_note = note;
      var hist = Array.isArray(row.history_json) ? row.history_json.slice() : [];
      hist.push({ rev: row.rev, at: nowIso, by: ctx.user.user_id, note: note, reopen_reason: row.reopen_reason || '', submitted_by: row.submitted_by || '',
        audits: liveAudits_(row.program_id).length });
      row.history_json = hist;
      writes.unshift({ sheet: 'AuditPrograms', mode: 'update', row: row });
      return {
        writes: writes, state: su, result: auditProgResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'AUD_PROG', entity_id: row.program_id, before_json: { state: 'IN_REVIEW' },
          after_json: { state: 'APPROVED', code: row.code, rev: row.rev, new_codes: newCodes } }
      };
    }
  });
}

function precheckAuditReturn_(ctx) {
  var pg = loadAuditProgram_(ctx, (ctx.req.payload || {}).program_id);
  if (!canApproveProgram_(ctx.user, pg)) throw apiError_('FORBIDDEN');
  if (pg.state !== 'IN_REVIEW') throw stateInvalid_();
}

/** iaudit.program.return {program_id, reason} (PIN): Chờ duyệt → Nháp kèm lý do */
function auditProgramReturn_(ctx) {
  var p = ctx.req.payload || {};
  var pg = loadAuditProgram_(ctx, p.program_id);
  if (!canApproveProgram_(ctx.user, pg)) throw apiError_('FORBIDDEN');
  if (pg.state !== 'IN_REVIEW') throw stateInvalid_();
  var reason = reasonText_(p, 'reason', true, 1000);
  return auditProgramMove_(ctx, pg, 'IN_REVIEW', 'DRAFT', function (row) {
    row.returned_at = isoVN_(now_()); row.returned_by = ctx.user.user_id; row.return_reason = reason;
  }, reason);
}

function precheckAuditReopen_(ctx) {
  var pg = loadAuditProgram_(ctx, (ctx.req.payload || {}).program_id);
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  if (pg.state !== 'APPROVED') throw stateInvalid_();
}

/** iaudit.program.reopen {program_id, reason} (PIN): sửa chương trình đã duyệt → Nháp (gửi duyệt lại thành lần mới) */
function auditProgramReopen_(ctx) {
  var p = ctx.req.payload || {};
  var pg = loadAuditProgram_(ctx, p.program_id);
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  if (pg.state !== 'APPROVED') throw stateInvalid_();
  var reason = reasonText_(p, 'reason', true, 1000);
  return auditProgramMove_(ctx, pg, 'APPROVED', 'DRAFT', function (row) {
    row.reopened_at = isoVN_(now_()); row.reopened_by = ctx.user.user_id; row.reopen_reason = reason;
    row.submitted_at = ''; row.submitted_by = ''; row.return_reason = '';
  }, reason);
}

function auditProgramMove_(ctx, pg, from, to, fill, reason) {
  return executeWrite_(ctx, {
    entity_type: 'AUD_PROG', entity_id: pg.program_id,
    build: function () {
      var row = lockedRow_(ctx, 'AuditPrograms', 'program_id', pg.program_id, 'AUD_PROG', true);
      if (row.state !== from) throw stateInvalid_();
      cUpdate_(ctx, row);
      row.state = to;
      fill(row);
      return {
        writes: [{ sheet: 'AuditPrograms', mode: 'update', row: row }], result: auditProgResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'AUD_PROG', entity_id: row.program_id, before_json: { state: from }, after_json: { state: to, code: row.code }, reason: reason }
      };
    }
  });
}

/** Đợt đã bắt đầu đánh giá (không hủy chương trình được nữa) */
function auditStarted_(a) { return a.state === 'IN_PROGRESS' || a.state === 'REPORTED' || a.state === 'CLOSED'; }

function precheckAuditProgCancel_(ctx) {
  var pg = loadAuditProgram_(ctx, (ctx.req.payload || {}).program_id);
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  if (pg.state === 'CANCELLED') throw stateInvalid_();
  if (liveAudits_(pg.program_id).some(auditStarted_)) throw validationError_([fieldError_('audits', 'AUDIT_STARTED')]);
}

/** iaudit.program.cancel {program_id, reason} (PIN): hủy chương trình (lập nhầm, dữ liệu thử) — mọi đợt chưa đánh giá cũng hủy */
function auditProgramCancel_(ctx) {
  var p = ctx.req.payload || {};
  precheckAuditProgCancel_(ctx);
  var reason = reasonText_(p, 'reason', true, 1000);
  return executeWrite_(ctx, {
    entity_type: 'AUD_PROG', entity_id: p.program_id,
    build: function () {
      var row = lockedRow_(ctx, 'AuditPrograms', 'program_id', p.program_id, 'AUD_PROG', true);
      if (row.state === 'CANCELLED') throw stateInvalid_();
      var audits = liveAudits_(row.program_id);
      if (audits.some(auditStarted_)) throw validationError_([fieldError_('audits', 'AUDIT_STARTED')]);
      var before = row.state;
      var nowIso = isoVN_(now_());
      cUpdate_(ctx, row);
      row.state = 'CANCELLED'; row.cancelled_at = nowIso; row.cancelled_by = ctx.user.user_id; row.cancel_reason = reason;
      var writes = [{ sheet: 'AuditPrograms', mode: 'update', row: row }];
      audits.forEach(function (a) {
        var ar = clone_(a); delete ar.__row;
        cUpdate_(ctx, ar);
        ar.state = 'CANCELLED'; ar.cancelled_at = nowIso; ar.cancelled_by = ctx.user.user_id; ar.cancel_reason = reason;
        if (!ar.code) ar.archived_at = nowIso; // đợt chưa có mã: bỏ hẳn khỏi app
        writes.push({ sheet: 'Audits', mode: 'update', row: ar });
      });
      return {
        writes: writes, result: auditProgResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'AUD_PROG', entity_id: row.program_id, before_json: { state: before }, after_json: { state: 'CANCELLED', code: row.code, audits: audits.length }, reason: reason }
      };
    }
  });
}

/* ---------------- iaudit.save (đợt đánh giá + kế hoạch đợt) ---------------- */

/**
 * iaudit.save {audit_id, program_id (khi thêm), dept_code, title_vi/zh, plan_month YYYY-MM, clauses [clause_id], audit_date?, time_text?,
 * place_text?, auditee_text?, team [{u?, n, d?, r: L | M}]?, note_vi/zh?}. expected_version 0 = thêm đợt vào chương trình (Nháp, Thư ký ISO);
 * khác 0 = sửa đợt chưa đánh giá. Bộ phận, nội dung, tháng, điều khoản chỉ đổi khi chương trình là Nháp (Thư ký ISO); kế hoạch đợt — Thư ký
 * ISO, trưởng đoàn.
 */
function auditSave_(ctx) {
  ensureIauditSchema_();
  var p = ctx.req.payload || {};
  var u = ctx.user;
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  if (!isUuidV4_(p.audit_id)) throw validationError_([fieldError_('audit_id', 'ID_INVALID')]);
  var x = isNew ? null : loadAudit_(ctx, p.audit_id);
  var a = x ? x.a : null;
  var pg = x ? x.pg : loadAuditProgram_(ctx, p.program_id);
  if (pg.state === 'CANCELLED') throw stateInvalid_();
  if (a && a.state !== 'PLANNED' && a.state !== 'READY') throw stateInvalid_();
  var errs = [];
  var stds = auditStdsOf_(pg);
  var byId = auditClauseMap_();
  var dept = p.dept_code === undefined ? (a ? a.dept_code : '') : trimStr_(p.dept_code);
  if (!dept) errs.push(fieldError_('dept_code', 'REQUIRED'));
  else if (!findOne_('Depts', 'dept_code', dept)) errs.push(fieldError_('dept_code', 'DEPT_UNKNOWN'));
  else if (!inScopeDept_(dept)) errs.push(fieldError_('dept_code', 'APP_SCOPE'));
  var month = p.plan_month === undefined ? (a ? String(a.plan_month || '') : '') : trimStr_(p.plan_month);
  if (!month) errs.push(fieldError_('plan_month', 'REQUIRED'));
  else if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) errs.push(fieldError_('plan_month', 'INVALID_VALUE'));
  else if (Number(month.slice(0, 4)) !== Number(pg.year)) errs.push(fieldError_('plan_month', 'AUDIT_NOT_IN_YEAR'));
  var clauses = p.clauses === undefined ? (a ? a.clauses_json || [] : []) : auditClausesIn_(errs, p.clauses, stds, byId);
  if (p.clauses === undefined && !clauses.length) errs.push(fieldError_('clauses', 'REQUIRED'));
  ['title_vi', 'title_zh'].forEach(function (k) { capaTextLen_(errs, p, k, 300); });
  ['note_vi', 'note_zh'].forEach(function (k) { capaTextLen_(errs, p, k, 2000); });
  requireOneLang_(errs, p, a, 'title');
  var date = capaDateIn_(errs, p, 'audit_date');
  if (date === undefined) date = a ? String(a.audit_date || '') : '';
  if (date && Number(date.slice(0, 4)) !== Number(pg.year)) errs.push(fieldError_('audit_date', 'AUDIT_NOT_IN_YEAR'));
  var tx = {};
  [['time_text', 100], ['place_text', 200], ['auditee_text', 200]].forEach(function (f) {
    var v = p[f[0]] === undefined || p[f[0]] === null ? (a ? String(a[f[0]] || '') : '') : trimStr_(p[f[0]]);
    if (v.length > f[1]) errs.push(fieldError_(f[0], 'TOO_LONG'));
    tx[f[0]] = v;
  });
  var teamGiven = p.team !== undefined && p.team !== null;
  var team = teamGiven ? auditTeamIn_(errs, p.team, dept) : (a ? auditTeam_(a) : []);
  if (!teamGiven && a && dept && dept !== a.dept_code) auditTeamIn_(errs, team, dept); // đổi bộ phận: kiểm lại đoàn hiện có
  if (a && a.state === 'READY') {
    if (!date) errs.push(fieldError_('audit_date', 'REQUIRED'));
    if (!auditLeadOf_(team)) errs.push(fieldError_('team', 'AUDIT_NO_LEAD'));
  }
  if (errs.length) throw validationError_(errs);
  var titleChanged = function (l) { return p['title_' + l] !== undefined && p['title_' + l] !== null && trimStr_(p['title_' + l]) !== String(a['title_' + l] || ''); };
  var progChanged = isNew || dept !== a.dept_code || month !== String(a.plan_month || '') || !sameList_(clauses, a.clauses_json || []) ||
    titleChanged('vi') || titleChanged('zh');
  if (progChanged) {
    if (!isSecretary_(u)) throw apiError_('FORBIDDEN');
    if (pg.state !== 'DRAFT') throw validationError_([fieldError_('program', 'AUDIT_PROG_LOCKED')]);
    if (isNew && liveAudits_(pg.program_id).length >= AUDIT_MAX_PER_PROGRAM_) throw validationError_([fieldError_('program', 'AUDIT_TOO_MANY')]);
  } else if (!canPlanAudit_(u, a)) {
    throw apiError_('FORBIDDEN');
  }
  var tr = applyTranslations_('Audits', ['title', 'note'], p, a);
  return executeWrite_(ctx, {
    entity_type: 'AUDIT', entity_id: p.audit_id,
    build: function () {
      var row;
      if (isNew) {
        assertNewId_('Audits', 'audit_id', p.audit_id);
        var pr = findOne_('AuditPrograms', 'program_id', pg.program_id);
        if (!pr || pr.state !== 'DRAFT') throw validationError_([fieldError_('program', 'AUDIT_PROG_LOCKED')]);
        row = cNew_(ctx, {
          audit_id: p.audit_id, program_id: pg.program_id, code: '', dept_code: '', title_vi: '', title_zh: '', plan_month: '', clauses_json: [],
          state: 'PLANNED', audit_date: '', time_text: '', place_text: '', lead_user_id: '', team_json: [], auditee_text: '', note_vi: '', note_zh: '',
          ready_at: '', ready_by: '', started_at: '', started_by: '', cancelled_at: '', cancelled_by: '', cancel_reason: ''
        });
      } else {
        row = lockedRow_(ctx, 'Audits', 'audit_id', p.audit_id, 'AUDIT', true);
        if (row.state !== 'PLANNED' && row.state !== 'READY') throw stateInvalid_();
        if (progChanged) {
          var pr2 = findOne_('AuditPrograms', 'program_id', row.program_id);
          if (!pr2 || pr2.state !== 'DRAFT') throw validationError_([fieldError_('program', 'AUDIT_PROG_LOCKED')]);
        }
        cUpdate_(ctx, row);
      }
      var before = isNew ? null : { dept_code: row.dept_code, plan_month: row.plan_month, clauses: (row.clauses_json || []).length, audit_date: row.audit_date,
        lead_user_id: row.lead_user_id, team: auditTeam_(row).length };
      var deptMoved = !isNew && row.dept_code !== dept;
      row.dept_code = dept; row.plan_month = month; row.clauses_json = clauses; row.audit_date = date; row.team_json = team;
      var lead = auditLeadOf_(team);
      row.lead_user_id = lead && lead.u ? lead.u : '';
      Object.keys(tx).forEach(function (k) { row[k] = tx[k]; });
      Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
      row.i18n_meta = Object.assign({}, row.i18n_meta || {}, tr.meta);
      var writes = [{ sheet: 'Audits', mode: isNew ? 'insert' : 'update', row: row }];
      if (deptMoved) {
        // Đổi bộ phận được đánh giá: ghi lại câu hỏi (không tăng record_version) để người của bộ phận mới nhận đủ checklist
        auditChecksOf_(row.audit_id).forEach(function (c) { var cr = clone_(c); delete cr.__row; writes.push({ sheet: 'AuditChecks', mode: 'update', row: cr }); });
      }
      return {
        writes: writes, result: auditResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'AUDIT', entity_id: row.audit_id, before_json: before,
          after_json: { code: row.code || undefined, program: pg.code, dept_code: dept, plan_month: month, clauses: clauses.length, audit_date: date || undefined,
            lead_user_id: row.lead_user_id || undefined, team: team.length, created: isNew } }
      };
    }
  });
}

/** iaudit.cancel {audit_id, reason}: bỏ đợt khỏi chương trình Nháp (Thư ký ISO). Đợt chưa có mã: bỏ hẳn; đã có mã: Đã hủy (lý do bắt buộc) */
function auditCancel_(ctx) {
  var p = ctx.req.payload || {};
  var x = loadAudit_(ctx, p.audit_id);
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  if (x.a.state !== 'PLANNED' && x.a.state !== 'READY') throw stateInvalid_();
  if (x.pg.state !== 'DRAFT') throw validationError_([fieldError_('program', 'AUDIT_PROG_LOCKED')]);
  var reason = reasonText_(p, 'reason', !!x.a.code, 1000);
  return executeWrite_(ctx, {
    entity_type: 'AUDIT', entity_id: x.a.audit_id,
    build: function () {
      var row = lockedRow_(ctx, 'Audits', 'audit_id', x.a.audit_id, 'AUDIT', true);
      if (row.state !== 'PLANNED' && row.state !== 'READY') throw stateInvalid_();
      var pr = findOne_('AuditPrograms', 'program_id', row.program_id);
      if (!pr || pr.state !== 'DRAFT') throw validationError_([fieldError_('program', 'AUDIT_PROG_LOCKED')]);
      var nowIso = isoVN_(now_());
      cUpdate_(ctx, row);
      row.state = 'CANCELLED'; row.cancelled_at = nowIso; row.cancelled_by = ctx.user.user_id; row.cancel_reason = reason;
      if (!row.code) row.archived_at = nowIso;
      return {
        writes: [{ sheet: 'Audits', mode: 'update', row: row }], result: auditResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'AUDIT', entity_id: row.audit_id, before_json: { state: x.a.state }, after_json: { state: 'CANCELLED', code: row.code || undefined, removed: !row.code }, reason: reason }
      };
    }
  });
}

/* ---------------- Chốt kế hoạch, bắt đầu đánh giá ---------------- */

/** Điều kiện chốt kế hoạch: chương trình đã duyệt, đợt có mã, ngày đánh giá, trưởng đoàn, ít nhất một câu hỏi */
function auditReadyErrors_(a, pg) {
  var errs = [];
  if (pg.state !== 'APPROVED' || !a.code) errs.push(fieldError_('program', 'AUDIT_PROG_NOT_APPROVED'));
  if (!a.audit_date) errs.push(fieldError_('audit_date', 'REQUIRED'));
  if (!auditLeadOf_(auditTeam_(a))) errs.push(fieldError_('team', 'AUDIT_NO_LEAD'));
  if (!auditChecksOf_(a.audit_id).length) errs.push(fieldError_('checks', 'AUDIT_NO_CHECKS'));
  return errs;
}

/** iaudit.ready {audit_id} (Đã lập kế hoạch → chốt, Gmail báo đoàn + trưởng bộ phận trước audit_notice_days ngày) | {audit_id, undo: true} */
function auditReady_(ctx) {
  var p = ctx.req.payload || {};
  var x = loadAudit_(ctx, p.audit_id);
  if (!canPlanAudit_(ctx.user, x.a)) throw apiError_('FORBIDDEN');
  var undo = p.undo === true;
  var from = undo ? 'READY' : 'PLANNED';
  if (x.a.state !== from) throw stateInvalid_();
  if (!undo) {
    var errs = auditReadyErrors_(x.a, x.pg);
    if (errs.length) throw validationError_(errs);
  }
  return executeWrite_(ctx, {
    entity_type: 'AUDIT', entity_id: x.a.audit_id,
    build: function () {
      var row = lockedRow_(ctx, 'Audits', 'audit_id', x.a.audit_id, 'AUDIT', true);
      if (row.state !== from) throw stateInvalid_();
      if (!undo) {
        var e2 = auditReadyErrors_(row, findOne_('AuditPrograms', 'program_id', row.program_id) || x.pg);
        if (e2.length) throw validationError_(e2);
      }
      cUpdate_(ctx, row);
      if (undo) { row.state = 'PLANNED'; row.ready_at = ''; row.ready_by = ''; }
      else { row.state = 'READY'; row.ready_at = isoVN_(now_()); row.ready_by = ctx.user.user_id; }
      return {
        writes: [{ sheet: 'Audits', mode: 'update', row: row }], result: auditResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'AUDIT', entity_id: row.audit_id, before_json: { state: from }, after_json: { state: row.state, code: row.code, audit_date: row.audit_date } }
      };
    }
  });
}

/** iaudit.start {audit_id} (Đã chốt kế hoạch → Đang đánh giá, từ ngày đánh giá) | {audit_id, undo: true} (khi chưa ghi kết quả nào) */
function auditStart_(ctx) {
  var p = ctx.req.payload || {};
  var x = loadAudit_(ctx, p.audit_id);
  if (!canRecordAudit_(ctx.user, x.a)) throw apiError_('FORBIDDEN');
  var undo = p.undo === true;
  var from = undo ? 'IN_PROGRESS' : 'READY';
  if (x.a.state !== from) throw stateInvalid_();
  if (!undo && String(x.a.audit_date || '') > todayVN_()) throw validationError_([fieldError_('audit_date', 'AUDIT_NOT_YET')]);
  if (undo && auditChecksOf_(x.a.audit_id).some(function (c) { return !!c.result; })) throw validationError_([fieldError_('checks', 'AUDIT_HAS_RESULTS')]);
  return executeWrite_(ctx, {
    entity_type: 'AUDIT', entity_id: x.a.audit_id,
    build: function () {
      var row = lockedRow_(ctx, 'Audits', 'audit_id', x.a.audit_id, 'AUDIT', true);
      if (row.state !== from) throw stateInvalid_();
      cUpdate_(ctx, row);
      if (undo) { row.state = 'READY'; row.started_at = ''; row.started_by = ''; }
      else { row.state = 'IN_PROGRESS'; row.started_at = isoVN_(now_()); row.started_by = ctx.user.user_id; }
      return {
        writes: [{ sheet: 'Audits', mode: 'update', row: row }], result: auditResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'AUDIT', entity_id: row.audit_id, before_json: { state: from }, after_json: { state: row.state, code: row.code } }
      };
    }
  });
}

/* ---------------- Checklist ---------------- */

/** Thêm / sửa câu hỏi: đợt chưa đánh giá — Thư ký ISO, trưởng đoàn; đang đánh giá — cả người trong đoàn */
function canEditChecks_(u, a) {
  if (a.state === 'PLANNED' || a.state === 'READY') return canPlanAudit_(u, a);
  return a.state === 'IN_PROGRESS' && canRecordAudit_(u, a);
}

function auditCheckClauseIn_(errs, f, v, a) {
  v = trimStr_(v || '');
  if (v && (a.clauses_json || []).indexOf(v) < 0) errs.push(fieldError_(f, 'AUDIT_CLAUSE_NOT_IN'));
  return v;
}

/** iaudit.check.save {check_id, audit_id (khi thêm), clause_id? (điều khoản của đợt, trống = chung), question_vi/zh} | {check_id, remove: true} */
function auditCheckSave_(ctx) {
  ensureIauditSchema_();
  var p = ctx.req.payload || {};
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  if (!isUuidV4_(p.check_id)) throw validationError_([fieldError_('check_id', 'ID_INVALID')]);
  var cur = null;
  if (!isNew) {
    cur = findOne_('AuditChecks', 'check_id', p.check_id);
    if (!cur || cur.archived_at) throw apiError_('NOT_FOUND');
  }
  var x = loadAudit_(ctx, cur ? cur.audit_id : p.audit_id);
  if (['PLANNED', 'READY', 'IN_PROGRESS'].indexOf(x.a.state) < 0) throw stateInvalid_();
  if (!canEditChecks_(ctx.user, x.a)) throw apiError_('FORBIDDEN');
  var remove = !isNew && p.remove === true;
  if (remove && cur.result) throw validationError_([fieldError_('result', 'AUDIT_HAS_RESULTS')]);
  var errs = [];
  var clause = '';
  if (!remove) {
    clause = p.clause_id === undefined ? (cur ? String(cur.clause_id || '') : '') : auditCheckClauseIn_(errs, 'clause_id', p.clause_id, x.a);
    ['question_vi', 'question_zh'].forEach(function (k) { capaTextLen_(errs, p, k, 1000); });
    requireOneLang_(errs, p, cur, 'question');
    if (isNew && auditChecksOf_(x.a.audit_id).length >= AUDIT_MAX_CHECKS_) errs.push(fieldError_('checks', 'AUDIT_CHECKS_MAX'));
  }
  if (errs.length) throw validationError_(errs);
  var tr = remove ? { values: {}, meta: {} } : applyTranslations_('AuditChecks', ['question'], p, cur);
  return executeWrite_(ctx, {
    entity_type: 'AUD_CHK', entity_id: p.check_id,
    build: function () {
      var row;
      if (isNew) {
        assertNewId_('AuditChecks', 'check_id', p.check_id);
        var seq = auditChecksOf_(x.a.audit_id).reduce(function (m, c) { return Math.max(m, Number(c.seq) || 0); }, 0) + 1;
        row = cNew_(ctx, { check_id: p.check_id, audit_id: x.a.audit_id, seq: seq, clause_id: '', question_vi: '', question_zh: '', result: '',
          evidence_vi: '', evidence_zh: '', checked_at: '', checked_by: '' });
      } else {
        row = lockedRow_(ctx, 'AuditChecks', 'check_id', p.check_id, 'AUD_CHK', true);
        if (remove && row.result) throw validationError_([fieldError_('result', 'AUDIT_HAS_RESULTS')]);
        cUpdate_(ctx, row);
      }
      if (remove) row.archived_at = isoVN_(now_());
      else {
        row.clause_id = clause;
        Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
        row.i18n_meta = Object.assign({}, row.i18n_meta || {}, tr.meta);
      }
      return {
        writes: [{ sheet: 'AuditChecks', mode: isNew ? 'insert' : 'update', row: row }], result: auditCheckResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'AUD_CHK', entity_id: row.check_id, after_json: { audit: x.a.code || x.a.audit_id, seq: row.seq, clause_id: row.clause_id, removed: remove || undefined, created: isNew } }
      };
    }
  });
}

/**
 * iaudit.check.add {audit_id, lines [{check_id, clause_id?, question_vi, question_zh}]} — thêm nhiều câu hỏi một lần (gợi ý từ điều khoản và
 * biểu liên quan, app soạn sẵn hai thứ tiếng). Dòng thiếu một thứ tiếng: dịch máy ở nền.
 */
function auditCheckAdd_(ctx) {
  ensureIauditSchema_();
  var p = ctx.req.payload || {};
  var x = loadAudit_(ctx, p.audit_id);
  if (['PLANNED', 'READY', 'IN_PROGRESS'].indexOf(x.a.state) < 0) throw stateInvalid_();
  if (!canEditChecks_(ctx.user, x.a)) throw apiError_('FORBIDDEN');
  var lines = Array.isArray(p.lines) ? p.lines : [];
  var errs = [];
  if (!lines.length) errs.push(fieldError_('lines', 'REQUIRED'));
  var have = auditChecksOf_(x.a.audit_id);
  if (have.length + lines.length > AUDIT_MAX_CHECKS_) errs.push(fieldError_('checks', 'AUDIT_CHECKS_MAX'));
  var ids = {};
  var clean = lines.map(function (l, i) {
    l = l || {};
    if (!isUuidV4_(l.check_id) || ids[l.check_id]) errs.push(fieldError_('lines.' + i + '.check_id', 'ID_INVALID'));
    ids[l.check_id] = 1;
    var c = auditCheckClauseIn_(errs, 'lines.' + i + '.clause_id', l.clause_id, x.a);
    var vi = trimStr_(l.question_vi || ''), zh = trimStr_(l.question_zh || '');
    if (!vi && !zh) errs.push(fieldError_('lines.' + i + '.question', 'REQUIRED_ONE_LANGUAGE'));
    if (vi.length > 1000 || zh.length > 1000) errs.push(fieldError_('lines.' + i + '.question', 'TOO_LONG'));
    return { check_id: l.check_id, clause_id: c, question_vi: vi, question_zh: zh };
  });
  if (errs.length) throw validationError_(errs);
  var trs;
  var prevDefer = MT_DEFER_;
  MT_DEFER_ = true; // nhiều dòng: không dịch máy khi lưu (trigger nền dịch sau)
  try {
    trs = clean.map(function (l) { return applyTranslations_('AuditChecks', ['question'], l, null); });
  } finally { MT_DEFER_ = prevDefer; }
  return executeWrite_(ctx, {
    entity_type: 'AUDIT', entity_id: x.a.audit_id,
    build: function () {
      var cur = auditChecksOf_(x.a.audit_id);
      if (cur.length + clean.length > AUDIT_MAX_CHECKS_) throw validationError_([fieldError_('checks', 'AUDIT_CHECKS_MAX')]);
      var seq = cur.reduce(function (m, c) { return Math.max(m, Number(c.seq) || 0); }, 0);
      var writes = clean.map(function (l, i) {
        assertNewId_('AuditChecks', 'check_id', l.check_id);
        seq++;
        var row = cNew_(ctx, { check_id: l.check_id, audit_id: x.a.audit_id, seq: seq, clause_id: l.clause_id, question_vi: '', question_zh: '', result: '',
          evidence_vi: '', evidence_zh: '', checked_at: '', checked_by: '' });
        Object.keys(trs[i].values).forEach(function (k) { row[k] = trs[i].values[k]; });
        row.i18n_meta = trs[i].meta;
        return { sheet: 'AuditChecks', mode: 'insert', row: row };
      });
      return {
        writes: writes, result: { entity_type: 'AUDIT', entity_id: x.a.audit_id, added: writes.length, records: writes.map(function (w) { return projectRow_(ctx, w.row); }) },
        audit: { entity_type: 'AUDIT', entity_id: x.a.audit_id, after_json: { checks_added: writes.length, code: x.a.code || undefined } }
      };
    }
  });
}

/** iaudit.check.record {check_id, result C | NC | OBS | NA | '' (bỏ kết quả), evidence_vi/zh} — đợt đang đánh giá; Không phù hợp / Cần cải
 *  tiến phải ghi bằng chứng. Bằng chứng không dịch máy. */
function auditCheckRecord_(ctx) {
  ensureIauditSchema_();
  var p = ctx.req.payload || {};
  if (!isUuidV4_(p.check_id)) throw validationError_([fieldError_('check_id', 'ID_INVALID')]);
  var c = findOne_('AuditChecks', 'check_id', p.check_id);
  if (!c || c.archived_at) throw apiError_('NOT_FOUND');
  var x = loadAudit_(ctx, c.audit_id);
  if (!canRecordAudit_(ctx.user, x.a)) throw apiError_('FORBIDDEN');
  if (x.a.state !== 'IN_PROGRESS') throw stateInvalid_();
  var errs = [];
  var result = String(p.result || '');
  if (result && AUDIT_RESULTS_.indexOf(result) < 0) errs.push(fieldError_('result', 'INVALID_VALUE'));
  var vi = p.evidence_vi === undefined || p.evidence_vi === null ? String(c.evidence_vi || '') : trimStr_(p.evidence_vi);
  var zh = p.evidence_zh === undefined || p.evidence_zh === null ? String(c.evidence_zh || '') : trimStr_(p.evidence_zh);
  if (vi.length > 3000 || zh.length > 3000) errs.push(fieldError_('evidence', 'TOO_LONG'));
  if ((result === 'NC' || result === 'OBS') && !vi && !zh) errs.push(fieldError_('evidence', 'AUDIT_EVIDENCE'));
  // 4b: câu đã có phát hiện chỉ đổi sang kết quả hợp với loại phát hiện (bỏ phát hiện trước)
  var fnd = auditFindingsOf_(c.audit_id).filter(function (f) { return f.check_id === c.check_id; })[0];
  if (fnd && !findingTypeFits_(result, fnd.ftype)) errs.push(fieldError_('result', 'AUDIT_HAS_FINDING'));
  if (errs.length) throw validationError_(errs);
  return executeWrite_(ctx, {
    entity_type: 'AUD_CHK', entity_id: c.check_id,
    build: function () {
      var row = lockedRow_(ctx, 'AuditChecks', 'check_id', c.check_id, 'AUD_CHK', true);
      var ar = findOne_('Audits', 'audit_id', row.audit_id);
      if (!ar || ar.state !== 'IN_PROGRESS') throw stateInvalid_();
      var before = { result: row.result };
      cUpdate_(ctx, row);
      row.result = result; row.evidence_vi = vi; row.evidence_zh = zh;
      row.checked_at = result ? isoVN_(now_()) : ''; row.checked_by = result ? ctx.user.user_id : '';
      return {
        writes: [{ sheet: 'AuditChecks', mode: 'update', row: row }], result: auditCheckResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'AUD_CHK', entity_id: row.check_id, before_json: before, after_json: { audit: x.a.code, seq: row.seq, result: result } }
      };
    }
  });
}

/* ---------------- Đồng bộ (13_sync.js) ---------------- */

function syncAuditMap_(aux) {
  if (!aux.audits) {
    aux.audits = {};
    if (sheetExists_('Audits')) aux.tc.rows('Audits').forEach(function (a) { aux.audits[a.audit_id] = a; });
  }
  return aux.audits;
}

function syncAuditProgVisible_(ctx, pg) { return !!pg && !pg.archived_at && auditProgVisible_(ctx.user, pg); }
function syncAuditVisible_(ctx, a) { return !!a && !a.archived_at && auditVisible_(ctx.user, a); }

/* ---------------- Gmail nhắc hạn (19_mail.js) ---------------- */

/** Việc cần nhắc của đánh giá nội bộ (thêm vào mailDesired_): AUDIT_SOON — đợt đã lên kế hoạch có ngày đánh giá trong audit_notice_days
 *  ngày tới → trưởng đoàn, người trong đoàn, trưởng bộ phận được đánh giá (một lần cho mỗi ngày đánh giá; dời ngày thì báo lại) */
function auditMailNotes_(mc, out) {
  if (!sheetExists_('Audits')) return;
  var today = mc.today;
  var days = Math.max(1, Number(setting_('audit_notice_days')) || 7);
  var progs = {};
  if (sheetExists_('AuditPrograms')) readRows_('AuditPrograms').forEach(function (pg) { progs[pg.program_id] = pg; });
  readRows_('Audits').forEach(function (a) {
    if (a.archived_at || !inScopeDept_(a.dept_code) || (a.state !== 'PLANNED' && a.state !== 'READY') || !isDateStr_(String(a.audit_date || ''))) return;
    var pg = progs[a.program_id];
    if (!pg || pg.state === 'CANCELLED' || !a.code) return;
    var dr = daysBetweenIso_(today, String(a.audit_date));
    if (dr < 0 || dr > days) return;
    var to = [];
    auditTeam_(a).forEach(function (t) { if (t.u && mc.byId[t.u] && mc.byId[t.u].active && to.indexOf(t.u) < 0) to.push(t.u); });
    var d = mc.depts[a.dept_code];
    var h = d && d.head_user_id ? mc.byId[d.head_user_id] : null;
    if (h && h.active && to.indexOf(h.user_id) < 0) to.push(h.user_id);
    if (!to.length) to = mc.secretaries.map(function (u) { return u.user_id; });
    var lead = auditLeadOf_(auditTeam_(a));
    out.push({
      kind: 'AUDIT_SOON', entity_type: 'AUDIT', entity_id: a.audit_id, stage: 'D:' + a.audit_date, due_date: String(a.audit_date), to: to, queue: true,
      detail: { code: a.code, name: biText_(a.title_vi, a.title_zh), dept_code: a.dept_code, dept: deptName_(mc, a.dept_code), path: '/audit/' + a.audit_id,
        due: String(a.audit_date), time: a.time_text || '', place: a.place_text || '', lead: lead ? lead.n : '',
        team: auditTeam_(a).filter(function (t) { return t.r !== 'L'; }).map(function (t) { return t.n; }).join(', '), ready: a.state === 'READY' }
    });
  });
}

/* ---------------- Báo cáo (27_reports.js, loại AUDIT) ---------------- */

var AUDIT_FORMS_ = ['PLAN', 'CHECKLIST', 'REPORT'];
var AUDIT_FORM_SETTING_ = { PROGRAM: 'audit_program_form_code', PLAN: 'audit_plan_form_code', CHECKLIST: 'audit_checklist_form_code', REPORT: 'audit_report_form_code' };
var AUDIT_FORM_SLUG_ = { PROGRAM: 'chuong-trinh-danh-gia-noi-bo', PLAN: 'ke-hoach-danh-gia', CHECKLIST: 'checklist-danh-gia', REPORT: 'bao-cao-danh-gia' };

/** Nhãn điều khoản: ISO 9001 chỉ số điều khoản (như trước), chuẩn khác có tên chuẩn đứng trước — "ISO 14001 · 6.1.2", "BRCGS · …" */
function auditClauseLabel_(cl) {
  return cl ? (cl.std === 'ISO9001' ? '' : (STD_SHORT_[cl.std] || cl.std) + ' · ') + cl.key : '';
}

function reportAuditRow_(a, dir, clMap, depts, today) {
  var team = auditTeam_(a);
  var lead = auditLeadOf_(team);
  var d = depts[a.dept_code] || {};
  return {
    audit_id: a.audit_id, code: a.code || '', dept_code: a.dept_code, dept_vi: d.name_vi || '', dept_zh: d.name_zh || '', title_vi: a.title_vi || '',
    title_zh: a.title_zh || '', plan_month: String(a.plan_month || ''), audit_date: String(a.audit_date || ''), time_text: a.time_text || '',
    place_text: a.place_text || '', auditee_text: a.auditee_text || '', note_vi: a.note_vi || '', note_zh: a.note_zh || '', state: a.state,
    late: auditLate_(a, today), lead: lead ? lead.n : '', team: team.map(function (t) { return { n: t.n, d: t.d || '', r: t.r }; }),
    clauses: (a.clauses_json || []).map(function (id) {
      var c = clMap[id];
      return c ? { id: id, std: c.std, key: c.key, name_vi: c.name_vi || '', name_zh: c.name_zh || '' } : { id: id, std: '', key: id, name_vi: '', name_zh: '' };
    }),
    ready_by: reportUserName_(dir, a.ready_by), cancel_reason: a.cancel_reason || ''
  };
}

/** Báo cáo AUDIT: {program_id} → chương trình năm (BM-ISO-03-01); {audit_id, form PLAN | CHECKLIST | REPORT} → kế hoạch đánh giá / checklist /
 *  báo cáo đánh giá (4b, BM-ISO-03-04) của một đợt */
function reportAudit_(ctx, f, today) {
  ensureIauditSchema_();
  var dir = userDirectory_();
  var clMap = auditClauseMap_();
  var depts = {};
  readRows_('Depts').forEach(function (d) { depts[d.dept_code] = d; });
  if (f.audit_id) {
    var a = findOne_('Audits', 'audit_id', f.audit_id);
    if (!a || a.archived_at) throw validationError_([fieldError_('filters.audit_id', 'NOT_FOUND')]);
    if (!auditVisible_(ctx.user, a)) throw apiError_('FORBIDDEN');
    var pg = findOne_('AuditPrograms', 'program_id', a.program_id) || {};
    var r = reportAuditRow_(a, dir, clMap, depts, today);
    r.program = { code: pg.code || '', year: pg.year || '', rev: pg.rev || '', state: pg.state || '' };
    var checks = auditChecksOf_(a.audit_id).map(function (c) {
      var cl = clMap[c.clause_id];
      return { seq: Number(c.seq) || 0, clause: auditClauseLabel_(cl), clause_name_vi: cl ? cl.name_vi || '' : '', clause_name_zh: cl ? cl.name_zh || '' : '',
        question_vi: c.question_vi || '', question_zh: c.question_zh || '', result: c.result || '', evidence_vi: c.evidence_vi || '', evidence_zh: c.evidence_zh || '',
        checked_by: reportUserName_(dir, c.checked_by) };
    });
    var cnt = { total: checks.length, C: 0, NC: 0, OBS: 0, NA: 0, none: 0 };
    checks.forEach(function (c) { if (c.result) cnt[c.result]++; else cnt.none++; });
    if (f.form === 'REPORT') {
      var rd = reportAuditReportData_(a, r, dir, clMap, cnt);
      return { data: { one: r, checks: checks, counts: cnt, findings: rd.findings, by_type: rd.by_type, capa_need: rd.capa_need, capa_closed: rd.capa_closed },
        rows: rd.findings.length || 1, tiles: rd.tiles };
    }
    var tiles = f.form === 'CHECKLIST' ? [
      { k: 'rpt.t.aud_questions', v: String(cnt.total) },
      { k: 'aud.result.C', v: String(cnt.C), tone: cnt.C ? 'green' : '' },
      { k: 'aud.result.NC', v: String(cnt.NC), tone: cnt.NC ? 'red' : '' },
      { k: 'aud.result.OBS', v: String(cnt.OBS), tone: cnt.OBS ? 'amber' : '' },
      { k: 'rpt.t.aud_unrecorded', v: String(cnt.none), tone: cnt.none && a.state !== 'PLANNED' && a.state !== 'READY' ? 'amber' : '' }
    ] : [
      { k: 'rpt.t.aud_date', v: r.audit_date ? fmtDateVN_(r.audit_date) : '—', tone: r.late ? 'red' : '' },
      { k: 'rpt.t.aud_dept', v: r.dept_code },
      { k: 'rpt.t.aud_lead', v: r.lead || '—', tone: r.lead ? '' : 'amber' },
      { k: 'rpt.t.aud_state', v: lab_('aud.state.' + r.state), tone: r.state === 'CANCELLED' ? 'muted' : r.late ? 'red' : r.state === 'PLANNED' ? 'amber' : 'navy' }
    ];
    return { data: { one: r, checks: checks, counts: cnt }, rows: checks.length || 1, tiles: tiles };
  }
  var pg2 = findOne_('AuditPrograms', 'program_id', f.program_id);
  if (!pg2 || pg2.archived_at) throw validationError_([fieldError_('filters.program_id', 'NOT_FOUND')]);
  if (!auditProgVisible_(ctx.user, pg2)) throw apiError_('FORBIDDEN');
  var all = liveAudits_(pg2.program_id).concat(findAll_('Audits', 'program_id', pg2.program_id).filter(function (x) { return !x.archived_at && x.state === 'CANCELLED' && x.code; }));
  var rows = all.filter(function (x) { return inScopeDept_(x.dept_code); }).map(function (x) { return reportAuditRow_(x, dir, clMap, depts, today); })
    .sort(function (x, y) { return String(x.plan_month).localeCompare(String(y.plan_month)) || String(x.code || '~').localeCompare(String(y.code || '~')); });
  var cov = auditCoverageOf_(pg2, liveAudits_(pg2.program_id)).map(function (c) {
    return { std: c.std, key: c.key, group_vi: c.clause.group_vi || '', group_zh: c.clause.group_zh || '', name_vi: c.clause.name_vi || '', name_zh: c.clause.name_zh || '',
      state: c.state, na: c.na, audits: c.audits.map(function (x) { return x.code || '#'; }).filter(function (x) { return x; }) };
  });
  var byStd = {};
  auditStdsOf_(pg2).forEach(function (s) {
    var list = cov.filter(function (c) { return c.std === s; });
    byStd[s] = { total: list.length, audit: list.filter(function (c) { return c.state === 'AUDIT'; }).length, na: list.filter(function (c) { return c.state === 'NA'; }).length,
      missing: list.filter(function (c) { return c.state === 'MISSING'; }).length };
  });
  var live = rows.filter(function (x) { return x.state !== 'CANCELLED'; });
  var tiles = [
    { k: 'rpt.t.aud_count', v: String(live.length) },
    { k: 'rpt.t.aud_state_prog', v: lab_('aud.prog.state.' + pg2.state) + (pg2.rev ? ' · ' + lab_('aud.rev_n', { N: pg2.rev }) : ''),
      tone: pg2.state === 'APPROVED' ? 'green' : pg2.state === 'CANCELLED' ? 'muted' : 'amber' }
  ];
  auditStdsOf_(pg2).forEach(function (s) {
    var b = byStd[s];
    tiles.push({ k: 'rpt.t.aud_cov_' + s, v: (b.audit + b.na) + '/' + b.total, tone: b.missing ? 'red' : 'green' });
  });
  var lateN = live.filter(function (x) { return x.late; }).length;
  if (lateN) tiles.push({ k: 'rpt.t.aud_late', v: String(lateN), tone: 'red' });
  var hist = (Array.isArray(pg2.history_json) ? pg2.history_json : []).map(function (h) {
    return { rev: h.rev, at: String(h.at || ''), by: reportUserName_(dir, h.by), note: h.note || '', reopen_reason: h.reopen_reason || '' };
  });
  return {
    data: {
      prog: { program_id: pg2.program_id, code: pg2.code, year: pg2.year, title_vi: pg2.title_vi || '', title_zh: pg2.title_zh || '', objective_vi: pg2.objective_vi || '',
        objective_zh: pg2.objective_zh || '', scope_vi: pg2.scope_vi || '', scope_zh: pg2.scope_zh || '', stds: auditStdsOf_(pg2), state: pg2.state, rev: pg2.rev || '',
        created_by: reportUserName_(dir, pg2.created_by), approved_by: reportUserName_(dir, pg2.approved_by), approved_at: String(pg2.approved_at || ''),
        approve_note: pg2.approve_note || '', reopen_reason: pg2.state === 'APPROVED' ? '' : pg2.reopen_reason || '', history: hist },
      audits: rows, coverage: cov, by_std: byStd
    },
    rows: rows.length + cov.length, tiles: tiles
  };
}

var AUDIT_TONE_ = { PLANNED: 'amber', READY: 'navy', IN_PROGRESS: 'navy', REPORTED: 'navy', CLOSED: 'green', CANCELLED: 'muted' };
var AUDIT_RESULT_TONE_ = { C: 'green', NC: 'red', OBS: 'amber', NA: 'muted' };

function auditTeamText_(team) {
  return (team || []).map(function (t) { return (t.r === 'L' ? lab_('aud.lead_short') + ': ' : '') + t.n + (t.d ? ' (' + t.d + ')' : ''); }).join('\n');
}

/** Bố cục báo cáo AUDIT (28_report_pdf.js reportLayout_) */
function layoutAudit_(snap) {
  var d = snap.data;
  if (d.one) {
    var r = d.one;
    var head = [[lab_('rpt.kv.aud_no'), r.code || '—'], [lab_('aud.program'), [r.program.code, r.program.rev ? lab_('aud.rev_n', { N: r.program.rev }) : ''].filter(function (x) { return x; }).join(' · ')],
      [lab_('aud.dept'), r.dept_code + ' · ' + biText_(r.dept_vi, r.dept_zh)], [lab_('aud.title_f'), biNl_(r.title_vi, r.title_zh)],
      [lab_('aud.date'), [dmy_(r.audit_date), r.time_text].filter(function (x) { return x; }).join(' · ') || lab_('aud.month_only', { M: auditMonthText_(r.plan_month) })],
      [lab_('aud.place'), r.place_text], [lab_('aud.auditee'), r.auditee_text]].filter(function (x) { return x[1]; });
    if ((snap.filters || {}).form === 'REPORT') return layoutAuditReport_(snap, head);
    if ((snap.filters || {}).form === 'CHECKLIST') {
      var rows = d.checks.map(function (c) {
        return [String(c.seq), c.clause, biNl_(c.question_vi, c.question_zh), biNl_(c.evidence_vi, c.evidence_zh), c.result ? labNl_('aud.result.' + c.result) : ''];
      });
      var tones = d.checks.map(function (c) { return ['', '', '', '', AUDIT_RESULT_TONE_[c.result] || '']; });
      return {
        sections: [
          { heading: lab_('rpt.sec.aud_info'), kv: head.concat([[lab_('aud.team'), auditTeamText_(r.team)]]) },
          { heading: lab_('rpt.sec.aud_checklist'), table: rptTable_([labNl_('aud.seq'), labNl_('aud.clause'), labNl_('aud.question'), labNl_('aud.evidence'), labNl_('aud.result')],
            ['mid', 'code', 'text', 'text', 'text'], rows, tones) }
        ],
        notes: [lab_('rpt.note.aud_checklist')],
        sign: { prepared: lab_('rpt.sign.aud_auditor'), approved: lab_('rpt.sign.aud_auditee'), prepared_name: r.lead, approved_name: r.auditee_text }
      };
    }
    var teamRows = r.team.map(function (t) { return [labNl_(t.r === 'L' ? 'aud.role.L' : 'aud.role.M'), t.n, t.d || '']; });
    var clRows = r.clauses.map(function (c) { return [STD_SHORT_[c.std] || c.std, c.key, biNl_(c.name_vi, c.name_zh)]; });
    var secs = [
      { heading: lab_('rpt.sec.aud_info'), kv: head },
      { heading: lab_('rpt.sec.aud_team'), table: rptTable_([labNl_('aud.role'), labNl_('aud.member_name'), labNl_('aud.member_dept')], ['text', 'text', 'code'], teamRows, null) },
      { heading: lab_('rpt.sec.aud_criteria'), table: rptTable_([labNl_('aud.std'), labNl_('aud.clause'), labNl_('rpt.col.name')], ['text', 'code', 'text'], clRows, null) }
    ];
    if (r.note_vi || r.note_zh) secs.push({ heading: lab_('aud.note'), kv: [[lab_('aud.note'), biNl_(r.note_vi, r.note_zh)]] });
    return {
      sections: secs, notes: [lab_('rpt.note.aud_plan')],
      sign: { prepared: lab_('rpt.sign.aud_lead'), middle: lab_('rpt.sign.aud_auditee'), approved: lab_('rpt.sign.aud_secretary'),
        prepared_name: r.lead, middle_name: r.auditee_text, approved_name: r.ready_by }
    };
  }
  var pg = d.prog;
  var info = [[lab_('rpt.kv.aud_prog_no'), pg.code], [lab_('rpt.f.year'), String(pg.year)],
    [lab_('aud.stds'), pg.stds.map(function (s) { return lab_('aud.std.' + s); }).join(' · ')],
    [lab_('aud.objective'), biNl_(pg.objective_vi, pg.objective_zh)], [lab_('aud.scope'), biNl_(pg.scope_vi, pg.scope_zh)],
    [lab_('rpt.col.status'), lab_('aud.prog.state.' + pg.state) + (pg.rev ? ' · ' + lab_('aud.rev_n', { N: pg.rev }) : '') + (pg.approved_at && pg.state === 'APPROVED' ? ' · ' + dmy_(pg.approved_at.slice(0, 10)) : '')],
    [lab_('aud.reopen_reason'), pg.reopen_reason]].filter(function (x) { return x[1]; });
  var aHead = [labNl_('rpt.col.aud_no'), labNl_('aud.month'), labNl_('aud.dept'), labNl_('aud.title_f'), labNl_('aud.clauses'), labNl_('aud.team'), labNl_('aud.date'), labNl_('rpt.col.status')];
  var aTypes = ['code', 'mid', 'code', 'text', 'text', 'text', 'date', 'text'];
  var aTones = [];
  var aRows = d.audits.map(function (r2) {
    aTones.push(['', '', '', '', '', '', r2.late ? 'red' : '', r2.late ? 'red' : (AUDIT_TONE_[r2.state] || '')]);
    return [r2.code || '—', auditMonthText_(r2.plan_month), r2.dept_code, biNl_(r2.title_vi, r2.title_zh),
      r2.clauses.map(function (c) { return (c.std === 'ISO9001' ? '' : (STD_SHORT_[c.std] || c.std) + ': ') + c.key; }).join('; '), auditTeamText_(r2.team), dmy_(r2.audit_date),
      labNl_('aud.state.' + r2.state) + (r2.late ? '\n' + lab_('aud.late') : '') + (r2.state === 'CANCELLED' && r2.cancel_reason ? '\n' + r2.cancel_reason : '')];
  });
  var secs2 = [
    { heading: lab_('rpt.sec.aud_prog_info'), kv: info },
    { heading: lab_('rpt.sec.aud_schedule'), table: rptTable_(aHead, aTypes, aRows, aTones) }
  ];
  pg.stds.forEach(function (s) {
    var list = d.coverage.filter(function (c) { return c.std === s; });
    var tones = [];
    var rows = list.map(function (c) {
      tones.push(['', '', c.state === 'MISSING' ? 'red' : c.state === 'NA' ? 'muted' : 'green', c.state === 'MISSING' ? 'red' : '']);
      return [c.key, biNl_(c.name_vi, c.name_zh), c.state === 'AUDIT' ? c.audits.join(', ') : labNl_('aud.cov.' + c.state),
        c.state === 'NA' ? c.na : ''];
    });
    var b = d.by_std[s] || { audit: 0, na: 0, total: 0 };
    secs2.push({ heading: lab_('rpt.sec.aud_cov_' + s) + ' — ' + lab_('rpt.aud_cov_n', { A: b.audit, N: b.na, T: b.total }),
      table: rptTable_([labNl_('aud.clause'), labNl_('rpt.col.name'), labNl_('aud.cov.audits'), labNl_('aud.na_reason')], ['code', 'text', 'text', 'text'], rows, tones) });
  });
  if (pg.history.length) {
    secs2.push({ heading: lab_('rpt.sec.aud_history'), table: rptTable_([labNl_('aud.rev'), labNl_('aud.approved_at'), labNl_('aud.approver'), labNl_('aud.history_note')],
      ['mid', 'date', 'text', 'text'], pg.history.map(function (h) {
        return [h.rev, dmy_(String(h.at).slice(0, 10)), h.by, [h.reopen_reason ? lab_('aud.reopen_reason') + ': ' + h.reopen_reason : '', h.note].filter(function (x) { return x; }).join('\n')];
      }), null) });
  }
  return {
    sections: secs2, notes: [lab_('rpt.note.aud_program')],
    sign: { prepared: lab_('rpt.sign.aud_prog_by'), approved: lab_('rpt.sign.aud_prog_approver'), prepared_name: pg.created_by, approved_name: pg.state === 'APPROVED' ? pg.approved_by : '' }
  };
}

/** "11/2026" */
function auditMonthText_(m) {
  var s = String(m || '');
  return /^\d{4}-\d{2}$/.test(s) ? s.slice(5) + '/' + s.slice(0, 4) : s;
}

/* ---------------- Trạng thái hệ thống ---------------- */

/** Dòng healthCheck `iaudit`: chương trình năm nay (trạng thái, số đợt, phủ điều khoản), đợt đã chốt / đang đánh giá / trễ kế hoạch.
 *  Chỉ thiếu sheet mới là cảnh báo. */
function iauditHealth_() {
  if (!iauditSchemaReady_()) return [false, 'Thiếu sheet AuditPrograms / Audits / AuditChecks', 'Chạy migrateSchema'];
  var today = todayVN_();
  var y = Number(today.slice(0, 4));
  var pg = readRows_('AuditPrograms').filter(function (x) { return !x.archived_at && x.state !== 'CANCELLED' && Number(x.year) === y; })[0];
  if (!pg) return [true, 'Chưa có chương trình năm ' + y, 'Đánh giá nội bộ → Lập chương trình năm ' + y];
  var audits = liveAudits_(pg.program_id).filter(function (a) { return inScopeDept_(a.dept_code); });
  var cov = auditCoverageOf_(pg, audits);
  var part = auditStdsOf_(pg).map(function (s) {
    var list = cov.filter(function (c) { return c.std === s; });
    return (STD_SHORT_[s] || s) + ' ' + list.filter(function (c) { return c.state !== 'MISSING'; }).length + '/' + list.length;
  }).join(' · ');
  var cnt = function (st) { return audits.filter(function (a) { return a.state === st; }).length; };
  var late = audits.filter(function (a) { return auditLate_(a, today); }).length;
  var stTxt = { DRAFT: 'Nháp', IN_REVIEW: 'Chờ duyệt', APPROVED: 'Đã duyệt' }[pg.state] || pg.state;
  return [true, pg.code + ' ' + stTxt + (pg.rev ? ' lần ' + pg.rev : '') + ' · ' + audits.length + ' đợt · phủ ' + part + ' · đã chốt kế hoạch ' + cnt('READY') +
    ' · đang đánh giá ' + cnt('IN_PROGRESS') + ' · trễ kế hoạch ' + late + findingHealthTail_(audits), late ? 'Đánh giá nội bộ → đợt trễ kế hoạch' : ''];
}
