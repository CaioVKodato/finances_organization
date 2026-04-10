package com.finance.organization.dto;

import java.time.Instant;
import java.util.List;

public record CardResponse(
        Long id,
        String name,
        String lastFourDigits,
        String colorHex,
        Integer invoiceClosingDay,
        List<CardDependentResponse> dependents,
        Instant lastStatementImportAt
) {
}
