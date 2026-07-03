/** Roles, departments, and the admin credential for the training portal. */

export const ADMIN_CREDENTIAL = {
  username: "Admin@Torii",
  password: "Admin@Torii",
};

/**
 * Role registry. `seesAllStudents` = can view every cohort/department;
 * HOD is the only role scoped to a single department.
 */
export const ROLES = {
  admin: { key: "admin", label: "Administrator", canManageUsers: true, seesAllStudents: true },
  principal: { key: "principal", label: "Principal", canManageUsers: false, seesAllStudents: true },
  placement_cell: { key: "placement_cell", label: "Placement Cell", canManageUsers: false, seesAllStudents: true },
  hod: { key: "hod", label: "Department HOD", canManageUsers: false, seesAllStudents: false },
};

/** Roles an admin can create (everything except another admin). */
export const ASSIGNABLE_ROLES = [ROLES.hod, ROLES.principal, ROLES.placement_cell];

/** Departments map 1:1 to the student `branch` values. */
export const DEPARTMENTS = [
  "CSE",
  "CSE - AI ML",
  "CSE - DS",
  "ECE",
  "ISE",
  "CIVIL",
];

export function roleLabel(key) {
  return ROLES[key]?.label ?? key;
}

export function canManageUsers(user) {
  return !!user && !!ROLES[user.role]?.canManageUsers;
}

export function seesAllStudents(user) {
  return !!user && !!ROLES[user.role]?.seesAllStudents;
}

/**
 * Canonical department key so scoping works across the different codings used by
 * the sources: HOD/directory use "CSE - DS" / "CSE - AI ML"; the assessment API
 * uses short branch codes like "DS" / "AIML". These all normalise to one key.
 */
export function normDept(d) {
  const s = String(d || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!s) return "";
  if (s === "ds" || s === "cseds" || s.includes("datascience")) return "ds";
  if (s === "aiml" || s === "cseaiml" || s === "aimlcse" || s.includes("aiandml") || s.includes("artificialintelligence") || s === "cseai") return "aiml";
  if (s.startsWith("cse")) return "cse";
  if (s.startsWith("ece")) return "ece";
  if (s.startsWith("ise")) return "ise";
  if (s === "ce" || s.startsWith("civil")) return "civil";
  if (s.startsWith("mech") || s === "me") return "mech";
  if (s.startsWith("eee")) return "eee";
  return s;
}

/** True when two department labels refer to the same department. */
export function sameDept(a, b) {
  return normDept(a) === normDept(b);
}
