package com.finance.organization.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank
        @Size(min = 8, max = 100)
        @Pattern(
                regexp = "^(?=.*[A-Za-zÀ-ÿ])(?=.*\\d)(?=.*[^A-Za-zÀ-ÿ0-9]).{8,100}$",
                message = "Senha deve ter letras, números e um símbolo (8 a 100 caracteres)"
        )
        String password
) {
}
