// Phát hiện đánh giá, báo cáo đánh giá, đóng đợt trên giao diện (Đợt 4, phiên 4b — NC lớn · NC nhỏ · Cần cải tiến; đóng đợt khi phiếu khắc
// phục đã đóng; phạm vi Cơ điện).
// Test 1 (iPhone, như app thật: owner + Thư ký ISO cấp 4; đợt DG-26-01 đang đánh giá, trưởng đoàn ngoài app): Ghi phát hiện từ câu Không phù
// hợp (điền sẵn, đổi NC lớn) → Gửi báo cáo khi còn câu chưa ghi → nhắc → ghi nốt → thiếu phát hiện câu Cần cải tiến → nhắc → ghi → Gửi báo
// cáo (kết luận bắt buộc) → Lập phiếu khắc phục từ phát hiện (điền sẵn, nguồn Đánh giá) → quay lại đợt (KP-…, Đóng đợt khóa) → In báo cáo
// BM-ISO-03-04 (PDF) → phiếu khắc phục đóng → Chờ bạn xử lý "đủ điều kiện đóng" → Đóng đợt (PIN) → Trạng thái hệ thống.
// Test 2 (web, quyền): thành viên đoàn ghi phát hiện nhưng không có nút Gửi báo cáo; trưởng đoàn gửi; nhân viên bộ phận được đánh giá thấy Chờ
// bạn xử lý "phát hiện cần lập phiếu khắc phục", lập phiếu; bộ phận khác không thấy đợt; Excel báo cáo đánh giá.
// Test 3: app 4b với máy chủ 4a (chưa dán Code.gs 4b): không có thẻ Phát hiện, vẫn ghi kết quả được.
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
const ver = (env, sheet, key, id) => rows(env, sheet).find((x) => x[key] === id).record_version;

/** Qua API: chương trình 2026 đã duyệt, đợt DG-26-01 (CĐ) hôm nay, 4 câu hỏi, đang đánh giá; team: [{u|n, r}]. Trả {aid, q} */
function auditInProgress(env, team, results = {}) {
  const tk = makeClient(env);
  assert.equal(tk.login('TK', TK_PIN).ok, true);
  const pid = uuid(), aid = uuid();
  assert.equal(tk.write('iaudit.program.save', { program_id: pid, year: 2026, stds: ['ISO9001', 'BRC'] }).ok, true);
  env.g.dbReset_();
  const all = env.g.readRows_('Clauses').filter((c) => c.std === 'ISO9001' || c.std === 'BRC').map((c) => c.clause_id);
  let r = tk.write('iaudit.save', { audit_id: aid, program_id: pid, dept_code: 'CĐ', plan_month: '2026-11', title_vi: 'Bảo trì, sửa chữa thiết bị', clauses: all,
    audit_date: '2026-11-12', auditee_text: 'Trưởng bộ phận Cơ điện', team });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(tk.write('iaudit.program.submit', { program_id: pid }, { expected_version: ver(env, 'AuditPrograms', 'program_id', pid) }).ok, true);
  assert.equal(tk.pin(TK_PIN).ok, true);
  assert.equal(tk.write('iaudit.program.approve', { program_id: pid }, { expected_version: ver(env, 'AuditPrograms', 'program_id', pid) }).ok, true);
  const q = [uuid(), uuid(), uuid(), uuid()];
  r = tk.write('iaudit.check.add', { audit_id: aid, lines: [
    { check_id: q[0], clause_id: 'ISO9001|7.1.3', question_vi: 'Thiết bị được bảo trì đúng kế hoạch?', question_zh: '设备是否按计划维护？' },
    { check_id: q[1], clause_id: 'ISO9001|7.1.5', question_vi: 'Dụng cụ đo còn hạn hiệu chuẩn?', question_zh: '测量器具是否在校准有效期内？' },
    { check_id: q[2], clause_id: 'ISO9001|7.2', question_vi: 'Thợ cơ điện được đào tạo?', question_zh: '机电人员是否经过培训？' },
    { check_id: q[3], clause_id: '', question_vi: 'Hồ sơ lưu đúng nơi?', question_zh: '记录是否按规定存放？' }] });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(tk.write('iaudit.ready', { audit_id: aid }, { expected_version: ver(env, 'Audits', 'audit_id', aid) }).ok, true);
  assert.equal(tk.write('iaudit.start', { audit_id: aid }, { expected_version: ver(env, 'Audits', 'audit_id', aid) }).ok, true);
  for (const [i, res] of Object.entries(results)) {
    r = tk.write('iaudit.check.record', { check_id: q[i], result: res[0], evidence_vi: res[1] || '' }, { expected_version: ver(env, 'AuditChecks', 'check_id', q[i]) });
    assert.equal(r.ok, true, JSON.stringify(r));
  }
  return { aid, q, tk };
}
/** Qua API: đóng phiếu khắc phục (nguyên nhân, hành động xong, gửi kiểm tra, Quản trị kiểm tra Có hiệu lực) */
function closeCapaApi(env, capaId) {
  const own = makeClient(env);
  assert.equal(own.login('TK', TK_PIN).ok, true);
  let r = own.write('capa.save', { capa_id: capaId, cause_vi: 'Chưa có người thay khi thợ nghỉ' }, { expected_version: ver(env, 'Capas', 'capa_id', capaId) });
  assert.equal(r.ok, true, JSON.stringify(r));
  const act = uuid();
  assert.equal(own.write('capa.action.save', { action_id: act, capa_id: capaId, content_vi: 'Phân công người thay', due_date: '2026-11-20' }).ok, true);
  assert.equal(own.write('capa.action.done', { action_id: act, done_date: '2026-11-12', result_vi: 'Đã phân công' }, { expected_version: ver(env, 'CapaActions', 'action_id', act) }).ok, true);
  assert.equal(own.write('capa.complete', { capa_id: capaId, verify_due: '2026-11-12' }, { expected_version: ver(env, 'Capas', 'capa_id', capaId) }).ok, true);
  assert.equal(own.pin(TK_PIN).ok, true);
  r = own.write('capa.verify', { capa_id: capaId, result: 'EFFECTIVE', note_vi: 'Sổ tháng 11 đủ' }, { expected_version: ver(env, 'Capas', 'capa_id', capaId) });
  assert.equal(r.ok, true, JSON.stringify(r));
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
  const raw = txt.match(/\b(?:aud|nav|tile|rpt|rp|home|capa|health)\.[a-z_]+[A-Za-z_0-9.]*\b/g);
  return raw ? [...new Set(raw)] : [];
}
const modalPrimary = (page) => page.locator('.modal').last().locator('.modal-actions .btn.primary').click();
async function grabFile(page) {
  await page.waitForSelector('.modal #of-open', { timeout: 30000 });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.modal #of-open')]);
  const buf = fs.readFileSync(await dl.path());
  await page.locator('.modal .modal-actions .btn').click();
  return { name: dl.suggestedFilename(), buf };
}
const bodyHas = (page, re) => page.waitForFunction((src) => new RegExp(src).test(document.body.textContent), re.source, { timeout: 20000 });

test('iPhone: Ghi phát hiện từ câu (NC lớn) → Gửi báo cáo (nhắc câu chưa ghi, câu thiếu phát hiện, kết luận) → Lập phiếu khắc phục từ phát hiện → In báo cáo BM-ISO-03-04 → phiếu đóng → Đóng đợt (PIN) → Trạng thái hệ thống', async () => {
  const env = realLike();
  const { aid, q } = auditInProgress(env, [{ n: 'Nguyễn Văn A', d: 'CL', r: 'L' }],
    { 0: ['NC', 'Sổ bảo trì tháng 10 thiếu 2 lần bảo dưỡng máy nén khí'], 1: ['OBS', 'Nhãn hiệu chuẩn mờ'], 2: ['C'] });
  const app = await openApp({ env, ...IPHONE, now: NOW });
  try {
    const { page } = app;
    await login(page, 'TK', TK_PIN);
    // 1. Trang chủ → Đánh giá nội bộ → DG-26-01 (Đang đánh giá)
    await page.click('.grid9 .tile[href="#/audits"]');
    await page.waitForSelector('.aud-row');
    await page.click('.aud-row');
    await page.waitForSelector('.item.aud .item-head:has-text("Đang đánh giá")');
    assert.match(await page.textContent('.item.aud .item-head'), /Ghi phát hiện; xong thì Gửi báo cáo đánh giá/);
    assert.equal(await page.locator('.aud-findings').count(), 1);
    assert.equal(await page.locator('[data-fck]').count(), 2, 'câu Không phù hợp và Cần cải tiến có nút Ghi phát hiện');
    // 2. Ghi phát hiện từ câu 1: điền sẵn loại NC nhỏ, nội dung "Chưa đáp ứng: …", bằng chứng của câu → đổi NC lớn → Lưu
    await page.click(`[data-fck="${q[0]}"]`);
    await page.waitForSelector('.modal #fd-type');
    assert.equal(await page.inputValue('.modal #fd-ck'), q[0]);
    assert.equal(await page.getAttribute('.modal [data-ft].on', 'data-ft'), 'MINOR');
    assert.match(await page.inputValue('.modal #fd-vi'), /^Chưa đáp ứng: Thiết bị được bảo trì đúng kế hoạch\?/);
    assert.match(await page.inputValue('.modal #fd-zh'), /^未满足：设备是否按计划维护？/);
    assert.equal(await page.inputValue('.modal #fd-evi'), 'Sổ bảo trì tháng 10 thiếu 2 lần bảo dưỡng máy nén khí');
    assert.equal(await page.inputValue('.modal #fd-cl'), 'ISO9001|7.1.3');
    await page.click('.modal [data-ft="MAJOR"]');
    await modalPrimary(page);
    await page.waitForSelector('.aud-find:has-text("DG-26-01/01")');
    assert.match(await page.textContent('.aud-find'), /Không phù hợp lớn/);
    assert.match(await page.textContent(`.aud-check:has([data-rec="${q[0]}"])`), /Phát hiện.*DG-26-01\/01/s);
    let f = rows(env, 'AuditFindings');
    assert.equal(f.length, 1);
    assert.equal(f[0].ftype, 'MAJOR');
    assert.equal(f[0].check_id, q[0]);
    // 3. Gửi báo cáo khi câu 4 chưa ghi kết quả → nhắc
    await page.click('#aud-report');
    await bodyHas(page, /Còn 1 câu hỏi chưa ghi kết quả/);
    // 4. Ghi câu 4 → Gửi báo cáo khi câu 2 (Cần cải tiến) chưa có phát hiện → nhắc
    await page.click(`[data-rec="${q[3]}"]`);
    await page.waitForSelector('.modal #rc-res');
    await page.click('.modal [data-res="C"]');
    await modalPrimary(page);
    await page.waitForFunction(() => /đã ghi 4\/4/.test(document.querySelector('.aud-checks').textContent));
    assert.match(await page.textContent('.aud-fnd-missing'), /1 câu Không phù hợp \/ Cần cải tiến chưa ghi phát hiện \(câu 2\)/);
    await page.click('#aud-report');
    await bodyHas(page, /chưa ghi phát hiện \(câu 2\)/);
    // 5. Ghi phát hiện câu 2: loại Cần cải tiến
    await page.click(`[data-fck="${q[1]}"]`);
    await page.waitForSelector('.modal #fd-type');
    assert.equal(await page.getAttribute('.modal [data-ft].on', 'data-ft'), 'OBS');
    await page.click('.modal [data-ft="MINOR"]');
    await modalPrimary(page);
    await bodyHas(page, /Câu Không phù hợp → Không phù hợp lớn \/ nhỏ; câu Cần cải tiến → Cần cải tiến/);
    await page.click('.modal [data-ft="OBS"]');
    await modalPrimary(page);
    await page.waitForSelector('.aud-find:has-text("DG-26-01/02")');
    assert.equal(await page.locator('.aud-fnd-missing').count(), 0);
    assert.ok(await noOverflow(page));
    await page.screenshot({ path: path.join(SHOTS, 'aud-findings-iphone.png'), fullPage: true });
    // 6. Gửi báo cáo: chưa ghi kết luận → nhắc; ghi → Đã báo cáo
    await page.click('#aud-report');
    await page.waitForSelector('.modal #rp-date');
    assert.match(await page.textContent('.modal'), /1 không phù hợp lớn · 0 không phù hợp nhỏ · 1 cần cải tiến/);
    assert.equal(await page.inputValue('.modal #rp-date'), '2026-11-12');
    await modalPrimary(page);
    await bodyHas(page, /Ghi kết luận đánh giá/);
    await page.waitForSelector('.modal #rp-vi');
    await page.fill('.modal #rp-svi', 'Sổ giao ca cơ điện ghi đầy đủ');
    await page.fill('.modal #rp-vi', 'Hệ thống bảo trì cơ bản phù hợp; cần khắc phục việc bảo trì máy nén khí (thử)');
    await modalPrimary(page);
    await page.waitForSelector('.item.aud .item-head:has-text("Đã báo cáo")');
    assert.match(await page.textContent('.aud-report-view'), /Hệ thống bảo trì cơ bản phù hợp/);
    assert.equal(await page.locator('[data-fed]').count(), 0, 'phát hiện khóa sau báo cáo');
    assert.equal(await page.locator('#aud-unreport').count(), 1);
    assert.equal(await page.locator('#aud-close[disabled]').count(), 1);
    assert.match(await page.textContent('.aud-close-wait'), /còn 1 phát hiện chưa có phiếu · 0 phiếu chưa đóng/);
    // Chờ bạn xử lý: phát hiện cần lập phiếu khắc phục
    await go(page, '#/');
    await page.waitForSelector('.pend-card');
    assert.match(await page.textContent('.pend-card'), /1 phát hiện đánh giá cần lập phiếu khắc phục/);
    await page.click('.pend-row:has-text("phát hiện đánh giá cần lập phiếu khắc phục")');
    await page.waitForSelector('.item.aud .item-head:has-text("Đã báo cáo")');
    // 7. Lập phiếu khắc phục từ phát hiện DG-26-01/01 (điền sẵn)
    await page.click('.aud-find:has-text("DG-26-01/01") [data-capa]');
    await page.waitForSelector('form.capa-form');
    assert.match(await page.textContent('.capa-from-finding'), /Đánh giá.*DG-26-01\/01.*Không phù hợp lớn/s);
    assert.equal(await page.locator('[data-src]').count(), 0, 'không chọn nguồn tay');
    assert.equal(await page.locator('[data-chips="kind"]').count(), 0);
    assert.equal(await page.inputValue('#f-dept_code'), 'CĐ');
    assert.equal(await page.inputValue('#f-ref_text'), 'DG-26-01/01');
    assert.equal(await page.inputValue('#f-found_by_name'), 'Nguyễn Văn A');
    assert.equal(await page.inputValue('#f-found_date'), '2026-11-12');
    assert.match(await page.inputValue('#f-title_vi'), /Phát hiện đánh giá DG-26-01\/01 — Không phù hợp lớn/);
    assert.match(await page.inputValue('#f-problem_vi'), /^Chưa đáp ứng: Thiết bị được bảo trì đúng kế hoạch\?\nBằng chứng: Sổ bảo trì tháng 10/);
    assert.ok(await noOverflow(page));
    await page.click('#capa-save');
    await page.waitForSelector('.item.capa');
    assert.equal((await page.textContent('.item.capa .code.big')).trim(), 'KP-2611-001');
    const capaRow = rows(env, 'Capas')[0];
    assert.equal(capaRow.source, 'AUDIT');
    assert.equal(capaRow.finding_id, f[0].finding_id);
    // 8. Quay lại đợt qua link: phát hiện có KP-2611-001, không rút báo cáo, Đóng đợt còn khóa
    await page.click('#capa-finding-link');
    await page.waitForSelector('.aud-find:has-text("KP-2611-001")');
    assert.match(await page.textContent('.aud-find:has-text("DG-26-01/01")'), /KP-2611-001.*Đang xử lý/s);
    assert.match(await page.textContent('.aud-find:has-text("DG-26-01/02")'), /Phiếu khắc phục: tùy chọn/);
    assert.equal(await page.locator('#aud-unreport').count(), 0);
    assert.match(await page.textContent('.aud-close-wait'), /còn 0 phát hiện chưa có phiếu · 1 phiếu chưa đóng/);
    // 9. In báo cáo đánh giá BM-ISO-03-04 → PDF
    await page.click('.aud-prints .rp-link[data-form="REPORT"]');
    await page.waitForFunction(() => /BÁO CÁO ĐÁNH GIÁ NỘI BỘ/.test(document.querySelector('.rp-paper') && document.querySelector('.rp-paper').textContent), null, { timeout: 20000 });
    const paper = await page.textContent('.rp-paper');
    for (const s of ['BM-ISO-03-04', 'DG-26-01/01', 'DG-26-01/02', 'KP-2611-001', 'Kết luận đánh giá', 'Hệ thống bảo trì cơ bản phù hợp', 'Sổ giao ca cơ điện ghi đầy đủ',
      'Trưởng đoàn đánh giá', 'Đại diện bộ phận được đánh giá', 'Thư ký ISO']) assert.ok(paper.includes(s), s);
    assert.equal(await page.inputValue('#rf-aform'), 'REPORT');
    assert.deepEqual(await noRawKeys(page), []);
    await page.click('#rp-pdf');
    const pdf = await grabFile(page);
    assert.equal(pdf.name, 'BC-2611-001_bao-cao-danh-gia_DG-26-01.pdf');
    await page.screenshot({ path: path.join(SHOTS, 'aud-report-iphone.png'), fullPage: true });
    // 10. Phiếu khắc phục đóng (qua API) → Chờ bạn xử lý "đủ điều kiện đóng" → Đóng đợt (PIN)
    closeCapaApi(env, capaRow.capa_id);
    await go(page, '#/');
    await page.waitForSelector('.grid9');
    await page.reload(); // mở lại app → đồng bộ thay đổi
    await page.waitForSelector('#upin, .grid9', { timeout: 20000 });
    if (await page.locator('#upin').count()) await page.fill('#upin', TK_PIN);
    await page.waitForSelector('.grid9', { timeout: 20000 });
    await page.waitForSelector('.pend-card');
    await page.waitForFunction(() => /1 đợt đánh giá nội bộ đủ điều kiện đóng/.test(document.querySelector('.pend-card').textContent), null, { timeout: 20000 });
    await page.click('.pend-row:has-text("đủ điều kiện đóng")');
    await page.waitForSelector('#aud-close:not([disabled])');
    assert.match(await page.textContent('.aud-find:has-text("DG-26-01/01")'), /KP-2611-001.*Đã đóng/s);
    await page.click('#aud-close');
    await page.waitForSelector('.modal #dlg-text');
    await page.fill('.modal #dlg-text', 'Đã kiểm tra phiếu KP-2611-001');
    await modalPrimary(page);
    await answerPin(page, TK_PIN);
    await page.waitForSelector('.item.aud .item-head .banner.ok');
    assert.match(await page.textContent('.item.aud .item-head'), /Đã đóng đợt ngày 12\/11\/2026 — TK/);
    assert.match(await page.textContent('.aud-report-view'), /Đã kiểm tra phiếu KP-2611-001/);
    const a = rows(env, 'Audits').find((x) => x.audit_id === aid);
    assert.equal(a.state, 'CLOSED');
    // 11. Trạng thái hệ thống
    await go(page, '#/admin/status');
    await page.waitForFunction(() => /đã báo cáo chờ đóng 0 · đã đóng 1 · phát hiện không phù hợp chưa có phiếu khắc phục 0/.test(document.body.textContent), null, { timeout: 20000 });
    assert.match(await page.textContent('#view'), /1\.0\.14/);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('web: thành viên đoàn ghi phát hiện, không có nút Gửi báo cáo; trưởng đoàn gửi; nhân viên bộ phận được đánh giá thấy Chờ bạn xử lý, lập phiếu khắc phục; bộ phận khác không thấy; Excel báo cáo đánh giá', async () => {
  const env = realLike();
  addUser(env, 'AUDCL', 2, '583931', { depts: 'CL', auditor: true });
  addUser(env, 'AUDKV', 2, '583933', { depts: 'KV', auditor: true });
  addUser(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  addUser(env, 'SX2', 2, '583921', { depts: 'SX' });
  env.g.dbReset_();
  const uid = (code) => rows(env, 'Users').find((u) => u.employee_code === code).user_id;
  const { aid, q } = auditInProgress(env, [{ u: uid('AUDCL'), r: 'L' }, { u: uid('AUDKV'), r: 'M' }],
    { 0: ['NC', 'Máy nén khí số 2 quá hạn bảo trì'], 1: ['C'], 2: ['C'], 3: ['C'] });
  // Thành viên đoàn: ghi phát hiện nhập tay (gắn câu 1 qua ô chọn), không gửi báo cáo được
  let app = await openApp({ env, ...WEB, now: NOW });
  try {
    const { page } = app;
    await login(page, 'AUDKV', '583933');
    await page.click('.side-item[data-nav="audits"]');
    await page.waitForSelector('.aud-row');
    await page.click('.aud-row');
    await page.waitForSelector('#aud-fnd-add');
    assert.equal(await page.locator('#aud-report').count(), 0, 'thành viên không gửi báo cáo');
    await page.click('#aud-fnd-add');
    await page.waitForSelector('.modal #fd-ck');
    assert.equal(await page.locator('.modal [data-ft].on').count(), 0);
    await page.selectOption('.modal #fd-ck', q[0]);
    assert.equal(await page.getAttribute('.modal [data-ft].on', 'data-ft'), 'MINOR', 'chọn câu → điền loại');
    assert.equal(await page.inputValue('.modal #fd-evi'), 'Máy nén khí số 2 quá hạn bảo trì');
    await modalPrimary(page);
    await page.waitForSelector('.aud-find:has-text("DG-26-01/01")');
    assert.ok(await noOverflow(page));
    await page.screenshot({ path: path.join(SHOTS, 'aud-findings-web.png'), fullPage: true });
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
  // Trưởng đoàn gửi báo cáo
  app = await openApp({ env, ...WEB, now: NOW });
  try {
    const { page } = app;
    await login(page, 'AUDCL', '583931');
    await go(page, '#/audit/' + aid);
    await page.waitForSelector('#aud-report');
    await page.click('#aud-report');
    await page.waitForSelector('.modal #rp-vi');
    await page.fill('.modal #rp-zh', '基本符合');
    await modalPrimary(page);
    await page.waitForSelector('.item.aud .item-head:has-text("Đã báo cáo")');
    assert.equal(await page.locator('[data-capa]').count(), 0, 'trưởng đoàn bộ phận CL không lập phiếu cho CĐ');
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
  // Nhân viên CĐ (bộ phận được đánh giá): Chờ bạn xử lý → lập phiếu khắc phục
  app = await openApp({ env, ...WEB, now: NOW });
  try {
    const { page } = app;
    await login(page, 'CD2', '583920');
    await page.waitForSelector('.pend-card');
    assert.match(await page.textContent('.pend-card'), /1 phát hiện đánh giá cần lập phiếu khắc phục/);
    await page.click('.pend-row:has-text("phát hiện đánh giá cần lập phiếu khắc phục")');
    await page.waitForSelector('[data-capa]');
    assert.match(await page.textContent('.aud-report-view'), /基本符合/);
    await page.click('[data-capa]');
    await page.waitForSelector('form.capa-form');
    await page.click('#capa-save');
    await page.waitForSelector('.item.capa');
    assert.match(await page.textContent('.item.capa'), /Từ phát hiện đánh giá nội bộ.*DG-26-01\/01/s);
    // Báo cáo → Đánh giá nội bộ → Báo cáo đánh giá → Excel
    await go(page, '#/audit/' + aid);
    await page.waitForSelector('.aud-prints .rp-link[data-form="REPORT"]');
    await page.click('.aud-prints .rp-link[data-form="REPORT"]');
    await page.waitForFunction(() => /BÁO CÁO ĐÁNH GIÁ NỘI BỘ/.test(document.querySelector('.rp-paper') && document.querySelector('.rp-paper').textContent), null, { timeout: 20000 });
    await page.click('#rp-xlsx');
    const x = await grabFile(page);
    assert.equal(x.name, 'BC-2611-001_bao-cao-danh-gia_DG-26-01.xlsx');
    const X = xlsx();
    const wb = X.read(x.buf, { type: 'buffer' });
    const txt = X.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
    for (const s of ['BÁO CÁO ĐÁNH GIÁ NỘI BỘ', 'DG-26-01/01', 'KP-2611-001', 'Không phù hợp nhỏ']) assert.ok(txt.includes(s), s);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
  // Bộ phận khác: không thấy đợt
  app = await openApp({ env, ...WEB, now: NOW });
  try {
    const { page } = app;
    await login(page, 'SX2', '583921');
    await go(page, '#/audit/' + aid);
    await bodyHas(page, /Không tìm thấy chương trình \/ đợt đánh giá trên máy/);
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});

test('app 4b với máy chủ 4a (chưa dán Code.gs 4b): không có thẻ Phát hiện, nút Gửi báo cáo; ghi kết quả vẫn được', async () => {
  const env = realLike();
  const { q } = auditInProgress(env, [{ n: 'Nguyễn Văn A', d: 'CL', r: 'L' }], { 0: ['C'] });
  ['iaudit.finding.save', 'iaudit.report', 'iaudit.close'].forEach((k) => { delete env.g.HANDLERS_[k]; });
  const app = await openApp({ env, ...IPHONE, now: NOW });
  try {
    const { page } = app;
    await login(page, 'TK', TK_PIN);
    await page.click('.grid9 .tile[href="#/audits"]');
    await page.waitForSelector('.aud-row');
    await page.click('.aud-row');
    await page.waitForSelector('.item.aud .item-head:has-text("Đang đánh giá")');
    assert.equal(await page.locator('.aud-findings').count(), 0);
    assert.equal(await page.locator('#aud-report').count(), 0);
    assert.equal(await page.locator('[data-fck]').count(), 0);
    await page.click(`[data-rec="${q[1]}"]`);
    await page.waitForSelector('.modal #rc-res');
    await page.click('.modal [data-res="C"]');
    await modalPrimary(page);
    await page.waitForFunction(() => /đã ghi 2\/4/.test(document.querySelector('.aud-checks').textContent));
    assert.deepEqual(app.consoleErrors, []);
  } finally { await app.close(); }
});
