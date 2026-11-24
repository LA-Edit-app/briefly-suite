import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAdminCreateUser, useAllAgencies } from "@/hooks/usePlatformAdmin";
import { ROLE_OPTIONS, type AgencyRole } from "@/lib/roles";
import { errorMessage } from "@/lib/errors";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opened from an agency: that agency is preselected and can't be changed. */
  agencyId?: string;
}

const EMPTY = { email: "", firstName: "", lastName: "", agencyId: "", role: "" as AgencyRole | "" };

/**
 * Platform Admin: create a user. Every user needs an agency and a role (#52).
 * The first person added to an agency defaults to Admin.
 */
export function CreateUserDialog({ open, onOpenChange, agencyId }: Props) {
  const { data: agencies = [] } = useAllAgencies();
  const createUser = useAdminCreateUser();
  const [form, setForm] = useState(EMPTY);

  const selectedAgency = agencies.find((a) => a.id === form.agencyId);
  const agencyIsEmpty = selectedAgency ? selectedAgency.member_count === 0 : false;

  useEffect(() => {
    if (open) setForm({ ...EMPTY, agencyId: agencyId ?? "" });
  }, [open, agencyId]);

  // First person in an agency becomes its Admin unless chosen otherwise.
  useEffect(() => {
    if (agencyIsEmpty) setForm((f) => (f.role ? f : { ...f, role: "admin" }));
  }, [agencyIsEmpty, form.agencyId]);

  const canSubmit = form.email.trim() && form.agencyId && form.role && !createUser.isPending;

  const handleSubmit = async () => {
    if (!form.email.trim()) return toast.error("Enter an email address");
    if (!form.agencyId) return toast.error("Choose an agency");
    if (!form.role) return toast.error("Choose a role");
    try {
      const result = await createUser.mutateAsync({
        agencyId: form.agencyId,
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role,
      });
      onOpenChange(false);
      toast.success(
        result.status === "invited"
          ? `Invitation sent to ${form.email.trim()}. They'll set their password from the email.`
          : `${form.email.trim()} added to ${selectedAgency?.name ?? "the agency"}.`,
      );
    } catch (e) {
      toast.error(errorMessage(e) || "Failed to create user");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{agencyId && selectedAgency ? `Add User to ${selectedAgency.name}` : "Create User"}</DialogTitle>
          <DialogDescription>They'll get an email to set their password. Each email can belong to one agency only.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="cu-email" className="text-xs">Email *</Label>
            <Input
              id="cu-email"
              type="email"
              placeholder="user@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="cu-first" className="text-xs">First name</Label>
              <Input id="cu-first" placeholder="Jane" value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="cu-last" className="text-xs">Last name</Label>
              <Input id="cu-last" placeholder="Doe" value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>
          {!agencyId && (
            <div>
              <Label className="text-xs">Agency *</Label>
              <Select value={form.agencyId} onValueChange={(v) => setForm((f) => ({ ...f, agencyId: v, role: "" }))}>
                <SelectTrigger aria-label="Agency">
                  <SelectValue placeholder="Choose an agency" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Role *</Label>
            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as AgencyRole }))}>
              <SelectTrigger aria-label="Role">
                <SelectValue placeholder="Choose a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {agencyIsEmpty && (
              <p className="text-[11px] text-muted-foreground mt-1">This is the agency's first user, so they'll be its Admin by default.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={!canSubmit}>
            {createUser.isPending ? "Sending…" : agencyId ? "Add User" : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
