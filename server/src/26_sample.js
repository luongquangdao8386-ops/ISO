/* 26_sample: dữ liệu mẫu cho máy chủ THỬ (owner, PIN): ~25 biểu giả ở 10 bộ phận, điều khoản mẫu, 4 tài khoản mẫu.
 * Không phải danh mục thật (file Excel tổng không lên repo public). Dòng mẫu đi qua đúng bộ chuẩn hóa của nhập Excel. */

/** [B mã, C tên Việt, tên Trung, E mã bộ phận, F nhóm, G ISO 9001, K BRCGS, N tần suất, R nơi làm, T tình trạng, U lần, V ngày, W chu kỳ, Q ưu tiên, Z ghi chú] */
var SAMPLE_ITEMS_ = [
  ['BM-ISO-02-01', 'Danh mục tài liệu nội bộ', '内部文件清单', 'ISO', '02. Kiểm soát tài liệu · 文件控制', '7.5.3', 'Kiểm soát tài liệu', 'Khi phát sinh\n发生时', 'MANUAL', '●', '1', '2026-01-05', '', 1, ''],
  ['BM-ISO-02-04', 'Danh mục hồ sơ & thời gian lưu', '记录清单及保存期限', 'ISO', '02. Kiểm soát tài liệu · 文件控制', '7.5.3', 'Kiểm soát tài liệu', 'Hằng năm\n每年', 'MANUAL', '●', '1', '2026-01-05', 366, 1, ''],
  ['QT-ISO-01', 'Quy trình kiểm soát tài liệu', '文件控制程序', 'ISO', '02. Kiểm soát tài liệu · 文件控制', '7.5', '', '', 'MANUAL', '●', '2', '2025-12-01', '', '', ''],
  ['BM-ISO-03-01', 'Chương trình đánh giá nội bộ năm', '年度内部审核方案', 'ISO', '03. Đánh giá nội bộ · 内部审核', '9.2', 'Đánh giá nội bộ', 'Hằng năm\n每年', 'MANUAL', '○', '', '', 366, 1, ''],
  ['BM-ISO-04-02', 'Sổ theo dõi khắc phục', '纠正措施跟踪表', 'ISO', '04. Khắc phục · 纠正措施', '10.2', 'Hành động khắc phục', 'Hằng tuần\n每周', 'MANUAL', '◐', '', '', 7, 1, ''],
  ['BM-ISO-05-01', 'Đầu vào xem xét lãnh đạo', '管理评审输入', 'ISO', '05. Xem xét lãnh đạo · 管理评审', '9.3', 'Xem xét lãnh đạo', 'Hằng năm\n每年', 'MANUAL', '○', '', '', 366, 1, ''],
  ['BM-KD-01-04', 'Sổ theo dõi đơn hàng & giao hàng', '订单及交货跟踪表', 'KD', '01. Đơn hàng · 订单', '8.2.3; 8.5.5', 'Yêu cầu khách hàng', 'Hằng tuần\n每周', 'MANUAL', '●', '1', '2026-02-10', 7, '', ''],
  ['BM-KD-02-01', 'Phiếu tiếp nhận khiếu nại', '客户投诉登记表', 'KD', '02. Khiếu nại · 投诉', '9.1.2; 10.2', 'Khiếu nại khách hàng', 'Khi phát sinh\n发生时', 'MANUAL', '○', '', '', '', 1, ''],
  ['BM-CB-01-02', 'Phiếu duyệt bản in mẫu', '样稿审批单', 'CB', '01. Chế bản · 制版', '8.3.4', 'Kiểm soát in ấn', 'Mỗi đơn hàng\n每个订单', 'MANUAL', '●', '2', '2026-03-01', '', 2, ''],
  ['BM-SX-01-01', 'Kế hoạch sản xuất tuần/ngày', '周/日生产计划', 'SX', '01. Kế hoạch · 计划', '8.1; 8.5.1', '', 'Hằng ngày\n每天', 'MANUAL', '●', '1', '2026-01-20', 1, '', ''],
  ['BM-SX-02-01', 'Báo cáo sản xuất ca', '班次生产报告', 'SX', '02. Sản xuất · 生产', '8.5.1', 'Kiểm soát quá trình', 'Mỗi ca\n每班', 'MANUAL', '●', '1', '2026-01-20', 1, '', 'Thời gian dừng máy lấy từ sổ dừng máy BM-CĐ-04-03 (M&E)'],
  ['BM-SX-02-03', 'Sổ phế phẩm & giấy hư', '废品及废纸记录', 'SX', '02. Sản xuất · 生产', '8.7', 'Sản phẩm không phù hợp', 'Mỗi ca\n每班', 'MANUAL', '◐', '', '', 1, 2, ''],
  ['BM-CL-01-01', 'Phiếu kiểm tra đầu vào', '来料检验单', 'CL', '01. Kiểm tra · 检验', '8.4.2; 8.6', 'Kiểm soát nguyên liệu', 'Mỗi lô\n每批', 'MANUAL', '●', '1', '2026-02-01', '', '', ''],
  ['BM-CL-04-01', 'Phiếu sản phẩm không phù hợp', '不合格品处理单', 'CL', '04. Không phù hợp · 不合格', '8.7', 'Sản phẩm không phù hợp', 'Khi phát sinh\n发生时', 'MANUAL', '○', '', '', '', 1, ''],
  ['BM-CL-05-02', 'Theo dõi hiệu chuẩn dụng cụ đo', '量具校准跟踪表', 'CL', '05. Hiệu chuẩn · 校准', '7.1.5', 'Hiệu chuẩn', 'Hằng năm\n每年', 'ME_PART', '●', '1', '2026-02-01', 366, '', ''],
  ['BM-MH-01-06', 'Phiếu yêu cầu khắc phục nhà cung cấp (SCAR)', '供应商纠正措施要求', 'MH', '01. Nhà cung cấp · 供应商', '8.4.1; 10.2', 'Quản lý nhà cung cấp', 'Khi phát sinh\n发生时', 'MANUAL', '○', '', '', '', 2, ''],
  ['BM-KV-01-03', 'Sổ nhiệt độ, độ ẩm kho', '仓库温湿度记录', 'KV', '01. Kho · 仓库', '7.1.4', 'Bảo quản', 'Hằng ngày\n每天', 'CS_PROPOSED', '○', '', '', 1, 2, ''],
  ['BM-NS-01-02', 'Kế hoạch đào tạo năm', '年度培训计划', 'NS', '01. Đào tạo · 培训', '7.2', 'Đào tạo', 'Hằng năm\n每年', 'MANUAL', '●', '1', '2026-01-10', 366, '', ''],
  ['BM-BRC-03-01', 'Sổ cấp phát dao, vật sắc', '刀具及利器发放记录', 'BRC', '03. Kiểm soát vật lạ · 异物控制', '', 'Kiểm soát vật lạ; Dao và vật sắc', 'Mỗi ca\n每班', 'MANUAL', '◐', '', '', 1, 1, ''],
  ['BM-BRC-05-02', 'Đối chiếu số lượng tờ in', '印张数量核对', 'BRC', '05. Nhãn & in · 标签与印刷', '', 'Kiểm soát in ấn', 'Mỗi đơn hàng\n每个订单', 'MANUAL', '○', '', '', '', 2, 'Khách hàng dược phẩm → ưu tiên 1'],
  ['BM-CĐ-01-05', 'Danh mục tài liệu cơ điện', '机电文件清单', 'CĐ', '01. TÀI LIỆU · 01. 文件', '7.5.3', '', '', 'MANUAL', '✕', '', '', '', '', 'Gộp vào BM-ISO-02-01'],
  ['BM-CĐ-02-05', 'Checksheet máy nén khí', '空压机点检表', 'CĐ', '02. THIẾT BỊ · 02. 设备', '7.1.3', 'Bảo trì', 'Hằng ngày\n每天', 'CS', '◐', '', '', 1, '', ''],
  ['BM-CĐ-03-03', 'Phiếu bảo trì thiết bị', '设备保养记录', 'CĐ', '03. BẢO TRÌ · 03. 保养', '7.1.3', 'Bảo trì', 'Hằng tháng\n每月', 'ME', '◐', '', '', 31, '', ''],
  ['BM-CĐ-04-03', 'Sổ dừng máy', '停机记录', 'CĐ', '04. SỬA CHỮA · 04. 维修', '7.1.3', 'Bảo trì', 'Hằng ngày\n每天', 'ME', '◐', '', '', 1, '', ''],
  ['BM-CĐ-08-01', 'Sổ chỉ số điện nước', '水电读数记录', 'CĐ', '08. ĐIỆN NƯỚC · 08. 水电', '7.1.3', '', 'Hằng tháng\n每月', 'ME_PART', '◐', '', '', 31, '', '']
];

/** Điều khoản mẫu: [chuẩn, khóa, nhóm Việt, nhóm Trung, tên Việt, tên Trung, bắt buộc lưu hồ sơ] */
var SAMPLE_CLAUSES_ = [
  ['ISO9001', '7.1.3', 'Hỗ trợ', '支持', 'Cơ sở hạ tầng (mẫu)', '基础设施（样例）', false],
  ['ISO9001', '7.1.5', 'Hỗ trợ', '支持', 'Nguồn lực theo dõi và đo lường (mẫu)', '监视和测量资源（样例）', true],
  ['ISO9001', '7.2', 'Hỗ trợ', '支持', 'Năng lực (mẫu)', '能力（样例）', true],
  ['ISO9001', '7.5', 'Hỗ trợ', '支持', 'Thông tin dạng văn bản (mẫu)', '成文信息（样例）', false],
  ['ISO9001', '8.4', 'Thực hiện', '运行', 'Kiểm soát nhà cung cấp bên ngoài (mẫu)', '外部提供的过程、产品和服务的控制（样例）', true],
  ['ISO9001', '8.5.1', 'Thực hiện', '运行', 'Kiểm soát sản xuất (mẫu)', '生产和服务提供的控制（样例）', false],
  ['ISO9001', '8.7', 'Thực hiện', '运行', 'Kiểm soát đầu ra không phù hợp (mẫu)', '不合格输出的控制（样例）', true],
  ['ISO9001', '9.2', 'Đánh giá kết quả', '绩效评价', 'Đánh giá nội bộ (mẫu)', '内部审核（样例）', true],
  ['ISO9001', '9.3', 'Đánh giá kết quả', '绩效评价', 'Xem xét của lãnh đạo (mẫu)', '管理评审（样例）', true],
  ['ISO9001', '10.2', 'Cải tiến', '改进', 'Sự không phù hợp và hành động khắc phục (mẫu)', '不合格和纠正措施（样例）', true],
  ['ISO9001', '6.3', 'Hoạch định', '策划', 'Hoạch định các thay đổi (mẫu)', '变更的策划（样例）', false],
  ['BRC', 'Kiểm soát vật lạ', 'Kiểm soát sản phẩm', '产品控制', 'Kiểm soát vật lạ (mẫu)', '异物控制（样例）', false],
  ['BRC', 'Dao và vật sắc', 'Kiểm soát sản phẩm', '产品控制', 'Dao và vật sắc (mẫu)', '刀具和利器（样例）', false],
  ['BRC', 'Kiểm soát in ấn', 'Kiểm soát quá trình', '过程控制', 'Kiểm soát in ấn (mẫu)', '印刷控制（样例）', false],
  ['BRC', 'Khiếu nại khách hàng', 'Hệ thống chất lượng', '质量体系', 'Khiếu nại khách hàng (mẫu)', '客户投诉（样例）', false],
  ['BRC', 'Đào tạo', 'Nhân sự', '人员', 'Đào tạo (mẫu)', '培训（样例）', false],
  ['BRC', 'Truy xuất', 'Hệ thống chất lượng', '质量体系', 'Truy xuất nguồn gốc (mẫu)', '可追溯性（样例）', false]
];

/** Tài khoản mẫu: [mã, tên, cấp, bộ phận, Thư ký ISO, trưởng bộ phận của] */
var SAMPLE_USERS_ = [
  ['MAU-TK', 'Thư ký ISO MẪU', 2, 'ISO', true, ''],
  ['MAU-CL3', 'Trưởng QA MẪU', 3, 'CL', false, 'CL'],
  ['MAU-SX2', 'Nhân viên SX MẪU', 2, 'SX', false, ''],
  ['MAU-KD1', 'Tra cứu KD MẪU', 1, 'KD', false, '']
];

function sampleCells_(s) {
  var dep = DEPTS_SEED_.filter(function (d) { return d[0] === s[3]; })[0];
  return {
    B: s[0], C: s[1] + '\n' + s[2], D: '', E: dep ? dep[1] + ' · ' + dep[2] : s[3], F: s[4], G: s[5], K: s[6], N: s[7],
    R: whereDisplay_(s[8]), T: s[9], U: s[10], V: s[11], W: s[12] === '' ? '' : String(s[12]), Q: s[13] === '' ? '' : String(s[13]), Z: s[14]
  };
}

function seedSample_(byUserId) {
  if (!isTestEnv_()) throw new Error('Chỉ chạy ở máy chủ THỬ (ENV=THU).');
  var nowIso = isoVN_(now_());
  var items = readRows_('Items');
  if (items.some(function (r) { return r.code === SAMPLE_ITEMS_[0][0]; })) return { already: true };
  var ctx = { user: { user_id: byUserId || SYSTEM_USER } };
  var look = deptLookup_(readRows_('Depts'));
  var groups = {};
  readRows_('Groups').forEach(function (g) { groups[g.group_key] = true; });
  var writes = [];
  SAMPLE_ITEMS_.forEach(function (s, i) {
    var n = normCatalogRow_(sampleCells_(s), look, i + 5);
    if (n.errors.length) throw new Error('Dòng mẫu lỗi ' + s[0] + ': ' + JSON.stringify(n.errors));
    n.fields.sort_order = i + 1;
    writes.push({ sheet: 'Items', mode: 'insert', row: itemRowFromImport_(ctx, null, n.code, n.fields, nowIso) });
    var g = n.group;
    if (g && !groups[g.group_key]) {
      groups[g.group_key] = true;
      writes.push({ sheet: 'Groups', mode: 'insert', row: cNewSystem_({ group_key: g.group_key, dept_code: g.dept_code, name_vi: g.name_vi, name_zh: g.name_zh, label: g.label, sort_order: i + 1, active: true, i18n_meta: { name: { src: 'vi', state: 'HUMAN', at: nowIso } } }) });
    }
  });
  var haveCl = {};
  readRows_('Clauses').forEach(function (c) { haveCl[c.clause_id] = true; });
  var perStd = {};
  SAMPLE_CLAUSES_.forEach(function (c) {
    var id = c[0] + '|' + c[1];
    perStd[c[0]] = (perStd[c[0]] || 0) + 1;
    if (haveCl[id]) return;
    writes.push({ sheet: 'Clauses', mode: 'insert', row: cNewSystem_({ clause_id: id, std: c[0], key: c[1], group_vi: c[2], group_zh: c[3], name_vi: c[4], name_zh: c[5], mandatory_record: c[6], sort_order: perStd[c[0]], active: true,
      i18n_meta: { name: { src: 'vi', state: 'HUMAN', at: nowIso }, group: { src: 'vi', state: 'HUMAN', at: nowIso } } }) });
  });
  systemWrite_(writes, { action: 'sample.seed', entity_type: 'SYSTEM', after_json: { items: SAMPLE_ITEMS_.length, by: byUserId || SYSTEM_USER } });
  // Tài khoản mẫu: PIN tạm 72 giờ, đăng nhập lần đầu phải đổi PIN
  var pins = {};
  var heads = {};
  withWriteLock_(function () {
    var have = {};
    readRows_('Users').forEach(function (u) { have[u.employee_code] = true; });
    var add = [];
    SAMPLE_USERS_.forEach(function (u) {
      if (have[u[0]]) return;
      var pin = randomPin_(u[0]);
      var rec = newPinRecord_(pin);
      var uid = uuid_();
      pins[u[0]] = pin;
      if (u[5]) heads[u[5]] = uid;
      add.push({
        user_id: uid, employee_code: u[0], display_name: u[1], email: '', role_level: u[2], active: true, pin_hash: rec.pin_hash, salt: rec.salt,
        pin_hash_version: rec.pin_hash_version, failed_attempts: 0, locked_until: '', created_at: nowIso, updated_at: nowIso, auth_version: 1,
        is_system_owner: false, must_change_pin: true, temp_pin_expires_at: isoVN_(new Date(now_().getTime() + setting_('temp_pin_hours') * 3600000)),
        pin_changed_at: '', failed_window_started_at: '', last_login_at: '', record_version: 1, created_by: SYSTEM_USER, updated_by: SYSTEM_USER,
        dept_codes: u[3], iso_secretary: u[4], auditor: false
      });
    });
    if (add.length) {
      insertRows_('Users', add);
      var st = readState_();
      var rev = Number(stateGet_(st, 'sync_revision', 0)) + 1;
      stateWrite_(st, { sync_revision: ['INT', rev], 'table_rev.Users': ['INT', rev] }, SYSTEM_USER);
    }
  });
  cache_().remove('users:dir');
  DB_.userDir = null;
  var dw = [];
  readRows_('Depts').forEach(function (d) {
    if (!heads[d.dept_code] || d.head_user_id) return;
    var row = clone_(d); delete row.__row;
    row.head_user_id = heads[d.dept_code];
    row.record_version = (row.record_version || 0) + 1; row.updated_at = nowIso; row.updated_by = SYSTEM_USER;
    dw.push({ sheet: 'Depts', mode: 'update', row: row });
  });
  if (dw.length) systemWrite_(dw);
  return { items: SAMPLE_ITEMS_.length, clauses: SAMPLE_CLAUSES_.length, temp_pins: pins };
}

/** Chạy từ trình soạn ở máy chủ THỬ: in PIN tạm của tài khoản mẫu vào nhật ký thực thi */
function adminSeedSample() {
  dbReset_();
  var out = seedSample_(SYSTEM_USER);
  if (out.already) { log_('Đã có dữ liệu mẫu — không tạo thêm.'); return; }
  log_('Đã tạo dữ liệu mẫu: ' + out.items + ' biểu, ' + out.clauses + ' điều khoản. PIN tạm (đổi khi đăng nhập lần đầu): ' +
    Object.keys(out.temp_pins).map(function (k) { return k + ' = ' + out.temp_pins[k]; }).join(', '));
}

/** sample.seed (owner, PIN, chỉ THỬ): như adminSeedSample, PIN tạm trả một lần trong phản hồi */
function sampleSeedAction_(ctx) {
  if (!isTestEnv_()) throw apiError_('FORBIDDEN');
  var out = withWriteLock_(function () { return seedSample_(ctx.user.user_id); });
  writeAudit_({ user_id: ctx.user.user_id, device_id: ctx.req.device_id, action: 'sample.seed', entity_type: 'SYSTEM', entity_id: '', before_json: null, after_json: { already: !!out.already, items: out.items || 0 }, operation_id: ctx.req.operation_id || '', auth_basis: authBasis_(ctx) });
  return out;
}
