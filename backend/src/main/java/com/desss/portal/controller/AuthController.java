package com.desss.portal.controller;

import com.desss.portal.dto.ApiResponse;
import com.desss.portal.dto.LoginRequest;
import com.desss.portal.dto.LoginResponse;
import com.desss.portal.security.AuthGuard;
import com.desss.portal.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  /** Body: { username, password }. On success returns a session token, the role, and the name. */
  @PostMapping("/login")
  public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest body) {
    LoginResponse result = authService.login(body);
    return result.ok()
        ? ResponseEntity.ok(result)
        : ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
  }

  @PostMapping("/logout")
  public ApiResponse logout(
      @RequestHeader(value = AuthGuard.HEADER, required = false) String token) {
    authService.logout(token);
    return ApiResponse.success();
  }
}
