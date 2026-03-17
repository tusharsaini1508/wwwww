import { sql } from "./db/client.js";
import { ensureBootstrapFromEnv } from "./lib/bootstrap.js";

const run = async () => {
  const result = await ensureBootstrapFromEnv();
  if (!result.bootstrapped) {
    console.log(
      result.reason === "env_not_configured"
        ? "Seed skipped. Provide DEFAULT_COMPANY_NAME, SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD only when you intentionally want env-based bootstrap."
        : "Super admin already exists; skipping user seed."
    );
  } else {
    console.log("Created company and super admin from environment.");
  }

  await sql.end();
};

run().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
