import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:5000";

    return {
      beforeFiles: [
        // 1. Authentication endpoints: /api/auth/* -> /api/v1/auth/*
        {
          source: "/api/auth/:path*",
          destination: `${backendUrl}/api/v1/auth/:path*`,
        },

        // 2. Members endpoints: /api/admin/members and /api/admin/members/:id* -> /api/v1/members/:path*
        {
          source: "/api/admin/members",
          destination: `${backendUrl}/api/v1/members`,
        },
        {
          source: "/api/admin/members/:id*",
          destination: `${backendUrl}/api/v1/members/:id*`,
        },

        // 3. Lead static/specialized endpoints (MUST precede generic /api/admin/leads/:id to avoid conflict)
        {
          source: "/api/admin/leads/check-phone",
          destination: `${backendUrl}/api/v1/leads/check-phone`,
        },
        {
          source: "/api/admin/leads/bulk",
          destination: `${backendUrl}/api/v1/leads/bulk-upload`,
        },
        {
          source: "/api/admin/leads/assign-bulk",
          destination: `${backendUrl}/api/v1/leads/assign-bulk`,
        },
        {
          source: "/api/admin/leads/bulk-update",
          destination: `${backendUrl}/api/v1/leads/bulk-update`,
        },
        {
          source: "/api/admin/leads/merge",
          destination: `${backendUrl}/api/v1/leads/merge`,
        },

        // 4. Lead CRUD endpoints
        {
          source: "/api/admin/leads",
          destination: `${backendUrl}/api/v1/leads`,
        },
        {
          source: "/api/admin/leads/:id",
          destination: `${backendUrl}/api/v1/leads/:id`,
        },

        // 5. Dashboard statistics endpoint
        {
          source: "/api/admin/dashboard-stats",
          destination: `${backendUrl}/api/v1/dashboard-stats`,
        },

        // 6. Form configuration endpoints: /api/admin/form-config and /api/admin/form-config/reset
        {
          source: "/api/admin/form-config/reset",
          destination: `${backendUrl}/api/v1/form-config/reset`,
        },
        {
          source: "/api/admin/form-config",
          destination: `${backendUrl}/api/v1/form-config`,
        },

        // 7. Integrations endpoints (Meta OAuth, Pages, Forms, Events)
        {
          source: "/api/integrations/:path*",
          destination: `${backendUrl}/api/v1/integrations/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;

