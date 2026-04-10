package com.finance.organization.dto;

public record StatementCommitResponse(
        int imported,
        int skippedDuplicates
) {
}
