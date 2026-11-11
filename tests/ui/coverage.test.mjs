// Phiên 1d: màn Phủ điều khoản (khớp cách đếm của file Excel tổng — mục 7), trang chủ đủ (Chờ bạn xử lý, 4 ô số, lịch tuần hồ sơ
// đến hạn, lưới ô), Danh mục lọc theo điều khoản; quyền: Tra cứu không xem tổng hợp, Nhân viên chỉ thấy bộ phận mình.
// iPhone 390×844 và web 1440×900 với máy chủ giả lập (dữ liệu mẫu 25 biểu, 17 điều khoản/chủ đề mẫu).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser, OWNER_CODE, OWNER_PIN } from '../helpers.mjs';
import { coverageRows, coverageSummary } from '../../js/coverage.js';

const NOW = '2026-11-06T08:10:00+07:00'; // Thứ Sáu, tuần 45 (02/11–08/11)
const IPHONE = { viewport: { width: 390, height: 844 }, mobile: true };
const WEB = { viewport: { width: 1440, height: 900 }, mobile: false };

function seeded() {
  const env = freshServer({ now: NOW });
  ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  // Thêm một điều khoản bắt buộc chưa có biểu (dữ liệu mẫu đều đã có biểu) để có dòng "Thiếu biểu – bắt buộc"
  env.g.systemWrite_([{ sheet: 'Clauses', mode: 'insert', row: env.g.cNewSystem_({ clause_id: 'ISO9001|6.2', std: 'ISO9001', key: '6.2', group_vi: 'Hoạch định', group_zh: '策划',
    name_vi: 'Mục tiêu chất lượng (mẫu)', name_zh: '质量目标（样例）', mandatory_record: true, sort_order: 12, active: true }) }], { action: 'test.clause', entity_type: 'SYSTEM' });
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
async function noRawKeys(page) {
  const txt = await page.evaluate(() => document.body.innerText);
  const raw = txt.match(/\b(?:nav|home|cat|item|cov|wd|rec|cell|period|status|where|soon|tile)\.[a-z_]+[A-Z_0-9]*\b/g);
  return raw ? [...new Set(raw)] : [];
}
/** Số phủ tính độc lập từ bảng của máy chủ giả lập */
function expected(env, std) {
  const items = env.rows('Items');
  const clauses = env.rows('Clauses');
  return coverageRows(items, clauses, std);
}

test('iPhone: trang chủ đủ (Chờ bạn xử lý, 4 ô số, lịch tuần), Phủ điều khoản khớp Excel, bấm điều khoản → danh sách biểu → Danh mục đã lọc', async () => {
  const env = seeded();
  const app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page);
    // Lịch tuần: hai biểu ● làm tay hằng ngày có 7 ô; biểu tuần BM-KD-01-04 ở Chủ nhật 08/11 và kỳ tuần 44 còn hạn chót 04/11 (đã quá → !)
    await page.waitForSelector('#home-week .wk-daily');
    const dailyCodes = await page.locator('#home-week .wk-daily a.wk-lbl').allTextContents();
    assert.deepEqual(dailyCodes.sort(), ['BM-SX-01-01', 'BM-SX-02-01']);
    assert.equal(await page.locator('#home-week .wk-daily .wk-grid:not(.wk-head) .rg-cell').count(), 14);
    const ag = await page.textContent('#home-week .wk-agenda');
    assert.ok(ag.includes('BM-KD-01-04') && ag.includes('2026-W45') && ag.includes('2026-W44'), ag);
    assert.ok(ag.includes('hạn chót 04/11'));
    assert.equal(await page.locator('#home-week .wk-dh.today').count(), 1, 'cột hôm nay tô vàng');
    assert.ok((await page.textContent('#home-week .wk-title')).includes('Tuần 45'));
    // Đổi tuần: › → tuần 46; "Tuần này" → về tuần 45
    await page.click('#home-week [data-wk="1"]');
    await page.waitForFunction(() => /Tuần 46/.test(document.querySelector('#home-week .wk-title').textContent));
    assert.equal(await page.locator('#home-week .wk-dh.today').count(), 0);
    await page.click('#home-week [data-wk="0"]');
    await page.waitForFunction(() => /Tuần 45/.test(document.querySelector('#home-week .wk-title').textContent));
    // Bấm một ô quá hạn → hộp thoại kỳ có "Nộp hồ sơ kỳ này"
    await page.locator('#home-week .wk-daily .rg-cell.c-LATE').first().click();
    await page.waitForSelector('.modal');
    assert.ok((await page.textContent('.modal')).includes('Nộp hồ sơ kỳ này'));
    await page.click('.modal .btn:not(.primary)');
    // Chờ bạn xử lý: biểu quá hạn hồ sơ (owner nộp thay mọi bộ phận)
    const pend = await page.textContent('.pend-card');
    assert.match(pend, /\d+ biểu quá hạn hồ sơ/);
    // 4 ô số: điều khoản bắt buộc thiếu biểu = số dòng MISSING
    const iso = expected(env, 'ISO9001');
    const sumIso = coverageSummary(iso);
    assert.equal(sumIso.MISSING, 1);
    const tile = page.locator('.stats .stat').nth(3);
    assert.equal((await tile.locator('.stat-val').textContent()).trim(), String(sumIso.MISSING));
    assert.equal(await page.locator('.grid9 .tile[href="#/coverage"].soon').count(), 0, 'ô Phủ điều khoản không còn "Sắp có"');
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'home-week-iphone.png'), fullPage: true });

    // Bấm ô số → Phủ điều khoản lọc "Thiếu biểu – bắt buộc"
    await tile.click();
    await page.waitForSelector('.cov .cov-row');
    assert.equal(await page.locator('.cov .cov-row').count(), sumIso.MISSING);
    assert.equal(await page.locator('.cov .cov-row.s-MISSING').count(), sumIso.MISSING);
    assert.equal(await page.locator('.cov input').count(), 0, 'không có ô gõ → không bật bàn phím');
    // Tất cả: từng dòng khớp số biểu / đã ban hành / in từ app / trạng thái
    await page.click('.cov [data-f=""]');
    await page.waitForFunction((n) => document.querySelectorAll('.cov .cov-row').length === n, iso.length);
    const metas = await page.locator('.cov .cov-row').evaluateAll((els) => els.map((e) => ({ key: e.querySelector('.code').textContent, meta: e.querySelector('.cat-meta').textContent, st: e.className })));
    iso.forEach((r, i) => {
      assert.equal(metas[i].key, r.key);
      assert.ok(metas[i].meta.includes(`${r.n} biểu`) && metas[i].meta.includes(`${r.issued} đã ban hành`) && metas[i].meta.includes(`${r.app} in từ app`), `${r.key}: ${metas[i].meta}`);
      assert.ok(metas[i].st.includes('s-' + r.state), r.key);
    });
    assert.ok(await noOverflow(page));
    assert.deepEqual(await noRawKeys(page), []);
    await page.screenshot({ path: path.join(SHOTS, 'coverage-iphone.png'), fullPage: true });

    // Thẻ BRCGS → bấm "Truy xuất"? (chủ đề có biểu) → hộp thoại danh sách biểu → Mở trong Danh mục
    await page.click('.cov [data-std="BRC"]');
    const brc = expected(env, 'BRC');
    await page.waitForFunction((n) => document.querySelectorAll('.cov .cov-row').length === n, brc.length);
    const withItems = brc.find((r) => r.n >= 2) || brc.find((r) => r.n);
    await page.locator('.cov .cov-row').nth(brc.indexOf(withItems)).click();
    await page.waitForSelector('.modal .cov-items');
    assert.equal(await page.locator('.modal .cov-items li').count(), withItems.n);
    await page.click('.modal .btn.primary');
    await page.waitForSelector('.cat .cov-filter');
    await page.waitForFunction((n) => document.querySelectorAll('.cat-row').length === n, withItems.n);
    assert.deepEqual((await page.locator('.cat-row .code').allTextContents()).sort(), withItems.items.map((x) => x.code).sort());
    assert.ok((await page.textContent('.cov-filter')).includes(withItems.key));
    // Bỏ lọc điều khoản → đủ 25 biểu
    await page.click('#cf-clause');
    await page.waitForFunction(() => document.querySelectorAll('.cat-row').length === 25);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('web: bảng Phủ ISO 9001 theo nhóm, cột Bắt buộc; quyền: Tra cứu không xem, Nhân viên SX chỉ đếm biểu bộ phận mình + chung', async () => {
  const env = seeded();
  addUser(env, 'SX2', 2, '583920', { depts: 'SX' });
  addUser(env, 'KD1', 1, '583921', { depts: 'KD' });
  let app = await openApp({ env, now: NOW, ...WEB });
  try {
    const { page } = app;
    await login(page);
    assert.equal(await page.locator('.side .side-item[data-nav="coverage"].soon').count(), 0);
    await page.click('.side .side-item[data-nav="coverage"]');
    await page.waitForSelector('.cov-tbl');
    const iso = expected(env, 'ISO9001');
    assert.equal(await page.locator('.cov-tbl tbody tr[data-k]').count(), iso.length);
    assert.ok(await page.locator('.cov-tbl tr.cov-group').count() >= 4, 'dòng tiêu đề nhóm điều khoản');
    const first = page.locator('.cov-tbl tbody tr[data-k]').first();
    const cells = await first.locator('td').allTextContents();
    assert.equal(cells[0], iso[0].key);
    assert.deepEqual(cells.slice(3, 6).map(Number), [iso[0].n, iso[0].issued, iso[0].app]);
    await page.screenshot({ path: path.join(SHOTS, 'coverage-web.png'), fullPage: true });
    await go(page, '#/');
    await page.waitForSelector('#home-week .wk-daily');
    await page.screenshot({ path: path.join(SHOTS, 'home-week-web.png'), fullPage: true });
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }

  // Nhân viên SX: đếm trên biểu SX + chung (Ban ISO), có ghi chú phạm vi
  app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page, 'SX2', '583920');
    await go(page, '#/coverage');
    await page.waitForSelector('.cov .cov-row');
    assert.ok((await page.textContent('.cov')).includes('SX'), 'ghi chú phạm vi bộ phận');
    const mine = env.rows('Items').filter((x) => x.dept_code === 'SX' || x.dept_code === 'ISO' || x.kind === 'MANUAL' || x.kind === 'POLICY');
    const rows = coverageRows(mine, env.rows('Clauses'), 'ISO9001');
    const metas = await page.locator('.cov .cov-row .cat-meta').allTextContents();
    rows.forEach((r, i) => assert.ok(metas[i].includes(`${r.n} biểu`), `${r.key}: ${metas[i]}`));
  } finally { await app.close(); }

  // Tra cứu: không xem tổng hợp; ô lưới và lịch tuần không hiện
  app = await openApp({ env, now: NOW, ...IPHONE });
  try {
    const { page } = app;
    await login(page, 'KD1', '583921');
    assert.equal(await page.locator('#home-week').count(), 0);
    assert.equal(await page.locator('.grid9 .tile[href="#/coverage"]').count(), 0);
    await go(page, '#/coverage');
    await page.waitForSelector('.empty-state');
    assert.ok((await page.textContent('.view')).includes('cấp 2+'));
  } finally { await app.close(); }
});
