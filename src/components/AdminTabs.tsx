import React from "react";
import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";
import { useCan, useCurrentUser } from "../hooks/useCurrentUser";

export const AdminTabs = () => {
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const canUsers = useCan("users.manage");
  const canRoles = useCan("roles.manage");
  const canProducts = useCan("products.edit");
  const canProcurement = useCan("procurement.view");
  const canAudit = useCan("audit.view");
  const canFacilities = useCan("warehouse.edit");
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const canAccessRoles = canRoles;

  const tabs = [
    { label: "Overview", href: "/admin", show: true },
    { label: "Users", href: "/admin/users", show: canUsers },
    { label: "Access", href: "/admin/roles", show: canAccessRoles },
    { label: "Companies", href: "/admin/companies", show: isSuperAdmin },
    { label: "Facilities", href: "/admin/facility", show: canFacilities },
    { label: "Products", href: "/admin/products", show: canProducts },
    { label: "Suppliers", href: "/admin/suppliers", show: canProcurement },
    { label: "Audit", href: "/admin/audit", show: canAudit }
  ].filter((tab) => tab.show);

  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Pressable
            key={tab.href}
            onPress={() => router.push(tab.href as never)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${tab.label}`}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  tabActive: {
    borderColor: theme.colors.accentDark,
    backgroundColor: theme.colors.accentSoft
  },
  tabText: {
    fontSize: 12,
    fontFamily: theme.typography.body,
    fontWeight: "600",
    color: theme.colors.textSecondary
  },
  tabTextActive: {
    color: theme.colors.accentDark,
    fontWeight: "700"
  }
});
