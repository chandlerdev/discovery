package com.desss.portal.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "clients")
public class Client {

  @Id
  @Column(length = 64)
  private String id;

  @Column(nullable = false)
  private String company;

  /**
   * The client's questionnaire password, stored in PLAIN TEXT so the team can reveal it
   * with the eye button and re-send it to the client.
   *
   * <p>Trade-off, accepted deliberately: anyone who can read this table reads every client
   * password. Team logins ({@code AdminUser}) are still BCrypt-hashed and are not affected.
   *
   * <p>Nullable only because the seeded/legacy clients were created before passwords
   * existed. {@code ClientService.create} requires one for every new client.
   */
  @Column(length = 255)
  private String password;

  private String contact;

  /** Optional client logo, held as a base64 data URI (e.g. "data:image/png;base64,..."). */
  @Lob
  @Column(columnDefinition = "LONGTEXT")
  private String logo;

  private String createdBy;
  private Instant createdAt;

  public String getId() { return id; }
  public void setId(String v) { id = v; }

  public String getCompany() { return company; }
  public void setCompany(String v) { company = v; }

  public String getPassword() { return password; }
  public void setPassword(String v) { password = v; }

  public String getContact() { return contact; }
  public void setContact(String v) { contact = v; }

  public String getLogo() { return logo; }
  public void setLogo(String v) { logo = v; }

  public String getCreatedBy() { return createdBy; }
  public void setCreatedBy(String v) { createdBy = v; }

  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant v) { createdAt = v; }
}
