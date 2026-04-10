package com.finance.organization.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "expenses")
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "card_id")
    private Card card;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private LocalDate expenseDate;

    /** {@code true} = titular (Eu); {@code false} = dependente cadastrado no cartão. */
    @Column(name = "spent_by_self", nullable = false)
    private boolean spentBySelf = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dependent_person_id")
    private CardDependent dependentPerson;

    private String notes;

    @Column(length = 36)
    private String installmentGroupId;

    private Integer installmentIndex;

    private Integer installmentCount;

    @Column(precision = 14, scale = 2)
    private BigDecimal totalPurchaseAmount;

    /** Hash estável da linha da fatura (deduplicação entre importações). */
    @Column(length = 64)
    private String statementLineHash;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Card getCard() {
        return card;
    }

    public void setCard(Card card) {
        this.card = card;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getExpenseDate() {
        return expenseDate;
    }

    public void setExpenseDate(LocalDate expenseDate) {
        this.expenseDate = expenseDate;
    }

    public boolean isSpentBySelf() {
        return spentBySelf;
    }

    public void setSpentBySelf(boolean spentBySelf) {
        this.spentBySelf = spentBySelf;
    }

    public CardDependent getDependentPerson() {
        return dependentPerson;
    }

    public void setDependentPerson(CardDependent dependentPerson) {
        this.dependentPerson = dependentPerson;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getInstallmentGroupId() {
        return installmentGroupId;
    }

    public void setInstallmentGroupId(String installmentGroupId) {
        this.installmentGroupId = installmentGroupId;
    }

    public Integer getInstallmentIndex() {
        return installmentIndex;
    }

    public void setInstallmentIndex(Integer installmentIndex) {
        this.installmentIndex = installmentIndex;
    }

    public Integer getInstallmentCount() {
        return installmentCount;
    }

    public void setInstallmentCount(Integer installmentCount) {
        this.installmentCount = installmentCount;
    }

    public BigDecimal getTotalPurchaseAmount() {
        return totalPurchaseAmount;
    }

    public void setTotalPurchaseAmount(BigDecimal totalPurchaseAmount) {
        this.totalPurchaseAmount = totalPurchaseAmount;
    }

    public String getStatementLineHash() {
        return statementLineHash;
    }

    public void setStatementLineHash(String statementLineHash) {
        this.statementLineHash = statementLineHash;
    }
}
