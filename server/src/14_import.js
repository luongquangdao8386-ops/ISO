/* 14_import: nhập file Excel tổng (mục 6 đặc tả) — xem trước rồi mới ghi.
 * App đọc tệp bằng SheetJS, gửi các ô của sheet "Danh mục tổng - 总清单" (cột A–Z, dữ liệu từ dòng 5) theo lượt ≤ 200 dòng
 * (import.preview), kèm điều khoản đọc từ hai sheet Phủ ISO 9001 / Phủ BRCGS ở lượt đầu. Máy chủ chuẩn hóa, so với danh mục
 * hiện có (khóa = mã biểu: có rồi → UPDATE, chưa có → ADD, giống hệt → Không đổi), lưu ImportBatches/ImportRows.
 * Ghi (import.commit, PIN): mỗi lượt tối đa 100 dòng. Lô nhạy cảm: người ghi khác người nhập, trừ cấp 4.
 * Biểu ● nhập từ Excel mà chưa có tệp → ban hành, gắn cờ "chưa có tệp" (file_missing) để Thư ký ISO tải lên ở phiên 1b. */

var IMPORT_TEMPLATE_KEY_ = 'iso_catalog';
var IMPORT_TEMPLATE_VERSION_ = '1';
var IMPORT_PART_MAX_ = 200;
var IMPORT_COMMIT_MAX_ = 100;
var IMPORT_COMMIT_BUDGET_MS_ = 25000;
var IMPORT_CELL_COLS_ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Cột *_json đọc ra đã là object (fromCell_); chuỗi cũ thì parse */
function jsonVal_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return null; } }
  return v;
}

function batchProject_(b, dir) {
  var u = dir[b.imported_by], c = dir[b.committed_by];
  return {
    import_batch_id: b.import_batch_id, file_name: b.file_name, status: b.status, imported_by: b.imported_by,
    imported_by_name: u ? u.employee_code + ' · ' + u.display_name : '', imported_at: b.imported_at,
    committed_by_name: c ? c.employee_code + ' · ' + c.display_name : '', completed_at: b.completed_at,
    total_rows: b.total_rows || 0, add_count: b.add_count || 0, update_count: b.update_count || 0, same_count: b.same_count || 0,
    error_count: b.error_count || 0, clause_count: b.clause_count || 0, committed_rows: b.committed_rows || 0,
    // Dòng ngoài phạm vi áp dụng (2e): không có cột riêng — tổng trừ các loại còn lại
    skip_count: Math.max(0, (b.total_rows || 0) - (b.add_count || 0) - (b.update_count || 0) - (b.same_count || 0) - (b.error_count || 0)),
    record_version: b.record_version || 1
  };
}

/** Điều khoản đọc từ tệp → dòng Clauses chuẩn hóa; trả {rows, errors} */
function normClauses_(list) {
  var out = [], errs = [], seen = {};
  (Array.isArray(list) ? list : []).forEach(function (c, i) {
    var std = String(c && c.std || '');
    var key = cellText_(c && c.key).replace(/\n/g, ' ');
    if (CLAUSE_STDS_.indexOf(std) < 0 || !key || key.length > 120) { errs.push(fieldError_('clauses', 'INVALID_VALUE', i)); return; }
    var id = std + '|' + key;
    if (seen[id]) return;
    seen[id] = true;
    var nm = splitBiCell_(c.name), gr = splitBiCell_(c.group);
    var row = {
      clause_id: id, std: std, key: key, group_vi: c.group_vi !== undefined ? cellText_(c.group_vi) : gr.vi, group_zh: c.group_zh !== undefined ? cellText_(c.group_zh) : gr.zh,
      name_vi: c.name_vi !== undefined ? cellText_(c.name_vi) : nm.vi, name_zh: c.name_zh !== undefined ? cellText_(c.name_zh) : nm.zh,
      mandatory_record: c.mandatory_record === true, sort_order: Number(c.sort_order) || i + 1, active: true
    };
    // Sheet Phủ không có cột / dòng nhóm (file xuất từ app): giữ nhóm đang có, không xóa trắng
    if (c.group === undefined && c.group_vi === undefined && c.group_zh === undefined) row.keep_group = true;
    out.push(row);
  });
  return { rows: out, errors: errs };
}

var CLAUSE_FIELDS_ = ['group_vi', 'group_zh', 'name_vi', 'name_zh', 'mandatory_record', 'sort_order', 'active'];

/** Cột so / ghi của một dòng điều khoản đọc từ tệp (keep_group: bỏ nhóm) */
function clauseFields_(r) {
  return r.keep_group ? CLAUSE_FIELDS_.filter(function (k) { return k !== 'group_vi' && k !== 'group_zh'; }) : CLAUSE_FIELDS_;
}

/** Điều khoản thêm/sửa/ngừng so với bảng Clauses (chỉ chuẩn có trong tệp mới bị ngừng dòng thiếu) */
function clauseDiff_(rows) {
  var cur = {};
  readRows_('Clauses').forEach(function (r) { cur[r.clause_id] = r; });
  var stds = {};
  rows.forEach(function (r) { stds[r.std] = true; });
  var add = [], upd = [], seen = {};
  rows.forEach(function (r) {
    seen[r.clause_id] = true;
    var o = cur[r.clause_id];
    if (!o) { add.push(r); return; }
    if (clauseFields_(r).some(function (k) { return cmpVal_(o[k]) !== cmpVal_(r[k]); })) upd.push(r);
  });
  var off = Object.keys(cur).filter(function (id) { return !seen[id] && stds[cur[id].std] && cur[id].active; });
  return { add: add, update: upd, deactivate: off };
}

/* ---------------- import.preview ---------------- */

/**
 * import.preview {import_batch_id, file_name, source_sha256, meta: {template_key, version, dataset_epoch}, part: {index, count},
 *   total_rows, rows: [{row_number, cells: {A..Z}}], clauses?: [{std, key, group, name, mandatory_record, sort_order}]}
 * Lượt đầu tạo lô; lượt cuối tính số dòng thêm / sửa / không đổi / lỗi, lô sang PREVIEWED.
 */
function importPreview_(ctx) {
  var p = ctx.req.payload || {};
  var errs = [];
  if (!isUuidV4_(p.import_batch_id)) errs.push(fieldError_('import_batch_id', 'ID_INVALID'));
  var part = p.part || {};
  var idx = Number(part.index), partCnt = Number(part.count);
  if (!(idx >= 0 && partCnt >= 1 && idx < partCnt && Math.floor(idx) === idx && Math.floor(partCnt) === partCnt)) errs.push(fieldError_('part', 'INVALID_VALUE'));
  var rows = Array.isArray(p.rows) ? p.rows : null;
  if (!rows) errs.push(fieldError_('rows', 'REQUIRED'));
  else if (rows.length > IMPORT_PART_MAX_) errs.push(fieldError_('rows', 'TOO_MANY_ROWS'));
  var meta = p.meta || null;
  if (idx === 0 && meta && meta.dataset_epoch && meta.dataset_epoch !== sysProps_().dataset_epoch) errs.push(fieldError_('meta', 'TEMPLATE_OLD_EPOCH'));
  if (idx === 0 && meta && meta.template_key && meta.template_key !== IMPORT_TEMPLATE_KEY_) errs.push(fieldError_('meta', 'TEMPLATE_UNKNOWN'));
  if (errs.length) throw validationError_(errs);
  var cl = idx === 0 ? normClauses_(p.clauses) : { rows: [], errors: [] };
  if (cl.errors.length) throw validationError_(cl.errors.slice(0, 20));

  var look = deptLookup_(readRows_('Depts'));
  var items = {};
  readRows_('Items').forEach(function (r) { items[r.code] = r; });
  var groups = {};
  readRows_('Groups').forEach(function (g) { groups[g.group_key] = g; });

  return executeWrite_(ctx, {
    entity_type: 'IMPORT_BATCH', entity_id: p.import_batch_id,
    build: function () {
      var nowIso = isoVN_(now_());
      var batch = findOne_('ImportBatches', 'import_batch_id', p.import_batch_id);
      if (idx === 0 && batch) throw validationError_([fieldError_('import_batch_id', 'ID_EXISTS')]);
      if (idx > 0) {
        if (!batch || batch.imported_by !== ctx.user.user_id) throw apiError_('NOT_FOUND');
        if (batch.status !== 'STAGING') throw validationError_([fieldError_('import_batch_id', 'BATCH_STATE')]);
      }
      // Trùng mã trong tệp: mọi dòng mang mã đó đều lỗi (kể cả dòng đã gửi ở lượt trước) — không để một dòng đè dòng kia
      var prev = idx > 0 ? readRowsByNums_('ImportRows', findRowNums_('ImportRows', 'import_batch_id', p.import_batch_id)) : [];
      var prevByCode = {};
      prev.forEach(function (r) { if (r.code) (prevByCode[r.code] = prevByCode[r.code] || []).push(r); });
      var norm = rows.map(function (raw) {
        var rn = Number(raw && raw.row_number) || 0;
        return { rn: rn, n: normCatalogRow_(raw && raw.cells, look, rn) };
      });
      var cnt = {};
      norm.forEach(function (x) { if (x.n.code) cnt[x.n.code] = (cnt[x.n.code] || 0) + 1; });
      var dupErr = function (rn) { return fieldError_('B', 'CODE_DUPLICATE_FILE', rn); };
      var prevUpd = [];
      var out = [], irows = [];
      norm.forEach(function (x) {
        var rn = x.rn, n = x.n;
        var e = n.errors.slice();
        if (n.code && (cnt[n.code] > 1 || prevByCode[n.code])) e.push(dupErr(rn));
        (prevByCode[n.code] || []).forEach(function (pr) {
          if (pr.validation_status === 'ERROR' && (jsonVal_(pr.errors_json) || []).some(function (z) { return z.code === 'CODE_DUPLICATE_FILE'; })) return;
          var u = clone_(pr); delete u.__row;
          u.validation_status = 'ERROR'; u.action = 'ERROR'; u.changes_json = ''; u.normalized_payload_json = '';
          u.errors_json = JSON.stringify((jsonVal_(pr.errors_json) || []).concat([dupErr(pr.row_number)]));
          pr.validation_status = 'ERROR'; pr.errors_json = u.errors_json;
          prevUpd.push({ sheet: 'ImportRows', mode: 'update', row: u, rowNum: pr.__row });
        });
        var cur = n.code ? items[n.code] : null;
        var action, changes = [];
        // Phạm vi áp dụng (2e): dòng của bộ phận ngoài phạm vi bỏ qua (không ghi, không báo lỗi)
        var skip = !!(n.fields && n.fields.dept_code && !inScopeDept_(n.fields.dept_code));
        if (skip) { action = 'SKIP'; e = []; }
        else if (e.length) action = 'ERROR';
        else if (!cur) action = 'ADD';
        else {
          changes = itemChanges_(cur, n.fields);
          var g0 = n.group && groups[n.group.group_key];
          if (n.group && n.group.label && (!g0 || cmpVal_(g0.label) !== n.group.label)) changes.push('group_label');
          action = changes.length ? 'UPDATE' : 'SAME';
        }
        if (action === 'ADD' && n.group && !groups[n.group.group_key]) changes.push('group_label');
        if (skip) changes = [];
        var ir = {
          import_row_id: uuid_(), import_batch_id: p.import_batch_id, row_number: rn, code: n.code, entity_id: cur ? cur.item_id : '',
          action: action, expected_version: cur ? (cur.record_version || 0) : 0, validation_status: e.length ? 'ERROR' : 'OK',
          errors_json: e.length ? JSON.stringify(e.slice(0, 10)) : '', changes_json: changes.length ? JSON.stringify(changes) : '',
          committed_at: '', normalized_payload_json: e.length || skip ? '' : JSON.stringify({ fields: n.fields, group: n.group })
        };
        irows.push(ir);
        out.push({ row_number: rn, code: n.code, action: action, errors: e, changes: changes });
      });
      var writes = irows.map(function (r) { return { sheet: 'ImportRows', mode: 'insert', row: r }; }).concat(prevUpd);
      var b;
      if (idx === 0) {
        var cd = cl.rows.length ? clauseDiff_(cl.rows) : { add: [], update: [], deactivate: [] };
        b = {
          import_batch_id: p.import_batch_id, kind: 'CATALOG', file_name: trimStr_(p.file_name).slice(0, 200), source_sha256: trimStr_(p.source_sha256).slice(0, 80),
          template_key: meta ? trimStr_(meta.template_key) : '', template_version: meta ? trimStr_(meta.version) : '', file_epoch: meta ? trimStr_(meta.dataset_epoch) : '',
          imported_by: ctx.user.user_id, imported_at: nowIso, total_rows: 0, add_count: 0, update_count: 0, same_count: 0, error_count: 0,
          clause_count: cd.add.length + cd.update.length + cd.deactivate.length, status: 'STAGING', committed_by: '', commit_started_at: '', completed_at: '',
          committed_rows: 0, dataset_epoch: sysProps_().dataset_epoch, record_version: 1, updated_at: nowIso,
          clauses_json: cl.rows.length ? JSON.stringify(cl.rows) : ''
        };
      } else {
        b = clone_(batch); delete b.__row;
        b.record_version = (b.record_version || 1) + 1; b.updated_at = nowIso;
      }
      var allRows = prev.map(function (r) { return { row_number: r.row_number, code: r.code, action: r.validation_status === 'ERROR' ? 'ERROR' : r.action, errors: jsonVal_(r.errors_json) || [], changes: jsonVal_(r.changes_json) || [] }; }).concat(out);
      b.total_rows = allRows.length;
      b.add_count = allRows.filter(function (r) { return r.action === 'ADD'; }).length;
      b.update_count = allRows.filter(function (r) { return r.action === 'UPDATE'; }).length;
      b.same_count = allRows.filter(function (r) { return r.action === 'SAME'; }).length;
      b.error_count = allRows.filter(function (r) { return r.action === 'ERROR'; }).length;
      var last = idx === partCnt - 1;
      if (last) b.status = 'PREVIEWED';
      writes.push({ sheet: 'ImportBatches', mode: idx === 0 ? 'insert' : 'update', row: b });
      var proj = batchProject_(b, userDirectory_());
      return {
        writes: writes, noReplay: true,
        // Lượt cuối trả mọi dòng của lô (dòng của lượt trước có thể đổi thành lỗi do trùng mã)
        result: { batch: proj, rows: out, all_rows: last ? allRows : undefined, last: last, clause_changes: idx === 0 ? b.clause_count : undefined, record_version: b.record_version },
        record_version: b.record_version,
        audit: last ? { entity_type: 'IMPORT_BATCH', entity_id: p.import_batch_id, before_json: null, after_json: { file_name: b.file_name, total: b.total_rows, add: b.add_count, update: b.update_count, same: b.same_count, error: b.error_count, skip: proj.skip_count, clauses: b.clause_count, scope: scopeDepts_().join(',') } } : null
      };
    }
  });
}

/* ---------------- Xem lô ---------------- */

/** import.list: các lô gần nhất (người ghi thứ hai tìm lô chờ ghi ở đây) */
function importList_(ctx) {
  var dir = userDirectory_();
  var rows = readRows_('ImportBatches').sort(function (a, b) { return String(b.imported_at).localeCompare(String(a.imported_at)); });
  var items = rows.slice(0, 20).map(function (b) {
    var o = batchProject_(b, dir);
    o.mine = b.imported_by === ctx.user.user_id;
    o.can_commit = (b.status === 'PREVIEWED' || b.status === 'COMMITTING') && (Number(ctx.user.role_level) === 4 || b.imported_by !== ctx.user.user_id);
    return o;
  });
  return { items: items };
}

/** import.rows {import_batch_id}: các dòng của lô (lỗi, thay đổi) */
function importRows_(ctx) {
  var id = (ctx.req.payload || {}).import_batch_id;
  if (!isUuidV4_(id)) throw validationError_([fieldError_('import_batch_id', 'ID_INVALID')]);
  var b = findOne_('ImportBatches', 'import_batch_id', id);
  if (!b) throw apiError_('NOT_FOUND');
  var nums = findRowNums_('ImportRows', 'import_batch_id', id);
  var rows = readRowsByNums_('ImportRows', nums).sort(function (x, y) { return x.row_number - y.row_number; }).map(function (r) {
    return { row_number: r.row_number, code: r.code, action: r.action, validation_status: r.validation_status, errors: jsonVal_(r.errors_json) || [], changes: jsonVal_(r.changes_json) || [], committed_at: r.committed_at };
  });
  var o = batchProject_(b, userDirectory_());
  o.can_commit = (b.status === 'PREVIEWED' || b.status === 'COMMITTING') && (Number(ctx.user.role_level) === 4 || b.imported_by !== ctx.user.user_id);
  return { batch: o, rows: rows, clauses: jsonVal_(b.clauses_json) ? clauseDiffSummary_(jsonVal_(b.clauses_json)) : null };
}

function clauseDiffSummary_(rows) {
  var d = clauseDiff_(rows);
  return { add: d.add.length, update: d.update.length, deactivate: d.deactivate.length };
}

/* ---------------- import.commit ---------------- */

/**
 * import.commit {import_batch_id} (PIN): ghi tối đa 100 dòng còn lại của lô (thêm/sửa); điều khoản ghi ở lượt đầu.
 * Biểu đã bị sửa sau khi xem trước (record_version khác) → dòng đó báo ROW_CHANGED, không ghi. Trả {batch, committed, remaining, row_errors}.
 */
function importCommit_(ctx) {
  var id = (ctx.req.payload || {}).import_batch_id;
  if (!isUuidV4_(id)) throw validationError_([fieldError_('import_batch_id', 'ID_INVALID')]);
  var b0 = findOne_('ImportBatches', 'import_batch_id', id);
  if (!b0) throw apiError_('NOT_FOUND');
  if (b0.status !== 'PREVIEWED' && b0.status !== 'COMMITTING') throw validationError_([fieldError_('import_batch_id', 'BATCH_STATE')]);
  if (Number(ctx.user.role_level) !== 4 && b0.imported_by === ctx.user.user_id) throw validationError_([fieldError_('import_batch_id', 'IMPORT_SAME_USER')]);
  var t0 = Date.now();
  var res = executeWrite_(ctx, {
    entity_type: 'IMPORT_BATCH', entity_id: id,
    build: function () {
      var nowIso = isoVN_(now_());
      var b = readRowAt_('ImportBatches', b0.__row);
      if (b.status !== 'PREVIEWED' && b.status !== 'COMMITTING') throw validationError_([fieldError_('import_batch_id', 'BATCH_STATE')]);
      var irows = readRowsByNums_('ImportRows', findRowNums_('ImportRows', 'import_batch_id', id)).sort(function (x, y) { return x.row_number - y.row_number; });
      var pending = irows.filter(function (r) { return r.validation_status === 'OK' && (r.action === 'ADD' || r.action === 'UPDATE') && !r.committed_at; });
      var take = pending.slice(0, IMPORT_COMMIT_MAX_);
      var items = {};
      readRows_('Items').forEach(function (r) { items[r.code] = r; });
      var groups = {};
      readRows_('Groups').forEach(function (g) { groups[g.group_key] = g; });
      var writes = [], rowErr = [], committed = 0;
      var groupTouched = {};
      take.forEach(function (ir) {
        if (Date.now() - t0 > IMPORT_COMMIT_BUDGET_MS_) return;
        var np = jsonVal_(ir.normalized_payload_json);
        var cur = items[ir.code] || null;
        var bad = null;
        if (ir.action === 'ADD' && cur) bad = 'CODE_DUPLICATE';
        if (ir.action === 'UPDATE' && (!cur || Number(cur.record_version || 0) !== Number(ir.expected_version))) bad = 'ROW_CHANGED';
        var upd = clone_(ir); delete upd.__row;
        if (bad) {
          upd.validation_status = 'ERROR';
          upd.errors_json = JSON.stringify([fieldError_('B', bad, ir.row_number)]);
          rowErr.push({ row_number: ir.row_number, code: ir.code, error: bad });
          writes.push({ sheet: 'ImportRows', mode: 'update', row: upd, rowNum: ir.__row });
          return;
        }
        var row = itemRowFromImport_(ctx, cur, ir.code, np.fields, nowIso);
        writes.push({ sheet: 'Items', mode: cur ? 'update' : 'insert', row: row, rowNum: cur ? cur.__row : undefined });
        items[ir.code] = row;
        var g = np.group;
        if (g && g.group_key && !groupTouched[g.group_key]) {
          var og = groups[g.group_key];
          if (!og) {
            var ng = cNew_(ctx, { group_key: g.group_key, dept_code: g.dept_code, name_vi: g.name_vi, name_zh: g.name_zh, label: g.label, sort_order: Object.keys(groups).length + 1, active: true,
              i18n_meta: g.name_vi && g.name_zh ? { name: { src: 'vi', state: 'HUMAN', at: nowIso } } : (g.name_vi || g.name_zh ? { name: { src: g.name_vi ? 'vi' : 'zh', state: 'PENDING', at: nowIso } } : {}) });
            writes.push({ sheet: 'Groups', mode: 'insert', row: ng });
            groups[g.group_key] = ng;
            groupTouched[g.group_key] = true;
          } else if (g.label && cmpVal_(og.label) !== g.label) {
            var ug = clone_(og); delete ug.__row;
            ug.label = g.label; ug.name_vi = g.name_vi; ug.name_zh = g.name_zh;
            cUpdate_(ctx, ug);
            writes.push({ sheet: 'Groups', mode: 'update', row: ug, rowNum: og.__row });
            groupTouched[g.group_key] = true;
          }
        }
        upd.committed_at = nowIso;
        upd.entity_id = row.item_id;
        writes.push({ sheet: 'ImportRows', mode: 'update', row: upd, rowNum: ir.__row });
        committed++;
      });
      // Điều khoản: ở lượt ghi đầu
      var clausesDone = 0;
      if (b.status === 'PREVIEWED' && jsonVal_(b.clauses_json)) {
        var cd = clauseDiff_(jsonVal_(b.clauses_json));
        var cur2 = {};
        readRows_('Clauses').forEach(function (r) { cur2[r.clause_id] = r; });
        var meta = function (r, o) {
          var m = o && jsonVal_(o.i18n_meta) && typeof jsonVal_(o.i18n_meta) === 'object' ? clone_(jsonVal_(o.i18n_meta)) : {};
          (r.keep_group ? ['name'] : ['name', 'group']).forEach(function (f) {
            if (r[f + '_vi'] && r[f + '_zh']) m[f] = { src: 'vi', state: 'HUMAN', at: nowIso };
            else if (r[f + '_vi'] || r[f + '_zh']) m[f] = { src: r[f + '_vi'] ? 'vi' : 'zh', state: 'PENDING', at: nowIso };
          });
          return m;
        };
        cd.add.forEach(function (r) { var x = cNew_(ctx, clone_(r)); delete x.keep_group; x.i18n_meta = meta(r); writes.push({ sheet: 'Clauses', mode: 'insert', row: x }); clausesDone++; });
        cd.update.forEach(function (r) {
          var o = cur2[r.clause_id]; var x = clone_(o); delete x.__row;
          clauseFields_(r).forEach(function (k) { x[k] = r[k]; });
          x.i18n_meta = meta(r, o); cUpdate_(ctx, x);
          writes.push({ sheet: 'Clauses', mode: 'update', row: x, rowNum: o.__row }); clausesDone++;
        });
        cd.deactivate.forEach(function (cid) {
          var o = cur2[cid]; var x = clone_(o); delete x.__row;
          x.active = false; cUpdate_(ctx, x);
          writes.push({ sheet: 'Clauses', mode: 'update', row: x, rowNum: o.__row }); clausesDone++;
        });
      }
      var nb = clone_(b); delete nb.__row;
      var remaining = pending.length - committed - rowErr.length;
      nb.committed_rows = (nb.committed_rows || 0) + committed;
      nb.error_count = (nb.error_count || 0) + rowErr.length;
      if (!nb.committed_by) { nb.committed_by = ctx.user.user_id; nb.commit_started_at = nowIso; }
      nb.status = remaining > 0 ? 'COMMITTING' : 'COMPLETED';
      if (nb.status === 'COMPLETED') nb.completed_at = nowIso;
      nb.record_version = (nb.record_version || 1) + 1; nb.updated_at = nowIso;
      writes.push({ sheet: 'ImportBatches', mode: 'update', row: nb, rowNum: b.__row });
      var su = { last_import_at: ['DATETIME', nowIso] };
      return {
        writes: writes, state: su, noReplay: true,
        result: { batch: batchProject_(nb, userDirectory_()), committed: committed, clauses: clausesDone, remaining: remaining, row_errors: rowErr, record_version: nb.record_version },
        record_version: nb.record_version,
        audit: { entity_type: 'IMPORT_BATCH', entity_id: id, before_json: { status: b.status }, after_json: { status: nb.status, committed: committed, clauses: clausesDone, errors: rowErr.length } }
      };
    }
  });
  // Ngày bắt đầu tính hồ sơ của biểu ● nhập từ Excel: ngày nhập danh mục đầu tiên (đặt một lần, sửa được ở Cài đặt)
  if (res.code === 'OK' && res.data && res.data.committed && !setting_('records_start_date')) {
    withWriteLock_(function () { writeSetting_('records_start_date', todayVN_(), ctx.user.user_id); });
  }
  return res;
}

/** import.cancel {import_batch_id}: bỏ lô chưa ghi xong (người nhập, Thư ký ISO, cấp 4) */
function importCancel_(ctx) {
  var id = (ctx.req.payload || {}).import_batch_id;
  if (!isUuidV4_(id)) throw validationError_([fieldError_('import_batch_id', 'ID_INVALID')]);
  return executeWrite_(ctx, {
    entity_type: 'IMPORT_BATCH', entity_id: id,
    build: function () {
      var b = findOne_('ImportBatches', 'import_batch_id', id);
      if (!b) throw apiError_('NOT_FOUND');
      if (b.status === 'COMPLETED' || b.status === 'CANCELLED') throw validationError_([fieldError_('import_batch_id', 'BATCH_STATE')]);
      var nb = clone_(b); delete nb.__row;
      nb.status = 'CANCELLED'; nb.completed_at = isoVN_(now_());
      nb.record_version = (nb.record_version || 1) + 1; nb.updated_at = nb.completed_at;
      return {
        writes: [{ sheet: 'ImportBatches', mode: 'update', row: nb, rowNum: b.__row }], noReplay: true,
        result: { batch: batchProject_(nb, userDirectory_()), record_version: nb.record_version }, record_version: nb.record_version,
        audit: { entity_type: 'IMPORT_BATCH', entity_id: id, before_json: { status: b.status }, after_json: { status: 'CANCELLED' } }
      };
    }
  });
}
