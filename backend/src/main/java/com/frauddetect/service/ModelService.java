package com.frauddetect.service;

import com.frauddetect.dto.response.ModelVersionResponse;
import com.frauddetect.dto.response.RetrainJobResponse;
import com.frauddetect.entity.ModelVersion;
import com.frauddetect.repository.ModelVersionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
public class ModelService {

    private static final Logger log = LoggerFactory.getLogger(ModelService.class);

    private final ModelVersionRepository modelVersionRepository;
    private final MlClient mlClient;

    private final AtomicBoolean isRetraining = new AtomicBoolean(false);

    @Transactional
    public RetrainJobResponse triggerRetrain() {
        if (isRetraining.get()) {
            throw new IllegalStateException("A model retraining job is already in progress");
        }

        isRetraining.set(true);
        try {
            RetrainJobResponse response = mlClient.triggerRetrain();
            log.info("Retrain job triggered with ID: {}", response.getJobId());
            return response;
        } catch (Exception e) {
            isRetraining.set(false);
            throw e;
        }
    }

    public void resetRetrainingStatus() {
        isRetraining.set(false);
    }

    @Transactional(readOnly = true)
    public List<ModelVersionResponse> getModelVersions() {
        List<ModelVersion> versions = modelVersionRepository.findAllByOrderByTrainedAtDesc();
        return versions.stream().map(v -> ModelVersionResponse.builder()
                .version(v.getVersion())
                .trainedAt(v.getTrainedAt())
                .prAuc(v.getPrAuc())
                .precision(v.getPrecisionAtThreshold())
                .recall(v.getRecallAtThreshold())
                .isActive(Boolean.TRUE.equals(v.getIsActive()))
                .build()).toList();
    }

    @Transactional
    public ModelVersionResponse registerModelVersion(
            String version,
            BigDecimal prAuc,
            BigDecimal precision,
            BigDecimal recall,
            String artifactPath,
            boolean activate) {

        log.info("Registering model version {}: prAuc={}, activate={}", version, prAuc, activate);

        if (activate) {
            modelVersionRepository.deactivateAll();
        }

        ModelVersion modelVersion = modelVersionRepository.findByVersion(version)
                .orElse(ModelVersion.builder().version(version).build());

        modelVersion.setTrainedAt(Instant.now());
        modelVersion.setPrAuc(prAuc);
        modelVersion.setPrecisionAtThreshold(precision);
        modelVersion.setRecallAtThreshold(recall);
        modelVersion.setArtifactPath(artifactPath);
        modelVersion.setIsActive(activate);

        ModelVersion saved = modelVersionRepository.save(modelVersion);
        isRetraining.set(false);

        return ModelVersionResponse.builder()
                .version(saved.getVersion())
                .trainedAt(saved.getTrainedAt())
                .prAuc(saved.getPrAuc())
                .precision(saved.getPrecisionAtThreshold())
                .recall(saved.getRecallAtThreshold())
                .isActive(Boolean.TRUE.equals(saved.getIsActive()))
                .build();
    }

    @PostConstruct
    @Transactional
    public void initSeedVersions() {
        if (modelVersionRepository.count() == 0) {
            Instant now = Instant.now();
            modelVersionRepository.save(ModelVersion.builder()
                    .version("v1")
                    .trainedAt(now.minusSeconds(86400 * 14))
                    .prAuc(new BigDecimal("0.88500"))
                    .precisionAtThreshold(new BigDecimal("0.85000"))
                    .recallAtThreshold(new BigDecimal("0.75000"))
                    .artifactPath("models/v1/model.joblib")
                    .isActive(false)
                    .build());

            modelVersionRepository.save(ModelVersion.builder()
                    .version("v2")
                    .trainedAt(now.minusSeconds(86400 * 7))
                    .prAuc(new BigDecimal("0.90100"))
                    .precisionAtThreshold(new BigDecimal("0.87200"))
                    .recallAtThreshold(new BigDecimal("0.78000"))
                    .artifactPath("models/v2/model.joblib")
                    .isActive(false)
                    .build());

            modelVersionRepository.save(ModelVersion.builder()
                    .version("v3")
                    .trainedAt(now.minusSeconds(86400 * 2))
                    .prAuc(new BigDecimal("0.91250"))
                    .precisionAtThreshold(new BigDecimal("0.88420"))
                    .recallAtThreshold(new BigDecimal("0.79500"))
                    .artifactPath("models/v3/model.joblib")
                    .isActive(true)
                    .build());

            log.info("Initialized default model versions (v1, v2, active: v3)");
        }
    }
}
