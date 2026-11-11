import React, { Suspense, lazy, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useDatabase";
import { BrandThemeProvider } from "@/context/BrandThemeContext";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { initialAuthLinkType } from "@/lib/authLink";
import ComingSoon from "./pages/ComingSoon";

const Index = lazy(() => import("./pages/Index"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const CampaignTracker = lazy(() => import("./pages/CampaignTracker"));
const Creators = lazy(() => import("./pages/Creators"));
const Settings = lazy(() => import("./pages/Settings"));
const AgencySettings = lazy(() => import("./pages/AgencySettings"));
const PlatformAdmin = lazy(() => import("./pages/PlatformAdmin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const XeroCallback = lazy(() => import("./pages/XeroCallback"));
const SetPassword = lazy(() => import("./pages/SetPassword"));

const queryClient = new QueryClient();

const RouteFallback = () => <div className="min-h-screen bg-background" />;

// Redirects platform admins to /platform-admin for all agency-scoped routes.
// Platform admins are Briefly staff — they use the Platform Admin panel, not
// the agency dashboard (even when they happen to have an agency record).
const AgencyRoute = ({ element }: { element: React.ReactElement }) => {
  const { data: profile, isLoading } = useProfile();
  if (isLoading) return <RouteFallback />;
  if (profile?.is_platform_admin) {
    return <Navigate to="/platform-admin" replace />;
  }
  return element;
};

const AppRoutes = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const isLocalSupabase = Boolean(supabaseUrl?.includes("localhost:54321"));
  const bypassAuthInDev =
    import.meta.env.DEV && (import.meta.env.VITE_DEV_BYPASS_AUTH === "true" || isLocalSupabase);
  const { session, loading } = useAuth();
  const isAuthenticated = Boolean(session?.user);
  const queryClient = useQueryClient();

  // Opened from a forgot-password email: ask for the new password first.
  const [recoveryPending, setRecoveryPending] = useState(initialAuthLinkType === "recovery");

  // Invited users are signed in by the invite link with a password they don't
  // know. The invite functions set this flag; saving a password clears it.
  const needsPassword = session?.user?.user_metadata?.needs_password === true;
  // Keeps the password screen up while saving: clearing the flag would
  // otherwise show the dashboard for a moment before sign-out.
  const [savingPassword, setSavingPassword] = useState(false);

  const savePassword = async (password: string) => {
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password, data: { needs_password: false } });
    if (error) {
      setSavingPassword(false);
      return error.message;
    }
    // Ask them to sign in with the new password, so they know it works. The
    // /set-password route then sends them to /auth.
    await supabase.auth.signOut();
    setRecoveryPending(false);
    queryClient.clear();
    setSavingPassword(false);
    return null;
  };

  useEffect(() => {
    const warmRoutes = () => {
      void import("./pages/Campaigns");
      void import("./pages/Creators");

    };

    if (bypassAuthInDev) {
      const timeoutId = window.setTimeout(warmRoutes, 0);
      return () => window.clearTimeout(timeoutId);
    }

    if (!isAuthenticated) return;

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(warmRoutes, { timeout: 1000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(warmRoutes, 250);
    return () => window.clearTimeout(timeoutId);
  }, [bypassAuthInDev, isAuthenticated]);

  if (bypassAuthInDev) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/auth" element={<Navigate to="/" replace />} />
          <Route path="/" element={<Index />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaign-tracker" element={<CampaignTracker />} />
          <Route path="/creators" element={<Creators />} />
          <Route path="/analytics" element={<Navigate to="/" replace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/agency-settings" element={<AgencySettings />} />
          <Route path="/platform-admin" element={<PlatformAdmin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (isAuthenticated && (needsPassword || recoveryPending || savingPassword)) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/set-password"
            element={
              <SetPassword
                mode={needsPassword ? "invite" : "reset"}
                email={session?.user?.email}
                onSave={savePassword}
              />
            }
          />
          <Route path="*" element={<Navigate to="/set-password" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/xero/callback" element={<XeroCallback />} />
        <Route path="/set-password" element={<Navigate to={isAuthenticated ? "/" : "/auth"} replace />} />
        <Route
          path="/auth"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Auth />}
        />
        <Route
          path="/"
          element={isAuthenticated ? <AgencyRoute element={<Index />} /> : <ComingSoon />}
        />
        <Route
          path="/campaigns"
          element={isAuthenticated ? <AgencyRoute element={<Campaigns />} /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/campaign-tracker"
          element={isAuthenticated ? <AgencyRoute element={<CampaignTracker />} /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/creators"
          element={isAuthenticated ? <AgencyRoute element={<Creators />} /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/analytics"
          element={<Navigate to="/" replace />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <Settings /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/agency-settings"
          element={isAuthenticated ? <AgencyRoute element={<AgencySettings />} /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/platform-admin"
          element={isAuthenticated ? <PlatformAdmin /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="*"
          element={isAuthenticated ? <NotFound /> : <ComingSoon />}
        />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrandThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </BrandThemeProvider>
  </QueryClientProvider>
);

export default App;
