package com.desss.portal.dto;

import com.desss.portal.entity.Client;
import java.time.Instant;

/** Full client record — returned to the passcode-guarded admin portal. */
public record ClientResponse(
    String id,
    String company,
    String contact,
    String createdBy,
    Instant createdAt,
    String logo) {

  public static ClientResponse from(Client c) {
    return new ClientResponse(
        c.getId(), c.getCompany(), c.getContact(), c.getCreatedBy(), c.getCreatedAt(), c.getLogo());
  }
}
