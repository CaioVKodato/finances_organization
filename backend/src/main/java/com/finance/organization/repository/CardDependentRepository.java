package com.finance.organization.repository;

import com.finance.organization.model.CardDependent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CardDependentRepository extends JpaRepository<CardDependent, Long> {

    List<CardDependent> findByCard_IdOrderBySortOrderAscIdAsc(Long cardId);

    Optional<CardDependent> findByIdAndCard_Id(Long id, Long cardId);

    long countByCard_Id(Long cardId);
}
