package com.eventticket.repository;

import com.eventticket.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

    List<Event> findByCategory(String category);

    @Query("SELECT e FROM Event e WHERE e.date >= CURRENT_DATE ORDER BY e.date")
    List<Event> findUpcomingEvents();

    Optional<Event> findByNameContainingIgnoreCase(String name);
}
