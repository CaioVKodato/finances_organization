package com.finance.organization.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record StatementCommitRequest(
        @NotEmpty @Valid List<StatementCommitRow> lines
) {
}
