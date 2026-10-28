// Placeholder home page. The patient-entry screens come in a later step.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-12">
      <h1 className="font-display text-4xl text-ink">MedWise</h1>
      <hr className="my-6 border-rule" />
      <p className="text-lg leading-8">
        Empiric antibiotic decision support for adult sepsis.
      </p>
      <p className="mt-4 text-lg leading-8">This site is being set up. No clinical features yet.</p>
      <footer className="mt-auto border-t border-rule pt-4 text-base">
        Decision support only — verify with clinical judgement and local policy.
      </footer>
    </main>
  );
}
