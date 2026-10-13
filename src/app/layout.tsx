import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Kemtech Inc.",
  appleWebApp: { capable: true, title: "Kemtech", statusBarStyle: "default" },
  icons: {
    icon: { url: "/icons/kemtech-192.png", sizes: "192x192", type: "image/png" },
    apple: { url: "/icons/kemtech-180.png", sizes: "180x180", type: "image/png" },
  },
  title: { default: "Kemtech Inc. — Fitness Progress, Measured", template: "%s | Kemtech Inc." },
  description: "A private strength and fitness tracker for workouts, progress, reports, and personal records.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
