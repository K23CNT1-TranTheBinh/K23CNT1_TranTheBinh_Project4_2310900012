# TODO - Backend logic check & fixes

- [x] Sửa ReviewService.createReview: lấy user/event đúng repository, gán user/event vào review, save vào DB.
- [x] Implement policy trùng review (userId+eventId): nếu đã tồn tại thì update rating/comment thay vì tạo mới.
- [x] Bổ sung validate rating trong create/update.
- [ ] (Tuỳ chọn) Tăng cường ownership check ở update/delete/hide (nếu có thông tin user hiện tại/role trong security context).
- [ ] Chạy `mvn test` và/hoặc `mvn -q test` để đảm bảo build pass.


