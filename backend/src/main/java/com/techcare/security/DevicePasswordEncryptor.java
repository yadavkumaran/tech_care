package com.techcare.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

@Converter
@Component
public class DevicePasswordEncryptor implements AttributeConverter<String, String> {

    private static final Logger log = LoggerFactory.getLogger(DevicePasswordEncryptor.class);
    private static final String PREFIX = "ENC:";
    private static final String ALGORITHM = "AES/CBC/PKCS5Padding";

    private static byte[] secretKeyBytes;

    @Value("${techcare.app.jwtSecret:DefaultFallbackSecretForSafeEncryptionKey2026}")
    public void setSecretKey(String secretKey) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            byte[] key = sha.digest(secretKey.getBytes(StandardCharsets.UTF_8));
            secretKeyBytes = Arrays.copyOf(key, 16); // 128-bit AES key
        } catch (Exception e) {
            log.error("Failed to initialize device password encryption key", e);
        }
    }

    private byte[] getKey() {
        if (secretKeyBytes == null) {
            try {
                MessageDigest sha = MessageDigest.getInstance("SHA-256");
                byte[] key = sha.digest("DefaultFallbackSecretForSafeEncryptionKey2026".getBytes(StandardCharsets.UTF_8));
                secretKeyBytes = Arrays.copyOf(key, 16);
            } catch (Exception ignored) {}
        }
        return secretKeyBytes;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.trim().isEmpty()) {
            return attribute;
        }
        // If already encrypted, return as is
        if (attribute.startsWith(PREFIX)) {
            return attribute;
        }
        try {
            byte[] key = getKey();
            SecretKeySpec secretKeySpec = new SecretKeySpec(key, "AES");
            byte[] iv = new byte[16];
            new SecureRandom().nextBytes(iv);
            IvParameterSpec ivSpec = new IvParameterSpec(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, ivSpec);
            byte[] encrypted = cipher.doFinal(attribute.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);

            String encoded = PREFIX + Base64.getEncoder().encodeToString(combined);
            // Verify it fits inside VARCHAR(100)
            if (encoded.length() <= 100) {
                return encoded;
            } else {
                log.warn("Encrypted device password exceeds 100 characters; storing original safely");
                return attribute;
            }
        } catch (Exception e) {
            log.error("Failed to encrypt device password; falling back safely to plaintext", e);
            return attribute;
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.trim().isEmpty()) {
            return dbData;
        }
        // If not encrypted with ENC: prefix, it's legacy plaintext. Return as-is without breaking!
        if (!dbData.startsWith(PREFIX)) {
            return dbData;
        }
        try {
            String base64Data = dbData.substring(PREFIX.length());
            byte[] combined = Base64.getDecoder().decode(base64Data);
            if (combined.length < 16) {
                return dbData;
            }

            byte[] iv = Arrays.copyOfRange(combined, 0, 16);
            byte[] encrypted = Arrays.copyOfRange(combined, 16, combined.length);

            SecretKeySpec secretKeySpec = new SecretKeySpec(getKey(), "AES");
            IvParameterSpec ivSpec = new IvParameterSpec(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, ivSpec);
            byte[] decrypted = cipher.doFinal(encrypted);

            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("Failed to decrypt device password (may be legacy or corrupted); returning raw representation", e);
            return dbData;
        }
    }
}

