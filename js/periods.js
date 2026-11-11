// Kỳ hồ sơ và tình trạng hồ sơ theo kỳ (phiên 1c, mục 5 và 6.3 đặc tả) — tính trên máy từ dữ liệu đã đồng bộ, dùng được khi mất mạng.
// GIỐNG HỆT máy chủ (server/src/10_dates.js periodOf_, lastPeriods_; 17_records.js itemRecordStatus_): test so hai bên trên cùng dữ liệu.
// Không import gì (Node chạy thẳng được trong test).
// Mã kỳ: ngày 2026-11-06 · tuần ISO 2026-W45 · tháng 2026-11 · quý 2026-Q4 · nửa năm 2026-H2 · năm 2026; EVENT (khi phát sinh) không có kỳ.
// Đợt 2 (2a): ngày có hồ sơ từ M&E / Checksheet (EVIDENCE, máy chủ 18_evidence.js) cũng làm ô ✓; biểu nơi làm M&E / Checksheet
// chỉ được tính khi app đó đã nối (cài đặt evidence_sources "ME,CS").

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

/** Nơi làm (cột R) → app cung cấp ngày có hồ sơ (như APP_SOURCE_ của máy chủ) */
export const APP_SOURCE = { ME: 'ME', ME_PART: 'ME', CS: 'CS', CS_PART: 'CS', CS_PROPOSED: 'CS' };
/** Giữ ngày có hồ sơ từ app kia bao nhiêu ngày theo loại kỳ (như EVIDENCE_KEEP_DAYS_ của máy chủ) */
export const EVIDENCE_KEEP_DAYS = { DAY: 62, WEEK: 126, MONTH: 400, QUARTER: 400, HALF: 400, YEAR: 400 };
export function evidenceSourceOf(it) { return (it && APP_SOURCE[it.where]) || ''; }
/** Ngày đầu của kỳ đầy đủ đầu tiên còn giữ ngày từ app kia (như evidenceFrom_ của máy chủ) */
export function evidenceFrom(type, today) {
  const keep = EVIDENCE_KEEP_DAYS[type];
  if (!keep) return '';
  return addDays(periodOf(type, addDays(today, -keep)).to, 1);
}
/** App đã nối: "ME,CS" (cài đặt evidence_sources) → {ME: true, CS: true} */
export function parseSources(s) {
  if (s && typeof s === 'object') return s;
  const out = {};
  for (const x of String(s || '').split(',')) { const k = x.trim(); if (k === 'ME' || k === 'CS') out[k] = true; }
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
 * Biểu có tính hồ sơ không (như recordCountInfo_ của máy chủ): {type, counted, reason, start, src}; reason NOT_ISSUED | FROM_APP | NO_START.
 * src: app đã nối cung cấp ngày có hồ sơ cho biểu — khi đó ngày bắt đầu tính không sớm hơn evidenceFrom (cần `today`).
 */
export function countInfo(it, startSetting = '', { today = '', sources = '' } = {}) {
  const type = itemPeriodType(it);
  const src = evidenceSourceOf(it);
  const live = !!(src && parseSources(sources)[src]);
  let reason = it.status !== 'ISSUED' ? 'NOT_ISSUED' : ((it.where === 'ME' || it.where === 'CS') && !live ? 'FROM_APP' : '');
  let start = reason ? '' : recordsStart(it, startSetting);
  if (!reason && !isDate(start)) { reason = 'NO_START'; start = ''; }
  if (!reason && live && type !== 'EVENT' && today) {
    const ef = evidenceFrom(type, today);
    if (ef > start) start = ef;
  }
  return { type, counted: !reason, reason, start, src: live ? src : '' };
}

/**
 * Ô của một kỳ p: {key, from, to, st, recs, pend, ev} — st OK · PEND · NA (không tính / trước ngày bắt đầu) · LATE · DUE.
 * evs: ngày có hồ sơ từ M&E / Checksheet của biểu (dòng EVIDENCE: period_from, period_to, count, last_date, source).
 */
export function periodCell(p, recs, pending, { counted, start, today, grace = 3, evs = [] }) {
  const hit = recs.filter((r) => covers(r, p));
  const pend = pending.filter((r) => covers(r, p));
  const ev = evs.filter((e) => Number(e.count) > 0 && covers(e, p));
  let st;
  if (hit.length || ev.length) st = 'OK';
  else if (pend.length) st = 'PEND';
  else if (!counted || p.to < start) st = 'NA';
  else st = addDays(p.to, grace) < today ? 'LATE' : 'DUE';
  return { key: p.key, from: p.from, to: p.to, st, recs: hit, pend, ev };
}

/**
 * Tình trạng hồ sơ của một biểu (như itemRecordStatus_ của máy chủ), thêm PEND = có hồ sơ đang chờ gửi trên máy này.
 * recs: hồ sơ SUBMITTED của biểu; pending: hồ sơ trong hàng chờ ({period_from, period_to}); evidence: dòng EVIDENCE của biểu;
 * sources: app đã nối ("ME,CS"). Trả {type, counted, reason, start, src, cells:[{key, from, to, st, recs, pend, ev}], due_key, due_st,
 * overdue, late_n, last_date, count, ev_n}. st: OK ✓ đúng hạn · PEND ✓ chờ gửi · LATE ! quá hạn · DUE – chưa tới hạn · NA không tính.
 * count = số hồ sơ + số lượt từ app kia (ev_n).
 */
export function itemRecordStatus(it, recs, { today, grace = 3, startSetting = '', n = 12, pending = [], evidence = [], sources = '' } = {}) {
  const { type, counted, reason, start, src } = countInfo(it, startSetting, { today, sources });
  const evs = evidence.filter((e) => Number(e.count) > 0);
  let last = '', evN = 0;
  for (const r of recs) { const d = String(r.period_to || r.record_date || ''); if (d > last) last = d; }
  for (const e of evs) { const d = String(e.last_date || ''); if (d > last) last = d; evN += Number(e.count) || 0; }
  const out = { type, counted, reason, start, src, cells: [], due_key: '', due_st: '', overdue: false, late_n: 0, last_date: last, count: recs.length + evN, ev_n: evN, pend_n: pending.length };
  if (type === 'EVENT') return out;
  const cellOf = (p) => periodCell(p, recs, pending, { counted, start, today, grace, evs });
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

/** Thứ Hai của tuần chứa ngày iso */
export function mondayOf(iso) {
  const dow = new Date(iso + 'T00:00:00Z').getUTCDay() || 7;
  return addDays(iso, 1 - dow);
}

/**
 * Lịch tuần của trang chủ (phiên 1d): hồ sơ đến hạn trong tuần bắt đầu từ Thứ Hai `mon`, chỉ biểu đang tính hồ sơ (● làm tay).
 * entries: [{it, recs, pending, evidence}] (recs: hồ sơ SUBMITTED của biểu; pending: hồ sơ chờ gửi trên máy; evidence: ngày có hồ sơ
 * từ M&E / Checksheet). sources: app đã nối ("ME,CS").
 * Trả {mon, sun, days: [7 ngày], daily: [{it, info, cells: [7 ô]}], agenda: [{date, list: [{it, info, cell, carry, deadline}]}]}.
 * - Biểu hằng ngày: 7 ô Thứ Hai … Chủ nhật (ô trước ngày bắt đầu tính là NA); biểu không có ô nào được tính thì bỏ.
 * - Kỳ khác (tuần, tháng, quý, nửa năm, năm): hiện ở ngày kết thúc kỳ nếu ngày đó trong tuần; kỳ đã kết thúc trước tuần mà hạn chót
 *   (ngày kết thúc + số ngày cho phép trễ) rơi vào tuần và còn thiếu hồ sơ → hiện ở ngày hạn chót (carry). Kỳ trước ngày bắt đầu tính bỏ qua.
 * - Biểu khi phát sinh không có hạn, không hiện.
 */
export function weekAgenda(entries, { mon, today, grace = 3, startSetting = '', sources = '' }) {
  const days = [];
  for (let i = 0; i < 7; i++) days.push(addDays(mon, i));
  const sun = days[6];
  const daily = [];
  const byDay = new Map(days.map((d) => [d, []]));
  for (const { it, recs = [], pending = [], evidence = [] } of entries) {
    const info = countInfo(it, startSetting, { today, sources });
    if (!info.counted || info.type === 'EVENT') continue;
    const o = { counted: true, start: info.start, today, grace, evs: evidence.filter((e) => Number(e.count) > 0) };
    if (info.type === 'DAY') {
      const cells = days.map((d) => periodCell(periodOf('DAY', d), recs, pending, o));
      if (cells.some((c) => c.st !== 'NA')) daily.push({ it, info, cells });
      continue;
    }
    const lo = addDays(mon, -grace);
    for (let p = periodOf(info.type, sun), g = 0; p && p.to >= lo && g < 60; p = prevPeriod(info.type, p), g++) {
      if (p.to > sun) continue;
      const cell = periodCell(p, recs, pending, o);
      if (cell.st === 'NA') continue;
      const deadline = addDays(p.to, grace);
      if (p.to >= mon) byDay.get(p.to).push({ it, info, cell, carry: false, deadline });
      else if (deadline >= mon && deadline <= sun && (cell.st === 'DUE' || cell.st === 'LATE')) byDay.get(deadline).push({ it, info, cell, carry: true, deadline });
    }
  }
  const agenda = days.map((date) => ({ date, list: byDay.get(date) })).filter((d) => d.list.length);
  return { mon, sun, days, daily, agenda };
}
