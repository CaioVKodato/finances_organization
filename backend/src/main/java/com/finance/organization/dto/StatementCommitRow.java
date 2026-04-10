package com.finance.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StatementCommitRow(
        @NotBlank String lineHash,
        @NotNull LocalDate expenseDate,
        @NotNull BigDecimal amount,
        @NotBlank String description,
        @NotNull Boolean spentBySelf,
        Long dependentPersonId
) {
}
