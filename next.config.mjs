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
};

export default nextConfig;
