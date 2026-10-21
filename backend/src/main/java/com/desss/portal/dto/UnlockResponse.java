package com.desss.portal.dto;

/**
 * Result of a client unlock. The company name is only echoed back <em>after</em> a
 * successful unlock — before that it is half the credential, so it is never disclosed.
 */
public record UnlockResponse(boolean ok, String token, String company, String error) {

  public static UnlockResponse success(String token, String company) {
    return new UnlockResponse(true, token, company, null);
  }

  public static UnlockResponse failure(String message) {
    return new UnlockResponse(false, null, null, message);
  }
}
