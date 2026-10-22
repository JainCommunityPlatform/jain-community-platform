import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Bade Baba Kharadi | Shri Adinath Jinalay",
    template: "%s | Bade Baba Kharadi",
  },
  description:
    "Official public website of Shri Adinath Jinalay, Bade Baba Kharadi, Pune. Explore temple information, events, seva, donations and community updates.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://badebabakharadi.com"),
  openGraph: {
    title: "Bade Baba Kharadi | Shri Adinath Jinalay",
    description: "Temple information, events, seva and community updates.",
    type: "website",
    locale: "hi_IN",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hi">
      <body>{children}</body>
    </html>
  );
}
