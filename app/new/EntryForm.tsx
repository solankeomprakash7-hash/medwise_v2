"use client";

import Link from "next/link";
import { Fragment, useEffect, useId, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import type { Result } from "@/lib/recommend/recommend";
import { getRecommendation } from "./actions";
import ResultView from "./ResultView";
import { Logo } from "../Sculpture";
import {
  EMPTY, LABELS, SECTIONS, TEST_CASES, checkForm, cockcroftGault, isDrugName, lettersOnly, pregnancyAsked, sectionDone, toPatient,
} from "./form";
import type { Form, Problems } from "./form";

// Patient entry (docs/DESIGN.md, screen 1): one page in six sections plus a review, for a phone or tablet at
// night. There are no fields where a name or ID could be typed. Details are kept only in this browser tab
// (sessionStorage) so an accidental refresh loses nothing; they are cleared after the result is shown, when a
// new patient is started, and after 2 hours.

export interface Options {
  choices: Record<string, { value: string; label: string }[]>;
  drugNames: string[];
}

const DRAFT_KEY = "medwise:new-patient-draft";
const DRAFT_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const REVIEW = { id: "review", title: "Review" };

function readDraft(): Form | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as { savedAt: number; form: Form };
    if (Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
      window.sessionStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return { ...EMPTY, ...draft.form };
  } catch {
    return null;
  }
}
function writeDraft(form: Form) {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), form }));
  } catch {
    // Storage blocked (private mode): the form still works, it just is not kept on refresh.
  }
}
function clearDraft() {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // nothing to clear
  }
}

const scrollToId = (id: string) => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
};

export default function EntryForm({ options, showTestCases }: { options: Options; showTestCases: boolean }) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [ready, setReady] = useState(false); // draft read (or not) after the page loads
  const [restored, setRestored] = useState(false);
  const [loadedCase, setLoadedCase] = useState<(typeof TEST_CASES)[number] | null>(null);
  const [showProblems, setShowProblems] = useState(false);
  const [focused, setFocused] = useState("");
  const [result, setResult] = useState<Omit<Result, "audit"> | null>(null);
  const [pending, startTransition] = useTransition();
  const uid = useId();

  // Restore a draft from this tab, unless "New patient" was tapped (?new=1), which starts empty.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("new")) {
      clearDraft();
      url.searchParams.delete("new");
      window.history.replaceState(null, "", url.pathname + url.search);
    } else {
      const draft = readDraft();
      if (draft) {
        setForm(draft); // eslint-disable-line react-hooks/set-state-in-effect -- browser-only value, read once after load
        setRestored(true);
      }
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && !result) writeDraft(form);
  }, [form, ready, result]);

  const set = <K extends keyof Form>(field: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [field]: value }));
    setResult(null);
  };
  const p = checkForm(form);
  const done = SECTIONS.map((_, i) => sectionDone(p, i));
  const doneCount = done.filter(Boolean).length;
  const label = (field: string, value: string) => options.choices[field]?.find((c) => c.value === value)?.label ?? value;

  const submit = () => {
    const first = SECTIONS.findIndex((_, i) => !done[i]);
    if (first >= 0) {
      setShowProblems(true);
      scrollToId(`${uid}-${SECTIONS[first].id}`);
      return;
    }
    startTransition(async () => {
      const answer = await getRecommendation(toPatient(form));
      clearDraft(); // the recommendation is shown: nothing stays stored on this device
      setResult(answer);
      window.scrollTo({ top: 0 });
    });
  };
  const startAgain = () => {
    clearDraft();
    setForm(EMPTY);
    setResult(null);
    setShowProblems(false);
    setRestored(false);
    setLoadedCase(null);
    window.scrollTo({ top: 0 });
  };
  const loadCase = (c: (typeof TEST_CASES)[number]) => {
    setForm(c.form);
    setResult(null);
    setShowProblems(false);
    setRestored(false);
    setLoadedCase(c);
  };

  // Messages shown next to a field: out of scope (red), must correct, please confirm, or required.
  const note = (field: string) => (
    <FieldNote
      problems={p}
      field={field}
      showMissing={showProblems}
      hidden={focused === field}
      onConfirm={(value) => set("confirmed", { ...form.confirmed, [field]: value })}
      onStartAgain={startAgain}
    />
  );
  const choice = (field: keyof Form & string, opts?: { columns?: 2 | 3; exclude?: string[]; legend?: string }) => (
    <Choice
      legend={opts?.legend ?? LABELS[field]}
      options={(options.choices[field] ?? []).filter((o) => !opts?.exclude?.includes(o.value))}
      value={form[field] as string}
      onChange={(v) => set(field, v as Form[typeof field])}
      columns={opts?.columns}
    />
  );
  const multi = (field: "prior_mdr" | "devices" | "comorbidities" | "immunocompromise") => (
    <MultiChoice legend={LABELS[field]} options={options.choices[field] ?? []} value={form[field]} onChange={(v) => set(field, v)} />
  );
  const noneOrYes = (none: string, yes: string) => [
    { value: "no", label: none },
    { value: "yes", label: yes },
  ];
  const numberField = (field: "age" | "weight_kg" | "height_cm" | "sofa" | "crcl_ml_min" | "creatinine", decimal = false, unit?: string) => (
    <NumberField
      label={LABELS[field]}
      unit={unit}
      value={form[field]}
      onChange={(v) => set(field, v)}
      decimal={decimal}
      onFocus={() => setFocused(field === "crcl_ml_min" || field === "creatinine" ? "renal" : field)}
      onBlur={() => setFocused("")}
    />
  );

  const cg = form.renalMode === "creatinine" ? cockcroftGault(form) : null;
  const drugNames = options.drugNames.filter(isDrugName);

  const content: Record<string, ReactNode> = {
    basics: (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            {numberField("age")}
            {note("age")}
          </div>
          <div>
            {numberField("weight_kg", true)}
            {note("weight_kg")}
          </div>
        </div>
        <div>
          {choice("sex", { columns: 3 })}
          {note("sex")}
        </div>
        {pregnancyAsked(form) && (
          <div>
            {choice("pregnancy", { exclude: ["not_applicable"], legend: "Pregnant? (asked for every woman aged 18 or over)" })}
            {note("pregnancy")}
          </div>
        )}
        <div>
          {numberField("height_cm")}
          <p className="mt-1.5 text-[14px] text-muted">Only used to adjust the creatinine clearance calculation for obesity.</p>
          {note("height_cm")}
        </div>
      </>
    ),
    source: (
      <>
        <div>
          <SourcePicker
            options={options.choices.source ?? []}
            main={form.source}
            extra={form.extra_sources}
            onChange={(main, extra) => {
              setForm((f) => ({ ...f, source: main, extra_sources: extra }));
              setResult(null);
            }}
          />
          {note("source")}
        </div>
        <div>
          {choice("setting")}
          {note("setting")}
        </div>
        <div>
          {choice("source_control")}
          {note("source_control")}
        </div>
      </>
    ),
    severity: (
      <>
        <div>
          {choice("severity")}
          {note("severity")}
          {form.severity === "septic_shock" && (
            <Notice title="Septic shock: do not delay treatment">
              Send cultures and give the first antibiotic dose without delay, ideally within 1 hour of recognition. Do not wait
              for this recommendation.
              <span className="mt-1 block font-mono text-[13px] text-muted">SSC 2026 Rec 16 · NCDC/ICMR 2025</span>
            </Notice>
          )}
        </div>
        <div>
          {numberField("sofa")}
          {note("sofa")}
        </div>
      </>
    ),
    organs: (
      <>
        <div>
          <Choice
            legend={LABELS.renal}
            options={[
              { value: "creatinine", label: "Serum creatinine" },
              { value: "crcl", label: "CrCl or eGFR known" },
            ]}
            value={form.renalMode}
            onChange={(v) => set("renalMode", v as Form["renalMode"])}
          />
          {form.renalMode === "creatinine" && (
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-wrap items-end gap-4">
                {numberField("creatinine", true)}
                <Choice
                  legend="Unit"
                  compact
                  options={[
                    { value: "mg_dl", label: "mg/dL" },
                    { value: "umol_l", label: "µmol/L" },
                  ]}
                  value={form.creatinineUnit}
                  onChange={(v) => set("creatinineUnit", v as Form["creatinineUnit"])}
                />
              </div>
              {form.sex !== "other" && !form.crclOverride && (
                <div className="rounded-[5px] border border-line bg-tint p-4">
                  {cg ? (
                    <>
                      <p className="font-mono text-[13px] uppercase tracking-[0.12em] text-muted">Calculated (Cockcroft-Gault)</p>
                      <p className="mt-1 font-mono text-2xl text-value">{cg.crcl} mL/min</p>
                      <p className="mt-1 font-mono text-[14px] text-muted">{cg.formula}</p>
                      <p className="mt-2 text-[14px] text-muted">
                        {cg.weightKind === "adjusted"
                          ? "Adjusted body weight used: weight is over 120% of ideal weight for the height given."
                          : "Actual body weight used. Add height in Basics to adjust for obesity."}{" "}
                        Unreliable while creatinine is changing (for example AKI): then enter your own estimate.
                      </p>
                    </>
                  ) : (
                    <p className="text-[15px] text-muted">Enter age, sex and weight in Basics and the creatinine here to calculate CrCl.</p>
                  )}
                </div>
              )}
              {form.sex !== "other" &&
                (form.crclOverride ? (
                  <div>
                    {numberField("crcl_ml_min", true)}
                    <button type="button" onClick={() => set("crclOverride", false)} className="mt-2 min-h-11 text-[15px] font-medium underline decoration-line underline-offset-4">
                      Use the calculated value instead
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => set("crclOverride", true)} className="fin-button-quiet min-h-11 self-start px-5 text-[15px]">
                    Use a different CrCl value
                  </button>
                ))}
            </div>
          )}
          {form.renalMode === "crcl" && <div className="mt-4">{numberField("crcl_ml_min", true)}</div>}
          {note("renal")}
        </div>
        <div>
          <Choice
            legend={LABELS.dialysis}
            options={noneOrYes("No", "Yes")}
            value={form.onDialysis}
            onChange={(v) => {
              setForm((f) => ({ ...f, onDialysis: v as Form["onDialysis"], dialysisType: v === "no" ? "" : f.dialysisType }));
              setResult(null);
            }}
          />
          {form.onDialysis === "yes" && (
            <div className="mt-4">
              <Choice
                legend={LABELS.dialysisType}
                options={(options.choices.dialysis ?? []).filter((o) => o.value !== "no")}
                value={form.dialysisType}
                onChange={(v) => set("dialysisType", v)}
              />
            </div>
          )}
          {note("dialysis")}
        </div>
        <div>
          {choice("hepatic")}
          {note("hepatic")}
        </div>
      </>
    ),
    exposures: (
      <>
        <div>
          <Choice legend={LABELS.antibiotics_90d} options={noneOrYes("None", "Yes")} value={form.antibioticsGiven} onChange={(v) => set("antibioticsGiven", v as Form["antibioticsGiven"])} />
          {form.antibioticsGiven === "yes" && (
            <DrugRows
              rows={form.antibiotics_90d.map((a) => ({ drug: a.drug, extra: a.days }))}
              onChange={(rows) => set("antibiotics_90d", rows.map((r) => ({ drug: r.drug, days: r.extra })))}
              drugNames={drugNames}
              what="antibiotic"
              extra={{ kind: "days" }}
            />
          )}
          {note("antibiotics_90d")}
        </div>
        <div>
          {choice("admission_90d")}
          {note("admission_90d")}
        </div>
        <div>
          {multi("prior_mdr")}
          {note("prior_mdr")}
        </div>
        <div>
          {multi("devices")}
          {note("devices")}
        </div>
        <div>
          <DrugRows
            legend={LABELS.current_antibiotics}
            rows={form.current_antibiotics.map((d) => ({ drug: d, extra: "" }))}
            onChange={(rows) => set("current_antibiotics", rows.map((r) => r.drug))}
            drugNames={drugNames}
            what="antibiotic"
          />
          {note("current_antibiotics")}
        </div>
      </>
    ),
    host: (
      <>
        <div>
          {multi("comorbidities")}
          {note("comorbidities")}
        </div>
        <div>
          {multi("immunocompromise")}
          {note("immunocompromise")}
        </div>
        <div>
          <Choice legend={LABELS.allergies} options={noneOrYes("None", "Yes")} value={form.allergiesKnown} onChange={(v) => set("allergiesKnown", v as Form["allergiesKnown"])} />
          {form.allergiesKnown === "yes" && (
            <DrugRows
              rows={form.allergies.map((a) => ({ drug: a.drug, extra: a.reaction }))}
              onChange={(rows) => set("allergies", rows.map((r) => ({ drug: r.drug, reaction: r.extra })))}
              drugNames={drugNames}
              what="allergy (drug or class)"
              extra={{ kind: "reaction", options: options.choices.allergy_reaction ?? [] }}
              otherWarning="Not in MedWise's drug list, so this allergy cannot be checked: MedWise will advise discussing with ID / microbiology."
            />
          )}
          {note("allergies")}
        </div>
      </>
    ),
  };

  const steps = [...SECTIONS.map((s, i) => ({ id: s.id, title: s.title, done: done[i] })), { ...REVIEW, done: doneCount === SECTIONS.length }];

  return (
    <div className="flex w-full flex-1 flex-col">
      <header className="border-b border-line bg-tint">
        <div className="mx-auto w-full max-w-5xl px-5 py-5 sm:px-6">
          <Link href="/" className="flex w-fit items-center gap-3 rounded-[5px]">
            <Logo className="size-9" />
            <div>
              <p className="text-lg font-semibold leading-none">MedWise</p>
              <p className="mt-1 font-mono text-[13px] uppercase tracking-[0.12em] text-muted">Empiric antibiotics · adult sepsis</p>
            </div>
          </Link>
          {!result && (
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-[clamp(28px,4vw,36px)] font-medium leading-tight tracking-[-0.02em]">New patient</h1>
                <p className="mt-2 max-w-xl text-base leading-[1.6] text-muted">
                  <span className="font-medium text-ink">Do not enter patient identifiers.</span> No names, hospital numbers,
                  phone numbers, addresses or dates of birth: MedWise does not need them.
                </p>
              </div>
              <button type="button" onClick={startAgain} className="fin-button-quiet min-h-11 px-5 text-[15px]">
                Clear form
              </button>
            </div>
          )}
          {!result && showTestCases && (
            <div className="mt-5 rounded-[5px] border border-dashed border-line p-4">
              <p className="font-mono text-[13px] uppercase tracking-[0.12em] text-muted">Testing only · not shown on the live site</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {TEST_CASES.map((c) => (
                  <button key={c.id} type="button" onClick={() => loadCase(c)} className="fin-button-quiet min-h-11 px-4 text-[15px]">
                    Load test case: {c.title}
                  </button>
                ))}
              </div>
              {loadedCase && (
                <p role="status" className="mt-3 text-[14px] text-muted">
                  Loaded {loadedCase.title}. Placeholder values not stated in the case: {loadedCase.placeholders}.
                </p>
              )}
            </div>
          )}
          {!result && restored && (
            <p role="status" className="mt-4 text-[14px] text-muted">
              Restored the details entered earlier in this browser tab.{" "}
              <button type="button" onClick={startAgain} className="font-medium text-ink underline decoration-line underline-offset-4">
                Start empty instead
              </button>
            </p>
          )}
        </div>
      </header>

      {result && (
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 pt-6 sm:px-6">
          <ResultView result={result} onEdit={() => setResult(null)} onStartAgain={startAgain} />
        </main>
      )}

      <div className={`mx-auto w-full max-w-5xl flex-1 px-5 pb-36 pt-6 sm:px-6 lg:grid lg:grid-cols-[210px_1fr] lg:gap-10 ${result ? "hidden" : ""}`}>
        {/* On wide screens (tablet sideways, desktop) the section list stays on the left. */}
        <nav aria-label="Sections" className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
          <ol className="flex flex-col border-l border-line">
            {steps.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => scrollToId(`${uid}-${s.id}`)}
                  className="-ml-px flex min-h-11 w-full items-center gap-3 border-l border-transparent py-1.5 pl-4 text-left text-[15px] hover:border-muted"
                >
                  <span className={`font-mono text-[13px] ${s.done ? "text-done" : "text-value"}`}>{s.done ? "✓" : String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <main className="flex min-w-0 flex-col gap-6">
          {SECTIONS.map((section, i) => (
            <section key={section.id} id={`${uid}-${section.id}`} aria-labelledby={`${uid}-${section.id}-h`} className="fin-panel scroll-mt-4 px-5 py-6 sm:px-7">
              <SectionHeading id={`${uid}-${section.id}-h`} index={i} title={section.title} hint={section.hint} done={done[i]} problems={p} fields={section.fields} />
              <div className="mt-6 flex flex-col gap-7">{content[section.id]}</div>
            </section>
          ))}

          <section id={`${uid}-review`} aria-labelledby={`${uid}-review-h`} className="fin-panel scroll-mt-4 px-5 py-6 sm:px-7">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line font-mono text-[15px] text-value">
                07
              </span>
              <div>
                <h2 id={`${uid}-review-h`} className="text-lg font-medium leading-tight">Review</h2>
                <p className="text-[14px] text-muted">Check everything, then get the recommendation</p>
              </div>
            </div>
            <Review form={form} problems={p} label={label} onEdit={(id) => scrollToId(`${uid}-${id}`)} />
          </section>
        </main>
      </div>

      {result?.status === "recommendation" && (
        <aside aria-label="Decision" className="mx-auto mb-8 w-full max-w-3xl px-5 sm:px-6">
          {/* Accept / Modify / Override (rule 7) arrive with login, when each decision and its reason can be saved.
              Until then no placeholder buttons are shown. */}
          <p className="fin-panel px-5 py-4 text-[15px] text-muted">
            Accept, Modify and Override will appear here once login is added, so that every decision is saved with its reason.
          </p>
        </aside>
      )}
      {pending && <Thinking />}
      <nav className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-tint ${result ? "hidden" : ""}`} aria-label="Progress">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-tight text-muted">
              <span className="font-mono text-value">{doneCount}</span> of <span className="font-mono text-value">{SECTIONS.length}</span> sections
              complete
            </p>
            <ol className="mt-2 flex gap-1" aria-hidden>
              {SECTIONS.map((s, i) => (
                <li key={s.id} className={`h-1 flex-1 rounded-full ${done[i] ? "bg-done" : "bg-line"}`} />
              ))}
            </ol>
          </div>
          <button type="button" onClick={submit} disabled={pending} className="fin-button min-h-12 shrink-0 px-5 text-base disabled:opacity-70 sm:px-6">
            {pending ? "Working…" : "Get recommendation"}
          </button>
        </div>
      </nav>
    </div>
  );
}

function SectionHeading(props: { id: string; index: number; title: string; hint: string; done: boolean; problems: Problems; fields: readonly string[] }) {
  const missing = props.fields.filter((f) => props.problems.missing.has(f)).length;
  const attention = props.fields.some((f) => props.problems.invalid.has(f) || props.problems.unusual.has(f) || props.problems.stop.has(f));
  return (
    <div className="flex items-center gap-3 border-b border-line pb-4">
      <span
        aria-hidden
        className={`flex size-10 shrink-0 items-center justify-center rounded-full border font-mono text-[15px] ${props.done ? "border-done text-done" : "border-line text-value"}`}
      >
        {props.done ? "✓" : String(props.index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <h2 id={props.id} className="text-lg font-medium leading-tight">
          {props.title}
        </h2>
        <p className="text-[14px] text-muted">{props.hint}</p>
      </div>
      <span className={`font-mono text-[13px] ${props.done ? "text-done" : "text-muted"}`}>
        {props.done ? "Complete" : missing ? `${missing} to answer` : attention ? "Check" : ""}
      </span>
    </div>
  );
}

// The message under a field. Red only for out-of-scope stops (safety); everything else uses the gold notice colour.
function FieldNote(props: {
  problems: Problems;
  field: string;
  showMissing: boolean;
  hidden: boolean; // while the clinician is still typing in this field
  onConfirm: (value: string) => void;
  onStartAgain: () => void;
}) {
  const { problems: p, field } = props;
  if (props.hidden) return null;
  const stop = p.stop.get(field);
  if (stop) return <Stop message={stop} onStartAgain={props.onStartAgain} />;
  const invalid = p.invalid.get(field);
  if (invalid) return <Message>{invalid}</Message>;
  const unusual = p.unusual.get(field);
  if (unusual) {
    return (
      <div role="status" className="mt-3 rounded-[5px] border border-l-4 border-value bg-tint p-4">
        <p className="text-[15px] text-value">{unusual.message} Please check it.</p>
        <button type="button" onClick={() => props.onConfirm(unusual.value)} className="fin-button-quiet mt-3 min-h-11 px-5 text-[15px]">
          Yes, this is correct
        </button>
      </div>
    );
  }
  if (props.showMissing && p.missing.has(field)) return <Message>Required: please answer.</Message>;
  return null;
}

const Message = ({ children }: { children: ReactNode }) => (
  <p role="status" className="mt-2 flex items-start gap-2 text-[15px] text-value">
    <span aria-hidden className="font-mono">!</span>
    {children}
  </p>
);

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="note" className="mt-4 rounded-[5px] border border-l-4 border-value bg-tint p-4">
      <p className="font-medium text-value">{title}</p>
      <p className="mt-1 text-[15px] leading-[1.6] text-ink">{children}</p>
    </div>
  );
}

// Answers are outlined pills; chosen = orange edge and dot (see .fin-option in globals.css).
const optionClass =
  "fin-option flex min-h-12 min-w-0 cursor-pointer items-center justify-center gap-2 px-4 py-2 text-center text-base leading-snug";
const optionState = (selected: boolean) => (selected ? "font-medium" : "");
const legendClass = "mb-3 font-mono text-[13px] uppercase tracking-[0.12em] text-muted";

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

// The dot of a single-choice answer.
const Dot = ({ on }: { on: boolean }) => (
  <span aria-hidden className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${on ? "border-accent" : "border-muted"}`}>
    {on && <span className="size-2 rounded-full bg-accent" />}
  </span>
);

function Choice(props: {
  legend: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  columns?: 2 | 3;
  compact?: boolean;
}) {
  const name = useId();
  const grid = props.compact ? "flex flex-wrap" : props.columns === 3 ? "grid grid-cols-3" : "grid grid-cols-2";
  return (
    <fieldset>
      <legend className={legendClass}>{props.legend}</legend>
      <div className={`gap-3 ${grid}`}>
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

// "None" cannot be combined with other answers, so the clinician actively confirms none.
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
              {selected && <span aria-hidden className="text-accent">✓</span>}
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
  const name = useId();
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
                {selected && <span aria-hidden className="text-accent">✓</span>}
                {breakable(o.label)}
                {o.value === props.main && picked.length > 1 && (
                  <span className="absolute -top-2.5 right-3 rounded-[4px] border border-accent bg-ground px-2 font-mono text-[12px] uppercase tracking-[0.08em] text-accent">Main</span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>
      {picked.length > 1 && (
        <fieldset className="rounded-[5px] border border-line bg-tint p-4">
          <legend className="sr-only">Main source</legend>
          <p className="text-[15px]">
            <span className="font-medium">Main source.</span> <span className="text-muted">The guideline table comparison uses it; the AI must cover all of them.</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {picked.map((v) => (
              <label key={v} className={`${optionClass} ${optionState(v === props.main)}`}>
                <input type="radio" name={name} checked={v === props.main} onChange={() => makeMain(v)} className="sr-only" />
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
    <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex items-center justify-center bg-ground/85 p-6">
      <div className="fin-panel w-full max-w-sm p-7">
        <Logo className="mx-auto size-11" />
        <p className="mt-4 text-center text-xl font-medium">Working it out</p>
        <p className="text-center text-[14px] text-muted">This can take up to a minute.</p>
        <ol className="mt-5 flex flex-col gap-2.5">
          {THINKING_STEPS.map((step, i) => (
            <li key={step} className={`flex items-center gap-3 text-[15px] ${i <= shown ? "" : "text-muted"}`}>
              <span
                aria-hidden
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-[13px] ${
                  i < shown ? "border-done text-done" : i === shown ? "border-accent text-accent" : "border-line text-muted"
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
  unit?: string;
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
        className="fin-input min-h-12 w-full max-w-40 px-4 font-mono text-xl text-value"
      />
    </div>
  );
}

// Search-as-you-type over the knowledge-base drug list. A name not in the list is kept as typed ("Other").
function DrugPicker(props: { value: string; onChange: (v: string) => void; drugNames: string[]; label: string; otherWarning?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const query = props.value.trim().toLowerCase();
  const known = props.drugNames.includes(query);
  const matches = query ? props.drugNames.filter((d) => d.includes(query)).sort((a, b) => Number(!a.startsWith(query)) - Number(!b.startsWith(query))).slice(0, 6) : [];
  return (
    <div className="flex flex-1 flex-col">
      <label htmlFor={id} className="text-[14px] font-medium text-muted">
        {props.label}
      </label>
      <input
        id={id}
        value={props.value}
        onChange={(e) => {
          props.onChange(lettersOnly(e.target.value));
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
        autoCapitalize="none"
        placeholder="Start typing a drug or class"
        className="fin-input mt-1.5 min-h-12 px-3 text-lg"
      />
      {open && query && !known && (
        <ul aria-label="Matching drugs" className="mt-2 flex flex-wrap gap-2">
          {matches.map((d) => (
            <li key={d}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  props.onChange(d);
                  setOpen(false);
                }}
                className="fin-option min-h-11 px-4 text-[15px]"
              >
                {d}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpen(false)}
              className="min-h-11 px-3 text-[15px] text-muted underline decoration-line underline-offset-4"
            >
              Other: keep “{props.value.trim()}”
            </button>
          </li>
        </ul>
      )}
      {!open && query && !known && props.otherWarning && <Message>{props.otherWarning}</Message>}
    </div>
  );
}

type Extra = { kind: "days" } | { kind: "reaction"; options: { value: string; label: string }[] };

// A short list of drugs, each with days given or the reaction.
function DrugRows(props: {
  legend?: string;
  rows: { drug: string; extra: string }[];
  onChange: (rows: { drug: string; extra: string }[]) => void;
  drugNames: string[];
  what: string;
  extra?: Extra;
  otherWarning?: string;
}) {
  const update = (i: number, change: Partial<{ drug: string; extra: string }>) =>
    props.onChange(props.rows.map((r, j) => (j === i ? { ...r, ...change } : r)));
  const Label = props.what[0].toUpperCase() + props.what.slice(1);
  const body = (
    <div className="mt-4 flex flex-col gap-3">
      {props.rows.map((row, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-[5px] border border-line bg-tint p-4">
          <div className="flex flex-wrap items-start gap-3">
            <DrugPicker value={row.drug} onChange={(drug) => update(i, { drug })} drugNames={props.drugNames} label={Label} otherWarning={props.otherWarning} />
            {props.extra?.kind === "days" && (
              <label className="flex w-24 flex-col text-[14px] font-medium text-muted">
                Days (approx.)
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  maxLength={2}
                  value={row.extra}
                  onChange={(e) => update(i, { extra: digitsOnly(e.target.value, false) })}
                  className="fin-input mt-1.5 min-h-12 px-3 font-mono text-lg text-value"
                />
              </label>
            )}
          </div>
          {props.extra?.kind === "reaction" && (
            <Choice legend="Reaction" compact options={props.extra.options} value={row.extra} onChange={(v) => update(i, { extra: v })} />
          )}
          <button
            type="button"
            onClick={() => props.onChange(props.rows.filter((_, j) => j !== i))}
            className="min-h-11 self-start text-[15px] font-medium underline decoration-line underline-offset-4 hover:decoration-muted"
            aria-label={`Remove ${row.drug || props.what}`}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={() => props.onChange([...props.rows, { drug: "", extra: "" }])} className="fin-button-quiet min-h-12 self-start px-5 text-base">
        + Add {props.what}
      </button>
    </div>
  );
  if (!props.legend) return body;
  return (
    <fieldset>
      <legend className={legendClass}>{props.legend}</legend>
      {body}
    </fieldset>
  );
}

// Everything on one panel, each section with an Edit link back to it.
function Review(props: { form: Form; problems: Problems; label: (field: string, value: string) => string; onEdit: (sectionId: string) => void }) {
  const { form: f, label } = props;
  const list = (field: string, values: string[]) => values.map((v) => label(field, v)).join(", ");
  const cg = f.renalMode === "creatinine" && !f.crclOverride ? cockcroftGault(f) : null;
  const unit = f.creatinineUnit === "mg_dl" ? "mg/dL" : "µmol/L";
  const renal =
    f.renalMode === "crcl" ? `${f.crcl_ml_min} mL/min (entered)`
    : f.renalMode === "creatinine" && f.crclOverride ? `${f.crcl_ml_min} mL/min (entered; creatinine ${f.creatinine} ${unit})`
    : cg ? `${cg.crcl} mL/min (Cockcroft-Gault, creatinine ${f.creatinine} ${unit})`
    : "";
  const rows: Record<string, [string, string][]> = {
    basics: [
      [LABELS.age, f.age && `${f.age} years`],
      [LABELS.sex, label("sex", f.sex)],
      [LABELS.weight_kg, f.weight_kg && `${f.weight_kg} kg`],
      ["Height", f.height_cm ? `${f.height_cm} cm` : "Not given"],
      ...(pregnancyAsked(f) ? [[LABELS.pregnancy, label("pregnancy", f.pregnancy)] as [string, string]] : []),
    ],
    source: [
      ["Main source", label("source", f.source)],
      ...(f.extra_sources.length ? [["Also suspected", list("source", f.extra_sources)] as [string, string]] : []),
      [LABELS.setting, label("setting", f.setting)],
      [LABELS.source_control, label("source_control", f.source_control)],
    ],
    severity: [
      [LABELS.severity, label("severity", f.severity)],
      ["SOFA", f.sofa],
    ],
    organs: [
      ["CrCl", renal],
      [LABELS.dialysis, f.onDialysis === "yes" ? label("dialysis", f.dialysisType) : f.onDialysis === "no" ? "No" : ""],
      [LABELS.hepatic, label("hepatic", f.hepatic)],
    ],
    exposures: [
      ["Antibiotics, 90 days", f.antibioticsGiven === "yes" ? f.antibiotics_90d.map((a) => `${a.drug} (${a.days} days)`).join(", ") : f.antibioticsGiven === "no" ? "None" : ""],
      ["Admission, 90 days", label("admission_90d", f.admission_90d)],
      [LABELS.prior_mdr, list("prior_mdr", f.prior_mdr)],
      [LABELS.devices, list("devices", f.devices)],
      ["Antibiotics now", f.current_antibiotics.filter(Boolean).join(", ") || "None given"],
    ],
    host: [
      [LABELS.comorbidities, list("comorbidities", f.comorbidities)],
      [LABELS.immunocompromise, list("immunocompromise", f.immunocompromise)],
      [LABELS.allergies, f.allergiesKnown === "yes" ? f.allergies.map((a) => `${a.drug} (${label("allergy_reaction", a.reaction) || "reaction?"})`).join(", ") : f.allergiesKnown === "no" ? "None" : ""],
    ],
  };
  return (
    <div className="mt-2 divide-y divide-line">
      {SECTIONS.map((s, i) => (
        <div key={s.id} className="py-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">
              <span className={`mr-2 font-mono text-[13px] ${sectionDone(props.problems, i) ? "text-done" : "text-value"}`}>
                {sectionDone(props.problems, i) ? "✓" : String(i + 1).padStart(2, "0")}
              </span>
              {s.title}
            </h3>
            <button type="button" onClick={() => props.onEdit(s.id)} className="min-h-11 px-2 text-[15px] font-medium text-accent underline decoration-accent/40 underline-offset-4">
              Edit {s.title}
            </button>
          </div>
          <dl className="mt-1 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-[minmax(0,14rem)_1fr]">
            {rows[s.id].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-[14px] text-muted">{k}</dt>
                <dd className={`mb-2 sm:mb-0 ${v ? "" : "text-value"}`}>{v || "Not answered"}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
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
    <div ref={ref} role="alert" className="mt-3 scroll-mb-28 rounded-[5px] border border-l-4 border-alert bg-tint p-5">
      <p className="font-medium text-alert">Outside MedWise version 1: no recommendation</p>
      <p className="mt-1 text-ink">{message}</p>
      <button type="button" onClick={onStartAgain} className="fin-button-quiet mt-3 min-h-12 px-5 text-base">
        Start a new patient
      </button>
    </div>
  );
}
