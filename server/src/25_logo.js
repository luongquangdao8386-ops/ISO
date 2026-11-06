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
