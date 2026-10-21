package com.desss.portal.dto;

import com.desss.portal.entity.AdminUser;
import java.time.Instant;

/** Team member as shown in the admin-users list. The password is never included. */
public record AdminUserResponse(
    Long id,
    String username,
    String fullName,
    String email,
    String role,
    String status,
    Instant createdAt) {

  public static AdminUserResponse from(AdminUser u) {
    return new AdminUserResponse(
        u.getId(),
        u.getUsername(),
        u.getFullName(),
        u.getEmail(),
        u.getRole(),
        u.getStatus(),
        u.getCreatedAt());
  }
}
