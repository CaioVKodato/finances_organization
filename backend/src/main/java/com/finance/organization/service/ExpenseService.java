package com.finance.organization.service;

import com.finance.organization.dto.ExpenseRequest;
import com.finance.organization.dto.ExpenseResponse;
import com.finance.organization.model.Card;
import com.finance.organization.model.CardDependent;
import com.finance.organization.model.Expense;
import com.finance.organization.repository.CardDependentRepository;
import com.finance.organization.repository.ExpenseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final CardService cardService;
    private final CardDependentRepository cardDependentRepository;

    public ExpenseService(
            ExpenseRepository expenseRepository,
            CardService cardService,
            CardDependentRepository cardDependentRepository
    ) {
        this.expenseRepository = expenseRepository;
        this.cardService = cardService;
        this.cardDependentRepository = cardDependentRepository;
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> findAll(long userId, Long cardId) {
        List<Expense> list = cardId == null
                ? expenseRepository.findAllWithCardForUser(userId)
                : expenseRepository.findByCardIdWithCardForUser(cardId, userId);
        return list.stream().map(this::toResponse).toList();
    }

    @Transactional
    public List<ExpenseResponse> create(long userId, ExpenseRequest request) {
        int n = request.installmentCount() == null ? 1 : request.installmentCount();
        if (n < 1 || n > 120) {
            throw new BadRequestException("Número de parcelas deve ser entre 1 e 120");
        }
        Card card = cardService.getEntityForUser(request.cardId(), userId);
        BigDecimal total = request.amount();
        String desc = request.description().trim();
        String baseNotes = request.notes() == null || request.notes().isBlank() ? null : request.notes().trim();

        if (n == 1) {
            Expense e = new Expense();
            e.setCard(card);
            e.setAmount(total);
            e.setDescription(desc);
            e.setExpenseDate(request.expenseDate());
            applySpender(e, card, request);
            e.setNotes(baseNotes);
            e.setInstallmentCount(1);
            e.setInstallmentIndex(1);
            e.setTotalPurchaseAmount(total);
            return List.of(toResponse(expenseRepository.save(e)));
        }

        String groupId = UUID.randomUUID().toString();
        BigDecimal[] parts = splitInstallments(total, n);
        LocalDate first = request.expenseDate();
        List<ExpenseResponse> out = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            Expense e = new Expense();
            e.setCard(card);
            e.setAmount(parts[i]);
            e.setDescription(desc);
            e.setExpenseDate(first.plusMonths(i));
            applySpender(e, card, request);
            String note = baseNotes == null
                    ? ("Parcela " + (i + 1) + "/" + n)
                    : (baseNotes + " — Parcela " + (i + 1) + "/" + n);
            e.setNotes(note);
            e.setInstallmentGroupId(groupId);
            e.setInstallmentIndex(i + 1);
            e.setInstallmentCount(n);
            e.setTotalPurchaseAmount(total);
            out.add(toResponse(expenseRepository.save(e)));
        }
        return out;
    }

    private void applySpender(Expense e, Card card, ExpenseRequest request) {
        boolean self = Boolean.TRUE.equals(request.spentBySelf());
        e.setSpentBySelf(self);
        if (self) {
            e.setDependentPerson(null);
            return;
        }
        if (request.dependentPersonId() == null) {
            throw new BadRequestException("Selecione quem gastou ou marque como Eu");
        }
        CardDependent dep = cardDependentRepository
                .findByIdAndCard_Id(request.dependentPersonId(), card.getId())
                .orElseThrow(() -> new BadRequestException("Pessoa não pertence a este cartão"));
        e.setDependentPerson(dep);
    }

    private static BigDecimal[] splitInstallments(BigDecimal total, int n) {
        BigDecimal[] parts = new BigDecimal[n];
        BigDecimal per = total.divide(BigDecimal.valueOf(n), 2, RoundingMode.DOWN);
        BigDecimal sumExceptLast = per.multiply(BigDecimal.valueOf(n - 1));
        BigDecimal last = total.subtract(sumExceptLast);
        for (int i = 0; i < n - 1; i++) {
            parts[i] = per;
        }
        parts[n - 1] = last;
        return parts;
    }

    @Transactional
    public ExpenseResponse update(long userId, Long id, ExpenseRequest request) {
        Expense e = expenseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Gasto não encontrado"));
        if (e.getCard().getUser().getId() != userId) {
            throw new NotFoundException("Gasto não encontrado");
        }
        Card card = cardService.getEntityForUser(request.cardId(), userId);
        e.setCard(card);
        e.setAmount(request.amount());
        e.setDescription(request.description().trim());
        e.setExpenseDate(request.expenseDate());
        applySpender(e, card, request);
        e.setNotes(request.notes() == null || request.notes().isBlank() ? null : request.notes().trim());
        return toResponse(e);
    }

    @Transactional
    public void delete(long userId, Long id, boolean deleteGroup) {
        Expense e = expenseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Gasto não encontrado"));
        if (e.getCard().getUser().getId() != userId) {
            throw new NotFoundException("Gasto não encontrado");
        }
        if (deleteGroup && e.getInstallmentGroupId() != null) {
            expenseRepository.deleteByInstallmentGroupId(e.getInstallmentGroupId());
            return;
        }
        expenseRepository.deleteById(id);
    }

    private ExpenseResponse toResponse(Expense e) {
        Card c = e.getCard();
        CardDependent dep = e.getDependentPerson();
        return new ExpenseResponse(
                e.getId(),
                c.getId(),
                c.getName(),
                c.getColorHex(),
                e.getAmount(),
                e.getDescription(),
                e.getExpenseDate(),
                e.isSpentBySelf(),
                dep != null ? dep.getId() : null,
                dep != null ? dep.getName() : null,
                e.getNotes(),
                e.getInstallmentGroupId(),
                e.getInstallmentIndex(),
                e.getInstallmentCount(),
                e.getTotalPurchaseAmount()
        );
    }
}
