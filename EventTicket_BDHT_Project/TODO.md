# TODO - Fix frontend header/footer not showing

- [x] Tìm nguyên nhân: `pageUtils.loadHeader/loadFooter` fetch `/components/header.html` và `/components/footer.html` gây 404 khi chạy Live Server theo root khác.
- [x] Sửa `frontend-web/assets/js/core/api-client.js`: đổi fetch từ `/components/...` sang `components/...`.
- [ ] Chạy lại frontend và kiểm tra DevTools Network: `components/header.html` và `components/footer.html` trả về 200.
- [ ] Hard refresh (Ctrl+F5) và xác nhận header/footer hiển thị đúng.

