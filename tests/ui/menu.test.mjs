// Menu gọn (25/11/2026, người dùng: "phần tab các danh mục này có rút gọn được không, tôi thấy nhiều dài dòng quá"): Trang chủ 8 ô hay
// dùng + "Tất cả chức năng" (trang /menu xếp theo 3 nhóm); menu trái máy tính: Trang chủ · Tài liệu · Hồ sơ & đánh giá · Công cụ ·
// Tài khoản, bấm tên nhóm để mở / đóng (nhớ trên máy), nhóm của màn đang mở tự mở; tên ngắn (Phân phối, SP không phù hợp, Kết nối).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser, OWNER_CODE, OWNER_PIN } from '../helpers.mjs';

const NOW = '2026-11-25T09:00:00+07:00';
const IPHONE = { viewport: { width: 390, height: 844 }, mobile: true };
const WEB = { viewport: { width: 1440, height: 900 }, mobile: false };

function realLike() {
  const env = freshServer({ now: NOW, scope: 'CĐ' });
  ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  env.g.dbReset_();
  addUser(env, 'TC', 1, '583923', { depts: 'CĐ' });
  return env;
}
async function login(page, code = OWNER_CODE, pin = OWNER_PIN) {
  await page.waitForSelector('#emp', { timeout: 15000 });
  await page.fill('#emp', code);
  await page.fill('#pin', pin);
  await page.click('#login-btn');
  await page.waitForSelector('.grid9', { timeout: 20000 });
}
const go = (page, h) => page.evaluate((x) => { location.hash = x; }, h);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const hrefs = (page, sel) => page.locator(sel).evaluateAll((els) => els.map((e) => e.getAttribute('href')));
const visibleSide = (page) => page.locator('.side .side-item').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.dataset.nav));

test('iPhone: Trang chủ 9 ô → Tất cả chức năng: 3 nhóm, đủ ô; bấm ô trong đó mở đúng màn', async () => {
  const app = await openApp({ env: realLike(), now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page);
    assert.deepEqual(await hrefs(page, '.grid9 .tile'), ['#/ready', '#/catalog', '#/templates', '#/records', '#/coverage', '#/capa', '#/audits', '#/reports', '#/menu']);
    assert.equal(await page.locator('.grid9 .tile[href="#/account/drafts"]').count(), 0, 'không có nháp → không có ô Nháp chờ gửi');
    const all = page.locator('.grid9 .tile[href="#/menu"]');
    assert.match(await all.innerText(), /Tất cả chức năng[\s\S]*全部功能[\s\S]*17 mục/);
    await all.click();
    await page.waitForSelector('.menu-all');
    assert.deepEqual(await page.locator('.menu-grp-h').allInnerTexts(), ['TÀI LIỆU · 文件', 'HỒ SƠ & ĐÁNH GIÁ · 记录与评审', 'CÔNG CỤ · 工具']);
    assert.deepEqual(await hrefs(page, '.menu-all .grid9 .tile'), ['#/catalog', '#/templates', '#/versions', '#/requests', '#/dist', '#/labels',
      '#/ready', '#/records', '#/coverage', '#/capa', '#/ncr', '#/audits', '#/mreview', '#/reports', '#/excel', '#/links', '#/account/drafts']);
    assert.ok(await noOverflow(page));
    await page.screenshot({ path: path.join(SHOTS, 'menu-iphone.png'), fullPage: true });
    await page.click('.menu-all .tile[href="#/ncr"]');
    await page.waitForFunction(() => location.hash === '#/ncr');
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('web: menu trái 3 nhóm đóng sẵn → mở / đóng, nhớ sau khi tải lại; màn đang mở tự mở nhóm; tên ngắn; Tra cứu chỉ thấy nhóm được dùng', async () => {
  const env = realLike();
  let app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page);
    assert.deepEqual(await page.locator('.side-grp').evaluateAll((els) => els.map((e) => e.dataset.grp)), ['docs', 'rec', 'tools']);
    assert.deepEqual(await visibleSide(page), ['home', 'account'], 'mới vào: chỉ Trang chủ, tên 3 nhóm, Tài khoản');
    assert.equal(await page.locator('.side .side-item').count(), 18);
    await page.click('.side-grp[data-grp="docs"] .side-grp-h');
    assert.deepEqual(await visibleSide(page), ['home', 'catalog', 'templates', 'versions', 'requests', 'dist', 'labels', 'account']);
    assert.match(await page.innerText('.side-item[data-nav="dist"]'), /^Phân phối · 分发收回$/);
    assert.equal(await page.getAttribute('.side-grp[data-grp="docs"] .side-grp-h', 'aria-expanded'), 'true');
    // Màn Khắc phục → nhóm Hồ sơ & đánh giá tự mở; Tài liệu vẫn mở (đã bấm)
    await page.click('.side-item[data-nav="catalog"]');
    await go(page, '#/capa');
    await page.waitForFunction(() => document.querySelector('.side-grp[data-grp="rec"]').classList.contains('open'));
    assert.match(await page.innerText('.side-item[data-nav="ncr"]'), /^SP không phù hợp · 不合格品$/);
    assert.equal(await page.locator('.side-item[data-nav="capa"].active').count(), 1);
    // Đóng Tài liệu → tải lại: Tài liệu đóng, Công cụ (chưa mở) đóng
    await page.click('.side-grp[data-grp="docs"] .side-grp-h');
    await page.click('.side-grp[data-grp="tools"] .side-grp-h');
    assert.match(await page.innerText('.side-item[data-nav="links"]'), /^Kết nối · 连接$/);
    await page.reload();
    await page.waitForSelector('.side-grp', { timeout: 20000 });
    const upin = await page.$('#upin');
    if (upin) { await page.fill('#upin', OWNER_PIN); await page.keyboard.press('Enter'); }
    await page.waitForSelector('.side-grp[data-grp="tools"].open', { timeout: 20000 });
    assert.equal(await page.locator('.side-grp[data-grp="docs"].open').count(), 0);
    await page.screenshot({ path: path.join(SHOTS, 'menu-web.png') });
    // Tất cả chức năng trên máy tính: nhiều cột
    await go(page, '#/menu');
    await page.waitForSelector('.menu-all');
    const cols = await page.evaluate(() => getComputedStyle(document.querySelector('.menu-all .grid9')).gridTemplateColumns.split(' ').length);
    assert.ok(cols >= 5, String(cols));
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
  // Tra cứu cấp 1: nhóm chỉ có mục được dùng; nhóm không còn mục nào thì không hiện
  app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page, 'TC', '583923');
    assert.deepEqual(await page.locator('.side-grp').evaluateAll((els) => els.map((e) => e.dataset.grp)), ['docs', 'tools']);
    assert.deepEqual(await page.locator('.side-grp[data-grp="docs"] .side-item').evaluateAll((els) => els.map((e) => e.dataset.nav)), ['catalog', 'templates']);
    assert.deepEqual(await hrefs(page, '.grid9 .tile'), ['#/catalog', '#/templates', '#/reports', '#/menu']);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});
