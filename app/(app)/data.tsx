import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { Card } from "../../src/components/Card";
import { AccessDenied } from "../../src/components/AccessDenied";
import { FormField } from "../../src/components/FormField";
import { Button } from "../../src/components/Button";
import { theme } from "../../src/theme";
import { useAppStore } from "../../src/store/useAppStore";
import {
  AvailabilityStatus,
  CheckStatus,
  ContractDuration,
  ContractType,
  InspectionMethod,
  Item,
  ItemClassification,
  ItemOrigin,
  ItemProductionType,
  ItemStatus,
  ItemType,
  KPI,
  MaterialReceiptRecord,
  MaterialUsageRecord,
  QcInspection,
  QcResult,
  SalesRecord,
  StockMethod,
  Supplier,
  SupplierOrigin
} from "../../src/types";
import { toCsv, parseCsv } from "../../src/lib/csv";
import { useCan } from "../../src/hooks/useCurrentUser";

const copyToClipboard = async (text: string) => {
  try {
    const nav =
      typeof globalThis !== "undefined" &&
      typeof (globalThis as { navigator?: { clipboard?: { writeText?: (t: string) => Promise<void> } } }).navigator !==
        "undefined"
        ? (globalThis as {
            navigator?: { clipboard?: { writeText?: (t: string) => Promise<void> } };
          }).navigator
        : undefined;
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      Alert.alert("Copied", "CSV data copied to clipboard.");
      return;
    }
  } catch {
    // fallback below
  }
  Alert.alert("Copy failed", "Clipboard access not available on this device.");
};

const parseBomCsv = (raw: string, items: Item[]) => {
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    return { lines: [], errors: ["CSV is empty."] };
  }
  const header = rows[0] ?? [];
  const dataRows = header.some((cell) => cell.toLowerCase().includes("sku"))
    ? rows.slice(1)
    : rows;

  const itemBySku = new Map(
    items.map((item) => [item.sku.toLowerCase(), item])
  );
  const errors: string[] = [];
  const lines = dataRows.map((row, index) => {
    const finishedSku = (row[0] ?? "").trim().toLowerCase();
    const materialSku = (row[1] ?? "").trim().toLowerCase();
    const qtyRaw = row[2] ?? "0";
    const qty = Number(qtyRaw);
    const finished = itemBySku.get(finishedSku);
    const material = itemBySku.get(materialSku);
    if (!finished || !material) {
      errors.push(`Row ${index + 1}: Unknown SKU.`);
    }
    return {
      id: `bom-import-${index + 1}`,
      finishedProductId: finished?.id ?? "",
      materialId: material?.id ?? "",
      qtyPerUnit: Number.isNaN(qty) ? 0 : qty
    };
  });

  const validLines = lines.filter(
    (line) => line.finishedProductId && line.materialId && line.qtyPerUnit > 0
  );
  return { lines: validLines, errors };
};

const parseKpiCsv = (raw: string): KPI[] => {
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    return [];
  }
  const header = rows[0] ?? [];
  const dataRows = header.some((cell) => cell.toLowerCase().includes("label"))
    ? rows.slice(1)
    : rows;
  return dataRows
    .filter((row) => row.length >= 3)
    .map((row, index) => ({
      id: `kpi-${index + 1}`,
      label: row[0] ?? "KPI",
      value: Number.isNaN(Number(row[1])) ? 0 : Number(row[1]),
      unit: row[2] ?? "",
      delta: Number.isNaN(Number(row[3])) ? 0 : Number(row[3])
    }));
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isPositiveNumber = (value: string) =>
  Number.isFinite(Number(value)) && Number(value) > 0;
const normalizeToken = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "_");
const parseEnum = <T extends string>(value: string, options: readonly T[]) => {
  const token = normalizeToken(value);
  return options.find((option) => option === token);
};
const parseBoolean = (value: string): boolean | undefined => {
  const token = normalizeToken(value);
  if (["true", "yes", "1", "active"].includes(token)) return true;
  if (["false", "no", "0", "inactive"].includes(token)) return false;
  return undefined;
};
const parseNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : undefined;
};
const parseInteger = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return undefined;
  return Math.trunc(num);
};
const normalizeHeader = (value: string) => value.trim().toLowerCase();
const buildHeaderMap = (header: string[]) =>
  new Map(header.map((cell, index) => [normalizeHeader(cell), index]));
const readCell = (
  row: string[],
  headerMap: Map<string, number>,
  hasHeader: boolean,
  keys: string[],
  fallbackIndex?: number
) => {
  if (hasHeader) {
    for (const key of keys) {
      const index = headerMap.get(key);
      if (index !== undefined) {
        return { value: row[index] ?? "", present: true };
      }
    }
    return { value: "", present: false };
  }
  if (typeof fallbackIndex === "number") {
    return { value: row[fallbackIndex] ?? "", present: true };
  }
  return { value: "", present: false };
};
const splitList = (value: string) =>
  value
    .split(/[|;]/)
    .flatMap((part) => part.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
const stripUndefined = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;

const itemTypeOptions: ItemType[] = ["material", "finished"];
const itemClassificationOptions: ItemClassification[] = [
  "high_cost",
  "wear_out",
  "consumable",
  "spare_part",
  "long_lead"
];
const itemOriginOptions: ItemOrigin[] = ["local", "imported"];
const itemProductionOptions: ItemProductionType[] = ["production", "non_production"];
const itemStatusOptions: ItemStatus[] = ["active", "inactive"];
const stockMethodOptions: StockMethod[] = ["fifo", "lifo"];
const supplierOriginOptions: SupplierOrigin[] = ["local", "abroad"];
const contractTypeOptions: ContractType[] = ["one_time", "blanket"];
const contractDurationOptions: ContractDuration[] = ["1_year", "2_year", "3_year"];
const availabilityOptions: AvailabilityStatus[] = ["available", "not_available"];
const checkOptions: CheckStatus[] = ["completed", "not_completed"];
const inspectionMethodOptions: InspectionMethod[] = [
  "visual",
  "destructive",
  "non_destructive"
];
const qcResultOptions: QcResult[] = ["pass", "hold", "fail"];

const parseSalesCsv = (raw: string, items: Item[]) => {
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    return { records: [], errors: ["CSV is empty."] };
  }
  const header = rows[0] ?? [];
  const dataRows =
    header.some((cell) => cell.toLowerCase().includes("sku")) ||
    header.some((cell) => cell.toLowerCase().includes("date"))
      ? rows.slice(1)
      : rows;
  const itemBySku = new Map(
    items.map((item) => [item.sku.toLowerCase(), item])
  );
  const errors: string[] = [];
  const records: SalesRecord[] = dataRows.map((row, index) => {
    const date = (row[0] ?? "").trim();
    const sku = (row[1] ?? "").trim().toLowerCase();
    const qtyRaw = row[2] ?? "0";
    const priceRaw = row[3] ?? "";
    const qty = Number(qtyRaw);
    const unitPrice = priceRaw ? Number(priceRaw) : undefined;
    const item = itemBySku.get(sku);
    if (!item || !isIsoDate(date) || Number.isNaN(qty) || qty <= 0) {
      errors.push(`Row ${index + 1}: Invalid sales record.`);
    }
    return {
      id: `sale-import-${index + 1}`,
      itemId: item?.id ?? "",
      date,
      qty: Number.isNaN(qty) ? 0 : qty,
      unitPrice: Number.isNaN(unitPrice ?? 0) ? undefined : unitPrice
    };
  });
  return {
    records: records.filter((record) => record.itemId && record.qty > 0 && isIsoDate(record.date)),
    errors
  };
};

const parseMaterialUsageCsv = (raw: string, items: Item[]) => {
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    return { records: [], errors: ["CSV is empty."] };
  }
  const header = rows[0] ?? [];
  const dataRows =
    header.some((cell) => cell.toLowerCase().includes("sku")) ||
    header.some((cell) => cell.toLowerCase().includes("date"))
      ? rows.slice(1)
      : rows;
  const itemBySku = new Map(
    items.map((item) => [item.sku.toLowerCase(), item])
  );
  const errors: string[] = [];
  const records: MaterialUsageRecord[] = dataRows.map((row, index) => {
    const date = (row[0] ?? "").trim();
    const sku = (row[1] ?? "").trim().toLowerCase();
    const qtyRaw = row[2] ?? "0";
    const qtyUsed = Number(qtyRaw);
    const item = itemBySku.get(sku);
    if (!item || item.type !== "material" || !isIsoDate(date) || Number.isNaN(qtyUsed)) {
      errors.push(`Row ${index + 1}: Invalid material usage.`);
    }
    return {
      id: `usage-import-${index + 1}`,
      materialId: item?.id ?? "",
      date,
      qtyUsed: Number.isNaN(qtyUsed) ? 0 : qtyUsed
    };
  });
  return {
    records: records.filter(
      (record) => record.materialId && record.qtyUsed > 0 && isIsoDate(record.date)
    ),
    errors
  };
};

const parseMaterialReceiptsCsv = (raw: string, items: Item[]) => {
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    return { records: [], errors: ["CSV is empty."] };
  }
  const header = rows[0] ?? [];
  const dataRows =
    header.some((cell) => cell.toLowerCase().includes("sku")) ||
    header.some((cell) => cell.toLowerCase().includes("date"))
      ? rows.slice(1)
      : rows;
  const itemBySku = new Map(
    items.map((item) => [item.sku.toLowerCase(), item])
  );
  const errors: string[] = [];
  const records: MaterialReceiptRecord[] = dataRows.map((row, index) => {
    const date = (row[0] ?? "").trim();
    const sku = (row[1] ?? "").trim().toLowerCase();
    const qtyRaw = row[2] ?? "0";
    const supplier = (row[3] ?? "").trim();
    const qtyReceived = Number(qtyRaw);
    const item = itemBySku.get(sku);
    if (!item || item.type !== "material" || !isIsoDate(date) || Number.isNaN(qtyReceived)) {
      errors.push(`Row ${index + 1}: Invalid material receipt.`);
    }
    return {
      id: `receipt-import-${index + 1}`,
      materialId: item?.id ?? "",
      date,
      qtyReceived: Number.isNaN(qtyReceived) ? 0 : qtyReceived,
      supplier: supplier || undefined
    };
  });
  return {
    records: records.filter(
      (record) => record.materialId && record.qtyReceived > 0 && isIsoDate(record.date)
    ),
    errors
  };
};

const parseItemsCsv = (raw: string, suppliers: Supplier[]) => {
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    return { records: [], errors: ["CSV is empty."] };
  }
  const header = rows[0] ?? [];
  const headerMap = buildHeaderMap(header);
  const hasHeader =
    headerMap.has("sku") ||
    headerMap.has("item_sku") ||
    headerMap.has("name") ||
    headerMap.has("item_name") ||
    headerMap.has("type") ||
    headerMap.has("item_type");
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const supplierByCode = new Map(
    suppliers.map((supplier) => [supplier.code.toLowerCase(), supplier])
  );
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const errors: string[] = [];
  const records: Omit<Item, "id">[] = [];

  dataRows.forEach((row, index) => {
    const skuCell = readCell(row, headerMap, hasHeader, ["sku", "item_sku"], 0);
    const nameCell = readCell(row, headerMap, hasHeader, ["name", "item_name"], 1);
    const typeCell = readCell(row, headerMap, hasHeader, ["type", "item_type"], 2);
    const uomCell = readCell(row, headerMap, hasHeader, ["uom", "unit"], 3);
    const descriptionCell = readCell(row, headerMap, hasHeader, ["description"], 4);
    const classificationCell = readCell(row, headerMap, hasHeader, ["classification"], 5);
    const categoryGroupCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["category_group", "category"],
      6
    );
    const workStationCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["work_station_name", "work_station"],
      7
    );
    const commodityCell = readCell(row, headerMap, hasHeader, ["commodity_code"], 8);
    const hsnCell = readCell(row, headerMap, hasHeader, ["hsn_number", "hsn"], 9);
    const originCell = readCell(row, headerMap, hasHeader, ["origin"], 10);
    const productionCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["production_type"],
      11
    );
    const statusCell = readCell(row, headerMap, hasHeader, ["status"], 12);
    const barcodeCell = readCell(row, headerMap, hasHeader, ["barcode"], 13);
    const imageCell = readCell(row, headerMap, hasHeader, ["image_uri", "image"], 14);
    const reorderCell = readCell(row, headerMap, hasHeader, ["reorder_point"], 15);
    const safetyCell = readCell(row, headerMap, hasHeader, ["safety_stock"], 16);
    const reorderQtyCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["reorder_quantity"],
      17
    );
    const minStockCell = readCell(row, headerMap, hasHeader, ["min_stock"], 18);
    const maxStockCell = readCell(row, headerMap, hasHeader, ["max_stock"], 19);
    const stockMethodCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["stock_method"],
      20
    );
    const unitCostCell = readCell(row, headerMap, hasHeader, ["unit_cost"], 21);
    const leadTimeCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["lead_time_days", "lead_time"],
      22
    );
    const yieldCell = readCell(row, headerMap, hasHeader, ["yield_percent", "yield"], 23);
    const scrapCell = readCell(row, headerMap, hasHeader, ["scrap_percent", "scrap"], 24);
    const approvedCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["approved_suppliers", "approved_supplier_codes", "approved_supplier_ids"],
      25
    );

    const sku = skuCell.value.trim();
    const name = nameCell.value.trim();
    const type = parseEnum(typeCell.value, itemTypeOptions);
    const uom = uomCell.value.trim();
    if (!sku || !name || !type || !uom) {
      errors.push(`Row ${index + 1}: SKU, name, type, and UOM are required.`);
      return;
    }

    const classification = classificationCell.value.trim()
      ? parseEnum(classificationCell.value, itemClassificationOptions)
      : undefined;
    if (classificationCell.value.trim() && !classification) {
      errors.push(`Row ${index + 1}: Invalid classification.`);
    }

    const origin = originCell.value.trim()
      ? parseEnum(originCell.value, itemOriginOptions)
      : undefined;
    if (originCell.value.trim() && !origin) {
      errors.push(`Row ${index + 1}: Invalid origin.`);
    }

    const productionType = productionCell.value.trim()
      ? parseEnum(productionCell.value, itemProductionOptions)
      : undefined;
    if (productionCell.value.trim() && !productionType) {
      errors.push(`Row ${index + 1}: Invalid production type.`);
    }

    const status = statusCell.value.trim()
      ? parseEnum(statusCell.value, itemStatusOptions)
      : undefined;
    if (statusCell.value.trim() && !status) {
      errors.push(`Row ${index + 1}: Invalid status.`);
    }

    const stockMethod = stockMethodCell.value.trim()
      ? parseEnum(stockMethodCell.value, stockMethodOptions)
      : undefined;
    if (stockMethodCell.value.trim() && !stockMethod) {
      errors.push(`Row ${index + 1}: Invalid stock method.`);
    }

    const reorderPoint =
      parseNumber(reorderCell.value.trim()) ?? 0;
    if (reorderCell.value.trim() && parseNumber(reorderCell.value.trim()) === undefined) {
      errors.push(`Row ${index + 1}: Invalid reorder point.`);
    }
    const safetyStock =
      parseNumber(safetyCell.value.trim()) ?? 0;
    if (safetyCell.value.trim() && parseNumber(safetyCell.value.trim()) === undefined) {
      errors.push(`Row ${index + 1}: Invalid safety stock.`);
    }
    const reorderQuantityValue = reorderQtyCell.value.trim()
      ? parseNumber(reorderQtyCell.value.trim())
      : undefined;
    if (reorderQtyCell.value.trim() && reorderQuantityValue === undefined) {
      errors.push(`Row ${index + 1}: Invalid reorder quantity.`);
    }
    const minStockValue = minStockCell.value.trim()
      ? parseNumber(minStockCell.value.trim())
      : undefined;
    if (minStockCell.value.trim() && minStockValue === undefined) {
      errors.push(`Row ${index + 1}: Invalid min stock.`);
    }
    const maxStockValue = maxStockCell.value.trim()
      ? parseNumber(maxStockCell.value.trim())
      : undefined;
    if (maxStockCell.value.trim() && maxStockValue === undefined) {
      errors.push(`Row ${index + 1}: Invalid max stock.`);
    }
    if (
      typeof minStockValue === "number" &&
      typeof maxStockValue === "number" &&
      minStockValue > maxStockValue
    ) {
      errors.push(`Row ${index + 1}: Min stock cannot exceed max stock.`);
    }

    const unitCostValue = unitCostCell.value.trim()
      ? parseNumber(unitCostCell.value.trim())
      : undefined;
    if (unitCostCell.value.trim() && unitCostValue === undefined) {
      errors.push(`Row ${index + 1}: Invalid unit cost.`);
    }

    const leadTimeDays = parseNumber(leadTimeCell.value.trim()) ?? 0;
    if (leadTimeCell.value.trim() && parseNumber(leadTimeCell.value.trim()) === undefined) {
      errors.push(`Row ${index + 1}: Invalid lead time.`);
    }

    const yieldPercent = parseNumber(yieldCell.value.trim()) ?? 100;
    if (yieldCell.value.trim() && parseNumber(yieldCell.value.trim()) === undefined) {
      errors.push(`Row ${index + 1}: Invalid yield percent.`);
    }

    const scrapPercent = parseNumber(scrapCell.value.trim()) ?? 0;
    if (scrapCell.value.trim() && parseNumber(scrapCell.value.trim()) === undefined) {
      errors.push(`Row ${index + 1}: Invalid scrap percent.`);
    }

    const hsnNumber = hsnCell.present ? hsnCell.value.trim() : undefined;
    if (hsnNumber && !/^\d{4,8}$/.test(hsnNumber)) {
      errors.push(`Row ${index + 1}: HSN must be 4-8 digits.`);
    }

    const approvedTokens = approvedCell.present ? splitList(approvedCell.value) : [];
    const approvedSupplierIds = approvedCell.present
      ? approvedTokens
          .map((token) => {
            const key = token.toLowerCase();
            return supplierByCode.get(key)?.id ?? supplierById.get(token)?.id ?? "";
          })
          .filter(Boolean)
          .slice(0, 3)
      : undefined;
    if (approvedCell.present) {
      const unknown = approvedTokens.filter((token) => {
        const key = token.toLowerCase();
        return !supplierByCode.has(key) && !supplierById.has(token);
      });
      if (unknown.length > 0) {
        errors.push(
          `Row ${index + 1}: Unknown approved suppliers: ${unknown.join(", ")}.`
        );
      }
    }

    const payload: Omit<Item, "id"> = {
      sku,
      name,
      type,
      uom,
      reorderPoint,
      safetyStock,
      leadTimeDays,
      yieldPercent: Math.max(0, Math.min(100, yieldPercent)),
      scrapPercent: Math.max(0, Math.min(100, scrapPercent)),
      ...stripUndefined({
        description: descriptionCell.present ? descriptionCell.value.trim() : undefined,
        classification,
        categoryGroup: categoryGroupCell.present
          ? categoryGroupCell.value.trim()
          : undefined,
        workStationName: workStationCell.present
          ? workStationCell.value.trim()
          : undefined,
        commodityCode: commodityCell.present ? commodityCell.value.trim() : undefined,
        hsnNumber,
        origin,
        productionType,
        status,
        barcode: barcodeCell.present ? barcodeCell.value.trim() : undefined,
        imageUri: imageCell.present ? imageCell.value.trim() : undefined,
        reorderQuantity: reorderQuantityValue,
        minStock: minStockValue,
        maxStock: maxStockValue,
        stockMethod,
        unitCost: unitCostValue,
        approvedSupplierIds
      })
    };

    records.push(payload);
  });

  return { records, errors };
};

const parseSuppliersCsv = (raw: string) => {
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    return { records: [], errors: ["CSV is empty."] };
  }
  const header = rows[0] ?? [];
  const headerMap = buildHeaderMap(header);
  const hasHeader =
    headerMap.has("code") ||
    headerMap.has("supplier_code") ||
    headerMap.has("name") ||
    headerMap.has("supplier_name");
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const errors: string[] = [];
  const records: Omit<Supplier, "id">[] = [];

  dataRows.forEach((row, index) => {
    const codeCell = readCell(row, headerMap, hasHeader, ["code", "supplier_code"], 0);
    const nameCell = readCell(row, headerMap, hasHeader, ["name", "supplier_name"], 1);
    const addressCell = readCell(row, headerMap, hasHeader, ["address"], 2);
    const contactCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["contact_number", "contact"],
      3
    );
    const emailCell = readCell(row, headerMap, hasHeader, ["email"], 4);
    const originCell = readCell(row, headerMap, hasHeader, ["origin"], 5);
    const incoCell = readCell(row, headerMap, hasHeader, ["inco_terms", "incoterms"], 6);
    const leadTimeCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["lead_time_days", "lead_time"],
      7
    );
    const moqCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["minimum_order_quantity", "moq"],
      8
    );
    const purchasePriceCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["purchase_unit_price"],
      9
    );
    const lastPriceCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["last_purchase_price"],
      10
    );
    const contractTypeCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["contract_type"],
      11
    );
    const contractDurationCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["contract_duration"],
      12
    );
    const activeCell = readCell(row, headerMap, hasHeader, ["active", "status"], 13);

    const code = codeCell.value.trim();
    const name = nameCell.value.trim();
    if (!code || !name) {
      errors.push(`Row ${index + 1}: Supplier name and code are required.`);
      return;
    }

    const origin = originCell.value.trim()
      ? parseEnum(originCell.value, supplierOriginOptions)
      : undefined;
    if (originCell.value.trim() && !origin) {
      errors.push(`Row ${index + 1}: Invalid supplier origin.`);
    }

    const contractType = contractTypeCell.value.trim()
      ? parseEnum(contractTypeCell.value, contractTypeOptions)
      : undefined;
    if (contractTypeCell.value.trim() && !contractType) {
      errors.push(`Row ${index + 1}: Invalid contract type.`);
    }

    const contractDuration = contractDurationCell.value.trim()
      ? parseEnum(contractDurationCell.value, contractDurationOptions)
      : undefined;
    if (contractDurationCell.value.trim() && !contractDuration) {
      errors.push(`Row ${index + 1}: Invalid contract duration.`);
    }

    const leadTimeDays = parseNumber(leadTimeCell.value.trim()) ?? 0;
    if (leadTimeCell.value.trim() && parseNumber(leadTimeCell.value.trim()) === undefined) {
      errors.push(`Row ${index + 1}: Invalid lead time.`);
    }

    const minimumOrderQuantity = parseNumber(moqCell.value.trim()) ?? 0;
    if (moqCell.value.trim() && parseNumber(moqCell.value.trim()) === undefined) {
      errors.push(`Row ${index + 1}: Invalid MOQ.`);
    }
    if (minimumOrderQuantity <= 0) {
      errors.push(`Row ${index + 1}: MOQ must be greater than 0.`);
      return;
    }

    const purchaseUnitPrice = parseNumber(purchasePriceCell.value.trim()) ?? 0;
    if (
      purchasePriceCell.value.trim() &&
      parseNumber(purchasePriceCell.value.trim()) === undefined
    ) {
      errors.push(`Row ${index + 1}: Invalid purchase unit price.`);
    }

    const lastPurchasePrice = parseNumber(lastPriceCell.value.trim()) ?? 0;
    if (
      lastPriceCell.value.trim() &&
      parseNumber(lastPriceCell.value.trim()) === undefined
    ) {
      errors.push(`Row ${index + 1}: Invalid last purchase price.`);
    }

    const active = activeCell.value.trim() ? parseBoolean(activeCell.value) : undefined;
    if (activeCell.value.trim() && active === undefined) {
      errors.push(`Row ${index + 1}: Invalid active flag.`);
    }

    const payload: Omit<Supplier, "id"> = {
      name,
      code,
      address: addressCell.present ? addressCell.value.trim() : "",
      contactNumber: contactCell.present ? contactCell.value.trim() : "",
      email: emailCell.present ? emailCell.value.trim() : "",
      origin: origin ?? "local",
      incoTerms: incoCell.present ? incoCell.value.trim() : "",
      leadTimeDays,
      minimumOrderQuantity,
      purchaseUnitPrice,
      lastPurchasePrice,
      contractType: contractType ?? "one_time",
      contractDuration: contractDuration ?? "1_year",
      active: active ?? true
    };

    records.push(payload);
  });

  return { records, errors };
};

const parseBatchCsv = (raw: string, items: Item[]) => {
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    return { records: [], errors: ["CSV is empty."] };
  }
  const header = rows[0] ?? [];
  const headerMap = buildHeaderMap(header);
  const hasHeader =
    headerMap.has("item_sku") ||
    headerMap.has("sku") ||
    headerMap.has("lot_code") ||
    headerMap.has("batch");
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const itemBySku = new Map(items.map((item) => [item.sku.toLowerCase(), item]));
  const itemById = new Map(items.map((item) => [item.id, item]));
  const errors: string[] = [];
  const records: Omit<QcInspection, "id">[] = [];

  dataRows.forEach((row, index) => {
    const itemIdCell = readCell(row, headerMap, hasHeader, ["item_id"], undefined);
    const itemSkuCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["item_sku", "sku", "item"],
      0
    );
    const lotCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["lot_code", "lot", "batch", "batch_number"],
      1
    );
    const resultCell = readCell(row, headerMap, hasHeader, ["result"], 2);
    const notesCell = readCell(row, headerMap, hasHeader, ["notes"], 3);
    const mfgCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["manufacturing_date", "mfg_date"],
      4
    );
    const expiryCell = readCell(row, headerMap, hasHeader, ["expiry_date", "exp_date"], 5);
    const supplierTraceCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["supplier_traceability"],
      6
    );
    const supplierQcCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["supplier_quality_check"],
      7
    );
    const inspectionMethodCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["inspection_method"],
      8
    );
    const sampleReportCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["sample_test_report"],
      9
    );
    const incomingQcCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["incoming_quality_check"],
      10
    );
    const storageCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["storage_conditions"],
      11
    );
    const shelfLifeCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["shelf_life_days"],
      12
    );
    const hazardCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["hazard_classification"],
      13
    );
    const handlingCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["handling_instructions"],
      14
    );
    const msdsCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["msds_available"],
      15
    );
    const packagingCell = readCell(
      row,
      headerMap,
      hasHeader,
      ["packaging_type"],
      16
    );

    const itemFromId = itemIdCell.value.trim()
      ? itemById.get(itemIdCell.value.trim())
      : undefined;
    const itemFromSku = itemSkuCell.value.trim()
      ? itemBySku.get(itemSkuCell.value.trim().toLowerCase())
      : undefined;
    const item = itemFromId ?? itemFromSku;
    if (!item) {
      errors.push(`Row ${index + 1}: Unknown item for batch record.`);
      return;
    }

    const lotCode = lotCell.value.trim();
    if (!lotCode) {
      errors.push(`Row ${index + 1}: Batch lot code is required.`);
      return;
    }

    const resultParsed = resultCell.value.trim()
      ? parseEnum(resultCell.value, qcResultOptions)
      : undefined;
    if (resultCell.value.trim() && !resultParsed) {
      errors.push(`Row ${index + 1}: Invalid inspection result.`);
    }

    const supplierTraceability = supplierTraceCell.value.trim()
      ? parseEnum(supplierTraceCell.value, availabilityOptions)
      : undefined;
    if (supplierTraceCell.value.trim() && !supplierTraceability) {
      errors.push(`Row ${index + 1}: Invalid supplier traceability.`);
    }

    const supplierQualityCheck = supplierQcCell.value.trim()
      ? parseEnum(supplierQcCell.value, checkOptions)
      : undefined;
    if (supplierQcCell.value.trim() && !supplierQualityCheck) {
      errors.push(`Row ${index + 1}: Invalid supplier quality check.`);
    }

    const inspectionMethod = inspectionMethodCell.value.trim()
      ? parseEnum(inspectionMethodCell.value, inspectionMethodOptions)
      : undefined;
    if (inspectionMethodCell.value.trim() && !inspectionMethod) {
      errors.push(`Row ${index + 1}: Invalid inspection method.`);
    }

    const sampleTestReport = sampleReportCell.value.trim()
      ? parseEnum(sampleReportCell.value, availabilityOptions)
      : undefined;
    if (sampleReportCell.value.trim() && !sampleTestReport) {
      errors.push(`Row ${index + 1}: Invalid sample test report value.`);
    }

    const incomingQualityCheck = incomingQcCell.value.trim()
      ? parseEnum(incomingQcCell.value, checkOptions)
      : undefined;
    if (incomingQcCell.value.trim() && !incomingQualityCheck) {
      errors.push(`Row ${index + 1}: Invalid incoming quality check.`);
    }

    const msdsAvailable = msdsCell.value.trim()
      ? parseEnum(msdsCell.value, availabilityOptions)
      : undefined;
    if (msdsCell.value.trim() && !msdsAvailable) {
      errors.push(`Row ${index + 1}: Invalid MSDS availability value.`);
    }

    const manufacturingDate = mfgCell.value.trim()
      ? mfgCell.value.trim()
      : undefined;
    if (manufacturingDate && !isIsoDate(manufacturingDate)) {
      errors.push(`Row ${index + 1}: Invalid manufacturing date.`);
    }

    const expiryDate = expiryCell.value.trim() ? expiryCell.value.trim() : undefined;
    if (expiryDate && !isIsoDate(expiryDate)) {
      errors.push(`Row ${index + 1}: Invalid expiry date.`);
    }

    const shelfLifeDays = shelfLifeCell.value.trim()
      ? parseInteger(shelfLifeCell.value.trim())
      : undefined;
    if (shelfLifeCell.value.trim() && shelfLifeDays === undefined) {
      errors.push(`Row ${index + 1}: Invalid shelf life days.`);
    }

    const payload: Omit<QcInspection, "id"> = {
      itemId: item.id,
      lotCode,
      result: resultParsed ?? "pass",
      notes: notesCell.present ? notesCell.value.trim() : "",
      ...stripUndefined({
        manufacturingDate,
        expiryDate,
        supplierTraceability,
        supplierQualityCheck,
        inspectionMethod,
        sampleTestReport,
        incomingQualityCheck,
        storageConditions: storageCell.present ? storageCell.value.trim() : undefined,
        shelfLifeDays,
        hazardClassification: hazardCell.present ? hazardCell.value.trim() : undefined,
        handlingInstructions: handlingCell.present ? handlingCell.value.trim() : undefined,
        msdsAvailable,
        packagingType: packagingCell.present ? packagingCell.value.trim() : undefined
      })
    };

    records.push(payload);
  });

  return { records, errors };
};

export default function DataHubScreen() {
  const canExchange = useCan("data.exchange");
  const items = useAppStore((state) => state.items);
  const bomLines = useAppStore((state) => state.bomLines);
  const kpis = useAppStore((state) => state.kpis);
  const salesHistory = useAppStore((state) => state.salesHistory);
  const materialUsage = useAppStore((state) => state.materialUsage);
  const materialReceipts = useAppStore((state) => state.materialReceipts);
  const suppliers = useAppStore((state) => state.suppliers);
  const qcInspections = useAppStore((state) => state.qcInspections);
  const setBomLines = useAppStore((state) => state.setBomLines);
  const setKpis = useAppStore((state) => state.setKpis);
  const addKpi = useAppStore((state) => state.addKpi);
  const setSalesHistory = useAppStore((state) => state.setSalesHistory);
  const addSalesRecord = useAppStore((state) => state.addSalesRecord);
  const setMaterialUsage = useAppStore((state) => state.setMaterialUsage);
  const addMaterialUsageRecord = useAppStore((state) => state.addMaterialUsageRecord);
  const setMaterialReceipts = useAppStore((state) => state.setMaterialReceipts);
  const addMaterialReceiptRecord = useAppStore((state) => state.addMaterialReceiptRecord);
  const createItem = useAppStore((state) => state.createItem);
  const updateItem = useAppStore((state) => state.updateItem);
  const createSupplier = useAppStore((state) => state.createSupplier);
  const updateSupplier = useAppStore((state) => state.updateSupplier);
  const createQcInspection = useAppStore((state) => state.createQcInspection);
  const updateQcInspection = useAppStore((state) => state.updateQcInspection);
  const createAuditEvent = useAppStore((state) => state.createAuditEvent);

  const [exportCsv, setExportCsv] = useState("");
  const [bomImport, setBomImport] = useState("");
  const [kpiImport, setKpiImport] = useState("");
  const [salesImport, setSalesImport] = useState("");
  const [usageImport, setUsageImport] = useState("");
  const [receiptImport, setReceiptImport] = useState("");
  const [itemsImport, setItemsImport] = useState("");
  const [suppliersImport, setSuppliersImport] = useState("");
  const [batchImport, setBatchImport] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [kpiLabel, setKpiLabel] = useState("");
  const [kpiValue, setKpiValue] = useState("0");
  const [kpiUnit, setKpiUnit] = useState("");
  const [kpiDelta, setKpiDelta] = useState("0");
  const [salesDate, setSalesDate] = useState("");
  const [salesItemId, setSalesItemId] = useState("");
  const [salesQty, setSalesQty] = useState("0");
  const [salesPrice, setSalesPrice] = useState("");
  const [usageDate, setUsageDate] = useState("");
  const [usageItemId, setUsageItemId] = useState("");
  const [usageQty, setUsageQty] = useState("0");
  const [receiptDate, setReceiptDate] = useState("");
  const [receiptItemId, setReceiptItemId] = useState("");
  const [receiptQty, setReceiptQty] = useState("0");
  const [receiptSupplier, setReceiptSupplier] = useState("");

  const finishedItems = useMemo(
    () => items.filter((item) => item.type === "finished"),
    [items]
  );
  const materialItems = useMemo(
    () => items.filter((item) => item.type === "material"),
    [items]
  );
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const supplierById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers]
  );

  useEffect(() => {
    if (!salesItemId && finishedItems[0]) {
      setSalesItemId(finishedItems[0].id);
    }
  }, [finishedItems, salesItemId]);

  useEffect(() => {
    if (!usageItemId && materialItems[0]) {
      setUsageItemId(materialItems[0].id);
    }
  }, [materialItems, usageItemId]);

  useEffect(() => {
    if (!receiptItemId && materialItems[0]) {
      setReceiptItemId(materialItems[0].id);
    }
  }, [materialItems, receiptItemId]);

  const bomExport = useMemo(() => {
    const rows = bomLines.map((line) => [
      itemById.get(line.finishedProductId)?.sku ?? line.finishedProductId,
      itemById.get(line.materialId)?.sku ?? line.materialId,
      line.qtyPerUnit
    ]);
    return toCsv(["finished_sku", "material_sku", "qty_per_unit"], rows);
  }, [bomLines, itemById]);

  const kpiExport = useMemo(() => {
    const rows = kpis.map((kpi) => [kpi.label, kpi.value, kpi.unit, kpi.delta]);
    return toCsv(["label", "value", "unit", "delta"], rows);
  }, [kpis]);

  const salesExport = useMemo(() => {
    const rows = salesHistory.map((record) => [
      record.date,
      itemById.get(record.itemId)?.sku ?? record.itemId,
      record.qty,
      record.unitPrice ?? ""
    ]);
    return toCsv(["date", "sku", "qty", "unit_price"], rows);
  }, [itemById, salesHistory]);

  const materialUsageExport = useMemo(() => {
    const rows = materialUsage.map((record) => [
      record.date,
      itemById.get(record.materialId)?.sku ?? record.materialId,
      record.qtyUsed
    ]);
    return toCsv(["date", "material_sku", "qty_used"], rows);
  }, [itemById, materialUsage]);

  const materialReceiptsExport = useMemo(() => {
    const rows = materialReceipts.map((record) => [
      record.date,
      itemById.get(record.materialId)?.sku ?? record.materialId,
      record.qtyReceived,
      record.supplier ?? ""
    ]);
    return toCsv(["date", "material_sku", "qty_received", "supplier"], rows);
  }, [itemById, materialReceipts]);

  const itemsExport = useMemo(() => {
    const rows = items.map((item) => [
      item.sku,
      item.name,
      item.type,
      item.uom,
      item.description ?? "",
      item.classification ?? "",
      item.categoryGroup ?? "",
      item.workStationName ?? "",
      item.commodityCode ?? "",
      item.hsnNumber ?? "",
      item.origin ?? "",
      item.productionType ?? "",
      item.status ?? "",
      item.barcode ?? "",
      item.imageUri ?? "",
      item.reorderPoint,
      item.safetyStock,
      item.reorderQuantity ?? "",
      item.minStock ?? "",
      item.maxStock ?? "",
      item.stockMethod ?? "",
      item.unitCost ?? "",
      item.leadTimeDays,
      item.yieldPercent,
      item.scrapPercent,
      (item.approvedSupplierIds ?? [])
        .map((id) => supplierById.get(id)?.code ?? id)
        .join("|")
    ]);
    return toCsv(
      [
        "sku",
        "name",
        "type",
        "uom",
        "description",
        "classification",
        "category_group",
        "work_station_name",
        "commodity_code",
        "hsn_number",
        "origin",
        "production_type",
        "status",
        "barcode",
        "image_uri",
        "reorder_point",
        "safety_stock",
        "reorder_quantity",
        "min_stock",
        "max_stock",
        "stock_method",
        "unit_cost",
        "lead_time_days",
        "yield_percent",
        "scrap_percent",
        "approved_suppliers"
      ],
      rows
    );
  }, [items, supplierById]);

  const suppliersExport = useMemo(() => {
    const rows = suppliers.map((supplier) => [
      supplier.code,
      supplier.name,
      supplier.address,
      supplier.contactNumber,
      supplier.email,
      supplier.origin,
      supplier.incoTerms,
      supplier.leadTimeDays,
      supplier.minimumOrderQuantity,
      supplier.purchaseUnitPrice,
      supplier.lastPurchasePrice,
      supplier.contractType,
      supplier.contractDuration,
      supplier.active ? "true" : "false"
    ]);
    return toCsv(
      [
        "code",
        "name",
        "address",
        "contact_number",
        "email",
        "origin",
        "inco_terms",
        "lead_time_days",
        "minimum_order_quantity",
        "purchase_unit_price",
        "last_purchase_price",
        "contract_type",
        "contract_duration",
        "active"
      ],
      rows
    );
  }, [suppliers]);

  const batchExport = useMemo(() => {
    const rows = qcInspections.map((inspection) => [
      itemById.get(inspection.itemId)?.sku ?? inspection.itemId,
      inspection.lotCode,
      inspection.result,
      inspection.notes,
      inspection.manufacturingDate ?? "",
      inspection.expiryDate ?? "",
      inspection.supplierTraceability ?? "",
      inspection.supplierQualityCheck ?? "",
      inspection.inspectionMethod ?? "",
      inspection.sampleTestReport ?? "",
      inspection.incomingQualityCheck ?? "",
      inspection.storageConditions ?? "",
      typeof inspection.shelfLifeDays === "number" ? inspection.shelfLifeDays : "",
      inspection.hazardClassification ?? "",
      inspection.handlingInstructions ?? "",
      inspection.msdsAvailable ?? "",
      inspection.packagingType ?? ""
    ]);
    return toCsv(
      [
        "item_sku",
        "lot_code",
        "result",
        "notes",
        "manufacturing_date",
        "expiry_date",
        "supplier_traceability",
        "supplier_quality_check",
        "inspection_method",
        "sample_test_report",
        "incoming_quality_check",
        "storage_conditions",
        "shelf_life_days",
        "hazard_classification",
        "handling_instructions",
        "msds_available",
        "packaging_type"
      ],
      rows
    );
  }, [qcInspections, itemById]);

  if (!canExchange) {
    return (
      <Screen>
        <SectionHeader title="Data Hub" subtitle="Role-based access enforced." />
        <AccessDenied />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionHeader
        title="Data Hub"
        subtitle="Excel-compatible import/export for items, suppliers, batches, BOM, and analytics."
      />

      <SectionHeader
        title="Quick Add"
        subtitle="Manually add KPIs and activity records."
      />
      <Card style={styles.card}>
        <Text style={styles.label}>Add KPI</Text>
        <View style={styles.inputGrid}>
          <FormField label="Label" style={styles.field}>
            <TextInput
              value={kpiLabel}
              onChangeText={setKpiLabel}
              placeholder="Inventory turns"
              placeholderTextColor={theme.colors.inkSubtle}
              style={styles.input}
            />
          </FormField>
          <FormField label="Value" style={styles.field}>
            <TextInput
              value={kpiValue}
              onChangeText={setKpiValue}
              keyboardType="numeric"
              style={styles.input}
            />
          </FormField>
          <FormField label="Unit" style={styles.field}>
            <TextInput
              value={kpiUnit}
              onChangeText={setKpiUnit}
              placeholder="x, %, days"
              placeholderTextColor={theme.colors.inkSubtle}
              style={styles.input}
            />
          </FormField>
          <FormField label="Delta" style={styles.field}>
            <TextInput
              value={kpiDelta}
              onChangeText={setKpiDelta}
              keyboardType="numeric"
              style={styles.input}
            />
          </FormField>
        </View>
        <Button
          label="Add KPI"
          onPress={() => {
            if (!kpiLabel.trim()) {
              return;
            }
            addKpi({
              label: kpiLabel.trim(),
              value: Number(kpiValue),
              unit: kpiUnit.trim(),
              delta: Number(kpiDelta)
            });
            setKpiLabel("");
            setKpiValue("0");
            setKpiUnit("");
            setKpiDelta("0");
          }}
          disabled={!kpiLabel.trim()}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Add Sales Record</Text>
        <Text style={styles.help}>Format: date YYYY-MM-DD</Text>
        <View style={styles.chipRow}>
          {finishedItems.length === 0 ? (
            <Text style={styles.mutedText}>Add finished goods first.</Text>
          ) : (
            finishedItems.map((item) => {
              const active = item.id === salesItemId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSalesItemId(item.id)}
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
        <View style={styles.inputGrid}>
          <FormField label="Date" style={styles.field}>
            <TextInput
              value={salesDate}
              onChangeText={setSalesDate}
              placeholder="2026-03-16"
              placeholderTextColor={theme.colors.inkSubtle}
              style={styles.input}
            />
          </FormField>
          <FormField label="Qty" style={styles.field}>
            <TextInput
              value={salesQty}
              onChangeText={setSalesQty}
              keyboardType="numeric"
              style={styles.input}
            />
          </FormField>
          <FormField label="Unit price" style={styles.field}>
            <TextInput
              value={salesPrice}
              onChangeText={setSalesPrice}
              keyboardType="numeric"
              style={styles.input}
            />
          </FormField>
        </View>
        <Button
          label="Add Sales Record"
          onPress={() => {
            if (!salesItemId || !isIsoDate(salesDate) || !isPositiveNumber(salesQty)) {
              return;
            }
            addSalesRecord({
              itemId: salesItemId,
              date: salesDate.trim(),
              qty: Number(salesQty),
              unitPrice: salesPrice ? Number(salesPrice) : undefined
            });
            setSalesDate("");
            setSalesQty("0");
            setSalesPrice("");
          }}
          disabled={
            !salesItemId || !isIsoDate(salesDate) || !isPositiveNumber(salesQty)
          }
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Add Material Usage</Text>
        <Text style={styles.help}>Format: date YYYY-MM-DD</Text>
        <View style={styles.chipRow}>
          {materialItems.length === 0 ? (
            <Text style={styles.mutedText}>Add material items first.</Text>
          ) : (
            materialItems.map((item) => {
              const active = item.id === usageItemId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setUsageItemId(item.id)}
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
        <View style={styles.inputGrid}>
          <FormField label="Date" style={styles.field}>
            <TextInput
              value={usageDate}
              onChangeText={setUsageDate}
              placeholder="2026-03-16"
              placeholderTextColor={theme.colors.inkSubtle}
              style={styles.input}
            />
          </FormField>
          <FormField label="Qty used" style={styles.field}>
            <TextInput
              value={usageQty}
              onChangeText={setUsageQty}
              keyboardType="numeric"
              style={styles.input}
            />
          </FormField>
        </View>
        <Button
          label="Add Usage"
          onPress={() => {
            if (!usageItemId || !isIsoDate(usageDate) || !isPositiveNumber(usageQty)) {
              return;
            }
            addMaterialUsageRecord({
              materialId: usageItemId,
              date: usageDate.trim(),
              qtyUsed: Number(usageQty)
            });
            setUsageDate("");
            setUsageQty("0");
          }}
          disabled={
            !usageItemId || !isIsoDate(usageDate) || !isPositiveNumber(usageQty)
          }
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Add Material Receipt</Text>
        <Text style={styles.help}>Format: date YYYY-MM-DD</Text>
        <View style={styles.chipRow}>
          {materialItems.length === 0 ? (
            <Text style={styles.mutedText}>Add material items first.</Text>
          ) : (
            materialItems.map((item) => {
              const active = item.id === receiptItemId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setReceiptItemId(item.id)}
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
        <View style={styles.inputGrid}>
          <FormField label="Date" style={styles.field}>
            <TextInput
              value={receiptDate}
              onChangeText={setReceiptDate}
              placeholder="2026-03-16"
              placeholderTextColor={theme.colors.inkSubtle}
              style={styles.input}
            />
          </FormField>
          <FormField label="Qty received" style={styles.field}>
            <TextInput
              value={receiptQty}
              onChangeText={setReceiptQty}
              keyboardType="numeric"
              style={styles.input}
            />
          </FormField>
          <FormField label="Supplier" style={styles.field}>
            <TextInput
              value={receiptSupplier}
              onChangeText={setReceiptSupplier}
              placeholder="Supplier"
              placeholderTextColor={theme.colors.inkSubtle}
              style={styles.input}
            />
          </FormField>
        </View>
        <Button
          label="Add Receipt"
          onPress={() => {
            if (
              !receiptItemId ||
              !isIsoDate(receiptDate) ||
              !isPositiveNumber(receiptQty)
            ) {
              return;
            }
            addMaterialReceiptRecord({
              materialId: receiptItemId,
              date: receiptDate.trim(),
              qtyReceived: Number(receiptQty),
              supplier: receiptSupplier.trim() || undefined
            });
            setReceiptDate("");
            setReceiptQty("0");
            setReceiptSupplier("");
          }}
          disabled={
            !receiptItemId ||
            !isIsoDate(receiptDate) ||
            !isPositiveNumber(receiptQty)
          }
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Export datasets</Text>
        <View style={styles.buttonRow}>
          <Button
            label="Export Items CSV"
            size="sm"
            onPress={() => {
              setExportCsv(itemsExport);
              setStatus("Items export ready.");
              createAuditEvent({ action: "Exported items CSV", entity: "items" });
            }}
          />
          <Button
            label="Export Suppliers CSV"
            size="sm"
            variant="secondary"
            onPress={() => {
              setExportCsv(suppliersExport);
              setStatus("Suppliers export ready.");
              createAuditEvent({ action: "Exported suppliers CSV", entity: "suppliers" });
            }}
          />
          <Button
            label="Export Batch CSV"
            size="sm"
            variant="secondary"
            onPress={() => {
              setExportCsv(batchExport);
              setStatus("Batch export ready.");
              createAuditEvent({ action: "Exported batch CSV", entity: "batch" });
            }}
          />
          <Button
            label="Export BOM CSV"
            size="sm"
            onPress={() => {
              setExportCsv(bomExport);
              setStatus("BOM export ready.");
              createAuditEvent({ action: "Exported BOM CSV", entity: "bom" });
            }}
          />
          <Button
            label="Export Analytics CSV"
            size="sm"
            variant="secondary"
            onPress={() => {
              setExportCsv(kpiExport);
              setStatus("Analytics export ready.");
              createAuditEvent({ action: "Exported KPI CSV", entity: "analytics" });
            }}
          />
          <Button
            label="Export Sales CSV"
            size="sm"
            variant="secondary"
            onPress={() => {
              setExportCsv(salesExport);
              setStatus("Sales export ready.");
              createAuditEvent({ action: "Exported sales CSV", entity: "sales" });
            }}
          />
          <Button
            label="Export Usage CSV"
            size="sm"
            variant="secondary"
            onPress={() => {
              setExportCsv(materialUsageExport);
              setStatus("Material usage export ready.");
              createAuditEvent({ action: "Exported material usage CSV", entity: "materials" });
            }}
          />
          <Button
            label="Export Receipts CSV"
            size="sm"
            variant="secondary"
            onPress={() => {
              setExportCsv(materialReceiptsExport);
              setStatus("Material receipts export ready.");
              createAuditEvent({ action: "Exported material receipts CSV", entity: "materials" });
            }}
          />
        </View>
        <TextInput
          value={exportCsv}
          editable={false}
          multiline
          placeholder="Exported CSV will appear here."
          placeholderTextColor={theme.colors.inkSubtle}
          style={styles.textArea}
        />
        <Button
          label="Copy CSV"
          variant="ghost"
          size="sm"
          onPress={() => copyToClipboard(exportCsv)}
          disabled={!exportCsv}
        />
        {status ? (
          <View style={styles.statusNotice}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={styles.status}>{status}</Text>
          </View>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Import Items (CSV)</Text>
        <Text style={styles.help}>
          Format: sku, name, type, uom, description, classification, category_group,
          work_station_name, commodity_code, hsn_number, origin, production_type,
          status, barcode, image_uri, reorder_point, safety_stock, reorder_quantity,
          min_stock, max_stock, stock_method, unit_cost, lead_time_days, yield_percent,
          scrap_percent, approved_suppliers
        </Text>
        <TextInput
          value={itemsImport}
          onChangeText={setItemsImport}
          multiline
          placeholder="Paste items CSV here"
          placeholderTextColor={theme.colors.inkSubtle}
          style={styles.textArea}
        />
        <Button
          label="Import Items"
          onPress={() => {
            const result = parseItemsCsv(itemsImport, suppliers);
            if (result.records.length === 0) {
              setStatus("No item rows parsed.");
              return;
            }
            let created = 0;
            let updated = 0;
            const existingBySku = new Map(
              items.map((item) => [item.sku.trim().toLowerCase(), item])
            );
            result.records.forEach((record) => {
              const existing = existingBySku.get(record.sku.trim().toLowerCase());
              if (existing) {
                updateItem(existing.id, record);
                updated += 1;
              } else {
                createItem(record);
                created += 1;
              }
            });
            setStatus(
              `Imported ${created + updated} item rows (${created} new, ${updated} updated). ${result.errors.length} issues.`
            );
          }}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Import Suppliers (CSV)</Text>
        <Text style={styles.help}>
          Format: code, name, address, contact_number, email, origin, inco_terms,
          lead_time_days, minimum_order_quantity, purchase_unit_price, last_purchase_price,
          contract_type, contract_duration, active
        </Text>
        <TextInput
          value={suppliersImport}
          onChangeText={setSuppliersImport}
          multiline
          placeholder="Paste suppliers CSV here"
          placeholderTextColor={theme.colors.inkSubtle}
          style={styles.textArea}
        />
        <Button
          label="Import Suppliers"
          variant="secondary"
          onPress={() => {
            const result = parseSuppliersCsv(suppliersImport);
            if (result.records.length === 0) {
              setStatus("No supplier rows parsed.");
              return;
            }
            let created = 0;
            let updated = 0;
            const existingByCode = new Map(
              suppliers.map((supplier) => [supplier.code.trim().toLowerCase(), supplier])
            );
            result.records.forEach((record) => {
              const existing = existingByCode.get(record.code.trim().toLowerCase());
              if (existing) {
                updateSupplier(existing.id, record);
                updated += 1;
              } else {
                createSupplier(record);
                created += 1;
              }
            });
            setStatus(
              `Imported ${created + updated} supplier rows (${created} new, ${updated} updated). ${result.errors.length} issues.`
            );
          }}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Import Batch & QC (CSV)</Text>
        <Text style={styles.help}>
          Format: item_sku, lot_code, result, notes, manufacturing_date, expiry_date,
          supplier_traceability, supplier_quality_check, inspection_method,
          sample_test_report, incoming_quality_check, storage_conditions, shelf_life_days,
          hazard_classification, handling_instructions, msds_available, packaging_type
        </Text>
        <TextInput
          value={batchImport}
          onChangeText={setBatchImport}
          multiline
          placeholder="Paste batch QC CSV here"
          placeholderTextColor={theme.colors.inkSubtle}
          style={styles.textArea}
        />
        <Button
          label="Import Batch Records"
          variant="secondary"
          onPress={() => {
            const result = parseBatchCsv(batchImport, items);
            if (result.records.length === 0) {
              setStatus("No batch rows parsed.");
              return;
            }
            let created = 0;
            let updated = 0;
            const existingByKey = new Map(
              qcInspections.map((inspection) => [
                `${inspection.itemId}:${inspection.lotCode.trim().toLowerCase()}`,
                inspection
              ])
            );
            result.records.forEach((record) => {
              const existing = existingByKey.get(
                `${record.itemId}:${record.lotCode.trim().toLowerCase()}`
              );
              if (existing) {
                updateQcInspection(existing.id, record);
                updated += 1;
              } else {
                createQcInspection(record);
                created += 1;
              }
            });
            setStatus(
              `Imported ${created + updated} batch rows (${created} new, ${updated} updated). ${result.errors.length} issues.`
            );
          }}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Import BOM (CSV)</Text>
        <Text style={styles.help}>
          Format: finished_sku, material_sku, qty_per_unit
        </Text>
        <TextInput
          value={bomImport}
          onChangeText={setBomImport}
          multiline
          placeholder="Paste BOM CSV here"
          placeholderTextColor={theme.colors.inkSubtle}
          style={styles.textArea}
        />
        <Button
          label="Import BOM"
          onPress={() => {
            const result = parseBomCsv(bomImport, items);
            if (result.lines.length === 0) {
              setStatus("No valid BOM lines found.");
              return;
            }
            setBomLines(result.lines);
            setStatus(
              `Imported ${result.lines.length} BOM lines. ${result.errors.length} issues.`
            );
          }}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Import Analytics KPIs (CSV)</Text>
        <Text style={styles.help}>
          Format: label, value, unit, delta
        </Text>
        <TextInput
          value={kpiImport}
          onChangeText={setKpiImport}
          multiline
          placeholder="Paste KPI CSV here"
          placeholderTextColor={theme.colors.inkSubtle}
          style={styles.textArea}
        />
        <Button
          label="Import KPIs"
          variant="secondary"
          onPress={() => {
            const nextKpis = parseKpiCsv(kpiImport);
            if (nextKpis.length === 0) {
              setStatus("No KPI rows parsed.");
              return;
            }
            setKpis(nextKpis);
            setStatus(`Imported ${nextKpis.length} KPI rows.`);
          }}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Import Sales History (CSV)</Text>
        <Text style={styles.help}>
          Format: date, sku, qty, unit_price
        </Text>
        <TextInput
          value={salesImport}
          onChangeText={setSalesImport}
          multiline
          placeholder="Paste sales CSV here"
          placeholderTextColor={theme.colors.inkSubtle}
          style={styles.textArea}
        />
        <Button
          label="Import Sales"
          onPress={() => {
            const result = parseSalesCsv(salesImport, items);
            if (result.records.length === 0) {
              setStatus("No sales rows parsed.");
              return;
            }
            setSalesHistory(result.records);
            setStatus(
              `Imported ${result.records.length} sales rows. ${result.errors.length} issues.`
            );
          }}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Import Material Usage (CSV)</Text>
        <Text style={styles.help}>
          Format: date, material_sku, qty_used
        </Text>
        <TextInput
          value={usageImport}
          onChangeText={setUsageImport}
          multiline
          placeholder="Paste material usage CSV here"
          placeholderTextColor={theme.colors.inkSubtle}
          style={styles.textArea}
        />
        <Button
          label="Import Material Usage"
          onPress={() => {
            const result = parseMaterialUsageCsv(usageImport, items);
            if (result.records.length === 0) {
              setStatus("No material usage rows parsed.");
              return;
            }
            setMaterialUsage(result.records);
            setStatus(
              `Imported ${result.records.length} usage rows. ${result.errors.length} issues.`
            );
          }}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Import Material Receipts (CSV)</Text>
        <Text style={styles.help}>
          Format: date, material_sku, qty_received, supplier
        </Text>
        <TextInput
          value={receiptImport}
          onChangeText={setReceiptImport}
          multiline
          placeholder="Paste material receipts CSV here"
          placeholderTextColor={theme.colors.inkSubtle}
          style={styles.textArea}
        />
        <Button
          label="Import Material Receipts"
          variant="secondary"
          onPress={() => {
            const result = parseMaterialReceiptsCsv(receiptImport, items);
            if (result.records.length === 0) {
              setStatus("No material receipt rows parsed.");
              return;
            }
            setMaterialReceipts(result.records);
            setStatus(
              `Imported ${result.records.length} receipt rows. ${result.errors.length} issues.`
            );
          }}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.lg
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.inkSubtle,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: theme.spacing.sm
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
  inputGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  field: {
    flex: 1,
    minWidth: 160
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
  mutedText: {
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  help: {
    fontSize: 12,
    color: theme.colors.inkSubtle,
    marginBottom: theme.spacing.sm
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    fontSize: 12,
    textAlignVertical: "top"
  },
  status: {
    fontSize: 12,
    fontFamily: theme.typography.body,
    color: theme.colors.textSecondary
  },
  statusNotice: {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: theme.typography.body,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2
  }
});
