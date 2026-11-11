/**
 * Centralized API helper for Seeds CRM frontend.
 * Allows switching between relative Next.js rewrites and direct Backend URL.
 */

// Production backend default or from env
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://crmbackend.seedsofinnocens.com";

/**
 * Maps frontend routes to either relative path or direct backend endpoint.
 * E.g.
 *   "/api/auth/login" -> "https://crmbackend.seedsofinnocens.com/api/v1/auth/login"
 *   "/api/admin/leads" -> "https://crmbackend.seedsofinnocens.com/api/v1/leads"
 */
export function getApiUrl(path: string): string {
  // If absolute URL already, return as is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanBackend = BACKEND_URL.replace(/\/+$/, "");

  // /api/auth/* -> /api/v1/auth/*
  if (path.startsWith("/api/auth/")) {
    return `${cleanBackend}/api/v1/auth/${path.slice("/api/auth/".length)}`;
  }

  // /api/admin/members -> /api/v1/members
  if (path.startsWith("/api/admin/members")) {
    return `${cleanBackend}/api/v1/members${path.slice("/api/admin/members".length)}`;
  }

  // /api/admin/leads/check-phone
  if (path.startsWith("/api/admin/leads/check-phone")) {
    return `${cleanBackend}/api/v1/leads/check-phone${path.slice("/api/admin/leads/check-phone".length)}`;
  }

  // /api/admin/leads/bulk
  if (path.startsWith("/api/admin/leads/bulk")) {
    return `${cleanBackend}/api/v1/leads/bulk-upload${path.slice("/api/admin/leads/bulk".length)}`;
  }

  // /api/admin/leads/assign-bulk
  if (path.startsWith("/api/admin/leads/assign-bulk")) {
    return `${cleanBackend}/api/v1/leads/assign-bulk${path.slice("/api/admin/leads/assign-bulk".length)}`;
  }

  // /api/admin/leads/bulk-update
  if (path.startsWith("/api/admin/leads/bulk-update")) {
    return `${cleanBackend}/api/v1/leads/bulk-update${path.slice("/api/admin/leads/bulk-update".length)}`;
  }

  // /api/admin/leads/merge
  if (path.startsWith("/api/admin/leads/merge")) {
    return `${cleanBackend}/api/v1/leads/merge${path.slice("/api/admin/leads/merge".length)}`;
  }

  // /api/admin/leads OR /api/:role/leads
  const roleLeadsMatch = path.match(/^\/api\/(admin|agent|marketing|mis|team-leader)\/leads(.*)$/);
  if (roleLeadsMatch) {
    return `${cleanBackend}/api/v1/leads${roleLeadsMatch[2]}`;
  }

  // /api/admin/dashboard-stats
  if (path.startsWith("/api/admin/dashboard-stats")) {
    return `${cleanBackend}/api/v1/dashboard-stats${path.slice("/api/admin/dashboard-stats".length)}`;
  }

  // /api/admin/form-config
  if (path.startsWith("/api/admin/form-config")) {
    return `${cleanBackend}/api/v1/form-config${path.slice("/api/admin/form-config".length)}`;
  }

  // /api/integrations/* -> /api/v1/integrations/*
  if (path.startsWith("/api/integrations/")) {
    return `${cleanBackend}/api/v1/integrations/${path.slice("/api/integrations/".length)}`;
  }

  return `${cleanBackend}${path}`;
}

/**
 * Universal fetch wrapper that automatically routes to backend with credentials
 * and token Authorization header for seamless cross-origin support (e.g. localhost -> cloud backend).
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = getApiUrl(input);

  // If token is saved in localStorage (for cross-origin dev e.g. localhost), attach it
  const headers = new Headers(init?.headers || {});
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("seeds_crm_token");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: init?.credentials || "include",
  });

  return res;
}
