package com.frauddetect;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.frauddetect.dto.request.MlScoreRequest;
import com.frauddetect.dto.request.TransactionRequest;
import com.frauddetect.dto.response.MlScoreResponse;
import com.frauddetect.dto.response.ShapFeatureDto;
import com.frauddetect.dto.response.TransactionScoreResponse;
import com.frauddetect.entity.FraudScore;
import com.frauddetect.entity.ModelVersion;
import com.frauddetect.entity.Transaction;
import com.frauddetect.exception.DuplicateResourceException;
import com.frauddetect.repository.FraudScoreRepository;
import com.frauddetect.repository.ModelVersionRepository;
import com.frauddetect.repository.TransactionRepository;
import com.frauddetect.service.FeatureEngineeringService;
import com.frauddetect.service.MlClient;
import com.frauddetect.service.TransactionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private FraudScoreRepository fraudScoreRepository;

    @Mock
    private ModelVersionRepository modelVersionRepository;

    @Mock
    private FeatureEngineeringService featureEngineeringService;

    @Mock
    private MlClient mlClient;

    private ObjectMapper objectMapper;
    private TransactionService transactionService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        transactionService = new TransactionService(
                transactionRepository,
                fraudScoreRepository,
                modelVersionRepository,
                featureEngineeringService,
                mlClient,
                objectMapper
        );
    }

    @Test
    void testScoreTransactionSuccess() {
        TransactionRequest request = new TransactionRequest(
                "TXN-2026-001", "ACC-101", new BigDecimal("1200.00"), "electronics",
                Instant.parse("2026-09-17T12:00:00Z"), Map.of("v1", 0.5)
        );

        when(transactionRepository.existsByTransactionRef("TXN-2026-001")).thenReturn(false);

        MlScoreRequest mockMlReq = MlScoreRequest.builder()
                .accountId("ACC-101")
                .amount(1200.0)
                .amountLog(Math.log1p(1200.0))
                .build();
        when(featureEngineeringService.extractFeatures(any(), any(), any(), any())).thenReturn(mockMlReq);

        MlScoreResponse mockMlResp = MlScoreResponse.builder()
                .fraudProbability(new BigDecimal("0.85000"))
                .riskTier("HIGH")
                .modelVersion("v1")
                .shapTopFeatures(List.of(new ShapFeatureDto("amountLog", new BigDecimal("7.09"), new BigDecimal("0.45"))))
                .build();
        when(mlClient.score(mockMlReq)).thenReturn(mockMlResp);

        Transaction savedTx = Transaction.builder()
                .id(100L)
                .transactionRef("TXN-2026-001")
                .accountId("ACC-101")
                .amount(new BigDecimal("1200.00"))
                .transactionTime(Instant.parse("2026-09-17T12:00:00Z"))
                .build();
        when(transactionRepository.save(any(Transaction.class))).thenReturn(savedTx);

        // Execute
        TransactionScoreResponse result = transactionService.scoreTransaction(request);

        // Verifications
        assertNotNull(result);
        assertEquals(100L, result.getTransactionId());
        assertEquals("HIGH", result.getRiskTier());
        assertEquals(new BigDecimal("0.85000"), result.getFraudProbability());
        assertEquals(1, result.getShapTopFeatures().size());
        assertEquals("v1", result.getModelVersion());

        verify(transactionRepository).save(any(Transaction.class));
        verify(fraudScoreRepository).save(any(FraudScore.class));
    }

    @Test
    void testDuplicateTransactionRefThrowsConflict() {
        TransactionRequest request = new TransactionRequest(
                "TXN-DUPLICATE", "ACC-101", new BigDecimal("100.00"), null,
                Instant.now(), null
        );

        when(transactionRepository.existsByTransactionRef("TXN-DUPLICATE")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> transactionService.scoreTransaction(request));
        verify(mlClient, never()).score(any());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void testRiskTierComputation() {
        assertEquals("LOW", TransactionService.computeRiskTier(new BigDecimal("0.12")));
        assertEquals("LOW", TransactionService.computeRiskTier(new BigDecimal("0.2999")));
        assertEquals("MEDIUM", TransactionService.computeRiskTier(new BigDecimal("0.30")));
        assertEquals("MEDIUM", TransactionService.computeRiskTier(new BigDecimal("0.70")));
        assertEquals("HIGH", TransactionService.computeRiskTier(new BigDecimal("0.7001")));
        assertEquals("HIGH", TransactionService.computeRiskTier(new BigDecimal("0.95")));
    }
}
