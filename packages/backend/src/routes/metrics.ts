import { FastifyInstance } from 'fastify';
import { metrics } from '../lib/metrics';

export async function metricsRoutes(fastify: FastifyInstance) {
  // Get all metrics
  fastify.get('/metrics', async (request, reply) => {
    const allMetrics = metrics.export();
    reply.send(allMetrics);
  });

  // Health check with metrics
  fastify.get('/metrics/health', async (request, reply) => {
    const allMetrics = metrics.export();
    reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        counters: Object.keys(allMetrics.counters).length,
        gauges: Object.keys(allMetrics.gauges).length,
        histograms: Object.keys(allMetrics.histograms).length,
      },
    });
  });
}
