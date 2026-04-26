package com.finance.organization.repository;

import com.finance.organization.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    boolean existsByCard_IdAndStatementLineHash(Long cardId, String statementLineHash);

    long countByDependentPerson_Id(Long dependentPersonId);

    void deleteByCard_Id(Long cardId);

    void deleteByInstallmentGroupId(String installmentGroupId);

    void deleteBySplitGroupId(String splitGroupId);

    @Query("SELECT e FROM Expense e JOIN FETCH e.card c JOIN FETCH c.user WHERE c.user.id = :userId ORDER BY e.expenseDate DESC, e.id DESC")
    List<Expense> findAllWithCardForUser(@Param("userId") Long userId);

    @Query("SELECT e FROM Expense e JOIN FETCH e.card c LEFT JOIN FETCH e.dependentPerson WHERE c.id = :cardId AND c.user.id = :userId ORDER BY e.expenseDate DESC, e.id DESC")
    List<Expense> findByCardIdWithCardForUser(@Param("cardId") Long cardId, @Param("userId") Long userId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.card.id = :cardId")
    BigDecimal sumAmountByCardId(@Param("cardId") Long cardId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.card.id = :cardId AND e.expenseDate >= :start AND e.expenseDate <= :end")
    BigDecimal sumByCardAndDateBetween(
            @Param("cardId") Long cardId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end
    );

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.expenseDate >= :start AND e.expenseDate <= :end AND e.card.user.id = :userId")
    BigDecimal sumAmountBetweenForUser(
            @Param("start") LocalDate start,
            @Param("end") LocalDate end,
            @Param("userId") Long userId
    );

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.expenseDate >= :start AND e.expenseDate <= :end AND e.card.user.id = :userId AND e.spentBySelf = true")
    BigDecimal sumAmountBetweenAndSelfForUser(
            @Param("start") LocalDate start,
            @Param("end") LocalDate end,
            @Param("userId") Long userId
    );

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.spentBySelf = true AND e.card.user.id = :userId")
    BigDecimal sumAmountSelfAllTimeForUser(@Param("userId") Long userId);

    @Query("SELECT e.dependentPerson.id, COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.spentBySelf = false AND e.card.user.id = :userId AND e.dependentPerson IS NOT NULL GROUP BY e.dependentPerson.id")
    List<Object[]> sumGroupedByDependentForUser(@Param("userId") Long userId);
}
