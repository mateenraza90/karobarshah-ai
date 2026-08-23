import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";

// Display face — headings, the wordmark, and section titles. Distinctive
// geometric character that reads as "operating system" rather than
// "marketing site."
export const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

// Body/UI face — everything else. Chosen for legibility at small sizes,
// since a dashboard is mostly dense UI text, not prose.
export const fontBody = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

// Mono face — reserved for numbers, timestamps, and anything ledger-like
// (KPIs, IDs, currency). Ties back to "Karobar" (business/ledger) as a
// deliberate typographic choice, not a default.
export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});
