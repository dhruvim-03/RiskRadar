package com.frauddetect.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MlScoreRequest {

    @JsonProperty("account_id")
    private String accountId;

    @JsonProperty("amount")
    private Double amount;

    @JsonProperty("amount_log")
    private Double amountLog;

    @JsonProperty("hour_of_day")
    private Integer hourOfDay;

    @JsonProperty("tx_count_last_1h_per_account")
    private Double txCountLast1h;

    @JsonProperty("tx_count_last_24h_per_account")
    private Double txCountLast24h;

    @JsonProperty("avg_amount_last_24h_per_account")
    private Double avgAmountLast24h;

    @JsonProperty("time_since_last_tx_per_account")
    private Double timeSinceLastTx;

    @JsonProperty("raw_features")
    private Map<String, Object> rawFeatures;
}
