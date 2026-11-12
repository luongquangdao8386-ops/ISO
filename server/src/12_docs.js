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
  var isRec = p.entity_type === 'RECORD';
  var entity = findOne_(et.sheet, et.key, p.entity_id);
  if (!entity || entity.archived_at) throw validationError_([fieldError_('entity_id', 'NOT_FOUND')]);
  var it = findOne_('Items', 'item_id', entity.item_id);
  if (!it || !itemVisible_(ctx.user, it)) throw apiError_('FORBIDDEN');
  if (isRec) {
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
  if (isRec && (entity.files_json || []).length >= RECORD_MAX_FILES_) throw validationError_([fieldError_('content_b64', 'TOO_MANY_FILES')]);

  var bytes;
  try { bytes = b64d_(p.content_b64); } catch (e) { throw validationError_([fieldError_('content_b64', 'INVALID_VALUE')]); }
  if (!bytes.length) throw validationError_([fieldError_('content_b64', 'REQUIRED')]);
  if (bytes.length > Number(setting_('doc_max_bytes'))) throw validationError_([fieldError_('content_b64', 'FILE_TOO_LARGE')]);
  if (!magicOk_(bytes, p.mime_type)) throw validationError_([fieldError_('mime_type', 'FILE_TYPE')]);
  var ext = DOC_MIME_[p.mime_type].ext;
  var pageNo = Number(p.page_no) > 0 && Number(p.page_no) <= 999 ? Math.floor(Number(p.page_no)) : null;
  var codeSafe = String(it.code).replace(/[\/\\]/g, '-');
  var shown = cleanFileName_(p.file_name) || (it.code + (isRec ? '_' + (pageNo || 1) : '') + '.' + ext);
  // Tên trên Drive dễ tìm khi mở thư mục: <mã biểu>_L<lần>[_goc]_<8 ký tự> (phiên bản) · <mã biểu>_<mã HS>_p<trang>_<8 ký tự> (hồ sơ)
  var driveName = isRec
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
          if (row.status === 'VOID') throw validationError_([fieldError_('state', 'STATUS_INVALID')]);
          var files = Array.isArray(row.files_json) ? row.files_json.slice() : [];
          if (files.length >= RECORD_MAX_FILES_) throw validationError_([fieldError_('content_b64', 'TOO_MANY_FILES')]);
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
