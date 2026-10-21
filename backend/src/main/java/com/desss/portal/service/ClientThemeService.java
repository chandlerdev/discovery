package com.desss.portal.service;

import com.desss.portal.entity.ClientTheme;
import com.desss.portal.repository.ClientThemeRepository;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class ClientThemeService {

  private final ClientThemeRepository repo;

  public ClientThemeService(ClientThemeRepository repo) {
    this.repo = repo;
  }

  /** @return the client's saved theme JSON, or empty if they use the site defaults */
  public Optional<String> findForClient(String clientId) {
    return repo.findById(clientId).map(ClientTheme::getTheme);
  }

  /** Saves (creates or replaces) one client's theme. */
  public void saveForClient(String clientId, String body, String updatedBy) {
    ClientTheme ct =
        repo.findById(clientId)
            .orElseGet(
                () -> {
                  ClientTheme fresh = new ClientTheme();
                  fresh.setClientId(clientId);
                  return fresh;
                });
    ct.setTheme(body);
    ct.setUpdatedAt(Instant.now());
    ct.setUpdatedBy(updatedBy == null ? "unknown" : updatedBy);
    repo.save(ct);
  }
}
