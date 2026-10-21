package com.desss.portal.dto;

/**
 * Result of a login. On success it carries the session token plus the identity the UI
 * needs — crucially the {@code role}, which now comes from the database rather than
 * being chosen by the user.
 */
public record LoginResponse(
    boolean ok, String token, String username, String fullName, String role, String error) {

  public static LoginResponse success(
      String token, String username, String fullName, String role) {
    return new LoginResponse(true, token, username, fullName, role, null);
  }

  public static LoginResponse failure(String message) {
    return new LoginResponse(false, null, null, null, null, message);
  }
}
