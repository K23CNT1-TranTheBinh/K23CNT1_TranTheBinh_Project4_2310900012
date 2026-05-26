package com.eventticket.repository;

import com.eventticket.entity.user.G8_venue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VenueRepository extends JpaRepository<G8_venue, Integer> {
    @Query("SELECT v FROM G8_venue v WHERE LOWER(v.venueName) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<G8_venue> searchByName(@Param("keyword") String keyword);

    @Query("SELECT v FROM G8_venue v WHERE v.capacity >= :minCapacity ORDER BY v.capacity ASC")
    List<G8_venue> findByMinCapacity(@Param("minCapacity") Integer minCapacity);
}
