package com.desss.portal.service;

import com.desss.portal.dto.LoginRequest;
import com.desss.portal.dto.LoginResponse;
import com.desss.portal.entity.AdminUser;
import com.desss.portal.repository.AdminUserRepository;
import com.desss.portal.security.SessionService;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

  private static final String STATUS_ACTIVE = "ACTIVE";

  /** One message for every failure mode, so the response can't be used to probe usernames. */
  private static final String BAD_CREDENTIALS = "Incorrect username or password";

  private final AdminUserRepository adminUsers;
  private final PasswordEncoder passwordEncoder;
  private final SessionService sessions;

  public AuthService(
      AdminUserRepository adminUsers, PasswordEncoder passwordEncoder, SessionService sessions) {
    this.adminUsers = adminUsers;
    this.passwordEncoder = passwordEncoder;
    this.sessions = sessions;
  }

  /**
   * Authenticates against the admin_user table. The role is read from the row — it is no
   * longer something the caller can choose.
   */
  public LoginResponse login(LoginRequest req) {
    if (req == null || isBlank(req.username()) || isBlank(req.password())) {
      return LoginResponse.failure(BAD_CREDENTIALS);
    }

    Optional<AdminUser> found =
        adminUsers.findByUsernameAndDeletedFalseAndStatus(req.username().trim(), STATUS_ACTIVE);

    if (found.isEmpty()) {
      // Hash anyway so a missing user and a wrong password take the same time to answer.
      passwordEncoder.encode(req.password());
      return LoginResponse.failure(BAD_CREDENTIALS);
    }

    AdminUser user = found.get();
    if (!passwordMatches(req.password(), user.getPassword())) {
      return LoginResponse.failure(BAD_CREDENTIALS);
    }

    String token = sessions.issue(user);
    // The UI keys its tabs off lowercase roles ('admin', 'consultant', …).
    return LoginResponse.success(
        token, user.getUsername(), user.getFullName(), user.getRole().toLowerCase());
  }

  public void logout(String token) {
    sessions.revoke(token);
  }

  /**
   * Hybrid check: a stored BCrypt hash (from before admin passwords went plaintext) is
   * verified with the encoder; a plaintext value is compared directly. Keeps old accounts
   * working through the transition.
   */
  private boolean passwordMatches(String raw, String stored) {
    if (stored == null) {
      return false;
    }
    if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
      return passwordEncoder.matches(raw, stored);
    }
    return java.security.MessageDigest.isEqual(
        raw.getBytes(java.nio.charset.StandardCharsets.UTF_8),
        stored.getBytes(java.nio.charset.StandardCharsets.UTF_8));
  }

  private static boolean isBlank(String s) {
    return s == null || s.isBlank();
  }
}
