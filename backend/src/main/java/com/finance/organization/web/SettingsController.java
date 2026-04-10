package com.finance.organization.web;

import com.finance.organization.dto.SettingsRequest;
import com.finance.organization.dto.SettingsResponse;
import com.finance.organization.service.CurrentUserService;
import com.finance.organization.service.SettingsService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;
    private final CurrentUserService currentUserService;

    public SettingsController(SettingsService settingsService, CurrentUserService currentUserService) {
        this.settingsService = settingsService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public SettingsResponse get() {
        long uid = currentUserService.requireUserId();
        return settingsService.get(uid);
    }

    @PutMapping
    public SettingsResponse update(@Valid @RequestBody SettingsRequest request) {
        long uid = currentUserService.requireUserId();
        return settingsService.update(uid, request);
    }
}
