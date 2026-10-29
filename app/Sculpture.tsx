// Decorative molded shapes beside the opening headline (DESIGN.md). Static and hidden from screen readers;
// they carry no meaning. Smaller on phones so text and actions are never covered.
const SHAPES = [
  { className: "left-[6%] top-[14%] size-[46%] rounded-full bg-mint" },
  { className: "right-[4%] top-[4%] h-[34%] w-[44%] rounded-[999px] bg-lavender rotate-[-14deg]" },
  { className: "right-[10%] bottom-[8%] size-[38%] rounded-[38%] bg-butter rotate-12" },
  { className: "left-[22%] bottom-[2%] h-[26%] w-[40%] rounded-[999px] bg-sky" },
  { className: "left-[44%] top-[36%] size-[20%] rounded-full bg-surface" },
];

export default function Sculpture({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`relative aspect-square ${className}`}>
      {SHAPES.map((s) => (
        <span key={s.className} className={`absolute ${s.className}`} style={{ boxShadow: "var(--clay-raised)" }} />
      ))}
    </div>
  );
}

// The MedWise mark: a molded shield with a cross.
export function Logo({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 2 4 7v8c0 7.5 5.1 13.4 12 15 6.9-1.6 12-7.5 12-15V7L16 2Z" fill="var(--dp-color-ink)" />
      <path d="M14 10h4v4h4v4h-4v4h-4v-4h-4v-4h4z" fill="var(--dp-color-accent)" />
    </svg>
  );
}
