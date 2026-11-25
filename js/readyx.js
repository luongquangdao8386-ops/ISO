// Kiểm tra ISO (25/11/2026, người dùng yêu cầu "một danh mục mẫu khi cần kiểm tra ISO: nhìn vào biết thiếu biểu nào, biểu nào đã có").
// Không import gì (test Node chạy thẳng). Biểu "Đã có" = in được ngay khi đánh giá viên yêu cầu:
//   TPL — có tệp mẫu trong Kho tệp mẫu (sheet mang mã biểu, kể cả sheet phụ -TD / -TH / -ML, a…i; như "X/Y biểu có tệp mẫu" của Kho);
//   ME / CS — biểu in từ app M&E / Checksheet (nơi làm M&E, Checksheet; "Một phần" / "Đề xuất" chưa tính — phần còn lại cần mẫu giấy).
// Biểu ✕ Không áp dụng không tính. Tình trạng ban hành ○ ◐ ● chỉ là thông tin kèm theo, không quyết định Có / Thiếu.

export const READY_HOW = ['TPL', 'ME', 'CS'];
export const READY_FILTERS = ['', 'MISSING', 'HAVE'];

/** Thứ tự: nhóm (group_key) → thứ tự danh mục → mã */
function cmp(a, b) {
  return String(a.group_key || '').localeCompare(String(b.group_key || ''), 'vi', { numeric: true })
    || (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.code).localeCompare(String(b.code), 'vi', { numeric: true });
}

/**
 * items: biểu đang xem (đã lọc phạm vi); byItem: Map(item_id → [{t, s, sub}]) của Kho tệp mẫu (tplMap, sheet đúng mã trước sheet phụ).
 * Trả {rows: [{it, have, how: 'TPL'|'ME'|'CS'|'', tpl: {t, s, sub}|null, app: 'ME'|'CS'|''}], na: [biểu ✕]}.
 */
export function readyRows(items, byItem) {
  const rows = [], na = [];
  for (const it of (items || []).slice().sort(cmp)) {
    if (it.status === 'NA') { na.push(it); continue; }
    const list = (byItem && byItem.get(it.item_id)) || [];
    const tpl = list[0] || null;
    const app = it.where === 'ME' ? 'ME' : it.where === 'CS' ? 'CS' : '';
    const how = tpl ? 'TPL' : app;
    rows.push({ it, have: !!how, how, tpl, app });
  }
  return { rows, na };
}

/** Đếm: {total, have, missing, pct (0–100, một số lẻ), TPL, ME, CS} */
export function readySummary(rows) {
  const out = { total: rows.length, have: 0, missing: 0, pct: 0, TPL: 0, ME: 0, CS: 0 };
  for (const r of rows) {
    if (r.have) { out.have++; out[r.how]++; } else out.missing++;
  }
  out.pct = out.total ? Math.round((out.have / out.total) * 1000) / 10 : 0;
  return out;
}

/** Lọc theo Có / Thiếu */
export function readyFilter(rows, f) {
  return f === 'MISSING' ? rows.filter((r) => !r.have) : f === 'HAVE' ? rows.filter((r) => r.have) : rows;
}
