import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { programs } from "@/data/programs";
import { allRosters } from "@/data/students";

export const metadata = {
  title: "Step IN, Stand OUT",
  description:
    "Torii Minds 2027 Batch training — AI Ready Engineer and Placement Training programs with day-wise curriculum and participant rosters.",
};

export default function HomePage() {
  const totalParticipants = allRosters.reduce(
    (sum, r) => sum + r.students.length,
    0,
  );

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgb(var(--brand)/0.10),transparent_70%)]"
        />
        <Container className="py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <Badge tone="brand" className="mb-5">
              Step IN, Stand OUT
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Placement Training{" "}
              <span className="text-gradient-brand">Batch 1</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              Three cohorts — <strong className="text-foreground">AI Ready Engineer</strong>,{" "}
              <strong className="text-foreground">Placement Training Batch 1</strong> and{" "}
              <strong className="text-foreground">Batch 2</strong> — blending aptitude, coding,
              communication skills, and applied AI to take engineers from trainee to skilled professional.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button href="/training" size="lg">
                Explore the Program
              </Button>
              <Button href="/training/students" variant="secondary" size="lg">
                View Participants
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Program cards */}
      <Container className="pb-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <Card key={p.slug} interactive className="p-7">
              <Badge tone="neutral">{p.tagline}</Badge>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
                {p.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {p.tracks.map((t) => (
                  <Badge key={t} tone="brand">
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-4 text-sm text-muted">
                <span>{p.durationDays} days</span>
                <span aria-hidden>·</span>
                <span>Pre-assessment + daily tests</span>
              </div>
              <div className="mt-6">
                <Button href={`/training?track=${p.slug}`} variant="secondary" size="sm">
                  See curriculum →
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Programs", value: programs.length },
            { label: "Training days", value: 12 },
            { label: "Participants", value: totalParticipants },
            { label: "Daily tests", value: "9 – 9:30 AM" },
          ].map((s) => (
            <Card key={s.label} className="p-5 text-center">
              <p className="text-2xl font-bold text-foreground sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted">{s.label}</p>
            </Card>
          ))}
        </div>
      </Container>
    </>
  );
}
