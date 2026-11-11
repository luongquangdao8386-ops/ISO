// Giao diện app ISO với máy chủ giả lập (390×844 iPhone và 1440×900 web): đăng nhập PIN, trang chủ, nav 5 nút, Danh mục
// (lọc, tìm Việt/Trung không làm mất ô đang gõ), chi tiết biểu, tem QR lỗi thời, mở khi mất mạng, bộ nhớ tiền tố iso,
// phạm vi bộ phận, Excel (xuất, nhập lô xem trước → ghi có PIN), màn "Sắp có"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser, OWNER_CODE, OWNER_PIN } from '../helpers.mjs';
import { xlsx } from '../xlsx-node.mjs';
import { buildCatalogWorkbook } from '../../js/catalog-xlsx.js';
import { polishXlsx } from '../../js/xlsx.js';

const NOW = '2026-11-06T08:10:00+07:00';
const IPHONE = { viewport: { width: 390, height: 844 }, mobile: true };
const WEB = { viewport: { width: 1440, height: 900 }, mobile: false };

function seeded() {
  const env = freshServer({ now: NOW });
  ownerClient(env); // đổi PIN tạm → OWNER_PIN
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
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
/** Không còn khóa nhãn thô (vd "cat.code") lọt ra màn hình */
async function noRawKeys(page) {
  const txt = await page.evaluate(() => document.body.innerText);
  const raw = txt.match(/\b(?:nav|home|cat|item|imp|xl|soon|adm|admin|account|sync|btn|draft|logo|status|kind|where|period|role|tile)\.[a-z_]+[A-Z_0-9]*\b/g);
  return raw ? [...new Set(raw)] : [];
}

test('iPhone: đăng nhập PIN, trang chủ (biểu tượng, 4 ô số, ô Sắp có), nav 5 nút; Danh mục tìm Việt/Trung không mất ô đang gõ; chi tiết biểu; tem lỗi thời; bộ nhớ iso', async () => {
  const env = seeded();
  const app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page);
    assert.equal(await page.locator('.bnav > *').count(), 5);
    const navText = await page.textContent('.bnav');
    for (const w of ['Trang chủ', 'Danh mục', 'Quét', 'Hồ sơ', 'Tài khoản']) assert.ok(navText.includes(w), w);
    assert.equal(await page.locator('.home-hero img.brand-logo[src*="iso-tile.svg"]').count(), 1);
    assert.equal(await page.locator('.stats > .stat').count(), 4);
    assert.ok((await page.textContent('.stats')).includes('25'));
    assert.ok(await page.locator('.grid9 .tile.soon').count() >= 4, 'ô của phiên sau mờ "Sắp có"');
    assert.ok((await page.textContent('.pend-card')).includes('chưa có tệp'));
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'home-iphone.png'), fullPage: true });

    // Danh mục: tìm không dấu, tìm tiếng Trung; ô tìm giữ nguyên phần tử khi vẽ lại (bàn phím iPhone không bật lại)
    await page.click('.bnav-item[data-nav="catalog"]');
    await page.waitForSelector('.cat-row');
    assert.equal(await page.locator('.cat-row').count(), 25);
    const q = page.locator('#cat-q');
    await q.click();
    const h1 = await q.elementHandle();
    await q.pressSequentially('dao tao', { delay: 20 });
    await page.waitForFunction(() => document.querySelectorAll('.cat-row').length === 1);
    assert.ok((await page.textContent('.cat-list')).includes('BM-NS-01-02'));
    assert.equal(await page.evaluate((el) => el === document.activeElement && el.isConnected, h1), true, 'ô tìm vẫn là phần tử cũ, vẫn focus');
    await q.fill('');
    await q.pressSequentially('培训', { delay: 20 });
    await page.waitForFunction(() => document.querySelectorAll('.cat-row').length === 1);
    await q.fill('');
    await page.waitForFunction(() => document.querySelectorAll('.cat-row').length === 25);
    // Lọc bằng nút tình trạng và ô chọn: không đưa con trỏ vào ô nhập chữ
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.locator('.chip[data-st="ISSUED"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.cat-row').length === 10);
    assert.notEqual(await page.evaluate(() => document.activeElement && document.activeElement.tagName), 'INPUT');
    await page.locator('details.filters > summary').click();
    await page.selectOption('#cf-dept', 'SX');
    await page.waitForFunction(() => document.querySelectorAll('.cat-row').length === 2);
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'catalog-iphone.png') });
    await page.locator('.cat-row', { hasText: 'BM-SX-02-01' }).click();
    await page.waitForSelector('.item');
    const det = await page.textContent('.item');
    for (const w of ['Báo cáo sản xuất ca', '班次生产报告', 'Sản xuất', '8.5.1', 'Lần ban hành', 'Hằng ngày']) assert.ok(det.includes(w), w);
    assert.equal(await page.locator('img[src*="iso-tile.svg"]').count(), 0, 'màn nghiệp vụ không có biểu tượng app');
    assert.ok(await noOverflow(page));
    await page.screenshot({ path: path.join(SHOTS, 'item-iphone.png'), fullPage: true });

    // Tem QR của biểu: lần ban hành trên tem khác bản hiện hành → báo đỏ
    const it = env.rows('Items').find((x) => x.code === 'QT-ISO-01');
    await go(page, `#/f/${it.qr_key}?r=01`);
    await page.waitForSelector('.item .banner.err');
    assert.ok((await page.textContent('.banner.err')).includes('lỗi thời'));
    await go(page, `#/f/${it.qr_key}?r=02`);
    await page.waitForSelector('.item .banner.ok');

    // Màn của phiên sau
    await page.click('.bnav-item[data-nav="records"]');
    await page.waitForSelector('.soon-page');
    assert.ok((await page.textContent('.soon-page')).includes('Sắp có'));

    // Bộ nhớ: chỉ tiền tố iso_thu (trang /ISO-thu/), không tạo dữ liệu tên me*, cs*
    const st = await page.evaluate(async () => ({ dbs: (await indexedDB.databases()).map((d) => d.name), keys: Object.keys(localStorage) }));
    assert.ok(st.dbs.includes('iso_thu_data') && st.dbs.includes('iso_thu_auth'), st.dbs.join(','));
    assert.ok(st.dbs.every((n) => /^iso_thu_/.test(n)), st.dbs.join(','));
    assert.ok(st.keys.every((k) => /^iso_thu\./.test(k)), st.keys.join(','));
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('iPhone: mất mạng vẫn mở được app bằng PIN và xem danh mục đã tải', async () => {
  const env = seeded();
  const app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page);
    app.serverDown(true);
    await page.reload();
    await page.waitForSelector('#upin', { timeout: 20000 });
    await page.fill('#upin', OWNER_PIN);
    await page.waitForSelector('.grid9', { timeout: 20000 });
    assert.equal(await page.locator('#st-offline').isHidden(), false, 'dải Ngoại tuyến hiện');
    await page.click('.bnav-item[data-nav="catalog"]');
    await page.waitForSelector('.cat-row');
    assert.equal(await page.locator('.cat-row').count(), 25);
    await page.screenshot({ path: path.join(SHOTS, 'offline-iphone.png') });
  } finally { await app.close(); }
});

test('phạm vi bộ phận: Nhân viên SX chỉ thấy biểu SX + Ban ISO, không có Excel; Tra cứu không thấy nút sửa', async () => {
  const env = seeded();
  addUser(env, 'SX2', 2, '583920', { depts: 'SX' });
  const app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page, 'SX2', '583920');
    await go(page, '#/catalog');
    await page.waitForSelector('.cat-tbl');
    const codes = await page.locator('.cat-tbl td.code').allTextContents();
    assert.ok(codes.length > 0 && codes.every((c) => /^(BM|QT)-(SX|ISO)-/.test(c)), codes.join(','));
    assert.ok((await page.textContent('.cat')).includes('SX'), 'ghi chú phạm vi');
    assert.equal(await page.locator('.side-item[data-nav="excel"]').count(), 0);
    assert.equal(await page.locator('#cat-add').count(), 0);
    await page.locator('tr[data-href]').first().click();
    await page.waitForSelector('.item');
    assert.equal(await page.locator('#it-edit').count(), 0);
  } finally { await app.close(); }
});

test('web: menu trái (màn phiên sau mờ "Sắp có"), Excel xuất đúng khuôn, nhập lô: xem trước → ghi (PIN) → danh mục cập nhật', async () => {
  const env = seeded();
  const app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page);
    assert.equal(await page.locator('.side .side-item').count(), 11);
    assert.equal(await page.locator('.side .side-item[data-nav="versions"]').count(), 1);
    assert.equal(await page.locator('.side .side-item.soon').count(), 6);
    assert.ok(await page.locator('.stats').isVisible());
    assert.ok(await page.locator('.home-depts').isVisible());
    await page.screenshot({ path: path.join(SHOTS, 'home-web.png'), fullPage: true });
    await go(page, '#/catalog');
    await page.waitForSelector('.cat-tbl');
    assert.equal(await page.locator('.cat-tbl tbody tr').count(), 25);
    await page.screenshot({ path: path.join(SHOTS, 'catalog-web.png') });
    // Xuất
    await go(page, '#/excel');
    await page.waitForSelector('#xl-export');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#xl-export')]);
    assert.match(dl.suggestedFilename(), /^Danh_muc_ISO_tong_2026-11-06\.xlsx$/);
    // Nhập: tệp có một biểu sửa tên và một biểu mới
    const X = xlsx();
    const items = env.rows('Items');
    const groups = env.rows('Groups');
    const depts = env.rows('Depts');
    const clauses = env.rows('Clauses');
    const ed = items.map((x) => (x.code === 'BM-KV-01-03' ? { ...x, name_vi: 'Sổ nhiệt độ, độ ẩm kho thành phẩm' } : x));
    ed.push({ code: 'BM-KV-02-01', name_vi: 'Phiếu xuất kho', name_zh: '出库单', dept_code: 'KV', group_key: 'KV-02', status: 'NONE', where: 'MANUAL', sort_order: 99 });
    const { wb, polish } = buildCatalogWorkbook(X, { items: ed, groups: groups.concat([{ group_key: 'KV-02', label: '02. Xuất nhập · 出入库' }]), depts, clauses, grace: 3, epoch: env.props.getProperty('DATASET_EPOCH') });
    const bytes = polishXlsx(X, X.write(wb, { type: 'array', bookType: 'xlsx', compression: true }), polish);
    await page.setInputFiles('#xl-file', { name: 'tong.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(bytes) });
    await page.waitForSelector('#xl-preview .imp-sum', { timeout: 20000 });
    const sum = await page.textContent('#xl-preview .imp-sum');
    assert.ok(sum.includes('Thêm 1') && sum.includes('Sửa 1') && sum.includes('Không đổi 24'), sum);
    await page.screenshot({ path: path.join(SHOTS, 'excel-preview-web.png'), fullPage: true });
    await page.click('#imp-commit');
    await page.locator('.modal .btn.primary').click(); // xác nhận ghi
    await page.waitForSelector('.modal .pin-input');
    await page.fill('.modal .pin-input', OWNER_PIN);
    await page.locator('.modal .btn.primary').click();
    await page.waitForSelector('#imp-out .banner.ok', { timeout: 20000 });
    assert.ok((await page.textContent('#imp-out')).includes('2'));
    await go(page, '#/catalog');
    await page.waitForSelector('.cat-tbl');
    assert.equal(await page.locator('.cat-tbl tbody tr').count(), 26);
    assert.ok((await page.textContent('.cat-tbl')).includes('thành phẩm'));
    assert.deepEqual(await noRawKeys(page), []);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('iPhone: Tài khoản → Quản trị: thêm người dùng có bộ phận + Thư ký ISO (PIN, PIN tạm hiện một lần); bộ phận và trưởng bộ phận', async () => {
  const env = seeded();
  const app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page);
    await page.click('.bnav-item[data-nav="account"]');
    await page.waitForSelector('a[href="#/admin/users"]');
    assert.ok(await page.locator('a[href="#/admin/depts"]').count());
    await page.click('a[href="#/admin/users"]');
    await page.waitForSelector('#u-add');
    assert.ok((await page.textContent('.view')).includes('Thư ký ISO'), 'tài khoản mẫu MAU-TK có nhãn Thư ký ISO');
    await page.click('#u-add');
    await page.fill('#f-employee_code', 'tk09');
    await page.fill('#f-display_name', 'Thư ký mới');
    await page.check('[data-dept="ISO"]');
    await page.check('#f-iso_secretary');
    await page.click('[data-x="save"]');
    await page.waitForSelector('.modal .pin-input');
    await page.fill('.modal .pin-input', OWNER_PIN);
    await page.locator('.modal:has(.pin-input) .btn.primary').click();
    await page.waitForSelector('.temp-pin');
    assert.match(await page.textContent('.temp-pin'), /^\d{6}$/);
    await page.locator('.modal:has(.temp-pin) .btn.primary').click();
    const u = env.rows('Users').find((x) => x.employee_code === 'TK09');
    assert.equal(u.iso_secretary, true);
    assert.equal(u.dept_codes, 'ISO');
    await go(page, '#/admin/depts');
    await page.waitForSelector('[data-dept="CL"]');
    assert.ok((await page.textContent('.view')).includes('Trưởng QA MẪU'), 'trưởng bộ phận CL của dữ liệu mẫu');
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'depts-iphone.png'), fullPage: true });
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('web: Quản trị → Sao lưu → Tài khoản sao lưu thứ hai: lưu email (PIN) → máy chủ chia sẻ thư mục Sao lưu + Dữ liệu, trạng thái "Đang chia sẻ"', async () => {
  const env = seeded();
  const app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page);
    await go(page, '#/admin/backup');
    await page.waitForSelector('#bk-mirror');
    assert.ok((await page.textContent('#bk-mirror')).includes('Chưa đặt'));
    await page.fill('#mi-email', 'b-account@example.test');
    await page.click('#mi-save');
    await page.waitForSelector('.modal .pin-input');
    await page.fill('.modal .pin-input', OWNER_PIN);
    await page.locator('.modal:has(.pin-input) .btn.primary').click();
    await page.waitForFunction(() => (document.querySelector('#bk-mirror') || {}).textContent && document.querySelector('#bk-mirror').textContent.includes('Đang chia sẻ'));
    assert.ok((await page.textContent('#bk-mirror')).includes('ISO_Backups_THU, ISO_Data_THU'));
    const shared = [...env.drive._folders.values()].filter((f) => f.viewers.has('b-account@example.test')).map((f) => f.name).sort();
    assert.deepEqual(shared, ['ISO_Backups_THU', 'ISO_Data_THU']);
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'backup-mirror-web.png'), fullPage: true });
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});
