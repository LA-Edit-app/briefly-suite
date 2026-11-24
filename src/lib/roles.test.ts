import { describe, expect, it } from "vitest";
import { AGENCY_ROLES, ROLE_OPTIONS, canViewAllCampaigns, isAgencyRole, roleLabel } from "./roles";
import { AGENCY_NAME_TAKEN, agencyNameError } from "./agencyName";

describe("agency roles (#52)", () => {
  it("offers exactly Admin, Talent Manager and Creator", () => {
    expect(AGENCY_ROLES).toEqual(["admin", "talent_manager", "creator"]);
    expect(ROLE_OPTIONS.map((o) => o.label)).toEqual(["Admin", "Talent Manager", "Creator"]);
  });

  it("labels pre-#52 roles as their replacements", () => {
    expect(roleLabel("owner")).toBe("Admin");
    expect(roleLabel("member")).toBe("Talent Manager");
    expect(roleLabel("creator")).toBe("Creator");
  });

  it("only accepts the three roles", () => {
    expect(isAgencyRole("admin")).toBe(true);
    expect(isAgencyRole("owner")).toBe(false);
    expect(isAgencyRole("member")).toBe(false);
  });
});

describe("agencyNameError", () => {
  it("explains a duplicate agency name", () => {
    expect(agencyNameError({ code: "23505", message: "duplicate key value violates unique constraint" })).toBe(AGENCY_NAME_TAKEN);
    expect(agencyNameError(new Error('duplicate key value violates unique constraint "agencies_name_unique"'))).toBe(AGENCY_NAME_TAKEN);
  });

  it("passes other errors through", () => {
    expect(agencyNameError(new Error("permission denied"))).toBe("permission denied");
  });
});

describe("canViewAllCampaigns (#51)", () => {
  it("is Admin only for now", () => {
    expect(canViewAllCampaigns("admin")).toBe(true);
    expect(canViewAllCampaigns("talent_manager")).toBe(false);
    expect(canViewAllCampaigns("creator")).toBe(false);
    expect(canViewAllCampaigns(null)).toBe(false);
  });
});
