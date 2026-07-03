/**
 * The authoritative set of Torii numbers (roll_no) belonging to the 3 placement
 * batches. Used server-side to guarantee that assessment / communication results
 * only ever include students from PT_AI_READY_2027, PT_IT_2027, PT_NON_IT_2027 —
 * no data from any other batch. Cached ~5 min.
 */
const BACKEND = process.env.TORII_BACKEND_URL || "https://toriiminds.com/backend/api";
const ALLOWED = new Set(["PT_AI_READY_2027", "PT_IT_2027", "PT_NON_IT_2027"]);

let cache = { at: 0, set: null };
const CACHE_MS = 5 * 60 * 1000;

export async function allowedRolls() {
  if (cache.set && Date.now() - cache.at < CACHE_MS) return cache.set;
  const set = new Set();
  try {
    const data = await fetch(`${BACKEND}/get-batches`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    const list = Array.isArray(data) ? data : data?.result || [];
    for (const b of list) {
      if (!ALLOWED.has(b.batch_name)) continue;
      for (const roll of b.student_list || []) set.add(String(roll).trim().toUpperCase());
    }
    if (set.size) cache = { at: Date.now(), set };
  } catch {
    /* keep whatever we had */
  }
  return set;
}

/** Filter an array to rows whose roll_no is in the 3-batch roster. No-op if the
 *  roster couldn't be loaded (avoids wrongly dropping everything). */
export function keepAllowed(rows, rollSet, rollKey = "roll_no") {
  if (!rollSet || rollSet.size === 0) return rows;
  return rows.filter((r) => rollSet.has(String(r[rollKey] || "").trim().toUpperCase()));
}
