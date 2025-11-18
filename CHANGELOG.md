# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Phase 2 & Phase 3 Improvements

#### Domain Model Expansion
- **Organization** entity for multi-tenancy support
- **User** entity for access control and audit trails
- **ApiKey** entity for authenticated API access with rate limiting
- **AuditLog** entity for comprehensive compliance audit trails
- **Webhook** entity for event-driven integrations
- **RedactionTemplate** entity for shareable, reusable rule sets
- **BatchRedactionJob** entity for asynchronous large-scale processing
- **DetectionHistory** entity for PII detection analytics

#### Enhanced Core Entities
- Added `organizationId` and `createdById` to RedactionProfile for multi-tenancy
- Added `priority` to DetectionRule for rule evaluation order
- Added `apiKeyId`, `durationMs`, `ipAddress`, `userAgent` to RedactionRun for audit trails
- Added `isActive` flag to RedactionProfile

#### Developer Experience
- Standardized `package.json` scripts across all packages (dev, build, test, lint, typecheck, format, db:*)
- Added ESLint configuration with TypeScript support
- Added Prettier for consistent code formatting
- Created database seeding script with comprehensive demo data
- Added CLI-friendly npm scripts at root level

#### Infrastructure & Quality
- **Centralized Error Handling**: Custom error classes (AppError, ValidationError, NotFoundError, etc.) with consistent API responses
- **Logging System**: Structured JSON logging with context support (`lib/logger.ts`)
- **Metrics System**: In-memory metrics registry with counters, gauges, and histograms (`lib/metrics.ts`)
- **Metrics API**: New `/api/metrics` endpoint for monitoring
- Zod validation integrated with error handler for automatic validation error formatting
- Prisma error handling with user-friendly messages

#### Documentation
- Created `docs/PHASE3_OVERVIEW.md` with comprehensive expansion plan
- Added detailed purpose statement and integration vision
- Documented all new entities and their relationships
- Outlined future vertical slices and extension points

### Changed

#### Breaking Changes
- **Database Schema**: RedactionProfile now requires `organizationId` (migration handles existing data)
- Profile names are now unique per organization (not globally unique)

#### Migrations
- Created migration `20250118000000_phase3_domain_expansion` with backward-compatible data migration
- Existing profiles automatically assigned to default organization

### Technical Debt Addressed
- Removed manual error response handling in routes (now uses centralized handler)
- Standardized all package.json scripts across monorepo
- Added proper TypeScript strict mode configuration
- Improved code organization with `lib/` directory for shared utilities

## [1.0.0] - 2024-01-15

### Added
- Initial release with core PII redaction functionality
- Regex-based detectors for email, phone, SSN, credit cards, names, IP addresses
- Multiple masking strategies (full, partial, hash, preserve_domain)
- Profile-based configuration system
- REST API with Fastify
- Next.js dashboard for profile management
- PostgreSQL database with Prisma ORM
- Docker and docker-compose support
- Basic unit tests with Vitest
- OpenAI integration (optional) for advanced detection
- Comprehensive README with usage examples

[Unreleased]: https://github.com/yourusername/pii-redaction-compliance-gateway/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/pii-redaction-compliance-gateway/releases/tag/v1.0.0
