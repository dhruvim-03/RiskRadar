package com.frauddetect.repository;

import com.frauddetect.entity.FraudScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FraudScoreRepository extends JpaRepository<FraudScore, Long> {

    Optional<FraudScore> findByTransactionId(Long transactionId);

    long countByRiskTier(String riskTier);

    @Query("SELECT AVG(fs.fraudProbability) FROM FraudScore fs")
    Double findAverageFraudProbability();

    @Query("SELECT fs.fraudProbability FROM FraudScore fs")
    List<Double> findAllProbabilities();
}
