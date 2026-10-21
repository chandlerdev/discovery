package com.desss.portal.repository;

import com.desss.portal.entity.AdminUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {

  Optional<AdminUser> findByUsername(String username);

  /** The lookup real login would use: an active, non-deleted account. */
  Optional<AdminUser> findByUsernameAndDeletedFalseAndStatus(String username, String status);

  boolean existsByUsername(String username);

  boolean existsByEmail(String email);

  /** Duplicate checks on update — excludes the row being edited. */
  boolean existsByUsernameAndIdNot(String username, Long id);

  boolean existsByEmailAndIdNot(String email, Long id);
}
