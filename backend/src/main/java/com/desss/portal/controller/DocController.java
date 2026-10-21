package com.desss.portal.controller;

import com.desss.portal.dto.ApiResponse;
import com.desss.portal.security.AuthGuard;
import com.desss.portal.security.ClientSessionService;
import com.desss.portal.security.SessionService;
import com.desss.portal.service.ProjectDocService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/docs")
public class DocController {

  /** Sent by an unlocked client questionnaire. */
  public static final String CLIENT_HEADER = "X-Client-Token";

  private final ProjectDocService docService;
  private final SessionService teamSessions;
  private final ClientSessionService clientSessions;

  public DocController(
      ProjectDocService docService,
      SessionService teamSessions,
      ClientSessionService clientSessions) {
    this.docService = docService;
    this.teamSessions = teamSessions;
    this.clientSessions = clientSessions;
  }

  /**
   * A document is reachable two ways: by a signed-in team member (any client), or by the
   * client who unlocked <em>this</em> record. Anything else is a 401 — which is what stops
   * a guessed client id from reading or overwriting a record.
   */
  private void authorize(String teamToken, String clientToken, String cid) {
    boolean isTeamMember = teamSessions.resolve(teamToken).isPresent();
    boolean isThisClient = clientSessions.canAccess(clientToken, cid);

    if (!isTeamMember && !isThisClient) {
      throw new ResponseStatusException(
          HttpStatus.UNAUTHORIZED, "Unlock this questionnaire to continue");
    }
  }

  @GetMapping(value = "/{cid}", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<String> get(
      @PathVariable String cid,
      @RequestHeader(value = AuthGuard.HEADER, required = false) String teamToken,
      @RequestHeader(value = CLIENT_HEADER, required = false) String clientToken) {

    authorize(teamToken, clientToken, cid);

    return docService
        .find(cid)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /** Saves the full JSON document. */
  @PutMapping(value = "/{cid}", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<ApiResponse> put(
      @PathVariable String cid,
      @RequestHeader(value = AuthGuard.HEADER, required = false) String teamToken,
      @RequestHeader(value = CLIENT_HEADER, required = false) String clientToken,
      @RequestHeader(value = "X-Updated-By", required = false) String by,
      @RequestBody String body) {

    authorize(teamToken, clientToken, cid);

    if (!docService.clientExists(cid)) {
      return ResponseEntity.notFound().build();
    }
    if (docService.isTooLarge(body)) {
      return ResponseEntity.badRequest().body(ApiResponse.error("payload too large"));
    }

    docService.save(cid, body, by);
    return ResponseEntity.ok(ApiResponse.success());
  }
}
