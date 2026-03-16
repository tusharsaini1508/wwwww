import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { Card } from "../../src/components/Card";
import { DataTable } from "../../src/components/DataTable";
import { Tag } from "../../src/components/Tag";
import { AccessDenied } from "../../src/components/AccessDenied";
import { Button } from "../../src/components/Button";
import { theme } from "../../src/theme";
import { useAppStore } from "../../src/store/useAppStore";
import { formatNumber } from "../../src/lib/format";
import { useCan } from "../../src/hooks/useCurrentUser";

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

type ApiInventoryBalance = {
  id: string;
  companyId: string;
  itemSku: string;
  itemName: string;
  warehouseCode: string;
  quantity: number;
  updatedAt: string;
};

type InventoryRow = {
  id: string;
  item: string;
  itemCode: string;
  warehouse: string;
  location: string;
  rackNumber: string;
  bin: string;
  binNumber: string;
  binCapacity: string;
  onHand: string;
  reserved: string;
  available: string;
  stockValue: string;
  reorderPoint: string;
  safetyStock: string;
  reorderQuantity: string;
  minStock: string;
  maxStock: string;
  stockMethod: string;
  lineSideRack: string;
  lineSideBin: string;
  annualCheck: string;
  lot: string;
  expiry: string;
};

export default function InventoryScreen() {
  const canView = useCan("inventory.view");
  const canEdit = useCan("inventory.edit");
  const canProducts = useCan("products.edit");
  const canFacilities = useCan("warehouse.edit");
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "healthy">("all");
  const deferredQuery = useDeferredValue(query);
  const items = useAppStore((state) => state.items);
  const bins = useAppStore((state) => state.bins);
  const locations = useAppStore((state) => state.locations);
  const warehouses = useAppStore((state) => state.warehouses);
  const inventory = useAppStore((state) => state.inventory);
  const authToken = useAppStore((state) => state.authToken);
  const upsertInventoryBalance = useAppStore((state) => state.upsertInventoryBalance);
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "");
  const [selectedBinId, setSelectedBinId] = useState(bins[0]?.id ?? "");
  const [onHand, setOnHand] = useState("0");
  const [reserved, setReserved] = useState("0");
  const [lotCode, setLotCode] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [lineSideRack, setLineSideRack] = useState("0");
  const [lineSideBin, setLineSideBin] = useState("0");
  const [annualCheck, setAnnualCheck] = useState(false);
  const [remoteInventory, setRemoteInventory] = useState<ApiInventoryBalance[] | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [upsertingRemote, setUpsertingRemote] = useState(false);

  const loadInventory = async () => {
      if (!API_BASE_URL || !authToken) {
        setRemoteInventory(null);
        return;
      }

      setLoadingRemote(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/inventory`, {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        });
        if (!response.ok) {
          setRemoteInventory(null);
          return;
        }
        const payload = (await response.json()) as { inventory?: ApiInventoryBalance[] };
        setRemoteInventory(payload.inventory ?? []);
      } catch {
        setRemoteInventory(null);
      } finally {
        setLoadingRemote(false);
      }
    };

  useEffect(() => {
    void loadInventory();
  }, [authToken]);

  const apiMode = Boolean(API_BASE_URL && authToken && remoteInventory !== null);

  const warehouseByLocationId = useMemo(
    () => new Map(warehouses.map((warehouse) => [warehouse.id, warehouse])),
    [warehouses]
  );
  const locationById = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations]
  );

  useEffect(() => {
    if (!selectedItemId && items[0]) {
      setSelectedItemId(items[0].id);
    }
  }, [items, selectedItemId]);

  useEffect(() => {
    if (!selectedBinId && bins[0]) {
      setSelectedBinId(bins[0].id);
    }
  }, [bins, selectedBinId]);

  const localRows = useMemo(() => {
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const binMap = new Map(bins.map((bin) => [bin.id, bin]));
    const locationMap = new Map(locations.map((loc) => [loc.id, loc]));
    const warehouseMap = new Map(warehouses.map((wh) => [wh.id, wh]));
    return inventory.map<InventoryRow>((balance) => {
      const item = itemMap.get(balance.itemId);
      const bin = binMap.get(balance.binId);
      const location = bin ? locationMap.get(bin.locationId) : null;
      const warehouse = location ? warehouseMap.get(location.warehouseId) : null;
      const available = Math.max(0, balance.onHand - balance.reserved);
      const unitCost = item?.unitCost ?? 0;
      const stockValue = unitCost * balance.onHand;
      return {
        id: balance.id,
        item: item ? item.name : balance.itemId,
        itemCode: item?.sku ?? "-",
        warehouse: warehouse?.name ?? "-",
        location: location?.zone ?? "-",
        rackNumber: location?.rackNumber ?? "-",
        bin: bin?.code ?? balance.binId,
        binNumber: bin?.binNumber ?? "-",
        binCapacity: bin ? formatNumber(bin.capacity) : "-",
        onHand: formatNumber(balance.onHand),
        reserved: formatNumber(balance.reserved),
        available: formatNumber(available),
        stockValue: formatNumber(stockValue),
        reorderPoint: formatNumber(item?.reorderPoint ?? 0),
        safetyStock: formatNumber(item?.safetyStock ?? 0),
        reorderQuantity: formatNumber(item?.reorderQuantity ?? 0),
        minStock: formatNumber(item?.minStock ?? 0),
        maxStock: formatNumber(item?.maxStock ?? 0),
        stockMethod: (item?.stockMethod ?? "fifo").toUpperCase(),
        lineSideRack: formatNumber(balance.lineSideRackQty ?? 0),
        lineSideBin: formatNumber(balance.lineSideBinQty ?? 0),
        annualCheck: balance.annualCheckCompleted ? "Completed" : "Not completed",
        lot: balance.lotCode ?? "-",
        expiry: balance.expiryDate ?? "-"
      };
    });
  }, [bins, inventory, items, locations, warehouses]);

  const remoteRows = useMemo(() => {
    if (!remoteInventory) {
      return [] as InventoryRow[];
    }

    return remoteInventory.map<InventoryRow>((balance) => ({
      id: balance.id,
      item: balance.itemName,
      itemCode: balance.itemSku,
      warehouse: balance.warehouseCode,
      location: "-",
      rackNumber: "-",
      bin: "-",
      binNumber: "-",
      binCapacity: "-",
      onHand: formatNumber(balance.quantity),
      reserved: "0",
      available: formatNumber(balance.quantity),
      stockValue: "-",
      reorderPoint: "-",
      safetyStock: "-",
      reorderQuantity: "-",
      minStock: "-",
      maxStock: "-",
      stockMethod: "-",
      lineSideRack: "-",
      lineSideBin: "-",
      annualCheck: "-",
      lot: "-",
      expiry: "-"
    }));
  }, [remoteInventory]);

  const rows = remoteInventory ? remoteRows : localRows;

  const filteredRows = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const searched = !needle
      ? rows
      : rows.filter(
          (row) =>
            row.item.toLowerCase().includes(needle) ||
            row.itemCode.toLowerCase().includes(needle) ||
            row.warehouse.toLowerCase().includes(needle) ||
            row.location.toLowerCase().includes(needle) ||
            row.bin.toLowerCase().includes(needle) ||
            row.lot.toLowerCase().includes(needle)
        );

    return searched.filter((row) => {
      if (stockFilter === "all") {
        return true;
      }
      const available = Number(row.available.replace(/,/g, ""));
      if (stockFilter === "low") {
        return available < 100;
      }
      return available >= 100;
    });
  }, [deferredQuery, rows, stockFilter]);

  const selectedBalance = useMemo(
    () =>
      inventory.find(
        (balance) => balance.itemId === selectedItemId && balance.binId === selectedBinId
      ),
    [inventory, selectedBinId, selectedItemId]
  );

  useEffect(() => {
    if (!selectedItemId || !selectedBinId) {
      return;
    }
    if (selectedBalance) {
      setOnHand(String(selectedBalance.onHand));
      setReserved(String(selectedBalance.reserved));
      setLotCode(selectedBalance.lotCode ?? "");
      setExpiryDate(selectedBalance.expiryDate ?? "");
      setLineSideRack(String(selectedBalance.lineSideRackQty ?? 0));
      setLineSideBin(String(selectedBalance.lineSideBinQty ?? 0));
      setAnnualCheck(Boolean(selectedBalance.annualCheckCompleted));
      return;
    }
    setOnHand("0");
    setReserved("0");
    setLotCode("");
    setExpiryDate("");
    setLineSideRack("0");
    setLineSideBin("0");
    setAnnualCheck(false);
  }, [selectedBalance, selectedBinId, selectedItemId]);

  const selectedRemoteBalance = useMemo(() => {
    if (!remoteInventory) {
      return null;
    }

    const selectedItem = items.find((item) => item.id === selectedItemId);
    const selectedBin = bins.find((bin) => bin.id === selectedBinId);
    const selectedLocation = selectedBin ? locationById.get(selectedBin.locationId) : null;
    const selectedWarehouse = selectedLocation
      ? warehouseByLocationId.get(selectedLocation.warehouseId)
      : null;

    if (!selectedItem || !selectedWarehouse) {
      return null;
    }

    return (
      remoteInventory.find(
        (entry) =>
          entry.itemSku === selectedItem.sku && entry.warehouseCode === selectedWarehouse.name
      ) ?? null
    );
  }, [
    bins,
    items,
    locationById,
    remoteInventory,
    selectedBinId,
    selectedItemId,
    warehouseByLocationId
  ]);

  useEffect(() => {
    if (!apiMode) {
      return;
    }

    if (!selectedRemoteBalance) {
      setOnHand("0");
      setReserved("0");
      setLotCode("");
      setExpiryDate("");
      setLineSideRack("0");
      setLineSideBin("0");
      setAnnualCheck(false);
      return;
    }

    setOnHand(String(selectedRemoteBalance.quantity));
    setReserved("0");
    setLotCode("");
    setExpiryDate("");
    setLineSideRack("0");
    setLineSideBin("0");
    setAnnualCheck(false);
  }, [apiMode, selectedRemoteBalance]);

  if (!canView) {
    return (
      <Screen>
        <SectionHeader title="Inventory Control" subtitle="Role-based access enforced." />
        <AccessDenied />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionHeader
        title="Inventory Control"
        subtitle="Track stock by bin, lot, and availability."
      />
      {loadingRemote ? (
        <Text style={styles.remoteMeta}>Loading inventory from backend...</Text>
      ) : remoteInventory ? (
        <Text style={styles.remoteMeta}>Showing inventory from backend API.</Text>
      ) : (
        <Text style={styles.remoteMeta}>Using local inventory data (API unavailable).</Text>
      )}

      <SectionHeader
        title="Stock Editor"
        subtitle="Create or update on-hand balances."
      />
      <Card style={styles.editorCard}>
        {!canEdit ? (
          <Text style={styles.emptyText}>
            You have view-only access. Contact an admin to edit stock.
          </Text>
        ) : items.length === 0 || bins.length === 0 ? (
          <View>
            <Text style={styles.emptyText}>
              Add items and bins to start tracking inventory.
            </Text>
            <View style={styles.emptyActions}>
              {canProducts ? (
                <Link href="/admin/products" asChild>
                  <Pressable style={styles.linkChip}>
                    <Text style={styles.linkText}>Add items</Text>
                  </Pressable>
                </Link>
              ) : null}
              {canFacilities ? (
                <Link href="/admin/facility" asChild>
                  <Pressable style={styles.linkChip}>
                    <Text style={styles.linkText}>Setup bins</Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Item</Text>
            <View style={styles.chipRow}>
              {items.map((item) => {
                const active = item.id === selectedItemId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedItemId(item.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {item.sku}
                    </Text>
                    <Text style={[styles.chipSub, active && styles.chipSubActive]}>
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Bin</Text>
            <View style={styles.chipRow}>
              {bins.map((bin) => {
                const active = bin.id === selectedBinId;
                return (
                  <Pressable
                    key={bin.id}
                    onPress={() => setSelectedBinId(bin.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {bin.code}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>On-hand</Text>
                <TextInput
                  value={onHand}
                  onChangeText={setOnHand}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reserved</Text>
                <TextInput
                  value={reserved}
                  onChangeText={setReserved}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Lot</Text>
                <TextInput
                  value={lotCode}
                  onChangeText={setLotCode}
                  placeholder="Optional"
                  placeholderTextColor={theme.colors.inkSoft}
                  style={styles.input}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Expiry date</Text>
                <TextInput
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.inkSoft}
                  style={styles.input}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Line side rack qty</Text>
                <TextInput
                  value={lineSideRack}
                  onChangeText={setLineSideRack}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Line side bin qty</Text>
                <TextInput
                  value={lineSideBin}
                  onChangeText={setLineSideBin}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Annual physical inventory check</Text>
            <View style={styles.chipRow}>
              {[true, false].map((value) => {
                const active = annualCheck === value;
                return (
                  <Pressable
                    key={String(value)}
                    onPress={() => setAnnualCheck(value)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {value ? "Completed" : "Not completed"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Button
              label={
                apiMode
                  ? selectedRemoteBalance
                    ? "Update backend balance"
                    : "Create backend balance"
                  : selectedBalance
                  ? "Update balance"
                  : "Create balance"
              }
              onPress={async () => {
                if (!selectedItemId || !selectedBinId) {
                  return;
                }

                if (apiMode) {
                  const selectedItem = items.find((item) => item.id === selectedItemId);
                  const selectedBin = bins.find((bin) => bin.id === selectedBinId);
                  const selectedLocation = selectedBin
                    ? locationById.get(selectedBin.locationId)
                    : null;
                  const selectedWarehouse = selectedLocation
                    ? warehouseByLocationId.get(selectedLocation.warehouseId)
                    : null;

                  if (!selectedItem || !selectedWarehouse) {
                    return;
                  }

                  try {
                    setUpsertingRemote(true);
                    const response = await fetch(`${API_BASE_URL}/api/inventory/upsert`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${authToken}`
                      },
                      body: JSON.stringify({
                        itemSku: selectedItem.sku,
                        itemName: selectedItem.name,
                        warehouseCode: selectedWarehouse.name,
                        quantity: Number(onHand)
                      })
                    });

                    if (response.ok) {
                      await loadInventory();
                    }
                  } finally {
                    setUpsertingRemote(false);
                  }

                  return;
                }

                upsertInventoryBalance({
                  itemId: selectedItemId,
                  binId: selectedBinId,
                  onHand: Number(onHand),
                  reserved: Number(reserved),
                  lotCode: lotCode.trim() || undefined,
                  expiryDate: expiryDate.trim() || undefined,
                  lineSideRackQty: Number(lineSideRack),
                  lineSideBinQty: Number(lineSideBin),
                  annualCheckCompleted: annualCheck
                });
              }}
              disabled={!selectedItemId || !selectedBinId || upsertingRemote}
            />
          </>
        )}
      </Card>

      <Card style={styles.searchCard}>
        <Text style={styles.searchLabel}>Search stock</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search item, bin, or lot"
          placeholderTextColor={theme.colors.inkSubtle}
          style={styles.input}
        />
        <View style={styles.searchTags}>
          <Tag label="On-hand" tone="info" />
          <Tag label="Reserved" tone="warning" />
          <Tag label="Available" tone="success" />
        </View>
        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setStockFilter("all")}
            style={[styles.filterChip, stockFilter === "all" && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, stockFilter === "all" && styles.filterTextActive]}>
              All
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStockFilter("low")}
            style={[styles.filterChip, stockFilter === "low" && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, stockFilter === "low" && styles.filterTextActive]}>
              Low Stock
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStockFilter("healthy")}
            style={[
              styles.filterChip,
              stockFilter === "healthy" && styles.filterChipActive
            ]}
          >
            <Text
              style={[
                styles.filterText,
                stockFilter === "healthy" && styles.filterTextActive
              ]}
            >
              Healthy
            </Text>
          </Pressable>
        </View>
      </Card>

      <SectionHeader
        title="Stock by Bin"
        subtitle="Live quantities with lot-level visibility."
      />
      <DataTable
        columns={[
          { key: "item", label: "Item", width: 200 },
          { key: "itemCode", label: "Item Code", width: 130 },
          { key: "warehouse", label: "Warehouse", width: 160 },
          { key: "location", label: "Location", width: 140 },
          { key: "rackNumber", label: "Rack", width: 110 },
          { key: "bin", label: "Bin", width: 110 },
          { key: "binNumber", label: "Bin Number", width: 120 },
          { key: "binCapacity", label: "Bin Capacity", width: 140 },
          { key: "onHand", label: "On-Hand", width: 120 },
          { key: "reserved", label: "Reserved", width: 120 },
          { key: "available", label: "Available", width: 120 },
          { key: "stockValue", label: "Stock Value", width: 140 },
          { key: "reorderPoint", label: "Reorder Point", width: 140 },
          { key: "safetyStock", label: "Safety Stock", width: 140 },
          { key: "reorderQuantity", label: "Reorder Qty", width: 130 },
          { key: "minStock", label: "Min Stock", width: 120 },
          { key: "maxStock", label: "Max Stock", width: 120 },
          { key: "stockMethod", label: "FIFO/LIFO", width: 120 },
          { key: "lineSideRack", label: "Line Side Rack Qty", width: 170 },
          { key: "lineSideBin", label: "Line Side Bin Qty", width: 160 },
          { key: "annualCheck", label: "Annual Check", width: 140 },
          { key: "lot", label: "Lot", width: 120 },
          { key: "expiry", label: "Expiry", width: 120 }
        ]}
        rows={filteredRows}
        emptyMessage="No inventory balances yet."
        summary={`${filteredRows.length} rows | filter: ${stockFilter}`}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  remoteMeta: {
    marginBottom: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  searchCard: {
    marginBottom: theme.spacing.lg
  },
  editorCard: {
    marginBottom: theme.spacing.lg
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
  searchLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.inkSubtle,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  input: {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    backgroundColor: theme.colors.surface
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  emptyActions: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  linkChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted
  },
  linkText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.accentDark
  },
  searchTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm
  },
  filterRow: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  filterChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface
  },
  filterChipActive: {
    borderColor: theme.colors.accentDark,
    backgroundColor: theme.colors.accentSoft
  },
  filterText: {
    fontSize: 12,
    fontFamily: theme.typography.body,
    fontWeight: "600",
    color: theme.colors.textSecondary
  },
  filterTextActive: {
    color: theme.colors.accentDark,
    fontWeight: "700"
  }
});
