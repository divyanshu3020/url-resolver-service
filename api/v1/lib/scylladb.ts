import cassandra from "cassandra-driver";
import { logger } from "./logger";

// ==========================================
// 1. ScyllaDB Driver Setup (CQL Protocol)
// ==========================================
const isProduction = process.env.NODE_ENV === "production";
const scyllaHost = process.env.SCYLLA_HOST || "localhost";
const scyllaUser = process.env.SCYLLA_USER;
const scyllaPassword = process.env.SCYLLA_PASSWORD;

if (
  isProduction &&
  (!process.env.SCYLLA_HOST || !scyllaUser || !scyllaPassword)
) {
  throw new Error(
    "SCYLLA_HOST, SCYLLA_USER, and SCYLLA_PASSWORD are required in production",
  );
}

export const scyllaClient = new cassandra.Client({
  contactPoints: [scyllaHost],
  localDataCenter: "datacenter1",
  authProvider:
    scyllaUser && scyllaPassword
      ? new cassandra.auth.PlainTextAuthProvider(scyllaUser, scyllaPassword)
      : undefined,
});

export async function initScyllaDB() {
  try {
    await scyllaClient.connect();
    logger.info("⚡ [ScyllaDB] Connected successfully to read-replica.");
  } catch (err: any) {
    logger.error(`❌ [ScyllaDB] Connection error: ${err.message || err}`);
    process.exit(1);
  }
}
