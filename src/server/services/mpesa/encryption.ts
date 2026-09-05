import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function key() {
  const value = process.env.MPESA_ENCRYPTION_KEY;
  if (!value) throw new Error("MPESA_ENCRYPTION_KEY is not configured.");
  const encoded = Buffer.from(value, "base64");
  if (encoded.length !== 32) throw new Error("MPESA_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return encoded;
}

export function encryptMpesaSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptMpesaSecret(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Invalid encrypted M-Pesa secret.");
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}
