import cassandra from "cassandra-driver";
import { logger } from "./logger";

// ==========================================
// 1. ScyllaDB Driver Setup (CQL Protocol)
// ==========================================
export const scyllaClient = new cassandra.Client({
  contactPoints: [process.env.SCYLLA_HOST || "localhost"],
  localDataCenter: "datacenter1",
  authProvider: new cassandra.auth.PlainTextAuthProvider(
    process.env.SCYLLA_USER!,
    process.env.SCYLLA_PASSWORD!
  ),
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
