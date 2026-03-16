import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "./env.js";
import { authRoutes } from "./routes/auth.js";
import { companyRoutes } from "./routes/companies.js";
import { inventoryRoutes } from "./routes/inventory.js";
import { setupRoutes } from "./routes/setup.js";

const parseAllowedOrigins = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const matchesOriginPattern = (origin: string, pattern: string) => {
  if (pattern === "*") {
    return true;
  }

  if (!pattern.includes("*")) {
    return origin === pattern;
  }

  try {
    const originUrl = new URL(origin);

    if (pattern.startsWith("http://*.")) {
      const hostPattern = pattern.replace("http://*.", "");
      return originUrl.protocol === "http:" && originUrl.hostname.endsWith(`.${hostPattern}`);
    }

    if (pattern.startsWith("https://*.")) {
      const hostPattern = pattern.replace("https://*.", "");
      return (
        originUrl.protocol === "https:" && originUrl.hostname.endsWith(`.${hostPattern}`)
      );
    }

    if (pattern.startsWith("*.")) {
      const hostPattern = pattern.replace("*.", "");
      return originUrl.hostname.endsWith(`.${hostPattern}`);
    }
  } catch {
    return false;
  }

  return false;
};

export const buildServer = () => {
  const app = Fastify({ logger: true });
  const allowedOrigins = parseAllowedOrigins(env.CORS_ORIGIN);

  app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowed = allowedOrigins.some((pattern) => matchesOriginPattern(origin, pattern));
      callback(null, allowed);
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    maxAge: 86400
  });

  app.get("/health", async () => ({ ok: true }));
  app.register(setupRoutes, { prefix: "/api" });
  app.register(authRoutes, { prefix: "/api" });
  app.register(companyRoutes, { prefix: "/api" });
  app.register(inventoryRoutes, { prefix: "/api" });

  return app;
};
