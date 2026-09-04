"use client";

import { deleteOrganization, pauseOrganization, resumeOrganization } from "@/app/actions/admin";

export function OrganizationActions({ organizationId, organizationName, status }: { organizationId: string; organizationName: string; status: string }) {
  return <div className="flex flex-wrap gap-2">
    {status === "paused" ? <form action={resumeOrganization}><input type="hidden" name="organizationId" value={organizationId} /><button type="submit" className="rounded-md border border-success px-3 py-2 text-xs font-semibold text-success hover:bg-success-tint">Resume operations</button></form> : <form action={pauseOrganization}><input type="hidden" name="organizationId" value={organizationId} /><button type="submit" className="rounded-md border border-warning px-3 py-2 text-xs font-semibold text-warning hover:bg-warning-tint">Pause operations</button></form>}
    <form action={deleteOrganization} onSubmit={(event) => { if (!window.confirm(`Delete ${organizationName} permanently? This removes all business data and cannot be undone.`)) event.preventDefault(); }}><input type="hidden" name="organizationId" value={organizationId} /><button type="submit" className="rounded-md border border-danger px-3 py-2 text-xs font-semibold text-danger hover:bg-danger-tint">Delete permanently</button></form>
  </div>;
}