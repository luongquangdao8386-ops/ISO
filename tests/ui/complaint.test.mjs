// Khiếu nại khách hàng (8D) và SCAR nhà cung cấp trên giao diện (Đợt 3, phiên 3b — giữ phạm vi Cơ điện).
// Test 1 (iPhone, dữ liệu như thật: phạm vi CĐ, danh mục ○ ◐, Thư ký ISO cấp 4): Khắc phục → Tiếp nhận khiếu nại → điền khách hàng, sản phẩm,
// lô, số lượng, mức độ, nhóm 8D, D2, D3 → KP-2611-001 → nguyên nhân + nguyên nhân lọt (D4) → hành động khắc phục + phòng ngừa (D5–D7) → báo
// xong → Gửi kiểm tra hiệu lực → Có hiệu lực bị chặn khi chưa phản hồi (không hỏi PIN) → Ghi phản hồi khách hàng → Có hiệu lực (PIN) → Đã
// đóng → In báo cáo 8D (PDF BC-2611-001) → Phiếu tiếp nhận → Sổ theo dõi khiếu nại → lọc Khiếu nại ở sổ khắc phục → Trạng thái hệ thống.
// Test 2 (web): Nhân viên CĐ lập phiếu nội bộ rồi đổi sang SCAR (giữ chữ đã gõ) → ngày gửi → ghi trả lời nhà cung cấp → nguyên nhân →
// hành động giao nhà cung cấp → báo xong → gửi kiểm tra → trưởng BP CĐ có hiệu lực (PIN) → In SCAR (3 ô ký) → Excel có 3 ô ký.
// Test 3: app 3b với máy chủ 3a (chưa có capa.reply): phiếu nội bộ chạy như cũ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser } from '../helpers.mjs';
import { xlsx } from '../xlsx-node.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const IPHONE = { viewport: { width: 390, height: 844 }, mobile: true };
const WEB = { viewport: { width: 1440, height: 900 }, mobile: false };

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
const modalPrimary = (page) => page.locator('.modal').last().locator('.modal-actions .btn.primary').click();
const waitGone = (page) => page.waitForSelector('.modal', { state: 'detached' });
async function grabFile(page) {
  await page.waitForSelector('.modal #of-open', { timeout: 30000 });
  const title = await page.textContent('.modal h2');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.modal #of-open')]);
  const buf = fs.readFileSync(await dl.path());
  await page.locator('.modal .modal-actions .btn').click();
  return { title, name: dl.suggestedFilename(), buf };
}

test('iPhone: Tiếp nhận khiếu nại → 8D (D1–D7) → đóng bị chặn khi chưa phản hồi → Ghi phản hồi khách hàng → Có hiệu lực (PIN) → In 8D, phiếu tiếp nhận, sổ khiếu nại → Trạng thái hệ thống', async () => {
  const env = realLike();
  const app = await openApp({ env, ...IPHONE, now: NOW });
  try {
    const { page } = app;
    await login(page, 'TK', '583922');
    // 1. Khắc phục → Tiếp nhận khiếu nại
    await page.click('.grid9 .tile[href="#/capa"]');
    await page.waitForSelector('#capa-new-complaint');
    assert.ok(await noOverflow(page), 'hàng nút Lập phiếu / Tiếp nhận khiếu nại / Lập SCAR không tràn ngang');
    await page.click('#capa-new-complaint');
    await page.waitForSelector('form.capa-form fieldset.capa-party');
    assert.equal(await page.locator('[data-chips="kind"] [data-v="COMPLAINT"].on').count(), 1);
    assert.equal(await page.locator('[data-src]').count(), 0, 'khiếu nại: không có chip nguồn nội bộ');
    assert.match(await page.textContent('.capa-form'), /Ngày tiếp nhận/);
    assert.equal(await page.inputValue('#f-dept_code'), 'CĐ');
    assert.equal(await page.inputValue('#f-reply_due'), '2026-11-19', 'hạn phản hồi mặc định +7 ngày');
    // 2. Thiếu tên khách hàng → báo lỗi ở ô
    await page.fill('#f-problem_vi', 'Hộp in lệch màu, khách trả lại 2.000 hộp (phiếu thử)');
    await page.click('#capa-save');
    await page.waitForSelector('[data-field="party_name"].bad');
    await page.fill('#f-party_name', 'Công ty Bao bì ABC');
    await page.fill('#f-party_contact', 'Chị Lan 0901 234 567');
    await page.fill('#f-product_text', 'Hộp giấy HG-120');
    await page.fill('#f-lot_text', 'LOT 2611-07');
    await page.fill('#f-qty_text', '2.000 hộp');
    await page.click('[data-chips="severity"] [data-v="MAJOR"]');
    await page.click('[data-chips="complaint_valid"] [data-v="YES"]');
    await page.fill('#f-team_text', 'QA Hùng, SX Minh, CĐ Tuấn');
    await page.fill('#f-correction_vi', 'Cách ly lô hàng, kiểm 100% hàng tồn');
    assert.ok(await noOverflow(page));
    await page.screenshot({ path: path.join(SHOTS, 'complaint-new-iphone.png'), fullPage: true });
    await page.click('#capa-save');
    await page.waitForSelector('.item.capa');
    assert.equal((await page.textContent('.item.capa .code.big')).trim(), 'KP-2611-001');
    const head = await page.textContent('.item.capa .item-head');
    assert.match(head, /Khiếu nại khách hàng \(8D\)/);
    assert.match(head, /Nặng/);
    assert.match(head, /Có cơ sở/);
    assert.match(head, /Công ty Bao bì ABC/);
    assert.match(await page.textContent('.capa-party-card'), /Chưa phản hồi khách hàng — hạn 19\/11\/2026/);
    let c = rows(env, 'Capas')[0];
    assert.equal(c.source, 'COMPLAINT');
    assert.equal(c.severity, 'MAJOR');
    assert.equal(c.team_text, 'QA Hùng, SX Minh, CĐ Tuấn');
    // 3. D4: nguyên nhân gốc + nguyên nhân lọt
    await page.click('#capa-cause-btn');
    await page.fill('#cc-vi', 'Bộ cấp mực máy in 2 mòn');
    await page.fill('#ce-vi', 'Chỉ kiểm màu mẫu đầu ca');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('.capa-cause .kv-block');
    assert.match(await page.textContent('.capa-cause'), /Chỉ kiểm màu mẫu đầu ca/);
    // 4. D5–D7: hành động khắc phục + phòng ngừa, báo xong
    assert.match(await page.textContent('.capa-acts h3'), /D5–D7/);
    await page.click('#capa-act-add');
    await page.fill('#ca-vi', 'Thay bộ cấp mực máy in 2');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('.capa-act-list .capa-act');
    await page.click('#capa-act-add');
    await page.selectOption('#ca-type', 'PREVENTIVE');
    await page.fill('#ca-vi', 'Đo màu bằng máy mỗi 500 tờ');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForFunction(() => document.querySelectorAll('.capa-act-list .capa-act').length === 2);
    for (const txt of ['Đã thay', 'Đã thêm bước đo màu']) {
      await page.locator('[data-adone]').first().click();
      await page.fill('#cd-vi', txt);
      await modalPrimary(page);
      await waitGone(page);
      await page.waitForSelector(`.capa-act-done:has-text("${txt}")`);
    }
    // 5. Gửi kiểm tra hiệu lực
    await page.click('#capa-complete:not([disabled])');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('.item.capa .item-head:has-text("Chờ kiểm tra hiệu lực")');
    // 6. Có hiệu lực khi chưa phản hồi khách hàng → báo, không hỏi PIN
    await page.click('#capa-verify');
    assert.match(await page.textContent('.modal'), /Chưa ghi phản hồi khách hàng/);
    await page.click('[data-res="EFFECTIVE"]');
    await page.fill('#cv-vi', 'Hai lô sau không lệch màu');
    await modalPrimary(page);
    await page.waitForFunction(() => /Chưa ghi phản hồi khách hàng/.test(document.querySelector('#toast').textContent));
    await page.waitForSelector('.modal #cv-vi'); // hộp thoại mở lại, giữ chữ đã gõ
    assert.equal(await page.inputValue('#cv-vi'), 'Hai lô sau không lệch màu');
    assert.equal(await page.locator('.modal .pin-input').count(), 0, 'chưa hỏi PIN');
    await page.locator('.modal').last().locator('.modal-actions .btn:not(.primary)').click();
    await waitGone(page);
    // 7. Ghi phản hồi khách hàng
    await page.click('#capa-reply');
    assert.equal(await page.inputValue('#cr-date'), '2026-11-12');
    await page.fill('#cr-vi', 'Đã gửi báo cáo 8D, đổi 2.000 hộp');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('.capa-reply.done');
    assert.match(await page.textContent('.capa-party-card'), /Đã phản hồi/);
    c = rows(env, 'Capas')[0];
    assert.equal(c.reply_date, '2026-11-12');
    // 8. Có hiệu lực (PIN) → Đã đóng
    await page.click('#capa-verify');
    await page.click('[data-res="EFFECTIVE"]');
    await page.fill('#cv-vi', 'Hai lô sau không lệch màu, khách xác nhận');
    await modalPrimary(page);
    await answerPin(page, '583922');
    await page.waitForSelector('.item.capa .item-head:has-text("Đã đóng")');
    assert.equal(rows(env, 'Capas')[0].state, 'CLOSED');
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'complaint-detail-iphone.png'), fullPage: true });
    // 9. In: 3 mẫu (tiếp nhận, 8D, phiếu khắc phục) có mã biểu
    const prints = await page.locator('.capa-prints .rp-link').allTextContents();
    assert.equal(prints.length, 3);
    assert.match(prints[0], /phiếu tiếp nhận khiếu nại.*BM-KD-02-01/);
    assert.match(prints[1], /báo cáo 8D.*BM-KD-02-02/);
    assert.match(prints[2], /BM-CĐ-14-02/);
    await page.click('.capa-prints .rp-link[data-form="D8"]');
    await page.waitForSelector('.rp-paper');
    let paper = await page.textContent('.rp-paper');
    assert.match(paper, /BÁO CÁO 8D XỬ LÝ KHIẾU NẠI KHÁCH HÀNG/);
    assert.match(paper, /BM-KD-02-02/);
    assert.match(paper, /D4\. Nguyên nhân gốc/);
    assert.match(paper, /Chỉ kiểm màu mẫu đầu ca/);
    assert.match(paper, /Đã gửi báo cáo 8D/);
    assert.match(paper, /Trưởng nhóm 8D/);
    assert.ok(await noOverflow(page));
    await page.click('#rp-pdf');
    await page.waitForSelector('.modal:has-text("BC-2611-001")', { timeout: 20000 });
    await page.locator('.modal .modal-actions .btn').click();
    await waitGone(page);
    assert.equal(rows(env, 'ReportRuns')[0].code, 'BC-2611-001');
    // 10. Đổi mẫu in → Phiếu tiếp nhận
    await page.selectOption('#rf-cform', 'RECEIPT');
    await page.click('#rp-run');
    await page.waitForSelector('.rp-paper:has-text("PHIẾU TIẾP NHẬN KHIẾU NẠI KHÁCH HÀNG")');
    assert.match(await page.textContent('.rp-paper'), /BM-KD-02-01/);
    // 11. Sổ theo dõi khiếu nại
    await page.selectOption('#rf-capa', '');
    await page.selectOption('#rf-csource', 'COMPLAINT');
    await page.click('#rp-run');
    await page.waitForSelector('.rp-paper:has-text("SỔ THEO DÕI KHIẾU NẠI KHÁCH HÀNG")');
    paper = await page.textContent('.rp-paper');
    assert.match(paper, /KP-2611-001/);
    assert.match(paper, /Công ty Bao bì ABC/);
    // 12. Sổ khắc phục: lọc Khiếu nại
    await go(page, '#/capa');
    await page.waitForSelector('.capa-kinds');
    await page.click('.capa-kinds [data-kind="COMPLAINT"]');
    await page.waitForSelector('.capa-kinds [data-kind="COMPLAINT"].on');
    await page.click('.chips.tabs [data-tab="all"]');
    await page.waitForSelector('.capa-row');
    assert.match(await page.textContent('.capa-row'), /Khiếu nại · 投诉: Công ty Bao bì ABC/);
    await page.click('.capa-kinds [data-kind="SUPPLIER"]');
    await page.waitForSelector('.empty-state:has-text("Chưa có SCAR nào")');
    // 13. Trạng thái hệ thống
    await go(page, '#/admin/status');
    await page.waitForFunction(() => /quá hạn phản hồi/.test(document.body.textContent));
    const st = await page.textContent('.view');
    assert.match(st, /khiếu nại đang mở 0 · SCAR đang mở 0 · quá hạn phản hồi 0/);
    assert.match(st, /1\.0\.11/);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('web: nhân viên CĐ đổi phiếu sang SCAR (giữ chữ đã gõ) → ngày gửi → trả lời nhà cung cấp → hành động giao nhà cung cấp → trưởng BP có hiệu lực (PIN) → In SCAR 3 ô ký (xem trước + Excel)', async () => {
  const env = freshServer({ now: NOW, scope: 'CĐ' });
  ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  addUser(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  addUser(env, 'CD3', 3, '583923', { depts: 'CĐ' });
  env.g.dbReset_();
  let app = await openApp({ env, ...WEB, now: NOW });
  try {
    const { page } = app;
    await login(page, 'CD2', '583920');
    await go(page, '#/capa/new');
    await page.waitForSelector('form.capa-form');
    await page.fill('#f-problem_vi', 'Vòng bi kêu, rơ ngay khi lắp');
    await page.fill('#f-title_vi', 'Vòng bi lỗi lô PO-033');
    // Đổi sang SCAR: chữ đã gõ còn nguyên, hiện ô nhà cung cấp
    await page.click('[data-chips="kind"] [data-v="SUPPLIER"]');
    await page.waitForSelector('fieldset.capa-party');
    assert.equal(await page.inputValue('#f-problem_vi'), 'Vòng bi kêu, rơ ngay khi lắp');
    assert.equal(await page.inputValue('#f-title_vi'), 'Vòng bi lỗi lô PO-033');
    assert.match(await page.textContent('.capa-form'), /Tên nhà cung cấp \/ nhà thầu/);
    assert.match(await page.textContent('.capa-form'), /Ngày gửi SCAR/);
    await page.fill('#f-party_name', 'Công ty Vòng bi XYZ');
    await page.fill('#f-party_contact', 'Anh Phong');
    await page.fill('#f-product_text', 'Vòng bi 6205-2RS');
    await page.fill('#f-lot_text', 'PO-2611-033');
    await page.fill('#f-sent_date', '12/11/2026');
    await page.click('#capa-save');
    await page.waitForSelector('.item.capa');
    let c = rows(env, 'Capas')[0];
    assert.equal(c.source, 'SUPPLIER');
    assert.equal(c.sent_date, '2026-11-12');
    assert.equal(c.reply_due, '2026-11-19');
    assert.match(await page.textContent('.capa-party-card'), /Chờ nhà cung cấp trả lời — hạn 19\/11\/2026/);
    // Trả lời của nhà cung cấp
    await page.click('#capa-reply');
    await page.fill('#cr-vi', 'NCC: lỗi phớt chặn bụi, đổi lô và kiểm 100%');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('.capa-reply.done');
    // Nguyên nhân theo trả lời; hành động giao nhà cung cấp (người ngoài app)
    await page.click('#capa-cause-btn');
    await page.fill('#cc-vi', 'Lô vòng bi lỗi phớt chặn bụi');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('.capa-cause p:not(.muted)');
    await page.click('#capa-act-add');
    await page.fill('#ca-vi', 'Đổi lô, kiểm 100% trước khi giao');
    await page.selectOption('#ca-owner', '');
    await page.fill('#ca-assignee', 'Công ty Vòng bi XYZ');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('[data-adone]');
    await page.click('[data-adone]');
    await page.fill('#cd-vi', 'Đã nhận lô đổi, kiểm đạt');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('.capa-act-done');
    await page.click('#capa-complete:not([disabled])');
    await modalPrimary(page);
    await waitGone(page);
    await page.waitForSelector('.item.capa .item-head:has-text("Chờ kiểm tra hiệu lực")');
    assert.equal(await page.locator('#capa-verify').count(), 0, 'người phụ trách không tự kiểm tra hiệu lực');
    await app.close();
    // Trưởng bộ phận CĐ kiểm tra hiệu lực, in SCAR
    app = await openApp({ env, ...WEB, now: NOW });
    const p2 = app.page;
    await login(p2, 'CD3', '583923');
    await go(p2, '#/capa/' + c.capa_id);
    await p2.waitForSelector('#capa-verify');
    await p2.click('#capa-verify');
    await p2.click('[data-res="EFFECTIVE"]');
    await p2.fill('#cv-vi', '3 lô giao sau đạt');
    await modalPrimary(p2);
    await answerPin(p2, '583923');
    await p2.waitForSelector('.item.capa .item-head:has-text("Đã đóng")');
    assert.equal(await p2.locator('.capa-prints .rp-link').count(), 2);
    await p2.click('.capa-prints .rp-link[data-form="SCAR"]');
    await p2.waitForSelector('.rp-paper');
    const paper = await p2.textContent('.rp-paper');
    assert.match(paper, /PHIẾU YÊU CẦU KHẮC PHỤC NHÀ CUNG CẤP \(SCAR\)/);
    assert.match(paper, /BM-MH-01-06/);
    assert.match(paper, /NCC: lỗi phớt chặn bụi/);
    assert.equal(await p2.locator('.rp-paper .paper-sign.three > div').count(), 3);
    assert.match(await p2.textContent('.paper-sign'), /Người lập SCAR.*Đại diện nhà cung cấp.*Anh Phong.*Người kiểm tra hiệu lực/s);
    await p2.screenshot({ path: path.join(SHOTS, 'scar-paper-web.png'), fullPage: true });
    await p2.click('#rp-xlsx');
    const xl = await grabFile(p2);
    assert.equal(xl.name, 'BC-2611-001_scar_KP-2611-001.xlsx');
    const X = xlsx();
    const wb = X.read(xl.buf, { type: 'buffer' });
    const csv = X.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
    for (const t of ['Người lập SCAR', 'Đại diện nhà cung cấp', 'Người kiểm tra hiệu lực', 'Anh Phong', 'CD3']) assert.ok(csv.includes(t), t);
    assert.deepEqual(await noRawKeys(p2), []);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('app 3b với máy chủ 3a (chưa dán Code.gs 3b): không có nút Tiếp nhận khiếu nại / Lập SCAR, không có chọn loại phiếu; phiếu nội bộ vẫn lập được', async () => {
  const env = realLike();
  // Máy chủ 3a: chưa có action capa.reply
  delete env.g.HANDLERS_['capa.reply'];
  const app = await openApp({ env, ...IPHONE, now: NOW });
  try {
    const { page } = app;
    await login(page, 'TK', '583922');
    await go(page, '#/capa');
    await page.waitForSelector('#capa-new');
    assert.equal(await page.locator('#capa-new-complaint').count(), 0);
    assert.equal(await page.locator('#capa-new-scar').count(), 0);
    assert.equal(await page.locator('.capa-kinds').count(), 0);
    await go(page, '#/capa/new?source=COMPLAINT');
    await page.waitForSelector('form.capa-form');
    assert.equal(await page.locator('[data-chips="kind"]').count(), 0);
    assert.equal(await page.locator('fieldset.capa-party').count(), 0, 'máy chủ cũ: về phiếu nội bộ');
    await page.fill('#f-problem_vi', 'Rò khí nén xưởng 3');
    await page.click('#capa-save');
    await page.waitForSelector('.item.capa');
    assert.equal(rows(env, 'Capas')[0].source, 'EQUIPMENT');
    assert.equal(await page.locator('.capa-party-card').count(), 0);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});
