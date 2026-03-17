import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { UserMinus, UserPlus, ShieldCheck, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  useCurrentAgency,
  useUpdateAgency,
  useAgencyMembers,
  useIsAgencyAdmin,
  useCurrentUserRole,
  useUpdateMemberRole,
  useRemoveMember,
  useInviteMember,
} from "@/hooks/useAgencyMembers";
import { useAuth } from "@/hooks/useAuth";
import type { AgencyMemberWithProfile } from "@/hooks/useAgencyMembers";

const roleBadgeVariant = (role: string) => {
  if (role === "owner") return "default";
  if (role === "admin") return "secondary";
  return "outline";
};

const roleLabel = (role: string) => {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Member";
};

const memberInitials = (member: AgencyMemberWithProfile) => {
  const first = member.profiles?.first_name;
  const last = member.profiles?.last_name;
  if (first || last) {
    return [first, last]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join("");
  }
  return member.profiles?.email?.[0]?.toUpperCase() ?? "?";
};

const memberDisplayName = (member: AgencyMemberWithProfile) => {
  const first = member.profiles?.first_name;
  const last = member.profiles?.last_name;
  if (first || last) return [first, last].filter(Boolean).join(" ");
  return member.profiles?.email ?? "Unknown User";
};

const AgencySettings = () => {
  const { user } = useAuth();
  const { data: agency, isLoading: agencyLoading } = useCurrentAgency();
  const { data: members, isLoading: membersLoading } = useAgencyMembers();
  const { data: isAdmin } = useIsAgencyAdmin();
  const { data: currentRole } = useCurrentUserRole();
  const updateAgency = useUpdateAgency();
  const updateMemberRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const inviteMember = useInviteMember();

  const [agencyName, setAgencyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");

  // Sync agency name to local state when loaded
  const [agencyNameInitialized, setAgencyNameInitialized] = useState(false);
  if (agency && !agencyNameInitialized) {
    setAgencyName(agency.name);
    setAgencyNameInitialized(true);
  }

  const handleSaveAgencyName = () => {
    if (!agency) return;
    if (!agencyName.trim()) return toast.error("Agency name cannot be empty");
    updateAgency.mutate(
      { id: agency.id, name: agencyName.trim() },
      {
        onSuccess: () => toast.success("Agency name updated"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleRoleChange = (member: AgencyMemberWithProfile, newRole: "admin" | "member") => {
    updateMemberRole.mutate(
      { agencyId: member.agency_id, userId: member.user_id, role: newRole },
      {
        onSuccess: () => toast.success("Role updated"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleRemoveMember = (member: AgencyMemberWithProfile) => {
    removeMember.mutate(
      { agencyId: member.agency_id, userId: member.user_id },
      {
        onSuccess: () => toast.success(`${memberDisplayName(member)} removed from agency`),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleInvite = () => {
    if (!agency) return;
    if (!inviteEmail.trim()) return toast.error("Enter an email address");
    const emailSnapshot = inviteEmail.trim();
    inviteMember.mutate(
      { agencyId: agency.id, email: emailSnapshot, role: inviteRole },
      {
        onSuccess: (data) => {
          if (data?.status === 'invited') {
            toast.success(`Invitation email sent to ${emailSnapshot}. They'll join your agency when they sign up.`);
          } else {
            toast.success(`${emailSnapshot} has been added to your agency.`);
          }
          setInviteEmail("");
          setInviteRole("member");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (!isAdmin && currentRole !== null && currentRole !== undefined) {
    return (
      <DashboardLayout title="Agency Settings">
        <div className="max-w-3xl">
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Admin Access Required</h3>
            <p className="text-muted-foreground">
              Only agency owners and admins can manage agency settings.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Agency Settings">
      <div className="max-w-3xl space-y-8 animate-fade-in">

        {/* Agency Info */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Agency Details</h3>
          {agencyLoading ? (
            <Skeleton className="h-10 rounded-md" />
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agencyName">Agency Name</Label>
                <Input
                  id="agencyName"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="Your agency name"
                />
              </div>
              <Button
                onClick={handleSaveAgencyName}
                disabled={updateAgency.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {updateAgency.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        {/* Team Members */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Team Members</h3>

          {membersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-3 w-56 rounded" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {members?.map((member, idx) => {
                const isCurrentUser = member.user_id === user?.id;
                const isOwner = member.role === "owner";

                return (
                  <div key={member.user_id}>
                    {idx > 0 && <Separator className="my-3" />}
                    <div className="flex items-center gap-4 py-1">
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {memberInitials(member)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {memberDisplayName(member)}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.profiles?.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isOwner || isCurrentUser ? (
                          <Badge variant={roleBadgeVariant(member.role)}>
                            {member.role === "owner" && <Shield className="w-3 h-3 mr-1" />}
                            {roleLabel(member.role)}
                          </Badge>
                        ) : (
                          <Select
                            value={member.role}
                            onValueChange={(v) =>
                              handleRoleChange(member, v as "admin" | "member")
                            }
                          >
                            <SelectTrigger className="h-8 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        {!isOwner && !isCurrentUser && currentRole === "owner" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Remove <strong>{memberDisplayName(member)}</strong> from your agency? They will lose access to all agency data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(member)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invite Members */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">Invite Team Member</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Add an existing user by email, or send an invitation to someone who hasn't signed up yet.
          </p>

          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
            </div>
            <div className="w-36 space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as "admin" | "member")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleInvite}
            disabled={inviteMember.isPending}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {inviteMember.isPending ? "Adding..." : "Add Member"}
          </Button>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default AgencySettings;
