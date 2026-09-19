package com.frauddetect.service;

import com.frauddetect.dto.response.DashboardSummaryResponse;
import com.frauddetect.dto.response.ScoreBucketDto;
import com.frauddetect.entity.ModelVersion;
import com.frauddetect.repository.FraudScoreRepository;
import com.frauddetect.repository.ModelVersionRepository;
import com.frauddetect.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final Logger log = LoggerFactory.getLogger(DashboardService.class);

    private final TransactionRepository transactionRepository;
    private final FraudScoreRepository fraudScoreRepository;
    private final ModelVersionRepository modelVersionRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary() {
        long totalTransactions = transactionRepository.count();
        long highRiskCount = fraudScoreRepository.countByRiskTier("HIGH");

        BigDecimal flaggedRate = BigDecimal.ZERO;
        if (totalTransactions > 0) {
            flaggedRate = BigDecimal.valueOf((double) highRiskCount / totalTransactions)
                    .setScale(4, RoundingMode.HALF_UP);
        }

        String activeModelVersion = modelVersionRepository.findByIsActiveTrue()
                .map(ModelVersion::getVersion)
                .orElse("v1");

        Double avgProbDouble = fraudScoreRepository.findAverageFraudProbability();
        BigDecimal avgProb = avgProbDouble != null
                ? BigDecimal.valueOf(avgProbDouble).setScale(4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // Compute 5 histogram score buckets: 0.0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0
        List<Double> probs = fraudScoreRepository.findAllProbabilities();
        long b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;

        for (Double p : probs) {
            if (p == null) continue;
            if (p < 0.20) b1++;
            else if (p < 0.40) b2++;
            else if (p < 0.60) b3++;
            else if (p < 0.80) b4++;
            else b5++;
        }

        List<ScoreBucketDto> buckets = new ArrayList<>();
        buckets.add(new ScoreBucketDto("0.0-0.2", b1));
        buckets.add(new ScoreBucketDto("0.2-0.4", b2));
        buckets.add(new ScoreBucketDto("0.4-0.6", b3));
        buckets.add(new ScoreBucketDto("0.6-0.8", b4));
        buckets.add(new ScoreBucketDto("0.8-1.0", b5));

        log.info("Dashboard summary: totalTx={}, flaggedRate={}, activeVersion={}",
                totalTransactions, flaggedRate, activeModelVersion);

        return DashboardSummaryResponse.builder()
                .totalTransactions(totalTransactions)
                .flaggedRate(flaggedRate)
                .scoreDistribution(buckets)
                .activeModelVersion(activeModelVersion)
                .avgFraudProbability(avgProb)
                .build();
    }
}
