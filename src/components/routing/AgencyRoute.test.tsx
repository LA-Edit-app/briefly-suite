import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AgencyRoute } from "./AgencyRoute";

const profileState = vi.hoisted(() => ({
  current: { data: undefined as { is_platform_admin: boolean } | undefined, isLoading: false },
}));

vi.mock("@/hooks/useDatabase", () => ({
  useProfile: () => profileState.current,
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<AgencyRoute element={<p>Agency dashboard</p>} />} />
        <Route path="/platform-admin" element={<p>Platform admin panel</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AgencyRoute", () => {
  beforeEach(() => {
    profileState.current = { data: undefined, isLoading: false };
  });

  it("redirects platform admins to /platform-admin", () => {
    profileState.current = { data: { is_platform_admin: true }, isLoading: false };
    renderAt("/");
    expect(screen.getByText("Platform admin panel")).toBeInTheDocument();
    expect(screen.queryByText("Agency dashboard")).not.toBeInTheDocument();
  });

  it("shows the page to agency users", () => {
    profileState.current = { data: { is_platform_admin: false }, isLoading: false };
    renderAt("/");
    expect(screen.getByText("Agency dashboard")).toBeInTheDocument();
  });

  it("shows neither while the profile is loading", () => {
    profileState.current = { data: undefined, isLoading: true };
    renderAt("/");
    expect(screen.queryByText("Agency dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Platform admin panel")).not.toBeInTheDocument();
  });
});
