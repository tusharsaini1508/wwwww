import { sql } from "./db/client.js";
import { env } from "./env.js";
import { buildServer } from "./server.js";

const app = buildServer();

const start = async () => {
  try {
    await app.listen({
      host: "0.0.0.0",
      port: env.PORT
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();

const shutdown = async () => {
  await app.close();
  await sql.end();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
