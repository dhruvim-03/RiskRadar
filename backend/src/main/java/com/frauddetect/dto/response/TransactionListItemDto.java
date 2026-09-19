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
public class TransactionListItemDto {
    private Long transactionId;
    private String transactionRef;
    private String accountId;
    private BigDecimal amount;
    private String riskTier;
    private BigDecimal fraudProbability;
    private Instant transactionTime;
}
