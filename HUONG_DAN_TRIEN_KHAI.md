# Hướng dẫn triển khai app ISO · 体系管理 — bản 1.0.0-d1.1 (Đợt 1, phiên 1a)

App ISO là app thứ ba cùng nền với M&E và Checksheet: máy chủ riêng (dự án Apps Script riêng, bảng tính riêng), người dùng và PIN
riêng. Ba app dùng **chung một tài khoản Google** (đã chốt 06/11/2026). Cách làm giống hệt M&E, Checksheet: dán `Code.gs` vào Apps Script, triển khai web app, mở trang app
trên GitHub Pages.

Phiên 1a có: đăng nhập PIN, người dùng (bộ phận, Thư ký ISO, Đánh giá viên), bộ phận, danh mục biểu mẫu & tài liệu (lọc, tìm Việt/Trung,
chi tiết biểu), nhập/xuất file Excel tổng, quản trị. Phiên bản & ban hành (1b), hồ sơ (1c), phủ điều khoản + trang chủ đầy đủ (1d) hiện
mờ "Sắp có · 即将推出".

## Hai môi trường

| | THỬ (làm trước) | THẬT (phiên 1d, khi nói "phát hành ISO") |
| --- | --- | --- |
| Dự án Apps Script | `ISO_MayChu_THU`, thuộc tính `ENV = THU` | `ISO_MayChu_THAT`, `ENV = THAT` |
| Thư mục Drive tự tạo | `ISO_HeThong_THU` | `ISO_HeThong` |
| Trang app | <https://luongquangdao8386-ops.github.io/ISO-thu/> (repo `ISO-thu`) | <https://luongquangdao8386-ops.github.io/ISO/> (repo `ISO`) |

App THỬ có nhãn vàng **THỬ** trên đầu màn hình; tên trên iPhone là "ISO THỬ". Dữ liệu trên máy dùng tiền tố `iso_thu` (trang THẬT
`iso`), không đụng dữ liệu của M&E (`me`) và Checksheet (`cs`) trên cùng iPhone.

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

Repo `ISO` (trang THẬT) để trống tới phiên 1d — chỉ đẩy khi anh nói "phát hành ISO".

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

## Phần G — Thử trên THỬ (nghiệm thu Đợt 1 mục 1, 2, 3, 8)

1. **Đăng nhập PIN** trên iPhone (app ở Màn hình chính) và máy tính. Tắt Wi-Fi + 4G → mở lại app → **Mở bằng PIN** → vẫn xem
   được danh mục, chi tiết biểu (dải đỏ "Ngoại tuyến").
2. **Nhập file Excel tổng**: đủ 221 dòng, Xem trước không lỗi; ghi xong vào **Danh mục** bấm các nút ○ ◐ ● ✕ → số biểu từng tình
   trạng khớp file. **Xuất** rồi nhập lại file vừa xuất → **Không đổi**.
3. **Danh mục trên iPhone**: bấm nút tình trạng, mở **Bộ lọc** chọn bộ phận/nhóm — bàn phím không bật lên; gõ tìm không dấu
   ("dao tao") hoặc tiếng Trung ("培训") — ô tìm giữ nguyên, bàn phím không nhảy.
4. **Phạm vi bộ phận**: đăng nhập `MAU-SX2` (hoặc một Nhân viên bộ phận SX) → chỉ thấy biểu SX và tài liệu chung của Ban ISO; không
   có Excel, không có nút sửa. Người không có quyền làm thao tác cần PIN → báo **Không có quyền** ngay, không hỏi PIN.
5. Gửi Claude **ảnh màn hình** chỗ lỗi (không cần dán log dài).

## Phần H — Cập nhật máy chủ khi có bản mới (phiên 1b, 1c, 1d…)

1. Dự án `ISO_MayChu_THU` → tệp `Code.gs` → Ctrl+A → xóa → dán `Code.gs` mới từ link raw ở Phần C → **Lưu**.
2. Nếu Claude báo bản mới **thêm sheet/cột**: chọn hàm **`migrateSchema`** → **Chạy** (chạy nhiều lần vẫn an toàn).
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

### I.1 — App ISO: đặt tài khoản thứ hai trong app (làm ở THỬ, sau này ở THẬT)

1. App ISO → **Tài khoản → Quản trị → Sao lưu** → khung **Tài khoản sao lưu thứ hai**.
2. Nhập email tài khoản thứ hai → **Lưu và chia sẻ** → PIN.
3. Trạng thái thành **Đang chia sẻ**, thư mục đã chia sẻ: `ISO_Backups_THU, ISO_Data_THU` (THẬT: `ISO_Backups, ISO_Data`).
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
   `https://raw.githubusercontent.com/luongquangdao8386-ops/ISO-thu/main/apps-script/SaoLuuPhu.gs` → Ctrl+A → Ctrl+C → dán vào →
   **Lưu**.
4. Chọn hàm **`caiDat`** → **Chạy** → cấp quyền (Xem lại quyền → chọn tài khoản thứ hai → Nâng cao → Đi tới SaoLuu_Phu → Cho phép).
5. Nhật ký thực thi: `Đã cài lịch chép hằng ngày lúc 3 giờ sáng`, danh sách thư mục nguồn (vd `ISO_Backups_THU`, `ISO_Data_THU`,
   `ME_Backups_THU`…) và các dòng `XONG … chép N bản sao lưu mới`.
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
4. Tệp trên Drive (PDF, ảnh, logo) ở bản chép có ID mới; bảng nối ID cũ → mới nằm ở `file_map.json` trong thư mục dữ liệu của bản chép.
   Phiên 1a chỉ có logo (tải lại logo là xong); từ phiên 1b Claude viết thêm bước nối lại ID tệp.

M&E và Checksheet khôi phục theo cùng cách (làm trong cuộc trò chuyện của từng app).

## Phần THẬT — làm ở phiên 1d

Khi anh nói "phát hành ISO": dựng `ISO_MayChu_THAT` (như Phần C, `ENV = THAT`, cùng tài khoản Google), Claude cố định link
`/exec` THẬT trong `config.js` (`/ISO/` → THẬT, `/ISO-thu/` → THỬ) và đẩy `main` của repo `ISO`, anh bật Pages cho repo `ISO`.

## Hàm chạy tay trong trình soạn Apps Script

| Hàm | Dùng khi |
| --- | --- |
| `setup` | Lần đầu dựng máy chủ (đã có thì không làm gì) |
| `adminSetupOwner` | Tạo owner đầu tiên từ 3 thuộc tính `SETUP_OWNER_*` |
| `adminResetOwnerPin` | Owner quên PIN: đặt `OWNER_RESET_TEMP_PIN` (6 số) rồi chạy |
| `migrateSchema` | Bản mới thêm sheet/cột |
| `healthCheck` | Xem nhanh tình trạng máy chủ |
| `installTriggers` | Trigger bị xóa nhầm |
| `adminSeedSample` | Dữ liệu mẫu (chỉ THỬ) — PIN tạm in trong nhật ký |
| `adminMaintenanceOn` / `adminMaintenanceOff` | Tạm khóa / mở lại app khi cần sửa dữ liệu tay |
| `adminClearLoginPause`, `adminFlushAuthCache` | Đăng nhập bị tạm dừng / phiên lạ sau khi sửa tay sheet Users |
| `caiDat`, `chepNgay`, `kiemTra`, `danhSachNguon` | Script **SaoLuu_Phu** ở tài khoản thứ hai (Phần I) |

## Xử lý sự cố

- **Màn đăng nhập báo "Máy chủ chưa được cài đặt"**: chưa chạy `setup`, hoặc dán link `/exec` của dự án khác.
- **"Cần cập nhật app"**: đóng hẳn app rồi mở lại; máy chủ mới hơn app quá xa.
- **Nhập Excel báo "Tệp không đúng khuôn"**: tệp thiếu sheet `Danh mục tổng - 总清单` hoặc dòng tiêu đề có cột "Mã biểu mẫu".
- **Nhập Excel báo "Tệp xuất từ dữ liệu trước lần đặt lại"**: xuất lại từ app rồi sửa trên tệp mới.
- **Ghi lô báo "người ghi phải khác người nhập"**: nhờ Thư ký ISO khác hoặc Quản trị ghi (Excel → Lô nhập gần đây).
