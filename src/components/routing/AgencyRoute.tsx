import type React from "react";
import { Navigate } from "react-router-dom";
import { useProfile } from "@/hooks/useDatabase";
import { RouteFallback } from "./RouteFallback";

// Redirects platform admins to /platform-admin for all agency-scoped routes.
// Platform admins are Briefly staff — they use the Platform Admin panel, not
// the agency dashboard (even when they happen to have an agency record).
export const AgencyRoute = ({ element }: { element: React.ReactElement }) => {
  const { data: profile, isLoading } = useProfile();
  if (isLoading) return <RouteFallback />;
  if (profile?.is_platform_admin) {
    return <Navigate to="/platform-admin" replace />;
  }
  return element;
};
