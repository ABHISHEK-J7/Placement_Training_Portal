/** Read-only 5-star rating display. `value` is 0–5 (decimals rounded). */
export function Stars({ value = 0, size = 14 }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          className={i < full ? "text-amber-500" : "text-border"}
        >
          <path d="m12 2 3 6.3 6.9.9-5 4.8 1.2 6.8L12 17.8 5.9 20.8 7.1 14l-5-4.8 6.9-.9L12 2Z" />
        </svg>
      ))}
    </span>
  );
}
