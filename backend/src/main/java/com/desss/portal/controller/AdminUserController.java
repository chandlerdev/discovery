package com.desss.portal.controller;

import com.desss.portal.dto.AdminUserResponse;
import com.desss.portal.dto.ApiResponse;
import com.desss.portal.dto.CreateAdminUserRequest;
import com.desss.portal.dto.UpdateAdminUserRequest;
import com.desss.portal.service.AdminUserService;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Team-member management for the /admin/users screen.
 *
 * <p>NOTE: these endpoints are intentionally OPEN (no auth) so the screen can be viewed
 * without signing in. That means anyone who reaches this URL can list and create admin
 * accounts — re-guard with {@code AuthGuard.requireRole(token, "ADMIN")} before this is
 * exposed to the public internet.
 */
@RestController
@RequestMapping("/api/admin-users")
public class AdminUserController {

  private final AdminUserService adminUsers;

  public AdminUserController(AdminUserService adminUsers) {
    this.adminUsers = adminUsers;
  }

  @GetMapping
  public List<AdminUserResponse> list() {
    return adminUsers.list().stream().map(AdminUserResponse::from).toList();
  }

  @PostMapping
  public AdminUserResponse create(@RequestBody CreateAdminUserRequest body) {
    return AdminUserResponse.from(adminUsers.create(body));
  }

  @PutMapping("/{id}")
  public AdminUserResponse update(
      @PathVariable Long id, @RequestBody UpdateAdminUserRequest body) {
    return AdminUserResponse.from(adminUsers.update(id, body));
  }

  /** Reveals a team member's password (plaintext) for the eye button. */
  @GetMapping("/{id}/password")
  public ResponseEntity<Map<String, String>> revealPassword(@PathVariable Long id) {
    return adminUsers
        .revealPassword(id)
        .map(pw -> ResponseEntity.ok(Map.of("password", pw)))
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}")
  public ApiResponse delete(@PathVariable Long id) {
    adminUsers.delete(id);
    return ApiResponse.success();
  }
}
