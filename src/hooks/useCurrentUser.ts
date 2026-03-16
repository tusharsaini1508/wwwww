import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { canAccess } from "../lib/permissions";
import { Permission } from "../types";

export const useCurrentUser = () => {
  const currentUserId = useAppStore((state) => state.currentUserId);
  const users = useAppStore((state) => state.users);
  return useMemo(
    () => users.find((user) => user.id === currentUserId) ?? null,
    [currentUserId, users]
  );
};

export const useCan = (permission: Permission) => {
  const currentUser = useCurrentUser();
  const overrides = useAppStore((state) => state.roleOverrides);
  const companyOverrides = useAppStore((state) => state.companyOverrides);
  const companies = useAppStore((state) => state.companies);
  if (!currentUser) {
    return false;
  }
  if (currentUser.role !== "SUPER_ADMIN") {
    const company = companies.find((item) => item.id === currentUser.companyId);
    if (company && !company.active) {
      return false;
    }
  }
  const companyLimit = companyOverrides[currentUser.companyId];
  return canAccess(currentUser.role, overrides, permission, companyLimit);
};
