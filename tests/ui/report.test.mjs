// Báo cáo trên giao diện (Đợt 2, phiên 2c) — đúng các bước gửi người dùng: Trang chủ → ô Báo cáo (hết "Sắp có") → chọn báo cáo →
// bộ lọc (ô chọn, không ô gõ) → Xem báo cáo → Tải PDF (số BC-2611-001) → Tải Excel (cùng số) → Báo cáo đã lưu; Tình trạng hồ sơ
// theo quý; web: logo công ty trên bản xem trước + trong Excel, mở từ chi tiết biểu (Lịch sử phiên bản), Tải PDF mở tab mới;
// Trạng thái hệ thống dòng "Báo cáo đã lưu"; cấp 1 chỉ thấy 2 báo cáo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser, OWNER_CODE, OWNER_PIN, fakePngB64 } from '../helpers.mjs';
import { xlsx } from '../xlsx-node.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const IPHONE = { viewport: { width: 390, height: 844 }, mobile: true };
const WEB = { viewport: { width: 1440, height: 900 }, mobile: false };

function seeded() {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  addUser(env, 'TK', 4, '583922', { secretary: true });
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
  const raw = txt.match(/\b(?:rp|rpt|nav|btn|cat|status|kind|vstate|period|cov|health)\.[a-z_]+[A-Z_0-9.]*\b/g);
  return raw ? [...new Set(raw)] : [];
}
/** Tệp tải về từ hộp thoại "Đã có …" → nút Mở / lưu tệp */
async function grabFile(page) {
  await page.waitForSelector('.modal #of-open', { timeout: 30000 });
  const title = await page.textContent('.modal h2');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.modal #of-open')]);
  const buf = fs.readFileSync(await dl.path());
  await page.locator('.modal .modal-actions .btn').click();
  return { title, name: dl.suggestedFilename(), buf };
}
const sheetText = (buf) => {
  const X = xlsx();
  const wb = X.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return { wb, ws, text: X.utils.sheet_to_csv(ws), X };
};

test('iPhone: Trang chủ → Báo cáo → Danh mục tài liệu → Xem → Tải PDF (BC-2611-001) → Tải Excel cùng số → Báo cáo đã lưu; Tình trạng hồ sơ theo quý', async () => {
  const { env } = seeded();
  const app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page);
    assert.equal(await page.locator('.grid9 .tile[href="#/reports"].soon').count(), 0, 'ô Báo cáo hết "Sắp có"');
    await page.click('.grid9 .tile[href="#/reports"]');
    await page.waitForSelector('.rp-item[data-kind="CATALOG"].on');
    assert.equal(await page.locator('.rp-item').count(), 4);
    assert.equal(await page.locator('#rp-saved .muted').count(), 1); // chưa có báo cáo nào
    // Bộ lọc chỉ có ô chọn: không có ô gõ (iPhone không bật bàn phím)
    assert.equal(await page.locator('.rp-filter-card input[type="text"], .rp-filter-card input:not([type]), .rp-filter-card textarea').count(), 0);
    await page.selectOption('#rf-scope', 'ALL');
    await page.click('#rp-run');
    await page.waitForSelector('#rp-prev .paper');
    const prev = await page.textContent('#rp-prev .paper');
    for (const s of ['DANH MỤC TÀI LIỆU HIỆN HÀNH', '现行文件清单', 'Tất cả tình trạng', 'BM-ISO-02-01', 'Người lập', 'Người duyệt', 'Cấp khi tải PDF / Excel']) assert.ok(prev.includes(s), s);
    assert.ok(await noOverflow(page), 'không tràn ngang trên iPhone');
    await page.screenshot({ path: path.join(SHOTS, 'report-iphone-preview.png'), fullPage: true });
    // Tải PDF: lưu báo cáo, cấp số
    await page.click('#rp-pdf');
    const pdf = await grabFile(page);
    assert.match(pdf.title, /Đã có PDF BC-2611-001/);
    assert.equal(pdf.name, 'BC-2611-001_danh-muc-tai-lieu.pdf');
    assert.ok(pdf.buf.toString('utf8').startsWith('%PDF'));
    // Bản xem trước nhận số báo cáo
    assert.ok((await page.textContent('#rp-prev .paper')).includes('BC-2611-001'));
    // Tải Excel cùng bộ lọc: cùng số
    await page.click('#rp-xlsx');
    const xl = await grabFile(page);
    assert.match(xl.title, /Đã có Excel BC-2611-001/);
    assert.equal(xl.name, 'BC-2611-001_danh-muc-tai-lieu.xlsx');
    const { text } = sheetText(xl.buf);
    for (const s of ['DANH MỤC TÀI LIỆU HIỆN HÀNH', 'BC-2611-001', 'BM-ISO-02-01', 'Người lập · 编制人', 'Chủ hệ thống']) assert.ok(text.includes(s), s);
    assert.equal(env.rows('ReportRuns').length, 1);
    // Báo cáo đã lưu
    await page.waitForSelector('#rp-saved .rp-run');
    assert.ok((await page.textContent('#rp-saved')).includes('BC-2611-001'));
    // Tình trạng hồ sơ theo quý
    await page.click('.rp-item[data-kind="RECORDS"]');
    await page.selectOption('#rf-grain', 'QUARTER');
    assert.equal(await page.inputValue('#rf-end'), '2026-Q4');
    await page.click('#rp-run');
    await page.waitForSelector('#rp-prev .rp-tbl');
    const t2 = await page.textContent('#rp-prev .paper');
    for (const s of ['TÌNH TRẠNG HỒ SƠ THEO BỘ PHẬN VÀ KỲ', 'Q1/2026', 'Q4/2026', 'Tổng hợp theo bộ phận']) assert.ok(t2.includes(s), s);
    assert.ok(await noOverflow(page), 'bảng rộng cuộn trong khung, trang không tràn');
    await page.screenshot({ path: path.join(SHOTS, 'report-iphone-records.png'), fullPage: true });
    // Báo cáo đã lưu: tải lại PDF của BC-2611-001 (không cấp số mới)
    await page.click('#rp-saved [data-rpdf]');
    const again = await grabFile(page);
    assert.match(again.title, /BC-2611-001/);
    assert.equal(env.rows('ReportRuns').length, 1);
    assert.deepEqual(await noRawKeys(page), []);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('web: logo công ty trên bản xem trước và trong Excel; mở Lịch sử phiên bản từ chi tiết biểu; Tải PDF mở tab mới; Trạng thái hệ thống; cấp 1 chỉ 2 báo cáo', async () => {
  const { env, owner } = seeded();
  owner.pin(OWNER_PIN);
  assert.equal(owner.write('report.logo.set', { mime_type: 'image/png', content_b64: fakePngB64() }).ok, true);
  addUser(env, 'KD1', 1, '583924', { depts: 'KD' });
  const app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page);
    assert.equal(await page.locator('.side .side-item[data-nav="reports"].soon').count(), 0);
    // Chi tiết biểu → Báo cáo lịch sử phiên bản: mở màn Báo cáo, xem luôn
    const it = env.rows('Items').find((x) => x.code === 'QT-ISO-01');
    await go(page, '#/item/' + it.item_id);
    await page.waitForSelector('.rp-link');
    await page.click('.rp-link');
    await page.waitForSelector('#rp-prev .paper');
    assert.equal(await page.locator('.rp-item[data-kind="VERSIONS"].on').count(), 1);
    assert.equal(await page.inputValue('#rf-item'), it.item_id);
    const prev = await page.textContent('#rp-prev .paper');
    for (const s of ['LỊCH SỬ PHIÊN BẢN TÀI LIỆU', 'QT-ISO-01', 'Nhập từ danh mục Excel', 'Thông tin tài liệu']) assert.ok(prev.includes(s), s);
    assert.equal(await page.locator('#rp-prev img.paper-logo').count(), 1, 'logo công ty trên bản xem trước');
    await page.screenshot({ path: path.join(SHOTS, 'report-web-versions.png'), fullPage: true });
    // Excel có logo (ảnh trong gói xlsx) và số báo cáo
    await page.click('#rp-xlsx');
    const xl = await grabFile(page);
    assert.equal(xl.name, 'BC-2611-001_lich-su-phien-ban_QT-ISO-01.xlsx');
    const { wb, text, X } = sheetText(xl.buf);
    assert.ok(text.includes('BC-2611-001') && text.includes('QT-ISO-01'), text.slice(0, 300));
    const zip = X.CFB.read(xl.buf, { type: 'buffer' });
    assert.ok(X.CFB.find(zip, '/xl/media/me_logo.png'), 'logo trong Excel');
    assert.ok(wb.SheetNames[0] === 'BC-2611-001');
    // Phủ điều khoản → Tải PDF: máy tính mở tab mới
    await page.click('.rp-item[data-kind="COVERAGE"]');
    await page.click('#rp-pdf');
    await page.waitForSelector('.modal #of-open', { timeout: 30000 });
    assert.match(await page.textContent('.modal h2'), /Đã có PDF BC-2611-002/);
    const [popup] = await Promise.all([app.context.waitForEvent('page'), page.click('.modal #of-open')]);
    assert.ok(popup, 'mở tab PDF mới');
    await page.locator('.modal .modal-actions .btn').click();
    await page.waitForSelector('#rp-saved .rp-run');
    assert.equal(await page.locator('#rp-saved .rp-run').count(), 2);
    assert.deepEqual(await noRawKeys(page), []);
    // Trạng thái hệ thống: dòng Báo cáo đã lưu
    await go(page, '#/admin/status');
    await page.waitForSelector('text=Báo cáo đã lưu');
    assert.ok((await page.textContent('body')).includes('Đã lưu 2 báo cáo'));
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
  // Cấp 1 Tra cứu: chỉ Danh mục tài liệu và Lịch sử phiên bản
  const app2 = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app2;
    await login(page, 'KD1', '583924');
    await go(page, '#/reports');
    await page.waitForSelector('.rp-item');
    assert.deepEqual(await page.locator('.rp-item').evaluateAll((els) => els.map((e) => e.dataset.kind)), ['CATALOG', 'VERSIONS']);
    await page.click('#rp-run');
    await page.waitForSelector('#rp-prev .paper');
    const t = await page.textContent('#rp-prev .paper');
    assert.ok(t.includes('Phạm vi xem') && t.includes('KD'));
    assert.deepEqual(app2.consoleErrors, []);
  } finally { await app2.close(); }
});

test('app 2c với máy chủ 2b (chưa dán Code.gs mới): màn Báo cáo báo "Máy chủ chưa lên bản có Báo cáo", chi tiết biểu không có link báo cáo', async () => {
  const { env } = seeded();
  for (const k of ['report.run', 'report.save', 'report.list']) delete env.g.HANDLERS_[k];
  const app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page);
    await page.click('.grid9 .tile[href="#/reports"]');
    await page.waitForSelector('text=Máy chủ chưa lên bản có Báo cáo');
    const it = env.rows('Items').find((x) => x.code === 'QT-ISO-01');
    await go(page, '#/item/' + it.item_id);
    await page.waitForSelector('.ver-card');
    assert.equal(await page.locator('.rp-link').count(), 0);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('đúng các bước HUONG_DAN "CẬP NHẬT LÊN BẢN 2c" + "Thử Báo cáo" trên danh mục như thật (toàn ○ ◐, chỉ owner + Thư ký ISO)', async () => {
  const { env, owner } = seeded();
  const g = env.g;
  // Như danh mục thật: chưa có biểu ●
  g.dbReset_();
  g.systemWrite_(g.readRows_('Items').map((it) => { const r = { ...it, status: it.status === 'ISSUED' ? 'DRAFTING' : it.status, record_version: (it.record_version || 0) + 1 }; delete r.__row; return { sheet: 'Items', mode: 'update', row: r }; }));
  // Bước 2: migrateSchema trên máy chủ 2b (chưa có ReportRuns)
  const book = g.book_('B');
  book.deleteSheet(book.getSheetByName('ReportRuns'));
  g.withWriteLock_(() => g.stateWrite_(g.readState_(), { schema_version: ['STRING', '1.0.4'] }, 'TEST'));
  g.cache_().remove('sys:state');
  g.dbReset_();
  env.logs.length = 0;
  g.migrateSchema();
  assert.ok(env.logs.includes('migrateSchema xong. Thêm: ReportRuns. schema_version=1.0.5'), env.logs.join('\n'));
  g.dbReset_();
  const app = await openApp({ env, now: NOW, ...WEB, site: 'ISO' });
  try {
    const { page } = app;
    await login(page);
    // Bước 4: Trạng thái hệ thống
    await go(page, '#/admin/status');
    await page.waitForSelector('text=Báo cáo đã lưu');
    const st = await page.textContent('body');
    assert.ok(st.includes('Đã lưu 0 báo cáo') && st.includes('1.0.5') && st.includes('Chưa có logo công ty trên báo cáo'));
    // Thử 1–2: Danh mục tài liệu, Đang hiệu lực → trống; Tất cả tình trạng → có bảng
    await page.click('.side .side-item[data-nav="reports"]');
    await page.waitForSelector('#rp-run');
    await page.click('#rp-run');
    await page.waitForSelector('#rp-prev .paper');
    assert.ok((await page.textContent('#rp-prev .paper')).includes('Không có dòng nào'));
    await page.selectOption('#rf-scope', 'ALL');
    await page.click('#rp-run');
    await page.waitForSelector('#rp-prev .rp-tbl');
    const p1 = await page.textContent('#rp-prev .paper');
    for (const s of ['Biểu mẫu', 'BM-ISO-02-01', 'Người lập', 'Người duyệt', 'Cấp khi tải PDF / Excel']) assert.ok(p1.includes(s), s);
    // 3: Tải PDF → BC-2611-001 → mở tab mới
    await page.click('#rp-pdf');
    await page.waitForSelector('.modal #of-open', { timeout: 30000 });
    assert.match(await page.textContent('.modal h2'), /Đã có PDF BC-2611-001/);
    const [popup] = await Promise.all([app.context.waitForEvent('page'), page.click('.modal #of-open')]);
    assert.ok(popup);
    await page.locator('.modal .modal-actions .btn').click();
    // 4: Tải Excel cùng số
    await page.click('#rp-xlsx');
    const xl = await grabFile(page);
    assert.match(xl.title, /Đã có Excel BC-2611-001/);
    // 5: Báo cáo đã lưu
    await page.waitForSelector('#rp-saved .rp-run');
    assert.equal(await page.locator('#rp-saved .rp-run').count(), 1);
    // 6: Tình trạng hồ sơ theo quý — chưa biểu nào được tính → dòng "Không tính"
    await page.click('.rp-item[data-kind="RECORDS"]');
    await page.selectOption('#rf-grain', 'QUARTER');
    await page.click('#rp-run');
    await page.waitForSelector('#rp-prev .paper');
    const p6 = await page.textContent('#rp-prev .paper');
    assert.ok(p6.includes('Không tính:') && p6.includes('Tổng hợp theo bộ phận'), p6.slice(0, 400));
    // 7: Phủ điều khoản: số biểu khớp màn Phủ điều khoản; cột Mã biểu; bỏ tích thì không có cột
    await page.click('.rp-item[data-kind="COVERAGE"]');
    await page.click('#rp-run');
    await page.waitForSelector('#rp-prev .rp-tbl');
    assert.ok((await page.textContent('#rp-prev .paper')).includes('Mã biểu'));
    await page.uncheck('#rf-codes');
    await page.click('#rp-run');
    await page.waitForFunction(() => { const x = document.querySelector('#rp-prev .paper'); return x && x.textContent.includes('PHỦ ĐIỀU KHOẢN') && !x.textContent.includes('Mã biểu'); });
    // 8: Lịch sử phiên bản từ chi tiết biểu
    const it = env.rows('Items').find((x) => x.code === 'BM-ISO-04-02');
    await go(page, '#/item/' + it.item_id);
    await page.click('.rp-link');
    await page.waitForSelector('#rp-prev .paper');
    assert.ok((await page.textContent('#rp-prev .paper')).includes('BM-ISO-04-02'));
    assert.deepEqual(await noRawKeys(page), []);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});
