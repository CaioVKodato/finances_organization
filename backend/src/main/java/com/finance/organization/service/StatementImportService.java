package com.finance.organization.service;

import com.finance.organization.dto.StatementCommitRequest;
import com.finance.organization.dto.StatementCommitResponse;
import com.finance.organization.dto.StatementCommitRow;
import com.finance.organization.dto.StatementPreviewLine;
import com.finance.organization.dto.StatementPreviewResponse;
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

            Expense e = new Expense();
            e.setCard(card);
            BigDecimal amt = row.amount() == null ? BigDecimal.ZERO : row.amount().abs();
            e.setAmount(amt);
            e.setDescription(row.description().trim());
            e.setExpenseDate(row.expenseDate());
            e.setStatementLineHash(row.lineHash());
            applySpender(e, card, row.spentBySelf(), row.dependentPersonId());
            e.setNotes(null);
            e.setInstallmentCount(1);
            e.setInstallmentIndex(1);
            e.setTotalPurchaseAmount(amt);
            expenseRepository.save(e);
            imported++;
        }

        card.setLastStatementImportAt(Instant.now());
        cardRepository.save(card);
        return new StatementCommitResponse(imported, skippedDuplicates);
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
