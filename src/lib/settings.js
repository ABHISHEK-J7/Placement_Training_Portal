import { collection } from "@/lib/mongodb";

const LOCK_KEY = "feedbackLock";

/**
 * Global feedback lock. When locked, students cannot submit feedback — the
 * admin must unlock it. Defaults to LOCKED (feedback closed until opened).
 */
export async function getFeedbackLock() {
  const settings = await collection("settings");
  const doc = await settings.findOne({ key: LOCK_KEY });
  return doc ? !!doc.locked : true;
}

export async function setFeedbackLock(locked) {
  const settings = await collection("settings");
  await settings.updateOne(
    { key: LOCK_KEY },
    { $set: { key: LOCK_KEY, locked: !!locked, updatedAt: Date.now() } },
    { upsert: true },
  );
  return !!locked;
}
