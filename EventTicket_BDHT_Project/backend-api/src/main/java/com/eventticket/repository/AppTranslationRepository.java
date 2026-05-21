package com.eventticket.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.eventticket.entity.G8_AppTranslation;

import java.util.List;
import java.util.Optional;

@Repository
public interface AppTranslationRepository extends JpaRepository<G8_AppTranslation, Integer> {
    List<G8_AppTranslation> findByLangCode(String langCode);
    Optional<G8_AppTranslation> findByLangCodeAndTextKey(String langCode, String textKey);
}
