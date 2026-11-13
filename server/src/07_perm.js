/* 07_perm: bảng thao tác và quyền theo cấp (mục 4 đặc tả)
 * Cấp: 1 Tra cứu · 2 Nhân viên · 3 Trưởng bộ phận · 4 Quản trị (số lớn quyền cao, như M&E); owner là cờ riêng.
 * Cờ cộng thêm: iso_secretary (Thư ký ISO — quản lý danh mục toàn công ty, ban hành, thu hồi), auditor (Đánh giá viên, Đợt 4).
 * Phạm vi bộ phận: Users.dept_codes (rỗng = mọi bộ phận). Cấp 1–3 chỉ thấy và ghi trong bộ phận mình; tài liệu chung của
 * bộ phận ISO ai cũng xem. Thư ký ISO và cấp 4 thấy tất cả.
 */

/*
 * Mỗi dòng: mã | quyền tối thiểu | mạng | R/W
 *  - quyền: 0 = không cần phiên (public); S = chỉ cần phiên (mọi cấp); 1–4 = cấp; X = Thư ký ISO hoặc cấp 4; O = chỉ owner
 *  - mạng: net · offline (được vào hàng chờ) · pin (phải nhập lại PIN) · public · session
 * Action có ở đây mà chưa có ở HANDLERS_ (09_api.js) → FEATURE_NOT_ENABLED (màn của phiên/đợt sau hiện "Sắp có").
 */
var ACTION_TABLE_ = [
  'auth.login|0|public|R',
  'system.health|0|public|R',
  'system.getPublicState|0|public|R',
  'auth.reauth|S|session|R',
  'auth.logout|S|session|R',
  'account.view|S|session|R',
  'pin.change|S|session|R',
  'session.listOwn|S|session|R',
  'session.revokeOwn|S|session|R',
  'auth.logoutAll|S|pin|R',
  'sync.bootstrap|S|session|R',
  'sync.changes|S|session|R',
  'sync.push|S|session|R',
  'sync.getOperationStatus|S|session|R',
  // Danh mục (phiên 1a): sửa thông tin biểu/tài liệu, bộ phận, nhập Excel tổng (xem trước rồi ghi, lô ≤ 100 dòng)
  'item.edit|X|net|W',
  'dept.edit|4|pin|W',
  'import.preview|X|net|W',
  'import.list|X|net|R',
  'import.rows|X|net|R',
  'import.commit|X|pin|W',
  'import.cancel|X|net|W',
  'i18n.suggest|2|net|R',
  // Kho tệp mẫu (2e): bộ biểu xlsx (nhiều sheet, mỗi sheet một mã biểu) hoặc docx/pdf — mọi cấp xem và tải (doc.get); Thư ký ISO / cấp 4
  // tải lên (tệp cùng bộ thay tệp cũ), sửa tên / ghi chú, bỏ tệp tải nhầm (PIN)
  'tpl.upload|X|net|W',
  'tpl.edit|X|net|W',
  'tpl.delete|X|pin|W',
  // Phiên bản & ban hành (phiên 1b). Quyền theo bộ phận, cấp công ty, người soạn kiểm thêm ở PRECHECK_ (trước khi hỏi PIN)
  'version.save|2|net|W',
  'version.submit|2|net|W',
  'version.approve|3|pin|W',
  'version.return|2|pin|W',
  'version.issue|X|pin|W',
  'version.cancel|2|net|W',
  'item.setNa|X|pin|W',
  'item.review|X|pin|W',
  'doc.upload|2|offline|W',
  'doc.get|1|net|R',
  // Hồ sơ (phiên 1c): nộp được khi mất mạng; trả lại — trưởng bộ phận trong bộ phận, Thư ký ISO, cấp 4 (kiểm ở PRECHECK_ trước PIN)
  'record.submit|2|offline|W',
  'record.return|2|pin|W',
  'record.status|2|net|R',
  // Kiểm soát tài liệu (phiên 2d): phiếu đề nghị ban hành / sửa đổi / hủy (BM-ISO-02-02) — gửi, sửa, xem xét (PIN), rút lại, đã thực hiện;
  // sổ phân phối & thu hồi bản in (BM-ISO-02-03) — phát, thu hồi (PIN), sửa / bỏ dòng ghi nhầm. Quyền theo phiếu kiểm ở PRECHECK_ (trước PIN)
  'docreq.save|2|net|W',
  'docreq.approve|3|pin|W',
  'docreq.reject|3|pin|W',
  'docreq.cancel|2|net|W',
  'docreq.done|X|pin|W',
  'dist.issue|X|net|W',
  'dist.recall|X|pin|W',
  'dist.edit|X|net|W',
  // Báo cáo (phiên 2c): xem trước (không lưu); lưu có mã BC-yymm-001 rồi tải PDF (máy chủ dựng) / Excel (app dựng); báo cáo đã lưu.
  // Loại báo cáo theo cấp kiểm trong 27_reports.js: Danh mục, Lịch sử phiên bản mọi cấp; Tình trạng hồ sơ, Phủ điều khoản cấp 2+ / Thư ký ISO
  'report.run|1|net|R',
  'report.save|1|net|W',
  'report.list|1|net|R',
  // Kết nối M&E / Checksheet (phiên 2a): link /exec + mã kết nối của từng app; thử kết nối; Cập nhật ngay
  'link.info|4|net|R',
  'link.test|4|net|R',
  'link.set|4|pin|W',
  'evidence.sync|4|net|W',
  // Gmail nhắc hạn (phiên 2b): người nhận (email do Quản trị xác nhận), bật/tắt, giờ gửi, gửi thử, gửi ngay, nhật ký
  'mail.view|4|net|R',
  'mail.settings.set|4|pin|W',
  'mail.recipient.set|4|pin|W',
  'mail.test|4|pin|W',
  'mail.run|4|pin|W',
  'mail.resend|4|pin|W',
  // Khắc phục (Đợt 3, phiên 3a): phiếu KP-yymm-001 (BM-CĐ-14-02) — lập / sửa, hành động (thêm, sửa, báo xong, hủy), gửi kiểm tra hiệu lực;
  // kiểm tra hiệu lực, hủy phiếu hỏi PIN. Quyền theo phiếu (bộ phận, người phụ trách, người lập) kiểm ở handler / PRECHECK_ (trước PIN)
  'capa.save|2|net|W',
  'capa.action.save|2|net|W',
  'capa.action.done|2|net|W',
  'capa.action.cancel|2|net|W',
  'capa.complete|2|net|W',
  'capa.verify|2|pin|W',
  'capa.cancel|2|pin|W',
  'capa.reply|2|net|W',
  // Sản phẩm không phù hợp (Đợt 3, phiên 3c): phiếu NC-yymm-001 (BM-CL-04-01) — lập / sửa; quyết định xử lý (PIN; trưởng bộ phận, cấp 4 — nhân
  // nhượng / hủy bỏ chỉ cấp 4); xác nhận xong xử lý (PIN), hủy phiếu (PIN). Quyền theo phiếu kiểm ở handler / PRECHECK_ (trước PIN)
  'ncr.save|2|net|W',
  'ncr.decide|3|pin|W',
  'ncr.close|2|pin|W',
  'ncr.cancel|2|pin|W',
  // Đánh giá nội bộ (Đợt 4, phiên 4a): chương trình năm DG-yy (Thư ký ISO lập, Quản trị duyệt / trả lại — PIN; sửa chương trình đã duyệt, hủy
  // — PIN), đợt DG-yy-01 (thêm / bỏ khi chương trình Nháp), kế hoạch đợt + checklist (Thư ký ISO, trưởng đoàn), ghi kết quả (cả người trong
  // đoàn). Quyền theo đợt kiểm ở handler / PRECHECK_ (trước PIN)
  'iaudit.program.save|X|net|W',
  'iaudit.program.submit|X|net|W',
  'iaudit.program.approve|4|pin|W',
  'iaudit.program.return|4|pin|W',
  'iaudit.program.reopen|X|pin|W',
  'iaudit.program.cancel|X|pin|W',
  'iaudit.save|2|net|W',
  'iaudit.cancel|X|net|W',
  'iaudit.ready|2|net|W',
  'iaudit.start|2|net|W',
  'iaudit.check.save|2|net|W',
  'iaudit.check.add|2|net|W',
  'iaudit.check.record|2|net|W',
  // Phiên 4b: phát hiện đánh giá → phiếu khắc phục, báo cáo đánh giá (đăng ký trước, chưa có mã → FEATURE_NOT_ENABLED)
  'iaudit.finding.save|2|net|W',
  // Báo cáo: logo
  'report.logo.get|1|net|R',
  'report.logo.set|4|pin|W',
  'bg.get|1|net|R',
  'bg.set|4|pin|W',
  // Người dùng, quản trị
  'user.pickList|3|net|R',
  'user.view|4|net|R',
  'user.create|4|pin|W',
  'user.setRole|4|pin|W',
  'user.lock|4|pin|W',
  'user.unlock|4|pin|W',
  'user.resetPin|4|pin|W',
  'user.revokeSessions|4|pin|W',
  'audit.own|S|net|R',
  'audit.view|3|net|R',
  'backup.view|4|net|R',
  'backup.run|4|pin|W',
  'backup.mirror.set|4|pin|W',
  'settings.edit|4|pin|W',
  'system.status|4|net|R',
  'sample.seed|O|pin|W'
];

var ACTION_REGISTRY = (function () {
  var reg = {};
  ACTION_TABLE_.forEach(function (line) {
    var p = line.split('|');
    reg[p[0]] = { code: p[0], level: p[1], net: p[2], write: p[3] === 'W', dot: 1 };
  });
  return reg;
})();

/** Thư ký ISO (cờ cộng thêm) hoặc Quản trị */
function isSecretary_(user) {
  return !!user && (!!user.iso_secretary || Number(user.role_level) === 4);
}

/** Người dùng có được chạy action không (chưa xét hồ sơ) */
function levelAllows_(user, def) {
  if (def.level === '0' || def.level === 'S') return true;
  if (def.level === 'O') return !!user.is_system_owner && Number(user.role_level) === 4;
  if (def.level === 'X') return isSecretary_(user);
  return Number(user.role_level) >= Number(def.level);
}

/** Ném FORBIDDEN nếu cấp không đủ */
function authorize_(ctx, code) {
  var def = ACTION_REGISTRY[code];
  if (!def || !levelAllows_(ctx.user, def)) throw apiError_('FORBIDDEN');
  return { level: Number(ctx.user.role_level) };
}

function can_(ctx, code) {
  try { authorize_(ctx, code); return true; } catch (e) { return false; }
}

/** Cơ sở quyền ghi vào AuditLogs.auth_basis */
function authBasis_(ctx) {
  return 'ROLE_LEVEL:' + Number(ctx.user.role_level) + (ctx.user.iso_secretary ? '+ISO_SECRETARY' : '');
}

function releasedDot_() { return RELEASED_DOT; }

/** Khối permissions của bootstrap: action được phép theo cấp */
function permissionSummary_(ctx) {
  var actions = [];
  Object.keys(ACTION_REGISTRY).forEach(function (code) {
    var def = ACTION_REGISTRY[code];
    if (!HANDLERS_[code]) return;
    if (levelAllows_(ctx.user, def)) actions.push(code);
  });
  return { perm_version: 1, actions: actions };
}

/** Bộ phận của người dùng (rỗng = mọi bộ phận) */
function userDepts_(u) {
  return deptList_(u && u.dept_codes);
}

/** Người dùng thấy mọi bộ phận: Thư ký ISO, cấp 4, hoặc không giới hạn bộ phận */
function seesAllDepts_(u) {
  return isSecretary_(u) || !userDepts_(u).length;
}

/** Biểu/tài liệu chung: bộ phận ISO, sổ tay, chính sách — ai cũng xem */
function isCommonItem_(it) {
  return it && (it.dept_code === 'ISO' || it.kind === 'MANUAL' || it.kind === 'POLICY');
}

/* ---------------- Phạm vi áp dụng của app (2e, Settings.scope_depts) ---------------- */

/** Mã bộ phận app quản lý ([] = toàn công ty) */
function scopeDepts_() {
  return deptList_(setting_('scope_depts'));
}
/** Bộ phận nằm trong phạm vi áp dụng */
function inScopeDept_(code) {
  var s = scopeDepts_();
  return !s.length || s.indexOf(String(code || '')) >= 0;
}
/** Biểu/tài liệu nằm trong phạm vi áp dụng (ngoài phạm vi: ẩn với mọi người, kể cả Quản trị — dữ liệu không xóa) */
function inScope_(it) {
  return !!it && inScopeDept_(it.dept_code);
}
/** Chuẩn hóa ô Phạm vi áp dụng: "cđ, CL" → "CĐ,CL"; mã phải có trong Depts — sai ném VALIDATION_ERROR (SCOPE_DEPT) */
function normScopeDepts_(s) {
  var known = {};
  readRows_('Depts').forEach(function (d) { known[d.dept_code] = true; });
  var out = [];
  var bad = false;
  String(s || '').split(/[,;\s]+/).forEach(function (x) {
    var c = x.trim().toUpperCase();
    if (!c) return;
    if (!known[c]) { bad = true; return; }
    if (out.indexOf(c) < 0) out.push(c);
  });
  if (bad) throw validationError_([fieldError_('scope_depts', 'SCOPE_DEPT')]);
  return out.join(',');
}

/** Người dùng xem được một biểu/tài liệu */
function itemVisible_(u, it) {
  if (!it || !inScope_(it)) return false;
  if (seesAllDepts_(u) || isCommonItem_(it)) return true;
  return userDepts_(u).indexOf(it.dept_code) >= 0;
}

/** Người dùng ghi được trong bộ phận này (cấp 1–3: chỉ bộ phận mình) */
function deptWritable_(u, deptCode) {
  if (!inScopeDept_(deptCode)) return false;
  if (seesAllDepts_(u)) return true;
  return userDepts_(u).indexOf(deptCode) >= 0;
}
