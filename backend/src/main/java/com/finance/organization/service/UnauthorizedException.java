package com.finance.organization.service;

public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException() {
        super("Não autorizado");
    }
}
