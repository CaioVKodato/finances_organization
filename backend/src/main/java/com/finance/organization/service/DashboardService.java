package com.finance.organization.service;

import com.finance.organization.dto.DashboardSummary;
import com.finance.organization.model.Card;
import com.finance.organization.repository.CardRepository;
import com.finance.organization.repository.ExpenseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private final CardRepository cardRepository;
    private final ExpenseRepository expenseRepository;
    private final SettingsService settingsService;

    public DashboardService(
            CardRepository cardRepository,
            ExpenseRepository expenseRepository,
            SettingsService settingsService
    ) {
        this.cardRepository = cardRepository;
        this.expenseRepository = expenseRepository;
        this.settingsService = settingsService;
    }

    @Transactional(readOnly = true)
    public DashboardSummary summary(long userId) {
        List<Card> cards = cardRepository.findByUser_IdOrderByIdAsc(userId);
        BigDecimal totalAll = BigDecimal.ZERO;
        List<DashboardSummary.CardTotal> byCard = new ArrayList<>();

        for (Card card : cards) {
            BigDecimal t = expenseRepository.sumAmountByCardId(card.getId());
            totalAll = totalAll.add(t);
            byCard.add(new DashboardSummary.CardTotal(
                    card.getId(),
                    card.getName(),
                    card.getColorHex(),
                    t
            ));
        }

        Map<String, BigDecimal> bySpentBy = new LinkedHashMap<>();
        bySpentBy.put("SELF", expenseRepository.sumAmountSelfAllTimeForUser(userId));
        for (Object[] row : expenseRepository.sumGroupedByDependentForUser(userId)) {
            Long depId = (Long) row[0];
            BigDecimal sum = (BigDecimal) row[1];
            bySpentBy.put("dep:" + depId, sum);
        }

        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());
        BigDecimal spentAllMonth = expenseRepository.sumAmountBetweenForUser(monthStart, monthEnd, userId);
        BigDecimal spentSelfMonth = expenseRepository.sumAmountBetweenAndSelfForUser(
                monthStart, monthEnd, userId
        );
        BigDecimal income = settingsService.getMonthlyIncomeOrZero(userId);
        BigDecimal remaining = income.subtract(spentSelfMonth);

        List<DashboardSummary.CardInvoice> cardInvoices = new ArrayList<>();
        for (Card card : cards) {
            InvoicePeriodCalculator.InvoicePeriod period = InvoicePeriodCalculator.currentOpenCycle(card, today);
            BigDecimal inv = expenseRepository.sumByCardAndDateBetween(
                    card.getId(),
                    period.startInclusive(),
                    period.endInclusive()
            );
            cardInvoices.add(new DashboardSummary.CardInvoice(
                    card.getId(),
                    card.getName(),
                    card.getColorHex(),
                    period.startInclusive(),
                    period.endInclusive(),
                    inv
            ));
        }

        return new DashboardSummary(
                totalAll,
                byCard,
                bySpentBy,
                income,
                spentSelfMonth,
                spentAllMonth,
                remaining,
                cardInvoices
        );
    }
}
