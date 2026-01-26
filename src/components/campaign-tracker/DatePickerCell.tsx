import { useState } from "react";
import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerCellProps {
  value: string;
  onChange: (value: string) => void;
  displayClassName?: string;
}

export function DatePickerCell({
  value,
  onChange,
  displayClassName,
}: DatePickerCellProps) {
  const [open, setOpen] = useState(false);

  // Try to parse existing date value
  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined;
    
    // Try common formats
    const formats = ["dd MMM yyyy", "d MMM yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "MMMM", "MMM"];
    for (const fmt of formats) {
      try {
        const parsed = parse(dateStr, fmt, new Date());
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      } catch {
        continue;
      }
    }
    return undefined;
  };

  const selectedDate = parseDate(value);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, "dd MMM yyyy"));
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-8 justify-start text-left font-normal px-2 hover:bg-muted/50",
            !value && "text-muted-foreground/50",
            displayClassName
          )}
        >
          <CalendarIcon className="mr-2 h-3 w-3" />
          {value || "Select date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
