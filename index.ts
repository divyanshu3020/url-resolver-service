import Fastify from "fastify";
import cors from "@fastify/cors";
import route from "./api/v1/routes/index";
import { initScyllaDB, scyllaClient } from "./api/v1/lib/scylladb";
import { redisClient } from "./api/v1/lib/redis";
import { logger } from "./api/v1/lib/logger";

const app = Fastify();
const port = Number(process.env.PORT || 3001);

// Allowed Domains
const allowedOrigins = [
  "https://example.com",
  "http://localhost:3000",
  "http://localhost:3001",
];

// Register CORS
app.register(cors, {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Blocked by CORS policy: Origin not allowed."), false);
    }
  },
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["X-Total-Count", "Content-Range"],
  credentials: true,
  maxAge: 86400,
  optionsSuccessStatus: 204,
});

// Register API routes
app.register(route, { prefix: "/api/v1" });

// Health check endpoint
app.get("/health", async (request, reply) => {
  let scyllaStatus = "unknown";
  let redisStatus = "unknown";
  let isHealthy = true;

  try {
    await scyllaClient.execute("SELECT now() FROM system.local");
    scyllaStatus = "connected";
  } catch (err: any) {
    scyllaStatus = `error: ${err.message || err}`;
    isHealthy = false;
  }

  try {
    const pingResponse = await redisClient.ping();
    if (pingResponse === "PONG") {
      redisStatus = "connected";
    } else {
      redisStatus = `error: unexpected response ${pingResponse}`;
      isHealthy = false;
    }
  } catch (err: any) {
    redisStatus = `error: ${err.message || err}`;
    isHealthy = false;
  }

  reply.status(isHealthy ? 200 : 500).send({
    status: isHealthy ? "healthy" : "unhealthy",
    environment: process.env.NODE_ENV,
    services: {
      scylla: scyllaStatus,
      redis: redisStatus,
    },
  });
});

// Start the server
const start = async () => {
  try {
    // Initialize ScyllaDB
    await initScyllaDB();

    const address = await app.listen({ port });
    logger.info(`Url resolver service is up and running on ${address}`);
  } catch (err) {
    logger.error(`Failed to start url resolver: ${err}`);
    process.exit(1);
  }
};

start();
