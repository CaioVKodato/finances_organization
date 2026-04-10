package com.finance.organization.service;

import com.finance.organization.dto.CardDependentRequest;
import com.finance.organization.dto.CardDependentResponse;
import com.finance.organization.model.Card;
import com.finance.organization.model.CardDependent;
import com.finance.organization.repository.CardDependentRepository;
import com.finance.organization.repository.ExpenseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CardDependentService {

    private final CardDependentRepository cardDependentRepository;
    private final ExpenseRepository expenseRepository;
    private final CardService cardService;

    public CardDependentService(
            CardDependentRepository cardDependentRepository,
            ExpenseRepository expenseRepository,
            CardService cardService
    ) {
        this.cardDependentRepository = cardDependentRepository;
        this.expenseRepository = expenseRepository;
        this.cardService = cardService;
    }

    @Transactional(readOnly = true)
    public List<CardDependentResponse> list(long userId, long cardId) {
        Card card = cardService.getEntityForUser(cardId, userId);
        return cardDependentRepository.findByCard_IdOrderBySortOrderAscIdAsc(card.getId()).stream()
                .map(d -> toResponse(card.getId(), d))
                .toList();
    }

    @Transactional
    public CardDependentResponse create(long userId, long cardId, CardDependentRequest request) {
        Card card = cardService.getEntityForUser(cardId, userId);
        CardDependent d = new CardDependent();
        d.setCard(card);
        d.setName(request.name().trim());
        int next = (int) cardDependentRepository.countByCard_Id(card.getId());
        d.setSortOrder(next);
        return toResponse(card.getId(), cardDependentRepository.save(d));
    }

    @Transactional
    public CardDependentResponse update(long userId, long cardId, long dependentId, CardDependentRequest request) {
        cardService.getEntityForUser(cardId, userId);
        CardDependent d = cardDependentRepository.findByIdAndCard_Id(dependentId, cardId)
                .orElseThrow(() -> new NotFoundException("Pessoa não encontrada"));
        d.setName(request.name().trim());
        return toResponse(cardId, d);
    }

    @Transactional
    public void delete(long userId, long cardId, long dependentId) {
        cardService.getEntityForUser(cardId, userId);
        CardDependent d = cardDependentRepository.findByIdAndCard_Id(dependentId, cardId)
                .orElseThrow(() -> new NotFoundException("Pessoa não encontrada"));
        if (expenseRepository.countByDependentPerson_Id(dependentId) > 0) {
            throw new BadRequestException("Existem gastos vinculados a esta pessoa. Edite ou exclua os gastos antes.");
        }
        cardDependentRepository.delete(d);
    }

    private static CardDependentResponse toResponse(long cardId, CardDependent d) {
        return new CardDependentResponse(d.getId(), cardId, d.getName(), d.getSortOrder());
    }
}
