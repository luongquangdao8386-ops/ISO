# ISO · 体系管理

App quản lý hệ thống ISO 9001 / 14001 / 45001 / 50001 + BRCGS Packaging: kiểm soát tài liệu và biểu mẫu, nộp hồ sơ, hồ sơ đúng hạn /
quá hạn, phủ điều khoản. Thay danh mục Excel DM-ISO-01 bằng hệ thống dùng chung. Google Sheets + Apps Script (máy chủ) + PWA trên
GitHub Pages (iPhone và máy tính). Cùng lõi với M&E và Checksheet (chép từ repo `CS`): PIN 6 số, phiên, ghi có xác nhận, đồng bộ,
hàng chờ khi mất mạng. Giao diện luôn song ngữ Việt · 中文.

**Trạng thái:** bản `1.0.0-d3.1` — **Đợt 3 phiên 3a** (Khắc phục, phạm vi Cơ điện). Đợt 1, Đợt 2 (2a–2e) xong code.
**Đã phát hành THẬT** ở `/ISO/` (từ 11/11/2026, không qua THỬ: máy chủ đã dựng chuyển thành THẬT bằng `adminChuyenSangTHAT`); trang
`/ISO-thu/` (repo `ISO-thu`) tạm chưa gắn máy chủ. Cập nhật máy chủ lên 3a: dán `Code.gs` → `migrateSchema` → Phiên bản mới (Hướng dẫn
triển khai, mục "CẬP NHẬT LÊN BẢN 3a").

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

### Đợt 2 phiên 2a (1.0.0-d2.1) — Kết nối M&E / Checksheet

- **Màn Kết nối** (Quản trị cấp 4; web: menu trái, iPhone: Tài khoản → Quản trị): link `/exec` + mã kết nối `FEED_KEY_ISO` của từng app,
  **Thử kết nối** (không lưu), **Lưu** (PIN — lấy bằng link mới trước, lỗi thì không lưu gì), **Ngắt kết nối** (PIN), **Cập nhật ngay**;
  lần lấy gần nhất, mã biểu lạ, biểu nhận ngày có hồ sơ và biểu in từ app chưa nhận ngày nào. Mã kết nối chỉ ở Thuộc tính tập lệnh.
- Máy chủ (`server/src/18_evidence.js`): gọi `feed.isoEvidence {key, since, client}` của M&E / Checksheet (400 ngày), gộp mã con về mã
  cha (`BM-CĐ-03-03a` → `BM-CĐ-03-03`, Đ ≡ D, hoa/thường), gom theo kỳ của biểu ISO vào sheet **`Evidence`** (`<app>|<item_id>|<kỳ>`;
  biểu hằng ngày giữ 62 ngày, tuần 126, còn lại 400), chỉ ghi dòng đổi; trigger **`syncEvidenceHourly`**; dòng bỏ quá 35 ngày xóa hẳn.
- Ô ✓ của bảng kỳ / lịch tuần / `record.status`: có hồ sơ nộp **hoặc** dòng Evidence giao với kỳ (`js/periods.js` = `17_records.js`,
  test so hai bên). Biểu nơi làm M&E / Checksheet được tính khi app đó đã nối (`Settings.evidence_sources`), kỳ trước khoảng còn giữ
  ngày không tính; chưa nối thì vẫn "in từ app, chưa nối". Hộp thoại ô ghi "Có hồ sơ trong M&E · N lượt · gần nhất …".
- Trạng thái hệ thống: dòng **Kết nối M&E**, **Kết nối Checksheet** (lần lấy được, số biểu, mã lạ; cảnh báo khi lỗi hoặc quá 3 giờ).
- Hợp đồng cho hai app kia: Hướng dẫn triển khai **Phần K** (làm trong chat M&E và chat Checksheet).

### Đợt 2 phiên 2b (1.0.0-d2.2) — Gmail nhắc hạn

- **Màn Gmail nhắc hạn** (Quản trị cấp 4; Tài khoản → Quản trị): Bật / Tắt, giờ gửi (mặc định 7:00), hạn mức Gmail còn lại hôm nay
  (dùng chung M&E, Checksheet), người nhận (email do Quản trị nhập + **xác nhận**, đổi email mất xác nhận; owner sửa được email của chính
  mình), **Gửi thử** (nội dung thật của người đó, không ghi hàng chờ), **Gửi ngay**, việc cần nhắc tính tới hôm nay, **Nhật ký gửi**
  (Gửi lại thư lỗi / chưa rõ đã gửi).
- Máy chủ (`server/src/19_mail.js`): **Hồ sơ quá hạn** → trưởng bộ phận (chưa có → Thư ký ISO), tóm tắt sáng thứ Hai; **tài liệu đến
  hạn rà soát** → người phụ trách + Thư ký ISO, mốc 30/7/0 ngày, quá hạn mỗi 7 ngày; **phiên bản chờ duyệt / chờ ban hành** quá
  `version_wait_days` (3) ngày → người duyệt / Thư ký ISO, mỗi ngày làm việc. Người chính chưa có email đã xác nhận → Thư ký ISO gửi thay.
  Hàng chờ `NotificationLogs` QUEUED → SENDING → SENT / FAILED (3 lần) / UNKNOWN (SENDING > 1 giờ, chỉ gửi lại tay) / SKIPPED; chống trùng
  `người nhận|loại|hồ sơ|mốc`; mỗi người một thư tổng hợp; dừng khi hạn mức còn ≤ `mail_quota_reserve` (10). Trigger **`sendDueMail`**
  hằng ngày lúc `email_hour`. Cột mới: `Users.email_confirmed_at/_by`, `NotificationLogs.kind/via/detail_json` (schema 1.0.4).
- Trạng thái hệ thống: dòng **Gmail nhắc hạn** (ON/OFF, số người nhận đã xác nhận, lần chạy, hạn mức còn lại, thư lỗi).

### Đợt 2 phiên 2d (1.0.0-d2.4) — Đề nghị tài liệu, phân phối & thu hồi, tem QR

- **Phiếu đề nghị ban hành / sửa đổi / hủy** (`server/src/29_docreq.js`, `js/pages/docreq.js`; thay BM-ISO-02-02 / BM-CĐ-01-08), mã
  `DN-yymm-001`: Chờ xem xét → Chấp thuận / Không chấp thuận (PIN; trưởng bộ phận với tài liệu cấp bộ phận, cấp 4 với cấp công ty, người
  gửi không tự xem xét trừ cấp 4) → soạn phiên bản theo phiếu (`version.save request_id`), tài liệu mới theo phiếu (`item.edit
  request_id`), đặt ✕ theo phiếu (`item.setNa request_id`) → ban hành / đặt ✕ thì phiếu tự **Đã thực hiện**; Thư ký đánh dấu đã thực
  hiện (ghi chú), rút lại.
- **Sổ phân phối & thu hồi** (`server/src/30_dist.js`, `js/pages/dist.js`; thay BM-ISO-02-03): phát bản in của lần đang hiệu lực cho
  nhiều nơi nhận; ban hành lần mới / đặt ✕ → dòng lần cũ **Cần thu hồi** (tính theo lần ban hành, quá `dist_recall_days` báo đỏ); thu
  hồi nhiều dòng (PIN) + phát luôn bản mới cho cùng nơi nhận; sửa / bỏ dòng ghi nhầm.
- **In tem QR** (`js/qr.js`, `js/pages/labels.js`, thư viện `vendor/qrcode-generator-1.4.4.js` MIT): tờ A4 70×37 mm (3 × 8) hoặc
  105×74 mm (2 × 4), số tem mỗi biểu, bắt đầu từ ô; ảnh PNG của mã. QR = `…/#/f/<qr_key>?r=<lần>`.
- Báo cáo mới: **Phiếu đề nghị tài liệu** (một phiếu có khối ký Người đề nghị / Người xem xét, hoặc sổ theo năm) và **Sổ phân phối &
  thu hồi**. Chờ bạn xử lý: phiếu chờ xem xét / chờ thực hiện / không được chấp thuận, bản in cần thu hồi. Trạng thái hệ thống dòng
  **Đề nghị tài liệu, phân phối**. Sheet mới `DocRequests`, `Distributions`, cột `Versions.request_id` (schema 1.0.6).

### Đợt 2 phiên 2e (1.0.0-d2.5) — Phạm vi Cơ điện, Kho tệp mẫu

- **Phạm vi áp dụng** (`Settings.scope_depts`, mặc định `CĐ`; `07_perm.js` `inScope_` trong `itemVisible_` / `deptWritable_`): biểu,
  tài liệu của bộ phận ngoài phạm vi **ẩn với mọi người kể cả Quản trị, không xóa** — đồng bộ, hồ sơ, phủ điều khoản, báo cáo, Gmail nhắc
  hạn, Trạng thái hệ thống; không thêm / chuyển biểu, phiếu đề nghị Tài liệu mới sang bộ phận ngoài phạm vi (`APP_SCOPE`); nhập Excel tổng
  bỏ qua dòng ngoài phạm vi (`SKIP`, `skip_count`). Quản trị đổi ở **Bộ phận và trưởng bộ phận → Phạm vi áp dụng** (`settings.edit`, PIN;
  mã lạ `SCOPE_DEPT`); đổi → `settings_rev` tăng → app tải lại toàn bộ. `migrateSchema` thêm cài đặt gửi xuống app cũng tăng
  `settings_rev`. Trang chủ / Danh mục ghi **Phạm vi: Cơ điện**. Nơi nhận bản in (Phân phối) vẫn là mọi bộ phận.
- **Kho tệp mẫu** (`server/src/31_tpl.js`, `js/pages/tpl.js`, `js/tplx.js`; sheet `TplFiles`, schema 1.0.7): bộ biểu Excel nhiều sheet
  (hoặc Word / PDF) trên Drive riêng tư của máy chủ. Thư ký ISO / cấp 4 tải lên nhiều tệp một lần (`tpl.upload`; app đọc tên sheet + khổ
  giấy / hướng trang từ XML, không dựng lại workbook); bộ `BM-CĐ-xx` lấy từ tên sheet / tên tệp (`BM-CD-04_…` → `BM-CĐ-04`); tệp cùng bộ
  thay tệp cũ (`REPLACED`); **Bỏ tệp** tải nhầm (`tpl.delete`, PIN, quyền kiểm trước PIN) → tệp trước dùng lại; **Sửa tên**
  (`tpl.edit`). Mọi cấp xem / tải (`doc.get` entity `TPL`); tệp đã thay: cấp 3+, Thư ký ISO. Sheet ghép với biểu theo mã như Evidence
  (`normFormCode_`, `evMatchItem_` = `normCode`, `matchSheet` của app — test so hai bên): `BM-CĐ-03-03a`, `-TD`, `-TH`, `-ML` là sheet
  phụ của biểu cha. Tệp Excel tải về **mở sẵn sheet của biểu** (`openAtSheet`: đặt `activeTab` + `tabSelected`, giữ nguyên mọi phần
  khác). Chi tiết biểu có thẻ **Tệp mẫu**; Danh mục lọc **Chưa có tệp mẫu**; Trạng thái hệ thống dòng **Kho tệp mẫu**, **Phạm vi áp dụng**.
  Bộ thật 14 tệp BM-CD-01 … 14: 151 sheet, ghép đủ 106/106 biểu cơ điện (đã thử ngoài repo, không commit tệp).

### Đợt 3 phiên 3a (1.0.0-d3.1) — Khắc phục (hướng A: phạm vi Cơ điện, phiếu theo BM-CĐ-14-02)

- **Phiếu khắc phục** `KP-yymm-001` (`server/src/32_capa.js`, `js/pages/capa.js`; sheet `Capas`, `CapaActions`, schema 1.0.8): nguồn
  phát hiện (sự cố thiết bị, kiểm tra / kiểm định, đánh giá, an toàn – môi trường – năng lượng, quy trình, khác), bộ phận chịu trách nhiệm
  (trong phạm vi áp dụng), biểu liên quan, tham chiếu, mô tả, xử lý tức thời, nguyên nhân gốc, người phụ trách, hạn. Trạng thái
  Đang xử lý → Chờ kiểm tra hiệu lực → Đã đóng (hoặc về Đang xử lý khi Không hiệu lực, lưu mọi lần kiểm tra) · Đã hủy.
- **Hành động** khắc phục / phòng ngừa: người phụ trách trong app hoặc tên người ngoài app, hạn; báo xong (ngày + kết quả), mở lại, bỏ
  (lý do). Gửi kiểm tra hiệu lực cần nguyên nhân gốc + mọi hành động xong (ít nhất một đã xong). Kiểm tra hiệu lực (PIN): Thư ký ISO,
  trưởng bộ phận; người phụ trách phiếu không tự kiểm tra (cấp 4 được khi `admin_self_approval`). Hủy phiếu (PIN): Thư ký ISO, người lập.
  Quyền kiểm ở máy chủ trước khi hỏi PIN.
- Ảnh / tệp bằng chứng (`doc.upload` entity `CAPA`, vào hàng chờ như hồ sơ); người phụ trách hành động ở bộ phận khác thấy phiếu.
- **Gmail**: `CAPA_DUE` (hành động đến hạn → người phụ trách hành động; phiếu chưa có hành động đang mở → người phụ trách phiếu) và
  `CAPA_VERIFY` (hạn kiểm tra hiệu lực → trưởng bộ phận / Thư ký ISO), mốc 7, 1, 0 ngày trước hạn, quá hạn mỗi 7 ngày.
- **Báo cáo** loại Khắc phục: một phiếu (in ký: Người phụ trách / Người kiểm tra hiệu lực) hoặc sổ theo dõi năm; mã biểu theo cài đặt
  `capa_form_code` / `capa_log_form_code` (mặc định BM-CĐ-14-02; mở rộng toàn công ty đổi sang BM-ISO-04-01 / 04-02).
- Chờ bạn xử lý: hành động của tôi ≤ 7 ngày tới hạn / quá hạn, phiếu chờ tôi kiểm tra hiệu lực, phiếu tôi phụ trách chưa có hành động
  đang mở. Chi tiết biểu có thẻ **Khắc phục**. Trạng thái hệ thống dòng **Khắc phục**.

Tiếp: 3b khiếu nại 8D, SCAR · 3c sản phẩm không phù hợp · Đợt 4 đánh giá nội bộ (4a–4c).

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
| `js/tplx.js` | Kho tệp mẫu: đọc tên sheet + khổ giấy của tệp xlsx, mở sẵn sheet khi tải về, ghép sheet ↔ biểu (giống máy chủ) |
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
- Chỉ **đọc** M&E và Checksheet (`feed.isoEvidence`, mã kết nối `FEED_KEY_ISO`); không ghi sang hai app đó.
- Biểu tượng app chỉ ở biểu tượng iPhone, màn đăng nhập và trang chủ. Logo công ty chỉ ở báo cáo PDF / Excel.
- Mã hiển thị: hồ sơ `HS-yymm-0001`, đề nghị tài liệu `DN-yymm-001`, khắc phục `KP-yymm-001`, đánh giá nội bộ `DG-yy-01`,
  báo cáo `BC-yymm-001`.
