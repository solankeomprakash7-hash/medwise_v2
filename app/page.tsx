import Link from "next/link";
import type { ReactNode } from "react";
import { Brand, FullLogo } from "./Sculpture";

// Home page: what MedWise is, why it was built, who builds it, how it works, and the way in.
// Wording from docs/PRODUCT.md. No study figures, claims of accuracy, reviews or invented numbers (PRODUCT.md,
// DESIGN.md website rules).

const NAV = [
  { href: "#what", label: "What it is" },
  { href: "#why", label: "Why we built it" },
  { href: "#doctors", label: "Built by doctors" },
  { href: "#how", label: "How it works" },
];

const FACTS = [
  { label: "Patients", text: "Adults with sepsis" },
  { label: "Guidelines", text: "SSC 2026 · IDSA 2026 · NCDC/ICMR 2025" },
  { label: "Stewardship", text: "WHO AWaRe group on every drug" },
  { label: "Privacy", text: "No names or hospital numbers" },
];

// What a real result contains, and where each part comes from (no sample values: nothing to mistake for advice).
const RESULT_SUMMARY = [
  { part: "Regimen", from: "Chosen by the AI, checked by code" },
  { part: "Dose and interval", from: "Knowledge-base tables only", value: true },
  { part: "Why this antibiotic", from: "Reasons and quoted guideline passages" },
  { part: "Coverage and spectrum fit", from: "Needed, given and excess" },
  { part: "Review timeline", from: "Cultures, 48 to 72 h, de-escalation" },
];

const BEDSIDE = [
  { title: "Made for 3 am on a phone", text: "One page, mostly taps and switches. Units sit in the boxes; creatinine becomes CrCl for you." },
  { title: "Every reason has a source", text: "Guideline passages are quoted word for word, with the guideline and page, so you can check them." },
  { title: "Doses never come from the AI", text: "Dose, interval and infusion come from checked tables. Code rejects any answer that writes a dose." },
  { title: "It knows when to stop", text: "Children, pregnancy and neutropenic sepsis are outside version 1: MedWise says so and points to ID / microbiology." },
  { title: "Private by design", text: "There is nowhere to type a name, hospital number, phone number or date of birth." },
  { title: "You make the decision", text: "MedWise suggests one regimen and shows its working. It never orders a drug." },
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

const linkClass = "underline decoration-line underline-offset-4 hover:decoration-muted";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Link href="/" aria-label="MedWise home" className="rounded-[5px]">
            <Brand />
          </Link>
          <nav aria-label="On this page" className="hidden items-center gap-6 text-[15px] text-muted min-[1000px]:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="min-h-11 content-center hover:text-ink">
                {n.label}
              </a>
            ))}
          </nav>
          <Link href="/new?new=1" className="fin-button-quiet min-h-11 shrink-0 px-5 text-[15px]">
            New patient
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 sm:px-8">
        {/* Opening: the promise on the left, the product summary in a framed panel on the right */}
        <section aria-labelledby="intro" className="grid items-center gap-12 py-12 min-[800px]:grid-cols-[1.15fr_1fr] min-[800px]:py-20">
          <div>
            <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-muted">Empiric antibiotics · adult sepsis</p>
            <h1 id="intro" className="mt-3 max-w-xl text-[clamp(30px,4vw,42px)] font-medium leading-[1.12] tracking-[-0.02em]">
              The first antibiotic for a septic patient, reasoned from the guidelines and checked before you see it.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-[1.65] text-muted">
              Enter the patient. MedWise suggests one empiric regimen with dose, reasons and guideline evidence. You decide.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/new?new=1" className="fin-button min-h-12 px-6 text-base">
                Find the right antibiotic <span aria-hidden>→</span>
              </Link>
              <a href="#what" className={`min-h-12 content-center text-base font-medium text-ink ${linkClass}`}>
                What is MedWise?
              </a>
            </div>
            <p className="mt-6 font-mono text-[13px] text-muted">Demo version: draft knowledge base, not for patient care.</p>
          </div>

          <div className="fin-glow rounded-[5px] p-5 pb-10 pr-10 sm:p-8 sm:pb-14 sm:pr-14">
            <div className="fin-frame">
              <div className="fin-panel p-6">
                <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-muted">What every result shows</p>
                <dl className="mt-4 divide-y divide-line">
                  {RESULT_SUMMARY.map((r) => (
                    <div key={r.part} className="grid gap-1 py-3 sm:grid-cols-[1fr_1.1fr] sm:gap-4">
                      <dt className={`font-medium ${r.value ? "text-value" : ""}`}>{r.part}</dt>
                      <dd className="text-[14px] text-muted">{r.from}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* Ruled strip of facts */}
        <ul aria-label="At a glance" className="grid grid-cols-2 border-y border-line min-[1100px]:grid-cols-4">
          {FACTS.map((f, i) => (
            <li
              key={f.label}
              className={`px-4 py-5 ${i % 2 === 1 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line min-[1100px]:border-t-0" : ""} ${
                i === 2 ? "min-[1100px]:border-l" : ""
              }`}
            >
              <p className="font-mono text-[13px] uppercase tracking-[0.12em] text-muted">{f.label}</p>
              <p className="mt-1 font-medium">{f.text}</p>
            </li>
          ))}
        </ul>

        {/* What MedWise is: the logo beside a plain description */}
        <section aria-labelledby="what-h" id="what" className="scroll-mt-6 grid items-center gap-10 py-16 min-[800px]:grid-cols-[0.8fr_1.2fr] min-[800px]:py-20">
          <div className="flex justify-center rounded-[5px] border border-line bg-tint px-6 py-10">
            <FullLogo className="h-36 w-auto sm:h-44" />
          </div>
          <div>
            <Label>What it is</Label>
            <h2 id="what-h" className="mt-3 text-[clamp(26px,3vw,32px)] font-medium leading-[1.15] tracking-[-0.02em]">
              Decision support for one decision: the first antibiotic in adult sepsis.
            </h2>
            <p className="mt-4 text-lg leading-[1.65] text-muted">
              MedWise brings together the patient in front of you, the current sepsis guidelines (Surviving Sepsis Campaign,
              IDSA and the Indian NCDC/ICMR guidelines) and, in time, your own hospital&apos;s antibiogram. It suggests one
              empiric regimen with its dose, how to give it, why it fits this patient and when to review it.
            </p>
            <p className="mt-4 text-lg leading-[1.65] text-muted">It is a second pair of eyes, not an order set: the clinician always decides.</p>
          </div>
        </section>

        {/* Why it was built: narrower heading beside the wider explanation */}
        <section aria-labelledby="why-h" id="why" className="scroll-mt-6 grid gap-8 border-t border-line py-16 min-[800px]:grid-cols-[0.8fr_1.2fr] min-[800px]:py-20">
          <div>
            <Label>Why we built it</Label>
            <h2 id="why-h" className="mt-3 text-[clamp(26px,3vw,32px)] font-medium leading-[1.15] tracking-[-0.02em]">It is not knowledge. It is synthesis.</h2>
          </div>
          <div>
            <p className="text-lg leading-[1.65] text-muted">
              Every septic patient gets an antibiotic before the organism is known. That one choice must weigh the source,
              severity, kidneys and liver, allergies, recent antibiotics, resistance risk and the local antibiogram, often at
              3&nbsp;am. Guidelines are written for populations; fitting them to one patient in real time is where things vary.
            </p>
            <dl className="mt-8 grid border-t border-line sm:grid-cols-3">
              <Risk title="Too narrow">The infection is not covered: the treatment can fail.</Risk>
              <Risk title="Too broad">Drives resistance, C. difficile, toxicity and cost.</Risk>
              <Risk title="MedWise" accent>
                Does the synthesis for this patient, and shows its working.
              </Risk>
            </dl>
          </div>
        </section>

        {/* Built by doctors: what that means for how MedWise works */}
        <section aria-labelledby="doctors-h" id="doctors" className="scroll-mt-6 border-t border-line py-16 min-[800px]:py-20">
          <div className="grid gap-8 min-[800px]:grid-cols-[0.8fr_1.2fr]">
            <div>
              <Label>Built by doctors</Label>
              <h2 id="doctors-h" className="mt-3 text-[clamp(26px,3vw,32px)] font-medium leading-[1.15] tracking-[-0.02em]">Built by doctors, for the bedside.</h2>
            </div>
            <p className="text-lg leading-[1.65] text-muted">
              MedWise is built by doctors who make this choice themselves, on night shifts in casualty and the ICU. We built
              the tool we wanted at 3&nbsp;am: quick to fill, honest about its sources, and clear about what it does not cover.
            </p>
          </div>
          <ul className="fin-panel mt-10 grid overflow-hidden min-[520px]:grid-cols-2 min-[1000px]:grid-cols-3">
            {BEDSIDE.map((b) => (
              <li key={b.title} className="-mb-px -mr-px border-b border-r border-line p-6">
                <h3 className="text-lg font-medium leading-snug">{b.title}</h3>
                <p className="mt-1.5 text-[15px] leading-[1.6] text-muted">{b.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works: a connected process row (a vertical sequence on phones) */}
        <section aria-labelledby="how-h" id="how" className="scroll-mt-6 border-t border-line py-16 min-[800px]:py-20">
          <h2 id="how-h" className="font-mono text-[13px] font-normal uppercase tracking-[0.14em] text-muted">
            How it works
          </h2>
          <ol className="relative mt-8 grid gap-8 min-[520px]:grid-cols-2 min-[1100px]:grid-cols-4 min-[1100px]:gap-6">
            <span aria-hidden className="absolute bottom-5 left-[19px] top-5 w-px bg-line min-[520px]:hidden" />
            <span aria-hidden className="absolute left-5 right-5 top-5 hidden h-px bg-line min-[1100px]:block" />
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative flex gap-4 min-[520px]:flex-col">
                <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-ground font-mono text-[15px] text-value">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-medium leading-snug">{s.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-[1.6] text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* What you get: ruled capability cells */}
        <section aria-labelledby="get" className="border-t border-line py-16 min-[800px]:py-20">
          <Label id="get">What you get</Label>
          <ul className="fin-panel mt-8 grid overflow-hidden min-[520px]:grid-cols-2">
            {RESULT_PARTS.map((p, i) => (
              <li key={p.title} className="-mb-px -mr-px border-b border-r border-line p-6">
                <p aria-hidden className="font-mono text-[13px] text-value">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-lg font-medium">{p.title}</h3>
                <p className="mt-1 text-[15px] leading-[1.6] text-muted">{p.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Questions: native disclosures with fine dividers */}
        <section aria-labelledby="questions" className="grid gap-8 border-t border-line py-16 min-[800px]:grid-cols-[0.8fr_1.2fr] min-[800px]:py-20">
          <h2 id="questions" className="text-[clamp(26px,3vw,32px)] font-medium tracking-[-0.02em]">
            Before you start
          </h2>
          <div className="border-t border-line">
            {QUESTIONS.map((item) => (
              <details key={item.q} className="group border-b border-line">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 py-4 [&::-webkit-details-marker]:hidden">
                  <span className="flex-1 text-lg font-medium">{item.q}</span>
                  <span aria-hidden className="font-mono text-xl text-accent">
                    <span className="group-open:hidden">+</span>
                    <span className="hidden group-open:inline">−</span>
                  </span>
                </summary>
                <p className="pb-5 text-base leading-[1.65] text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* Closing: tinted field with warm light under the action */}
      <section aria-labelledby="start" className="fin-glow border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-8 min-[800px]:py-20">
          <h2 id="start" className="mx-auto max-w-xl text-[clamp(26px,3.4vw,34px)] font-medium leading-[1.15] tracking-[-0.02em]">
            Choosing an empiric antibiotic tonight?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-lg text-muted">Let&apos;s find the right one for your patient, step by step.</p>
          <Link href="/new?new=1" className="fin-button mt-8 min-h-12 px-7 text-base">
            Start with a new patient <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-8 text-[14px] sm:px-8 min-[800px]:grid-cols-[1.2fr_1fr_1fr_2fr]">
          <div className="col-span-2 min-[800px]:col-span-1">
            <Brand markClass="h-8 w-auto" wordClass="h-4 w-auto" />
          </div>
          <div>
            <p className="font-mono text-[13px] uppercase tracking-[0.12em] text-muted">MedWise</p>
            <ul className="mt-2 flex flex-col gap-1">
              <li>
                <Link href="/new?new=1" className={linkClass}>
                  New patient
                </Link>
              </li>
              <li>
                <a href="#what" className={linkClass}>
                  What it is
                </a>
              </li>
              <li>
                <a href="#doctors" className={linkClass}>
                  Built by doctors
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[13px] uppercase tracking-[0.12em] text-muted">Status</p>
            <p className="mt-2">Demo version</p>
          </div>
          <p className="col-span-2 text-muted min-[800px]:col-span-1">Decision support only. Verify with clinical judgement and local policy.</p>
        </div>
      </footer>
    </div>
  );
}

const Label = ({ children, id }: { children: ReactNode; id?: string }) => (
  <p id={id} className="font-mono text-[13px] uppercase tracking-[0.14em] text-muted">
    {children}
  </p>
);

function Risk({ title, accent, children }: { title: string; accent?: boolean; children: ReactNode }) {
  return (
    <div className="border-b border-line py-4 sm:border-b-0 sm:pr-5 sm:[&+&]:border-l sm:[&+&]:pl-5">
      <dt className={`font-medium ${accent ? "text-accent" : ""}`}>{title}</dt>
      <dd className="mt-1 text-[15px] leading-[1.6] text-muted">{children}</dd>
    </div>
  );
}
