/**
 * ISO · 体系管理 — Code.gs 1.0.0-d1.1
 * TỆP TẠO TỰ ĐỘNG từ server/src/*.js bằng "npm run build". Không sửa tay.
 * Dán toàn bộ nội dung vào tệp Code.gs của dự án Apps Script ISO (ISO_MayChu_THU / ISO_MayChu_THAT).
 * Không chứa ID, khóa bí mật hay dữ liệu: các giá trị đó nằm trong Thuộc tính tập lệnh.
 */

// ===== 00_config.js =====
/* =====================================================================
 * ISO · 体系管理 — máy chủ Google Apps Script
 * 00_config: hằng số, Settings mặc định, khóa SystemState, danh mục mã cố định
 * Lõi (PIN, phiên, ghi có xác nhận, đồng bộ, hàng chờ offline) chép từ app Checksheet (lõi M&E đã chạy THẬT).
 * ===================================================================== */

var APP_ID = 'ISO';
var SERVER_VERSION = '1.0.0-d1.1';
var API_CONTRACT_VERSION = '1.0';
var SCHEMA_VERSION = '1.0.0';
var TZ = 'Asia/Ho_Chi_Minh';
var TZ_OFFSET_MIN = 7 * 60; // Việt Nam không có giờ mùa hè
var RELEASED_DOT = 1;

var SCHEMA_DOTS_ = { '1.0.0': 1 };
var NAME_PREFIX = 'ISO_';    // tên spreadsheet, thư mục Drive

/** Bản ghi do máy chủ tạo thay mặt hệ thống (trigger, dịch nền) */
var SYSTEM_USER = 'SYSTEM';

/**
 * Settings mặc định.
 * [khóa, kiểu, mặc định, gửi xuống client, đợt, mô tả Việt, mô tả Trung]
 */
var SETTINGS_DEFAULTS = [
  ['session_days', 'INT', 30, true, 1, 'Số ngày của phiên đăng nhập', '登录会话天数'],
  ['session_warn_days', 'INT', 3, true, 1, 'Cảnh báo trước khi phiên hết hạn (ngày)', '会话到期前提醒天数'],
  ['change_pin_session_minutes', 'INT', 10, false, 1, 'Hạn phiên đổi PIN (phút)', '修改PIN会话时限（分钟）'],
  ['reauth_window_minutes', 'INT', 5, true, 1, 'Hạn của lần nhập lại PIN (phút)', '重新输入PIN有效时间（分钟）'],
  ['temp_pin_hours', 'INT', 72, false, 1, 'Hạn PIN tạm (giờ)', '临时PIN有效期（小时）'],
  ['max_sessions_per_user', 'INT', 10, false, 1, 'Số phiên tối đa mỗi người', '每人最多会话数'],
  ['login_fail_limit', 'INT', 5, false, 1, 'Số lần sai PIN trước khi khóa', '锁定前允许输错PIN次数'],
  ['login_fail_window_minutes', 'INT', 15, false, 1, 'Cửa sổ đếm lần sai (phút)', '输错计数时间窗（分钟）'],
  ['login_lock_minutes', 'INT', 15, false, 1, 'Thời gian khóa (phút)', '锁定时长（分钟）'],
  ['login_global_fail_limit', 'INT', 30, false, 1, 'Số lần sai toàn hệ thống trước khi tạm dừng', '全系统暂停登录前的输错次数'],
  ['login_global_window_minutes', 'INT', 10, false, 1, 'Cửa sổ đếm sai toàn hệ thống (phút)', '全系统输错计数时间窗（分钟）'],
  ['login_global_pause_minutes', 'INT', 10, false, 1, 'Thời gian tạm dừng đăng nhập (phút)', '暂停登录时长（分钟）'],
  ['auth_attempts_retention_days', 'INT', 90, false, 1, 'Số ngày giữ nhật ký đăng nhập', '登录记录保留天数'],
  ['offline_unlock_attempts', 'INT', 5, true, 1, 'Số lần mở khóa ngoại tuyến sai trước khi khóa', '离线解锁锁定前允许输错次数'],
  ['offline_lock_minutes', 'INT', 15, true, 1, 'Thời gian khóa mở khóa ngoại tuyến (phút)', '离线解锁锁定时长（分钟）'],
  ['offline_max_lockouts', 'INT', 3, true, 1, 'Số lần bị khóa liên tiếp trước khi xóa dữ liệu đăng nhập trên máy', '连续锁定次数上限（超出则清除本机登录数据）'],
  ['offline_pbkdf2_iterations', 'INT', 200000, true, 1, 'Số vòng PBKDF2 cho mở khóa ngoại tuyến', '离线解锁PBKDF2迭代次数'],
  ['offline_probe_seconds', 'INT', 12, true, 1, 'Thời gian chờ máy chủ khi mở app (giây)', '打开应用时等待服务器时间（秒）'],
  ['machine_translation_enabled', 'BOOL', true, false, 1, 'Bật dịch máy', '启用机器翻译'],
  ['mt_chunk_chars', 'INT', 1000, false, 1, 'Độ dài tối đa mỗi đoạn dịch', '每段翻译最大字符数'],
  ['mt_max_fields_per_request', 'INT', 20, false, 1, 'Số trường dịch tối đa mỗi lần lưu', '每次保存最多翻译字段数'],
  ['mt_sync_budget_seconds', 'INT', 6, false, 1, 'Thời gian dịch tối đa khi lưu (giây)', '保存时翻译最长时间（秒）'],
  ['mt_daily_budget', 'INT', 3000, false, 1, 'Số lượt dịch tối đa mỗi ngày', '每日最多翻译次数'],
  ['app_base_url', 'STRING', '', false, 1, 'Địa chỉ app', '应用地址'],
  ['min_client_version', 'STRING', '1.0.0', true, 1, 'Phiên bản app tối thiểu', '最低应用版本'],
  ['client_timeout_seconds', 'INT', 30, true, 1, 'Thời gian chờ request thường (giây)', '普通请求超时（秒）'],
  ['client_long_timeout_seconds', 'INT', 55, true, 1, 'Thời gian chờ request dài (giây)', '长请求超时（秒）'],
  ['sync_page_size', 'INT', 500, true, 1, 'Số dòng mỗi trang đồng bộ', '同步每页行数'],
  ['doc_max_bytes', 'INT', 10485760, true, 1, 'Dung lượng tối đa mỗi tệp (byte)', '单个文件最大字节数'],
  ['doc_mobile_upload_max_bytes', 'INT', 5242880, true, 1, 'Dung lượng tối đa mỗi tệp khi tải lên từ điện thoại (byte)', '手机上传单个文件最大字节数'],
  ['photo_max_edge_px', 'INT', 1600, true, 1, 'Cạnh dài tối đa của ảnh (px)', '照片最长边（像素）'],
  ['photo_jpeg_quality', 'NUMBER', 0.8, true, 1, 'Chất lượng JPEG của ảnh', '照片JPEG质量'],
  ['photo_thumb_edge_px', 'INT', 400, true, 1, 'Cạnh dài của ảnh nhỏ (px)', '缩略图最长边（像素）'],
  ['backup_weekday', 'ENUM', 'SUNDAY', false, 1, 'Ngày sao lưu trong tuần', '每周备份日'],
  ['backup_hour', 'INT', 1, false, 1, 'Giờ sao lưu', '备份时间'],
  ['backup_keep_count', 'INT', 8, false, 1, 'Số bản sao lưu giữ lại', '保留备份份数'],
  // ISO (mục 10 đặc tả, chốt 06/11/2026)
  ['doc_review_months', 'INT', 12, true, 1, 'Chu kỳ rà soát tài liệu (tháng)', '文件评审周期（月）'],
  ['record_grace_days', 'INT', 3, true, 1, 'Số ngày cho phép trễ khi xét hồ sơ', '记录允许延迟天数'],
  ['records_start_date', 'STRING', '', true, 1, 'Ngày bắt đầu tính hồ sơ cho biểu ● nhập từ Excel (trống = ngày nhập danh mục đầu tiên)', 'Excel导入的●表单开始计算记录的日期（空=首次导入目录日期）'],
  ['report_logo_file_id', 'STRING', '', false, 1, 'Tệp logo trên báo cáo (Drive)', '报表标志文件（云端硬盘）'],
  ['report_logo_rev', 'STRING', '', true, 1, 'Phiên bản logo trên báo cáo', '报表标志版本']
];

/** Khóa SystemState ban đầu. Bộ đếm `code_seq.*`, `table_rev.*` thêm khi dùng. */
var SYSTEM_STATE_INITIAL = [
  ['dataset_epoch', 'STRING', ''],
  ['maintenance_mode', 'BOOL', false],
  ['sync_revision', 'INT', 0],
  ['schema_version', 'STRING', SCHEMA_VERSION],
  ['login_paused_until', 'DATETIME', ''],
  ['mt_paused_until', 'DATETIME', ''],
  ['last_backup_at', 'DATETIME', ''],
  ['last_backup_ref', 'STRING', ''],
  ['last_backup_status', 'ENUM', ''],
  ['last_restore_at', 'DATETIME', ''],
  ['restored_from_ref', 'STRING', ''],
  ['restored_backup_at', 'DATETIME', ''],
  ['restored_by', 'STRING', ''],
  ['last_import_at', 'DATETIME', '']
];

/** Mẫu mã hiển thị. yymm: true khi có phần năm-tháng (mục 3 đặc tả: HS, DN, KP, BC; DG theo năm ở Đợt 4). */
var CODE_PATTERNS = {
  RECORD: { prefix: 'HS', digits: 4, yymm: true, sheet: null, col: null },
  DOC_REQUEST: { prefix: 'DN', digits: 3, yymm: true, sheet: null, col: null },
  CAPA: { prefix: 'KP', digits: 3, yymm: true, sheet: null, col: null },
  REPORT: { prefix: 'BC', digits: 3, yymm: true, sheet: null, col: null }
};

/** Loại hồ sơ của tệp (Documents.entity_type) — phiên 1b (phiên bản), 1c (hồ sơ) */
var DOC_ENTITY_SHEETS_ = {};

/** Trường không dịch tự động. Tên trường gốc (không hậu tố _vi/_zh). */
var NO_MT_FIELDS = {
  Settings: ['description']
};

/* ---------------- Danh mục mã cố định (mục 4–5 đặc tả) ---------------- */

/** Bộ phận: [mã, tên Việt, tên Trung] — tên hiển thị ở cột E của file Excel tổng là "Việt · 中文" */
var DEPTS_SEED_ = [
  ['ISO', 'Ban ISO', '体系办'],
  ['KD', 'Kinh doanh', '销售'],
  ['CB', 'Thiết kế & chế bản', '设计制版'],
  ['SX', 'Sản xuất', '生产'],
  ['CL', 'Chất lượng QA/QC', '质量'],
  ['MH', 'Mua hàng', '采购'],
  ['KV', 'Kho vận', '仓储物流'],
  ['NS', 'Nhân sự & đào tạo', '人力资源'],
  ['BRC', 'An toàn sản phẩm (BRCGS)', '产品安全'],
  ['CĐ', 'Cơ điện', '机电']
];
var DEPT_CODE_RE_ = /^[A-ZĐ][A-ZĐ0-9]{0,9}$/;

var ITEM_KINDS_ = ['FORM', 'MANUAL', 'POLICY', 'PROCEDURE', 'WI', 'EXTERNAL'];
var ITEM_LEVELS_ = ['DEPT', 'COMPANY'];
/** Tình trạng biểu (cột T): ○ chưa có · ◐ đang soạn · ● đã ban hành · ✕ không áp dụng */
var ITEM_STATUS_ = ['NONE', 'DRAFTING', 'ISSUED', 'NA'];
var STATUS_SYMBOL_ = { NONE: '○', DRAFTING: '◐', ISSUED: '●', NA: '✕' };

/** Nơi làm (cột R, 6 giá trị) */
var WHERE_ = [
  ['ME', 'M&E · 机电App'],
  ['CS', 'Checksheet · 点检表'],
  ['ME_PART', 'Một phần M&E · 部分机电App'],
  ['CS_PART', 'Một phần Checksheet · 部分点检表'],
  ['CS_PROPOSED', 'Đề xuất Checksheet · 建议用点检表'],
  ['MANUAL', 'Làm tay → App ISO · 手工→ISO App']
];

/** Kỳ hồ sơ theo cột Chu kỳ hồ sơ (ngày): 1 → DAY … 366 → YEAR, trống → EVENT */
var PERIOD_TYPES_ = ['DAY', 'WEEK', 'MONTH', 'QUARTER', 'HALF', 'YEAR', 'EVENT'];
var PERIOD_DAYS_ = { DAY: 1, WEEK: 7, MONTH: 31, QUARTER: 92, HALF: 183, YEAR: 366 };

/** Chuẩn điều khoản */
var CLAUSE_STDS_ = ['ISO9001', 'BRC'];

// ===== 01_util.js =====
/* 01_util: thời gian, UUID, byte, băm, mã hóa (phụ lục 1.5 mục 3.1, 3.3, 3.5) */

function now_() {
  return new Date();
}

function pad2_(n) { return (n < 10 ? '0' : '') + n; }

/** Đổi Date sang các phần ngày giờ theo giờ Việt Nam (+07:00, không có giờ mùa hè). */
function vnParts_(d) {
  var t = new Date(d.getTime() + TZ_OFFSET_MIN * 60000);
  return {
    y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(),
    hh: t.getUTCHours(), mi: t.getUTCMinutes(), ss: t.getUTCSeconds()
  };
}

/** ISO 8601 có múi giờ, vd 2026-10-07T08:00:00+07:00 */
function isoVN_(d) {
  if (!d) return '';
  var p = vnParts_(d);
  return p.y + '-' + pad2_(p.m) + '-' + pad2_(p.d) + 'T' + pad2_(p.hh) + ':' + pad2_(p.mi) + ':' + pad2_(p.ss) + '+07:00';
}

/** YYYY-MM-DD theo giờ Việt Nam */
function dateVN_(d) {
  var p = vnParts_(d);
  return p.y + '-' + pad2_(p.m) + '-' + pad2_(p.d);
}

/** yymm từ một ngày YYYY-MM-DD hoặc Date */
function yymm_(v) {
  var s = (v instanceof Date) ? dateVN_(v) : String(v);
  var m = /^(\d{4})-(\d{2})/.exec(s);
  if (!m) return '';
  return m[1].slice(2) + m[2];
}

function parseTime_(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  var t = Date.parse(String(s));
  return isNaN(t) ? null : new Date(t);
}

function isDateStr_(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
  var d = new Date(String(s) + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === String(s);
}

function unixNow_() {
  return Math.floor(now_().getTime() / 1000);
}

/** UUID v4 chữ thường do máy chủ sinh (3.3) */
function uuid_() {
  return Utilities.getUuid().toLowerCase();
}

var UUID_V4_RE_ = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function isUuidV4_(s) {
  return typeof s === 'string' && UUID_V4_RE_.test(s);
}

/* ---------- byte ---------- */

/** Chuỗi → byte UTF-8 (byte có dấu như Java) */
function utf8Bytes_(s) {
  return Utilities.newBlob(String(s)).getBytes();
}

/** Byte có dấu → 0..255 */
function u8_(b) {
  return b & 0xFF;
}

function sha256_(bytesOrString) {
  if (typeof bytesOrString === 'string') {
    return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytesOrString, Utilities.Charset.UTF_8);
  }
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytesOrString);
}

/** HMAC-SHA256(value, key) — dùng overload (byte[] value, byte[] key) */
function hmac256_(valueBytes, keyBytes) {
  return Utilities.computeHmacSha256Signature(valueBytes, keyBytes);
}

function b64_(bytes) {
  return Utilities.base64Encode(bytes);
}

function b64d_(s) {
  return Utilities.base64Decode(s);
}

/** Base64url không đệm (3.5) */
function b64url_(bytes) {
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function b64urlDecode_(s) {
  var t = String(s);
  while (t.length % 4) t += '=';
  return Utilities.base64DecodeWebSafe(t);
}

/** So sánh hai mảng byte theo thời gian hằng: XOR cộng dồn, không dừng sớm. */
function ctEqualBytes_(a, b) {
  var n = Math.max(a.length, b.length);
  var diff = a.length ^ b.length;
  for (var i = 0; i < n; i++) {
    var x = i < a.length ? u8_(a[i]) : 0;
    var y = i < b.length ? u8_(b[i]) : 0;
    diff |= (x ^ y);
  }
  return diff === 0;
}

function ctEqualStr_(a, b) {
  return ctEqualBytes_(utf8Bytes_(a || ''), utf8Bytes_(b || ''));
}

/** 16 byte ngẫu nhiên = 16 byte đầu SHA-256(2 UUID) (3.5) */
function randomBytes16_() {
  return sha256_(Utilities.getUuid() + Utilities.getUuid()).slice(0, 16);
}

/** 32 byte bí mật = SHA-256(3 UUID) (3.14) */
function randomSecret32_() {
  return sha256_(Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid());
}

var CROCKFORD_ = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Mã hóa nChars ký tự Crockford base32 từ các bit đầu của mảng byte */
function crockford_(bytes, nChars) {
  var out = '';
  var bitBuf = 0, bitLen = 0, i = 0;
  while (out.length < nChars) {
    if (bitLen < 5) {
      bitBuf = ((bitBuf << 8) | u8_(bytes[i++])) & 0xFFFF;
      bitLen += 8;
    }
    var idx = (bitBuf >> (bitLen - 5)) & 31;
    bitLen -= 5;
    out += CROCKFORD_.charAt(idx);
  }
  return out;
}

/** qr_key: 20 ký tự Crockford (100 bit) từ SHA-256(2 UUID) (2.8) */
function newQrKey_() {
  return crockford_(sha256_(Utilities.getUuid() + Utilities.getUuid()), 20);
}

var QR_KEY_RE_ = /^[0-9A-HJKMNP-TV-Z]{20}$/;

/** Chuẩn hóa chuỗi nhập tay: bỏ cách/gạch, chữ hoa, O→0, I/L→1 */
function normalizeQrKey_(s) {
  var t = String(s || '').toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return QR_KEY_RE_.test(t) ? t : null;
}

/** JSON ổn định (khóa sắp xếp) để băm payload */
function stableStringify_(v) {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return '[' + v.map(stableStringify_).join(',') + ']';
  if (typeof v === 'object') {
    var keys = Object.keys(v).filter(function (k) { return v[k] !== undefined; }).sort();
    return '{' + keys.map(function (k) { return JSON.stringify(k) + ':' + stableStringify_(v[k]); }).join(',') + '}';
  }
  return JSON.stringify(v);
}

var SECRET_KEYS_ = ['pin', 'current_pin', 'new_pin', 'token', 'reauth_token', 'temp_pin'];

/** Bỏ khóa bí mật khỏi bản sao payload trước khi ghi log/Operations (3.15) */
function redact_(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact_);
  var out = {};
  Object.keys(obj).forEach(function (k) {
    if (SECRET_KEYS_.indexOf(k) >= 0) return;
    if (k === 'content_b64' || k === 'thumb_b64') { out[k] = '[' + String(obj[k] || '').length + ' chars]'; return; }
    out[k] = redact_(obj[k]);
  });
  return out;
}

function clone_(o) {
  return JSON.parse(JSON.stringify(o));
}

function trimStr_(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

/** So sánh phiên bản dạng a.b.c (bỏ phần -poc...) */
function cmpVersion_(a, b) {
  var pa = String(a || '0').split('-')[0].split('.').map(Number);
  var pb = String(b || '0').split('-')[0].split('.').map(Number);
  for (var i = 0; i < 3; i++) {
    var x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/** Trong một request (doPost/doGet) ScriptProperties chỉ đọc một lần; hàm chạy tay thì đọc trực tiếp */
var PROPS_MEMO_ = null, PROPS_MEMO_ON_ = false;

function propsReset_(on) {
  PROPS_MEMO_ = null;
  PROPS_MEMO_ON_ = !!on;
}

function prop_(key) {
  if (!PROPS_MEMO_ON_) return PropertiesService.getScriptProperties().getProperty(key);
  if (!PROPS_MEMO_) PROPS_MEMO_ = PropertiesService.getScriptProperties().getProperties() || {};
  var v = PROPS_MEMO_[key];
  return v === undefined ? null : v;
}

function setProp_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, String(value));
  if (PROPS_MEMO_) PROPS_MEMO_[key] = String(value);
}

function delProp_(key) {
  PropertiesService.getScriptProperties().deleteProperty(key);
  if (PROPS_MEMO_) delete PROPS_MEMO_[key];
}

function envName_() {
  return prop_('ENV') || 'THU';
}

function isTestEnv_() {
  return envName_() === 'THU';
}

function cache_() {
  return CacheService.getScriptCache();
}

// ===== 02_schema.js =====
/* 02_schema: sheet và cột của app ISO */

/**
 * Bộ cột C cho bảng nghiệp vụ. `sync_revision` là mốc đồng bộ của dòng (sync.changes lấy dòng đổi sau cursor).
 */
var C_COLS = ['dataset_epoch', 'record_version', 'sync_revision', 'created_at', 'created_by', 'updated_at', 'updated_by', 'archived_at'];

/**
 * book: B = Nghiệp vụ, S = Bảo mật. c: thêm bộ C. i18n: thêm `i18n_meta`.
 * cols: tên cột cách nhau bằng dấu cách; kiểu suy theo tên (colType_), ghi đè bằng "ten:KIEU".
 */
var SHEETS = {
  // ---- Nghiệp vụ ----
  Settings: { book: 'B', dot: 1, key: 'setting_key', i18n: true,
    cols: 'setting_key value:STRING value_type description_vi description_zh updated_at updated_by' },
  SystemState: { book: 'B', dot: 1, key: 'state_key',
    cols: 'state_key value:STRING value_type updated_at updated_by' },
  Glossary: { book: 'B', dot: 1, key: 'glossary_id', c: true,
    cols: 'glossary_id term_vi term_zh note active approved_by approved_at' },
  // Bộ phận (ISO, KD, CB, SX, CL, MH, KV, NS, BRC, CĐ); trưởng bộ phận duyệt tài liệu cấp bộ phận (phiên 1b)
  Depts: { book: 'B', dot: 1, key: 'dept_code', c: true, i18n: true,
    cols: 'dept_code name_vi name_zh head_user_id active sort_order' },
  // Nhóm biểu: group_key = <bộ phận>-<xx> lấy từ mã biểu; label = chữ ở cột F của file Excel tổng (xuất lại đúng như nhập)
  Groups: { book: 'B', dot: 1, key: 'group_key', c: true, i18n: true,
    cols: 'group_key dept_code name_vi name_zh label sort_order active' },
  // Biểu mẫu và tài liệu (một dòng = một mã); cột theo file Excel tổng (mục 6), thêm cột của app
  Items: { book: 'B', dot: 1, key: 'item_id', c: true, i18n: true,
    cols: 'item_id code kind level dept_code group_key name_vi name_zh purpose_vi purpose_zh iso9001 iso14001 iso45001 iso50001 ' +
      'brc_topics law cls freq_vi freq_zh flow keep priority where where_note status current_version_id current_rev issued_at ' +
      'review_due owner_user_id qr_key note period_days period_type issued_source file_missing na_reason sort_order' },
  // Điều khoản ISO 9001 và chủ đề BRCGS Packaging (std|key)
  Clauses: { book: 'B', dot: 1, key: 'clause_id', c: true, i18n: true,
    cols: 'clause_id std key group_vi group_zh name_vi name_zh mandatory_record sort_order active' },
  // Nhập Excel: một lô = một lần chọn tệp; mỗi dòng của sheet Danh mục tổng = một ImportRows (xem trước rồi mới ghi)
  ImportBatches: { book: 'B', dot: 1, key: 'import_batch_id',
    cols: 'import_batch_id kind file_name source_sha256 template_key template_version file_epoch imported_by imported_at ' +
      'total_rows add_count update_count same_count error_count clause_count status committed_by commit_started_at completed_at ' +
      'committed_rows dataset_epoch record_version updated_at clauses_json' },
  ImportRows: { book: 'B', dot: 1, key: 'import_row_id',
    cols: 'import_row_id import_batch_id row_number code entity_id action expected_version validation_status errors_json ' +
      'changes_json committed_at normalized_payload_json' },
  // Tệp trên Drive của tài khoản máy chủ ISO (PDF + tệp gốc của phiên bản ở phiên 1b, ảnh/tệp hồ sơ ở phiên 1c)
  Documents: { book: 'B', dot: 1, key: 'document_id', c: true,
    cols: 'document_id entity_type entity_id kind drive_file_id mime_type file_name access_scope active managed_folder_id ' +
      'owned_by_app size_bytes thumb_drive_file_id sha256 page_no' },
  NotificationLogs: { book: 'B', dot: 1, key: 'notification_id',
    cols: 'notification_id dedupe_key run_date recipient_id entity_type entity_id due_date stage status attempt_at sent_at ' +
      'error_code dataset_epoch digest_id queued_at attempt_count' },
  AuditLogs: { book: 'B', dot: 1, key: 'audit_id',
    cols: 'audit_id occurred_at user_id device_id action entity_type entity_id before_json after_json operation_id ' +
      'import_batch_id dataset_epoch reason auth_basis' },
  Operations: { book: 'B', dot: 1, key: 'operation_id',
    cols: 'operation_id user_id device_id entity_type entity_id expected_version received_at state result_code sync_revision ' +
      'committed_at dataset_epoch action payload_hash intent_json progress_json result_json' },

  // ---- Bảo mật ----
  // dept_codes: phạm vi bộ phận (cách nhau bằng dấu phẩy, rỗng = mọi bộ phận); iso_secretary: Thư ký ISO; auditor: Đánh giá viên
  Users: { book: 'S', dot: 1, key: 'user_id',
    cols: 'user_id employee_code display_name email role_level active pin_hash salt pin_hash_version failed_attempts ' +
      'locked_until created_at updated_at auth_version is_system_owner must_change_pin temp_pin_expires_at pin_changed_at ' +
      'failed_window_started_at last_login_at record_version created_by updated_by dept_codes iso_secretary auditor' },
  Sessions: { book: 'S', dot: 1, key: 'session_id',
    cols: 'session_id token_hash user_id device_id issued_at expires_at revoked_at auth_version dataset_epoch app_id ' +
      'origin_key session_kind last_seen_at revoke_reason device_label' },
  AuthAttempts: { book: 'S', dot: 1, key: 'attempt_id',
    cols: 'attempt_id occurred_at employee_code_hash device_id outcome attempt_kind user_id' }
};

var TYPE_OVERRIDES_ = {
  drive_file_id: 'STRING', managed_folder_id: 'STRING', thumb_drive_file_id: 'STRING', current_version_id: 'STRING',
  employee_code_hash: 'STRING', token_hash: 'STRING', payload_hash: 'STRING', pin_hash: 'STRING', salt: 'STRING', sha256: 'STRING',
  source_sha256: 'STRING', qr_key: 'STRING', origin_key: 'STRING', dept_codes: 'STRING', dept_code: 'STRING', group_key: 'STRING',
  code: 'STRING', key: 'STRING', current_rev: 'STRING', file_epoch: 'STRING', template_key: 'STRING', template_version: 'STRING',
  record_version: 'INT', sync_revision: 'INT', role_level: 'INT', auth_version: 'INT', failed_attempts: 'INT',
  size_bytes: 'INT', sort_order: 'INT', expected_version: 'INT', priority: 'INT', period_days: 'INT', row_number: 'INT', page_no: 'INT',
  total_rows: 'INT', add_count: 'INT', update_count: 'INT', same_count: 'INT', error_count: 'INT', clause_count: 'INT', committed_rows: 'INT',
  attempt_count: 'INT',
  active: 'BOOL', owned_by_app: 'BOOL', must_change_pin: 'BOOL', is_system_owner: 'BOOL', iso_secretary: 'BOOL', auditor: 'BOOL',
  file_missing: 'BOOL', mandatory_record: 'BOOL',
  i18n_meta: 'JSON', schema_version: 'STRING', email: 'STRING', note: 'STRING', where: 'STRING',
  issued_at: 'DATE', review_due: 'DATE', due_date: 'DATE', run_date: 'DATE'
};

/** Kiểu cột suy theo tên. */
function colType_(name) {
  if (TYPE_OVERRIDES_[name]) return TYPE_OVERRIDES_[name];
  if (/^can_/.test(name)) return 'BOOL';
  if (/_json$/.test(name)) return 'JSON';
  if (/_id$/.test(name)) return 'ID';
  if (/_code$/.test(name)) return 'CODE';
  if (/_at$/.test(name) || /_until$/.test(name)) return 'DATETIME';
  if (/_date$/.test(name)) return 'DATE';
  return 'STRING';
}

var TEXT_FORMAT_TYPES_ = { ID: 1, CODE: 1, DATE: 1, DATETIME: 1, JSON: 1, STRING: 1, ENUM: 1 };

var schemaCache_ = {};

/** Danh sách cột và kiểu của một sheet: {cols:[name], types:{name:type}} */
function sheetSchema_(name) {
  if (schemaCache_[name]) return schemaCache_[name];
  var def = SHEETS[name];
  if (!def) throw new Error('Unknown sheet ' + name);
  var cols = [], types = {};
  def.cols.split(/\s+/).filter(String).forEach(function (spec) {
    var p = spec.split(':');
    cols.push(p[0]);
    types[p[0]] = p[1] || colType_(p[0]);
  });
  if (def.c) C_COLS.forEach(function (c) { if (cols.indexOf(c) < 0) { cols.push(c); types[c] = colType_(c); } });
  if (def.i18n && cols.indexOf('i18n_meta') < 0) { cols.push('i18n_meta'); types.i18n_meta = 'JSON'; }
  schemaCache_[name] = { cols: cols, types: types, key: def.key, book: def.book, dot: def.dot };
  return schemaCache_[name];
}

/** Sheet thuộc đợt ≤ dot */
function sheetsForDot_(dot) {
  return Object.keys(SHEETS).filter(function (n) { return SHEETS[n].dot <= dot; });
}

/** Giá trị JS → ô Sheet */
function toCell_(type, v) {
  if (v === null || v === undefined) return '';
  switch (type) {
    case 'BOOL': return v === true || v === 'TRUE' || v === 'true';
    case 'INT':
    case 'NUMBER':
      if (v === '') return '';
      var n = Number(v);
      return isNaN(n) ? '' : n;
    case 'JSON': {
      var s = typeof v === 'string' ? v : JSON.stringify(v);
      if (s.length > 50000) throw new Error('JSON cell too large');
      return s;
    }
    default: return String(v);
  }
}

/** Ô Sheet → giá trị JS */
function fromCell_(type, v) {
  switch (type) {
    case 'BOOL': return v === true || v === 'TRUE' || v === 'true';
    case 'INT':
    case 'NUMBER':
      if (v === '' || v === null || v === undefined) return null;
      var n = Number(v);
      return isNaN(n) ? null : n;
    case 'DATE':
      if (v instanceof Date) return dateVN_(v);
      return v === null || v === undefined ? '' : String(v);
    case 'DATETIME':
      if (v instanceof Date) return isoVN_(v);
      return v === null || v === undefined ? '' : String(v);
    case 'JSON':
      if (v === '' || v === null || v === undefined) return null;
      try { return JSON.parse(String(v)); } catch (e) { return null; }
    default:
      return v === null || v === undefined ? '' : String(v);
  }
}

// ===== 03_db.js =====
/* 03_db: đọc/ghi Sheet theo tên cột; SystemState; Settings */

var DB_ = { books: {}, sheets: {}, headers: {}, settings: null };

/** Xóa bộ nhớ đệm trong một lần chạy (dùng trong test và sau setup) */
function dbReset_() {
  DB_ = { books: {}, sheets: {}, headers: {}, settings: null };
  if (PROPS_MEMO_ON_) propsReset_(true);
}

function book_(b) {
  if (!DB_.books[b]) {
    var id = prop_(b === 'S' ? 'SECURITY_SPREADSHEET_ID' : 'BUSINESS_SPREADSHEET_ID');
    if (!id) throw apiError_('SYSTEM_NOT_READY');
    DB_.books[b] = SpreadsheetApp.openById(id);
  }
  return DB_.books[b];
}

function sh_(name) {
  if (!DB_.sheets[name]) {
    var s = sheetSchema_(name);
    var sheet = book_(s.book).getSheetByName(name);
    if (!sheet) throw apiError_('SYSTEM_NOT_READY', { missing_sheet: name });
    DB_.sheets[name] = sheet;
  }
  return DB_.sheets[name];
}

/** Hàng tiêu đề thực tế của sheet (có thể nhiều cột hơn schema sau migrate) */
function hdr_(name) {
  if (!DB_.headers[name]) {
    var sheet = sh_(name);
    var n = sheet.getLastColumn();
    setHeader_(name, n > 0 ? sheet.getRange(1, 1, 1, n).getValues()[0] : []);
  }
  return DB_.headers[name];
}

/** Ghi nhớ tiêu đề trong lượt chạy; bỏ các cột trống ở cuối (không tên thì không đọc/ghi) */
function setHeader_(name, row) {
  var cols = row.map(function (v) { return v === null || v === undefined ? '' : String(v); });
  while (cols.length && cols[cols.length - 1] === '') cols.pop();
  var idx = {};
  cols.forEach(function (c, i) { if (c) idx[c] = i; });
  DB_.headers[name] = { cols: cols, idx: idx };
  return DB_.headers[name];
}

function rowToObj_(name, h, r, rowNum) {
  var types = sheetSchema_(name).types;
  var o = { __row: rowNum };
  for (var j = 0; j < h.cols.length; j++) {
    var c = h.cols[j];
    if (!c) continue;
    o[c] = fromCell_(types[c] || 'STRING', r[j]);
  }
  return o;
}

function objToRow_(name, h, o) {
  var types = sheetSchema_(name).types;
  return h.cols.map(function (c) { return toCell_(types[c] || 'STRING', o[c]); });
}

/**
 * Đọc toàn bộ dòng dữ liệu. Bảng trống: 1 lần gọi Sheets (getLastRow); có dữ liệu: đọc tiêu đề cùng dữ liệu trong một
 * getValues (getLastRow + getLastColumn + getValues = 3 lần; trước là 4 vì đọc tiêu đề riêng).
 */
function readRows_(name) {
  var sheet = sh_(name);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var n = DB_.headers[name] ? DB_.headers[name].cols.length : sheet.getLastColumn();
  if (!n) return [];
  var vals = sheet.getRange(1, 1, last, n).getValues();
  var h = setHeader_(name, vals[0]);
  var out = [];
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0] === '' || vals[i][0] === null) continue;
    out.push(rowToObj_(name, h, vals[i], i + 1));
  }
  return out;
}

/* ---------------- Đệm bảng theo phiên bản bảng (đăng nhập/đồng bộ đọc hàng chục bảng) ---------------- */

var TBL_CHUNK_ = 30000;      // ký tự mỗi ô đệm (≤ 100 KB kể cả chữ Việt/Trung 3 byte)
var TBL_CACHE_V_ = 1;        // tăng khi đổi cách chuyển ô → bản ghi (rowToObj_/fromCell_); dán Code.gs mới không làm mất đệm
var TBL_MAX_CHUNKS_ = 40;    // bảng lớn hơn ~1,2 triệu ký tự thì không đệm

function tblKey_(name, st) {
  var props = sysProps_();
  return 'tb' + TBL_CACHE_V_ + ':' + name + ':' + Number(stateGet_(st, 'table_rev.' + name, 0)) + ':' + (props.dataset_epoch || '') + ':' +
    (st.map.schema_version || '') + ':' + (st.map.last_restore_at || '') + ':' + (st.map.last_reset_at || '');
}

/**
 * Bộ đọc bảng có đệm CacheService theo table_rev: bảng không đổi phiên bản từ lần đọc trước thì không gọi Sheets.
 * Mọi ghi qua executeWrite_ tăng table_rev của bảng đã ghi — cùng điều kiện mà sync.changes dựa vào để biết bảng đổi.
 * st = readState_(). Trả {rows(name)}: bản sao mới mỗi lần (người gọi được sửa thoải mái).
 */
function tableCache_(names, st) {
  var c = cache_();
  var keys = {};
  names.forEach(function (n) { keys[n] = tblKey_(n, st); });
  var metas = {}, chunks = {};
  try {
    metas = c.getAll(names.map(function (n) { return keys[n]; })) || {};
    var need = [];
    names.forEach(function (n) { var m = Number(metas[keys[n]] || 0); for (var i = 0; i < m; i++) need.push(keys[n] + ':' + i); });
    if (need.length) chunks = c.getAll(need) || {};
  } catch (e) { metas = {}; chunks = {}; }
  return {
    rows: function (n) {
      var k = keys[n] || tblKey_(n, st);
      var m = Number(metas[k] || 0);
      if (m) {
        var parts = [];
        for (var i = 0; i < m; i++) { var v = chunks[k + ':' + i]; if (v === null || v === undefined) { parts = null; break; } parts.push(v); }
        if (parts) { try { return JSON.parse(parts.join('')); } catch (e) { /* đọc lại từ Sheets */ } }
      }
      var rows = readRows_(n);
      try {
        var js = JSON.stringify(rows);
        if (js.length <= TBL_CHUNK_ * TBL_MAX_CHUNKS_) {
          var put = {}, cnt = 0;
          for (var j = 0; j < js.length; j += TBL_CHUNK_) put[k + ':' + (cnt++)] = js.slice(j, j + TBL_CHUNK_);
          put[k] = String(cnt);
          c.putAll(put, 21600);
          metas[k] = String(cnt);
          Object.keys(put).forEach(function (pk) { if (pk !== k) chunks[pk] = put[pk]; });
        }
      } catch (e2) { /* đầy đệm: bỏ qua */ }
      return rows;
    }
  };
}

/** Đọc các dòng từ dòng `fromRow` tới cuối (đọc phần đuôi, vd AuthAttempts) */
function readTail_(name, maxRows) {
  var sheet = sh_(name);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var start = Math.max(2, last - maxRows + 1);
  var h = hdr_(name);
  var vals = sheet.getRange(start, 1, last - start + 1, h.cols.length).getValues();
  return vals.map(function (r, i) { return rowToObj_(name, h, r, start + i); });
}

function readRowAt_(name, rowNum) {
  var h = hdr_(name);
  var r = sh_(name).getRange(rowNum, 1, 1, h.cols.length).getValues()[0];
  return rowToObj_(name, h, r, rowNum);
}

/** Tìm các số dòng có ô `col` khớp nguyên ô `value` */
function findRowNums_(name, col, value) {
  if (value === null || value === undefined || value === '') return [];
  var sheet = sh_(name);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var h = hdr_(name);
  var ci = h.idx[col];
  if (ci === undefined) throw new Error('Unknown column ' + name + '.' + col);
  var found = sheet.getRange(2, ci + 1, last - 1, 1)
    .createTextFinder(String(value)).matchEntireCell(true).matchCase(true).findAll();
  return found.map(function (r) { return r.getRow(); });
}

function findOne_(name, col, value) {
  var rows = findRowNums_(name, col, value);
  if (!rows.length) return null;
  return readRowAt_(name, rows[0]);
}

function findAll_(name, col, value) {
  return findRowNums_(name, col, value).map(function (r) { return readRowAt_(name, r); });
}

function ensureRows_(sheet, needLastRow, name) {
  var max = sheet.getMaxRows();
  if (needLastRow > max) {
    var add = needLastRow - max + 500;
    sheet.insertRowsAfter(max, add);
    applyColumnFormats_(sheet, name, max + 1, add);
  }
}

/** Thêm dòng ở cuối; trả số dòng đầu tiên */
function insertRows_(name, objs) {
  if (!objs.length) return 0;
  var sheet = sh_(name);
  var h = hdr_(name);
  var start = sheet.getLastRow() + 1;
  ensureRows_(sheet, start + objs.length - 1, name);
  var values = objs.map(function (o) { return objToRow_(name, h, o); });
  sheet.getRange(start, 1, values.length, h.cols.length).setValues(values);
  objs.forEach(function (o, i) { o.__row = start + i; });
  return start;
}

/** Ghi đè cả dòng */
function writeRow_(name, rowNum, obj) {
  var h = hdr_(name);
  sh_(name).getRange(rowNum, 1, 1, h.cols.length).setValues([objToRow_(name, h, obj)]);
}

/** Ghi một vài ô của một dòng */
function writeCells_(name, rowNum, partial) {
  var h = hdr_(name);
  var types = sheetSchema_(name).types;
  var sheet = sh_(name);
  Object.keys(partial).forEach(function (c) {
    if (c === '__row') return;
    var ci = h.idx[c];
    if (ci === undefined) throw new Error('Unknown column ' + name + '.' + c);
    sheet.getRange(rowNum, ci + 1).setValue(toCell_(types[c] || 'STRING', partial[c]));
  });
}

/** Định dạng ô Văn bản cho cột ID/CODE/DATE/DATETIME/JSON/STRING/ENUM (3.1) ở các dòng mới thêm */
function applyColumnFormats_(sheet, name, fromRow, numRows) {
  var types = sheetSchema_(name).types;
  var n = sheet.getLastColumn();
  var header = n > 0 ? sheet.getRange(1, 1, 1, n).getValues()[0] : [];
  header.forEach(function (c, i) {
    var t = types[String(c)] || 'STRING';
    if (TEXT_FORMAT_TYPES_[t]) sheet.getRange(fromRow, i + 1, numRows, 1).setNumberFormat('@');
  });
}

/* ---------------- SystemState ---------------- */

function parseStateValue_(type, v) {
  var s = v === null || v === undefined ? '' : String(v);
  if (type === 'INT' || type === 'NUMBER') return s === '' ? 0 : Number(s);
  if (type === 'BOOL') return s === 'true' || s === 'TRUE';
  if (type === 'JSON') { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  if (v instanceof Date) return isoVN_(v);
  return s;
}

function stateValueToCell_(type, v) {
  if (type === 'JSON') return JSON.stringify(v);
  if (type === 'BOOL') return v ? 'true' : 'false';
  return v === null || v === undefined ? '' : String(v);
}

/** Đọc SystemState (đọc thẳng Sheet; dùng dưới khóa ghi) */
function readState_() {
  var rows = readRows_('SystemState');
  var st = { map: {}, rows: {} };
  rows.forEach(function (r) {
    st.map[r.state_key] = parseStateValue_(r.value_type, r.value);
    st.rows[r.state_key] = { row: r.__row, type: r.value_type };
  });
  return st;
}

function stateGet_(st, key, def) {
  return Object.prototype.hasOwnProperty.call(st.map, key) ? st.map[key] : def;
}

/** Ghi nhiều khóa SystemState; khóa mới thêm dòng. updates: {key: [type, value]} */
function stateWrite_(st, updates, by) {
  var nowIso = isoVN_(now_());
  var inserts = [];
  Object.keys(updates).forEach(function (k) {
    var type = updates[k][0], val = updates[k][1];
    if (st.rows[k]) {
      writeCells_('SystemState', st.rows[k].row, { value: stateValueToCell_(type, val), updated_at: nowIso, updated_by: by || SYSTEM_USER });
    } else {
      inserts.push({ state_key: k, value: stateValueToCell_(type, val), value_type: type, updated_at: nowIso, updated_by: by || SYSTEM_USER });
    }
    st.map[k] = val;
  });
  if (inserts.length) {
    insertRows_('SystemState', inserts);
    inserts.forEach(function (o) { st.rows[o.state_key] = { row: o.__row, type: o.value_type }; });
  }
}

/** SystemState qua cache `sys:state` (TTL 60 giây, 3.7) */
function sysStateCached_() {
  var c = cache_().get('sys:state');
  if (c) return JSON.parse(c);
  var st = readState_().map;
  var small = {
    perm_version: st.perm_version || 1,
    login_paused_until: st.login_paused_until || '',
    mt_paused_until: st.mt_paused_until || '',
    last_reset_at: st.last_reset_at || '',
    last_restore_at: st.last_restore_at || '',
    restored_backup_at: st.restored_backup_at || '',
    schema_version: st.schema_version || ''
  };
  cache_().put('sys:state', JSON.stringify(small), 60);
  return small;
}

/** ScriptProperties không bí mật qua cache `sys:props` (TTL 30 giây) */
function sysProps_() {
  var c = cache_().get('sys:props');
  if (c) return JSON.parse(c);
  var props = {
    dataset_epoch: prop_('DATASET_EPOCH') || '',
    maintenance_mode: prop_('MAINTENANCE_MODE') === 'true',
    env: envName_()
  };
  cache_().put('sys:props', JSON.stringify(props), 30);
  return props;
}

/* ---------------- Settings ---------------- */

function parseSetting_(type, v) {
  if (type === 'INT' || type === 'NUMBER') return v === '' ? null : Number(v);
  if (type === 'BOOL') return String(v) === 'true' || String(v) === 'TRUE' || v === true;
  if (type === 'JSON') { try { return JSON.parse(String(v)); } catch (e) { return null; } }
  return String(v);
}

/** Settings: Sheet → cache 60 giây; thiếu khóa thì lấy mặc định */
function settings_() {
  if (DB_.settings) return DB_.settings;
  var c = cache_().get('cfg:settings');
  var map;
  if (c) {
    map = JSON.parse(c);
  } else {
    map = {};
    SETTINGS_DEFAULTS.forEach(function (d) { map[d[0]] = d[2]; });
    try {
      readRows_('Settings').forEach(function (r) { map[r.setting_key] = parseSetting_(r.value_type, r.value); });
    } catch (e) {
      // trước setup: dùng mặc định
    }
    cache_().put('cfg:settings', JSON.stringify(map), 60);
  }
  DB_.settings = map;
  return map;
}

function setting_(key) {
  var m = settings_();
  if (Object.prototype.hasOwnProperty.call(m, key)) return m[key];
  for (var i = 0; i < SETTINGS_DEFAULTS.length; i++) if (SETTINGS_DEFAULTS[i][0] === key) return SETTINGS_DEFAULTS[i][2];
  return null;
}

/**
 * Đọc nhiều dòng theo số dòng: gom các dòng liền nhau thành một lần đọc; quá nhiều khúc thì đọc một lần cả khoảng
 * từ dòng nhỏ nhất tới lớn nhất rồi lọc (lượt kiểm của một máy rải rác trong sheet).
 */
function readRowsByNums_(name, nums) {
  if (!nums.length) return [];
  var h = hdr_(name);
  var sorted = nums.slice().sort(function (a, b) { return a - b; });
  var blocks = [];
  sorted.forEach(function (n) {
    var b = blocks[blocks.length - 1];
    if (b && n === b.end + 1) b.end = n; else blocks.push({ start: n, end: n });
  });
  var sheet = sh_(name);
  var out = [];
  if (blocks.length > 20) {
    var lo = sorted[0], hi = sorted[sorted.length - 1];
    var want = {};
    sorted.forEach(function (n) { want[n] = true; });
    var vals = sheet.getRange(lo, 1, hi - lo + 1, h.cols.length).getValues();
    vals.forEach(function (r, i) { if (want[lo + i]) out.push(rowToObj_(name, h, r, lo + i)); });
    return out;
  }
  blocks.forEach(function (b) {
    var vals = sheet.getRange(b.start, 1, b.end - b.start + 1, h.cols.length).getValues();
    vals.forEach(function (r, i) { out.push(rowToObj_(name, h, r, b.start + i)); });
  });
  return out;
}

// ===== 04_i18n.js =====
/* 04_i18n: lời báo song ngữ cho mã kết quả */

var MSG = {
  OK: ['Thành công', '成功'],
  AUTH_REQUIRED: ['Cần đăng nhập lại', '需要重新登录'],
  AUTH_REQUIRED_REVOKED: ['Phiên đã bị thu hồi hoặc quyền đã thay đổi', '会话已撤销或权限已变更'],
  SESSION_EXPIRED: ['Phiên đăng nhập đã hết hạn', '登录会话已过期'],
  AUTH_FAILED: ['Mã nhân viên hoặc PIN không đúng', '工号或PIN错误'],
  PIN_LOCKED: ['Tạm khóa do nhập sai PIN nhiều lần, thử lại sau {n} phút', '因多次输错PIN已暂时锁定，请 {n} 分钟后重试'],
  LOGIN_PAUSED: ['Đăng nhập đang tạm dừng, thử lại sau {n} phút', '登录已暂停，请 {n} 分钟后重试'],
  ACCOUNT_DISABLED: ['Tài khoản đã bị khóa, liên hệ quản trị', '账户已被停用，请联系管理员'],
  MUST_CHANGE_PIN: ['Bạn đang dùng PIN tạm, hãy đặt PIN mới', '您正在使用临时PIN，请设置新PIN'],
  TEMP_PIN_EXPIRED: ['PIN tạm đã hết hạn, liên hệ quản trị để cấp lại', '临时PIN已过期，请联系管理员重新发放'],
  REAUTH_REQUIRED: ['Nhập lại PIN để tiếp tục', '请重新输入PIN以继续'],
  DATASET_RESET: ['Dữ liệu đã được đặt lại, cần tải lại', '数据已重置，需重新加载'],
  SYSTEM_MAINTENANCE: ['Hệ thống đang bảo trì', '系统维护中'],
  FORBIDDEN: ['Không có quyền', '无权限'],
  VALIDATION_ERROR: ['Dữ liệu chưa hợp lệ', '数据无效'],
  VERSION_CONFLICT: ['Xung đột, cần xử lý', '冲突，需处理'],
  DUPLICATE_OPERATION: ['Thao tác đã được ghi trước đó', '该操作此前已保存'],
  OPERATION_ID_REUSED: ['Mã thao tác bị dùng lại với nội dung khác', '操作编号被用于不同内容'],
  NOT_FOUND: ['Không tìm thấy', '未找到'],
  FEATURE_NOT_ENABLED: ['Chức năng chưa bật', '功能尚未启用'],
  CLIENT_UPDATE_REQUIRED: ['Cần cập nhật app, nháp vẫn được giữ', '需要更新应用，草稿仍会保留'],
  SERVER_BUSY: ['Máy chủ đang bận, thử lại sau ít giây', '服务器繁忙，请稍后重试'],
  QUOTA_EXCEEDED: ['Đã hết hạn mức của Google hôm nay', '今日谷歌配额已用尽'],
  INTERNAL_ERROR: ['Lỗi máy chủ', '服务器错误'],
  SYSTEM_NOT_READY: ['Máy chủ chưa được cài đặt', '服务器尚未初始化'],
  RECOVERY_REQUIRED: ['Thao tác ghi chưa hoàn tất, cần phục hồi', '写入未完成，需要恢复']
};

/** Lời báo cho mã con trong errors[] */
var SUB_MSG = {
  ID_INVALID: ['Mã định danh không hợp lệ', '标识无效'],
  ID_EXISTS: ['Mã định danh đã tồn tại', '标识已存在'],
  CODE_DUPLICATE: ['Mã đã được dùng', '编号已被使用'],
  CODE_INVALID: ['Mã chỉ gồm chữ hoa, số và . _ / -', '编号只能包含大写字母、数字及 . _ / -'],
  PIN_WEAK: ['PIN quá dễ đoán, hãy chọn PIN khác', 'PIN过于简单，请换一个'],
  PIN_FORMAT: ['PIN phải gồm đúng 6 chữ số', 'PIN必须为6位数字'],
  PIN_SAME: ['PIN mới phải khác PIN hiện tại', '新PIN不能与当前PIN相同'],
  REQUIRED: ['Bắt buộc nhập', '必填'],
  REQUIRED_ONE_LANGUAGE: ['Nhập ít nhất một thứ tiếng', '请至少填写一种语言'],
  INVALID_VALUE: ['Giá trị không hợp lệ', '值无效'],
  INVALID_DATE: ['Ngày không hợp lệ', '日期无效'],
  NOT_FOUND: ['Không tìm thấy hồ sơ liên quan', '未找到相关记录'],
  NEEDS_NETWORK: ['Cần kết nối mạng', '需要网络连接'],
  FILE_TOO_LARGE: ['Tệp quá lớn', '文件过大'],
  FILE_TYPE: ['Loại tệp không được hỗ trợ', '不支持的文件类型'],
  URL_INVALID: ['Liên kết không đúng dạng …/exec của Apps Script', '链接不是 Apps Script 的 …/exec 格式'],
  SELF_ACTION: ['Không thao tác lên chính mình', '不能对自己执行此操作'],
  LAST_ADMIN: ['Phải còn ít nhất một tài khoản Quản trị đang hoạt động', '必须保留至少一个启用的管理员账号'],
  STATUS_INVALID: ['Trạng thái hiện tại không cho thao tác này', '当前状态不允许此操作'],
  // ISO
  DEPT_UNKNOWN: ['Không có bộ phận này (xem cột Bộ phận)', '无此部门（请检查部门列）'],
  GROUP_INVALID: ['Không lấy được nhóm từ mã biểu (dạng BM-<bộ phận>-xx-yy)', '无法从表单编号获取分组（格式 BM-<部门>-xx-yy）'],
  STATUS_SYMBOL: ['Tình trạng biểu phải là ○ ◐ ● hoặc ✕', '表单状态须为 ○ ◐ ● 或 ✕'],
  WHERE_INVALID: ['Nơi làm không thuộc 6 giá trị của danh mục', '执行位置不属于目录的6个取值'],
  PRIORITY_INVALID: ['Ưu tiên chỉ là 1, 2, 3 hoặc để trống', '优先级只能为1、2、3或留空'],
  PERIOD_DAYS_INVALID: ['Chu kỳ hồ sơ là số ngày (1, 7, 31, 92, 183, 366) hoặc để trống', '记录周期为天数（1、7、31、92、183、366）或留空'],
  REV_INVALID: ['Lần ban hành là số (01, 02…)', '发布次数须为数字（01、02…）'],
  CODE_DUPLICATE_FILE: ['Mã biểu bị trùng trong tệp', '文件中表单编号重复'],
  TEMPLATE_UNKNOWN: ['Tệp không đúng khuôn file Excel tổng (thiếu sheet Danh mục tổng hoặc dòng tiêu đề)', '文件不符合总表格式（缺少总清单表或标题行）'],
  TEMPLATE_OLD_EPOCH: ['Tệp xuất từ dữ liệu trước lần đặt lại — xuất lại rồi sửa', '文件导出于数据重置之前，请重新导出后再修改'],
  BATCH_STATE: ['Lô nhập không ở trạng thái cho phép thao tác này', '导入批次状态不允许此操作'],
  IMPORT_SAME_USER: ['Lô nhạy cảm: người ghi phải khác người nhập (trừ Quản trị)', '敏感批次：写入人须与导入人不同（管理员除外）'],
  ROW_CHANGED: ['Biểu đã được sửa sau khi xem trước — nhập lại tệp', '预览后表单已被修改，请重新导入文件'],
  TOO_MANY_ROWS: ['Mỗi lượt gửi tối đa 200 dòng', '每次最多发送200行'],
  KIND_INVALID: ['Loại tài liệu không hợp lệ', '文件类型无效'],
  LEVEL_INVALID: ['Cấp tài liệu không hợp lệ', '文件级别无效'],
  CLAUSE_INVALID: ['Điều khoản ISO 9001 dạng 4.1, 8.5.2 …', 'ISO 9001条款格式为 4.1、8.5.2 …'],
  OUT_OF_SCOPE: ['Ngoài phạm vi bộ phận của bạn', '超出您的部门范围']
};

function fmtMsg_(pair, vars) {
  if (!vars) return pair;
  return pair.map(function (s) {
    return s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; });
  });
}

/** Lỗi API: ném ra ở mọi tầng, dispatcher đổi thành phản hồi */
function apiError_(code, data, errors, msgVars) {
  var e = new Error(code);
  e.apiCode = code;
  e.apiData = data || null;
  e.apiErrors = errors || [];
  e.msgVars = msgVars || null;
  return e;
}

/** Một dòng errors[] */
function fieldError_(field, subCode, row) {
  var m = SUB_MSG[subCode] || [subCode, subCode];
  return { row: row === undefined ? null : row, field: field || null, code: subCode, message_vi: m[0], message_zh: m[1] };
}

function validationError_(errs) {
  return apiError_('VALIDATION_ERROR', null, errs);
}

// ===== 05_lock.js =====
/* 05_lock: khóa ghi chung (phụ lục 1.5 mục 3.15) */

var LOCK_DEPTH_ = 0;

/**
 * Chạy fn dưới ScriptLock. Chờ quá 10 giây → SERVER_BUSY.
 * Gọi lồng nhau thì dùng lại khóa đang giữ. Luôn flush trước khi nhả khóa,
 * kể cả khi fn ném lỗi sau khi đã ghi (vd ghi lần sai PIN rồi báo AUTH_FAILED).
 */
function withWriteLock_(fn) {
  if (LOCK_DEPTH_ > 0) return fn();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw apiError_('SERVER_BUSY');
  LOCK_DEPTH_++;
  try {
    return fn();
  } finally {
    LOCK_DEPTH_--;
    try { SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  }
}

// ===== 06_auth.js =====
/* 06_auth: PIN, đăng nhập, token, phiên, hỏi lại PIN, đổi PIN (chép từ Checksheet, lõi M&E) */

function pepperKey_() {
  var p = prop_('PIN_PEPPER_V1');
  if (!p) throw apiError_('SYSTEM_NOT_READY');
  return b64d_(p);
}

function tokenKey_() {
  var p = prop_('TOKEN_SECRET_V1');
  if (!p) throw apiError_('SYSTEM_NOT_READY');
  return b64d_(p);
}

/** pin_hash = Base64(HMAC-SHA256(key = pepper, message = salt ‖ PIN)) (3.5) */
function pinHash_(pin, saltBytes, keyBytes) {
  var msg = saltBytes.concat(utf8Bytes_(pin));
  return b64_(hmac256_(msg, keyBytes));
}

/** employee_code_hash = base64url(HMAC-SHA256(key, "emp:" + MÃ)) (3.5) */
function empHash_(code, keyBytes) {
  return b64url_(hmac256_(utf8Bytes_('emp:' + code), keyBytes || pepperKey_()));
}

function normEmpCode_(s) {
  return trimStr_(s).toUpperCase();
}

/** Lý do PIN yếu, hoặc null (3.5). */
function pinWeakReason_(pin, employeeCode, currentPin) {
  if (!/^\d{6}$/.test(String(pin))) return 'PIN_FORMAT';
  if (/^(\d)\1{5}$/.test(pin)) return 'PIN_WEAK';
  if ('0123456789'.indexOf(pin) >= 0 || '9876543210'.indexOf(pin) >= 0) return 'PIN_WEAK';
  var digits = String(employeeCode || '').replace(/\D/g, '');
  if (digits.length) {
    var last6 = digits.length >= 6 ? digits.slice(-6) : ('000000' + digits).slice(-6);
    if (pin === last6) return 'PIN_WEAK';
  }
  if (currentPin && pin === currentPin) return 'PIN_WEAK';
  return null;
}

/** Sinh PIN 6 số ngẫu nhiên không yếu (PIN tạm, 3.6) */
function randomPin_(employeeCode) {
  for (var i = 0; i < 50; i++) {
    var b = sha256_(Utilities.getUuid());
    var n = ((u8_(b[0]) << 16) | (u8_(b[1]) << 8) | u8_(b[2])) % 1000000;
    var pin = ('000000' + n).slice(-6);
    if (!pinWeakReason_(pin, employeeCode)) return pin;
  }
  throw new Error('Cannot generate PIN');
}

/** Salt và hash mới cho một PIN */
function newPinRecord_(pin) {
  var salt = randomBytes16_();
  return { salt: b64_(salt), pin_hash: pinHash_(pin, salt, pepperKey_()), pin_hash_version: 'HMAC256-v1' };
}

function verifyPinAgainst_(user, pin) {
  var key = pepperKey_();
  if (!user || !user.salt || !user.pin_hash) {
    pinHash_(pin, sha256_('fake-salt').slice(0, 16), key); // giữ thời gian tương đương
    return false;
  }
  return ctEqualStr_(pinHash_(pin, b64d_(user.salt), key), user.pin_hash);
}

/* ---------------- AuthAttempts ---------------- */

function logAttempt_(kind, outcome, empHash, user, req) {
  insertRows_('AuthAttempts', [{
    attempt_id: uuid_(), occurred_at: isoVN_(now_()), employee_code_hash: empHash || '',
    device_id: isUuidV4_(req.device_id) ? req.device_id : '', outcome: outcome, attempt_kind: kind,
    user_id: user ? user.user_id : ''
  }]);
}

/** Đếm lần sai LOGIN toàn hệ thống trong cửa sổ (đọc phần đuôi AuthAttempts) */
function countRecentGlobalFails_(windowMin) {
  var since = now_().getTime() - windowMin * 60000;
  var tail = readTail_('AuthAttempts', 600);
  var n = 0;
  for (var i = tail.length - 1; i >= 0; i--) {
    var t = parseTime_(tail[i].occurred_at);
    if (!t) continue;
    if (t.getTime() < since) break;
    if (tail[i].attempt_kind === 'LOGIN' && tail[i].outcome === 'FAILED') n++;
  }
  return n;
}

/**
 * Ghi một lần sai theo người (Users) hoặc theo mã không tồn tại (CacheService).
 * Trả {locked: bool, retry: giây}.
 */
function registerFailure_(user, empHash) {
  var lim = setting_('login_fail_limit'), win = setting_('login_fail_window_minutes'), lockMin = setting_('login_lock_minutes');
  var t = now_().getTime();
  if (user) {
    var ws = parseTime_(user.failed_window_started_at);
    var count;
    if (!ws || t - ws.getTime() > win * 60000) { count = 1; ws = new Date(t); } else { count = (user.failed_attempts || 0) + 1; }
    var upd = { failed_attempts: count, failed_window_started_at: isoVN_(ws) };
    var locked = false;
    if (count >= lim) {
      upd = { failed_attempts: 0, failed_window_started_at: '', locked_until: isoVN_(new Date(t + lockMin * 60000)) };
      locked = true;
    }
    writeCells_('Users', user.__row, upd);
    cache_().remove('us:' + user.user_id);
    return { locked: locked, retry: lockMin * 60 };
  }
  var c = cache_();
  var fc = c.get('fc:' + empHash);
  var st = fc ? JSON.parse(fc) : null;
  if (!st || t - st.ws > win * 60000) st = { n: 1, ws: t }; else st.n++;
  if (st.n >= lim) {
    c.put('lk:' + empHash, String(t + lockMin * 60000), lockMin * 60);
    c.remove('fc:' + empHash);
    return { locked: true, retry: lockMin * 60 };
  }
  c.put('fc:' + empHash, JSON.stringify(st), win * 60);
  return { locked: false, retry: 0 };
}

/** Thời gian còn khóa (giây) theo người hoặc theo mã không tồn tại; 0 nếu không khóa */
function lockedRemaining_(user, empHash) {
  var t = now_().getTime();
  if (user) {
    var lu = parseTime_(user.locked_until);
    return lu && lu.getTime() > t ? Math.ceil((lu.getTime() - t) / 1000) : 0;
  }
  var lk = cache_().get('lk:' + empHash);
  return lk && Number(lk) > t ? Math.ceil((Number(lk) - t) / 1000) : 0;
}

function lockedError_(retry) {
  return apiError_('PIN_LOCKED', { retry_after_seconds: retry }, null, { n: Math.max(1, Math.ceil(retry / 60)) });
}

/* ---------------- Token và Sessions ---------------- */

function signToken_(sid, exp) {
  return b64url_(hmac256_(utf8Bytes_('v1.' + sid + '.' + exp), tokenKey_()));
}

function tokenHash_(token) {
  return b64url_(sha256_(token));
}

function sessionSeconds_(kind) {
  if (kind === 'CHANGE_PIN') return setting_('change_pin_session_minutes') * 60;
  var testSec = isTestEnv_() ? Number(prop_('TEST_SESSION_SECONDS') || 0) : 0;
  if (testSec > 0) return testSec;
  return setting_('session_days') * 86400;
}

/** Tạo phiên mới (dưới khóa ghi). Trả {token, expires_at, session_id} */
function createSession_(user, kind, req) {
  var sid = uuid_();
  var exp = unixNow_() + sessionSeconds_(kind);
  var token = 'v1.' + sid + '.' + exp + '.' + signToken_(sid, exp);
  var nowIso = isoVN_(now_());
  var p = req.payload || {};
  insertRows_('Sessions', [{
    session_id: sid, token_hash: tokenHash_(token), user_id: user.user_id,
    device_id: isUuidV4_(req.device_id) ? req.device_id : '', issued_at: nowIso,
    expires_at: isoVN_(new Date(exp * 1000)), revoked_at: '', auth_version: user.auth_version || 0,
    dataset_epoch: sysProps_().dataset_epoch, app_id: APP_ID, origin_key: '', session_kind: kind,
    last_seen_at: nowIso, revoke_reason: '', device_label: trimStr_(p.device_label).slice(0, 60)
  }]);
  if (kind === 'FULL') enforceMaxSessions_(user.user_id);
  return { token: token, expires_at: isoVN_(new Date(exp * 1000)), session_id: sid };
}

function isSessionActive_(s, tMs) {
  if (s.revoked_at) return false;
  var e = parseTime_(s.expires_at);
  return !!e && e.getTime() > tMs;
}

function enforceMaxSessions_(userId) {
  var max = setting_('max_sessions_per_user');
  var t = now_().getTime();
  var act = findAll_('Sessions', 'user_id', userId).filter(function (s) {
    return s.session_kind === 'FULL' && isSessionActive_(s, t);
  });
  if (act.length <= max) return;
  act.sort(function (a, b) { return String(a.issued_at) < String(b.issued_at) ? -1 : 1; });
  act.slice(0, act.length - max).forEach(function (s) { revokeSessionRow_(s, 'LIMIT'); });
}

/** Thu hồi một phiên: ghi Sheet trước rồi mới ghi cache (3.7) */
function revokeSessionRow_(s, reason) {
  writeCells_('Sessions', s.__row, { revoked_at: isoVN_(now_()), revoke_reason: reason });
  cache_().put('rv:' + s.session_id, reason === 'DATASET_RESET' ? 'DATASET_RESET' : '1', 21600);
  cache_().remove('ss:' + s.session_id);
}

/** Tăng auth_version, thu hồi mọi phiên còn hiệu lực của người dùng (dưới khóa ghi) */
function bumpAuthVersion_(user, extraUserFields) {
  var oldV = user.auth_version || 0;
  var newV = oldV + 1;
  var upd = extraUserFields || {};
  upd.auth_version = newV;
  upd.updated_at = isoVN_(now_());
  writeCells_('Users', user.__row, upd);
  var t = now_().getTime();
  findAll_('Sessions', 'user_id', user.user_id).forEach(function (s) {
    if (isSessionActive_(s, t)) {
      writeCells_('Sessions', s.__row, { revoked_at: isoVN_(now_()), revoke_reason: 'AUTH_VERSION' });
      cache_().remove('ss:' + s.session_id);
    }
  });
  var c = cache_();
  c.put('av:' + user.user_id, String(newV), 21600);
  c.remove('us:' + user.user_id);
  c.remove('scope:' + user.user_id + ':' + oldV);
  user.auth_version = newV;
  return newV;
}

function publicUser_(u) {
  return {
    user_id: u.user_id, employee_code: u.employee_code, display_name: u.display_name,
    role_level: u.role_level, is_system_owner: !!u.is_system_owner, dept_codes: deptList_(u.dept_codes),
    iso_secretary: !!u.iso_secretary, auditor: !!u.auditor
  };
}

/** Danh sách bộ phận của người dùng (chuỗi cách nhau bằng dấu phẩy); rỗng = mọi bộ phận */
function deptList_(s) {
  return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(String);
}

/** Users không có pin_hash/salt, qua cache `us:` TTL 600 giây */
function userCached_(uid) {
  var c = cache_().get('us:' + uid);
  if (c) return JSON.parse(c);
  var u = findOne_('Users', 'user_id', uid);
  if (!u) return null;
  delete u.pin_hash; delete u.salt;
  cache_().put('us:' + uid, JSON.stringify(u), 600);
  return u;
}

/* ---------------- auth.login ---------------- */

// App gửi lại đúng request đăng nhập (cùng login_id) khi mất phản hồi: trả lại kết quả lần đầu trong 5 phút,
// không tính thêm lần sai, không tạo thêm phiên. Khóa cache băm cả mã NV + PIN + máy nên không dùng được cho PIN khác.
var LOGIN_REPLAY_SECONDS_ = 300;
var LOGIN_REPLAY_CODES_ = { AUTH_FAILED: 1, PIN_LOCKED: 1, ACCOUNT_DISABLED: 1, TEMP_PIN_EXPIRED: 1, MUST_CHANGE_PIN: 1 };

function loginReplayKey_(req, code, pin) {
  var lid = (req.payload || {}).login_id;
  if (!isUuidV4_(lid)) return null;
  return 'ln:' + b64url_(sha256_(lid + '|' + code + '|' + pin + '|' + String(req.device_id || '')));
}

function authLogin_(req) {
  var p = req.payload || {};
  var code = normEmpCode_(p.employee_code);
  var pin = String(p.pin === undefined || p.pin === null ? '' : p.pin);
  if (!code || code.length > 40) throw validationError_([fieldError_('employee_code', 'REQUIRED')]);
  if (!/^\d{6}$/.test(pin)) throw validationError_([fieldError_('pin', 'PIN_FORMAT')]);

  var rk = loginReplayKey_(req, code, pin);
  if (rk) {
    var hit = cache_().get(rk);
    if (hit) {
      var h = JSON.parse(hit);
      if (h.ok) return h.data;
      throw apiError_(h.code, h.data, null, h.vars);
    }
  }
  try {
    var out = authLoginCheck_(req, code, pin);
    if (rk) cache_().put(rk, JSON.stringify({ ok: true, data: out }), LOGIN_REPLAY_SECONDS_);
    return out;
  } catch (e) {
    if (rk && e && LOGIN_REPLAY_CODES_[e.apiCode]) {
      cache_().put(rk, JSON.stringify({ ok: false, code: e.apiCode, data: e.apiData, vars: e.msgVars }), LOGIN_REPLAY_SECONDS_);
    }
    throw e;
  }
}

function authLoginCheck_(req, code, pin) {
  var key = pepperKey_();
  var eh = empHash_(code, key);
  var t = now_().getTime();

  // Tạm dừng toàn hệ thống: không kiểm PIN, không tính lượt
  var ss = sysStateCached_();
  var paused = parseTime_(ss.login_paused_until);
  if (paused && paused.getTime() > t) {
    var retryP = Math.ceil((paused.getTime() - t) / 1000);
    withWriteLock_(function () { logAttempt_('LOGIN', 'PAUSED', eh, null, req); });
    throw apiError_('LOGIN_PAUSED', { retry_after_seconds: retryP }, null, { n: Math.max(1, Math.ceil(retryP / 60)) });
  }

  var user = findOne_('Users', 'employee_code', code);
  if (sysProps_().maintenance_mode) throw apiError_('SYSTEM_MAINTENANCE');
  var preLocked = lockedRemaining_(user, eh);
  if (preLocked > 0) {
    withWriteLock_(function () { logAttempt_('LOGIN', 'LOCKED', eh, user, req); });
    throw lockedError_(preLocked);
  }

  // HMAC ngoài khóa
  var okPin = verifyPinAgainst_(user, pin);

  return withWriteLock_(function () {
    if (user) {
      var pre = user;
      user = readRowAt_('Users', pre.__row);
      // PIN vừa bị đổi bởi request khác trong lúc tính HMAC: tính lại theo bản mới
      if (user.pin_hash !== pre.pin_hash || user.salt !== pre.salt) okPin = verifyPinAgainst_(user, pin);
    }
    var rem = lockedRemaining_(user, eh);
    if (rem > 0) {
      logAttempt_('LOGIN', 'LOCKED', eh, user, req);
      throw lockedError_(rem);
    }
    if (!okPin) {
      var f = registerFailure_(user, eh);
      logAttempt_('LOGIN', 'FAILED', eh, user, req);
      var gLim = setting_('login_global_fail_limit');
      if (countRecentGlobalFails_(setting_('login_global_window_minutes')) >= gLim) {
        var st = readState_();
        stateWrite_(st, { login_paused_until: ['DATETIME', isoVN_(new Date(t + setting_('login_global_pause_minutes') * 60000))] });
        cache_().remove('sys:state');
      }
      if (f.locked) throw lockedError_(f.retry);
      throw apiError_('AUTH_FAILED');
    }
    if (!user.active) {
      logAttempt_('LOGIN', 'DISABLED', eh, user, req);
      throw apiError_('ACCOUNT_DISABLED');
    }
    var upd = {};
    if (user.failed_attempts || user.failed_window_started_at || user.locked_until) {
      upd.failed_attempts = 0; upd.failed_window_started_at = ''; upd.locked_until = '';
    }
    if (user.must_change_pin) {
      var tExp = parseTime_(user.temp_pin_expires_at);
      if (!tExp || tExp.getTime() <= t) {
        if (Object.keys(upd).length) writeCells_('Users', user.__row, upd);
        logAttempt_('LOGIN', 'TEMP_PIN_EXPIRED', eh, user, req);
        throw apiError_('TEMP_PIN_EXPIRED');
      }
      if (Object.keys(upd).length) writeCells_('Users', user.__row, upd);
      var cs = createSession_(user, 'CHANGE_PIN', req);
      logAttempt_('LOGIN', 'MUST_CHANGE_PIN', eh, user, req);
      throw apiError_('MUST_CHANGE_PIN', { token: cs.token, expires_at: cs.expires_at, session_kind: 'CHANGE_PIN', user: publicUser_(user) });
    }
    upd.last_login_at = isoVN_(now_());
    writeCells_('Users', user.__row, upd);
    cache_().remove('us:' + user.user_id);
    var s = createSession_(user, 'FULL', req);
    logAttempt_('LOGIN', 'SUCCESS', eh, user, req);
    return { token: s.token, expires_at: s.expires_at, session_kind: 'FULL', user: publicUser_(user) };
  });
}

/* ---------------- Kiểm phiên ở mỗi request ---------------- */

function authRequired_(reason) {
  return apiError_('AUTH_REQUIRED', { reason: reason });
}

/** Các bước 1–7 của 3.7. Trả ctx {sid, session, user, req} */
function requireSession_(req, action) {
  var token = req.token;
  if (!token || typeof token !== 'string') throw authRequired_('INVALID');
  var parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1' || !isUuidV4_(parts[1]) || !/^\d{1,12}$/.test(parts[2])) throw authRequired_('INVALID');
  var sid = parts[1], exp = Number(parts[2]);
  if (!ctEqualStr_(signToken_(sid, exp), parts[3])) throw authRequired_('INVALID');
  var nowSec = unixNow_();
  if (exp <= nowSec) throw apiError_('SESSION_EXPIRED');

  var c = cache_();
  var got = c.getAll(['ss:' + sid, 'rv:' + sid]);
  if (got['rv:' + sid]) throw got['rv:' + sid] === 'DATASET_RESET' ? apiError_('DATASET_RESET') : authRequired_('REVOKED');
  var ss = got['ss:' + sid] ? JSON.parse(got['ss:' + sid]) : null;
  if (!ss) {
    var row = findOne_('Sessions', 'session_id', sid);
    if (!row) throw authRequired_('INVALID');
    ss = {
      row: row.__row, user_id: row.user_id, token_hash: row.token_hash, session_kind: row.session_kind,
      auth_version: row.auth_version || 0, dataset_epoch: row.dataset_epoch, revoked_at: row.revoked_at,
      revoke_reason: row.revoke_reason, last_seen_at: row.last_seen_at
    };
    c.put('ss:' + sid, JSON.stringify(ss), Math.max(1, Math.min(21600, exp - nowSec)));
  }
  if (!ctEqualStr_(ss.token_hash, tokenHash_(token))) throw authRequired_('INVALID');
  // Phiên bị thu hồi do Xóa sạch/khôi phục: báo DATASET_RESET để app xóa dữ liệu cũ, giữ nháp thành "Nháp thế hệ dữ liệu cũ"
  if (ss.revoked_at && ss.revoke_reason === 'DATASET_RESET') throw apiError_('DATASET_RESET');
  if (ss.revoked_at) throw authRequired_(ss.revoke_reason === 'AUTH_VERSION' ? 'AUTH_VERSION' : 'REVOKED');

  var u = userCached_(ss.user_id);
  if (!u || !u.active) throw authRequired_('REVOKED');
  var av = c.get('av:' + ss.user_id);
  if (Number(ss.auth_version) !== Number(u.auth_version || 0) || (av !== null && av !== undefined && Number(av) !== Number(ss.auth_version))) {
    throw authRequired_('AUTH_VERSION');
  }
  var props = sysProps_();
  if (ss.dataset_epoch !== props.dataset_epoch || req.dataset_epoch !== props.dataset_epoch) throw apiError_('DATASET_RESET');
  if (ss.session_kind === 'CHANGE_PIN' && action !== 'pin.change' && action !== 'auth.logout') {
    throw apiError_('MUST_CHANGE_PIN');
  }
  // last_seen_at tối đa 1 lần/60 phút
  var ls = parseTime_(ss.last_seen_at);
  if (!ls || nowSec * 1000 - ls.getTime() > 3600000) {
    try {
      var nowIso = isoVN_(now_());
      // Số dòng trong cache có thể đã lệch nếu trigger xóa bớt dòng Sessions: kiểm lại trước khi ghi
      var rn = ss.row;
      if (!rn || sh_('Sessions').getRange(rn, 1).getValue() !== sid) rn = (findOne_('Sessions', 'session_id', sid) || {}).__row;
      if (rn) { writeCells_('Sessions', rn, { last_seen_at: nowIso }); ss.row = rn; }
      ss.last_seen_at = nowIso;
      c.put('ss:' + sid, JSON.stringify(ss), Math.max(1, Math.min(21600, exp - nowSec)));
    } catch (e) { /* không chặn request */ }
  }
  return { sid: sid, session: ss, user: u, req: req, token: token };
}

/* ---------------- auth.reauth ---------------- */

function signReauth_(payloadB64) {
  return b64url_(hmac256_(utf8Bytes_('r1.' + payloadB64), tokenKey_()));
}

function makeReauthToken_(ctx) {
  var exp = unixNow_() + setting_('reauth_window_minutes') * 60;
  var payload = b64url_(utf8Bytes_(JSON.stringify({
    session_id: ctx.sid, user_id: ctx.user.user_id, auth_version: ctx.user.auth_version || 0, exp: exp
  })));
  return { reauth_token: 'r1.' + payload + '.' + signReauth_(payload), expires_at: isoVN_(new Date(exp * 1000)) };
}

function verifyReauth_(ctx, rt) {
  if (!rt || typeof rt !== 'string') return false;
  var parts = rt.split('.');
  if (parts.length !== 3 || parts[0] !== 'r1') return false;
  if (!ctEqualStr_(signReauth_(parts[1]), parts[2])) return false;
  var p;
  try { p = JSON.parse(Utilities.newBlob(b64urlDecode_(parts[1])).getDataAsString()); } catch (e) { return false; }
  return p.exp > unixNow_() && p.session_id === ctx.sid && p.user_id === ctx.user.user_id &&
    Number(p.auth_version) === Number(ctx.user.auth_version || 0);
}

/**
 * Kiểm PIN của người đang có phiên (reauth, đổi PIN): chung bộ đếm theo người.
 * HMAC tính ngoài khóa; trong khóa đọc lại dòng, kiểm khóa lần nữa và tính lại nếu PIN vừa đổi.
 * PIN đúng → onOk(user mới đọc, empHash) chạy trong cùng khóa.
 */
function checkOwnPin_(ctx, pin, kind, onOk) {
  pin = String(pin === undefined || pin === null ? '' : pin);
  if (!/^\d{6}$/.test(pin)) throw validationError_([fieldError_(kind === 'CHANGE_PIN' ? 'current_pin' : 'pin', 'PIN_FORMAT')]);
  var pre = findOne_('Users', 'user_id', ctx.user.user_id);
  var rem0 = lockedRemaining_(pre, null);
  if (rem0 > 0) throw lockedError_(rem0);
  var ok = verifyPinAgainst_(pre, pin);
  var eh = empHash_(pre.employee_code);
  return withWriteLock_(function () {
    var u = readRowAt_('Users', pre.__row);
    var rem = lockedRemaining_(u, null);
    if (rem > 0) throw lockedError_(rem);
    if (u.pin_hash !== pre.pin_hash || u.salt !== pre.salt) ok = verifyPinAgainst_(u, pin);
    if (!ok) {
      var f = registerFailure_(u, eh);
      logAttempt_(kind, 'FAILED', eh, u, ctx.req);
      if (f.locked) throw lockedError_(f.retry);
      throw apiError_('AUTH_FAILED');
    }
    return onOk(u, eh);
  });
}

function authReauth_(ctx) {
  checkOwnPin_(ctx, (ctx.req.payload || {}).pin, 'REAUTH', function (u, eh) {
    if (u.failed_attempts || u.failed_window_started_at) {
      writeCells_('Users', u.__row, { failed_attempts: 0, failed_window_started_at: '' });
      cache_().remove('us:' + u.user_id);
    }
    logAttempt_('REAUTH', 'SUCCESS', eh, u, ctx.req);
  });
  return makeReauthToken_(ctx);
}

/* ---------------- pin.change ---------------- */

function pinChange_(ctx) {
  var p = ctx.req.payload || {};
  var cur = String(p.current_pin || ''), nw = String(p.new_pin || '');
  var rec = /^\d{6}$/.test(nw) ? newPinRecord_(nw) : null; // HMAC ngoài khóa
  return checkOwnPin_(ctx, cur, 'CHANGE_PIN', function (u, eh) {
    var weak = pinWeakReason_(nw, u.employee_code, cur);
    if (weak) throw validationError_([fieldError_('new_pin', weak)]);
    var nowIso = isoVN_(now_());
    bumpAuthVersion_(u, {
      pin_hash: rec.pin_hash, salt: rec.salt, pin_hash_version: rec.pin_hash_version, must_change_pin: false,
      temp_pin_expires_at: '', pin_changed_at: nowIso, failed_attempts: 0, failed_window_started_at: '', locked_until: ''
    });
    logAttempt_('CHANGE_PIN', 'SUCCESS', eh, u, ctx.req);
    writeAudit_({
      user_id: u.user_id, device_id: ctx.req.device_id, action: 'pin.change', entity_type: 'USER', entity_id: u.user_id,
      before_json: null, after_json: { pin_changed_at: nowIso }, operation_id: '', auth_basis: 'ROLE_LEVEL'
    });
    var s = createSession_(u, 'FULL', ctx.req);
    return { token: s.token, expires_at: s.expires_at, session_kind: 'FULL', user: publicUser_(u) };
  });
}

/* ---------------- logout ---------------- */

function authLogout_(ctx) {
  withWriteLock_(function () {
    var row = findOne_('Sessions', 'session_id', ctx.sid);
    if (row && !row.revoked_at) revokeSessionRow_(row, 'LOGOUT');
  });
  return { logged_out: true };
}

function authLogoutAll_(ctx) {
  withWriteLock_(function () {
    var u = findOne_('Users', 'user_id', ctx.user.user_id);
    bumpAuthVersion_(u, {});
    writeAudit_({
      user_id: u.user_id, device_id: ctx.req.device_id, action: 'auth.logoutAll', entity_type: 'USER', entity_id: u.user_id,
      before_json: null, after_json: { auth_version: u.auth_version }, operation_id: ctx.req.operation_id || '', auth_basis: 'ROLE_LEVEL'
    });
  });
  return { logged_out_all: true };
}

function accountView_(ctx) {
  var u = ctx.user;
  return {
    user: publicUser_(u), session_kind: ctx.session.session_kind,
    last_login_at: u.last_login_at, pin_changed_at: u.pin_changed_at
  };
}

/* ---------------- Phiên của chính mình (4.4.14) ---------------- */

/** session.listOwn: các phiên FULL còn hiệu lực của người gọi; không trả token_hash */
function sessionListOwn_(ctx) {
  var t = now_().getTime();
  var items = findAll_('Sessions', 'user_id', ctx.user.user_id).filter(function (s) {
    return s.session_kind === 'FULL' && isSessionActive_(s, t);
  }).map(function (s) {
    return {
      session_id: s.session_id, device_label: s.device_label, issued_at: s.issued_at, last_seen_at: s.last_seen_at,
      expires_at: s.expires_at, current: s.session_id === ctx.sid
    };
  });
  items.sort(function (a, b) { return String(b.issued_at).localeCompare(String(a.issued_at)); });
  return { items: items };
}

/** session.revokeOwn {session_id}: thu hồi một phiên khác của chính mình (máy này dùng Đăng xuất) */
function sessionRevokeOwn_(ctx) {
  var id = (ctx.req.payload || {}).session_id;
  if (!isUuidV4_(id)) throw validationError_([fieldError_('session_id', 'ID_INVALID')]);
  return withWriteLock_(function () {
    var s = findOne_('Sessions', 'session_id', id);
    if (!s || s.user_id !== ctx.user.user_id) throw apiError_('NOT_FOUND');
    if (!s.revoked_at) {
      revokeSessionRow_(s, 'LOGOUT');
      writeAudit_({
        user_id: ctx.user.user_id, device_id: ctx.req.device_id, action: 'session.revokeOwn', entity_type: 'SESSION', entity_id: id,
        before_json: null, after_json: { revoked: true }, operation_id: '', auth_basis: 'ROLE_LEVEL'
      });
    }
    return { revoked: true, session_id: id };
  });
}

/* ---------------- Danh sách người (chọn người phụ trách, hiện tên) ---------------- */

/** Bản đồ user_id → {employee_code, display_name, active} qua cache 10 phút (không có PIN, email).
 *  Thao tác sửa người dùng phải remove('users:dir'). */
function userDirectory_() {
  if (DB_.userDir) return DB_.userDir;
  var c = cache_().get('users:dir');
  var m;
  if (c) {
    m = JSON.parse(c);
  } else {
    m = {};
    readRows_('Users').forEach(function (u) { m[u.user_id] = { employee_code: u.employee_code, display_name: u.display_name, active: !!u.active }; });
    try { cache_().put('users:dir', JSON.stringify(m), 600); } catch (e) { /* quá cỡ cache: đọc lại lần sau */ }
  }
  DB_.userDir = m;
  return m;
}

var NAME_FIELDS_ = {
  updated_by: 'updated_by_name', created_by: 'created_by_name', owner_user_id: 'owner_name', head_user_id: 'head_name'
};

/** Tên hiển thị của người phụ trách/người sửa gắn vào bản ghi gửi client */
function annotateNames_(o) {
  if (!o) return o;
  var dir = null;
  Object.keys(NAME_FIELDS_).forEach(function (f) {
    if (!o[f] || o[f] === SYSTEM_USER) return;
    if (!dir) dir = userDirectory_();
    var u = dir[o[f]];
    if (u) o[NAME_FIELDS_[f]] = u.display_name;
  });
  return o;
}

/** user.pickList: chỉ user_id, mã, tên hiển thị của người đang hoạt động */
function userPickList_() {
  var dir = userDirectory_();
  var items = Object.keys(dir).filter(function (id) { return dir[id].active; }).map(function (id) {
    return { user_id: id, employee_code: dir[id].employee_code, display_name: dir[id].display_name };
  });
  items.sort(function (a, b) { return String(a.employee_code).localeCompare(String(b.employee_code)); });
  return { items: items };
}

// ===== 07_perm.js =====
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

// ===== 08_ops.js =====
/* 08_ops: Operations (chống ghi trùng), mã hiển thị, AuditLogs, dịch máy (lấy từ M&E qua Checksheet) */

/** Băm payload chuẩn hóa: action, hồ sơ, expected_version, epoch, người dùng (1.4 §10.3.1) */
function payloadHash_(ctx) {
  var req = ctx.req;
  var norm = normalizeForHash_(req.payload || {});
  return b64url_(sha256_(stableStringify_({
    action: req.action, expected_version: req.expected_version === undefined ? null : req.expected_version,
    dataset_epoch: req.dataset_epoch, user_id: ctx.user.user_id, payload: norm
  })));
}

function normalizeForHash_(o) {
  if (o === null || typeof o !== 'object') return o;
  if (Array.isArray(o)) return o.map(normalizeForHash_);
  var out = {};
  Object.keys(o).forEach(function (k) {
    if (SECRET_KEYS_.indexOf(k) >= 0) return;
    if ((k === 'content_b64' || k === 'thumb_b64') && typeof o[k] === 'string') { out[k] = 'sha:' + b64url_(sha256_(o[k])); return; }
    out[k] = normalizeForHash_(o[k]);
  });
  return out;
}

function writeAudit_(a) {
  var lim = function (v) {
    if (v === null || v === undefined) return '';
    var s = JSON.stringify(redact_(v));
    return s.length > 4000 ? JSON.stringify({ truncated: true, size: s.length }) : s;
  };
  insertRows_('AuditLogs', [{
    audit_id: uuid_(), occurred_at: isoVN_(now_()), user_id: a.user_id, device_id: isUuidV4_(a.device_id) ? a.device_id : '',
    action: a.action, entity_type: a.entity_type || '', entity_id: a.entity_id || '', before_json: lim(a.before_json),
    after_json: lim(a.after_json), operation_id: a.operation_id || '', import_batch_id: a.import_batch_id || '',
    dataset_epoch: sysProps_().dataset_epoch, reason: a.reason || '', auth_basis: a.auth_basis || ''
  }]);
}

/** Phản hồi khi operation_id đã có (3.15) */
function existingOpResponse_(ctx, ex, hash) {
  if (ex.user_id !== ctx.user.user_id || ex.payload_hash !== hash || ex.action !== ctx.req.action) {
    throw apiError_('OPERATION_ID_REUSED');
  }
  if (ex.state === 'COMMITTED') {
    var data = ex.result_json || null;
    return { ok: true, code: 'DUPLICATE_OPERATION', state: 'COMMITTED', data: data, record_version: data ? data.record_version : null };
  }
  if (ex.state === 'PREPARED') return replayPrepared_(ctx, ex);
  throw apiError_('RECOVERY_REQUIRED', { operation_state: ex.state });
}

/**
 * Ghi các dòng của kế hoạch. Chế độ replay: bỏ qua dòng đã có/đã áp.
 * w.rowNum: số dòng đã biết (đọc dưới cùng khóa ghi) → không tìm lại; các dòng liền nhau của một sheet ghi một lần (nhập Excel 100 dòng).
 */
function applyWrites_(writes, replay) {
  var inserts = {}, bulk = {};
  writes.forEach(function (w) {
    if (w.mode === 'insert') {
      if (replay) {
        var key = sheetSchema_(w.sheet).key;
        if (findRowNums_(w.sheet, key, w.row[key]).length) return;
      }
      (inserts[w.sheet] = inserts[w.sheet] || []).push(w.row);
    } else if (w.mode === 'update') {
      if (w.rowNum && !replay && !w.partial) { (bulk[w.sheet] = bulk[w.sheet] || {})[w.rowNum] = w.row; return; }
      var keyU = sheetSchema_(w.sheet).key;
      var rn = findRowNums_(w.sheet, keyU, w.row[keyU])[0];
      if (!rn) throw apiError_('RECOVERY_REQUIRED', { missing: w.sheet });
      if (replay && w.row.record_version !== undefined) {
        var cur = readRowAt_(w.sheet, rn);
        if ((cur.record_version || 0) >= w.row.record_version) return;
      }
      if (w.partial) writeCells_(w.sheet, rn, w.row); else writeRow_(w.sheet, rn, w.row);
    }
  });
  Object.keys(bulk).forEach(function (s) { writeRowsBulk_(s, bulk[s]); });
  Object.keys(inserts).forEach(function (s) { insertRows_(s, inserts[s]); });
}

/** Ghi đè nhiều dòng theo số dòng: gom dòng liền nhau thành một lần setValues */
function writeRowsBulk_(name, byRow) {
  var h = hdr_(name);
  var nums = Object.keys(byRow).map(Number).sort(function (a, b) { return a - b; });
  var sheet = sh_(name);
  var i = 0;
  while (i < nums.length) {
    var j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    var vals = [];
    for (var k = i; k <= j; k++) vals.push(objToRow_(name, h, byRow[nums[k]]));
    sheet.getRange(nums[i], 1, vals.length, h.cols.length).setValues(vals);
    i = j + 1;
  }
}

function replayPrepared_(ctx, ex) {
  var intent = ex.intent_json;
  if (!intent || !intent.writes) throw apiError_('RECOVERY_REQUIRED', { operation_state: 'PREPARED' });
  var st = readState_();
  applyWrites_(intent.writes, true);
  var su = {};
  Object.keys(intent.state || {}).forEach(function (k) {
    var v = intent.state[k];
    if (v[0] === 'INT' && Number(stateGet_(st, k, 0)) >= Number(v[1])) return;
    su[k] = v;
  });
  if (Object.keys(su).length) stateWrite_(st, su, ctx.user.user_id);
  if (intent.audit) writeAudit_(intent.audit);
  writeCells_('Operations', ex.__row, {
    state: 'COMMITTED', result_code: 'OK', committed_at: isoVN_(now_()), result_json: JSON.stringify(intent.result || null)
  });
  return { ok: true, code: 'DUPLICATE_OPERATION', state: 'COMMITTED', data: intent.result || null, record_version: intent.result ? intent.result.record_version : null };
}

/**
 * Thực hiện một thao tác ghi có xác nhận COMMITTED.
 * opts.build(st) chạy dưới khóa ghi, trả {writes, state, result, audit, record_version, noReplay}.
 *  - writes: [{sheet, mode:'insert'|'update', row, partial?}]
 *  - state: {khóa SystemState: [kiểu, giá trị]} (vd code_seq)
 *  - audit: {action, entity_type, entity_id, before_json, after_json, reason}
 */
function executeWrite_(ctx, opts) {
  var req = ctx.req;
  var hash = payloadHash_(ctx);
  return withWriteLock_(function () {
    // Bảo trì vừa bật: ghi đã qua bước kiểm ở dispatcher cũng dừng dưới khóa ghi
    if (PropertiesService.getScriptProperties().getProperty('MAINTENANCE_MODE') === 'true') throw apiError_('SYSTEM_MAINTENANCE');
    var ex = findOne_('Operations', 'operation_id', req.operation_id);
    if (ex) return existingOpResponse_(ctx, ex, hash);
    var st = readState_();
    var plan = opts.build(st);
    var rev = Number(stateGet_(st, 'sync_revision', 0)) + 1;
    var nowIso = isoVN_(now_());
    var touched = {};
    plan.writes.forEach(function (w) {
      if (sheetSchema_(w.sheet).cols.indexOf('sync_revision') >= 0) w.row.sync_revision = rev;
      touched[w.sheet] = true;
    });
    var su = plan.state || {};
    su.sync_revision = ['INT', rev];
    Object.keys(touched).forEach(function (s) { su['table_rev.' + s] = ['INT', rev]; });
    var audit = null;
    if (plan.audit) {
      audit = {
        user_id: ctx.user.user_id, device_id: req.device_id, action: req.action, entity_type: plan.audit.entity_type,
        entity_id: plan.audit.entity_id, before_json: plan.audit.before_json || null, after_json: plan.audit.after_json || null,
        operation_id: req.operation_id, reason: plan.audit.reason || '', auth_basis: plan.audit.auth_basis || authBasis_(ctx)
      };
    }
    var intent = plan.noReplay ? { no_replay: true } : { writes: plan.writes, state: su, audit: audit, result: plan.result };
    var intentStr = JSON.stringify(intent);
    if (intentStr.length > 40000) intentStr = JSON.stringify({ too_large: true });
    var opRow = {
      operation_id: req.operation_id, user_id: ctx.user.user_id, device_id: isUuidV4_(req.device_id) ? req.device_id : '',
      entity_type: opts.entity_type || '', entity_id: opts.entity_id || '',
      expected_version: req.expected_version === undefined ? '' : req.expected_version, received_at: nowIso,
      state: 'PREPARED', result_code: '', sync_revision: rev, committed_at: '', dataset_epoch: sysProps_().dataset_epoch,
      action: req.action, payload_hash: hash, intent_json: intentStr, progress_json: '', result_json: ''
    };
    insertRows_('Operations', [opRow]);
    applyWrites_(plan.writes, false);
    stateWrite_(st, su, ctx.user.user_id);
    if (audit) writeAudit_(audit);
    writeCells_('Operations', opRow.__row, {
      state: 'COMMITTED', result_code: 'OK', committed_at: isoVN_(now_()), result_json: JSON.stringify(plan.result || null)
    });
    return { ok: true, code: 'OK', state: 'COMMITTED', data: plan.result || null, record_version: plan.record_version };
  });
}

/* ---------------- Mã hiển thị (3.3) ---------------- */

var MANUAL_CODE_RE_ = /^[A-Z0-9][A-Z0-9._\/-]{0,31}$/;

function codeExists_(sheet, col, code) {
  return findRowNums_(sheet, col, code).length > 0;
}

/**
 * Cấp mã hiển thị dưới khóa ghi (mã máy chủ cấp, không nhập tay).
 * su: object state update để ghi bộ đếm. Trả mã.
 */
function allocCode_(st, su, kind, bizDate) {
  var pat = CODE_PATTERNS[kind];
  var ym = pat.yymm ? yymm_(bizDate || now_()) : '';
  var key = 'code_seq.' + pat.prefix + (pat.yymm ? '.' + ym : '');
  var n = Number(stateGet_(st, key, 0));
  var code;
  for (var guard = 0; guard < 100000; guard++) {
    n++;
    var num = String(n);
    while (num.length < pat.digits) num = '0' + num;
    code = pat.prefix + '-' + (pat.yymm ? ym + '-' : '') + num;
    if (!pat.sheet || !codeExists_(pat.sheet, pat.col, code)) break;
  }
  st.map[key] = n;
  su[key] = ['INT', n];
  return code;
}

/** Bộ cột C cho dòng mới */
function cNew_(ctx, row) {
  var nowIso = isoVN_(now_());
  row.dataset_epoch = sysProps_().dataset_epoch;
  row.record_version = 1;
  row.created_at = nowIso; row.created_by = ctx.user.user_id;
  row.updated_at = nowIso; row.updated_by = ctx.user.user_id;
  row.archived_at = '';
  return row;
}

function cUpdate_(ctx, row) {
  row.record_version = (row.record_version || 0) + 1;
  row.updated_at = isoVN_(now_());
  row.updated_by = ctx.user.user_id;
  return row;
}

/** So expected_version với bản trên máy chủ (dưới khóa) */
function assertVersion_(ctx, current, entityType, sheet) {
  var ev = ctx.req.expected_version;
  if (ev === undefined || ev === null || Number(ev) !== Number(current.record_version || 0)) {
    var server = projectRow_(ctx, current);
    throw apiError_('VERSION_CONFLICT', { entity_type: entityType, server: server, server_version: current.record_version });
  }
}

/** Ghi lỗi validation cho ID client tạo (3.3) */
function assertNewId_(sheet, field, id) {
  if (!isUuidV4_(id)) throw validationError_([fieldError_(field, 'ID_INVALID')]);
  if (findRowNums_(sheet, sheetSchema_(sheet).key, id).length) throw validationError_([fieldError_(field, 'ID_EXISTS')]);
}

/* ---------------- Dịch máy (2.3) ---------------- */

/** Commit Excel không dịch (2.3 quy tắc 9): trường cần dịch đặt PENDING cho runBackgroundJobs */
var MT_DEFER_ = false;

function mtEnabled_() {
  if (!setting_('machine_translation_enabled')) return false;
  var paused = parseTime_(sysStateCached_().mt_paused_until);
  return !(paused && paused.getTime() > now_().getTime());
}

/** Dịch một chuỗi; lỗi thì trả null. Cache theo SHA-256(nguồn + chiều). */
function mtTranslate_(text, from, to) {
  if (!text) return '';
  if (isTestEnv_() && prop_('TEST_MT_FAIL') === 'true') return null;
  var ck = 'mt:' + b64url_(sha256_(from + '>' + to + ':' + text));
  var c = cache_().get(ck);
  if (c !== null && c !== undefined) return c;
  try {
    var out = LanguageApp.translate(text, from === 'zh' ? 'zh-CN' : from, to === 'zh' ? 'zh-CN' : to, { contentType: 'text' });
    if (out && out.length < 90000) cache_().put(ck, out, 21600);
    return out;
  } catch (e) {
    var msg = String(e && e.message || e);
    if (/quota|limit|too many/i.test(msg)) {
      try {
        withWriteLock_(function () {
          var st = readState_();
          stateWrite_(st, { mt_paused_until: ['DATETIME', isoVN_(new Date(now_().getTime() + 86400000))] });
        });
        cache_().remove('sys:state');
      } catch (e2) { /* bỏ qua */ }
    }
    return null;
  }
}

/**
 * Điền bên còn thiếu của các cặp trường *_vi/*_zh theo 2.3 (quy tắc 1, 5, 7).
 * fields: tên trường gốc (vd ['name']). current: bản ghi hiện có (khi sửa) hoặc null.
 * Trả {values: {name_vi, name_zh}, meta: i18n_meta mới}. Gọi NGOÀI khóa ghi.
 */
function applyTranslations_(sheet, fields, input, current) {
  var noMt = NO_MT_FIELDS[sheet] || [];
  var meta = current && current.i18n_meta ? clone_(current.i18n_meta) : {};
  var values = {};
  var budgetEnd = now_().getTime() + setting_('mt_sync_budget_seconds') * 1000;
  var nowIso = isoVN_(now_());
  var has = function (k) { return Object.prototype.hasOwnProperty.call(input, k) && input[k] !== undefined && input[k] !== null; };

  function oneSide(f, src, text) {
    var kv = f + '_vi', kz = f + '_zh';
    values[kv] = src === 'vi' ? text : '';
    values[kz] = src === 'zh' ? text : '';
    if (noMt.indexOf(f) >= 0) { meta[f] = { src: src, state: 'MANUAL_REQUIRED', at: nowIso }; return; }
    var tgt = src === 'vi' ? 'zh' : 'vi';
    // Cả chuỗi trùng thuật ngữ đã duyệt: lấy từ điển, không cần dịch máy (2.3 quy tắc 4)
    var g = glossaryExact_(text, src, tgt);
    if (g) { values[tgt === 'zh' ? kz : kv] = g; meta[f] = { src: src, state: 'GLOSSARY', at: nowIso }; return; }
    if (MT_DEFER_ || !mtEnabled_() || now_().getTime() > budgetEnd) { meta[f] = { src: src, state: 'PENDING', at: nowIso }; return; }
    var out = translateText_(text, src, tgt);
    if (out) {
      values[tgt === 'zh' ? kz : kv] = out.text;
      meta[f] = { src: src, state: out.state, at: nowIso };
    } else {
      meta[f] = { src: src, state: 'PENDING', at: nowIso };
    }
  }

  fields.forEach(function (f) {
    var kv = f + '_vi', kz = f + '_zh';
    var curVi = current ? trimStr_(current[kv]) : '', curZh = current ? trimStr_(current[kz]) : '';
    var newVi = has(kv) ? trimStr_(input[kv]) : curVi;
    var newZh = has(kz) ? trimStr_(input[kz]) : curZh;
    var m = meta[f] || null;

    if (current && m && (m.state === 'MACHINE' || m.state === 'PENDING')) {
      var src = m.src, tgt = src === 'vi' ? 'zh' : 'vi';
      var srcNew = src === 'vi' ? newVi : newZh, srcCur = src === 'vi' ? curVi : curZh;
      var tgtNew = tgt === 'vi' ? newVi : newZh, tgtCur = tgt === 'vi' ? curVi : curZh;
      var tgtTouched = has(f + '_' + tgt) && tgtNew !== '' && tgtNew !== tgtCur;
      if (tgtTouched) {
        if (!srcNew) { oneSide(f, tgt, tgtNew); return; }
        values[kv] = newVi; values[kz] = newZh;
        meta[f] = { src: src, state: 'HUMAN', at: nowIso };
        return;
      }
      if (!srcNew) { values[kv] = ''; values[kz] = ''; delete meta[f]; return; }
      if (srcNew !== srcCur || m.state === 'PENDING') { oneSide(f, src, srcNew); return; }
      values[kv] = curVi; values[kz] = curZh;
      return;
    }

    if (newVi && newZh) {
      values[kv] = newVi; values[kz] = newZh;
      if (!current || newVi !== curVi || newZh !== curZh || !m) {
        meta[f] = { src: m ? m.src : (has(kv) ? 'vi' : 'zh'), state: 'HUMAN', at: nowIso };
      }
      return;
    }
    if (!newVi && !newZh) { values[kv] = ''; values[kz] = ''; delete meta[f]; return; }
    var s1 = newVi ? 'vi' : 'zh';
    var t1 = newVi || newZh;
    if (current && m && m.state === 'MANUAL_REQUIRED' && t1 === (s1 === 'vi' ? curVi : curZh)) {
      values[kv] = newVi; values[kz] = newZh;
      return;
    }
    oneSide(f, s1, t1);
  });
  // Đã dùng "Gợi ý dịch" và người dùng tick đã kiểm tra: HUMAN kèm assisted (2.3)
  (Array.isArray(input.i18n_assisted) ? input.i18n_assisted : []).forEach(function (f) {
    if (fields.indexOf(f) >= 0 && meta[f] && meta[f].state === 'HUMAN') meta[f].assisted = true;
  });
  return { values: values, meta: meta };
}

/** Kiểm bắt buộc một thứ tiếng (3.9) */
function requireOneLang_(errs, input, current, f) {
  var vi = input[f + '_vi'] !== undefined ? trimStr_(input[f + '_vi']) : (current ? trimStr_(current[f + '_vi']) : '');
  var zh = input[f + '_zh'] !== undefined ? trimStr_(input[f + '_zh']) : (current ? trimStr_(current[f + '_zh']) : '');
  if (!vi && !zh) errs.push(fieldError_(f, 'REQUIRED_ONE_LANGUAGE'));
}

/* ---------------- Chiếu dữ liệu ra client ---------------- */

/** Bỏ khóa nội bộ, gắn tên người */
function projectRow_(ctx, row) {
  if (!row) return null;
  var out = {};
  Object.keys(row).forEach(function (k) { if (k !== '__row') out[k] = row[k]; });
  return annotateNames_(out);
}

/* ---------------- Ghi của hệ thống (trigger, lấy thiết bị từ M&E, dịch nền) ---------------- */

/**
 * Ghi các dòng không qua thao tác người dùng: tăng sync_revision, table_rev của bảng đã ghi (để app đồng bộ thấy),
 * không có Operations. Gọi dưới khóa ghi hoặc tự lấy khóa. audit: {action, entity_type, entity_id, after_json} (tùy chọn).
 */
function systemWrite_(writes, audit) {
  if (!writes.length) return 0;
  return withWriteLock_(function () {
    var st = readState_();
    var rev = Number(stateGet_(st, 'sync_revision', 0)) + 1;
    var touched = {};
    writes.forEach(function (w) {
      if (sheetSchema_(w.sheet).cols.indexOf('sync_revision') >= 0) w.row.sync_revision = rev;
      touched[w.sheet] = true;
    });
    applyWrites_(writes, false);
    var su = { sync_revision: ['INT', rev] };
    Object.keys(touched).forEach(function (s) { su['table_rev.' + s] = ['INT', rev]; });
    stateWrite_(st, su, SYSTEM_USER);
    if (audit) writeAudit_({ user_id: SYSTEM_USER, action: audit.action, entity_type: audit.entity_type || '', entity_id: audit.entity_id || '', before_json: null, after_json: audit.after_json || null, auth_basis: 'SYSTEM' });
    return rev;
  });
}

/** Bộ cột C cho dòng do hệ thống tạo */
function cNewSystem_(row) {
  var nowIso = isoVN_(now_());
  row.dataset_epoch = sysProps_().dataset_epoch;
  row.record_version = 1;
  row.created_at = nowIso; row.created_by = SYSTEM_USER;
  row.updated_at = nowIso; row.updated_by = SYSTEM_USER;
  row.archived_at = '';
  return row;
}

// ===== 09_api.js =====
/* 09_api: doPost, doGet, điều phối action (cùng phong bì và quy trình như M&E, Checksheet) */

/** Bảng thao tác đã có mã. Action có trong registry mà chưa có ở đây → FEATURE_NOT_ENABLED. */
var HANDLERS_ = {
  'auth.login': function (req) { return authLogin_(req); },
  'auth.reauth': function (ctx) { return authReauth_(ctx); },
  'auth.logout': function (ctx) { return authLogout_(ctx); },
  'auth.logoutAll': function (ctx) { return authLogoutAll_(ctx); },
  'pin.change': function (ctx) { return pinChange_(ctx); },
  'account.view': function (ctx) { return accountView_(ctx); },
  'session.listOwn': function (ctx) { return sessionListOwn_(ctx); },
  'session.revokeOwn': function (ctx) { return sessionRevokeOwn_(ctx); },
  'system.getPublicState': function (req) { return publicState_(req); },
  'system.health': function () { return { app_id: APP_ID }; },
  'sync.bootstrap': function (ctx) { return syncBootstrap_(ctx); },
  'sync.changes': function (ctx) { return syncChanges_(ctx); },
  'sync.push': function (ctx) { return syncPush_(ctx); },
  'sync.getOperationStatus': function (ctx) { return syncOpStatus_(ctx); },
  'item.edit': function (ctx) { return itemEdit_(ctx); },
  'dept.edit': function (ctx) { return deptEdit_(ctx); },
  'import.preview': function (ctx) { return importPreview_(ctx); },
  'import.list': function (ctx) { return importList_(ctx); },
  'import.rows': function (ctx) { return importRows_(ctx); },
  'import.commit': function (ctx) { return importCommit_(ctx); },
  'import.cancel': function (ctx) { return importCancel_(ctx); },
  'i18n.suggest': function (ctx) { return i18nSuggest_(ctx); },
  'report.logo.get': function (ctx) { return reportLogoGet_(ctx); },
  'report.logo.set': function (ctx) { return reportLogoSet_(ctx); },
  'user.pickList': function (ctx) { return userPickList_(ctx); },
  'user.view': function (ctx) { return userView_(ctx); },
  'user.create': function (ctx) { return userCreate_(ctx); },
  'user.setRole': function (ctx) { return userSetRole_(ctx); },
  'user.lock': function (ctx) { return userLock_(ctx); },
  'user.unlock': function (ctx) { return userUnlock_(ctx); },
  'user.resetPin': function (ctx) { return userResetPin_(ctx); },
  'user.revokeSessions': function (ctx) { return userRevokeSessions_(ctx); },
  'audit.own': function (ctx) { return auditOwn_(ctx); },
  'audit.view': function (ctx) { return auditView_(ctx); },
  'backup.view': function (ctx) { return backupView_(ctx); },
  'backup.run': function (ctx) { return backupRun_(ctx); },
  'settings.edit': function (ctx) { return settingsEdit_(ctx); },
  'system.status': function (ctx) { return systemStatus_(ctx); },
  'sample.seed': function (ctx) { return sampleSeedAction_(ctx); }
};

/** Action không cần phiên */
var PUBLIC_ACTIONS_ = { 'auth.login': 1, 'system.getPublicState': 1, 'system.health': 1 };

/** Action được chạy khi bảo trì */
var MAINTENANCE_ALLOW_ = { 'system.health': 1, 'system.getPublicState': 1, 'auth.logout': 1 };

function doPost(e) {
  var t0 = Date.now();
  var res;
  propsReset_(true);
  try {
    var body = e && e.postData ? e.postData.contents : '';
    var req;
    try { req = JSON.parse(body); } catch (err) { req = null; }
    if (!req || typeof req !== 'object' || Array.isArray(req)) {
      res = envelope_({}, { ok: false, code: 'VALIDATION_ERROR', errors: [fieldError_('body', 'INVALID_VALUE')] });
    } else {
      res = apiDispatch_(req);
    }
  } catch (err2) {
    res = internalError_({}, err2);
  } finally {
    propsReset_(false);
  }
  res.server_ms = Date.now() - t0;
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  var out;
  if (p.action === 'system.health') {
    out = { ok: true, code: 'OK', api_contract_version: API_CONTRACT_VERSION, app_id: APP_ID, server_time: isoVN_(now_()) };
  } else {
    // via:'GET' giúp app nhận ra một POST đã bị chuyển thành GET trên đường đi (bài học PoC của M&E)
    out = { ok: false, code: 'NOT_FOUND', via: 'GET', api_contract_version: API_CONTRACT_VERSION, app_id: APP_ID, server_time: isoVN_(now_()) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function publicState_(req) {
  var props = sysProps_();
  return {
    app_id: APP_ID, api_contract_version: API_CONTRACT_VERSION, server_version: SERVER_VERSION,
    maintenance_mode: props.maintenance_mode, env: props.env, min_client_version: setting_('min_client_version'),
    ready: !!prop_('BUSINESS_SPREADSHEET_ID')
  };
}

/** Phong bì phản hồi chuẩn */
function envelope_(req, r) {
  var props;
  try { props = sysProps_(); } catch (e) { props = { dataset_epoch: '', maintenance_mode: false }; }
  var pair = MSG[r.code] || MSG.INTERNAL_ERROR;
  if (r.code === 'AUTH_REQUIRED' && r.data && (r.data.reason === 'REVOKED' || r.data.reason === 'AUTH_VERSION')) pair = MSG.AUTH_REQUIRED_REVOKED;
  pair = fmtMsg_(pair, r.msgVars);
  return {
    ok: !!r.ok, code: r.code, message_vi: pair[0], message_zh: pair[1],
    data: r.data === undefined ? null : r.data,
    api_contract_version: API_CONTRACT_VERSION, dataset_epoch: props.dataset_epoch || '',
    maintenance_mode: !!props.maintenance_mode,
    operation_id: req && req.operation_id ? String(req.operation_id) : null,
    state: r.state || null, record_version: r.record_version === undefined ? null : r.record_version,
    sync_cursor: r.sync_cursor || null, server_time: isoVN_(now_()), errors: r.errors || []
  };
}

function internalError_(req, err) {
  var id = uuid_();
  console.error('INTERNAL_ERROR ' + id + ' ' + (req && req.action) + ' ' + (err && err.stack ? err.stack : err));
  return envelope_(req, { ok: false, code: 'INTERNAL_ERROR', data: { error_id: id } });
}

function errorToResponse_(req, e) {
  if (e && e.apiCode) {
    return envelope_(req, { ok: false, code: e.apiCode, data: e.apiData, errors: e.apiErrors, msgVars: e.msgVars });
  }
  return internalError_(req, e);
}

/** Điều phối một request (đã parse JSON). Luôn trả object phản hồi. */
function apiDispatch_(req) {
  try {
    return dispatchInner_(req, false);
  } catch (e) {
    return errorToResponse_(req, e);
  }
}

/**
 * auth.login {with_bootstrap: true}: kèm trang đầu của sync.bootstrap để app vào được sau một lượt gọi thay vì hai.
 * Lỗi phần dữ liệu không làm hỏng đăng nhập (app tự gọi sync.bootstrap như cũ).
 */
function loginWithBootstrap_(req, data) {
  var out = JSON.parse(JSON.stringify(data));
  try {
    var inner = {
      api_contract_version: req.api_contract_version, action: 'sync.bootstrap', payload: { budget_ms: 6000 }, token: data.token,
      dataset_epoch: sysProps_().dataset_epoch, device_id: req.device_id, app_version: req.app_version
    };
    var env = dispatchInner_(inner, false);
    if (env && env.ok && env.data) out.bootstrap = env.data;
  } catch (e) { /* app tự gọi sync.bootstrap */ }
  return out;
}

function dispatchInner_(req, viaPush) {
  if (typeof req.action !== 'string' || typeof req.payload !== 'object' || req.payload === null || Array.isArray(req.payload)) {
    throw validationError_([fieldError_('action', 'REQUIRED')]);
  }
  if (req.api_contract_version !== API_CONTRACT_VERSION) throw apiError_('CLIENT_UPDATE_REQUIRED');
  var def = ACTION_REGISTRY[req.action];
  if (!def) throw apiError_('FORBIDDEN');
  if (!HANDLERS_[req.action]) throw apiError_('FEATURE_NOT_ENABLED');
  if (req.action !== 'system.health' && req.action !== 'system.getPublicState') {
    if (cmpVersion_(req.app_version, setting_('min_client_version')) < 0) throw apiError_('CLIENT_UPDATE_REQUIRED');
    if (!isUuidV4_(req.device_id)) throw validationError_([fieldError_('device_id', 'ID_INVALID')]);
  }
  if (sysProps_().maintenance_mode && !MAINTENANCE_ALLOW_[req.action]) throw apiError_('SYSTEM_MAINTENANCE');
  if (PUBLIC_ACTIONS_[req.action]) {
    if (!prop_('BUSINESS_SPREADSHEET_ID') && req.action !== 'system.health' && req.action !== 'system.getPublicState') throw apiError_('SYSTEM_NOT_READY');
    var pub = HANDLERS_[req.action](req);
    if (req.action === 'auth.login' && req.payload.with_bootstrap && pub && pub.session_kind === 'FULL') pub = loginWithBootstrap_(req, pub);
    return envelope_(req, { ok: true, code: 'OK', data: pub });
  }
  var ctx = requireSession_(req, req.action);
  if (def.write && !isUuidV4_(req.operation_id)) throw validationError_([fieldError_('operation_id', 'ID_INVALID')]);
  ctx.auth = authorize_(ctx, req.action);
  // Hỏi lại PIN sau khi đã biết người dùng có quyền (không hỏi PIN người không có quyền)
  if (def.net === 'pin' && !verifyReauth_(ctx, req.reauth_token)) throw apiError_('REAUTH_REQUIRED');
  ctx.viaPush = !!viaPush;
  var out = HANDLERS_[req.action](ctx);
  if (out && out.__envelope) return out.__envelope; // sync.push: phản hồi giống action gốc
  var env = out && out.state === 'COMMITTED' && out.ok ? envelope_(req, out)
    : envelope_(req, { ok: true, code: 'OK', data: out, sync_cursor: out && out.sync_cursor ? String(out.sync_cursor) : null });
  if (def.write && !viaPush && env.ok && req.changes_since !== undefined && req.changes_since !== null) attachChanges_(ctx, req, env);
  return env;
}

/**
 * Ghi xong (COMMITTED): kèm luôn thay đổi từ cursor của app (như sync.changes) → app không phải gọi thêm một lượt sau mỗi lần lưu.
 */
function attachChanges_(ctx, req, env) {
  var since = Number(req.changes_since);
  if (!(since >= 0)) return;
  try {
    var c2 = Object.create(ctx);
    c2.req = { action: 'sync.changes', payload: { cursor: since, limit: 500 }, device_id: req.device_id };
    env.changes = syncChanges_(c2);
  } catch (e) { /* app tự gọi sync.changes */ }
}

// ===== 10_dates.js =====
/* 10_dates: ngày theo giờ Việt Nam, ngày "hôm nay" giả ở THỬ (TEST_TODAY), kỳ hồ sơ.
 * Mã kỳ (mục 5 đặc tả): ngày 2026-11-06 · tuần ISO 2026-W45 · tháng 2026-11 · quý 2026-Q4 · nửa năm 2026-H2 · năm 2026.
 * Tình trạng hồ sơ theo kỳ (đúng hạn / quá hạn / chưa tới hạn) làm ở phiên 1c. */

function todayVN_() {
  if (isTestEnv_()) {
    var t = prop_('TEST_TODAY');
    if (t && isDateStr_(t)) return t;
  }
  return dateVN_(now_());
}

function addDaysIso_(iso, n) {
  var d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Cộng tháng, ngày cuối tháng thì giữ ngày cuối tháng (31/01 + 1 tháng = 28/02 hoặc 29/02) */
function addMonthsIso_(iso, n) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return '';
  var y = Number(m[1]), mo = Number(m[2]) - 1 + n, d = Number(m[3]);
  var ty = y + Math.floor(mo / 12), tm = ((mo % 12) + 12) % 12;
  var last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return ty + '-' + pad2_(tm + 1) + '-' + pad2_(Math.min(d, last));
}

/** Tuần ISO (Thứ Hai đầu tuần): 2026-W45 */
function isoWeekKey_(iso) {
  var d = new Date(iso + 'T00:00:00Z');
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thứ Năm của tuần quyết định năm
  var y = d.getUTCFullYear();
  var w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return y + '-W' + (w < 10 ? '0' : '') + w;
}

/** Loại kỳ từ chu kỳ hồ sơ (ngày): 1 → DAY, 7 → WEEK, 31 → MONTH, 92 → QUARTER, 183 → HALF, 366 → YEAR; trống → EVENT */
function periodTypeFromDays_(days) {
  if (days === null || days === undefined || days === '') return 'EVENT';
  var n = Number(days);
  if (!isFinite(n) || n <= 0) return 'EVENT';
  if (n <= 1) return 'DAY';
  if (n <= 7) return 'WEEK';
  if (n <= 31) return 'MONTH';
  if (n <= 92) return 'QUARTER';
  if (n <= 183) return 'HALF';
  return 'YEAR';
}

/** Mã kỳ của một ngày theo loại kỳ */
function periodKeyOf_(type, iso) {
  var y = iso.slice(0, 4), m = Number(iso.slice(5, 7));
  switch (type) {
    case 'DAY': return iso;
    case 'WEEK': return isoWeekKey_(iso);
    case 'MONTH': return iso.slice(0, 7);
    case 'QUARTER': return y + '-Q' + Math.ceil(m / 3);
    case 'HALF': return y + '-H' + (m <= 6 ? 1 : 2);
    case 'YEAR': return y;
    default: return '';
  }
}

// ===== 11_catalog.js =====
/* 11_catalog: danh mục biểu mẫu & tài liệu — bộ phận, nhóm, biểu (Items), điều khoản (Clauses).
 * Chuẩn hóa một dòng của sheet "Danh mục tổng - 总清单" (file Excel tổng) dùng chung cho nhập Excel (14_import.js) và
 * dữ liệu mẫu; sửa thông tin biểu trong app (item.edit, Thư ký ISO / cấp 4); sửa bộ phận (dept.edit, cấp 4). */

var ITEM_I18N_ = ['name', 'purpose', 'freq'];
/** Trường của Items do file Excel tổng quyết định (so khi nhập lại để báo "Không đổi") */
var ITEM_EXCEL_FIELDS_ = ['dept_code', 'group_key', 'name_vi', 'name_zh', 'purpose_vi', 'purpose_zh', 'iso9001', 'iso14001', 'iso45001',
  'iso50001', 'brc_topics', 'law', 'cls', 'freq_vi', 'freq_zh', 'flow', 'keep', 'priority', 'where', 'where_note', 'status', 'current_rev',
  'issued_at', 'period_days', 'note'];
/** Trường do luồng phiên bản quyết định khi biểu đã ban hành trong app (phiên 1b): nhập Excel không đè */
var ITEM_VERSION_FIELDS_ = ['status', 'current_rev', 'issued_at'];
var ITEM_CODE_RE_ = /^[A-ZĐ0-9][A-ZĐ0-9._\/-]{0,39}$/;
var CJK_RE_ = /[㐀-鿿豈-﫿]/;

/* ---------------- Chuẩn hóa chữ ---------------- */

/** Chuỗi ô: bỏ khoảng trắng đầu/cuối, \r\n → \n, khoảng trắng cuối mỗi dòng */
function cellText_(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/\r\n?/g, '\n').split('\n').map(function (l) { return l.replace(/[ \t ]+$/, ''); }).join('\n').trim();
}

/** Khóa so sánh tên hiển thị: chữ thường, bỏ khoảng trắng */
function looseKey_(s) {
  return String(s || '').toLowerCase().replace(/[\s ]+/g, '');
}

/**
 * Ô hai dòng (dòng 1 Việt, dòng 2 Trung) → {vi, zh}. Một dòng: có chữ Hán thì là tiếng Trung, không thì tiếng Việt.
 * Dòng 2 trở đi đều thuộc tiếng Trung (nối lại bằng xuống dòng).
 */
function splitBiCell_(v) {
  var t = cellText_(v);
  if (!t) return { vi: '', zh: '' };
  var lines = t.split('\n').map(function (l) { return l.trim(); }).filter(String);
  if (lines.length === 1) {
    var one = lines[0];
    // Một dòng "Việt · 中文"
    var dot = one.lastIndexOf(' · ');
    if (dot > 0 && CJK_RE_.test(one.slice(dot + 3)) && !CJK_RE_.test(one.slice(0, dot))) return { vi: one.slice(0, dot).trim(), zh: one.slice(dot + 3).trim() };
    return CJK_RE_.test(one) ? { vi: '', zh: one } : { vi: one, zh: '' };
  }
  return { vi: lines[0], zh: lines.slice(1).join('\n') };
}

/** Ghép lại ô hai dòng (xuất Excel) */
function joinBiCell_(vi, zh) {
  vi = vi || ''; zh = zh || '';
  return vi && zh ? vi + '\n' + zh : (vi || zh);
}

/* ---------------- Bộ phận, nhóm ---------------- */

function deptDisplay_(d) {
  return d.name_vi && d.name_zh ? d.name_vi + ' · ' + d.name_zh : (d.name_vi || d.name_zh || d.dept_code);
}

/** Bản đồ khóa → mã bộ phận: tên hiển thị "Việt · 中文", tên Việt, tên Trung, mã */
function deptLookup_(depts) {
  var m = {};
  depts.forEach(function (d) {
    [deptDisplay_(d), d.name_vi, d.name_zh, d.dept_code].forEach(function (k) { if (k) m[looseKey_(k)] = d.dept_code; });
  });
  return m;
}

/** "01. Tên Việt · 中文" (cơ điện "01. TÊN · 01. 中文") → {num, name_vi, name_zh} */
function parseGroupLabel_(label) {
  var t = cellText_(label).replace(/\n/g, ' ');
  if (!t) return { num: '', name_vi: '', name_zh: '' };
  var num = '';
  var m = /^(\d{1,3})\s*[.、]\s*/.exec(t);
  if (m) { num = pad2_(Number(m[1])); t = t.slice(m[0].length); }
  var parts = t.split(/\s+·\s+|\s*·\s*/);
  var vi = (parts[0] || '').trim(), zh = parts.slice(1).join(' · ').trim().replace(/^\d{1,3}\s*[.、]\s*/, '');
  if (!zh && CJK_RE_.test(vi)) { zh = vi; vi = ''; }
  return { num: num, name_vi: vi, name_zh: zh };
}

/** Nhãn nhóm khi nhóm tạo trong app (không có nhãn từ Excel) */
function groupLabelOf_(g) {
  var num = String(g.group_key || '').split('-').pop();
  var name = g.name_vi && g.name_zh ? g.name_vi + ' · ' + g.name_zh : (g.name_vi || g.name_zh || '');
  return (/^\d+$/.test(num) ? num + '. ' : '') + name;
}

/** group_key = <bộ phận>-<xx> lấy từ mã biểu BM-<bộ phận>-xx-yy; không theo dạng đó thì lấy số đầu nhãn nhóm */
function groupKeyFor_(code, deptCode, labelNum) {
  var m = /^BM-([A-ZĐ]+)-(\d{1,3})(?:-|$)/.exec(String(code || ''));
  if (m) return m[1] + '-' + pad2_(Number(m[2]));
  if (labelNum && deptCode) return deptCode + '-' + labelNum;
  return '';
}

/* ---------------- Loại, cấp, tình trạng, nơi làm ---------------- */

/** Loại tài liệu suy từ tiền tố mã (khi thêm mới): BM- biểu mẫu, QT- quy trình, HD- hướng dẫn, ST- sổ tay, CS- chính sách */
function kindFromCode_(code) {
  var c = String(code || '');
  if (/^BM-/.test(c)) return 'FORM';
  if (/^QT-/.test(c)) return 'PROCEDURE';
  if (/^(HD|HDCV|WI)-/.test(c)) return 'WI';
  if (/^(ST|STCL|SM)-/.test(c)) return 'MANUAL';
  if (/^(CS|CSCL|CSAT)-/.test(c)) return 'POLICY';
  if (/^(TL|TLBN|EXT)-/.test(c)) return 'EXTERNAL';
  return 'FORM';
}

/** Cấp duyệt: cấp công ty cho BM-ISO-…, BM-BRC-…, sổ tay, chính sách; còn lại cấp bộ phận */
function levelFor_(code, kind) {
  if (kind === 'MANUAL' || kind === 'POLICY') return 'COMPANY';
  return /^BM-(ISO|BRC)-/.test(String(code || '')) ? 'COMPANY' : 'DEPT';
}

var STATUS_FROM_SYMBOL_ = { '○': 'NONE', '◯': 'NONE', 'O': 'NONE', '◐': 'DRAFTING', '◑': 'DRAFTING', '●': 'ISSUED', '⬤': 'ISSUED', '✕': 'NA', '×': 'NA', 'X': 'NA', '✗': 'NA' };

function statusFrom_(v) {
  var t = cellText_(v).toUpperCase();
  if (!t) return 'NONE';
  if (ITEM_STATUS_.indexOf(t) >= 0) return t;
  var ch = t.charAt(0);
  return STATUS_FROM_SYMBOL_[ch] || null;
}

var WHERE_LOOKUP_ = (function () {
  var m = {};
  WHERE_.forEach(function (w) {
    m[looseKey_(w[0])] = w[0];
    m[looseKey_(w[1])] = w[0];
    var parts = w[1].split(' · ');
    m[looseKey_(parts[0])] = w[0];
    if (parts[1]) m[looseKey_(parts[1])] = w[0];
  });
  return m;
})();

function whereFrom_(v) {
  var t = cellText_(v);
  if (!t) return '';
  return WHERE_LOOKUP_[looseKey_(t)] || null;
}

function whereDisplay_(code) {
  for (var i = 0; i < WHERE_.length; i++) if (WHERE_[i][0] === code) return WHERE_[i][1];
  return code || '';
}

/** In từ app (mục 6 phủ điều khoản): Nơi làm là M&E hoặc Checksheet (không tính Một phần / Đề xuất) */
function printedFromApp_(where) {
  return where === 'ME' || where === 'CS';
}

/** Ngày: 'YYYY-MM-DD' (app đã đổi ô ngày Excel) hoặc 'dd/mm/yyyy' */
function dateFrom_(v) {
  var t = cellText_(v);
  if (!t) return '';
  if (isDateStr_(t.slice(0, 10)) && /^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  var m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(t);
  if (m) { var iso = m[3] + '-' + pad2_(Number(m[2])) + '-' + pad2_(Number(m[1])); if (isDateStr_(iso)) return iso; }
  return null;
}

/* ---------------- Một dòng của Danh mục tổng ---------------- */

/**
 * cells: {A..Z: giá trị ô (chuỗi, số; ô ngày đã đổi 'YYYY-MM-DD')}. ctx: {depts: lookup, row_number}.
 * Trả {code, fields, group: {group_key, label, name_vi, name_zh, dept_code}, errors: [fieldError]}.
 * Cột X, Y (ngày hồ sơ gần nhất, tình trạng hồ sơ) bỏ qua: app tự tính.
 */
function normCatalogRow_(cells, look, rowNumber) {
  var errs = [];
  var err = function (field, sub) { errs.push(fieldError_(field, sub, rowNumber)); };
  var c = function (k) { return cells && cells[k] !== undefined ? cells[k] : ''; };
  var code = cellText_(c('B')).toUpperCase().replace(/\s+/g, '');
  if (!code) err('B', 'REQUIRED');
  else if (!ITEM_CODE_RE_.test(code)) err('B', 'CODE_INVALID');
  var f = {};
  var nm = splitBiCell_(c('C'));
  f.name_vi = nm.vi; f.name_zh = nm.zh;
  if (!f.name_vi && !f.name_zh) err('C', 'REQUIRED_ONE_LANGUAGE');
  var pu = splitBiCell_(c('D'));
  f.purpose_vi = pu.vi; f.purpose_zh = pu.zh;
  var deptRaw = cellText_(c('E'));
  f.dept_code = deptRaw ? (look[looseKey_(deptRaw)] || null) : null;
  if (!f.dept_code) {
    // Không ghi bộ phận: lấy từ mã BM-<bộ phận>-…
    var md = /^BM-([A-ZĐ]+)-/.exec(code);
    f.dept_code = !deptRaw && md && look[looseKey_(md[1])] ? look[looseKey_(md[1])] : null;
    if (!f.dept_code) err('E', 'DEPT_UNKNOWN');
  }
  var gl = parseGroupLabel_(c('F'));
  f.group_key = groupKeyFor_(code, f.dept_code, gl.num);
  var group = null;
  if (f.group_key) group = { group_key: f.group_key, dept_code: f.group_key.split('-')[0], label: cellText_(c('F')).replace(/\n/g, ' '), name_vi: gl.name_vi, name_zh: gl.name_zh };
  else if (cellText_(c('F'))) err('F', 'GROUP_INVALID');
  ['G', 'H', 'I', 'J'].forEach(function (k, i) { f[['iso9001', 'iso14001', 'iso45001', 'iso50001'][i]] = cellText_(c(k)).replace(/\n/g, '; '); });
  f.brc_topics = cellText_(c('K'));
  f.law = cellText_(c('L'));
  f.cls = cellText_(c('M'));
  var fr = splitBiCell_(c('N'));
  f.freq_vi = fr.vi; f.freq_zh = fr.zh;
  f.flow = cellText_(c('O'));
  f.keep = cellText_(c('P'));
  var pr = cellText_(c('Q'));
  if (!pr) f.priority = null;
  else if (/^[123](\.0+)?$/.test(pr)) f.priority = Number(pr);
  else { f.priority = null; err('Q', 'PRIORITY_INVALID'); }
  var wh = whereFrom_(c('R'));
  if (wh === null) { f.where = ''; err('R', 'WHERE_INVALID'); } else f.where = wh;
  f.where_note = cellText_(c('S'));
  var st = statusFrom_(c('T'));
  if (st === null) { f.status = 'NONE'; err('T', 'STATUS_SYMBOL'); } else f.status = st;
  var rev = cellText_(c('U'));
  if (!rev) f.current_rev = '';
  else if (/^\d{1,3}(\.0+)?$/.test(rev)) f.current_rev = pad2_(Number(rev));
  else { f.current_rev = ''; err('U', 'REV_INVALID'); }
  var dt = dateFrom_(c('V'));
  if (dt === null) { f.issued_at = ''; err('V', 'INVALID_DATE'); } else f.issued_at = dt;
  var pd = cellText_(c('W'));
  if (!pd) f.period_days = null;
  else if (/^\d{1,4}(\.0+)?$/.test(pd) && Number(pd) > 0) f.period_days = Number(pd);
  else { f.period_days = null; err('W', 'PERIOD_DAYS_INVALID'); }
  f.note = cellText_(c('Z'));
  var stt = cellText_(c('A'));
  f.sort_order = /^\d+(\.0+)?$/.test(stt) ? Number(stt) : rowNumber;
  return { code: code, fields: f, group: group, errors: errs };
}

/** Giá trị so sánh của một trường (null/'' coi như nhau) */
function cmpVal_(v) {
  return v === null || v === undefined ? '' : String(v);
}

/**
 * Trường của dòng nhập khác bản hiện có. Bên tiếng còn trống mà bản hiện có là dịch máy từ bên kia (không đổi bên kia) → coi như không đổi.
 * Biểu đã ban hành trong app (có phiên bản hiện hành): bỏ qua tình trạng, lần ban hành, ngày ban hành của tệp.
 */
function itemChanges_(cur, f) {
  var out = [];
  var meta = cur.i18n_meta || {};
  ITEM_EXCEL_FIELDS_.forEach(function (k) {
    if (cur.current_version_id && ITEM_VERSION_FIELDS_.indexOf(k) >= 0) return;
    var nv = cmpVal_(f[k]), ov = cmpVal_(cur[k]);
    if (nv === ov) return;
    var pm = /^(name|purpose|freq)_(vi|zh)$/.exec(k);
    if (pm && !nv) {
      var m = meta[pm[1]];
      var other = pm[2] === 'vi' ? 'zh' : 'vi';
      if (m && (m.state === 'MACHINE' || m.state === 'PENDING') && m.src === other && cmpVal_(f[pm[1] + '_' + other]) === cmpVal_(cur[pm[1] + '_' + other])) return;
    }
    out.push(k);
  });
  return out;
}

/** i18n_meta cho các cặp tiếng nhập từ Excel: đủ hai bên → HUMAN; thiếu một bên → PENDING (dịch nền, không dịch lúc ghi) */
function importI18nMeta_(cur, f, nowIso) {
  var meta = cur && cur.i18n_meta ? clone_(cur.i18n_meta) : {};
  ITEM_I18N_.forEach(function (p) {
    var vi = f[p + '_vi'], zh = f[p + '_zh'];
    var cvi = cur ? cmpVal_(cur[p + '_vi']) : '', czh = cur ? cmpVal_(cur[p + '_zh']) : '';
    if (cur && cmpVal_(vi) === cvi && cmpVal_(zh) === czh) return;
    if (vi && zh) meta[p] = { src: meta[p] ? meta[p].src : 'vi', state: 'HUMAN', at: nowIso };
    else if (vi || zh) meta[p] = { src: vi ? 'vi' : 'zh', state: NO_MT_ITEMS_ ? 'MANUAL_REQUIRED' : 'PENDING', at: nowIso };
    else delete meta[p];
  });
  return meta;
}
/** Tên, mục đích biểu nhập thiếu một thứ tiếng: dịch nền (dịch máy · 机器翻译); đặt true nếu không muốn dịch */
var NO_MT_ITEMS_ = false;

/** Dòng Items mới/sửa từ trường đã chuẩn hóa (dưới khóa ghi) */
function itemRowFromImport_(ctx, cur, code, f, nowIso) {
  var row = cur ? clone_(cur) : {
    item_id: uuid_(), code: code, kind: kindFromCode_(code), current_version_id: '', owner_user_id: '', qr_key: newQrKey_(),
    issued_source: '', file_missing: false, na_reason: ''
  };
  delete row.__row;
  if (!cur) row.level = levelFor_(code, row.kind);
  var keep = cur && cur.current_version_id ? ITEM_VERSION_FIELDS_ : [];
  row.i18n_meta = importI18nMeta_(cur, f, nowIso);
  ITEM_EXCEL_FIELDS_.forEach(function (k) { if (keep.indexOf(k) < 0) row[k] = f[k] === undefined ? '' : f[k]; });
  row.sort_order = f.sort_order;
  row.period_type = periodTypeFromDays_(row.period_days);
  if (!row.current_version_id) {
    if (row.status === 'ISSUED') { row.issued_source = 'IMPORT'; row.file_missing = true; } else { row.issued_source = ''; row.file_missing = false; }
  }
  row.review_due = row.status === 'ISSUED' && row.issued_at ? addMonthsIso_(row.issued_at, Number(setting_('doc_review_months') || 12)) : '';
  if (!cur) cNew_(ctx, row); else cUpdate_(ctx, row);
  return row;
}

/* ---------------- item.edit (Thư ký ISO, cấp 4) ---------------- */

/**
 * item.edit {item_id, code?, kind, level, dept_code, group_key, name_vi/zh, purpose_vi/zh, iso9001…iso50001, brc_topics, law, cls,
 *  freq_vi/zh, flow, keep, priority, where, where_note, period_days, owner_user_id, note}
 * expected_version 0 = thêm mới (cấp mã QR). Tình trạng, lần ban hành, ngày ban hành đổi qua luồng phiên bản (phiên 1b).
 */
function itemEdit_(ctx) {
  var p = ctx.req.payload || {};
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  var errs = [];
  if (!isUuidV4_(p.item_id)) errs.push(fieldError_('item_id', 'ID_INVALID'));
  var code = trimStr_(p.code).toUpperCase().replace(/\s+/g, '');
  if (isNew) {
    if (!code) errs.push(fieldError_('code', 'REQUIRED'));
    else if (!ITEM_CODE_RE_.test(code)) errs.push(fieldError_('code', 'CODE_INVALID'));
  }
  var kind = p.kind === undefined ? null : String(p.kind);
  if (kind !== null && ITEM_KINDS_.indexOf(kind) < 0) errs.push(fieldError_('kind', 'KIND_INVALID'));
  var level = p.level === undefined ? null : String(p.level);
  if (level !== null && ITEM_LEVELS_.indexOf(level) < 0) errs.push(fieldError_('level', 'LEVEL_INVALID'));
  var depts = {};
  readRows_('Depts').forEach(function (d) { depts[d.dept_code] = d; });
  if (p.dept_code !== undefined && !depts[p.dept_code]) errs.push(fieldError_('dept_code', 'DEPT_UNKNOWN'));
  if (isNew && p.dept_code === undefined) errs.push(fieldError_('dept_code', 'REQUIRED'));
  if (p.priority !== undefined && p.priority !== null && p.priority !== '' && [1, 2, 3].indexOf(Number(p.priority)) < 0) errs.push(fieldError_('priority', 'PRIORITY_INVALID'));
  if (p.where !== undefined && p.where !== '' && !WHERE_.some(function (w) { return w[0] === p.where; })) errs.push(fieldError_('where', 'WHERE_INVALID'));
  if (p.period_days !== undefined && p.period_days !== null && p.period_days !== '' && !(Number(p.period_days) > 0 && Math.floor(Number(p.period_days)) === Number(p.period_days))) errs.push(fieldError_('period_days', 'PERIOD_DAYS_INVALID'));
  if (p.owner_user_id && !isUuidV4_(p.owner_user_id)) errs.push(fieldError_('owner_user_id', 'ID_INVALID'));
  var cur = isNew ? null : findOne_('Items', 'item_id', p.item_id);
  if (!isNew && !cur) throw apiError_('NOT_FOUND');
  requireOneLang_(errs, p, cur, 'name');
  if (errs.length) throw validationError_(errs);
  var tr = applyTranslations_('Items', ITEM_I18N_, p, cur); // dịch ngoài khóa ghi
  return executeWrite_(ctx, {
    entity_type: 'ITEM', entity_id: p.item_id,
    build: function () {
      var row;
      if (isNew) {
        if (findRowNums_('Items', 'item_id', p.item_id).length) throw validationError_([fieldError_('item_id', 'ID_EXISTS')]);
        if (findRowNums_('Items', 'code', code).length) throw validationError_([fieldError_('code', 'CODE_DUPLICATE')]);
        var k0 = kind || kindFromCode_(code);
        row = cNew_(ctx, {
          item_id: p.item_id, code: code, kind: k0, level: level || levelFor_(code, k0), status: 'NONE', current_version_id: '',
          current_rev: '', issued_at: '', review_due: '', qr_key: newQrKey_(), issued_source: '', file_missing: false, na_reason: '',
          sort_order: readRows_('Items').reduce(function (m, x) { return Math.max(m, Number(x.sort_order) || 0); }, 0) + 1
        });
      } else {
        var now = readRowAt_('Items', cur.__row);
        assertVersion_(ctx, now, 'ITEM', 'Items');
        row = clone_(now); delete row.__row;
        if (kind) row.kind = kind;
        if (level) row.level = level;
        cUpdate_(ctx, row);
      }
      var before = isNew ? null : clone_(row);
      ['dept_code', 'iso9001', 'iso14001', 'iso45001', 'iso50001', 'brc_topics', 'law', 'cls', 'flow', 'keep', 'where', 'where_note', 'owner_user_id', 'note'].forEach(function (k) {
        if (p[k] !== undefined) row[k] = trimStr_(p[k]);
      });
      if (p.priority !== undefined) row.priority = p.priority === '' || p.priority === null ? null : Number(p.priority);
      if (p.period_days !== undefined) row.period_days = p.period_days === '' || p.period_days === null ? null : Number(p.period_days);
      row.period_type = periodTypeFromDays_(row.period_days);
      if (p.group_key !== undefined) row.group_key = trimStr_(p.group_key);
      else if (isNew) row.group_key = groupKeyFor_(code, row.dept_code, '');
      Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
      row.i18n_meta = tr.meta;
      var writes = [{ sheet: 'Items', mode: isNew ? 'insert' : 'update', row: row }];
      // Nhóm chưa có: tạo theo mã (tên nhóm sửa sau ở file Excel hoặc màn nhóm)
      if (row.group_key && !findRowNums_('Groups', 'group_key', row.group_key).length) {
        writes.push({ sheet: 'Groups', mode: 'insert', row: cNew_(ctx, { group_key: row.group_key, dept_code: row.group_key.split('-')[0], name_vi: '', name_zh: '', label: '', sort_order: 0, active: true }) });
      }
      return {
        writes: writes, result: { entity_type: 'ITEM', entity_id: row.item_id, record_version: row.record_version, record: projectRow_(ctx, row) },
        record_version: row.record_version,
        audit: { entity_type: 'ITEM', entity_id: row.item_id, before_json: before ? { code: before.code } : null, after_json: { code: row.code, dept_code: row.dept_code, kind: row.kind } }
      };
    }
  });
}

/* ---------------- dept.edit (cấp 4) ---------------- */

/** dept.edit {dept_code, name_vi, name_zh, head_user_id, active, sort_order}; expected_version 0 = thêm bộ phận */
function deptEdit_(ctx) {
  var p = ctx.req.payload || {};
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  var code = trimStr_(p.dept_code).toUpperCase();
  var errs = [];
  if (!DEPT_CODE_RE_.test(code)) errs.push(fieldError_('dept_code', 'CODE_INVALID'));
  if (p.head_user_id && !isUuidV4_(p.head_user_id)) errs.push(fieldError_('head_user_id', 'ID_INVALID'));
  if (p.head_user_id && !userDirectory_()[p.head_user_id]) errs.push(fieldError_('head_user_id', 'NOT_FOUND'));
  var cur = isNew ? null : findOne_('Depts', 'dept_code', code);
  if (!isNew && !cur) throw apiError_('NOT_FOUND');
  requireOneLang_(errs, p, cur, 'name');
  if (errs.length) throw validationError_(errs);
  var tr = applyTranslations_('Depts', ['name'], p, cur);
  return executeWrite_(ctx, {
    entity_type: 'DEPT', entity_id: code,
    build: function () {
      var row;
      if (isNew) {
        if (findRowNums_('Depts', 'dept_code', code).length) throw validationError_([fieldError_('dept_code', 'CODE_DUPLICATE')]);
        row = cNew_(ctx, { dept_code: code, head_user_id: '', active: true, sort_order: readRows_('Depts').length + 1 });
      } else {
        var now = readRowAt_('Depts', cur.__row);
        assertVersion_(ctx, now, 'DEPT', 'Depts');
        row = clone_(now); delete row.__row;
        cUpdate_(ctx, row);
      }
      if (p.head_user_id !== undefined) row.head_user_id = trimStr_(p.head_user_id);
      if (p.active !== undefined) row.active = p.active === true;
      if (p.sort_order !== undefined && isFinite(Number(p.sort_order))) row.sort_order = Number(p.sort_order);
      Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
      row.i18n_meta = tr.meta;
      return {
        writes: [{ sheet: 'Depts', mode: isNew ? 'insert' : 'update', row: row }],
        result: { entity_type: 'DEPT', entity_id: code, record_version: row.record_version, record: projectRow_(ctx, row) },
        record_version: row.record_version,
        audit: { entity_type: 'DEPT', entity_id: code, before_json: null, after_json: { name_vi: row.name_vi, name_zh: row.name_zh, head_user_id: row.head_user_id, active: row.active } }
      };
    }
  });
}

/** Bộ phận mặc định (setup, migrateSchema): thêm bộ phận còn thiếu, không đè bộ phận đã sửa */
function seedDepts_() {
  var have = {};
  readRows_('Depts').forEach(function (d) { have[d.dept_code] = true; });
  var nowIso = isoVN_(now_());
  var add = DEPTS_SEED_.filter(function (d) { return !have[d[0]]; }).map(function (d, i) {
    return cNewSystem_({ dept_code: d[0], name_vi: d[1], name_zh: d[2], head_user_id: '', active: true, sort_order: DEPTS_SEED_.indexOf(d) + 1,
      i18n_meta: { name: { src: 'vi', state: 'HUMAN', at: nowIso } } });
  });
  if (add.length) systemWrite_(add.map(function (r) { return { sheet: 'Depts', mode: 'insert', row: r }; }));
  return add.length;
}

// ===== 12_docs.js =====
/* 12_docs: tệp trên Drive của tài khoản máy chủ ISO (thư mục dữ liệu riêng tư).
 * Phiên 1a chỉ dùng cho logo báo cáo; doc.upload (PDF/tệp gốc phiên bản, ảnh hồ sơ) làm ở phiên 1b/1c — tệp tải qua máy chủ. */

var DOC_MIME_ = {
  'image/jpeg': { magic: [0xFF, 0xD8, 0xFF], ext: 'jpg' },
  'image/png': { magic: [0x89, 0x50, 0x4E, 0x47], ext: 'png' }
};

function magicOk_(bytes, mime) {
  var m = DOC_MIME_[mime];
  if (!m) return false;
  for (var i = 0; i < m.magic.length; i++) if (u8_(bytes[i]) !== m.magic[i]) return false;
  return true;
}

function appFolder_() {
  var id = prop_('DRIVE_ROOT_FOLDER_ID');
  if (!id) throw apiError_('SYSTEM_NOT_READY');
  return DriveApp.getFolderById(id);
}

function trashQuietly_(f) {
  if (!f) return;
  try { f.setTrashed(true); } catch (e) { /* bỏ qua */ }
}

// ===== 13_sync.js =====
/* 13_sync: sync.bootstrap, sync.changes, sync.push, sync.getOperationStatus (cùng giao thức như M&E, Checksheet)
 * Biểu/tài liệu chỉ gửi xuống trong phạm vi bộ phận của người dùng (itemVisible_); bộ phận, nhóm, điều khoản gửi đủ. */

var SYNC_ENTITIES_ = [
  { type: 'DEPT', sheet: 'Depts' },
  { type: 'GROUP', sheet: 'Groups' },
  { type: 'ITEM', sheet: 'Items', scoped: true },
  { type: 'CLAUSE', sheet: 'Clauses' }
];

/** Dòng → bản ghi gửi client; null nếu không gửi (ngoài phạm vi bộ phận) */
function syncProject_(ctx, ent, row, aux) {
  if (ent.scoped && !itemVisible_(ctx.user, row)) return null;
  return projectRow_(ctx, row);
}

function syncBootstrap_(ctx) {
  var p = ctx.req.payload || {};
  var pageSize = Math.min(2000, setting_('sync_page_size') || 500);
  var tok = String(p.page_token || '0:0').split(':');
  var ei = Number(tok[0]) || 0, off = Number(tok[1]) || 0;
  var st = readState_();
  var cursor = p.page_token && p.sync_cursor ? Number(p.sync_cursor) : Number(stateGet_(st, 'sync_revision', 0));
  var ents = SYNC_ENTITIES_;
  var tc = tableCache_(ents.slice(ei).map(function (e) { return e.sheet; }), st);
  var aux = { tc: tc };
  var records = {};
  var count = 0;
  var next = null;
  var t0 = Date.now();
  var budget = Math.max(2000, Math.min(15000, Number(p.budget_ms) || 15000));
  for (; ei < ents.length; ei++) {
    var ent = ents[ei];
    if (count && Date.now() - t0 > budget) { next = ei + ':0'; break; }
    var rows = tc.rows(ent.sheet);
    var list = records[ent.type] = records[ent.type] || [];
    for (var i = off; i < rows.length; i++) {
      if (count >= pageSize || Date.now() - t0 > budget) { next = ei + ':' + i; break; }
      if (rows[i].archived_at) continue;
      var o = syncProject_(ctx, ent, rows[i], aux);
      if (o) { list.push(o); count++; }
    }
    off = 0;
    if (next) break;
  }
  var out = { records: records, next_page_token: next, sync_cursor: String(cursor) };
  if (!p.page_token) {
    out.user = publicUser_(ctx.user);
    out.settings = clientSettings_();
    out.permissions = permissionSummary_(ctx);
    out.server_version = SERVER_VERSION;
    out.released_dot = releasedDot_();
    out.env = envName_();
    out.server_today = todayVN_();
    out.users = userDirList_();
    out.settings_rev = Number(stateGet_(st, 'settings_rev', 0));
  }
  return out;
}

/** Tên người dùng (mã, tên hiển thị) để hiện người soạn, người phụ trách */
function userDirList_() {
  var dir = userDirectory_();
  return Object.keys(dir).map(function (id) { return { user_id: id, employee_code: dir[id].employee_code, display_name: dir[id].display_name, active: dir[id].active }; });
}

function clientSettings_() {
  var s = settings_();
  var out = {};
  SETTINGS_DEFAULTS.forEach(function (d) { if (d[3]) out[d[0]] = s[d[0]]; });
  return out;
}

function syncChanges_(ctx) {
  var p = ctx.req.payload || {};
  var cursor = Number(p.cursor);
  if (!(cursor >= 0)) throw validationError_([fieldError_('cursor', 'INVALID_VALUE')]);
  var limit = Math.min(500, Number(p.limit) || 500);
  var st = readState_();
  var head = Number(stateGet_(st, 'sync_revision', 0));
  var changes = [];
  var ents = SYNC_ENTITIES_.filter(function (ent) { return Number(stateGet_(st, 'table_rev.' + ent.sheet, 0)) > cursor; });
  var tc = ents.length ? tableCache_(ents.map(function (e) { return e.sheet; }), st) : null;
  var aux = { tc: tc };
  ents.forEach(function (ent) {
    var key = sheetSchema_(ent.sheet).key;
    tc.rows(ent.sheet).forEach(function (r) {
      if (!(Number(r.sync_revision || 0) > cursor)) return;
      var o = r.archived_at ? null : syncProject_(ctx, ent, r, aux);
      changes.push({
        entity_type: ent.type, entity_id: r[key], op: o ? 'UPSERT' : 'TOMBSTONE',
        record_version: r.record_version, sync_revision: r.sync_revision, data: o
      });
    });
  });
  changes.sort(function (a, b) { return a.sync_revision - b.sync_revision; });
  var hasMore = false;
  if (changes.length > limit) {
    var cut = changes[limit - 1].sync_revision;
    var k = limit;
    while (k < changes.length && changes[k].sync_revision === cut) k++;
    hasMore = k < changes.length;
    changes = changes.slice(0, k);
  }
  var nextCursor = hasMore ? changes[changes.length - 1].sync_revision : head;
  var out = {
    changes: changes, next_cursor: String(nextCursor), has_more: hasMore,
    perm_version: 1, sync_cursor: String(nextCursor), server_today: todayVN_(), server_version: SERVER_VERSION,
    released_dot: releasedDot_()
  };
  if (Number(stateGet_(st, 'table_rev.Users', 0)) > cursor) out.users = userDirList_();
  out.settings_rev = Number(stateGet_(st, 'settings_rev', 0));
  return out;
}

/** Một thao tác của hàng chờ offline */
function syncPush_(ctx) {
  var op = (ctx.req.payload || {}).op;
  if (!op || typeof op !== 'object' || typeof op.action !== 'string') throw validationError_([fieldError_('op', 'REQUIRED')]);
  var def = ACTION_REGISTRY[op.action];
  if (!def) throw apiError_('FORBIDDEN');
  if (def.net === 'pin') throw apiError_('REAUTH_REQUIRED');
  if (def.net !== 'offline') throw validationError_([fieldError_('op.action', 'NEEDS_NETWORK')]);
  var inner = {
    api_contract_version: ctx.req.api_contract_version, action: op.action, payload: op.payload || {},
    token: ctx.req.token, operation_id: op.operation_id, dataset_epoch: ctx.req.dataset_epoch,
    device_id: ctx.req.device_id, expected_version: op.expected_version, app_version: ctx.req.app_version,
    client_time: op.local_created_at
  };
  var env;
  try {
    env = dispatchInner_(inner, true);
  } catch (e) {
    env = errorToResponse_(inner, e);
  }
  return { __envelope: env };
}

function syncOpStatus_(ctx) {
  var id = (ctx.req.payload || {}).operation_id;
  if (!isUuidV4_(id)) throw validationError_([fieldError_('operation_id', 'ID_INVALID')]);
  var ex = findOne_('Operations', 'operation_id', id);
  if (!ex || ex.user_id !== ctx.user.user_id) return { operation_id: id, state: 'NOT_FOUND' };
  return {
    operation_id: id, state: ex.state, result_code: ex.result_code, action: ex.action,
    committed_at: ex.committed_at, result: ex.result_json || null,
    record_version: ex.result_json ? ex.result_json.record_version : null
  };
}

// ===== 14_import.js =====
/* 14_import: nhập file Excel tổng (mục 6 đặc tả) — xem trước rồi mới ghi.
 * App đọc tệp bằng SheetJS, gửi các ô của sheet "Danh mục tổng - 总清单" (cột A–Z, dữ liệu từ dòng 5) theo lượt ≤ 200 dòng
 * (import.preview), kèm điều khoản đọc từ hai sheet Phủ ISO 9001 / Phủ BRCGS ở lượt đầu. Máy chủ chuẩn hóa, so với danh mục
 * hiện có (khóa = mã biểu: có rồi → UPDATE, chưa có → ADD, giống hệt → Không đổi), lưu ImportBatches/ImportRows.
 * Ghi (import.commit, PIN): mỗi lượt tối đa 100 dòng. Lô nhạy cảm: người ghi khác người nhập, trừ cấp 4.
 * Biểu ● nhập từ Excel mà chưa có tệp → ban hành, gắn cờ "chưa có tệp" (file_missing) để Thư ký ISO tải lên ở phiên 1b. */

var IMPORT_TEMPLATE_KEY_ = 'iso_catalog';
var IMPORT_TEMPLATE_VERSION_ = '1';
var IMPORT_PART_MAX_ = 200;
var IMPORT_COMMIT_MAX_ = 100;
var IMPORT_COMMIT_BUDGET_MS_ = 25000;
var IMPORT_CELL_COLS_ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Cột *_json đọc ra đã là object (fromCell_); chuỗi cũ thì parse */
function jsonVal_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return null; } }
  return v;
}

function batchProject_(b, dir) {
  var u = dir[b.imported_by], c = dir[b.committed_by];
  return {
    import_batch_id: b.import_batch_id, file_name: b.file_name, status: b.status, imported_by: b.imported_by,
    imported_by_name: u ? u.employee_code + ' · ' + u.display_name : '', imported_at: b.imported_at,
    committed_by_name: c ? c.employee_code + ' · ' + c.display_name : '', completed_at: b.completed_at,
    total_rows: b.total_rows || 0, add_count: b.add_count || 0, update_count: b.update_count || 0, same_count: b.same_count || 0,
    error_count: b.error_count || 0, clause_count: b.clause_count || 0, committed_rows: b.committed_rows || 0,
    record_version: b.record_version || 1
  };
}

/** Điều khoản đọc từ tệp → dòng Clauses chuẩn hóa; trả {rows, errors} */
function normClauses_(list) {
  var out = [], errs = [], seen = {};
  (Array.isArray(list) ? list : []).forEach(function (c, i) {
    var std = String(c && c.std || '');
    var key = cellText_(c && c.key).replace(/\n/g, ' ');
    if (CLAUSE_STDS_.indexOf(std) < 0 || !key || key.length > 120) { errs.push(fieldError_('clauses', 'INVALID_VALUE', i)); return; }
    var id = std + '|' + key;
    if (seen[id]) return;
    seen[id] = true;
    var nm = splitBiCell_(c.name), gr = splitBiCell_(c.group);
    out.push({
      clause_id: id, std: std, key: key, group_vi: c.group_vi !== undefined ? cellText_(c.group_vi) : gr.vi, group_zh: c.group_zh !== undefined ? cellText_(c.group_zh) : gr.zh,
      name_vi: c.name_vi !== undefined ? cellText_(c.name_vi) : nm.vi, name_zh: c.name_zh !== undefined ? cellText_(c.name_zh) : nm.zh,
      mandatory_record: c.mandatory_record === true, sort_order: Number(c.sort_order) || i + 1, active: true
    });
  });
  return { rows: out, errors: errs };
}

var CLAUSE_FIELDS_ = ['group_vi', 'group_zh', 'name_vi', 'name_zh', 'mandatory_record', 'sort_order', 'active'];

/** Điều khoản thêm/sửa/ngừng so với bảng Clauses (chỉ chuẩn có trong tệp mới bị ngừng dòng thiếu) */
function clauseDiff_(rows) {
  var cur = {};
  readRows_('Clauses').forEach(function (r) { cur[r.clause_id] = r; });
  var stds = {};
  rows.forEach(function (r) { stds[r.std] = true; });
  var add = [], upd = [], seen = {};
  rows.forEach(function (r) {
    seen[r.clause_id] = true;
    var o = cur[r.clause_id];
    if (!o) { add.push(r); return; }
    if (CLAUSE_FIELDS_.some(function (k) { return cmpVal_(o[k]) !== cmpVal_(r[k]); })) upd.push(r);
  });
  var off = Object.keys(cur).filter(function (id) { return !seen[id] && stds[cur[id].std] && cur[id].active; });
  return { add: add, update: upd, deactivate: off };
}

/* ---------------- import.preview ---------------- */

/**
 * import.preview {import_batch_id, file_name, source_sha256, meta: {template_key, version, dataset_epoch}, part: {index, count},
 *   total_rows, rows: [{row_number, cells: {A..Z}}], clauses?: [{std, key, group, name, mandatory_record, sort_order}]}
 * Lượt đầu tạo lô; lượt cuối tính số dòng thêm / sửa / không đổi / lỗi, lô sang PREVIEWED.
 */
function importPreview_(ctx) {
  var p = ctx.req.payload || {};
  var errs = [];
  if (!isUuidV4_(p.import_batch_id)) errs.push(fieldError_('import_batch_id', 'ID_INVALID'));
  var part = p.part || {};
  var idx = Number(part.index), partCnt = Number(part.count);
  if (!(idx >= 0 && partCnt >= 1 && idx < partCnt && Math.floor(idx) === idx && Math.floor(partCnt) === partCnt)) errs.push(fieldError_('part', 'INVALID_VALUE'));
  var rows = Array.isArray(p.rows) ? p.rows : null;
  if (!rows) errs.push(fieldError_('rows', 'REQUIRED'));
  else if (rows.length > IMPORT_PART_MAX_) errs.push(fieldError_('rows', 'TOO_MANY_ROWS'));
  var meta = p.meta || null;
  if (idx === 0 && meta && meta.dataset_epoch && meta.dataset_epoch !== sysProps_().dataset_epoch) errs.push(fieldError_('meta', 'TEMPLATE_OLD_EPOCH'));
  if (idx === 0 && meta && meta.template_key && meta.template_key !== IMPORT_TEMPLATE_KEY_) errs.push(fieldError_('meta', 'TEMPLATE_UNKNOWN'));
  if (errs.length) throw validationError_(errs);
  var cl = idx === 0 ? normClauses_(p.clauses) : { rows: [], errors: [] };
  if (cl.errors.length) throw validationError_(cl.errors.slice(0, 20));

  var look = deptLookup_(readRows_('Depts'));
  var items = {};
  readRows_('Items').forEach(function (r) { items[r.code] = r; });
  var groups = {};
  readRows_('Groups').forEach(function (g) { groups[g.group_key] = g; });

  return executeWrite_(ctx, {
    entity_type: 'IMPORT_BATCH', entity_id: p.import_batch_id,
    build: function () {
      var nowIso = isoVN_(now_());
      var batch = findOne_('ImportBatches', 'import_batch_id', p.import_batch_id);
      if (idx === 0 && batch) throw validationError_([fieldError_('import_batch_id', 'ID_EXISTS')]);
      if (idx > 0) {
        if (!batch || batch.imported_by !== ctx.user.user_id) throw apiError_('NOT_FOUND');
        if (batch.status !== 'STAGING') throw validationError_([fieldError_('import_batch_id', 'BATCH_STATE')]);
      }
      // Trùng mã trong tệp: mọi dòng mang mã đó đều lỗi (kể cả dòng đã gửi ở lượt trước) — không để một dòng đè dòng kia
      var prev = idx > 0 ? readRowsByNums_('ImportRows', findRowNums_('ImportRows', 'import_batch_id', p.import_batch_id)) : [];
      var prevByCode = {};
      prev.forEach(function (r) { if (r.code) (prevByCode[r.code] = prevByCode[r.code] || []).push(r); });
      var norm = rows.map(function (raw) {
        var rn = Number(raw && raw.row_number) || 0;
        return { rn: rn, n: normCatalogRow_(raw && raw.cells, look, rn) };
      });
      var cnt = {};
      norm.forEach(function (x) { if (x.n.code) cnt[x.n.code] = (cnt[x.n.code] || 0) + 1; });
      var dupErr = function (rn) { return fieldError_('B', 'CODE_DUPLICATE_FILE', rn); };
      var prevUpd = [];
      var out = [], irows = [];
      norm.forEach(function (x) {
        var rn = x.rn, n = x.n;
        var e = n.errors.slice();
        if (n.code && (cnt[n.code] > 1 || prevByCode[n.code])) e.push(dupErr(rn));
        (prevByCode[n.code] || []).forEach(function (pr) {
          if (pr.validation_status === 'ERROR' && (jsonVal_(pr.errors_json) || []).some(function (z) { return z.code === 'CODE_DUPLICATE_FILE'; })) return;
          var u = clone_(pr); delete u.__row;
          u.validation_status = 'ERROR'; u.action = 'ERROR'; u.changes_json = ''; u.normalized_payload_json = '';
          u.errors_json = JSON.stringify((jsonVal_(pr.errors_json) || []).concat([dupErr(pr.row_number)]));
          pr.validation_status = 'ERROR'; pr.errors_json = u.errors_json;
          prevUpd.push({ sheet: 'ImportRows', mode: 'update', row: u, rowNum: pr.__row });
        });
        var cur = n.code ? items[n.code] : null;
        var action, changes = [];
        if (e.length) action = 'ERROR';
        else if (!cur) action = 'ADD';
        else {
          changes = itemChanges_(cur, n.fields);
          var g0 = n.group && groups[n.group.group_key];
          if (n.group && n.group.label && (!g0 || cmpVal_(g0.label) !== n.group.label)) changes.push('group_label');
          action = changes.length ? 'UPDATE' : 'SAME';
        }
        if (action === 'ADD' && n.group && !groups[n.group.group_key]) changes.push('group_label');
        var ir = {
          import_row_id: uuid_(), import_batch_id: p.import_batch_id, row_number: rn, code: n.code, entity_id: cur ? cur.item_id : '',
          action: action, expected_version: cur ? (cur.record_version || 0) : 0, validation_status: e.length ? 'ERROR' : 'OK',
          errors_json: e.length ? JSON.stringify(e.slice(0, 10)) : '', changes_json: changes.length ? JSON.stringify(changes) : '',
          committed_at: '', normalized_payload_json: e.length ? '' : JSON.stringify({ fields: n.fields, group: n.group })
        };
        irows.push(ir);
        out.push({ row_number: rn, code: n.code, action: action, errors: e, changes: changes });
      });
      var writes = irows.map(function (r) { return { sheet: 'ImportRows', mode: 'insert', row: r }; }).concat(prevUpd);
      var b;
      if (idx === 0) {
        var cd = cl.rows.length ? clauseDiff_(cl.rows) : { add: [], update: [], deactivate: [] };
        b = {
          import_batch_id: p.import_batch_id, kind: 'CATALOG', file_name: trimStr_(p.file_name).slice(0, 200), source_sha256: trimStr_(p.source_sha256).slice(0, 80),
          template_key: meta ? trimStr_(meta.template_key) : '', template_version: meta ? trimStr_(meta.version) : '', file_epoch: meta ? trimStr_(meta.dataset_epoch) : '',
          imported_by: ctx.user.user_id, imported_at: nowIso, total_rows: 0, add_count: 0, update_count: 0, same_count: 0, error_count: 0,
          clause_count: cd.add.length + cd.update.length + cd.deactivate.length, status: 'STAGING', committed_by: '', commit_started_at: '', completed_at: '',
          committed_rows: 0, dataset_epoch: sysProps_().dataset_epoch, record_version: 1, updated_at: nowIso,
          clauses_json: cl.rows.length ? JSON.stringify(cl.rows) : ''
        };
      } else {
        b = clone_(batch); delete b.__row;
        b.record_version = (b.record_version || 1) + 1; b.updated_at = nowIso;
      }
      var allRows = prev.map(function (r) { return { row_number: r.row_number, code: r.code, action: r.validation_status === 'ERROR' ? 'ERROR' : r.action, errors: jsonVal_(r.errors_json) || [], changes: jsonVal_(r.changes_json) || [] }; }).concat(out);
      b.total_rows = allRows.length;
      b.add_count = allRows.filter(function (r) { return r.action === 'ADD'; }).length;
      b.update_count = allRows.filter(function (r) { return r.action === 'UPDATE'; }).length;
      b.same_count = allRows.filter(function (r) { return r.action === 'SAME'; }).length;
      b.error_count = allRows.filter(function (r) { return r.action === 'ERROR'; }).length;
      var last = idx === partCnt - 1;
      if (last) b.status = 'PREVIEWED';
      writes.push({ sheet: 'ImportBatches', mode: idx === 0 ? 'insert' : 'update', row: b });
      var proj = batchProject_(b, userDirectory_());
      return {
        writes: writes, noReplay: true,
        // Lượt cuối trả mọi dòng của lô (dòng của lượt trước có thể đổi thành lỗi do trùng mã)
        result: { batch: proj, rows: out, all_rows: last ? allRows : undefined, last: last, clause_changes: idx === 0 ? b.clause_count : undefined, record_version: b.record_version },
        record_version: b.record_version,
        audit: last ? { entity_type: 'IMPORT_BATCH', entity_id: p.import_batch_id, before_json: null, after_json: { file_name: b.file_name, total: b.total_rows, add: b.add_count, update: b.update_count, same: b.same_count, error: b.error_count, clauses: b.clause_count } } : null
      };
    }
  });
}

/* ---------------- Xem lô ---------------- */

/** import.list: các lô gần nhất (người ghi thứ hai tìm lô chờ ghi ở đây) */
function importList_(ctx) {
  var dir = userDirectory_();
  var rows = readRows_('ImportBatches').sort(function (a, b) { return String(b.imported_at).localeCompare(String(a.imported_at)); });
  var items = rows.slice(0, 20).map(function (b) {
    var o = batchProject_(b, dir);
    o.mine = b.imported_by === ctx.user.user_id;
    o.can_commit = (b.status === 'PREVIEWED' || b.status === 'COMMITTING') && (Number(ctx.user.role_level) === 4 || b.imported_by !== ctx.user.user_id);
    return o;
  });
  return { items: items };
}

/** import.rows {import_batch_id}: các dòng của lô (lỗi, thay đổi) */
function importRows_(ctx) {
  var id = (ctx.req.payload || {}).import_batch_id;
  if (!isUuidV4_(id)) throw validationError_([fieldError_('import_batch_id', 'ID_INVALID')]);
  var b = findOne_('ImportBatches', 'import_batch_id', id);
  if (!b) throw apiError_('NOT_FOUND');
  var nums = findRowNums_('ImportRows', 'import_batch_id', id);
  var rows = readRowsByNums_('ImportRows', nums).sort(function (x, y) { return x.row_number - y.row_number; }).map(function (r) {
    return { row_number: r.row_number, code: r.code, action: r.action, validation_status: r.validation_status, errors: jsonVal_(r.errors_json) || [], changes: jsonVal_(r.changes_json) || [], committed_at: r.committed_at };
  });
  var o = batchProject_(b, userDirectory_());
  o.can_commit = (b.status === 'PREVIEWED' || b.status === 'COMMITTING') && (Number(ctx.user.role_level) === 4 || b.imported_by !== ctx.user.user_id);
  return { batch: o, rows: rows, clauses: jsonVal_(b.clauses_json) ? clauseDiffSummary_(jsonVal_(b.clauses_json)) : null };
}

function clauseDiffSummary_(rows) {
  var d = clauseDiff_(rows);
  return { add: d.add.length, update: d.update.length, deactivate: d.deactivate.length };
}

/* ---------------- import.commit ---------------- */

/**
 * import.commit {import_batch_id} (PIN): ghi tối đa 100 dòng còn lại của lô (thêm/sửa); điều khoản ghi ở lượt đầu.
 * Biểu đã bị sửa sau khi xem trước (record_version khác) → dòng đó báo ROW_CHANGED, không ghi. Trả {batch, committed, remaining, row_errors}.
 */
function importCommit_(ctx) {
  var id = (ctx.req.payload || {}).import_batch_id;
  if (!isUuidV4_(id)) throw validationError_([fieldError_('import_batch_id', 'ID_INVALID')]);
  var b0 = findOne_('ImportBatches', 'import_batch_id', id);
  if (!b0) throw apiError_('NOT_FOUND');
  if (b0.status !== 'PREVIEWED' && b0.status !== 'COMMITTING') throw validationError_([fieldError_('import_batch_id', 'BATCH_STATE')]);
  if (Number(ctx.user.role_level) !== 4 && b0.imported_by === ctx.user.user_id) throw validationError_([fieldError_('import_batch_id', 'IMPORT_SAME_USER')]);
  var t0 = Date.now();
  var res = executeWrite_(ctx, {
    entity_type: 'IMPORT_BATCH', entity_id: id,
    build: function () {
      var nowIso = isoVN_(now_());
      var b = readRowAt_('ImportBatches', b0.__row);
      if (b.status !== 'PREVIEWED' && b.status !== 'COMMITTING') throw validationError_([fieldError_('import_batch_id', 'BATCH_STATE')]);
      var irows = readRowsByNums_('ImportRows', findRowNums_('ImportRows', 'import_batch_id', id)).sort(function (x, y) { return x.row_number - y.row_number; });
      var pending = irows.filter(function (r) { return r.validation_status === 'OK' && (r.action === 'ADD' || r.action === 'UPDATE') && !r.committed_at; });
      var take = pending.slice(0, IMPORT_COMMIT_MAX_);
      var items = {};
      readRows_('Items').forEach(function (r) { items[r.code] = r; });
      var groups = {};
      readRows_('Groups').forEach(function (g) { groups[g.group_key] = g; });
      var writes = [], rowErr = [], committed = 0;
      var groupTouched = {};
      take.forEach(function (ir) {
        if (Date.now() - t0 > IMPORT_COMMIT_BUDGET_MS_) return;
        var np = jsonVal_(ir.normalized_payload_json);
        var cur = items[ir.code] || null;
        var bad = null;
        if (ir.action === 'ADD' && cur) bad = 'CODE_DUPLICATE';
        if (ir.action === 'UPDATE' && (!cur || Number(cur.record_version || 0) !== Number(ir.expected_version))) bad = 'ROW_CHANGED';
        var upd = clone_(ir); delete upd.__row;
        if (bad) {
          upd.validation_status = 'ERROR';
          upd.errors_json = JSON.stringify([fieldError_('B', bad, ir.row_number)]);
          rowErr.push({ row_number: ir.row_number, code: ir.code, error: bad });
          writes.push({ sheet: 'ImportRows', mode: 'update', row: upd, rowNum: ir.__row });
          return;
        }
        var row = itemRowFromImport_(ctx, cur, ir.code, np.fields, nowIso);
        writes.push({ sheet: 'Items', mode: cur ? 'update' : 'insert', row: row, rowNum: cur ? cur.__row : undefined });
        items[ir.code] = row;
        var g = np.group;
        if (g && g.group_key && !groupTouched[g.group_key]) {
          var og = groups[g.group_key];
          if (!og) {
            var ng = cNew_(ctx, { group_key: g.group_key, dept_code: g.dept_code, name_vi: g.name_vi, name_zh: g.name_zh, label: g.label, sort_order: Object.keys(groups).length + 1, active: true,
              i18n_meta: g.name_vi && g.name_zh ? { name: { src: 'vi', state: 'HUMAN', at: nowIso } } : (g.name_vi || g.name_zh ? { name: { src: g.name_vi ? 'vi' : 'zh', state: 'PENDING', at: nowIso } } : {}) });
            writes.push({ sheet: 'Groups', mode: 'insert', row: ng });
            groups[g.group_key] = ng;
            groupTouched[g.group_key] = true;
          } else if (g.label && cmpVal_(og.label) !== g.label) {
            var ug = clone_(og); delete ug.__row;
            ug.label = g.label; ug.name_vi = g.name_vi; ug.name_zh = g.name_zh;
            cUpdate_(ctx, ug);
            writes.push({ sheet: 'Groups', mode: 'update', row: ug, rowNum: og.__row });
            groupTouched[g.group_key] = true;
          }
        }
        upd.committed_at = nowIso;
        upd.entity_id = row.item_id;
        writes.push({ sheet: 'ImportRows', mode: 'update', row: upd, rowNum: ir.__row });
        committed++;
      });
      // Điều khoản: ở lượt ghi đầu
      var clausesDone = 0;
      if (b.status === 'PREVIEWED' && jsonVal_(b.clauses_json)) {
        var cd = clauseDiff_(jsonVal_(b.clauses_json));
        var cur2 = {};
        readRows_('Clauses').forEach(function (r) { cur2[r.clause_id] = r; });
        var meta = function (r) {
          var m = {};
          ['name', 'group'].forEach(function (f) {
            if (r[f + '_vi'] && r[f + '_zh']) m[f] = { src: 'vi', state: 'HUMAN', at: nowIso };
            else if (r[f + '_vi'] || r[f + '_zh']) m[f] = { src: r[f + '_vi'] ? 'vi' : 'zh', state: 'PENDING', at: nowIso };
          });
          return m;
        };
        cd.add.forEach(function (r) { var x = cNew_(ctx, clone_(r)); x.i18n_meta = meta(r); writes.push({ sheet: 'Clauses', mode: 'insert', row: x }); clausesDone++; });
        cd.update.forEach(function (r) {
          var o = cur2[r.clause_id]; var x = clone_(o); delete x.__row;
          CLAUSE_FIELDS_.forEach(function (k) { x[k] = r[k]; });
          x.i18n_meta = meta(r); cUpdate_(ctx, x);
          writes.push({ sheet: 'Clauses', mode: 'update', row: x, rowNum: o.__row }); clausesDone++;
        });
        cd.deactivate.forEach(function (cid) {
          var o = cur2[cid]; var x = clone_(o); delete x.__row;
          x.active = false; cUpdate_(ctx, x);
          writes.push({ sheet: 'Clauses', mode: 'update', row: x, rowNum: o.__row }); clausesDone++;
        });
      }
      var nb = clone_(b); delete nb.__row;
      var remaining = pending.length - committed - rowErr.length;
      nb.committed_rows = (nb.committed_rows || 0) + committed;
      nb.error_count = (nb.error_count || 0) + rowErr.length;
      if (!nb.committed_by) { nb.committed_by = ctx.user.user_id; nb.commit_started_at = nowIso; }
      nb.status = remaining > 0 ? 'COMMITTING' : 'COMPLETED';
      if (nb.status === 'COMPLETED') nb.completed_at = nowIso;
      nb.record_version = (nb.record_version || 1) + 1; nb.updated_at = nowIso;
      writes.push({ sheet: 'ImportBatches', mode: 'update', row: nb, rowNum: b.__row });
      var su = { last_import_at: ['DATETIME', nowIso] };
      return {
        writes: writes, state: su, noReplay: true,
        result: { batch: batchProject_(nb, userDirectory_()), committed: committed, clauses: clausesDone, remaining: remaining, row_errors: rowErr, record_version: nb.record_version },
        record_version: nb.record_version,
        audit: { entity_type: 'IMPORT_BATCH', entity_id: id, before_json: { status: b.status }, after_json: { status: nb.status, committed: committed, clauses: clausesDone, errors: rowErr.length } }
      };
    }
  });
  // Ngày bắt đầu tính hồ sơ của biểu ● nhập từ Excel: ngày nhập danh mục đầu tiên (đặt một lần, sửa được ở Cài đặt)
  if (res.code === 'OK' && res.data && res.data.committed && !setting_('records_start_date')) {
    withWriteLock_(function () { writeSetting_('records_start_date', todayVN_(), ctx.user.user_id); });
  }
  return res;
}

/** import.cancel {import_batch_id}: bỏ lô chưa ghi xong (người nhập, Thư ký ISO, cấp 4) */
function importCancel_(ctx) {
  var id = (ctx.req.payload || {}).import_batch_id;
  if (!isUuidV4_(id)) throw validationError_([fieldError_('import_batch_id', 'ID_INVALID')]);
  return executeWrite_(ctx, {
    entity_type: 'IMPORT_BATCH', entity_id: id,
    build: function () {
      var b = findOne_('ImportBatches', 'import_batch_id', id);
      if (!b) throw apiError_('NOT_FOUND');
      if (b.status === 'COMPLETED' || b.status === 'CANCELLED') throw validationError_([fieldError_('import_batch_id', 'BATCH_STATE')]);
      var nb = clone_(b); delete nb.__row;
      nb.status = 'CANCELLED'; nb.completed_at = isoVN_(now_());
      nb.record_version = (nb.record_version || 1) + 1; nb.updated_at = nb.completed_at;
      return {
        writes: [{ sheet: 'ImportBatches', mode: 'update', row: nb, rowNum: b.__row }], noReplay: true,
        result: { batch: batchProject_(nb, userDirectory_()), record_version: nb.record_version }, record_version: nb.record_version,
        audit: { entity_type: 'IMPORT_BATCH', entity_id: id, before_json: { status: b.status }, after_json: { status: 'CANCELLED' } }
      };
    }
  });
}

// ===== 15_admin.js =====
/* 15_admin: hàm chạy từ trình soạn Apps Script và trigger (lấy từ M&E qua Checksheet)
 * Tên không có hậu tố "_" để hiện trong menu Chạy; không có tham số. */

function log_(msg) {
  Logger.log(msg);
}

/** Tạo một sheet với hàng tiêu đề, cố định hàng 1, định dạng ô theo kiểu (3.1) */
function createSheet_(book, name) {
  var s = sheetSchema_(name);
  var sheet = book.insertSheet(name);
  var cols = s.cols;
  if (sheet.getMaxColumns() < cols.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), cols.length - sheet.getMaxColumns());
  sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  formatColumns_(sheet, name, cols, 0);
  return sheet;
}

/** Đặt định dạng Văn bản (@) cho các cột ID/CODE/DATE/DATETIME/JSON/STRING/ENUM từ vị trí fromIdx; gom cột liền nhau */
function formatColumns_(sheet, name, headerCols, fromIdx) {
  var types = sheetSchema_(name).types;
  var rows = Math.max(1, sheet.getMaxRows() - 1);
  var i = fromIdx;
  while (i < headerCols.length) {
    if (!TEXT_FORMAT_TYPES_[types[headerCols[i]] || 'STRING']) { i++; continue; }
    var j = i;
    while (j + 1 < headerCols.length && TEXT_FORMAT_TYPES_[types[headerCols[j + 1]] || 'STRING']) j++;
    sheet.getRange(2, i + 1, rows, j - i + 1).setNumberFormat('@');
    i = j + 1;
  }
}

function settingRow_(d) {
  var v = d[1] === 'JSON' ? JSON.stringify(d[2]) : (d[1] === 'BOOL' ? (d[2] ? 'true' : 'false') : String(d[2]));
  return { setting_key: d[0], value: v, value_type: d[1], description_vi: d[5], description_zh: d[6], updated_at: isoVN_(now_()), updated_by: SYSTEM_USER, i18n_meta: { description: { src: 'vi', state: 'HUMAN', at: isoVN_(now_()) } } };
}

/** Dựng môi trường mới (THỬ hoặc THẬT). Đã có BUSINESS_SPREADSHEET_ID thì dừng. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('BUSINESS_SPREADSHEET_ID')) {
    log_('Đã cài đặt trước đó — không làm gì. Muốn thêm sheet/cột thì chạy migrateSchema.');
    return;
  }
  // ENV đặt tay trước setup: quên đặt ở dự án THẬT thì THẬT chạy như THỬ (TEST_*, dữ liệu mẫu) — nên bắt buộc
  var env = String(props.getProperty('ENV') || '').trim();
  if (env !== 'THU' && env !== 'THAT') {
    throw new Error('Chưa đặt thuộc tính ENV (hoặc sai). Cài đặt dự án → Thuộc tính tập lệnh → thêm ENV = THAT (máy chủ dùng thật) hoặc THU (máy chủ thử), rồi chạy lại setup.');
  }
  props.setProperty('ENV', env);
  adminSetupSecrets();
  var suffix = env === 'THU' ? '_THU' : '';
  var parent = DriveApp.createFolder(NAME_PREFIX + 'HeThong' + suffix);
  var dataFolder = parent.createFolder(NAME_PREFIX + 'Data' + suffix);
  var backupFolder = parent.createFolder(NAME_PREFIX + 'Backups' + suffix);
  var biz = SpreadsheetApp.create(NAME_PREFIX + 'NghiepVu' + suffix);
  var sec = SpreadsheetApp.create(NAME_PREFIX + 'BaoMat' + suffix);
  biz.setSpreadsheetTimeZone(TZ);
  sec.setSpreadsheetTimeZone(TZ);
  DriveApp.getFileById(biz.getId()).moveTo(parent);
  DriveApp.getFileById(sec.getId()).moveTo(parent);
  props.setProperties({
    BUSINESS_SPREADSHEET_ID: biz.getId(), SECURITY_SPREADSHEET_ID: sec.getId(),
    DRIVE_ROOT_FOLDER_ID: dataFolder.getId(), DRIVE_BACKUP_FOLDER_ID: backupFolder.getId(),
    DATASET_EPOCH: uuid_(), MAINTENANCE_MODE: 'false'
  });
  dbReset_();
  sheetsForDot_(RELEASED_DOT).forEach(function (name) {
    createSheet_(sheetSchema_(name).book === 'S' ? sec : biz, name);
  });
  [biz, sec].forEach(function (b) {
    b.getSheets().forEach(function (s) { if (!SHEETS[s.getName()]) b.deleteSheet(s); });
  });
  dbReset_();
  seedBaseRows_();
  clearSysCaches_();
  log_('Xong setup. ENV=' + env + '. Đã tạo ' + sheetsForDot_(RELEASED_DOT).length + ' sheet trong thư mục ' + parent.getName() +
    '. Bước tiếp theo: đặt SETUP_OWNER_CODE, SETUP_OWNER_NAME, SETUP_OWNER_TEMP_PIN rồi chạy adminSetupOwner.');
  installTriggers();
}

/** Nạp Settings, SystemState, bộ phận còn thiếu (dùng chung cho setup và migrateSchema) */
function seedBaseRows_() {
  withWriteLock_(function () {
    var have = {};
    readRows_('Settings').forEach(function (r) { have[r.setting_key] = true; });
    var add = SETTINGS_DEFAULTS.filter(function (d) { return d[4] <= RELEASED_DOT && !have[d[0]]; }).map(settingRow_);
    if (add.length) insertRows_('Settings', add);

    var st = readState_();
    var su = {};
    SYSTEM_STATE_INITIAL.forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(st.map, k[0])) su[k[0]] = [k[1], k[2]];
    });
    su.dataset_epoch = ['STRING', prop_('DATASET_EPOCH')];
    su.maintenance_mode = ['BOOL', prop_('MAINTENANCE_MODE') === 'true'];
    su.schema_version = ['STRING', SCHEMA_VERSION];
    stateWrite_(st, su, SYSTEM_USER);
    // 10 bộ phận mặc định (ISO, KD, CB, SX, CL, MH, KV, NS, BRC, CĐ)
    seedDepts_();
  });
}

/** Thêm sheet/cột/Settings còn thiếu; chạy nhiều lần vẫn cùng kết quả */
function migrateSchema() {
  if (!prop_('BUSINESS_SPREADSHEET_ID')) throw new Error('Chưa setup');
  dbReset_();
  var added = [];
  sheetsForDot_(RELEASED_DOT).forEach(function (name) {
    var s = sheetSchema_(name);
    var book = book_(s.book);
    var sheet = book.getSheetByName(name);
    if (!sheet) { createSheet_(book, name); added.push(name); return; }
    var n = sheet.getLastColumn();
    var header = n ? sheet.getRange(1, 1, 1, n).getValues()[0].map(String) : [];
    var missing = s.cols.filter(function (c) { return header.indexOf(c) < 0; });
    if (missing.length) {
      if (sheet.getMaxColumns() < header.length + missing.length) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), header.length + missing.length - sheet.getMaxColumns());
      }
      sheet.getRange(1, header.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
      added.push(name + '(' + missing.join(',') + ')');
    }
    // Định dạng Văn bản cho mọi cột kiểu chuỗi, kể cả cột cũ vừa đổi kiểu (vd. due_revision)
    formatColumns_(sheet, name, header.concat(missing), 0);
  });
  dbReset_();
  seedBaseRows_();
  clearSysCaches_();
  log_('migrateSchema xong. Thêm: ' + (added.length ? added.join('; ') : 'không có') + '. schema_version=' + SCHEMA_VERSION);
}

function clearSysCaches_() {
  cache_().removeAll(['sys:props', 'sys:state', 'cfg:settings']);
}

/** Sinh PIN_PEPPER_V1, TOKEN_SECRET_V1 nếu chưa có; không ghi đè */
function adminSetupSecrets() {
  var props = PropertiesService.getScriptProperties();
  ['PIN_PEPPER_V1', 'TOKEN_SECRET_V1'].forEach(function (k) {
    if (props.getProperty(k)) { log_(k + ': đã có, giữ nguyên.'); return; }
    props.setProperty(k, b64_(randomSecret32_()));
    log_(k + ': đã tạo.');
  });
}

/** Tạo owner đầu tiên từ SETUP_OWNER_CODE, SETUP_OWNER_NAME, SETUP_OWNER_TEMP_PIN; xóa ba khóa ngay sau khi dùng */
function adminSetupOwner() {
  if (!prop_('BUSINESS_SPREADSHEET_ID')) throw new Error('Chưa setup — chạy setup trước.');
  var code = normEmpCode_(prop_('SETUP_OWNER_CODE'));
  var name = trimStr_(prop_('SETUP_OWNER_NAME'));
  var pin = trimStr_(prop_('SETUP_OWNER_TEMP_PIN'));
  if (!code || !name || !pin) throw new Error('Thiếu SETUP_OWNER_CODE / SETUP_OWNER_NAME / SETUP_OWNER_TEMP_PIN trong Thuộc tính tập lệnh.');
  if (!/^[A-Z0-9][A-Z0-9._-]{0,39}$/.test(code)) throw new Error('Mã nhân viên chỉ gồm chữ, số, dấu . _ -');
  var weak = pinWeakReason_(pin, code, null);
  if (weak) throw new Error('PIN tạm không hợp lệ hoặc quá dễ đoán (' + weak + '). Chọn 6 số khác.');
  dbReset_();
  var created = withWriteLock_(function () {
    var users = readRows_('Users');
    if (users.some(function (u) { return u.is_system_owner && u.active && Number(u.role_level) === 4; })) {
      return 'EXISTS';
    }
    if (users.some(function (u) { return u.employee_code === code; })) throw new Error('Mã nhân viên đã tồn tại: ' + code);
    var rec = newPinRecord_(pin);
    var nowIso = isoVN_(now_());
    insertRows_('Users', [{
      user_id: uuid_(), employee_code: code, display_name: name, email: '', role_level: 4, active: true,
      pin_hash: rec.pin_hash, salt: rec.salt, pin_hash_version: rec.pin_hash_version, failed_attempts: 0, locked_until: '',
      created_at: nowIso, updated_at: nowIso, auth_version: 1, is_system_owner: true, must_change_pin: true,
      temp_pin_expires_at: isoVN_(new Date(now_().getTime() + setting_('temp_pin_hours') * 3600000)), pin_changed_at: '',
      failed_window_started_at: '', last_login_at: '', record_version: 1, created_by: SYSTEM_USER, updated_by: SYSTEM_USER,
      dept_codes: '', iso_secretary: false, auditor: false
    }]);
    return 'CREATED';
  });
  ['SETUP_OWNER_CODE', 'SETUP_OWNER_NAME', 'SETUP_OWNER_TEMP_PIN'].forEach(delProp_);
  if (created === 'EXISTS') log_('Đã có owner đang hoạt động — không tạo thêm. Đã xóa 3 khóa SETUP_OWNER_*.');
  else log_('Đã tạo owner ' + code + ' (cấp 4). Đăng nhập bằng PIN tạm trong 72 giờ, app sẽ bắt đổi PIN. Đã xóa 3 khóa SETUP_OWNER_*.');
}

/**
 * Owner quên PIN (cả THỬ lẫn THẬT): trong app không ai được động tới owner trừ chính owner,
 * nên người giữ tài khoản Google cấp PIN tạm từ trình soạn. Đặt OWNER_RESET_TEMP_PIN (6 số) rồi chạy hàm này;
 * khóa tự xóa ngay, không ghi PIN vào log. Owner đăng nhập bằng PIN tạm trong 72 giờ và phải đổi PIN; mọi phiên cũ bị thu hồi.
 */
function adminResetOwnerPin() {
  if (!prop_('BUSINESS_SPREADSHEET_ID')) throw new Error('Chưa setup — chạy setup trước.');
  var pin = trimStr_(prop_('OWNER_RESET_TEMP_PIN'));
  delProp_('OWNER_RESET_TEMP_PIN');
  if (!pin) throw new Error('Thiếu OWNER_RESET_TEMP_PIN (6 số) trong Thuộc tính tập lệnh.');
  dbReset_();
  var code = withWriteLock_(function () {
    var owners = readRows_('Users').filter(function (u) { return u.is_system_owner && Number(u.role_level) === 4; });
    if (!owners.length) throw new Error('Chưa có owner — dùng adminSetupOwner.');
    if (owners.length > 1) throw new Error('Có hơn một owner — sửa tay sheet Users trước.');
    var u = owners[0];
    var weak = pinWeakReason_(pin, u.employee_code, null);
    if (weak) throw new Error('PIN tạm không hợp lệ hoặc quá dễ đoán (' + weak + '). Chọn 6 số khác.');
    var rec = newPinRecord_(pin);
    bumpAuthVersion_(u, {
      pin_hash: rec.pin_hash, salt: rec.salt, pin_hash_version: rec.pin_hash_version, must_change_pin: true,
      temp_pin_expires_at: isoVN_(new Date(now_().getTime() + setting_('temp_pin_hours') * 3600000)),
      failed_attempts: 0, failed_window_started_at: '', locked_until: '', active: true
    });
    writeAudit_({ user_id: SYSTEM_USER, action: 'user.resetPin', entity_type: 'USER', entity_id: u.user_id, before_json: null, after_json: { temp_pin_issued: true, by: 'adminResetOwnerPin' }, auth_basis: 'OWNER' });
    return u.employee_code;
  });
  log_('Đã cấp PIN tạm cho owner ' + code + ' (hạn 72 giờ). Mọi phiên cũ của owner đã bị thu hồi; đăng nhập rồi đổi PIN ngay. Đã xóa OWNER_RESET_TEMP_PIN.');
}

var TRIGGER_FUNCS_ = ['runBackgroundJobs', 'backupData'];

/** Xóa trigger trùng tên rồi tạo lại đúng 2 trigger định kỳ: dịch bù mỗi 3 giờ, sao lưu hằng tuần.
 *  Đợt 2 thêm syncEvidenceHourly (đọc ngày có hồ sơ từ M&E, Checksheet) và nhắc hạn Gmail. */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (TRIGGER_FUNCS_.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runBackgroundJobs').timeBased().everyHours(3).create();
  var wd = ScriptApp.WeekDay[String(setting_('backup_weekday') || 'SUNDAY')] || ScriptApp.WeekDay.SUNDAY;
  ScriptApp.newTrigger('backupData').timeBased().onWeekDay(wd).atHour(Number(setting_('backup_hour'))).inTimezone(TZ).create();
  var names = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  log_('Đã cài trigger: ' + names.join(', '));
}

function setMaintenance_(on) {
  setProp_('MAINTENANCE_MODE', on ? 'true' : 'false');
  withWriteLock_(function () {
    var st = readState_();
    stateWrite_(st, { maintenance_mode: ['BOOL', !!on] }, SYSTEM_USER);
  });
  cache_().removeAll(['sys:props', 'sys:state']);
}

function adminMaintenanceOn() { setMaintenance_(true); log_('Đã BẬT bảo trì.'); }
function adminMaintenanceOff() { setMaintenance_(false); log_('Đã TẮT bảo trì.'); }

function adminClearLoginPause() {
  withWriteLock_(function () {
    var st = readState_();
    stateWrite_(st, { login_paused_until: ['DATETIME', ''] }, SYSTEM_USER);
  });
  cache_().remove('sys:state');
  log_('Đã gỡ tạm dừng đăng nhập.');
}

function adminFlushAuthCache() {
  var keys = [];
  readRows_('Sessions').forEach(function (s) { keys.push('ss:' + s.session_id); });
  readRows_('Users').forEach(function (u) { keys.push('us:' + u.user_id); });
  keys.push('users:dir');
  for (var i = 0; i < keys.length; i += 500) cache_().removeAll(keys.slice(i, i + 500));
  log_('Đã xóa ' + keys.length + ' khóa cache phiên/người dùng.');
}

/* runBackgroundJobs (dịch bù) ở 21_i18n.js; backupData (sao lưu hằng tuần) ở 23_backup.js */

// ===== 20_users.js =====
/* 20_users: quản trị người dùng (lấy từ M&E qua Checksheet; phạm vi bộ phận + cờ Thư ký ISO, Đánh giá viên).
 * Giới hạn: không thao tác lên chính mình; không thao tác lên owner trừ khi người làm là owner;
 * không hạ cấp/khóa cấp 4 cuối cùng còn active; mọi thay đổi tăng auth_version, trừ user.unlock.
 * PIN tạm chỉ trả một lần trong phản hồi: không ghi Operations.result_json/intent, AuditLogs, log. */

var EMP_CODE_RE_ = /^[A-Z0-9][A-Z0-9._-]{0,39}$/;
var EMAIL_RE_ = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/** Bản ghi người dùng gửi client: không bao giờ có pin_hash/salt; C3 không thấy email, lịch sử đăng nhập */
function projectUser_(ctx, u, sessionsByUser) {
  var t = now_().getTime();
  var lu = parseTime_(u.locked_until);
  var o = {
    user_id: u.user_id, employee_code: u.employee_code, display_name: u.display_name, role_level: Number(u.role_level),
    dept_codes: deptList_(u.dept_codes), iso_secretary: !!u.iso_secretary, auditor: !!u.auditor, active: !!u.active, is_system_owner: !!u.is_system_owner,
    pin_locked: !!(lu && lu.getTime() > t), locked_until: lu && lu.getTime() > t ? u.locked_until : '',
    must_change_pin: !!u.must_change_pin, temp_pin_expires_at: u.must_change_pin ? u.temp_pin_expires_at : '',
    record_version: u.record_version || 1, created_at: u.created_at, updated_at: u.updated_at
  };
  if (Number(ctx.user.role_level) >= 4) {
    o.email = u.email || '';
    o.last_login_at = u.last_login_at || '';
    o.pin_changed_at = u.pin_changed_at || '';
    o.active_sessions = sessionsByUser ? (sessionsByUser[u.user_id] || 0) : undefined;
  }
  return o;
}

function userView_(ctx) {
  var sess = null;
  if (Number(ctx.user.role_level) >= 4) {
    sess = {};
    var t = now_().getTime();
    readRows_('Sessions').forEach(function (s) {
      if (s.session_kind === 'FULL' && isSessionActive_(s, t)) sess[s.user_id] = (sess[s.user_id] || 0) + 1;
    });
  }
  var items = readRows_('Users').map(function (u) { return projectUser_(ctx, u, sess); });
  items.sort(function (a, b) { return String(a.employee_code).localeCompare(String(b.employee_code)); });
  return { items: items, me: ctx.user.user_id };
}

/** Kiểm cấp, bộ phận, cờ. Trả {dept_codes: chuỗi đã chuẩn hóa (rỗng = mọi bộ phận), iso_secretary, auditor} */
function validateRole_(p, errs) {
  var lvl = Number(p.role_level);
  if (!(lvl >= 1 && lvl <= 4 && Math.floor(lvl) === lvl)) errs.push(fieldError_('role_level', 'INVALID_VALUE'));
  var list = Array.isArray(p.dept_codes) ? p.dept_codes.map(String) : deptList_(p.dept_codes);
  var have = {};
  readRows_('Depts').forEach(function (d) { have[d.dept_code] = true; });
  var out = [];
  list.forEach(function (d) {
    if (!have[d]) errs.push(fieldError_('dept_codes', 'DEPT_UNKNOWN'));
    else if (out.indexOf(d) < 0) out.push(d);
  });
  if (p.iso_secretary !== undefined && typeof p.iso_secretary !== 'boolean') errs.push(fieldError_('iso_secretary', 'INVALID_VALUE'));
  if (p.auditor !== undefined && typeof p.auditor !== 'boolean') errs.push(fieldError_('auditor', 'INVALID_VALUE'));
  return { dept_codes: out.join(','), iso_secretary: p.iso_secretary === true, auditor: p.auditor === true };
}

/** Người đích của thao tác quản trị: tồn tại, không phải mình, owner chỉ owner thao tác */
function adminTarget_(ctx, userId) {
  if (!isUuidV4_(userId)) throw validationError_([fieldError_('user_id', 'ID_INVALID')]);
  var u = findOne_('Users', 'user_id', userId);
  if (!u) throw apiError_('NOT_FOUND');
  if (u.user_id === ctx.user.user_id) throw validationError_([fieldError_('user_id', 'SELF_ACTION')]);
  if (u.is_system_owner && !ctx.user.is_system_owner) throw apiError_('FORBIDDEN');
  return u;
}

/** Còn cấp 4 active nào khác ngoài người này không */
function otherActiveAdmin_(userId) {
  return readRows_('Users').some(function (u) { return u.user_id !== userId && u.active && Number(u.role_level) === 4; });
}

/** So expected_version (không lộ dòng Users ra phản hồi lỗi) */
function assertUserVersion_(ctx, u) {
  var ev = ctx.req.expected_version;
  if (ev === undefined || ev === null || Number(ev) !== Number(u.record_version || 1)) {
    throw apiError_('VERSION_CONFLICT', { entity_type: 'USER', server: projectUser_(ctx, u, null), server_version: u.record_version || 1 });
  }
}

/** Thu hồi mọi phiên còn hiệu lực (dưới khóa; ghi Sheet trước, cache sau) */
function revokeUserSessions_(userId, reason) {
  var t = now_().getTime();
  findAll_('Sessions', 'user_id', userId).forEach(function (s) {
    if (isSessionActive_(s, t)) revokeSessionRow_(s, reason || 'AUTH_VERSION');
  });
}

/** Sau khi ghi Users: làm mới cache phiên/người dùng */
function afterUserWrite_(userId, oldAv, newAv) {
  var c = cache_();
  if (newAv !== undefined && newAv !== oldAv) c.put('av:' + userId, String(newAv), 21600);
  c.remove('us:' + userId);
  c.remove('users:dir');
  DB_.userDir = null;
}

/** Trả PIN tạm một lần, chỉ ở lần ghi đầu (gửi lại cùng operation_id không trả lại) */
function withTempPin_(res, box) {
  if (!res || res.code !== 'OK' || !box.pin) return res;
  var out = clone_(res);
  out.data = out.data || {};
  out.data.temp_pin = box.pin;
  return out;
}

/** user.create {user_id, employee_code, display_name, email?, role_level, dept_codes[], iso_secretary, auditor} — Quản trị, PIN */
function userCreate_(ctx) {
  var p = ctx.req.payload || {};
  var errs = [];
  if (!isUuidV4_(p.user_id)) errs.push(fieldError_('user_id', 'ID_INVALID'));
  var code = normEmpCode_(p.employee_code);
  if (!code) errs.push(fieldError_('employee_code', 'REQUIRED'));
  else if (!EMP_CODE_RE_.test(code)) errs.push(fieldError_('employee_code', 'CODE_INVALID'));
  var name = trimStr_(p.display_name);
  if (!name) errs.push(fieldError_('display_name', 'REQUIRED'));
  if (name.length > 80) errs.push(fieldError_('display_name', 'INVALID_VALUE'));
  var email = trimStr_(p.email).toLowerCase();
  if (email && !EMAIL_RE_.test(email)) errs.push(fieldError_('email', 'INVALID_VALUE'));
  var role = validateRole_(p, errs);
  if (Number(ctx.req.expected_version || 0) !== 0) errs.push(fieldError_('expected_version', 'INVALID_VALUE'));
  if (errs.length) throw validationError_(errs);
  var box = {};
  var res = executeWrite_(ctx, {
    entity_type: 'USER', entity_id: p.user_id,
    build: function () {
      if (findRowNums_('Users', 'user_id', p.user_id).length) throw validationError_([fieldError_('user_id', 'ID_EXISTS')]);
      if (findRowNums_('Users', 'employee_code', code).length) throw validationError_([fieldError_('employee_code', 'CODE_DUPLICATE')]);
      var pin = randomPin_(code);
      var rec = newPinRecord_(pin);
      var nowIso = isoVN_(now_());
      var exp = isoVN_(new Date(now_().getTime() + setting_('temp_pin_hours') * 3600000));
      var row = {
        user_id: p.user_id, employee_code: code, display_name: name, email: email, role_level: Number(p.role_level), active: true,
        pin_hash: rec.pin_hash, salt: rec.salt, pin_hash_version: rec.pin_hash_version, failed_attempts: 0, locked_until: '',
        created_at: nowIso, updated_at: nowIso, auth_version: 1, is_system_owner: false, must_change_pin: true,
        temp_pin_expires_at: exp, pin_changed_at: '', failed_window_started_at: '', last_login_at: '', record_version: 1,
        created_by: ctx.user.user_id, updated_by: ctx.user.user_id, dept_codes: role.dept_codes, iso_secretary: role.iso_secretary, auditor: role.auditor
      };
      var writes = [{ sheet: 'Users', mode: 'insert', row: row }];
      box.pin = pin;
      return {
        writes: writes, noReplay: true,
        result: { entity_type: 'USER', entity_id: p.user_id, employee_code: code, temp_pin_expires_at: exp, record_version: 1 },
        record_version: 1,
        audit: { entity_type: 'USER', entity_id: p.user_id, before_json: null, after_json: { employee_code: code, display_name: name, role_level: row.role_level, dept_codes: role.dept_codes, iso_secretary: role.iso_secretary, auditor: role.auditor, temp_pin_issued: true } }
      };
    }
  });
  afterUserWrite_(p.user_id);
  return withTempPin_(res, box);
}

/** user.setRole {user_id, role_level, dept_codes[], iso_secretary, auditor, display_name?, email?} — đổi cấp/bộ phận/cờ (tăng auth_version) */
function userSetRole_(ctx) {
  var p = ctx.req.payload || {};
  var errs = [];
  var role = validateRole_(p, errs);
  var name = p.display_name !== undefined ? trimStr_(p.display_name) : null;
  if (name !== null && (!name || name.length > 80)) errs.push(fieldError_('display_name', name ? 'INVALID_VALUE' : 'REQUIRED'));
  var email = p.email !== undefined ? trimStr_(p.email).toLowerCase() : null;
  if (email && !EMAIL_RE_.test(email)) errs.push(fieldError_('email', 'INVALID_VALUE'));
  if (errs.length) throw validationError_(errs);
  var av = {};
  var res = executeWrite_(ctx, {
    entity_type: 'USER', entity_id: p.user_id,
    build: function () {
      var u = adminTarget_(ctx, p.user_id);
      assertUserVersion_(ctx, u);
      var lvl = Number(p.role_level);
      if (Number(u.role_level) === 4 && lvl !== 4 && u.active && !otherActiveAdmin_(u.user_id)) throw validationError_([fieldError_('role_level', 'LAST_ADMIN')]);
      var before = { role_level: Number(u.role_level), dept_codes: u.dept_codes || '', iso_secretary: !!u.iso_secretary, auditor: !!u.auditor, display_name: u.display_name, email: u.email ? 'set' : '' };
      var row = clone_(u); delete row.__row;
      row.role_level = lvl;
      row.dept_codes = role.dept_codes;
      row.iso_secretary = role.iso_secretary;
      row.auditor = role.auditor;
      if (name !== null) row.display_name = name;
      if (email !== null) row.email = email;
      av.old = u.auth_version || 0;
      row.auth_version = av.old + 1;
      av.new = row.auth_version;
      row.record_version = (u.record_version || 1) + 1;
      row.updated_at = isoVN_(now_()); row.updated_by = ctx.user.user_id;
      var writes = [{ sheet: 'Users', mode: 'update', row: row }];
      revokeUserSessions_(u.user_id, 'AUTH_VERSION');
      return {
        writes: writes, noReplay: true,
        result: { entity_type: 'USER', entity_id: u.user_id, record_version: row.record_version },
        record_version: row.record_version,
        audit: { entity_type: 'USER', entity_id: u.user_id, before_json: before, after_json: { role_level: lvl, dept_codes: role.dept_codes, iso_secretary: role.iso_secretary, auditor: role.auditor, display_name: row.display_name, email: row.email ? 'set' : '' } }
      };
    }
  });
  afterUserWrite_(p.user_id, av.old, av.new);
  return res;
}

/** Khung chung cho lock/unlock/resetPin/revokeSessions */
function userAdminOp_(ctx, kind) {
  var p = ctx.req.payload || {};
  var reason = trimStr_(p.reason);
  if (kind === 'LOCK' && !reason) throw validationError_([fieldError_('reason', 'REQUIRED')]);
  var av = {}, box = {};
  var res = executeWrite_(ctx, {
    entity_type: 'USER', entity_id: p.user_id,
    build: function () {
      var u = adminTarget_(ctx, p.user_id);
      assertUserVersion_(ctx, u);
      var row = clone_(u); delete row.__row;
      var nowIso = isoVN_(now_());
      var before, after;
      av.old = u.auth_version || 0;
      if (kind === 'LOCK') {
        if (Number(u.role_level) === 4 && u.active && !otherActiveAdmin_(u.user_id)) throw validationError_([fieldError_('user_id', 'LAST_ADMIN')]);
        row.active = false;
        before = { active: !!u.active }; after = { active: false };
      } else if (kind === 'UNLOCK') {
        // Mở khóa: bật lại tài khoản và xóa khóa do nhập sai PIN; không tăng auth_version
        row.active = true; row.failed_attempts = 0; row.failed_window_started_at = ''; row.locked_until = '';
        before = { active: !!u.active, pin_locked: !!u.locked_until }; after = { active: true, pin_locked: false };
      } else if (kind === 'RESET_PIN') {
        var pin = randomPin_(u.employee_code);
        var rec = newPinRecord_(pin);
        row.pin_hash = rec.pin_hash; row.salt = rec.salt; row.pin_hash_version = rec.pin_hash_version;
        row.must_change_pin = true;
        row.temp_pin_expires_at = isoVN_(new Date(now_().getTime() + setting_('temp_pin_hours') * 3600000));
        row.failed_attempts = 0; row.failed_window_started_at = ''; row.locked_until = '';
        box.pin = pin;
        before = { must_change_pin: !!u.must_change_pin }; after = { must_change_pin: true, temp_pin_issued: true };
      } else {
        before = { auth_version: av.old }; after = { sessions_revoked: true };
      }
      if (kind !== 'UNLOCK') row.auth_version = av.old + 1;
      av.new = row.auth_version || 0;
      row.record_version = (u.record_version || 1) + 1;
      row.updated_at = nowIso; row.updated_by = ctx.user.user_id;
      if (kind !== 'UNLOCK') revokeUserSessions_(u.user_id, 'AUTH_VERSION');
      var result = { entity_type: 'USER', entity_id: u.user_id, record_version: row.record_version };
      if (kind === 'RESET_PIN') result.temp_pin_expires_at = row.temp_pin_expires_at;
      return {
        writes: [{ sheet: 'Users', mode: 'update', row: row }], noReplay: true,
        result: result, record_version: row.record_version,
        audit: { entity_type: 'USER', entity_id: u.user_id, before_json: before, after_json: after, reason: reason }
      };
    }
  });
  afterUserWrite_(p.user_id, av.old, av.new);
  return withTempPin_(res, box);
}

function userLock_(ctx) { return userAdminOp_(ctx, 'LOCK'); }
function userUnlock_(ctx) { return userAdminOp_(ctx, 'UNLOCK'); }
function userResetPin_(ctx) { return userAdminOp_(ctx, 'RESET_PIN'); }
function userRevokeSessions_(ctx) { return userAdminOp_(ctx, 'REVOKE'); }

// ===== 21_i18n.js =====
/* 21_i18n: từ điển thuật ngữ khi dịch, gợi ý dịch, dịch bù (lấy từ M&E qua Checksheet).
 * Thuật ngữ chỉ dùng dòng active có approved_by; cả chuỗi trùng → GLOSSARY; chứa thuật ngữ → token ⟦n⟧ rồi dịch. */

/** Thuật ngữ đã duyệt, cache 600 giây (3.9) */
function glossaryTerms_() {
  if (DB_.glossary) return DB_.glossary;
  var c = cache_().get('glossary:approved');
  var list;
  if (c) {
    list = JSON.parse(c);
  } else {
    list = readRows_('Glossary').filter(function (g) {
      return g.active && g.approved_by && !g.archived_at && trimStr_(g.term_vi) && trimStr_(g.term_zh);
    }).map(function (g) { return { vi: trimStr_(g.term_vi), zh: trimStr_(g.term_zh) }; });
    try { cache_().put('glossary:approved', JSON.stringify(list), 600); } catch (e) { /* quá cỡ: đọc lại lần sau */ }
  }
  DB_.glossary = list;
  return list;
}

function normTerm_(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function escapeRe_(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Cả chuỗi trùng một thuật ngữ: trả bản đích, không thì null */
function glossaryExact_(text, src, tgt) {
  var n = normTerm_(text);
  if (!n) return null;
  var terms = glossaryTerms_();
  for (var i = 0; i < terms.length; i++) if (normTerm_(terms[i][src]) === n) return terms[i][tgt];
  return null;
}

/** Mã hiển thị, model/serial dạng mã, số kèm đơn vị: giữ nguyên qua token */
var KEEP_RE_ = /\b[A-Z]{1,6}-[0-9A-Z]{2,}(?:-[0-9A-Z]+)*\b|\d+(?:[.,]\d+)?\s?(?:kVA|kWh|kW|kg\/h|t\/h|m³\/h|m3\/h|MPa|bar|°C|Hz|mm\/s|mm|kg|dB|rpm|MΩ|V|A)(?![A-Za-z])/g;

/**
 * Dịch có thuật ngữ (2.3 quy tắc 4). Trả {text, state: 'GLOSSARY'|'MACHINE'} hoặc null khi dịch lỗi.
 * Người gọi kiểm mtEnabled_ trước khi cần dịch máy.
 */
function translateText_(text, src, tgt) {
  var exact = glossaryExact_(text, src, tgt);
  if (exact) return { text: exact, state: 'GLOSSARY' };
  var tokens = [];
  var put = function (v) { tokens.push(v); return '⟦' + (tokens.length - 1) + '⟧'; };
  var work = String(text);
  glossaryTerms_().filter(function (t) { return t[src]; })
    .sort(function (a, b) { return b[src].length - a[src].length; })
    .forEach(function (t) {
      work = work.replace(new RegExp(escapeRe_(t[src]), 'gi'), function () { return put(t[tgt]); });
    });
  work = work.replace(KEEP_RE_, function (m) { return put(m); });
  var out = mtTranslate_(work, src, tgt);
  if (!out) return null;
  // Máy dịch hay thêm "。"/"." cuối câu cho nhãn ngắn ("Kiểm tra dầu" → "检查机油。"): nguồn không có thì bỏ
  if (!/[.。!?！？…]\s*$/.test(String(text))) out = String(out).replace(/\s*[。.]\s*$/, '');
  if (!tokens.length) return { text: out, state: 'MACHINE' };
  // Thiếu hoặc thừa token → coi như dịch lỗi
  var seen = {};
  var bad = false;
  var res = out.replace(/⟦\s*(\d+)\s*⟧/g, function (m, d) {
    var i = Number(d);
    if (i >= tokens.length || seen[i]) { bad = true; return m; }
    seen[i] = true;
    return tokens[i];
  });
  if (bad || Object.keys(seen).length !== tokens.length) return null;
  return { text: res, state: 'MACHINE' };
}

/** Bảng có dịch máy (dịch bù) — trường gốc */
var MT_SHEETS_ = {
  Items: ['name', 'purpose', 'freq'], Groups: ['name'], Depts: ['name'], Clauses: ['name', 'group']
};

/**
 * Dịch một trường PENDING của một dòng và ghi (không tăng record_version, 2.3 quy tắc 8).
 * Gọi ngoài khóa ghi; ghi dưới khóa sau khi so lại bản gốc. Trả true nếu đã ghi.
 */
function fillPendingField_(sheet, r, f, actorId, opId) {
  var m = r.i18n_meta && r.i18n_meta[f];
  if (!m || m.state !== 'PENDING') return false;
  var tgt = m.src === 'vi' ? 'zh' : 'vi';
  var srcText = trimStr_(r[f + '_' + m.src]);
  if (!srcText) return false;
  var tr = translateText_(srcText, m.src, tgt);
  if (!tr) return false;
  var key = sheetSchema_(sheet).key;
  return withWriteLock_(function () {
    var rn = findRowNums_(sheet, key, r[key])[0];
    if (!rn) return false;
    var cur = readRowAt_(sheet, rn);
    if (trimStr_(cur[f + '_' + m.src]) !== srcText) return false;
    var meta = cur.i18n_meta || {};
    if (!meta[f] || meta[f].state !== 'PENDING') return false;
    meta[f] = { src: m.src, state: tr.state, at: isoVN_(now_()) };
    var st = readState_();
    var rev = Number(stateGet_(st, 'sync_revision', 0)) + 1;
    var upd = { i18n_meta: meta };
    if (sheetSchema_(sheet).cols.indexOf('sync_revision') >= 0) upd.sync_revision = rev;
    upd[f + '_' + tgt] = tr.text;
    writeCells_(sheet, rn, upd);
    var su = { sync_revision: ['INT', rev] };
    su['table_rev.' + sheet] = ['INT', rev];
    stateWrite_(st, su, actorId);
    writeAudit_({ user_id: actorId, action: 'i18n.machineTranslate', entity_type: sheet, entity_id: r[key], before_json: null, after_json: { field: f, state: tr.state }, operation_id: opId || '', auth_basis: actorId === SYSTEM_USER ? 'SYSTEM' : 'ROLE_LEVEL' });
    return true;
  });
}

/** Mỗi 3 giờ: dịch bù trường PENDING; dịch bù không tăng record_version */
function runBackgroundJobs() {
  if (prop_('MAINTENANCE_MODE') === 'true') return;
  var t0 = Date.now();
  dbReset_();
  if (!mtEnabled_()) { recordTriggerRun_('runBackgroundJobs', t0); return; }
  var done = 0;
  Object.keys(MT_SHEETS_).forEach(function (sheet) {
    if (Date.now() - t0 > 150000) return;
    readRows_(sheet).forEach(function (r) {
      if (Date.now() - t0 > 150000 || !r.i18n_meta || !mtEnabled_()) return;
      MT_SHEETS_[sheet].forEach(function (f) {
        if (fillPendingField_(sheet, r, f, SYSTEM_USER)) done++;
      });
    });
  });
  recordTriggerRun_('runBackgroundJobs', t0);
  log_('runBackgroundJobs: dịch bù ' + done + ' trường.');
}

/* ---------------- Gợi ý dịch ---------------- */

/** i18n.suggest {text, from}: trả bản dịch gợi ý, không lưu gì (form sửa biểu, bộ phận) */
function i18nSuggest_(ctx) {
  var p = ctx.req.payload || {};
  var from = p.from === 'zh' ? 'zh' : 'vi', to = from === 'vi' ? 'zh' : 'vi';
  var text = trimStr_(p.text);
  if (!text) throw validationError_([fieldError_('text', 'REQUIRED')]);
  if (text.length > 2000) throw validationError_([fieldError_('text', 'INVALID_VALUE')]);
  if (!setting_('machine_translation_enabled')) throw apiError_('FEATURE_NOT_ENABLED');
  var tr = translateText_(text, from, to);
  if (!tr) throw apiError_('SERVER_BUSY');
  return { text: tr.text, from: from, to: to, state: tr.state };
}

// ===== 23_backup.js =====
/* 23_backup: sao lưu có kiểm chứng (hằng tuần + Sao lưu ngay), lấy từ M&E.
 * Bản sao ở thư mục Backups riêng tư: <yyyy-mm-dd_HHmm>/ gồm 2 spreadsheet + manifest.json.
 * ScriptProperties không nằm trong bản sao. Không chép ảnh. Khôi phục làm thủ công (hỏi người code). */

/** Sheet ghi không qua sync_revision (đăng nhập, phiên): không dùng để kiểm chứng số dòng */
var BACKUP_VOLATILE_ = { AuthAttempts: 1, Sessions: 1, AuditLogs: 1, Operations: 1 };

function backupRoot_() {
  var id = prop_('DRIVE_BACKUP_FOLDER_ID');
  if (!id) throw new Error('Chưa có DRIVE_BACKUP_FOLDER_ID');
  return DriveApp.getFolderById(id);
}

/** Số dòng dữ liệu (trừ tiêu đề) từng sheet đã biết của một spreadsheet */
function countRows_(ss, out) {
  ss.getSheets().forEach(function (sh) {
    if (SHEETS[sh.getName()]) out[sh.getName()] = Math.max(0, sh.getLastRow() - 1);
  });
  return out;
}

function backupStamp_(d) {
  var iso = isoVN_(d);
  return iso.slice(0, 10) + '_' + iso.slice(11, 13) + iso.slice(14, 16);
}

/** Đọc manifest.json của một thư mục sao lưu, null nếu không có/hỏng */
function readManifest_(folder) {
  var it = folder.getFilesByName('manifest.json');
  if (!it.hasNext()) return null;
  try { return JSON.parse(it.next().getBlob().getDataAsString()); } catch (e) { return null; }
}

/** Danh sách thư mục sao lưu, mới nhất trước: [{folder, name, manifest}] */
function listBackups_() {
  var out = [];
  var it = backupRoot_().getFolders();
  while (it.hasNext()) {
    var f = it.next();
    if (!/^\d{4}-\d{2}-\d{2}_\d{4}/.test(f.getName())) continue;
    out.push({ folder: f, name: f.getName(), manifest: readManifest_(f) });
  }
  out.sort(function (a, b) { return a.name < b.name ? 1 : a.name > b.name ? -1 : 0; });
  return out;
}

/** Trigger chạy một lần của backupData (Sao lưu ngay, chạy lại sau INCONSISTENT) */
function oneShotIds_() {
  try { return JSON.parse(prop_('BACKUP_ONESHOT_IDS') || '[]'); } catch (e) { return []; }
}
function scheduleBackupOnce_(afterMs) {
  var t = ScriptApp.newTrigger('backupData').timeBased().after(afterMs).create();
  var ids = oneShotIds_();
  ids.push(t.getUniqueId());
  setProp_('BACKUP_ONESHOT_IDS', JSON.stringify(ids));
  return t.getUniqueId();
}
function clearOneShotTriggers_() {
  var ids = oneShotIds_();
  if (!ids.length) return;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'backupData' && ids.indexOf(t.getUniqueId()) >= 0) ScriptApp.deleteTrigger(t);
  });
  setProp_('BACKUP_ONESHOT_IDS', '[]');
}

/**
 * Trigger hằng tuần và "Sao lưu ngay" (6.5.4). Chạy được cả khi bảo trì (thủ tục khôi phục bước 2).
 * VERIFIED: số dòng bản sao khớp và sync_revision không đổi; INCONSISTENT: có ghi trong lúc chép (chạy lại một lần sau 15 phút);
 * FAILED: lỗi hoặc số dòng lệch khi không có ghi.
 */
function backupData() {
  var t0 = Date.now();
  try { return backupDataRun_(); } finally { recordTriggerRun_('backupData', t0); }
}

function backupDataRun_() {
  clearOneShotTriggers_();
  var isRetry = prop_('BACKUP_RETRY_PENDING') === 'true';
  if (isRetry) delProp_('BACKUP_RETRY_PENDING');
  dbReset_();
  var started = now_();
  var stamp = backupStamp_(started);
  var root = backupRoot_();
  var folder = root.createFolder(stamp);
  // Mọi bước sau khi có thư mục đều trong try: lỗi gì cũng ghi được manifest FAILED kèm lý do
  var manifest = {
    app_id: APP_ID, created_at: isoVN_(started), folder: stamp, server_version: SERVER_VERSION, retry: isRetry,
    status: 'FAILED', consistent: false, counts: {}, copied_counts: {}, files: {}
  };
  try {
    var st0 = readState_();
    var rev0 = Number(stateGet_(st0, 'sync_revision', 0));
    var bizId = prop_('BUSINESS_SPREADSHEET_ID'), secId = prop_('SECURITY_SPREADSHEET_ID');
    manifest.env = envName_();
    manifest.schema_version = stateGet_(st0, 'schema_version', SCHEMA_VERSION);
    manifest.dataset_epoch = sysProps_().dataset_epoch;
    manifest.sync_revision = rev0;
    countRows_(SpreadsheetApp.openById(bizId), manifest.counts);
    countRows_(SpreadsheetApp.openById(secId), manifest.counts);
    manifest.documents = manifest.counts.Documents || 0;
    var bizCopy = DriveApp.getFileById(bizId).makeCopy(NAME_PREFIX + 'NghiepVu_' + stamp, folder);
    var secCopy = DriveApp.getFileById(secId).makeCopy(NAME_PREFIX + 'BaoMat_' + stamp, folder);
    manifest.files = { business: bizCopy.getId(), security: secCopy.getId() };
    countRows_(SpreadsheetApp.openById(bizCopy.getId()), manifest.copied_counts);
    countRows_(SpreadsheetApp.openById(secCopy.getId()), manifest.copied_counts);
    dbReset_();
    var rev1 = Number(stateGet_(readState_(), 'sync_revision', 0));
    manifest.sync_revision_end = rev1;
    var mismatch = Object.keys(manifest.counts).filter(function (k) {
      return !BACKUP_VOLATILE_[k] && manifest.counts[k] !== manifest.copied_counts[k];
    });
    manifest.mismatch = mismatch;
    if (rev1 !== rev0) manifest.status = 'INCONSISTENT';
    else manifest.status = mismatch.length ? 'FAILED' : 'VERIFIED';
    manifest.consistent = manifest.status === 'VERIFIED';
  } catch (e) {
    manifest.status = 'FAILED';
    manifest.error = String(e && e.message || e).slice(0, 200);
  }
  manifest.finished_at = isoVN_(now_());
  folder.createFile(Utilities.newBlob(JSON.stringify(manifest, null, 2), 'application/json', 'manifest.json'));
  withWriteLock_(function () {
    var st = readState_();
    stateWrite_(st, {
      last_backup_at: ['DATETIME', manifest.created_at], last_backup_ref: ['STRING', stamp], last_backup_status: ['ENUM', manifest.status]
    }, SYSTEM_USER);
  });
  cache_().remove('sys:state');
  if (manifest.status === 'INCONSISTENT' && !isRetry) {
    setProp_('BACKUP_RETRY_PENDING', 'true');
    scheduleBackupOnce_(15 * 60000);
  }
  var trashed = pruneBackups_();
  log_('backupData: ' + stamp + ' → ' + manifest.status + (trashed ? '; đã chuyển ' + trashed + ' bản cũ vào thùng rác' : '') + '.');
  return manifest;
}

/** Giữ backup_keep_count bản VERIFIED mới nhất; thư mục cũ hơn bản giữ cuối cùng vào thùng rác (chỉ trong Backups) */
function pruneBackups_() {
  var keep = Number(setting_('backup_keep_count') || 8);
  var list = listBackups_();
  var verified = list.filter(function (b) { return b.manifest && b.manifest.status === 'VERIFIED'; });
  if (verified.length <= keep) return 0;
  var cut = verified[keep - 1].name;
  var n = 0;
  list.forEach(function (b) {
    if (b.name >= cut) return;
    var it = b.folder.getFiles();
    while (it.hasNext()) it.next().setTrashed(true);
    b.folder.setTrashed(true);
    n++;
  });
  return n;
}

/* ---------------- Action ---------------- */

/** backup.view: danh sách bản, trạng thái kiểm chứng, lần gần nhất, đang chờ chạy (C4) */
/** Bản sao lưu mất bao lâu tối đa (thời hạn trigger 6 phút + dư) trước khi coi thư mục không manifest là thất bại */
var BACKUP_RUNNING_MS_ = 30 * 60000;

/** Thư mục chưa có manifest.json: đang chạy nếu tạo chưa quá 30 phút, quá thì thất bại (trigger bị dừng giữa chừng) */
function backupRunningRef_(b, nowMs) {
  if (b.manifest) return false;
  var n = b.name;
  var t = Date.parse(n.slice(0, 10) + 'T' + n.slice(11, 13) + ':' + n.slice(13, 15) + ':00+07:00');
  return !isNaN(t) && nowMs - t < BACKUP_RUNNING_MS_;
}

function backupView_(ctx) {
  var st = readState_();
  var nowMs = now_().getTime();
  var running = false;
  var items = listBackups_().slice(0, 30).map(function (b) {
    var m = b.manifest || {};
    var total = 0;
    Object.keys(m.counts || {}).forEach(function (k) { if (!BACKUP_VOLATILE_[k]) total += m.counts[k]; });
    var isRunning = backupRunningRef_(b, nowMs);
    if (isRunning) running = true;
    return {
      ref: b.name, created_at: m.created_at || '', finished_at: m.finished_at || '', status: isRunning ? 'RUNNING' : (m.status || 'FAILED'), consistent: !!m.consistent,
      schema_version: m.schema_version || '', rows: total, documents: m.documents || 0, retry: !!m.retry,
      error: m.error || (b.manifest || isRunning ? '' : 'NO_MANIFEST'), mismatch: m.mismatch || []
    };
  });
  return {
    items: items, queued: oneShotIds_().length > 0, running: running,
    last_backup_at: stateGet_(st, 'last_backup_at', ''), last_backup_ref: stateGet_(st, 'last_backup_ref', ''), last_backup_status: stateGet_(st, 'last_backup_status', ''),
    last_restore_at: stateGet_(st, 'last_restore_at', ''), restored_from_ref: stateGet_(st, 'restored_from_ref', ''),
    backup_weekday: setting_('backup_weekday'), backup_hour: setting_('backup_hour'), keep_count: setting_('backup_keep_count')
  };
}

/** backup.run: tạo trigger chạy một lần cho backupData, trả QUEUED (C4, PIN) */
function backupRun_(ctx) {
  if (oneShotIds_().length) return { status: 'QUEUED', already: true };
  var nowMs = now_().getTime();
  if (listBackups_().some(function (b) { return backupRunningRef_(b, nowMs); })) return { status: 'QUEUED', already: true };
  withWriteLock_(function () {
    scheduleBackupOnce_(1000);
    writeAudit_({ user_id: ctx.user.user_id, device_id: ctx.req.device_id, action: 'backup.run', entity_type: 'BACKUP', entity_id: '',
      before_json: null, after_json: { status: 'QUEUED' }, operation_id: ctx.req.operation_id || '', auth_basis: authBasis_(ctx) });
  });
  return { status: 'QUEUED', already: false };
}


// ===== 24_system.js =====
/* 24_system: nhật ký thao tác, cấu hình, trạng thái hệ thống (lấy từ M&E qua Checksheet) */

/* ---------------- Nhật ký thao tác ---------------- */

function projectAudit_(ctx, a, dir) {
  var o = {
    audit_id: a.audit_id, occurred_at: a.occurred_at, user_id: a.user_id, action: a.action, entity_type: a.entity_type, entity_id: a.entity_id,
    before_json: a.before_json || null, after_json: a.after_json || null, reason: a.reason || '', operation_id: a.operation_id || '',
    auth_basis: a.auth_basis || ''
  };
  var u = dir[a.user_id];
  o.user_name = u ? u.employee_code + ' · ' + u.display_name : a.user_id;
  return o;
}

/** audit.own: nhật ký thao tác và trạng thái đồng bộ (Operations) của chính mình */
function auditOwn_(ctx) {
  var uid = ctx.user.user_id;
  var dir = userDirectory_();
  var logs = findAll_('AuditLogs', 'user_id', uid).sort(function (a, b) { return String(b.occurred_at).localeCompare(String(a.occurred_at)); })
    .slice(0, 200).map(function (a) { return projectAudit_(ctx, a, dir); });
  var ops = findAll_('Operations', 'user_id', uid).sort(function (a, b) { return String(b.received_at).localeCompare(String(a.received_at)); })
    .slice(0, 100).map(function (o) {
      return { operation_id: o.operation_id, action: o.action, entity_type: o.entity_type, entity_id: o.entity_id, state: o.state, result_code: o.result_code, received_at: o.received_at, committed_at: o.committed_at };
    });
  return { items: logs, operations: ops };
}

var ADMIN_ACTION_PREFIX_ = ['user.', 'auth.', 'session.', 'pin.', 'settings.', 'system.', 'backup.', 'dept.', 'report.logo', 'sample.'];

/** audit.view {entity_id?, user_id?, action?, from?, to?, limit?}: Trưởng bộ phận, Quản trị (Trưởng bộ phận không xem thao tác quản trị) */
function auditView_(ctx) {
  var p = ctx.req.payload || {};
  var lvl = Number(ctx.user.role_level);
  var dir = userDirectory_();
  var limit = Math.min(500, Number(p.limit) || 200);
  var from = p.from && isDateStr_(p.from) ? p.from : '', to = p.to && isDateStr_(p.to) ? p.to : '';
  var items = [];
  var rows = readRows_('AuditLogs');
  for (var i = rows.length - 1; i >= 0 && items.length < limit; i--) {
    var a = rows[i];
    var act = String(a.action || '');
    if (lvl < 4 && ADMIN_ACTION_PREFIX_.some(function (x) { return act.indexOf(x) === 0; })) continue;
    if (p.entity_id && a.entity_id !== p.entity_id) continue;
    if (p.user_id && a.user_id !== p.user_id) continue;
    if (p.action && act.indexOf(p.action) !== 0) continue;
    var day = String(a.occurred_at).slice(0, 10);
    if (from && day < from) continue;
    if (to && day > to) continue;
    items.push(projectAudit_(ctx, a, dir));
  }
  items.sort(function (x, y) { return String(y.occurred_at).localeCompare(String(x.occurred_at)); });
  return { items: items, more: items.length >= limit };
}

/* ---------------- Cấu hình ---------------- */

/** Khóa không sửa trong màn Cấu hình (logo sửa ở màn riêng) */
var SETTINGS_READONLY_ = { report_logo_file_id: 1, report_logo_rev: 1 };
var SETTINGS_BOUNDS_ = {
  session_days: [1, 90], session_warn_days: [0, 30], change_pin_session_minutes: [5, 60], reauth_window_minutes: [1, 30], temp_pin_hours: [1, 168],
  max_sessions_per_user: [1, 50], login_fail_limit: [3, 20], login_fail_window_minutes: [1, 120], login_lock_minutes: [1, 1440],
  login_global_fail_limit: [5, 1000], login_global_window_minutes: [1, 120], login_global_pause_minutes: [1, 1440], auth_attempts_retention_days: [7, 3650],
  offline_unlock_attempts: [3, 20], offline_lock_minutes: [1, 1440], offline_max_lockouts: [1, 10], offline_pbkdf2_iterations: [150000, 2000000],
  offline_probe_seconds: [3, 30], mt_chunk_chars: [200, 5000], mt_max_fields_per_request: [1, 100], mt_sync_budget_seconds: [1, 20], mt_daily_budget: [0, 100000],
  client_timeout_seconds: [10, 60], client_long_timeout_seconds: [20, 300],
  sync_page_size: [100, 2000], doc_max_bytes: [1048576, 52428800], doc_mobile_upload_max_bytes: [1048576, 52428800],
  photo_max_edge_px: [640, 4096], photo_jpeg_quality: [0.5, 0.95], photo_thumb_edge_px: [120, 1024], backup_hour: [0, 23], backup_keep_count: [2, 52],
  doc_review_months: [1, 60], record_grace_days: [0, 60]
};
var SETTINGS_ENUMS_ = {
  backup_weekday: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
};

function settingsList_() {
  var s = settings_();
  return SETTINGS_DEFAULTS.filter(function (d) { return d[4] <= RELEASED_DOT; }).map(function (d) {
    return {
      key: d[0], type: d[1], value: s[d[0]], default_value: d[2], client: !!d[3], description_vi: d[5], description_zh: d[6],
      readonly: !!SETTINGS_READONLY_[d[0]], bounds: SETTINGS_BOUNDS_[d[0]] || null, options: SETTINGS_ENUMS_[d[0]] || null
    };
  });
}

/** Chuẩn hóa và kiểm một giá trị Settings; ném VALIDATION_ERROR */
function parseSettingInput_(def, v) {
  var key = def[0], type = def[1];
  var bad = function () { return validationError_([fieldError_(key, 'INVALID_VALUE')]); };
  if (type === 'INT' || type === 'NUMBER') {
    var n = Number(v);
    if (v === '' || v === null || !isFinite(n) || (type === 'INT' && Math.floor(n) !== n)) throw bad();
    var b = SETTINGS_BOUNDS_[key];
    if (b && (n < b[0] || n > b[1])) throw bad();
    return n;
  }
  if (type === 'BOOL') { if (typeof v !== 'boolean') throw bad(); return v; }
  if (type === 'ENUM') { if ((SETTINGS_ENUMS_[key] || []).indexOf(v) < 0) throw bad(); return v; }
  if (type === 'JSON') {
    var arr;
    try { arr = typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { throw bad(); }
    if (!Array.isArray(arr)) throw bad();
    return arr;
  }
  var s = trimStr_(v);
  if (key === 'app_base_url' && s && !/^https:\/\/[^\s]+\/$/.test(s)) throw bad();
  if (key === 'min_client_version' && !/^\d+\.\d+\.\d+$/.test(s)) throw bad();
  if (key === 'records_start_date' && s && !isDateStr_(s)) throw bad();
  if (s.length > 500) throw bad();
  return s;
}

function writeSetting_(key, value, by) {
  var def = SETTINGS_DEFAULTS.filter(function (d) { return d[0] === key; })[0];
  var cell = def[1] === 'JSON' ? JSON.stringify(value) : (def[1] === 'BOOL' ? (value ? 'true' : 'false') : String(value));
  var rn = findRowNums_('Settings', 'setting_key', key)[0];
  var nowIso = isoVN_(now_());
  if (rn) writeCells_('Settings', rn, { value: cell, updated_at: nowIso, updated_by: by });
  else insertRows_('Settings', [Object.assign(settingRow_(def), { value: cell, updated_by: by })]);
  // Cài đặt gửi xuống app nằm trong bootstrap: tăng mốc để app tải lại
  var st = readState_();
  var rev = Number(stateGet_(st, 'sync_revision', 0)) + 1;
  stateWrite_(st, { sync_revision: ['INT', rev], 'table_rev.Settings': ['INT', rev], settings_rev: ['INT', rev] }, by);
  cache_().remove('cfg:settings');
  DB_.settings = null;
}

/** settings.edit {changes: {key: value}, reason} — Quản trị, PIN */
function settingsEdit_(ctx) {
  var p = ctx.req.payload || {};
  var changes = p.changes && typeof p.changes === 'object' ? p.changes : null;
  if (!changes || !Object.keys(changes).length) throw validationError_([fieldError_('changes', 'REQUIRED')]);
  var parsed = {};
  var errs = [];
  Object.keys(changes).forEach(function (k) {
    var def = SETTINGS_DEFAULTS.filter(function (d) { return d[0] === k; })[0];
    if (!def || def[4] > RELEASED_DOT || SETTINGS_READONLY_[k]) { errs.push(fieldError_(k, 'INVALID_VALUE')); return; }
    try { parsed[k] = parseSettingInput_(def, changes[k]); } catch (e) { errs.push(fieldError_(k, 'INVALID_VALUE')); }
  });
  if (parsed.client_long_timeout_seconds !== undefined || parsed.client_timeout_seconds !== undefined) {
    var shortT = parsed.client_timeout_seconds !== undefined ? parsed.client_timeout_seconds : setting_('client_timeout_seconds');
    var longT = parsed.client_long_timeout_seconds !== undefined ? parsed.client_long_timeout_seconds : setting_('client_long_timeout_seconds');
    if (longT < shortT) errs.push(fieldError_('client_long_timeout_seconds', 'INVALID_VALUE'));
  }
  if (errs.length) throw validationError_(errs);
  var before = {};
  Object.keys(parsed).forEach(function (k) { before[k] = setting_(k); });
  withWriteLock_(function () {
    Object.keys(parsed).forEach(function (k) { writeSetting_(k, parsed[k], ctx.user.user_id); });
    writeAudit_({ user_id: ctx.user.user_id, device_id: ctx.req.device_id, action: 'settings.edit', entity_type: 'SETTINGS', entity_id: Object.keys(parsed).join(','),
      before_json: before, after_json: parsed, operation_id: ctx.req.operation_id || '', reason: trimStr_(p.reason).slice(0, 300), auth_basis: authBasis_(ctx) });
  });
  cache_().remove('cfg:settings');
  DB_.settings = null;
  if (['backup_weekday', 'backup_hour'].some(function (k) { return parsed[k] !== undefined && parsed[k] !== before[k]; })) {
    try { installTriggers(); } catch (e) { console.warn('installTriggers ' + (e && e.message)); }
  }
  return { settings: settingsList_() };
}

/* ---------------- Trạng thái hệ thống (healthCheck) ---------------- */

/** Ghi thời gian chạy trigger (24 giờ gần nhất) để healthCheck báo tổng phút */
function recordTriggerRun_(fn, startMs) {
  try {
    var now = Date.now();
    var list = JSON.parse(prop_('TRIGGER_RUNS') || '[]').filter(function (r) { return now - r.s < 86400000; });
    list.push({ f: fn, s: startMs, ms: now - startMs });
    setProp_('TRIGGER_RUNS', JSON.stringify(list.slice(-80)));
  } catch (e) { /* không chặn trigger */ }
}

var TEMP_PROP_KEYS_ = ['SETUP_OWNER_CODE', 'SETUP_OWNER_NAME', 'SETUP_OWNER_TEMP_PIN', 'OWNER_RESET_TEMP_PIN'];
var TEST_PROP_KEYS_ = ['TEST_TODAY', 'TEST_SESSION_SECONDS', 'TEST_MT_FAIL'];

/** Kết quả kiểm tra: [{key, status: 'OK'|'WARN', value, note}] */
function healthRows_() {
  var rows = [];
  var add = function (key, ok, value, note) { rows.push({ key: key, status: ok ? 'OK' : 'WARN', value: value === undefined ? '' : value, note: note || '' }); };
  dbReset_();
  var st = readState_();
  var props = sysProps_();
  add('schema_version', String(stateGet_(st, 'schema_version', '')) === SCHEMA_VERSION, stateGet_(st, 'schema_version', ''), SCHEMA_VERSION);
  add('server_version', true, SERVER_VERSION);
  add('dataset_epoch', !!props.dataset_epoch, String(props.dataset_epoch || '').slice(0, 8));
  add('env', true, envName_());
  var leftover = TEMP_PROP_KEYS_.concat(isTestEnv_() ? [] : TEST_PROP_KEYS_).filter(function (k) { return prop_(k) !== null && prop_(k) !== ''; });
  add('temp_props', !leftover.length, leftover.join(', '), leftover.length ? 'Xóa ở Cài đặt dự án → Thuộc tính tập lệnh' : '');
  add('maintenance', !props.maintenance_mode, props.maintenance_mode ? 'ON' : 'OFF');
  var trig = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  var missing = TRIGGER_FUNCS_.filter(function (f) { return trig.indexOf(f) < 0; });
  add('triggers', !missing.length, trig.join(', '), missing.length ? 'Thiếu: ' + missing.join(', ') + ' — chạy installTriggers' : '');
  var runs = [];
  try { runs = JSON.parse(prop_('TRIGGER_RUNS') || '[]'); } catch (e) { runs = []; }
  var minutes = Math.round(runs.filter(function (r) { return Date.now() - r.s < 86400000; }).reduce(function (s, r) { return s + r.ms; }, 0) / 600) / 100;
  add('trigger_minutes_24h', minutes < 90, minutes);
  var items = readRows_('Items');
  add('items', items.length > 0, items.length, items.length ? '' : 'Excel → Nhập file Excel tổng');
  var cls = readRows_('Clauses').filter(function (c) { return c.active; });
  var iso = cls.filter(function (c) { return c.std === 'ISO9001'; }).length, brc = cls.length - iso;
  add('clauses', iso > 0 && brc > 0, 'ISO 9001: ' + iso + ' · BRCGS: ' + brc, iso && brc ? '' : 'Nhập file Excel tổng (sheet Phủ ISO 9001, Phủ BRCGS)');
  var heads = readRows_('Depts').filter(function (d) { return d.active; });
  var noHead = heads.filter(function (d) { return !d.head_user_id; }).map(function (d) { return d.dept_code; });
  add('dept_heads', !noHead.length, (heads.length - noHead.length) + ' / ' + heads.length, noHead.length ? 'Chưa có trưởng bộ phận: ' + noHead.join(', ') : '');
  var owners = readRows_('Users').filter(function (u) { return u.active && (u.iso_secretary || Number(u.role_level) === 4); });
  var hasSec = readRows_('Users').some(function (u) { return u.active && u.iso_secretary; });
  add('iso_secretary', hasSec, owners.length, hasSec ? '' : 'Chưa có Thư ký ISO: Tài khoản → Quản trị → Người dùng → cờ Thư ký ISO');
  var lb = stateGet_(st, 'last_backup_at', ''), lbs = stateGet_(st, 'last_backup_status', '');
  var lbt = parseTime_(lb);
  add('last_backup', lbs === 'VERIFIED' && lbt && now_().getTime() - lbt.getTime() < 8 * 86400000, (lb ? lb.slice(0, 16).replace('T', ' ') : '') + (lbs ? ' · ' + lbs : ''), stateGet_(st, 'last_backup_ref', ''));
  var mtp = parseTime_(stateGet_(st, 'mt_paused_until', ''));
  add('mt_paused_until', !(mtp && mtp.getTime() > now_().getTime()), stateGet_(st, 'mt_paused_until', ''));
  var lpu = parseTime_(stateGet_(st, 'login_paused_until', ''));
  add('login_paused_until', !(lpu && lpu.getTime() > now_().getTime()), stateGet_(st, 'login_paused_until', ''));
  var base = String(setting_('app_base_url') || '');
  add('app_base_url', !!base, base, base ? '' : 'Chưa điền app_base_url');
  add('report_logo', true, setting_('report_logo_rev') ? 'ON' : 'OFF');
  var cells = 0;
  [prop_('BUSINESS_SPREADSHEET_ID'), prop_('SECURITY_SPREADSHEET_ID')].forEach(function (id) {
    if (!id) return;
    SpreadsheetApp.openById(id).getSheets().forEach(function (s) { cells += s.getMaxRows() * s.getMaxColumns(); });
  });
  add('spreadsheet_cells', cells < 5000000, cells);
  return rows;
}

/** Chạy từ trình soạn: in kết quả kiểm tra */
function healthCheck() {
  var rows = healthRows_();
  rows.forEach(function (r) { log_((r.status === 'OK' ? 'ĐẠT     ' : 'CẢNH BÁO') + '  ' + r.key + ': ' + r.value + (r.note ? ' (' + r.note + ')' : '')); });
  return rows;
}

/** system.status (Quản trị): kết quả healthCheck + Settings */
function systemStatus_(ctx) {
  dbReset_();
  return { checks: healthRows_(), settings: settingsList_(), checked_at: isoVN_(now_()) };
}

// ===== 25_logo.js =====
/* 25_logo: logo công ty trên báo cáo (lấy từ Checksheet d1.1 / M&E d4.11).
 * Tệp riêng tư trong thư mục dữ liệu app trên Drive của tài khoản máy chủ ISO; Settings giữ ID tệp và mã phiên bản.
 * Quản trị tải lên / gỡ trong app. Báo cáo PDF (Đợt 2) đặt logo ở đầu trang; Excel dựng trên máy chèn logo ở ô A1. */

function fmtDateVN_(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
}

/** Nhãn hai thứ tiếng từ từ điển của app (i18n/labels.json chép vào Code.gs lúc build) */
function lab_(key, vars) {
  var p = LABELS[key] || [key, key];
  var vi = p[0], zh = p[1];
  if (vars) Object.keys(vars).forEach(function (k) { vi = vi.split('{' + k + '}').join(vars[k]); zh = zh.split('{' + k + '}').join(vars[k]); });
  return vi + ' · ' + zh;
}

var REPORT_LOGO_MAX_BYTES_ = 1048576;
/* ---------------- Logo báo cáo ---------------- */

/** Tệp logo đang dùng (Blob) hoặc null khi chưa có / tệp đã mất */
function reportLogoBlob_() {
  var id = setting_('report_logo_file_id');
  if (!id) return null;
  try {
    var f = DriveApp.getFileById(String(id));
    if (f.isTrashed()) return null;
    return f.getBlob();
  } catch (e) { return null; }
}

function reportLogoRev_() { return String(setting_('report_logo_rev') || ''); }

/** report.logo.get: logo cho bản xem trước và Excel trên máy ({rev: ''} khi chưa có) */
function reportLogoGet_(ctx) {
  var b = reportLogoBlob_();
  if (!b) return { rev: '' };
  return { rev: reportLogoRev_(), mime_type: b.getContentType(), content_b64: b64_(b.getBytes()) };
}

/**
 * report.logo.set {content_b64, mime_type: image/png | image/jpeg} hoặc {remove: true} — C4, PIN.
 * Ảnh ≤ 1 MB (app thu nhỏ trước khi gửi); cùng nội dung với logo đang dùng → trả luôn, không tạo tệp mới.
 */
function reportLogoSet_(ctx) {
  var p = ctx.req.payload || {};
  var by = ctx.user.user_id;
  var oldId = String(setting_('report_logo_file_id') || '');
  var before = { rev: reportLogoRev_() };
  var audit = function (after) {
    writeAudit_({ user_id: by, device_id: ctx.req.device_id, action: 'report.logo.set', entity_type: 'SETTINGS', entity_id: 'report_logo',
      before_json: before, after_json: after, operation_id: ctx.req.operation_id || '', auth_basis: authBasis_(ctx) });
  };
  if (p.remove === true) {
    withWriteLock_(function () {
      writeSetting_('report_logo_file_id', '', by);
      writeSetting_('report_logo_rev', '', by);
      audit({ rev: '' });
    });
    if (oldId) { try { trashQuietly_(DriveApp.getFileById(oldId)); } catch (e) { /* bỏ qua */ } }
    return { rev: '' };
  }
  var errs = [];
  if (p.mime_type !== 'image/png' && p.mime_type !== 'image/jpeg') errs.push(fieldError_('mime_type', 'FILE_TYPE'));
  if (typeof p.content_b64 !== 'string' || !p.content_b64) errs.push(fieldError_('content_b64', 'REQUIRED'));
  if (errs.length) throw validationError_(errs);
  var bytes;
  try { bytes = b64d_(p.content_b64); } catch (e) { throw validationError_([fieldError_('content_b64', 'INVALID_VALUE')]); }
  if (!bytes.length) throw validationError_([fieldError_('content_b64', 'REQUIRED')]);
  if (bytes.length > REPORT_LOGO_MAX_BYTES_) throw validationError_([fieldError_('content_b64', 'FILE_TOO_LARGE')]);
  if (!magicOk_(bytes, p.mime_type)) throw validationError_([fieldError_('mime_type', 'FILE_TYPE')]);
  var rev = b64url_(sha256_(bytes)).slice(0, 16);
  if (rev === before.rev && reportLogoBlob_()) return { rev: rev };
  var file = appFolder_().createFile(Utilities.newBlob(bytes, p.mime_type, 'report-logo.' + DOC_MIME_[p.mime_type].ext));
  try {
    withWriteLock_(function () {
      writeSetting_('report_logo_file_id', file.getId(), by);
      writeSetting_('report_logo_rev', rev, by);
      audit({ rev: rev, bytes: bytes.length, mime_type: p.mime_type });
    });
  } catch (e) {
    trashQuietly_(file);
    throw e;
  }
  if (oldId && oldId !== file.getId()) { try { trashQuietly_(DriveApp.getFileById(oldId)); } catch (e2) { /* bỏ qua */ } }
  return { rev: rev };
}

// ===== 26_sample.js =====
/* 26_sample: dữ liệu mẫu cho máy chủ THỬ (owner, PIN): ~25 biểu giả ở 10 bộ phận, điều khoản mẫu, 4 tài khoản mẫu.
 * Không phải danh mục thật (file Excel tổng không lên repo public). Dòng mẫu đi qua đúng bộ chuẩn hóa của nhập Excel. */

/** [B mã, C tên Việt, tên Trung, E mã bộ phận, F nhóm, G ISO 9001, K BRCGS, N tần suất, R nơi làm, T tình trạng, U lần, V ngày, W chu kỳ, Q ưu tiên, Z ghi chú] */
var SAMPLE_ITEMS_ = [
  ['BM-ISO-02-01', 'Danh mục tài liệu nội bộ', '内部文件清单', 'ISO', '02. Kiểm soát tài liệu · 文件控制', '7.5.3', 'Kiểm soát tài liệu', 'Khi phát sinh\n发生时', 'MANUAL', '●', '1', '2026-01-05', '', 1, ''],
  ['BM-ISO-02-04', 'Danh mục hồ sơ & thời gian lưu', '记录清单及保存期限', 'ISO', '02. Kiểm soát tài liệu · 文件控制', '7.5.3', 'Kiểm soát tài liệu', 'Hằng năm\n每年', 'MANUAL', '●', '1', '2026-01-05', 366, 1, ''],
  ['QT-ISO-01', 'Quy trình kiểm soát tài liệu', '文件控制程序', 'ISO', '02. Kiểm soát tài liệu · 文件控制', '7.5', '', '', 'MANUAL', '●', '2', '2025-12-01', '', '', ''],
  ['BM-ISO-03-01', 'Chương trình đánh giá nội bộ năm', '年度内部审核方案', 'ISO', '03. Đánh giá nội bộ · 内部审核', '9.2', 'Đánh giá nội bộ', 'Hằng năm\n每年', 'MANUAL', '○', '', '', 366, 1, ''],
  ['BM-ISO-04-02', 'Sổ theo dõi khắc phục', '纠正措施跟踪表', 'ISO', '04. Khắc phục · 纠正措施', '10.2', 'Hành động khắc phục', 'Hằng tuần\n每周', 'MANUAL', '◐', '', '', 7, 1, ''],
  ['BM-ISO-05-01', 'Đầu vào xem xét lãnh đạo', '管理评审输入', 'ISO', '05. Xem xét lãnh đạo · 管理评审', '9.3', 'Xem xét lãnh đạo', 'Hằng năm\n每年', 'MANUAL', '○', '', '', 366, 1, ''],
  ['BM-KD-01-04', 'Sổ theo dõi đơn hàng & giao hàng', '订单及交货跟踪表', 'KD', '01. Đơn hàng · 订单', '8.2.3; 8.5.5', 'Yêu cầu khách hàng', 'Hằng tuần\n每周', 'MANUAL', '●', '1', '2026-02-10', 7, '', ''],
  ['BM-KD-02-01', 'Phiếu tiếp nhận khiếu nại', '客户投诉登记表', 'KD', '02. Khiếu nại · 投诉', '9.1.2; 10.2', 'Khiếu nại khách hàng', 'Khi phát sinh\n发生时', 'MANUAL', '○', '', '', '', 1, ''],
  ['BM-CB-01-02', 'Phiếu duyệt bản in mẫu', '样稿审批单', 'CB', '01. Chế bản · 制版', '8.3.4', 'Kiểm soát in ấn', 'Mỗi đơn hàng\n每个订单', 'MANUAL', '●', '2', '2026-03-01', '', 2, ''],
  ['BM-SX-01-01', 'Kế hoạch sản xuất tuần/ngày', '周/日生产计划', 'SX', '01. Kế hoạch · 计划', '8.1; 8.5.1', '', 'Hằng ngày\n每天', 'MANUAL', '●', '1', '2026-01-20', 1, '', ''],
  ['BM-SX-02-01', 'Báo cáo sản xuất ca', '班次生产报告', 'SX', '02. Sản xuất · 生产', '8.5.1', 'Kiểm soát quá trình', 'Mỗi ca\n每班', 'MANUAL', '●', '1', '2026-01-20', 1, '', 'Thời gian dừng máy lấy từ sổ dừng máy BM-CĐ-04-03 (M&E)'],
  ['BM-SX-02-03', 'Sổ phế phẩm & giấy hư', '废品及废纸记录', 'SX', '02. Sản xuất · 生产', '8.7', 'Sản phẩm không phù hợp', 'Mỗi ca\n每班', 'MANUAL', '◐', '', '', 1, 2, ''],
  ['BM-CL-01-01', 'Phiếu kiểm tra đầu vào', '来料检验单', 'CL', '01. Kiểm tra · 检验', '8.4.2; 8.6', 'Kiểm soát nguyên liệu', 'Mỗi lô\n每批', 'MANUAL', '●', '1', '2026-02-01', '', '', ''],
  ['BM-CL-04-01', 'Phiếu sản phẩm không phù hợp', '不合格品处理单', 'CL', '04. Không phù hợp · 不合格', '8.7', 'Sản phẩm không phù hợp', 'Khi phát sinh\n发生时', 'MANUAL', '○', '', '', '', 1, ''],
  ['BM-CL-05-02', 'Theo dõi hiệu chuẩn dụng cụ đo', '量具校准跟踪表', 'CL', '05. Hiệu chuẩn · 校准', '7.1.5', 'Hiệu chuẩn', 'Hằng năm\n每年', 'ME_PART', '●', '1', '2026-02-01', 366, '', ''],
  ['BM-MH-01-06', 'Phiếu yêu cầu khắc phục nhà cung cấp (SCAR)', '供应商纠正措施要求', 'MH', '01. Nhà cung cấp · 供应商', '8.4.1; 10.2', 'Quản lý nhà cung cấp', 'Khi phát sinh\n发生时', 'MANUAL', '○', '', '', '', 2, ''],
  ['BM-KV-01-03', 'Sổ nhiệt độ, độ ẩm kho', '仓库温湿度记录', 'KV', '01. Kho · 仓库', '7.1.4', 'Bảo quản', 'Hằng ngày\n每天', 'CS_PROPOSED', '○', '', '', 1, 2, ''],
  ['BM-NS-01-02', 'Kế hoạch đào tạo năm', '年度培训计划', 'NS', '01. Đào tạo · 培训', '7.2', 'Đào tạo', 'Hằng năm\n每年', 'MANUAL', '●', '1', '2026-01-10', 366, '', ''],
  ['BM-BRC-03-01', 'Sổ cấp phát dao, vật sắc', '刀具及利器发放记录', 'BRC', '03. Kiểm soát vật lạ · 异物控制', '', 'Kiểm soát vật lạ; Dao và vật sắc', 'Mỗi ca\n每班', 'MANUAL', '◐', '', '', 1, 1, ''],
  ['BM-BRC-05-02', 'Đối chiếu số lượng tờ in', '印张数量核对', 'BRC', '05. Nhãn & in · 标签与印刷', '', 'Kiểm soát in ấn', 'Mỗi đơn hàng\n每个订单', 'MANUAL', '○', '', '', '', 2, 'Khách hàng dược phẩm → ưu tiên 1'],
  ['BM-CĐ-01-05', 'Danh mục tài liệu cơ điện', '机电文件清单', 'CĐ', '01. TÀI LIỆU · 01. 文件', '7.5.3', '', '', 'MANUAL', '✕', '', '', '', '', 'Gộp vào BM-ISO-02-01'],
  ['BM-CĐ-02-05', 'Checksheet máy nén khí', '空压机点检表', 'CĐ', '02. THIẾT BỊ · 02. 设备', '7.1.3', 'Bảo trì', 'Hằng ngày\n每天', 'CS', '◐', '', '', 1, '', ''],
  ['BM-CĐ-03-03', 'Phiếu bảo trì thiết bị', '设备保养记录', 'CĐ', '03. BẢO TRÌ · 03. 保养', '7.1.3', 'Bảo trì', 'Hằng tháng\n每月', 'ME', '◐', '', '', 31, '', ''],
  ['BM-CĐ-04-03', 'Sổ dừng máy', '停机记录', 'CĐ', '04. SỬA CHỮA · 04. 维修', '7.1.3', 'Bảo trì', 'Hằng ngày\n每天', 'ME', '◐', '', '', 1, '', ''],
  ['BM-CĐ-08-01', 'Sổ chỉ số điện nước', '水电读数记录', 'CĐ', '08. ĐIỆN NƯỚC · 08. 水电', '7.1.3', '', 'Hằng tháng\n每月', 'ME_PART', '◐', '', '', 31, '', '']
];

/** Điều khoản mẫu: [chuẩn, khóa, nhóm Việt, nhóm Trung, tên Việt, tên Trung, bắt buộc lưu hồ sơ] */
var SAMPLE_CLAUSES_ = [
  ['ISO9001', '7.1.3', 'Hỗ trợ', '支持', 'Cơ sở hạ tầng (mẫu)', '基础设施（样例）', false],
  ['ISO9001', '7.1.5', 'Hỗ trợ', '支持', 'Nguồn lực theo dõi và đo lường (mẫu)', '监视和测量资源（样例）', true],
  ['ISO9001', '7.2', 'Hỗ trợ', '支持', 'Năng lực (mẫu)', '能力（样例）', true],
  ['ISO9001', '7.5', 'Hỗ trợ', '支持', 'Thông tin dạng văn bản (mẫu)', '成文信息（样例）', false],
  ['ISO9001', '8.4', 'Thực hiện', '运行', 'Kiểm soát nhà cung cấp bên ngoài (mẫu)', '外部提供的过程、产品和服务的控制（样例）', true],
  ['ISO9001', '8.5.1', 'Thực hiện', '运行', 'Kiểm soát sản xuất (mẫu)', '生产和服务提供的控制（样例）', false],
  ['ISO9001', '8.7', 'Thực hiện', '运行', 'Kiểm soát đầu ra không phù hợp (mẫu)', '不合格输出的控制（样例）', true],
  ['ISO9001', '9.2', 'Đánh giá kết quả', '绩效评价', 'Đánh giá nội bộ (mẫu)', '内部审核（样例）', true],
  ['ISO9001', '9.3', 'Đánh giá kết quả', '绩效评价', 'Xem xét của lãnh đạo (mẫu)', '管理评审（样例）', true],
  ['ISO9001', '10.2', 'Cải tiến', '改进', 'Sự không phù hợp và hành động khắc phục (mẫu)', '不合格和纠正措施（样例）', true],
  ['ISO9001', '6.3', 'Hoạch định', '策划', 'Hoạch định các thay đổi (mẫu)', '变更的策划（样例）', false],
  ['BRC', 'Kiểm soát vật lạ', 'Kiểm soát sản phẩm', '产品控制', 'Kiểm soát vật lạ (mẫu)', '异物控制（样例）', false],
  ['BRC', 'Dao và vật sắc', 'Kiểm soát sản phẩm', '产品控制', 'Dao và vật sắc (mẫu)', '刀具和利器（样例）', false],
  ['BRC', 'Kiểm soát in ấn', 'Kiểm soát quá trình', '过程控制', 'Kiểm soát in ấn (mẫu)', '印刷控制（样例）', false],
  ['BRC', 'Khiếu nại khách hàng', 'Hệ thống chất lượng', '质量体系', 'Khiếu nại khách hàng (mẫu)', '客户投诉（样例）', false],
  ['BRC', 'Đào tạo', 'Nhân sự', '人员', 'Đào tạo (mẫu)', '培训（样例）', false],
  ['BRC', 'Truy xuất', 'Hệ thống chất lượng', '质量体系', 'Truy xuất nguồn gốc (mẫu)', '可追溯性（样例）', false]
];

/** Tài khoản mẫu: [mã, tên, cấp, bộ phận, Thư ký ISO, trưởng bộ phận của] */
var SAMPLE_USERS_ = [
  ['MAU-TK', 'Thư ký ISO MẪU', 2, 'ISO', true, ''],
  ['MAU-CL3', 'Trưởng QA MẪU', 3, 'CL', false, 'CL'],
  ['MAU-SX2', 'Nhân viên SX MẪU', 2, 'SX', false, ''],
  ['MAU-KD1', 'Tra cứu KD MẪU', 1, 'KD', false, '']
];

function sampleCells_(s) {
  var dep = DEPTS_SEED_.filter(function (d) { return d[0] === s[3]; })[0];
  return {
    B: s[0], C: s[1] + '\n' + s[2], D: '', E: dep ? dep[1] + ' · ' + dep[2] : s[3], F: s[4], G: s[5], K: s[6], N: s[7],
    R: whereDisplay_(s[8]), T: s[9], U: s[10], V: s[11], W: s[12] === '' ? '' : String(s[12]), Q: s[13] === '' ? '' : String(s[13]), Z: s[14]
  };
}

function seedSample_(byUserId) {
  if (!isTestEnv_()) throw new Error('Chỉ chạy ở máy chủ THỬ (ENV=THU).');
  var nowIso = isoVN_(now_());
  var items = readRows_('Items');
  if (items.some(function (r) { return r.code === SAMPLE_ITEMS_[0][0]; })) return { already: true };
  var ctx = { user: { user_id: byUserId || SYSTEM_USER } };
  var look = deptLookup_(readRows_('Depts'));
  var groups = {};
  readRows_('Groups').forEach(function (g) { groups[g.group_key] = true; });
  var writes = [];
  SAMPLE_ITEMS_.forEach(function (s, i) {
    var n = normCatalogRow_(sampleCells_(s), look, i + 5);
    if (n.errors.length) throw new Error('Dòng mẫu lỗi ' + s[0] + ': ' + JSON.stringify(n.errors));
    n.fields.sort_order = i + 1;
    writes.push({ sheet: 'Items', mode: 'insert', row: itemRowFromImport_(ctx, null, n.code, n.fields, nowIso) });
    var g = n.group;
    if (g && !groups[g.group_key]) {
      groups[g.group_key] = true;
      writes.push({ sheet: 'Groups', mode: 'insert', row: cNewSystem_({ group_key: g.group_key, dept_code: g.dept_code, name_vi: g.name_vi, name_zh: g.name_zh, label: g.label, sort_order: i + 1, active: true, i18n_meta: { name: { src: 'vi', state: 'HUMAN', at: nowIso } } }) });
    }
  });
  var haveCl = {};
  readRows_('Clauses').forEach(function (c) { haveCl[c.clause_id] = true; });
  var perStd = {};
  SAMPLE_CLAUSES_.forEach(function (c) {
    var id = c[0] + '|' + c[1];
    perStd[c[0]] = (perStd[c[0]] || 0) + 1;
    if (haveCl[id]) return;
    writes.push({ sheet: 'Clauses', mode: 'insert', row: cNewSystem_({ clause_id: id, std: c[0], key: c[1], group_vi: c[2], group_zh: c[3], name_vi: c[4], name_zh: c[5], mandatory_record: c[6], sort_order: perStd[c[0]], active: true,
      i18n_meta: { name: { src: 'vi', state: 'HUMAN', at: nowIso }, group: { src: 'vi', state: 'HUMAN', at: nowIso } } }) });
  });
  systemWrite_(writes, { action: 'sample.seed', entity_type: 'SYSTEM', after_json: { items: SAMPLE_ITEMS_.length, by: byUserId || SYSTEM_USER } });
  // Tài khoản mẫu: PIN tạm 72 giờ, đăng nhập lần đầu phải đổi PIN
  var pins = {};
  var heads = {};
  withWriteLock_(function () {
    var have = {};
    readRows_('Users').forEach(function (u) { have[u.employee_code] = true; });
    var add = [];
    SAMPLE_USERS_.forEach(function (u) {
      if (have[u[0]]) return;
      var pin = randomPin_(u[0]);
      var rec = newPinRecord_(pin);
      var uid = uuid_();
      pins[u[0]] = pin;
      if (u[5]) heads[u[5]] = uid;
      add.push({
        user_id: uid, employee_code: u[0], display_name: u[1], email: '', role_level: u[2], active: true, pin_hash: rec.pin_hash, salt: rec.salt,
        pin_hash_version: rec.pin_hash_version, failed_attempts: 0, locked_until: '', created_at: nowIso, updated_at: nowIso, auth_version: 1,
        is_system_owner: false, must_change_pin: true, temp_pin_expires_at: isoVN_(new Date(now_().getTime() + setting_('temp_pin_hours') * 3600000)),
        pin_changed_at: '', failed_window_started_at: '', last_login_at: '', record_version: 1, created_by: SYSTEM_USER, updated_by: SYSTEM_USER,
        dept_codes: u[3], iso_secretary: u[4], auditor: false
      });
    });
    if (add.length) {
      insertRows_('Users', add);
      var st = readState_();
      var rev = Number(stateGet_(st, 'sync_revision', 0)) + 1;
      stateWrite_(st, { sync_revision: ['INT', rev], 'table_rev.Users': ['INT', rev] }, SYSTEM_USER);
    }
  });
  cache_().remove('users:dir');
  DB_.userDir = null;
  var dw = [];
  readRows_('Depts').forEach(function (d) {
    if (!heads[d.dept_code] || d.head_user_id) return;
    var row = clone_(d); delete row.__row;
    row.head_user_id = heads[d.dept_code];
    row.record_version = (row.record_version || 0) + 1; row.updated_at = nowIso; row.updated_by = SYSTEM_USER;
    dw.push({ sheet: 'Depts', mode: 'update', row: row });
  });
  if (dw.length) systemWrite_(dw);
  return { items: SAMPLE_ITEMS_.length, clauses: SAMPLE_CLAUSES_.length, temp_pins: pins };
}

/** Chạy từ trình soạn ở máy chủ THỬ: in PIN tạm của tài khoản mẫu vào nhật ký thực thi */
function adminSeedSample() {
  dbReset_();
  var out = seedSample_(SYSTEM_USER);
  if (out.already) { log_('Đã có dữ liệu mẫu — không tạo thêm.'); return; }
  log_('Đã tạo dữ liệu mẫu: ' + out.items + ' biểu, ' + out.clauses + ' điều khoản. PIN tạm (đổi khi đăng nhập lần đầu): ' +
    Object.keys(out.temp_pins).map(function (k) { return k + ' = ' + out.temp_pins[k]; }).join(', '));
}

/** sample.seed (owner, PIN, chỉ THỬ): như adminSeedSample, PIN tạm trả một lần trong phản hồi */
function sampleSeedAction_(ctx) {
  if (!isTestEnv_()) throw apiError_('FORBIDDEN');
  var out = withWriteLock_(function () { return seedSample_(ctx.user.user_id); });
  writeAudit_({ user_id: ctx.user.user_id, device_id: ctx.req.device_id, action: 'sample.seed', entity_type: 'SYSTEM', entity_id: '', before_json: null, after_json: { already: !!out.already, items: out.items || 0 }, operation_id: ctx.req.operation_id || '', auth_basis: authBasis_(ctx) });
  return out;
}

// ===== i18n/labels.json =====
/** Bản chép từ điển nhãn của app (5.3) cho email, Excel, lời báo */
var LABELS = {"account.add_home":["Thêm app vào Màn hình chính: trong Safari bấm Chia sẻ → Thêm vào MH chính","将应用添加到主屏幕：在Safari中点击分享→添加到主屏幕"],"account.admin":["Quản trị","管理"],"account.api_version":["Phiên bản API","API版本"],"account.app_version":["Phiên bản app","应用版本"],"account.display_name":["Tên hiển thị","显示名称"],"account.expires":["Hết hạn","到期"],"account.guide":["Hướng dẫn","使用指南"],"account.info":["Thông tin","信息"],"account.issued":["Đăng nhập lúc","登录时间"],"account.last_seen":["Hoạt động gần nhất","最近活动"],"account.level":["Cấp","级别"],"account.profile":["Hồ sơ","个人资料"],"account.security":["Bảo mật","安全"],"account.server_version":["Phiên bản máy chủ","服务器版本"],"account.sessions":["Phiên đăng nhập","登录会话"],"account.sync":["Đồng bộ","同步"],"account.this_device":["Máy này","本机"],"adm.audit.after":["Sau","修改后"],"adm.audit.before":["Trước","修改前"],"adm.audit.from":["Từ ngày","从"],"adm.audit.more":["Còn nữa — thu hẹp bộ lọc để xem thêm","还有更多——请缩小筛选范围"],"adm.audit.to":["Đến ngày","至"],"adm.audit.user":["Người làm","操作人"],"adm.backup.docs":["Tài liệu","文件"],"adm.backup.last":["Lần sao lưu gần nhất","最近一次备份"],"adm.backup.no_manifest":["Không có manifest.json: lần chạy bị dừng giữa chừng, xem Lần thực thi trong Apps Script","缺少manifest.json：运行中途停止，请查看Apps Script执行记录"],"adm.backup.none":["Chưa có bản sao lưu","暂无备份"],"adm.backup.note":["Tự động hằng tuần ({D}, {H}:00), giữ {N} bản đã kiểm chứng. Khôi phục làm thủ công theo hướng dẫn","每周自动备份（{D} {H}:00），保留{N}份已校验备份。恢复需按指南手动操作"],"adm.backup.queued":["Đang chờ sao lưu, màn tự cập nhật…","等待备份中，页面自动刷新…"],"adm.backup.retry":["Chạy lại sau ghi đồng thời","因同时写入而重跑"],"adm.backup.rows":["Số dòng","行数"],"adm.backup.running":["Đang sao lưu (thường 1–3 phút), màn tự cập nhật…","正在备份（通常1–3分钟），页面自动刷新…"],"adm.status.base_mismatch":["Khác địa chỉ app đang dùng ({U})","与当前应用地址不同（{U}）"],"adm.status.checked_at":["Kiểm lúc {T}","检查于{T}"],"adm.status.default":["Mặc định","默认"],"adm.status.edit_setting":["Sửa cấu hình","修改设置"],"adm.status.ok":["Đạt","正常","green"],"adm.status.readonly":["Chỉ đọc","只读","grey"],"adm.status.settings":["Cấu hình","系统设置"],"adm.status.warn":["Cảnh báo","警告","amber"],"adm.user.add":["Thêm người dùng","新增用户"],"adm.user.code":["Mã nhân viên","员工编号"],"adm.user.confirm_reset":["Cấp PIN tạm mới? PIN cũ hết dùng, mọi phiên bị thu hồi","发放新的临时PIN？旧PIN失效，所有会话将被撤销"],"adm.user.confirm_revoke":["Thu hồi mọi phiên của người này? Họ phải đăng nhập lại","撤销该用户的所有会话？该用户需重新登录"],"adm.user.email":["Email (không bắt buộc)","邮箱（可选）"],"adm.user.hide_locked":["Ẩn tài khoản đã khóa","隐藏已锁定的账号"],"adm.user.last_login":["Đăng nhập cuối","最近登录"],"adm.user.owner_note":["Chủ hệ thống: chỉ chủ hệ thống thao tác được","系统所有者：仅系统所有者可操作"],"adm.user.pin_locked":["Đang khóa do nhập sai PIN","因输错PIN被锁定","amber"],"adm.user.role_note":["Đổi cấp, bộ phận hoặc cờ làm mọi phiên của người này hết hiệu lực","修改级别、部门或标记后，该用户所有会话失效"],"adm.user.self_note":["Tài khoản của bạn: đổi PIN ở trang Tài khoản","这是您的账号：请在账户页修改PIN"],"adm.user.sessions":["Phiên đang mở","在线会话"],"adm.user.show_locked":["Hiện tài khoản đã khóa ({N})","显示已锁定的账号（{N}）"],"adm.user.temp_pin_once":["PIN tạm chỉ hiện một lần. Ghi lại và đưa tận tay người dùng; hạn {H} giờ, đăng nhập xong phải đổi PIN","临时PIN只显示一次。请记下并当面交给用户；有效期{H}小时，登录后必须修改PIN"],"adm.user.temp_pin_title":["PIN tạm","临时PIN"],"adm.user.temp_pin_until":["Hạn PIN tạm","临时PIN到期"],"adm.user.total":["{N} tài khoản","共{N}个账号"],"admin.audit":["Nhật ký thao tác","操作日志"],"admin.backup":["Sao lưu","备份"],"admin.report_logo":["Logo trên báo cáo","报表标志"],"admin.status":["Trạng thái hệ thống","系统状态"],"admin.users":["Người dùng và PIN tạm","用户与临时PIN"],"attempts_left":["Còn {N} lần thử","还可尝试 {N} 次"],"auth.checking_pin":["Đang kiểm tra PIN…","正在验证PIN…"],"auth.expired_offline":["Phiên đã hết hạn: chỉ xem nháp và xuất dự phòng","会话已过期：只能查看草稿和导出备份"],"auth.hello":["Xin chào","你好"],"auth.loading_data":["Đang tải dữ liệu…","正在加载数据…"],"auth.loading_page":["Đang tải dữ liệu (phần {N})…","正在加载数据（第 {N} 部分）…"],"auth.logout_all_confirm":["Mọi phiên, kể cả máy đang dùng, sẽ hết hiệu lực. Dùng khi mất điện thoại.","所有会话（包括本机）将失效。用于手机丢失时。"],"auth.logout_has_drafts":["Còn {N} mục chưa gửi lên máy chủ. Chọn cách xử lý trước khi đăng xuất.","仍有 {N} 条未同步到服务器。退出前请选择处理方式。"],"auth.open_with_pin":["Mở bằng PIN","用PIN打开"],"auth.others_relogin":["Các thiết bị khác phải đăng nhập lại","其他设备需重新登录"],"auth.pin_skip_wait":["Không chờ mạng — mở bằng dữ liệu trên máy","不等网络 — 使用本机数据打开"],"auth.revoked":["Phiên đã bị thu hồi hoặc quyền đã thay đổi","会话已撤销或权限已变更"],"auth.seconds":["{N} giây","{N} 秒"],"auth.server_changed":["App đã chuyển sang máy chủ khác — đăng nhập lại. Nháp chưa gửi của máy chủ cũ nằm ở mục Nháp thế hệ dữ liệu cũ","应用已切换到其他服务器——请重新登录。旧服务器未发送的草稿在“旧数据草稿”中"],"auth.server_slow":["Máy chủ đang phản hồi chậm…","服务器响应较慢…"],"auth.session_warn":["Phiên sắp hết hạn — {D}","会话即将到期 — {D}"],"auth.step_connect":["Kết nối máy chủ","连接服务器"],"auth.step_data":["Cập nhật dữ liệu","更新数据"],"auth.step_open":["Mở trang chủ","打开首页"],"auth.temp_pin_stale":["PIN tạm này không còn dùng được (đã có PIN tạm mới hơn, hoặc quá hạn đổi PIN). Đăng nhập lại bằng PIN tạm mới nhất","此临时PIN已失效（已发放更新的临时PIN或超过修改时限）。请用最新的临时PIN重新登录"],"back":["Quay lại","返回"],"btn.back":["Quay lại","返回"],"btn.backup_now":["Sao lưu ngay","立即备份"],"btn.cancel":["Hủy","取消"],"btn.change_pin":["Đổi PIN","修改PIN"],"btn.close":["Đóng","关闭"],"btn.confirm":["Đúng","确认"],"btn.delete_draft":["Xóa nháp","删除草稿"],"btn.delete_drafts":["Xóa nháp","删除草稿"],"btn.edit":["Sửa","编辑"],"btn.export_backup":["Xuất dự phòng","导出备份"],"btn.filter":["Lọc","筛选"],"btn.keep_drafts":["Giữ nháp trên máy","保留本机草稿"],"btn.lock":["Khóa","锁定"],"btn.logout":["Đăng xuất","退出登录"],"btn.logout_all":["Đăng xuất mọi thiết bị","退出所有设备"],"btn.relogin":["Đăng nhập lại","重新登录"],"btn.reset_pin":["Cấp PIN tạm","发放临时PIN"],"btn.retry":["Thử lại","重试"],"btn.revoke":["Thu hồi","撤销"],"btn.revoke_sessions":["Thu hồi phiên","撤销会话"],"btn.save":["Lưu","保存"],"btn.set_role":["Đổi cấp/vai trò","修改级别/岗位"],"btn.sync_now":["Đồng bộ ngay","立即同步"],"btn.unlock":["Mở khóa","解锁"],"btn.use_server":["Dùng bản máy chủ","采用服务器版本"],"cancel":["Hủy","取消"],"change_pin":["Đổi PIN","修改PIN"],"col.actions":["Thao tác","操作"],"col.status":["Tình trạng biểu","表单状态"],"conflict.rebased":["Đã gửi lại thay đổi của bạn trên bản máy chủ mới nhất","已在服务器最新版本上重新发送您的修改"],"conflict.title":["Xử lý xung đột","处理冲突"],"conflict.use_server_confirm":["Bỏ thay đổi của bạn và dùng bản máy chủ? Có thể xuất dự phòng trước.","放弃您的修改并采用服务器版本？可先导出备份。"],"current_pin":["PIN hiện tại","当前PIN"],"draft.auto_delete":["Tự xóa sau {N} ngày","{N} 天后自动删除"],"draft.blocked_hint":["Mục trước của cùng hồ sơ bị từ chối/xung đột; xử lý mục đó trước","同一记录的前一项被拒绝/冲突，请先处理该项"],"draft.created":["Tạo lúc","创建时间"],"draft.delete_all_confirm":["Xóa hẳn {N} nháp chưa gửi? Không lấy lại được.","确定删除 {N} 份未同步草稿？删除后无法恢复。"],"draft.delete_confirm":["Xóa hẳn nháp này? Không lấy lại được.","确定删除此草稿？删除后无法恢复。"],"draft.empty":["Không có mục nào","没有项目"],"draft.error_code":["Mã lỗi","错误代码"],"draft.old_epoch":["Nháp thế hệ dữ liệu cũ","旧数据草稿"],"draft.other_user":["Máy còn {N} nháp của người dùng khác","本机有 {N} 份其他用户的草稿"],"draft.photos":["{N} ảnh","{N} 张照片"],"draft.recent_sent":["Đã gửi lên máy chủ (7 ngày gần nhất)","已同步（最近7天）"],"draft.rejected":["Nháp bị từ chối","被拒草稿"],"draft.sent_at":["Gửi lúc","同步时间"],"draft.size":["Dung lượng","大小"],"draft.title":["Nháp chờ đồng bộ","待同步草稿"],"employee_code":["Mã nhân viên","员工编号"],"env_test":["THỬ","测试"],"err.client":["Lỗi trên máy","本机错误"],"err.forbidden":["Không có quyền","无权限"],"err.not_found":["Không tìm thấy","未找到"],"err.reload_hint":["Nếu vừa có bản mới: bấm để tải lại toàn bộ app. Nháp chưa gửi vẫn giữ trên máy.","如刚更新版本：点击重新加载整个应用。未发送的草稿仍保留在本机。"],"err.reload_new":["Tải lại bản mới","重新加载最新版本"],"field.choose":["— Chọn —","— 请选择 —"],"field.invalid_date":["Ngày không hợp lệ","日期无效"],"field.name":["Tên","名称"],"field.number_ambiguous":["Đã hiểu là {A}. Nếu là số hàng nghìn, gõ liền không dấu (vd 12350)","已识别为 {A}；如为千位数，请连续输入（如 12350）"],"field.number_bad_sep":["Không dùng dấu chấm/phẩy để tách hàng nghìn; gõ 1234567","请勿使用千位分隔符，请输入 1234567"],"field.one_lang":["Chỉ cần nhập một thứ tiếng, máy chủ tự dịch bên kia","只需填写一种语言，服务器自动翻译另一种"],"field.reason":["Lý do","原因"],"field.reason_required":["Bắt buộc nhập lý do","必须填写原因"],"field.required":["Bắt buộc nhập","必填"],"forgot_pin":["Quên PIN","忘记PIN"],"forgot_pin_help":["Liên hệ quản trị để đặt lại PIN","请联系管理员重置密码"],"form.saved":["Đã lưu máy chủ","已同步"],"i18n.check_required":["Tick \"Đã kiểm tra bản dịch\" trước khi lưu","保存前请勾选\"已核对译文\""],"i18n.checked":["Đã kiểm tra bản dịch","已核对译文"],"i18n.lang_vi":["Tiếng Việt","越南语"],"i18n.lang_zh":["Tiếng Trung","中文"],"i18n.suggest":["Gợi ý dịch","翻译建议"],"i18n.suggest_need_one":["Nhập một bên rồi bấm Gợi ý dịch","先填写一种语言再点翻译建议"],"level.owner":["Chủ hệ thống","系统所有者"],"list.more":["Hiện thêm {N} (còn {R})","再显示{N}条（剩余{R}条）"],"locked":["Tạm khóa do nhập sai PIN nhiều lần, thử lại sau {N} phút","因多次输错PIN已暂时锁定，请 {N} 分钟后重试"],"login":["Đăng nhập","登录"],"logo.bad_type":["Chỉ nhận ảnh PNG hoặc JPEG","仅支持PNG或JPEG图片"],"logo.current":["Logo đang dùng","当前标志"],"logo.hint":["Nên dùng ảnh PNG nền trong suốt; app tự thu nhỏ còn tối đa 800 px trước khi gửi","建议使用透明背景PNG；应用发送前自动缩小至最长800像素"],"logo.none":["Chưa có logo — báo cáo in ra không có logo","尚未设置标志——报表不显示标志"],"logo.preview_note":["Xem trước ở cỡ đầu trang PDF","按PDF页眉大小预览"],"logo.remove":["Gỡ logo","移除标志"],"logo.remove_confirm":["Gỡ logo khỏi báo cáo? Báo cáo in sau đó sẽ không có logo.","从报表移除标志？之后打印的报表将不显示标志。"],"logo.removed":["Đã gỡ logo","已移除标志"],"logo.replace":["Đổi logo","更换标志"],"logo.saved":["Đã lưu logo — báo cáo in từ giờ có logo mới","标志已保存——此后打印的报表使用新标志"],"logo.upload":["Chọn ảnh logo","选择标志图片"],"logo.where":["Logo công ty chỉ hiện trên báo cáo PDF và Excel (Đợt 2), không hiện trong app","公司标志仅显示在PDF和Excel报表上（第2期），不在应用内显示"],"manual_code":["Mở theo mã","按编号打开"],"menu.title":["ISO","体系管理"],"nav.account":["Tài khoản","账户"],"nav.home":["Trang chủ","首页"],"nav.scan":["Quét","扫码"],"need_network":["Cần kết nối mạng","需要网络连接"],"network_error":["Không kết nối được máy chủ","无法连接服务器"],"new_pin":["PIN mới","新PIN"],"new_pin_again":["Nhập lại PIN mới","确认新PIN"],"no_reuse_pin":["Không dùng lại PIN của app khác","请勿重复使用其他应用的PIN"],"offline":["Ngoại tuyến","离线"],"offline_unlock":["Mở khóa ngoại tuyến","离线解锁"],"op_state.COMMITTED":["Đã lưu máy chủ","已同步","green"],"open_with_pin":["Mở bằng PIN","用PIN打开"],"pin6":["PIN 6 số","六位数字密码"],"pin_format":["PIN phải gồm đúng 6 chữ số","PIN必须为6位数字"],"pin_mismatch":["Hai lần nhập PIN mới không khớp","两次输入的新PIN不一致"],"safari_tab":["Đang chạy trong Safari: nháp có thể bị xóa sau 7 ngày không mở","在Safari中运行：7天未打开草稿可能被清除"],"same_account":["Dùng cùng tài khoản với iPhone","与iPhone使用同一账户"],"save":["Lưu","保存"],"scan":["Quét tem QR của biểu","扫描表单二维码"],"scan_hint":["Đưa tem QR của biểu vào khung, hoặc nhập mã biểu (vd BM-CĐ-03-03)","将表单二维码标签对准框内，或输入表单编号（如BM-CĐ-03-03）"],"server_url":["Địa chỉ máy chủ (/exec)","服务器地址 (/exec)"],"server_url_bad":["Link phải có dạng https://script.google.com/macros/s/…/exec","链接格式应为 https://script.google.com/macros/s/…/exec"],"server_url_missing":["Chưa có địa chỉ máy chủ","尚未设置服务器地址"],"shared_device":["Máy dùng chung","公用设备"],"show_pin":["Hiện PIN","显示PIN"],"sync.committed":["Đã lưu máy chủ","已同步"],"sync.committed_n":["Đã lưu máy chủ: {N} mục","已同步：{N} 条"],"sync.conflict":["Xung đột, cần xử lý","冲突，需处理"],"sync.dataset_reset":["Dữ liệu đã được đặt lại, cần tải lại","数据已重置，需重新加载"],"sync.done":["Đã đồng bộ","同步完成"],"sync.failed":["Lỗi gửi","同步失败"],"sync.last":["Lần đồng bộ cuối","上次同步"],"sync.maintenance":["Bảo trì","维护中"],"sync.need_network":["Cần kết nối mạng","需要网络连接"],"sync.never":["Chưa đồng bộ","尚未同步"],"sync.offline":["Ngoại tuyến","离线"],"sync.online":["Trực tuyến","在线"],"sync.queued":["Chờ gửi","待同步"],"sync.queued_count":["{N} mục chờ gửi","待同步数据 {N} 条"],"sync.safari_tab":["Đang chạy trong Safari: nháp có thể bị xóa sau 7 ngày không mở","在Safari中运行：7天未打开草稿可能被清除"],"sys.maintenance":["Hệ thống đang bảo trì","系统维护中"],"sys.maintenance_over":["Hệ thống đã hết bảo trì","系统维护已结束"],"sys.maintenance_strip":["Hệ thống đang bảo trì — chỉ xem dữ liệu trên máy","系统维护中 — 仅可查看本机数据"],"sys.maintenance_unlock":["Hệ thống đang bảo trì (ví dụ đang Xóa sạch dữ liệu). Chỉ mở được dữ liệu đã có trên máy; bảo trì xong app tự kiểm tra lại.","系统维护中（例如正在清空数据）。仅可打开本机已有数据；维护结束后应用会自动重新检查。"],"tab.calendar":["Lịch","日程"],"tag.env_test":["THỬ","测试"],"tag.machine_translated":["dịch máy","机器翻译"],"tag.no_translation":["Chưa có bản dịch","暂无译文"],"temp_pin":["Bạn đang dùng PIN tạm, hãy đặt PIN mới","您正在使用临时PIN，请设置新PIN"],"unknown_result":["Chưa rõ kết quả, đang hỏi lại máy chủ","结果未知，正在向服务器确认"],"user_status.ACTIVE":["Đang hoạt động","正常","green"],"user_status.DISABLED":["Ngừng dùng","已停用","grey"],"user_status.MUST_CHANGE_PIN":["Phải đổi PIN","需修改PIN","amber"],"op_state.QUEUED":["Chờ gửi","待同步","amber"],"op_state.PREPARED":["Đang gửi","同步中","navy"],"op_state.SENDING":["Đang gửi","同步中","navy"],"op_state.FAILED":["Lỗi gửi","同步失败","red"],"op_state.REJECTED":["Bị từ chối","被拒","red"],"op_state.CONFLICT":["Xung đột","冲突","red"],"op_state.UNKNOWN":["Chưa rõ kết quả","结果未知","amber"],"op_state.UNKNOWN_RESULT":["Chưa rõ kết quả","结果未知","amber"],"user_status.LOCKED":["Tạm khóa","已锁定","red"],"backup_status.VERIFIED":["Đã kiểm chứng","已校验","green"],"backup_status.INCONSISTENT":["Không nhất quán","不一致","amber"],"backup_status.FAILED":["Thất bại","失败","red"],"backup_status.RUNNING":["Đang sao lưu","备份中","amber"],"op_state.BLOCKED":["Chờ mục trước","等待前项","amber"],"health.schema_version":["Phiên bản schema","架构版本"],"health.server_version":["Phiên bản máy chủ","服务器版本"],"health.dataset_epoch":["Thế hệ dữ liệu","数据批次"],"health.env":["Môi trường","环境"],"health.temp_props":["Khóa tạm còn sót trong Thuộc tính tập lệnh","脚本属性中残留的临时键"],"health.maintenance":["Bảo trì","维护模式"],"health.triggers":["Trigger đã cài","已安装触发器"],"health.trigger_minutes_24h":["Phút chạy trigger trong 24 giờ","24小时触发器运行分钟数"],"health.last_backup":["Sao lưu gần nhất","最近备份"],"health.mt_paused_until":["Tạm dừng dịch máy đến","机器翻译暂停至"],"health.login_paused_until":["Tạm dừng đăng nhập đến","登录暂停至"],"health.spreadsheet_cells":["Số ô bảng tính (giới hạn 5 triệu)","表格单元格数（上限500万）"],"brand.sub":["Hệ thống quản lý","体系管理"],"nav.scan_qr":["Quét tem QR","扫描二维码"],"nav.reports":["Báo cáo","报表"],"qr_foreign":["Mã này không phải tem biểu của app ISO (tem M&E là tem thiết bị)","此码不是ISO系统的表单标签（M&E标签为设备标签）"],"qr_unavailable":["Không tìm thấy biểu này (hoặc không thuộc bộ phận của bạn). Thử Đồng bộ ngay.","未找到该表单（或不属于您的部门）。请尝试立即同步。"],"level.1":["Tra cứu","查询"],"level.2":["Nhân viên","员工"],"level.3":["Trưởng bộ phận","部门主管"],"level.4":["Quản trị","管理员"],"account.scan_hint":["Quét tem QR dán trên sổ biểu, bìa hồ sơ để mở đúng biểu và xem lần ban hành đang hiệu lực","扫描表单册或档案封面上的二维码，打开对应表单并查看现行版本"],"account.work":["Công việc","工作"],"action.doc.upload":["Tệp / ảnh hồ sơ","记录文件/照片"],"conflict.help_run":["Bản ghi này đã được người khác sửa trên máy chủ trước khi bản của bạn gửi lên. Chọn giữ bản máy chủ (bỏ bản của bạn) hoặc gửi bản của bạn đè lên bản mới nhất.","该记录在您的版本上传前已被他人在服务器上修改。请选择保留服务器版本（放弃您的版本），或用您的版本覆盖最新版本。"],"conflict.mine_on_top":["Gửi bản của tôi lên bản mới nhất","用我的版本覆盖最新版本"],"weekday.1":["Thứ Hai","星期一"],"weekday.2":["Thứ Ba","星期二"],"weekday.3":["Thứ Tư","星期三"],"weekday.4":["Thứ Năm","星期四"],"weekday.5":["Thứ Sáu","星期五"],"weekday.6":["Thứ Bảy","星期六"],"weekday.7":["Chủ nhật","星期日"],"period.week":["Tuần {N}","第{N}周"],"period.month":["Tháng {M}","{M}月"],"home.pending_me":["Chờ bạn xử lý","待您处理"],"home.items_n":["{N} biểu","{N}个表单"],"home.none_filter":["Không có mục nào","没有项目"],"pend.count":["{N} việc chờ xử lý","{N}项待处理"],"admin.sample":["Dữ liệu mẫu","示例数据"],"adm.user.level_hint":["Tra cứu: xem · Nhân viên: nộp hồ sơ, soạn phiên bản · Trưởng bộ phận: duyệt tài liệu bộ phận, trả lại hồ sơ · Quản trị: duyệt cấp công ty, người dùng, cài đặt","查询：查看 · 员工：提交记录、编写版本 · 部门主管：审批部门文件、退回记录 · 管理员：审批公司级文件、用户、设置"],"adm.user.levels_note":["Cấp 1–3 chỉ thấy và ghi trong bộ phận của mình; tài liệu chung của Ban ISO ai cũng xem. Thư ký ISO và Quản trị thấy tất cả.","1–3级仅可查看和操作本部门；体系办通用文件所有人可见。ISO秘书和管理员可见全部。"],"adm.audit.all":["Mọi thao tác","全部操作"],"audit_grp.abnormal":["Xử lý Không đạt","不合格处理"],"audit_grp.missed":["Lý do bỏ sót","漏检原因"],"audit_grp.day":["Xác nhận ngày","日确认"],"audit_grp.library":["Thư viện hạng mục","项目库"],"audit_grp.user":["Người dùng","用户"],"audit_grp.settings":["Cấu hình","配置"],"audit_grp.report":["Logo báo cáo","报表标志"],"audit_grp.backup":["Sao lưu","备份"],"health.report_logo":["Logo trên báo cáo","报表标志"],"health.app_base_url":["Địa chỉ app","应用地址"],"sample.what":["Tạo khoảng 25 biểu giả ở 10 bộ phận, điều khoản ISO 9001 / chủ đề BRCGS mẫu và 4 tài khoản mẫu (Thư ký ISO, Trưởng QA, Nhân viên SX, Tra cứu KD) để thử app.","创建约25个示例表单（10个部门）、示例ISO 9001条款/BRCGS主题及4个示例账户（ISO秘书、质量主管、生产员工、销售查询），用于试用。"],"sample.note":["Chỉ có ở máy chủ THỬ. Không phải danh mục thật — nhập file Excel tổng để có danh mục thật.","仅测试服务器可用。非真实目录——导入Excel总表以获得真实目录。"],"sample.run":["Tạo dữ liệu mẫu","创建示例数据"],"sample.done":["Đã tạo {M} biểu, {T} điều khoản mẫu","已创建{M}个表单、{T}个示例条款"],"sample.already":["Đã có dữ liệu mẫu","示例数据已存在"],"sample.pins":["PIN tạm của tài khoản mẫu (đổi khi đăng nhập lần đầu, chỉ hiện một lần):","示例账户临时PIN（首次登录时修改，仅显示一次）："],"auth.reauth":["Nhập lại PIN để tiếp tục","请重新输入PIN以继续"],"tile.month":["Bảng tháng","月表"],"tile.pending":["Chờ xử lý","待处理"],"tile.library":["Thư viện hạng mục","项目库"],"tile.reports":["Báo cáo","报表"],"tile.drafts":["Nháp chờ gửi","待同步"],"home.week":["Tuần này","本周"],"home.none_drafts":["Không có nháp","无草稿"],"nav.catalog":["Danh mục","目录"],"nav.records":["Hồ sơ","记录"],"nav.coverage":["Phủ điều khoản","条款覆盖"],"nav.excel":["Excel","表格导入导出"],"nav.capa":["Khắc phục","纠正措施"],"nav.audits":["Đánh giá nội bộ","内部审核"],"nav.links":["Kết nối M&E / Checksheet","连接M&E/点检表"],"tile.catalog":["Danh mục","目录"],"tile.records":["Hồ sơ","记录"],"tile.coverage":["Phủ điều khoản","条款覆盖"],"tile.excel":["Excel","表格导入导出"],"tile.capa":["Khắc phục","纠正措施"],"tile.audits":["Đánh giá nội bộ","内部审核"],"tile.links":["Kết nối","连接"],"soon.tag":["Sắp có","即将推出"],"soon.what.records":["Bảng kỳ hồ sơ theo bộ phận (✓ đúng hạn, ! quá hạn, – chưa tới hạn), nộp hồ sơ bằng ảnh hoặc tệp, kể cả khi mất mạng.","按部门的记录周期表（✓按时、!逾期、–未到期），以照片或文件提交记录，离线也可提交。"],"soon.what.coverage":["Phủ điều khoản ISO 9001 và chủ đề BRCGS: số biểu, đã ban hành, in từ app, điều khoản bắt buộc còn thiếu biểu.","ISO 9001条款及BRCGS主题覆盖：表单数、已发布、系统打印、缺少表单的必须条款。"],"soon.what.reports":["Báo cáo PDF có logo + Excel: danh mục tài liệu hiện hành, tình trạng hồ sơ, phủ điều khoản, lịch sử phiên bản.","带标志的PDF及Excel报表：现行文件清单、记录状态、条款覆盖、版本历史。"],"soon.what.capa":["Sổ khắc phục, phiếu khắc phục, 8D khiếu nại, sản phẩm không phù hợp, SCAR nhà cung cấp.","纠正措施台账、纠正措施单、客诉8D、不合格品、供应商SCAR。"],"soon.what.audits":["Chương trình đánh giá nội bộ năm, kế hoạch đợt, checklist, phát hiện → phiếu khắc phục, báo cáo.","年度内审方案、审核计划、检查表、发现项→纠正措施单、报告。"],"soon.what.links":["Đọc ngày có hồ sơ từ M&E và Checksheet mỗi giờ để 33 biểu in từ app có ô ✓ mà không ai phải nộp lại.","每小时从M&E和点检表读取记录日期，33个系统打印表单自动显示✓，无需重复提交。"],"soon.when_1c":["Làm ở phiên 1c của Đợt 1","第1期1c阶段完成"],"soon.when_1d":["Làm ở phiên 1d của Đợt 1","第1期1d阶段完成"],"soon.when_d2":["Làm ở Đợt 2","第2期完成"],"soon.when_d3":["Làm ở Đợt 3","第3期完成"],"soon.when_d4":["Làm ở Đợt 4","第4期完成"],"role.secretary":["Thư ký ISO","ISO秘书","navy"],"role.auditor":["Đánh giá viên","审核员","navy"],"account.depts":["Bộ phận","部门"],"account.all_depts":["Mọi bộ phận","全部部门"],"account.flags":["Vai trò thêm","附加角色"],"admin.depts":["Bộ phận và trưởng bộ phận","部门与部门主管"],"adm.user.depts_hint":["Không chọn bộ phận nào = mọi bộ phận","不选择部门 = 全部部门"],"adm.user.secretary_hint":["Quản lý danh mục toàn công ty, ban hành, thu hồi, nhập Excel, lập chương trình đánh giá","管理全公司目录、发布、收回、导入Excel、制定审核方案"],"adm.user.auditor_hint":["Ghi phát hiện đánh giá nội bộ (Đợt 4); không đánh giá bộ phận của chính mình","记录内审发现（第4期）；不审核本部门"],"adm.dept.add":["Thêm bộ phận","添加部门"],"adm.dept.code":["Mã bộ phận","部门代码"],"adm.dept.name":["Tên bộ phận","部门名称"],"adm.dept.head":["Trưởng bộ phận","部门主管"],"adm.dept.no_head":["Chưa có trưởng bộ phận","未设部门主管"],"adm.dept.head_hint":["Trưởng bộ phận duyệt tài liệu cấp bộ phận và trả lại hồ sơ nộp sai (phiên 1b, 1c)","部门主管审批部门级文件并退回错误记录（1b、1c阶段）"],"adm.dept.active":["Đang dùng","使用中"],"adm.dept.total":["{N} bộ phận","{N}个部门"],"adm.dept.note":["Tên bộ phận phải khớp cột Bộ phận của file Excel tổng (dạng \"Việt · 中文\") để nhập đúng","部门名称须与Excel总表“部门”列一致（格式“越文 · 中文”）才能正确导入"],"cat.add":["Thêm biểu / tài liệu","添加表单/文件"],"cat.all":["Tất cả","全部"],"cat.clear":["Bỏ lọc","清除筛选"],"cat.code":["Mã","编号"],"cat.name":["Tên","名称"],"cat.count":["{N} biểu","{N}个表单"],"cat.dept":["Bộ phận","部门"],"cat.group":["Nhóm","分组"],"cat.kind":["Loại","类型"],"cat.where":["Nơi làm","执行位置"],"cat.status":["Tình trạng biểu","表单状态"],"cat.priority":["Ưu tiên","优先级"],"cat.priority_short":["ƯT","优先"],"cat.prio_n":["Ưu tiên {N}","优先级{N}","red"],"cat.prio_none":["Không ghi ưu tiên","未设优先级"],"cat.special":["Khác","其他"],"cat.no_file":["Đã ban hành, chưa có tệp","已发布，无文件","amber"],"cat.no_file_short":["chưa có tệp","无文件"],"cat.filters":["Bộ lọc","筛选"],"cat.rev":["Lần ban hành","发布次数"],"cat.rev_n":["Lần {N}","第{N}版"],"cat.search_ph":["Tìm mã, tên Việt hoặc 中文","搜索编号、越文或中文名称"],"cat.scope_note":["Bạn thấy biểu của bộ phận {D} và tài liệu chung của Ban ISO","您可查看{D}部门的表单及体系办通用文件"],"cat.none_filter":["Không có biểu nào khớp bộ lọc","没有符合筛选条件的表单"],"cat.empty":["Chưa có biểu nào trong danh mục","目录中暂无表单"],"cat.empty_sec":["Danh mục còn trống — nhập file Excel tổng để bắt đầu","目录为空——请导入Excel总表开始"],"status.NONE":["Chưa có","未编写","grey"],"status.DRAFTING":["Đang soạn","编写中","amber"],"status.ISSUED":["Đã ban hành","已发布","green"],"status.NA":["Không áp dụng","不适用","grey"],"kind.FORM":["Biểu mẫu","表单","navy"],"kind.MANUAL":["Sổ tay","手册","navy"],"kind.POLICY":["Chính sách","方针","navy"],"kind.PROCEDURE":["Quy trình","程序","navy"],"kind.WI":["Hướng dẫn công việc","作业指导书","navy"],"kind.EXTERNAL":["Tài liệu bên ngoài","外来文件","grey"],"level_doc.DEPT":["Cấp bộ phận","部门级","grey"],"level_doc.COMPANY":["Cấp công ty","公司级","navy"],"where.ME":["M&E","机电App"],"where.CS":["Checksheet","点检表"],"where.ME_PART":["Một phần M&E","部分机电App"],"where.CS_PART":["Một phần Checksheet","部分点检表"],"where.CS_PROPOSED":["Đề xuất Checksheet","建议用点检表"],"where.MANUAL":["Làm tay → App ISO","手工→ISO App"],"period.DAY":["Hằng ngày","每天"],"period.WEEK":["Hằng tuần","每周"],"period.MONTH":["Hằng tháng","每月"],"period.QUARTER":["Hằng quý","每季度"],"period.HALF":["Nửa năm","每半年"],"period.YEAR":["Hằng năm","每年"],"period.EVENT":["Khi phát sinh","发生时"],"item.not_found":["Không tìm thấy biểu này (hoặc không thuộc bộ phận của bạn)","未找到该表单（或不属于您的部门）"],"item.stale":["Bản in này đã lỗi thời: tem ghi lần {R}, đang hiệu lực lần {C}","此打印件已过期：标签为第{R}版，现行为第{C}版"],"item.current":["Đang hiệu lực: lần {R}","现行版本：第{R}版"],"item.no_file_note":["Biểu ● nhập từ Excel, chưa có tệp PDF/tệp gốc. Thư ký ISO tải lên ở phiên 1b.","从Excel导入的●表单尚无PDF/源文件，ISO秘书将在1b阶段上传。"],"item.na_reason":["Lý do không áp dụng","不适用原因"],"item.info":["Thông tin","信息"],"item.purpose":["Mục đích & nội dung","用途及内容"],"item.freq":["Tần suất","频次"],"item.period":["Kỳ hồ sơ","记录周期"],"item.period_days":["Chu kỳ hồ sơ (ngày)","记录周期（天）"],"item.period_hint":["1 ngày · 7 tuần · 31 tháng · 92 quý · 183 nửa năm · 366 năm · trống = khi phát sinh","1天·7周·31月·92季·183半年·366年·空=发生时"],"item.days":["ngày","天"],"item.flow":["Lập → Duyệt","填写 → 审核"],"item.keep":["Thời gian lưu","保存期限"],"item.where_note":["In ở đâu / còn thiếu","打印位置/缺项"],"item.law":["Căn cứ pháp luật VN","越南法规依据"],"item.cls":["Phân loại","类别"],"item.owner":["Người phụ trách","负责人"],"item.note":["Ghi chú / liên quan","备注/相关"],"item.standards":["Điều khoản ISO và BRCGS","ISO条款及BRCGS"],"item.no_clause":["Chưa ghi điều khoản ISO","未填写ISO条款"],"item.brc":["BRCGS Packaging (chủ đề)","BRCGS包装（主题）"],"item.issue":["Ban hành","发布"],"item.issued_at":["Ngày ban hành","发布日期"],"item.review_due":["Hạn rà soát","评审期限"],"item.qr":["Mã QR","二维码"],"item.versions":["Phiên bản hiện hành & lịch sử","现行版本及历史"],"item.versions_soon":["Xem PDF, tải tệp gốc, soạn → duyệt → ban hành: phiên 1b","查看PDF、下载源文件、编写→审批→发布：1b阶段"],"item.records":["Hồ sơ 12 kỳ gần nhất","最近12期记录"],"item.records_soon":["Bảng ✓ / ! / – theo kỳ và nộp hồ sơ: phiên 1c","按周期的✓/!/–表及提交记录：1c阶段"],"item.related":["Biểu cùng nhóm","同组表单"],"item.submit_record":["Nộp hồ sơ","提交记录"],"item.new_version":["Soạn phiên bản mới","编写新版本"],"item.qr_label":["Tem QR","二维码标签"],"item.code_hint":["BM-<bộ phận>-xx-yy cho biểu mẫu; QT- quy trình; HD- hướng dẫn; ST- sổ tay; CS- chính sách","表单BM-<部门>-xx-yy；程序QT-；作业指导HD-；手册ST-；方针CS-"],"item.level":["Cấp duyệt","审批级别"],"item.group_auto":["Theo mã biểu","按表单编号"],"item.iso9001":["ISO 9001","ISO 9001"],"item.iso14001":["ISO 14001","ISO 14001"],"item.iso45001":["ISO 45001","ISO 45001"],"item.iso50001":["ISO 50001","ISO 50001"],"item.status_note":["Tình trạng, lần ban hành, ngày ban hành đổi qua luồng phiên bản (phiên 1b) hoặc nhập Excel","状态、发布次数、发布日期通过版本流程（1b阶段）或导入Excel修改"],"field.invalid":["Giá trị không hợp lệ","值无效"],"home.stats":["Số liệu danh mục","目录数据"],"home.stat_total":["Tổng biểu","表单总数"],"home.stat_pct":["% ban hành","发布率"],"home.stat_overdue":["Hồ sơ quá hạn","逾期记录"],"home.stat_missing":["Điều khoản bắt buộc thiếu biểu","缺少表单的必须条款"],"home.stat_missing_sub":["Điều khoản ISO 9001","ISO 9001条款"],"home.no_file_n":["{N} biểu ● chưa có tệp","{N}个●表单无文件"],"home.by_dept":["Biểu theo bộ phận","各部门表单"],"home.week_soon":["Lịch tuần các hồ sơ đến hạn: phiên 1d","本周到期记录日程：1d阶段"],"xl.export":["Xuất danh mục","导出目录"],"xl.export_note":["Đúng khuôn file Excel tổng (5 sheet, tiêu đề dòng 4, dữ liệu từ dòng 5, công thức): xuất → sửa → nhập lại được.","与Excel总表格式一致（5个工作表、第4行标题、第5行起数据、公式）：导出→修改→可重新导入。"],"xl.scope_note":["Bạn xuất các biểu thuộc bộ phận của mình","您导出本部门的表单"],"xl.export_btn":["Xuất {N} biểu","导出{N}个表单"],"xl.template":["Tải mẫu","下载模板"],"xl.format_note":["Giữ được: tên sheet, công thức, cố định ô D5, nền vàng ô nhập, danh sách chọn ○ ◐ ● ✕, tô màu theo tình trạng, cột khóa ẩn AA.","保留：工作表名称、公式、冻结D5、输入格黄色底、○◐●✕下拉列表、按状态着色、隐藏AA列。"],"xl.export_fail":["Không tạo được tệp Excel","无法生成Excel文件"],"xl.import":["Nhập lô","批量导入"],"xl.import_note":["Chọn file Excel tổng. App so theo Mã biểu: chưa có → thêm, có rồi → sửa, giống hệt → Không đổi. Xem trước rồi mới ghi; người ghi phải khác người nhập (trừ Quản trị).","选择Excel总表。按表单编号比对：无→新增，有→修改，相同→不变。先预览后写入；写入人须与导入人不同（管理员除外）。"],"xl.choose":["Chọn file Excel tổng","选择Excel总表"],"xl.batches":["Lô nhập gần đây","最近导入批次"],"xl.batch":["Lô nhập","导入批次"],"imp.reading":["Đang đọc tệp…","正在读取文件…"],"imp.read_fail":["Không đọc được tệp","无法读取文件"],"imp.template_unknown":["Tệp không đúng khuôn file Excel tổng (cần sheet \"Danh mục tổng - 总清单\", tiêu đề có cột \"Mã biểu mẫu\")","文件不符合Excel总表格式（需要“Danh mục tổng - 总清单”工作表及“Mã biểu mẫu”列）"],"imp.checking":["Máy chủ đang kiểm tra phần {A}/{B}…","服务器正在检查第{A}/{B}部分…"],"imp.preview":["Xem trước","预览"],"imp.total":["{N} dòng","{N}行"],"imp.n_add":["Thêm {N}","新增{N}"],"imp.n_update":["Sửa {N}","修改{N}"],"imp.n_same":["Không đổi {N}","不变{N}"],"imp.n_error":["Lỗi {N}","错误{N}"],"imp.n_clause":["Điều khoản đổi {N}","条款变更{N}"],"imp.no_change":["Không đổi — tệp giống hệt danh mục hiện có","不变——文件与现有目录完全一致"],"imp.row":["Dòng","行"],"imp.action":["Kết quả","结果"],"imp.detail":["Chi tiết","详情"],"imp.written":["Đã ghi","已写入"],"imp.act.ADD":["Thêm","新增"],"imp.act.UPDATE":["Sửa","修改"],"imp.act.SAME":["Không đổi","不变"],"imp.act.ERROR":["Lỗi","错误"],"imp.errors_skip":["Dòng lỗi không được ghi; sửa trong tệp rồi nhập lại (dòng đã ghi sẽ báo Không đổi).","错误行不会写入；在文件中修改后重新导入（已写入行显示不变）。"],"imp.commit":["Ghi vào danh mục","写入目录"],"imp.commit_confirm":["Ghi các dòng thêm/sửa vào danh mục? Mỗi lượt ghi tối đa 100 dòng, cần nhập PIN.","将新增/修改行写入目录？每次最多写入100行，需要输入PIN。"],"imp.committing":["Đang ghi… đã ghi {N} dòng","正在写入…已写入{N}行"],"imp.committed":["Đã ghi {N} dòng vào danh mục","已写入{N}行到目录"],"imp.row_errors":["Dòng không ghi được (biểu bị sửa sau khi xem trước)","无法写入的行（预览后表单被修改）"],"imp.need_other":["Lô nhạy cảm: cần một Thư ký ISO khác hoặc Quản trị mở Excel → Lô nhập gần đây để ghi","敏感批次：需另一位ISO秘书或管理员在Excel→最近导入批次中写入"],"imp.cancel":["Bỏ lô","放弃批次"],"imp.cancel_confirm":["Bỏ lô nhập này? Các dòng chưa ghi sẽ không được ghi.","放弃此导入批次？未写入的行将不会写入。"],"imp.cancelled":["Đã bỏ lô","已放弃批次"],"imp.none":["Chưa có lô nhập nào","暂无导入批次"],"imp.wait_commit":["Chờ bạn ghi","待您写入"],"imp.by":["Nhập bởi {U} lúc {T}","{U}于{T}导入"],"imp.committed_by":["Ghi bởi {U}","由{U}写入"],"imp.clauses_diff":["Điều khoản: thêm {A} · sửa {U} · ngừng {D}","条款：新增{A}·修改{U}·停用{D}"],"imp.rows":["Các dòng thêm, sửa, lỗi","新增、修改、错误行"],"imp.grace_diff":["Ô D4 (số ngày cho phép trễ) trong tệp là {A}, app đang dùng {B} — đổi ở Trạng thái hệ thống → record_grace_days nếu cần","文件D4（允许延迟天数）为{A}，系统当前为{B}——如需修改请在系统状态→record_grace_days"],"imp.status.STAGING":["Đang gửi","发送中","grey"],"imp.status.PREVIEWED":["Chờ ghi","待写入","amber"],"imp.status.COMMITTING":["Đang ghi dở","写入中","amber"],"imp.status.COMPLETED":["Đã ghi","已写入","green"],"imp.status.CANCELLED":["Đã bỏ","已放弃","grey"],"audit_grp.item":["Sửa biểu","修改表单"],"audit_grp.import":["Nhập Excel","导入Excel"],"audit_grp.dept":["Bộ phận","部门"],"health.items":["Biểu trong danh mục","目录中表单数"],"health.clauses":["Điều khoản / chủ đề (đang dùng)","条款/主题（使用中）"],"health.dept_heads":["Bộ phận có trưởng bộ phận","已设主管的部门"],"health.iso_secretary":["Thư ký ISO + Quản trị","ISO秘书+管理员"],"col.dept_code":["Bộ phận","部门"],"col.group_key":["Nhóm","分组"],"col.name_vi":["Tên (Việt)","名称（越）"],"col.name_zh":["Tên (Trung)","名称（中）"],"col.purpose_vi":["Mục đích (Việt)","用途（越）"],"col.purpose_zh":["Mục đích (Trung)","用途（中）"],"col.iso9001":["ISO 9001","ISO 9001"],"col.iso14001":["ISO 14001","ISO 14001"],"col.iso45001":["ISO 45001","ISO 45001"],"col.iso50001":["ISO 50001","ISO 50001"],"col.brc_topics":["BRCGS","BRCGS"],"col.law":["Căn cứ pháp luật","法规依据"],"col.cls":["Phân loại","类别"],"col.freq_vi":["Tần suất (Việt)","频次（越）"],"col.freq_zh":["Tần suất (Trung)","频次（中）"],"col.flow":["Lập → Duyệt","填写→审核"],"col.keep":["Thời gian lưu","保存期限"],"col.priority":["Ưu tiên","优先级"],"col.where":["Nơi làm","执行位置"],"col.where_note":["In ở đâu","打印位置"],"col.current_rev":["Lần ban hành","发布次数"],"col.issued_at":["Ngày ban hành","发布日期"],"col.period_days":["Chu kỳ hồ sơ","记录周期"],"col.note":["Ghi chú","备注"],"col.group_label":["Tên nhóm","分组名称"],"action.record.submit":["Nộp hồ sơ","提交记录"]};
