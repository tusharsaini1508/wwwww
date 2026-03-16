import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { Card } from "../../src/components/Card";
import { DataTable } from "../../src/components/DataTable";
import { AccessDenied } from "../../src/components/AccessDenied";
import { Tag } from "../../src/components/Tag";
import { theme } from "../../src/theme";
import { useAppStore } from "../../src/store/useAppStore";
import { useCan } from "../../src/hooks/useCurrentUser";
import { formatNumber } from "../../src/lib/format";
import { calculateForecast } from "../../src/lib/forecast";
import { buildMaterialAnalytics, buildSalesAnalytics, getTodayUtc } from "../../src/lib/analytics";

export default function AnalyticsScreen() {
  const canView = useCan("analytics.view");
  const kpis = useAppStore((state) => state.kpis);
  const items = useAppStore((state) => state.items);
  const bomLines = useAppStore((state) => state.bomLines);
  const inventory = useAppStore((state) => state.inventory);
  const salesOrders = useAppStore((state) => state.salesOrders);
  const salesHistory = useAppStore((state) => state.salesHistory);
  const materialUsage = useAppStore((state) => state.materialUsage);
  const materialReceipts = useAppStore((state) => state.materialReceipts);
  const workOrders = useAppStore((state) => state.workOrders);
  const purchaseOrders = useAppStore((state) => state.purchaseOrders);

  const [historyWindow, setHistoryWindow] = useState<7 | 30 | 90>(30);
  const [forecastWindow, setForecastWindow] = useState<7 | 30 | 90>(30);
  const todayUtc = useMemo(() => getTodayUtc(), []);

  const forecast = useMemo(
    () => calculateForecast(items, bomLines, inventory),
    [items, bomLines, inventory]
  );

  const capacityRows = useMemo(
    () =>
      forecast.map((result) => ({
        id: result.productId,
        product: result.productName,
        maxUnits: result.maxUnits,
        bottleneck: result.bottleneckMaterialName ?? "None",
        status: result.warnings.length > 0 ? "Needs attention" : "Healthy",
        warnings: result.warnings.length
      })),
    [forecast]
  );

  const salesAnalytics = useMemo(
    () =>
      buildSalesAnalytics(
        items,
        salesHistory,
        salesOrders,
        historyWindow,
        forecastWindow,
        todayUtc
      ),
    [items, salesHistory, salesOrders, historyWindow, forecastWindow, todayUtc]
  );

  const materialAnalytics = useMemo(
    () =>
      buildMaterialAnalytics(
        items,
        bomLines,
        materialUsage,
        materialReceipts,
        workOrders,
        purchaseOrders,
        historyWindow,
        forecastWindow,
        todayUtc
      ),
    [
      items,
      bomLines,
      materialUsage,
      materialReceipts,
      workOrders,
      purchaseOrders,
      historyWindow,
      forecastWindow,
      todayUtc
    ]
  );

  if (!canView) {
    return (
      <Screen>
        <SectionHeader title="Analytics" subtitle="Role-based access enforced." />
        <AccessDenied />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionHeader
        title="Analytics & Insights"
        subtitle="Operational performance at a glance."
      />
      {kpis.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No KPI data yet</Text>
          <Text style={styles.emptyText}>
            Import KPIs from the Data Hub to populate analytics.
          </Text>
        </Card>
      ) : (
        <View style={styles.grid}>
          {kpis.map((kpi) => (
            <Card key={kpi.id} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
              <Text style={styles.kpiValue}>
                {formatNumber(kpi.value)}
                {kpi.unit}
              </Text>
              <Text style={styles.kpiDelta}>
                {kpi.delta > 0 ? "+" : ""}
                {formatNumber(kpi.delta)}
                {kpi.unit}
              </Text>
            </Card>
          ))}
        </View>
      )}

      <SectionHeader
        title="Forecast Controls"
        subtitle="Adjust history and forecast windows."
      />
      <Card style={styles.controlCard}>
        <Text style={styles.controlLabel}>History window (days)</Text>
        <View style={styles.controlRow}>
          {[7, 30, 90].map((value) => {
            const active = historyWindow === value;
            return (
              <Pressable
                key={`history-text-${value}`}
                onPress={() => setHistoryWindow(value as 7 | 30 | 90)}
                style={[styles.controlChip, active && styles.controlChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.controlChipText,
                    active && styles.controlChipTextActive
                  ]}
                >
                  {value}d
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.controlLabel}>Forecast window (days)</Text>
        <View style={styles.controlRow}>
          {[7, 30, 90].map((value) => {
            const active = forecastWindow === value;
            return (
              <Pressable
                key={`forecast-text-${value}`}
                onPress={() => setForecastWindow(value as 7 | 30 | 90)}
                style={[styles.controlChip, active && styles.controlChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.controlChipText,
                    active && styles.controlChipTextActive
                  ]}
                >
                  {value}d
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionHeader
        title="Sales Forecast"
        subtitle={`Past ${historyWindow} days vs next ${forecastWindow} days.`}
      />
      <View style={styles.summaryGrid}>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Units Sold (History)</Text>
          <Text style={styles.summaryValue}>
            {formatNumber(salesAnalytics.historyTotal)}
          </Text>
          <Text style={styles.summarySub}>
            Avg {formatNumber(salesAnalytics.avgDailyTotal)} / day
          </Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Forecast Units</Text>
          <Text style={styles.summaryValue}>
            {formatNumber(salesAnalytics.forecastTotal)}
          </Text>
          <Text style={styles.summarySub}>
            Confirmed {formatNumber(salesAnalytics.confirmedOrdersTotal)}
          </Text>
        </Card>
      </View>
      <DataTable
        columns={[
          { key: "name", label: "Product", width: 220 },
          { key: "historyQty", label: `Sold ${historyWindow}d`, width: 120 },
          { key: "avgDaily", label: "Avg/Day", width: 110 },
          { key: "confirmedOrders", label: "Confirmed", width: 120 },
          { key: "forecastQty", label: `Forecast ${forecastWindow}d`, width: 140 }
        ]}
        rows={salesAnalytics.rows.map((row) => ({
          id: row.id,
          name: `${row.name} (${row.sku})`,
          historyQty: formatNumber(row.historyQty),
          avgDaily: formatNumber(row.avgDaily),
          confirmedOrders: formatNumber(row.confirmedOrders),
          forecastQty: formatNumber(row.forecastQty)
        }))}
        emptyMessage="No sales history or orders yet."
        summary={`${salesAnalytics.rows.length} products`}
      />

      <SectionHeader
        title="Raw Material Outlook"
        subtitle={`Usage and receipts for next ${forecastWindow} days.`}
      />
      <View style={styles.summaryGrid}>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Material Used (History)</Text>
          <Text style={styles.summaryValue}>
            {formatNumber(materialAnalytics.historyUsedTotal)}
          </Text>
          <Text style={styles.summarySub}>
            Receipts {formatNumber(materialAnalytics.historyReceivedTotal)}
          </Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Forecast Net</Text>
          <Text
            style={[
              styles.summaryValue,
              materialAnalytics.netForecastTotal < 0 && styles.summaryValueDanger
            ]}
          >
            {formatNumber(materialAnalytics.netForecastTotal)}
          </Text>
          <Text style={styles.summarySub}>
            Usage {formatNumber(materialAnalytics.forecastUsageTotal)} | Receipts{" "}
            {formatNumber(materialAnalytics.forecastReceiptsTotal)}
          </Text>
        </Card>
      </View>
      <DataTable
        columns={[
          { key: "name", label: "Material", width: 220 },
          { key: "historyUsed", label: `Used ${historyWindow}d`, width: 120 },
          { key: "avgDailyUsed", label: "Avg/Day", width: 110 },
          { key: "forecastUsage", label: `Usage ${forecastWindow}d`, width: 130 },
          { key: "forecastReceipts", label: "Receipts", width: 120 },
          {
            key: "netForecastLabel",
            label: "Net",
            width: 120,
            render: (_, row) => (
              <Tag
                label={row.netForecastLabel as string}
                tone={row.netForecastTone as "success" | "warning" | "danger"}
              />
            )
          }
        ]}
        rows={materialAnalytics.rows.map((row) => ({
          id: row.id,
          name: `${row.name} (${row.sku})`,
          historyUsed: formatNumber(row.historyUsed),
          avgDailyUsed: formatNumber(row.avgDailyUsed),
          forecastUsage: formatNumber(row.forecastUsage),
          forecastReceipts: formatNumber(row.forecastReceipts),
          netForecastLabel:
            row.netForecast >= 0
              ? `+${formatNumber(row.netForecast)}`
              : formatNumber(row.netForecast),
          netForecastTone: row.netForecast >= 0 ? "success" : "danger"
        }))}
        emptyMessage="No material usage or receipt data yet."
        summary={`${materialAnalytics.rows.length} materials`}
      />

      <SectionHeader
        title="Production Capacity"
        subtitle="Max producible units based on BOM and raw material availability."
      />
      <DataTable
        columns={[
          { key: "product", label: "Product", width: 220 },
          {
            key: "maxUnits",
            label: "Max Units",
            width: 120,
            render: (value) => (
              <Text style={styles.capacityValue}>{formatNumber(Number(value ?? 0))}</Text>
            )
          },
          { key: "bottleneck", label: "Bottleneck", width: 200 },
          {
            key: "status",
            label: "Status",
            width: 160,
            render: (_, row) => (
              <Tag
                label={row.status as string}
                tone={row.warnings > 0 ? "warning" : "success"}
              />
            )
          }
        ]}
        rows={capacityRows}
        emptyMessage="No BOM or inventory data yet."
        summary={`${capacityRows.length} products`}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controlCard: {
    marginBottom: theme.spacing.lg
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.inkSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs
  },
  controlRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md
  },
  controlChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  controlChipActive: {
    borderColor: theme.colors.accentDark,
    backgroundColor: theme.colors.accentSoft
  },
  controlChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.inkSubtle
  },
  controlChipTextActive: {
    color: theme.colors.accentDark
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg
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
  summaryCard: {
    flex: 1,
    minWidth: 220
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.inkSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  summaryValue: {
    marginTop: theme.spacing.sm,
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.ink
  },
  summaryValueDanger: {
    color: theme.colors.danger
  },
  summarySub: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg
  },
  kpiCard: {
    flex: 1,
    minWidth: 160
  },
  kpiLabel: {
    fontSize: 12,
    color: theme.colors.inkSubtle,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  kpiValue: {
    marginTop: theme.spacing.sm,
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.ink
  },
  kpiDelta: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.accentDark
  },
  capacityValue: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.ink
  },
  
});
