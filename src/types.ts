export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "PLANNER"
  | "OPERATOR"
  | "VIEWER";

export type Permission =
  | "dashboard.view"
  | "inventory.view"
  | "inventory.edit"
  | "production.view"
  | "production.plan"
  | "analytics.view"
  | "data.exchange"
  | "users.manage"
  | "roles.manage"
  | "products.edit"
  | "procurement.view"
  | "warehouse.edit"
  | "audit.view";

export type PermissionOverride = Partial<Record<Permission, boolean>>;

export type RoleOverrides = Partial<Record<Role, PermissionOverride>>;

export type CompanyLimit = Partial<Record<Permission, boolean>>;

export type Company = {
  id: string;
  name: string;
  active: boolean;
  plan: "Starter" | "Growth" | "Enterprise";
};

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  companyId: string;
  role: Role;
  active: boolean;
};

export type Warehouse = {
  id: string;
  name: string;
};

export type Location = {
  id: string;
  warehouseId: string;
  zone: string;
  rackNumber?: string;
};

export type Bin = {
  id: string;
  locationId: string;
  code: string;
  capacity: number;
  binNumber?: string;
};

export type ItemType = "material" | "finished";

export type ItemClassification =
  | "high_cost"
  | "wear_out"
  | "consumable"
  | "spare_part"
  | "long_lead";

export type ItemOrigin = "imported" | "local";

export type ItemProductionType = "production" | "non_production";

export type ItemStatus = "active" | "inactive";

export type StockMethod = "fifo" | "lifo";

export type Item = {
  id: string;
  sku: string;
  name: string;
  description?: string;
  type: ItemType;
  classification?: ItemClassification;
  categoryGroup?: string;
  workStationName?: string;
  commodityCode?: string;
  hsnNumber?: string;
  origin?: ItemOrigin;
  productionType?: ItemProductionType;
  status?: ItemStatus;
  barcode?: string;
  imageUri?: string;
  uom: string;
  reorderPoint: number;
  safetyStock: number;
  reorderQuantity?: number;
  minStock?: number;
  maxStock?: number;
  stockMethod?: StockMethod;
  unitCost?: number;
  leadTimeDays: number;
  yieldPercent: number;
  scrapPercent: number;
  approvedSupplierIds?: string[];
};

export type BOMLine = {
  id: string;
  finishedProductId: string;
  materialId: string;
  qtyPerUnit: number;
};

export type InventoryBalance = {
  id: string;
  itemId: string;
  binId: string;
  onHand: number;
  reserved: number;
  lotCode?: string;
  expiryDate?: string;
  annualCheckCompleted?: boolean;
  lineSideRackQty?: number;
  lineSideBinQty?: number;
};

export type TransferStatus = "requested" | "approved" | "in_transit" | "completed";

export type Transfer = {
  id: string;
  fromBinId: string;
  toBinId: string;
  itemId: string;
  qty: number;
  status: TransferStatus;
};

export type CycleCountStatus = "planned" | "scheduled" | "in_progress" | "completed";

export type CycleCount = {
  id: string;
  area: string;
  scheduled: string;
  status: CycleCountStatus;
};

export type ReturnStatus = "inspection" | "restock" | "reject";

export type ReturnRecord = {
  id: string;
  customer: string;
  itemId: string;
  qty: number;
  status: ReturnStatus;
};

export type AvailabilityStatus = "available" | "not_available";

export type CheckStatus = "completed" | "not_completed";

export type InspectionMethod = "visual" | "destructive" | "non_destructive";

export type QcResult = "pass" | "hold" | "fail";

export type QcInspection = {
  id: string;
  itemId: string;
  lotCode: string;
  result: QcResult;
  notes: string;
  manufacturingDate?: string;
  expiryDate?: string;
  supplierTraceability?: AvailabilityStatus;
  supplierQualityCheck?: CheckStatus;
  inspectionMethod?: InspectionMethod;
  sampleTestReport?: AvailabilityStatus;
  incomingQualityCheck?: CheckStatus;
  storageConditions?: string;
  shelfLifeDays?: number;
  hazardClassification?: string;
  handlingInstructions?: string;
  msdsAvailable?: AvailabilityStatus;
  packagingType?: string;
};

export type WorkOrderStatus = "planned" | "in_progress" | "completed" | "hold";

export type WorkOrder = {
  id: string;
  productId: string;
  targetQty: number;
  status: WorkOrderStatus;
  dueDate: string;
};

export type PurchaseOrder = {
  id: string;
  supplier: string;
  itemId: string;
  qty: number;
  eta: string;
  status: "draft" | "sent" | "received";
};

export type SupplierOrigin = "abroad" | "local";

export type ContractType = "one_time" | "blanket";

export type ContractDuration = "1_year" | "2_year" | "3_year";

export type Supplier = {
  id: string;
  name: string;
  code: string;
  address: string;
  contactNumber: string;
  email: string;
  origin: SupplierOrigin;
  incoTerms: string;
  leadTimeDays: number;
  minimumOrderQuantity: number;
  purchaseUnitPrice: number;
  lastPurchasePrice: number;
  contractType: ContractType;
  contractDuration: ContractDuration;
  active: boolean;
};

export type SalesOrder = {
  id: string;
  customer: string;
  itemId: string;
  qty: number;
  dueDate: string;
  status: "open" | "allocated" | "shipped";
};

export type AlertSeverity = "low" | "medium" | "high";

export type Alert = {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
};

export type KPI = {
  id: string;
  label: string;
  value: number;
  unit: string;
  delta: number;
};

export type SalesRecord = {
  id: string;
  itemId: string;
  date: string;
  qty: number;
  unitPrice?: number;
  channel?: string;
};

export type MaterialUsageRecord = {
  id: string;
  materialId: string;
  date: string;
  qtyUsed: number;
  source?: string;
};

export type MaterialReceiptRecord = {
  id: string;
  materialId: string;
  date: string;
  qtyReceived: number;
  supplier?: string;
};

export type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  createdAt: string;
};
