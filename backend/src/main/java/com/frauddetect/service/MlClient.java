package com.frauddetect.service;

import com.frauddetect.dto.request.MlScoreRequest;
import com.frauddetect.dto.response.MlScoreResponse;
import com.frauddetect.dto.response.RetrainJobResponse;
import com.frauddetect.exception.MlServiceException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class MlClient {

    private static final Logger log = LoggerFactory.getLogger(MlClient.class);

    private final WebClient mlWebClient;

    @Value("${app.ml-service.timeout-seconds:5}")
    private long timeoutSeconds;

    public MlScoreResponse score(MlScoreRequest request) {
        log.info("Sending score request to ML service for account {}", request.getAccountId());
        try {
            MlScoreResponse response = mlWebClient.post()
                    .uri("/score")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(MlScoreResponse.class)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .block();

            if (response == null) {
                throw new MlServiceException("Received empty response from ML service");
            }

            log.info("Received score response: prob={}, riskTier={}",
                    response.getFraudProbability(), response.getRiskTier());
            return response;
        } catch (WebClientResponseException ex) {
            log.error("ML service returned status {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new MlServiceException("ML service returned error: " + ex.getStatusCode() + " - " + ex.getResponseBodyAsString(), ex);
        } catch (WebClientRequestException ex) {
            log.error("Failed to connect to ML service: {}", ex.getMessage());
            throw new MlServiceException("ML service unreachable: " + ex.getMessage(), ex);
        } catch (Exception ex) {
            log.error("Unexpected error communicating with ML service: {}", ex.getMessage(), ex);
            throw new MlServiceException("ML service communication failed: " + ex.getMessage(), ex);
        }
    }

    public RetrainJobResponse triggerRetrain() {
        log.info("Triggering retrain on ML service");
        try {
            RetrainJobResponse response = mlWebClient.post()
                    .uri("/train")
                    .retrieve()
                    .bodyToMono(RetrainJobResponse.class)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .block();

            if (response == null) {
                throw new MlServiceException("Received empty response from ML retrain endpoint");
            }
            return response;
        } catch (Exception ex) {
            log.error("Failed to trigger retrain on ML service: {}", ex.getMessage(), ex);
            throw new MlServiceException("ML retrain service unreachable: " + ex.getMessage(), ex);
        }
    }

    public Map<String, Object> getModelInfo() {
        log.info("Fetching active model info from ML service");
        try {
            return mlWebClient.get()
                    .uri("/model/info")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .block();
        } catch (Exception ex) {
            log.error("Failed to fetch model info from ML service: {}", ex.getMessage(), ex);
            throw new MlServiceException("ML service info endpoint unreachable: " + ex.getMessage(), ex);
        }
    }

    public Map<String, Object> getJobStatus(String jobId) {
        log.info("Checking ML training job status for {}", jobId);
        try {
            return mlWebClient.get()
                    .uri("/train/status/" + jobId)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .block();
        } catch (Exception ex) {
            log.error("Failed to fetch training status for job {}: {}", jobId, ex.getMessage());
            throw new MlServiceException("Unable to query job status: " + ex.getMessage(), ex);
        }
    }
}
