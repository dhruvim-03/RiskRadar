package com.frauddetect.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "fraud_scores", indexes = {
    @Index(name = "idx_fraud_scores_risk_tier", columnList = "risk_tier")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FraudScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", nullable = false, unique = true)
    private Transaction transaction;

    @Column(name = "fraud_probability", nullable = false, precision = 6, scale = 5)
    private BigDecimal fraudProbability;

    @Column(name = "risk_tier", nullable = false, length = 10)
    private String riskTier; // "LOW", "MEDIUM", "HIGH"

    @Column(name = "model_version", nullable = false, length = 20)
    private String modelVersion;

    @Column(name = "shap_top_features", nullable = false, columnDefinition = "TEXT")
    private String shapTopFeatures; // JSON array string

    @Column(name = "is_confirmed_fraud")
    private Boolean isConfirmedFraud;

    @Column(name = "scored_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant scoredAt = Instant.now();
}
