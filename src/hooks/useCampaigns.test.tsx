import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { hasEq, supabaseMock } from "@/test/supabaseMock";
import { useAgencyId } from "./useDatabase";
import {
  useActiveCampaignsPerCreator,
  useCampaigns,
  useCampaignStats,
  useCreatorCampaigns,
  useRecentCampaigns,
  useRevenueByMonth,
  useUpcomingCampaignEvents,
} from "./useCampaigns";

vi.mock("@/integrations/supabase/client", async () => ({
  supabase: (await import("@/test/supabaseMock")).supabaseMock.client,
}));

// Every hook that lists campaigns for the dashboard, tracker or calendar (#22).
const campaignListHooks: Record<string, () => unknown> = {
  useCampaigns: () => useCampaigns(),
  useCreatorCampaigns: () => useCreatorCampaigns("creator-1"),
  useCampaignStats: () => useCampaignStats(),
  useRevenueByMonth: () => useRevenueByMonth(),
  useUpcomingCampaignEvents: () => useUpcomingCampaignEvents(),
  useRecentCampaigns: () => useRecentCampaigns(),
  useActiveCampaignsPerCreator: () => useActiveCampaignsPerCreator(),
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const campaignQueries = () => supabaseMock.calls.filter((c) => c.table === "campaigns");

describe("campaign hooks are scoped to the user's agency", () => {
  beforeEach(() => supabaseMock.reset());

  it.each(Object.entries(campaignListHooks))("%s filters campaigns by agency_id", async (_name, useHook) => {
    supabaseMock.setResult("profiles", { data: { id: "user-1", agency_id: "agency-1" } });

    renderHook(useHook, { wrapper });

    await waitFor(() => expect(campaignQueries().length).toBeGreaterThan(0));
    for (const call of campaignQueries()) {
      expect(hasEq(call, "agency_id", "agency-1"), `${call.table}: ${JSON.stringify(call.ops)}`).toBe(true);
    }
  });

  it("does not query campaigns when the user has no agency", async () => {
    supabaseMock.setResult("profiles", { data: { id: "user-1", agency_id: null } });

    const { result } = renderHook(
      () => {
        useCampaigns();
        useCreatorCampaigns("creator-1");
        useCampaignStats();
        useRevenueByMonth();
        useUpcomingCampaignEvents();
        useRecentCampaigns();
        useActiveCampaignsPerCreator();
        return useAgencyId();
      },
      { wrapper },
    );

    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.data).toBeNull();
    expect(campaignQueries()).toHaveLength(0);
  });
});
