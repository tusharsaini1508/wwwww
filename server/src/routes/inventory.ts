import { and, asc, eq } from "drizzle-orm";
import { type FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { inventoryBalances } from "../db/schema.js";
import { authenticate } from "../plugins/authenticate.js";

const upsertInventorySchema = z.object({
  companyId: z.string().uuid().optional(),
  itemSku: z.string().trim().min(1).max(120),
  itemName: z.string().trim().min(1).max(220),
  warehouseCode: z.string().trim().min(1).max(120),
  quantity: z.coerce.number().min(0)
});

export const inventoryRoutes: FastifyPluginAsync = async (app) => {
  app.post("/inventory/upsert", { preHandler: [authenticate] }, async (request, reply) => {
    const auth = request.auth;
    if (!auth) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const parsed = upsertInventorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid inventory payload" });
    }

    const payload = parsed.data;
    const targetCompanyId =
      auth.role === "SUPER_ADMIN"
        ? payload.companyId ?? auth.companyId
        : auth.companyId;

    const [existing] = await db
      .select({ id: inventoryBalances.id })
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.companyId, targetCompanyId),
          eq(inventoryBalances.itemSku, payload.itemSku),
          eq(inventoryBalances.warehouseCode, payload.warehouseCode)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(inventoryBalances)
        .set({
          itemName: payload.itemName,
          quantity: payload.quantity,
          updatedAt: new Date()
        })
        .where(eq(inventoryBalances.id, existing.id))
        .returning();
      return reply.send({ inventory: updated });
    }

    const [created] = await db
      .insert(inventoryBalances)
      .values({
        companyId: targetCompanyId,
        itemSku: payload.itemSku,
        itemName: payload.itemName,
        warehouseCode: payload.warehouseCode,
        quantity: payload.quantity
      })
      .returning();

    return reply.code(201).send({ inventory: created });
  });

  app.get("/inventory", { preHandler: [authenticate] }, async (request, reply) => {
    const auth = request.auth;
    if (!auth) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const skuFilter =
      typeof request.query === "object" && request.query !== null
        ? (request.query as Record<string, unknown>).sku
        : undefined;

    const sku = typeof skuFilter === "string" ? skuFilter.trim() : "";

    if (auth.role === "SUPER_ADMIN") {
      const rows = sku
        ? await db
            .select()
            .from(inventoryBalances)
            .where(eq(inventoryBalances.itemSku, sku))
            .orderBy(asc(inventoryBalances.itemSku), asc(inventoryBalances.warehouseCode))
        : await db
            .select()
            .from(inventoryBalances)
            .orderBy(asc(inventoryBalances.itemSku), asc(inventoryBalances.warehouseCode));
      return reply.send({ inventory: rows });
    }

    const rows = sku
      ? await db
          .select()
          .from(inventoryBalances)
          .where(
            and(
              eq(inventoryBalances.companyId, auth.companyId),
              eq(inventoryBalances.itemSku, sku)
            )
          )
          .orderBy(asc(inventoryBalances.itemSku), asc(inventoryBalances.warehouseCode))
      : await db
          .select()
          .from(inventoryBalances)
          .where(eq(inventoryBalances.companyId, auth.companyId))
          .orderBy(asc(inventoryBalances.itemSku), asc(inventoryBalances.warehouseCode));

    return reply.send({ inventory: rows });
  });
};
