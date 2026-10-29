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

const STEPS = ["Basics", "Source & severity", "Organs", "Exposures", "Host & allergies", "Review"] as const;

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

// What each step needs before "Next", and any out-of-scope stop it triggers.
function stepProblems(step: number, f: Form): { missing: string[]; invalid: string[]; stop: string[] } {
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
  const [step, setStep] = useState(0);
  const [showProblems, setShowProblems] = useState(false);
  const [result, setResult] = useState<Omit<Result, "audit"> | null>(null);
  const [pending, startTransition] = useTransition();
  const listId = useId();

  const set = <K extends keyof Form>(field: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [field]: value }));
    setResult(null);
  };
  const problems = stepProblems(step, form);
  const blocked = problems.missing.length + problems.invalid.length + problems.stop.length > 0;
  const label = (field: string, value: string) => options.choices[field]?.find((c) => c.value === value)?.label ?? value;

  const goTo = (target: number) => {
    setShowProblems(false);
    setStep(target);
    window.scrollTo({ top: 0 });
  };
  const next = () => {
    if (!blocked) return goTo(step + 1);
    setShowProblems(true);
    window.scrollTo({ top: 0 }); // the message is shown at the top of the step
  };
  const submit = () =>
    startTransition(async () => {
      setResult(await getRecommendation(toPatient(form)));
      window.scrollTo({ top: 0 });
    });
  const startAgain = () => {
    setForm(EMPTY);
    setResult(null);
    goTo(0);
  };

  const choice = (field: keyof Form & string, exclude: string[] = []) => (
    <Choice
      legend={LABELS[field]}
      options={(options.choices[field] ?? []).filter((o) => !exclude.includes(o.value))}
      value={form[field] as string}
      onChange={(v) => set(field, v as Form[typeof field])}
    />
  );
  const multi = (field: "prior_mdr" | "devices" | "comorbidities" | "immunocompromise") => (
    <MultiChoice legend={LABELS[field]} options={options.choices[field] ?? []} value={form[field]} onChange={(v) => set(field, v)} />
  );
  const yesNo = [
    { value: "no", label: "No / none" },
    { value: "yes", label: "Yes" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <header className="px-4 pt-6">
        <p className="font-display text-2xl">MedWise</p>
        <Progress step={step} />
      </header>

      {result && (
        <main className="flex-1 px-4 pb-40 pt-4">
          <h1 className="mb-4 font-display text-3xl">Recommendation</h1>
          <ResultView result={result} onEdit={() => setResult(null)} onStartAgain={startAgain} />
        </main>
      )}
      <main className={`flex-1 px-4 pb-32 pt-4 ${result ? "hidden" : ""}`}>
        <h1 className="font-display text-3xl">{STEPS[step]}</h1>
        <p className="mt-1 text-base">No names, hospital numbers or dates of birth: none are needed.</p>
        {showProblems && problems.stop.length === 0 && (problems.missing.length > 0 || problems.invalid.length > 0) && (
          <Alert tone="info" title="Please complete this step">
            {problems.missing.map((m) => (
              <p key={m}>Please answer: {m}</p>
            ))}
            {problems.invalid.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </Alert>
        )}
        {showProblems && problems.stop.length > 0 && (
          <Alert tone="danger" title="Outside MedWise version 1 — no recommendation">
            {problems.stop.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </Alert>
        )}

        <div className="mt-6 flex flex-col gap-8">
          {step === 0 && (
            <>
              <NumberField label={LABELS.age} value={form.age} onChange={(v) => set("age", v)} />
              {inRange(form.age, 0, 17.99) && <Stop message="Age under 18 is outside MedWise version 1." onStartAgain={startAgain} />}
              {choice("sex")}
              <NumberField label={LABELS.weight_kg} value={form.weight_kg} onChange={(v) => set("weight_kg", v)} />
              {form.sex === "female" && choice("pregnancy")}
              {form.pregnancy === "yes" && <Stop message="Pregnancy is outside MedWise version 1." onStartAgain={startAgain} />}
            </>
          )}
          {step === 1 && (
            <>
              {choice("source")}
              {choice("setting")}
              {choice("source_control")}
              {choice("severity")}
              <NumberField label={LABELS.sofa} value={form.sofa} onChange={(v) => set("sofa", v)} />
            </>
          )}
          {step === 2 && (
            <>
              <NumberField label={LABELS.crcl_ml_min} value={form.crcl_ml_min} onChange={(v) => set("crcl_ml_min", v)} />
              {choice("dialysis")}
              {choice("hepatic")}
            </>
          )}
          {step === 3 && (
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
            </>
          )}
          {step === 4 && (
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
            </>
          )}
          {step === 5 && (
            <Review form={form} label={label} onEdit={goTo} />
          )}
        </div>

        <datalist id={listId}>
          {options.drugNames.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>

      </main>

      {result?.status === "recommendation" && (
        <nav className="fixed inset-x-0 bottom-0 border-t border-rule bg-cream" aria-label="Decision">
          <div className="mx-auto max-w-xl px-4 py-3">
            {/* All three equally easy to reach (DESIGN.md). Disabled until decisions can be saved (rule 7). */}
            <div className="flex gap-3">
              <button type="button" disabled className="min-h-12 flex-1 rounded bg-green text-lg text-cream disabled:opacity-50">
                Accept
              </button>
              <button type="button" disabled className="min-h-12 flex-1 rounded border border-ink text-lg disabled:opacity-50">
                Modify
              </button>
              <button type="button" disabled className="min-h-12 flex-1 rounded border border-ink text-lg disabled:opacity-50">
                Override
              </button>
            </div>
            <p className="mt-1 text-center text-base">Decisions are saved once login is added.</p>
          </div>
        </nav>
      )}
      <nav className={`fixed inset-x-0 bottom-0 border-t border-rule bg-cream ${result ? "hidden" : ""}`} aria-label="Steps">
        <div className="mx-auto flex max-w-xl gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            disabled={step === 0}
            className="min-h-12 flex-1 rounded border border-ink text-lg disabled:opacity-40"
          >
            Back
          </button>
          {step < 5 ? (
            <button type="button" onClick={next} className="min-h-12 flex-1 rounded bg-ink text-lg text-cream">
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="min-h-12 flex-1 rounded bg-ink text-lg text-cream disabled:opacity-60"
            >
              {pending ? "Working…" : "Get recommendation"}
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div className="mt-3">
      <p className="text-base">
        Step <span className="font-mono">{step + 1}</span> of <span className="font-mono">{STEPS.length}</span>
      </p>
      <ol className="mt-2 flex gap-1" aria-label="Progress">
        {STEPS.map((name, i) => (
          <li
            key={name}
            aria-current={i === step ? "step" : undefined}
            aria-label={name}
            className={`h-1.5 flex-1 rounded-full ${i === step ? "bg-gold" : i < step ? "bg-ink" : "bg-rule"}`}
          />
        ))}
      </ol>
    </div>
  );
}

const optionClass =
  "flex min-h-12 cursor-pointer items-center rounded border px-4 text-lg has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold";

function Choice(props: { legend: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2 text-lg font-semibold">{props.legend}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {props.options.map((o) => {
          const selected = props.value === o.value;
          return (
            <label key={o.value} className={`${optionClass} ${selected ? "border-ink bg-ink text-cream" : "border-rule bg-white/60"}`}>
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
      <legend className="mb-1 text-lg font-semibold">{props.legend}</legend>
      <p className="mb-2 text-base">Choose all that apply, or None.</p>
      <div className="grid grid-cols-2 gap-2">
        {props.options.map((o) => {
          const selected = props.value.includes(o.value);
          return (
            <label key={o.value} className={`${optionClass} ${selected ? "border-ink bg-ink text-cream" : "border-rule bg-white/60"}`}>
              <input type="checkbox" checked={selected} onChange={() => toggle(o.value)} className="sr-only" />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function NumberField(props: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-lg font-semibold">
        {props.label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="min-h-12 w-40 rounded border border-ink bg-white px-3 font-mono text-xl"
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
      {props.legend && <legend className="mb-2 text-lg font-semibold">{props.legend}</legend>}
      <div className="flex flex-col gap-3">
        {props.rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 rounded border border-rule p-3">
            <label className="flex flex-1 flex-col text-base">
              {props.what[0].toUpperCase() + props.what.slice(1)}
              <input
                list={props.listId}
                value={row.drug}
                onChange={(e) => update(i, { drug: e.target.value })}
                autoComplete="off"
                className="mt-1 min-h-12 rounded border border-ink bg-white px-3 text-lg"
              />
            </label>
            {props.extra?.kind === "days" && (
              <label className="flex w-24 flex-col text-base">
                Days
                <input
                  type="number"
                  inputMode="numeric"
                  value={row.extra}
                  onChange={(e) => update(i, { extra: e.target.value })}
                  className="mt-1 min-h-12 rounded border border-ink bg-white px-3 font-mono text-lg"
                />
              </label>
            )}
            {props.extra?.kind === "reaction" && (
              <label className="flex w-40 flex-col text-base">
                Reaction
                <select
                  value={row.extra}
                  onChange={(e) => update(i, { extra: e.target.value })}
                  className="mt-1 min-h-12 rounded border border-ink bg-white px-2 text-lg"
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
          className="min-h-12 self-start rounded border border-ink px-4 text-lg"
        >
          + Add {props.what}
        </button>
      </div>
    </fieldset>
  );
}

function Review({ form, label, onEdit }: { form: Form; label: (field: string, value: string) => string; onEdit: (step: number) => void }) {
  const list = (field: string, values: string[]) => values.map((v) => label(field, v)).join(", ");
  const sections: { step: number; rows: [string, ReactNode][] }[] = [
    {
      step: 0,
      rows: [
        [LABELS.age, <Mono key="a">{form.age}</Mono>],
        [LABELS.sex, label("sex", form.sex)],
        [LABELS.weight_kg, <Mono key="w">{form.weight_kg}</Mono>],
        ...(form.sex === "female" ? [[LABELS.pregnancy, label("pregnancy", form.pregnancy)] as [string, ReactNode]] : []),
      ],
    },
    {
      step: 1,
      rows: [
        [LABELS.source, label("source", form.source)],
        [LABELS.setting, label("setting", form.setting)],
        [LABELS.source_control, label("source_control", form.source_control)],
        [LABELS.severity, label("severity", form.severity)],
        [LABELS.sofa, <Mono key="s">{form.sofa}</Mono>],
      ],
    },
    {
      step: 2,
      rows: [
        [LABELS.crcl_ml_min, <Mono key="c">{form.crcl_ml_min}</Mono>],
        [LABELS.dialysis, label("dialysis", form.dialysis)],
        [LABELS.hepatic, label("hepatic", form.hepatic)],
      ],
    },
    {
      step: 3,
      rows: [
        [
          LABELS.antibiotics_90d,
          form.antibioticsGiven === "yes" ? form.antibiotics_90d.map((a) => `${a.drug} (${a.days} days)`).join(", ") : "None",
        ],
        [LABELS.admission_90d, label("admission_90d", form.admission_90d)],
        [LABELS.prior_mdr, list("prior_mdr", form.prior_mdr)],
        [LABELS.devices, list("devices", form.devices)],
      ],
    },
    {
      step: 4,
      rows: [
        [LABELS.comorbidities, list("comorbidities", form.comorbidities)],
        [LABELS.immunocompromise, list("immunocompromise", form.immunocompromise)],
        [
          LABELS.allergies,
          form.allergiesKnown === "yes" ? form.allergies.map((a) => `${a.drug} (${label("allergy_reaction", a.reaction)})`).join(", ") : "None",
        ],
        [LABELS.current_antibiotics, form.current_antibiotics.filter(Boolean).join(", ") || "None"],
      ],
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg">Check everything before asking for a recommendation.</p>
      {sections.map((s) => (
        <section key={s.step} className="border-t border-rule pt-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">{STEPS[s.step]}</h2>
            <button type="button" onClick={() => onEdit(s.step)} className="min-h-11 px-2 text-lg text-gold underline">
              Edit
            </button>
          </div>
          <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-[1fr_1fr]">
            {s.rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-base">{k}</dt>
                <dd className="mb-2 text-lg font-semibold sm:mb-0">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

// Out-of-scope stop, shown directly under the answer that caused it (red: safety alerts only).
// It scrolls itself into view, clear of the bottom bar, as soon as it appears.
function Stop({ message, onStartAgain }: { message: string; onStartAgain: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.scrollIntoView({ block: "nearest" }), []);
  return (
    <div ref={ref} className="scroll-mb-28">
      <Alert tone="danger" title="Outside MedWise version 1 — no recommendation">
        <p>{message}</p>
        <button type="button" onClick={onStartAgain} className="mt-3 min-h-11 underline">
          Start a new patient
        </button>
      </Alert>
    </div>
  );
}

const Mono = ({ children }: { children: ReactNode }) => <span className="font-mono">{children}</span>;

function Alert({ tone, title, children }: { tone: "danger" | "info" | "success"; title: string; children: ReactNode }) {
  const style = { danger: "border-red text-red", info: "border-ink", success: "border-green text-green" }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`mt-4 rounded border-2 bg-white/70 p-4 text-lg ${style}`}>
      <p className="font-semibold">{title}</p>
      <div className="mt-1 text-ink">{children}</div>
    </div>
  );
}
