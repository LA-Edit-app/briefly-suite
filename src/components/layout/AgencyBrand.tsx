import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentAgency } from "@/hooks/useAgencyMembers";
import { BRIEFLY_LOGO } from "@/lib/brand";

interface AgencyBrandProps {
  collapsed: boolean;
}

// Top-left brand: the agency's logo when it has one, otherwise Briefly's.
export function AgencyBrand({ collapsed }: AgencyBrandProps) {
  const { data: agency, isLoading } = useCurrentAgency();
  // A logo URL that failed to load — fall back to the default instead of a broken image
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Skeleton
        className={collapsed ? "w-8 h-8 rounded-lg flex-shrink-0" : "h-8 w-32 rounded-lg"}
      />
    );
  }

  const agencyName = agency?.name ?? "";
  const logoUrl =
    agency?.logo_url && agency.logo_url !== failedUrl ? agency.logo_url : null;

  if (!logoUrl) {
    return (
      <div className="flex items-center gap-2">
        <img
          src={BRIEFLY_LOGO}
          alt="Briefly"
          className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
        />
        {!collapsed && (
          <span className="font-semibold text-foreground">Briefly Suite</span>
        )}
      </div>
    );
  }

  // Wide logos are unreadable at 32px, so show the agency's initial instead
  if (collapsed) {
    return (
      <div
        className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 text-primary-foreground font-semibold text-sm"
        title={agencyName}
      >
        {agencyName.trim().charAt(0).toUpperCase() || "?"}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={agencyName}
      className="max-h-10 max-w-[11rem] object-contain"
      onError={() => setFailedUrl(logoUrl)}
    />
  );
}
