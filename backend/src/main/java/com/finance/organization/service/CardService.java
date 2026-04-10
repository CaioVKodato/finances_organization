package com.finance.organization.service;

import com.finance.organization.dto.CardDependentResponse;
import com.finance.organization.dto.CardRequest;
import com.finance.organization.dto.CardResponse;
import com.finance.organization.model.Card;
import com.finance.organization.model.CardDependent;
import com.finance.organization.model.User;
import com.finance.organization.repository.CardRepository;
import com.finance.organization.repository.ExpenseRepository;
import com.finance.organization.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class CardService {

    private final CardRepository cardRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;

    public CardService(
            CardRepository cardRepository,
            ExpenseRepository expenseRepository,
            UserRepository userRepository
    ) {
        this.cardRepository = cardRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<CardResponse> findAllForUser(long userId) {
        return cardRepository.findByUser_IdOrderByIdAsc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CardResponse create(long userId, CardRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        Card card = new Card();
        card.setUser(user);
        apply(card, request);
        return toResponse(cardRepository.save(card));
    }

    @Transactional
    public CardResponse update(long userId, Long id, CardRequest request) {
        Card card = getEntityForUser(id, userId);
        apply(card, request);
        return toResponse(card);
    }

    @Transactional
    public void delete(long userId, Long id) {
        Card card = getEntityForUser(id, userId);
        expenseRepository.deleteByCard_Id(card.getId());
        cardRepository.delete(card);
    }

    public Card getEntityForUser(Long id, long userId) {
        return cardRepository.findByIdAndUser_Id(id, userId)
                .orElseThrow(() -> new NotFoundException("Cartão não encontrado"));
    }

    private void apply(Card card, CardRequest request) {
        card.setName(request.name().trim());
        card.setLastFourDigits(request.lastFourDigits() == null || request.lastFourDigits().isBlank()
                ? null
                : request.lastFourDigits());
        card.setColorHex(request.colorHex());
        card.setInvoiceClosingDay(request.invoiceClosingDay());
    }

    private CardResponse toResponse(Card card) {
        List<CardDependentResponse> dependentResponses = new ArrayList<>();
        for (CardDependent d : card.getDependents()) {
            dependentResponses.add(
                    new CardDependentResponse(
                            d.getId(),
                            card.getId(),
                            d.getName(),
                            d.getSortOrder()));
        }
        return new CardResponse(
                card.getId(),
                card.getName(),
                card.getLastFourDigits(),
                card.getColorHex(),
                card.getInvoiceClosingDay(),
                dependentResponses,
                card.getLastStatementImportAt()
        );
    }
}
