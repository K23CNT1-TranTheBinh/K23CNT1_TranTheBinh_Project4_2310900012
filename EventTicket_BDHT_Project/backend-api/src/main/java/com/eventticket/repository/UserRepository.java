package com.eventticket.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.eventticket.entity.G8_users;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<G8_users, Integer> {
    Optional<G8_users> findByEmail(String email);

    Optional<G8_users> findByResetToken(String resetToken);

    @Query("SELECT u FROM G8_users u WHERE u.role = :role")
    List<G8_users> findByRole(@Param("role") String role);

    @Query("SELECT u FROM G8_users u WHERE u.isActive = true AND u.deletedAt IS NULL")
    List<G8_users> findAllActiveUsers();

    @Query("SELECT COUNT(u) FROM G8_users u WHERE u.role = 'ADMIN'")
    long countAdmins();
}
