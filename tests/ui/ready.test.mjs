// Kiểm tra ISO (25/11/2026, người dùng yêu cầu "một danh mục mẫu khi cần kiểm tra ISO: nhìn vào biết thiếu biểu nào, biểu nào đã có"):
// dữ liệu như thật (phạm vi CĐ, danh mục mẫu ○ ◐, owner + Thư ký ISO cấp 4), Kho tệp mẫu có bộ BM-CĐ-04 (04-01, 04-03 + sheet phụ).
// iPhone: ô Trang chủ "3/4 đã có" → màn Kiểm tra ISO (3/4, Thiếu 1, Không áp dụng 1) → lọc Thiếu / Đã có → In (tải tệp mở sẵn đúng
// sheet) → Tải danh sách Excel (logo công ty, cột Có / Thiếu). Web: menu, đủ biểu sau khi có tệp mẫu cho biểu còn thiếu, Excel tải luôn;
// Tra cứu cấp 1 không có ô / menu, mở thẳng thì báo không có quyền.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser, uuid, fakePngB64, OWNER_CODE, OWNER_PIN } from '../helpers.mjs';
import { xlsx } from '../xlsx-node.mjs';
import { activeSheet } from '../../js/tplx.js';

const NOW = '2026-11-25T09:00:00+07:00';
const IPHONE = { viewport: { width: 390, height: 844 }, mobile: true };
const WEB = { viewport: { width: 1440, height: 900 }, mobile: false };
const X = xlsx();
const XL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function setFile(names) {
  const wb = X.utils.book_new();
  names.forEach((n) => X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([[n]]), n));
  return Buffer.from(X.write(wb, { type: 'array', bookType: 'xlsx' }));
}
function upload(owner, fileName, names) {
  const r = owner.write('tpl.upload', { tpl_id: uuid(), document_id: uuid(), file_name: fileName, mime_type: XL, content_b64: setFile(names).toString('base64'),
    sheets: names.map((n) => ({ n, p: n === 'BM-CĐ-04-03' ? 'A3' : 'A4', o: n === 'BM-CĐ-04-03' ? 'L' : 'P', h: false })) });
  assert.equal(r.ok, true, JSON.stringify(r));
}
function realLike() {
  const env = freshServer({ now: NOW, scope: 'CĐ' });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  env.g.dbReset_();
  addUser(env, 'TC', 1, '583923', { depts: 'CĐ' });
  upload(owner, 'BM-CD-04_Sua-chua.xlsx', ['Mục lục - 目录', 'BM-CĐ-04-01', 'BM-CĐ-04-03', 'BM-CĐ-04-03-TH', 'BM-CĐ-04-03-ML']);
  owner.pin(OWNER_PIN);
  assert.equal(owner.write('report.logo.set', { mime_type: 'image/png', content_b64: fakePngB64() }).ok, true);
  env.g.dbReset_();
  return { env, owner };
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
async function noRawKeys(page) {
  const txt = await page.evaluate(() => document.body.innerText);
  const raw = txt.match(/\b(?:rd|tpl|nav|tile|cat|status|where|cov|scope)\.[a-z_]+[A-Za-z_0-9.]*\b/g);
  return raw ? [...new Set(raw)] : [];
}
const codes = (page, sel = '.rd-row') => page.locator(sel).evaluateAll((els) => els.map((e) => e.dataset.code));
const sheetText = (buf) => { const wb = X.read(buf, { type: 'buffer' }); return X.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]); };

test('iPhone: ô Trang chủ → Kiểm tra ISO: 3/4 đã có, thiếu BM-CĐ-08-01; lọc Thiếu / Đã có; In tải tệp mở sẵn đúng sheet; Tải danh sách Excel có logo', async () => {
  const { env } = realLike();
  const app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page);
    // Ô Trang chủ: "3/4 đã có" (đỏ vì còn thiếu)
    const tile = page.locator('.grid9 .tile[href="#/ready"]');
    assert.match(await tile.innerText(), /Kiểm tra ISO[\s\S]*3\/4 đã có/);
    assert.equal(await tile.locator('.t-red-text').count(), 1);
    await tile.click();
    await page.waitForSelector('.rd-sum');
    // Tổng: 3/4, Thiếu 1, cách có: tệp mẫu 1 · M&E 1 · Checksheet 1, Không áp dụng 1 (BM-CĐ-01-05 ✕ không tính)
    assert.equal((await page.textContent('.rd-big .rd-n')).trim(), '3');
    assert.equal((await page.textContent('.rd-big .rd-of')).trim(), '/4');
    const sum = await page.innerText('.rd-sum');
    assert.match(sum, /Thiếu 1 biểu — cần bổ sung/);
    assert.match(sum, /Tệp mẫu 1 · In từ app M&E 1 · In từ app Checksheet 1/);
    assert.match(sum, /Không áp dụng 1 biểu \(không tính\)/);
    assert.match(sum, /Phạm vi: Cơ điện/);
    assert.deepEqual(await codes(page), ['BM-CĐ-02-05', 'BM-CĐ-03-03', 'BM-CĐ-04-03', 'BM-CĐ-08-01'], 'theo nhóm');
    assert.equal(await page.locator('.cov-group-h').count(), 4);
    const miss = page.locator('.rd-row.s-MISSING');
    assert.equal(await miss.count(), 1);
    assert.match(await miss.innerText(), /BM-CĐ-08-01[\s\S]*Thiếu[\s\S]*Chưa có tệp mẫu · 尚无模板 · Một phần M&E/);
    assert.match(await page.locator('.rd-row[data-code="BM-CĐ-04-03"]').innerText(), /Đã có[\s\S]*Tệp mẫu · 模板: BM-CĐ-04 · BM-CĐ-04-03 · A3 ngang[\s\S]*cũng in từ app M&E/);
    assert.match(await page.locator('.rd-row[data-code="BM-CĐ-02-05"]').innerText(), /In từ app Checksheet/);
    assert.equal(await page.locator('.rd-row[data-code="BM-CĐ-02-05"] button').count(), 0, 'biểu in từ app: không có nút In');
    assert.equal(await page.locator('.rd input').count(), 0, 'không có ô gõ → không bật bàn phím');
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'ready-iphone.png'), fullPage: true });
    // Lọc
    await page.click('.rd-chips [data-f="MISSING"]');
    await page.waitForFunction(() => document.querySelectorAll('.rd-row').length === 1);
    assert.deepEqual(await codes(page), ['BM-CĐ-08-01']);
    await page.click('.rd-chips [data-f="HAVE"]');
    await page.waitForFunction(() => document.querySelectorAll('.rd-row').length === 3);
    assert.equal(await page.locator('.rd-row.s-MISSING').count(), 0);
    await page.click('.rd-chips [data-f=""]');
    await page.waitForFunction(() => document.querySelectorAll('.rd-row').length === 4);
    // In: tải xong đổi thành "Mở / Lưu" → chạm lần nữa → tệp mở sẵn sheet BM-CĐ-04-03
    const btn = page.locator('.rd-row[data-code="BM-CĐ-04-03"] button.tpl-get');
    await btn.click();
    await page.waitForFunction(() => /Mở \/ Lưu/.test(document.querySelector('.rd-row[data-code="BM-CĐ-04-03"] button.tpl-get').innerText));
    const [dl] = await Promise.all([page.waitForEvent('download'), btn.click()]);
    assert.equal(dl.suggestedFilename(), 'BM-CD-04_Sua-chua.xlsx');
    assert.equal(activeSheet(X, new Uint8Array(fs.readFileSync(await dl.path()))), 'BM-CĐ-04-03');
    // Tải danh sách Excel → hộp thoại → Mở / lưu tệp: logo, tiêu đề, cột Có / Thiếu
    await page.click('#rd-xlsx');
    await page.waitForSelector('.modal #rd-open', { timeout: 20000 });
    const [dx] = await Promise.all([page.waitForEvent('download'), page.click('.modal #rd-open')]);
    assert.equal(dx.suggestedFilename(), 'Kiem_tra_ISO_2026-11-25.xlsx');
    const buf = fs.readFileSync(await dx.path());
    const txt = sheetText(buf);
    for (const s of ['DANH MỤC BIỂU MẪU KIỂM TRA ISO', 'ISO审核表单清单', 'BM-CĐ-08-01', '✗ Thiếu · 缺少', '✓ Đã có · 已有', '3/4', 'Tệp mẫu · 模板: BM-CĐ-04 · BM-CĐ-04-03',
      'In từ app Checksheet', 'Phạm vi · 范围: Cơ điện · 机电', 'Người lập', 'Chủ hệ thống']) assert.ok(txt.includes(s), s);
    const zip = X.CFB.read(new Uint8Array(buf), { type: 'array' });
    assert.ok(X.CFB.find(zip, '/xl/media/me_logo.png'), 'logo công ty trong Excel');
    await page.locator('.modal .modal-actions .btn').click();
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('web: menu Kiểm tra ISO; có tệp mẫu cho biểu còn thiếu → Đủ biểu; Excel tải luôn; Tra cứu cấp 1 không có ô / menu, mở thẳng báo không có quyền', async () => {
  const { env, owner } = realLike();
  upload(owner, 'BM-CD-08_Dien-nuoc.xlsx', ['BM-CĐ-08-01']);
  env.g.dbReset_();
  let app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page);
    await page.click('.side .side-item[data-nav="ready"]');
    await page.waitForSelector('.rd-sum');
    assert.equal((await page.textContent('.rd-big .rd-n')).trim(), '4');
    assert.match(await page.innerText('.rd-sum'), /Đủ biểu/);
    assert.equal(await page.locator('.rd-row.s-MISSING').count(), 0);
    await page.click('.rd-chips [data-f="MISSING"]');
    await page.waitForSelector('.rd .empty-state');
    assert.match(await page.innerText('.rd .empty-state'), /Không thiếu biểu nào/);
    await page.click('.rd-chips [data-f="HAVE"]');
    await page.waitForFunction(() => document.querySelectorAll('.rd-row').length === 4);
    // Máy tính: Excel tải xuống luôn, tên theo bộ lọc
    const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#rd-xlsx')]);
    assert.equal(dx.suggestedFilename(), 'Kiem_tra_ISO_2026-11-25_da_co.xlsx');
    assert.ok(sheetText(fs.readFileSync(await dx.path())).includes('4/4'));
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'ready-web.png'), fullPage: true });
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
  // Tra cứu cấp 1
  app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page, 'TC', '583923');
    assert.equal(await page.locator('.grid9 .tile[href="#/ready"]').count(), 0);
    assert.equal(await page.locator('.side .side-item[data-nav="ready"]').count(), 0);
    await go(page, '#/ready');
    await page.waitForSelector('.empty-state');
    assert.match(await page.innerText('.view'), /Kiểm tra ISO dành cho Nhân viên trở lên/);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});
