package com.finance.organization.service;

import com.finance.organization.dto.SettingsRequest;
import com.finance.organization.dto.SettingsResponse;
import com.finance.organization.model.AppSettings;
import com.finance.organization.repository.AppSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class SettingsService {

    private final AppSettingsRepository appSettingsRepository;

    public SettingsService(AppSettingsRepository appSettingsRepository) {
        this.appSettingsRepository = appSettingsRepository;
    }

    @Transactional(readOnly = true)
    public SettingsResponse get() {
        return new SettingsResponse(load().getMonthlyIncome());
    }

    @Transactional
    public SettingsResponse update(SettingsRequest request) {
        AppSettings s = load();
        s.setMonthlyIncome(request.monthlyIncome());
        return new SettingsResponse(appSettingsRepository.save(s).getMonthlyIncome());
    }

    public BigDecimal getMonthlyIncomeOrZero() {
        return load().getMonthlyIncome();
    }

    private AppSettings load() {
        return appSettingsRepository.findById(AppSettings.SINGLETON_ID).orElseGet(() -> {
            AppSettings n = new AppSettings();
            n.setId(AppSettings.SINGLETON_ID);
            n.setMonthlyIncome(BigDecimal.ZERO);
            return appSettingsRepository.save(n);
        });
    }
}
