/**
 * SaoLuuPhu — bản sao ở tài khoản Google thứ hai cho cả ba app: ISO, M&E, Checksheet (THỬ và THẬT).
 *
 * Dán tệp này vào MỘT dự án Apps Script tạo trong TÀI KHOẢN THỨ HAI (không phải tài khoản đang chạy ba app).
 * Script tìm các thư mục mà tài khoản chính đã chia sẻ cho tài khoản này:
 *   <APP>_Backups / <APP>_Backups_THU  — bản sao lưu hằng tuần (2 bảng tính + manifest.json mỗi lần)
 *   <APP>_Data / <APP>_Data_THU        — tệp dữ liệu (PDF, ảnh, logo) — chỉ chép nếu thư mục được chia sẻ
 * với APP = ISO, ME, CS; rồi chép về Drive của tài khoản này, thư mục "SaoLuu_Phu". Bản chép thuộc tài khoản này nên vẫn còn
 * khi tài khoản chính bị khóa. Chỉ chép bản sao lưu đã kiểm chứng (manifest status VERIFIED); giữ KEEP_COUNT bản mới nhất mỗi
 * thư mục; tệp dữ liệu chép thêm dần (không xóa ở bản chép khi bên gốc xóa). Mỗi lần chạy tối đa ~5 phút, lần sau chạy tiếp.
 *
 * Hàm chạy tay: caiDat (lần đầu: chạy thử + cài lịch hằng ngày) · chepNgay · kiemTra · danhSachNguon.
 * Không chứa email, ID hay khóa nào. Mã nguồn: repo ISO, apps-script/SaoLuuPhu.gs.
 */

var MIRROR_VERSION = '1.0.0';
var MIRROR_ROOT_NAME = 'SaoLuu_Phu';
var KEEP_COUNT = 12;                          // số bản sao lưu giữ lại cho mỗi thư mục nguồn
var RUN_BUDGET_MS = 5 * 60 * 1000;            // giới hạn 6 phút của Apps Script — chừa 1 phút
var SOURCE_RE = /^(ISO|ME|CS)_(Backups|Data)(_THU)?$/;
var STAMP_RE = /^\d{4}-\d{2}-\d{2}_\d{4}/;
var PARTIAL_SUFFIX = '_dang_chep';
var STALE_DAYS = 8;                            // bản mới nhất cũ hơn số ngày này → kiemTra báo CẢNH BÁO

function log_(m) { Logger.log(m); }

function me_() {
  try { return String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) { return ''; }
}

function iterToArray_(it) {
  var out = [];
  while (it.hasNext()) out.push(it.next());
  return out;
}

/** Thư mục gốc "SaoLuu_Phu" trong Drive của tài khoản này */
function mirrorRoot_() {
  var root = DriveApp.getRootFolder();
  var it = root.getFoldersByName(MIRROR_ROOT_NAME);
  return it.hasNext() ? it.next() : root.createFolder(MIRROR_ROOT_NAME);
}

function childFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/**
 * Thư mục nguồn: được chia sẻ cho tài khoản này, tên đúng mẫu, không thuộc tài khoản này.
 * Thêm tay (nếu tìm tự động không thấy): Thuộc tính tập lệnh SOURCE_FOLDER_IDS = các ID thư mục cách nhau bằng dấu phẩy.
 */
function findSources_() {
  var me = me_();
  var out = [], seen = {};
  var add = function (f) {
    var id = f.getId(), name = f.getName();
    if (seen[id] || !SOURCE_RE.test(name)) return;
    var owner = '';
    try { owner = String(f.getOwner().getEmail() || '').toLowerCase(); } catch (e) { owner = ''; }
    if (owner && me && owner === me) return; // thư mục của chính tài khoản này: không phải nguồn
    seen[id] = true;
    var m = SOURCE_RE.exec(name);
    out.push({ id: id, name: name, app: m[1], kind: m[2] === 'Backups' ? 'BACKUP' : 'DATA', env: m[3] ? 'THU' : 'THAT', folder: f });
  };
  ['sharedWithMe = true', "title contains '_Backups' or title contains '_Data'"].forEach(function (q) {
    try { iterToArray_(DriveApp.searchFolders(q)).forEach(add); } catch (e) { log_('Tìm thư mục (' + q + ') lỗi: ' + (e && e.message)); }
  });
  var extra = PropertiesService.getScriptProperties().getProperty('SOURCE_FOLDER_IDS') || '';
  extra.split(/[\s,;]+/).filter(String).forEach(function (id) {
    try { add(DriveApp.getFolderById(id)); } catch (e) { log_('Không mở được thư mục ' + id + ': ' + (e && e.message)); }
  });
  out.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
  return out;
}

function readManifest_(folder) {
  var it = folder.getFilesByName('manifest.json');
  if (!it.hasNext()) return null;
  try { return JSON.parse(it.next().getBlob().getDataAsString()); } catch (e) { return null; }
}

/** Chép các bản sao lưu VERIFIED còn thiếu; bỏ bản chép dở của lần trước; giữ KEEP_COUNT bản mới nhất */
function mirrorBackups_(src, destRoot, deadline, rep) {
  var dest = childFolder_(destRoot, src.name);
  var have = {};
  iterToArray_(dest.getFolders()).forEach(function (f) {
    var n = f.getName();
    if (n.slice(-PARTIAL_SUFFIX.length) === PARTIAL_SUFFIX) { f.setTrashed(true); return; } // lần trước hết giờ giữa chừng
    have[n] = f;
  });
  var list = iterToArray_(src.folder.getFolders()).filter(function (f) { return STAMP_RE.test(f.getName()); })
    .sort(function (a, b) { return a.getName() < b.getName() ? -1 : 1; });
  list.forEach(function (f) {
    var stamp = f.getName();
    if (have[stamp] || Date.now() > deadline) return;
    var man = readManifest_(f);
    if (!man || man.status !== 'VERIFIED') { rep.skipped++; return; }
    var part = dest.createFolder(stamp + PARTIAL_SUFFIX);
    var ids = {};
    iterToArray_(f.getFiles()).forEach(function (file) {
      if (Date.now() > deadline) return;
      var c = file.makeCopy(file.getName(), part);
      ids[file.getId()] = c.getId();
    });
    if (Date.now() > deadline) return; // chưa đủ tệp: lần sau xóa và chép lại
    part.createFile(Utilities.newBlob(JSON.stringify({ source_folder: src.name, stamp: stamp, copied_at: new Date().toISOString(), status: man.status,
      app_id: man.app_id, env: man.env, dataset_epoch: man.dataset_epoch, files: ids, mirror_version: MIRROR_VERSION }, null, 1), 'application/json', 'mirror.json'));
    part.setName(stamp);
    have[stamp] = part;
    rep.copied++;
  });
  // Giữ KEEP_COUNT bản mới nhất (chỉ trong thư mục của tài khoản này)
  var names = Object.keys(have).filter(function (n) { return STAMP_RE.test(n); }).sort().reverse();
  names.slice(KEEP_COUNT).forEach(function (n) { have[n].setTrashed(true); rep.pruned++; });
  rep.latest = names[0] || '';
}

/** Tệp dữ liệu: chép tệp chưa có (theo ID tệp gốc, ghi ở file_map.json), giữ cấu trúc thư mục con */
function mirrorData_(src, destRoot, deadline, rep) {
  var dest = childFolder_(destRoot, src.name);
  var mapFile = null, map = {};
  var it = dest.getFilesByName('file_map.json');
  if (it.hasNext()) { mapFile = it.next(); try { map = JSON.parse(mapFile.getBlob().getDataAsString()) || {}; } catch (e) { map = {}; } }
  var dirty = 0;
  var save = function () {
    if (mapFile) mapFile.setContent(JSON.stringify(map));
    else mapFile = dest.createFile(Utilities.newBlob(JSON.stringify(map), 'application/json', 'file_map.json'));
    dirty = 0;
  };
  var walk = function (from, to, path) {
    iterToArray_(from.getFiles()).forEach(function (file) {
      if (Date.now() > deadline || map[file.getId()]) return;
      var c = file.makeCopy(file.getName(), to);
      map[file.getId()] = { id: c.getId(), name: file.getName(), path: path, at: new Date().toISOString() };
      rep.copied++;
      if (++dirty >= 20) save();
    });
    iterToArray_(from.getFolders()).forEach(function (sub) {
      if (Date.now() > deadline) return;
      walk(sub, childFolder_(to, sub.getName()), path + '/' + sub.getName());
    });
  };
  walk(src.folder, dest, '');
  if (dirty || !mapFile) save();
  rep.total = Object.keys(map).length;
}

/** Một lượt chép cho mọi nguồn; ghi kết quả vào Thuộc tính tập lệnh LAST_RUN để kiemTra đọc */
function runMirror_() {
  var t0 = Date.now(), deadline = t0 + RUN_BUDGET_MS;
  var sources = findSources_();
  var root = mirrorRoot_();
  var report = { at: new Date().toISOString(), sources: [] };
  sources.forEach(function (s) {
    var rep = { name: s.name, app: s.app, env: s.env, kind: s.kind, copied: 0, skipped: 0, pruned: 0, error: '' };
    try {
      if (Date.now() > deadline) rep.error = 'HET_GIO';
      else if (s.kind === 'BACKUP') mirrorBackups_(s, root, deadline, rep);
      else mirrorData_(s, root, deadline, rep);
    } catch (e) {
      rep.error = String(e && e.message || e).slice(0, 200);
    }
    report.sources.push(rep);
  });
  report.ms = Date.now() - t0;
  report.timed_out = Date.now() > deadline;
  PropertiesService.getScriptProperties().setProperty('LAST_RUN', JSON.stringify(report));
  return report;
}

/** Hằng ngày (trigger) và Chép ngay */
function chepNgay() {
  var r = runMirror_();
  if (!r.sources.length) {
    log_('Chưa thấy thư mục nào được chia sẻ cho tài khoản này (tên dạng ISO_Backups_THU, ME_Backups, CS_Backups…). ' +
      'Kiểm tra: tài khoản chính đã chia sẻ thư mục chưa, script có đang chạy trong tài khoản THỨ HAI không.');
    return r;
  }
  r.sources.forEach(function (s) {
    log_((s.error ? 'LỖI     ' : 'XONG    ') + s.name + ': ' + (s.kind === 'BACKUP'
      ? 'chép ' + s.copied + ' bản sao lưu mới' + (s.skipped ? ', bỏ qua ' + s.skipped + ' bản chưa kiểm chứng' : '') + (s.pruned ? ', xóa ' + s.pruned + ' bản cũ' : '') + (s.latest ? ' — mới nhất ' + s.latest : '')
      : 'chép ' + s.copied + ' tệp mới, tổng ' + (s.total || 0) + ' tệp') + (s.error ? ' — ' + s.error : ''));
  });
  if (r.timed_out) log_('Hết giờ của lượt này — lượt sau chép tiếp.');
  return r;
}

/** Kiểm tra: bản sao lưu mới nhất của từng nguồn, cảnh báo nếu quá STALE_DAYS ngày */
function kiemTra() {
  var last = PropertiesService.getScriptProperties().getProperty('LAST_RUN');
  log_('Lần chạy gần nhất: ' + (last ? JSON.parse(last).at : 'chưa chạy'));
  var root = mirrorRoot_();
  var out = [];
  findSources_().forEach(function (s) {
    var it = root.getFoldersByName(s.name);
    var dest = it.hasNext() ? it.next() : null;
    if (s.kind === 'BACKUP') {
      var stamps = dest ? iterToArray_(dest.getFolders()).map(function (f) { return f.getName(); }).filter(function (n) { return STAMP_RE.test(n) && n.indexOf(PARTIAL_SUFFIX) < 0; }).sort() : [];
      var latest = stamps[stamps.length - 1] || '';
      var age = latest ? Math.floor((Date.now() - Date.parse(latest.slice(0, 10) + 'T00:00:00+07:00')) / 86400000) : null;
      var ok = latest && age <= STALE_DAYS;
      out.push({ name: s.name, ok: !!ok, latest: latest, count: stamps.length });
      log_((ok ? 'ĐẠT      ' : 'CẢNH BÁO ') + s.name + ': ' + (latest ? stamps.length + ' bản, mới nhất ' + latest + ' (' + age + ' ngày)' : 'chưa có bản nào') +
        (ok ? '' : ' — kiểm tra sao lưu hằng tuần của app (trạng thái hệ thống, dòng last_backup)'));
    } else {
      var n = 0;
      if (dest) { var mi = dest.getFilesByName('file_map.json'); if (mi.hasNext()) { try { n = Object.keys(JSON.parse(mi.next().getBlob().getDataAsString())).length; } catch (e) { n = 0; } } }
      out.push({ name: s.name, ok: true, files: n });
      log_('ĐẠT      ' + s.name + ': ' + n + ' tệp đã chép');
    }
  });
  if (!out.length) log_('CẢNH BÁO chưa có thư mục nguồn nào — chạy danhSachNguon để xem.');
  return out;
}

/** Liệt kê thư mục nguồn tìm thấy (kiểm tra chia sẻ) */
function danhSachNguon() {
  var list = findSources_();
  log_('Tài khoản đang chạy script: ' + (me_() || '(không rõ)'));
  if (!list.length) log_('Không thấy thư mục nguồn nào.');
  list.forEach(function (s) { log_(s.name + ' (' + s.app + ', ' + s.env + ', ' + (s.kind === 'BACKUP' ? 'sao lưu' : 'dữ liệu') + ')'); });
  return list.map(function (s) { return { name: s.name, app: s.app, env: s.env, kind: s.kind }; });
}

/** Lần đầu: chạy thử một lượt rồi cài lịch chạy hằng ngày lúc 3 giờ sáng (giờ Việt Nam) */
function caiDat() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'chepNgay') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('chepNgay').timeBased().everyDays(1).atHour(3).inTimezone('Asia/Ho_Chi_Minh').create();
  log_('Đã cài lịch chép hằng ngày lúc 3 giờ sáng.');
  danhSachNguon();
  return chepNgay();
}
