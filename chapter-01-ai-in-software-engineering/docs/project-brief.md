# RideShareHub — Project Brief

**Status:** Draft — Pending Human Review

## 1. Product Vision

RideShareHub là nền tảng đặt xe ghép đa nhà xe.

Nền tảng kết nối:

* hành khách có nhu cầu đi xe ghép;
* các nhà xe cung cấp chuyến xe;
* tài xế trực tiếp thực hiện chuyến;
* quản trị viên kiểm soát hoạt động nền tảng.

Nhà xe có thể đăng ký trên hệ thống, quản lý phương tiện, tài xế, tuyến và các chuyến xe.

Hành khách có thể tìm kiếm chuyến đi của nhiều nhà xe khác nhau, so sánh giờ khởi hành, giá, loại xe, số ghế còn lại và đánh giá trước khi đặt chỗ.

Điểm khác biệt so với hệ thống bán vé xe thông thường là một chuyến có thể hỗ trợ nhiều điểm đón/trả khác nhau và hệ thống có thể tối ưu thứ tự đón/trả hành khách.

---

## 2. Problem

Việc đặt xe ghép hiện nay thường được thực hiện qua điện thoại, mạng xã hội hoặc trao đổi trực tiếp với từng nhà xe.

Điều này tạo ra một số vấn đề:

* hành khách khó tìm và so sánh nhiều nhà xe;
* khó biết chính xác chuyến nào còn ghế;
* nhà xe quản lý chuyến và booking thủ công;
* dễ xảy ra tình trạng đặt quá số ghế;
* việc sắp xếp thứ tự đón/trả phụ thuộc nhiều vào kinh nghiệm tài xế;
* hành khách khó theo dõi trạng thái chuyến;
* nhà xe khó quản lý nhiều xe và nhiều tài xế cùng lúc.

RideShareHub cung cấp một nền tảng chung để số hóa các nghiệp vụ này.

---

## 3. Target Users

### Passenger

Người cần tìm và đặt chuyến xe ghép.

Passenger có thể:

* tìm kiếm chuyến;
* chọn nhà xe;
* xem thông tin xe;
* xem giá;
* đặt số ghế;
* cung cấp điểm đón/trả;
* theo dõi chuyến;
* đánh giá sau chuyến đi.

### Transport Company

Nhà xe sử dụng nền tảng để cung cấp dịch vụ xe ghép.

Transport Company có thể:

* đăng ký nhà xe;
* quản lý hồ sơ doanh nghiệp;
* quản lý phương tiện;
* quản lý tài xế;
* tạo tuyến;
* tạo chuyến;
* quản lý booking;
* theo dõi chuyến;
* xem thống kê hoạt động.

### Driver

Tài xế thuộc một nhà xe.

Driver có thể:

* xem chuyến được giao;
* nhận chuyến;
* xem danh sách pickup/dropoff;
* cập nhật trạng thái chuyến;
* cập nhật trạng thái đón/trả hành khách;
* gửi vị trí realtime.

### Admin

Quản trị viên nền tảng.

Admin có thể:

* duyệt đăng ký nhà xe;
* quản lý user;
* quản lý nhà xe;
* quản lý tài xế;
* quản lý chuyến;
* theo dõi vi phạm;
* xử lý report cơ bản.

---

## 4. Core Business Journey

### Nhà xe

Transport Company
→ Register Company
→ Admin Approval
→ Add Vehicle
→ Add Driver
→ Create Route
→ Create Trip
→ Publish Trip.

### Hành khách

Passenger
→ Search Trip
→ Compare Transport Companies
→ Select Trip
→ Select Seats
→ Select Pickup/Dropoff
→ Book
→ Track Trip
→ Pickup
→ Dropoff
→ Complete
→ Rating.

### Tài xế

Driver
→ Receive Assigned Trip
→ Accept
→ Start Trip
→ Pickup Passengers
→ Dropoff Passengers
→ Complete Trip.

---

## 5. Core Scope — V1

### 5.1 Authentication & Authorization

Các role:

* PASSENGER
* TRANSPORT_COMPANY
* DRIVER
* ADMIN

Hệ thống phải kiểm soát quyền theo role.

---

### 5.2 Transport Company Registration

Nhà xe có thể tạo yêu cầu đăng ký.

Thông tin cơ bản:

* tên nhà xe;
* số điện thoại;
* địa chỉ;
* thông tin người đại diện;
* thông tin doanh nghiệp.

Trạng thái:

PENDING
→ APPROVED

hoặc:

PENDING
→ REJECTED.

Chỉ nhà xe APPROVED mới được tạo chuyến công khai.

---

### 5.3 Vehicle Management

Nhà xe quản lý phương tiện.

Vehicle bao gồm:

* license plate;
* vehicle type;
* seat capacity;
* description;
* status.

Vehicle status:

AVAILABLE
IN_USE
MAINTENANCE
INACTIVE.

---

### 5.4 Driver Management

Nhà xe quản lý tài xế thuộc nhà xe.

Driver có:

* personal information;
* driving license information;
* assigned company;
* availability status.

---

### 5.5 Route Management

Nhà xe định nghĩa tuyến cơ bản.

Ví dụ:

Da Nang
→ Hue.

Route chứa:

* origin;
* destination;
* estimated duration;
* default fare hoặc pricing reference.

Route không phải là một chuyến cụ thể.

---

### 5.6 Trip Management

Nhà xe tạo chuyến cụ thể từ một Route.

Ví dụ:

Route:
Da Nang → Hue

Trip:
20/10/2026
07:00

Vehicle:
43A-12345

Driver:
Driver A

Available seats:
6

Price:
150,000 VND.

Trip state:

DRAFT
→ PUBLISHED
→ FULL
→ IN_PROGRESS
→ COMPLETED

và có thể:

CANCELLED.

---

### 5.7 Search & Filtering

Passenger tìm kiếm theo:

* origin;
* destination;
* date.

Có thể filter/sort theo:

* transport company;
* departure time;
* price;
* available seats;
* vehicle type;
* rating.

Search result có thể chứa chuyến của nhiều nhà xe khác nhau.

Passenger là người chọn nhà xe/chuyến muốn đặt.

---

### 5.8 Booking

Passenger đặt một hoặc nhiều ghế.

Booking chứa:

* passenger;
* trip;
* seat count;
* pickup location;
* dropoff location;
* estimated fare;
* status.

Hệ thống không được cho phép số ghế đã booking vượt capacity của Trip.

Booking state:

PENDING
→ CONFIRMED
→ PICKED_UP
→ COMPLETED.

Có thể:

CANCELLED
NO_SHOW.

---

## 5.9 Seat Availability

Seat availability là dữ liệu nghiệp vụ quan trọng.

availableSeats =
vehicleCapacity - activeBookedSeats.

Hai booking đồng thời không được phép làm số ghế vượt capacity.

Concurrency phải được xử lý ở backend.

---

## 5.10 Shared Pickup & Dropoff

Passenger trong cùng một chuyến có thể có điểm đón/trả khác nhau.

Ví dụ:

Passenger A:
Hai Chau → Hue Center

Passenger B:
Thanh Khe → Phu Bai

Passenger C:
Lien Chieu → Hue Center.

Hệ thống phải xây dựng danh sách TripStop gồm:

PICKUP
và
DROPOFF.

Pickup của passenger luôn phải xảy ra trước dropoff của passenger đó.

---

## 5.11 Route Optimization

Route Optimizer hỗ trợ nhà xe/tài xế sắp xếp thứ tự TripStop.

Input:

* current vehicle location;
* pickup locations;
* dropoff locations;
* pickup time constraints;
* vehicle capacity.

Output:

* ordered TripStop list;
* estimated distance;
* estimated duration.

Optimization hỗ trợ quyết định.

Human vẫn có quyền review kế hoạch trước khi trip bắt đầu.

---

## 5.12 Trip Execution

Driver thực hiện:

ASSIGNED
→ ACCEPTED
→ READY
→ IN_PROGRESS
→ COMPLETED.

Mỗi TripStop có thể có trạng thái:

PENDING
→ ARRIVED
→ COMPLETED.

Với PICKUP:

COMPLETED nghĩa là passenger đã lên xe.

Với DROPOFF:

COMPLETED nghĩa là passenger đã xuống xe.

---

## 5.13 Realtime Tracking

Trong chuyến:

Driver gửi location định kỳ.

Passenger có thể xem:

* driver location;
* trip status;
* next stop;
* estimated arrival.

V1 chỉ cần realtime đủ để demo workflow.

---

## 5.14 Fare

V1 có fare calculation.

Fare có thể phụ thuộc:

* route;
* pickup/dropoff;
* distance;
* transport company pricing.

V1 chưa yêu cầu tích hợp payment gateway production.

---

## 5.15 Rating

Passenger có thể đánh giá:

* Transport Company;
* Driver.

Rating được thực hiện sau khi booking hoàn thành.

---

## 6. Important Business Rules

Một Vehicle chỉ thuộc một Transport Company tại một thời điểm.

Một Driver chỉ thuộc một Transport Company trong V1.

Một Trip phải thuộc một Route.

Một Trip phải có Vehicle.

Một Trip phải có Driver trước khi bắt đầu.

Vehicle phải đủ capacity cho các booking.

Không cho phép overbooking.

Transport Company chưa được APPROVED không được publish Trip.

Passenger không được book Trip đã CANCELLED hoặc COMPLETED.

Pickup của Passenger phải xảy ra trước Dropoff.

Driver không được có hai Trip đang chạy đồng thời.

Vehicle không được có hai Trip đang chạy đồng thời.

Trip chỉ COMPLETED khi tất cả TripStop cần thiết đã được xử lý.

---

## 7. V1 Exclusions

Không làm trong V1:

* payment gateway thật;
* banking settlement;
* ví điện tử production;
* KYC tự động;
* bảo hiểm;
* dynamic pricing phức tạp;
* surge pricing;
* chat;
* referral;
* loyalty points;
* coupon system lớn;
* demand prediction;
* automatic creation of new trips from passenger demand;
* autonomous dispatch không có human review;
* multi-country operation;
* fraud detection production.

---

## 8. Possible V2

### On-demand Shared Ride Matching

Passenger không tìm thấy chuyến phù hợp có thể tạo Ride Demand.

Hệ thống gom:

RideRequest A

* RideRequest B
* RideRequest C

→ phát hiện nhu cầu cùng tuyến

→ đề xuất Transport Company mở Trip.

### Dynamic Passenger Insertion

Trong lúc Trip chưa rời khu vực pickup, một passenger mới có thể được đánh giá để thêm vào Trip nếu:

* còn ghế;
* cùng hướng;
* detour đủ nhỏ;
* không vi phạm thời gian của passenger hiện tại.

### Advanced Route Optimization

Có thể sử dụng:

* traffic;
* time windows;
* max detour;
* historical travel time.

---

## 9. Success Criteria

V1 được coi là thành công khi demo được journey:

Transport Company đăng ký
→ Admin approve
→ Company thêm Vehicle
→ Company thêm Driver
→ Company tạo Route
→ Company tạo Trip
→ Trip được publish
→ Passenger search
→ thấy Trip của nhiều Company
→ Passenger chọn Trip
→ book seat
→ hệ thống cập nhật available seats
→ nhiều passenger có pickup/dropoff khác nhau
→ system optimize TripStops
→ Driver nhận Trip
→ Trip bắt đầu
→ realtime status/location
→ pickup passengers
→ dropoff passengers
→ Trip COMPLETED
→ Passenger rating.

---

## 10. Time Constraint

Mục tiêu phát triển MVP:

4 tuần.

Ưu tiên:

một core journey chạy thật end-to-end

hơn là:

nhiều màn hình CRUD nhưng không kết nối thành workflow hoàn chỉnh.

---

## 11. Open Questions

Các mục sau cần được quyết định trước khi trở thành canonical requirement:

* dùng một app mobile cho Passenger + Driver hay tách hai app;
* Transport Company dùng web hay mobile;
* Admin dùng web riêng hay chung Transport Company frontend;
* Map provider;
* distance/routing provider;
* formula tính fare;
* passenger có chọn ghế cụ thể hay chỉ chọn số lượng ghế;
* booking confirm ngay hay Transport Company phải accept;
* cancellation cutoff;
* realtime location frequency;
* maximum deviation cho pickup/dropoff;
* V1 có cần payment simulation hay chỉ fare calculation.
