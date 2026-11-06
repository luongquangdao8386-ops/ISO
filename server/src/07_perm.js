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
  // Phiên bản & ban hành (phiên 1b)
  'version.save|2|net|W',
  'version.submit|2|net|W',
  'version.approve|3|pin|W',
  'version.return|3|pin|W',
  'version.issue|X|pin|W',
  'version.cancel|2|net|W',
  'item.setNa|X|pin|W',
  'doc.upload|2|offline|W',
  'doc.get|1|net|R',
  // Hồ sơ (phiên 1c)
  'record.submit|2|offline|W',
  'record.return|3|pin|W',
  'record.status|1|net|R',
  // Đợt 2–4: báo cáo PDF, kết nối M&E/Checksheet, khắc phục, đánh giá nội bộ
  'report.pdf|1|net|R',
  'link.set|4|pin|W',
  'evidence.sync|4|net|W',
  'capa.edit|2|net|W',
  'audit.program.edit|X|net|W',
  // Báo cáo: logo
  'report.logo.get|1|net|R',
  'report.logo.set|4|pin|W',
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

/** Người dùng xem được một biểu/tài liệu */
function itemVisible_(u, it) {
  if (!it) return false;
  if (seesAllDepts_(u) || isCommonItem_(it)) return true;
  return userDepts_(u).indexOf(it.dept_code) >= 0;
}

/** Người dùng ghi được trong bộ phận này (cấp 1–3: chỉ bộ phận mình) */
function deptWritable_(u, deptCode) {
  if (seesAllDepts_(u)) return true;
  return userDepts_(u).indexOf(deptCode) >= 0;
}
