/* 10_dates: ngày theo giờ Việt Nam, ngày "hôm nay" giả ở THỬ (TEST_TODAY), kỳ hồ sơ.
 * Mã kỳ (mục 5 đặc tả): ngày 2026-11-06 · tuần ISO 2026-W45 · tháng 2026-11 · quý 2026-Q4 · nửa năm 2026-H2 · năm 2026.
 * Tình trạng hồ sơ theo kỳ (đúng hạn / quá hạn / chưa tới hạn): 17_records.js. App tính giống hệt ở js/periods.js
 * (test so hai bên trên cùng dữ liệu). */

function todayVN_() {
  if (isTestEnv_()) {
    var t = prop_('TEST_TODAY');
    if (t && isDateStr_(t)) return t;
  }
  return dateVN_(now_());
}

function addDaysIso_(iso, n) {
  var d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Cộng tháng, ngày cuối tháng thì giữ ngày cuối tháng (31/01 + 1 tháng = 28/02 hoặc 29/02) */
function addMonthsIso_(iso, n) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return '';
  var y = Number(m[1]), mo = Number(m[2]) - 1 + n, d = Number(m[3]);
  var ty = y + Math.floor(mo / 12), tm = ((mo % 12) + 12) % 12;
  var last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return ty + '-' + pad2_(tm + 1) + '-' + pad2_(Math.min(d, last));
}

/** Tuần ISO (Thứ Hai đầu tuần): 2026-W45 */
function isoWeekKey_(iso) {
  var d = new Date(iso + 'T00:00:00Z');
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thứ Năm của tuần quyết định năm
  var y = d.getUTCFullYear();
  var w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return y + '-W' + (w < 10 ? '0' : '') + w;
}

/** Loại kỳ từ chu kỳ hồ sơ (ngày): 1 → DAY, 7 → WEEK, 31 → MONTH, 92 → QUARTER, 183 → HALF, 366 → YEAR; trống → EVENT */
function periodTypeFromDays_(days) {
  if (days === null || days === undefined || days === '') return 'EVENT';
  var n = Number(days);
  if (!isFinite(n) || n <= 0) return 'EVENT';
  if (n <= 1) return 'DAY';
  if (n <= 7) return 'WEEK';
  if (n <= 31) return 'MONTH';
  if (n <= 92) return 'QUARTER';
  if (n <= 183) return 'HALF';
  return 'YEAR';
}

/** Mã kỳ của một ngày theo loại kỳ */
function periodKeyOf_(type, iso) {
  var y = iso.slice(0, 4), m = Number(iso.slice(5, 7));
  switch (type) {
    case 'DAY': return iso;
    case 'WEEK': return isoWeekKey_(iso);
    case 'MONTH': return iso.slice(0, 7);
    case 'QUARTER': return y + '-Q' + Math.ceil(m / 3);
    case 'HALF': return y + '-H' + (m <= 6 ? 1 : 2);
    case 'YEAR': return y;
    default: return '';
  }
}

function lastDayOfMonth_(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Kỳ chứa một ngày: {key, from, to} (ngày đầu, ngày cuối của kỳ). Tuần ISO từ Thứ Hai tới Chủ nhật.
 * EVENT (khi phát sinh) không có kỳ → null.
 */
function periodOf_(type, iso) {
  var y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7));
  var ys = iso.slice(0, 4);
  switch (type) {
    case 'DAY': return { key: iso, from: iso, to: iso };
    case 'WEEK': {
      var dow = new Date(iso + 'T00:00:00Z').getUTCDay() || 7;
      var from = addDaysIso_(iso, 1 - dow);
      return { key: isoWeekKey_(iso), from: from, to: addDaysIso_(from, 6) };
    }
    case 'MONTH': return { key: iso.slice(0, 7), from: iso.slice(0, 7) + '-01', to: iso.slice(0, 7) + '-' + pad2_(lastDayOfMonth_(y, m)) };
    case 'QUARTER': {
      var q = Math.ceil(m / 3);
      return { key: ys + '-Q' + q, from: ys + '-' + pad2_(3 * q - 2) + '-01', to: ys + '-' + pad2_(3 * q) + '-' + pad2_(lastDayOfMonth_(y, 3 * q)) };
    }
    case 'HALF': return m <= 6 ? { key: ys + '-H1', from: ys + '-01-01', to: ys + '-06-30' } : { key: ys + '-H2', from: ys + '-07-01', to: ys + '-12-31' };
    case 'YEAR': return { key: ys, from: ys + '-01-01', to: ys + '-12-31' };
    default: return null;
  }
}

/** n kỳ gần nhất tới kỳ chứa `today`, cũ → mới */
function lastPeriods_(type, today, n) {
  var out = [];
  var p = periodOf_(type, today);
  for (var i = 0; p && i < n; i++) {
    out.unshift(p);
    p = periodOf_(type, addDaysIso_(p.from, -1));
  }
  return out;
}

/** Số ngày từ a tới b (ISO) */
function daysBetweenIso_(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}
