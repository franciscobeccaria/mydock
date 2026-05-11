import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";

function getKey() {
  if (!env.TOKEN_ENCRYPTION_SECRET) {
    return null;
  }

  return scryptSync(env.TOKEN_ENCRYPTION_SECRET, "mydock-token-salt", 32);
}

export function encryptSecret(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const key = getKey();

  if (!key) {
    return null;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const key = getKey();

  if (!key) {
    return null;
  }

  const [ivPart, authTagPart, encryptedPart] = value.split(":");

  if (!ivPart || !authTagPart || !encryptedPart) {
    return null;
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivPart, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTagPart, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
