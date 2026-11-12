/* =====================================================================
 * ISO · 体系管理 — máy chủ Google Apps Script
 * 00_config: hằng số, Settings mặc định, khóa SystemState, danh mục mã cố định
 * Lõi (PIN, phiên, ghi có xác nhận, đồng bộ, hàng chờ offline) chép từ app Checksheet (lõi M&E đã chạy THẬT).
 * ===================================================================== */

var APP_ID = 'ISO';
var SERVER_VERSION = '1.0.0-d2.2';
var API_CONTRACT_VERSION = '1.0';
var SCHEMA_VERSION = '1.0.4';
var TZ = 'Asia/Ho_Chi_Minh';
var TZ_OFFSET_MIN = 7 * 60; // Việt Nam không có giờ mùa hè
var RELEASED_DOT = 1;

var SCHEMA_DOTS_ = { '1.0.0': 1, '1.0.1': 1, '1.0.2': 1, '1.0.3': 1, '1.0.4': 1 };
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
  ['backup_mirror_email', 'STRING', '', false, 1, 'Tài khoản Google thứ hai nhận bản sao lưu (chia sẻ chỉ xem thư mục Sao lưu và Dữ liệu)', '接收备份的第二个Google账户（备份及数据文件夹仅查看共享）'],
  // ISO (mục 10 đặc tả, chốt 06/11/2026)
  ['doc_review_months', 'INT', 12, true, 1, 'Chu kỳ rà soát tài liệu (tháng)', '文件评审周期（月）'],
  ['review_warn_days', 'INT', 30, true, 1, 'Báo tài liệu sắp đến hạn rà soát trước (ngày)', '文件评审到期提前提醒（天）'],
  ['admin_self_approval', 'BOOL', true, true, 1, 'Quản trị (cấp 4) được duyệt phiên bản do chính mình soạn', '管理员（4级）可审批自己编写的版本'],
  ['record_grace_days', 'INT', 3, true, 1, 'Số ngày cho phép trễ khi xét hồ sơ', '记录允许延迟天数'],
  ['records_start_date', 'STRING', '', true, 1, 'Ngày bắt đầu tính hồ sơ cho biểu ● nhập từ Excel (trống = ngày nhập danh mục đầu tiên)', 'Excel导入的●表单开始计算记录的日期（空=首次导入目录日期）'],
  ['record_status_cache_seconds', 'INT', 300, false, 1, 'Bộ đệm tình trạng hồ sơ trên máy chủ (giây)', '服务器记录状态缓存（秒）'],
  // Đợt 2 (phiên 2a): app đã nối để lấy ngày có hồ sơ — chỉ đặt ở màn Kết nối (link.set), không sửa ở Cấu hình
  ['evidence_sources', 'STRING', '', true, 1, 'App đã nối để lấy ngày có hồ sơ (ME, CS) — đặt ở màn Kết nối', '已连接以获取记录日期的App（ME、CS）——在连接页面设置'],
  // Đợt 2 (phiên 2b): Gmail nhắc hạn — bật/tắt và giờ gửi đặt ở màn Gmail nhắc hạn (mail.settings.set), không sửa ở Cấu hình
  ['gmail_enabled', 'BOOL', false, false, 1, 'Bật gửi Gmail nhắc hạn — đặt ở màn Gmail nhắc hạn', '启用邮件提醒——在邮件提醒页面设置'],
  ['email_hour', 'INT', 7, false, 1, 'Giờ gửi Gmail nhắc hạn mỗi ngày (0–23) — đặt ở màn Gmail nhắc hạn', '每天发送提醒邮件的时间（0–23）——在邮件提醒页面设置'],
  ['version_wait_days', 'INT', 3, false, 1, 'Nhắc phiên bản chờ duyệt / chờ ban hành quá số ngày này', '版本待审批/待发布超过此天数时提醒'],
  ['mail_quota_reserve', 'INT', 10, false, 1, 'Chừa lại hạn mức Gmail cho M&E, Checksheet (số người nhận/ngày): còn bằng hoặc ít hơn thì ISO tạm dừng gửi', '为机电、点检表预留的邮件额度（收件人/天）：剩余不超过此数时ISO暂停发送'],
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
  ['last_import_at', 'DATETIME', ''],
  ['backup_mirror_status', 'STRING', ''],
  ['backup_mirror_at', 'DATETIME', ''],
  ['backup_mirror_error', 'STRING', '']
];

/** Mẫu mã hiển thị. yymm: true khi có phần năm-tháng (mục 3 đặc tả: HS, DN, KP, BC; DG theo năm ở Đợt 4). */
var CODE_PATTERNS = {
  RECORD: { prefix: 'HS', digits: 4, yymm: true, sheet: 'Records', col: 'code' },
  DOC_REQUEST: { prefix: 'DN', digits: 3, yymm: true, sheet: null, col: null },
  CAPA: { prefix: 'KP', digits: 3, yymm: true, sheet: null, col: null },
  REPORT: { prefix: 'BC', digits: 3, yymm: true, sheet: null, col: null }
};

/** Loại hồ sơ của tệp (Documents.entity_type) và loại tệp được gắn — phiên 1b (phiên bản: PDF, tệp gốc), 1c (hồ sơ: ảnh, tệp) */
var DOC_ENTITY_SHEETS_ = {
  VERSION: { sheet: 'Versions', key: 'version_id', kinds: ['PDF', 'SOURCE'] },
  RECORD: { sheet: 'Records', key: 'record_id', kinds: ['PHOTO', 'FILE'] }
};

/** Hồ sơ (phiên 1c): trạng thái; số tệp tối đa mỗi hồ sơ; khoảng ngày tối đa một lần nộp */
var RECORD_STATUS_ = ['SUBMITTED', 'RETURNED', 'VOID'];
var RECORD_MAX_FILES_ = 30;
var RECORD_MAX_RANGE_DAYS_ = 400;
/** Ô tình trạng hồ sơ theo kỳ: Đúng hạn ✓ · Quá hạn ! · Chưa tới hạn – · Không tính (để trống) */
var CELL_CODES_ = { OK: 'O', LATE: 'L', DUE: 'D', NA: 'N' };

/** Trạng thái phiên bản (mục 6 đặc tả) */
var VERSION_STATES_ = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'ISSUED', 'SUPERSEDED', 'CANCELLED'];
/** Phiên bản đang mở (mỗi biểu chỉ một bản đang mở cùng lúc) */
var VERSION_OPEN_ = { DRAFT: 1, IN_REVIEW: 1, APPROVED: 1 };
var VERSION_TYPES_ = ['REVISION', 'ATTACH'];

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
