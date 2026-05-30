package com.eventticket.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.eventticket.entity.G8_event;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<G8_event, Integer> {
    @Query("SELECT e FROM G8_event e WHERE e.status = :status AND e.deletedAt IS NULL")
    List<G8_event> findByStatus(@Param("status") String status);

    // USER/GUEST: Danh sách sự kiện có phân trang cho trang danh sách.
    @Query("SELECT e FROM G8_event e WHERE e.status = :status AND e.deletedAt IS NULL ORDER BY e.startTime ASC")
    Page<G8_event> findByStatus(@Param("status") String status, Pageable pageable);

    @Query("SELECT e FROM G8_event e WHERE e.status = 'PUBLISHED' AND e.deletedAt IS NULL ORDER BY e.startTime ASC")
    List<G8_event> findUpcomingEvents();

    @Query("SELECT e FROM G8_event e WHERE e.startTime BETWEEN :startDate AND :endDate AND e.deletedAt IS NULL")
    List<G8_event> findEventsByDateRange(@Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT e FROM G8_event e WHERE LOWER(e.title) LIKE LOWER(CONCAT('%', :keyword, '%')) AND e.deletedAt IS NULL")
    List<G8_event> searchByTitle(@Param("keyword") String keyword);

    // USER/GUEST: Tìm theo tên sự kiện hoặc tên nghệ sĩ.
    @Query("""
            SELECT e FROM G8_event e
            WHERE e.status = 'PUBLISHED'
              AND e.deletedAt IS NULL
              AND (
                  LOWER(e.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  OR LOWER(COALESCE(e.artistNames, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            ORDER BY e.startTime ASC
            """)
    List<G8_event> searchByTitleOrArtist(@Param("keyword") String keyword);

    @Query("SELECT e FROM G8_event e WHERE e.venue.venueId = :venueId AND e.deletedAt IS NULL")
    List<G8_event> findByVenueId(@Param("venueId") Integer venueId);

    // THÊM MỚI 1: Lấy sự kiện mới nhất dựa vào thời gian tạo (created_at)
    @Query("SELECT e FROM G8_event e WHERE e.status = 'PUBLISHED' AND e.createdAt >= :fiveDaysAgo AND e.deletedAt IS NULL ORDER BY e.createdAt DESC")
    List<G8_event> findLatestEvents(@Param("fiveDaysAgo") LocalDateTime fiveDaysAgo);

    List<G8_event> findTop16ByStatusAndDeletedAtIsNullOrderByEventIdDesc(String status);
}
