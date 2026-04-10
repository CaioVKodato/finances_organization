package com.finance.organization.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StatementPreviewLine(
        String lineHash,
        LocalDate expenseDate,
        BigDecimal amount,
        String description
) {
}
