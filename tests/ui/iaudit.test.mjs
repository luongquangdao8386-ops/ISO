// Đánh giá nội bộ trên giao diện (Đợt 4, phiên 4a — giữ phạm vi Cơ điện).
// Test 1 (iPhone, dữ liệu như thật: phạm vi CĐ, danh mục ○ ◐, Thư ký ISO cấp 4 — như app thật chỉ có owner + Thư ký ISO): Trang chủ → ô Đánh
// giá nội bộ → Lập chương trình năm 2026 → Thêm đợt (tháng 11, điều khoản, kế hoạch: ngày, trưởng đoàn ngoài app) → Phủ điều khoản: Không áp
// dụng điều khoản còn thiếu (ISO 9001, BRCGS) → Gửi duyệt → Duyệt (PIN) → DG-26-01 → Gợi ý câu hỏi → Chốt kế hoạch → dời ngày đánh giá về
// hôm nay → Bắt đầu đánh giá → Ghi kết quả (Không phù hợp phải có bằng chứng) → Chờ bạn xử lý → In kế hoạch BM-ISO-03-02, checklist
// BM-ISO-03-03 (PDF), chương trình BM-ISO-03-01 → Trạng thái hệ thống.
// Test 2 (web): chọn Đánh giá viên của chính bộ phận được đánh giá → báo lỗi ngay; Đánh giá viên bộ phận khác làm trưởng đoàn → đăng nhập thấy
// menu Đánh giá nội bộ, Chờ bạn xử lý, lập checklist, chốt, bắt đầu, ghi kết quả; Excel checklist; nhân viên SX thấy chương trình, không thấy đợt.
// Test 3: app 4a với máy chủ 3c (chưa dán Code.gs 4a): ô Đánh giá nội bộ "Sắp có", màn báo cần cập nhật máy chủ, Báo cáo không có loại Đánh giá.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { openApp, SHOTS } from './harness.mjs';
import { freshServer, ownerClient, addUser, makeClient, uuid } from '../helpers.mjs';
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
  const raw = txt.match(/\b(?:aud|nav|tile|rpt|rp|home|mail|health|cat)\.[a-z_]+[A-Za-z_0-9.]*\b/g);
  return raw ? [...new Set(raw)] : [];
}
const modalPrimary = (page) => page.locator('.modal').last().locator('.modal-actions .btn.primary').click();
const waitGone = (page) => page.waitForSelector('.modal', { state: 'detached' });
async function grabFile(page) {
  await page.waitForSelector('.modal #of-open', { timeout: 30000 });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.modal #of-open')]);
  const buf = fs.readFileSync(await dl.path());
  await page.locator('.modal .modal-actions .btn').click();
  return { name: dl.suggestedFilename(), buf };
}

test('iPhone: Lập chương trình năm → thêm đợt → Không áp dụng điều khoản còn thiếu → Gửi duyệt → Duyệt (PIN) → gợi ý câu hỏi → chốt kế hoạch → bắt đầu → ghi kết quả → in kế hoạch / checklist / chương trình → Trạng thái hệ thống', async () => {
  const env = realLike();
  const app = await openApp({ env, ...IPHONE, now: NOW });
  try {
    const { page } = app;
    await login(page, 'TK', '583922');
    // 1. Trang chủ → ô Đánh giá nội bộ → Lập chương trình năm 2026
    await page.click('.grid9 .tile[href="#/audits"]');
    await page.waitForSelector('#aud-prog-new');
    assert.match(await page.textContent('#view'), /Chưa có chương trình đánh giá nội bộ năm 2026/);
    await page.click('#aud-prog-new');
    await page.waitForSelector('form.aud-prog-form');
    assert.equal(await page.inputValue('#f-year'), '2026');
    assert.equal(await page.locator('#pf-stds .chip.on').count(), 2, 'mặc định ISO 9001 + BRCGS');
    assert.match(await page.inputValue('#f-scope_vi'), /Cơ điện/);
    await page.click('#pf-save');
    await page.waitForSelector('.aud-prog .item-head');
    assert.equal((await page.textContent('.aud-prog .code.big')).trim(), 'DG-26');
    assert.match(await page.textContent('.aud-prog .item-head'), /Nháp/);
    // 2. Thêm đợt đánh giá: thiếu điều khoản → báo ở ô; đủ → về chương trình
    await page.click('#aud-add');
    await page.waitForSelector('form.aud-form');
    assert.equal(await page.inputValue('#f-dept_code'), 'CĐ');
    await page.selectOption('#f-plan_month', '2026-11');
    await page.fill('#f-title_vi', 'Bảo trì, sửa chữa thiết bị; điện nước (đợt thử)');
    await page.click('#af-save');
    await page.waitForSelector('[data-field="clauses"].bad');
    await page.locator('.aud-cl:has-text("7.1.3") input').check();
    await page.locator('.aud-cl:has-text("7.1.5") input').check();
    await page.locator('.aud-cl:has-text("Dao và vật sắc") input').check();
    assert.match(await page.textContent('.aud-cl:has-text("7.1.3")'), /\d+ biểu/);
    await page.fill('#f-audit_date', '2026-11-20');
    await page.fill('#f-time_text', '8:00 – 11:00');
    await page.fill('#f-place_text', 'Xưởng cơ điện');
    await page.fill('#f-auditee_text', 'Trưởng bộ phận Cơ điện');
    await page.fill('.aud-member [data-k="n"]', 'Nguyễn Văn A');
    await page.selectOption('.aud-member [data-k="d"]', 'CL');
    assert.equal(await page.locator('.aud-member [data-k="r"]:checked').count(), 1, 'người đầu tiên là trưởng đoàn');
    assert.ok(await noOverflow(page));
    await page.screenshot({ path: path.join(SHOTS, 'aud-form-iphone.png'), fullPage: true });
    await page.click('#af-save');
    await page.waitForSelector('.aud-list .aud-row');
    assert.match(await page.textContent('.aud-list'), /Chưa cấp mã/);
    let a = rows(env, 'Audits')[0];
    assert.deepEqual(a.team_json, [{ u: '', n: 'Nguyễn Văn A', d: 'CL', r: 'L' }]);
    assert.equal(a.audit_date, '2026-11-20');
    // 3. Gửi duyệt khi chưa phủ hết → báo lỗi; Không áp dụng điều khoản còn thiếu (ISO 9001 rồi BRCGS)
    await page.click('#aud-submit');
    await page.waitForFunction(() => /chưa phủ hết điều khoản/.test(document.body.textContent));
    assert.match(await page.textContent('.aud-cov .chips.tabs'), /ISO 9001 2\/11/);
    await page.click('#aud-na-all');
    await page.waitForSelector('.modal #dlg-text');
    assert.match(await page.inputValue('.modal #dlg-text'), /Ngoài phạm vi áp dụng \(Cơ điện\)/);
    await modalPrimary(page);
    await page.waitForFunction(() => /ISO 9001 11\/11/.test(document.querySelector('.aud-cov') && document.querySelector('.aud-cov').textContent));
    await page.click('.aud-cov [data-std="BRC"]');
    await page.waitForSelector('.aud-cov [data-std="BRC"].on');
    await page.click('#aud-na-all');
    await page.waitForSelector('.modal #dlg-text');
    await modalPrimary(page);
    await page.waitForFunction(() => /BRCGS 6\/6/.test(document.querySelector('.aud-cov') && document.querySelector('.aud-cov').textContent));
    // Bấm một điều khoản Không áp dụng → hộp thoại có lý do, bỏ được
    await page.click('.aud-cov-row.st-NA >> nth=0');
    await page.waitForSelector('.modal #cl-na');
    await page.locator('.modal .modal-actions .btn').first().click();
    await waitGone(page);
    // 4. Gửi duyệt → Duyệt chương trình (PIN) → DG-26-01
    await page.click('#aud-submit');
    await page.waitForSelector('.aud-prog .item-head:has-text("Chờ duyệt")');
    await page.click('#aud-approve');
    await page.waitForSelector('.modal #dlg-text');
    assert.match(await page.textContent('.modal'), /1 đợt chưa có mã/);
    await modalPrimary(page);
    await answerPin(page, '583922');
    await page.waitForSelector('.aud-prog .item-head:has-text("Đã duyệt")');
    assert.match(await page.textContent('.aud-prog .item-head'), /lần 01/);
    assert.match(await page.textContent('.aud-list'), /DG-26-01/);
    await page.screenshot({ path: path.join(SHOTS, 'aud-program-iphone.png'), fullPage: true });
    // 5. Đợt: điều khoản kèm biểu liên quan; gợi ý câu hỏi
    await page.click('.aud-row');
    await page.waitForSelector('.item.aud');
    assert.equal((await page.textContent('.item.aud .code.big')).trim(), 'DG-26-01');
    assert.match(await page.textContent('.aud-clauses-view'), /BM-CĐ-/);
    await page.click('#aud-suggest');
    await page.waitForSelector('.modal .aud-sugg');
    assert.equal(await page.locator('.modal [data-sg]:checked').count(), 3);
    assert.match(await page.textContent('.modal .aud-sugg'), /Điều khoản 7\.1\.3 – Cơ sở hạ tầng \(mẫu\).*Hồ sơ cần xem: BM-CĐ-/);
    await modalPrimary(page);
    await page.waitForFunction(() => document.querySelectorAll('.aud-check').length === 3);
    // 6. Chốt kế hoạch; chưa tới ngày → Bắt đầu bị khóa
    await page.click('#aud-ready');
    await page.waitForSelector('.item.aud .item-head:has-text("Đã chốt kế hoạch")');
    assert.equal(await page.locator('#aud-start[disabled]').count(), 1);
    // 7. Dời ngày đánh giá về hôm nay → Bắt đầu đánh giá
    await page.click('#aud-edit');
    await page.waitForSelector('form.aud-form');
    assert.equal(await page.locator('#f-dept_code').count(), 0, 'chương trình đã duyệt: phần chương trình chỉ xem');
    await page.fill('#f-audit_date', '2026-11-12');
    await page.click('#af-save');
    await page.waitForSelector('#aud-start:not([disabled])');
    await page.click('#aud-start');
    await page.waitForSelector('.item.aud .item-head:has-text("Đang đánh giá")');
    // 8. Ghi kết quả: Không phù hợp chưa có bằng chứng → nhắc; có bằng chứng → lưu
    await page.click('.aud-check >> nth=0 >> [data-rec]');
    await page.waitForSelector('.modal #rc-res');
    await page.click('.modal [data-res="NC"]');
    await modalPrimary(page);
    await page.waitForFunction(() => /ghi bằng chứng/.test(document.body.textContent));
    await page.waitForSelector('.modal #rc-vi');
    await page.fill('.modal #rc-vi', 'Máy nén khí số 2 quá hạn bảo trì tháng 10 (thử)');
    await modalPrimary(page);
    await page.waitForSelector('.aud-check:has-text("Không phù hợp")');
    await page.click('.aud-check >> nth=1 >> [data-rec]');
    await page.waitForSelector('.modal #rc-res');
    await page.click('.modal [data-res="C"]');
    await modalPrimary(page);
    await page.waitForFunction(() => /đã ghi 2\/3/.test(document.querySelector('.aud-checks').textContent));
    const ch = rows(env, 'AuditChecks').filter((x) => x.result);
    assert.deepEqual(ch.map((x) => x.result).sort(), ['C', 'NC']);
    assert.ok(await noOverflow(page));
    await page.screenshot({ path: path.join(SHOTS, 'aud-checklist-iphone.png'), fullPage: true });
    // 9. Trang chủ: Chờ bạn xử lý
    await go(page, '#/');
    await page.waitForSelector('.pend-card');
    assert.match(await page.textContent('.pend-card'), /1 đợt đánh giá nội bộ đang đánh giá/);
    assert.match(await page.textContent('.grid9 .tile[href="#/audits"]'), /DG-26 · 1 đợt/);
    // 10. In kế hoạch, checklist (PDF), chương trình
    const aid = rows(env, 'Audits')[0].audit_id;
    await go(page, '#/audit/' + aid);
    await page.waitForSelector('.aud-prints .rp-link[data-form="PLAN"]');
    await page.click('.aud-prints .rp-link[data-form="PLAN"]');
    await page.waitForFunction(() => /KẾ HOẠCH ĐÁNH GIÁ NỘI BỘ/.test(document.querySelector('.rp-paper') && document.querySelector('.rp-paper').textContent), null, { timeout: 20000 });
    let paper = await page.textContent('.rp-paper');
    for (const s of ['BM-ISO-03-02', 'DG-26-01', 'Nguyễn Văn A', 'Trưởng đoàn đánh giá', 'Đại diện bộ phận được đánh giá', 'Chuẩn mực đánh giá']) assert.ok(paper.includes(s), s);
    await page.selectOption('#rf-aform', 'CHECKLIST');
    await page.click('#rp-run');
    await page.waitForFunction(() => /CHECKLIST ĐÁNH GIÁ NỘI BỘ/.test(document.querySelector('.rp-paper') && document.querySelector('.rp-paper').textContent));
    paper = await page.textContent('.rp-paper');
    assert.ok(paper.includes('BM-ISO-03-03'));
    assert.ok(paper.includes('Máy nén khí số 2 quá hạn bảo trì'));
    await page.click('#rp-pdf');
    const pdf = await grabFile(page);
    assert.equal(pdf.name, 'BC-2611-001_checklist-danh-gia_DG-26-01.pdf');
    const pid = rows(env, 'AuditPrograms')[0].program_id;
    await page.selectOption('#rf-aud', 'P:' + pid);
    await page.click('#rp-run');
    await page.waitForFunction(() => /CHƯƠNG TRÌNH ĐÁNH GIÁ NỘI BỘ/.test(document.querySelector('.rp-paper') && document.querySelector('.rp-paper').textContent));
    paper = await page.textContent('.rp-paper');
    for (const s of ['BM-ISO-03-01', 'Lịch đánh giá', 'Phủ điều khoản ISO 9001', 'Phủ chủ đề BRCGS Packaging', 'Ngoài phạm vi áp dụng (Cơ điện)']) assert.ok(paper.includes(s), s);
    assert.deepEqual(await noRawKeys(page), []);
    // 11. Trạng thái hệ thống
    await go(page, '#/admin/status');
    await page.waitForFunction(() => /Đánh giá nội bộ/.test(document.body.textContent) && /DG-26 Đã duyệt lần 01 · 1 đợt · phủ ISO 9001 11\/11 · BRCGS 6\/6/.test(document.body.textContent), null, { timeout: 20000 });
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('web: Đánh giá viên của bộ phận được đánh giá bị chặn ngay; Đánh giá viên bộ phận khác làm trưởng đoàn → menu, Chờ bạn xử lý, checklist, chốt, bắt đầu, ghi kết quả, Excel; nhân viên SX thấy chương trình, không thấy đợt', async () => {
  const env = realLike();
  addUser(env, 'AUDCD', 2, '583932', { depts: 'CĐ', auditor: true });
  addUser(env, 'AUDCL', 2, '583931', { depts: 'CL', auditor: true });
  addUser(env, 'SX2', 2, '583921', { depts: 'SX' });
  // Chương trình đã duyệt sẵn (qua API, Thư ký ISO cấp 4): một đợt hôm nay phủ mọi điều khoản mẫu
  const tk = makeClient(env);
  assert.equal(tk.login('TK', '583922').ok, true);
  const pid = uuid(), aid = uuid();
  assert.equal(tk.write('iaudit.program.save', { program_id: pid, year: 2026 }).ok, true);
  env.g.dbReset_();
  const all = env.g.readRows_('Clauses').map((c) => c.clause_id);
  assert.equal(tk.write('iaudit.save', { audit_id: aid, program_id: pid, dept_code: 'CĐ', plan_month: '2026-11', title_vi: 'Quản lý thiết bị đo', clauses: all, audit_date: '2026-11-12' }).ok, true);
  const ver = (sheet, key, id) => { env.g.dbReset_(); return env.g.readRows_(sheet).find((x) => x[key] === id).record_version; };
  assert.equal(tk.write('iaudit.program.submit', { program_id: pid }, { expected_version: ver('AuditPrograms', 'program_id', pid) }).ok, true);
  assert.equal(tk.pin('583922').ok, true);
  assert.equal(tk.write('iaudit.program.approve', { program_id: pid }, { expected_version: ver('AuditPrograms', 'program_id', pid) }).ok, true);
  const app = await openApp({ env, ...WEB, now: NOW });
  try {
    const { page } = app;
    await login(page, 'TK', '583922');
    await page.click('.side-item[data-nav="audits"]');
    await page.waitForSelector('.aud-row');
    await page.click('.aud-row');
    await page.waitForSelector('#aud-edit');
    await page.click('#aud-edit');
    await page.waitForSelector('.aud-member');
    const audcd = rows(env, 'Users').find((u) => u.employee_code === 'AUDCD').user_id;
    const audcl = rows(env, 'Users').find((u) => u.employee_code === 'AUDCL').user_id;
    // Ô chọn chỉ có Đánh giá viên / Thư ký / Quản trị (không có SX2)
    const opts = await page.locator('.aud-member [data-k="u"] option').allTextContents();
    assert.ok(opts.some((x) => /AUDCD/.test(x)) && opts.some((x) => /AUDCL/.test(x)) && !opts.some((x) => /SX2/.test(x)), opts.join('|'));
    await page.selectOption('.aud-member [data-k="u"]', audcd);
    assert.equal(await page.inputValue('.aud-member [data-k="d"]'), 'CĐ', 'bộ phận công tác điền theo người dùng');
    await page.click('#af-save');
    await page.waitForFunction(() => /không đánh giá bộ phận của chính mình/.test(document.querySelector('[data-field="team"]').textContent));
    await page.selectOption('.aud-member [data-k="u"]', audcl);
    await page.click('#af-save');
    await page.waitForSelector('.item.aud');
    assert.match(await page.textContent('.aud-plan'), /AUDCL/);
    assert.equal(rows(env, 'Audits')[0].lead_user_id, audcl);
    await app.close();
    // Trưởng đoàn (Đánh giá viên CL, cấp 2)
    const app2 = await openApp({ env, ...WEB, now: NOW, hash: '' });
    try {
      const p2 = app2.page;
      await login(p2, 'AUDCL', '583931');
      assert.match(await p2.textContent('.pend-card'), /1 đợt đánh giá nội bộ trong 7 ngày tới/);
      await p2.click('.side-item[data-nav="audits"]');
      await p2.waitForSelector('.aud-row');
      assert.equal(await p2.locator('#aud-add').count(), 0, 'không phải Thư ký: không thêm đợt');
      await p2.click('.aud-row');
      await p2.waitForSelector('#aud-check-add');
      await p2.click('#aud-check-add');
      await p2.waitForSelector('.modal #ck-vi');
      await p2.fill('.modal #ck-vi', 'Dụng cụ đo có tem hiệu chuẩn còn hạn?');
      await p2.fill('.modal #ck-zh', '量具是否有有效的校准标签？');
      await modalPrimary(p2);
      await p2.waitForSelector('.aud-check');
      await p2.click('#aud-ready');
      await p2.waitForSelector('#aud-start:not([disabled])');
      await p2.click('#aud-start');
      await p2.waitForSelector('[data-rec]');
      await p2.click('[data-rec]');
      await p2.waitForSelector('.modal #rc-res');
      await p2.click('.modal [data-res="OBS"]');
      await p2.fill('.modal #rc-vi', '2 đồng hồ áp suất tem hết hạn tháng 10');
      await modalPrimary(p2);
      await p2.waitForSelector('.aud-check:has-text("Cần cải tiến")');
      await p2.click('.aud-prints .rp-link[data-form="CHECKLIST"]');
      await p2.waitForSelector('.rp-paper');
      await p2.click('#rp-xlsx');
      const xl = await grabFile(p2);
      assert.equal(xl.name, 'BC-2611-001_checklist-danh-gia_DG-26-01.xlsx');
      const X = xlsx();
      const wb = X.read(xl.buf, { type: 'buffer' });
      const csv = X.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
      for (const t of ['CHECKLIST ĐÁNH GIÁ NỘI BỘ', 'BM-ISO-03-03', 'Dụng cụ đo có tem hiệu chuẩn', 'Cần cải tiến', '2 đồng hồ áp suất']) assert.ok(csv.includes(t), t);
      await p2.screenshot({ path: path.join(SHOTS, 'aud-checklist-web.png'), fullPage: true });
      assert.deepEqual(await noRawKeys(p2), []);
      assert.deepEqual(app2.consoleErrors, []);
    } finally { await app2.close(); }
    // Nhân viên SX: thấy chương trình, không thấy đợt của CĐ
    const app3 = await openApp({ env, ...WEB, now: NOW, hash: '' });
    try {
      const p3 = app3.page;
      await login(p3, 'SX2', '583921');
      await p3.click('.side-item[data-nav="audits"]');
      await p3.waitForSelector('.aud-prog .item-head');
      assert.equal(await p3.locator('.aud-row').count(), 0);
      assert.equal(await p3.locator('#aud-submit, #aud-approve, #aud-reopen, #aud-prog-cancel').count(), 0);
      assert.deepEqual(app3.consoleErrors, []);
    } finally { await app3.close(); }
  } finally { await app.close().catch(() => {}); }
});

test('app 4a với máy chủ 3c (chưa dán Code.gs 4a): ô Đánh giá nội bộ "Sắp có", màn báo cần cập nhật máy chủ, Báo cáo không có loại Đánh giá nội bộ', async () => {
  const env = realLike();
  Object.keys(env.g.HANDLERS_).filter((k) => /^iaudit\./.test(k)).forEach((k) => { delete env.g.HANDLERS_[k]; });
  const app = await openApp({ env, ...IPHONE, now: NOW });
  try {
    const { page } = app;
    await login(page, 'TK', '583922');
    assert.equal(await page.locator('.grid9 .tile.soon[href="#/audits"]').count(), 1);
    await go(page, '#/audits');
    await page.waitForFunction(() => /Máy chủ chưa lên bản 4a/.test(document.body.textContent));
    await go(page, '#/reports');
    await page.waitForSelector('.rp-list');
    assert.equal(await page.locator('.rp-item[data-kind="AUDIT"]').count(), 0);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('đúng các bước "Nên kiểm" của HUONG_DAN 4a: Trạng thái hệ thống "Chưa có chương trình năm 2026" → lập chương trình → thêm đợt tháng 12 → In chương trình năm → PDF → Hủy chương trình (PIN) → lập lại được', async () => {
  const env = realLike();
  const app = await openApp({ env, ...IPHONE, now: NOW });
  try {
    const { page } = app;
    await login(page, 'TK', '583922');
    await go(page, '#/admin/status');
    await page.waitForFunction(() => /Chưa có chương trình năm 2026/.test(document.body.textContent), null, { timeout: 20000 });
    assert.match(await page.textContent('.view'), /1\.0\.13/);
    await go(page, '#/');
    await page.waitForSelector('.grid9 .tile[href="#/audits"]');
    await page.click('.grid9 .tile[href="#/audits"]');
    await page.click('#aud-prog-new');
    await page.waitForSelector('#pf-save');
    await page.click('#pf-save');
    await page.waitForSelector('#aud-add');
    await page.click('#aud-add');
    await page.waitForSelector('form.aud-form');
    await page.selectOption('#f-plan_month', '2026-12');
    await page.fill('#f-title_vi', 'Đợt thử');
    await page.locator('.aud-cl input').first().check();
    await page.click('#af-save');
    await page.waitForSelector('.aud-list .aud-row');
    await page.click('.aud-prints .rp-link[data-form="PROGRAM"]');
    await page.waitForFunction(() => /CHƯƠNG TRÌNH ĐÁNH GIÁ NỘI BỘ/.test(document.querySelector('.rp-paper') && document.querySelector('.rp-paper').textContent), null, { timeout: 20000 });
    const paper = await page.textContent('.rp-paper');
    for (const s of ['BM-ISO-03-01', 'Lịch đánh giá', 'Phủ điều khoản ISO 9001', 'Phủ chủ đề BRCGS Packaging', 'Đợt thử']) assert.ok(paper.includes(s), s);
    await page.click('#rp-pdf');
    const pdf = await grabFile(page);
    assert.equal(pdf.name, 'BC-2611-001_chuong-trinh-danh-gia-noi-bo_DG-26.pdf');
    await go(page, '#/audits');
    await page.waitForSelector('#aud-prog-cancel');
    await page.click('#aud-prog-cancel');
    await page.waitForSelector('.modal #dlg-text');
    await page.fill('.modal #dlg-text', 'Dữ liệu thử');
    await modalPrimary(page);
    await answerPin(page, '583922');
    await page.waitForSelector('#aud-prog-new');
    assert.match(await page.textContent('#view'), /DG-26 đã hủy: Dữ liệu thử/);
    assert.equal(rows(env, 'AuditPrograms')[0].state, 'CANCELLED');
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});
