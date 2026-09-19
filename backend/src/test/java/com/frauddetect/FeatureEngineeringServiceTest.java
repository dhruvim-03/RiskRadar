package com.frauddetect;

import com.frauddetect.dto.request.MlScoreRequest;
import com.frauddetect.entity.Transaction;
import com.frauddetect.repository.TransactionRepository;
import com.frauddetect.service.FeatureEngineeringService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FeatureEngineeringServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    private FeatureEngineeringService featureEngineeringService;

    @BeforeEach
    void setUp() {
        featureEngineeringService = new FeatureEngineeringService(transactionRepository);
    }

    @Test
    @DisplayName("Verify velocity features strictly use prior transactions (T_prior < T) - Leakage Prevention Test")
    void testLeakageFreeTemporalVelocityFeatures() {
        String accountId = "ACC-12345";
        Instant tCurrent = Instant.parse("2026-09-17T15:00:00Z");
        BigDecimal currentAmount = new BigDecimal("250.00");

        // Prior transactions:
        // Tx1: 20 minutes ago (within 1h and 24h)
        Transaction tx1 = Transaction.builder()
                .id(1L)
                .transactionRef("TX-1")
                .accountId(accountId)
                .amount(new BigDecimal("100.00"))
                .transactionTime(tCurrent.minus(Duration.ofMinutes(20)))
                .build();

        // Tx2: 3 hours ago (within 24h, outside 1h)
        Transaction tx2 = Transaction.builder()
                .id(2L)
                .transactionRef("TX-2")
                .accountId(accountId)
                .amount(new BigDecimal("200.00"))
                .transactionTime(tCurrent.minus(Duration.ofHours(3)))
                .build();

        // Mock repository calls ensuring arguments use strict '< tCurrent'
        Instant oneHourAgo = tCurrent.minus(Duration.ofHours(1));
        Instant twentyFourHoursAgo = tCurrent.minus(Duration.ofHours(24));

        when(transactionRepository.countByAccountIdAndTransactionTimeGreaterThanEqualAndTransactionTimeLessThan(
                eq(accountId), eq(oneHourAgo), eq(tCurrent)))
                .thenReturn(1L);

        when(transactionRepository.findByAccountIdAndTransactionTimeGreaterThanEqualAndTransactionTimeLessThan(
                eq(accountId), eq(twentyFourHoursAgo), eq(tCurrent)))
                .thenReturn(List.of(tx1, tx2));

        when(transactionRepository.findFirstByAccountIdAndTransactionTimeLessThanOrderByTransactionTimeDesc(
                eq(accountId), eq(tCurrent)))
                .thenReturn(Optional.of(tx1));

        // Execute feature extraction
        MlScoreRequest request = featureEngineeringService.extractFeatures(
                accountId, currentAmount, tCurrent, Map.of("v1", -1.2, "v2", 0.5));

        // Assertions
        assertNotNull(request);
        assertEquals(accountId, request.getAccountId());
        assertEquals(250.0, request.getAmount());
        assertEquals(Math.log1p(250.0), request.getAmountLog(), 0.0001);
        assertEquals(15, request.getHourOfDay()); // 15:00 UTC

        // Velocity assertions
        assertEquals(1.0, request.getTxCountLast1h(), "1h count must reflect only tx1");
        assertEquals(2.0, request.getTxCountLast24h(), "24h count must reflect tx1 and tx2");
        assertEquals(150.0, request.getAvgAmountLast24h(), 0.0001, "24h average should be (100+200)/2 = 150");
        assertEquals(1200.0, request.getTimeSinceLastTx(), 0.0001, "Time since last tx should be 20 min (1200 sec)");

        // Raw PCA feature assertions
        assertEquals(-1.2, request.getRawFeatures().get("v1"));
        assertEquals(0.5, request.getRawFeatures().get("v2"));
        assertEquals(0.0, request.getRawFeatures().get("v3"));

        // Verify that the repository was queried with strict `< tCurrent` upper bound, NEVER `<= tCurrent` or future
        verify(transactionRepository).countByAccountIdAndTransactionTimeGreaterThanEqualAndTransactionTimeLessThan(
                eq(accountId), eq(oneHourAgo), eq(tCurrent));
        verify(transactionRepository).findByAccountIdAndTransactionTimeGreaterThanEqualAndTransactionTimeLessThan(
                eq(accountId), eq(twentyFourHoursAgo), eq(tCurrent));
        verify(transactionRepository).findFirstByAccountIdAndTransactionTimeLessThanOrderByTransactionTimeDesc(
                eq(accountId), eq(tCurrent));
    }

    @Test
    @DisplayName("Verify first transaction for account gets default velocity features")
    void testFirstTransactionDefaults() {
        String accountId = "ACC-NEW";
        Instant tCurrent = Instant.parse("2026-09-17T10:00:00Z");

        when(transactionRepository.countByAccountIdAndTransactionTimeGreaterThanEqualAndTransactionTimeLessThan(
                anyString(), any(), any()))
                .thenReturn(0L);
        when(transactionRepository.findByAccountIdAndTransactionTimeGreaterThanEqualAndTransactionTimeLessThan(
                anyString(), any(), any()))
                .thenReturn(List.of());
        when(transactionRepository.findFirstByAccountIdAndTransactionTimeLessThanOrderByTransactionTimeDesc(
                anyString(), any()))
                .thenReturn(Optional.empty());

        MlScoreRequest request = featureEngineeringService.extractFeatures(
                accountId, new BigDecimal("50.00"), tCurrent, null);

        assertEquals(0.0, request.getTxCountLast1h());
        assertEquals(0.0, request.getTxCountLast24h());
        assertEquals(0.0, request.getAvgAmountLast24h());
        assertEquals(86400.0, request.getTimeSinceLastTx()); // default 24h
    }
}
