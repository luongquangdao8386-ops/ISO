// Phiên bản & ban hành trên giao diện (phiên 1b, nghiệm thu Đợt 1 mục 4): soạn (tải PDF) → gửi duyệt → duyệt → ban hành;
// người soạn không thấy nút Duyệt; bản cũ lỗi thời; trang chủ cập nhật % ban hành và ô Chờ bạn xử lý; gắn tệp cho biểu ● nhập từ Excel;
// xem PDF tải qua máy chủ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser, makeClient, uuid, OWNER_PIN } from '../helpers.mjs';

const NOW = '2026-11-11T08:10:00+07:00';
const IPHONE = { viewport: { width: 390, height: 844 }, mobile: true };
const WEB = { viewport: { width: 1440, height: 900 }, mobile: false };

function seeded() {
  const env = freshServer({ now: NOW });
  ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
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
const go = (page, h) => page.evaluate((x) => { location.hash = x; }, h);
const itemOf = (env, code) => { env.g.dbReset_(); return env.g.readRows_('Items').find((x) => x.code === code); };
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function noRawKeys(page) {
  const txt = await page.evaluate(() => document.body.innerText);
  const raw = txt.match(/\b(?:nav|home|cat|item|ver|vstate|vtype|file|btn|status|kind|level_doc)\.[a-z_]+[A-Z_0-9]*\b/g);
  return raw ? [...new Set(raw)] : [];
}
async function answerPin(page, pin) {
  await page.waitForSelector('.modal .pin-input');
  await page.fill('.modal .pin-input', pin);
  await page.locator('.modal:has(.pin-input) .btn.primary').click();
}

test('iPhone, chỉ owner + Thư ký ISO (cấp 4): soạn lần 01 có PDF → gửi duyệt → tự duyệt (PIN) → ban hành (không hỏi PIN lần hai) → trang chủ % ban hành tăng', async () => {
  const env = seeded();
  addUser(env, 'TK4', 4, '583930', { secretary: true });
  const app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page, 'TK4', '583930');
    const pct0 = await page.textContent('.stats .stat:nth-child(2) .stat-val');
    const it = itemOf(env, 'BM-ISO-03-01');
    await go(page, '#/item/' + it.item_id);
    await page.waitForSelector('.ver-card');
    assert.ok((await page.textContent('.ver-card')).includes('Chưa có phiên bản'));
    await page.locator('a[href^="#/version/new/"]').click();
    await page.waitForSelector('form.ver-form');
    assert.ok((await page.textContent('form.ver-form')).includes('lần 01'));
    // Thiếu PDF → báo lỗi, chưa gửi gì
    await page.fill('#f-change_summary_vi', 'Ban hành lần đầu');
    await page.locator('button[data-go="submit"]').click();
    await page.waitForSelector('.fld.bad[data-field="pdf"]');
    await page.setInputFiles('#f-file-PDF', { name: 'BM-ISO-03-01.pdf', mimeType: 'application/pdf', buffer: pdfBuf() });
    await page.locator('button[data-go="submit"]').click();
    await page.waitForSelector('.ver .item-head', { timeout: 20000 });
    assert.ok((await page.textContent('.item-head')).includes('Chờ duyệt'));
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'version-review-iphone.png'), fullPage: true });
    // Cấp 4 tự duyệt: ghi chú (không bắt buộc) → PIN
    await page.click('#v-approve');
    await page.locator('.modal .btn.primary').click();
    await answerPin(page, '583930');
    await page.waitForFunction(() => document.querySelector('.item-head') && document.querySelector('.item-head').textContent.includes('chờ ban hành'));
    // Ban hành: xác nhận, PIN còn hạn 5 phút → không hỏi lại
    await page.click('#v-issue');
    await page.locator('.modal .btn.primary').click();
    await page.waitForFunction(() => document.querySelector('.item-head') && document.querySelector('.item-head').textContent.includes('Đang hiệu lực'));
    assert.equal(await page.locator('.modal .pin-input').count(), 0);
    const it1 = itemOf(env, 'BM-ISO-03-01');
    assert.equal(it1.status, 'ISSUED');
    assert.equal(it1.current_rev, '01');
    assert.equal(it1.review_due, '2027-11-11');
    // Chi tiết biểu: bản hiện hành + nút Xem PDF
    await go(page, '#/item/' + it.item_id);
    await page.waitForSelector('.ver-cur');
    assert.ok((await page.textContent('.ver-cur')).includes('lần 01'));
    assert.equal(await page.locator('.ver-cur button[data-doc][data-kind="PDF"]').count(), 1);
    await page.screenshot({ path: path.join(SHOTS, 'item-version-iphone.png'), fullPage: true });
    // Trang chủ: % ban hành tăng
    await go(page, '#/');
    await page.waitForSelector('.stats');
    const pct1 = await page.textContent('.stats .stat:nth-child(2) .stat-val');
    assert.notEqual(pct1, pct0);
    assert.deepEqual(app.consoleErrors.filter((e) => !/favicon|ERR_INTERNET_DISCONNECTED/.test(e)), []);
  } finally { await app.close(); }
});

test('web: nhân viên soạn → không thấy nút Duyệt; trưởng bộ phận thấy "chờ bạn duyệt" và duyệt; Thư ký ISO ban hành; bản cũ lỗi thời; Xem PDF tải qua máy chủ', async () => {
  const env = seeded();
  addUser(env, 'SX2', 2, '583920', { depts: 'SX' });
  addUser(env, 'SX3', 3, '583924', { depts: 'SX' });
  addUser(env, 'TK2', 2, '583922', { depts: 'ISO', secretary: true });
  const it = itemOf(env, 'BM-SX-02-01');
  // Lần 02 đã ban hành qua API → bản sắp soạn trên giao diện là lần 03
  const api = (code, pin) => { const c = makeClient(env); const r = c.login(code, pin); assert.equal(r.ok, true); c.pin(pin); return c; };
  const sx = api('SX2', '583920'), head = api('SX3', '583924'), tk = api('TK2', '583922');
  const v2 = uuid();
  const ver = (id) => { env.g.dbReset_(); return env.g.readRows_('Versions').find((x) => x.version_id === id); };
  assert.equal(sx.write('version.save', { version_id: v2, item_id: it.item_id, change_summary_vi: 'Lần 2' }).ok, true);
  assert.equal(sx.write('doc.upload', { document_id: uuid(), entity_type: 'VERSION', entity_id: v2, kind: 'PDF', mime_type: 'application/pdf', file_name: 'l2.pdf', content_b64: pdfBuf().toString('base64') }).ok, true);
  assert.equal(sx.write('version.submit', { version_id: v2 }, { expected_version: ver(v2).record_version }).ok, true);
  assert.equal(head.write('version.approve', { version_id: v2 }, { expected_version: ver(v2).record_version }).ok, true);
  assert.equal(tk.write('version.issue', { version_id: v2 }, { expected_version: ver(v2).record_version }).ok, true);

  let app = await openApp({ env, now: NOW, ...WEB });
  let vid;
  try {
    const { page } = app;
    await login(page, 'SX2', '583920');
    await go(page, '#/version/new/' + it.item_id);
    await page.waitForSelector('form.ver-form');
    assert.ok((await page.textContent('form.ver-form')).includes('lần 03'));
    await page.fill('#f-change_summary_vi', 'Thêm cột ca');
    await page.setInputFiles('#f-file-PDF', { name: 'BM-SX-02-01_L03.pdf', mimeType: 'application/pdf', buffer: pdfBuf(6000) });
    await page.setInputFiles('#f-file-SOURCE', { name: 'BM-SX-02-01.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(2000, 1)]) });
    await page.locator('button[data-go="submit"]').click();
    await page.waitForSelector('.ver .item-head', { timeout: 20000 });
    vid = decodeURIComponent((await page.evaluate(() => location.hash)).split('/').pop());
    assert.equal(ver(vid).state, 'IN_REVIEW');
    assert.equal(ver(vid).rev, '03');
    // Người soạn: không có nút Duyệt, có dòng chờ trưởng bộ phận
    assert.equal(await page.locator('#v-approve').count(), 0);
    assert.ok((await page.textContent('.ver')).includes('Đang chờ trưởng bộ phận'));
    assert.equal(await page.locator('.ver button[data-doc]').count(), 2);
    await page.screenshot({ path: path.join(SHOTS, 'version-author-web.png'), fullPage: true });
  } finally { await app.close(); }

  app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page, 'SX3', '583924');
    await page.waitForSelector('.pend-card');
    assert.ok((await page.textContent('.pend-card')).includes('1 phiên bản chờ bạn duyệt'));
    assert.equal(await page.textContent('.side-item[data-nav="versions"] .nav-badge'), '1');
    await page.locator('.pend-row[href="#/versions?f=review"]').click();
    await page.waitForSelector('.ver-row');
    await page.locator('.ver-row').first().click();
    await page.waitForSelector('#v-approve');
    await page.click('#v-approve');
    await page.locator('.modal .btn.primary').click();
    await answerPin(page, '583924');
    await page.waitForFunction(() => document.querySelector('.item-head') && document.querySelector('.item-head').textContent.includes('chờ ban hành'));
    assert.equal(await page.locator('#v-issue').count(), 0, 'trưởng bộ phận không ban hành');
  } finally { await app.close(); }

  app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page, 'TK2', '583922');
    assert.ok((await page.textContent('.pend-card')).includes('1 phiên bản chờ ban hành'));
    await go(page, '#/version/' + vid);
    await page.waitForSelector('#v-issue');
    await page.click('#v-issue');
    assert.ok((await page.textContent('.modal')).includes('Lần 02 đang hiệu lực sẽ thành lỗi thời'));
    await page.locator('.modal .btn.primary').click();
    await answerPin(page, '583922');
    await page.waitForFunction(() => document.querySelector('.item-head') && document.querySelector('.item-head').textContent.includes('Đang hiệu lực'));
    assert.equal(ver(v2).state, 'SUPERSEDED');
    assert.equal(itemOf(env, 'BM-SX-02-01').current_rev, '03');
    // Chi tiết biểu: lần 03 hiện hành, lịch sử có lần 02 lỗi thời; Xem PDF → tải qua máy chủ, mở tab mới
    await go(page, '#/item/' + it.item_id);
    await page.waitForSelector('.ver-cur');
    assert.ok((await page.textContent('.ver-cur')).includes('lần 03'));
    await page.locator('details.ver-hist > summary').click();
    assert.ok((await page.textContent('.ver-hist')).includes('Lỗi thời'));
    const [popup] = await Promise.all([app.context.waitForEvent('page'), page.locator('.ver-cur button[data-kind="PDF"]').click()]);
    assert.ok(popup, 'mở tab PDF mới');
    assert.ok(app.calls.includes('doc.get'));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'item-version-web.png'), fullPage: true });
  } finally { await app.close(); }
});

test('web: biểu ● nhập từ Excel chưa có tệp → Gắn tệp bản hiện hành (PDF) → Lưu và ban hành (PIN) → hết cờ chưa có tệp; đặt ✕ và dùng lại', async () => {
  const env = seeded();
  const app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page, 'NV-001', OWNER_PIN);
    assert.ok((await page.textContent('.pend-card')).includes('chưa có tệp'));
    const it = itemOf(env, 'QT-ISO-01');
    await go(page, '#/item/' + it.item_id);
    await page.waitForSelector('a[href*="attach=1"]');
    await page.locator('a[href*="attach=1"]').click();
    await page.waitForSelector('form.ver-form');
    assert.ok((await page.textContent('form.ver-form')).includes('lần 02'));
    await page.setInputFiles('#f-file-PDF', { name: 'QT-ISO-01_L02.pdf', mimeType: 'application/pdf', buffer: pdfBuf() });
    await page.locator('button[data-go="issue"]').click();
    await answerPin(page, OWNER_PIN);
    await page.waitForFunction(() => document.querySelector('.item-head') && document.querySelector('.item-head').textContent.includes('Đang hiệu lực'), null, { timeout: 20000 });
    const it1 = itemOf(env, 'QT-ISO-01');
    assert.equal(it1.file_missing, false);
    assert.equal(it1.current_rev, '02');
    assert.equal(it1.issued_at, '2025-12-01');
    // Đặt ✕ (PIN còn hạn) rồi dùng lại
    const it2 = itemOf(env, 'BM-KD-02-01');
    await go(page, '#/item/' + it2.item_id);
    await page.waitForSelector('#it-na');
    await page.click('#it-na');
    await page.fill('#na-reason', 'Gộp vào BM-KD-02-02');
    await page.locator('.modal .btn.danger').click();
    await page.waitForSelector('#it-unna');
    assert.equal(itemOf(env, 'BM-KD-02-01').status, 'NA');
    assert.ok((await page.textContent('.item-head')).includes('Gộp vào BM-KD-02-02'));
    await page.click('#it-unna');
    await page.waitForSelector('#it-na');
    assert.equal(itemOf(env, 'BM-KD-02-01').status, 'NONE');
  } finally { await app.close(); }
});
