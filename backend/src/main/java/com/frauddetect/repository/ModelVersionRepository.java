package com.frauddetect.repository;

import com.frauddetect.entity.ModelVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ModelVersionRepository extends JpaRepository<ModelVersion, Long> {

    Optional<ModelVersion> findByIsActiveTrue();

    Optional<ModelVersion> findByVersion(String version);

    List<ModelVersion> findAllByOrderByTrainedAtDesc();

    @Modifying
    @Query("UPDATE ModelVersion m SET m.isActive = false WHERE m.isActive = true")
    void deactivateAll();
}
