/** Tiny classname joiner (avoids pulling in a dependency). */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/** Normalise a USN to its canonical uppercase form for display/search. */
export function normalizeUsn(usn) {
  return usn.trim().toUpperCase();
}

/** Stable, case-insensitive sort by name. */
export function byName(a, b) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}
