package com.frauddetect.controller;

import com.frauddetect.dto.response.ModelVersionResponse;
import com.frauddetect.dto.response.RetrainJobResponse;
import com.frauddetect.service.MlClient;
import com.frauddetect.service.ModelService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/model")
@RequiredArgsConstructor
public class ModelController {

    private static final Logger log = LoggerFactory.getLogger(ModelController.class);

    private final ModelService modelService;
    private final MlClient mlClient;

    @PostMapping("/retrain")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RetrainJobResponse> triggerRetrain() {
        log.info("REST request by ADMIN to trigger model retraining");
        RetrainJobResponse response = modelService.triggerRetrain();
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/versions")
    public ResponseEntity<List<ModelVersionResponse>> getVersions() {
        log.info("REST request to get model versions");
        List<ModelVersionResponse> response = modelService.getModelVersions();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/jobs/{jobId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getJobStatus(@PathVariable String jobId) {
        log.info("REST request by ADMIN to check retrain job status: {}", jobId);
        Map<String, Object> status = mlClient.getJobStatus(jobId);
        return ResponseEntity.ok(status);
    }

    @PostMapping("/versions/register")
    public ResponseEntity<ModelVersionResponse> registerVersion(@RequestBody RegisterVersionDto dto) {
        log.info("REST request to register new model version: {}", dto.getVersion());
        ModelVersionResponse response = modelService.registerModelVersion(
                dto.getVersion(),
                dto.getPrAuc(),
                dto.getPrecision(),
                dto.getRecall(),
                dto.getArtifactPath(),
                dto.isActivate()
        );
        return ResponseEntity.ok(response);
    }

    @Data
    public static class RegisterVersionDto {
        private String version;
        private BigDecimal prAuc;
        private BigDecimal precision;
        private BigDecimal recall;
        private String artifactPath;
        private boolean activate = true;
    }
}
