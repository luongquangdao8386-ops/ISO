// Cấu hình phía app. Chỉ 4 giá trị, không có bí mật.
// Cùng một mã chạy ở hai trang; app chọn máy chủ theo thư mục của trang:
//   /ISO/     THẬT — repo ISO      → ISO_MayChu_THAT (cố định link khi "phát hành ISO", phiên 1d)
//   /ISO-thu/ THỬ  — repo ISO-thu  → ISO_MayChu_THU
// Link /exec để trống: màn đăng nhập cho dán link tạm (lưu trên máy) tới khi điền vào đây.
// 07/11/2026: cố định link THỬ (/ISO-thu/ → ISO_MayChu_THU); /ISO/ để trống tới khi phát hành THẬT (phiên 1d).
(function () {
  var THAT = ''; // ISO_MayChu_THAT
  var THU = 'https://script.google.com/macros/s/AKfycbxi7LBFINUrezOuvJoh8DMqV70c9cSo3v2NhkOSxwGzKbCLT7P6s5Aa8Kg0H4w_yvYcyA/exec'; // ISO_MayChu_THU
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
    BUILD_VERSION: '1.0.0-d1.1'
  };
})();
