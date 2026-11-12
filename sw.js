// Service Worker của app ISO — phạm vi thư mục của trang (/ISO/ THẬT, /ISO-thu/ THỬ); chỉ quản lý cache của chính trang này
// (iso-shell-* ở /ISO/, iso_thu-shell-* ở /ISO-thu/ — cùng quy tắc storageNs trong js/core.js). Chung origin github.io với
// M&E và Checksheet: tiền tố "iso" không đụng cache "me-*", "cs-*".
const VERSION = '1.0.0-d2.4';
const BUILD_HASH = '029ec0d52aa2'; // tools/build.mjs ghi mã băm nội dung các tệp vỏ app
// tools/build.mjs ghi mã băm SHA-256 (16 ký tự đầu) của từng tệp vỏ app — kiểm khi cài bản mới
const FILE_SHA = {"./":"42e8201e7f67e474","index.html":"42e8201e7f67e474","config.js":"f589fc2108c86463","manifest.webmanifest":"1e5d682351f481cd","css/app.css":"bbe548f63cdeb1c3","js/main.js":"4ab282d49cbec0f5","js/core.js":"94b1137c69ccdb30","js/dict.js":"aa228e0851afcf1b","js/auth.js":"8f17587a660a1efd","js/sync.js":"20a32bdb777a08b5","js/ui.js":"7960796568e2e263","js/scan.js":"66d68add7b388053","js/media.js":"fe3d87b4b71671ff","js/qr-worker.js":"cbd2efd3a6175301","js/router.js":"b70bebf9f28d9c37","js/data.js":"3f378a71021a4dab","js/shell.js":"fd8ad22438396e32","js/app.js":"86602ed855074f25","js/form.js":"58f88cdc171283d6","js/xlsx.js":"ef9ece5dfa0a824a","js/report-logo.js":"828bbb577fe85a76","js/catalog-xlsx.js":"e3cbf383a491dd01","js/files.js":"3b4b81d1e714d305","js/pending.js":"3a7c4f0c91ea2430","js/periods.js":"d590a5ed1a2e3195","js/coverage.js":"2ebf3e54c4e3c21a","js/report-xlsx.js":"0248b970954900a6","js/qr.js":"8661285c5dca16b1","js/pages/home.js":"a3035c818ad3645e","js/pages/catalog.js":"fc31a177e4a91043","js/pages/item.js":"b1c13195d38af76f","js/pages/version.js":"a373e9366d9e7a1c","js/pages/links.js":"e82954e3a2ddb229","js/pages/mail.js":"c625f87b6f33ce7a","js/pages/excel.js":"6020125365826fd1","js/pages/soon.js":"9b9225b0e2299e46","js/pages/account.js":"85dfc401074b358c","js/pages/drafts.js":"54a384ee3658bf43","js/pages/admin.js":"21cdcca4438f9638","js/pages/records.js":"d1330de6ecee906b","js/pages/coverage.js":"e11f69743d54807d","js/pages/reports.js":"6f51841504d4523e","js/pages/docreq.js":"829febce5effd822","js/pages/dist.js":"2bef81f149113401","js/pages/labels.js":"d88cfacb1a6e3f9c","vendor/jsQR-1.4.0.js":"bc40c8a15196236b","vendor/qrcode-generator-1.4.4.js":"18ae399f81182bc9","assets/brand/iso-tile.svg":"9ec80f4de8d3fb17","assets/bg/factory.jpg":"1404362e548c3031","assets/bg/home.jpg":"d8b38f98ff6885d9","assets/icons/apple-touch-icon.png":"4492cdd6a6bd1045","assets/icons/icon-192.png":"831c0761edf78074","assets/icons/icon-512.png":"230555460fbed4ed"};
const NS = (() => {
  const m = /^\/([^/]+)\//.exec(self.location.pathname);
  const seg = m ? m[1].toLowerCase().replace(/[^a-z0-9]+/g, '_') : '';
  return seg.startsWith('iso') ? seg : 'iso';
})();
const PREFIX = NS + '-shell-';
const SHELL = PREFIX + VERSION + '-' + BUILD_HASH;
const FILES = [
  './', 'index.html', 'config.js', 'manifest.webmanifest', 'css/app.css',
  'js/main.js', 'js/core.js', 'js/dict.js', 'js/auth.js', 'js/sync.js', 'js/ui.js', 'js/scan.js', 'js/media.js', 'js/qr-worker.js',
  'js/router.js', 'js/data.js', 'js/shell.js', 'js/app.js', 'js/form.js', 'js/xlsx.js', 'js/report-logo.js', 'js/catalog-xlsx.js',
  'js/files.js', 'js/pending.js', 'js/periods.js', 'js/coverage.js', 'js/report-xlsx.js', 'js/qr.js',
  'js/pages/home.js', 'js/pages/catalog.js', 'js/pages/item.js', 'js/pages/version.js', 'js/pages/links.js', 'js/pages/mail.js', 'js/pages/excel.js', 'js/pages/soon.js',
  'js/pages/account.js', 'js/pages/drafts.js', 'js/pages/admin.js', 'js/pages/records.js', 'js/pages/coverage.js', 'js/pages/reports.js',
  'js/pages/docreq.js', 'js/pages/dist.js', 'js/pages/labels.js',
  'vendor/jsQR-1.4.0.js', 'vendor/qrcode-generator-1.4.4.js',
  'assets/brand/iso-tile.svg', 'assets/bg/factory.jpg', 'assets/bg/home.jpg', 'assets/icons/apple-touch-icon.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png'
];

// Tải vỏ app từ máy chủ gốc theo mã bản (?v=BUILD_HASH, lưu dưới tên tệp thường): ngay sau khi phát hành, CDN của
// GitHub Pages có thể còn trả tệp cũ vài phút → không có ?v thì cache bản mới lẫn tệp cũ (bài học M&E d2.9).
// Kiểm thêm mã băm từng tệp (FILE_SHA): vẫn nhận tệp cũ (12/11/2026 ISO: dict.js mới + docreq.js cũ) thì tải lại với ?r=… sau vài
// giây; 4 lần vẫn cũ thì hủy cài — máy giữ nguyên bản cũ đủ bộ, lần mở app sau trình duyệt tự thử cài lại.
async function sha16(buf) {
  const d = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
/** Số lần cài bản này bị hủy vì tệp cũ (lưu ở cache riêng NS-swfail, xóa khi một bản cài xong) */
async function failCount(inc) {
  const c = await caches.open(NS + '-swfail');
  const k = new Request('fail-' + BUILD_HASH);
  const hit = await c.match(k);
  let n = hit ? Number(await hit.text()) || 0 : 0;
  if (inc) { n++; await c.put(k, new Response(String(n))); }
  return n;
}
async function fetchChecked(f, strict) {
  const want = FILE_SHA[f];
  let r = null;
  for (let i = 0; i < 4; i++) {
    const q = 'v=' + BUILD_HASH + (i ? '&r=' + Date.now().toString(36) + i : '');
    r = await fetch(new Request(f + (f.includes('?') ? '&' : '?') + q, { cache: 'reload' }));
    if (!r.ok) throw new Error('precache ' + f + ' ' + r.status);
    if (!want || await sha16(await r.clone().arrayBuffer()) === want) return r;
    if (i < 3) await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
  }
  // Đã hủy cài 3 lần vì cùng lý do (có thể máy chủ trang đổi nội dung tệp): cài luôn để máy không kẹt mãi ở bản cũ
  if (!strict) return r;
  throw new Error('stale ' + f);
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const strict = (await failCount(false)) < 3;
    const got = await Promise.all(FILES.map(async (f) => [f, await fetchChecked(f, strict)]));
    const c = await caches.open(SHELL);
    await Promise.all(got.map(([f, r]) => c.put(new Request(f), r)));
    await self.skipWaiting();
  })().catch(async (err) => { await caches.delete(SHELL); await failCount(true); throw err; }));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => (k.startsWith(PREFIX) && k !== SHELL) || k === NS + '-swfail').map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // không chặn script.google.com, Drive
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html', { cacheName: SHELL }).then((hit) => hit || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { cacheName: SHELL, ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
