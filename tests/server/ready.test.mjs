// Kiểm tra ISO (js/readyx.js): biểu "Đã có" khi có tệp mẫu trong Kho tệp mẫu (kể cả chỉ có sheet phụ) hoặc in từ app M&E / Checksheet;
// Một phần / Đề xuất chưa có tệp mẫu vẫn thiếu; ✕ không tính; thứ tự theo nhóm → thứ tự danh mục → mã; đếm, lọc.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readyRows, readySummary, readyFilter } from '../../js/readyx.js';

const it = (code, o = {}) => ({ item_id: 'id-' + code, code, group_key: code.split('-').slice(1, 3).join('-'), status: 'DRAFTING', where: 'MANUAL', sort_order: 0, ...o });
const tpl = (set, n, sub = false) => ({ t: { document_id: 'doc-' + set, set_code: set, file_name: set + '.xlsx' }, s: { n, p: 'A4', o: 'P' }, sub });

test('Đã có / Thiếu, cách có, thứ tự, đếm, lọc', () => {
  const items = [
    it('BM-CĐ-08-01', { where: 'ME_PART', sort_order: 9 }),
    it('BM-CĐ-04-03', { where: 'ME', sort_order: 5 }),
    it('BM-CĐ-04-01', { sort_order: 4 }),
    it('BM-CĐ-03-03', { where: 'ME', sort_order: 3 }),
    it('BM-CĐ-02-05', { where: 'CS', sort_order: 2 }),
    it('BM-CĐ-07-02', { where: 'CS_PROPOSED', sort_order: 7 }),
    it('BM-CĐ-01-05', { status: 'NA', sort_order: 1 }),
    it('BM-CĐ-03-04', { status: 'NONE', sort_order: 3 })
  ];
  const byItem = new Map([
    ['id-BM-CĐ-04-03', [tpl('BM-CĐ-04', 'BM-CĐ-04-03'), tpl('BM-CĐ-04', 'BM-CĐ-04-03-TH', true)]],
    ['id-BM-CĐ-03-04', [tpl('BM-CĐ-03', 'BM-CĐ-03-04a', true)]]
  ]);
  const { rows, na } = readyRows(items, byItem);
  assert.deepEqual(na.map((x) => x.code), ['BM-CĐ-01-05'], '✕ không tính');
  assert.deepEqual(rows.map((r) => [r.it.code, r.have, r.how, r.app]), [
    ['BM-CĐ-02-05', true, 'CS', 'CS'],
    ['BM-CĐ-03-03', true, 'ME', 'ME'],
    ['BM-CĐ-03-04', true, 'TPL', ''],
    ['BM-CĐ-04-01', false, '', ''],
    ['BM-CĐ-04-03', true, 'TPL', 'ME'],
    ['BM-CĐ-07-02', false, '', ''],
    ['BM-CĐ-08-01', false, '', '']
  ]);
  assert.equal(rows.find((r) => r.it.code === 'BM-CĐ-04-03').tpl.s.n, 'BM-CĐ-04-03', 'sheet đúng mã trước sheet phụ');
  assert.equal(rows.find((r) => r.it.code === 'BM-CĐ-03-04').tpl.sub, true, 'chỉ có sheet phụ vẫn tính là có tệp mẫu (như Kho)');
  const s = readySummary(rows);
  assert.deepEqual(s, { total: 7, have: 4, missing: 3, pct: 57.1, TPL: 2, ME: 1, CS: 1 });
  assert.deepEqual(readyFilter(rows, 'MISSING').map((r) => r.it.code), ['BM-CĐ-04-01', 'BM-CĐ-07-02', 'BM-CĐ-08-01']);
  assert.equal(readyFilter(rows, 'HAVE').length, 4);
  assert.equal(readyFilter(rows, '').length, 7);
  assert.deepEqual(readySummary([]), { total: 0, have: 0, missing: 0, pct: 0, TPL: 0, ME: 0, CS: 0 });
});
