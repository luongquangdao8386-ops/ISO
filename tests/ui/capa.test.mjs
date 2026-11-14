// Khắc phục trên giao diện (Đợt 3, phiên 3a — hướng A: phạm vi Cơ điện) — test 1 chạy đúng các bước HUONG_DAN "Thử bản 3a" gửi người
// dùng, trên dữ liệu như thật (phạm vi CĐ, danh mục toàn ○ ◐, owner + Thư ký ISO cấp 4): Trang chủ → ô Khắc phục → Lập phiếu (KP-2611-001)
// → Ghi nguyên nhân gốc → Thêm 2 hành động (một người ngoài app) → Báo xong → Thêm ảnh → Gửi kiểm tra hiệu lực → Kiểm tra hiệu lực: Không
// hiệu lực (PIN) → In phiếu (PDF BC-2611-001, mã biểu BM-CĐ-14-02) → Sổ theo dõi → Hủy phiếu thử (PIN) → Trạng thái hệ thống.
// Test 2 (web): Nhân viên CĐ lập phiếu từ chi tiết biểu, giao hành động cho nhân viên SX → SX thấy ở Chờ bạn xử lý, báo xong; trưởng bộ phận
// CĐ kiểm tra hiệu lực → Có hiệu lực → Đã đóng; sổ theo dõi. Test 3: app 3a với máy chủ 2e.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser } from '../helpers.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const IPHONE = { viewport: { width: 390, height: 844 }, mobile: true };
const WEB = { viewport: { width: 1440, height: 900 }, mobile: false };
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

/** Như dữ liệu thật: phạm vi Cơ điện, danh mục toàn ○ ◐ (● đổi thành ◐), owner + Thư ký ISO cấp 4 */
function realLike() {
  const env = freshServer({ now: NOW, scope: 'CĐ' });
  ownerClient(env);
  const g = env.g;
  g.dbReset_();
  g.seedSample_('SYSTEM');
  g.dbReset_();
  g.systemWrite_(g.readRows_('Items').map((it) => {
    const r = { ...it, status: it.status === 'ISSUED' ? 'DRAFTING' : it.status, current_rev: '', issued_at: '', issued_source: '', review_due: '', file_missing: false, record_version: (it.record_version || 0) + 1 };
    delete r.__row;
    return { sheet: 'Items', mode: 'update', row: r };
  }));
  addUser(env, 'TK', 4, '583922', { secretary: true });
  g.dbReset_();
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
const rows = (env, sheet) => { env.g.dbReset_(); return JSON.parse(JSON.stringify(env.g.readRows_(sheet))); };
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function noRawKeys(page) {
  const txt = await page.evaluate(() => document.body.innerText);
  const raw = txt.match(/\b(?:capa|nav|tile|rpt|rp|home|mail|health)\.[a-z_]+[A-Za-z_0-9.]*\b/g);
  return raw ? [...new Set(raw)] : [];
}
/** Bấm nút chính của hộp thoại đang mở (trên cùng) */
const modalPrimary = (page) => page.locator('.modal').last().locator('.modal-actions .btn.primary').click();
const waitGone = (page) => page.waitForSelector('.modal', { state: 'detached' });

test('iPhone: đúng các bước "Thử bản 3a" — lập phiếu → nguyên nhân → 2 hành động → báo xong → ảnh → gửi kiểm tra → Không hiệu lực (PIN) → In phiếu PDF → Sổ theo dõi → Hủy phiếu thử (PIN) → Trạng thái hệ thống', async () => {
  const env = realLike();
  const app = await openApp({ env, ...IPHONE, now: NOW });
  try {
    const { page } = app;
    await login(page, 'TK', '583922');
    // Bước 1: Trang chủ → ô Khắc phục (hết "Sắp có")
    assert.equal(await page.locator('.grid9 .tile[href="#/capa"].soon').count(), 0);
    await page.click('.grid9 .tile[href="#/capa"]');
    await page.waitForSelector('#capa-new');
    assert.match(await page.textContent('.view'), /Chưa có phiếu khắc phục nào/);
    // Bước 2: Lập phiếu khắc phục
    await page.click('#capa-new');
    await page.waitForSelector('form.capa-form');
    assert.equal(await page.locator('[data-src="EQUIPMENT"].on').count(), 1, 'nguồn mặc định Sự cố thiết bị');
    assert.equal(await page.inputValue('#f-dept_code'), 'CĐ', 'phạm vi Cơ điện: bộ phận chọn sẵn');
    assert.equal(await page.inputValue('#f-found_date'), '2026-11-12');
    assert.equal(await page.inputValue('#f-due_date'), '2026-12-12');
    const itemId = rows(env, 'Items').find((x) => x.code === 'BM-CĐ-04-03').item_id;
    await page.selectOption('#f-item_id', itemId);
    await page.fill('#f-title_vi', 'Thử khắc phục');
    await page.fill('#f-problem_vi', 'Máy nén khí số 2 dừng do quá nhiệt (phiếu thử)');
    await page.fill('#f-correction_vi', 'Chuyển sang máy nén số 1');
    assert.ok(await noOverflow(page));
    await page.screenshot({ path: path.join(SHOTS, 'capa-new-iphone.png'), fullPage: true });
    await page.click('#capa-save');
    await page.waitForSelector('.item.capa');
    assert.equal((await page.textContent('.item.capa .code.big')).trim(), 'KP-2611-001');
    assert.match(await page.textContent('.item.capa .item-head'), /Đang xử lý/);
    // Bước 3: Ghi nguyên nhân gốc
    await page.click('#capa-cause-btn');
    await page.fill('#cc-vi', 'Két giải nhiệt bám bụi, chưa có trong lịch bảo trì tuần');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('.capa-cause p:not(.muted)');
    // Bước 4: Thêm 2 hành động (hành động 2 giao người ngoài app)
    await page.click('#capa-act-add');
    await page.fill('#ca-vi', 'Vệ sinh két giải nhiệt');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('.capa-act-list .capa-act');
    await page.click('#capa-act-add');
    await page.fill('#ca-vi', 'Lắp cảm biến báo nhiệt');
    await page.selectOption('#ca-owner', '');
    await page.fill('#ca-assignee', 'Tổ cơ điện ca 2');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForFunction(() => document.querySelectorAll('.capa-act-list .capa-act').length === 2);
    assert.match(await page.textContent('.capa-act-list .capa-act:nth-child(2)'), /Tổ cơ điện ca 2/);
    assert.equal(await page.locator('#capa-complete[disabled]').count(), 1, 'còn hành động chưa xong: chưa gửi kiểm tra được');
    // Bước 5: Báo xong từng hành động
    for (const txt of ['Đã vệ sinh két', 'Đã lắp cảm biến']) {
      await page.locator('[data-adone]').first().click();
      await page.fill('#cd-vi', txt);
      await modalPrimary(page);
      await waitGone(page);
      await page.waitForSelector(`.capa-act-done:has-text("${txt}")`);
    }
    // Bước 6: Thêm ảnh
    await page.setInputFiles('#capa-file', { name: 'anh.png', mimeType: 'image/png', buffer: PNG_1X1 });
    await page.waitForSelector('.capa-files .doc-btn', { timeout: 20000 });
    assert.equal(rows(env, 'Capas')[0].files_json.length, 1);
    await page.screenshot({ path: path.join(SHOTS, 'capa-detail-iphone.png'), fullPage: true });
    // Bước 7: Gửi kiểm tra hiệu lực (hạn mặc định +30 ngày)
    await page.click('#capa-complete:not([disabled])');
    assert.equal(await page.inputValue('#cp-due'), '2026-12-12');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('.item.capa .item-head:has-text("Chờ kiểm tra hiệu lực")');
    // Bước 8: Kiểm tra hiệu lực → Không hiệu lực → PIN → phiếu về Đang xử lý
    await page.click('#capa-verify');
    await page.click('[data-res="NOT_EFFECTIVE"]');
    await page.fill('#cv-vi', 'Thử: chưa đạt');
    await modalPrimary(page);
    await answerPin(page, '583922');
    await page.waitForSelector('.item.capa .banner.err');
    assert.match(await page.textContent('.item.capa .banner.err'), /Lần kiểm tra 1/);
    assert.match(await page.textContent('.item.capa .item-head'), /Đang xử lý/);
    assert.equal(rows(env, 'Capas')[0].verify_count, 1);
    assert.deepEqual(await noRawKeys(page), []);
    // Bước 9: In phiếu khắc phục → màn Báo cáo (chọn sẵn phiếu, tự Xem) → Tải PDF
    await page.click('.rp-link');
    await page.waitForSelector('.rp-paper');
    assert.equal(await page.locator('.rp-item[data-kind="CAPA"].on').count(), 1);
    const paper = await page.textContent('.rp-paper');
    assert.match(paper, /PHIẾU YÊU CẦU HÀNH ĐỘNG KHẮC PHỤC/);
    assert.match(paper, /BM-CĐ-14-02/);
    assert.match(paper, /KP-2611-001/);
    assert.match(paper, /Không hiệu lực/);
    await page.click('#rp-pdf');
    await page.waitForSelector('.modal:has-text("BC-2611-001")', { timeout: 20000 });
    await page.locator('.modal .modal-actions .btn').click();
    await waitGone(page);
    // Bước 10: Sổ theo dõi khắc phục
    await page.selectOption('#rf-capa', '');
    await page.click('#rp-run');
    await page.waitForSelector('.rp-paper:has-text("SỔ THEO DÕI HÀNH ĐỘNG KHẮC PHỤC")');
    assert.match(await page.textContent('.rp-paper'), /KP-2611-001/);
    // Bước 11: Hủy phiếu thử (lý do + PIN)
    await go(page, '#/capa');
    await page.waitForSelector('.capa-row');
    await page.click('.capa-row');
    await page.waitForSelector('#capa-cancel');
    await page.click('#capa-cancel');
    await page.fill('#dlg-text', 'Phiếu thử nghiệm');
    await modalPrimary(page);
    // PIN còn hạn 5 phút sau lần nhập ở bước 8: không hỏi lại
    await page.waitForSelector('.item.capa .item-head:has-text("Đã hủy")');
    assert.equal(rows(env, 'Capas')[0].state, 'CANCELLED');
    // Bước 12: Trạng thái hệ thống
    await go(page, '#/admin/status');
    await page.waitForFunction(() => /quá hạn kiểm tra hiệu lực/.test(document.body.textContent));
    const st = await page.textContent('.view');
    assert.match(st, /Đang xử lý 0 · chờ kiểm tra hiệu lực 0 · đã đóng 0 · hành động quá hạn 0 · quá hạn kiểm tra hiệu lực 0/);
    assert.match(st, /1\.0\.14/);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('web: Nhân viên CĐ lập phiếu từ chi tiết biểu, giao hành động cho nhân viên SX → SX thấy ở Chờ bạn xử lý, báo xong → trưởng BP CĐ kiểm tra hiệu lực (PIN) → Đã đóng; sổ theo dõi', async () => {
  const env = freshServer({ now: NOW, scope: 'CĐ' });
  ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  addUser(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  addUser(env, 'CD3', 3, '583923', { depts: 'CĐ' });
  addUser(env, 'SX2', 2, '583924', { depts: 'SX' });
  env.g.dbReset_();
  const itemId = rows(env, 'Items').find((x) => x.code === 'BM-CĐ-04-03').item_id;
  // 1. Nhân viên CĐ: chi tiết biểu → thẻ Khắc phục → Lập phiếu (biểu liên quan chọn sẵn)
  let app = await openApp({ env, ...WEB, now: NOW });
  try {
    const { page } = app;
    await login(page, 'CD2', '583920');
    assert.equal(await page.locator('.side .side-item[data-nav="capa"].soon').count(), 0);
    await go(page, '#/item/' + itemId);
    await page.waitForSelector('.capa-card');
    await page.click('.capa-card a.btn');
    await page.waitForSelector('form.capa-form');
    assert.equal(await page.inputValue('#f-item_id'), itemId);
    await page.click('[data-src="INSPECTION"]');
    await page.fill('#f-problem_vi', 'Kiểm tra tuần phát hiện dây đai máy nén mòn');
    await page.click('#capa-save');
    await page.waitForSelector('.item.capa');
    await page.click('#capa-cause-btn');
    await page.fill('#cc-vi', 'Không có lịch thay dây đai định kỳ');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('#capa-act-add:not([disabled])');
    await page.click('#capa-act-add');
    await page.fill('#ca-vi', 'Thay dây đai, lập lịch thay 6 tháng');
    await page.selectOption('#ca-owner', { label: 'SX2 (SX2)' });
    await page.fill('#ca-due', '2026-11-16');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('.capa-act');
    await page.screenshot({ path: path.join(SHOTS, 'capa-detail-web.png'), fullPage: true });
  } finally { await app.close(); }
  // 2. Nhân viên SX: Chờ bạn xử lý → phiếu → Báo xong
  app = await openApp({ env, ...WEB, now: NOW });
  try {
    const { page } = app;
    await login(page, 'SX2', '583924');
    await page.waitForSelector('.pend-row:has-text("hành động khắc phục của bạn")');
    await page.click('.pend-row:has-text("hành động khắc phục của bạn")');
    await page.waitForSelector('[data-adone]');
    assert.equal(await page.locator('#capa-act-add').count(), 0, 'người phụ trách hành động không thêm hành động');
    await page.click('[data-adone]');
    await page.fill('#cd-vi', 'Đã thay dây đai, thêm vào lịch bảo trì');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('.capa-act-done');
  } finally { await app.close(); }
  // 3. Nhân viên CĐ: Gửi kiểm tra hiệu lực (hạn 3 ngày sau)
  app = await openApp({ env, ...WEB, now: NOW });
  try {
    const { page } = app;
    await login(page, 'CD2', '583920');
    await page.click('.side .side-item[data-nav="capa"]');
    await page.waitForSelector('.capa-row');
    await page.click('.capa-row');
    await page.click('#capa-complete:not([disabled])');
    await page.fill('#cp-due', '2026-11-15');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('.item.capa .item-head:has-text("Chờ kiểm tra hiệu lực")');
    assert.equal(await page.locator('#capa-verify').count(), 0, 'người phụ trách phiếu không tự kiểm tra hiệu lực');
  } finally { await app.close(); }
  // 4. Trưởng BP CĐ: Chờ bạn xử lý → Kiểm tra hiệu lực → Có hiệu lực (PIN) → Đã đóng; Sổ theo dõi
  app = await openApp({ env, ...WEB, now: NOW });
  try {
    const { page } = app;
    await login(page, 'CD3', '583923');
    await page.waitForSelector('.pend-row:has-text("chờ bạn kiểm tra hiệu lực")');
    await page.click('.pend-row:has-text("chờ bạn kiểm tra hiệu lực")');
    await page.waitForSelector('#capa-verify');
    await page.click('#capa-verify');
    await page.click('[data-res="EFFECTIVE"]');
    await page.fill('#cv-vi', 'Máy nén chạy ổn định, không mòn bất thường');
    await modalPrimary(page);
    await answerPin(page, '583923');
    await page.waitForSelector('.item.capa .banner.ok');
    assert.match(await page.textContent('.item.capa .banner.ok'), /Đã đóng/);
    assert.equal(rows(env, 'Capas')[0].state, 'CLOSED');
    await go(page, '#/capa');
    await page.waitForSelector('.view .chips.tabs');
    await page.click('.list-head a[href="#/reports?kind=CAPA"]');
    await page.waitForSelector('.rp-paper:has-text("SỔ THEO DÕI HÀNH ĐỘNG KHẮC PHỤC")');
    assert.match(await page.textContent('.rp-paper'), /KP-2611-001/);
    assert.match(await page.textContent('.rp-paper'), /Đã đóng/);
    assert.deepEqual(await noRawKeys(page), []);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('app 3a với máy chủ 2e (chưa dán Code.gs mới): ô Khắc phục ẩn, màn Khắc phục báo cần cập nhật máy chủ, Báo cáo không có loại Khắc phục', async () => {
  const env = realLike();
  ['capa.save', 'capa.action.save', 'capa.action.done', 'capa.action.cancel', 'capa.complete', 'capa.verify', 'capa.cancel'].forEach((k) => { delete env.g.HANDLERS_[k]; });
  const app = await openApp({ env, ...IPHONE, now: NOW });
  try {
    const { page } = app;
    await login(page, 'TK', '583922');
    assert.equal(await page.locator('.grid9 .tile[href="#/capa"]').count(), 0);
    await go(page, '#/capa');
    await page.waitForSelector('.empty-state');
    assert.match(await page.textContent('.view'), /Máy chủ chưa lên bản 3a/);
    await go(page, '#/reports');
    await page.waitForSelector('.rp-item');
    assert.equal(await page.locator('.rp-item[data-kind="CAPA"]').count(), 0);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});
