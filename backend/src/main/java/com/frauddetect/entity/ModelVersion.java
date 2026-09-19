package com.frauddetect.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "model_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModelVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String version;

    @Column(name = "trained_at", nullable = false)
    private Instant trainedAt;

    @Column(name = "pr_auc", nullable = false, precision = 6, scale = 5)
    private BigDecimal prAuc;

    @Column(name = "precision_at_threshold", nullable = false, precision = 6, scale = 5)
    private BigDecimal precisionAtThreshold;

    @Column(name = "recall_at_threshold", nullable = false, precision = 6, scale = 5)
    private BigDecimal recallAtThreshold;

    @Column(name = "artifact_path", nullable = false, length = 255)
    private String artifactPath;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = false;
}
