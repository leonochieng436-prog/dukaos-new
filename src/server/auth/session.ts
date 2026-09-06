import "server-only";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { rawPrisma } from "@/server/db/client";

const SESSION_COOKIE = "pos_session";
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])
  );
  return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) - date.getTime();
}

function getNextMidnight(timeZone: string, referenceDate = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referenceDate);
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])
  );
  const nextDayUtc = Date.UTC(values.year, values.month - 1, values.day + 1);
  const firstEstimate = new Date(nextDayUtc);
  const firstOffset = getTimeZoneOffsetMs(firstEstimate, timeZone);
  const adjusted = new Date(nextDayUtc - firstOffset);
  return new Date(nextDayUtc - getTimeZoneOffsetMs(adjusted, timeZone));
}

/**
 * Sessions are opaque random tokens stored (hashed) in the DB, not signed
 * JWTs. This trades a DB read per request for the ability to revoke a
 * session instantly (logout, password change, "sign out other devices")
 * without needing a token blocklist. For a POS handling money and
 * inventory, revocability matters more than avoiding one indexed lookup.
 */
export async function createSession(params: {
  userId: string;
  organizationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  let expiresAt = getNextMidnight("UTC");

  if (params.organizationId) {
    const organization = await rawPrisma.organization.findUnique({
      where: { id: params.organizationId },
      select: { timezone: true },
    });
    if (organization?.timezone) {
      try {
        expiresAt = getNextMidnight(organization.timezone);
      } catch {
        // Keep the UTC cutoff if an organization has an invalid timezone.
      }
    }
  }

  await rawPrisma.session.create({
    data: {
      userId: params.userId,
      organizationId: params.organizationId ?? null,
      tokenHash,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    ...SESSION_COOKIE_OPTIONS,
    expires: expiresAt,
  });

  return token;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await rawPrisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || !session.user.isActive) {
    return null;
  }

  const organization = session.organizationId
    ? await rawPrisma.organization.findUnique({
        where: { id: session.organizationId },
        select: { timezone: true },
      })
    : null;
  const dailyExpiry = getNextMidnight(organization?.timezone ?? "UTC", session.createdAt);
  if (session.expiresAt < new Date() || dailyExpiry < new Date()) return null;

  return session;
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await rawPrisma.session.deleteMany({ where: { tokenHash } });
  }

  // Use an immediate expiry rather than delete() so the cookie is explicitly
  // removed on the same path/domain the browser will send it back on.
  cookieStore.set(SESSION_COOKIE, "", {
    ...SESSION_COOKIE_OPTIONS,
    expires: new Date(0),
    maxAge: 0,
  });
}

/** Switch which organization a session is "acting as" (for multi-org users). */
export async function setSessionOrganization(organizationId: string) {
  const session = await getCurrentSession();
  if (!session) throw new Error("Session not found");

  const membership = await rawPrisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId,
      },
    },
    select: { isActive: true },
  });
  if (!membership?.isActive) {
    throw new Error("User does not have access to this organization");
  }

  await rawPrisma.session.update({
    where: { id: session.id },
    data: { organizationId },
  });
}
