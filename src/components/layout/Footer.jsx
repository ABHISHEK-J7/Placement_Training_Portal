import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "./Logo";

const PHONE = "+91 99726 58909";
const EMAIL = "support@toriiminds.com";

const footerLinks = [
  {
    heading: "Platform",
    links: [
      { label: "My Wings", href: "https://toriiminds.com/", external: true },
      { label: "Owl Code", href: "https://toriiminds.com/", external: true },
      { label: "Crowlytics", href: "https://toriiminds.com/", external: true },
      { label: "J-Path", href: "https://toriiminds.com/", external: true },
    ],
  },
  {
    heading: "Training",
    links: [
      { label: "Training Program", href: "/training" },
      { label: "Participants", href: "/training/students" },
      { label: "Careers", href: "https://toriiminds.com/", external: true },
    ],
  },
];

export function Footer() {
  const year = 2026; // build-time constant; avoids hydration mismatch

  return (
    <footer className="mt-24 border-t border-border bg-surface-2">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Step IN, Stand OUT with Torii — a gateway to tech excellence through
            experiential, AI-ready learning.
          </p>
        </div>

        {footerLinks.map((col) => (
          <div key={col.heading}>
            <h3 className="text-sm font-semibold text-foreground">{col.heading}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted transition-colors hover:text-brand"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition-colors hover:text-brand"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h3 className="text-sm font-semibold text-foreground">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="transition-colors hover:text-brand">
                Call: {PHONE}
              </a>
            </li>
            <li>
              <a href={`mailto:${EMAIL}`} className="transition-colors hover:text-brand">
                {EMAIL}
              </a>
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-border">
        <Container className="flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted sm:flex-row">
          <p>© {year} Torii Minds. All rights reserved.</p>
          <p>Step IN · Stand OUT</p>
        </Container>
      </div>
    </footer>
  );
}
