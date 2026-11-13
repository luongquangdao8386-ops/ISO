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
      'escape_vi escape_zh sent_date reply_due reply_date reply_note_vi reply_note_zh reply_at reply_by ncr_id' },
  // Sản phẩm không phù hợp (Đợt 3, phiên 3c, 34_ncr.js): mã NC-yymm-001; stage nơi phát hiện; dept_code bộ phận quản lý phiếu; ref_text tham
  // chiếu (lệnh sản xuất, thiết bị, phiếu sửa chữa M&E, PO…); product_text / lot_text / qty_text sản phẩm hoặc vật tư, lô, số lượng không phù
  // hợp; party_name khách hàng trả về / nhà cung cấp (tùy chọn); severity MINOR | MAJOR | CRITICAL; problem mô tả; contain biện pháp cách ly,
  // nhận dạng (thẻ treo, khu vực riêng); hold_place nơi để hàng cách ly; cause nguyên nhân sơ bộ; owner_user_id người phụ trách xử lý;
  // decide_due hạn quyết định (ngày phát hiện + ncr_decide_days); state OPEN | DECIDED | CLOSED | CANCELLED; files_json ảnh / tệp như Records.
  // Quyết định hiện hành: decision_json [{d: REWORK|REPAIR|REGRADE|CONCESSION|RETURN|SCRAP, qty, note}], decision_note, decision_date, decided_at /
  // decided_by, exec_due hạn thực hiện, need_capa YES | NO (cần phiếu khắc phục), concession_text căn cứ nhân nhượng (ý kiến khách hàng…);
  // decision_history_json mọi lần quyết định. Đóng: done_date, result kết quả xử lý, recheck PASS | NA (kiểm tra lại sau làm lại / sửa / hạ cấp),
  // closed_at / closed_by. capa_id phiếu khắc phục lập từ phiếu này (Capas.ncr_id trỏ ngược lại).
  Ncrs: { book: 'B', dot: 1, key: 'ncr_id', c: true, i18n: true,
    cols: 'ncr_id code stage dept_code ref_text found_date found_by_name product_text lot_text qty_text party_name severity problem_vi problem_zh ' +
      'contain_vi contain_zh hold_place cause_vi cause_zh owner_user_id decide_due state files_json decision_json decision_note_vi decision_note_zh ' +
      'decision_date decided_at decided_by exec_due need_capa concession_text decision_history_json done_date result_vi result_zh recheck ' +
      'closed_at closed_by capa_id cancelled_at cancelled_by cancel_reason' },
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
  verify_result: 'STRING', seq: 'INT', round: 'INT', atype: 'STRING', assignee_name: 'STRING', done_by: 'STRING',
  stage: 'STRING', decide_due: 'DATE', exec_due: 'DATE', decided_by: 'STRING', closed_by: 'STRING', need_capa: 'STRING', recheck: 'STRING', hold_place: 'STRING'
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
