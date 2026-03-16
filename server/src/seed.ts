import { count, eq } from "drizzle-orm";
import { db, sql } from "./db/client.js";
import { companies, users } from "./db/schema.js";
import { hashPassword } from "./lib/auth.js";

const seedEnv = {
  companyName: process.env.DEFAULT_COMPANY_NAME?.trim() ?? "",
  adminName: process.env.SUPER_ADMIN_NAME?.trim() ?? "",
  adminEmail: process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() ?? "",
  adminPassword: process.env.SUPER_ADMIN_PASSWORD ?? ""
};

const run = async () => {
  if (
    !seedEnv.companyName ||
    !seedEnv.adminName ||
    !seedEnv.adminEmail ||
    !seedEnv.adminPassword
  ) {
    console.log(
      "Seed skipped. Provide DEFAULT_COMPANY_NAME, SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD only when you intentionally want env-based bootstrap."
    );
    await sql.end();
    return;
  }

  const [companyCount] = await db.select({ value: count() }).from(companies);

  let companyId: string;

  if (Number(companyCount.value) === 0) {
    const [newCompany] = await db
      .insert(companies)
      .values({
        name: seedEnv.companyName,
        plan: "Enterprise",
        active: true
      })
      .returning({ id: companies.id });
    companyId = newCompany.id;
    console.log(`Created company: ${seedEnv.companyName}`);
  } else {
    const [existingCompany] = await db
      .select({ id: companies.id })
      .from(companies)
      .orderBy(companies.createdAt)
      .limit(1);
    companyId = existingCompany.id;
  }

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, seedEnv.adminEmail))
    .limit(1);

  if (!existingUser) {
    const passwordHash = await hashPassword(seedEnv.adminPassword);
    await db.insert(users).values({
      companyId,
      name: seedEnv.adminName,
      email: seedEnv.adminEmail,
      passwordHash,
      role: "SUPER_ADMIN",
      active: true
    });
    console.log(`Created super admin: ${seedEnv.adminEmail}`);
  } else {
    console.log("Super admin already exists; skipping user seed.");
  }

  await sql.end();
};

run().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
