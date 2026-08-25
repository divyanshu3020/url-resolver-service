import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { redisClient } from "../lib/redis";
import { scyllaClient } from "../lib/scylladb";
import { logger } from "../lib/logger";

interface ResolveParams {
  shortcode: string;
}

const apiV1Router: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // 1. Resolve/Redirect Endpoint
  fastify.get<{ Params: ResolveParams }>(
    "/:shortcode",
    {
      schema: {
        params: {
          type: "object",
          required: ["shortcode"],
          properties: {
            shortcode: {
              type: "string",
              pattern: "^[A-Za-z0-9_-]+$",
              maxLength: 64,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const startTime = performance.now();
      const { shortcode } = request.params;

      // 1. Check Redis Cache
      logger.info(`🔍 [Resolve] Checking Redis cache for code: ${shortcode}`);
      try {
        const cachedUrl = await redisClient.get(shortcode);
        if (cachedUrl) {
          logger.info(
            `🎯 [Resolve] Cache HIT: ${shortcode} -> ${cachedUrl} in ${(performance.now() - startTime).toFixed(2)}ms`,
          );
          return reply.redirect(cachedUrl);
        }
      } catch (err: any) {
        logger.warn(`⚠️ [Resolve] Redis lookup error: ${err.message || err}`);
      }

      // 2. Check ScyllaDB on Cache Miss
      logger.info(
        `🔍 [Resolve] Cache MISS. Querying ScyllaDB for code: ${shortcode}`,
      );
      try {
        const result = await scyllaClient.execute(
          "SELECT long_url FROM shortener.urls WHERE short_code = ?",
          [shortcode],
          { prepare: true },
        );

        const row = result.rows ? result.rows[0] : null;
        if (row) {
          const longUrl = row.long_url;
          logger.info(
            `🎯 [Resolve] ScyllaDB HIT: ${shortcode} -> ${longUrl} in ${(performance.now() - startTime).toFixed(2)}ms`,
          );

          // Write back to cache (7 days TTL)
          await redisClient
            .set(shortcode, longUrl, "EX", 604800)
            .catch((err) => {
              logger.warn(
                `⚠️ [Resolve] Failed to update Redis cache: ${err.message || err}`,
              );
            });

          return reply.redirect(longUrl);
        }
      } catch (err: any) {
        logger.error(`❌ [Resolve] ScyllaDB error: ${err.message || err}`);
        return reply
          .status(500)
          .send({ success: false, message: "Database query failed" });
      }

      logger.info(
        `🚫 [Resolve] Code not found: ${shortcode} in ${(performance.now() - startTime).toFixed(2)}ms`,
      );
      return reply
        .status(404)
        .send({ success: false, message: "Short URL not found" });
    },
  );
};

export default apiV1Router;
