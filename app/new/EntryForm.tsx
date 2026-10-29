"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import type { Result } from "@/lib/recommend/recommend";
import { getRecommendation } from "./actions";
import ResultView from "./ResultView";

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
  source: string;
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
  age: "", sex: "", weight_kg: "", pregnancy: "", source: "", setting: "", source_control: "", severity: "",
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
  source: "Suspected source",
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
      {choice("source")}
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
      <header className="bg-navy text-white">
        <div className="mx-auto max-w-2xl px-4 pb-6 pt-5">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <p className="font-display text-2xl leading-none">MedWise</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Empiric antibiotics · adult sepsis</p>
            </div>
          </div>
          {!result && (
            <>
              <h1 className="mt-6 font-display text-3xl">New patient</h1>
              <p className="mt-1 text-base text-white/80">
                Fill in the five sections on this page. No names, hospital numbers or dates of birth: none are needed.
              </p>
            </>
          )}
        </div>
      </header>

      {result && (
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-40 pt-5">
          <ResultView result={result} onEdit={() => setResult(null)} onStartAgain={startAgain} />
        </main>
      )}
      <main className={`mx-auto -mt-2 w-full max-w-2xl flex-1 px-4 pb-36 ${result ? "hidden" : ""}`}>
        <div className="flex flex-col gap-4">
          {SECTIONS.map((section, i) => (
            <section
              key={section.title}
              ref={(el) => {
                sectionRefs.current[i] = el;
              }}
              aria-labelledby={`${listId}-s${i}`}
              className="scroll-mt-4 rounded-xl border border-rule bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-center gap-3 border-b border-rule pb-3">
                <span
                  aria-hidden
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-base ${
                    isDone(i) ? "bg-green text-white" : "bg-navy/10 text-navy"
                  }`}
                >
                  {isDone(i) ? "✓" : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id={`${listId}-s${i}`} className="text-lg font-semibold leading-tight text-navy">
                    {section.title}
                  </h2>
                  <p className="text-sm text-muted">{section.hint}</p>
                </div>
                <span className={`text-sm font-semibold ${isDone(i) ? "text-green" : "text-muted"}`}>
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
              <div className="mt-4 flex flex-col gap-6">{fields[i]}</div>
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
        <nav className="fixed inset-x-0 bottom-0 border-t border-rule bg-white/95 backdrop-blur" aria-label="Decision">
          <div className="mx-auto max-w-2xl px-4 py-3">
            {/* All three equally easy to reach (DESIGN.md). Disabled until decisions can be saved (rule 7). */}
            <div className="flex gap-3">
              <button type="button" disabled className="min-h-12 flex-1 rounded-lg bg-green text-lg font-semibold text-white disabled:opacity-50">
                Accept
              </button>
              <button type="button" disabled className="min-h-12 flex-1 rounded-lg border border-navy text-lg disabled:opacity-50">
                Modify
              </button>
              <button type="button" disabled className="min-h-12 flex-1 rounded-lg border border-navy text-lg disabled:opacity-50">
                Override
              </button>
            </div>
            <p className="mt-1 text-center text-sm text-muted">Decisions are saved once login is added.</p>
          </div>
        </nav>
      )}
      <nav className={`fixed inset-x-0 bottom-0 border-t border-rule bg-white/95 backdrop-blur ${result ? "hidden" : ""}`} aria-label="Progress">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-3">
          <div className="flex-1">
            <p className="text-sm text-muted">
              <span className="font-mono text-ink">{doneCount}</span> of <span className="font-mono text-ink">{SECTIONS.length}</span> sections
              complete
            </p>
            <ol className="mt-1.5 flex gap-1" aria-hidden>
              {SECTIONS.map((s, i) => (
                <li key={s.title} className={`h-1.5 flex-1 rounded-full ${isDone(i) ? "bg-green" : "bg-rule"}`} />
              ))}
            </ol>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="min-h-12 rounded-lg bg-navy px-5 text-lg font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {pending ? "Working…" : "Get recommendation"}
          </button>
        </div>
      </nav>
    </div>
  );
}

// A simple mark: a shield with a cross, in the brand blue.
function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-10" aria-hidden>
      <path d="M16 2 4 7v8c0 7.5 5.1 13.4 12 15 6.9-1.6 12-7.5 12-15V7L16 2Z" fill="var(--accent)" />
      <path d="M14 10h4v4h4v4h-4v4h-4v-4h-4v-4h4z" fill="white" />
    </svg>
  );
}

const optionClass =
  "flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center text-base leading-snug transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent";
const optionState = (selected: boolean) =>
  selected ? "border-navy bg-navy font-semibold text-white" : "border-rule bg-cream/60 text-ink hover:border-accent";
const legendClass = "mb-2 text-sm font-semibold uppercase tracking-wider text-muted";

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
      <div className={`grid gap-2 ${grid}`}>
        {props.options.map((o) => {
          const selected = props.value === o.value;
          return (
            <label key={o.value} className={`${optionClass} ${optionState(selected)}`}>
              <input type="radio" name={name} value={o.value} checked={selected} onChange={() => props.onChange(o.value)} className="sr-only" />
              {o.label}
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
      <div className="flex flex-wrap gap-2">
        {props.options.map((o) => {
          const selected = props.value.includes(o.value);
          return (
            <label key={o.value} className={`${optionClass} rounded-full px-4 ${optionState(selected)}`}>
              <input type="checkbox" checked={selected} onChange={() => toggle(o.value)} className="sr-only" />
              {selected && <span aria-hidden className="mr-1.5">✓</span>}
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
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
        className="min-h-12 w-full max-w-40 rounded-lg border border-rule bg-cream/60 px-3 font-mono text-xl focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
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
          <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-rule bg-cream/40 p-3">
            <label className="flex flex-1 flex-col text-base">
              {props.what[0].toUpperCase() + props.what.slice(1)}
              <input
                list={props.listId}
                value={row.drug}
                onChange={(e) => update(i, { drug: e.target.value })}
                autoComplete="off"
                className="mt-1 min-h-12 rounded-lg border border-rule bg-white px-3 text-lg"
              />
            </label>
            {props.extra?.kind === "days" && (
              <label className="flex w-24 flex-col text-base">
                Days
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  maxLength={2}
                  value={row.extra}
                  onChange={(e) => update(i, { extra: digitsOnly(e.target.value, false) })}
                  className="mt-1 min-h-12 rounded-lg border border-rule bg-white px-3 font-mono text-lg"
                />
              </label>
            )}
            {props.extra?.kind === "reaction" && (
              <label className="flex w-40 flex-col text-base">
                Reaction
                <select
                  value={row.extra}
                  onChange={(e) => update(i, { extra: e.target.value })}
                  className="mt-1 min-h-12 rounded-lg border border-rule bg-white px-2 text-lg"
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
              className="min-h-12 px-3 text-base underline"
              aria-label={`Remove ${row.drug || props.what}`}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => props.onChange([...props.rows, { drug: "", extra: "" }])}
          className="min-h-11 self-start rounded-lg border border-dashed border-accent px-4 text-base font-semibold text-accent"
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
        <button type="button" onClick={onStartAgain} className="mt-3 min-h-11 underline">
          Start a new patient
        </button>
      </Alert>
    </div>
  );
}


function Alert({ tone, title, children }: { tone: "danger" | "info" | "success"; title: string; children: ReactNode }) {
  const style = {
    danger: "border-red bg-red/5 text-red",
    info: "border-accent bg-accent/5 text-accent",
    success: "border-green bg-green/5 text-green",
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`mt-4 rounded-lg border-l-4 p-4 text-base ${style}`}>
      <p className="font-semibold">{title}</p>
      <div className="mt-1 text-ink">{children}</div>
    </div>
  );
}
