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
  MIRROR_SAME_ACCOUNT: ['Tài khoản thứ hai phải khác tài khoản đang chạy máy chủ', '第二个账户须与运行服务器的账户不同']
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
