// The MedWise mark: a shield with a cross. (The decorative shapes that used to live here were removed with
// the clay style; the file keeps its name to avoid deleting files without the owner's say.)
export function Logo({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 2 4 7v8c0 7.5 5.1 13.4 12 15 6.9-1.6 12-7.5 12-15V7L16 2Z" fill="var(--dp-color-ink)" />
      <path d="M14 10h4v4h4v4h-4v4h-4v-4h-4v-4h4z" fill="var(--dp-color-accent)" />
    </svg>
  );
}
