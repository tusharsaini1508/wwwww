import { sql } from "./db/client.js";

const run = async () => {
  await sql.unsafe("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await sql.end();
};

run().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
