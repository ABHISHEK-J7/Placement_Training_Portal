import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgramExplorer } from "@/components/training/ProgramExplorer";
import { programs } from "@/data/programs";

export const metadata = {
  title: "Training",
};

const VALID_SLUGS = new Set([
  "ai-ready-engineer",
  "placement-training-batch-1",
  "placement-training-batch-2",
  "placement-training-batch-3",
  "tns-foundation-batch-4",
  "tns-foundation-batch-5",
]);

export default function TrainingPage({ searchParams }) {
  const requested = searchParams?.track;
  const initialSlug = VALID_SLUGS.has(requested) ? requested : "ai-ready-engineer";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2">
            <Badge tone="brand">2027 Batch · 4th Year</Badge>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Training Program &amp; Curriculum
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            A journey across aptitude, coding, and applied AI — with a daily timetable and a
            30-minute daily test. Switch tracks below to see each curriculum in full.
          </p>
        </div>
        <Button href="/students" variant="secondary" size="md">
          View students →
        </Button>
      </div>

      <ProgramExplorer programs={programs} initialSlug={initialSlug} />
    </div>
  );
}
