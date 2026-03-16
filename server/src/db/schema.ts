import {
  boolean,
  doublePrecision,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "PLANNER",
  "OPERATOR",
  "VIEWER"
]);

export const companyPlanEnum = pgEnum("company_plan", ["Starter", "Growth", "Enterprise"]);

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  plan: companyPlanEnum("plan").notNull().default("Enterprise"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    emailUnique: unique("users_email_unique").on(table.email)
  })
);

export const inventoryBalances = pgTable(
  "inventory_balances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    itemSku: text("item_sku").notNull(),
    itemName: text("item_name").notNull(),
    warehouseCode: text("warehouse_code").notNull(),
    quantity: doublePrecision("quantity").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    companySkuWarehouseUnique: unique("inventory_company_sku_wh_unique").on(
      table.companyId,
      table.itemSku,
      table.warehouseCode
    )
  })
);

export type Company = typeof companies.$inferSelect;
export type User = typeof users.$inferSelect;
export type InventoryBalance = typeof inventoryBalances.$inferSelect;
