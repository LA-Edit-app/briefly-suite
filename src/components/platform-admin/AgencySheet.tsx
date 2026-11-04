import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, Users, Pencil, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AgencyRow, AgencyMemberRow } from "@/hooks/usePlatformAdmin";
import {
  useAgencyMembers,
  useUpdateAgency,
  useAdminCreateUser,
  useUpdateAgencyMember,
  useRemoveAgencyMember,
  useAdminDeleteUser,
} from "@/hooks/usePlatformAdmin";

interface Props {
  agency: AgencyRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function initials(firstName: string | null, lastName: string | null, email: string | null) {
  const f = firstName?.[0] ?? "";
  const l = lastName?.[0] ?? "";
  if (f || l) return (f + l).toUpperCase();
  return (email?.[0] ?? "?").toUpperCase();
}

function displayName(firstName: string | null, lastName: string | null, email: string | null) {
  const name = [firstName, lastName].filter(Boolean).join(" ");
  return name || email || "Unknown";
}

export function AgencySheet({ agency, open, onOpenChange }: Props) {
  const { data: members = [], isLoading: membersLoading } = useAgencyMembers(agency?.id ?? null);
  const updateAgency = useUpdateAgency();
  const adminCreateUser = useAdminCreateUser();
  const updateMember = useUpdateAgencyMember();
  const removeMember = useRemoveAgencyMember();

  const [editingMember, setEditingMember] = useState<AgencyMemberRow | null>(null);
  const [memberForm, setMemberForm] = useState({ firstName: "", lastName: "", role: "member" });
  const [removingMember, setRemovingMember] = useState<AgencyMemberRow | null>(null);
  const deleteUser = useAdminDeleteUser();
  const [deletingMember, setDeletingMember] = useState<AgencyMemberRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const deleteConfirmTarget = deletingMember?.profile?.email ?? "DELETE";

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "member" as "admin" | "member",
  });

  const handleRenameOpen = () => {
    setNameInput(agency?.name ?? "");
    setEditingName(true);
  };

  const handleRenameSubmit = async () => {
    if (!agency || !nameInput.trim()) return;
    try {
      await updateAgency.mutateAsync({ id: agency.id, name: nameInput });
      setEditingName(false);
      toast.success("Agency renamed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to rename agency");
    }
  };

  const handleAddUser = async () => {
    if (!agency || !userForm.email.trim()) return;
    try {
      const result = await adminCreateUser.mutateAsync({
        agencyId: agency.id,
        email: userForm.email.trim(),
        firstName: userForm.firstName.trim(),
        lastName: userForm.lastName.trim(),
        role: userForm.role,
      });
      setAddUserOpen(false);
      setUserForm({ email: "", firstName: "", lastName: "", role: "member" });
      toast.success(
        result.status === "invited"
          ? "Invitation sent — user will receive an email to set up their account."
          : "User added to agency."
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create user");
    }
  };

  const handleEditMemberOpen = (m: AgencyMemberRow) => {
    setMemberForm({
      firstName: m.profile?.first_name ?? "",
      lastName: m.profile?.last_name ?? "",
      role: m.role,
    });
    setEditingMember(m);
  };

  const handleEditMemberSubmit = async () => {
    if (!agency || !editingMember) return;
    try {
      await updateMember.mutateAsync({
        agencyId: agency.id,
        userId: editingMember.user_id,
        role: memberForm.role,
        firstName: memberForm.firstName,
        lastName: memberForm.lastName,
      });
      setEditingMember(null);
      toast.success("Member updated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update member");
    }
  };

  const handleRemoveMember = async () => {
    if (!agency || !removingMember) return;
    try {
      await removeMember.mutateAsync({ agencyId: agency.id, userId: removingMember.user_id });
      setRemovingMember(null);
      toast.success("Member removed from agency");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove member");
    }
  };

  const handleDeleteOpen = (m: AgencyMemberRow) => {
    setEditingMember(null);
    setDeleteConfirm("");
    setDeletingMember(m);
  };

  const handleDeleteUser = async () => {
    if (!agency || !deletingMember) return;
    try {
      await deleteUser.mutateAsync({ agencyId: agency.id, userId: deletingMember.user_id });
      setDeletingMember(null);
      toast.success("Account deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
    }
  };

  if (!agency) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-2 pr-8">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-1">
                  <SheetTitle className="text-base leading-tight truncate">{agency.name}</SheetTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={handleRenameOpen}
                    aria-label="Rename agency"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant="outline"
                    className={
                      agency.is_active
                        ? "border-green-400/60 text-green-600 dark:text-green-500 text-[10px]"
                        : "border-red-400/60 text-red-600 dark:text-red-400 text-[10px]"
                    }
                  >
                    {agency.is_active ? "Active" : "Suspended"}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Created {agency.created_at ? new Date(agency.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </p>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Owner */}
          {agency.owner && (
            <div className="mb-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Owner</p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {initials(agency.owner.first_name, agency.owner.last_name, agency.owner.email)}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {displayName(agency.owner.first_name, agency.owner.last_name, agency.owner.email)}
                  </p>
                  {agency.owner.email && (
                    <p className="text-xs text-muted-foreground">{agency.owner.email}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Users className="w-3 h-3" /> Members ({members.length})
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddUserOpen(true)}>
                <UserPlus className="w-3 h-3" /> Add User
              </Button>
            </div>

            {membersLoading && (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading members…</p>
            )}
            {!membersLoading && members.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No members yet</p>
            )}
            {!membersLoading && members.length > 0 && (
              <div className="space-y-1">
                {members.map((m) => (
                  <div key={m.user_id} className="group flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/40">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                      {initials(m.profile?.first_name ?? null, m.profile?.last_name ?? null, m.profile?.email ?? null)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {displayName(m.profile?.first_name ?? null, m.profile?.last_name ?? null, m.profile?.email ?? null)}
                      </p>
                      {m.profile?.email && (
                        <p className="text-xs text-muted-foreground truncate">{m.profile.email}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                      {m.role}
                    </Badge>
                    <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditMemberOpen(m)}
                        aria-label="Edit member"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {m.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setRemovingMember(m)}
                          aria-label="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Rename dialog */}
      <Dialog open={editingName} onOpenChange={setEditingName}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Agency</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Agency name"
              onKeyDown={(e) => e.key === "Enter" && void handleRenameSubmit()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingName(false)}>Cancel</Button>
            <Button onClick={() => void handleRenameSubmit()} disabled={!nameInput.trim() || updateAgency.isPending}>
              {updateAgency.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit member dialog */}
      <Dialog open={!!editingMember} onOpenChange={(o) => !o && setEditingMember(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {editingMember?.profile?.email && (
              <p className="text-xs text-muted-foreground">{editingMember.profile.email}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="em-first" className="text-xs">First name</Label>
                <Input
                  id="em-first"
                  value={memberForm.firstName}
                  onChange={(e) => setMemberForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="em-last" className="text-xs">Last name</Label>
                <Input
                  id="em-last"
                  value={memberForm.lastName}
                  onChange={(e) => setMemberForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              {memberForm.role === "owner" ? (
                <p className="text-sm text-muted-foreground mt-1">Owner (cannot be changed)</p>
              ) : (
                <Select
                  value={memberForm.role}
                  onValueChange={(v) => setMemberForm((f) => ({ ...f, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          {editingMember && editingMember.role !== "owner" && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-destructive">Danger zone</p>
              <div className="flex items-center justify-between gap-3 mt-1">
                <p className="text-xs text-muted-foreground">
                  Permanently delete this user's account and remove them from every agency.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDeleteOpen(editingMember)}
                >
                  Delete account
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingMember(null)}>Cancel</Button>
            <Button onClick={() => void handleEditMemberSubmit()} disabled={updateMember.isPending}>
              {updateMember.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove member confirmation */}
      <AlertDialog open={!!removingMember} onOpenChange={(o) => !o && setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              {removingMember &&
                `${displayName(removingMember.profile?.first_name ?? null, removingMember.profile?.last_name ?? null, removingMember.profile?.email ?? null)} will lose access to ${agency.name}. Their account is not deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleRemoveMember();
              }}
              disabled={removeMember.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMember.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete account confirmation */}
      <AlertDialog open={!!deletingMember} onOpenChange={(o) => !o && setDeletingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the login for{" "}
              <span className="font-medium text-foreground">
                {deletingMember &&
                  displayName(deletingMember.profile?.first_name ?? null, deletingMember.profile?.last_name ?? null, deletingMember.profile?.email ?? null)}
              </span>{" "}
              and removes them from every agency. Campaigns and tasks they created are kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="del-confirm" className="text-xs">
              Type <span className="font-mono font-medium text-foreground">{deleteConfirmTarget}</span> to confirm
            </Label>
            <Input
              id="del-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteUser();
              }}
              disabled={deleteConfirm.trim().toLowerCase() !== deleteConfirmTarget.toLowerCase() || deleteUser.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add user dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add User to {agency.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="au-email" className="text-xs">Email *</Label>
              <Input
                id="au-email"
                type="email"
                placeholder="user@example.com"
                value={userForm.email}
                onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="au-first" className="text-xs">First name</Label>
                <Input
                  id="au-first"
                  placeholder="Jane"
                  value={userForm.firstName}
                  onChange={(e) => setUserForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="au-last" className="text-xs">Last name</Label>
                <Input
                  id="au-last"
                  placeholder="Doe"
                  value={userForm.lastName}
                  onChange={(e) => setUserForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select
                value={userForm.role}
                onValueChange={(v) => setUserForm((f) => ({ ...f, role: v as "admin" | "member" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddUserOpen(false)}>Cancel</Button>
            <Button
              onClick={() => void handleAddUser()}
              disabled={!userForm.email.trim() || adminCreateUser.isPending}
            >
              {adminCreateUser.isPending ? "Sending…" : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
