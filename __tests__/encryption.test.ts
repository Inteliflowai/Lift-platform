import { describe, it, expect, beforeAll } from "vitest";

// Set a test encryption key before importing
process.env.ENCRYPTION_KEY = "a".repeat(64); // 64 hex chars = 32 bytes

import { encrypt, decrypt, encryptConfig, decryptConfig } from "@/lib/crypto/encrypt";

describe("AES-256-GCM Encryption", () => {
  it("encrypts and decrypts a string", () => {
    const plaintext = "hello world";
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.split(":")).toHaveLength(3); // iv:ciphertext:tag
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const plaintext = "same input";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(decrypt(b));
  });

  it("fails on tampered ciphertext", () => {
    const encrypted = encrypt("secret");
    const parts = encrypted.split(":");
    parts[1] = "0000" + parts[1].slice(4); // tamper with ciphertext
    expect(() => decrypt(parts.join(":"))).toThrow();
  });

  it("encrypts and decrypts a config object", () => {
    const config = { api_key: "sk_test_123", school_id: "abc" };
    const encrypted = encryptConfig(config);
    expect(typeof encrypted).toBe("string");
    const decrypted = decryptConfig(encrypted);
    expect(decrypted).toEqual(config);
  });

  it("throws on invalid format", () => {
    expect(() => decrypt("not:valid")).toThrow("Invalid encrypted format");
  });
});
