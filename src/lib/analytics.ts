import {
  BOMLine,
  Item,
  MaterialReceiptRecord,
  MaterialUsageRecord,
  PurchaseOrder,
  SalesOrder,
  SalesRecord,
  WorkOrder
} from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
};

const parseIsoDate = (value: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  return Number.isNaN(utc) ? null : utc;
};

export const getTodayUtc = () => {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
};

const isInRange = (utc: number, startUtc: number, endUtc: number) =>
  utc >= startUtc && utc <= endUtc;

const sumById = <T>(
  records: T[],
  getId: (record: T) => string,
  getDate: (record: T) => string,
  getValue: (record: T) => number,
  startUtc: number,
  endUtc: number
) => {
  const totals = new Map<string, number>();
  records.forEach((record) => {
    const utc = parseIsoDate(getDate(record));
    if (utc === null || !isInRange(utc, startUtc, endUtc)) {
      return;
    }
    const id = getId(record);
    const value = clampNumber(getValue(record), 0, Number.POSITIVE_INFINITY);
    totals.set(id, (totals.get(id) ?? 0) + value);
  });
  return totals;
};

export type SalesAnalyticsRow = {
  id: string;
  sku: string;
  name: string;
  uom: string;
  historyQty: number;
  avgDaily: number;
  forecastQty: number;
  confirmedOrders: number;
};

export type SalesAnalyticsSummary = {
  rows: SalesAnalyticsRow[];
  historyTotal: number;
  forecastTotal: number;
  avgDailyTotal: number;
  confirmedOrdersTotal: number;
};

export const buildSalesAnalytics = (
  items: Item[],
  salesHistory: SalesRecord[],
  salesOrders: SalesOrder[],
  historyDays: number,
  forecastDays: number,
  todayUtc: number
): SalesAnalyticsSummary => {
  const historyStart = todayUtc - (historyDays - 1) * DAY_MS;
  const historyEnd = todayUtc;
  const forecastStart = todayUtc + DAY_MS;
  const forecastEnd = todayUtc + forecastDays * DAY_MS;

  const historyTotals = sumById(
    salesHistory,
    (record) => record.itemId,
    (record) => record.date,
    (record) => record.qty,
    historyStart,
    historyEnd
  );

  const orderTotals = sumById(
    salesOrders.filter((order) => order.status === "open" || order.status === "allocated"),
    (order) => order.itemId,
    (order) => order.dueDate,
    (order) => order.qty,
    forecastStart,
    forecastEnd
  );

  const finishedItems = items.filter((item) => item.type === "finished");
  const rows = finishedItems.map((item) => {
    const historyQty = historyTotals.get(item.id) ?? 0;
    const avgDaily = historyDays > 0 ? historyQty / historyDays : 0;
    const confirmedOrders = orderTotals.get(item.id) ?? 0;
    const forecastQty = avgDaily * forecastDays + confirmedOrders;
    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      uom: item.uom,
      historyQty,
      avgDaily,
      forecastQty,
      confirmedOrders
    };
  });

  const historyTotal = rows.reduce((sum, row) => sum + row.historyQty, 0);
  const forecastTotal = rows.reduce((sum, row) => sum + row.forecastQty, 0);
  const avgDailyTotal = historyDays > 0 ? historyTotal / historyDays : 0;
  const confirmedOrdersTotal = rows.reduce((sum, row) => sum + row.confirmedOrders, 0);

  return {
    rows: rows.sort((a, b) => b.forecastQty - a.forecastQty),
    historyTotal,
    forecastTotal,
    avgDailyTotal,
    confirmedOrdersTotal
  };
};

export type MaterialAnalyticsRow = {
  id: string;
  sku: string;
  name: string;
  uom: string;
  historyUsed: number;
  historyReceived: number;
  avgDailyUsed: number;
  forecastUsage: number;
  forecastReceipts: number;
  netForecast: number;
};

export type MaterialAnalyticsSummary = {
  rows: MaterialAnalyticsRow[];
  historyUsedTotal: number;
  historyReceivedTotal: number;
  forecastUsageTotal: number;
  forecastReceiptsTotal: number;
  netForecastTotal: number;
};

export const buildMaterialAnalytics = (
  items: Item[],
  bomLines: BOMLine[],
  materialUsage: MaterialUsageRecord[],
  materialReceipts: MaterialReceiptRecord[],
  workOrders: WorkOrder[],
  purchaseOrders: PurchaseOrder[],
  historyDays: number,
  forecastDays: number,
  todayUtc: number
): MaterialAnalyticsSummary => {
  const historyStart = todayUtc - (historyDays - 1) * DAY_MS;
  const historyEnd = todayUtc;
  const forecastStart = todayUtc + DAY_MS;
  const forecastEnd = todayUtc + forecastDays * DAY_MS;

  const itemMap = new Map(items.map((item) => [item.id, item]));
  const bomByProduct = new Map<string, BOMLine[]>();
  bomLines.forEach((line) => {
    const current = bomByProduct.get(line.finishedProductId) ?? [];
    current.push(line);
    bomByProduct.set(line.finishedProductId, current);
  });

  const historyUsedTotals = sumById(
    materialUsage,
    (record) => record.materialId,
    (record) => record.date,
    (record) => record.qtyUsed,
    historyStart,
    historyEnd
  );

  const historyReceiptTotals = sumById(
    materialReceipts,
    (record) => record.materialId,
    (record) => record.date,
    (record) => record.qtyReceived,
    historyStart,
    historyEnd
  );

  const forecastUsageTotals = new Map<string, number>();
  workOrders.forEach((order) => {
    if (order.status === "completed" || order.status === "hold") {
      return;
    }
    const dueUtc = parseIsoDate(order.dueDate);
    if (dueUtc === null || !isInRange(dueUtc, forecastStart, forecastEnd)) {
      return;
    }
    const lines = bomByProduct.get(order.productId) ?? [];
    lines.forEach((line) => {
      const material = itemMap.get(line.materialId);
      if (!material || material.type !== "material") {
        return;
      }
      const yieldFactor = Math.max(0, material.yieldPercent) / 100;
      const scrapFactor = Math.max(0, 1 - material.scrapPercent / 100);
      const efficiency = Math.max(0.01, yieldFactor * scrapFactor);
      const required = (line.qtyPerUnit * order.targetQty) / efficiency;
      forecastUsageTotals.set(
        material.id,
        (forecastUsageTotals.get(material.id) ?? 0) + required
      );
    });
  });

  const forecastReceiptTotals = sumById(
    purchaseOrders.filter((po) => po.status !== "received"),
    (po) => po.itemId,
    (po) => po.eta,
    (po) => po.qty,
    forecastStart,
    forecastEnd
  );

  const materialItems = items.filter((item) => item.type === "material");
  const rows = materialItems.map((material) => {
    const historyUsed = historyUsedTotals.get(material.id) ?? 0;
    const historyReceived = historyReceiptTotals.get(material.id) ?? 0;
    const avgDailyUsed = historyDays > 0 ? historyUsed / historyDays : 0;
    const forecastUsage = forecastUsageTotals.get(material.id) ?? 0;
    const forecastReceipts = forecastReceiptTotals.get(material.id) ?? 0;
    const netForecast = forecastReceipts - forecastUsage;
    return {
      id: material.id,
      sku: material.sku,
      name: material.name,
      uom: material.uom,
      historyUsed,
      historyReceived,
      avgDailyUsed,
      forecastUsage,
      forecastReceipts,
      netForecast
    };
  });

  const historyUsedTotal = rows.reduce((sum, row) => sum + row.historyUsed, 0);
  const historyReceivedTotal = rows.reduce((sum, row) => sum + row.historyReceived, 0);
  const forecastUsageTotal = rows.reduce((sum, row) => sum + row.forecastUsage, 0);
  const forecastReceiptsTotal = rows.reduce((sum, row) => sum + row.forecastReceipts, 0);
  const netForecastTotal = rows.reduce((sum, row) => sum + row.netForecast, 0);

  return {
    rows: rows.sort((a, b) => b.forecastUsage - a.forecastUsage),
    historyUsedTotal,
    historyReceivedTotal,
    forecastUsageTotal,
    forecastReceiptsTotal,
    netForecastTotal
  };
};
