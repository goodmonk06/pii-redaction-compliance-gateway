# Contributing to PII Redaction Compliance Gateway

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Copy environment files:
   ```bash
   cp packages/backend/.env.example packages/backend/.env
   cp packages/dashboard/.env.example packages/dashboard/.env
   ```
4. Start PostgreSQL (using Docker or local installation)
5. Run migrations: `cd packages/backend && npx prisma migrate dev`
6. Start development servers

## Project Structure

```
pii-redaction-compliance-gateway/
├── packages/
│   ├── backend/           # Fastify API server
│   │   ├── src/
│   │   │   ├── detectors/  # PII detection logic
│   │   │   ├── routes/     # API routes
│   │   │   ├── services/   # Business logic
│   │   │   └── db/         # Database client
│   │   ├── tests/          # Unit tests
│   │   └── prisma/         # Database schema
│   └── dashboard/         # Next.js dashboard
│       └── src/
│           ├── app/        # Next.js 14 app directory
│           └── components/ # React components
├── docker-compose.yml     # Docker orchestration
└── Dockerfile            # Multi-stage build
```

## Development Workflow

### Adding a New PII Detector

1. Create a new detector class in `packages/backend/src/detectors/`
2. Implement the `Detector` interface
3. Add it to `DetectorRegistry`
4. Write unit tests in `packages/backend/tests/`
5. Update documentation

Example:
```typescript
export class CustomDetector implements Detector {
  type = PIIType.CUSTOM;

  detect(value: string): boolean {
    // Detection logic
  }

  getConfidence(value: string): number {
    // Confidence scoring
  }
}
```

### Adding a New Masking Strategy

1. Add the strategy to `MaskConfig` type in `types.ts`
2. Implement it in the `Masker` class
3. Add tests
4. Update documentation

### Adding API Endpoints

1. Create or modify route files in `packages/backend/src/routes/`
2. Register the route in `packages/backend/src/index.ts`
3. Add request/response schemas using Zod
4. Handle errors appropriately
5. Add integration tests

### Modifying the Database Schema

1. Edit `packages/backend/prisma/schema.prisma`
2. Create a migration: `npx prisma migrate dev --name description`
3. Update TypeScript types
4. Update affected code

## Code Style

- Use TypeScript strict mode
- Follow existing code formatting
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and small

## Testing

Run tests before submitting:
```bash
cd packages/backend
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Add/update tests
4. Update documentation
5. Run tests and linting
6. Submit a PR with a clear description

### PR Title Format

- `feat: Add new detector for addresses`
- `fix: Resolve email masking edge case`
- `docs: Update API documentation`
- `test: Add tests for phone detector`
- `refactor: Simplify masking logic`

## Areas for Contribution

- **New PII Detectors**: Add support for more PII types
- **Masking Strategies**: Implement new masking approaches
- **Performance**: Optimize detection algorithms
- **Testing**: Increase test coverage
- **Documentation**: Improve guides and examples
- **UI/UX**: Enhance the dashboard
- **Integrations**: Add support for more platforms

## Questions?

Open an issue for discussion before starting major work.
