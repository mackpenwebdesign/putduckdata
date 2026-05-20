import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const PRESETS = [
  { key: "today", label: "Today", days: 1 },
  { key: "yesterday", label: "Yesterday", days: 1 },
  { key: "7days", label: "7 Days", days: 7 },
  { key: "30days", label: "30 Days", days: 30 },
  { key: "all", label: "All Time" },
];

const DateRangePicker = ({ value, onChange, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState(null);

  const range = value || { start: null, end: null, preset: "today" };
  const label = range.preset
    ? PRESETS.find((p) => p.key === range.preset)?.label || "Custom"
    : "Custom";

  const handlePreset = (preset) => {
    onChange({ preset, start: null, end: null });
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-white hover:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all text-sm font-medium"
      >
        <Calendar className="w-4 h-4" />
        {label}
        <ChevronRight className="w-4 h-4 ml-auto opacity-70" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl z-50 p-3">
          {/* Presets */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => handlePreset(p.key)}
                className={`p-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  range.preset === p.key
                    ? "bg-primary-600 text-white shadow-md"
                    : "text-dark-300 hover:bg-dark-800 hover:text-white"
                }`}
              >
                {range.preset === p.key && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                )}
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom dates (future) */}
          <div className="text-xs text-dark-500 text-center py-2 border-t border-dark-800">
            Custom dates coming soon
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
