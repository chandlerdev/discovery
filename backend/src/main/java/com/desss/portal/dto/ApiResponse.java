package com.desss.portal.dto;

/**
 * Generic { ok, error } envelope returned by write endpoints.
 *
 * <p>The factory is named {@code success()} rather than {@code ok()} because a record's
 * accessor for the {@code ok} component already owns that name.
 */
public record ApiResponse(boolean ok, String error) {

  public static ApiResponse success() {
    return new ApiResponse(true, null);
  }

  public static ApiResponse error(String message) {
    return new ApiResponse(false, message);
  }
}
