package com.finance.organization.service;

import com.finance.organization.security.AuthUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    public long requireUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            throw new UnauthorizedException();
        }
        Object p = auth.getPrincipal();
        if (p instanceof AuthUserDetails d) {
            return d.getUserId();
        }
        throw new UnauthorizedException();
    }
}
