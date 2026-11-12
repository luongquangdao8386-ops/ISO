/* 31_tpl: Kho tệp mẫu (2e, người dùng yêu cầu 12/11/2026 "chỉ phạm vi cơ điện + Kho tệp mẫu").
 * Một dòng TplFiles = một tệp mẫu trống để in / điền: bộ biểu Excel nhiều sheet (vd BM-CD-04_Sua-chua….xlsx — mỗi sheet một mã biểu,
 * sheet phụ a/b, -TD, -TH, -ML thuộc biểu cha), hoặc tệp Word / PDF. App đọc tên sheet + khổ giấy bằng SheetJS rồi gửi kèm tệp
 * (tpl.upload); app tự ghép sheet ↔ biểu trong danh mục theo mã (như ghép mã của Evidence — normFormCode_, evMatchItem_), nên danh
 * mục đổi sau khi tải lên vẫn ghép đúng. Tệp cùng bộ (BM-CĐ-04) tải lên lần nữa thì tệp cũ thành REPLACED (giữ để tra); bỏ tệp tải
 * nhầm (tpl.delete, PIN) thì tệp nó đã thay quay lại dùng. Tệp nằm trên Drive riêng tư của máy chủ, tải về qua doc.get. */

/** Dạng bộ biểu từ tên sheet / tên tệp: BM-<bộ phận>-<nhóm> (BM-CD-04_… → BM-CĐ-04 theo danh sách bộ phận) */
function tplSetCodeOf_(s, deptByNorm) {
  var t = String(s || '');
  try { t = t.normalize('NFC'); } catch (e) { /* bỏ qua */ }
  var m = /BM[-_ ]([A-Za-zĐđ]{1,6})[-_ ](\d{2})/.exec(t);
  if (!m) return null;
  var dept = deptByNorm[normFormCode_(m[1])];
  if (!dept) return null;
  return { set_code: 'BM-' + dept + '-' + m[2], dept_code: dept, group_key: dept + '-' + m[2] };
}

function tplDeptIndex_() {
  var idx = {};
  readRows_('Depts').forEach(function (d) { idx[normFormCode_(d.dept_code)] = d.dept_code; });
  return idx;
}

/** Bộ biểu của tệp: bộ có nhiều sheet nhất; không có sheet mang mã thì lấy từ tên tệp */
function tplSetOf_(sheets, fileName, deptIdx) {
  var cnt = {}, best = null;
  sheets.forEach(function (s) {
    var x = tplSetCodeOf_(s.n, deptIdx);
    if (!x) return;
    cnt[x.set_code] = cnt[x.set_code] || { x: x, n: 0 };
    cnt[x.set_code].n++;
    if (!best || cnt[x.set_code].n > best.n) best = cnt[x.set_code];
  });
  return best ? best.x : tplSetCodeOf_(fileName, deptIdx);
}

/** Danh sách sheet app gửi: [{n: tên, p: A4|A3|A5|LETTER|OTHER|'', o: P|L|'', h: ẩn}] → chuẩn hóa; sai ném TPL_SHEETS */
var TPL_PAPERS_ = { '': 1, A3: 1, A4: 1, A5: 1, LETTER: 1, OTHER: 1 };
function tplSheetsInput_(list) {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list) || list.length > TPL_MAX_SHEETS_) throw validationError_([fieldError_('sheets', 'TPL_SHEETS')]);
  var seen = {};
  return list.map(function (s) {
    var n = s && typeof s.n === 'string' ? s.n.trim() : '';
    var p = s && s.p ? String(s.p).toUpperCase() : '';
    var o = s && s.o ? String(s.o).toUpperCase() : '';
    if (!n || n.length > 100 || seen[n] || !TPL_PAPERS_[p] || (o && o !== 'P' && o !== 'L')) throw validationError_([fieldError_('sheets', 'TPL_SHEETS')]);
    seen[n] = 1;
    var out = { n: n, p: p, o: o };
    if (s.h === true) out.h = true;
    return out;
  });
}

/** Xem được tệp mẫu: đang dùng — mọi người (bộ thuộc phạm vi áp dụng, hoặc không rõ bộ); đã thay — cấp 3+, Thư ký ISO; đã bỏ — không ai */
function tplVisible_(u, t) {
  if (!t || t.archived_at || t.state === 'DELETED') return false;
  var mgr = isSecretary_(u) || Number(u.role_level) >= 3;
  if (t.dept_code && !inScopeDept_(t.dept_code) && !isSecretary_(u)) return false;
  return t.state === 'ACTIVE' || mgr;
}

/** Dán Code.gs 2e mà chưa chạy migrateSchema: lần tải lên đầu tiên tự thêm sheet TplFiles */
function ensureTplSchema_() {
  if (sheetExists_('TplFiles')) return;
  autoMigrate_();
  dbReset_();
  if (!sheetExists_('TplFiles')) throw apiError_('SYSTEM_NOT_READY');
}

function tplResult_(ctx, row, extra) {
  var out = { entity_type: 'TPL', entity_id: row.tpl_id, record_version: row.record_version, record: projectRow_(ctx, row) };
  if (extra) Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
  return out;
}

/* ---------------- tpl.upload ---------------- */

/**
 * tpl.upload {tpl_id, document_id, file_name, mime_type, content_b64, sheets: [{n, p, o, h}], title_vi?, title_zh?, note?}
 * (Thư ký ISO / cấp 4, cần mạng). Tên bộ mặc định = tên nhóm của bộ (Groups <bộ phận>-<nhóm>), không có thì tên tệp.
 * Tệp đang dùng cùng bộ (hoặc cùng tên tệp khi không rõ bộ) → REPLACED. Trả {record, replaced: [tpl_id]}.
 */
function tplUpload_(ctx) {
  ensureTplSchema_();
  var p = ctx.req.payload || {};
  var errs = [];
  if (!isUuidV4_(p.tpl_id)) errs.push(fieldError_('tpl_id', 'ID_INVALID'));
  if (!isUuidV4_(p.document_id)) errs.push(fieldError_('document_id', 'ID_INVALID'));
  if (!TPL_MIMES_[p.mime_type]) errs.push(fieldError_('mime_type', 'FILE_TYPE'));
  if (typeof p.content_b64 !== 'string' || !p.content_b64) errs.push(fieldError_('content_b64', 'REQUIRED'));
  var fileName = cleanFileName_(p.file_name);
  if (!fileName) errs.push(fieldError_('file_name', 'REQUIRED'));
  var note = trimStr_(p.note || '');
  if (note.length > 300) errs.push(fieldError_('note', 'TOO_LONG'));
  ['title_vi', 'title_zh'].forEach(function (k) { if (p[k] !== undefined && trimStr_(p[k]).length > 200) errs.push(fieldError_('title', 'TOO_LONG')); });
  if (Number(ctx.req.expected_version || 0) !== 0) errs.push(fieldError_('expected_version', 'INVALID_VALUE'));
  if (errs.length) throw validationError_(errs);
  var sheets = tplSheetsInput_(TPL_MIMES_[p.mime_type] === 'xlsx' || TPL_MIMES_[p.mime_type] === 'xls' ? p.sheets : null);

  var ex = findOne_('Operations', 'operation_id', ctx.req.operation_id);
  if (ex) return withWriteLock_(function () { return existingOpResponse_(ctx, ex, payloadHash_(ctx)); });
  assertNewId_('TplFiles', 'tpl_id', p.tpl_id);
  assertNewId_('Documents', 'document_id', p.document_id);

  var bytes;
  try { bytes = b64d_(p.content_b64); } catch (e) { throw validationError_([fieldError_('content_b64', 'INVALID_VALUE')]); }
  if (!bytes.length) throw validationError_([fieldError_('content_b64', 'REQUIRED')]);
  if (bytes.length > Number(setting_('doc_max_bytes'))) throw validationError_([fieldError_('content_b64', 'FILE_TOO_LARGE')]);
  if (!magicOk_(bytes, p.mime_type)) throw validationError_([fieldError_('mime_type', 'FILE_TYPE')]);

  var deptIdx = tplDeptIndex_();
  var set = tplSetOf_(sheets, fileName, deptIdx);
  if (set && !inScopeDept_(set.dept_code)) throw validationError_([fieldError_('file_name', 'APP_SCOPE')]);
  var grp = set ? findOne_('Groups', 'group_key', set.group_key) : null;
  var base = fileName.replace(/\.[^.]+$/, '');
  var titleVi = trimStr_(p.title_vi || '') || (grp && grp.name_vi) || (grp ? '' : base);
  var titleZh = trimStr_(p.title_zh || '') || (grp && grp.name_zh) || '';
  var ext = TPL_MIMES_[p.mime_type];
  var driveName = 'TM_' + String(set ? set.set_code : base).replace(/[\/\\\s]/g, '-').slice(0, 60) + '_' + p.tpl_id.slice(0, 8) + '.' + ext;
  var folder = appFolder_();
  var file = folder.createFile(Utilities.newBlob(bytes, p.mime_type, driveName));
  var sha = b64url_(sha256_(bytes));
  var res;
  try {
    res = executeWrite_(ctx, {
      entity_type: 'TPL', entity_id: p.tpl_id,
      build: function () {
        assertNewId_('TplFiles', 'tpl_id', p.tpl_id);
        assertNewId_('Documents', 'document_id', p.document_id);
        var nowIso = isoVN_(now_());
        var row = cNew_(ctx, {
          tpl_id: p.tpl_id, set_code: set ? set.set_code : '', dept_code: set ? set.dept_code : '', title_vi: titleVi, title_zh: titleZh,
          file_name: fileName, mime_type: p.mime_type, size_bytes: bytes.length, sha256: sha, document_id: p.document_id,
          sheets_json: sheets, sheet_count: sheets.length, state: 'ACTIVE', replaced_by_id: '', replaced_at: '',
          uploaded_at: nowIso, uploaded_by: ctx.user.user_id, note: note, deleted_at: '', deleted_by: '', delete_reason: ''
        });
        var doc = cNew_(ctx, {
          document_id: p.document_id, entity_type: 'TPL', entity_id: p.tpl_id, kind: 'TEMPLATE', drive_file_id: file.getId(),
          mime_type: p.mime_type, file_name: fileName, access_scope: 'PRIVATE', active: true, managed_folder_id: folder.getId(),
          owned_by_app: true, size_bytes: bytes.length, thumb_drive_file_id: '', sha256: sha, page_no: null
        });
        var writes = [{ sheet: 'Documents', mode: 'insert', row: doc }, { sheet: 'TplFiles', mode: 'insert', row: row }];
        var replaced = [];
        var sameKey = function (t) {
          if (t.state !== 'ACTIVE' || t.archived_at) return false;
          return row.set_code ? t.set_code === row.set_code : (!t.set_code && String(t.file_name).toLowerCase() === fileName.toLowerCase());
        };
        readRows_('TplFiles').filter(sameKey).forEach(function (t) {
          var o = clone_(t); delete o.__row;
          o.state = 'REPLACED'; o.replaced_by_id = row.tpl_id; o.replaced_at = nowIso;
          cUpdate_(ctx, o);
          writes.push({ sheet: 'TplFiles', mode: 'update', row: o, rowNum: t.__row });
          replaced.push(o.tpl_id);
        });
        return {
          writes: writes, result: tplResult_(ctx, row, { replaced: replaced }), record_version: row.record_version,
          audit: { entity_type: 'TPL', entity_id: row.tpl_id, before_json: replaced.length ? { replaced: replaced } : null,
            after_json: { set_code: row.set_code, file_name: fileName, size_bytes: bytes.length, sheets: sheets.length } }
        };
      }
    });
  } catch (e) {
    trashQuietly_(file);
    throw e;
  }
  if (res.code === 'DUPLICATE_OPERATION') trashQuietly_(file);
  return res;
}

/* ---------------- tpl.edit, tpl.delete ---------------- */

function tplLoad_(ctx, id) {
  ensureTplSchema_();
  if (!isUuidV4_(id)) throw validationError_([fieldError_('tpl_id', 'ID_INVALID')]);
  var t = findOne_('TplFiles', 'tpl_id', id);
  if (!t || !tplVisible_(ctx.user, t)) throw apiError_('NOT_FOUND');
  return t;
}

/** tpl.edit {tpl_id, title_vi, title_zh, note} — sửa tên bộ / ghi chú của tệp đang dùng (expected_version bắt buộc) */
function tplEdit_(ctx) {
  var p = ctx.req.payload || {};
  var t0 = tplLoad_(ctx, p.tpl_id);
  if (t0.state !== 'ACTIVE') throw validationError_([fieldError_('tpl_id', 'TPL_STATE')]);
  var upd = {}, errs = [];
  ['title_vi', 'title_zh', 'note'].forEach(function (k) {
    if (p[k] === undefined) return;
    upd[k] = trimStr_(p[k]);
    if (upd[k].length > (k === 'note' ? 300 : 200)) errs.push(fieldError_(k === 'note' ? 'note' : 'title', 'TOO_LONG'));
  });
  if (upd.title_vi !== undefined && upd.title_zh !== undefined && !upd.title_vi && !upd.title_zh) errs.push(fieldError_('title', 'REQUIRED_ONE_LANGUAGE'));
  if (errs.length) throw validationError_(errs);
  return executeWrite_(ctx, {
    entity_type: 'TPL', entity_id: p.tpl_id,
    build: function () {
      var cur = findOne_('TplFiles', 'tpl_id', p.tpl_id);
      if (!cur) throw apiError_('NOT_FOUND');
      assertVersion_(ctx, cur, 'TPL', 'TplFiles');
      if (cur.state !== 'ACTIVE') throw validationError_([fieldError_('tpl_id', 'TPL_STATE')]);
      var row = clone_(cur); delete row.__row;
      var before = { title_vi: row.title_vi, title_zh: row.title_zh, note: row.note };
      Object.keys(upd).forEach(function (k) { row[k] = upd[k]; });
      cUpdate_(ctx, row);
      return {
        writes: [{ sheet: 'TplFiles', mode: 'update', row: row }], result: tplResult_(ctx, row), record_version: row.record_version,
        audit: { entity_type: 'TPL', entity_id: row.tpl_id, before_json: before, after_json: upd }
      };
    }
  });
}

function precheckTplDelete_(ctx) {
  if (!isSecretary_(ctx.user)) throw apiError_('FORBIDDEN');
  var t = tplLoad_(ctx, (ctx.req.payload || {}).tpl_id);
  if (t.state !== 'ACTIVE') throw validationError_([fieldError_('tpl_id', 'TPL_STATE')]);
}

/**
 * tpl.delete {tpl_id, reason} (PIN): bỏ tệp đang dùng (tải nhầm, không dùng nữa) → DELETED, tệp trên Drive vào thùng rác.
 * Tệp nó đã thay (REPLACED, replaced_by_id = tệp này, mới nhất) quay lại ACTIVE.
 */
function tplDelete_(ctx) {
  var p = ctx.req.payload || {};
  var reason = reasonText_(p, 'reason', true, 300);
  var driveId = '';
  var res = executeWrite_(ctx, {
    entity_type: 'TPL', entity_id: p.tpl_id,
    build: function () {
      var cur = findOne_('TplFiles', 'tpl_id', p.tpl_id);
      if (!cur) throw apiError_('NOT_FOUND');
      assertVersion_(ctx, cur, 'TPL', 'TplFiles');
      if (cur.state !== 'ACTIVE') throw validationError_([fieldError_('tpl_id', 'TPL_STATE')]);
      var nowIso = isoVN_(now_());
      var row = clone_(cur); delete row.__row;
      row.state = 'DELETED'; row.deleted_at = nowIso; row.deleted_by = ctx.user.user_id; row.delete_reason = reason;
      cUpdate_(ctx, row);
      var writes = [{ sheet: 'TplFiles', mode: 'update', row: row }];
      var d = row.document_id ? findOne_('Documents', 'document_id', row.document_id) : null;
      if (d && d.active) {
        var dr = clone_(d); delete dr.__row;
        dr.active = false;
        cUpdate_(ctx, dr);
        writes.push({ sheet: 'Documents', mode: 'update', row: dr });
        driveId = d.drive_file_id;
      }
      var prev = readRows_('TplFiles').filter(function (t) { return t.state === 'REPLACED' && t.replaced_by_id === row.tpl_id && !t.archived_at; })
        .sort(function (a, b) { return String(b.uploaded_at).localeCompare(String(a.uploaded_at)); })[0];
      var restored = '';
      if (prev) {
        var pr = clone_(prev); delete pr.__row;
        pr.state = 'ACTIVE'; pr.replaced_by_id = ''; pr.replaced_at = '';
        cUpdate_(ctx, pr);
        writes.push({ sheet: 'TplFiles', mode: 'update', row: pr, rowNum: prev.__row });
        restored = pr.tpl_id;
      }
      return {
        writes: writes, result: tplResult_(ctx, row, { restored: restored }), record_version: row.record_version,
        audit: { entity_type: 'TPL', entity_id: row.tpl_id, before_json: { state: 'ACTIVE' }, after_json: { state: 'DELETED', restored: restored }, reason: reason }
      };
    }
  });
  if (driveId && res.code !== 'DUPLICATE_OPERATION') { try { trashQuietly_(DriveApp.getFileById(String(driveId))); } catch (e) { /* bỏ qua */ } }
  return res;
}

/* ---------------- Trạng thái hệ thống ---------------- */

/** Dòng templates của healthCheck: số tệp đang dùng, số sheet, biểu trong phạm vi có tệp mẫu (ghép mã như app) */
function tplHealth_(items) {
  if (!sheetExists_('TplFiles')) return { ok: false, value: 'Thiếu sheet TplFiles', note: 'Chạy migrateSchema' };
  var act = readRows_('TplFiles').filter(function (t) { return t.state === 'ACTIVE' && !t.archived_at && (!t.dept_code || inScopeDept_(t.dept_code)); });
  var idx = evItemIndex_(items);
  var have = {}, sheets = 0;
  act.forEach(function (t) {
    (Array.isArray(t.sheets_json) ? t.sheets_json : []).forEach(function (s) {
      sheets++;
      var it = evMatchItem_(idx, s.n);
      if (it) have[it.item_id] = true;
    });
  });
  var forms = items.filter(function (it) { return it.status !== 'NA'; });
  var n = forms.filter(function (it) { return have[it.item_id]; }).length;
  return {
    ok: true,
    value: act.length + ' tệp · ' + sheets + ' sheet · ' + n + '/' + forms.length + ' biểu trong phạm vi có tệp mẫu',
    note: act.length ? '' : 'Chưa có tệp mẫu — Kho tệp mẫu → Tải tệp mẫu lên'
  };
}
