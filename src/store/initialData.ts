import {
  Alert,
  AuditEvent,
  Bin,
  BOMLine,
  Company,
  InventoryBalance,
  Item,
  KPI,
  Location,
  MaterialReceiptRecord,
  MaterialUsageRecord,
  PurchaseOrder,
  QcInspection,
  Supplier,
  ReturnRecord,
  SalesRecord,
  SalesOrder,
  Transfer,
  User,
  Warehouse,
  WorkOrder,
  CycleCount
} from "../types";

export const companies: Company[] = [];

export const users: User[] = [];

export const warehouses: Warehouse[] = [];

export const locations: Location[] = [];

export const bins: Bin[] = [];

export const items: Item[] = [];

export const bomLines: BOMLine[] = [];

export const inventory: InventoryBalance[] = [];

export const workOrders: WorkOrder[] = [];

export const purchaseOrders: PurchaseOrder[] = [];

export const salesOrders: SalesOrder[] = [];

export const suppliers: Supplier[] = [];

export const salesHistory: SalesRecord[] = [];

export const materialUsage: MaterialUsageRecord[] = [];

export const materialReceipts: MaterialReceiptRecord[] = [];

export const alerts: Alert[] = [];

export const kpis: KPI[] = [];

export const auditEvents: AuditEvent[] = [];

export const transfers: Transfer[] = [];

export const cycleCounts: CycleCount[] = [];

export const returnRecords: ReturnRecord[] = [];

export const qcInspections: QcInspection[] = [];
