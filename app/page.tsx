import Link from "next/link";
import type { ReactNode } from "react";
import Sculpture, { Logo } from "./Sculpture";

// Home page: what MedWise is, the problem it solves (docs/PRODUCT.md), how it works, and the way in.
// No study figures or claims of accuracy here (PRODUCT.md), and no invented numbers.

const FACTS = [
  { text: "Adults with sepsis", tone: "bg-mint" },
  { text: "SSC 2026 · IDSA 2026 · NCDC/ICMR 2025", tone: "bg-lavender" },
  { text: "WHO AWaRe tag on every drug", tone: "bg-butter" },
  { text: "No names or hospital numbers", tone: "bg-sky" },
];

const STEPS = [
  { title: "Enter the patient", text: "One page, mostly taps: source, severity, kidneys, liver, recent antibiotics, MDR risk, allergies." },
  { title: "AI weighs the evidence", text: "It reasons over quoted guideline passages and the knowledge-base tables, then picks one regimen and says why." },
  { title: "Code checks every answer", text: "Drugs from the knowledge-base list only, no allergy conflict, every quote matched word for word. Doses come from the tables, never the AI." },
  { title: "You decide", text: "Accept, modify or override. MedWise suggests; it never orders." },
];

const RESULT_PARTS = [
  { title: "One regimen, with dose", text: "How to give it, with notes for kidney and liver function." },
  { title: "Why this antibiotic", text: "Patient-specific reasons, with the guideline passages cited." },
  { title: "Coverage and spectrum fit", text: "What is needed, what is given, and what is more than needed." },
  { title: "Safety and stewardship", text: "Interactions, monitoring, and when to review and de-escalate." },
];

const QUESTIONS = [
  {
    q: "Who is MedWise for?",
    a: "Doctors choosing the first antibiotic for an adult with sepsis: residents, physicians and intensivists. Later, stewardship teams who review the choices and upload their hospital's antibiogram.",
  },
  {
    q: "What does it not do?",
    a: "No children, pregnancy or neutropenic sepsis; no culture-directed, antifungal or antiviral therapy. It never orders a drug: the clinician always makes the final decision.",
  },
  {
    q: "Where does the advice come from?",
    a: "The Surviving Sepsis Campaign 2026, IDSA 2026 guidance on resistant organisms, the NCDC/ICMR 2025 national treatment guidelines and the WHO AWaRe list. Every result shows the versions it used.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:gap-10 sm:px-6 sm:py-10">
      {/* Opening: what it is, and the way in */}
      <section aria-labelledby="intro" className="clay-cushion grid items-center gap-6 bg-pink p-7 sm:p-10 md:grid-cols-[1.35fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-[13px] font-bold uppercase tracking-[0.16em]">Empiric antibiotics · adult sepsis</span>
          </div>
          <h1 id="intro" className="mt-6 text-[clamp(54px,9vw,94px)] font-bold leading-[0.95] tracking-[-0.04em]">
            MedWise
          </h1>
          <p className="mt-4 max-w-lg text-[clamp(22px,3vw,28px)] font-bold leading-tight tracking-[-0.02em]">
            The first antibiotic for a septic patient, reasoned from the guidelines and checked before you see it.
          </p>
          <p className="mt-4 max-w-md text-lg">
            Enter the patient. MedWise suggests one empiric regimen with dose, reasons and guideline evidence. You decide.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/new" className="clay-button inline-flex min-h-13 items-center bg-surface px-7 text-lg">
              Find the right antibiotic
            </Link>
            <a href="#problem" className="min-h-12 content-center text-base font-bold underline underline-offset-4">
              Why MedWise?
            </a>
          </div>
          <p className="mt-5 text-[15px] text-ink-2">Demo version: draft knowledge base, not for patient care.</p>
        </div>
        <Sculpture className="mx-auto w-full max-w-[200px] md:max-w-[330px]" />
      </section>

      <ul aria-label="At a glance" className="-mt-2 grid grid-cols-2 gap-4 md:grid-cols-4">
        {FACTS.map((f) => (
          <li key={f.text} className={`clay-small ${f.tone} px-5 py-4 text-[15px] font-bold leading-snug`}>
            {f.text}
          </li>
        ))}
      </ul>

      {/* The problem, then how MedWise works and what you get, in one tray */}
      <section aria-labelledby="problem" className="clay-tray scroll-mt-6 px-6 py-9 sm:px-12 sm:py-12" id="problem">
        <div className="grid gap-8 md:grid-cols-[1.25fr_1fr]">
          <div>
            <Label>The problem</Label>
            <h2 className="mt-2 text-[clamp(30px,4.5vw,44px)] font-bold leading-[1.05] tracking-[-0.03em]">
              It is not knowledge. It is synthesis.
            </h2>
            <p className="mt-4 text-lg">
              Every septic patient gets an antibiotic before the organism is known. That one choice must weigh the source,
              severity, kidneys and liver, allergies, recent antibiotics, resistance risk and the local antibiogram, often at
              3&nbsp;am. Guidelines are written for populations; fitting them to one patient in real time is where things vary.
            </p>
          </div>
          <ul className="flex flex-col gap-4 self-center">
            <Risk tone="bg-butter" title="Too narrow">
              The infection is not covered: the treatment can fail.
            </Risk>
            <Risk tone="bg-lavender" title="Too broad">
              Drives resistance, C. difficile, toxicity and cost.
            </Risk>
            <Risk tone="bg-mint" title="MedWise">
              Does the synthesis for this patient, and shows its working.
            </Risk>
          </ul>
        </div>

        <div className="mt-12">
          <Label>How it works</Label>
          <ol className="mt-4 grid gap-4 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="clay-small flex gap-4 bg-ground/70 p-5 md:flex-col">
                <span aria-hidden className="clay-small flex size-11 shrink-0 items-center justify-center !rounded-full bg-pink font-mono text-base font-bold">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold leading-tight">{s.title}</h3>
                  <p className="mt-1.5 text-[15px] text-ink-2">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12">
          <Label>What you get</Label>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {RESULT_PARTS.map((p) => (
              <li key={p.title} className="border-l-4 border-pink pl-4">
                <h3 className="text-lg font-bold leading-tight">{p.title}</h3>
                <p className="mt-1 text-[15px] text-ink-2">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Questions */}
      <section aria-labelledby="questions" className="clay-tray bg-lavender px-6 py-9 sm:px-12 sm:py-11">
        <h2 id="questions" className="text-[clamp(26px,3.5vw,34px)] font-bold tracking-[-0.03em]">
          Before you start
        </h2>
        <div className="mt-5 flex flex-col gap-4">
          {QUESTIONS.map((item) => (
            <details key={item.q} className="group clay-small bg-surface">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-[inherit] px-5 py-3 [&::-webkit-details-marker]:hidden">
                <span className="flex-1 text-lg font-bold">{item.q}</span>
                <span aria-hidden className="clay-well flex size-9 shrink-0 items-center justify-center rounded-full bg-ground text-xl font-bold">
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">−</span>
                </span>
              </summary>
              <p className="px-5 pb-5 text-base">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing: the way in */}
      <section aria-labelledby="start" className="clay-cushion bg-pink p-7 text-center sm:p-12">
        <h2 id="start" className="mx-auto max-w-xl text-[clamp(30px,5vw,48px)] font-bold leading-[1.05] tracking-[-0.03em]">
          Choosing an empiric antibiotic tonight?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-lg">Let&apos;s find the right one for your patient, step by step.</p>
        <Link href="/new" className="clay-button mt-7 inline-flex min-h-13 items-center bg-surface px-8 text-lg">
          Start with a new patient
        </Link>
      </section>

      <footer className="clay-tray px-7 py-5 text-base">
        Decision support only — verify with clinical judgement and local policy.
      </footer>
    </main>
  );
}

const Label = ({ children }: { children: ReactNode }) => (
  <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink-2">{children}</p>
);

function Risk({ tone, title, children }: { tone: string; title: string; children: ReactNode }) {
  return (
    <li className={`clay-small ${tone} px-5 py-4`}>
      <p className="font-bold">{title}</p>
      <p className="text-[15px]">{children}</p>
    </li>
  );
}
