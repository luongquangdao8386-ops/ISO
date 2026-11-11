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
      'na_prev_status reviewed_at reviewed_by' },
  // Phiên bản của biểu/tài liệu (phiên 1b): DRAFT → IN_REVIEW → APPROVED → ISSUED → SUPERSEDED; trả lại về DRAFT; hủy CANCELLED.
  // vtype: REVISION (lần ban hành mới, qua duyệt) | ATTACH (gắn tệp cho bản đang hiệu lực nhập từ Excel ●, Thư ký ISO ban hành thẳng)
  Versions: { book: 'B', dot: 1, key: 'version_id', c: true, i18n: true,
    cols: 'version_id item_id vtype rev state change_summary_vi change_summary_zh effective_date author_id ' +
      'pdf_doc_id pdf_file_name pdf_size source_doc_id source_file_name source_size source_mime ' +
      'submitted_at submitted_by approved_at approved_by approve_note issued_at issued_by superseded_at superseded_by_id ' +
      'returned_at returned_by return_reason cancelled_at cancelled_by cancel_reason item_status_before' },
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
  code: 'STRING', key: 'STRING', current_rev: 'STRING', rev: 'STRING', pdf_size: 'INT', source_size: 'INT',
  submitted_by: 'STRING', approved_by: 'STRING', issued_by: 'STRING', returned_by: 'STRING', cancelled_by: 'STRING', reviewed_by: 'STRING', file_epoch: 'STRING', template_key: 'STRING', template_version: 'STRING',
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
