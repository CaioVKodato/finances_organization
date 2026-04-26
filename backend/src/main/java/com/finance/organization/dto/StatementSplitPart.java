package com.finance.organization.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record StatementSplitPart(
        @NotNull Boolean spentBySelf,
        Long dependentPersonId,
        @NotNull @DecimalMin("0.01") BigDecimal amount
) {
}
