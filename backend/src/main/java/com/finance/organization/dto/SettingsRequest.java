package com.finance.organization.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SettingsRequest(
        @NotNull @DecimalMin("0.00") BigDecimal monthlyIncome
) {
}
