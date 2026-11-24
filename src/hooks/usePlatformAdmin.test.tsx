import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabaseMock } from "@/test/supabaseMock";
import {
  useAdminCreateUser,
  useAdminDeleteUser,
  useCreateAgency,
  useRemoveAgencyMember,
  useSuspendUser,
  useToggleAgencyStatus,
  useUpdateAgency,
  useUpdateAgencyMember,
} from "./usePlatformAdmin";

vi.mock("@/integrations/supabase/client", async () => ({
  supabase: (await import("@/test/supabaseMock")).supabaseMock.client,
}));

// The query keys the Platform Admin screens read from.
const AGENCIES = ["platform-admin", "agencies"];
const ALL_PLATFORM_ADMIN = ["platform-admin"];
const membersOf = (agencyId: string) => ["platform-admin", "agency-members", agencyId];

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const invalidatedKeys = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey);
  return { wrapper, invalidatedKeys };
}

// Each mutation, how to call it, and the query keys it must refresh (#29).
const cases: Array<[string, () => { mutateAsync: (args: never) => Promise<unknown> }, unknown, unknown[][]]> = [
  ["useToggleAgencyStatus", useToggleAgencyStatus, { id: "a1", is_active: false }, [AGENCIES]],
  ["useCreateAgency", useCreateAgency, { name: "New agency" }, [AGENCIES]],
  ["useUpdateAgency", useUpdateAgency, { id: "a1", name: "Renamed" }, [AGENCIES]],
  [
    "useUpdateAgencyMember",
    useUpdateAgencyMember,
    { agencyId: "a1", userId: "u1", role: "admin", firstName: "A", lastName: "B" },
    [ALL_PLATFORM_ADMIN],
  ],
  ["useRemoveAgencyMember", useRemoveAgencyMember, { agencyId: "a1", userId: "u1" }, [ALL_PLATFORM_ADMIN]],
  ["useSuspendUser", useSuspendUser, { userId: "u1", suspended: true }, [ALL_PLATFORM_ADMIN]],
  ["useAdminDeleteUser", useAdminDeleteUser, { userId: "u1" }, [ALL_PLATFORM_ADMIN]],
  [
    "useAdminCreateUser",
    useAdminCreateUser,
    { agencyId: "a1", email: "new@example.com", firstName: "N", lastName: "U", role: "talent_manager" },
    [membersOf("a1"), AGENCIES],
  ],
];

describe("platform admin mutations refresh the right data", () => {
  beforeEach(() => supabaseMock.reset());

  it.each(cases)("%s invalidates its queries", async (_name, useMutationHook, args, expectedKeys) => {
    const { wrapper, invalidatedKeys } = setup();
    const { result } = renderHook(useMutationHook, { wrapper });

    await act(() => result.current.mutateAsync(args as never));

    expect(invalidatedKeys()).toEqual(expect.arrayContaining(expectedKeys));
  });

  it("does not invalidate when the request fails", async () => {
    supabaseMock.setResult("agencies", { error: { message: "denied" } });
    const { wrapper, invalidatedKeys } = setup();
    const { result } = renderHook(useUpdateAgency, { wrapper });

    await act(() => expect(result.current.mutateAsync({ id: "a1", name: "x" })).rejects.toBeTruthy());

    expect(invalidatedKeys()).toHaveLength(0);
  });
});
