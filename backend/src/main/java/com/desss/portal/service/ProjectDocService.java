package com.desss.portal.service;

import com.desss.portal.entity.ProjectDoc;
import com.desss.portal.repository.ClientRepository;
import com.desss.portal.repository.ProjectDocRepository;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class ProjectDocService {

  /** Anything larger than this is a bug or an attack, not a discovery document. */
  public static final int MAX_DOC_BYTES = 2_000_000;

  private final ProjectDocRepository docs;
  private final ClientRepository clients;

  public ProjectDocService(ProjectDocRepository docs, ClientRepository clients) {
    this.docs = docs;
    this.clients = clients;
  }

  /** @return the raw JSON document, or empty if this client has none */
  public Optional<String> find(String clientId) {
    return docs.findById(clientId).map(ProjectDoc::getDoc);
  }

  public boolean clientExists(String clientId) {
    return clients.existsById(clientId);
  }

  public boolean isTooLarge(String body) {
    return body == null || body.length() > MAX_DOC_BYTES;
  }

  /**
   * Saves the full JSON document. The caller must have checked
   * {@link #clientExists(String)} — requiring an existing client id is what stops
   * random ids from creating records.
   */
  public void save(String clientId, String body, String updatedBy) {
    ProjectDoc doc =
        docs.findById(clientId)
            .orElseGet(
                () -> {
                  ProjectDoc fresh = new ProjectDoc();
                  fresh.setClientId(clientId);
                  return fresh;
                });
    doc.setDoc(body);
    doc.setUpdatedAt(Instant.now());
    doc.setUpdatedBy(updatedBy == null ? "unknown" : updatedBy);
    docs.save(doc);
  }
}
