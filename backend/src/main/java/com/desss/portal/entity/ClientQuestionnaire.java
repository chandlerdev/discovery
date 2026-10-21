package com.desss.portal.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * A per-client questionnaire definition (sections/questions JSON), keyed by client id.
 * A client without a row here inherits the shared {@link QuestionnaireDef} template until
 * an admin publishes a version specifically for them.
 */
@Entity
@Table(name = "client_questionnaire")
public class ClientQuestionnaire {

  /** The owning client's id — same value used in /api/docs/{cid}. */
  @Id
  @Column(name = "client_id", length = 64)
  private String clientId;

  @Lob
  @Column(columnDefinition = "LONGTEXT", nullable = false)
  private String def;

  private Instant updatedAt;
  private String updatedBy;

  public String getClientId() { return clientId; }
  public void setClientId(String v) { clientId = v; }

  public String getDef() { return def; }
  public void setDef(String v) { def = v; }

  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant v) { updatedAt = v; }

  public String getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(String v) { updatedBy = v; }
}
