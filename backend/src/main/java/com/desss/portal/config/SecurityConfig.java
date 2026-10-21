package com.desss.portal.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Password hashing only. This is not a Spring Security filter chain — the portal
 * authenticates in {@link com.desss.portal.service.AuthService} and guards endpoints
 * with {@link com.desss.portal.security.AuthGuard}.
 */
@Configuration
public class SecurityConfig {

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}
