import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "./env.js";
import { authRoutes } from "./routes/auth.js";
import { companyRoutes } from "./routes/companies.js";
import { inventoryRoutes } from "./routes/inventory.js";
import { setupRoutes } from "./routes/setup.js";

export const buildServer = () => {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((item) => item.trim())
  });

  app.get("/health", async () => ({ ok: true }));
  app.register(setupRoutes, { prefix: "/api" });
  app.register(authRoutes, { prefix: "/api" });
  app.register(companyRoutes, { prefix: "/api" });
  app.register(inventoryRoutes, { prefix: "/api" });

  return app;
};
