package com.frauddetect.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.frauddetect.dto.request.MlScoreRequest;
import com.frauddetect.dto.request.TransactionRequest;
import com.frauddetect.dto.response.*;
import com.frauddetect.entity.FraudScore;
import com.frauddetect.entity.ModelVersion;
import com.frauddetect.entity.Transaction;
import com.frauddetect.exception.DuplicateResourceException;
import com.frauddetect.exception.ResourceNotFoundException;
import com.frauddetect.repository.FraudScoreRepository;
import com.frauddetect.repository.ModelVersionRepository;
import com.frauddetect.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private static final Logger log = LoggerFactory.getLogger(TransactionService.class);

    private final TransactionRepository transactionRepository;
    private final FraudScoreRepository fraudScoreRepository;
    private final ModelVersionRepository modelVersionRepository;
    private final FeatureEngineeringService featureEngineeringService;
    private final MlClient mlClient;
    private final ObjectMapper objectMapper;

    @Transactional
    public TransactionScoreResponse scoreTransaction(TransactionRequest request) {
        if (transactionRepository.existsByTransactionRef(request.getTransactionRef())) {
            throw new DuplicateResourceException("Transaction with reference '" + request.getTransactionRef() + "' already exists");
        }

        // 1. Compute leakage-free features BEFORE persisting this transaction
        // (Ensures strict temporal isolation: transaction T does not count itself or future transactions)
        MlScoreRequest mlRequest = featureEngineeringService.extractFeatures(
                request.getAccountId(),
                request.getAmount(),
                request.getTransactionTime(),
                request.getRawFeatures()
        );

        // 2. Call ML microservice
        MlScoreResponse mlResponse = mlClient.score(mlRequest);

        // 3. Persist raw Transaction
        String rawFeaturesJson = null;
        if (request.getRawFeatures() != null) {
            try {
                rawFeaturesJson = objectMapper.writeValueAsString(request.getRawFeatures());
            } catch (Exception e) {
                log.warn("Failed to serialize raw features: {}", e.getMessage());
            }
        }

        Transaction transaction = Transaction.builder()
                .transactionRef(request.getTransactionRef())
                .accountId(request.getAccountId())
                .amount(request.getAmount())
                .merchantCategory(request.getMerchantCategory())
                .transactionTime(request.getTransactionTime())
                .rawFeatures(rawFeaturesJson)
                .build();

        Transaction savedTx = transactionRepository.save(transaction);

        // 4. Compute risk tier: LOW (< 0.3), MEDIUM (0.3 - 0.7), HIGH (> 0.7)
        BigDecimal prob = mlResponse.getFraudProbability() != null
                ? mlResponse.getFraudProbability()
                : BigDecimal.ZERO;
        String riskTier = computeRiskTier(prob);

        // Determine active model version
        String activeModelVersion = mlResponse.getModelVersion();
        if (activeModelVersion == null || activeModelVersion.isBlank()) {
            activeModelVersion = modelVersionRepository.findByIsActiveTrue()
                    .map(ModelVersion::getVersion)
                    .orElse("v1");
        }

        // 5. Serialize SHAP features
        List<ShapFeatureDto> shapList = mlResponse.getShapTopFeatures() != null
                ? mlResponse.getShapTopFeatures()
                : Collections.emptyList();

        String shapJson = "[]";
        try {
            shapJson = objectMapper.writeValueAsString(shapList);
        } catch (Exception e) {
            log.warn("Failed to serialize SHAP features: {}", e.getMessage());
        }

        FraudScore fraudScore = FraudScore.builder()
                .transaction(savedTx)
                .fraudProbability(prob.setScale(5, RoundingMode.HALF_UP))
                .riskTier(riskTier)
                .modelVersion(activeModelVersion)
                .shapTopFeatures(shapJson)
                .build();

        fraudScoreRepository.save(fraudScore);
        log.info("Scored transaction id={}: ref={}, prob={}, tier={}",
                savedTx.getId(), savedTx.getTransactionRef(), prob, riskTier);

        return TransactionScoreResponse.builder()
                .transactionId(savedTx.getId())
                .transactionRef(savedTx.getTransactionRef())
                .accountId(savedTx.getAccountId())
                .amount(savedTx.getAmount())
                .merchantCategory(savedTx.getMerchantCategory())
                .transactionTime(savedTx.getTransactionTime())
                .rawFeatures(request.getRawFeatures())
                .fraudProbability(prob)
                .riskTier(riskTier)
                .shapTopFeatures(shapList)
                .modelVersion(activeModelVersion)
                .scoredAt(fraudScore.getScoredAt())
                .build();
    }

    @Transactional(readOnly = true)
    public TransactionPageResponse getFilteredTransactions(
            String riskTier,
            Instant startDate,
            Instant endDate,
            String search,
            int page,
            int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "transactionTime"));
        String normalizedRiskTier = (riskTier != null && !riskTier.equalsIgnoreCase("ALL") && !riskTier.isBlank())
                ? riskTier.toUpperCase() : null;
        String normalizedSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        Page<Transaction> txPage = transactionRepository.findFilteredTransactions(
                normalizedRiskTier, startDate, endDate, normalizedSearch, pageable);

        List<TransactionListItemDto> items = txPage.getContent().stream().map(tx -> {
            FraudScore fs = tx.getFraudScore();
            return TransactionListItemDto.builder()
                    .transactionId(tx.getId())
                    .transactionRef(tx.getTransactionRef())
                    .accountId(tx.getAccountId())
                    .amount(tx.getAmount())
                    .riskTier(fs != null ? fs.getRiskTier() : "UNKNOWN")
                    .fraudProbability(fs != null ? fs.getFraudProbability() : BigDecimal.ZERO)
                    .transactionTime(tx.getTransactionTime())
                    .build();
        }).toList();

        return TransactionPageResponse.builder()
                .content(items)
                .totalElements(txPage.getTotalElements())
                .totalPages(txPage.getTotalPages())
                .pageNumber(txPage.getNumber())
                .pageSize(txPage.getSize())
                .build();
    }

    @Transactional(readOnly = true)
    public TransactionScoreResponse getTransactionDetail(Long id) {
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + id));

        FraudScore fs = tx.getFraudScore();
        List<ShapFeatureDto> shapList = parseShapFeatures(fs != null ? fs.getShapTopFeatures() : null);
        Map<String, Object> rawMap = parseRawFeatures(tx.getRawFeatures());

        return TransactionScoreResponse.builder()
                .transactionId(tx.getId())
                .transactionRef(tx.getTransactionRef())
                .accountId(tx.getAccountId())
                .amount(tx.getAmount())
                .merchantCategory(tx.getMerchantCategory())
                .transactionTime(tx.getTransactionTime())
                .rawFeatures(rawMap)
                .fraudProbability(fs != null ? fs.getFraudProbability() : BigDecimal.ZERO)
                .riskTier(fs != null ? fs.getRiskTier() : "UNKNOWN")
                .shapTopFeatures(shapList)
                .modelVersion(fs != null ? fs.getModelVersion() : "v1")
                .isConfirmedFraud(fs != null ? fs.getIsConfirmedFraud() : null)
                .scoredAt(fs != null ? fs.getScoredAt() : tx.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTransactionExplanation(Long id) {
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + id));

        FraudScore fs = tx.getFraudScore();
        List<ShapFeatureDto> shapList = parseShapFeatures(fs != null ? fs.getShapTopFeatures() : null);
        return Map.of("shapTopFeatures", shapList);
    }

    @Transactional
    public void updateFraudFeedback(Long id, boolean isConfirmedFraud) {
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + id));

        FraudScore fs = tx.getFraudScore();
        if (fs != null) {
            fs.setIsConfirmedFraud(isConfirmedFraud);
            fraudScoreRepository.save(fs);
            log.info("Updated fraud feedback for transaction id={}: isConfirmed={}", id, isConfirmedFraud);
        }
    }

    public static String computeRiskTier(BigDecimal prob) {
        double p = prob != null ? prob.doubleValue() : 0.0;
        if (p < 0.30) {
            return "LOW";
        } else if (p <= 0.70) {
            return "MEDIUM";
        } else {
            return "HIGH";
        }
    }

    private List<ShapFeatureDto> parseShapFeatures(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<ShapFeatureDto>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse SHAP json: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private Map<String, Object> parseRawFeatures(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }
}
