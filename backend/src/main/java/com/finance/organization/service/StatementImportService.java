package com.finance.organization.service;

import com.finance.organization.dto.StatementCommitRequest;
import com.finance.organization.dto.StatementCommitResponse;
import com.finance.organization.dto.StatementCommitRow;
import com.finance.organization.dto.StatementPreviewLine;
import com.finance.organization.dto.StatementPreviewResponse;
import com.finance.organization.dto.StatementSplitPart;
import com.finance.organization.model.Card;
import com.finance.organization.model.CardDependent;
import com.finance.organization.model.Expense;
import com.finance.organization.repository.CardRepository;
import com.finance.organization.repository.CardDependentRepository;
import com.finance.organization.repository.ExpenseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class StatementImportService {

    private final CardService cardService;
    private final CardRepository cardRepository;
    private final ExpenseRepository expenseRepository;
    private final CardDependentRepository cardDependentRepository;

    public StatementImportService(
            CardService cardService,
            CardRepository cardRepository,
            ExpenseRepository expenseRepository,
            CardDependentRepository cardDependentRepository
    ) {
        this.cardService = cardService;
        this.cardRepository = cardRepository;
        this.expenseRepository = expenseRepository;
        this.cardDependentRepository = cardDependentRepository;
    }

    @Transactional(readOnly = true)
    public StatementPreviewResponse preview(long userId, long cardId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Envie um arquivo CSV (campo file)");
        }
        Card card = cardService.getEntityForUser(cardId, userId);
        List<StatementCsvParser.ParsedRow> parsed;
        try {
            parsed = StatementCsvParser.parse(file.getInputStream());
        } catch (IOException e) {
            throw new BadRequestException("Não foi possível ler o arquivo: " + e.getMessage());
        }

        int skipped = 0;
        List<StatementPreviewLine> lines = new ArrayList<>();
        for (StatementCsvParser.ParsedRow row : parsed) {
            String hash = StatementLineHasher.hash(cardId, row.date(), row.amount(), row.description());
            if (expenseRepository.existsByCard_IdAndStatementLineHash(cardId, hash)) {
                skipped++;
                continue;
            }
            lines.add(new StatementPreviewLine(hash, row.date(), row.amount(), row.description()));
        }
        return new StatementPreviewResponse(card.getLastStatementImportAt(), skipped, lines);
    }

    @Transactional
    public StatementCommitResponse commit(long userId, long cardId, StatementCommitRequest request) {
        Card card = cardService.getEntityForUser(cardId, userId);
        if (request.lines().isEmpty()) {
            throw new BadRequestException("Inclua ao menos uma linha para registrar");
        }

        int imported = 0;
        int skippedDuplicates = 0;
        BigDecimal totalImportedAmount = BigDecimal.ZERO;
        int importedStatementLines = 0;
        for (StatementCommitRow row : request.lines()) {
            String expected = StatementLineHasher.hash(
                    cardId,
                    row.expenseDate(),
                    row.amount(),
                    row.description()
            );
            if (!expected.equals(row.lineHash())) {
                throw new BadRequestException("Dados da linha não conferem com o identificador (hash)");
            }
            if (expenseRepository.existsByCard_IdAndStatementLineHash(cardId, row.lineHash())) {
                skippedDuplicates++;
                continue;
            }

            BigDecimal lineAbs = row.amount() == null ? BigDecimal.ZERO : row.amount().abs();
            List<StatementSplitPart> parts = row.splits();
            if (parts != null && parts.size() >= 2) {
                validateSplitPartsTotal(lineAbs, parts);
                String splitGroupId = UUID.randomUUID().toString();
                int m = parts.size();
                for (int i = 0; i < m; i++) {
                    StatementSplitPart p = parts.get(i);
                    Expense e = new Expense();
                    e.setCard(card);
                    e.setAmount(p.amount());
                    e.setDescription(row.description().trim());
                    e.setExpenseDate(row.expenseDate());
                    e.setStatementLineHash(i == 0 ? row.lineHash() : null);
                    applySpender(e, card, p.spentBySelf(), p.dependentPersonId());
                    e.setNotes("Divisão " + (i + 1) + "/" + m);
                    e.setInstallmentCount(1);
                    e.setInstallmentIndex(1);
                    e.setTotalPurchaseAmount(lineAbs);
                    e.setSplitGroupId(splitGroupId);
                    e.setSplitPartIndex(i + 1);
                    e.setSplitPartCount(m);
                    expenseRepository.save(e);
                    imported++;
                }
            } else {
                if (row.spentBySelf() == null) {
                    throw new BadRequestException("Informe quem gastou em cada linha");
                }
                Expense e = new Expense();
                e.setCard(card);
                e.setAmount(lineAbs);
                e.setDescription(row.description().trim());
                e.setExpenseDate(row.expenseDate());
                e.setStatementLineHash(row.lineHash());
                applySpender(e, card, row.spentBySelf(), row.dependentPersonId());
                e.setNotes(null);
                e.setInstallmentCount(1);
                e.setInstallmentIndex(1);
                e.setTotalPurchaseAmount(lineAbs);
                expenseRepository.save(e);
                imported++;
            }
            totalImportedAmount = totalImportedAmount.add(lineAbs);
            importedStatementLines++;
        }

        card.setLastStatementImportAt(Instant.now());
        cardRepository.save(card);
        return new StatementCommitResponse(imported, skippedDuplicates, totalImportedAmount, importedStatementLines);
    }

    private static void validateSplitPartsTotal(BigDecimal lineAbs, List<StatementSplitPart> parts) {
        BigDecimal sum = BigDecimal.ZERO;
        for (StatementSplitPart p : parts) {
            sum = sum.add(p.amount());
        }
        if (sum.subtract(lineAbs).abs().compareTo(new BigDecimal("0.02")) > 0) {
            throw new BadRequestException("Nas linhas divididas, a soma das partes deve igualar o valor da linha");
        }
    }

    private void applySpender(Expense e, Card card, boolean spentBySelf, Long dependentPersonId) {
        e.setSpentBySelf(spentBySelf);
        if (spentBySelf) {
            e.setDependentPerson(null);
            return;
        }
        if (dependentPersonId == null) {
            throw new BadRequestException("Selecione quem gastou em cada linha ou marque como Eu");
        }
        CardDependent dep = cardDependentRepository
                .findByIdAndCard_Id(dependentPersonId, card.getId())
                .orElseThrow(() -> new BadRequestException("Pessoa não pertence a este cartão"));
        e.setDependentPerson(dep);
    }
}
