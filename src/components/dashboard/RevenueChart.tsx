import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const allData = [
  { name: "Jan", month: 0, thisYear: 24000, lastYear: 18000 },
  { name: "Feb", month: 1, thisYear: 28000, lastYear: 22000 },
  { name: "Mar", month: 2, thisYear: 32000, lastYear: 25000 },
  { name: "Apr", month: 3, thisYear: 27000, lastYear: 24000 },
  { name: "May", month: 4, thisYear: 35000, lastYear: 28000 },
  { name: "Jun", month: 5, thisYear: 42000, lastYear: 32000 },
  { name: "Jul", month: 6, thisYear: 38000, lastYear: 35000 },
  { name: "Aug", month: 7, thisYear: 45000, lastYear: 38000 },
  { name: "Sep", month: 8, thisYear: 52000, lastYear: 42000 },
  { name: "Oct", month: 9, thisYear: 48000, lastYear: 45000 },
  { name: "Nov", month: 10, thisYear: 55000, lastYear: 48000 },
  { name: "Dec", month: 11, thisYear: 62000, lastYear: 52000 },
];

const formatCurrency = (value: number) => {
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  return `£${value}`;
};

export function RevenueChart() {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(currentYear, 0, 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    new Date(currentYear, 11, 31)
  );

  const filteredData = useMemo(() => {
    if (!startDate && !endDate) return allData;

    const startMonth = startDate ? startDate.getMonth() : 0;
    const endMonth = endDate ? endDate.getMonth() : 11;

    return allData.filter(
      (item) => item.month >= startMonth && item.month <= endMonth
    );
  }, [startDate, endDate]);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          Year on Year Revenue
        </h3>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "MMM yyyy") : "Start"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "MMM yyyy") : "End"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 15%, 90%)" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 10%, 45%)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 10%, 45%)", fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `£${value.toLocaleString()}`,
                name === "thisYear" ? currentYear : lastYear,
              ]}
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(40, 15%, 90%)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
            <Legend
              formatter={(value) =>
                value === "thisYear" ? currentYear : lastYear
              }
            />
            <Line
              type="monotone"
              dataKey="lastYear"
              stroke="hsl(220, 10%, 65%)"
              strokeWidth={2}
              dot={{ fill: "hsl(220, 10%, 65%)", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="thisYear"
              stroke="hsl(38, 92%, 50%)"
              strokeWidth={2}
              dot={{ fill: "hsl(38, 92%, 50%)", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
