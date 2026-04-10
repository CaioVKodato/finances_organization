package com.finance.organization.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
/**
 * Interpreta CSV de fatura (ponto e vírgula ou vírgula), com ou sem cabeçalho.
 * Formatos comuns: Data;Descrição;Valor ou date,title,amount (ex.: exportações tipo Nubank).
 */
final class StatementCsvParser {

    record ParsedRow(LocalDate date, BigDecimal amount, String description) {
    }

    private StatementCsvParser() {
    }

    static List<ParsedRow> parse(InputStream in) throws IOException {
        String text = readUtf8StripBom(in);
        List<String> rawLines = new ArrayList<>();
        for (String line : text.split("\r\n|\n|\r")) {
            String t = line.trim();
            if (!t.isEmpty()) {
                rawLines.add(t);
            }
        }
        if (rawLines.isEmpty()) {
            throw new BadRequestException("Arquivo vazio ou sem linhas válidas");
        }

        char delim = detectDelimiter(rawLines.get(0));
        String[] firstCells = splitLine(rawLines.get(0), delim);
        boolean header = looksLikeHeader(firstCells);
        int start = header ? 1 : 0;

        int dateCol;
        int amountCol;
        int descCol;
        if (header) {
            int[] map = mapHeaderColumns(firstCells);
            dateCol = map[0];
            amountCol = map[1];
            descCol = map[2];
            if (dateCol < 0 || amountCol < 0) {
                if (firstCells.length >= 3) {
                    dateCol = 0;
                    descCol = 1;
                    amountCol = 2;
                } else if (firstCells.length == 2) {
                    dateCol = 0;
                    descCol = -1;
                    amountCol = 1;
                }
            }
        } else {
            dateCol = 0;
            descCol = firstCells.length >= 3 ? 1 : -1;
            amountCol = firstCells.length >= 3 ? 2 : 1;
        }

        if (dateCol < 0 || amountCol < 0) {
            throw new BadRequestException(
                    "Não foi possível identificar colunas de data e valor. Use um CSV com cabeçalho (data, valor) ou três colunas: data, descrição, valor.");
        }

        List<ParsedRow> out = new ArrayList<>();
        for (int i = start; i < rawLines.size(); i++) {
            String[] cells = splitLine(rawLines.get(i), delim);
            if (cells.length <= Math.max(dateCol, amountCol)) {
                continue;
            }
            LocalDate date = parseDate(cells[dateCol]);
            BigDecimal amount = parseMoney(cells[amountCol]);
            if (date == null || amount == null) {
                continue;
            }
            String desc;
            if (descCol >= 0 && descCol < cells.length) {
                desc = cells[descCol].trim();
            } else {
                desc = "";
            }
            if (desc.isEmpty()) {
                desc = "Importação fatura";
            }
            out.add(new ParsedRow(date, amount, desc));
        }

        if (out.isEmpty()) {
            throw new BadRequestException(
                    "Nenhuma linha válida encontrada. Confira se há colunas de data e valor no formato esperado (ex.: dd/MM/yyyy e 12,34).");
        }
        return out;
    }

    private static String readUtf8StripBom(InputStream in) throws IOException {
        try (BufferedReader br = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            char[] buf = new char[8192];
            int n;
            while ((n = br.read(buf)) >= 0) {
                sb.append(buf, 0, n);
            }
            String s = sb.toString();
            if (s.startsWith("\uFEFF")) {
                return s.substring(1);
            }
            return s;
        }
    }

    private static char detectDelimiter(String line) {
        int semi = countChar(line, ';');
        int comma = countChar(line, ',');
        return semi >= comma ? ';' : ',';
    }

    private static int countChar(String s, char c) {
        int n = 0;
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) == c) {
                n++;
            }
        }
        return n;
    }

    private static String[] splitLine(String line, char delim) {
        List<String> parts = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
                continue;
            }
            if (!inQuotes && c == delim) {
                parts.add(cur.toString().trim());
                cur.setLength(0);
                continue;
            }
            cur.append(c);
        }
        parts.add(cur.toString().trim());
        return parts.toArray(String[]::new);
    }

    private static boolean looksLikeHeader(String[] cells) {
        if (cells.length < 2) {
            return false;
        }
        int hits = 0;
        for (String cell : cells) {
            String h = normalizeHeader(cell);
            if (matchesDateHeader(h) || matchesAmountHeader(h) || matchesDescHeader(h)) {
                hits++;
            }
        }
        return hits >= 2;
    }

    private static String normalizeHeader(String cell) {
        return cell.toLowerCase(Locale.ROOT).replace('á', 'a').replace('ç', 'c').trim();
    }

    private static boolean matchesDateHeader(String h) {
        return h.contains("data") || h.contains("date") || h.equals("dt") || h.contains("vencimento");
    }

    private static boolean matchesAmountHeader(String h) {
        return h.contains("valor") || h.contains("amount") || h.contains("value") || h.contains("total");
    }

    private static boolean matchesDescHeader(String h) {
        return h.contains("descri") || h.contains("description") || h.contains("title")
                || h.contains("estabelecimento") || h.contains("lancamento") || h.contains("memo")
                || h.contains("historico");
    }

    /** @return [dateCol, amountCol, descCol] descCol pode ser -1 */
    private static int[] mapHeaderColumns(String[] headers) {
        int dateCol = -1;
        int amountCol = -1;
        int descCol = -1;
        for (int i = 0; i < headers.length; i++) {
            String h = normalizeHeader(headers[i]);
            if (matchesDateHeader(h)) {
                dateCol = i;
            } else if (matchesAmountHeader(h)) {
                amountCol = i;
            } else if (matchesDescHeader(h)) {
                descCol = i;
            }
        }
        return new int[] { dateCol, amountCol, descCol };
    }

    private static LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String s = raw.trim();
        List<DateTimeFormatter> formatters = List.of(
                DateTimeFormatter.ISO_LOCAL_DATE,
                DateTimeFormatter.ofPattern("d/M/yyyy"),
                DateTimeFormatter.ofPattern("dd/MM/yyyy"),
                DateTimeFormatter.ofPattern("d/M/yy"),
                DateTimeFormatter.ofPattern("dd/MM/yy")
        );
        for (DateTimeFormatter f : formatters) {
            try {
                return LocalDate.parse(s, f);
            } catch (DateTimeParseException ignored) {
                // next
            }
        }
        return null;
    }

    private static BigDecimal parseMoney(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String t = raw.replace("R$", "").replace("\u00A0", " ").trim();
        boolean neg = t.startsWith("-") || (t.contains("(") && t.contains(")"));
        t = t.replace("(", "").replace(")", "").trim();
        if (t.startsWith("-")) {
            neg = true;
            t = t.substring(1).trim();
        }
        t = t.replaceAll("[^0-9,.]", "");
        if (t.isEmpty()) {
            return null;
        }
        if (t.contains(",") && t.contains(".")) {
            t = t.replace(".", "").replace(",", ".");
        } else if (t.contains(",")) {
            t = t.replace(",", ".");
        }
        try {
            BigDecimal v = new BigDecimal(t);
            if (neg) {
                v = v.negate();
            }
            return v.abs();
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
