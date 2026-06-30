import { Card } from "@/components/ui/Card";

/** Maps a program track to its syllabus row field. */
const FIELD_BY_TRACK = {
  Aptitude: "aptitude",
  Coding: "coding",
  AI: "ai",
  "Communication Skills": "commSkills",
  SQL: "sql",
};

/**
 * Day-wise syllabus. Columns are derived from the program's tracks, so each
 * program shows exactly the subjects it teaches (Aptitude, Coding, AI,
 * Communication Skills, SQL …).
 */
export function SyllabusTable({ program }) {
  const columns = program.tracks
    .filter((t) => FIELD_BY_TRACK[t])
    .map((t) => ({ label: t, field: FIELD_BY_TRACK[t] }));

  return (
    <Card className="overflow-hidden">
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto scrollbar-thin md:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">
            {program.title} day-wise syllabus across {program.durationDays} days
          </caption>
          <thead>
            <tr className="bg-surface-2 text-left">
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Day
              </th>
              {columns.map((c) => (
                <th key={c.field} scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {program.syllabus.map((row) => (
              <tr key={row.day} className="transition-colors hover:bg-surface-2/60">
                <th scope="row" className="whitespace-nowrap px-4 py-3 text-left font-semibold text-brand">
                  Day {row.day}
                </th>
                {columns.map((c) => (
                  <td key={c.field} className="px-4 py-3 text-foreground/90">
                    {row[c.field] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <ul className="divide-y divide-border md:hidden">
        {program.syllabus.map((row) => (
          <li key={row.day} className="px-4 py-4">
            <p className="text-sm font-semibold text-brand">Day {row.day}</p>
            <dl className="mt-2 space-y-1.5 text-sm">
              {columns.map((c) => (
                <div key={c.field} className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted">{c.label}</dt>
                  <dd className="text-foreground/90">{row[c.field] || "—"}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </Card>
  );
}
