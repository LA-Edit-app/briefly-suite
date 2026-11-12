import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  className?: string;
  ariaLabel: string;
}

// Spreadsheet-style cell: shows text, turns into an input on click.
// Enter (or leaving the cell) saves, Escape cancels.
export function EditableCell({
  value,
  onSave,
  placeholder,
  multiline = false,
  required = false,
  className,
  ariaLabel,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (required && !next) return setDraft(value);
    if (next !== value) onSave(next);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    const shared = {
      ref: inputRef,
      value: draft,
      "aria-label": ariaLabel,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commit();
        }
        if (e.key === "Escape") cancel();
      },
      className:
        "w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring",
    };
    return multiline ? <textarea rows={2} {...shared} className={cn(shared.className, "resize-none")} /> : <input {...shared} />;
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={ariaLabel}
      className={cn(
        "block w-full min-h-[28px] rounded-md px-2 py-1 text-left text-sm hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring",
        !value && "text-muted-foreground",
        className
      )}
    >
      {value || placeholder}
    </button>
  );
}
