package com.finance.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CardDependentRequest(
        @NotBlank @Size(max = 120) String name
) {
}
