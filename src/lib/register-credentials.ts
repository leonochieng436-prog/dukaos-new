import bcrypt from "bcryptjs";

export async function matchesRegisterCredential(
  suppliedCode: string,
  suppliedPassword: string,
  expectedCode: string,
  expectedHash: string,
): Promise<boolean> {
  if (!suppliedCode || !suppliedPassword) {
    return false;
  }

  if (suppliedCode.trim() !== expectedCode.trim()) {
    return false;
  }

  return bcrypt.compare(suppliedPassword, expectedHash);
}
