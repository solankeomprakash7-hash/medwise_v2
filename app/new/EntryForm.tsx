"use client";

import { Fragment, useEffect, useId, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import type { Result } from "@/lib/recommend/recommend";
import { getRecommendation } from "./actions";
import ResultView from "./ResultView";
import Sculpture, { Logo } from "../Sculpture";

// Patient entry (docs/DESIGN.md, screen 1). Details live only in this page's memory: nothing is stored
// in the browser, and there are no free-text fields where a name or ID could be typed.

export interface Options {
  choices: Record<string, { value: string; label: string }[]>;
  drugNames: string[];
}

interface Form {
  age: string;
  sex: string;
  weight_kg: string;
  pregnancy: string;
  source: string; // main source
  extra_sources: string[];
  setting: string;
  source_control: string;
  severity: string;
  sofa: string;
  crcl_ml_min: string;
  dialysis: string;
  hepatic: string;
  antibioticsGiven: string; // "no" | "yes" | ""
  antibiotics_90d: { drug: string; days: string }[];
  admission_90d: string;
  prior_mdr: string[];
  devices: string[];
  comorbidities: string[];
  immunocompromise: string[];
  allergiesKnown: string; // "no" | "yes" | ""
  allergies: { drug: string; reaction: string }[];
  current_antibiotics: string[];
}

const EMPTY: Form = {
  age: "", sex: "", weight_kg: "", pregnancy: "", source: "", extra_sources: [], setting: "", source_control: "", severity: "",
  sofa: "", crcl_ml_min: "", dialysis: "", hepatic: "", antibioticsGiven: "", antibiotics_90d: [],
  admission_90d: "", prior_mdr: [], devices: [], comorbidities: [], immunocompromise: [], allergiesKnown: "",
  allergies: [], current_antibiotics: [],
};

// One scrolling page in five sections (DESIGN.md, screen 1): no "Next" screens to page through.
const SECTIONS = [
  { title: "Patient", hint: "Age, sex, weight" },
  { title: "Infection", hint: "Source, setting, severity" },
  { title: "Kidney & liver", hint: "For dose adjustment" },
  { title: "Resistance risk", hint: "Recent antibiotics, admission, MDR, devices" },
  { title: "Host & allergies", hint: "Comorbidities, immunity, allergies" },
] as const;

const LABELS: Record<string, string> = {
  age: "Age (years)",
  sex: "Sex",
  weight_kg: "Weight (kg)",
  pregnancy: "Pregnant?",
  source: "Suspected source(s)",
  setting: "Where was it acquired?",
  source_control: "Source control",
  severity: "Severity",
  sofa: "SOFA score (0–24)",
  crcl_ml_min: "Creatinine clearance or eGFR (mL/min)",
  dialysis: "On dialysis?",
  hepatic: "Liver function",
  antibiotics_90d: "Antibiotics in the last 90 days",
  admission_90d: "Hospital admission in the last 90 days",
  prior_mdr: "Previous MDR organism",
  devices: "Devices in place",
  comorbidities: "Comorbidities",
  immunocompromise: "Immunocompromise",
  allergies: "Drug allergies",
  current_antibiotics: "Antibiotics being given now (optional)",
};

const DRUG_NAME = /^[a-z][a-z \-/]{1,39}$/;
const isDrugName = (s: string) => DRUG_NAME.test(s.trim().toLowerCase());
const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const inRange = (s: string, min: number, max: number) => Number.isFinite(num(s)) && num(s) >= min && num(s) <= max;

// What each section still needs, and any out-of-scope stop it triggers.
function sectionProblems(step: number, f: Form): { missing: string[]; invalid: string[]; stop: string[] } {
  const missing: string[] = [];
  const invalid: string[] = [];
  const stop: string[] = [];
  const need = (field: keyof Form) => {
    const v = f[field];
    if (Array.isArray(v) ? v.length === 0 : v === "") missing.push(LABELS[field]);
  };
  if (step === 0) {
    need("age");
    need("sex");
    need("weight_kg");
    if (f.sex === "female") need("pregnancy");
    if (f.age && !inRange(f.age, 0, 110)) invalid.push("Age must be a number up to 110.");
    if (f.weight_kg && !inRange(f.weight_kg, 20, 300)) invalid.push("Weight must be 20 to 300 kg.");
    if (inRange(f.age, 0, 17.99)) stop.push("Age under 18 is outside MedWise version 1.");
    if (f.pregnancy === "yes") stop.push("Pregnancy is outside MedWise version 1.");
  }
  if (step === 1) {
    (["source", "setting", "source_control", "severity", "sofa"] as const).forEach(need);
    if (f.sofa && !inRange(f.sofa, 0, 24)) invalid.push("SOFA score must be 0 to 24.");
  }
  if (step === 2) {
    (["crcl_ml_min", "dialysis", "hepatic"] as const).forEach(need);
    if (f.crcl_ml_min && !inRange(f.crcl_ml_min, 0, 250)) invalid.push("Creatinine clearance must be 0 to 250 mL/min.");
  }
  if (step === 3) {
    if (f.antibioticsGiven === "") missing.push(LABELS.antibiotics_90d);
    if (f.antibioticsGiven === "yes") {
      if (f.antibiotics_90d.length === 0) missing.push("Add at least one antibiotic, or choose No");
      for (const a of f.antibiotics_90d) {
        if (!isDrugName(a.drug)) invalid.push("Antibiotic names may contain letters only.");
        if (!inRange(a.days, 0, 90)) invalid.push("Days must be 0 to 90.");
      }
    }
    (["admission_90d", "prior_mdr", "devices"] as const).forEach(need);
  }
  if (step === 4) {
    (["comorbidities", "immunocompromise"] as const).forEach(need);
    if (f.allergiesKnown === "") missing.push(LABELS.allergies);
    if (f.allergiesKnown === "yes") {
      if (f.allergies.length === 0) missing.push("Add at least one allergy, or choose No");
      for (const a of f.allergies) {
        if (!isDrugName(a.drug)) invalid.push("Allergy names may contain letters only.");
        if (!a.reaction) missing.push(`Reaction to ${a.drug || "the allergy"}`);
      }
    }
    for (const d of f.current_antibiotics) if (!isDrugName(d)) invalid.push("Current antibiotic names may contain letters only.");
    if (f.immunocompromise.includes("neutropenia")) {
      stop.push("Neutropenic sepsis is outside MedWise version 1. Follow your hospital's febrile-neutropenia protocol.");
    }
  }
  return { missing, invalid: [...new Set(invalid)], stop };
}

// The patient as the server expects it (lib/recommend/input.ts).
function toPatient(f: Form) {
  const clean = (s: string) => s.trim().toLowerCase();
  return {
    age: num(f.age),
    sex: f.sex,
    weight_kg: num(f.weight_kg),
    pregnancy: f.sex === "female" ? f.pregnancy : "not_applicable",
    source: f.source,
    extra_sources: f.extra_sources,
    setting: f.setting,
    source_control: f.source_control,
    severity: f.severity,
    sofa: num(f.sofa),
    crcl_ml_min: num(f.crcl_ml_min),
    dialysis: f.dialysis,
    hepatic: f.hepatic,
    antibiotics_90d: f.antibioticsGiven === "yes" ? f.antibiotics_90d.map((a) => ({ drug: clean(a.drug), days: num(a.days) })) : [],
    admission_90d: f.admission_90d,
    prior_mdr: f.prior_mdr,
    devices: f.devices,
    comorbidities: f.comorbidities,
    immunocompromise: f.immunocompromise,
    allergies: f.allergiesKnown === "yes" ? f.allergies.map((a) => ({ drug: clean(a.drug), reaction: a.reaction })) : [],
    current_antibiotics: f.current_antibiotics.map(clean).filter(Boolean),
  };
}

export default function EntryForm({ options }: { options: Options }) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [showProblems, setShowProblems] = useState(false);
  const [typingAge, setTypingAge] = useState(false);
  const [result, setResult] = useState<Omit<Result, "audit"> | null>(null);
  const [pending, startTransition] = useTransition();
  const listId = useId();
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const set = <K extends keyof Form>(field: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [field]: value }));
    setResult(null);
  };
  const problems = SECTIONS.map((_, i) => sectionProblems(i, form));
  const isDone = (i: number) => problems[i].missing.length + problems[i].invalid.length + problems[i].stop.length === 0;
  const doneCount = SECTIONS.filter((_, i) => isDone(i)).length;

  const submit = () => {
    const first = SECTIONS.findIndex((_, i) => !isDone(i));
    if (first >= 0) {
      setShowProblems(true);
      sectionRefs.current[first]?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    startTransition(async () => {
      setResult(await getRecommendation(toPatient(form)));
      window.scrollTo({ top: 0 });
    });
  };
  const startAgain = () => {
    setForm(EMPTY);
    setResult(null);
    setShowProblems(false);
    window.scrollTo({ top: 0 });
  };

  const choice = (field: keyof Form & string, columns?: 2 | 3) => (
    <Choice
      legend={LABELS[field]}
      options={options.choices[field] ?? []}
      value={form[field] as string}
      onChange={(v) => set(field, v as Form[typeof field])}
      columns={columns}
    />
  );
  const multi = (field: "prior_mdr" | "devices" | "comorbidities" | "immunocompromise") => (
    <MultiChoice legend={LABELS[field]} options={options.choices[field] ?? []} value={form[field]} onChange={(v) => set(field, v)} />
  );
  const yesNo = [
    { value: "no", label: "No / none" },
    { value: "yes", label: "Yes" },
  ];

  const fields: ReactNode[] = [
    <>
      <div className="grid grid-cols-2 gap-4">
        <NumberField
          label={LABELS.age}
          value={form.age}
          onChange={(v) => set("age", v)}
          onFocus={() => setTypingAge(true)}
          onBlur={() => setTypingAge(false)}
        />
        <NumberField label={LABELS.weight_kg} value={form.weight_kg} onChange={(v) => set("weight_kg", v)} decimal />
      </div>
      {/* Wait until typing is finished: "6" on the way to "62" must not stop the form. */}
      {!typingAge && inRange(form.age, 0, 17.99) && <Stop message="Age under 18 is outside MedWise version 1." onStartAgain={startAgain} />}
      {choice("sex", 3)}
      {form.sex === "female" && choice("pregnancy", 3)}
      {form.pregnancy === "yes" && <Stop message="Pregnancy is outside MedWise version 1." onStartAgain={startAgain} />}
    </>,
    <>
      <SourcePicker
        options={options.choices.source ?? []}
        main={form.source}
        extra={form.extra_sources}
        onChange={(main, extra) => {
          setForm((f) => ({ ...f, source: main, extra_sources: extra }));
          setResult(null);
        }}
      />
      {choice("setting")}
      {choice("source_control", 3)}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_auto]">
        {choice("severity")}
        <NumberField label={LABELS.sofa} value={form.sofa} onChange={(v) => set("sofa", v)} />
      </div>
    </>,
    <>
      <NumberField label={LABELS.crcl_ml_min} value={form.crcl_ml_min} onChange={(v) => set("crcl_ml_min", v)} decimal />
      {choice("dialysis")}
      {choice("hepatic")}
    </>,
    <>
      <Choice legend={LABELS.antibiotics_90d} options={yesNo} value={form.antibioticsGiven} onChange={(v) => set("antibioticsGiven", v)} />
      {form.antibioticsGiven === "yes" && (
        <DrugRows
          rows={form.antibiotics_90d.map((a) => ({ drug: a.drug, extra: a.days }))}
          onChange={(rows) => set("antibiotics_90d", rows.map((r) => ({ drug: r.drug, days: r.extra })))}
          listId={listId}
          what="antibiotic"
          extra={{ kind: "days" }}
        />
      )}
      {choice("admission_90d")}
      {multi("prior_mdr")}
      {multi("devices")}
    </>,
    <>
      {multi("comorbidities")}
      {multi("immunocompromise")}
      {form.immunocompromise.includes("neutropenia") && (
        <Stop
          message="Neutropenic sepsis is outside MedWise version 1. Follow your hospital's febrile-neutropenia protocol."
          onStartAgain={startAgain}
        />
      )}
      <Choice legend={LABELS.allergies} options={yesNo} value={form.allergiesKnown} onChange={(v) => set("allergiesKnown", v)} />
      {form.allergiesKnown === "yes" && (
        <DrugRows
          rows={form.allergies.map((a) => ({ drug: a.drug, extra: a.reaction }))}
          onChange={(rows) => set("allergies", rows.map((r) => ({ drug: r.drug, reaction: r.extra })))}
          listId={listId}
          what="allergy (drug or class)"
          extra={{ kind: "reaction", options: options.choices.allergy_reaction ?? [] }}
        />
      )}
      <DrugRows
        legend={LABELS.current_antibiotics}
        rows={form.current_antibiotics.map((d) => ({ drug: d, extra: "" }))}
        onChange={(rows) => set("current_antibiotics", rows.map((r) => r.drug))}
        listId={listId}
        what="antibiotic"
      />
    </>,
  ];

  return (
    <div className="flex w-full flex-1 flex-col">
      <header className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6 sm:pt-6">
        <div className={`clay-cushion bg-pink ${result ? "px-6 py-4" : "grid items-center gap-4 p-6 sm:p-9 md:grid-cols-[1.4fr_1fr]"}`}>
          <div>
            <div className="flex items-center gap-3">
              <Logo className="size-9" />
              <div>
                <p className="text-xl font-bold leading-none tracking-[-0.02em]">MedWise</p>
                <p className="mt-1 text-[13px] font-bold uppercase tracking-[0.14em] text-ink-2">Empiric antibiotics · adult sepsis</p>
              </div>
            </div>
            {!result && (
              <>
                <h1 className="mt-6 text-[clamp(44px,8vw,80px)] font-bold leading-[0.95] tracking-[-0.04em]">New patient</h1>
                <p className="mt-4 max-w-md text-lg">
                  Fill in the five sections on this page. No names, hospital numbers or dates of birth: none are needed.
                </p>
              </>
            )}
          </div>
          {!result && <Sculpture className="mx-auto w-full max-w-[170px] md:max-w-[260px]" />}
        </div>
      </header>

      {result && (
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-44 pt-6 sm:px-6">
          <ResultView result={result} onEdit={() => setResult(null)} onStartAgain={startAgain} />
        </main>
      )}
      <main className={`mx-auto w-full max-w-3xl flex-1 px-4 pb-40 pt-6 sm:px-6 ${result ? "hidden" : ""}`}>
        <div className="flex flex-col gap-6">
          {SECTIONS.map((section, i) => (
            <section
              key={section.title}
              ref={(el) => {
                sectionRefs.current[i] = el;
              }}
              aria-labelledby={`${listId}-s${i}`}
              className="clay-tray scroll-mt-4 px-5 py-6 sm:px-9 sm:py-8"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`clay-small flex size-11 shrink-0 items-center justify-center !rounded-full font-mono text-base font-bold ${
                    isDone(i) ? "bg-mint" : "bg-lavender"
                  }`}
                >
                  {isDone(i) ? "✓" : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id={`${listId}-s${i}`} className="text-xl font-bold leading-tight tracking-[-0.02em]">
                    {section.title}
                  </h2>
                  <p className="text-[15px] text-ink-2">{section.hint}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[13px] font-bold ${isDone(i) ? "bg-mint" : "bg-ground"}`}>
                  {isDone(i) ? "Complete" : problems[i].missing.length ? `${problems[i].missing.length} to answer` : "Check"}
                </span>
              </div>
              {showProblems && problems[i].stop.length === 0 && (problems[i].missing.length > 0 || problems[i].invalid.length > 0) && (
                <Alert tone="info" title="Still to complete here">
                  {problems[i].missing.map((m) => (
                    <p key={m}>Please answer: {m}</p>
                  ))}
                  {problems[i].invalid.map((m) => (
                    <p key={m}>{m}</p>
                  ))}
                </Alert>
              )}
              <div className="mt-6 flex flex-col gap-6">{fields[i]}</div>
            </section>
          ))}
        </div>

        <datalist id={listId}>
          {options.drugNames.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </main>

      {result?.status === "recommendation" && (
        <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3" aria-label="Decision">
          <div className="clay-cushion mx-auto max-w-3xl bg-surface px-4 py-3">
            {/* All three equally easy to reach (DESIGN.md). Disabled until decisions can be saved (rule 7). */}
            <div className="flex gap-3">
              <button type="button" disabled className="clay-button min-h-12 flex-1 bg-green text-lg text-white disabled:opacity-60">
                Accept
              </button>
              <button type="button" disabled className="clay-button min-h-12 flex-1 bg-surface text-lg disabled:opacity-60">
                Modify
              </button>
              <button type="button" disabled className="clay-button min-h-12 flex-1 bg-surface text-lg disabled:opacity-60">
                Override
              </button>
            </div>
            <p className="mt-1.5 text-center text-[15px] text-ink-2">Decisions are saved once login is added.</p>
          </div>
        </nav>
      )}
      {pending && <Thinking />}
      <nav className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-3 ${result ? "hidden" : ""}`} aria-label="Progress">
        <div className="clay-cushion mx-auto flex max-w-3xl items-center gap-3 bg-surface py-3 pl-5 pr-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-tight text-ink-2">
              <span className="font-mono text-ink">{doneCount}</span> of <span className="font-mono text-ink">{SECTIONS.length}</span> sections
              complete
            </p>
            <ol className="mt-1.5 flex gap-1" aria-hidden>
              {SECTIONS.map((s, i) => (
                <li key={s.title} className={`clay-well h-2.5 flex-1 rounded-full ${isDone(i) ? "bg-green" : "bg-ground"}`} />
              ))}
            </ol>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="clay-button min-h-13 shrink-0 bg-pink px-5 text-base disabled:opacity-70 sm:px-7 sm:text-lg"
          >
            {pending ? "Working…" : "Get recommendation"}
          </button>
        </div>
      </nav>
    </div>
  );
}

// Answers are clay pills: raised when free, pressed in (lavender) when chosen; see .clay-option in globals.css.
const optionClass =
  "clay-option flex min-h-12 min-w-0 cursor-pointer items-center justify-center gap-2 px-4 py-2 text-center text-base leading-snug";
const optionState = (selected: boolean) => (selected ? "font-bold" : "");
const legendClass = "mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-ink-2";

// Long answers such as "Bloodstream/unknown" may wrap after the slash, never mid-word.
const breakable = (label: string) => (
  <span className="min-w-0">
    {label.split("/").map((part, i, all) => (
      <Fragment key={i}>
        {part}
        {i < all.length - 1 && (
          <>
            /<wbr />
          </>
        )}
      </Fragment>
    ))}
  </span>
);

// The recessed dot of a single-choice answer.
const Dot = ({ on }: { on: boolean }) => (
  <span aria-hidden className="clay-well flex size-4 shrink-0 items-center justify-center rounded-full bg-ground">
    {on && <span className="size-2 rounded-full bg-ink" />}
  </span>
);

function Choice(props: {
  legend: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  columns?: 2 | 3;
}) {
  const name = useId();
  const grid = props.columns === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <fieldset>
      <legend className={legendClass}>{props.legend}</legend>
      <div className={`grid gap-3 ${grid}`}>
        {props.options.map((o) => {
          const selected = props.value === o.value;
          return (
            <label key={o.value} className={`${optionClass} ${optionState(selected)}`}>
              <input type="radio" name={name} value={o.value} checked={selected} onChange={() => props.onChange(o.value)} className="sr-only" />
              <Dot on={selected} />
              {breakable(o.label)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// "None" cannot be combined with other answers.
function MultiChoice(props: { legend: string; options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (v: string) => {
    if (props.value.includes(v)) props.onChange(props.value.filter((x) => x !== v));
    else if (v === "none") props.onChange(["none"]);
    else props.onChange([...props.value.filter((x) => x !== "none"), v]);
  };
  return (
    <fieldset>
      <legend className={legendClass}>
        {props.legend} <span className="font-normal normal-case tracking-normal">· all that apply, or None</span>
      </legend>
      <div className="flex flex-wrap gap-3">
        {props.options.map((o) => {
          const selected = props.value.includes(o.value);
          return (
            <label key={o.value} className={`${optionClass} ${optionState(selected)}`}>
              <input type="checkbox" checked={selected} onChange={() => toggle(o.value)} className="sr-only" />
              {selected && <span aria-hidden className="mr-1.5">✓</span>}
              {breakable(o.label)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// Sources: tick one or more. The first ticked is the main source (the guideline table comparison uses it);
// with two or more, the clinician can change which is main.
function SourcePicker(props: {
  options: { value: string; label: string }[];
  main: string;
  extra: string[];
  onChange: (main: string, extra: string[]) => void;
}) {
  const picked = props.main ? [props.main, ...props.extra] : [];
  const label = (v: string) => props.options.find((o) => o.value === v)?.label ?? v;
  const toggle = (v: string) => {
    const next = picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v];
    props.onChange(next[0] ?? "", next.slice(1));
  };
  const makeMain = (v: string) => props.onChange(v, picked.filter((x) => x !== v));
  return (
    <div className="flex flex-col gap-3">
      <fieldset>
        <legend className={legendClass}>
          {LABELS.source} <span className="font-normal normal-case tracking-normal">· one or more</span>
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {props.options.map((o) => {
            const selected = picked.includes(o.value);
            return (
              <label key={o.value} className={`${optionClass} relative ${optionState(selected)}`}>
                <input type="checkbox" checked={selected} onChange={() => toggle(o.value)} className="sr-only" />
                {selected && <span aria-hidden className="mr-1.5">✓</span>}
                {breakable(o.label)}
                {o.value === props.main && picked.length > 1 && (
                  <span className="clay-small absolute -top-2.5 right-3 !rounded-full bg-pink px-2.5 text-[13px] font-bold">Main</span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>
      {picked.length > 1 && (
        <fieldset className="clay-small bg-lavender/60 p-4">
          <legend className="sr-only">Main source</legend>
          <p className="text-[15px]">
            <span className="font-bold">Main source</span> — the guideline table comparison uses it; the AI must cover all of them.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {picked.map((v) => (
              <label key={v} className={`${optionClass} ${optionState(v === props.main)}`}>
                <input type="radio" name="main-source" checked={v === props.main} onChange={() => makeMain(v)} className="sr-only" />
                <Dot on={v === props.main} />
                {label(v)}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

// Shown while the recommendation is worked out: the real steps the server takes, in order.
const THINKING_STEPS = [
  "Checking the patient details",
  "Gathering guideline passages for this patient",
  "AI weighing the evidence",
  "Safety checks on the AI answer",
  "Adding doses from the knowledge base",
];

function Thinking() {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setShown((n) => Math.min(n + 1, 2)), 1400); // waits on the AI step
    return () => clearInterval(timer);
  }, []);
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-6">
      <div className="clay-cushion w-full max-w-sm bg-surface p-7">
        <div className="clay-cushion mx-auto flex size-20 items-center justify-center !rounded-full bg-pink">
          <Logo className="size-11" />
        </div>
        <p className="mt-5 text-center text-2xl font-bold tracking-[-0.02em]">Working it out</p>
        <p className="text-center text-[15px] text-ink-2">This can take up to a minute.</p>
        <ol className="mt-5 flex flex-col gap-2.5">
          {THINKING_STEPS.map((step, i) => (
            <li key={step} className={`flex items-center gap-3 text-[15px] ${i <= shown ? "font-bold" : "text-ink-2"}`}>
              <span
                aria-hidden
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                  i < shown ? "clay-small !rounded-full bg-mint" : i === shown ? "clay-small !rounded-full bg-pink" : "clay-well bg-ground"
                }`}
              >
                {i < shown ? "✓" : i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// A text box that opens the number keypad and keeps digits only (and one decimal point if allowed).
// Used instead of type="number", which misbehaves on some phones and keyboards.
const digitsOnly = (text: string, decimal: boolean) => {
  const kept = text.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, "");
  const [whole, ...rest] = kept.split(".");
  return rest.length ? `${whole}.${rest.join("")}` : whole;
};

function NumberField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  decimal?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={`block ${legendClass}`}>
        {props.label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={props.decimal ? "decimal" : "numeric"}
        pattern={props.decimal ? "[0-9.]*" : "[0-9]*"}
        autoComplete="off"
        maxLength={6}
        value={props.value}
        onChange={(e) => props.onChange(digitsOnly(e.target.value, props.decimal ?? false))}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        className="clay-well min-h-13 w-full max-w-40 rounded-full bg-ground px-5 font-mono text-xl"
      />
    </div>
  );
}

type Extra = { kind: "days" } | { kind: "reaction"; options: { value: string; label: string }[] };

// A short list of drug names (suggested from the knowledge base), each with days or a reaction.
function DrugRows(props: {
  legend?: string;
  rows: { drug: string; extra: string }[];
  onChange: (rows: { drug: string; extra: string }[]) => void;
  listId: string;
  what: string;
  extra?: Extra;
}) {
  const update = (i: number, change: Partial<{ drug: string; extra: string }>) =>
    props.onChange(props.rows.map((r, j) => (j === i ? { ...r, ...change } : r)));
  return (
    <fieldset>
      {props.legend && <legend className={legendClass}>{props.legend}</legend>}
      <div className="flex flex-col gap-3">
        {props.rows.map((row, i) => (
          <div key={i} className="clay-small flex flex-wrap items-end gap-3 bg-ground/70 p-4">
            <label className="flex flex-1 flex-col text-[15px] font-bold">
              {props.what[0].toUpperCase() + props.what.slice(1)}
              <input
                list={props.listId}
                value={row.drug}
                onChange={(e) => update(i, { drug: e.target.value })}
                autoComplete="off"
                className="clay-well mt-1.5 min-h-12 rounded-full bg-surface px-3 text-lg"
              />
            </label>
            {props.extra?.kind === "days" && (
              <label className="flex w-24 flex-col text-[15px] font-bold">
                Days
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  maxLength={2}
                  value={row.extra}
                  onChange={(e) => update(i, { extra: digitsOnly(e.target.value, false) })}
                  className="clay-well mt-1.5 min-h-12 rounded-full bg-surface px-3 font-mono text-lg"
                />
              </label>
            )}
            {props.extra?.kind === "reaction" && (
              <label className="flex w-40 flex-col text-[15px] font-bold">
                Reaction
                <select
                  value={row.extra}
                  onChange={(e) => update(i, { extra: e.target.value })}
                  className="clay-well mt-1.5 min-h-12 rounded-full bg-surface px-2 text-lg"
                >
                  <option value="">Choose…</option>
                  {props.extra.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={() => props.onChange(props.rows.filter((_, j) => j !== i))}
              className="min-h-12 px-3 text-base font-bold underline underline-offset-4"
              aria-label={`Remove ${row.drug || props.what}`}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => props.onChange([...props.rows, { drug: "", extra: "" }])}
          className="clay-button min-h-12 self-start bg-sky px-5 text-base"
        >
          + Add {props.what}
        </button>
      </div>
    </fieldset>
  );
}

// Out-of-scope stop, shown directly under the answer that caused it (red: safety alerts only).
// It scrolls itself into view, clear of the bottom bar, as soon as it appears.
function Stop({ message, onStartAgain }: { message: string; onStartAgain: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest" });
  }, []);
  return (
    <div ref={ref} className="scroll-mb-28 -mt-2">
      <Alert tone="danger" title="Outside MedWise version 1 — no recommendation">
        <p>{message}</p>
        <button type="button" onClick={onStartAgain} className="clay-button mt-3 min-h-12 bg-surface px-5 text-base">
          Start a new patient
        </button>
      </Alert>
    </div>
  );
}


function Alert({ tone, title, children }: { tone: "danger" | "info" | "success"; title: string; children: ReactNode }) {
  // Red stays for safety alerts only (DESIGN.md): a red-edged cream cushion. Notices use butter yellow.
  const style = {
    danger: "border-2 border-red bg-surface text-red",
    info: "bg-butter",
    success: "bg-mint",
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`clay-small mt-5 p-5 text-base ${style}`}>
      <p className="font-bold">{title}</p>
      <div className="mt-1 text-ink">{children}</div>
    </div>
  );
}
