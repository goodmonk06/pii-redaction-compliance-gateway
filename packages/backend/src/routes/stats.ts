import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client';

export async function statsRoutes(fastify: FastifyInstance) {
  // Get overall stats
  fastify.get('/stats', async (request, reply) => {
    try {
      const [profileCount, runCount, recentRuns] = await Promise.all([
        prisma.redactionProfile.count(),
        prisma.redactionRun.count(),
        prisma.redactionRun.findMany({
          take: 100,
          orderBy: { createdAt: 'desc' },
          select: {
            statsJson: true,
          },
        }),
      ]);

      // Aggregate stats from recent runs
      const aggregatedStats = recentRuns.reduce(
        (acc, run) => {
          const stats = run.statsJson as any;
          acc.totalFieldsProcessed += stats.totalFields || 0;
          acc.totalFieldsRedacted += stats.redactedFields || 0;

          Object.entries(stats.detectionsByType || {}).forEach(([type, count]) => {
            acc.detectionsByType[type] = (acc.detectionsByType[type] || 0) + (count as number);
          });

          return acc;
        },
        {
          totalFieldsProcessed: 0,
          totalFieldsRedacted: 0,
          detectionsByType: {} as Record<string, number>,
        }
      );

      reply.send({
        profileCount,
        runCount,
        ...aggregatedStats,
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get runs for a specific profile
  fastify.get<{ Params: { profileId: string } }>(
    '/stats/profiles/:profileId/runs',
    async (request, reply) => {
      try {
        const runs = await prisma.redactionRun.findMany({
          where: { profileId: request.params.profileId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        reply.send(runs);
      } catch (error) {
        console.error('Error getting runs:', error);
        reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );
}
