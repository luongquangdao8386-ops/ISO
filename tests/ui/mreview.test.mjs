// Xem xét lãnh đạo và Xóa sạch dữ liệu trên giao diện (Đợt 4, phiên 4c — giữ phạm vi Cơ điện; xóa sạch chỉ thử trên giả lập).
// Test 1 (iPhone, như app thật: owner + Thư ký ISO cấp 4; danh mục toàn ○ ◐; có khiếu nại, SCAR, NC, khắc phục trong năm): Trang chủ → Xem xét
// lãnh đạo → Lập cuộc xem xét (kỳ mặc định 01/01 – hôm nay) → số liệu tự gom hiện ở từng mục → Ghi Đã họp khi thiếu → nhắc → Sửa (ngày họp,
// chủ trì, kết luận) → Thêm quyết định (người phụ trách trong app, hạn) → Ghi Đã họp (PIN) → số liệu chốt → In BM-ISO-05-01 → Tải PDF →
// Trạng thái hệ thống dòng Xem xét lãnh đạo.
// Test 2 (web, quyền): người phụ trách quyết định (cấp 2) thấy ở Chờ bạn xử lý, báo Đã xong; không có menu Xem xét lãnh đạo, không lập được;
// trưởng bộ phận (cấp 3) thấy menu, chỉ xem.
// Test 3 (iPhone, owner): Tài khoản → Quản trị → Xóa sạch dữ liệu → Giữ danh mục → số dòng sẽ xóa → gõ sai / đúng (XOÁ) → Xóa sạch (PIN) →
// Đã xóa sạch → Đăng nhập lại → danh mục còn, Xem xét lãnh đạo trống.
// Test 4: app 4c với máy chủ 4b (chưa dán Code.gs 4c): không có ô / menu Xem xét lãnh đạo, màn báo cần cập nhật máy chủ; không có Xóa sạch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser, makeClient, uuid, OWNER_CODE, OWNER_PIN } from '../helpers.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const IPHONE = { viewport: { width: 390, height: 844 }, mobile: true };
const WEB = { viewport: { width: 1440, height: 900 }, mobile: false };
const TK_PIN = '583922';

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
  addUser(env, 'TK', 4, TK_PIN, { secretary: true });
  g.dbReset_();
  return env;
}
const rows = (env, sheet) => { env.g.dbReset_(); return JSON.parse(JSON.stringify(env.g.readRows_(sheet))); };

/** Qua API: khiếu nại (nặng), SCAR, NC, khắc phục nội bộ trong năm 2026 (bộ phận CĐ) */
function activity(env) {
  const tk = makeClient(env);
  assert.equal(tk.login('TK', TK_PIN).ok, true);
  const base = { dept_code: 'CĐ', due_date: '2026-12-31' };
  for (const p of [
    { source: 'EQUIPMENT', found_date: '2026-03-10', problem_vi: 'Máy nén khí dừng do quá nhiệt' },
    { source: 'COMPLAINT', found_date: '2026-04-01', party_name: 'Khách A', severity: 'MAJOR', problem_vi: 'Lô hộp lỗi in do máy in dừng' },
    { source: 'SUPPLIER', found_date: '2026-05-02', party_name: 'NCC Phụ tùng', problem_vi: 'Vòng bi sai mã' }]) {
    const r = tk.write('capa.save', { capa_id: uuid(), ...base, ...p });
    assert.equal(r.ok, true, JSON.stringify(r));
  }
  const r = tk.write('ncr.save', { ncr_id: uuid(), stage: 'INCOMING', dept_code: 'CĐ', found_date: '2026-06-01', product_text: 'Vòng bi 6205', problem_vi: 'Sai kích thước' });
  assert.equal(r.ok, true, JSON.stringify(r));
  return tk;
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
  const raw = txt.match(/\b(?:mr|reset|nav|tile|rpt|rp|home|health|admin)\.[a-z_]+[A-Za-z_0-9.]*\b/g);
  return raw ? [...new Set(raw)] : [];
}
const modalPrimary = (page) => page.locator('.modal').last().locator('.modal-actions .btn.primary').click();
const bodyHas = (page, re) => page.waitForFunction((src) => new RegExp(src).test(document.body.textContent), re.source, { timeout: 20000 });
const stat = (page, sec, label) => page.evaluate(([s, l]) => {
  const k = [...document.querySelectorAll(`.mr-sec[data-sec="${s}"] .mr-stat`)].find((x) => x.querySelector('span').textContent.startsWith(l));
  return k ? k.querySelector('strong').textContent.trim() : null;
}, [sec, label]);

test('iPhone: Lập cuộc xem xét → số liệu tự gom → Ghi Đã họp thiếu → Sửa → Thêm quyết định → Ghi Đã họp (PIN) → In BM-ISO-05-01 (PDF) → Trạng thái hệ thống', async () => {
  const env = realLike();
  activity(env);
  addUser(env, 'CD2', 2, '583931', { depts: 'CĐ' });
  const app = await openApp({ env, ...IPHONE, now: NOW });
  try {
    const { page } = app;
    await login(page, 'TK', TK_PIN);
    // 1. Trang chủ → ô Xem xét lãnh đạo → chưa có → Lập
    await page.click('.grid9 .tile[href="#/mreview"]');
    await page.waitForSelector('#mr-new');
    assert.match(await page.textContent('.view'), /Chưa có cuộc xem xét lãnh đạo nào/);
    await page.click('#mr-new');
    await page.waitForSelector('form.mr-form');
    assert.equal(await page.inputValue('#f-period_from'), '2026-01-01');
    assert.equal(await page.inputValue('#f-period_to'), '2026-11-12');
    assert.equal(await page.locator('.mr-in-edit').count(), 12);
    await page.fill('#f-chair_name', 'Giám đốc nhà máy');
    await page.fill('#f-in_context_vi', 'Khách hàng mới yêu cầu chứng nhận BRCGS');
    await page.fill('#f-in_objectives_vi', 'Đạt 4/5 mục tiêu chất lượng năm');
    assert.ok(await noOverflow(page));
    await page.click('#mr-save');
    // 2. Chi tiết: XL-26-01 Đang chuẩn bị, số liệu tự gom
    await page.waitForSelector('.mr-card .code:has-text("XL-26-01")');
    assert.match(await page.textContent('.mr-card'), /Đang chuẩn bị/);
    await page.waitForFunction(() => /tính lúc/.test(document.querySelector('#mr-stats-note').textContent));
    assert.equal(await stat(page, 'satisfaction', 'Khiếu nại khách hàng tiếp nhận trong kỳ'), '1');
    assert.equal(await stat(page, 'satisfaction', 'Theo mức độ'), '0 / 1 / 0');
    assert.equal(await stat(page, 'process', 'Sản phẩm không phù hợp phát hiện trong kỳ'), '1');
    assert.equal(await stat(page, 'capa', 'Phiếu khắc phục lập trong kỳ'), '1');
    assert.equal(await stat(page, 'supplier', 'Nhà cung cấp nhiều SCAR nhất trong kỳ'), 'NCC Phụ tùng (1)');
    assert.match(await stat(page, 'monitoring', 'Đã ban hành'), /^0\/\d+ · 0 %$/);
    assert.equal(await stat(page, 'audit', 'Chưa có chương trình đánh giá nội bộ năm'), '—');
    assert.match(await page.textContent('.mr-sec[data-sec="context"]'), /Khách hàng mới yêu cầu chứng nhận BRCGS/);
    assert.match(await page.textContent('.mr-sec[data-sec="resources"]'), /Chưa ghi — mục này app không có số liệu/);
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'mreview-iphone.png'), fullPage: true });
    // 3. Ghi Đã họp khi thiếu ngày họp, kết luận → nhắc, không hỏi PIN
    await page.click('#mr-hold');
    await bodyHas(page, /Chưa đủ để ghi Đã họp: Ngày họp.*Kết luận/);
    assert.equal(await page.locator('.modal .pin-input').count(), 0);
    // 4. Sửa: ngày họp hôm nay, kết luận
    await page.click('#mr-edit');
    await page.waitForSelector('form.mr-form');
    assert.equal(await page.inputValue('#f-in_context_vi'), 'Khách hàng mới yêu cầu chứng nhận BRCGS');
    await page.fill('#f-meeting_date', '2026-11-12');
    await page.fill('#f-attendees_text', 'Giám đốc, Thư ký ISO, trưởng các bộ phận');
    await page.fill('#f-conclusion_vi', 'Hệ thống quản lý phù hợp, thỏa đáng, có hiệu lực; cần tăng cường bảo trì phòng ngừa');
    await page.click('#mr-save');
    await page.waitForSelector('.mr-card .code:has-text("XL-26-01")');
    assert.match(await page.textContent('.mr-outputs'), /cần tăng cường bảo trì phòng ngừa/);
    // 5. Thêm quyết định: người phụ trách trong app (CD2), hạn
    await page.click('#mr-dec-add');
    await page.waitForSelector('.modal #md-kind');
    await page.fill('.modal #md-vi', 'Lắp cảm biến nhiệt cho máy nén khí');
    await page.selectOption('.modal #md-owner', { label: 'CD2 (CD2)' });
    assert.equal(await page.isHidden('.modal #md-name-fld'), true);
    await page.fill('.modal #md-due', '2026-11-15');
    await modalPrimary(page);
    await page.waitForSelector('.mr-dec:has-text("Lắp cảm biến nhiệt")');
    assert.match(await page.textContent('.mr-dec'), /Cơ hội cải tiến.*Đang làm.*Người phụ trách · 负责人: CD2.*Hạn · 期限: 15\/11\/2026/s);
    // 6. Ghi Đã họp → xác nhận → PIN → số liệu chốt
    await page.click('#mr-hold');
    await page.waitForSelector('.modal:has-text("Ghi XL-26-01 đã họp ngày 12/11/2026")');
    await modalPrimary(page);
    await answerPin(page, TK_PIN);
    await page.waitForSelector('.mr-card .banner.ok');
    assert.match(await page.textContent('.mr-card'), /Đã họp — số liệu chốt lúc/);
    assert.match(await page.textContent('#mr-stats-note'), /Số liệu đã chốt lúc/);
    assert.equal(await stat(page, 'satisfaction', 'Khiếu nại khách hàng tiếp nhận trong kỳ'), '1');
    assert.equal(await page.locator('#mr-hold').count(), 0);
    assert.equal(await page.locator('#mr-reopen').count(), 1);
    const row = rows(env, 'MgmtReviews')[0];
    assert.equal(row.state, 'HELD');
    assert.equal(JSON.parse(JSON.stringify(row.stats_json)).data.complaint.new, 1);
    // 7. In BM-ISO-05-01 → Báo cáo tự xem → Tải PDF
    await page.click('.mr-actions .rp-link');
    await page.waitForSelector('.rp-paper');
    assert.match(await page.textContent('.rp-paper .paper-title'), /ĐẦU VÀO VÀ KẾT QUẢ XEM XÉT LÃNH ĐẠO/);
    assert.match(await page.textContent('.rp-paper'), /BM-ISO-05-01/);
    assert.match(await page.textContent('.rp-paper'), /c1\) Sự thỏa mãn của khách hàng/);
    assert.match(await page.textContent('.rp-paper'), /Lắp cảm biến nhiệt cho máy nén khí/);
    assert.match(await page.textContent('.rp-paper .paper-sign'), /Thư ký ISO \(người lập\).*Chủ trì xem xét.*Giám đốc nhà máy/s);
    await page.click('#rp-pdf');
    await page.waitForSelector('.modal #of-open', { timeout: 30000 });
    assert.match(await page.textContent('.modal .rp-file-name'), /^BC-2611-001_xem-xet-lanh-dao_XL-26-01\.pdf$/);
    await page.locator('.modal .modal-actions .btn').click();
    // 8. Trạng thái hệ thống
    await go(page, '#/admin/status');
    await bodyHas(page, /Gần nhất XL-26-01 họp 12\/11\/2026 · đang chuẩn bị 0 · quyết định đang làm 1/);
    assert.match(await page.textContent('.view'), /1\.0\.14/);
    assert.match(await page.textContent('.view'), /Chưa xóa sạch lần nào/);
    assert.deepEqual(app.consoleErrors.filter((e) => !/favicon|net::ERR/.test(e)), []);
  } finally {
    await app.close();
  }
});

test('web: người phụ trách quyết định (cấp 2) báo Đã xong từ Chờ bạn xử lý; không có menu, không lập được; trưởng bộ phận (cấp 3) chỉ xem', async () => {
  const env = realLike();
  const tk = activity(env);
  addUser(env, 'CD2', 2, '583931', { depts: 'CĐ' });
  addUser(env, 'CD3', 3, '583932', { depts: 'CĐ' });
  env.g.dbReset_();
  const cd2 = env.rows('Users').find((u) => u.employee_code === 'CD2').user_id;
  const id = uuid(), d1 = uuid();
  let r = tk.write('mreview.save', { review_id: id, period_from: '2026-01-01', period_to: '2026-11-12', meeting_date: '2026-11-12', chair_name: 'Giám đốc',
    conclusion_vi: 'Phù hợp', decisions: [{ id: d1, kind: 'RESOURCE', text_vi: 'Bổ sung dụng cụ đo', owner_user_id: cd2, due: '2026-11-10' }] });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(tk.pin(TK_PIN).ok, true);
  r = tk.write('mreview.hold', { review_id: id }, { expected_version: rows(env, 'MgmtReviews')[0].record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  const app = await openApp({ env, ...WEB, now: NOW });
  try {
    const { page } = app;
    await login(page, 'CD2', '583931');
    assert.equal(await page.locator('.side .side-item[data-nav="mreview"]').count(), 0);
    assert.match(await page.textContent('.pend-card'), /1 quyết định xem xét lãnh đạo bạn phụ trách đến hạn/);
    await page.click('.pend-row:has-text("quyết định xem xét lãnh đạo")');
    await page.waitForSelector('.mr-dec');
    assert.match(await page.textContent('.mr-dec'), /Quá hạn/);
    assert.equal(await page.locator('#mr-edit, #mr-dec-add, [data-dec-ed]').count(), 0);
    await page.click('[data-dec-done]');
    await page.waitForSelector('.modal #mdd-date');
    await page.fill('.modal #mdd-note', 'Đã mua 2 thước cặp');
    await modalPrimary(page);
    await page.waitForSelector('.mr-dec:has-text("Đã mua 2 thước cặp")');
    assert.match(await page.textContent('.mr-dec'), /xong 12\/11\/2026.*Đã mua 2 thước cặp/s);
    assert.equal(JSON.parse(JSON.stringify(rows(env, 'MgmtReviews')[0].decisions_json))[0].state, 'DONE');
    await go(page, '#/mreview');
    await page.waitForSelector('.mr-row');
    assert.equal(await page.locator('#mr-new').count(), 0);
    // Trưởng bộ phận: có menu, chỉ xem
    await go(page, '#/account');
    await page.waitForSelector('#ac-logout');
    await page.click('#ac-logout');
    await login(page, 'CD3', '583932');
    assert.equal(await page.locator('.side .side-item[data-nav="mreview"]').count(), 1);
    await page.click('.side .side-item[data-nav="mreview"]');
    await page.waitForSelector('.mr-row');
    assert.equal(await page.locator('#mr-new').count(), 0);
    await page.click('.mr-row');
    await page.waitForSelector('.mr-card');
    assert.equal(await page.locator('#mr-edit, #mr-reopen, #mr-dec-add, [data-dec-open]').count(), 0);
    assert.equal(await page.locator('.mr-actions .rp-link').count(), 1);
    assert.ok(await noOverflow(page));
  } finally {
    await app.close();
  }
});

test('iPhone owner: Xóa sạch dữ liệu — Giữ danh mục → gõ sai / đúng (XOÁ) → PIN → Đã xóa sạch → đăng nhập lại; danh mục còn, xem xét lãnh đạo trống', async () => {
  const env = realLike();
  const tk = activity(env);
  assert.equal(tk.write('mreview.save', { review_id: uuid(), period_from: '2026-01-01', period_to: '2026-11-12' }).ok, true);
  const nItems = rows(env, 'Items').length;
  const app = await openApp({ env, ...IPHONE, now: NOW });
  try {
    const { page } = app;
    await login(page, OWNER_CODE, OWNER_PIN);
    await page.click('.bnav-item[data-nav="account"]');
    await page.waitForSelector('a[href="#/admin/reset"]');
    await page.click('a[href="#/admin/reset"]');
    await page.waitForSelector('#rs-mode');
    assert.match(await page.textContent('.xs-card'), /Máy chủ THỬ/);
    assert.match(await page.textContent('.view'), /Giữ \d+ biểu \/ tài liệu/);
    assert.match(await page.textContent('.xs-counts'), /Phiếu khắc phục, khiếu nại, SCAR[^\d]*3/);
    assert.match(await page.textContent('.xs-counts'), /Xem xét lãnh đạo[^\d]*1/);
    await page.click('[data-mode="ALL"]');
    assert.match(await page.textContent('.xs-counts'), /Biểu, tài liệu trong danh mục[^\d]*\d+/);
    await page.click('[data-mode="KEEP_CATALOG"]');
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'reset-iphone.png'), fullPage: true });
    // Gõ sai → nút khóa, báo; gõ kiểu XOÁ → nút mở
    await page.fill('#rs-text', 'XÓA TOÀN BÔ');
    assert.equal(await page.isDisabled('#rs-go'), true);
    assert.equal(await page.isVisible('#rs-text-hint'), true);
    await page.fill('#rs-text', 'xoá toàn bộ');
    assert.equal(await page.isDisabled('#rs-go'), false);
    await page.click('#rs-go');
    await page.waitForSelector('.modal:has-text("GIỮ danh mục")');
    await modalPrimary(page);
    await answerPin(page, OWNER_PIN);
    await page.waitForSelector('.modal:has-text("Đã xóa sạch")', { timeout: 30000 });
    assert.match(await page.textContent('.modal'), /Đã sao lưu trước khi xóa: 2026-11-12_/);
    assert.match(await page.textContent('.modal'), /Xem xét lãnh đạo[^\d]*1/);
    await modalPrimary(page);
    // Về màn đăng nhập; đăng nhập lại → danh mục còn, xem xét lãnh đạo trống
    await login(page, OWNER_CODE, OWNER_PIN);
    assert.equal(rows(env, 'Items').length, nItems);
    assert.equal(rows(env, 'MgmtReviews').length, 0);
    assert.equal(rows(env, 'Capas').length, 0);
    await go(page, '#/mreview');
    await bodyHas(page, /Chưa có cuộc xem xét lãnh đạo nào/);
    await go(page, '#/catalog');
    await page.waitForSelector('.cat-row');
    await go(page, '#/admin/status');
    await bodyHas(page, /Lần gần nhất 12\/11\/2026 \d\d:\d\d · giữ danh mục · sao lưu trước khi xóa 2026-11-12_/);
  } finally {
    await app.close();
  }
});

test('app 4c với máy chủ 4b (chưa dán Code.gs 4c): không có ô / menu Xem xét lãnh đạo, màn báo cần cập nhật máy chủ; không có Xóa sạch', async () => {
  const env = realLike();
  for (const k of ['mreview.save', 'mreview.hold', 'mreview.cancel', 'mreview.decision', 'mreview.stats', 'system.reset.info', 'system.reset']) delete env.g.HANDLERS_[k];
  const app = await openApp({ env, ...IPHONE, now: NOW });
  try {
    const { page } = app;
    await login(page, 'TK', TK_PIN);
    assert.equal(await page.locator('.grid9 .tile[href="#/mreview"]').count(), 0);
    await go(page, '#/mreview');
    await bodyHas(page, /Máy chủ chưa cập nhật bản có Xem xét lãnh đạo/);
    await go(page, '#/account');
    await page.waitForSelector('#ac-logout');
    assert.equal(await page.locator('a[href="#/admin/reset"]').count(), 0);
    assert.equal(await page.locator('.acc-links a[href="#/mreview"]').count(), 0);
  } finally {
    await app.close();
  }
});
