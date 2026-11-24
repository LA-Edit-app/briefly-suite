import { useRecentCampaigns } from "@/hooks/useCampaigns";

export function RecentCampaigns() {
  const { data: campaigns = [], isLoading, error } = useRecentCampaigns(5);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold tracking-tight text-foreground">Recent Campaigns</h3>
        <a href="/campaign-tracker" className="text-sm text-primary hover:underline">
          View all
        </a>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Campaign
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Creator
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={2} className="py-6 px-4 text-center text-muted-foreground">
                  Loading campaigns...
                </td>
              </tr>
            )}

            {!isLoading && error && (
              <tr>
                <td colSpan={2} className="py-6 px-4 text-center text-destructive">
                  Failed to load campaigns
                </td>
              </tr>
            )}

            {!isLoading && !error && campaigns.length === 0 && (
              <tr>
                <td colSpan={2} className="py-6 px-4 text-center text-muted-foreground">
                  No campaigns yet
                </td>
              </tr>
            )}

            {!isLoading && !error && campaigns.map((campaign) => (
              <tr
                key={campaign.id}
                className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <span className="font-medium text-foreground">{campaign.brand}</span>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{campaign.creators?.name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}