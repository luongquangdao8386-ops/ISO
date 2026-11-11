// Đăng nhập PIN, người dùng (bộ phận, Thư ký ISO, Đánh giá viên), bộ phận, cài đặt, logo, trạng thái hệ thống
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, makeClient, addUser, uuid, fakePngB64, OWNER_PIN, OWNER_CODE } from '../helpers.mjs';

const NOW = '2026-11-06T08:00:00+07:00';

test('setup: 10 bộ phận mặc định, đủ sheet; health.system báo app ISO', () => {
  const env = freshServer({ now: NOW });
  const depts = env.rows('Depts');
  assert.deepEqual(depts.map((d) => d.dept_code), ['ISO', 'KD', 'CB', 'SX', 'CL', 'MH', 'KV', 'NS', 'BRC', 'CĐ']);
  assert.equal(depts.find((d) => d.dept_code === 'CL').name_vi, 'Chất lượng QA/QC');
  assert.equal(env.get({ action: 'system.health' }).app_id, 'ISO');
  for (const s of ['Items', 'Groups', 'Clauses', 'ImportBatches', 'ImportRows', 'Documents', 'NotificationLogs']) assert.ok(Array.isArray(env.rows(s)), s);
});

test('đăng nhập: PIN tạm phải đổi, sai 5 lần khóa, PIN yếu bị từ chối', () => {
  const env = freshServer({ now: NOW });
  const c = makeClient(env);
  assert.equal(c.login(OWNER_CODE, '358024').code, 'MUST_CHANGE_PIN');
  assert.equal(c.call('sync.bootstrap', {}).code, 'MUST_CHANGE_PIN');
  const weak = c.call('pin.change', { current_pin: '358024', new_pin: '123456' });
  assert.equal(weak.errors[0].code, 'PIN_WEAK');
  assert.equal(c.call('pin.change', { current_pin: '358024', new_pin: OWNER_PIN }).ok, true);
  const d = makeClient(env);
  for (let i = 0; i < 4; i++) assert.equal(d.login(OWNER_CODE, '111222').code, 'AUTH_FAILED');
  assert.equal(d.login(OWNER_CODE, '111222').code, 'PIN_LOCKED');
});

test('người dùng: tạo với bộ phận + Thư ký ISO, PIN tạm trả một lần; đổi cấp thu hồi phiên; không khóa chính mình', () => {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  owner.pin(OWNER_PIN);
  const uid = uuid();
  let r = owner.write('user.create', { user_id: uid, employee_code: 'tk01', display_name: 'Thư ký', role_level: 2, dept_codes: ['ISO'], iso_secretary: true, auditor: false });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.match(r.data.temp_pin, /^\d{6}$/);
  const pin0 = r.data.temp_pin;
  r = owner.call('user.view', {});
  const u = r.data.items.find((x) => x.user_id === uid);
  assert.equal(u.employee_code, 'TK01');
  assert.deepEqual(u.dept_codes, ['ISO']);
  assert.equal(u.iso_secretary, true);
  r = owner.write('user.create', { user_id: uuid(), employee_code: 'X1', display_name: 'B', role_level: 2, dept_codes: ['KHONG'] });
  assert.equal(r.errors[0].code, 'DEPT_UNKNOWN');
  // Đăng nhập lần đầu: đổi PIN tạm; bootstrap mang cờ Thư ký ISO và quyền nhập Excel
  const tk = makeClient(env);
  assert.equal(tk.login('TK01', pin0).code, 'MUST_CHANGE_PIN');
  const ch = tk.call('pin.change', { current_pin: pin0, new_pin: '583920' });
  assert.equal(ch.ok, true);
  tk.token = ch.data.token;
  const b = tk.call('sync.bootstrap', {});
  assert.equal(b.data.user.iso_secretary, true);
  assert.deepEqual(b.data.user.dept_codes, ['ISO']);
  assert.ok(b.data.permissions.actions.includes('import.preview'));
  assert.ok(b.data.permissions.actions.includes('item.edit'));
  assert.ok(!b.data.permissions.actions.includes('user.create'));
  // Đổi cấp → phiên cũ hết hiệu lực
  r = owner.write('user.setRole', { user_id: uid, role_level: 3, dept_codes: ['ISO', 'CL'], iso_secretary: false, auditor: true }, { expected_version: 1 });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(tk.call('sync.changes', { cursor: 0 }).code, 'AUTH_REQUIRED');
  const ownerRow = env.rows('Users').find((x) => x.is_system_owner);
  r = owner.write('user.lock', { user_id: ownerRow.user_id, reason: 'x' }, { expected_version: ownerRow.record_version });
  assert.equal(r.errors[0].code, 'SELF_ACTION');
});

test('bộ phận: Quản trị đặt trưởng bộ phận (PIN); Thư ký ISO cấp 2 bị FORBIDDEN trước khi hỏi PIN', () => {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  const tk = userClient(env, 'TK1', 2, '583920', { secretary: true, depts: 'ISO' });
  const head = userClient(env, 'CL3', 3, '583921', { depts: 'CL' });
  const cl = env.rows('Depts').find((d) => d.dept_code === 'CL');
  const headId = env.rows('Users').find((u) => u.employee_code === 'CL3').user_id;
  // Không có reauth_token: người không có quyền nhận FORBIDDEN, không phải REAUTH_REQUIRED
  assert.equal(tk.write('dept.edit', { dept_code: 'CL', name_vi: 'QA', head_user_id: headId }, { expected_version: cl.record_version }).code, 'FORBIDDEN');
  assert.equal(owner.write('dept.edit', { dept_code: 'CL', name_vi: 'Chất lượng QA/QC', name_zh: '质量', head_user_id: headId }, { expected_version: cl.record_version }).code, 'REAUTH_REQUIRED');
  owner.pin(OWNER_PIN);
  const r = owner.write('dept.edit', { dept_code: 'CL', name_vi: 'Chất lượng QA/QC', name_zh: '质量', head_user_id: headId }, { expected_version: cl.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(env.rows('Depts').find((d) => d.dept_code === 'CL').head_user_id, headId);
  void head;
});

test('cài đặt: chu kỳ rà soát 12 tháng, cho phép trễ 3 ngày (đổi được, có giới hạn); logo báo cáo', () => {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  owner.pin(OWNER_PIN);
  const b = owner.call('sync.bootstrap', {});
  assert.equal(b.data.settings.doc_review_months, 12);
  assert.equal(b.data.settings.record_grace_days, 3);
  let r = owner.write('settings.edit', { changes: { record_grace_days: 999 } });
  assert.equal(r.errors[0].code, 'INVALID_VALUE');
  r = owner.write('settings.edit', { changes: { record_grace_days: 5, records_start_date: '2026-11-10' } });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(owner.call('sync.bootstrap', {}).data.settings.record_grace_days, 5);
  r = owner.write('report.logo.set', { content_b64: fakePngB64(), mime_type: 'image/png' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(owner.call('report.logo.get', {}).data.content_b64);
  const st = owner.call('system.status', {});
  assert.ok(st.data.checks.some((c) => c.key === 'items'));
  assert.ok(st.data.checks.some((c) => c.key === 'clauses'));
});

test('adminChuyenSangTHAT: máy chủ THỬ thành THẬT — xóa danh mục thử + tài khoản mẫu, giữ owner/người thật/logo, đổi tên bỏ _THU, đăng nhập lại; chạy lần hai không làm gì', () => {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  owner.pin(OWNER_PIN);
  assert.equal(owner.write('report.logo.set', { content_b64: fakePngB64(), mime_type: 'image/png' }).ok, true);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  addUser(env, 'CL3', 3, '271828', { depts: 'CL' });
  env.props.setProperty('TEST_TODAY', '2026-11-06');
  env.g.dbReset_();
  assert.ok(env.rows('Items').length > 20);
  assert.ok(env.rows('Users').some((u) => /^MAU-/.test(u.employee_code)));
  assert.ok(env.rows('Depts').find((d) => d.dept_code === 'CL').head_user_id);
  const epoch0 = env.props.getProperty('DATASET_EPOCH');

  const out = env.g.adminChuyenSangTHAT();
  env.g.dbReset_();
  assert.equal(env.props.getProperty('ENV'), 'THAT');
  assert.equal(env.props.getProperty('TEST_TODAY'), null);
  assert.notEqual(env.props.getProperty('DATASET_EPOCH'), epoch0);
  for (const s of ['Items', 'Groups', 'Clauses', 'ImportBatches', 'ImportRows']) assert.equal(env.rows(s).length, 0, s);
  assert.equal(out.wiped.Items, 25);
  assert.equal(JSON.stringify(out.users_removed.slice().sort()), JSON.stringify(['MAU-CL3', 'MAU-KD1', 'MAU-SX2', 'MAU-TK']));
  assert.deepEqual(env.rows('Users').map((u) => u.employee_code).sort(), ['CL3', OWNER_CODE].sort());
  assert.equal(env.rows('Depts').length, 10);
  assert.equal(env.rows('Depts').find((d) => d.dept_code === 'CL').head_user_id, '');
  const names = [...env.drive._folders.values()].map((f) => f.name).concat([...env.drive._files.values()].map((f) => f.name));
  assert.ok(!names.some((n) => /^ISO_.*_THU$/.test(n)), names.join(','));
  for (const n of ['ISO_HeThong', 'ISO_Data', 'ISO_Backups', 'ISO_NghiepVu', 'ISO_BaoMat']) assert.ok(names.includes(n), n);

  // Phiên cũ: DATASET_RESET → đăng nhập lại, dữ liệu trống, app_base_url trang THẬT, logo còn
  assert.equal(owner.call('sync.bootstrap', {}).code, 'DATASET_RESET');
  const o2 = makeClient(env);
  assert.equal(o2.login(OWNER_CODE, OWNER_PIN).ok, true);
  const b = o2.call('sync.bootstrap', {});
  assert.equal(b.ok, true, JSON.stringify(b));
  assert.equal(b.data.records.ITEM.length, 0);
  assert.equal(env.rows('Settings').find((s) => s.setting_key === 'app_base_url').value, 'https://luongquangdao8386-ops.github.io/ISO/');
  assert.ok(o2.call('report.logo.get', {}).data.content_b64);
  assert.equal(b.data.env, 'THAT');
  assert.throws(() => env.g.seedSample_('SYSTEM'), /THỬ/);

  // Chạy nhầm lần hai: không xóa gì
  env.g.dbReset_();
  env.g.seedBaseRows_();
  const n0 = env.rows('Users').length;
  assert.equal(JSON.stringify(env.g.adminChuyenSangTHAT()), '{"already":true}');
  assert.equal(env.rows('Users').length, n0);
});
