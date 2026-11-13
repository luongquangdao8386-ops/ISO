/* 36_finding: Phát hiện đánh giá nội bộ, báo cáo đánh giá (BM-ISO-03-04), đóng đợt (Đợt 4, phiên 4b). Người dùng chốt 13/11/2026:
 *  - Phân loại phát hiện: MAJOR không phù hợp lớn · MINOR không phù hợp nhỏ (bắt buộc có phiếu khắc phục) · OBS cần cải tiến (phiếu khắc phục
 *    tùy chọn). Phát hiện ghi từ câu checklist Không phù hợp (→ lớn / nhỏ) / Cần cải tiến (→ cần cải tiến), hoặc nhập tay; mỗi câu một phát hiện.
 *  - Đóng đợt khi mọi phát hiện không phù hợp có phiếu khắc phục đã đóng (đã kiểm tra hiệu lực) — ISO 9001 điều 9.2.2 f, 10.2.
 * Luồng:
 *  1. Đang đánh giá (IN_PROGRESS): người trong đoàn ghi kết quả checklist (4a) và phát hiện (iaudit.finding.save; mã DG-yy-01/01).
 *  2. Gửi báo cáo (iaudit.report — Thư ký ISO, trưởng đoàn): mọi câu đã có kết quả, mọi câu Không phù hợp / Cần cải tiến đã có phát hiện,
 *     kết luận bắt buộc → Đã báo cáo (REPORTED); phát hiện khóa. Rút báo cáo ({undo}) khi chưa phát hiện nào có phiếu khắc phục.
 *  3. Lập phiếu khắc phục từ phát hiện (capa.save {finding_id} — 32_capa.js): nguồn AUDIT, bộ phận được đánh giá; mỗi phát hiện một phiếu
 *     còn hiệu lực (phiếu đã hủy thì lập lại được).
 *  4. Đóng đợt (iaudit.close — Thư ký ISO, PIN): phát hiện lớn / nhỏ có phiếu khắc phục đã đóng; phát hiện cần cải tiến có phiếu thì phiếu
 *     đó cũng đã đóng → Đã đóng (CLOSED).
 * Nội dung phát hiện, bằng chứng, điểm mạnh, kết luận là kết luận đánh giá: không dịch máy (mục 4 đặc tả). */

/* ---------------- Tiện ích ---------------- */

function findingSchemaReady_() {
  try {
    return iauditSchemaReady_() && sheetExists_('AuditFindings') && hdr_('Audits').idx.summary_vi !== undefined &&
      sheetExists_('Capas') && hdr_('Capas').idx.finding_id !== undefined;
  } catch (e) { return false; }
}

/** Dán Code.gs 4b mà chưa chạy migrateSchema: lần ghi đầu tiên tự thêm sheet AuditFindings, cột báo cáo của Audits, cột Capas.finding_id */
function ensureFindingSchema_() {
  if (findingSchemaReady_()) return;
  autoMigrate_();
  dbReset_();
  if (!findingSchemaReady_()) throw apiError_('SYSTEM_NOT_READY');
}

/** Phát hiện còn dùng của đợt, theo số thứ tự */
function auditFindingsOf_(auditId) {
  if (!sheetExists_('AuditFindings')) return [];
  return findAll_('AuditFindings', 'audit_id', auditId).filter(function (f) { return !f.archived_at; })
    .sort(function (a, b) { return (Number(a.seq) || 0) - (Number(b.seq) || 0); });
}

function findingResult_(ctx, row) {
  return { entity_type: 'AUD_FND', entity_id: row.finding_id, record_version: row.record_version, record: projectRow_(ctx, row) };
}

/** Phiếu khắc phục còn hiệu lực của phát hiện (chưa hủy); null nếu chưa có / đã hủy */
function findingCapa_(f, capaMap) {
  if (!f || !f.capa_id) return null;
  var c = capaMap ? capaMap[f.capa_id] : (sheetExists_('Capas') ? findOne_('Capas', 'capa_id', f.capa_id) : null);
  return c && !c.archived_at && c.state !== 'CANCELLED' ? c : null;
}

function findingIsNc_(f) { return AUDIT_FINDING_NC_.indexOf(String(f.ftype)) >= 0; }

/** Kết quả câu checklist hợp với loại phát hiện: Không phù hợp → lớn / nhỏ; Cần cải tiến → cần cải tiến */
function findingTypeFits_(result, ftype) {
  return result === 'NC' ? AUDIT_FINDING_NC_.indexOf(ftype) >= 0 : result === 'OBS' ? ftype === 'OBS' : false;
}

/** Thêm danh sách mã vào thông báo lỗi (như AUDIT_NOT_COVERED) */
function errWithList_(field, code, list) {
  var e = fieldError_(field, code);
  var keys = list.slice(0, 8).join(', ') + (list.length > 8 ? '…' : '');
  e.message_vi += ' (' + list.length + ': ' + keys + ')';
  e.message_zh += '（' + list.length + '：' + keys + '）';
  return e;
}

function findingText_(errs, p, cur, f, max, required) {
  var out = {};
  ['_vi', '_zh'].forEach(function (l) {
    var k = f + l;
    var v = p[k] === undefined || p[k] === null ? (cur ? String(cur[k] || '') : '') : trimStr_(p[k]);
    if (v.length > max) errs.push(fieldError_(f, 'TOO_LONG'));
    out[k] = v;
  });
  if (required && !out[f + '_vi'] && !out[f + '_zh']) errs.push(fieldError_(f, 'REQUIRED_ONE_LANGUAGE'));
  return out;
}

/* ---------------- iaudit.finding.save ---------------- */

/**
 * iaudit.finding.save {finding_id, audit_id (khi thêm), check_id? (câu Không phù hợp / Cần cải tiến), clause_id?, ftype MAJOR | MINOR | OBS,
 * content_vi/zh (bắt buộc một thứ tiếng), evidence_vi/zh?} | {finding_id, remove: true}. Đợt đang đánh giá; người trong đoàn, trưởng đoàn,
 * Thư ký ISO. expected_version 0 = thêm (máy chủ cấp mã DG-yy-01/01); khác 0 = sửa / bỏ.
 */
function auditFindingSave_(ctx) {
  ensureFindingSchema_();
  var p = ctx.req.payload || {};
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  if (!isUuidV4_(p.finding_id)) throw validationError_([fieldError_('finding_id', 'ID_INVALID')]);
  var cur = null;
  if (!isNew) {
    cur = findOne_('AuditFindings', 'finding_id', p.finding_id);
    if (!cur || cur.archived_at) throw apiError_('NOT_FOUND');
  }
  var x = loadAudit_(ctx, cur ? cur.audit_id : p.audit_id);
  if (!canRecordAudit_(ctx.user, x.a)) throw apiError_('FORBIDDEN');
  if (x.a.state !== 'IN_PROGRESS') throw stateInvalid_();
  var remove = !isNew && p.remove === true;
  var errs = [];
  var row0 = {};
  if (!remove) {
    var ftype = p.ftype === undefined || p.ftype === null ? (cur ? String(cur.ftype || '') : '') : String(p.ftype || '');
    if (!ftype) errs.push(fieldError_('ftype', 'REQUIRED'));
    else if (AUDIT_FINDING_TYPES_.indexOf(ftype) < 0) errs.push(fieldError_('ftype', 'INVALID_VALUE'));
    var checkId = p.check_id === undefined || p.check_id === null ? (cur ? String(cur.check_id || '') : '') : trimStr_(p.check_id);
    var chk = null;
    if (checkId) {
      chk = isUuidV4_(checkId) ? findOne_('AuditChecks', 'check_id', checkId) : null;
      if (!chk || chk.archived_at || chk.audit_id !== x.a.audit_id) errs.push(fieldError_('check_id', 'NOT_FOUND'));
      else if (chk.result !== 'NC' && chk.result !== 'OBS') errs.push(fieldError_('check_id', 'AUDIT_CHECK_NOT_NC'));
      else {
        if (ftype && AUDIT_FINDING_TYPES_.indexOf(ftype) >= 0 && !findingTypeFits_(chk.result, ftype)) errs.push(fieldError_('ftype', 'AUDIT_FINDING_TYPE'));
        var other = auditFindingsOf_(x.a.audit_id).filter(function (f) { return f.check_id === checkId && f.finding_id !== p.finding_id; })[0];
        if (other) errs.push(fieldError_('check_id', 'AUDIT_CHECK_HAS_FINDING'));
      }
    }
    var clause = p.clause_id === undefined || p.clause_id === null ? (cur ? String(cur.clause_id || '') : (chk ? String(chk.clause_id || '') : ''))
      : auditCheckClauseIn_(errs, 'clause_id', p.clause_id, x.a);
    var content = findingText_(errs, p, cur, 'content', 3000, true);
    var ev = findingText_(errs, p, cur, 'evidence', 3000, false);
    if (isNew && auditFindingsOf_(x.a.audit_id).length >= AUDIT_MAX_FINDINGS_) errs.push(fieldError_('findings', 'AUDIT_FINDINGS_MAX'));
    row0 = { check_id: chk ? checkId : '', clause_id: clause, ftype: ftype };
    Object.keys(content).forEach(function (k) { row0[k] = content[k]; });
    Object.keys(ev).forEach(function (k) { row0[k] = ev[k]; });
  }
  if (errs.length) throw validationError_(errs);
  return executeWrite_(ctx, {
    entity_type: 'AUD_FND', entity_id: p.finding_id,
    build: function () {
      var ar = findOne_('Audits', 'audit_id', x.a.audit_id);
      if (!ar || ar.state !== 'IN_PROGRESS') throw stateInvalid_();
      var row;
      var live = auditFindingsOf_(x.a.audit_id);
      if (isNew) {
        assertNewId_('AuditFindings', 'finding_id', p.finding_id);
        if (live.length >= AUDIT_MAX_FINDINGS_) throw validationError_([fieldError_('findings', 'AUDIT_FINDINGS_MAX')]);
        if (row0.check_id && live.some(function (f) { return f.check_id === row0.check_id; })) throw validationError_([fieldError_('check_id', 'AUDIT_CHECK_HAS_FINDING')]);
        var seq = live.reduce(function (m, f) { return Math.max(m, Number(f.seq) || 0); }, 0) + 1;
        row = cNew_(ctx, { finding_id: p.finding_id, audit_id: x.a.audit_id, code: String(ar.code || '') + '/' + pad2_(seq), seq: seq, check_id: '',
          clause_id: '', ftype: '', content_vi: '', content_zh: '', evidence_vi: '', evidence_zh: '', capa_id: '' });
      } else {
        var c0 = findOne_('AuditFindings', 'finding_id', p.finding_id);
        if (!c0 || c0.archived_at) throw apiError_('NOT_FOUND');
        assertVersion_(ctx, c0, 'AUD_FND', 'AuditFindings');
        row = clone_(c0); delete row.__row;
        cUpdate_(ctx, row);
      }
      if (remove) row.archived_at = isoVN_(now_());
      else Object.keys(row0).forEach(function (k) { row[k] = row0[k]; });
      return {
        writes: [{ sheet: 'AuditFindings', mode: isNew ? 'insert' : 'update', row: row }], result: findingResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'AUD_FND', entity_id: row.finding_id, after_json: { audit: ar.code, code: row.code, ftype: row.ftype, check_id: row.check_id || undefined,
          removed: remove || undefined, created: isNew } }
      };
    }
  });
}

/* ---------------- Báo cáo đánh giá ---------------- */

/** Điều kiện gửi báo cáo: mọi câu đã có kết quả; mọi câu Không phù hợp / Cần cải tiến có phát hiện (đúng loại) */
function auditReportErrors_(a) {
  var errs = [];
  var checks = auditChecksOf_(a.audit_id);
  var none = checks.filter(function (c) { return !c.result; }).map(function (c) { return String(c.seq); });
  if (none.length) errs.push(errWithList_('checks', 'AUDIT_UNRECORDED', none));
  var fnd = auditFindingsOf_(a.audit_id);
  var byCheck = {};
  fnd.forEach(function (f) { if (f.check_id) byCheck[f.check_id] = f; });
  var miss = checks.filter(function (c) {
    if (c.result !== 'NC' && c.result !== 'OBS') return false;
    var f = byCheck[c.check_id];
    return !f || !findingTypeFits_(c.result, f.ftype);
  }).map(function (c) { return String(c.seq); });
  if (miss.length) errs.push(errWithList_('findings', 'AUDIT_FINDING_MISSING', miss));
  return errs;
}

/**
 * iaudit.report {audit_id, report_date? (mặc định hôm nay; từ ngày đánh giá tới hôm nay), strength_vi/zh?, summary_vi/zh (bắt buộc một thứ
 * tiếng)} — Đang đánh giá → Đã báo cáo (Thư ký ISO, trưởng đoàn) | {audit_id, undo: true} — rút báo cáo khi chưa phát hiện nào có phiếu khắc phục.
 */
function auditReport_(ctx) {
  ensureFindingSchema_();
  var p = ctx.req.payload || {};
  var x = loadAudit_(ctx, p.audit_id);
  if (!canPlanAudit_(ctx.user, x.a)) throw apiError_('FORBIDDEN');
  var undo = p.undo === true;
  var from = undo ? 'REPORTED' : 'IN_PROGRESS';
  if (x.a.state !== from) throw stateInvalid_();
  var errs = [];
  var fill = {};
  if (undo) {
    var linked = auditFindingsOf_(x.a.audit_id).filter(function (f) { return !!findingCapa_(f); }).map(function (f) { return f.code; });
    if (linked.length) errs.push(errWithList_('findings', 'AUDIT_HAS_CAPA', linked));
  } else {
    var today = todayVN_();
    var date = capaDateIn_(errs, p, 'report_date');
    if (!date && !errs.length) date = today;
    if (date && (date > today || (x.a.audit_date && date < String(x.a.audit_date)))) errs.push(fieldError_('report_date', 'AUDIT_REPORT_DATE'));
    var st = findingText_(errs, p, x.a, 'strength', 3000, false);
    var sm = findingText_(errs, p, x.a, 'summary', 3000, true);
    errs = errs.concat(auditReportErrors_(x.a));
    fill = { report_date: date };
    Object.keys(st).forEach(function (k) { fill[k] = st[k]; });
    Object.keys(sm).forEach(function (k) { fill[k] = sm[k]; });
  }
  if (errs.length) throw validationError_(errs);
  return executeWrite_(ctx, {
    entity_type: 'AUDIT', entity_id: x.a.audit_id,
    build: function () {
      var row = lockedRow_(ctx, 'Audits', 'audit_id', x.a.audit_id, 'AUDIT', true);
      if (row.state !== from) throw stateInvalid_();
      if (!undo) {
        var e2 = auditReportErrors_(row);
        if (e2.length) throw validationError_(e2);
      } else if (auditFindingsOf_(row.audit_id).some(function (f) { return !!findingCapa_(f); })) {
        throw validationError_([fieldError_('findings', 'AUDIT_HAS_CAPA')]);
      }
      cUpdate_(ctx, row);
      if (undo) { row.state = 'IN_PROGRESS'; row.reported_at = ''; row.reported_by = ''; }
      else {
        Object.keys(fill).forEach(function (k) { row[k] = fill[k]; });
        row.state = 'REPORTED'; row.reported_at = isoVN_(now_()); row.reported_by = ctx.user.user_id;
      }
      var fnd = auditFindingsOf_(row.audit_id);
      var cnt = {};
      AUDIT_FINDING_TYPES_.forEach(function (t) { cnt[t] = fnd.filter(function (f) { return f.ftype === t; }).length; });
      return {
        writes: [{ sheet: 'Audits', mode: 'update', row: row }], result: auditResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'AUDIT', entity_id: row.audit_id, before_json: { state: from },
          after_json: { state: row.state, code: row.code, report_date: undo ? undefined : row.report_date, findings: undo ? undefined : cnt } }
      };
    }
  });
}

/* ---------------- Đóng đợt ---------------- */

/** Điều kiện đóng đợt: phát hiện lớn / nhỏ có phiếu khắc phục (chưa hủy) đã đóng; phát hiện cần cải tiến có phiếu thì phiếu đã đóng */
function auditCloseErrors_(a) {
  var noCapa = [], open = [];
  auditFindingsOf_(a.audit_id).forEach(function (f) {
    var c = findingCapa_(f);
    if (!c) { if (findingIsNc_(f)) noCapa.push(f.code); return; }
    if (c.state !== 'CLOSED') open.push(f.code + ' → ' + c.code);
  });
  var errs = [];
  if (noCapa.length) errs.push(errWithList_('findings', 'AUDIT_FINDING_NO_CAPA', noCapa));
  if (open.length) errs.push(errWithList_('findings', 'AUDIT_CAPA_OPEN', open));
  return errs;
}

function precheckAuditClose_(ctx) {
  ensureFindingSchema_();
  var x = loadAudit_(ctx, (ctx.req.payload || {}).audit_id);
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  if (x.a.state !== 'REPORTED') throw stateInvalid_();
  var errs = auditCloseErrors_(x.a);
  if (errs.length) throw validationError_(errs);
  return x;
}

/** iaudit.close {audit_id, note?} (PIN, Thư ký ISO): Đã báo cáo → Đã đóng khi mọi phát hiện không phù hợp có phiếu khắc phục đã đóng */
function auditClose_(ctx) {
  var p = ctx.req.payload || {};
  var x = precheckAuditClose_(ctx);
  var note = reasonText_(p, 'note', false, 1000);
  return executeWrite_(ctx, {
    entity_type: 'AUDIT', entity_id: x.a.audit_id,
    build: function () {
      var row = lockedRow_(ctx, 'Audits', 'audit_id', x.a.audit_id, 'AUDIT', true);
      if (row.state !== 'REPORTED') throw stateInvalid_();
      var e2 = auditCloseErrors_(row);
      if (e2.length) throw validationError_(e2);
      cUpdate_(ctx, row);
      row.state = 'CLOSED'; row.closed_at = isoVN_(now_()); row.closed_by = ctx.user.user_id; row.close_note = note;
      return {
        writes: [{ sheet: 'Audits', mode: 'update', row: row }], result: auditResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'AUDIT', entity_id: row.audit_id, before_json: { state: 'REPORTED' }, after_json: { state: 'CLOSED', code: row.code } }
      };
    }
  });
}

/* ---------------- Phiếu khắc phục từ phát hiện (32_capa.js capa.save) ---------------- */

/** Kiểm phát hiện trước khi lập phiếu khắc phục từ nó (ngoài khóa); lỗi đẩy vào errs; trả {f, a} hoặc null */
function findingForCapa_(ctx, findingId, errs) {
  ensureFindingSchema_();
  if (!isUuidV4_(findingId)) { errs.push(fieldError_('finding_id', 'ID_INVALID')); return null; }
  var f = findOne_('AuditFindings', 'finding_id', findingId);
  var a = f && !f.archived_at ? findOne_('Audits', 'audit_id', f.audit_id) : null;
  if (!a || a.archived_at || !auditVisible_(ctx.user, a)) { errs.push(fieldError_('finding_id', 'NOT_FOUND')); return null; }
  if (a.state !== 'REPORTED') { errs.push(fieldError_('finding_id', a.state === 'CLOSED' ? 'STATUS_INVALID' : 'AUDIT_NOT_REPORTED')); return null; }
  if (findingCapa_(f)) { errs.push(fieldError_('finding_id', 'AUDIT_FINDING_HAS_CAPA')); return null; }
  return { f: f, a: a };
}

/** Dưới khóa ghi: gắn phiếu khắc phục mới vào phát hiện (không tăng record_version — app nhận lại qua sync_revision mới) */
function findingLinkCapaWrite_(findingId, capaId) {
  var cur = findOne_('AuditFindings', 'finding_id', findingId);
  if (!cur || cur.archived_at) throw validationError_([fieldError_('finding_id', 'NOT_FOUND')]);
  var a = findOne_('Audits', 'audit_id', cur.audit_id);
  if (!a || a.state !== 'REPORTED') throw validationError_([fieldError_('finding_id', 'AUDIT_NOT_REPORTED')]);
  if (findingCapa_(cur)) throw validationError_([fieldError_('finding_id', 'AUDIT_FINDING_HAS_CAPA')]);
  var row = clone_(cur); delete row.__row;
  row.capa_id = capaId;
  return { sheet: 'AuditFindings', mode: 'update', row: row };
}

/* ---------------- Báo cáo (27_reports.js loại AUDIT, form REPORT) ---------------- */

/** Phát hiện của đợt cho báo cáo: loại, điều khoản, nội dung, bằng chứng, câu checklist, phiếu khắc phục (mã, trạng thái, hạn, ngày đóng) */
function reportFindings_(a, clMap, dir) {
  var capas = {};
  if (sheetExists_('Capas')) readRows_('Capas').forEach(function (c) { capas[c.capa_id] = c; });
  var checks = {};
  auditChecksOf_(a.audit_id).forEach(function (c) { checks[c.check_id] = c; });
  return auditFindingsOf_(a.audit_id).map(function (f) {
    var cl = clMap[f.clause_id];
    var c = findingCapa_(f, capas);
    var ck = checks[f.check_id];
    return {
      finding_id: f.finding_id, code: f.code, seq: Number(f.seq) || 0, ftype: f.ftype, clause: auditClauseLabel_(cl), clause_name_vi: cl ? cl.name_vi || '' : '',
      clause_name_zh: cl ? cl.name_zh || '' : '', content_vi: f.content_vi || '', content_zh: f.content_zh || '', evidence_vi: f.evidence_vi || '',
      evidence_zh: f.evidence_zh || '', check_seq: ck ? Number(ck.seq) || 0 : 0, by: reportUserName_(dir, f.created_by),
      capa_code: c ? c.code : '', capa_state: c ? c.state : '', capa_due: c ? String(c.due_date || '') : '', capa_closed: c ? String(c.closed_at || '').slice(0, 10) : '',
      need_capa: findingIsNc_(f)
    };
  });
}

/** Số liệu thêm cho báo cáo một đợt (form REPORT): phát hiện, ô số */
function reportAuditReportData_(a, r, dir, clMap, cnt) {
  var fnd = reportFindings_(a, clMap, dir);
  var by = { MAJOR: 0, MINOR: 0, OBS: 0 };
  fnd.forEach(function (f) { by[f.ftype] = (by[f.ftype] || 0) + 1; });
  var needCapa = fnd.filter(function (f) { return f.need_capa || f.capa_code; });
  var closed = needCapa.filter(function (f) { return f.capa_state === 'CLOSED'; }).length;
  r.report_date = String(a.report_date || '');
  r.strength_vi = a.strength_vi || ''; r.strength_zh = a.strength_zh || '';
  r.summary_vi = a.summary_vi || ''; r.summary_zh = a.summary_zh || '';
  r.reported_by = reportUserName_(dir, a.reported_by);
  r.closed_at = String(a.closed_at || '').slice(0, 10); r.closed_by = reportUserName_(dir, a.closed_by); r.close_note = a.close_note || '';
  var tiles = [
    { k: 'aud.ftype.MAJOR', v: String(by.MAJOR), tone: by.MAJOR ? 'red' : '' },
    { k: 'aud.ftype.MINOR', v: String(by.MINOR), tone: by.MINOR ? 'amber' : '' },
    { k: 'aud.ftype.OBS', v: String(by.OBS), tone: '' },
    { k: 'rpt.t.aud_capa_closed', v: closed + '/' + needCapa.length, tone: needCapa.length && closed === needCapa.length ? 'green' : needCapa.length ? 'amber' : '' },
    { k: 'rpt.t.aud_state', v: lab_('aud.state.' + a.state), tone: a.state === 'CLOSED' ? 'green' : a.state === 'REPORTED' ? 'navy' : 'amber' }
  ];
  return { findings: fnd, by_type: by, capa_need: needCapa.length, capa_closed: closed, tiles: tiles, checks_count: cnt };
}

var AUDIT_FTYPE_TONE_ = { MAJOR: 'red', MINOR: 'amber', OBS: 'navy' };
var CAPA_STATE_TONE_ = { OPEN: 'amber', VERIFYING: 'navy', CLOSED: 'green' };

/** Bố cục báo cáo đánh giá (BM-ISO-03-04) */
function layoutAuditReport_(snap, head) {
  var d = snap.data, r = d.one;
  var c = d.counts || { total: 0, C: 0, NC: 0, OBS: 0, NA: 0, none: 0 };
  var info = head.concat([[lab_('aud.team'), auditTeamText_(r.team)], [lab_('aud.report_date'), dmy_(r.report_date)]]).filter(function (x) { return x[1]; });
  var secs = [
    { heading: lab_('rpt.sec.aud_info'), kv: info },
    { heading: lab_('rpt.sec.aud_result'), kv: [[lab_('rpt.t.aud_questions'), String(c.total)], [lab_('aud.result.C'), String(c.C)], [lab_('aud.result.NC'), String(c.NC)],
      [lab_('aud.result.OBS'), String(c.OBS)], [lab_('aud.result.NA'), String(c.NA)]].concat(c.none ? [[lab_('rpt.t.aud_unrecorded'), String(c.none)]] : []) }
  ];
  if (r.strength_vi || r.strength_zh) secs.push({ heading: lab_('aud.strength'), kv: [[lab_('aud.strength'), biNl_(r.strength_vi, r.strength_zh)]] });
  var tones = [];
  var rows = d.findings.map(function (f) {
    var capa = f.capa_code ? f.capa_code + '\n' + labNl_('capa.state.' + f.capa_state) + (f.capa_state === 'CLOSED' && f.capa_closed ? ' ' + dmy_(f.capa_closed)
      : f.capa_due ? '\n' + lab_('aud.capa_due', { D: dmy_(f.capa_due) }) : '') : f.need_capa ? lab_('aud.capa_none') : '';
    tones.push(['', AUDIT_FTYPE_TONE_[f.ftype] || '', '', '', '', f.capa_code ? CAPA_STATE_TONE_[f.capa_state] || '' : f.need_capa ? 'red' : '']);
    var what = biNl_(f.content_vi, f.content_zh) + (f.evidence_vi || f.evidence_zh ? '\n' + lab_('aud.evidence') + ': ' + biNl_(f.evidence_vi, f.evidence_zh) : '');
    return [f.code, labNl_('aud.ftype.' + f.ftype), f.clause || '—', what, f.check_seq ? String(f.check_seq) : '—', capa];
  });
  secs.push({ heading: lab_('rpt.sec.aud_findings') + ' — ' + lab_('rpt.aud_findings_n', { A: d.by_type.MAJOR || 0, B: d.by_type.MINOR || 0, C: d.by_type.OBS || 0 }),
    table: rows.length ? rptTable_([labNl_('aud.finding_no'), labNl_('aud.ftype'), labNl_('aud.clause'), labNl_('aud.finding_content'), labNl_('aud.check_no'),
      labNl_('aud.capa')], ['code', 'text', 'code', 'text', 'mid', 'text'], rows, tones) : null,
    note: rows.length ? '' : lab_('aud.findings_none') });
  secs.push({ heading: lab_('aud.summary'), kv: [[lab_('aud.summary'), biNl_(r.summary_vi, r.summary_zh) || '—']] });
  if (r.closed_at) secs.push({ heading: lab_('rpt.sec.aud_close'), kv: [[lab_('aud.closed_at'), dmy_(r.closed_at) + (r.closed_by ? ' · ' + r.closed_by : '')],
    [lab_('aud.close_note'), r.close_note]].filter(function (x) { return x[1]; }) });
  return {
    sections: secs, notes: [lab_('rpt.note.aud_report')],
    sign: { prepared: lab_('rpt.sign.aud_lead'), middle: lab_('rpt.sign.aud_auditee'), approved: lab_('rpt.sign.aud_secretary'),
      prepared_name: r.lead, middle_name: r.auditee_text, approved_name: r.closed_by || '' }
  };
}

/* ---------------- Trạng thái hệ thống ---------------- */

/** Đuôi dòng healthCheck `iaudit`: đợt đã báo cáo chờ đóng, phát hiện không phù hợp chưa có phiếu khắc phục */
function findingHealthTail_(audits) {
  if (!sheetExists_('AuditFindings')) return '';
  var rep = audits.filter(function (a) { return a.state === 'REPORTED'; });
  var noCapa = 0;
  rep.forEach(function (a) { auditFindingsOf_(a.audit_id).forEach(function (f) { if (findingIsNc_(f) && !findingCapa_(f)) noCapa++; }); });
  return ' · đã báo cáo chờ đóng ' + rep.length + ' · đã đóng ' + audits.filter(function (a) { return a.state === 'CLOSED'; }).length +
    ' · phát hiện không phù hợp chưa có phiếu khắc phục ' + noCapa;
}
