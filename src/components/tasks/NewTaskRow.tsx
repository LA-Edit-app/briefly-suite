import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MemberOption } from "./TaskTableRow";

interface NewTaskRowProps {
  // On the Team tab a new task must be for someone, so the row asks who.
  askAssignee: boolean;
  memberOptions: MemberOption[];
  saving: boolean;
  onCreate: (task: { title: string; assigned_to: string | null }) => Promise<boolean>;
  onCancel: () => void;
}

export function NewTaskRow({ askAssignee, memberOptions, saving, onCreate, onCancel }: NewTaskRowProps) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");

  const canSave = !!title.trim() && (!askAssignee || !!assignee);

  // Clear the field straight away so the next task can be typed while this one saves;
  // put the text back if saving fails.
  const save = async () => {
    if (!canSave) return;
    const submitted = title.trim();
    setTitle("");
    const ok = await onCreate({ title: submitted, assigned_to: askAssignee ? assignee : null });
    if (!ok) setTitle((current) => current || submitted);
  };

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell className="w-10 px-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel} title="Cancel" aria-label="Cancel new task">
          <X className="h-4 w-4" />
        </Button>
      </TableCell>
      <TableCell colSpan={askAssignee ? 2 : 6} className="px-1">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) void save();
            if (e.key === "Escape") onCancel();
          }}
          placeholder={askAssignee ? "Task name — pick who it's for, then press Enter" : "Task name — press Enter to add"}
          aria-label="New task name"
          className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </TableCell>
      {askAssignee && (
        <>
          <TableCell className="px-1">
            {memberOptions.length === 0 ? (
              <span className="px-2 text-sm text-muted-foreground">No other members to assign to</span>
            ) : (
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="h-8 text-sm" aria-label="Assign new task to">
                <SelectValue placeholder="Assign to…" />
              </SelectTrigger>
              <SelectContent>
                {memberOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            )}
          </TableCell>
          <TableCell colSpan={3} className="px-1">
            <Button size="sm" className="h-8" onClick={() => void save()} disabled={!canSave}>
              {saving ? "Adding…" : "Add task"}
            </Button>
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
