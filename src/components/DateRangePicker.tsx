"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Preset date ranges
const PRESETS = [
  { label: "This Weekend", days: 3 },
  { label: "Next 2 Weeks", days: 14 },
  { label: "This Month", days: 30 },
  { label: "Next 3 Months", days: 90 },
  { label: "Next 6 Months", days: 180 },
];

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label?: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetSelect = (days: number, label: string) => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    onChange({
      startDate,
      endDate,
      label,
    });
    setIsOpen(false);
  };

  const handleCustomDateChange = (type: "start" | "end", dateStr: string) => {
    const date = new Date(dateStr);
    if (type === "start") {
      onChange({
        ...value,
        startDate: date,
        label: "Custom",
      });
    } else {
      onChange({
        ...value,
        endDate: date,
        label: "Custom",
      });
    }
  };

  const formatDisplayDate = () => {
    if (value.label && value.label !== "Custom") {
      return value.label;
    }

    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const start = value.startDate.toLocaleDateString("en-US", options);
    const end = value.endDate.toLocaleDateString("en-US", options);
    return `${start} - ${end}`;
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-500" />
          <span>{formatDisplayDate()}</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
          {/* Quick Presets */}
          <div className="p-3 border-b border-zinc-700">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
              Quick Select
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetSelect(preset.days, preset.label)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm transition-colors",
                    value.label === preset.label
                      ? "bg-cyan-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Inputs */}
          <div className="p-3">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
              Custom Range
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">From</label>
                <input
                  type="date"
                  value={value.startDate.toISOString().split("T")[0]}
                  onChange={(e) => handleCustomDateChange("start", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">To</label>
                <input
                  type="date"
                  value={value.endDate.toISOString().split("T")[0]}
                  onChange={(e) => handleCustomDateChange("end", e.target.value)}
                  min={value.startDate.toISOString().split("T")[0]}
                  className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Apply Button */}
          <div className="p-3 border-t border-zinc-700">
            <Button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
