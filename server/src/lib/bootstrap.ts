import { count, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { companies, users } from "../db/schema.js";
import { env } from "../env.js";
import { hashPassword } from "./auth.js";

const bootstrapEnv = {
  companyName: env.DEFAULT_COMPANY_NAME.trim(),
  adminName: env.SUPER_ADMIN_NAME.trim(),
  adminEmail: env.SUPER_ADMIN_EMAIL.trim().toLowerCase(),
  adminPassword: env.SUPER_ADMIN_PASSWORD
};

const hasBootstrapEnv =
  bootstrapEnv.companyName.length > 0 &&
  bootstrapEnv.adminName.length > 0 &&
  bootstrapEnv.adminEmail.length > 0 &&
  bootstrapEnv.adminPassword.length > 0;

export const ensureBootstrapFromEnv = async () => {
  if (!hasBootstrapEnv) {
    return { bootstrapped: false, reason: "env_not_configured" as const };
  }

  const [userCount] = await db.select({ value: count() }).from(users);
  if (Number(userCount.value) > 0) {
    return { bootstrapped: false, reason: "already_initialized" as const };
  }

  const passwordHash = await hashPassword(bootstrapEnv.adminPassword);

  await db.transaction(async (tx) => {
    const [company] = await tx
      .insert(companies)
      .values({
        name: bootstrapEnv.companyName,
        plan: "Enterprise",
        active: true
      })
      .returning({ id: companies.id });

    const [existingUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, bootstrapEnv.adminEmail))
      .limit(1);

    if (!existingUser) {
      await tx.insert(users).values({
        companyId: company.id,
        name: bootstrapEnv.adminName,
        email: bootstrapEnv.adminEmail,
        passwordHash,
        role: "SUPER_ADMIN",
        active: true
      });
    }
  });

  return { bootstrapped: true, reason: "created" as const };
};
