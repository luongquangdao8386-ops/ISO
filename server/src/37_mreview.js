/* 37_mreview: Xem xét lãnh đạo (Đợt 4, phiên 4c — BM-ISO-05-01 đầu vào xem xét lãnh đạo), mã XL-yy-01. Người dùng chốt 13/11/2026 giữ phạm vi
 * Cơ điện: số liệu tự gom chỉ trong phạm vi áp dụng của app (Settings scope_depts), in theo mẫu biểu ISO (mreview_form_code, sửa ở Cấu hình).
 * Luồng (ISO 9001 điều 9.3):
 *  1. Thư ký ISO / Quản trị lập cuộc xem xét (mreview.save): kỳ xem xét (từ ngày – đến ngày), ngày họp dự kiến, địa điểm, chủ trì, thành phần.
 *     Đang chuẩn bị (DRAFT): app gom số liệu theo kỳ (mreview.stats — tính lúc xem): tình trạng quyết định của lần xem xét trước (a), khiếu nại
 *     khách hàng (c1), sản phẩm không phù hợp (c3), khắc phục (c4), kiểm soát tài liệu + phủ điều khoản + hồ sơ đúng hạn (c5), đánh giá nội bộ
 *     (c6), SCAR nhà cung cấp (c7); người lập ghi thêm nhận xét từng mục (dịch máy) và các mục chỉ ghi tay (b, c2, d, e, f).
 *  2. Đã họp (mreview.hold — Thư ký ISO, PIN): ngày họp (không sau hôm nay), chủ trì, kết luận (bắt buộc) → số liệu chốt (stats_json),
 *     đầu vào khóa. Quyết định (đầu ra 9.3.3: cải tiến · thay đổi hệ thống · nguồn lực — người phụ trách, hạn) ghi trước hoặc sau khi họp.
 *     Mở lại ({undo}) khi chưa quyết định nào xong.
 *  3. Theo dõi quyết định (mreview.decision — Thư ký ISO, người phụ trách quyết định): xong (ngày, ghi chú) / mở lại / hủy (Thư ký ISO).
 *     Lần xem xét sau tự hiện tình trạng các quyết định này ở mục a.
 *  Hủy cuộc xem xét đang chuẩn bị (mreview.cancel — Thư ký ISO, PIN, lý do).
 * Người xem: Thư ký ISO, cấp 3+, người phụ trách một quyết định. Báo cáo (27_reports.js loại MREVIEW): BM-ISO-05-01 PDF / Excel. */

/* ---------------- Quyền, tiện ích ---------------- */

function mreviewVisible_(u, r) {
  if (!r) return false;
  if (isSecretary_(u) || Number(u.role_level) >= 3) return true;
  return mrDecisions_(r).some(function (d) { return d.owner_user_id && d.owner_user_id === u.user_id; });
}

function mrDecisions_(r) { return r && Array.isArray(r.decisions_json) ? r.decisions_json : []; }

function mreviewSchemaReady_() {
  try { return sheetExists_('MgmtReviews'); } catch (e) { return false; }
}

/** Dán Code.gs 4c mà chưa chạy migrateSchema: lần ghi đầu tiên tự thêm sheet MgmtReviews */
function ensureMreviewSchema_() {
  if (mreviewSchemaReady_()) return;
  autoMigrate_();
  dbReset_();
  if (!mreviewSchemaReady_()) throw apiError_('SYSTEM_NOT_READY');
}

function loadMreview_(ctx, id) {
  ensureMreviewSchema_();
  if (!isUuidV4_(id)) throw validationError_([fieldError_('review_id', 'ID_INVALID')]);
  var r = findOne_('MgmtReviews', 'review_id', id);
  if (!r || r.archived_at) throw apiError_('NOT_FOUND');
  if (!mreviewVisible_(ctx.user, r)) throw apiError_('FORBIDDEN');
  return r;
}

function mreviewResult_(ctx, row) {
  return { entity_type: 'MREVIEW', entity_id: row.review_id, record_version: row.record_version, record: projectRow_(ctx, row) };
}

/** Trường dịch máy: nhận xét 12 mục đầu vào + kết luận */
function mrMtFields_() {
  return MR_INPUTS_.map(function (k) { return 'in_' + k; }).concat(['conclusion']);
}

/** Người dùng giả "thấy hết trong phạm vi" để gom số liệu toàn công ty (số liệu như nhau với mọi người xem) */
function mrSysCtx_() {
  return { user: { user_id: SYSTEM_USER, role_level: 4, iso_secretary: true, dept_codes: '', active: true, auditor: false }, req: { payload: {} } };
}

/* ---------------- Số liệu tự gom ---------------- */

/** Lần xem xét trước: cuộc đã họp gần nhất (khác cuộc này), ngày họp trước ngày họp của cuộc này (chưa có: trước hôm nay + 1) */
function mrPrevReview_(r, all) {
  var limit = String(r.meeting_date || addDaysIso_(todayVN_(), 1));
  return all.filter(function (x) {
    return x.review_id !== r.review_id && !x.archived_at && x.state === 'HELD' && x.meeting_date && String(x.meeting_date) <= limit &&
      (String(x.meeting_date) < limit || String(x.created_at) < String(r.created_at));
  }).sort(function (a, b) { return String(b.meeting_date).localeCompare(String(a.meeting_date)) || String(b.created_at).localeCompare(String(a.created_at)); })[0] || null;
}

/** Quyết định → dòng hiện / in (tên người phụ trách, quá hạn) */
function mrDecisionRows_(r, dir, today) {
  return mrDecisions_(r).map(function (d, i) {
    return { id: d.id, n: i + 1, kind: d.kind, text_vi: d.text_vi || '', text_zh: d.text_zh || '', owner: d.owner_user_id ? reportUserName_(dir, d.owner_user_id) || d.owner_name || '' : d.owner_name || '',
      owner_user_id: d.owner_user_id || '', due: String(d.due || ''), state: d.state || 'OPEN', done_date: String(d.done_date || ''), note: d.note || '',
      late: (d.state || 'OPEN') === 'OPEN' && !!d.due && String(d.due) < today };
  });
}

/**
 * Gom số liệu của kỳ [from, to] trong phạm vi áp dụng (tính tại `today`). Trả {from, to, today, scope, prev, docs, coverage, records, capa,
 * complaint, supplier, ncr, audit}.
 */
function mrStats_(r, today) {
  var from = String(r.period_from), to = String(r.period_to);
  var inP = function (v) { var d = String(v || '').slice(0, 10); return !!d && d >= from && d <= to; };
  var dir = userDirectory_();
  var out = { from: from, to: to, today: today, scope: scopeDepts_().join(', ') };
  // a) Lần xem xét trước
  var allRev = readRows_('MgmtReviews');
  var pv = mrPrevReview_(r, allRev);
  if (pv) {
    var drows = mrDecisionRows_(pv, dir, today);
    out.prev = { code: pv.code, meeting_date: String(pv.meeting_date || ''), decisions: drows,
      done: drows.filter(function (d) { return d.state === 'DONE'; }).length, open: drows.filter(function (d) { return d.state === 'OPEN'; }).length,
      late: drows.filter(function (d) { return d.late; }).length, cancelled: drows.filter(function (d) { return d.state === 'CANCELLED'; }).length };
  } else out.prev = null;
  // c5) Kiểm soát tài liệu, phủ điều khoản
  var items = readRows_('Items').filter(function (it) { return !it.archived_at && inScope_(it); });
  var inItem = {};
  items.forEach(function (it) { inItem[it.item_id] = true; });
  var issued = items.filter(function (it) { return it.status === 'ISSUED'; }).length, na = items.filter(function (it) { return it.status === 'NA'; }).length;
  var vIss = sheetExists_('Versions') ? readRows_('Versions').filter(function (v) {
    return !v.archived_at && inItem[v.item_id] && (v.state === 'ISSUED' || v.state === 'SUPERSEDED') && inP(v.issued_at);
  }).length : 0;
  var reqs = sheetExists_('DocRequests') ? readRows_('DocRequests').filter(function (q) { return !q.archived_at && inScopeDept_(q.dept_code) && q.state !== 'CANCELLED' && inP(q.submitted_at); }) : [];
  out.docs = { items: items.length, issued: issued, na: na, pct: reportPct_(issued, items.length - na),
    review_overdue: items.filter(function (it) { return it.status === 'ISSUED' && it.review_due && String(it.review_due) < today; }).length,
    file_missing: items.filter(function (it) { return it.status === 'ISSUED' && it.file_missing; }).length,
    versions_issued: vIss, req: reqs.length, req_done: reqs.filter(function (q) { return q.state === 'DONE'; }).length };
  var cls = readRows_('Clauses').filter(function (c) { return c.active !== false && !c.archived_at; });
  var cov = coverageCounts_(items, cls);
  var b9 = cov.by_std.ISO9001;
  out.coverage = { iso_total: b9.total, iso_covered: b9.covered, iso_missing: b9.missing, brc_total: cov.by_std.BRC.total, brc_covered: cov.by_std.BRC.covered,
    // ISO 14001 / 45001 / 50001 (14/11/2026): chuẩn có điều khoản mới ghi
    stds: ISO_STDS_.filter(function (x) { return x !== 'ISO9001' && cov.by_std[x].total; }).map(function (x) {
      return { std: x, total: cov.by_std[x].total, covered: cov.by_std[x].covered, missing: cov.by_std[x].missing };
    }) };
  // c5) Hồ sơ đúng hạn (như báo cáo Tình trạng hồ sơ — theo tháng, khoảng dài hơn 12 tháng thì theo quý)
  out.records = mrRecords_(from, to, today);
  // c1, c4, c7) Khắc phục, khiếu nại, SCAR
  var capas = sheetExists_('Capas') ? readRows_('Capas').filter(function (c) { return !c.archived_at && inScopeDept_(c.dept_code) && c.state !== 'CANCELLED'; }) : [];
  var actsBy = {};
  if (sheetExists_('CapaActions')) readRows_('CapaActions').forEach(function (a) { if (!a.archived_at) (actsBy[a.capa_id] = actsBy[a.capa_id] || []).push(a); });
  var live = function (c) { return c.state === 'OPEN' || c.state === 'VERIFYING'; };
  var cap = { new: 0, closed: 0, open: 0, overdue: 0, eff: 0, not_eff: 0, by_source: {} };
  capas.filter(function (c) { return !capaIsParty_(c.source); }).forEach(function (c) {
    if (inP(c.found_date)) { cap.new++; cap.by_source[c.source] = (cap.by_source[c.source] || 0) + 1; }
    if (c.state === 'CLOSED' && inP(c.closed_at)) cap.closed++;
    if (live(c)) { cap.open++; if (capaOverdue_(c, actsBy[c.capa_id] || [], today)) cap.overdue++; }
    (Array.isArray(c.verify_history_json) ? c.verify_history_json : []).forEach(function (h) {
      if (!inP(h.date || h.at)) return;
      if (h.result === 'EFFECTIVE') cap.eff++; else if (h.result === 'NOT_EFFECTIVE') cap.not_eff++;
    });
  });
  out.capa = cap;
  var party = function (src) {
    var list = capas.filter(function (c) { return c.source === src; });
    var s = { new: 0, closed: 0, open: 0, reply_late: 0, replied: 0, replied_on_time: 0, by_sev: { MINOR: 0, MAJOR: 0, CRITICAL: 0, NONE: 0 },
      valid: { YES: 0, NO: 0, PENDING: 0 }, parties: [] };
    var byParty = {};
    list.forEach(function (c) {
      if (inP(c.found_date)) {
        s.new++;
        s.by_sev[c.severity || 'NONE'] = (s.by_sev[c.severity || 'NONE'] || 0) + 1;
        s.valid[c.complaint_valid === 'YES' ? 'YES' : c.complaint_valid === 'NO' ? 'NO' : 'PENDING']++;
        var pn = trimStr_(c.party_name);
        if (pn) byParty[pn] = (byParty[pn] || 0) + 1;
      }
      if (c.state === 'CLOSED' && inP(c.closed_at)) s.closed++;
      if (live(c)) s.open++;
      if (capaReplyLate_(c, today)) s.reply_late++;
      if (c.reply_date && inP(c.reply_date)) { s.replied++; if (!c.reply_due || String(c.reply_date) <= String(c.reply_due)) s.replied_on_time++; }
    });
    s.parties = Object.keys(byParty).map(function (k) { return { name: k, n: byParty[k] }; })
      .sort(function (a, b) { return b.n - a.n || a.name.localeCompare(b.name); }).slice(0, 5);
    return s;
  };
  out.complaint = party('COMPLAINT');
  out.supplier = party('SUPPLIER');
  // c3) Sản phẩm không phù hợp
  var ncrs = sheetExists_('Ncrs') ? readRows_('Ncrs').filter(function (n) { return !n.archived_at && inScopeDept_(n.dept_code) && n.state !== 'CANCELLED'; }) : [];
  var nc = { new: 0, closed: 0, open: 0, overdue: 0, need_capa: 0, by_stage: {}, by_disp: {} };
  NCR_STAGES_.forEach(function (x) { nc.by_stage[x] = 0; });
  NCR_DISPOSITIONS_.forEach(function (x) { nc.by_disp[x] = 0; });
  ncrs.forEach(function (n) {
    if (inP(n.found_date)) {
      nc.new++;
      nc.by_stage[n.stage] = (nc.by_stage[n.stage] || 0) + 1;
      (Array.isArray(n.decision_json) ? n.decision_json : []).forEach(function (l) { if (l && l.d) nc.by_disp[l.d] = (nc.by_disp[l.d] || 0) + 1; });
      if (n.need_capa === 'YES') nc.need_capa++;
    }
    if (n.state === 'CLOSED' && inP(n.closed_at)) nc.closed++;
    if (n.state === 'OPEN' || n.state === 'DECIDED') { nc.open++; if (ncrOverdue_(n, today)) nc.overdue++; }
  });
  out.ncr = nc;
  // c6) Đánh giá nội bộ
  out.audit = mrAudit_(from, to, today, inP);
  return out;
}

function mrRecords_(from, to, today) {
  var end = to < today ? to : today;
  if (end < from) return { tracked: 0, ok: 0, late: 0, rate: null, items_late: 0, events: 0, depts: [], grain: 'MONTH', cols: [] };
  var mi = function (d) { return Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7)) - 1; };
  var months = mi(end) - mi(from) + 1;
  var grain = months > 12 ? 'QUARTER' : 'MONTH';
  var endKey = periodOf_(grain, end).key;
  var n = grain === 'MONTH' ? months : Math.floor(mi(end) / 3) - Math.floor(mi(from) / 3) + 1;
  var rr = reportRecords_(mrSysCtx_(), { dept: '', grain: grain, end: endKey, n: Math.max(1, Math.min(grain === 'MONTH' ? 12 : 8, n)) }, today);
  var t = rr.data.totals;
  return { tracked: t.items, ok: t.ok, late: t.late, rate: t.rate, items_late: t.items_late, events: t.events, grain: grain,
    cols: rr.data.cols.map(function (c) { return c.key; }),
    depts: rr.data.depts.map(function (d) { return { dept_code: d.dept_code, name_vi: d.name_vi, name_zh: d.name_zh, items: d.sum.items, ok: d.sum.ok, late: d.sum.late,
      rate: d.sum.rate, items_late: d.sum.items_late, events: d.sum.events }; }) };
}

function mrAudit_(from, to, today, inP) {
  var s = { program: null, n: 0, done: 0, closed: 0, late: 0, findings: { MAJOR: 0, MINOR: 0, OBS: 0 }, capa_need: 0, capa_closed: 0 };
  if (!iauditSchemaReady_()) return s;
  var y = Number(to.slice(0, 4));
  var pg = readRows_('AuditPrograms').filter(function (x) { return !x.archived_at && x.state !== 'CANCELLED' && Number(x.year) === y; })[0];
  if (pg) {
    var cov = auditCoverageOf_(pg, liveAudits_(pg.program_id).filter(function (a) { return inScopeDept_(a.dept_code); }));
    var part = {};
    auditStdsOf_(pg).forEach(function (std) {
      var list = cov.filter(function (c) { return c.std === std; });
      part[std] = list.filter(function (c) { return c.state !== 'MISSING'; }).length + '/' + list.length;
    });
    s.program = { code: pg.code, state: pg.state, rev: pg.rev || '', cov: part };
  }
  var capas = {};
  if (sheetExists_('Capas')) readRows_('Capas').forEach(function (c) { capas[c.capa_id] = c; });
  var hasF = sheetExists_('AuditFindings');
  readRows_('Audits').forEach(function (a) {
    if (a.archived_at || !inScopeDept_(a.dept_code) || a.state === 'CANCELLED') return;
    if (auditLate_(a, today)) s.late++;
    if (!inP(a.audit_date)) return;
    s.n++;
    if (a.state === 'REPORTED' || a.state === 'CLOSED') s.done++;
    if (a.state === 'CLOSED') s.closed++;
    if (!hasF) return;
    auditFindingsOf_(a.audit_id).forEach(function (f) {
      s.findings[f.ftype] = (s.findings[f.ftype] || 0) + 1;
      var c = findingCapa_(f, capas);
      if (findingIsNc_(f) || c) { s.capa_need++; if (c && c.state === 'CLOSED') s.capa_closed++; }
    });
  });
  return s;
}

/** Số liệu → dòng hiện theo mục: {mục: [{k: khóa nhãn, v: giá trị, t: màu, s: khóa nhãn đuôi}]} — app và PDF dùng chung */
function mrBlocks_(st) {
  var row = function (k, v, t, sfx) { var o = { k: k, v: String(v) }; if (t) o.t = t; if (sfx) o.s = sfx; return o; };
  var join = function (arr) { return arr.join(' / '); };
  var pct = function (v) { return v === null || v === undefined ? '—' : String(v).replace('.', ',') + ' %'; };
  var b = {};
  var pv = st.prev;
  b.prev = pv ? [row('mr.s.prev_review', pv.code + (pv.meeting_date ? ' · ' + fmtDateVN_(pv.meeting_date) : '')),
    row('mr.s.prev_dec', join([pv.done, pv.open, pv.late, pv.cancelled]), pv.late ? 'red' : pv.open ? 'amber' : pv.decisions.length ? 'green' : '')]
    : [row('mr.s.prev_none', '—')];
  var c = st.complaint;
  b.satisfaction = [row('mr.s.cmp_new', c.new), row('mr.s.cmp_sev', join([c.by_sev.MINOR, c.by_sev.MAJOR, c.by_sev.CRITICAL]), c.by_sev.CRITICAL ? 'red' : ''),
    row('mr.s.cmp_valid', join([c.valid.YES, c.valid.NO, c.valid.PENDING])), row('mr.s.cmp_closed', c.closed), row('mr.s.cmp_open', c.open, c.open ? 'amber' : ''),
    row('mr.s.cmp_replied', c.replied_on_time + '/' + c.replied), row('mr.s.cmp_reply_late', c.reply_late, c.reply_late ? 'red' : '')];
  var n = st.ncr;
  b.process = [row('mr.s.ncr_new', n.new), row('mr.s.ncr_stage', join(NCR_STAGES_.map(function (x) { return n.by_stage[x] || 0; }))),
    row('mr.s.ncr_disp', join(NCR_DISPOSITIONS_.map(function (x) { return n.by_disp[x] || 0; }))), row('mr.s.ncr_need_capa', n.need_capa),
    row('mr.s.ncr_closed', n.closed), row('mr.s.ncr_open', n.open, n.open ? 'amber' : ''), row('mr.s.ncr_overdue', n.overdue, n.overdue ? 'red' : '')];
  var k = st.capa;
  var srcs = CAPA_SOURCES_.filter(function (x) { return CAPA_PARTY_SOURCES_.indexOf(x) < 0; });
  b.capa = [row('mr.s.capa_new', k.new), row('mr.s.capa_src', join(srcs.map(function (x) { return k.by_source[x] || 0; }))), row('mr.s.capa_closed', k.closed),
    row('mr.s.capa_open', k.open, k.open ? 'amber' : ''), row('mr.s.capa_overdue', k.overdue, k.overdue ? 'red' : ''),
    row('mr.s.capa_eff', join([k.eff, k.not_eff]), k.not_eff ? 'amber' : '')];
  var d = st.docs, cv = st.coverage, r = st.records;
  b.monitoring = [row('mr.s.items', d.items), row('mr.s.issued', d.issued + '/' + (d.items - d.na) + ' · ' + pct(d.pct)),
    row('mr.s.review_overdue', d.review_overdue, d.review_overdue ? 'red' : ''), row('mr.s.file_missing', d.file_missing, d.file_missing ? 'amber' : ''),
    row('mr.s.versions_issued', d.versions_issued), row('mr.s.docreq', d.req + ' (' + d.req_done + ')'),
    row('mr.s.iso_cov', cv.iso_covered + '/' + cv.iso_total), row('mr.s.iso_missing', cv.iso_missing, cv.iso_missing ? 'red' : 'green'),
    row('mr.s.brc_cov', cv.brc_covered + '/' + cv.brc_total)].concat((cv.stds || []).map(function (x) {
      return row('mr.s.cov_' + x.std, x.covered + '/' + x.total + ' · ' + x.missing, x.missing ? 'red' : 'green');
    })).concat([
    row('mr.s.rec_rate', r.ok + '/' + (r.ok + r.late) + ' · ' + pct(r.rate), r.late ? 'red' : r.ok ? 'green' : ''),
    row('mr.s.rec_late_items', r.items_late, r.items_late ? 'red' : ''), row('mr.s.rec_events', r.events)]);
  var a = st.audit;
  b.audit = [a.program ? row('mr.s.aud_prog', a.program.code + (a.program.rev ? ' · ' + a.program.rev : ''), a.program.state === 'APPROVED' ? 'green' : 'amber', 'aud.prog.state.' + a.program.state)
    : row('mr.s.aud_prog_none', '—', 'amber')];
  // Phủ của chương trình theo từng chuẩn có trong bản chụp ("ISO 9001 41/41 · ISO 14001 26/26 · BRCGS 31/31"); bản chụp cũ chỉ có ISO 9001, BRCGS
  if (a.program) {
    b.audit.push(row('mr.s.aud_cov', CLAUSE_STDS_.filter(function (x) { return a.program.cov[x]; }).map(function (x) { return STD_SHORT_[x] + ' ' + a.program.cov[x]; }).join(' · ') || '—'));
  }
  b.audit = b.audit.concat([row('mr.s.aud_n', a.done + '/' + a.n), row('mr.s.aud_closed', a.closed), row('mr.s.aud_late', a.late, a.late ? 'red' : ''),
    row('mr.s.aud_fnd', join([a.findings.MAJOR || 0, a.findings.MINOR || 0, a.findings.OBS || 0]), a.findings.MAJOR ? 'red' : ''),
    row('mr.s.aud_capa', a.capa_closed + '/' + a.capa_need, a.capa_need && a.capa_closed < a.capa_need ? 'amber' : '')]);
  var s = st.supplier;
  b.supplier = [row('mr.s.scar_new', s.new), row('mr.s.scar_closed', s.closed), row('mr.s.scar_open', s.open, s.open ? 'amber' : ''),
    row('mr.s.scar_reply_late', s.reply_late, s.reply_late ? 'red' : '')];
  if (s.parties.length) b.supplier.push(row('mr.s.scar_top', s.parties.map(function (p) { return p.name + ' (' + p.n + ')'; }).join(', ')));
  return b;
}

/** Số liệu của một cuộc xem xét: đã họp → bản chốt; còn lại → tính lúc xem */
function mrStatsOf_(r, today) {
  if (r.state === 'HELD' && r.stats_json && r.stats_json.data) return r.stats_json;
  var data = mrStats_(r, today);
  return { at: isoVN_(now_()), from: data.from, to: data.to, live: true, data: data, blocks: mrBlocks_(data) };
}

/* ---------------- Kiểm dữ liệu ---------------- */

function mrDateIn_(errs, p, key, cur) {
  if (p[key] === undefined || p[key] === null) return cur ? String(cur[key] || '') : '';
  var v = trimStr_(p[key]);
  if (v && !isDateStr_(v)) { errs.push(fieldError_(key, 'INVALID_DATE')); return ''; }
  return v;
}

function mrStrIn_(errs, p, key, cur, max) {
  if (p[key] === undefined || p[key] === null) return cur ? String(cur[key] || '') : '';
  var v = trimStr_(p[key]);
  if (v.length > max) errs.push(fieldError_(key, 'TOO_LONG'));
  return v;
}

/** Danh sách quyết định gửi lên: giữ trạng thái / ngày xong của quyết định đã có (đổi trạng thái qua mreview.decision) */
function mrDecisionsIn_(errs, raw, cur) {
  if (raw === undefined || raw === null) return mrDecisions_(cur);
  if (!Array.isArray(raw)) { errs.push(fieldError_('decisions', 'INVALID_VALUE')); return mrDecisions_(cur); }
  if (raw.length > MR_MAX_DECISIONS_) errs.push(fieldError_('decisions', 'MR_DECISIONS_MAX'));
  var old = {};
  mrDecisions_(cur).forEach(function (d) { old[d.id] = d; });
  var users = {};
  readRows_('Users').forEach(function (u) { users[u.user_id] = u; });
  var seen = {};
  var out = [];
  raw.slice(0, MR_MAX_DECISIONS_).forEach(function (d, i) {
    var f = function (x) { return 'decisions.' + i + '.' + x; };
    if (!d || typeof d !== 'object') { errs.push(fieldError_(f('id'), 'INVALID_VALUE')); return; }
    if (!isUuidV4_(d.id) || seen[d.id]) { errs.push(fieldError_(f('id'), 'ID_INVALID')); return; }
    seen[d.id] = true;
    var kind = String(d.kind || '');
    if (MR_DECISION_KINDS_.indexOf(kind) < 0) errs.push(fieldError_(f('kind'), kind ? 'INVALID_VALUE' : 'REQUIRED'));
    var tv = trimStr_(d.text_vi), tz = trimStr_(d.text_zh);
    if (!tv && !tz) errs.push(fieldError_(f('text'), 'REQUIRED_ONE_LANGUAGE'));
    if (tv.length > 1000 || tz.length > 1000) errs.push(fieldError_(f('text'), 'TOO_LONG'));
    var ou = trimStr_(d.owner_user_id);
    if (ou && (!users[ou] || !users[ou].active)) errs.push(fieldError_(f('owner_user_id'), 'NOT_FOUND'));
    var on = trimStr_(d.owner_name);
    if (on.length > 120) errs.push(fieldError_(f('owner_name'), 'TOO_LONG'));
    var due = trimStr_(d.due);
    if (due && !isDateStr_(due)) errs.push(fieldError_(f('due'), 'INVALID_DATE'));
    var o = old[d.id];
    out.push({ id: d.id, kind: kind, text_vi: tv, text_zh: tz, owner_user_id: ou, owner_name: ou ? '' : on, due: due,
      state: o ? o.state || 'OPEN' : 'OPEN', done_date: o ? o.done_date || '' : '', note: o ? o.note || '' : '', by: o ? o.by || '' : '', at: o ? o.at || '' : '' });
  });
  // Quyết định đã xong / đã hủy không bỏ khỏi danh sách được (giữ dấu vết theo dõi)
  mrDecisions_(cur).forEach(function (o) {
    if (!seen[o.id] && (o.state === 'DONE' || o.state === 'CANCELLED')) errs.push(fieldError_('decisions', 'MR_DECISION_KEEP'));
  });
  return out;
}

/* ---------------- mreview.save ---------------- */

/**
 * mreview.save {review_id, period_from, period_to, meeting_date?, place_text?, chair_name?, attendees_text?, in_<mục>_vi/zh?, conclusion_vi/zh?,
 * decisions?} — expected_version 0 = lập (máy chủ cấp mã XL-yy-01 theo năm của ngày cuối kỳ). Đang chuẩn bị: sửa mọi thứ; đã họp: chỉ
 * thông tin cuộc họp (địa điểm, chủ trì, thành phần), kết luận, quyết định (kỳ, ngày họp, nhận xét đầu vào khóa — mở lại để sửa).
 */
function mreviewSave_(ctx) {
  ensureMreviewSchema_();
  var p = ctx.req.payload || {};
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  if (!isUuidV4_(p.review_id)) throw validationError_([fieldError_('review_id', 'ID_INVALID')]);
  var cur = null;
  if (!isNew) {
    cur = loadMreview_(ctx, p.review_id);
    if (cur.state === 'CANCELLED') throw stateInvalid_();
  }
  var held = !!cur && cur.state === 'HELD';
  var errs = [];
  var today = todayVN_();
  var from = mrDateIn_(errs, p, 'period_from', cur), to = mrDateIn_(errs, p, 'period_to', cur), meet = mrDateIn_(errs, p, 'meeting_date', cur);
  if (!from) errs.push(fieldError_('period_from', 'REQUIRED'));
  if (!to) errs.push(fieldError_('period_to', 'REQUIRED'));
  if (from && to && isDateStr_(from) && isDateStr_(to)) {
    if (from > to) errs.push(fieldError_('period_to', 'RANGE_INVALID'));
    else if (daysBetweenIso_(from, to) > MR_MAX_DAYS_) errs.push(fieldError_('period_to', 'MR_PERIOD_LONG'));
    if (to > addDaysIso_(today, 92)) errs.push(fieldError_('period_to', 'MR_PERIOD_FUTURE'));
  }
  if (meet && from && isDateStr_(meet) && meet < from) errs.push(fieldError_('meeting_date', 'RANGE_INVALID'));
  var fill = { place_text: mrStrIn_(errs, p, 'place_text', cur, 200), chair_name: mrStrIn_(errs, p, 'chair_name', cur, 120),
    attendees_text: mrStrIn_(errs, p, 'attendees_text', cur, 1500) };
  mrMtFields_().forEach(function (f) {
    ['_vi', '_zh'].forEach(function (l) { if (p[f + l] !== undefined && p[f + l] !== null && trimStr_(p[f + l]).length > 4000) errs.push(fieldError_(f, 'TOO_LONG')); });
  });
  if (held) {
    // Đã họp: kỳ, ngày họp, nhận xét đầu vào đã chốt cùng số liệu
    if (from !== String(cur.period_from) || to !== String(cur.period_to) || meet !== String(cur.meeting_date || '')) errs.push(fieldError_('state', 'MR_HELD_LOCKED'));
    MR_INPUTS_.forEach(function (k) {
      ['_vi', '_zh'].forEach(function (l) {
        var key = 'in_' + k + l;
        if (p[key] !== undefined && p[key] !== null && trimStr_(p[key]) !== String(cur[key] || '')) errs.push(fieldError_('state', 'MR_HELD_LOCKED'));
      });
    });
    if (fill.chair_name === '' && cur.chair_name) errs.push(fieldError_('chair_name', 'REQUIRED'));
  }
  var decisions = mrDecisionsIn_(errs, p.decisions, cur);
  if (errs.length) throw validationError_(dedupeErrs_(errs));
  var input = {};
  mrMtFields_().forEach(function (f) {
    if (held && f !== 'conclusion') return;
    ['_vi', '_zh'].forEach(function (l) { if (p[f + l] !== undefined) input[f + l] = p[f + l]; });
  });
  var tr = applyTranslations_('MgmtReviews', held ? ['conclusion'] : mrMtFields_(), input, cur); // dịch ngoài khóa ghi
  return executeWrite_(ctx, {
    entity_type: 'MREVIEW', entity_id: p.review_id,
    build: function (st) {
      var row, su = {};
      if (isNew) {
        assertNewId_('MgmtReviews', 'review_id', p.review_id);
        var y = Number(to.slice(0, 4));
        row = { review_id: p.review_id, code: allocCode_(st, su, 'MREVIEW', new Date(Date.UTC(y, 5, 15))), year: y, state: 'DRAFT', decisions_json: [],
          stats_json: null, stats_at: '', held_at: '', held_by: '', cancelled_at: '', cancelled_by: '', cancel_reason: '', conclusion_vi: '', conclusion_zh: '' };
        MR_INPUTS_.forEach(function (k) { row['in_' + k + '_vi'] = ''; row['in_' + k + '_zh'] = ''; });
        cNew_(ctx, row);
      } else {
        row = lockedRow_(ctx, 'MgmtReviews', 'review_id', p.review_id, 'MREVIEW', true);
        if (row.state !== cur.state || row.state === 'CANCELLED') throw stateInvalid_();
        cUpdate_(ctx, row);
      }
      var before = isNew ? null : { period_from: row.period_from, period_to: row.period_to, meeting_date: row.meeting_date, decisions: mrDecisions_(row).length };
      row.period_from = from; row.period_to = to; row.meeting_date = meet;
      Object.keys(fill).forEach(function (k) { row[k] = fill[k]; });
      Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
      row.i18n_meta = Object.assign({}, row.i18n_meta || {}, tr.meta);
      row.decisions_json = decisions;
      return {
        writes: [{ sheet: 'MgmtReviews', mode: isNew ? 'insert' : 'update', row: row }], state: su, result: mreviewResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'MREVIEW', entity_id: row.review_id, before_json: before,
          after_json: { code: row.code, period_from: from, period_to: to, meeting_date: meet || undefined, decisions: decisions.length, created: isNew } }
      };
    }
  });
}

/** Bỏ lỗi trùng (cùng trường, cùng mã) */
function dedupeErrs_(errs) {
  var seen = {};
  return errs.filter(function (e) { var k = e.field + '|' + e.code; if (seen[k]) return false; seen[k] = true; return true; });
}

/* ---------------- mreview.hold ---------------- */

/** Điều kiện ghi Đã họp: ngày họp (không sau hôm nay, không trước đầu kỳ), chủ trì, kết luận */
function mrHoldErrors_(r, today) {
  var errs = [];
  if (!r.meeting_date) errs.push(fieldError_('meeting_date', 'REQUIRED'));
  else if (String(r.meeting_date) > today) errs.push(fieldError_('meeting_date', 'MR_MEETING_FUTURE'));
  if (!trimStr_(r.chair_name)) errs.push(fieldError_('chair_name', 'REQUIRED'));
  if (!trimStr_(r.conclusion_vi) && !trimStr_(r.conclusion_zh)) errs.push(fieldError_('conclusion', 'REQUIRED_ONE_LANGUAGE'));
  return errs;
}

function precheckMreviewHold_(ctx) {
  var p = ctx.req.payload || {};
  var r = loadMreview_(ctx, p.review_id);
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  if (p.undo === true) {
    if (r.state !== 'HELD') throw stateInvalid_();
    if (mrDecisions_(r).some(function (d) { return d.state === 'DONE'; })) throw validationError_([fieldError_('decisions', 'MR_DECISION_DONE')]);
  } else {
    if (r.state !== 'DRAFT') throw stateInvalid_();
    var errs = mrHoldErrors_(r, todayVN_());
    if (errs.length) throw validationError_(errs);
  }
  return r;
}

/**
 * mreview.hold {review_id} (Thư ký ISO, PIN): Đang chuẩn bị → Đã họp — chốt số liệu (stats_json), khóa kỳ và nhận xét đầu vào.
 * {review_id, undo: true}: mở lại (Đã họp → Đang chuẩn bị) khi chưa quyết định nào xong; số liệu tính lại lúc xem.
 */
function mreviewHold_(ctx) {
  var p = ctx.req.payload || {};
  var r = precheckMreviewHold_(ctx);
  var undo = p.undo === true;
  var today = todayVN_();
  var snap = undo ? null : mrStatsOf_(Object.assign({}, r, { state: 'DRAFT' }), today); // gom số liệu ngoài khóa ghi
  if (snap) { snap.live = false; snap.at = isoVN_(now_()); }
  if (snap && JSON.stringify(snap).length > 45000) throw validationError_([fieldError_('stats', 'REPORT_TOO_LARGE')]);
  return executeWrite_(ctx, {
    entity_type: 'MREVIEW', entity_id: r.review_id,
    build: function () {
      var row = lockedRow_(ctx, 'MgmtReviews', 'review_id', r.review_id, 'MREVIEW', true);
      if (row.state !== (undo ? 'HELD' : 'DRAFT')) throw stateInvalid_();
      if (undo && mrDecisions_(row).some(function (d) { return d.state === 'DONE'; })) throw validationError_([fieldError_('decisions', 'MR_DECISION_DONE')]);
      if (!undo) { var e2 = mrHoldErrors_(row, today); if (e2.length) throw validationError_(e2); }
      cUpdate_(ctx, row);
      if (undo) { row.state = 'DRAFT'; row.stats_json = null; row.stats_at = ''; row.held_at = ''; row.held_by = ''; }
      else { row.state = 'HELD'; row.stats_json = snap; row.stats_at = snap.at; row.held_at = isoVN_(now_()); row.held_by = ctx.user.user_id; }
      return {
        writes: [{ sheet: 'MgmtReviews', mode: 'update', row: row }], result: mreviewResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'MREVIEW', entity_id: row.review_id, before_json: { state: undo ? 'HELD' : 'DRAFT' },
          after_json: { state: row.state, code: row.code, meeting_date: undo ? undefined : row.meeting_date } }
      };
    }
  });
}

/* ---------------- mreview.decision ---------------- */

/**
 * mreview.decision {review_id, decision_id, state: DONE | OPEN | CANCELLED, done_date? (DONE, mặc định hôm nay), note?} — cuộc xem xét đã họp.
 * Xong / mở lại: Thư ký ISO hoặc người phụ trách quyết định; hủy: Thư ký ISO (ghi chú = lý do, bắt buộc).
 */
function mreviewDecision_(ctx) {
  var p = ctx.req.payload || {};
  var r = loadMreview_(ctx, p.review_id);
  if (r.state !== 'HELD') throw stateInvalid_();
  var d = mrDecisions_(r).filter(function (x) { return x.id === p.decision_id; })[0];
  if (!d) throw validationError_([fieldError_('decision_id', 'NOT_FOUND')]);
  var sec = isSecretary_(ctx.user);
  var to = String(p.state || '');
  if (MR_DECISION_STATES_.indexOf(to) < 0) throw validationError_([fieldError_('state', 'INVALID_VALUE')]);
  if (!sec && !(d.owner_user_id && d.owner_user_id === ctx.user.user_id && to !== 'CANCELLED' && d.state !== 'CANCELLED')) throw apiError_('FORBIDDEN');
  if ((d.state || 'OPEN') === to) throw stateInvalid_();
  var errs = [];
  var today = todayVN_();
  var date = '';
  if (to === 'DONE') {
    date = capaDateIn_(errs, p, 'done_date') || today;
    if (!errs.length && date > today) errs.push(fieldError_('done_date', 'DATE_FUTURE'));
  }
  var note = trimStr_(p.note);
  if (note.length > 1000) errs.push(fieldError_('note', 'TOO_LONG'));
  if (to === 'CANCELLED' && !note) errs.push(fieldError_('note', 'REQUIRED'));
  if (errs.length) throw validationError_(errs);
  return executeWrite_(ctx, {
    entity_type: 'MREVIEW', entity_id: r.review_id,
    build: function () {
      var row = lockedRow_(ctx, 'MgmtReviews', 'review_id', r.review_id, 'MREVIEW', true);
      if (row.state !== 'HELD') throw stateInvalid_();
      var list = mrDecisions_(row).map(function (x) { return clone_(x); });
      var cur = list.filter(function (x) { return x.id === p.decision_id; })[0];
      if (!cur) throw validationError_([fieldError_('decision_id', 'NOT_FOUND')]);
      var from = cur.state || 'OPEN';
      if (from === to) throw stateInvalid_();
      cur.state = to; cur.done_date = to === 'DONE' ? date : ''; cur.note = note; cur.by = ctx.user.user_id; cur.at = isoVN_(now_());
      cUpdate_(ctx, row);
      row.decisions_json = list;
      return {
        writes: [{ sheet: 'MgmtReviews', mode: 'update', row: row }], result: mreviewResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'MREVIEW', entity_id: row.review_id, before_json: { decision: cur.id, state: from },
          after_json: { code: row.code, decision: cur.id, state: to, done_date: date || undefined } }
      };
    }
  });
}

/* ---------------- mreview.cancel ---------------- */

function precheckMreviewCancel_(ctx) {
  var r = loadMreview_(ctx, (ctx.req.payload || {}).review_id);
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  if (r.state !== 'DRAFT') throw stateInvalid_();
  return r;
}

/** mreview.cancel {review_id, reason} (Thư ký ISO, PIN): hủy cuộc xem xét đang chuẩn bị */
function mreviewCancel_(ctx) {
  var p = ctx.req.payload || {};
  var r = precheckMreviewCancel_(ctx);
  var reason = reasonText_(p, 'reason', true, 500);
  return executeWrite_(ctx, {
    entity_type: 'MREVIEW', entity_id: r.review_id,
    build: function () {
      var row = lockedRow_(ctx, 'MgmtReviews', 'review_id', r.review_id, 'MREVIEW', true);
      if (row.state !== 'DRAFT') throw stateInvalid_();
      cUpdate_(ctx, row);
      row.state = 'CANCELLED'; row.cancelled_at = isoVN_(now_()); row.cancelled_by = ctx.user.user_id; row.cancel_reason = reason;
      return {
        writes: [{ sheet: 'MgmtReviews', mode: 'update', row: row }], result: mreviewResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'MREVIEW', entity_id: row.review_id, before_json: { state: 'DRAFT' }, after_json: { state: 'CANCELLED', code: row.code }, reason: reason }
      };
    }
  });
}

/* ---------------- mreview.stats ---------------- */

/** mreview.stats {review_id}: số liệu tự gom (đã họp: bản chốt; còn lại: tính lúc xem) — {stats: {at, from, to, live, data, blocks}} */
function mreviewStats_(ctx) {
  var r = loadMreview_(ctx, (ctx.req.payload || {}).review_id);
  if (r.state === 'CANCELLED') throw stateInvalid_();
  return { stats: mrStatsOf_(r, todayVN_()) };
}

/* ---------------- Đồng bộ (13_sync.js) ---------------- */

function syncMreviewVisible_(ctx, r) { return !!r && !r.archived_at && mreviewVisible_(ctx.user, r); }

/* ---------------- Báo cáo (27_reports.js, loại MREVIEW) ---------------- */

var MR_STATE_TONE_ = { DRAFT: 'amber', HELD: 'green', CANCELLED: 'muted' };
var MR_DEC_TONE_ = { OPEN: 'amber', DONE: 'green', CANCELLED: 'muted' };

/** Báo cáo MREVIEW {review_id}: BM-ISO-05-01 — thông tin cuộc họp, 12 mục đầu vào (số liệu + nhận xét), kết quả (kết luận, quyết định) */
function reportMreview_(ctx, f, today) {
  ensureMreviewSchema_();
  var r = findOne_('MgmtReviews', 'review_id', f.review_id);
  if (!r || r.archived_at) throw validationError_([fieldError_('filters.review_id', 'NOT_FOUND')]);
  if (!mreviewVisible_(ctx.user, r)) throw apiError_('FORBIDDEN');
  var dir = userDirectory_();
  var st = r.state === 'CANCELLED' ? null : mrStatsOf_(r, today);
  var inputs = {};
  MR_INPUTS_.forEach(function (k) { inputs[k] = { vi: r['in_' + k + '_vi'] || '', zh: r['in_' + k + '_zh'] || '' }; });
  var dec = mrDecisionRows_(r, dir, today);
  var one = {
    review_id: r.review_id, code: r.code, year: r.year, period_from: String(r.period_from || ''), period_to: String(r.period_to || ''),
    meeting_date: String(r.meeting_date || ''), place_text: r.place_text || '', chair_name: r.chair_name || '', attendees_text: r.attendees_text || '',
    state: r.state, held_at: String(r.held_at || ''), held_by: reportUserName_(dir, r.held_by), created_by: reportUserName_(dir, r.created_by),
    inputs: inputs, conclusion_vi: r.conclusion_vi || '', conclusion_zh: r.conclusion_zh || '', decisions: dec, cancel_reason: r.cancel_reason || ''
  };
  var open = dec.filter(function (d) { return d.state === 'OPEN'; }).length, late = dec.filter(function (d) { return d.late; }).length;
  return {
    data: { one: one, st: st }, rows: MR_INPUTS_.length + dec.length,
    tiles: [
      { k: 'rpt.t.mr_state', v: lab_('mr.state.' + r.state), tone: MR_STATE_TONE_[r.state] || '' },
      { k: 'rpt.t.mr_period', v: fmtDateVN_(one.period_from) + ' – ' + fmtDateVN_(one.period_to) },
      { k: 'rpt.t.mr_meeting', v: one.meeting_date ? fmtDateVN_(one.meeting_date) : '—' },
      { k: 'rpt.t.mr_decisions', v: dec.length ? (dec.length - open) + '/' + dec.length : '0', tone: late ? 'red' : open ? 'amber' : dec.length ? 'green' : '' }
    ]
  };
}

/** Dòng số liệu của một mục → [[nhãn, giá trị]] */
function mrBlockKv_(rows) {
  return (rows || []).map(function (x) { return [lab_(x.k), x.v + (x.s ? ' · ' + lab_(x.s) : '')]; });
}

/** Bố cục BM-ISO-05-01 (28_report_pdf.js reportLayout_) */
function layoutMreview_(snap) {
  var r = snap.data.one, st = snap.data.st;
  var info = [[lab_('rpt.kv.mr_no'), r.code], [lab_('mr.period'), dmy_(r.period_from) + ' – ' + dmy_(r.period_to)], [lab_('mr.meeting_date'), dmy_(r.meeting_date)],
    [lab_('mr.place'), r.place_text], [lab_('mr.chair'), r.chair_name], [lab_('mr.attendees'), r.attendees_text],
    [lab_('rpt.col.status'), lab_('mr.state.' + r.state) + (r.state === 'HELD' && r.held_at ? ' · ' + dmy_(r.held_at.slice(0, 10)) : '') + (r.state === 'CANCELLED' && r.cancel_reason ? ' — ' + r.cancel_reason : '')],
    [lab_('rpt.f.scope_depts'), st && st.data && st.data.scope ? st.data.scope : '']].filter(function (x) { return x[1]; });
  var secs = [{ heading: lab_('rpt.sec.mr_info'), kv: info }];
  if (st) {
    secs.push({ heading: lab_('rpt.sec.mr_inputs'), note: lab_(st.live ? 'rpt.note.mr_live' : 'rpt.note.mr_frozen', { D: dmy_(String(st.at || '').slice(0, 10)) + ' ' + String(st.at || '').slice(11, 16),
      F: dmy_(st.from), T: dmy_(st.to) }) });
  }
  MR_INPUTS_.forEach(function (k) {
    var kvs = st ? mrBlockKv_(st.blocks[k]) : [];
    var note = biNl_(r.inputs[k].vi, r.inputs[k].zh);
    kvs.push([lab_('mr.input_note'), note || '—']);
    var sec = { heading: lab_('mr.in.' + k), kv: kvs };
    secs.push(sec);
    if (k === 'prev' && st && st.data.prev && st.data.prev.decisions.length) {
      var tones = [];
      var rows = st.data.prev.decisions.map(function (d) {
        tones.push(['', '', '', '', d.late ? 'red' : '', d.late ? 'red' : MR_DEC_TONE_[d.state] || '']);
        return [String(d.n), labNl_('mr.kind.' + d.kind), biNl_(d.text_vi, d.text_zh), d.owner, dmy_(d.due), labNl_('mr.dstate.' + d.state) +
          (d.state === 'DONE' && d.done_date ? '\n' + dmy_(d.done_date) : '') + (d.late ? '\n' + lab_('capa.overdue') : '') + (d.note ? '\n' + d.note : '')];
      });
      secs.push({ heading: lab_('rpt.sec.mr_prev_dec', { C: st.data.prev.code }), table: rptTable_(mrDecHead_(), ['mid', 'text', 'text', 'text', 'date', 'text'], rows, tones) });
    }
    if (k === 'monitoring' && st && st.data.records && st.data.records.depts.length > 1) {
      var rt = [];
      var rrows = st.data.records.depts.map(function (d) {
        rt.push(['', '', '', d.late ? 'red' : '', d.late ? 'red' : d.ok ? 'green' : '']);
        return [d.dept_code + ' · ' + biText_(d.name_vi, d.name_zh), String(d.items), String(d.ok), String(d.late), reportPctText_(d.rate)];
      });
      secs.push({ heading: lab_('rpt.sec.mr_records'), table: rptTable_([labNl_('rpt.col.dept'), labNl_('rpt.col.tracked'), labNl_('rpt.col.ok'), labNl_('rpt.col.late'),
        labNl_('rpt.col.rate')], ['text', 'num', 'num', 'num', 'num'], rrows, rt) });
    }
  });
  if (r.state === 'HELD' || r.conclusion_vi || r.conclusion_zh || r.decisions.length) {
    secs.push({ heading: lab_('rpt.sec.mr_outputs'), kv: [[lab_('mr.conclusion'), biNl_(r.conclusion_vi, r.conclusion_zh) || '—']] });
    var dt = [];
    var drows = r.decisions.map(function (d) {
      dt.push(['', '', '', '', d.late ? 'red' : '', d.late ? 'red' : MR_DEC_TONE_[d.state] || '']);
      return [String(d.n), labNl_('mr.kind.' + d.kind), biNl_(d.text_vi, d.text_zh), d.owner, dmy_(d.due), labNl_('mr.dstate.' + d.state) +
        (d.state === 'DONE' && d.done_date ? '\n' + dmy_(d.done_date) : '') + (d.late ? '\n' + lab_('capa.overdue') : '') + (d.note ? '\n' + d.note : '')];
    });
    secs.push({ heading: lab_('rpt.sec.mr_decisions'), table: drows.length ? rptTable_(mrDecHead_(), ['mid', 'text', 'text', 'text', 'date', 'text'], drows, dt) : null,
      note: drows.length ? '' : lab_('mr.decisions_none') });
  }
  return {
    sections: secs, notes: [lab_('rpt.note.mreview')],
    sign: { prepared: lab_('rpt.sign.mr_secretary'), approved: lab_('rpt.sign.mr_chair'), prepared_name: r.created_by, approved_name: r.chair_name }
  };
}

function mrDecHead_() {
  return [labNl_('mr.dec_no'), labNl_('mr.kind'), labNl_('mr.dec_text'), labNl_('mr.dec_owner'), labNl_('mr.dec_due'), labNl_('rpt.col.status')];
}

/* ---------------- Trạng thái hệ thống ---------------- */

/** Dòng healthCheck `mreview`: lần xem xét gần nhất, quyết định đang làm / quá hạn, cuộc đang chuẩn bị. Chỉ thiếu sheet mới là cảnh báo. */
function mreviewHealth_() {
  if (!mreviewSchemaReady_()) return [false, 'Thiếu sheet MgmtReviews', 'Chạy migrateSchema'];
  var today = todayVN_();
  var all = readRows_('MgmtReviews').filter(function (r) { return !r.archived_at && r.state !== 'CANCELLED'; });
  var held = all.filter(function (r) { return r.state === 'HELD'; }).sort(function (a, b) { return String(b.meeting_date).localeCompare(String(a.meeting_date)); });
  var draft = all.filter(function (r) { return r.state === 'DRAFT'; });
  var dec = [];
  held.forEach(function (r) { dec = dec.concat(mrDecisions_(r)); });
  var open = dec.filter(function (d) { return (d.state || 'OPEN') === 'OPEN'; });
  var late = open.filter(function (d) { return d.due && String(d.due) < today; }).length;
  var last = held[0];
  var val = (last ? 'Gần nhất ' + last.code + ' họp ' + fmtDateVN_(last.meeting_date) : 'Chưa có cuộc xem xét đã họp') + ' · đang chuẩn bị ' + draft.length +
    ' · quyết định đang làm ' + open.length + ' · quá hạn ' + late;
  var note = '';
  if (!last) note = 'Xem xét lãnh đạo → Lập cuộc xem xét (ISO 9001 điều 9.3, ít nhất mỗi năm một lần)';
  else if (daysBetweenIso_(String(last.meeting_date), today) > 365) note = 'Đã quá 12 tháng từ lần xem xét gần nhất';
  else if (late) note = 'Xem xét lãnh đạo → quyết định quá hạn';
  return [true, val, note];
}
