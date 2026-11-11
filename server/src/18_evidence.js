/* 18_evidence: ngày có hồ sơ lấy từ app M&E và Checksheet (Đợt 2, phiên 2a — mục 7 đặc tả).
 * Mỗi giờ (trigger syncEvidenceHourly) và khi Quản trị bấm "Cập nhật ngay": hỏi cửa chỉ-đọc feed.isoEvidence của từng app đã nối
 * "mã biểu nào có hồ sơ vào ngày nào" (400 ngày gần nhất), gom theo kỳ của từng biểu ISO rồi ghi sheet Evidence (chỉ ghi dòng đổi).
 * Không ghi gì sang M&E / Checksheet. Mã biểu không có trong danh mục ISO → bỏ qua, ghi ở Trạng thái hệ thống.
 *
 * Hợp đồng (bên M&E và Checksheet làm trong chat của từng app):
 *   POST <link /exec> {api_contract_version:'1.0', action:'feed.isoEvidence', payload:{key, since:'YYYY-MM-DD', client:'ISO'},
 *     device_id, app_version} → phong bì chuẩn, data = {app_id:'ME'|'CS', items:[{form_code, date:'YYYY-MM-DD', count}], server_time}.
 *   Không cần phiên; khóa bằng mã kết nối FEED_KEY_ISO của app đó (sai mã → FORBIDDEN); không kiểm phiên bản app tối thiểu;
 *   since cũ hơn 400 ngày thì tự cắt về 400 ngày.
 *
 * Ô ✓ của bảng kỳ: kỳ có hồ sơ nộp trong app ISO HOẶC có dòng Evidence (số lượt > 0) — tính giống hệt ở js/periods.js.
 * Biểu nơi làm M&E / Checksheet chỉ được tính hồ sơ (đúng hạn / quá hạn) khi app đó đã nối (Settings.evidence_sources);
 * chưa nối thì vẫn "in từ app, chưa tính" như Đợt 1. */

var EXEC_URL_RE_ = /^https:\/\/script\.google\.com\/(a\/macros\/[^/]+|macros)\/s\/[A-Za-z0-9_-]{20,}\/exec$/;
/** App nguồn: thuộc tính lưu link /exec và mã kết nối (Thuộc tính tập lệnh, không gửi xuống app) */
var EVIDENCE_SRC_ = {
  ME: { url: 'ME_EXEC_URL', key: 'ME_FEED_KEY', name: 'M&E' },
  CS: { url: 'CS_EXEC_URL', key: 'CS_FEED_KEY', name: 'Checksheet' }
};
var EVIDENCE_SRC_LIST_ = ['ME', 'CS'];
/** Nơi làm (cột R) → app cung cấp ngày có hồ sơ */
var APP_SOURCE_ = { ME: 'ME', ME_PART: 'ME', CS: 'CS', CS_PART: 'CS', CS_PROPOSED: 'CS' };
/** Hỏi app kia bao nhiêu ngày gần nhất (tối đa của hợp đồng) */
var EVIDENCE_FEED_DAYS_ = 400;
/** Giữ ngày có hồ sơ của bao nhiêu ngày gần nhất theo loại kỳ (biểu hằng ngày giữ ít để bảng Evidence và máy điện thoại nhẹ) */
var EVIDENCE_KEEP_DAYS_ = { DAY: 62, WEEK: 126, MONTH: 400, QUARTER: 400, HALF: 400, YEAR: 400 };
var EVIDENCE_MAX_ITEMS_ = 60000;
var EVIDENCE_FIELDS_ = ['source', 'item_id', 'form_code', 'period_type', 'period_key', 'period_from', 'period_to', 'count', 'last_date', 'src_codes'];
/** Dòng đã bỏ (archived) quá bao nhiêu ngày thì xóa hẳn khỏi sheet (máy nào cũng đã nhận lệnh xóa) */
var EVIDENCE_PURGE_DAYS_ = 35;

/* ---------------- Dùng chung với tình trạng hồ sơ (17_records.js, js/periods.js) ---------------- */

/** App cung cấp ngày có hồ sơ cho biểu (theo nơi làm): 'ME' | 'CS' | '' */
function evidenceSourceOf_(it) {
  return (it && APP_SOURCE_[it.where]) || '';
}

/**
 * Ngày đầu của kỳ đầy đủ đầu tiên còn giữ ngày có hồ sơ từ app kia: kỳ trước đó không biết (không tính quá hạn).
 * DAY: hôm nay − 61 · WEEK: Thứ Hai sau (hôm nay − 126) · tháng / quý / nửa năm / năm: kỳ sau kỳ chứa (hôm nay − 400).
 */
function evidenceFrom_(type, today) {
  var keep = EVIDENCE_KEEP_DAYS_[type];
  if (!keep) return '';
  var p = periodOf_(type, addDaysIso_(today, -keep));
  return addDaysIso_(p.to, 1);
}

/** App đã nối và đang tính: {ME: true, CS: true} từ Settings.evidence_sources ("ME,CS") */
function evidenceSources_() {
  var out = {};
  String(setting_('evidence_sources') || '').split(',').forEach(function (s) {
    s = trimStr_(s);
    if (EVIDENCE_SRC_[s]) out[s] = true;
  });
  return out;
}

function evidenceSourcesStr_(map) {
  return EVIDENCE_SRC_LIST_.filter(function (s) { return map[s]; }).join(',');
}

function evLinked_(src) {
  var d = EVIDENCE_SRC_[src];
  return !!(d && prop_(d.url) && prop_(d.key));
}

/* ---------------- Gọi cửa đọc của app kia ---------------- */

/** Lời báo theo lý do (app hiện nhãn link.err.<lý do>) */
function linkFailed_(reason, field) {
  return apiError_('LINK_FAILED', { reason: reason }, [fieldError_(field || 'exec_url', 'LINK_FAILED')]);
}

/**
 * Gọi feed.isoEvidence. Mất phản hồi / bị chuyển thành GET (chặng chuyển hướng của Google) thì thử lại tối đa 3 lần.
 * Trả data của phong bì; lỗi → LINK_FAILED {reason}.
 */
function evFetch_(src, url, key, since) {
  var dev = prop_('ISO_FEED_DEVICE_ID');
  if (!isUuidV4_(dev)) { dev = uuid_(); setProp_('ISO_FEED_DEVICE_ID', dev); }
  var body = JSON.stringify({
    api_contract_version: '1.0', action: 'feed.isoEvidence', payload: { key: key, since: since, client: APP_ID },
    device_id: dev, app_version: SERVER_VERSION
  });
  var json = null, lastErr = '';
  for (var attempt = 0; attempt < 3; attempt++) {
    try {
      var resp = UrlFetchApp.fetch(url, { method: 'post', contentType: 'text/plain;charset=utf-8', payload: body, muteHttpExceptions: true, followRedirects: true });
      var text = resp.getContentText();
      try { json = JSON.parse(text); } catch (e) { json = null; lastErr = 'NO_RESPONSE'; }
      if (json && json.via !== 'GET') break;
      if (json) lastErr = 'NO_RESPONSE';
      json = null;
    } catch (e2) { lastErr = 'NO_RESPONSE'; }
    Utilities.sleep(1500);
  }
  if (!json) throw linkFailed_(lastErr || 'NO_RESPONSE');
  if (!json.ok) {
    var c = String(json.code || '');
    if (c === 'FORBIDDEN') throw linkFailed_('FORBIDDEN', 'key');
    if (c === 'FEATURE_NOT_ENABLED' || c === 'CLIENT_UPDATE_REQUIRED') throw linkFailed_('NO_FEED');
    if (c === 'SYSTEM_MAINTENANCE') throw linkFailed_('MAINTENANCE');
    throw linkFailed_('REMOTE_ERROR');
  }
  var data = json.data || {};
  if (data.app_id && String(data.app_id) !== src) throw linkFailed_('WRONG_APP');
  if (!Array.isArray(data.items)) throw linkFailed_('BAD_DATA');
  if (data.items.length > EVIDENCE_MAX_ITEMS_) throw linkFailed_('TOO_MANY');
  return data;
}

/** Lọc dòng hợp lệ: mã biểu, ngày trong [since, hôm nay], số lượt > 0. Trả {list: [{code, date, count}], bad} */
function evParse_(data, since, today) {
  var out = [], bad = 0;
  data.items.forEach(function (x) {
    var code = trimStr_(x && x.form_code), d = trimStr_(x && x.date), n = Number(x && x.count);
    if (!code || code.length > 60 || !isDateStr_(d) || !isFinite(n) || n < 0) { bad++; return; }
    if (!(n > 0) || d < since || d > today) return;
    out.push({ code: code, date: d, count: Math.max(1, Math.round(n)) });
  });
  return { list: out, bad: bad };
}

/* ---------------- Ghép mã biểu ---------------- */

/** Mã biểu so khớp: chữ hoa, Đ → D, bỏ dấu cách, gạch dài → gạch ngắn ("BM-CĐ-03-03a" ≡ "bm-cd-03-03A") */
function normFormCode_(s) {
  var t = String(s || '');
  try { t = t.normalize('NFC'); } catch (e) { /* bỏ qua */ }
  return t.toUpperCase().replace(/Đ/g, 'D').replace(/\s+/g, '').replace(/[‐-―−]/g, '-');
}

/** Bảng mã biểu → biểu ISO (biểu chưa lưu trữ) */
function evItemIndex_(items) {
  var idx = {};
  items.forEach(function (it) {
    if (it.archived_at || !it.code) return;
    var k = normFormCode_(it.code);
    if (!idx[k]) idx[k] = it;
  });
  return idx;
}

/** Biểu ISO của một mã biểu từ app kia: đúng mã; không có thì mã cha (bỏ đuôi a…i, -KT, -CT: BM-CĐ-03-03a → BM-CĐ-03-03) */
function evMatchItem_(idx, code) {
  var k = normFormCode_(code);
  for (var g = 0; g < 4 && k; g++) {
    if (idx[k]) return idx[k];
    var m = /^(.*\d)(?:[A-Z]|-[A-Z]{1,3})$/.exec(k);
    if (!m) return null;
    k = m[1];
  }
  return null;
}

/**
 * Gom ngày có hồ sơ theo biểu ISO và kỳ của biểu. Trả {rows: [dòng Evidence], unknown: [{code, n}], matched: số biểu, dates: số dòng}.
 * evidence_id = <app>|<item_id>|<mã kỳ> (biểu khi phát sinh: một dòng <app>|<item_id>|EVENT, khoảng ngày = ngày đầu – ngày cuối).
 */
function evAggregate_(src, list, items, today) {
  var idx = evItemIndex_(items);
  var agg = {}, unknown = {}, matched = {}, efrom = {};
  list.forEach(function (x) {
    var it = evMatchItem_(idx, x.code);
    if (!it) { unknown[x.code] = (unknown[x.code] || 0) + 1; return; }
    var type = itemPeriodType_(it);
    var p = null, key = 'EVENT';
    if (type !== 'EVENT') {
      p = periodOf_(type, x.date);
      if (efrom[type] === undefined) efrom[type] = evidenceFrom_(type, today);
      if (p.from < efrom[type]) return;
      key = p.key;
    }
    var id = src + '|' + it.item_id + '|' + key;
    var a = agg[id];
    if (!a) {
      a = agg[id] = { evidence_id: id, source: src, item_id: it.item_id, form_code: it.code, period_type: type, period_key: p ? p.key : '',
        period_from: p ? p.from : x.date, period_to: p ? p.to : x.date, count: 0, last_date: '', codes: {} };
    }
    a.count += x.count;
    if (x.date > a.last_date) a.last_date = x.date;
    if (!p) { if (x.date < a.period_from) a.period_from = x.date; if (x.date > a.period_to) a.period_to = x.date; }
    a.codes[x.code] = 1;
    matched[it.item_id] = 1;
  });
  var rows = Object.keys(agg).sort().map(function (id) {
    var a = agg[id];
    a.src_codes = Object.keys(a.codes).sort().join(', ').slice(0, 300);
    delete a.codes;
    return a;
  });
  var unk = Object.keys(unknown).sort().map(function (c) { return { code: c, n: unknown[c] }; });
  return { rows: rows, unknown: unk, matched: Object.keys(matched).length, dates: list.length };
}

/* ---------------- Ghi sheet Evidence ---------------- */

/** Dán Code.gs 2a mà chưa chạy migrateSchema: lần đầu cần thì tự thêm sheet Evidence */
function ensureEvidenceSheet_() {
  if (sheetExists_('Evidence')) return;
  autoMigrate_();
  dbReset_();
  if (!sheetExists_('Evidence')) throw apiError_('SYSTEM_NOT_READY');
}

/**
 * Dòng cần ghi để Evidence của một app khớp danh sách mới: thêm, sửa (dòng đổi), bỏ (archived_at) dòng không còn.
 * Gọi dưới khóa ghi. counts: {added, updated, removed}.
 */
function evDiff_(src, incoming, counts) {
  var cur = {};
  readRows_('Evidence').forEach(function (r) { if (r.source === src) cur[r.evidence_id] = r; });
  var nowIso = isoVN_(now_());
  var writes = [], seen = {};
  var same = function (a, b) { return String(a === null || a === undefined ? '' : a) === String(b === null || b === undefined ? '' : b); };
  incoming.forEach(function (n) {
    seen[n.evidence_id] = true;
    var old = cur[n.evidence_id];
    if (!old) {
      var row = cNewSystem_(Object.assign({ synced_at: nowIso }, n));
      writes.push({ sheet: 'Evidence', mode: 'insert', row: row });
      counts.added++;
      return;
    }
    if (!old.archived_at && EVIDENCE_FIELDS_.every(function (f) { return same(old[f], n[f]); })) return;
    var up = Object.assign({}, old, n, { synced_at: nowIso, archived_at: '', record_version: (old.record_version || 0) + 1, updated_at: nowIso, updated_by: SYSTEM_USER });
    var rn = up.__row;
    delete up.__row;
    writes.push({ sheet: 'Evidence', mode: 'update', row: up, rowNum: rn });
    counts.updated++;
  });
  Object.keys(cur).forEach(function (id) {
    var old = cur[id];
    if (seen[id] || old.archived_at) return;
    var up = Object.assign({}, old, { archived_at: nowIso, record_version: (old.record_version || 0) + 1, updated_at: nowIso, updated_by: SYSTEM_USER });
    var rn = up.__row;
    delete up.__row;
    writes.push({ sheet: 'Evidence', mode: 'update', row: up, rowNum: rn });
    counts.removed++;
  });
  return writes;
}

/** Xóa hẳn dòng đã bỏ quá EVIDENCE_PURGE_DAYS_ ngày (viết lại sheet một lần) khi có từ 200 dòng như vậy */
function evPurge_() {
  if (!sheetExists_('Evidence')) return 0;
  return withWriteLock_(function () {
    var cut = isoVN_(new Date(now_().getTime() - EVIDENCE_PURGE_DAYS_ * 86400000));
    var rows = readRows_('Evidence');
    var old = rows.filter(function (r) { return r.archived_at && String(r.archived_at) < cut; }).length;
    if (old < 200) return 0;
    var keep = rows.filter(function (r) { return !(r.archived_at && String(r.archived_at) < cut); });
    var sheet = sh_('Evidence');
    var h = hdr_('Evidence');
    var last = sheet.getLastRow();
    if (last >= 2) sheet.getRange(2, 1, last - 1, h.cols.length).clearContent();
    if (keep.length) sheet.getRange(2, 1, keep.length, h.cols.length).setValues(keep.map(function (r) { return objToRow_('Evidence', h, r); }));
    var st = readState_();
    var rev = Number(stateGet_(st, 'sync_revision', 0)) + 1;
    stateWrite_(st, { sync_revision: ['INT', rev], 'table_rev.Evidence': ['INT', rev] }, SYSTEM_USER);
    return old;
  });
}

/** Ghi trạng thái lần đồng bộ của một app (SystemState ev.<app>.*) */
function evNote_(src, status, error, extra) {
  withWriteLock_(function () {
    var st = readState_();
    var p = 'ev.' + src + '.';
    var su = {};
    su[p + 'last_at'] = ['DATETIME', isoVN_(now_())];
    su[p + 'last_status'] = ['STRING', status];
    su[p + 'last_error'] = ['STRING', error || ''];
    if (status === 'OK') su[p + 'ok_at'] = ['DATETIME', isoVN_(now_())];
    if (extra) Object.keys(extra).forEach(function (k) { su[p + k] = ['STRING', typeof extra[k] === 'string' ? extra[k] : JSON.stringify(extra[k])]; });
    stateWrite_(st, su, SYSTEM_USER);
  });
  cache_().remove('sys:state');
}

/**
 * Lấy ngày có hồ sơ từ một app rồi ghi Evidence. link: {url, key} (link mới, chưa lưu: lỗi thì không ghi trạng thái lỗi của app)
 * — không có thì dùng link đã lưu. dry: chỉ thử, không ghi. Trả {source, dates, matched, rows, added, updated, removed, unknown, bad, server_time}.
 */
function evidenceSyncSource_(src, link, dry) {
  var d = EVIDENCE_SRC_[src];
  var url = link ? link.url : prop_(d.url), key = link ? link.key : prop_(d.key);
  if (!url || !key) throw linkFailed_('NOT_LINKED');
  var today = todayVN_();
  var since = addDaysIso_(today, -EVIDENCE_FEED_DAYS_);
  var data;
  try {
    data = evFetch_(src, url, key, since);
  } catch (e) {
    if (!dry && !link) evNote_(src, 'FAILED', (e.apiData && e.apiData.reason) || 'ERROR');
    throw e;
  }
  var parsed = evParse_(data, since, today);
  var items = tableCache_(['Items'], readState_()).rows('Items');
  var ag = evAggregate_(src, parsed.list, items, today);
  var out = { source: src, dates: ag.dates, matched: ag.matched, rows: ag.rows.length, added: 0, updated: 0, removed: 0,
    unknown: ag.unknown.slice(0, 50), unknown_n: ag.unknown.length, bad: parsed.bad, server_time: String(data.server_time || '') };
  if (dry) return out;
  ensureEvidenceSheet_();
  var counts = { added: 0, updated: 0, removed: 0 };
  withWriteLock_(function () {
    var writes = evDiff_(src, ag.rows, counts);
    if (writes.length) systemWrite_(writes, { action: 'evidence.sync', entity_type: 'EVIDENCE', entity_id: src, after_json: { source: src, added: counts.added, updated: counts.updated, removed: counts.removed } });
  });
  out.added = counts.added; out.updated = counts.updated; out.removed = counts.removed;
  evNote_(src, 'OK', '', { stats: { dates: ag.dates, matched: ag.matched, rows: ag.rows.length, bad: parsed.bad }, unknown: ag.unknown.slice(0, 30) });
  return out;
}

/** Bỏ mọi dòng Evidence của một app (ngắt kết nối) */
function evidenceClearSource_(src) {
  if (!sheetExists_('Evidence')) return 0;
  var counts = { added: 0, updated: 0, removed: 0 };
  withWriteLock_(function () {
    var writes = evDiff_(src, [], counts);
    if (writes.length) systemWrite_(writes, { action: 'evidence.clear', entity_type: 'EVIDENCE', entity_id: src, after_json: { source: src, removed: counts.removed } });
  });
  return counts.removed;
}

/** Ghi Settings.evidence_sources (gửi xuống app: app đổi cài đặt thì tải lại) */
function setEvidenceSource_(src, on, by) {
  var m = evidenceSources_();
  if (!!m[src] === !!on) return;
  if (on) m[src] = true; else delete m[src];
  withWriteLock_(function () { writeSetting_('evidence_sources', evidenceSourcesStr_(m), by); });
}

/** Cài trigger mỗi giờ nếu chưa có (lần nối đầu tiên; installTriggers cũng cài) */
function ensureEvidenceTrigger_() {
  try {
    var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'syncEvidenceHourly'; });
    if (!has) ScriptApp.newTrigger('syncEvidenceHourly').timeBased().everyHours(1).create();
    return true;
  } catch (e) {
    console.warn('ensureEvidenceTrigger_ ' + (e && e.message));
    return false;
  }
}

/* ---------------- Trigger, hàm chạy tay ---------------- */

/** Trigger mỗi giờ: đồng bộ mọi app đã nối; dọn dòng cũ */
function syncEvidenceHourly() {
  var t0 = Date.now();
  propsReset_(true);
  try {
    dbReset_();
    if (!prop_('BUSINESS_SPREADSHEET_ID')) return;
    EVIDENCE_SRC_LIST_.forEach(function (src) {
      if (!evLinked_(src)) return;
      try { evidenceSyncSource_(src); } catch (e) {
        console.warn('syncEvidenceHourly ' + src + ' ' + (e && e.apiCode ? e.apiCode + ' ' + JSON.stringify(e.apiData) : e));
      }
    });
    try { evPurge_(); } catch (e2) { console.warn('evPurge_ ' + (e2 && e2.message)); }
  } finally {
    try { recordTriggerRun_('syncEvidenceHourly', t0); } catch (e3) { /* bỏ qua */ }
    propsReset_(false);
  }
}

/** Chạy từ trình soạn: lấy ngay ngày có hồ sơ từ M&E và Checksheet đã nối, in kết quả */
function adminSyncEvidenceNow() {
  dbReset_();
  EVIDENCE_SRC_LIST_.forEach(function (src) {
    if (!evLinked_(src)) { log_(EVIDENCE_SRC_[src].name + ': chưa nối.'); return; }
    try {
      var r = evidenceSyncSource_(src);
      log_(EVIDENCE_SRC_[src].name + ': ' + r.dates + ' dòng ngày · ' + r.matched + ' biểu · thêm ' + r.added + ', sửa ' + r.updated + ', bỏ ' + r.removed +
        (r.unknown_n ? ' · mã lạ: ' + r.unknown.map(function (u) { return u.code; }).join(', ') : ''));
    } catch (e) {
      log_(EVIDENCE_SRC_[src].name + ': LỖI ' + ((e.apiData && e.apiData.reason) || e.message));
    }
  });
}

/* ---------------- Action ---------------- */

function linkSourceArg_(p) {
  var src = trimStr_(p && p.source);
  if (!EVIDENCE_SRC_[src]) throw validationError_([fieldError_('source', 'INVALID_VALUE')]);
  return src;
}

/** Kiểm dạng link / mã trước khi hỏi PIN (09_api PRECHECK_) */
function precheckLinkSet_(ctx) {
  var p = ctx.req.payload || {};
  linkSourceArg_(p);
  if (p.clear) return;
  linkInputs_(p);
}

function linkInputs_(p) {
  var url = trimStr_(p.exec_url), key = trimStr_(p.key);
  var errs = [];
  if (!EXEC_URL_RE_.test(url)) errs.push(fieldError_('exec_url', 'URL_INVALID'));
  if (key.length < 24 || key.length > 200) errs.push(fieldError_('key', 'KEY_FORMAT'));
  if (errs.length) throw validationError_(errs);
  return { url: url, key: key };
}

/** link.test {source, exec_url?, key?} (Quản trị): thử kết nối, không lưu. Bỏ trống link + mã = thử link đã lưu. */
function linkTest_(ctx) {
  var p = ctx.req.payload || {};
  var src = linkSourceArg_(p);
  var link = null;
  if (trimStr_(p.exec_url) || trimStr_(p.key)) link = linkInputs_(p);
  else if (!evLinked_(src)) throw linkFailed_('NOT_LINKED');
  var r = evidenceSyncSource_(src, link, true);
  return { test: r };
}

/**
 * link.set {source, exec_url, key} (Quản trị, PIN): thử kết nối trước khi lưu; được thì lưu link + mã vào Thuộc tính tập lệnh,
 * bật tính hồ sơ theo app đó (evidence_sources), lấy ngay ngày có hồ sơ, cài trigger mỗi giờ.
 * {source, clear: true}: ngắt kết nối — xóa link + mã, bỏ dòng Evidence của app đó, biểu M&E/Checksheet trở về "chưa tính".
 */
function linkSet_(ctx) {
  var p = ctx.req.payload || {};
  var src = linkSourceArg_(p);
  var d = EVIDENCE_SRC_[src];
  var uid = ctx.user.user_id;
  if (p.clear) {
    var was = evLinked_(src);
    delProp_(d.url);
    delProp_(d.key);
    setEvidenceSource_(src, false, uid);
    var removed = evidenceClearSource_(src);
    withWriteLock_(function () {
      writeAudit_({ user_id: uid, device_id: ctx.req.device_id, action: 'link.set', entity_type: 'SYSTEM', entity_id: 'LINK_' + src, before_json: { linked: was },
        after_json: { linked: false, removed: removed }, operation_id: ctx.req.operation_id || '', auth_basis: authBasis_(ctx) });
      var st = readState_();
      var su = {};
      su['ev.' + src + '.last_status'] = ['STRING', ''];
      su['ev.' + src + '.last_error'] = ['STRING', ''];
      su['ev.' + src + '.unknown'] = ['STRING', '[]'];
      stateWrite_(st, su, uid);
    });
    cache_().remove('sys:state');
    return { linked: false, removed: removed, info: linkInfoData_() };
  }
  var link = linkInputs_(p);
  ensureEvidenceSheet_();
  // Lấy bằng link mới trước: lỗi thì không lưu gì (link cũ, nếu có, vẫn chạy)
  var out = evidenceSyncSource_(src, link);
  setProp_(d.url, link.url);
  setProp_(d.key, link.key);
  setEvidenceSource_(src, true, uid);
  var trig = ensureEvidenceTrigger_();
  withWriteLock_(function () {
    writeAudit_({ user_id: uid, device_id: ctx.req.device_id, action: 'link.set', entity_type: 'SYSTEM', entity_id: 'LINK_' + src, before_json: null,
      after_json: { exec_url_tail: link.url.slice(-12), linked: true, dates: out.dates, matched: out.matched }, operation_id: ctx.req.operation_id || '', auth_basis: authBasis_(ctx) });
  });
  return { linked: true, sync: out, trigger: trig, info: linkInfoData_() };
}

/** evidence.sync {source?} (Quản trị): "Cập nhật ngay" — đồng bộ một hoặc mọi app đã nối */
function evidenceSyncAction_(ctx) {
  var p = ctx.req.payload || {};
  var list = p.source ? [linkSourceArg_(p)] : EVIDENCE_SRC_LIST_.filter(evLinked_);
  if (!list.length) throw linkFailed_('NOT_LINKED');
  var results = {};
  list.forEach(function (src) {
    try { results[src] = { ok: true, sync: evidenceSyncSource_(src) }; } catch (e) {
      if (!e.apiCode) throw e;
      results[src] = { ok: false, code: e.apiCode, reason: (e.apiData && e.apiData.reason) || '' };
    }
  });
  return { results: results, info: linkInfoData_() };
}

/** Trạng thái kết nối của một app cho màn Kết nối, healthCheck (không lộ mã kết nối) */
function linkSourceInfo_(src, st) {
  var d = EVIDENCE_SRC_[src];
  var url = prop_(d.url) || '';
  var g = function (k, def) { return stateGet_(st, 'ev.' + src + '.' + k, def); };
  var parse = function (s, def) { try { return s ? JSON.parse(s) : def; } catch (e) { return def; } };
  return {
    source: src, name: d.name, linked: evLinked_(src), counted: !!evidenceSources_()[src], exec_url_tail: url ? '…' + url.slice(-14) : '',
    last_at: g('last_at', ''), last_status: g('last_status', ''), last_error: g('last_error', ''), ok_at: g('ok_at', ''),
    stats: parse(g('stats', ''), null), unknown: parse(g('unknown', ''), [])
  };
}

function linkInfoData_() {
  dbReset_();
  var st = readState_();
  var out = { sources: {}, trigger: false, feed_days: EVIDENCE_FEED_DAYS_, keep_days: EVIDENCE_KEEP_DAYS_ };
  EVIDENCE_SRC_LIST_.forEach(function (s) { out.sources[s] = linkSourceInfo_(s, st); });
  try { out.trigger = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'syncEvidenceHourly'; }); } catch (e) { out.trigger = false; }
  return out;
}

/** link.info (Quản trị): trạng thái kết nối M&E và Checksheet */
function linkInfo_(ctx) {
  return linkInfoData_();
}
