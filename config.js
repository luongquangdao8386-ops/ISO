// Cấu hình phía app. Chỉ 4 giá trị, không có bí mật.
// Cùng một mã chạy ở hai trang; app chọn máy chủ theo thư mục của trang:
//   /ISO/     THẬT — repo ISO      → ISO_MayChu_THAT
//   /ISO-thu/ THỬ  — repo ISO-thu  → (tạm không có máy chủ THỬ)
// Link /exec để trống: màn đăng nhập cho dán link tạm (lưu trên máy) tới khi điền vào đây.
// 11/11/2026: phát hành THẬT không qua THỬ — máy chủ đã dựng (trước là THỬ) chuyển thành THẬT bằng adminChuyenSangTHAT;
// /ISO-thu/ để trống để không ai ghi nhầm vào dữ liệu thật từ trang thử.
(function () {
  var THAT = 'https://script.google.com/macros/s/AKfycbxi7LBFINUrezOuvJoh8DMqV70c9cSo3v2NhkOSxwGzKbCLT7P6s5Aa8Kg0H4w_yvYcyA/exec'; // ISO_MayChu_THAT
  var THU = ''; // ISO_MayChu_THU (dựng lại khi cần thử)
  var SITES = {
    '/ISO/': { base: 'https://luongquangdao8386-ops.github.io/ISO/', exec: THAT },
    '/ISO-thu/': { base: 'https://luongquangdao8386-ops.github.io/ISO-thu/', exec: THU }
  };
  var m = /^\/[^/]+\//.exec(location.pathname);
  var site = (m && SITES[m[0]]) || { base: '', exec: '' };
  window.ISO_CONFIG = {
    APP_BASE_URL: site.base,
    EXEC_URL: site.exec,
    API_CONTRACT_VERSION: '1.0',
    BUILD_VERSION: '1.0.0-d2.2'
  };
})();
