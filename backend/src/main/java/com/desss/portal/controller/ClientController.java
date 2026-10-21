package com.desss.portal.controller;

import com.desss.portal.dto.ApiResponse;
import com.desss.portal.dto.ClientRequest;
import com.desss.portal.dto.ClientResponse;
import com.desss.portal.dto.UnlockRequest;
import com.desss.portal.dto.UnlockResponse;
import com.desss.portal.entity.Client;
import com.desss.portal.security.AuthGuard;
import com.desss.portal.service.ClientService;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

  private static final Logger log = LoggerFactory.getLogger(ClientController.class);

  private final ClientService clientService;
  private final AuthGuard guard;

  public ClientController(ClientService clientService, AuthGuard guard) {
    this.clientService = clientService;
    this.guard = guard;
  }

  @GetMapping
  public List<ClientResponse> list(
      @RequestHeader(value = AuthGuard.HEADER, required = false) String token) {
    guard.require(token);
    return clientService.findAll().stream().map(ClientResponse::from).toList();
  }

  /**
   * Open endpoint: a client unlocks their own questionnaire with their company name and
   * password. Success returns a session token scoped to this client id.
   *
   * <p>There is deliberately no public "look up the company name for this id" endpoint —
   * the company name is half the credential.
   */
  @PostMapping("/{id}/unlock")
  public ResponseEntity<UnlockResponse> unlock(
      @PathVariable String id, @RequestBody UnlockRequest body) {
    UnlockResponse result = clientService.unlock(id, body);
    return result.ok()
        ? ResponseEntity.ok(result)
        : ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
  }

  @PostMapping
  public ClientResponse create(
      @RequestHeader(value = AuthGuard.HEADER, required = false) String token,
      @RequestBody ClientRequest body) {
    guard.require(token);
    return ClientResponse.from(clientService.create(body));
  }

  /**
   * Reveals a client's questionnaire password in plaintext — the eye button in the
   * Clients tab. Team-only, and deliberately a separate call so the password is fetched
   * on demand rather than shipped to the browser with every client list.
   */
  @GetMapping("/{id}/password")
  public ResponseEntity<Map<String, String>> revealPassword(
      @RequestHeader(value = AuthGuard.HEADER, required = false) String token,
      @PathVariable String id) {
    var user = guard.require(token);
    log.info("User '{}' revealed the password for client '{}'", user.username(), id);

    return clientService
        .revealPassword(id)
        .map(pw -> ResponseEntity.ok(Map.of("password", pw)))
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /**
   * Open: the client's own questionnaire page loads its logo from here to show in the
   * header. A logo isn't a credential (unlike the company name), so no token is required.
   * 404 means the client has no logo.
   */
  @GetMapping("/{id}/logo")
  public ResponseEntity<Map<String, String>> logo(@PathVariable String id) {
    return clientService
        .findById(id)
        .map(Client::getLogo)
        .filter(l -> l != null && !l.isBlank())
        .map(l -> ResponseEntity.ok(Map.of("logo", l)))
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}")
  public ApiResponse delete(
      @RequestHeader(value = AuthGuard.HEADER, required = false) String token,
      @PathVariable String id) {
    guard.require(token);
    clientService.delete(id);
    return ApiResponse.success();
  }
}
