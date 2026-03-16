import { eq } from "drizzle-orm";
import { type FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import {
  signAccessToken,
  verifyAccessToken,
  verifyPassword
} from "../lib/auth.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const bearerSchema = z.string().startsWith("Bearer ");

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid login payload" });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.active) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!validPassword) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      companyId: user.companyId
    });

    return reply.send({
      accessToken,
      user: {
        id: user.id,
        companyId: user.companyId,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active
      }
    });
  });

  app.get("/auth/me", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !bearerSchema.safeParse(authHeader).success) {
      return reply.code(401).send({ message: "Missing bearer token" });
    }

    try {
      const token = authHeader.replace("Bearer ", "");
      const claims = verifyAccessToken(token);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, claims.sub))
        .limit(1);

      if (!user || !user.active) {
        return reply.code(401).send({ message: "Session invalid" });
      }

      return reply.send({
        user: {
          id: user.id,
          companyId: user.companyId,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active
        }
      });
    } catch {
      return reply.code(401).send({ message: "Token invalid or expired" });
    }
  });
};
