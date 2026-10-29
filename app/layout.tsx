import type { Metadata } from "next";
import { DM_Mono, EB_Garamond, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

// Fonts from docs/DESIGN.md: Playfair Display (titles), Inter (screens), EB Garamond (reasoning and quotes),
// DM Mono (doses, numbers).
const display = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const body = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
});

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const mono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "MedWise",
  description: "Decision support for empiric antibiotic choice in adult sepsis.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
