package com.finance.organization.dto;

import java.math.BigDecimal;

public record StatementCommitResponse(
        int imported,
        int skippedDuplicates,
        BigDecimal totalImportedAmount,
        int importedStatementLines
) {
}
