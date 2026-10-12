import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kemtech Inc. — Fitness Progress, Measured", template: "%s | Kemtech Inc." },
  description: "A private strength and fitness tracker for workouts, progress, reports, and personal records.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
