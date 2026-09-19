package com.frauddetect.controller;

import com.frauddetect.dto.response.DriftMetricResponse;
import com.frauddetect.service.DriftMonitoringService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/drift")
@RequiredArgsConstructor
public class DriftController {

    private static final Logger log = LoggerFactory.getLogger(DriftController.class);

    private final DriftMonitoringService driftMonitoringService;

    @GetMapping("/metrics")
    public ResponseEntity<List<DriftMetricResponse>> getMetrics(
            @RequestParam(required = false) String feature) {
        log.info("REST request to get drift metrics for feature: {}", feature);
        List<DriftMetricResponse> response = driftMonitoringService.getDriftMetrics(feature);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/compute")
    public ResponseEntity<List<DriftMetricResponse>> computeDriftNow() {
        log.info("REST request to trigger immediate drift calculation");
        List<DriftMetricResponse> response = driftMonitoringService.computeAndSaveDriftMetrics();
        return ResponseEntity.ok(response);
    }
}
