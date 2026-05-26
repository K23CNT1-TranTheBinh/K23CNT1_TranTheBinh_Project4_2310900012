package com.eventticket.controller.admin;

import com.eventticket.entity.G8_users;
import com.eventticket.service.admin.TtbUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ttb/users")
@RequiredArgsConstructor // Chuẩn Lombok đồng bộ hệ thống
public class TtbUserController {

    private final TtbUserService ttbUserService;

    // Xem danh sách, Tìm kiếm và Lọc (Gom chung 1 method GET giống Promotion)
    // API: GET /api/ttb/users
    @GetMapping
    public ResponseEntity<List<G8_users>> getUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean isActive) {
        
        if (keyword != null) {
            return ResponseEntity.ok(ttbUserService.searchUsers(keyword));
        }
        if (role != null || isActive != null) {
            return ResponseEntity.ok(ttbUserService.filterUsers(role, isActive));
        }
        return ResponseEntity.ok(ttbUserService.getAllUsers());
    }

    // Lấy chi tiết 1 người dùng
    // API: GET /api/ttb/users/{id}
    @GetMapping("/{id}")
    public ResponseEntity<G8_users> getUserById(@PathVariable Integer id) {
        return ResponseEntity.ok(ttbUserService.getUserProfile(id));
    }

    // Thêm mới người dùng (Tạo tài khoản trực tiếp từ ttb)
    // API: POST /api/ttb/users/add
    @PostMapping("/add")
    public ResponseEntity<G8_users> createUser(@RequestBody G8_users user) {
        return ResponseEntity.ok(ttbUserService.createUser(user));
    }

    // Khóa tài khoản người dùng
    // API: PUT /api/ttb/users/block/{id}
    @PutMapping("/block/{id}")
    public ResponseEntity<G8_users> blockUser(@PathVariable Integer id) {
        return ResponseEntity.ok(ttbUserService.blockUser(id));
    }

    // Mở khóa tài khoản người dùng
    // API: PUT /api/ttb/users/unblock/{id}
    @PutMapping("/unblock/{id}")
    public ResponseEntity<G8_users> unblockUser(@PathVariable Integer id) {
        return ResponseEntity.ok(ttbUserService.unblockUser(id));
    }

    // Xóa hẳn dòng người dùng ra khỏi cơ sở dữ liệu
    // API: DELETE /api/ttb/users/delete/{id}
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable Integer id) {
        ttbUserService.deleteUser(id);
        return ResponseEntity.ok("Xóa người dùng thành công!");
    }

    // Lấy danh sách người dùng đang hoạt động
    // API: GET /api/ttb/users/active
    @GetMapping("/active")
    public ResponseEntity<List<G8_users>> getActiveUsers() {
        return ResponseEntity.ok(ttbUserService.getActiveUsers());
    }

    // Đếm số lượng ttb hiện có trong hệ thống
    // API: GET /api/ttb/users/count-ttbs
    @GetMapping("/count-ttbs")
    public ResponseEntity<Long> countttbs() {
        return ResponseEntity.ok(ttbUserService.countAdmins());
    }
}