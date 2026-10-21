package com.desss.portal.security;

import com.desss.portal.entity.AdminUser;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * In-memory session tokens, issued on a successful admin_user login.
 *
 * <p>Deliberately simple: tokens live in a map, so they are lost on restart (everyone
 * is logged out) and are not shared across instances. That is fine for a single-node
 * internal portal. The upgrade path is JWT — swap this class out and nothing else
 * changes, because {@link AuthGuard} is the only thing that reads it.
 */
@Service
public class SessionService {

  private static final Duration TTL = Duration.ofHours(12);
  private static final SecureRandom RANDOM = new SecureRandom();

  private record Session(String username, String fullName, String role, Instant expiresAt) {
    boolean isExpired() {
      return Instant.now().isAfter(expiresAt);
    }
  }

  private final Map<String, Session> sessions = new ConcurrentHashMap<>();

  /** @return an opaque bearer token for this user */
  public String issue(AdminUser user) {
    byte[] bytes = new byte[32];
    RANDOM.nextBytes(bytes);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

    sessions.put(
        token,
        new Session(
            user.getUsername(), user.getFullName(), user.getRole(), Instant.now().plus(TTL)));
    return token;
  }

  /** @return the signed-in user's details, or empty if the token is unknown or expired */
  public Optional<AuthenticatedUser> resolve(String token) {
    if (token == null) {
      return Optional.empty();
    }
    Session s = sessions.get(token);
    if (s == null) {
      return Optional.empty();
    }
    if (s.isExpired()) {
      sessions.remove(token);
      return Optional.empty();
    }
    return Optional.of(new AuthenticatedUser(s.username(), s.fullName(), s.role()));
  }

  public void revoke(String token) {
    if (token != null) {
      sessions.remove(token);
    }
  }

  /** The caller identity carried by a valid token. */
  public record AuthenticatedUser(String username, String fullName, String role) {}
}
