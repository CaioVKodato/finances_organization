package com.finance.organization.repository;

import com.finance.organization.model.Expense;
import com.finance.organization.model.SpentBy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    void deleteByCard_Id(Long cardId);

    void deleteByInstallmentGroupId(String installmentGroupId);

    List<Expense> findByCardIdOrderByExpenseDateDesc(Long cardId);

    List<Expense> findBySpentByOrderByExpenseDateDesc(SpentBy spentBy);

    @Query("SELECT e FROM Expense e JOIN FETCH e.card ORDER BY e.expenseDate DESC, e.id DESC")
    List<Expense> findAllWithCard();

    @Query("SELECT e FROM Expense e JOIN FETCH e.card c WHERE c.id = :cardId ORDER BY e.expenseDate DESC, e.id DESC")
    List<Expense> findByCardIdWithCard(@Param("cardId") Long cardId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.card.id = :cardId")
    BigDecimal sumAmountByCardId(@Param("cardId") Long cardId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.spentBy = :spentBy")
    BigDecimal sumAmountBySpentBy(@Param("spentBy") SpentBy spentBy);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.card.id = :cardId AND e.expenseDate >= :start AND e.expenseDate <= :end")
    BigDecimal sumByCardAndDateBetween(
            @Param("cardId") Long cardId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end
    );

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.expenseDate >= :start AND e.expenseDate <= :end")
    BigDecimal sumAmountBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.expenseDate >= :start AND e.expenseDate <= :end AND e.spentBy = :spentBy")
    BigDecimal sumAmountBetweenAndSpentBy(
            @Param("start") LocalDate start,
            @Param("end") LocalDate end,
            @Param("spentBy") SpentBy spentBy
    );
}
