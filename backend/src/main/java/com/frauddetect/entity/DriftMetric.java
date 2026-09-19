package com.frauddetect.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "drift_metrics", indexes = {
    @Index(name = "idx_drift_metrics_feature_window", columnList = "feature_name, window_start")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriftMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "feature_name", nullable = false, length = 50)
    private String featureName;

    @Column(name = "window_start", nullable = false)
    private Instant windowStart;

    @Column(name = "window_end", nullable = false)
    private Instant windowEnd;

    @Column(name = "drift_score", nullable = false, precision = 8, scale = 5)
    private BigDecimal driftScore; // PSI value

    @Column(name = "threshold_breached", nullable = false)
    @Builder.Default
    private Boolean thresholdBreached = false;

    @Column(name = "computed_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant computedAt = Instant.now();
}
