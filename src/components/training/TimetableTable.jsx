import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/** Colour activities so the daily rhythm reads at a glance. */
function activityTone(activity) {
  const a = activity.toLowerCase();
  if (a === "lunch") return "bg-surface-2 text-muted";
  if (a.includes("communication"))
    return "bg-violet-500/10 text-violet-600 ring-1 ring-inset ring-violet-500/20 dark:text-violet-400";
  if (a === "sql")
    return "bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400";
  if (a === "ai") return "bg-brand/10 text-brand ring-1 ring-inset ring-brand/20";
  if (a === "coding") return "bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400";
  if (a === "aptitude") return "bg-sky-500/10 text-sky-600 ring-1 ring-inset ring-sky-500/20 dark:text-sky-400";
  return "bg-surface-2 text-foreground";
}

const rowLabel =
  "sticky left-0 z-10 bg-surface px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted";

export function TimetableTable({ timetable }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-3.5">
        <h3 className="text-sm font-semibold text-foreground">{timetable.batch}</h3>
        <p className="text-xs text-muted">Daily schedule</p>
      </div>

      {/* Desktop / tablet: timings · class · trainers grid */}
      <div className="hidden overflow-x-auto scrollbar-thin sm:block">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <tbody>
            {/* Timings */}
            <tr className="border-b border-border">
              <th scope="row" className={rowLabel}>
                Timings
              </th>
              {timetable.slots.map((slot) => (
                <td
                  key={slot.time}
                  className="px-3 py-3 text-center text-xs font-medium text-muted"
                >
                  {slot.time}
                </td>
              ))}
            </tr>

            {/* Class */}
            <tr className="border-b border-border">
              <th scope="row" className={rowLabel}>
                Class
              </th>
              {timetable.slots.map((slot) => (
                <td key={slot.time} className="px-3 py-4 text-center align-middle">
                  <span
                    className={cn(
                      "inline-flex min-w-[5.5rem] max-w-[10rem] items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-medium leading-tight",
                      activityTone(slot.activity),
                    )}
                  >
                    {slot.activity}
                  </span>
                </td>
              ))}
            </tr>

            {/* Trainers */}
            <tr>
              <th scope="row" className={rowLabel}>
                Trainers
              </th>
              {timetable.slots.map((slot) => (
                <td
                  key={slot.time}
                  className="px-3 py-3 text-center text-xs leading-snug text-foreground/80"
                >
                  {slot.trainers ? slot.trainers : <span className="text-muted">—</span>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards per slot */}
      <ul className="divide-y divide-border sm:hidden">
        {timetable.slots.map((slot) => (
          <li key={slot.time} className="px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">{slot.time}</span>
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium",
                  activityTone(slot.activity),
                )}
              >
                {slot.activity}
              </span>
            </div>
            {slot.trainers && (
              <p className="mt-1.5 text-xs text-muted">
                <span className="font-medium text-foreground/70">Trainers:</span>{" "}
                {slot.trainers}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
