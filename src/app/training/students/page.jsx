import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StudentRoster } from "@/components/students/StudentRoster";
import { allRosters } from "@/data/students";

export const metadata = {
  title: "Participants — 2027 Batch",
  description:
    "Searchable roster of Torii Minds 2027 Batch participants across the AI Ready Engineer and Placement Training programs — filter by branch and batch.",
  alternates: { canonical: "/training/students" },
  openGraph: {
    title: "Participants — 2027 Batch · Torii Minds",
    description:
      "Browse and search the full 2027 Batch participant roster, filterable by branch and program.",
    url: "/training/students",
  },
};

export default function StudentsPage() {
  const total = allRosters.reduce((sum, r) => sum + r.students.length, 0);

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_45%_at_50%_0%,rgb(var(--brand)/0.08),transparent_70%)]"
        />
        <Container className="py-14 sm:py-18">
          <Badge tone="brand" className="mb-4">
            2027 Batch · Participants
          </Badge>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Cohort Roster
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {total} participants across both training tracks. Search by name or USN, or
            filter by branch and batch.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button href="/training" variant="secondary" size="md">
              ← Back to program
            </Button>
          </div>
        </Container>
      </section>

      <Container className="py-12">
        {/* Per-batch summary */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {allRosters.map((r) => (
            <Card key={r.slug} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{r.title}</p>
                <p className="text-xs text-muted">Program cohort</p>
              </div>
              <span className="text-2xl font-bold text-brand">{r.students.length}</span>
            </Card>
          ))}
        </div>

        <StudentRoster rosters={allRosters} />

        <p className="mt-10 text-center text-xs text-muted">
          Back to{" "}
          <Link href="/" className="text-brand hover:underline">
            home
          </Link>{" "}
          ·{" "}
          <Link href="/training" className="text-brand hover:underline">
            training program
          </Link>
        </p>
      </Container>
    </>
  );
}
