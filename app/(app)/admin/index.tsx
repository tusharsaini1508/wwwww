import React from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { Card } from "../../../src/components/Card";
import { AccessDenied } from "../../../src/components/AccessDenied";
import { RoleBadge } from "../../../src/components/RoleBadge";
import { AdminTabs } from "../../../src/components/AdminTabs";
import { theme } from "../../../src/theme";
import { useCurrentUser } from "../../../src/hooks/useCurrentUser";
import { useCan } from "../../../src/hooks/useCurrentUser";
import { useAppStore } from "../../../src/store/useAppStore";

export default function AdminHome() {
  const user = useCurrentUser();
  const canUsers = useCan("users.manage");
  const canRoles = useCan("roles.manage");
  const canProducts = useCan("products.edit");
  const canProcurement = useCan("procurement.view");
  const canAudit = useCan("audit.view");
  const canFacilities = useCan("warehouse.edit");
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const companies = useAppStore((state) => state.companies);
  const companyName =
    companies.find((company) => company.id === user?.companyId)?.name ?? "Unknown";

  if (!canUsers && !canRoles && !canProducts && !canProcurement && !canAudit) {
    return (
      <Screen>
        <SectionHeader title="Admin Center" subtitle="Role-based access enforced." />
        <AccessDenied />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionHeader
        title="Admin Center"
        subtitle="Supervise users, permissions, and product masters."
      />
      <AdminTabs />
      <Card style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View>
            <Text style={styles.name}>{user?.name ?? "Admin"}</Text>
            <Text style={styles.email}>{user?.email ?? "admin@wms.com"}</Text>
            <Text style={styles.company}>Company: {companyName}</Text>
          </View>
          {user ? <RoleBadge role={user.role} /> : null}
        </View>
      </Card>

      <View style={styles.stack}>
        {canUsers ? (
          <Link href="/admin/users" asChild>
            <Pressable style={styles.link}>
              <Card>
                <Text style={styles.linkTitle}>User Management</Text>
                <Text style={styles.linkSub}>
                  Create accounts, assign roles, and manage access.
                </Text>
              </Card>
            </Pressable>
          </Link>
        ) : null}
        {canRoles ? (
          <Link href="/admin/roles" asChild>
            <Pressable style={styles.link}>
              <Card>
                <Text style={styles.linkTitle}>Access Controls</Text>
                <Text style={styles.linkSub}>
                  Set limits for admins and team roles.
                </Text>
              </Card>
            </Pressable>
          </Link>
        ) : null}
        {isSuperAdmin ? (
          <Link href="/admin/companies" asChild>
            <Pressable style={styles.link}>
              <Card>
                <Text style={styles.linkTitle}>Company Access</Text>
                <Text style={styles.linkSub}>
                  Create companies and set feature entitlements.
                </Text>
              </Card>
            </Pressable>
          </Link>
        ) : null}
        {canProducts ? (
          <Link href="/admin/products" asChild>
            <Pressable style={styles.link}>
              <Card>
                <Text style={styles.linkTitle}>Product Master Data</Text>
                <Text style={styles.linkSub}>
                  Update items, reorder points, and lead times.
                </Text>
              </Card>
            </Pressable>
          </Link>
        ) : null}
        {canProcurement ? (
          <Link href="/admin/suppliers" asChild>
            <Pressable style={styles.link}>
              <Card>
                <Text style={styles.linkTitle}>Supplier Master</Text>
                <Text style={styles.linkSub}>
                  Maintain vendor contacts, lead times, and contracts.
                </Text>
              </Card>
            </Pressable>
          </Link>
        ) : null}
        {canFacilities ? (
          <Link href="/admin/facility" asChild>
            <Pressable style={styles.link}>
              <Card>
                <Text style={styles.linkTitle}>Facility Setup</Text>
                <Text style={styles.linkSub}>
                  Manage warehouses, locations, and bins.
                </Text>
              </Card>
            </Pressable>
          </Link>
        ) : null}
        {canAudit ? (
          <Link href="/admin/audit" asChild>
            <Pressable style={styles.link}>
              <Card>
                <Text style={styles.linkTitle}>Audit Log</Text>
                <Text style={styles.linkSub}>
                  Track approvals, overrides, and compliance events.
                </Text>
              </Card>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    marginBottom: theme.spacing.lg
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    rowGap: theme.spacing.sm
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.ink
  },
  email: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  company: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  stack: {
    gap: theme.spacing.md
  },
  link: {
    borderRadius: theme.radius.md
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.ink
  },
  linkSub: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.inkSubtle
  }
});
