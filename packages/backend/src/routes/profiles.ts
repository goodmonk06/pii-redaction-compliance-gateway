import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/client';
import { RedactionService } from '../services/redaction.service';
import { PIIType } from '../detectors/types';

const createProfileSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  rules: z.array(
    z.object({
      fieldPattern: z.string(),
      type: z.nativeEnum(PIIType),
      maskStrategy: z.enum(['full', 'partial', 'hash', 'preserve_domain']).default('full'),
      maskChar: z.string().length(1).default('*'),
      preserveLength: z.boolean().default(true),
      visibleChars: z.number().int().min(0).default(4),
    })
  ),
});

const redactRequestSchema = z.object({
  data: z.any(),
});

export async function profileRoutes(fastify: FastifyInstance) {
  const redactionService = new RedactionService();

  // Create a new redaction profile
  fastify.post('/profiles', async (request, reply) => {
    try {
      const body = createProfileSchema.parse(request.body);

      // Create profile with rules
      const profile = await prisma.redactionProfile.create({
        data: {
          name: body.name,
          description: body.description,
          rulesJson: { rules: body.rules },
          detectionRules: {
            create: body.rules.map((rule) => ({
              fieldPattern: rule.fieldPattern,
              type: rule.type,
              maskStyleJson: {
                strategy: rule.maskStrategy,
                char: rule.maskChar,
                preserveLength: rule.preserveLength,
                visibleChars: rule.visibleChars,
              },
              enabled: true,
            })),
          },
        },
        include: {
          detectionRules: true,
        },
      });

      reply.code(201).send(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({ error: 'Validation failed', details: error.errors });
      } else if ((error as any).code === 'P2002') {
        reply.code(409).send({ error: 'Profile name already exists' });
      } else {
        console.error('Error creating profile:', error);
        reply.code(500).send({ error: 'Internal server error' });
      }
    }
  });

  // List all profiles
  fastify.get('/profiles', async (request, reply) => {
    try {
      const profiles = await prisma.redactionProfile.findMany({
        include: {
          detectionRules: true,
          _count: {
            select: { redactionRuns: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      reply.send(profiles);
    } catch (error) {
      console.error('Error listing profiles:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get a specific profile
  fastify.get<{ Params: { id: string } }>('/profiles/:id', async (request, reply) => {
    try {
      const profile = await prisma.redactionProfile.findUnique({
        where: { id: request.params.id },
        include: {
          detectionRules: true,
          redactionRuns: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!profile) {
        reply.code(404).send({ error: 'Profile not found' });
        return;
      }

      reply.send(profile);
    } catch (error) {
      console.error('Error getting profile:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Redact data using a profile
  fastify.post<{ Params: { id: string } }>(
    '/profiles/:id/redact',
    async (request, reply) => {
      try {
        const body = redactRequestSchema.parse(request.body);
        const profileId = request.params.id;

        // Fetch profile and rules
        const profile = await prisma.redactionProfile.findUnique({
          where: { id: profileId },
          include: { detectionRules: true },
        });

        if (!profile) {
          reply.code(404).send({ error: 'Profile not found' });
          return;
        }

        // Convert DB rules to service format
        const rules = profile.detectionRules.map((rule) => ({
          fieldPattern: rule.fieldPattern,
          type: rule.type as PIIType,
          maskConfig: rule.maskStyleJson as any,
          enabled: rule.enabled,
        }));

        // Perform redaction
        const result = await redactionService.redact(body.data, rules);

        // Store redaction run
        const run = await prisma.redactionRun.create({
          data: {
            profileId,
            inputSampleJson: this.sanitizeSample(body.data),
            outputSampleJson: this.sanitizeSample(result.redactedData),
            statsJson: result.stats,
          },
        });

        reply.send({
          runId: run.id,
          redactedData: result.redactedData,
          stats: result.stats,
          detections: result.detections.map(d => ({
            field: d.field,
            type: d.type,
            confidence: d.confidence,
          })),
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ error: 'Validation failed', details: error.errors });
        } else {
          console.error('Error during redaction:', error);
          reply.code(500).send({ error: 'Internal server error' });
        }
      }
    }
  );

  // Delete a profile
  fastify.delete<{ Params: { id: string } }>('/profiles/:id', async (request, reply) => {
    try {
      await prisma.redactionProfile.delete({
        where: { id: request.params.id },
      });

      reply.code(204).send();
    } catch (error) {
      if ((error as any).code === 'P2025') {
        reply.code(404).send({ error: 'Profile not found' });
      } else {
        console.error('Error deleting profile:', error);
        reply.code(500).send({ error: 'Internal server error' });
      }
    }
  });

  // Helper method to sanitize samples (limit size)
  this.sanitizeSample = function (data: any): any {
    const str = JSON.stringify(data);
    if (str.length > 5000) {
      return { _truncated: true, sample: str.substring(0, 5000) + '...' };
    }
    return data;
  };
}
