package com.desss.portal.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * A per-client visual theme (colours/fonts/radius as a small JSON map of CSS-variable
 * overrides), keyed by client id. A client without a row here uses the site defaults.
 */
@Entity
@Table(name = "client_theme")
public class ClientTheme {

  /** The owning client's id — same value used in /api/docs/{cid}. */
  @Id
  @Column(name = "client_id", length = 64)
  private String clientId;

  @Lob
  @Column(columnDefinition = "LONGTEXT", nullable = false)
  private String theme;

  private Instant updatedAt;
  private String updatedBy;

  public String getClientId() { return clientId; }
  public void setClientId(String v) { clientId = v; }

  public String getTheme() { return theme; }
  public void setTheme(String v) { theme = v; }

  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant v) { updatedAt = v; }

  public String getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(String v) { updatedBy = v; }
}
