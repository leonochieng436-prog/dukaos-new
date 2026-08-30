"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, useTransition } from "react";
import { upsertRegisterCredential } from "@/app/actions/branches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterCredentialForm({
  registerId,
  currentCode,
  enabled,
}: {
  registerId: string;
  currentCode: string;
  enabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  function submit(formData: FormData) {
    setError(null);
    setSuccess(null);

    const payload = {
      registerId,
      terminalCode: String(formData.get("terminalCode") || currentCode || ""),
      terminalPassword: String(formData.get("terminalPassword") || ""),
      enabled:
        formData.get("enabled") === "on" ||
        Boolean(String(formData.get("terminalCode") || currentCode || "").trim()) ||
        Boolean(String(formData.get("terminalPassword") || "").trim()),
    };

    startTransition(async () => {
      const result = await upsertRegisterCredential(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Saved");
    });
  }

  return (
    <form action={submit} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-[11px] text-muted-foreground">
          <span>Terminal code</span>
          <Input name="terminalCode" defaultValue={currentCode} placeholder="POS-01" className="h-8 text-xs" />
        </label>
        <label className="space-y-1 text-[11px] text-muted-foreground">
          <span>Password</span>
          <div className="relative">
            <Input
              name="terminalPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 8 chars"
              className="h-8 pr-8 text-xs"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </label>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <input type="checkbox" name="enabled" defaultChecked={enabled || Boolean(currentCode)} />
        Require terminal login for this register
      </label>
      {error && <p className="text-[11px] text-danger">{error}</p>}
      {success && <p className="text-[11px] text-success">{success}</p>}
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Saving..." : "Save credentials"}
      </Button>
    </form>
  );
}
