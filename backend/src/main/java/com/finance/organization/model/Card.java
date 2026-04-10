package com.finance.organization.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cards")
public class Card {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private String name;

    private String lastFourDigits;

    @Column(nullable = false)
    private String colorHex;

    /** Dia do fechamento da fatura (1–28). Opcional: sem valor, usa o mês civil. */
    private Integer invoiceClosingDay;

    @OneToMany(mappedBy = "card", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    private List<CardDependent> dependents = new ArrayList<>();

    /** Última vez em que uma importação de fatura (CSV) foi concluída para este cartão. */
    private Instant lastStatementImportAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLastFourDigits() {
        return lastFourDigits;
    }

    public void setLastFourDigits(String lastFourDigits) {
        this.lastFourDigits = lastFourDigits;
    }

    public String getColorHex() {
        return colorHex;
    }

    public void setColorHex(String colorHex) {
        this.colorHex = colorHex;
    }

    public Integer getInvoiceClosingDay() {
        return invoiceClosingDay;
    }

    public void setInvoiceClosingDay(Integer invoiceClosingDay) {
        this.invoiceClosingDay = invoiceClosingDay;
    }

    public List<CardDependent> getDependents() {
        return dependents;
    }

    public void setDependents(List<CardDependent> dependents) {
        this.dependents = dependents;
    }

    public Instant getLastStatementImportAt() {
        return lastStatementImportAt;
    }

    public void setLastStatementImportAt(Instant lastStatementImportAt) {
        this.lastStatementImportAt = lastStatementImportAt;
    }
}
