import { CompanyLimit, Permission, Role, RoleOverrides } from "../types";

export const PERMISSIONS: Permission[] = [
  "dashboard.view",
  "inventory.view",
  "inventory.edit",
  "production.view",
  "production.plan",
  "analytics.view",
  "data.exchange",
  "users.manage",
  "roles.manage",
  "products.edit",
  "procurement.view",
  "warehouse.edit",
  "audit.view"
];

export const ROLE_BASE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ["dashboard.view", "users.manage", "roles.manage"],
  ADMIN: [
    "dashboard.view",
    "inventory.view",
    "inventory.edit",
    "production.view",
    "production.plan",
    "analytics.view",
    "data.exchange",
    "users.manage",
    "products.edit",
    "procurement.view",
    "warehouse.edit",
    "audit.view"
  ],
  MANAGER: [
    "dashboard.view",
    "inventory.view",
    "inventory.edit",
    "production.view",
    "analytics.view",
    "procurement.view"
  ],
  PLANNER: [
    "dashboard.view",
    "inventory.view",
    "production.view",
    "production.plan",
    "analytics.view",
    "procurement.view"
  ],
  OPERATOR: ["dashboard.view", "inventory.view", "production.view"],
  VIEWER: ["dashboard.view", "inventory.view"]
};

export const getEffectivePermissions = (
  role: Role,
  overrides: RoleOverrides
): Set<Permission> => {
  const base = new Set(ROLE_BASE_PERMISSIONS[role] ?? []);
  const roleOverride = overrides[role];
  if (!roleOverride) {
    return base;
  }
  Object.entries(roleOverride).forEach(([permission, enabled]) => {
    const key = permission as Permission;
    if (enabled === true) {
      base.add(key);
    }
    if (enabled === false) {
      base.delete(key);
    }
  });
  return base;
};

export const canAccess = (
  role: Role,
  overrides: RoleOverrides,
  permission: Permission,
  companyLimit?: CompanyLimit
): boolean => {
  if (role === "SUPER_ADMIN") {
    return getEffectivePermissions(role, overrides).has(permission);
  }
  if (companyLimit?.[permission] === false) {
    return false;
  }
  return getEffectivePermissions(role, overrides).has(permission);
};
