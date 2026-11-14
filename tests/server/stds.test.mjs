// ISO 14001 / 45001 / 50001 (thêm 14/11/2026 — công ty có đủ ba chứng nhận): cập nhật máy chủ từ bản 4c (Clauses chỉ có ISO 9001 + BRCGS
// từ file Excel tổng) — dán Code.gs, chạy migrateSchema: nạp điều khoản ba chuẩn, nhật ký đúng dòng; chạy lại không nạp trùng; quên
// migrateSchema thì trigger nền (autoMigrate_) tự nạp; chuẩn đã có dòng (đã nhập / đã sửa / đã ngừng) thì không đụng; Trạng thái hệ thống.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient } from '../helpers.mjs';

const NOW = '2026-11-14T08:00:00+07:00';

/** Máy chủ như bản 4c: dữ liệu mẫu (ISO 9001 + BRCGS), chưa có điều khoản ba chuẩn mới, schema_version 1.0.13 */
function server4c() {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  env.g.dbReset_();
  env.g.withWriteLock_(() => {
    env.g.resetRewrite_('Clauses', env.g.readRows_('Clauses').filter((c) => c.std === 'ISO9001' || c.std === 'BRC'));
    const st = env.g.readState_();
    env.g.stateWrite_(st, { schema_version: ['STRING', '1.0.13'] });
  });
  env.g.cache_().removeAll(['sys:state']);
  env.g.dbReset_();
  return { env, owner };
}
const count = (env) => { env.g.dbReset_(); const cl = env.rows('Clauses'); return ['ISO9001', 'BRC', 'ISO14001', 'ISO45001', 'ISO50001'].map((s) => cl.filter((c) => c.std === s).length); };

test('migrateSchema từ bản 4c: nạp 26 + 30 + 27 điều khoản, nhật ký đúng dòng; chạy lại "Thêm: không có"; app nhận qua đồng bộ', () => {
  const { env, owner } = server4c();
  assert.deepEqual(count(env), [11, 6, 0, 0, 0]);
  let h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'clauses');
  assert.equal(h.status, 'WARN');
  assert.equal(h.note, 'Chạy migrateSchema để nạp điều khoản ISO 14001, ISO 45001, ISO 50001');
  const rev0 = Number(owner.call('sync.changes', { cursor: 0 }).data.next_cursor);
  env.logs.length = 0;
  env.g.migrateSchema();
  assert.ok(env.logs.includes('migrateSchema xong. Thêm: điều khoản ISO 14001 (26); điều khoản ISO 45001 (30); điều khoản ISO 50001 (27). schema_version=1.0.14'), env.logs.join('\n'));
  assert.deepEqual(count(env), [11, 6, 26, 30, 27]);
  env.logs.length = 0;
  env.g.migrateSchema();
  assert.ok(env.logs.includes('migrateSchema xong. Thêm: không có. schema_version=1.0.14'), env.logs.join('\n'));
  assert.deepEqual(count(env), [11, 6, 26, 30, 27]);
  // Đồng bộ: app đang mở nhận điều khoản mới
  const ch = owner.call('sync.changes', { cursor: rev0 });
  assert.equal(ch.ok, true, JSON.stringify(ch));
  assert.equal(ch.data.changes.filter((x) => x.entity_type === 'CLAUSE' && x.op === 'UPSERT').length, 83);
  h = owner.call('system.status', {}).data.checks.find((x) => x.key === 'clauses');
  assert.equal(h.status, 'OK');
  assert.equal(h.value, 'ISO 9001: 11 · ISO 14001: 26 · ISO 45001: 30 · ISO 50001: 27 · BRCGS: 6');
  const cov = owner.call('system.status', {}).data.checks.find((x) => x.key === 'coverage');
  assert.match(cov.value, /^ISO 9001: \d+\/11 điều khoản có biểu · bắt buộc chưa có biểu \d+ · ISO 14001: 0\/26 điều khoản có biểu · bắt buộc chưa có biểu 16 · ISO 45001: 0\/30 .* · ISO 50001: 0\/27 .* · BRCGS: \d+\/6 chủ đề có biểu$/);
});

test('quên migrateSchema: trigger nền tự nạp; chuẩn đã có dòng (kể cả đã ngừng dùng) không nạp lại', () => {
  const { env } = server4c();
  // ISO 45001 đã nhập tay một điều khoản (rồi ngừng dùng) → không nạp chuẩn đó
  env.g.systemWrite_([{ sheet: 'Clauses', mode: 'insert', row: env.g.cNewSystem_({ clause_id: 'ISO45001|8.1', std: 'ISO45001', key: '8.1', group_vi: '', group_zh: '',
    name_vi: 'Vận hành', name_zh: '运行', mandatory_record: true, sort_order: 1, active: false }) }]);
  env.g.dbReset_();
  assert.equal(env.g.autoMigrate_(), true);
  assert.deepEqual(count(env), [11, 6, 26, 1, 27]);
  assert.equal(env.g.autoMigrate_(), false, 'schema_version đã đúng');
});
