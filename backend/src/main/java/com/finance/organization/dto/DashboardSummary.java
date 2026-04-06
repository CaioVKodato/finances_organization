package com.finance.organization.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record DashboardSummary(
        BigDecimal totalAll,
        List<CardTotal> byCard,
        Map<String, BigDecimal> bySpentBy,
        BigDecimal monthlyIncome,
        /** Gastos no mês civil marcados como Eu (entram no orçamento). */
        BigDecimal spentSelfInCurrentCalendarMonth,
        /** Todos os gastos no mês civil (inclui outras pessoas). */
        BigDecimal spentAllInCurrentCalendarMonth,
        BigDecimal remainingBudget,
        List<CardInvoice> cardInvoices
) {
    public record CardTotal(Long cardId, String cardName, String colorHex, BigDecimal total) {
    }

    public record CardInvoice(
            Long cardId,
            String cardName,
            String colorHex,
            LocalDate invoicePeriodStart,
            LocalDate invoicePeriodEnd,
            BigDecimal invoiceTotal
    ) {
    }
}
