import type { Database } from "@/integrations/supabase/types";

export type TaskStatus = "not_started" | "in_progress" | "done";
export type TaskPriority = "high" | "medium" | "low";

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"] & {
  assignee: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

export const STATUS_OPTIONS: { value: TaskStatus; label: string; dot: string; pill: string }[] = [
  { value: "not_started", label: "Not started", dot: "bg-muted-foreground", pill: "bg-muted text-foreground" },
  { value: "in_progress", label: "In progress", dot: "bg-blue-500", pill: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { value: "done", label: "Done", dot: "bg-green-500", pill: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
];

export const PRIORITY_OPTIONS: { value: TaskPriority; label: string; className: string }[] = [
  { value: "high", label: "High", className: "text-red-600 dark:text-red-400" },
  { value: "medium", label: "Medium", className: "text-amber-600 dark:text-amber-400" },
  { value: "low", label: "Low", className: "text-green-600 dark:text-green-500" },
];

export const statusOption = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];

export const priorityOption = (priority: string) =>
  PRIORITY_OPTIONS.find((p) => p.value === priority) ?? PRIORITY_OPTIONS[1];

export const isDone = (task: Pick<TaskRow, "status">) => task.status === "done";

// My tasks: assigned to me, or unassigned and created by me.
export const isMyTask = (task: TaskRow, userId: string | undefined) =>
  !!userId && (task.assigned_to === userId || (!task.assigned_to && task.created_by === userId));

// Team tasks (issue #17): assigned to someone other than the person who created them.
export const isTeamTask = (task: TaskRow) =>
  !!task.assigned_to && task.assigned_to !== task.created_by;

// Soonest due date first; tasks without a date last; then oldest first.
export const compareTasks = (a: TaskRow, b: TaskRow) => {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  return (a.created_at ?? "").localeCompare(b.created_at ?? "");
};

export function formatDueDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Due today or earlier (dates are calendar days, compared as YYYY-MM-DD).
export function isDueOrOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return iso <= today;
}

export function personName(p: { first_name: string | null; last_name: string | null; email: string | null } | null | undefined) {
  if (!p) return "";
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Unknown";
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
