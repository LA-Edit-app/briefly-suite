import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";
import { EditableCell } from "./EditableCell";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  formatDueDate,
  initials,
  isDone,
  isDueOrOverdue,
  personName,
  priorityOption,
  statusOption,
  type TaskRow,
} from "./taskHelpers";

type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export interface MemberOption {
  id: string;
  name: string;
}

interface TaskTableRowProps {
  task: TaskRow;
  isAdmin: boolean;
  memberOptions: MemberOption[];
  onUpdate: (id: string, updates: TaskUpdate) => void;
  onDelete: (task: TaskRow) => void;
}

const UNASSIGNED = "__unassigned__";

export function PersonChip({ name }: { name: string }) {
  if (!name) return <span className="text-sm text-muted-foreground">Unassigned</span>;
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
        {initials(name)}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}

function DueDateCell({ value, overdue, onSave }: { value: string | null; overdue: boolean; onSave: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        defaultValue={value ?? ""}
        aria-label="Due date"
        onChange={(e) => onSave(e.target.value || null)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === "Escape") && setEditing(false)}
        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label="Due date"
      className={cn(
        "block w-full min-h-[28px] whitespace-nowrap rounded-md px-2 py-1 text-left text-sm hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring",
        !value && "text-muted-foreground",
        overdue && "font-medium text-destructive"
      )}
    >
      {value ? formatDueDate(value) : "Add date"}
    </button>
  );
}

export function TaskTableRow({ task, isAdmin, memberOptions, onUpdate, onDelete }: TaskTableRowProps) {
  const done = isDone(task);
  const status = statusOption(task.status);
  const priority = priorityOption(task.priority);
  const assigneeName = personName(task.assignee);

  return (
    <TableRow className={cn("group", done && "bg-muted/20")}>
      <TableCell className="w-10 px-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive/70 hover:text-destructive"
          onClick={() => onDelete(task)}
          title="Delete task"
          aria-label={`Delete task ${task.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>

      <TableCell className="min-w-[200px] px-1">
        <EditableCell
          value={task.title}
          required
          ariaLabel="Task name"
          onSave={(title) => onUpdate(task.id, { title })}
          className={cn("font-medium", done && "line-through text-muted-foreground")}
        />
      </TableCell>

      <TableCell className="w-[130px] px-1">
        <DueDateCell
          value={task.due_date}
          overdue={!done && isDueOrOverdue(task.due_date)}
          onSave={(due_date) => onUpdate(task.id, { due_date })}
        />
      </TableCell>

      <TableCell className="w-[180px] px-1">
        {isAdmin ? (
          <Select
            value={task.assigned_to ?? UNASSIGNED}
            onValueChange={(v) => onUpdate(task.id, { assigned_to: v === UNASSIGNED ? null : v })}
          >
            <SelectTrigger className="h-8 border-transparent bg-transparent px-2 shadow-none hover:bg-muted/60" aria-label="Assignee">
              <SelectValue>
                <PersonChip name={assigneeName} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {memberOptions.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="px-2">
            <PersonChip name={assigneeName} />
          </div>
        )}
      </TableCell>

      <TableCell className="min-w-[148px] px-1">
        <Select value={status.value} onValueChange={(v) => onUpdate(task.id, { status: v })}>
          <SelectTrigger
            className={cn("h-7 w-[132px] shrink-0 justify-start gap-1.5 rounded-full border-0 px-3 text-xs font-medium shadow-none [&>span]:line-clamp-none [&>svg]:ml-auto", status.pill)}
            aria-label="Status"
          >
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status.dot)} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell className="w-[110px] px-1">
        <Select value={priority.value} onValueChange={(v) => onUpdate(task.id, { priority: v })}>
          <SelectTrigger
            className={cn("h-8 border-transparent bg-transparent px-2 text-sm shadow-none hover:bg-muted/60", priority.className)}
            aria-label="Priority"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell className="min-w-[220px] px-1">
        <EditableCell
          value={task.description ?? ""}
          multiline
          placeholder="Add description"
          ariaLabel="Description"
          onSave={(description) => onUpdate(task.id, { description: description || null })}
          className="text-muted-foreground"
        />
      </TableCell>
    </TableRow>
  );
}
