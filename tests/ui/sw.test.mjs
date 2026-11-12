// Service Worker thật (các test khác chặn SW): cài bản mới kiểm mã băm từng tệp vỏ app (FILE_SHA trong sw.js do tools/build.mjs ghi).
// 12/11/2026 người dùng chạy lẫn dict.js mới + docreq.js cũ ngay sau khi phát hành → không thấy ô lọc mới. Kiểm: tệp đúng → cài, cache
// đủ bộ và đúng nội dung; một tệp cũ → thử lại rồi hủy cài (không có cache bản mới, máy giữ bản cũ đủ bộ); hết cũ → lần mở sau cài
// được; Tài khoản → Thông tin hiện mã vỏ app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
const HASH = /const BUILD_HASH = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'))[1];
const VERSION = /const VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'))[1];

/** Trang tĩnh /ISO/ như GitHub Pages, phục vụ đúng byte của repo; overrides: {đường dẫn: nội dung thay} (giả lập CDN còn tệp cũ) */
function serve(overrides) {
  const hits = {};
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x');
      if (!u.pathname.startsWith('/ISO/')) { res.writeHead(404); res.end(); return; }
      let p = decodeURIComponent(u.pathname.slice(5)) || 'index.html';
      hits[p] = (hits[p] || 0) + 1;
      const f = path.join(ROOT, p);
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'max-age=600' });
      res.end(overrides[p] !== undefined ? overrides[p] : fs.readFileSync(f));
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, hits, origin: `http://127.0.0.1:${srv.address().port}` }));
  });
}

const shellKeys = (page) => page.evaluate(async () => (await caches.keys()).filter((k) => k.includes('-shell-')));

test('Service Worker: tệp đúng → cài đủ bộ; một tệp còn bản cũ → thử lại rồi hủy cài (giữ bản cũ đủ bộ); hết cũ → cài được; Thông tin hiện mã vỏ app', async () => {
  const overrides = { 'js/pages/docreq.js': '// bản cũ còn trong CDN\nexport function renderRequestNew() {}\n' };
  const s = await serve(overrides);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: 'allow', viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(s.origin + '/ISO/');
    // Lần 1: docreq.js lệch mã băm → tải lại 4 lần → hủy cài (lần cài đầu hỏng thì trình duyệt bỏ luôn đăng ký), không có cache bản mới
    for (let i = 0; i < 60 && (s.hits['js/pages/docreq.js'] || 0) < 4; i++) await page.waitForTimeout(500);
    await page.waitForFunction(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return !r || (!r.installing && !r.active && !r.waiting);
    }, null, { timeout: 30000, polling: 500 });
    assert.equal(s.hits['js/pages/docreq.js'], 4, 'tải lại tệp lệch 4 lần');
    assert.deepEqual(await shellKeys(page), []);
    const fails = await page.evaluate(async (h) => { const c = await caches.open('iso-swfail'); const r = await c.match('fail-' + h); return r ? r.text() : ''; }, HASH);
    assert.equal(fails, '1');
    // CDN hết tệp cũ → mở lại app → cài được, cache đủ bộ và đúng nội dung tệp
    delete overrides['js/pages/docreq.js'];
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000, polling: 300 });
    assert.deepEqual(await shellKeys(page), [`iso-shell-${VERSION}-${HASH}`]);
    const cached = await page.evaluate(async (k) => { const c = await caches.open(k); const r = await c.match('js/pages/docreq.js'); return r ? r.text() : ''; }, `iso-shell-${VERSION}-${HASH}`);
    assert.equal(cached, fs.readFileSync(path.join(ROOT, 'js/pages/docreq.js'), 'utf8'));
    assert.ok(!(await page.evaluate(() => caches.keys())).includes('iso-swfail'), 'cài xong thì xóa bộ đếm lần hủy');
    // Mở app khi Service Worker phục vụ: Tài khoản → Thông tin hiện mã vỏ app (để đối chiếu với mã Claude báo khi phát hành)
    const hash = await page.evaluate(async () => {
      const { NS } = await import('./js/core.js');
      const k = (await caches.keys()).filter((x) => x.startsWith(NS + '-shell-')).pop();
      return k ? k.split('-').pop() : '';
    });
    assert.equal(hash, HASH);
  } finally {
    await browser.close();
    s.srv.close();
  }
});

test('Service Worker: tệp lệch mã băm đã hủy cài 3 lần → lần thứ 4 vẫn cài (không kẹt mãi ở bản cũ)', async () => {
  const overrides = { 'css/app.css': '/* khác */' };
  const s = await serve(overrides);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    const page = await context.newPage();
    // Đặt bộ đếm "đã hủy cài 3 lần" trước khi trang app đăng ký Service Worker (mở một tệp không phải trang app cùng origin)
    await page.goto(s.origin + '/ISO/manifest.webmanifest');
    await page.evaluate(async (h) => { const c = await caches.open('iso-swfail'); await c.put('fail-' + h, new Response('3')); }, HASH);
    await page.goto(s.origin + '/ISO/');
    await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 40000, polling: 500 });
    assert.deepEqual(await shellKeys(page), [`iso-shell-${VERSION}-${HASH}`]);
  } finally {
    await browser.close();
    s.srv.close();
  }
});
