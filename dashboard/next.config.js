/** @type {import('next').NextConfig} */

// When BACKEND_ORIGIN is set (e.g. the Render URL in Vercel), proxy the FastAPI
// backend paths through this app's own origin. This keeps the auth cookie
// first-party (the browser talks only to the dashboard domain), so cross-site
// SameSite=Lax cookies work without any backend change. Inert when unset, so
// local dev keeps calling the backend directly via NEXT_PUBLIC_API_URL.
const backendOrigin = (process.env.BACKEND_ORIGIN || '').replace(/\/$/, '');

const BACKEND_API_PREFIXES = [
  'auth', 'jobs', 'team', 'organisation', 'usage', 'settings', 'public', 'leaderboard',
];

const nextConfig = {
  serverExternalPackages: ['@napi-rs/canvas'],
  async rewrites() {
    if (!backendOrigin) return [];
    // Note: /api/deepseek and /api/parse-file are this app's own route handlers
    // and are intentionally NOT proxied.
    return BACKEND_API_PREFIXES.map((p) => ({
      source: `/api/${p}/:path*`,
      destination: `${backendOrigin}/api/${p}/:path*`,
    }));
  },
};

export default nextConfig;
