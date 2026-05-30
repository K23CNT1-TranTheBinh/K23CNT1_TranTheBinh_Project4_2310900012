# 🎟️ EVENT TICKET BOOKING PLATFORM - Framework Template
## Hệ Thống Bán Vé Sự Kiện BDHT - Khung Dự Án

> Mô tả nền tảng quản lý và đặt vé sự kiện trực tuyến của bạn tại đây. Thêm thông tin chi tiết về kiến trúc, công nghệ và mục đích dự án.

---

## 📋 MỤC LỤC (Table of Contents)

1. [Thông Tin Dự Án](#1-thông-tin-dự-án)
2. [Phân Công Đội Ngũ (Team Structure)](#2-phân-công-đội-ngũ--team-structure)
3. [Kiến Trúc Hệ Thống (Architecture)](#3-kiến-trúc-hệ-thống--architecture)
4. [Cấu Trúc Thư Mục (Project Structure)](#4-cấu-trúc-thư-mục--project-structure)
5. [Hướng Dẫn Cài Đặt (Installation)](#5-hướng-dẫn-cài-đặt--installation)
6. [API Endpoints](#6-api-endpoints)
7. [Tính Năng Nổi Bật (Features)](#7-tính-năng-nổi-bật--features)
8. [Công Nghệ & Stack (Technology Stack)](#8-công-nghệ--stack--technology-stack)
9. [Quy Trình Phát T## 1. THÔNG TIN DỰ ÁN

| Tiêu Chí | Chi Tiết |
|---------|--------|
| **Tên Dự Án** | Event Ticket Booking Platform (BDHT) - Hệ Thống Bán Vé Sự Kiện Trực Tuyến |
| **Mục Đích** | Xây dựng nền tảng quản lý sự kiện và đặt vé xem ca nhạc, thể thao trực tuyến thời gian thực với đầy đủ 77 tính năng đạt chuẩn nghiệp vụ. |
| **Công Nghệ Backend** | Java Spring Boot (Spring Security, Spring Data JPA, JWT Token, Hibernate) |
| **Công Nghệ Frontend** | HTML5, Vanilla CSS, JavaScript thuần kết hợp Tailwind CSS CDN |
| **Cơ Sở Dữ Liệu** | Microsoft SQL Server (12 bảng ánh xạ tối ưu, chống bán vượt vé bằng Optimistic Locking `@Version`) |
| **Bảo Mật** | JWT Authentication, BCrypt Password Hashing, Phân quyền chặt chẽ theo vai trò (Role-based Authorization) |
| **Xác Thực Phân Quyền** | Tách biệt hoàn toàn luồng API công khai (Public) và luồng API bắt buộc xác thực (Member / Admin) |
| **Số Thành Viên** | 4 Thành viên (2 Backend, 2 Frontend) |

---

## 2. PHÂN CÔNG ĐỘI NGŨ (Team Structure)

Dự án được phân chia nhiệm vụ vô cùng khoa học, phân định rõ ràng các chức năng theo cấu trúc tiền tố tên viết tắt của từng thành viên trong nhóm nhằm giảm thiểu tối đa xung đột mã nguồn:

### 👨‍💼 Đội Backend
*   **Vũ Tiến Đức (Backend User & Core Systems - `Vtd` prefix)**:
    *   Thiết kế hệ thống cơ sở dữ liệu chính (12 bảng SQL Server).
    *   Xây dựng hệ thống Xác thực bảo mật (Security Config, JWT Token, Đăng ký/Đăng nhập, OTP Reset mật khẩu, Đăng nhập mạng xã hội).
    *   Viết APIs cho luồng Khách hàng (Đăng ký, Đăng nhập, Xem Sự kiện, Chi tiết, Đặt vé, Thanh toán, Voucher).
    *   Tích hợp dịch vụ gửi Mail thông báo hóa đơn, QR Code vé điện tử.
*   **Trần Thế Bình (Backend Admin & Dashboard - `Ttb` prefix)**:
    *   Xây dựng APIs Quản trị hệ thống (Thống kê Dashboard doanh thu, số lượng đơn hàng, biểu đồ tăng trưởng).
    *   Viết các bộ API CRUD quản lý Sự kiện, Người dùng, Vé, Đơn hàng, Voucher Khuyến mại, Quản lý Địa điểm (Venues) và Hình ảnh sự kiện.
    *   Thiết kế luồng API Check-in soát vé qua mã QR Code.

### 👨‍🎨 Đội Frontend
*   **Nguyễn Anh Tuấn (Frontend User - `nat-` prefix)**:
    *   Thiết kế toàn bộ giao diện khách hàng phía trước (Trang chủ `nat-index.html`, Đăng nhập `nat-login.html`, Đăng ký `nat-register.html`, Chi tiết sự kiện `nat-event-detail.html`).
    *   Xây dựng trang giỏ hàng, trang điền thông tin khách hàng và lựa chọn thanh toán `nat-checkout.html`.
    *   Xây dựng trang hiển thị VietQR thanh toán `nat-payment.html`, trang hồ sơ cá nhân `nat-profile.html` và lịch sử đặt vé `nat-dashboard.html`.
    *   Thiết kế Widget AI Chatbot tư vấn khách hàng trực quan.
*   **Lê Phan Trung Hiếu (Frontend Admin - `lpth_` prefix)**:
    *   Xây dựng toàn bộ trang giao diện trang quản trị hệ thống Admin.
    *   Thiết kế trang biểu đồ doanh thu `lpth_dashboard.html`, quản lý sự kiện `lpth_manage-events.html` và quản lý hình ảnh `lpth_manage-event-images.html`.
    *   Xây dựng trang quản lý Đơn hàng `lpth_manage-orders.html`, Quản lý Mã giảm giá `lpth_manage-promotions.html`, Quản lý Đánh giá `lpth_manage-reviews.html`, Quản lý Vé `lpth_manage-tickets.html`, Quản lý Người dùng `lpth_manage-users.html` và Quản lý Địa điểm `lpth_manage-venues.html`.
    *   Tích hợp script bảo vệ bảo mật Admin `lpth_admin-auth.js` chạy trước khi kết xuất giao diện để chống truy cập trái phép.

---

## 3. KIẾN TRÚC HỆ THỐNG (Architecture)

### 🔐 Authentication Flow
1. **Đăng nhập**: Khách hàng nhập email/mật khẩu -> Frontend gửi POST yêu cầu đến `/api/vtd/public/auth/login`.
2. **Cấp Token**: Backend xác thực thông tin, mã hóa mật khẩu, kiểm tra trạng thái hoạt động và trả về JWT Token chứa Email & Role cùng thông tin User.
3. **Lưu trữ**: Frontend lưu JWT Token vào `localStorage` dưới khóa `authToken`.
4. **Đính kèm Request**: Với mọi request yêu cầu quyền hạn (MEMBER/ADMIN), API Client (`nat-api-client.js`) tự động đính kèm Token vào Header: `Authorization: Bearer {token}`.
5. **Xác thực**: Bộ lọc `JwtAuthenticationFilter` phía Backend bắt lấy header, kiểm tra chữ ký và tính hợp lệ của token trước khi chuyển tiếp yêu cầu đến Controller xử lý.

### 🏗️ Kiến Trúc Tổng Thể
Ứng dụng được thiết kế theo kiến trúc **Client-Server hoàn toàn tách biệt (Decoupled Architecture)** giúp tối ưu hóa hiệu suất và bảo mật:
*   **Frontend**: Client-side thuần tĩnh chạy độc lập, giao tiếp với Server 100% bằng cơ chế gọi API phi đồng bộ (Asynchronous AJAX Fetch).
*   **Backend**: API Server không lưu trạng thái (Stateless), phục vụ dữ liệu chuẩn định dạng JSON, bảo vệ tài nguyên bằng Spring Security.

---

## 🗂️ 4. CẤU TRÚC THƯ MỤC CHI TIẾT (Project Structure)

Dự án áp dụng mô hình Workspace phân tách triệt để 2 phân hệ độc lập: **Backend** và **Frontend**. 

```text
EventTicket_BDHT_Project/
│
├── backend-api/                               # ☕ JAVA SPRING BOOT BACKEND
│   ├── pom.xml                                # Thư viện Maven (Lombok, Security, JPA, SQL Server)
│   └── src/main/java/com/eventticket/
│       ├── config/                            # Cấu hình chung (CorsConfig, MailConfig, AiChatProperties)
│       ├── security/                          # Bảo mật: JwtUtil, SecurityConfig, JwtAuthenticationFilter
│       │
│       ├── controller/                        # 🎯 TẦNG GIAO TIẾP (Phân chia URL theo vai trò & Tiền tố)
│       │   ├── admin/                         # Bộ API dành cho ADMIN (prefix: Ttb)
│       │   │   ├── TtbAdminDashboardController.java
│       │   │   ├── TtbAdminEventController.java
│       │   │   ├── TtbAdminOrderController.java
│       │   │   ├── TtbAdminPromotionController.java
│       │   │   ├── TtbAdminReviewController.java
│       │   │   ├── TtbAdminTicketController.java
│       │   │   ├── TtbAdminTicketTypeController.java
│       │   │   ├── TtbAdminUserController.java
│       │   │   ├── TtbAdminVenueController.java
│       │   │   └── TtbEventImageController.java
│       │   └── user/                          # Bộ API dành cho USER/PUBLIC (prefix: Vtd)
│       │       ├── AiChatController.java
│       │       ├── VtdAuthController.java
│       │       ├── VtdEventController.java
│       │       ├── VtdHomeController.java
│       │       ├── VtdOrderController.java
│       │       ├── VtdPaymentController.java
│       │       ├── VtdPromotionController.java
│       │       ├── VtdReviewController.java
│       │       ├── VtdTicketController.java
│       │       ├── VtdUserProfileController.java
│       │       └── VtdVenueController.java
│       │   
│       ├── service/                           # 🧠 TẦNG NGHIỆP VỤ LOGIC (prefix: Vtd / Ttb)
│       │   ├── admin/                         # Service quản trị (TtbAdminEvents, TtbAdminOrders...)
│       │   └── user/                          # Service người dùng (VtdAuthService, VtdEmailService...)
│       │
│       ├── repository/                        # 🗄️ TẦNG GIAO TIẾP DATABASE (JPA Interfaces)
│       │   └── (EventRepository, UserRepository, TicketRepository...)
│       │
│       └── entity/                            # Ánh xạ JPA 12 bảng dữ liệu SQL Server (prefix: G8_)
│           ├── G8_users.java
│           ├── G8_event.java
│           └── (G8_order, G8_ticket, G8_payment...)
│
└── frontend-web/                              # 🎨 HTML/CSS/JS FRONTEND THUẦN TĨNH
    │
    ├── pages/                                 # 🖥️ GIAO DIỆN HIỂN THỊ (VIEWS)
    │   ├── nat-index.html                     # Trang chủ chính của toàn bộ hệ thống (Giao diện bởi Tuấn)
    │   │
    │   ├── admin/                             # Giao diện Quản trị Admin (Giao diện bởi Hiếu)
    │   │   ├── layout.html                    # Bộ khung thiết kế nháp
    │   │   ├── lpth_dashboard.html            # Tổng quan biểu đồ doanh số
    │   │   ├── lpth_manage-events.html        # Danh sách & chỉnh sửa sự kiện
    │   │   ├── lpth_manage-event-images.html  # Album ảnh sự kiện
    │   │   ├── lpth_manage-orders.html        # Danh sách đơn hàng mua vé
    │   │   ├── lpth_manage-promotions.html    # Cài đặt mã coupon
    │   │   ├── lpth_manage-reviews.html       # Kiểm duyệt bình luận đánh giá
    │   │   ├── lpth_manage-tickets.html       # Soát vé soát QR code
    │   │   ├── lpth_manage-users.html         # Danh sách quản lý thành viên
    │   │   └── lpth_manage-venues.html        # Địa điểm tổ chức
    │   │
    │   └── user/                              # Giao diện Phân hệ Khách hàng (Giao diện bởi Tuấn)
    │       ├── nat-all-events.html            # Danh sách và bộ lọc tìm kiếm sự kiện
    │       ├── nat-event-detail.html          # Chi tiết sự kiện & đặt vé
    │       ├── nat-checkout.html              # Điền thông tin cá nhân & Coupon giảm giá
    │       ├── nat-payment.html               # Hiện VietQR chuyển khoản ngân hàng
    │       ├── nat-dashboard.html             # Lịch sử đơn hàng, kho vé điện tử & QR
    │       ├── nat-profile.html               # Cập nhật thông tin tài khoản
    │       ├── nat-news.html                  # Danh sách tin tức
    │       ├── nat-news-detail.html           # Chi tiết bài viết tin tức
    │       ├── nat-login.html                 # Đăng nhập hệ thống
    │       ├── nat-register.html              # Đăng ký tài khoản mới
    │       └── nat-reset-password.html        # Quên mật khẩu & nhập OTP gửi từ email
    │
    ├── assets/
    │   ├── css/                               # Thư mục style (Biến màu sắc chung, glassmorphism)
    │   │   └── style.css
    │   └── js/                                # 🧠 CHỨC NĂNG XỬ LÝ (JAVASCRIPT THUẦN)
    │       ├── core/
    │       │   └── nat-api-client.js          # File xương sống: Gọi Fetch API, chèn JWT Token tự động
    │       ├── admin/                         # Logic Admin (prefix: lpth_)
    │       │   ├── lpth_admin-auth.js         # Bảo vệ chặn trang khi chưa đăng nhập Admin
    │       │   ├── lpth_manage-events.js      # Gọi API cập nhật sự kiện
    │       │   └── (lpth_manage-users.js, lpth_manage-orders.js...)
    │       └── user/                          # Logic Khách hàng (prefix: nat_)
    │           ├── nat-home.js                # Render trang chủ, slider, marquee, phân trang
    │           ├── nat-event-detail.js        # Chọn loại vé, gửi đánh giá
    │           ├── nat-checkout.js            # Validate thông tin, áp coupon, tạo đơn hàng
    │           └── (nat-auth.js, nat-profile.js, nat-ai-chat.js...)
    │
    └── components/                            # Giao diện dùng chung tải động bằng JavaScript
        ├── nat-header.html                    # Thanh điều hướng phía trên
        ├── nat-footer.html                    # Chân trang thông tin liên hệ
        └── nat-chat-widget.html               # Giao diện khung Chatbot AI
```

---

## 5. HƯỚNG DẪN CÀI ĐẶT (Installation)

### Yêu Cầu Hệ Thống
- **Java**: JDK 17+
- **Maven**: 3.8.1+
- **MS SQL Server**: 2019+
- **Git**: Latest
- **VS Code** hoặc IDE tương tự

### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/EventTicket_BDHT_Project.git
cd EventTicket_BDHT_Project
```

### Step 2: Setup Database
1. Mở SSMS (SQL Server Management Studio)
2. Chạy script: `database/event_ticket.sql`
3. Kiểm tra database `Event_Ticket_BDHT` được tạo

### Step 3: Setup Backend
```bash
cd backend-api

# Cài dependencies
mvn clean install

# Cấu hình database
# Edit: src/main/resources/application.properties
# spring.datasource.url=jdbc:sqlserver://localhost:1433;databaseName=Event_Ticket_BDHT
# spring.datasource.username=your_username
# spring.datasource.password=your_password
# app.jwt.secret=your_secret_key_min_32_chars
# app.jwt.expiration=86400000

# Chạy
mvn spring-boot:run
# Backend: http://localhost:8080
```

### Step 4: Setup Frontend
```bash
cd ../frontend-web

# Dùng Live Server (VS Code)
# Right-click index.html → "Open with Live Server"
# Frontend: http://localhost:5500

# Hoặc Python
python -m http.server 8000
# Frontend: http://localhost:8000
```

### Step 5: Kiểm Tra
```bash
curl -X GET http://localhost:8080/api/public/events
# Response: [{...events...}]
```

---

## 6. DANH SÁCH API ENDPOINTS (Tổng số: 111 APIs)

Hệ thống cung cấp tổng cộng **111 API Endpoints** được phân tách chặt chẽ theo phân hệ người dùng và quyền hạn truy cập:

---

### 👨‍💼 1. PHÂN HỆ USER & PUBLIC (Vũ Tiến Đức - 62 APIs)

Nhóm API phục vụ cho luồng nghiệp vụ khách hàng (Public và Member có JWT Token).

#### 🔓 A. Luồng Công Khai (Public - Không yêu cầu Token)
*   **Xác thực và Đăng ký tài khoản (`VtdAuthController`)**:
    *   `POST /api/vtd/public/auth/register` - Đăng ký thành viên mới.
    *   `POST /api/vtd/public/auth/login` - Đăng nhập tài khoản, nhận về JWT Token.
    *   `POST /api/vtd/public/auth/social-login` - Đăng nhập qua mạng xã hội (Google OAuth2).
    *   `POST /api/vtd/public/auth/logout` - Đăng xuất hệ thống.
    *   `POST /api/vtd/public/auth/forgot-password` - Yêu cầu mã OTP khôi phục mật khẩu.
    *   `POST /api/vtd/public/auth/verify-otp` - Xác minh mã OTP đã gửi qua email.
    *   `POST /api/vtd/public/auth/reset-password` - Thiết lập mật khẩu mới sau khi xác thực OTP thành công.
*   **Trang chủ và Danh mục (`VtdHomeController`)**:
    *   `GET /` - Phục vụ tệp HTML trang chủ (`nat-index.html`).
    *   `GET /api/vtd/public/home` - Lấy dữ liệu tổng hợp trang chủ (Slide banner, sự kiện HOT, mới nhất).
    *   `GET /api/vtd/public/home/categories` - Danh sách các danh mục sự kiện hoạt động.
*   **Tìm kiếm và Lọc sự kiện (`VtdEventController`)**:
    *   `GET /api/vtd/public/events` - Phân trang danh sách sự kiện đã công bố (`PUBLISHED`).
    *   `GET /api/vtd/public/events/{eventId}` - Xem thông tin chi tiết một sự kiện.
    *   `GET /api/vtd/public/events/featured` - Danh sách các sự kiện tiêu điểm nổi bật.
    *   `GET /api/vtd/public/events/search` - Tìm kiếm sự kiện theo từ khóa (tên nghệ sĩ, tên show).
    *   `GET /api/vtd/public/events/category/{categoryName}` - Lọc sự kiện theo danh mục.
    *   `GET /api/vtd/public/events/date-range` - Lọc sự kiện trong khoảng thời gian.
    *   `GET /api/vtd/public/events/time-filter` - Bộ lọc nhanh: Hôm nay, tuần này, tháng này.
    *   `GET /api/vtd/public/events/{eventId}/venue` - Xem chi tiết địa điểm của sự kiện.
    *   `GET /api/vtd/public/events/{eventId}/images` - Xem thư viện ảnh sự kiện.
*   **Khuyến mãi và Đánh giá (`VtdPromotionController` & `VtdReviewController`)**:
    *   `POST /api/vtd/public/promotions/validate` - Kiểm tra tính khả dụng của mã Voucher.
    *   `POST /api/vtd/public/promotions/calculate-discount` - Tính toán số tiền được giảm giá dựa trên giỏ hàng.
    *   `GET /api/vtd/public/events/{eventId}/reviews` - Lấy danh sách bình luận đánh giá sự kiện.
    *   `GET /api/vtd/public/events/{eventId}/reviews/average` - Xem điểm đánh giá trung bình (sao).
*   **Địa điểm và Chatbot AI (`VtdVenueController` & `AiChatController`)**:
    *   `GET /api/vtd/public/venues/{venueId}` - Lấy thông tin chi tiết địa điểm.
    *   `GET /api/vtd/public/venues/search` - Tìm kiếm địa điểm.
    *   `GET /api/vtd/public/ai-chat/generate-session` - Tạo mã phiên hội thoại ẩn danh với AI Chat.
    *   `POST /api/vtd/public/ai-chat/message` - Gửi tin nhắn và nhận phản hồi tự động từ Google Gemini.
    *   `GET /api/vtd/public/ai-chat/status` - Kênh kiểm tra sức khỏe/cấu hình của AI Service.

#### 🔐 B. Luồng Bảo Mật (Member - Yêu cầu Header `Authorization: Bearer {token}`)
*   **Giỏ hàng và Đơn hàng (`VtdOrderController`)**:
    *   `POST /api/vtd/member/orders` - Khởi tạo đơn hàng trống.
    *   `POST /api/vtd/member/orders/{orderId}/items` - Thêm vé và số lượng tương ứng vào đơn hàng.
    *   `GET /api/vtd/member/orders/{orderId}` - Lấy chi tiết thông tin đơn hàng hiện tại.
    *   `GET /api/vtd/member/orders` - Lịch sử toàn bộ đơn hàng của khách hàng hiện tại.
    *   `GET /api/vtd/member/orders/{orderId}/items` - Lấy danh sách chi tiết các vé đã chọn của đơn hàng.
    *   `PUT /api/vtd/member/orders/{orderId}/items/{orderItemId}` - Cập nhật số lượng vé.
    *   `DELETE /api/vtd/member/orders/{orderId}/items/{orderItemId}` - Xóa vé khỏi đơn hàng.
    *   `POST /api/vtd/member/orders/{orderId}/promotion` - Áp dụng voucher giảm giá vào đơn hàng.
    *   `DELETE /api/vtd/member/orders/{orderId}/promotion` - Hủy áp dụng voucher.
    *   `POST /api/vtd/member/orders/{orderId}/confirm` - Xác nhận chốt đơn để chuyển sang trạng thái chờ thanh toán.
    *   `DELETE /api/vtd/member/orders/{orderId}/cancel` - Hủy đơn hàng PENDING.
*   **Thanh toán và Vé điện tử (`VtdPaymentController` & `VtdTicketController`)**:
    *   `POST /api/vtd/member/payments` - Khởi tạo giao dịch thanh toán cho đơn hàng.
    *   `GET /api/vtd/member/payments/{paymentId}` - Lấy trạng thái hóa đơn thanh toán.
    *   `GET /api/vtd/member/payments/{paymentId}/qr` - Tạo chuỗi mã thanh toán QR-Code VietQR động (chuyển khoản ngân hàng tự động điền số tiền và nội dung đơn).
    *   `GET /api/vtd/member/my-tickets` - Kho vé điện tử của tôi (lấy tất cả vé đã thanh toán thành công).
    *   `GET /api/vtd/member/tickets/{ticketId}` - Xem vé điện tử và mã QR Code cá nhân độc bản để check-in.
*   **Hồ sơ thành viên (`VtdUserProfileController`)**:
    *   `GET /api/vtd/member/profile` - Xem thông tin hồ sơ cá nhân.
    *   `PUT /api/vtd/member/profile` - Cập nhật thông tin cá nhân.
    *   `POST /api/vtd/member/change-password` - Đổi mật khẩu.
*   **Đánh giá sự kiện (`VtdReviewController`)**:
    *   `POST /api/vtd/member/events/{eventId}/reviews` - Đăng bài viết đánh giá và xếp hạng sao sự kiện.
    *   `PUT /api/vtd/member/reviews/{reviewId}` - Sửa đánh giá đã gửi.
    *   `DELETE /api/vtd/member/reviews/{reviewId}` - Xóa bài viết đánh giá của mình.

---

### 👨‍⚖️ 2. PHÂN HỆ ADMIN QUẢN TRỊ (Trần Thế Bình - 49 APIs)

Toàn bộ các bộ API bắt buộc xác thực bảo mật và phân quyền nghiêm ngặt chỉ cho phép tài khoản có vai trò `ROLE_ADMIN` truy cập (Header chứa Token hợp lệ).

*   **Báo cáo & Thống kê (`TtbAdminDashboardController`)**:
    *   `GET /api/ttb/admin/dashboard/stats` - Số liệu tổng hợp ngày (Doanh thu, Đơn hàng, Vé bán, Thành viên mới).
    *   `GET /api/ttb/admin/dashboard/revenue` - Lấy dữ liệu doanh thu theo khoảng ngày chọn vẽ biểu đồ đường/cột.
    *   `GET /api/ttb/admin/dashboard/ticket-sales/{eventId}` - Tỷ lệ vé đã bán theo phân khúc ghế vẽ biểu đồ tròn.
*   **Soát vé Check-in (`TtbAdminTicketController`)**:
    *   `GET /api/ttb/admin/tickets/all` - Xem danh sách toàn bộ vé đã được phát hành trên hệ thống.
    *   `GET /api/ttb/admin/tickets/qr/{qrCode}` - Quét và lấy thông tin chi tiết của vé dựa trên mã QR Code.
    *   `GET /api/ttb/admin/tickets/status/{checkInStatus}` - Lọc danh sách vé theo trạng thái (Đã check-in / Chưa check-in).
    *   `POST /api/ttb/admin/tickets/process-checkin/{qrCode}` - Soát vé tại cửa: Đổi trạng thái vé thành "Đã sử dụng", ghi nhận thời gian check-in chính xác, kiểm duyệt vé giả hoặc vé quét trùng.
*   **Quản lý Sự kiện & Loại vé (`TtbAdminEventController` & `TtbAdminTicketTypeController`)**:
    *   `GET /api/ttb/admin/events` - Danh sách toàn bộ sự kiện phục vụ quản trị viên.
    *   `POST /api/ttb/admin/events/add` - Tạo sự kiện mới (Liên kết với VenueID).
    *   `PUT /api/ttb/admin/events/update/{id}` - Cập nhật thông tin sự kiện.
    *   `DELETE /api/ttb/admin/events/delete/{id}` - Đánh dấu ẩn/xóa sự kiện khỏi hệ thống.
    *   `GET /api/ttb/admin/ticket-types/event/{eventId}` - Xem danh sách loại vé của sự kiện chọn.
    *   `POST /api/ttb/admin/ticket-types/add` - Thêm hạng ghế/hạng vé mới (VVIP, VIP, GA...).
    *   `PUT /api/ttb/admin/ticket-types/update/{id}` - Thay đổi giá tiền, số lượng vé phân phối.
    *   `DELETE /api/ttb/admin/ticket-types/delete/{id}` - Xóa hạng vé.
*   **Quản lý Khách hàng (`TtbAdminUserController`)**:
    *   `GET /api/ttb/admin/users` - Danh sách thành viên, lọc và tìm kiếm theo tên/email.
    *   `POST /api/ttb/admin/users/add` - Tạo trực tiếp tài khoản mới từ Admin.
    *   `PUT /api/ttb/admin/users/block/{id}` - Khóa tài khoản (chặn quyền đăng nhập).
    *   `PUT /api/ttb/admin/users/unblock/{id}` - Kích hoạt lại tài khoản.
    *   `DELETE /api/ttb/admin/users/delete/{id}` - Xóa thông tin thành viên.
*   **Quản lý Hóa đơn & Đơn hàng (`TtbAdminOrderController`)**:
    *   `GET /api/ttb/admin/orders` - Danh sách đơn hàng toàn hệ thống, lọc theo ngày tháng và trạng thái.
    *   `GET /api/ttb/admin/orders/{id}` - Chi tiết hóa đơn mua vé.
    *   `GET /api/ttb/admin/orders/{id}/items` - Danh sách vé trong hóa đơn.
    *   `PUT /api/ttb/admin/orders/update-status/{id}` - Thay đổi thủ công trạng thái đơn (PENDING, PAID, CANCELLED).
    *   `PUT /api/ttb/admin/orders/{id}/approve-refund` - Duyệt hoàn trả vé và hoàn tiền tự động cho khách hàng.
*   **Quản lý Voucher Khuyến mãi (`TtbAdminPromotionController`)**:
    *   `GET /api/ttb/admin/promotions` - Danh sách toàn bộ mã giảm giá.
    *   `POST /api/ttb/admin/promotions/add` - Tạo mã coupon mới (loại giảm theo %, trừ tiền trực tiếp).
    *   `PUT /api/ttb/admin/promotions/update/{id}` - Sửa đổi ngày hết hạn, hạn mức sử dụng.
    *   `PATCH /api/ttb/admin/promotions/toggle-status/{id}` - Kích hoạt nhanh / Ngừng hoạt động Voucher.
*   **Quản lý Kiểm duyệt đánh giá (`TtbAdminReviewController`)**:
    *   `GET /api/ttb/admin/reviews` - Lấy danh sách toàn bộ bình luận của khách hàng.
    *   `PUT /api/ttb/admin/reviews/{id}/hide` - Ẩn bình luận nhạy cảm, xúc phạm hoặc vi phạm tiêu chuẩn cộng đồng.
    *   `PUT /api/ttb/admin/reviews/{id}/show` - Khôi phục hiển thị bình luận.
    *   `DELETE /api/ttb/admin/reviews/{id}` - Xóa vĩnh viễn bình luận khỏi database.
*   **Quản lý Thư viện ảnh & Địa điểm (`TtbEventImageController` & `TtbAdminVenueController`)**:
    *   `GET /api/ttb/events/{eventId}/images` - Danh sách album ảnh sự kiện.
    *   `POST /api/ttb/events/{eventId}/images` - Tải tệp hình ảnh vật lý lên máy chủ.
    *   `DELETE /api/ttb/events/{eventId}/images/{imageId}` - Xóa ảnh.
    *   `GET /api/ttb/admin/venues` - Danh sách và tìm kiếm địa điểm tổ chức sự kiện.
    *   `POST /api/ttb/admin/venues/add` - Thêm sân vận động, nhà hát mới (sức chứa, bản đồ).
    *   `PUT /api/ttb/admin/venues/update/{id}` - Cập nhật địa điểm.
    *   `DELETE /api/ttb/admin/venues/delete/{id}` - Xóa địa điểm.

---

## 7. TÍNH NĂNG NỔI BẬT (Features)

### ✨ Tính Năng Chính

#### **1. Xác Thực & Bảo Mật**
- ✅ JWT Authentication
- ✅ BCrypt Password Hashing
- ✅ Token Refresh Mechanism
- ✅ Role-based Authorization (RBAC)

#### **2. Quản Lý Sự Kiện**
- ✅ Create/Read/Update/Delete Events
- ✅ Multiple Ticket Types
- ✅ Event Categories & Filtering
- ✅ Full-text Search
- ✅ Event Gallery

#### **3. Đặt Vé & Thanh Toán**
- ✅ Real-time Ticket Availability
- ✅ **Optimistic Locking** (Prevent Overselling)
- ✅ Shopping Cart
- ✅ Mock Payment
- ✅ Invoice Generation

#### **4. QR Code Ticketing**
- ✅ Unique QR per Ticket
- ✅ Check-in Scanning
- ✅ Attendance Tracking
- ✅ Digital Ticket Delivery

#### **5. User Profile**
- ✅ Profile Management
- ✅ Booking History
- ✅ Favorites/Wishlist
- ✅ Notification Preferences

#### **6. Reviews & Ratings**
- ✅ Event Reviews (1-5 Stars)
- ✅ Moderation System
- ✅ Review Filtering
- ✅ Helpful Votes

#### **7. Admin Dashboard**
- ✅ Real-time Statistics
- ✅ Revenue Reports
- ✅ User Management
- ✅ Event Management
- ✅ Booking Management
- ✅ Activity Logs
- ✅ Check-in Management

#### **8. Promotions & Discounts**
- ✅ Coupon System
- ✅ Event-based Discounts
- ✅ Time-limited Offers
- ✅ Bulk Discount Calculation

#### **9. Notifications**
- ✅ Email Notifications
- ✅ In-app Notifications
- ✅ Event Reminders
- ✅ Booking Status Updates

#### **10. Export & Reporting**
- ✅ Export Booking Data (CSV)
- ✅ Generate Reports (PDF)
- ✅ Attendance Reports

---

## 📊 77 CHỨC NĂNG (Features Breakdown)

| Module | Số Lượng | Chi Tiết |
|--------|----------|---------|
| **Authentication** | 8 | Register, Login, Logout, Refresh Token, Password Reset, Role Check, Profile View, Account Settings |
| **User Features** | 25 | Search Events (5), Book Ticket (10), Profile (5), Reviews (5) |
| **Admin Features** | 30 | Manage Events (10), User Management (5), Stats (10), Check-in (5) |
| **Core Features** | 9 | Payment Processing, Promotions, QR Generation, Activity Logging, Pagination |
| **Utils** | 5 | Form Validation, Image Upload, CSV Export, Date Formatting, Error Handling |

**Total: 77 Functions**

---

## 🚀 Quick Start

```bash
# 1. Clone & Setup
git clone <repo>
cd EventTicket_BDHT_Project

# 2. Database
# Run: database/event_ticket.sql in SSMS

# 3. Backend
cd backend-api
mvn spring-boot:run
# http://localhost:8080

# 4. Frontend
cd ../frontend-web
# Open index.html with Live Server
# http://localhost:5500

# 5. Test
curl -X GET http://localhost:8080/api/public/events
```

---

## 📚 References

- [TODO.md](TODO.md) - Development Roadmap
- Database Schema: `database/event_ticket.sql`
- API Testing: `tests/postman_collection.json`
- Documentation: `docs/` folder

---

**Last Updated**: May 4, 2026  
**Project Status**: 🚀 Under Development  
**Team**: 4 Members (2 Backend, 2 Frontend)

*BDHT Project - Event Ticket Booking Platform with 77 Complete Features*
