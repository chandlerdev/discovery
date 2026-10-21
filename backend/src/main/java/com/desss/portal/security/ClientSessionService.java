package com.desss.portal.security;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * Session tokens for unlocked clients — the questionnaire equivalent of
 * {@link SessionService}, which serves the team portal.
 *
 * <p>A token is bound to exactly one client id, so unlocking FreshBytes gives you no
 * access to any other client's document.
 */
@Service
public class ClientSessionService {

  /** Long enough that a client can fill in a long questionnaire without being kicked out. */
  private static final Duration TTL = Duration.ofHours(24);

  private static final SecureRandom RANDOM = new SecureRandom();

  private record Session(String clientId, Instant expiresAt) {
    boolean isExpired() {
      return Instant.now().isAfter(expiresAt);
    }
  }

  private final Map<String, Session> sessions = new ConcurrentHashMap<>();

  public String issue(String clientId) {
    byte[] bytes = new byte[32];
    RANDOM.nextBytes(bytes);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    sessions.put(token, new Session(clientId, Instant.now().plus(TTL)));
    return token;
  }

  /** @return the client id this token unlocked, or empty if unknown/expired */
  public Optional<String> resolve(String token) {
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
    return Optional.of(s.clientId());
  }

  /** True only if this token unlocked <em>this</em> client. */
  public boolean canAccess(String token, String clientId) {
    return resolve(token).map(id -> id.equals(clientId)).orElse(false);
  }
}
