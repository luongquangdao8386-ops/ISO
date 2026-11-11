// Kết nối M&E / Checksheet trên giao diện (Đợt 2, phiên 2a) — đúng các bước gửi người dùng: Tài khoản → Quản trị → Kết nối;
// thử sai mã (báo app kia từ chối) → thử đúng → Lưu (PIN) → bảng kỳ có ô ✓ từ M&E, ô ! báo "kiểm trong M&E" → Ngắt kết nối.
// App M&E / Checksheet giả: tests/feed-mock.mjs (feed.isoEvidence đúng hợp đồng).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser, OWNER_CODE, OWNER_PIN } from '../helpers.mjs';
import { ME_URL, CS_URL, ME_KEY, CS_KEY, fakeApps, daysBetween } from '../feed-mock.mjs';

const NOW = '2026-11-11T08:10:00+07:00';
const IPHONE = { viewport: { width: 390, height: 844 }, mobile: true };
const WEB = { viewport: { width: 1440, height: 900 }, mobile: false };

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
  for (const code of ['BM-CĐ-04-03', 'BM-CĐ-02-05']) setItem(env, code, { status: 'ISSUED', current_rev: '01', issued_at: '2026-06-01', records_from: '2026-06-01', issued_source: '' });
  const skip = new Set(['2026-11-05', '2026-11-06', '2026-11-07']);
  const data = {
    ME: daysBetween('2026-09-01', '2026-11-10').filter((d) => !skip.has(d)).map((d) => ({ form_code: 'BM-CĐ-04-03', date: d, count: 2 }))
      .concat([{ form_code: 'BM-CĐ-03-03a', date: '2026-10-20', count: 1 }, { form_code: 'BM-XX-99-99', date: '2026-11-01', count: 1 }]),
    CS: daysBetween('2026-11-01', '2026-11-10').map((d) => ({ form_code: 'BM-CĐ-02-05', date: d, count: 1 }))
  };
  fakeApps(env, data);
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
const go = (page, h) => page.evaluate((x) => { location.hash = x; }, h);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function noRawKeys(page) {
  const txt = await page.evaluate(() => document.body.innerText);
  const raw = txt.match(/\b(?:nav|home|link|ev|rec|cell|btn|status|period|sync|where)\.[a-z_]+[A-Z_0-9.]*\b/g);
  return raw ? [...new Set(raw)] : [];
}
const cellStates = (page, code) => page.evaluate((c) => {
  const row = [...document.querySelectorAll('.rg-row')].find((r) => r.querySelector('.code').textContent.trim() === c);
  return row ? [...row.querySelectorAll('.rg-cell')].map((b) => b.className.replace(/.*c-/, '')) : null;
}, code);

test('web: Kết nối → thử sai mã (app kia từ chối) → thử đúng → Lưu (PIN) → bảng kỳ ✓ từ M&E, ô ! báo kiểm trong M&E → Ngắt kết nối', async () => {
  const env = seeded();
  const app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page, OWNER_CODE, OWNER_PIN);
    // Trước khi nối: biểu in từ M&E chưa tính, bảng kỳ có ghi chú
    await go(page, '#/records');
    await page.waitForSelector('.rg');
    assert.equal(await cellStates(page, 'BM-CĐ-04-03'), null, 'chưa nối: biểu M&E không có trong bảng kỳ');
    assert.ok((await page.textContent('.rg-app')).includes('chưa nối'));
    // Menu trái → Kết nối
    await page.click('.side .side-item[data-nav="links"]');
    await page.waitForSelector('#lk-ME');
    assert.ok((await page.textContent('#lk-ME')).includes('Chưa nối'));
    assert.ok((await page.textContent('#lk-CS')).includes('Chưa nối'));
    await page.fill('#lk-url-ME', ME_URL);
    // Sai mã: báo app kia từ chối, không lưu
    await page.fill('#lk-key-ME', 'saiMa_' + 'z'.repeat(30));
    await page.click('[data-test="ME"]');
    await page.waitForSelector('#lk-res-ME .banner.warn');
    assert.ok((await page.textContent('#lk-res-ME')).includes('sai mã kết nối'));
    // Đúng mã: Thử kết nối → số dòng, số biểu, mã lạ (chưa lưu)
    await page.fill('#lk-key-ME', ME_KEY);
    await page.click('[data-test="ME"]');
    await page.waitForFunction(() => /Kết nối được/.test(document.querySelector('#lk-res-ME').textContent));
    const res = await page.textContent('#lk-res-ME');
    assert.ok(res.includes('ghép được 2 biểu'), res);
    assert.ok(res.includes('BM-XX-99-99'));
    assert.equal(env.props.getProperty('ME_EXEC_URL'), null);
    // Lưu → PIN → đã nối, lấy ngay
    await page.click('[data-save="ME"]');
    await answerPin(page, OWNER_PIN);
    await page.waitForFunction(() => /Đã nối/.test(document.querySelector('#lk-ME .card-head').textContent), null, { timeout: 20000 });
    assert.equal(env.props.getProperty('ME_EXEC_URL'), ME_URL);
    const card = await page.textContent('#lk-ME');
    assert.ok(card.includes('2 biểu'), card);
    assert.ok(card.includes('1 mã biểu không có trong danh mục ISO'));
    assert.ok(!card.includes(ME_KEY), 'không hiện mã kết nối');
    assert.ok((await page.textContent('.lk')).includes('BM-CĐ-04-03'), 'danh sách biểu nhận ngày có hồ sơ');
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'links-web.png'), fullPage: true });
    // Bảng kỳ: sổ dừng máy hằng ngày — ✓ từ M&E, 05–07/11 quá hạn, hôm nay chưa tới hạn
    await go(page, '#/records');
    await page.waitForFunction(() => [...document.querySelectorAll('.rg-row .code')].some((x) => x.textContent.trim() === 'BM-CĐ-04-03'));
    const cells = await cellStates(page, 'BM-CĐ-04-03');
    assert.deepEqual(cells, ['OK', 'OK', 'OK', 'OK', 'OK', 'LATE', 'LATE', 'LATE', 'OK', 'OK', 'OK', 'DUE']);
    const row = page.locator('.rg-row', { has: page.locator('.code', { hasText: 'BM-CĐ-04-03' }) });
    await row.locator('.rg-cell').nth(0).click();
    await page.waitForSelector('.modal .ev-list');
    assert.ok((await page.textContent('.modal')).includes('Có hồ sơ trong M&E · 2 lượt · gần nhất 31/10/2026 · 机电App中有记录 · 2次 · 最近 31/10/2026'));
    assert.equal(await page.locator('.modal .btn', { hasText: 'Nộp hồ sơ kỳ này' }).count(), 0, 'biểu in từ M&E không nộp ở đây');
    await page.locator('.modal .btn', { hasText: 'Đóng' }).click();
    await row.locator('.rg-cell').nth(6).click();
    await page.waitForSelector('.modal');
    assert.ok((await page.textContent('.modal')).includes('kiểm phiếu trong M&E'));
    await page.locator('.modal .btn', { hasText: 'Đóng' }).click();
    // Chi tiết biểu: ghi chú nguồn + ngày có hồ sơ gần đây
    await row.locator('.rg-info').click();
    await page.waitForSelector('#item-records');
    const ir = await page.textContent('#item-records');
    assert.ok(ir.includes('Ô ✓ gồm cả ngày có hồ sơ trong app M&E'));
    assert.ok(ir.includes('Có hồ sơ trong M&E'));
    // Trang chủ: biểu M&E quá hạn được đếm
    await go(page, '#/');
    await page.waitForSelector('.stats');
    // Ngắt kết nối
    await go(page, '#/links');
    await page.waitForSelector('[data-clear="ME"]');
    await page.click('[data-clear="ME"]');
    await page.locator('.modal .btn.danger', { hasText: 'Ngắt kết nối' }).click();
    await page.waitForFunction(() => /Chưa nối/.test(document.querySelector('#lk-ME .card-head').textContent), null, { timeout: 20000 });
    assert.equal(env.props.getProperty('ME_EXEC_URL'), null);
    await go(page, '#/records');
    await page.waitForSelector('.rg');
    assert.equal(await cellStates(page, 'BM-CĐ-04-03'), null);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('iPhone: Tài khoản → Quản trị → Kết nối → nối Checksheet (PIN) → biểu Checksheet có ô ✓; Thư ký ISO cấp 2 không vào được', async () => {
  const env = seeded();
  addUser(env, 'TK2', 2, '583922', { depts: 'ISO', secretary: true });
  const app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page, OWNER_CODE, OWNER_PIN);
    await page.click('.bnav-item[data-nav="account"]');
    await page.locator('.card a', { hasText: 'Kết nối M&E / Checksheet' }).click();
    await page.waitForSelector('#lk-CS');
    assert.ok(await noOverflow(page));
    await page.fill('#lk-url-CS', CS_URL);
    await page.fill('#lk-key-CS', CS_KEY);
    await page.click('[data-save="CS"]');
    await answerPin(page, OWNER_PIN);
    await page.waitForFunction(() => /Đã nối/.test(document.querySelector('#lk-CS .card-head').textContent), null, { timeout: 20000 });
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'links-iphone.png'), fullPage: true });
    // Nút Hồ sơ → bảng kỳ: Checksheet hằng ngày 01–10/11 ✓, 31/10 quá hạn
    await page.click('.bnav-item[data-nav="records"]');
    await page.waitForFunction(() => [...document.querySelectorAll('.rg-row .code')].some((x) => x.textContent.trim() === 'BM-CĐ-02-05'));
    const cells = await cellStates(page, 'BM-CĐ-02-05');
    assert.deepEqual(cells, ['LATE', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'DUE']);
    // M&E chưa nối: biểu M&E vẫn "chưa tính"
    assert.equal(await cellStates(page, 'BM-CĐ-04-03'), null);
    assert.ok(await noOverflow(page));
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
  // Thư ký ISO cấp 2: không có mục Kết nối; vào thẳng địa chỉ thì báo chỉ Quản trị
  const app2 = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app2;
    await login(page, 'TK2', '583922');
    await go(page, '#/links');
    await page.waitForSelector('.empty-state');
    assert.ok((await page.textContent('.empty-state')).includes('Chỉ Quản trị'));
    assert.equal(await page.locator('.grid9 .tile[href="#/links"]').count(), 0);
  } finally { await app2.close(); }
});
