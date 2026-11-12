// Phạm vi Cơ điện + Kho tệp mẫu trên giao diện (2e) — chạy đúng các bước "Thử bản 2e" gửi người dùng, trên dữ liệu như thật (phạm vi CĐ,
// owner + Thư ký ISO cấp 4): Trang chủ có "Phạm vi: Cơ điện" + ô Kho tệp mẫu → Tải tệp mẫu lên (chọn nhiều tệp xlsx cùng lúc) → xem trước
// (bộ BM-CĐ-xx, số sheet, số biểu) → Tải lên → Kho: tìm mã, mở danh sách sheet → chi tiết biểu: thẻ Tệp mẫu (khổ A3 ngang, sheet phụ)
// → Tải tệp mẫu → tệp tải về mở sẵn đúng sheet. Web: menu Kho tệp mẫu, Danh mục lọc "Chưa có tệp mẫu", Bộ phận → Phạm vi áp dụng
// (đổi CĐ → CĐ + SX → danh mục có biểu SX → về lại CĐ, PIN), bỏ tệp tải nhầm (PIN) → tệp trước dùng lại; Tra cứu cấp 1 chỉ xem / tải.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser } from '../helpers.mjs';
import { xlsx } from '../xlsx-node.mjs';
import { readSheets, activeSheet } from '../../js/tplx.js';

const NOW = '2026-11-12T09:00:00+07:00';
const IPHONE = { viewport: { width: 390, height: 844 }, mobile: true };
const WEB = { viewport: { width: 1440, height: 900 }, mobile: false };
const X = xlsx();

/** Như dữ liệu thật: phạm vi CĐ (mặc định sản phẩm), danh mục mẫu ○ ◐, owner + Thư ký ISO cấp 4 */
function realLike() {
  const env = freshServer({ now: NOW, scope: 'CĐ' });
  ownerClient(env);
  const g = env.g;
  g.dbReset_();
  g.seedSample_('SYSTEM');
  g.dbReset_();
  addUser(env, 'TK', 4, '583922', { secretary: true });
  addUser(env, 'TC', 1, '583923', { depts: 'CĐ' });
  g.dbReset_();
  return env;
}

/** Bộ biểu xlsx giả như bộ thật (Mục lục + sheet mang mã, sheet phụ, một sheet A3 ngang) */
function setFile(names, a3 = []) {
  const wb = X.utils.book_new();
  names.forEach((n) => X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([[n]]), n));
  const zip = X.CFB.read(new Uint8Array(X.write(wb, { type: 'array', bookType: 'xlsx' })), { type: 'array' });
  names.forEach((n, i) => {
    const f = X.CFB.find(zip, `/xl/worksheets/sheet${i + 1}.xml`);
    const ps = a3.includes(n) ? '<pageSetup paperSize="8" orientation="landscape"/>' : '<pageSetup paperSize="9" orientation="portrait"/>';
    const x0 = new TextDecoder().decode(f.content);
    const x = /<pageMargins[^>]*\/>/.test(x0) ? x0.replace(/(<pageMargins[^>]*\/>)/, `$1${ps}`) : x0.replace('</worksheet>', ps + '</worksheet>');
    f.content = new TextEncoder().encode(x); f.size = f.content.length;
  });
  return Buffer.from(X.CFB.write(zip, { fileType: 'zip', type: 'array', compression: true }));
}
const SET04 = () => setFile(['Mục lục - 目录', 'BM-CĐ-04-01', 'BM-CĐ-04-03', 'BM-CĐ-04-03-TH', 'BM-CĐ-04-03-ML'], ['BM-CĐ-04-03']);
const SET03 = () => setFile(['Mục lục - 目录', 'BM-CĐ-03-01', 'BM-CĐ-03-03', 'BM-CĐ-03-03a', 'BM-CĐ-03-03b']);
const XL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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
/** PIN đã nhập trong 5 phút thì app không hỏi lại */
async function maybePin(page, pin) {
  const el = await page.waitForSelector('.modal .pin-input', { timeout: 2500 }).catch(() => null);
  if (el) await answerPin(page, pin);
}
const go = (page, h) => page.evaluate((x) => { location.hash = x; }, h);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function noRawKeys(page) {
  const txt = await page.evaluate(() => document.body.innerText);
  const raw = txt.match(/\b(?:tpl|scope|nav|tile|imp|cat|home)\.[a-z_]+[A-Za-z_0-9.]*\b/g);
  return raw ? [...new Set(raw)] : [];
}
const rows = (env, sheet) => { env.g.dbReset_(); return JSON.parse(JSON.stringify(env.g.readRows_(sheet))); };

test('iPhone: đúng các bước "Thử bản 2e" — Phạm vi Cơ điện, tải 2 bộ tệp mẫu lên, tìm, chi tiết biểu → tải tệp mở sẵn sheet', async () => {
  const env = realLike();
  const app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    // Bước 1: đăng nhập Thư ký ISO → Trang chủ ghi "Phạm vi: Cơ điện", ô Danh mục chỉ đếm biểu cơ điện
    await login(page, 'TK', '583922');
    assert.match(await page.locator('.home-scope').innerText(), /Phạm vi: Cơ điện/);
    const nCd = rows(env, 'Items').filter((x) => x.dept_code === 'CĐ').length;
    assert.match(await page.locator('.tile[href="#/catalog"]').innerText(), new RegExp(`${nCd} biểu`));
    // Bước 2: ô Kho tệp mẫu → chưa có tệp → Tải tệp mẫu lên
    await page.locator('.tile[href="#/templates"]').click();
    await page.waitForSelector('.tpl .empty-state');
    await page.locator('.tpl .empty-state a.btn.primary').click();
    // Bước 3: chọn 2 tệp cùng lúc → xem trước
    await page.waitForSelector('#tpl-files', { state: 'attached' });
    await page.setInputFiles('#tpl-files', [
      { name: 'BM-CD-04_Sua-chua-su-co.xlsx', mimeType: XL, buffer: SET04() },
      { name: 'BM-CD-03_Bao-tri-phong-ngua.xlsx', mimeType: XL, buffer: SET03() }
    ]);
    await page.waitForSelector('.tpl-up .tpl-sheet');
    const pv = await page.locator('.tpl-up .tpl-sheets').innerText();
    assert.match(pv, /BM-CĐ-04/);
    assert.match(pv, /BM-CĐ-03/);
    assert.match(pv, /5 sheet/);
    assert.match(await page.locator('#tpl-go').innerText(), /Tải lên 2 tệp/);
    await page.screenshot({ path: path.join(SHOTS, 'tpl-upload-iphone.png') });
    // Bước 4: Tải lên → xong → Kho tệp mẫu
    await page.click('#tpl-go');
    await page.waitForFunction(() => document.querySelectorAll('.tpl-up .t-green-text').length === 2, null, { timeout: 20000 });
    assert.equal(rows(env, 'TplFiles').length, 2);
    await page.locator('.tpl-up a.btn[href="#/templates"]').click();
    await page.waitForSelector('.tpl-set');
    assert.equal(await page.locator('.tpl-set').count(), 2);
    assert.match(await page.locator('.tpl .cat-sum').innerText(), /2 tệp · 10 sheet/);
    assert.equal(await noOverflow(page), true);
    // Bước 5: tìm "04-03" → các sheet của biểu BM-CĐ-04-03
    await page.fill('#tpl-q', '04-03');
    await page.waitForFunction(() => /sheet khớp/.test(document.querySelector('.tpl').innerText));
    assert.equal(await page.locator('.tpl .tpl-sheet').count(), 3, 'BM-CĐ-04-03, -TH, -ML');
    await page.screenshot({ path: path.join(SHOTS, 'tpl-iphone.png') });
    // Bước 6: mở biểu BM-CĐ-04-03 → thẻ Tệp mẫu: sheet A3 ngang + 2 sheet phụ
    await page.locator('.tpl .tpl-it').first().click();
    await page.waitForSelector('#item-tpl');
    const card = await page.locator('#item-tpl').innerText();
    assert.match(card, /BM-CĐ-04-03\s+A3 ngang/);
    assert.match(card, /BM-CĐ-04-03-TH/);
    assert.match(card, /sheet phụ/);
    assert.match(card, /In sheet hiện tại/);
    // Bước 7: Tải tệp mẫu → iPhone: tải xong đổi thành "Mở / Lưu" → chạm lần nữa → tệp (mở sẵn sheet BM-CĐ-04-03)
    const btn = page.locator('#item-tpl .tpl-row').first().locator('button.tpl-get');
    await btn.click();
    await page.waitForFunction(() => /Mở \/ Lưu/.test(document.querySelector('#item-tpl .tpl-row button.tpl-get').innerText));
    const [dl] = await Promise.all([page.waitForEvent('download'), btn.click()]);
    const file = fs.readFileSync(await dl.path());
    assert.equal(dl.suggestedFilename(), 'BM-CD-04_Sua-chua-su-co.xlsx');
    assert.equal(activeSheet(X, new Uint8Array(file)), 'BM-CĐ-04-03');
    assert.deepEqual(readSheets(X, new Uint8Array(file)).map((s) => s.n), readSheets(X, new Uint8Array(SET04())).map((s) => s.n));
    await page.screenshot({ path: path.join(SHOTS, 'tpl-item-iphone.png') });
    assert.deepEqual(await noRawKeys(page), []);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('web: menu Kho tệp mẫu, Danh mục lọc "Chưa có tệp mẫu", Bộ phận → Phạm vi áp dụng (PIN), bỏ tệp tải nhầm → tệp trước dùng lại; Tra cứu chỉ xem / tải', async () => {
  const env = realLike();
  const app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page, 'TK', '583922');
    assert.equal(await page.locator('.side .side-item[data-nav="templates"]').count(), 1);
    await page.click('.side .side-item[data-nav="templates"]');
    await page.waitForSelector('.tpl');
    // Tải lên một bộ, rồi tải nhầm bản thứ hai cùng bộ
    await go(page, '/templates/upload');
    await page.waitForSelector('#tpl-files', { state: 'attached' });
    await page.setInputFiles('#tpl-files', [{ name: 'BM-CD-04_Sua-chua.xlsx', mimeType: XL, buffer: SET04() }]);
    await page.waitForSelector('#tpl-go:not([disabled])');
    await page.click('#tpl-go');
    await page.waitForSelector('.tpl-up .t-green-text', { timeout: 20000 });
    await page.setInputFiles('#tpl-files', [{ name: 'BM-CD-04_nham.xlsx', mimeType: XL, buffer: setFile(['BM-CĐ-04-01']) }]);
    await page.waitForSelector('.tpl-up .tpl-sheet');
    assert.match(await page.locator('.tpl-up .tpl-sheets').innerText(), /thay BM-CD-04_Sua-chua\.xlsx/);
    await page.click('#tpl-go');
    await page.waitForSelector('.tpl-up .t-green-text', { timeout: 20000 });
    await go(page, '/templates');
    await page.waitForSelector('.tpl-set');
    assert.match(await page.locator('.tpl-set').innerText(), /BM-CD-04_nham\.xlsx/);
    assert.match(await page.locator('.tpl-old').innerText(), /Tệp đã thay bằng tệp mới \(1\)/);
    // Bỏ tệp tải nhầm (PIN) → tệp trước dùng lại
    await page.locator('.tpl-set [data-del]').click();
    await page.fill('#tpl-reason', 'Tải nhầm');
    await page.locator('.modal .btn.danger').click();
    await answerPin(page, '583922');
    await page.waitForFunction(() => /BM-CD-04_Sua-chua\.xlsx/.test((document.querySelector('.tpl-set') || {}).innerText || ''), null, { timeout: 15000 });
    assert.deepEqual(rows(env, 'TplFiles').map((t) => [t.file_name, t.state]).sort(), [['BM-CD-04_Sua-chua.xlsx', 'ACTIVE'], ['BM-CD-04_nham.xlsx', 'DELETED']]);
    // Máy tính: Tải (một sheet) → tải xuống luôn, mở sẵn sheet đó
    await page.locator('.tpl-set details.tpl-det summary').click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.tpl-set .tpl-sheet button[data-sheet="BM-CĐ-04-01"]').click()]);
    assert.equal(activeSheet(X, new Uint8Array(fs.readFileSync(await dl.path()))), 'BM-CĐ-04-01');
    await page.screenshot({ path: path.join(SHOTS, 'tpl-web.png') });
    // Danh mục: lọc "Chưa có tệp mẫu" (biểu cơ điện chưa có sheet nào trong kho)
    await go(page, '/catalog');
    await page.waitForSelector('.cat-tbl');
    await page.locator('details.filters summary').click();
    await page.selectOption('#cf-f', 'notpl');
    await page.waitForFunction(() => document.querySelector('#cf-f').value === 'notpl');
    const codes = await page.locator('.cat-tbl td.code').allInnerTexts();
    assert.ok(codes.length > 0 && !codes.includes('BM-CĐ-04-03') && codes.every((c) => c.startsWith('BM-CĐ-')), codes.join(','));
    // Bộ phận → Phạm vi áp dụng: thêm SX (PIN) → danh mục có biểu SX; về lại CĐ
    await go(page, '/admin/depts');
    await page.waitForSelector('#scope-card');
    assert.match(await page.locator('#scope-card').innerText(), /App đang quản lý biểu, tài liệu của: Cơ điện · 应用当前管理以下部门的表单、文件：机电/);
    await page.locator('.scope-chips input[value="SX"]').check();
    await page.click('#scope-save');
    await page.locator('.modal .btn.primary').click();
    await maybePin(page, '583922');
    await page.waitForFunction(() => /của: Sản xuất, Cơ điện ·/.test(document.querySelector('#scope-card').innerText), null, { timeout: 15000 });
    assert.match(await page.locator('#scope-card').innerText(), /当前管理以下部门的表单、文件：生产、机电/);
    await go(page, '/catalog');
    await page.waitForSelector('.cat-tbl');
    await page.waitForFunction(() => [...document.querySelectorAll('.cat-tbl td.code')].some((x) => x.textContent.startsWith('BM-SX-')));
    await go(page, '/admin/depts');
    await page.waitForSelector('#scope-card');
    await page.locator('.scope-chips input[value="SX"]').uncheck();
    await page.click('#scope-save');
    await page.locator('.modal .btn.primary').click();
    await page.waitForFunction(() => /của: Cơ điện ·/.test(document.querySelector('#scope-card').innerText), null, { timeout: 15000 });
    await go(page, '/catalog');
    await page.waitForSelector('.cat-tbl');
    assert.ok((await page.locator('.cat-tbl td.code').allInnerTexts()).every((c) => c.startsWith('BM-CĐ-')));
    // Trạng thái hệ thống: Phạm vi áp dụng, Kho tệp mẫu
    await go(page, '/admin/status');
    await page.waitForFunction(() => /Kho tệp mẫu/.test(document.body.innerText) && /Phạm vi áp dụng/.test(document.body.innerText), null, { timeout: 15000 });
    assert.deepEqual(await noRawKeys(page), []);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
  // Tra cứu cấp 1: thấy kho, tải được, không có nút tải lên / bỏ tệp
  const app2 = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app2;
    await login(page, 'TC', '583923');
    await go(page, '/templates');
    await page.waitForSelector('.tpl-set');
    assert.equal(await page.locator('#tpl-up, [data-del], [data-edit]').count(), 0);
    assert.equal(await page.locator('.tpl-set .tpl-acts button.tpl-get').count(), 1, 'Tải cả tệp');
    assert.equal(await page.locator('.tpl-old').count(), 0, 'cấp 1 không thấy tệp đã thay');
    assert.deepEqual(app2.consoleErrors, []);
  } finally { await app2.close(); }
});

test('app 2e với máy chủ 2d (chưa dán Code.gs mới): Kho tệp mẫu báo cập nhật máy chủ, chi tiết biểu không có thẻ Tệp mẫu, không lỗi', async () => {
  const env = realLike();
  // Máy chủ 2d: chưa có tpl.*, chưa có sheet TplFiles, chưa có cài đặt scope_depts (toàn công ty)
  ['tpl.upload', 'tpl.edit', 'tpl.delete'].forEach((k) => { delete env.g.HANDLERS_[k]; });
  env.g.book_('B').deleteSheet(env.g.book_('B').getSheetByName('TplFiles'));
  env.g.dbReset_();
  const rn = env.g.findRowNums_('Settings', 'setting_key', 'scope_depts')[0];
  env.g.sh_('Settings').deleteRow(rn);
  env.g.cache_().remove('cfg:settings');
  env.g.dbReset_();
  const app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page, 'TK', '583922');
    await go(page, '/templates');
    await page.waitForSelector('.tpl, .empty-state');
    assert.match(await page.locator('.view').innerText(), /Máy chủ chưa lên bản có Kho tệp mẫu/);
    const it = rows(env, 'Items').find((x) => x.dept_code === 'CĐ');
    await go(page, '/item/' + it.item_id);
    await page.waitForSelector('.item-head');
    assert.equal(await page.locator('#item-tpl').count(), 0);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});
