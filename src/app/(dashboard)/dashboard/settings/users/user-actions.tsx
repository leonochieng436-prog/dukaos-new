"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deactivateUser, updateUser } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Option = { id: string; name: string };
type RegisterOption = Option & { branchName: string };
type Member = { id: string; name: string; email: string; roleId: string; branchIds: string[]; registerIds: string[] };

export function UserActions({ member, roles, branches, registers }: { member: Member; roles: Option[]; branches: Option[]; registers: RegisterOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  function save(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await updateUser(member.id, { name: String(formData.get("name") || ""), email: String(formData.get("email") || ""), roleId: String(formData.get("roleId") || member.roleId), branchIds: formData.getAll("branchIds").map(String), registerIds: formData.getAll("registerIds").map(String) });
      if (!result.ok) return setError(result.error);
      setEditing(false);
      router.refresh();
    });
  }
  function deactivate() {
    if (!window.confirm(`Deactivate ${member.name}? Historical records will be preserved.`)) return;
    setError("");
    startTransition(async () => {
      const result = await deactivateUser(member.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }
  return <div className="flex flex-wrap items-center justify-end gap-2">{editing ? <form action={save} className="flex flex-wrap items-center gap-2"><Input name="name" defaultValue={member.name} className="h-8 w-28" required /><Input name="email" type="email" defaultValue={member.email} className="h-8 w-44" required /><select name="roleId" defaultValue={member.roleId} className="h-8 rounded border border-border-strong bg-surface px-2 text-xs">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>{branches.map((branch) => <label key={branch.id} className="flex items-center gap-1 text-[11px]"><input type="checkbox" name="branchIds" value={branch.id} defaultChecked={member.branchIds.includes(branch.id)} />{branch.name}</label>)}{registers.map((register) => <label key={register.id} className="flex items-center gap-1 text-[11px]"><input type="checkbox" name="registerIds" value={register.id} defaultChecked={member.registerIds.includes(register.id)} />{register.name} ({register.branchName})</label>)}<Button type="submit" size="sm" disabled={pending}>Save</Button><Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button></form> : <><Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)} disabled={pending}>Edit</Button><Button type="button" variant="secondary" size="sm" onClick={deactivate} disabled={pending}>{pending ? "Deactivating..." : "Deactivate"}</Button></>}{error && <span className="text-[12px] text-danger">{error}</span>}</div>;
}
