package com.finance.organization.dto;

import com.finance.organization.model.SpentBy;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExpenseRequest(
        @NotNull Long cardId,
        @NotNull @DecimalMin("0.01") BigDecimal amount,
        @NotBlank String description,
        @NotNull LocalDate expenseDate,
        @NotNull SpentBy spentBy,
        String notes,
        /** Número de parcelas (1 = à vista). Valor em {@code amount} é o total da compra quando &gt; 1. */
        Integer installmentCount
) {
}
