package com.frauddetect.service;

import com.frauddetect.dto.request.MlScoreRequest;
import com.frauddetect.entity.Transaction;
import com.frauddetect.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FeatureEngineeringService {

    private static final Logger log = LoggerFactory.getLogger(FeatureEngineeringService.class);

    private final TransactionRepository transactionRepository;

    /**
     * Extracts leakage-free temporal and behavioral features.
     * Guaranteed: ONLY prior transactions strictly before txTime are used.
     */
    @Transactional(readOnly = true)
    public MlScoreRequest extractFeatures(
            String accountId,
            BigDecimal amount,
            Instant transactionTime,
            Map<String, Object> rawFeatures) {

        // 1. Amount transformation
        double amountVal = amount != null ? amount.doubleValue() : 0.0;
        double amountLog = Math.log1p(Math.max(0.0, amountVal));

        // 2. Hour of day (UTC 0-23)
        int hourOfDay = transactionTime.atZone(ZoneOffset.UTC).getHour();

        // 3. Strict 1-hour velocity window (txTime - 1h <= t < txTime)
        Instant oneHourAgo = transactionTime.minus(Duration.ofHours(1));
        long txCount1h = transactionRepository
                .countByAccountIdAndTransactionTimeGreaterThanEqualAndTransactionTimeLessThan(
                        accountId, oneHourAgo, transactionTime);

        // 4. Strict 24-hour velocity window (txTime - 24h <= t < txTime)
        Instant twentyFourHoursAgo = transactionTime.minus(Duration.ofHours(24));
        List<Transaction> past24hTxs = transactionRepository
                .findByAccountIdAndTransactionTimeGreaterThanEqualAndTransactionTimeLessThan(
                        accountId, twentyFourHoursAgo, transactionTime);

        double txCount24h = past24hTxs.size();

        // 5. 24-hour average amount
        double avgAmount24h = 0.0;
        if (!past24hTxs.isEmpty()) {
            double sum = past24hTxs.stream()
                    .mapToDouble(t -> t.getAmount() != null ? t.getAmount().doubleValue() : 0.0)
                    .sum();
            avgAmount24h = sum / past24hTxs.size();
        }

        // 6. Time since most recent prior transaction (seconds)
        Optional<Transaction> lastTxOpt = transactionRepository
                .findFirstByAccountIdAndTransactionTimeLessThanOrderByTransactionTimeDesc(
                        accountId, transactionTime);

        double timeSinceLastTxSeconds = 86400.0; // Default 24 hours if no prior transaction exists
        if (lastTxOpt.isPresent()) {
            long seconds = Duration.between(lastTxOpt.get().getTransactionTime(), transactionTime).getSeconds();
            timeSinceLastTxSeconds = Math.max(0.0, (double) seconds);
        }

        // 7. Ensure clean raw features map (v1 through v28)
        Map<String, Object> cleanRawFeatures = new HashMap<>();
        if (rawFeatures != null) {
            for (int i = 1; i <= 28; i++) {
                String keyLower = "v" + i;
                String keyUpper = "V" + i;
                Object val = rawFeatures.containsKey(keyLower) ? rawFeatures.get(keyLower) : rawFeatures.get(keyUpper);
                if (val != null) {
                    cleanRawFeatures.put(keyLower, val);
                } else {
                    cleanRawFeatures.put(keyLower, 0.0);
                }
            }
        } else {
            for (int i = 1; i <= 28; i++) {
                cleanRawFeatures.put("v" + i, 0.0);
            }
        }

        log.info("Engineered features for account {}: count1h={}, count24h={}, avgAmt24h={}, timeSinceLastTx={}",
                accountId, txCount1h, txCount24h, avgAmount24h, timeSinceLastTxSeconds);

        return MlScoreRequest.builder()
                .accountId(accountId)
                .amount(amountVal)
                .amountLog(amountLog)
                .hourOfDay(hourOfDay)
                .txCountLast1h((double) txCount1h)
                .txCountLast24h(txCount24h)
                .avgAmountLast24h(avgAmount24h)
                .timeSinceLastTx(timeSinceLastTxSeconds)
                .rawFeatures(cleanRawFeatures)
                .build();
    }
}
