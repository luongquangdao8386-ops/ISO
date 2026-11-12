// Kết nối M&E / Checksheet (Đợt 2, phiên 2a): feed.isoEvidence giả của hai app, thử kết nối trước khi lưu, gom ngày có hồ sơ theo kỳ
// của biểu ISO (sheet Evidence), mỗi giờ chỉ ghi dòng đổi, ô ✓ từ Evidence ở record.status = js/periods.js, mã biểu lạ báo ở
// Trạng thái hệ thống, quyền (Quản trị, PIN sau khi kiểm quyền), ngắt kết nối.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshServer, ownerClient, userClient, uuid, OWNER_PIN } from '../helpers.mjs';
import { itemRecordStatus, evidenceFrom } from '../../js/periods.js';
import { ME_URL, CS_URL, ME_KEY, CS_KEY, fakeApps, daysBetween } from '../feed-mock.mjs';

const NOW = '2026-11-11T08:00:00+07:00'; // Thứ Tư

function setItem(env, code, patch) {
  const g = env.g;
  g.dbReset_();
  const it = g.readRows_('Items').find((x) => x.code === code);
  const row = { ...it, ...patch, record_version: (it.record_version || 0) + 1 };
  delete row.__row;
  g.systemWrite_([{ sheet: 'Items', mode: 'update', row }]);
  g.dbReset_();
}

function seeded() {
  const env = freshServer({ now: NOW });
  const owner = ownerClient(env);
  env.g.dbReset_();
  env.g.seedSample_('SYSTEM');
  // Biểu in từ M&E / Checksheet đã ban hành, tính hồ sơ từ 01/06/2026
  for (const code of ['BM-CĐ-04-03', 'BM-CĐ-03-03', 'BM-CĐ-02-05']) setItem(env, code, { status: 'ISSUED', current_rev: '01', issued_at: '2026-06-01', records_from: '2026-06-01', issued_source: '' });
  return { env, owner };
}

/** Dữ liệu feed mặc định */
function feedData() {
  const skip = new Set(['2026-11-05', '2026-11-06', '2026-11-07']);
  const me = daysBetween('2026-08-01', '2026-11-10').filter((d) => !skip.has(d)).map((d) => ({ form_code: 'BM-CĐ-04-03', date: d, count: 2 }));
  me.push({ form_code: 'BM-CĐ-04-03', date: '2025-01-01', count: 1 }); // quá 400 ngày: app kia không gửi
  me.push({ form_code: 'BM-CĐ-03-03a', date: '2026-09-15', count: 1 }, { form_code: 'bm-cd-03-03B', date: '2026-10-20', count: 1 },
    { form_code: 'BM-CĐ-03-03', date: '2026-10-25', count: 1 });
  me.push({ form_code: 'BM-CĐ-08-01', date: '2026-11-02', count: 1 }); // Một phần M&E, ◐
  me.push({ form_code: 'BM-XX-99-99', date: '2026-11-01', count: 1 }, { form_code: 'BM-XX-99-99', date: '2026-11-02', count: 1 }); // không có trong danh mục
  me.push({ form_code: 'BM-CĐ-04-03', date: '2026-11-06', count: 0 }); // 0 lượt: bỏ qua
  const cs = daysBetween('2026-11-01', '2026-11-10').map((d) => ({ form_code: 'BM-CĐ-02-05', date: d, count: 1 }));
  cs.push({ form_code: 'bm-kv-01-03', date: '2026-11-09', count: 3 }); // Đề xuất Checksheet, biểu ○
  cs.push({ form_code: 'BM-KD-02-01', date: '2026-03-01', count: 1 }, { form_code: 'BM-KD-02-01', date: '2026-10-01', count: 1 }); // khi phát sinh
  return { ME: me, CS: cs };
}

const item = (env, code) => env.rows('Items').find((x) => x.code === code);
const evRows = (env, src) => env.rows('Evidence').filter((r) => (!src || r.source === src) && !r.archived_at);
function statusOf(c, env, code) {
  const r = c.call('record.status', { item_id: item(env, code).item_id });
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.data.items[0];
}
const cellMap = (s) => Object.fromEntries(s.cells.map((x) => [x.key, x.st]));

/** Máy chủ (record.status) và app (js/periods.js, dữ liệu như đồng bộ xuống) cho cùng kết quả trên mọi biểu */
function assertSameAsClient(env, owner) {
  const srv = owner.call('record.status', {});
  assert.equal(srv.ok, true, JSON.stringify(srv));
  const boot = owner.call('sync.bootstrap', {}).data;
  const evs = (boot.records.EVIDENCE || []);
  const recs = (boot.records.RECORD || []).filter((r) => r.status === 'SUBMITTED');
  const items = boot.records.ITEM;
  assert.equal(boot.settings.evidence_sources, srv.data.sources);
  for (const s of srv.data.items) {
    const it = items.find((x) => x.item_id === s.item_id);
    const c = itemRecordStatus(it, recs.filter((r) => r.item_id === it.item_id), {
      today: srv.data.today, grace: boot.settings.record_grace_days, startSetting: boot.settings.records_start_date || '',
      evidence: evs.filter((e) => e.item_id === it.item_id), sources: boot.settings.evidence_sources
    });
    const pick = (o) => ({ type: o.type, counted: o.counted, reason: o.reason, start: o.start, src: o.src, cells: o.cells.map((x) => x.key + ':' + x.st).join(','),
      due: o.due_key + ':' + o.due_st, overdue: o.overdue, late_n: o.late_n, last: o.last_date, count: o.count });
    assert.deepEqual(pick(c), pick(s), it.code);
  }
  return srv.data;
}

test('khoảng còn giữ ngày từ app kia: ngày 62, tuần 126, tháng/quý/nửa năm/năm 400 ngày (kỳ đầy đủ); máy chủ = app', () => {
  const env = freshServer({ now: NOW });
  const exp = { DAY: '2026-09-11', WEEK: '2026-07-13', MONTH: '2025-11-01', QUARTER: '2026-01-01', HALF: '2026-01-01', YEAR: '2026-01-01' };
  for (const [t, d] of Object.entries(exp)) {
    assert.equal(evidenceFrom(t, '2026-11-11'), d, t);
    assert.equal(env.g.evidenceFrom_(t, '2026-11-11'), d, t);
  }
  assert.equal(evidenceFrom('EVENT', '2026-11-11'), '');
  // Ghép mã: Đ ≡ D, hoa/thường, đuôi a…i / -KT về mã cha
  const idx = env.g.evItemIndex_([{ item_id: 'a', code: 'BM-CĐ-03-03' }, { item_id: 'b', code: 'BM-CĐ-07-06' }, { item_id: 'c', code: 'BM-CĐ-07-07a' }]);
  const m = (c) => { const it = env.g.evMatchItem_(idx, c); return it ? it.item_id : null; };
  assert.equal(m('bm-cd-03-03'), 'a');
  assert.equal(m('BM-CĐ-03-03i'), 'a');
  assert.equal(m('BM-CĐ-07-06-KT'), 'b');
  assert.equal(m('BM-CĐ-07-07a'), 'c');
  assert.equal(m('BM-CĐ-07-07b'), null);
  assert.equal(m('BM-CĐ-99-01'), null);
});

test('kết nối: Quản trị + PIN (kiểm quyền và dạng link trước PIN); thử kết nối không lưu; sai mã / link sai app → không lưu gì', () => {
  const { env, owner } = seeded();
  const st = fakeApps(env, feedData());
  const head = userClient(env, 'CD3', 3, '583924', { depts: 'CĐ' });
  const tk = userClient(env, 'TK2', 2, '583922', { depts: 'ISO', secretary: true });
  // Không phải Quản trị: FORBIDDEN, không bị hỏi PIN
  assert.equal(head.write('link.set', { source: 'ME', exec_url: ME_URL, key: ME_KEY }).code, 'FORBIDDEN');
  assert.equal(tk.write('link.set', { source: 'ME', exec_url: ME_URL, key: ME_KEY }).code, 'FORBIDDEN');
  assert.equal(tk.call('link.info', {}).code, 'FORBIDDEN');
  assert.equal(head.call('link.test', { source: 'ME', exec_url: ME_URL, key: ME_KEY }).code, 'FORBIDDEN');
  // Link sai dạng: báo ngay, chưa hỏi PIN
  let r = owner.write('link.set', { source: 'ME', exec_url: 'https://example.com/exec', key: 'ngan' });
  assert.equal(r.code, 'VALIDATION_ERROR');
  assert.deepEqual(r.errors.map((e) => e.code).sort(), ['KEY_FORMAT', 'URL_INVALID']);
  assert.equal(owner.write('link.set', { source: 'XX', exec_url: ME_URL, key: ME_KEY }).code, 'VALIDATION_ERROR');
  assert.equal(owner.write('link.set', { source: 'ME', exec_url: ME_URL, key: ME_KEY }).code, 'REAUTH_REQUIRED');
  // Thử kết nối: sai mã → FORBIDDEN của app kia; đúng → số liệu, không ghi gì
  r = owner.call('link.test', { source: 'ME', exec_url: ME_URL, key: 'saiMa_' + 'z'.repeat(30) });
  assert.equal(r.code, 'LINK_FAILED');
  assert.equal(r.data.reason, 'FORBIDDEN');
  r = owner.call('link.test', { source: 'ME', exec_url: ME_URL, key: ME_KEY });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.test.matched, 3);
  assert.deepEqual(r.data.test.unknown, [{ code: 'BM-XX-99-99', n: 2 }]);
  assert.equal(env.props.getProperty('ME_EXEC_URL'), null);
  assert.equal(env.g.sheetExists_('Evidence') ? env.rows('Evidence').length : 0, 0);
  // Hợp đồng gọi: POST feed.isoEvidence {key, since = hôm nay − 400, client ISO}
  const last = st.calls[st.calls.length - 1].body;
  assert.equal(last.action, 'feed.isoEvidence');
  assert.equal(last.api_contract_version, '1.0');
  assert.deepEqual(last.payload, { key: ME_KEY, since: '2025-10-07', client: 'ISO' });
  assert.match(last.device_id, /^[0-9a-f-]{36}$/);
  // Lưu với PIN: sai mã → không lưu
  owner.pin(OWNER_PIN);
  r = owner.write('link.set', { source: 'ME', exec_url: ME_URL, key: 'saiMa_' + 'z'.repeat(30) });
  assert.equal(r.code, 'LINK_FAILED');
  assert.equal(env.props.getProperty('ME_EXEC_URL'), null);
  // Link của M&E dán vào ô Checksheet → WRONG_APP
  r = owner.write('link.set', { source: 'CS', exec_url: ME_URL, key: ME_KEY });
  assert.equal(r.code, 'LINK_FAILED');
  assert.equal(r.data.reason, 'WRONG_APP');
  // Link trả trang web (không phải /exec của app) → NO_RESPONSE
  r = owner.call('link.test', { source: 'CS', exec_url: 'https://script.google.com/macros/s/TESTONLY_fake_khac_deployment_0/exec', key: CS_KEY });
  assert.equal(r.data.reason, 'NO_RESPONSE');
  assert.equal(env.g.setting_('evidence_sources'), '');
});

test('nối M&E: gom ngày có hồ sơ theo kỳ của biểu, mã con về mã cha, mã lạ báo ở Trạng thái hệ thống; ô ✓ / ! đúng; máy chủ = app', () => {
  const { env, owner } = seeded();
  fakeApps(env, feedData());
  // Trước khi nối: biểu in từ M&E chưa tính
  assert.equal(statusOf(owner, env, 'BM-CĐ-04-03').reason, 'FROM_APP');
  owner.pin(OWNER_PIN);
  const r = owner.write('link.set', { source: 'ME', exec_url: ME_URL, key: ME_KEY });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.linked, true);
  assert.equal(r.data.sync.matched, 3);
  assert.equal(r.data.trigger, true);
  assert.equal(env.props.getProperty('ME_EXEC_URL'), ME_URL);
  assert.equal(env.props.getProperty('ME_FEED_KEY'), ME_KEY);
  assert.equal(env.g.setting_('evidence_sources'), 'ME');
  assert.ok(env.g.ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === 'syncEvidenceHourly'));
  // Sổ dừng máy (hằng ngày): giữ 62 ngày → 11/09 … 10/11 trừ 3 ngày thiếu = 58 dòng; 0 lượt bỏ qua
  const daily = evRows(env, 'ME').filter((e) => e.item_id === item(env, 'BM-CĐ-04-03').item_id);
  assert.equal(daily.length, 61 - 3);
  assert.equal(daily.map((e) => e.period_key).sort()[0], '2026-09-11');
  const d1 = daily.find((e) => e.period_key === '2026-11-06');
  assert.equal(d1, undefined, '0 lượt thì không có dòng');
  const d2 = daily.find((e) => e.period_key === '2026-11-10');
  assert.deepEqual([d2.evidence_id.split('|')[0], d2.period_from, d2.period_to, d2.count, d2.last_date, d2.form_code, d2.period_type], ['ME', '2026-11-10', '2026-11-10', 2, '2026-11-10', 'BM-CĐ-04-03', 'DAY']);
  // Phiếu bảo trì (tháng): mã con 03-03a, 03-03B (viết D, chữ thường) về 03-03
  const monthly = evRows(env, 'ME').filter((e) => e.item_id === item(env, 'BM-CĐ-03-03').item_id).sort((a, b) => a.period_key.localeCompare(b.period_key));
  assert.deepEqual(monthly.map((e) => [e.period_key, e.period_from, e.period_to, e.count, e.last_date]),
    [['2026-09', '2026-09-01', '2026-09-30', 1, '2026-09-15'], ['2026-10', '2026-10-01', '2026-10-31', 2, '2026-10-25']]);
  assert.equal(monthly[1].src_codes, 'BM-CĐ-03-03, bm-cd-03-03B');
  // Bảng kỳ hằng ngày: 05–07/11 thiếu → !, hôm nay –; kỳ đến hạn xét 07/11 quá hạn
  let s = statusOf(owner, env, 'BM-CĐ-04-03');
  assert.equal(s.counted, true);
  assert.equal(s.reason, '');
  assert.equal(s.src, 'ME');
  assert.equal(s.start, '2026-09-11');
  let m = cellMap(s);
  for (const d of ['2026-10-31', '2026-11-01', '2026-11-04', '2026-11-08', '2026-11-10']) assert.equal(m[d], 'OK', d);
  for (const d of ['2026-11-05', '2026-11-06', '2026-11-07']) assert.equal(m[d], 'LATE', d);
  assert.equal(m['2026-11-11'], 'DUE');
  assert.equal(s.overdue, true);
  assert.equal(s.last_date, '2026-11-10');
  // Hằng tháng: 06–08 không có phiếu → !, 09–10 ✓, 11 chưa tới hạn; trước 06 không tính
  s = statusOf(owner, env, 'BM-CĐ-03-03');
  m = cellMap(s);
  assert.deepEqual([m['2026-05'], m['2026-06'], m['2026-07'], m['2026-08'], m['2026-09'], m['2026-10'], m['2026-11']], ['NA', 'LATE', 'LATE', 'LATE', 'OK', 'OK', 'DUE']);
  assert.equal(s.overdue, false);
  assert.equal(s.count, 3);
  // Một phần M&E đang soạn (◐): ô ✓ hiện, không tính quá hạn
  s = statusOf(owner, env, 'BM-CĐ-08-01');
  assert.equal(s.reason, 'NOT_ISSUED');
  assert.equal(cellMap(s)['2026-11'], 'OK');
  // Checksheet chưa nối: biểu Checksheet vẫn "in từ app, chưa tính"
  assert.equal(statusOf(owner, env, 'BM-CĐ-02-05').reason, 'FROM_APP');
  // Mã lạ: link.info và Trạng thái hệ thống
  const info = owner.call('link.info', {}).data;
  assert.equal(info.sources.ME.linked, true);
  assert.equal(info.sources.ME.last_status, 'OK');
  assert.equal(info.sources.ME.exec_url_tail, '…' + ME_URL.slice(-14));
  assert.ok(!JSON.stringify(info).includes(ME_KEY), 'không lộ mã kết nối');
  assert.deepEqual(info.sources.ME.unknown, [{ code: 'BM-XX-99-99', n: 2 }]);
  assert.equal(info.sources.CS.linked, false);
  const health = owner.call('system.status', {}).data.checks;
  const hm = health.find((x) => x.key === 'link_me');
  assert.equal(hm.status, 'OK');
  assert.match(hm.note, /BM-XX-99-99 \(2\)/);
  assert.equal(health.find((x) => x.key === 'link_cs').value, 'OFF');
  // link.set đã tự cài trigger mỗi giờ; thiếu thì Trạng thái hệ thống báo, installTriggers cài lại đủ 3
  assert.equal(health.find((x) => x.key === 'triggers').status, 'OK');
  const SA = env.g.ScriptApp;
  SA.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'syncEvidenceHourly').forEach((t) => SA.deleteTrigger(t));
  assert.equal(owner.call('system.status', {}).data.checks.find((x) => x.key === 'triggers').status, 'WARN');
  env.g.installTriggers();
  assert.deepEqual(SA.getProjectTriggers().map((t) => t.getHandlerFunction()).sort(), ['backupData', 'runBackgroundJobs', 'sendDueMail', 'syncEvidenceHourly']);
  assert.equal(owner.call('system.status', {}).data.checks.find((x) => x.key === 'triggers').status, 'OK');
  // Nhật ký: link.set ghi đuôi link, không ghi mã
  const au = env.rows('AuditLogs').find((a) => a.action === 'link.set');
  assert.ok(au && !JSON.stringify(au).includes(ME_KEY));
  assertSameAsClient(env, owner);
});

test('nối Checksheet: biểu Checksheet được tính; Đề xuất Checksheet ○ có ô ✓; biểu khi phát sinh một dòng; đồng bộ theo phạm vi bộ phận', () => {
  const { env, owner } = seeded();
  fakeApps(env, feedData());
  owner.pin(OWNER_PIN);
  assert.equal(owner.write('link.set', { source: 'CS', exec_url: CS_URL, key: CS_KEY }).ok, true);
  assert.equal(env.g.setting_('evidence_sources'), 'CS');
  let s = statusOf(owner, env, 'BM-CĐ-02-05');
  assert.equal(s.counted, true);
  const m = cellMap(s);
  assert.equal(m['2026-10-31'], 'LATE');
  for (const d of daysBetween('2026-11-01', '2026-11-10')) assert.equal(m[d], 'OK', d);
  assert.equal(m['2026-11-11'], 'DUE');
  s = statusOf(owner, env, 'BM-KV-01-03');
  assert.equal(s.counted, false);
  assert.equal(cellMap(s)['2026-11-09'], 'OK');
  assert.equal(s.count, 3);
  const evRow = evRows(env, 'CS').find((e) => e.item_id === item(env, 'BM-KD-02-01').item_id);
  assert.deepEqual([evRow.period_type, evRow.period_key, evRow.period_from, evRow.period_to, evRow.count, evRow.last_date], ['EVENT', '', '2026-03-01', '2026-10-01', 2, '2026-10-01']);
  assert.equal(evRow.evidence_id.split('|')[2], 'EVENT');
  s = statusOf(owner, env, 'BM-KD-02-01');
  assert.equal(s.last_date, '2026-10-01');
  assert.equal(s.count, 2);
  // Nối thêm M&E: cả hai
  assert.equal(owner.write('link.set', { source: 'ME', exec_url: ME_URL, key: ME_KEY }).ok, true);
  assert.equal(env.g.setting_('evidence_sources'), 'ME,CS');
  // Đồng bộ xuống app: cơ điện thấy dòng của biểu CĐ; SX không; cấp 1 không
  const cd = userClient(env, 'CD2', 2, '583920', { depts: 'CĐ' });
  const sx = userClient(env, 'SX2', 2, '583925', { depts: 'SX' });
  const look = userClient(env, 'CD1', 1, '583929', { depts: 'CĐ' });
  const cdEv = cd.call('sync.bootstrap', {}).data.records.EVIDENCE || [];
  const cdItems = new Set(cdEv.map((e) => e.item_id));
  assert.ok(cdItems.has(item(env, 'BM-CĐ-04-03').item_id));
  assert.ok(!cdItems.has(item(env, 'BM-KV-01-03').item_id));
  assert.equal((sx.call('sync.bootstrap', {}).data.records.EVIDENCE || []).length, 0);
  assert.equal((look.call('sync.bootstrap', {}).data.records.EVIDENCE || []).length, 0);
  assertSameAsClient(env, owner);
});

test('mỗi giờ: chỉ ghi dòng đổi (thêm, sửa, bỏ), app nhận qua sync.changes; không đổi thì không ghi; lỗi mạng giữ dữ liệu cũ, báo ở Trạng thái hệ thống', () => {
  const { env, owner } = seeded();
  const data = feedData();
  const st = fakeApps(env, data);
  owner.pin(OWNER_PIN);
  assert.equal(owner.write('link.set', { source: 'ME', exec_url: ME_URL, key: ME_KEY }).ok, true);
  const cursor = Number(owner.call('sync.changes', { cursor: 0 }).data.next_cursor);
  const before = env.rows('Evidence');
  // Không đổi: không ghi
  env.g.syncEvidenceHourly();
  assert.equal(Number(owner.call('sync.changes', { cursor }).data.next_cursor), cursor);
  // Đổi: thêm 05/11 và hôm nay của sổ dừng máy, bớt 25/10 của phiếu bảo trì (tháng 10 còn 1 lượt), bỏ hết 08-01
  data.ME.push({ form_code: 'BM-CĐ-04-03', date: '2026-11-05', count: 1 }, { form_code: 'BM-CĐ-04-03', date: '2026-11-11', count: 1 });
  data.ME = data.ME.filter((x) => !(x.form_code === 'BM-CĐ-03-03' && x.date === '2026-10-25') && x.form_code !== 'BM-CĐ-08-01');
  const r = owner.write('evidence.sync', {});
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual([r.data.results.ME.ok, r.data.results.ME.sync.added, r.data.results.ME.sync.updated, r.data.results.ME.sync.removed], [true, 2, 1, 1]);
  const ch = owner.call('sync.changes', { cursor }).data.changes.filter((c) => c.entity_type === 'EVIDENCE');
  assert.equal(ch.length, 4);
  assert.equal(ch.filter((c) => c.op === 'TOMBSTONE').length, 1);
  // Dòng không đổi giữ nguyên mốc đồng bộ
  const after = env.rows('Evidence');
  const keep = before.find((e) => e.period_key === '2026-10-15');
  assert.equal(after.find((e) => e.evidence_id === keep.evidence_id).sync_revision, keep.sync_revision);
  assert.equal(cellMap(statusOf(owner, env, 'BM-CĐ-04-03'))['2026-11-05'], 'OK');
  // Lỗi mạng (chặng chuyển hướng thành GET): dữ liệu cũ giữ nguyên, Trạng thái hệ thống báo lỗi
  st.mode = 'redirect';
  const n0 = evRows(env).length;
  env.g.syncEvidenceHourly();
  assert.equal(evRows(env).length, n0);
  const info = owner.call('link.info', {}).data.sources.ME;
  assert.equal(info.last_status, 'FAILED');
  assert.equal(info.last_error, 'NO_RESPONSE');
  assert.ok(info.ok_at);
  assert.equal(owner.call('system.status', {}).data.checks.find((x) => x.key === 'link_me').status, 'WARN');
  assert.equal(owner.write('evidence.sync', { source: 'ME' }).data.results.ME.reason, 'NO_RESPONSE');
  // Có mạng lại: hết cảnh báo
  st.mode = '';
  env.g.syncEvidenceHourly();
  assert.equal(owner.call('link.info', {}).data.sources.ME.last_status, 'OK');
  assertSameAsClient(env, owner);
});

test('ngắt kết nối: xóa link + mã, bỏ dòng Evidence của app đó, biểu M&E về "chưa tính"; trigger mỗi giờ không làm gì khi chưa nối', () => {
  const { env, owner } = seeded();
  const st = fakeApps(env, feedData());
  env.g.syncEvidenceHourly();
  assert.equal(st.calls.length, 0, 'chưa nối thì không gọi');
  owner.pin(OWNER_PIN);
  assert.equal(owner.write('link.set', { source: 'ME', exec_url: ME_URL, key: ME_KEY }).ok, true);
  assert.equal(owner.write('link.set', { source: 'CS', exec_url: CS_URL, key: CS_KEY }).ok, true);
  const cursor = Number(owner.call('sync.changes', { cursor: 0 }).data.next_cursor);
  const r = owner.write('link.set', { source: 'ME', clear: true });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(r.data.removed > 50);
  assert.equal(env.props.getProperty('ME_EXEC_URL'), null);
  assert.equal(env.props.getProperty('ME_FEED_KEY'), null);
  assert.equal(env.g.setting_('evidence_sources'), 'CS');
  assert.equal(evRows(env, 'ME').length, 0);
  assert.ok(evRows(env, 'CS').length > 0);
  assert.equal(statusOf(owner, env, 'BM-CĐ-04-03').reason, 'FROM_APP');
  assert.equal(statusOf(owner, env, 'BM-CĐ-02-05').counted, true);
  // Cài đặt đổi → app tải lại (settings_rev), dòng bỏ là TOMBSTONE
  const ch = owner.call('sync.changes', { cursor }).data;
  assert.ok(ch.changes.some((c) => c.entity_type === 'EVIDENCE' && c.op === 'TOMBSTONE'));
  assertSameAsClient(env, owner);
});

test('dòng đã bỏ quá 35 ngày (từ 200 dòng) được xóa hẳn khỏi sheet Evidence', () => {
  const { env, owner } = seeded();
  const days = daysBetween('2026-09-01', '2026-11-10');
  const data = { ME: [] };
  for (const code of ['BM-CĐ-04-03', 'BM-SX-01-01', 'BM-SX-02-01', 'BM-SX-02-03']) for (const d of days) data.ME.push({ form_code: code, date: d, count: 1 });
  fakeApps(env, data);
  owner.pin(OWNER_PIN);
  assert.equal(owner.write('link.set', { source: 'ME', exec_url: ME_URL, key: ME_KEY }).ok, true);
  assert.equal(evRows(env, 'ME').length, 4 * 61);
  data.ME = [];
  env.g.syncEvidenceHourly();
  assert.equal(evRows(env, 'ME').length, 0);
  assert.equal(env.rows('Evidence').length, 4 * 61, 'mới bỏ: còn dòng để máy nhận lệnh xóa');
  env.clock.advance(36 * 86400000);
  env.g.syncEvidenceHourly();
  assert.equal(env.rows('Evidence').length, 0);
});

test('dán Code.gs 2a chưa chạy migrateSchema: đăng nhập/đồng bộ chạy; nối kết nối tự thêm sheet Evidence', () => {
  const { env, owner } = seeded();
  fakeApps(env, feedData());
  // Giả lập máy chủ 1d: chưa có sheet Evidence, schema cũ
  const g = env.g;
  g.dbReset_();
  const book = g.book_('B');
  book.deleteSheet(book.getSheetByName('Evidence'));
  g.withWriteLock_(() => g.stateWrite_(g.readState_(), { schema_version: ['STRING', '1.0.2'] }, 'TEST'));
  g.cache_().remove('sys:state');
  g.dbReset_();
  assert.equal(g.sheetExists_('Evidence'), false);
  assert.equal(owner.call('sync.bootstrap', {}).ok, true);
  assert.equal(owner.call('record.status', {}).ok, true);
  owner.pin(OWNER_PIN);
  const r = owner.write('link.set', { source: 'ME', exec_url: ME_URL, key: ME_KEY });
  assert.equal(r.ok, true, JSON.stringify(r));
  g.dbReset_();
  assert.equal(g.sheetExists_('Evidence'), true);
  assert.ok(evRows(env, 'ME').length > 0);
  assert.equal(g.stateGet_(g.readState_(), 'schema_version', ''), g.SCHEMA_VERSION);
});
