// Hồ sơ trên giao diện (phiên 1c, nghiệm thu Đợt 1 mục 5, 6): quét tem → Nộp hồ sơ; nộp theo khoảng ngày khi mất mạng (ảnh chụp
// thu nhỏ, lưu trên máy, ô "chờ gửi"), có mạng tự gửi → ✓; bảng kỳ ✓ ! –; trưởng bộ phận trả lại (PIN) → kỳ về quá hạn, người nộp
// thấy ở Chờ bạn xử lý; cấp Tra cứu không xem hồ sơ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import zlib from 'node:zlib';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser, makeClient, uuid, fakeJpegB64 } from '../helpers.mjs';

const NOW = '2026-11-11T08:10:00+07:00';
const IPHONE = { viewport: { width: 390, height: 844 }, mobile: true };
const WEB = { viewport: { width: 1440, height: 900 }, mobile: false };

/** Ảnh PNG thật (giải mã được) w×h, màu theo vị trí */
function makePng(w = 64, h = 48) {
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = x * 4; raw[o + 1] = y * 5; raw[o + 2] = 120; }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function seeded() {
  const env = freshServer({ now: NOW });
  ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  return env;
}
async function login(page, code, pin) {
  await page.waitForSelector('#emp', { timeout: 15000 });
  await page.fill('#emp', code);
  await page.fill('#pin', pin);
  await page.click('#login-btn');
  await page.waitForSelector('.grid9', { timeout: 20000 });
}
const go = (page, h) => page.evaluate((x) => { location.hash = x; }, h);
const itemOf = (env, code) => { env.g.dbReset_(); return env.g.readRows_('Items').find((x) => x.code === code); };
const recordsOf = (env) => { env.g.dbReset_(); return JSON.parse(JSON.stringify(env.g.readRows_('Records'))); };
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function noRawKeys(page) {
  const txt = await page.evaluate(() => document.body.innerText);
  const raw = txt.match(/\b(?:nav|home|cat|item|rec|cell|file|btn|status|period|draft|sync)\.[a-z_]+[A-Z_0-9.]*\b/g);
  return raw ? [...new Set(raw)] : [];
}
const cellStates = (page, code) => page.evaluate((c) => {
  const row = [...document.querySelectorAll('.rg-row')].find((r) => r.querySelector('.code').textContent.trim() === c);
  return row ? [...row.querySelectorAll('.rg-cell')].map((b) => b.className.replace(/.*c-/, '')) : null;
}, code);

test('iPhone: quét tem → Nộp hồ sơ; mất mạng vẫn lưu khoảng ngày + 2 ảnh (ô chờ gửi); có mạng tự gửi → ✓ trên bảng kỳ', async () => {
  const env = seeded();
  addUser(env, 'SX2', 2, '583920', { depts: 'SX' });
  const app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page, 'SX2', '583920');
    // Tem QR của biểu đang hiệu lực (lần 01) → mở chi tiết, banner xanh có nút Nộp hồ sơ
    const it = itemOf(env, 'BM-SX-02-01');
    await go(page, `#/f/${it.qr_key}?r=01`);
    await page.waitForSelector('.item .scan-banner.ok');
    // Thẻ hồ sơ 12 kỳ: chưa có hồ sơ → các ngày đã qua hạn báo !, 4 ngày gần nhất –
    await page.waitForSelector('#item-records .rg-cells .rg-cell');
    const cls = await page.$$eval('#item-records .rg-cells .rg-cell', (bs) => bs.map((b) => b.className.replace(/.*c-/, '')));
    assert.equal(cls.length, 12);
    assert.deepEqual(cls.slice(-4), ['DUE', 'DUE', 'DUE', 'DUE']);
    assert.equal(cls[0], 'LATE');
    await page.locator('.scan-banner a', { hasText: 'Nộp hồ sơ' }).click();
    await page.waitForSelector('form.rec-form');
    // Biểu hằng ngày: mặc định Khoảng ngày (cả quyển sổ)
    assert.equal(await page.locator('.rec-range').isVisible(), true);
    await page.fill('#f-from', '2026-10-25');
    await page.fill('#f-to', '2026-11-05');
    await page.dispatchEvent('#f-to', 'change');
    await page.waitForFunction(() => /Phủ 12 kỳ/.test(document.querySelector('.rec-cover').textContent));
    // Thiếu ảnh → báo lỗi
    await page.click('#rf-save');
    await page.waitForSelector('.rec-files.bad, [data-field="pages"].bad');
    // Mất mạng rồi mới chụp/chọn ảnh và lưu
    await app.offline(true);
    await page.setInputFiles('#rf-pick', [
      { name: 'IMG_0001.png', mimeType: 'image/png', buffer: makePng(3200, 2400) },
      { name: 'IMG_0002.png', mimeType: 'image/png', buffer: makePng(64, 48) }
    ]);
    await page.waitForFunction(() => document.querySelectorAll('.rec-page').length === 2);
    await page.fill('#f-note', 'Sổ báo cáo ca 25/10–05/11');
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'record-new-iphone.png'), fullPage: true });
    await page.click('#rf-save');
    await page.waitForSelector('.rec-detail');
    assert.ok((await page.textContent('.rec-detail .item-head')).includes('Chờ gửi'));
    assert.equal(await page.locator('.rec-thumb').count(), 2);
    assert.equal(recordsOf(env).length, 0, 'chưa lên máy chủ');
    // Hàng chờ: 1 hồ sơ + 2 ảnh; ảnh 3200 px đã thu nhỏ còn ≤ 1600 px, dạng JPEG
    const q = await page.evaluate(async () => {
      const { queueItems } = await import('./js/sync.js');
      return (await queueItems()).map((o) => ({ a: o.action, mime: o.payload.mime_type, kind: o.payload.kind, len: (o.payload.content_b64 || '').length, page: o.payload.page_no }));
    });
    assert.deepEqual(q.map((x) => x.a), ['record.submit', 'doc.upload', 'doc.upload']);
    assert.ok(q.slice(1).every((x) => x.mime === 'image/jpeg' && x.kind === 'PHOTO'));
    const dims = await page.evaluate(async () => {
      const { queueItems } = await import('./js/sync.js');
      const o = (await queueItems()).find((x) => x.payload.page_no === 1);
      const img = new Image();
      img.src = 'data:image/jpeg;base64,' + o.payload.content_b64;
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    });
    assert.deepEqual(dims, [1600, 1200]);
    // Bảng kỳ khi còn mất mạng: các ngày trong khoảng hiện "chờ gửi"
    await page.click('.bnav-item[data-nav="records"]');
    await page.waitForSelector('.rg .rg-row');
    let st = await cellStates(page, 'BM-SX-02-01');
    assert.deepEqual(st.slice(0, 6), ['PEND', 'PEND', 'PEND', 'PEND', 'PEND', 'PEND']); // 31/10 … 05/11
    assert.equal(st[6], 'LATE'); // 06/11
    // Có mạng lại: app tự gửi hồ sơ rồi từng ảnh
    await app.offline(false);
    for (let i = 0; i < 60 && !(recordsOf(env)[0] && recordsOf(env)[0].files_json.length === 2); i++) await page.waitForTimeout(250);
    const r = recordsOf(env)[0];
    assert.ok(r, 'hồ sơ đã lên máy chủ');
    assert.equal(r.code, 'HS-2611-0001');
    assert.equal(r.period_from, '2026-10-25');
    assert.equal(r.period_to, '2026-11-05');
    assert.equal(r.note, 'Sổ báo cáo ca 25/10–05/11');
    assert.deepEqual(r.files_json.map((f) => f.page_no), [1, 2]);
    await page.waitForFunction(() => { const row = [...document.querySelectorAll('.rg-row')].find((x) => x.querySelector('.code').textContent.trim() === 'BM-SX-02-01'); return row && row.querySelector('.rg-cell.c-OK'); }, null, { timeout: 15000 });
    st = await cellStates(page, 'BM-SX-02-01');
    assert.deepEqual(st.slice(0, 6), ['OK', 'OK', 'OK', 'OK', 'OK', 'OK']);
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'records-iphone.png'), fullPage: true });
    // Chi tiết hồ sơ: mã HS, 2 ảnh xem qua máy chủ
    await go(page, '#/record/' + r.record_id);
    await page.waitForSelector('.rec-detail .doc-btn');
    assert.ok((await page.textContent('.rec-detail')).includes('HS-2611-0001'));
    assert.equal(await page.locator('.rec-detail .doc-btn').count(), 2);
    await page.locator('.rec-detail .doc-btn').first().click();
    await page.waitForSelector('.img-view img');
    await page.locator('.img-view [data-close]').click();
    assert.equal(app.consoleErrors.filter((e) => !/net::ERR_INTERNET_DISCONNECTED|Failed to fetch|ERR_FAILED/.test(e)).length, 0, app.consoleErrors.join('\n'));
  } finally { await app.close(); }
});

test('web: bảng kỳ theo bộ phận (✓ ! –, biểu tuần/khi phát sinh); trưởng bộ phận bấm ô → hồ sơ → Trả lại (PIN) → kỳ về quá hạn; người nộp thấy "hồ sơ bị trả lại"', async () => {
  const env = seeded();
  addUser(env, 'SX2', 2, '583920', { depts: 'SX' });
  addUser(env, 'SX3', 3, '583924', { depts: 'SX' });
  addUser(env, 'SX1', 1, '583929', { depts: 'SX' });
  // Nhân viên SX nộp 01–07/11 kèm 1 ảnh (qua API)
  const sx = makeClient(env);
  assert.equal(sx.login('SX2', '583920').ok, true);
  const rid = uuid();
  let r = sx.call('record.submit', { record_id: rid, item_id: itemOf(env, 'BM-SX-02-01').item_id, period_from: '2026-11-01', period_to: '2026-11-07', pages: 1 }, { operation_id: uuid(), expected_version: 0 });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = sx.call('doc.upload', { document_id: uuid(), entity_type: 'RECORD', entity_id: rid, kind: 'PHOTO', mime_type: 'image/jpeg', file_name: 'trang-1.jpg', content_b64: fakeJpegB64(), page_no: 1 }, { operation_id: uuid(), expected_version: 0 });
  assert.equal(r.ok, true, JSON.stringify(r));
  const app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page, 'SX3', '583924');
    // Trang chủ: ô Hồ sơ quá hạn có số (biểu SX hằng ngày khác chưa nộp)
    const od = await page.textContent('.stats .stat:nth-child(3) .stat-val');
    assert.ok(Number(od) >= 1, od);
    await page.click('.side-item[data-nav="records"]');
    await page.waitForSelector('.rg .rg-row');
    // Chỉ biểu của SX + Ban ISO; dòng BM-SX-02-01: 31/10 quá hạn, 01–07/11 ✓, 08–11/11 chưa tới hạn
    const st = await cellStates(page, 'BM-SX-02-01');
    assert.deepEqual(st, ['LATE', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'DUE', 'DUE', 'DUE', 'DUE']);
    const codes = await page.$$eval('.rg-row .code', (xs) => xs.map((x) => x.textContent.trim()));
    assert.ok(codes.every((c) => /^(BM|QT)-(SX|ISO)-/.test(c)), codes.join(','));
    assert.ok(await page.locator('.rg-sec h2', { hasText: 'Khi phát sinh' }).count() >= 0);
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'records-web.png'), fullPage: true });
    // Bấm ô 03/11 → hộp thoại có hồ sơ → mở hồ sơ
    const row = page.locator('.rg-row', { has: page.locator('.code', { hasText: /^BM-SX-02-01$/ }) });
    await row.locator('.rg-cell').nth(3).click();
    await page.waitForSelector('.modal .rec-row');
    await page.locator('.modal .rec-row').click();
    await page.waitForSelector('.rec-detail #rd-return');
    // Trả lại: lý do + PIN
    await page.click('#rd-return');
    await page.fill('#rr-reason', 'Ảnh mờ, chụp lại');
    await page.locator('.modal .btn.danger').click();
    await page.waitForSelector('.modal .pin-input');
    await page.fill('.modal .pin-input', '583924');
    await page.locator('.modal:has(.pin-input) .btn.primary').click();
    await page.waitForFunction(() => document.querySelector('.rec-detail .item-head') && document.querySelector('.rec-detail .item-head').textContent.includes('Bị trả lại'));
    assert.equal(recordsOf(env)[0].status, 'RETURNED');
    await go(page, '#/records');
    await page.waitForSelector('.rg .rg-row');
    const st2 = await cellStates(page, 'BM-SX-02-01');
    assert.deepEqual(st2.slice(1, 8), ['LATE', 'LATE', 'LATE', 'LATE', 'LATE', 'LATE', 'LATE']);
  } finally { await app.close(); }
  // Người nộp: Chờ bạn xử lý có hồ sơ bị trả lại → Nộp lại cùng khoảng ngày
  const app2 = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app2;
    await login(page, 'SX2', '583920');
    await page.waitForSelector('.pend-card');
    assert.ok((await page.textContent('.pend-card')).includes('1 hồ sơ bị trả lại'));
    await page.locator('.pend-row', { hasText: 'hồ sơ bị trả lại' }).click();
    await page.waitForSelector('.rec-detail');
    assert.ok((await page.textContent('.rec-detail')).includes('Ảnh mờ, chụp lại'));
    await page.locator('.rec-detail a', { hasText: 'Nộp lại' }).click();
    await page.waitForSelector('form.rec-form');
    assert.equal(await page.inputValue('#f-from'), '2026-11-01');
    assert.equal(await page.inputValue('#f-to'), '2026-11-07');
    assert.ok(await page.locator('.bnav-item[data-nav="records"] .nav-badge').count() === 1);
  } finally { await app2.close(); }
  // Tra cứu: nút Hồ sơ hiện lời giải thích, không có bảng
  const app3 = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app3;
    await login(page, 'SX1', '583929');
    await page.click('.bnav-item[data-nav="records"]');
    await page.waitForSelector('.empty-state');
    assert.ok((await page.textContent('.view')).includes('Tra cứu'));
    assert.equal(await page.locator('.rg-row').count(), 0);
  } finally { await app3.close(); }
});
