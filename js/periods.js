// Kỳ hồ sơ và tình trạng hồ sơ theo kỳ (phiên 1c, mục 5 và 6.3 đặc tả) — tính trên máy từ dữ liệu đã đồng bộ, dùng được khi mất mạng.
// GIỐNG HỆT máy chủ (server/src/10_dates.js periodOf_, lastPeriods_; 17_records.js itemRecordStatus_): test so hai bên trên cùng dữ liệu.
// Không import gì (Node chạy thẳng được trong test).
// Mã kỳ: ngày 2026-11-06 · tuần ISO 2026-W45 · tháng 2026-11 · quý 2026-Q4 · nửa năm 2026-H2 · năm 2026; EVENT (khi phát sinh) không có kỳ.

export const PERIOD_TYPES = ['DAY', 'WEEK', 'MONTH', 'QUARTER', 'HALF', 'YEAR', 'EVENT'];
const p2 = (n) => (n < 10 ? '0' : '') + n;

export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}
export function isDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Tuần ISO (Thứ Hai đầu tuần): 2026-W45 */
export function isoWeekKey(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const y = d.getUTCFullYear();
  const w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return y + '-W' + (w < 10 ? '0' : '') + w;
}

/** Loại kỳ từ chu kỳ hồ sơ (ngày): 1 → DAY, 7 → WEEK, 31 → MONTH, 92 → QUARTER, 183 → HALF, 366 → YEAR; trống → EVENT */
export function periodTypeFromDays(days) {
  if (days === null || days === undefined || days === '') return 'EVENT';
  const n = Number(days);
  if (!isFinite(n) || n <= 0) return 'EVENT';
  return n <= 1 ? 'DAY' : n <= 7 ? 'WEEK' : n <= 31 ? 'MONTH' : n <= 92 ? 'QUARTER' : n <= 183 ? 'HALF' : 'YEAR';
}
export function itemPeriodType(it) {
  return PERIOD_TYPES.includes(it && it.period_type) ? it.period_type : periodTypeFromDays(it && it.period_days);
}

/** Kỳ chứa một ngày: {key, from, to}; EVENT → null */
export function periodOf(type, iso) {
  const y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7)), ys = iso.slice(0, 4);
  switch (type) {
    case 'DAY': return { key: iso, from: iso, to: iso };
    case 'WEEK': {
      const dow = new Date(iso + 'T00:00:00Z').getUTCDay() || 7;
      const from = addDays(iso, 1 - dow);
      return { key: isoWeekKey(iso), from, to: addDays(from, 6) };
    }
    case 'MONTH': return { key: iso.slice(0, 7), from: iso.slice(0, 7) + '-01', to: iso.slice(0, 7) + '-' + p2(lastDay(y, m)) };
    case 'QUARTER': {
      const q = Math.ceil(m / 3);
      return { key: ys + '-Q' + q, from: ys + '-' + p2(3 * q - 2) + '-01', to: ys + '-' + p2(3 * q) + '-' + p2(lastDay(y, 3 * q)) };
    }
    case 'HALF': return m <= 6 ? { key: ys + '-H1', from: ys + '-01-01', to: ys + '-06-30' } : { key: ys + '-H2', from: ys + '-07-01', to: ys + '-12-31' };
    case 'YEAR': return { key: ys, from: ys + '-01-01', to: ys + '-12-31' };
    default: return null;
  }
}
export function prevPeriod(type, p) { return periodOf(type, addDays(p.from, -1)); }
export function nextPeriod(type, p) { return periodOf(type, addDays(p.to, 1)); }

/** n kỳ gần nhất tới kỳ chứa `today`, cũ → mới */
export function lastPeriods(type, today, n = 12) {
  const out = [];
  let p = periodOf(type, today);
  for (let i = 0; p && i < n; i++) { out.unshift(p); p = prevPeriod(type, p); }
  return out;
}

/** Các kỳ giao với khoảng ngày [from, to] (tối đa `max` kỳ), cũ → mới */
export function periodsInRange(type, from, to, max = 400) {
  const out = [];
  if (!isDate(from) || !isDate(to) || from > to) return out;
  let p = periodOf(type, from);
  while (p && p.from <= to && out.length < max) { out.push(p); p = nextPeriod(type, p); }
  return out;
}

/** Ngày bắt đầu tính hồ sơ (như recordsStart_ của máy chủ) */
export function recordsStart(it, startSetting) {
  if (it.records_from) return String(it.records_from);
  if (it.issued_source === 'IMPORT') {
    if (startSetting && it.issued_at && String(it.issued_at) > startSetting) return String(it.issued_at);
    return startSetting || String(it.issued_at || '');
  }
  return String(it.issued_at || '');
}

/** Hồ sơ (khoảng [period_from, period_to]) có phủ kỳ p không: giao nhau là có */
export function covers(r, p) { return String(r.period_from) <= p.to && String(r.period_to) >= p.from; }

/**
 * Tình trạng hồ sơ của một biểu (như itemRecordStatus_ của máy chủ), thêm PEND = có hồ sơ đang chờ gửi trên máy này.
 * recs: hồ sơ SUBMITTED của biểu; pending: hồ sơ trong hàng chờ ({period_from, period_to}).
 * Trả {type, counted, reason, start, cells:[{key, from, to, st, recs, pend}], due_key, due_st, overdue, late_n, last_date, count}.
 * st: OK ✓ đúng hạn · PEND ✓ chờ gửi · LATE ! quá hạn · DUE – chưa tới hạn · NA không tính.
 */
export function itemRecordStatus(it, recs, { today, grace = 3, startSetting = '', n = 12, pending = [] } = {}) {
  const type = itemPeriodType(it);
  let reason = it.status !== 'ISSUED' ? 'NOT_ISSUED' : (it.where === 'ME' || it.where === 'CS' ? 'FROM_APP' : '');
  let start = reason ? '' : recordsStart(it, startSetting);
  if (!reason && !isDate(start)) { reason = 'NO_START'; start = ''; }
  const counted = !reason;
  let last = '';
  for (const r of recs) { const d = String(r.period_to || r.record_date || ''); if (d > last) last = d; }
  const out = { type, counted, reason, start, cells: [], due_key: '', due_st: '', overdue: false, late_n: 0, last_date: last, count: recs.length, pend_n: pending.length };
  if (type === 'EVENT') return out;
  const cellOf = (p) => {
    const hit = recs.filter((r) => covers(r, p));
    const pend = pending.filter((r) => covers(r, p));
    let st;
    if (hit.length) st = 'OK';
    else if (pend.length) st = 'PEND';
    else if (!counted || p.to < start) st = 'NA';
    else st = addDays(p.to, grace) < today ? 'LATE' : 'DUE';
    return { key: p.key, from: p.from, to: p.to, st, recs: hit, pend };
  };
  for (const p of lastPeriods(type, today, n)) {
    const c = cellOf(p);
    if (c.st === 'LATE') out.late_n++;
    out.cells.push(c);
  }
  if (counted) {
    let p = periodOf(type, today);
    for (let g = 0; g < 800 && p && !(addDays(p.to, grace) < today); g++) p = prevPeriod(type, p);
    if (p && p.to >= start) {
      out.due_key = p.key;
      out.due_st = cellOf(p).st;
      out.overdue = out.due_st === 'LATE';
    }
  }
  return out;
}

/** Nhãn đầu cột của kỳ, hai dòng [chính, phụ]: ngày 31 / 10 · tuần W46 / 26 · tháng 11 / 26 · quý Q4 / 26 · nửa năm H2 / 26 · năm 2026 */
export function periodTicks(type, p) {
  switch (type) {
    case 'DAY': return [p.from.slice(8, 10), p.from.slice(5, 7)];
    case 'WEEK': return ['W' + p.key.slice(-2), p.key.slice(2, 4)];
    case 'MONTH': return [p.key.slice(5, 7), p.key.slice(2, 4)];
    case 'QUARTER': case 'HALF': return [p.key.slice(-2), p.key.slice(2, 4)];
    case 'YEAR': return [p.key, ''];
    default: return ['', ''];
  }
}
