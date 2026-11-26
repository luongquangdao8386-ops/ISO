// config.js: chỉ trang của chủ repo gốc dùng link /exec cố định; bản sao (fork) ở tài khoản GitHub khác để trống
// (màn đăng nhập cho dán link máy chủ của chính họ), địa chỉ app lấy theo trang đang mở.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../../config.js', import.meta.url), 'utf8');
const cfgAt = (href) => {
  const u = new URL(href);
  const ctx = { location: { hostname: u.hostname, pathname: u.pathname, origin: u.origin }, window: {} };
  vm.runInNewContext(src, ctx);
  return JSON.parse(JSON.stringify(ctx.window.ISO_CONFIG));
};

test('trang gốc /ISO/ dùng link cố định; /ISO-thu/ để trống', () => {
  const a = cfgAt('https://luongquangdao8386-ops.github.io/ISO/');
  assert.match(a.EXEC_URL, /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/);
  assert.equal(a.APP_BASE_URL, 'https://luongquangdao8386-ops.github.io/ISO/');
  const t = cfgAt('https://luongquangdao8386-ops.github.io/ISO-thu/');
  assert.equal(t.EXEC_URL, '');
});

test('bản sao ở tài khoản GitHub khác: không dùng máy chủ của chủ repo gốc', () => {
  for (const href of ['https://ban-be.github.io/ISO/', 'https://ban-be.github.io/ISO-thu/', 'https://ban-be.github.io/iso-congty/', 'http://localhost:8080/ISO/']) {
    const c = cfgAt(href);
    assert.equal(c.EXEC_URL, '', href);
    assert.equal(c.APP_BASE_URL, '', href + ' (app tự lấy địa chỉ trang đang mở)');
    assert.match(c.BUILD_VERSION, /^1\.0\.0-/);
  }
});
