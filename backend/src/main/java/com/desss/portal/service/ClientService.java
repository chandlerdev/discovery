package com.desss.portal.service;

import com.desss.portal.dto.ClientRequest;
import com.desss.portal.dto.UnlockRequest;
import com.desss.portal.dto.UnlockResponse;
import com.desss.portal.entity.Client;
import com.desss.portal.entity.ProjectDoc;
import com.desss.portal.repository.ClientRepository;
import com.desss.portal.repository.ProjectDocRepository;
import com.desss.portal.security.ClientSessionService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClientService {

  /** Longest slug we keep before appending the uniqueness suffix. */
  private static final int MAX_SLUG_LENGTH = 24;

  private static final int MIN_PASSWORD_LENGTH = 6;

  private static final String EMPTY_DOC = "{}";

  /**
   * One message for every failure — wrong company, wrong password, or a client id that
   * does not exist. Anything more specific would let someone probe for valid links.
   */
  private static final String UNLOCK_FAILED = "Incorrect company name or password";

  private final ClientRepository clients;
  private final ProjectDocRepository docs;
  private final ClientSessionService clientSessions;

  public ClientService(
      ClientRepository clients,
      ProjectDocRepository docs,
      ClientSessionService clientSessions) {
    this.clients = clients;
    this.docs = docs;
    this.clientSessions = clientSessions;
  }

  /**
   * Returns a client's password for the team portal's reveal ("eye") button.
   *
   * <p>Passwords are stored in plain text, so this is a straight read — the value in the
   * database <em>is</em> the password. Callers MUST have passed the AuthGuard first.
   *
   * @return the password, or empty if the client has none
   */
  public Optional<String> revealPassword(String clientId) {
    return clients.findById(clientId).map(Client::getPassword).filter(pw -> !pw.isBlank());
  }

  /**
   * Verifies a client's company name + password and, on success, issues a session token
   * scoped to that client id.
   */
  public UnlockResponse unlock(String clientId, UnlockRequest req) {
    if (req == null || isBlank(req.company()) || isBlank(req.password())) {
      return UnlockResponse.failure(UNLOCK_FAILED);
    }

    Optional<Client> found = clients.findById(clientId);
    if (found.isEmpty() || found.get().getPassword() == null) {
      return UnlockResponse.failure(UNLOCK_FAILED);
    }

    Client client = found.get();

    // Company name is a credential here, but it's a name — match it forgivingly.
    boolean companyMatches = client.getCompany().trim().equalsIgnoreCase(req.company().trim());
    boolean passwordMatches = constantTimeEquals(client.getPassword(), req.password());

    if (!companyMatches || !passwordMatches) {
      return UnlockResponse.failure(UNLOCK_FAILED);
    }

    return UnlockResponse.success(clientSessions.issue(clientId), client.getCompany());
  }

  /** Compares without leaking how many characters matched via timing. */
  private static boolean constantTimeEquals(String a, String b) {
    return java.security.MessageDigest.isEqual(
        a.getBytes(java.nio.charset.StandardCharsets.UTF_8),
        b.getBytes(java.nio.charset.StandardCharsets.UTF_8));
  }

  private static boolean isBlank(String s) {
    return s == null || s.isBlank();
  }

  public List<Client> findAll() {
    return clients.findAll();
  }

  public Optional<Client> findById(String id) {
    return clients.findById(id);
  }

  public boolean exists(String id) {
    return clients.existsById(id);
  }

  /** Creates the client and its empty project document in one shot. */
  @Transactional
  public Client create(ClientRequest req) {
    String company = req.company() == null ? "" : req.company().trim();
    if (company.isEmpty()) {
      throw new IllegalArgumentException("Company name is required");
    }

    String password = req.password() == null ? "" : req.password();
    if (password.isBlank()) {
      throw new IllegalArgumentException("Password is required");
    }
    if (password.length() < MIN_PASSWORD_LENGTH) {
      throw new IllegalArgumentException(
          "Password must be at least " + MIN_PASSWORD_LENGTH + " characters");
    }

    Client client = new Client();
    client.setId(generateId(company));
    client.setCompany(company);
    client.setPassword(password); // stored in plain text so the team can reveal it
    client.setContact(orEmpty(req.contact()));
    client.setLogo(req.logo() == null || req.logo().isBlank() ? null : req.logo());
    client.setCreatedBy(orEmpty(req.by()));
    client.setCreatedAt(Instant.now());
    clients.save(client);

    ProjectDoc doc = new ProjectDoc();
    doc.setClientId(client.getId());
    doc.setDoc(req.initialDoc() == null ? EMPTY_DOC : req.initialDoc());
    doc.setUpdatedAt(Instant.now());
    doc.setUpdatedBy("system");
    docs.save(doc);

    return client;
  }

  /** Removes the client from the list. The project_docs row is kept as an archive. */
  public void delete(String id) {
    clients.deleteById(id);
  }

  /** e.g. "Fresh Byte Software" -> "fresh-byte-software-a1b2" */
  private String generateId(String company) {
    String slug =
        company
            .toLowerCase()
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-+|-+$", "");
    if (slug.length() > MAX_SLUG_LENGTH) {
      slug = slug.substring(0, MAX_SLUG_LENGTH);
    }
    return slug + "-" + UUID.randomUUID().toString().substring(0, 4);
  }

  private static String orEmpty(String v) {
    return v == null ? "" : v;
  }
}
