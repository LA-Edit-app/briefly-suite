import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAllUsers, useSuspendUser, type PlatformUserRow, type UserStatus } from "@/hooks/usePlatformAdmin";
import { useProfile } from "@/hooks/useDatabase";
import { DeleteUserDialog, type DeleteUserTarget } from "./DeleteUserDialog";

type StatusFilter = "all" | UserStatus;

const STATUS_STYLES: Record<UserStatus, string> = {
  active: "border-green-400/60 text-green-600 dark:text-green-500",
  suspended: "border-red-400/60 text-red-600 dark:text-red-400",
  invited: "border-amber-400/60 text-amber-600 dark:text-amber-400",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fullName(u: PlatformUserRow) {
  return [u.first_name, u.last_name].filter(Boolean).join(" ");
}

function initials(u: PlatformUserRow) {
  const fromName = `${u.first_name?.[0] ?? ""}${u.last_name?.[0] ?? ""}`;
  return (fromName || u.email?.[0] || "?").toUpperCase();
}

export function UsersTab() {
  const { data: profile } = useProfile();
  const { data: users = [], isLoading, error } = useAllUsers();
  const suspendUser = useSuspendUser();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [suspending, setSuspending] = useState<PlatformUserRow | null>(null);
  const [deleting, setDeleting] = useState<DeleteUserTarget | null>(null);

  const counts = {
    all: users.length,
    active: users.filter((u) => u.status === "active").length,
    suspended: users.filter((u) => u.status === "suspended").length,
    invited: users.filter((u) => u.status === "invited").length,
  };

  const q = search.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (!q) return true;
    return (
      u.email?.toLowerCase().includes(q) ||
      fullName(u).toLowerCase().includes(q) ||
      u.agencies.some((a) => a.name.toLowerCase().includes(q))
    );
  });

  const handleSuspendToggle = async () => {
    if (!suspending) return;
    const suspend = suspending.status !== "suspended";
    try {
      await suspendUser.mutateAsync({ userId: suspending.id, suspended: suspend });
      setSuspending(null);
      toast.success(suspend ? "User suspended" : "User reactivated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update user");
    }
  };

  const statCards: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Total users" },
    { key: "active", label: "Active" },
    { key: "suspended", label: "Suspended" },
    { key: "invited", label: "Invited" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ key, label }) => (
          <button key={key} type="button" onClick={() => setStatusFilter(key)} className="text-left">
            <Card className={statusFilter === key ? "ring-2 ring-primary/40" : "hover:bg-muted/30 transition-colors"}>
              <CardContent className="pt-4 pb-3">
                <p className="text-2xl font-bold">{counts[key]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">Users</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search name, email or agency…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading users…</p>}
          {error && <p className="text-sm text-destructive py-6 text-center">Failed to load users</p>}
          {!isLoading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left pb-2 pr-4 font-medium">User</th>
                    <th className="text-left pb-2 pr-4 font-medium">Agencies</th>
                    <th className="text-left pb-2 pr-4 font-medium">Status</th>
                    <th className="text-left pb-2 pr-4 font-medium">Last sign-in</th>
                    <th className="text-left pb-2 pr-4 font-medium">Joined</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">No users found</td>
                    </tr>
                  )}
                  {filtered.map((u) => {
                    const name = fullName(u);
                    const canManage = !u.is_platform_admin && u.id !== profile?.id;
                    return (
                      <tr key={u.id} className={u.status === "suspended" ? "bg-red-500/[0.03]" : undefined}>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                              {initials(u)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium truncate">{name || u.email}</span>
                                {u.is_platform_admin && (
                                  <Badge variant="outline" className="text-[10px] gap-1 border-primary/40 text-primary">
                                    <ShieldCheck className="w-2.5 h-2.5" /> Platform admin
                                  </Badge>
                                )}
                              </div>
                              {name && <div className="text-xs text-muted-foreground truncate">{u.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          {u.agencies.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No agency</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {u.agencies.map((a) => (
                                <Badge key={a.id} variant="secondary" className="text-[10px] font-normal">
                                  {a.name} · <span className="capitalize ml-0.5">{a.role}</span>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_STYLES[u.status]}`}>
                            {u.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground">{formatDate(u.last_sign_in_at)}</td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground">{formatDate(u.created_at)}</td>
                        <td className="py-2.5 text-right">
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="User actions">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setSuspending(u)}>
                                  {u.status === "suspended" ? "Reactivate" : "Suspend"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() => setDeleting({ id: u.id, name: name || u.email, email: u.email })}
                                >
                                  Delete account
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!suspending} onOpenChange={(o) => !o && setSuspending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspending?.status === "suspended" ? "Reactivate" : "Suspend"}{" "}
              {suspending && (fullName(suspending) || suspending.email)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspending?.status === "suspended"
                ? "They will be able to sign in again with their existing account and data."
                : "They won't be able to sign in. Any session already open ends within an hour. Their account, memberships and data are kept, and you can reactivate them at any time."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleSuspendToggle();
              }}
              disabled={suspendUser.isPending}
              className={suspending?.status === "suspended" ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {suspendUser.isPending ? "Saving…" : suspending?.status === "suspended" ? "Reactivate" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteUserDialog user={deleting} onOpenChange={(o) => !o && setDeleting(null)} />
    </div>
  );
}
