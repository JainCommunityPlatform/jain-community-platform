import { headers } from "next/headers";

export interface WebsiteSiteConfig {
  tenantId: string;
  version: number;
  theme: { primary: string; secondary: string; background: string; surface: string; accent: string };
  header: { logoUrl?: string; navItems: Array<{ label: string; target: string }>; languages: string[] };
  hero: { eyebrow?: string; title: string; subtitle?: string; description?: string; imageUrl?: string; ctaLabel?: string; ctaTarget?: string };
  quickInfo: Array<{ type: string; title: string; value: string; secondary?: string; actionUrl?: string }>;
  about: { title: string; body: string; imageUrl?: string; ctaLabel?: string; ctaTarget?: string };
  templeDirectory: { enabled: boolean; title: string; subtitle?: string; showSearch: boolean; limit: number };
  events: { enabled: boolean; title: string; items: Array<{ id: string; badge?: string; title: string; dateLabel?: string; description?: string; imageUrl?: string; ctaLabel?: string; ctaUrl?: string }> };
  gallery: { enabled: boolean; title: string; items: Array<{ id: string; title?: string; imageUrl: string; alt?: string }> };
  seva: { enabled: boolean; title: string; items: Array<{ id: string; icon: string; label: string; subtitle?: string; target?: string }> };
  contact: { address?: string; phone?: string; whatsapp?: string; email?: string; mapUrl?: string };
  footer: { tagline?: string };
}

export interface WebsitePageData {
  config: WebsiteSiteConfig | null;
  apiConfigured: boolean;
}

export async function getWebsitePageData(): Promise<WebsitePageData> {
  const apiBase = process.env.JCP_API_BASE_URL?.trim().replace(/\/+$/, "");
  if (!apiBase) return { config: null, apiConfigured: process.env.NODE_ENV === "production" };

  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const rawHost = forwardedHost || requestHeaders.get("host") || "";
  const hostname = rawHost.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0].toLowerCase();

  if (!hostname) return { config: null, apiConfigured: true };

  try {
    const tenantResponse = await fetch(
      `${apiBase}/tenant/resolve?hostname=${encodeURIComponent(hostname)}`,
      { cache: "no-store", headers: { accept: "application/json" } },
    );
    if (!tenantResponse.ok) return { config: null, apiConfigured: true };

    const tenant: { id: string } = await tenantResponse.json();
    if (!tenant?.id) return { config: null, apiConfigured: true };

    const siteResponse = await fetch(`${apiBase}/website/site`, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "x-jcp-tenant-id": tenant.id,
      },
    });
    if (!siteResponse.ok) return { config: null, apiConfigured: true };

    const config = (await siteResponse.json()) as WebsiteSiteConfig;
    if (config.tenantId !== tenant.id || !config.hero?.title) {
      return { config: null, apiConfigured: true };
    }
    return { config, apiConfigured: true };
  } catch {
    // Fail closed when the API is configured: never display one tenant's content on another host.
    return { config: null, apiConfigured: true };
  }
}

export function safeHref(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^(#|\/(?!\/))/.test(trimmed)) return trimmed;
  if (/^(https?:|mailto:|tel:|upi:)/i.test(trimmed)) return trimmed;
  return undefined;
}
