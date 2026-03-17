import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:8081"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  DEFAULT_COMPANY_NAME: z.string().optional().default(""),
  SUPER_ADMIN_NAME: z.string().optional().default(""),
  SUPER_ADMIN_EMAIL: z.string().optional().default(""),
  SUPER_ADMIN_PASSWORD: z.string().optional().default("")
});

export const env = envSchema.parse(process.env);
