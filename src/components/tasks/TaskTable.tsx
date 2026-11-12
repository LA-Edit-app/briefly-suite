import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Database } from "@/integrations/supabase/types";
import { useCreateTask, useDeleteTask, useRestoreTask, useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useAgencyMembers, useIsAgencyAdmin } from "@/hooks/useAgencyMembers";
import { useAuth } from "@/hooks/useAuth";
import { NewTaskRow } from "./NewTaskRow";
import { TaskTableRow, type MemberOption } from "./TaskTableRow";
import { compareTasks, isDone, isMyTask, isTeamTask, personName, type TaskRow } from "./taskHelpers";

type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
type TabValue = "my" | "team";

const COLUMNS = ["", "Task name", "Due date", "Assignee", "Status", "Priority", "Description"];

export function TaskTable() {
  const { data, isLoading, error } = useTasks();
  const tasks = (data ?? []) as TaskRow[];
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const restoreTask = useRestoreTask();
  const { data: isAdmin = false } = useIsAgencyAdmin();
  const { data: members } = useAgencyMembers();
  const { user } = useAuth();

  const [tab, setTab] = useState<TabValue>("my");
  const [addingIn, setAddingIn] = useState<TabValue | null>(null);

  const memberOptions: MemberOption[] = (members ?? [])
    .filter((m) => m.profiles)
    .map((m) => ({
      id: m.user_id,
      name: [m.profiles?.first_name, m.profiles?.last_name].filter(Boolean).join(" ") || m.profiles?.email || "Unknown",
    }));
  // A task the creator assigns to themselves is not a team task, so leave them out here.
  const teamAssigneeOptions = memberOptions.filter((m) => m.id !== user?.id);

  const myTasks = tasks.filter((t) => isMyTask(t, user?.id)).sort(compareTasks);
  const teamTasks = tasks.filter((t) => isTeamTask(t, user?.id)).sort(compareTasks);
  const openCount = (list: TaskRow[]) => list.filter((t) => !isDone(t)).length;

  const memberProfile = (id: string) => {
    const p = members?.find((m) => m.user_id === id)?.profiles;
    return p ? { id, first_name: p.first_name, last_name: p.last_name, email: p.email } : null;
  };

  const handleUpdate = (task: TaskRow, updates: TaskUpdate, which: TabValue) => {
    const reassigned = "assigned_to" in updates;
    const assignee = reassigned && updates.assigned_to ? memberProfile(updates.assigned_to) : null;
    updateTask.mutate(
      { id: task.id, updates, optimistic: reassigned ? { assignee } : undefined },
      {
        onError: (e) => toast.error(e.message || "Failed to update task"),
        onSuccess: () => {
          if (!reassigned) return;
          // Tell them where the task went if it no longer belongs on this tab.
          const updated = { ...task, ...updates };
          const name = personName(assignee);
          if (which === "team" && !isTeamTask(updated, user?.id)) {
            toast.info(name ? `Moved to ${name}'s tasks` : "Moved to My tasks");
          } else if (which === "my" && !isMyTask(updated, user?.id)) {
            toast.info(isAdmin ? `Assigned to ${name}. It's now in Team tasks.` : `Assigned to ${name}`);
          }
        },
      }
    );
  };

  const handleDelete = (task: TaskRow) => {
    deleteTask.mutate(task.id, {
      onSuccess: () =>
        toast.success(`Deleted "${task.title}"`, {
          action: {
            label: "Undo",
            onClick: () =>
              restoreTask.mutate(task, {
                onSuccess: () => toast.success(`Restored "${task.title}"`),
                onError: (e) => toast.error(e.message || "Failed to restore task"),
              }),
          },
        }),
      onError: (e) => toast.error(e.message || "Failed to delete task"),
    });
  };

  const handleCreate = async ({ title, assigned_to }: { title: string; assigned_to: string | null }) => {
    try {
      await createTask.mutateAsync({
        title,
        status: "not_started",
        priority: "medium",
        sort_order: 0,
        assigned_to: assigned_to ?? user?.id ?? null,
      });
      return true;
    } catch (e) {
      toast.error((e as Error).message || "Failed to create task");
      return false;
    }
  };

  const startAdding = () => setAddingIn(tab);

  const renderTable = (list: TaskRow[], which: TabValue, emptyMessage: string) => (
    <div className="rounded-lg border border-border">
      <div className="max-h-[480px] overflow-auto">
      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {COLUMNS.map((c, i) => (
              <TableHead key={i} className={cn("h-9 text-xs font-semibold uppercase tracking-wide", i === 0 ? "w-10" : "px-3")}>
                {c}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((task) => (
            <TaskTableRow
              key={task.id}
              task={task}
              isAdmin={isAdmin}
              // On the Team tab, assigning to the creator or to nobody would move
              // the task off the tab, so those options are left out.
              memberOptions={which === "team" ? memberOptions.filter((m) => m.id !== task.created_by) : memberOptions}
              allowUnassigned={which !== "team"}
              onUpdate={(_id, updates) => handleUpdate(task, updates, which)}
              onDelete={handleDelete}
            />
          ))}
          {list.length === 0 && addingIn !== which && (
            <TableRow className="hover:bg-transparent">
              <td colSpan={COLUMNS.length} className="py-8 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </td>
            </TableRow>
          )}
          {addingIn === which && (
            <NewTaskRow
              askAssignee={which === "team"}
              memberOptions={teamAssigneeOptions}
              saving={createTask.isPending}
              onCreate={handleCreate}
              onCancel={() => setAddingIn(null)}
            />
          )}
        </TableBody>
      </Table>
      </div>
      {addingIn !== which && (
        <button
          type="button"
          onClick={() => setAddingIn(which)}
          className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          New task
        </button>
      )}
    </div>
  );

  const countBadge = (n: number) => (
    <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{n}</Badge>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold tracking-tight">Tasks</CardTitle>
          <Button size="sm" className="gap-1.5" onClick={startAdding}>
            <Plus className="h-4 w-4" />
            New task
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading && <div className="py-6 text-center text-sm text-muted-foreground">Loading tasks…</div>}
        {error && (
          <div className="rounded-lg border border-dashed border-destructive/30 py-6 text-center text-sm text-destructive">
            Failed to load tasks
          </div>
        )}

        {!isLoading && !error && (
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
            {isAdmin && (
              <TabsList className="mb-3">
                <TabsTrigger value="my">
                  My tasks
                  {countBadge(openCount(myTasks))}
                </TabsTrigger>
                <TabsTrigger value="team">
                  Team tasks
                  {countBadge(openCount(teamTasks))}
                </TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="my" className="mt-0">
              {renderTable(myTasks, "my", "No tasks assigned to you")}
            </TabsContent>

            {isAdmin && (
              <TabsContent value="team" className="mt-0">
                {renderTable(teamTasks, "team", "No tasks assigned to team members")}
              </TabsContent>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
