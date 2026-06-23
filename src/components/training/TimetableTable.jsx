import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/** Colour activities so the daily rhythm reads at a glance. */
function activityTone(activity) {
  const a = activity.toLowerCase();
  if (a === "lunch") return "bg-surface-2 text-muted";
  if (a.includes("communication"))
    return "bg-violet-500/10 text-violet-600 ring-1 ring-inset ring-violet-500/20 dark:text-violet-400";
  if (a === "ai") return "bg-brand/10 text-brand ring-1 ring-inset ring-brand/20";
  if (a === "coding") return "bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400";
  if (a === "aptitude") return "bg-sky-500/10 text-sky-600 ring-1 ring-inset ring-sky-500/20 dark:text-sky-400";
  return "bg-surface-2 text-foreground";
}

export function TimetableTable({ timetable }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-3.5">
        <h3 className="text-sm font-semibold text-foreground">{timetable.batch}</h3>
        <p className="text-xs text-muted">Daily schedule</p>
      </div>

      {/* Desktop: horizontal timeline */}
      <div className="hidden overflow-x-auto scrollbar-thin sm:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              {timetable.slots.map((slot) => (
                <th
                  key={slot.time}
                  scope="col"
                  className="border-b border-border px-3 py-3 text-center text-xs font-medium text-muted"
                >
                  {slot.time}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {timetable.slots.map((slot) => (
                <td key={slot.time} className="px-3 py-4 text-center align-middle">
                  <span
                    className={cn(
                      "inline-flex min-w-[5.5rem] max-w-[9rem] items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-medium leading-tight",
                      activityTone(slot.activity),
                    )}
                  >
                    {slot.activity}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked rows */}
      <ul className="divide-y divide-border sm:hidden">
        {timetable.slots.map((slot) => (
          <li key={slot.time} className="flex items-center justify-between gap-3 px-5 py-3">
            <span className="text-sm text-muted">{slot.time}</span>
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium",
                activityTone(slot.activity),
              )}
            >
              {slot.activity}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
