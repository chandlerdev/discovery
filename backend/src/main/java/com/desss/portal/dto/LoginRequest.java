package com.desss.portal.dto;

/** Body of POST /api/auth/login — real credentials, checked against the admin_user table. */
public record LoginRequest(String username, String password) {}
