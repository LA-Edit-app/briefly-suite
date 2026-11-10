import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordRules } from "@/components/auth/PasswordRules";
import { isPasswordValid } from "@/lib/password";
import { toast } from "sonner";

interface Props {
  /** "invite": first password after accepting an invite. "reset": forgot-password link. */
  mode: "invite" | "reset";
  email: string | undefined;
  /** Saves the password and signs out. Resolves to an error message, or null. */
  onSave: (password: string) => Promise<string | null>;
}

export default function SetPassword({ mode: initialMode, email, onSave }: Props) {
  // Fixed on mount: the flag behind it is cleared while saving.
  const [mode] = useState(initialMode);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const valid = isPasswordValid(password);
  const matches = password === confirm;
  const canSubmit = valid && matches && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    const error = await onSave(password);
    if (error) {
      setSaving(false);
      toast.error(error);
      return;
    }
    toast.success(
      mode === "invite" ? "Password created. Please sign in." : "Password updated. Please sign in.",
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              {mode === "invite" ? "Create your password" : "Choose a new password"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {mode === "invite"
                ? "Welcome to Briefly Suite. Set a password so you can sign in next time."
                : "Enter a new password for your account."}
            </p>
            {email && <p className="text-sm font-medium text-foreground mt-3">{email}</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Password</Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={saving}
                autoFocus
              />
              <PasswordRules password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={saving}
              />
              {confirm && !matches && <p className="text-sm text-destructive">Passwords do not match</p>}
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {saving ? "Saving..." : mode === "invite" ? "Create password" : "Update password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
