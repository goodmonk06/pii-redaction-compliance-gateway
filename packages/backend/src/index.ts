import Fastify from 'fastify';
import cors from '@fastify/cors';
import { connectDatabase, disconnectDatabase } from './db/client';
import { profileRoutes } from './routes/profiles';
import { statsRoutes } from './routes/stats';
import { metricsRoutes } from './routes/metrics';
import { errorHandler } from './lib/error-handler';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || true,
  });

  // Register error handler
  fastify.setErrorHandler(errorHandler);

  // Health check
  fastify.get('/health', async (request, reply) => {
    reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Register routes
  await fastify.register(profileRoutes, { prefix: '/api' });
  await fastify.register(statsRoutes, { prefix: '/api' });
  await fastify.register(metricsRoutes, { prefix: '/api' });

  // Connect to database
  await connectDatabase();

  // Handle shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      await fastify.close();
      await disconnectDatabase();
      process.exit(0);
    });
  });

  // Start server
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`
╔═══════════════════════════════════════════════════════╗
║   PII Redaction Compliance Gateway - API Server       ║
╚═══════════════════════════════════════════════════════╝

🚀 Server running at: http://${HOST}:${PORT}
📊 Health check: http://${HOST}:${PORT}/health
🔒 API endpoints: http://${HOST}:${PORT}/api/*

Environment: ${process.env.NODE_ENV || 'development'}
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
