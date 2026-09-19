package com.frauddetect.service;

import com.frauddetect.dto.request.LoginRequest;
import com.frauddetect.dto.request.RegisterRequest;
import com.frauddetect.dto.response.AuthResponse;
import com.frauddetect.dto.response.RegisterResponse;
import com.frauddetect.entity.User;
import com.frauddetect.exception.DuplicateResourceException;
import com.frauddetect.repository.UserRepository;
import com.frauddetect.security.JwtUtil;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username '" + request.getUsername() + "' is already taken");
        }

        User user = User.builder()
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole().toUpperCase())
                .build();

        User saved = userRepository.save(user);
        log.info("Registered new user: username={}, role={}", saved.getUsername(), saved.getRole());

        return RegisterResponse.builder()
                .id(saved.getId())
                .username(saved.getUsername())
                .role(saved.getRole())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password");
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());
        log.info("User logged in successfully: username={}, role={}", user.getUsername(), user.getRole());

        return AuthResponse.builder()
                .token(token)
                .role(user.getRole())
                .expiresIn(jwtUtil.getExpirationMs() / 1000)
                .build();
    }

    @PostConstruct
    @Transactional
    public void initDefaultUsers() {
        if (!userRepository.existsByUsername("analyst1")) {
            userRepository.save(User.builder()
                    .username("analyst1")
                    .passwordHash(passwordEncoder.encode("StrongPass123!"))
                    .role("ANALYST")
                    .build());
            log.info("Initialized default user: analyst1 / StrongPass123!");
        }

        if (!userRepository.existsByUsername("admin1")) {
            userRepository.save(User.builder()
                    .username("admin1")
                    .passwordHash(passwordEncoder.encode("StrongPass123!"))
                    .role("ADMIN")
                    .build());
            log.info("Initialized default user: admin1 / StrongPass123!");
        }
    }
}
