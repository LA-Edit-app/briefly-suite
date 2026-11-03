import { useState } from "react";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Building2, Users, ClipboardList, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useIsPlatformAdmin, useAllAgencies, useToggleAgencyStatus } from "@/hooks/usePlatformAdmin";
import { useProfile } from "@/hooks/useDatabase";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function PlatformAdmin() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const isPlatformAdmin = useIsPlatformAdmin();
  const { data: agencies = [], isLoading, error } = useAllAgencies();
  const toggleStatus = useToggleAgencyStatus();

  const [search, setSearch] = useState("");

  // Wait for profile to load before deciding access
  if (profileLoading) return <div className="min-h-screen bg-background" />;
  if (!isPlatformAdmin) return <Navigate to="/" replace />;

  const filtered = agencies.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.owner?.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalMembers = agencies.reduce((s, a) => s + a.member_count, 0);
  const totalCampaigns = agencies.reduce((s, a) => s + a.campaign_count, 0);
  const activeCount = agencies.filter((a) => a.is_active).length;

  const handleToggle = async (id: string, currentlyActive: boolean) => {
    try {
      await toggleStatus.mutateAsync({ id, is_active: !currentlyActive });
      toast.success(currentlyActive ? "Agency suspended" : "Agency activated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update agency status");
    }
  };

  return (
    <DashboardLayout title="Platform Admin">
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{profile?.email}</span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold">{agencies.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total agencies</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold">{totalMembers}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total members</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold">{totalCampaigns}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total campaigns</p>
            </CardContent>
          </Card>
        </div>

        {/* Agency table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold">Agencies</CardTitle>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search name or owner…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading && (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading agencies…</p>
            )}
            {error && (
              <p className="text-sm text-destructive py-6 text-center">Failed to load agencies</p>
            )}
            {!isLoading && !error && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left pb-2 pr-4 font-medium">Agency</th>
                      <th className="text-left pb-2 pr-4 font-medium">Owner</th>
                      <th className="text-left pb-2 pr-4 font-medium">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Members</span>
                      </th>
                      <th className="text-left pb-2 pr-4 font-medium">
                        <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" /> Campaigns</span>
                      </th>
                      <th className="text-left pb-2 pr-4 font-medium">Created</th>
                      <th className="text-left pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          No agencies found
                        </td>
                      </tr>
                    )}
                    {filtered.map((agency) => {
                      const ownerName = agency.owner
                        ? [agency.owner.first_name, agency.owner.last_name].filter(Boolean).join(" ") || agency.owner.email
                        : "—";

                      return (
                        <tr key={agency.id} className="group hover:bg-muted/40 transition-colors">
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                <Building2 className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <span className="font-medium">{agency.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                            <div>{ownerName}</div>
                            {agency.owner?.email && ownerName !== agency.owner.email && (
                              <div className="text-[10px] opacity-70">{agency.owner.email}</div>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground">{agency.member_count}</td>
                          <td className="py-2.5 pr-4 text-muted-foreground">{agency.campaign_count}</td>
                          <td className="py-2.5 pr-4 text-muted-foreground text-xs">{formatDate(agency.created_at)}</td>
                          <td className="py-2.5 pr-4">
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
                          </td>
                          <td className="py-2.5 text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  {agency.is_active ? "Suspend" : "Activate"}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {agency.is_active ? "Suspend" : "Activate"} {agency.name}?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {agency.is_active
                                      ? "The agency will be marked as suspended. Access enforcement will be added in a future update."
                                      : "The agency will be marked as active again."}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void handleToggle(agency.id, agency.is_active)}
                                    className={agency.is_active ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                                  >
                                    {agency.is_active ? "Suspend" : "Activate"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
      </div>
    </DashboardLayout>
  );
}
