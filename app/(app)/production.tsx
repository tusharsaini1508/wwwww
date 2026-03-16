import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { Card } from "../../src/components/Card";
import { DataTable } from "../../src/components/DataTable";
import { Tag } from "../../src/components/Tag";
import { AccessDenied } from "../../src/components/AccessDenied";
import { Button } from "../../src/components/Button";
import { theme } from "../../src/theme";
import { useAppStore } from "../../src/store/useAppStore";
import { calculateForecast } from "../../src/lib/forecast";
import { formatNumber } from "../../src/lib/format";
import { useCan } from "../../src/hooks/useCurrentUser";
import { WorkOrderStatus } from "../../src/types";

type WorkOrderRow = {
  id: string;
  product: string;
  target: string;
  status: string;
  due: string;
  action: string;
};

const workOrderStatuses: WorkOrderStatus[] = [
  "planned",
  "in_progress",
  "completed",
  "hold"
];

const nextStatus = (current: WorkOrderStatus) => {
  const index = workOrderStatuses.indexOf(current);
  const next = workOrderStatuses[(index + 1) % workOrderStatuses.length];
  return next ?? workOrderStatuses[0];
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isPositiveNumber = (value: string) =>
  Number.isFinite(Number(value)) && Number(value) > 0;

export default function ProductionScreen() {
  const canView = useCan("production.view");
  const canPlan = useCan("production.plan");
  const items = useAppStore((state) => state.items);
  const bomLines = useAppStore((state) => state.bomLines);
  const inventory = useAppStore((state) => state.inventory);
  const workOrders = useAppStore((state) => state.workOrders);
  const createWorkOrder = useAppStore((state) => state.createWorkOrder);
  const updateWorkOrder = useAppStore((state) => state.updateWorkOrder);

  const [draftProductId, setDraftProductId] = useState("");
  const [draftQty, setDraftQty] = useState("0");
  const [draftDue, setDraftDue] = useState("");
  const [draftStatus, setDraftStatus] = useState<WorkOrderStatus>("planned");

  const finishedProducts = useMemo(
    () => items.filter((item) => item.type === "finished"),
    [items]
  );

  useEffect(() => {
    if (!draftProductId && finishedProducts[0]) {
      setDraftProductId(finishedProducts[0].id);
    }
  }, [draftProductId, finishedProducts]);

  const forecast = useMemo(
    () => calculateForecast(items, bomLines, inventory),
    [items, bomLines, inventory]
  );
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const workOrderRows = useMemo<WorkOrderRow[]>(
    () =>
      workOrders.map((order) => ({
        id: order.id,
        product: itemMap.get(order.productId)?.name ?? order.productId,
        target: formatNumber(order.targetQty),
        status: order.status.replace("_", " "),
        due: order.dueDate,
        action: "Advance"
      })),
    [itemMap, workOrders]
  );

  const bomRows = useMemo(
    () =>
      bomLines.map((line) => ({
        id: line.id,
        finished: itemMap.get(line.finishedProductId)?.name ?? line.finishedProductId,
        material: itemMap.get(line.materialId)?.name ?? line.materialId,
        qty: formatNumber(line.qtyPerUnit)
      })),
    [bomLines, itemMap]
  );

  if (!canView) {
    return (
      <Screen>
        <SectionHeader title="Production" subtitle="Role-based access enforced." />
        <AccessDenied />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionHeader
        title="Production Forecast"
        subtitle="Max producible units based on raw material constraints."
      />
      {canPlan ? (
        <View style={styles.stack}>
          {forecast.length === 0 ? (
            <Card>
              <Text style={styles.sub}>No forecast data yet.</Text>
            </Card>
          ) : (
            forecast.map((result) => (
              <Card key={result.productId}>
                <View style={styles.forecastHeader}>
                  <View>
                    <Text style={styles.productName}>{result.productName}</Text>
                    <Text style={styles.productSub}>
                      Bottleneck: {result.bottleneckMaterialName ?? "None"}
                    </Text>
                  </View>
                  <View style={styles.rightAlign}>
                    <Text style={styles.forecastValue}>
                      {formatNumber(result.maxUnits)}
                    </Text>
                    <Text style={styles.forecastLabel}>units available</Text>
                  </View>
                </View>
                {result.warnings.length > 0 ? (
                  <View style={styles.warningBlock}>
                    {result.warnings.map((warning, index) => (
                      <Tag
                        key={`${result.productId}-${index}`}
                        label={warning}
                        tone="warning"
                      />
                    ))}
                  </View>
                ) : (
                  <Tag label="All materials within thresholds" tone="success" />
                )}
              </Card>
            ))
          )}
        </View>
      ) : (
        <AccessDenied
          title="Forecast limited"
          message="Your role can view production status but cannot run forecasts."
        />
      )}

      <SectionHeader
        title="Work Order Planner"
        subtitle="Create and update production runs."
      />
      {canPlan ? (
        <Card style={styles.card}>
          <Text style={styles.label}>Finished product</Text>
          <View style={styles.chipRow}>
            {finishedProducts.length === 0 ? (
              <Text style={styles.sub}>Add finished goods first.</Text>
            ) : (
              finishedProducts.map((item) => {
                const active = item.id === draftProductId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setDraftProductId(item.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {item.sku}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target qty</Text>
              <TextInput
                value={draftQty}
                onChangeText={setDraftQty}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Due date (YYYY-MM-DD)</Text>
              <TextInput
                value={draftDue}
                onChangeText={setDraftDue}
                placeholder="2026-03-16"
                placeholderTextColor={theme.colors.inkSoft}
                style={styles.input}
              />
            </View>
          </View>
          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {workOrderStatuses.map((status) => {
              const active = status === draftStatus;
              return (
                <Pressable
                  key={status}
                  onPress={() => setDraftStatus(status)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {status.replace("_", " ")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Button
            label="Create work order"
            onPress={() => {
              if (!draftProductId || !isIsoDate(draftDue) || !isPositiveNumber(draftQty)) {
                return;
              }
              createWorkOrder({
                productId: draftProductId,
                targetQty: Number(draftQty),
                status: draftStatus,
                dueDate: draftDue.trim()
              });
              setDraftQty("0");
              setDraftDue("");
            }}
            disabled={!draftProductId || !isIsoDate(draftDue) || !isPositiveNumber(draftQty)}
          />
        </Card>
      ) : null}

      <SectionHeader
        title="Active Work Orders"
        subtitle="Plan, execute, and track production runs."
      />
      <DataTable
        columns={[
          { key: "id", label: "WO", width: 120 },
          { key: "product", label: "Product", width: 240 },
          { key: "target", label: "Target", width: 120 },
          { key: "status", label: "Status", width: 140 },
          { key: "due", label: "Due", width: 120 },
          {
            key: "action",
            label: "Action",
            width: 160,
            render: (_, row) => (
              <Button
                label="Advance"
                size="sm"
                variant="secondary"
                onPress={() => {
                  const order = workOrders.find((item) => item.id === row.id);
                  if (!order) {
                    return;
                  }
                  updateWorkOrder(order.id, {
                    status: nextStatus(order.status)
                  });
                }}
                disabled={!canPlan}
              />
            )
          }
        ]}
        rows={workOrderRows}
        emptyMessage="No work orders yet."
        summary={`${workOrderRows.length} active work orders`}
      />

      <SectionHeader
        title="Bill of Materials"
        subtitle="Critical material consumption per finished unit."
      />
      <DataTable
        columns={[
          { key: "finished", label: "Finished SKU", width: 240 },
          { key: "material", label: "Material", width: 240 },
          { key: "qty", label: "Qty/Unit", width: 120 }
        ]}
        rows={bomRows}
        emptyMessage="No BOM lines yet."
        summary={`${bomRows.length} BOM lines`}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.lg
  },
  stack: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg
  },
  forecastHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: theme.spacing.sm
  },
  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.ink
  },
  productSub: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  rightAlign: {
    alignItems: "flex-end"
  },
  forecastValue: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.accentDark
  },
  forecastLabel: {
    fontSize: 11,
    color: theme.colors.inkSubtle
  },
  warningBlock: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.inkSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  chipActive: {
    borderColor: theme.colors.accentDark,
    backgroundColor: theme.colors.accentSoft
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.inkSubtle,
    fontWeight: "600"
  },
  chipTextActive: {
    color: theme.colors.accentDark
  },
  inputRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  inputGroup: {
    flex: 1,
    minWidth: 160
  },
  inputLabel: {
    fontSize: 12,
    color: theme.colors.inkSubtle,
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    backgroundColor: theme.colors.surface
  },
  sub: {
    fontSize: 12,
    color: theme.colors.inkSubtle
  }
});
