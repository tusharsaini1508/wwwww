import React from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { Card } from "../../../src/components/Card";
import { AccessDenied } from "../../../src/components/AccessDenied";
import { AdminTabs } from "../../../src/components/AdminTabs";
import { theme } from "../../../src/theme";
import { useAppStore } from "../../../src/store/useAppStore";
import { getEffectivePermissions } from "../../../src/lib/permissions";
import { Permission, Role, RoleOverrides } from "../../../src/types";
import { useCan, useCurrentUser } from "../../../src/hooks/useCurrentUser";

type FeatureGroup = {
  key: string;
  label: string;
  description: string;
  permissions: Permission[];
};

const ADMIN_FEATURES: FeatureGroup[] = [
  {
    key: "analytics",
    label: "Analytics",
    description: "KPIs, forecasts, and insights.",
    permissions: ["analytics.view"]
  },
  {
    key: "data",
    label: "Data Hub",
    description: "Import/export CSV data.",
    permissions: ["data.exchange"]
  },
  {
    key: "inventory-edit",
    label: "Inventory Edit",
    description: "Adjust stock and warehouse settings.",
    permissions: ["inventory.edit", "warehouse.edit"]
  },
  {
    key: "planning",
    label: "Planning",
    description: "Production planning and procurement.",
    permissions: ["production.plan", "procurement.view"]
  },
  {
    key: "master-data",
    label: "Master Data",
    description: "Items, BOM, and product settings.",
    permissions: ["products.edit"]
  },
  {
    key: "facilities",
    label: "Facilities",
    description: "Warehouses, locations, and bins.",
    permissions: ["warehouse.edit"]
  },
  {
    key: "users",
    label: "User Management",
    description: "Create and manage users.",
    permissions: ["users.manage"]
  },
  {
    key: "audit",
    label: "Audit Log",
    description: "View platform audit history.",
    permissions: ["audit.view"]
  }
];

const TEAM_FEATURES: FeatureGroup[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Home view and alerts.",
    permissions: ["dashboard.view"]
  },
  {
    key: "inventory-view",
    label: "Inventory View",
    description: "See stock and bins.",
    permissions: ["inventory.view"]
  },
  {
    key: "inventory-edit",
    label: "Inventory Edit",
    description: "Adjust on-hand stock.",
    permissions: ["inventory.edit"]
  },
  {
    key: "production-view",
    label: "Production View",
    description: "Work orders and BOM.",
    permissions: ["production.view"]
  },
  {
    key: "production-plan",
    label: "Production Plan",
    description: "Plan and schedule orders.",
    permissions: ["production.plan"]
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "KPI dashboards and reports.",
    permissions: ["analytics.view"]
  }
];

const TEAM_ROLES: Role[] = ["MANAGER", "PLANNER", "OPERATOR", "VIEWER"];

const roleLabel = (role: Role) => role.replace("_", " ");

const getGroupState = (
  role: Role,
  group: FeatureGroup,
  overrides: RoleOverrides
) => {
  const effective = getEffectivePermissions(role, overrides);
  const enabledCount = group.permissions.filter((permission) =>
    effective.has(permission)
  ).length;
  return {
    enabled: enabledCount === group.permissions.length,
    enabledCount,
    total: group.permissions.length
  };
};

export default function RolesScreen() {
  const currentUser = useCurrentUser();
  const canRoles = useCan("roles.manage");
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const canManage = Boolean(isSuperAdmin || canRoles);
  const roleOverrides = useAppStore((state) => state.roleOverrides);
  const setRoleOverride = useAppStore((state) => state.setRoleOverride);

  if (!canManage) {
    return (
      <Screen>
        <SectionHeader title="Access Controls" subtitle="Role-based access enforced." />
        <AccessDenied />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <SectionHeader
        title="Access Controls"
        subtitle="Super admins define admin limits. Admins manage access for their teams."
      />
      <AdminTabs />
      <ScrollView contentContainerStyle={styles.scroll}>
        {isSuperAdmin ? (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Admin Limits</Text>
            <Text style={styles.sectionSubtitle}>
              Control what admins can access across companies.
            </Text>
            <View style={styles.featureList}>
              {ADMIN_FEATURES.map((feature) => {
                const state = getGroupState("ADMIN", feature, roleOverrides);
                return (
                  <View key={feature.key} style={styles.featureRow}>
                    <View style={styles.featureText}>
                      <Text style={styles.featureLabel}>{feature.label}</Text>
                      <Text style={styles.featureSub}>{feature.description}</Text>
                      <Text style={styles.featureMeta}>
                        Enabled {state.enabledCount}/{state.total}
                      </Text>
                    </View>
                    <Switch
                      value={state.enabled}
                      onValueChange={(value) =>
                        feature.permissions.forEach((permission) =>
                          setRoleOverride("ADMIN", permission, value)
                        )
                      }
                    />
                  </View>
                );
              })}
            </View>
          </Card>
        ) : null}

        {!isSuperAdmin ? (
          <>
            <Text style={styles.sectionHeading}>Team Role Access</Text>
            <View style={styles.stack}>
              {TEAM_ROLES.map((role) => (
                <Card key={role}>
                  <Text style={styles.roleTitle}>{roleLabel(role)}</Text>
                  <View style={styles.featureList}>
                    {TEAM_FEATURES.map((feature) => {
                      const state = getGroupState(role, feature, roleOverrides);
                      return (
                        <View key={`${role}-${feature.key}`} style={styles.featureRow}>
                          <View style={styles.featureText}>
                            <Text style={styles.featureLabel}>{feature.label}</Text>
                            <Text style={styles.featureSub}>{feature.description}</Text>
                            <Text style={styles.featureMeta}>
                              Enabled {state.enabledCount}/{state.total}
                            </Text>
                          </View>
                          <Switch
                            value={state.enabled}
                            onValueChange={(value) =>
                              feature.permissions.forEach((permission) =>
                                setRoleOverride(role, permission, value)
                              )
                            }
                          />
                        </View>
                      );
                    })}
                  </View>
                </Card>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: theme.spacing.xl
  },
  card: {
    marginBottom: theme.spacing.lg
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.ink
  },
  sectionSubtitle: {
    marginTop: 4,
    marginBottom: theme.spacing.md,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.inkSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm
  },
  stack: {
    gap: theme.spacing.md
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm
  },
  featureList: {
    gap: theme.spacing.sm
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  featureText: {
    flex: 1,
    marginRight: theme.spacing.md
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.ink
  },
  featureSub: {
    marginTop: 2,
    fontSize: 11,
    color: theme.colors.inkSubtle
  },
  featureMeta: {
    marginTop: 2,
    fontSize: 10,
    color: theme.colors.textSecondary
  }
});
