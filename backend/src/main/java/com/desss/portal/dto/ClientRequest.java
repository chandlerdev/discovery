package com.desss.portal.dto;

/**
 * Body of POST /api/clients.
 *
 * @param company     required — also the basis for the generated client id
 * @param password    required — the client's questionnaire password, stored BCrypt-hashed
 * @param contact     optional contact person
 * @param by          name of the team member creating the record
 * @param initialDoc  the starting project document, as a JSON string
 * @param logo        optional client logo as a base64 data URI
 */
public record ClientRequest(
    String company, String password, String contact, String by, String initialDoc, String logo) {}
