package com.desss.portal.dto;

/** Body of POST /api/admin-users. Password arrives plain and is BCrypt-hashed before storage. */
public record CreateAdminUserRequest(
    String username, String password, String fullName, String email, String role) {}
