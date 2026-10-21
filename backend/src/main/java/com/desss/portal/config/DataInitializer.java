package com.desss.portal.config;

import com.desss.portal.entity.AdminUser;
import com.desss.portal.entity.Client;
import com.desss.portal.entity.ProjectDoc;
import com.desss.portal.repository.AdminUserRepository;
import com.desss.portal.repository.ClientRepository;
import com.desss.portal.repository.ProjectDocRepository;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * First-run seed. The two seeds are independent — an existing client list must not
 * stop the admin user from being created.
 */
@Component
public class DataInitializer implements CommandLineRunner {

  private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

  private static final String SEED_CLIENT_ID = "freshbytes";
  private static final String SEED_USERNAME = "priya";

  private final ClientRepository clients;
  private final ProjectDocRepository docs;
  private final AdminUserRepository adminUsers;
  private final EncryptionService encryption;

  public DataInitializer(
      ClientRepository clients,
      ProjectDocRepository docs,
      AdminUserRepository adminUsers,
      EncryptionService encryption) {
    this.clients = clients;
    this.docs = docs;
    this.adminUsers = adminUsers;
    this.encryption = encryption;
  }

  /** Given to clients that pre-date the password column. Change it, or reset per client. */
  private static final String LEGACY_CLIENT_PASSWORD = "desss2026";

  @Override
  public void run(String... args) {
    seedClient();
    seedAdminUser();
    backfillClientPasswords();
    backfillAdminPasswords();
  }

  /**
   * Admin passwords are now stored in plain text so they can be revealed. Any that are
   * still a one-way BCrypt hash (from before this change) can't be recovered, so they are
   * reset to {@value #LEGACY_CLIENT_PASSWORD} and logged. Plaintext ones are left alone.
   */
  private void backfillAdminPasswords() {
    var reset = new java.util.ArrayList<String>();
    for (AdminUser u : adminUsers.findAll()) {
      String pw = u.getPassword();
      if (pw == null || isBcryptHash(pw)) {
        u.setPassword(LEGACY_CLIENT_PASSWORD);
        adminUsers.save(u);
        reset.add(u.getUsername());
      }
    }
    if (!reset.isEmpty()) {
      log.warn(
          "Reset {} admin password(s) to '{}': {} — they were hashed and cannot be "
              + "recovered. Change these.",
          reset.size(),
          LEGACY_CLIENT_PASSWORD,
          reset);
    }
  }

  /**
   * Migrates client passwords to plain text (the current scheme, so the team can reveal
   * them with the eye button). Runs every startup and handles three legacy formats:
   *
   * <ul>
   *   <li>AES ciphertext (from the encryption phase) — decrypted back to the real password,
   *       so nothing is lost.
   *   <li>A BCrypt hash (from the hashing phase) — one-way, so the original is gone; reset
   *       to {@value #LEGACY_CLIENT_PASSWORD}.
   *   <li>NULL — created before passwords existed; reset to {@value #LEGACY_CLIENT_PASSWORD}.
   * </ul>
   *
   * Already-plaintext passwords are left untouched.
   */
  private void backfillClientPasswords() {
    var changed = new java.util.ArrayList<Client>();
    var reset = new java.util.ArrayList<String>();

    for (Client c : clients.findAll()) {
      String pw = c.getPassword();

      if (pw != null && encryption.canDecrypt(pw)) {
        // AES ciphertext from the previous scheme — recover the real password.
        c.setPassword(encryption.decrypt(pw));
        changed.add(c);
      } else if (pw == null || isBcryptHash(pw)) {
        // NULL, or a one-way hash we cannot reverse — reset to the known default.
        c.setPassword(LEGACY_CLIENT_PASSWORD);
        changed.add(c);
        reset.add(c.getId());
      }
      // else: already plain text — leave it alone.
    }

    if (changed.isEmpty()) {
      return;
    }
    clients.saveAll(changed);

    if (!reset.isEmpty()) {
      log.warn(
          "Reset {} client password(s) to '{}': {} — they were unset or a one-way BCrypt "
              + "hash that cannot be recovered. Change these.",
          reset.size(),
          LEGACY_CLIENT_PASSWORD,
          reset);
    }
  }

  private static boolean isBcryptHash(String s) {
    return s.startsWith("$2a$") || s.startsWith("$2b$") || s.startsWith("$2y$");
  }

  /** Seeds the FreshBytes client so the portal is never empty. */
  private void seedClient() {
    if (clients.count() > 0) {
      return;
    }

    Client client = new Client();
    client.setId(SEED_CLIENT_ID);
    client.setCompany("FreshBytes");
    client.setContact("Trevor Morris");
    client.setCreatedBy("system");
    client.setCreatedAt(Instant.now());
    clients.save(client);

    ProjectDoc doc = new ProjectDoc();
    doc.setClientId(SEED_CLIENT_ID);
    doc.setDoc("{}");
    doc.setUpdatedAt(Instant.now());
    doc.setUpdatedBy("system");
    docs.save(doc);

    log.info("Seeded client '{}'", SEED_CLIENT_ID);
  }

  /** Seeds the first team member. The password is stored in plain text so it can be revealed. */
  private void seedAdminUser() {
    if (adminUsers.existsByUsername(SEED_USERNAME)) {
      return;
    }

    AdminUser user = new AdminUser();
    user.setUsername(SEED_USERNAME);
    user.setPassword("desss2026");
    user.setFullName("Priya S.");
    user.setEmail("priya@desss.com");
    user.setRole("ADMIN");
    user.setStatus("ACTIVE");
    user.setDeleted(false);
    adminUsers.save(user);

    log.info("Seeded admin user '{}' (role ADMIN)", SEED_USERNAME);
  }
}
