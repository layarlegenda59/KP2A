// Unified Socket/HTTP base URL resolver for WhatsApp and API services
// Ensures consistent, production-safe endpoint selection and prevents fallback to api.sidarsih.site

export interface ResolvedUrls {
  baseUrl: string;
  reason: string;
}

export const sanitize = (url?: string): string | undefined => {
  if (!url) return undefined;
  // Trim and remove trailing slashes
  const trimmed = url.trim();
  return trimmed.replace(/\/$/, '');
};

export const normalizeSidarsih = (url: string): string => {
  // If pointing to api.sidarsih.site or whatsapp.sidarsih.site or backend.sidarsih.site, prefer root domain
  try {
    const u = new URL(url);
    if (
      u.hostname === 'api.sidarsih.site' ||
      u.hostname === 'whatsapp.sidarsih.site' ||
      u.hostname === 'backend.sidarsih.site'
    ) {
      u.hostname = 'sidarsih.site';
      return u.toString().replace(/\/$/, '');
    }
    return u.toString().replace(/\/$/, '');
  } catch {
    return url.replace(/\/$/, '');
  }
};

export function resolveSocketBaseUrl(): ResolvedUrls {
  const env = (import.meta as any).env || {};

  const candidatesRaw: Array<{ key: string; value?: string }> = [
    { key: 'VITE_WHATSAPP_SOCKET_URL', value: env.VITE_WHATSAPP_SOCKET_URL },
    { key: 'VITE_SOCKET_URL', value: env.VITE_SOCKET_URL },
    { key: 'VITE_WHATSAPP_API_URL', value: env.VITE_WHATSAPP_API_URL },
    { key: 'VITE_API_URL', value: env.VITE_API_URL },
  ];

  const candidates = candidatesRaw
    .map(c => ({ key: c.key, value: sanitize(c.value) }))
    .filter(c => !!c.value) as Array<{ key: string; value: string }>;

  // Prefer same-origin when running in browser and matches sidarsih.site
  try {
    if (typeof window !== 'undefined' && window.location?.origin) {
      const origin = window.location.origin.replace(/\/$/, '');
      const host = new URL(origin).hostname;
      if (host.endsWith('sidarsih.site')) {
        return { baseUrl: origin, reason: 'same-origin sidarsih.site' };
      }
    }
  } catch {
    // ignore
  }

  // Pick the first valid env and normalize subdomain -> root domain
  for (const c of candidates) {
    try {
      const url = normalizeSidarsih(c.value);
      const parsed = new URL(url);
      if (parsed.protocol.startsWith('http')) {
        return { baseUrl: url, reason: `env:${c.key}` };
      }
    } catch {
      // skip invalid
    }
  }

  // Final safe fallback
  return { baseUrl: 'https://sidarsih.site', reason: 'fallback' };
}

export function resolveHttpBaseUrl(): ResolvedUrls {
  // For HTTP calls we reuse the same resolver to ensure consistency
  return resolveSocketBaseUrl();
}
