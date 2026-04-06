package com.finance.organization.dto;

import java.math.BigDecimal;

public record SettingsResponse(
        BigDecimal monthlyIncome
) {
}
