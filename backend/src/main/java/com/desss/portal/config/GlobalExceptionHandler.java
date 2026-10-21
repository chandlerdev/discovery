package com.desss.portal.config;

import com.desss.portal.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Turns thrown exceptions into the same { ok, error } envelope the write endpoints use. */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  /** e.g. ClientService rejecting a blank company name or a short password. */
  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ApiResponse> badRequest(IllegalArgumentException ex) {
    return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
  }

  /**
   * Anything Spring already assigned a status to — AuthGuard's 401, and, importantly,
   * the framework's own 404 for an unmapped URL. Without this, the catch-all below would
   * relabel a missing endpoint as a 500.
   */
  @ExceptionHandler(ErrorResponseException.class)
  public ResponseEntity<ApiResponse> statusException(ErrorResponseException ex) {
    String reason = ex.getBody().getDetail();
    return ResponseEntity.status(ex.getStatusCode())
        .body(ApiResponse.error(reason == null ? ex.getMessage() : reason));
  }

  /**
   * Unmapped URL. This is a ServletException, NOT an ErrorResponseException, so without
   * its own handler the catch-all below would report a missing endpoint as a 500.
   */
  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<ApiResponse> notFound(NoResourceFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Not found"));
  }

  /** Genuinely unexpected. Log it — a swallowed stack trace is a bug you never find. */
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse> unexpected(Exception ex) {
    log.error("Unhandled exception", ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiResponse.error("Unexpected server error"));
  }
}
