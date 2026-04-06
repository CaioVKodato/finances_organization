package com.finance.organization.service;

import com.finance.organization.model.Card;

import java.time.LocalDate;

public final class InvoicePeriodCalculator {

    private InvoicePeriodCalculator() {
    }

    public record InvoicePeriod(LocalDate startInclusive, LocalDate endInclusive) {
    }

    /**
     * Ciclo de fatura aberto: se houver dia de fechamento (1–28), o período vai do dia seguinte
     * ao fechamento anterior até o próximo fechamento. Sem dia de fechamento, usa o mês civil.
     */
    public static InvoicePeriod currentOpenCycle(Card card, LocalDate today) {
        Integer closing = card.getInvoiceClosingDay();
        if (closing == null) {
            LocalDate start = today.withDayOfMonth(1);
            LocalDate end = today.withDayOfMonth(today.lengthOfMonth());
            return new InvoicePeriod(start, end);
        }
        int c = Math.min(Math.max(closing, 1), 28);
        int day = today.getDayOfMonth();
        if (day <= c) {
            LocalDate periodEnd = today.withDayOfMonth(c);
            LocalDate periodStart = periodEnd.minusMonths(1).plusDays(1);
            return new InvoicePeriod(periodStart, periodEnd);
        }
        LocalDate periodStart = today.withDayOfMonth(c).plusDays(1);
        LocalDate periodEnd = today.plusMonths(1).withDayOfMonth(
                Math.min(c, today.plusMonths(1).lengthOfMonth())
        );
        return new InvoicePeriod(periodStart, periodEnd);
    }
}
