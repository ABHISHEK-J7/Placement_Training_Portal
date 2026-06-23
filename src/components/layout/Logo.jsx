import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Torii Minds brand logo — the official "Step IN, Stand OUT" gate mark.
 * Source: public/logo.png (trimmed from the supplied transparent PNG).
 */
export function Logo({ className }) {
  return (
    <Link
      href="/"
      aria-label="Torii Minds — Home"
      className={cn("group inline-flex items-center", className)}
    >
      <Image
        src="/logo.png"
        alt="Torii Minds"
        width={794}
        height={256}
        priority
        unoptimized
        className="h-[30px] w-auto transition-transform duration-300 group-hover:-translate-y-0.5"
      />
    </Link>
  );
}
