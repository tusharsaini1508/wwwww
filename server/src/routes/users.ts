import { and, asc, eq, ne } from "drizzle-orm";
import { type FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { hashPassword } from "../lib/auth.js";
import { authenticate } from "../plugins/authenticate.js";

const roleSchema = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "PLANNER",
  "OPERATOR",
  "VIEWER"
]);

const createUserSchema = z.object({
  companyId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  role: roleSchema
});

const updateUserSchema = z
  .object({
    companyId: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(120).optional(),
    password: z.string().min(8).max(128).optional(),
    role: roleSchema.optional(),
    active: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No updates provided"
  });

const canManageRole = (
  actorRole: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "PLANNER" | "OPERATOR" | "VIEWER",
  targetRole: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "PLANNER" | "OPERATOR" | "VIEWER"
) => {
  if (actorRole === "SUPER_ADMIN") {
    return targetRole !== "SUPER_ADMIN";
  }

  if (actorRole === "ADMIN") {
    return !["SUPER_ADMIN", "ADMIN"].includes(targetRole);
  }

  return false;
};

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get("/users", { preHandler: [authenticate] }, async (request, reply) => {
    const auth = request.auth;
    if (!auth) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const rows =
      auth.role === "SUPER_ADMIN"
        ? await db
            .select({
              id: users.id,
              companyId: users.companyId,
              name: users.name,
              email: users.email,
              role: users.role,
              active: users.active
            })
            .from(users)
            .where(ne(users.role, "SUPER_ADMIN"))
            .orderBy(asc(users.role), asc(users.name))
        : await db
            .select({
              id: users.id,
              companyId: users.companyId,
              name: users.name,
              email: users.email,
              role: users.role,
              active: users.active
            })
            .from(users)
            .where(eq(users.companyId, auth.companyId))
            .orderBy(asc(users.role), asc(users.name));

    return reply.send({ users: rows });
  });

  app.post("/users", { preHandler: [authenticate] }, async (request, reply) => {
    const auth = request.auth;
    if (!auth || !["SUPER_ADMIN", "ADMIN"].includes(auth.role)) {
      return reply.code(403).send({ message: "You do not have permission to create users" });
    }

    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid user payload" });
    }

    const payload = parsed.data;
    const companyId = auth.role === "SUPER_ADMIN" ? payload.companyId : auth.companyId;
    if (!companyId) {
      return reply.code(400).send({ message: "companyId is required" });
    }

    if (!canManageRole(auth.role, payload.role)) {
      return reply.code(403).send({ message: "You cannot create a user with this role" });
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing) {
      return reply.code(409).send({ message: "An account with this email already exists." });
    }

    const passwordHash = await hashPassword(payload.password);
    const [created] = await db
      .insert(users)
      .values({
        companyId,
        name: payload.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: payload.role,
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

    return reply.code(201).send({ user: created });
  });

  app.patch("/users/:userId", { preHandler: [authenticate] }, async (request, reply) => {
    const auth = request.auth;
    if (!auth || !["SUPER_ADMIN", "ADMIN"].includes(auth.role)) {
      return reply.code(403).send({ message: "You do not have permission to update users" });
    }

    const params = request.params as { userId?: string };
    const userId = params.userId?.trim();
    if (!userId) {
      return reply.code(400).send({ message: "userId is required" });
    }

    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid user update payload" });
    }

    const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      return reply.code(404).send({ message: "User not found" });
    }

    if (auth.role !== "SUPER_ADMIN") {
      if (existing.companyId !== auth.companyId) {
        return reply.code(403).send({ message: "You can only manage users in your company" });
      }
      if (["SUPER_ADMIN", "ADMIN"].includes(existing.role)) {
        return reply.code(403).send({ message: "You cannot modify this user" });
      }
    }

    const updates = parsed.data;
    if (updates.role && !canManageRole(auth.role, updates.role)) {
      return reply.code(403).send({ message: "You cannot assign this role" });
    }

    if (updates.companyId && auth.role !== "SUPER_ADMIN") {
      return reply.code(403).send({ message: "Only super admin can reassign company" });
    }

    const dbUpdate: Partial<typeof users.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date()
    };

    if (typeof updates.name === "string") {
      dbUpdate.name = updates.name.trim();
    }
    if (typeof updates.role === "string") {
      dbUpdate.role = updates.role;
    }
    if (typeof updates.active === "boolean") {
      dbUpdate.active = updates.active;
    }
    if (typeof updates.companyId === "string" && auth.role === "SUPER_ADMIN") {
      dbUpdate.companyId = updates.companyId;
    }
    if (typeof updates.password === "string") {
      dbUpdate.passwordHash = await hashPassword(updates.password);
    }

    const [updated] = await db
      .update(users)
      .set(dbUpdate)
      .where(
        auth.role === "SUPER_ADMIN"
          ? eq(users.id, userId)
          : and(eq(users.id, userId), eq(users.companyId, auth.companyId))
      )
      .returning({
        id: users.id,
        companyId: users.companyId,
        name: users.name,
        email: users.email,
        role: users.role,
        active: users.active
      });

    if (!updated) {
      return reply.code(404).send({ message: "User not found" });
    }

    return reply.send({ user: updated });
  });
};
