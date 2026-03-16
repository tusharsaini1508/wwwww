import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";
import {
  Alert,
  AuditEvent,
  Bin,
  BOMLine,
  Company,
  CompanyLimit,
  InventoryBalance,
  Item,
  KPI,
  Location,
  MaterialReceiptRecord,
  MaterialUsageRecord,
  PurchaseOrder,
  Permission,
  QcInspection,
  Role,
  RoleOverrides,
  ReturnRecord,
  Supplier,
  SalesRecord,
  SalesOrder,
  Transfer,
  User,
  Warehouse,
  WorkOrder,
  CycleCount
} from "../types";
import {
  alerts,
  auditEvents,
  bins,
  bomLines,
  companies,
  cycleCounts,
  inventory,
  items,
  kpis,
  locations,
  materialReceipts,
  materialUsage,
  purchaseOrders,
  qcInspections,
  returnRecords,
  salesHistory,
  salesOrders,
  suppliers,
  transfers,
  users,
  warehouses,
  workOrders
} from "./initialData";
import { getISTNow } from "../lib/time";

const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
};

const sanitizeItemPatch = (patch: Partial<Item>): Partial<Item> => {
  const next: Partial<Item> = { ...patch };
  if (typeof patch.name === "string") {
    next.name = patch.name.trim();
  }
  if (typeof patch.sku === "string") {
    next.sku = patch.sku.trim();
  }
  if (typeof patch.description === "string") {
    next.description = patch.description.trim();
  }
  if (typeof patch.categoryGroup === "string") {
    next.categoryGroup = patch.categoryGroup.trim();
  }
  if (typeof patch.workStationName === "string") {
    next.workStationName = patch.workStationName.trim();
  }
  if (typeof patch.commodityCode === "string") {
    next.commodityCode = patch.commodityCode.trim();
  }
  if (typeof patch.hsnNumber === "string") {
    next.hsnNumber = patch.hsnNumber.trim();
  }
  if (typeof patch.barcode === "string") {
    next.barcode = patch.barcode.trim();
  }
  if (typeof patch.imageUri === "string") {
    const value = patch.imageUri.trim();
    next.imageUri = value ? value : undefined;
  }
  if (typeof patch.uom === "string") {
    next.uom = patch.uom.trim();
  }
  if (typeof patch.reorderPoint === "number") {
    next.reorderPoint = clampNumber(patch.reorderPoint, 0, Number.POSITIVE_INFINITY);
  }
  if (typeof patch.safetyStock === "number") {
    next.safetyStock = clampNumber(patch.safetyStock, 0, Number.POSITIVE_INFINITY);
  }
  if (typeof patch.reorderQuantity === "number") {
    next.reorderQuantity = clampNumber(
      patch.reorderQuantity,
      0,
      Number.POSITIVE_INFINITY
    );
  }
  if (typeof patch.minStock === "number") {
    next.minStock = clampNumber(patch.minStock, 0, Number.POSITIVE_INFINITY);
  }
  if (typeof patch.maxStock === "number") {
    next.maxStock = clampNumber(patch.maxStock, 0, Number.POSITIVE_INFINITY);
  }
  if (typeof patch.unitCost === "number") {
    next.unitCost = clampNumber(patch.unitCost, 0, Number.POSITIVE_INFINITY);
  }
  if (typeof patch.leadTimeDays === "number") {
    next.leadTimeDays = clampNumber(patch.leadTimeDays, 0, Number.POSITIVE_INFINITY);
  }
  if (typeof patch.yieldPercent === "number") {
    next.yieldPercent = clampNumber(patch.yieldPercent, 0, 100);
  }
  if (typeof patch.scrapPercent === "number") {
    next.scrapPercent = clampNumber(patch.scrapPercent, 0, 100);
  }
  if (Array.isArray(patch.approvedSupplierIds)) {
    next.approvedSupplierIds = patch.approvedSupplierIds
      .filter((id) => typeof id === "string" && id.trim())
      .slice(0, 3);
  }
  return next;
};

const sanitizeSupplierPatch = (patch: Partial<Supplier>): Partial<Supplier> => {
  const next: Partial<Supplier> = { ...patch };
  if (typeof patch.name === "string") {
    next.name = patch.name.trim();
  }
  if (typeof patch.code === "string") {
    next.code = patch.code.trim();
  }
  if (typeof patch.address === "string") {
    next.address = patch.address.trim();
  }
  if (typeof patch.contactNumber === "string") {
    next.contactNumber = patch.contactNumber.trim();
  }
  if (typeof patch.email === "string") {
    next.email = patch.email.trim().toLowerCase();
  }
  if (typeof patch.incoTerms === "string") {
    next.incoTerms = patch.incoTerms.trim();
  }
  if (typeof patch.leadTimeDays === "number") {
    next.leadTimeDays = clampNumber(patch.leadTimeDays, 0, Number.POSITIVE_INFINITY);
  }
  if (typeof patch.minimumOrderQuantity === "number") {
    next.minimumOrderQuantity = clampNumber(
      patch.minimumOrderQuantity,
      0,
      Number.POSITIVE_INFINITY
    );
  }
  if (typeof patch.purchaseUnitPrice === "number") {
    next.purchaseUnitPrice = clampNumber(
      patch.purchaseUnitPrice,
      0,
      Number.POSITIVE_INFINITY
    );
  }
  if (typeof patch.lastPurchasePrice === "number") {
    next.lastPurchasePrice = clampNumber(
      patch.lastPurchasePrice,
      0,
      Number.POSITIVE_INFINITY
    );
  }
  return next;
};

type BomInputLine = {
  id?: string;
  finishedProductId: string;
  materialId: string;
  qtyPerUnit: number;
};

const normalizeBomLines = (lines: BomInputLine[], items: Item[]) => {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const normalized: BomInputLine[] = [];

  lines.forEach((line) => {
    if (!line.finishedProductId || !line.materialId) {
      return;
    }
    const finished = itemMap.get(line.finishedProductId);
    const material = itemMap.get(line.materialId);
    if (!finished || finished.type !== "finished") {
      return;
    }
    if (!material || material.type !== "material") {
      return;
    }
    if (!Number.isFinite(line.qtyPerUnit) || line.qtyPerUnit <= 0) {
      return;
    }
    const key = `${line.finishedProductId}:${line.materialId}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    normalized.push({
      ...line,
      qtyPerUnit: clampNumber(line.qtyPerUnit, 0, Number.POSITIVE_INFINITY)
    });
  });

  return normalized;
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const SESSION_DURATION_DAYS = 7;
const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

const normalizeSalesRecords = (records: SalesRecord[], items: Item[]) => {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  return records
    .filter((record) => itemMap.has(record.itemId))
    .filter((record) => isIsoDate(record.date))
    .map((record) => ({
      ...record,
      qty: clampNumber(record.qty, 0, Number.POSITIVE_INFINITY),
      unitPrice:
        typeof record.unitPrice === "number"
          ? clampNumber(record.unitPrice, 0, Number.POSITIVE_INFINITY)
          : undefined
    }))
    .filter((record) => record.qty > 0);
};

const normalizeMaterialUsage = (records: MaterialUsageRecord[], items: Item[]) => {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  return records
    .filter((record) => {
      const item = itemMap.get(record.materialId);
      return item && item.type === "material";
    })
    .filter((record) => isIsoDate(record.date))
    .map((record) => ({
      ...record,
      qtyUsed: clampNumber(record.qtyUsed, 0, Number.POSITIVE_INFINITY)
    }))
    .filter((record) => record.qtyUsed > 0);
};

const normalizeMaterialReceipts = (records: MaterialReceiptRecord[], items: Item[]) => {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  return records
    .filter((record) => {
      const item = itemMap.get(record.materialId);
      return item && item.type === "material";
    })
    .filter((record) => isIsoDate(record.date))
    .map((record) => ({
      ...record,
      qtyReceived: clampNumber(record.qtyReceived, 0, Number.POSITIVE_INFINITY)
    }))
    .filter((record) => record.qtyReceived > 0);
};


export type AppState = {
  currentUserId: string | null;
  authSession: { userId: string; expiresAt: number } | null;
  users: User[];
  roleOverrides: RoleOverrides;
  companies: Company[];
  companyOverrides: Record<string, CompanyLimit>;
  warehouses: Warehouse[];
  locations: Location[];
  bins: Bin[];
  items: Item[];
  bomLines: BOMLine[];
  inventory: InventoryBalance[];
  transfers: Transfer[];
  cycleCounts: CycleCount[];
  returnRecords: ReturnRecord[];
  qcInspections: QcInspection[];
  workOrders: WorkOrder[];
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  salesOrders: SalesOrder[];
  salesHistory: SalesRecord[];
  materialUsage: MaterialUsageRecord[];
  materialReceipts: MaterialReceiptRecord[];
  alerts: Alert[];
  kpis: KPI[];
  audit: AuditEvent[];
  bootstrapSuperAdmin: (payload: {
    companyName: string;
    adminName: string;
    email: string;
    password: string;
  }) => void;
  loginAs: (userId: string, rememberForMs?: number) => void;
  logout: () => void;
  createUser: (payload: Omit<User, "id">) => void;
  updateUser: (userId: string, patch: Partial<User>) => void;
  setRoleOverride: (role: Role, permission: Permission, enabled: boolean) => void;
  createCompany: (payload: Omit<Company, "id">) => void;
  updateCompany: (companyId: string, patch: Partial<Company>) => void;
  createWarehouse: (payload: Omit<Warehouse, "id">) => void;
  updateWarehouse: (warehouseId: string, patch: Partial<Warehouse>) => void;
  createLocation: (payload: Omit<Location, "id">) => void;
  updateLocation: (locationId: string, patch: Partial<Location>) => void;
  createBin: (payload: Omit<Bin, "id">) => void;
  updateBin: (binId: string, patch: Partial<Bin>) => void;
  upsertInventoryBalance: (payload: Omit<InventoryBalance, "id">) => void;
  createTransfer: (payload: Omit<Transfer, "id">) => void;
  updateTransfer: (transferId: string, patch: Partial<Transfer>) => void;
  createCycleCount: (payload: Omit<CycleCount, "id">) => void;
  updateCycleCount: (cycleCountId: string, patch: Partial<CycleCount>) => void;
  createReturnRecord: (payload: Omit<ReturnRecord, "id">) => void;
  updateReturnRecord: (recordId: string, patch: Partial<ReturnRecord>) => void;
  createQcInspection: (payload: Omit<QcInspection, "id">) => void;
  updateQcInspection: (inspectionId: string, patch: Partial<QcInspection>) => void;
  setCompanyOverride: (
    companyId: string,
    permission: Permission,
    enabled: boolean
  ) => void;
  createItem: (payload: Omit<Item, "id">) => string;
  updateItem: (itemId: string, patch: Partial<Item>) => void;
  setBomLinesForProduct: (
    productId: string,
    lines: { materialId: string; qtyPerUnit: number }[]
  ) => void;
  setBomLines: (lines: BOMLine[]) => void;
  setKpis: (kpis: KPI[]) => void;
  addKpi: (kpi: Omit<KPI, "id">) => void;
  setSalesHistory: (records: SalesRecord[]) => void;
  addSalesRecord: (record: Omit<SalesRecord, "id">) => void;
  setMaterialUsage: (records: MaterialUsageRecord[]) => void;
  addMaterialUsageRecord: (record: Omit<MaterialUsageRecord, "id">) => void;
  setMaterialReceipts: (records: MaterialReceiptRecord[]) => void;
  addMaterialReceiptRecord: (record: Omit<MaterialReceiptRecord, "id">) => void;
  createWorkOrder: (payload: Omit<WorkOrder, "id">) => void;
  updateWorkOrder: (workOrderId: string, patch: Partial<WorkOrder>) => void;
  createPurchaseOrder: (payload: Omit<PurchaseOrder, "id">) => void;
  updatePurchaseOrder: (purchaseOrderId: string, patch: Partial<PurchaseOrder>) => void;
  createSupplier: (payload: Omit<Supplier, "id">) => void;
  updateSupplier: (supplierId: string, patch: Partial<Supplier>) => void;
  createSalesOrder: (payload: Omit<SalesOrder, "id">) => void;
  updateSalesOrder: (salesOrderId: string, patch: Partial<SalesOrder>) => void;
  createAuditEvent: (
    event: Omit<AuditEvent, "id" | "actor" | "createdAt"> &
      Partial<Pick<AuditEvent, "actor" | "createdAt">>
  ) => void;
};

const canOverrideRole = (state: AppState, targetRole: Role) => {
  const currentUser = state.users.find((user) => user.id === state.currentUserId);
  if (!currentUser) {
    return false;
  }
  if (targetRole === "ADMIN" || targetRole === "SUPER_ADMIN") {
    return currentUser.role === "SUPER_ADMIN";
  }
  return currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN";
};

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

const getStorage = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return noopStorage;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUserId: null,
      authSession: null,
      users: [...users],
      roleOverrides: {},
      companies: [...companies],
      companyOverrides: {},
      warehouses: [...warehouses],
      locations: [...locations],
      bins: [...bins],
      items: [...items],
      bomLines: [...bomLines],
      inventory: [...inventory],
      transfers: [...transfers],
      cycleCounts: [...cycleCounts],
      returnRecords: [...returnRecords],
      qcInspections: [...qcInspections],
      workOrders: [...workOrders],
      purchaseOrders: [...purchaseOrders],
      suppliers: [...suppliers],
      salesOrders: [...salesOrders],
      salesHistory: [...salesHistory],
      materialUsage: [...materialUsage],
      materialReceipts: [...materialReceipts],
      alerts: [...alerts],
      kpis: [...kpis],
      audit: [...auditEvents],
      bootstrapSuperAdmin: (payload) =>
        set((state) => {
          if (state.users.length > 0 || state.companies.length > 0) {
            return state;
          }
          const companyId = createId("company");
          const userId = createId("user");
          const companyName = payload.companyName.trim();
          const adminName = payload.adminName.trim();
          const email = payload.email.trim().toLowerCase();
          const company: Company = {
            id: companyId,
            name: companyName,
            active: true,
            plan: "Enterprise"
          };
          const superAdmin: User = {
            id: userId,
            name: adminName,
            email,
            password: payload.password,
            companyId,
            role: "SUPER_ADMIN",
            active: true
          };
          return {
            companies: [company],
            users: [superAdmin],
            currentUserId: userId,
            authSession: { userId, expiresAt: Date.now() + SESSION_DURATION_MS },
            audit: [
              {
                id: createId("audit"),
                actor: adminName || "Super Admin",
                action: "Bootstrap platform",
                entity: companyName || "Company",
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      loginAs: (userId, rememberForMs = SESSION_DURATION_MS) =>
        set((state) => {
          const actor = state.users.find((user) => user.id === userId)?.name ?? "User";
          const safeDuration =
            Number.isFinite(rememberForMs) && rememberForMs > 0
              ? rememberForMs
              : SESSION_DURATION_MS;
          const expiresAt = Date.now() + safeDuration;
          return {
            currentUserId: userId,
            authSession: { userId, expiresAt },
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Logged in",
                entity: userId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      logout: () =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ?? "User";
          return {
            currentUserId: null,
            authSession: null,
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Logged out",
                entity: state.currentUserId ?? "unknown",
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      createUser: (payload) =>
        set((state) => {
          const id = createId("user");
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextUsers = [...state.users, { ...payload, id }];
          return {
            users: nextUsers,
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Created user",
                entity: payload.email,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      updateUser: (userId, patch) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const updated = state.users.map((user) =>
            user.id === userId ? { ...user, ...patch } : user
          );
          return {
            users: updated,
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Updated user",
                entity: userId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      setRoleOverride: (role, permission, enabled) =>
        set((state) => {
          if (!canOverrideRole(state, role)) {
            return state;
          }
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          return {
            roleOverrides: {
              ...state.roleOverrides,
              [role]: {
                ...state.roleOverrides[role],
                [permission]: enabled
              }
            },
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Override role permission",
                entity: `${role}.${permission}=${enabled}`,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      createCompany: (payload) =>
        set((state) => {
          const id = createId("company");
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          return {
            companies: [...state.companies, { ...payload, id }],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Created company",
                entity: payload.name,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      updateCompany: (companyId, patch) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          return {
            companies: state.companies.map((company) =>
              company.id === companyId ? { ...company, ...patch } : company
            ),
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Updated company",
                entity: companyId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      createWarehouse: (payload) =>
        set((state) => {
          const name = payload.name.trim();
          if (!name) {
            return state;
          }
          const id = createId("wh");
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          return {
            warehouses: [...state.warehouses, { ...payload, name, id }],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Created warehouse",
                entity: name,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      updateWarehouse: (warehouseId, patch) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextName =
            typeof patch.name === "string" ? patch.name.trim() : undefined;
          return {
            warehouses: state.warehouses.map((warehouse) =>
              warehouse.id === warehouseId
                ? { ...warehouse, ...patch, name: nextName ?? warehouse.name }
                : warehouse
            ),
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Updated warehouse",
                entity: warehouseId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      createLocation: (payload) =>
        set((state) => {
          const zone = payload.zone.trim();
          const rackNumber =
            typeof payload.rackNumber === "string" ? payload.rackNumber.trim() : "";
          if (!payload.warehouseId || !zone) {
            return state;
          }
          const id = createId("loc");
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          return {
            locations: [
              ...state.locations,
              { ...payload, zone, rackNumber: rackNumber || undefined, id }
            ],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Created location",
                entity: `${payload.warehouseId}:${zone}`,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      updateLocation: (locationId, patch) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextZone =
            typeof patch.zone === "string" ? patch.zone.trim() : undefined;
          const nextRack =
            typeof patch.rackNumber === "string" ? patch.rackNumber.trim() : undefined;
          return {
            locations: state.locations.map((location) =>
              location.id === locationId
                ? {
                    ...location,
                    ...patch,
                    zone: nextZone ?? location.zone,
                    rackNumber: nextRack ?? location.rackNumber
                  }
                : location
            ),
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Updated location",
                entity: locationId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      createBin: (payload) =>
        set((state) => {
          const code = payload.code.trim();
          const capacity = clampNumber(payload.capacity, 0, Number.POSITIVE_INFINITY);
          const binNumber =
            typeof payload.binNumber === "string" ? payload.binNumber.trim() : "";
          if (!payload.locationId || !code) {
            return state;
          }
          const id = createId("bin");
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          return {
            bins: [
              ...state.bins,
              { ...payload, code, capacity, binNumber: binNumber || undefined, id }
            ],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Created bin",
                entity: code,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      updateBin: (binId, patch) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextCode =
            typeof patch.code === "string" ? patch.code.trim() : undefined;
          const nextBinNumber =
            typeof patch.binNumber === "string" ? patch.binNumber.trim() : undefined;
          const nextCapacity =
            typeof patch.capacity === "number"
              ? clampNumber(patch.capacity, 0, Number.POSITIVE_INFINITY)
              : undefined;
          return {
            bins: state.bins.map((bin) =>
              bin.id === binId
                ? {
                    ...bin,
                    ...patch,
                    code: nextCode ?? bin.code,
                    capacity: nextCapacity ?? bin.capacity,
                    binNumber: nextBinNumber ?? bin.binNumber
                  }
                : bin
            ),
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Updated bin",
                entity: binId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      upsertInventoryBalance: (payload) =>
        set((state) => {
          if (!payload.itemId || !payload.binId) {
            return state;
          }
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const onHand = clampNumber(payload.onHand, 0, Number.POSITIVE_INFINITY);
          const reservedRaw = clampNumber(payload.reserved, 0, Number.POSITIVE_INFINITY);
          const reserved = Math.min(reservedRaw, onHand);
          const lotCode = payload.lotCode?.trim() || undefined;
          const expiryDate = payload.expiryDate?.trim() || undefined;
          const existing = state.inventory.find(
            (balance) =>
              balance.itemId === payload.itemId && balance.binId === payload.binId
          );
          const lineSideRackQty = clampNumber(
            payload.lineSideRackQty ?? existing?.lineSideRackQty ?? 0,
            0,
            Number.POSITIVE_INFINITY
          );
          const lineSideBinQty = clampNumber(
            payload.lineSideBinQty ?? existing?.lineSideBinQty ?? 0,
            0,
            Number.POSITIVE_INFINITY
          );
          const annualCheckCompleted =
            typeof payload.annualCheckCompleted === "boolean"
              ? payload.annualCheckCompleted
              : existing?.annualCheckCompleted ?? false;
          const nextInventory = existing
            ? state.inventory.map((balance) =>
                balance.id === existing.id
                  ? {
                      ...balance,
                      onHand,
                      reserved,
                      lotCode,
                      expiryDate,
                      lineSideRackQty,
                      lineSideBinQty,
                      annualCheckCompleted
                    }
                  : balance
              )
            : [
                ...state.inventory,
                {
                  ...payload,
                  id: createId("inv"),
                  onHand,
                  reserved,
                  lotCode,
                  expiryDate,
                  lineSideRackQty,
                  lineSideBinQty,
                  annualCheckCompleted
                }
              ];
          return {
            inventory: nextInventory,
            audit: [
              {
                id: createId("audit"),
                actor,
                action: existing ? "Updated inventory" : "Created inventory",
                entity: `${payload.itemId}:${payload.binId}`,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      createTransfer: (payload) =>
        set((state) => {
          if (!payload.fromBinId || !payload.toBinId || !payload.itemId) {
            return state;
          }
          const qty = clampNumber(payload.qty, 0, Number.POSITIVE_INFINITY);
          if (qty <= 0) {
            return state;
          }
          const id = createId("tr");
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          return {
            transfers: [...state.transfers, { ...payload, qty, id }],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Created transfer",
                entity: id,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      updateTransfer: (transferId, patch) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextQty =
            typeof patch.qty === "number"
              ? clampNumber(patch.qty, 0, Number.POSITIVE_INFINITY)
              : undefined;
          return {
            transfers: state.transfers.map((transfer) =>
              transfer.id === transferId
                ? { ...transfer, ...patch, qty: nextQty ?? transfer.qty }
                : transfer
            ),
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Updated transfer",
                entity: transferId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      createCycleCount: (payload) =>
        set((state) => {
          const area = payload.area.trim();
          if (!area || !payload.scheduled) {
            return state;
          }
          const id = createId("cc");
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          return {
            cycleCounts: [...state.cycleCounts, { ...payload, area, id }],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Created cycle count",
                entity: area,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      updateCycleCount: (cycleCountId, patch) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextArea =
            typeof patch.area === "string" ? patch.area.trim() : undefined;
          return {
            cycleCounts: state.cycleCounts.map((count) =>
              count.id === cycleCountId
                ? { ...count, ...patch, area: nextArea ?? count.area }
                : count
            ),
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Updated cycle count",
                entity: cycleCountId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      createReturnRecord: (payload) =>
        set((state) => {
          const customer = payload.customer.trim();
          const qty = clampNumber(payload.qty, 0, Number.POSITIVE_INFINITY);
          if (!customer || !payload.itemId || qty <= 0) {
            return state;
          }
          const id = createId("rma");
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          return {
            returnRecords: [...state.returnRecords, { ...payload, customer, qty, id }],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Created return",
                entity: id,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      updateReturnRecord: (recordId, patch) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextCustomer =
            typeof patch.customer === "string" ? patch.customer.trim() : undefined;
          const nextQty =
            typeof patch.qty === "number"
              ? clampNumber(patch.qty, 0, Number.POSITIVE_INFINITY)
              : undefined;
          return {
            returnRecords: state.returnRecords.map((record) =>
              record.id === recordId
                ? {
                    ...record,
                    ...patch,
                    customer: nextCustomer ?? record.customer,
                    qty: nextQty ?? record.qty
                  }
                : record
            ),
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Updated return",
                entity: recordId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      createQcInspection: (payload) =>
        set((state) => {
          const itemId = payload.itemId;
          const lotCode = payload.lotCode.trim();
          const notes = payload.notes.trim();
          if (!itemId || !lotCode) {
            return state;
          }
          const manufacturingDate = payload.manufacturingDate?.trim() || undefined;
          const expiryDate = payload.expiryDate?.trim() || undefined;
          const storageConditions = payload.storageConditions?.trim() || undefined;
          const hazardClassification = payload.hazardClassification?.trim() || undefined;
          const handlingInstructions = payload.handlingInstructions?.trim() || undefined;
          const packagingType = payload.packagingType?.trim() || undefined;
          const shelfLifeDays =
            typeof payload.shelfLifeDays === "number"
              ? clampNumber(payload.shelfLifeDays, 0, Number.POSITIVE_INFINITY)
              : undefined;
          const id = createId("qc");
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextInspection: QcInspection = {
            ...payload,
            id,
            itemId,
            lotCode,
            notes,
            manufacturingDate,
            expiryDate,
            storageConditions,
            hazardClassification,
            handlingInstructions,
            packagingType,
            shelfLifeDays
          };
          return {
            qcInspections: [...state.qcInspections, nextInspection],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Created QC inspection",
                entity: id,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      updateQcInspection: (inspectionId, patch) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextLot =
            typeof patch.lotCode === "string" ? patch.lotCode.trim() : undefined;
          const nextNotes =
            typeof patch.notes === "string" ? patch.notes.trim() : undefined;
          const nextManufacturing =
            typeof patch.manufacturingDate === "string"
              ? patch.manufacturingDate.trim()
              : undefined;
          const nextExpiry =
            typeof patch.expiryDate === "string" ? patch.expiryDate.trim() : undefined;
          const nextStorage =
            typeof patch.storageConditions === "string"
              ? patch.storageConditions.trim()
              : undefined;
          const nextHazard =
            typeof patch.hazardClassification === "string"
              ? patch.hazardClassification.trim()
              : undefined;
          const nextHandling =
            typeof patch.handlingInstructions === "string"
              ? patch.handlingInstructions.trim()
              : undefined;
          const nextPackaging =
            typeof patch.packagingType === "string"
              ? patch.packagingType.trim()
              : undefined;
          const nextShelfLife =
            typeof patch.shelfLifeDays === "number"
              ? clampNumber(patch.shelfLifeDays, 0, Number.POSITIVE_INFINITY)
              : undefined;
          return {
            qcInspections: state.qcInspections.map((inspection) =>
              inspection.id === inspectionId
                ? {
                    ...inspection,
                    ...patch,
                    lotCode: nextLot ?? inspection.lotCode,
                    notes: nextNotes ?? inspection.notes,
                    manufacturingDate: nextManufacturing ?? inspection.manufacturingDate,
                    expiryDate: nextExpiry ?? inspection.expiryDate,
                    storageConditions: nextStorage ?? inspection.storageConditions,
                    hazardClassification: nextHazard ?? inspection.hazardClassification,
                    handlingInstructions: nextHandling ?? inspection.handlingInstructions,
                    packagingType: nextPackaging ?? inspection.packagingType,
                    shelfLifeDays: nextShelfLife ?? inspection.shelfLifeDays
                  }
                : inspection
            ),
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Updated QC inspection",
                entity: inspectionId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      setCompanyOverride: (companyId, permission, enabled) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          return {
            companyOverrides: {
              ...state.companyOverrides,
              [companyId]: {
                ...state.companyOverrides[companyId],
                [permission]: enabled
              }
            },
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Set company limit",
                entity: `${companyId}.${permission}=${enabled}`,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      createItem: (payload) => {
        const id = createId("item");
        const sanitized = sanitizeItemPatch(payload);
        const defaults: Partial<Item> = {
          description: "",
          classification: "consumable",
          categoryGroup: "",
          workStationName: "",
          commodityCode: "",
          hsnNumber: "",
          origin: "local",
          productionType: "production",
          status: "active",
          barcode: "",
          reorderQuantity: 0,
          minStock: 0,
          maxStock: 0,
          stockMethod: "fifo",
          unitCost: 0,
          approvedSupplierIds: []
        };
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const approvedSupplierIds =
            sanitized.approvedSupplierIds ??
            payload.approvedSupplierIds ??
            defaults.approvedSupplierIds;
          return {
            items: [
              ...state.items,
              {
                ...defaults,
                ...payload,
                ...sanitized,
                approvedSupplierIds,
                id
              }
            ],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Created item",
                entity: sanitized.sku ?? payload.sku,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        });
        return id;
      },
      updateItem: (itemId, patch) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const sanitized = sanitizeItemPatch(patch);
          return {
            items: state.items.map((item) =>
              item.id === itemId ? { ...item, ...sanitized } : item
            ),
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Updated item",
                entity: itemId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      setBomLinesForProduct: (productId, lines) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const filtered = state.bomLines.filter(
            (line) => line.finishedProductId !== productId
          );
          const normalized = normalizeBomLines(
            lines.map((line) => ({
              finishedProductId: productId,
              materialId: line.materialId,
              qtyPerUnit: line.qtyPerUnit
            })),
            state.items
          ).map((line) => ({
            id: createId("bom"),
            finishedProductId: line.finishedProductId,
            materialId: line.materialId,
            qtyPerUnit: line.qtyPerUnit
          }));
          return {
            bomLines: [...filtered, ...normalized],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Updated BOM",
                entity: `${productId} lines:${normalized.length}`,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      setBomLines: (lines) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const normalized = normalizeBomLines(lines, state.items).map((line) => ({
            id: line.id ?? createId("bom"),
            finishedProductId: line.finishedProductId,
            materialId: line.materialId,
            qtyPerUnit: line.qtyPerUnit
          }));
          return {
            bomLines: normalized,
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Imported BOM",
                entity: `lines:${normalized.length}`,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      setKpis: (nextKpis) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          return {
            kpis: nextKpis,
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Imported KPI set",
                entity: `kpis:${nextKpis.length}`,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      addKpi: (kpi) =>
        set((state) => {
          const label = kpi.label.trim();
          if (!label) {
            return state;
          }
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const safeValue = Number.isFinite(kpi.value) ? kpi.value : 0;
          const safeDelta = Number.isFinite(kpi.delta) ? kpi.delta : 0;
          const nextKpi: KPI = {
            ...kpi,
            id: createId("kpi"),
            label,
            value: clampNumber(safeValue, 0, Number.POSITIVE_INFINITY),
            delta: clampNumber(safeDelta, -1_000_000, 1_000_000)
          };
          return {
            kpis: [...state.kpis, nextKpi],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Added KPI",
                entity: label,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      setSalesHistory: (records) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const normalized = normalizeSalesRecords(records, state.items).map(
            (record) => ({
              ...record,
              id: record.id || createId("sale")
            })
          );
          return {
            salesHistory: normalized,
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Imported sales history",
                entity: `records:${normalized.length}`,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      addSalesRecord: (record) =>
        set((state) => {
          if (!record.itemId || !isIsoDate(record.date)) {
            return state;
          }
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextRecord: SalesRecord = {
            ...record,
            id: createId("sale"),
            qty: clampNumber(record.qty, 0, Number.POSITIVE_INFINITY),
            unitPrice:
              typeof record.unitPrice === "number"
                ? clampNumber(record.unitPrice, 0, Number.POSITIVE_INFINITY)
                : undefined
          };
          return {
            salesHistory: [...state.salesHistory, nextRecord],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Added sales record",
                entity: record.itemId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      setMaterialUsage: (records) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const normalized = normalizeMaterialUsage(records, state.items).map(
            (record) => ({
              ...record,
              id: record.id || createId("usage")
            })
          );
          return {
            materialUsage: normalized,
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Imported material usage",
                entity: `records:${normalized.length}`,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      addMaterialUsageRecord: (record) =>
        set((state) => {
          if (!record.materialId || !isIsoDate(record.date)) {
            return state;
          }
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextRecord: MaterialUsageRecord = {
            ...record,
            id: createId("usage"),
            qtyUsed: clampNumber(record.qtyUsed, 0, Number.POSITIVE_INFINITY)
          };
          return {
            materialUsage: [...state.materialUsage, nextRecord],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Added material usage",
                entity: record.materialId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      setMaterialReceipts: (records) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const normalized = normalizeMaterialReceipts(records, state.items).map(
            (record) => ({
              ...record,
              id: record.id || createId("receipt")
            })
          );
          return {
            materialReceipts: normalized,
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Imported material receipts",
                entity: `records:${normalized.length}`,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      addMaterialReceiptRecord: (record) =>
        set((state) => {
          if (!record.materialId || !isIsoDate(record.date)) {
            return state;
          }
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextRecord: MaterialReceiptRecord = {
            ...record,
            id: createId("receipt"),
            qtyReceived: clampNumber(record.qtyReceived, 0, Number.POSITIVE_INFINITY)
          };
          return {
            materialReceipts: [...state.materialReceipts, nextRecord],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Added material receipt",
                entity: record.materialId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      createWorkOrder: (payload) =>
        set((state) => {
          if (!payload.productId || !isIsoDate(payload.dueDate)) {
            return state;
          }
          const qty = clampNumber(payload.targetQty, 0, Number.POSITIVE_INFINITY);
          if (qty <= 0) {
            return state;
          }
          const id = createId("wo");
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          return {
            workOrders: [...state.workOrders, { ...payload, targetQty: qty, id }],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Created work order",
                entity: id,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      updateWorkOrder: (workOrderId, patch) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextQty =
            typeof patch.targetQty === "number"
              ? clampNumber(patch.targetQty, 0, Number.POSITIVE_INFINITY)
              : undefined;
          return {
            workOrders: state.workOrders.map((order) =>
              order.id === workOrderId
                ? {
                    ...order,
                    ...patch,
                    targetQty: nextQty ?? order.targetQty
                  }
                : order
            ),
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Updated work order",
                entity: workOrderId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      createPurchaseOrder: (payload) =>
        set((state) => {
          if (!payload.itemId || !payload.supplier || !isIsoDate(payload.eta)) {
            return state;
          }
          const qty = clampNumber(payload.qty, 0, Number.POSITIVE_INFINITY);
          if (qty <= 0) {
            return state;
          }
          const id = createId("po");
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          return {
            purchaseOrders: [
              ...state.purchaseOrders,
              { ...payload, qty, supplier: payload.supplier.trim(), id }
            ],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Created purchase order",
                entity: id,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      updatePurchaseOrder: (purchaseOrderId, patch) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextSupplier =
            typeof patch.supplier === "string" ? patch.supplier.trim() : undefined;
          const nextQty =
            typeof patch.qty === "number"
              ? clampNumber(patch.qty, 0, Number.POSITIVE_INFINITY)
              : undefined;
          return {
            purchaseOrders: state.purchaseOrders.map((order) =>
              order.id === purchaseOrderId
                ? {
                    ...order,
                    ...patch,
                    supplier: nextSupplier ?? order.supplier,
                    qty: nextQty ?? order.qty
                  }
                : order
            ),
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Updated purchase order",
                entity: purchaseOrderId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      createSupplier: (payload) =>
        set((state) => {
          const sanitized = sanitizeSupplierPatch(payload);
          const name = sanitized.name ?? payload.name?.trim() ?? "";
          const code = sanitized.code ?? payload.code?.trim() ?? "";
          if (!name || !code) {
            return state;
          }
          const id = createId("supplier");
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextSupplier: Supplier = {
            id,
            name,
            code,
            address: sanitized.address ?? payload.address ?? "",
            contactNumber: sanitized.contactNumber ?? payload.contactNumber ?? "",
            email: sanitized.email ?? payload.email ?? "",
            origin: payload.origin ?? "local",
            incoTerms: sanitized.incoTerms ?? payload.incoTerms ?? "",
            leadTimeDays: sanitized.leadTimeDays ?? payload.leadTimeDays ?? 0,
            minimumOrderQuantity:
              sanitized.minimumOrderQuantity ?? payload.minimumOrderQuantity ?? 0,
            purchaseUnitPrice:
              sanitized.purchaseUnitPrice ?? payload.purchaseUnitPrice ?? 0,
            lastPurchasePrice:
              sanitized.lastPurchasePrice ?? payload.lastPurchasePrice ?? 0,
            contractType: payload.contractType ?? "one_time",
            contractDuration: payload.contractDuration ?? "1_year",
            active: typeof payload.active === "boolean" ? payload.active : true
          };
          return {
            suppliers: [...state.suppliers, nextSupplier],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Created supplier",
                entity: name,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      updateSupplier: (supplierId, patch) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const sanitized = sanitizeSupplierPatch(patch);
          return {
            suppliers: state.suppliers.map((supplier) =>
              supplier.id === supplierId
                ? {
                    ...supplier,
                    ...patch,
                    ...sanitized,
                    name: sanitized.name ?? supplier.name,
                    code: sanitized.code ?? supplier.code
                  }
                : supplier
            ),
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Updated supplier",
                entity: supplierId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      createSalesOrder: (payload) =>
        set((state) => {
          if (!payload.itemId || !payload.customer || !isIsoDate(payload.dueDate)) {
            return state;
          }
          const qty = clampNumber(payload.qty, 0, Number.POSITIVE_INFINITY);
          if (qty <= 0) {
            return state;
          }
          const id = createId("so");
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          return {
            salesOrders: [
              ...state.salesOrders,
              { ...payload, qty, customer: payload.customer.trim(), id }
            ],
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Created sales order",
                entity: id,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      updateSalesOrder: (salesOrderId, patch) =>
        set((state) => {
          const actor =
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          const nextCustomer =
            typeof patch.customer === "string" ? patch.customer.trim() : undefined;
          const nextQty =
            typeof patch.qty === "number"
              ? clampNumber(patch.qty, 0, Number.POSITIVE_INFINITY)
              : undefined;
          return {
            salesOrders: state.salesOrders.map((order) =>
              order.id === salesOrderId
                ? {
                    ...order,
                    ...patch,
                    customer: nextCustomer ?? order.customer,
                    qty: nextQty ?? order.qty
                  }
                : order
            ),
            audit: [
              {
                id: createId("audit"),
                actor,
                action: "Updated sales order",
                entity: salesOrderId,
                createdAt: getISTNow()
              },
              ...state.audit
            ]
          };
        }),
      createAuditEvent: (event) =>
        set((state) => {
          const actor =
            event.actor ??
            state.users.find((user) => user.id === state.currentUserId)?.name ??
            "System";
          return {
            audit: [
              {
                ...event,
                id: createId("audit"),
                actor,
                createdAt: event.createdAt ?? getISTNow()
              },
              ...state.audit
            ]
          };
        })
    }),
    {
      name: "wms-app-store",
      storage: createJSONStorage(getStorage),
      version: 2,
      migrate: (persistedState: unknown, version) => {
        if (version < 2) {
          const legacy = (persistedState ?? {}) as Partial<AppState>;
          return {
            ...legacy,
            currentUserId: null,
            authSession: null
          } as AppState;
        }
        return persistedState as AppState;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }

        if (!state.currentUserId || !state.authSession) {
          state.currentUserId = null;
          state.authSession = null;
          return;
        }

        const now = Date.now();
        if (
          state.authSession.expiresAt <= now ||
          state.authSession.userId !== state.currentUserId
        ) {
          state.currentUserId = null;
          state.authSession = null;
          return;
        }

        const persistedUser = state.users.find((user) => user.id === state.currentUserId);
        if (!persistedUser || !persistedUser.active) {
          state.currentUserId = null;
          state.authSession = null;
          return;
        }

        if (persistedUser.role !== "SUPER_ADMIN") {
          const company = state.companies.find((item) => item.id === persistedUser.companyId);
          if (company && !company.active) {
            state.currentUserId = null;
            state.authSession = null;
          }
        }
      }
    }
  )
);
