import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { StatCard } from "../../src/components/StatCard";
import { Card } from "../../src/components/Card";
import { Tag } from "../../src/components/Tag";
import { theme } from "../../src/theme";
import { useAppStore } from "../../src/store/useAppStore";
import { useCan, useCurrentUser } from "../../src/hooks/useCurrentUser";
import { AccessDenied } from "../../src/components/AccessDenied";
import { LogoMark } from "../../src/components/LogoMark";
import { formatDelta, formatNumber } from "../../src/lib/format";

export default function DashboardScreen() {
  const currentUser = useCurrentUser();
  const canView = useCan("dashboard.view");
  const kpis = useAppStore((state) => state.kpis);
  const alerts = useAppStore((state) => state.alerts);
  const workOrders = useAppStore((state) => state.workOrders);
  const audit = useAppStore((state) => state.audit);
  const latestEvent = audit[0];
  const companies = useAppStore((state) => state.companies);
  const users = useAppStore((state) => state.users);
  const items = useAppStore((state) => state.items);
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const canInventory = useCan("inventory.view");
  const canOperations = useCan("inventory.view");
  const canProduction = useCan("production.view");
  const canAnalytics = useCan("analytics.view");
  const canDataHub = useCan("data.exchange");
  const canProducts = useCan("products.edit");

  if (!canView) {
    return (
      <Screen>
        <SectionHeader title="Dashboard" subtitle="Role-based access enforced." />
        <AccessDenied />
      </Screen>
    );
  }

  if (isSuperAdmin) {
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter((company) => company.active).length;
    const suspendedCompanies = totalCompanies - activeCompanies;
    const adminCount = users.filter((user) => user.role === "ADMIN").length;
    const totalUsers = users.length;
    return (
      <Screen>
        <SectionHeader
          title="Super Admin Console"
          subtitle="Platform governance, company access, and role controls."
        />
        <View style={styles.grid}>
          <StatCard label="Companies" value={String(totalCompanies)} />
          <StatCard label="Active" value={String(activeCompanies)} />
          <StatCard label="Suspended" value={String(suspendedCompanies)} />
          <StatCard label="Admins" value={String(adminCount)} />
          <StatCard label="Users" value={String(totalUsers)} />
        </View>

        <SectionHeader title="Quick Actions" subtitle="Jump directly to key workflows." />
        <View style={styles.quickActions}>
          <Link href="/admin/companies" asChild>
            <Pressable style={styles.quickAction}>
              <Text style={styles.quickActionTitle}>Companies</Text>
              <Text style={styles.quickActionSub}>Plans and access limits</Text>
            </Pressable>
          </Link>
          <Link href="/admin/users" asChild>
            <Pressable style={styles.quickAction}>
              <Text style={styles.quickActionTitle}>Users</Text>
              <Text style={styles.quickActionSub}>Create and update accounts</Text>
            </Pressable>
          </Link>
          <Link href="/admin/roles" asChild>
            <Pressable style={styles.quickAction}>
              <Text style={styles.quickActionTitle}>Access</Text>
              <Text style={styles.quickActionSub}>Admin limits and role access</Text>
            </Pressable>
          </Link>
        </View>

        <SectionHeader
          title="Admin Controls"
          subtitle="Manage access, roles, and platform governance."
        />
        <View style={styles.stack}>
          <Link href="/admin/companies" asChild>
            <Pressable style={styles.link}>
              <Card>
                <Text style={styles.linkTitle}>Company Access</Text>
                <Text style={styles.linkSub}>
                  Create companies, suspend access, and set limits.
                </Text>
              </Card>
            </Pressable>
          </Link>
          <Link href="/admin/users" asChild>
            <Pressable style={styles.link}>
              <Card>
                <Text style={styles.linkTitle}>User Management</Text>
                <Text style={styles.linkSub}>
                  Create admins and control user access.
                </Text>
              </Card>
            </Pressable>
          </Link>
          <Link href="/admin/roles" asChild>
            <Pressable style={styles.link}>
              <Card>
                <Text style={styles.linkTitle}>Role & Permissions</Text>
                <Text style={styles.linkSub}>
                  Override role permissions and analytics access.
                </Text>
              </Card>
            </Pressable>
          </Link>
          <Link href="/admin/products" asChild>
            <Pressable style={styles.link}>
              <Card>
                <Text style={styles.linkTitle}>Product Master Data</Text>
                <Text style={styles.linkSub}>
                  Maintain core master data and thresholds.
                </Text>
              </Card>
            </Pressable>
          </Link>
          <Link href="/admin/audit" asChild>
            <Pressable style={styles.link}>
              <Card>
                <Text style={styles.linkTitle}>Audit Log</Text>
                <Text style={styles.linkSub}>
                  Review platform actions and compliance trails.
                </Text>
              </Card>
            </Pressable>
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.logoBlock}>
        <LogoMark size="sm" withWordmark />
      </View>
      <SectionHeader
        title={`Welcome back, ${currentUser?.name ?? "Operator"}`}
        subtitle="Live operational snapshot for the last 24 hours."
      />
      <View style={styles.quickActions}>
        {canInventory ? (
          <Link href="/inventory" asChild>
            <Pressable style={styles.quickAction}>
              <Text style={styles.quickActionTitle}>Inventory</Text>
              <Text style={styles.quickActionSub}>Track on-hand stock</Text>
            </Pressable>
          </Link>
        ) : null}
        {canOperations ? (
          <Link href="/operations" asChild>
            <Pressable style={styles.quickAction}>
              <Text style={styles.quickActionTitle}>Operations</Text>
              <Text style={styles.quickActionSub}>Inbound and outbound flow</Text>
            </Pressable>
          </Link>
        ) : null}
        {canProduction ? (
          <Link href="/production" asChild>
            <Pressable style={styles.quickAction}>
              <Text style={styles.quickActionTitle}>Production</Text>
              <Text style={styles.quickActionSub}>Work orders and BOM</Text>
            </Pressable>
          </Link>
        ) : null}
        {canAnalytics ? (
          <Link href="/analytics" asChild>
            <Pressable style={styles.quickAction}>
              <Text style={styles.quickActionTitle}>Analytics</Text>
              <Text style={styles.quickActionSub}>KPIs and forecasts</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
      {items.length === 0 && (canProducts || canDataHub) ? (
        <Card style={styles.setupCard}>
          <Text style={styles.setupTitle}>Set up your data</Text>
          <Text style={styles.setupText}>
            Add items or import data to unlock analytics and inventory insights.
          </Text>
          <View style={styles.setupActions}>
            {canProducts ? (
              <Link href="/admin/products" asChild>
                <Pressable style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Add items</Text>
                </Pressable>
              </Link>
            ) : null}
            {canDataHub ? (
              <Link href="/data" asChild>
                <Pressable style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Import CSV</Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
        </Card>
      ) : null}
      {latestEvent ? (
        <Card style={styles.auditCard}>
          <Text style={styles.auditTitle}>Latest Action</Text>
          <Text style={styles.auditBody}>
            {latestEvent.action} - {latestEvent.entity}
          </Text>
          <Text style={styles.auditTime}>{latestEvent.createdAt}</Text>
        </Card>
      ) : null}
      {kpis.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No KPI data yet</Text>
          <Text style={styles.emptyText}>Import analytics data to populate KPIs.</Text>
        </Card>
      ) : (
        <View style={styles.grid}>
          {kpis.map((kpi) => (
            <StatCard
              key={kpi.id}
              label={kpi.label}
              value={`${formatNumber(kpi.value)}${kpi.unit}`}
              delta={formatDelta(kpi.delta, kpi.unit)}
            />
          ))}
        </View>
      )}

      <SectionHeader
        title="Critical Alerts"
        subtitle="Prioritized issues requiring attention."
      />
      <View style={styles.stack}>
        {alerts.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No alerts right now.</Text>
          </Card>
        ) : (
          alerts.map((alert) => (
            <Card key={alert.id}>
              <View style={styles.alertRow}>
                <View style={styles.alertText}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertDesc}>{alert.description}</Text>
                </View>
                <Tag
                  label={alert.severity.toUpperCase()}
                  tone={
                    alert.severity === "high"
                      ? "danger"
                      : alert.severity === "medium"
                      ? "warning"
                      : "info"
                  }
                />
              </View>
            </Card>
          ))
        )}
      </View>

      <SectionHeader
        title="Production Pulse"
        subtitle="Active and upcoming work orders."
      />
      <View style={styles.stack}>
        {workOrders.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No work orders yet.</Text>
          </Card>
        ) : (
          workOrders.map((order) => (
            <Card key={order.id}>
              <View style={styles.orderRow}>
                <View>
                  <Text style={styles.orderTitle}>{order.id}</Text>
                  <Text style={styles.orderSub}>
                    Target {formatNumber(order.targetQty)} units - Due {order.dueDate}
                  </Text>
                </View>
                <Tag
                  label={order.status.replace("_", " ").toUpperCase()}
                  tone={order.status === "completed" ? "success" : "info"}
                />
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoBlock: {
    marginBottom: theme.spacing.sm
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg
  },
  quickAction: {
    minWidth: 200,
    flex: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md
  },
  quickActionTitle: {
    fontSize: 14,
    fontFamily: theme.typography.body,
    fontWeight: "700",
    color: theme.colors.textPrimary
  },
  quickActionSub: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: theme.typography.body,
    color: theme.colors.textSecondary
  },
  setupCard: {
    marginBottom: theme.spacing.lg
  },
  setupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.ink
  },
  setupText: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  setupActions: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm
  },
  secondaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.ink
  },
  emptyCard: {
    marginBottom: theme.spacing.lg
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.ink
  },
  emptyText: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  auditCard: {
    marginBottom: theme.spacing.lg
  },
  auditTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.inkSubtle,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  auditBody: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.ink
  },
  auditTime: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  stack: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: theme.spacing.sm
  },
  alertText: {
    flex: 1,
    minWidth: 200,
    marginRight: theme.spacing.md
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.ink
  },
  alertDesc: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  orderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: theme.spacing.sm
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.ink
  },
  orderSub: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.inkSubtle
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
