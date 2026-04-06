package com.finance.organization.service;

import com.finance.organization.dto.CardRequest;
import com.finance.organization.dto.CardResponse;
import com.finance.organization.model.Card;
import com.finance.organization.repository.CardRepository;
import com.finance.organization.repository.ExpenseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CardService {

    private final CardRepository cardRepository;
    private final ExpenseRepository expenseRepository;

    public CardService(CardRepository cardRepository, ExpenseRepository expenseRepository) {
        this.cardRepository = cardRepository;
        this.expenseRepository = expenseRepository;
    }

    public List<CardResponse> findAll() {
        return cardRepository.findAll().stream().map(this::toResponse).toList();
    }

    public CardResponse create(CardRequest request) {
        Card card = new Card();
        apply(card, request);
        return toResponse(cardRepository.save(card));
    }

    @Transactional
    public CardResponse update(Long id, CardRequest request) {
        Card card = cardRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Cartão não encontrado"));
        apply(card, request);
        return toResponse(card);
    }

    @Transactional
    public void delete(Long id) {
        if (!cardRepository.existsById(id)) {
            throw new NotFoundException("Cartão não encontrado");
        }
        expenseRepository.deleteByCard_Id(id);
        cardRepository.deleteById(id);
    }

    public Card getEntity(Long id) {
        return cardRepository.findById(id)
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
        return new CardResponse(
                card.getId(),
                card.getName(),
                card.getLastFourDigits(),
                card.getColorHex(),
                card.getInvoiceClosingDay()
        );
    }
}
