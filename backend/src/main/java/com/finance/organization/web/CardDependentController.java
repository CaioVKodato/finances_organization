package com.finance.organization.web;

import com.finance.organization.dto.CardDependentRequest;
import com.finance.organization.dto.CardDependentResponse;
import com.finance.organization.service.CardDependentService;
import com.finance.organization.service.CurrentUserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/cards/{cardId}/dependents")
public class CardDependentController {

    private final CardDependentService cardDependentService;
    private final CurrentUserService currentUserService;

    public CardDependentController(CardDependentService cardDependentService, CurrentUserService currentUserService) {
        this.cardDependentService = cardDependentService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<CardDependentResponse> list(@PathVariable Long cardId) {
        long uid = currentUserService.requireUserId();
        return cardDependentService.list(uid, cardId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CardDependentResponse create(
            @PathVariable Long cardId,
            @Valid @RequestBody CardDependentRequest request
    ) {
        long uid = currentUserService.requireUserId();
        return cardDependentService.create(uid, cardId, request);
    }

    @PutMapping("/{dependentId}")
    public CardDependentResponse update(
            @PathVariable Long cardId,
            @PathVariable Long dependentId,
            @Valid @RequestBody CardDependentRequest request
    ) {
        long uid = currentUserService.requireUserId();
        return cardDependentService.update(uid, cardId, dependentId, request);
    }

    @DeleteMapping("/{dependentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long cardId, @PathVariable Long dependentId) {
        long uid = currentUserService.requireUserId();
        cardDependentService.delete(uid, cardId, dependentId);
    }
}
