import { Card } from "@/components/ui/Card";

/**
 * Day-wise syllabus. Renders an accessible table on larger screens and a
 * stacked card list on mobile. The AI column appears only when the program
 * includes an AI track.
 */
export function SyllabusTable({ program }) {
  const hasAi = program.tracks.includes("AI");

  return (
    <Card className="overflow-hidden">
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto scrollbar-thin md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            {program.title} day-wise syllabus across {program.durationDays} days
          </caption>
          <thead>
            <tr className="bg-surface-2 text-left">
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Day
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Aptitude
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Coding
              </th>
              {hasAi && (
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  AI
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {program.syllabus.map((row) => (
              <tr key={row.day} className="transition-colors hover:bg-surface-2/60">
                <th scope="row" className="whitespace-nowrap px-4 py-3 text-left font-semibold text-brand">
                  Day {row.day}
                </th>
                <td className="px-4 py-3 text-foreground/90">{row.aptitude}</td>
                <td className="px-4 py-3 text-foreground/90">{row.coding}</td>
                {hasAi && <td className="px-4 py-3 text-foreground/90">{row.ai}</td>}
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
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-muted">Aptitude</dt>
                <dd className="text-foreground/90">{row.aptitude}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-muted">Coding</dt>
                <dd className="text-foreground/90">{row.coding}</dd>
              </div>
              {hasAi && (
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted">AI</dt>
                  <dd className="text-foreground/90">{row.ai}</dd>
                </div>
              )}
            </dl>
          </li>
        ))}
      </ul>
    </Card>
  );
}
