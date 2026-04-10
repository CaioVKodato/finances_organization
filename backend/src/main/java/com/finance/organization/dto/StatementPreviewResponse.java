package com.finance.organization.dto;

import java.time.Instant;
import java.util.List;

public record StatementPreviewResponse(
        Instant lastStatementImportAt,
        int skippedAlreadyImported,
        List<StatementPreviewLine> lines
) {
}
