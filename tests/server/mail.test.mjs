// Gmail nhắc hạn (Đợt 2, phiên 2b): email người nhận do Quản trị xác nhận; tóm tắt hồ sơ quá hạn sáng thứ Hai → trưởng bộ phận
// (không có → Thư ký ISO); rà soát 30/7/0 ngày, quá hạn mỗi 7 ngày → người phụ trách + Thư ký ISO; phiên bản chờ quá 3 ngày → người
// duyệt / Thư ký ISO mỗi ngày làm việc; chống gửi trùng; người chính chưa có email → Thư ký ISO thay; hạn mức Gmail dùng chung (dừng
// khi còn ≤ mức chừa lại); lỗi gửi thử lại 3 lần; SENDING quá 1 giờ → UNKNOWN, gửi lại tay; gửi thử; quyền; quên migrateSchema.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, makeClient, uuid, OWNER_CODE, OWNER_PIN } from '../helpers.mjs';

const NOW = '2026-11-16T08:00:00+07:00'; // Thứ Hai
const DAY = 86400000;
const BASE = 'https://example.github.io/ISO-thu/';

function setItem(env, code, patch) {
  const g = env.g;
  g.dbReset_();
  const it = g.readRows_('Items').find((x) => x.code === code);
  const row = { ...it, ...patch, record_version: (it.record_version || 0) + 1 };
  delete row.__row;
  g.systemWrite_([{ sheet: 'Items', mode: 'update', row }]);
  g.dbReset_();
}

/** Đặt email (và xác nhận) thẳng vào sheet Users */
function setEmail(env, code, email, confirmed = true) {
  const g = env.g;
  g.dbReset_();
  const u = g.readRows_('Users').find((x) => x.employee_code === code);
  g.withWriteLock_(() => g.writeCells_('Users', u.__row, { email, email_confirmed_at: confirmed ? g.isoVN_(new env.clock.Date()) : '', email_confirmed_by: confirmed ? 'TEST' : '' }));
  g.dbReset_();
  return u.user_id;
}

function setSetting(env, key, value) {
  const g = env.g;
  g.dbReset_();
  g.withWriteLock_(() => g.writeSetting_(key, value, 'TEST'));
  g.dbReset_();
}

function seeded() {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  setSetting(env, 'app_base_url', BASE);
  // Biểu CL hằng tháng (bộ phận CL có trưởng bộ phận MAU-CL3): tháng 10 chưa có hồ sơ → quá hạn
  setItem(env, 'BM-CL-01-01', { period_type: 'MONTH', period_days: 31, records_from: '2026-06-01' });
  // Quy trình mẫu QT-ISO-01 hạn rà soát 01/12/2026 (mốc 30 ngày ngay hôm nay): dời xa để mỗi test chỉ xét việc của nó
  setItem(env, 'QT-ISO-01', { review_due: '2027-06-01' });
  return { env, owner };
}

const item = (env, code) => env.rows('Items').find((x) => x.code === code);
const user = (env, code) => env.rows('Users').find((x) => x.employee_code === code);
const logs = (env) => env.rows('NotificationLogs');
const mailsTo = (env, email) => env.mail.sent.filter((m) => m.to === email);
const run = (env) => { env.g.dbReset_(); env.g.sendDueMail(); env.g.dbReset_(); };

test('người nhận: Quản trị nhập + xác nhận email (PIN sau kiểm quyền); đổi email mất xác nhận; owner chỉ owner sửa; cấp 3 bị chặn', () => {
  const { env, owner } = seeded();
  const tk = user(env, 'MAU-TK');
  // Chưa nhập PIN: hỏi PIN; sai dạng email → VALIDATION_ERROR
  let r = owner.write('mail.recipient.set', { user_id: tk.user_id, email: 'tk@example.com', confirm: true }, { expected_version: tk.record_version });
  assert.equal(r.code, 'REAUTH_REQUIRED');
  owner.pin(OWNER_PIN);
  r = owner.write('mail.recipient.set', { user_id: tk.user_id, email: 'khong-dung', confirm: true }, { expected_version: tk.record_version });
  assert.equal(r.code, 'VALIDATION_ERROR');
  r = owner.write('mail.recipient.set', { user_id: tk.user_id, email: 'TK@Example.com', confirm: true }, { expected_version: tk.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  let u = user(env, 'MAU-TK');
  assert.equal(u.email, 'tk@example.com');
  assert.ok(u.email_confirmed_at);
  assert.equal(u.email_confirmed_by, owner.call('account.view', {}).data.user.user_id);
  assert.equal(u.auth_version, tk.auth_version, 'đặt email không đổi quyền, không thu hồi phiên');
  // Sửa email bằng màn Người dùng (user.setRole) → mất xác nhận
  r = owner.write('user.setRole', { user_id: u.user_id, role_level: 2, dept_codes: ['ISO'], iso_secretary: true, auditor: false, email: 'tk2@example.com' }, { expected_version: u.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  u = user(env, 'MAU-TK');
  assert.equal(u.email, 'tk2@example.com');
  assert.equal(u.email_confirmed_at, '');
  // Xác nhận lại; đổi email ở mail.recipient.set không kèm confirm → mất xác nhận
  r = owner.write('mail.recipient.set', { user_id: u.user_id, confirm: true }, { expected_version: u.record_version });
  assert.equal(r.ok, true);
  u = user(env, 'MAU-TK');
  assert.ok(u.email_confirmed_at);
  r = owner.write('mail.recipient.set', { user_id: u.user_id, email: 'tk3@example.com' }, { expected_version: u.record_version });
  u = user(env, 'MAU-TK');
  assert.equal(u.email, 'tk3@example.com');
  assert.equal(u.email_confirmed_at, '');
  // Owner đặt email của chính mình
  const me = user(env, 'NV-001');
  r = owner.write('mail.recipient.set', { user_id: me.user_id, email: 'owner@example.com', confirm: true }, { expected_version: me.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  // Quản trị khác (không phải owner) không sửa email owner: FORBIDDEN trước khi hỏi PIN
  const qt = userClient(env, 'QT4', 4, '583926');
  assert.equal(qt.write('mail.recipient.set', { user_id: me.user_id, email: 'x@example.com' }, { expected_version: 2 }).code, 'FORBIDDEN');
  assert.equal(qt.write('mail.test', { user_id: me.user_id }).code, 'FORBIDDEN');
  assert.equal(qt.call('mail.view', {}).ok, true);
  // Cấp 3, Thư ký ISO cấp 2: không vào màn Gmail
  const cl3 = userClient(env, 'CL3X', 3, '583928', { depts: 'CL' });
  assert.equal(cl3.call('mail.view', {}).code, 'FORBIDDEN');
  assert.equal(cl3.write('mail.settings.set', { gmail_enabled: true }).code, 'FORBIDDEN');
  const tk2 = userClient(env, 'TK2X', 2, '583930', { depts: 'ISO', secretary: true });
  assert.equal(tk2.write('mail.run', {}).code, 'FORBIDDEN');
  // Nhật ký thao tác che email
  const au = env.rows('AuditLogs').filter((a) => a.action === 'mail.recipient.set');
  assert.ok(au.length >= 3);
  assert.ok(au.every((a) => !JSON.stringify(a).includes('tk3@example.com')));
  // Người dùng: Quản trị thấy email + đã xác nhận chưa
  const uv = owner.call('user.view', {}).data.items.find((x) => x.employee_code === 'NV-001');
  assert.equal(uv.email, 'owner@example.com');
  assert.ok(uv.email_confirmed_at);
});

test('thứ Hai: tóm tắt hồ sơ quá hạn → trưởng bộ phận (chưa có email → Thư ký ISO gửi thay; bộ phận chưa có trưởng → Thư ký ISO); chống gửi trùng; tuần sau nhắc lại', () => {
  const { env, owner } = seeded();
  setEmail(env, 'MAU-TK', 'tk@example.com');
  setEmail(env, 'MAU-CL3', 'cl3@example.com', false); // có email, chưa xác nhận
  // Gmail tắt: trigger không làm gì
  run(env);
  assert.equal(env.mail.sent.length, 0);
  assert.equal(logs(env).length, 0);
  owner.pin(OWNER_PIN);
  let r = owner.write('mail.settings.set', { gmail_enabled: true });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.trigger, true);
  run(env);
  assert.equal(env.mail.sent.length, 1);
  const m = env.mail.sent[0];
  assert.equal(m.to, 'tk@example.com');
  assert.match(m.subject, /^\[ISO THỬ\] Nhắc hạn hồ sơ, tài liệu ISO · ISO记录与文件到期提醒 — 16\/11\/2026$/);
  for (const code of ['BM-SX-01-01', 'BM-SX-02-01', 'BM-KD-01-04', 'BM-CL-01-01']) assert.ok(m.body.includes(code), code);
  assert.ok(!m.body.includes('BM-ISO-02-04'), 'biểu năm chưa tới kỳ xét không có');
  assert.match(m.body, /== Hồ sơ quá hạn — tóm tắt tuần · 逾期记录（每周汇总） ==/);
  assert.match(m.body, /Gửi thay cho · 代为通知: Trưởng QA MẪU/);
  assert.ok(m.body.includes(BASE + '#/item/' + item(env, 'BM-CL-01-01').item_id));
  assert.ok(m.body.includes(BASE + '#/records?dept=SX&f=late'));
  assert.match(m.body, /Kỳ quá hạn · 逾期期间: 2026-10 \(Hằng tháng · 每月\) — hạn chót · 截止 03\/11\/2026/);
  let L = logs(env);
  assert.equal(L.length, 4);
  assert.ok(L.every((n) => n.status === 'SENT' && n.kind === 'REC_OVERDUE' && n.stage === '2026-W47'));
  assert.equal(L.find((n) => n.detail_json.code === 'BM-CL-01-01').via, 'FALLBACK');
  // Chạy lại cùng ngày: không gửi trùng
  run(env);
  assert.equal(env.mail.sent.length, 1);
  // Quản trị xác nhận email trưởng QA → thư của bộ phận CL tới đúng trưởng bộ phận (chỉ biểu CL)
  const cl3 = user(env, 'MAU-CL3');
  r = owner.write('mail.recipient.set', { user_id: cl3.user_id, confirm: true }, { expected_version: cl3.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  run(env);
  assert.equal(env.mail.sent.length, 2);
  const mh = mailsTo(env, 'cl3@example.com')[0];
  assert.ok(mh.body.includes('BM-CL-01-01'));
  assert.ok(!mh.body.includes('BM-SX-01-01') && !mh.body.includes('Gửi thay cho'));
  assert.match(mh.body, /^Chào Trưởng QA MẪU · Trưởng QA MẪU，您好/);
  // Thứ Ba – Chủ nhật: không gửi tóm tắt
  for (let i = 0; i < 6; i++) { env.clock.advance(DAY); run(env); }
  assert.equal(env.mail.sent.length, 2);
  // Thứ Hai tuần sau: còn quá hạn thì nhắc lại; SX nộp hồ sơ hằng ngày tới hôm qua → biểu SX-02-01 không còn trong thư
  const sx = userClient(env, 'SX2X', 2, '583932', { depts: 'SX' });
  r = sx.write('record.submit', { record_id: uuid(), item_id: item(env, 'BM-SX-02-01').item_id, period_from: '2026-11-01', period_to: '2026-11-22', pages: 1 });
  assert.equal(r.ok, true, JSON.stringify(r));
  env.clock.advance(DAY);
  run(env);
  assert.equal(env.mail.sent.length, 4);
  const m2 = env.mail.sent.filter((x) => x.to === 'tk@example.com').pop();
  assert.match(m2.subject, /23\/11\/2026$/);
  assert.ok(m2.body.includes('BM-SX-01-01') && m2.body.includes('BM-KD-01-04'));
  assert.ok(!m2.body.includes('BM-SX-02-01'));
  assert.ok(!m2.body.includes('BM-CL-01-01'), 'biểu CL nay gửi trưởng bộ phận');
  assert.ok(mailsTo(env, 'cl3@example.com')[1].body.includes('BM-CL-01-01'));
  L = logs(env);
  assert.ok(L.filter((n) => n.stage === '2026-W48').length === 3);
});

test('tài liệu đến hạn rà soát: mốc 30, 7, 0 ngày; quá hạn mỗi 7 ngày → người phụ trách + Thư ký ISO; Đã rà soát thì thôi', () => {
  const { env, owner } = seeded();
  setEmail(env, 'MAU-TK', 'tk@example.com');
  const sxId = (() => { userClient(env, 'SX2X', 2, '583932', { depts: 'SX' }); return setEmail(env, 'SX2X', 'sx@example.com'); })();
  setItem(env, 'BM-NS-01-02', { review_due: '2026-12-16', owner_user_id: sxId });
  setSetting(env, 'gmail_enabled', true);
  const hits = { sx: [], tk: [] };
  for (let d = 0; d <= 45; d++) {
    const before = env.mail.sent.length;
    run(env);
    const today = env.g.todayVN_();
    const dr = env.g.daysBetweenIso_(today, '2026-12-16');
    for (const mm of env.mail.sent.slice(before)) {
      if (!mm.body.includes('BM-NS-01-02')) continue;
      if (mm.to === 'sx@example.com') hits.sx.push(dr);
      if (mm.to === 'tk@example.com') hits.tk.push(dr);
    }
    env.clock.advance(DAY);
  }
  assert.deepEqual(hits.sx, [30, 7, 0, -7, -14]);
  assert.deepEqual(hits.tk, [30, 7, 0, -7, -14]);
  const last = env.mail.sent.filter((x) => x.to === 'sx@example.com' && x.body.includes('BM-NS-01-02')).pop();
  assert.match(last.body, /Hạn rà soát · 评审期限: 16\/12\/2026 \(quá hạn · 已逾期 14 ngày · 14天\)/);
  assert.match(last.body, /phụ trách · 负责人: SX2X/);
  // Đã rà soát, giữ nguyên → hạn mới +12 tháng, thôi nhắc (phiên 30 ngày đã hết: đăng nhập lại)
  const qt = makeClient(env);
  assert.equal(qt.login(OWNER_CODE, OWNER_PIN).ok, true);
  qt.pin(OWNER_PIN);
  const it = item(env, 'BM-NS-01-02');
  const r = qt.write('item.review', { item_id: it.item_id }, { expected_version: it.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  const revRows = () => logs(env).filter((n) => n.kind === 'REVIEW_DUE' && n.entity_id === it.item_id).length;
  const n0 = revRows();
  assert.equal(n0, 10); // 5 mốc × 2 người nhận
  for (let d = 0; d < 8; d++) { run(env); env.clock.advance(DAY); }
  assert.equal(revRows(), n0);
  // (sang năm 2027 biểu năm này quá hạn hồ sơ kỳ 2026 → có trong tóm tắt thứ Hai, không phải nhắc rà soát)
});

test('phiên bản chờ duyệt quá 3 ngày → người duyệt, mỗi ngày làm việc; đã duyệt chờ ban hành → Thư ký ISO; ban hành thì thôi', () => {
  const { env, owner } = seeded();
  setEmail(env, 'NV-001', 'owner@example.com');
  setEmail(env, 'MAU-TK', 'tk@example.com');
  setSetting(env, 'gmail_enabled', true);
  const sx = userClient(env, 'SX2X', 2, '583932', { depts: 'SX' });
  const id = uuid();
  const it = item(env, 'BM-SX-02-01');
  let r = sx.write('version.save', { version_id: id, item_id: it.item_id, change_summary_vi: 'Sửa cột ca', effective_date: '2026-12-01' });
  assert.equal(r.ok, true, JSON.stringify(r));
  const pdf = Buffer.alloc(3000, 32); Buffer.from('%PDF-1.7\n').copy(pdf);
  r = sx.write('doc.upload', { document_id: uuid(), entity_type: 'VERSION', entity_id: id, kind: 'PDF', mime_type: 'application/pdf', file_name: 'a.pdf', content_b64: pdf.toString('base64') });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = sx.write('version.submit', { version_id: id }, { expected_version: r.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  const wait = (to, word) => env.mail.sent.filter((x) => x.to === to && x.body.includes('Phiên bản chờ xử lý quá 3 ngày') && x.body.includes(word));
  const days = { owner: [], tk: [] };
  const step = (n) => {
    for (let i = 0; i < n; i++) {
      const o0 = wait('owner@example.com', 'Chờ duyệt từ').length, t0 = wait('tk@example.com', 'chờ ban hành từ').length;
      run(env);
      const today = env.g.todayVN_();
      if (wait('owner@example.com', 'Chờ duyệt từ').length > o0) days.owner.push(today);
      if (wait('tk@example.com', 'chờ ban hành từ').length > t0) days.tk.push(today);
      run(env); // chạy lần hai cùng ngày: không gửi trùng
      assert.equal(wait('owner@example.com', 'Chờ duyệt từ').length, days.owner.length);
      env.clock.advance(DAY);
    }
  };
  step(9); // 16/11 → 24/11
  assert.deepEqual(days.owner, ['2026-11-20', '2026-11-23', '2026-11-24']);
  assert.match(wait('owner@example.com', 'Chờ duyệt từ')[0].body, /Chờ duyệt từ · 待审批自 16\/11\/2026 \(4 ngày · 4天\) — lần · 版次 02 · người soạn · 编写人: SX2X/);
  // Quản trị duyệt ngày 25/11 → thôi nhắc người duyệt; Thư ký ISO được nhắc ban hành từ ngày làm việc thứ 4 sau khi duyệt
  owner.pin(OWNER_PIN);
  const v = env.rows('Versions').find((x) => x.version_id === id);
  r = owner.write('version.approve', { version_id: id }, { expected_version: v.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  step(7); // 25/11 → 01/12
  assert.deepEqual(days.owner, ['2026-11-20', '2026-11-23', '2026-11-24']);
  assert.deepEqual(days.tk, ['2026-11-30', '2026-12-01']);
  owner.pin(OWNER_PIN);
  r = owner.write('version.issue', { version_id: id }, { expected_version: env.rows('Versions').find((x) => x.version_id === id).record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  step(3);
  assert.deepEqual(days.tk, ['2026-11-30', '2026-12-01']);
  // Dòng chờ gửi của ngày cũ không còn gửi (SUPERSEDED), không có dòng kẹt
  assert.ok(logs(env).every((n) => n.status === 'SENT' || n.status === 'SKIPPED'));
});

test('hạn mức Gmail dùng chung: còn ≤ mức chừa lại thì dừng, gửi lần sau; lỗi gửi thử lại 3 lần; SENDING quá 1 giờ → UNKNOWN, gửi lại tay', () => {
  const { env, owner } = seeded();
  setEmail(env, 'MAU-TK', 'tk@example.com');
  setEmail(env, 'MAU-CL3', 'cl3@example.com');
  setSetting(env, 'gmail_enabled', true);
  env.mail.quota = 10; // còn 10 = mức chừa lại mặc định
  run(env);
  assert.equal(env.mail.sent.length, 0);
  assert.ok(logs(env).length > 0 && logs(env).every((n) => n.status === 'QUEUED'));
  const st = owner.call('system.status', {}).data.checks.find((x) => x.key === 'gmail');
  assert.equal(st.status, 'WARN');
  assert.match(st.note, /Hạn mức Gmail còn ít/);
  let view = owner.call('mail.view', {}).data;
  assert.equal(view.last_run.result.quota_stop, true);
  assert.equal(view.quota, 10);
  env.mail.quota = 100;
  run(env);
  assert.equal(env.mail.sent.length, 2);
  assert.ok(logs(env).every((n) => n.status === 'SENT'));
  // Lỗi gửi: thử lại tối đa 3 lần rồi thôi; Quản trị gửi lại tay
  const realSend = env.g.MailApp.sendEmail;
  env.g.MailApp.sendEmail = () => { throw new Error('Service invoked too many times'); };
  env.clock.advance(7 * DAY);
  for (let i = 0; i < 4; i++) run(env);
  let failed = logs(env).filter((n) => n.status === 'FAILED');
  assert.equal(failed.length, 4); // 3 biểu gửi Thư ký ISO + 1 biểu CL gửi trưởng bộ phận
  assert.ok(failed.every((n) => n.attempt_count === 3 && /too many/.test(n.error_code)));
  env.g.MailApp.sendEmail = realSend;
  run(env);
  assert.equal(logs(env).filter((n) => n.status === 'FAILED').length, 4, 'hết lượt thử: không tự gửi lại');
  view = owner.call('mail.view', {}).data;
  assert.equal(view.counts.FAILED, 4);
  owner.pin(OWNER_PIN);
  const n0 = env.mail.sent.length;
  let r = owner.write('mail.resend', { notification_id: failed[0].notification_id });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.status, 'SENT');
  assert.equal(env.mail.sent.length, n0 + 1);
  assert.equal(logs(env).find((n) => n.notification_id === failed[0].notification_id).error_code, 'RESENT');
  // Dòng SENT không gửi lại tay được
  assert.equal(owner.write('mail.resend', { notification_id: failed[0].notification_id }).code, 'VALIDATION_ERROR');
  // SENDING kẹt quá 1 giờ (máy chủ dừng giữa chừng) → UNKNOWN, không tự gửi lại
  const g = env.g;
  g.dbReset_();
  const row = g.readRows_('NotificationLogs').find((n) => n.status === 'FAILED');
  g.withWriteLock_(() => g.writeCells_('NotificationLogs', row.__row, { status: 'SENDING', attempt_at: g.isoVN_(new env.clock.Date(Date.now() + env.clock.offset - 2 * 3600000)) }));
  run(env);
  assert.equal(logs(env).find((n) => n.notification_id === row.notification_id).status, 'UNKNOWN');
  assert.match(owner.call('system.status', {}).data.checks.find((x) => x.key === 'gmail').note, /chưa rõ đã gửi/);
  r = owner.write('mail.resend', { notification_id: row.notification_id });
  assert.equal(r.data.status, 'SENT');
});

test('gửi thử: tới email đã xác nhận, đủ các việc của người đó kể cả không phải thứ Hai, không ghi hàng chờ; Gửi ngay; xem trước; Trạng thái hệ thống', () => {
  const { env, owner } = seeded();
  env.clock.advance(2 * DAY); // Thứ Tư 18/11
  setEmail(env, 'MAU-TK', 'tk@example.com');
  setEmail(env, 'MAU-CL3', 'cl3@example.com', false);
  setItem(env, 'BM-ISO-02-04', { review_due: '2026-11-25' });
  owner.pin(OWNER_PIN);
  const tk = user(env, 'MAU-TK'), cl3 = user(env, 'MAU-CL3');
  assert.equal(owner.write('mail.test', { user_id: cl3.user_id }).errors[0].code, 'EMAIL_NOT_CONFIRMED');
  let r = owner.write('mail.test', { user_id: tk.user_id });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.ok, true);
  assert.equal(r.data.items, 5); // 4 biểu quá hạn (CL gửi thay) + 1 rà soát
  const m = env.mail.sent[0];
  assert.match(m.subject, /^\[ISO THỬ\] Gửi thử · 测试 — /);
  assert.match(m.body, /THƯ THỬ/);
  assert.ok(m.body.includes('BM-ISO-02-04') && m.body.includes('BM-CL-01-01'));
  assert.match(m.body, /Hạn rà soát · 评审期限: 25\/11\/2026 \(còn · 剩余 7 ngày · 7天\)/);
  assert.equal(logs(env).length, 0, 'gửi thử không ghi hàng chờ');
  // Gửi ngay khi Gmail tắt → báo bật trước
  assert.equal(owner.write('mail.run', {}).errors[0].code, 'MAIL_OFF');
  // Xem trước: thứ Tư → tóm tắt hồ sơ quá hạn chờ thứ Hai, rà soát gửi ngay
  let v = owner.call('mail.view', {}).data;
  assert.equal(v.next_monday, '2026-11-23');
  const mine = v.preview.filter((p) => p.user_id === tk.user_id);
  assert.equal(mine.length, 5);
  assert.ok(mine.filter((p) => p.kind === 'REC_OVERDUE').every((p) => p.state === 'MONDAY'));
  assert.equal(mine.find((p) => p.kind === 'REVIEW_DUE').state, 'NEW');
  assert.equal(mine.find((p) => p.code === 'BM-CL-01-01').via, 'FALLBACK');
  assert.equal(mine.find((p) => p.code === 'BM-CL-01-01').for_names, 'Trưởng QA MẪU');
  const rt = v.recipients.find((x) => x.user_id === tk.user_id);
  assert.equal(rt.roles.secretary, true);
  assert.equal(rt.email, 'tk@example.com');
  assert.deepEqual(v.recipients.find((x) => x.user_id === cl3.user_id).roles.heads, ['CL']);
  assert.equal(v.settings.gmail_enabled, false);
  assert.equal(owner.call('system.status', {}).data.checks.find((x) => x.key === 'gmail').value, 'OFF');
  // Bật, đổi giờ gửi 6 giờ → trigger sendDueMail đặt lại đúng giờ; Gửi ngay
  r = owner.write('mail.settings.set', { gmail_enabled: true, email_hour: 6 });
  assert.equal(r.ok, true, JSON.stringify(r));
  const trig = env.g.ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'sendDueMail');
  assert.equal(trig.length, 1);
  assert.equal(trig[0].spec.atHour, 6);
  // Vừa bật, chưa tới giờ gửi lần đầu: Trạng thái hệ thống không báo "chưa chạy"
  assert.equal(owner.call('system.status', {}).data.checks.find((x) => x.key === 'gmail').status, 'OK');
  r = owner.write('mail.run', {});
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.sent, 1);
  assert.equal(r.data.queued, 1, 'chỉ việc rà soát (tóm tắt hồ sơ quá hạn đợi thứ Hai)');
  v = owner.call('mail.view', {}).data;
  assert.equal(v.preview.find((p) => p.user_id === tk.user_id && p.kind === 'REVIEW_DUE').state, 'SENT');
  assert.equal(v.logs[0].status, 'SENT');
  assert.equal(v.logs[0].email, 'tk@example.com');
  const h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'gmail');
  assert.equal(h.status, 'OK', JSON.stringify(h));
  assert.match(h.value, /^ON · 1 người nhận đã xác nhận/);
  // Không ai có email đã xác nhận → việc không ai nhận được
  setEmail(env, 'MAU-TK', 'tk@example.com', false);
  v = owner.call('mail.view', {}).data;
  assert.equal(v.preview.length, 0);
  assert.equal(v.unreachable.length, 5);
  // Cấu hình: gmail_enabled, email_hour chỉ sửa ở màn Gmail; số ngày chờ phiên bản sửa được
  assert.equal(owner.write('settings.edit', { changes: { gmail_enabled: false } }).code, 'VALIDATION_ERROR');
  assert.equal(owner.write('settings.edit', { changes: { version_wait_days: 5 } }).ok, true);
});

test('installTriggers cài đủ 4 trigger; dán Code.gs 2b chưa chạy migrateSchema: màn Gmail tự thêm cột', () => {
  const { env, owner } = seeded();
  const g = env.g;
  g.installTriggers();
  assert.deepEqual(g.ScriptApp.getProjectTriggers().map((t) => t.getHandlerFunction()).sort(), ['backupData', 'runBackgroundJobs', 'sendDueMail', 'syncEvidenceHourly']);
  // Giả lập máy chủ 2a: Users chưa có email_confirmed_*, NotificationLogs chưa có kind/via/detail_json
  g.dbReset_();
  for (const [name, cols] of [['Users', ['email_confirmed_at', 'email_confirmed_by']], ['NotificationLogs', ['kind', 'via', 'detail_json']]]) {
    const h = g.hdr_(name);
    for (const c of cols) g.sh_(name).getRange(1, h.idx[c] + 1).setValue('');
  }
  g.withWriteLock_(() => g.stateWrite_(g.readState_(), { schema_version: ['STRING', '1.0.3'] }, 'TEST'));
  g.cache_().remove('sys:state');
  g.dbReset_();
  assert.equal(g.mailSchemaReady_(), false);
  assert.equal(owner.call('sync.bootstrap', {}).ok, true);
  assert.equal(owner.call('system.status', {}).data.checks.find((x) => x.key === 'gmail').status, 'WARN');
  const r = owner.call('mail.view', {});
  assert.equal(r.ok, true, JSON.stringify(r));
  g.dbReset_();
  assert.equal(g.mailSchemaReady_(), true);
  assert.equal(g.stateGet_(g.readState_(), 'schema_version', ''), g.SCHEMA_VERSION);
});
