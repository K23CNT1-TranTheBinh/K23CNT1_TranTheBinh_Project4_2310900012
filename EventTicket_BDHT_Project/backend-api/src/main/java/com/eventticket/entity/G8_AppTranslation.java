package com.eventticket.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "G8_translations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class G8_AppTranslation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_translation_id")
    private Integer id;

    @Column(name = "G8_lang_code", nullable = false, length = 10)
    private String langCode;

    @Column(name = "G8_text_key", nullable = false, length = 250)
    private String textKey;

    @Column(name = "G8_text_value", nullable = false, columnDefinition = "NVARCHAR(1000)")
    private String textValue;
}
