
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { Card } from "../../../src/components/Card";
import { AccessDenied } from "../../../src/components/AccessDenied";
import { AdminTabs } from "../../../src/components/AdminTabs";
import { Tag } from "../../../src/components/Tag";
import { FormField } from "../../../src/components/FormField";
import { theme } from "../../../src/theme";
import { useAppStore } from "../../../src/store/useAppStore";
import {
  BOMLine,
  Item,
  ItemClassification,
  ItemOrigin,
  ItemProductionType,
  ItemStatus,
  ItemType,
  StockMethod,
  Supplier
} from "../../../src/types";
import { useCan } from "../../../src/hooks/useCurrentUser";
import { calculateForecast } from "../../../src/lib/forecast";
import { formatNumber } from "../../../src/lib/format";

type BomDraftLine = {
  id: string;
  materialId: string;
  qtyPerUnit: string;
};

const toNumber = (value: string) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const clampNonNegative = (value: string) => Math.max(0, toNumber(value));
const clampPercent = (value: string) => Math.max(0, Math.min(100, toNumber(value)));
const handleImagePickerResult = (
  result: ImagePicker.ImagePickerResult,
  onPicked: (uri: string) => void,
  onError: (message: string) => void
) => {
  if (result.canceled) {
    return;
  }
  const asset = result.assets?.[0];
  if (!asset?.uri) {
    onError("No image selected.");
    return;
  }
  onPicked(asset.uri);
};
const pickItemImageFromLibrary = async (
  onPicked: (uri: string) => void,
  onError: (message: string) => void
) => {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onError("Media library permission is required to pick an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8
    });
    handleImagePickerResult(result, onPicked, onError);
  } catch {
    onError("Unable to open image picker.");
  }
};
const pickItemImageFromCamera = async (
  onPicked: (uri: string) => void,
  onError: (message: string) => void
) => {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      onError("Camera permission is required to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8
    });
    handleImagePickerResult(result, onPicked, onError);
  } catch {
    onError("Unable to open camera.");
  }
};
const isValidHsn = (value: string) => /^\d{4,8}$/.test(value);

const parseBomDrafts = (drafts: BomDraftLine[]) => {
  const errors: string[] = [];
  const seen = new Set<string>();
  const lines = drafts.map((line, index) => {
    const qty = clampNonNegative(line.qtyPerUnit);
    if (!line.materialId) {
      errors.push(`Line ${index + 1}: select a material.`);
    }
    if (qty <= 0) {
      errors.push(`Line ${index + 1}: quantity per unit is required.`);
    }
    if (line.materialId) {
      if (seen.has(line.materialId)) {
        errors.push(`Line ${index + 1}: duplicate material.`);
      }
      seen.add(line.materialId);
    }
    return { materialId: line.materialId, qtyPerUnit: qty };
  });
  const validLines = lines.filter((line) => line.materialId && line.qtyPerUnit > 0);
  return { errors, lines: validLines };
};

const makeDraftLine = (): BomDraftLine => ({
  id: `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  materialId: "",
  qtyPerUnit: ""
});

const classificationOptions: { value: ItemClassification; label: string }[] = [
  { value: "high_cost", label: "High cost" },
  { value: "wear_out", label: "Wear-out" },
  { value: "consumable", label: "Consumable" },
  { value: "spare_part", label: "Spare part" },
  { value: "long_lead", label: "Long lead" }
];

const originOptions: { value: ItemOrigin; label: string }[] = [
  { value: "local", label: "Local" },
  { value: "imported", label: "Imported" }
];

const productionOptions: { value: ItemProductionType; label: string }[] = [
  { value: "production", label: "Production" },
  { value: "non_production", label: "Non-production" }
];

const statusOptions: { value: ItemStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" }
];

const stockMethodOptions: { value: StockMethod; label: string }[] = [
  { value: "fifo", label: "FIFO" },
  { value: "lifo", label: "LIFO" }
];

const ItemEditor = ({
  item,
  onUpdate,
  suppliers
}: {
  item: Item;
  onUpdate: (patch: Partial<Item>) => void;
  suppliers: Supplier[];
}) => {
  const [name, setName] = useState(item.name);
  const [sku, setSku] = useState(item.sku);
  const [description, setDescription] = useState(item.description ?? "");
  const [classification, setClassification] = useState<ItemClassification>(
    item.classification ?? "consumable"
  );
  const [categoryGroup, setCategoryGroup] = useState(item.categoryGroup ?? "");
  const [workStationName, setWorkStationName] = useState(
    item.workStationName ?? ""
  );
  const [commodityCode, setCommodityCode] = useState(item.commodityCode ?? "");
  const [hsnNumber, setHsnNumber] = useState(item.hsnNumber ?? "");
  const [origin, setOrigin] = useState<ItemOrigin>(item.origin ?? "local");
  const [productionType, setProductionType] = useState<ItemProductionType>(
    item.productionType ?? "production"
  );
  const [status, setStatus] = useState<ItemStatus>(item.status ?? "active");
  const [barcode, setBarcode] = useState(item.barcode ?? "");
  const [imageUri, setImageUri] = useState(item.imageUri ?? "");
  const [uom, setUom] = useState(item.uom);
  const [reorderPoint, setReorderPoint] = useState(String(item.reorderPoint));
  const [safetyStock, setSafetyStock] = useState(String(item.safetyStock));
  const [reorderQuantity, setReorderQuantity] = useState(
    String(item.reorderQuantity ?? 0)
  );
  const [minStock, setMinStock] = useState(String(item.minStock ?? 0));
  const [maxStock, setMaxStock] = useState(String(item.maxStock ?? 0));
  const [stockMethod, setStockMethod] = useState<StockMethod>(
    item.stockMethod ?? "fifo"
  );
  const [unitCost, setUnitCost] = useState(String(item.unitCost ?? 0));
  const [leadTime, setLeadTime] = useState(String(item.leadTimeDays));
  const [yieldPercent, setYieldPercent] = useState(String(item.yieldPercent));
  const [scrapPercent, setScrapPercent] = useState(String(item.scrapPercent));
  const [approvedSuppliers, setApprovedSuppliers] = useState<string[]>(
    item.approvedSupplierIds ?? []
  );
  const [error, setError] = useState("");

  useEffect(() => {
    setName(item.name);
    setSku(item.sku);
    setDescription(item.description ?? "");
    setClassification(item.classification ?? "consumable");
    setCategoryGroup(item.categoryGroup ?? "");
    setWorkStationName(item.workStationName ?? "");
    setCommodityCode(item.commodityCode ?? "");
    setHsnNumber(item.hsnNumber ?? "");
    setOrigin(item.origin ?? "local");
    setProductionType(item.productionType ?? "production");
    setStatus(item.status ?? "active");
    setBarcode(item.barcode ?? "");
    setImageUri(item.imageUri ?? "");
    setUom(item.uom);
    setReorderPoint(String(item.reorderPoint));
    setSafetyStock(String(item.safetyStock));
    setReorderQuantity(String(item.reorderQuantity ?? 0));
    setMinStock(String(item.minStock ?? 0));
    setMaxStock(String(item.maxStock ?? 0));
    setStockMethod(item.stockMethod ?? "fifo");
    setUnitCost(String(item.unitCost ?? 0));
    setLeadTime(String(item.leadTimeDays));
    setYieldPercent(String(item.yieldPercent));
    setScrapPercent(String(item.scrapPercent));
    setApprovedSuppliers(item.approvedSupplierIds ?? []);
    setError("");
  }, [item]);

  const hasChanges =
    name.trim() !== item.name ||
    sku.trim() !== item.sku ||
    description.trim() !== (item.description ?? "") ||
    classification !== (item.classification ?? "consumable") ||
    categoryGroup.trim() !== (item.categoryGroup ?? "") ||
    workStationName.trim() !== (item.workStationName ?? "") ||
    commodityCode.trim() !== (item.commodityCode ?? "") ||
    hsnNumber.trim() !== (item.hsnNumber ?? "") ||
    origin !== (item.origin ?? "local") ||
    productionType !== (item.productionType ?? "production") ||
    status !== (item.status ?? "active") ||
    barcode.trim() !== (item.barcode ?? "") ||
    imageUri.trim() !== (item.imageUri ?? "") ||
    uom.trim() !== item.uom ||
    clampNonNegative(reorderPoint) !== item.reorderPoint ||
    clampNonNegative(safetyStock) !== item.safetyStock ||
    clampNonNegative(reorderQuantity) !== (item.reorderQuantity ?? 0) ||
    clampNonNegative(minStock) !== (item.minStock ?? 0) ||
    clampNonNegative(maxStock) !== (item.maxStock ?? 0) ||
    stockMethod !== (item.stockMethod ?? "fifo") ||
    clampNonNegative(unitCost) !== (item.unitCost ?? 0) ||
    clampNonNegative(leadTime) !== item.leadTimeDays ||
    clampPercent(yieldPercent) !== item.yieldPercent ||
    clampPercent(scrapPercent) !== item.scrapPercent ||
    [...approvedSuppliers].sort().join("|") !==
      [...(item.approvedSupplierIds ?? [])].sort().join("|");

  const handleSave = () => {
    const nextName = name.trim();
    const nextSku = sku.trim();
    const nextUom = uom.trim();
    if (!nextName || !nextSku || !nextUom) {
      setError("Name, SKU, and UOM are required.");
      return;
    }
    const nextHsnNumber = hsnNumber.trim();
    const nextMinStock = clampNonNegative(minStock);
    const nextMaxStock = clampNonNegative(maxStock);
    if (nextHsnNumber && !isValidHsn(nextHsnNumber)) {
      setError("HSN must be 4-8 digits.");
      return;
    }
    if (nextMinStock > nextMaxStock) {
      setError("Min stock cannot exceed max stock.");
      return;
    }
    setError("");
    onUpdate({
      name: nextName,
      sku: nextSku,
      description: description.trim(),
      classification,
      categoryGroup: categoryGroup.trim(),
      workStationName: workStationName.trim(),
      commodityCode: commodityCode.trim(),
      hsnNumber: nextHsnNumber,
      origin,
      productionType,
      status,
      barcode: barcode.trim(),
      imageUri: imageUri.trim() || undefined,
      uom: nextUom,
      reorderPoint: clampNonNegative(reorderPoint),
      safetyStock: clampNonNegative(safetyStock),
      reorderQuantity: clampNonNegative(reorderQuantity),
      minStock: nextMinStock,
      maxStock: nextMaxStock,
      stockMethod,
      unitCost: clampNonNegative(unitCost),
      leadTimeDays: clampNonNegative(leadTime),
      yieldPercent: clampPercent(yieldPercent),
      scrapPercent: clampPercent(scrapPercent),
      approvedSupplierIds: approvedSuppliers
    });
  };

  const handleReset = () => {
    setName(item.name);
    setSku(item.sku);
    setDescription(item.description ?? "");
    setClassification(item.classification ?? "consumable");
    setCategoryGroup(item.categoryGroup ?? "");
    setWorkStationName(item.workStationName ?? "");
    setCommodityCode(item.commodityCode ?? "");
    setHsnNumber(item.hsnNumber ?? "");
    setOrigin(item.origin ?? "local");
    setProductionType(item.productionType ?? "production");
    setStatus(item.status ?? "active");
    setBarcode(item.barcode ?? "");
    setImageUri(item.imageUri ?? "");
    setUom(item.uom);
    setReorderPoint(String(item.reorderPoint));
    setSafetyStock(String(item.safetyStock));
    setReorderQuantity(String(item.reorderQuantity ?? 0));
    setMinStock(String(item.minStock ?? 0));
    setMaxStock(String(item.maxStock ?? 0));
    setStockMethod(item.stockMethod ?? "fifo");
    setUnitCost(String(item.unitCost ?? 0));
    setLeadTime(String(item.leadTimeDays));
    setYieldPercent(String(item.yieldPercent));
    setScrapPercent(String(item.scrapPercent));
    setApprovedSuppliers(item.approvedSupplierIds ?? []);
    setError("");
  };

  const toggleSupplier = (supplierId: string) => {
    setApprovedSuppliers((prev) => {
      if (prev.includes(supplierId)) {
        return prev.filter((id) => id !== supplierId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, supplierId];
    });
  };

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemSku}>{item.sku}</Text>
        </View>
        <Tag label={item.type.toUpperCase()} tone="info" />
      </View>
      <View style={styles.inputs}>
        <FormField label="Item name" style={styles.inputGroup}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Item name"
            placeholderTextColor={theme.colors.inkSubtle}
            style={styles.input}
          />
        </FormField>
        <FormField label="Item code" style={styles.inputGroup}>
          <TextInput
            value={sku}
            onChangeText={setSku}
            placeholder="Item code / SKU"
            placeholderTextColor={theme.colors.inkSubtle}
            autoCapitalize="characters"
            style={styles.input}
          />
        </FormField>
        <FormField label="Description" style={styles.inputGroup}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Item description"
            placeholderTextColor={theme.colors.inkSubtle}
            style={styles.input}
          />
        </FormField>
        <FormField label="Classification" style={styles.inputGroup}>
          <View style={styles.chipRow}>
            {classificationOptions.map((option) => {
              const active = classification === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setClassification(option.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormField>
        <FormField label="Category / Group" style={styles.inputGroup}>
          <TextInput
            value={categoryGroup}
            onChangeText={setCategoryGroup}
            placeholder="Assembly line - Engine"
            placeholderTextColor={theme.colors.inkSubtle}
            style={styles.input}
          />
        </FormField>
        <FormField label="Work station name" style={styles.inputGroup}>
          <TextInput
            value={workStationName}
            onChangeText={setWorkStationName}
            placeholder="Work station"
            placeholderTextColor={theme.colors.inkSubtle}
            style={styles.input}
          />
        </FormField>
        <FormField label="Commodity code" style={styles.inputGroup}>
          <TextInput
            value={commodityCode}
            onChangeText={setCommodityCode}
            placeholder="Commodity code"
            placeholderTextColor={theme.colors.inkSubtle}
            style={styles.input}
          />
        </FormField>
        <FormField label="HSN number" style={styles.inputGroup}>
          <TextInput
            value={hsnNumber}
            onChangeText={setHsnNumber}
            placeholder="HSN"
            placeholderTextColor={theme.colors.inkSubtle}
            style={styles.input}
          />
        </FormField>
        <FormField label="Origin" style={styles.inputGroup}>
          <View style={styles.chipRow}>
            {originOptions.map((option) => {
              const active = origin === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setOrigin(option.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormField>
        <FormField label="Production type" style={styles.inputGroup}>
          <View style={styles.chipRow}>
            {productionOptions.map((option) => {
              const active = productionType === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setProductionType(option.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormField>
        <FormField label="Status" style={styles.inputGroup}>
          <View style={styles.chipRow}>
            {statusOptions.map((option) => {
              const active = status === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setStatus(option.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormField>
        <FormField label="UOM" style={styles.inputGroup}>
          <TextInput
            value={uom}
            onChangeText={setUom}
            placeholder="unit, kg, m"
            placeholderTextColor={theme.colors.inkSubtle}
            style={styles.input}
          />
        </FormField>
        <FormField label="Barcode / QR" style={styles.inputGroup}>
          <TextInput
            value={barcode}
            onChangeText={setBarcode}
            placeholder="Barcode or QR"
            placeholderTextColor={theme.colors.inkSubtle}
            style={styles.input}
          />
        </FormField>
        <FormField label="Item image (URL or local)" style={styles.inputGroup}>
          <View style={styles.imageRow}>
            <TextInput
              value={imageUri}
              onChangeText={setImageUri}
              placeholder="https:// or pick an image"
              placeholderTextColor={theme.colors.inkSubtle}
              autoCapitalize="none"
              style={[styles.input, styles.imageInput]}
            />
            <View style={styles.imageActions}>
              <Pressable
                onPress={() => pickItemImageFromLibrary(setImageUri, setError)}
                style={styles.ghostButton}
              >
                <Text style={styles.ghostText}>Choose image</Text>
              </Pressable>
              <Pressable
                onPress={() => pickItemImageFromCamera(setImageUri, setError)}
                style={styles.ghostButton}
              >
                <Text style={styles.ghostText}>Take photo</Text>
              </Pressable>
              {imageUri.trim() ? (
                <Pressable onPress={() => setImageUri("")} style={styles.ghostButton}>
                  <Text style={styles.ghostText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          {imageUri.trim() ? (
            <Image source={{ uri: imageUri.trim() }} style={styles.imagePreview} />
          ) : null}
        </FormField>
        <FormField label="Reorder point" style={styles.inputGroup}>
          <TextInput
            value={reorderPoint}
            onChangeText={setReorderPoint}
            keyboardType="numeric"
            style={styles.input}
          />
        </FormField>
        <FormField label="Safety stock" style={styles.inputGroup}>
          <TextInput
            value={safetyStock}
            onChangeText={setSafetyStock}
            keyboardType="numeric"
            style={styles.input}
          />
        </FormField>
        <FormField label="Reorder quantity" style={styles.inputGroup}>
          <TextInput
            value={reorderQuantity}
            onChangeText={setReorderQuantity}
            keyboardType="numeric"
            style={styles.input}
          />
        </FormField>
        <FormField label="Min stock" style={styles.inputGroup}>
          <TextInput
            value={minStock}
            onChangeText={setMinStock}
            keyboardType="numeric"
            style={styles.input}
          />
        </FormField>
        <FormField label="Max stock" style={styles.inputGroup}>
          <TextInput
            value={maxStock}
            onChangeText={setMaxStock}
            keyboardType="numeric"
            style={styles.input}
          />
        </FormField>
        <FormField label="Stock method" style={styles.inputGroup}>
          <View style={styles.chipRow}>
            {stockMethodOptions.map((option) => {
              const active = stockMethod === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setStockMethod(option.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormField>
        <FormField label="Unit cost" style={styles.inputGroup}>
          <TextInput
            value={unitCost}
            onChangeText={setUnitCost}
            keyboardType="numeric"
            style={styles.input}
          />
        </FormField>
        <FormField label="Lead time (days)" style={styles.inputGroup}>
          <TextInput
            value={leadTime}
            onChangeText={setLeadTime}
            keyboardType="numeric"
            style={styles.input}
          />
        </FormField>
        {item.type === "material" ? (
          <>
            <FormField label="Yield (%)" style={styles.inputGroup}>
              <TextInput
                value={yieldPercent}
                onChangeText={setYieldPercent}
                keyboardType="numeric"
                style={styles.input}
              />
            </FormField>
            <FormField label="Scrap (%)" style={styles.inputGroup}>
              <TextInput
                value={scrapPercent}
                onChangeText={setScrapPercent}
                keyboardType="numeric"
                style={styles.input}
              />
            </FormField>
          </>
        ) : null}
        <FormField
          label="Approved vendors (max 3)"
          helper={suppliers.length === 0 ? "Add suppliers to select vendors." : undefined}
          style={styles.inputGroup}
        >
          {suppliers.length === 0 ? (
            <Text style={styles.mutedText}>No suppliers available.</Text>
          ) : (
            <View style={styles.chipRow}>
              {suppliers.map((supplier) => {
                const active = approvedSuppliers.includes(supplier.id);
                return (
                  <Pressable
                    key={supplier.id}
                    onPress={() => toggleSupplier(supplier.id)}
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
          )}
        </FormField>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.actionRow}>
        <Pressable
          onPress={handleSave}
          disabled={!hasChanges}
          style={[styles.primaryButton, !hasChanges && styles.disabledButton]}
        >
          <Text style={styles.primaryText}>Save changes</Text>
        </Pressable>
        <Pressable
          onPress={handleReset}
          disabled={!hasChanges}
          style={[styles.secondaryButton, !hasChanges && styles.disabledButton]}
        >
          <Text style={styles.secondaryText}>Reset</Text>
        </Pressable>
      </View>
    </Card>
  );
};

export default function ProductsScreen() {
  const canEdit = useCan("products.edit");
  const items = useAppStore((state) => state.items);
  const bomLines = useAppStore((state) => state.bomLines);
  const inventory = useAppStore((state) => state.inventory);
  const suppliers = useAppStore((state) => state.suppliers);
  const createItem = useAppStore((state) => state.createItem);
  const updateItem = useAppStore((state) => state.updateItem);
  const setBomLinesForProduct = useAppStore((state) => state.setBomLinesForProduct);

  const materials = useMemo(
    () => items.filter((item) => item.type === "material"),
    [items]
  );
  const finishedProducts = useMemo(
    () => items.filter((item) => item.type === "finished"),
    [items]
  );

  const [draftType, setDraftType] = useState<ItemType>("finished");
  const [draftSku, setDraftSku] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftClassification, setDraftClassification] =
    useState<ItemClassification>("consumable");
  const [draftCategoryGroup, setDraftCategoryGroup] = useState("");
  const [draftWorkStationName, setDraftWorkStationName] = useState("");
  const [draftCommodityCode, setDraftCommodityCode] = useState("");
  const [draftHsnNumber, setDraftHsnNumber] = useState("");
  const [draftOrigin, setDraftOrigin] = useState<ItemOrigin>("local");
  const [draftProductionType, setDraftProductionType] =
    useState<ItemProductionType>("production");
  const [draftStatus, setDraftStatus] = useState<ItemStatus>("active");
  const [draftBarcode, setDraftBarcode] = useState("");
  const [draftImageUri, setDraftImageUri] = useState("");
  const [draftUom, setDraftUom] = useState("unit");
  const [draftReorder, setDraftReorder] = useState("0");
  const [draftSafety, setDraftSafety] = useState("0");
  const [draftReorderQty, setDraftReorderQty] = useState("0");
  const [draftMinStock, setDraftMinStock] = useState("0");
  const [draftMaxStock, setDraftMaxStock] = useState("0");
  const [draftStockMethod, setDraftStockMethod] = useState<StockMethod>("fifo");
  const [draftUnitCost, setDraftUnitCost] = useState("0");
  const [draftLeadTime, setDraftLeadTime] = useState("0");
  const [draftYield, setDraftYield] = useState("100");
  const [draftScrap, setDraftScrap] = useState("0");
  const [draftBomLines, setDraftBomLines] = useState<BomDraftLine[]>([]);
  const [draftApprovedSuppliers, setDraftApprovedSuppliers] = useState<string[]>([]);
  const [createError, setCreateError] = useState("");
  const [createStatus, setCreateStatus] = useState("");

  const draftProductId = useRef(
    `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  );

  useEffect(() => {
    if (draftType === "material" && !draftUom.trim()) {
      setDraftUom("kg");
    }
    if (draftType === "finished" && !draftUom.trim()) {
      setDraftUom("unit");
    }
    if (draftType !== "finished") {
      setDraftBomLines([]);
    }
    if (draftType !== "material") {
      setDraftYield("100");
      setDraftScrap("0");
    }
  }, [draftType, draftUom]);

  const draftBomParse = useMemo(() => parseBomDrafts(draftBomLines), [draftBomLines]);

  const draftForecast = useMemo(() => {
    if (draftType !== "finished") {
      return null;
    }
    if (draftBomParse.errors.length > 0 || draftBomParse.lines.length === 0) {
      return null;
    }
    const draftProduct: Item = {
      id: draftProductId.current,
      sku: draftSku.trim() || "DRAFT-SKU",
      name: draftName.trim() || "Draft Product",
      type: "finished",
      uom: draftUom.trim() || "unit",
      reorderPoint: clampNonNegative(draftReorder),
      safetyStock: clampNonNegative(draftSafety),
      leadTimeDays: clampNonNegative(draftLeadTime),
      yieldPercent: 100,
      scrapPercent: 0
    };
    const combinedItems = [...items, draftProduct];
    const combinedBomLines: BOMLine[] = [
      ...bomLines,
      ...draftBomParse.lines.map((line, index) => ({
        id: `draft-${index}-${line.materialId}`,
        finishedProductId: draftProduct.id,
        materialId: line.materialId,
        qtyPerUnit: line.qtyPerUnit
      }))
    ];
    return (
      calculateForecast(combinedItems, combinedBomLines, inventory).find(
        (result) => result.productId === draftProduct.id
      ) ?? null
    );
  }, [
    draftType,
    draftBomParse,
    draftSku,
    draftName,
    draftUom,
    draftReorder,
    draftSafety,
    draftLeadTime,
    items,
    bomLines,
    inventory
  ]);

  const [selectedProductId, setSelectedProductId] = useState(
    finishedProducts[0]?.id ?? ""
  );
  const [bomDrafts, setBomDrafts] = useState<BomDraftLine[]>([]);
  const [bomErrors, setBomErrors] = useState<string[]>([]);
  const [bomDirty, setBomDirty] = useState(false);

  useEffect(() => {
    const [firstProduct] = finishedProducts;
    if (!selectedProductId && firstProduct) {
      setSelectedProductId(firstProduct.id);
    }
  }, [finishedProducts, selectedProductId]);

  useEffect(() => {
    if (!selectedProductId) {
      setBomDrafts([]);
      setBomErrors([]);
      setBomDirty(false);
      return;
    }
    const lines = bomLines.filter((line) => line.finishedProductId === selectedProductId);
    setBomDrafts(
      lines.map((line) => ({
        id: line.id,
        materialId: line.materialId,
        qtyPerUnit: String(line.qtyPerUnit)
      }))
    );
    setBomErrors([]);
    setBomDirty(false);
  }, [bomLines, selectedProductId]);

  const bomParse = useMemo(() => parseBomDrafts(bomDrafts), [bomDrafts]);

  const selectedProduct = finishedProducts.find(
    (product) => product.id === selectedProductId
  );

  const bomForecast = useMemo(() => {
    if (!selectedProduct) {
      return null;
    }
    if (bomParse.errors.length > 0 || bomParse.lines.length === 0) {
      return null;
    }
    const previewLines: BOMLine[] = [
      ...bomLines.filter((line) => line.finishedProductId !== selectedProductId),
      ...bomParse.lines.map((line, index) => ({
        id: `preview-${index}-${line.materialId}`,
        finishedProductId: selectedProductId,
        materialId: line.materialId,
        qtyPerUnit: line.qtyPerUnit
      }))
    ];
    return (
      calculateForecast(items, previewLines, inventory).find(
        (result) => result.productId === selectedProductId
      ) ?? null
    );
  }, [selectedProduct, bomParse, bomLines, selectedProductId, items, inventory]);

  if (!canEdit) {
    return (
      <Screen>
        <SectionHeader title="Product Master Data" subtitle="Role-based access enforced." />
        <AccessDenied />
      </Screen>
    );
  }

  const toggleDraftSupplier = (supplierId: string) => {
    setDraftApprovedSuppliers((prev) => {
      if (prev.includes(supplierId)) {
        return prev.filter((id) => id !== supplierId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, supplierId];
    });
  };

  const handleCreate = () => {
    const nextSku = draftSku.trim();
    const nextName = draftName.trim();
    const nextUom = draftUom.trim();
    if (!nextSku || !nextName || !nextUom) {
      setCreateError("SKU, name, and UOM are required.");
      setCreateStatus("");
      return;
    }
    if (items.some((item) => item.sku.trim().toLowerCase() === nextSku.toLowerCase())) {
      setCreateError("This SKU already exists.");
      setCreateStatus("");
      return;
    }
    const nextHsnNumber = draftHsnNumber.trim();
    const nextMinStock = clampNonNegative(draftMinStock);
    const nextMaxStock = clampNonNegative(draftMaxStock);
    if (nextHsnNumber && !isValidHsn(nextHsnNumber)) {
      setCreateError("HSN must be 4-8 digits.");
      setCreateStatus("");
      return;
    }
    if (nextMinStock > nextMaxStock) {
      setCreateError("Min stock cannot exceed max stock.");
      setCreateStatus("");
      return;
    }
    if (draftType === "finished") {
      if (draftBomParse.errors.length > 0) {
        setCreateError(draftBomParse.errors[0] ?? "Invalid BOM data.");
        setCreateStatus("");
        return;
      }
      if (draftBomParse.lines.length === 0) {
        setCreateError("Add at least one material to the BOM.");
        setCreateStatus("");
        return;
      }
    }

    const payload: Omit<Item, "id"> = {
      sku: nextSku,
      name: nextName,
      description: draftDescription.trim(),
      type: draftType,
      classification: draftClassification,
      categoryGroup: draftCategoryGroup.trim(),
      workStationName: draftWorkStationName.trim(),
      commodityCode: draftCommodityCode.trim(),
      hsnNumber: nextHsnNumber,
      origin: draftOrigin,
      productionType: draftProductionType,
      status: draftStatus,
      barcode: draftBarcode.trim(),
      imageUri: draftImageUri.trim() || undefined,
      uom: nextUom,
      reorderPoint: clampNonNegative(draftReorder),
      safetyStock: clampNonNegative(draftSafety),
      reorderQuantity: clampNonNegative(draftReorderQty),
      minStock: nextMinStock,
      maxStock: nextMaxStock,
      stockMethod: draftStockMethod,
      unitCost: clampNonNegative(draftUnitCost),
      leadTimeDays: clampNonNegative(draftLeadTime),
      yieldPercent: draftType === "material" ? clampPercent(draftYield) : 100,
      scrapPercent: draftType === "material" ? clampPercent(draftScrap) : 0,
      approvedSupplierIds: draftApprovedSuppliers
    };
    const newId = createItem(payload);
    if (draftType === "finished") {
      setBomLinesForProduct(newId, draftBomParse.lines);
      setSelectedProductId(newId);
    }
    setCreateError("");
    setCreateStatus(`Created ${nextName}.`);
    setDraftSku("");
    setDraftName("");
    setDraftDescription("");
    setDraftClassification("consumable");
    setDraftCategoryGroup("");
    setDraftWorkStationName("");
    setDraftCommodityCode("");
    setDraftHsnNumber("");
    setDraftOrigin("local");
    setDraftProductionType("production");
    setDraftStatus("active");
    setDraftBarcode("");
    setDraftImageUri("");
    setDraftReorder("0");
    setDraftSafety("0");
    setDraftReorderQty("0");
    setDraftMinStock("0");
    setDraftMaxStock("0");
    setDraftStockMethod("fifo");
    setDraftUnitCost("0");
    setDraftLeadTime("0");
    setDraftYield("100");
    setDraftScrap("0");
    setDraftBomLines([]);
    setDraftApprovedSuppliers([]);
  };

  const handleSaveBom = () => {
    if (!selectedProductId) {
      return;
    }
    if (bomParse.errors.length > 0) {
      setBomErrors(bomParse.errors);
      return;
    }
    if (bomParse.lines.length === 0) {
      setBomErrors(["Add at least one material to the BOM."]);
      return;
    }
    setBomLinesForProduct(selectedProductId, bomParse.lines);
    setBomErrors([]);
    setBomDirty(false);
  };

  const handleResetBom = () => {
    if (!selectedProductId) {
      return;
    }
    const lines = bomLines.filter((line) => line.finishedProductId === selectedProductId);
    setBomDrafts(
      lines.map((line) => ({
        id: line.id,
        materialId: line.materialId,
        qtyPerUnit: String(line.qtyPerUnit)
      }))
    );
    setBomErrors([]);
    setBomDirty(false);
  };

  return (
    <Screen>
      <SectionHeader
        title="Product Master Data"
        subtitle="Create products, manage BOMs, and edit thresholds."
      />
      <AdminTabs />

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Create new item</Text>
        <Text style={styles.sectionSubtitle}>
          Add finished products or raw materials with full production detail.
        </Text>
        <Text style={styles.label}>Type</Text>
        <View style={styles.chipRow}>
          {(["finished", "material"] as ItemType[]).map((type) => {
            const active = draftType === type;
            return (
              <Pressable
                key={type}
                onPress={() => setDraftType(type)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {type === "finished" ? "Finished Product" : "Raw Material"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.formGrid}>
          <FormField label="Item code" style={styles.field}>
            <TextInput
              value={draftSku}
              onChangeText={setDraftSku}
              placeholder="Item code / SKU"
              placeholderTextColor={theme.colors.inkSubtle}
              autoCapitalize="characters"
              style={styles.input}
            />
          </FormField>
          <FormField label="Item name" style={styles.field}>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Product name"
              placeholderTextColor={theme.colors.inkSubtle}
              style={styles.input}
            />
          </FormField>
          <FormField label="Description" style={styles.field}>
            <TextInput
              value={draftDescription}
              onChangeText={setDraftDescription}
              placeholder="Item description"
              placeholderTextColor={theme.colors.inkSubtle}
              style={styles.input}
            />
          </FormField>
          <FormField label="UOM" style={styles.field}>
            <TextInput
              value={draftUom}
              onChangeText={setDraftUom}
              placeholder="unit, kg, m"
              placeholderTextColor={theme.colors.inkSubtle}
              style={styles.input}
            />
          </FormField>
          <FormField label="Category / Group" style={styles.field}>
            <TextInput
              value={draftCategoryGroup}
              onChangeText={setDraftCategoryGroup}
              placeholder="Assembly line - Engine"
              placeholderTextColor={theme.colors.inkSubtle}
              style={styles.input}
            />
          </FormField>
          <FormField label="Work station name" style={styles.field}>
            <TextInput
              value={draftWorkStationName}
              onChangeText={setDraftWorkStationName}
              placeholder="Work station"
              placeholderTextColor={theme.colors.inkSubtle}
              style={styles.input}
            />
          </FormField>
          <FormField label="Commodity code" style={styles.field}>
            <TextInput
              value={draftCommodityCode}
              onChangeText={setDraftCommodityCode}
              placeholder="Commodity code"
              placeholderTextColor={theme.colors.inkSubtle}
              style={styles.input}
            />
          </FormField>
          <FormField label="HSN number" style={styles.field}>
            <TextInput
              value={draftHsnNumber}
              onChangeText={setDraftHsnNumber}
              placeholder="HSN"
              placeholderTextColor={theme.colors.inkSubtle}
              style={styles.input}
            />
          </FormField>
          <FormField label="Barcode / QR" style={styles.field}>
            <TextInput
              value={draftBarcode}
              onChangeText={setDraftBarcode}
              placeholder="Barcode or QR"
              placeholderTextColor={theme.colors.inkSubtle}
              style={styles.input}
            />
          </FormField>
          <FormField label="Item image (URL or local)" style={styles.field}>
            <View style={styles.imageRow}>
              <TextInput
                value={draftImageUri}
                onChangeText={setDraftImageUri}
                placeholder="https:// or pick an image"
                placeholderTextColor={theme.colors.inkSubtle}
                autoCapitalize="none"
                style={[styles.input, styles.imageInput]}
              />
              <View style={styles.imageActions}>
                <Pressable
                  onPress={() =>
                    pickItemImageFromLibrary(setDraftImageUri, (message) => {
                      setCreateError(message);
                      setCreateStatus("");
                    })
                  }
                  style={styles.ghostButton}
                >
                  <Text style={styles.ghostText}>Choose image</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    pickItemImageFromCamera(setDraftImageUri, (message) => {
                      setCreateError(message);
                      setCreateStatus("");
                    })
                  }
                  style={styles.ghostButton}
                >
                  <Text style={styles.ghostText}>Take photo</Text>
                </Pressable>
                {draftImageUri.trim() ? (
                  <Pressable onPress={() => setDraftImageUri("")} style={styles.ghostButton}>
                    <Text style={styles.ghostText}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            {draftImageUri.trim() ? (
              <Image source={{ uri: draftImageUri.trim() }} style={styles.imagePreview} />
            ) : null}
          </FormField>
          <FormField label="Reorder point" style={styles.field}>
            <TextInput
              value={draftReorder}
              onChangeText={setDraftReorder}
              keyboardType="numeric"
              style={styles.input}
            />
          </FormField>
          <FormField label="Safety stock" style={styles.field}>
            <TextInput
              value={draftSafety}
              onChangeText={setDraftSafety}
              keyboardType="numeric"
              style={styles.input}
            />
          </FormField>
          <FormField label="Reorder quantity" style={styles.field}>
            <TextInput
              value={draftReorderQty}
              onChangeText={setDraftReorderQty}
              keyboardType="numeric"
              style={styles.input}
            />
          </FormField>
          <FormField label="Min stock" style={styles.field}>
            <TextInput
              value={draftMinStock}
              onChangeText={setDraftMinStock}
              keyboardType="numeric"
              style={styles.input}
            />
          </FormField>
          <FormField label="Max stock" style={styles.field}>
            <TextInput
              value={draftMaxStock}
              onChangeText={setDraftMaxStock}
              keyboardType="numeric"
              style={styles.input}
            />
          </FormField>
          <FormField label="Unit cost" style={styles.field}>
            <TextInput
              value={draftUnitCost}
              onChangeText={setDraftUnitCost}
              keyboardType="numeric"
              style={styles.input}
            />
          </FormField>
          <FormField label="Lead time (days)" style={styles.field}>
            <TextInput
              value={draftLeadTime}
              onChangeText={setDraftLeadTime}
              keyboardType="numeric"
              style={styles.input}
            />
          </FormField>
          {draftType === "material" ? (
            <>
              <FormField label="Yield (%)" style={styles.field}>
                <TextInput
                  value={draftYield}
                  onChangeText={setDraftYield}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </FormField>
              <FormField label="Scrap (%)" style={styles.field}>
                <TextInput
                  value={draftScrap}
                  onChangeText={setDraftScrap}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </FormField>
            </>
          ) : null}
        </View>

        <Text style={styles.label}>Classification</Text>
        <View style={styles.chipRow}>
          {classificationOptions.map((option) => {
            const active = draftClassification === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setDraftClassification(option.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Origin</Text>
        <View style={styles.chipRow}>
          {originOptions.map((option) => {
            const active = draftOrigin === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setDraftOrigin(option.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Production type</Text>
        <View style={styles.chipRow}>
          {productionOptions.map((option) => {
            const active = draftProductionType === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setDraftProductionType(option.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Status</Text>
        <View style={styles.chipRow}>
          {statusOptions.map((option) => {
            const active = draftStatus === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setDraftStatus(option.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Stock method</Text>
        <View style={styles.chipRow}>
          {stockMethodOptions.map((option) => {
            const active = draftStockMethod === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setDraftStockMethod(option.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Approved vendors (max 3)</Text>
        {suppliers.length === 0 ? (
          <Text style={styles.mutedText}>Add suppliers to select vendors.</Text>
        ) : (
          <View style={styles.chipRow}>
            {suppliers.map((supplier) => {
              const active = draftApprovedSuppliers.includes(supplier.id);
              return (
                <Pressable
                  key={supplier.id}
                  onPress={() => toggleDraftSupplier(supplier.id)}
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
        )}

        {draftType === "finished" ? (
          <View style={styles.bomSection}>
            <Text style={styles.sectionLabel}>Bill of Materials</Text>
            <Text style={styles.sectionSubtitle}>
              Select raw materials and quantities used per finished unit.
            </Text>
            {draftBomLines.length === 0 ? (
              <Text style={styles.mutedText}>No BOM lines yet. Add materials below.</Text>
            ) : null}
            {draftBomLines.map((line, index) => (
              <View key={line.id} style={styles.bomLine}>
                <View style={styles.bomHeader}>
                  <Text style={styles.bomTitle}>Line {index + 1}</Text>
                  <Pressable
                    onPress={() => {
                      setDraftBomLines((prev) => prev.filter((entry) => entry.id !== line.id));
                    }}
                    style={styles.ghostButton}
                  >
                    <Text style={styles.ghostText}>Remove</Text>
                  </Pressable>
                </View>
                <Text style={styles.label}>Material</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {materials.map((material) => {
                      const active = material.id === line.materialId;
                      return (
                        <Pressable
                          key={material.id}
                          onPress={() => {
                            setDraftBomLines((prev) =>
                              prev.map((entry) =>
                                entry.id === line.id
                                  ? { ...entry, materialId: material.id }
                                  : entry
                              )
                            );
                          }}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {material.sku}
                          </Text>
                          <Text style={[styles.chipSub, active && styles.chipSubActive]}>
                            {material.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
                <FormField label="Qty per unit" style={styles.field}>
                  <TextInput
                    value={line.qtyPerUnit}
                    onChangeText={(value) =>
                      setDraftBomLines((prev) =>
                        prev.map((entry) =>
                          entry.id === line.id ? { ...entry, qtyPerUnit: value } : entry
                        )
                      )
                    }
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </FormField>
              </View>
            ))}
            <Pressable
              onPress={() => setDraftBomLines((prev) => [...prev, makeDraftLine()])}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>Add material line</Text>
            </Pressable>
            {draftBomParse.errors.length > 0 ? (
              <View style={styles.notice}>
                <Text style={styles.errorText}>{draftBomParse.errors[0]}</Text>
              </View>
            ) : null}
            <View style={styles.availabilityCard}>
              <Text style={styles.sectionLabel}>Availability preview</Text>
              {draftForecast ? (
                <>
                  <View style={styles.availabilityRow}>
                    <View>
                      <Text style={styles.availabilityValue}>
                        {formatNumber(draftForecast.maxUnits)}
                      </Text>
                      <Text style={styles.availabilityLabel}>max units possible</Text>
                    </View>
                    <View>
                      <Text style={styles.availabilityMeta}>
                        Bottleneck: {draftForecast.bottleneckMaterialName ?? "None"}
                      </Text>
                    </View>
                  </View>
                  {draftForecast.warnings.length > 0 ? (
                    <View style={styles.warningStack}>
                      {draftForecast.warnings.map((warning, idx) => (
                        <Tag key={`${warning}-${idx}`} label={warning} tone="warning" />
                      ))}
                    </View>
                  ) : (
                    <Tag label="All materials within thresholds" tone="success" />
                  )}
                </>
              ) : (
                <Text style={styles.mutedText}>
                  Complete BOM lines to see max producible units.
                </Text>
              )}
            </View>
          </View>
        ) : null}

        {createError ? <Text style={styles.errorText}>{createError}</Text> : null}
        {createStatus ? <Text style={styles.successText}>{createStatus}</Text> : null}
        <Pressable
          onPress={handleCreate}
          style={styles.primaryButton}
          accessibilityRole="button"
          accessibilityLabel="Create item"
        >
          <Text style={styles.primaryText}>Create item</Text>
        </Pressable>
      </Card>

      <SectionHeader title="BOM Manager" subtitle="Edit material usage for finished goods." />
      <Card style={styles.card}>
        {finishedProducts.length === 0 ? (
          <Text style={styles.mutedText}>No finished products available.</Text>
        ) : (
          <>
            <Text style={styles.label}>Finished product</Text>
            <View style={styles.chipRow}>
              {finishedProducts.map((product) => {
                const active = product.id === selectedProductId;
                return (
                  <Pressable
                    key={product.id}
                    onPress={() => setSelectedProductId(product.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {product.sku}
                    </Text>
                    <Text style={[styles.chipSub, active && styles.chipSubActive]}>
                      {product.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {bomDrafts.length === 0 ? (
              <Text style={styles.mutedText}>No BOM lines. Add materials below.</Text>
            ) : null}
            {bomDrafts.map((line, index) => (
              <View key={line.id} style={styles.bomLine}>
                <View style={styles.bomHeader}>
                  <Text style={styles.bomTitle}>Line {index + 1}</Text>
                  <Pressable
                    onPress={() => {
                      setBomDrafts((prev) => prev.filter((entry) => entry.id !== line.id));
                      setBomDirty(true);
                    }}
                    style={styles.ghostButton}
                  >
                    <Text style={styles.ghostText}>Remove</Text>
                  </Pressable>
                </View>
                <Text style={styles.label}>Material</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {materials.map((material) => {
                      const active = material.id === line.materialId;
                      return (
                        <Pressable
                          key={material.id}
                          onPress={() => {
                            setBomDrafts((prev) =>
                              prev.map((entry) =>
                                entry.id === line.id
                                  ? { ...entry, materialId: material.id }
                                  : entry
                              )
                            );
                            setBomDirty(true);
                          }}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {material.sku}
                          </Text>
                          <Text style={[styles.chipSub, active && styles.chipSubActive]}>
                            {material.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
                <FormField label="Qty per unit" style={styles.field}>
                  <TextInput
                    value={line.qtyPerUnit}
                    onChangeText={(value) => {
                      setBomDrafts((prev) =>
                        prev.map((entry) =>
                          entry.id === line.id ? { ...entry, qtyPerUnit: value } : entry
                        )
                      );
                      setBomDirty(true);
                    }}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </FormField>
              </View>
            ))}
            <Pressable
              onPress={() => {
                setBomDrafts((prev) => [...prev, makeDraftLine()]);
                setBomDirty(true);
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>Add material line</Text>
            </Pressable>

            {bomErrors.length > 0 ? (
              <View style={styles.notice}>
                <Text style={styles.errorText}>{bomErrors[0]}</Text>
              </View>
            ) : null}

            <View style={styles.availabilityCard}>
              <Text style={styles.sectionLabel}>Availability preview</Text>
              {bomForecast ? (
                <>
                  <View style={styles.availabilityRow}>
                    <View>
                      <Text style={styles.availabilityValue}>
                        {formatNumber(bomForecast.maxUnits)}
                      </Text>
                      <Text style={styles.availabilityLabel}>max units possible</Text>
                    </View>
                    <View>
                      <Text style={styles.availabilityMeta}>
                        Bottleneck: {bomForecast.bottleneckMaterialName ?? "None"}
                      </Text>
                    </View>
                  </View>
                  {bomForecast.warnings.length > 0 ? (
                    <View style={styles.warningStack}>
                      {bomForecast.warnings.map((warning, idx) => (
                        <Tag key={`${warning}-${idx}`} label={warning} tone="warning" />
                      ))}
                    </View>
                  ) : (
                    <Tag label="All materials within thresholds" tone="success" />
                  )}
                </>
              ) : (
                <Text style={styles.mutedText}>
                  Complete BOM lines to see max producible units.
                </Text>
              )}
            </View>

            <View style={styles.actionRow}>
              <Pressable
                onPress={handleSaveBom}
                disabled={!bomDirty}
                style={[styles.primaryButton, !bomDirty && styles.disabledButton]}
              >
                <Text style={styles.primaryText}>Save BOM</Text>
              </Pressable>
              <Pressable
                onPress={handleResetBom}
                disabled={!bomDirty}
                style={[styles.secondaryButton, !bomDirty && styles.disabledButton]}
              >
                <Text style={styles.secondaryText}>Reset</Text>
              </Pressable>
            </View>
          </>
        )}
      </Card>

      <SectionHeader
        title="Existing Items"
        subtitle="Edit thresholds, lead times, and master data."
      />
      <View style={styles.stack}>
        {items.map((item) => (
          <ItemEditor
            key={item.id}
            item={item}
            suppliers={suppliers}
            onUpdate={(patch) => updateItem(item.id, patch)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.lg
  },
  stack: {
    gap: theme.spacing.md
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  itemInfo: {
    flex: 1,
    marginRight: theme.spacing.md
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.ink
  },
  itemSku: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.inkSubtle
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.inkSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs
  },
  inputs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    marginTop: theme.spacing.md
  },
  inputGroup: {
    flex: 1,
    minWidth: 160
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.inkSubtle,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface
  },
  imageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flexWrap: "wrap"
  },
  imageActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flexWrap: "wrap"
  },
  imageInput: {
    flex: 1,
    minWidth: 200
  },
  imagePreview: {
    marginTop: theme.spacing.sm,
    width: 120,
    height: 120,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  field: {
    flex: 1,
    minWidth: 180
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md
  },
  chip: {
    paddingHorizontal: 10,
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
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.inkSubtle
  },
  chipTextActive: {
    color: theme.colors.accentDark,
    fontWeight: "700"
  },
  chipSub: {
    fontSize: 10,
    color: theme.colors.inkSubtle
  },
  chipSubActive: {
    color: theme.colors.accentDark
  },
  bomSection: {
    marginTop: theme.spacing.md
  },
  bomLine: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface
  },
  bomHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm
  },
  bomTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.ink
  },
  availabilityCard: {
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.sm
  },
  availabilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: theme.spacing.xs
  },
  availabilityValue: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.accentDark
  },
  availabilityLabel: {
    fontSize: 11,
    color: theme.colors.inkSubtle
  },
  availabilityMeta: {
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  warningStack: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs
  },
  mutedText: {
    fontSize: 12,
    color: theme.colors.inkSubtle,
    marginBottom: theme.spacing.sm
  },
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    flexWrap: "wrap"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm
  },
  secondaryText: {
    color: theme.colors.ink,
    fontWeight: "600"
  },
  disabledButton: {
    opacity: 0.5
  },
  ghostButton: {
    alignSelf: "flex-start"
  },
  ghostText: {
    color: theme.colors.accentDark,
    fontWeight: "700"
  },
  notice: {
    marginTop: theme.spacing.sm
  },
  errorText: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.danger
  },
  successText: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.success
  }
});
