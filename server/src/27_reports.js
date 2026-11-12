/* 27_reports: Báo cáo (Đợt 2, phiên 2c; mục "Nhắc hạn, báo cáo, tem QR" của đặc tả).
 * 4 báo cáo, số liệu do máy chủ tính (một nguồn cho bản xem trước, PDF và Excel):
 *  - CATALOG  Danh mục tài liệu hiện hành theo bộ phận (thay BM-ISO-02-01): mã, tên, lần ban hành, ngày ban hành, hiệu lực từ, hạn rà soát.
 *  - RECORDS  Tình trạng hồ sơ theo bộ phận và kỳ (tháng hoặc quý): mỗi biểu một dòng, mỗi tháng/quý một cột; ô gom các kỳ của biểu
 *             (✓ / ! / – với biểu một kỳ trong cột, "đúng hạn/số kỳ" với biểu ngày, tuần…; biểu khi phát sinh: số lần nộp).
 *  - COVERAGE Phủ điều khoản ISO 9001 và BRCGS (đếm như hai trang Phủ của file Excel tổng, js/coverage.js).
 *  - VERSIONS Lịch sử phiên bản của một tài liệu.
 *  - DIST     Sổ phân phối & thu hồi bản in (phiên 2d, thay BM-ISO-02-03): theo nơi nhận, lần ban hành, đang dùng / cần thu hồi / đã thu hồi.
 *  - DOCREQ   Phiếu đề nghị ban hành / sửa đổi / hủy tài liệu (phiên 2d, thay BM-ISO-02-02): một phiếu (request_id) hoặc sổ theo dõi theo năm.
 * report.run: xem trước (không ghi). report.save: lưu bản chụp (tệp JSON riêng tư trên Drive + dòng ReportRuns, mã BC-yymm-001) rồi
 * trả PDF (máy chủ dựng bằng Google Docs tạm, 28_report_pdf.js) hoặc bản chụp để app dựng Excel; gọi lại cùng report_run_id → cùng mã,
 * cùng số liệu. report.list: báo cáo đã lưu (người lập thấy của mình; Thư ký ISO, cấp 4 thấy tất cả).
 * Quyền: Danh mục, Lịch sử phiên bản — mọi cấp (trong phạm vi biểu); Tình trạng hồ sơ, Phủ điều khoản — cấp 2+ / Thư ký ISO
 * ("Xem tổng hợp, phủ điều khoản" ở bảng quyền). Cấp 1–3 chỉ có biểu trong bộ phận mình + tài liệu chung. */

var REPORT_KINDS_ = ['CATALOG', 'RECORDS', 'COVERAGE', 'VERSIONS', 'DIST', 'DOCREQ'];
var REPORT_SNAPSHOT_MAX_ = 4 * 1024 * 1024;
/** Biểu mẫu ISO mà báo cáo thay (in ở khối thông tin bên phải) */
var REPORT_FORM_CODE_ = { CATALOG: 'BM-ISO-02-01', DOCREQ: 'BM-ISO-02-02', DIST: 'BM-ISO-02-03' };
/** Tên tệp tải về */
var REPORT_SLUG_ = { CATALOG: 'danh-muc-tai-lieu', RECORDS: 'tinh-trang-ho-so', COVERAGE: 'phu-dieu-khoan', VERSIONS: 'lich-su-phien-ban', DIST: 'so-phan-phoi-thu-hoi', DOCREQ: 'de-nghi-tai-lieu' };
var REPORT_GRAINS_ = { MONTH: { def: 6, max: 12 }, QUARTER: { def: 4, max: 8 } };

/* ---------------- Quyền ---------------- */

/** Loại báo cáo người dùng được xem */
function reportKindAllowed_(u, kind) {
  if (REPORT_KINDS_.indexOf(kind) < 0) return false;
  if (kind === 'RECORDS' || kind === 'COVERAGE' || kind === 'DIST' || kind === 'DOCREQ') return isSecretary_(u) || Number(u.role_level) >= 2;
  return true;
}

/** Báo cáo đã lưu: người lập, Thư ký ISO, cấp 4 */
function reportRunVisible_(u, run) {
  return !!run && !run.archived_at && (run.generated_by === u.user_id || isSecretary_(u)) && reportKindAllowed_(u, run.kind);
}

/** Dán Code.gs 2c mà chưa chạy migrateSchema: lần lưu báo cáo đầu tiên tự thêm sheet ReportRuns */
function ensureReportSchema_() {
  if (sheetExists_('ReportRuns')) return;
  autoMigrate_();
  dbReset_();
  if (!sheetExists_('ReportRuns')) throw apiError_('SYSTEM_NOT_READY');
}

/* ---------------- Bộ lọc ---------------- */

/** Mã kỳ tháng (2026-11) hoặc quý (2026-Q4) → kỳ {key, from, to}; sai dạng → null */
function reportPeriodOfKey_(grain, key) {
  var s = String(key || '');
  if (grain === 'MONTH') {
    var m = /^(\d{4})-(\d{2})$/.exec(s);
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null;
    return periodOf_('MONTH', s + '-01');
  }
  var q = /^(\d{4})-Q([1-4])$/.exec(s);
  if (!q) return null;
  return periodOf_('QUARTER', q[1] + '-' + pad2_(Number(q[2]) * 3) + '-01');
}

/**
 * Bộ lọc chuẩn hóa theo loại báo cáo (chỉ khóa cho phép, giá trị mặc định); sai → VALIDATION_ERROR.
 *  CATALOG {dept, scope: ISSUED | ALL} · RECORDS {dept, grain: MONTH | QUARTER, end: 2026-11 | 2026-Q4, n}
 *  COVERAGE {dept, std: BOTH | ISO9001 | BRC, codes: true | false} · VERSIONS {item_id}
 */
function reportFilters_(kind, f, today) {
  f = f || {};
  var out = {}, errs = [];
  var dept = trimStr_(f.dept || '');
  if (kind === 'DOCREQ' && f.request_id) {
    if (!isUuidV4_(f.request_id)) throw validationError_([fieldError_('filters.request_id', 'ID_INVALID')]);
    return { request_id: String(f.request_id) };
  }
  if (kind !== 'VERSIONS') {
    if (dept) {
      var d = findOne_('Depts', 'dept_code', dept);
      if (!d) errs.push(fieldError_('filters.dept', 'INVALID_VALUE'));
    }
    out.dept = dept;
  }
  if (kind === 'CATALOG') {
    out.scope = f.scope === 'ALL' ? 'ALL' : 'ISSUED';
    if (f.scope && ['ALL', 'ISSUED'].indexOf(f.scope) < 0) errs.push(fieldError_('filters.scope', 'INVALID_VALUE'));
  } else if (kind === 'RECORDS') {
    var grain = f.grain || 'MONTH';
    if (!REPORT_GRAINS_[grain]) { errs.push(fieldError_('filters.grain', 'INVALID_VALUE')); grain = 'MONTH'; }
    out.grain = grain;
    var cur = periodOf_(grain, today);
    var end = f.end ? reportPeriodOfKey_(grain, f.end) : cur;
    if (!end) { errs.push(fieldError_('filters.end', 'INVALID_VALUE')); end = cur; }
    if (end.from > cur.from) errs.push(fieldError_('filters.end', 'INVALID_VALUE'));
    out.end = end.key;
    var n = f.n === undefined || f.n === null || f.n === '' ? REPORT_GRAINS_[grain].def : Number(f.n);
    if (!(n >= 1 && n <= REPORT_GRAINS_[grain].max) || Math.floor(n) !== n) { errs.push(fieldError_('filters.n', 'INVALID_VALUE')); n = REPORT_GRAINS_[grain].def; }
    out.n = n;
  } else if (kind === 'COVERAGE') {
    var std = f.std || 'BOTH';
    if (['BOTH', 'ISO9001', 'BRC'].indexOf(std) < 0) { errs.push(fieldError_('filters.std', 'INVALID_VALUE')); std = 'BOTH'; }
    out.std = std;
    out.codes = f.codes !== false;
  } else if (kind === 'VERSIONS') {
    if (!isUuidV4_(f.item_id)) errs.push(fieldError_('filters.item_id', 'REQUIRED'));
    out.item_id = f.item_id || '';
  } else if (kind === 'DIST') {
    var ds = f.state || 'ALL';
    if (['ALL', 'ACTIVE', 'DUE', 'RECALLED'].indexOf(ds) < 0) { errs.push(fieldError_('filters.state', 'INVALID_VALUE')); ds = 'ALL'; }
    out.state = ds;
  } else if (kind === 'DOCREQ') {
    var y = f.year === undefined || f.year === null || f.year === '' ? Number(today.slice(0, 4)) : Number(f.year);
    if (!(y >= 2000 && y <= Number(today.slice(0, 4))) || Math.floor(y) !== y) { errs.push(fieldError_('filters.year', 'INVALID_VALUE')); y = Number(today.slice(0, 4)); }
    out.year = y;
    var rs = f.state || 'ALL';
    if (['ALL', 'OPEN', 'DONE', 'REJECTED'].indexOf(rs) < 0) { errs.push(fieldError_('filters.state', 'INVALID_VALUE')); rs = 'ALL'; }
    out.state = rs;
  }
  if (errs.length) throw validationError_(errs);
  return out;
}

/* ---------------- Tiện ích ---------------- */

/** Thứ tự biểu như Danh mục: thứ tự trong file Excel, rồi mã */
function reportItemCmp_(a, b) {
  return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.code).localeCompare(String(b.code));
}

/** Bộ phận theo thứ tự hiển thị */
function reportDepts_() {
  return readRows_('Depts').filter(function (d) { return !d.archived_at; })
    .sort(function (a, b) { return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.dept_code).localeCompare(String(b.dept_code)); });
}

/** Biểu người dùng xem được (và quyền xem tổng hợp khi cần), lọc bộ phận */
function reportItems_(ctx, dept, needRecords) {
  return readRows_('Items').filter(function (it) {
    if (it.archived_at) return false;
    if (needRecords ? !canSeeRecords_(ctx.user, it) : !itemVisible_(ctx.user, it)) return false;
    return !dept || it.dept_code === dept;
  }).sort(reportItemCmp_);
}

/** Gom dòng theo bộ phận theo thứ tự bộ phận: [{dept_code, name_vi, name_zh, rows}] (bộ phận không có dòng thì bỏ) */
function reportGroupByDept_(rows, depts) {
  var by = {};
  rows.forEach(function (r) { (by[r.dept_code] = by[r.dept_code] || []).push(r); });
  var out = [];
  depts.forEach(function (d) {
    if (!by[d.dept_code]) return;
    out.push({ dept_code: d.dept_code, name_vi: d.name_vi || '', name_zh: d.name_zh || '', rows: by[d.dept_code] });
    delete by[d.dept_code];
  });
  Object.keys(by).sort().forEach(function (k) { out.push({ dept_code: k, name_vi: k, name_zh: '', rows: by[k] }); });
  return out;
}

function reportPct_(a, b) {
  return b > 0 ? Math.round(a / b * 1000) / 10 : null;
}

function reportUserName_(dir, id) {
  if (!id) return '';
  if (id === SYSTEM_USER) return SYSTEM_USER;
  var u = dir[id];
  return u ? u.display_name : '';
}

/* ---------------- 1. Danh mục tài liệu hiện hành ---------------- */

function reportCatalog_(ctx, f, today) {
  var all = reportItems_(ctx, f.dept, false);
  var vers = sheetExists_('Versions') ? readRows_('Versions') : [];
  var vById = {};
  vers.forEach(function (v) { vById[v.version_id] = v; });
  var warn = Number(setting_('review_warn_days')) || 30;
  var soon = addDaysIso_(today, warn);
  var total = all.length, issued = 0, na = 0, overdue = 0, dueSoon = 0, noFile = 0;
  var rows = [];
  all.forEach(function (it) {
    if (it.status === 'ISSUED') issued++;
    if (it.status === 'NA') na++;
    var rs = '';
    if (it.status === 'ISSUED' && it.review_due) {
      if (String(it.review_due) < today) { rs = 'OVERDUE'; overdue++; } else if (String(it.review_due) <= soon) { rs = 'SOON'; dueSoon++; }
    }
    if (it.status === 'ISSUED' && it.file_missing) noFile++;
    if (f.scope === 'ISSUED' && it.status !== 'ISSUED') return;
    var cv = it.current_version_id ? vById[it.current_version_id] : null;
    rows.push({
      item_id: it.item_id, dept_code: it.dept_code, code: it.code, name_vi: it.name_vi || '', name_zh: it.name_zh || '',
      kind: it.kind || 'FORM', level: it.level || 'DEPT', status: it.status || 'NONE',
      rev: it.status === 'ISSUED' || it.status === 'NA' ? String(it.current_rev || (it.status === 'ISSUED' ? '01' : '')) : '',
      issued_at: it.status === 'ISSUED' || it.status === 'NA' ? String(it.issued_at || '') : '',
      effective_date: it.status === 'ISSUED' ? String((cv && cv.state === 'ISSUED' && cv.effective_date) || it.issued_at || '') : '',
      review_due: it.status === 'ISSUED' ? String(it.review_due || '') : '', review_state: rs,
      file_missing: !!(it.status === 'ISSUED' && it.file_missing), keep: it.keep || '', where: it.where || ''
    });
  });
  return {
    data: { depts: reportGroupByDept_(rows, reportDepts_()), counts: { total: total, issued: issued, na: na, shown: rows.length, review_overdue: overdue, review_soon: dueSoon, file_missing: noFile } },
    rows: rows.length,
    tiles: [
      { k: 'rpt.t.items', v: String(total) },
      { k: 'rpt.t.issued', v: String(issued) },
      { k: 'rpt.t.issued_pct', v: reportPct_(issued, total - na) === null ? '—' : String(reportPct_(issued, total - na)).replace('.', ',') + ' %' },
      { k: 'rpt.t.review_overdue', v: String(overdue), tone: overdue ? 'red' : '' }
    ]
  };
}

/* ---------------- 2. Tình trạng hồ sơ theo bộ phận và kỳ ---------------- */

/**
 * Ô của một biểu trong một cột (tháng/quý): gom các kỳ của biểu rơi vào cột (kỳ gán vào cột chứa ngày kết thúc kỳ; kỳ kết thúc sau
 * khoảng báo cáo gán vào cột cuối). Không tính kỳ bắt đầu sau hôm nay và kỳ NA. Trả {t: chữ trong ô, s: OK | LATE | DUE | ''}.
 */
function reportCellText_(n, ok, late) {
  if (!n) return { t: '', s: '' };
  if (n === 1) return ok ? { t: '✓', s: 'OK' } : (late ? { t: '!', s: 'LATE' } : { t: '–', s: 'DUE' });
  return { t: (late ? '! ' : '') + ok + '/' + n, s: late ? 'LATE' : (ok === n ? 'OK' : 'DUE') };
}

function reportRecords_(ctx, f, today) {
  var grain = f.grain;
  var endP = reportPeriodOfKey_(grain, f.end);
  var cols = [endP];
  while (cols.length < f.n) cols.unshift(periodOf_(grain, addDaysIso_(cols[0].from, -1)));
  var rangeFrom = cols[0].from, rangeTo = cols[cols.length - 1].to;
  var colOf = function (d) {
    for (var i = cols.length - 1; i >= 0; i--) if (d >= cols[i].from) return d <= cols[i].to ? i : -1;
    return -1;
  };
  var grace = graceDays_();
  var startSet = String(setting_('records_start_date') || '');
  var srcs = evidenceSources_();
  var recsBy = {}, evBy = {};
  if (sheetExists_('Records')) readRows_('Records').forEach(function (r) { if (!r.archived_at && r.status === 'SUBMITTED') (recsBy[r.item_id] = recsBy[r.item_id] || []).push(r); });
  if (sheetExists_('Evidence')) readRows_('Evidence').forEach(function (e) { if (!e.archived_at && Number(e.count) > 0) (evBy[e.item_id] = evBy[e.item_id] || []).push(e); });
  var notCounted = { NOT_ISSUED: 0, NA: 0, FROM_APP: 0, NO_START: 0 };
  var rows = [];
  reportItems_(ctx, f.dept, true).forEach(function (it) {
    var recs = recsBy[it.item_id] || [], evs = evBy[it.item_id] || [];
    var ci = recordCountInfo_(it, startSet, today, srcs);
    var cells = [], ok = 0, late = 0, due = 0, any = false;
    var row = { item_id: it.item_id, dept_code: it.dept_code, code: it.code, name_vi: it.name_vi || '', name_zh: it.name_zh || '', type: ci.type, src: ci.src,
      counted: ci.counted, status: it.status || 'NONE' };
    if (ci.type === 'EVENT') {
      var cnt = cols.map(function () { return 0; });
      recs.forEach(function (r) {
        var d = String(r.record_date || r.period_to || '');
        var k = colOf(d);
        if (k >= 0) { cnt[k]++; any = true; }
      });
      cells = cnt.map(function (c) { return c ? { t: String(c), s: 'EV' } : { t: '', s: '' }; });
      row.events = cnt.reduce(function (a, b) { return a + b; }, 0);
      var evN = 0, evFrom = '', evTo = '';
      evs.forEach(function (e) {
        if (String(e.period_to) < rangeFrom || String(e.period_from) > rangeTo) return;
        evN += Number(e.count) || 0;
        if (!evFrom || String(e.period_from) < evFrom) evFrom = String(e.period_from);
        if (String(e.period_to) > evTo) evTo = String(e.period_to);
      });
      if (evN) { row.ev = { src: ci.src || evidenceSourceOf_(it), count: evN, from: evFrom, to: evTo }; any = true; }
    } else {
      var acc = cols.map(function () { return { n: 0, ok: 0, late: 0 }; });
      var p = periodOf_(ci.type, rangeFrom);
      for (var g = 0; p && p.from <= rangeTo && g < 800; g++) {
        if (p.from <= today) {
          var s = periodCellState_(p, recs, evs, ci.counted, ci.start, today, grace);
          if (s !== 'NA') {
            var k = colOf(p.to < rangeTo ? p.to : rangeTo);
            if (k >= 0) {
              acc[k].n++;
              if (s === 'OK') { acc[k].ok++; ok++; } else if (s === 'LATE') { acc[k].late++; late++; } else due++;
              if (s === 'OK') any = true;
            }
          }
        }
        p = periodOf_(ci.type, addDaysIso_(p.to, 1));
      }
      cells = acc.map(function (a) { return reportCellText_(a.n, a.ok, a.late); });
    }
    if (!ci.counted) {
      if (!any) {
        var why = ci.reason === 'NOT_ISSUED' ? (it.status === 'NA' ? 'NA' : 'NOT_ISSUED') : ci.reason;
        notCounted[why] = (notCounted[why] || 0) + 1;
        return;
      }
    }
    row.cells = cells;
    row.ok = ok; row.late = late; row.due = due; row.rate = reportPct_(ok, ok + late);
    rows.push(row);
  });
  var sumOf = function (list) {
    var s = { items: list.length, periodic: 0, events: 0, ok: 0, late: 0, due: 0, items_late: 0 };
    list.forEach(function (r) {
      if (r.type === 'EVENT') { s.events += r.events || 0; return; }
      s.periodic++;
      s.ok += r.ok; s.late += r.late; s.due += r.due;
      if (r.late) s.items_late++;
    });
    s.rate = reportPct_(s.ok, s.ok + s.late);
    return s;
  };
  var depts = reportGroupByDept_(rows, reportDepts_());
  depts.forEach(function (d) { d.sum = sumOf(d.rows); });
  var tot = sumOf(rows);
  return {
    data: {
      grain: grain, cols: cols.map(function (c) { return { key: c.key, from: c.from, to: c.to }; }), from: rangeFrom, to: rangeTo,
      depts: depts, totals: tot, not_counted: notCounted, grace: grace
    },
    rows: rows.length,
    tiles: [
      { k: 'rpt.t.tracked', v: String(tot.items) },
      { k: 'rpt.t.periods_due', v: String(tot.ok + tot.late) },
      { k: 'rpt.t.on_time', v: tot.rate === null ? '—' : String(tot.rate).replace('.', ',') + ' %', tone: tot.late ? '' : 'green' },
      { k: 'rpt.t.late', v: String(tot.late), tone: tot.late ? 'red' : '' }
    ]
  };
}

/* ---------------- 3. Phủ điều khoản ---------------- */

/** Bảng phủ một chuẩn — GIỐNG HỆT coverageRows() trong js/coverage.js (đếm như hai trang Phủ của file Excel tổng) */
function coverageRowsSrv_(items, clauses, std) {
  var isoKey = function (it) { return ';' + String(it.iso9001 || '').split(' ').join('') + ';'; };
  return clauses.filter(function (c) { return c.std === std && c.active !== false && !c.archived_at; })
    .sort(function (a, b) { return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.key).localeCompare(String(b.key)); })
    .map(function (c) {
      var key = String(c.key);
      var kl = key.toLowerCase();
      var hit = items.filter(function (it) {
        return std === 'BRC' ? !!key && String(it.brc_topics || '').toLowerCase().indexOf(kl) >= 0 : !!key && isoKey(it).indexOf(';' + key) >= 0;
      });
      var issued = hit.filter(function (it) { return it.status === 'ISSUED'; }).length;
      var mandatory = std === 'ISO9001' && !!c.mandatory_record;
      var state = !hit.length ? (mandatory ? 'MISSING' : 'NONE') : (issued ? 'OK' : 'NOT_ISSUED');
      return {
        key: key, group_vi: c.group_vi || '', group_zh: c.group_zh || '', name_vi: c.name_vi || '', name_zh: c.name_zh || '', mandatory: mandatory,
        n: hit.length, issued: issued, app: hit.filter(function (it) { return it.where === 'ME' || it.where === 'CS'; }).length, state: state,
        items: hit
      };
    });
}

function reportCoverage_(ctx, f) {
  var items = reportItems_(ctx, f.dept, true);
  var clauses = readRows_('Clauses');
  var stds = f.std === 'BOTH' ? ['ISO9001', 'BRC'] : [f.std];
  var tiles = [];
  var n = 0;
  var out = stds.map(function (std) {
    var rows = coverageRowsSrv_(items, clauses, std).map(function (r) {
      var o = { key: r.key, group_vi: r.group_vi, group_zh: r.group_zh, name_vi: r.name_vi, name_zh: r.name_zh, mandatory: r.mandatory,
        n: r.n, issued: r.issued, app: r.app, state: r.state };
      if (f.codes) o.codes = r.items.slice().sort(reportItemCmp_).map(function (it) { return { code: it.code, status: it.status || 'NONE' }; });
      return o;
    });
    var sum = { total: rows.length, mandatory: 0, MISSING: 0, NONE: 0, NOT_ISSUED: 0, OK: 0 };
    rows.forEach(function (r) { sum[r.state]++; if (r.mandatory) sum.mandatory++; });
    sum.covered = sum.total - sum.MISSING - sum.NONE;
    n += rows.length;
    if (std === 'ISO9001') {
      tiles.push({ k: 'rpt.t.iso_covered', v: sum.covered + '/' + sum.total });
      tiles.push({ k: 'rpt.t.iso_missing', v: String(sum.MISSING), tone: sum.MISSING ? 'red' : 'green' });
    } else {
      tiles.push({ k: 'rpt.t.brc_covered', v: sum.covered + '/' + sum.total });
    }
    tiles.push({ k: std === 'BRC' ? 'rpt.t.brc_not_issued' : 'rpt.t.iso_not_issued', v: String(sum.NOT_ISSUED), tone: sum.NOT_ISSUED ? 'amber' : '' });
    return { std: std, rows: rows, sum: sum };
  });
  return { data: { stds: out, codes: f.codes, items: items.length }, rows: n, tiles: tiles };
}

/* ---------------- 4. Lịch sử phiên bản ---------------- */

function reportVersions_(ctx, f) {
  var it = findOne_('Items', 'item_id', f.item_id);
  if (!it || it.archived_at) throw validationError_([fieldError_('filters.item_id', 'NOT_FOUND')]);
  if (!itemVisible_(ctx.user, it)) throw apiError_('FORBIDDEN');
  var dir = userDirectory_();
  var low = Number(ctx.user.role_level) < 2 && !isSecretary_(ctx.user);
  var list = (sheetExists_('Versions') ? readRows_('Versions') : []).filter(function (v) {
    if (v.archived_at || v.item_id !== it.item_id || v.state === 'CANCELLED') return false;
    return !low || v.state === 'ISSUED' || v.state === 'SUPERSEDED';
  }).sort(function (a, b) { return String(a.rev).localeCompare(String(b.rev)) || String(a.created_at).localeCompare(String(b.created_at)); });
  var rows = list.map(function (v) {
    return {
      rev: v.rev || '', vtype: v.vtype || 'REVISION', state: v.state, summary_vi: v.change_summary_vi || '', summary_zh: v.change_summary_zh || '',
      author: reportUserName_(dir, v.author_id), submitted_at: String(v.submitted_at || '').slice(0, 10),
      approved_by: reportUserName_(dir, v.approved_by), approved_at: String(v.approved_at || '').slice(0, 10),
      issued_by: reportUserName_(dir, v.issued_by), issued_at: String(v.issued_at || '').slice(0, 10),
      effective_date: v.state === 'ISSUED' || v.state === 'SUPERSEDED' ? String(v.effective_date || '').slice(0, 10) : '',
      superseded_at: String(v.superseded_at || '').slice(0, 10), has_pdf: !!v.pdf_doc_id
    };
  });
  var revs = {};
  list.forEach(function (v) { if (v.state === 'ISSUED' || v.state === 'SUPERSEDED') revs[v.rev] = true; });
  // Biểu ● nhập từ danh mục Excel: lần hiện hành chưa có phiên bản trong app → một dòng ghi chú
  var imported = it.status === 'ISSUED' && it.current_rev && !revs[it.current_rev] ? { rev: String(it.current_rev), issued_at: String(it.issued_at || ''), file_missing: !!it.file_missing } : null;
  if (imported) revs[imported.rev] = true;
  var d = findOne_('Depts', 'dept_code', it.dept_code) || {};
  var item = {
    item_id: it.item_id, code: it.code, name_vi: it.name_vi || '', name_zh: it.name_zh || '', dept_code: it.dept_code, dept_vi: d.name_vi || it.dept_code, dept_zh: d.name_zh || '',
    kind: it.kind || 'FORM', level: it.level || 'DEPT', status: it.status || 'NONE', current_rev: it.current_rev || '', issued_at: it.issued_at || '',
    review_due: it.status === 'ISSUED' ? it.review_due || '' : '', reviewed_at: String(it.reviewed_at || '').slice(0, 10), reviewed_by: reportUserName_(dir, it.reviewed_by),
    iso9001: it.iso9001 || '', brc_topics: it.brc_topics || '', flow: it.flow || '', keep: it.keep || '', owner: reportUserName_(dir, it.owner_user_id),
    na_reason: it.status === 'NA' ? it.na_reason || '' : '', issued_source: it.issued_source || ''
  };
  return {
    data: { item: item, rows: rows, imported: imported },
    rows: rows.length,
    tiles: [
      { k: 'rpt.t.current_rev', v: it.status === 'ISSUED' ? String(it.current_rev || '01') : '—' },
      { k: 'rpt.t.issued_at', v: it.status === 'ISSUED' && it.issued_at ? fmtDateVN_(it.issued_at) : '—' },
      { k: 'rpt.t.review_due', v: item.review_due ? fmtDateVN_(item.review_due) : '—' },
      { k: 'rpt.t.revisions', v: String(Object.keys(revs).length) }
    ]
  };
}

/* ---------------- 5. Sổ phân phối & thu hồi (2d) ---------------- */

function reportDist_(ctx, f, today) {
  var items = {};
  readRows_('Items').forEach(function (it) { items[it.item_id] = it; });
  var dir = userDirectory_();
  var days = Number(setting_('dist_recall_days')) || 7;
  var cnt = { active: 0, copies: 0, due: 0, overdue: 0, recalled: 0, docs: {} };
  var rows = [];
  (sheetExists_('Distributions') ? readRows_('Distributions') : []).forEach(function (d) {
    if (d.archived_at || d.state === 'VOID') return;
    var it = items[d.item_id];
    if (!canSeeRecords_(ctx.user, it)) return;
    if (f.dept && d.dept_code !== f.dept) return;
    var due = distDue_(d, it);
    var since = due ? distDueSince_(it) : '';
    var over = !!(due && since && addDaysIso_(since, days) < today);
    var st = d.state === 'RECALLED' ? 'RECALLED' : (due ? 'DUE' : 'ACTIVE');
    if (d.state === 'ACTIVE') { cnt.active++; cnt.copies += Number(d.copies) || 0; cnt.docs[d.item_id] = 1; }
    if (due) cnt.due++;
    if (over) cnt.overdue++;
    if (d.state === 'RECALLED') cnt.recalled++;
    if (f.state !== 'ALL' && f.state !== st) return;
    rows.push({
      dist_id: d.dist_id, item_id: d.item_id, dept_code: d.dept_code, code: it.code, name_vi: it.name_vi || '', name_zh: it.name_zh || '',
      sort: Number(it.sort_order) || 0, rev: String(d.rev || ''), cur_rev: itemCurRev_(it), holder: d.holder || '', copies: Number(d.copies) || 0,
      dist_date: String(d.dist_date || ''), dist_by: reportUserName_(dir, d.created_by), state: st, overdue: over, due_since: since,
      recalled_date: String(d.recalled_date || ''), recalled_by: reportUserName_(dir, d.recalled_by), note: [d.note, d.recall_note].filter(function (x) { return x; }).join(' · ')
    });
  });
  rows.sort(function (a, b) { return a.sort - b.sort || String(a.code).localeCompare(String(b.code)) || String(a.dist_date).localeCompare(String(b.dist_date)); });
  return {
    data: { depts: reportGroupByDept_(rows, reportDepts_()), counts: { active: cnt.active, copies: cnt.copies, due: cnt.due, overdue: cnt.overdue, recalled: cnt.recalled, docs: Object.keys(cnt.docs).length, shown: rows.length }, recall_days: days },
    rows: rows.length,
    tiles: [
      { k: 'rpt.t.dist_docs', v: String(Object.keys(cnt.docs).length) },
      { k: 'rpt.t.dist_copies', v: String(cnt.copies) },
      { k: 'rpt.t.dist_due', v: String(cnt.due), tone: cnt.overdue ? 'red' : (cnt.due ? 'amber' : '') },
      { k: 'rpt.t.dist_recalled', v: String(cnt.recalled) }
    ]
  };
}

/* ---------------- 6. Phiếu đề nghị tài liệu (2d) ---------------- */

/** Một phiếu → dòng báo cáo (tên tài liệu, người, kết quả, thực hiện) */
function reportReqRow_(r, items, vers, dir) {
  var it = r.item_id ? items[r.item_id] : null;
  var v = r.version_id ? vers[r.version_id] : null;
  return {
    request_id: r.request_id, code: r.code, req_type: r.req_type, dept_code: r.dept_code, level: r.level || 'DEPT', state: r.state,
    submitted_at: String(r.submitted_at || ''), requester: r.requester_name || reportUserName_(dir, r.submitted_by), entered_by: r.requester_name ? reportUserName_(dir, r.submitted_by) : '',
    item_code: it ? it.code : (r.new_code || ''), item_name_vi: it ? it.name_vi || '' : r.title_vi || '', item_name_zh: it ? it.name_zh || '' : r.title_zh || '',
    cur_rev: it ? itemCurRev_(it) : '', new_kind: r.new_kind || '',
    reason_vi: r.reason_vi || '', reason_zh: r.reason_zh || '', content_vi: r.content_vi || '', content_zh: r.content_zh || '', want_date: String(r.want_date || ''),
    decided_by: reportUserName_(dir, r.decided_by), decided_at: String(r.decided_at || ''), decide_note: r.decide_note || '',
    version_rev: v ? String(v.rev || '') : '', version_state: v ? v.state : '', done_at: String(r.done_at || ''), done_by: reportUserName_(dir, r.done_by), done_note: r.done_note || '',
    cancelled_at: String(r.cancelled_at || ''), cancel_reason: r.cancel_reason || ''
  };
}

function reportDocreq_(ctx, f) {
  var items = {}, vers = {};
  readRows_('Items').forEach(function (it) { items[it.item_id] = it; });
  if (sheetExists_('Versions')) readRows_('Versions').forEach(function (v) { vers[v.version_id] = v; });
  var dir = userDirectory_();
  var all = (sheetExists_('DocRequests') ? readRows_('DocRequests') : []).filter(function (r) { return !r.archived_at && docreqVisible_(ctx.user, r); });
  if (f.request_id) {
    var one = all.filter(function (r) { return r.request_id === f.request_id; })[0];
    if (!one) {
      var ex = sheetExists_('DocRequests') ? findOne_('DocRequests', 'request_id', f.request_id) : null;
      if (ex && !ex.archived_at) throw apiError_('FORBIDDEN');
      throw validationError_([fieldError_('filters.request_id', 'NOT_FOUND')]);
    }
    var row = reportReqRow_(one, items, vers, dir);
    return {
      data: { one: row }, rows: 1,
      tiles: [
        { k: 'rpt.t.req_type', v: lab_('dr.type.' + row.req_type) },
        { k: 'rpt.t.req_state', v: lab_('dr.state.' + row.state), tone: row.state === 'REJECTED' ? 'red' : (row.state === 'DONE' ? 'green' : (row.state === 'CANCELLED' ? 'muted' : 'amber')) },
        { k: 'rpt.t.req_date', v: fmtDateVN_(row.submitted_at) },
        { k: 'rpt.t.req_level', v: lab_('level_doc.' + row.level) }
      ]
    };
  }
  var y = String(f.year);
  var cnt = { total: 0, open: 0, approved: 0, done: 0, rejected: 0 };
  var rows = [];
  all.forEach(function (r) {
    if (String(r.submitted_at || '').slice(0, 4) !== y) return;
    if (f.dept && r.dept_code !== f.dept) return;
    if (r.state === 'CANCELLED' && f.state !== 'ALL') return;
    cnt.total++;
    if (r.state === 'SUBMITTED') cnt.open++;
    if (r.state === 'APPROVED') cnt.approved++;
    if (r.state === 'DONE') cnt.done++;
    if (r.state === 'REJECTED') cnt.rejected++;
    var grp = r.state === 'SUBMITTED' || r.state === 'APPROVED' ? 'OPEN' : r.state;
    if (f.state !== 'ALL' && f.state !== grp) return;
    rows.push(reportReqRow_(r, items, vers, dir));
  });
  rows.sort(function (a, b) { return String(a.code).localeCompare(String(b.code)); });
  return {
    data: { depts: reportGroupByDept_(rows, reportDepts_()), counts: cnt, year: f.year },
    rows: rows.length,
    tiles: [
      { k: 'rpt.t.req_total', v: String(cnt.total) },
      { k: 'rpt.t.req_open', v: String(cnt.open), tone: cnt.open ? 'amber' : '' },
      { k: 'rpt.t.req_approved', v: String(cnt.approved), tone: cnt.approved ? 'amber' : '' },
      { k: 'rpt.t.req_done', v: String(cnt.done), tone: cnt.done ? 'green' : '' }
    ]
  };
}

/* ---------------- Tính một báo cáo ---------------- */

/**
 * Tính báo cáo (không ghi gì): kiểm quyền loại báo cáo, chuẩn hóa bộ lọc, gom số liệu theo phạm vi của người dùng.
 * Trả bản chụp {kind, title_vi, title_zh, code: '', form_code, form_rev, filters, generated_at, generated_by, generated_by_name, today,
 * scope_depts, tiles, rows, data}.
 */
function reportCompute_(ctx, kind, filters) {
  if (REPORT_KINDS_.indexOf(kind) < 0) throw validationError_([fieldError_('kind', 'INVALID_VALUE')]);
  if (!reportKindAllowed_(ctx.user, kind)) throw apiError_('FORBIDDEN');
  var today = todayVN_();
  var f = reportFilters_(kind, filters, today);
  var res = kind === 'CATALOG' ? reportCatalog_(ctx, f, today) : kind === 'RECORDS' ? reportRecords_(ctx, f, today)
    : kind === 'COVERAGE' ? reportCoverage_(ctx, f) : kind === 'DIST' ? reportDist_(ctx, f, today)
    : kind === 'DOCREQ' ? reportDocreq_(ctx, f) : reportVersions_(ctx, f);
  var t = LABELS['rpt.title.' + kind] || [kind, kind];
  var formCode = REPORT_FORM_CODE_[kind] || '';
  var formRev = '';
  if (formCode) {
    var fi = findOne_('Items', 'code', formCode);
    if (fi && fi.status === 'ISSUED') formRev = String(fi.current_rev || '01');
  }
  var me = userDirectory_()[ctx.user.user_id] || {};
  var dl = '';
  if (f.dept) {
    var dd = findOne_('Depts', 'dept_code', f.dept) || {};
    dl = f.dept + ' · ' + [dd.name_vi, dd.name_zh].filter(function (x) { return x; }).join(' · ');
  }
  return {
    kind: kind, title_vi: t[0], title_zh: t[1], code: '', form_code: formCode, form_rev: formRev, filters: f,
    generated_at: isoVN_(now_()), generated_by: ctx.user.user_id, generated_by_name: me.display_name || ctx.user.display_name || '', today: today,
    dept_label: dl, scope_depts: seesAllDepts_(ctx.user) ? '' : userDepts_(ctx.user).join(', '),
    tiles: res.tiles, rows: res.rows, data: res.data
  };
}

/** Tên tệp tải về: BC-2611-001_danh-muc-tai-lieu.pdf (lịch sử phiên bản thêm mã biểu) */
function reportFileName_(snap, ext) {
  var tail = snap.kind === 'VERSIONS' && snap.data && snap.data.item ? '_' + String(snap.data.item.code).replace(/[\/\\:*?"<>|\s]+/g, '-')
    : snap.kind === 'DOCREQ' && snap.data && snap.data.one ? '_' + String(snap.data.one.code) : '';
  return (snap.code ? snap.code + '_' : '') + REPORT_SLUG_[snap.kind] + tail + '.' + ext;
}

/* ---------------- Action ---------------- */

/** report.run {kind, filters}: báo cáo xem trước theo bộ lọc (cần mạng, không lưu, chưa có mã) */
function reportRun_(ctx) {
  var p = ctx.req.payload || {};
  var snap = reportCompute_(ctx, p.kind, p.filters || {});
  return { report: snap, layout: reportLayout_(snap), logo_rev: reportLogoRev_() };
}

function reportRunResult_(run) {
  var dir = userDirectory_();
  return {
    report_run_id: run.report_run_id, code: run.code, kind: run.kind, title_vi: run.title_vi, title_zh: run.title_zh, filters: run.filters_json || {},
    summary: run.summary_json || null, row_count: run.row_count, generated_at: run.generated_at, generated_by: run.generated_by,
    generated_by_name: reportUserName_(dir, run.generated_by), has_pdf: !!run.pdf_doc_id, pdf_size: run.pdf_size || null, record_version: run.record_version
  };
}

/** Bản chụp đã lưu của một báo cáo (tệp JSON riêng tư), gắn mã báo cáo */
function reportSnapshotOf_(run) {
  var d = findOne_('Documents', 'document_id', run.snapshot_doc_id);
  if (!d || !d.drive_file_id) throw validationError_([fieldError_('report_run_id', 'FILE_MISSING')]);
  var snap;
  try {
    snap = JSON.parse(DriveApp.getFileById(String(d.drive_file_id)).getBlob().getDataAsString('UTF-8'));
  } catch (e) {
    throw validationError_([fieldError_('report_run_id', 'FILE_MISSING')]);
  }
  snap.code = run.code;
  snap.report_run_id = run.report_run_id;
  return snap;
}

/** Dòng Documents cho tệp của báo cáo (bản chụp JSON, PDF) — để sao lưu / nối lại ID tệp khi khôi phục */
function reportDocRow_(ctx, docId, runId, kind, file, mime, name, size, sha) {
  return cNew_(ctx, {
    document_id: docId, entity_type: 'REPORT_RUN', entity_id: runId, kind: kind, drive_file_id: file.getId(), mime_type: mime, file_name: name,
    access_scope: 'REPORT', active: true, managed_folder_id: appFolder_().getId(), owned_by_app: true, size_bytes: size, thumb_drive_file_id: '',
    sha256: sha || '', page_no: ''
  });
}

/**
 * Lưu một báo cáo mới: tính lại ở máy chủ, ghi bản chụp JSON lên Drive (ngoài khóa ghi), rồi cấp mã BC-yymm-001 và ghi
 * ReportRuns + Documents dưới khóa ghi (executeWrite_, chống trùng theo operation_id). Trả dòng ReportRuns.
 */
function reportCreateRun_(ctx, p) {
  var snap = reportCompute_(ctx, p.kind, p.filters || {});
  snap.report_run_id = p.report_run_id;
  var json = JSON.stringify(snap);
  if (json.length > REPORT_SNAPSHOT_MAX_) throw validationError_([fieldError_('filters', 'REPORT_TOO_LARGE')]);
  var docId = uuid_();
  var file = appFolder_().createFile(Utilities.newBlob(json, 'application/json', 'BaoCao_' + p.report_run_id.slice(0, 8) + '_' + snap.kind + '.json'));
  var res;
  try {
    res = executeWrite_(ctx, {
      entity_type: 'REPORT_RUN', entity_id: p.report_run_id,
      build: function (st) {
        if (findRowNums_('ReportRuns', 'report_run_id', p.report_run_id).length) throw validationError_([fieldError_('report_run_id', 'ID_EXISTS')]);
        var su = {};
        var code = allocCode_(st, su, 'REPORT', now_());
        var run = cNew_(ctx, {
          report_run_id: p.report_run_id, code: code, kind: snap.kind, title_vi: snap.title_vi, title_zh: snap.title_zh, filters_json: snap.filters,
          summary_json: { tiles: snap.tiles }, row_count: snap.rows, dept_code: snap.filters.dept || '', generated_at: snap.generated_at,
          generated_by: ctx.user.user_id, snapshot_doc_id: docId, pdf_doc_id: '', pdf_file_name: '', pdf_size: '', status: 'SAVED'
        });
        return {
          writes: [
            { sheet: 'Documents', mode: 'insert', row: reportDocRow_(ctx, docId, p.report_run_id, 'SNAPSHOT', file, 'application/json', code + '.json', json.length, '') },
            { sheet: 'ReportRuns', mode: 'insert', row: run }
          ],
          state: su,
          result: { entity_type: 'REPORT_RUN', entity_id: p.report_run_id, code: code, record_version: 1 },
          record_version: 1,
          audit: { entity_type: 'REPORT_RUN', entity_id: p.report_run_id, before_json: null, after_json: { code: code, kind: snap.kind, filters: snap.filters, rows: snap.rows } }
        };
      }
    });
  } catch (e) {
    trashQuietly_(file);
    throw e;
  }
  if (res.code === 'DUPLICATE_OPERATION') trashQuietly_(file);
  dbReset_();
  var run = findOne_('ReportRuns', 'report_run_id', p.report_run_id);
  if (!run) throw apiError_('NOT_FOUND');
  return run;
}

/** PDF của báo cáo đã lưu: tệp đã dựng thì đọc lại; chưa có (hoặc tệp mất) thì dựng từ bản chụp rồi lưu lên Drive */
function reportPdfOf_(ctx, run, snap) {
  if (run.pdf_doc_id) {
    var d = findOne_('Documents', 'document_id', run.pdf_doc_id);
    if (d && d.drive_file_id) {
      try {
        var f0 = DriveApp.getFileById(String(d.drive_file_id));
        if (!f0.isTrashed()) return f0.getBlob().getBytes();
      } catch (e) { /* tệp mất: dựng lại */ }
    }
  }
  var bytes = reportPdfBuild_(snap);
  var name = reportFileName_(snap, 'pdf');
  var file = appFolder_().createFile(Utilities.newBlob(bytes, 'application/pdf', name));
  var docId = uuid_();
  var keep = false;
  try {
    // Tệp PDF thuộc báo cáo đã lưu: ghi Documents + cột PDF của ReportRuns (tăng table_rev như mọi lần ghi)
    systemWrite_([
      { sheet: 'Documents', mode: 'insert', row: reportDocRow_(ctx, docId, run.report_run_id, 'PDF', file, 'application/pdf', name, bytes.length, b64url_(sha256_(bytes))) },
      { sheet: 'ReportRuns', mode: 'update', partial: true, row: {
        report_run_id: run.report_run_id, pdf_doc_id: docId, pdf_file_name: name, pdf_size: bytes.length,
        record_version: (Number(run.record_version) || 1) + 1, updated_at: isoVN_(now_()), updated_by: ctx.user.user_id } }
    ]);
    keep = true;
  } finally {
    if (!keep) trashQuietly_(file);
  }
  run.pdf_doc_id = docId;
  return bytes;
}

/**
 * report.save {report_run_id, kind, filters, format: PDF | XLSX}: báo cáo có mã. report_run_id chưa có → tính và lưu bản chụp, cấp mã
 * BC-yymm-001; đã có (bấm Tải PDF rồi Tải Excel, hoặc mở báo cáo đã lưu) → dùng lại bản chụp và mã cũ (bỏ qua kind/filters).
 * PDF: trả {run, file_name, mime_type, content_b64}; XLSX: trả {run, report (bản chụp có mã), layout, logo_rev, file_name} để app dựng Excel.
 */
function reportSave_(ctx) {
  var p = ctx.req.payload || {};
  if (!isUuidV4_(p.report_run_id)) throw validationError_([fieldError_('report_run_id', 'ID_INVALID')]);
  if (['PDF', 'XLSX'].indexOf(p.format) < 0) throw validationError_([fieldError_('format', 'INVALID_VALUE')]);
  ensureReportSchema_();
  var run = findOne_('ReportRuns', 'report_run_id', p.report_run_id);
  if (run) {
    if (!reportRunVisible_(ctx.user, run)) throw apiError_('FORBIDDEN');
  } else {
    if (Number(ctx.req.expected_version || 0) !== 0) throw validationError_([fieldError_('expected_version', 'INVALID_VALUE')]);
    run = reportCreateRun_(ctx, p);
  }
  var snap = reportSnapshotOf_(run);
  if (p.format === 'XLSX') {
    writeAudit_({ user_id: ctx.user.user_id, device_id: ctx.req.device_id, action: 'report.xlsx', entity_type: 'REPORT_RUN', entity_id: run.report_run_id,
      before_json: null, after_json: { code: run.code }, operation_id: '', auth_basis: authBasis_(ctx) });
    return { run: reportRunResult_(run), report: snap, layout: reportLayout_(snap), logo_rev: reportLogoRev_(), file_name: reportFileName_(snap, 'xlsx') };
  }
  var bytes = reportPdfOf_(ctx, run, snap);
  dbReset_();
  var after = findOne_('ReportRuns', 'report_run_id', run.report_run_id) || run;
  return { run: reportRunResult_(after), file_name: reportFileName_(snap, 'pdf'), mime_type: 'application/pdf', content_b64: b64_(bytes) };
}

/** report.list {kind?}: báo cáo đã lưu, mới nhất trước (tối đa 200) */
function reportList_(ctx) {
  var p = ctx.req.payload || {};
  if (!sheetExists_('ReportRuns')) return { items: [], total: 0 };
  var list = readRows_('ReportRuns').filter(function (r) {
    return reportRunVisible_(ctx.user, r) && (!p.kind || r.kind === p.kind);
  }).sort(function (a, b) { return String(b.generated_at).localeCompare(String(a.generated_at)) || String(b.code).localeCompare(String(a.code)); });
  return { items: list.slice(0, 200).map(reportRunResult_), total: list.length };
}

/** Dòng Trạng thái hệ thống: số báo cáo đã lưu, báo cáo gần nhất */
function reportHealth_() {
  if (!sheetExists_('ReportRuns')) return [false, 'Thiếu sheet ReportRuns', 'Chạy migrateSchema'];
  var runs = readRows_('ReportRuns').filter(function (r) { return !r.archived_at; });
  var last = runs.sort(function (a, b) { return String(b.generated_at).localeCompare(String(a.generated_at)); })[0];
  return [true, 'Đã lưu ' + runs.length + ' báo cáo' + (last ? ' · gần nhất ' + last.code + ' (' + String(last.generated_at).slice(0, 16).replace('T', ' ') + ')' : ''),
    setting_('report_logo_rev') ? '' : 'Chưa có logo công ty trên báo cáo: Tài khoản → Quản trị → Logo trên báo cáo'];
}
