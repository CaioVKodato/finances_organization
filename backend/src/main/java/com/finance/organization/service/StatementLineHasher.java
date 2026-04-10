package com.finance.organization.service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.Locale;

final class StatementLineHasher {

    private StatementLineHasher() {
    }

    static String hash(long cardId, LocalDate date, BigDecimal amount, String description) {
        String normalized = description == null ? "" : description.trim().replaceAll("\\s+", " ");
        String amt = amount == null ? "" : amount.stripTrailingZeros().abs().toPlainString();
        String payload = cardId + "|" + date + "|" + amt + "|" + normalized.toLowerCase(Locale.ROOT);
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
