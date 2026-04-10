package com.finance.organization.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExpenseResponse(
        Long id,
        Long cardId,
        String cardName,
        String cardColorHex,
        BigDecimal amount,
        String description,
        LocalDate expenseDate,
        boolean spentBySelf,
        Long dependentPersonId,
        String dependentPersonName,
        String notes,
        String installmentGroupId,
        Integer installmentIndex,
        Integer installmentCount,
        BigDecimal totalPurchaseAmount
) {
}
