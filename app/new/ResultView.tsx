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
    <div className="flex flex-col gap-6">
      {r.demo ? (
        <Banner title="DEMO — not for patient care">
          Stand-in answer from the guideline table and a draft knowledge base. The real AI is not connected yet.
        </Banner>
      ) : (
        draft && <Banner title="Draft knowledge base — not for patient care">Answered by the AI; the tables it draws on are not signed off yet.</Banner>
      )}

      {r.status !== "recommendation" && (
        <section className="clay-cushion border-2 border-red bg-surface p-6">
          <div className="flex items-center gap-2 text-red">
            <Icon name="alert" />
            <h2 className="text-xl font-bold">No recommendation</h2>
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
          <section className="clay-cushion bg-pink p-6 sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink-2">Recommended empiric regimen</h2>
              <TableChip match={r.tableMatch} />
            </div>
            <p className="mt-3 text-[clamp(34px,6vw,56px)] font-bold leading-[1] tracking-[-0.035em]">{regimenTitle(r.regimen.name)}</p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {drugs.map((d) => (
                <li key={d.drug} className="clay-small bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold">{title(d.drug)}</span>
                    <Aware group={d.aware} />
                  </div>
                  <span className="mt-1 block font-mono text-base">{[d.dose, d.interval].filter(Boolean).join(" · ") || NOT_YET}</span>
                </li>
              ))}
            </ul>

            {r.whyThisChoice && (
              <div className="clay-tray mt-6 p-6 sm:p-8">
                <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-ink-2">
                  <Icon name="spark" small /> Why this antibiotic
                </p>
                <p className="mt-2 text-xl font-bold leading-snug tracking-[-0.01em]">{r.whyThisChoice}</p>
                {r.keyReasons && r.keyReasons.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-3">
                    {r.keyReasons.map((k) => (
                      <li key={k} className="clay-small flex items-start gap-2 !rounded-full bg-mint px-4 py-1.5 text-[15px]">
                        <span aria-hidden className="font-bold">✓</span>
                        {k}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {r.alternatives && r.alternatives.length > 0 && (
              <p className="mt-5 text-base">
                <span className="font-bold">Alternatives: </span>
                {r.alternatives.map((a) => regimenTitle(a.name)).join(" · ")}
              </p>
            )}
          </section>

          {/* 2. How to give it */}
          <Card icon="clock" title="How to give it" open>
            <div className="flex flex-col gap-3">
              {drugs.map((d) => (
                <div key={d.drug} className="clay-small bg-ground/70 p-4">
                  <p className="font-bold">{title(d.drug)}</p>
                  <dl className="mt-1 grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-0.5 text-[15px]">
                    <dt className="text-ink-2">Dose</dt>
                    <dd className="font-mono">{d.dose || NOT_YET}</dd>
                    <dt className="text-ink-2">Interval</dt>
                    <dd className="font-mono">{d.interval || NOT_YET}</dd>
                    <dt className="text-ink-2">Infusion</dt>
                    <dd className="font-mono">{d.infusion || NOT_YET}</dd>
                  </dl>
                  {d.notes.map((n) => (
                    <p key={n} className="mt-3 rounded-[18px] bg-butter px-3 py-2 text-[15px]">
                      {n}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          {/* 3. Coverage */}
          <Card icon="grid" title="Coverage" open>
            <p className="text-[15px] text-ink-2">What this regimen covers, from the knowledge base.</p>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {r.coverage?.map((c) => (
                <li key={c.key} className={`clay-small p-3 ${c.level === "yes" ? "bg-sky" : c.level === "limited" ? "bg-butter" : "bg-ground"}`}>
                  <span className="block text-[15px] font-bold">{c.label}</span>
                  <Meter level={c.level} />
                  <span className="mt-1 block text-[13px] font-bold uppercase tracking-[0.1em]">
                    {c.level === "yes" ? "Yes" : c.level === "limited" ? "Limited" : "No"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* 4. Spectrum fit: words only, no score */}
          <Card icon="target" title="Spectrum fit">
            <div className="flex flex-col gap-5">
              <FitGroup title="Needed and covered" tone="good" lines={r.spectrumFit?.filter((f) => f.status === "covered")} />
              <FitGroup title="Needed, only partly covered" tone="part" lines={r.spectrumFit?.filter((f) => f.status === "partly")} />
              <FitGroup title="Needed but NOT covered" tone="danger" lines={r.spectrumFit?.filter((f) => f.status === "missing")} />
              <FitGroup title="Covered but not needed (excess)" tone="excess" lines={r.spectrumFit?.filter((f) => f.status === "excess")} />
            </div>
          </Card>

          {/* 5. Will it reach the site? */}
          <Card icon="pin" title="Will it reach the site?">
            {drugs.map((d) => (
              <p key={d.drug} className="mt-2 first:mt-0">
                <span className="font-bold">{title(d.drug)}: </span>
                {d.sitePenetration || NOT_YET}
              </p>
            ))}
          </Card>

          {/* 6. Safety: table facts, then the AI-written interaction notes, clearly labelled */}
          <Card icon="shield" title="Safety and interactions" open>
            {r.flags.filter((f) => f.startsWith("Possible cross-reactivity")).map((f) => (
              <p key={f} className="mb-3 font-bold text-red">
                {f}
              </p>
            ))}
            {r.interactions && r.interactions.length > 0 && (
              <div className="clay-small bg-lavender p-5">
                <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-ink-2">AI-written — verify before acting</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {r.interactions.map((i) => (
                    <li key={i.drug + i.text}>
                      <span className="font-bold">{title(i.drug)}: </span>
                      {i.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-5 flex flex-col gap-3">
              {drugs.map((d) => (
                <div key={d.drug} className="text-[15px]">
                  <p className="font-bold">{title(d.drug)} · from the knowledge base</p>
                  <p>Interactions: {d.interactions || NOT_YET}</p>
                  <p>Monitoring: {d.monitoring || NOT_YET}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* 7. Why this antibiotic: the full reasoning, with the guideline passages */}
          <Card icon="book" title="Reasoning and guideline evidence">
            <p className="text-lg">{r.reasoning}</p>
            <h3 className="mt-6 text-[13px] font-bold uppercase tracking-[0.12em] text-ink-2">Guideline passages cited</h3>
            <ul className="mt-3 flex flex-col gap-3">
              {r.citations?.map((c) => (
                <li key={c.passage_id + c.quote} className="clay-small bg-ground/70 px-5 py-4">
                  <span className="text-lg">“{c.quote}”</span>
                  <span className="mt-1 block text-[15px] font-bold text-ink-2">
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
              <li key={f} className={`flex gap-2 ${isAlert(f) ? "font-bold text-red" : ""}`}>
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
          <div className="flex flex-col gap-2">
            {r.stewardship?.map((s) => (
              <p key={s.action + s.text}>
                <span className="font-bold">{ACTION_LABELS[s.action] ?? s.action}: </span>
                {s.text}
              </p>
            ))}
          </div>
          <ol className="mt-5 flex flex-col gap-3">
            {r.timeline?.map((t, i) => (
              <li key={t.when} className="flex gap-3">
                <span aria-hidden className="clay-small flex size-9 shrink-0 items-center justify-center !rounded-full bg-sky text-[13px] font-bold">
                  {i + 1}
                </span>
                <div>
                  <span className="font-mono text-[15px] font-bold">{t.when}</span>
                  <p>{t.action}</p>
                  <p className="text-[15px] text-ink-2">{t.sources.map((s) => `${guideline(s.guideline)}, ${s.location}`).join("; ")}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* 10. Footer */}
      <footer className="clay-tray px-6 py-6 text-[15px] text-ink-2 sm:px-9">
        <p>
          Knowledge base <span className="font-mono">{r.versions.knowledgeBase}</span>
        </p>
        <p>Sources: {r.versions.guidelines.map((g) => `${guideline(g.guideline)} (${g.version})`).join(" · ")}</p>
        {r.disclaimers.map((d) => (
          <p key={d} className="mt-1 font-bold text-ink">
            {d}
          </p>
        ))}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button type="button" onClick={onEdit} className="clay-button min-h-12 bg-pink px-6 text-base text-ink">
            Edit details
          </button>
          <button type="button" onClick={onStartAgain} className="min-h-12 px-2 text-base font-bold text-ink underline underline-offset-4">
            Start a new patient
          </button>
        </div>
      </footer>
    </div>
  );
}

function Banner({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="note" className="clay-small bg-butter px-5 py-4 text-[15px]">
      <p className="font-bold uppercase tracking-[0.1em]">{title}</p>
      <p>{children}</p>
    </div>
  );
}

function Card({ icon, title, open, children }: { icon: IconName; title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group clay-tray">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-[inherit] px-5 py-4 sm:px-8 [&::-webkit-details-marker]:hidden">
        <span className="clay-small flex size-10 shrink-0 items-center justify-center !rounded-full bg-lavender">
          <Icon name={icon} small />
        </span>
        <h2 className="flex-1 text-lg font-bold tracking-[-0.01em]">{title}</h2>
        {/* Recessed plus / minus */}
        <span aria-hidden className="clay-well flex size-9 shrink-0 items-center justify-center rounded-full bg-ground text-xl font-bold">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      </summary>
      <div className="px-5 pb-7 pt-1 sm:px-8">{children}</div>
    </details>
  );
}

function TableChip({ match }: { match?: Result["tableMatch"] }) {
  const chip = "clay-small !rounded-full px-3 py-1 text-[13px] font-bold";
  if (match === "matches") return <span className={`${chip} bg-mint`}>✓ Matches guideline table</span>;
  if (match === "differs") return <span className={`${chip} bg-butter`}>≠ Differs from guideline table — see flags</span>;
  return <span className={`${chip} bg-surface`}>No guideline table row</span>;
}

function Aware({ group }: { group: string }) {
  const tag = "rounded-full px-2.5 py-0.5 text-[13px] font-bold";
  if (!group) return <span className={`${tag} bg-ground`}>AWaRe: not classified</span>;
  if (group === "Not recommended") return <span className={`${tag} border-2 border-red text-red`}>WHO: Not recommended</span>;
  return <span className={`${tag} bg-lavender`}>AWaRe: {group}</span>;
}

// Three-step bar: words carry the meaning, the bar only helps the eye (no score).
function Meter({ level }: { level: "yes" | "limited" | "no" }) {
  const filled = { yes: 3, limited: 1, no: 0 }[level];
  return (
    <span aria-hidden className="clay-well mt-2 flex gap-1 rounded-full bg-surface p-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-2 flex-1 rounded-full ${i < filled ? "bg-ink" : ""}`} />
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
    good: "bg-mint",
    part: "bg-butter",
    danger: "border-2 border-red bg-surface text-red",
    excess: "bg-lavender",
  }[tone];
  return (
    <div>
      <h3 className={`text-[13px] font-bold uppercase tracking-[0.12em] ${tone === "danger" ? "text-red" : "text-ink-2"}`}>{title}</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {lines.map((l) => (
          <li key={l.key} className="flex flex-wrap items-baseline gap-2">
            <span className={`rounded-full px-3 py-0.5 text-[15px] font-bold ${chip}`}>{l.label}</span>
            {l.reason && <span className="text-[15px] text-ink-2">{l.reason}</span>}
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
