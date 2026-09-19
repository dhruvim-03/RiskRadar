package com.frauddetect.controller;

import com.frauddetect.dto.request.FeedbackRequest;
import com.frauddetect.dto.request.TransactionRequest;
import com.frauddetect.dto.response.TransactionPageResponse;
import com.frauddetect.dto.response.TransactionScoreResponse;
import com.frauddetect.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private static final Logger log = LoggerFactory.getLogger(TransactionController.class);

    private final TransactionService transactionService;

    @PostMapping
    public ResponseEntity<TransactionScoreResponse> submitTransaction(@Valid @RequestBody TransactionRequest request) {
        log.info("REST request to submit transaction: ref={}, account={}",
                request.getTransactionRef(), request.getAccountId());
        TransactionScoreResponse response = transactionService.scoreTransaction(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<TransactionPageResponse> getTransactions(
            @RequestParam(required = false) String riskTier,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        log.info("REST request to list transactions: riskTier={}, page={}, size={}", riskTier, page, size);
        TransactionPageResponse response = transactionService.getFilteredTransactions(
                riskTier, startDate, endDate, search, page, size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionScoreResponse> getTransactionDetail(@PathVariable Long id) {
        log.info("REST request to get transaction detail id={}", id);
        TransactionScoreResponse response = transactionService.getTransactionDetail(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/explanation")
    public ResponseEntity<Map<String, Object>> getTransactionExplanation(@PathVariable Long id) {
        log.info("REST request to get transaction explanation id={}", id);
        Map<String, Object> response = transactionService.getTransactionExplanation(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/feedback")
    public ResponseEntity<Map<String, Object>> updateFeedback(
            @PathVariable Long id,
            @Valid @RequestBody FeedbackRequest request) {
        log.info("REST request to update feedback for id={}: confirmed={}", id, request.getIsConfirmedFraud());
        transactionService.updateFraudFeedback(id, request.getIsConfirmedFraud());
        return ResponseEntity.ok(Map.of("message", "Feedback recorded successfully", "transactionId", id));
    }
}
