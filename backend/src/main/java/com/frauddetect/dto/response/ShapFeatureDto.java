package com.frauddetect.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShapFeatureDto {
    private String feature;
    private BigDecimal value;
    private BigDecimal contribution;
}
