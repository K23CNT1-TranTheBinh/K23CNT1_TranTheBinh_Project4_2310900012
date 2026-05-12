package com.eventticket.repository;

import com.eventticket.entity.user.VtdG8AiChatLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiChatLogRepository extends JpaRepository<VtdG8AiChatLog, Integer> {
    @Query("SELECT c FROM VtdG8AiChatLog c WHERE c.sessionCode = :sessionCode ORDER BY c.createdAt ASC")
    List<VtdG8AiChatLog> findBySessionCode(@Param("sessionCode") String sessionCode);
    
    @Query("SELECT c FROM VtdG8AiChatLog c WHERE c.user.userId = :userId ORDER BY c.createdAt DESC")
    List<VtdG8AiChatLog> findByUserId(@Param("userId") Integer userId);
    
    @Query("SELECT DISTINCT c.sessionCode FROM VtdG8AiChatLog c WHERE c.user.userId = :userId")
    List<String> findSessionCodesByUserId(@Param("userId") Integer userId);
    
    @Query("SELECT COUNT(c) FROM VtdG8AiChatLog c WHERE c.sessionCode = :sessionCode AND c.sender = 'USER'")
    long countUserMessagesInSession(@Param("sessionCode") String sessionCode);
}
