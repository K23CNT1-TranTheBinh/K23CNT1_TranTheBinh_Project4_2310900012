package com.eventticket.repository;

import com.eventticket.entity.user.VtdG8Venue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VenueRepository extends JpaRepository<VtdG8Venue, Integer> {
    @Query("SELECT v FROM VtdG8Venue v WHERE LOWER(v.venueName) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<VtdG8Venue> searchByName(@Param("keyword") String keyword);
    
    @Query("SELECT v FROM VtdG8Venue v WHERE v.capacity >= :minCapacity ORDER BY v.capacity ASC")
    List<VtdG8Venue> findByMinCapacity(@Param("minCapacity") Integer minCapacity);
}
