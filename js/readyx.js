// Kiểm tra ISO (25/11/2026, người dùng yêu cầu "một danh mục mẫu khi cần kiểm tra ISO: nhìn vào biết thiếu biểu nào, biểu nào đã có").
// Không import gì (test Node chạy thẳng). Biểu "Đã có" = in được ngay khi đánh giá viên yêu cầu:
//   TPL — có tệp mẫu trong Kho tệp mẫu (sheet mang mã biểu, kể cả sheet phụ -TD / -TH / -ML, a…i; như "X/Y biểu có tệp mẫu" của Kho);
//   ME / CS — biểu in từ app M&E / Checksheet (nơi làm M&E, Checksheet; "Một phần" / "Đề xuất" chưa tính — phần còn lại cần mẫu giấy).
// Biểu ✕ Không áp dụng không tính. Tình trạng ban hành ○ ◐ ● chỉ là thông tin kèm theo, không quyết định Có / Thiếu.

export const READY_HOW = ['TPL', 'ME', 'CS'];
// MISSING thiếu mẫu · HAVE có mẫu · TODO chưa làm (chưa có hồ sơ) · DONE đã làm (26/11/2026)
export const READY_FILTERS = ['', 'MISSING', 'HAVE', 'TODO', 'DONE'];

/** Thứ tự: nhóm (group_key) → thứ tự danh mục → mã */
function cmp(a, b) {
  return String(a.group_key || '').localeCompare(String(b.group_key || ''), 'vi', { numeric: true })
    || (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.code).localeCompare(String(b.code), 'vi', { numeric: true });
}

/**
 * items: biểu đang xem (đã lọc phạm vi); byItem: Map(item_id → [{t, s, sub}]) của Kho tệp mẫu (tplMap, sheet đúng mã trước sheet phụ);
 * doneMap: Map(item_id → {last, n, src}) biểu đã có hồ sơ (data.js recordsDoneMap). Đã làm = có ít nhất một hồ sơ.
 * Trả {rows: [{it, have, how: 'TPL'|'ME'|'CS'|'', tpl: {t, s, sub}|null, app: 'ME'|'CS'|'', done: {last, n, src}|null}], na: [biểu ✕]}.
 */
export function readyRows(items, byItem, doneMap) {
  const rows = [], na = [];
  for (const it of (items || []).slice().sort(cmp)) {
    if (it.status === 'NA') { na.push(it); continue; }
    const list = (byItem && byItem.get(it.item_id)) || [];
    const tpl = list[0] || null;
    const app = it.where === 'ME' ? 'ME' : it.where === 'CS' ? 'CS' : '';
    const how = tpl ? 'TPL' : app;
    rows.push({ it, have: !!how, how, tpl, app, done: (doneMap && doneMap.get(it.item_id)) || null });
  }
  return { rows, na };
}

/** Đếm: {total, have, missing, pct (0–100, một số lẻ), TPL, ME, CS, done, todo, donePct} */
export function readySummary(rows) {
  const out = { total: rows.length, have: 0, missing: 0, pct: 0, TPL: 0, ME: 0, CS: 0, done: 0, todo: 0, donePct: 0 };
  for (const r of rows) {
    if (r.have) { out.have++; out[r.how]++; } else out.missing++;
    if (r.done) out.done++; else out.todo++;
  }
  const pct = (n) => (out.total ? Math.round((n / out.total) * 1000) / 10 : 0);
  out.pct = pct(out.have);
  out.donePct = pct(out.done);
  return out;
}

/** Lọc: thiếu mẫu / có mẫu / chưa làm / đã làm */
export function readyFilter(rows, f) {
  if (f === 'MISSING') return rows.filter((r) => !r.have);
  if (f === 'HAVE') return rows.filter((r) => r.have);
  if (f === 'TODO') return rows.filter((r) => !r.done);
  if (f === 'DONE') return rows.filter((r) => r.done);
  return rows;
}
