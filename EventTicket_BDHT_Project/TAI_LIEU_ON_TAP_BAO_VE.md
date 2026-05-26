# HƯỚNG DẪN ÔN TẬP VÀ PHẢN BIỆN BẢO VỆ ĐỒ ÁN TỐT NGHIỆP
## HỆ THỐNG ĐẶT VÉ SỰ KIỆN BDHT (FRONTEND USER JS CORE)

Tài liệu này được biên soạn bởi **Senior Dev Mentor** nhằm hệ thống hóa toàn bộ kiến thức kỹ thuật phần Frontend của dự án. Đây là cẩm nang giúp bạn nắm vững luồng hoạt động, cấu trúc mã nguồn, và tự tin trả lời xuất sắc trước Hội đồng phản biện.

---

## 🗺️ PHẦN I: SƠ ĐỒ VÀ GIẢI THÍCH LUỒNG CHẠY HỆ THỐNG (DOM -> API -> RENDER)

Khi người dùng mở một trang web trong dự án của bạn (ví dụ: `index.html` hoặc `all-events.html`), luồng xử lý dữ liệu sẽ diễn ra tuần tự qua các bước sau:

```
[1. Trình duyệt tải HTML/CSS/JS] 
               │
               ▼
[2. Kích hoạt sự kiện 'DOMContentLoaded'] 
               │
               ▼
[3. Nạp động Header/Footer từ components dùng chung]
               │
               ▼
[4. Gọi ApiClient bắn yêu cầu HTTP Request lên Backend]
               │
               ▼
[5. Nhận dữ liệu JSON từ Backend -> Chuẩn hóa dữ liệu mảng sạch]
               │
               ▼
[6. Duyệt dữ liệu, lắp ghép chuỗi HTML động (Template Literals)]
               │
               ▼
[7. Trỏ vào DOM -> Thay đổi innerHTML -> Hiển thị lên màn hình]
```

### 1. Luồng dữ liệu: fetch hoạt động thế nào?
* **Khái niệm:** `fetch` là một API mặc định của trình duyệt viết bằng Javascript, dùng để gửi các yêu cầu mạng HTTP (GET, POST, PUT, DELETE) lên máy chủ (Backend) một cách bất đồng bộ mà không làm tải lại trang web.
* **Cách hoạt động:** Khi bạn gọi `fetch(url, config)`:
  1. Trình duyệt gửi một tín hiệu mạng đến địa chỉ `url` kèm các thông tin cấu hình (`headers`, `body`...).
  2. Máy chủ Backend xử lý yêu cầu và phản hồi lại một đối tượng `Response` (chứa mã trạng thái như 200, 404, 500 và dữ liệu thô).
  3. Trình duyệt nhận `Response` thô này và chúng ta cần gọi `.text()` hoặc `.json()` để chuyển đổi dữ liệu thô đó thành đối tượng Javascipt định dạng chuẩn để xử lý.

### 2. Tại sao cần lớp `apiClient` (`api-client.js`)?
Thay vì viết trực tiếp hàm `fetch` ở mọi nơi, việc xây dựng một lớp trung gian `ApiClient` (`window.apiClient`) là một **chuẩn thiết kế phần mềm tối ưu** vì 4 lý do lớn:
* **Tập trung hóa cấu hình (Centralized Configuration):** Tất cả các cấu hình cơ bản như `API_BASE_URL` (`http://localhost:8080`), các thiết lập Header mặc định (`Content-Type: application/json`) được khai báo duy nhất ở một nơi. Sau này Backend đổi cổng hoặc IP, bạn chỉ cần sửa 1 dòng thay vì sửa hàng chục tệp JS.
* **Tự động gắn mã bảo mật (Interceptor Pattern):** Lớp `apiClient` sẽ tự động lấy mã xác thực JWT từ `localStorage` và đính kèm vào header `Authorization: Bearer <token>` trước khi gửi đi, giải phóng việc phải viết mã này thủ công ở từng trang.
* **Xử lý lỗi tập trung:** Tự động bắt lỗi mã trạng thái `401 Unauthorized` (khi token hết hạn hoặc chưa đăng nhập) để xóa token cũ và tự động chuyển hướng người dùng về trang đăng nhập (`login.html`). Đồng thời, nó xử lý chống lỗi `"Unexpected end of JSON input"` khi API phản hồi rỗng giúp ứng dụng không bị sập.
* **Cơ chế Cache dữ liệu:** Lớp `apiClient` của bạn tích hợp sẵn một bộ nhớ đệm `_responseCache` kiểu `Map`. Khi fetch danh sách sự kiện công khai, nếu gọi liên tục, nó sẽ trả về kết quả lưu tạm trong cache (trong vòng 5 phút) thay vì liên tục bắn Request mạng, giúp giảm tải tối đa cho máy chủ và tăng tốc độ tải trang cực nhanh.

### 3. Dữ liệu được render ra HTML bằng cách nào?
1. Lớp `apiClient` nhận mảng dữ liệu sự kiện thô từ Backend rồi chuyển đổi thành một mảng JavaScript sạch.
2. Tại các file logic giao diện (như `all-events.js` hoặc `ai-chat.js`), ta sử dụng vòng lặp (như `for` hoặc hàm `.map()`) duyệt qua từng sự kiện.
3. Ở mỗi vòng lặp, ta lắp ghép dữ liệu vào các thẻ HTML tương ứng dưới dạng chuỗi ký tự (sử dụng cú pháp template literal của Javascript với dấu backtick \` \`).
4. Cuối cùng, ta trỏ tới thẻ container cha trên cây phân cấp DOM (ví dụ: `document.getElementById('all-events-grid')`) và ghi đè nội dung HTML bằng thuộc tính `innerHTML`.

---

## ⚡ PHẦN II: XỬ LÝ SỰ KIỆN - TẠI SAO DÙNG `async/await` THAY VÌ `Promise.then()`?

Cả hai cách đều dùng để xử lý các tác vụ bất đồng bộ (như gọi API), nhưng bạn sử dụng `async/await` vì tính sư phạm và chất lượng code vượt trội:

| Tiêu chí | Sử dụng `Promise.then()` | Sử dụng `async/await` (Lựa chọn của dự án) |
| :--- | :--- | :--- |
| **Cú pháp** | Dùng các hàm callback móc xích nối tiếp nhau `.then().catch()`. | Viết code tuần tự, thẳng hàng từ trên xuống dưới trông y hệt code đồng bộ. |
| **Độ đọc hiểu** | Dễ rơi vào tình trạng **"Callback Hell"** hoặc **"Pyramid of Doom"** khi các API gọi lồng nhau. | Cực kỳ trực quan, dễ theo dõi luồng dữ liệu chạy qua từng dòng. |
| **Xử lý lỗi** | Phải dùng một hàm `.catch()` riêng biệt ở cuối chuỗi. | Dùng khối lệnh **`try-catch` truyền thống** giống hệt như các ngôn ngữ Java/C#, giúp bắt lỗi chính xác tại từng khối lệnh cụ thể. |

**👉 Giải thích với thầy cô:** 
> *"Em lựa chọn `async/await` để viết code bất đồng bộ theo phong cách tuần tự. Nó giúp mã nguồn của em cực kỳ trong sáng, dễ debug, tránh được lỗi lồng mã nguồn quá sâu (Callback Hell) và dễ dàng áp dụng cơ chế bắt lỗi `try-catch` chuẩn mực như trong Java Backend."*

---

## 💾 PHẦN III: QUẢN LÝ TRẠNG THÁI - TẠI SAO CẦN `localStorage` ĐỂ LƯU THÔNG TIN USER?

* **Bản chất của giao thức HTTP:** HTTP là một giao thức **Stateless (không lưu giữ trạng thái)**. Nghĩa là mỗi yêu cầu (request) gửi lên máy chủ là độc lập và máy chủ không tự nhớ được người dùng này là ai từ request trước đó.
* **Giải pháp:** Sau khi đăng nhập thành công, Backend cấp cho trình duyệt một chuỗi mã xác thực (Token JWT) và thông tin cá nhân.
* **Tại sao dùng `localStorage`?** 
  - `localStorage` là bộ nhớ lưu trữ dạng Key-Value được trình duyệt cấp riêng cho từng tên miền, dữ liệu trong này **không bị mất đi** khi người dùng tải lại trang, tắt trình duyệt hoặc mở tab mới.
  - Nhờ việc lưu `token` và `currentUser` trong `localStorage`, ứng dụng Frontend của bạn có thể liên tục đọc dữ liệu này để hiển thị tên người dùng trên Header, quyết định ẩn/hiện menu Đăng xuất, và đính kèm token để chứng minh danh tính với Backend trên mọi request tiếp theo mà không bắt người dùng phải đăng nhập lại liên tục.

---

## 🛡️ PHẦN IV: BẢO MẬT - TẠI SAO TOKEN CẦN ĐÍNH KÈM VÀO HEADER TRONG REQUEST?

Việc đính kèm token JWT vào phần **Header** của HTTP request (`Authorization: Bearer <token>`) là một chuẩn bảo mật bắt buộc của kiến trúc RESTful API nhờ các lý do sau:

* **Tách biệt Stateless:** Backend không cần duy trì session (bộ nhớ lưu trạng thái đăng nhập) ở máy chủ, giúp tiết kiệm tài nguyên RAM cho server. Mỗi request gửi lên đều tự mang theo "chứng minh thư" (Token JWT) ở Header để Backend tự kiểm tra và quyết định cho phép truy cập hay không.
* **Chống tấn công CSRF (Cross-Site Request Forgery):** Nếu lưu token trong Cookie thông thường và để trình duyệt tự động gửi đi, hacker có thể dụ người dùng click vào đường link lạ để tự động gửi request giả mạo kèm cookie của người dùng. Khi ta chủ động cấu hình đính kèm JWT vào **HTTP Header** bằng mã Javascript, trình duyệt sẽ không tự động gửi mã này đi, từ đó triệt tiêu hoàn toàn nguy cơ tấn công giả mạo CSRF.
* **Hỗ trợ đa nền tảng (Cross-Origin):** Đính kèm token vào Header giúp ứng dụng của bạn dễ dàng gọi API xuyên miền (CORS) hoặc hỗ trợ ứng dụng di động (Mobile App) kết nối chung vào một Backend sau này, vì các thiết bị di động cũng hỗ trợ gửi HTTP Header rất dễ dàng.

---

## 🎯 PHẦN V: 5 CÂU HỎI "BẪY" PHẢN BIỆN ĐIỂM 10 CỦA GIÁO VIÊN & HƯỚNG DẪN TRẢ LỜI

Các thầy cô phản biện thường rất thích hỏi xoáy vào các điểm yếu của hệ thống để đo lường độ hiểu biết sâu sắc của sinh viên. Hãy chuẩn bị các câu trả lời sau để khiến Hội đồng phải trầm trồ:

### ❓ Câu 1 (Bẫy Bảo Mật): *"Em lưu trữ JWT Token trong LocalStorage rất dễ bị tấn công XSS tấn công lấy cắp token. Tại sao em không dùng Cookie thuộc tính `HttpOnly` để lưu token cho an toàn tuyệt đối?"*
* **Ý đồ của thầy cô:** Kiểm tra xem em có biết điểm yếu lớn nhất của LocalStorage là gì (bị đọc được bởi mọi đoạn script chạy trong trang) và kiến thức nâng cao về Cookie.
* **💡 Câu trả lời thông minh:**
  > *"Thưa thầy/cô, thầy cô nhận định hoàn toàn chính xác ạ. Lưu trữ ở `LocalStorage` đúng là có nguy cơ bị lộ nếu trang web bị dính mã độc chèn script XSS. 
  > Tuy nhiên, vì dự án của em thiết kế theo mô hình **tách rời hoàn toàn Frontend và Backend (Decoupled)** hoạt động trên các cổng/tên miền khác nhau, việc dùng Cookie `HttpOnly` xuyên domain (Cross-Domain Cookie) đòi hỏi cấu hình rất phức tạp về CORS và chính sách an toàn của trình duyệt thường chặn Cookie bên thứ ba.
  > Để khắc phục nguy cơ XSS khi dùng LocalStorage, em đã áp dụng các biện pháp phòng vệ nghiêm ngặt:
  > 1. Triệt tiêu nguy cơ XSS bằng cách lọc dữ liệu đầu ra thông qua hàm `escapeHtml` trước khi render lên DOM.
  > 2. Thiết lập thời gian hết hạn của Token JWT ở Backend rất ngắn (ví dụ: vài tiếng hoặc 1 ngày) để giảm thiểu tối đa thiệt hại nếu chẳng may token bị lộ."*

### ❓ Câu 2 (Bẫy Kiến Trúc API): *"Trong `apiClient`, thầy thấy em dùng phương thức GET để lấy dữ liệu sự kiện, nhưng tại sao khi tìm kiếm sự kiện AI trong `ai-chat.js`, em lại dùng phương thức POST gửi dữ liệu lên `/api/vtd/public/ai-chat/message`? Có thể dùng GET cho chat được không?"*
* **Ý đồ của thầy cô:** Thử thách sự hiểu biết về các phương thức (HTTP Methods) chuẩn RESTful.
* **💡 Câu trả lời thông minh:**
  > *"Thưa thầy/cô, theo chuẩn thiết kế RESTful API:
  > Phương thức **GET** chỉ nên dùng để truy vấn dữ liệu tĩnh, không làm thay đổi trạng thái hệ thống, và toàn bộ tham số gửi lên phải nằm trên đường dẫn URL (Query Parameters). Tin nhắn chat của người dùng có thể rất dài, chứa nhiều ký tự đặc biệt, xuống dòng, và độ dài vượt quá giới hạn ký tự cho phép của thanh địa chỉ URL trình duyệt.
  > Hơn nữa, việc gửi tin nhắn chat thực chất là yêu cầu hệ thống **tạo mới một bản ghi tin nhắn** trong phiên chat. Do đó, việc sử dụng phương thức **POST** để đóng gói tin nhắn vào phần thân yêu cầu (Request Body) dạng JSON là hoàn toàn chuẩn xác, an toàn, bảo mật và không bị giới hạn độ dài."*

### ❓ Câu 3 (Bẫy Hiệu Năng & Cache): *"Thầy thấy trong `api-client.js` em dùng cơ chế Cache (`this._responseCache`). Nếu Admin vừa chỉnh sửa giá vé sự kiện ở trang quản trị Backend, người dùng truy cập trang chủ vẫn thấy giá vé cũ do dữ liệu đang lấy từ Cache trong 5 phút. Em giải quyết xung đột dữ liệu này thế nào?"*
* **Ý đồ của thầy cô:** Kiểm tra sự hiểu biết về cơ chế đồng bộ hóa bộ nhớ đệm (Cache Invalidation) — một bài toán kinh điển trong phát triển phần mềm.
* **💡 Câu trả lời thông minh:**
  > *"Thưa thầy/cô, bộ nhớ đệm Cache ở Frontend được em thiết kế chủ yếu để tối ưu trải nghiệm cho các thông tin ít biến động khi người dùng chuyển qua lại liên tục giữa các trang công cộng (như trang chủ, trang tin tức).
  > Để giải quyết vấn đề đồng bộ dữ liệu thời gian thực cho các thao tác quan trọng, em đã áp dụng các chiến thuật sau:
  > 1. Khi người dùng thực hiện các hành động cần độ chính xác 100% như **Click vào xem chi tiết sự kiện** (`event-detail.html`) hoặc **Đăng ký đặt vé**, Frontend sẽ gọi API trực tiếp mà không đi qua bộ nhớ đệm (đặt tham số `ttl = 0` hoặc gọi API trực tiếp bằng phương thức POST/GET không cache).
  > 2. Backend cũng trả về các Header điều khiển cache (`Cache-Control: no-store`) đối với các thông tin nhạy cảm để trình duyệt luôn luôn fetch mới dữ liệu."*

### ❓ Câu 4 (Bẫy Xử Lý Lỗi): *"Nếu mạng internet bị ngắt kết nối hoặc Backend của em bị sập hoàn toàn (sập DB hoặc lỗi 500), lớp `apiClient` của em xử lý thế nào để người dùng không gặp tình trạng trang web bị đơ, không có phản hồi gì?"*
* **Ý đồ của thầy cô:** Kiểm tra khả năng xử lý ngoại lệ (Exception Handling) và trải nghiệm người dùng (UX) khi hệ thống gặp lỗi nghiêm trọng.
* **💡 Câu trả lời thông minh:**
  > *"Thưa thầy/cô, trong lớp `ApiClient`, tất cả các yêu cầu mạng đều được bao bọc trong khối lệnh `try-catch` ngoại lệ.
  > Nếu xảy ra lỗi mạng hoặc máy chủ bị tắt (lỗi kết nối), hàm `fetch` sẽ ném ra lỗi và được khối `catch` bắt lại, ghi nhận log lỗi chi tiết lên console để tránh làm sập ứng dụng.
  > Đồng thời, ở các file xử lý giao diện gọi API, em đều thiết kế cơ chế phản hồi lỗi trực quan cho người dùng:
  > - Đối với Chat AI, hệ thống sẽ tự động gỡ bỏ icon loading và hiển thị bong bóng tin nhắn màu đỏ báo lỗi: *'Không thể kết nối đến hệ thống chat ngay lúc này. Vui lòng thử lại sau.'*
  > - Đối với danh sách sự kiện, hệ thống sẽ render giao diện thông báo trực quan thay thế để người dùng biết hệ thống đang bảo trì, giúp nâng cao trải nghiệm người dùng."*

### ❓ Câu 5 (Bẫy Đồng Bộ Giao Diện): *"Trong file `all-events.js`, em thiết kế ô tìm kiếm sự kiện ở trang chính, nhưng tại sao khi gõ tìm kiếm trên Header (nằm ở một tệp component HTML riêng biệt được nạp động), trang web vẫn tự lọc và đồng bộ được kết quả?"*
* **Ý đồ của thầy cô:** Kiểm tra sự hiểu biết về cách các thành phần giao diện khác nhau chia sẻ trạng thái và tương tác với nhau (Component Communication).
* **💡 Câu trả lời thông minh:**
  > *"Thưa thầy/cô, mặc dù Header được em thiết kế dưới dạng Component động riêng biệt để dễ bảo trì, em đã thực hiện đồng bộ hóa tìm kiếm thông qua việc khai thác chung DOM và URL:
  > 1. Cả Header và trang chính đều dùng chung tài nguyên Javascript và có thể truy cập vào đối tượng toàn cục `window`.
  > 2. Tại hàm `setupPaginationFilters` của trang `all-events.js`, em sử dụng bộ chọn DOM linh hoạt `document.getElementById('header-search-keyword')` để lắng nghe sự kiện gõ Enter ngay trên Header.
  > 3. Khi sự kiện Enter kích hoạt, hàm `filterEvents` sẽ tự động thu thập từ khóa từ ô input của Header để lọc mảng sự kiện toàn cục, đồng thời kích hoạt hàm `scrollIntoView` để cuộn giao diện mượt mà xuống khu vực hiển thị lưới sự kiện. Điều này giúp hệ thống hoạt động vô cùng liền mạch."*

---

## 📚 PHẦN VI: BẢN ĐỒ VÀ CHỨC NĂNG CHI TIẾT CỦA 14 TỆP JAVASCRIPT PHÍA USER

Để giúp bạn hiểu rõ từng tệp tin Javascript trong thư mục [assets/js/](file:///c:/K23CNT1/Project4/project-4-eventTicker/K23CNT1_NguyenAnhTuan_Project4_EventTicket-main/EventTicket_BDHT_Project/frontend-web/assets/js), dưới đây là bảng mô tả chi tiết chức năng của từng file:

### 1. `core/api-client.js`
* **Nhiệm vụ:** Trái tim điều phối toàn bộ kết nối của ứng dụng.
* **Chức năng chi tiết:**
  - Khai báo lớp `ApiClient` chứa các phương thức gọi HTTP Request (`get`, `post`, `put`, `delete`).
  - Tự động đính kèm Token JWT vào Header `Authorization: Bearer <token>`.
  - Quản lý bộ nhớ đệm `Cache` cho danh sách sự kiện công cộng giúp tối ưu hóa hiệu năng hệ thống.
  - Tích hợp đối tượng toàn cục `window.pageUtils` tự động nạp Header/Footer động và phân giải đường dẫn tài nguyên tĩnh (`resolveUrl`) giữa các trang local.

### 2. `ai-chat.js`
* **Nhiệm vụ:** Quản lý giao diện Trợ lý ảo AI Chatbot gợi ý sự kiện thông minh.
* **Chức năng chi tiết:**
  - Khởi động Widget Chat ở góc dưới màn hình và duy trì mã phiên trò chuyện (`Session Code`).
  - Lắng nghe tin nhắn từ người dùng, tự động phân tích từ khóa (`detectIntent`) để chuyển hướng nghiệp vụ (xem sự kiện, đăng nhập, đăng ký, chat trực tiếp với Generative AI).
  - Tích hợp hàm `escapeHtml` chống mã độc XSS và quản lý lưu lịch sử chat cho khách vãng lai bằng LocalStorage.

### 3. `all-events.js`
* **Nhiệm vụ:** Vận hành trang Danh sách tất cả sự kiện có bộ lọc nâng cao.
* **Chức năng chi tiết:**
  - Kết nối API Backend tải danh sách sự kiện công khai và lọc những sự kiện đã xuất bản (`PUBLISHED`).
  - Chạy Slider quảng cáo 3 sự kiện hot và Carousel sự kiện nổi bật tự cuộn pixel-by-pixel, tự dừng khi rê chuột.
  - Đồng bộ hóa ô tìm kiếm từ Header và thanh danh mục động (Category Chips) dựng trực tiếp từ Database.
  - Xử lý chia trang sự kiện theo thuật toán chia mảng `.slice()` hiển thị tối đa 8 phần tử một trang.

### 4. `auth.js`
* **Nhiệm vụ:** Xử lý xác thực người dùng bao gồm Đăng nhập, Đăng ký và Đăng xuất toàn cục.
* **Chức năng chi tiết:**
  - Thu thập thông tin từ các Form, gửi yêu cầu đăng nhập/đăng ký tới các API bảo mật của Backend.
  - Tích hợp cơ chế xác thực bên thứ ba: Đăng nhập Google (dùng SDK Client ID) và Đăng nhập Facebook (tự động chuyển hướng hoặc mở SDK mượt mà trên môi trường localhost).
  - Quản lý phân quyền chuyển hướng: Chuyển sang trang Quản lý (`admin/lpth_dashboard.html`) nếu là ADMIN hoặc trang chủ (`index.html`) nếu là USER.
  - Triển khai chức năng Đăng xuất xóa sạch dữ liệu Token trong LocalStorage để bảo vệ thông tin người dùng.

### 5. `auth-link.js`
* **Nhiệm vụ:** Bảo vệ liên kết (Route Guard) và điều hướng phân quyền thông minh.
* **Chức năng chi tiết:**
  - Lắng nghe các click của người dùng trên toàn bộ trang web vào các khu vực nhạy cảm (như Giỏ hàng, Thanh toán, Hồ sơ, Đơn hàng của tôi).
  - Kiểm tra xem người dùng đã có token trong LocalStorage chưa. Nếu chưa có, tự động ngăn chặn hành động và chuyển hướng an toàn về trang `login.html` kèm thông điệp hướng dẫn.

### 6. `cart.js`
* **Nhiệm vụ:** Quản lý trang Giỏ hàng và quy trình chuẩn bị đặt vé.
* **Chức năng chi tiết:**
  - Gọi API Backend tải thông tin đơn hàng hiện tại (`orderId`) và danh sách các vé đã chọn (`orderItems`).
  - Tính toán giá tiền tự động và hiển thị chi tiết hóa đơn.
  - Cho phép thay đổi số lượng vé trực tuyến (sử dụng API PUT cập nhật số lượng) và xóa vé khỏi giỏ hàng (sử dụng API DELETE).
  - Tổng hợp dữ liệu mua vé (`checkoutData`) lưu tạm vào LocalStorage trước khi chuyển tiếp sang quy trình thanh toán.

### 7. `dashboard.js`
* **Nhiệm vụ:** Hiển thị Trang tổng quan lịch sử đặt vé cá nhân của người dùng.
* **Chức năng chi tiết:**
  - Tải danh sách đơn hàng đã mua từ API `/api/vtd/member/orders`.
  - Phân loại trạng thái đơn hàng trực quan: PENDING (Chờ thanh toán), PAID (Đã thanh toán thành công), CANCELLED (Đã hủy).
  - Render danh sách vé điện tử đi kèm, hỗ trợ hiển thị mã QR Code dùng để soát vé khi vào cổng sự kiện và tải xuống vé điện tử định dạng PDF.

### 8. `event-detail.js`
* **Nhiệm vụ:** Điều hành trang Chi tiết sự kiện và lựa chọn đặt mua vé.
* **Chức năng chi tiết:**
  - Phân tích mã tham số ID từ URL (`?id=...`) để fetch dữ liệu chi tiết sự kiện từ Backend.
  - Hiển thị đầy đủ thông tin: Tiêu chuẩn banner ảnh lớn, mô tả nội dung sự kiện, sơ đồ chỗ ngồi, danh sách nghệ sĩ, thời gian và địa điểm.
  - Kết nối API lấy danh sách các hạng vé (V.I.P, Standard, GA...) và số lượng vé còn lại trong kho.
  - Xử lý hành động mua vé: Tự động khởi tạo đơn hàng mới, thêm vé đã chọn vào giỏ hàng và chuyển hướng người dùng sang trang `cart.html`.

### 9. `home.js`
* **Nhiệm vụ:** Vận hành trang chủ (`index.html`) - bộ mặt của nền tảng BDHT.
* **Chức năng chi tiết:**
  - Kết nối API Backend để fetch toàn bộ sự kiện đang bán thời gian thực.
  - Phân phối dữ liệu vào: Slider ảnh động nổi bật đầu trang, dải cuộn ngang sự kiện mới nhất và sự kiện đặc sắc (tích hợp cơ chế cuộn hoạt ảnh mượt mà bằng `requestAnimationFrame`).
  - Nạp động danh sách bộ lọc Danh mục và Bộ lọc địa điểm ở Header từ dữ liệu thực tế Backend, sửa lỗi hiển thị màu sắc tùy chọn dropdown.
  - Dựng lưới sự kiện có phân trang, hỗ trợ lọc kết hợp đa điều kiện (Tìm kiếm chữ + Danh mục + Thời gian + Địa phương).

### 10. `payment.js`
* **Nhiệm vụ:** Quản lý trang Thanh toán và tích hợp cổng thanh toán trực tuyến.
* **Chức năng chi tiết:**
  - Đọc thông tin hóa đơn tạm thời từ `checkoutData` trong LocalStorage.
  - Hiển thị giao diện xác nhận thông tin mua vé, thông tin cá nhân và cho phép áp dụng mã giảm giá (Promotion Code).
  - Tích hợp cổng thanh toán quốc tế **VNPAY Sandbox**: Gọi API tạo đường dẫn thanh toán, chuyển hướng người dùng sang trang thanh toán bảo mật của ngân hàng và xử lý kết quả trả về (`vnp_ResponseCode`) để xác nhận đơn hàng thành công.

### 11. `profile.js`
* **Nhiệm vụ:** Quản lý thông tin tài khoản cá nhân của người dùng.
* **Chức năng chi tiết:**
  - Gọi API `/api/vtd/member/profile` lấy thông tin chi tiết của tài khoản đang đăng nhập để hiển thị lên Form.
  - Cho phép người dùng chỉnh sửa thông tin cá nhân (Họ tên, Số điện thoại, Địa chỉ...) và gửi yêu cầu cập nhật lưu trữ an toàn về Backend qua phương thức API PUT.
  - Tích hợp chức năng đổi mật khẩu trực tiếp, kiểm tra mật khẩu cũ/mật khẩu mới khớp định dạng an toàn trước khi gửi đi.

### 12. `promotion.js`
* **Nhiệm vụ:** Xử lý áp dụng mã giảm giá (Voucher / Coupon) cho hóa đơn.
* **Chức năng chi tiết:**
  - Lắng nghe hành động nhập mã giảm giá tại trang thanh toán.
  - Gọi API `/api/vtd/public/promotions/check` gửi mã giảm giá lên Backend kiểm tra tính hợp lệ (kiểm tra hạn dùng, điều kiện áp dụng, phần trăm giảm giá).
  - Trừ trực tiếp số tiền được giảm vào tổng hóa đơn thanh toán trên giao diện hiển thị thời gian thực.

### 13. `reset-password.js`
* **Nhiệm vụ:** Quản lý quy trình khôi phục mật khẩu thông qua Email (Forgot Password).
* **Chức năng chi tiết:**
  - Hỗ trợ Form nhập Email để gửi link khôi phục mật khẩu (gửi mã token xác minh về Email người dùng).
  - Hỗ trợ Form nhập mật khẩu mới khi người dùng click vào link chứa token từ Email.
  - Gửi mã xác nhận token cùng mật khẩu mới an toàn lên API Backend `/api/vtd/public/auth/reset-password` để ghi nhận mật khẩu mới.

### 14. `reviews.js`
* **Nhiệm vụ:** Vận hành hệ thống Đánh giá và Phản hồi sự kiện (Review & Rating).
* **Chức năng chi tiết:**
  - Gọi API lấy danh sách các bình luận, đánh giá số sao (1-5 sao) của người dùng đối với một sự kiện nhất định và vẽ lên mục bình luận chi tiết.
  - Cho phép người dùng đã mua vé và tham gia sự kiện gửi bình luận kèm số sao đánh giá mới nhất (sử dụng API POST có đính kèm Token xác thực danh tính người viết).
