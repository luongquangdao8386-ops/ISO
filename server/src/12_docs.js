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
