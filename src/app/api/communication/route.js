import { NextResponse } from "next/server";
import { allowedRolls, keepAllowed } from "@/lib/allowedRolls";

export const dynamic = "force-dynamic";

const MYNA = process.env.MYNA_URL || "https://myna.toriiminds.com:3001/api";
// Wide default window; override with ?start=dd-mm-yyyy&end=dd-mm-yyyy.
const DEFAULT_START = process.env.MYNA_START_DATE || "01-01-2025";
const DEFAULT_END = process.env.MYNA_END_DATE || "31-12-2027";

// Per-batch Myna admin ids (each batch has its own admin id).
const BATCH_ADMINS = {
  PT_AI_READY_2027: "6a3dfa986aa431f082087a00",
  PT_IT_2027: "6a3dfb3f6aa431f082087a08",
  PT_NON_IT_2027: "6a3dfd2f6aa431f08208934d",
};

// The 25 communication module ids (same for every batch).
const MODULE_IDS = [
  "6756877792b3362d52c4b17e", "6756a2c592b3362d52c4b1fb", "6756a6ee92b3362d52c4b237", "6756a85892b3362d52c4b23c",
  "6756ae0392b3362d52c4b248", "6756aee792b3362d52c4b24d", "6756af8392b3362d52c4b258", "6756b11b92b3362d52c4b268",
  "6756b22b92b3362d52c4b275", "6756b98792b3362d52c4b286", "6756ba4592b3362d52c4b28b", "6756bad092b3362d52c4b290",
  "6756bb7492b3362d52c4b295", "6756bc0e92b3362d52c4b29a", "6756bc8092b3362d52c4b29f", "6756be6092b3362d52c4b2ae",
  "6756c1a692b3362d52c4b2b7", "6756c28f92b3362d52c4b2bc", "6756c4fd92b3362d52c4b2c1", "6863ab4f68f59ccf1ca582c0",
  "698ef42e38b013caf0f7c234", "698ef55d38b013caf0f7d5dc", "699c312f9159637c336bf822", "69a69165588636f72f608bf6",
  "69a9212018ee0ff302f0f1d7",
];

const branchOf = (r) => (Array.isArray(r.branch) ? r.branch[0] : r.branch) || "";

let cache = { key: "", at: 0, attempts: null };
const CACHE_MS = 5 * 60 * 1000;

/**
 * Myna communication results. Fetches per batch (each has its own admin_id) across
 * all 25 modules, merges into one flat attempts array (each row tagged with its
 * `batch`, `branch` normalised to a string), plus a per-module summary. Cached
 * ~5 min. Myna is IP-whitelisted (server-to-server); degrades gracefully if down.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const start_date = url.searchParams.get("start") || DEFAULT_START;
  const end_date = url.searchParams.get("end") || DEFAULT_END;
  const force = url.searchParams.get("refresh") === "1";
  const key = `${start_date}|${end_date}`;

  if (!force && cache.attempts && cache.key === key && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json({ ok: true, ...summarise(cache.attempts), cached: true });
  }

  try {
    const perBatch = await Promise.all(
      Object.entries(BATCH_ADMINS).map(async ([batch, admin_id]) => {
        const res = await fetch(`${MYNA}/get-admin-wise-result-by-date`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ admin_id, start_date, end_date, module_ids: MODULE_IDS }),
          signal: AbortSignal.timeout(25000),
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        return (Array.isArray(data) ? data : []).map((r) => ({ ...r, branch: branchOf(r), batch }));
      }),
    );
    // Belt-and-suspenders: keep only students from the 3 placement batches.
    const attempts = keepAllowed(perBatch.flat(), await allowedRolls());
    cache = { key, at: Date.now(), attempts };
    return NextResponse.json({ ok: true, ...summarise(attempts) });
  } catch (e) {
    const unreachable = e?.name === "TimeoutError" || /timed out|abort|ECONN|fetch failed|network/i.test(e?.message || "");
    return NextResponse.json(
      {
        ok: false,
        error: unreachable
          ? "Myna is unreachable from this server (port 3001 not whitelisted for this IP, or network down)."
          : "Failed to fetch Myna results.",
        attempts: [],
        modules: [],
      },
      { status: unreachable ? 503 : 502 },
    );
  }
}

function summarise(attempts) {
  const byModule = new Map();
  for (const a of attempts) {
    const name = a.collectionName || "—";
    const e = byModule.get(name) || { name, attempts: 0, students: new Set() };
    e.attempts += 1;
    e.students.add(a._id);
    byModule.set(name, e);
  }
  const modules = [...byModule.values()].map((m) => ({ name: m.name, attempts: m.attempts, students: m.students.size })).sort((a, b) => b.students - a.students);
  return { attempts, modules };
}
