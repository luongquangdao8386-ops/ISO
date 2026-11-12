// Danh mục: phạm vi bộ phận khi đồng bộ, quyền (FORBIDDEN trước khi hỏi PIN), sửa thông tin biểu, màn của phiên sau chưa bật
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, uuid, OWNER_PIN } from '../helpers.mjs';

const NOW = '2026-11-06T08:00:00+07:00';

function seeded() {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  return { env, owner };
}
const codes = (c) => c.call('sync.bootstrap', {}).data.records.ITEM.map((x) => x.code).sort();

test('phạm vi bộ phận: cấp 1–3 chỉ thấy bộ phận mình + tài liệu chung Ban ISO; Thư ký ISO và cấp 4 thấy tất cả', () => {
  const { env, owner } = seeded();
  const all = codes(owner);
  assert.equal(all.length, 25);
  const sx = userClient(env, 'SX2', 2, '583920', { depts: 'SX' });
  const mine = codes(sx);
  assert.ok(mine.length < all.length);
  assert.ok(mine.every((c) => /^(BM|QT)-(SX|ISO)-/.test(c)), mine.join(','));
  assert.ok(mine.includes('BM-SX-02-01') && mine.includes('BM-ISO-02-01') && mine.includes('QT-ISO-01'));
  assert.ok(!mine.includes('BM-CL-01-01'));
  const cl = userClient(env, 'CL3', 3, '583921', { depts: 'CL,CĐ' });
  const clc = codes(cl);
  assert.ok(clc.includes('BM-CL-04-01') && clc.includes('BM-CĐ-03-03') && !clc.includes('BM-SX-02-01'));
  const tk = userClient(env, 'TK2', 2, '583922', { depts: 'ISO', secretary: true });
  assert.equal(codes(tk).length, 25);
  // Bộ phận, nhóm, điều khoản gửi đủ cho mọi người
  const b = sx.call('sync.bootstrap', {}).data.records;
  assert.equal(b.DEPT.length, 10);
  assert.ok(b.CLAUSE.length >= 10);
  // Đổi bộ phận của biểu ra ngoài phạm vi → người cấp 2 nhận TOMBSTONE khi đồng bộ
  const cur = Number(sx.call('sync.changes', { cursor: 0 }).data.next_cursor);
  const it = env.rows('Items').find((x) => x.code === 'BM-SX-02-03');
  owner.pin(OWNER_PIN);
  const r = owner.write('item.edit', { item_id: it.item_id, dept_code: 'CL' }, { expected_version: it.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  const ch = sx.call('sync.changes', { cursor: cur });
  assert.ok(ch.data.changes.some((c) => c.entity_id === it.item_id && c.op === 'TOMBSTONE'));
});

test('quyền: cấp 1–3 không phải Thư ký bị FORBIDDEN (trước khi hỏi PIN) khi sửa danh mục, nhập Excel; chức năng đợt sau trả FEATURE_NOT_ENABLED', () => {
  const { env } = seeded();
  const it = env.rows('Items')[0];
  const head = userClient(env, 'CL3', 3, '583921', { depts: 'CL' });
  const look = userClient(env, 'KD1', 1, '583923', { depts: 'KD' });
  assert.equal(head.write('item.edit', { item_id: it.item_id, note: 'x' }, { expected_version: it.record_version }).code, 'FORBIDDEN');
  assert.equal(head.write('import.commit', { import_batch_id: uuid() }).code, 'FORBIDDEN');
  assert.equal(head.write('import.preview', { import_batch_id: uuid(), part: { index: 0, count: 1 }, rows: [] }).code, 'FORBIDDEN');
  assert.equal(look.write('settings.edit', { changes: { record_grace_days: 4 } }).code, 'FORBIDDEN');
  assert.equal(look.write('user.create', { user_id: uuid() }).code, 'FORBIDDEN');
  assert.equal(head.call('user.view', {}).code, 'FORBIDDEN');
  // Đợt 4: action đã đăng ký nhưng chưa có mã (Thư ký ISO / cấp 4)
  const tk = userClient(env, 'TK2', 2, '583926', { depts: 'ISO', secretary: true });
  assert.equal(tk.write('audit.program.edit', {}).code, 'FEATURE_NOT_ENABLED');
  const p = head.call('sync.bootstrap', {}).data.permissions.actions;
  assert.ok(!p.includes('item.edit') && !p.includes('import.preview') && !p.includes('version.issue') && !p.includes('audit.program.edit'));
  assert.ok(p.includes('capa.save') && p.includes('capa.verify'));
  assert.ok(p.includes('version.save') && p.includes('version.approve') && p.includes('doc.get') && p.includes('record.submit') && p.includes('record.return'));
  assert.ok(!look.call('sync.bootstrap', {}).data.permissions.actions.includes('version.save'));
});

test('item.edit: Thư ký ISO thêm quy trình (loại, cấp, nhóm theo mã, mã QR), sửa thông tin; mã trùng bị từ chối; dịch máy tên còn thiếu', () => {
  const { env } = seeded();
  const tk = userClient(env, 'TK2', 2, '583922', { depts: 'ISO', secretary: true });
  const id = uuid();
  let r = tk.write('item.edit', { item_id: id, code: 'qt-cl-02', dept_code: 'CL', name_vi: 'Quy trình kiểm soát sản phẩm không phù hợp', period_days: '', where: 'MANUAL' });
  assert.equal(r.ok, true, JSON.stringify(r));
  const it = env.rows('Items').find((x) => x.item_id === id);
  assert.equal(it.code, 'QT-CL-02');
  assert.equal(it.kind, 'PROCEDURE');
  assert.equal(it.level, 'DEPT');
  assert.equal(it.status, 'NONE');
  assert.equal(it.period_type, 'EVENT');
  assert.match(it.qr_key, /^[0-9A-HJKMNP-TV-Z]{20}$/);
  assert.equal(it.name_zh, '[zh-CN] Quy trình kiểm soát sản phẩm không phù hợp');
  assert.equal(it.i18n_meta.name.state, 'MACHINE');
  r = tk.write('item.edit', { item_id: uuid(), code: 'QT-CL-02', dept_code: 'CL', name_vi: 'Trùng' });
  assert.equal(r.errors[0].code, 'CODE_DUPLICATE');
  r = tk.write('item.edit', { item_id: id, period_days: 31, priority: 1, iso9001: '8.7' }, { expected_version: it.record_version });
  assert.equal(r.ok, true, JSON.stringify(r));
  const it2 = env.rows('Items').find((x) => x.item_id === id);
  assert.equal(it2.period_type, 'MONTH');
  assert.equal(it2.priority, 1);
  // Sửa đè bản cũ → xung đột
  r = tk.write('item.edit', { item_id: id, note: 'x' }, { expected_version: it.record_version });
  assert.equal(r.code, 'VERSION_CONFLICT');
  // Biểu mẫu BM-ISO: cấp công ty, nhóm tự tạo theo mã
  const id2 = uuid();
  r = tk.write('item.edit', { item_id: id2, code: 'BM-ISO-09-01', dept_code: 'ISO', name_vi: 'Biểu thử', name_zh: '测试表' });
  assert.equal(r.ok, true, JSON.stringify(r));
  const it3 = env.rows('Items').find((x) => x.item_id === id2);
  assert.equal(it3.level, 'COMPANY');
  assert.equal(it3.group_key, 'ISO-09');
  assert.ok(env.rows('Groups').some((g) => g.group_key === 'ISO-09'));
});
