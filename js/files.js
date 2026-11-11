// Tệp riêng tư của phiên bản (PDF, tệp gốc): tải qua máy chủ (doc.get) rồi mở/lưu; chọn tệp để tải lên (doc.upload).
// iPhone làm hai bước như M&E: chạm "Tải về" → máy tải xong → chạm "Mở / Lưu" gọi bảng Chia sẻ ngay trong lần chạm (không await trước).
// Máy tính: PDF mở tab mới, tệp khác tải xuống. Tệp đã tải giữ trong bộ nhớ tới khi đóng app (không lưu ra IndexedDB).
import { api, bi, biText, esc, resMsg, uuid, blobToB64, b64ToBytes, session, fmtNumber } from './core.js';
import { toast } from './ui.js';
import { isTouchMobile, shareFileNow } from './media.js';
import { writeOnline } from './form.js';

const cache = new Map(); // document_id → File

const EXT_MIME = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  doc: 'application/msword'
};
/** Loại tệp được tải lên theo việc */
export const KIND_EXT = { PDF: ['pdf'], SOURCE: ['xlsx', 'docx', 'xls', 'doc'] };
export const KIND_ACCEPT = {
  PDF: '.pdf,application/pdf',
  SOURCE: '.xlsx,.docx,.xls,.doc,' + [EXT_MIME.xlsx, EXT_MIME.docx, EXT_MIME.xls, EXT_MIME.doc].join(',')
};

export function fmtSize(n) {
  const b = Number(n) || 0;
  if (b >= 1048576) return fmtNumber(Math.round(b / 104857.6) / 10) + ' MB';
  return fmtNumber(Math.max(1, Math.round(b / 1024))) + ' KB';
}

/** MIME theo đuôi tệp (Safari iPhone có khi để trống file.type) */
export function mimeOf(file) {
  const ext = String(file.name || '').split('.').pop().toLowerCase();
  return EXT_MIME[ext] || file.type || '';
}

/** Kiểm loại và dung lượng trước khi gửi; trả khóa lỗi hoặc '' */
export function checkFile(file, kind) {
  const ext = String(file.name || '').split('.').pop().toLowerCase();
  if (!KIND_EXT[kind].includes(ext)) return kind === 'PDF' ? 'file.need_pdf' : 'file.need_source';
  const st = session.settings || {};
  const max = isTouchMobile() ? Number(st.doc_mobile_upload_max_bytes || 5242880) : Number(st.doc_max_bytes || 10485760);
  if (file.size > max) return isTouchMobile() ? 'file.too_big_mobile' : 'file.too_big';
  if (!file.size) return 'file.empty';
  return '';
}

/**
 * Tải một tệp lên cho phiên bản (đang là Nháp). Trả phản hồi doc.upload (data.record = phiên bản sau khi gắn tệp).
 */
export async function uploadVersionFile(versionId, kind, file) {
  const b64 = await blobToB64(file);
  return writeOnline('doc.upload', {
    document_id: uuid(), entity_type: 'VERSION', entity_id: versionId, kind, mime_type: mimeOf(file), file_name: file.name, content_b64: b64
  }, { expected_version: 0, timeoutMs: 180000 });
}

/** Tải tệp qua máy chủ (giữ trong bộ nhớ); trả {ok, file} hoặc phản hồi lỗi */
export async function fetchDoc(documentId) {
  if (cache.has(documentId)) return { ok: true, file: cache.get(documentId) };
  const r = await api('doc.get', { document_id: documentId }, { retry: true, timeoutMs: 120000 });
  if (!r.ok) return r;
  const d = r.data;
  const file = new File([b64ToBytes(d.content_b64)], d.file_name || 'tep', { type: d.mime_type || 'application/octet-stream' });
  cache.set(documentId, file);
  return { ok: true, file };
}

/** Mở/lưu tệp đã có trong bộ nhớ — gọi thẳng trong trình xử lý chạm, không await trước */
export function openFile(file) {
  if (isTouchMobile()) return shareFileNow(file);
  if (file.type === 'application/pdf') {
    const url = URL.createObjectURL(file);
    const w = window.open(url, '_blank');
    if (!w) return shareFileNow(file);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return Promise.resolve();
  }
  return shareFileNow(file);
}

/** Nút tệp: <button data-doc="id" data-kind="PDF|SOURCE"> */
export function docButton(documentId, kind, name, size) {
  if (!documentId) return '';
  const label = kind === 'PDF' ? 'file.view_pdf' : 'file.get_source';
  return `<button type="button" class="btn small doc-btn" data-doc="${esc(documentId)}" data-kind="${esc(kind)}">
    <span class="doc-label">${bi(cache.has(documentId) ? 'file.open_save' : label)}</span>
    <span class="muted small doc-meta">${esc(name || '')}${size ? ' · ' + esc(fmtSize(size)) : ''}</span></button>`;
}

/** Gắn hành vi cho các nút tệp: lần đầu tải về, lần sau Mở / Lưu */
export function wireDocButtons(root) {
  root.querySelectorAll('button[data-doc]').forEach((b) => b.addEventListener('click', async () => {
    const id = b.dataset.doc;
    if (cache.has(id)) { openFile(cache.get(id)).catch(() => {}); return; }
    if (!navigator.onLine) { toast(bi('sync.need_network'), 'err'); return; }
    b.disabled = true; b.classList.add('busy');
    const r = await fetchDoc(id);
    b.disabled = false; b.classList.remove('busy');
    if (!r.ok) { toast(esc(resMsg(r)), 'err'); return; }
    const lab = b.querySelector('.doc-label');
    if (lab) lab.innerHTML = bi('file.open_save');
    // Máy tính: mở luôn (vẫn trong lượt bấm với trình duyệt cho phép); iPhone phải chạm lần nữa
    if (!isTouchMobile()) openFile(r.file).catch(() => {});
    else toast(bi('file.ready_tap'), 'ok');
  }));
}

export function fileErrText(key) { return biText(key); }
