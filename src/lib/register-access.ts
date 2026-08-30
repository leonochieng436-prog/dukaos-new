export type RegisterAccessContext = {
  organizationId: string;
  branchId: string;
  registerId: string;
  userId?: string;
};

export type RegisterSessionLike = {
  organizationId: string;
  branchId: string;
  registerId: string;
  userId?: string;
  status?: string;
};

export function ensureRegisterBelongsToOrg(
  expected: RegisterAccessContext,
  actual: Pick<RegisterAccessContext, "organizationId" | "branchId" | "registerId">,
) {
  if (expected.organizationId !== actual.organizationId) {
    throw new Error("Register does not belong to this organization");
  }
  if (expected.branchId !== actual.branchId) {
    throw new Error("Register does not belong to this branch");
  }
  if (expected.registerId !== actual.registerId) {
    throw new Error("Register mismatch");
  }
}

export function registerSessionMatchesUser(
  expected: Pick<RegisterAccessContext, "organizationId" | "branchId" | "registerId" | "userId">,
  session: RegisterSessionLike,
) {
  if (!expected.userId || !session.userId) return false;
  return (
    expected.organizationId === session.organizationId &&
    expected.branchId === session.branchId &&
    expected.registerId === session.registerId &&
    expected.userId === session.userId &&
    session.status === "OPEN"
  );
}
