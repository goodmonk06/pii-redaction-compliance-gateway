import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError, formatErrorResponse, ValidationError, NotFoundError, ConflictError } from './errors';

export function errorHandler(
  error: Error | FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log the error
  request.log.error({
    err: error,
    url: request.url,
    method: request.method,
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationError = new ValidationError('Validation failed', error.errors);
    const response = formatErrorResponse(validationError, request.url);
    return reply.status(400).send(response);
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      const conflictError = new ConflictError('Resource already exists', {
        fields: error.meta?.target,
      });
      const response = formatErrorResponse(conflictError, request.url);
      return reply.status(409).send(response);
    }

    if (error.code === 'P2025') {
      // Record not found
      const notFoundError = new NotFoundError('Resource');
      const response = formatErrorResponse(notFoundError, request.url);
      return reply.status(404).send(response);
    }

    // Generic Prisma error
    const appError = new AppError('Database error', 500, error.code);
    const response = formatErrorResponse(appError, request.url);
    return reply.status(500).send(response);
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    const response = formatErrorResponse(error, request.url);
    return reply.status(error.statusCode).send(response);
  }

  // Handle Fastify errors
  if ('statusCode' in error && error.statusCode) {
    const response = formatErrorResponse(
      new AppError(error.message, error.statusCode),
      request.url
    );
    return reply.status(error.statusCode).send(response);
  }

  // Default error response
  const response = formatErrorResponse(
    new AppError('Internal server error', 500, 'INTERNAL_SERVER_ERROR'),
    request.url
  );
  return reply.status(500).send(response);
}
