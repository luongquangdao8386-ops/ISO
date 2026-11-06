# ISO · 体系管理

App quản lý hệ thống ISO 9001 / 14001 / 45001 / 50001 + BRCGS Packaging: kiểm soát tài liệu và biểu mẫu, nộp hồ sơ, hồ sơ đúng hạn /
quá hạn, phủ điều khoản. Thay danh mục Excel DM-ISO-01 bằng hệ thống dùng chung. Google Sheets + Apps Script (máy chủ) + PWA trên
GitHub Pages (iPhone và máy tính). Cùng lõi với M&E và Checksheet (chép từ repo `CS`): PIN 6 số, phiên, ghi có xác nhận, đồng bộ,
hàng chờ khi mất mạng. Giao diện luôn song ngữ Việt · 中文.

**Trạng thái:** bản `1.0.0-d1.1` — Đợt 1, phiên 1a (lõi + danh mục). Trang thử `/ISO-thu/` (repo `ISO-thu`); trang THẬT `/ISO/`
phát hành ở phiên 1d.

## Phiên 1a có gì

- **Đăng nhập** mã nhân viên + PIN 6 số, mở khóa ngoại tuyến bằng PIN, đổi PIN, phiên, đăng xuất mọi thiết bị.
- **Người dùng**: 4 cấp (Tra cứu · Nhân viên · Trưởng bộ phận · Quản trị), **phạm vi bộ phận** (cấp 1–3 chỉ thấy và ghi trong bộ
  phận mình, tài liệu chung của Ban ISO ai cũng xem), cờ **Thư ký ISO** và **Đánh giá viên**. Quyền kiểm ở máy chủ trước khi hỏi PIN.
- **Bộ phận** (10 bộ phận mặc định) và trưởng bộ phận.
- **Danh mục** biểu mẫu & tài liệu: lọc bộ phận, nhóm, loại, nơi làm, tình trạng ○ ◐ ● ✕, ưu tiên; tìm theo mã, tên Việt (không dấu
  cũng được) hoặc Trung — trên iPhone lọc không bật bàn phím. **Chi tiết biểu** (phần thông tin); Thư ký ISO thêm / sửa thông tin.
- **Excel**: tải mẫu, xuất danh mục, nhập lô **file Excel tổng** (xem trước → ghi ≤ 100 dòng/lượt, người ghi khác người nhập trừ
  Quản trị), xuất → sửa → nhập lại báo "Không đổi".
- **Quản trị**: người dùng, bộ phận, cài đặt (chu kỳ rà soát 12 tháng, cho phép trễ 3 ngày…), logo trên báo cáo, sao lưu hằng tuần,
  nhật ký thao tác, trạng thái hệ thống, dữ liệu mẫu (THỬ).
- Nav iPhone 5 nút: Trang chủ · Danh mục · Quét · Hồ sơ · Tài khoản; web menu trái. Màn của phiên/đợt sau hiện mờ
  "Sắp có · 即将推出", máy chủ trả `FEATURE_NOT_ENABLED`.

Phiên sau: **1b** phiên bản & ban hành · **1c** hồ sơ (nộp, bảng kỳ ✓ ! –, tem QR) · **1d** phủ điều khoản, trang chủ đầy đủ,
phát hành THẬT. Đợt 2 kết nối M&E/Checksheet, Gmail, báo cáo PDF, in tem · Đợt 3 khắc phục · Đợt 4 đánh giá nội bộ.

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `index.html`, `config.js`, `sw.js`, `manifest.webmanifest`, `css/`, `js/` | App tĩnh (GitHub Pages, phạm vi `/ISO/`, trang thử `/ISO-thu/`) |
| `js/catalog-xlsx.js` | Khuôn file Excel tổng: xuất (5 sheet + `_meta`, công thức) và đọc tệp nhập |
| `js/xlsx.js` | SheetJS nạp theo nhu cầu; định dạng sau khi ghi (nền, viền, cố định ô, danh sách chọn, tô màu) |
| `assets/` | Biểu tượng app (tờ tài liệu + dấu tick, navy trên vàng — SVG và PNG 180/192/512), ảnh nền |
| `vendor/` | jsQR 1.4.0 (quét QR), SheetJS 0.20.3 (Excel) |
| `server/src/` | Mã máy chủ theo mô-đun (`11_catalog.js` danh mục, `14_import.js` nhập Excel tổng) |
| `apps-script/` | `Code.gs` (tạo bằng `npm run build`) và `appsscript.json` để dán vào Apps Script |
| `i18n/labels.json` | Từ điển nhãn duy nhất [Việt, 中文] → `js/dict.js` và `LABELS` trong `Code.gs` |
| `tests/` | Giả lập Apps Script cho Node, test máy chủ, test giao diện Playwright |
| `tools/` | Ghép `Code.gs`, quét bí mật trước khi push |

## Lệnh

```
npm run build        # ghép server/src → apps-script/Code.gs, sinh js/dict.js, kiểm phiên bản khớp 4 nơi, sw.js đủ tệp
npm test             # test máy chủ + đủ nhãn song ngữ
npm run test:ui      # test giao diện 390×844 và 1440×900 (cần Playwright)
npm run check        # build + test + quét bí mật
```

Triển khai: xem `HUONG_DAN_TRIEN_KHAI.md`.

## Quy ước

- Repo public: không commit đặc tả, **danh mục thật / file Excel tổng** (`*.xlsx` bị chặn), ID bảng tính, link `/exec` (trừ
  `config.js`), PIN, khóa bí mật, logo công ty. Bí mật nằm trong Thuộc tính tập lệnh của Apps Script. Test dùng dữ liệu giả.
- Mọi tên lưu trữ trình duyệt có tiền tố `iso` (IndexedDB `iso_data`, `iso_auth`, Cache `iso-shell-*`, localStorage `iso.*`; trang
  THỬ `iso_thu`) — chung origin `github.io` với M&E (`me*`) và Checksheet (`cs*`) mà không đụng nhau.
- Chỉ **đọc** M&E và Checksheet (Đợt 2, qua mã kết nối); không ghi sang hai app đó.
- Biểu tượng app chỉ ở biểu tượng iPhone, màn đăng nhập và trang chủ. Logo công ty chỉ ở báo cáo PDF / Excel.
- Mã hiển thị: hồ sơ `HS-yymm-0001`, đề nghị tài liệu `DN-yymm-001`, khắc phục `KP-yymm-001`, đánh giá nội bộ `DG-yy-01`,
  báo cáo `BC-yymm-001`.
