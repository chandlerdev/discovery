package com.desss.portal.service;

import com.desss.portal.dto.CreateAdminUserRequest;
import com.desss.portal.dto.UpdateAdminUserRequest;
import com.desss.portal.entity.AdminUser;
import com.desss.portal.repository.AdminUserRepository;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class AdminUserService {

  private static final int MIN_PASSWORD_LENGTH = 6;
  private static final String STATUS_ACTIVE = "ACTIVE";
  private static final Set<String> ROLES = Set.of("ADMIN", "CONSULTANT", "DEVELOPER", "APPROVER");

  private final AdminUserRepository users;

  public AdminUserService(AdminUserRepository users) {
    this.users = users;
  }

  /** Active, non-deleted team members. */
  public List<AdminUser> list() {
    return users.findAll().stream().filter(u -> !u.isDeleted()).toList();
  }

  /**
   * Returns a team member's password for the reveal ("eye") button. Passwords are stored
   * in plain text, so this is a straight read.
   *
   * @return the password, or empty if the user is unknown or (legacy) still hashed
   */
  public Optional<String> revealPassword(Long id) {
    return users
        .findById(id)
        .map(AdminUser::getPassword)
        .filter(pw -> pw != null && !isBcryptHash(pw));
  }

  private static boolean isBcryptHash(String s) {
    return s.startsWith("$2a$") || s.startsWith("$2b$") || s.startsWith("$2y$");
  }

  public AdminUser create(CreateAdminUserRequest req) {
    String username = req == null || req.username() == null ? "" : req.username().trim();
    String fullName = req == null || req.fullName() == null ? "" : req.fullName().trim();
    String password = req == null || req.password() == null ? "" : req.password();
    String email = req == null || req.email() == null ? "" : req.email().trim();
    String role = req == null || req.role() == null ? "" : req.role().trim().toUpperCase();

    if (username.isEmpty()) {
      throw new IllegalArgumentException("Username is required");
    }
    if (fullName.isEmpty()) {
      throw new IllegalArgumentException("Full name is required");
    }
    if (password.length() < MIN_PASSWORD_LENGTH) {
      throw new IllegalArgumentException(
          "Password must be at least " + MIN_PASSWORD_LENGTH + " characters");
    }
    if (!ROLES.contains(role)) {
      throw new IllegalArgumentException("Role must be one of " + ROLES);
    }
    if (users.existsByUsername(username)) {
      throw new IllegalArgumentException("That username is already taken");
    }
    if (!email.isEmpty() && users.existsByEmail(email)) {
      throw new IllegalArgumentException("That email is already in use");
    }

    AdminUser user = new AdminUser();
    user.setUsername(username);
    user.setPassword(password); // stored in plain text so it can be revealed
    user.setFullName(fullName);
    user.setEmail(email.isEmpty() ? null : email); // null (not "") so blanks don't collide
    user.setRole(role);
    user.setStatus(STATUS_ACTIVE);
    user.setDeleted(false);
    return users.save(user);
  }

  /**
   * Edits an existing team member. Username and full name must stay non-blank and unique;
   * email, when given, must be unique too. A blank password leaves the stored one untouched
   * so an edit that only changes the name never wipes the login.
   */
  public AdminUser update(Long id, UpdateAdminUserRequest req) {
    AdminUser user =
        users
            .findById(id)
            .filter(u -> !u.isDeleted())
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

    String username = req == null || req.username() == null ? "" : req.username().trim();
    String fullName = req == null || req.fullName() == null ? "" : req.fullName().trim();
    String password = req == null || req.password() == null ? "" : req.password();
    String email = req == null || req.email() == null ? "" : req.email().trim();
    String role =
        req == null || req.role() == null || req.role().isBlank()
            ? user.getRole()
            : req.role().trim().toUpperCase();

    if (username.isEmpty()) {
      throw new IllegalArgumentException("Username is required");
    }
    if (fullName.isEmpty()) {
      throw new IllegalArgumentException("Full name is required");
    }
    if (!ROLES.contains(role)) {
      throw new IllegalArgumentException("Role must be one of " + ROLES);
    }
    if (users.existsByUsernameAndIdNot(username, id)) {
      throw new IllegalArgumentException("That username is already taken");
    }
    if (!email.isEmpty() && users.existsByEmailAndIdNot(email, id)) {
      throw new IllegalArgumentException("That email is already in use");
    }
    if (!password.isEmpty()) {
      if (password.length() < MIN_PASSWORD_LENGTH) {
        throw new IllegalArgumentException(
            "Password must be at least " + MIN_PASSWORD_LENGTH + " characters");
      }
      user.setPassword(password); // plain text so it can be revealed
    }

    user.setUsername(username);
    user.setFullName(fullName);
    user.setEmail(email.isEmpty() ? null : email);
    user.setRole(role);
    return users.save(user);
  }

  /** Soft delete, so the activity log keeps resolving the name. */
  public void delete(Long id) {
    users
        .findById(id)
        .ifPresent(
            u -> {
              u.setDeleted(true);
              u.setStatus("INACTIVE");
              users.save(u);
            });
  }
}
