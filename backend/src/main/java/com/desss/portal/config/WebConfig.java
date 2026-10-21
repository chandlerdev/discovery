package com.desss.portal.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS for the two Next.js apps. {@code portal.cors-origins} is a comma-separated
 * list — by default the public site (:3000) and the team portal (:3001).
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

  @Value("${portal.cors-origins}")
  private String origins;

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry
        .addMapping("/api/**")
        .allowedOrigins(origins.split(","))
        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
        .allowedHeaders("*");
  }
}
