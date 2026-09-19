package com.frauddetect.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
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
public class MlScoreResponse {

    @JsonProperty("fraud_probability")
    private BigDecimal fraudProbability;

    @JsonProperty("risk_tier")
    private String riskTier;

    @JsonProperty("shap_top_features")
    private List<ShapFeatureDto> shapTopFeatures;

    @JsonProperty("model_version")
    private String modelVersion;
}
