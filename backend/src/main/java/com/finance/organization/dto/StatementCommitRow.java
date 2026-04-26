package com.finance.organization.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record StatementCommitRow(
        @NotBlank String lineHash,
        @NotNull LocalDate expenseDate,
        @NotNull BigDecimal amount,
        @NotBlank String description,
        Boolean spentBySelf,
        Long dependentPersonId,
        /** Se tiver 2+ itens, divide o valor da linha entre as partes. */
        @Valid List<StatementSplitPart> splits
) {
}
