package com.desss.portal.service;

import com.desss.portal.entity.ClientQuestionnaire;
import com.desss.portal.entity.QuestionnaireDef;
import com.desss.portal.repository.ClientQuestionnaireRepository;
import com.desss.portal.repository.QuestionnaireDefRepository;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class QuestionnaireService {

  private final QuestionnaireDefRepository repo;
  private final ClientQuestionnaireRepository clientRepo;

  public QuestionnaireService(
      QuestionnaireDefRepository repo, ClientQuestionnaireRepository clientRepo) {
    this.repo = repo;
    this.clientRepo = clientRepo;
  }

  /** @return the shared questionnaire template JSON, or empty if nothing is published yet */
  public Optional<String> findPublished() {
    return repo.findById(QuestionnaireDef.SINGLETON_ID).map(QuestionnaireDef::getDef);
  }

  /**
   * The questionnaire a specific client should see: their own published version if they have
   * one, otherwise the shared template. Empty only when neither exists (the frontend then
   * falls back to its built-in default).
   */
  public Optional<String> findForClient(String clientId) {
    return clientRepo
        .findById(clientId)
        .map(ClientQuestionnaire::getDef)
        .or(this::findPublished);
  }

  /** Publishes the shared template — the starting point every new client inherits. */
  public void publish(String body, String updatedBy) {
    QuestionnaireDef def =
        repo.findById(QuestionnaireDef.SINGLETON_ID)
            .orElseGet(
                () -> {
                  QuestionnaireDef fresh = new QuestionnaireDef();
                  fresh.setId(QuestionnaireDef.SINGLETON_ID);
                  return fresh;
                });
    def.setDef(body);
    def.setUpdatedAt(Instant.now());
    def.setUpdatedBy(updatedBy == null ? "unknown" : updatedBy);
    repo.save(def);
  }

  /** Publishes a questionnaire for one client only — everyone else is unaffected. */
  public void publishForClient(String clientId, String body, String updatedBy) {
    ClientQuestionnaire cq =
        clientRepo
            .findById(clientId)
            .orElseGet(
                () -> {
                  ClientQuestionnaire fresh = new ClientQuestionnaire();
                  fresh.setClientId(clientId);
                  return fresh;
                });
    cq.setDef(body);
    cq.setUpdatedAt(Instant.now());
    cq.setUpdatedBy(updatedBy == null ? "unknown" : updatedBy);
    clientRepo.save(cq);
  }
}
