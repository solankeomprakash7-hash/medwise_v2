"use client";

import type { ReactNode } from "react";
import type { Result } from "@/lib/recommend/recommend";

// Result screen (docs/DESIGN.md, screen 2): cards in this exact order. Red only for safety alerts.
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

export default function ResultView({ result, onEdit, onStartAgain }: { result: Shown; onEdit: () => void; onStartAgain: () => void }) {
  const r = result;
  const drugs = r.regimen?.drugs ?? [];
  const isAlert = (flag: string) =>
    /cross-reactivity|not given|Not recommended|not for patient care/.test(flag);

  return (
    <div className="flex flex-col gap-4">
      <div role="note" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-base">
        <p className="font-semibold uppercase tracking-wider text-amber-900">DEMO — not for patient care</p>
        <p className="text-amber-950">
          Stand-in answer from the guideline table and a draft knowledge base. The real AI is not connected yet.
        </p>
      </div>

      {r.status !== "recommendation" && (
        <Card title="No recommendation" tone="danger">
          {r.messages.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </Card>
      )}

      {r.status === "recommendation" && r.regimen && (
        <>
          {/* 1. Recommendation */}
          <section className="rounded-xl bg-navy p-5 text-white shadow-md">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">Recommended empiric regimen</h2>
            <p className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{r.regimen.name.split(" + ").map(title).join(" + ")}</p>
            <ul className="mt-4 flex flex-col gap-3">
              {drugs.map((d) => (
                <li key={d.drug} className="rounded-lg bg-white/10 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold">{title(d.drug)}</span>
                    <Aware group={d.aware} />
                  </div>
                  <span className="mt-1 block font-mono text-base">{[d.dose, d.interval].filter(Boolean).join(" · ") || NOT_YET}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 2. How to give it */}
          <Card title="How to give it">
            {drugs.map((d) => (
              <div key={d.drug} className="border-t border-rule py-2 first:border-t-0 first:pt-0">
                <p className="font-semibold">{title(d.drug)}</p>
                <dl className="grid grid-cols-[7rem_1fr] gap-x-2 text-base">
                  <dt>Dose</dt>
                  <dd className="font-mono">{d.dose || NOT_YET}</dd>
                  <dt>Interval</dt>
                  <dd className="font-mono">{d.interval || NOT_YET}</dd>
                  <dt>Infusion</dt>
                  <dd className="font-mono">{d.infusion || NOT_YET}</dd>
                </dl>
                {d.notes.map((n) => (
                  <p key={n} className="mt-1 text-base">
                    {n}
                  </p>
                ))}
              </div>
            ))}
          </Card>

          {/* 3. Coverage */}
          <Card title="Coverage">
            <p className="text-base">What this regimen covers, from the knowledge base.</p>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {r.coverage?.map((c) => (
                <li
                  key={c.key}
                  className={`rounded-lg border px-3 py-2 ${
                    c.level === "yes" ? "border-accent bg-accent/5" : c.level === "limited" ? "border-rule bg-cream" : "border-rule"
                  }`}
                >
                  <span className="block text-sm text-muted">{c.label}</span>
                  <span className={`font-semibold ${c.level === "yes" ? "text-accent" : c.level === "no" ? "text-muted" : ""}`}>
                    {c.level === "yes" ? "● Yes" : c.level === "limited" ? "◐ Limited" : "○ No"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* 4. Spectrum fit */}
          <Card title="Spectrum fit">
            <FitGroup title="Needed and covered" lines={r.spectrumFit?.filter((f) => f.status === "covered")} />
            <FitGroup title="Needed, only partly covered" lines={r.spectrumFit?.filter((f) => f.status === "partly")} />
            <FitGroup title="Needed but NOT covered" lines={r.spectrumFit?.filter((f) => f.status === "missing")} danger />
            <FitGroup title="Covered but not needed (excess)" lines={r.spectrumFit?.filter((f) => f.status === "excess")} />
          </Card>

          {/* 5. Will it reach the site? */}
          <Card title="Will it reach the site?">
            {drugs.map((d) => (
              <p key={d.drug}>
                <span className="font-semibold">{title(d.drug)}: </span>
                {d.sitePenetration || NOT_YET}
              </p>
            ))}
          </Card>

          {/* 6. Safety */}
          <Card title="Safety">
            {r.flags.filter((f) => f.startsWith("Possible cross-reactivity")).map((f) => (
              <p key={f} className="font-semibold text-red">
                {f}
              </p>
            ))}
            {drugs.map((d) => (
              <div key={d.drug} className="mt-1">
                <p className="font-semibold">{title(d.drug)}</p>
                <p className="text-base">Interactions: {d.interactions || NOT_YET}</p>
                <p className="text-base">Monitoring: {d.monitoring || NOT_YET}</p>
              </div>
            ))}
          </Card>

          {/* 7. Why this antibiotic */}
          <Card title="Why this antibiotic">
            <ul className="list-disc pl-5">
              {r.keyReasons?.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
            <p className="mt-3 font-serif text-lg leading-relaxed">{r.reasoning}</p>
            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wider text-muted">Guideline passages cited</h3>
            <ul className="mt-1 flex flex-col gap-2">
              {r.citations?.map((c) => (
                <li key={c.passage_id + c.quote} className="rounded-r-lg border-l-4 border-accent bg-cream/70 px-3 py-2 font-serif text-lg">
                  “{c.quote}”
                  <span className="mt-1 block font-sans text-sm font-semibold text-accent">
                    {guideline(c.guideline)}, {c.location}
                  </span>
                </li>
              ))}
            </ul>
            {r.alternatives && r.alternatives.length > 0 && (
              <p className="mt-3 text-base">
                Alternatives: {r.alternatives.map((a) => a.name.split(" + ").map(title).join(" + ")).join("; ")}
              </p>
            )}
          </Card>
        </>
      )}

      {/* 8. Flags */}
      {r.flags.length > 0 && (
        <Card title="Flags">
          <ul className="flex flex-col gap-1">
            {r.flags.map((f) => (
              <li key={f} className={isAlert(f) ? "font-semibold text-red" : ""}>
                {f}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {r.status === "recommendation" && (
        /* 9. Stewardship and timeline */
        <Card title="Stewardship and timeline">
          {r.stewardship?.map((s) => (
            <p key={s.action + s.text}>
              <span className="font-semibold">{ACTION_LABELS[s.action] ?? s.action}: </span>
              {s.text}
            </p>
          ))}
          <ol className="mt-3 flex flex-col gap-2">
            {r.timeline?.map((t) => (
              <li key={t.when} className="grid grid-cols-[7.5rem_1fr] gap-2 border-t border-rule pt-2">
                <span className="font-mono text-base">{t.when}</span>
                <span>
                  {t.action}
                  <span className="block text-base">{t.sources.map((s) => `${guideline(s.guideline)}, ${s.location}`).join("; ")}</span>
                </span>
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
        <div className="mt-3 flex flex-wrap gap-4">
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

function Card({ title, tone, children }: { title: string; tone?: "danger"; children: ReactNode }) {
  return (
    <section className={`rounded-xl border bg-white p-4 text-base shadow-sm sm:p-5 ${tone === "danger" ? "border-2 border-red" : "border-rule"}`}>
      <h2 className={`mb-3 border-b border-rule pb-2 text-sm font-semibold uppercase tracking-wider ${tone === "danger" ? "text-red" : "text-navy"}`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Aware({ group }: { group: string }) {
  if (!group) return <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-sm">AWaRe: not classified</span>;
  const warn = group === "Not recommended";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${warn ? "bg-white text-red" : "bg-white text-navy"}`}>
      {warn ? "WHO: Not recommended" : `AWaRe: ${group}`}
    </span>
  );
}

function FitGroup({ title, lines, danger }: { title: string; lines?: { key: string; label: string; reason: string }[]; danger?: boolean }) {
  if (!lines || lines.length === 0) return null;
  return (
    <div className="mt-2">
      <h3 className={`text-sm font-semibold uppercase tracking-wider ${danger ? "text-red" : "text-muted"}`}>{title}</h3>
      <ul className="pl-1">
        {lines.map((l) => (
          <li key={l.key}>
            {l.label}
            {l.reason && <span className="text-base"> — {l.reason}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
