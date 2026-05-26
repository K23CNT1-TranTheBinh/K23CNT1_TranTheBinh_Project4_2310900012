package com.eventticket.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.eventticket.entity.G8_event;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<G8_event, Integer> {
    @Query("SELECT e FROM G8_event e WHERE e.status = :status AND e.deletedAt IS NULL")
    List<G8_event> findByStatus(@Param("status") String status);

    @Query("SELECT e FROM G8_event e WHERE e.status = 'PUBLISHED' AND e.deletedAt IS NULL ORDER BY e.startTime ASC")
    List<G8_event> findUpcomingEvents();

    @Query("SELECT e FROM G8_event e WHERE e.startTime BETWEEN :startDate AND :endDate AND e.deletedAt IS NULL")
    List<G8_event> findEventsByDateRange(@Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT e FROM G8_event e WHERE LOWER(e.title) LIKE LOWER(CONCAT('%', :keyword, '%')) AND e.deletedAt IS NULL")
    List<G8_event> searchByTitle(@Param("keyword") String keyword);

    @Query("SELECT e FROM G8_event e WHERE e.venue.venueId = :venueId AND e.deletedAt IS NULL")
    List<G8_event> findByVenueId(@Param("venueId") Integer venueId);

    // 1. Lấy top 16 sự kiện mới nhất theo trạng thái (Spring Data tự động generate query dựa vào tên hàm)
    List<G8_event> findTop16ByStatusAndDeletedAtIsNullOrderByEventIdDesc(String status);

    // 2. Tìm kiếm theo trạng thái nhưng có hỗ trợ phân trang (Pageable)
    @Query("SELECT e FROM G8_event e WHERE e.status = :status AND e.deletedAt IS NULL")
    Page<G8_event> findByStatus(@Param("status") String status, Pageable pageable);

    // 3. Tìm kiếm theo tiêu đề hoặc tên nghệ sĩ (Đã sửa lại thành e.artistNames)
    @Query("SELECT e FROM G8_event e WHERE (LOWER(e.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(e.artistNames) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND e.deletedAt IS NULL")
    List<G8_event> searchByTitleOrArtist(@Param("keyword") String keyword);

    // 4. Tìm các sự kiện mới nhất tính từ một mốc thời gian (Sử dụng e.createdAt)
    @Query("SELECT e FROM G8_event e WHERE e.createdAt >= :date AND e.deletedAt IS NULL ORDER BY e.createdAt DESC")
    List<G8_event> findLatestEvents(@Param("date") LocalDateTime date);
}
