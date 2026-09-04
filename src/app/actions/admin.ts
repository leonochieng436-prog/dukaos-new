"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { rawPrisma } from "@/server/db/client";
import { verifyPassword } from "@/server/auth/password";
import { createAdminSession, destroyAdminSession, requireAdmin } from "@/server/auth/admin-session";

export async function submitPaymentReference(formData: FormData): Promise<void> {
  const organizationId = String(formData.get("organizationId") || "");
  const paymentReference = String(formData.get("paymentReference") || "").trim();
  if (!organizationId || !paymentReference) return;
  await rawPrisma.subscription.update({
    where: { organizationId },
    data: { paymentReference, paymentSubmittedAt: new Date() },
  });
  revalidatePath("/account-pending");
}

export async function adminLogin(raw: { email: string; password: string }) {
  const admin = await rawPrisma.platformAdmin.findUnique({ where: { email: raw.email.toLowerCase().trim() } });
  if (!admin || !admin.isActive || !(await verifyPassword(raw.password, admin.passwordHash))) {
    return { ok: false, error: "Invalid admin email or password." };
  }
  const requestHeaders = await headers();
  await createAdminSession(admin.id, requestHeaders.get("x-forwarded-for"), requestHeaders.get("user-agent"));
  return { ok: true, data: { redirectTo: "/admin" } };
}

export async function adminLogout() {
  await destroyAdminSession();
  redirect("/login");
}

export async function approveSubscription(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const subscriptionId = String(formData.get("subscriptionId") || "");
  if (!subscriptionId) return;
  await rawPrisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "active",
      approvedAt: new Date(),
      approvedByAdminId: admin.id,
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    },
  });
  revalidatePath("/admin");
}

export async function pauseOrganization(formData: FormData): Promise<void> {
  await requireAdmin();
  const organizationId = String(formData.get("organizationId") || "");
  if (!organizationId) return;
  await rawPrisma.subscription.update({
    where: { organizationId },
    data: { status: "paused" },
  });
  revalidatePath("/admin");
}

export async function resumeOrganization(formData: FormData): Promise<void> {
  await requireAdmin();
  const organizationId = String(formData.get("organizationId") || "");
  if (!organizationId) return;
  await rawPrisma.subscription.update({
    where: { organizationId },
    data: { status: "active" },
  });
  revalidatePath("/admin");
}

export async function deleteOrganization(formData: FormData): Promise<void> {
  await requireAdmin();
  const organizationId = String(formData.get("organizationId") || "");
  if (!organizationId) return;
  await rawPrisma.$transaction(async (tx) => {
    const memberships = await tx.userOrganization.findMany({
      where: { organizationId },
      select: { userId: true },
    });
    await tx.organization.delete({ where: { id: organizationId } });
    await tx.user.deleteMany({
      where: { id: { in: memberships.map((membership) => membership.userId) }, organizations: { none: {} } },
    });
  });
  revalidatePath("/admin");
}