# Hướng dẫn triển khai app ISO · 体系管理 — bản 1.0.0-d2.1 (Đợt 2, phiên 2a — Kết nối M&E / Checksheet)

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
từ app có ô ✓ mà không ai phải nộp lại. Báo cáo, Khắc phục, Đánh giá nội bộ (Đợt 2–4) vẫn mờ "Sắp có · 即将推出".

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
| `migrateSchema` | Bản mới thêm sheet/cột (bản 1b: sheet `Versions`; 1c: sheet `Records`; 1d không cần; 2a: sheet `Evidence`) |
| `adminNoiLaiTep` | Khôi phục từ bản chép ở tài khoản thứ hai: nối lại ID tệp theo `file_map.json` (Phần I.5) |
| `healthCheck` | Xem nhanh tình trạng máy chủ |
| `installTriggers` | Trigger bị xóa nhầm; bản 2a: cấp quyền gọi ra ngoài + cài trigger `syncEvidenceHourly` (3 trigger) |
| `adminSyncEvidenceNow` | Lấy ngay ngày có hồ sơ từ M&E / Checksheet đã nối, in kết quả (số dòng, mã lạ) vào nhật ký |
| `adminSeedSample` | Dữ liệu mẫu (chỉ THỬ) — PIN tạm in trong nhật ký |
| `adminChuyenSangTHAT` | Một lần: máy chủ THỬ thành THẬT (xóa dữ liệu thử, đổi tên bỏ `_THU`); đã là THẬT thì không làm gì |
| `adminMaintenanceOn` / `adminMaintenanceOff` | Tạm khóa / mở lại app khi cần sửa dữ liệu tay |
| `adminClearLoginPause`, `adminFlushAuthCache` | Đăng nhập bị tạm dừng / phiên lạ sau khi sửa tay sheet Users |
| `caiDat`, `chepNgay`, `kiemTra`, `danhSachNguon` | Script **SaoLuu_Phu** ở tài khoản thứ hai (Phần I) |

## Xử lý sự cố

- **Kết nối báo "App kia từ chối: sai mã kết nối…"**: chép lại mã từ nhật ký `adminCreateFeedKeyIso` của app đó (đủ ký tự, không dấu
  cách); app đó chưa lên bản có `feed.isoEvidence` cũng báo vậy.
- **Kết nối báo "Không nhận được phản hồi đúng từ link /exec"**: link không phải link `/exec` đang dùng của app đó, hoặc app đó chưa
  triển khai "Bất kỳ ai" — mở link đó trên trình duyệt phải thấy chữ `NOT_FOUND` (JSON), không phải trang đăng nhập Google.
- **"Link này là của app khác"**: dán link M&E vào ô Checksheet hoặc ngược lại.
- **App ISO báo lỗi ngay sau khi triển khai 2a** ("Cần quyền…" / không đăng nhập được): chưa cấp quyền — chạy `installTriggers` →
  **Cho phép** (mục "CẬP NHẬT LÊN BẢN 2a" bước 3), rồi tải lại app.
- **Biểu in từ app không có ô ✓**: cuối màn Kết nối xem "biểu in từ app chưa nhận ngày nào" và "mã biểu không có trong danh mục ISO" —
  sửa mã biểu bên app kia (mẫu checksheet: ô Mã biểu mẫu; M&E: bảng ánh xạ `iso_form_map` / mã checklist) cho khớp danh mục ISO.

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
