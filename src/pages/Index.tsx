import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RecentCampaigns } from "@/components/dashboard/RecentCampaigns";
import { TaskList } from "@/components/layout/TaskList";
import { UpcomingEventsCalendar } from "@/components/dashboard/UpcomingEventsCalendar";

const Index = () => {
  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-5 lg:space-y-6 animate-fade-in">
        {/* Tasks */}
        <TaskList />

        {/* Upcoming Events Calendar */}
        <UpcomingEventsCalendar />

        {/* Recent Campaigns */}
        <RecentCampaigns />
      </div>
    </DashboardLayout>
  );
};

export default Index;
