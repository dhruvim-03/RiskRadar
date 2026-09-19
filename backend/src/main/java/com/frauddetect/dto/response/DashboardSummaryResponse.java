package com.frauddetect.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSummaryResponse {
    private long totalTransactions;
    private BigDecimal flaggedRate;
    private List<ScoreBucketDto> scoreDistribution;
    private String activeModelVersion;
    private BigDecimal avgFraudProbability;
}
