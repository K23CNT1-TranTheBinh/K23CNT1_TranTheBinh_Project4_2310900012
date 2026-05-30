package com.eventticket.controller.admin;

import com.eventticket.entity.G8_users;
import com.eventticket.service.admin.TtbAdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ttb/admin/users")
@RequiredArgsConstructor // Chuẩn Lombok đồng bộ hệ thống
public class TtbAdminUserController {

    private final TtbAdminUserService adminUserService;

    // Xem danh sách, Tìm kiếm và Lọc (Gom chung 1 method GET giống Promotion)
    // API: GET /api/ttb/admin/users
    @GetMapping
    public ResponseEntity<List<G8_users>> getUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean isActive) {

        if (keyword != null) {
            return ResponseEntity.ok(adminUserService.searchUsers(keyword));
        }
        if (role != null || isActive != null) {
            return ResponseEntity.ok(adminUserService.filterUsers(role, isActive));
        }
        return ResponseEntity.ok(adminUserService.getAllUsers());
    }

    // Lấy chi tiết 1 người dùng
    // API: GET /api/ttb/admin/users/{id}
    @GetMapping("/{id}")
    public ResponseEntity<G8_users> getUserById(@PathVariable Integer id) {
        return ResponseEntity.ok(adminUserService.getUserProfile(id));
    }

    // Thêm mới người dùng (Tạo tài khoản trực tiếp từ Admin)
    // API: POST /api/ttb/admin/users/add
    @PostMapping("/add")
    public ResponseEntity<G8_users> createUser(@RequestBody G8_users user) {
        return ResponseEntity.ok(adminUserService.createUser(user));
    }

    // Khóa tài khoản người dùng
    // API: PUT /api/ttb/admin/users/block/{id}
    @PutMapping("/block/{id}")
    public ResponseEntity<G8_users> blockUser(@PathVariable Integer id) {
        return ResponseEntity.ok(adminUserService.blockUser(id));
    }

    // Mở khóa tài khoản người dùng
    // API: PUT /api/ttb/admin/users/unblock/{id}
    @PutMapping("/unblock/{id}")
    public ResponseEntity<G8_users> unblockUser(@PathVariable Integer id) {
        return ResponseEntity.ok(adminUserService.unblockUser(id));
    }

    // Xóa hẳn dòng người dùng ra khỏi cơ sở dữ liệu
    // API: DELETE /api/ttb/admin/users/delete/{id}
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable Integer id) {
        adminUserService.deleteUser(id);
        return ResponseEntity.ok("Xóa người dùng thành công!");
    }

    // Lấy danh sách người dùng đang hoạt động
    // API: GET /api/ttb/admin/users/active
    @GetMapping("/active")
    public ResponseEntity<List<G8_users>> getActiveUsers() {
        return ResponseEntity.ok(adminUserService.getActiveUsers());
    }

    // Đếm số lượng Admin hiện có trong hệ thống
    // API: GET /api/ttb/admin/users/count-admins
    @GetMapping("/count-admins")
    public ResponseEntity<Long> countAdmins() {
        return ResponseEntity.ok(adminUserService.countAdmins());
    }
}