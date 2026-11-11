/* 15_admin: hàm chạy từ trình soạn Apps Script và trigger (lấy từ M&E qua Checksheet)
 * Tên không có hậu tố "_" để hiện trong menu Chạy; không có tham số. */

function log_(msg) {
  Logger.log(msg);
}

/** Tạo một sheet với hàng tiêu đề, cố định hàng 1, định dạng ô theo kiểu (3.1) */
function createSheet_(book, name) {
  var s = sheetSchema_(name);
  var sheet = book.insertSheet(name);
  var cols = s.cols;
  if (sheet.getMaxColumns() < cols.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), cols.length - sheet.getMaxColumns());
  sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  formatColumns_(sheet, name, cols, 0);
  return sheet;
}

/** Đặt định dạng Văn bản (@) cho các cột ID/CODE/DATE/DATETIME/JSON/STRING/ENUM từ vị trí fromIdx; gom cột liền nhau */
function formatColumns_(sheet, name, headerCols, fromIdx) {
  var types = sheetSchema_(name).types;
  var rows = Math.max(1, sheet.getMaxRows() - 1);
  var i = fromIdx;
  while (i < headerCols.length) {
    if (!TEXT_FORMAT_TYPES_[types[headerCols[i]] || 'STRING']) { i++; continue; }
    var j = i;
    while (j + 1 < headerCols.length && TEXT_FORMAT_TYPES_[types[headerCols[j + 1]] || 'STRING']) j++;
    sheet.getRange(2, i + 1, rows, j - i + 1).setNumberFormat('@');
    i = j + 1;
  }
}

function settingRow_(d) {
  var v = d[1] === 'JSON' ? JSON.stringify(d[2]) : (d[1] === 'BOOL' ? (d[2] ? 'true' : 'false') : String(d[2]));
  return { setting_key: d[0], value: v, value_type: d[1], description_vi: d[5], description_zh: d[6], updated_at: isoVN_(now_()), updated_by: SYSTEM_USER, i18n_meta: { description: { src: 'vi', state: 'HUMAN', at: isoVN_(now_()) } } };
}

/** Dựng môi trường mới (THỬ hoặc THẬT). Đã có BUSINESS_SPREADSHEET_ID thì dừng. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('BUSINESS_SPREADSHEET_ID')) {
    log_('Đã cài đặt trước đó — không làm gì. Muốn thêm sheet/cột thì chạy migrateSchema.');
    return;
  }
  // ENV đặt tay trước setup: quên đặt ở dự án THẬT thì THẬT chạy như THỬ (TEST_*, dữ liệu mẫu) — nên bắt buộc
  var env = String(props.getProperty('ENV') || '').trim();
  if (env !== 'THU' && env !== 'THAT') {
    throw new Error('Chưa đặt thuộc tính ENV (hoặc sai). Cài đặt dự án → Thuộc tính tập lệnh → thêm ENV = THAT (máy chủ dùng thật) hoặc THU (máy chủ thử), rồi chạy lại setup.');
  }
  props.setProperty('ENV', env);
  adminSetupSecrets();
  var suffix = env === 'THU' ? '_THU' : '';
  var parent = DriveApp.createFolder(NAME_PREFIX + 'HeThong' + suffix);
  var dataFolder = parent.createFolder(NAME_PREFIX + 'Data' + suffix);
  var backupFolder = parent.createFolder(NAME_PREFIX + 'Backups' + suffix);
  var biz = SpreadsheetApp.create(NAME_PREFIX + 'NghiepVu' + suffix);
  var sec = SpreadsheetApp.create(NAME_PREFIX + 'BaoMat' + suffix);
  biz.setSpreadsheetTimeZone(TZ);
  sec.setSpreadsheetTimeZone(TZ);
  DriveApp.getFileById(biz.getId()).moveTo(parent);
  DriveApp.getFileById(sec.getId()).moveTo(parent);
  props.setProperties({
    BUSINESS_SPREADSHEET_ID: biz.getId(), SECURITY_SPREADSHEET_ID: sec.getId(),
    DRIVE_ROOT_FOLDER_ID: dataFolder.getId(), DRIVE_BACKUP_FOLDER_ID: backupFolder.getId(),
    DATASET_EPOCH: uuid_(), MAINTENANCE_MODE: 'false'
  });
  dbReset_();
  sheetsForDot_(RELEASED_DOT).forEach(function (name) {
    createSheet_(sheetSchema_(name).book === 'S' ? sec : biz, name);
  });
  [biz, sec].forEach(function (b) {
    b.getSheets().forEach(function (s) { if (!SHEETS[s.getName()]) b.deleteSheet(s); });
  });
  dbReset_();
  seedBaseRows_();
  clearSysCaches_();
  log_('Xong setup. ENV=' + env + '. Đã tạo ' + sheetsForDot_(RELEASED_DOT).length + ' sheet trong thư mục ' + parent.getName() +
    '. Bước tiếp theo: đặt SETUP_OWNER_CODE, SETUP_OWNER_NAME, SETUP_OWNER_TEMP_PIN rồi chạy adminSetupOwner.');
  installTriggers();
}

/** Nạp Settings, SystemState, bộ phận còn thiếu (dùng chung cho setup và migrateSchema) */
function seedBaseRows_() {
  withWriteLock_(function () {
    var have = {};
    readRows_('Settings').forEach(function (r) { have[r.setting_key] = true; });
    var add = SETTINGS_DEFAULTS.filter(function (d) { return d[4] <= RELEASED_DOT && !have[d[0]]; }).map(settingRow_);
    if (add.length) insertRows_('Settings', add);

    var st = readState_();
    var su = {};
    SYSTEM_STATE_INITIAL.forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(st.map, k[0])) su[k[0]] = [k[1], k[2]];
    });
    su.dataset_epoch = ['STRING', prop_('DATASET_EPOCH')];
    su.maintenance_mode = ['BOOL', prop_('MAINTENANCE_MODE') === 'true'];
    su.schema_version = ['STRING', SCHEMA_VERSION];
    stateWrite_(st, su, SYSTEM_USER);
    // 10 bộ phận mặc định (ISO, KD, CB, SX, CL, MH, KV, NS, BRC, CĐ)
    seedDepts_();
  });
}

/** Thêm sheet/cột/Settings còn thiếu; chạy nhiều lần vẫn cùng kết quả */
function migrateSchema() {
  if (!prop_('BUSINESS_SPREADSHEET_ID')) throw new Error('Chưa setup');
  dbReset_();
  var added = [];
  sheetsForDot_(RELEASED_DOT).forEach(function (name) {
    var s = sheetSchema_(name);
    var book = book_(s.book);
    var sheet = book.getSheetByName(name);
    if (!sheet) { createSheet_(book, name); added.push(name); return; }
    var n = sheet.getLastColumn();
    var header = n ? sheet.getRange(1, 1, 1, n).getValues()[0].map(String) : [];
    var missing = s.cols.filter(function (c) { return header.indexOf(c) < 0; });
    if (missing.length) {
      if (sheet.getMaxColumns() < header.length + missing.length) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), header.length + missing.length - sheet.getMaxColumns());
      }
      sheet.getRange(1, header.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
      added.push(name + '(' + missing.join(',') + ')');
    }
    // Định dạng Văn bản cho mọi cột kiểu chuỗi, kể cả cột cũ vừa đổi kiểu (vd. due_revision)
    formatColumns_(sheet, name, header.concat(missing), 0);
  });
  dbReset_();
  seedBaseRows_();
  clearSysCaches_();
  log_('migrateSchema xong. Thêm: ' + (added.length ? added.join('; ') : 'không có') + '. schema_version=' + SCHEMA_VERSION);
}

function clearSysCaches_() {
  cache_().removeAll(['sys:props', 'sys:state', 'cfg:settings']);
}

/** Sinh PIN_PEPPER_V1, TOKEN_SECRET_V1 nếu chưa có; không ghi đè */
function adminSetupSecrets() {
  var props = PropertiesService.getScriptProperties();
  ['PIN_PEPPER_V1', 'TOKEN_SECRET_V1'].forEach(function (k) {
    if (props.getProperty(k)) { log_(k + ': đã có, giữ nguyên.'); return; }
    props.setProperty(k, b64_(randomSecret32_()));
    log_(k + ': đã tạo.');
  });
}

/** Tạo owner đầu tiên từ SETUP_OWNER_CODE, SETUP_OWNER_NAME, SETUP_OWNER_TEMP_PIN; xóa ba khóa ngay sau khi dùng */
function adminSetupOwner() {
  if (!prop_('BUSINESS_SPREADSHEET_ID')) throw new Error('Chưa setup — chạy setup trước.');
  var code = normEmpCode_(prop_('SETUP_OWNER_CODE'));
  var name = trimStr_(prop_('SETUP_OWNER_NAME'));
  var pin = trimStr_(prop_('SETUP_OWNER_TEMP_PIN'));
  if (!code || !name || !pin) throw new Error('Thiếu SETUP_OWNER_CODE / SETUP_OWNER_NAME / SETUP_OWNER_TEMP_PIN trong Thuộc tính tập lệnh.');
  if (!/^[A-Z0-9][A-Z0-9._-]{0,39}$/.test(code)) throw new Error('Mã nhân viên chỉ gồm chữ, số, dấu . _ -');
  var weak = pinWeakReason_(pin, code, null);
  if (weak) throw new Error('PIN tạm không hợp lệ hoặc quá dễ đoán (' + weak + '). Chọn 6 số khác.');
  dbReset_();
  var created = withWriteLock_(function () {
    var users = readRows_('Users');
    if (users.some(function (u) { return u.is_system_owner && u.active && Number(u.role_level) === 4; })) {
      return 'EXISTS';
    }
    if (users.some(function (u) { return u.employee_code === code; })) throw new Error('Mã nhân viên đã tồn tại: ' + code);
    var rec = newPinRecord_(pin);
    var nowIso = isoVN_(now_());
    insertRows_('Users', [{
      user_id: uuid_(), employee_code: code, display_name: name, email: '', role_level: 4, active: true,
      pin_hash: rec.pin_hash, salt: rec.salt, pin_hash_version: rec.pin_hash_version, failed_attempts: 0, locked_until: '',
      created_at: nowIso, updated_at: nowIso, auth_version: 1, is_system_owner: true, must_change_pin: true,
      temp_pin_expires_at: isoVN_(new Date(now_().getTime() + setting_('temp_pin_hours') * 3600000)), pin_changed_at: '',
      failed_window_started_at: '', last_login_at: '', record_version: 1, created_by: SYSTEM_USER, updated_by: SYSTEM_USER,
      dept_codes: '', iso_secretary: false, auditor: false
    }]);
    return 'CREATED';
  });
  ['SETUP_OWNER_CODE', 'SETUP_OWNER_NAME', 'SETUP_OWNER_TEMP_PIN'].forEach(delProp_);
  if (created === 'EXISTS') log_('Đã có owner đang hoạt động — không tạo thêm. Đã xóa 3 khóa SETUP_OWNER_*.');
  else log_('Đã tạo owner ' + code + ' (cấp 4). Đăng nhập bằng PIN tạm trong 72 giờ, app sẽ bắt đổi PIN. Đã xóa 3 khóa SETUP_OWNER_*.');
}

/**
 * Owner quên PIN (cả THỬ lẫn THẬT): trong app không ai được động tới owner trừ chính owner,
 * nên người giữ tài khoản Google cấp PIN tạm từ trình soạn. Đặt OWNER_RESET_TEMP_PIN (6 số) rồi chạy hàm này;
 * khóa tự xóa ngay, không ghi PIN vào log. Owner đăng nhập bằng PIN tạm trong 72 giờ và phải đổi PIN; mọi phiên cũ bị thu hồi.
 */
function adminResetOwnerPin() {
  if (!prop_('BUSINESS_SPREADSHEET_ID')) throw new Error('Chưa setup — chạy setup trước.');
  var pin = trimStr_(prop_('OWNER_RESET_TEMP_PIN'));
  delProp_('OWNER_RESET_TEMP_PIN');
  if (!pin) throw new Error('Thiếu OWNER_RESET_TEMP_PIN (6 số) trong Thuộc tính tập lệnh.');
  dbReset_();
  var code = withWriteLock_(function () {
    var owners = readRows_('Users').filter(function (u) { return u.is_system_owner && Number(u.role_level) === 4; });
    if (!owners.length) throw new Error('Chưa có owner — dùng adminSetupOwner.');
    if (owners.length > 1) throw new Error('Có hơn một owner — sửa tay sheet Users trước.');
    var u = owners[0];
    var weak = pinWeakReason_(pin, u.employee_code, null);
    if (weak) throw new Error('PIN tạm không hợp lệ hoặc quá dễ đoán (' + weak + '). Chọn 6 số khác.');
    var rec = newPinRecord_(pin);
    bumpAuthVersion_(u, {
      pin_hash: rec.pin_hash, salt: rec.salt, pin_hash_version: rec.pin_hash_version, must_change_pin: true,
      temp_pin_expires_at: isoVN_(new Date(now_().getTime() + setting_('temp_pin_hours') * 3600000)),
      failed_attempts: 0, failed_window_started_at: '', locked_until: '', active: true
    });
    writeAudit_({ user_id: SYSTEM_USER, action: 'user.resetPin', entity_type: 'USER', entity_id: u.user_id, before_json: null, after_json: { temp_pin_issued: true, by: 'adminResetOwnerPin' }, auth_basis: 'OWNER' });
    return u.employee_code;
  });
  log_('Đã cấp PIN tạm cho owner ' + code + ' (hạn 72 giờ). Mọi phiên cũ của owner đã bị thu hồi; đăng nhập rồi đổi PIN ngay. Đã xóa OWNER_RESET_TEMP_PIN.');
}

var TRIGGER_FUNCS_ = ['runBackgroundJobs', 'backupData'];

/** Xóa trigger trùng tên rồi tạo lại đúng 2 trigger định kỳ: dịch bù mỗi 3 giờ, sao lưu hằng tuần.
 *  Đợt 2 thêm syncEvidenceHourly (đọc ngày có hồ sơ từ M&E, Checksheet) và nhắc hạn Gmail. */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (TRIGGER_FUNCS_.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runBackgroundJobs').timeBased().everyHours(3).create();
  var wd = ScriptApp.WeekDay[String(setting_('backup_weekday') || 'SUNDAY')] || ScriptApp.WeekDay.SUNDAY;
  ScriptApp.newTrigger('backupData').timeBased().onWeekDay(wd).atHour(Number(setting_('backup_hour'))).inTimezone(TZ).create();
  var names = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  log_('Đã cài trigger: ' + names.join(', '));
}

function setMaintenance_(on) {
  setProp_('MAINTENANCE_MODE', on ? 'true' : 'false');
  withWriteLock_(function () {
    var st = readState_();
    stateWrite_(st, { maintenance_mode: ['BOOL', !!on] }, SYSTEM_USER);
  });
  cache_().removeAll(['sys:props', 'sys:state']);
}

function adminMaintenanceOn() { setMaintenance_(true); log_('Đã BẬT bảo trì.'); }
function adminMaintenanceOff() { setMaintenance_(false); log_('Đã TẮT bảo trì.'); }

function adminClearLoginPause() {
  withWriteLock_(function () {
    var st = readState_();
    stateWrite_(st, { login_paused_until: ['DATETIME', ''] }, SYSTEM_USER);
  });
  cache_().remove('sys:state');
  log_('Đã gỡ tạm dừng đăng nhập.');
}

function adminFlushAuthCache() {
  var keys = [];
  readRows_('Sessions').forEach(function (s) { keys.push('ss:' + s.session_id); });
  readRows_('Users').forEach(function (u) { keys.push('us:' + u.user_id); });
  keys.push('users:dir');
  for (var i = 0; i < keys.length; i += 500) cache_().removeAll(keys.slice(i, i + 500));
  log_('Đã xóa ' + keys.length + ' khóa cache phiên/người dùng.');
}

/* runBackgroundJobs (dịch bù) ở 21_i18n.js; backupData (sao lưu hằng tuần) ở 23_backup.js */

/* ---------------- Chuyển máy chủ THỬ thành THẬT (không dựng THỬ riêng) ---------------- */

var THAT_BASE_URL_ = 'https://luongquangdao8386-ops.github.io/ISO/';
/** Sheet danh mục xóa sạch khi chuyển: dữ liệu thử/mẫu; danh mục thật nhập lại từ file Excel tổng */
var THAT_WIPE_SHEETS_ = ['Items', 'Groups', 'Clauses', 'ImportBatches', 'ImportRows'];

/**
 * Chạy MỘT LẦN trong trình soạn Apps Script của máy chủ đang chạy (ENV=THU) để dùng nó làm máy chủ THẬT:
 *  - xóa biểu, nhóm, điều khoản, lô nhập đã có (dữ liệu mẫu/thử) — nhập lại file Excel tổng ngay sau đó;
 *  - xóa 4 tài khoản mẫu MAU-*; giữ owner, tài khoản khác, bộ phận, cài đặt, nhật ký, logo, sao lưu;
 *  - ENV = THAT, bỏ thuộc tính TEST_*, app_base_url → trang /ISO/, ngày bắt đầu tính hồ sơ đặt lại khi nhập danh mục;
 *  - đổi tên thư mục, bảng tính, dự án: bỏ đuôi _THU (ISO_MayChu_THU → ISO_MayChu_THAT);
 *  - đổi DATASET_EPOCH: mọi máy đăng nhập lại, tải dữ liệu từ đầu.
 * Máy chủ đã là THẬT thì không làm gì (chạy nhầm lần hai không mất dữ liệu thật). Link /exec giữ nguyên.
 */
function adminChuyenSangTHAT() {
  var props = PropertiesService.getScriptProperties();
  if (String(props.getProperty('ENV') || '').trim() === 'THAT') {
    log_('Máy chủ đã là THẬT (ENV=THAT) — không làm gì.');
    return { already: true };
  }
  if (!props.getProperty('BUSINESS_SPREADSHEET_ID')) {
    props.setProperty('ENV', 'THAT');
    log_('Chưa setup: đã đặt ENV=THAT. Chạy tiếp hàm setup.');
    return { env_only: true };
  }
  dbReset_();
  var out = withWriteLock_(function () {
    var res = { wiped: {}, users_removed: [] };
    THAT_WIPE_SHEETS_.forEach(function (name) {
      var sheet = sh_(name);
      var last = sheet.getLastRow();
      res.wiped[name] = Math.max(0, readRows_(name).length);
      if (last >= 2) sheet.getRange(2, 1, last - 1, Math.max(1, sheet.getLastColumn())).clearContent();
    });
    // Tài khoản mẫu: xóa dòng (từ dưới lên), bỏ trưởng bộ phận trỏ tới tài khoản đã xóa
    var gone = {};
    readRows_('Users').filter(function (u) { return /^MAU-/.test(String(u.employee_code || '')); })
      .sort(function (a, b) { return b.__row - a.__row; })
      .forEach(function (u) { sh_('Users').deleteRow(u.__row); gone[u.user_id] = true; res.users_removed.push(u.employee_code); });
    dbReset_();
    readRows_('Depts').forEach(function (d) {
      if (d.head_user_id && gone[d.head_user_id]) writeCells_('Depts', d.__row, { head_user_id: '' });
    });
    TEST_PROP_KEYS_.forEach(function (k) { delProp_(k); });
    setProp_('ENV', 'THAT');
    setProp_('DATASET_EPOCH', uuid_());
    clearSysCaches_();
    dbReset_();
    writeSetting_('app_base_url', THAT_BASE_URL_, SYSTEM_USER);
    writeSetting_('records_start_date', '', SYSTEM_USER);
    var st = readState_();
    var rev = Number(stateGet_(st, 'sync_revision', 0)) + 1;
    var su = { dataset_epoch: ['STRING', prop_('DATASET_EPOCH')], sync_revision: ['INT', rev] };
    THAT_WIPE_SHEETS_.concat(['Users', 'Depts', 'Settings']).forEach(function (s) { su['table_rev.' + s] = ['INT', rev]; });
    stateWrite_(st, su, SYSTEM_USER);
    writeAudit_({ user_id: SYSTEM_USER, action: 'system.env_that', entity_type: 'SYSTEM', entity_id: APP_ID, before_json: { env: 'THU' },
      after_json: { env: 'THAT', wiped: res.wiped, users_removed: res.users_removed }, auth_basis: 'SYSTEM' });
    return res;
  });
  // Đổi tên: bỏ đuôi _THU (chia sẻ, ID, link không đổi)
  var renamed = [];
  var rn = function (obj) {
    try {
      var n = obj.getName();
      if (/_THU$/.test(n)) { obj.setName(n.replace(/_THU$/, n.indexOf('MayChu') >= 0 ? '_THAT' : '')); renamed.push(n); }
    } catch (e) { log_('Không đổi được tên (' + (e && e.message) + ') — đổi tay được, không ảnh hưởng app.'); }
  };
  ['BUSINESS_SPREADSHEET_ID', 'SECURITY_SPREADSHEET_ID'].forEach(function (k) { rn(DriveApp.getFileById(props.getProperty(k))); });
  var data = DriveApp.getFolderById(props.getProperty('DRIVE_ROOT_FOLDER_ID'));
  rn(data);
  rn(DriveApp.getFolderById(props.getProperty('DRIVE_BACKUP_FOLDER_ID')));
  try { var ps = data.getParents(); if (ps.hasNext()) rn(ps.next()); } catch (e) { /* thư mục cha: đổi tay */ }
  try { rn(DriveApp.getFileById(ScriptApp.getScriptId())); } catch (e) { /* dự án gắn bảng tính hoặc không đọc được: đổi tay */ }
  clearSysCaches_();
  adminFlushAuthCache();
  var w = out.wiped;
  log_('Xong: máy chủ này là THẬT (ENV=THAT). Đã xóa dữ liệu thử: ' + w.Items + ' biểu, ' + w.Groups + ' nhóm, ' + w.Clauses + ' điều khoản, ' +
    w.ImportBatches + ' lô nhập; tài khoản mẫu: ' + (out.users_removed.join(', ') || 'không có') + '. Đổi tên: ' + (renamed.join(', ') || 'không có') +
    '. Bước tiếp: Triển khai → Quản lý → sửa → Phiên bản mới (giữ link), mở ' + THAT_BASE_URL_ + ', đăng nhập owner, Excel → Nhập lô file Excel tổng.');
  return { wiped: w, users_removed: out.users_removed, renamed: renamed };
}
