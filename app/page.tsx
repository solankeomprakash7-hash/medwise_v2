import Link from "next/link";

// Home page. Login and the result screen come in later steps.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-12">
      <h1 className="font-display text-4xl text-ink">MedWise</h1>
      <hr className="my-6 border-rule" />
      <p className="text-lg leading-8">
        Empiric antibiotic decision support for adult sepsis.
      </p>
      <p className="mt-4 text-lg leading-8">This site is being set up. No recommendations are given yet.</p>
      <Link href="/new" className="mt-8 inline-flex min-h-12 items-center self-start rounded-lg bg-navy px-6 text-lg font-semibold text-white">
        New patient
      </Link>
      <footer className="mt-auto border-t border-rule pt-4 text-base">
        Decision support only — verify with clinical judgement and local policy.
      </footer>
    </main>
  );
}
