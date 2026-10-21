package com.desss.portal.controller;

import com.desss.portal.dto.ApiResponse;
import com.desss.portal.security.AuthGuard;
import com.desss.portal.service.ClientThemeService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Per-client visual theme. Read openly by the client page; written only by the team. */
@RestController
@RequestMapping("/api/client-theme")
public class ClientThemeController {

  private final ClientThemeService themes;
  private final AuthGuard guard;

  public ClientThemeController(ClientThemeService themes, AuthGuard guard) {
    this.themes = themes;
    this.guard = guard;
  }

  /**
   * Open: the client page loads ITS theme from here. 404 means the client has no custom
   * theme and the frontend uses the site defaults.
   */
  @GetMapping(value = "/{cid}", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<String> get(@PathVariable String cid) {
    return themes
        .findForClient(cid)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /** Saves a theme for one client — set by an admin in the portal. */
  @PutMapping(value = "/{cid}", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ApiResponse put(
      @RequestHeader(value = AuthGuard.HEADER, required = false) String token,
      @PathVariable String cid,
      @RequestBody String body) {
    var user = guard.require(token);
    themes.saveForClient(cid, body, user.fullName());
    return ApiResponse.success();
  }
}
