/* =====================================================================
 * ISO · 体系管理 — máy chủ Google Apps Script
 * 00_config: hằng số, Settings mặc định, khóa SystemState, danh mục mã cố định
 * Lõi (PIN, phiên, ghi có xác nhận, đồng bộ, hàng chờ offline) chép từ app Checksheet (lõi M&E đã chạy THẬT).
 * ===================================================================== */

var APP_ID = 'ISO';
var SERVER_VERSION = '1.0.0-d4.3';
var API_CONTRACT_VERSION = '1.0';
var SCHEMA_VERSION = '1.0.13';
var TZ = 'Asia/Ho_Chi_Minh';
var TZ_OFFSET_MIN = 7 * 60; // Việt Nam không có giờ mùa hè
var RELEASED_DOT = 1;

var SCHEMA_DOTS_ = { '1.0.0': 1, '1.0.1': 1, '1.0.2': 1, '1.0.3': 1, '1.0.4': 1, '1.0.5': 1, '1.0.6': 1, '1.0.7': 1, '1.0.8': 1, '1.0.9': 1, '1.0.10': 1, '1.0.11': 1, '1.0.12': 1, '1.0.13': 1 };
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
  // Đợt 3 (phiên 3c): sản phẩm không phù hợp (34_ncr.js). Người dùng chốt 13/11/2026 giữ phạm vi Cơ điện: phiếu thuộc bộ phận trong phạm vi
  // (hàng lỗi do thiết bị / sự cố máy, vật tư cơ điện lỗi), in theo mẫu biểu CL (mã sửa được ở Cấu hình)
  ['ncr_form_code', 'STRING', 'BM-CL-04-01', true, 1, 'Mã biểu của phiếu sản phẩm không phù hợp', '不合格品处理单的表单编号'],
  ['ncr_log_form_code', 'STRING', 'BM-CL-04-02', true, 1, 'Mã biểu của sổ theo dõi sản phẩm không phù hợp', '不合格品跟踪台账的表单编号'],
  ['ncr_decision_form_code', 'STRING', 'BM-CL-04-04', true, 1, 'Mã biểu của biên bản xử lý sản phẩm không phù hợp', '不合格品处置记录的表单编号'],
  ['ncr_decide_days', 'INT', 2, true, 1, 'Hạn quyết định xử lý sản phẩm không phù hợp (ngày từ khi phát hiện)', '不合格品处置决定期限（自发现日起天数）'],
  ['ncr_exec_days', 'INT', 7, true, 1, 'Hạn thực hiện xử lý sau khi quyết định (ngày, mặc định)', '处置决定后的执行期限（天，默认）'],
  // Đợt 4 (phiên 4a): đánh giá nội bộ (35_iaudit.js). Người dùng chốt 13/11/2026 giữ phạm vi Cơ điện: đợt đánh giá cho bộ phận trong phạm vi,
  // in theo mẫu biểu ISO (mã sửa được ở Cấu hình); Gmail báo đợt sắp tới trước audit_notice_days ngày
  ['audit_program_form_code', 'STRING', 'BM-ISO-03-01', true, 1, 'Mã biểu của chương trình đánh giá nội bộ năm', '年度内部审核方案的表单编号'],
  ['audit_plan_form_code', 'STRING', 'BM-ISO-03-02', true, 1, 'Mã biểu của kế hoạch đánh giá nội bộ (một đợt)', '内部审核计划（单次）的表单编号'],
  ['audit_checklist_form_code', 'STRING', 'BM-ISO-03-03', true, 1, 'Mã biểu của checklist đánh giá nội bộ', '内部审核检查表的表单编号'],
  ['audit_notice_days', 'INT', 7, true, 1, 'Báo đợt đánh giá nội bộ sắp tới trước (ngày)', '提前通知即将进行的内部审核（天）'],
  // Phiên 4b: báo cáo đánh giá nội bộ (phát hiện, kết luận) của một đợt
  ['audit_report_form_code', 'STRING', 'BM-ISO-03-04', true, 1, 'Mã biểu của báo cáo đánh giá nội bộ', '内部审核报告的表单编号'],
  // Phiên 4c: xem xét lãnh đạo (37_mreview.js) — người dùng chốt 13/11/2026 giữ phạm vi Cơ điện: số liệu tự gom trong phạm vi áp dụng, in theo
  // mẫu biểu ISO (mã sửa được ở Cấu hình)
  ['mreview_form_code', 'STRING', 'BM-ISO-05-01', true, 1, 'Mã biểu của báo cáo đầu vào xem xét lãnh đạo', '管理评审输入报告的表单编号'],
  ['report_logo_file_id', 'STRING', '', false, 1, 'Tệp logo trên báo cáo (Drive)', '报表标志文件（云端硬盘）'],
  ['report_logo_rev', 'STRING', '', true, 1, 'Phiên bản logo trên báo cáo', '报表标志版本'],
  // Ảnh nền màn đăng nhập / trang chủ (Quản trị → Ảnh nền, 33_bg.js): ID tệp trên Drive và mã phiên bản ('' = ảnh mặc định trong app)
  ['bg_login_file_id', 'STRING', '', false, 1, 'Tệp ảnh nền màn đăng nhập (Drive)', '登录页背景图片文件（云端硬盘）'],
  ['bg_login_rev', 'STRING', '', true, 1, 'Phiên bản ảnh nền màn đăng nhập (trống = ảnh mặc định)', '登录页背景图片版本（空=默认图片）'],
  ['bg_home_file_id', 'STRING', '', false, 1, 'Tệp ảnh nền trang chủ (Drive)', '首页背景图片文件（云端硬盘）'],
  ['bg_home_rev', 'STRING', '', true, 1, 'Phiên bản ảnh nền trang chủ (trống = ảnh mặc định)', '首页背景图片版本（空=默认图片）']
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
  NCR: { prefix: 'NC', digits: 3, yymm: true, sheet: 'Ncrs', col: 'code' },
  // Đánh giá nội bộ (4a): đợt DG-yy-01 theo năm của chương trình (cấp khi duyệt chương trình); chương trình là DG-yy
  AUDIT: { prefix: 'DG', digits: 2, yy: true, sheet: 'Audits', col: 'code' },
  // Xem xét lãnh đạo (4c): XL-yy-01 theo năm của kỳ xem xét
  MREVIEW: { prefix: 'XL', digits: 2, yy: true, sheet: 'MgmtReviews', col: 'code' },
  REPORT: { prefix: 'BC', digits: 3, yymm: true, sheet: 'ReportRuns', col: 'code' }
};

/** Loại hồ sơ của tệp (Documents.entity_type) và loại tệp được gắn — phiên 1b (phiên bản: PDF, tệp gốc), 1c (hồ sơ: ảnh, tệp) */
var DOC_ENTITY_SHEETS_ = {
  VERSION: { sheet: 'Versions', key: 'version_id', kinds: ['PDF', 'SOURCE'] },
  RECORD: { sheet: 'Records', key: 'record_id', kinds: ['PHOTO', 'FILE'] },
  // Kho tệp mẫu (2e): một dòng TplFiles = một tệp mẫu (bộ biểu xlsx nhiều sheet, hoặc docx/pdf), tải lên bằng tpl.upload
  TPL: { sheet: 'TplFiles', key: 'tpl_id', kinds: ['TEMPLATE'] },
  // Khắc phục (3a): ảnh hiện trường, bằng chứng thực hiện / kiểm tra hiệu lực (ảnh, PDF, Excel, Word) gắn vào phiếu khắc phục
  CAPA: { sheet: 'Capas', key: 'capa_id', kinds: ['PHOTO', 'FILE'] },
  // Sản phẩm không phù hợp (3c): ảnh hàng lỗi, thẻ treo, khu vực cách ly, biên bản hủy / trả hàng…
  NCR: { sheet: 'Ncrs', key: 'ncr_id', kinds: ['PHOTO', 'FILE'] }
};

/** Khắc phục (Đợt 3, phiên 3a — thay BM-CĐ-14-02 trong phạm vi Cơ điện; BM-ISO-04-01 phiếu, 04-02 sổ khi mở rộng toàn công ty), mã KP-yymm-001.
 *  Nguồn: sự cố thiết bị · kiểm tra / kiểm định · đánh giá · an toàn – môi trường – năng lượng · không tuân thủ quy trình · khác
 *  khiếu nại khách hàng (3b, 8D) · nhà cung cấp (3b, SCAR) · sản phẩm không phù hợp (3c, chỉ lập từ phiếu NC — ncr_id).
 *  Phiếu: OPEN đang xử lý → (xong mọi hành động, có nguyên nhân) VERIFYING chờ kiểm tra hiệu lực → CLOSED đã đóng (có hiệu lực) |
 *  OPEN lại (không hiệu lực: thêm hành động, lần kiểm tra sau); CANCELLED hủy (lập nhầm, kèm lý do).
 *  Hành động: OPEN → DONE (ngày hoàn thành + kết quả) | CANCELLED. */
var CAPA_SOURCES_ = ['EQUIPMENT', 'INSPECTION', 'AUDIT', 'SAFETY', 'PROCESS', 'COMPLAINT', 'SUPPLIER', 'NCR', 'OTHER'];
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

/** Sản phẩm không phù hợp (Đợt 3, phiên 3c — BM-CL-04-01 phiếu, 04-02 sổ, 04-04 biên bản xử lý), mã NC-yymm-001.
 *  Nơi phát hiện: đầu vào (vật tư, nguyên liệu, phụ tùng) · trong sản xuất · kiểm tra thành phẩm · kho, vận chuyển · khách hàng trả về · khác.
 *  Phiếu: OPEN chờ quyết định (đã cách ly, nhận dạng) → (người có thẩm quyền quyết định, PIN) DECIDED đang xử lý → (xong xử lý, kiểm tra lại,
 *  PIN) CLOSED đã đóng; CANCELLED hủy (lập nhầm). Quyết định lại khi đang xử lý (vd làm lại không đạt → hủy) — mọi lần lưu ở lịch sử.
 *  Cách xử lý: làm lại · sửa chữa · hạ cấp / dùng vào việc khác · nhân nhượng / dùng nguyên trạng · trả nhà cung cấp · hủy bỏ — một phiếu
 *  nhiều dòng (vd 300 tờ làm lại, 200 tờ hủy). Nhân nhượng và hủy bỏ chỉ Quản trị (cấp 4) quyết định (người dùng chốt 13/11/2026). */
var NCR_STAGES_ = ['INCOMING', 'PROCESS', 'FINAL', 'STORAGE', 'CUSTOMER', 'OTHER'];
var NCR_STATES_ = ['OPEN', 'DECIDED', 'CLOSED', 'CANCELLED'];
var NCR_DISPOSITIONS_ = ['REWORK', 'REPAIR', 'REGRADE', 'CONCESSION', 'RETURN', 'SCRAP'];
/** Chỉ cấp 4 quyết định */
var NCR_TOP_DISPOSITIONS_ = ['CONCESSION', 'SCRAP'];
/** Sản phẩm sau xử lý phải kiểm tra lại đạt mới đóng (ISO 9001 điều 8.7.1) */
var NCR_RECHECK_DISPOSITIONS_ = ['REWORK', 'REPAIR', 'REGRADE'];
var NCR_RECHECKS_ = ['PASS', 'NA'];
var NCR_MAX_LINES_ = 6;
var NCR_MAX_FILES_ = 30;

/** Đánh giá nội bộ (Đợt 4, phiên 4a — BM-ISO-03-01 chương trình năm, 03-02 kế hoạch đánh giá, 03-03 checklist; 35_iaudit.js).
 *  Chương trình: DRAFT nháp → IN_REVIEW chờ duyệt → APPROVED đã duyệt (Quản trị, PIN; lần 01, 02…) → sửa (PIN, lý do) về DRAFT · CANCELLED.
 *  Đợt: PLANNED trong chương trình → READY đã chốt kế hoạch (ngày, đoàn, checklist) → IN_PROGRESS đang đánh giá → REPORTED đã báo cáo →
 *  CLOSED đã đóng (4b: mọi phát hiện không phù hợp có phiếu khắc phục đã đóng) · CANCELLED. Kết quả câu hỏi: C phù hợp · NC không phù hợp · OBS cần cải tiến (quan sát) · NA không áp dụng. */
var AUDIT_STDS_ = ['ISO9001', 'BRC'];
var AUDIT_PROG_STATES_ = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'CANCELLED'];
var AUDIT_STATES_ = ['PLANNED', 'READY', 'IN_PROGRESS', 'REPORTED', 'CLOSED', 'CANCELLED'];
var AUDIT_RESULTS_ = ['C', 'NC', 'OBS', 'NA'];
var AUDIT_MAX_TEAM_ = 6;
var AUDIT_MAX_CHECKS_ = 80;
var AUDIT_MAX_CLAUSES_ = 80;
var AUDIT_MAX_PER_PROGRAM_ = 40;
var AUDIT_MAX_NA_ = 150;
/** Phát hiện đánh giá (phiên 4b, AuditFindings — người dùng chốt 13/11/2026): MAJOR không phù hợp lớn · MINOR không phù hợp nhỏ (bắt buộc có
 *  phiếu khắc phục) · OBS cần cải tiến (phiếu khắc phục tùy chọn). Phát hiện từ câu checklist Không phù hợp → MAJOR / MINOR; Cần cải tiến → OBS. */
var AUDIT_FINDING_TYPES_ = ['MAJOR', 'MINOR', 'OBS'];
var AUDIT_FINDING_NC_ = ['MAJOR', 'MINOR'];
var AUDIT_MAX_FINDINGS_ = 40;

/** Xem xét lãnh đạo (Đợt 4, phiên 4c — BM-ISO-05-01; 37_mreview.js), mã XL-yy-01. Đầu vào theo ISO 9001 điều 9.3.2: a tình trạng hành động từ
 *  lần xem xét trước · b thay đổi bối cảnh · c1 sự thỏa mãn của khách hàng · c2 mục tiêu chất lượng · c3 kết quả quá trình, sự phù hợp sản phẩm ·
 *  c4 sự không phù hợp, hành động khắc phục · c5 theo dõi, đo lường · c6 kết quả đánh giá · c7 nhà cung cấp bên ngoài · d nguồn lực · e rủi ro, cơ
 *  hội · f cơ hội cải tiến. Đầu ra (9.3.3): kết luận + quyết định (cải tiến · thay đổi hệ thống · nguồn lực) có người phụ trách, hạn.
 *  DRAFT đang chuẩn bị (số liệu tính lúc xem) → HELD đã họp (PIN; số liệu chốt) · CANCELLED. Quyết định: OPEN → DONE | CANCELLED. */
var MR_INPUTS_ = ['prev', 'context', 'satisfaction', 'objectives', 'process', 'capa', 'monitoring', 'audit', 'supplier', 'resources', 'risks', 'improve'];
var MR_STATES_ = ['DRAFT', 'HELD', 'CANCELLED'];
var MR_DECISION_KINDS_ = ['IMPROVE', 'CHANGE', 'RESOURCE'];
var MR_DECISION_STATES_ = ['OPEN', 'DONE', 'CANCELLED'];
var MR_MAX_DECISIONS_ = 30;
var MR_MAX_DAYS_ = 731;

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
