"use client";

import type { ReactNode } from "react";
import type { Result } from "@/lib/recommend/recommend";

// Result screen (docs/DESIGN.md, screen 2): cards in this exact order. Red only for safety alerts.
// Detail cards fold away (native <details>) so the recommendation stays the hero.
type Shown = Omit<Result, "audit">;

const NOT_YET = "Not yet in the knowledge base.";
const ACTION_LABELS: Record<string, string> = {
  review_at_48_72h: "Review at 48–72 h",
  de_escalate: "De-escalate",
  stop: "Stop",
  iv_to_oral: "IV → oral",
  review_duration: "Review duration",
  source_control: "Source control",
  send_cultures: "Send cultures",
};
const GUIDELINE_NAMES: Record<string, string> = {
  ssc2026: "SSC 2026",
  idsa2026: "IDSA 2026",
  ncdc2025: "NCDC/ICMR 2025",
  aware2023: "WHO AWaRe 2023",
};
const guideline = (id: string) => GUIDELINE_NAMES[id] ?? id;
const title = (drug: string) => drug.replace(/(^|[\s-])([a-z])/g, (_, s: string, c: string) => s + c.toUpperCase());
const regimenTitle = (name: string) => name.split(" + ").map(title).join(" + ");
const isAlert = (flag: string) => /cross-reactivity|not given|Not recommended|not for patient care/.test(flag);

export default function ResultView({ result, onEdit, onStartAgain }: { result: Shown; onEdit: () => void; onStartAgain: () => void }) {
  const r = result;
  const drugs = r.regimen?.drugs ?? [];
  const draft = r.versions.knowledgeBase.endsWith("-draft");

  return (
    <div className="flex flex-col gap-4">
      {r.demo ? (
        <Banner title="DEMO — not for patient care">
          Stand-in answer from the guideline table and a draft knowledge base. The real AI is not connected yet.
        </Banner>
      ) : (
        draft && <Banner title="Draft knowledge base — not for patient care">Answered by the AI; the tables it draws on are not signed off yet.</Banner>
      )}

      {r.status !== "recommendation" && (
        <section className="rise rounded-xl border-2 border-red bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-red">
            <Icon name="alert" />
            <h2 className="text-lg font-semibold">No recommendation</h2>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {r.messages.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </div>
        </section>
      )}

      {r.status === "recommendation" && r.regimen && (
        <>
          {/* 1. Recommendation: the hero, with the AI's one-line reason */}
          <section className="rise relative overflow-hidden rounded-2xl bg-navy p-5 text-white shadow-lg sm:p-6">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full border-[28px] border-accent/30" />
            <div className="relative flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Recommended empiric regimen</h2>
              <TableChip match={r.tableMatch} />
            </div>
            <p className="relative mt-2 font-display text-3xl leading-tight sm:text-4xl">{regimenTitle(r.regimen.name)}</p>
            <ul className="relative mt-4 grid gap-2 sm:grid-cols-2">
              {drugs.map((d) => (
                <li key={d.drug} className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{title(d.drug)}</span>
                    <Aware group={d.aware} />
                  </div>
                  <span className="mt-1 block font-mono text-sm text-white/90">
                    {[d.dose, d.interval].filter(Boolean).join(" · ") || NOT_YET}
                  </span>
                </li>
              ))}
            </ul>

            {r.whyThisChoice && (
              <div className="relative mt-4 rounded-xl bg-white p-4 text-ink">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  <Icon name="spark" small /> Why this antibiotic
                </p>
                <p className="mt-1.5 font-serif text-xl leading-snug">{r.whyThisChoice}</p>
                {r.keyReasons && r.keyReasons.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {r.keyReasons.map((k) => (
                      <li key={k} className="flex items-start gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-sm text-navy">
                        <span aria-hidden className="text-accent">✓</span>
                        {k}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {r.alternatives && r.alternatives.length > 0 && (
              <p className="relative mt-3 text-sm text-white/80">
                <span className="font-semibold text-white">Alternatives: </span>
                {r.alternatives.map((a) => regimenTitle(a.name)).join(" · ")}
              </p>
            )}
          </section>

          {/* 2. How to give it */}
          <Card icon="clock" title="How to give it" open>
            <div className="flex flex-col gap-3">
              {drugs.map((d) => (
                <div key={d.drug} className="rounded-lg bg-cream/70 p-3">
                  <p className="font-semibold text-navy">{title(d.drug)}</p>
                  <dl className="mt-1 grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-0.5 text-sm">
                    <dt className="text-muted">Dose</dt>
                    <dd className="font-mono">{d.dose || NOT_YET}</dd>
                    <dt className="text-muted">Interval</dt>
                    <dd className="font-mono">{d.interval || NOT_YET}</dd>
                    <dt className="text-muted">Infusion</dt>
                    <dd className="font-mono">{d.infusion || NOT_YET}</dd>
                  </dl>
                  {d.notes.map((n) => (
                    <p key={n} className="mt-2 border-l-2 border-accent pl-2 text-sm">
                      {n}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          {/* 3. Coverage */}
          <Card icon="grid" title="Coverage" open>
            <p className="text-sm text-muted">What this regimen covers, from the knowledge base.</p>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {r.coverage?.map((c) => (
                <li key={c.key} className="rounded-lg border border-rule p-2.5">
                  <span className="block text-sm">{c.label}</span>
                  <Meter level={c.level} />
                  <span className={`mt-1 block text-xs font-semibold uppercase tracking-wider ${c.level === "yes" ? "text-accent" : "text-muted"}`}>
                    {c.level === "yes" ? "Yes" : c.level === "limited" ? "Limited" : "No"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* 4. Spectrum fit: words only, no score */}
          <Card icon="target" title="Spectrum fit">
            <div className="flex flex-col gap-3">
              <FitGroup title="Needed and covered" tone="good" lines={r.spectrumFit?.filter((f) => f.status === "covered")} />
              <FitGroup title="Needed, only partly covered" tone="part" lines={r.spectrumFit?.filter((f) => f.status === "partly")} />
              <FitGroup title="Needed but NOT covered" tone="danger" lines={r.spectrumFit?.filter((f) => f.status === "missing")} />
              <FitGroup title="Covered but not needed (excess)" tone="excess" lines={r.spectrumFit?.filter((f) => f.status === "excess")} />
            </div>
          </Card>

          {/* 5. Will it reach the site? */}
          <Card icon="pin" title="Will it reach the site?">
            {drugs.map((d) => (
              <p key={d.drug} className="mt-1 first:mt-0">
                <span className="font-semibold">{title(d.drug)}: </span>
                {d.sitePenetration || NOT_YET}
              </p>
            ))}
          </Card>

          {/* 6. Safety: table facts, then the AI-written interaction notes, clearly labelled */}
          <Card icon="shield" title="Safety and interactions" open>
            {r.flags.filter((f) => f.startsWith("Possible cross-reactivity")).map((f) => (
              <p key={f} className="mb-2 font-semibold text-red">
                {f}
              </p>
            ))}
            {r.interactions && r.interactions.length > 0 && (
              <div className="rounded-lg border border-dashed border-accent bg-accent/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">AI-written — verify before acting</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {r.interactions.map((i) => (
                    <li key={i.drug + i.text}>
                      <span className="font-semibold">{title(i.drug)}: </span>
                      {i.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 flex flex-col gap-2">
              {drugs.map((d) => (
                <div key={d.drug} className="text-sm">
                  <p className="font-semibold text-navy">{title(d.drug)} · from the knowledge base</p>
                  <p>Interactions: {d.interactions || NOT_YET}</p>
                  <p>Monitoring: {d.monitoring || NOT_YET}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* 7. Why this antibiotic: the full reasoning, with the guideline passages */}
          <Card icon="book" title="Reasoning and guideline evidence">
            <p className="font-serif text-lg leading-relaxed">{r.reasoning}</p>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Guideline passages cited</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {r.citations?.map((c) => (
                <li key={c.passage_id + c.quote} className="rounded-r-lg border-l-4 border-accent bg-cream/70 px-3 py-2">
                  <span className="font-serif text-lg">“{c.quote}”</span>
                  <span className="mt-1 block text-sm font-semibold text-accent">
                    {guideline(c.guideline)}, {c.location}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {/* 8. Flags: open when any is a safety alert */}
      {r.flags.length > 0 && (
        <Card icon="flag" title={`Flags (${r.flags.length})`} open={r.flags.some(isAlert)}>
          <ul className="flex flex-col gap-2">
            {r.flags.map((f) => (
              <li key={f} className={`flex gap-2 ${isAlert(f) ? "font-semibold text-red" : ""}`}>
                <span aria-hidden>{isAlert(f) ? "!" : "•"}</span>
                {f}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {r.status === "recommendation" && (
        /* 9. Stewardship and timeline */
        <Card icon="leaf" title="Stewardship and timeline">
          <div className="flex flex-col gap-1">
            {r.stewardship?.map((s) => (
              <p key={s.action + s.text}>
                <span className="font-semibold">{ACTION_LABELS[s.action] ?? s.action}: </span>
                {s.text}
              </p>
            ))}
          </div>
          <ol className="relative mt-4 ml-2 border-l-2 border-accent/30">
            {r.timeline?.map((t) => (
              <li key={t.when} className="relative pb-4 pl-5 last:pb-0">
                <span aria-hidden className="absolute -left-[7px] top-1.5 size-3 rounded-full bg-accent ring-4 ring-white" />
                <span className="font-mono text-sm font-semibold text-accent">{t.when}</span>
                <p>{t.action}</p>
                <p className="text-sm text-muted">{t.sources.map((s) => `${guideline(s.guideline)}, ${s.location}`).join("; ")}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* 10. Footer */}
      <footer className="rounded-xl border border-rule bg-white p-4 text-sm text-muted">
        <p>
          Knowledge base <span className="font-mono">{r.versions.knowledgeBase}</span>
        </p>
        <p>Sources: {r.versions.guidelines.map((g) => `${guideline(g.guideline)} (${g.version})`).join(" · ")}</p>
        {r.disclaimers.map((d) => (
          <p key={d} className="mt-1 font-semibold text-ink">
            {d}
          </p>
        ))}
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" onClick={onEdit} className="min-h-11 rounded-lg border border-navy px-4 text-base font-semibold text-navy">
            Edit details
          </button>
          <button type="button" onClick={onStartAgain} className="min-h-11 rounded-lg border border-navy px-4 text-base font-semibold text-navy">
            Start a new patient
          </button>
        </div>
      </footer>
    </div>
  );
}

function Banner({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="note" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
      <p className="font-semibold uppercase tracking-wider text-amber-900">{title}</p>
      <p className="text-amber-950">{children}</p>
    </div>
  );
}

function Card({ icon, title, open, children }: { icon: IconName; title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="rise group rounded-xl border border-rule bg-white shadow-sm">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon name={icon} small />
        </span>
        <h2 className="flex-1 text-base font-semibold text-navy">{title}</h2>
        <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="border-t border-rule px-4 pb-4 pt-3">{children}</div>
    </details>
  );
}

function TableChip({ match }: { match?: Result["tableMatch"] }) {
  if (match === "matches") return <span className="rounded-full bg-green px-2.5 py-0.5 text-xs font-semibold">✓ Matches guideline table</span>;
  if (match === "differs")
    return <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-navy">≠ Differs from guideline table — see flags</span>;
  return <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">No guideline table row</span>;
}

function Aware({ group }: { group: string }) {
  if (!group) return <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs">AWaRe: not classified</span>;
  if (group === "Not recommended") return <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-red">WHO: Not recommended</span>;
  return <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-navy">AWaRe: {group}</span>;
}

// Three-step bar: words carry the meaning, the bar only helps the eye (no score).
function Meter({ level }: { level: "yes" | "limited" | "no" }) {
  const filled = { yes: 3, limited: 1, no: 0 }[level];
  return (
    <span aria-hidden className="mt-1.5 flex gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i < filled ? "bg-accent" : "bg-rule"}`} />
      ))}
    </span>
  );
}

function FitGroup({
  title,
  lines,
  tone,
}: {
  title: string;
  lines?: { key: string; label: string; reason: string }[];
  tone: "good" | "part" | "danger" | "excess";
}) {
  if (!lines || lines.length === 0) return null;
  const chip = {
    good: "bg-green/10 text-green",
    part: "bg-amber-50 text-amber-900",
    danger: "bg-red/10 text-red",
    excess: "bg-cream text-muted",
  }[tone];
  return (
    <div>
      <h3 className={`text-xs font-semibold uppercase tracking-wider ${tone === "danger" ? "text-red" : "text-muted"}`}>{title}</h3>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {lines.map((l) => (
          <li key={l.key} className="flex flex-wrap items-baseline gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${chip}`}>{l.label}</span>
            {l.reason && <span className="text-sm text-muted">{l.reason}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

type IconName = "alert" | "spark" | "clock" | "grid" | "target" | "pin" | "shield" | "book" | "flag" | "leaf";
const ICONS: Record<IconName, string> = {
  alert: "M12 3 2 21h20L12 3Zm0 6v5m0 3v.5",
  spark: "M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  pin: "M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12Zm0-14a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
  shield: "M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Zm-3 9 2 2 4-4",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm0 16a2 2 0 0 1 2-2h13",
  flag: "M5 21V4m0 0h11l-2 4 2 4H5",
  leaf: "M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19l7-7",
};

function Icon({ name, small }: { name: IconName; small?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={small ? "size-4" : "size-5"} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}
