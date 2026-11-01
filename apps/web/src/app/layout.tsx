import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { getWebsitePageData } from "@/lib/website";

export async function generateMetadata(): Promise<Metadata> {
  const [{ config }, requestHeaders] = await Promise.all([
    getWebsitePageData(),
    headers(),
  ]);
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const rawHost = forwardedHost || requestHeaders.get("host") || "";
  const hostname = rawHost.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0].toLowerCase();
  const canonicalUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? (/^[a-z0-9.-]+$/.test(hostname) ? `https://${hostname}` : "https://badebabakharadi.com");
  const title = config?.hero.title ?? "Bade Baba Kharadi | Shri Adinath Jinalay";
  const description = config?.hero.description
    ?? "Official temple website with temple information, events, seva and community updates.";

  return {
    title: { default: title, template: `%s | ${title}` },
    description,
    metadataBase: new URL(canonicalUrl),
    openGraph: { title, description, type: "website", locale: "hi_IN" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hi">
      <body>{children}</body>
    </html>
  );
}
