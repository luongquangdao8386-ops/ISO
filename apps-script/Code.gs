/**
 * ISO · 体系管理 — Code.gs 1.0.0-d3.2
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
var SERVER_VERSION = '1.0.0-d3.2';
var API_CONTRACT_VERSION = '1.0';
var SCHEMA_VERSION = '1.0.9';
var TZ = 'Asia/Ho_Chi_Minh';
var TZ_OFFSET_MIN = 7 * 60; // Việt Nam không có giờ mùa hè
var RELEASED_DOT = 1;

var SCHEMA_DOTS_ = { '1.0.0': 1, '1.0.1': 1, '1.0.2': 1, '1.0.3': 1, '1.0.4': 1, '1.0.5': 1, '1.0.6': 1, '1.0.7': 1, '1.0.8': 1, '1.0.9': 1 };
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
  // Phạm vi áp dụng (2e, người dùng chốt 12/11/2026 "chỉ phạm vi cơ điện"): app chỉ quản lý biểu/tài liệu của các bộ phận này —
  // biểu ngoài phạm vi ẩn với mọi người (không xóa), nhập Excel tổng bỏ qua dòng ngoài phạm vi. Trống = toàn công ty.
  ['scope_depts', 'STRING', 'CĐ', true, 1, 'Phạm vi áp dụng: mã bộ phận app quản lý, cách nhau dấu phẩy (trống = toàn công ty)', '适用范围：应用管理的部门代码，用逗号分隔（空=全公司）'],
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
  // Đợt 2 (phiên 2d): sổ phân phối & thu hồi — bản in của lần cũ chưa thu hồi quá số ngày này (kể từ ngày ban hành lần mới) thì báo đỏ
  ['dist_recall_days', 'INT', 7, true, 1, 'Thu hồi bản in lần cũ trong (ngày) kể từ khi ban hành lần mới', '发布新版后收回旧版纸质文件的期限（天）'],
  // Đợt 3 (phiên 3a): khắc phục — mã biểu in trên phiếu / sổ khắc phục (phạm vi Cơ điện: BM-CĐ-14-02; mở rộng toàn công ty thì đổi sang
  // BM-ISO-04-01 / BM-ISO-04-02), số ngày từ khi xong hành động tới kiểm tra hiệu lực (mặc định khi bấm Hoàn thành hành động)
  ['capa_form_code', 'STRING', 'BM-CĐ-14-02', true, 1, 'Mã biểu của phiếu khắc phục (in trên phiếu)', '纠正措施单的表单编号（打印在单据上）'],
  ['capa_log_form_code', 'STRING', 'BM-CĐ-14-02', true, 1, 'Mã biểu của sổ theo dõi khắc phục (in trên sổ)', '纠正措施跟踪台账的表单编号（打印在台账上）'],
  ['capa_verify_days', 'INT', 30, true, 1, 'Kiểm tra hiệu lực sau khi xong hành động khắc phục (ngày, mặc định)', '纠正措施完成后验证有效性的天数（默认）'],
  // Đợt 3 (phiên 3b): khiếu nại khách hàng (8D) và yêu cầu khắc phục nhà cung cấp (SCAR) là phiếu khắc phục có nguồn riêng. Người dùng chốt
  // 12/11/2026 giữ phạm vi Cơ điện: phiếu vẫn thuộc bộ phận trong phạm vi, in theo mẫu của biểu KD / MH (mã sửa được ở Cấu hình)
  ['complaint_form_code', 'STRING', 'BM-KD-02-01', true, 1, 'Mã biểu của phiếu tiếp nhận khiếu nại khách hàng', '客户投诉受理单的表单编号'],
  ['d8_form_code', 'STRING', 'BM-KD-02-02', true, 1, 'Mã biểu của báo cáo 8D (khiếu nại khách hàng)', '8D报告（客户投诉）的表单编号'],
  ['scar_form_code', 'STRING', 'BM-MH-01-06', true, 1, 'Mã biểu của phiếu yêu cầu khắc phục nhà cung cấp (SCAR)', '供应商纠正措施要求单（SCAR）的表单编号'],
  ['capa_reply_days', 'INT', 7, true, 1, 'Hạn phản hồi khách hàng / nhà cung cấp trả lời SCAR (ngày từ khi tiếp nhận, mặc định)', '回复客户/供应商回复SCAR的期限（自受理日起天数，默认）'],
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
  DOC_REQUEST: { prefix: 'DN', digits: 3, yymm: true, sheet: 'DocRequests', col: 'code' },
  CAPA: { prefix: 'KP', digits: 3, yymm: true, sheet: 'Capas', col: 'code' },
  REPORT: { prefix: 'BC', digits: 3, yymm: true, sheet: 'ReportRuns', col: 'code' }
};

/** Loại hồ sơ của tệp (Documents.entity_type) và loại tệp được gắn — phiên 1b (phiên bản: PDF, tệp gốc), 1c (hồ sơ: ảnh, tệp) */
var DOC_ENTITY_SHEETS_ = {
  VERSION: { sheet: 'Versions', key: 'version_id', kinds: ['PDF', 'SOURCE'] },
  RECORD: { sheet: 'Records', key: 'record_id', kinds: ['PHOTO', 'FILE'] },
  // Kho tệp mẫu (2e): một dòng TplFiles = một tệp mẫu (bộ biểu xlsx nhiều sheet, hoặc docx/pdf), tải lên bằng tpl.upload
  TPL: { sheet: 'TplFiles', key: 'tpl_id', kinds: ['TEMPLATE'] },
  // Khắc phục (3a): ảnh hiện trường, bằng chứng thực hiện / kiểm tra hiệu lực (ảnh, PDF, Excel, Word) gắn vào phiếu khắc phục
  CAPA: { sheet: 'Capas', key: 'capa_id', kinds: ['PHOTO', 'FILE'] }
};

/** Khắc phục (Đợt 3, phiên 3a — thay BM-CĐ-14-02 trong phạm vi Cơ điện; BM-ISO-04-01 phiếu, 04-02 sổ khi mở rộng toàn công ty), mã KP-yymm-001.
 *  Nguồn: sự cố thiết bị · kiểm tra / kiểm định · đánh giá · an toàn – môi trường – năng lượng · không tuân thủ quy trình · khác
 *  khiếu nại khách hàng (3b, 8D) · nhà cung cấp (3b, SCAR) (3c thêm sản phẩm không phù hợp).
 *  Phiếu: OPEN đang xử lý → (xong mọi hành động, có nguyên nhân) VERIFYING chờ kiểm tra hiệu lực → CLOSED đã đóng (có hiệu lực) |
 *  OPEN lại (không hiệu lực: thêm hành động, lần kiểm tra sau); CANCELLED hủy (lập nhầm, kèm lý do).
 *  Hành động: OPEN → DONE (ngày hoàn thành + kết quả) | CANCELLED. */
var CAPA_SOURCES_ = ['EQUIPMENT', 'INSPECTION', 'AUDIT', 'SAFETY', 'PROCESS', 'COMPLAINT', 'SUPPLIER', 'OTHER'];
/** Phiên 3b: nguồn có đối tác bên ngoài — COMPLAINT khiếu nại khách hàng (8D), SUPPLIER yêu cầu khắc phục nhà cung cấp / nhà thầu (SCAR).
 *  Thêm: đối tác, sản phẩm / vật tư, lô, số lượng, mức độ, hạn phản hồi; phản hồi (capa.reply) bắt buộc trước khi đóng phiếu. */
var CAPA_PARTY_SOURCES_ = ['COMPLAINT', 'SUPPLIER'];
var CAPA_SEVERITIES_ = ['MINOR', 'MAJOR', 'CRITICAL'];
/** Khiếu nại: '' chưa kết luận · YES có cơ sở · NO không có cơ sở (không bắt buộc hành động khắc phục, vẫn ghi kết luận và phản hồi) */
var CAPA_VALIDS_ = ['', 'YES', 'NO'];
/** Mẫu in một phiếu: CAR phiếu khắc phục (capa_form_code) · RECEIPT phiếu tiếp nhận khiếu nại · D8 báo cáo 8D · SCAR */
var CAPA_FORMS_ = ['CAR', 'RECEIPT', 'D8', 'SCAR'];
var CAPA_STATES_ = ['OPEN', 'VERIFYING', 'CLOSED', 'CANCELLED'];
var CAPA_ACT_TYPES_ = ['CORRECTIVE', 'PREVENTIVE'];
var CAPA_ACT_STATES_ = ['OPEN', 'DONE', 'CANCELLED'];
var CAPA_MAX_ACTIONS_ = 30;
var CAPA_MAX_FILES_ = 30;

/** Kho tệp mẫu (2e): ACTIVE đang dùng · REPLACED đã thay bằng tệp mới cùng bộ (giữ để tra) · DELETED đã bỏ (tải nhầm).
 *  Mỗi tệp tối đa TPL_MAX_SHEETS_ sheet; mỗi lần tải lên tối đa TPL_MAX_CODES_ mã biểu tự nhận từ tên sheet. */
var TPL_STATES_ = ['ACTIVE', 'REPLACED', 'DELETED'];
var TPL_MAX_SHEETS_ = 300;
var TPL_MIMES_ = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/pdf': 'pdf'
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

/** Phiếu đề nghị tài liệu (phiên 2d, BM-ISO-02-02): loại NEW ban hành mới · REVISE sửa đổi · CANCEL hủy (ngừng dùng);
 *  SUBMITTED chờ xem xét → APPROVED chấp thuận (→ DONE khi ban hành / đặt ✕) | REJECTED không chấp thuận; CANCELLED rút lại */
var DOCREQ_TYPES_ = ['NEW', 'REVISE', 'CANCEL'];
var DOCREQ_STATES_ = ['SUBMITTED', 'APPROVED', 'REJECTED', 'DONE', 'CANCELLED'];
/** Sổ phân phối & thu hồi (phiên 2d, BM-ISO-02-03): ACTIVE đang dùng · RECALLED đã thu hồi · VOID ghi nhầm (bỏ) */
var DIST_STATES_ = ['ACTIVE', 'RECALLED', 'VOID'];
var DIST_MAX_ROWS_ = 30;
var DIST_MAX_RECALL_ = 100;

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
      'review_due owner_user_id qr_key note period_days period_type issued_source file_missing na_reason sort_order ' +
      'na_prev_status reviewed_at reviewed_by records_from' },
  // Phiên bản của biểu/tài liệu (phiên 1b): DRAFT → IN_REVIEW → APPROVED → ISSUED → SUPERSEDED; trả lại về DRAFT; hủy CANCELLED.
  // vtype: REVISION (lần ban hành mới, qua duyệt) | ATTACH (gắn tệp cho bản đang hiệu lực nhập từ Excel ●, Thư ký ISO ban hành thẳng)
  Versions: { book: 'B', dot: 1, key: 'version_id', c: true, i18n: true,
    cols: 'version_id item_id vtype rev state change_summary_vi change_summary_zh effective_date author_id ' +
      'pdf_doc_id pdf_file_name pdf_size source_doc_id source_file_name source_size source_mime ' +
      'submitted_at submitted_by approved_at approved_by approve_note issued_at issued_by superseded_at superseded_by_id ' +
      'returned_at returned_by return_reason cancelled_at cancelled_by cancel_reason item_status_before request_id' },
  // Phiếu đề nghị ban hành / sửa đổi / hủy tài liệu (phiên 2d, thay BM-ISO-02-02 / BM-CĐ-01-08), mã DN-yymm-001.
  // req_type NEW | REVISE | CANCEL; item_id: tài liệu cần sửa / hủy (NEW: gắn khi Thư ký ISO thêm vào danh mục); level: cấp duyệt (DEPT trưởng
  // bộ phận, COMPANY cấp 4); version_id: phiên bản soạn theo phiếu (ban hành → DONE); requester_name: tên người đề nghị khi Thư ký nhập thay
  DocRequests: { book: 'B', dot: 1, key: 'request_id', c: true, i18n: true,
    cols: 'request_id code req_type item_id dept_code level new_code new_kind title_vi title_zh reason_vi reason_zh content_vi content_zh ' +
      'want_date requester_name state submitted_at submitted_by decided_at decided_by decide_note version_id item_linked_at ' +
      'done_at done_by done_note cancelled_at cancelled_by cancel_reason' },
  // Sổ phân phối & thu hồi bản in (phiên 2d, BM-ISO-02-03): một dòng = một nơi nhận của một lần ban hành (rev). Bản của lần cũ còn
  // ACTIVE khi đã ban hành lần mới (hoặc biểu ✕) là "cần thu hồi" (tính, không lưu). replaced_by_id: dòng phát bản mới thay bản thu hồi
  Distributions: { book: 'B', dot: 1, key: 'dist_id', c: true,
    cols: 'dist_id item_id version_id rev dept_code holder copies dist_date note state recalled_date recalled_at recalled_by recall_note ' +
      'replaced_by_id void_at void_by void_reason' },
  // Hồ sơ đã nộp (phiên 1c): một lần nộp phủ một kỳ hoặc một khoảng ngày [period_from, period_to] (kỳ nào giao với khoảng đó là có hồ sơ).
  // Ghi nhận ngay (SUBMITTED), trưởng bộ phận / Thư ký ISO trả lại (RETURNED) thì kỳ đó tính lại như chưa có.
  // files_json: [{document_id, kind PHOTO|FILE, mime_type, file_name, size_bytes, page_no}] — tệp tải lên sau (doc.upload, làm được khi mất mạng)
  Records: { book: 'B', dot: 1, key: 'record_id', c: true,
    cols: 'record_id code item_id dept_code period_type period_from period_to record_date pages files_json note status ' +
      'submitted_at submitted_by client_created_at returned_at returned_by return_reason void_at void_by void_reason' },
  // Ngày có hồ sơ lấy từ M&E / Checksheet (Đợt 2, phiên 2a): gom theo kỳ của biểu ISO, một dòng = một app × một biểu × một kỳ.
  // evidence_id = <app>|<item_id>|<mã kỳ> (biểu khi phát sinh: |EVENT, khoảng ngày = ngày đầu – ngày cuối). Chỉ máy chủ ghi (trigger mỗi giờ).
  // src_codes: mã biểu bên app kia đã ghép vào biểu này (vd BM-CĐ-03-03a, BM-CĐ-03-03b → BM-CĐ-03-03)
  Evidence: { book: 'B', dot: 1, key: 'evidence_id', c: true,
    cols: 'evidence_id source item_id form_code period_type period_key period_from period_to count last_date src_codes synced_at' },
  // Kho tệp mẫu (2e, 31_tpl.js): một dòng = một tệp mẫu trống (bộ biểu xlsx nhiều sheet, hoặc docx/pdf) trên Drive riêng tư (Documents kind
  // TEMPLATE). set_code = BM-<bộ phận>-<nhóm> (vd BM-CĐ-04) đọc từ tên sheet / tên tệp; sheets_json: [{n: tên sheet, p: khổ A4|A3|…, o: P|L,
  // h: ẩn}] — app ghép sheet ↔ biểu theo mã. state ACTIVE | REPLACED (tệp mới cùng bộ thay, replaced_by_id) | DELETED (bỏ tệp tải nhầm)
  TplFiles: { book: 'B', dot: 1, key: 'tpl_id', c: true,
    cols: 'tpl_id set_code dept_code title_vi title_zh file_name mime_type size_bytes sha256 document_id sheets_json sheet_count state ' +
      'replaced_by_id replaced_at uploaded_at uploaded_by note deleted_at deleted_by delete_reason' },
  // Phiếu khắc phục (Đợt 3, phiên 3a, 32_capa.js): mã KP-yymm-001; source nguồn phát hiện; dept_code bộ phận chịu trách nhiệm; item_id biểu
  // liên quan (tùy chọn); ref_text tham chiếu (số phiếu sửa chữa M&E, thiết bị, đợt đánh giá…); problem mô tả sự không phù hợp; correction xử lý
  // tức thời; cause nguyên nhân gốc (bắt buộc trước khi kiểm tra hiệu lực); owner_user_id người phụ trách phiếu; due_date hạn hoàn thành;
  // state OPEN | VERIFYING | CLOSED | CANCELLED; files_json ảnh / tệp như Records; verify_count số lần kiểm tra không hiệu lực;
  // verify_history_json mọi lần kiểm tra [{date, at, by, result, note_vi, note_zh}].
  // Phiên 3b (source COMPLAINT khiếu nại khách hàng / SUPPLIER SCAR): party_name khách hàng / nhà cung cấp, party_contact người liên hệ,
  // product_text sản phẩm / vật tư, lot_text số lô / đơn hàng / PO, qty_text số lượng bị ảnh hưởng, severity MINOR | MAJOR | CRITICAL,
  // complaint_valid '' | YES | NO (khiếu nại có cơ sở), team_text nhóm 8D (D1), escape nguyên nhân lọt / không phát hiện (D4), sent_date ngày
  // gửi SCAR cho nhà cung cấp, reply_due hạn phản hồi, reply_date + reply_note ngày và nội dung phản hồi khách hàng / trả lời của nhà cung cấp
  Capas: { book: 'B', dot: 1, key: 'capa_id', c: true, i18n: true,
    cols: 'capa_id code source dept_code item_id ref_text found_date found_by_name title_vi title_zh problem_vi problem_zh ' +
      'correction_vi correction_zh cause_vi cause_zh owner_user_id due_date state files_json completed_at completed_by verify_due ' +
      'verify_count verified_at verified_by verify_date verify_result verify_note_vi verify_note_zh verify_history_json closed_at ' +
      'cancelled_at cancelled_by cancel_reason party_name party_contact product_text lot_text qty_text severity complaint_valid team_text ' +
      'escape_vi escape_zh sent_date reply_due reply_date reply_note_vi reply_note_zh reply_at reply_by' },
  // Hành động khắc phục / phòng ngừa của phiếu: owner_user_id người phụ trách trong app (nhận Gmail nhắc 7, 1, 0 ngày trước hạn), assignee_name
  // tên người thực hiện ngoài app; round = lần kiểm tra hiệu lực lúc thêm (0: kế hoạch đầu, 1: bổ sung sau lần kiểm tra không hiệu lực thứ nhất…)
  CapaActions: { book: 'B', dot: 1, key: 'action_id', c: true, i18n: true,
    cols: 'action_id capa_id seq atype content_vi content_zh owner_user_id assignee_name due_date state done_date done_at done_by ' +
      'result_vi result_zh cancelled_at cancelled_by cancel_reason round' },
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
  // Hàng chờ Gmail nhắc hạn (phiên 2b, 19_mail.js): recipient_id = user_id; kind REC_OVERDUE | REVIEW_DUE | VERSION_WAIT;
  // via PRIMARY | FALLBACK (người nhận chính chưa có email đã xác nhận → Thư ký ISO); detail_json: nội dung dòng thư lúc xếp hàng
  NotificationLogs: { book: 'B', dot: 1, key: 'notification_id',
    cols: 'notification_id dedupe_key run_date recipient_id entity_type entity_id due_date stage status attempt_at sent_at ' +
      'error_code dataset_epoch digest_id queued_at attempt_count kind via detail_json' },
  // Báo cáo đã lưu (phiên 2c, 27_reports.js): mã BC-yymm-001; bản chụp số liệu là tệp JSON riêng tư trên Drive (Documents kind SNAPSHOT),
  // PDF dựng lần đầu khi tải rồi giữ lại (Documents kind PDF). kind CATALOG | RECORDS | COVERAGE | VERSIONS; summary_json: ô số tóm tắt.
  // Chỉ máy chủ đọc/ghi, không đồng bộ xuống app (report.list).
  ReportRuns: { book: 'B', dot: 1, key: 'report_run_id', c: true,
    cols: 'report_run_id code kind title_vi title_zh filters_json summary_json row_count dept_code generated_at generated_by ' +
      'snapshot_doc_id pdf_doc_id pdf_file_name pdf_size status' },
  AuditLogs: { book: 'B', dot: 1, key: 'audit_id',
    cols: 'audit_id occurred_at user_id device_id action entity_type entity_id before_json after_json operation_id ' +
      'import_batch_id dataset_epoch reason auth_basis' },
  Operations: { book: 'B', dot: 1, key: 'operation_id',
    cols: 'operation_id user_id device_id entity_type entity_id expected_version received_at state result_code sync_revision ' +
      'committed_at dataset_epoch action payload_hash intent_json progress_json result_json' },

  // ---- Bảo mật ----
  // dept_codes: phạm vi bộ phận (cách nhau bằng dấu phẩy, rỗng = mọi bộ phận); iso_secretary: Thư ký ISO; auditor: Đánh giá viên
  // email_confirmed_at/_by: Quản trị xác nhận email nhận Gmail nhắc hạn (phiên 2b); đổi email thì mất xác nhận
  Users: { book: 'S', dot: 1, key: 'user_id',
    cols: 'user_id employee_code display_name email role_level active pin_hash salt pin_hash_version failed_attempts ' +
      'locked_until created_at updated_at auth_version is_system_owner must_change_pin temp_pin_expires_at pin_changed_at ' +
      'failed_window_started_at last_login_at record_version created_by updated_by dept_codes iso_secretary auditor ' +
      'email_confirmed_at email_confirmed_by' },
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
  code: 'STRING', key: 'STRING', current_rev: 'STRING', rev: 'STRING', pdf_size: 'INT', source_size: 'INT',
  submitted_by: 'STRING', approved_by: 'STRING', issued_by: 'STRING', returned_by: 'STRING', cancelled_by: 'STRING', reviewed_by: 'STRING', file_epoch: 'STRING', template_key: 'STRING', template_version: 'STRING',
  record_version: 'INT', sync_revision: 'INT', role_level: 'INT', auth_version: 'INT', failed_attempts: 'INT',
  size_bytes: 'INT', sort_order: 'INT', expected_version: 'INT', priority: 'INT', period_days: 'INT', row_number: 'INT', page_no: 'INT',
  total_rows: 'INT', add_count: 'INT', update_count: 'INT', same_count: 'INT', error_count: 'INT', clause_count: 'INT', committed_rows: 'INT',
  attempt_count: 'INT', row_count: 'INT', generated_by: 'STRING', copies: 'INT', holder: 'STRING', req_type: 'STRING', new_code: 'STRING', new_kind: 'STRING', level: 'STRING', state: 'STRING', requester_name: 'STRING',
  active: 'BOOL', owned_by_app: 'BOOL', must_change_pin: 'BOOL', is_system_owner: 'BOOL', iso_secretary: 'BOOL', auditor: 'BOOL',
  file_missing: 'BOOL', mandatory_record: 'BOOL',
  i18n_meta: 'JSON', schema_version: 'STRING', email: 'STRING', note: 'STRING', where: 'STRING',
  issued_at: 'DATE', review_due: 'DATE', due_date: 'DATE', run_date: 'DATE', records_from: 'DATE', period_from: 'DATE', period_to: 'DATE',
  pages: 'INT', client_created_at: 'STRING', void_by: 'STRING', period_type: 'STRING',
  evidence_id: 'STRING', period_key: 'STRING', count: 'INT', last_date: 'DATE', src_codes: 'STRING', source: 'STRING',
  email_confirmed_by: 'STRING', stage: 'STRING', kind: 'STRING', via: 'STRING', dedupe_key: 'STRING', digest_id: 'STRING', recipient_id: 'STRING',
  set_code: 'STRING', sheet_count: 'INT', uploaded_by: 'STRING', deleted_by: 'STRING', mime_type: 'STRING',
  ref_text: 'STRING', found_by_name: 'STRING', completed_by: 'STRING', verified_by: 'STRING', verify_due: 'DATE', verify_count: 'INT',
  verify_result: 'STRING', seq: 'INT', round: 'INT', atype: 'STRING', assignee_name: 'STRING', done_by: 'STRING'
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
  RECOVERY_REQUIRED: ['Thao tác ghi chưa hoàn tất, cần phục hồi', '写入未完成，需要恢复'],
  LINK_FAILED: ['Không lấy được dữ liệu từ app kia', '无法从该App获取数据']
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
  OUT_OF_SCOPE: ['Ngoài phạm vi bộ phận của bạn', '超出您的部门范围'],
  TOO_LONG: ['Quá dài', '内容过长'],
  VERSION_OPEN: ['Biểu đang có phiên bản soạn/chờ duyệt/chờ ban hành — xử lý bản đó trước', '该表单已有编写中/待审批/待发布的版本，请先处理'],
  PDF_REQUIRED: ['Cần tải PDF của phiên bản trước', '请先上传该版本的PDF'],
  ITEM_NA: ['Biểu đang Không áp dụng (✕) — dùng lại trước', '该表单为不适用（✕），请先恢复使用'],
  FILE_MISSING: ['Tệp không còn trên Drive của máy chủ', '服务器云端硬盘上的文件已不存在'],
  // Hồ sơ (phiên 1c)
  PAGES_INVALID: ['Cần ít nhất 1 ảnh hoặc tệp, tối đa 30', '至少需要1张照片或1个文件，最多30个'],
  RANGE_INVALID: ['Ngày cuối phải từ ngày đầu trở đi', '结束日期须不早于开始日期'],
  RANGE_TOO_LONG: ['Mỗi lần nộp tối đa 400 ngày', '每次提交最多400天'],
  DATE_OUT_OF_RANGE: ['Ngày ngoài khoảng cho phép (không quá 31 ngày sau hôm nay)', '日期超出允许范围（不得晚于今天后31天）'],
  ITEM_NO_RECORD: ['Biểu chưa có (○) hoặc không áp dụng (✕): không nộp hồ sơ', '表单尚未建立（○）或不适用（✕）：不能提交记录'],
  RECORD_FROM_APP: ['Biểu in từ app M&E / Checksheet: ngày có hồ sơ lấy từ app đó, không nộp ở đây', '由机电/点检表App打印的表单：记录日期取自该App，无需在此提交'],
  TOO_MANY_FILES: ['Hồ sơ đã đủ 30 tệp', '该记录已有30个文件'],
  // Kết nối M&E / Checksheet (phiên 2a)
  KEY_FORMAT: ['Mã kết nối là chuỗi dài 24–200 ký tự (chép từ nhật ký của app kia)', '连接码为24–200个字符（从该App的日志复制）'],
  LINK_FAILED: ['Không kết nối được', '无法连接'],
  MIRROR_SAME_ACCOUNT: ['Tài khoản thứ hai phải khác tài khoản đang chạy máy chủ', '第二个账户须与运行服务器的账户不同'],
  // Gmail nhắc hạn (phiên 2b)
  EMAIL_MISSING: ['Người này chưa có email', '此人尚无邮箱'],
  EMAIL_NOT_CONFIRMED: ['Email chưa được Quản trị xác nhận', '邮箱尚未经管理员确认'],
  MAIL_OFF: ['Gmail nhắc hạn đang tắt — bật trước', '邮件提醒已关闭，请先开启'],
  // Phạm vi áp dụng, Kho tệp mẫu (2e)
  APP_SCOPE: ['Bộ phận ngoài phạm vi áp dụng của app (Quản trị → Phạm vi áp dụng)', '该部门不在应用适用范围内（管理→适用范围）'],
  SCOPE_DEPT: ['Phạm vi áp dụng chỉ gồm mã bộ phận có trong danh sách Bộ phận, cách nhau dấu phẩy', '适用范围只能填写部门列表中的部门代码，用逗号分隔'],
  TPL_SHEETS: ['Danh sách sheet của tệp không hợp lệ (tối đa 300 sheet)', '文件的工作表列表无效（最多300个）'],
  TPL_STATE: ['Tệp mẫu đã được thay hoặc đã bỏ', '模板文件已被替换或已删除'],
  // Khắc phục (3a)
  CAPA_NO_CAUSE: ['Cần ghi nguyên nhân gốc trước khi gửi kiểm tra hiệu lực', '提交有效性验证前须填写根本原因'],
  CAPA_ACTIONS_OPEN: ['Còn hành động chưa xong — báo xong hoặc hủy hành động đó trước', '仍有未完成的措施——请先完成或取消'],
  CAPA_NO_ACTION: ['Cần ít nhất một hành động khắc phục đã xong', '至少需要一项已完成的纠正措施'],
  TOO_MANY_ACTIONS: ['Mỗi phiếu tối đa 30 hành động', '每张单最多30项措施'],
  DATE_FUTURE: ['Ngày không được sau hôm nay', '日期不得晚于今天'],
  DATE_PAST: ['Ngày không được trước hôm nay', '日期不得早于今天'],
  CAPA_DATE: ['Ngày phải từ ngày phát hiện tới hôm nay', '日期须在发现日期至今天之间'],
  // Khiếu nại 8D, SCAR (3b)
  CAPA_NO_REPLY: ['Cần ghi phản hồi khách hàng / trả lời của nhà cung cấp trước khi đóng phiếu', '关闭单据前须记录对客户的回复/供应商的回复'],
  CAPA_NOT_PARTY: ['Chỉ phiếu khiếu nại khách hàng hoặc SCAR nhà cung cấp mới có phản hồi', '只有客户投诉或供应商SCAR单才有回复']
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
  // Đợt 4: đánh giá nội bộ
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
  'version.save': function (ctx) { return versionSave_(ctx); },
  'version.submit': function (ctx) { return versionSubmit_(ctx); },
  'version.approve': function (ctx) { return versionApprove_(ctx); },
  'version.return': function (ctx) { return versionReturn_(ctx); },
  'version.issue': function (ctx) { return versionIssue_(ctx); },
  'version.cancel': function (ctx) { return versionCancel_(ctx); },
  'item.setNa': function (ctx) { return itemSetNa_(ctx); },
  'item.review': function (ctx) { return itemReview_(ctx); },
  'record.submit': function (ctx) { return recordSubmit_(ctx); },
  'record.return': function (ctx) { return recordReturn_(ctx); },
  'record.status': function (ctx) { return recordStatus_(ctx); },
  'link.info': function (ctx) { return linkInfo_(ctx); },
  'link.test': function (ctx) { return linkTest_(ctx); },
  'link.set': function (ctx) { return linkSet_(ctx); },
  'evidence.sync': function (ctx) { return evidenceSyncAction_(ctx); },
  'mail.view': function (ctx) { return mailView_(ctx); },
  'mail.settings.set': function (ctx) { return mailSettingsSet_(ctx); },
  'mail.recipient.set': function (ctx) { return mailRecipientSet_(ctx); },
  'mail.test': function (ctx) { return mailTest_(ctx); },
  'mail.run': function (ctx) { return mailRunAction_(ctx); },
  'mail.resend': function (ctx) { return mailResend_(ctx); },
  'docreq.save': function (ctx) { return docreqSave_(ctx); },
  'docreq.approve': function (ctx) { return docreqApprove_(ctx); },
  'docreq.reject': function (ctx) { return docreqReject_(ctx); },
  'docreq.cancel': function (ctx) { return docreqCancel_(ctx); },
  'docreq.done': function (ctx) { return docreqDone_(ctx); },
  'dist.issue': function (ctx) { return distIssue_(ctx); },
  'dist.recall': function (ctx) { return distRecall_(ctx); },
  'dist.edit': function (ctx) { return distEdit_(ctx); },
  'capa.save': function (ctx) { return capaSave_(ctx); },
  'capa.action.save': function (ctx) { return capaActionSave_(ctx); },
  'capa.action.done': function (ctx) { return capaActionDone_(ctx); },
  'capa.action.cancel': function (ctx) { return capaActionCancel_(ctx); },
  'capa.complete': function (ctx) { return capaComplete_(ctx); },
  'capa.verify': function (ctx) { return capaVerify_(ctx); },
  'capa.cancel': function (ctx) { return capaCancel_(ctx); },
  'capa.reply': function (ctx) { return capaReply_(ctx); },
  'tpl.upload': function (ctx) { return tplUpload_(ctx); },
  'tpl.edit': function (ctx) { return tplEdit_(ctx); },
  'tpl.delete': function (ctx) { return tplDelete_(ctx); },
  'doc.upload': function (ctx) { return docUpload_(ctx); },
  'doc.get': function (ctx) { return docGet_(ctx); },
  'report.run': function (ctx) { return reportRun_(ctx); },
  'report.save': function (ctx) { return reportSave_(ctx); },
  'report.list': function (ctx) { return reportList_(ctx); },
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
  'backup.mirror.set': function (ctx) { return backupMirrorSet_(ctx); },
  'settings.edit': function (ctx) { return settingsEdit_(ctx); },
  'system.status': function (ctx) { return systemStatus_(ctx); },
  'sample.seed': function (ctx) { return sampleSeedAction_(ctx); }
};

/**
 * Kiểm quyền theo hồ sơ (bộ phận, cấp công ty, người soạn) và trạng thái TRƯỚC khi hỏi PIN: người không có quyền nhận FORBIDDEN
 * ngay, không bị hỏi PIN cho việc sẽ bị từ chối (mục 4 quy tắc 4).
 */
var PRECHECK_ = {
  'version.approve': function (ctx) { precheckApprove_(ctx); },
  'version.return': function (ctx) { precheckReturn_(ctx); },
  'version.issue': function (ctx) { precheckIssue_(ctx); },
  'record.return': function (ctx) { precheckRecordReturn_(ctx); },
  'docreq.approve': function (ctx) { precheckDocreqDecide_(ctx); },
  'docreq.reject': function (ctx) { precheckDocreqDecide_(ctx); },
  'docreq.done': function (ctx) { precheckDocreqDone_(ctx); },
  'dist.recall': function (ctx) { precheckDistRecall_(ctx); },
  'tpl.delete': function (ctx) { precheckTplDelete_(ctx); },
  'capa.verify': function (ctx) { precheckCapaVerify_(ctx); },
  'capa.cancel': function (ctx) { precheckCapaCancel_(ctx); },
  'link.set': function (ctx) { precheckLinkSet_(ctx); },
  'mail.recipient.set': function (ctx) { precheckMailRecipient_(ctx); },
  'mail.test': function (ctx) { precheckMailRecipient_(ctx); }
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
  if (PRECHECK_[req.action]) PRECHECK_[req.action](ctx);
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
 * Tình trạng hồ sơ theo kỳ (đúng hạn / quá hạn / chưa tới hạn): 17_records.js. App tính giống hệt ở js/periods.js
 * (test so hai bên trên cùng dữ liệu). */

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

function lastDayOfMonth_(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Kỳ chứa một ngày: {key, from, to} (ngày đầu, ngày cuối của kỳ). Tuần ISO từ Thứ Hai tới Chủ nhật.
 * EVENT (khi phát sinh) không có kỳ → null.
 */
function periodOf_(type, iso) {
  var y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7));
  var ys = iso.slice(0, 4);
  switch (type) {
    case 'DAY': return { key: iso, from: iso, to: iso };
    case 'WEEK': {
      var dow = new Date(iso + 'T00:00:00Z').getUTCDay() || 7;
      var from = addDaysIso_(iso, 1 - dow);
      return { key: isoWeekKey_(iso), from: from, to: addDaysIso_(from, 6) };
    }
    case 'MONTH': return { key: iso.slice(0, 7), from: iso.slice(0, 7) + '-01', to: iso.slice(0, 7) + '-' + pad2_(lastDayOfMonth_(y, m)) };
    case 'QUARTER': {
      var q = Math.ceil(m / 3);
      return { key: ys + '-Q' + q, from: ys + '-' + pad2_(3 * q - 2) + '-01', to: ys + '-' + pad2_(3 * q) + '-' + pad2_(lastDayOfMonth_(y, 3 * q)) };
    }
    case 'HALF': return m <= 6 ? { key: ys + '-H1', from: ys + '-01-01', to: ys + '-06-30' } : { key: ys + '-H2', from: ys + '-07-01', to: ys + '-12-31' };
    case 'YEAR': return { key: ys, from: ys + '-01-01', to: ys + '-12-31' };
    default: return null;
  }
}

/** n kỳ gần nhất tới kỳ chứa `today`, cũ → mới */
function lastPeriods_(type, today, n) {
  var out = [];
  var p = periodOf_(type, today);
  for (var i = 0; p && i < n; i++) {
    out.unshift(p);
    p = periodOf_(type, addDaysIso_(p.from, -1));
  }
  return out;
}

/** Số ngày từ a tới b (ISO) */
function daysBetweenIso_(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
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
  // Hạn rà soát: tính từ ngày ban hành; giữ hạn đã có khi biểu vẫn ● cùng ngày ban hành (ban hành trong app, đã bấm "Đã rà soát")
  var keepDue = cur && cur.review_due && cur.status === 'ISSUED' && row.status === 'ISSUED' && cmpVal_(cur.issued_at) === cmpVal_(row.issued_at);
  row.review_due = keepDue ? cur.review_due : (row.status === 'ISSUED' && row.issued_at ? addMonthsIso_(row.issued_at, Number(setting_('doc_review_months') || 12)) : '');
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
  else if (p.dept_code !== undefined && !inScopeDept_(p.dept_code)) errs.push(fieldError_('dept_code', 'APP_SCOPE'));
  if (isNew && p.dept_code === undefined) errs.push(fieldError_('dept_code', 'REQUIRED'));
  if (p.priority !== undefined && p.priority !== null && p.priority !== '' && [1, 2, 3].indexOf(Number(p.priority)) < 0) errs.push(fieldError_('priority', 'PRIORITY_INVALID'));
  if (p.where !== undefined && p.where !== '' && !WHERE_.some(function (w) { return w[0] === p.where; })) errs.push(fieldError_('where', 'WHERE_INVALID'));
  if (p.period_days !== undefined && p.period_days !== null && p.period_days !== '' && !(Number(p.period_days) > 0 && Math.floor(Number(p.period_days)) === Number(p.period_days))) errs.push(fieldError_('period_days', 'PERIOD_DAYS_INVALID'));
  if (p.owner_user_id && !isUuidV4_(p.owner_user_id)) errs.push(fieldError_('owner_user_id', 'ID_INVALID'));
  var cur = isNew ? null : findOne_('Items', 'item_id', p.item_id);
  if (!isNew && (!cur || !inScope_(cur))) throw apiError_('NOT_FOUND');
  // Thêm tài liệu mới theo phiếu đề nghị ban hành mới đã chấp thuận (2d)
  var reqId = isNew && p.request_id ? String(p.request_id) : '';
  if (reqId && !isUuidV4_(reqId)) errs.push(fieldError_('request_id', 'ID_INVALID'));
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
      if (reqId) writes.push(docreqLinkItem_(ctx, reqId, row.item_id));
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
/* 12_docs: tệp trên Drive của tài khoản máy chủ ISO (thư mục dữ liệu riêng tư, không chia sẻ link).
 * Logo báo cáo (1a); PDF + tệp gốc của phiên bản (1b, entity VERSION); ảnh/tệp hồ sơ (1c, entity RECORD).
 * Tải lên và tải về đều qua máy chủ (doc.upload, doc.get) sau khi kiểm quyền; không bao giờ trả link Drive. */

var XLSX_MIME_ = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
var DOCX_MIME_ = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
var ZIP_MAGIC_ = [0x50, 0x4B, 0x03, 0x04];
var OLE_MAGIC_ = [0xD0, 0xCF, 0x11, 0xE0];

var DOC_MIME_ = {
  'image/jpeg': { magic: [0xFF, 0xD8, 0xFF], ext: 'jpg' },
  'image/png': { magic: [0x89, 0x50, 0x4E, 0x47], ext: 'png' },
  'application/pdf': { magic: [0x25, 0x50, 0x44, 0x46], ext: 'pdf' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { magic: ZIP_MAGIC_, ext: 'xlsx' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { magic: ZIP_MAGIC_, ext: 'docx' },
  'application/vnd.ms-excel': { magic: OLE_MAGIC_, ext: 'xls' },
  'application/msword': { magic: OLE_MAGIC_, ext: 'doc' }
};

/** Loại tệp theo việc: PDF bản ban hành (bắt buộc), tệp gốc để sửa lần sau (xlsx/docx); hồ sơ: ảnh trang sổ, tệp PDF/Excel/Word */
var DOC_KIND_MIMES_ = {
  PDF: ['application/pdf'],
  SOURCE: [XLSX_MIME_, DOCX_MIME_, 'application/vnd.ms-excel', 'application/msword'],
  PHOTO: ['image/jpeg', 'image/png'],
  FILE: ['application/pdf', XLSX_MIME_, DOCX_MIME_, 'application/vnd.ms-excel', 'application/msword']
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

/** Tên tệp người dùng gửi: bỏ đường dẫn và ký tự điều khiển, tối đa 120 ký tự */
function cleanFileName_(s) {
  var t = String(s || '').replace(/^.*[\\\/]/, '').replace(/[\u0000-\u001f<>:"|?*]/g, '').trim();
  return t.slice(0, 120);
}

/* ---------------- doc.upload ---------------- */

/**
 * doc.upload {document_id, entity_type: VERSION | RECORD, entity_id, kind, mime_type, file_name, content_b64, page_no?}
 *  - VERSION (phiên 1b): kind PDF | SOURCE; phiên bản phải đang là Nháp và người gửi sửa được nháp đó (versionEditable_);
 *    tải lại cùng loại → tệp cũ thôi dùng.
 *  - RECORD (phiên 1c): kind PHOTO (ảnh trang sổ ≤ 1600 px) | FILE (PDF, Excel, Word); người nộp, trưởng bộ phận, Thư ký ISO;
 *    gửi được từ hàng chờ khi có mạng lại (đi sau record.submit của cùng hồ sơ). Tối đa 30 tệp mỗi hồ sơ.
 * Trả {document_id, entity_type, entity_id, record: bản ghi sau khi gắn tệp, record_version của bản ghi đó}.
 */
function docUpload_(ctx) {
  var p = ctx.req.payload || {};
  var errs = [];
  if (!isUuidV4_(p.document_id)) errs.push(fieldError_('document_id', 'ID_INVALID'));
  var et = DOC_ENTITY_SHEETS_[p.entity_type];
  if (!et) errs.push(fieldError_('entity_type', 'INVALID_VALUE'));
  if (!isUuidV4_(p.entity_id)) errs.push(fieldError_('entity_id', 'ID_INVALID'));
  var kinds = DOC_KIND_MIMES_[p.kind];
  if (!kinds || (et && et.kinds.indexOf(p.kind) < 0)) errs.push(fieldError_('kind', 'INVALID_VALUE'));
  else if (kinds.indexOf(p.mime_type) < 0) errs.push(fieldError_('mime_type', 'FILE_TYPE'));
  if (typeof p.content_b64 !== 'string' || !p.content_b64) errs.push(fieldError_('content_b64', 'REQUIRED'));
  if (Number(ctx.req.expected_version || 0) !== 0) errs.push(fieldError_('expected_version', 'INVALID_VALUE'));
  if (errs.length) throw validationError_(errs);
  var isCapa = p.entity_type === 'CAPA';
  var isRec = p.entity_type === 'RECORD' || isCapa; // ảnh / tệp gắn thêm vào danh sách files_json (hồ sơ, phiếu khắc phục)
  if (isCapa) ensureCapaSchema_();
  var entity = findOne_(et.sheet, et.key, p.entity_id);
  if (!entity || entity.archived_at) throw validationError_([fieldError_('entity_id', 'NOT_FOUND')]);
  var it = isCapa ? null : findOne_('Items', 'item_id', entity.item_id);
  if (isCapa) {
    // Khắc phục (3a): người sửa được phiếu, người kiểm tra hiệu lực, người phụ trách hành động; phiếu Đang xử lý / Chờ kiểm tra hiệu lực
    var cx = loadCapa_(ctx, p.entity_id);
    if (!canCapaFiles_(ctx.user, cx.c, cx.acts)) {
      if (cx.c.state !== 'OPEN' && cx.c.state !== 'VERIFYING') throw validationError_([fieldError_('state', 'STATUS_INVALID')]);
      throw apiError_('FORBIDDEN');
    }
  } else if (!it || !itemVisible_(ctx.user, it)) {
    throw apiError_('FORBIDDEN');
  }
  if (isCapa) {
    // đã kiểm ở trên
  } else if (isRec) {
    if (!canRecordFiles_(ctx.user, it, entity)) throw apiError_('FORBIDDEN');
    if (entity.status === 'VOID') throw validationError_([fieldError_('state', 'STATUS_INVALID')]);
  } else {
    if (!versionEditable_(ctx.user, it, entity)) throw apiError_('FORBIDDEN');
    if (entity.state !== 'DRAFT') throw validationError_([fieldError_('state', 'STATUS_INVALID')]);
  }

  // Đã có thao tác này → không tạo thêm tệp
  var ex = findOne_('Operations', 'operation_id', ctx.req.operation_id);
  if (ex) return withWriteLock_(function () { return existingOpResponse_(ctx, ex, payloadHash_(ctx)); });
  if (findRowNums_('Documents', 'document_id', p.document_id).length) throw validationError_([fieldError_('document_id', 'ID_EXISTS')]);
  if (isRec && (entity.files_json || []).length >= (isCapa ? CAPA_MAX_FILES_ : RECORD_MAX_FILES_)) throw validationError_([fieldError_('content_b64', 'TOO_MANY_FILES')]);

  var bytes;
  try { bytes = b64d_(p.content_b64); } catch (e) { throw validationError_([fieldError_('content_b64', 'INVALID_VALUE')]); }
  if (!bytes.length) throw validationError_([fieldError_('content_b64', 'REQUIRED')]);
  if (bytes.length > Number(setting_('doc_max_bytes'))) throw validationError_([fieldError_('content_b64', 'FILE_TOO_LARGE')]);
  if (!magicOk_(bytes, p.mime_type)) throw validationError_([fieldError_('mime_type', 'FILE_TYPE')]);
  var ext = DOC_MIME_[p.mime_type].ext;
  var pageNo = Number(p.page_no) > 0 && Number(p.page_no) <= 999 ? Math.floor(Number(p.page_no)) : null;
  var codeSafe = String(isCapa ? entity.code : it.code).replace(/[\/\\]/g, '-');
  var shown = cleanFileName_(p.file_name) || (codeSafe + (isRec ? '_' + (pageNo || 1) : '') + '.' + ext);
  // Tên trên Drive dễ tìm khi mở thư mục: <mã biểu>_L<lần>[_goc]_<8 ký tự> (phiên bản) · <mã biểu>_<mã HS>_p<trang>_<8 ký tự> (hồ sơ)
  var driveName = isCapa
    ? codeSafe + '_p' + (pageNo || 0) + '_' + p.document_id.slice(0, 8) + '.' + ext
    : isRec
    ? codeSafe + '_' + entity.code + '_p' + (pageNo || 0) + '_' + p.document_id.slice(0, 8) + '.' + ext
    : codeSafe + '_L' + entity.rev + (p.kind === 'SOURCE' ? '_goc' : '') + '_' + p.document_id.slice(0, 8) + '.' + ext;
  // Drive: ngoài khóa ghi
  var folder = appFolder_();
  var file = folder.createFile(Utilities.newBlob(bytes, p.mime_type, driveName));
  var sha = b64url_(sha256_(bytes));
  var oldDriveId = '';
  var res;
  try {
    res = executeWrite_(ctx, {
      entity_type: 'DOCUMENT', entity_id: p.document_id,
      build: function () {
        if (findRowNums_('Documents', 'document_id', p.document_id).length) throw validationError_([fieldError_('document_id', 'ID_EXISTS')]);
        var eRow = findOne_(et.sheet, et.key, p.entity_id);
        if (!eRow) throw validationError_([fieldError_('entity_id', 'NOT_FOUND')]);
        var row = clone_(eRow); delete row.__row;
        var writes = [];
        var oldDocId = '';
        if (isRec) {
          if (row.status === 'VOID' || (isCapa && row.state !== 'OPEN' && row.state !== 'VERIFYING')) throw validationError_([fieldError_('state', 'STATUS_INVALID')]);
          var files = Array.isArray(row.files_json) ? row.files_json.slice() : [];
          if (files.length >= (isCapa ? CAPA_MAX_FILES_ : RECORD_MAX_FILES_)) throw validationError_([fieldError_('content_b64', 'TOO_MANY_FILES')]);
          files.push({ document_id: p.document_id, kind: p.kind, mime_type: p.mime_type, file_name: shown, size_bytes: bytes.length, page_no: pageNo || files.length + 1 });
          files.sort(function (a, b) { return (Number(a.page_no) || 0) - (Number(b.page_no) || 0); });
          row.files_json = files;
        } else {
          if (row.state !== 'DRAFT') throw validationError_([fieldError_('state', 'STATUS_INVALID')]);
          var col = p.kind === 'PDF' ? 'pdf' : 'source';
          oldDocId = row[col + '_doc_id'];
          if (oldDocId) {
            var od = findOne_('Documents', 'document_id', oldDocId);
            if (od && od.active) {
              oldDriveId = od.drive_file_id;
              var odRow = clone_(od); delete odRow.__row;
              odRow.active = false;
              cUpdate_(ctx, odRow);
              writes.push({ sheet: 'Documents', mode: 'update', row: odRow });
            }
          }
          row[col + '_doc_id'] = p.document_id;
          row[col + '_file_name'] = shown;
          row[col + '_size'] = bytes.length;
          if (col === 'source') row.source_mime = p.mime_type;
        }
        var doc = cNew_(ctx, {
          document_id: p.document_id, entity_type: p.entity_type, entity_id: p.entity_id, kind: p.kind, drive_file_id: file.getId(),
          mime_type: p.mime_type, file_name: shown, access_scope: 'PRIVATE', active: true, managed_folder_id: folder.getId(),
          owned_by_app: true, size_bytes: bytes.length, thumb_drive_file_id: '', sha256: sha, page_no: pageNo
        });
        writes.unshift({ sheet: 'Documents', mode: 'insert', row: doc });
        cUpdate_(ctx, row);
        writes.push({ sheet: et.sheet, mode: 'update', row: row });
        return {
          writes: writes,
          result: { document_id: p.document_id, entity_type: p.entity_type, entity_id: p.entity_id, record_version: row.record_version, record: projectRow_(ctx, row) },
          record_version: row.record_version,
          audit: { entity_type: 'DOCUMENT', entity_id: p.document_id, before_json: oldDocId ? { replaced: oldDocId } : null,
            after_json: { kind: p.kind, entity_type: p.entity_type, entity_id: p.entity_id, size_bytes: bytes.length, file_name: shown, page_no: pageNo } }
        };
      }
    });
  } catch (e) {
    trashQuietly_(file);
    throw e;
  }
  if (res.code === 'DUPLICATE_OPERATION') trashQuietly_(file);
  else if (oldDriveId) { try { trashQuietly_(DriveApp.getFileById(oldDriveId)); } catch (e2) { /* bỏ qua */ } }
  return res;
}

/* ---------------- doc.get ---------------- */

/**
 * doc.get {document_id}: nội dung tệp (base64) cho người xem được hồ sơ chứa tệp.
 * Phiên bản đang hiệu lực: ai thấy biểu đều tải được (bản in). Nháp, chờ duyệt, lỗi thời: cấp 2 trở lên trong bộ phận, Thư ký ISO.
 * Ảnh / tệp hồ sơ: cấp 2 trở lên trong phạm vi biểu, Thư ký ISO.
 */
function docGet_(ctx) {
  var p = ctx.req.payload || {};
  if (!isUuidV4_(p.document_id)) throw validationError_([fieldError_('document_id', 'ID_INVALID')]);
  var d = findOne_('Documents', 'document_id', p.document_id);
  if (!d || d.archived_at) throw apiError_('NOT_FOUND');
  if (d.entity_type === 'VERSION') {
    var v = findOne_('Versions', 'version_id', d.entity_id);
    var it = v ? findOne_('Items', 'item_id', v.item_id) : null;
    if (!v || !it) throw apiError_('NOT_FOUND');
    if (!itemVisible_(ctx.user, it)) throw apiError_('FORBIDDEN');
    if (v.state !== 'ISSUED' && !isSecretary_(ctx.user) && !(Number(ctx.user.role_level) >= 2 && deptWritable_(ctx.user, it.dept_code))) throw apiError_('FORBIDDEN');
  } else if (d.entity_type === 'RECORD') {
    // Ảnh / tệp hồ sơ: người xem được hồ sơ của biểu (cấp 2+ trong phạm vi, Thư ký ISO)
    var r = findOne_('Records', 'record_id', d.entity_id);
    var it2 = r ? findOne_('Items', 'item_id', r.item_id) : null;
    if (!r || !it2) throw apiError_('NOT_FOUND');
    if (!canSeeRecords_(ctx.user, it2)) throw apiError_('FORBIDDEN');
  } else if (d.entity_type === 'CAPA') {
    // Ảnh / tệp phiếu khắc phục: người xem được phiếu
    loadCapa_(ctx, d.entity_id);
    if (!d.active) throw apiError_('NOT_FOUND');
  } else if (d.entity_type === 'TPL') {
    // Kho tệp mẫu (2e): tệp đang dùng — mọi cấp; tệp đã thay — cấp 3+, Thư ký ISO
    var t = sheetExists_('TplFiles') ? findOne_('TplFiles', 'tpl_id', d.entity_id) : null;
    if (!t || !d.active) throw apiError_('NOT_FOUND');
    if (!tplVisible_(ctx.user, t)) throw apiError_('FORBIDDEN');
  } else {
    throw apiError_('FORBIDDEN');
  }
  if (Number(d.size_bytes) > Number(setting_('doc_max_bytes'))) throw validationError_([fieldError_('document_id', 'FILE_TOO_LARGE')]);
  var blob;
  try {
    var f = DriveApp.getFileById(String(d.drive_file_id));
    if (f.isTrashed()) throw new Error('trashed');
    blob = f.getBlob();
  } catch (e) {
    throw validationError_([fieldError_('document_id', 'FILE_MISSING')]);
  }
  return {
    document_id: d.document_id, kind: d.kind, file_name: d.file_name, mime_type: d.mime_type, size_bytes: d.size_bytes,
    sha256: d.sha256, content_b64: b64_(blob.getBytes())
  };
}

/* ---------------- Khôi phục từ bản chép ở tài khoản thứ hai ---------------- */

/**
 * Chạy tay sau khi dựng lại máy chủ từ bản chép (Hướng dẫn I.5 bước 4): tệp trên Drive ở bản chép có ID mới.
 * Đọc file_map.json trong thư mục DRIVE_ROOT_FOLDER_ID ({id cũ: {id: id mới, …}}) rồi đổi Documents.drive_file_id,
 * thumb_drive_file_id và logo báo cáo sang ID mới. Chạy nhiều lần vẫn đúng (ID đã đổi thì bỏ qua).
 */
function adminNoiLaiTep() {
  dbReset_();
  var folder = appFolder_();
  var it = folder.getFilesByName('file_map.json');
  if (!it.hasNext()) throw new Error('Không thấy file_map.json trong thư mục DRIVE_ROOT_FOLDER_ID — đặt thuộc tính này là thư mục dữ liệu của bản chép (SaoLuu_Phu/ISO_Data…).');
  var map = JSON.parse(it.next().getBlob().getDataAsString()) || {};
  var newId = function (old) { var m = map[old]; return m ? (typeof m === 'string' ? m : m.id) : ''; };
  var changed = 0, missing = 0, same = 0;
  var writes = [];
  readRows_('Documents').forEach(function (d) {
    var row = clone_(d); delete row.__row;
    var dirty = false;
    ['drive_file_id', 'thumb_drive_file_id'].forEach(function (k) {
      if (!row[k]) return;
      var n = newId(row[k]);
      if (n) { row[k] = n; dirty = true; } else if (k === 'drive_file_id') {
        var ok = false;
        try { ok = !DriveApp.getFileById(String(row[k])).isTrashed(); } catch (e) { ok = false; }
        if (ok) same++; else missing++;
      }
    });
    if (dirty) { row.managed_folder_id = folder.getId(); writes.push({ sheet: 'Documents', mode: 'update', row: row, rowNum: d.__row }); changed++; }
  });
  if (writes.length) systemWrite_(writes, { action: 'admin.noiLaiTep', entity_type: 'DOCUMENT', after_json: { changed: changed } });
  var logo = String(setting_('report_logo_file_id') || '');
  var logoNew = logo ? newId(logo) : '';
  if (logoNew) withWriteLock_(function () { writeSetting_('report_logo_file_id', logoNew, SYSTEM_USER); });
  log_('adminNoiLaiTep: đổi ID ' + changed + ' tệp' + (logoNew ? ' + logo báo cáo' : '') + '; ' + same + ' tệp đã đúng; ' + missing + ' tệp không có trong file_map.json và không mở được.');
  return { changed: changed, same: same, missing: missing, logo: !!logoNew };
}

// ===== 13_sync.js =====
/* 13_sync: sync.bootstrap, sync.changes, sync.push, sync.getOperationStatus (cùng giao thức như M&E, Checksheet)
 * Biểu/tài liệu chỉ gửi xuống trong phạm vi bộ phận của người dùng (itemVisible_); bộ phận, nhóm, điều khoản gửi đủ. */

var SYNC_ENTITIES_ = [
  { type: 'DEPT', sheet: 'Depts' },
  { type: 'GROUP', sheet: 'Groups' },
  { type: 'ITEM', sheet: 'Items', scoped: true },
  { type: 'CLAUSE', sheet: 'Clauses' },
  // Phiên bản (1b): theo phạm vi của biểu; cấp 1 (Tra cứu) chỉ nhận bản đang hiệu lực và lỗi thời
  { type: 'VERSION', sheet: 'Versions', scoped: 'item' },
  // Hồ sơ (1c): theo phạm vi của biểu; cấp 2+ và Thư ký ISO (cấp 1 Tra cứu không xem hồ sơ)
  { type: 'RECORD', sheet: 'Records', scoped: 'record' },
  // Ngày có hồ sơ từ M&E / Checksheet (2a): như hồ sơ — cấp 2+ và Thư ký ISO, theo phạm vi của biểu
  { type: 'EVIDENCE', sheet: 'Evidence', scoped: 'record' },
  // Phiếu đề nghị tài liệu (2d): cấp 2+ / Thư ký ISO — phiếu của mình, của bộ phận mình
  { type: 'DOCREQ', sheet: 'DocRequests', scoped: 'docreq' },
  // Sổ phân phối & thu hồi (2d): như hồ sơ — cấp 2+ và Thư ký ISO, theo phạm vi của biểu
  { type: 'DIST', sheet: 'Distributions', scoped: 'record' },
  // Kho tệp mẫu (2e): tệp đang dùng — mọi cấp; tệp đã thay — cấp 3+, Thư ký ISO; tệp đã bỏ — xóa khỏi máy (TOMBSTONE)
  { type: 'TPL', sheet: 'TplFiles', scoped: 'tpl' },
  // Khắc phục (3a): phiếu — cấp 2+ / Thư ký ISO, bộ phận mình, phiếu mình lập / phụ trách / có hành động mình phụ trách; hành động theo phiếu
  { type: 'CAPA', sheet: 'Capas', scoped: 'capa' },
  { type: 'CAPA_ACT', sheet: 'CapaActions', scoped: 'capa_act' }
];

/** Bảng đồng bộ có sheet trên máy chủ (bản mới thêm sheet mà máy chủ chưa chạy migrateSchema thì bỏ qua, không làm hỏng đăng nhập) */
function syncEntities_() {
  return SYNC_ENTITIES_.filter(function (e) { return sheetExists_(e.sheet); });
}

/** Biểu theo item_id (đọc một lần cho mỗi lượt đồng bộ) */
function syncItemMap_(aux) {
  if (!aux.items) {
    aux.items = {};
    aux.tc.rows('Items').forEach(function (r) { aux.items[r.item_id] = r; });
  }
  return aux.items;
}

/** Dòng → bản ghi gửi client; null nếu không gửi (ngoài phạm vi bộ phận) */
function syncProject_(ctx, ent, row, aux) {
  if (ent.scoped === 'docreq') return docreqVisible_(ctx.user, row) ? projectRow_(ctx, row) : null;
  if (ent.scoped === 'tpl') return tplVisible_(ctx.user, row) ? projectRow_(ctx, row) : null;
  if (ent.scoped === 'capa') return syncCapaVisible_(ctx, row, aux) ? projectRow_(ctx, row) : null;
  if (ent.scoped === 'capa_act') return syncCapaVisible_(ctx, syncCapaMap_(aux)[row.capa_id], aux) ? projectRow_(ctx, row) : null;
  if (ent.scoped === 'record') {
    return canSeeRecords_(ctx.user, syncItemMap_(aux)[row.item_id]) ? projectRow_(ctx, row) : null;
  }
  if (ent.scoped === 'item') {
    var it = syncItemMap_(aux)[row.item_id];
    if (!it || !itemVisible_(ctx.user, it)) return null;
    if (Number(ctx.user.role_level) < 2 && !isSecretary_(ctx.user) && row.state !== 'ISSUED' && row.state !== 'SUPERSEDED') return null;
    return projectRow_(ctx, row);
  }
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
  var ents = syncEntities_();
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
  var ents = syncEntities_().filter(function (ent) { return Number(stateGet_(st, 'table_rev.' + ent.sheet, 0)) > cursor; });
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
    // Dòng ngoài phạm vi áp dụng (2e): không có cột riêng — tổng trừ các loại còn lại
    skip_count: Math.max(0, (b.total_rows || 0) - (b.add_count || 0) - (b.update_count || 0) - (b.same_count || 0) - (b.error_count || 0)),
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
        // Phạm vi áp dụng (2e): dòng của bộ phận ngoài phạm vi bỏ qua (không ghi, không báo lỗi)
        var skip = !!(n.fields && n.fields.dept_code && !inScopeDept_(n.fields.dept_code));
        if (skip) { action = 'SKIP'; e = []; }
        else if (e.length) action = 'ERROR';
        else if (!cur) action = 'ADD';
        else {
          changes = itemChanges_(cur, n.fields);
          var g0 = n.group && groups[n.group.group_key];
          if (n.group && n.group.label && (!g0 || cmpVal_(g0.label) !== n.group.label)) changes.push('group_label');
          action = changes.length ? 'UPDATE' : 'SAME';
        }
        if (action === 'ADD' && n.group && !groups[n.group.group_key]) changes.push('group_label');
        if (skip) changes = [];
        var ir = {
          import_row_id: uuid_(), import_batch_id: p.import_batch_id, row_number: rn, code: n.code, entity_id: cur ? cur.item_id : '',
          action: action, expected_version: cur ? (cur.record_version || 0) : 0, validation_status: e.length ? 'ERROR' : 'OK',
          errors_json: e.length ? JSON.stringify(e.slice(0, 10)) : '', changes_json: changes.length ? JSON.stringify(changes) : '',
          committed_at: '', normalized_payload_json: e.length || skip ? '' : JSON.stringify({ fields: n.fields, group: n.group })
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
        audit: last ? { entity_type: 'IMPORT_BATCH', entity_id: p.import_batch_id, before_json: null, after_json: { file_name: b.file_name, total: b.total_rows, add: b.add_count, update: b.update_count, same: b.same_count, error: b.error_count, skip: proj.skip_count, clauses: b.clause_count, scope: scopeDepts_().join(',') } } : null
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
    // Thêm cài đặt gửi xuống app (vd scope_depts ở 2e): tăng mốc để app đang mở tải lại toàn bộ (biểu ngoài phạm vi rời máy)
    if (add.length && add.some(function (r) { var d = SETTINGS_DEFAULTS.filter(function (x) { return x[0] === r.setting_key; })[0]; return d && d[3]; })) {
      var rev = Number(stateGet_(st, 'sync_revision', 0)) + 1;
      su.sync_revision = ['INT', rev];
      su['table_rev.Settings'] = ['INT', rev];
      su.settings_rev = ['INT', rev];
    }
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

/**
 * Dán Code.gs mới mà quên chạy migrateSchema: trigger nền tự chạy migrateSchema khi schema_version của bảng tính khác mã
 * (thêm sheet/cột còn thiếu, không xóa gì). Lỗi thì để healthCheck báo, không chặn trigger.
 */
function autoMigrate_() {
  try {
    if (String(stateGet_(readState_(), 'schema_version', '')) === SCHEMA_VERSION) return false;
    migrateSchema();
    dbReset_();
    return true;
  } catch (e) {
    log_('autoMigrate_: ' + (e && e.message));
    return false;
  }
}

/** Sheet đã có trong bảng tính chưa (bản mới thêm sheet mà máy chủ chưa chạy migrateSchema) */
function sheetExists_(name) {
  if (DB_.sheets[name]) return true;
  try { sh_(name); return true; } catch (e) { return false; }
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

var TRIGGER_FUNCS_ = ['syncEvidenceHourly', 'runBackgroundJobs', 'backupData', 'sendDueMail'];

/** Xóa trigger trùng tên rồi tạo lại đúng 4 trigger định kỳ: ngày có hồ sơ từ M&E / Checksheet mỗi giờ (2a), dịch bù mỗi 3 giờ,
 *  sao lưu hằng tuần, Gmail nhắc hạn mỗi ngày lúc email_hour (2b; Gmail tắt thì trigger không làm gì). Lần đầu chạy sau khi dán
 *  Code.gs mới: Google hỏi quyền mới ("kết nối dịch vụ bên ngoài" ở 2a, "gửi email thay mặt bạn" ở 2b) — bấm Cho phép. */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (TRIGGER_FUNCS_.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncEvidenceHourly').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('runBackgroundJobs').timeBased().everyHours(3).create();
  var wd = ScriptApp.WeekDay[String(setting_('backup_weekday') || 'SUNDAY')] || ScriptApp.WeekDay.SUNDAY;
  ScriptApp.newTrigger('backupData').timeBased().onWeekDay(wd).atHour(Number(setting_('backup_hour'))).inTimezone(TZ).create();
  ScriptApp.newTrigger('sendDueMail').timeBased().everyDays(1).atHour(Number(setting_('email_hour'))).inTimezone(TZ).create();
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

/* runBackgroundJobs (dịch bù) ở 21_i18n.js; backupData (sao lưu hằng tuần) ở 23_backup.js; syncEvidenceHourly ở 18_evidence.js;
 * sendDueMail (Gmail nhắc hạn) ở 19_mail.js */

/* ---------------- Chuyển máy chủ THỬ thành THẬT (không dựng THỬ riêng) ---------------- */

var THAT_BASE_URL_ = 'https://luongquangdao8386-ops.github.io/ISO/';
/** Sheet danh mục xóa sạch khi chuyển: dữ liệu thử/mẫu; danh mục thật nhập lại từ file Excel tổng */
var THAT_WIPE_SHEETS_ = ['Items', 'Groups', 'Clauses', 'ImportBatches', 'ImportRows'];

/**
 * Chạy MỘT LẦN trong trình soạn Apps Script của máy chủ đang chạy (ENV=THU) để dùng nó làm máy chủ THẬT:
 *  - xóa biểu, nhóm, điều khoản, lô nhập đã có (dữ liệu mẫu/thử) — nhập lại file Excel tổng ngay sau đó;
 *  - xóa 4 tài khoản mẫu MAU-*; giữ owner, tài khoản khác, bộ phận, cài đặt, nhật ký, logo, sao lưu;
 *  - ENV = THAT, bỏ thuộc tính TEST_*, app_base_url → trang /ISO/, ngày bắt đầu tính hồ sơ đặt lại khi nhập danh mục;
 *  - đổi tên thư mục, bảng tính, dự án: bỏ đuôi _THU (ISO_MayChu_THU → ISO_MayChu_THAT);
 *  - đổi DATASET_EPOCH: mọi máy đăng nhập lại, tải dữ liệu từ đầu.
 * Máy chủ đã là THẬT thì không làm gì (chạy nhầm lần hai không mất dữ liệu thật). Link /exec giữ nguyên.
 */
function adminChuyenSangTHAT() {
  var props = PropertiesService.getScriptProperties();
  if (String(props.getProperty('ENV') || '').trim() === 'THAT') {
    log_('Máy chủ đã là THẬT (ENV=THAT) — không làm gì.');
    return { already: true };
  }
  if (!props.getProperty('BUSINESS_SPREADSHEET_ID')) {
    props.setProperty('ENV', 'THAT');
    log_('Chưa setup: đã đặt ENV=THAT. Chạy tiếp hàm setup.');
    return { env_only: true };
  }
  dbReset_();
  var out = withWriteLock_(function () {
    var res = { wiped: {}, users_removed: [] };
    THAT_WIPE_SHEETS_.forEach(function (name) {
      var sheet = sh_(name);
      var last = sheet.getLastRow();
      res.wiped[name] = Math.max(0, readRows_(name).length);
      if (last >= 2) sheet.getRange(2, 1, last - 1, Math.max(1, sheet.getLastColumn())).clearContent();
    });
    // Tài khoản mẫu: xóa dòng (từ dưới lên), bỏ trưởng bộ phận trỏ tới tài khoản đã xóa
    var gone = {};
    readRows_('Users').filter(function (u) { return /^MAU-/.test(String(u.employee_code || '')); })
      .sort(function (a, b) { return b.__row - a.__row; })
      .forEach(function (u) { sh_('Users').deleteRow(u.__row); gone[u.user_id] = true; res.users_removed.push(u.employee_code); });
    dbReset_();
    readRows_('Depts').forEach(function (d) {
      if (d.head_user_id && gone[d.head_user_id]) writeCells_('Depts', d.__row, { head_user_id: '' });
    });
    TEST_PROP_KEYS_.forEach(function (k) { delProp_(k); });
    setProp_('ENV', 'THAT');
    setProp_('DATASET_EPOCH', uuid_());
    clearSysCaches_();
    dbReset_();
    writeSetting_('app_base_url', THAT_BASE_URL_, SYSTEM_USER);
    writeSetting_('records_start_date', '', SYSTEM_USER);
    var st = readState_();
    var rev = Number(stateGet_(st, 'sync_revision', 0)) + 1;
    var su = { dataset_epoch: ['STRING', prop_('DATASET_EPOCH')], sync_revision: ['INT', rev] };
    THAT_WIPE_SHEETS_.concat(['Users', 'Depts', 'Settings']).forEach(function (s) { su['table_rev.' + s] = ['INT', rev]; });
    stateWrite_(st, su, SYSTEM_USER);
    writeAudit_({ user_id: SYSTEM_USER, action: 'system.env_that', entity_type: 'SYSTEM', entity_id: APP_ID, before_json: { env: 'THU' },
      after_json: { env: 'THAT', wiped: res.wiped, users_removed: res.users_removed }, auth_basis: 'SYSTEM' });
    return res;
  });
  // Đổi tên: bỏ đuôi _THU (chia sẻ, ID, link không đổi)
  var renamed = [];
  var rn = function (obj) {
    try {
      var n = obj.getName();
      if (/_THU$/.test(n)) { obj.setName(n.replace(/_THU$/, n.indexOf('MayChu') >= 0 ? '_THAT' : '')); renamed.push(n); }
    } catch (e) { log_('Không đổi được tên (' + (e && e.message) + ') — đổi tay được, không ảnh hưởng app.'); }
  };
  ['BUSINESS_SPREADSHEET_ID', 'SECURITY_SPREADSHEET_ID'].forEach(function (k) { rn(DriveApp.getFileById(props.getProperty(k))); });
  var data = DriveApp.getFolderById(props.getProperty('DRIVE_ROOT_FOLDER_ID'));
  rn(data);
  rn(DriveApp.getFolderById(props.getProperty('DRIVE_BACKUP_FOLDER_ID')));
  try { var ps = data.getParents(); if (ps.hasNext()) rn(ps.next()); } catch (e) { /* thư mục cha: đổi tay */ }
  try { rn(DriveApp.getFileById(ScriptApp.getScriptId())); } catch (e) { /* dự án gắn bảng tính hoặc không đọc được: đổi tay */ }
  clearSysCaches_();
  adminFlushAuthCache();
  var w = out.wiped;
  log_('Xong: máy chủ này là THẬT (ENV=THAT). Đã xóa dữ liệu thử: ' + w.Items + ' biểu, ' + w.Groups + ' nhóm, ' + w.Clauses + ' điều khoản, ' +
    w.ImportBatches + ' lô nhập; tài khoản mẫu: ' + (out.users_removed.join(', ') || 'không có') + '. Đổi tên: ' + (renamed.join(', ') || 'không có') +
    '. Bước tiếp: Triển khai → Quản lý → sửa → Phiên bản mới (giữ link), mở ' + THAT_BASE_URL_ + ', đăng nhập owner, Excel → Nhập lô file Excel tổng.');
  return { wiped: w, users_removed: out.users_removed, renamed: renamed };
}

// ===== 16_versions.js =====
/* 16_versions: phiên bản & ban hành (phiên 1b, mục 6.1 đặc tả).
 * Nháp DRAFT → (Gửi duyệt) IN_REVIEW → (Duyệt) APPROVED → (Ban hành) ISSUED → (bản mới ban hành) SUPERSEDED.
 * Trả lại: IN_REVIEW/APPROVED → DRAFT kèm lý do. Hủy: bản đang mở → CANCELLED. Mỗi biểu một bản đang hiệu lực, một bản đang mở.
 * ATTACH: biểu ● nhập từ Excel chưa có tệp → Thư ký ISO gắn PDF cho đúng lần ban hành đang hiệu lực rồi ban hành thẳng (không duyệt lại,
 * vì bản giấy đã ban hành), cờ "chưa có tệp" tắt.
 * Quyền: soạn — cấp 2+ trong bộ phận, Thư ký ISO; duyệt cấp bộ phận — trưởng bộ phận (cấp 3 trong bộ phận) hoặc cấp 4; cấp công ty —
 * cấp 4; người soạn không tự duyệt (cấp 4 được, admin_self_approval); ban hành — Thư ký ISO hoặc cấp 4. Quyền kiểm trước khi hỏi PIN
 * (PRECHECK_ trong 09_api). App có thể chỉ có owner + Thư ký ISO (cấp 4): hai người này làm thay trưởng bộ phận. */

/* ---------------- Quyền ---------------- */

/** Tạo phiên bản cho biểu */
function canCreateVersion_(u, it, vtype) {
  if (vtype === 'ATTACH') return isSecretary_(u);
  return isSecretary_(u) || (Number(u.role_level) >= 2 && deptWritable_(u, it.dept_code));
}

/** Sửa nháp, tải tệp, gửi duyệt, hủy: người soạn (cấp 2+ trong bộ phận), trưởng bộ phận, Thư ký ISO */
function versionEditable_(u, it, v) {
  if (isSecretary_(u)) return true;
  if (!deptWritable_(u, it.dept_code)) return false;
  if (v && v.author_id === u.user_id) return Number(u.role_level) >= 2;
  return Number(u.role_level) >= 3;
}

/** Duyệt (và trả lại bản chờ duyệt): cấp 4 mọi tài liệu (kể cả bản mình soạn khi admin_self_approval);
 *  cấp 3 tài liệu cấp bộ phận trong bộ phận mình, không phải bản mình soạn */
function canApprove_(u, it, v) {
  var lvl = Number(u.role_level);
  if (lvl >= 4) return v.author_id !== u.user_id || !!setting_('admin_self_approval');
  if (v.author_id === u.user_id) return false;
  if (it.level === 'COMPANY') return false;
  return lvl === 3 && deptWritable_(u, it.dept_code);
}

/** Trả lại: bản chờ duyệt — người duyệt được; bản đã duyệt — người duyệt hoặc người ban hành (Thư ký ISO, cấp 4) */
function canReturn_(u, it, v) {
  if (v.state === 'APPROVED' && isSecretary_(u)) return true;
  return canApprove_(u, it, v);
}

/** Hủy: người sửa được nháp (bản nháp, chờ duyệt); bản đã duyệt chỉ Thư ký ISO, cấp 4 */
function canCancelVersion_(u, it, v) {
  if (v.state === 'APPROVED') return isSecretary_(u);
  return versionEditable_(u, it, v);
}

/* ---------------- Tiện ích ---------------- */

function padRev_(n) {
  n = Number(n) || 0;
  return n < 10 ? '0' + n : String(n);
}

/** Lần ban hành kế tiếp: lớn nhất trong các bản đã ban hành / lỗi thời và lần ban hành của danh mục, cộng 1.
 *  Biểu ● nhập từ Excel không ghi lần ban hành coi như đang ở lần 01. */
function nextRev_(it, versions) {
  var base = Number(it.current_rev) || (it.status === 'ISSUED' ? 1 : 0);
  versions.forEach(function (v) {
    if (v.state === 'ISSUED' || v.state === 'SUPERSEDED') base = Math.max(base, Number(v.rev) || 0);
  });
  return padRev_(base + 1);
}

function versionsOf_(itemId) {
  return readRows_('Versions').filter(function (v) { return v.item_id === itemId && !v.archived_at; });
}

function openVersionOf_(versions, exceptId) {
  for (var i = 0; i < versions.length; i++) if (VERSION_OPEN_[versions[i].state] && versions[i].version_id !== exceptId) return versions[i];
  return null;
}

/** Phiên bản + biểu (ngoài khóa) cho kiểm quyền; NOT_FOUND khi không có, FORBIDDEN khi ngoài phạm vi */
function loadVersion_(ctx, id) {
  if (!isUuidV4_(id)) throw validationError_([fieldError_('version_id', 'ID_INVALID')]);
  var v = findOne_('Versions', 'version_id', id);
  if (!v || v.archived_at) throw apiError_('NOT_FOUND');
  var it = findOne_('Items', 'item_id', v.item_id);
  if (!it) throw apiError_('NOT_FOUND');
  if (!itemVisible_(ctx.user, it)) throw apiError_('FORBIDDEN');
  return { v: v, it: it };
}

function stateInvalid_() {
  return validationError_([fieldError_('state', 'STATUS_INVALID')]);
}

/** Đọc lại dưới khóa ghi, so expected_version; trả bản sao để sửa (không có __row) */
function lockedVersion_(ctx, id) {
  var cur = findOne_('Versions', 'version_id', id);
  if (!cur) throw apiError_('NOT_FOUND');
  assertVersion_(ctx, cur, 'VERSION', 'Versions');
  var row = clone_(cur); delete row.__row;
  return row;
}

function lockedItem_(id) {
  var cur = findOne_('Items', 'item_id', id);
  if (!cur) throw apiError_('NOT_FOUND');
  var row = clone_(cur); delete row.__row;
  return row;
}

function versionResult_(ctx, v, item) {
  var out = { entity_type: 'VERSION', entity_id: v.version_id, record_version: v.record_version, record: projectRow_(ctx, v) };
  if (item) out.item = projectRow_(ctx, item);
  return out;
}

function reasonText_(p, field, required, max) {
  var t = trimStr_(p[field]);
  if (required && !t) throw validationError_([fieldError_(field, 'REQUIRED')]);
  if (t.length > (max || 500)) throw validationError_([fieldError_(field, 'TOO_LONG')]);
  return t;
}

/* ---------------- Kiểm trước khi hỏi PIN (09_api PRECHECK_) ---------------- */

function precheckApprove_(ctx) {
  var x = loadVersion_(ctx, (ctx.req.payload || {}).version_id);
  if (!canApprove_(ctx.user, x.it, x.v)) throw apiError_('FORBIDDEN');
  if (x.v.state !== 'IN_REVIEW') throw stateInvalid_();
}

function precheckReturn_(ctx) {
  var x = loadVersion_(ctx, (ctx.req.payload || {}).version_id);
  if (!canReturn_(ctx.user, x.it, x.v)) throw apiError_('FORBIDDEN');
  if (x.v.state !== 'IN_REVIEW' && x.v.state !== 'APPROVED') throw stateInvalid_();
}

function precheckIssue_(ctx) {
  var x = loadVersion_(ctx, (ctx.req.payload || {}).version_id);
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  var ok = x.v.vtype === 'ATTACH' ? x.v.state === 'DRAFT' : x.v.state === 'APPROVED';
  if (!ok) throw stateInvalid_();
  if (!x.v.pdf_doc_id) throw validationError_([fieldError_('pdf', 'PDF_REQUIRED')]);
}

/* ---------------- version.save ---------------- */

/**
 * version.save {version_id, item_id (khi tạo), vtype: REVISION | ATTACH, change_summary_vi/zh, effective_date}
 * expected_version 0 = tạo nháp mới (lần ban hành do máy chủ cấp); khác 0 = sửa nháp. Biểu ○ có nháp đầu tiên → ◐ đang soạn.
 */
function versionSave_(ctx) {
  var p = ctx.req.payload || {};
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  var errs = [];
  if (!isUuidV4_(p.version_id)) errs.push(fieldError_('version_id', 'ID_INVALID'));
  var vtype = p.vtype === undefined || p.vtype === '' ? 'REVISION' : String(p.vtype);
  if (VERSION_TYPES_.indexOf(vtype) < 0) errs.push(fieldError_('vtype', 'INVALID_VALUE'));
  if (isNew && !isUuidV4_(p.item_id)) errs.push(fieldError_('item_id', 'ID_INVALID'));
  var eff = p.effective_date === undefined ? undefined : trimStr_(p.effective_date);
  if (eff && !isDateStr_(eff)) errs.push(fieldError_('effective_date', 'INVALID_DATE'));
  // Soạn theo phiếu đề nghị đã chấp thuận (2d): chỉ khi tạo bản REVISION mới
  var reqId = isNew && vtype === 'REVISION' && p.request_id ? String(p.request_id) : '';
  if (reqId && !isUuidV4_(reqId)) errs.push(fieldError_('request_id', 'ID_INVALID'));
  if (errs.length) throw validationError_(errs);
  var cur = null, it;
  if (isNew) {
    it = findOne_('Items', 'item_id', p.item_id);
    if (!it) throw apiError_('NOT_FOUND');
    if (!itemVisible_(ctx.user, it) || !canCreateVersion_(ctx.user, it, vtype)) throw apiError_('FORBIDDEN');
  } else {
    var x = loadVersion_(ctx, p.version_id);
    cur = x.v; it = x.it; vtype = cur.vtype || 'REVISION';
    if (!versionEditable_(ctx.user, it, cur)) throw apiError_('FORBIDDEN');
    if (cur.state !== 'DRAFT') throw stateInvalid_();
  }
  var input = clone_(p);
  if (vtype === 'ATTACH' && !trimStr_(input.change_summary_vi) && !trimStr_(input.change_summary_zh) && !cur) {
    input.change_summary_vi = 'Gắn tệp cho bản đang hiệu lực (nhập từ danh mục Excel)';
    input.change_summary_zh = '为现行版本附加文件（从Excel目录导入）';
  }
  if (vtype === 'REVISION') requireOneLang_(errs, input, cur, 'change_summary');
  if (errs.length) throw validationError_(errs);
  var tr = applyTranslations_('Versions', ['change_summary'], input, cur); // dịch ngoài khóa ghi
  return executeWrite_(ctx, {
    entity_type: 'VERSION', entity_id: p.version_id,
    build: function () {
      var row, item = null, writes = [];
      if (isNew) {
        assertNewId_('Versions', 'version_id', p.version_id);
        item = lockedItem_(p.item_id);
        var versions = versionsOf_(item.item_id);
        if (item.status === 'NA') throw validationError_([fieldError_('item_id', 'ITEM_NA')]);
        if (openVersionOf_(versions)) throw validationError_([fieldError_('item_id', 'VERSION_OPEN')]);
        var rev;
        if (vtype === 'ATTACH') {
          if (item.status !== 'ISSUED' || item.current_version_id) throw stateInvalid_();
          rev = padRev_(Number(item.current_rev) || 1);
        } else {
          rev = nextRev_(item, versions);
        }
        row = cNew_(ctx, {
          version_id: p.version_id, item_id: item.item_id, vtype: vtype, rev: rev, state: 'DRAFT', effective_date: eff || '',
          author_id: ctx.user.user_id, pdf_doc_id: '', pdf_file_name: '', pdf_size: null, source_doc_id: '', source_file_name: '',
          source_size: null, source_mime: '', submitted_at: '', submitted_by: '', approved_at: '', approved_by: '', approve_note: '',
          issued_at: '', issued_by: '', superseded_at: '', superseded_by_id: '', returned_at: '', returned_by: '', return_reason: '',
          cancelled_at: '', cancelled_by: '', cancel_reason: '', item_status_before: item.status, request_id: reqId
        });
        if (reqId) writes.push(docreqLinkVersion_(ctx, reqId, item.item_id, p.version_id));
        if (vtype === 'REVISION' && item.status === 'NONE') {
          item.status = 'DRAFTING';
          cUpdate_(ctx, item);
          writes.push({ sheet: 'Items', mode: 'update', row: item });
        } else item = null;
      } else {
        row = lockedVersion_(ctx, p.version_id);
        if (row.state !== 'DRAFT') throw stateInvalid_();
        cUpdate_(ctx, row);
        if (eff !== undefined) row.effective_date = eff;
      }
      Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
      row.i18n_meta = tr.meta;
      writes.unshift({ sheet: 'Versions', mode: isNew ? 'insert' : 'update', row: row });
      return {
        writes: writes, result: versionResult_(ctx, row, item), record_version: row.record_version,
        audit: { entity_type: 'VERSION', entity_id: row.version_id, before_json: null,
          after_json: { item_id: row.item_id, rev: row.rev, vtype: row.vtype, state: row.state, created: isNew } }
      };
    }
  });
}

/* ---------------- Chuyển trạng thái ---------------- */

/**
 * Khung chung: kiểm quyền + trạng thái (ngoài khóa), đọc lại dưới khóa, so expected_version, gọi apply(row, ctx2) để đổi.
 * apply trả {item?: dòng Items đã sửa, extra?: writes thêm, audit_after}.
 */
function versionTransition_(ctx, opts) {
  var p = ctx.req.payload || {};
  var x = loadVersion_(ctx, p.version_id);
  if (opts.allowed && !opts.allowed(ctx.user, x.it, x.v)) throw apiError_('FORBIDDEN');
  if (opts.from.indexOf(x.v.state) < 0 || (opts.check && !opts.check(x.v))) throw stateInvalid_();
  var pre = opts.prepare ? opts.prepare(p, x) : null;
  return executeWrite_(ctx, {
    entity_type: 'VERSION', entity_id: p.version_id,
    build: function () {
      var row = lockedVersion_(ctx, p.version_id);
      if (opts.from.indexOf(row.state) < 0 || (opts.check && !opts.check(row))) throw stateInvalid_();
      var before = row.state;
      cUpdate_(ctx, row);
      var out = opts.apply(row, pre) || {};
      var writes = [{ sheet: 'Versions', mode: 'update', row: row }].concat(out.extra || []);
      if (out.item) writes.push({ sheet: 'Items', mode: 'update', row: out.item });
      return {
        writes: writes, result: versionResult_(ctx, row, out.item), record_version: row.record_version,
        audit: { entity_type: 'VERSION', entity_id: row.version_id, before_json: { state: before },
          after_json: Object.assign({ state: row.state, rev: row.rev, item_id: row.item_id }, out.audit_after || {}), reason: out.reason || '' }
      };
    }
  });
}

function hasPdf_(v) { return !!v.pdf_doc_id; }

/** version.submit {version_id}: Nháp → Chờ duyệt (cần PDF). Bản ATTACH không qua duyệt. */
function versionSubmit_(ctx) {
  var x0 = loadVersion_(ctx, (ctx.req.payload || {}).version_id);
  if (versionEditable_(ctx.user, x0.it, x0.v) && x0.v.state === 'DRAFT' && x0.v.vtype !== 'ATTACH' && !hasPdf_(x0.v)) {
    throw validationError_([fieldError_('pdf', 'PDF_REQUIRED')]);
  }
  return versionTransition_(ctx, {
    allowed: versionEditable_, from: ['DRAFT'],
    check: function (v) { return v.vtype !== 'ATTACH' && hasPdf_(v); },
    apply: function (row) {
      row.state = 'IN_REVIEW';
      row.submitted_at = isoVN_(now_());
      row.submitted_by = ctx.user.user_id;
    }
  });
}

/** version.approve {version_id, note}: Chờ duyệt → Đã duyệt (PIN) */
function versionApprove_(ctx) {
  return versionTransition_(ctx, {
    allowed: canApprove_, from: ['IN_REVIEW'],
    prepare: function (p) { return { note: reasonText_(p, 'note', false, 500) }; },
    apply: function (row, pre) {
      row.state = 'APPROVED';
      row.approved_at = isoVN_(now_());
      row.approved_by = ctx.user.user_id;
      row.approve_note = pre.note;
      return { audit_after: { self: row.author_id === ctx.user.user_id } };
    }
  });
}

/** version.return {version_id, reason}: Chờ duyệt / Đã duyệt → Nháp kèm lý do (PIN) */
function versionReturn_(ctx) {
  return versionTransition_(ctx, {
    allowed: canReturn_, from: ['IN_REVIEW', 'APPROVED'],
    prepare: function (p) { return { reason: reasonText_(p, 'reason', true, 500) }; },
    apply: function (row, pre) {
      row.state = 'DRAFT';
      row.returned_at = isoVN_(now_());
      row.returned_by = ctx.user.user_id;
      row.return_reason = pre.reason;
      row.approved_at = ''; row.approved_by = ''; row.approve_note = '';
      return { reason: pre.reason };
    }
  });
}

/** version.cancel {version_id, reason}: hủy bản đang mở. Biểu ○ thành ◐ vì bản nháp này thì trả về ○. */
function versionCancel_(ctx) {
  return versionTransition_(ctx, {
    allowed: canCancelVersion_, from: ['DRAFT', 'IN_REVIEW', 'APPROVED'],
    prepare: function (p) { return { reason: reasonText_(p, 'reason', false, 500) }; },
    apply: function (row, pre) {
      row.state = 'CANCELLED';
      row.cancelled_at = isoVN_(now_());
      row.cancelled_by = ctx.user.user_id;
      row.cancel_reason = pre.reason;
      var item = lockedItem_(row.item_id);
      var rq = docreqUnlinkVersion_(ctx, row.request_id, row.version_id);
      var extra = rq ? [rq] : [];
      if (row.item_status_before === 'NONE' && item.status === 'DRAFTING' && !item.current_version_id &&
        !openVersionOf_(versionsOf_(item.item_id), row.version_id)) {
        item.status = 'NONE';
        cUpdate_(ctx, item);
        return { item: item, extra: extra, reason: pre.reason };
      }
      return { extra: extra, reason: pre.reason };
    }
  });
}

/**
 * version.issue {version_id}: Thư ký ISO / cấp 4 ban hành (PIN).
 * REVISION: Đã duyệt → Đang hiệu lực; bản đang hiệu lực trước → Lỗi thời; danh mục: lần ban hành, ngày ban hành = hôm nay,
 * hạn rà soát = ngày ban hành + doc_review_months, tình trạng ●, tắt cờ chưa có tệp.
 * ATTACH: Nháp (có PDF) → Đang hiệu lực, giữ lần và ngày ban hành của danh mục.
 */
function versionIssue_(ctx) {
  return versionTransition_(ctx, {
    allowed: function (u) { return isSecretary_(u); },
    from: ['APPROVED', 'DRAFT'],
    check: function (v) { return hasPdf_(v) && (v.vtype === 'ATTACH' ? v.state === 'DRAFT' : v.state === 'APPROVED'); },
    apply: function (row) {
      var today = todayVN_();
      var nowIso = isoVN_(now_());
      var item = lockedItem_(row.item_id);
      if (item.status === 'NA') throw validationError_([fieldError_('item_id', 'ITEM_NA')]);
      var extra = [];
      var superseded = [];
      versionsOf_(item.item_id).forEach(function (o) {
        if (o.version_id === row.version_id || o.state !== 'ISSUED') return;
        var r = clone_(o); delete r.__row;
        r.state = 'SUPERSEDED';
        r.superseded_at = nowIso;
        r.superseded_by_id = row.version_id;
        cUpdate_(ctx, r);
        extra.push({ sheet: 'Versions', mode: 'update', row: r });
        superseded.push(r.rev);
      });
      var months = Number(setting_('doc_review_months') || 12);
      // Ngày bắt đầu tính hồ sơ (1c): giữ ngày của lần ban hành đầu, không lùi về sau khi ban hành lại
      var startBefore = item.status === 'ISSUED' ? recordsStart_(item, String(setting_('records_start_date') || '')) : '';
      if (row.vtype === 'ATTACH') {
        row.issued_at = item.issued_at || today;
        if (!item.issued_at) item.issued_at = row.issued_at;
        if (!item.review_due) item.review_due = addMonthsIso_(item.issued_at, months);
        if (!item.current_rev) item.current_rev = row.rev;
        item.issued_source = item.issued_source || 'IMPORT';
      } else {
        row.issued_at = today;
        item.issued_at = today;
        item.current_rev = row.rev;
        item.review_due = addMonthsIso_(today, months);
        item.issued_source = 'APP';
        if (!item.records_from) item.records_from = startBefore || (row.effective_date && row.effective_date > today ? row.effective_date : today);
      }
      if (!row.effective_date) row.effective_date = row.issued_at;
      row.state = 'ISSUED';
      row.issued_by = ctx.user.user_id;
      item.current_version_id = row.version_id;
      item.status = 'ISSUED';
      item.file_missing = false;
      item.na_reason = '';
      item.na_prev_status = '';
      cUpdate_(ctx, item);
      // Phiếu đề nghị soạn phiên bản này (2d) → Đã thực hiện
      var rq = docreqOnIssue_(ctx, row.request_id, row);
      if (rq) extra.push(rq);
      return { item: item, extra: extra, audit_after: { superseded: superseded, review_due: item.review_due, vtype: row.vtype, request_id: row.request_id || '' } };
    }
  });
}

/* ---------------- item.setNa, item.review (Thư ký ISO, cấp 4, PIN) ---------------- */

/**
 * item.setNa {item_id, na: true, reason} — ngừng dùng biểu (✕), hồ sơ cũ giữ nguyên; {na: false} — dùng lại (về tình trạng trước).
 * Không đặt ✕ khi biểu còn phiên bản đang mở (hủy hoặc ban hành trước).
 */
function itemSetNa_(ctx) {
  var p = ctx.req.payload || {};
  if (!isUuidV4_(p.item_id)) throw validationError_([fieldError_('item_id', 'ID_INVALID')]);
  var na = p.na !== false;
  // Theo phiếu đề nghị hủy đã chấp thuận (2d): phiếu → Đã thực hiện; lý do mặc định lấy mã phiếu
  var reqId = na && p.request_id ? String(p.request_id) : '';
  if (reqId && !isUuidV4_(reqId)) throw validationError_([fieldError_('request_id', 'ID_INVALID')]);
  if (reqId && !trimStr_(p.reason)) {
    var rq0 = sheetExists_('DocRequests') ? findOne_('DocRequests', 'request_id', reqId) : null;
    if (rq0) p = Object.assign({}, p, { reason: lab_('dr.na_reason', { C: rq0.code }) });
  }
  var reason = na ? reasonText_(p, 'reason', true, 300) : '';
  var it0 = findOne_('Items', 'item_id', p.item_id);
  if (!it0) throw apiError_('NOT_FOUND');
  return executeWrite_(ctx, {
    entity_type: 'ITEM', entity_id: p.item_id,
    build: function () {
      var cur = findOne_('Items', 'item_id', p.item_id);
      if (!cur) throw apiError_('NOT_FOUND');
      assertVersion_(ctx, cur, 'ITEM', 'Items');
      var row = clone_(cur); delete row.__row;
      var before = row.status;
      if (na) {
        if (row.status === 'NA') throw stateInvalid_();
        if (openVersionOf_(versionsOf_(row.item_id))) throw validationError_([fieldError_('item_id', 'VERSION_OPEN')]);
        row.na_prev_status = row.status;
        row.status = 'NA';
        row.na_reason = reason;
      } else {
        if (row.status !== 'NA') throw stateInvalid_();
        var back = ITEM_STATUS_.indexOf(row.na_prev_status) >= 0 && row.na_prev_status !== 'NA' ? row.na_prev_status : '';
        row.status = back || (row.current_version_id || (row.issued_source === 'IMPORT' && row.issued_at) ? 'ISSUED' : 'NONE');
        row.na_reason = '';
        row.na_prev_status = '';
      }
      cUpdate_(ctx, row);
      var writes = [{ sheet: 'Items', mode: 'update', row: row }];
      if (reqId) writes.push(docreqOnNa_(ctx, reqId, row.item_id));
      return {
        writes: writes,
        result: { entity_type: 'ITEM', entity_id: row.item_id, record_version: row.record_version, record: projectRow_(ctx, row) },
        record_version: row.record_version,
        audit: { entity_type: 'ITEM', entity_id: row.item_id, before_json: { status: before }, after_json: { status: row.status, request_id: reqId }, reason: reason }
      };
    }
  });
}

/**
 * item.review {item_id, note}: đã rà soát định kỳ, tài liệu giữ nguyên — hạn rà soát mới = hôm nay + doc_review_months.
 * Chỉ biểu đang hiệu lực (●). Sửa nội dung thì soạn phiên bản mới thay vì bấm nút này.
 */
function itemReview_(ctx) {
  var p = ctx.req.payload || {};
  if (!isUuidV4_(p.item_id)) throw validationError_([fieldError_('item_id', 'ID_INVALID')]);
  var note = reasonText_(p, 'note', false, 300);
  return executeWrite_(ctx, {
    entity_type: 'ITEM', entity_id: p.item_id,
    build: function () {
      var cur = findOne_('Items', 'item_id', p.item_id);
      if (!cur) throw apiError_('NOT_FOUND');
      assertVersion_(ctx, cur, 'ITEM', 'Items');
      if (cur.status !== 'ISSUED') throw stateInvalid_();
      var row = clone_(cur); delete row.__row;
      var before = row.review_due;
      row.review_due = addMonthsIso_(todayVN_(), Number(setting_('doc_review_months') || 12));
      row.reviewed_at = isoVN_(now_());
      row.reviewed_by = ctx.user.user_id;
      cUpdate_(ctx, row);
      return {
        writes: [{ sheet: 'Items', mode: 'update', row: row }],
        result: { entity_type: 'ITEM', entity_id: row.item_id, record_version: row.record_version, record: projectRow_(ctx, row) },
        record_version: row.record_version,
        audit: { entity_type: 'ITEM', entity_id: row.item_id, before_json: { review_due: before }, after_json: { review_due: row.review_due }, reason: note }
      };
    }
  });
}

// ===== 17_records.js =====
/* 17_records: hồ sơ (phiên 1c, mục 6.2–6.3 đặc tả).
 * Nộp hồ sơ: record.submit (làm được khi mất mạng, vào hàng chờ) rồi doc.upload từng ảnh / tệp (entity RECORD) đi sau.
 * Ghi nhận ngay, không chờ duyệt; trưởng bộ phận / Thư ký ISO trả lại hồ sơ nộp sai (record.return, PIN) → kỳ đó tính lại như chưa có.
 * Một lần nộp phủ một kỳ hoặc một khoảng ngày (vd cả quyển sổ tháng 10 của biểu hằng ngày): kỳ nào giao với khoảng đó là có hồ sơ.
 * Tình trạng hồ sơ theo kỳ (record.status, bộ đệm 5 phút): ✓ Đúng hạn · ! Quá hạn (kỳ đã kết thúc quá record_grace_days ngày mà chưa có)
 * · – Chưa tới hạn · Không tính (biểu chưa ban hành, không áp dụng, in từ M&E/Checksheet, kỳ trước ngày bắt đầu tính). Biểu khi phát
 * sinh (EVENT) không bao giờ quá hạn, chỉ có lần nộp gần nhất. App tính giống hệt ở js/periods.js (dùng được khi mất mạng).
 * Đợt 2 (2a): kỳ cũng ✓ khi app M&E / Checksheet có hồ sơ trong kỳ (sheet Evidence, 18_evidence.js); biểu nơi làm M&E / Checksheet
 * được tính khi app đó đã nối (Settings.evidence_sources), kỳ trước khoảng còn giữ ngày từ app kia (evidenceFrom_) không tính. */

/* ---------------- Quyền ---------------- */

/** Nộp hồ sơ: cấp 2+ trong bộ phận của biểu, Thư ký ISO, cấp 4 (Thư ký nộp thay các bộ phận) */
function canSubmitRecord_(u, it) {
  return isSecretary_(u) || (Number(u.role_level) >= 2 && deptWritable_(u, it.dept_code));
}

/** Trả lại hồ sơ nộp sai: trưởng bộ phận (cấp 3 trong bộ phận), Thư ký ISO, cấp 4 */
function canReturnRecord_(u, it) {
  return isSecretary_(u) || (Number(u.role_level) >= 3 && deptWritable_(u, it.dept_code));
}

/** Xem hồ sơ, bảng kỳ, tệp hồ sơ: cấp 2+ hoặc Thư ký ISO, trong phạm vi biểu (cấp 1 Tra cứu không xem tổng hợp) */
function canSeeRecords_(u, it) {
  return !!it && (isSecretary_(u) || Number(u.role_level) >= 2) && itemVisible_(u, it);
}

/** Gắn tệp cho hồ sơ: người nộp, trưởng bộ phận, Thư ký ISO */
function canRecordFiles_(u, it, rec) {
  if (isSecretary_(u)) return true;
  if (!deptWritable_(u, it.dept_code)) return false;
  return rec.submitted_by === u.user_id ? Number(u.role_level) >= 2 : Number(u.role_level) >= 3;
}

/** Biểu nhận hồ sơ: ● đang hiệu lực hoặc ◐ đang soạn (sổ giấy đang dùng); không nhận ○ chưa có biểu, ✕ ngừng dùng,
 *  biểu in từ M&E / Checksheet (ngày có hồ sơ lấy từ app kia ở Đợt 2). "Một phần M&E/Checksheet" vẫn nộp bổ sung được. */
function recordItemCheck_(it) {
  if (!it || it.status === 'NA' || it.status === 'NONE' || !it.status) return 'ITEM_NO_RECORD';
  if (it.where === 'ME' || it.where === 'CS') return 'RECORD_FROM_APP';
  return '';
}

/* ---------------- Tiện ích ---------------- */

/**
 * Dán Code.gs 1c mà chưa chạy migrateSchema: lần nộp hồ sơ đầu tiên tự thêm sheet Records (và cột Items.records_from) —
 * hồ sơ trong hàng chờ của iPhone không bị từ chối chỉ vì máy chủ thiếu sheet.
 */
function ensureRecordsSheet_() {
  if (sheetExists_('Records')) return;
  autoMigrate_();
  dbReset_();
  if (!sheetExists_('Records')) throw apiError_('SYSTEM_NOT_READY');
}

function loadRecord_(ctx, id) {
  ensureRecordsSheet_();
  if (!isUuidV4_(id)) throw validationError_([fieldError_('record_id', 'ID_INVALID')]);
  var r = findOne_('Records', 'record_id', id);
  if (!r || r.archived_at) throw apiError_('NOT_FOUND');
  var it = findOne_('Items', 'item_id', r.item_id);
  if (!it) throw apiError_('NOT_FOUND');
  if (!canSeeRecords_(ctx.user, it)) throw apiError_('FORBIDDEN');
  return { r: r, it: it };
}

function recordResult_(ctx, row) {
  return { entity_type: 'RECORD', entity_id: row.record_id, record_version: row.record_version, record: projectRow_(ctx, row) };
}

/** Loại kỳ của biểu: cột period_type, không có thì suy từ chu kỳ hồ sơ (ngày) */
function itemPeriodType_(it) {
  return PERIOD_TYPES_.indexOf(it.period_type) >= 0 ? it.period_type : periodTypeFromDays_(it.period_days);
}

/**
 * Ngày bắt đầu tính hồ sơ của biểu (mục 6.3): records_from (đặt khi ban hành lần đầu trong app, không lùi khi ban hành lại);
 * biểu ● nhập từ Excel = records_start_date (Cài đặt), muộn hơn thì ngày ban hành ở cột V; còn lại = ngày ban hành.
 */
function recordsStart_(it, startSetting) {
  if (it.records_from) return String(it.records_from);
  if (it.issued_source === 'IMPORT') {
    if (startSetting && it.issued_at && String(it.issued_at) > startSetting) return String(it.issued_at);
    return startSetting || String(it.issued_at || '');
  }
  return String(it.issued_at || '');
}

/**
 * Biểu có tính hồ sơ không: {type, counted, reason, start, src}. reason: NOT_ISSUED (○ ◐ ✕) · FROM_APP (nơi làm M&E / Checksheet
 * mà app đó chưa nối) · NO_START (chưa có ngày bắt đầu tính). src: app đã nối cung cấp ngày có hồ sơ cho biểu ('' nếu không) —
 * khi đó ngày bắt đầu tính không sớm hơn evidenceFrom_ (kỳ cũ hơn không còn ngày từ app kia: không tính, không báo quá hạn).
 * Giống hệt countInfo() trong js/periods.js.
 */
function recordCountInfo_(it, startSetting, today, srcs) {
  var type = itemPeriodType_(it);
  var src = evidenceSourceOf_(it);
  var live = !!(src && srcs && srcs[src]);
  var reason = it.status !== 'ISSUED' ? 'NOT_ISSUED' : ((it.where === 'ME' || it.where === 'CS') && !live ? 'FROM_APP' : '');
  var start = reason ? '' : recordsStart_(it, startSetting);
  if (!reason && !isDateStr_(start)) { reason = 'NO_START'; start = ''; }
  if (!reason && live && type !== 'EVENT') {
    var ef = evidenceFrom_(type, today);
    if (ef > start) start = ef;
  }
  return { type: type, counted: !reason, reason: reason, start: start, src: live ? src : '' };
}

/**
 * Tình trạng hồ sơ của một biểu: n kỳ gần nhất (cũ → mới) và kỳ "đến hạn xét" gần nhất.
 * recs: hồ sơ SUBMITTED của biểu; evs: dòng Evidence (ngày có hồ sơ từ M&E / Checksheet) của biểu; srcs: app đã nối {ME, CS}.
 * Trả {type, counted, reason, start, src, cells:[{key, from, to, st}], due_key, due_st, overdue, late_n, last_date, count}.
 * Ô OK khi có hồ sơ giao với kỳ hoặc dòng Evidence (số lượt > 0) giao với kỳ. count = số hồ sơ + số lượt từ app kia.
 * Kỳ "đến hạn xét" = kỳ mới nhất đã kết thúc quá số ngày cho phép trễ; Quá hạn ở đó → biểu tính là "hồ sơ quá hạn" ở trang chủ.
 * Giống hệt itemRecordStatus() trong js/periods.js.
 */
function itemRecordStatus_(it, recs, today, grace, startSetting, n, evs, srcs) {
  evs = evs || [];
  var ci = recordCountInfo_(it, startSetting, today, srcs);
  var type = ci.type, counted = ci.counted, start = ci.start;
  var last = '', cnt = recs.length;
  recs.forEach(function (r) { var d = String(r.period_to || r.record_date || ''); if (d > last) last = d; });
  evs.forEach(function (e) { var d = String(e.last_date || ''); if (d > last) last = d; cnt += Number(e.count) || 0; });
  var out = { type: type, counted: counted, reason: ci.reason, start: start, src: ci.src, cells: [], due_key: '', due_st: '', overdue: false, late_n: 0, last_date: last, count: cnt };
  if (type === 'EVENT') return out;
  var cellState = function (p) { return periodCellState_(p, recs, evs, counted, start, today, grace); };
  lastPeriods_(type, today, n).forEach(function (p) {
    var s = cellState(p);
    if (s === 'LATE') out.late_n++;
    out.cells.push({ key: p.key, from: p.from, to: p.to, st: s });
  });
  if (counted) {
    var p = periodOf_(type, today);
    for (var g = 0; g < 800 && p && !(addDaysIso_(p.to, grace) < today); g++) p = periodOf_(type, addDaysIso_(p.from, -1));
    if (p && p.to >= start) {
      out.due_key = p.key;
      out.due_st = cellState(p);
      out.overdue = out.due_st === 'LATE';
    }
  }
  return out;
}

/**
 * Tình trạng một kỳ p = {from, to} của biểu: OK khi có hồ sơ SUBMITTED hoặc dòng Evidence (số lượt > 0) giao với kỳ;
 * NA khi biểu không tính hoặc kỳ kết thúc trước ngày bắt đầu tính; LATE khi kỳ kết thúc quá số ngày cho phép trễ; còn lại DUE.
 * Dùng chung cho bảng kỳ (itemRecordStatus_) và báo cáo tình trạng hồ sơ (27_reports.js). Giống periodCell() trong js/periods.js.
 */
function periodCellState_(p, recs, evs, counted, start, today, grace) {
  for (var i = 0; i < recs.length; i++) if (String(recs[i].period_from) <= p.to && String(recs[i].period_to) >= p.from) return 'OK';
  for (var j = 0; j < evs.length; j++) if (Number(evs[j].count) > 0 && String(evs[j].period_from) <= p.to && String(evs[j].period_to) >= p.from) return 'OK';
  if (!counted || p.to < start) return 'NA';
  return addDaysIso_(p.to, grace) < today ? 'LATE' : 'DUE';
}

function graceDays_() {
  var g = Number(setting_('record_grace_days'));
  return g >= 0 ? Math.floor(g) : 3;
}

/* ---------------- record.submit ---------------- */

/**
 * record.submit {record_id, item_id, period_from, period_to, record_date?, pages, note?} — expected_version 0.
 * Mã HS-yymm-0001 do máy chủ cấp. pages = số ảnh / tệp sẽ gửi sau bằng doc.upload (1–30). Khoảng ngày tối đa 400 ngày.
 */
function recordSubmit_(ctx) {
  var p = ctx.req.payload || {};
  var errs = [];
  if (!isUuidV4_(p.record_id)) errs.push(fieldError_('record_id', 'ID_INVALID'));
  if (!isUuidV4_(p.item_id)) errs.push(fieldError_('item_id', 'ID_INVALID'));
  if (Number(ctx.req.expected_version || 0) !== 0) errs.push(fieldError_('expected_version', 'INVALID_VALUE'));
  var from = trimStr_(p.period_from), to = trimStr_(p.period_to);
  if (!isDateStr_(from)) errs.push(fieldError_('period_from', 'INVALID_DATE'));
  if (!isDateStr_(to)) errs.push(fieldError_('period_to', 'INVALID_DATE'));
  var rdate = p.record_date === undefined || p.record_date === null ? '' : trimStr_(p.record_date);
  if (rdate && !isDateStr_(rdate)) errs.push(fieldError_('record_date', 'INVALID_DATE'));
  var pages = Number(p.pages);
  if (!(pages >= 1 && pages <= RECORD_MAX_FILES_ && Math.floor(pages) === pages)) errs.push(fieldError_('pages', 'PAGES_INVALID'));
  var note = trimStr_(p.note);
  if (note.length > 500) errs.push(fieldError_('note', 'TOO_LONG'));
  if (errs.length) throw validationError_(errs);
  var today = todayVN_();
  if (from > to) errs.push(fieldError_('period_to', 'RANGE_INVALID'));
  else if (daysBetweenIso_(from, to) >= RECORD_MAX_RANGE_DAYS_) errs.push(fieldError_('period_to', 'RANGE_TOO_LONG'));
  if (from < '2000-01-01' || from > addDaysIso_(today, 31)) errs.push(fieldError_('period_from', 'DATE_OUT_OF_RANGE'));
  if (errs.length) throw validationError_(errs);
  ensureRecordsSheet_();
  var it = findOne_('Items', 'item_id', p.item_id);
  if (!it || it.archived_at) throw validationError_([fieldError_('item_id', 'NOT_FOUND')]);
  if (!itemVisible_(ctx.user, it) || !canSubmitRecord_(ctx.user, it)) throw apiError_('FORBIDDEN');
  var bad = recordItemCheck_(it);
  if (bad) throw validationError_([fieldError_('item_id', bad)]);
  if (!rdate) rdate = to < today ? to : (from > today ? from : today);
  return executeWrite_(ctx, {
    entity_type: 'RECORD', entity_id: p.record_id,
    build: function (st) {
      assertNewId_('Records', 'record_id', p.record_id);
      var cur = findOne_('Items', 'item_id', p.item_id);
      var bad2 = recordItemCheck_(cur);
      if (bad2) throw validationError_([fieldError_('item_id', bad2)]);
      var su = {};
      var code = allocCode_(st, su, 'RECORD', now_());
      var row = cNew_(ctx, {
        record_id: p.record_id, code: code, item_id: cur.item_id, dept_code: cur.dept_code, period_type: itemPeriodType_(cur),
        period_from: from, period_to: to, record_date: rdate, pages: pages, files_json: [], note: note, status: 'SUBMITTED',
        submitted_at: isoVN_(now_()), submitted_by: ctx.user.user_id, client_created_at: String(ctx.req.client_time || '').slice(0, 40),
        returned_at: '', returned_by: '', return_reason: '', void_at: '', void_by: '', void_reason: ''
      });
      return {
        writes: [{ sheet: 'Records', mode: 'insert', row: row }], state: su,
        result: recordResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'RECORD', entity_id: row.record_id, before_json: null,
          after_json: { code: code, item_id: row.item_id, period_from: from, period_to: to, pages: pages, via_queue: !!ctx.viaPush } }
      };
    }
  });
}

/* ---------------- record.return (trưởng bộ phận, Thư ký ISO; PIN) ---------------- */

/** Kiểm quyền + trạng thái trước khi hỏi PIN (09_api PRECHECK_) */
function precheckRecordReturn_(ctx) {
  var x = loadRecord_(ctx, (ctx.req.payload || {}).record_id);
  if (!canReturnRecord_(ctx.user, x.it)) throw apiError_('FORBIDDEN');
  if (x.r.status !== 'SUBMITTED') throw validationError_([fieldError_('state', 'STATUS_INVALID')]);
}

/** record.return {record_id, reason}: hồ sơ nộp sai → RETURNED kèm lý do; kỳ đó tính lại như chưa có, người nộp thấy ở Chờ bạn xử lý */
function recordReturn_(ctx) {
  var p = ctx.req.payload || {};
  var x = loadRecord_(ctx, p.record_id);
  if (!canReturnRecord_(ctx.user, x.it)) throw apiError_('FORBIDDEN');
  if (x.r.status !== 'SUBMITTED') throw validationError_([fieldError_('state', 'STATUS_INVALID')]);
  var reason = trimStr_(p.reason);
  if (!reason) throw validationError_([fieldError_('reason', 'REQUIRED')]);
  if (reason.length > 500) throw validationError_([fieldError_('reason', 'TOO_LONG')]);
  return executeWrite_(ctx, {
    entity_type: 'RECORD', entity_id: p.record_id,
    build: function () {
      var cur = findOne_('Records', 'record_id', p.record_id);
      if (!cur) throw apiError_('NOT_FOUND');
      assertVersion_(ctx, cur, 'RECORD', 'Records');
      if (cur.status !== 'SUBMITTED') throw validationError_([fieldError_('state', 'STATUS_INVALID')]);
      var row = clone_(cur); delete row.__row;
      row.status = 'RETURNED';
      row.returned_at = isoVN_(now_());
      row.returned_by = ctx.user.user_id;
      row.return_reason = reason;
      cUpdate_(ctx, row);
      return {
        writes: [{ sheet: 'Records', mode: 'update', row: row }], result: recordResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'RECORD', entity_id: row.record_id, before_json: { status: 'SUBMITTED' },
          after_json: { status: 'RETURNED', code: row.code, item_id: row.item_id }, reason: reason }
      };
    }
  });
}

/* ---------------- record.status (máy chủ tính, bộ đệm 5 phút) ---------------- */

var CELL_FROM_CODE_ = { O: 'OK', L: 'LATE', D: 'DUE', N: 'NA' };

/**
 * Tình trạng hồ sơ của mọi biểu, gọn để đệm: {today, grace, start_setting, sources, n, items: {item_id: [type, counted, reason, start,
 * chuỗi ô (O L D N, cũ → mới), due_key, due_st, late_n, last_date, count, src]}}. Khóa đệm theo phiên bản bảng Items/Records/Evidence,
 * hôm nay, số ngày cho phép trễ, ngày bắt đầu tính, app đã nối → không bao giờ trả số cũ sau khi có ghi; hết hạn sau
 * record_status_cache_seconds.
 */
function recordStatusAll_() {
  var st = readState_();
  var today = todayVN_();
  var grace = graceDays_();
  var startSet = String(setting_('records_start_date') || '');
  var srcs = evidenceSources_();
  var srcStr = evidenceSourcesStr_(srcs);
  var n = 12;
  var key = 'rs2:' + (sysProps_().dataset_epoch || '') + ':' + Number(stateGet_(st, 'table_rev.Records', 0)) + ':' +
    Number(stateGet_(st, 'table_rev.Items', 0)) + ':' + Number(stateGet_(st, 'table_rev.Evidence', 0)) + ':' + today + ':' + grace + ':' +
    startSet + ':' + srcStr + ':' + (st.map.schema_version || '');
  var c = cache_();
  try { var hit = c.get(key); if (hit) return JSON.parse(hit); } catch (e) { /* tính lại */ }
  var hasRec = sheetExists_('Records'), hasEv = sheetExists_('Evidence');
  var tc = tableCache_(['Items'].concat(hasRec ? ['Records'] : [], hasEv ? ['Evidence'] : []), st);
  var byItem = {}, evByItem = {};
  if (hasRec) {
    tc.rows('Records').forEach(function (r) {
      if (r.archived_at || r.status !== 'SUBMITTED') return;
      (byItem[r.item_id] = byItem[r.item_id] || []).push(r);
    });
  }
  if (hasEv) {
    tc.rows('Evidence').forEach(function (e) {
      if (e.archived_at || !(Number(e.count) > 0)) return;
      (evByItem[e.item_id] = evByItem[e.item_id] || []).push(e);
    });
  }
  var out = { today: today, grace: grace, start_setting: startSet, sources: srcStr, n: n, items: {} };
  tc.rows('Items').forEach(function (it) {
    if (it.archived_at) return;
    var s = itemRecordStatus_(it, byItem[it.item_id] || [], today, grace, startSet, n, evByItem[it.item_id] || [], srcs);
    out.items[it.item_id] = [s.type, s.counted ? 1 : 0, s.reason, s.start, s.cells.map(function (x) { return CELL_CODES_[x.st]; }).join(''),
      s.due_key, s.due_st ? CELL_CODES_[s.due_st] : '', s.late_n, s.last_date, s.count, s.src];
  });
  try {
    var ttl = Math.max(60, Math.min(21600, Number(setting_('record_status_cache_seconds')) || 300));
    c.put(key, JSON.stringify(out), ttl);
  } catch (e2) { /* đệm đầy: bỏ qua */ }
  return out;
}

/** Bản gọn → bản đủ cho một biểu (mã kỳ tính lại từ loại kỳ và hôm nay) */
function expandRecordStatus_(it, a, today, n) {
  var cells = [];
  if (a[0] !== 'EVENT') {
    var ps = lastPeriods_(a[0], today, n);
    for (var i = 0; i < ps.length; i++) cells.push({ key: ps[i].key, from: ps[i].from, to: ps[i].to, st: CELL_FROM_CODE_[a[4].charAt(i)] || 'NA' });
  }
  return {
    item_id: it.item_id, code: it.code, dept_code: it.dept_code, type: a[0], counted: !!a[1], reason: a[2], start: a[3], cells: cells,
    due_key: a[5], due_st: a[6] ? CELL_FROM_CODE_[a[6]] : '', overdue: a[6] === 'L', late_n: a[7], last_date: a[8], count: a[9], src: a[10] || ''
  };
}

/**
 * record.status {dept_code?, item_id?}: tình trạng hồ sơ 12 kỳ gần nhất của các biểu người dùng xem được (cấp 2+, Thư ký ISO).
 * Trả {today, grace, start_setting, items: [...], overdue_count}.
 */
function recordStatus_(ctx) {
  var p = ctx.req.payload || {};
  var all = recordStatusAll_();
  var items = tableCache_(['Items'], readState_()).rows('Items');
  var list = [];
  var overdue = 0;
  items.forEach(function (it) {
    if (it.archived_at || !all.items[it.item_id] || !canSeeRecords_(ctx.user, it)) return;
    if (p.dept_code && it.dept_code !== p.dept_code) return;
    if (p.item_id && it.item_id !== p.item_id) return;
    var s = expandRecordStatus_(it, all.items[it.item_id], all.today, all.n);
    if (s.overdue) overdue++;
    list.push(s);
  });
  return { today: all.today, grace: all.grace, start_setting: all.start_setting, sources: all.sources || '', n: all.n, items: list, overdue_count: overdue };
}

// ===== 18_evidence.js =====
/* 18_evidence: ngày có hồ sơ lấy từ app M&E và Checksheet (Đợt 2, phiên 2a — mục 7 đặc tả).
 * Mỗi giờ (trigger syncEvidenceHourly) và khi Quản trị bấm "Cập nhật ngay": hỏi cửa chỉ-đọc feed.isoEvidence của từng app đã nối
 * "mã biểu nào có hồ sơ vào ngày nào" (400 ngày gần nhất), gom theo kỳ của từng biểu ISO rồi ghi sheet Evidence (chỉ ghi dòng đổi).
 * Không ghi gì sang M&E / Checksheet. Mã biểu không có trong danh mục ISO → bỏ qua, ghi ở Trạng thái hệ thống.
 *
 * Hợp đồng (bên M&E và Checksheet làm trong chat của từng app):
 *   POST <link /exec> {api_contract_version:'1.0', action:'feed.isoEvidence', payload:{key, since:'YYYY-MM-DD', client:'ISO'},
 *     device_id, app_version} → phong bì chuẩn, data = {app_id:'ME'|'CS', items:[{form_code, date:'YYYY-MM-DD', count}], server_time}.
 *   Không cần phiên; khóa bằng mã kết nối FEED_KEY_ISO của app đó (sai mã → FORBIDDEN); không kiểm phiên bản app tối thiểu;
 *   since cũ hơn 400 ngày thì tự cắt về 400 ngày.
 *
 * Ô ✓ của bảng kỳ: kỳ có hồ sơ nộp trong app ISO HOẶC có dòng Evidence (số lượt > 0) — tính giống hệt ở js/periods.js.
 * Biểu nơi làm M&E / Checksheet chỉ được tính hồ sơ (đúng hạn / quá hạn) khi app đó đã nối (Settings.evidence_sources);
 * chưa nối thì vẫn "in từ app, chưa tính" như Đợt 1. */

var EXEC_URL_RE_ = /^https:\/\/script\.google\.com\/(a\/macros\/[^/]+|macros)\/s\/[A-Za-z0-9_-]{20,}\/exec$/;
/** App nguồn: thuộc tính lưu link /exec và mã kết nối (Thuộc tính tập lệnh, không gửi xuống app) */
var EVIDENCE_SRC_ = {
  ME: { url: 'ME_EXEC_URL', key: 'ME_FEED_KEY', name: 'M&E' },
  CS: { url: 'CS_EXEC_URL', key: 'CS_FEED_KEY', name: 'Checksheet' }
};
var EVIDENCE_SRC_LIST_ = ['ME', 'CS'];
/** Nơi làm (cột R) → app cung cấp ngày có hồ sơ */
var APP_SOURCE_ = { ME: 'ME', ME_PART: 'ME', CS: 'CS', CS_PART: 'CS', CS_PROPOSED: 'CS' };
/** Hỏi app kia bao nhiêu ngày gần nhất (tối đa của hợp đồng) */
var EVIDENCE_FEED_DAYS_ = 400;
/** Giữ ngày có hồ sơ của bao nhiêu ngày gần nhất theo loại kỳ (biểu hằng ngày giữ ít để bảng Evidence và máy điện thoại nhẹ) */
var EVIDENCE_KEEP_DAYS_ = { DAY: 62, WEEK: 126, MONTH: 400, QUARTER: 400, HALF: 400, YEAR: 400 };
var EVIDENCE_MAX_ITEMS_ = 60000;
var EVIDENCE_FIELDS_ = ['source', 'item_id', 'form_code', 'period_type', 'period_key', 'period_from', 'period_to', 'count', 'last_date', 'src_codes'];
/** Dòng đã bỏ (archived) quá bao nhiêu ngày thì xóa hẳn khỏi sheet (máy nào cũng đã nhận lệnh xóa) */
var EVIDENCE_PURGE_DAYS_ = 35;

/* ---------------- Dùng chung với tình trạng hồ sơ (17_records.js, js/periods.js) ---------------- */

/** App cung cấp ngày có hồ sơ cho biểu (theo nơi làm): 'ME' | 'CS' | '' */
function evidenceSourceOf_(it) {
  return (it && APP_SOURCE_[it.where]) || '';
}

/**
 * Ngày đầu của kỳ đầy đủ đầu tiên còn giữ ngày có hồ sơ từ app kia: kỳ trước đó không biết (không tính quá hạn).
 * DAY: hôm nay − 61 · WEEK: Thứ Hai sau (hôm nay − 126) · tháng / quý / nửa năm / năm: kỳ sau kỳ chứa (hôm nay − 400).
 */
function evidenceFrom_(type, today) {
  var keep = EVIDENCE_KEEP_DAYS_[type];
  if (!keep) return '';
  var p = periodOf_(type, addDaysIso_(today, -keep));
  return addDaysIso_(p.to, 1);
}

/** App đã nối và đang tính: {ME: true, CS: true} từ Settings.evidence_sources ("ME,CS") */
function evidenceSources_() {
  var out = {};
  String(setting_('evidence_sources') || '').split(',').forEach(function (s) {
    s = trimStr_(s);
    if (EVIDENCE_SRC_[s]) out[s] = true;
  });
  return out;
}

function evidenceSourcesStr_(map) {
  return EVIDENCE_SRC_LIST_.filter(function (s) { return map[s]; }).join(',');
}

function evLinked_(src) {
  var d = EVIDENCE_SRC_[src];
  return !!(d && prop_(d.url) && prop_(d.key));
}

/* ---------------- Gọi cửa đọc của app kia ---------------- */

/** Lời báo theo lý do (app hiện nhãn link.err.<lý do>) */
function linkFailed_(reason, field) {
  return apiError_('LINK_FAILED', { reason: reason }, [fieldError_(field || 'exec_url', 'LINK_FAILED')]);
}

/**
 * Gọi feed.isoEvidence. Mất phản hồi / bị chuyển thành GET (chặng chuyển hướng của Google) thì thử lại tối đa 3 lần.
 * Trả data của phong bì; lỗi → LINK_FAILED {reason}.
 */
function evFetch_(src, url, key, since) {
  var dev = prop_('ISO_FEED_DEVICE_ID');
  if (!isUuidV4_(dev)) { dev = uuid_(); setProp_('ISO_FEED_DEVICE_ID', dev); }
  var body = JSON.stringify({
    api_contract_version: '1.0', action: 'feed.isoEvidence', payload: { key: key, since: since, client: APP_ID },
    device_id: dev, app_version: SERVER_VERSION
  });
  var json = null, lastErr = '';
  for (var attempt = 0; attempt < 3; attempt++) {
    try {
      var resp = UrlFetchApp.fetch(url, { method: 'post', contentType: 'text/plain;charset=utf-8', payload: body, muteHttpExceptions: true, followRedirects: true });
      var text = resp.getContentText();
      try { json = JSON.parse(text); } catch (e) { json = null; lastErr = 'NO_RESPONSE'; }
      if (json && json.via !== 'GET') break;
      if (json) lastErr = 'NO_RESPONSE';
      json = null;
    } catch (e2) { lastErr = 'NO_RESPONSE'; }
    Utilities.sleep(1500);
  }
  if (!json) throw linkFailed_(lastErr || 'NO_RESPONSE');
  if (!json.ok) {
    var c = String(json.code || '');
    if (c === 'FORBIDDEN') throw linkFailed_('FORBIDDEN', 'key');
    if (c === 'FEATURE_NOT_ENABLED' || c === 'CLIENT_UPDATE_REQUIRED') throw linkFailed_('NO_FEED');
    if (c === 'SYSTEM_MAINTENANCE') throw linkFailed_('MAINTENANCE');
    throw linkFailed_('REMOTE_ERROR');
  }
  var data = json.data || {};
  if (data.app_id && String(data.app_id) !== src) throw linkFailed_('WRONG_APP');
  if (!Array.isArray(data.items)) throw linkFailed_('BAD_DATA');
  if (data.items.length > EVIDENCE_MAX_ITEMS_) throw linkFailed_('TOO_MANY');
  return data;
}

/** Lọc dòng hợp lệ: mã biểu, ngày trong [since, hôm nay], số lượt > 0. Trả {list: [{code, date, count}], bad} */
function evParse_(data, since, today) {
  var out = [], bad = 0;
  data.items.forEach(function (x) {
    var code = trimStr_(x && x.form_code), d = trimStr_(x && x.date), n = Number(x && x.count);
    if (!code || code.length > 60 || !isDateStr_(d) || !isFinite(n) || n < 0) { bad++; return; }
    if (!(n > 0) || d < since || d > today) return;
    out.push({ code: code, date: d, count: Math.max(1, Math.round(n)) });
  });
  return { list: out, bad: bad };
}

/* ---------------- Ghép mã biểu ---------------- */

/** Mã biểu so khớp: chữ hoa, Đ → D, bỏ dấu cách, gạch dài → gạch ngắn ("BM-CĐ-03-03a" ≡ "bm-cd-03-03A") */
function normFormCode_(s) {
  var t = String(s || '');
  try { t = t.normalize('NFC'); } catch (e) { /* bỏ qua */ }
  return t.toUpperCase().replace(/Đ/g, 'D').replace(/\s+/g, '').replace(/[‐-―−]/g, '-');
}

/** Bảng mã biểu → biểu ISO (biểu chưa lưu trữ) */
function evItemIndex_(items) {
  var idx = {};
  items.forEach(function (it) {
    if (it.archived_at || !it.code) return;
    var k = normFormCode_(it.code);
    if (!idx[k]) idx[k] = it;
  });
  return idx;
}

/** Biểu ISO của một mã biểu từ app kia: đúng mã; không có thì mã cha (bỏ đuôi a…i, -KT, -CT: BM-CĐ-03-03a → BM-CĐ-03-03) */
function evMatchItem_(idx, code) {
  var k = normFormCode_(code);
  for (var g = 0; g < 4 && k; g++) {
    if (idx[k]) return idx[k];
    var m = /^(.*\d)(?:[A-Z]|-[A-Z]{1,3})$/.exec(k);
    if (!m) return null;
    k = m[1];
  }
  return null;
}

/**
 * Gom ngày có hồ sơ theo biểu ISO và kỳ của biểu. Trả {rows: [dòng Evidence], unknown: [{code, n}], matched: số biểu, dates: số dòng}.
 * evidence_id = <app>|<item_id>|<mã kỳ> (biểu khi phát sinh: một dòng <app>|<item_id>|EVENT, khoảng ngày = ngày đầu – ngày cuối).
 */
function evAggregate_(src, list, items, today) {
  var idx = evItemIndex_(items);
  var agg = {}, unknown = {}, matched = {}, efrom = {};
  list.forEach(function (x) {
    var it = evMatchItem_(idx, x.code);
    if (!it) { unknown[x.code] = (unknown[x.code] || 0) + 1; return; }
    var type = itemPeriodType_(it);
    var p = null, key = 'EVENT';
    if (type !== 'EVENT') {
      p = periodOf_(type, x.date);
      if (efrom[type] === undefined) efrom[type] = evidenceFrom_(type, today);
      if (p.from < efrom[type]) return;
      key = p.key;
    }
    var id = src + '|' + it.item_id + '|' + key;
    var a = agg[id];
    if (!a) {
      a = agg[id] = { evidence_id: id, source: src, item_id: it.item_id, form_code: it.code, period_type: type, period_key: p ? p.key : '',
        period_from: p ? p.from : x.date, period_to: p ? p.to : x.date, count: 0, last_date: '', codes: {} };
    }
    a.count += x.count;
    if (x.date > a.last_date) a.last_date = x.date;
    if (!p) { if (x.date < a.period_from) a.period_from = x.date; if (x.date > a.period_to) a.period_to = x.date; }
    a.codes[x.code] = 1;
    matched[it.item_id] = 1;
  });
  var rows = Object.keys(agg).sort().map(function (id) {
    var a = agg[id];
    a.src_codes = Object.keys(a.codes).sort().join(', ').slice(0, 300);
    delete a.codes;
    return a;
  });
  var unk = Object.keys(unknown).sort().map(function (c) { return { code: c, n: unknown[c] }; });
  return { rows: rows, unknown: unk, matched: Object.keys(matched).length, dates: list.length };
}

/* ---------------- Ghi sheet Evidence ---------------- */

/** Dán Code.gs 2a mà chưa chạy migrateSchema: lần đầu cần thì tự thêm sheet Evidence */
function ensureEvidenceSheet_() {
  if (sheetExists_('Evidence')) return;
  autoMigrate_();
  dbReset_();
  if (!sheetExists_('Evidence')) throw apiError_('SYSTEM_NOT_READY');
}

/**
 * Dòng cần ghi để Evidence của một app khớp danh sách mới: thêm, sửa (dòng đổi), bỏ (archived_at) dòng không còn.
 * Gọi dưới khóa ghi. counts: {added, updated, removed}.
 */
function evDiff_(src, incoming, counts) {
  var cur = {};
  readRows_('Evidence').forEach(function (r) { if (r.source === src) cur[r.evidence_id] = r; });
  var nowIso = isoVN_(now_());
  var writes = [], seen = {};
  var same = function (a, b) { return String(a === null || a === undefined ? '' : a) === String(b === null || b === undefined ? '' : b); };
  incoming.forEach(function (n) {
    seen[n.evidence_id] = true;
    var old = cur[n.evidence_id];
    if (!old) {
      var row = cNewSystem_(Object.assign({ synced_at: nowIso }, n));
      writes.push({ sheet: 'Evidence', mode: 'insert', row: row });
      counts.added++;
      return;
    }
    if (!old.archived_at && EVIDENCE_FIELDS_.every(function (f) { return same(old[f], n[f]); })) return;
    var up = Object.assign({}, old, n, { synced_at: nowIso, archived_at: '', record_version: (old.record_version || 0) + 1, updated_at: nowIso, updated_by: SYSTEM_USER });
    var rn = up.__row;
    delete up.__row;
    writes.push({ sheet: 'Evidence', mode: 'update', row: up, rowNum: rn });
    counts.updated++;
  });
  Object.keys(cur).forEach(function (id) {
    var old = cur[id];
    if (seen[id] || old.archived_at) return;
    var up = Object.assign({}, old, { archived_at: nowIso, record_version: (old.record_version || 0) + 1, updated_at: nowIso, updated_by: SYSTEM_USER });
    var rn = up.__row;
    delete up.__row;
    writes.push({ sheet: 'Evidence', mode: 'update', row: up, rowNum: rn });
    counts.removed++;
  });
  return writes;
}

/** Xóa hẳn dòng đã bỏ quá EVIDENCE_PURGE_DAYS_ ngày (viết lại sheet một lần) khi có từ 200 dòng như vậy */
function evPurge_() {
  if (!sheetExists_('Evidence')) return 0;
  return withWriteLock_(function () {
    var cut = isoVN_(new Date(now_().getTime() - EVIDENCE_PURGE_DAYS_ * 86400000));
    var rows = readRows_('Evidence');
    var old = rows.filter(function (r) { return r.archived_at && String(r.archived_at) < cut; }).length;
    if (old < 200) return 0;
    var keep = rows.filter(function (r) { return !(r.archived_at && String(r.archived_at) < cut); });
    var sheet = sh_('Evidence');
    var h = hdr_('Evidence');
    var last = sheet.getLastRow();
    if (last >= 2) sheet.getRange(2, 1, last - 1, h.cols.length).clearContent();
    if (keep.length) sheet.getRange(2, 1, keep.length, h.cols.length).setValues(keep.map(function (r) { return objToRow_('Evidence', h, r); }));
    var st = readState_();
    var rev = Number(stateGet_(st, 'sync_revision', 0)) + 1;
    stateWrite_(st, { sync_revision: ['INT', rev], 'table_rev.Evidence': ['INT', rev] }, SYSTEM_USER);
    return old;
  });
}

/** Ghi trạng thái lần đồng bộ của một app (SystemState ev.<app>.*) */
function evNote_(src, status, error, extra) {
  withWriteLock_(function () {
    var st = readState_();
    var p = 'ev.' + src + '.';
    var su = {};
    su[p + 'last_at'] = ['DATETIME', isoVN_(now_())];
    su[p + 'last_status'] = ['STRING', status];
    su[p + 'last_error'] = ['STRING', error || ''];
    if (status === 'OK') su[p + 'ok_at'] = ['DATETIME', isoVN_(now_())];
    if (extra) Object.keys(extra).forEach(function (k) { su[p + k] = ['STRING', typeof extra[k] === 'string' ? extra[k] : JSON.stringify(extra[k])]; });
    stateWrite_(st, su, SYSTEM_USER);
  });
  cache_().remove('sys:state');
}

/**
 * Lấy ngày có hồ sơ từ một app rồi ghi Evidence. link: {url, key} (link mới, chưa lưu: lỗi thì không ghi trạng thái lỗi của app)
 * — không có thì dùng link đã lưu. dry: chỉ thử, không ghi. Trả {source, dates, matched, rows, added, updated, removed, unknown, bad, server_time}.
 */
function evidenceSyncSource_(src, link, dry) {
  var d = EVIDENCE_SRC_[src];
  var url = link ? link.url : prop_(d.url), key = link ? link.key : prop_(d.key);
  if (!url || !key) throw linkFailed_('NOT_LINKED');
  var today = todayVN_();
  var since = addDaysIso_(today, -EVIDENCE_FEED_DAYS_);
  var data;
  try {
    data = evFetch_(src, url, key, since);
  } catch (e) {
    if (!dry && !link) evNote_(src, 'FAILED', (e.apiData && e.apiData.reason) || 'ERROR');
    throw e;
  }
  var parsed = evParse_(data, since, today);
  var items = tableCache_(['Items'], readState_()).rows('Items');
  var ag = evAggregate_(src, parsed.list, items, today);
  var out = { source: src, dates: ag.dates, matched: ag.matched, rows: ag.rows.length, added: 0, updated: 0, removed: 0,
    unknown: ag.unknown.slice(0, 50), unknown_n: ag.unknown.length, bad: parsed.bad, server_time: String(data.server_time || '') };
  if (dry) return out;
  ensureEvidenceSheet_();
  var counts = { added: 0, updated: 0, removed: 0 };
  withWriteLock_(function () {
    var writes = evDiff_(src, ag.rows, counts);
    if (writes.length) systemWrite_(writes, { action: 'evidence.sync', entity_type: 'EVIDENCE', entity_id: src, after_json: { source: src, added: counts.added, updated: counts.updated, removed: counts.removed } });
  });
  out.added = counts.added; out.updated = counts.updated; out.removed = counts.removed;
  evNote_(src, 'OK', '', { stats: { dates: ag.dates, matched: ag.matched, rows: ag.rows.length, bad: parsed.bad }, unknown: ag.unknown.slice(0, 30) });
  return out;
}

/** Bỏ mọi dòng Evidence của một app (ngắt kết nối) */
function evidenceClearSource_(src) {
  if (!sheetExists_('Evidence')) return 0;
  var counts = { added: 0, updated: 0, removed: 0 };
  withWriteLock_(function () {
    var writes = evDiff_(src, [], counts);
    if (writes.length) systemWrite_(writes, { action: 'evidence.clear', entity_type: 'EVIDENCE', entity_id: src, after_json: { source: src, removed: counts.removed } });
  });
  return counts.removed;
}

/** Ghi Settings.evidence_sources (gửi xuống app: app đổi cài đặt thì tải lại) */
function setEvidenceSource_(src, on, by) {
  var m = evidenceSources_();
  if (!!m[src] === !!on) return;
  if (on) m[src] = true; else delete m[src];
  withWriteLock_(function () { writeSetting_('evidence_sources', evidenceSourcesStr_(m), by); });
}

/** Cài trigger mỗi giờ nếu chưa có (lần nối đầu tiên; installTriggers cũng cài) */
function ensureEvidenceTrigger_() {
  try {
    var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'syncEvidenceHourly'; });
    if (!has) ScriptApp.newTrigger('syncEvidenceHourly').timeBased().everyHours(1).create();
    return true;
  } catch (e) {
    console.warn('ensureEvidenceTrigger_ ' + (e && e.message));
    return false;
  }
}

/* ---------------- Trigger, hàm chạy tay ---------------- */

/** Trigger mỗi giờ: đồng bộ mọi app đã nối; dọn dòng cũ */
function syncEvidenceHourly() {
  var t0 = Date.now();
  propsReset_(true);
  try {
    dbReset_();
    if (!prop_('BUSINESS_SPREADSHEET_ID')) return;
    EVIDENCE_SRC_LIST_.forEach(function (src) {
      if (!evLinked_(src)) return;
      try { evidenceSyncSource_(src); } catch (e) {
        console.warn('syncEvidenceHourly ' + src + ' ' + (e && e.apiCode ? e.apiCode + ' ' + JSON.stringify(e.apiData) : e));
      }
    });
    try { evPurge_(); } catch (e2) { console.warn('evPurge_ ' + (e2 && e2.message)); }
  } finally {
    try { recordTriggerRun_('syncEvidenceHourly', t0); } catch (e3) { /* bỏ qua */ }
    propsReset_(false);
  }
}

/** Chạy từ trình soạn: lấy ngay ngày có hồ sơ từ M&E và Checksheet đã nối, in kết quả */
function adminSyncEvidenceNow() {
  dbReset_();
  EVIDENCE_SRC_LIST_.forEach(function (src) {
    if (!evLinked_(src)) { log_(EVIDENCE_SRC_[src].name + ': chưa nối.'); return; }
    try {
      var r = evidenceSyncSource_(src);
      log_(EVIDENCE_SRC_[src].name + ': ' + r.dates + ' dòng ngày · ' + r.matched + ' biểu · thêm ' + r.added + ', sửa ' + r.updated + ', bỏ ' + r.removed +
        (r.unknown_n ? ' · mã lạ: ' + r.unknown.map(function (u) { return u.code; }).join(', ') : ''));
    } catch (e) {
      log_(EVIDENCE_SRC_[src].name + ': LỖI ' + ((e.apiData && e.apiData.reason) || e.message));
    }
  });
}

/* ---------------- Action ---------------- */

function linkSourceArg_(p) {
  var src = trimStr_(p && p.source);
  if (!EVIDENCE_SRC_[src]) throw validationError_([fieldError_('source', 'INVALID_VALUE')]);
  return src;
}

/** Kiểm dạng link / mã trước khi hỏi PIN (09_api PRECHECK_) */
function precheckLinkSet_(ctx) {
  var p = ctx.req.payload || {};
  linkSourceArg_(p);
  if (p.clear) return;
  linkInputs_(p);
}

function linkInputs_(p) {
  var url = trimStr_(p.exec_url), key = trimStr_(p.key);
  var errs = [];
  if (!EXEC_URL_RE_.test(url)) errs.push(fieldError_('exec_url', 'URL_INVALID'));
  if (key.length < 24 || key.length > 200) errs.push(fieldError_('key', 'KEY_FORMAT'));
  if (errs.length) throw validationError_(errs);
  return { url: url, key: key };
}

/** link.test {source, exec_url?, key?} (Quản trị): thử kết nối, không lưu. Bỏ trống link + mã = thử link đã lưu. */
function linkTest_(ctx) {
  var p = ctx.req.payload || {};
  var src = linkSourceArg_(p);
  var link = null;
  if (trimStr_(p.exec_url) || trimStr_(p.key)) link = linkInputs_(p);
  else if (!evLinked_(src)) throw linkFailed_('NOT_LINKED');
  var r = evidenceSyncSource_(src, link, true);
  return { test: r };
}

/**
 * link.set {source, exec_url, key} (Quản trị, PIN): thử kết nối trước khi lưu; được thì lưu link + mã vào Thuộc tính tập lệnh,
 * bật tính hồ sơ theo app đó (evidence_sources), lấy ngay ngày có hồ sơ, cài trigger mỗi giờ.
 * {source, clear: true}: ngắt kết nối — xóa link + mã, bỏ dòng Evidence của app đó, biểu M&E/Checksheet trở về "chưa tính".
 */
function linkSet_(ctx) {
  var p = ctx.req.payload || {};
  var src = linkSourceArg_(p);
  var d = EVIDENCE_SRC_[src];
  var uid = ctx.user.user_id;
  if (p.clear) {
    var was = evLinked_(src);
    delProp_(d.url);
    delProp_(d.key);
    setEvidenceSource_(src, false, uid);
    var removed = evidenceClearSource_(src);
    withWriteLock_(function () {
      writeAudit_({ user_id: uid, device_id: ctx.req.device_id, action: 'link.set', entity_type: 'SYSTEM', entity_id: 'LINK_' + src, before_json: { linked: was },
        after_json: { linked: false, removed: removed }, operation_id: ctx.req.operation_id || '', auth_basis: authBasis_(ctx) });
      var st = readState_();
      var su = {};
      su['ev.' + src + '.last_status'] = ['STRING', ''];
      su['ev.' + src + '.last_error'] = ['STRING', ''];
      su['ev.' + src + '.unknown'] = ['STRING', '[]'];
      stateWrite_(st, su, uid);
    });
    cache_().remove('sys:state');
    return { linked: false, removed: removed, info: linkInfoData_() };
  }
  var link = linkInputs_(p);
  ensureEvidenceSheet_();
  // Lấy bằng link mới trước: lỗi thì không lưu gì (link cũ, nếu có, vẫn chạy)
  var out = evidenceSyncSource_(src, link);
  setProp_(d.url, link.url);
  setProp_(d.key, link.key);
  setEvidenceSource_(src, true, uid);
  var trig = ensureEvidenceTrigger_();
  withWriteLock_(function () {
    writeAudit_({ user_id: uid, device_id: ctx.req.device_id, action: 'link.set', entity_type: 'SYSTEM', entity_id: 'LINK_' + src, before_json: null,
      after_json: { exec_url_tail: link.url.slice(-12), linked: true, dates: out.dates, matched: out.matched }, operation_id: ctx.req.operation_id || '', auth_basis: authBasis_(ctx) });
  });
  return { linked: true, sync: out, trigger: trig, info: linkInfoData_() };
}

/** evidence.sync {source?} (Quản trị): "Cập nhật ngay" — đồng bộ một hoặc mọi app đã nối */
function evidenceSyncAction_(ctx) {
  var p = ctx.req.payload || {};
  var list = p.source ? [linkSourceArg_(p)] : EVIDENCE_SRC_LIST_.filter(evLinked_);
  if (!list.length) throw linkFailed_('NOT_LINKED');
  var results = {};
  list.forEach(function (src) {
    try { results[src] = { ok: true, sync: evidenceSyncSource_(src) }; } catch (e) {
      if (!e.apiCode) throw e;
      results[src] = { ok: false, code: e.apiCode, reason: (e.apiData && e.apiData.reason) || '' };
    }
  });
  return { results: results, info: linkInfoData_() };
}

/** Trạng thái kết nối của một app cho màn Kết nối, healthCheck (không lộ mã kết nối) */
function linkSourceInfo_(src, st) {
  var d = EVIDENCE_SRC_[src];
  var url = prop_(d.url) || '';
  var g = function (k, def) { return stateGet_(st, 'ev.' + src + '.' + k, def); };
  var parse = function (s, def) { try { return s ? JSON.parse(s) : def; } catch (e) { return def; } };
  return {
    source: src, name: d.name, linked: evLinked_(src), counted: !!evidenceSources_()[src], exec_url_tail: url ? '…' + url.slice(-14) : '',
    last_at: g('last_at', ''), last_status: g('last_status', ''), last_error: g('last_error', ''), ok_at: g('ok_at', ''),
    stats: parse(g('stats', ''), null), unknown: parse(g('unknown', ''), [])
  };
}

function linkInfoData_() {
  dbReset_();
  var st = readState_();
  var out = { sources: {}, trigger: false, feed_days: EVIDENCE_FEED_DAYS_, keep_days: EVIDENCE_KEEP_DAYS_ };
  EVIDENCE_SRC_LIST_.forEach(function (s) { out.sources[s] = linkSourceInfo_(s, st); });
  try { out.trigger = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'syncEvidenceHourly'; }); } catch (e) { out.trigger = false; }
  return out;
}

/** link.info (Quản trị): trạng thái kết nối M&E và Checksheet */
function linkInfo_(ctx) {
  return linkInfoData_();
}

// ===== 19_mail.js =====
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
 * Người nhận phải có email do Quản trị (cấp 4) xác nhận (Users.email_confirmed_at; đổi email thì mất xác nhận). Người nhận chính chưa
 * có email đã xác nhận → gửi Thư ký ISO thay (via FALLBACK), không để mất nhắc.
 * NotificationLogs là hàng chờ: QUEUED → SENDING → SENT | FAILED (thử lại tối đa 3 lần) | UNKNOWN (SENDING quá 1 giờ: có thể đã gửi,
 * chỉ gửi lại tay); SKIPPED khi việc đã xử lý / mốc đã qua (SUPERSEDED). Chống gửi trùng bằng dedupe_key = người nhận|loại|hồ sơ|mốc.
 * Mỗi người nhận một thư tổng hợp mỗi lần chạy. Hạn mức Gmail (MailApp) dùng chung với M&E và Checksheet (cùng tài khoản Google):
 * ISO dừng gửi khi còn ≤ mail_quota_reserve người nhận; mỗi lần chạy ghi hạn mức còn lại để theo dõi (màn Gmail, Trạng thái hệ thống).
 */

var MAIL_KINDS_ = ['REC_OVERDUE', 'REVIEW_DUE', 'VERSION_WAIT', 'CAPA_DUE', 'CAPA_VERIFY', 'CAPA_REPLY'];
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
    o.email_confirmed_at = u.email_confirmed_at || '';
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
      // Đổi email thì mất xác nhận nhận Gmail nhắc hạn (Quản trị xác nhận lại ở màn Gmail nhắc hạn)
      if (email !== null && email !== String(u.email || '')) { row.email = email; row.email_confirmed_at = ''; row.email_confirmed_by = ''; }
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
  Items: ['name', 'purpose', 'freq'], Groups: ['name'], Depts: ['name'], Clauses: ['name', 'group'], Versions: ['change_summary']
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
  autoMigrate_();
  if (!mtEnabled_()) { recordTriggerRun_('runBackgroundJobs', t0); return; }
  var done = 0;
  Object.keys(MT_SHEETS_).forEach(function (sheet) {
    if (Date.now() - t0 > 150000 || !sheetExists_(sheet)) return;
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
  var mir = null;
  try { mir = backupMirrorEnsure_(); } catch (e) { mir = { status: 'FAILED', error: String(e && e.message || e).slice(0, 120) }; }
  log_('backupData: ' + stamp + ' → ' + manifest.status + (trashed ? '; đã chuyển ' + trashed + ' bản cũ vào thùng rác' : '') +
    (mir ? '; tài khoản thứ hai: ' + mir.status : '') + '.');
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
    backup_weekday: setting_('backup_weekday'), backup_hour: setting_('backup_hour'), keep_count: setting_('backup_keep_count'),
    mirror: { email: String(setting_('backup_mirror_email') || ''), status: stateGet_(st, 'backup_mirror_status', ''), at: stateGet_(st, 'backup_mirror_at', ''),
      error: stateGet_(st, 'backup_mirror_error', ''), folders: mirrorFolders_().map(function (f) { return f.getName(); }) }
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


/* ---------------- Bản sao ở tài khoản Google thứ hai ----------------
 * Ba app (ISO, M&E, Checksheet) dùng chung một tài khoản Google: tài khoản bị khóa thì mất cả dữ liệu lẫn bản sao lưu.
 * Máy chủ chia sẻ (chỉ xem) thư mục Sao lưu và thư mục Dữ liệu cho tài khoản thứ hai; script SaoLuuPhu.gs chạy trong tài khoản đó
 * chép bản sao lưu VERIFIED và tệp dữ liệu về Drive của chính nó (bản chép thuộc tài khoản thứ hai, còn nguyên khi tài khoản chính
 * bị khóa). Email chỉ lưu trong Settings của máy chủ, không ghi vào mã (repo public). */

/** "abcdef@example.com" → "ab***@example.com" (nhật ký, trạng thái hệ thống) */
function maskEmail_(e) {
  var m = /^([^@]{0,2})[^@]*(@.*)$/.exec(String(e || ''));
  return m ? m[1] + '***' + m[2] : '';
}

/** Thư mục chia sẻ cho tài khoản thứ hai: Sao lưu (bản sao bảng tính) và Dữ liệu (tệp PDF, ảnh, logo) */
function mirrorFolders_() {
  var out = [backupRoot_()];
  try { out.push(appFolder_()); } catch (e) { /* chưa có thư mục dữ liệu */ }
  return out;
}

function hasViewer_(folder, email) {
  var e = String(email).toLowerCase();
  var list = folder.getViewers().concat(folder.getEditors());
  for (var i = 0; i < list.length; i++) if (String(list[i].getEmail()).toLowerCase() === e) return true;
  return false;
}

/**
 * Chia sẻ (chỉ xem) các thư mục cho email; bỏ chia sẻ email cũ nếu đổi. Trả {status: 'OK'|'FAILED', error}.
 * Không gọi trong khóa ghi (Drive chậm). Google gửi thư báo chia sẻ một lần cho tài khoản thứ hai.
 */
function backupMirrorShare_(email, oldEmail) {
  var err = '';
  mirrorFolders_().forEach(function (f) {
    try {
      if (oldEmail && String(oldEmail).toLowerCase() !== String(email || '').toLowerCase()) { try { f.removeViewer(oldEmail); } catch (e0) { /* chưa từng chia sẻ */ } }
      if (email && !hasViewer_(f, email)) f.addViewer(email);
    } catch (e) {
      err = (f.getName() + ': ' + String(e && e.message || e)).slice(0, 180);
    }
  });
  return { status: email ? (err ? 'FAILED' : 'OK') : 'OFF', error: err };
}

function noteMirror_(r, by) {
  withWriteLock_(function () {
    var st = readState_();
    stateWrite_(st, { backup_mirror_status: ['STRING', r.status], backup_mirror_at: ['DATETIME', isoVN_(now_())], backup_mirror_error: ['STRING', r.error || ''] }, by || SYSTEM_USER);
  });
  cache_().remove('sys:state');
}

/** Sau mỗi lần sao lưu: kiểm lại chia sẻ (thư mục mới nằm trong thư mục đã chia sẻ nên tự được xem) */
function backupMirrorEnsure_() {
  var email = String(setting_('backup_mirror_email') || '');
  if (!email) return null;
  var r = backupMirrorShare_(email, '');
  noteMirror_(r, SYSTEM_USER);
  return r;
}

/** backup.mirror.set {email} (cấp 4, PIN): đặt / đổi / bỏ ('' ) tài khoản thứ hai, chia sẻ ngay và báo kết quả */
function backupMirrorSet_(ctx) {
  var p = ctx.req.payload || {};
  var email = trimStr_(p.email).toLowerCase();
  if (email && (!EMAIL_RE_.test(email) || email.length > 120)) throw validationError_([fieldError_('email', 'INVALID_VALUE')]);
  var old = String(setting_('backup_mirror_email') || '');
  var owner = '';
  try { owner = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) { owner = ''; }
  if (email && owner && email === owner) throw validationError_([fieldError_('email', 'MIRROR_SAME_ACCOUNT')]);
  var r = backupMirrorShare_(email, old);
  withWriteLock_(function () {
    writeSetting_('backup_mirror_email', email, ctx.user.user_id);
    writeAudit_({ user_id: ctx.user.user_id, device_id: ctx.req.device_id, action: 'backup.mirror.set', entity_type: 'BACKUP', entity_id: 'mirror',
      before_json: { email: maskEmail_(old) }, after_json: { email: maskEmail_(email), status: r.status, error: r.error }, operation_id: ctx.req.operation_id || '', auth_basis: authBasis_(ctx) });
  });
  noteMirror_(r, ctx.user.user_id);
  return { email: email, status: r.status, error: r.error, folders: mirrorFolders_().map(function (f) { return f.getName(); }) };
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

var ADMIN_ACTION_PREFIX_ = ['user.', 'auth.', 'session.', 'pin.', 'settings.', 'system.', 'backup.', 'dept.', 'report.logo', 'sample.', 'mail.'];

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
var SETTINGS_READONLY_ = { report_logo_file_id: 1, report_logo_rev: 1, backup_mirror_email: 1, evidence_sources: 1, gmail_enabled: 1, email_hour: 1 };
/** Cài đặt là mã biểu in trên phiếu / sổ (viết hoa, bỏ dấu cách, đúng dạng mã biểu) */
var FORM_CODE_SETTINGS_ = ['capa_form_code', 'capa_log_form_code', 'complaint_form_code', 'd8_form_code', 'scar_form_code'];

var SETTINGS_BOUNDS_ = {
  session_days: [1, 90], session_warn_days: [0, 30], change_pin_session_minutes: [5, 60], reauth_window_minutes: [1, 30], temp_pin_hours: [1, 168],
  max_sessions_per_user: [1, 50], login_fail_limit: [3, 20], login_fail_window_minutes: [1, 120], login_lock_minutes: [1, 1440],
  login_global_fail_limit: [5, 1000], login_global_window_minutes: [1, 120], login_global_pause_minutes: [1, 1440], auth_attempts_retention_days: [7, 3650],
  offline_unlock_attempts: [3, 20], offline_lock_minutes: [1, 1440], offline_max_lockouts: [1, 10], offline_pbkdf2_iterations: [150000, 2000000],
  offline_probe_seconds: [3, 30], mt_chunk_chars: [200, 5000], mt_max_fields_per_request: [1, 100], mt_sync_budget_seconds: [1, 20], mt_daily_budget: [0, 100000],
  client_timeout_seconds: [10, 60], client_long_timeout_seconds: [20, 300],
  sync_page_size: [100, 2000], doc_max_bytes: [1048576, 52428800], doc_mobile_upload_max_bytes: [1048576, 52428800],
  photo_max_edge_px: [640, 4096], photo_jpeg_quality: [0.5, 0.95], photo_thumb_edge_px: [120, 1024], backup_hour: [0, 23], backup_keep_count: [2, 52],
  doc_review_months: [1, 60], record_grace_days: [0, 60], version_wait_days: [1, 30], mail_quota_reserve: [0, 90], capa_verify_days: [0, 365], capa_reply_days: [1, 90]
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
  if (key === 'scope_depts') return normScopeDepts_(s);
  if (FORM_CODE_SETTINGS_.indexOf(key) >= 0 && s && !ITEM_CODE_RE_.test(s.toUpperCase().replace(/\s+/g, ''))) throw bad();
  if (FORM_CODE_SETTINGS_.indexOf(key) >= 0) return s.toUpperCase().replace(/\s+/g, '');
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
    try { parsed[k] = parseSettingInput_(def, changes[k]); } catch (e) { errs.push(e && e.apiErrors && e.apiErrors[0] ? e.apiErrors[0] : fieldError_(k, 'INVALID_VALUE')); }
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
  var allItems = readRows_('Items').filter(function (it) { return !it.archived_at; });
  var items = allItems.filter(inScope_);
  var scope = scopeDepts_();
  // Phạm vi áp dụng (2e): biểu ngoài phạm vi ẩn với mọi người (không xóa)
  add('scope', true, scope.length ? scope.join(', ') : 'Toàn công ty',
    (scope.length ? items.length + ' biểu trong phạm vi · ' + (allItems.length - items.length) + ' biểu ngoài phạm vi (ẩn, không xóa)' : '') +
    (scope.length ? ' — đổi ở Tài khoản → Quản trị → Bộ phận → Phạm vi áp dụng' : ''));
  add('items', items.length > 0, items.length, items.length ? '' : 'Excel → Nhập file Excel tổng');
  var cls = readRows_('Clauses').filter(function (c) { return c.active; });
  var iso = cls.filter(function (c) { return c.std === 'ISO9001'; }).length, brc = cls.length - iso;
  add('clauses', iso > 0 && brc > 0, 'ISO 9001: ' + iso + ' · BRCGS: ' + brc, iso && brc ? '' : 'Nhập file Excel tổng (sheet Phủ ISO 9001, Phủ BRCGS)');
  var cov = coverageCounts_(items, cls);
  add('coverage', !cov.missing, 'ISO 9001: ' + cov.iso_covered + '/' + iso + ' điều khoản có biểu · bắt buộc chưa có biểu ' + cov.missing + ' · BRCGS: ' + cov.brc_covered + '/' + brc + ' chủ đề có biểu',
    cov.missing ? 'Phủ điều khoản → Thiếu biểu – bắt buộc: ' + cov.missing_keys.join(', ') : '');
  var th = tplHealth_(items);
  add('templates', th.ok, th.value, th.note);
  var heads = readRows_('Depts').filter(function (d) { return d.active && inScopeDept_(d.dept_code); });
  var noHead = heads.filter(function (d) { return !d.head_user_id; }).map(function (d) { return d.dept_code; });
  // Không có trưởng bộ phận thì Quản trị (cấp 4) duyệt thay — không coi là lỗi khi có Quản trị đang hoạt động
  var admins = readRows_('Users').filter(function (u) { return u.active && Number(u.role_level) === 4; }).length;
  add('dept_heads', !noHead.length || admins > 0, (heads.length - noHead.length) + ' / ' + heads.length,
    noHead.length ? 'Chưa có trưởng bộ phận: ' + noHead.join(', ') + (admins ? ' — Quản trị duyệt thay' : '') : '');
  if (sheetExists_('Versions')) {
    var inV = {};
    items.forEach(function (it) { inV[it.item_id] = true; });
    var vs = readRows_('Versions').filter(function (v) { return inV[v.item_id]; });
    var cnt = function (st) { return vs.filter(function (v) { return v.state === st; }).length; };
    add('versions', true, 'Nháp ' + cnt('DRAFT') + ' · Chờ duyệt ' + cnt('IN_REVIEW') + ' · Chờ ban hành ' + cnt('APPROVED') + ' · Đang hiệu lực ' + cnt('ISSUED'));
  } else {
    add('versions', false, 'Thiếu sheet Versions', 'Chạy migrateSchema');
  }
  if (sheetExists_('Records')) {
    var inR = {};
    items.forEach(function (it) { inR[it.item_id] = true; });
    var rs = readRows_('Records').filter(function (r) { return !r.archived_at && inR[r.item_id]; });
    var rcnt = function (x) { return rs.filter(function (r) { return r.status === x; }).length; };
    var all = recordStatusAll_();
    var inIds = {};
    items.forEach(function (it) { inIds[it.item_id] = true; });
    var od = Object.keys(all.items).filter(function (k) { return inIds[k] && all.items[k][6] === 'L'; }).length;
    var missingFiles = rs.filter(function (r) { return r.status === 'SUBMITTED' && (r.files_json || []).length < Number(r.pages || 0); }).length;
    add('records', true, 'Đã nộp ' + rcnt('SUBMITTED') + ' · Bị trả lại ' + rcnt('RETURNED') + ' · Biểu quá hạn ' + od + ' · Chưa đủ tệp ' + missingFiles,
      'Ngày bắt đầu tính (biểu nhập từ Excel): ' + (all.start_setting || '—') + ' · cho phép trễ ' + all.grace + ' ngày');
  } else {
    add('records', false, 'Thiếu sheet Records', 'Chạy migrateSchema');
  }
  // Kết nối M&E / Checksheet (2a): ngày có hồ sơ từ app kia
  EVIDENCE_SRC_LIST_.forEach(function (src) {
    var inf = linkSourceInfo_(src, st);
    var nm = inf.name;
    var hk = src === 'ME' ? 'link_me' : 'link_cs';
    if (!inf.linked) { add(hk, true, 'OFF', 'Chưa nối ' + nm + ' — Tài khoản → Quản trị → Kết nối M&E / Checksheet'); return; }
    var okAt = parseTime_(inf.ok_at);
    var fresh = okAt && now_().getTime() - okAt.getTime() < 3 * 3600000;
    var s = inf.stats || {};
    var unk = (inf.unknown || []).map(function (u) { return u.code + ' (' + u.n + ')'; });
    var val = (inf.ok_at ? 'Lần lấy được gần nhất ' + String(inf.ok_at).slice(0, 16).replace('T', ' ') : 'Chưa lấy được lần nào') +
      (s.matched !== undefined ? ' · ' + s.matched + ' biểu · ' + s.dates + ' dòng ngày' : '');
    var note = inf.last_status === 'FAILED' ? 'Lần gần nhất lỗi: ' + inf.last_error + ' — Kết nối → Thử kết nối'
      : (!fresh ? 'Quá 3 giờ chưa cập nhật — kiểm trigger syncEvidenceHourly (chạy installTriggers)' : '');
    if (unk.length) note = (note ? note + ' · ' : '') + 'Mã biểu không có trong danh mục ISO (bỏ qua): ' + unk.join(', ');
    add(hk, inf.last_status !== 'FAILED' && !!fresh, val, note);
  });
  // Gmail nhắc hạn (2b)
  var gm = mailHealth_(st);
  add('gmail', gm[0], gm[1], gm[2]);
  var nofile = items.filter(function (it) { return it.status === 'ISSUED' && it.file_missing; }).length;
  add('file_missing', true, nofile, nofile ? 'Biểu ● chưa có tệp: Danh mục → lọc Chưa có tệp → Gắn tệp' : '');
  var today = todayVN_();
  var overdue = items.filter(function (it) { return it.status === 'ISSUED' && it.review_due && it.review_due < today; }).length;
  add('review_overdue', !overdue, overdue, overdue ? 'Tài liệu quá hạn rà soát: rà soát rồi bấm Đã rà soát, hoặc soạn phiên bản mới' : '');
  var owners = readRows_('Users').filter(function (u) { return u.active && (u.iso_secretary || Number(u.role_level) === 4); });
  var hasSec = readRows_('Users').some(function (u) { return u.active && u.iso_secretary; });
  add('iso_secretary', hasSec, owners.length, hasSec ? '' : 'Chưa có Thư ký ISO: Tài khoản → Quản trị → Người dùng → cờ Thư ký ISO');
  var lb = stateGet_(st, 'last_backup_at', ''), lbs = stateGet_(st, 'last_backup_status', '');
  var lbt = parseTime_(lb);
  add('last_backup', lbs === 'VERIFIED' && lbt && now_().getTime() - lbt.getTime() < 8 * 86400000, (lb ? lb.slice(0, 16).replace('T', ' ') : '') + (lbs ? ' · ' + lbs : ''), stateGet_(st, 'last_backup_ref', ''));
  // Bản sao ở tài khoản Google thứ hai: đã đặt email và lần chia sẻ gần nhất thành công
  var mEmail = String(setting_('backup_mirror_email') || '');
  var mStatus = stateGet_(st, 'backup_mirror_status', '');
  add('backup_mirror', !!mEmail && mStatus === 'OK', mEmail ? maskEmail_(mEmail) + (mStatus ? ' · ' + mStatus : '') : 'OFF',
    !mEmail ? 'Quản trị → Sao lưu → Tài khoản sao lưu thứ hai' : (mStatus === 'OK' ? '' : String(stateGet_(st, 'backup_mirror_error', '') || 'Chưa chia sẻ')));
  var mtp = parseTime_(stateGet_(st, 'mt_paused_until', ''));
  add('mt_paused_until', !(mtp && mtp.getTime() > now_().getTime()), stateGet_(st, 'mt_paused_until', ''));
  var lpu = parseTime_(stateGet_(st, 'login_paused_until', ''));
  add('login_paused_until', !(lpu && lpu.getTime() > now_().getTime()), stateGet_(st, 'login_paused_until', ''));
  var base = String(setting_('app_base_url') || '');
  add('app_base_url', !!base, base, base ? '' : 'Chưa điền app_base_url');
  add('report_logo', true, setting_('report_logo_rev') ? 'ON' : 'OFF');
  // Báo cáo (2c): số báo cáo đã lưu (mã BC), thiếu sheet ReportRuns → chạy migrateSchema
  var rh = reportHealth_();
  add('reports', rh[0], rh[1], rh[2]);
  var dc = docControlHealth_();
  add('doc_control', dc[0], dc[1], dc[2]);
  // Khắc phục (3a)
  var ch = capaHealth_();
  add('capa', ch[0], ch[1], ch[2]);
  var cells = 0;
  [prop_('BUSINESS_SPREADSHEET_ID'), prop_('SECURITY_SPREADSHEET_ID')].forEach(function (id) {
    if (!id) return;
    SpreadsheetApp.openById(id).getSheets().forEach(function (s) { cells += s.getMaxRows() * s.getMaxColumns(); });
  });
  add('spreadsheet_cells', cells < 5000000, cells);
  return rows;
}

/** Chạy từ trình soạn: in kết quả kiểm tra */
/**
 * Phủ điều khoản (như js/coverage.js và hai trang Phủ của file Excel tổng): ISO 9001 — mã ở cột G (iso9001) bắt đầu bằng điều khoản;
 * BRCGS — cột K (brc_topics) chứa khóa chủ đề, không phân biệt hoa thường. Trả {iso_covered, missing, missing_keys, brc_covered}.
 */
function coverageCounts_(items, clauses) {
  var keys = items.map(function (it) { return ';' + String(it.iso9001 || '').split(' ').join('') + ';'; });
  var topics = items.map(function (it) { return String(it.brc_topics || '').toLowerCase(); });
  var out = { iso_covered: 0, missing: 0, missing_keys: [], brc_covered: 0 };
  clauses.forEach(function (c) {
    if (c.active === false) return;
    var k = String(c.key);
    if (c.std === 'ISO9001') {
      var hit = keys.some(function (x) { return x.indexOf(';' + k) >= 0; });
      if (hit) out.iso_covered++;
      else if (c.mandatory_record) { out.missing++; out.missing_keys.push(k); }
    } else if (c.std === 'BRC') {
      var kl = k.toLowerCase();
      if (topics.some(function (x) { return x.indexOf(kl) >= 0; })) out.brc_covered++;
    }
  });
  return out;
}

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

// ===== 27_reports.js =====
/* 27_reports: Báo cáo (Đợt 2, phiên 2c; mục "Nhắc hạn, báo cáo, tem QR" của đặc tả).
 * 4 báo cáo, số liệu do máy chủ tính (một nguồn cho bản xem trước, PDF và Excel):
 *  - CATALOG  Danh mục tài liệu hiện hành theo bộ phận (thay BM-ISO-02-01): mã, tên, lần ban hành, ngày ban hành, hiệu lực từ, hạn rà soát.
 *  - RECORDS  Tình trạng hồ sơ theo bộ phận và kỳ (tháng hoặc quý): mỗi biểu một dòng, mỗi tháng/quý một cột; ô gom các kỳ của biểu
 *             (✓ / ! / – với biểu một kỳ trong cột, "đúng hạn/số kỳ" với biểu ngày, tuần…; biểu khi phát sinh: số lần nộp).
 *  - COVERAGE Phủ điều khoản ISO 9001 và BRCGS (đếm như hai trang Phủ của file Excel tổng, js/coverage.js).
 *  - VERSIONS Lịch sử phiên bản của một tài liệu.
 *  - DIST     Sổ phân phối & thu hồi bản in (phiên 2d, thay BM-ISO-02-03): theo nơi nhận, lần ban hành, đang dùng / cần thu hồi / đã thu hồi.
 *  - DOCREQ   Phiếu đề nghị ban hành / sửa đổi / hủy tài liệu (phiên 2d, thay BM-ISO-02-02): một phiếu (request_id) hoặc sổ theo dõi theo năm.
 *  - CAPA     Khắc phục (phiên 3a, 32_capa.js — mã biểu theo Settings capa_form_code / capa_log_form_code, mặc định BM-CĐ-14-02): một phiếu
 *             (capa_id) để in ký, hoặc sổ theo dõi khắc phục theo năm phát hiện. Phiên 3b: một phiếu in theo mẫu (form) CAR phiếu khắc phục ·
 *             RECEIPT phiếu tiếp nhận khiếu nại (complaint_form_code) · D8 báo cáo 8D (d8_form_code) · SCAR (scar_form_code); sổ lọc theo loại
 *             (source ALL | INTERNAL | COMPLAINT | SUPPLIER).
 * report.run: xem trước (không ghi). report.save: lưu bản chụp (tệp JSON riêng tư trên Drive + dòng ReportRuns, mã BC-yymm-001) rồi
 * trả PDF (máy chủ dựng bằng Google Docs tạm, 28_report_pdf.js) hoặc bản chụp để app dựng Excel; gọi lại cùng report_run_id → cùng mã,
 * cùng số liệu. report.list: báo cáo đã lưu (người lập thấy của mình; Thư ký ISO, cấp 4 thấy tất cả).
 * Quyền: Danh mục, Lịch sử phiên bản — mọi cấp (trong phạm vi biểu); Tình trạng hồ sơ, Phủ điều khoản — cấp 2+ / Thư ký ISO
 * ("Xem tổng hợp, phủ điều khoản" ở bảng quyền). Cấp 1–3 chỉ có biểu trong bộ phận mình + tài liệu chung. */

var REPORT_KINDS_ = ['CATALOG', 'RECORDS', 'COVERAGE', 'VERSIONS', 'DIST', 'DOCREQ', 'CAPA'];
var REPORT_SNAPSHOT_MAX_ = 4 * 1024 * 1024;
/** Biểu mẫu ISO mà báo cáo thay (in ở khối thông tin bên phải) */
var REPORT_FORM_CODE_ = { CATALOG: 'BM-ISO-02-01', DOCREQ: 'BM-ISO-02-02', DIST: 'BM-ISO-02-03' };
/** Tên tệp tải về */
var REPORT_SLUG_ = { CATALOG: 'danh-muc-tai-lieu', RECORDS: 'tinh-trang-ho-so', COVERAGE: 'phu-dieu-khoan', VERSIONS: 'lich-su-phien-ban', DIST: 'so-phan-phoi-thu-hoi', DOCREQ: 'de-nghi-tai-lieu', CAPA: 'so-theo-doi-khac-phuc' };

/** Cài đặt mã biểu theo mẫu in một phiếu khắc phục (3b) */
var CAPA_FORM_SETTING_ = { CAR: 'capa_form_code', RECEIPT: 'complaint_form_code', D8: 'd8_form_code', SCAR: 'scar_form_code' };
/** Tên tệp một phiếu theo mẫu in; sổ theo loại */
var CAPA_FORM_SLUG_ = { CAR: 'phieu-khac-phuc', RECEIPT: 'tiep-nhan-khieu-nai', D8: 'bao-cao-8d', SCAR: 'scar' };
var CAPA_LOG_SLUG_ = { COMPLAINT: 'so-theo-doi-khieu-nai', SUPPLIER: 'so-theo-doi-scar' };

/** Mã biểu in trên báo cáo: khắc phục theo cài đặt (phiếu theo mẫu in / sổ), còn lại theo REPORT_FORM_CODE_ */
function reportFormCode_(kind, f) {
  if (kind === 'CAPA') return String(setting_(f && f.capa_id ? CAPA_FORM_SETTING_[f.form || 'CAR'] || 'capa_form_code' : 'capa_log_form_code') || '');
  return REPORT_FORM_CODE_[kind] || '';
}

/** Mẫu in mặc định của một phiếu: khiếu nại → 8D, SCAR → SCAR, còn lại → phiếu khắc phục */
function capaDefaultForm_(source) { return source === 'COMPLAINT' ? 'D8' : source === 'SUPPLIER' ? 'SCAR' : 'CAR'; }
/** Mẫu in dùng được cho nguồn của phiếu */
function capaFormOk_(form, source) {
  if (form === 'RECEIPT' || form === 'D8') return source === 'COMPLAINT';
  if (form === 'SCAR') return source === 'SUPPLIER';
  return form === 'CAR';
}
var REPORT_GRAINS_ = { MONTH: { def: 6, max: 12 }, QUARTER: { def: 4, max: 8 } };

/* ---------------- Quyền ---------------- */

/** Loại báo cáo người dùng được xem */
function reportKindAllowed_(u, kind) {
  if (REPORT_KINDS_.indexOf(kind) < 0) return false;
  if (kind === 'RECORDS' || kind === 'COVERAGE' || kind === 'DIST' || kind === 'DOCREQ' || kind === 'CAPA') return isSecretary_(u) || Number(u.role_level) >= 2;
  return true;
}

/** Báo cáo đã lưu: người lập, Thư ký ISO, cấp 4 */
function reportRunVisible_(u, run) {
  return !!run && !run.archived_at && (run.generated_by === u.user_id || isSecretary_(u)) && reportKindAllowed_(u, run.kind);
}

/** Dán Code.gs 2c mà chưa chạy migrateSchema: lần lưu báo cáo đầu tiên tự thêm sheet ReportRuns */
function ensureReportSchema_() {
  if (sheetExists_('ReportRuns')) return;
  autoMigrate_();
  dbReset_();
  if (!sheetExists_('ReportRuns')) throw apiError_('SYSTEM_NOT_READY');
}

/* ---------------- Bộ lọc ---------------- */

/** Mã kỳ tháng (2026-11) hoặc quý (2026-Q4) → kỳ {key, from, to}; sai dạng → null */
function reportPeriodOfKey_(grain, key) {
  var s = String(key || '');
  if (grain === 'MONTH') {
    var m = /^(\d{4})-(\d{2})$/.exec(s);
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null;
    return periodOf_('MONTH', s + '-01');
  }
  var q = /^(\d{4})-Q([1-4])$/.exec(s);
  if (!q) return null;
  return periodOf_('QUARTER', q[1] + '-' + pad2_(Number(q[2]) * 3) + '-01');
}

/**
 * Bộ lọc chuẩn hóa theo loại báo cáo (chỉ khóa cho phép, giá trị mặc định); sai → VALIDATION_ERROR.
 *  CATALOG {dept, scope: ISSUED | ALL} · RECORDS {dept, grain: MONTH | QUARTER, end: 2026-11 | 2026-Q4, n}
 *  COVERAGE {dept, std: BOTH | ISO9001 | BRC, codes: true | false} · VERSIONS {item_id}
 */
function reportFilters_(kind, f, today) {
  f = f || {};
  var out = {}, errs = [];
  var dept = trimStr_(f.dept || '');
  if (kind === 'DOCREQ' && f.request_id) {
    if (!isUuidV4_(f.request_id)) throw validationError_([fieldError_('filters.request_id', 'ID_INVALID')]);
    return { request_id: String(f.request_id) };
  }
  if (kind === 'CAPA' && f.capa_id) {
    if (!isUuidV4_(f.capa_id)) throw validationError_([fieldError_('filters.capa_id', 'ID_INVALID')]);
    var form = f.form ? String(f.form) : '';
    if (form && CAPA_FORMS_.indexOf(form) < 0) throw validationError_([fieldError_('filters.form', 'INVALID_VALUE')]);
    if (!form) {
      var c0 = sheetExists_('Capas') ? findOne_('Capas', 'capa_id', String(f.capa_id)) : null;
      form = capaDefaultForm_(c0 ? c0.source : '');
    }
    return { capa_id: String(f.capa_id), form: form };
  }
  if (kind !== 'VERSIONS') {
    if (dept) {
      var d = findOne_('Depts', 'dept_code', dept);
      if (!d) errs.push(fieldError_('filters.dept', 'INVALID_VALUE'));
    }
    out.dept = dept;
  }
  if (kind === 'CATALOG') {
    out.scope = f.scope === 'ALL' ? 'ALL' : 'ISSUED';
    if (f.scope && ['ALL', 'ISSUED'].indexOf(f.scope) < 0) errs.push(fieldError_('filters.scope', 'INVALID_VALUE'));
  } else if (kind === 'RECORDS') {
    var grain = f.grain || 'MONTH';
    if (!REPORT_GRAINS_[grain]) { errs.push(fieldError_('filters.grain', 'INVALID_VALUE')); grain = 'MONTH'; }
    out.grain = grain;
    var cur = periodOf_(grain, today);
    var end = f.end ? reportPeriodOfKey_(grain, f.end) : cur;
    if (!end) { errs.push(fieldError_('filters.end', 'INVALID_VALUE')); end = cur; }
    if (end.from > cur.from) errs.push(fieldError_('filters.end', 'INVALID_VALUE'));
    out.end = end.key;
    var n = f.n === undefined || f.n === null || f.n === '' ? REPORT_GRAINS_[grain].def : Number(f.n);
    if (!(n >= 1 && n <= REPORT_GRAINS_[grain].max) || Math.floor(n) !== n) { errs.push(fieldError_('filters.n', 'INVALID_VALUE')); n = REPORT_GRAINS_[grain].def; }
    out.n = n;
  } else if (kind === 'COVERAGE') {
    var std = f.std || 'BOTH';
    if (['BOTH', 'ISO9001', 'BRC'].indexOf(std) < 0) { errs.push(fieldError_('filters.std', 'INVALID_VALUE')); std = 'BOTH'; }
    out.std = std;
    out.codes = f.codes !== false;
  } else if (kind === 'VERSIONS') {
    if (!isUuidV4_(f.item_id)) errs.push(fieldError_('filters.item_id', 'REQUIRED'));
    out.item_id = f.item_id || '';
  } else if (kind === 'DIST') {
    var ds = f.state || 'ALL';
    if (['ALL', 'ACTIVE', 'DUE', 'RECALLED'].indexOf(ds) < 0) { errs.push(fieldError_('filters.state', 'INVALID_VALUE')); ds = 'ALL'; }
    out.state = ds;
  } else if (kind === 'DOCREQ') {
    var y = f.year === undefined || f.year === null || f.year === '' ? Number(today.slice(0, 4)) : Number(f.year);
    if (!(y >= 2000 && y <= Number(today.slice(0, 4))) || Math.floor(y) !== y) { errs.push(fieldError_('filters.year', 'INVALID_VALUE')); y = Number(today.slice(0, 4)); }
    out.year = y;
    var rs = f.state || 'ALL';
    if (['ALL', 'OPEN', 'DONE', 'REJECTED'].indexOf(rs) < 0) { errs.push(fieldError_('filters.state', 'INVALID_VALUE')); rs = 'ALL'; }
    out.state = rs;
  } else if (kind === 'CAPA') {
    var cy = f.year === undefined || f.year === null || f.year === '' ? Number(today.slice(0, 4)) : Number(f.year);
    if (!(cy >= 2000 && cy <= Number(today.slice(0, 4))) || Math.floor(cy) !== cy) { errs.push(fieldError_('filters.year', 'INVALID_VALUE')); cy = Number(today.slice(0, 4)); }
    out.year = cy;
    var cs = f.state || 'ALL';
    if (['ALL', 'OPEN', 'OVERDUE', 'VERIFYING', 'CLOSED'].indexOf(cs) < 0) { errs.push(fieldError_('filters.state', 'INVALID_VALUE')); cs = 'ALL'; }
    out.state = cs;
    var src = f.source || 'ALL';
    if (['ALL', 'INTERNAL', 'COMPLAINT', 'SUPPLIER'].indexOf(src) < 0) { errs.push(fieldError_('filters.source', 'INVALID_VALUE')); src = 'ALL'; }
    out.source = src;
  }
  if (errs.length) throw validationError_(errs);
  return out;
}

/* ---------------- Tiện ích ---------------- */

/** Thứ tự biểu như Danh mục: thứ tự trong file Excel, rồi mã */
function reportItemCmp_(a, b) {
  return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.code).localeCompare(String(b.code));
}

/** Bộ phận theo thứ tự hiển thị */
function reportDepts_() {
  return readRows_('Depts').filter(function (d) { return !d.archived_at; })
    .sort(function (a, b) { return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.dept_code).localeCompare(String(b.dept_code)); });
}

/** Biểu người dùng xem được (và quyền xem tổng hợp khi cần), lọc bộ phận */
function reportItems_(ctx, dept, needRecords) {
  return readRows_('Items').filter(function (it) {
    if (it.archived_at) return false;
    if (needRecords ? !canSeeRecords_(ctx.user, it) : !itemVisible_(ctx.user, it)) return false;
    return !dept || it.dept_code === dept;
  }).sort(reportItemCmp_);
}

/** Gom dòng theo bộ phận theo thứ tự bộ phận: [{dept_code, name_vi, name_zh, rows}] (bộ phận không có dòng thì bỏ) */
function reportGroupByDept_(rows, depts) {
  var by = {};
  rows.forEach(function (r) { (by[r.dept_code] = by[r.dept_code] || []).push(r); });
  var out = [];
  depts.forEach(function (d) {
    if (!by[d.dept_code]) return;
    out.push({ dept_code: d.dept_code, name_vi: d.name_vi || '', name_zh: d.name_zh || '', rows: by[d.dept_code] });
    delete by[d.dept_code];
  });
  Object.keys(by).sort().forEach(function (k) { out.push({ dept_code: k, name_vi: k, name_zh: '', rows: by[k] }); });
  return out;
}

function reportPct_(a, b) {
  return b > 0 ? Math.round(a / b * 1000) / 10 : null;
}

function reportUserName_(dir, id) {
  if (!id) return '';
  if (id === SYSTEM_USER) return SYSTEM_USER;
  var u = dir[id];
  return u ? u.display_name : '';
}

/* ---------------- 1. Danh mục tài liệu hiện hành ---------------- */

function reportCatalog_(ctx, f, today) {
  var all = reportItems_(ctx, f.dept, false);
  var vers = sheetExists_('Versions') ? readRows_('Versions') : [];
  var vById = {};
  vers.forEach(function (v) { vById[v.version_id] = v; });
  var warn = Number(setting_('review_warn_days')) || 30;
  var soon = addDaysIso_(today, warn);
  var total = all.length, issued = 0, na = 0, overdue = 0, dueSoon = 0, noFile = 0;
  var rows = [];
  all.forEach(function (it) {
    if (it.status === 'ISSUED') issued++;
    if (it.status === 'NA') na++;
    var rs = '';
    if (it.status === 'ISSUED' && it.review_due) {
      if (String(it.review_due) < today) { rs = 'OVERDUE'; overdue++; } else if (String(it.review_due) <= soon) { rs = 'SOON'; dueSoon++; }
    }
    if (it.status === 'ISSUED' && it.file_missing) noFile++;
    if (f.scope === 'ISSUED' && it.status !== 'ISSUED') return;
    var cv = it.current_version_id ? vById[it.current_version_id] : null;
    rows.push({
      item_id: it.item_id, dept_code: it.dept_code, code: it.code, name_vi: it.name_vi || '', name_zh: it.name_zh || '',
      kind: it.kind || 'FORM', level: it.level || 'DEPT', status: it.status || 'NONE',
      rev: it.status === 'ISSUED' || it.status === 'NA' ? String(it.current_rev || (it.status === 'ISSUED' ? '01' : '')) : '',
      issued_at: it.status === 'ISSUED' || it.status === 'NA' ? String(it.issued_at || '') : '',
      effective_date: it.status === 'ISSUED' ? String((cv && cv.state === 'ISSUED' && cv.effective_date) || it.issued_at || '') : '',
      review_due: it.status === 'ISSUED' ? String(it.review_due || '') : '', review_state: rs,
      file_missing: !!(it.status === 'ISSUED' && it.file_missing), keep: it.keep || '', where: it.where || ''
    });
  });
  return {
    data: { depts: reportGroupByDept_(rows, reportDepts_()), counts: { total: total, issued: issued, na: na, shown: rows.length, review_overdue: overdue, review_soon: dueSoon, file_missing: noFile } },
    rows: rows.length,
    tiles: [
      { k: 'rpt.t.items', v: String(total) },
      { k: 'rpt.t.issued', v: String(issued) },
      { k: 'rpt.t.issued_pct', v: reportPct_(issued, total - na) === null ? '—' : String(reportPct_(issued, total - na)).replace('.', ',') + ' %' },
      { k: 'rpt.t.review_overdue', v: String(overdue), tone: overdue ? 'red' : '' }
    ]
  };
}

/* ---------------- 2. Tình trạng hồ sơ theo bộ phận và kỳ ---------------- */

/**
 * Ô của một biểu trong một cột (tháng/quý): gom các kỳ của biểu rơi vào cột (kỳ gán vào cột chứa ngày kết thúc kỳ; kỳ kết thúc sau
 * khoảng báo cáo gán vào cột cuối). Không tính kỳ bắt đầu sau hôm nay và kỳ NA. Trả {t: chữ trong ô, s: OK | LATE | DUE | ''}.
 */
function reportCellText_(n, ok, late) {
  if (!n) return { t: '', s: '' };
  if (n === 1) return ok ? { t: '✓', s: 'OK' } : (late ? { t: '!', s: 'LATE' } : { t: '–', s: 'DUE' });
  return { t: (late ? '! ' : '') + ok + '/' + n, s: late ? 'LATE' : (ok === n ? 'OK' : 'DUE') };
}

function reportRecords_(ctx, f, today) {
  var grain = f.grain;
  var endP = reportPeriodOfKey_(grain, f.end);
  var cols = [endP];
  while (cols.length < f.n) cols.unshift(periodOf_(grain, addDaysIso_(cols[0].from, -1)));
  var rangeFrom = cols[0].from, rangeTo = cols[cols.length - 1].to;
  var colOf = function (d) {
    for (var i = cols.length - 1; i >= 0; i--) if (d >= cols[i].from) return d <= cols[i].to ? i : -1;
    return -1;
  };
  var grace = graceDays_();
  var startSet = String(setting_('records_start_date') || '');
  var srcs = evidenceSources_();
  var recsBy = {}, evBy = {};
  if (sheetExists_('Records')) readRows_('Records').forEach(function (r) { if (!r.archived_at && r.status === 'SUBMITTED') (recsBy[r.item_id] = recsBy[r.item_id] || []).push(r); });
  if (sheetExists_('Evidence')) readRows_('Evidence').forEach(function (e) { if (!e.archived_at && Number(e.count) > 0) (evBy[e.item_id] = evBy[e.item_id] || []).push(e); });
  var notCounted = { NOT_ISSUED: 0, NA: 0, FROM_APP: 0, NO_START: 0 };
  var rows = [];
  reportItems_(ctx, f.dept, true).forEach(function (it) {
    var recs = recsBy[it.item_id] || [], evs = evBy[it.item_id] || [];
    var ci = recordCountInfo_(it, startSet, today, srcs);
    var cells = [], ok = 0, late = 0, due = 0, any = false;
    var row = { item_id: it.item_id, dept_code: it.dept_code, code: it.code, name_vi: it.name_vi || '', name_zh: it.name_zh || '', type: ci.type, src: ci.src,
      counted: ci.counted, status: it.status || 'NONE' };
    if (ci.type === 'EVENT') {
      var cnt = cols.map(function () { return 0; });
      recs.forEach(function (r) {
        var d = String(r.record_date || r.period_to || '');
        var k = colOf(d);
        if (k >= 0) { cnt[k]++; any = true; }
      });
      cells = cnt.map(function (c) { return c ? { t: String(c), s: 'EV' } : { t: '', s: '' }; });
      row.events = cnt.reduce(function (a, b) { return a + b; }, 0);
      var evN = 0, evFrom = '', evTo = '';
      evs.forEach(function (e) {
        if (String(e.period_to) < rangeFrom || String(e.period_from) > rangeTo) return;
        evN += Number(e.count) || 0;
        if (!evFrom || String(e.period_from) < evFrom) evFrom = String(e.period_from);
        if (String(e.period_to) > evTo) evTo = String(e.period_to);
      });
      if (evN) { row.ev = { src: ci.src || evidenceSourceOf_(it), count: evN, from: evFrom, to: evTo }; any = true; }
    } else {
      var acc = cols.map(function () { return { n: 0, ok: 0, late: 0 }; });
      var p = periodOf_(ci.type, rangeFrom);
      for (var g = 0; p && p.from <= rangeTo && g < 800; g++) {
        if (p.from <= today) {
          var s = periodCellState_(p, recs, evs, ci.counted, ci.start, today, grace);
          if (s !== 'NA') {
            var k = colOf(p.to < rangeTo ? p.to : rangeTo);
            if (k >= 0) {
              acc[k].n++;
              if (s === 'OK') { acc[k].ok++; ok++; } else if (s === 'LATE') { acc[k].late++; late++; } else due++;
              if (s === 'OK') any = true;
            }
          }
        }
        p = periodOf_(ci.type, addDaysIso_(p.to, 1));
      }
      cells = acc.map(function (a) { return reportCellText_(a.n, a.ok, a.late); });
    }
    if (!ci.counted) {
      if (!any) {
        var why = ci.reason === 'NOT_ISSUED' ? (it.status === 'NA' ? 'NA' : 'NOT_ISSUED') : ci.reason;
        notCounted[why] = (notCounted[why] || 0) + 1;
        return;
      }
    }
    row.cells = cells;
    row.ok = ok; row.late = late; row.due = due; row.rate = reportPct_(ok, ok + late);
    rows.push(row);
  });
  var sumOf = function (list) {
    var s = { items: list.length, periodic: 0, events: 0, ok: 0, late: 0, due: 0, items_late: 0 };
    list.forEach(function (r) {
      if (r.type === 'EVENT') { s.events += r.events || 0; return; }
      s.periodic++;
      s.ok += r.ok; s.late += r.late; s.due += r.due;
      if (r.late) s.items_late++;
    });
    s.rate = reportPct_(s.ok, s.ok + s.late);
    return s;
  };
  var depts = reportGroupByDept_(rows, reportDepts_());
  depts.forEach(function (d) { d.sum = sumOf(d.rows); });
  var tot = sumOf(rows);
  return {
    data: {
      grain: grain, cols: cols.map(function (c) { return { key: c.key, from: c.from, to: c.to }; }), from: rangeFrom, to: rangeTo,
      depts: depts, totals: tot, not_counted: notCounted, grace: grace
    },
    rows: rows.length,
    tiles: [
      { k: 'rpt.t.tracked', v: String(tot.items) },
      { k: 'rpt.t.periods_due', v: String(tot.ok + tot.late) },
      { k: 'rpt.t.on_time', v: tot.rate === null ? '—' : String(tot.rate).replace('.', ',') + ' %', tone: tot.late ? '' : 'green' },
      { k: 'rpt.t.late', v: String(tot.late), tone: tot.late ? 'red' : '' }
    ]
  };
}

/* ---------------- 3. Phủ điều khoản ---------------- */

/** Bảng phủ một chuẩn — GIỐNG HỆT coverageRows() trong js/coverage.js (đếm như hai trang Phủ của file Excel tổng) */
function coverageRowsSrv_(items, clauses, std) {
  var isoKey = function (it) { return ';' + String(it.iso9001 || '').split(' ').join('') + ';'; };
  return clauses.filter(function (c) { return c.std === std && c.active !== false && !c.archived_at; })
    .sort(function (a, b) { return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.key).localeCompare(String(b.key)); })
    .map(function (c) {
      var key = String(c.key);
      var kl = key.toLowerCase();
      var hit = items.filter(function (it) {
        return std === 'BRC' ? !!key && String(it.brc_topics || '').toLowerCase().indexOf(kl) >= 0 : !!key && isoKey(it).indexOf(';' + key) >= 0;
      });
      var issued = hit.filter(function (it) { return it.status === 'ISSUED'; }).length;
      var mandatory = std === 'ISO9001' && !!c.mandatory_record;
      var state = !hit.length ? (mandatory ? 'MISSING' : 'NONE') : (issued ? 'OK' : 'NOT_ISSUED');
      return {
        key: key, group_vi: c.group_vi || '', group_zh: c.group_zh || '', name_vi: c.name_vi || '', name_zh: c.name_zh || '', mandatory: mandatory,
        n: hit.length, issued: issued, app: hit.filter(function (it) { return it.where === 'ME' || it.where === 'CS'; }).length, state: state,
        items: hit
      };
    });
}

function reportCoverage_(ctx, f) {
  var items = reportItems_(ctx, f.dept, true);
  var clauses = readRows_('Clauses');
  var stds = f.std === 'BOTH' ? ['ISO9001', 'BRC'] : [f.std];
  var tiles = [];
  var n = 0;
  var out = stds.map(function (std) {
    var rows = coverageRowsSrv_(items, clauses, std).map(function (r) {
      var o = { key: r.key, group_vi: r.group_vi, group_zh: r.group_zh, name_vi: r.name_vi, name_zh: r.name_zh, mandatory: r.mandatory,
        n: r.n, issued: r.issued, app: r.app, state: r.state };
      if (f.codes) o.codes = r.items.slice().sort(reportItemCmp_).map(function (it) { return { code: it.code, status: it.status || 'NONE' }; });
      return o;
    });
    var sum = { total: rows.length, mandatory: 0, MISSING: 0, NONE: 0, NOT_ISSUED: 0, OK: 0 };
    rows.forEach(function (r) { sum[r.state]++; if (r.mandatory) sum.mandatory++; });
    sum.covered = sum.total - sum.MISSING - sum.NONE;
    n += rows.length;
    if (std === 'ISO9001') {
      tiles.push({ k: 'rpt.t.iso_covered', v: sum.covered + '/' + sum.total });
      tiles.push({ k: 'rpt.t.iso_missing', v: String(sum.MISSING), tone: sum.MISSING ? 'red' : 'green' });
    } else {
      tiles.push({ k: 'rpt.t.brc_covered', v: sum.covered + '/' + sum.total });
    }
    tiles.push({ k: std === 'BRC' ? 'rpt.t.brc_not_issued' : 'rpt.t.iso_not_issued', v: String(sum.NOT_ISSUED), tone: sum.NOT_ISSUED ? 'amber' : '' });
    return { std: std, rows: rows, sum: sum };
  });
  return { data: { stds: out, codes: f.codes, items: items.length }, rows: n, tiles: tiles };
}

/* ---------------- 4. Lịch sử phiên bản ---------------- */

function reportVersions_(ctx, f) {
  var it = findOne_('Items', 'item_id', f.item_id);
  if (!it || it.archived_at) throw validationError_([fieldError_('filters.item_id', 'NOT_FOUND')]);
  if (!itemVisible_(ctx.user, it)) throw apiError_('FORBIDDEN');
  var dir = userDirectory_();
  var low = Number(ctx.user.role_level) < 2 && !isSecretary_(ctx.user);
  var list = (sheetExists_('Versions') ? readRows_('Versions') : []).filter(function (v) {
    if (v.archived_at || v.item_id !== it.item_id || v.state === 'CANCELLED') return false;
    return !low || v.state === 'ISSUED' || v.state === 'SUPERSEDED';
  }).sort(function (a, b) { return String(a.rev).localeCompare(String(b.rev)) || String(a.created_at).localeCompare(String(b.created_at)); });
  var rows = list.map(function (v) {
    return {
      rev: v.rev || '', vtype: v.vtype || 'REVISION', state: v.state, summary_vi: v.change_summary_vi || '', summary_zh: v.change_summary_zh || '',
      author: reportUserName_(dir, v.author_id), submitted_at: String(v.submitted_at || '').slice(0, 10),
      approved_by: reportUserName_(dir, v.approved_by), approved_at: String(v.approved_at || '').slice(0, 10),
      issued_by: reportUserName_(dir, v.issued_by), issued_at: String(v.issued_at || '').slice(0, 10),
      effective_date: v.state === 'ISSUED' || v.state === 'SUPERSEDED' ? String(v.effective_date || '').slice(0, 10) : '',
      superseded_at: String(v.superseded_at || '').slice(0, 10), has_pdf: !!v.pdf_doc_id
    };
  });
  var revs = {};
  list.forEach(function (v) { if (v.state === 'ISSUED' || v.state === 'SUPERSEDED') revs[v.rev] = true; });
  // Biểu ● nhập từ danh mục Excel: lần hiện hành chưa có phiên bản trong app → một dòng ghi chú
  var imported = it.status === 'ISSUED' && it.current_rev && !revs[it.current_rev] ? { rev: String(it.current_rev), issued_at: String(it.issued_at || ''), file_missing: !!it.file_missing } : null;
  if (imported) revs[imported.rev] = true;
  var d = findOne_('Depts', 'dept_code', it.dept_code) || {};
  var item = {
    item_id: it.item_id, code: it.code, name_vi: it.name_vi || '', name_zh: it.name_zh || '', dept_code: it.dept_code, dept_vi: d.name_vi || it.dept_code, dept_zh: d.name_zh || '',
    kind: it.kind || 'FORM', level: it.level || 'DEPT', status: it.status || 'NONE', current_rev: it.current_rev || '', issued_at: it.issued_at || '',
    review_due: it.status === 'ISSUED' ? it.review_due || '' : '', reviewed_at: String(it.reviewed_at || '').slice(0, 10), reviewed_by: reportUserName_(dir, it.reviewed_by),
    iso9001: it.iso9001 || '', brc_topics: it.brc_topics || '', flow: it.flow || '', keep: it.keep || '', owner: reportUserName_(dir, it.owner_user_id),
    na_reason: it.status === 'NA' ? it.na_reason || '' : '', issued_source: it.issued_source || ''
  };
  return {
    data: { item: item, rows: rows, imported: imported },
    rows: rows.length,
    tiles: [
      { k: 'rpt.t.current_rev', v: it.status === 'ISSUED' ? String(it.current_rev || '01') : '—' },
      { k: 'rpt.t.issued_at', v: it.status === 'ISSUED' && it.issued_at ? fmtDateVN_(it.issued_at) : '—' },
      { k: 'rpt.t.review_due', v: item.review_due ? fmtDateVN_(item.review_due) : '—' },
      { k: 'rpt.t.revisions', v: String(Object.keys(revs).length) }
    ]
  };
}

/* ---------------- 5. Sổ phân phối & thu hồi (2d) ---------------- */

function reportDist_(ctx, f, today) {
  var items = {};
  readRows_('Items').forEach(function (it) { items[it.item_id] = it; });
  var dir = userDirectory_();
  var days = Number(setting_('dist_recall_days')) || 7;
  var cnt = { active: 0, copies: 0, due: 0, overdue: 0, recalled: 0, docs: {} };
  var rows = [];
  (sheetExists_('Distributions') ? readRows_('Distributions') : []).forEach(function (d) {
    if (d.archived_at || d.state === 'VOID') return;
    var it = items[d.item_id];
    if (!canSeeRecords_(ctx.user, it)) return;
    if (f.dept && d.dept_code !== f.dept) return;
    var due = distDue_(d, it);
    var since = due ? distDueSince_(it) : '';
    var over = !!(due && since && addDaysIso_(since, days) < today);
    var st = d.state === 'RECALLED' ? 'RECALLED' : (due ? 'DUE' : 'ACTIVE');
    if (d.state === 'ACTIVE') { cnt.active++; cnt.copies += Number(d.copies) || 0; cnt.docs[d.item_id] = 1; }
    if (due) cnt.due++;
    if (over) cnt.overdue++;
    if (d.state === 'RECALLED') cnt.recalled++;
    if (f.state !== 'ALL' && f.state !== st) return;
    rows.push({
      dist_id: d.dist_id, item_id: d.item_id, dept_code: d.dept_code, code: it.code, name_vi: it.name_vi || '', name_zh: it.name_zh || '',
      sort: Number(it.sort_order) || 0, rev: String(d.rev || ''), cur_rev: itemCurRev_(it), holder: d.holder || '', copies: Number(d.copies) || 0,
      dist_date: String(d.dist_date || ''), dist_by: reportUserName_(dir, d.created_by), state: st, overdue: over, due_since: since,
      recalled_date: String(d.recalled_date || ''), recalled_by: reportUserName_(dir, d.recalled_by), note: [d.note, d.recall_note].filter(function (x) { return x; }).join(' · ')
    });
  });
  rows.sort(function (a, b) { return a.sort - b.sort || String(a.code).localeCompare(String(b.code)) || String(a.dist_date).localeCompare(String(b.dist_date)); });
  return {
    data: { depts: reportGroupByDept_(rows, reportDepts_()), counts: { active: cnt.active, copies: cnt.copies, due: cnt.due, overdue: cnt.overdue, recalled: cnt.recalled, docs: Object.keys(cnt.docs).length, shown: rows.length }, recall_days: days },
    rows: rows.length,
    tiles: [
      { k: 'rpt.t.dist_docs', v: String(Object.keys(cnt.docs).length) },
      { k: 'rpt.t.dist_copies', v: String(cnt.copies) },
      { k: 'rpt.t.dist_due', v: String(cnt.due), tone: cnt.overdue ? 'red' : (cnt.due ? 'amber' : '') },
      { k: 'rpt.t.dist_recalled', v: String(cnt.recalled) }
    ]
  };
}

/* ---------------- 6. Phiếu đề nghị tài liệu (2d) ---------------- */

/** Một phiếu → dòng báo cáo (tên tài liệu, người, kết quả, thực hiện) */
function reportReqRow_(r, items, vers, dir) {
  var it = r.item_id ? items[r.item_id] : null;
  var v = r.version_id ? vers[r.version_id] : null;
  return {
    request_id: r.request_id, code: r.code, req_type: r.req_type, dept_code: r.dept_code, level: r.level || 'DEPT', state: r.state,
    submitted_at: String(r.submitted_at || ''), requester: r.requester_name || reportUserName_(dir, r.submitted_by), entered_by: r.requester_name ? reportUserName_(dir, r.submitted_by) : '',
    item_code: it ? it.code : (r.new_code || ''), item_name_vi: it ? it.name_vi || '' : r.title_vi || '', item_name_zh: it ? it.name_zh || '' : r.title_zh || '',
    cur_rev: it ? itemCurRev_(it) : '', new_kind: r.new_kind || '',
    reason_vi: r.reason_vi || '', reason_zh: r.reason_zh || '', content_vi: r.content_vi || '', content_zh: r.content_zh || '', want_date: String(r.want_date || ''),
    decided_by: reportUserName_(dir, r.decided_by), decided_at: String(r.decided_at || ''), decide_note: r.decide_note || '',
    version_rev: v ? String(v.rev || '') : '', version_state: v ? v.state : '', done_at: String(r.done_at || ''), done_by: reportUserName_(dir, r.done_by), done_note: r.done_note || '',
    cancelled_at: String(r.cancelled_at || ''), cancel_reason: r.cancel_reason || ''
  };
}

function reportDocreq_(ctx, f) {
  var items = {}, vers = {};
  readRows_('Items').forEach(function (it) { items[it.item_id] = it; });
  if (sheetExists_('Versions')) readRows_('Versions').forEach(function (v) { vers[v.version_id] = v; });
  var dir = userDirectory_();
  var all = (sheetExists_('DocRequests') ? readRows_('DocRequests') : []).filter(function (r) { return !r.archived_at && docreqVisible_(ctx.user, r); });
  if (f.request_id) {
    var one = all.filter(function (r) { return r.request_id === f.request_id; })[0];
    if (!one) {
      var ex = sheetExists_('DocRequests') ? findOne_('DocRequests', 'request_id', f.request_id) : null;
      if (ex && !ex.archived_at) throw apiError_('FORBIDDEN');
      throw validationError_([fieldError_('filters.request_id', 'NOT_FOUND')]);
    }
    var row = reportReqRow_(one, items, vers, dir);
    return {
      data: { one: row }, rows: 1,
      tiles: [
        { k: 'rpt.t.req_type', v: lab_('dr.type.' + row.req_type) },
        { k: 'rpt.t.req_state', v: lab_('dr.state.' + row.state), tone: row.state === 'REJECTED' ? 'red' : (row.state === 'DONE' ? 'green' : (row.state === 'CANCELLED' ? 'muted' : 'amber')) },
        { k: 'rpt.t.req_date', v: fmtDateVN_(row.submitted_at) },
        { k: 'rpt.t.req_level', v: lab_('level_doc.' + row.level) }
      ]
    };
  }
  var y = String(f.year);
  var cnt = { total: 0, open: 0, approved: 0, done: 0, rejected: 0 };
  var rows = [];
  all.forEach(function (r) {
    if (String(r.submitted_at || '').slice(0, 4) !== y) return;
    if (f.dept && r.dept_code !== f.dept) return;
    if (r.state === 'CANCELLED' && f.state !== 'ALL') return;
    cnt.total++;
    if (r.state === 'SUBMITTED') cnt.open++;
    if (r.state === 'APPROVED') cnt.approved++;
    if (r.state === 'DONE') cnt.done++;
    if (r.state === 'REJECTED') cnt.rejected++;
    var grp = r.state === 'SUBMITTED' || r.state === 'APPROVED' ? 'OPEN' : r.state;
    if (f.state !== 'ALL' && f.state !== grp) return;
    rows.push(reportReqRow_(r, items, vers, dir));
  });
  rows.sort(function (a, b) { return String(a.code).localeCompare(String(b.code)); });
  return {
    data: { depts: reportGroupByDept_(rows, reportDepts_()), counts: cnt, year: f.year },
    rows: rows.length,
    tiles: [
      { k: 'rpt.t.req_total', v: String(cnt.total) },
      { k: 'rpt.t.req_open', v: String(cnt.open), tone: cnt.open ? 'amber' : '' },
      { k: 'rpt.t.req_approved', v: String(cnt.approved), tone: cnt.approved ? 'amber' : '' },
      { k: 'rpt.t.req_done', v: String(cnt.done), tone: cnt.done ? 'green' : '' }
    ]
  };
}

/* ---------------- Tính một báo cáo ---------------- */

/**
 * Tính báo cáo (không ghi gì): kiểm quyền loại báo cáo, chuẩn hóa bộ lọc, gom số liệu theo phạm vi của người dùng.
 * Trả bản chụp {kind, title_vi, title_zh, code: '', form_code, form_rev, filters, generated_at, generated_by, generated_by_name, today,
 * scope_depts, tiles, rows, data}.
 */
function reportCompute_(ctx, kind, filters) {
  if (REPORT_KINDS_.indexOf(kind) < 0) throw validationError_([fieldError_('kind', 'INVALID_VALUE')]);
  if (!reportKindAllowed_(ctx.user, kind)) throw apiError_('FORBIDDEN');
  var today = todayVN_();
  var f = reportFilters_(kind, filters, today);
  var res = kind === 'CATALOG' ? reportCatalog_(ctx, f, today) : kind === 'RECORDS' ? reportRecords_(ctx, f, today)
    : kind === 'COVERAGE' ? reportCoverage_(ctx, f) : kind === 'DIST' ? reportDist_(ctx, f, today)
    : kind === 'DOCREQ' ? reportDocreq_(ctx, f) : kind === 'CAPA' ? reportCapa_(ctx, f, today) : reportVersions_(ctx, f);
  var t = LABELS['rpt.title.' + kind + (kind === 'CAPA' ? capaTitleSuffix_(f) : '')] || [kind, kind];
  var formCode = reportFormCode_(kind, f);
  var formRev = '';
  if (formCode) {
    var fi = findOne_('Items', 'code', formCode);
    if (fi && fi.status === 'ISSUED') formRev = String(fi.current_rev || '01');
  }
  var me = userDirectory_()[ctx.user.user_id] || {};
  var dl = '';
  if (f.dept) {
    var dd = findOne_('Depts', 'dept_code', f.dept) || {};
    dl = f.dept + ' · ' + [dd.name_vi, dd.name_zh].filter(function (x) { return x; }).join(' · ');
  }
  return {
    kind: kind, title_vi: t[0], title_zh: t[1], code: '', form_code: formCode, form_rev: formRev, filters: f,
    generated_at: isoVN_(now_()), generated_by: ctx.user.user_id, generated_by_name: me.display_name || ctx.user.display_name || '', today: today,
    dept_label: dl, scope_depts: seesAllDepts_(ctx.user) ? '' : userDepts_(ctx.user).join(', '),
    tiles: res.tiles, rows: res.rows, data: res.data
  };
}

/** Đuôi khóa tiêu đề báo cáo khắc phục: một phiếu theo mẫu in (_RECEIPT, _D8, _SCAR; phiếu khắc phục không đuôi), sổ (_LOG, _LOG_COMPLAINT…) */
function capaTitleSuffix_(f) {
  if (f.capa_id) return f.form && f.form !== 'CAR' ? '_' + f.form : '';
  return '_LOG' + (f.source === 'COMPLAINT' || f.source === 'SUPPLIER' ? '_' + f.source : '');
}

/** Tên tệp tải về: BC-2611-001_danh-muc-tai-lieu.pdf (lịch sử phiên bản thêm mã biểu) */
function reportFileName_(snap, ext) {
  var tail = snap.kind === 'VERSIONS' && snap.data && snap.data.item ? '_' + String(snap.data.item.code).replace(/[\/\\:*?"<>|\s]+/g, '-')
    : (snap.kind === 'DOCREQ' || snap.kind === 'CAPA') && snap.data && snap.data.one ? '_' + String(snap.data.one.code) : '';
  var cf = snap.filters || {};
  var slug = snap.kind !== 'CAPA' ? REPORT_SLUG_[snap.kind]
    : snap.data && snap.data.one ? CAPA_FORM_SLUG_[cf.form || 'CAR'] || 'phieu-khac-phuc' : CAPA_LOG_SLUG_[cf.source] || REPORT_SLUG_.CAPA;
  return (snap.code ? snap.code + '_' : '') + slug + tail + '.' + ext;
}

/* ---------------- Action ---------------- */

/** report.run {kind, filters}: báo cáo xem trước theo bộ lọc (cần mạng, không lưu, chưa có mã) */
function reportRun_(ctx) {
  var p = ctx.req.payload || {};
  var snap = reportCompute_(ctx, p.kind, p.filters || {});
  return { report: snap, layout: reportLayout_(snap), logo_rev: reportLogoRev_() };
}

function reportRunResult_(run) {
  var dir = userDirectory_();
  return {
    report_run_id: run.report_run_id, code: run.code, kind: run.kind, title_vi: run.title_vi, title_zh: run.title_zh, filters: run.filters_json || {},
    summary: run.summary_json || null, row_count: run.row_count, generated_at: run.generated_at, generated_by: run.generated_by,
    generated_by_name: reportUserName_(dir, run.generated_by), has_pdf: !!run.pdf_doc_id, pdf_size: run.pdf_size || null, record_version: run.record_version
  };
}

/** Bản chụp đã lưu của một báo cáo (tệp JSON riêng tư), gắn mã báo cáo */
function reportSnapshotOf_(run) {
  var d = findOne_('Documents', 'document_id', run.snapshot_doc_id);
  if (!d || !d.drive_file_id) throw validationError_([fieldError_('report_run_id', 'FILE_MISSING')]);
  var snap;
  try {
    snap = JSON.parse(DriveApp.getFileById(String(d.drive_file_id)).getBlob().getDataAsString('UTF-8'));
  } catch (e) {
    throw validationError_([fieldError_('report_run_id', 'FILE_MISSING')]);
  }
  snap.code = run.code;
  snap.report_run_id = run.report_run_id;
  return snap;
}

/** Dòng Documents cho tệp của báo cáo (bản chụp JSON, PDF) — để sao lưu / nối lại ID tệp khi khôi phục */
function reportDocRow_(ctx, docId, runId, kind, file, mime, name, size, sha) {
  return cNew_(ctx, {
    document_id: docId, entity_type: 'REPORT_RUN', entity_id: runId, kind: kind, drive_file_id: file.getId(), mime_type: mime, file_name: name,
    access_scope: 'REPORT', active: true, managed_folder_id: appFolder_().getId(), owned_by_app: true, size_bytes: size, thumb_drive_file_id: '',
    sha256: sha || '', page_no: ''
  });
}

/**
 * Lưu một báo cáo mới: tính lại ở máy chủ, ghi bản chụp JSON lên Drive (ngoài khóa ghi), rồi cấp mã BC-yymm-001 và ghi
 * ReportRuns + Documents dưới khóa ghi (executeWrite_, chống trùng theo operation_id). Trả dòng ReportRuns.
 */
function reportCreateRun_(ctx, p) {
  var snap = reportCompute_(ctx, p.kind, p.filters || {});
  snap.report_run_id = p.report_run_id;
  var json = JSON.stringify(snap);
  if (json.length > REPORT_SNAPSHOT_MAX_) throw validationError_([fieldError_('filters', 'REPORT_TOO_LARGE')]);
  var docId = uuid_();
  var file = appFolder_().createFile(Utilities.newBlob(json, 'application/json', 'BaoCao_' + p.report_run_id.slice(0, 8) + '_' + snap.kind + '.json'));
  var res;
  try {
    res = executeWrite_(ctx, {
      entity_type: 'REPORT_RUN', entity_id: p.report_run_id,
      build: function (st) {
        if (findRowNums_('ReportRuns', 'report_run_id', p.report_run_id).length) throw validationError_([fieldError_('report_run_id', 'ID_EXISTS')]);
        var su = {};
        var code = allocCode_(st, su, 'REPORT', now_());
        var run = cNew_(ctx, {
          report_run_id: p.report_run_id, code: code, kind: snap.kind, title_vi: snap.title_vi, title_zh: snap.title_zh, filters_json: snap.filters,
          summary_json: { tiles: snap.tiles }, row_count: snap.rows, dept_code: snap.filters.dept || '', generated_at: snap.generated_at,
          generated_by: ctx.user.user_id, snapshot_doc_id: docId, pdf_doc_id: '', pdf_file_name: '', pdf_size: '', status: 'SAVED'
        });
        return {
          writes: [
            { sheet: 'Documents', mode: 'insert', row: reportDocRow_(ctx, docId, p.report_run_id, 'SNAPSHOT', file, 'application/json', code + '.json', json.length, '') },
            { sheet: 'ReportRuns', mode: 'insert', row: run }
          ],
          state: su,
          result: { entity_type: 'REPORT_RUN', entity_id: p.report_run_id, code: code, record_version: 1 },
          record_version: 1,
          audit: { entity_type: 'REPORT_RUN', entity_id: p.report_run_id, before_json: null, after_json: { code: code, kind: snap.kind, filters: snap.filters, rows: snap.rows } }
        };
      }
    });
  } catch (e) {
    trashQuietly_(file);
    throw e;
  }
  if (res.code === 'DUPLICATE_OPERATION') trashQuietly_(file);
  dbReset_();
  var run = findOne_('ReportRuns', 'report_run_id', p.report_run_id);
  if (!run) throw apiError_('NOT_FOUND');
  return run;
}

/** PDF của báo cáo đã lưu: tệp đã dựng thì đọc lại; chưa có (hoặc tệp mất) thì dựng từ bản chụp rồi lưu lên Drive */
function reportPdfOf_(ctx, run, snap) {
  if (run.pdf_doc_id) {
    var d = findOne_('Documents', 'document_id', run.pdf_doc_id);
    if (d && d.drive_file_id) {
      try {
        var f0 = DriveApp.getFileById(String(d.drive_file_id));
        if (!f0.isTrashed()) return f0.getBlob().getBytes();
      } catch (e) { /* tệp mất: dựng lại */ }
    }
  }
  var bytes = reportPdfBuild_(snap);
  var name = reportFileName_(snap, 'pdf');
  var file = appFolder_().createFile(Utilities.newBlob(bytes, 'application/pdf', name));
  var docId = uuid_();
  var keep = false;
  try {
    // Tệp PDF thuộc báo cáo đã lưu: ghi Documents + cột PDF của ReportRuns (tăng table_rev như mọi lần ghi)
    systemWrite_([
      { sheet: 'Documents', mode: 'insert', row: reportDocRow_(ctx, docId, run.report_run_id, 'PDF', file, 'application/pdf', name, bytes.length, b64url_(sha256_(bytes))) },
      { sheet: 'ReportRuns', mode: 'update', partial: true, row: {
        report_run_id: run.report_run_id, pdf_doc_id: docId, pdf_file_name: name, pdf_size: bytes.length,
        record_version: (Number(run.record_version) || 1) + 1, updated_at: isoVN_(now_()), updated_by: ctx.user.user_id } }
    ]);
    keep = true;
  } finally {
    if (!keep) trashQuietly_(file);
  }
  run.pdf_doc_id = docId;
  return bytes;
}

/**
 * report.save {report_run_id, kind, filters, format: PDF | XLSX}: báo cáo có mã. report_run_id chưa có → tính và lưu bản chụp, cấp mã
 * BC-yymm-001; đã có (bấm Tải PDF rồi Tải Excel, hoặc mở báo cáo đã lưu) → dùng lại bản chụp và mã cũ (bỏ qua kind/filters).
 * PDF: trả {run, file_name, mime_type, content_b64}; XLSX: trả {run, report (bản chụp có mã), layout, logo_rev, file_name} để app dựng Excel.
 */
function reportSave_(ctx) {
  var p = ctx.req.payload || {};
  if (!isUuidV4_(p.report_run_id)) throw validationError_([fieldError_('report_run_id', 'ID_INVALID')]);
  if (['PDF', 'XLSX'].indexOf(p.format) < 0) throw validationError_([fieldError_('format', 'INVALID_VALUE')]);
  ensureReportSchema_();
  var run = findOne_('ReportRuns', 'report_run_id', p.report_run_id);
  if (run) {
    if (!reportRunVisible_(ctx.user, run)) throw apiError_('FORBIDDEN');
  } else {
    if (Number(ctx.req.expected_version || 0) !== 0) throw validationError_([fieldError_('expected_version', 'INVALID_VALUE')]);
    run = reportCreateRun_(ctx, p);
  }
  var snap = reportSnapshotOf_(run);
  if (p.format === 'XLSX') {
    writeAudit_({ user_id: ctx.user.user_id, device_id: ctx.req.device_id, action: 'report.xlsx', entity_type: 'REPORT_RUN', entity_id: run.report_run_id,
      before_json: null, after_json: { code: run.code }, operation_id: '', auth_basis: authBasis_(ctx) });
    return { run: reportRunResult_(run), report: snap, layout: reportLayout_(snap), logo_rev: reportLogoRev_(), file_name: reportFileName_(snap, 'xlsx') };
  }
  var bytes = reportPdfOf_(ctx, run, snap);
  dbReset_();
  var after = findOne_('ReportRuns', 'report_run_id', run.report_run_id) || run;
  return { run: reportRunResult_(after), file_name: reportFileName_(snap, 'pdf'), mime_type: 'application/pdf', content_b64: b64_(bytes) };
}

/** report.list {kind?}: báo cáo đã lưu, mới nhất trước (tối đa 200) */
function reportList_(ctx) {
  var p = ctx.req.payload || {};
  if (!sheetExists_('ReportRuns')) return { items: [], total: 0 };
  var list = readRows_('ReportRuns').filter(function (r) {
    return reportRunVisible_(ctx.user, r) && (!p.kind || r.kind === p.kind);
  }).sort(function (a, b) { return String(b.generated_at).localeCompare(String(a.generated_at)) || String(b.code).localeCompare(String(a.code)); });
  return { items: list.slice(0, 200).map(reportRunResult_), total: list.length };
}

/** Dòng Trạng thái hệ thống: số báo cáo đã lưu, báo cáo gần nhất */
function reportHealth_() {
  if (!sheetExists_('ReportRuns')) return [false, 'Thiếu sheet ReportRuns', 'Chạy migrateSchema'];
  var runs = readRows_('ReportRuns').filter(function (r) { return !r.archived_at; });
  var last = runs.sort(function (a, b) { return String(b.generated_at).localeCompare(String(a.generated_at)); })[0];
  return [true, 'Đã lưu ' + runs.length + ' báo cáo' + (last ? ' · gần nhất ' + last.code + ' (' + String(last.generated_at).slice(0, 16).replace('T', ' ') + ')' : ''),
    setting_('report_logo_rev') ? '' : 'Chưa có logo công ty trên báo cáo: Tài khoản → Quản trị → Logo trên báo cáo'];
}

// ===== 28_report_pdf.js =====
/* 28_report_pdf: bố cục báo cáo và PDF (phiên 2c).
 * reportLayout_(snap): một bố cục chung từ bản chụp số liệu (27_reports.js) — tiêu đề hai thứ tiếng, thông tin hai cột (bộ lọc | số
 * báo cáo, ngày lập, người lập), ô số tóm tắt, các phần (bảng hoặc nhãn – giá trị), chú thích, khối ký Người lập / Người duyệt. App
 * vẽ bản xem trước và dựng Excel từ đúng bố cục này (report.run / report.save trả kèm) → màn hình, PDF, Excel cùng chữ, cùng số.
 * PDF dựng bằng Google Docs tạm (bộ dựng của Checksheet / M&E d4.11): A4 ngang, logo công ty ở đầu trang (Quản trị tải lên),
 * chân trang có mã báo cáo; xong đổi sang PDF rồi bỏ tài liệu tạm vào thùng rác. */

var PDF_C_ = {
  navy: '#17324F', ink: '#1F2933', muted: '#5B6875', line: '#C9D3DF', head: '#E6ECF3', zebra: '#F7F9FC', tile: '#F1F5F9', white: '#FFFFFF',
  good: '#1E7B4A', bad: '#B42318', warn: '#B54708'
};
var PDF_TONE_ = { green: PDF_C_.good, red: PDF_C_.bad, amber: PDF_C_.warn, muted: PDF_C_.muted, navy: PDF_C_.navy };
var PDF_STYLE_BUDGET_MS_ = 20000;
var PDF_LOGO_PX_H_ = 56;   // chiều cao logo đầu trang (Docs tính px ≈ 0,75 pt → khoảng 42 pt, 1,5 cm)
var PDF_MARGIN_ = 40;

/* ---------------- Bố cục chung ---------------- */

/** Nhãn hai dòng (Việt xuống dòng Trung) cho tiêu đề cột hẹp */
function labNl_(key, vars) {
  return lab_(key, vars).replace(' · ', '\n');
}
/** Chữ hai thứ tiếng của một bản ghi (tên Việt, xuống dòng tên Trung) */
function biNl_(vi, zh) {
  return [vi, zh].filter(function (x) { return x; }).join('\n');
}
function dmy_(iso) { return iso ? fmtDateVN_(iso) : ''; }
/** Mã kỳ tháng/quý → nhãn cột: 2026-11 → 11/2026; 2026-Q4 → Q4/2026 */
function reportColLabel_(grain, key) {
  return grain === 'MONTH' ? key.slice(5, 7) + '/' + key.slice(0, 4) : key.slice(5) + '/' + key.slice(0, 4);
}
function reportPctText_(v) { return v === null || v === undefined ? '—' : String(v).replace('.', ',') + ' %'; }

/** Bộ lọc → các dòng thông tin bên trái [[nhãn, giá trị]] */
function reportMetaLeft_(snap) {
  var f = snap.filters || {}, d = snap.data || {};
  var out = [];
  if (snap.kind === 'CAPA' && d.one) {
    out.push([lab_('rpt.f.capa'), d.one.code]);
    out.push([lab_('rpt.f.dept'), d.one.dept_code]);
    if (d.one.party_name) out.push([lab_('capa.party.' + d.one.source), d.one.party_name]);
    return out;
  }
  if (snap.kind === 'DOCREQ' && d.one) {
    out.push([lab_('rpt.f.req'), d.one.code]);
    out.push([lab_('rpt.f.dept'), d.one.dept_code]);
    return out;
  }
  if (snap.kind === 'VERSIONS') {
    var it = d.item || {};
    out.push([lab_('rpt.f.item'), it.code + ' · ' + (it.name_vi || it.name_zh || '')]);
    out.push([lab_('rpt.f.dept'), it.dept_code + ' · ' + it.dept_vi + (it.dept_zh ? ' · ' + it.dept_zh : '')]);
  } else {
    out.push([lab_('rpt.f.dept'), snap.dept_label || lab_('rpt.all_depts')]);
  }
  if (snap.kind === 'CATALOG') out.push([lab_('rpt.f.scope'), lab_('rpt.scope.' + f.scope)]);
  if (snap.kind === 'RECORDS') {
    var cols = d.cols || [];
    out.push([lab_('rpt.f.period'), (cols.length ? reportColLabel_(d.grain, cols[0].key) + ' – ' + reportColLabel_(d.grain, cols[cols.length - 1].key) : '') +
      ' (' + lab_('rpt.grain.' + d.grain) + ')']);
  }
  if (snap.kind === 'COVERAGE') out.push([lab_('rpt.f.std'), lab_('rpt.std.' + f.std)]);
  if (snap.kind === 'DIST') out.push([lab_('rpt.f.dist_state'), lab_('rpt.dist_state.' + f.state)]);
  if (snap.kind === 'DOCREQ') { out.push([lab_('rpt.f.year'), String(f.year)]); out.push([lab_('rpt.f.req_state'), lab_('rpt.req_state.' + f.state)]); }
  if (snap.kind === 'CAPA') {
    out.push([lab_('rpt.f.year'), String(f.year)]);
    out.push([lab_('rpt.f.capa_state'), lab_('rpt.capa_state.' + f.state)]);
    if (f.source && f.source !== 'ALL') out.push([lab_('rpt.f.capa_source'), lab_('rpt.capa_source.' + f.source)]);
  }
  if (snap.scope_depts) out.push([lab_('rpt.f.scope_depts'), snap.scope_depts]);
  return out;
}

function reportMetaRight_(snap) {
  var out = [];
  if (snap.form_code) out.push([lab_('rpt.form_code'), snap.form_code + (snap.form_rev ? ' · ' + lab_('rpt.rev_n', { N: snap.form_rev }) : '')]);
  out.push([lab_('rpt.number'), snap.code || lab_('rpt.no_code')]);
  out.push([lab_('rpt.generated_at'), dmy_(snap.generated_at) + ' ' + String(snap.generated_at || '').slice(11, 16)]);
  out.push([lab_('rpt.prepared_by'), snap.generated_by_name || '']);
  return out;
}

/** Bảng: {head: [chữ], types: [code | text | num | date | mid], rows: [[chữ]], tones: [[màu]] | null, widths?: [tỷ lệ]} */
function rptTable_(head, types, rows, tones) {
  return { head: head, types: types, rows: rows, tones: tones || null };
}

function layoutCatalog_(snap) {
  var d = snap.data, all = snap.filters.scope === 'ALL';
  var secs = [];
  var head = [labNl_('rpt.col.code'), labNl_('rpt.col.name'), labNl_('rpt.col.kind'), labNl_('rpt.col.rev'), labNl_('rpt.col.issued_at'),
    labNl_('rpt.col.effective'), labNl_('rpt.col.review_due')].concat(all ? [labNl_('rpt.col.status')] : []).concat([labNl_('rpt.col.note')]);
  var types = ['code', 'text', 'text', 'mid', 'date', 'date', 'date'].concat(all ? ['text'] : []).concat(['text']);
  d.depts.forEach(function (g) {
    var tones = [];
    var rows = g.rows.map(function (r) {
      var notes = [];
      if (r.review_state === 'OVERDUE') notes.push(lab_('rpt.note.review_overdue'));
      if (r.review_state === 'SOON') notes.push(lab_('rpt.note.review_soon'));
      if (r.file_missing) notes.push(lab_('rpt.note.file_missing'));
      var t = ['', '', '', '', '', '', r.review_state === 'OVERDUE' ? 'red' : (r.review_state === 'SOON' ? 'amber' : '')];
      if (all) t.push(r.status === 'ISSUED' ? 'green' : (r.status === 'DRAFTING' ? 'amber' : 'muted'));
      t.push(r.review_state === 'OVERDUE' ? 'red' : (r.file_missing || r.review_state === 'SOON' ? 'amber' : ''));
      tones.push(t);
      return [r.code, biNl_(r.name_vi, r.name_zh), labNl_('kind.' + r.kind), r.rev, dmy_(r.issued_at), dmy_(r.effective_date), dmy_(r.review_due)]
        .concat(all ? [STATUS_SYMBOL_[r.status] + ' ' + labNl_('status.' + r.status)] : []).concat([notes.join('\n')]);
    });
    secs.push({ heading: g.dept_code + ' · ' + biText_(g.name_vi, g.name_zh) + ' — ' + lab_('rpt.items_n', { N: g.rows.length }), table: rptTable_(head, types, rows, tones) });
  });
  if (!secs.length) secs.push({ table: rptTable_(head, types, [], null) });
  var notes = [];
  if (d.counts.na) notes.push(lab_('rpt.note.catalog_na', { N: d.counts.na }));
  if (d.counts.file_missing) notes.push(lab_('rpt.note.catalog_nofile', { N: d.counts.file_missing }));
  return { sections: secs, notes: notes };
}

function biText_(vi, zh) { return [vi, zh].filter(function (x) { return x; }).join(' · '); }

function layoutRecords_(snap) {
  var d = snap.data;
  var secs = [];
  // 1. Tổng hợp theo bộ phận
  var sh = [labNl_('rpt.col.dept'), labNl_('rpt.col.tracked'), labNl_('rpt.col.periods_due'), labNl_('rpt.col.ok'), labNl_('rpt.col.late'),
    labNl_('rpt.col.rate'), labNl_('rpt.col.items_late'), labNl_('rpt.col.events')];
  var st = ['text', 'num', 'num', 'num', 'num', 'num', 'num', 'num'];
  var sumRow = function (label, s) {
    return [label, String(s.items), String(s.ok + s.late), String(s.ok), String(s.late), reportPctText_(s.rate), String(s.items_late), String(s.events)];
  };
  var sumTone = function (s) { return ['', '', '', 'green', s.late ? 'red' : '', s.late ? '' : 'green', s.items_late ? 'red' : '', '']; };
  var srows = d.depts.map(function (g) { return sumRow(g.dept_code + ' · ' + biText_(g.name_vi, g.name_zh), g.sum); });
  var stones = d.depts.map(function (g) { return sumTone(g.sum); });
  if (d.depts.length > 1) { srows.push(sumRow(lab_('rpt.col.total'), d.totals)); stones.push(sumTone(d.totals)); }
  secs.push({ heading: lab_('rpt.sec.by_dept'), table: rptTable_(sh, st, srows, stones), total_row: d.depts.length > 1 });
  // 2. Từng bộ phận: biểu × tháng/quý
  var head = [labNl_('rpt.col.code'), labNl_('rpt.col.name'), labNl_('rpt.col.period_type')]
    .concat(d.cols.map(function (c) { return reportColLabel_(d.grain, c.key); }))
    .concat([labNl_('rpt.col.ok'), labNl_('rpt.col.late'), labNl_('rpt.col.rate')]);
  var types = ['code', 'text', 'text'].concat(d.cols.map(function () { return 'mid'; })).concat(['num', 'num', 'num']);
  var toneOf = { OK: 'green', LATE: 'red', DUE: 'muted', EV: 'navy', '': '' };
  d.depts.forEach(function (g) {
    var tones = [];
    var rows = g.rows.map(function (r) {
      var name = biNl_(r.name_vi, r.name_zh);
      if (r.ev) name += '\n' + lab_('rpt.note.ev', { S: lab_('link.src_short.' + r.ev.src), N: r.ev.count, F: dmy_(r.ev.from), T: dmy_(r.ev.to) });
      var ev = r.type === 'EVENT';
      tones.push(['', '', ''].concat(r.cells.map(function (c) { return toneOf[c.s] || ''; })).concat(['green', r.late ? 'red' : '', ev ? '' : (r.late ? 'red' : 'green')]));
      return [r.code, name, labNl_('period.' + r.type)].concat(r.cells.map(function (c) { return c.t; }))
        .concat(ev ? ['', '', ''] : [String(r.ok), String(r.late), reportPctText_(r.rate)]);
    });
    secs.push({ heading: g.dept_code + ' · ' + biText_(g.name_vi, g.name_zh) + ' — ' + lab_('rpt.items_n', { N: g.rows.length }), table: rptTable_(head, types, rows, tones) });
  });
  var nc = d.not_counted || {};
  var notes = [lab_('rpt.legend.records', { G: d.grace })];
  if (nc.NOT_ISSUED || nc.NA || nc.FROM_APP || nc.NO_START) {
    notes.push(lab_('rpt.note.not_counted', { A: nc.NOT_ISSUED || 0, B: nc.NA || 0, C: nc.FROM_APP || 0, D: nc.NO_START || 0 }));
  }
  return { sections: secs, notes: notes };
}

function layoutCoverage_(snap) {
  var d = snap.data;
  var secs = [];
  var stTone = { MISSING: 'red', NONE: 'amber', NOT_ISSUED: 'navy', OK: 'green' };
  d.stds.forEach(function (s) {
    var iso = s.std === 'ISO9001';
    var head = [labNl_('rpt.col.group'), labNl_(iso ? 'rpt.col.clause' : 'rpt.col.topic'), labNl_('rpt.col.content')]
      .concat(iso ? [labNl_('rpt.col.mandatory')] : [])
      .concat([labNl_('rpt.col.items'), labNl_('rpt.col.issued'), labNl_('rpt.col.app'), labNl_('rpt.col.status')])
      .concat(d.codes ? [labNl_('rpt.col.codes')] : []);
    var types = ['text', 'code', 'text'].concat(iso ? ['mid'] : []).concat(['num', 'num', 'num', 'text']).concat(d.codes ? ['text'] : []);
    var last = null, tones = [];
    var rows = s.rows.map(function (r) {
      var g = biNl_(r.group_vi, r.group_zh);
      var gShow = g !== last ? g : '';
      last = g;
      var t = ['muted', '', ''].concat(iso ? [r.mandatory ? 'red' : ''] : []).concat(['', r.issued ? 'green' : '', '', stTone[r.state]]).concat(d.codes ? [''] : []);
      tones.push(t);
      return [gShow, r.key, biNl_(r.name_vi, r.name_zh)].concat(iso ? [r.mandatory ? lab_('cov.yes') : '–'] : [])
        .concat([String(r.n), String(r.issued), String(r.app), labNl_('cov.st.' + r.state)])
        .concat(d.codes ? [(r.codes || []).map(function (c) { return c.code + ' ' + STATUS_SYMBOL_[c.status]; }).join(', ')] : []);
    });
    secs.push({ heading: lab_(iso ? 'rpt.sec.iso' : 'rpt.sec.brc', { N: s.rows.length }), table: rptTable_(head, types, rows, tones), note: lab_(iso ? 'cov.how_iso' : 'cov.how_brc') });
  });
  return { sections: secs, notes: [lab_('rpt.note.scope_items', { N: d.items })] };
}

function layoutVersions_(snap) {
  var d = snap.data, it = d.item;
  var kv = [
    [lab_('rpt.col.code'), it.code],
    [lab_('rpt.col.name'), biText_(it.name_vi, it.name_zh)],
    [lab_('rpt.col.dept'), it.dept_code + ' · ' + biText_(it.dept_vi, it.dept_zh)],
    [lab_('rpt.col.kind'), lab_('kind.' + it.kind) + ' · ' + lab_('level_doc.' + it.level)],
    [lab_('rpt.col.status'), STATUS_SYMBOL_[it.status] + ' ' + lab_('status.' + it.status)]
  ];
  if (it.status === 'ISSUED') {
    kv.push([lab_('rpt.t.current_rev'), String(it.current_rev || '01')]);
    kv.push([lab_('rpt.col.issued_at'), dmy_(it.issued_at)]);
    if (it.review_due) kv.push([lab_('rpt.col.review_due'), dmy_(it.review_due)]);
  }
  if (it.reviewed_at) kv.push([lab_('rpt.kv.reviewed'), dmy_(it.reviewed_at) + (it.reviewed_by ? ' · ' + it.reviewed_by : '')]);
  if (it.na_reason) kv.push([lab_('rpt.kv.na_reason'), it.na_reason]);
  if (it.iso9001) kv.push([lab_('rpt.kv.iso9001'), it.iso9001]);
  if (it.brc_topics) kv.push([lab_('rpt.kv.brc'), it.brc_topics]);
  if (it.flow) kv.push([lab_('rpt.kv.flow'), it.flow]);
  if (it.keep) kv.push([lab_('rpt.kv.keep'), it.keep]);
  if (it.owner) kv.push([lab_('rpt.kv.owner'), it.owner]);
  var head = [labNl_('rpt.col.rev'), labNl_('rpt.col.vtype'), labNl_('rpt.col.status'), labNl_('rpt.col.summary'), labNl_('rpt.col.author'),
    labNl_('rpt.col.submitted'), labNl_('rpt.col.approved'), labNl_('rpt.col.issued_by'), labNl_('rpt.col.effective'), labNl_('rpt.col.superseded')];
  var types = ['mid', 'text', 'text', 'text', 'text', 'date', 'text', 'text', 'date', 'date'];
  var vTone = { DRAFT: 'muted', IN_REVIEW: 'amber', APPROVED: 'navy', ISSUED: 'green', SUPERSEDED: 'muted' };
  var rows = [], tones = [];
  if (d.imported) {
    rows.push([d.imported.rev, labNl_('rpt.note.imported'), labNl_('vstate.ISSUED'), d.imported.file_missing ? lab_('rpt.note.file_missing') : '', '', '', '', dmy_(d.imported.issued_at), dmy_(d.imported.issued_at), '']);
    tones.push(['', '', 'green', d.imported.file_missing ? 'red' : '', '', '', '', '', '', '']);
  }
  d.rows.forEach(function (r) {
    rows.push([r.rev, labNl_('vtype.' + r.vtype), labNl_('vstate.' + r.state), biNl_(r.summary_vi, r.summary_zh), r.author, dmy_(r.submitted_at),
      biNl_(r.approved_by, dmy_(r.approved_at)), biNl_(r.issued_by, dmy_(r.issued_at)), dmy_(r.effective_date), dmy_(r.superseded_at)]);
    tones.push(['', '', vTone[r.state] || '', '', '', '', '', '', '', '']);
  });
  return { sections: [{ heading: lab_('rpt.sec.item'), kv: kv }, { heading: lab_('rpt.sec.history'), table: rptTable_(head, types, rows, tones) }], notes: [] };
}

var DIST_TONE_ = { ACTIVE: 'green', DUE: 'red', RECALLED: 'muted' };

function layoutDist_(snap) {
  var d = snap.data;
  var head = [labNl_('rpt.col.code'), labNl_('rpt.col.name'), labNl_('rpt.col.rev'), labNl_('rpt.col.holder'), labNl_('rpt.col.copies'), labNl_('rpt.col.dist_date'),
    labNl_('rpt.col.dist_by'), labNl_('rpt.col.status'), labNl_('rpt.col.recalled'), labNl_('rpt.col.note')];
  var types = ['code', 'text', 'mid', 'text', 'num', 'date', 'text', 'text', 'text', 'text'];
  var secs = [];
  d.depts.forEach(function (g) {
    var tones = [];
    var copies = 0;
    var rows = g.rows.map(function (r) {
      copies += r.state === 'RECALLED' ? 0 : r.copies;
      var stTxt = labNl_('dist.state.' + r.state);
      if (r.state === 'DUE') stTxt += '\n' + lab_('rpt.dist_due_rev', { N: r.cur_rev }) + (r.overdue ? ' !' : '');
      tones.push(['', '', '', '', '', '', '', r.state === 'DUE' ? (r.overdue ? 'red' : 'amber') : DIST_TONE_[r.state], '', '']);
      return [r.code, biNl_(r.name_vi, r.name_zh), r.rev, r.holder, String(r.copies), dmy_(r.dist_date), r.dist_by, stTxt,
        r.recalled_date ? biNl_(dmy_(r.recalled_date), r.recalled_by) : '', r.note];
    });
    secs.push({ heading: g.dept_code + ' · ' + biText_(g.name_vi, g.name_zh) + ' — ' + lab_('rpt.dist_rows_n', { N: g.rows.length, C: copies }), table: rptTable_(head, types, rows, tones) });
  });
  if (!secs.length) secs.push({ table: rptTable_(head, types, [], null) });
  return { sections: secs, notes: [lab_('rpt.note.dist', { N: d.recall_days })] };
}

/** Kết quả thực hiện của một phiếu (một dòng chữ) */
function reqDoneText_(r) {
  if (r.state === 'DONE') return [dmy_(r.done_at), r.done_by, r.done_note].filter(function (x) { return x; }).join(' · ');
  if (r.state === 'CANCELLED') return lab_('dr.state.CANCELLED') + (r.cancel_reason ? ': ' + r.cancel_reason : '');
  if (r.state === 'APPROVED' && r.version_rev) return lab_('rpt.req_drafting', { N: r.version_rev });
  return '';
}

var REQ_TONE_ = { SUBMITTED: 'amber', APPROVED: 'navy', REJECTED: 'red', DONE: 'green', CANCELLED: 'muted' };

function layoutDocreq_(snap) {
  var d = snap.data;
  if (d.one) {
    var r = d.one;
    var kv = [
      [lab_('rpt.kv.req_no'), r.code],
      [lab_('rpt.kv.req_date'), dmy_(r.submitted_at)],
      [lab_('rpt.kv.req_type'), lab_('dr.type.' + r.req_type)],
      [lab_('rpt.col.dept'), r.dept_code],
      [lab_(r.req_type === 'NEW' ? 'rpt.kv.req_new_doc' : 'rpt.kv.req_doc'), [r.item_code, biText_(r.item_name_vi, r.item_name_zh)].filter(function (x) { return x; }).join(' · ')],
      [lab_('rpt.kv.req_level'), lab_('level_doc.' + r.level)]
    ];
    if (r.cur_rev && r.req_type !== 'NEW') kv.push([lab_('rpt.t.current_rev'), r.cur_rev]);
    if (r.new_kind) kv.push([lab_('rpt.col.kind'), lab_('kind.' + r.new_kind)]);
    kv.push([lab_('rpt.kv.req_reason'), biNl_(r.reason_vi, r.reason_zh)]);
    if (r.content_vi || r.content_zh) kv.push([lab_('rpt.kv.req_content'), biNl_(r.content_vi, r.content_zh)]);
    if (r.want_date) kv.push([lab_('rpt.kv.req_want'), dmy_(r.want_date)]);
    kv.push([lab_('rpt.kv.requester'), r.requester + (r.entered_by ? ' (' + lab_('rpt.kv.entered_by', { U: r.entered_by }) + ')' : '')]);
    var res = [[lab_('rpt.col.status'), lab_('dr.state.' + r.state)]];
    if (r.decided_at) res.push([lab_(r.state === 'REJECTED' ? 'rpt.kv.rejected' : 'rpt.kv.decided'), [r.decided_by, dmy_(r.decided_at)].join(' · ') + (r.decide_note ? '\n' + r.decide_note : '')]);
    if (r.version_rev) res.push([lab_('rpt.kv.req_version'), lab_('rpt.rev_n', { N: r.version_rev }) + ' · ' + lab_('vstate.' + r.version_state)]);
    var dt = reqDoneText_(r);
    if (dt && r.state !== 'APPROVED') res.push([lab_(r.state === 'DONE' ? 'rpt.kv.req_done' : 'rpt.kv.req_note'), dt]);
    return {
      sections: [{ heading: lab_('rpt.sec.req'), kv: kv }, { heading: lab_('rpt.sec.req_result'), kv: res }], notes: [],
      sign: { prepared: lab_('rpt.sign.requester'), approved: lab_('rpt.sign.decider'), prepared_name: r.requester, approved_name: r.decided_by }
    };
  }
  var head = [labNl_('rpt.col.req_no'), labNl_('rpt.col.req_date'), labNl_('rpt.col.req_type'), labNl_('rpt.col.doc'), labNl_('rpt.col.req_reason'),
    labNl_('rpt.col.requester'), labNl_('rpt.col.decided'), labNl_('rpt.col.status'), labNl_('rpt.col.req_done')];
  var types = ['code', 'date', 'text', 'text', 'text', 'text', 'text', 'text', 'text'];
  var secs = [];
  d.depts.forEach(function (g) {
    var tones = [];
    var rows = g.rows.map(function (r) {
      tones.push(['', '', '', '', '', '', '', REQ_TONE_[r.state] || '', '']);
      return [r.code, dmy_(r.submitted_at), labNl_('dr.type.' + r.req_type), [r.item_code, r.item_name_vi || r.item_name_zh].filter(function (x) { return x; }).join('\n'),
        biNl_(r.reason_vi, r.reason_zh), r.requester, r.decided_at ? biNl_(r.decided_by, dmy_(r.decided_at)) : '', labNl_('dr.state.' + r.state), reqDoneText_(r)];
    });
    secs.push({ heading: g.dept_code + ' · ' + biText_(g.name_vi, g.name_zh) + ' — ' + lab_('rpt.req_n', { N: g.rows.length }), table: rptTable_(head, types, rows, tones) });
  });
  if (!secs.length) secs.push({ table: rptTable_(head, types, [], null) });
  return { sections: secs, notes: [] };
}

/**
 * Bố cục chung của một bản chụp: {title_vi, title_zh, meta_left, meta_right, tiles: [{label, value, tone}], sections: [{heading?, note?,
 * kv?: [[nhãn, giá trị]], table?: {head, types, rows, tones}}], notes: [chữ], sign: {prepared, approved, hint, prepared_name, approved_name,
 * middle?, middle_name? (ô ký giữa — SCAR 3b)}, footer}.
 */
function reportLayout_(snap) {
  var body = snap.kind === 'CATALOG' ? layoutCatalog_(snap) : snap.kind === 'RECORDS' ? layoutRecords_(snap)
    : snap.kind === 'COVERAGE' ? layoutCoverage_(snap) : snap.kind === 'DIST' ? layoutDist_(snap)
    : snap.kind === 'DOCREQ' ? layoutDocreq_(snap) : snap.kind === 'CAPA' ? layoutCapa_(snap) : layoutVersions_(snap);
  var sg = body.sign || {};
  var gen = String(snap.generated_at || '');
  return {
    title_vi: snap.title_vi, title_zh: snap.title_zh, code: snap.code || '',
    meta_left: reportMetaLeft_(snap), meta_right: reportMetaRight_(snap),
    tiles: (snap.tiles || []).map(function (t) { return { label: lab_(t.k), value: t.v, tone: t.tone || '' }; }),
    sections: body.sections, notes: body.notes, none: lab_('rpt.none'),
    sign: { prepared: sg.prepared || lab_('rpt.prepared_by'), approved: sg.approved || lab_('rpt.approved_by'), hint: lab_('rpt.sign_hint'),
      prepared_name: sg.prepared ? sg.prepared_name || '' : snap.generated_by_name || '', approved_name: sg.approved_name || '',
      middle: sg.middle || '', middle_name: sg.middle ? sg.middle_name || '' : '' },
    footer: 'ISO · 体系管理 · ' + (snap.form_code ? snap.form_code + ' · ' : '') + snap.title_vi + (snap.code ? ' · ' + snap.code : '') + ' · ' +
      lab_('rpt.generated_at') + ' ' + dmy_(gen) + ' ' + gen.slice(11, 16)
  };
}

/* ---------------- Khung PDF (bộ dựng của Checksheet / M&E d4.11) ---------------- */

/** Chữ của cả phần tử: cỡ, màu, đậm, nghiêng (editAsText dùng được cho đoạn, ô, hàng, bảng) */
function pdfText_(el, size, color, bold, italic) {
  var t = el.editAsText();
  if (size) t.setFontSize(size);
  if (color) t.setForegroundColor(color);
  if (bold !== undefined && bold !== null) t.setBold(!!bold);
  if (italic !== undefined && italic !== null) t.setItalic(!!italic);
  return el;
}

function pdfPara_(p, o) {
  if (o.align) p.setAlignment(DocumentApp.HorizontalAlignment[o.align]);
  p.setSpacingBefore(o.before || 0);
  p.setSpacingAfter(o.after || 0);
  if (o.line) p.setLineSpacing(o.line);
  if (o.text !== undefined) pdfText_(p, o.size, o.color, o.bold, o.italic);
  return p;
}

/**
 * Tạo tài liệu tạm: khổ A4 (ngang khi `wide`), lề, đầu trang có logo (nếu có), chân trang một dòng.
 * Trả {doc, body, width (pt dùng được), t0, logo}.
 */
function pdfStart_(opts) {
  var doc = DocumentApp.create(NAME_PREFIX + 'TMP_' + uuid_());
  var body = doc.getBody();
  var pageW = opts.wide ? 842 : 595, pageH = opts.wide ? 595 : 842;
  body.setPageWidth(pageW);
  body.setPageHeight(pageH);
  var logo = opts.logo === undefined ? reportLogoBlob_() : opts.logo;
  body.setMarginLeft(PDF_MARGIN_).setMarginRight(PDF_MARGIN_).setMarginBottom(44).setMarginTop(logo ? 84 : 40);
  if (logo) {
    try {
      var hs = doc.addHeader();
      var hp = hs.getParagraphs()[0] || hs.appendParagraph('');
      pdfPara_(hp, { align: 'LEFT' });
      var img = hp.appendInlineImage(logo);
      var w0 = img.getWidth(), h0 = img.getHeight();
      var h = PDF_LOGO_PX_H_, w = w0 && h0 ? Math.round(h * w0 / h0) : h;
      if (w > 220) { w = 220; h = w0 && h0 ? Math.max(1, Math.round(w * h0 / w0)) : h; }
      img.setWidth(w).setHeight(h);
    } catch (e) { logo = null; body.setMarginTop(40); }
  }
  if (opts.footer) {
    var fs = doc.addFooter();
    var fp = fs.getParagraphs()[0] || fs.appendParagraph('');
    fp.setText(opts.footer);
    pdfPara_(fp, { align: 'CENTER', text: true, size: 7, color: PDF_C_.muted });
  }
  return { doc: doc, body: body, width: pageW - 2 * PDF_MARGIN_, t0: Date.now(), logo: !!logo };
}

/** Lưu, đổi sang PDF, bỏ tệp tạm vào thùng rác */
function pdfFinish_(pd) {
  var id = pd.doc.getId();
  try {
    pd.doc.saveAndClose();
    return DriveApp.getFileById(id).getAs('application/pdf').getBytes();
  } finally {
    try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* bỏ qua */ }
  }
}

function pdfTimeLeft_(pd) { return Date.now() - pd.t0 < PDF_STYLE_BUDGET_MS_; }

/** Khối tiêu đề: dòng Việt to, dòng Trung dưới, căn giữa (dùng đoạn trống đầu thân tài liệu) */
function pdfTitle_(pd, vi, zh) {
  var p0 = pd.body.getParagraphs()[0];
  p0.setText(vi || zh || '');
  pdfPara_(p0, { align: 'CENTER', after: zh && vi ? 2 : 10, text: true, size: 16, color: PDF_C_.navy, bold: true });
  if (zh && vi) pdfPara_(pd.body.appendParagraph(zh), { align: 'CENTER', after: 10, text: true, size: 12, color: PDF_C_.navy, bold: true });
}

function pdfHeading_(pd, text, before) {
  return pdfPara_(pd.body.appendParagraph(text), { before: before === undefined ? 12 : before, after: 4, text: true, size: 10, color: PDF_C_.navy, bold: true });
}

function pdfNote_(pd, text) {
  return pdfPara_(pd.body.appendParagraph(text), { before: 3, text: true, size: 7, color: PDF_C_.muted, italic: true });
}

/** Bảng không viền */
function pdfPlain_(t) {
  t.setBorderWidth(0);
  return t;
}

function pdfCellPad_(c, v, h) {
  c.setPaddingTop(v).setPaddingBottom(v).setPaddingLeft(h).setPaddingRight(h);
  return c;
}

/** Căn mọi đoạn trong ô */
function pdfCellAlign_(c, align) {
  var A = DocumentApp.HorizontalAlignment[align];
  for (var i = 0; i < c.getNumChildren(); i++) {
    var ch = c.getChild(i);
    if (ch.getType() === DocumentApp.ElementType.PARAGRAPH) ch.asParagraph().setAlignment(A);
  }
}

/** Thông tin hai cột: trái (bộ lọc), phải (số báo cáo, ngày lập, người lập — căn phải). lines = [[nhãn, giá trị]] */
function pdfMeta_(pd, left, right) {
  var fmt = function (l) { return l[1] ? l[0] + ': ' + l[1] : l[0]; };
  var t = pdfPlain_(pd.body.appendTable([[left.map(fmt).join('\n'), right.map(fmt).join('\n')]]));
  t.setColumnWidth(0, Math.round(pd.width * 0.56)).setColumnWidth(1, pd.width - Math.round(pd.width * 0.56));
  pdfText_(t, 9, PDF_C_.ink);
  var r = t.getRow(0);
  pdfCellPad_(r.getCell(0), 2, 0);
  pdfCellPad_(r.getCell(1), 2, 0);
  pdfCellAlign_(r.getCell(1), 'RIGHT');
  return t;
}

/** Ô số tóm tắt: 4 ô một hàng; mỗi ô nhãn nhỏ xám + số đậm (màu theo tone). items = [{label, value, tone}] */
function pdfTiles_(pd, items) {
  if (!items.length) return null;
  var per = 4;
  var rows = [];
  for (var i = 0; i < items.length; i += per) {
    var row = [];
    for (var j = 0; j < per; j++) row.push('');
    rows.push(row);
  }
  var t = pd.body.appendTable(rows);
  t.setBorderWidth(3).setBorderColor(PDF_C_.white);
  var w = Math.floor(pd.width / per);
  for (var k = 0; k < per; k++) t.setColumnWidth(k, w);
  items.forEach(function (it, n) {
    var c = t.getCell(Math.floor(n / per), n % per);
    c.setBackgroundColor(PDF_C_.tile);
    pdfCellPad_(c, 5, 7);
    var p0 = c.getChild(0).asParagraph();
    p0.setText(it.label);
    pdfText_(p0, 8, PDF_C_.muted, false);
    var v = String(it.value);
    pdfPara_(c.appendParagraph(v), { before: 2, text: true, size: v.length > 18 ? 10 : 13, color: PDF_TONE_[it.tone] || PDF_C_.navy, bold: true });
  });
  return t;
}

/**
 * Độ rộng cột (pt) theo nội dung: ước lượng số ký tự (dòng dài nhất trong ô, lấy mức 90 % các dòng để một ô quá dài không chiếm hết),
 * cột số/ngày hẹp, cột chữ có trần; thiếu chỗ thì co theo tỷ lệ nhưng không nhỏ hơn 22 pt; thừa chỗ thì giãn cho kín khổ.
 */
function pdfColWidths_(head, rows, types, avail, fixed0) {
  var n = head.length;
  var longest = function (s) { return String(s || '').split('\n').reduce(function (m, x) { return Math.max(m, x.length); }, 0); };
  var ideal = [];
  for (var c = 0; c < n; c++) {
    if (fixed0 && c === 0) { ideal.push(fixed0); continue; }
    var lens = rows.map(function (r) { return longest(r[c]); }).sort(function (a, b) { return a - b; });
    var p90 = lens.length ? lens[Math.min(lens.length - 1, Math.floor(lens.length * 0.9))] : 0;
    var hl = longest(head[c]);
    var ty = types[c] || 'text';
    var cap = ty === 'num' || ty === 'date' || ty === 'mid' ? 12 : (ty === 'code' ? 16 : 44);
    var chars = Math.min(cap, Math.max(p90, Math.min(hl, cap), ty === 'num' || ty === 'mid' ? 3 : (ty === 'code' ? 7 : 6)));
    ideal.push(chars * 5 + 10); // ~5 pt mỗi ký tự ở cỡ 7–8, đệm ô
  }
  var free = avail - (fixed0 || 0);
  var flex = ideal.slice(fixed0 ? 1 : 0);
  var sum = flex.reduce(function (a, b) { return a + b; }, 0);
  var out = flex.map(function (w) { return w * free / sum; });
  if (sum > free) {
    for (var k = 0; k < 4; k++) {
      var under = 0, rest = 0;
      out.forEach(function (w) { if (w < 22) under += 22 - w; else rest += w; });
      if (!under || !(rest > 0)) break;
      out = out.map(function (w) { return w < 22 ? 22 : w - under * w / rest; });
    }
  }
  out = out.map(function (w) { return Math.max(1, Math.floor(w)); });
  return fixed0 ? [fixed0].concat(out) : out;
}

/**
 * Bảng dữ liệu: tiêu đề nền xám nhạt chữ đậm, viền mảnh, cột # (khi `numbered`), số căn phải, ngày/ô giữa căn giữa, hàng xen kẽ
 * (≤ 300 dòng), màu chữ từng ô theo tones (đậm khi có màu, trừ "muted"). total: hàng cuối là hàng tổng (đậm, nền xám).
 */
function pdfTable_(pd, tb, opts) {
  opts = opts || {};
  var numbered = !!opts.numbered;
  var h = numbered ? ['#'].concat(tb.head) : tb.head.slice();
  var ty = numbered ? ['num'].concat(tb.types) : tb.types.slice();
  var data = tb.rows.map(function (r, i) { return numbered ? [String(opts.total && i === tb.rows.length - 1 ? '' : i + 1)].concat(r) : r.slice(); });
  data = data.map(function (r) { return r.map(function (x) { return x === null || x === undefined ? '' : String(x); }); });
  if (!data.length) data = [h.map(function (x, i) { return i === (numbered ? 1 : 0) ? lab_('rpt.none') : ''; })];
  var t = pd.body.appendTable([h].concat(data));
  t.setBorderWidth(1).setBorderColor(PDF_C_.line);
  var widths = pdfColWidths_(h, data, ty, pd.width, numbered ? 22 : 0);
  widths.forEach(function (w, i) { t.setColumnWidth(i, w); });
  var fs = opts.fontSize || (h.length > 10 ? 7 : 8);
  pdfText_(t, fs, PDF_C_.ink);
  var hr = t.getRow(0);
  pdfText_(hr, fs, PDF_C_.navy, true);
  for (var c = 0; c < h.length; c++) {
    var hc = hr.getCell(c);
    hc.setBackgroundColor(PDF_C_.head);
    hc.setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER);
    if (ty[c] === 'num') pdfCellAlign_(hc, 'RIGHT');
    else if (ty[c] === 'date' || ty[c] === 'mid') pdfCellAlign_(hc, 'CENTER');
  }
  if (!tb.rows.length) { pdfText_(t.getRow(1), fs, PDF_C_.muted, false, true); return t; }
  var zebra = data.length <= 300;
  var alignCols = [];
  ty.forEach(function (x, i) { if (x === 'num') alignCols.push([i, 'RIGHT']); else if (x === 'date' || x === 'mid') alignCols.push([i, 'CENTER']); });
  for (var r = 1; r <= data.length; r++) {
    if (!pdfTimeLeft_(pd)) break;
    var row = t.getRow(r);
    var isTotal = opts.total && r === data.length;
    if (numbered) pdfText_(row.getCell(0), fs, PDF_C_.muted);
    if (isTotal) { for (var z0 = 0; z0 < h.length; z0++) row.getCell(z0).setBackgroundColor(PDF_C_.head); pdfText_(row, fs, PDF_C_.navy, true); }
    else if (zebra && r % 2 === 0) for (var z = 0; z < h.length; z++) row.getCell(z).setBackgroundColor(PDF_C_.zebra);
    for (var a = 0; a < alignCols.length; a++) {
      var cell = row.getCell(alignCols[a][0]);
      for (var q = 0; q < cell.getNumChildren(); q++) cell.getChild(q).asParagraph().setAlignment(DocumentApp.HorizontalAlignment[alignCols[a][1]]);
    }
    var tr = tb.tones && tb.tones[r - 1];
    if (tr) {
      for (var cc = 0; cc < tr.length; cc++) {
        var col = PDF_TONE_[tr[cc]];
        if (col && data[r - 1][cc + (numbered ? 1 : 0)]) pdfText_(row.getCell(cc + (numbered ? 1 : 0)), fs, col, tr[cc] !== 'muted');
      }
    }
  }
  return t;
}

/** Bảng nhãn – giá trị: cột nhãn nền nhạt */
function pdfKv_(pd, kv) {
  var data = kv.length ? kv : [[lab_('rpt.none'), '']];
  var t = pd.body.appendTable(data.map(function (r) { return [String(r[0]), String(r[1] === null || r[1] === undefined ? '' : r[1])]; }));
  t.setBorderWidth(1).setBorderColor(PDF_C_.line);
  var wl = Math.round(pd.width * 0.28);
  t.setColumnWidth(0, wl).setColumnWidth(1, pd.width - wl);
  pdfText_(t, 9, PDF_C_.ink);
  for (var i = 0; i < data.length; i++) {
    var c = t.getRow(i).getCell(0);
    c.setBackgroundColor(PDF_C_.tile);
    pdfText_(c, 8, PDF_C_.muted, true);
  }
  return t;
}

/** Khối ký: Người lập (tên người lập báo cáo) · Người duyệt; dòng hướng dẫn ký, khoảng trống để ký */
function pdfSign_(pd, sign) {
  pdfPara_(pd.body.appendParagraph(''), { before: 14 });
  // Hai ô ký (Người lập · Người duyệt) hoặc ba ô khi có ô giữa (SCAR: đại diện nhà cung cấp, 3b)
  var cols = sign.middle ? [[sign.prepared, sign.prepared_name], [sign.middle, sign.middle_name], [sign.approved, sign.approved_name]]
    : [[sign.prepared, sign.prepared_name], [sign.approved, sign.approved_name]];
  var n = cols.length;
  var t = pdfPlain_(pd.body.appendTable([
    cols.map(function (c) { return c[0]; }),
    cols.map(function () { return sign.hint; }),
    cols.map(function () { return '\n\n\n'; }),
    cols.map(function (c) { return c[1] || ''; })
  ]));
  var w = Math.floor(pd.width / n);
  for (var k = 0; k < n; k++) t.setColumnWidth(k, k === n - 1 ? pd.width - w * (n - 1) : w);
  pdfText_(t, 9, PDF_C_.ink);
  pdfText_(t.getRow(0), 9, PDF_C_.navy, true);
  pdfText_(t.getRow(1), 7, PDF_C_.muted, false, true);
  pdfText_(t.getRow(3), 9, PDF_C_.ink, true);
  for (var r = 0; r < 4; r++) for (var c = 0; c < n; c++) { pdfCellPad_(t.getRow(r).getCell(c), 1, 4); pdfCellAlign_(t.getRow(r).getCell(c), 'CENTER'); }
  return t;
}

/* ---------------- PDF của một báo cáo ---------------- */

/** Dựng PDF (byte) từ bản chụp đã lưu: A4 ngang, logo công ty, tiêu đề, thông tin, ô số, các phần, chú thích, khối ký */
function reportPdfBuild_(snap) {
  var lay = reportLayout_(snap);
  var pd = pdfStart_({ wide: true, footer: lay.footer });
  pdfTitle_(pd, String(lay.title_vi || '').toUpperCase(), lay.title_zh);
  pdfMeta_(pd, lay.meta_left, lay.meta_right);
  pdfTiles_(pd, lay.tiles);
  lay.sections.forEach(function (s) {
    if (s.heading) pdfHeading_(pd, s.heading);
    if (s.kv) pdfKv_(pd, s.kv);
    if (s.table) pdfTable_(pd, s.table, { numbered: true, total: !!s.total_row });
    if (s.note) pdfNote_(pd, s.note);
  });
  lay.notes.forEach(function (n) { pdfNote_(pd, n); });
  pdfSign_(pd, lay.sign);
  return pdfFinish_(pd);
}

// ===== 29_docreq.js =====
/* 29_docreq: Phiếu đề nghị ban hành / sửa đổi / hủy tài liệu (Đợt 2, phiên 2d — thay BM-ISO-02-02, BM-CĐ-01-08), mã DN-yymm-001.
 * Loại: NEW ban hành tài liệu mới · REVISE sửa đổi tài liệu đang có · CANCEL hủy (ngừng dùng, ✕).
 * Luồng: người đề nghị (cấp 2+, Thư ký ISO nhập thay được — ghi tên người đề nghị) gửi phiếu → Chờ xem xét (SUBMITTED) →
 * người có quyền duyệt tài liệu đó (trưởng bộ phận với tài liệu cấp bộ phận, cấp 4 với cấp công ty; người đề nghị không tự duyệt, cấp 4
 * được khi admin_self_approval) Chấp thuận (APPROVED) hoặc Không chấp thuận (REJECTED, kèm lý do), hỏi PIN →
 * Thư ký ISO / người soạn thực hiện: REVISE / NEW soạn phiên bản theo phiếu (version.save request_id; NEW trước đó thêm tài liệu vào danh mục
 * bằng item.edit request_id) → ban hành phiên bản đó thì phiếu tự thành Đã thực hiện (DONE); CANCEL: Thư ký đặt Không áp dụng
 * (item.setNa request_id) → DONE. Việc làm ngoài app: Thư ký bấm "Đã thực hiện" kèm ghi chú (docreq.done, PIN).
 * Rút lại phiếu: người đề nghị khi còn chờ xem xét; Thư ký ISO khi chờ xem xét hoặc đã chấp thuận (CANCELLED).
 * Ai cũng đề nghị sửa / hủy được tài liệu mình xem được (đề nghị là ý kiến, người duyệt là chủ tài liệu); đề nghị tài liệu mới: trong
 * bộ phận mình. Xem phiếu: cấp 2+ / Thư ký ISO — phiếu của mình, phiếu của bộ phận mình (Thư ký ISO, cấp 4: tất cả). */

/* ---------------- Quyền ---------------- */

/** Cấp duyệt của phiếu: theo tài liệu (REVISE, CANCEL); tài liệu mới theo mã đề xuất / loại / bộ phận */
function docreqLevel_(type, it, newCode, newKind, dept) {
  if (it) return it.level === 'COMPANY' ? 'COMPANY' : 'DEPT';
  if (newCode) return levelFor_(newCode, newKind || kindFromCode_(newCode));
  if (newKind === 'MANUAL' || newKind === 'POLICY' || dept === 'ISO' || dept === 'BRC') return 'COMPANY';
  return 'DEPT';
}

/** Người dùng thấy phiếu: cấp 2+ / Thư ký ISO; phiếu của mình, của bộ phận mình (mọi bộ phận khi không giới hạn) */
function docreqVisible_(u, r) {
  if (!r || (!isSecretary_(u) && Number(u.role_level) < 2) || !inScopeDept_(r.dept_code)) return false;
  return r.submitted_by === u.user_id || seesAllDepts_(u) || userDepts_(u).indexOf(r.dept_code) >= 0;
}

/** Xem xét (chấp thuận / không chấp thuận): như duyệt phiên bản (canApprove_ ở 16_versions.js), người đề nghị không tự xem xét */
function canDecideReq_(u, r) {
  var lvl = Number(u.role_level);
  if (lvl >= 4) return r.submitted_by !== u.user_id || !!setting_('admin_self_approval');
  if (r.submitted_by === u.user_id || r.level === 'COMPANY') return false;
  return lvl === 3 && deptWritable_(u, r.dept_code);
}

/** Sửa phiếu đang chờ xem xét: người đề nghị, Thư ký ISO */
function canEditReq_(u, r) {
  return r.state === 'SUBMITTED' && (r.submitted_by === u.user_id || isSecretary_(u));
}

/** Rút lại: chờ xem xét — người đề nghị, Thư ký ISO; đã chấp thuận (chưa thực hiện) — Thư ký ISO */
function canCancelReq_(u, r) {
  if (r.state === 'APPROVED') return isSecretary_(u);
  return canEditReq_(u, r);
}

/* ---------------- Tiện ích ---------------- */

/** Dán Code.gs 2d mà chưa chạy migrateSchema: lần ghi đầu tiên tự thêm sheet DocRequests, Distributions, cột Versions.request_id */
function ensureDocControlSchema_() {
  if (sheetExists_('DocRequests') && sheetExists_('Distributions')) return;
  autoMigrate_();
  dbReset_();
  if (!sheetExists_('DocRequests') || !sheetExists_('Distributions')) throw apiError_('SYSTEM_NOT_READY');
}

function loadReq_(ctx, id) {
  ensureDocControlSchema_();
  if (!isUuidV4_(id)) throw validationError_([fieldError_('request_id', 'ID_INVALID')]);
  var r = findOne_('DocRequests', 'request_id', id);
  if (!r || r.archived_at) throw apiError_('NOT_FOUND');
  if (!docreqVisible_(ctx.user, r)) throw apiError_('FORBIDDEN');
  return r;
}

function lockedReq_(ctx, id, checkVersion) {
  var cur = findOne_('DocRequests', 'request_id', id);
  if (!cur) throw apiError_('NOT_FOUND');
  if (checkVersion) assertVersion_(ctx, cur, 'DOCREQ', 'DocRequests');
  var row = clone_(cur); delete row.__row;
  return row;
}

function docreqResult_(ctx, row, extra) {
  var out = { entity_type: 'DOCREQ', entity_id: row.request_id, record_version: row.record_version, record: projectRow_(ctx, row) };
  if (extra) Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
  return out;
}

/** Phiếu đã chấp thuận dùng cho việc thực hiện (phiên bản, thêm tài liệu, đặt ✕) — đọc dưới khóa ghi; sai thì VALIDATION_ERROR */
function docreqForAction_(id, types, itemId) {
  if (!isUuidV4_(id)) throw validationError_([fieldError_('request_id', 'ID_INVALID')]);
  if (!sheetExists_('DocRequests')) throw validationError_([fieldError_('request_id', 'NOT_FOUND')]);
  var r = findOne_('DocRequests', 'request_id', id);
  if (!r || r.archived_at) throw validationError_([fieldError_('request_id', 'NOT_FOUND')]);
  if (r.state !== 'APPROVED') throw validationError_([fieldError_('request_id', 'REQUEST_NOT_APPROVED')]);
  if (types.indexOf(r.req_type) < 0) throw validationError_([fieldError_('request_id', 'REQUEST_TYPE')]);
  if (itemId !== undefined && r.item_id !== itemId) throw validationError_([fieldError_('request_id', 'REQUEST_ITEM')]);
  var row = clone_(r); delete row.__row;
  return row;
}

/** Phiếu → Đã thực hiện (dưới khóa ghi, trong cùng thao tác ghi) */
function docreqMarkDone_(ctx, row, note, versionId) {
  row.state = 'DONE';
  row.done_at = isoVN_(now_());
  row.done_by = ctx.user.user_id;
  row.done_note = note || '';
  if (versionId) row.version_id = versionId;
  cUpdate_(ctx, row);
  return { sheet: 'DocRequests', mode: 'update', row: row };
}

/* ---------------- docreq.save ---------------- */

/**
 * docreq.save {request_id, req_type, item_id (REVISE, CANCEL), dept_code + new_code? + new_kind? + title_vi/zh (NEW),
 *  reason_vi/zh (bắt buộc một thứ tiếng), content_vi/zh, want_date, requester_name}
 * expected_version 0 = gửi phiếu mới (máy chủ cấp mã DN-yymm-001, trạng thái Chờ xem xét); khác 0 = sửa phiếu đang chờ xem xét.
 */
function docreqSave_(ctx) {
  ensureDocControlSchema_();
  var p = ctx.req.payload || {};
  var u = ctx.user;
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  var errs = [];
  if (!isUuidV4_(p.request_id)) errs.push(fieldError_('request_id', 'ID_INVALID'));
  var cur = isNew ? null : loadReq_(ctx, p.request_id);
  var type = cur ? cur.req_type : String(p.req_type || '');
  if (DOCREQ_TYPES_.indexOf(type) < 0) errs.push(fieldError_('req_type', 'INVALID_VALUE'));
  var want = p.want_date === undefined ? undefined : trimStr_(p.want_date);
  if (want && !isDateStr_(want)) errs.push(fieldError_('want_date', 'INVALID_DATE'));
  var reqName = p.requester_name === undefined ? undefined : trimStr_(p.requester_name);
  if (reqName && reqName.length > 120) errs.push(fieldError_('requester_name', 'TOO_LONG'));
  ['reason_vi', 'reason_zh', 'content_vi', 'content_zh', 'title_vi', 'title_zh'].forEach(function (k) {
    if (p[k] !== undefined && trimStr_(p[k]).length > (/^title/.test(k) ? 300 : 2000)) errs.push(fieldError_(k.replace(/_(vi|zh)$/, ''), 'TOO_LONG'));
  });
  var it = null, dept = cur ? cur.dept_code : '', newCode = cur ? cur.new_code : '', newKind = cur ? cur.new_kind : '';
  if (!errs.length && isNew && type !== 'NEW') {
    if (!isUuidV4_(p.item_id)) errs.push(fieldError_('item_id', 'ID_INVALID'));
    else {
      it = findOne_('Items', 'item_id', p.item_id);
      if (!it || it.archived_at) throw apiError_('NOT_FOUND');
      if (!itemVisible_(u, it)) throw apiError_('FORBIDDEN');
      if (type === 'CANCEL' && it.status === 'NA') errs.push(fieldError_('item_id', 'ITEM_NA'));
      if (type === 'REVISE' && it.status === 'NA') errs.push(fieldError_('item_id', 'ITEM_NA'));
      dept = it.dept_code;
    }
  }
  if (type === 'NEW' && (isNew || cur.state === 'SUBMITTED')) {
    if (p.dept_code !== undefined) dept = trimStr_(p.dept_code);
    if (!dept) errs.push(fieldError_('dept_code', 'REQUIRED'));
    else if (!findOne_('Depts', 'dept_code', dept)) errs.push(fieldError_('dept_code', 'DEPT_UNKNOWN'));
    else if (!inScopeDept_(dept)) errs.push(fieldError_('dept_code', 'APP_SCOPE'));
    if (p.new_code !== undefined) {
      newCode = trimStr_(p.new_code).toUpperCase().replace(/\s+/g, '');
      if (newCode && !ITEM_CODE_RE_.test(newCode)) errs.push(fieldError_('new_code', 'CODE_INVALID'));
      else if (newCode && findRowNums_('Items', 'code', newCode).length) errs.push(fieldError_('new_code', 'CODE_DUPLICATE'));
    }
    if (p.new_kind !== undefined) {
      newKind = trimStr_(p.new_kind);
      if (newKind && ITEM_KINDS_.indexOf(newKind) < 0) errs.push(fieldError_('new_kind', 'KIND_INVALID'));
    }
    requireOneLang_(errs, p, cur, 'title');
  }
  requireOneLang_(errs, p, cur, 'reason');
  if (type === 'REVISE') requireOneLang_(errs, p, cur, 'content');
  if (errs.length) throw validationError_(errs);
  if (isNew) {
    if (!isSecretary_(u) && Number(u.role_level) < 2) throw apiError_('FORBIDDEN');
    if (type === 'NEW' && !isSecretary_(u) && !deptWritable_(u, dept)) throw apiError_('FORBIDDEN');
  } else if (!canEditReq_(u, cur)) {
    if (cur.state !== 'SUBMITTED') throw stateInvalid_();
    throw apiError_('FORBIDDEN');
  }
  var fields = ['reason', 'content'].concat(type === 'NEW' ? ['title'] : []);
  var tr = applyTranslations_('DocRequests', fields, p, cur); // dịch ngoài khóa ghi
  return executeWrite_(ctx, {
    entity_type: 'DOCREQ', entity_id: p.request_id,
    build: function (st) {
      var row, su = {};
      if (isNew) {
        assertNewId_('DocRequests', 'request_id', p.request_id);
        if (it) {
          var it2 = findOne_('Items', 'item_id', it.item_id);
          if (!it2 || it2.status === 'NA') throw validationError_([fieldError_('item_id', 'ITEM_NA')]);
          it = it2;
        }
        row = cNew_(ctx, {
          request_id: p.request_id, code: allocCode_(st, su, 'DOC_REQUEST'), req_type: type, item_id: it ? it.item_id : '',
          dept_code: dept, level: docreqLevel_(type, it, newCode, newKind, dept), new_code: type === 'NEW' ? newCode : '',
          new_kind: type === 'NEW' ? newKind : '', title_vi: '', title_zh: '', reason_vi: '', reason_zh: '', content_vi: '', content_zh: '',
          want_date: want || '', requester_name: reqName || '', state: 'SUBMITTED', submitted_at: isoVN_(now_()), submitted_by: u.user_id,
          decided_at: '', decided_by: '', decide_note: '', version_id: '', item_linked_at: '', done_at: '', done_by: '', done_note: '',
          cancelled_at: '', cancelled_by: '', cancel_reason: ''
        });
      } else {
        row = lockedReq_(ctx, p.request_id, true);
        if (row.state !== 'SUBMITTED') throw stateInvalid_();
        cUpdate_(ctx, row);
        if (want !== undefined) row.want_date = want;
        if (reqName !== undefined) row.requester_name = reqName;
        if (type === 'NEW') {
          row.dept_code = dept; row.new_code = newCode; row.new_kind = newKind;
          row.level = docreqLevel_(type, null, newCode, newKind, dept);
        }
      }
      Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
      row.i18n_meta = tr.meta;
      return {
        writes: [{ sheet: 'DocRequests', mode: isNew ? 'insert' : 'update', row: row }], state: su,
        result: docreqResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'DOCREQ', entity_id: row.request_id, before_json: null,
          after_json: { code: row.code, req_type: row.req_type, item_id: row.item_id, dept_code: row.dept_code, created: isNew } }
      };
    }
  });
}

/* ---------------- Xem xét, rút lại, đã thực hiện ---------------- */

function precheckDocreqDecide_(ctx) {
  var r = loadReq_(ctx, (ctx.req.payload || {}).request_id);
  if (!canDecideReq_(ctx.user, r)) throw apiError_('FORBIDDEN');
  if (r.state !== 'SUBMITTED') throw stateInvalid_();
}

function precheckDocreqDone_(ctx) {
  var r = loadReq_(ctx, (ctx.req.payload || {}).request_id);
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  if (r.state !== 'APPROVED') throw stateInvalid_();
}

/** Khung chung: kiểm quyền + trạng thái (ngoài khóa), đọc lại dưới khóa, so expected_version, apply(row) đổi trạng thái */
function docreqTransition_(ctx, opts) {
  var p = ctx.req.payload || {};
  var r0 = loadReq_(ctx, p.request_id);
  if (!opts.allowed(ctx.user, r0)) throw apiError_('FORBIDDEN');
  if (opts.from.indexOf(r0.state) < 0) throw stateInvalid_();
  var text = opts.text ? reasonText_(p, opts.text.field, opts.text.required, 1000) : '';
  return executeWrite_(ctx, {
    entity_type: 'DOCREQ', entity_id: p.request_id,
    build: function () {
      var row = lockedReq_(ctx, p.request_id, true);
      if (opts.from.indexOf(row.state) < 0) throw stateInvalid_();
      var before = row.state;
      cUpdate_(ctx, row);
      opts.apply(row, text);
      return {
        writes: [{ sheet: 'DocRequests', mode: 'update', row: row }], result: docreqResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'DOCREQ', entity_id: row.request_id, before_json: { state: before }, after_json: { state: row.state, code: row.code }, reason: text }
      };
    }
  });
}

/** docreq.approve {request_id, note}: Chờ xem xét → Chấp thuận (PIN) */
function docreqApprove_(ctx) {
  return docreqTransition_(ctx, {
    allowed: canDecideReq_, from: ['SUBMITTED'], text: { field: 'note', required: false },
    apply: function (row, note) {
      row.state = 'APPROVED'; row.decided_at = isoVN_(now_()); row.decided_by = ctx.user.user_id; row.decide_note = note;
    }
  });
}

/** docreq.reject {request_id, reason}: Chờ xem xét → Không chấp thuận kèm lý do (PIN) */
function docreqReject_(ctx) {
  return docreqTransition_(ctx, {
    allowed: canDecideReq_, from: ['SUBMITTED'], text: { field: 'reason', required: true },
    apply: function (row, reason) {
      row.state = 'REJECTED'; row.decided_at = isoVN_(now_()); row.decided_by = ctx.user.user_id; row.decide_note = reason;
    }
  });
}

/** docreq.cancel {request_id, reason}: rút lại phiếu. Đang có phiên bản soạn theo phiếu thì hủy phiên bản đó trước. */
function docreqCancel_(ctx) {
  var r0 = loadReq_(ctx, (ctx.req.payload || {}).request_id);
  if (r0.version_id && sheetExists_('Versions')) {
    var v = findOne_('Versions', 'version_id', r0.version_id);
    if (v && VERSION_OPEN_[v.state]) throw validationError_([fieldError_('request_id', 'REQUEST_VERSION_OPEN')]);
  }
  return docreqTransition_(ctx, {
    allowed: canCancelReq_, from: ['SUBMITTED', 'APPROVED'], text: { field: 'reason', required: false },
    apply: function (row, reason) {
      row.state = 'CANCELLED'; row.cancelled_at = isoVN_(now_()); row.cancelled_by = ctx.user.user_id; row.cancel_reason = reason;
    }
  });
}

/** docreq.done {request_id, note}: Thư ký ISO đánh dấu đã thực hiện (việc làm ngoài app), ghi chú bắt buộc (PIN) */
function docreqDone_(ctx) {
  return docreqTransition_(ctx, {
    allowed: function (u) { return isSecretary_(u); }, from: ['APPROVED'], text: { field: 'note', required: true },
    apply: function (row, note) {
      row.state = 'DONE'; row.done_at = isoVN_(now_()); row.done_by = ctx.user.user_id; row.done_note = note;
    }
  });
}

/* ---------------- Nối với phiên bản, danh mục (gọi từ 11_catalog, 16_versions — dưới khóa ghi) ---------------- */

/** version.save tạo phiên bản REVISION theo phiếu: phiếu REVISE / NEW đã chấp thuận của đúng tài liệu → gắn version_id */
function docreqLinkVersion_(ctx, requestId, itemId, versionId) {
  var row = docreqForAction_(requestId, ['REVISE', 'NEW'], itemId);
  if (row.version_id && sheetExists_('Versions')) {
    var v = findOne_('Versions', 'version_id', row.version_id);
    if (v && VERSION_OPEN_[v.state] && v.version_id !== versionId) throw validationError_([fieldError_('request_id', 'REQUEST_VERSION_OPEN')]);
  }
  row.version_id = versionId;
  cUpdate_(ctx, row);
  return { sheet: 'DocRequests', mode: 'update', row: row };
}

/** Hủy phiên bản soạn theo phiếu: phiếu bỏ gắn để soạn lại (vẫn Đã chấp thuận) */
function docreqUnlinkVersion_(ctx, requestId, versionId) {
  if (!requestId || !sheetExists_('DocRequests')) return null;
  var r = findOne_('DocRequests', 'request_id', requestId);
  if (!r || r.version_id !== versionId || r.state !== 'APPROVED') return null;
  var row = clone_(r); delete row.__row;
  row.version_id = '';
  cUpdate_(ctx, row);
  return { sheet: 'DocRequests', mode: 'update', row: row };
}

/** Ban hành phiên bản soạn theo phiếu: phiếu → Đã thực hiện */
function docreqOnIssue_(ctx, requestId, version) {
  if (!requestId || !sheetExists_('DocRequests')) return null;
  var r = findOne_('DocRequests', 'request_id', requestId);
  if (!r || r.state !== 'APPROVED') return null;
  var row = clone_(r); delete row.__row;
  return docreqMarkDone_(ctx, row, lab_('dr.done_issue', { N: version.rev }), version.version_id);
}

/** Thêm tài liệu mới vào danh mục theo phiếu NEW đã chấp thuận (chưa gắn tài liệu) */
function docreqLinkItem_(ctx, requestId, itemId) {
  var row = docreqForAction_(requestId, ['NEW']);
  if (row.item_id) throw validationError_([fieldError_('request_id', 'REQUEST_ITEM')]);
  row.item_id = itemId;
  row.item_linked_at = isoVN_(now_());
  cUpdate_(ctx, row);
  return { sheet: 'DocRequests', mode: 'update', row: row };
}

/** Đặt Không áp dụng theo phiếu CANCEL đã chấp thuận của đúng tài liệu → Đã thực hiện */
function docreqOnNa_(ctx, requestId, itemId) {
  var row = docreqForAction_(requestId, ['CANCEL'], itemId);
  return docreqMarkDone_(ctx, row, lab_('dr.done_na'), '');
}

/* ---------------- Trạng thái hệ thống ---------------- */

/** Dòng healthCheck `doc_control`: [ok, giá trị, ghi chú] — phiếu chờ xem xét / đã chấp thuận chưa thực hiện, bản in cần thu hồi */
function docControlHealth_() {
  if (!sheetExists_('DocRequests') || !sheetExists_('Distributions')) return [false, 'Thiếu sheet DocRequests / Distributions', 'Chạy migrateSchema'];
  var reqs = readRows_('DocRequests').filter(function (r) { return !r.archived_at; });
  var cnt = function (s) { return reqs.filter(function (r) { return r.state === s; }).length; };
  var dist = distStats_(todayVN_());
  var note = dist.overdue ? 'Bản in lần cũ chưa thu hồi quá ' + (Number(setting_('dist_recall_days')) || 7) + ' ngày: Sổ phân phối → Cần thu hồi' : '';
  return [!dist.overdue, 'Phiếu đề nghị: chờ xem xét ' + cnt('SUBMITTED') + ' · đã chấp thuận chưa thực hiện ' + cnt('APPROVED') + ' · đã thực hiện ' + cnt('DONE') +
    ' · Bản in đang phát ' + dist.active + ' nơi (' + dist.copies + ' bản) · cần thu hồi ' + dist.due + (dist.overdue ? ' (quá hạn ' + dist.overdue + ')' : ''), note];
}

// ===== 30_dist.js =====
/* 30_dist: Sổ phân phối & thu hồi bản in (Đợt 2, phiên 2d — thay BM-ISO-02-03).
 * Một dòng = một nơi nhận (bộ phận + người / vị trí, số bản) của một lần ban hành. Chỉ phát bản của biểu đang hiệu lực (●).
 * Ban hành lần mới (hoặc đặt ✕): mọi dòng còn "Đang dùng" của lần cũ thành "Cần thu hồi" (tính theo lần ban hành, không cần ghi gì
 * lúc ban hành) → Thư ký ISO thu hồi (PIN), có thể phát luôn bản lần mới cho đúng các nơi đó. Bản in chưa thu hồi quá dist_recall_days
 * ngày kể từ ngày ban hành lần mới → báo đỏ (Chờ bạn xử lý, Trạng thái hệ thống). Ghi nhầm → Bỏ dòng (VOID).
 * Quyền: phát, thu hồi, sửa — Thư ký ISO / cấp 4 (mục 4: ban hành, thu hồi); xem — cấp 2+ / Thư ký ISO trong phạm vi biểu. */

/** Lần ban hành hiện hành của biểu (● nhập từ Excel không ghi lần = 01); '' khi chưa ban hành */
function itemCurRev_(it) {
  if (!it) return '';
  return String(it.current_rev || (it.status === 'ISSUED' ? '01' : ''));
}

function normRev_(r) {
  var s = String(r || '').replace(/^0+(?=\d)/, '');
  return s.length < 2 ? ('0' + s).slice(-2) : s;
}

/** Dòng đang dùng mà biểu đã ban hành lần khác hoặc đã ngừng dùng (✕) → cần thu hồi. Trả '' | 'DUE' */
function distDue_(d, it) {
  if (!d || d.state !== 'ACTIVE' || d.archived_at || !it) return '';
  if (it.status === 'NA') return 'DUE';
  return normRev_(d.rev) !== normRev_(itemCurRev_(it)) ? 'DUE' : '';
}

/** Ngày bắt đầu phải thu hồi: ngày ban hành lần hiện hành (biểu ✕: ngày đặt ✕) */
function distDueSince_(it) {
  if (!it) return '';
  if (it.status === 'NA') return String(it.updated_at || '').slice(0, 10);
  return String(it.issued_at || '');
}

/** Thống kê: {active nơi, copies bản, due, overdue} trên toàn bộ sổ (Trạng thái hệ thống) */
function distStats_(today) {
  var items = {};
  readRows_('Items').forEach(function (it) { items[it.item_id] = it; });
  var days = Number(setting_('dist_recall_days')) || 7;
  var out = { active: 0, copies: 0, due: 0, overdue: 0 };
  readRows_('Distributions').forEach(function (d) {
    if (d.archived_at || d.state !== 'ACTIVE') return;
    out.active++;
    out.copies += Number(d.copies) || 0;
    var it = items[d.item_id];
    if (distDue_(d, it)) {
      out.due++;
      var since = distDueSince_(it);
      if (since && addDaysIso_(since, days) < today) out.overdue++;
    }
  });
  return out;
}

function distResult_(ctx, rows, item) {
  return {
    entity_type: 'DIST', entity_id: rows.length ? rows[0].dist_id : '', record_version: rows.length ? rows[0].record_version : null,
    records: rows.map(function (r) { return projectRow_(ctx, r); }), item: item ? projectRow_(ctx, item) : null
  };
}

/** Biểu (ngoài khóa) cho kiểm quyền: Thư ký ISO / cấp 4, biểu trong phạm vi */
function distItem_(ctx, itemId) {
  ensureDocControlSchema_();
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  if (!isUuidV4_(itemId)) throw validationError_([fieldError_('item_id', 'ID_INVALID')]);
  var it = findOne_('Items', 'item_id', itemId);
  if (!it || it.archived_at) throw apiError_('NOT_FOUND');
  if (!itemVisible_(ctx.user, it)) throw apiError_('FORBIDDEN');
  return it;
}

/** Một dòng nơi nhận: {dist_id, dept_code, holder, copies} → lỗi theo chỉ số dòng (field rows.i.x) */
function distRowInput_(r, i, depts, errs) {
  var f = function (k) { return 'rows.' + i + '.' + k; };
  r = r || {};
  if (!isUuidV4_(r.dist_id)) errs.push(fieldError_(f('dist_id'), 'ID_INVALID'));
  var dept = trimStr_(r.dept_code);
  if (!dept) errs.push(fieldError_(f('dept_code'), 'REQUIRED'));
  else if (!depts[dept]) errs.push(fieldError_(f('dept_code'), 'DEPT_UNKNOWN'));
  var holder = trimStr_(r.holder);
  if (holder.length > 120) errs.push(fieldError_(f('holder'), 'TOO_LONG'));
  var copies = r.copies === undefined || r.copies === null || r.copies === '' ? 1 : Number(r.copies);
  if (!(copies >= 1 && copies <= 99) || Math.floor(copies) !== copies) errs.push(fieldError_(f('copies'), 'INVALID_VALUE'));
  return { dist_id: r.dist_id, dept_code: dept, holder: holder, copies: copies };
}

function distDepts_() {
  var m = {};
  readRows_('Depts').forEach(function (d) { m[d.dept_code] = d; });
  return m;
}

function distDateInput_(p, field, today, errs) {
  var d = trimStr_(p[field] || '') || today;
  if (!isDateStr_(d)) errs.push(fieldError_(field, 'INVALID_DATE'));
  else if (d > today) errs.push(fieldError_(field, 'DATE_FUTURE'));
  return d;
}

/** Dòng mới của lần đang hiệu lực */
function distNewRow_(ctx, it, r, date, note) {
  return cNew_(ctx, {
    dist_id: r.dist_id, item_id: it.item_id, version_id: it.current_version_id || '', rev: itemCurRev_(it), dept_code: r.dept_code,
    holder: r.holder, copies: r.copies, dist_date: date, note: note || '', state: 'ACTIVE', recalled_date: '', recalled_at: '', recalled_by: '',
    recall_note: '', replaced_by_id: '', void_at: '', void_by: '', void_reason: ''
  });
}

/* ---------------- dist.issue ---------------- */

/**
 * dist.issue {item_id, dist_date (≤ hôm nay, mặc định hôm nay), note, rows: [{dist_id, dept_code, holder, copies}]} — ghi phát bản in
 * của lần đang hiệu lực cho 1–30 nơi nhận. Biểu phải đang hiệu lực (●).
 */
function distIssue_(ctx) {
  var p = ctx.req.payload || {};
  var it0 = distItem_(ctx, p.item_id);
  var today = todayVN_();
  var errs = [];
  var rows = Array.isArray(p.rows) ? p.rows : [];
  if (!rows.length) errs.push(fieldError_('rows', 'REQUIRED'));
  if (rows.length > DIST_MAX_ROWS_) errs.push(fieldError_('rows', 'TOO_MANY'));
  var date = distDateInput_(p, 'dist_date', today, errs);
  var note = trimStr_(p.note || '');
  if (note.length > 300) errs.push(fieldError_('note', 'TOO_LONG'));
  var depts = distDepts_();
  var input = rows.slice(0, DIST_MAX_ROWS_).map(function (r, i) { return distRowInput_(r, i, depts, errs); });
  var seen = {};
  input.forEach(function (r, i) { if (seen[r.dist_id]) errs.push(fieldError_('rows.' + i + '.dist_id', 'ID_EXISTS')); seen[r.dist_id] = 1; });
  if (it0.status !== 'ISSUED') errs.push(fieldError_('item_id', 'ITEM_NOT_ISSUED'));
  if (errs.length) throw validationError_(errs);
  return executeWrite_(ctx, {
    entity_type: 'DIST', entity_id: p.item_id,
    build: function () {
      var it = findOne_('Items', 'item_id', p.item_id);
      if (!it || it.status !== 'ISSUED') throw validationError_([fieldError_('item_id', 'ITEM_NOT_ISSUED')]);
      var out = input.map(function (r) {
        assertNewId_('Distributions', 'dist_id', r.dist_id);
        return distNewRow_(ctx, it, r, date, note);
      });
      return {
        writes: out.map(function (r) { return { sheet: 'Distributions', mode: 'insert', row: r }; }),
        result: distResult_(ctx, out, null), record_version: 1,
        audit: { entity_type: 'DIST', entity_id: it.item_id, before_json: null,
          after_json: { code: it.code, rev: itemCurRev_(it), rows: out.length, copies: out.reduce(function (s, r) { return s + r.copies; }, 0) } }
      };
    }
  });
}

/* ---------------- dist.recall ---------------- */

/** Dòng phân phối (ngoài khóa) + biểu: Thư ký ISO, biểu trong phạm vi */
function distLoad_(ctx, id, field) {
  ensureDocControlSchema_();
  if (!isUuidV4_(id)) throw validationError_([fieldError_(field || 'dist_id', 'ID_INVALID')]);
  var d = findOne_('Distributions', 'dist_id', id);
  if (!d || d.archived_at) throw apiError_('NOT_FOUND');
  var it = findOne_('Items', 'item_id', d.item_id);
  if (!it || !itemVisible_(ctx.user, it)) throw apiError_('FORBIDDEN');
  return { d: d, it: it };
}

function precheckDistRecall_(ctx) {
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  var ids = (ctx.req.payload || {}).dist_ids;
  if (!Array.isArray(ids) || !ids.length) throw validationError_([fieldError_('dist_ids', 'REQUIRED')]);
  if (ids.length > DIST_MAX_RECALL_) throw validationError_([fieldError_('dist_ids', 'TOO_MANY')]);
  ids.forEach(function (id) { distLoad_(ctx, id, 'dist_ids'); });
}

/**
 * dist.recall {dist_ids: [..≤100], recalled_date (≤ hôm nay), note, reissue: true | false, new_ids: {dist_id cũ: dist_id mới}} (PIN):
 * thu hồi các dòng đang dùng. reissue: phát luôn bản của lần đang hiệu lực cho đúng nơi nhận đó (cùng bộ phận, người / vị trí, số bản),
 * chỉ với biểu đang hiệu lực — dòng cũ ghi replaced_by_id.
 */
function distRecall_(ctx) {
  var p = ctx.req.payload || {};
  var ids = Array.isArray(p.dist_ids) ? p.dist_ids : [];
  var today = todayVN_();
  var errs = [];
  var date = distDateInput_(p, 'recalled_date', today, errs);
  var note = trimStr_(p.note || '');
  if (note.length > 300) errs.push(fieldError_('note', 'TOO_LONG'));
  var reissue = p.reissue === true;
  var newIds = p.new_ids && typeof p.new_ids === 'object' ? p.new_ids : {};
  var seen = {};
  ids.forEach(function (id) {
    if (seen[id]) errs.push(fieldError_('dist_ids', 'ID_EXISTS'));
    seen[id] = 1;
    if (reissue && !isUuidV4_(newIds[id])) errs.push(fieldError_('new_ids', 'ID_INVALID'));
  });
  if (errs.length) throw validationError_(errs);
  return executeWrite_(ctx, {
    entity_type: 'DIST', entity_id: ids[0],
    build: function () {
      var writes = [], recalled = [], added = [], items = {};
      ids.forEach(function (id) {
        var cur = findOne_('Distributions', 'dist_id', id);
        if (!cur || cur.archived_at) throw apiError_('NOT_FOUND');
        if (cur.state !== 'ACTIVE') throw validationError_([fieldError_('dist_ids', 'STATUS_INVALID')]);
        var row = clone_(cur); delete row.__row;
        var it = items[row.item_id] || (items[row.item_id] = findOne_('Items', 'item_id', row.item_id));
        row.state = 'RECALLED';
        row.recalled_date = date;
        row.recalled_at = isoVN_(now_());
        row.recalled_by = ctx.user.user_id;
        row.recall_note = note;
        if (reissue && it && it.status === 'ISSUED') {
          if (normRev_(row.rev) === normRev_(itemCurRev_(it)) && !note) throw validationError_([fieldError_('note', 'REQUIRED')]);
          assertNewId_('Distributions', 'dist_id', newIds[id]);
          var nr = distNewRow_(ctx, it, { dist_id: newIds[id], dept_code: row.dept_code, holder: row.holder, copies: row.copies }, date, '');
          row.replaced_by_id = nr.dist_id;
          added.push(nr);
        }
        cUpdate_(ctx, row);
        recalled.push(row);
        writes.push({ sheet: 'Distributions', mode: 'update', row: row });
      });
      added.forEach(function (r) { writes.push({ sheet: 'Distributions', mode: 'insert', row: r }); });
      return {
        writes: writes, result: { entity_type: 'DIST', entity_id: ids[0], record_version: recalled.length ? recalled[0].record_version : null,
          records: recalled.concat(added).map(function (r) { return projectRow_(ctx, r); }), recalled: recalled.length, reissued: added.length },
        record_version: recalled.length ? recalled[0].record_version : null,
        audit: { entity_type: 'DIST', entity_id: ids[0], before_json: null,
          after_json: { recalled: recalled.map(function (r) { return { item_id: r.item_id, rev: r.rev, dept: r.dept_code, copies: r.copies }; }), reissued: added.length },
          reason: note }
      };
    }
  });
}

/* ---------------- dist.edit ---------------- */

/**
 * dist.edit {dist_id, dept_code, holder, copies, dist_date, note} — sửa dòng đang dùng (ghi nhầm); {dist_id, void: true, reason} — bỏ dòng
 * ghi nhầm (không tính vào sổ). expected_version bắt buộc.
 */
function distEdit_(ctx) {
  var p = ctx.req.payload || {};
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  var x = distLoad_(ctx, p.dist_id);
  if (x.d.state !== 'ACTIVE') throw stateInvalid_();
  var today = todayVN_();
  var errs = [];
  var isVoid = p.void === true;
  var reason = isVoid ? reasonText_(p, 'reason', true, 300) : '';
  var upd = {};
  if (!isVoid) {
    var depts = distDepts_();
    if (p.dept_code !== undefined) { upd.dept_code = trimStr_(p.dept_code); if (!depts[upd.dept_code]) errs.push(fieldError_('dept_code', 'DEPT_UNKNOWN')); }
    if (p.holder !== undefined) { upd.holder = trimStr_(p.holder); if (upd.holder.length > 120) errs.push(fieldError_('holder', 'TOO_LONG')); }
    if (p.copies !== undefined) { upd.copies = Number(p.copies); if (!(upd.copies >= 1 && upd.copies <= 99) || Math.floor(upd.copies) !== upd.copies) errs.push(fieldError_('copies', 'INVALID_VALUE')); }
    if (p.dist_date !== undefined) upd.dist_date = distDateInput_(p, 'dist_date', today, errs);
    if (p.note !== undefined) { upd.note = trimStr_(p.note); if (upd.note.length > 300) errs.push(fieldError_('note', 'TOO_LONG')); }
  }
  if (errs.length) throw validationError_(errs);
  return executeWrite_(ctx, {
    entity_type: 'DIST', entity_id: p.dist_id,
    build: function () {
      var cur = findOne_('Distributions', 'dist_id', p.dist_id);
      if (!cur) throw apiError_('NOT_FOUND');
      assertVersion_(ctx, cur, 'DIST', 'Distributions');
      if (cur.state !== 'ACTIVE') throw stateInvalid_();
      var row = clone_(cur); delete row.__row;
      var before = { dept_code: row.dept_code, holder: row.holder, copies: row.copies, dist_date: row.dist_date, state: row.state };
      if (isVoid) {
        row.state = 'VOID'; row.void_at = isoVN_(now_()); row.void_by = ctx.user.user_id; row.void_reason = reason;
      } else Object.keys(upd).forEach(function (k) { row[k] = upd[k]; });
      cUpdate_(ctx, row);
      return {
        writes: [{ sheet: 'Distributions', mode: 'update', row: row }], result: distResult_(ctx, [row], null), record_version: row.record_version,
        audit: { entity_type: 'DIST', entity_id: row.dist_id, before_json: before,
          after_json: { dept_code: row.dept_code, holder: row.holder, copies: row.copies, dist_date: row.dist_date, state: row.state }, reason: reason }
      };
    }
  });
}

// ===== 31_tpl.js =====
/* 31_tpl: Kho tệp mẫu (2e, người dùng yêu cầu 12/11/2026 "chỉ phạm vi cơ điện + Kho tệp mẫu").
 * Một dòng TplFiles = một tệp mẫu trống để in / điền: bộ biểu Excel nhiều sheet (vd BM-CD-04_Sua-chua….xlsx — mỗi sheet một mã biểu,
 * sheet phụ a/b, -TD, -TH, -ML thuộc biểu cha), hoặc tệp Word / PDF. App đọc tên sheet + khổ giấy bằng SheetJS rồi gửi kèm tệp
 * (tpl.upload); app tự ghép sheet ↔ biểu trong danh mục theo mã (như ghép mã của Evidence — normFormCode_, evMatchItem_), nên danh
 * mục đổi sau khi tải lên vẫn ghép đúng. Tệp cùng bộ (BM-CĐ-04) tải lên lần nữa thì tệp cũ thành REPLACED (giữ để tra); bỏ tệp tải
 * nhầm (tpl.delete, PIN) thì tệp nó đã thay quay lại dùng. Tệp nằm trên Drive riêng tư của máy chủ, tải về qua doc.get. */

/** Dạng bộ biểu từ tên sheet / tên tệp: BM-<bộ phận>-<nhóm> (BM-CD-04_… → BM-CĐ-04 theo danh sách bộ phận) */
function tplSetCodeOf_(s, deptByNorm) {
  var t = String(s || '');
  try { t = t.normalize('NFC'); } catch (e) { /* bỏ qua */ }
  var m = /BM[-_ ]([A-Za-zĐđ]{1,6})[-_ ](\d{2})/.exec(t);
  if (!m) return null;
  var dept = deptByNorm[normFormCode_(m[1])];
  if (!dept) return null;
  return { set_code: 'BM-' + dept + '-' + m[2], dept_code: dept, group_key: dept + '-' + m[2] };
}

function tplDeptIndex_() {
  var idx = {};
  readRows_('Depts').forEach(function (d) { idx[normFormCode_(d.dept_code)] = d.dept_code; });
  return idx;
}

/** Bộ biểu của tệp: bộ có nhiều sheet nhất; không có sheet mang mã thì lấy từ tên tệp */
function tplSetOf_(sheets, fileName, deptIdx) {
  var cnt = {}, best = null;
  sheets.forEach(function (s) {
    var x = tplSetCodeOf_(s.n, deptIdx);
    if (!x) return;
    cnt[x.set_code] = cnt[x.set_code] || { x: x, n: 0 };
    cnt[x.set_code].n++;
    if (!best || cnt[x.set_code].n > best.n) best = cnt[x.set_code];
  });
  return best ? best.x : tplSetCodeOf_(fileName, deptIdx);
}

/** Danh sách sheet app gửi: [{n: tên, p: A4|A3|A5|LETTER|OTHER|'', o: P|L|'', h: ẩn}] → chuẩn hóa; sai ném TPL_SHEETS */
var TPL_PAPERS_ = { '': 1, A3: 1, A4: 1, A5: 1, LETTER: 1, OTHER: 1 };
function tplSheetsInput_(list) {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list) || list.length > TPL_MAX_SHEETS_) throw validationError_([fieldError_('sheets', 'TPL_SHEETS')]);
  var seen = {};
  return list.map(function (s) {
    var n = s && typeof s.n === 'string' ? s.n.trim() : '';
    var p = s && s.p ? String(s.p).toUpperCase() : '';
    var o = s && s.o ? String(s.o).toUpperCase() : '';
    if (!n || n.length > 100 || seen[n] || !TPL_PAPERS_[p] || (o && o !== 'P' && o !== 'L')) throw validationError_([fieldError_('sheets', 'TPL_SHEETS')]);
    seen[n] = 1;
    var out = { n: n, p: p, o: o };
    if (s.h === true) out.h = true;
    return out;
  });
}

/** Xem được tệp mẫu: đang dùng — mọi người (bộ thuộc phạm vi áp dụng, hoặc không rõ bộ); đã thay — cấp 3+, Thư ký ISO; đã bỏ — không ai */
function tplVisible_(u, t) {
  if (!t || t.archived_at || t.state === 'DELETED') return false;
  var mgr = isSecretary_(u) || Number(u.role_level) >= 3;
  if (t.dept_code && !inScopeDept_(t.dept_code) && !isSecretary_(u)) return false;
  return t.state === 'ACTIVE' || mgr;
}

/** Dán Code.gs 2e mà chưa chạy migrateSchema: lần tải lên đầu tiên tự thêm sheet TplFiles */
function ensureTplSchema_() {
  if (sheetExists_('TplFiles')) return;
  autoMigrate_();
  dbReset_();
  if (!sheetExists_('TplFiles')) throw apiError_('SYSTEM_NOT_READY');
}

function tplResult_(ctx, row, extra) {
  var out = { entity_type: 'TPL', entity_id: row.tpl_id, record_version: row.record_version, record: projectRow_(ctx, row) };
  if (extra) Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
  return out;
}

/* ---------------- tpl.upload ---------------- */

/**
 * tpl.upload {tpl_id, document_id, file_name, mime_type, content_b64, sheets: [{n, p, o, h}], title_vi?, title_zh?, note?}
 * (Thư ký ISO / cấp 4, cần mạng). Tên bộ mặc định = tên nhóm của bộ (Groups <bộ phận>-<nhóm>), không có thì tên tệp.
 * Tệp đang dùng cùng bộ (hoặc cùng tên tệp khi không rõ bộ) → REPLACED. Trả {record, replaced: [tpl_id]}.
 */
function tplUpload_(ctx) {
  ensureTplSchema_();
  var p = ctx.req.payload || {};
  var errs = [];
  if (!isUuidV4_(p.tpl_id)) errs.push(fieldError_('tpl_id', 'ID_INVALID'));
  if (!isUuidV4_(p.document_id)) errs.push(fieldError_('document_id', 'ID_INVALID'));
  if (!TPL_MIMES_[p.mime_type]) errs.push(fieldError_('mime_type', 'FILE_TYPE'));
  if (typeof p.content_b64 !== 'string' || !p.content_b64) errs.push(fieldError_('content_b64', 'REQUIRED'));
  var fileName = cleanFileName_(p.file_name);
  if (!fileName) errs.push(fieldError_('file_name', 'REQUIRED'));
  var note = trimStr_(p.note || '');
  if (note.length > 300) errs.push(fieldError_('note', 'TOO_LONG'));
  ['title_vi', 'title_zh'].forEach(function (k) { if (p[k] !== undefined && trimStr_(p[k]).length > 200) errs.push(fieldError_('title', 'TOO_LONG')); });
  if (Number(ctx.req.expected_version || 0) !== 0) errs.push(fieldError_('expected_version', 'INVALID_VALUE'));
  if (errs.length) throw validationError_(errs);
  var sheets = tplSheetsInput_(TPL_MIMES_[p.mime_type] === 'xlsx' || TPL_MIMES_[p.mime_type] === 'xls' ? p.sheets : null);

  var ex = findOne_('Operations', 'operation_id', ctx.req.operation_id);
  if (ex) return withWriteLock_(function () { return existingOpResponse_(ctx, ex, payloadHash_(ctx)); });
  assertNewId_('TplFiles', 'tpl_id', p.tpl_id);
  assertNewId_('Documents', 'document_id', p.document_id);

  var bytes;
  try { bytes = b64d_(p.content_b64); } catch (e) { throw validationError_([fieldError_('content_b64', 'INVALID_VALUE')]); }
  if (!bytes.length) throw validationError_([fieldError_('content_b64', 'REQUIRED')]);
  if (bytes.length > Number(setting_('doc_max_bytes'))) throw validationError_([fieldError_('content_b64', 'FILE_TOO_LARGE')]);
  if (!magicOk_(bytes, p.mime_type)) throw validationError_([fieldError_('mime_type', 'FILE_TYPE')]);

  var deptIdx = tplDeptIndex_();
  var set = tplSetOf_(sheets, fileName, deptIdx);
  if (set && !inScopeDept_(set.dept_code)) throw validationError_([fieldError_('file_name', 'APP_SCOPE')]);
  var grp = set ? findOne_('Groups', 'group_key', set.group_key) : null;
  var base = fileName.replace(/\.[^.]+$/, '');
  var titleVi = trimStr_(p.title_vi || '') || (grp && grp.name_vi) || (grp ? '' : base);
  var titleZh = trimStr_(p.title_zh || '') || (grp && grp.name_zh) || '';
  var ext = TPL_MIMES_[p.mime_type];
  var driveName = 'TM_' + String(set ? set.set_code : base).replace(/[\/\\\s]/g, '-').slice(0, 60) + '_' + p.tpl_id.slice(0, 8) + '.' + ext;
  var folder = appFolder_();
  var file = folder.createFile(Utilities.newBlob(bytes, p.mime_type, driveName));
  var sha = b64url_(sha256_(bytes));
  var res;
  try {
    res = executeWrite_(ctx, {
      entity_type: 'TPL', entity_id: p.tpl_id,
      build: function () {
        assertNewId_('TplFiles', 'tpl_id', p.tpl_id);
        assertNewId_('Documents', 'document_id', p.document_id);
        var nowIso = isoVN_(now_());
        var row = cNew_(ctx, {
          tpl_id: p.tpl_id, set_code: set ? set.set_code : '', dept_code: set ? set.dept_code : '', title_vi: titleVi, title_zh: titleZh,
          file_name: fileName, mime_type: p.mime_type, size_bytes: bytes.length, sha256: sha, document_id: p.document_id,
          sheets_json: sheets, sheet_count: sheets.length, state: 'ACTIVE', replaced_by_id: '', replaced_at: '',
          uploaded_at: nowIso, uploaded_by: ctx.user.user_id, note: note, deleted_at: '', deleted_by: '', delete_reason: ''
        });
        var doc = cNew_(ctx, {
          document_id: p.document_id, entity_type: 'TPL', entity_id: p.tpl_id, kind: 'TEMPLATE', drive_file_id: file.getId(),
          mime_type: p.mime_type, file_name: fileName, access_scope: 'PRIVATE', active: true, managed_folder_id: folder.getId(),
          owned_by_app: true, size_bytes: bytes.length, thumb_drive_file_id: '', sha256: sha, page_no: null
        });
        var writes = [{ sheet: 'Documents', mode: 'insert', row: doc }, { sheet: 'TplFiles', mode: 'insert', row: row }];
        var replaced = [];
        var sameKey = function (t) {
          if (t.state !== 'ACTIVE' || t.archived_at) return false;
          return row.set_code ? t.set_code === row.set_code : (!t.set_code && String(t.file_name).toLowerCase() === fileName.toLowerCase());
        };
        readRows_('TplFiles').filter(sameKey).forEach(function (t) {
          var o = clone_(t); delete o.__row;
          o.state = 'REPLACED'; o.replaced_by_id = row.tpl_id; o.replaced_at = nowIso;
          cUpdate_(ctx, o);
          writes.push({ sheet: 'TplFiles', mode: 'update', row: o, rowNum: t.__row });
          replaced.push(o.tpl_id);
        });
        return {
          writes: writes, result: tplResult_(ctx, row, { replaced: replaced }), record_version: row.record_version,
          audit: { entity_type: 'TPL', entity_id: row.tpl_id, before_json: replaced.length ? { replaced: replaced } : null,
            after_json: { set_code: row.set_code, file_name: fileName, size_bytes: bytes.length, sheets: sheets.length } }
        };
      }
    });
  } catch (e) {
    trashQuietly_(file);
    throw e;
  }
  if (res.code === 'DUPLICATE_OPERATION') trashQuietly_(file);
  return res;
}

/* ---------------- tpl.edit, tpl.delete ---------------- */

function tplLoad_(ctx, id) {
  ensureTplSchema_();
  if (!isUuidV4_(id)) throw validationError_([fieldError_('tpl_id', 'ID_INVALID')]);
  var t = findOne_('TplFiles', 'tpl_id', id);
  if (!t || !tplVisible_(ctx.user, t)) throw apiError_('NOT_FOUND');
  return t;
}

/** tpl.edit {tpl_id, title_vi, title_zh, note} — sửa tên bộ / ghi chú của tệp đang dùng (expected_version bắt buộc) */
function tplEdit_(ctx) {
  var p = ctx.req.payload || {};
  var t0 = tplLoad_(ctx, p.tpl_id);
  if (t0.state !== 'ACTIVE') throw validationError_([fieldError_('tpl_id', 'TPL_STATE')]);
  var upd = {}, errs = [];
  ['title_vi', 'title_zh', 'note'].forEach(function (k) {
    if (p[k] === undefined) return;
    upd[k] = trimStr_(p[k]);
    if (upd[k].length > (k === 'note' ? 300 : 200)) errs.push(fieldError_(k === 'note' ? 'note' : 'title', 'TOO_LONG'));
  });
  if (upd.title_vi !== undefined && upd.title_zh !== undefined && !upd.title_vi && !upd.title_zh) errs.push(fieldError_('title', 'REQUIRED_ONE_LANGUAGE'));
  if (errs.length) throw validationError_(errs);
  return executeWrite_(ctx, {
    entity_type: 'TPL', entity_id: p.tpl_id,
    build: function () {
      var cur = findOne_('TplFiles', 'tpl_id', p.tpl_id);
      if (!cur) throw apiError_('NOT_FOUND');
      assertVersion_(ctx, cur, 'TPL', 'TplFiles');
      if (cur.state !== 'ACTIVE') throw validationError_([fieldError_('tpl_id', 'TPL_STATE')]);
      var row = clone_(cur); delete row.__row;
      var before = { title_vi: row.title_vi, title_zh: row.title_zh, note: row.note };
      Object.keys(upd).forEach(function (k) { row[k] = upd[k]; });
      cUpdate_(ctx, row);
      return {
        writes: [{ sheet: 'TplFiles', mode: 'update', row: row }], result: tplResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'TPL', entity_id: row.tpl_id, before_json: before, after_json: upd }
      };
    }
  });
}

function precheckTplDelete_(ctx) {
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  var t = tplLoad_(ctx, (ctx.req.payload || {}).tpl_id);
  if (t.state !== 'ACTIVE') throw validationError_([fieldError_('tpl_id', 'TPL_STATE')]);
}

/**
 * tpl.delete {tpl_id, reason} (PIN): bỏ tệp đang dùng (tải nhầm, không dùng nữa) → DELETED, tệp trên Drive vào thùng rác.
 * Tệp nó đã thay (REPLACED, replaced_by_id = tệp này, mới nhất) quay lại ACTIVE.
 */
function tplDelete_(ctx) {
  var p = ctx.req.payload || {};
  var reason = reasonText_(p, 'reason', true, 300);
  var driveId = '';
  var res = executeWrite_(ctx, {
    entity_type: 'TPL', entity_id: p.tpl_id,
    build: function () {
      var cur = findOne_('TplFiles', 'tpl_id', p.tpl_id);
      if (!cur) throw apiError_('NOT_FOUND');
      assertVersion_(ctx, cur, 'TPL', 'TplFiles');
      if (cur.state !== 'ACTIVE') throw validationError_([fieldError_('tpl_id', 'TPL_STATE')]);
      var nowIso = isoVN_(now_());
      var row = clone_(cur); delete row.__row;
      row.state = 'DELETED'; row.deleted_at = nowIso; row.deleted_by = ctx.user.user_id; row.delete_reason = reason;
      cUpdate_(ctx, row);
      var writes = [{ sheet: 'TplFiles', mode: 'update', row: row }];
      var d = row.document_id ? findOne_('Documents', 'document_id', row.document_id) : null;
      if (d && d.active) {
        var dr = clone_(d); delete dr.__row;
        dr.active = false;
        cUpdate_(ctx, dr);
        writes.push({ sheet: 'Documents', mode: 'update', row: dr });
        driveId = d.drive_file_id;
      }
      var prev = readRows_('TplFiles').filter(function (t) { return t.state === 'REPLACED' && t.replaced_by_id === row.tpl_id && !t.archived_at; })
        .sort(function (a, b) { return String(b.uploaded_at).localeCompare(String(a.uploaded_at)); })[0];
      var restored = '';
      if (prev) {
        var pr = clone_(prev); delete pr.__row;
        pr.state = 'ACTIVE'; pr.replaced_by_id = ''; pr.replaced_at = '';
        cUpdate_(ctx, pr);
        writes.push({ sheet: 'TplFiles', mode: 'update', row: pr, rowNum: prev.__row });
        restored = pr.tpl_id;
      }
      return {
        writes: writes, result: tplResult_(ctx, row, { restored: restored }), record_version: row.record_version,
        audit: { entity_type: 'TPL', entity_id: row.tpl_id, before_json: { state: 'ACTIVE' }, after_json: { state: 'DELETED', restored: restored }, reason: reason }
      };
    }
  });
  if (driveId && res.code !== 'DUPLICATE_OPERATION') { try { trashQuietly_(DriveApp.getFileById(String(driveId))); } catch (e) { /* bỏ qua */ } }
  return res;
}

/* ---------------- Trạng thái hệ thống ---------------- */

/** Dòng templates của healthCheck: số tệp đang dùng, số sheet, biểu trong phạm vi có tệp mẫu (ghép mã như app) */
function tplHealth_(items) {
  if (!sheetExists_('TplFiles')) return { ok: false, value: 'Thiếu sheet TplFiles', note: 'Chạy migrateSchema' };
  var act = readRows_('TplFiles').filter(function (t) { return t.state === 'ACTIVE' && !t.archived_at && (!t.dept_code || inScopeDept_(t.dept_code)); });
  var idx = evItemIndex_(items);
  var have = {}, sheets = 0;
  act.forEach(function (t) {
    (Array.isArray(t.sheets_json) ? t.sheets_json : []).forEach(function (s) {
      sheets++;
      var it = evMatchItem_(idx, s.n);
      if (it) have[it.item_id] = true;
    });
  });
  var forms = items.filter(function (it) { return it.status !== 'NA'; });
  var n = forms.filter(function (it) { return have[it.item_id]; }).length;
  return {
    ok: true,
    value: act.length + ' tệp · ' + sheets + ' sheet · ' + n + '/' + forms.length + ' biểu trong phạm vi có tệp mẫu',
    note: act.length ? '' : 'Chưa có tệp mẫu — Kho tệp mẫu → Tải tệp mẫu lên'
  };
}

// ===== 32_capa.js =====
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

// ===== i18n/labels.json =====
/** Bản chép từ điển nhãn của app (5.3) cho email, Excel, lời báo */
var LABELS = {"account.add_home":["Thêm app vào Màn hình chính: trong Safari bấm Chia sẻ → Thêm vào MH chính","将应用添加到主屏幕：在Safari中点击分享→添加到主屏幕"],"account.admin":["Quản trị","管理"],"account.api_version":["Phiên bản API","API版本"],"account.app_version":["Phiên bản app","应用版本"],"account.display_name":["Tên hiển thị","显示名称"],"account.expires":["Hết hạn","到期"],"account.guide":["Hướng dẫn","使用指南"],"account.info":["Thông tin","信息"],"account.issued":["Đăng nhập lúc","登录时间"],"account.last_seen":["Hoạt động gần nhất","最近活动"],"account.level":["Cấp","级别"],"account.profile":["Hồ sơ","个人资料"],"account.security":["Bảo mật","安全"],"account.server_version":["Phiên bản máy chủ","服务器版本"],"account.sessions":["Phiên đăng nhập","登录会话"],"account.sync":["Đồng bộ","同步"],"account.this_device":["Máy này","本机"],"adm.audit.after":["Sau","修改后"],"adm.audit.before":["Trước","修改前"],"adm.audit.from":["Từ ngày","从"],"adm.audit.more":["Còn nữa — thu hẹp bộ lọc để xem thêm","还有更多——请缩小筛选范围"],"adm.audit.to":["Đến ngày","至"],"adm.audit.user":["Người làm","操作人"],"adm.backup.docs":["Tài liệu","文件"],"adm.backup.last":["Lần sao lưu gần nhất","最近一次备份"],"adm.backup.no_manifest":["Không có manifest.json: lần chạy bị dừng giữa chừng, xem Lần thực thi trong Apps Script","缺少manifest.json：运行中途停止，请查看Apps Script执行记录"],"adm.backup.none":["Chưa có bản sao lưu","暂无备份"],"adm.backup.note":["Tự động hằng tuần ({D}, {H}:00), giữ {N} bản đã kiểm chứng. Khôi phục làm thủ công theo hướng dẫn","每周自动备份（{D} {H}:00），保留{N}份已校验备份。恢复需按指南手动操作"],"adm.backup.queued":["Đang chờ sao lưu, màn tự cập nhật…","等待备份中，页面自动刷新…"],"adm.backup.retry":["Chạy lại sau ghi đồng thời","因同时写入而重跑"],"adm.backup.rows":["Số dòng","行数"],"adm.backup.running":["Đang sao lưu (thường 1–3 phút), màn tự cập nhật…","正在备份（通常1–3分钟），页面自动刷新…"],"adm.status.base_mismatch":["Khác địa chỉ app đang dùng ({U})","与当前应用地址不同（{U}）"],"adm.status.checked_at":["Kiểm lúc {T}","检查于{T}"],"adm.status.default":["Mặc định","默认"],"adm.status.edit_setting":["Sửa cấu hình","修改设置"],"adm.status.ok":["Đạt","正常","green"],"adm.status.readonly":["Chỉ đọc","只读","grey"],"adm.status.settings":["Cấu hình","系统设置"],"adm.status.warn":["Cảnh báo","警告","amber"],"adm.user.add":["Thêm người dùng","新增用户"],"adm.user.code":["Mã nhân viên","员工编号"],"adm.user.confirm_reset":["Cấp PIN tạm mới? PIN cũ hết dùng, mọi phiên bị thu hồi","发放新的临时PIN？旧PIN失效，所有会话将被撤销"],"adm.user.confirm_revoke":["Thu hồi mọi phiên của người này? Họ phải đăng nhập lại","撤销该用户的所有会话？该用户需重新登录"],"adm.user.email":["Email (không bắt buộc)","邮箱（可选）"],"adm.user.hide_locked":["Ẩn tài khoản đã khóa","隐藏已锁定的账号"],"adm.user.last_login":["Đăng nhập cuối","最近登录"],"adm.user.owner_note":["Chủ hệ thống: chỉ chủ hệ thống thao tác được","系统所有者：仅系统所有者可操作"],"adm.user.pin_locked":["Đang khóa do nhập sai PIN","因输错PIN被锁定","amber"],"adm.user.role_note":["Đổi cấp, bộ phận hoặc cờ làm mọi phiên của người này hết hiệu lực","修改级别、部门或标记后，该用户所有会话失效"],"adm.user.self_note":["Tài khoản của bạn: đổi PIN ở trang Tài khoản","这是您的账号：请在账户页修改PIN"],"adm.user.sessions":["Phiên đang mở","在线会话"],"adm.user.show_locked":["Hiện tài khoản đã khóa ({N})","显示已锁定的账号（{N}）"],"adm.user.temp_pin_once":["PIN tạm chỉ hiện một lần. Ghi lại và đưa tận tay người dùng; hạn {H} giờ, đăng nhập xong phải đổi PIN","临时PIN只显示一次。请记下并当面交给用户；有效期{H}小时，登录后必须修改PIN"],"adm.user.temp_pin_title":["PIN tạm","临时PIN"],"adm.user.temp_pin_until":["Hạn PIN tạm","临时PIN到期"],"adm.user.total":["{N} tài khoản","共{N}个账号"],"admin.audit":["Nhật ký thao tác","操作日志"],"admin.backup":["Sao lưu","备份"],"admin.report_logo":["Logo trên báo cáo","报表标志"],"admin.status":["Trạng thái hệ thống","系统状态"],"admin.users":["Người dùng và PIN tạm","用户与临时PIN"],"attempts_left":["Còn {N} lần thử","还可尝试 {N} 次"],"auth.checking_pin":["Đang kiểm tra PIN…","正在验证PIN…"],"auth.expired_offline":["Phiên đã hết hạn: chỉ xem nháp và xuất dự phòng","会话已过期：只能查看草稿和导出备份"],"auth.hello":["Xin chào","你好"],"auth.loading_data":["Đang tải dữ liệu…","正在加载数据…"],"auth.loading_page":["Đang tải dữ liệu (phần {N})…","正在加载数据（第 {N} 部分）…"],"auth.logout_all_confirm":["Mọi phiên, kể cả máy đang dùng, sẽ hết hiệu lực. Dùng khi mất điện thoại.","所有会话（包括本机）将失效。用于手机丢失时。"],"auth.logout_has_drafts":["Còn {N} mục chưa gửi lên máy chủ. Chọn cách xử lý trước khi đăng xuất.","仍有 {N} 条未同步到服务器。退出前请选择处理方式。"],"auth.open_with_pin":["Mở bằng PIN","用PIN打开"],"auth.others_relogin":["Các thiết bị khác phải đăng nhập lại","其他设备需重新登录"],"auth.pin_skip_wait":["Không chờ mạng — mở bằng dữ liệu trên máy","不等网络 — 使用本机数据打开"],"auth.revoked":["Phiên đã bị thu hồi hoặc quyền đã thay đổi","会话已撤销或权限已变更"],"auth.seconds":["{N} giây","{N} 秒"],"auth.server_changed":["App đã chuyển sang máy chủ khác — đăng nhập lại. Nháp chưa gửi của máy chủ cũ nằm ở mục Nháp thế hệ dữ liệu cũ","应用已切换到其他服务器——请重新登录。旧服务器未发送的草稿在“旧数据草稿”中"],"auth.server_slow":["Máy chủ đang phản hồi chậm…","服务器响应较慢…"],"auth.session_warn":["Phiên sắp hết hạn — {D}","会话即将到期 — {D}"],"auth.step_connect":["Kết nối máy chủ","连接服务器"],"auth.step_data":["Cập nhật dữ liệu","更新数据"],"auth.step_open":["Mở trang chủ","打开首页"],"auth.temp_pin_stale":["PIN tạm này không còn dùng được (đã có PIN tạm mới hơn, hoặc quá hạn đổi PIN). Đăng nhập lại bằng PIN tạm mới nhất","此临时PIN已失效（已发放更新的临时PIN或超过修改时限）。请用最新的临时PIN重新登录"],"back":["Quay lại","返回"],"btn.back":["Quay lại","返回"],"btn.backup_now":["Sao lưu ngay","立即备份"],"btn.cancel":["Hủy","取消"],"btn.change_pin":["Đổi PIN","修改PIN"],"btn.close":["Đóng","关闭"],"btn.confirm":["Đúng","确认"],"btn.delete_draft":["Xóa nháp","删除草稿"],"btn.delete_drafts":["Xóa nháp","删除草稿"],"btn.edit":["Sửa","编辑"],"btn.export_backup":["Xuất dự phòng","导出备份"],"btn.filter":["Lọc","筛选"],"btn.keep_drafts":["Giữ nháp trên máy","保留本机草稿"],"btn.lock":["Khóa","锁定"],"btn.logout":["Đăng xuất","退出登录"],"btn.logout_all":["Đăng xuất mọi thiết bị","退出所有设备"],"btn.relogin":["Đăng nhập lại","重新登录"],"btn.reset_pin":["Cấp PIN tạm","发放临时PIN"],"btn.retry":["Thử lại","重试"],"btn.revoke":["Thu hồi","撤销"],"btn.revoke_sessions":["Thu hồi phiên","撤销会话"],"btn.save":["Lưu","保存"],"btn.set_role":["Đổi cấp/vai trò","修改级别/岗位"],"btn.sync_now":["Đồng bộ ngay","立即同步"],"btn.unlock":["Mở khóa","解锁"],"btn.use_server":["Dùng bản máy chủ","采用服务器版本"],"cancel":["Hủy","取消"],"change_pin":["Đổi PIN","修改PIN"],"col.actions":["Thao tác","操作"],"col.status":["Tình trạng biểu","表单状态"],"conflict.rebased":["Đã gửi lại thay đổi của bạn trên bản máy chủ mới nhất","已在服务器最新版本上重新发送您的修改"],"conflict.title":["Xử lý xung đột","处理冲突"],"conflict.use_server_confirm":["Bỏ thay đổi của bạn và dùng bản máy chủ? Có thể xuất dự phòng trước.","放弃您的修改并采用服务器版本？可先导出备份。"],"current_pin":["PIN hiện tại","当前PIN"],"draft.auto_delete":["Tự xóa sau {N} ngày","{N} 天后自动删除"],"draft.blocked_hint":["Mục trước của cùng hồ sơ bị từ chối/xung đột; xử lý mục đó trước","同一记录的前一项被拒绝/冲突，请先处理该项"],"draft.created":["Tạo lúc","创建时间"],"draft.delete_all_confirm":["Xóa hẳn {N} nháp chưa gửi? Không lấy lại được.","确定删除 {N} 份未同步草稿？删除后无法恢复。"],"draft.delete_confirm":["Xóa hẳn nháp này? Không lấy lại được.","确定删除此草稿？删除后无法恢复。"],"draft.empty":["Không có mục nào","没有项目"],"draft.error_code":["Mã lỗi","错误代码"],"draft.old_epoch":["Nháp thế hệ dữ liệu cũ","旧数据草稿"],"draft.other_user":["Máy còn {N} nháp của người dùng khác","本机有 {N} 份其他用户的草稿"],"draft.photos":["{N} ảnh","{N} 张照片"],"draft.recent_sent":["Đã gửi lên máy chủ (7 ngày gần nhất)","已同步（最近7天）"],"draft.rejected":["Nháp bị từ chối","被拒草稿"],"draft.sent_at":["Gửi lúc","同步时间"],"draft.size":["Dung lượng","大小"],"draft.title":["Nháp chờ đồng bộ","待同步草稿"],"employee_code":["Mã nhân viên","员工编号"],"env_test":["THỬ","测试"],"err.client":["Lỗi trên máy","本机错误"],"err.forbidden":["Không có quyền","无权限"],"err.not_found":["Không tìm thấy","未找到"],"err.reload_hint":["Nếu vừa có bản mới: bấm để tải lại toàn bộ app. Nháp chưa gửi vẫn giữ trên máy.","如刚更新版本：点击重新加载整个应用。未发送的草稿仍保留在本机。"],"err.reload_new":["Tải lại bản mới","重新加载最新版本"],"field.choose":["— Chọn —","— 请选择 —"],"field.invalid_date":["Ngày không hợp lệ","日期无效"],"field.name":["Tên","名称"],"field.number_ambiguous":["Đã hiểu là {A}. Nếu là số hàng nghìn, gõ liền không dấu (vd 12350)","已识别为 {A}；如为千位数，请连续输入（如 12350）"],"field.number_bad_sep":["Không dùng dấu chấm/phẩy để tách hàng nghìn; gõ 1234567","请勿使用千位分隔符，请输入 1234567"],"field.one_lang":["Chỉ cần nhập một thứ tiếng, máy chủ tự dịch bên kia","只需填写一种语言，服务器自动翻译另一种"],"field.reason":["Lý do","原因"],"field.reason_required":["Bắt buộc nhập lý do","必须填写原因"],"field.required":["Bắt buộc nhập","必填"],"forgot_pin":["Quên PIN","忘记PIN"],"forgot_pin_help":["Liên hệ quản trị để đặt lại PIN","请联系管理员重置密码"],"form.saved":["Đã lưu máy chủ","已同步"],"i18n.check_required":["Tick \"Đã kiểm tra bản dịch\" trước khi lưu","保存前请勾选\"已核对译文\""],"i18n.checked":["Đã kiểm tra bản dịch","已核对译文"],"i18n.lang_vi":["Tiếng Việt","越南语"],"i18n.lang_zh":["Tiếng Trung","中文"],"i18n.suggest":["Gợi ý dịch","翻译建议"],"i18n.suggest_need_one":["Nhập một bên rồi bấm Gợi ý dịch","先填写一种语言再点翻译建议"],"level.owner":["Chủ hệ thống","系统所有者"],"list.more":["Hiện thêm {N} (còn {R})","再显示{N}条（剩余{R}条）"],"locked":["Tạm khóa do nhập sai PIN nhiều lần, thử lại sau {N} phút","因多次输错PIN已暂时锁定，请 {N} 分钟后重试"],"login":["Đăng nhập","登录"],"logo.bad_type":["Chỉ nhận ảnh PNG hoặc JPEG","仅支持PNG或JPEG图片"],"logo.current":["Logo đang dùng","当前标志"],"logo.hint":["Nên dùng ảnh PNG nền trong suốt; app tự thu nhỏ còn tối đa 800 px trước khi gửi","建议使用透明背景PNG；应用发送前自动缩小至最长800像素"],"logo.none":["Chưa có logo — báo cáo in ra không có logo","尚未设置标志——报表不显示标志"],"logo.preview_note":["Xem trước ở cỡ đầu trang PDF","按PDF页眉大小预览"],"logo.remove":["Gỡ logo","移除标志"],"logo.remove_confirm":["Gỡ logo khỏi báo cáo? Báo cáo in sau đó sẽ không có logo.","从报表移除标志？之后打印的报表将不显示标志。"],"logo.removed":["Đã gỡ logo","已移除标志"],"logo.replace":["Đổi logo","更换标志"],"logo.saved":["Đã lưu logo — báo cáo in từ giờ có logo mới","标志已保存——此后打印的报表使用新标志"],"logo.upload":["Chọn ảnh logo","选择标志图片"],"logo.where":["Logo công ty chỉ hiện trên báo cáo PDF và Excel (Đợt 2), không hiện trong app","公司标志仅显示在PDF和Excel报表上（第2期），不在应用内显示"],"manual_code":["Mở theo mã","按编号打开"],"menu.title":["ISO","体系管理"],"nav.account":["Tài khoản","账户"],"nav.home":["Trang chủ","首页"],"nav.scan":["Quét","扫码"],"need_network":["Cần kết nối mạng","需要网络连接"],"network_error":["Không kết nối được máy chủ","无法连接服务器"],"new_pin":["PIN mới","新PIN"],"new_pin_again":["Nhập lại PIN mới","确认新PIN"],"no_reuse_pin":["Không dùng lại PIN của app khác","请勿重复使用其他应用的PIN"],"offline":["Ngoại tuyến","离线"],"offline_unlock":["Mở khóa ngoại tuyến","离线解锁"],"op_state.COMMITTED":["Đã lưu máy chủ","已同步","green"],"open_with_pin":["Mở bằng PIN","用PIN打开"],"pin6":["PIN 6 số","六位数字密码"],"pin_format":["PIN phải gồm đúng 6 chữ số","PIN必须为6位数字"],"pin_mismatch":["Hai lần nhập PIN mới không khớp","两次输入的新PIN不一致"],"safari_tab":["Đang chạy trong Safari: nháp có thể bị xóa sau 7 ngày không mở","在Safari中运行：7天未打开草稿可能被清除"],"same_account":["Dùng cùng tài khoản với iPhone","与iPhone使用同一账户"],"save":["Lưu","保存"],"scan":["Quét tem QR của biểu","扫描表单二维码"],"scan_hint":["Đưa tem QR của biểu vào khung, hoặc nhập mã biểu (vd BM-CĐ-03-03)","将表单二维码标签对准框内，或输入表单编号（如BM-CĐ-03-03）"],"server_url":["Địa chỉ máy chủ (/exec)","服务器地址 (/exec)"],"server_url_bad":["Link phải có dạng https://script.google.com/macros/s/…/exec","链接格式应为 https://script.google.com/macros/s/…/exec"],"server_url_missing":["Chưa có địa chỉ máy chủ","尚未设置服务器地址"],"shared_device":["Máy dùng chung","公用设备"],"show_pin":["Hiện PIN","显示PIN"],"sync.committed":["Đã lưu máy chủ","已同步"],"sync.committed_n":["Đã lưu máy chủ: {N} mục","已同步：{N} 条"],"sync.conflict":["Xung đột, cần xử lý","冲突，需处理"],"sync.dataset_reset":["Dữ liệu đã được đặt lại, cần tải lại","数据已重置，需重新加载"],"sync.done":["Đã đồng bộ","同步完成"],"sync.failed":["Lỗi gửi","同步失败"],"sync.last":["Lần đồng bộ cuối","上次同步"],"sync.maintenance":["Bảo trì","维护中"],"sync.need_network":["Cần kết nối mạng","需要网络连接"],"sync.never":["Chưa đồng bộ","尚未同步"],"sync.offline":["Ngoại tuyến","离线"],"sync.online":["Trực tuyến","在线"],"sync.queued":["Chờ gửi","待同步"],"sync.queued_count":["{N} mục chờ gửi","待同步数据 {N} 条"],"sync.safari_tab":["Đang chạy trong Safari: nháp có thể bị xóa sau 7 ngày không mở","在Safari中运行：7天未打开草稿可能被清除"],"sys.maintenance":["Hệ thống đang bảo trì","系统维护中"],"sys.maintenance_over":["Hệ thống đã hết bảo trì","系统维护已结束"],"sys.maintenance_strip":["Hệ thống đang bảo trì — chỉ xem dữ liệu trên máy","系统维护中 — 仅可查看本机数据"],"sys.maintenance_unlock":["Hệ thống đang bảo trì (ví dụ đang Xóa sạch dữ liệu). Chỉ mở được dữ liệu đã có trên máy; bảo trì xong app tự kiểm tra lại.","系统维护中（例如正在清空数据）。仅可打开本机已有数据；维护结束后应用会自动重新检查。"],"tab.calendar":["Lịch","日程"],"tag.env_test":["THỬ","测试"],"tag.machine_translated":["dịch máy","机器翻译"],"tag.no_translation":["Chưa có bản dịch","暂无译文"],"temp_pin":["Bạn đang dùng PIN tạm, hãy đặt PIN mới","您正在使用临时PIN，请设置新PIN"],"unknown_result":["Chưa rõ kết quả, đang hỏi lại máy chủ","结果未知，正在向服务器确认"],"user_status.ACTIVE":["Đang hoạt động","正常","green"],"user_status.DISABLED":["Ngừng dùng","已停用","grey"],"user_status.MUST_CHANGE_PIN":["Phải đổi PIN","需修改PIN","amber"],"op_state.QUEUED":["Chờ gửi","待同步","amber"],"op_state.PREPARED":["Đang gửi","同步中","navy"],"op_state.SENDING":["Đang gửi","同步中","navy"],"op_state.FAILED":["Lỗi gửi","同步失败","red"],"op_state.REJECTED":["Bị từ chối","被拒","red"],"op_state.CONFLICT":["Xung đột","冲突","red"],"op_state.UNKNOWN":["Chưa rõ kết quả","结果未知","amber"],"op_state.UNKNOWN_RESULT":["Chưa rõ kết quả","结果未知","amber"],"user_status.LOCKED":["Tạm khóa","已锁定","red"],"backup_status.VERIFIED":["Đã kiểm chứng","已校验","green"],"backup_status.INCONSISTENT":["Không nhất quán","不一致","amber"],"backup_status.FAILED":["Thất bại","失败","red"],"backup_status.RUNNING":["Đang sao lưu","备份中","amber"],"op_state.BLOCKED":["Chờ mục trước","等待前项","amber"],"health.schema_version":["Phiên bản schema","架构版本"],"health.server_version":["Phiên bản máy chủ","服务器版本"],"health.dataset_epoch":["Thế hệ dữ liệu","数据批次"],"health.env":["Môi trường","环境"],"health.temp_props":["Khóa tạm còn sót trong Thuộc tính tập lệnh","脚本属性中残留的临时键"],"health.maintenance":["Bảo trì","维护模式"],"health.triggers":["Trigger đã cài","已安装触发器"],"health.trigger_minutes_24h":["Phút chạy trigger trong 24 giờ","24小时触发器运行分钟数"],"health.last_backup":["Sao lưu gần nhất","最近备份"],"health.mt_paused_until":["Tạm dừng dịch máy đến","机器翻译暂停至"],"health.login_paused_until":["Tạm dừng đăng nhập đến","登录暂停至"],"health.spreadsheet_cells":["Số ô bảng tính (giới hạn 5 triệu)","表格单元格数（上限500万）"],"brand.sub":["Hệ thống quản lý","体系管理"],"nav.scan_qr":["Quét tem QR","扫描二维码"],"nav.reports":["Báo cáo","报表"],"qr_foreign":["Mã này không phải tem biểu của app ISO (tem M&E là tem thiết bị)","此码不是ISO系统的表单标签（M&E标签为设备标签）"],"qr_unavailable":["Không tìm thấy biểu này (hoặc không thuộc bộ phận của bạn). Thử Đồng bộ ngay.","未找到该表单（或不属于您的部门）。请尝试立即同步。"],"level.1":["Tra cứu","查询"],"level.2":["Nhân viên","员工"],"level.3":["Trưởng bộ phận","部门主管"],"level.4":["Quản trị","管理员"],"account.scan_hint":["Quét tem QR dán trên sổ biểu, bìa hồ sơ để mở đúng biểu và xem lần ban hành đang hiệu lực","扫描表单册或档案封面上的二维码，打开对应表单并查看现行版本"],"account.work":["Công việc","工作"],"action.doc.upload":["Tệp / ảnh hồ sơ","记录文件/照片"],"conflict.help_run":["Bản ghi này đã được người khác sửa trên máy chủ trước khi bản của bạn gửi lên. Chọn giữ bản máy chủ (bỏ bản của bạn) hoặc gửi bản của bạn đè lên bản mới nhất.","该记录在您的版本上传前已被他人在服务器上修改。请选择保留服务器版本（放弃您的版本），或用您的版本覆盖最新版本。"],"conflict.mine_on_top":["Gửi bản của tôi lên bản mới nhất","用我的版本覆盖最新版本"],"weekday.1":["Thứ Hai","星期一"],"weekday.2":["Thứ Ba","星期二"],"weekday.3":["Thứ Tư","星期三"],"weekday.4":["Thứ Năm","星期四"],"weekday.5":["Thứ Sáu","星期五"],"weekday.6":["Thứ Bảy","星期六"],"weekday.7":["Chủ nhật","星期日"],"period.week":["Tuần {N}","第{N}周"],"period.month":["Tháng {M}","{M}月"],"home.pending_me":["Chờ bạn xử lý","待您处理"],"home.items_n":["{N} biểu","{N}个表单"],"home.none_filter":["Không có mục nào","没有项目"],"pend.count":["{N} việc chờ xử lý","{N}项待处理"],"admin.sample":["Dữ liệu mẫu","示例数据"],"adm.user.level_hint":["Tra cứu: xem · Nhân viên: nộp hồ sơ, soạn phiên bản · Trưởng bộ phận: duyệt tài liệu bộ phận, trả lại hồ sơ · Quản trị: duyệt cấp công ty, người dùng, cài đặt","查询：查看 · 员工：提交记录、编写版本 · 部门主管：审批部门文件、退回记录 · 管理员：审批公司级文件、用户、设置"],"adm.user.levels_note":["Cấp 1–3 chỉ thấy và ghi trong bộ phận của mình; tài liệu chung của Ban ISO ai cũng xem. Thư ký ISO và Quản trị thấy tất cả.","1–3级仅可查看和操作本部门；体系办通用文件所有人可见。ISO秘书和管理员可见全部。"],"adm.audit.all":["Mọi thao tác","全部操作"],"audit_grp.abnormal":["Xử lý Không đạt","不合格处理"],"audit_grp.missed":["Lý do bỏ sót","漏检原因"],"audit_grp.day":["Xác nhận ngày","日确认"],"audit_grp.library":["Thư viện hạng mục","项目库"],"audit_grp.user":["Người dùng","用户"],"audit_grp.settings":["Cấu hình","配置"],"audit_grp.report":["Logo báo cáo","报表标志"],"audit_grp.backup":["Sao lưu","备份"],"health.report_logo":["Logo trên báo cáo","报表标志"],"health.app_base_url":["Địa chỉ app","应用地址"],"sample.what":["Tạo khoảng 25 biểu giả ở 10 bộ phận, điều khoản ISO 9001 / chủ đề BRCGS mẫu và 4 tài khoản mẫu (Thư ký ISO, Trưởng QA, Nhân viên SX, Tra cứu KD) để thử app.","创建约25个示例表单（10个部门）、示例ISO 9001条款/BRCGS主题及4个示例账户（ISO秘书、质量主管、生产员工、销售查询），用于试用。"],"sample.note":["Chỉ có ở máy chủ THỬ. Không phải danh mục thật — nhập file Excel tổng để có danh mục thật.","仅测试服务器可用。非真实目录——导入Excel总表以获得真实目录。"],"sample.run":["Tạo dữ liệu mẫu","创建示例数据"],"sample.done":["Đã tạo {M} biểu, {T} điều khoản mẫu","已创建{M}个表单、{T}个示例条款"],"sample.already":["Đã có dữ liệu mẫu","示例数据已存在"],"sample.pins":["PIN tạm của tài khoản mẫu (đổi khi đăng nhập lần đầu, chỉ hiện một lần):","示例账户临时PIN（首次登录时修改，仅显示一次）："],"auth.reauth":["Nhập lại PIN để tiếp tục","请重新输入PIN以继续"],"tile.month":["Bảng tháng","月表"],"tile.pending":["Chờ xử lý","待处理"],"tile.library":["Thư viện hạng mục","项目库"],"tile.reports":["Báo cáo","报表"],"tile.drafts":["Nháp chờ gửi","待同步"],"home.week":["Tuần này","本周"],"home.none_drafts":["Không có nháp","无草稿"],"nav.catalog":["Danh mục","目录"],"nav.records":["Hồ sơ","记录"],"nav.coverage":["Phủ điều khoản","条款覆盖"],"nav.excel":["Excel","表格导入导出"],"nav.capa":["Khắc phục","纠正措施"],"nav.audits":["Đánh giá nội bộ","内部审核"],"nav.links":["Kết nối M&E / Checksheet","连接M&E/点检表"],"tile.catalog":["Danh mục","目录"],"tile.records":["Hồ sơ","记录"],"tile.coverage":["Phủ điều khoản","条款覆盖"],"tile.excel":["Excel","表格导入导出"],"tile.capa":["Khắc phục","纠正措施"],"tile.audits":["Đánh giá nội bộ","内部审核"],"tile.links":["Kết nối","连接"],"soon.tag":["Sắp có","即将推出"],"soon.what.records":["Bảng kỳ hồ sơ theo bộ phận (✓ đúng hạn, ! quá hạn, – chưa tới hạn), nộp hồ sơ bằng ảnh hoặc tệp, kể cả khi mất mạng.","按部门的记录周期表（✓按时、!逾期、–未到期），以照片或文件提交记录，离线也可提交。"],"soon.what.coverage":["Phủ điều khoản ISO 9001 và chủ đề BRCGS: số biểu, đã ban hành, in từ app, điều khoản bắt buộc còn thiếu biểu.","ISO 9001条款及BRCGS主题覆盖：表单数、已发布、系统打印、缺少表单的必须条款。"],"soon.what.reports":["Báo cáo PDF có logo + Excel: danh mục tài liệu hiện hành, tình trạng hồ sơ, phủ điều khoản, lịch sử phiên bản.","带标志的PDF及Excel报表：现行文件清单、记录状态、条款覆盖、版本历史。"],"soon.what.capa":["Sổ khắc phục, phiếu khắc phục, 8D khiếu nại, sản phẩm không phù hợp, SCAR nhà cung cấp.","纠正措施台账、纠正措施单、客诉8D、不合格品、供应商SCAR。"],"soon.what.audits":["Chương trình đánh giá nội bộ năm, kế hoạch đợt, checklist, phát hiện → phiếu khắc phục, báo cáo.","年度内审方案、审核计划、检查表、发现项→纠正措施单、报告。"],"soon.what.links":["Đọc ngày có hồ sơ từ M&E và Checksheet mỗi giờ để 33 biểu in từ app có ô ✓ mà không ai phải nộp lại.","每小时从M&E和点检表读取记录日期，33个系统打印表单自动显示✓，无需重复提交。"],"soon.when_1c":["Làm ở phiên 1c của Đợt 1","第1期1c阶段完成"],"soon.when_d2":["Làm ở Đợt 2","第2期完成"],"soon.when_d3":["Làm ở Đợt 3","第3期完成"],"soon.when_d4":["Làm ở Đợt 4","第4期完成"],"role.secretary":["Thư ký ISO","ISO秘书","navy"],"role.auditor":["Đánh giá viên","审核员","navy"],"account.depts":["Bộ phận","部门"],"account.all_depts":["Mọi bộ phận","全部部门"],"account.flags":["Vai trò thêm","附加角色"],"admin.depts":["Bộ phận và trưởng bộ phận","部门与部门主管"],"adm.user.depts_hint":["Không chọn bộ phận nào = mọi bộ phận","不选择部门 = 全部部门"],"adm.user.secretary_hint":["Quản lý danh mục toàn công ty, ban hành, thu hồi, nhập Excel, lập chương trình đánh giá","管理全公司目录、发布、收回、导入Excel、制定审核方案"],"adm.user.auditor_hint":["Ghi phát hiện đánh giá nội bộ (Đợt 4); không đánh giá bộ phận của chính mình","记录内审发现（第4期）；不审核本部门"],"adm.dept.add":["Thêm bộ phận","添加部门"],"adm.dept.code":["Mã bộ phận","部门代码"],"adm.dept.name":["Tên bộ phận","部门名称"],"adm.dept.head":["Trưởng bộ phận","部门主管"],"adm.dept.no_head":["Chưa có trưởng bộ phận","未设部门主管"],"adm.dept.head_hint":["Trưởng bộ phận duyệt tài liệu cấp bộ phận và trả lại hồ sơ nộp sai (phiên 1b, 1c)","部门主管审批部门级文件并退回错误记录（1b、1c阶段）"],"adm.dept.active":["Đang dùng","使用中"],"adm.dept.total":["{N} bộ phận","{N}个部门"],"adm.dept.note":["Tên bộ phận phải khớp cột Bộ phận của file Excel tổng (dạng \"Việt · 中文\") để nhập đúng","部门名称须与Excel总表“部门”列一致（格式“越文 · 中文”）才能正确导入"],"cat.add":["Thêm biểu / tài liệu","添加表单/文件"],"cat.all":["Tất cả","全部"],"cat.clear":["Bỏ lọc","清除筛选"],"cat.code":["Mã","编号"],"cat.name":["Tên","名称"],"cat.count":["{N} biểu","{N}个表单"],"cat.dept":["Bộ phận","部门"],"cat.group":["Nhóm","分组"],"cat.kind":["Loại","类型"],"cat.where":["Nơi làm","执行位置"],"cat.status":["Tình trạng biểu","表单状态"],"cat.priority":["Ưu tiên","优先级"],"cat.priority_short":["ƯT","优先"],"cat.prio_n":["Ưu tiên {N}","优先级{N}","red"],"cat.prio_none":["Không ghi ưu tiên","未设优先级"],"cat.special":["Khác","其他"],"cat.no_file":["Đã ban hành, chưa có tệp","已发布，无文件","amber"],"cat.no_file_short":["chưa có tệp","无文件"],"cat.filters":["Bộ lọc","筛选"],"cat.rev":["Lần ban hành","发布次数"],"cat.rev_n":["Lần {N}","第{N}版"],"cat.search_ph":["Tìm mã, tên Việt hoặc 中文","搜索编号、越文或中文名称"],"cat.scope_note":["Bạn thấy biểu của bộ phận {D} và tài liệu chung của Ban ISO","您可查看{D}部门的表单及体系办通用文件"],"cat.none_filter":["Không có biểu nào khớp bộ lọc","没有符合筛选条件的表单"],"cat.empty":["Chưa có biểu nào trong danh mục","目录中暂无表单"],"cat.empty_sec":["Danh mục còn trống — nhập file Excel tổng để bắt đầu","目录为空——请导入Excel总表开始"],"status.NONE":["Chưa có","未编写","grey"],"status.DRAFTING":["Đang soạn","编写中","amber"],"status.ISSUED":["Đã ban hành","已发布","green"],"status.NA":["Không áp dụng","不适用","grey"],"kind.FORM":["Biểu mẫu","表单","navy"],"kind.MANUAL":["Sổ tay","手册","navy"],"kind.POLICY":["Chính sách","方针","navy"],"kind.PROCEDURE":["Quy trình","程序","navy"],"kind.WI":["Hướng dẫn công việc","作业指导书","navy"],"kind.EXTERNAL":["Tài liệu bên ngoài","外来文件","grey"],"level_doc.DEPT":["Cấp bộ phận","部门级","grey"],"level_doc.COMPANY":["Cấp công ty","公司级","navy"],"where.ME":["M&E","机电App"],"where.CS":["Checksheet","点检表"],"where.ME_PART":["Một phần M&E","部分机电App"],"where.CS_PART":["Một phần Checksheet","部分点检表"],"where.CS_PROPOSED":["Đề xuất Checksheet","建议用点检表"],"where.MANUAL":["Làm tay → App ISO","手工→ISO App"],"period.DAY":["Hằng ngày","每天"],"period.WEEK":["Hằng tuần","每周"],"period.MONTH":["Hằng tháng","每月"],"period.QUARTER":["Hằng quý","每季度"],"period.HALF":["Nửa năm","每半年"],"period.YEAR":["Hằng năm","每年"],"period.EVENT":["Khi phát sinh","发生时"],"item.not_found":["Không tìm thấy biểu này (hoặc không thuộc bộ phận của bạn)","未找到该表单（或不属于您的部门）"],"item.stale":["Bản in này đã lỗi thời: tem ghi lần {R}, đang hiệu lực lần {C}","此打印件已过期：标签为第{R}版，现行为第{C}版"],"item.current":["Đang hiệu lực: lần {R}","现行版本：第{R}版"],"item.no_file_note":["Biểu ● nhập từ Excel, chưa có tệp PDF/tệp gốc. Thư ký ISO tải lên ở phiên 1b.","从Excel导入的●表单尚无PDF/源文件，ISO秘书将在1b阶段上传。"],"item.na_reason":["Lý do không áp dụng","不适用原因"],"item.info":["Thông tin","信息"],"item.purpose":["Mục đích & nội dung","用途及内容"],"item.freq":["Tần suất","频次"],"item.period":["Kỳ hồ sơ","记录周期"],"item.period_days":["Chu kỳ hồ sơ (ngày)","记录周期（天）"],"item.period_hint":["1 ngày · 7 tuần · 31 tháng · 92 quý · 183 nửa năm · 366 năm · trống = khi phát sinh","1天·7周·31月·92季·183半年·366年·空=发生时"],"item.days":["ngày","天"],"item.flow":["Lập → Duyệt","填写 → 审核"],"item.keep":["Thời gian lưu","保存期限"],"item.where_note":["In ở đâu / còn thiếu","打印位置/缺项"],"item.law":["Căn cứ pháp luật VN","越南法规依据"],"item.cls":["Phân loại","类别"],"item.owner":["Người phụ trách","负责人"],"item.note":["Ghi chú / liên quan","备注/相关"],"item.standards":["Điều khoản ISO và BRCGS","ISO条款及BRCGS"],"item.no_clause":["Chưa ghi điều khoản ISO","未填写ISO条款"],"item.brc":["BRCGS Packaging (chủ đề)","BRCGS包装（主题）"],"item.issue":["Ban hành","发布"],"item.issued_at":["Ngày ban hành","发布日期"],"item.review_due":["Hạn rà soát","评审期限"],"item.qr":["Mã QR","二维码"],"item.versions":["Phiên bản hiện hành & lịch sử","现行版本及历史"],"item.versions_soon":["Xem PDF, tải tệp gốc, soạn → duyệt → ban hành: phiên 1b","查看PDF、下载源文件、编写→审批→发布：1b阶段"],"item.records":["Hồ sơ 12 kỳ gần nhất","最近12期记录"],"item.records_soon":["Bảng ✓ / ! / – theo kỳ và nộp hồ sơ: phiên 1c","按周期的✓/!/–表及提交记录：1c阶段"],"item.related":["Biểu cùng nhóm","同组表单"],"item.submit_record":["Nộp hồ sơ","提交记录"],"item.new_version":["Soạn phiên bản mới","编写新版本"],"item.qr_label":["Tem QR","二维码标签"],"item.code_hint":["BM-<bộ phận>-xx-yy cho biểu mẫu; QT- quy trình; HD- hướng dẫn; ST- sổ tay; CS- chính sách","表单BM-<部门>-xx-yy；程序QT-；作业指导HD-；手册ST-；方针CS-"],"item.level":["Cấp duyệt","审批级别"],"item.group_auto":["Theo mã biểu","按表单编号"],"item.iso9001":["ISO 9001","ISO 9001"],"item.iso14001":["ISO 14001","ISO 14001"],"item.iso45001":["ISO 45001","ISO 45001"],"item.iso50001":["ISO 50001","ISO 50001"],"item.status_note":["Tình trạng, lần ban hành, ngày ban hành đổi qua luồng phiên bản (phiên 1b) hoặc nhập Excel","状态、发布次数、发布日期通过版本流程（1b阶段）或导入Excel修改"],"field.invalid":["Giá trị không hợp lệ","值无效"],"home.stats":["Số liệu danh mục","目录数据"],"home.stat_total":["Tổng biểu","表单总数"],"home.stat_pct":["% ban hành","发布率"],"home.stat_overdue":["Hồ sơ quá hạn","逾期记录"],"home.stat_missing":["Điều khoản bắt buộc thiếu biểu","缺少表单的必须条款"],"home.stat_missing_sub":["Điều khoản ISO 9001","ISO 9001条款"],"home.no_file_n":["{N} biểu ● chưa có tệp","{N}个●表单无文件"],"home.by_dept":["Biểu theo bộ phận","各部门表单"],"xl.export":["Xuất danh mục","导出目录"],"xl.export_note":["Đúng khuôn file Excel tổng (5 sheet, tiêu đề dòng 4, dữ liệu từ dòng 5, công thức): xuất → sửa → nhập lại được.","与Excel总表格式一致（5个工作表、第4行标题、第5行起数据、公式）：导出→修改→可重新导入。"],"xl.scope_note":["Bạn xuất các biểu thuộc bộ phận của mình","您导出本部门的表单"],"xl.export_btn":["Xuất {N} biểu","导出{N}个表单"],"xl.template":["Tải mẫu","下载模板"],"xl.format_note":["Giữ được: tên sheet, công thức, cố định ô D5, nền vàng ô nhập, danh sách chọn ○ ◐ ● ✕, tô màu theo tình trạng, cột khóa ẩn AA.","保留：工作表名称、公式、冻结D5、输入格黄色底、○◐●✕下拉列表、按状态着色、隐藏AA列。"],"xl.export_fail":["Không tạo được tệp Excel","无法生成Excel文件"],"xl.import":["Nhập lô","批量导入"],"xl.import_note":["Chọn file Excel tổng. App so theo Mã biểu: chưa có → thêm, có rồi → sửa, giống hệt → Không đổi. Xem trước rồi mới ghi; người ghi phải khác người nhập (trừ Quản trị).","选择Excel总表。按表单编号比对：无→新增，有→修改，相同→不变。先预览后写入；写入人须与导入人不同（管理员除外）。"],"xl.choose":["Chọn file Excel tổng","选择Excel总表"],"xl.batches":["Lô nhập gần đây","最近导入批次"],"xl.batch":["Lô nhập","导入批次"],"imp.reading":["Đang đọc tệp…","正在读取文件…"],"imp.read_fail":["Không đọc được tệp","无法读取文件"],"imp.template_unknown":["Tệp không đúng khuôn file Excel tổng (cần sheet \"Danh mục tổng - 总清单\", tiêu đề có cột \"Mã biểu mẫu\")","文件不符合Excel总表格式（需要“Danh mục tổng - 总清单”工作表及“Mã biểu mẫu”列）"],"imp.checking":["Máy chủ đang kiểm tra phần {A}/{B}…","服务器正在检查第{A}/{B}部分…"],"imp.preview":["Xem trước","预览"],"imp.total":["{N} dòng","{N}行"],"imp.n_add":["Thêm {N}","新增{N}"],"imp.n_update":["Sửa {N}","修改{N}"],"imp.n_same":["Không đổi {N}","不变{N}"],"imp.n_error":["Lỗi {N}","错误{N}"],"imp.n_clause":["Điều khoản đổi {N}","条款变更{N}"],"imp.no_change":["Không đổi — tệp giống hệt danh mục hiện có","不变——文件与现有目录完全一致"],"imp.row":["Dòng","行"],"imp.action":["Kết quả","结果"],"imp.detail":["Chi tiết","详情"],"imp.written":["Đã ghi","已写入"],"imp.act.ADD":["Thêm","新增"],"imp.act.UPDATE":["Sửa","修改"],"imp.act.SAME":["Không đổi","不变"],"imp.act.ERROR":["Lỗi","错误"],"imp.errors_skip":["Dòng lỗi không được ghi; sửa trong tệp rồi nhập lại (dòng đã ghi sẽ báo Không đổi).","错误行不会写入；在文件中修改后重新导入（已写入行显示不变）。"],"imp.commit":["Ghi vào danh mục","写入目录"],"imp.commit_confirm":["Ghi các dòng thêm/sửa vào danh mục? Mỗi lượt ghi tối đa 100 dòng, cần nhập PIN.","将新增/修改行写入目录？每次最多写入100行，需要输入PIN。"],"imp.committing":["Đang ghi… đã ghi {N} dòng","正在写入…已写入{N}行"],"imp.committed":["Đã ghi {N} dòng vào danh mục","已写入{N}行到目录"],"imp.row_errors":["Dòng không ghi được (biểu bị sửa sau khi xem trước)","无法写入的行（预览后表单被修改）"],"imp.need_other":["Lô nhạy cảm: cần một Thư ký ISO khác hoặc Quản trị mở Excel → Lô nhập gần đây để ghi","敏感批次：需另一位ISO秘书或管理员在Excel→最近导入批次中写入"],"imp.cancel":["Bỏ lô","放弃批次"],"imp.cancel_confirm":["Bỏ lô nhập này? Các dòng chưa ghi sẽ không được ghi.","放弃此导入批次？未写入的行将不会写入。"],"imp.cancelled":["Đã bỏ lô","已放弃批次"],"imp.none":["Chưa có lô nhập nào","暂无导入批次"],"imp.wait_commit":["Chờ bạn ghi","待您写入"],"imp.by":["Nhập bởi {U} lúc {T}","{U}于{T}导入"],"imp.committed_by":["Ghi bởi {U}","由{U}写入"],"imp.clauses_diff":["Điều khoản: thêm {A} · sửa {U} · ngừng {D}","条款：新增{A}·修改{U}·停用{D}"],"imp.rows":["Các dòng thêm, sửa, lỗi","新增、修改、错误行"],"imp.grace_diff":["Ô D4 (số ngày cho phép trễ) trong tệp là {A}, app đang dùng {B} — đổi ở Trạng thái hệ thống → record_grace_days nếu cần","文件D4（允许延迟天数）为{A}，系统当前为{B}——如需修改请在系统状态→record_grace_days"],"imp.status.STAGING":["Đang gửi","发送中","grey"],"imp.status.PREVIEWED":["Chờ ghi","待写入","amber"],"imp.status.COMMITTING":["Đang ghi dở","写入中","amber"],"imp.status.COMPLETED":["Đã ghi","已写入","green"],"imp.status.CANCELLED":["Đã bỏ","已放弃","grey"],"audit_grp.item":["Sửa biểu","修改表单"],"audit_grp.import":["Nhập Excel","导入Excel"],"audit_grp.dept":["Bộ phận","部门"],"health.items":["Biểu trong danh mục","目录中表单数"],"health.clauses":["Điều khoản / chủ đề (đang dùng)","条款/主题（使用中）"],"health.dept_heads":["Bộ phận có trưởng bộ phận","已设主管的部门"],"health.iso_secretary":["Thư ký ISO + Quản trị","ISO秘书+管理员"],"col.dept_code":["Bộ phận","部门"],"col.group_key":["Nhóm","分组"],"col.name_vi":["Tên (Việt)","名称（越）"],"col.name_zh":["Tên (Trung)","名称（中）"],"col.purpose_vi":["Mục đích (Việt)","用途（越）"],"col.purpose_zh":["Mục đích (Trung)","用途（中）"],"col.iso9001":["ISO 9001","ISO 9001"],"col.iso14001":["ISO 14001","ISO 14001"],"col.iso45001":["ISO 45001","ISO 45001"],"col.iso50001":["ISO 50001","ISO 50001"],"col.brc_topics":["BRCGS","BRCGS"],"col.law":["Căn cứ pháp luật","法规依据"],"col.cls":["Phân loại","类别"],"col.freq_vi":["Tần suất (Việt)","频次（越）"],"col.freq_zh":["Tần suất (Trung)","频次（中）"],"col.flow":["Lập → Duyệt","填写→审核"],"col.keep":["Thời gian lưu","保存期限"],"col.priority":["Ưu tiên","优先级"],"col.where":["Nơi làm","执行位置"],"col.where_note":["In ở đâu","打印位置"],"col.current_rev":["Lần ban hành","发布次数"],"col.issued_at":["Ngày ban hành","发布日期"],"col.period_days":["Chu kỳ hồ sơ","记录周期"],"col.note":["Ghi chú","备注"],"col.group_label":["Tên nhóm","分组名称"],"action.record.submit":["Nộp hồ sơ","提交记录"],"health.backup_mirror":["Bản sao ở tài khoản Google thứ hai","第二个Google账户中的备份"],"adm.mirror.title":["Tài khoản sao lưu thứ hai","第二备份账户"],"adm.mirror.what":["Ba app dùng chung một tài khoản Google: tài khoản bị khóa thì mất cả bản sao lưu. Máy chủ chia sẻ (chỉ xem) thư mục Sao lưu và Dữ liệu cho tài khoản thứ hai; script SaoLuuPhu trong tài khoản đó chép về Drive của nó mỗi ngày.","三个应用共用一个Google账户：账户被锁则备份也会丢失。服务器将备份及数据文件夹（仅查看）共享给第二个账户；该账户中的SaoLuuPhu脚本每天复制到其云端硬盘。"],"adm.mirror.email":["Email tài khoản thứ hai","第二账户邮箱"],"adm.mirror.folders":["Thư mục đã chia sẻ","已共享文件夹"],"adm.mirror.checked":["Kiểm chia sẻ lúc","共享检查时间"],"adm.mirror.save":["Lưu và chia sẻ","保存并共享"],"adm.mirror.off":["Ngừng chia sẻ","停止共享"],"adm.mirror.off_confirm":["Bỏ chia sẻ thư mục Sao lưu và Dữ liệu cho tài khoản thứ hai? Bản đã chép bên đó vẫn giữ.","取消向第二账户共享备份及数据文件夹？已复制的副本仍保留。"],"adm.mirror.next":["Sau khi lưu: đăng nhập tài khoản thứ hai, cài script SaoLuuPhu một lần (Hướng dẫn triển khai, Phần I). Lần chia sẻ đầu Google gửi thư báo tới tài khoản đó.","保存后：登录第二账户，安装一次SaoLuuPhu脚本（部署指南第I部分）。首次共享时Google会向该账户发送通知邮件。"],"adm.mirror.saved":["Đã chia sẻ cho tài khoản thứ hai","已共享给第二账户"],"adm.mirror.stopped":["Đã ngừng chia sẻ","已停止共享"],"adm.mirror.failed":["Lưu email nhưng chia sẻ chưa được — xem lý do trên màn","已保存邮箱但共享失败——请查看原因"],"adm.mirror.bad_email":["Email chưa đúng dạng","邮箱格式不正确"],"mirror_status.OK":["Đang chia sẻ","共享中","green"],"mirror_status.FAILED":["Chia sẻ lỗi","共享失败","red"],"mirror_status.OFF":["Chưa đặt","未设置","grey"],"nav.versions":["Phiên bản","版本"],"file.need_pdf":["Chọn tệp PDF (.pdf)","请选择PDF文件（.pdf）"],"file.need_source":["Tệp gốc phải là Excel hoặc Word (.xlsx, .docx, .xls, .doc)","源文件须为Excel或Word（.xlsx、.docx、.xls、.doc）"],"file.too_big":["Tệp quá 10 MB","文件超过10 MB"],"file.too_big_mobile":["Trên điện thoại tối đa 5 MB — tải tệp lớn từ máy tính","手机上传最多5 MB，大文件请用电脑上传"],"file.empty":["Tệp rỗng","文件为空"],"file.view_pdf":["Xem PDF","查看PDF"],"file.get_source":["Tải tệp gốc","下载源文件"],"file.open_save":["Mở / Lưu","打开/保存"],"file.ready_tap":["Đã tải xong — chạm Mở / Lưu","已下载，请点打开/保存"],"cat.review_soon":["Sắp / quá hạn rà soát","即将/已过评审期限"],"home.pend_review":["{N} phiên bản chờ bạn duyệt","{N}个版本待您审批"],"home.pend_issue":["{N} phiên bản chờ ban hành","{N}个版本待发布"],"home.pend_returned":["{N} phiên bản bị trả lại","{N}个版本被退回"],"home.pend_drafts":["{N} bản nháp của bạn","您的{N}份草稿"],"home.pend_review_due":["{N} tài liệu sắp/quá hạn rà soát","{N}份文件即将/已过评审期限"],"item.review_over":["quá hạn {N} ngày","逾期{N}天"],"item.review_in":["còn {N} ngày","剩{N}天"],"item.no_file_sec":["Biểu ● nhập từ Excel, chưa có tệp. Bấm Gắn tệp bản hiện hành để tải PDF (và tệp gốc) của lần đang dùng.","从Excel导入的●表单尚无文件。请点“附加现行版本文件”上传当前版本的PDF（及源文件）。"],"item.reviewed":["Rà soát gần nhất","最近评审"],"item.manage":["Quản lý biểu (Thư ký ISO)","表单管理（ISO秘书）"],"item.review_btn":["Đã rà soát, giữ nguyên","已评审，保持不变"],"item.review_note":["Tài liệu đã được rà soát định kỳ và vẫn phù hợp: hạn rà soát mới = hôm nay + chu kỳ rà soát. Cần sửa nội dung thì soạn phiên bản mới.","文件已定期评审且仍适用：新评审期限=今天+评审周期。需修改内容请编写新版本。"],"item.review_done":["Đã gia hạn rà soát","已延长评审期限"],"item.na_btn":["Đặt Không áp dụng (✕)","设为不适用（✕）"],"item.unna_btn":["Dùng lại biểu","恢复使用"],"item.na_open":["Biểu đang có phiên bản soạn/chờ duyệt — hủy hoặc ban hành bản đó trước khi đặt ✕","该表单有编写中/待审批的版本，请先作废或发布后再设为✕"],"item.manage_note":["Đặt ✕: ngừng dùng biểu, hồ sơ cũ giữ nguyên. Các thao tác này hỏi lại PIN.","设为✕：停止使用表单，旧记录保留。这些操作需重新输入PIN。"],"item.na_note":["Biểu thôi dùng (vd gộp vào biểu khác). Hồ sơ đã có giữ nguyên; kỳ sau không tính hồ sơ.","停止使用该表单（如合并到其他表单）。已有记录保留；之后不再计算记录。"],"item.na_done":["Đã đặt Không áp dụng","已设为不适用"],"item.unna_done":["Biểu đã dùng lại","表单已恢复使用"],"vstate.DRAFT":["Nháp","草稿","grey"],"vstate.IN_REVIEW":["Chờ duyệt","待审批","amber"],"vstate.APPROVED":["Đã duyệt, chờ ban hành","已审批待发布","navy"],"vstate.ISSUED":["Đang hiệu lực","现行有效","green"],"vstate.SUPERSEDED":["Lỗi thời","已作废（被替代）","grey"],"vstate.CANCELLED":["Đã hủy","已取消","red"],"vtype.ATTACH":["Gắn tệp bản hiện hành","附加现行版本文件","amber"],"vtype.REVISION":["Lần ban hành mới","新发布版本","navy"],"ver.tab.review":["Chờ tôi duyệt","待我审批"],"ver.tab.issue":["Chờ ban hành","待发布"],"ver.tab.returned":["Bị trả lại","被退回"],"ver.tab.drafts":["Nháp của tôi","我的草稿"],"ver.tab.open":["Tất cả đang xử lý","全部处理中"],"ver.title":["Phiên bản","版本"],"ver.not_found":["Không tìm thấy phiên bản này","未找到该版本"],"ver.rev_n":["Lần {N}","第{N}版"],"ver.current_n":["Đang hiệu lực: lần {N}","现行版本：第{N}版"],"ver.returned":["bị trả lại","被退回"],"ver.none":["Không có phiên bản nào trong mục này","此项没有版本"],"ver.how":["Soạn phiên bản mới ở Chi tiết biểu → Soạn phiên bản mới. Luồng: Nháp → Gửi duyệt → Duyệt → Ban hành; bản cũ tự thành lỗi thời.","在表单详情→编写新版本中编写。流程：草稿→提交审批→审批→发布；旧版本自动作废。"],"ver.pdf":["Tệp PDF bản ban hành","发布版PDF文件"],"ver.source":["Tệp gốc (Excel / Word)","源文件（Excel/Word）"],"ver.pdf_hint":["Bắt buộc. Bản sẽ in và phát cho bộ phận. Tối đa 10 MB (điện thoại 5 MB).","必填。用于打印并分发给部门。最大10 MB（手机5 MB）。"],"ver.source_hint":["Không bắt buộc. Để lần sau sửa tiếp (.xlsx, .docx).","选填。便于下次修改（.xlsx、.docx）。"],"ver.pdf_required":["Chọn tệp PDF","请选择PDF文件"],"ver.attach_title":["Gắn tệp bản hiện hành","附加现行版本文件"],"ver.attach_btn":["Gắn tệp bản hiện hành","附加现行版本文件"],"ver.attach_note":["Biểu đã ban hành lần {N} trên giấy (nhập từ Excel). Tải PDF của đúng lần {N} — không qua duyệt lại, không đổi lần và ngày ban hành.","该表单已于纸质发布第{N}版（从Excel导入）。请上传第{N}版的PDF——无需重新审批，不改变发布次数和日期。"],"ver.attach_how":["Bấm Lưu và ban hành → nhập PIN. Cờ \"chưa có tệp\" tắt, mọi người xem được PDF.","点保存并发布→输入PIN。“无文件”标记消除，所有人可查看PDF。"],"ver.new_note":["Phiên bản mới sẽ là lần {N}. Ban hành xong, bản đang hiệu lực (nếu có) tự thành lỗi thời.","新版本为第{N}版。发布后，现行版本（如有）自动作废。"],"ver.flow_note":["Gửi duyệt → trưởng bộ phận duyệt (tài liệu cấp công ty: Quản trị) → Thư ký ISO ban hành. Duyệt, trả lại, ban hành hỏi lại PIN.","提交审批→部门主管审批（公司级文件：管理员）→ISO秘书发布。审批、退回、发布需重新输入PIN。"],"ver.summary":["Tóm tắt thay đổi","变更摘要"],"ver.effective":["Ngày hiệu lực","生效日期"],"ver.save_draft":["Lưu nháp","保存草稿"],"ver.save_submit":["Lưu và gửi duyệt","保存并提交审批"],"ver.save_issue":["Lưu và ban hành","保存并发布"],"ver.uploading":["Đang tải tệp lên…","正在上传文件…"],"ver.uploading_n":["Đang tải tệp lên ({S})…","正在上传文件（{S}）…"],"ver.uploaded":["Đã tải tệp lên","文件已上传"],"ver.open_exists":["Biểu đang có phiên bản lần {N} chưa xong — mở bản đó để làm tiếp","该表单有第{N}版尚未完成，请打开继续处理"],"ver.open_it":["Mở phiên bản đang soạn","打开编写中的版本"],"ver.open":["Đang xử lý","处理中"],"ver.item_na":["Biểu đang Không áp dụng (✕) — dùng lại biểu trước","该表单为不适用（✕），请先恢复使用"],"ver.details":["Chi tiết phiên bản","版本详情"],"ver.no_current":["Chưa có phiên bản ban hành trong app","应用中尚无已发布版本"],"ver.no_current_file":["Đã ban hành trên giấy, chưa có tệp trong app","已纸质发布，应用中尚无文件"],"ver.history_n":["Lịch sử phiên bản ({N})","版本历史（{N}）"],"ver.files":["Tệp","文件"],"ver.no_pdf":["Chưa có PDF","尚无PDF"],"ver.upload_pdf":["Tải PDF lên","上传PDF"],"ver.replace_pdf":["Thay PDF","替换PDF"],"ver.upload_source":["Tải tệp gốc lên","上传源文件"],"ver.replace_source":["Thay tệp gốc","替换源文件"],"ver.files_hint":["Tệp lưu riêng tư trên Drive của máy chủ ISO; chỉ người có quyền tải về qua app.","文件私密保存在ISO服务器云端硬盘；仅有权限者可通过应用下载。"],"ver.info":["Thông tin phiên bản","版本信息"],"ver.author":["Người soạn","编写人"],"ver.submitted":["Gửi duyệt","提交审批"],"ver.approved":["Duyệt","审批"],"ver.issued":["Ban hành","发布"],"ver.superseded":["Thành lỗi thời","作废时间"],"ver.cancelled":["Hủy","取消"],"ver.edit":["Sửa nháp","修改草稿"],"ver.submit":["Gửi duyệt","提交审批"],"ver.approve":["Duyệt","审批通过"],"ver.return":["Trả lại","退回"],"ver.issue":["Ban hành","发布"],"ver.cancel":["Hủy phiên bản","取消版本"],"ver.wait_head":["Đang chờ trưởng bộ phận (hoặc Quản trị) duyệt","等待部门主管（或管理员）审批"],"ver.wait_admin":["Tài liệu cấp công ty: chờ Quản trị (cấp 4) duyệt","公司级文件：等待管理员（4级）审批"],"ver.wait_issue":["Đã duyệt — chờ Thư ký ISO ban hành","已审批，等待ISO秘书发布"],"ver.need_pdf":["Tải PDF lên rồi mới gửi duyệt được","上传PDF后才能提交审批"],"ver.returned_by":["Bị trả lại bởi {U} lúc {D}","{U}于{D}退回"],"ver.superseded_note":["Bản này đã lỗi thời — có lần ban hành mới hơn","此版本已作废，已有更新的发布版本"],"ver.cancelled_note":["Phiên bản đã hủy","版本已取消"],"ver.approve_note":["Ghi chú khi duyệt (không bắt buộc)","审批备注（选填）"],"ver.self_note":["Bạn là người soạn bản này — Quản trị được tự duyệt.","您是此版本的编写人——管理员可自行审批。"],"ver.approved_ok":["Đã duyệt","已审批"],"ver.returned_ok":["Đã trả lại người soạn","已退回编写人"],"ver.submitted_ok":["Đã gửi duyệt","已提交审批"],"ver.issued_ok":["Đã ban hành","已发布"],"ver.cancelled_ok":["Đã hủy phiên bản","已取消版本"],"ver.issue_confirm":["Ban hành lần {N}, ngày ban hành {D}. Bản đang hiệu lực (nếu có) sẽ thành lỗi thời; hạn rà soát tính lại từ hôm nay.","发布第{N}版，发布日期{D}。现行版本（如有）将作废；评审期限从今天重新计算。"],"ver.issue_attach_confirm":["Gắn PDF này cho lần {N} đang hiệu lực. Không đổi lần và ngày ban hành.","将此PDF附加到现行第{N}版。不改变发布次数和日期。"],"ver.issue_old":["Lần {C} đang hiệu lực sẽ thành lỗi thời.","现行第{C}版将作废。"],"ver.cancel_note":["Hủy bản đang soạn. Tệp đã tải vẫn giữ trong lịch sử.","取消编写中的版本。已上传文件保留在历史中。"],"audit_grp.version":["Phiên bản","版本"],"audit_grp.doc":["Tệp tài liệu","文件"],"health.versions":["Phiên bản","版本"],"health.file_missing":["Biểu ● chưa có tệp","●表单无文件"],"health.review_overdue":["Tài liệu quá hạn rà soát","逾期评审文件"],"btn.delete":["Xóa","删除"],"health.records":["Hồ sơ","记录"],"health.coverage":["Phủ điều khoản","条款覆盖"],"action.record.return":["Trả lại hồ sơ","退回记录"],"file.view_photo":["Xem ảnh","查看照片"],"file.get_file":["Tải tệp","下载文件"],"file.need_record":["Chỉ nhận ảnh, PDF, Excel, Word","仅支持照片、PDF、Excel、Word"],"home.pend_rec_returned":["{N} hồ sơ bị trả lại","{N}份记录被退回"],"home.stat_overdue_sub":["biểu có kỳ gần nhất quá hạn","最近一期逾期的表单"],"item.scan_na":["Biểu này đã ngừng dùng (✕) — không dùng bản in này nữa","该表单已停用（✕）——请勿再使用此打印件"],"item.scan_none":["Tem ghi lần {R} nhưng biểu chưa có bản ban hành trong app","标签为第{R}版，但该表单在系统中尚无发布版本"],"cell.OK":["Đúng hạn","按时","green"],"cell.PEND":["Chờ gửi","待发送","amber"],"cell.LATE":["Quá hạn","逾期","red"],"cell.DUE":["Chưa tới hạn","未到期","grey"],"cell.NA":["Không tính","不计","grey"],"rec.st.SUBMITTED":["Đã ghi nhận","已记录","green"],"rec.st.RETURNED":["Bị trả lại","被退回","red"],"rec.st.VOID":["Đã hủy","已作废","grey"],"rec.st.QUEUED":["Chờ gửi","待发送","amber"],"rec.st.REJECTED":["Bị từ chối","被拒绝","red"],"rec.reason.NOT_ISSUED":["Biểu chưa ban hành (○ ◐) hoặc không áp dụng (✕): chưa tính đúng hạn / quá hạn","表单尚未发布（○ ◐）或不适用（✕）：不计算按时/逾期"],"rec.reason.FROM_APP":["Biểu in từ app M&E / Checksheet: app đó chưa nối với ISO (Tài khoản → Quản trị → Kết nối M&E / Checksheet), chưa tính đúng hạn / quá hạn","由机电/点检表App打印的表单：该App尚未与ISO连接（账户→管理→连接M&E/点检表），暂不计算按时/逾期"],"rec.reason.NO_START":["Chưa có ngày bắt đầu tính hồ sơ (Trạng thái hệ thống → records_start_date)","尚无记录开始计算日期（系统状态→records_start_date）"],"rec.reason_short.NOT_ISSUED":["chưa ban hành, chưa tính hạn","未发布，不计期限"],"rec.reason_short.FROM_APP":["in từ app, chưa nối","系统打印，未连接"],"rec.reason_short.NO_START":["chưa có ngày bắt đầu tính","无开始计算日期"],"rec.no_record.ITEM_NO_RECORD":["Biểu chưa có (○) hoặc không áp dụng (✕): không nộp hồ sơ","表单尚未建立（○）或不适用（✕）：不能提交记录"],"rec.no_record.RECORD_FROM_APP":["Biểu in từ app M&E / Checksheet: ngày có hồ sơ lấy từ app đó, không nộp ở đây","由机电/点检表App打印的表单：记录日期取自该App，无需在此提交"],"rec.title":["Hồ sơ đã nộp","已提交记录"],"rec.no_access":["Cấp Tra cứu không xem hồ sơ và bảng kỳ. Cần nộp hồ sơ thì nhờ Quản trị nâng cấp tài khoản.","查询级别不能查看记录及周期表。如需提交记录，请管理员提升账户级别。"],"rec.no_access_short":["Cấp Tra cứu không xem","查询级别不可查看"],"rec.how":["Mỗi biểu một dòng, mỗi ô một kỳ (cũ → mới). ! = kỳ đã kết thúc quá {N} ngày mà chưa có hồ sơ. Bấm ô để xem hồ sơ hoặc nộp cho kỳ đó.","每个表单一行，每格一期（旧→新）。! = 该期结束超过{N}天仍无记录。点击格子查看记录或提交该期记录。"],"rec.f_late":["Kỳ gần nhất quá hạn","最近一期逾期"],"rec.f_any":["Có ô quá hạn","有逾期格"],"rec.f_returned":["Bị trả lại","被退回"],"rec.returned_hint":["Hồ sơ của bạn bị trả lại: xem lý do rồi bấm Nộp lại (chụp lại, đúng biểu, đúng kỳ).","您的记录被退回：查看原因后点击重新提交（重新拍照、正确表单、正确周期）。"],"rec.late_n":["{N} kỳ quá hạn","{N}期逾期"],"rec.empty_counted":["Chưa có biểu ● đang hiệu lực (hoặc biểu đã có hồ sơ) trong phạm vi này. Bảng kỳ chỉ tính biểu đã ban hành: Danh mục → Soạn phiên bản → Ban hành, hoặc nhập Excel có cột T = ●.","此范围内尚无现行●表单（或已有记录的表单）。周期表只计算已发布表单：目录→编写版本→发布，或导入T列=●的Excel。"],"rec.from_app_n":["{N} biểu in từ M&E / Checksheet chưa tính vì app đó chưa nối với ISO.","{N}个由机电/点检表打印的表单暂不计算，因该App尚未与ISO连接。"],"rec.event_note":["Ghi khi phát sinh: không tính quá hạn","发生时记录：不计逾期"],"rec.event_last":["Gần nhất {D} · {N} lần","最近 {D} · 共{N}次"],"rec.event_none":["Chưa nộp lần nào","尚未提交"],"rec.cell_none":["Kỳ này chưa có hồ sơ","该期尚无记录"],"rec.before_start":["Kỳ trước ngày bắt đầu tính hồ sơ ({D}): không tính","早于记录开始计算日期（{D}）的周期：不计"],"rec.submit_period":["Nộp hồ sơ kỳ này","提交该期记录"],"rec.pick_hint":["Quét tem QR dán trên sổ biểu, hoặc tìm theo mã, tên Việt / Trung. Biểu quá hạn ở đầu danh sách.","扫描表单册上的二维码，或按编号、越文/中文名称搜索。逾期表单排在前面。"],"rec.pick_none":["Không có biểu nào bạn nộp được (biểu ● hoặc ◐ trong bộ phận của bạn, không in từ M&E / Checksheet)","没有您可提交的表单（本部门的●或◐表单，且非机电/点检表打印）"],"rec.last_short":["nộp gần nhất {D}","最近提交 {D}"],"rec.period":["Kỳ hồ sơ","记录周期"],"rec.mode_one":["Một kỳ","单期"],"rec.mode_day":["Một ngày","单日"],"rec.mode_range":["Khoảng ngày","日期范围"],"rec.date":["Ngày","日期"],"rec.from":["Từ ngày","开始日期"],"rec.to":["Đến ngày","结束日期"],"rec.event_date":["Ngày phát sinh","发生日期"],"rec.range_hint":["Nộp cả quyển sổ (vd sổ tháng 10): chọn ngày đầu và ngày cuối của các trang chụp — mọi kỳ trong khoảng đó là có hồ sơ.","提交整本记录（如10月记录册）：选择所拍页面的首日和末日——该范围内各期均视为有记录。"],"rec.covers":["Phủ kỳ","覆盖周期"],"rec.covers_n":["Phủ {N} kỳ","覆盖{N}期"],"rec.already_n":["{N} kỳ đã có hồ sơ","{N}期已有记录"],"rec.range_invalid":["Ngày cuối phải từ ngày đầu trở đi","结束日期须不早于开始日期"],"rec.range_long":["Mỗi lần nộp tối đa 400 ngày","每次提交最多400天"],"rec.date_future":["Không nộp cho kỳ quá 31 ngày sau hôm nay","不能提交今天31天之后的周期"],"rec.pages":["Ảnh / tệp hồ sơ","记录照片/文件"],"rec.take_photo":["Chụp ảnh","拍照"],"rec.pick_files":["Chọn ảnh / tệp","选择照片/文件"],"rec.pages_hint":["Chụp từng trang (app thu nhỏ còn khoảng 1600 px, bỏ vị trí GPS) hoặc chọn tệp PDF, Excel, Word. Tối đa 30.","逐页拍照（应用自动缩小至约1600像素并去除GPS位置）或选择PDF、Excel、Word文件。最多30个。"],"rec.page_n":["Trang {N}","第{N}页"],"rec.need_page":["Cần ít nhất 1 ảnh hoặc tệp","至少需要1张照片或1个文件"],"rec.too_many":["Tối đa 30 ảnh / tệp mỗi hồ sơ","每份记录最多30张照片/文件"],"rec.processing":["Đang xử lý ảnh {N}/{T}…","正在处理照片 {N}/{T}…"],"rec.photo_failed":["Không đọc được ảnh {F}","无法读取照片 {F}"],"rec.note":["Ghi chú","备注"],"rec.save":["Lưu hồ sơ","保存记录"],"rec.save_note":["Hồ sơ ghi nhận ngay, không chờ duyệt. Ảnh lưu trên máy trước rồi gửi lần lượt.","记录立即生效，无需审批。照片先保存在本机，再依次上传。"],"rec.offline_note":["Đang mất mạng: vẫn lưu được — hồ sơ và ảnh nằm trên máy, có mạng app tự gửi.","当前离线：仍可保存——记录和照片保存在本机，联网后自动发送。"],"rec.saved_queued":["Đã lưu trên máy — có mạng sẽ tự gửi","已保存在本机——联网后自动发送"],"rec.saved_sending":["Đã lưu, đang gửi lên máy chủ…","已保存，正在上传到服务器…"],"rec.no_code":["Chờ gửi (mã cấp khi lên máy chủ)","待发送（上传后分配编号）"],"rec.queued_note":["Hồ sơ đang nằm trên máy này, chưa lên máy chủ — có mạng app tự gửi.","记录仍在本机，尚未上传服务器——联网后自动发送。"],"rec.rejected_note":["Máy chủ không nhận hồ sơ này:","服务器未接收此记录："],"rec.info":["Thông tin hồ sơ","记录信息"],"rec.submitted":["Người nộp","提交人"],"rec.files_short":["{N} tệp","{N}个文件"],"rec.files_wait":["{N} tệp còn chờ gửi từ máy này","本机还有{N}个文件待发送"],"rec.files_missing":["Mới có {N}/{T} tệp trên máy chủ — tệp còn lại vẫn ở máy người nộp (mở app khi có mạng để gửi)","服务器上仅有{N}/{T}个文件——其余文件仍在提交人设备上（联网打开应用即可发送）"],"rec.no_files":["Chưa có ảnh / tệp","暂无照片/文件"],"rec.add_files":["Thêm ảnh / tệp","添加照片/文件"],"rec.added":["Đã thêm vào hàng chờ gửi","已加入待发送队列"],"rec.returned_by":["Bị trả lại bởi {U} lúc {D}","由{U}于{D}退回"],"rec.return":["Trả lại","退回"],"rec.return_note":["Trả lại hồ sơ nộp sai (sai biểu, sai kỳ, ảnh mờ…): kỳ đó tính lại như chưa có, người nộp thấy ở Chờ bạn xử lý. Hỏi lại PIN.","退回错误提交的记录（表单错误、周期错误、照片模糊等）：该期重新视为无记录，提交人在待处理中可见。需重新输入PIN。"],"rec.returned_ok":["Đã trả lại hồ sơ","已退回记录"],"rec.resubmit":["Nộp lại","重新提交"],"rec.to_item":["Xem biểu","查看表单"],"rec.not_found":["Không tìm thấy hồ sơ (có thể chưa đồng bộ — thử Đồng bộ ngay)","未找到记录（可能尚未同步——请尝试立即同步）"],"rec.recent":["Hồ sơ gần đây","最近记录"],"rec.start":["Bắt đầu tính từ {D}","自{D}开始计算"],"rec.grace":["cho phép trễ {N} ngày","允许延迟{N}天"],"rec.overdue_now":["kỳ {K} quá hạn","{K}期逾期"],"rec.server_old":["Máy chủ chưa lên bản có Hồ sơ (1c): Quản trị dán Code.gs mới → Triển khai → Phiên bản mới, rồi mở lại app.","服务器尚未升级到含记录功能的版本（1c）：管理员粘贴新的Code.gs→部署→新版本，然后重新打开应用。"],"cov.no_access":["Phủ điều khoản dành cho Nhân viên trở lên (cấp 2+) và Thư ký ISO.","条款覆盖仅供员工（2级及以上）及体系秘书查看。"],"cov.clauses_n":["{N} điều khoản","{N}个条款"],"cov.topics_n":["{N} chủ đề","{N}个主题"],"cov.state":["Trạng thái","状态"],"cov.st.MISSING":["Thiếu biểu – bắt buộc","缺表单（强制）","red"],"cov.st.NONE":["Chưa có biểu","无表单","amber"],"cov.st.NOT_ISSUED":["Có biểu, chưa ban hành","有表单未发布","navy"],"cov.st.OK":["Đã có","已覆盖","green"],"cov.all_company":["Toàn công ty","全公司"],"cov.scope_note":["Chỉ đếm biểu của bộ phận {D} và tài liệu chung — số toàn công ty do Thư ký ISO xem.","仅统计{D}部门的表单及公共文件——全公司数据由体系秘书查看。"],"cov.iso_sum":["{N} điều khoản, {M} điều khoản bắt buộc lưu hồ sơ; {X} điều khoản bắt buộc chưa có biểu.","共{N}个条款，其中{M}个强制保存记录；{X}个强制条款缺表单。"],"cov.brc_sum":["{N} chủ đề; {X} chủ đề chưa có biểu.","共{N}个主题；{X}个主题无表单。"],"cov.empty":["Chưa có danh sách điều khoản — nhập file Excel tổng (sheet Phủ ISO 9001, Phủ BRCGS).","尚无条款清单——请导入总表Excel（ISO 9001覆盖、BRCGS覆盖工作表）。"],"cov.none_filter":["Không có điều khoản đang dùng","没有使用中的条款"],"cov.clause":["Điều khoản","条款"],"cov.topic":["Chủ đề","主题"],"cov.content":["Nội dung","内容"],"cov.mandatory_short":["Bắt buộc lưu hồ sơ","强制保存记录"],"cov.items":["Số biểu","表单数"],"cov.issued":["Đã ban hành","已发布"],"cov.app":["In từ app","由App打印"],"cov.yes":["Có","是"],"cov.issued_n":["{N} đã ban hành","{N}个已发布"],"cov.app_n":["{N} in từ app","{N}个由App打印"],"cov.mandatory":["bắt buộc lưu hồ sơ","强制保存记录"],"cov.none_items":["Chưa có biểu nào ghi điều khoản / chủ đề này.","尚无表单注明此条款/主题。"],"cov.none_mandatory":["Điều khoản bắt buộc lưu hồ sơ mà chưa có biểu — cần soạn biểu trước đánh giá chứng nhận.","该条款要求保存记录但尚无表单——需在认证审核前编制表单。"],"cov.open_catalog":["Mở trong Danh mục","在目录中打开"],"cov.how_iso":["Đếm như trang Phủ ISO 9001 của file Excel tổng: biểu thuộc điều khoản khi một mã ở cột ISO 9001 bắt đầu bằng số điều khoản (9.2 gồm cả 9.2.2). Đã ban hành = ●; In từ app = nơi làm M&E hoặc Checksheet (không tính Một phần, Đề xuất). Bấm một dòng để xem các biểu.","与总表Excel的“ISO 9001条款覆盖”页计算方式相同：表单ISO 9001列中的编号以该条款号开头即计入（9.2含9.2.2）。已发布＝●；由App打印＝完成方式为机电App或点检表（不含部分、建议）。点击一行查看表单。"],"cov.how_brc":["Đếm như trang Phủ BRCGS của file Excel tổng: biểu thuộc chủ đề khi cột BRCGS Packaging có chứa khóa chủ đề. Đã ban hành = ●; In từ app = nơi làm M&E hoặc Checksheet. Bấm một dòng để xem các biểu.","与总表Excel的“BRCGS覆盖”页计算方式相同：表单BRCGS Packaging列含该主题关键字即计入。已发布＝●；由App打印＝完成方式为机电App或点检表。点击一行查看表单。"],"cat.f_iso":["ISO 9001: {K}","ISO 9001：{K}"],"cat.f_brc":["BRCGS: {K}","BRCGS：{K}"],"home.pend_rec_late":["{N} biểu quá hạn hồ sơ — nộp ngay","{N}个表单记录逾期——请立即提交"],"home.pend_send_problems":["{N} thao tác gửi không được","{N}项操作发送失败"],"home.week_title":["Hồ sơ đến hạn trong tuần","本周到期记录"],"home.week_prev":["Tuần trước","上周"],"home.week_next":["Tuần sau","下周"],"home.today":["Hôm nay","今天"],"home.week_deadline":["hạn chót {D}","截止{D}"],"home.week_empty":["Không có hồ sơ đến hạn trong tuần (chỉ tính biểu ● làm tay có chu kỳ).","本周无到期记录（仅计算有周期的●手工表单）。"],"home.week_note":["Mỗi kỳ hiện ở ngày kết thúc kỳ; quá {N} ngày sau đó chưa nộp là quá hạn (!). Bấm ô hoặc dòng để xem hồ sơ của kỳ hoặc nộp.","各期显示在期末日；期末后超过{N}天未提交即逾期（!）。点击格子或行查看该期记录或提交。"],"wd.1":["T2","一"],"wd.2":["T3","二"],"wd.3":["T4","三"],"wd.4":["T5","四"],"wd.5":["T6","五"],"wd.6":["T7","六"],"wd.7":["CN","日"],"rec.before_start_app":["Trước {D}: không còn giữ ngày từ app kia, không tính","{D}之前：已不保留该App的日期，不计算"],"ev.check_in.ME":["Ngày có hồ sơ lấy từ app M&E (cập nhật mỗi giờ): kiểm phiếu trong M&E, không nộp ở đây.","记录日期取自机电App（每小时更新）：请在机电App中检查，无需在此提交。"],"ev.check_in.CS":["Ngày có hồ sơ lấy từ app Checksheet (cập nhật mỗi giờ): kiểm lượt kiểm trong Checksheet, không nộp ở đây.","记录日期取自点检表App（每小时更新）：请在点检表中检查，无需在此提交。"],"ev.src_note.ME":["Ô ✓ gồm cả ngày có hồ sơ trong app M&E (cập nhật mỗi giờ).","✓格包含机电App中的记录日期（每小时更新）。"],"ev.src_note.CS":["Ô ✓ gồm cả ngày có hồ sơ trong app Checksheet (cập nhật mỗi giờ).","✓格包含点检表App中的记录日期（每小时更新）。"],"ev.recent":["Ngày có hồ sơ từ app M&E / Checksheet","来自机电/点检表App的记录日期"],"health.link_me":["Kết nối M&E (ngày có hồ sơ)","M&E连接（记录日期）"],"health.link_cs":["Kết nối Checksheet (ngày có hồ sơ)","点检表连接（记录日期）"],"link.what":["App ISO hỏi app M&E và Checksheet mỗi giờ \"mã biểu nào có hồ sơ vào ngày nào\" để biểu in từ app có ô ✓ mà không ai phải nộp lại. Chỉ đọc, không ghi gì sang hai app đó.","ISO App每小时向机电和点检表App查询\"哪个表单编号在哪天有记录\"，使系统打印的表单自动显示✓，无需重复提交。只读取，不向这两个App写入任何内容。"],"link.what2":["Mỗi lần lấy {N} ngày gần nhất. Biểu nơi làm M&E / Checksheet chỉ tính đúng hạn / quá hạn khi app đó đã nối.","每次获取最近{N}天。执行位置为机电/点检表的表单仅在该App连接后才计算按时/逾期。"],"link.no_trigger":["Chưa có trigger mỗi giờ (syncEvidenceHourly): mở trình soạn Apps Script của ISO → chạy installTriggers.","尚无每小时触发器（syncEvidenceHourly）：打开ISO的Apps Script编辑器→运行installTriggers。"],"link.sync_all":["Cập nhật cả hai app","两个App都更新"],"link.sync_now":["Cập nhật ngay","立即更新"],"link.src.ME":["App M&E","机电App"],"link.src.CS":["App Checksheet","点检表App"],"link.src_short.ME":["M&E","机电App"],"link.src_short.CS":["Checksheet","点检表"],"link.st.ON":["Đã nối","已连接","green"],"link.st.OFF":["Chưa nối","未连接","grey"],"link.st.FAILED":["Lỗi kết nối","连接错误","red"],"link.last.OK":["được","成功","green"],"link.last.FAILED":["lỗi","失败","red"],"link.exec_url":["Link /exec của app","该App的 /exec 链接"],"link.key":["Mã kết nối (FEED_KEY_ISO)","连接码（FEED_KEY_ISO）"],"link.key_hint.ME":["Lấy ở app M&E: mở trình soạn Apps Script của máy chủ M&E → chạy adminCreateFeedKeyIso → chép mã trong Nhật ký thực thi. Link /exec là link M&E đang dùng.","在机电App获取：打开机电服务器的Apps Script编辑器→运行adminCreateFeedKeyIso→复制执行日志中的代码。/exec链接为机电App正在使用的链接。"],"link.key_hint.CS":["Lấy ở app Checksheet: mở trình soạn Apps Script của máy chủ Checksheet → chạy adminCreateFeedKeyIso → chép mã trong Nhật ký thực thi. Link /exec là link Checksheet đang dùng.","在点检表App获取：打开点检表服务器的Apps Script编辑器→运行adminCreateFeedKeyIso→复制执行日志中的代码。/exec链接为点检表App正在使用的链接。"],"link.off_hint.ME":["Chưa nối: biểu nơi làm M&E chưa tính đúng hạn / quá hạn. App M&E cần bản có cửa đọc feed.isoEvidence.","未连接：执行位置为机电App的表单暂不计算按时/逾期。机电App需要有 feed.isoEvidence 读取接口的版本。"],"link.off_hint.CS":["Chưa nối: biểu nơi làm Checksheet chưa tính đúng hạn / quá hạn. App Checksheet cần bản có cửa đọc feed.isoEvidence.","未连接：执行位置为点检表的表单暂不计算按时/逾期。点检表App需要有 feed.isoEvidence 读取接口的版本。"],"link.test":["Thử kết nối","测试连接"],"link.save":["Lưu","保存"],"link.change":["Đổi link / mã","更改链接/代码"],"link.clear":["Ngắt kết nối","断开连接"],"link.clear_confirm.ME":["Ngắt kết nối M&E? Link và mã bị xóa, ngày có hồ sơ từ M&E bị bỏ, biểu nơi làm M&E trở về \"chưa tính\". Nối lại được bất cứ lúc nào.","断开机电App连接？链接和代码将被删除，来自机电App的记录日期将被移除，执行位置为机电App的表单恢复为\"暂不计算\"。可随时重新连接。"],"link.clear_confirm.CS":["Ngắt kết nối Checksheet? Link và mã bị xóa, ngày có hồ sơ từ Checksheet bị bỏ, biểu nơi làm Checksheet trở về \"chưa tính\". Nối lại được bất cứ lúc nào.","断开点检表连接？链接和代码将被删除，来自点检表的记录日期将被移除，执行位置为点检表的表单恢复为\"暂不计算\"。可随时重新连接。"],"link.last_at":["Lần lấy gần nhất","最近获取"],"link.ok_at":["Lần lấy được gần nhất","最近成功获取"],"link.matched":["Biểu nhận ngày có hồ sơ","获得记录日期的表单"],"link.matched_n":["{N} biểu · {D} dòng ngày","{N}个表单 · {D}行日期"],"link.unknown_n":["{N} mã biểu không có trong danh mục ISO (bỏ qua)","{N}个表单编号不在ISO目录中（已忽略）"],"link.unknown_hint":["Sửa mã biểu bên app kia cho khớp danh mục ISO, hoặc thêm biểu vào danh mục ISO. Mã con (03-03a, 07-06-KT) tự tính cho mã cha.","请在该App中修改表单编号以匹配ISO目录，或将表单加入ISO目录。子编号（03-03a、07-06-KT）自动计入父编号。"],"link.days_n":["{N} ngày","{N}天"],"link.test_ok":["Kết nối được: {D} dòng ngày, ghép được {N} biểu (chưa lưu — bấm Lưu).","连接成功：{D}行日期，匹配{N}个表单（尚未保存——请点击保存）。"],"link.saved_res":["Đã lấy: {D} dòng ngày, {N} biểu nhận ngày có hồ sơ.","已获取：{D}行日期，{N}个表单获得记录日期。"],"link.bad_n":["{N} dòng sai dạng bị bỏ","{N}行格式错误已忽略"],"link.testing":["Đang hỏi app kia (có thể tới nửa phút)…","正在查询该App（可能需要半分钟）…"],"link.saved":["Đã nối và lấy ngày có hồ sơ","已连接并获取记录日期"],"link.cleared":["Đã ngắt kết nối","已断开连接"],"link.synced":["Đã cập nhật ngày có hồ sơ","已更新记录日期"],"link.bad_url":["Link phải là link /exec của Apps Script (https://script.google.com/macros/s/…/exec)","链接须为Apps Script的 /exec 链接（https://script.google.com/macros/s/…/exec）"],"link.bad_key":["Mã kết nối quá ngắn — chép đủ mã từ nhật ký của app kia","连接码过短——请从该App日志中完整复制"],"link.items_title":["Biểu nhận ngày có hồ sơ từ app","从App获得记录日期的表单"],"link.items_hint":["Theo dữ liệu đã đồng bộ trên máy này. Bấm biểu để xem bảng kỳ.","依据本机已同步的数据。点击表单查看周期表。"],"link.missing_title":["{N} biểu in từ app chưa nhận ngày nào","{N}个系统打印表单尚未获得任何日期"],"link.missing_hint":["Thường do mã biểu bên app kia (mẫu checksheet, checklist bảo trì) khác mã trong danh mục ISO, hoặc chưa có hồ sơ trong 400 ngày.","通常因该App中的表单编号（点检表模板、保养检查表）与ISO目录不同，或400天内尚无记录。"],"link.no_access":["Chỉ Quản trị (cấp 4) nối app M&E / Checksheet.","仅管理员（4级）可连接机电/点检表App。"],"link.server_old":["Máy chủ ISO chưa lên bản 2a: dán Code.gs mới, chạy installTriggers rồi triển khai Phiên bản mới.","ISO服务器尚未升级到2a版：请粘贴新的Code.gs，运行installTriggers，然后部署新版本。"],"link.err.NO_RESPONSE":["Không nhận được phản hồi đúng từ link /exec — kiểm link (đúng link /exec đang dùng của app đó, triển khai \"Bất kỳ ai\").","未从 /exec 链接获得正确响应——请检查链接（须为该App正在使用的 /exec 链接，部署为\"任何人\"）。"],"link.err.FORBIDDEN":["App kia từ chối: sai mã kết nối, hoặc app kia chưa có cửa đọc cho ISO (feed.isoEvidence).","该App拒绝：连接码错误，或该App尚无供ISO读取的接口（feed.isoEvidence）。"],"link.err.NO_FEED":["App kia chưa có cửa đọc cho ISO (feed.isoEvidence) — cập nhật app đó trước.","该App尚无供ISO读取的接口（feed.isoEvidence）——请先更新该App。"],"link.err.MAINTENANCE":["App kia đang bảo trì — thử lại sau.","该App正在维护——请稍后重试。"],"link.err.REMOTE_ERROR":["App kia báo lỗi — thử lại sau.","该App报错——请稍后重试。"],"link.err.WRONG_APP":["Link này là của app khác (vd link M&E dán vào ô Checksheet).","此链接属于其他App（例如把机电链接粘贴到点检表栏）。"],"link.err.BAD_DATA":["Dữ liệu app kia trả về không đúng dạng.","该App返回的数据格式不正确。"],"link.err.TOO_MANY":["App kia trả về quá nhiều dòng (hơn 60 000).","该App返回的行数过多（超过60 000）。"],"link.err.NOT_LINKED":["Chưa nối app này.","尚未连接此App。"],"link.err.ERROR":["Lỗi khi lấy dữ liệu.","获取数据时出错。"],"ev.line.ME":["Có hồ sơ trong M&E · {N} lượt · gần nhất {D}","机电App中有记录 · {N}次 · 最近 {D}"],"ev.line.CS":["Có hồ sơ trong Checksheet · {N} lượt · gần nhất {D}","点检表中有记录 · {N}次 · 最近 {D}"],"link.got.ME":["M&E · gần nhất {D} · {N} lượt","机电App · 最近 {D} · {N}次"],"link.got.CS":["Checksheet · gần nhất {D} · {N} lượt","点检表 · 最近 {D} · {N}次"],"admin.mail":["Gmail nhắc hạn","邮件提醒"],"health.gmail":["Gmail nhắc hạn","邮件提醒"],"mail.subject":["Nhắc hạn hồ sơ, tài liệu ISO","ISO记录与文件到期提醒"],"mail.kind.REC_OVERDUE":["Hồ sơ quá hạn — tóm tắt tuần","逾期记录（每周汇总）"],"mail.kind.REVIEW_DUE":["Tài liệu đến hạn rà soát","文件到期评审"],"mail.kind.VERSION_WAIT":["Phiên bản chờ xử lý quá {N} ngày","版本待处理超过{N}天"],"mail.kind_short.REC_OVERDUE":["Hồ sơ quá hạn","逾期记录","red"],"mail.kind_short.REVIEW_DUE":["Rà soát tài liệu","文件评审","amber"],"mail.kind_short.VERSION_WAIT":["Phiên bản chờ","版本待处理","navy"],"mail.what":["App gửi mỗi người nhận một thư tổng hợp mỗi ngày lúc {H}:00, chỉ khi có việc cần nhắc. Thư đã gửi không gửi lại cho cùng một mốc.","应用每天{H}:00向每位收件人发送一封汇总邮件，仅在有需提醒事项时发送。同一节点已发送的不会重发。"],"mail.on":["Đang bật","已开启","green"],"mail.off":["Đang tắt","已关闭","grey"],"mail.off_note":["Chưa gửi thư nào. Nhập email người nhận, xác nhận, bấm Gửi thử, rồi Bật Gmail.","尚未发送任何邮件。请先填写并确认收件人邮箱，点击“发送测试”，然后开启邮件。"],"mail.hour":["Giờ gửi mỗi ngày","每天发送时间"],"mail.hour_val":["{H}:00 (giờ Việt Nam)","{H}:00（越南时间）"],"mail.quota":["Hạn mức Gmail còn hôm nay","今日邮件剩余额度"],"mail.quota_val":["{N} người nhận","{N}位收件人"],"mail.quota_unknown":["Chưa đọc được","暂无法读取"],"mail.quota_note":["Dùng chung với M&E và Checksheet (cùng tài khoản Google, khoảng 100 người nhận mỗi ngày). ISO tạm dừng gửi khi còn {R} trở xuống để chừa cho hai app kia; thư chưa gửi được gửi lần chạy sau.","与机电、点检表共用（同一谷歌账户，约每天100位收件人）。剩余不超过{R}时ISO暂停发送，留给另两个App；未发送的邮件在下次运行时发送。"],"mail.last_run":["Lần chạy gần nhất","最近一次运行"],"mail.last_val":["{T} — gửi {S} thư, lỗi {F}","{T}——发送{S}封，失败{F}"],"mail.never":["Chưa chạy","尚未运行"],"mail.quota_stop":["Lần chạy gần nhất dừng vì hạn mức Gmail còn ít — thư còn lại gửi lần sau.","最近一次运行因邮件额度不足而停止——剩余邮件下次发送。"],"mail.no_trigger":["Máy chủ chưa có trigger gửi hằng ngày (sendDueMail): mở trình soạn Apps Script của ISO → chạy installTriggers.","服务器尚无每日发送触发器（sendDueMail）：打开ISO的Apps Script编辑器→运行installTriggers。"],"mail.btn_on":["Bật Gmail","开启邮件"],"mail.btn_off":["Tắt Gmail","关闭邮件"],"mail.btn_hour":["Đổi giờ gửi","修改发送时间"],"mail.btn_run":["Gửi ngay","立即发送"],"mail.run_confirm":["Xếp hàng và gửi ngay các việc cần nhắc hôm nay như lần gửi hằng ngày (việc đã gửi cho cùng mốc không gửi lại).","立即按每日发送规则排队并发送今天需提醒的事项（同一节点已发送的不会重发）。"],"mail.run_done":["Đã gửi {S} thư, lỗi {F}, xếp thêm {Q} việc","已发送{S}封，失败{F}，新排队{Q}项"],"mail.need_recipient":["Chưa có email nào được xác nhận: bật được nhưng chưa ai nhận thư.","尚无已确认的邮箱：可以开启，但无人会收到邮件。"],"mail.saved_on":["Đã bật Gmail nhắc hạn","已开启邮件提醒"],"mail.saved_off":["Đã tắt Gmail nhắc hạn","已关闭邮件提醒"],"mail.saved_hour":["Đã đổi giờ gửi","已修改发送时间"],"mail.off_confirm":["Tắt Gmail: app thôi gửi thư nhắc hạn (vẫn hiện việc trên trang chủ).","关闭邮件：应用停止发送提醒邮件（首页仍显示待办）。"],"mail.rcpt_title":["Người nhận","收件人"],"mail.rcpt_hint":["Quản trị nhập email và xác nhận địa chỉ đúng; chỉ email đã xác nhận mới nhận thư, đổi email thì phải xác nhận lại. Việc của người chưa có email đã xác nhận được gửi Thư ký ISO thay.","由管理员填写邮箱并确认地址正确；只有已确认的邮箱才会收到邮件，修改邮箱后须重新确认。尚无已确认邮箱者的事项改发给ISO秘书。"],"mail.role.head":["Trưởng bộ phận {D}","部门负责人 {D}"],"mail.role.secretary":["Thư ký ISO","ISO秘书"],"mail.role.secretary_fallback":["Nhận thay Thư ký ISO (chưa ai có cờ Thư ký ISO)","代ISO秘书接收（尚无人设ISO秘书标记）"],"mail.role.docs":["Phụ trách {N} tài liệu","负责{N}份文件"],"mail.role.admin":["Duyệt phiên bản (Quản trị)","审批版本（管理员）"],"mail.role.none":["Hiện không nhận loại nhắc nào","目前不接收任何提醒"],"mail.email_ok":["Đã xác nhận","已确认","green"],"mail.email_unconfirmed":["Chưa xác nhận","未确认","amber"],"mail.email_none":["Chưa có email","无邮箱","grey"],"mail.confirmed_by":["Xác nhận lúc {T} · {N}","确认于 {T} · {N}"],"mail.btn_email":["Nhập / sửa email","填写/修改邮箱"],"mail.btn_confirm":["Xác nhận","确认"],"mail.btn_unconfirm":["Bỏ xác nhận","取消确认"],"mail.btn_test":["Gửi thử","发送测试"],"mail.email_label":["Email nhận nhắc hạn","接收提醒的邮箱"],"mail.confirm_check":["Tôi (Quản trị) xác nhận đây đúng là email của người này","我（管理员）确认这是此人的邮箱"],"mail.email_saved":["Đã lưu email","已保存邮箱"],"mail.email_confirmed":["Đã xác nhận email","已确认邮箱"],"mail.email_unconfirmed_saved":["Đã bỏ xác nhận email","已取消确认邮箱"],"mail.bad_email":["Email chưa đúng dạng","邮箱格式不正确"],"mail.owner_only":["Chỉ owner sửa email của owner","仅系统所有者可修改其邮箱"],"mail.test_sent":["Đã gửi thư thử tới {E} ({N} việc) — mở hộp thư (cả mục Spam) để xem.","测试邮件已发送至{E}（{N}项）——请查看邮箱（包括垃圾邮件）。"],"mail.test_failed":["Gửi thử không được: {E}","测试发送失败：{E}"],"mail.test_confirm":["Gửi một thư thử tới {E}: nội dung là mọi việc app sẽ nhắc người này tính tới hôm nay. Dùng 1 lượt hạn mức Gmail.","向{E}发送一封测试邮件：内容为截至今天应用将提醒此人的所有事项。将占用1次邮件额度。"],"mail.preview_title":["Việc cần nhắc tính tới hôm nay","截至今天需提醒的事项"],"mail.preview_none":["Hiện không có việc nào cần nhắc.","目前没有需要提醒的事项。"],"mail.preview_note":["Tính lại mỗi lần mở màn này. Thư thật chỉ gửi lúc giờ gửi khi Gmail đang bật; tóm tắt hồ sơ quá hạn gửi sáng thứ Hai ({D}).","每次打开本页时重新计算。仅在邮件开启时于发送时间发送；逾期记录汇总于周一上午发送（{D}）。"],"mail.preview_n":["{N} việc","{N}项"],"mail.st.NEW":["Sẽ gửi","将发送","navy"],"mail.st.QUEUED":["Chờ gửi","待发送","amber"],"mail.st.SENDING":["Đang gửi","发送中","amber"],"mail.st.SENT":["Đã gửi","已发送","green"],"mail.st.FAILED":["Lỗi","失败","red"],"mail.st.UNKNOWN":["Chưa rõ đã gửi","不确定是否已发送","red"],"mail.st.SKIPPED":["Bỏ qua","已跳过","grey"],"mail.st.MONDAY":["Gửi sáng thứ Hai","周一上午发送","grey"],"mail.st.WORKDAY":["Gửi ngày làm việc","工作日发送","grey"],"mail.fallback":["Gửi thay cho {N}","代为通知{N}"],"mail.unreachable":["Không ai nhận được {N} việc: người nhận và Thư ký ISO đều chưa có email đã xác nhận.","{N}项无人可接收：收件人和ISO秘书均无已确认的邮箱。"],"mail.rules_title":["Lịch nhắc","提醒规则"],"mail.rule.REC_OVERDUE":["Hồ sơ quá hạn → trưởng bộ phận (bộ phận chưa có trưởng → Thư ký ISO): tóm tắt sáng thứ Hai hằng tuần, tuần sau còn quá hạn thì nhắc lại.","逾期记录→部门负责人（无负责人→ISO秘书）：每周一上午汇总，下周仍逾期则再次提醒。"],"mail.rule.REVIEW_DUE":["Tài liệu đến hạn rà soát → người phụ trách + Thư ký ISO: 30, 7 và 0 ngày trước hạn; quá hạn nhắc mỗi 7 ngày.","文件到期评审→负责人+ISO秘书：到期前30、7、0天；逾期后每7天提醒。"],"mail.rule.VERSION_WAIT":["Phiên bản chờ duyệt / chờ ban hành quá {N} ngày → người duyệt / Thư ký ISO: mỗi ngày làm việc (Thứ Hai – Thứ Sáu) tới khi xử lý.","版本待审批/待发布超过{N}天→审批人/ISO秘书：每个工作日（周一至周五）提醒直至处理。"],"mail.log_title":["Nhật ký gửi","发送日志"],"mail.log_none":["Chưa có thư nào","尚无邮件"],"mail.col_time":["Thời gian","时间"],"mail.col_to":["Người nhận","收件人"],"mail.col_item":["Việc","事项"],"mail.col_state":["Trạng thái","状态"],"mail.btn_resend":["Gửi lại","重新发送"],"mail.resend_confirm":["Thư này có thể đã gửi (máy chủ dừng giữa chừng) hoặc đã lỗi nhiều lần. Gửi lại một thư nữa cho việc này?","此邮件可能已发送（服务器中途停止）或已多次失败。是否为此事项再发送一封？"],"mail.resent":["Đã gửi lại","已重新发送"],"mail.tries":["thử {N} lần","尝试{N}次"],"mail.server_old":["Máy chủ chưa lên bản 2b: dán Code.gs mới, chạy migrateSchema và installTriggers theo hướng dẫn.","服务器尚未升级到2b版：请按说明粘贴新的Code.gs，运行migrateSchema和installTriggers。"],"mail.no_access":["Chỉ Quản trị (cấp 4) đặt Gmail nhắc hạn","仅管理员（4级）可设置邮件提醒"],"mail.due.REC_OVERDUE":["Hạn chót nộp {D}","提交截止 {D}"],"mail.due.REVIEW_DUE":["Hạn rà soát {D}","评审期限 {D}"],"mail.due.VERSION_WAIT":["Chờ từ {D}","等待自 {D}"],"rpt.title.CATALOG":["Danh mục tài liệu hiện hành","现行文件清单"],"rpt.title.RECORDS":["Tình trạng hồ sơ theo bộ phận và kỳ","各部门各期记录状态"],"rpt.title.COVERAGE":["Phủ điều khoản ISO 9001 và BRCGS","ISO 9001及BRCGS条款覆盖"],"rpt.title.VERSIONS":["Lịch sử phiên bản tài liệu","文件版本历史"],"rpt.kind.CATALOG":["Danh mục tài liệu","文件清单"],"rpt.kind.RECORDS":["Tình trạng hồ sơ","记录状态"],"rpt.kind.COVERAGE":["Phủ điều khoản","条款覆盖"],"rpt.kind.VERSIONS":["Lịch sử phiên bản","版本历史"],"rpt.desc.CATALOG":["Tài liệu, biểu mẫu đang hiệu lực theo bộ phận: mã, tên, lần ban hành, ngày hiệu lực (thay BM-ISO-02-01).","各部门现行文件及表单：编号、名称、版次、生效日期（替代BM-ISO-02-01）。"],"rpt.desc.RECORDS":["Hồ sơ đúng hạn / quá hạn của từng biểu theo tháng hoặc quý, tổng hợp theo bộ phận.","按月或季度显示各表单记录按期/逾期，按部门汇总。"],"rpt.desc.COVERAGE":["Điều khoản ISO 9001 và chủ đề BRCGS: số biểu, đã ban hành, in từ app, còn thiếu.","ISO 9001条款及BRCGS主题：表单数、已发布、由App打印、缺失。"],"rpt.desc.VERSIONS":["Các lần ban hành của một tài liệu: người soạn, người duyệt, ngày hiệu lực, lỗi thời.","某文件的各次发布：编写人、审批人、生效日期、作废日期。"],"rpt.f.dept":["Bộ phận","部门"],"rpt.all_depts":["Tất cả bộ phận","全部部门"],"rpt.f.scope":["Phạm vi","范围"],"rpt.scope.ISSUED":["Đang hiệu lực (●)","现行有效（●）"],"rpt.scope.ALL":["Tất cả tình trạng","全部状态"],"rpt.f.period":["Kỳ","期间"],"rpt.f.end":["Đến kỳ","截至"],"rpt.f.n":["Số cột","栏数"],"rpt.grain.MONTH":["theo tháng","按月"],"rpt.grain.QUARTER":["theo quý","按季度"],"rpt.f.std":["Chuẩn","标准"],"rpt.std.BOTH":["ISO 9001 và BRCGS","ISO 9001及BRCGS"],"rpt.std.ISO9001":["ISO 9001","ISO 9001"],"rpt.std.BRC":["BRCGS Packaging","BRCGS包装"],"rpt.f.codes":["Kèm mã biểu từng điều khoản","附各条款表单编号"],"rpt.f.item":["Tài liệu","文件"],"rpt.f.scope_depts":["Phạm vi xem","查看范围"],"rpt.form_code":["Biểu mẫu","表单"],"rpt.rev_n":["Lần {N}","第{N}版"],"rpt.number":["Số báo cáo","报告编号"],"rpt.generated_at":["Ngày lập","编制日期"],"rpt.prepared_by":["Người lập","编制人"],"rpt.approved_by":["Người duyệt","审核人"],"rpt.sign_hint":["(Ký, ghi rõ họ tên)","（签名并注明姓名）"],"rpt.no_code":["Cấp khi tải PDF / Excel","下载PDF/Excel时生成"],"rpt.none":["Không có dòng nào","无数据"],"rpt.t.items":["Tổng biểu, tài liệu","表单及文件总数"],"rpt.t.issued":["Đang hiệu lực (●)","现行有效（●）"],"rpt.t.issued_pct":["% ban hành","发布率"],"rpt.t.review_overdue":["Quá hạn rà soát","评审逾期"],"rpt.t.tracked":["Biểu theo dõi","跟踪表单"],"rpt.t.periods_due":["Kỳ đã đến hạn","已到期期数"],"rpt.t.on_time":["Đúng hạn","按期率"],"rpt.t.late":["Kỳ quá hạn","逾期期数"],"rpt.t.iso_covered":["ISO 9001: điều khoản có biểu","ISO 9001：有表单的条款"],"rpt.t.iso_missing":["Bắt buộc mà thiếu biểu","强制条款缺表单"],"rpt.t.iso_not_issued":["ISO 9001: có biểu, chưa ban hành","ISO 9001：有表单未发布"],"rpt.t.brc_covered":["BRCGS: chủ đề có biểu","BRCGS：有表单的主题"],"rpt.t.brc_not_issued":["BRCGS: có biểu, chưa ban hành","BRCGS：有表单未发布"],"rpt.t.current_rev":["Lần hiện hành","现行版次"],"rpt.t.issued_at":["Ngày ban hành","发布日期"],"rpt.t.review_due":["Hạn rà soát","评审期限"],"rpt.t.revisions":["Số lần ban hành","发布次数"],"rpt.col.code":["Mã","编号"],"rpt.col.name":["Tên","名称"],"rpt.col.kind":["Loại","类型"],"rpt.col.rev":["Lần","版次"],"rpt.col.issued_at":["Ngày ban hành","发布日期"],"rpt.col.effective":["Hiệu lực từ","生效日期"],"rpt.col.review_due":["Hạn rà soát","评审期限"],"rpt.col.status":["Tình trạng","状态"],"rpt.col.note":["Ghi chú","备注"],"rpt.col.dept":["Bộ phận","部门"],"rpt.col.period_type":["Kỳ","周期"],"rpt.col.ok":["Đúng hạn","按期"],"rpt.col.late":["Quá hạn","逾期"],"rpt.col.rate":["Tỷ lệ","比率"],"rpt.col.tracked":["Biểu theo dõi","跟踪表单"],"rpt.col.periods_due":["Kỳ đã đến hạn","已到期期数"],"rpt.col.items_late":["Biểu có kỳ quá hạn","有逾期的表单"],"rpt.col.events":["Lần nộp (khi phát sinh)","提交次数（发生时）"],"rpt.col.group":["Nhóm","组别"],"rpt.col.clause":["Điều khoản","条款"],"rpt.col.topic":["Chủ đề","主题"],"rpt.col.content":["Nội dung","内容"],"rpt.col.mandatory":["Bắt buộc lưu hồ sơ","强制保存记录"],"rpt.col.items":["Số biểu","表单数"],"rpt.col.issued":["Đã ban hành","已发布"],"rpt.col.app":["In từ app","由App打印"],"rpt.col.codes":["Mã biểu","表单编号"],"rpt.col.vtype":["Loại","类型"],"rpt.col.summary":["Tóm tắt thay đổi","变更摘要"],"rpt.col.author":["Người soạn","编写人"],"rpt.col.submitted":["Gửi duyệt","提交审批"],"rpt.col.approved":["Duyệt","审批"],"rpt.col.issued_by":["Ban hành","发布"],"rpt.col.superseded":["Lỗi thời từ","作废日期"],"rpt.col.total":["Tổng","合计"],"rpt.sec.by_dept":["Tổng hợp theo bộ phận","按部门汇总"],"rpt.sec.item":["Thông tin tài liệu","文件信息"],"rpt.sec.history":["Các lần ban hành","发布记录"],"rpt.sec.iso":["ISO 9001 — {N} điều khoản","ISO 9001——{N}个条款"],"rpt.sec.brc":["BRCGS Packaging — {N} chủ đề","BRCGS包装——{N}个主题"],"rpt.items_n":["{N} biểu","{N}个"],"rpt.note.review_overdue":["Quá hạn rà soát","评审逾期"],"rpt.note.review_soon":["Sắp đến hạn rà soát","评审即将到期"],"rpt.note.file_missing":["Chưa có tệp","无文件"],"rpt.note.imported":["Nhập từ danh mục Excel","从Excel目录导入"],"rpt.note.catalog_na":["{N} biểu không áp dụng (✕) không tính vào % ban hành.","{N}个不适用（✕）表单不计入发布率。"],"rpt.note.catalog_nofile":["{N} biểu đang hiệu lực chưa có tệp PDF trong app (nhập từ danh mục Excel).","{N}个现行表单在App中尚无PDF文件（从Excel目录导入）。"],"rpt.legend.records":["✓ có hồ sơ · ! quá hạn (kỳ đã kết thúc quá {G} ngày cho phép trễ) · – chưa tới hạn · a/b: số kỳ có hồ sơ / số kỳ của biểu ngày, tuần… trong cột · số: lần nộp của biểu khi phát sinh · ô trống: không tính.","✓ 有记录 · ! 逾期（期间结束超过允许延迟{G}天）· – 未到期 · a/b：栏内有记录期数/日、周等表单的期数 · 数字：发生时表单的提交次数 · 空白：不计。"],"rpt.note.not_counted":["Không tính: {A} biểu chưa ban hành (○ ◐), {B} biểu không áp dụng (✕), {C} biểu in từ M&E / Checksheet chưa nối, {D} biểu chưa có ngày bắt đầu tính.","不计：{A}个未发布（○ ◐），{B}个不适用（✕），{C}个由机电/点检表打印但未连接，{D}个无开始计算日期。"],"rpt.note.ev":["{S}: {N} lượt ({F} – {T})","{S}：{N}次（{F} – {T}）"],"rpt.note.scope_items":["Tính trên {N} biểu trong phạm vi xem.","按查看范围内{N}个表单计算。"],"rpt.kv.reviewed":["Rà soát gần nhất","最近评审"],"rpt.kv.na_reason":["Lý do không áp dụng","不适用原因"],"rpt.kv.iso9001":["Điều khoản ISO 9001","ISO 9001条款"],"rpt.kv.brc":["Chủ đề BRCGS","BRCGS主题"],"rpt.kv.flow":["Lập → Duyệt","编制→审批"],"rpt.kv.keep":["Thời gian lưu","保存期限"],"rpt.kv.owner":["Người phụ trách","负责人"],"health.reports":["Báo cáo đã lưu","已保存报表"],"rp.pick":["Chọn báo cáo","选择报表"],"rp.filters":["Bộ lọc","筛选"],"rp.run":["Xem báo cáo","查看报表"],"rp.pdf":["Tải PDF","下载PDF"],"rp.excel":["Tải Excel","下载Excel"],"rp.preview":["Bản xem trước","预览"],"rp.preview_hint":["Chọn báo cáo và bộ lọc rồi bấm Xem báo cáo. Bản xem trước giống trang PDF.","选择报表及筛选条件后点击查看报表。预览与PDF页面相同。"],"rp.save_note":["Tải PDF / Excel lần đầu sẽ lưu báo cáo và cấp số BC-…; tải tiếp cùng bộ lọc giữ nguyên số và số liệu.","首次下载PDF/Excel时保存报表并生成编号BC-…；相同筛选再次下载保持编号及数据不变。"],"rp.need_network":["Báo cáo do máy chủ tính: cần có mạng.","报表由服务器计算：需要网络。"],"rp.server_old":["Máy chủ chưa lên bản có Báo cáo (2c): Quản trị dán Code.gs mới, chạy migrateSchema rồi triển khai Phiên bản mới.","服务器尚未升级到含报表的版本（2c）：管理员粘贴新Code.gs，运行migrateSchema后部署新版本。"],"rp.saved":["Báo cáo đã lưu","已保存报表"],"rp.saved_mine":["Báo cáo bạn đã lập","您编制的报表"],"rp.saved_none":["Chưa có báo cáo nào được lưu. Bấm Tải PDF hoặc Tải Excel để lưu báo cáo có số.","尚无已保存报表。点击下载PDF或Excel以保存带编号的报表。"],"rp.pdf_ready":["Đã có PDF {C}","PDF {C} 已生成"],"rp.excel_ready":["Đã có Excel {C}","Excel {C} 已生成"],"rp.open_file":["Mở / lưu tệp","打开/保存文件"],"rp.building":["Máy chủ đang dựng PDF (có thể tới 1 phút)…","服务器正在生成PDF（可能需要1分钟）…"],"rp.no_logo":["Chưa có logo công ty trên báo cáo.","报表尚无公司标志。"],"rp.grain.MONTH":["Theo tháng","按月"],"rp.grain.QUARTER":["Theo quý","按季度"],"rp.n.MONTH":["{N} tháng","{N}个月"],"rp.n.QUARTER":["{N} quý","{N}个季度"],"rp.version_report":["Báo cáo lịch sử phiên bản (PDF / Excel)","版本历史报表（PDF/Excel）"],"rp.coverage_report":["Báo cáo PDF / Excel","PDF/Excel报表"],"health.doc_control":["Đề nghị tài liệu, phân phối","文件申请及分发"],"dr.type.NEW":["Tài liệu mới","新文件"],"dr.type.REVISE":["Sửa đổi / ban hành","修订/发布"],"dr.type.CANCEL":["Hủy (ngừng dùng)","作废（停用）"],"dr.state.SUBMITTED":["Chờ xem xét","待审核","amber"],"dr.state.APPROVED":["Đã chấp thuận","已批准","navy"],"dr.state.REJECTED":["Không chấp thuận","未批准","red"],"dr.state.DONE":["Đã thực hiện","已完成","green"],"dr.state.CANCELLED":["Đã rút lại","已撤回","grey"],"dr.done_issue":["Ban hành lần {N}","发布第{N}版"],"dr.done_na":["Đặt Không áp dụng (✕)","设为不适用（✕）"],"dr.na_reason":["Theo phiếu đề nghị {C}","依据申请单{C}"],"dist.state.ACTIVE":["Đang dùng","使用中","green"],"dist.state.DUE":["Cần thu hồi","需收回","red"],"dist.state.RECALLED":["Đã thu hồi","已收回","grey"],"dist.state.VOID":["Đã bỏ (ghi nhầm)","已作废（误记）","grey"],"rpt.title.DIST":["Sổ phân phối & thu hồi tài liệu","文件分发及收回登记表"],"rpt.title.DOCREQ":["Phiếu đề nghị ban hành / sửa đổi / hủy tài liệu","文件发布/修订/作废申请单"],"rpt.kind.DIST":["Sổ phân phối & thu hồi","分发及收回登记"],"rpt.kind.DOCREQ":["Phiếu đề nghị tài liệu","文件申请单"],"rpt.desc.DIST":["Bản in đã phát theo nơi nhận: lần ban hành, số bản, đang dùng / cần thu hồi / đã thu hồi (thay BM-ISO-02-03).","按接收处列出已分发的纸质文件：版次、份数、使用中/需收回/已收回（替代BM-ISO-02-03）。"],"rpt.desc.DOCREQ":["Một phiếu đề nghị để in ký, hoặc sổ theo dõi phiếu trong năm (thay BM-ISO-02-02).","打印单张申请单签字，或年度申请单跟踪表（替代BM-ISO-02-02）。"],"rpt.f.dist_state":["Tình trạng","状态"],"rpt.dist_state.ALL":["Tất cả","全部"],"rpt.dist_state.ACTIVE":["Đang dùng","使用中"],"rpt.dist_state.DUE":["Cần thu hồi","需收回"],"rpt.dist_state.RECALLED":["Đã thu hồi","已收回"],"rpt.f.year":["Năm","年份"],"rpt.f.req":["Phiếu","申请单"],"rpt.f.req_state":["Tình trạng phiếu","申请单状态"],"rpt.req_state.ALL":["Tất cả (kể cả đã rút lại)","全部（含已撤回）"],"rpt.req_state.OPEN":["Đang xử lý","处理中"],"rpt.req_state.DONE":["Đã thực hiện","已完成"],"rpt.req_state.REJECTED":["Không chấp thuận","未批准"],"rpt.t.dist_docs":["Tài liệu đang phát","已分发文件"],"rpt.t.dist_copies":["Bản in đang dùng","使用中份数"],"rpt.t.dist_due":["Nơi cần thu hồi","需收回处"],"rpt.t.dist_recalled":["Đã thu hồi","已收回"],"rpt.t.req_type":["Loại đề nghị","申请类型"],"rpt.t.req_state":["Tình trạng","状态"],"rpt.t.req_date":["Ngày đề nghị","申请日期"],"rpt.t.req_level":["Cấp duyệt","审批级别"],"rpt.t.req_total":["Số phiếu","申请单数"],"rpt.t.req_open":["Chờ xem xét","待审核"],"rpt.t.req_approved":["Đã chấp thuận, chưa thực hiện","已批准未完成"],"rpt.t.req_done":["Đã thực hiện","已完成"],"rpt.col.holder":["Nơi nhận (người / vị trí)","接收处（人/位置）"],"rpt.col.copies":["Số bản","份数"],"rpt.col.dist_date":["Ngày phát","分发日期"],"rpt.col.dist_by":["Người phát","分发人"],"rpt.col.recalled":["Thu hồi (ngày · người)","收回（日期·人）"],"rpt.col.req_no":["Số phiếu","申请单号"],"rpt.col.req_date":["Ngày đề nghị","申请日期"],"rpt.col.req_type":["Loại","类型"],"rpt.col.doc":["Tài liệu","文件"],"rpt.col.req_reason":["Lý do","理由"],"rpt.col.requester":["Người đề nghị","申请人"],"rpt.col.decided":["Người xem xét · ngày","审核人·日期"],"rpt.col.req_done":["Thực hiện","执行"],"rpt.dist_due_rev":["hiện hành lần {N}","现行第{N}版"],"rpt.dist_rows_n":["{N} nơi nhận · {C} bản đang dùng","{N}处接收·使用中{C}份"],"rpt.note.dist":["Cần thu hồi: bản in của lần ban hành cũ (hoặc tài liệu đã ngừng dùng) còn ở nơi nhận. Thu hồi trong {N} ngày kể từ ngày ban hành lần mới; quá hạn có dấu !","需收回：旧版（或已停用文件）纸质文件仍在接收处。发布新版后{N}天内收回；逾期标“!”"],"rpt.req_drafting":["Đang soạn lần {N}","正在编写第{N}版"],"rpt.req_n":["{N} phiếu","{N}张"],"rpt.sec.req":["Nội dung đề nghị","申请内容"],"rpt.sec.req_result":["Xem xét và thực hiện","审核及执行"],"rpt.kv.req_no":["Số phiếu","申请单号"],"rpt.kv.req_date":["Ngày đề nghị","申请日期"],"rpt.kv.req_type":["Loại đề nghị","申请类型"],"rpt.kv.req_doc":["Tài liệu","文件"],"rpt.kv.req_new_doc":["Tài liệu đề nghị ban hành","申请发布的文件"],"rpt.kv.req_level":["Cấp duyệt","审批级别"],"rpt.kv.req_reason":["Lý do đề nghị","申请理由"],"rpt.kv.req_content":["Nội dung đề nghị sửa đổi / ban hành","申请修订/发布内容"],"rpt.kv.req_want":["Ngày mong muốn áp dụng","期望实施日期"],"rpt.kv.requester":["Người đề nghị","申请人"],"rpt.kv.entered_by":["{U} nhập thay","{U}代为录入"],"rpt.kv.decided":["Chấp thuận (người · ngày)","批准（人·日期）"],"rpt.kv.rejected":["Không chấp thuận (người · ngày)","未批准（人·日期）"],"rpt.kv.req_version":["Phiên bản soạn theo phiếu","依据申请编写的版本"],"rpt.kv.req_done":["Đã thực hiện","已完成"],"rpt.kv.req_note":["Ghi chú","备注"],"rpt.sign.requester":["Người đề nghị","申请人"],"rpt.sign.decider":["Người xem xét","审核人"],"nav.requests":["Đề nghị tài liệu","文件申请"],"nav.dist":["Phân phối & thu hồi","分发及收回"],"nav.labels":["In tem QR","打印二维码标签"],"tile.requests":["Đề nghị tài liệu","文件申请"],"tile.dist":["Phân phối & thu hồi","分发及收回"],"tile.labels":["In tem QR","打印二维码"],"home.pend_req_review":["{N} phiếu đề nghị tài liệu chờ bạn xem xét","{N}张文件申请待您审核"],"home.pend_req_todo":["{N} phiếu đề nghị đã chấp thuận chờ thực hiện","{N}张已批准申请待执行"],"home.pend_req_rejected":["{N} phiếu đề nghị của bạn không được chấp thuận","您的{N}张申请未获批准"],"home.pend_dist_due":["{N} nơi giữ bản in lần cũ cần thu hồi","{N}处旧版纸质文件需收回"],"home.pend_dist_overdue":["{N} nơi giữ bản in lần cũ cần thu hồi (có nơi quá hạn)","{N}处旧版纸质文件需收回（有逾期）"],"dr.title":["Phiếu đề nghị tài liệu","文件申请单"],"dr.new":["Đề nghị mới","新申请"],"dr.server_old":["Máy chủ chưa lên bản 2d: chưa có phiếu đề nghị, sổ phân phối. Quản trị cập nhật máy chủ theo hướng dẫn.","服务器尚未升级到2d版：暂无文件申请及分发登记。请管理员按说明更新服务器。"],"dr.log_report":["Sổ theo dõi (PDF / Excel)","跟踪表（PDF/Excel）"],"dr.tab.review":["Chờ tôi xem xét","待我审核"],"dr.tab.todo":["Chờ thực hiện","待执行"],"dr.tab.mine":["Của tôi","我的"],"dr.tab.all":["Tất cả","全部"],"dr.none":["Không có phiếu nào.","没有申请单。"],"dr.how":["Đề nghị ban hành mới, sửa đổi hoặc hủy tài liệu → trưởng bộ phận (tài liệu cấp bộ phận) hoặc Quản trị (cấp công ty) xem xét → Thư ký ISO / người soạn thực hiện: soạn phiên bản theo phiếu rồi ban hành, hoặc đặt Không áp dụng. Ban hành xong phiếu tự thành Đã thực hiện.","申请新发布、修订或作废文件→部门负责人（部门级文件）或管理员（公司级）审核→体系秘书/编写人执行：依据申请编写版本并发布，或设为不适用。发布后申请自动变为已完成。"],"dr.type_hint.REVISE":["Tài liệu, biểu mẫu đã có trong danh mục: sửa đổi bản đang hiệu lực, hoặc ban hành lần đầu biểu chưa ban hành (Chưa có / Đang soạn). Ghi rõ phần cần sửa / cần ban hành.","目录中已有的文件、表单：修订现行版本，或首次发布尚未发布的表单（未编写/编写中）。写明需修改/发布的内容。"],"dr.type_hint.NEW":["Tài liệu, biểu mẫu chưa có trong danh mục: được chấp thuận thì Thư ký ISO thêm vào danh mục rồi soạn lần 01.","目录中尚无的文件、表单：批准后由体系秘书加入目录并编写第01版。"],"dr.type_hint.CANCEL":["Đề nghị hủy (ngừng dùng) tài liệu: được chấp thuận thì Thư ký ISO đặt Không áp dụng ✕, hồ sơ cũ giữ nguyên.","申请作废（停用）文件：批准后由体系秘书设为不适用✕，原有记录保留。"],"dr.doc":["Tài liệu, biểu mẫu","文件、表单"],"dr.new_code":["Mã đề xuất","建议编号"],"dr.new_code_hint":["Để trống nếu chưa có mã — Thư ký ISO đặt mã khi thêm vào danh mục.","无编号可留空——体系秘书加入目录时编号。"],"dr.new_title":["Tên tài liệu đề nghị","申请文件名称"],"dr.reason":["Lý do đề nghị","申请理由"],"dr.content":["Nội dung cần sửa đổi / ban hành","需修订/发布的内容"],"dr.content_new":["Mô tả nội dung tài liệu","文件内容说明"],"dr.want_date":["Ngày mong muốn áp dụng","期望实施日期"],"dr.requester_name":["Người đề nghị (khi nhập thay)","申请人（代为录入时）"],"dr.requester_hint":["Nhân viên không đăng nhập app: ghi tên, bộ phận người đề nghị. Để trống = bạn.","不登录App的员工：填写申请人姓名、部门。留空=您本人。"],"dr.send":["Gửi phiếu","提交申请"],"dr.sent_ok":["Đã gửi phiếu {C}","已提交申请单{C}"],"dr.flow_note":["Gửi xong phiếu ở trạng thái Chờ xem xét; bạn sửa hoặc rút lại được tới khi được xem xét.","提交后为待审核状态；审核前您可修改或撤回。"],"dr.no_code":["(chưa có mã)","（暂无编号）"],"dr.not_found":["Không tìm thấy phiếu (có thể ngoài phạm vi của bạn).","找不到申请单（可能不在您的范围内）。"],"dr.approve":["Chấp thuận","批准"],"dr.reject":["Không chấp thuận","不批准"],"dr.decide_note":["Ý kiến (không bắt buộc)","意见（选填）"],"dr.self_note":["Đây là phiếu do chính bạn gửi (Quản trị được tự xem xét).","这是您本人提交的申请（管理员可自行审核）。"],"dr.approved_ok":["Đã chấp thuận phiếu","已批准申请"],"dr.rejected_ok":["Đã ghi không chấp thuận","已记录不批准"],"dr.cancel":["Rút lại phiếu","撤回申请"],"dr.cancel_note":["Phiếu rút lại không xem xét, không thực hiện nữa.","撤回的申请不再审核、执行。"],"dr.cancelled_ok":["Đã rút lại phiếu","已撤回申请"],"dr.done":["Đã thực hiện (ghi chú)","已完成（备注）"],"dr.done_note":["Đã thực hiện thế nào","执行情况"],"dr.done_hint":["Dùng khi việc đã làm ngoài app (vd sửa trên bản giấy). Soạn phiên bản theo phiếu rồi ban hành thì phiếu tự thành Đã thực hiện.","用于App外已完成的情况（如纸质修改）。依据申请编写版本并发布后会自动完成。"],"dr.done_ok":["Phiếu đã thực hiện","申请已完成"],"dr.do_na":["Đặt Không áp dụng (✕) theo phiếu","依据申请设为不适用（✕）"],"dr.na_confirm":["Đặt {C} là Không áp dụng (✕) theo phiếu {R}? Phiếu thành Đã thực hiện.","依据申请{R}将{C}设为不适用（✕）？申请变为已完成。"],"dr.na_by_req":["Theo phiếu đề nghị hủy {C} đã chấp thuận — phiếu sẽ thành Đã thực hiện. Lý do để trống = ghi số phiếu.","依据已批准的作废申请{C}——申请将变为已完成。理由留空=记录申请单号。"],"dr.do_add_item":["Thêm vào danh mục theo phiếu","依据申请加入目录"],"dr.add_item_note":["Thêm tài liệu mới theo phiếu {C} (đã chấp thuận). Lưu xong soạn phiên bản lần 01 để ban hành.","依据申请{C}（已批准）新增文件。保存后编写第01版并发布。"],"dr.do_version":["Soạn phiên bản theo phiếu","依据申请编写版本"],"dr.open_version":["Mở phiên bản lần {N}","打开第{N}版"],"dr.todo_cancel":["Việc tiếp theo: Thư ký ISO bấm Đặt Không áp dụng theo phiếu.","下一步：体系秘书点击依据申请设为不适用。"],"dr.todo_cancel_open":["Tài liệu đang có phiên bản soạn dở: hủy hoặc ban hành bản đó trước khi đặt Không áp dụng.","文件有未完成版本：设为不适用前请先作废或发布该版本。"],"dr.todo_new":["Việc tiếp theo: Thư ký ISO thêm tài liệu vào danh mục theo phiếu, rồi soạn phiên bản lần 01.","下一步：体系秘书依据申请将文件加入目录，然后编写第01版。"],"dr.todo_version":["Việc tiếp theo: soạn phiên bản theo phiếu → gửi duyệt → ban hành. Ban hành xong phiếu tự thành Đã thực hiện.","下一步：依据申请编写版本→送审→发布。发布后申请自动完成。"],"dr.todo_drafting":["Đang soạn lần {N} theo phiếu: ban hành xong phiếu tự thành Đã thực hiện.","正在依据申请编写第{N}版：发布后申请自动完成。"],"dr.todo_other_open":["Tài liệu đang có phiên bản lần {N} soạn dở (không theo phiếu): ban hành hoặc hủy bản đó trước.","文件有未完成的第{N}版（非依据此申请）：请先发布或作废该版本。"],"dr.wait_secretary":["Chờ Thư ký ISO thực hiện.","等待体系秘书执行。"],"dr.wait_head":["Chờ trưởng bộ phận (hoặc Quản trị) xem xét.","等待部门负责人（或管理员）审核。"],"dr.wait_admin":["Tài liệu cấp công ty: chờ Quản trị (cấp 4) xem xét.","公司级文件：等待管理员（4级）审核。"],"dr.rejected_by":["{U} không chấp thuận lúc {D}","{U}于{D}未批准"],"dr.done_by":["{U} ghi đã thực hiện ngày {D}","{U}于{D}记录已完成"],"dr.cancelled_by":["{U} rút lại ngày {D}","{U}于{D}撤回"],"dr.info":["Nội dung phiếu","申请内容"],"dr.requester":["Người đề nghị","申请人"],"dr.entered_by":["({U} nhập thay)","（{U}代为录入）"],"dr.submitted":["Ngày gửi","提交时间"],"dr.decided":["Chấp thuận","批准"],"dr.version":["Phiên bản theo phiếu","依据申请的版本"],"dr.edit":["Sửa phiếu","修改申请"],"dr.print":["In phiếu (PDF / Excel)","打印申请单（PDF/Excel）"],"dr.card_title":["Phiếu đề nghị","申请单"],"dr.card_none":["Không có phiếu đề nghị đang xử lý.","没有处理中的申请单。"],"dr.card_old_n":["{N} phiếu đã xong / không chấp thuận / rút lại","{N}张已完成/未批准/已撤回"],"dr.ask_revise":["Đề nghị sửa đổi","申请修订"],"dr.ask_cancel":["Đề nghị hủy","申请作废"],"dr.by_request":["Soạn theo phiếu đề nghị","依据申请编写"],"dr.no_request":["Không theo phiếu nào","不依据申请"],"dr.by_request_hint":["Ban hành phiên bản này thì phiếu tự thành Đã thực hiện.","此版本发布后，申请自动变为已完成。"],"dist.card_title":["Bản in đang phát","已分发纸质文件"],"dist.card_cur":["{N} nơi · {C} bản lần {R}","{N}处·第{R}版{C}份"],"dist.card_none":["Chưa ghi phát bản in nào.","尚未登记分发。"],"dist.card_due":["{N} nơi còn giữ bản in lần cũ — cần thu hồi.","{N}处仍持有旧版纸质文件——需收回。"],"dist.issue_btn":["Phát bản in","分发纸质文件"],"dist.view_book":["Sổ phân phối","分发登记表"],"dist.report":["In sổ (PDF / Excel)","打印登记表（PDF/Excel）"],"dist.recipient":["Nơi nhận (bộ phận)","接收部门"],"dist.holder":["Người / vị trí nhận","接收人/位置"],"dist.holder_ph":["vd Tổ in 1 – kệ biểu mẫu","如：印刷1组-表单架"],"dist.copies":["Số bản","份数"],"dist.copies_n":["{N} bản","{N}份"],"dist.date":["Ngày phát","分发日期"],"dist.tab_all":["Tất cả","全部"],"dist.select":["Chọn dòng","选择"],"dist.select_all":["Chọn tất cả","全选"],"dist.recall_n":["Thu hồi {N} dòng đã chọn","收回所选{N}行"],"dist.recall_title":["Thu hồi {N} nơi","收回{N}处"],"dist.recall_btn":["Thu hồi","收回"],"dist.recalled_date":["Ngày thu hồi","收回日期"],"dist.recall_note":["Ghi chú thu hồi","收回备注"],"dist.recall_note_ph":["vd Đã hủy bản cũ","如：旧版已销毁"],"dist.recall_current_note":["Có dòng của lần đang hiệu lực (vd mất, hỏng): ghi chú bắt buộc khi phát lại.","含现行版本行（如遗失、损坏）：重新分发时必须备注。"],"dist.reissue":["Phát luôn bản lần đang hiệu lực cho đúng các nơi này","同时向这些接收处分发现行版本"],"dist.recalled_ok":["Đã thu hồi {N} nơi","已收回{N}处"],"dist.recalled_re_ok":["Đã thu hồi {N} nơi, phát bản mới {M} nơi","已收回{N}处，分发新版{M}处"],"dist.due_rev":["Hiện hành lần {N} (từ {D})","现行第{N}版（自{D}）"],"dist.due_na":["Tài liệu đã ngừng dùng (từ {D})","文件已停用（自{D}）"],"dist.filter_item":["Đang xem sổ của {C}.","正在查看{C}的登记。"],"dist.show_all":["Xem cả sổ","查看全部"],"dist.none":["Không có dòng nào.","没有记录。"],"dist.none_due":["Không có bản in nào cần thu hồi.","没有需收回的纸质文件。"],"dist.how":["Sổ ghi bản in của từng lần ban hành đã phát cho nơi nào. Ban hành lần mới thì bản lần cũ thành Cần thu hồi.","登记各版次纸质文件分发到何处。发布新版后旧版变为需收回。"],"dist.how_sec":["Phát bản in: chi tiết tài liệu → Phát bản in. Ban hành lần mới thì bản lần cũ thành Cần thu hồi: chọn các dòng → Thu hồi (nhập PIN), có thể phát luôn bản lần mới cho đúng các nơi đó. Bấm một dòng để sửa hoặc bỏ dòng ghi nhầm.","分发：文件详情→分发纸质文件。发布新版后旧版变为需收回：选择各行→收回（输入PIN），可同时向这些处分发新版。点击某行可修改或作废误记行。"],"dist.row_title":["Dòng sổ phân phối","分发登记行"],"dist.edit":["Sửa dòng","修改"],"dist.void":["Bỏ dòng này (ghi nhầm)","作废此行（误记）"],"dist.voided_ok":["Đã bỏ dòng ghi nhầm","已作废误记行"],"dist.not_issued":["Chỉ phát bản in của tài liệu đang hiệu lực (●).","仅可分发现行有效（●）文件。"],"dist.existing_n":["Đang có {N} nơi giữ bản in.","目前有{N}处持有纸质文件。"],"dist.no_file_note":["Tài liệu ● nhập từ Excel chưa có tệp PDF trong app — vẫn ghi phát được bản giấy đang dùng.","从Excel导入的●文件在App中尚无PDF——仍可登记正在使用的纸质版。"],"dist.add_row":["Thêm nơi nhận","添加接收处"],"dist.save":["Ghi phát","登记分发"],"dist.issue_note":["Ghi bản in của lần đang hiệu lực đã phát cho từng nơi. Ban hành lần mới thì các dòng này thành Cần thu hồi.","登记现行版本纸质文件分发到各处。发布新版后这些行变为需收回。"],"dist.issued_ok":["Đã ghi phát {N} nơi","已登记分发{N}处"],"dist.will_recall":["{N} nơi đang giữ bản in lần hiện tại — ban hành xong sẽ thành Cần thu hồi (Sổ phân phối).","{N}处持有当前版本纸质文件——发布后变为需收回（分发登记表）。"],"lbl.title":["In tem QR","打印二维码标签"],"lbl.pick":["Chọn biểu đang hiệu lực","选择现行表单"],"lbl.search":["Tìm mã, tên Việt / 中文","搜索编号、名称"],"lbl.pick_all":["Chọn tất cả ({N})","全选（{N}）"],"lbl.none_issued":["Chưa có biểu đang hiệu lực (●) — tem chỉ in cho biểu đã ban hành.","暂无现行（●）表单——仅可为已发布表单打印标签。"],"lbl.options":["Cỡ tem, số tem","标签尺寸、数量"],"lbl.size.S":["70 × 37 mm (24 tem / tờ A4)","70×37毫米（每张A4 24枚）"],"lbl.size.L":["105 × 74 mm (8 tem / tờ A4)","105×74毫米（每张A4 8枚）"],"lbl.copies":["Số tem mỗi biểu","每个表单标签数"],"lbl.start":["Bắt đầu từ ô số (tờ đã dùng dở)","从第几格开始（已用过的标签纸）"],"lbl.summary":["{N} biểu · {T} tem · {P} tờ A4","{N}个表单·{T}枚·{P}张A4"],"lbl.print":["In tem","打印标签"],"lbl.png":["Tải ảnh PNG mã QR","下载二维码PNG"],"lbl.png_one":["Ảnh PNG: chọn đúng một biểu.","PNG图片：请只选一个表单。"],"lbl.print_note":["In từ máy tính (Chrome): khổ A4, Lề: Không, Tỷ lệ: Mặc định (100%), bỏ tích Đầu trang/chân trang. Giấy tem A4 cắt sẵn 70×37 mm (3 × 8) hoặc 105×74 mm (2 × 4). In thử trên giấy thường rồi đặt lên tờ tem soi đèn trước khi in tem thật.","在电脑（Chrome）打印：A4纸，边距：无，缩放：默认（100%），取消页眉页脚。A4预切标签纸70×37毫米（3×8）或105×74毫米（2×4）。先用普通纸试印并与标签纸对光核对，再打印正式标签。"],"lbl.preview":["Xem trước tờ đầu","首页预览"],"lbl.preview_hint":["Chọn biểu ở bên trái để xem trước tem.","在左侧选择表单以预览标签。"],"lbl.rev":["Lần ban hành {N}","第{N}版"],"lbl.issued":["Ban hành {D}","发布{D}"],"lbl.scan_hint":["Quét bằng app ISO để kiểm tra bản hiện hành","用ISO App扫码核对现行版本"],"lbl.load_fail":["Không nạp được bộ tạo mã QR. Tải lại app (có mạng) rồi thử lại.","无法加载二维码生成器。请联网重新加载App后重试。"],"rp.req_log":["Sổ theo dõi phiếu (cả năm)","申请单跟踪表（全年）"],"audit_grp.docreq":["Phiếu đề nghị","文件申请"],"audit_grp.dist":["Phân phối, thu hồi","分发、收回"],"dr.doc_n":["Tài liệu, biểu mẫu ({N} biểu)","文件、表单（{N}个）"],"dr.pick_item":["— Bấm để chọn biểu —","— 点击选择表单 —"],"dr.pick_none":["— Không có biểu nào theo bộ lọc —","— 无符合筛选的表单 —"],"dr.pick_hint":["Lọc Bộ phận và Tình trạng cho danh sách ngắn lại, rồi bấm ô chọn biểu. Cách khác: Danh mục → mở biểu → thẻ Phiếu đề nghị → Đề nghị sửa đổi (biểu được chọn sẵn).","先筛选部门和状态缩短列表，再点击选择表单。也可：目录→打开表单→申请单卡片→申请修订（自动选中该表单）。"],"account.shell":["mã vỏ app","外壳编号"],"health.scope":["Phạm vi áp dụng","适用范围"],"health.templates":["Kho tệp mẫu","模板库"],"nav.templates":["Kho tệp mẫu","模板库"],"tile.templates":["Kho tệp mẫu","模板库"],"cat.no_tpl":["Chưa có tệp mẫu","尚无模板文件"],"imp.n_skip":["Ngoài phạm vi (bỏ qua) {N}","范围外（跳过）{N}"],"imp.act.SKIP":["Ngoài phạm vi","范围外"],"scope.title":["Phạm vi áp dụng","适用范围"],"scope.now":["App đang quản lý biểu, tài liệu của: {D}","应用当前管理以下部门的表单、文件：{D}"],"scope.all":["App đang quản lý biểu, tài liệu của toàn công ty","应用当前管理全公司的表单、文件"],"scope.what":["Biểu, tài liệu của bộ phận ngoài phạm vi được ẩn với mọi người (kể cả Quản trị), không bị xóa: chọn lại bộ phận là hiện lại. Nhập Excel tổng bỏ qua dòng ngoài phạm vi.","范围外部门的表单、文件对所有人隐藏（包括管理员），不会删除：重新选择部门即可恢复显示。导入总表时跳过范围外的行。"],"scope.save":["Lưu phạm vi","保存范围"],"scope.none_all":["Bỏ chọn hết = toàn công ty","全部不选=全公司"],"scope.out":["Ngoài phạm vi","范围外"],"scope.same":["Phạm vi không đổi","范围未变"],"scope.confirm":["Chỉ quản lý biểu, tài liệu của: {D}?","仅管理以下部门的表单、文件：{D}？"],"scope.confirm_all":["Quản lý biểu, tài liệu của toàn công ty?","管理全公司的表单、文件？"],"scope.saved":["Đã lưu phạm vi — dữ liệu trên máy đã tải lại","已保存范围——本机数据已重新加载"],"scope.short":["Phạm vi: {D}","范围：{D}"],"tpl.what":["Tệp mẫu trống để in và điền: bộ biểu Excel đã căn chỉnh khổ giấy (mỗi sheet một biểu), tệp Word / PDF mẫu. Tải về cần mạng.","用于打印和填写的空白模板：已调整纸张的Excel表单集（每个工作表一张表单）、Word/PDF模板。下载需要网络。"],"tpl.scope":["Phạm vi: {D}.","范围：{D}。"],"tpl.search_ph":["Tìm mã biểu, tên Việt / 中文","搜索表单编号、越文/中文名称"],"tpl.summary":["{F} tệp · {S} sheet · {C}/{T} biểu có tệp mẫu","{F}个文件·{S}个工作表·{C}/{T}张表单有模板"],"tpl.files_n":["{N} tệp","{N}个文件"],"tpl.sheets_n":["{N} sheet","{N}个工作表"],"tpl.forms_n":["{N} biểu","{N}张表单"],"tpl.sheet_list":["Các sheet ({N})","工作表（{N}）"],"tpl.uploaded":["Tải lên {D} · {U}","上传于{D}·{U}"],"tpl.replaced_at":["đã thay {D}","已替换于{D}"],"tpl.get":["Tải tệp mẫu","下载模板"],"tpl.get_form":["Tải tệp mẫu","下载模板"],"tpl.get_sheet":["Tải","下载"],"tpl.get_all":["Tải cả tệp","下载整个文件"],"tpl.sub":["sheet phụ","附表"],"tpl.hidden":["ẩn","隐藏"],"tpl.no_item":["Không phải biểu trong danh mục (mục lục, hướng dẫn…)","非目录中的表单（目录、说明等）"],"tpl.o_P":["dọc","纵向"],"tpl.o_L":["ngang","横向"],"tpl.paper_other":["Khổ khác","其他纸张"],"tpl.item_title":["Tệp mẫu","模板文件"],"tpl.item_none":["Chưa có tệp mẫu cho biểu này trong Kho tệp mẫu.","模板库中尚无此表单的模板文件。"],"tpl.print_hint":["Tệp Excel tải về mở sẵn đúng sheet của biểu: Ctrl+P → \"In sheet hiện tại\" (Print Active Sheets), chọn đúng khay A4 / A3 theo khổ đã lưu trong sheet.","下载的Excel文件已自动打开该表单的工作表：Ctrl+P→“打印活动工作表”，按工作表中保存的纸张选择A4/A3纸盒。"],"tpl.empty":["Chưa có tệp mẫu — Thư ký ISO tải lên.","尚无模板文件——由ISO秘书上传。"],"tpl.empty_sec":["Chưa có tệp mẫu. Bấm Tải tệp mẫu lên, chọn một lúc cả bộ tệp Excel (BM-CD-01 … BM-CD-14).","尚无模板文件。点击上传模板，一次选择整套Excel文件（BM-CD-01…BM-CD-14）。"],"tpl.found_n":["{N} sheet khớp","{N}个工作表匹配"],"tpl.none_found":["Không có sheet nào khớp","没有匹配的工作表"],"tpl.missing_n":["Biểu chưa có tệp mẫu ({N})","尚无模板的表单（{N}）"],"tpl.old_n":["Tệp đã thay bằng tệp mới ({N})","已被新文件替换的文件（{N}）"],"tpl.upload":["Tải tệp mẫu lên","上传模板"],"tpl.edit":["Sửa tên","修改名称"],"tpl.title_vi":["Tên bộ (tiếng Việt)","名称（越南文）"],"tpl.title_zh":["Tên bộ (中文)","名称（中文）"],"tpl.saved":["Đã lưu","已保存"],"tpl.delete":["Bỏ tệp","删除文件"],"tpl.delete_q":["Bỏ tệp {F} khỏi Kho tệp mẫu?","从模板库删除文件{F}？"],"tpl.delete_note":["Dùng khi tải nhầm. Tệp mà tệp này đã thay (nếu có) sẽ dùng lại.","用于误传的文件。被此文件替换的旧文件（如有）将恢复使用。"],"tpl.reason_req":["Nhập lý do bỏ tệp","请填写删除原因"],"tpl.deleted":["Đã bỏ tệp","已删除文件"],"tpl.deleted_restored":["Đã bỏ tệp — tệp trước đó dùng lại","已删除文件——之前的文件已恢复使用"],"tpl.server_old":["Máy chủ chưa lên bản có Kho tệp mẫu (2e) — cập nhật máy chủ theo Hướng dẫn triển khai.","服务器尚未更新到含模板库的版本（2e）——请按部署指南更新服务器。"],"tpl.only_sec":["Chỉ Thư ký ISO hoặc Quản trị tải tệp mẫu lên","仅ISO秘书或管理员可上传模板"],"tpl.up_what":["Chọn một hoặc nhiều tệp mẫu (Excel .xlsx nhiều sheet, Word, PDF). App đọc tên sheet và khổ giấy, tự ghép mỗi sheet với biểu cùng mã trong danh mục (sheet phụ a/b, -TD, -TH, -ML thuộc biểu cha).","选择一个或多个模板文件（多工作表Excel .xlsx、Word、PDF）。应用读取工作表名称和纸张，自动将每个工作表与目录中同编号的表单匹配（a/b、-TD、-TH、-ML附表归入主表单）。"],"tpl.up_note":["Tệp cùng bộ (vd BM-CĐ-04) đã có thì tệp mới thay tệp cũ (tệp cũ giữ để tra). Tối đa 10 MB mỗi tệp trên máy tính, 5 MB trên điện thoại.","已有同一套（如BM-CĐ-04）的文件时，新文件替换旧文件（旧文件保留备查）。每个文件电脑最大10 MB，手机5 MB。"],"tpl.pick":["Chọn tệp (chọn được nhiều tệp)","选择文件（可多选）"],"tpl.preview_n":["Tệp đã chọn ({N})","已选文件（{N}）"],"tpl.replaces":["thay {F}","替换{F}"],"tpl.up_go":["Tải lên {N} tệp","上传{N}个文件"],"tpl.up_busy":["Đang tải lên…","上传中…"],"tpl.up_done":["Đã tải lên","已上传"],"tpl.up_ok":["Đã tải lên {N} tệp","已上传{N}个文件"],"tpl.err_type":["Chỉ nhận .xlsx, .xls, .docx, .doc, .pdf","仅支持 .xlsx、.xls、.docx、.doc、.pdf"],"tpl.err_read":["Không đọc được tệp Excel","无法读取Excel文件"],"tpl.err_scope":["Bộ biểu của bộ phận ngoài phạm vi áp dụng","该表单集属于适用范围外的部门"],"audit_grp.tpl":["Kho tệp mẫu","模板库"],"capa.src.EQUIPMENT":["Sự cố, hỏng thiết bị","设备故障"],"capa.src_short.EQUIPMENT":["Sự cố TB","设备故障"],"capa.src.INSPECTION":["Kiểm tra, kiểm định","检查、检定"],"capa.src_short.INSPECTION":["Kiểm tra","检查"],"capa.src.AUDIT":["Đánh giá (nội bộ / bên ngoài)","审核（内部/外部）"],"capa.src_short.AUDIT":["Đánh giá","审核"],"capa.src.SAFETY":["An toàn, môi trường, năng lượng","安全、环境、能源"],"capa.src_short.SAFETY":["An toàn – MT","安全环境"],"capa.src.PROCESS":["Không tuân thủ quy trình","未遵守程序"],"capa.src_short.PROCESS":["Quy trình","程序"],"capa.src.OTHER":["Khác","其他"],"capa.src_short.OTHER":["Khác","其他"],"capa.state.OPEN":["Đang xử lý","处理中","amber"],"capa.state.VERIFYING":["Chờ kiểm tra hiệu lực","待验证有效性","navy"],"capa.state.CLOSED":["Đã đóng","已关闭","green"],"capa.state.CANCELLED":["Đã hủy","已取消","grey"],"capa.overdue":["Quá hạn","逾期","red"],"capa.astate.OPEN":["Chưa xong","未完成","amber"],"capa.astate.DONE":["Đã xong","已完成","green"],"capa.astate.CANCELLED":["Đã bỏ","已取消","grey"],"capa.atype.CORRECTIVE":["Khắc phục","纠正措施","navy"],"capa.atype.PREVENTIVE":["Phòng ngừa","预防措施","grey"],"capa.result.EFFECTIVE":["Có hiệu lực","有效","green"],"capa.result.NOT_EFFECTIVE":["Không hiệu lực","无效","red"],"capa.tab.mine":["Việc của tôi","我的待办"],"capa.tab.open":["Đang xử lý","处理中"],"capa.tab.verify":["Chờ kiểm tra hiệu lực","待验证"],"capa.tab.overdue":["Quá hạn","逾期"],"capa.tab.closed":["Đã đóng","已关闭"],"capa.tab.all":["Tất cả","全部"],"capa.title":["Phiếu khắc phục","纠正措施单"],"capa.new":["Lập phiếu khắc phục","新建纠正措施单"],"capa.edit":["Sửa phiếu khắc phục","修改纠正措施单"],"capa.create":["Lập phiếu","创建单据"],"capa.created_ok":["Đã lập phiếu {C}","已创建单据 {C}"],"capa.log_report":["Sổ theo dõi khắc phục","纠正措施跟踪台账"],"capa.server_old":["Máy chủ chưa lên bản 3a (Khắc phục). Quản trị dán Code.gs mới → chạy migrateSchema → Phiên bản mới.","服务器尚未升级到3a版（纠正措施）。管理员粘贴新Code.gs→运行migrateSchema→新版本。"],"capa.none":["Chưa có phiếu khắc phục nào. Bấm Lập phiếu khắc phục khi phát hiện sự không phù hợp (sự cố thiết bị, kết quả kiểm tra, đánh giá…).","尚无纠正措施单。发现不符合项（设备故障、检查结果、审核等）时点击“新建纠正措施单”。"],"capa.none_tab":["Không có phiếu nào ở mục này.","此项下无单据。"],"capa.how":["Lập phiếu → ghi nguyên nhân gốc và hành động khắc phục (người phụ trách, hạn) → báo xong từng hành động → Gửi kiểm tra hiệu lực → người kiểm tra (Thư ký ISO / trưởng bộ phận) xác nhận Có hiệu lực thì phiếu đóng; Không hiệu lực thì thêm hành động bổ sung. Gmail nhắc người phụ trách 7, 1, 0 ngày trước hạn.","创建单据→填写根本原因和纠正措施（负责人、期限）→逐项报告完成→提交有效性验证→验证人（ISO秘书/部门负责人）确认“有效”则关闭；“无效”则补充措施。邮件在到期前7、1、0天提醒负责人。"],"capa.not_found":["Không tìm thấy phiếu khắc phục (đã hủy hoặc bạn không có quyền xem)","未找到纠正措施单（已取消或您无权查看）"],"capa.no_edit":["Phiếu không sửa được (đã gửi kiểm tra hiệu lực, đã đóng / hủy, hoặc bạn không có quyền)","单据不可修改（已提交验证、已关闭/取消，或您无权限）"],"capa.source":["Nguồn phát hiện","发现来源"],"capa.dept":["Bộ phận chịu trách nhiệm","责任部门"],"capa.found_date":["Ngày phát hiện","发现日期"],"capa.found_by":["Người phát hiện","发现人"],"capa.found_by_hint":["Để trống = người lập phiếu","留空=制单人"],"capa.ref":["Tham chiếu","参考"],"capa.ref_hint":["Số phiếu sửa chữa M&E, mã thiết bị, đợt đánh giá… (nếu có)","机电维修单号、设备编号、审核批次等（如有）"],"capa.item":["Biểu / tài liệu liên quan","相关表单/文件"],"capa.item_none":["— Không có —","— 无 —"],"capa.item_hint":["Biểu nơi phát hiện sự không phù hợp (vd phiếu sửa chữa, checklist bảo trì)","发现不符合项的表单（如维修单、保养检查表）"],"capa.title_f":["Tóm tắt","摘要"],"capa.problem":["Mô tả sự không phù hợp","不符合项描述"],"capa.correction":["Xử lý tức thời","即时处置"],"capa.cause":["Nguyên nhân gốc","根本原因"],"capa.cause_hint":["Phân tích nguyên nhân gốc (5 Why, xương cá…). Có thể ghi sau khi lập phiếu; bắt buộc trước khi gửi kiểm tra hiệu lực.","分析根本原因（5个为什么、鱼骨图等）。可在创建后填写；提交有效性验证前必填。"],"capa.cause_btn":["Ghi nguyên nhân gốc","填写根本原因"],"capa.cause_empty":["Chưa ghi nguyên nhân gốc.","尚未填写根本原因。"],"capa.owner":["Người phụ trách phiếu","单据负责人"],"capa.due_date":["Hạn hoàn thành","完成期限"],"capa.due_before_found":["Hạn hoàn thành phải từ ngày phát hiện trở đi","完成期限不得早于发现日期"],"capa.flow_note":["Phiếu được cấp số KP-yymm-001 khi lưu. Sau đó ghi nguyên nhân gốc, thêm hành động khắc phục, gắn ảnh / tệp ở màn phiếu.","保存时分配编号KP-yymm-001。之后在单据页面填写根本原因、添加纠正措施、附加照片/文件。"],"capa.none_yet":["Chưa có","暂无"],"capa.due_short":["Hạn {D}","期限 {D}"],"capa.verify_due_short":["Kiểm tra hiệu lực {D}","验证期限 {D}"],"capa.acts_n":["{D}/{N} hành động xong","{D}/{N}项措施完成"],"capa.info":["Thông tin phiếu","单据信息"],"capa.created":["Người lập","制单人"],"capa.actions":["Hành động khắc phục / phòng ngừa","纠正/预防措施"],"capa.acts_empty":["Chưa có hành động. Bấm Thêm hành động: nội dung, người phụ trách, hạn.","尚无措施。点击“添加措施”：内容、负责人、期限。"],"capa.acts_cancelled_n":["{N} hành động đã bỏ","{N}项已取消措施"],"capa.act_add":["Thêm hành động","添加措施"],"capa.act_edit":["Sửa hành động","修改措施"],"capa.act_added":["Đã thêm hành động","已添加措施"],"capa.atype":["Loại hành động","措施类型"],"capa.act_content":["Nội dung hành động","措施内容"],"capa.act_owner":["Người phụ trách","负责人"],"capa.act_owner_none":["— Người ngoài app (ghi tên bên dưới) —","— 非应用用户（在下方填写姓名）—"],"capa.assignee":["Người thực hiện (ngoài app)","执行人（非应用用户）"],"capa.assignee_hint":["Ghi tên khi người thực hiện không có tài khoản app. Không chọn ai và không ghi tên = người phụ trách phiếu.","执行人无应用账号时填写姓名。未选择且未填写=单据负责人。"],"capa.act_due":["Hạn","期限"],"capa.act_n":["Hành động {N}","措施{N}"],"capa.act_done":["Báo xong","报告完成"],"capa.act_done_title":["Báo xong hành động {N}","报告措施{N}完成"],"capa.act_done_ok":["Đã báo xong hành động","已报告措施完成"],"capa.act_reopen":["Mở lại","重新打开"],"capa.act_reopen_confirm":["Mở lại hành động {N} (bỏ ngày hoàn thành, giữ kết quả đã ghi)?","重新打开措施{N}（清除完成日期，保留已填写的结果）？"],"capa.act_cancel":["Bỏ hành động","取消措施"],"capa.act_cancelled":["Đã bỏ · {U}","已取消 · {U}"],"capa.done_date":["Ngày hoàn thành","完成日期"],"capa.done_on":["Hoàn thành {D} · {U}","完成于 {D} · {U}"],"capa.result":["Kết quả thực hiện / bằng chứng","执行结果/证据"],"capa.result_hint":["Ghi việc đã làm và bằng chứng (ảnh, tệp gắn ở mục Ảnh / tệp của phiếu). Nhập một thứ tiếng.","填写已完成的工作及证据（照片、文件附在单据的“照片/文件”栏）。填写一种语言即可。"],"capa.round_n":["bổ sung sau lần kiểm tra {N}","第{N}次验证后补充"],"capa.need_content":["Nhập nội dung hành động","请填写措施内容"],"capa.need_due":["Chọn hạn của hành động","请选择措施期限"],"capa.need_result":["Nhập kết quả thực hiện","请填写执行结果"],"capa.files":["Ảnh / tệp","照片/文件"],"capa.files_none":["Chưa có ảnh / tệp. Gắn ảnh hiện trường, bằng chứng thực hiện, biên bản…","尚无照片/文件。可附现场照片、执行证据、记录等。"],"capa.files_add":["Thêm ảnh / tệp","添加照片/文件"],"capa.files_added":["Đã thêm {N} ảnh / tệp (gửi khi có mạng)","已添加{N}个照片/文件（联网时发送）"],"capa.too_many_files":["Mỗi phiếu tối đa 30 ảnh / tệp","每张单最多30个照片/文件"],"capa.complete":["Gửi kiểm tra hiệu lực","提交有效性验证"],"capa.complete_confirm":["Mọi hành động đã xong. Gửi phiếu sang Chờ kiểm tra hiệu lực?","所有措施已完成。将单据提交为“待验证有效性”？"],"capa.complete_note":["Hạn kiểm tra hiệu lực mặc định sau {N} ngày (đủ thời gian để thấy sự không phù hợp có lặp lại không). Người kiểm tra nhận Gmail nhắc 7, 1, 0 ngày trước hạn.","有效性验证期限默认{N}天后（留足时间观察不符合项是否再次发生）。验证人在到期前7、1、0天收到邮件提醒。"],"capa.completed_ok":["Đã gửi kiểm tra hiệu lực","已提交有效性验证"],"capa.uncomplete":["Mở lại để thêm hành động","重新打开以添加措施"],"capa.uncomplete_confirm":["Đưa phiếu về Đang xử lý để thêm / sửa hành động (chưa kiểm tra hiệu lực)?","将单据退回“处理中”以添加/修改措施（尚未验证）？"],"capa.need_cause":["Cần ghi nguyên nhân gốc trước khi gửi kiểm tra hiệu lực.","提交有效性验证前须填写根本原因。"],"capa.need_done":["Còn hành động chưa xong: báo xong hoặc bỏ trước khi gửi kiểm tra hiệu lực.","仍有未完成的措施：提交验证前请先完成或取消。"],"capa.need_action":["Cần ít nhất một hành động khắc phục đã xong.","至少需要一项已完成的纠正措施。"],"capa.verify":["Kiểm tra hiệu lực","验证有效性"],"capa.verify_title":["Kiểm tra hiệu lực lần {N}","第{N}次有效性验证"],"capa.verify_note_hint":["Xem lại sau thời gian theo dõi: sự không phù hợp có lặp lại không, hành động có loại bỏ được nguyên nhân không. Có hiệu lực → phiếu đóng; Không hiệu lực → phiếu về Đang xử lý để thêm hành động bổ sung. Hỏi PIN.","跟踪期后复查：不符合项是否再次发生、措施是否消除原因。有效→关闭；无效→退回“处理中”补充措施。需输入PIN。"],"capa.verify_date":["Ngày kiểm tra","验证日期"],"capa.verify_note":["Nhận xét kiểm tra hiệu lực","有效性验证意见"],"capa.verify_save":["Lưu kết quả","保存结果"],"capa.verify_sec":["Kiểm tra hiệu lực","有效性验证"],"capa.verify_due":["Hạn kiểm tra hiệu lực","有效性验证期限"],"capa.verify_n":["Lần kiểm tra {N}","第{N}次验证"],"capa.need_verify_result":["Chọn Có hiệu lực hoặc Không hiệu lực","请选择“有效”或“无效”"],"capa.need_verify_note":["Nhập nhận xét kiểm tra hiệu lực","请填写验证意见"],"capa.closed_ok":["Đã đóng phiếu (có hiệu lực)","已关闭单据（有效）"],"capa.reopened_ok":["Không hiệu lực: phiếu về Đang xử lý — thêm hành động bổ sung","无效：单据退回“处理中”——请补充措施"],"capa.wait_verify":["Chờ Thư ký ISO / trưởng bộ phận kiểm tra hiệu lực (hạn {D}).","等待ISO秘书/部门负责人验证有效性（期限{D}）。"],"capa.verifying_note":["Đã xong hành động — chờ kiểm tra hiệu lực, hạn {D}.","措施已完成——等待有效性验证，期限{D}。"],"capa.not_effective_note":["Lần kiểm tra {N} ({D}) không hiệu lực — thêm hành động bổ sung rồi gửi kiểm tra lại","第{N}次验证（{D}）无效——请补充措施后重新提交验证"],"capa.closed_by":["Đã đóng: có hiệu lực — {U}, {D}","已关闭：有效——{U}，{D}"],"capa.cancelled_by":["Đã hủy bởi {U}, {D}","已由{U}于{D}取消"],"capa.cancel":["Hủy phiếu","取消单据"],"capa.cancel_note":["Chỉ hủy phiếu lập nhầm / trùng. Sự không phù hợp có thật thì xử lý đến khi đóng. Hỏi PIN.","仅取消误建/重复的单据。真实的不符合项应处理至关闭。需输入PIN。"],"capa.cancelled_ok":["Đã hủy phiếu","已取消单据"],"capa.print":["In phiếu khắc phục (PDF / Excel)","打印纠正措施单（PDF/Excel）"],"capa.card_title":["Khắc phục","纠正措施"],"capa.card_form":["Biểu này được lập trong app: {N} phiếu khắc phục.","本表单在应用中填写：{N}张纠正措施单。"],"capa.card_none":["Chưa có phiếu khắc phục liên quan đến biểu này.","尚无与本表单相关的纠正措施单。"],"capa.card_old_n":["{N} phiếu đã đóng / hủy","{N}张已关闭/取消"],"capa.tile_open":["{N} đang mở","{N}张未关闭"],"capa.tile_late":["{N} đang mở · {L} quá hạn","{N}张未关闭·{L}张逾期"],"capa.src.COMPLAINT":["Khiếu nại khách hàng (8D)","客户投诉（8D）","red"],"capa.src_short.COMPLAINT":["Khiếu nại","投诉"],"capa.src.SUPPLIER":["Nhà cung cấp, nhà thầu (SCAR)","供应商、承包商（SCAR）","amber"],"capa.src_short.SUPPLIER":["SCAR","SCAR"],"capa.kind":["Loại phiếu","单据类型"],"capa.kind.ALL":["Tất cả","全部"],"capa.kind.INTERNAL":["Khắc phục nội bộ","内部纠正措施"],"capa.kind.COMPLAINT":["Khiếu nại khách hàng","客户投诉"],"capa.kind.SUPPLIER":["SCAR nhà cung cấp","供应商SCAR"],"capa.kind_note.COMPLAINT":["Khiếu nại của khách hàng xử lý theo 8D: D1 nhóm · D2 mô tả · D3 ngăn chặn tạm thời · D4 nguyên nhân gốc · D5–D7 hành động khắc phục, phòng ngừa · D8 phản hồi khách hàng, kiểm tra hiệu lực, đóng. In phiếu tiếp nhận và báo cáo 8D từ màn phiếu.","客户投诉按8D处理：D1成立小组·D2问题描述·D3临时围堵·D4根本原因·D5–D7纠正、预防措施·D8回复客户、验证有效性、关闭。可在单据页面打印受理单和8D报告。"],"capa.kind_note.SUPPLIER":["Yêu cầu nhà cung cấp / nhà thầu khắc phục (SCAR): gửi SCAR → nhà cung cấp trả lời nguyên nhân và hành động → theo dõi thực hiện → kiểm tra hiệu lực (vd các lô giao sau) → đóng.","要求供应商/承包商纠正（SCAR）：发出SCAR→供应商回复原因及措施→跟踪实施→验证有效性（如后续交货批次）→关闭。"],"capa.new.COMPLAINT":["Tiếp nhận khiếu nại","受理投诉"],"capa.new.SUPPLIER":["Lập SCAR","开具SCAR"],"capa.edit.COMPLAINT":["Sửa phiếu khiếu nại","修改投诉单"],"capa.edit.SUPPLIER":["Sửa phiếu SCAR","修改SCAR"],"capa.title.COMPLAINT":["Khiếu nại khách hàng (8D)","客户投诉（8D）"],"capa.title.SUPPLIER":["SCAR nhà cung cấp","供应商SCAR"],"capa.log_report.COMPLAINT":["Sổ theo dõi khiếu nại","投诉跟踪台账"],"capa.log_report.SUPPLIER":["Sổ theo dõi SCAR","SCAR跟踪台账"],"capa.none.COMPLAINT":["Chưa có khiếu nại khách hàng nào. Bấm Tiếp nhận khiếu nại khi khách hàng phản ánh về sản phẩm, giao hàng…","尚无客户投诉。客户反映产品、交货等问题时，点击“受理投诉”。"],"capa.none.SUPPLIER":["Chưa có SCAR nào. Bấm Lập SCAR khi vật tư, dịch vụ của nhà cung cấp / nhà thầu không đạt.","尚无SCAR。供应商/承包商的物料、服务不合格时，点击“开具SCAR”。"],"capa.how.COMPLAINT":["Tiếp nhận khiếu nại → ngăn chặn tạm thời (D3) → nguyên nhân gốc, nguyên nhân lọt (D4) → hành động khắc phục, phòng ngừa (D5–D7) → Ghi phản hồi khách hàng → Gửi kiểm tra hiệu lực → Có hiệu lực thì đóng (D8). Khiếu nại không có cơ sở: ghi kết luận, phản hồi khách hàng rồi xác nhận đóng.","受理投诉→临时围堵（D3）→根本原因、流出原因（D4）→纠正、预防措施（D5–D7）→记录回复客户→提交有效性验证→有效则关闭（D8）。投诉不成立：填写结论、回复客户后确认关闭。"],"capa.how.SUPPLIER":["Lập SCAR → gửi nhà cung cấp (ghi ngày gửi) → Ghi trả lời của nhà cung cấp → ghi nguyên nhân và hành động theo trả lời (người thực hiện ngoài app = tên nhà cung cấp) → báo xong → Gửi kiểm tra hiệu lực → Có hiệu lực thì đóng.","开具SCAR→发给供应商（记录发出日期）→记录供应商回复→按回复填写原因和措施（非应用执行人=供应商名称）→报告完成→提交有效性验证→有效则关闭。"],"capa.found_date.COMPLAINT":["Ngày tiếp nhận","受理日期"],"capa.found_date.SUPPLIER":["Ngày phát hiện","发现日期"],"capa.found_by.COMPLAINT":["Người tiếp nhận","受理人"],"capa.ref.COMPLAINT":["Số khiếu nại của khách / tham chiếu","客户投诉编号/参考"],"capa.ref_hint.COMPLAINT":["Số thư / email khiếu nại của khách, số phiếu giao hàng… (nếu có)","客户投诉函/邮件编号、送货单号等（如有）"],"capa.ref_hint.SUPPLIER":["Số phiếu nhập kho, biên bản kiểm tra đầu vào, phiếu sửa chữa M&E… (nếu có)","入库单号、进料检验记录、机电维修单号等（如有）"],"capa.party.COMPLAINT":["Khách hàng","客户"],"capa.party.SUPPLIER":["Nhà cung cấp / nhà thầu","供应商/承包商"],"capa.party_name.COMPLAINT":["Tên khách hàng","客户名称"],"capa.party_name.SUPPLIER":["Tên nhà cung cấp / nhà thầu","供应商/承包商名称"],"capa.party_contact":["Người liên hệ","联系人"],"capa.party_contact_hint":["Tên, điện thoại / email","姓名、电话/邮箱"],"capa.product.COMPLAINT":["Sản phẩm","产品"],"capa.product.SUPPLIER":["Vật tư / dịch vụ","物料/服务"],"capa.lot.COMPLAINT":["Số lô / đơn hàng","批号/订单号"],"capa.lot.SUPPLIER":["Số PO / lô / hợp đồng","采购单/批号/合同号"],"capa.qty":["Số lượng bị ảnh hưởng","受影响数量"],"capa.qty_hint":["vd 2.000 tờ, 3 cuộn, 1 bộ","如2000张、3卷、1套"],"capa.sent_date":["Ngày gửi SCAR","SCAR发出日期"],"capa.sent_date_hint":["Ngày gửi SCAR cho nhà cung cấp (email, thư). Để trống khi chưa gửi.","SCAR发给供应商的日期（邮件、函件）。未发出时留空。"],"capa.reply_due.COMPLAINT":["Hạn phản hồi khách hàng","回复客户期限"],"capa.reply_due.SUPPLIER":["Hạn nhà cung cấp trả lời","供应商回复期限"],"capa.reply_due_hint.COMPLAINT":["Mặc định {N} ngày sau ngày tiếp nhận. Người phụ trách nhận Gmail nhắc 7, 1, 0 ngày trước hạn.","默认受理日后{N}天。负责人在到期前7、1、0天收到邮件提醒。"],"capa.reply_due_hint.SUPPLIER":["Mặc định {N} ngày sau ngày phát hiện. Người phụ trách nhận Gmail nhắc để đôn đốc nhà cung cấp.","默认发现日后{N}天。负责人收到邮件提醒以催促供应商。"],"capa.reply_due_short.COMPLAINT":["Phản hồi KH {D}","回复客户 {D}"],"capa.reply_due_short.SUPPLIER":["NCC trả lời {D}","供应商回复 {D}"],"capa.severity":["Mức độ","严重程度"],"capa.sev.MINOR":["Nhẹ","轻微","grey"],"capa.sev.MAJOR":["Nặng","严重","amber"],"capa.sev.CRITICAL":["Nghiêm trọng","致命","red"],"capa.valid":["Đánh giá khiếu nại","投诉评估"],"capa.valid.PENDING":["Chưa kết luận","未结论","grey"],"capa.valid.YES":["Có cơ sở","成立","amber"],"capa.valid.NO":["Không có cơ sở","不成立","green"],"capa.valid_hint":["Không có cơ sở (không phải lỗi của công ty): không bắt buộc hành động khắc phục — ghi kết luận điều tra ở Nguyên nhân, phản hồi khách hàng rồi gửi xác nhận đóng.","不成立（非本公司责任）：不强制纠正措施——在“原因”中填写调查结论，回复客户后提交确认关闭。"],"capa.valid_no_note":["Khiếu nại không có cơ sở: không bắt buộc hành động khắc phục. Ghi kết luận điều tra, phản hồi khách hàng rồi Gửi kiểm tra hiệu lực để xác nhận đóng.","投诉不成立：不强制纠正措施。填写调查结论、回复客户后提交有效性验证以确认关闭。"],"capa.team":["Nhóm 8D (D1)","8D小组（D1）"],"capa.team_hint":["Tên các thành viên, cách nhau dấu phẩy (vd QA, sản xuất, cơ điện)","成员姓名，用逗号分隔（如质量、生产、机电）"],"capa.team_lead":["Trưởng nhóm","组长"],"capa.problem.COMPLAINT":["Nội dung khiếu nại / mô tả vấn đề (D2)","投诉内容/问题描述（D2）"],"capa.correction.COMPLAINT":["Hành động ngăn chặn tạm thời (D3)","临时围堵措施（D3）"],"capa.correction.SUPPLIER":["Yêu cầu ngăn chặn / xử lý tức thời","围堵/即时处置要求"],"capa.cause.COMPLAINT":["Nguyên nhân gốc / kết luận điều tra (D4)","根本原因/调查结论（D4）"],"capa.cause.SUPPLIER":["Nguyên nhân gốc (theo trả lời của nhà cung cấp)","根本原因（按供应商回复）"],"capa.cause_hint.COMPLAINT":["Nguyên nhân gốc vì sao lỗi xảy ra (5 Why, xương cá…); khiếu nại không có cơ sở thì ghi kết luận điều tra. Bắt buộc trước khi gửi kiểm tra hiệu lực.","问题发生的根本原因（5个为什么、鱼骨图等）；投诉不成立则填写调查结论。提交有效性验证前必填。"],"capa.cause_hint.SUPPLIER":["Ghi nguyên nhân gốc nhà cung cấp phân tích trong thư trả lời; chưa đạt thì yêu cầu họ phân tích lại. Bắt buộc trước khi gửi kiểm tra hiệu lực.","填写供应商在回复中分析的根本原因；不充分则要求其重新分析。提交有效性验证前必填。"],"capa.cause_btn.COMPLAINT":["Ghi nguyên nhân / kết luận","填写原因/结论"],"capa.cause_empty.COMPLAINT":["Chưa ghi nguyên nhân gốc / kết luận điều tra.","尚未填写根本原因/调查结论。"],"capa.need_cause.COMPLAINT":["Cần ghi nguyên nhân gốc / kết luận điều tra trước khi gửi kiểm tra hiệu lực.","提交有效性验证前须填写根本原因/调查结论。"],"capa.escape":["Nguyên nhân lọt (vì sao không phát hiện)","流出原因（为何未发现）"],"capa.escape_hint":["Vì sao lỗi không bị phát hiện trước khi tới khách hàng / trước khi nhập kho. Tùy chọn, nhập một thứ tiếng.","为何缺陷在到达客户/入库前未被发现。选填，填写一种语言即可。"],"capa.owner.COMPLAINT":["Người phụ trách (trưởng nhóm 8D)","负责人（8D组长）"],"capa.owner.SUPPLIER":["Người phụ trách SCAR","SCAR负责人"],"capa.actions.COMPLAINT":["D5–D7. Hành động khắc phục / phòng ngừa","D5–D7. 纠正/预防措施"],"capa.actions.SUPPLIER":["Hành động khắc phục / phòng ngừa của nhà cung cấp","供应商的纠正/预防措施"],"capa.replied":["Đã phản hồi","已回复","green"],"capa.reply.COMPLAINT":["Phản hồi khách hàng","回复客户"],"capa.reply.SUPPLIER":["Trả lời của nhà cung cấp","供应商回复"],"capa.reply_btn.COMPLAINT":["Ghi phản hồi khách hàng","记录回复客户"],"capa.reply_btn.SUPPLIER":["Ghi trả lời của nhà cung cấp","记录供应商回复"],"capa.reply_hint.COMPLAINT":["Ghi ngày và nội dung đã phản hồi khách hàng (thư, email, báo cáo 8D gửi khách…). Bắt buộc trước khi đóng phiếu.","填写回复客户的日期和内容（函件、邮件、发给客户的8D报告等）。关闭单据前必填。"],"capa.reply_hint.SUPPLIER":["Ghi ngày nhà cung cấp trả lời SCAR và tóm tắt nội dung (nguyên nhân, hành động họ cam kết). Sau đó ghi nguyên nhân và hành động vào phiếu.","填写供应商回复SCAR的日期并摘要内容（原因、承诺措施）。然后将原因和措施填入单据。"],"capa.reply_date.COMPLAINT":["Ngày phản hồi","回复日期"],"capa.reply_date.SUPPLIER":["Ngày nhà cung cấp trả lời","供应商回复日期"],"capa.reply_note.COMPLAINT":["Nội dung phản hồi khách hàng","回复客户的内容"],"capa.reply_note.SUPPLIER":["Tóm tắt trả lời của nhà cung cấp","供应商回复摘要"],"capa.reply_ok.COMPLAINT":["Đã ghi phản hồi khách hàng","已记录回复客户"],"capa.reply_ok.SUPPLIER":["Đã ghi trả lời của nhà cung cấp","已记录供应商回复"],"capa.reply_wait.COMPLAINT":["Chưa phản hồi khách hàng — hạn {D}","尚未回复客户——期限{D}"],"capa.reply_wait.SUPPLIER":["Chờ nhà cung cấp trả lời — hạn {D}","等待供应商回复——期限{D}"],"capa.reply_late.COMPLAINT":["Chưa phản hồi khách hàng — quá hạn {D}","尚未回复客户——已逾期{D}"],"capa.reply_late.SUPPLIER":["Nhà cung cấp chưa trả lời — quá hạn {D}","供应商尚未回复——已逾期{D}"],"capa.reply_undo":["Bỏ phản hồi","撤销回复"],"capa.reply_undo_confirm.COMPLAINT":["Bỏ phản hồi khách hàng đã ghi (ghi nhầm)? Phiếu sẽ lại chờ phản hồi.","撤销已记录的客户回复（误记）？单据将重新等待回复。"],"capa.reply_undo_confirm.SUPPLIER":["Bỏ trả lời của nhà cung cấp đã ghi (ghi nhầm)? Phiếu sẽ lại chờ nhà cung cấp trả lời.","撤销已记录的供应商回复（误记）？单据将重新等待供应商回复。"],"capa.need_reply_date":["Chọn ngày phản hồi","请选择回复日期"],"capa.need_reply_note.COMPLAINT":["Nhập nội dung phản hồi khách hàng","请填写回复客户的内容"],"capa.need_reply_note.SUPPLIER":["Nhập tóm tắt trả lời của nhà cung cấp","请填写供应商回复摘要"],"capa.need_reply.COMPLAINT":["Chưa ghi phản hồi khách hàng — ghi phản hồi trước khi đóng phiếu (Có hiệu lực).","尚未记录回复客户——关闭单据（有效）前请先记录回复。"],"capa.need_reply.SUPPLIER":["Chưa ghi trả lời của nhà cung cấp — ghi trước khi đóng phiếu (Có hiệu lực).","尚未记录供应商回复——关闭单据（有效）前请先记录。"],"capa.verify_note_hint_no":["Khiếu nại không có cơ sở: xác nhận kết luận điều tra và phản hồi khách hàng đã gửi. Có hiệu lực → đóng phiếu.","投诉不成立：确认调查结论及已回复客户。有效→关闭单据。"],"capa.print.CAR":["In phiếu khắc phục (PDF / Excel)","打印纠正措施单（PDF/Excel）"],"capa.print.RECEIPT":["In phiếu tiếp nhận khiếu nại","打印投诉受理单"],"capa.print.D8":["In báo cáo 8D","打印8D报告"],"capa.print.SCAR":["In phiếu SCAR","打印SCAR"],"home.pend_capa_reply":["{N} khiếu nại / SCAR của bạn sắp đến hạn hoặc quá hạn phản hồi","您负责的{N}张投诉/SCAR即将到期或已逾期未回复"],"rpt.f.capa_form":["Mẫu in","打印格式"],"rpt.capa_form.CAR":["Phiếu khắc phục","纠正措施单"],"rpt.capa_form.RECEIPT":["Phiếu tiếp nhận khiếu nại","投诉受理单"],"rpt.capa_form.D8":["Báo cáo 8D","8D报告"],"rpt.capa_form.SCAR":["Phiếu SCAR","SCAR"],"rpt.f.capa_source":["Loại phiếu","单据类型"],"rpt.capa_source.ALL":["Tất cả","全部"],"rpt.capa_source.INTERNAL":["Khắc phục nội bộ","内部纠正措施"],"rpt.capa_source.COMPLAINT":["Khiếu nại khách hàng","客户投诉"],"rpt.capa_source.SUPPLIER":["SCAR nhà cung cấp","供应商SCAR"],"rpt.title.CAPA_RECEIPT":["Phiếu tiếp nhận khiếu nại khách hàng","客户投诉受理单"],"rpt.title.CAPA_D8":["Báo cáo 8D xử lý khiếu nại khách hàng","客户投诉8D处理报告"],"rpt.title.CAPA_SCAR":["Phiếu yêu cầu khắc phục nhà cung cấp (SCAR)","供应商纠正措施要求单（SCAR）"],"rpt.title.CAPA_LOG_COMPLAINT":["Sổ theo dõi khiếu nại khách hàng","客户投诉跟踪台账"],"rpt.title.CAPA_LOG_SUPPLIER":["Sổ theo dõi yêu cầu khắc phục nhà cung cấp (SCAR)","供应商纠正措施（SCAR）跟踪台账"],"rpt.t.capa_reply.COMPLAINT":["Phản hồi khách hàng","回复客户"],"rpt.t.capa_reply.SUPPLIER":["Nhà cung cấp trả lời","供应商回复"],"rpt.capa_no_reply":["Chưa · hạn {D}","未回复 · 期限{D}"],"rpt.capa_not_yet":["Chưa","未"],"rpt.sec.rcpt_info":["1. Thông tin khiếu nại","1. 投诉信息"],"rpt.sec.rcpt_problem":["2. Nội dung khiếu nại","2. 投诉内容"],"rpt.sec.rcpt_first":["3. Xử lý ban đầu","3. 初步处理"],"rpt.sign.rcpt_by":["Người tiếp nhận","受理人"],"rpt.sign.rcpt_owner":["Người phụ trách xử lý","处理负责人"],"rpt.sec.d0":["D0. Thông tin khiếu nại","D0. 投诉信息"],"rpt.sec.d1":["D1. Lập nhóm","D1. 成立小组"],"rpt.sec.d2":["D2. Mô tả vấn đề","D2. 问题描述"],"rpt.sec.d3":["D3. Hành động ngăn chặn tạm thời","D3. 临时围堵措施"],"rpt.sec.d4":["D4. Nguyên nhân gốc","D4. 根本原因"],"rpt.sec.d56":["D5–D6. Hành động khắc phục và xác nhận","D5–D6. 纠正措施及验证"],"rpt.sec.d7":["D7. Phòng ngừa tái diễn","D7. 预防再发生"],"rpt.sec.d8":["D8. Phản hồi khách hàng, kiểm tra hiệu lực và đóng","D8. 回复客户、有效性验证及关闭"],"rpt.sign.d8_lead":["Trưởng nhóm 8D","8D组长"],"rpt.kv.scar_no":["Số SCAR","SCAR编号"],"rpt.kv.scar_request":["Yêu cầu","要求"],"rpt.scar_request":["Nhà cung cấp phân tích nguyên nhân gốc, đề xuất hành động khắc phục / phòng ngừa và trả lời trước {D}","供应商须分析根本原因、提出纠正/预防措施，并于{D}前回复"],"rpt.sec.scar_info":["1. Thông tin SCAR","1. SCAR信息"],"rpt.sec.scar_nc":["2. Sự không phù hợp","2. 不符合项"],"rpt.sec.scar_reply":["3. Trả lời của nhà cung cấp","3. 供应商回复"],"rpt.sec.scar_actions":["4. Hành động khắc phục / phòng ngừa","4. 纠正/预防措施"],"rpt.sec.scar_verify":["5. Kiểm tra hiệu lực","5. 有效性验证"],"rpt.sign.scar_by":["Người lập SCAR","SCAR开具人"],"rpt.sign.scar_supplier":["Đại diện nhà cung cấp","供应商代表"],"rpt.note.capa_party":["Quá hạn: chưa phản hồi mà quá hạn phản hồi, phiếu đang xử lý quá hạn hoàn thành hoặc có hành động quá hạn, phiếu chờ kiểm tra quá hạn kiểm tra hiệu lực.","逾期：超过回复期限未回复、处理中单据超过完成期限或有逾期措施、待验证单据超过验证期限。"],"mail.kind.CAPA_REPLY":["Khiếu nại / SCAR đến hạn phản hồi","投诉/SCAR回复到期"],"mail.kind_short.CAPA_REPLY":["Phản hồi","回复","amber"],"mail.rule.CAPA_REPLY":["Khiếu nại khách hàng / SCAR chưa phản hồi → người phụ trách phiếu: 7, 1 và 0 ngày trước hạn phản hồi; quá hạn nhắc mỗi 7 ngày.","客户投诉/SCAR未回复→单据负责人：回复期限前7、1、0天提醒；逾期每7天提醒一次。"],"mail.due.CAPA_REPLY":["Hạn phản hồi {D}","回复期限 {D}"],"mail.capa_reply_customer":["Phản hồi khách hàng {P}","回复客户{P}"],"mail.capa_reply_supplier":["Chờ nhà cung cấp {P} trả lời SCAR — đôn đốc nhà cung cấp, ghi trả lời vào phiếu","等待供应商{P}回复SCAR——请催促供应商并在单据中记录回复"],"home.pend_capa_acts":["{N} hành động khắc phục của bạn đến hạn / quá hạn","您有{N}项纠正措施到期/逾期"],"home.pend_capa_verify":["{N} phiếu khắc phục chờ bạn kiểm tra hiệu lực","{N}张纠正措施单待您验证有效性"],"home.pend_capa_owner":["{N} phiếu khắc phục của bạn chưa có hành động đang mở (lập kế hoạch / gửi kiểm tra hiệu lực)","您负责的{N}张纠正措施单无进行中措施（需制定计划/提交验证）"],"rpt.kind.CAPA":["Khắc phục","纠正措施"],"rpt.desc.CAPA":["Một phiếu khắc phục / khiếu nại 8D / SCAR để in ký, hoặc sổ theo dõi cả năm: nguyên nhân, hành động, hạn, phản hồi, kiểm tra hiệu lực.","单张纠正措施单/投诉8D/SCAR（打印签字），或全年跟踪台账：原因、措施、期限、回复、有效性验证。"],"rpt.title.CAPA":["Phiếu yêu cầu hành động khắc phục","纠正措施要求单"],"rpt.title.CAPA_LOG":["Sổ theo dõi hành động khắc phục","纠正措施跟踪台账"],"rp.capa_log":["Sổ theo dõi khắc phục (cả năm)","纠正措施跟踪台账（全年）"],"rpt.f.capa":["Phiếu khắc phục","纠正措施单"],"rpt.f.capa_state":["Tình trạng","状态"],"rpt.capa_state.ALL":["Tất cả (kể cả đã hủy)","全部（含已取消）"],"rpt.capa_state.OPEN":["Đang xử lý","处理中"],"rpt.capa_state.OVERDUE":["Quá hạn","逾期"],"rpt.capa_state.VERIFYING":["Chờ kiểm tra hiệu lực","待验证"],"rpt.capa_state.CLOSED":["Đã đóng","已关闭"],"rpt.t.capa_state":["Tình trạng","状态"],"rpt.t.capa_due":["Hạn hoàn thành","完成期限"],"rpt.t.capa_actions":["Hành động xong","已完成措施"],"rpt.t.capa_verify":["Kiểm tra hiệu lực","有效性验证"],"rpt.t.capa_total":["Số phiếu","单据数"],"rpt.t.capa_open":["Chưa đóng","未关闭"],"rpt.t.capa_overdue":["Quá hạn","逾期"],"rpt.t.capa_closed":["Đã đóng","已关闭"],"rpt.capa_verify_due":["Hạn kiểm tra {D}","验证期限 {D}"],"rpt.kv.capa_no":["Số phiếu","单号"],"rpt.kv.capa_closed":["Ngày đóng phiếu","关闭日期"],"rpt.sec.capa_nc":["1. Sự không phù hợp","1. 不符合项"],"rpt.sec.capa_cause":["2. Phân tích nguyên nhân","2. 原因分析"],"rpt.sec.capa_actions":["3. Hành động khắc phục / phòng ngừa","3. 纠正/预防措施"],"rpt.sec.capa_verify":["4. Kiểm tra hiệu lực","4. 有效性验证"],"rpt.col.capa_type":["Loại","类型"],"rpt.col.capa_action":["Hành động","措施"],"rpt.col.capa_owner":["Phụ trách","负责人"],"rpt.col.capa_due":["Hạn","期限"],"rpt.col.capa_done":["Hoàn thành","完成日期"],"rpt.col.capa_result":["Kết quả","结果"],"rpt.col.capa_no":["Số phiếu","单号"],"rpt.col.capa_cause":["Nguyên nhân","原因"],"rpt.col.capa_progress":["Hành động xong","措施完成"],"rpt.col.capa_verify":["Hiệu lực","有效性"],"rpt.capa_files":["Phiếu có {N} ảnh / tệp bằng chứng lưu trong app ISO.","本单在ISO应用中存有{N}个照片/文件证据。"],"rpt.capa_n":["{N} phiếu","{N}张"],"rpt.note.capa":["Quá hạn: phiếu đang xử lý quá hạn hoàn thành hoặc có hành động quá hạn; phiếu chờ kiểm tra quá hạn kiểm tra hiệu lực.","逾期：处理中的单据超过完成期限或有措施逾期；待验证单据超过验证期限。"],"rpt.sign.capa_owner":["Người phụ trách","负责人"],"rpt.sign.capa_verifier":["Người kiểm tra hiệu lực","有效性验证人"],"mail.kind.CAPA_DUE":["Hành động khắc phục đến hạn","纠正措施到期"],"mail.kind.CAPA_VERIFY":["Kiểm tra hiệu lực khắc phục đến hạn","纠正措施有效性验证到期"],"mail.kind_short.CAPA_DUE":["Khắc phục","纠正措施","red"],"mail.kind_short.CAPA_VERIFY":["Kiểm tra hiệu lực","有效性验证","navy"],"mail.rule.CAPA_DUE":["Hành động khắc phục đến hạn → người phụ trách hành động (không có thì người phụ trách phiếu): 7, 1 và 0 ngày trước hạn; quá hạn nhắc mỗi 7 ngày.","纠正措施到期→措施负责人（无则单据负责人）：到期前7、1、0天；逾期后每7天提醒。"],"mail.rule.CAPA_VERIFY":["Hạn kiểm tra hiệu lực → trưởng bộ phận / Thư ký ISO: 7, 1 và 0 ngày trước hạn; quá hạn nhắc mỗi 7 ngày.","有效性验证期限→部门负责人/ISO秘书：到期前7、1、0天；逾期后每7天提醒。"],"mail.due.CAPA_DUE":["Hạn {D}","期限 {D}"],"mail.due.CAPA_VERIFY":["Hạn kiểm tra {D}","验证期限 {D}"],"mail.capa_whole_plan":["Phiếu chưa có hành động khắc phục — lập kế hoạch hành động","单据尚无纠正措施——请制定措施计划"],"mail.capa_whole_done":["Hành động đã xong — ghi nguyên nhân gốc (nếu chưa) và bấm Gửi kiểm tra hiệu lực","措施已完成——填写根本原因（如未填）并点击“提交有效性验证”"],"mail.capa_verify_n":["Kiểm tra hiệu lực lần {N}","第{N}次有效性验证"],"health.capa":["Khắc phục","纠正措施"],"audit_grp.capa":["Khắc phục","纠正措施"]};
