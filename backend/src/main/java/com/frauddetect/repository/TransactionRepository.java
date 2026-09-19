package com.frauddetect.repository;

import com.frauddetect.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long>, JpaSpecificationExecutor<Transaction> {

    Optional<Transaction> findByTransactionRef(String transactionRef);

    boolean existsByTransactionRef(String transactionRef);

    /**
     * Strict temporal velocity queries:
     * Excludes current transaction and anything at or after transactionTime (strict < transactionTime).
     */
    long countByAccountIdAndTransactionTimeGreaterThanEqualAndTransactionTimeLessThan(
            String accountId, Instant windowStart, Instant transactionTime);

    List<Transaction> findByAccountIdAndTransactionTimeGreaterThanEqualAndTransactionTimeLessThan(
            String accountId, Instant windowStart, Instant transactionTime);

    Optional<Transaction> findFirstByAccountIdAndTransactionTimeLessThanOrderByTransactionTimeDesc(
            String accountId, Instant transactionTime);

    @Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.fraudScore fs " +
           "WHERE (:riskTier IS NULL OR fs.riskTier = :riskTier) " +
           "AND (:startDate IS NULL OR t.transactionTime >= :startDate) " +
           "AND (:endDate IS NULL OR t.transactionTime <= :endDate) " +
           "AND (:search IS NULL OR LOWER(t.transactionRef) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(t.accountId) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Transaction> findFilteredTransactions(
            @Param("riskTier") String riskTier,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT t FROM Transaction t WHERE t.transactionTime >= :windowStart AND t.transactionTime <= :windowEnd")
    List<Transaction> findTransactionsInWindow(
            @Param("windowStart") Instant windowStart,
            @Param("windowEnd") Instant windowEnd);
}
