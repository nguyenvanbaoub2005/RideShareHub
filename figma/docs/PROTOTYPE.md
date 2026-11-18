# RideShareHub — nguyên mẫu tương tác

## Điểm bắt đầu

Mở **08 – Nguyên mẫu tương tác**, rồi chọn:

- **Hành khách** — PA-01, ứng dụng 390 × 844.
- **Tài xế** — DR-01, ứng dụng 390 × 844.
- **Nhà xe** — CO-01, ứng dụng web 1440 × 1024.
- **Quản trị** — AD-01, ứng dụng web 1440 × 1024.

Các điểm bắt đầu tái sử dụng component màn hình gốc. Các trang 00–07, thư viện
component và các màn hình trong chế độ xem tổng hợp vẫn được giữ nguyên.

Chuyển vai trò trên trang 08 giữ trạng thái trong phiên. “Đặt lại toàn bộ phiên”
cần xác nhận và chỉ xóa dữ liệu thử của phiên, không thay đổi màn hình gốc.

Đây là nguyên mẫu phía trình duyệt: không đăng nhập thật, không thanh toán,
không gửi email/SMS, không kết nối GPS và không lưu dữ liệu lên máy chủ.

## Cách chạy các hành trình

### Hành khách

1. Chạm PA-01 hoặc chờ tự chuyển sang PA-02.
2. Nhập email/số điện thoại hợp lệ và mật khẩu từ 8 ký tự.
3. Tìm chuyến ngày mẫu 18/07/2025. Mở bộ lọc rồi áp dụng để trở lại kết quả.
4. Chọn chuyến 07:30 của Nhà xe Thành Công để thuận tiện thử theo dõi.
5. Chọn điểm đón, điểm trả, nhập họ tên/số điện thoại và xem lại đặt chỗ.
6. Xác nhận, ghi nhận mã đặt chỗ, mở “Chuyến của tôi” và chọn đúng mã vừa tạo.
7. Mở theo dõi. Có thể chờ mô phỏng hoặc xác nhận “Kết thúc chuyến (demo)”.
8. Đánh giá chuyến đi, tài xế và nhà xe rồi gửi. Chuyến chuyển sang tab hoàn thành.
9. Thanh dưới mở PA-14 (Thông báo) và PA-16 (Cá nhân).

Chuyến ở xa giờ đi vẫn tuân thủ điều kiện theo dõi. Nút điều khiển nguyên mẫu
ngoài điện thoại cho phép tiến đồng hồ mô phỏng đến gần giờ khởi hành, thay vì
bỏ qua quy tắc thời gian.

Đặt chỗ mới trừ số chỗ còn lại trong phiên; không thể đặt chuyến bị hủy, đã hoàn
thành hoặc thiếu chỗ. Các ghế tự xếp được giữ nhất quán giữa xác nhận, thành công
và chi tiết đặt chỗ. Đánh giá chỉ mở sau khi hoàn thành và không gửi lại được.

### Tài xế

1. Đăng nhập với thông tin hợp lệ.
2. Mở danh sách chuyến, chọn **CH-2043** đang chờ xác nhận.
3. Nhận chuyến trong hộp thoại DR-05, xem lộ trình rồi xác nhận bắt đầu.
4. Mở điểm dừng hiện tại: “Đã đến” → “Đã đón/Đã trả” → xác nhận.
5. Lặp lại cho đến khi mọi điểm dừng hoàn tất, rồi xác nhận hoàn thành chuyến.
6. “Báo sự cố” ở DR-07 mở DR-09; báo cáo hợp lệ có xác nhận và phản hồi thành công.

Không được trả người chưa được đón, xử lý điểm dừng khi chuyến chưa chạy, hoặc
hoàn thành chuyến còn điểm dừng bắt buộc.

### Nhà xe và quản trị: cầu nối phê duyệt

1. Từ CO-01 mở đăng ký.
2. Dùng hồ sơ mới (ví dụ tên “Nhà xe Kết Nối Miền Trung”, mã `0402999888`),
   điền đầy đủ thông tin, đính kèm PDF/JPG/PNG không quá 10 MB rồi gửi.
3. Ở CO-03 chọn **Chuyển sang Admin để duyệt hồ sơ**.
4. Đăng nhập Admin, mở Quản lý nhà xe, tìm đúng mã đăng ký.
5. Xem tài liệu vừa nộp trong AD-04. Chọn phê duyệt hoặc từ chối.
6. Quyết định chỉ cập nhật sau khi xác nhận; từ chối cần lý do.
7. Nếu phê duyệt, chuyển lại vai trò Nhà xe: CO-03 tự chuyển sang CO-04.
   Nếu từ chối, CO-03 hiển thị lý do và vẫn khóa vận hành.

Hồ sơ, tài liệu đã chọn và quyết định được dùng chung giữa hai vai trò trên
trang 08. Không có nút tự cấp quyền phê duyệt cho nhà xe trong phiên dùng chung.
Các trang trình bày độc lập trước đây vẫn có điều khiển mô phỏng riêng.

Sau duyệt, dùng sidebar để đi qua hồ sơ → xe → tài xế → tuyến → chuyến.
Các màn hình danh sách mở được thêm/sửa; lưu giữ dữ liệu trong phiên.
CO-13 lưu nháp hoặc công bố xong mở CO-14 của đúng chuyến vừa lưu.
Từ đây các tab mở đặt chỗ, đón/trả, tối ưu và theo dõi.

Lịch xe/tài xế được kiểm tra cả khi lưu nháp và công bố. Tối ưu phải giữ đầy đủ
điểm dừng, khóa đoạn đã xử lý, giữ đón trước trả và không đổi trạng thái đặt chỗ.

### Quản trị

AD-01 → AD-02 → AD-03 → AD-04. Các thẻ truy cập nhanh ở AD-02 mở AD-05/07/08/09.
AD-05 mở AD-06; khóa/mở khóa đều cần xác nhận. Khóa tài khoản trong phiên được
kiểm tra khi thử đăng nhập Hành khách, Tài xế hoặc Nhà xe với cùng thông tin.

Báo cáo là thống kê MVP từ dữ liệu mẫu theo ngày; không có AI, tài chính,
kế toán hay dự báo.

## Kiểm thử

```sh
pnpm exec tsc --noEmit -p .
node --experimental-strip-types --test tests/*.test.mjs
pnpm build
```

Kiểm thử trình duyệt độc lập dùng Playwright và máy chủ preview đang chạy:

```sh
# Nếu Playwright không có trong môi trường, cài tạm bên ngoài repository:
pnpm --dir /tmp/rideshare-prototype-test add playwright

PLAYWRIGHT_MODULE=/tmp/rideshare-prototype-test/node_modules/playwright/index.mjs \
CHROMIUM_PATH=/usr/bin/chromium \
PROTOTYPE_BASE_URL=http://localhost:3000 \
node tests/prototype-browser.mjs
```

Điều chỉnh `PROTOTYPE_BASE_URL` theo URL của máy chủ hiện có. Không cần khởi động
thêm development server. Nếu dùng browser do Playwright cài sẵn, có thể bỏ
`CHROMIUM_PATH`; nếu Playwright đã được cài trong môi trường, có thể bỏ
`PLAYWRIGHT_MODULE`.
