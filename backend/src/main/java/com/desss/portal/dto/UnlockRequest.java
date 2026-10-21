package com.desss.portal.dto;

/** Body of POST /api/clients/{id}/unlock — the client proves who they are. */
public record UnlockRequest(String company, String password) {}
