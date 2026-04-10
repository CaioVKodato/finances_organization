package com.finance.organization.web;

import com.finance.organization.dto.ExpenseRequest;
import com.finance.organization.dto.ExpenseResponse;
import com.finance.organization.service.CurrentUserService;
import com.finance.organization.service.ExpenseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;
    private final CurrentUserService currentUserService;

    public ExpenseController(ExpenseService expenseService, CurrentUserService currentUserService) {
        this.expenseService = expenseService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<ExpenseResponse> list(@RequestParam(required = false) Long cardId) {
        long uid = currentUserService.requireUserId();
        return expenseService.findAll(uid, cardId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public List<ExpenseResponse> create(@Valid @RequestBody ExpenseRequest request) {
        long uid = currentUserService.requireUserId();
        return expenseService.create(uid, request);
    }

    @PutMapping("/{id}")
    public ExpenseResponse update(@PathVariable Long id, @Valid @RequestBody ExpenseRequest request) {
        long uid = currentUserService.requireUserId();
        return expenseService.update(uid, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean deleteGroup
    ) {
        long uid = currentUserService.requireUserId();
        expenseService.delete(uid, id, deleteGroup);
    }
}
