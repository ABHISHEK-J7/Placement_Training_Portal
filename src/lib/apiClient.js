// API routes are served under the app basePath (see next.config.mjs).
// next/* auto-prefixes navigation, but fetch() does not — so prefix it here.
export const API_BASE = "/placement-trainings/api";

async function handle(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function apiGet(path) {
  return handle(await fetch(`${API_BASE}${path}`, { cache: "no-store" }));
}

export async function apiPost(path, body) {
  return handle(
    await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    }),
  );
}

export async function apiPatch(path, body) {
  return handle(
    await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    }),
  );
}

export async function apiDelete(path) {
  return handle(await fetch(`${API_BASE}${path}`, { method: "DELETE" }));
}
