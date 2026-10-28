import { useState } from "react";
import { Plus, X, Check, Pencil, ArrowUp, ArrowDown, UserCheck, Calendar, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateTask, useDeleteTask, useSwapTaskOrder, useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useIsAgencyAdmin, useAgencyMembers } from "@/hooks/useAgencyMembers";
import { useAuth } from "@/hooks/useAuth";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  completed: boolean;
  sort_order: number;
  assigned_to: string | null;
  created_by: string | null;
  due_date: string | null;
  assignee?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

const PRIORITY_CONFIG = {
  high: { label: "High", className: "border-red-400/60 text-red-600 dark:text-red-400" },
  medium: { label: "Medium", className: "border-amber-400/60 text-amber-600 dark:text-amber-400" },
  low: { label: "Low", className: "border-green-400/60 text-green-600 dark:text-green-500" },
} as const;

function formatDueDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isDueOrOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(iso) <= today;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium inline-flex items-center gap-1", cfg.className)}>
      <Flag className="h-2.5 w-2.5" />
      {cfg.label}
    </Badge>
  );
}

export function TaskList() {
  const { data: tasks = [], isLoading, error } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const swapTaskOrder = useSwapTaskOrder();

  const { data: isAdmin } = useIsAgencyAdmin();
  const { data: agencyMembersData } = useAgencyMembers();
  const { user } = useAuth();

  const memberOptions = (agencyMembersData ?? [])
    .filter((m) => m.profiles)
    .map((m) => ({
      id: m.user_id,
      name: [m.profiles?.first_name, m.profiles?.last_name].filter(Boolean).join(" ") || m.profiles?.email || "Unknown",
    }));

  // Create form state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  const resetCreateForm = () => {
    setNewTitle("");
    setNewDescription("");
    setNewPriority("medium");
    setNewAssigneeId("");
    setNewDueDate("");
    setIsAdding(false);
  };

  const addTask = async () => {
    if (!newTitle.trim()) return;
    try {
      const nextSortOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.sort_order)) + 1 : 0;
      await createTask.mutateAsync({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        priority: newPriority,
        completed: false,
        sort_order: nextSortOrder,
        assigned_to: isAdmin ? (newAssigneeId || null) : (user?.id ?? null),
        due_date: newDueDate || null,
      });
      resetCreateForm();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create task");
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      await updateTask.mutateAsync({ id: task.id, updates: { completed: !task.completed } });
    } catch (e: any) {
      toast.error(e?.message || "Failed to update task");
    }
  };

  const removeTask = async (id: string) => {
    try {
      await deleteTask.mutateAsync(id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete task");
    }
  };

  const moveTask = async (task: Task, direction: "up" | "down", visibleTasks: Task[]) => {
    const idx = visibleTasks.findIndex((t) => t.id === task.id);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= visibleTasks.length) return;
    const target = visibleTasks[targetIdx];
    try {
      await swapTaskOrder.mutateAsync({
        sourceId: task.id,
        sourceOrder: task.sort_order,
        targetId: target.id,
        targetOrder: target.sort_order,
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to reorder task");
    }
  };

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditPriority(task.priority ?? "medium");
    setEditAssigneeId(task.assigned_to ?? "");
    setEditDueDate(task.due_date ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditPriority("medium");
    setEditAssigneeId("");
    setEditDueDate("");
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return cancelEdit();
    try {
      await updateTask.mutateAsync({
        id: editingId,
        updates: {
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          priority: editPriority,
          due_date: editDueDate || null,
          ...(isAdmin ? { assigned_to: editAssigneeId || null } : {}),
        },
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to update task");
    }
    cancelEdit();
  };

  const myTasks = tasks.filter(
    (t) => t.assigned_to === user?.id || (!t.assigned_to && t.created_by === user?.id)
  );
  const teamTasks = tasks.filter((t) => t.assigned_to && t.assigned_to !== user?.id);
  const myPending = myTasks.filter((t) => !t.completed).length;
  const teamPending = teamTasks.filter((t) => !t.completed).length;

  const renderTaskRow = (task: Task, index: number, visibleTasks: Task[]) => {
    const isFirst = index === 0;
    const isLast = index === visibleTasks.length - 1;
    const dueDateFormatted = formatDueDate(task.due_date);
    const overdue = !task.completed && isDueOrOverdue(task.due_date);
    const isEditing = editingId === task.id;

    return (
      <div
        key={task.id}
        className={cn(
          "flex gap-2 p-2.5 rounded-lg border border-transparent group hover:bg-muted/50 hover:border-border transition-colors",
          isEditing ? "items-start" : "items-start",
          task.completed && "opacity-60"
        )}
      >
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => void toggleTask(task)}
          className="h-4 w-4 mt-0.5 shrink-0"
        />

        {isEditing ? (
          <div className="flex-1 min-w-0 space-y-1.5">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) void saveEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              className="h-7 text-sm"
              autoFocus
            />
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description (optional)"
              className="text-xs min-h-[56px] resize-none"
            />
            <div className="flex gap-2">
              <Select value={editPriority} onValueChange={setEditPriority}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="h-7 text-xs flex-1"
              />
            </div>
            {isAdmin && memberOptions.length > 0 && (
              <Select
                value={editAssigneeId || "__unassigned__"}
                onValueChange={(v) => setEditAssigneeId(v === "__unassigned__" ? "" : v)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Assign to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">Unassigned</SelectItem>
                  {memberOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-1 pt-0.5">
              <Button size="sm" className="h-7 text-xs px-3" onClick={() => void saveEdit()}>Save</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={cancelEdit}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <span
              className={cn(
                "text-sm block text-foreground cursor-pointer leading-snug",
                task.completed && "line-through text-muted-foreground"
              )}
              onClick={() => !task.completed && startEditing(task)}
            >
              {task.title}
            </span>
            {task.description && !task.completed && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-1">
              <PriorityBadge priority={task.priority ?? "medium"} />
              {dueDateFormatted && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-medium inline-flex items-center gap-1",
                    overdue && "border-destructive/50 text-destructive"
                  )}
                >
                  <Calendar className="h-2.5 w-2.5" />
                  {dueDateFormatted}
                </Badge>
              )}
              {task.assignee && (
                <Badge variant="outline" className="text-[10px] font-medium inline-flex items-center gap-1">
                  <UserCheck className="h-2.5 w-2.5" />
                  {[task.assignee.first_name, task.assignee.last_name].filter(Boolean).join(" ") || task.assignee.email || "Unknown"}
                </Badge>
              )}
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity mt-0.5">
            {!isFirst && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => void moveTask(task, "up", visibleTasks)} title="Move up">
                <ArrowUp className="h-3 w-3" />
              </Button>
            )}
            {!isLast && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => void moveTask(task, "down", visibleTasks)} title="Move down">
                <ArrowDown className="h-3 w-3" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditing(task)} title="Edit">
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => void removeTask(task.id)} title="Delete">
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderEmptyState = (message: string) => (
    <div className="rounded-lg border border-dashed border-border py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

  const addForm = isAdding && (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3 mb-3">
      <Input
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) void addTask();
          if (e.key === "Escape") resetCreateForm();
        }}
        placeholder="Task title"
        className="h-8 text-sm"
        autoFocus
      />
      <Textarea
        value={newDescription}
        onChange={(e) => setNewDescription(e.target.value)}
        placeholder="Description (optional)"
        className="text-xs min-h-[56px] resize-none"
      />
      <div className="flex gap-2">
        <Select value={newPriority} onValueChange={setNewPriority}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          className="h-8 text-xs flex-1"
        />
      </div>
      {isAdmin && memberOptions.length > 0 && (
        <Select
          value={newAssigneeId || "__unassigned__"}
          onValueChange={(v) => setNewAssigneeId(v === "__unassigned__" ? "" : v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Assign to (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unassigned__">Unassigned</SelectItem>
            {memberOptions.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="flex gap-2 pt-0.5">
        <Button size="sm" className="h-8 text-xs" onClick={() => void addTask()} disabled={!newTitle.trim()}>
          Add task
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={resetCreateForm}>
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold tracking-tight">Tasks</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsAdding(true)}
            title="Add task"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading tasks…</div>
        )}
        {error && (
          <div className="rounded-lg border border-dashed border-destructive/30 py-6 text-center text-sm text-destructive">
            Failed to load tasks
          </div>
        )}

        {!isLoading && !error && (
          <Tabs defaultValue="my">
            <TabsList className={cn("mb-3", isAdmin ? "grid w-full grid-cols-2" : "hidden")}>
              <TabsTrigger value="my">
                My Tasks
                {myPending > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{myPending}</Badge>
                )}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="team">
                  Team Tasks
                  {teamPending > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{teamPending}</Badge>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="my" className="mt-0">
              {addForm}
              <div className="space-y-1 max-h-[420px] overflow-y-auto pr-0.5">
                {myTasks.length === 0 && !isAdding
                  ? renderEmptyState("No tasks assigned to you")
                  : myTasks.map((task, i) => renderTaskRow(task as Task, i, myTasks as Task[]))}
              </div>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="team" className="mt-0">
                <div className="space-y-1 max-h-[420px] overflow-y-auto pr-0.5">
                  {teamTasks.length === 0
                    ? renderEmptyState("No tasks assigned to team members")
                    : teamTasks.map((task, i) => renderTaskRow(task as Task, i, teamTasks as Task[]))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}

        {!isLoading && !error && (
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
            {tasks.filter((t) => !t.completed).length} remaining · {tasks.length} total
          </p>
        )}
      </CardContent>
    </Card>
  );
}
