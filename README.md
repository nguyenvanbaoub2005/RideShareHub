# RideShareHub

RideShareHub là dự án phát triển phần mềm có hỗ trợ AI Agent dành cho một **nền tảng đặt xe ghép đa nhà xe**.

Nền tảng kết nối hành khách, nhà xe, tài xế và quản trị viên trong cùng một hệ thống.

Nhà xe có thể đăng ký trên nền tảng, quản lý phương tiện và tài xế, tạo tuyến, tạo chuyến xe ghép và quản lý booking.

Hành khách có thể tìm kiếm chuyến của nhiều nhà xe khác nhau, so sánh lựa chọn, đặt ghế, chọn điểm đón/trả và theo dõi chuyến đi.

Hệ thống cũng hướng tới việc hỗ trợ tối ưu thứ tự đón và trả hành khách trong cùng một chuyến xe ghép.

---

## Mục tiêu dự án

RideShareHub hướng tới xây dựng một luồng nghiệp vụ hoàn chỉnh:

```text
Nhà xe đăng ký
        ↓
Admin phê duyệt
        ↓
Quản lý xe và tài xế
        ↓
Tạo tuyến
        ↓
Tạo chuyến
        ↓
Đăng chuyến
        ↓
Hành khách tìm kiếm
        ↓
So sánh chuyến
        ↓
Đặt ghế
        ↓
Xác định điểm đón / trả
        ↓
Tối ưu tuyến
        ↓
Tài xế thực hiện chuyến
        ↓
Theo dõi realtime
        ↓
Hoàn thành chuyến
```

Dự án ưu tiên xây dựng một **vertical slice chạy hoàn chỉnh từ đầu đến cuối** thay vì tạo nhiều màn CRUD rời rạc nhưng không kết nối thành một luồng nghiệp vụ thực tế.

---

## Các vai trò chính

### Hành khách — Passenger

Hành khách có thể:

* tìm kiếm chuyến xe;
* xem chuyến của nhiều nhà xe;
* so sánh giá, giờ khởi hành và loại xe;
* chọn nhà xe mong muốn;
* chọn điểm đón và điểm trả;
* đặt một hoặc nhiều ghế;
* theo dõi trạng thái chuyến;
* theo dõi vị trí tài xế;
* hoàn thành chuyến;
* đánh giá tài xế hoặc nhà xe.

---

### Nhà xe — Transport Company

Nhà xe có thể:

* đăng ký tham gia nền tảng;
* quản lý hồ sơ nhà xe;
* quản lý phương tiện;
* quản lý tài xế;
* tạo tuyến;
* tạo chuyến xe;
* đăng chuyến;
* quản lý booking;
* theo dõi quá trình thực hiện chuyến;
* xem thông tin hoạt động của nhà xe.

---

### Tài xế — Driver

Tài xế có thể:

* xem các chuyến được phân công;
* nhận hoặc từ chối chuyến;
* xem danh sách điểm đón/trả;
* xem tuyến được tối ưu;
* bắt đầu chuyến;
* xác nhận đã đón hành khách;
* xác nhận đã trả hành khách;
* gửi vị trí realtime;
* hoàn thành chuyến.

---

### Quản trị viên — Admin

Admin có thể:

* duyệt hoặc từ chối đăng ký nhà xe;
* quản lý người dùng;
* quản lý nhà xe;
* theo dõi chuyến;
* quản lý tài xế;
* kiểm soát các hoạt động cấp nền tảng.

---

# Phương pháp phát triển

RideShareHub sử dụng phương pháp **AI-assisted software engineering theo hướng artifact-driven**.

AI Agent không được xem là nguồn quyết định cuối cùng.

Output của AI chỉ là:

```text
Bản nháp
   ↓
Human Review
   ↓
Accept / Reject / Modify
   ↓
Accepted Artifact
```

Các tài liệu đã được review và lưu trong repository mới được xem là **source of truth** của dự án.

Không sử dụng lịch sử chat cũ để thay thế tài liệu dự án.

---

# Quy trình phát triển bằng AI Agent

Dự án được chia thành 8 giai đoạn:

```text
1. AI trong Kỹ thuật Phần mềm
        ↓
2. Prompt Engineering
        ↓
3. Requirements & Product Analysis
        ↓
4. Product Design
        ↓
5. Software Design & Architecture
        ↓
6. AI Coding & Pair Programming
        ↓
7. Refactoring & Code Review
        ↓
8. Software Testing
```

Mỗi chapter có cấu trúc:

```text
GUIDELINE.md
      ↓
prompts/
      ↓
AI thực hiện task
      ↓
Sinh artifact
      ↓
Human Review
      ↓
Accepted
      ↓
Chapter tiếp theo
```

---

# Trạng thái phát triển hiện tại

Hiện tại dự án đang ở:

```text
Chapter 1
AI in Software Engineering
        ↓
Project Brief

        +

Chapter 2
Prompt Engineering
        ↓
Project Context
```

Ở giai đoạn này chưa coi bất kỳ lựa chọn công nghệ hay kiến trúc triển khai nào là quyết định cuối cùng.

Các quyết định về:

* backend;
* frontend;
* mobile;
* database;
* optimization engine;
* realtime;
* deployment;

sẽ được xác nhận ở các chapter phù hợp sau này.

---

# Cấu trúc Repository

```text
RideShareHub/
│
├── AGENTS.md
├── README.md
├── .gitignore
│
├── .agents/
│   └── rules/
│       ├── project-guide.md
│       └── coding-rules.md
│
├── chapter-01-ai-in-software-engineering/
│   ├── GUIDELINE.md
│   │
│   ├── prompts/
│   │   └── clarify-project-idea.prompt.md
│   │
│   └── docs/
│       └── project-brief.md
│
└── chapter-02-prompt-engineering/
    ├── GUIDELINE.md
    │
    ├── prompts/
    │   └── build-project-context.prompt.md
    │
    └── docs/
        └── project-context.md
```

Các chapter tiếp theo chỉ được thêm khi stage trước đó đã đi qua review gate cần thiết.

---

# AI Agent Entry Point

Mọi AI coding agent khi làm việc với repository phải bắt đầu từ:

```text
AGENTS.md
```

Sau đó đọc:

```text
.agents/rules/project-guide.md
.agents/rules/coding-rules.md
```

và guideline của chapter hiện tại.

Agent không được dựa vào chat history để tự suy đoán yêu cầu dự án.

---

# Source of Truth

Khi các nguồn thông tin mâu thuẫn, sử dụng thứ tự ưu tiên:

```text
Human Decision mới nhất đã được Accepted
        ↓
Accepted Artifact của stage hiện tại
        ↓
Accepted Artifact của stage trước
        ↓
Repository hiện tại
        ↓
Chat history
```

Các tài liệu ở trạng thái:

```text
Draft
```

chưa được xem là canonical.

Chỉ khi:

```text
Status: Accepted
```

thì tài liệu mới được xem là quyết định chính thức của dự án.

---

# Concept chính của RideShareHub

RideShareHub là nền tảng **xe ghép đa nhà xe**.

Ví dụ một nhà xe tạo tuyến:

```text
Đà Nẵng
   ↓
Huế
```

Nhà xe có thể tạo nhiều chuyến:

```text
07:00
09:00
13:00
16:00
```

Hành khách tìm:

```text
Đà Nẵng → Huế
```

sẽ thấy chuyến của nhiều nhà xe khác nhau.

Ví dụ:

```text
Nhà xe A
07:00
150.000đ
Còn 3 ghế

Nhà xe B
07:30
170.000đ
Còn 2 ghế

Nhà xe C
08:00
140.000đ
Còn 4 ghế
```

Passenger có quyền chọn nhà xe/chuyến phù hợp.

---

# Xe ghép

Một chuyến có thể có nhiều hành khách với điểm đón và trả khác nhau.

Ví dụ:

```text
Passenger A
Hải Châu → Huế Center

Passenger B
Thanh Khê → Phú Bài

Passenger C
Liên Chiểu → Huế Center
```

Hệ thống có thể hỗ trợ tối ưu:

```text
Vehicle
   ↓
Pickup A
   ↓
Pickup B
   ↓
Pickup C
   ↓
Drop B
   ↓
Drop A
   ↓
Drop C
```

với các ràng buộc nghiệp vụ như:

```text
Pickup phải trước Dropoff

Không vượt số ghế

Không để Driver chạy hai Trip cùng lúc

Không để Vehicle chạy hai Trip cùng lúc
```

---

# Nguyên tắc làm việc với AI Agent

Không sử dụng prompt kiểu:

```text
Hãy build toàn bộ app RideShareHub.
```

Thay vào đó:

```text
Đọc AGENTS.md.

Đọc guideline của chapter hiện tại.

Đọc các accepted artifacts.

Inspect repository.

Lập kế hoạch.

Chưa code.

Chỉ implement sau khi plan được review.
```

Luồng chuẩn:

```text
Inspect
   ↓
Plan
   ↓
Human Review
   ↓
Implement
   ↓
Test
   ↓
Verify
   ↓
Report
```

---

# Quy tắc hoàn thành

AI Agent không được khẳng định:

```text
Hoàn thành
Đã fix
Đã chạy tốt
Test pass
```

nếu chưa có bằng chứng kiểm chứng mới.

Việc build thành công không tự động chứng minh user journey hoạt động đúng.

---

# Roadmap

Dự án dự kiến phát triển MVP trong 4 tuần.

```text
Tuần 1
Foundation + Nhà xe + Trip

Tuần 2
Search + Booking + Seat Concurrency

Tuần 3
Shared Ride + Route Optimization + Realtime

Tuần 4
Review + Testing + Docker + Demo
```

Chi tiết sprint sẽ được xác định sau khi:

```text
Chapter 1 → Accepted
Chapter 2 → Accepted
Chapter 3 → Requirements
Chapter 4 → Product Design
Chapter 5 → Architecture
```

---

# Trạng thái

```text
Project: RideShareHub

Current Stage:
Chapter 1–2

Implementation:
Chưa bắt đầu

Project Brief:
Draft / Accepted sau Human Review

Project Context:
Draft / Accepted sau Human Review
```
