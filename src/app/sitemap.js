const BASE_URL = "https://toriiminds.com/placement-trainings";

export default function sitemap() {
  const routes = ["/login"];
  return routes.map((path) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency: "monthly",
    priority: 0.5,
  }));
}
