package com.finance.organization.web;

import com.finance.organization.dto.DashboardSummary;
import com.finance.organization.service.CurrentUserService;
import com.finance.organization.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;
    private final CurrentUserService currentUserService;

    public DashboardController(DashboardService dashboardService, CurrentUserService currentUserService) {
        this.dashboardService = dashboardService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/summary")
    public DashboardSummary summary() {
        long uid = currentUserService.requireUserId();
        return dashboardService.summary(uid);
    }
}
