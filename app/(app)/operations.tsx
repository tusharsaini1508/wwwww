import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { Card } from "../../src/components/Card";
import { DataTable } from "../../src/components/DataTable";
import { Tag } from "../../src/components/Tag";
import { AccessDenied } from "../../src/components/AccessDenied";
import { Button } from "../../src/components/Button";
import { FormField } from "../../src/components/FormField";
import { theme } from "../../src/theme";
import { useAppStore } from "../../src/store/useAppStore";
import { formatNumber } from "../../src/lib/format";
import { useCan } from "../../src/hooks/useCurrentUser";
import {
  AvailabilityStatus,
  CheckStatus,
  CycleCountStatus,
  InspectionMethod,
  PurchaseOrder,
  QcResult,
  ReturnStatus,
  SalesOrder,
  TransferStatus
} from "../../src/types";

type TransferRow = {
  id: string;
  from: string;
  to: string;
  item: string;
  qty: string;
  status: string;
  action: string;
};

const poStatuses: PurchaseOrder["status"][] = ["draft", "sent", "received"];
const soStatuses: SalesOrder["status"][] = ["open", "allocated", "shipped"];
const transferStatuses: TransferStatus[] = [
  "requested",
  "approved",
  "in_transit",
  "completed"
];
const cycleStatuses: CycleCountStatus[] = ["planned", "scheduled", "in_progress", "completed"];
const returnStatuses: ReturnStatus[] = ["inspection", "restock", "reject"];
const qcResults: QcResult[] = ["pass", "hold", "fail"];
const availabilityOptions: AvailabilityStatus[] = ["available", "not_available"];
const checkOptions: CheckStatus[] = ["completed", "not_completed"];
const inspectionMethods: InspectionMethod[] = [
  "visual",
  "destructive",
  "non_destructive"
];

const nextStatus = <T extends string>(value: T, list: T[]) => {
  const index = list.indexOf(value);
  const next = list[(index + 1) % list.length];
  return next ?? list[0];
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isPositiveNumber = (value: string) =>
  Number.isFinite(Number(value)) && Number(value) > 0;

export default function OperationsScreen() {
  const canView = useCan("inventory.view");
  const canEditInventory = useCan("inventory.edit");
  const canProcurement = useCan("procurement.view");
  const canEditOps = canEditInventory || canProcurement;
  const purchaseOrders = useAppStore((state) => state.purchaseOrders);
  const salesOrders = useAppStore((state) => state.salesOrders);
  const transfers = useAppStore((state) => state.transfers);
  const cycleCounts = useAppStore((state) => state.cycleCounts);
  const returnRecords = useAppStore((state) => state.returnRecords);
  const qcInspections = useAppStore((state) => state.qcInspections);
  const createPurchaseOrder = useAppStore((state) => state.createPurchaseOrder);
  const updatePurchaseOrder = useAppStore((state) => state.updatePurchaseOrder);
  const createSalesOrder = useAppStore((state) => state.createSalesOrder);
  const updateSalesOrder = useAppStore((state) => state.updateSalesOrder);
  const createTransfer = useAppStore((state) => state.createTransfer);
  const updateTransfer = useAppStore((state) => state.updateTransfer);
  const createCycleCount = useAppStore((state) => state.createCycleCount);
  const updateCycleCount = useAppStore((state) => state.updateCycleCount);
  const createReturnRecord = useAppStore((state) => state.createReturnRecord);
  const updateReturnRecord = useAppStore((state) => state.updateReturnRecord);
  const createQcInspection = useAppStore((state) => state.createQcInspection);
  const updateQcInspection = useAppStore((state) => state.updateQcInspection);
  const items = useAppStore((state) => state.items);
  const bins = useAppStore((state) => state.bins);
  const suppliers = useAppStore((state) => state.suppliers);

  const [poSupplier, setPoSupplier] = useState("");
  const [poItemId, setPoItemId] = useState("");
  const [poQty, setPoQty] = useState("0");
  const [poEta, setPoEta] = useState("");
  const [poStatus, setPoStatus] = useState<PurchaseOrder["status"]>("draft");

  const [soCustomer, setSoCustomer] = useState("");
  const [soItemId, setSoItemId] = useState("");
  const [soQty, setSoQty] = useState("0");
  const [soDue, setSoDue] = useState("");
  const [soStatus, setSoStatus] = useState<SalesOrder["status"]>("open");

  const [transferItemId, setTransferItemId] = useState("");
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferQty, setTransferQty] = useState("0");
  const [transferStatus, setTransferStatus] = useState<TransferStatus>("requested");

  const [cycleArea, setCycleArea] = useState("");
  const [cycleDate, setCycleDate] = useState("");
  const [cycleStatus, setCycleStatus] = useState<CycleCountStatus>("scheduled");

  const [returnCustomer, setReturnCustomer] = useState("");
  const [returnItemId, setReturnItemId] = useState("");
  const [returnQty, setReturnQty] = useState("0");
  const [returnStatus, setReturnStatus] = useState<ReturnStatus>("inspection");

  const [qcLot, setQcLot] = useState("");
  const [qcNotes, setQcNotes] = useState("");
  const [qcResult, setQcResult] = useState<QcResult>("pass");
  const [qcItemId, setQcItemId] = useState("");
  const [qcManufacturingDate, setQcManufacturingDate] = useState("");
  const [qcExpiryDate, setQcExpiryDate] = useState("");
  const [qcSupplierTraceability, setQcSupplierTraceability] =
    useState<AvailabilityStatus>("available");
  const [qcSupplierQualityCheck, setQcSupplierQualityCheck] =
    useState<CheckStatus>("completed");
  const [qcInspectionMethod, setQcInspectionMethod] =
    useState<InspectionMethod>("visual");
  const [qcSampleReport, setQcSampleReport] =
    useState<AvailabilityStatus>("available");
  const [qcIncomingCheck, setQcIncomingCheck] =
    useState<CheckStatus>("completed");
  const [qcStorageConditions, setQcStorageConditions] = useState("");
  const [qcShelfLife, setQcShelfLife] = useState("0");
  const [qcHazardClass, setQcHazardClass] = useState("");
  const [qcHandling, setQcHandling] = useState("");
  const [qcMsdsAvailable, setQcMsdsAvailable] =
    useState<AvailabilityStatus>("available");
  const [qcPackagingType, setQcPackagingType] = useState("");

  const materialItems = useMemo(
    () => items.filter((item) => item.type === "material"),
    [items]
  );
  const finishedItems = useMemo(
    () => items.filter((item) => item.type === "finished"),
    [items]
  );
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const binMap = useMemo(() => new Map(bins.map((bin) => [bin.id, bin])), [bins]);

  useEffect(() => {
    if (!poItemId && materialItems[0]) {
      setPoItemId(materialItems[0].id);
    }
  }, [materialItems, poItemId]);

  useEffect(() => {
    if (!soItemId && finishedItems[0]) {
      setSoItemId(finishedItems[0].id);
    }
  }, [finishedItems, soItemId]);

  useEffect(() => {
    if (!transferItemId && items[0]) {
      setTransferItemId(items[0].id);
    }
  }, [items, transferItemId]);

  useEffect(() => {
    if (!returnItemId && finishedItems[0]) {
      setReturnItemId(finishedItems[0].id);
    }
  }, [finishedItems, returnItemId]);

  useEffect(() => {
    if (!qcItemId && items[0]) {
      setQcItemId(items[0].id);
    }
  }, [items, qcItemId]);

  useEffect(() => {
    if (!transferFrom && bins[0]) {
      setTransferFrom(bins[0].id);
    }
    if (!transferTo && bins[1]) {
      setTransferTo(bins[1].id);
    } else if (!transferTo && bins[0]) {
      setTransferTo(bins[0].id);
    }
  }, [bins, transferFrom, transferTo]);

  const salesOrderRows = useMemo(
    () =>
      salesOrders.map((so) => ({
        id: so.id,
        customer: so.customer,
        item: itemMap.get(so.itemId)?.name ?? so.itemId,
        qty: formatNumber(so.qty),
        status: so.status,
        action: "Advance"
      })),
    [itemMap, salesOrders]
  );

  const transferRows = useMemo<TransferRow[]>(
    () =>
      transfers.map((transfer) => ({
        id: transfer.id,
        from: binMap.get(transfer.fromBinId)?.code ?? transfer.fromBinId,
        to: binMap.get(transfer.toBinId)?.code ?? transfer.toBinId,
        item: itemMap.get(transfer.itemId)?.name ?? transfer.itemId,
        qty: formatNumber(transfer.qty),
        status: transfer.status.replace("_", " "),
        action: "Advance"
      })),
    [binMap, itemMap, transfers]
  );

  if (!canView) {
    return (
      <Screen>
        <SectionHeader title="Operations Hub" subtitle="Role-based access enforced." />
        <AccessDenied />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionHeader
        title="Operations Hub"
        subtitle="Inbound, outbound, transfers, and cycle counting."
      />

      <SectionHeader title="Inbound ASN" subtitle="Create and manage purchase orders." />
      {canEditOps ? (
        <Card style={styles.card}>
          <FormField label="Supplier">
            <TextInput
              value={poSupplier}
              onChangeText={setPoSupplier}
              placeholder="Supplier name"
              placeholderTextColor={theme.colors.inkSoft}
              style={styles.input}
            />
          </FormField>
          {suppliers.length > 0 ? (
            <>
              <Text style={styles.label}>Quick select supplier</Text>
              <View style={styles.chipRow}>
                {suppliers.map((supplier) => {
                  const active = poSupplier.trim() === supplier.name;
                  return (
                    <Pressable
                      key={supplier.id}
                      onPress={() => setPoSupplier(supplier.name)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {supplier.code}
                      </Text>
                      <Text style={[styles.chipSub, active && styles.chipSubActive]}>
                        {supplier.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
          <Text style={styles.label}>Material</Text>
          <View style={styles.chipRow}>
            {materialItems.length === 0 ? (
              <Text style={styles.mutedText}>Add material items first.</Text>
            ) : (
              materialItems.map((item) => {
                const active = item.id === poItemId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setPoItemId(item.id)}
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
              <Text style={styles.inputLabel}>Qty</Text>
              <TextInput
                value={poQty}
                onChangeText={setPoQty}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ETA (YYYY-MM-DD)</Text>
              <TextInput
                value={poEta}
                onChangeText={setPoEta}
                placeholder="2026-03-16"
                placeholderTextColor={theme.colors.inkSoft}
                style={styles.input}
              />
            </View>
          </View>
          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {poStatuses.map((status) => {
              const active = status === poStatus;
              return (
                <Pressable
                  key={status}
                  onPress={() => setPoStatus(status)}
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
            label="Create purchase order"
            onPress={() => {
              if (
                !poSupplier.trim() ||
                !poItemId ||
                !isIsoDate(poEta) ||
                !isPositiveNumber(poQty)
              ) {
                return;
              }
              createPurchaseOrder({
                supplier: poSupplier.trim(),
                itemId: poItemId,
                qty: Number(poQty),
                eta: poEta.trim(),
                status: poStatus
              });
              setPoSupplier("");
              setPoQty("0");
              setPoEta("");
            }}
            disabled={
              !poSupplier.trim() ||
              !poItemId ||
              !isIsoDate(poEta) ||
              !isPositiveNumber(poQty)
            }
          />
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.mutedText}>
            View-only access. Contact an admin to create purchase orders.
          </Text>
        </Card>
      )}

      <View style={styles.stack}>
        {purchaseOrders.length === 0 ? (
          <Card>
            <Text style={styles.sub}>No inbound receipts yet.</Text>
          </Card>
        ) : (
          purchaseOrders.map((po) => (
            <Card key={po.id}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.title}>{po.id}</Text>
                  <Text style={styles.sub}>
                    {po.supplier} - {itemMap.get(po.itemId)?.name ?? po.itemId}
                  </Text>
                  <Text style={styles.sub}>ETA {po.eta}</Text>
                </View>
                <Tag label={po.status.toUpperCase()} tone="info" />
              </View>
              <View style={styles.row}>
                <Text style={styles.sub}>Qty {formatNumber(po.qty)}</Text>
                <Button
                  label="Advance status"
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    updatePurchaseOrder(po.id, {
                      status: nextStatus(po.status, poStatuses)
                    })
                  }
                  disabled={!canEditOps}
                />
              </View>
            </Card>
          ))
        )}
      </View>

      <SectionHeader title="Outbound Orders" subtitle="Create and track sales orders." />
      {canEditOps ? (
        <Card style={styles.card}>
          <FormField label="Customer">
            <TextInput
              value={soCustomer}
              onChangeText={setSoCustomer}
              placeholder="Customer name"
              placeholderTextColor={theme.colors.inkSoft}
              style={styles.input}
            />
          </FormField>
          <Text style={styles.label}>Finished product</Text>
          <View style={styles.chipRow}>
            {finishedItems.length === 0 ? (
              <Text style={styles.mutedText}>Add finished goods first.</Text>
            ) : (
              finishedItems.map((item) => {
                const active = item.id === soItemId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSoItemId(item.id)}
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
              <Text style={styles.inputLabel}>Qty</Text>
              <TextInput
                value={soQty}
                onChangeText={setSoQty}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Due date (YYYY-MM-DD)</Text>
              <TextInput
                value={soDue}
                onChangeText={setSoDue}
                placeholder="2026-03-16"
                placeholderTextColor={theme.colors.inkSoft}
                style={styles.input}
              />
            </View>
          </View>
          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {soStatuses.map((status) => {
              const active = status === soStatus;
              return (
                <Pressable
                  key={status}
                  onPress={() => setSoStatus(status)}
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
            label="Create sales order"
            onPress={() => {
              if (
                !soCustomer.trim() ||
                !soItemId ||
                !isIsoDate(soDue) ||
                !isPositiveNumber(soQty)
              ) {
                return;
              }
              createSalesOrder({
                customer: soCustomer.trim(),
                itemId: soItemId,
                qty: Number(soQty),
                dueDate: soDue.trim(),
                status: soStatus
              });
              setSoCustomer("");
              setSoQty("0");
              setSoDue("");
            }}
            disabled={
              !soCustomer.trim() ||
              !soItemId ||
              !isIsoDate(soDue) ||
              !isPositiveNumber(soQty)
            }
          />
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.mutedText}>
            View-only access. Contact an admin to create sales orders.
          </Text>
        </Card>
      )}

      <DataTable
        columns={[
          { key: "id", label: "SO", width: 120 },
          { key: "customer", label: "Customer", width: 200 },
          { key: "item", label: "Item", width: 200 },
          { key: "qty", label: "Qty", width: 120 },
          { key: "status", label: "Status", width: 130 },
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
                  const order = salesOrders.find((item) => item.id === row.id);
                  if (!order) {
                    return;
                  }
                  updateSalesOrder(order.id, {
                    status: nextStatus(order.status, soStatuses)
                  });
                }}
                disabled={!canEditOps}
              />
            )
          }
        ]}
        rows={salesOrderRows}
        emptyMessage="No outbound orders yet."
        summary={`${salesOrderRows.length} outbound orders`}
      />

      <SectionHeader
        title="Transfers & Cross-Dock"
        subtitle="Move stock between bins."
      />
      {canEditOps ? (
        <Card style={styles.card}>
          <Text style={styles.label}>Item</Text>
          <View style={styles.chipRow}>
            {items.length === 0 ? (
              <Text style={styles.mutedText}>Add items first.</Text>
            ) : (
              items.map((item) => {
                const active = item.id === transferItemId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setTransferItemId(item.id)}
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
          <Text style={styles.label}>From bin</Text>
          <View style={styles.chipRow}>
            {bins.length === 0 ? (
              <Text style={styles.mutedText}>Add bins first.</Text>
            ) : (
              bins.map((bin) => {
                const active = bin.id === transferFrom;
                return (
                  <Pressable
                    key={bin.id}
                    onPress={() => setTransferFrom(bin.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {bin.code}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
          <Text style={styles.label}>To bin</Text>
          <View style={styles.chipRow}>
            {bins.length === 0 ? (
              <Text style={styles.mutedText}>Add bins first.</Text>
            ) : (
              bins.map((bin) => {
                const active = bin.id === transferTo;
                return (
                  <Pressable
                    key={bin.id}
                    onPress={() => setTransferTo(bin.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {bin.code}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Qty</Text>
              <TextInput
                value={transferQty}
                onChangeText={setTransferQty}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          </View>
          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {transferStatuses.map((status) => {
              const active = status === transferStatus;
              return (
                <Pressable
                  key={status}
                  onPress={() => setTransferStatus(status)}
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
            label="Create transfer"
            onPress={() => {
              if (
                !transferItemId ||
                !transferFrom ||
                !transferTo ||
                !isPositiveNumber(transferQty)
              ) {
                return;
              }
              createTransfer({
                itemId: transferItemId,
                fromBinId: transferFrom,
                toBinId: transferTo,
                qty: Number(transferQty),
                status: transferStatus
              });
              setTransferQty("0");
            }}
            disabled={
              !transferItemId ||
              !transferFrom ||
              !transferTo ||
              !isPositiveNumber(transferQty)
            }
          />
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.mutedText}>
            View-only access. Contact an admin to create transfers.
          </Text>
        </Card>
      )}

      <DataTable
        columns={[
          { key: "id", label: "Transfer", width: 140 },
          { key: "from", label: "From", width: 120 },
          { key: "to", label: "To", width: 120 },
          { key: "item", label: "Item", width: 200 },
          { key: "qty", label: "Qty", width: 120 },
          { key: "status", label: "Status", width: 130 },
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
                  const transfer = transfers.find((item) => item.id === row.id);
                  if (!transfer) {
                    return;
                  }
                  updateTransfer(transfer.id, {
                    status: nextStatus(transfer.status, transferStatuses)
                  });
                }}
                disabled={!canEditOps}
              />
            )
          }
        ]}
        rows={transferRows}
        emptyMessage="No transfers created yet."
        summary={`${transferRows.length} transfer records`}
      />

      <SectionHeader
        title="Cycle Counts"
        subtitle="Schedule and track cycle counting."
      />
      {canEditOps ? (
        <Card style={styles.card}>
          <FormField label="Area">
            <TextInput
              value={cycleArea}
              onChangeText={setCycleArea}
              placeholder="Zone A"
              placeholderTextColor={theme.colors.inkSoft}
              style={styles.input}
            />
          </FormField>
          <FormField label="Scheduled date (YYYY-MM-DD)">
            <TextInput
              value={cycleDate}
              onChangeText={setCycleDate}
              placeholder="2026-03-16"
              placeholderTextColor={theme.colors.inkSoft}
              style={styles.input}
            />
          </FormField>
          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {cycleStatuses.map((status) => {
              const active = status === cycleStatus;
              return (
                <Pressable
                  key={status}
                  onPress={() => setCycleStatus(status)}
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
            label="Create cycle count"
            onPress={() => {
              if (!cycleArea.trim() || !isIsoDate(cycleDate)) {
                return;
              }
              createCycleCount({
                area: cycleArea.trim(),
                scheduled: cycleDate.trim(),
                status: cycleStatus
              });
              setCycleArea("");
              setCycleDate("");
            }}
            disabled={!cycleArea.trim() || !isIsoDate(cycleDate)}
          />
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.mutedText}>
            View-only access. Contact an admin to create cycle counts.
          </Text>
        </Card>
      )}

      <View style={styles.stack}>
        {cycleCounts.length === 0 ? (
          <Card>
            <Text style={styles.sub}>No cycle counts scheduled yet.</Text>
          </Card>
        ) : (
          cycleCounts.map((count) => (
            <Card key={count.id}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.title}>{count.area}</Text>
                  <Text style={styles.sub}>Scheduled {count.scheduled}</Text>
                </View>
                <Tag label={count.status.toUpperCase()} tone="warning" />
              </View>
              <Button
                label="Advance status"
                size="sm"
                variant="secondary"
                onPress={() =>
                  updateCycleCount(count.id, {
                    status: nextStatus(count.status, cycleStatuses)
                  })
                }
                disabled={!canEditOps}
              />
            </Card>
          ))
        )}
      </View>

      <SectionHeader title="Returns" subtitle="Capture RMAs and disposition." />
      {canEditOps ? (
        <Card style={styles.card}>
          <FormField label="Customer">
            <TextInput
              value={returnCustomer}
              onChangeText={setReturnCustomer}
              placeholder="Customer"
              placeholderTextColor={theme.colors.inkSoft}
              style={styles.input}
            />
          </FormField>
          <Text style={styles.label}>Item</Text>
          <View style={styles.chipRow}>
            {finishedItems.length === 0 ? (
              <Text style={styles.mutedText}>Add finished goods first.</Text>
            ) : (
              finishedItems.map((item) => {
                const active = item.id === returnItemId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setReturnItemId(item.id)}
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
              <Text style={styles.inputLabel}>Qty</Text>
              <TextInput
                value={returnQty}
                onChangeText={setReturnQty}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          </View>
          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {returnStatuses.map((status) => {
              const active = status === returnStatus;
              return (
                <Pressable
                  key={status}
                  onPress={() => setReturnStatus(status)}
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
            label="Create return"
            onPress={() => {
              if (
                !returnCustomer.trim() ||
                !returnItemId ||
                !isPositiveNumber(returnQty)
              ) {
                return;
              }
              createReturnRecord({
                customer: returnCustomer.trim(),
                itemId: returnItemId,
                qty: Number(returnQty),
                status: returnStatus
              });
              setReturnCustomer("");
              setReturnQty("0");
            }}
            disabled={
              !returnCustomer.trim() ||
              !returnItemId ||
              !isPositiveNumber(returnQty)
            }
          />
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.mutedText}>
            View-only access. Contact an admin to create returns.
          </Text>
        </Card>
      )}

      <View style={styles.stack}>
        {returnRecords.length === 0 ? (
          <Card>
            <Text style={styles.sub}>No returns yet.</Text>
          </Card>
        ) : (
          returnRecords.map((record) => (
            <Card key={record.id}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.title}>{record.id}</Text>
                  <Text style={styles.sub}>
                    {record.customer} - {itemMap.get(record.itemId)?.name ?? record.itemId}
                  </Text>
                </View>
                <Tag label={record.status.toUpperCase()} tone="info" />
              </View>
              <View style={styles.row}>
                <Text style={styles.sub}>Qty {formatNumber(record.qty)}</Text>
                <Button
                  label="Advance status"
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    updateReturnRecord(record.id, {
                      status: nextStatus(record.status, returnStatuses)
                    })
                  }
                  disabled={!canEditOps}
                />
              </View>
            </Card>
          ))
        )}
      </View>

      <SectionHeader
        title="Batch & Quality"
        subtitle="Capture batch traceability and inspection outcomes."
      />
      {canEditOps ? (
        <Card style={styles.card}>
          <Text style={styles.label}>Item</Text>
          <View style={styles.chipRow}>
            {items.length === 0 ? (
              <Text style={styles.mutedText}>Add items first.</Text>
            ) : (
              items.map((item) => {
                const active = item.id === qcItemId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setQcItemId(item.id)}
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
              <Text style={styles.inputLabel}>Batch number</Text>
              <TextInput
                value={qcLot}
                onChangeText={setQcLot}
                placeholder="Batch number"
                placeholderTextColor={theme.colors.inkSoft}
                style={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Manufacturing date</Text>
              <TextInput
                value={qcManufacturingDate}
                onChangeText={setQcManufacturingDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.inkSoft}
                style={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Expiry date</Text>
              <TextInput
                value={qcExpiryDate}
                onChangeText={setQcExpiryDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.inkSoft}
                style={styles.input}
              />
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Shelf life (days)</Text>
              <TextInput
                value={qcShelfLife}
                onChangeText={setQcShelfLife}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Storage conditions</Text>
              <TextInput
                value={qcStorageConditions}
                onChangeText={setQcStorageConditions}
                placeholder="Dry / Cool"
                placeholderTextColor={theme.colors.inkSoft}
                style={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Packaging type</Text>
              <TextInput
                value={qcPackagingType}
                onChangeText={setQcPackagingType}
                placeholder="Box, Drum"
                placeholderTextColor={theme.colors.inkSoft}
                style={styles.input}
              />
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Hazard classification</Text>
              <TextInput
                value={qcHazardClass}
                onChangeText={setQcHazardClass}
                placeholder="Class"
                placeholderTextColor={theme.colors.inkSoft}
                style={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Handling instructions</Text>
              <TextInput
                value={qcHandling}
                onChangeText={setQcHandling}
                placeholder="Handle with care"
                placeholderTextColor={theme.colors.inkSoft}
                style={styles.input}
              />
            </View>
          </View>
          <FormField label="Notes">
            <TextInput
              value={qcNotes}
              onChangeText={setQcNotes}
              placeholder="Inspection notes"
              placeholderTextColor={theme.colors.inkSoft}
              style={styles.input}
            />
          </FormField>

          <Text style={styles.label}>Batch traceability at supplier end</Text>
          <View style={styles.chipRow}>
            {availabilityOptions.map((status) => {
              const active = status === qcSupplierTraceability;
              return (
                <Pressable
                  key={status}
                  onPress={() => setQcSupplierTraceability(status)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {status.replace("_", " ")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Quality check at supplier end</Text>
          <View style={styles.chipRow}>
            {checkOptions.map((status) => {
              const active = status === qcSupplierQualityCheck;
              return (
                <Pressable
                  key={status}
                  onPress={() => setQcSupplierQualityCheck(status)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {status.replace("_", " ")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Inspection method</Text>
          <View style={styles.chipRow}>
            {inspectionMethods.map((method) => {
              const active = method === qcInspectionMethod;
              return (
                <Pressable
                  key={method}
                  onPress={() => setQcInspectionMethod(method)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {method.replace("_", " ")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Sample test report</Text>
          <View style={styles.chipRow}>
            {availabilityOptions.map((status) => {
              const active = status === qcSampleReport;
              return (
                <Pressable
                  key={status}
                  onPress={() => setQcSampleReport(status)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {status.replace("_", " ")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Incoming quality check at user factory</Text>
          <View style={styles.chipRow}>
            {checkOptions.map((status) => {
              const active = status === qcIncomingCheck;
              return (
                <Pressable
                  key={status}
                  onPress={() => setQcIncomingCheck(status)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {status.replace("_", " ")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Material safety data sheet</Text>
          <View style={styles.chipRow}>
            {availabilityOptions.map((status) => {
              const active = status === qcMsdsAvailable;
              return (
                <Pressable
                  key={status}
                  onPress={() => setQcMsdsAvailable(status)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {status.replace("_", " ")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Inspection result</Text>
          <View style={styles.chipRow}>
            {qcResults.map((result) => {
              const active = result === qcResult;
              return (
                <Pressable
                  key={result}
                  onPress={() => setQcResult(result)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {result}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Button
            label="Create inspection"
            onPress={() => {
              if (!qcItemId || !qcLot.trim()) {
                return;
              }
              createQcInspection({
                itemId: qcItemId,
                lotCode: qcLot.trim(),
                notes: qcNotes.trim(),
                result: qcResult,
                manufacturingDate: qcManufacturingDate.trim() || undefined,
                expiryDate: qcExpiryDate.trim() || undefined,
                supplierTraceability: qcSupplierTraceability,
                supplierQualityCheck: qcSupplierQualityCheck,
                inspectionMethod: qcInspectionMethod,
                sampleTestReport: qcSampleReport,
                incomingQualityCheck: qcIncomingCheck,
                storageConditions: qcStorageConditions.trim() || undefined,
                shelfLifeDays: qcShelfLife.trim() ? Number(qcShelfLife) : undefined,
                hazardClassification: qcHazardClass.trim() || undefined,
                handlingInstructions: qcHandling.trim() || undefined,
                msdsAvailable: qcMsdsAvailable,
                packagingType: qcPackagingType.trim() || undefined
              });
              setQcLot("");
              setQcNotes("");
              setQcManufacturingDate("");
              setQcExpiryDate("");
              setQcStorageConditions("");
              setQcShelfLife("0");
              setQcHazardClass("");
              setQcHandling("");
              setQcPackagingType("");
              setQcSupplierTraceability("available");
              setQcSupplierQualityCheck("completed");
              setQcInspectionMethod("visual");
              setQcSampleReport("available");
              setQcIncomingCheck("completed");
              setQcMsdsAvailable("available");
            }}
            disabled={!qcItemId || !qcLot.trim()}
          />
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.mutedText}>
            View-only access. Contact an admin to log quality checks.
          </Text>
        </Card>
      )}

      <View style={styles.stack}>
        {qcInspections.length === 0 ? (
          <Card>
            <Text style={styles.sub}>No inspections yet.</Text>
          </Card>
        ) : (
          qcInspections.map((inspection) => (
            <Card key={inspection.id}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.title}>{inspection.lotCode}</Text>
                  <Text style={styles.sub}>
                    {itemMap.get(inspection.itemId)?.name ?? inspection.itemId}
                  </Text>
                  <Text style={styles.sub}>
                    MFG {inspection.manufacturingDate ?? "-"} | EXP{" "}
                    {inspection.expiryDate ?? "-"}
                  </Text>
                  <Text style={styles.sub}>
                    Supplier QC{" "}
                    {inspection.supplierQualityCheck
                      ? inspection.supplierQualityCheck.replace("_", " ")
                      : "-"}{" "}
                    | Incoming QC{" "}
                    {inspection.incomingQualityCheck
                      ? inspection.incomingQualityCheck.replace("_", " ")
                      : "-"}
                  </Text>
                </View>
                <Tag
                  label={inspection.result.toUpperCase()}
                  tone={inspection.result === "pass" ? "success" : "warning"}
                />
              </View>
              <Button
                label="Advance result"
                size="sm"
                variant="secondary"
                onPress={() =>
                  updateQcInspection(inspection.id, {
                    result: nextStatus(inspection.result, qcResults)
                  })
                }
                disabled={!canEditOps}
              />
            </Card>
          ))
        )}
      </View>
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
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: theme.spacing.sm
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.ink
  },
  sub: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.inkSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs
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
  chipSub: {
    fontSize: 10,
    color: theme.colors.inkSoft
  },
  chipSubActive: {
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
  mutedText: {
    fontSize: 12,
    color: theme.colors.inkSubtle
  }
});
