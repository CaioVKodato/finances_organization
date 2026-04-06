package com.finance.organization.dto;

public record CardResponse(
        Long id,
        String name,
        String lastFourDigits,
        String colorHex,
        Integer invoiceClosingDay
) {
}
