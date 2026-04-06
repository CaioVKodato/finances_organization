package com.finance.organization.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CardRequest(
        @NotBlank String name,
        @Pattern(regexp = "\\d{0,4}") String lastFourDigits,
        @NotBlank @Pattern(regexp = "#[0-9A-Fa-f]{6}") String colorHex,
        @Min(1) @Max(28) Integer invoiceClosingDay
) {
}
