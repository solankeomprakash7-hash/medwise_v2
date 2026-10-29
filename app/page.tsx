import Link from "next/link";
import Sculpture, { Logo } from "./Sculpture";

// Home page. Login and the result screen come in later steps.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <section className="clay-cushion grid items-center gap-6 bg-pink p-7 sm:p-10 md:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-sm font-bold uppercase tracking-[0.16em]">Empiric antibiotics · adult sepsis</span>
          </div>
          <h1 className="mt-6 text-[clamp(54px,9vw,94px)] font-bold leading-[0.95] tracking-[-0.04em]">MedWise</h1>
          <p className="mt-5 max-w-md text-lg">Empiric antibiotic decision support for adult sepsis.</p>
          <p className="mt-3 max-w-md text-lg">This site is being set up. No recommendations are given yet.</p>
          <Link href="/new" className="clay-button mt-7 inline-flex min-h-13 items-center bg-surface px-7 text-lg">
            New patient
          </Link>
        </div>
        <Sculpture className="mx-auto w-full max-w-[220px] md:max-w-[340px]" />
      </section>
      <footer className="clay-tray mt-auto px-7 py-5 text-base">
        Decision support only — verify with clinical judgement and local policy.
      </footer>
    </main>
  );
}
