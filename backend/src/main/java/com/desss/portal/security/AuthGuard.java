package com.desss.portal.security;

import com.desss.portal.security.SessionService.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Guards the team-only endpoints. Callers send the session token issued by
 * {@code POST /api/auth/login} in the {@value #HEADER} header.
 *
 * <p>Replaces the old shared team passcode: identity now comes from a real
 * {@code admin_user} row, so {@link #require} can answer "who is this" and not just
 * "do they know the secret".
 */
@Component
public class AuthGuard {

  public static final String HEADER = "X-Auth-Token";

  private final SessionService sessions;

  public AuthGuard(SessionService sessions) {
    this.sessions = sessions;
  }

  /** @return the caller, or throws 401 if the token is missing, unknown, or expired */
  public AuthenticatedUser require(String token) {
    return sessions
        .resolve(token)
        .orElseThrow(
            () ->
                new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Session expired — please sign in again"));
  }

  /** Same as {@link #require} but also enforces a role. */
  public AuthenticatedUser requireRole(String token, String role) {
    AuthenticatedUser user = require(token);
    if (!role.equalsIgnoreCase(user.role())) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "This action requires the " + role + " role");
    }
    return user;
  }
}
