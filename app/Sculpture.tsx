import Image from "next/image";

// The MedWise logo (owner's artwork, public/brand). On the dark pages the light version is used: navy parts
// shown near-white, teal and gold unchanged. The original colours are in public/brand/medwise-logo.png.
// (The file keeps its old name to avoid deleting files without the owner's say.)

// The M mark alone.
export function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return <Image src="/brand/medwise-mark-light.png" alt="" width={111} height={119} className={className} priority />;
}

// The mark with the MedWise wordmark beside it, for headers.
export function Brand({ markClass = "h-9 w-auto", wordClass = "h-5 w-auto" }: { markClass?: string; wordClass?: string }) {
  return (
    <span className="flex items-center gap-3">
      <Logo className={markClass} />
      <Image src="/brand/medwise-wordmark-light.png" alt="MedWise" width={260} height={66} className={wordClass} priority />
    </span>
  );
}

// The full stacked logo: mark, wordmark and gold line.
export function FullLogo({ className = "h-40 w-auto" }: { className?: string }) {
  return <Image src="/brand/medwise-logo-light.png" alt="MedWise" width={274} height={226} className={className} priority />;
}
