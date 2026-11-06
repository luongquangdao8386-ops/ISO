// Bản sao ở tài khoản Google thứ hai: máy chủ ISO chia sẻ (chỉ xem) thư mục Sao lưu + Dữ liệu; script SaoLuuPhu.gs chạy trong
// tài khoản thứ hai chép bản sao lưu VERIFIED và tệp dữ liệu về Drive của nó (cả thư mục M&E / Checksheet được chia sẻ tay)
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, fakePngB64, OWNER_PIN } from '../helpers.mjs';
import { loadScript } from '../gas-mock.mjs';

const NOW = '2026-11-06T08:00:00+07:00';
const B = 'b-account@example.test';
const OWNER = 'me-owner@example.test';

function setup() {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  return { env, owner };
}
const folderByName = (env, name) => [...env.drive._folders.values()].find((f) => f.name === name && !f.trashed);
const childrenOf = (env, id) => [...env.drive._folders.values()].filter((f) => f.parent === id && !f.trashed);
const filesOf = (env, id) => [...env.drive._files.values()].filter((f) => f.parent === id && !f.trashed);

test('backup.mirror.set: chỉ Quản trị (FORBIDDEN trước PIN), kiểm email, không cho trùng tài khoản máy chủ, chia sẻ chỉ xem thư mục Sao lưu + Dữ liệu; đổi email bỏ chia sẻ cũ', () => {
  const { env, owner } = setup();
  const tk = userClient(env, 'TK1', 2, '583920', { depts: 'ISO', secretary: true });
  assert.equal(tk.write('backup.mirror.set', { email: B }).code, 'FORBIDDEN');
  assert.equal(owner.write('backup.mirror.set', { email: B }).code, 'REAUTH_REQUIRED');
  owner.pin(OWNER_PIN);
  assert.equal(owner.write('backup.mirror.set', { email: 'khong-hop-le' }).errors[0].code, 'INVALID_VALUE');
  assert.equal(owner.write('backup.mirror.set', { email: OWNER }).errors[0].code, 'MIRROR_SAME_ACCOUNT');
  const r = owner.write('backup.mirror.set', { email: B.toUpperCase() });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.status, 'OK');
  assert.deepEqual(r.data.folders, ['ISO_Backups_THU', 'ISO_Data_THU']);
  assert.ok(folderByName(env, 'ISO_Backups_THU').viewers.has(B));
  assert.ok(folderByName(env, 'ISO_Data_THU').viewers.has(B));
  assert.ok(!folderByName(env, 'ISO_HeThong_THU').viewers.has(B), 'không chia sẻ thư mục chứa bảng tính đang chạy');
  assert.equal(env.g.setting_('backup_mirror_email'), B);
  // Trạng thái hệ thống và màn Sao lưu
  const st = owner.call('system.status', {}).data.checks.find((c) => c.key === 'backup_mirror');
  assert.equal(st.status, 'OK');
  assert.ok(!st.value.includes(B), 'email che bớt trên trạng thái hệ thống');
  assert.equal(owner.call('backup.view', {}).data.mirror.email, B);
  assert.equal(owner.write('settings.edit', { changes: { backup_mirror_email: 'x@example.test' } }).errors[0].code, 'INVALID_VALUE', 'không sửa qua Cấu hình chung');
  // Đổi email: bỏ chia sẻ email cũ
  owner.write('backup.mirror.set', { email: 'c-account@example.test' });
  assert.ok(!folderByName(env, 'ISO_Backups_THU').viewers.has(B));
  assert.ok(folderByName(env, 'ISO_Backups_THU').viewers.has('c-account@example.test'));
  // Bỏ hẳn
  const off = owner.write('backup.mirror.set', { email: '' });
  assert.equal(off.data.status, 'OFF');
  assert.equal(folderByName(env, 'ISO_Backups_THU').viewers.size, 0);
});

test('SaoLuuPhu: tài khoản thứ hai chép bản sao lưu VERIFIED + tệp dữ liệu của ISO và thư mục M&E chia sẻ tay; chạy lại không chép trùng; tài khoản chính bị khóa vẫn mở được bản chép', () => {
  const { env, owner } = setup();
  owner.pin(OWNER_PIN);
  assert.equal(owner.write('report.logo.set', { content_b64: fakePngB64(), mime_type: 'image/png' }).ok, true);
  assert.equal(owner.write('backup.mirror.set', { email: B }).data.status, 'OK');
  env.g.dbReset_();
  assert.equal(env.g.backupData().status, 'VERIFIED');
  // M&E (cùng tài khoản chính) có thư mục sao lưu riêng, chia sẻ tay cho tài khoản thứ hai; một bản lỗi không được chép
  const meRoot = env.drive.createFolder('ME_Backups_THU');
  const good = meRoot.createFolder('2026-11-01_0100');
  good.createFile(env.g.Utilities.newBlob(JSON.stringify({ status: 'VERIFIED', app_id: 'ME' }), 'application/json', 'manifest.json'));
  good.createFile(env.g.Utilities.newBlob('sheet', 'application/vnd.google-apps.spreadsheet', 'ME_NghiepVu_2026-11-01_0100'));
  const bad = meRoot.createFolder('2026-11-02_0100');
  bad.createFile(env.g.Utilities.newBlob(JSON.stringify({ status: 'FAILED' }), 'application/json', 'manifest.json'));
  meRoot.addViewer(B);
  // Thư mục không được chia sẻ: tài khoản thứ hai không thấy
  env.drive.createFolder('CS_Backups_THU');

  const m = loadScript(env, 'apps-script/SaoLuuPhu.gs', { user: B });
  const src = m.run('danhSachNguon').map((s) => s.name);
  assert.deepEqual(src, ['ISO_Backups_THU', 'ISO_Data_THU', 'ME_Backups_THU']);
  const r = m.run('caiDat');
  const by = Object.fromEntries(r.sources.map((s) => [s.name, s]));
  assert.equal(by.ISO_Backups_THU.copied, 1);
  assert.equal(by.ME_Backups_THU.copied, 1);
  assert.equal(by.ME_Backups_THU.skipped, 1, 'bản FAILED không chép');
  assert.equal(by.ISO_Data_THU.copied, 1, 'logo');
  assert.ok(m.g.ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === 'chepNgay'));
  // Bản chép nằm trong Drive của tài khoản thứ hai, thuộc tài khoản thứ hai
  const root = [...env.drive._folders.values()].find((f) => f.name === 'SaoLuu_Phu');
  assert.equal(root.owner, B);
  const isoDest = childrenOf(env, root.id).find((f) => f.name === 'ISO_Backups_THU');
  const stampDir = childrenOf(env, isoDest.id)[0];
  assert.match(stampDir.name, /^2026-11-06_0800$/);
  const copied = filesOf(env, stampDir.id);
  assert.deepEqual(copied.map((f) => f.name).sort(), ['ISO_BaoMat_2026-11-06_0800', 'ISO_NghiepVu_2026-11-06_0800', 'manifest.json', 'mirror.json']);
  assert.ok(copied.every((f) => f.owner === B));
  // Chạy lại: không chép trùng
  const r2 = m.run('chepNgay');
  assert.ok(r2.sources.every((s) => s.copied === 0), JSON.stringify(r2));
  // Tài khoản chính bị khóa: tài khoản thứ hai vẫn mở được bản chép bảng tính nghiệp vụ (đủ danh mục)
  const biz = copied.find((f) => f.name.startsWith('ISO_NghiepVu'));
  const items = env.ssApp.openById(biz.id).getSheetByName('Items');
  assert.equal(items.getLastRow() - 1, 25);
  env.drive._user = B;
  try {
    // Bảng tính đang chạy (thư mục ISO_HeThong_THU) không chia sẻ: tài khoản thứ hai chỉ có bản chép
    assert.throws(() => env.drive.getFileById(env.props.getProperty('BUSINESS_SPREADSHEET_ID')).getBlob(), /Access denied/);
    assert.equal(env.drive.getFileById(biz.id).getName(), biz.name);
  } finally { env.drive._user = OWNER; }
  // kiemTra: đạt (bản mới nhất 0 ngày)
  const chk = m.run('kiemTra');
  assert.ok(chk.find((c) => c.name === 'ISO_Backups_THU').ok);
});

test('SaoLuuPhu: giữ 12 bản mới nhất, dọn bản chép dở của lần trước', () => {
  const { env, owner } = setup();
  owner.pin(OWNER_PIN);
  owner.write('backup.mirror.set', { email: B });
  for (let i = 0; i < 14; i++) {
    env.clock.advance(60 * 60000);
    env.g.dbReset_();
    assert.equal(env.g.backupData().status, 'VERIFIED');
  }
  const m = loadScript(env, 'apps-script/SaoLuuPhu.gs', { user: B });
  // Bản chép dở của lần chạy trước (hết giờ giữa chừng)
  env.drive._user = B;
  const root = env.drive.getRootFolder().createFolder('SaoLuu_Phu');
  root.createFolder('ISO_Backups_THU').createFolder('2026-11-06_0900_dang_chep');
  env.drive._user = OWNER;
  const r = m.run('chepNgay');
  const iso = r.sources.find((s) => s.name === 'ISO_Backups_THU');
  // Thư mục Backups của máy chủ giữ backup_keep_count = 8 bản VERIFIED mới nhất
  assert.equal(iso.copied, 8);
  const dest = childrenOf(env, root.getId()).find((f) => f.name === 'ISO_Backups_THU');
  const names = childrenOf(env, dest.id).map((f) => f.name);
  assert.ok(!names.some((n) => n.endsWith('_dang_chep')), names.join(','));
  assert.equal(names.length, 8);
  // Thêm 6 bản nữa → bản chép lên 14, cắt còn 12
  for (let i = 0; i < 6; i++) { env.clock.advance(60 * 60000); env.g.dbReset_(); env.g.backupData(); }
  const r2 = m.run('chepNgay');
  const iso2 = r2.sources.find((s) => s.name === 'ISO_Backups_THU');
  assert.equal(iso2.copied, 6);
  assert.equal(iso2.pruned, 2);
  assert.equal(childrenOf(env, dest.id).length, 12);
});
