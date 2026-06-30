/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Site is served under https://toriiminds.com/placement-trainings
  // (nginx proxies that path to this app on port 4001). basePath makes
  // Next prefix all routes AND public assets, so /logo.png resolves to
  // /placement-trainings/logo.png. Must match the server deployment.
  basePath: "/placement-trainings",
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Visiting the bare root (outside the basePath) would 404. Redirect it into
  // the app; the auth gate then sends you to /login or the dashboard.
  // `basePath: false` makes the rule match the true "/" (not /placement-trainings/).
  async redirects() {
    return [
      {
        source: "/",
        destination: "/placement-trainings",
        basePath: false,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
