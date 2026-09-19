package com.frauddetect.repository;

import com.frauddetect.entity.DriftMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DriftMetricRepository extends JpaRepository<DriftMetric, Long> {

    List<DriftMetric> findByFeatureNameOrderByWindowStartAsc(String featureName);

    List<DriftMetric> findAllByOrderByWindowStartAsc();

    @Query("SELECT DISTINCT dm.featureName FROM DriftMetric dm ORDER BY dm.featureName ASC")
    List<String> findDistinctFeatureNames();
}
