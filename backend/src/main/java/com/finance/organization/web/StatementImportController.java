package com.finance.organization.web;

import com.finance.organization.dto.StatementCommitRequest;
import com.finance.organization.dto.StatementCommitResponse;
import com.finance.organization.dto.StatementPreviewResponse;
import com.finance.organization.service.CurrentUserService;
import com.finance.organization.service.StatementImportService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/cards")
public class StatementImportController {

    private final StatementImportService statementImportService;
    private final CurrentUserService currentUserService;

    public StatementImportController(
            StatementImportService statementImportService,
            CurrentUserService currentUserService
    ) {
        this.statementImportService = statementImportService;
        this.currentUserService = currentUserService;
    }

    @PostMapping(value = "/{cardId}/statement/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public StatementPreviewResponse preview(
            @PathVariable Long cardId,
            @RequestPart("file") MultipartFile file
    ) {
        long uid = currentUserService.requireUserId();
        return statementImportService.preview(uid, cardId, file);
    }

    @PostMapping("/{cardId}/statement/commit")
    public StatementCommitResponse commit(
            @PathVariable Long cardId,
            @Valid @RequestBody StatementCommitRequest request
    ) {
        long uid = currentUserService.requireUserId();
        return statementImportService.commit(uid, cardId, request);
    }
}
