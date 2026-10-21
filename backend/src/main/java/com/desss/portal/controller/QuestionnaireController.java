package com.desss.portal.controller;

import com.desss.portal.dto.ApiResponse;
import com.desss.portal.security.AuthGuard;
import com.desss.portal.service.QuestionnaireService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/questionnaire")
public class QuestionnaireController {

  private final QuestionnaireService questionnaireService;
  private final AuthGuard guard;

  public QuestionnaireController(QuestionnaireService questionnaireService, AuthGuard guard) {
    this.questionnaireService = questionnaireService;
    this.guard = guard;
  }

  /**
   * Open: the client page loads the published questionnaire from here. 404 means
   * "not published yet" and the frontend falls back to its built-in default.
   */
  @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<String> get() {
    return questionnaireService
        .findPublished()
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PutMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
  public ApiResponse put(
      @RequestHeader(value = AuthGuard.HEADER, required = false) String token,
      @RequestBody String body) {
    var user = guard.require(token);
    questionnaireService.publish(body, user.fullName());
    return ApiResponse.success();
  }

  /**
   * Open: the client page loads ITS questionnaire from here. Returns the client's own
   * published version, or the shared template if they have none. 404 means neither exists
   * and the frontend falls back to its built-in default.
   */
  @GetMapping(value = "/{cid}", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<String> getForClient(@PathVariable String cid) {
    return questionnaireService
        .findForClient(cid)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /** Publishes a questionnaire for one client only. */
  @PutMapping(value = "/{cid}", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ApiResponse putForClient(
      @RequestHeader(value = AuthGuard.HEADER, required = false) String token,
      @PathVariable String cid,
      @RequestBody String body) {
    var user = guard.require(token);
    questionnaireService.publishForClient(cid, body, user.fullName());
    return ApiResponse.success();
  }
}
