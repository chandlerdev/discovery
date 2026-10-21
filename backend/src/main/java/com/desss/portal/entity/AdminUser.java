package com.desss.portal.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * A portal team member. This is the login table: {@code AuthService} looks the user up
 * by username, verifies the password, and reads {@link #role} from here — so a user's
 * role is granted by the database, not chosen at the login screen.
 *
 * <p>{@link #password} holds a BCrypt hash, never the plaintext.
 */
@Entity
@Table(
    name = "admin_user",
    uniqueConstraints = {
      @UniqueConstraint(name = "uk_admin_user_username", columnNames = "username"),
      @UniqueConstraint(name = "uk_admin_user_email", columnNames = "email")
    })
public class AdminUser {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 64)
  private String username;

  /** BCrypt hash — 60 chars today, sized to 100 to survive a cost/algorithm change. */
  @Column(nullable = false, length = 100)
  private String password;

  @Column(name = "full_name", nullable = false, length = 120)
  private String fullName;

  @Column(length = 160)
  private String email;

  /** ADMIN · CONSULTANT · DEVELOPER · APPROVER — mirrors the portal's four roles. */
  @Column(nullable = false, length = 32)
  private String role;

  /** ACTIVE · INACTIVE. */
  @Column(nullable = false, length = 32)
  private String status;

  /** Soft delete: rows are flagged, not removed, so the activity log keeps resolving. */
  @Column(name = "is_deleted", nullable = false)
  private boolean deleted = false;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at")
  private Instant updatedAt;

  @PrePersist
  void onCreate() {
    Instant now = Instant.now();
    if (createdAt == null) createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }

  public Long getId() { return id; }
  public void setId(Long v) { id = v; }

  public String getUsername() { return username; }
  public void setUsername(String v) { username = v; }

  public String getPassword() { return password; }
  public void setPassword(String v) { password = v; }

  public String getFullName() { return fullName; }
  public void setFullName(String v) { fullName = v; }

  public String getEmail() { return email; }
  public void setEmail(String v) { email = v; }

  public String getRole() { return role; }
  public void setRole(String v) { role = v; }

  public String getStatus() { return status; }
  public void setStatus(String v) { status = v; }

  public boolean isDeleted() { return deleted; }
  public void setDeleted(boolean v) { deleted = v; }

  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant v) { createdAt = v; }

  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant v) { updatedAt = v; }
}
