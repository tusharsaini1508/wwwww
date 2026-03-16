import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { Card } from "../../src/components/Card";
import { Tag } from "../../src/components/Tag";
import { theme } from "../../src/theme";
import { useCan, useCurrentUser } from "../../src/hooks/useCurrentUser";
import { AccessDenied } from "../../src/components/AccessDenied";

const valueProps: {
  title: string;
  detail: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
}[] = [
  {
    title: "Compliance-Grade Audit Trails",
    detail:
      "Every transaction is time-stamped in IST with immutable logs and role-based approvals.",
    tone: "info"
  },
  {
    title: "Production Forecasting with BOM Constraints",
    detail:
      "Real-time max producible units by material availability, yield, and scrap adjustments.",
    tone: "success"
  },
  {
    title: "Enterprise RBAC & Delegation",
    detail:
      "Super Admin controls feature limits per role, enabling secure multi-tenant operations.",
    tone: "warning"
  },
  {
    title: "Multi-Warehouse Operations",
    detail:
      "Inbound, outbound, cross-dock, and cycle counting orchestrated across zones.",
    tone: "default"
  },
  {
    title: "Executive Analytics & KPI Governance",
    detail:
      "Advanced performance dashboards with exportable datasets for BI and finance teams.",
    tone: "info"
  }
];

const roiDrivers = [
  "Reduce stock-outs with predictive reorder and safety stock tuning.",
  "Lower shrinkage via continuous cycle counts and variance workflows.",
  "Improve fill rate with wave planning and allocation visibility.",
  "Cut production downtime using raw-material bottleneck alerts."
];

export default function EnterpriseScreen() {
  const canView = useCan("dashboard.view");
  const currentUser = useCurrentUser();

  if (!canView || currentUser?.role === "SUPER_ADMIN") {
    return (
      <Screen>
        <SectionHeader title="Enterprise Value" subtitle="Role-based access enforced." />
        <AccessDenied />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionHeader
        title="Enterprise Value"
        subtitle="Designed to justify premium pricing through operational impact."
      />
      <Card style={styles.hero}>
        <Text style={styles.heroTitle}>Industry-Level WMS</Text>
        <Text style={styles.heroText}>
          This platform delivers audit-ready governance, forecasting precision, and
          multi-warehouse scale. It is built to support strategic buyers who demand ROI,
          security, and operational excellence.
        </Text>
        <View style={styles.tagRow}>
          <Tag label="Compliance" tone="info" />
          <Tag label="Forecasting" tone="success" />
          <Tag label="Enterprise SLA" tone="warning" />
        </View>
      </Card>

      <SectionHeader title="Value Drivers" subtitle="Why this justifies 20 lakh+ pricing." />
      <View style={styles.stack}>
        {valueProps.map((prop) => (
          <Card key={prop.title}>
            <Text style={styles.valueTitle}>{prop.title}</Text>
            <Text style={styles.valueDetail}>{prop.detail}</Text>
            <View style={styles.valueTag}>
              <Tag label="Enterprise" tone={prop.tone} />
            </View>
          </Card>
        ))}
      </View>

      <SectionHeader title="ROI Levers" subtitle="Measurable improvements for buyers." />
      <Card>
        <View style={styles.roiList}>
          {roiDrivers.map((driver) => (
            <Text key={driver} style={styles.roiItem}>
              - {driver}
            </Text>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: theme.spacing.lg
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.ink
  },
  heroText: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.inkSubtle,
    lineHeight: 18
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md
  },
  stack: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg
  },
  valueTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.ink
  },
  valueDetail: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  valueTag: {
    marginTop: theme.spacing.sm
  },
  roiList: {
    gap: theme.spacing.sm
  },
  roiItem: {
    fontSize: 12,
    color: theme.colors.inkSubtle
  }
});
