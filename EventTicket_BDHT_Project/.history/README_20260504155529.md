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
9. [Quy Trình Phát Triển (Development Process)](#9-quy-trình-phát-triển--development-process)
10. [Các Bước Tiếp Theo (Next Steps)](#10-các-bước-tiếp-theo--next-steps)

---

## 1. THÔNG TIN DỰ ÁN

| Tiêu Chí | Chi Tiết |
|---------|--------|
| **Tên Dự Án** | Event Ticket Booking Platform (BDHT) |
| **Mục Đích** | [Thêm mô tả mục đích dự án] |
| **Công Nghệ Backend** | [Chỉ định công nghệ backend] |
| **Công Nghệ Frontend** | [Chỉ định công nghệ frontend] |
| **Cơ Sở Dữ Liệu** | [Chỉ định hệ quản trị CSDL] |
| **Bảo Mật** | [Mô tả cơ chế bảo mật] |
| **Xác Thực Phân Quyền** | [Mô tả hệ thống phân quyền] |
| **Số Thành Viên** | [Số lượng thành viên] |

---

## 2. PHÂN CÔNG ĐỘI NGŨ (Team Structure)

### 👨‍💼 Đội Backend
- **Thành Viên 1 (Backend Lead)**: [Mô tả trách nhiệm]
- **Thành Viên 2 (Backend Dev)**: [Mô tả trách nhiệm]

### 👨‍🎨 Đội Frontend
- **Thành Viên 3 (Frontend Lead)**: [Mô tả trách nhiệm]
- **Thành Viên 4 (Frontend Dev)**: [Mô tả trách nhiệm]

---

## 3. KIẾN TRÚC HỆ THỐNG (Architecture)

### 🔐 Authentication Flow
1. [Bước 1 - Mô tả quy trình đăng nhập]
2. [Bước 2 - Mô tả cấp phát token]
3. [Bước 3 - Mô tả lưu trữ token]
4. [Bước 4 - Mô tả gắn token vào request]
5. [Bước 5 - Mô tả xác thực token]

### 🏗️ Kiến Trúc Tổng Thể
[Thêm biểu đồ kiến trúc hoặc mô tả chi tiết kiến trúc hệ thống]

---

## 🗂️ 4. CẤU TRÚC THƯ MỤC CHI TIẾT (Project Structure)

Dự án áp dụng mô hình Workspace phân tách triệt để 2 phân hệ độc lập: **Backend** và **Frontend**. 

```text
EventTicket_BDHT_Project/
│
├── backend-api/                               # ☕ JAVA SPRING BOOT BACKEND
│   ├── pom.xml                                # Chứa thư viện (JPA, Security, SQL Server)
│   └── src/main/java/com/eventticket/
│       ├── config/                            # Cấu hình chung (CorsConfig, Swagger)
│       ├── security/                          # JwtUtil, SecurityConfig, JwtFilter
│       │
│       ├── controller/                        # 🎯 TẦNG GIAO TIẾP (Phân chia URL rõ ràng)
│       │   ├── admin/                         # (Bắt buộc Role ADMIN)
│       │   │   ├── AdminDashboardController.java
│       │   │   └── AdminEventController.java
│       │   ├── user/                          # (Bắt buộc Role USER)
│       │   │   ├── UserProfileController.java
│       │   │   └── UserBookingController.java
│       │   ├── auth/                          # (Không cần Token)
│       │   │   └── AuthController.java
│       │   
│       ├── service/                           # 🧠 TẦNG NGHIỆP VỤ (Gộp chung dùng chéo)
│       │   ├── AuthService.java               # Logic Hash Password, gen JWT
│       │   ├── BookingService.java            # Logic Đặt vé (Bắt lỗi Optimistic Locking)
│       │   ├── EventService.java              # Logic Quản lý sự kiện
│       │   └── UserService.java               # Logic Quản lý người dùng
│       │
│       ├── repository/                        # 🗄️ TẦNG DATABASE (JPA)
│       │   └── (EventRepository, UserRepository, TicketTypeRepository...)
│       │
│       ├── entity/                            # Ánh xạ 12 bảng SQL Server (Chứa @Version)
│       ├── dto/                               # Chứa request gửi lên & response trả về chuẩn
│       └── exception/                         # Xử lý lỗi toàn cục (GlobalExceptionHandler)
│
└── frontend-web/                              # 🎨 HTML/CSS/JS FRONTEND THUẦN
    ├── index.html                             # Điểm vào hệ thống (Trang chủ)
    │
    ├── pages/                                 # 🖥️ GIAO DIỆN HIỂN THỊ (VIEWS)
    │   ├── admin/                             # Giao diện Quản trị viên
    │   │   ├── dashboard.html                 # Biểu đồ doanh thu
    │   │   ├── manage-events.html             # Quản lý sự kiện
    │   │   ├── manage-users.html              # Quản lý người dùng
    │   │   └── qr-scanner.html                # Trang bật Camera quét vé
    │   │
    │   ├── user/                              # Giao diện Khách hàng
    │   │   ├── event-detail.html              # Chi tiết sự kiện & Form mua vé
    │   │   ├── checkout.html                  # Thanh toán & Nhận vé điện tử
    │   │   ├── profile.html                   # Quản lý hồ sơ cá nhân
    │   │   └── my-bookings.html               # Lịch sử đơn hàng
    │   │
    │   └── auth/                              # Giao diện Đăng nhập/Đăng ký
    │       ├── login.html
    │       └── register.html
    │
    ├── assets/
    │   ├── css/                               # Thư mục style (Biến màu sắc, layout chung)
    │   └── js/                                # 🧠 LOGIC XỬ LÝ (JAVASCRIPT)
    │       ├── core/
    │       │   └── api-client.js              # File quan trọng: Cấu hình Fetch API đính kèm JWT
    │       ├── admin/                         # Script gọi API của Admin
    │       │   ├── admin-dashboard.js
    │       │   └── admin-events.js
    │       └── user/                          # Script gọi API của User
    │           ├── booking.js                 # Xử lý chọn ghế, tính tiền
    │           └── profile.js                 # Validate dữ liệu hồ sơ cá nhân
    │
    └── components/                            # Mã HTML dùng chung (Load bằng JS)
        ├── header.html
        ├── sidebar-admin.html
        └── footer.html
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

## 6. API ENDPOINTS

### Public APIs (Không cần JWT)

```
🔓 POST /api/auth/register
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "phone": "0123456789"
}
Response: {id, email, fullName, role, createdAt}

🔓 POST /api/auth/login
Request: {email, password}
Response: {token, expiresIn, user}

🔓 GET /api/public/events?page=0&size=10&category=Concert
Response: {content: [...], totalElements, totalPages}

🔓 GET /api/public/events/{eventId}
Response: {id, name, category, venue, date, ticketTypes: [...], reviews: [...]}
```

### Protected APIs (Cần JWT Token)

```
🔐 POST /api/bookings
Header: Authorization: Bearer {token}
Request: {eventId, ticketTypeId, quantity, totalPrice}
Response: {id, userId, eventId, status, qrCode, bookingDate}

🔐 GET /api/users/profile
Header: Authorization: Bearer {token}
Response: {id, email, fullName, phone, avatar, totalBookings, totalSpent}

🔐 PUT /api/users/profile
Header: Authorization: Bearer {token}
Request: {fullName, phone, avatar}
Response: {...updated user info...}

🔐 GET /api/users/{userId}/bookings
Header: Authorization: Bearer {token}
Response: [{id, event, quantity, totalPrice, status, qrCode}]

🔐 POST /api/events/{eventId}/reviews
Header: Authorization: Bearer {token}
Request: {rating, comment}
Response: {id, eventId, userId, rating, comment, createdAt}
```

### Admin APIs (Role: ADMIN)

```
👨‍⚖️ POST /api/admin/events
Header: Authorization: Bearer {token}
Request: {name, category, date, venue, description, imageUrl}
Response: {id, ...event info...}

👨‍⚖️ PUT /api/admin/events/{eventId}
Request: {...updated event...}
Response: {...}

👨‍⚖️ DELETE /api/admin/events/{eventId}
Response: {message: "Event deleted"}

👨‍⚖️ GET /api/admin/stats/dashboard
Response: {totalRevenue, totalBookings, totalEvents, totalUsers, revenueByMonth}

👨‍⚖️ GET /api/admin/users?page=0&size=20
Response: [{id, email, fullName, totalBookings, createdAt}]

👨‍⚖️ GET /api/admin/bookings?status=PENDING
Response: [{id, userId, eventId, quantity, status, createdAt}]

👨‍⚖️ POST /api/admin/check-in
Request: {qrCode}
Response: {ticketNumber, eventName, attendeeName, status}
```

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
