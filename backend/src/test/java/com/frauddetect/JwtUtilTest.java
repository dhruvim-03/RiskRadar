package com.frauddetect;

import com.frauddetect.security.JwtUtil;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private JwtUtil jwtUtil;
    private static final String SECRET = "this-is-a-secure-256-bit-secret-key-for-jwt-testing-1234567890";
    private static final long EXPIRATION_MS = 3600000; // 1 hour

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil(SECRET, EXPIRATION_MS);
    }

    @Test
    void testGenerateAndValidateToken() {
        String token = jwtUtil.generateToken("analyst1", "ANALYST");
        assertNotNull(token);
        assertTrue(jwtUtil.validateToken(token));

        assertEquals("analyst1", jwtUtil.extractUsername(token));
        assertEquals("ANALYST", jwtUtil.extractRole(token));
    }

    @Test
    void testTokenExpirationRejection() throws InterruptedException {
        // Create JwtUtil with 1ms expiration
        JwtUtil shortLivedUtil = new JwtUtil(SECRET, 1L);
        String token = shortLivedUtil.generateToken("analyst1", "ANALYST");

        // Wait 15ms to guarantee expiry
        Thread.sleep(15);

        assertFalse(shortLivedUtil.validateToken(token));
    }

    @Test
    void testInvalidTokenSignature() {
        JwtUtil otherUtil = new JwtUtil("different-secret-key-different-secret-key-12345", EXPIRATION_MS);
        String forgedToken = otherUtil.generateToken("hacker", "ADMIN");

        assertFalse(jwtUtil.validateToken(forgedToken));
    }

    @Test
    void testMalformedTokenRejection() {
        assertFalse(jwtUtil.validateToken("not.a.valid.jwt.token"));
        assertFalse(jwtUtil.validateToken(""));
    }
}
