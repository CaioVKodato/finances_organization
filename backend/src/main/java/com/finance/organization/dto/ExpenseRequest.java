package com.finance.organization.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ExpenseRequest(
        @NotNull Long cardId,
        @NotNull @DecimalMin("0.01") BigDecimal amount,
        @NotBlank String description,
        @NotNull LocalDate expenseDate,
        /** {@code true} = titular (Eu). Usado quando {@code splits} é nulo ou tem menos de 2 itens. */
        @NotNull Boolean spentBySelf,
        /** Obrigatório quando {@code spentBySelf} é {@code false} e não há divisão. */
        Long dependentPersonId,
        String notes,
        /** Número de parcelas (1 = à vista). Valor em {@code amount} é o total da compra quando &gt; 1. */
        Integer installmentCount,
        /** Se tiver 2+ itens, divide {@code amount} entre as partes (sem parcelamento). */
        @Valid List<ExpenseSplitPart> splits
) {
}
