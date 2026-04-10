package com.finance.organization.service;

import com.finance.organization.dto.SettingsRequest;
import com.finance.organization.dto.SettingsResponse;
import com.finance.organization.model.AppSettings;
import com.finance.organization.model.User;
import com.finance.organization.repository.AppSettingsRepository;
import com.finance.organization.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class SettingsService {

    private final AppSettingsRepository appSettingsRepository;
    private final UserRepository userRepository;

    public SettingsService(AppSettingsRepository appSettingsRepository, UserRepository userRepository) {
        this.appSettingsRepository = appSettingsRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public SettingsResponse get(long userId) {
        return new SettingsResponse(load(userId).getMonthlyIncome());
    }

    @Transactional
    public SettingsResponse update(long userId, SettingsRequest request) {
        AppSettings s = load(userId);
        s.setMonthlyIncome(request.monthlyIncome());
        return new SettingsResponse(appSettingsRepository.save(s).getMonthlyIncome());
    }

    public BigDecimal getMonthlyIncomeOrZero(long userId) {
        return load(userId).getMonthlyIncome();
    }

    private AppSettings load(long userId) {
        return appSettingsRepository.findById(userId).orElseGet(() -> {
            User u = userRepository.findById(userId)
                    .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
            AppSettings s = new AppSettings();
            s.setUser(u);
            s.setMonthlyIncome(BigDecimal.ZERO);
            return appSettingsRepository.save(s);
        });
    }
}
