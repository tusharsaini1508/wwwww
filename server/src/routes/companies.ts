import { asc, eq } from "drizzle-orm";
import { type FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { companies } from "../db/schema.js";
import { authenticate } from "../plugins/authenticate.js";

const createCompanySchema = z.object({
  name: z.string().trim().min(2).max(120),
  plan: z.enum(["Starter", "Growth", "Enterprise"]).default("Enterprise")
});

const updateCompanySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  plan: z.enum(["Starter", "Growth", "Enterprise"]).optional(),
  active: z.boolean().optional()
});

export const companyRoutes: FastifyPluginAsync = async (app) => {
  app.post("/companies", { preHandler: [authenticate] }, async (request, reply) => {
    const auth = request.auth;
    if (!auth || auth.role !== "SUPER_ADMIN") {
      return reply.code(403).send({ message: "Only super admin can create companies" });
    }

    const parsed = createCompanySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid company payload" });
    }

    const payload = parsed.data;
    const [existing] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.name, payload.name))
      .limit(1);

    if (existing) {
      return reply.code(409).send({ message: "A company with this name already exists." });
    }

    const [created] = await db
      .insert(companies)
      .values({
        name: payload.name,
        plan: payload.plan,
        active: true
      })
      .returning();

    return reply.code(201).send({ company: created });
  });

  app.patch(
    "/companies/:companyId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const auth = request.auth;
      if (!auth || auth.role !== "SUPER_ADMIN") {
        return reply
          .code(403)
          .send({ message: "Only super admin can update companies" });
      }

      const params = request.params as { companyId?: string };
      const companyId = params.companyId?.trim();
      if (!companyId) {
        return reply.code(400).send({ message: "companyId is required" });
      }

      const parsed = updateCompanySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid company update payload" });
      }

      if (Object.keys(parsed.data).length === 0) {
        return reply.code(400).send({ message: "No updates provided" });
      }

      const [updated] = await db
        .update(companies)
        .set({
          ...parsed.data,
          updatedAt: new Date()
        })
        .where(eq(companies.id, companyId))
        .returning();

      if (!updated) {
        return reply.code(404).send({ message: "Company not found" });
      }

      return reply.send({ company: updated });
    }
  );

  app.get("/companies", { preHandler: [authenticate] }, async (request, reply) => {
    const auth = request.auth;
    if (!auth) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    if (auth.role === "SUPER_ADMIN") {
      const rows = await db.select().from(companies).orderBy(asc(companies.name));
      return reply.send({ companies: rows });
    }

    const rows = await db
      .select()
      .from(companies)
      .where(eq(companies.id, auth.companyId))
      .limit(1);

    return reply.send({ companies: rows });
  });
};
