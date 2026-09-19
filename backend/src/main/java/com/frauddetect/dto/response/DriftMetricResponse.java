package com.frauddetect.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriftMetricResponse {
    private String featureName;
    private Instant windowStart;
    private Instant windowEnd;
    private BigDecimal driftScore;
    private boolean thresholdBreached;
}
