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
