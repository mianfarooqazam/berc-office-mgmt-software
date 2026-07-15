import { randomUUID } from "crypto";
import {
  DEFAULT_EMPLOYEE_VIEWS,
  PERMISSIONS,
  type PermissionCode,
} from "./permissions";

// Admin@123
const ADMIN_HASH = "$2b$10$AX4UBFAqeElwNrSO5rrK.OYytgCDbmwTCr5mRxWP892ptpUPpAWTm";

export type DemoCompany = {
  id: string;
  name: string;
  legalName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
};

export type DemoHoliday = { id: string; name: string; date: string; recurring: boolean };
export type DemoAudit = {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
};

export type DemoManagedUser = {
  id: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  roleName: "Admin" | "Employee";
  permissionCodes: PermissionCode[];
  employee: {
    id: string;
    employeeId: string;
    fullName: string;
    email: string;
    phone: string | null;
    designation: string | null;
    departmentId: string | null;
    status: string;
    profilePhoto: string | null;
  };
  createdAt: string;
};

type Store = {
  company: DemoCompany;
  holidays: DemoHoliday[];
  audit: DemoAudit[];
  users: DemoManagedUser[];
};

const g = globalThis as unknown as { __bercDemoStoreV3?: Store };

function seed(): Store {
  return {
    company: {
      id: "default",
      name: "BERC",
      legalName: "BERC Office",
      address: "Lahore, Pakistan",
      phone: "+92-300-0000000",
      email: "admin@berc.local",
      website: "https://berc.local",
      logoUrl: null,
      primaryColor: "#0d7377",
      accentColor: "#0b6e99",
    },
    holidays: [
      {
        id: "demo-holiday-1",
        name: "Independence Day",
        date: `${new Date().getFullYear()}-08-14T00:00:00.000Z`,
        recurring: true,
      },
    ],
    audit: [],
    users: [
      {
        id: "demo-user-admin",
        email: "admin@berc.local",
        passwordHash: ADMIN_HASH,
        isActive: true,
        roleName: "Admin",
        permissionCodes: PERMISSIONS.map((p) => p.code),
        employee: {
          id: "demo-emp-admin",
          employeeId: "BERC-001",
          fullName: "BERC Admin",
          email: "admin@berc.local",
          phone: "+92-300-0000001",
          designation: "Administrator",
          departmentId: "demo-dept-1",
          status: "ACTIVE",
          profilePhoto: null,
        },
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function getDemoStore(): Store {
  if (!g.__bercDemoStoreV3) g.__bercDemoStoreV3 = seed();
  return g.__bercDemoStoreV3;
}

export function findDemoUserByEmail(email: string) {
  return getDemoStore().users.find((u) => u.email === email.toLowerCase()) ?? null;
}

export function findDemoUserById(id: string) {
  return getDemoStore().users.find((u) => u.id === id) ?? null;
}

export function listDemoUsers() {
  return [...getDemoStore().users].sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName));
}

export function createDemoUser(input: {
  email: string;
  passwordHash: string;
  fullName: string;
  employeeId: string;
  phone?: string | null;
  designation?: string | null;
  permissionCodes: PermissionCode[];
}) {
  const store = getDemoStore();
  const email = input.email.toLowerCase();
  if (store.users.some((u) => u.email === email)) {
    throw new Error("Email already exists");
  }
  if (store.users.some((u) => u.employee.employeeId === input.employeeId)) {
    throw new Error("Employee ID already exists");
  }

  const user: DemoManagedUser = {
    id: randomUUID(),
    email,
    passwordHash: input.passwordHash,
    isActive: true,
    roleName: "Employee",
    permissionCodes: input.permissionCodes.length ? input.permissionCodes : [...DEFAULT_EMPLOYEE_VIEWS],
    employee: {
      id: randomUUID(),
      employeeId: input.employeeId,
      fullName: input.fullName,
      email,
      phone: input.phone ?? null,
      designation: input.designation ?? null,
      departmentId: "demo-dept-1",
      status: "ACTIVE",
      profilePhoto: null,
    },
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  pushAudit(null, "CREATE", "User", user.id);
  return user;
}

export function updateDemoUser(
  id: string,
  patch: Partial<{
    passwordHash: string;
    isActive: boolean;
    permissionCodes: PermissionCode[];
    fullName: string;
    phone: string | null;
    designation: string | null;
  }>,
) {
  const user = findDemoUserById(id);
  if (!user) throw new Error("User not found");
  if (user.roleName === "Admin" && patch.permissionCodes) {
    throw new Error("Admin access cannot be restricted");
  }
  if (patch.passwordHash) user.passwordHash = patch.passwordHash;
  if (patch.isActive !== undefined) user.isActive = patch.isActive;
  if (patch.permissionCodes) user.permissionCodes = patch.permissionCodes;
  if (patch.fullName) user.employee.fullName = patch.fullName;
  if (patch.phone !== undefined) user.employee.phone = patch.phone;
  if (patch.designation !== undefined) user.employee.designation = patch.designation;
  pushAudit(null, "UPDATE", "User", user.id);
  return user;
}

export function getDemoCompany() {
  return getDemoStore().company;
}

export function updateDemoCompany(patch: Partial<DemoCompany>) {
  const company = getDemoStore().company;
  Object.assign(company, patch);
  return company;
}

export function listDemoHolidays() {
  return getDemoStore().holidays;
}

export function addDemoHoliday(name: string, date: string) {
  const holiday: DemoHoliday = {
    id: randomUUID(),
    name,
    date: new Date(date).toISOString(),
    recurring: false,
  };
  getDemoStore().holidays.push(holiday);
  return holiday;
}

export function listDemoAudit() {
  return [...getDemoStore().audit].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function pushAudit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
) {
  getDemoStore().audit.unshift({
    id: randomUUID(),
    userId,
    action,
    entity,
    entityId: entityId ?? null,
    createdAt: new Date().toISOString(),
  });
}

export function demoPermissionsCatalog() {
  return PERMISSIONS.map((p) => ({
    id: p.code,
    code: p.code,
    name: p.name,
    module: p.module,
  }));
}
