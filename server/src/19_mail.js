/* 19_mail: Gmail nhắc hạn (Đợt 2, phiên 2b — mục "Nhắc hạn, báo cáo, tem QR" của đặc tả; cách làm như M&E 19_alerts).
 * Năm loại nhắc (Đợt 4 thêm đánh giá nội bộ):
 *  - REC_OVERDUE   Hồ sơ quá hạn → trưởng bộ phận (bộ phận chưa có trưởng → Thư ký ISO): tóm tắt sáng thứ Hai hằng tuần, mỗi biểu
 *                  có kỳ đến hạn xét bị Quá hạn (record.status overdue, cả biểu in từ M&E / Checksheet) một dòng; tuần sau còn quá hạn
 *                  thì nhắc lại.
 *  - REVIEW_DUE    Tài liệu đến hạn rà soát → người phụ trách tài liệu + Thư ký ISO: mốc 30, 7, 0 ngày trước hạn; quá hạn nhắc mỗi 7 ngày.
 *  - VERSION_WAIT  Phiên bản chờ duyệt / chờ ban hành quá version_wait_days (3) ngày → người duyệt / Thư ký ISO: mỗi ngày làm việc
 *                  (Thứ Hai – Thứ Sáu) tới khi xử lý.
 *  - CAPA_DUE      Khắc phục (3a, 32_capa.js): hành động đến hạn → người phụ trách hành động: mốc 7, 1, 0 ngày trước hạn; quá hạn mỗi 7 ngày
 *                  (phiếu chưa có hành động đang mở → người phụ trách phiếu, theo hạn của phiếu).
 *  - CAPA_VERIFY   Hạn kiểm tra hiệu lực của phiếu chờ kiểm tra → trưởng bộ phận / Thư ký ISO, cùng mốc.
 *  - CAPA_REPLY    Khiếu nại khách hàng / SCAR (3b) chưa phản hồi → người phụ trách phiếu theo hạn phản hồi, cùng mốc.
 *  - NCR_DECIDE    Sản phẩm không phù hợp (3c, 34_ncr.js) chờ quyết định xử lý → trưởng bộ phận / Quản trị theo hạn quyết định, cùng mốc.
 *  - NCR_DUE       Sản phẩm không phù hợp đang xử lý → người phụ trách theo hạn thực hiện, cùng mốc.
 *  - AUDIT_SOON    Đợt đánh giá nội bộ (4a, 35_iaudit.js) có ngày đánh giá trong audit_notice_days ngày tới → đoàn đánh giá, trưởng bộ phận
 *                  được đánh giá (một lần cho mỗi ngày đánh giá; dời ngày thì báo lại).
 * Người nhận phải có email do Quản trị (cấp 4) xác nhận (Users.email_confirmed_at; đổi email thì mất xác nhận). Người nhận chính chưa
 * có email đã xác nhận → gửi Thư ký ISO thay (via FALLBACK), không để mất nhắc.
 * NotificationLogs là hàng chờ: QUEUED → SENDING → SENT | FAILED (thử lại tối đa 3 lần) | UNKNOWN (SENDING quá 1 giờ: có thể đã gửi,
 * chỉ gửi lại tay); SKIPPED khi việc đã xử lý / mốc đã qua (SUPERSEDED). Chống gửi trùng bằng dedupe_key = người nhận|loại|hồ sơ|mốc.
 * Mỗi người nhận một thư tổng hợp mỗi lần chạy. Hạn mức Gmail (MailApp) dùng chung với M&E và Checksheet (cùng tài khoản Google):
 * ISO dừng gửi khi còn ≤ mail_quota_reserve người nhận; mỗi lần chạy ghi hạn mức còn lại để theo dõi (màn Gmail, Trạng thái hệ thống).
 */

var MAIL_KINDS_ = ['REC_OVERDUE', 'REVIEW_DUE', 'VERSION_WAIT', 'CAPA_DUE', 'CAPA_VERIFY', 'CAPA_REPLY', 'NCR_DECIDE', 'NCR_DUE', 'AUDIT_SOON'];
var MAIL_MAX_ATTEMPTS_ = 3;
var MAIL_STALE_MS_ = 3600000;
var MAIL_SENDER_ = 'ISO · 体系管理';

/* ---------------- Tiện ích ---------------- */

/** Bảng tính đã có cột của 2b (Users.email_confirmed_at, NotificationLogs.kind) */
function mailSchemaReady_() {
  try { return hdr_('Users').idx.email_confirmed_at !== undefined && hdr_('NotificationLogs').idx.kind !== undefined; } catch (e) { return false; }
}

/** Dán Code.gs 2b mà quên migrateSchema: tự thêm cột rồi mới làm */
function ensureMailSchema_() {
  if (mailSchemaReady_()) return;
  autoMigrate_();
  dbReset_();
  if (!mailSchemaReady_()) throw apiError_('SYSTEM_NOT_READY');
}

/** Email nhận nhắc của người dùng: chỉ khi đang hoạt động, có email và đã được Quản trị xác nhận */
function confirmedEmail_(u) {
  return u && u.active && u.email && u.email_confirmed_at ? String(u.email) : '';
}

/** Thư ký ISO nhận nhắc: người có cờ Thư ký ISO đang hoạt động; chưa có ai thì Quản trị (cấp 4) */
function mailSecretaries_(users) {
  var sec = users.filter(function (u) { return u.active && u.iso_secretary; });
  return sec.length ? sec : users.filter(function (u) { return u.active && Number(u.role_level) === 4; });
}

/** Thứ trong tuần: 1 = Thứ Hai … 7 = Chủ nhật */
function weekdayOf_(iso) {
  return new Date(iso + 'T00:00:00Z').getUTCDay() || 7;
}

/** Mốc nhắc rà soát theo số ngày còn lại (âm = quá hạn): null khi còn hơn 30 ngày */
function reviewStage_(dr) {
  if (dr === null || dr === undefined || isNaN(dr) || dr > 30) return null;
  if (dr > 7) return 'D30';
  if (dr > 0) return 'D7';
  if (dr > -7) return 'D0';
  return 'OD' + Math.floor(-dr / 7);
}

/** Tên hai thứ tiếng của bản ghi (thêm nhãn dịch máy khi bên kia do máy dịch) */
function mailName_(o, f) {
  if (!o) return '';
  var vi = o[f + '_vi'] || '', zh = o[f + '_zh'] || '';
  var meta = o.i18n_meta && o.i18n_meta[f];
  var mt = meta && meta.state === 'MACHINE' ? ' (dịch máy · 机器翻译)' : '';
  return vi && zh ? vi + ' · ' + zh + mt : (vi || zh);
}

function mailBase_() {
  var b = String(setting_('app_base_url') || '');
  return b ? b.replace(/\/?$/, '/') : '';
}

/** Ngữ cảnh một lần tính: người dùng, bộ phận, Thư ký ISO, ngày */
function mailCtx_(today) {
  var users = readRows_('Users');
  var byId = {};
  users.forEach(function (u) { byId[u.user_id] = u; });
  var depts = {};
  readRows_('Depts').forEach(function (d) { depts[d.dept_code] = d; });
  var wd = weekdayOf_(today);
  return {
    today: today, users: users, byId: byId, depts: depts, secretaries: mailSecretaries_(users), wd: wd,
    grace: graceDays_(), wait: Math.max(1, Number(setting_('version_wait_days')) || 3)
  };
}

function deptName_(mc, code) {
  var d = mc.depts[code];
  return d ? code + ' — ' + mailName_(d, 'name') : code;
}

function userName_(mc, uid) {
  var u = mc.byId[uid];
  return u ? u.display_name : '';
}

/** Người duyệt phiên bản chờ duyệt: trưởng bộ phận (tài liệu cấp bộ phận, nếu được duyệt bản này); không có thì Quản trị (cấp 4)
 *  được duyệt, ưu tiên người khác người soạn */
function versionApprovers_(mc, it, v) {
  if (it.level !== 'COMPANY') {
    var d = mc.depts[it.dept_code];
    var h = d && d.head_user_id ? mc.byId[d.head_user_id] : null;
    if (h && h.active && canApprove_(h, it, v)) return [h.user_id];
  }
  var admins = mc.users.filter(function (u) { return u.active && Number(u.role_level) >= 4 && canApprove_(u, it, v); });
  var others = admins.filter(function (u) { return u.user_id !== v.author_id; });
  return (others.length ? others : admins).map(function (u) { return u.user_id; });
}

/* ---------------- Việc cần nhắc ---------------- */

/**
 * Việc cần nhắc hôm nay: [{kind, entity_type, entity_id, stage, due_date, to: [user_id], detail, queue}].
 * queue = false: việc vẫn đang mở nhưng hôm nay không xếp thư mới (tóm tắt hồ sơ quá hạn chỉ sáng thứ Hai; phiên bản chờ chỉ ngày
 * làm việc) — dòng đã xếp hàng của nó không bị bỏ. opts.all: coi như thứ Hai và ngày làm việc (gửi thử, xem trước).
 */
function mailDesired_(mc, opts) {
  opts = opts || {};
  var out = [];
  var today = mc.today;
  var items = readRows_('Items').filter(function (it) { return !it.archived_at && inScope_(it); });
  var itemById = {};
  items.forEach(function (it) { itemById[it.item_id] = it; });
  var monday = opts.all || mc.wd === 1;
  var workday = opts.all || mc.wd <= 5;

  // 1. Hồ sơ quá hạn — tóm tắt tuần
  if (sheetExists_('Records')) {
    var all = recordStatusAll_();
    var week = isoWeekKey_(today);
    items.forEach(function (it) {
      var a = all.items[it.item_id];
      if (!a || a[6] !== 'L') return;
      var s = expandRecordStatus_(it, a, all.today, all.n);
      var cell = s.cells.filter(function (c) { return c.key === s.due_key; })[0];
      var deadline = cell ? addDaysIso_(cell.to, all.grace) : '';
      var d = mc.depts[it.dept_code];
      var head = d && d.head_user_id ? mc.byId[d.head_user_id] : null;
      var to = head && head.active ? [head.user_id] : mc.secretaries.map(function (u) { return u.user_id; });
      out.push({
        kind: 'REC_OVERDUE', entity_type: 'ITEM', entity_id: it.item_id, stage: week, due_date: deadline, to: to, queue: monday,
        detail: {
          code: it.code, name: mailName_(it, 'name'), dept_code: it.dept_code, dept: deptName_(mc, it.dept_code), type: s.type,
          due_key: s.due_key, deadline: deadline, late_n: s.late_n, last_date: s.last_date, src: s.src || '', path: '/item/' + it.item_id,
          dept_path: '/records?dept=' + encodeURIComponent(it.dept_code) + '&f=late'
        }
      });
    });
  }

  // 2. Tài liệu đến hạn rà soát — mốc 30, 7, 0 ngày; quá hạn mỗi 7 ngày
  items.forEach(function (it) {
    if (it.status !== 'ISSUED' || !isDateStr_(String(it.review_due || ''))) return;
    var dr = daysBetweenIso_(today, it.review_due);
    var stage = reviewStage_(dr);
    if (!stage) return;
    var to = [];
    var ow = it.owner_user_id ? mc.byId[it.owner_user_id] : null;
    if (ow && ow.active) to.push(ow.user_id);
    mc.secretaries.forEach(function (u) { if (to.indexOf(u.user_id) < 0) to.push(u.user_id); });
    out.push({
      kind: 'REVIEW_DUE', entity_type: 'ITEM', entity_id: it.item_id, stage: it.review_due + ':' + stage, due_date: it.review_due, to: to, queue: true,
      detail: {
        code: it.code, name: mailName_(it, 'name'), dept_code: it.dept_code, dept: deptName_(mc, it.dept_code), review_due: it.review_due,
        rev: it.current_rev || '', issued_at: it.issued_at || '', owner: ow ? ow.display_name : '', mark: stage, path: '/item/' + it.item_id
      }
    });
  });

  // 3. Phiên bản chờ duyệt / chờ ban hành quá version_wait_days ngày — mỗi ngày làm việc
  if (sheetExists_('Versions')) {
    readRows_('Versions').forEach(function (v) {
      if (v.archived_at || (v.state !== 'IN_REVIEW' && v.state !== 'APPROVED')) return;
      var it = itemById[v.item_id];
      if (!it) return;
      var since = String((v.state === 'IN_REVIEW' ? v.submitted_at : v.approved_at) || '').slice(0, 10);
      if (!isDateStr_(since)) return;
      var waited = daysBetweenIso_(since, today);
      if (waited <= mc.wait) return;
      var to = v.state === 'IN_REVIEW' ? versionApprovers_(mc, it, v) : mc.secretaries.map(function (u) { return u.user_id; });
      out.push({
        kind: 'VERSION_WAIT', entity_type: 'VERSION', entity_id: v.version_id, stage: v.state + ':' + today, due_date: since, to: to, queue: workday,
        detail: {
          code: it.code, name: mailName_(it, 'name'), dept_code: it.dept_code, dept: deptName_(mc, it.dept_code), rev: v.rev || '', state: v.state,
          vtype: v.vtype || 'REVISION', since: since, waited: waited, author: userName_(mc, v.author_id), path: '/version/' + v.version_id
        }
      });
    });
  }

  // 4. Khắc phục (3a): hành động đến hạn, hạn kiểm tra hiệu lực; khiếu nại / SCAR (3b) hạn phản hồi — mốc 7, 1, 0 ngày; quá hạn mỗi 7 ngày
  capaMailNotes_(mc, out);
  // 5. Sản phẩm không phù hợp (3c): hạn quyết định xử lý, hạn thực hiện — cùng mốc
  ncrMailNotes_(mc, out);
  // 6. Đánh giá nội bộ (4a): đợt sắp tới
  auditMailNotes_(mc, out);
  return out;
}

/**
 * Việc → dòng theo người nhận: [{key, uid, via, note}]. Người nhận chính chưa có email đã xác nhận mà không còn ai khác nhận
 * → gửi Thư ký ISO có email đã xác nhận (via FALLBACK, ghi tên người được nhắc). Không ai nhận được → mc.unreachable.
 */
function mailExpand_(mc, notes) {
  var rows = [];
  mc.unreachable = [];
  notes.forEach(function (n) {
    var to = [];
    n.to.forEach(function (id) { if (to.indexOf(id) < 0 && mc.byId[id] && mc.byId[id].active) to.push(id); });
    var ok = to.filter(function (id) { return confirmedEmail_(mc.byId[id]); });
    var via = 'PRIMARY';
    if (!ok.length) {
      ok = mc.secretaries.filter(function (u) { return confirmedEmail_(u); }).map(function (u) { return u.user_id; });
      via = 'FALLBACK';
      n.detail.for_names = to.map(function (id) { return mc.byId[id].display_name; }).join(', ');
    }
    if (!ok.length) { mc.unreachable.push(n); return; }
    ok.forEach(function (uid) { rows.push({ key: [uid, n.kind, n.entity_id, n.stage].join('|'), uid: uid, via: via, note: n }); });
  });
  return rows;
}

/* ---------------- Nội dung thư ---------------- */

function mailDays_(n) { return n + ' ngày · ' + n + '天'; }

/** Còn N ngày / hôm nay / quá hạn N ngày */
function mailDueText_(dr) {
  return dr > 0 ? 'còn · 剩余 ' + mailDays_(dr) : dr === 0 ? 'hôm nay · 今天' : 'quá hạn · 已逾期 ' + mailDays_(-dr);
}

/** Dòng thư của một việc (detail lúc xếp hàng; số ngày tính lại theo hôm nay) */
function mailLine_(kind, d, today, base) {
  var L = [];
  var link = function (p) { if (base && p) L.push('  ' + base + '#' + p); };
  L.push('• ' + d.code + ' — ' + d.name);
  if (kind === 'REC_OVERDUE') {
    L.push('  Kỳ quá hạn · 逾期期间: ' + d.due_key + ' (' + lab_('period.' + d.type) + ')' + (d.deadline ? ' — hạn chót · 截止 ' + fmtDateVN_(d.deadline) : ''));
    L.push('  Kỳ quá hạn trong 12 kỳ gần nhất · 最近12期逾期: ' + (d.late_n || 0) + ' · Hồ sơ gần nhất · 最近记录: ' + (d.last_date ? fmtDateVN_(d.last_date) : '—'));
    if (d.src) L.push('  ' + lab_('ev.check_in.' + d.src));
  } else if (kind === 'REVIEW_DUE') {
    var dr = daysBetweenIso_(today, d.review_due);
    L.push('  Hạn rà soát · 评审期限: ' + fmtDateVN_(d.review_due) + ' (' + mailDueText_(dr) + ')');
    L.push('  Lần ban hành · 版次: ' + (d.rev || '—') + (d.issued_at ? ' · ban hành · 发布 ' + fmtDateVN_(d.issued_at) : '') + (d.owner ? ' · phụ trách · 负责人: ' + d.owner : ''));
  } else if (kind === 'VERSION_WAIT') {
    var w = daysBetweenIso_(d.since, today);
    L.push('  ' + (d.state === 'IN_REVIEW' ? 'Chờ duyệt từ · 待审批自 ' : 'Đã duyệt, chờ ban hành từ · 已审批，待发布自 ') + fmtDateVN_(d.since) + ' (' + mailDays_(w) + ')' +
      ' — lần · 版次 ' + (d.rev || '—') + (d.author ? ' · người soạn · 编写人: ' + d.author : ''));
  } else if (kind === 'CAPA_DUE') {
    L.push('  ' + (d.content ? 'Hành động ' + d.seq + ' · 措施' + d.seq + ': ' + d.content : lab_(d.whole === 'DONE' ? 'mail.capa_whole_done' : 'mail.capa_whole_plan')));
    L.push('  Hạn · 期限: ' + fmtDateVN_(d.due) + ' (' + mailDueText_(daysBetweenIso_(today, d.due)) + ')' + (d.owner ? ' · phụ trách · 负责人: ' + d.owner : ''));
  } else if (kind === 'CAPA_VERIFY') {
    L.push('  ' + lab_('mail.capa_verify_n', { N: d.round || 1 }) + ' — hạn · 期限 ' + fmtDateVN_(d.due) + ' (' + mailDueText_(daysBetweenIso_(today, d.due)) + ')' +
      (d.owner ? ' · phụ trách phiếu · 单据负责人: ' + d.owner : ''));
  } else if (kind === 'CAPA_REPLY') {
    L.push('  ' + lab_(d.source === 'SUPPLIER' ? 'mail.capa_reply_supplier' : 'mail.capa_reply_customer', { P: d.party || '—' }));
    L.push('  Hạn · 期限: ' + fmtDateVN_(d.due) + ' (' + mailDueText_(daysBetweenIso_(today, d.due)) + ')' + (d.owner ? ' · phụ trách · 负责人: ' + d.owner : ''));
  } else if (kind === 'NCR_DECIDE') {
    L.push('  ' + lab_('mail.ncr_decide') + (d.qty ? ' — ' + lab_('ncr.qty') + ': ' + d.qty : ''));
    L.push('  Hạn quyết định · 决定期限: ' + fmtDateVN_(d.due) + ' (' + mailDueText_(daysBetweenIso_(today, d.due)) + ')');
  } else if (kind === 'NCR_DUE') {
    L.push('  ' + lab_('mail.ncr_due') + (d.lines ? ': ' + d.lines : ''));
    L.push('  Hạn · 期限: ' + fmtDateVN_(d.due) + ' (' + mailDueText_(daysBetweenIso_(today, d.due)) + ')' + (d.owner ? ' · phụ trách · 负责人: ' + d.owner : ''));
  } else if (kind === 'AUDIT_SOON') {
    L.push('  ' + lab_('mail.audit_soon', { D: d.dept_code + (d.dept ? ' · ' + d.dept : '') }));
    L.push('  Ngày đánh giá · 审核日期: ' + fmtDateVN_(d.due) + (d.time ? ' ' + d.time : '') + ' (' + mailDueText_(daysBetweenIso_(today, d.due)) + ')' +
      (d.place ? ' · ' + d.place : ''));
    if (d.lead || d.team) L.push('  Đoàn đánh giá · 审核组: ' + [d.lead ? d.lead + ' (trưởng đoàn · 组长)' : '', d.team].filter(function (x) { return x; }).join(', '));
  }
  if (d.for_names) L.push('  Gửi thay cho · 代为通知: ' + d.for_names + ' (chưa có email đã xác nhận · 尚无已确认邮箱)');
  link(d.path);
  return L.join('\n');
}

/**
 * Thư tổng hợp cho một người nhận. rows: [{kind, detail}] (dòng hàng chờ hoặc việc tính ngay). test: thư gửi thử.
 * Trả {to, subject, body, name}.
 */
function mailCompose_(u, rows, today, test) {
  var base = mailBase_();
  var wait = Math.max(1, Number(setting_('version_wait_days')) || 3);
  var thu = isTestEnv_() ? ' THỬ' : '';
  var body = [];
  body.push('Chào ' + u.display_name + ' · ' + u.display_name + '，您好');
  body.push('');
  if (test) {
    body.push('[THƯ THỬ · 测试邮件] Nội dung là các việc app sẽ nhắc bạn tính tới hôm nay (kể cả tóm tắt thứ Hai). Thư thử không ghi vào nhật ký gửi.');
    body.push('内容为截至今天应用将提醒您的事项（包括周一汇总）。测试邮件不记入发送日志。');
    body.push('');
  }
  if (!rows.length) {
    body.push('Hiện không có việc nào cần nhắc bạn. · 目前没有需要提醒您的事项。');
    body.push('');
  }
  MAIL_KINDS_.forEach(function (k) {
    var list = rows.filter(function (r) { return r.kind === k; });
    if (!list.length) return;
    body.push('== ' + lab_('mail.kind.' + k, { N: wait }) + ' ==');
    if (k === 'REC_OVERDUE') {
      var depts = [];
      list.forEach(function (r) { if (depts.indexOf(r.detail.dept_code) < 0) depts.push(r.detail.dept_code); });
      depts.sort().forEach(function (dc) {
        var dl = list.filter(function (r) { return r.detail.dept_code === dc; });
        body.push('Bộ phận · 部门 ' + dl[0].detail.dept + ': ' + dl.length + ' biểu · 张表' + (base ? ' — ' + base + '#' + dl[0].detail.dept_path : ''));
        dl.sort(function (a, b) { return String(a.detail.code).localeCompare(String(b.detail.code)); })
          .forEach(function (r) { body.push(mailLine_(k, r.detail, today, base)); });
      });
    } else {
      list.sort(function (a, b) { return String(a.detail.code).localeCompare(String(b.detail.code)); })
        .forEach(function (r) { body.push(mailLine_(k, r.detail, today, base)); });
    }
    body.push('');
  });
  body.push('—');
  body.push('Thư tự động từ app ISO · 体系管理, không trả lời thư này. · 本邮件由ISO应用自动发送，请勿回复。');
  body.push('Link mở bằng trình duyệt và cần đăng nhập; trên iPhone nên mở app ISO. · 链接需在浏览器中登录后打开；在iPhone上建议打开ISO应用。');
  return {
    to: u.email, name: MAIL_SENDER_,
    subject: '[ISO' + thu + '] ' + (test ? 'Gửi thử · 测试 — ' : '') + lab_('mail.subject') + ' — ' + fmtDateVN_(today),
    body: body.join('\n')
  };
}

/* ---------------- Hàng chờ và gửi ---------------- */

/** Hạn mức người nhận còn lại hôm nay (dùng chung 3 app); null khi không đọc được */
function mailQuota_() {
  try { return MailApp.getRemainingDailyQuota(); } catch (e) { return null; }
}

function mailReserve_() {
  var r = Number(setting_('mail_quota_reserve'));
  return r >= 0 ? Math.floor(r) : 10;
}

/**
 * Xếp hàng theo việc cần nhắc hôm nay rồi (send) gửi mỗi người nhận một thư. Trả số liệu
 * {queued, sent, failed, skipped, unknown, quota_stop, quota, unreachable}.
 */
function mailRun_(send) {
  ensureMailSchema_();
  var today = todayVN_();
  var nowIso = isoVN_(now_());
  var mc = mailCtx_(today);
  var rows = mailExpand_(mc, mailDesired_(mc));
  var want = {};
  rows.forEach(function (r) { want[r.key] = r; });
  var out = { queued: 0, sent: 0, failed: 0, skipped: 0, unknown: 0, quota_stop: false, quota: null, unreachable: mc.unreachable.length };
  // 1. Xếp hàng, bỏ dòng đã hết việc, SENDING quá 1 giờ → UNKNOWN (dưới khóa, đoạn ngắn)
  withWriteLock_(function () {
    var logs = readRows_('NotificationLogs');
    var have = {};
    logs.forEach(function (n) {
      if (n.status === 'SENDING') {
        var t = parseTime_(n.attempt_at);
        if (!t || now_().getTime() - t.getTime() > MAIL_STALE_MS_) { writeCells_('NotificationLogs', n.__row, { status: 'UNKNOWN' }); n.status = 'UNKNOWN'; out.unknown++; }
      }
      if ((n.status === 'QUEUED' || n.status === 'FAILED') && !want[n.dedupe_key]) {
        writeCells_('NotificationLogs', n.__row, { status: 'SKIPPED', error_code: n.status === 'FAILED' ? (n.error_code || 'SEND_FAILED') + '/SUPERSEDED' : 'SUPERSEDED' });
        n.status = 'SKIPPED';
        out.skipped++;
      }
      if (n.status !== 'SKIPPED') have[n.dedupe_key] = true;
    });
    var ins = [];
    rows.forEach(function (r) {
      if (!r.note.queue || have[r.key]) return;
      have[r.key] = true;
      ins.push({
        notification_id: uuid_(), dedupe_key: r.key, run_date: today, recipient_id: r.uid, entity_type: r.note.entity_type, entity_id: r.note.entity_id,
        due_date: r.note.due_date || '', stage: r.note.stage, status: 'QUEUED', attempt_at: '', sent_at: '', error_code: '',
        dataset_epoch: sysProps_().dataset_epoch, digest_id: '', queued_at: nowIso, attempt_count: 0, kind: r.note.kind, via: r.via, detail_json: r.note.detail
      });
    });
    if (ins.length) insertRows_('NotificationLogs', ins);
    out.queued = ins.length;
  });
  if (send) mailSendQueued_(mc, today, out);
  out.quota = mailQuota_();
  mailNote_(out);
  return out;
}

/** Dòng còn gửi được: QUEUED, hoặc FAILED chưa quá số lần thử */
function mailSendable_(n) {
  return n.status === 'QUEUED' || (n.status === 'FAILED' && (Number(n.attempt_count) || 0) < MAIL_MAX_ATTEMPTS_);
}

/** Gửi mỗi người nhận một thư; khóa chỉ giữ lúc đổi trạng thái */
function mailSendQueued_(mc, today, out) {
  var reserve = mailReserve_();
  var uids = [];
  readRows_('NotificationLogs').forEach(function (n) { if (mailSendable_(n) && uids.indexOf(n.recipient_id) < 0) uids.push(n.recipient_id); });
  for (var i = 0; i < uids.length; i++) {
    if (prop_('MAINTENANCE_MODE') === 'true') return;
    var u = mc.byId[uids[i]];
    var q = mailQuota_();
    if (q !== null && q <= reserve) { out.quota_stop = true; return; }
    var digestId = uuid_();
    var batch = withWriteLock_(function () {
      var list = readRows_('NotificationLogs').filter(function (n) { return n.recipient_id === uids[i] && mailSendable_(n); });
      if (!confirmedEmail_(u)) {
        // Người nhận mất xác nhận / bị khóa giữa lúc xếp hàng và lúc gửi: bỏ
        list.forEach(function (n) { writeCells_('NotificationLogs', n.__row, { status: 'SKIPPED', error_code: 'NO_RECIPIENT' }); });
        out.skipped += list.length;
        return [];
      }
      list.forEach(function (n) {
        writeCells_('NotificationLogs', n.__row, { status: 'SENDING', digest_id: digestId, attempt_at: isoVN_(now_()), attempt_count: (Number(n.attempt_count) || 0) + 1 });
      });
      return list;
    });
    if (!batch.length) continue;
    var ok = true, err = '';
    try {
      MailApp.sendEmail(mailCompose_(u, batch.map(function (n) { return { kind: n.kind, detail: n.detail_json || {} }; }), today, false));
    } catch (e) { ok = false; err = String(e && e.message || e).slice(0, 120); }
    withWriteLock_(function () {
      readRows_('NotificationLogs').forEach(function (n) {
        if (n.digest_id !== digestId || n.status !== 'SENDING') return;
        writeCells_('NotificationLogs', n.__row, ok ? { status: 'SENT', sent_at: isoVN_(now_()), error_code: '' } : { status: 'FAILED', error_code: err || 'SEND_FAILED' });
      });
    });
    if (ok) out.sent++; else out.failed++;
  }
}

/** Ghi kết quả lần chạy và hạn mức còn lại (SystemState mail.*) */
function mailNote_(out) {
  withWriteLock_(function () {
    var st = readState_();
    var su = {
      'mail.last_at': ['DATETIME', isoVN_(now_())],
      'mail.last_result': ['STRING', JSON.stringify({ queued: out.queued, sent: out.sent, failed: out.failed, skipped: out.skipped, unknown: out.unknown, quota_stop: out.quota_stop, unreachable: out.unreachable })]
    };
    if (out.quota !== null && out.quota !== undefined) {
      su['mail.quota_left'] = ['INT', out.quota];
      su['mail.quota_at'] = ['DATETIME', isoVN_(now_())];
    }
    stateWrite_(st, su, SYSTEM_USER);
  });
  cache_().remove('sys:state');
}

/* ---------------- Trigger ---------------- */

/** Trigger hằng ngày lúc email_hour: Gmail tắt hoặc bảo trì thì không làm gì */
function sendDueMail() {
  var t0 = Date.now();
  propsReset_(true);
  try {
    dbReset_();
    if (!prop_('BUSINESS_SPREADSHEET_ID') || prop_('MAINTENANCE_MODE') === 'true') return;
    if (!setting_('gmail_enabled')) return;
    var r = mailRun_(true);
    log_('sendDueMail: xếp ' + r.queued + ', gửi ' + r.sent + ' thư, lỗi ' + r.failed + ', bỏ ' + r.skipped + (r.quota_stop ? ', dừng vì hạn mức Gmail còn ít' : '') + '.');
  } finally {
    try { recordTriggerRun_('sendDueMail', t0); } catch (e) { /* bỏ qua */ }
    propsReset_(false);
  }
}

/** Đặt lại trigger sendDueMail đúng giờ gửi (bật Gmail, đổi giờ) */
function installMailTrigger_() {
  try {
    ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'sendDueMail') ScriptApp.deleteTrigger(t); });
    ScriptApp.newTrigger('sendDueMail').timeBased().everyDays(1).atHour(Number(setting_('email_hour'))).inTimezone(TZ).create();
    return true;
  } catch (e) {
    console.warn('installMailTrigger_ ' + (e && e.message));
    return false;
  }
}

function mailTriggerOn_() {
  try { return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'sendDueMail'; }); } catch (e) { return false; }
}

/** Chạy từ trình soạn: xếp hàng và gửi ngay như trigger (Gmail phải đang bật), in kết quả */
function adminSendMailNow() {
  dbReset_();
  if (!setting_('gmail_enabled')) { log_('Gmail nhắc hạn đang TẮT — không gửi. Bật ở app: Tài khoản → Quản trị → Gmail nhắc hạn.'); return; }
  var r = mailRun_(true);
  log_('Xếp ' + r.queued + ', gửi ' + r.sent + ' thư, lỗi ' + r.failed + ', bỏ ' + r.skipped + ', không ai nhận ' + r.unreachable +
    (r.quota_stop ? ', dừng vì hạn mức Gmail còn ít' : '') + '. Hạn mức Gmail còn ' + r.quota + ' người nhận hôm nay (dùng chung M&E, Checksheet).');
}

/* ---------------- Action ---------------- */

/** Dòng người nhận gửi app: vai trò nhận nhắc và email (Quản trị) */
function mailRecipientInfo_(ctx, mc, u, itemsN) {
  var heads = Object.keys(mc.depts).filter(function (k) { return mc.depts[k].head_user_id === u.user_id && mc.depts[k].active !== false; }).sort();
  var isSec = mc.secretaries.some(function (s) { return s.user_id === u.user_id; });
  return {
    user_id: u.user_id, employee_code: u.employee_code, display_name: u.display_name, role_level: Number(u.role_level),
    iso_secretary: !!u.iso_secretary, is_system_owner: !!u.is_system_owner, record_version: u.record_version || 1,
    email: u.email || '', confirmed_at: u.email_confirmed_at || '', confirmed_by_name: userName_(mc, u.email_confirmed_by),
    can_edit: !u.is_system_owner || !!ctx.user.is_system_owner,
    roles: { heads: heads, secretary: isSec, secretary_fallback: isSec && !u.iso_secretary, docs: itemsN[u.user_id] || 0, admin: Number(u.role_level) >= 4 }
  };
}

/** mail.view (Quản trị): cài đặt, hạn mức, người nhận, xem trước việc hôm nay, nhật ký gửi */
function mailView_(ctx) {
  ensureMailSchema_();
  var today = todayVN_();
  var mc = mailCtx_(today);
  var notes = mailDesired_(mc, { all: true });
  var rows = mailExpand_(mc, notes);
  var logs = readRows_('NotificationLogs');
  var byKey = {};
  logs.forEach(function (n) { if (n.status !== 'SKIPPED') byKey[n.dedupe_key] = n; });
  var monday = mc.wd === 1, workday = mc.wd <= 5;
  var preview = rows.map(function (r) {
    var n = r.note, l = byKey[r.key];
    var st = l ? l.status : (n.kind === 'REC_OVERDUE' && !monday ? 'MONDAY' : (n.kind === 'VERSION_WAIT' && !workday ? 'WORKDAY' : 'NEW'));
    return { user_id: r.uid, kind: n.kind, entity_id: n.entity_id, code: n.detail.code, name: n.detail.name, dept_code: n.detail.dept_code, stage: n.stage,
      due_date: n.due_date, via: r.via, for_names: n.detail.for_names || '', path: n.detail.path, state: st };
  });
  var unreachable = mc.unreachable.map(function (n) { return { kind: n.kind, code: n.detail.code, name: n.detail.name, path: n.detail.path }; });
  var itemsN = {};
  readRows_('Items').forEach(function (it) { if (!it.archived_at && inScope_(it) && it.owner_user_id) itemsN[it.owner_user_id] = (itemsN[it.owner_user_id] || 0) + 1; });
  var recipients = mc.users.filter(function (u) { return u.active; }).map(function (u) { return mailRecipientInfo_(ctx, mc, u, itemsN); });
  recipients.sort(function (a, b) { return String(a.employee_code).localeCompare(String(b.employee_code)); });
  logs.sort(function (a, b) { return String(b.queued_at || b.attempt_at).localeCompare(String(a.queued_at || a.attempt_at)); });
  var counts = { QUEUED: 0, FAILED: 0, UNKNOWN: 0, SENT: 0 };
  logs.forEach(function (n) { if (counts[n.status] !== undefined) counts[n.status]++; });
  var st = readState_();
  var last = null;
  try { last = JSON.parse(stateGet_(st, 'mail.last_result', '') || 'null'); } catch (e) { last = null; }
  var nextMonday = addDaysIso_(today, mc.wd === 1 ? 7 : 8 - mc.wd);
  return {
    today: today, weekday: mc.wd, next_monday: nextMonday,
    settings: { gmail_enabled: !!setting_('gmail_enabled'), email_hour: Number(setting_('email_hour')), version_wait_days: mc.wait,
      mail_quota_reserve: mailReserve_(), app_base_url: mailBase_() },
    trigger: mailTriggerOn_(), quota: mailQuota_(),
    last_run: { at: stateGet_(st, 'mail.last_at', ''), result: last, quota_left: stateGet_(st, 'mail.quota_left', null), quota_at: stateGet_(st, 'mail.quota_at', '') },
    recipients: recipients, preview: preview, unreachable: unreachable, counts: counts,
    logs: logs.slice(0, 150).map(function (n) {
      var u = mc.byId[n.recipient_id];
      var d = n.detail_json || {};
      return { notification_id: n.notification_id, kind: n.kind || '', status: n.status, queued_at: n.queued_at, sent_at: n.sent_at, attempt_at: n.attempt_at,
        attempt_count: Number(n.attempt_count) || 0, error_code: n.error_code || '', via: n.via || '', stage: n.stage, code: d.code || '', name: d.name || '',
        recipient: u ? u.display_name : '', email: u && u.email ? u.email : '', path: d.path || '' };
    })
  };
}

/** mail.settings.set {gmail_enabled?, email_hour?} — Quản trị, PIN. Bật Gmail / đổi giờ → đặt lại trigger sendDueMail */
function mailSettingsSet_(ctx) {
  var p = ctx.req.payload || {};
  var errs = [];
  if (p.gmail_enabled !== undefined && typeof p.gmail_enabled !== 'boolean') errs.push(fieldError_('gmail_enabled', 'INVALID_VALUE'));
  if (p.email_hour !== undefined && !(Number(p.email_hour) >= 0 && Number(p.email_hour) <= 23 && Math.floor(p.email_hour) === Number(p.email_hour))) errs.push(fieldError_('email_hour', 'INVALID_VALUE'));
  if (p.gmail_enabled === undefined && p.email_hour === undefined) errs.push(fieldError_('gmail_enabled', 'REQUIRED'));
  if (errs.length) throw validationError_(errs);
  ensureMailSchema_();
  var before = { gmail_enabled: !!setting_('gmail_enabled'), email_hour: Number(setting_('email_hour')) };
  withWriteLock_(function () {
    if (p.gmail_enabled !== undefined) writeSetting_('gmail_enabled', p.gmail_enabled, ctx.user.user_id);
    if (p.email_hour !== undefined) writeSetting_('email_hour', Number(p.email_hour), ctx.user.user_id);
    writeAudit_({ user_id: ctx.user.user_id, device_id: ctx.req.device_id, action: 'mail.settings.set', entity_type: 'SETTINGS', entity_id: 'gmail',
      before_json: before, after_json: { gmail_enabled: !!setting_('gmail_enabled'), email_hour: Number(setting_('email_hour')) },
      operation_id: ctx.req.operation_id || '', auth_basis: authBasis_(ctx) });
  });
  var on = !!setting_('gmail_enabled');
  var trig = mailTriggerOn_();
  if ((on && !trig) || (p.email_hour !== undefined && Number(p.email_hour) !== before.email_hour)) trig = installMailTrigger_();
  return { gmail_enabled: on, email_hour: Number(setting_('email_hour')), trigger: trig };
}

/** Người đích của mail.recipient.set / mail.test: tồn tại, đang hoạt động; owner chỉ owner sửa (được sửa chính mình) */
function mailTarget_(ctx, userId) {
  if (!isUuidV4_(userId)) throw validationError_([fieldError_('user_id', 'ID_INVALID')]);
  var u = findOne_('Users', 'user_id', userId);
  if (!u || !u.active) throw apiError_('NOT_FOUND');
  if (u.is_system_owner && !ctx.user.is_system_owner) throw apiError_('FORBIDDEN');
  return u;
}

function precheckMailRecipient_(ctx) {
  mailTarget_(ctx, (ctx.req.payload || {}).user_id);
}

/**
 * mail.recipient.set {user_id, email?, confirm?} — Quản trị, PIN. Đặt / đổi / xóa ('') email nhận nhắc; confirm true = Quản trị xác nhận
 * địa chỉ đúng, false = bỏ xác nhận. Đổi email thì mất xác nhận (trừ khi cùng lúc confirm). Không đổi quyền, không thu hồi phiên.
 */
function mailRecipientSet_(ctx) {
  var p = ctx.req.payload || {};
  var errs = [];
  var email = p.email !== undefined ? trimStr_(p.email).toLowerCase() : null;
  if (email && (!EMAIL_RE_.test(email) || email.length > 120)) errs.push(fieldError_('email', 'INVALID_VALUE'));
  if (p.confirm !== undefined && typeof p.confirm !== 'boolean') errs.push(fieldError_('confirm', 'INVALID_VALUE'));
  if (email === null && p.confirm === undefined) errs.push(fieldError_('email', 'REQUIRED'));
  if (errs.length) throw validationError_(errs);
  ensureMailSchema_();
  var res = executeWrite_(ctx, {
    entity_type: 'USER', entity_id: p.user_id,
    build: function () {
      var u = mailTarget_(ctx, p.user_id);
      assertUserVersion_(ctx, u);
      var row = clone_(u); delete row.__row;
      var before = { email: maskEmail_(u.email), confirmed: !!u.email_confirmed_at };
      if (email !== null && email !== String(u.email || '')) { row.email = email; row.email_confirmed_at = ''; row.email_confirmed_by = ''; }
      if (p.confirm === true) {
        if (!row.email) throw validationError_([fieldError_('email', 'EMAIL_MISSING')]);
        if (!row.email_confirmed_at) { row.email_confirmed_at = isoVN_(now_()); row.email_confirmed_by = ctx.user.user_id; }
      }
      if (p.confirm === false || !row.email) { row.email_confirmed_at = ''; row.email_confirmed_by = ''; }
      row.record_version = (u.record_version || 1) + 1;
      row.updated_at = isoVN_(now_()); row.updated_by = ctx.user.user_id;
      return {
        writes: [{ sheet: 'Users', mode: 'update', row: row }],
        result: { entity_type: 'USER', entity_id: u.user_id, record_version: row.record_version, email: row.email, confirmed_at: row.email_confirmed_at },
        record_version: row.record_version,
        audit: { entity_type: 'USER', entity_id: u.user_id, before_json: before, after_json: { email: maskEmail_(row.email), confirmed: !!row.email_confirmed_at } }
      };
    }
  });
  afterUserWrite_(p.user_id);
  return res;
}

/**
 * mail.test {user_id} — Quản trị, PIN. Gửi ngay một thư thử tới email đã xác nhận của người đó, nội dung là mọi việc app sẽ nhắc người
 * đó tính tới hôm nay (kể cả tóm tắt thứ Hai), không ghi hàng chờ (không ảnh hưởng chống gửi trùng). Gửi được cả khi Gmail đang tắt.
 */
function mailTest_(ctx) {
  var p = ctx.req.payload || {};
  ensureMailSchema_();
  var u = mailTarget_(ctx, p.user_id);
  if (!confirmedEmail_(u)) throw validationError_([fieldError_('user_id', u.email ? 'EMAIL_NOT_CONFIRMED' : 'EMAIL_MISSING')]);
  var q = mailQuota_();
  if (q !== null && q < 1) throw apiError_('QUOTA_EXCEEDED');
  var today = todayVN_();
  var mc = mailCtx_(today);
  var rows = mailExpand_(mc, mailDesired_(mc, { all: true })).filter(function (r) { return r.uid === u.user_id; })
    .map(function (r) { return { kind: r.note.kind, detail: r.note.detail }; });
  var mail = mailCompose_(u, rows, today, true);
  var err = '';
  try { MailApp.sendEmail(mail); } catch (e) { err = String(e && e.message || e).slice(0, 160); }
  withWriteLock_(function () {
    writeAudit_({ user_id: ctx.user.user_id, device_id: ctx.req.device_id, action: 'mail.test', entity_type: 'USER', entity_id: u.user_id,
      before_json: null, after_json: { to: maskEmail_(u.email), items: rows.length, ok: !err, error: err }, operation_id: ctx.req.operation_id || '', auth_basis: authBasis_(ctx) });
  });
  return { ok: !err, error: err, to: u.email, items: rows.length, quota: mailQuota_() };
}

/** mail.run — Quản trị, PIN: xếp hàng và gửi ngay như trigger (Gmail phải đang bật) */
function mailRunAction_(ctx) {
  if (!setting_('gmail_enabled')) throw validationError_([fieldError_('gmail_enabled', 'MAIL_OFF')]);
  var r = mailRun_(true);
  withWriteLock_(function () {
    writeAudit_({ user_id: ctx.user.user_id, device_id: ctx.req.device_id, action: 'mail.run', entity_type: 'SETTINGS', entity_id: 'gmail',
      before_json: null, after_json: r, operation_id: ctx.req.operation_id || '', auth_basis: authBasis_(ctx) });
  });
  return r;
}

/** mail.resend {notification_id} — Quản trị, PIN: gửi lại dòng UNKNOWN (có thể đã gửi) hoặc FAILED đã hết lượt thử */
function mailResend_(ctx) {
  var p = ctx.req.payload || {};
  if (!isUuidV4_(p.notification_id)) throw validationError_([fieldError_('notification_id', 'ID_INVALID')]);
  ensureMailSchema_();
  var n = findOne_('NotificationLogs', 'notification_id', p.notification_id);
  if (!n) throw apiError_('NOT_FOUND');
  if (!(n.status === 'UNKNOWN' || (n.status === 'FAILED' && !mailSendable_(n)))) throw validationError_([fieldError_('notification_id', 'STATUS_INVALID')]);
  var u = findOne_('Users', 'user_id', n.recipient_id);
  if (!confirmedEmail_(u)) throw validationError_([fieldError_('notification_id', 'EMAIL_NOT_CONFIRMED')]);
  var q = mailQuota_();
  if (q !== null && q < 1) throw apiError_('QUOTA_EXCEEDED');
  var err = '';
  try { MailApp.sendEmail(mailCompose_(u, [{ kind: n.kind, detail: n.detail_json || {} }], todayVN_(), false)); } catch (e) { err = String(e && e.message || e).slice(0, 120); }
  withWriteLock_(function () {
    var cur = findOne_('NotificationLogs', 'notification_id', n.notification_id);
    writeCells_('NotificationLogs', cur.__row, err ? { status: 'FAILED', error_code: err, attempt_at: isoVN_(now_()), attempt_count: (Number(cur.attempt_count) || 0) + 1 }
      : { status: 'SENT', sent_at: isoVN_(now_()), error_code: 'RESENT', attempt_count: (Number(cur.attempt_count) || 0) + 1 });
    writeAudit_({ user_id: ctx.user.user_id, device_id: ctx.req.device_id, action: 'mail.resend', entity_type: n.entity_type, entity_id: n.entity_id,
      before_json: { status: n.status }, after_json: { status: err ? 'FAILED' : 'SENT' }, operation_id: ctx.req.operation_id || '', auth_basis: authBasis_(ctx) });
  });
  return { notification_id: n.notification_id, status: err ? 'FAILED' : 'SENT', error: err };
}

/** Dòng Trạng thái hệ thống: [ok, value, note] */
function mailHealth_(st) {
  var on = !!setting_('gmail_enabled');
  if (!mailSchemaReady_()) return [false, 'Thiếu cột của bản 2b', 'Chạy migrateSchema'];
  if (!on) return [true, 'OFF', 'Tài khoản → Quản trị → Gmail nhắc hạn'];
  var users = readRows_('Users');
  var conf = users.filter(function (u) { return confirmedEmail_(u); }).length;
  var logs = readRows_('NotificationLogs');
  var bad = logs.filter(function (n) { return n.status === 'UNKNOWN' || (n.status === 'FAILED' && !mailSendable_(n)); }).length;
  var at = stateGet_(st, 'mail.last_at', ''), q = stateGet_(st, 'mail.quota_left', null);
  var t = parseTime_(at);
  var fresh = t && now_().getTime() - t.getTime() < 26 * 3600000;
  var trig = mailTriggerOn_();
  var notes = [];
  if (!conf) notes.push('Chưa có email đã xác nhận');
  if (!trig) notes.push('Thiếu trigger sendDueMail — chạy installTriggers');
  else if (at && !fresh) notes.push('Quá 26 giờ chưa chạy'); // vừa bật, chưa tới giờ gửi lần đầu: không báo
  if (bad) notes.push(bad + ' thư lỗi / chưa rõ đã gửi — xem Nhật ký gửi');
  if (q !== null && q !== '' && Number(q) <= mailReserve_()) notes.push('Hạn mức Gmail còn ít (dùng chung M&E, Checksheet)');
  var val = 'ON · ' + conf + ' người nhận đã xác nhận' + (at ? ' · chạy ' + String(at).slice(0, 16).replace('T', ' ') : '') +
    (q !== null && q !== '' ? ' · hạn mức còn ' + q : '');
  return [!notes.length, val, notes.join(' · ')];
}
