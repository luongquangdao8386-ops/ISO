// Gmail nhắc hạn trên giao diện (Đợt 2, phiên 2b) — đúng các bước gửi người dùng: Tài khoản → Quản trị → Gmail nhắc hạn;
// nhập email Thư ký ISO + xác nhận (PIN) → Gửi thử → Bật Gmail → (Đổi giờ gửi) → việc cần nhắc tính tới hôm nay → Gửi ngay → Nhật ký gửi.
// Cài đặt như THẬT: owner + Thư ký ISO cấp 4 (bộ phận trống, cờ Thư ký ISO), không có trưởng bộ phận.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser, OWNER_CODE, OWNER_PIN } from '../helpers.mjs';

const NOW = '2026-11-12T09:00:00+07:00'; // Thứ Năm
const IPHONE = { viewport: { width: 390, height: 844 }, mobile: true };
const WEB = { viewport: { width: 1440, height: 900 }, mobile: false };
const TK_MAIL = 'thuky.iso@example.com';
const OWNER_MAIL = 'owner.iso@example.com';

function setItem(env, code, patch) {
  const g = env.g;
  g.dbReset_();
  const it = g.readRows_('Items').find((x) => x.code === code);
  const row = { ...it, ...patch, record_version: (it.record_version || 0) + 1 };
  delete row.__row;
  g.systemWrite_([{ sheet: 'Items', mode: 'update', row }]);
  g.dbReset_();
}

function seeded() {
  const env = freshServer({ now: NOW });
  ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  env.g.withWriteLock_(() => env.g.writeSetting_('app_base_url', 'https://example.github.io/ISO/', 'TEST'));
  addUser(env, 'TK', 4, '583922', { secretary: true });
  setItem(env, 'BM-ISO-02-04', { review_due: '2026-11-19' }); // còn 7 ngày: nhắc rà soát hôm nay
  env.g.dbReset_();
  return env;
}
async function login(page, code, pin) {
  await page.waitForSelector('#emp', { timeout: 15000 });
  await page.fill('#emp', code);
  await page.fill('#pin', pin);
  await page.click('#login-btn');
  await page.waitForSelector('.grid9', { timeout: 20000 });
}
async function answerPin(page, pin) {
  await page.waitForSelector('.modal .pin-input');
  await page.fill('.modal .pin-input', pin);
  await page.locator('.modal:has(.pin-input) .btn.primary').click();
}
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function noRawKeys(page) {
  const txt = await page.evaluate(() => document.body.innerText);
  const raw = txt.match(/\b(?:mail|admin|health|btn|cat|sync)\.[a-z_]+[A-Z_0-9.]*\b/g);
  return raw ? [...new Set(raw)] : [];
}
const rcpt = (page, code) => page.locator('.ml-rcpt', { has: page.locator('.code', { hasText: new RegExp('^' + code + '$') }) });

/** Nhập email + xác nhận cho một người ở thẻ Người nhận */
async function setEmail(page, code, email, pinNeeded) {
  await rcpt(page, code).locator('[data-email]').click();
  await page.fill('#ml-email-in', email);
  assert.equal(await page.isChecked('#ml-email-ok'), true, 'ô xác nhận tích sẵn');
  await page.locator('.modal .btn.primary', { hasText: 'Lưu' }).click();
  if (pinNeeded) await answerPin(page, OWNER_PIN);
  await page.waitForFunction((c) => {
    const card = [...document.querySelectorAll('.ml-rcpt')].find((x) => x.querySelector('.code').textContent.trim() === c);
    return card && /Đã xác nhận/.test(card.textContent);
  }, code, { timeout: 20000 });
}

test('iPhone: Tài khoản → Quản trị → Gmail nhắc hạn → email Thư ký ISO + xác nhận (PIN) → Gửi thử → Bật Gmail; xem trước', async () => {
  const env = seeded();
  const app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page, OWNER_CODE, OWNER_PIN);
    await page.click('.bnav-item[data-nav="account"]');
    await page.locator('.card a', { hasText: 'Gmail nhắc hạn' }).click();
    await page.waitForSelector('#ml-status');
    assert.ok((await page.textContent('#ml-status')).includes('Đang tắt'));
    assert.ok((await page.textContent('#ml-rcpt')).includes('Chưa có email đã xác nhận') || (await page.textContent('#ml-rcpt')).includes('Chưa có email nào được xác nhận'));
    assert.ok((await rcpt(page, 'TK').textContent()).includes('Thư ký ISO'));
    assert.ok(await noOverflow(page));
    // Bước 2: email Thư ký ISO + xác nhận (PIN)
    await setEmail(page, 'TK', TK_MAIL, true);
    const u = env.rows('Users').find((x) => x.employee_code === 'TK');
    assert.equal(u.email, TK_MAIL);
    assert.ok(u.email_confirmed_at);
    // Bước 3: Gửi thử → thư tới đúng email, có việc rà soát và hồ sơ quá hạn
    await rcpt(page, 'TK').locator('[data-test]').click();
    await page.locator('.modal .btn.primary', { hasText: 'Gửi thử' }).click();
    await page.waitForFunction(() => /Đã gửi thư thử tới/.test(document.querySelector('#toast').textContent), null, { timeout: 20000 });
    assert.ok((await page.textContent('#toast')).includes('Đã gửi thư thử tới ' + TK_MAIL));
    assert.equal(env.mail.sent.length, 1);
    assert.equal(env.mail.sent[0].to, TK_MAIL);
    assert.ok(env.mail.sent[0].body.includes('BM-ISO-02-04') && env.mail.sent[0].body.includes('BM-SX-02-01'));
    // Bước 4: Bật Gmail (PIN còn trong 5 phút)
    await page.waitForSelector('#ml-toggle');
    await page.click('#ml-toggle');
    await page.waitForFunction(() => /Đang bật/.test(document.querySelector('#ml-status .card-head').textContent), null, { timeout: 20000 });
    env.g.dbReset_();
    assert.equal(env.g.setting_('gmail_enabled'), true);
    assert.ok(env.g.ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === 'sendDueMail'));
    // Xem trước: Thư ký ISO nhận rà soát (sẽ gửi) + hồ sơ quá hạn (gửi sáng thứ Hai)
    const pv = await page.textContent('#ml-preview');
    assert.ok(pv.includes('BM-ISO-02-04') && pv.includes('Sẽ gửi'));
    assert.ok(pv.includes('BM-SX-02-01') && pv.includes('Gửi sáng thứ Hai'));
    assert.ok(pv.includes('16/11/2026'));
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'mail-iphone.png'), fullPage: true });
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('web: owner tự nhập email → Gửi thử; đổi giờ gửi; Gửi ngay → Nhật ký gửi "Đã gửi"; Tắt Gmail', async () => {
  const env = seeded();
  const app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page, OWNER_CODE, OWNER_PIN);
    await page.evaluate(() => { location.hash = '#/account'; });
    await page.locator('.card a', { hasText: 'Gmail nhắc hạn' }).click();
    await page.waitForSelector('#ml-status');
    await setEmail(page, OWNER_CODE, OWNER_MAIL, true);
    await setEmail(page, 'TK', TK_MAIL, false);
    // Đổi giờ gửi 06:00
    await page.click('#ml-hour');
    await page.selectOption('#ml-hour-in', '6');
    await page.locator('.modal .btn.primary', { hasText: 'Lưu' }).click();
    await page.waitForFunction(() => /6:00/.test(document.querySelector('#ml-status').textContent), null, { timeout: 20000 });
    // Bật rồi Gửi ngay: thư rà soát tới Thư ký ISO (tóm tắt hồ sơ quá hạn chờ thứ Hai)
    await page.click('#ml-toggle');
    await page.waitForSelector('#ml-run', { timeout: 20000 });
    await page.click('#ml-run');
    await page.locator('.modal .btn.primary', { hasText: 'Gửi ngay' }).click();
    await page.waitForFunction(() => /Đã gửi/.test(document.querySelector('#ml-log') ? document.querySelector('#ml-log').textContent : ''), null, { timeout: 20000 });
    const sent = env.mail.sent.filter((m) => m.to === TK_MAIL);
    assert.equal(sent.length, 1);
    assert.match(sent[0].subject, /Nhắc hạn hồ sơ, tài liệu ISO/);
    assert.ok(sent[0].body.includes('https://example.github.io/ISO/#/item/'));
    assert.ok(!sent[0].body.includes('BM-SX-02-01'), 'thứ Năm: chưa gửi tóm tắt hồ sơ quá hạn');
    const log = await page.textContent('#ml-log');
    assert.ok(log.includes('BM-ISO-02-04') && log.includes(TK_MAIL));
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'mail-web.png'), fullPage: true });
    // Tắt Gmail
    await page.click('#ml-toggle');
    await page.locator('.modal .btn.danger', { hasText: 'Tắt Gmail' }).click();
    await page.waitForFunction(() => /Đang tắt/.test(document.querySelector('#ml-status .card-head').textContent), null, { timeout: 20000 });
    // Trạng thái hệ thống có dòng Gmail nhắc hạn
    await page.evaluate(() => { location.hash = '#/admin/status'; });
    await page.waitForFunction(() => /Gmail nhắc hạn/.test(document.body.innerText), null, { timeout: 20000 });
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});
