package com.desss.portal.config;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Two-way AES-256-GCM encryption for <em>client questionnaire passwords</em>, which the
 * team must be able to read back and re-send to a client.
 *
 * <p><strong>This is encryption, not hashing — it is reversible by design.</strong> Anyone
 * holding both the database and {@code portal.encryption-key} can recover every client
 * password. That is the accepted trade-off for the reveal ("eye") button. Keep the key out
 * of the database, and out of version control, and rotate it if it leaks.
 *
 * <p>Team logins ({@code admin_user.password}) are deliberately NOT stored this way — they
 * stay BCrypt-hashed and are never recoverable.
 */
@Service
public class EncryptionService {

  private static final String ALGORITHM = "AES";
  private static final String TRANSFORMATION = "AES/GCM/NoPadding";
  private static final int GCM_TAG_BITS = 128;
  private static final int IV_BYTES = 12; // 96-bit IV is the GCM standard

  private static final SecureRandom RANDOM = new SecureRandom();

  private final SecretKeySpec key;

  public EncryptionService(@Value("${portal.encryption-key}") String base64Key) {
    byte[] raw = Base64.getDecoder().decode(base64Key);
    if (raw.length != 16 && raw.length != 24 && raw.length != 32) {
      throw new IllegalStateException(
          "portal.encryption-key must be a base64 AES key of 16, 24, or 32 bytes; got "
              + raw.length);
    }
    this.key = new SecretKeySpec(raw, ALGORITHM);
  }

  /** @return base64( iv || ciphertext+tag ) — a fresh random IV every call */
  public String encrypt(String plaintext) {
    try {
      byte[] iv = new byte[IV_BYTES];
      RANDOM.nextBytes(iv);

      Cipher cipher = Cipher.getInstance(TRANSFORMATION);
      cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));
      byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

      // Prepend the IV so decrypt() is self-contained; the IV is not a secret.
      byte[] out = new byte[iv.length + ciphertext.length];
      System.arraycopy(iv, 0, out, 0, iv.length);
      System.arraycopy(ciphertext, 0, out, iv.length, ciphertext.length);

      return Base64.getEncoder().encodeToString(out);
    } catch (Exception e) {
      throw new IllegalStateException("Could not encrypt value", e);
    }
  }

  /** Inverse of {@link #encrypt}. Throws if the value was not produced by this key. */
  public String decrypt(String encoded) {
    try {
      byte[] all = Base64.getDecoder().decode(encoded);

      byte[] iv = new byte[IV_BYTES];
      System.arraycopy(all, 0, iv, 0, IV_BYTES);

      byte[] ciphertext = new byte[all.length - IV_BYTES];
      System.arraycopy(all, IV_BYTES, ciphertext, 0, ciphertext.length);

      Cipher cipher = Cipher.getInstance(TRANSFORMATION);
      cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));

      return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
    } catch (Exception e) {
      throw new IllegalStateException("Could not decrypt value", e);
    }
  }

  /** True for values this service produced — used to spot legacy BCrypt hashes. */
  public boolean canDecrypt(String value) {
    if (value == null || value.startsWith("$2a$") || value.startsWith("$2b$")) {
      return false; // a BCrypt hash — one-way, not ours
    }
    try {
      decrypt(value);
      return true;
    } catch (Exception e) {
      return false;
    }
  }
}
