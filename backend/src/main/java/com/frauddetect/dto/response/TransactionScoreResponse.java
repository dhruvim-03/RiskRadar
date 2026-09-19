package com.frauddetect.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TransactionScoreResponse {
    private Long transactionId;
    private String transactionRef;
    private String accountId;
    private BigDecimal amount;
    private String merchantCategory;
    private Instant transactionTime;
    private Map<String, Object> rawFeatures;
    private BigDecimal fraudProbability;
    private String riskTier;
    private List<ShapFeatureDto> shapTopFeatures;
    private String modelVersion;
    private Boolean isConfirmedFraud;
    private Instant scoredAt;
}
