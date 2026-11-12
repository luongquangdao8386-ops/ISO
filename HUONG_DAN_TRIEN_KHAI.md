# Hướng dẫn triển khai app ISO · 体系管理 — bản 1.0.0-d3.3 (Đợt 3, phiên 3b — Khiếu nại 8D, SCAR; Ảnh nền)

App ISO là app thứ ba cùng nền với M&E và Checksheet: máy chủ riêng (dự án Apps Script riêng, bảng tính riêng), người dùng và PIN
riêng. Ba app dùng **chung một tài khoản Google** (đã chốt 06/11/2026). Cách làm giống hệt M&E, Checksheet: dán `Code.gs` vào Apps Script, triển khai web app, mở trang app
trên GitHub Pages.

Phiên 1a có: đăng nhập PIN, người dùng (bộ phận, Thư ký ISO, Đánh giá viên), bộ phận, danh mục biểu mẫu & tài liệu (lọc, tìm Việt/Trung,
chi tiết biểu), nhập/xuất file Excel tổng, quản trị. Phiên 1b thêm: **phiên bản & ban hành** (soạn → gửi duyệt → duyệt / trả lại →
ban hành, bản cũ tự lỗi thời, PDF + tệp gốc lưu riêng tư trên Drive của máy chủ), **gắn tệp** cho biểu ● nhập từ Excel, đặt **Không áp
dụng ✕**, **Đã rà soát** (gia hạn rà soát), ô **Chờ bạn xử lý** và số đỏ trên nút. Phiên 1c thêm: **hồ sơ** — nộp hồ sơ bằng ảnh / tệp
(cả khi mất mạng), bảng kỳ ✓ ! –, trả lại hồ sơ nộp sai, tem QR báo bản in lỗi thời. Phiên 1d thêm: **Phủ điều khoản** ISO 9001 và
BRCGS (đếm giống hệt file Excel tổng), trang chủ đầy đủ (**lịch tuần hồ sơ đến hạn**, Chờ bạn xử lý thêm hồ sơ quá hạn cần nộp).
Phiên 2a thêm: **Kết nối M&E / Checksheet** — mỗi giờ app ISO hỏi hai app kia "mã biểu nào có hồ sơ vào ngày nào" (chỉ đọc), biểu in
từ app có ô ✓ mà không ai phải nộp lại. Phiên 2b thêm: **Gmail nhắc hạn** — hồ sơ quá hạn (tóm tắt sáng thứ Hai), tài liệu đến hạn rà
soát, phiên bản chờ duyệt / chờ ban hành quá 3 ngày; email người nhận do Quản trị nhập và xác nhận. Phiên 2c thêm: **Báo cáo** —
Danh mục tài liệu hiện hành (thay BM-ISO-02-01), Tình trạng hồ sơ theo bộ phận và kỳ, Phủ điều khoản ISO 9001 và BRCGS, Lịch sử phiên
bản; PDF A4 ngang có logo công ty + Excel, số báo cáo `BC-yymm-001`, khối Người lập / Người duyệt. Phiên 2d thêm: **Phiếu đề nghị
ban hành / sửa đổi / hủy tài liệu** (`DN-yymm-001`, thay BM-ISO-02-02 / BM-CĐ-01-08) — gửi phiếu → trưởng bộ phận / Quản trị xem xét
(PIN) → soạn phiên bản theo phiếu → ban hành thì phiếu tự thành Đã thực hiện; **Sổ phân phối & thu hồi bản in** (thay BM-ISO-02-03) —
ban hành lần mới thì bản in lần cũ thành "Cần thu hồi", thu hồi (PIN) và phát luôn bản mới; **In tem QR** 70×37 / 105×74 mm trên tờ
A4 + ảnh PNG của mã; 2 báo cáo mới (Phiếu đề nghị, Sổ phân phối & thu hồi). Khắc phục, Đánh giá nội bộ (Đợt 3–4) vẫn mờ "Sắp có · 即将推出".
Phiên 2e (12/11/2026, anh yêu cầu "chỉ phạm vi cơ điện + Kho tệp mẫu") thêm: **Phạm vi áp dụng** — app chỉ quản lý biểu, tài liệu
của bộ phận **Cơ điện** (mặc định): 115 biểu của bộ phận khác **ẩn với mọi người, không bị xóa** (chọn lại bộ phận là hiện lại), nhập
Excel tổng bỏ qua dòng ngoài phạm vi; **Kho tệp mẫu** — bộ biểu Excel đã căn chỉnh in (14 tệp BM-CD-01 … BM-CD-14, 151 sheet), mọi
người tải về in; tệp tải về **mở sẵn đúng sheet của biểu** (Ctrl+P → In sheet hiện tại).
Phiên 3a (hướng A — giữ phạm vi Cơ điện, anh chốt 12/11/2026) thêm: **Khắc phục** — phiếu khắc phục `KP-yymm-001` (thay sổ / phiếu
khắc phục cơ điện **BM-CĐ-14-02**): lập phiếu (nguồn phát hiện, mô tả, xử lý tức thời, biểu liên quan, người phụ trách, hạn) →
ghi **nguyên nhân gốc** → **hành động** khắc phục / phòng ngừa (người phụ trách trong app hoặc tên người ngoài app, hạn) → báo xong
từng hành động (kết quả, ảnh / tệp bằng chứng) → **Gửi kiểm tra hiệu lực** → **Kiểm tra hiệu lực** (PIN): Có hiệu lực thì đóng phiếu,
Không hiệu lực thì thêm hành động bổ sung rồi kiểm tra lại; **Gmail** nhắc người phụ trách hành động 7, 1, 0 ngày trước hạn (quá hạn
mỗi 7 ngày) và người kiểm tra trước hạn kiểm tra hiệu lực; báo cáo **Phiếu khắc phục** (in ký) và **Sổ theo dõi khắc phục** (cả năm),
PDF + Excel. Đánh giá nội bộ (Đợt 4) vẫn mờ "Sắp có · 即将推出".
Phiên 3b (anh chốt 12/11/2026 **giữ phạm vi Cơ điện**) thêm hai loại phiếu khắc phục có đối tác bên ngoài, cùng số `KP-yymm-001`, cùng
luồng: **Khiếu nại khách hàng (8D)** — tiếp nhận (khách hàng, sản phẩm, lô, số lượng, mức độ, nhóm 8D) → D3 ngăn chặn tạm thời → D4
nguyên nhân gốc + nguyên nhân lọt → D5–D7 hành động khắc phục / phòng ngừa → **Ghi phản hồi khách hàng** → kiểm tra hiệu lực → đóng (D8);
khiếu nại **không có cơ sở** thì không cần hành động, chỉ ghi kết luận + phản hồi rồi xác nhận đóng. **SCAR nhà cung cấp / nhà thầu** —
lập SCAR → ngày gửi → **Ghi trả lời của nhà cung cấp** → nguyên nhân, hành động (giao nhà cung cấp) → kiểm tra hiệu lực → đóng. Chưa ghi
phản hồi / trả lời thì **không đóng được** (báo ngay, chưa hỏi PIN). Hạn phản hồi mặc định 7 ngày, quá hạn thì phiếu báo Quá hạn và Gmail
nhắc người phụ trách 7, 1, 0 ngày trước hạn. In: **Phiếu tiếp nhận khiếu nại** (BM-KD-02-01), **Báo cáo 8D** (BM-KD-02-02), **Phiếu
SCAR** (BM-MH-01-06, 3 ô ký: người lập · đại diện nhà cung cấp · người kiểm tra hiệu lực), Sổ theo dõi khiếu nại / SCAR. Phiếu vẫn
thuộc bộ phận Cơ điện (khiếu nại do lỗi thiết bị; SCAR gửi nhà cung cấp vật tư, nhà thầu thuê ngoài); biểu KD, MH vẫn ẩn — mã biểu in
trên phiếu sửa được ở **Cấu hình** (`complaint_form_code`, `d8_form_code`, `scar_form_code`).

Bản 3.3 (12/11/2026, anh yêu cầu) thêm **Ảnh nền**: Quản trị tự thay ảnh nền **màn đăng nhập** (cả màn chờ lúc mở app) và **trang chủ**
trong app, hoặc bấm **Dùng ảnh mặc định** để quay lại ảnh cũ. Ảnh lưu riêng tư trên Drive của máy chủ ISO (không đưa lên repo công khai).

## CẬP NHẬT LÊN BẢN 3.3 (1.0.0-d3.3, Ảnh nền) — làm một lần, trên máy tính

Bản này **gồm luôn bản 3b**. Không hỏi quyền Google mới, không cần `installTriggers`.

**Anh phải làm:**
1. <https://script.google.com> → dự án `ISO_MayChu_THAT` → tệp `Code.gs` → Ctrl+A → xóa → mở link
   `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO/main/apps-script/Code.gs` → Ctrl+A → Ctrl+C → dán vào → **Lưu**.
2. Chọn hàm **`migrateSchema`** → **Chạy** (chạy lại vẫn an toàn). Nhật ký:
   - đã lên 3b rồi: `migrateSchema xong. Thêm: không có. schema_version=1.0.9`;
   - chưa lên 3b: dòng `Thêm: Capas(party_name,…,reply_by)` như mục 3b bên dưới.
3. **Triển khai → Quản lý các bản triển khai** → bút chì → **Phiên bản mới** → Mô tả `d3.3 anh nen` → **Triển khai**.
4. Đóng hẳn app `/ISO/` rồi mở lại → **Tài khoản → Thông tin** ghi `1.0.0-d3.3`.
5. Thay ảnh: **Tài khoản → Quản trị → Ảnh nền đăng nhập, trang chủ** → ô **Màn đăng nhập** (hoặc **Trang chủ**) → **Chọn ảnh** → chọn
   ảnh trong máy (iPhone: Thư viện ảnh hoặc chụp) → xem trước → **Dùng ảnh này** → nhập PIN. Muốn quay lại ảnh cũ: **Dùng ảnh mặc định**.

**Nên kiểm (vài phút):**
1. **Trạng thái hệ thống** có dòng **Ảnh nền đăng nhập, trang chủ** = `Đăng nhập: ảnh riêng · Trang chủ: …` sau khi thay → máy chủ thật
   đã lên đúng bản và ảnh đã lưu.
2. Trên iPhone thật: mở app (đã đăng nhập) → kéo làm mới hoặc đợi đồng bộ → trang chủ hiện ảnh mới → **Đăng xuất** → màn đăng nhập ảnh
   mới → tắt hẳn app rồi mở lại → vẫn ảnh mới ngay từ đầu.

**Đã thử trên giả lập — anh không cần làm:** `tests/ui/bg.test.mjs` (iPhone 390×844): Quản trị thay ảnh màn đăng nhập rồi trang chủ (thu
nhỏ, xem trước, PIN chỉ hỏi một lần) → trang chủ đổi ngay → đăng xuất: màn đăng nhập ảnh mới → mở lại trang: ảnh mới ngay, không tải ảnh
mặc định → máy thứ hai: lần đầu ảnh mặc định, đăng nhập xong nhận ảnh mới → Dùng ảnh mặc định → máy thứ hai về ảnh mặc định ở lần đồng bộ
sau; nhân viên không có mục Ảnh nền. Máy chủ `tests/server/bg.test.mjs` (2 test): chỉ Quản trị + PIN, kiểm loại / cỡ tệp (≤ 2 MB), cùng
ảnh không tạo tệp mới, ảnh cũ vào thùng rác, nhật ký, Trạng thái hệ thống, máy chủ chưa có dòng cài đặt. Cả bộ: 86 test máy chủ + 37 test
giao diện đạt.

Lưu ý: máy chưa đăng nhập lần nào (máy mới, hoặc đã xóa dữ liệu trang) thấy ảnh mặc định ở màn đăng nhập cho tới lần đăng nhập đầu. Biểu
tượng app trên màn hình chính iPhone và ô vuông vàng cạnh chữ ISO không đổi trong app (cần Claude thay tệp).

## CẬP NHẬT LÊN BẢN 3b (1.0.0-d3.2) — làm một lần, trên máy tính

Bản 3b **thêm 17 cột vào sheet `Capas` và 4 cài đặt** (`complaint_form_code` = BM-KD-02-01, `d8_form_code` = BM-KD-02-02,
`scar_form_code` = BM-MH-01-06, `capa_reply_days` = 7) → phải chạy `migrateSchema`. **Không** hỏi quyền Google mới, **không** cần
`installTriggers` (nhắc phản hồi đi chung trigger Gmail `sendDueMail` đã có). App 3b vẫn chạy với máy chủ 3a (chỉ không có nút
Tiếp nhận khiếu nại / Lập SCAR).

**Anh phải làm:**
1. <https://script.google.com> → dự án `ISO_MayChu_THAT` → tệp `Code.gs` → Ctrl+A → xóa → mở link
   `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO/main/apps-script/Code.gs` → Ctrl+A → Ctrl+C → dán vào → **Lưu**.
2. Chọn hàm **`migrateSchema`** → **Chạy**. Nhật ký:
   `migrateSchema xong. Thêm: Capas(party_name,party_contact,product_text,lot_text,qty_text,severity,complaint_valid,team_text,escape_vi,escape_zh,sent_date,reply_due,reply_date,reply_note_vi,reply_note_zh,reply_at,reply_by). schema_version=1.0.9`.
3. **Triển khai → Quản lý các bản triển khai** → bút chì → Phiên bản: **Phiên bản mới** → Mô tả `d3.2 khieu nai scar` → **Triển khai**.
   Link `/exec` giữ nguyên.
4. Mở app `/ISO/` (đang mở thì đóng hẳn rồi mở lại; app tự tải lại dữ liệu vì có cài đặt mới) → **Tài khoản → Thông tin** ghi
   `1.0.0-d3.2` (màn báo lỗi thì bấm **Tải lại bản mới**).

**Nên kiểm (vài phút — phần máy giả lập không kiểm được):**
1. **Tài khoản → Quản trị → Trạng thái hệ thống**: `schema_version` = **1.0.9**; dòng **Khắc phục** có thêm đuôi
   `· khiếu nại đang mở 0 · SCAR đang mở 0 · quá hạn phản hồi 0` → máy chủ thật đã lên đúng bản.
2. PDF thật của Google Docs với 3 ô ký: **Khắc phục → Lập SCAR** → Tên nhà cung cấp `NCC thử`, Mô tả `Phiếu thử` → **Lập phiếu** → cuối
   màn phiếu **In phiếu SCAR** → **Tải PDF** → **Mở / lưu tệp** → xem chữ Việt / Trung, logo, mã BM-MH-01-06, hàng ký có **3 ô**
   (Người lập SCAR · Đại diện nhà cung cấp · Người kiểm tra hiệu lực) → quay lại phiếu → **Hủy phiếu** → Lý do `Phiếu thử` → **Đúng** →
   nhập PIN. (Phiếu thử chiếm một số KP; phiếu thật lấy số kế tiếp.)

**Đã thử trên giả lập — anh không cần làm:** `tests/ui/complaint.test.mjs` (3 test, iPhone 390×844 và máy tính 1440×900): Tiếp nhận
khiếu nại (thiếu tên khách báo lỗi tại ô) → khách hàng, sản phẩm, lô, số lượng, mức độ Nặng, Có cơ sở, nhóm 8D → KP-2611-001 → nguyên
nhân + nguyên nhân lọt → hành động khắc phục + phòng ngừa → báo xong → gửi kiểm tra → bấm Có hiệu lực khi chưa phản hồi: báo "Chưa ghi
phản hồi khách hàng", **không hỏi PIN** → Ghi phản hồi khách hàng → Có hiệu lực (PIN) → Đã đóng → In báo cáo 8D (PDF BC-2611-001), Phiếu
tiếp nhận, Sổ theo dõi khiếu nại → lọc Khiếu nại / SCAR ở sổ khắc phục → Trạng thái hệ thống; nhân viên CĐ đổi phiếu sang SCAR (chữ đã gõ
giữ nguyên) → ngày gửi → trả lời nhà cung cấp → hành động giao nhà cung cấp → trưởng BP kiểm tra hiệu lực (PIN) → In SCAR 3 ô ký (xem
trước + Excel); app 3b với máy chủ 3a. Máy chủ `tests/server/complaint.test.mjs` (6 test): kiểm dữ liệu, hạn phản hồi mặc định, khiếu nại
không có cơ sở, SCAR trả lời trước ngày gửi bị chặn, không đóng khi chưa phản hồi, bỏ / ghi lại phản hồi, quá hạn phản hồi, Gmail
`CAPA_REPLY` mốc 7 / 1 / 0 ngày + quá hạn mỗi 7 ngày, 4 mẫu in + sổ theo loại + tên tệp, đổi mã biểu, cập nhật từ 3a (thiếu cột → tự
thêm; dòng nhật ký `migrateSchema` ở bước 2). Cả bộ: 84 test máy chủ + 36 test giao diện đạt.

Không kiểm được ở đâu cả trước khi dùng thật: thư Gmail thật "Khiếu nại / SCAR đến hạn phản hồi" (chỉ khi còn ≤ 7 ngày tới hạn phản hồi
và người phụ trách có email đã xác nhận), chụp ảnh bằng camera iPhone thật.

### Dùng khiếu nại 8D, SCAR

- **Khắc phục** có 3 nút: **Lập phiếu khắc phục** (nội bộ), **Tiếp nhận khiếu nại**, **Lập SCAR**; trong phiếu đổi loại ở hàng
  **Loại phiếu**. Hàng lọc **Tất cả · Khắc phục nội bộ · Khiếu nại khách hàng · SCAR nhà cung cấp** ở đầu sổ.
- Khiếu nại: điền ngay khi khách báo (tên khách bắt buộc); nguyên nhân, hành động ghi sau. Gửi khách báo cáo 8D thì bấm **Ghi phản hồi
  khách hàng** (ngày + nội dung). Kết luận **Không có cơ sở**: ghi kết luận ở Nguyên nhân, ghi phản hồi, **Gửi kiểm tra hiệu lực** →
  người kiểm tra bấm Có hiệu lực để đóng.
- SCAR: gửi nhà cung cấp xong ghi **Ngày gửi SCAR**; nhà cung cấp trả lời thì **Ghi trả lời của nhà cung cấp**, chép nguyên nhân vào
  Nguyên nhân gốc, hành động họ cam kết vào Hành động (Người thực hiện ngoài app = tên nhà cung cấp). Kiểm tra hiệu lực bằng các lô giao
  sau. In **Phiếu SCAR** gửi nhà cung cấp ký ở ô giữa.
- Mã biểu in trên phiếu: **Tài khoản → Quản trị → Cấu hình** → `complaint_form_code`, `d8_form_code`, `scar_form_code` (vd đổi sang mã
  biểu cơ điện nếu anh lập biểu riêng); `capa_reply_days` = số ngày hạn phản hồi mặc định.

## CẬP NHẬT LÊN BẢN 3a (1.0.0-d3.1) — đã xong (anh xác nhận 12/11/2026)

Bản 3a **thêm 2 sheet `Capas`, `CapaActions` và 3 cài đặt** (`capa_form_code`, `capa_log_form_code` = BM-CĐ-14-02, `capa_verify_days`
= 30) → phải chạy `migrateSchema`. **Không** hỏi quyền Google mới, **không** cần `installTriggers` (nhắc khắc phục đi chung trigger Gmail
`sendDueMail` đã có). App 3a vẫn chạy với máy chủ cũ (ô Khắc phục ẩn, màn Khắc phục báo "Máy chủ chưa lên bản 3a").

1. <https://script.google.com> → dự án `ISO_MayChu_THAT` → tệp `Code.gs` → Ctrl+A → xóa → mở link
   `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO/main/apps-script/Code.gs` → Ctrl+A → Ctrl+C → dán vào → **Lưu**.
2. Chọn hàm **`migrateSchema`** → **Chạy**. Nhật ký: `migrateSchema xong. Thêm: Capas; CapaActions. schema_version=1.0.8`.
   (Chưa cập nhật bản 2e thì dòng nhật ký có thêm `TplFiles`; chưa lên 2d thì thêm `Versions(request_id); DocRequests; Distributions`.)
3. **Triển khai → Quản lý các bản triển khai** → bút chì → Phiên bản: **Phiên bản mới** → Mô tả `d3.1 khac phuc` → **Triển khai**.
   Link `/exec` giữ nguyên.
4. Mở app `/ISO/` (đang mở thì đóng hẳn rồi mở lại) → **Tài khoản → Thông tin** ghi `1.0.0-d3.1` (màn báo lỗi thì bấm **Tải lại bản
   mới**). **Tài khoản → Quản trị → Trạng thái hệ thống**:
   - `schema_version` = **1.0.8**;
   - dòng mới **Khắc phục** = `Đang xử lý 0 · chờ kiểm tra hiệu lực 0 · đã đóng 0 · hành động quá hạn 0 · quá hạn kiểm tra hiệu lực 0`.

### Sau khi cập nhật bản 3a

**Nên kiểm (vài phút — phần máy giả lập không kiểm được):**
1. **Tài khoản → Quản trị → Trạng thái hệ thống**: `schema_version` = **1.0.8** và có dòng **Khắc phục** (bước 4 ở trên) → máy chủ thật
   đã lên đúng bản.
2. PDF thật của Google Docs: **Khắc phục → Lập phiếu khắc phục** → nhập Mô tả `Phiếu thử` → **Lập phiếu** → cuối màn phiếu **In phiếu
   khắc phục (PDF / Excel)** → **Tải PDF** → **Mở / lưu tệp** → xem chữ Việt / Trung, logo công ty, mã biểu BM-CĐ-14-02 hiện đúng →
   quay lại phiếu → **Hủy phiếu** → Lý do `Phiếu thử` → **Đúng** → nhập PIN. (Phiếu thử chiếm số KP-2611-001; phiếu thật bắt đầu từ 002.)

**Đã thử trên giả lập — anh không cần làm:** toàn bộ luồng trên iPhone 390×844 và máy tính 1440×900 (`tests/ui/capa.test.mjs`, 3 test):
lập phiếu → nguyên nhân gốc → 2 hành động (một người ngoài app) → báo xong → thêm ảnh → gửi kiểm tra hiệu lực → Không hiệu lực (PIN)
→ hành động bổ sung → Có hiệu lực → Đã đóng; nhân viên bộ phận khác được giao hành động thấy ở Chờ bạn xử lý; người phụ trách phiếu
không tự kiểm tra; In phiếu, Sổ theo dõi; Hủy phiếu (PIN); Trạng thái hệ thống; app mới với máy chủ cũ. Máy chủ (`tests/server/capa.test.mjs`,
5 test): quyền, phạm vi Cơ điện, mã KP, Gmail mốc 7 / 1 / 0 ngày và quá hạn mỗi 7 ngày, báo cáo, quên `migrateSchema`.

Không kiểm được ở đâu cả trước khi dùng thật: thư Gmail thật (chỉ khi có hành động còn ≤ 7 ngày tới hạn và người phụ trách có email
đã xác nhận), chụp ảnh bằng camera iPhone thật.

Dùng thật: khi có sự cố / phát hiện cần khắc phục — lập phiếu ngay (có thể ghi nguyên nhân, hành động sau); người phụ trách hành động
có tài khoản app thì thấy ở **Chờ bạn xử lý** khi còn ≤ 7 ngày tới hạn và nhận Gmail (nếu đã có email xác nhận); người không dùng app
thì ghi tên ở ô Người thực hiện, người phụ trách phiếu báo xong thay.

## CẬP NHẬT LÊN BẢN 2e (1.0.0-d2.5) — làm một lần, trên máy tính

Bản 2e **thêm sheet `TplFiles` và cài đặt `scope_depts` (= CĐ)** → phải chạy `migrateSchema`. **Không** hỏi quyền Google mới,
**không** cần `installTriggers`. App 2e vẫn chạy với máy chủ 2d (Kho tệp mẫu báo "Máy chủ chưa lên bản có Kho tệp mẫu", danh mục vẫn
đủ 221 biểu cho tới khi dán Code.gs mới).

1. <https://script.google.com> → dự án `ISO_MayChu_THAT` → tệp `Code.gs` → Ctrl+A → xóa → mở link
   `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO/main/apps-script/Code.gs` → Ctrl+A → Ctrl+C → dán vào → **Lưu**.
2. Chọn hàm **`migrateSchema`** → **Chạy**. Nhật ký: `migrateSchema xong. Thêm: TplFiles. schema_version=1.0.7`.
   (Chưa cập nhật bản 2d thì dòng nhật ký có thêm `Versions(request_id); DocRequests; Distributions`.)
3. **Triển khai → Quản lý các bản triển khai** → bút chì → Phiên bản: **Phiên bản mới** → Mô tả `d2.5 pham vi co dien kho tep mau` →
   **Triển khai**. Link `/exec` giữ nguyên.
4. Mở app `/ISO/` (đang mở thì đóng hẳn rồi mở lại) → **Tài khoản → Thông tin** ghi `1.0.0-d2.5` (màn báo lỗi thì bấm **Tải lại bản
   mới**). App tự tải lại dữ liệu một lần (máy chủ báo cài đặt đổi). **Tài khoản → Quản trị → Trạng thái hệ thống**:
   - `schema_version` = **1.0.7**;
   - dòng mới **Phạm vi áp dụng** = `CĐ` · `106 biểu trong phạm vi · 115 biểu ngoài phạm vi (ẩn, không xóa)`;
   - **Biểu trong danh mục** = `106`;
   - dòng mới **Kho tệp mẫu** = `0 tệp · 0 sheet · 0/106 biểu trong phạm vi có tệp mẫu` · `Chưa có tệp mẫu — Kho tệp mẫu → Tải tệp mẫu lên`.

### Thử bản 2e (Thư ký ISO hoặc owner, trên máy tính)

Chuẩn bị: giải nén `ISO1.rar` ra một thư mục (Windows 11: chuột phải → **Extract all / Giải nén tất cả**, hoặc 7-Zip) — có 14 tệp
`BM-CD-01_….xlsx` … `BM-CD-14_….xlsx` (+ tệp danh mục và `HUONG_DAN_IN.txt`, không cần tải lên).

1. **Trang chủ**: dưới tên anh có dải vàng **Phạm vi: Cơ điện · 范围：机电**; ô **Danh mục** ghi **106 biểu**.
2. Ô **Kho tệp mẫu** (máy tính: menu trái **Kho tệp mẫu**) → "Chưa có tệp mẫu…" → **Tải tệp mẫu lên**.
3. **Chọn tệp (chọn được nhiều tệp)** → mở thư mục vừa giải nén → bấm tệp `BM-CD-01_…`, giữ **Shift** bấm tệp `BM-CD-14_…` (chọn đủ 14
   tệp) → **Open**. Danh sách xem trước 14 dòng: mỗi dòng **BM-CĐ-01 … BM-CĐ-14**, dung lượng, số sheet, số biểu (vd BM-CĐ-04 ·
   11 sheet · 7 biểu).
4. **Tải lên 14 tệp** → chờ từng dòng thành **Đã tải lên** (khoảng 1–2 phút) → **Kho tệp mẫu ›**. Dòng tóm tắt:
   **14 tệp · 151 sheet · 106/106 biểu có tệp mẫu**. Mỗi bộ một thẻ: mã bộ, tên nhóm, tên tệp, **Tải cả tệp**, **Các sheet** (mỗi sheet:
   mã, khổ giấy A4 / A3 dọc / ngang, tên biểu, nút **Tải**).
5. Ô tìm: gõ `04-02` → dòng **BM-CĐ-04-02 · A4 dọc · Báo cáo sửa chữa…** → bấm tên biểu → chi tiết biểu, thẻ **Tệp mẫu** → **Tải tệp
   mẫu** → tệp `BM-CD-04_Sua-chua-su-co-phan-tich-nguyen-nhan.xlsx` tải xuống → mở bằng Excel: **đang đứng ở sheet BM-CĐ-04-02** →
   Ctrl+P → **In sheet hiện tại** (Print Active Sheets), khay **A4**.
6. **Danh mục** → **Bộ lọc** → ô **Khác**: **Chưa có tệp mẫu** → **0 biểu**.
7. **Trạng thái hệ thống**: dòng **Kho tệp mẫu** = `14 tệp · 151 sheet · 106/106 biểu trong phạm vi có tệp mẫu`.
8. iPhone: **Tài khoản → Kho tệp mẫu** (hoặc ô Kho tệp mẫu ở Trang chủ) → mở một biểu → **Tải tệp mẫu** → "Đã tải xong — chạm Mở / Lưu"
   → chạm lần nữa → bảng Chia sẻ → **Lưu vào Tệp** hoặc mở bằng Excel.

### Dùng Phạm vi áp dụng, Kho tệp mẫu

- **Phạm vi áp dụng** (Quản trị cấp 4): **Tài khoản → Quản trị → Bộ phận và trưởng bộ phận** → thẻ **Phạm vi áp dụng** → tích bộ phận
  → **Lưu phạm vi** → xác nhận → PIN. Bỏ tích hết = toàn công ty (hiện lại đủ 221 biểu). Ngoài phạm vi: ẩn ở Danh mục, Hồ sơ, Phủ điều
  khoản, Báo cáo, Gmail nhắc hạn, Trạng thái hệ thống; không thêm được biểu / phiếu đề nghị mới cho bộ phận đó; nhập Excel tổng thì dòng
  của bộ phận đó ghi **Ngoài phạm vi (bỏ qua)**. Phủ điều khoản lúc này chỉ đếm biểu cơ điện. Nơi nhận bản in (Phân phối) vẫn chọn được
  mọi bộ phận.
- **Kho tệp mẫu**: ai đăng nhập cũng xem và tải (kể cả Tra cứu cấp 1). Thư ký ISO / Quản trị **tải lên**, **Sửa tên**, **Bỏ tệp** (tải
  nhầm — PIN; tệp cũ mà nó đã thay tự dùng lại). Tải lên lại tệp cùng bộ (vd sửa BM-CD-04 rồi tải lên) → tệp mới thay tệp cũ; tệp cũ nằm ở
  mục **Tệp đã thay bằng tệp mới** (Trưởng bộ phận, Thư ký ISO, Quản trị tải lại được). Nhận cả Word / PDF (không có sheet; bộ lấy từ
  tên tệp kiểu `BM-CD-12_…`). Tối đa 10 MB mỗi tệp trên máy tính, 5 MB trên điện thoại.
- Sheet ghép với biểu theo **mã ở tên sheet**: `BM-CĐ-03-03a`, `BM-CĐ-04-03-TH`, `-TD`, `-ML` là **sheet phụ** của biểu cha
  (BM-CĐ-03-03, BM-CĐ-04-03); sheet **Mục lục** ghi "Không phải biểu trong danh mục". Đổi tên sheet trong Excel thì tải lên lại.
- Kho tệp mẫu là **mẫu trống để in**; còn bản ban hành chính thức (PDF + tệp gốc, lần 01, 02…) vẫn đi theo **Phiên bản** (soạn → duyệt →
  ban hành) như trước.

## CẬP NHẬT LÊN BẢN 2d (1.0.0-d2.4) — làm một lần, trên máy tính

Bản 2d **thêm sheet `DocRequests`, `Distributions` và cột `Versions.request_id`** → phải chạy `migrateSchema`. **Không** hỏi quyền
Google mới, **không** cần `installTriggers`. App 2d vẫn chạy với máy chủ 2c (chưa có thẻ Phiếu đề nghị / Bản in đang phát; In tem QR
vẫn dùng được vì tem dựng ngay trên máy).

1. <https://script.google.com> → dự án `ISO_MayChu_THAT` → tệp `Code.gs` → Ctrl+A → xóa → mở link
   `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO/main/apps-script/Code.gs` → Ctrl+A → Ctrl+C → dán vào → **Lưu**.
2. Chọn hàm **`migrateSchema`** → **Chạy**. Nhật ký:
   `migrateSchema xong. Thêm: Versions(request_id); DocRequests; Distributions. schema_version=1.0.6`.
   (Nếu chưa cập nhật bản 2c thì dòng nhật ký có thêm `ReportRuns` và Google hỏi quyền Google Docs → **Cho phép**.)
3. **Triển khai → Quản lý các bản triển khai** → bút chì → Phiên bản: **Phiên bản mới** → Mô tả `d2.4 de nghi phan phoi tem` →
   **Triển khai**. Link `/exec` giữ nguyên.
4. Mở app `/ISO/` → **Tài khoản → Thông tin** ghi `1.0.0-d2.4` (màn báo lỗi thì bấm **Tải lại bản mới**). **Tài khoản → Quản trị →
   Trạng thái hệ thống**: `schema_version` = **1.0.6**; dòng mới **Đề nghị tài liệu, phân phối** = `Phiếu đề nghị: chờ xem xét 0 · đã
   chấp thuận chưa thực hiện 0 · đã thực hiện 0 · Bản in đang phát 0 nơi (0 bản) · cần thu hồi 0`, ĐẠT.

### Thử phiên 2d (Thư ký ISO hoặc owner, danh mục đang toàn ○ ◐)

Cần một biểu ◐ mà anh đã có bản PDF (vd một biểu trong bộ 15 file BM-CĐ) — các bước dưới **ban hành thật** biểu đó (lần 01).

1. Trang chủ → ô **Đề nghị tài liệu** (máy tính: menu trái) → **Đề nghị mới**.
2. Loại **Sửa đổi / ban hành** (chọn sẵn) → ô **Bộ phận**: chọn bộ phận của biểu (vd `CĐ · Cơ điện`) → ô **Tình trạng biểu**: **Đang
   soạn** → bấm ô **Tài liệu, biểu mẫu (N biểu)** → chọn biểu đó (dòng dưới hiện mã + "Đang soạn") → **Lý do đề nghị** (vd "Ban hành
   biểu đang dùng") → **Nội dung cần sửa đổi / ban hành** → **Gửi phiếu** → phiếu **DN-2611-001 · Chờ xem xét** (bỏ trống Lý do thì ô
   báo đỏ, không gửi). Cách khác: **Danh mục** → mở biểu → thẻ **Phiếu đề nghị** → **Đề nghị sửa đổi** (biểu được chọn sẵn).
   Không thấy ô Đề nghị tài liệu ở Trang chủ / thẻ Phiếu đề nghị ở chi tiết biểu = máy chủ chưa lên 2d (làm lại phần Cập nhật).
3. **Chấp thuận** → ô ý kiến (bỏ trống được) → **Xác nhận** → nhập **PIN** → phiếu **Đã chấp thuận**, dòng "Việc tiếp theo: soạn phiên
   bản theo phiếu…".
4. **Soạn phiên bản theo phiếu** → ô **Soạn theo phiếu đề nghị** chọn sẵn DN-2611-001, **Tóm tắt thay đổi** điền sẵn từ phiếu → chọn
   **PDF** (+ tệp gốc nếu có) → **Lưu và gửi duyệt** → **Duyệt** → **Xác nhận** → **Ban hành** → **Xác nhận** (hỏi PIN thì nhập) →
   biểu thành ● lần 01. Mở lại phiếu (**Đề nghị tài liệu → Tất cả**): **Đã thực hiện** · "Ban hành lần 01".
5. Chi tiết biểu đó → thẻ **Bản in đang phát** → **Phát bản in** → **Nơi nhận** (chọn sẵn bộ phận của biểu) → **Người / vị trí nhận**
   (vd "Phòng cơ điện – kệ biểu mẫu") → **Số bản** → (**Thêm nơi nhận** nếu phát nhiều nơi) → **Ghi phát** → màn **Phân phối & thu
   hồi**, thẻ **Đang dùng**.
6. Chi tiết biểu → **Tem QR** → biểu đã chọn sẵn → cỡ **70 × 37 mm** → **Xem trước tờ đầu** → **In tem** (máy tính, Chrome: khổ A4,
   Lề **Không**, Tỷ lệ **Mặc định**, bỏ tích Đầu trang/chân trang; in thử giấy thường, đặt lên tờ tem soi đèn cho khớp rồi mới in tem
   thật) → **Tải ảnh PNG mã QR** → tệp `QR_<mã biểu>_lan01.png` (chèn vào đầu biểu Excel / Word).
7. iPhone → nút **Quét** → quét tem vừa in → mở chi tiết biểu, dải xanh **Đang hiệu lực: lần 01**.
8. **Báo cáo** → **Phiếu đề nghị tài liệu** → **Phiếu**: chọn DN-2611-001 → **Xem báo cáo** → **Tải PDF** (phiếu BM-ISO-02-02 có khối
   ký **Người đề nghị / Người xem xét**). **Sổ phân phối & thu hồi** → **Xem báo cáo** → **Tải PDF / Excel** (BM-ISO-02-03).
9. **Trạng thái hệ thống**: dòng **Đề nghị tài liệu, phân phối** = `… đã thực hiện 1 · Bản in đang phát N nơi (M bản) · cần thu hồi 0`.

### Dùng phiếu đề nghị, sổ phân phối, tem QR

- **Ai làm gì:** gửi phiếu — Nhân viên (cấp 2) trở lên, Thư ký ISO (nhập thay người không đăng nhập: ô **Người đề nghị**); đề nghị
  sửa / hủy được mọi tài liệu mình xem được, đề nghị **Tài liệu mới** chỉ trong bộ phận mình. Xem xét — trưởng bộ phận (tài liệu cấp bộ
  phận) hoặc Quản trị (cấp 4; tài liệu cấp công ty BM-ISO, BM-BRC, sổ tay, chính sách chỉ cấp 4); người gửi không tự xem xét (Quản trị
  được). Phát, thu hồi, sửa sổ phân phối — Thư ký ISO, Quản trị.
- **Phiếu Tài liệu mới:** chấp thuận xong → **Thêm vào danh mục theo phiếu** (form điền sẵn mã, tên, bộ phận) → **Lưu** → **Soạn
  phiên bản theo phiếu** lần 01. **Phiếu Hủy:** chấp thuận xong → **Đặt Không áp dụng (✕) theo phiếu** (PIN) → phiếu Đã thực hiện.
  Việc làm ngoài app: Thư ký bấm **Đã thực hiện (ghi chú)**. Rút lại: người gửi khi phiếu còn Chờ xem xét; Thư ký khi đã chấp thuận.
- **Ban hành lần mới** (hoặc đặt ✕): mọi bản in lần cũ đang phát thành **Cần thu hồi** (hộp xác nhận Ban hành báo trước số nơi). Trang
  chủ của Thư ký có dòng "N nơi giữ bản in lần cũ cần thu hồi" (đỏ khi quá `dist_recall_days` = 7 ngày). **Phân phối & thu hồi** →
  thẻ **Cần thu hồi** → tích các dòng (hoặc **Chọn tất cả**) → **Thu hồi** → ngày, ghi chú, **Phát luôn bản lần đang hiệu lực cho đúng
  các nơi này** (tích sẵn) → PIN. Bấm một dòng để xem, **Sửa dòng** hoặc **Bỏ dòng này (ghi nhầm)**.
- **Tem QR** (menu **In tem QR** hoặc chi tiết biểu → **Tem QR**): chọn nhiều biểu ●, **Số tem mỗi biểu**, **Bắt đầu từ ô số** (tờ tem
  đã dùng dở) → **In tem**. Tem ghi mã, tên Việt / Trung, lần ban hành, không có logo. Ban hành lần mới → in tem mới; tem lần cũ quét ra
  dải đỏ **Bản in này đã lỗi thời**. Camera iPhone mở link tem bằng Safari ngoài app — quét bằng nút **Quét** của app.


## CẬP NHẬT LÊN BẢN 2c (1.0.0-d2.3) — làm một lần, trên máy tính

Bản 2c **thêm sheet `ReportRuns`** (báo cáo đã lưu) và **dựng PDF bằng Google Docs** — Google hỏi thêm quyền "Xem, chỉnh sửa, tạo và
xóa tất cả tài liệu Google Docs của bạn" (máy chủ tạo một tài liệu Docs tạm, đổi sang PDF rồi bỏ vào thùng rác). Làm **đúng thứ tự** như
2a, 2b: chạy hàm và cấp quyền (bước 2) **trước** Phiên bản mới (bước 3). Không cần `installTriggers` (không thêm trigger). App 2c vẫn
chạy với máy chủ 2b (màn Báo cáo báo "Máy chủ chưa lên bản có Báo cáo").

1. <https://script.google.com> → dự án `ISO_MayChu_THAT` → tệp `Code.gs` → Ctrl+A → xóa → mở link
   `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO/main/apps-script/Code.gs` → Ctrl+A → Ctrl+C → dán vào → **Lưu**.
2. Chọn hàm **`migrateSchema`** → **Chạy**. Google hỏi quyền: **Xem lại quyền** → chọn tài khoản Google của máy chủ → **Nâng cao** →
   **Đi tới ISO_MayChu_THAT (không an toàn)** → **Cho phép** (quyền mới: tài liệu Google Docs). Nhật ký:
   `migrateSchema xong. Thêm: ReportRuns. schema_version=1.0.5`.
3. **Triển khai → Quản lý các bản triển khai** → bút chì → Phiên bản: **Phiên bản mới** → Mô tả `d2.3 bao cao` → **Triển khai**.
   Link `/exec` giữ nguyên.
4. Mở app `/ISO/` trên máy tính → **Tài khoản → Thông tin** ghi `1.0.0-d2.3` (màn báo lỗi thì bấm **Tải lại bản mới**).
   **Tài khoản → Quản trị → Trạng thái hệ thống**: `schema_version` = **1.0.5**; dòng mới **Báo cáo đã lưu** = `Đã lưu 0 báo cáo`, ĐẠT
   (chưa có logo thì có dòng nhắc "Chưa có logo công ty trên báo cáo").
5. Logo (nếu chưa có): **Tài khoản → Quản trị → Logo trên báo cáo** → chọn ảnh PNG / JPG → **Lưu** (PIN).

### Thử Báo cáo

1. Trang chủ → ô **Báo cáo** (hết "Sắp có"); máy tính: menu trái **Báo cáo**.
2. **Danh mục tài liệu** → **Phạm vi**: chọn **Tất cả tình trạng** (danh mục hiện toàn ○ ◐, để "Đang hiệu lực (●)" thì bảng trống
   "Không có dòng nào" — đúng) → **Xem báo cáo** → bản xem trước giống trang PDF: logo, tiêu đề hai dòng, Biểu mẫu BM-ISO-02-01, ô số,
   bảng theo bộ phận, khối **Người lập / Người duyệt**. Số báo cáo ghi "Cấp khi tải PDF / Excel".
3. **Tải PDF** → chờ (máy chủ dựng PDF, tới khoảng 1 phút) → hộp **Đã có PDF BC-2611-001** → **Mở / lưu tệp** (máy tính mở tab mới;
   iPhone mở bảng Chia sẻ → **Lưu vào Tệp**). PDF khổ A4 ngang, logo đầu trang, chân trang có số báo cáo.
4. **Tải Excel** (cùng bộ lọc) → **Đã có Excel BC-2611-001** (cùng số, cùng số liệu) → **Mở / lưu tệp**. Excel có logo ở A1, in ra A4
   ngang vừa một trang ngang; ngày là ô ngày thật, số là ô số.
5. **Báo cáo đã lưu** (cuối màn; máy tính ở cột trái): có `BC-2611-001` → tải lại **PDF / Excel** đúng như lúc lập (không cấp số mới,
   số liệu là bản chụp lúc lập — sửa danh mục sau đó không làm đổi báo cáo đã lưu).
6. **Tình trạng hồ sơ** → **Kỳ: Theo quý** (hoặc Theo tháng), **Đến kỳ**, **Số cột** → **Xem báo cáo**: bảng tổng hợp theo bộ phận +
   mỗi bộ phận một bảng biểu × tháng/quý (✓ có hồ sơ · ! quá hạn · – chưa tới hạn · a/b với biểu ngày, tuần · số lần nộp với biểu khi phát
   sinh). Hiện chỉ có biểu nhận ✓ từ M&E / Checksheet; biểu ○ ◐ ghi ở dòng "Không tính".
7. **Phủ điều khoản** → **Chuẩn: ISO 9001 và BRCGS** → **Xem báo cáo**: số biểu theo điều khoản khớp màn Phủ điều khoản (và file Excel
   tổng), cột **Mã biểu** liệt kê biểu của từng điều khoản (bỏ tích "Kèm mã biểu" để bảng gọn).
8. **Lịch sử phiên bản** → chọn tài liệu → **Xem báo cáo**; hoặc mở chi tiết một biểu → thẻ Phiên bản → **Báo cáo lịch sử phiên bản**.

- Mỗi lần tải với **bộ lọc mới** là một báo cáo mới, số kế tiếp (`BC-2611-002`…; sang tháng sau đánh lại `BC-2612-001`). Đổi bộ lọc rồi
  quay lại bộ lọc cũ cũng thành báo cáo mới.
- Ai xem được: Danh mục tài liệu, Lịch sử phiên bản — mọi cấp; Tình trạng hồ sơ, Phủ điều khoản — Nhân viên (cấp 2) trở lên và Thư ký
  ISO; cấp 1–3 chỉ có biểu trong bộ phận mình + tài liệu chung. Báo cáo đã lưu: người lập thấy của mình; Thư ký ISO, Quản trị thấy tất cả.
- Báo cáo do máy chủ tính: **cần mạng**. PDF / Excel lưu trong thư mục dữ liệu `ISO_Data` của máy chủ (riêng tư), tải qua app.

## CẬP NHẬT LÊN BẢN 2b (1.0.0-d2.2) — làm một lần, trên máy tính

Bản 2b **thêm cột** (Users: email đã xác nhận; NotificationLogs: loại nhắc) và **gửi Gmail** — Google hỏi thêm quyền "Gửi email thay mặt
bạn". Làm **đúng thứ tự** như 2a: chạy hàm và cấp quyền (bước 2–3) **trước** Phiên bản mới (bước 4). App 2b vẫn chạy với máy chủ 2a
(mục **Gmail nhắc hạn** chỉ hiện khi máy chủ đã lên 2b).

1. <https://script.google.com> → dự án `ISO_MayChu_THAT` → tệp `Code.gs` → Ctrl+A → xóa → mở link
   `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO/main/apps-script/Code.gs` → Ctrl+A → Ctrl+C → dán vào → **Lưu**.
2. Chọn hàm **`migrateSchema`** → **Chạy**. Google hỏi quyền: **Xem lại quyền** → chọn tài khoản Google của máy chủ → **Nâng cao** →
   **Đi tới ISO_MayChu_THAT (không an toàn)** → **Cho phép** (quyền mới: "Gửi email thay mặt bạn"). Nhật ký:
   `migrateSchema xong. Thêm: NotificationLogs(kind,via,detail_json); Users(email_confirmed_at,email_confirmed_by). schema_version=1.0.4`.
3. Chọn hàm **`installTriggers`** → **Chạy** → Nhật ký: `Đã cài trigger: syncEvidenceHourly, runBackgroundJobs, backupData, sendDueMail`.
4. **Triển khai → Quản lý các bản triển khai** → bút chì → Phiên bản: **Phiên bản mới** → Mô tả `d2.2 gmail nhac han` → **Triển khai**.
   Link `/exec` giữ nguyên.
5. Mở app `/ISO/` trên máy tính → **Tài khoản → Thông tin** ghi `1.0.0-d2.2` (màn báo lỗi thì bấm **Tải lại bản mới**).
   **Tài khoản → Quản trị → Trạng thái hệ thống**: `schema_version` = **1.0.4**; **Trigger đã cài** có `sendDueMail`; dòng mới
   **Gmail nhắc hạn** = **OFF**.

### Bật Gmail nhắc hạn

1. **Tài khoản → Quản trị → Gmail nhắc hạn**.
2. Thẻ **Người nhận** → thẻ của **Thư ký ISO** → **Nhập / sửa email** → gõ email của thư ký → ô "Tôi (Quản trị) xác nhận đây đúng là
   email của người này" để nguyên dấu tích → **Lưu** → nhập PIN → thẻ ghi **Đã xác nhận**.
3. (Không bắt buộc) Thẻ của **owner** → nhập email owner → **Lưu**. Owner nhận nhắc **duyệt** phiên bản do Thư ký ISO soạn; owner
   không có email thì thư đó gửi Thư ký ISO thay ("Gửi thay cho …").
4. Thẻ của Thư ký ISO → **Gửi thử** → **Gửi thử** → báo xanh "Đã gửi thư thử tới …". Mở hộp thư của thư ký (xem cả **Spam** /
   **Quảng cáo**): tiêu đề `[ISO] Gửi thử · 测试 — Nhắc hạn hồ sơ, tài liệu ISO · ISO记录与文件到期提醒 — dd/mm/yyyy`, tên người gửi
   **ISO · 体系管理** (địa chỉ gửi là tài khoản Google của máy chủ). Danh mục hiện toàn ○ ◐ nên thư ghi "Hiện không có việc nào cần nhắc
   bạn" là **đúng**. Thư vào Spam → bấm **Không phải thư rác**.
5. Thẻ trên cùng → **Bật Gmail** → thẻ ghi **Đang bật**. Giờ gửi mặc định **7:00**; muốn đổi → **Đổi giờ gửi**.
6. **Trạng thái hệ thống**: dòng **Gmail nhắc hạn** = `ON · 1 người nhận đã xác nhận`, ĐẠT.

### Dùng Gmail nhắc hạn

| Nhắc | Gửi ai | Khi nào |
| --- | --- | --- |
| Hồ sơ quá hạn | Trưởng bộ phận (bộ phận chưa có trưởng → Thư ký ISO) | Tóm tắt sáng thứ Hai; tuần sau còn quá hạn thì nhắc lại |
| Tài liệu đến hạn rà soát | Người phụ trách tài liệu + Thư ký ISO | 30, 7, 0 ngày trước hạn; quá hạn nhắc mỗi 7 ngày |
| Phiên bản chờ duyệt / chờ ban hành quá 3 ngày | Người duyệt (trưởng bộ phận hoặc Quản trị) / Thư ký ISO | Mỗi ngày làm việc (Thứ Hai – Thứ Sáu) tới khi xử lý |

- Mỗi người một thư tổng hợp mỗi ngày lúc giờ gửi, **chỉ khi có việc**. Cùng một mốc không gửi lại; bấm **Gửi ngay** cũng không gửi trùng.
- App hiện chỉ có owner + Thư ký ISO, chưa có trưởng bộ phận → gần như mọi thư tới **Thư ký ISO**. Có trưởng bộ phận (Quản trị → Bộ phận
  → trưởng bộ phận) thì nhập + xác nhận email người đó ở màn Gmail; tóm tắt hồ sơ quá hạn của bộ phận đó chuyển sang trưởng bộ phận.
- Người nhận chính chưa có email đã xác nhận → thư gửi **Thư ký ISO thay**, có dòng "Gửi thay cho …". Đổi email (ở đây hoặc ở màn Người
  dùng) thì phải **Xác nhận** lại.
- **Việc cần nhắc tính tới hôm nay**: xem trước ai sẽ nhận gì (Sẽ gửi / Đã gửi / Gửi sáng thứ Hai). Bấm dòng để mở biểu / phiên bản.
- **Hạn mức Gmail** dùng chung với M&E và Checksheet (cùng tài khoản Google, khoảng 100 người nhận mỗi ngày). ISO tạm dừng gửi khi còn
  10 trở xuống (đổi ở Cấu hình: `mail_quota_reserve`), thư còn lại gửi lần sau. Số còn lại hiện ở màn Gmail và Trạng thái hệ thống.
- **Nhật ký gửi**: thư lỗi tự thử lại tối đa 3 lần; "Chưa rõ đã gửi" (máy chủ dừng giữa chừng) không tự gửi lại — xem hộp thư người nhận,
  chưa có thì bấm **Gửi lại**.
- Thư thật bắt đầu có khi danh mục có biểu **●** (ban hành): hồ sơ quá hạn, hạn rà soát trong 30 ngày; và khi có phiên bản chờ quá 3 ngày.
- Tắt: **Tắt Gmail** (app vẫn hiện việc ở Chờ bạn xử lý trên trang chủ).

## CẬP NHẬT LÊN BẢN 2a (1.0.0-d2.1) — làm một lần, trên máy tính

Bản 2a **thêm sheet `Evidence`** và **gọi ra ngoài** (link `/exec` của M&E, Checksheet) — Google sẽ hỏi thêm một quyền. Làm **đúng
thứ tự**: chạy hàm và cấp quyền (bước 2–3) **trước** khi triển khai Phiên bản mới (bước 4), nếu không app ISO báo lỗi cho tới khi cấp
quyền. App 2a vẫn chạy với máy chủ cũ (màn Kết nối báo "Máy chủ ISO chưa lên bản 2a").

1. <https://script.google.com> → dự án `ISO_MayChu_THAT` → tệp `Code.gs` → Ctrl+A → xóa → mở link
   `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO/main/apps-script/Code.gs` → Ctrl+A → Ctrl+C → dán vào → **Lưu**.
2. Chọn hàm **`migrateSchema`** (ô chọn hàm cạnh nút Gỡ lỗi) → **Chạy**. Lần chạy đầu Google hỏi quyền: **Xem lại quyền** → chọn tài
   khoản Google của máy chủ → **Nâng cao** → **Đi tới ISO_MayChu_THAT (không an toàn)** → **Cho phép** (quyền mới: "Kết nối với dịch
   vụ bên ngoài"). Nhật ký: `migrateSchema xong. Thêm: Evidence. schema_version=1.0.3`.
3. Chọn hàm **`installTriggers`** → **Chạy** (đã cho phép ở bước 2 thì không hỏi lại) → Nhật ký:
   `Đã cài trigger: syncEvidenceHourly, runBackgroundJobs, backupData`.
4. **Triển khai → Quản lý các bản triển khai** → bút chì → Phiên bản: **Phiên bản mới** → Mô tả `d2.1 ket noi ME CS` → **Triển khai**.
   Link `/exec` giữ nguyên.
5. Mở app `/ISO/` trên máy tính → **Tài khoản → Thông tin** ghi `1.0.0-d2.1` (màn báo lỗi thì bấm **Tải lại bản mới**).
   **Tài khoản → Quản trị → Trạng thái hệ thống**: `schema_version` = **1.0.3**; **Trigger đã cài** có `syncEvidenceHourly`; hai dòng mới
   **Kết nối M&E (ngày có hồ sơ)** và **Kết nối Checksheet (ngày có hồ sơ)** = **OFF**.
6. Thử ngay (M&E, Checksheet chưa có cửa đọc cho ISO): **Tài khoản → Quản trị → Kết nối M&E / Checksheet** → thẻ **App M&E** → dán link
   `/exec` M&E đang dùng → ô **Mã kết nối** gõ tạm 24 chữ `a` → **Thử kết nối** → báo đỏ "App kia từ chối: sai mã kết nối, hoặc app kia
   chưa có cửa đọc cho ISO (feed.isoEvidence)" là **đúng** lúc này. **Không bấm Lưu.**
7. Nối thật sau khi M&E / Checksheet đã lên bản có `feed.isoEvidence` (Phần K, làm trong chat của từng app): xem mục "Nối M&E /
   Checksheet" ngay dưới.

### Nối M&E / Checksheet (sau khi app đó có `feed.isoEvidence`)

1. Ở app kia (M&E hoặc Checksheet): <https://script.google.com> → dự án máy chủ THẬT của app đó → chọn hàm **`adminCreateFeedKeyIso`** →
   **Chạy** → **Nhật ký thực thi** có dòng "Mã kết nối cho app ISO: …" → chép mã (không gửi mã qua chat).
2. App ISO trên máy tính: **Tài khoản → Quản trị → Kết nối M&E / Checksheet** → thẻ của app đó → dán **Link /exec** (link đang dùng của
   app đó) và **Mã kết nối** → **Thử kết nối** → khung xanh "Kết nối được: N dòng ngày, ghép được M biểu" (và danh sách mã biểu không có
   trong danh mục ISO, nếu có) → **Lưu** → nhập PIN → thẻ chuyển **Đã nối**, lấy ngay ngày có hồ sơ.
3. Kiểm: **Hồ sơ** (bảng kỳ) có các biểu nơi làm M&E / Checksheet đã ban hành ●; ô ✓ bấm vào ghi "Có hồ sơ trong M&E · N lượt · gần
   nhất …". Ô ! của biểu in từ app ghi "kiểm phiếu trong M&E, không nộp ở đây". **Trạng thái hệ thống** dòng **Kết nối M&E** = ĐẠT.
4. Cuối thẻ Kết nối: **Biểu nhận ngày có hồ sơ từ app** và **biểu in từ app chưa nhận ngày nào** (thường do mã biểu bên app kia — mẫu
   checksheet, checklist bảo trì — khác mã trong danh mục ISO: sửa mã bên app kia cho khớp).

### Dùng Kết nối

- Mỗi giờ (trigger `syncEvidenceHourly`) và khi bấm **Cập nhật ngay**: app ISO lấy 400 ngày gần nhất, gom theo kỳ của từng biểu (ngày,
  tuần, tháng, quý, nửa năm, năm, khi phát sinh), chỉ ghi dòng đổi vào sheet `Evidence`. Biểu hằng ngày giữ 62 ngày, hằng tuần 126 ngày,
  còn lại 400 ngày; kỳ cũ hơn của biểu in từ app không tính (không báo quá hạn).
- Mã con tự gộp về mã cha khi danh mục ISO không có mã con: `BM-CĐ-03-03a` → `BM-CĐ-03-03`, `BM-CĐ-07-06-KT` → `BM-CĐ-07-06`. Chữ
  hoa/thường và `Đ`/`D` coi như nhau.
- Biểu nơi làm **M&E / Checksheet** chỉ tính đúng hạn / quá hạn khi app đó **đã nối**; chưa nối thì vẫn "in từ app, chưa nối". Biểu
  **Một phần M&E / Checksheet**, **Đề xuất Checksheet** vẫn nộp tay được; ngày từ app kia cộng thêm ô ✓.
- Biểu chưa ban hành (○ ◐) vẫn hiện ô ✓ nếu app kia có hồ sơ, nhưng không tính quá hạn.
- Lỗi mạng một lần: dữ liệu cũ giữ nguyên, **Trạng thái hệ thống** báo dòng Kết nối = CẢNH BÁO; quá 3 giờ chưa lấy được cũng báo.
- **Ngắt kết nối** (PIN): xóa link + mã, bỏ ngày từ app đó, biểu nơi làm app đó về "chưa nối". Nối lại được bất cứ lúc nào.
- App ISO **không ghi gì** sang M&E / Checksheet. Mã kết nối lưu trong Thuộc tính tập lệnh của máy chủ ISO, không hiện lại trong app.

## CẬP NHẬT LÊN BẢN 1d (1.0.0-d1.4) — làm một lần, trên máy tính

Bản 1d **không thêm sheet hay cột** — không cần `migrateSchema`. App 1d vẫn chạy với máy chủ 1c; `Code.gs` mới chỉ thêm dòng **Phủ điều
khoản** ở Trạng thái hệ thống. **Chưa lên bản 1c** (Trạng thái hệ thống không có dòng **Hồ sơ**) → làm mục "CẬP NHẬT LÊN BẢN 1c" ngay
dưới (có `migrateSchema`) thay cho các bước này — `Code.gs` ở link đó đã là bản 1d.

1. <https://script.google.com> → dự án `ISO_MayChu_THAT` → tệp `Code.gs` → Ctrl+A → xóa → mở link
   `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO/main/apps-script/Code.gs` → Ctrl+A → Ctrl+C → dán vào → **Lưu**.
2. **Triển khai → Quản lý các bản triển khai** → bút chì → Phiên bản: **Phiên bản mới** → Mô tả `d1.4 phủ điều khoản` → **Triển khai**.
   Link `/exec` giữ nguyên.
3. Mở app `/ISO/` trên máy tính và iPhone → app tự tải bản mới (**Tài khoản → Thông tin** ghi `1.0.0-d1.4`; màn báo lỗi thì bấm
   **Tải lại bản mới**). **Tài khoản → Quản trị → Trạng thái hệ thống** có dòng **Phủ điều khoản**
   ("ISO 9001: …/41 điều khoản có biểu · bắt buộc chưa có biểu … · BRCGS: …/31 chủ đề có biểu").
4. Làm **Phần G** (nghiệm thu Đợt 1, đủ 8 mục) rồi gửi Claude ảnh màn hình chỗ chưa đạt.

### Dùng Phủ điều khoản và trang chủ

- **Phủ điều khoản** (menu trái; iPhone: ô **Phủ điều khoản** ở trang chủ hoặc Tài khoản → Phủ điều khoản): thẻ **ISO 9001** (41 điều
  khoản) và **BRCGS** (31 chủ đề). Mỗi dòng: số biểu, số đã ban hành ●, số in từ app M&E / Checksheet, trạng thái **Thiếu biểu – bắt
  buộc** (đỏ — điều khoản bắt buộc lưu hồ sơ mà chưa có biểu nào) · **Chưa có biểu** · **Có biểu, chưa ban hành** · **Đã có**. Bấm nút
  trạng thái để lọc; chọn **Bộ phận** để xem phủ của một bộ phận. Bấm một dòng → danh sách biểu của điều khoản → bấm biểu để mở, hoặc
  **Mở trong Danh mục** (Danh mục lọc sẵn theo điều khoản, bấm ✕ trên nút lọc để bỏ).
- Cách đếm **giống hệt** trang Phủ ISO 9001 / Phủ BRCGS của file Excel tổng: biểu thuộc điều khoản khi một mã ở cột ISO 9001 **bắt đầu
  bằng** số điều khoản (9.2 gồm cả 9.2.2); biểu thuộc chủ đề BRCGS khi cột BRCGS Packaging **chứa** khóa chủ đề. Biểu ✕ vẫn được đếm
  như Excel. Danh sách điều khoản lấy từ hai trang Phủ của file Excel khi nhập — sửa điều khoản thì sửa file rồi nhập lại.
- **Trang chủ**: ô **Điều khoản bắt buộc thiếu biểu** bấm vào mở Phủ điều khoản đã lọc. Thẻ **Hồ sơ đến hạn trong tuần** (‹ › đổi tuần):
  biểu hằng ngày mỗi biểu một dòng 7 ô Thứ Hai … Chủ nhật; biểu tuần / tháng / quý / năm hiện ở **ngày kết thúc kỳ**; kỳ đã hết từ tuần
  trước mà chưa nộp và còn trong 3 ngày cho phép trễ hiện ở ngày **hạn chót**. Bấm ô hoặc dòng → hồ sơ của kỳ / **Nộp hồ sơ kỳ này**.
  Chỉ tính biểu ● làm tay có chu kỳ — danh mục hiện toàn ○ ◐ nên thẻ trống cho tới khi ban hành biểu.
- **Chờ bạn xử lý** thêm: "N biểu quá hạn hồ sơ — nộp ngay" (biểu bạn nộp được có kỳ gần nhất quá hạn), "N thao tác gửi không được"
  (mở Nháp chờ đồng bộ), "tài liệu sắp/quá hạn rà soát" cả với người được đặt làm người phụ trách tài liệu.

## CẬP NHẬT LÊN BẢN 1c (1.0.0-d1.3) — làm một lần, trên máy tính

Bản 1c **thêm sheet `Records` và cột `records_from` ở `Items`** nên chạy `migrateSchema`. Không xóa hay sửa dữ liệu đã có.
Nếu chưa làm bước "CẬP NHẬT LÊN BẢN 1b" bên dưới thì không sao: `migrateSchema` của 1c thêm luôn những gì 1b cần.

1. <https://script.google.com> → dự án máy chủ ISO (`ISO_MayChu_THAT`) → tệp `Code.gs` → Ctrl+A → xóa → mở link
   `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO/main/apps-script/Code.gs` → Ctrl+A → Ctrl+C → dán vào → **Lưu**.
2. Ô chọn hàm → **`migrateSchema`** → **Chạy**. Nhật ký: `migrateSchema xong. Thêm: Items(records_from); Records … schema_version=1.0.2`
   (nếu chưa lên 1b thì có thêm `Versions`, `Items(na_prev_status,reviewed_at,reviewed_by,…)`). Quên bước này: lần nộp hồ sơ đầu tiên
   máy chủ tự thêm sheet, chỉ chậm hơn vài giây.
3. **Triển khai → Quản lý các bản triển khai** → bút chì → Phiên bản: **Phiên bản mới** → Mô tả `d1.3 hồ sơ` → **Triển khai**.
   Link `/exec` giữ nguyên.
4. Mở app `/ISO/` trên máy tính và iPhone → app tự tải bản mới (**Tài khoản → Thông tin** ghi `1.0.0-d1.3`; màn báo lỗi thì bấm
   **Tải lại bản mới**). **Tài khoản → Quản trị → Trạng thái hệ thống**: `schema_version` = `1.0.2`, có dòng **Hồ sơ**
   ("Đã nộp … · Bị trả lại … · Biểu quá hạn …") và ngày bắt đầu tính hồ sơ của biểu nhập từ Excel (`records_start_date`).

### Dùng hồ sơ (app chỉ có owner + Thư ký ISO)

Hai tài khoản cấp 4 nộp hồ sơ thay mọi bộ phận và trả lại được hồ sơ nộp sai.

- **Nộp hồ sơ**: nút **Hồ sơ** (iPhone) → **+**, hoặc mở biểu → **Nộp hồ sơ**, hoặc **Quét** tem QR trên sổ biểu. Chọn kỳ (app gợi ý kỳ
  còn thiếu gần nhất) hoặc **Khoảng ngày** để nộp cả quyển sổ (vd sổ tháng 10 của biểu hằng ngày: 01/10 → 31/10 — mọi ngày trong
  khoảng có ✓). **Chụp ảnh** từng trang hoặc **Chọn ảnh / tệp** (PDF, Excel, Word), tối đa 30 → **Lưu hồ sơ**.
- **Mất mạng vẫn nộp được**: hồ sơ và ảnh lưu trên iPhone (ô hiện "chờ gửi" màu vàng), có mạng app tự gửi. Xem / xóa ở **Tài khoản →
  Nháp chờ đồng bộ**. Đừng xóa app hay dữ liệu Safari khi còn hồ sơ chờ gửi.
- **Biểu nào nộp được**: biểu ● đang hiệu lực và ◐ đang soạn (sổ giấy đang dùng). Biểu ○ chưa có, ✕ ngừng dùng, biểu in từ M&E /
  Checksheet thì không (Đợt 2 lấy ngày có hồ sơ từ app kia).
- **Bảng kỳ** (màn Hồ sơ): mỗi biểu một dòng, 12 kỳ gần nhất. ✓ đúng hạn · ! quá hạn (kỳ đã kết thúc quá 3 ngày mà chưa có hồ sơ) ·
  – chưa tới hạn · ô gạch = không tính. **Chỉ tính biểu ● đã ban hành** — danh mục hiện tại toàn ○ ◐ nên bảng sẽ trống cho tới khi ban
  hành biểu (màn Phiên bản) hoặc nhập Excel có cột T = ●. Biểu ◐ đã có hồ sơ vẫn hiện để xem ✓. Biểu "khi phát sinh" không bao giờ quá hạn.
- **Ngày bắt đầu tính**: biểu ban hành trong app — từ ngày ban hành lần đầu (ban hành lại không lùi ngày); biểu ● nhập từ Excel — từ
  `records_start_date` (Trạng thái hệ thống, mặc định ngày nhập danh mục đầu tiên). Kỳ trước ngày đó không tính.
- **Trả lại hồ sơ nộp sai**: mở hồ sơ (bấm ô của bảng kỳ → hồ sơ) → **Trả lại** → lý do → PIN. Kỳ đó về như chưa có; người nộp thấy
  "N hồ sơ bị trả lại" ở trang chủ → **Nộp lại**.
- **Tem QR** (in tem ở Đợt 2): link `…/ISO/#/f/<mã>?r=<lần>` mở biểu; tem của bản cũ báo đỏ "bản in đã lỗi thời". Quét bằng nút
  **Quét** trong app (camera iPhone mở Safari ngoài app).

## CẬP NHẬT LÊN BẢN 1b (1.0.0-d1.2) — đã gộp vào bước cập nhật 1c ở trên

Bản 1b **thêm sheet `Versions` và 3 cột ở `Items`** (`na_prev_status`, `reviewed_at`, `reviewed_by`) nên phải chạy `migrateSchema`.
Không xóa hay sửa dữ liệu đã có.

1. <https://script.google.com> → dự án máy chủ ISO đang chạy (`ISO_MayChu_THAT`) → tệp `Code.gs` → Ctrl+A → xóa → mở link
   `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO/main/apps-script/Code.gs` → Ctrl+A → Ctrl+C → dán vào → **Lưu**.
2. Ô chọn hàm → **`migrateSchema`** → **Chạy**. Nhật ký: `migrateSchema xong. Thêm: Versions; Items(na_prev_status,reviewed_at,reviewed_by)
   … schema_version=1.0.1`. (Quên bước này thì app vẫn mở được; trigger nền chạy mỗi 3 giờ tự thêm sheet, nhưng nút phiên bản báo lỗi
   tới lúc đó.)
3. **Triển khai → Quản lý các bản triển khai** → bút chì → Phiên bản: **Phiên bản mới** → Mô tả `d1.2 phiên bản & ban hành` →
   **Triển khai**. Link `/exec` giữ nguyên.
4. Mở app `/ISO/` trên máy tính và iPhone → app tự tải bản mới (góc **Tài khoản → Thông tin** ghi `1.0.0-d1.2`; nếu màn báo lỗi bấm
   **Tải lại bản mới**). **Tài khoản → Quản trị → Trạng thái hệ thống**: dòng `schema_version` = `1.0.1`, dòng **Phiên bản** hiện số
   nháp/chờ duyệt/đang hiệu lực.

### Dùng phiên bản & ban hành (app chỉ có owner + Thư ký ISO)

Hai tài khoản đều **cấp 4 (Quản trị)** thì làm thay trưởng bộ phận: tự soạn, tự duyệt, ban hành. Mỗi việc duyệt / trả lại / ban hành /
✕ / đã rà soát hỏi lại PIN (nhập một lần dùng được 5 phút).

- **Biểu ● nhập từ Excel chưa có tệp** (trang chủ: "N biểu ● chưa có tệp"): mở biểu → **Gắn tệp bản hiện hành** → chọn PDF của đúng
  lần đang dùng (+ tệp gốc Excel/Word nếu có) → **Lưu và ban hành** → PIN. Không đổi lần và ngày ban hành; cờ "chưa có tệp" tắt.
- **Ban hành lần mới** (biểu ○ ◐, hoặc sửa biểu ●): mở biểu → **Soạn phiên bản mới** → tóm tắt thay đổi, ngày hiệu lực, PDF (bắt buộc),
  tệp gốc → **Lưu và gửi duyệt** → **Duyệt** (PIN) → **Ban hành**. Bản cũ tự thành **Lỗi thời**; danh mục cập nhật lần ban hành, ngày
  ban hành = hôm nay, hạn rà soát = +12 tháng; trang chủ cập nhật % ban hành.
- **Trả lại** (kèm lý do) đưa bản về Nháp để sửa; **Hủy phiên bản** bỏ bản đang soạn.
- **Ngừng dùng biểu**: mở biểu → **Đặt Không áp dụng (✕)** → lý do → PIN; hồ sơ cũ giữ nguyên. **Dùng lại biểu** đưa về tình trạng cũ.
- **Rà soát định kỳ**: trang chủ báo "tài liệu sắp/quá hạn rà soát" (30 ngày trước). Tài liệu vẫn đúng → **Đã rà soát, giữ nguyên** →
  hạn mới = hôm nay + 12 tháng; cần sửa thì soạn phiên bản mới.
- **Xem PDF / Tải tệp gốc**: máy tính mở PDF ở tab mới; iPhone chạm **Xem PDF** (tải về) rồi chạm **Mở / Lưu** (bảng Chia sẻ → mở
  bằng Sách/Tệp hoặc in). Tệp lớn nhất 10 MB trên máy tính, 5 MB trên điện thoại.
- Màn **Phiên bản** (menu trái trên web; iPhone: Tài khoản → Phiên bản, hoặc bấm dòng trong ô Chờ bạn xử lý) liệt kê bản chờ duyệt,
  chờ ban hành, bị trả lại, nháp.

## BẮT ĐẦU Ở ĐÂY — đưa lên THẬT ngay (chốt 11/11/2026, không qua THỬ)

Anh đã dựng một máy chủ (dự án `ISO_MayChu_THU`, link `/exec` đã gửi Claude). Máy chủ đó **chuyển thành máy chủ THẬT**, không dựng
máy chủ thứ hai. Trang app THẬT: <https://luongquangdao8386-ops.github.io/ISO/> (đã cố định link `/exec`). Làm trên máy tính, trong
hồ sơ Chrome của tài khoản Google dùng chung (Phần A).

**Bước 1 — Dán mã máy chủ mới.** <https://script.google.com> → dự án `ISO_MayChu_THU` → tệp `Code.gs` → Ctrl+A → xóa → mở link
`https://raw.githubusercontent.com/luongquangdao8386-ops/ISO/main/apps-script/Code.gs` → Ctrl+A → Ctrl+C → dán vào → **Lưu** (Ctrl+S).

**Bước 2 — Đã chạy `setup` chưa?** **Cài đặt dự án** (bánh răng) → **Thuộc tính tập lệnh**:
- **Có** dòng `BUSINESS_SPREADSHEET_ID` → đã setup, sang bước 3. Nếu còn thấy `SETUP_OWNER_CODE` (hoặc anh chưa từng đặt mã owner)
  thì làm Phần C bước 5, 6 trước.
- **Không có** → sửa `ENV` thành `THAT` (chưa có thì thêm), rồi làm Phần C bước 2 (múi giờ), 4, 5, 6 trong dự án này; bỏ qua bước 3
  (chạy cũng được, nhật ký báo `Máy chủ đã là THẬT`), đổi tên dự án thành `ISO_MayChu_THAT` cho dễ nhận.

**Bước 3 — Chuyển thành THẬT.** Ô chọn hàm → **`adminChuyenSangTHAT`** → **Chạy** (Google hỏi quyền thì cho phép như Phần C bước 4).
Nhật ký: `Xong: máy chủ này là THẬT (ENV=THAT). Đã xóa dữ liệu thử: … Đổi tên: …`. Hàm này:
- xóa biểu, nhóm, điều khoản, lô nhập đã có (dữ liệu mẫu/thử) và 4 tài khoản mẫu `MAU-*`; **giữ** owner, PIN, tài khoản khác, bộ phận,
  cài đặt, logo, nhật ký;
- đặt `ENV = THAT`, `app_base_url` = trang `/ISO/`, bỏ thuộc tính `TEST_*`;
- đổi tên bỏ đuôi `_THU`: dự án thành `ISO_MayChu_THAT`, thư mục `ISO_HeThong`, `ISO_Data`, `ISO_Backups`, bảng tính `ISO_NghiepVu`,
  `ISO_BaoMat` (tải lại trang Apps Script để thấy tên mới; đổi không được thì nhật ký báo — đổi tay, không ảnh hưởng app);
- mọi máy đang mở app phải đăng nhập lại.
Chạy lần hai không làm gì (nhật ký `Máy chủ đã là THẬT`), nên chạy nhầm cũng không mất dữ liệu thật.

**Bước 4 — Triển khai bản mới, giữ link.** **Triển khai → Quản lý các bản triển khai** → bút chì → Phiên bản: **Phiên bản mới** →
Mô tả `THẬT d1.1` → **Triển khai**. Link `/exec` giữ nguyên. (Chưa từng triển khai thì làm Phần C bước 7 và gửi Claude link mới.)

**Bước 5 — Bật trang THẬT.** <https://github.com/luongquangdao8386-ops/ISO> → **Settings → Pages** → Source: **Deploy from a branch** →
Branch: `main`, thư mục `/ (root)` → **Save** → chờ 2–3 phút.

**Bước 6 — Đăng nhập.** Mở <https://luongquangdao8386-ops.github.io/ISO/> → mã owner + PIN (lần đầu là PIN tạm → app bắt đổi PIN).
Không có nhãn vàng THỬ là đúng máy chủ THẬT. **Tài khoản → Quản trị → Trạng thái hệ thống** → dòng `app_base_url` phải là
`https://luongquangdao8386-ops.github.io/ISO/` (bước 3 tự đặt; đi đường "Không có" ở bước 2 thì bấm **Sửa** và dán vào).

**Bước 7 — Nhập danh mục 221 biểu.** Menu trái **Excel** → **Nhập lô → Chọn file Excel tổng** → chọn
`Danh_muc_bieu_mau_ISO_tong_Viet-Trung_1.xlsx` → Xem trước phải là **221 Thêm · 0 Lỗi · 72 điều khoản** (ISO 9001: 41, BRCGS: 31) →
**Ghi vào danh mục** → PIN. Owner là Quản trị nên tự ghi được. Xong: Danh mục có 221 biểu (○ 115, ◐ 106), 42 nhóm.

**Bước 8 — Dùng.** Tạo tài khoản, đặt trưởng bộ phận, logo (Phần F); iPhone: Safari mở `/ISO/` → **Chia sẻ → Thêm vào MH chính**.

**Bước 9 — Bản sao ở tài khoản thứ hai.** Phần I (I.1 trong app `/ISO/`; I.2–I.4 một lần cho cả ba app).

Gặp lỗi: chụp màn hình gửi Claude — sửa trên bản THẬT luôn (Phần H để dán bản sửa).

## Hai môi trường

| | THẬT (đang dùng, từ 11/11/2026) | THỬ (tạm không có máy chủ) |
| --- | --- | --- |
| Dự án Apps Script | `ISO_MayChu_THAT` (đổi tên từ `ISO_MayChu_THU`), `ENV = THAT` | dựng lại theo Phần C khi cần thử bản lớn |
| Thư mục Drive | `ISO_HeThong` | `ISO_HeThong_THU` |
| Trang app | <https://luongquangdao8386-ops.github.io/ISO/> (repo `ISO`) | <https://luongquangdao8386-ops.github.io/ISO-thu/> (repo `ISO-thu`, chưa gắn máy chủ) |

App THỬ có nhãn vàng **THỬ** trên đầu màn hình; tên trên iPhone là "ISO THỬ". Dữ liệu trên máy dùng tiền tố `iso` (trang THỬ
`iso_thu`), không đụng dữ liệu của M&E (`me`) và Checksheet (`cs`) trên cùng iPhone.

Các Phần B–G dưới đây viết cho máy chủ THỬ; nay chỉ dùng các bước được trỏ tới từ phần **BẮT ĐẦU Ở ĐÂY**.

---

## Phần A — Tài khoản Google cho máy chủ ISO

Đã chốt: máy chủ ISO dùng **chung tài khoản Google** với M&E và Checksheet. Không tạo tài khoản mới.

1. Dùng tài khoản anh đang dùng cho M&E và Checksheet. Claude không cần biết tài khoản, mật khẩu hay mã SMS.
2. Mở Chrome trên máy tính bằng hồ sơ của tài khoản đó (ảnh đại diện góc phải để kiểm tra đúng tài khoản). Mọi bước ở Phần C làm
   trong hồ sơ này.
3. Lưu ý khi dùng chung: hạn mức Gmail, dịch máy và gọi dịch vụ ngoài của Google tính theo tài khoản, nên ba app chia nhau. Từ Đợt 2
   ISO gửi email nhắc hạn, cần theo dõi hạn mức này. Nếu tài khoản bị khóa hoặc phải xác minh lại, cả ba app cùng ngừng — vì vậy
   làm thêm **Phần I** (bản sao ở tài khoản Google thứ hai).
4. Cho tài khoản này: bật **xác minh 2 bước**, đặt **số điện thoại và email khôi phục**, in **mã dự phòng** của Google cất chỗ an toàn.

## Phần B — Bật trang thử /ISO-thu/ (GitHub Pages, làm một lần)

1. Claude đã đẩy nhánh `main` của repo `ISO-thu`.
2. <https://github.com/luongquangdao8386-ops/ISO-thu> → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`,
   thư mục `/ (root)` → **Save**.
3. Chờ 2–3 phút → mở <https://luongquangdao8386-ops.github.io/ISO-thu/> → thấy màn đăng nhập có biểu tượng **tờ tài liệu + dấu tick**
   (navy trên vàng).

Repo `ISO` (trang THẬT) đã phát hành từ 11/11/2026 — xem Phần THẬT.

## Phần C — Dựng máy chủ THỬ (`ISO_MayChu_THU`)

Làm trong hồ sơ Chrome của tài khoản Google anh đang dùng cho M&E/Checksheet (Phần A).

1. <https://script.google.com> → **Dự án mới** → đổi tên thành `ISO_MayChu_THU`.
2. **Cài đặt dự án** (bánh răng bên trái):
   - tích **Hiển thị tệp kê khai "appsscript.json" trong trình chỉnh sửa**;
   - **Múi giờ**: `(GMT+07:00) Giờ Đông Dương - Hồ Chí Minh` (hoặc Bangkok);
   - **Thuộc tính tập lệnh → Thêm thuộc tính**: `ENV` = `THU` → **Lưu**.
3. **Trình chỉnh sửa** (`<>`):
   - tệp `appsscript.json` → Ctrl+A → xóa → mở link
     `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO-thu/main/apps-script/appsscript.json` → Ctrl+A → Ctrl+C → dán vào;
   - tệp `Code.gs` → Ctrl+A → xóa → mở link
     `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO-thu/main/apps-script/Code.gs` → Ctrl+A → Ctrl+C → dán vào → **Lưu** (Ctrl+S).
4. Ô chọn hàm → **`setup`** → **Chạy** → Google hỏi quyền: **Xem lại quyền** → chọn tài khoản đang dùng → **Nâng cao** →
   **Đi tới ISO_MayChu_THU (không an toàn)** → **Cho phép**.
   Nhật ký thực thi: `Xong setup. ENV=THU. Đã tạo 16 sheet…` và `Đã cài trigger: runBackgroundJobs, backupData`.
5. **Cài đặt dự án → Thuộc tính tập lệnh** → thêm 3 thuộc tính:
   - `SETUP_OWNER_CODE` = mã nhân viên của anh (vd `NV001`);
   - `SETUP_OWNER_NAME` = tên hiển thị;
   - `SETUP_OWNER_TEMP_PIN` = 6 số tạm (không dùng dãy dễ đoán như 123456, 111111, ngày sinh).
6. Chọn hàm **`adminSetupOwner`** → **Chạy** → nhật ký `Đã tạo owner …`. Ba thuộc tính trên tự xóa.
7. **Triển khai → Tùy chọn triển khai mới** → bánh răng → **Ứng dụng web** → Mô tả `THỬ d1.1` → Thực thi với tư cách **Tôi** →
   Người có quyền truy cập **Bất kỳ ai** → **Triển khai** → chép **URL ứng dụng web** (đuôi `/exec`).
8. Kiểm tra: cửa sổ ẩn danh → dán link `/exec` thêm `?action=system.health` → thấy `"ok":true` và `"app_id":"ISO"`.
9. Chạy hàm **`healthCheck`** → nhật ký liệt kê ĐẠT / CẢNH BÁO (lúc đầu `items`, `clauses`, `dept_heads`, `iso_secretary`,
   `last_backup`, `app_base_url` còn CẢNH BÁO là bình thường — làm xong Phần E, F sẽ hết).

## Phần D — Đăng nhập lần đầu (owner, trên máy tính)

1. Mở <https://luongquangdao8386-ops.github.io/ISO-thu/> → cuối màn đăng nhập bấm **Địa chỉ máy chủ (/exec)** → dán link `/exec`
   THỬ → **Lưu**.
2. Nhập mã owner + PIN tạm → app bắt **đổi PIN** → đặt PIN mới 6 số.
3. Vào app thấy nhãn **THỬ**. **Tài khoản → Quản trị → Trạng thái hệ thống** → dòng `app_base_url` → **Sửa** →
   `https://luongquangdao8386-ops.github.io/ISO-thu/` → PIN.
4. Muốn khỏi dán link ở mỗi máy: gửi link `/exec` THỬ cho Claude để cố định trong `config.js` của trang thử (chỉ gửi link `/exec`,
   không gửi PIN hay mã nào khác).

## Phần E — Danh mục: nhập file Excel tổng (hoặc dữ liệu mẫu để thử nhanh)

**Cách 1 — dữ liệu mẫu (chỉ để thử app):** Tài khoản → Quản trị → **Dữ liệu mẫu → Tạo dữ liệu mẫu** → PIN → tạo khoảng 25 biểu giả
ở 10 bộ phận, điều khoản mẫu và 4 tài khoản mẫu `MAU-TK` (Thư ký ISO), `MAU-CL3` (Trưởng QA), `MAU-SX2` (Nhân viên SX),
`MAU-KD1` (Tra cứu) — PIN tạm hiện **một lần**, chép lại ngay. Không phải danh mục thật.

**Cách 2 — file Excel tổng `Danh_muc_bieu_mau_ISO_tong_Viet-Trung.xlsx`:**

1. Web: menu trái **Excel** (iPhone: Tài khoản → Công việc → Excel) → **Nhập lô → Chọn file Excel tổng**.
2. App đọc sheet **Danh mục tổng - 总清单** (tiêu đề dòng 4, dữ liệu từ dòng 5) và hai sheet **Phủ ISO 9001**, **Phủ BRCGS**
   (điều khoản), gửi máy chủ kiểm từng dòng → hiện **Xem trước**: số dòng Thêm / Sửa / Không đổi / Lỗi và lý do lỗi từng dòng.
3. **Ghi vào danh mục**: lô nhập danh mục là lô nhạy cảm — **người ghi phải khác người nhập** (trừ Quản trị). Quản trị nhập thì ghi
   luôn được; Thư ký ISO nhập thì một Thư ký ISO khác hoặc Quản trị mở **Excel → Lô nhập gần đây** → lô → **Ghi vào danh mục**.
   Mỗi lượt ghi tối đa 100 dòng (app tự chạy tiếp tới hết), hỏi PIN.
4. Biểu ● trong file mà chưa có tệp → app ghi là đã ban hành, gắn cờ **chưa có tệp** (trang chủ của Thư ký ISO báo số biểu cần tải
   tệp; tải tệp làm ở phiên 1b). Ngày nhập danh mục đầu tiên thành **ngày bắt đầu tính hồ sơ** (`records_start_date`) cho các biểu
   này — đổi được ở Trạng thái hệ thống.
5. Nhập lại chính file đó (hoặc file vừa **Xuất**) → Xem trước báo **Không đổi**.

**Xuất danh mục / Tải mẫu:** Excel → **Xuất N biểu** (đúng khuôn file Excel tổng: 5 sheet + `_meta`, công thức, cố định ô D5, nền
vàng ô nhập, danh sách chọn ○ ◐ ● ✕, tô màu theo tình trạng, cột khóa AA ẩn) hoặc **Tải mẫu** (khuôn trống). Trưởng bộ phận xuất
được biểu của bộ phận mình.

## Phần F — Thiết lập để dùng

1. **Bộ phận**: Quản trị → **Bộ phận và trưởng bộ phận** — 10 bộ phận đã có sẵn (ISO, KD, CB, SX, CL, MH, KV, NS, BRC, CĐ); đặt
   **trưởng bộ phận** cho từng bộ phận (người duyệt tài liệu cấp bộ phận, trả lại hồ sơ nộp sai ở phiên 1b, 1c). Tên bộ phận phải khớp
   cột Bộ phận của file Excel tổng (dạng "Việt · 中文").
2. **Người dùng**: Quản trị → **Người dùng → Thêm người dùng**: mã nhân viên, tên, cấp (**Tra cứu** · **Nhân viên** · **Trưởng bộ
   phận** · **Quản trị**), **bộ phận** (bỏ trống = mọi bộ phận), cờ **Thư ký ISO** (quản lý danh mục toàn công ty, nhập Excel, ban
   hành), cờ **Đánh giá viên** (Đợt 4) → **Lưu** → PIN → PIN tạm hiện một lần, đưa tận tay người đó. Giám đốc nhà máy cần tài khoản
   **cấp 4** (duyệt tài liệu cấp công ty, đã chốt).
3. **Cài đặt** (Quản trị → Trạng thái hệ thống): `doc_review_months` = 12 (chu kỳ rà soát), `record_grace_days` = 3 (số ngày cho phép
   trễ), `records_start_date` — đều đã đặt theo mục 10 đặc tả.
4. **Logo công ty trên báo cáo**: Quản trị → **Logo trên báo cáo** → chọn ảnh PNG/JPG → **Lưu** → PIN. Logo chỉ dùng cho báo cáo
   PDF/Excel (Đợt 2), không hiện trong app.
5. **iPhone**: mở link app bằng **Safari** → **Chia sẻ → Thêm vào MH chính** → mở từ biểu tượng → dán link `/exec` (nếu chưa cố định)
   → đăng nhập.
6. **Bản sao ở tài khoản thứ hai**: làm Phần I.

## Phần G — Nghiệm thu Đợt 1 (đủ 8 mục, làm trên THẬT)

App đang chạy THẬT với dữ liệu thật, nên thử sao cho dọn được: tài khoản thử tạo xong thì **khóa** (Quản trị → Người dùng → bỏ tích
Đang hoạt động), hồ sơ thử thì **Trả lại** với lý do "thử nghiệm", phiên bản thử thì **Hủy** (hoặc dùng luôn một biểu thật sắp ban hành).
Mục 4 và 8 cần người cấp 1–3: tạo tạm hai tài khoản **Nhân viên** (cấp 2, bộ phận SX) và **Tra cứu** (cấp 1, bộ phận KD) ở
**Tài khoản → Quản trị → Người dùng** (PIN tạm hiện một lần — ghi lại).

| # | Mục nghiệm thu | Cách thử | Đạt khi |
| --- | --- | --- | --- |
| 1 | Đăng nhập, mất mạng, bộ nhớ riêng | Đăng nhập PIN trên iPhone (app ở Màn hình chính) và máy tính. iPhone tắt Wi-Fi + 4G → mở lại app → **Mở bằng PIN** | Xem được danh mục, chi tiết biểu, dải đỏ "Ngoại tuyến"; app M&E, Checksheet trên cùng iPhone không bị đăng xuất hay mất nháp |
| 2 | Nhập / xuất Excel tổng | Đã nhập 221 biểu. **Excel → Xuất 221 biểu** → **Nhập lô** chính file vừa xuất → Xem trước | Danh mục: ○ 115 · ◐ 106 (đúng 4 nút ○ ◐ ● ✕); xem trước báo **221 Không đổi**, 0 lỗi |
| 3 | Lọc, tìm trên iPhone | Danh mục: bấm nút tình trạng, mở **Bộ lọc** chọn bộ phận / nhóm; gõ "dao tao" rồi "培训" | Bấm nút / chọn không bật bàn phím; lúc gõ ô tìm không mất chữ, bàn phím không nhảy |
| 4 | Soạn → duyệt → ban hành | Đăng nhập tài khoản Nhân viên SX → mở một biểu SX → **Soạn phiên bản mới** → ghi **Tóm tắt thay đổi** (bắt buộc, một thứ tiếng là đủ) + chọn PDF → **Lưu và gửi duyệt**. Đăng nhập Quản trị → Chờ bạn xử lý → **Duyệt** (PIN) → **Ban hành** (PIN) | Nhân viên **không thấy nút Duyệt** ở bản mình soạn; bản cũ (nếu có) thành **Lỗi thời**; trang chủ **% ban hành** tăng |
| 5 | Hồ sơ khi mất mạng, khoảng ngày, trả lại | iPhone tắt mạng → biểu ● hằng ngày (vd biểu vừa ban hành ở mục 4, đặt chu kỳ 1 ngày) → **Nộp hồ sơ** → **Khoảng ngày** 3 ngày → chụp 2 trang → **Lưu hồ sơ** → bật mạng lại. Bấm ô ✓ → hồ sơ → **Trả lại** (lý do "thử nghiệm", PIN) | Lúc mất mạng ô vàng "chờ gửi"; có mạng vài giây sau thành ✓, hồ sơ có mã `HS-…`, đủ 3 ô ngày; trả lại → các ô về **!** hoặc **–** |
| 6 | Bảng kỳ ✓ ! – | Màn **Hồ sơ** với biểu ● ngày / tuần / tháng / năm và một biểu "khi phát sinh" | Kỳ đã kết thúc quá 3 ngày chưa có hồ sơ là **!**, kỳ hiện tại **–**, kỳ có hồ sơ **✓**; biểu khi phát sinh không bao giờ có **!** |
| 7 | Phủ điều khoản khớp Excel | **Excel → Xuất** → mở file bằng Excel → trang **Phủ ISO 9001 - 条款覆盖** và **Phủ BRCGS - BRCGS覆盖**; trong app mở **Phủ điều khoản** | Từng dòng: **Số biểu**, **Đã ban hành**, **In từ app**, **Trạng thái** trùng cột D, E, F, G của file; ô "Điều khoản bắt buộc thiếu biểu" ở trang chủ = ô N7 trang Tổng hợp. (So với file gốc `Danh_muc_bieu_mau_ISO_tong_Viet-Trung.xlsx` cũng phải trùng nếu chưa sửa danh mục trong app.) |
| 8 | Phạm vi bộ phận, không có quyền thì không hỏi PIN | Đăng nhập Nhân viên SX: Danh mục, Phủ điều khoản, Hồ sơ, mở hồ sơ thử ở mục 5. Đăng nhập Tra cứu KD | Nhân viên SX chỉ thấy biểu SX + tài liệu chung Ban ISO (Phủ điều khoản ghi "Chỉ đếm biểu của bộ phận SX…"), không có Excel, không có nút sửa, Duyệt, Trả lại. Tra cứu: trang chủ không có lịch tuần, ô Phủ điều khoản; nút **Hồ sơ** ở thanh dưới iPhone vẫn có nhưng bấm vào chỉ hiện lời giải thích (web: menu trái không có Hồ sơ, Phủ điều khoản). (Máy chủ trả **Không có quyền** trước khi hỏi PIN — Claude đã thử tự động cho mọi thao tác cần PIN.) |

Xong thì khóa hai tài khoản thử. Chỗ nào chưa đạt: gửi Claude **ảnh màn hình** (không cần dán log dài).

## Phần G2 — Nghiệm thu Đợt 2 (4 mục, làm trên THẬT sau khi lên bản 2d)

| # | Mục nghiệm thu | Cách thử | Đạt khi | Tình trạng |
| --- | --- | --- | --- | --- |
| 1 | Ô ✓ từ M&E và Checksheet | Màn **Hồ sơ** / **Kết nối** | Ít nhất một biểu M&E và một biểu Checksheet có ô ✓ đến từ app kia | **ĐẠT 12/11/2026** (BM-CĐ-08-01, BM-CĐ-03-02 từ M&E; BM-CĐ-07-06 từ Checksheet) |
| 2 | Email tóm tắt đến đúng trưởng bộ phận | Quản trị → Người dùng: đặt một trưởng bộ phận có email (Bộ phận → Trưởng bộ phận) → Gmail nhắc hạn → xác nhận email → **Gửi thử** người đó | Thư "hồ sơ quá hạn" của bộ phận đó đến hộp thư trưởng bộ phận (chưa có trưởng bộ phận thì thư đi Thư ký ISO — đúng thiết kế) | Đã thử trên giả lập; app thật chưa có trưởng bộ phận |
| 3 | 4 báo cáo PDF có logo | Bước "Thử Báo cáo" của bản 2c (logo đã tải lên) | PDF Danh mục, Tình trạng hồ sơ, Phủ điều khoản, Lịch sử phiên bản có logo đầu trang, số BC | Chờ anh gửi ảnh PDF |
| 4 | Tem bản cũ báo đỏ khi quét | Biểu ở bước "Thử phiên 2d" (đã in tem lần 01) → soạn lần 02 → ban hành → quét tem lần 01 bằng nút **Quét** | Dải đỏ **Bản in này đã lỗi thời: tem ghi lần 01, đang hiệu lực lần 02**; Sổ phân phối có dòng **Cần thu hồi** | Đã thử trên giả lập; trên THẬT cần ban hành lần 02 |

## Phần H — Cập nhật máy chủ khi có bản mới (phiên 1b, 1c, 1d, Đợt 2…)

1. Dự án `ISO_MayChu_THAT` → tệp `Code.gs` → Ctrl+A → xóa → mở link
   `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO/main/apps-script/Code.gs` → chép → dán → **Lưu**.
2. Nếu Claude báo bản mới **thêm sheet/cột**: chọn hàm **`migrateSchema`** → **Chạy** (chạy nhiều lần vẫn an toàn).
   Nếu Claude báo bản mới **cần quyền mới** (như 2a): chọn hàm **`installTriggers`** → **Chạy** → **Cho phép**, trước bước 3.
3. **Triển khai → Quản lý các bản triển khai** → bút chì → Phiên bản: **Phiên bản mới** → **Triển khai** (link `/exec` giữ nguyên).
4. Mở app → tự tải bản mới (nếu màn báo lỗi, bấm **Tải lại bản mới** dưới thông báo lỗi).

Thứ tự luôn là: dán `Code.gs` (+ `migrateSchema`) **trước**, rồi Claude mới đẩy `main` của trang app.

## Phần I — Bản sao ở tài khoản Google thứ hai (ISO, M&E, Checksheet)

Ba app chạy chung một tài khoản Google, nên sao lưu hằng tuần của cả ba cũng nằm trong tài khoản đó. Phần này đưa một bản sao sang
**tài khoản Google thứ hai** (Gmail sao lưu anh đã chọn — địa chỉ không ghi vào repo vì repo công khai). Bản chép thuộc tài khoản thứ
hai nên vẫn còn khi tài khoản chính bị khóa.

Cách chạy: tài khoản chính **chia sẻ chỉ xem** thư mục Sao lưu (và thư mục Dữ liệu) cho tài khoản thứ hai; script **SaoLuuPhu** chạy
trong tài khoản thứ hai, mỗi ngày 3 giờ sáng chép bản sao lưu đã kiểm chứng (VERIFIED) và tệp dữ liệu mới về thư mục `SaoLuu_Phu`
trong Drive của nó, giữ 12 bản mới nhất mỗi app. Thư mục chứa bảng tính đang chạy (`…_HeThong…`) **không** chia sẻ.

### I.1 — App ISO: đặt tài khoản thứ hai trong app (trang `/ISO/`)

1. App ISO → **Tài khoản → Quản trị → Sao lưu** → khung **Tài khoản sao lưu thứ hai**.
2. Nhập email tài khoản thứ hai → **Lưu và chia sẻ** → PIN.
3. Trạng thái thành **Đang chia sẻ**, thư mục đã chia sẻ: `ISO_Backups, ISO_Data`.
   Google gửi thư báo chia sẻ tới tài khoản thứ hai. Mỗi lần sao lưu hằng tuần máy chủ kiểm lại việc chia sẻ;
   **Trạng thái hệ thống** có dòng "Bản sao ở tài khoản Google thứ hai".

### I.2 — M&E và Checksheet: chia sẻ tay một lần (không phải sửa hai app)

Làm trong hồ sơ Chrome của **tài khoản chính**, mở <https://drive.google.com>:

1. Tìm thư mục sao lưu của từng app: `ME_Backups_THU`, `ME_Backups` (trong `ME_HeThong_THU`, `ME_HeThong`) và `CS_Backups_THU`,
   `CS_Backups` (trong `CS_HeThong_THU`, `CS_HeThong`). Ô tìm kiếm của Drive gõ `_Backups` là thấy.
2. Chuột phải từng thư mục → **Chia sẻ → Chia sẻ** → nhập email tài khoản thứ hai → quyền **Người xem** → **Gửi**.
3. **Không** chia sẻ thư mục `…_HeThong…` (chứa bảng tính đang chạy).
4. (Tùy chọn) muốn chép cả ảnh của M&E / Checksheet: chia sẻ thêm `ME_Data…`, `CS_Data…`. Ảnh nhiều thì tốn dung lượng 15 GB miễn phí
   của tài khoản thứ hai — chỉ làm khi cần.
5. Bản sao lưu hằng tuần của M&E và Checksheet phải đang chạy (Trạng thái hệ thống của từng app, dòng sao lưu gần nhất là
   **Đã kiểm chứng**).

### I.3 — Tài khoản thứ hai: cài script SaoLuuPhu (một lần)

1. Chrome → hồ sơ của **tài khoản thứ hai** (thêm hồ sơ nếu chưa có) → <https://script.google.com> → **Dự án mới** → đổi tên
   `SaoLuu_Phu`.
2. **Cài đặt dự án** → **Múi giờ** `(GMT+07:00) … Hồ Chí Minh` (hoặc Bangkok).
3. Trình chỉnh sửa → tệp `Code.gs` → Ctrl+A → xóa → mở link
   `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO/main/apps-script/SaoLuuPhu.gs` → Ctrl+A → Ctrl+C → dán vào →
   **Lưu**.
4. Chọn hàm **`caiDat`** → **Chạy** → cấp quyền (Xem lại quyền → chọn tài khoản thứ hai → Nâng cao → Đi tới SaoLuu_Phu → Cho phép).
5. Nhật ký thực thi: `Đã cài lịch chép hằng ngày lúc 3 giờ sáng`, danh sách thư mục nguồn (vd `ISO_Backups`, `ISO_Data`,
   `ME_Backups`…) và các dòng `XONG … chép N bản sao lưu mới`.
   - Không thấy thư mục nào: kiểm tra I.1, I.2 đã chia sẻ đúng email chưa, và script có đang chạy trong **tài khoản thứ hai** không
     (hàm **`danhSachNguon`** in tài khoản đang chạy).
   - Thấy thư mục nhưng `chép 0`: app đó chưa có bản sao lưu **Đã kiểm chứng** — trong app bấm **Sao lưu ngay**, chờ vài phút, rồi
     chạy hàm **`chepNgay`**.
6. Kiểm tra: Drive của tài khoản thứ hai → thư mục `SaoLuu_Phu` → mỗi app một thư mục → mỗi bản là thư mục ngày giờ
   (vd `2026-11-08_0100`) gồm 2 bảng tính `…_NghiepVu_…`, `…_BaoMat_…`, `manifest.json`, `mirror.json`.
7. Mỗi tháng chạy hàm **`kiemTra`** một lần: dòng **ĐẠT** khi bản mới nhất không quá 8 ngày; **CẢNH BÁO** thì xem sao lưu hằng tuần
   của app đó. Google cũng tự gửi thư cho tài khoản thứ hai khi lịch chạy bị lỗi.

### I.4 — Hai khóa bí mật (làm ngay, không cần code)

Trong mỗi dự án máy chủ (ISO, M&E, Checksheet; THỬ và THẬT) → **Cài đặt dự án → Thuộc tính tập lệnh** → chép giá trị
`PIN_PEPPER_V1` và `TOKEN_SECRET_V1` vào trình quản lý mật khẩu hoặc giấy cất két. **Không gửi Claude.** Có hai khóa này thì khi phải
dựng lại máy chủ từ bản chép, mọi người đăng nhập bằng PIN cũ được.

### I.5 — Khi tài khoản chính bị khóa (làm cùng Claude)

Bản chép ở tài khoản thứ hai chứa dữ liệu tới lần sao lưu hằng tuần gần nhất (thứ ghi sau đó bị mất — trước việc lớn hãy bấm
**Sao lưu ngay**). Khôi phục, trong tài khoản thứ hai:

1. Dựng dự án máy chủ mới như Phần C bước 1–3 (dán `Code.gs`), **không chạy `setup`**.
2. Thuộc tính tập lệnh: `ENV`; `BUSINESS_SPREADSHEET_ID`, `SECURITY_SPREADSHEET_ID` = ID hai bảng tính trong bản chép mới nhất;
   `DRIVE_ROOT_FOLDER_ID` = thư mục `SaoLuu_Phu/ISO_Data…` (hoặc thư mục mới), `DRIVE_BACKUP_FOLDER_ID` = một thư mục mới;
   `DATASET_EPOCH` = giá trị `dataset_epoch` trong `manifest.json`; `MAINTENANCE_MODE` = `false`; `PIN_PEPPER_V1`, `TOKEN_SECRET_V1`
   từ I.4.
3. Chạy `installTriggers`, `healthCheck` → triển khai web app → gửi Claude link `/exec` mới để cố định trong `config.js`.
4. Tệp trên Drive (PDF, tệp gốc, ảnh, logo) ở bản chép có ID mới; bảng nối ID cũ → mới nằm ở `file_map.json` trong thư mục dữ liệu
   của bản chép. Với `DRIVE_ROOT_FOLDER_ID` = thư mục đó, chạy hàm **`adminNoiLaiTep`**: đổi ID tệp của mọi phiên bản (và logo báo cáo)
   sang ID mới. Nhật ký: `đổi ID n tệp …`; chạy lại không đổi thêm.

M&E và Checksheet khôi phục theo cùng cách (làm trong cuộc trò chuyện của từng app).

## Phần THẬT

Đã chốt 11/11/2026: phát hành THẬT ngay ở phiên 1a, không qua THỬ — làm theo phần **BẮT ĐẦU Ở ĐÂY** ở đầu tài liệu. Toàn bộ Đợt 1
(1a → 1d) đã lên THẬT:

| | THẬT |
| --- | --- |
| Máy chủ | dự án Apps Script `ISO_MayChu_THAT` (`ENV = THAT`), thư mục Drive `ISO_HeThong`, `ISO_Data`, `ISO_Backups` |
| Trang app | <https://luongquangdao8386-ops.github.io/ISO/> — repo `ISO`, nhánh `main`, link `/exec` cố định trong `config.js` |
| Cập nhật | Phần H: dán `Code.gs` (+ `migrateSchema` khi Claude báo thêm sheet/cột) → Phiên bản mới; Claude chạy đủ test giả lập rồi mới đẩy `main` |
| Sao lưu | tự động hằng tuần (Quản trị → Sao lưu) + bản sao ở tài khoản Google thứ hai (Phần I) |

**Thứ tự khi bản mới đổi máy chủ:** anh dán `Code.gs` (+ `migrateSchema`) **trước**, Claude mới đẩy `main` của trang app. Bản chỉ đổi app
(như 1d: app chạy được với máy chủ 1c) thì Claude đẩy `main` ngay, anh dán `Code.gs` lúc tiện.

**Đợt 2 trở đi** (kết nối M&E / Checksheet, email nhắc hạn, báo cáo PDF): email và kết nối chạm tới người thật và hai app kia, nên đầu
Đợt 2 quyết định có dựng lại máy chủ THỬ (Phần C, trang `/ISO-thu/`) để thử trước hay không.

## Phần K — Cửa đọc `feed.isoEvidence` cho app ISO (làm trong chat M&E và chat Checksheet)

App ISO chỉ **đọc**; mỗi app M&E / Checksheet thêm một cửa chỉ-đọc (giống `feed.equipment` của M&E mà Checksheet đang dùng). Phần này
là hợp đồng để chat của từng app làm theo — app ISO bản 2a đã gọi đúng như sau.

**Gọi:** `POST <link /exec của app>` thân `text/plain` JSON
`{api_contract_version: '1.0', action: 'feed.isoEvidence', payload: {key, since: 'YYYY-MM-DD', client: 'ISO'}, device_id: <UUID v4>, app_version: '1.0.0-d2.1'}`.

**Quy tắc phía app M&E / Checksheet:**
- Action **public** (không cần phiên), chỉ đọc; thêm vào `PUBLIC_ACTIONS_` và bảng quyền như `feed.equipment`; **không** kiểm
  `min_client_version` (app_version là phiên bản máy chủ ISO); vẫn kiểm `device_id` là UUID v4, vẫn chặn khi bảo trì.
- Khóa bằng thuộc tính `FEED_KEY_ISO` (riêng, khác `FEED_KEY_CS`), so sánh hằng thời gian; thiếu hoặc sai mã → `FORBIDDEN`.
  Hàm chạy tay **`adminCreateFeedKeyIso`**: chưa có thì tạo (32 byte ngẫu nhiên, base64url), in ra nhật ký "Mã kết nối cho app ISO: …";
  có rồi thì in lại mã cũ. Đổi mã: xóa `FEED_KEY_ISO` trong Thuộc tính tập lệnh rồi chạy lại. Trạng thái hệ thống thêm dòng `iso_feed` ON/OFF.
- `since`: thiếu, sai dạng hoặc cũ hơn hôm nay − 400 ngày → dùng hôm nay − 400 ngày (giờ Việt Nam). Không báo lỗi.
- Trả `data = {app_id: 'ME' | 'CS', items: [{form_code, date, count}], server_time}`: mỗi cặp (mã biểu, ngày) một dòng; `date` từ
  `since` tới hôm nay; `count` = số hồ sơ / lượt trong ngày (≥ 1); tối đa 60 000 dòng. **Không** trả thêm gì khác (tên thiết bị, giá,
  người, ảnh…).
- `form_code` viết đúng mã biểu trong danh mục ISO (vd `BM-CĐ-04-03`). Mã con được (`BM-CĐ-03-03a`, `BM-CĐ-07-06-KT`): ISO tự gộp về mã
  cha nếu danh mục ISO không có mã con. Hồ sơ đã hủy / xóa không tính.
- Đọc bằng bộ đệm bảng như `feed.equipment`, nên chạy dưới 10 giây (ISO hỏi mỗi giờ).

**Checksheet** (`Templates.form_code` đã có từ d1.2): ngày có hồ sơ = ngày làm việc của lượt kiểm (Runs) của mẫu có `form_code`;
`count` = số lượt kiểm trong ngày của các mẫu mang mã đó (mẫu đã ngừng vẫn tính lượt cũ). Không cần `migrateSchema`.

**M&E** (chưa có cột mã biểu): bảng ánh xạ `iso_form_map` trong Settings (JSON, sửa được ở Cấu hình) + cột `form_code` cho mẫu
checklist bảo trì. Mặc định:

| Mã biểu | Ngày có hồ sơ lấy từ |
| --- | --- |
| BM-CĐ-02-01, 02-02 | Ngày sửa hồ sơ thiết bị gần nhất |
| BM-CĐ-03-01, 03-02 | Ngày sửa kế hoạch bảo trì |
| BM-CĐ-03-03 (và 9 checklist 03-03a…i) | Ngày nghiệm thu phiếu bảo trì, theo `form_code` của checklist (không có thì tính cho 03-03) |
| BM-CĐ-07-08, 07-09 | Ngày nghiệm thu phiếu bảo trì có checklist mang mã đó |
| BM-CĐ-04-01 | Ngày báo phiếu sửa chữa |
| BM-CĐ-04-02, 04-03 | Ngày hoàn thành phiếu sửa chữa |
| BM-CĐ-05-06 | Ngày ghi dịch vụ hợp đồng |
| BM-CĐ-06-05 | Ngày ghi kết quả kiểm định |
| Một phần: 05-01, 06-01, 08-01, 09-09, 14-01 | Ngày sửa vật tư; kiểm định loại Hiệu chuẩn; ngày đọc chỉ số điện nước; kiểm định dụng cụ an toàn; ngày lưu báo cáo bảo trì / sửa chữa |

Sổ dừng máy BM-CĐ-04-03 còn thiếu cột **ca** và **phản hồi** (người dùng đồng ý 06/11/2026) — làm ở phía M&E cùng lúc.

## Hàm chạy tay trong trình soạn Apps Script

| Hàm | Dùng khi |
| --- | --- |
| `setup` | Lần đầu dựng máy chủ (đã có thì không làm gì) |
| `adminSetupOwner` | Tạo owner đầu tiên từ 3 thuộc tính `SETUP_OWNER_*` |
| `adminResetOwnerPin` | Owner quên PIN: đặt `OWNER_RESET_TEMP_PIN` (6 số) rồi chạy |
| `migrateSchema` | Bản mới thêm sheet/cột (bản 1b: sheet `Versions`; 1c: sheet `Records`; 1d không cần; 2a: sheet `Evidence`; 2b: cột email đã xác nhận, loại nhắc; 2c: sheet `ReportRuns` + quyền Google Docs) |
| `adminNoiLaiTep` | Khôi phục từ bản chép ở tài khoản thứ hai: nối lại ID tệp theo `file_map.json` (Phần I.5) |
| `healthCheck` | Xem nhanh tình trạng máy chủ |
| `installTriggers` | Trigger bị xóa nhầm; bản 2a: cấp quyền gọi ra ngoài + cài `syncEvidenceHourly`; bản 2b: cài `sendDueMail` (4 trigger) |
| `adminSendMailNow` | Gmail đang bật: xếp hàng và gửi ngay như lần gửi hằng ngày (không gửi trùng), in kết quả + hạn mức Gmail còn lại |
| `adminSyncEvidenceNow` | Lấy ngay ngày có hồ sơ từ M&E / Checksheet đã nối, in kết quả (số dòng, mã lạ) vào nhật ký |
| `adminSeedSample` | Dữ liệu mẫu (chỉ THỬ) — PIN tạm in trong nhật ký |
| `adminChuyenSangTHAT` | Một lần: máy chủ THỬ thành THẬT (xóa dữ liệu thử, đổi tên bỏ `_THU`); đã là THẬT thì không làm gì |
| `adminMaintenanceOn` / `adminMaintenanceOff` | Tạm khóa / mở lại app khi cần sửa dữ liệu tay |
| `adminClearLoginPause`, `adminFlushAuthCache` | Đăng nhập bị tạm dừng / phiên lạ sau khi sửa tay sheet Users |
| `caiDat`, `chepNgay`, `kiemTra`, `danhSachNguon` | Script **SaoLuu_Phu** ở tài khoản thứ hai (Phần I) |

## Xử lý sự cố

- **Màn Báo cáo báo "Máy chủ chưa lên bản có Báo cáo"**: làm mục "CẬP NHẬT LÊN BẢN 2c" (dán `Code.gs`, `migrateSchema`, Phiên bản mới).
- **Tải PDF báo "Lỗi máy chủ" / "Authorization is required"** (Tải Excel vẫn được): chưa cho phép quyền Google Docs — chạy `migrateSchema`
  trong trình soạn → **Cho phép**, rồi triển khai **Phiên bản mới**.
- **Tải PDF lâu rồi báo mất kết nối**: bấm **Tải PDF** lần nữa — máy chủ dùng lại báo cáo vừa lưu (cùng số), không cấp số mới.
- **PDF không có logo**: Quản trị → **Logo trên báo cáo** chưa có ảnh; báo cáo **đã lưu** trước khi tải logo giữ nguyên (lập báo cáo mới).

- **Kết nối báo "App kia từ chối: sai mã kết nối…"**: chép lại mã từ nhật ký `adminCreateFeedKeyIso` của app đó (đủ ký tự, không dấu
  cách); app đó chưa lên bản có `feed.isoEvidence` cũng báo vậy.
- **Kết nối báo "Không nhận được phản hồi đúng từ link /exec"**: link không phải link `/exec` đang dùng của app đó, hoặc app đó chưa
  triển khai "Bất kỳ ai" — mở link đó trên trình duyệt phải thấy chữ `NOT_FOUND` (JSON), không phải trang đăng nhập Google.
- **"Link này là của app khác"**: dán link M&E vào ô Checksheet hoặc ngược lại.
- **App ISO báo lỗi ngay sau khi triển khai 2a** ("Cần quyền…" / không đăng nhập được): chưa cấp quyền — chạy `installTriggers` →
  **Cho phép** (mục "CẬP NHẬT LÊN BẢN 2a" bước 3), rồi tải lại app.
- **Biểu in từ app không có ô ✓**: cuối màn Kết nối xem "biểu in từ app chưa nhận ngày nào" và "mã biểu không có trong danh mục ISO" —
  sửa mã biểu bên app kia (mẫu checksheet: ô Mã biểu mẫu; M&E: bảng ánh xạ `iso_form_map` / mã checklist) cho khớp danh mục ISO.

- **Không thấy mục Gmail nhắc hạn**: máy chủ chưa lên 2b — làm mục "CẬP NHẬT LÊN BẢN 2b"; app báo "Máy chủ chưa lên bản 2b".
- **Gửi thử báo lỗi quyền / "Authorization is required"**: chưa cho phép quyền "Gửi email thay mặt bạn" — chạy `migrateSchema` (hoặc
  `installTriggers`) trong trình soạn → **Cho phép**, rồi triển khai **Phiên bản mới**.
- **Không nhận được thư**: xem mục **Spam**; màn Gmail → **Nhật ký gửi** (Đã gửi / Lỗi); email người nhận phải **Đã xác nhận**; Trạng
  thái hệ thống dòng **Gmail nhắc hạn** báo thiếu trigger thì chạy `installTriggers`.
- **"Hạn mức Gmail còn ít"**: M&E / Checksheet đã gửi gần hết hạn mức chung hôm nay — thư ISO tự gửi lần chạy sau.

- **Phủ điều khoản trống ("Chưa có danh sách điều khoản")**: file Excel đã nhập thiếu trang Phủ ISO 9001 / Phủ BRCGS — nhập lại file
  Excel tổng đủ 5 trang (Excel → Nhập lô); số biểu theo điều khoản tự tính lại.
- **Số phủ khác file Excel**: danh mục trong app đã sửa sau lần xuất — xuất lại rồi so; vẫn khác thì chụp dòng lệch gửi Claude.
- **Màn đăng nhập báo "Máy chủ chưa được cài đặt"**: chưa chạy `setup`, hoặc dán link `/exec` của dự án khác.
- **"Cần cập nhật app"**: đóng hẳn app rồi mở lại; máy chủ mới hơn app quá xa.
- **Nhập Excel báo "Tệp không đúng khuôn"**: tệp thiếu sheet `Danh mục tổng - 总清单` hoặc dòng tiêu đề có cột "Mã biểu mẫu".
- **Nhập Excel báo "Tệp xuất từ dữ liệu trước lần đặt lại"**: xuất lại từ app rồi sửa trên tệp mới.
- **Ghi lô báo "người ghi phải khác người nhập"**: nhờ Thư ký ISO khác hoặc Quản trị ghi (Excel → Lô nhập gần đây).
- **Nút phiên bản báo "Máy chủ chưa được cài đặt"**: chưa chạy `migrateSchema` sau khi dán `Code.gs` bản 1b.
- **Gửi duyệt báo "Cần tải PDF"**: mở phiên bản → **Tải PDF lên** rồi gửi lại.
- **"Biểu đang có phiên bản soạn/chờ duyệt"**: mỗi biểu chỉ một bản đang mở — mở bản đó (nút **Mở phiên bản đang soạn**) để làm tiếp hoặc hủy.
- **Xem PDF báo "Tệp không còn trên Drive"**: tệp bị xóa tay trong thư mục `ISO_Data` — lấy lại từ Thùng rác của Drive.
