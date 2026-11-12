// Kiểm soát tài liệu trên giao diện (Đợt 2, phiên 2d) — chạy đúng các bước HUONG_DAN "Thử phiên 2d" gửi người dùng, trên danh mục như
// thật (toàn ○ ◐, chỉ owner + Thư ký ISO cấp 4): Đề nghị tài liệu → Đề nghị mới (Sửa đổi / ban hành biểu ◐) → Gửi phiếu DN-2611-001 →
// Chấp thuận (PIN) → Soạn phiên bản theo phiếu (PDF) → Lưu và gửi duyệt → Duyệt → Ban hành → phiếu Đã thực hiện → Phát bản in → Tem QR
// (xem trước, In, PNG giải mã đúng link …/#/f/<mã>?r=01) → quét tem → In phiếu / Sổ phân phối (báo cáo) → Trạng thái hệ thống.
// Web: Nhân viên SX đề nghị từ chi tiết biểu, trưởng bộ phận thấy "chờ bạn xem xét"; ban hành lần mới → Cần thu hồi → thu hồi + phát
// bản mới (PIN); tem lần cũ báo đỏ. App 2d với máy chủ 2c.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser, makeClient, uuid, OWNER_CODE, OWNER_PIN } from '../helpers.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const IPHONE = { viewport: { width: 390, height: 844 }, mobile: true };
const WEB = { viewport: { width: 1440, height: 900 }, mobile: false };

/** Như dữ liệu thật: danh mục toàn ○ ◐ (● đổi thành ◐), owner + Thư ký ISO cấp 4 */
function realLike() {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
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
  return { env, owner };
}
function seededIssued() {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  env.g.dbReset_();
  return { env, owner };
}
const pdfBuf = (n = 4000) => { const b = Buffer.alloc(n, 32); Buffer.from('%PDF-1.7\n').copy(b); return b; };
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
const itemOf = (env, code) => rows(env, 'Items').find((x) => x.code === code);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function noRawKeys(page) {
  const txt = await page.evaluate(() => document.body.innerText);
  const raw = txt.match(/\b(?:dr|dist|lbl|nav|tile|rpt|rp|home)\.[a-z_]+[A-Za-z_0-9.]*\b/g);
  return raw ? [...new Set(raw)] : [];
}
/** Giải mã ảnh PNG (bytes) bằng jsQR của app ngay trong trang */
async function decodePng(page, base, buf) {
  await page.addScriptTag({ url: base + 'vendor/jsQR-1.4.0.js' }); // CSP script-src 'self': nạp từ trang app
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height);
    const r = window.jsQR(d.data, d.width, d.height);
    return r ? r.data : null;
  }, buf.toString('base64'));
}

test('iPhone, đúng các bước "Thử phiên 2d" (danh mục toàn ○ ◐, Thư ký ISO cấp 4): phiếu → chấp thuận → soạn theo phiếu → ban hành → Đã thực hiện → phát bản in → tem QR → báo cáo', async () => {
  const { env } = realLike();
  const it0 = itemOf(env, 'BM-SX-02-03');
  assert.equal(it0.status, 'DRAFTING');
  const app = await openApp({ env, now: NOW, ...IPHONE, site: 'ISO' });
  try {
    const { page } = app;
    await login(page, 'TK', '583922');
    // Bước 1: Trang chủ → ô Đề nghị tài liệu → Đề nghị mới → Sửa đổi / ban hành → chọn biểu → lý do, nội dung → Gửi phiếu
    await page.locator('.tile[href="#/requests"]').click();
    await page.waitForSelector('a[href="#/request/new"]');
    await page.locator('a[href="#/request/new"]').first().click();
    await page.waitForSelector('form.dr-form');
    assert.ok((await page.textContent('.dr-form .chip.on')).includes('Sửa đổi / ban hành'));
    // Lọc Bộ phận + Tình trạng (ô chọn, không bàn phím) → danh sách ngắn → chọn biểu
    assert.ok((await page.textContent('#dr-pick')).includes('Tài liệu, biểu mẫu (' + (await page.locator('#f-item_id option').count() - 1) + ' biểu)'));
    await page.selectOption('#dp-dept', 'SX');
    await page.selectOption('#dp-st', 'DRAFTING');
    const opts = await page.$$eval('#f-item_id option', (os) => os.map((o) => o.textContent));
    assert.ok(opts.length >= 2 && opts.length < 10 && opts.slice(1).every((t) => t.startsWith('BM-SX-')), opts.join(' | '));
    await page.selectOption('#f-item_id', it0.item_id);
    await page.waitForFunction(() => document.querySelector('.dr-form') && /BM-SX-02-03/.test(document.querySelector('.dr-form').textContent));
    assert.ok((await page.textContent('.dr-picked')).includes('Đang soạn'));
    // Gõ lý do rồi đổi loại phiếu qua lại: chữ đã gõ còn nguyên
    await page.fill('#f-reason_vi', 'Tạm');
    await page.click('.chip[data-type="CANCEL"]');
    await page.click('.chip[data-type="REVISE"]');
    assert.equal(await page.inputValue('#f-reason_vi'), 'Tạm');
    await page.fill('#f-reason_vi', '');
    // Bỏ trống lý do → báo đỏ, không gửi
    await page.click('#dr-send');
    await page.waitForSelector('.bi-pair.bad');
    await page.fill('#f-reason_vi', 'Ban hành sổ phế phẩm để dùng chung các ca');
    await page.fill('#f-content_vi', 'Ban hành lần đầu theo mẫu đang dùng thử');
    assert.ok(await noOverflow(page), 'không tràn ngang');
    await page.click('#dr-send');
    await page.waitForSelector('.dr .item-head', { timeout: 20000 });
    let head = await page.textContent('.dr .item-head');
    assert.ok(head.includes('DN-2611-001') && head.includes('Chờ xem xét'), head);
    await page.screenshot({ path: path.join(SHOTS, 'docreq-iphone.png') });
    // Bước 2: Chấp thuận → ý kiến → PIN
    await page.click('#dr-approve');
    await page.locator('.modal .btn.primary').click();
    await answerPin(page, '583922');
    await page.waitForFunction(() => /Đã chấp thuận/.test(document.querySelector('.dr .item-head').textContent));
    assert.ok((await page.textContent('.dr')).includes('soạn phiên bản theo phiếu'));
    // Bước 3: Soạn phiên bản theo phiếu → PDF → Lưu và gửi duyệt → Duyệt → Ban hành
    await page.locator('a[href*="?req="]').click();
    await page.waitForSelector('form.ver-form');
    assert.ok((await page.textContent('#f-request_id option:checked')).includes('DN-2611-001'), 'chọn sẵn phiếu');
    assert.equal(await page.inputValue('#f-change_summary_vi'), 'Ban hành lần đầu theo mẫu đang dùng thử', 'tóm tắt lấy từ phiếu');
    await page.setInputFiles('#f-file-PDF', { name: 'BM-SX-02-03.pdf', mimeType: 'application/pdf', buffer: pdfBuf() });
    await page.locator('button[data-go="submit"]').click();
    await page.waitForSelector('#v-approve', { timeout: 20000 });
    await page.click('#v-approve');
    await page.locator('.modal .btn.primary').click();
    await page.waitForSelector('#v-issue');
    await page.click('#v-issue');
    await page.locator('.modal .btn.primary').click();
    await page.waitForFunction(() => document.querySelector('.item-head') && document.querySelector('.item-head').textContent.includes('Đang hiệu lực'));
    const it1 = itemOf(env, 'BM-SX-02-03');
    assert.equal(it1.status, 'ISSUED');
    assert.equal(it1.current_rev, '01');
    const rq = rows(env, 'DocRequests')[0];
    assert.equal(rq.state, 'DONE');
    // Bước 4: chi tiết biểu → thẻ Phiếu đề nghị (đã xong) → Bản in đang phát → Phát bản in
    await go(page, '#/item/' + it1.item_id);
    await page.waitForSelector('.dist-card');
    assert.ok((await page.textContent('.dr-card')).includes('1 phiếu đã xong'));
    await page.locator('.dr-card').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SHOTS, 'item-cards-iphone.png') });
    await page.locator('.dist-card a[href^="#/dist/new/"]').click();
    await page.waitForSelector('form.dist-form');
    assert.equal(await page.inputValue('.dist-in [name=dept]'), 'SX', 'mặc định bộ phận của biểu');
    await page.fill('.dist-in [name=holder]', 'Tổ in 1 – kệ biểu mẫu');
    await page.selectOption('.dist-in [name=copies]', '2');
    await page.click('#dist-add');
    await page.selectOption('.dist-in:nth-child(2) [name=dept]', 'CL');
    await page.fill('.dist-in:nth-child(2) [name=holder]', 'Phòng QC');
    assert.ok(await noOverflow(page));
    await page.click('#dist-save');
    await page.waitForSelector('.dist-list .dist-row', { timeout: 20000 });
    assert.equal(await page.locator('.dist-row').count(), 2);
    await page.screenshot({ path: path.join(SHOTS, 'dist-iphone.png') });
    const ds = rows(env, 'Distributions');
    assert.deepEqual(ds.map((d) => [d.dept_code, d.holder, d.copies, d.rev, d.state]).sort(), [['CL', 'Phòng QC', 1, '01', 'ACTIVE'], ['SX', 'Tổ in 1 – kệ biểu mẫu', 2, '01', 'ACTIVE']]);
    // Bước 5: chi tiết biểu → Tem QR → 70×37 → xem trước → In (khổ A4) → Tải PNG → giải mã đúng link
    await go(page, '#/item/' + it1.item_id);
    await page.waitForSelector('a[href^="#/labels?item="]');
    await page.locator('a[href^="#/labels?item="]').click();
    await page.waitForSelector('.lbl-preview .qrl-sheet .qrl:not(.qrl-empty)');
    assert.ok((await page.textContent('#lb-sum')).includes('1 biểu · 1 tem · 1 tờ A4'));
    const lblText = await page.textContent('.lbl-preview .qrl');
    assert.ok(lblText.includes('BM-SX-02-03') && lblText.includes('Lần ban hành 01') && lblText.includes('第01版'), lblText);
    await page.screenshot({ path: path.join(SHOTS, 'labels-iphone.png'), fullPage: true });
    await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
    await page.click('#lb-print');
    await page.waitForFunction(() => window.__printed === 1);
    // Trang in: một tờ A4 210 × 297 mm, tem 70 × 37 mm; phần còn lại của app ẩn khi in
    await page.emulateMedia({ media: 'print' });
    const dims = await page.evaluate(() => {
      const s = document.querySelector('#print-root .qrl-sheet');
      const l = document.querySelector('#print-root .qrl');
      const r = s.getBoundingClientRect(), q = l.getBoundingClientRect();
      return { sw: r.width, sh: r.height, lw: q.width, lh: q.height, app: document.querySelector('.app').checkVisibility() };
    });
    const mm = 96 / 25.4;
    assert.ok(Math.abs(dims.sw - 210 * mm) < 1 && Math.abs(dims.sh - 297 * mm) < 1, JSON.stringify(dims));
    assert.ok(Math.abs(dims.lw - 70 * mm) < 1 && Math.abs(dims.lh - 37 * mm) < 1, JSON.stringify(dims));
    assert.equal(dims.app, false, 'khung app ẩn khi in');
    await page.setViewportSize({ width: 800, height: 1130 });
    await page.screenshot({ path: path.join(SHOTS, 'labels-print-S.png') });
    await page.setViewportSize(IPHONE.viewport);
    await page.emulateMedia({ media: 'screen' });
    // PNG: iPhone mở bảng Chia sẻ → giả lập bắt tệp
    await page.evaluate(() => { window.__shared = null; navigator.canShare = () => true; navigator.share = async (d) => { const f = d.files[0]; window.__shared = { name: f.name, b64: btoa(String.fromCharCode(...new Uint8Array(await f.arrayBuffer()))) }; }; });
    await page.click('#lb-png');
    await page.waitForFunction(() => window.__shared);
    const shared = await page.evaluate(() => window.__shared);
    assert.equal(shared.name, 'QR_BM-SX-02-03_lan01.png');
    const url = await decodePng(page, app.base, Buffer.from(shared.b64, 'base64'));
    assert.equal(url, app.base + '#/f/' + it1.qr_key + '?r=01');
    // Bước 6: quét tem (link trên tem) → chi tiết biểu "Đang hiệu lực: lần 01"
    await go(page, '#/f/' + it1.qr_key + '?r=01');
    await page.waitForSelector('.scan-banner');
    assert.ok((await page.textContent('.scan-banner')).includes('01'));
    assert.ok(await page.locator('.scan-banner.ok').count());
    // Bước 7: Báo cáo → Phiếu đề nghị tài liệu → chọn DN-2611-001 → Xem → người đề nghị / người xem xét; Sổ phân phối & thu hồi
    await go(page, '#/reports');
    await page.waitForSelector('.rp-item[data-kind="DOCREQ"]');
    await page.click('.rp-item[data-kind="DOCREQ"]');
    await page.selectOption('#rf-req', rq.request_id);
    await page.click('#rp-run');
    await page.waitForSelector('.rp-paper');
    let paper = await page.textContent('.rp-paper');
    for (const s of ['PHIẾU ĐỀ NGHỊ BAN HÀNH / SỬA ĐỔI / HỦY TÀI LIỆU', 'BM-ISO-02-02', 'DN-2611-001', 'Người đề nghị', 'Người xem xét', 'Ban hành sổ phế phẩm', 'Đã thực hiện']) assert.ok(paper.includes(s), s);
    await page.click('.rp-item[data-kind="DIST"]');
    await page.click('#rp-run');
    await page.waitForFunction(() => /SỔ PHÂN PHỐI/.test(document.querySelector('.rp-paper') ? document.querySelector('.rp-paper').textContent : ''));
    paper = await page.textContent('.rp-paper');
    for (const s of ['BM-ISO-02-03', 'Tổ in 1 – kệ biểu mẫu', 'Phòng QC', 'Đang dùng']) assert.ok(paper.includes(s), s);
    assert.deepEqual(await noRawKeys(page), []);
    // Bước 8: Tài khoản → Quản trị → Trạng thái hệ thống: dòng Đề nghị tài liệu, phân phối
    await go(page, '#/admin/status');
    await page.waitForFunction(() => /Đề nghị tài liệu, phân phối/.test(document.body.textContent));
    const st = await page.textContent('.view');
    assert.ok(st.includes('Phiếu đề nghị: chờ xem xét 0 · đã chấp thuận chưa thực hiện 0 · đã thực hiện 1 · Bản in đang phát 2 nơi (3 bản) · cần thu hồi 0'), st.slice(0, 2000));
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('web: Nhân viên SX đề nghị sửa từ chi tiết biểu → trưởng bộ phận "chờ bạn xem xét" → chấp thuận; ban hành lần 02 → Cần thu hồi → Thu hồi + phát bản mới (PIN); tem lần cũ báo đỏ', async () => {
  const { env, owner } = seededIssued();
  addUser(env, 'SX2', 2, '583920', { depts: 'SX' });
  addUser(env, 'SX3', 3, '583924', { depts: 'SX' });
  const it = itemOf(env, 'BM-SX-02-01');
  // Thư ký (owner) đã phát bản lần 01 cho 2 nơi
  owner.pin(OWNER_PIN);
  assert.equal(owner.write('dist.issue', { item_id: it.item_id, dist_date: '2026-11-02', rows: [{ dist_id: uuid(), dept_code: 'SX', holder: 'Tổ in 1', copies: 2 }, { dist_id: uuid(), dept_code: 'SX', holder: 'Tổ in 2', copies: 1 }] }).ok, true);
  let app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page, 'SX2', '583920');
    assert.equal(await page.locator('.side-item[data-nav="requests"]').count(), 1);
    await go(page, '#/item/' + it.item_id);
    await page.waitForSelector('.dr-card');
    await page.locator('.dr-card a[href*="type=REVISE"]').click();
    await page.waitForSelector('form.dr-form');
    assert.equal(await page.inputValue('#f-item_id'), it.item_id);
    await page.fill('#f-reason_vi', 'Thêm cột thời gian dừng máy');
    await page.fill('#f-content_vi', 'Thêm cột "Dừng máy (phút)"');
    await page.click('#dr-send');
    await page.waitForSelector('.dr .item-head');
    assert.equal(await page.locator('#dr-approve').count(), 0, 'người đề nghị không thấy Chấp thuận');
    assert.ok((await page.textContent('.dr')).includes('Chờ trưởng bộ phận'));
  } finally { await app.close(); }
  app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page, 'SX3', '583924');
    assert.ok((await page.textContent('.pend-card')).includes('1 phiếu đề nghị tài liệu chờ bạn xem xét'));
    assert.equal(await page.textContent('.side-item[data-nav="requests"] .nav-badge'), '1');
    await page.locator('.pend-row[href^="#/request/"]').click();
    await page.click('#dr-approve');
    await page.locator('.modal .btn.primary').click();
    await answerPin(page, '583924');
    await page.waitForFunction(() => /Đã chấp thuận/.test(document.querySelector('.dr .item-head').textContent));
  } finally { await app.close(); }
  // Ban hành lần 02 theo phiếu (qua API cho gọn) → 2 nơi cần thu hồi
  const rq = rows(env, 'DocRequests')[0];
  const vid = uuid();
  assert.equal(owner.write('version.save', { version_id: vid, item_id: it.item_id, change_summary_vi: 'Lần 2', request_id: rq.request_id }).ok, true);
  let r = owner.write('doc.upload', { document_id: uuid(), entity_type: 'VERSION', entity_id: vid, kind: 'PDF', mime_type: 'application/pdf', file_name: 'x.pdf', content_b64: pdfBuf().toString('base64') });
  r = owner.write('version.submit', { version_id: vid }, { expected_version: r.record_version });
  r = owner.write('version.approve', { version_id: vid }, { expected_version: r.record_version });
  r = owner.write('version.issue', { version_id: vid }, { expected_version: r.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page, OWNER_CODE, OWNER_PIN);
    assert.ok((await page.textContent('.pend-card')).includes('2 nơi giữ bản in lần cũ cần thu hồi'));
    await page.locator('.pend-row[href="#/dist?f=DUE"]').click();
    await page.waitForSelector('.dist-tbl');
    assert.equal(await page.locator('.dist-tbl tbody tr').count(), 2);
    assert.ok((await page.textContent('.dist-tbl')).includes('Hiện hành lần 02'));
    await page.check('#dist-allchk');
    await page.click('#dist-recall');
    await page.waitForSelector('.modal #rc-re');
    assert.equal(await page.isChecked('#rc-re'), true);
    await page.fill('#rc-note', 'Đã hủy bản cũ');
    await page.locator('.modal .btn.primary').click();
    await answerPin(page, OWNER_PIN);
    await page.waitForFunction(() => /Không có bản in nào cần thu hồi/.test(document.querySelector('.view').textContent));
    const ds = rows(env, 'Distributions');
    assert.deepEqual(ds.map((d) => d.state + ':' + d.rev).sort(), ['ACTIVE:02', 'ACTIVE:02', 'RECALLED:01', 'RECALLED:01']);
    await page.click('.chip[data-tab="ACTIVE"]');
    await page.waitForFunction(() => document.querySelectorAll('.dist-tbl tbody tr').length === 2);
    // Tem lần 01 (bản in cũ) báo đỏ
    await go(page, '#/f/' + it.qr_key + '?r=01');
    await page.waitForSelector('.scan-banner.err');
    assert.ok((await page.textContent('.scan-banner')).includes('lỗi thời'));
    await page.screenshot({ path: path.join(SHOTS, 'dist-web.png') });
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('app 2d với máy chủ 2c (chưa dán Code.gs mới): không có thẻ phiếu / phân phối, màn Đề nghị báo máy chủ cũ; In tem QR vẫn dùng được', async () => {
  const { env } = seededIssued();
  // Máy chủ 2c: chưa có action docreq.*, dist.*
  for (const k of ['docreq.save', 'docreq.approve', 'docreq.reject', 'docreq.cancel', 'docreq.done', 'dist.issue', 'dist.recall', 'dist.edit']) delete env.g.HANDLERS_[k];
  const it = itemOf(env, 'BM-SX-02-01');
  const app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page, OWNER_CODE, OWNER_PIN);
    assert.equal(await page.locator('.tile[href="#/requests"]').count(), 0);
    await go(page, '#/item/' + it.item_id);
    await page.waitForSelector('.item-actions');
    assert.equal(await page.locator('.dr-card').count(), 0);
    assert.equal(await page.locator('.dist-card').count(), 0);
    await go(page, '#/requests');
    await page.waitForFunction(() => /Máy chủ chưa lên bản 2d/.test(document.querySelector('.view').textContent));
    await go(page, '#/labels?item=' + it.item_id);
    await page.waitForSelector('.lbl-preview .qrl-sheet');
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});
