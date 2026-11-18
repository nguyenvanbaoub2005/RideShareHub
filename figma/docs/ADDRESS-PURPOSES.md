# RideShareHub — phân loại địa chỉ theo nghiệp vụ

## Phạm vi rà soát

| Màn hình / dữ liệu                                            | Mục đích                       | Cách nhập / hiển thị                                                |
| ------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| PA-16: chỉnh sửa hồ sơ cá nhân                                | Hành chính                     | Tỉnh/thành → xã/phường/đặc khu → địa chỉ chi tiết                   |
| CO-02: đăng ký trụ sở nhà xe                                  | Hành chính                     | Cùng cấu trúc, có tìm kiếm và kiểm tra đơn vị phụ thuộc             |
| CO-03, CO-05, AD-04: hồ sơ và tài liệu nhà xe                 | Hành chính, chỉ đọc            | Hiển thị địa chỉ đã định dạng từ cấu trúc hành chính                |
| AD-06: thông tin cá nhân                                      | Hành chính, chỉ đọc            | Địa chỉ hồ sơ; không biến thành điểm đón/trả                        |
| PA-04: điểm đi / điểm đến tìm chuyến                          | Địa điểm vận hành              | Tìm địa danh, địa chỉ, chọn gợi ý hoặc điểm trên bản đồ             |
| PA-08: điểm đón / điểm trả                                    | Địa điểm vận hành              | Địa điểm có tọa độ và chỉ dẫn tùy chọn                              |
| CO-11: đầu tuyến, cuối tuyến, điểm dừng trung gian            | Địa điểm vận hành              | Tìm địa điểm + chọn bản đồ; lưu tọa độ theo thứ tự tuyến            |
| CO-15: thêm đặt chỗ                                           | Địa điểm vận hành              | Địa điểm đón/trả có GPS, không phải ba ô hành chính                 |
| CO-16: sửa điểm đón/trả                                       | Địa điểm vận hành              | Đổi đồng thời địa chỉ, GPS và chỉ dẫn; khóa điểm đã xử lý           |
| PA-09/10/12, DR-04/06/07/08, CO-14/17/18, AD-08               | Đọc/điều phối địa điểm         | Dùng địa chỉ, GPS và ghi chú đã lưu; không yêu cầu nhập lại tỉnh/xã |
| Bộ lọc địa phương, các tên tuyến Đà Nẵng/Huế/Hội An/Quảng Nam | Phạm vi tìm kiếm / tên khu vực | Không coi tất cả các tên khu vực này là tỉnh trong hồ sơ hành chính |

Không bổ sung quản lý văn phòng hoặc chi nhánh. Các màn hình quản lý phương tiện,
tài xế, tài khoản, trạng thái chuyến và các phần không liên quan được giữ nguyên.

## Hai mô hình dữ liệu riêng

### `AdministrativeAddress`

- `provinceId`: mã tỉnh/thành.
- `communeId`: mã xã/phường/đặc khu thuộc tỉnh/thành đó.
- `detail`: số nhà, tên đường, thôn hoặc tổ dân phố.

`changeProvince` luôn xóa `communeId`, nhưng giữ chi tiết người dùng đã nhập.
Kiểm tra mã thực sự thuộc danh mục, không chỉ kiểm tra chuỗi khác rỗng.
Chuỗi địa chỉ để hiển thị được tạo bởi `formatAdministrativeAddress`.
Địa chỉ cá nhân có thể để trống toàn bộ, tránh cản việc sửa thông tin không liên
quan; nếu khai báo thì phải đủ ba phần. Địa chỉ trụ sở nhà xe là bắt buộc.

Danh mục là snapshot hai cấp gồm **34 tỉnh/thành và 3.321 xã/phường/đặc khu**,
được tải từ [Vietnamese Provinces Open API v2](https://provinces.open-api.vn/api/v2/?depth=2).
Ngày chụp và URL nguồn nằm trong `src/address/administrative-catalog.json`.
Ứng dụng dùng dữ liệu cục bộ, không cần gọi API khi nhập hồ sơ; đây không phải
cơ chế tự đồng bộ các thay đổi hành chính tương lai.

Hội An và Quảng Nam vẫn được giữ làm tên khu vực/tuyến trong dữ liệu vận tải,
nhưng không xuất hiện như hai tỉnh độc lập trong biểu mẫu hành chính hai cấp.

### `GeoLocation`

- `label`, `address`: tên và mô tả địa chỉ.
- `lat`, `lng`: vĩ độ/kinh độ WGS84.
- `kind`: `area` cho phạm vi tìm chuyến/đầu tuyến, `point` cho điểm đón/trả.
- `source`: gợi ý trong danh mục hay điểm do người dùng chọn trên bản đồ.
- `instructions`: chỉ dẫn tùy chọn cho tài xế.
- `provinceId`, `communeId`: ngữ cảnh nhận diện được, **không phải điều kiện bắt buộc đặt chỗ**.

Không chấp nhận chỉ nhập một tên địa điểm mà chưa chọn gợi ý hoặc bản đồ.
Sửa truy vấn tìm kiếm sẽ bỏ tọa độ cũ; chọn lại địa điểm mới mới tạo giá trị hợp lệ.
Điểm đón/trả bắt buộc là `point`, không dùng tâm khu vực tìm chuyến làm điểm đón.

Các chuỗi `pickup`, `dropoff`, `origin`, `destination` vẫn được giữ cho bảng, tên
tuyến và dữ liệu tương thích, nhưng các thao tác mới lưu kèm đối tượng địa điểm.
Các trường `pickupCustom/dropoffCustom` cũ không còn là giao diện nhập điểm đón/trả.

## Bản đồ và giới hạn minh bạch

- Bộ chọn bản đồ đổi vị trí nhấp/tâm bản đồ thành GPS bằng phép chiếu Web Mercator.
- Có phóng/thu, dịch chuyển và nút chọn tâm để sử dụng không chỉ bằng chuột.
- Lớp nền dùng ô bản đồ OpenStreetMap và có ghi công. Khi không tải được ảnh nền,
  việc chọn tọa độ vẫn hoạt động; ảnh nền cần kết nối mạng.
- Gợi ý tên/địa chỉ hiện là **danh mục địa điểm mẫu miền Trung**, không phải dịch vụ
  geocoding hoặc reverse-geocoding toàn quốc.
- Chỉ nhận diện tỉnh/xã từ ngữ cảnh khi tọa độ ở gần một địa điểm mẫu đã biết.
  Ngoài vùng biết rõ, không tự gán một xã/phường giả và không bắt chọn lại tỉnh/xã.
  Người dùng có thể mô tả địa chỉ và thêm chỉ dẫn cho điểm đã ghim.
- Tọa độ POI mẫu mang tính minh họa, cần kiểm chứng trước khi vận hành thật.
- Khoảng cách tối ưu được tính từ GPS theo đường chim bay, không phải chỉ đường
  theo mạng lưới giao thông. Không tích hợp AI hoặc dịch vụ định tuyến mới.

## Bảo toàn dữ liệu điều phối

`updateBookingStops` cập nhật nguyên tử địa chỉ, đối tượng địa điểm và tọa độ hiển
thị của các điểm chưa xử lý. Không giữ bộ tọa độ cũ khi đổi địa điểm.
Thứ tự và trạng thái đặt chỗ/điểm dừng không thay đổi vì thao tác sửa địa điểm.

Tối ưu yêu cầu các điểm đã có GPS, giữ đầy đủ điểm, giữ đón trước trả và giữ nguyên
địa chỉ, GPS, chỉ dẫn, trạng thái. Dữ liệu vị trí được dùng lại ở các bước xác nhận,
chi tiết, danh sách điểm dừng và màn hình giám sát.

Mọi dữ liệu người dùng vẫn chỉ ở trong phiên nguyên mẫu, không gửi địa chỉ người
dùng đến dịch vụ geocoding và không lưu lên máy chủ. Yêu cầu ô bản đồ nền chỉ mang
tọa độ ô bản đồ, không mang họ tên hoặc địa chỉ chi tiết.

## Kiểm tra

```sh
pnpm exec tsc --noEmit -p .
node --experimental-strip-types --test tests/*.test.mjs
pnpm build

# Với máy chủ preview đã chạy và Playwright có sẵn:
PLAYWRIGHT_MODULE=/tmp/rideshare-address-test/node_modules/playwright/index.mjs \
CHROMIUM_PATH=/usr/bin/chromium \
node tests/address-browser.mjs
```

`tests/prototype-browser.mjs` cũng đã được cập nhật cách chọn địa điểm mới để
kiểm tra hồi quy bốn hành trình mà không quay về ô địa chỉ tự do.
