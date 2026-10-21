package com.desss.portal.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * One JSON document per client: answers, review, workflow
 * (estimate/proposal/approval/handover/signoff), activity.
 */
@Entity
@Table(name = "project_docs")
public class ProjectDoc {

  @Id
  @Column(name = "client_id", length = 64)
  private String clientId;

  @Lob
  @Column(columnDefinition = "LONGTEXT", nullable = false)
  private String doc;

  private Instant updatedAt;
  private String updatedBy;

  public String getClientId() { return clientId; }
  public void setClientId(String v) { clientId = v; }

  public String getDoc() { return doc; }
  public void setDoc(String v) { doc = v; }

  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant v) { updatedAt = v; }

  public String getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(String v) { updatedBy = v; }
}
