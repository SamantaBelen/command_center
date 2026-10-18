/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD: new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/New_York",
    }).format(new Date()),
  },
  async headers() {
    // Always revalidate the app shell so an installed home-screen PWA picks up
    // new deploys instead of serving a stale cached page. Hashed static assets
    // under /_next keep their own long-term caching.
    const noStore = [
      { key: "Cache-Control", value: "no-store, must-revalidate" },
    ];
    return [
      { source: "/", headers: noStore },
      { source: "/login", headers: noStore },
      { source: "/manifest.json", headers: noStore },
    ];
  },
};

export default nextConfig;
