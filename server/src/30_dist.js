/* 30_dist: Sổ phân phối & thu hồi bản in (Đợt 2, phiên 2d — thay BM-ISO-02-03).
 * Một dòng = một nơi nhận (bộ phận + người / vị trí, số bản) của một lần ban hành. Chỉ phát bản của biểu đang hiệu lực (●).
 * Ban hành lần mới (hoặc đặt ✕): mọi dòng còn "Đang dùng" của lần cũ thành "Cần thu hồi" (tính theo lần ban hành, không cần ghi gì
 * lúc ban hành) → Thư ký ISO thu hồi (PIN), có thể phát luôn bản lần mới cho đúng các nơi đó. Bản in chưa thu hồi quá dist_recall_days
 * ngày kể từ ngày ban hành lần mới → báo đỏ (Chờ bạn xử lý, Trạng thái hệ thống). Ghi nhầm → Bỏ dòng (VOID).
 * Quyền: phát, thu hồi, sửa — Thư ký ISO / cấp 4 (mục 4: ban hành, thu hồi); xem — cấp 2+ / Thư ký ISO trong phạm vi biểu. */

/** Lần ban hành hiện hành của biểu (● nhập từ Excel không ghi lần = 01); '' khi chưa ban hành */
function itemCurRev_(it) {
  if (!it) return '';
  return String(it.current_rev || (it.status === 'ISSUED' ? '01' : ''));
}

function normRev_(r) {
  var s = String(r || '').replace(/^0+(?=\d)/, '');
  return s.length < 2 ? ('0' + s).slice(-2) : s;
}

/** Dòng đang dùng mà biểu đã ban hành lần khác hoặc đã ngừng dùng (✕) → cần thu hồi. Trả '' | 'DUE' */
function distDue_(d, it) {
  if (!d || d.state !== 'ACTIVE' || d.archived_at || !it) return '';
  if (it.status === 'NA') return 'DUE';
  return normRev_(d.rev) !== normRev_(itemCurRev_(it)) ? 'DUE' : '';
}

/** Ngày bắt đầu phải thu hồi: ngày ban hành lần hiện hành (biểu ✕: ngày đặt ✕) */
function distDueSince_(it) {
  if (!it) return '';
  if (it.status === 'NA') return String(it.updated_at || '').slice(0, 10);
  return String(it.issued_at || '');
}

/** Thống kê: {active nơi, copies bản, due, overdue} trên toàn bộ sổ (Trạng thái hệ thống) */
function distStats_(today) {
  var items = {};
  readRows_('Items').forEach(function (it) { items[it.item_id] = it; });
  var days = Number(setting_('dist_recall_days')) || 7;
  var out = { active: 0, copies: 0, due: 0, overdue: 0 };
  readRows_('Distributions').forEach(function (d) {
    if (d.archived_at || d.state !== 'ACTIVE') return;
    out.active++;
    out.copies += Number(d.copies) || 0;
    var it = items[d.item_id];
    if (distDue_(d, it)) {
      out.due++;
      var since = distDueSince_(it);
      if (since && addDaysIso_(since, days) < today) out.overdue++;
    }
  });
  return out;
}

function distResult_(ctx, rows, item) {
  return {
    entity_type: 'DIST', entity_id: rows.length ? rows[0].dist_id : '', record_version: rows.length ? rows[0].record_version : null,
    records: rows.map(function (r) { return projectRow_(ctx, r); }), item: item ? projectRow_(ctx, item) : null
  };
}

/** Biểu (ngoài khóa) cho kiểm quyền: Thư ký ISO / cấp 4, biểu trong phạm vi */
function distItem_(ctx, itemId) {
  ensureDocControlSchema_();
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  if (!isUuidV4_(itemId)) throw validationError_([fieldError_('item_id', 'ID_INVALID')]);
  var it = findOne_('Items', 'item_id', itemId);
  if (!it || it.archived_at) throw apiError_('NOT_FOUND');
  if (!itemVisible_(ctx.user, it)) throw apiError_('FORBIDDEN');
  return it;
}

/** Một dòng nơi nhận: {dist_id, dept_code, holder, copies} → lỗi theo chỉ số dòng (field rows.i.x) */
function distRowInput_(r, i, depts, errs) {
  var f = function (k) { return 'rows.' + i + '.' + k; };
  r = r || {};
  if (!isUuidV4_(r.dist_id)) errs.push(fieldError_(f('dist_id'), 'ID_INVALID'));
  var dept = trimStr_(r.dept_code);
  if (!dept) errs.push(fieldError_(f('dept_code'), 'REQUIRED'));
  else if (!depts[dept]) errs.push(fieldError_(f('dept_code'), 'DEPT_UNKNOWN'));
  var holder = trimStr_(r.holder);
  if (holder.length > 120) errs.push(fieldError_(f('holder'), 'TOO_LONG'));
  var copies = r.copies === undefined || r.copies === null || r.copies === '' ? 1 : Number(r.copies);
  if (!(copies >= 1 && copies <= 99) || Math.floor(copies) !== copies) errs.push(fieldError_(f('copies'), 'INVALID_VALUE'));
  return { dist_id: r.dist_id, dept_code: dept, holder: holder, copies: copies };
}

function distDepts_() {
  var m = {};
  readRows_('Depts').forEach(function (d) { m[d.dept_code] = d; });
  return m;
}

function distDateInput_(p, field, today, errs) {
  var d = trimStr_(p[field] || '') || today;
  if (!isDateStr_(d)) errs.push(fieldError_(field, 'INVALID_DATE'));
  else if (d > today) errs.push(fieldError_(field, 'DATE_FUTURE'));
  return d;
}

/** Dòng mới của lần đang hiệu lực */
function distNewRow_(ctx, it, r, date, note) {
  return cNew_(ctx, {
    dist_id: r.dist_id, item_id: it.item_id, version_id: it.current_version_id || '', rev: itemCurRev_(it), dept_code: r.dept_code,
    holder: r.holder, copies: r.copies, dist_date: date, note: note || '', state: 'ACTIVE', recalled_date: '', recalled_at: '', recalled_by: '',
    recall_note: '', replaced_by_id: '', void_at: '', void_by: '', void_reason: ''
  });
}

/* ---------------- dist.issue ---------------- */

/**
 * dist.issue {item_id, dist_date (≤ hôm nay, mặc định hôm nay), note, rows: [{dist_id, dept_code, holder, copies}]} — ghi phát bản in
 * của lần đang hiệu lực cho 1–30 nơi nhận. Biểu phải đang hiệu lực (●).
 */
function distIssue_(ctx) {
  var p = ctx.req.payload || {};
  var it0 = distItem_(ctx, p.item_id);
  var today = todayVN_();
  var errs = [];
  var rows = Array.isArray(p.rows) ? p.rows : [];
  if (!rows.length) errs.push(fieldError_('rows', 'REQUIRED'));
  if (rows.length > DIST_MAX_ROWS_) errs.push(fieldError_('rows', 'TOO_MANY'));
  var date = distDateInput_(p, 'dist_date', today, errs);
  var note = trimStr_(p.note || '');
  if (note.length > 300) errs.push(fieldError_('note', 'TOO_LONG'));
  var depts = distDepts_();
  var input = rows.slice(0, DIST_MAX_ROWS_).map(function (r, i) { return distRowInput_(r, i, depts, errs); });
  var seen = {};
  input.forEach(function (r, i) { if (seen[r.dist_id]) errs.push(fieldError_('rows.' + i + '.dist_id', 'ID_EXISTS')); seen[r.dist_id] = 1; });
  if (it0.status !== 'ISSUED') errs.push(fieldError_('item_id', 'ITEM_NOT_ISSUED'));
  if (errs.length) throw validationError_(errs);
  return executeWrite_(ctx, {
    entity_type: 'DIST', entity_id: p.item_id,
    build: function () {
      var it = findOne_('Items', 'item_id', p.item_id);
      if (!it || it.status !== 'ISSUED') throw validationError_([fieldError_('item_id', 'ITEM_NOT_ISSUED')]);
      var out = input.map(function (r) {
        assertNewId_('Distributions', 'dist_id', r.dist_id);
        return distNewRow_(ctx, it, r, date, note);
      });
      return {
        writes: out.map(function (r) { return { sheet: 'Distributions', mode: 'insert', row: r }; }),
        result: distResult_(ctx, out, null), record_version: 1,
        audit: { entity_type: 'DIST', entity_id: it.item_id, before_json: null,
          after_json: { code: it.code, rev: itemCurRev_(it), rows: out.length, copies: out.reduce(function (s, r) { return s + r.copies; }, 0) } }
      };
    }
  });
}

/* ---------------- dist.recall ---------------- */

/** Dòng phân phối (ngoài khóa) + biểu: Thư ký ISO, biểu trong phạm vi */
function distLoad_(ctx, id, field) {
  ensureDocControlSchema_();
  if (!isUuidV4_(id)) throw validationError_([fieldError_(field || 'dist_id', 'ID_INVALID')]);
  var d = findOne_('Distributions', 'dist_id', id);
  if (!d || d.archived_at) throw apiError_('NOT_FOUND');
  var it = findOne_('Items', 'item_id', d.item_id);
  if (!it || !itemVisible_(ctx.user, it)) throw apiError_('FORBIDDEN');
  return { d: d, it: it };
}

function precheckDistRecall_(ctx) {
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  var ids = (ctx.req.payload || {}).dist_ids;
  if (!Array.isArray(ids) || !ids.length) throw validationError_([fieldError_('dist_ids', 'REQUIRED')]);
  if (ids.length > DIST_MAX_RECALL_) throw validationError_([fieldError_('dist_ids', 'TOO_MANY')]);
  ids.forEach(function (id) { distLoad_(ctx, id, 'dist_ids'); });
}

/**
 * dist.recall {dist_ids: [..≤100], recalled_date (≤ hôm nay), note, reissue: true | false, new_ids: {dist_id cũ: dist_id mới}} (PIN):
 * thu hồi các dòng đang dùng. reissue: phát luôn bản của lần đang hiệu lực cho đúng nơi nhận đó (cùng bộ phận, người / vị trí, số bản),
 * chỉ với biểu đang hiệu lực — dòng cũ ghi replaced_by_id.
 */
function distRecall_(ctx) {
  var p = ctx.req.payload || {};
  var ids = Array.isArray(p.dist_ids) ? p.dist_ids : [];
  var today = todayVN_();
  var errs = [];
  var date = distDateInput_(p, 'recalled_date', today, errs);
  var note = trimStr_(p.note || '');
  if (note.length > 300) errs.push(fieldError_('note', 'TOO_LONG'));
  var reissue = p.reissue === true;
  var newIds = p.new_ids && typeof p.new_ids === 'object' ? p.new_ids : {};
  var seen = {};
  ids.forEach(function (id) {
    if (seen[id]) errs.push(fieldError_('dist_ids', 'ID_EXISTS'));
    seen[id] = 1;
    if (reissue && !isUuidV4_(newIds[id])) errs.push(fieldError_('new_ids', 'ID_INVALID'));
  });
  if (errs.length) throw validationError_(errs);
  return executeWrite_(ctx, {
    entity_type: 'DIST', entity_id: ids[0],
    build: function () {
      var writes = [], recalled = [], added = [], items = {};
      ids.forEach(function (id) {
        var cur = findOne_('Distributions', 'dist_id', id);
        if (!cur || cur.archived_at) throw apiError_('NOT_FOUND');
        if (cur.state !== 'ACTIVE') throw validationError_([fieldError_('dist_ids', 'STATUS_INVALID')]);
        var row = clone_(cur); delete row.__row;
        var it = items[row.item_id] || (items[row.item_id] = findOne_('Items', 'item_id', row.item_id));
        row.state = 'RECALLED';
        row.recalled_date = date;
        row.recalled_at = isoVN_(now_());
        row.recalled_by = ctx.user.user_id;
        row.recall_note = note;
        if (reissue && it && it.status === 'ISSUED') {
          if (normRev_(row.rev) === normRev_(itemCurRev_(it)) && !note) throw validationError_([fieldError_('note', 'REQUIRED')]);
          assertNewId_('Distributions', 'dist_id', newIds[id]);
          var nr = distNewRow_(ctx, it, { dist_id: newIds[id], dept_code: row.dept_code, holder: row.holder, copies: row.copies }, date, '');
          row.replaced_by_id = nr.dist_id;
          added.push(nr);
        }
        cUpdate_(ctx, row);
        recalled.push(row);
        writes.push({ sheet: 'Distributions', mode: 'update', row: row });
      });
      added.forEach(function (r) { writes.push({ sheet: 'Distributions', mode: 'insert', row: r }); });
      return {
        writes: writes, result: { entity_type: 'DIST', entity_id: ids[0], record_version: recalled.length ? recalled[0].record_version : null,
          records: recalled.concat(added).map(function (r) { return projectRow_(ctx, r); }), recalled: recalled.length, reissued: added.length },
        record_version: recalled.length ? recalled[0].record_version : null,
        audit: { entity_type: 'DIST', entity_id: ids[0], before_json: null,
          after_json: { recalled: recalled.map(function (r) { return { item_id: r.item_id, rev: r.rev, dept: r.dept_code, copies: r.copies }; }), reissued: added.length },
          reason: note }
      };
    }
  });
}

/* ---------------- dist.edit ---------------- */

/**
 * dist.edit {dist_id, dept_code, holder, copies, dist_date, note} — sửa dòng đang dùng (ghi nhầm); {dist_id, void: true, reason} — bỏ dòng
 * ghi nhầm (không tính vào sổ). expected_version bắt buộc.
 */
function distEdit_(ctx) {
  var p = ctx.req.payload || {};
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  var x = distLoad_(ctx, p.dist_id);
  if (x.d.state !== 'ACTIVE') throw stateInvalid_();
  var today = todayVN_();
  var errs = [];
  var isVoid = p.void === true;
  var reason = isVoid ? reasonText_(p, 'reason', true, 300) : '';
  var upd = {};
  if (!isVoid) {
    var depts = distDepts_();
    if (p.dept_code !== undefined) { upd.dept_code = trimStr_(p.dept_code); if (!depts[upd.dept_code]) errs.push(fieldError_('dept_code', 'DEPT_UNKNOWN')); }
    if (p.holder !== undefined) { upd.holder = trimStr_(p.holder); if (upd.holder.length > 120) errs.push(fieldError_('holder', 'TOO_LONG')); }
    if (p.copies !== undefined) { upd.copies = Number(p.copies); if (!(upd.copies >= 1 && upd.copies <= 99) || Math.floor(upd.copies) !== upd.copies) errs.push(fieldError_('copies', 'INVALID_VALUE')); }
    if (p.dist_date !== undefined) upd.dist_date = distDateInput_(p, 'dist_date', today, errs);
    if (p.note !== undefined) { upd.note = trimStr_(p.note); if (upd.note.length > 300) errs.push(fieldError_('note', 'TOO_LONG')); }
  }
  if (errs.length) throw validationError_(errs);
  return executeWrite_(ctx, {
    entity_type: 'DIST', entity_id: p.dist_id,
    build: function () {
      var cur = findOne_('Distributions', 'dist_id', p.dist_id);
      if (!cur) throw apiError_('NOT_FOUND');
      assertVersion_(ctx, cur, 'DIST', 'Distributions');
      if (cur.state !== 'ACTIVE') throw stateInvalid_();
      var row = clone_(cur); delete row.__row;
      var before = { dept_code: row.dept_code, holder: row.holder, copies: row.copies, dist_date: row.dist_date, state: row.state };
      if (isVoid) {
        row.state = 'VOID'; row.void_at = isoVN_(now_()); row.void_by = ctx.user.user_id; row.void_reason = reason;
      } else Object.keys(upd).forEach(function (k) { row[k] = upd[k]; });
      cUpdate_(ctx, row);
      return {
        writes: [{ sheet: 'Distributions', mode: 'update', row: row }], result: distResult_(ctx, [row], null), record_version: row.record_version,
        audit: { entity_type: 'DIST', entity_id: row.dist_id, before_json: before,
          after_json: { dept_code: row.dept_code, holder: row.holder, copies: row.copies, dist_date: row.dist_date, state: row.state }, reason: reason }
      };
    }
  });
}
