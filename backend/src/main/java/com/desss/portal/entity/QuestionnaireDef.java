package com.desss.portal.entity;

import jakarta.persistence.*;
import java.time.Instant;

/** Single-row table holding the published questionnaire definition (sections/questions JSON). */
@Entity
@Table(name = "questionnaire_def")
public class QuestionnaireDef {

  /** Always {@link #SINGLETON_ID}. */
  @Id
  private Integer id;

  @Lob
  @Column(columnDefinition = "LONGTEXT", nullable = false)
  private String def;

  private Instant updatedAt;
  private String updatedBy;

  public static final int SINGLETON_ID = 1;

  public Integer getId() { return id; }
  public void setId(Integer v) { id = v; }

  public String getDef() { return def; }
  public void setDef(String v) { def = v; }

  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant v) { updatedAt = v; }

  public String getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(String v) { updatedBy = v; }
}
