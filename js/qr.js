// Tạo mã QR trên máy (Đợt 2, phiên 2d — tem QR của biểu): thư viện qrcode-generator 1.4.4 (MIT, vendor/) nạp theo nhu cầu như SheetJS.
// Nội dung tem: APP_BASE_URL/#/f/<qr_key>?r=<lần ban hành> (link trang app đang mở: /ISO/ THẬT, /ISO-thu/ THỬ). Mức sửa lỗi M.
let loading = null;

/** Nạp vendor/qrcode-generator-1.4.4.js một lần (CSP script-src 'self') */
export function loadQr() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (!loading) {
    loading = new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = 'vendor/qrcode-generator-1.4.4.js';
      s.onload = () => (window.qrcode ? ok(window.qrcode) : fail(new Error('qrcode')));
      s.onerror = () => { loading = null; fail(new Error('qrcode')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** Địa chỉ gốc của app đang mở (…/ISO/), không có index.html, ?…, #… */
export function appBaseUrl() {
  return location.href.split('#')[0].split('?')[0].replace(/index\.html$/, '');
}

/** Nội dung tem QR của một biểu */
export function itemQrUrl(it, rev) {
  return appBaseUrl() + '#/f/' + encodeURIComponent(it.qr_key || '') + (rev ? '?r=' + encodeURIComponent(rev) : '');
}

/** Ma trận mô-đun: {n, dark(r, c)} */
export async function qrMatrix(text) {
  const qrcode = await loadQr();
  const q = qrcode(0, 'M');
  q.addData(text, 'Byte');
  q.make();
  const n = q.getModuleCount();
  return { n, dark: (r, c) => q.isDark(r, c) };
}

/** SVG vuông cạnh `size` (đơn vị CSS, vd '31mm'), có vùng trắng 2 mô-đun quanh mã (tem có viền giấy trắng) */
export function qrSvg(m, size, quiet = 2) {
  const n = m.n + quiet * 2;
  let d = '';
  for (let r = 0; r < m.n; r++) {
    for (let c = 0; c < m.n; c++) if (m.dark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
  }
  return `<svg class="qr-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

/**
 * Ảnh PNG của mã (chèn vào đầu biểu Excel / Word): mã QR + 1–2 dòng chữ bên dưới (mã biểu · lần ban hành).
 * Trả File image/png.
 */
export async function qrPngFile(text, lines, fileName, { px = 10, quiet = 4 } = {}) {
  const m = await qrMatrix(text);
  const side = (m.n + quiet * 2) * px;
  const lh = Math.round(px * 3.2);
  const cap = (lines || []).filter(Boolean);
  const cv = document.createElement('canvas');
  cv.width = side;
  cv.height = side + (cap.length ? cap.length * lh + px * 2 : 0);
  const g = cv.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#000';
  for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) if (m.dark(r, c)) g.fillRect((c + quiet) * px, (r + quiet) * px, px, px);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  cap.forEach((t, i) => {
    g.font = `${i ? '' : 'bold '}${Math.round(lh * 0.62)}px Arial, "Noto Sans", sans-serif`;
    g.fillText(String(t), side / 2, side + px + lh * i + lh / 2, side - px * 2);
  });
  const blob = await new Promise((ok) => cv.toBlob(ok, 'image/png'));
  return new File([blob], fileName, { type: 'image/png' });
}
