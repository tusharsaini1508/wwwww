import { count } from "drizzle-orm";
import { type FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { companies, users } from "../db/schema.js";
import { hashPassword, signAccessToken } from "../lib/auth.js";

const setupPayloadSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128)
});

export const setupRoutes: FastifyPluginAsync = async (app) => {
  app.get("/setup/status", async (_request, reply) => {
    const [result] = await db.select({ value: count() }).from(users);
    const initialized = Number(result.value) > 0;
    return reply.send({ initialized });
  });

  app.post("/setup/init", async (request, reply) => {
    const [result] = await db.select({ value: count() }).from(users);
    if (Number(result.value) > 0) {
      return reply.code(409).send({
        message: "Setup already completed. Super admin exists."
      });
    }

    const parsed = setupPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid setup payload" });
    }

    const payload = parsed.data;
    const normalizedEmail = payload.email.toLowerCase();
    const passwordHash = await hashPassword(payload.password);

    const created = await db.transaction(async (tx) => {
      const [company] = await tx
        .insert(companies)
        .values({
          name: payload.companyName,
          plan: "Enterprise",
          active: true
        })
        .returning({
          id: companies.id,
          name: companies.name,
          plan: companies.plan,
          active: companies.active
        });

      const [user] = await tx
        .insert(users)
        .values({
          companyId: company.id,
          name: payload.name,
          email: normalizedEmail,
          passwordHash,
          role: "SUPER_ADMIN",
          active: true
        })
        .returning({
          id: users.id,
          companyId: users.companyId,
          name: users.name,
          email: users.email,
          role: users.role,
          active: users.active
        });

      return { company, user };
    });

    const accessToken = signAccessToken({
      sub: created.user.id,
      companyId: created.user.companyId,
      role: created.user.role
    });

    return reply.code(201).send({
      initialized: true,
      accessToken,
      company: created.company,
      user: created.user
    });
  });
};
