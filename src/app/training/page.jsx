import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgramExplorer } from "@/components/training/ProgramExplorer";
import { programs } from "@/data/programs";

export const metadata = {
  title: "Training Program — 2027 Batch",
  description:
    "Day-wise curriculum and daily timetables for the Torii Minds 2027 Batch: AI Ready Engineer (Aptitude, Coding, AI) and Placement Training (Aptitude, Coding).",
  alternates: { canonical: "/training" },
  openGraph: {
    title: "Training Program — 2027 Batch · Torii Minds",
    description:
      "Explore the AI Ready Engineer and Placement Training curricula — timetables, day-wise syllabus, and daily assessments.",
    url: "/training",
  },
};

const VALID_SLUGS = new Set([
  "ai-ready-engineer",
  "placement-training-batch-1",
  "placement-training-batch-2",
]);

export default function TrainingPage({ searchParams }) {
  const requested = searchParams?.track;
  const initialSlug = VALID_SLUGS.has(requested)
    ? requested
    : "ai-ready-engineer";

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_45%_at_50%_0%,rgb(var(--brand)/0.08),transparent_70%)]"
        />
        <Container className="py-14 sm:py-18">
          <Badge tone="brand" className="mb-4">
            2027 Batch · 4th Year
          </Badge>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Training Program & Curriculum
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            A journey across aptitude, coding, and applied AI — with a daily
            timetable and an end-of-day assessment from 8 to 9 PM. Switch tracks below to
            see each curriculum in full.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button href="/training/students" variant="secondary" size="md">
              View participants →
            </Button>
          </div>
        </Container>
      </section>

      <Container className="py-12">
        <ProgramExplorer programs={programs} initialSlug={initialSlug} />

        <div className="mt-14 rounded-2xl border border-border bg-surface-2 px-6 py-8 text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Want to see who&apos;s in the cohort?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
            Browse the full participant roster for both batches — searchable and
            filterable by branch.
          </p>
          <div className="mt-5 flex justify-center">
            <Button href="/training/students" size="md">
              Open participant roster
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted">
            Back to{" "}
            <Link href="/" className="text-brand hover:underline">
              home
            </Link>
          </p>
        </div>
      </Container>
    </>
  );
}
