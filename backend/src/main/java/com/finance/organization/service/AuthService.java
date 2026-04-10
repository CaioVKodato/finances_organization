package com.finance.organization.service;

import com.finance.organization.dto.AuthResponse;
import com.finance.organization.dto.LoginRequest;
import com.finance.organization.dto.RegisterRequest;
import com.finance.organization.model.AppSettings;
import com.finance.organization.model.User;
import com.finance.organization.repository.AppSettingsRepository;
import com.finance.organization.repository.UserRepository;
import com.finance.organization.security.AuthUserDetails;
import com.finance.organization.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final AppSettingsRepository appSettingsRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthService(
            UserRepository userRepository,
            AppSettingsRepository appSettingsRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager
    ) {
        this.userRepository = userRepository;
        this.appSettingsRepository = appSettingsRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BadRequestException("E-mail já cadastrado");
        }
        User u = new User();
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(u);

        AppSettings s = new AppSettings();
        s.setUser(u);
        s.setMonthlyIncome(BigDecimal.ZERO);
        appSettingsRepository.save(s);

        String token = jwtService.generateToken(u.getId(), u.getEmail());
        return new AuthResponse(token, u.getEmail());
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.password())
        );
        AuthUserDetails d = (AuthUserDetails) auth.getPrincipal();
        String token = jwtService.generateToken(d.getUserId(), d.getEmail());
        return new AuthResponse(token, d.getEmail());
    }
}
