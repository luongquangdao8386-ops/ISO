// Chạy đúng các bước nghiệm thu Đợt 1 đã gửi người dùng (bước 3, mục 4, 5, 8) trên máy chủ giả lập, với biểu BM-SX-02-01
// ở tình trạng ○ như danh mục thật: Nhân viên SX soạn → owner duyệt + ban hành → owner nộp hồ sơ khi mất mạng theo khoảng ngày
// (2 ngày trước ngày ban hành → hôm nay) → có mạng tự gửi → Trả lại → ô về –, ngày trước ngày ban hành thành ô gạch; Tra cứu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import path from 'node:path';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser, OWNER_CODE, OWNER_PIN } from '../helpers.mjs';

const NOW = '2026-11-11T08:10:00+07:00';
const IPHONE = { viewport: { width: 390, height: 844 }, mobile: true };
const WEB = { viewport: { width: 1440, height: 900 }, mobile: false };

function seeded() {
  const env = freshServer({ now: NOW });
  ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  // Như danh mục thật: BM-SX-02-01 là biểu mới ○ (chưa ban hành), chu kỳ 1 ngày
  const it = env.g.readRows_('Items').find((x) => x.code === 'BM-SX-02-01');
  env.g.systemWrite_([{ sheet: 'Items', mode: 'update', partial: true, row: { item_id: it.item_id, status: 'NONE', current_rev: '', issued_at: '', issued_source: '', review_due: '', file_missing: false, records_from: '' } }],
    { action: 'test.item', entity_type: 'SYSTEM' });
  return env;
}
const pdfBuf = (n = 4000) => { const b = Buffer.alloc(n, 32); Buffer.from('%PDF-1.7\n').copy(b); return b; };
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
const itemOf = (env, code) => { env.g.dbReset_(); return env.g.readRows_('Items').find((x) => x.code === code); };
const recordsOf = (env) => { env.g.dbReset_(); return JSON.parse(JSON.stringify(env.g.readRows_('Records'))); };
const cellsOnItem = (page) => page.$$eval('#item-records .rg-cells .rg-cell', (bs) => bs.map((b) => b.className.replace(/.*c-/, '')));

test('nghiệm thu mục 4, 5, 8 đúng các bước đã gửi: Nhân viên SX soạn → owner duyệt, ban hành → nộp hồ sơ mất mạng (khoảng ngày) → trả lại; Tra cứu', async () => {
  const env = seeded();
  addUser(env, 'THU-SX', 2, '583920', { depts: 'SX' });
  addUser(env, 'THU-KD', 1, '583921', { depts: 'KD' });
  const it = itemOf(env, 'BM-SX-02-01');
  assert.equal(it.status, 'NONE');

  // Mục 4a — THU-SX: Danh mục → BM-SX-02-01 → Soạn phiên bản mới → PDF → Lưu và gửi duyệt; không có nút Duyệt
  let app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page, 'THU-SX', '583920');
    await page.click('.side-item[data-nav="catalog"]');
    await page.waitForSelector('.cat-tbl');
    await page.locator('tr[data-href]', { has: page.locator('td.code', { hasText: /^BM-SX-02-01$/ }) }).click();
    await page.waitForSelector('a[href^="#/version/new/"]');
    await page.locator('a[href^="#/version/new/"]').click();
    await page.waitForSelector('form.ver-form');
    assert.ok((await page.textContent('form.ver-form')).includes('lần 01'));
    // Tóm tắt thay đổi là ô bắt buộc (bỏ trống → báo đỏ, không gửi)
    await page.setInputFiles('#f-file-PDF', { name: 'BM-SX-02-01.pdf', mimeType: 'application/pdf', buffer: pdfBuf() });
    await page.locator('button[data-go="submit"]').click();
    await page.waitForSelector('.bi-pair.bad > .ferr:not(:empty)');
    await page.fill('#f-change_summary_vi', 'Ban hành lần đầu');
    await page.locator('button[data-go="submit"]').click();
    await page.waitForSelector('.ver .item-head', { timeout: 20000 });
    assert.ok((await page.textContent('.item-head')).includes('Chờ duyệt'));
    assert.equal(await page.locator('#v-approve').count(), 0, 'Nhân viên không thấy nút Duyệt');
    // Mục 8 — Nhân viên SX: Phủ điều khoản ghi phạm vi SX, không có Excel
    assert.equal(await page.locator('.side-item[data-nav="excel"]').count(), 0);
    await page.click('.side-item[data-nav="coverage"]');
    await page.waitForSelector('.cov');
    assert.ok((await page.textContent('.cov')).includes('Chỉ đếm biểu của bộ phận SX'));
  } finally { await app.close(); }

  // Mục 4b — owner: trang chủ "1 phiên bản chờ bạn duyệt" → Duyệt (PIN) → Ban hành → biểu ●, % ban hành tăng
  app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page, OWNER_CODE, OWNER_PIN);
    const pct0 = await page.textContent('.stats .stat:nth-child(2) .stat-val');
    assert.ok((await page.textContent('.pend-card')).includes('1 phiên bản chờ bạn duyệt'));
    await page.locator('.pend-row[href="#/versions?f=review"]').click();
    await page.waitForSelector('.ver-row');
    await page.locator('.ver-row').first().click();
    await page.waitForSelector('#v-approve');
    await page.click('#v-approve');
    await page.locator('.modal .btn.primary').click();
    await answerPin(page, OWNER_PIN);
    await page.waitForFunction(() => document.querySelector('.item-head') && document.querySelector('.item-head').textContent.includes('chờ ban hành'));
    await page.click('#v-issue');
    await page.locator('.modal .btn.primary').click();
    await page.waitForFunction(() => document.querySelector('.item-head') && document.querySelector('.item-head').textContent.includes('Đang hiệu lực'));
    const it1 = itemOf(env, 'BM-SX-02-01');
    assert.equal(it1.status, 'ISSUED');
    assert.equal(it1.records_from, '2026-11-11', 'ngày bắt đầu tính hồ sơ = ngày ban hành');
    await go(page, '#/');
    await page.waitForSelector('.stats');
    assert.notEqual(await page.textContent('.stats .stat:nth-child(2) .stat-val'), pct0, '% ban hành tăng');
  } finally { await app.close(); }

  // Mục 5 — owner trên iPhone: tắt mạng → BM-SX-02-01 → Nộp hồ sơ → Khoảng ngày 09/11 → 11/11 → 2 ảnh → Lưu → có mạng tự gửi → Trả lại
  app = await openApp({ env, now: NOW, ...IPHONE });
  let rid;
  try {
    const { page } = app;
    await login(page, OWNER_CODE, OWNER_PIN);
    // Test chặn service worker → mở trước các màn khi còn mạng (máy thật: service worker đã lưu sẵn mọi tệp của app)
    await go(page, '#/item/' + it.item_id);
    await page.waitForSelector('#item-records .rg-cells .rg-cell');
    await go(page, '#/record/new?item=' + encodeURIComponent(it.item_id));
    await page.waitForSelector('form.rec-form');
    await app.offline(true);
    await go(page, '#/item/' + it.item_id);
    await page.waitForSelector('#item-records .rg-cells .rg-cell');
    let st = await cellsOnItem(page);
    assert.deepEqual(st.slice(-3), ['NA', 'NA', 'DUE'], 'trước ngày ban hành không tính, hôm nay –');
    await page.locator('#item-records a[href^="#/record/new"], .item a[href^="#/record/new"]').first().click();
    await page.waitForSelector('form.rec-form');
    assert.equal(await page.locator('.rec-range').isVisible(), true, 'biểu hằng ngày mặc định Khoảng ngày');
    assert.equal(await page.inputValue('#f-from'), '2026-11-11', 'mặc định từ ngày bắt đầu tính');
    await page.fill('#f-from', '2026-11-09');
    await page.fill('#f-to', '2026-11-11');
    await page.dispatchEvent('#f-to', 'change');
    await page.waitForFunction(() => /Phủ 3 kỳ/.test(document.querySelector('.rec-cover').textContent));
    await page.setInputFiles('#rf-pick', [
      { name: 'IMG_1.png', mimeType: 'image/png', buffer: makePng(320, 240) },
      { name: 'IMG_2.png', mimeType: 'image/png', buffer: makePng(320, 240) }
    ]);
    await page.waitForFunction(() => document.querySelectorAll('.rec-page').length === 2);
    await page.click('#rf-save');
    await page.waitForSelector('.rec-detail');
    assert.ok((await page.textContent('.rec-detail .item-head')).includes('Chờ gửi'));
    assert.equal(recordsOf(env).length, 0);
    await app.offline(false);
    for (let i = 0; i < 80 && !(recordsOf(env)[0] && recordsOf(env)[0].files_json.length === 2); i++) await page.waitForTimeout(250);
    const r = recordsOf(env)[0];
    assert.ok(r && r.code.startsWith('HS-'), 'có mã HS');
    rid = r.record_id;
    await go(page, '#/item/' + it.item_id);
    await page.waitForFunction(() => [...document.querySelectorAll('#item-records .rg-cells .rg-cell')].slice(-3).every((b) => b.classList.contains('c-OK')), null, { timeout: 15000 });
    // Trả lại (lý do "thử nghiệm", PIN): hôm nay về –, 09–10/11 (trước ngày ban hành) thành ô gạch
    await go(page, '#/record/' + rid);
    await page.waitForSelector('.rec-detail #rd-return');
    await page.click('#rd-return');
    await page.fill('#rr-reason', 'thử nghiệm');
    await page.locator('.modal .btn.danger').click();
    await answerPin(page, OWNER_PIN);
    await page.waitForFunction(() => document.querySelector('.rec-detail .item-head') && document.querySelector('.rec-detail .item-head').textContent.includes('Bị trả lại'));
    await go(page, '#/item/' + it.item_id);
    await page.waitForFunction(() => { const c = [...document.querySelectorAll('#item-records .rg-cells .rg-cell')].slice(-3); return c.length === 3 && !c.some((b) => b.classList.contains('c-OK')); }, null, { timeout: 15000 });
    st = await cellsOnItem(page);
    assert.deepEqual(st.slice(-3), ['NA', 'NA', 'DUE']);
    await page.screenshot({ path: path.join(SHOTS, 'nghiem-thu-muc5-iphone.png'), fullPage: true });
  } finally { await app.close(); }

  // Mục 8 — THU-SX mở hồ sơ: không có nút Trả lại. THU-KD (Tra cứu): nút Hồ sơ vẫn ở thanh dưới nhưng chỉ có lời giải thích
  app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page, 'THU-SX', '583920');
    await go(page, '#/record/' + rid);
    await page.waitForSelector('.rec-detail');
    assert.equal(await page.locator('#rd-return').count(), 0);
  } finally { await app.close(); }
  app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page, 'THU-KD', '583921');
    assert.equal(await page.locator('#home-week').count(), 0);
    assert.equal(await page.locator('.grid9 .tile[href="#/coverage"]').count(), 0);
    await page.click('.bnav-item[data-nav="records"]');
    await page.waitForSelector('.empty-state');
    assert.equal(await page.locator('.rg-row').count(), 0);
  } finally { await app.close(); }
});

/** Ảnh PNG thật w×h */
function makePng(w = 64, h = 48) {
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = x; raw[o + 1] = y; raw[o + 2] = 120; }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
