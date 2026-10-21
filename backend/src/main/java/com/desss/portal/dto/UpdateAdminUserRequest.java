package com.desss.portal.dto;

/**
 * Body of PUT /api/admin-users/{id}. Every field is optional to send, but username and
 * fullName must resolve to a non-blank value. A blank/absent {@code password} means
 * "keep the current one"; role defaults to the user's existing role when omitted.
 */
public record UpdateAdminUserRequest(
    String username, String password, String fullName, String email, String role) {}
