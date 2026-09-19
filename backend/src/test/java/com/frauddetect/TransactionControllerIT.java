package com.frauddetect;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.frauddetect.dto.request.LoginRequest;
import com.frauddetect.dto.request.RegisterRequest;
import com.frauddetect.dto.request.TransactionRequest;
import com.frauddetect.dto.response.MlScoreResponse;
import com.frauddetect.dto.response.RetrainJobResponse;
import com.frauddetect.dto.response.ShapFeatureDto;
import com.frauddetect.service.MlClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class TransactionControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MlClient mlClient;

    private String analystToken;
    private String adminToken;

    @BeforeEach
    void setUp() throws Exception {
        // Setup mock ML response
        MlScoreResponse mockScore = MlScoreResponse.builder()
                .fraudProbability(new BigDecimal("0.87000"))
                .riskTier("HIGH")
                .modelVersion("v1")
                .shapTopFeatures(List.of(
                        new ShapFeatureDto("txCountLast1h", new BigDecimal("6.0"), new BigDecimal("0.31")),
                        new ShapFeatureDto("amountLog", new BigDecimal("8.43"), new BigDecimal("0.18"))
                ))
                .build();
        when(mlClient.score(any())).thenReturn(mockScore);
        when(mlClient.triggerRetrain()).thenReturn(new RetrainJobResponse("retrain-test-01", "STARTED"));

        // Login as default analyst
        LoginRequest analystLogin = new LoginRequest("analyst1", "StrongPass123!");
        MvcResult aRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(analystLogin)))
                .andExpect(status().isOk())
                .andReturn();
        analystToken = objectMapper.readTree(aRes.getResponse().getContentAsString()).get("token").asText();

        // Login as default admin
        LoginRequest adminLogin = new LoginRequest("admin1", "StrongPass123!");
        MvcResult adRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminLogin)))
                .andExpect(status().isOk())
                .andReturn();
        adminToken = objectMapper.readTree(adRes.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    @DisplayName("End-to-end: Register, login, submit transaction, retrieve detail, and check dashboard")
    void testFullWorkflow() throws Exception {
        // 1. Submit a valid transaction
        TransactionRequest txReq = new TransactionRequest(
                "TXN-IT-001",
                "ACC-88213",
                new BigDecimal("4599.00"),
                "electronics",
                Instant.parse("2026-09-17T14:32:00Z"),
                Map.of("v1", -1.23, "v2", 0.44)
        );

        MvcResult txResult = mockMvc.perform(post("/api/transactions")
                        .header("Authorization", "Bearer " + analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(txReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.transactionId").exists())
                .andExpect(jsonPath("$.fraudProbability").value(0.87))
                .andExpect(jsonPath("$.riskTier").value("HIGH"))
                .andExpect(jsonPath("$.shapTopFeatures[0].feature").value("txCountLast1h"))
                .andReturn();

        JsonNode txNode = objectMapper.readTree(txResult.getResponse().getContentAsString());
        long txId = txNode.get("transactionId").asLong();

        // 2. Query transaction detail
        mockMvc.perform(get("/api/transactions/" + txId)
                        .header("Authorization", "Bearer " + analystToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionRef").value("TXN-IT-001"))
                .andExpect(jsonPath("$.amount").value(4599.00));

        // 3. Query transaction explanation
        mockMvc.perform(get("/api/transactions/" + txId + "/explanation")
                        .header("Authorization", "Bearer " + analystToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shapTopFeatures").isArray());

        // 4. Query transactions list
        mockMvc.perform(get("/api/transactions?riskTier=HIGH&page=0&size=20")
                        .header("Authorization", "Bearer " + analystToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").isNumber());

        // 5. Query dashboard summary
        mockMvc.perform(get("/api/dashboard/summary")
                        .header("Authorization", "Bearer " + analystToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTransactions").isNumber())
                .andExpect(jsonPath("$.scoreDistribution").isArray());

        // 6. Query drift metrics
        mockMvc.perform(get("/api/drift/metrics?feature=amountLog")
                        .header("Authorization", "Bearer " + analystToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("Edge Case: Negative amount returns 400 with VALIDATION_ERROR")
    void testNegativeAmountValidation() throws Exception {
        TransactionRequest txReq = new TransactionRequest(
                "TXN-BAD-AMT", "ACC-01", new BigDecimal("-50.00"), "retail",
                Instant.now(), null
        );

        mockMvc.perform(post("/api/transactions")
                        .header("Authorization", "Bearer " + analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(txReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("amount must be positive")));
    }

    @Test
    @DisplayName("Edge Case: Duplicate transaction reference returns 409 Conflict")
    void testDuplicateTransactionRef() throws Exception {
        TransactionRequest txReq = new TransactionRequest(
                "TXN-DUP-TEST", "ACC-02", new BigDecimal("100.00"), "retail",
                Instant.now(), null
        );

        // First submit
        mockMvc.perform(post("/api/transactions")
                        .header("Authorization", "Bearer " + analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(txReq)))
                .andExpect(status().isCreated());

        // Second submit with same ref
        mockMvc.perform(post("/api/transactions")
                        .header("Authorization", "Bearer " + analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(txReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("CONFLICT"));
    }

    @Test
    @DisplayName("Role Security: Non-admin calling retrain returns 403, Admin calling retrain returns 202")
    void testRetrainSecurity() throws Exception {
        // Analyst attempting retrain -> 403 Forbidden
        mockMvc.perform(post("/api/model/retrain")
                        .header("Authorization", "Bearer " + analystToken))
                .andExpect(status().isForbidden());

        // Admin attempting retrain -> 202 Accepted
        mockMvc.perform(post("/api/model/retrain")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId").value("retrain-test-01"))
                .andExpect(jsonPath("$.status").value("STARTED"));
    }

    @Test
    @DisplayName("Model versions endpoint returns version list")
    void testModelVersions() throws Exception {
        mockMvc.perform(get("/api/model/versions")
                        .header("Authorization", "Bearer " + analystToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].version").exists());
    }
}
