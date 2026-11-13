// Sản phẩm không phù hợp trên giao diện (Đợt 3, phiên 3c — giữ phạm vi Cơ điện; trưởng bộ phận + cấp 4 quyết định, nhân nhượng / hủy bỏ chỉ cấp 4).
// Test 1 (iPhone, dữ liệu như thật: phạm vi CĐ, danh mục ○ ◐, Thư ký ISO cấp 4 — như app thật chỉ có owner + Thư ký ISO): Trang chủ → ô SP không
// phù hợp → Lập phiếu → NC-2611-001 Chờ quyết định → Chờ bạn xử lý ở trang chủ → ảnh hàng lỗi → Quyết định xử lý (làm lại 300 tờ + hủy 200 tờ,
// cần phiếu khắc phục) → PIN → Đang xử lý, nút đóng bị khóa khi chưa có phiếu khắc phục → Lập phiếu khắc phục (điền sẵn, nguồn Sản phẩm không
// phù hợp) → quay lại phiếu NC → Xong xử lý (kiểm tra lại Đạt bắt buộc) → PIN → Đã đóng → In phiếu BM-CL-04-01 (3 ô ký) → Biên bản xử lý
// BM-CL-04-04 → PDF → Sổ theo dõi → Trạng thái hệ thống.
// Test 2 (web): trưởng bộ phận CĐ (cấp 3) không chọn được nhân nhượng / hủy bỏ, quyết định trả nhà cung cấp; nhân viên CĐ lập phiếu không thấy nút
// quyết định; đóng với Không cần kiểm tra lại; Excel biên bản xử lý.
// Test 3: app 3c với máy chủ 3b (chưa dán Code.gs 3c): không có ô / menu Sản phẩm không phù hợp, màn báo cần cập nhật máy chủ.
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
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

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
  const raw = txt.match(/\b(?:ncr|capa|nav|tile|rpt|rp|home|mail|health)\.[a-z_]+[A-Za-z_0-9.]*\b/g);
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

test('iPhone: Lập phiếu → Quyết định xử lý (làm lại + hủy, PIN) → Lập phiếu khắc phục từ phiếu NC → Xong xử lý, đóng (PIN) → In phiếu BM-CL-04-01, biên bản BM-CL-04-04, sổ → Trạng thái hệ thống', async () => {
  const env = realLike();
  const app = await openApp({ env, ...IPHONE, now: NOW });
  try {
    const { page } = app;
    await login(page, 'TK', '583922');
    // 1. Trang chủ → ô Sản phẩm không phù hợp → Lập phiếu
    await page.click('.grid9 .tile[href="#/ncr"]');
    await page.waitForSelector('#ncr-new');
    assert.match(await page.textContent('#view'), /Chưa có phiếu nào/);
    await page.click('#ncr-new');
    await page.waitForSelector('form.ncr-form');
    assert.equal(await page.locator('[data-chips="stage"] [data-v="PROCESS"].on').count(), 1, 'mặc định Trong sản xuất');
    assert.equal(await page.inputValue('#f-dept_code'), 'CĐ');
    // Thiếu sản phẩm → báo ở ô
    await page.fill('#f-problem_vi', 'Lệch màu do trục mực máy in 2 bị mòn (phiếu thử)');
    await page.click('#ncr-save');
    await page.waitForSelector('[data-field="product_text"].bad');
    await page.fill('#f-product_text', 'Hộp giấy HG-120');
    await page.fill('#f-lot_text', 'LSX 2611-07');
    await page.fill('#f-qty_text', '500 tờ');
    await page.fill('#f-ref_text', 'Máy in số 2');
    await page.click('[data-chips="severity"] [data-v="MAJOR"]');
    await page.fill('#f-contain_vi', 'Treo thẻ đỏ, chuyển khu vực cách ly');
    await page.fill('#f-hold_place', 'Kho cách ly số 1');
    assert.ok(await noOverflow(page));
    await page.screenshot({ path: path.join(SHOTS, 'ncr-new-iphone.png'), fullPage: true });
    await page.click('#ncr-save');
    await page.waitForSelector('.item.ncr');
    assert.equal((await page.textContent('.item.ncr .code.big')).trim(), 'NC-2611-001');
    let head = await page.textContent('.item.ncr .item-head');
    assert.match(head, /Chờ quyết định/);
    assert.match(head, /Hàng đang cách ly, chờ quyết định xử lý — hạn 14\/11\/2026/);
    assert.match(head, /Trong sản xuất/);
    let n = rows(env, 'Ncrs')[0];
    assert.equal(n.decide_due, '2026-11-14');
    assert.equal(n.hold_place, 'Kho cách ly số 1');
    // 2. Trang chủ: Chờ bạn xử lý
    await go(page, '#/');
    await page.waitForSelector('.pend-card');
    assert.match(await page.textContent('.pend-card'), /1 phiếu sản phẩm không phù hợp chờ bạn quyết định xử lý/);
    await page.click('.pend-row[href^="#/ncr/"]');
    await page.waitForSelector('#ncr-decide');
    // 3. Ảnh hàng lỗi
    await page.setInputFiles('#ncr-file', { name: 'hang-loi.png', mimeType: 'image/png', buffer: PNG_1X1 });
    await page.waitForSelector('.ncr-files .doc-btn', { timeout: 20000 });
    assert.equal(rows(env, 'Ncrs')[0].files_json.length, 1);
    // 4. Quyết định xử lý: làm lại 300 + hủy 200, cần phiếu khắc phục → PIN
    await page.click('#ncr-decide');
    await page.waitForSelector('.modal .ncr-line');
    assert.equal(await page.inputValue('.ncr-line [data-k="qty"]'), '500 tờ', 'dòng đầu điền sẵn số lượng');
    await page.selectOption('.ncr-line[data-line="0"] [data-k="d"]', 'REWORK');
    await page.fill('.ncr-line[data-line="0"] [data-k="qty"]', '300 tờ');
    await page.click('#nd-add');
    await page.selectOption('.ncr-line[data-line="1"] [data-k="d"]', 'SCRAP');
    await page.fill('.ncr-line[data-line="1"] [data-k="qty"]', '200 tờ');
    await page.fill('.ncr-line[data-line="1"] [data-k="note"]', 'Hư nặng');
    assert.equal(await page.isHidden('#nd-conc'), true, 'không nhân nhượng: ẩn ô căn cứ');
    await page.click('[data-cap="YES"]');
    await page.fill('#nd-vi', 'In lại trên máy 1, hủy phần hư có biên bản');
    assert.ok(await noOverflow(page));
    await page.locator('.modal-card').evaluate((el) => { el.scrollTop = 0; });
    await page.screenshot({ path: path.join(SHOTS, 'ncr-decide-iphone.png') });
    await modalPrimary(page);
    await answerPin(page, '583922');
    await page.waitForSelector('.item.ncr .item-head:has-text("Đang xử lý")');
    n = rows(env, 'Ncrs')[0];
    assert.deepEqual(n.decision_json.map((l) => l.d + ' ' + l.qty), ['REWORK 300 tờ', 'SCRAP 200 tờ']);
    assert.equal(n.need_capa, 'YES');
    assert.equal(n.exec_due, '2026-11-19');
    const dec = await page.textContent('.ncr-decision');
    assert.match(dec, /Làm lại.*300 tờ/s);
    assert.match(dec, /Hủy bỏ.*200 tờ/s);
    assert.match(dec, /Cần phiếu khắc phục/);
    assert.match(await page.textContent('.item.ncr .item-head'), /Quyết định cần phiếu khắc phục mà chưa lập/);
    assert.equal(await page.locator('#ncr-close[disabled]').count(), 1, 'chưa có phiếu khắc phục: chưa đóng được');
    // 5. Lập phiếu khắc phục từ phiếu NC (điền sẵn)
    await page.click('#ncr-capa-new');
    await page.waitForSelector('form.capa-form');
    assert.match(await page.textContent('.capa-from-ncr'), /Sản phẩm không phù hợp.*NC-2611-001/s);
    assert.equal(await page.locator('[data-src]').count(), 0, 'không chọn nguồn tay');
    assert.match(await page.inputValue('#f-problem_vi'), /Hộp giấy HG-120 · LSX 2611-07 · 500 tờ\nLệch màu/);
    assert.equal(await page.inputValue('#f-correction_vi'), 'Treo thẻ đỏ, chuyển khu vực cách ly');
    assert.match(await page.inputValue('#f-ref_text'), /^NC-2611-001/);
    await page.click('#capa-save');
    await page.waitForSelector('.item.capa');
    assert.equal((await page.textContent('.item.capa .code.big')).trim(), 'KP-2611-001');
    assert.match(await page.textContent('.item.capa .item-head'), /Sản phẩm không phù hợp/);
    const capaRow = rows(env, 'Capas')[0];
    assert.equal(capaRow.source, 'NCR');
    assert.equal(capaRow.ncr_id, n.ncr_id);
    // 6. Quay lại phiếu NC qua link
    await page.click('#capa-ncr-link');
    await page.waitForSelector('#ncr-capa-link');
    assert.match(await page.textContent('#ncr-capa-link'), /KP-2611-001/);
    assert.equal(await page.locator('#ncr-capa-new').count(), 0);
    // 7. Xong xử lý, đóng phiếu: có làm lại → Không cần kiểm tra lại bị khóa; PIN
    await page.click('#ncr-close:not([disabled])');
    await page.waitForSelector('.modal #nc-date');
    assert.equal(await page.locator('[data-re="NA"][disabled]').count(), 1);
    assert.equal(await page.locator('[data-re="PASS"].on').count(), 1);
    await page.fill('#nc-vi', 'Đã in lại 300 tờ đạt màu, hủy 200 tờ có biên bản');
    await modalPrimary(page); // PIN vừa nhập lúc quyết định còn hiệu lực 5 phút: không hỏi lại
    await page.waitForSelector('.item.ncr .item-head:has-text("Đã đóng")');
    n = rows(env, 'Ncrs')[0];
    assert.equal(n.state, 'CLOSED');
    assert.equal(n.recheck, 'PASS');
    assert.match(await page.textContent('.ncr-result'), /Kiểm tra lại: Đạt/);
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'ncr-detail-iphone.png'), fullPage: true });
    // 8. In phiếu BM-CL-04-01 (3 ô ký) → PDF
    const prints = await page.locator('.ncr-prints .rp-link').allTextContents();
    assert.equal(prints.length, 2);
    assert.match(prints[0], /phiếu sản phẩm không phù hợp.*BM-CL-04-01/);
    assert.match(prints[1], /biên bản xử lý.*BM-CL-04-04/);
    await page.click('.ncr-prints .rp-link[data-form="NCR"]');
    await page.waitForSelector('.rp-paper');
    let paper = await page.textContent('.rp-paper');
    assert.match(paper, /PHIẾU BÁO SẢN PHẨM KHÔNG PHÙ HỢP/);
    assert.match(paper, /BM-CL-04-01/);
    assert.match(paper, /Kho cách ly số 1/);
    assert.match(paper, /KP-2611-001/);
    assert.equal(await page.locator('.rp-paper .paper-sign.three > div').count(), 3);
    assert.match(await page.textContent('.paper-sign'), /Người lập phiếu.*Người quyết định xử lý.*Người xác nhận đóng/s);
    assert.ok(await noOverflow(page));
    await page.click('#rp-pdf');
    await page.waitForSelector('.modal:has-text("BC-2611-001")', { timeout: 20000 });
    await page.locator('.modal .modal-actions .btn').click();
    await waitGone(page);
    // 9. Biên bản xử lý
    await page.selectOption('#rf-nform', 'DECISION');
    await page.click('#rp-run');
    await page.waitForFunction(() => /BIÊN BẢN XỬ LÝ SẢN PHẨM KHÔNG PHÙ HỢP/.test(document.querySelector('.rp-paper') && document.querySelector('.rp-paper').textContent));
    paper = await page.textContent('.rp-paper');
    assert.match(paper, /BM-CL-04-04/);
    assert.match(paper, /Người thực hiện/);
    // 10. Sổ theo dõi
    await page.selectOption('#rf-ncr', '');
    await page.click('#rp-run');
    await page.waitForFunction(() => /SỔ THEO DÕI SẢN PHẨM KHÔNG PHÙ HỢP/.test(document.querySelector('.rp-paper') && document.querySelector('.rp-paper').textContent));
    assert.match(await page.textContent('.rp-paper'), /BM-CL-04-02/);
    assert.deepEqual(await noRawKeys(page), []);
    // 11. Trạng thái hệ thống
    await go(page, '#/admin/status');
    await page.waitForFunction(() => /Sản phẩm không phù hợp/.test(document.body.textContent) && /Chờ quyết định 0 · đang xử lý 0 · đã đóng 1/.test(document.body.textContent), null, { timeout: 20000 });
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('web: nhân viên CĐ lập phiếu (không có nút quyết định) → trưởng BP CĐ: nhân nhượng / hủy bỏ bị khóa, quyết định trả nhà cung cấp (PIN) → đóng Không cần kiểm tra lại → Excel biên bản xử lý', async () => {
  const env = realLike();
  addUser(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  addUser(env, 'CD3', 3, '583923', { depts: 'CĐ' });
  const app = await openApp({ env, ...WEB, now: NOW });
  try {
    const { page } = app;
    await login(page, 'CD2', '583920');
    await page.click('.side-item[data-nav="ncr"]');
    await page.waitForSelector('#ncr-new');
    await page.click('#ncr-new');
    await page.waitForSelector('form.ncr-form');
    await page.click('[data-chips="stage"] [data-v="INCOMING"]');
    await page.fill('#f-product_text', 'Vòng bi 6205-2RS');
    await page.fill('#f-qty_text', '20 cái');
    await page.fill('#f-party_name', 'Công ty Vòng bi XYZ');
    await page.fill('#f-problem_vi', 'Vòng bi kêu, rơ ngay khi lắp');
    await page.click('#ncr-save');
    await page.waitForSelector('.item.ncr');
    assert.equal(await page.locator('#ncr-decide').count(), 0, 'người lập cấp 2 không quyết định');
    assert.match(await page.textContent('.item.ncr'), /Chờ trưởng bộ phận \/ Quản trị quyết định xử lý/);
    const id = rows(env, 'Ncrs')[0].ncr_id;
    await app.close();
    // Trưởng bộ phận
    const app2 = await openApp({ env, ...WEB, now: NOW, hash: '' });
    try {
      const p2 = app2.page;
      await login(p2, 'CD3', '583923');
      assert.match(await p2.textContent('.pend-card'), /chờ bạn quyết định xử lý/);
      await go(p2, '#/ncr/' + id);
      await p2.waitForSelector('#ncr-decide');
      await p2.click('#ncr-decide');
      await p2.waitForSelector('.modal .ncr-line');
      assert.equal(await p2.locator('.ncr-line [data-k="d"] option[value="SCRAP"][disabled]').count(), 1);
      assert.equal(await p2.locator('.ncr-line [data-k="d"] option[value="CONCESSION"][disabled]').count(), 1);
      assert.match(await p2.textContent('.modal'), /chỉ Quản trị/);
      await p2.selectOption('.ncr-line [data-k="d"]', 'RETURN');
      await p2.click('[data-cap="NO"]');
      await modalPrimary(p2);
      await answerPin(p2, '583923');
      await p2.waitForSelector('.item.ncr .item-head:has-text("Đang xử lý")');
      await p2.click('#ncr-close');
      await p2.waitForSelector('.modal #nc-date');
      await p2.click('[data-re="NA"]');
      await p2.fill('#nc-vi', 'Đã trả 20 cái, nhà cung cấp đổi hàng');
      await modalPrimary(p2); // PIN còn hiệu lực 5 phút
      await p2.waitForSelector('.item.ncr .item-head:has-text("Đã đóng")');
      assert.equal(rows(env, 'Ncrs')[0].recheck, 'NA');
      await p2.click('.ncr-prints .rp-link[data-form="DECISION"]');
      await p2.waitForSelector('.rp-paper');
      assert.match(await p2.textContent('.rp-paper'), /Trả nhà cung cấp/);
      await p2.screenshot({ path: path.join(SHOTS, 'ncr-decision-web.png'), fullPage: true });
      await p2.click('#rp-xlsx');
      const xl = await grabFile(p2);
      assert.equal(xl.name, 'BC-2611-001_bien-ban-xu-ly_NC-2611-001.xlsx');
      const X = xlsx();
      const wb = X.read(xl.buf, { type: 'buffer' });
      const csv = X.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
      for (const t of ['Người quyết định xử lý', 'Người thực hiện', 'Người xác nhận đóng', 'Vòng bi 6205-2RS', 'Trả nhà cung cấp']) assert.ok(csv.includes(t), t);
      assert.deepEqual(await noRawKeys(p2), []);
      assert.deepEqual(app2.consoleErrors, []);
    } finally { await app2.close(); }
  } finally { await app.close().catch(() => {}); }
});

test('app 3c với máy chủ 3b (chưa dán Code.gs 3c): không có ô / menu Sản phẩm không phù hợp; vào thẳng màn báo cần cập nhật máy chủ', async () => {
  const env = realLike();
  ['ncr.save', 'ncr.decide', 'ncr.close', 'ncr.cancel'].forEach((k) => { delete env.g.HANDLERS_[k]; });
  const app = await openApp({ env, ...IPHONE, now: NOW });
  try {
    const { page } = app;
    await login(page, 'TK', '583922');
    assert.equal(await page.locator('.grid9 .tile[href="#/ncr"]').count(), 0);
    await go(page, '#/ncr');
    await page.waitForFunction(() => /Máy chủ chưa lên bản 3c/.test(document.body.textContent));
    await go(page, '#/reports');
    await page.waitForSelector('.rp-list');
    assert.equal(await page.locator('.rp-item[data-kind="NCR"]').count(), 0);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});
