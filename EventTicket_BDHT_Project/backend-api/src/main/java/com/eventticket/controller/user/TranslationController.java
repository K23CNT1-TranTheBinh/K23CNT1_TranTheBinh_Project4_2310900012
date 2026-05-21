package com.eventticket.controller.user;

import com.eventticket.entity.G8_AppTranslation;
import com.eventticket.service.AppTranslationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class TranslationController {

    private final AppTranslationService appTranslationService;

    public TranslationController(AppTranslationService appTranslationService) {
        this.appTranslationService = appTranslationService;
    }

    /**
     * GET /api/translations/{langCode}
     * GET /api/nat/public/translations/{langCode}
     * Returns a flat JSON map of translations for the selected language.
     */
    @GetMapping({"/api/translations/{langCode}", "/api/nat/public/translations/{langCode}"})
    public ResponseEntity<Map<String, String>> getTranslations(@PathVariable String langCode) {
        Map<String, String> translations = appTranslationService.getTranslationsMap(langCode);
        return ResponseEntity.ok(translations);
    }

    /**
     * PUT /api/translations
     * Updates or creates a single translation entry.
     */
    @PutMapping("/api/translations")
    public ResponseEntity<G8_AppTranslation> updateTranslation(
            @RequestParam String langCode,
            @RequestParam String textKey,
            @RequestParam String textValue) {
        G8_AppTranslation updated = appTranslationService.saveOrUpdateTranslation(langCode, textKey, textValue);
        return ResponseEntity.ok(updated);
    }
}
