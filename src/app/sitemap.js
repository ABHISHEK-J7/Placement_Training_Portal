const BASE_URL = "https://toriiminds.com";

export default function sitemap() {
  const routes = ["/", "/training", "/training/students"];
  return routes.map((path) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
