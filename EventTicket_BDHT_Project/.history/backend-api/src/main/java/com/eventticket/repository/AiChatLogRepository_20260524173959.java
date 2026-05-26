package com.eventticket.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.eventticket.entity.G8_AiChatLog;

import java.util.List;

@Repository
public interface AiChatLogRepository extends JpaRepository<G8_AiChatLog, Integer> {
    @Query("SELECT c FROM G8_AiChatLog c WHERE c.sessionCode = :sessionCode ORDER BY c.createdAt ASC")
    List<G8_AiChatLog> findBySessionCode(@Param("sessionCode") String sessionCode);

    @Query("SELECT c FROM G8_AiChatLog c WHERE c.user.userId = :userId ORDER BY c.createdAt DESC")
    List<G8_AiChatLog> findByUserId(@Param("userId") Integer userId);

    @Query("SELECT DISTINCT c.sessionCode FROM G8_AiChatLog c WHERE c.user.userId = :userId")
    List<String> findSessionCodesByUserId(@Param("userId") Integer userId);

    @Query("SELECT COUNT(c) FROM G8_AiChatLog c WHERE c.sessionCode = :sessionCode AND c.sender = 'USER'")
    long countUserMessagesInSession(@Param("sessionCode") String sessionCode);

}