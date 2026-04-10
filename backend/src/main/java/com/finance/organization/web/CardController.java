package com.finance.organization.web;

import com.finance.organization.dto.CardRequest;
import com.finance.organization.dto.CardResponse;
import com.finance.organization.service.CardService;
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
@RequestMapping("/api/cards")
public class CardController {

    private final CardService cardService;
    private final CurrentUserService currentUserService;

    public CardController(CardService cardService, CurrentUserService currentUserService) {
        this.cardService = cardService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<CardResponse> list() {
        long uid = currentUserService.requireUserId();
        return cardService.findAllForUser(uid);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CardResponse create(@Valid @RequestBody CardRequest request) {
        long uid = currentUserService.requireUserId();
        return cardService.create(uid, request);
    }

    @PutMapping("/{id}")
    public CardResponse update(@PathVariable Long id, @Valid @RequestBody CardRequest request) {
        long uid = currentUserService.requireUserId();
        return cardService.update(uid, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        long uid = currentUserService.requireUserId();
        cardService.delete(uid, id);
    }
}
