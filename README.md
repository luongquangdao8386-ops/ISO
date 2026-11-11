# ISO · 体系管理

App quản lý hệ thống ISO 9001 / 14001 / 45001 / 50001 + BRCGS Packaging: kiểm soát tài liệu và biểu mẫu, nộp hồ sơ, hồ sơ đúng hạn /
quá hạn, phủ điều khoản. Thay danh mục Excel DM-ISO-01 bằng hệ thống dùng chung. Google Sheets + Apps Script (máy chủ) + PWA trên
GitHub Pages (iPhone và máy tính). Cùng lõi với M&E và Checksheet (chép từ repo `CS`): PIN 6 số, phiên, ghi có xác nhận, đồng bộ,
hàng chờ khi mất mạng. Giao diện luôn song ngữ Việt · 中文.

**Trạng thái:** bản `1.0.0-d1.4` — **Đợt 1 xong code** (phiên 1d: phủ điều khoản, trang chủ đầy đủ). **Đã phát hành THẬT** ở `/ISO/`
(từ 11/11/2026, không qua THỬ: máy chủ đã dựng chuyển thành THẬT bằng `adminChuyenSangTHAT`); trang `/ISO-thu/` (repo `ISO-thu`) tạm
chưa gắn máy chủ. Cập nhật máy chủ lên 1d: dán `Code.gs` → Phiên bản mới, không cần `migrateSchema` (Hướng dẫn triển khai, mục
"CẬP NHẬT LÊN BẢN 1d"); chưa lên 1c thì làm mục "CẬP NHẬT LÊN BẢN 1c" (có `migrateSchema`) trước.

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
- **Bản sao ở tài khoản Google thứ hai** (ba app dùng chung một tài khoản): máy chủ chia sẻ chỉ xem thư mục Sao lưu + Dữ liệu;
  `apps-script/SaoLuuPhu.gs` chạy trong tài khoản thứ hai, chép hằng ngày bản sao lưu đã kiểm chứng của ISO, M&E, Checksheet
  (Hướng dẫn triển khai, Phần I).
- Nav iPhone 5 nút: Trang chủ · Danh mục · Quét · Hồ sơ · Tài khoản; web menu trái. Màn của phiên/đợt sau hiện mờ
  "Sắp có · 即将推出", máy chủ trả `FEATURE_NOT_ENABLED`.

## Phiên 1b có gì

- **Phiên bản** (sheet `Versions`): Nháp → Gửi duyệt → Duyệt / Trả lại (lý do) → Ban hành → bản cũ **Lỗi thời**; hủy bản đang soạn.
  Mỗi biểu một bản đang hiệu lực và một bản đang mở; lần ban hành do máy chủ cấp (01, 02…).
- **Quyền**: soạn — cấp 2+ trong bộ phận, Thư ký ISO; duyệt tài liệu cấp bộ phận — trưởng bộ phận hoặc cấp 4; cấp công ty (sổ tay,
  chính sách, BM-ISO, BM-BRC) — cấp 4; người soạn không tự duyệt (cấp 4 được, `admin_self_approval`); ban hành — Thư ký ISO, cấp 4.
  Duyệt, trả lại, ban hành, ✕, đã rà soát hỏi lại PIN (5 phút); quyền kiểm trước khi hỏi PIN (`PRECHECK_`).
- **Tệp**: PDF (bắt buộc) + tệp gốc xlsx/docx lưu riêng tư trên Drive của máy chủ (`doc.upload`), tải về qua máy chủ theo quyền
  (`doc.get`); máy tính mở PDF tab mới, iPhone tải về rồi Mở / Lưu.
- **Biểu ● nhập từ Excel chưa có tệp**: Thư ký ISO gắn PDF cho đúng lần đang hiệu lực, ban hành thẳng (không đổi lần, ngày ban hành).
- **Ban hành** cập nhật danh mục: lần ban hành, ngày ban hành, hạn rà soát = +`doc_review_months`; **Đã rà soát** gia hạn; **✕** kèm lý
  do (dùng lại về tình trạng cũ). Nhập lại Excel không đè lần/ngày ban hành và hạn rà soát của biểu đã ban hành trong app.
- **Chờ bạn xử lý** + số đỏ trên nút: phiên bản chờ tôi duyệt, chờ ban hành, bị trả lại, nháp; biểu ● chưa có tệp; tài liệu sắp/quá hạn
  rà soát. Màn **Phiên bản** liệt kê theo ngăn.
- Máy chủ dán `Code.gs` mới mà chưa `migrateSchema`: đăng nhập/đồng bộ vẫn chạy, trigger nền tự thêm sheet. `adminNoiLaiTep` nối lại ID
  tệp theo `file_map.json` khi khôi phục từ tài khoản thứ hai.

## Phiên 1c có gì

- **Nộp hồ sơ** (sheet `Records`, mã `HS-yymm-0001`): chọn biểu (quét tem, tìm, bấm ô của bảng kỳ hoặc nút trên chi tiết biểu), kỳ
  (gợi ý kỳ còn thiếu gần nhất / kỳ hiện tại) hoặc **khoảng ngày** (cả quyển sổ — mặc định với biểu hằng ngày/tuần), chụp nhiều trang
  (thu nhỏ ~1600 px, JPEG, bỏ GPS) hoặc chọn PDF/Excel/Word (≤ 30 tệp), ghi chú. **Làm được khi mất mạng**: `record.submit` rồi
  `doc.upload` từng tệp vào hàng chờ, có mạng tự gửi (tệp gửi với thời gian chờ 180 giây). Ghi nhận ngay, không chờ duyệt.
- Biểu nhận hồ sơ: ● và ◐ (sổ giấy đang dùng); không nhận ○, ✕, biểu in từ M&E / Checksheet (Đợt 2 lấy ngày có hồ sơ từ app kia);
  "Một phần M&E/Checksheet" vẫn nộp bổ sung.
- **Trả lại** hồ sơ nộp sai (trưởng bộ phận trong bộ phận, Thư ký ISO, cấp 4; PIN; quyền kiểm trước PIN) → kỳ đó tính lại như chưa có,
  người nộp thấy ở Chờ bạn xử lý + số đỏ trên nút Hồ sơ, bấm **Nộp lại** (điền sẵn khoảng ngày).
- **Tình trạng hồ sơ theo kỳ** (12 kỳ gần nhất): ✓ đúng hạn (có hồ sơ giao với kỳ) · ! quá hạn (kỳ kết thúc quá `record_grace_days`
  ngày mà chưa có) · – chưa tới hạn · ô gạch = không tính (biểu chưa ban hành, in từ app, kỳ trước ngày bắt đầu tính). Biểu khi phát
  sinh không bao giờ quá hạn, chỉ có lần nộp gần nhất. Ngày bắt đầu tính = `records_from` (đặt khi ban hành lần đầu trong app, không lùi
  khi ban hành lại) / `records_start_date` với biểu ● nhập từ Excel / ngày ban hành. Máy chủ tính (`record.status`, bộ đệm 5 phút theo
  phiên bản bảng) và app tính giống hệt trên máy (`js/periods.js`, dùng được khi mất mạng, có ô "chờ gửi"); test so hai bên.
- Màn **Hồ sơ**: bảng kỳ theo loại kỳ (ngày, tuần, tháng, quý, nửa năm, năm) và bộ phận, lọc "kỳ gần nhất quá hạn", "có ô quá hạn",
  "bị trả lại", tìm Việt/Trung không bật bàn phím; bấm ô → hồ sơ của kỳ, nộp cho kỳ đó. **Chi tiết hồ sơ**: ảnh xem trong app, tệp tải
  qua máy chủ, thêm ảnh/tệp, trả lại. Chi tiết biểu có thẻ **Hồ sơ 12 kỳ gần nhất**. Trang chủ: ô **Hồ sơ quá hạn** = số biểu có kỳ đến
  hạn xét gần nhất bị quá hạn. Cấp Tra cứu không xem hồ sơ.
- **Tem QR** `…/#/f/<mã>?r=<lần>`: mở chi tiết; tem khác lần đang hiệu lực báo đỏ "bản in đã lỗi thời", biểu ✕ báo đỏ, biểu chưa ban
  hành báo vàng; banner có nút Nộp hồ sơ.
- Máy chủ dán `Code.gs` 1c mà chưa `migrateSchema`: lần nộp hồ sơ đầu tiên tự thêm sheet; app chỉ hiện phần hồ sơ khi máy chủ đã có
  `record.submit`.

## Phiên 1d có gì

- Màn **Phủ điều khoản** (cấp 2+ trong bộ phận + tài liệu chung, Thư ký ISO / cấp 4 toàn công ty): hai thẻ **ISO 9001** và **BRCGS**,
  mỗi điều khoản / chủ đề: số biểu, đã ban hành (●), in từ app (M&E, Checksheet), trạng thái (Thiếu biểu – bắt buộc · Chưa có biểu ·
  Có biểu, chưa ban hành · Đã có), nhóm theo nhóm điều khoản; lọc trạng thái, bộ phận (không ô gõ — không bật bàn phím trên iPhone);
  bấm một dòng → danh sách biểu → mở chi tiết hoặc **Danh mục đã lọc** theo điều khoản (`/catalog?iso=7.5.3`, `?brc=<khóa>`).
  Đếm **giống hệt** hai trang Phủ của file Excel tổng (`js/coverage.js`): ISO 9001 — mã ở cột G bắt đầu bằng điều khoản (9.2 gồm
  9.2.2); BRCGS — cột K chứa khóa chủ đề, không phân biệt hoa thường. Test tính lại công thức COUNTIF của file xuất; đã đối chiếu
  thêm bằng LibreOffice (221 biểu giả, 72 dòng phủ, 0 lệch). Cột "Biểu liên quan" khi xuất Excel dùng chung hàm này.
- **Trang chủ đầy đủ**: ô **Chờ bạn xử lý** thêm biểu quá hạn hồ sơ mà bạn nộp được, thao tác gửi không được, tài liệu bạn phụ trách
  sắp/quá hạn rà soát; ô số "Điều khoản bắt buộc thiếu biểu" mở Phủ điều khoản đã lọc; **lịch tuần hồ sơ đến hạn** (‹ › đổi tuần):
  biểu hằng ngày 7 ô Thứ Hai … Chủ nhật, kỳ tuần/tháng/quý/năm hiện ở ngày kết thúc kỳ, kỳ tuần trước còn hạn nộp hiện ở ngày hạn chót;
  bấm ô / dòng → hồ sơ của kỳ hoặc Nộp hồ sơ kỳ này. Ô lưới Phủ điều khoản hết "Sắp có".
- Trạng thái hệ thống có dòng **Phủ điều khoản** (số điều khoản có biểu, bắt buộc chưa có biểu, chủ đề BRCGS có biểu).

Sau Đợt 1: Đợt 2 kết nối M&E/Checksheet, Gmail, báo cáo PDF, in tem · Đợt 3 khắc phục · Đợt 4 đánh giá nội bộ.

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `index.html`, `config.js`, `sw.js`, `manifest.webmanifest`, `css/`, `js/` | App tĩnh (GitHub Pages, phạm vi `/ISO/`, trang thử `/ISO-thu/`) |
| `js/catalog-xlsx.js` | Khuôn file Excel tổng: xuất (5 sheet + `_meta`, công thức) và đọc tệp nhập |
| `js/xlsx.js` | SheetJS nạp theo nhu cầu; định dạng sau khi ghi (nền, viền, cố định ô, danh sách chọn, tô màu) |
| `assets/` | Biểu tượng app (tờ tài liệu + dấu tick, navy trên vàng — SVG và PNG 180/192/512), ảnh nền |
| `vendor/` | jsQR 1.4.0 (quét QR), SheetJS 0.20.3 (Excel) |
| `server/src/` | Mã máy chủ theo mô-đun (`11_catalog.js` danh mục, `14_import.js` nhập Excel tổng, `16_versions.js` phiên bản, `17_records.js` hồ sơ) |
| `js/periods.js` | Kỳ hồ sơ và tình trạng ✓ ! – (giống hệt máy chủ, Node chạy thẳng được trong test); lịch tuần trang chủ |
| `js/coverage.js` | Phủ điều khoản ISO 9001 / BRCGS, đếm giống hệt hai trang Phủ của file Excel tổng |
| `apps-script/` | `Code.gs` (tạo bằng `npm run build`) và `appsscript.json` để dán vào Apps Script; `SaoLuuPhu.gs` cho tài khoản thứ hai |
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
