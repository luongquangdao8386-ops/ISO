/* 11_catalog: danh mục biểu mẫu & tài liệu — bộ phận, nhóm, biểu (Items), điều khoản (Clauses).
 * Chuẩn hóa một dòng của sheet "Danh mục tổng - 总清单" (file Excel tổng) dùng chung cho nhập Excel (14_import.js) và
 * dữ liệu mẫu; sửa thông tin biểu trong app (item.edit, Thư ký ISO / cấp 4); sửa bộ phận (dept.edit, cấp 4). */

var ITEM_I18N_ = ['name', 'purpose', 'freq'];
/** Trường của Items do file Excel tổng quyết định (so khi nhập lại để báo "Không đổi") */
var ITEM_EXCEL_FIELDS_ = ['dept_code', 'group_key', 'name_vi', 'name_zh', 'purpose_vi', 'purpose_zh', 'iso9001', 'iso14001', 'iso45001',
  'iso50001', 'brc_topics', 'law', 'cls', 'freq_vi', 'freq_zh', 'flow', 'keep', 'priority', 'where', 'where_note', 'status', 'current_rev',
  'issued_at', 'period_days', 'note'];
/** Trường do luồng phiên bản quyết định khi biểu đã ban hành trong app (phiên 1b): nhập Excel không đè */
var ITEM_VERSION_FIELDS_ = ['status', 'current_rev', 'issued_at'];
var ITEM_CODE_RE_ = /^[A-ZĐ0-9][A-ZĐ0-9._\/-]{0,39}$/;
var CJK_RE_ = /[㐀-鿿豈-﫿]/;

/* ---------------- Chuẩn hóa chữ ---------------- */

/** Chuỗi ô: bỏ khoảng trắng đầu/cuối, \r\n → \n, khoảng trắng cuối mỗi dòng */
function cellText_(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/\r\n?/g, '\n').split('\n').map(function (l) { return l.replace(/[ \t ]+$/, ''); }).join('\n').trim();
}

/** Khóa so sánh tên hiển thị: chữ thường, bỏ khoảng trắng */
function looseKey_(s) {
  return String(s || '').toLowerCase().replace(/[\s ]+/g, '');
}

/**
 * Ô hai dòng (dòng 1 Việt, dòng 2 Trung) → {vi, zh}. Một dòng: có chữ Hán thì là tiếng Trung, không thì tiếng Việt.
 * Dòng 2 trở đi đều thuộc tiếng Trung (nối lại bằng xuống dòng).
 */
function splitBiCell_(v) {
  var t = cellText_(v);
  if (!t) return { vi: '', zh: '' };
  var lines = t.split('\n').map(function (l) { return l.trim(); }).filter(String);
  if (lines.length === 1) {
    var one = lines[0];
    // Một dòng "Việt · 中文"
    var dot = one.lastIndexOf(' · ');
    if (dot > 0 && CJK_RE_.test(one.slice(dot + 3)) && !CJK_RE_.test(one.slice(0, dot))) return { vi: one.slice(0, dot).trim(), zh: one.slice(dot + 3).trim() };
    return CJK_RE_.test(one) ? { vi: '', zh: one } : { vi: one, zh: '' };
  }
  return { vi: lines[0], zh: lines.slice(1).join('\n') };
}

/** Ghép lại ô hai dòng (xuất Excel) */
function joinBiCell_(vi, zh) {
  vi = vi || ''; zh = zh || '';
  return vi && zh ? vi + '\n' + zh : (vi || zh);
}

/* ---------------- Bộ phận, nhóm ---------------- */

function deptDisplay_(d) {
  return d.name_vi && d.name_zh ? d.name_vi + ' · ' + d.name_zh : (d.name_vi || d.name_zh || d.dept_code);
}

/** Bản đồ khóa → mã bộ phận: tên hiển thị "Việt · 中文", tên Việt, tên Trung, mã */
function deptLookup_(depts) {
  var m = {};
  depts.forEach(function (d) {
    [deptDisplay_(d), d.name_vi, d.name_zh, d.dept_code].forEach(function (k) { if (k) m[looseKey_(k)] = d.dept_code; });
  });
  return m;
}

/** "01. Tên Việt · 中文" (cơ điện "01. TÊN · 01. 中文") → {num, name_vi, name_zh} */
function parseGroupLabel_(label) {
  var t = cellText_(label).replace(/\n/g, ' ');
  if (!t) return { num: '', name_vi: '', name_zh: '' };
  var num = '';
  var m = /^(\d{1,3})\s*[.、]\s*/.exec(t);
  if (m) { num = pad2_(Number(m[1])); t = t.slice(m[0].length); }
  var parts = t.split(/\s+·\s+|\s*·\s*/);
  var vi = (parts[0] || '').trim(), zh = parts.slice(1).join(' · ').trim().replace(/^\d{1,3}\s*[.、]\s*/, '');
  if (!zh && CJK_RE_.test(vi)) { zh = vi; vi = ''; }
  return { num: num, name_vi: vi, name_zh: zh };
}

/** Nhãn nhóm khi nhóm tạo trong app (không có nhãn từ Excel) */
function groupLabelOf_(g) {
  var num = String(g.group_key || '').split('-').pop();
  var name = g.name_vi && g.name_zh ? g.name_vi + ' · ' + g.name_zh : (g.name_vi || g.name_zh || '');
  return (/^\d+$/.test(num) ? num + '. ' : '') + name;
}

/** group_key = <bộ phận>-<xx> lấy từ mã biểu BM-<bộ phận>-xx-yy; không theo dạng đó thì lấy số đầu nhãn nhóm */
function groupKeyFor_(code, deptCode, labelNum) {
  var m = /^BM-([A-ZĐ]+)-(\d{1,3})(?:-|$)/.exec(String(code || ''));
  if (m) return m[1] + '-' + pad2_(Number(m[2]));
  if (labelNum && deptCode) return deptCode + '-' + labelNum;
  return '';
}

/* ---------------- Loại, cấp, tình trạng, nơi làm ---------------- */

/** Loại tài liệu suy từ tiền tố mã (khi thêm mới): BM- biểu mẫu, QT- quy trình, HD- hướng dẫn, ST- sổ tay, CS- chính sách */
function kindFromCode_(code) {
  var c = String(code || '');
  if (/^BM-/.test(c)) return 'FORM';
  if (/^QT-/.test(c)) return 'PROCEDURE';
  if (/^(HD|HDCV|WI)-/.test(c)) return 'WI';
  if (/^(ST|STCL|SM)-/.test(c)) return 'MANUAL';
  if (/^(CS|CSCL|CSAT)-/.test(c)) return 'POLICY';
  if (/^(TL|TLBN|EXT)-/.test(c)) return 'EXTERNAL';
  return 'FORM';
}

/** Cấp duyệt: cấp công ty cho BM-ISO-…, BM-BRC-…, sổ tay, chính sách; còn lại cấp bộ phận */
function levelFor_(code, kind) {
  if (kind === 'MANUAL' || kind === 'POLICY') return 'COMPANY';
  return /^BM-(ISO|BRC)-/.test(String(code || '')) ? 'COMPANY' : 'DEPT';
}

var STATUS_FROM_SYMBOL_ = { '○': 'NONE', '◯': 'NONE', 'O': 'NONE', '◐': 'DRAFTING', '◑': 'DRAFTING', '●': 'ISSUED', '⬤': 'ISSUED', '✕': 'NA', '×': 'NA', 'X': 'NA', '✗': 'NA' };

function statusFrom_(v) {
  var t = cellText_(v).toUpperCase();
  if (!t) return 'NONE';
  if (ITEM_STATUS_.indexOf(t) >= 0) return t;
  var ch = t.charAt(0);
  return STATUS_FROM_SYMBOL_[ch] || null;
}

var WHERE_LOOKUP_ = (function () {
  var m = {};
  WHERE_.forEach(function (w) {
    m[looseKey_(w[0])] = w[0];
    m[looseKey_(w[1])] = w[0];
    var parts = w[1].split(' · ');
    m[looseKey_(parts[0])] = w[0];
    if (parts[1]) m[looseKey_(parts[1])] = w[0];
  });
  return m;
})();

function whereFrom_(v) {
  var t = cellText_(v);
  if (!t) return '';
  return WHERE_LOOKUP_[looseKey_(t)] || null;
}

function whereDisplay_(code) {
  for (var i = 0; i < WHERE_.length; i++) if (WHERE_[i][0] === code) return WHERE_[i][1];
  return code || '';
}

/** In từ app (mục 6 phủ điều khoản): Nơi làm là M&E hoặc Checksheet (không tính Một phần / Đề xuất) */
function printedFromApp_(where) {
  return where === 'ME' || where === 'CS';
}

/** Ngày: 'YYYY-MM-DD' (app đã đổi ô ngày Excel) hoặc 'dd/mm/yyyy' */
function dateFrom_(v) {
  var t = cellText_(v);
  if (!t) return '';
  if (isDateStr_(t.slice(0, 10)) && /^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  var m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(t);
  if (m) { var iso = m[3] + '-' + pad2_(Number(m[2])) + '-' + pad2_(Number(m[1])); if (isDateStr_(iso)) return iso; }
  return null;
}

/* ---------------- Một dòng của Danh mục tổng ---------------- */

/**
 * cells: {A..Z: giá trị ô (chuỗi, số; ô ngày đã đổi 'YYYY-MM-DD')}. ctx: {depts: lookup, row_number}.
 * Trả {code, fields, group: {group_key, label, name_vi, name_zh, dept_code}, errors: [fieldError]}.
 * Cột X, Y (ngày hồ sơ gần nhất, tình trạng hồ sơ) bỏ qua: app tự tính.
 */
function normCatalogRow_(cells, look, rowNumber) {
  var errs = [];
  var err = function (field, sub) { errs.push(fieldError_(field, sub, rowNumber)); };
  var c = function (k) { return cells && cells[k] !== undefined ? cells[k] : ''; };
  var code = cellText_(c('B')).toUpperCase().replace(/\s+/g, '');
  if (!code) err('B', 'REQUIRED');
  else if (!ITEM_CODE_RE_.test(code)) err('B', 'CODE_INVALID');
  var f = {};
  var nm = splitBiCell_(c('C'));
  f.name_vi = nm.vi; f.name_zh = nm.zh;
  if (!f.name_vi && !f.name_zh) err('C', 'REQUIRED_ONE_LANGUAGE');
  var pu = splitBiCell_(c('D'));
  f.purpose_vi = pu.vi; f.purpose_zh = pu.zh;
  var deptRaw = cellText_(c('E'));
  f.dept_code = deptRaw ? (look[looseKey_(deptRaw)] || null) : null;
  if (!f.dept_code) {
    // Không ghi bộ phận: lấy từ mã BM-<bộ phận>-…
    var md = /^BM-([A-ZĐ]+)-/.exec(code);
    f.dept_code = !deptRaw && md && look[looseKey_(md[1])] ? look[looseKey_(md[1])] : null;
    if (!f.dept_code) err('E', 'DEPT_UNKNOWN');
  }
  var gl = parseGroupLabel_(c('F'));
  f.group_key = groupKeyFor_(code, f.dept_code, gl.num);
  var group = null;
  if (f.group_key) group = { group_key: f.group_key, dept_code: f.group_key.split('-')[0], label: cellText_(c('F')).replace(/\n/g, ' '), name_vi: gl.name_vi, name_zh: gl.name_zh };
  else if (cellText_(c('F'))) err('F', 'GROUP_INVALID');
  ['G', 'H', 'I', 'J'].forEach(function (k, i) { f[['iso9001', 'iso14001', 'iso45001', 'iso50001'][i]] = cellText_(c(k)).replace(/\n/g, '; '); });
  f.brc_topics = cellText_(c('K'));
  f.law = cellText_(c('L'));
  f.cls = cellText_(c('M'));
  var fr = splitBiCell_(c('N'));
  f.freq_vi = fr.vi; f.freq_zh = fr.zh;
  f.flow = cellText_(c('O'));
  f.keep = cellText_(c('P'));
  var pr = cellText_(c('Q'));
  if (!pr) f.priority = null;
  else if (/^[123](\.0+)?$/.test(pr)) f.priority = Number(pr);
  else { f.priority = null; err('Q', 'PRIORITY_INVALID'); }
  var wh = whereFrom_(c('R'));
  if (wh === null) { f.where = ''; err('R', 'WHERE_INVALID'); } else f.where = wh;
  f.where_note = cellText_(c('S'));
  var st = statusFrom_(c('T'));
  if (st === null) { f.status = 'NONE'; err('T', 'STATUS_SYMBOL'); } else f.status = st;
  var rev = cellText_(c('U'));
  if (!rev) f.current_rev = '';
  else if (/^\d{1,3}(\.0+)?$/.test(rev)) f.current_rev = pad2_(Number(rev));
  else { f.current_rev = ''; err('U', 'REV_INVALID'); }
  var dt = dateFrom_(c('V'));
  if (dt === null) { f.issued_at = ''; err('V', 'INVALID_DATE'); } else f.issued_at = dt;
  var pd = cellText_(c('W'));
  if (!pd) f.period_days = null;
  else if (/^\d{1,4}(\.0+)?$/.test(pd) && Number(pd) > 0) f.period_days = Number(pd);
  else { f.period_days = null; err('W', 'PERIOD_DAYS_INVALID'); }
  f.note = cellText_(c('Z'));
  var stt = cellText_(c('A'));
  f.sort_order = /^\d+(\.0+)?$/.test(stt) ? Number(stt) : rowNumber;
  return { code: code, fields: f, group: group, errors: errs };
}

/** Giá trị so sánh của một trường (null/'' coi như nhau) */
function cmpVal_(v) {
  return v === null || v === undefined ? '' : String(v);
}

/**
 * Trường của dòng nhập khác bản hiện có. Bên tiếng còn trống mà bản hiện có là dịch máy từ bên kia (không đổi bên kia) → coi như không đổi.
 * Biểu đã ban hành trong app (có phiên bản hiện hành): bỏ qua tình trạng, lần ban hành, ngày ban hành của tệp.
 */
function itemChanges_(cur, f) {
  var out = [];
  var meta = cur.i18n_meta || {};
  ITEM_EXCEL_FIELDS_.forEach(function (k) {
    if (cur.current_version_id && ITEM_VERSION_FIELDS_.indexOf(k) >= 0) return;
    var nv = cmpVal_(f[k]), ov = cmpVal_(cur[k]);
    if (nv === ov) return;
    var pm = /^(name|purpose|freq)_(vi|zh)$/.exec(k);
    if (pm && !nv) {
      var m = meta[pm[1]];
      var other = pm[2] === 'vi' ? 'zh' : 'vi';
      if (m && (m.state === 'MACHINE' || m.state === 'PENDING') && m.src === other && cmpVal_(f[pm[1] + '_' + other]) === cmpVal_(cur[pm[1] + '_' + other])) return;
    }
    out.push(k);
  });
  return out;
}

/** i18n_meta cho các cặp tiếng nhập từ Excel: đủ hai bên → HUMAN; thiếu một bên → PENDING (dịch nền, không dịch lúc ghi) */
function importI18nMeta_(cur, f, nowIso) {
  var meta = cur && cur.i18n_meta ? clone_(cur.i18n_meta) : {};
  ITEM_I18N_.forEach(function (p) {
    var vi = f[p + '_vi'], zh = f[p + '_zh'];
    var cvi = cur ? cmpVal_(cur[p + '_vi']) : '', czh = cur ? cmpVal_(cur[p + '_zh']) : '';
    if (cur && cmpVal_(vi) === cvi && cmpVal_(zh) === czh) return;
    if (vi && zh) meta[p] = { src: meta[p] ? meta[p].src : 'vi', state: 'HUMAN', at: nowIso };
    else if (vi || zh) meta[p] = { src: vi ? 'vi' : 'zh', state: NO_MT_ITEMS_ ? 'MANUAL_REQUIRED' : 'PENDING', at: nowIso };
    else delete meta[p];
  });
  return meta;
}
/** Tên, mục đích biểu nhập thiếu một thứ tiếng: dịch nền (dịch máy · 机器翻译); đặt true nếu không muốn dịch */
var NO_MT_ITEMS_ = false;

/** Dòng Items mới/sửa từ trường đã chuẩn hóa (dưới khóa ghi) */
function itemRowFromImport_(ctx, cur, code, f, nowIso) {
  var row = cur ? clone_(cur) : {
    item_id: uuid_(), code: code, kind: kindFromCode_(code), current_version_id: '', owner_user_id: '', qr_key: newQrKey_(),
    issued_source: '', file_missing: false, na_reason: ''
  };
  delete row.__row;
  if (!cur) row.level = levelFor_(code, row.kind);
  var keep = cur && cur.current_version_id ? ITEM_VERSION_FIELDS_ : [];
  row.i18n_meta = importI18nMeta_(cur, f, nowIso);
  ITEM_EXCEL_FIELDS_.forEach(function (k) { if (keep.indexOf(k) < 0) row[k] = f[k] === undefined ? '' : f[k]; });
  row.sort_order = f.sort_order;
  row.period_type = periodTypeFromDays_(row.period_days);
  if (!row.current_version_id) {
    if (row.status === 'ISSUED') { row.issued_source = 'IMPORT'; row.file_missing = true; } else { row.issued_source = ''; row.file_missing = false; }
  }
  // Hạn rà soát: tính từ ngày ban hành; giữ hạn đã có khi biểu vẫn ● cùng ngày ban hành (ban hành trong app, đã bấm "Đã rà soát")
  var keepDue = cur && cur.review_due && cur.status === 'ISSUED' && row.status === 'ISSUED' && cmpVal_(cur.issued_at) === cmpVal_(row.issued_at);
  row.review_due = keepDue ? cur.review_due : (row.status === 'ISSUED' && row.issued_at ? addMonthsIso_(row.issued_at, Number(setting_('doc_review_months') || 12)) : '');
  if (!cur) cNew_(ctx, row); else cUpdate_(ctx, row);
  return row;
}

/* ---------------- item.edit (Thư ký ISO, cấp 4) ---------------- */

/**
 * item.edit {item_id, code?, kind, level, dept_code, group_key, name_vi/zh, purpose_vi/zh, iso9001…iso50001, brc_topics, law, cls,
 *  freq_vi/zh, flow, keep, priority, where, where_note, period_days, owner_user_id, note}
 * expected_version 0 = thêm mới (cấp mã QR). Tình trạng, lần ban hành, ngày ban hành đổi qua luồng phiên bản (phiên 1b).
 */
function itemEdit_(ctx) {
  var p = ctx.req.payload || {};
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  var errs = [];
  if (!isUuidV4_(p.item_id)) errs.push(fieldError_('item_id', 'ID_INVALID'));
  var code = trimStr_(p.code).toUpperCase().replace(/\s+/g, '');
  if (isNew) {
    if (!code) errs.push(fieldError_('code', 'REQUIRED'));
    else if (!ITEM_CODE_RE_.test(code)) errs.push(fieldError_('code', 'CODE_INVALID'));
  }
  var kind = p.kind === undefined ? null : String(p.kind);
  if (kind !== null && ITEM_KINDS_.indexOf(kind) < 0) errs.push(fieldError_('kind', 'KIND_INVALID'));
  var level = p.level === undefined ? null : String(p.level);
  if (level !== null && ITEM_LEVELS_.indexOf(level) < 0) errs.push(fieldError_('level', 'LEVEL_INVALID'));
  var depts = {};
  readRows_('Depts').forEach(function (d) { depts[d.dept_code] = d; });
  if (p.dept_code !== undefined && !depts[p.dept_code]) errs.push(fieldError_('dept_code', 'DEPT_UNKNOWN'));
  if (isNew && p.dept_code === undefined) errs.push(fieldError_('dept_code', 'REQUIRED'));
  if (p.priority !== undefined && p.priority !== null && p.priority !== '' && [1, 2, 3].indexOf(Number(p.priority)) < 0) errs.push(fieldError_('priority', 'PRIORITY_INVALID'));
  if (p.where !== undefined && p.where !== '' && !WHERE_.some(function (w) { return w[0] === p.where; })) errs.push(fieldError_('where', 'WHERE_INVALID'));
  if (p.period_days !== undefined && p.period_days !== null && p.period_days !== '' && !(Number(p.period_days) > 0 && Math.floor(Number(p.period_days)) === Number(p.period_days))) errs.push(fieldError_('period_days', 'PERIOD_DAYS_INVALID'));
  if (p.owner_user_id && !isUuidV4_(p.owner_user_id)) errs.push(fieldError_('owner_user_id', 'ID_INVALID'));
  var cur = isNew ? null : findOne_('Items', 'item_id', p.item_id);
  if (!isNew && !cur) throw apiError_('NOT_FOUND');
  requireOneLang_(errs, p, cur, 'name');
  if (errs.length) throw validationError_(errs);
  var tr = applyTranslations_('Items', ITEM_I18N_, p, cur); // dịch ngoài khóa ghi
  return executeWrite_(ctx, {
    entity_type: 'ITEM', entity_id: p.item_id,
    build: function () {
      var row;
      if (isNew) {
        if (findRowNums_('Items', 'item_id', p.item_id).length) throw validationError_([fieldError_('item_id', 'ID_EXISTS')]);
        if (findRowNums_('Items', 'code', code).length) throw validationError_([fieldError_('code', 'CODE_DUPLICATE')]);
        var k0 = kind || kindFromCode_(code);
        row = cNew_(ctx, {
          item_id: p.item_id, code: code, kind: k0, level: level || levelFor_(code, k0), status: 'NONE', current_version_id: '',
          current_rev: '', issued_at: '', review_due: '', qr_key: newQrKey_(), issued_source: '', file_missing: false, na_reason: '',
          sort_order: readRows_('Items').reduce(function (m, x) { return Math.max(m, Number(x.sort_order) || 0); }, 0) + 1
        });
      } else {
        var now = readRowAt_('Items', cur.__row);
        assertVersion_(ctx, now, 'ITEM', 'Items');
        row = clone_(now); delete row.__row;
        if (kind) row.kind = kind;
        if (level) row.level = level;
        cUpdate_(ctx, row);
      }
      var before = isNew ? null : clone_(row);
      ['dept_code', 'iso9001', 'iso14001', 'iso45001', 'iso50001', 'brc_topics', 'law', 'cls', 'flow', 'keep', 'where', 'where_note', 'owner_user_id', 'note'].forEach(function (k) {
        if (p[k] !== undefined) row[k] = trimStr_(p[k]);
      });
      if (p.priority !== undefined) row.priority = p.priority === '' || p.priority === null ? null : Number(p.priority);
      if (p.period_days !== undefined) row.period_days = p.period_days === '' || p.period_days === null ? null : Number(p.period_days);
      row.period_type = periodTypeFromDays_(row.period_days);
      if (p.group_key !== undefined) row.group_key = trimStr_(p.group_key);
      else if (isNew) row.group_key = groupKeyFor_(code, row.dept_code, '');
      Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
      row.i18n_meta = tr.meta;
      var writes = [{ sheet: 'Items', mode: isNew ? 'insert' : 'update', row: row }];
      // Nhóm chưa có: tạo theo mã (tên nhóm sửa sau ở file Excel hoặc màn nhóm)
      if (row.group_key && !findRowNums_('Groups', 'group_key', row.group_key).length) {
        writes.push({ sheet: 'Groups', mode: 'insert', row: cNew_(ctx, { group_key: row.group_key, dept_code: row.group_key.split('-')[0], name_vi: '', name_zh: '', label: '', sort_order: 0, active: true }) });
      }
      return {
        writes: writes, result: { entity_type: 'ITEM', entity_id: row.item_id, record_version: row.record_version, record: projectRow_(ctx, row) },
        record_version: row.record_version,
        audit: { entity_type: 'ITEM', entity_id: row.item_id, before_json: before ? { code: before.code } : null, after_json: { code: row.code, dept_code: row.dept_code, kind: row.kind } }
      };
    }
  });
}

/* ---------------- dept.edit (cấp 4) ---------------- */

/** dept.edit {dept_code, name_vi, name_zh, head_user_id, active, sort_order}; expected_version 0 = thêm bộ phận */
function deptEdit_(ctx) {
  var p = ctx.req.payload || {};
  var isNew = Number(ctx.req.expected_version || 0) === 0;
  var code = trimStr_(p.dept_code).toUpperCase();
  var errs = [];
  if (!DEPT_CODE_RE_.test(code)) errs.push(fieldError_('dept_code', 'CODE_INVALID'));
  if (p.head_user_id && !isUuidV4_(p.head_user_id)) errs.push(fieldError_('head_user_id', 'ID_INVALID'));
  if (p.head_user_id && !userDirectory_()[p.head_user_id]) errs.push(fieldError_('head_user_id', 'NOT_FOUND'));
  var cur = isNew ? null : findOne_('Depts', 'dept_code', code);
  if (!isNew && !cur) throw apiError_('NOT_FOUND');
  requireOneLang_(errs, p, cur, 'name');
  if (errs.length) throw validationError_(errs);
  var tr = applyTranslations_('Depts', ['name'], p, cur);
  return executeWrite_(ctx, {
    entity_type: 'DEPT', entity_id: code,
    build: function () {
      var row;
      if (isNew) {
        if (findRowNums_('Depts', 'dept_code', code).length) throw validationError_([fieldError_('dept_code', 'CODE_DUPLICATE')]);
        row = cNew_(ctx, { dept_code: code, head_user_id: '', active: true, sort_order: readRows_('Depts').length + 1 });
      } else {
        var now = readRowAt_('Depts', cur.__row);
        assertVersion_(ctx, now, 'DEPT', 'Depts');
        row = clone_(now); delete row.__row;
        cUpdate_(ctx, row);
      }
      if (p.head_user_id !== undefined) row.head_user_id = trimStr_(p.head_user_id);
      if (p.active !== undefined) row.active = p.active === true;
      if (p.sort_order !== undefined && isFinite(Number(p.sort_order))) row.sort_order = Number(p.sort_order);
      Object.keys(tr.values).forEach(function (k) { row[k] = tr.values[k]; });
      row.i18n_meta = tr.meta;
      return {
        writes: [{ sheet: 'Depts', mode: isNew ? 'insert' : 'update', row: row }],
        result: { entity_type: 'DEPT', entity_id: code, record_version: row.record_version, record: projectRow_(ctx, row) },
        record_version: row.record_version,
        audit: { entity_type: 'DEPT', entity_id: code, before_json: null, after_json: { name_vi: row.name_vi, name_zh: row.name_zh, head_user_id: row.head_user_id, active: row.active } }
      };
    }
  });
}

/** Bộ phận mặc định (setup, migrateSchema): thêm bộ phận còn thiếu, không đè bộ phận đã sửa */
function seedDepts_() {
  var have = {};
  readRows_('Depts').forEach(function (d) { have[d.dept_code] = true; });
  var nowIso = isoVN_(now_());
  var add = DEPTS_SEED_.filter(function (d) { return !have[d[0]]; }).map(function (d, i) {
    return cNewSystem_({ dept_code: d[0], name_vi: d[1], name_zh: d[2], head_user_id: '', active: true, sort_order: DEPTS_SEED_.indexOf(d) + 1,
      i18n_meta: { name: { src: 'vi', state: 'HUMAN', at: nowIso } } });
  });
  if (add.length) systemWrite_(add.map(function (r) { return { sheet: 'Depts', mode: 'insert', row: r }; }));
  return add.length;
}
