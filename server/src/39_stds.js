/* ============================================================================
 * 39_stds.js — Điều khoản ISO 14001, ISO 45001, ISO 50001 (thêm 14/11/2026: công ty có đủ ba chứng nhận).
 * ISO 9001 và BRCGS lấy từ file Excel tổng (sheet Phủ ISO 9001, Phủ BRCGS); ba chuẩn này chưa có trong file gốc nên máy chủ tự nạp
 * danh sách dưới đây khi setup / migrateSchema, chỉ khi bảng Clauses chưa có dòng nào của chuẩn đó (không đè chỗ đã sửa, đã nhập).
 * Sửa danh sách: Excel → Xuất danh mục → sửa sheet Phủ ISO 14001 / 45001 / 50001 → nhập lại.
 *
 * Cùng cách chia như danh sách ISO 9001 của file Excel tổng (41 điều khoản): điều khoản cấp 2, tách cấp 3 ở chỗ tiêu chuẩn chia thành
 * nội dung riêng (6.1.x, 8.1.x của 45001, 9.1.x), không lặp điều khoản cha. Biểu thuộc điều khoản khi mã ở cột H / I / J BẮT ĐẦU bằng
 * điều khoản (6.1.2 gồm cả 6.1.2.1). "Bắt buộc lưu hồ sơ" = tiêu chuẩn yêu cầu duy trì hoặc lưu giữ thông tin dạng văn bản ở điều khoản
 * đó (như cột "Bắt buộc lưu hồ sơ" của trang Phủ ISO 9001).
 * Dòng: [điều khoản, nhóm (số chương), tên Việt, tên Trung, bắt buộc lưu hồ sơ]
 * ========================================================================== */

var STD_GROUPS_ = {
  ISO14001: { 4: ['Bối cảnh của tổ chức', '组织所处的环境'], 5: ['Sự lãnh đạo', '领导作用'], 6: ['Hoạch định', '策划'], 7: ['Hỗ trợ', '支持'],
    8: ['Thực hiện', '运行'], 9: ['Đánh giá kết quả hoạt động', '绩效评价'], 10: ['Cải tiến', '改进'] },
  ISO45001: { 4: ['Bối cảnh của tổ chức', '组织所处的环境'], 5: ['Sự lãnh đạo và sự tham gia của người lao động', '领导作用和工作人员参与'],
    6: ['Hoạch định', '策划'], 7: ['Hỗ trợ', '支持'], 8: ['Thực hiện', '运行'], 9: ['Đánh giá kết quả hoạt động', '绩效评价'], 10: ['Cải tiến', '改进'] },
  ISO50001: { 4: ['Bối cảnh của tổ chức', '组织环境'], 5: ['Sự lãnh đạo', '领导作用'], 6: ['Hoạch định', '策划'], 7: ['Hỗ trợ', '支持'],
    8: ['Thực hiện', '运行'], 9: ['Đánh giá kết quả hoạt động', '绩效评价'], 10: ['Cải tiến', '改进'] }
};

var STD_CLAUSES_SEED_ = {
  // ISO 14001:2015 (TCVN ISO 14001:2015 · GB/T 24001-2016): 26 điều khoản, 16 bắt buộc lưu hồ sơ
  ISO14001: [
    ['4.1', 'Hiểu tổ chức và bối cảnh của tổ chức', '理解组织及其所处的环境', false],
    ['4.2', 'Hiểu nhu cầu và mong đợi của các bên quan tâm', '理解相关方的需求和期望', false],
    ['4.3', 'Xác định phạm vi của hệ thống quản lý môi trường', '确定环境管理体系的范围', true],
    ['4.4', 'Hệ thống quản lý môi trường', '环境管理体系', false],
    ['5.1', 'Sự lãnh đạo và cam kết', '领导作用与承诺', false],
    ['5.2', 'Chính sách môi trường', '环境方针', true],
    ['5.3', 'Vai trò, trách nhiệm và quyền hạn trong tổ chức', '组织的角色、职责和权限', false],
    ['6.1.1', 'Hành động giải quyết rủi ro và cơ hội — khái quát', '应对风险和机遇的措施——总则', true],
    ['6.1.2', 'Khía cạnh môi trường', '环境因素', true],
    ['6.1.3', 'Nghĩa vụ tuân thủ', '合规义务', true],
    ['6.1.4', 'Hoạch định hành động', '措施的策划', false],
    ['6.2', 'Mục tiêu môi trường và hoạch định để đạt được mục tiêu', '环境目标及其实现的策划', true],
    ['7.1', 'Nguồn lực', '资源', false],
    ['7.2', 'Năng lực', '能力', true],
    ['7.3', 'Nhận thức', '意识', false],
    ['7.4', 'Trao đổi thông tin', '信息交流', true],
    ['7.5', 'Thông tin dạng văn bản', '文件化信息', true],
    ['8.1', 'Hoạch định và kiểm soát việc thực hiện', '运行策划和控制', true],
    ['8.2', 'Chuẩn bị sẵn sàng và ứng phó với tình trạng khẩn cấp', '应急准备和响应', true],
    ['9.1.1', 'Theo dõi, đo lường, phân tích và đánh giá — khái quát', '监视、测量、分析和评价——总则', true],
    ['9.1.2', 'Đánh giá sự tuân thủ', '合规性评价', true],
    ['9.2', 'Đánh giá nội bộ', '内部审核', true],
    ['9.3', 'Xem xét của lãnh đạo', '管理评审', true],
    ['10.1', 'Cải tiến — khái quát', '改进——总则', false],
    ['10.2', 'Sự không phù hợp và hành động khắc phục', '不符合和纠正措施', true],
    ['10.3', 'Cải tiến liên tục', '持续改进', false]
  ],
  // ISO 45001:2018 (TCVN ISO 45001:2018 · GB/T 45001-2020): 30 điều khoản, 18 bắt buộc lưu hồ sơ
  ISO45001: [
    ['4.1', 'Hiểu tổ chức và bối cảnh của tổ chức', '理解组织及其所处的环境', false],
    ['4.2', 'Hiểu nhu cầu và mong đợi của người lao động và các bên quan tâm khác', '理解工作人员和其他相关方的需求和期望', false],
    ['4.3', 'Xác định phạm vi của hệ thống quản lý an toàn và sức khỏe nghề nghiệp', '确定职业健康安全管理体系的范围', true],
    ['4.4', 'Hệ thống quản lý an toàn và sức khỏe nghề nghiệp', '职业健康安全管理体系', false],
    ['5.1', 'Sự lãnh đạo và cam kết', '领导作用和承诺', false],
    ['5.2', 'Chính sách an toàn và sức khỏe nghề nghiệp', '职业健康安全方针', true],
    ['5.3', 'Vai trò, trách nhiệm và quyền hạn trong tổ chức', '组织的角色、职责和权限', true],
    ['5.4', 'Tham vấn và sự tham gia của người lao động', '工作人员的协商和参与', false],
    ['6.1.1', 'Hành động giải quyết rủi ro và cơ hội — khái quát', '应对风险和机遇的措施——总则', true],
    ['6.1.2', 'Nhận diện mối nguy, đánh giá rủi ro và cơ hội', '危险源辨识及风险和机遇的评价', true],
    ['6.1.3', 'Xác định yêu cầu pháp luật và các yêu cầu khác', '法律法规要求和其他要求的确定', true],
    ['6.1.4', 'Hoạch định hành động', '措施的策划', false],
    ['6.2', 'Mục tiêu an toàn và sức khỏe nghề nghiệp và hoạch định để đạt được', '职业健康安全目标及其实现的策划', true],
    ['7.1', 'Nguồn lực', '资源', false],
    ['7.2', 'Năng lực', '能力', true],
    ['7.3', 'Nhận thức', '意识', false],
    ['7.4', 'Trao đổi thông tin', '沟通', true],
    ['7.5', 'Thông tin dạng văn bản', '文件化信息', true],
    ['8.1.1', 'Hoạch định và kiểm soát việc thực hiện — khái quát', '运行策划和控制——总则', true],
    ['8.1.2', 'Loại bỏ mối nguy và giảm rủi ro an toàn và sức khỏe nghề nghiệp', '消除危险源和降低职业健康安全风险', false],
    ['8.1.3', 'Quản lý sự thay đổi', '变更管理', false],
    ['8.1.4', 'Mua sắm (nhà thầu, thuê ngoài)', '采购（承包方、外包）', false],
    ['8.2', 'Chuẩn bị sẵn sàng và ứng phó với tình huống khẩn cấp', '应急准备和响应', true],
    ['9.1.1', 'Theo dõi, đo lường, phân tích và đánh giá kết quả — khái quát', '监视、测量、分析和评价绩效——总则', true],
    ['9.1.2', 'Đánh giá sự tuân thủ', '合规性评价', true],
    ['9.2', 'Đánh giá nội bộ', '内部审核', true],
    ['9.3', 'Xem xét của lãnh đạo', '管理评审', true],
    ['10.1', 'Cải tiến — khái quát', '改进——总则', false],
    ['10.2', 'Sự cố, sự không phù hợp và hành động khắc phục', '事件、不符合和纠正措施', true],
    ['10.3', 'Cải tiến liên tục', '持续改进', true]
  ],
  // ISO 50001:2018 (TCVN ISO 50001:2019 · GB/T 23331-2020): 27 điều khoản, 16 bắt buộc lưu hồ sơ
  ISO50001: [
    ['4.1', 'Hiểu tổ chức và bối cảnh của tổ chức', '理解组织及其环境', false],
    ['4.2', 'Hiểu nhu cầu và mong đợi của các bên quan tâm', '理解相关方的需求和期望', false],
    ['4.3', 'Xác định phạm vi của hệ thống quản lý năng lượng', '确定能源管理体系的范围', true],
    ['4.4', 'Hệ thống quản lý năng lượng', '能源管理体系', false],
    ['5.1', 'Sự lãnh đạo và cam kết', '领导作用和承诺', false],
    ['5.2', 'Chính sách năng lượng', '能源方针', true],
    ['5.3', 'Vai trò, trách nhiệm và quyền hạn trong tổ chức', '组织的角色、职责和权限', false],
    ['6.1', 'Hành động giải quyết rủi ro và cơ hội', '应对风险和机遇的措施', false],
    ['6.2', 'Mục tiêu, chỉ tiêu năng lượng và hoạch định để đạt được', '目标、能源指标及其实现的策划', true],
    ['6.3', 'Xem xét năng lượng', '能源评审', true],
    ['6.4', 'Chỉ số hiệu quả năng lượng (EnPI)', '能源绩效参数', true],
    ['6.5', 'Đường cơ sở năng lượng (EnB)', '能源基准', true],
    ['6.6', 'Hoạch định thu thập dữ liệu năng lượng', '能源数据收集的策划', true],
    ['7.1', 'Nguồn lực', '资源', false],
    ['7.2', 'Năng lực', '能力', true],
    ['7.3', 'Nhận thức', '意识', false],
    ['7.4', 'Trao đổi thông tin', '信息交流', false],
    ['7.5', 'Thông tin dạng văn bản', '文件化信息', true],
    ['8.1', 'Hoạch định và kiểm soát việc thực hiện', '运行的策划和控制', true],
    ['8.2', 'Thiết kế', '设计', true],
    ['8.3', 'Mua sắm', '采购', false],
    ['9.1.1', 'Theo dõi, đo lường, phân tích và đánh giá kết quả năng lượng — khái quát', '能源绩效和能源管理体系的监视、测量、分析和评价——总则', true],
    ['9.1.2', 'Đánh giá sự tuân thủ yêu cầu pháp luật và yêu cầu khác', '合规性评价', true],
    ['9.2', 'Đánh giá nội bộ', '内部审核', true],
    ['9.3', 'Xem xét của lãnh đạo', '管理评审', true],
    ['10.1', 'Sự không phù hợp và hành động khắc phục', '不符合和纠正措施', true],
    ['10.2', 'Cải tiến liên tục', '持续改进', false]
  ]
};

/** Dòng Clauses của một chuẩn theo danh sách nạp sẵn (chưa có cột hệ thống) */
function stdSeedRows_(std) {
  var nowIso = isoVN_(now_());
  return (STD_CLAUSES_SEED_[std] || []).map(function (c, i) {
    var ch = String(c[0]).split('.')[0];
    var g = (STD_GROUPS_[std] || {})[ch] || ['', ''];
    return {
      clause_id: std + '|' + c[0], std: std, key: c[0], group_vi: ch + '. ' + g[0], group_zh: ch + '. ' + g[1],
      name_vi: c[1], name_zh: c[2], mandatory_record: c[3] === true, sort_order: i + 1, active: true,
      i18n_meta: { name: { src: 'vi', state: 'HUMAN', at: nowIso }, group: { src: 'vi', state: 'HUMAN', at: nowIso } }
    };
  });
}

/**
 * Nạp điều khoản ISO 14001 / 45001 / 50001 còn thiếu (setup, migrateSchema, xóa sạch cả danh mục): chỉ chuẩn chưa có dòng nào trong
 * Clauses (kể cả dòng đã ngừng) — chuẩn đã nhập / đã sửa thì giữ nguyên. Trả danh sách chuẩn vừa nạp.
 */
function seedStdClauses_() {
  if (!sheetExists_('Clauses')) return [];
  var have = {};
  readRows_('Clauses').forEach(function (r) { have[r.std] = true; });
  var done = [];
  var writes = [];
  Object.keys(STD_CLAUSES_SEED_).forEach(function (std) {
    if (have[std]) return;
    stdSeedRows_(std).forEach(function (r) { writes.push({ sheet: 'Clauses', mode: 'insert', row: cNewSystem_(r) }); });
    done.push(std);
  });
  if (writes.length) systemWrite_(writes);
  return done;
}
