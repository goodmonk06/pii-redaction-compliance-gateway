# PII Redaction Compliance Gateway

A production-ready PII (Personally Identifiable Information) redaction gateway that detects and masks sensitive data in JSON payloads. Built for compliance with GDPR, CCPA, and other data privacy regulations.

## Features

- **Automatic PII Detection**: Regex-based detectors for email, phone, SSN, credit cards, names, IP addresses, and more
- **Flexible Masking Strategies**: Full masking, partial masking, hashing, and domain-preserving options
- **Profile Management**: Create and manage multiple redaction profiles with custom rules
- **Audit Logging**: Track all redaction operations with detailed statistics
- **OpenAI Integration**: Optional AI-powered detection for complex or ambiguous PII
- **REST API**: Simple HTTP API for integration with existing services
- **Dashboard**: Web-based UI for managing profiles and viewing statistics
- **Docker Support**: Ready-to-deploy with Docker Compose

## Architecture

```
┌──────────────┐
│   Client     │
│ Application  │
└──────┬───────┘
       │
       │ POST /api/profiles/:id/redact
       │ { "data": {...} }
       ▼
┌──────────────────────────────┐
│  PII Redaction Gateway       │
│  (Fastify API)               │
│                              │
│  ┌────────────────────────┐  │
│  │  Detection Engine      │  │
│  │  - Regex Detectors     │  │
│  │  - OpenAI Detector     │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │  Masking Engine        │  │
│  │  - Full/Partial/Hash   │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │  Audit Logger          │  │
│  │  (PostgreSQL)          │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
       │
       │ Redacted JSON
       ▼
┌──────────────┐
│   Client     │
│ Application  │
└──────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or use Docker)
- Redis (optional, for caching)

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd pii-redaction-compliance-gateway
```

2. Start all services:
```bash
docker-compose up -d
```

3. Access the services:
   - API: http://localhost:3001
   - Dashboard: http://localhost:3000
   - API Health: http://localhost:3001/health

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp packages/backend/.env.example packages/backend/.env
cp packages/dashboard/.env.example packages/dashboard/.env
```

3. Update `packages/backend/.env` with your database URL:
```env
DATABASE_URL="postgresql://piigateway:piigateway@localhost:5432/piigateway?schema=public"
```

4. Run database migrations:
```bash
cd packages/backend
npx prisma migrate dev
```

5. Start the backend:
```bash
npm run dev
```

6. In another terminal, start the dashboard:
```bash
npm run dev:dashboard
```

## Usage Examples

### Creating a Redaction Profile

```bash
curl -X POST http://localhost:3001/api/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Data Profile",
    "description": "Redacts PII from user registration data",
    "rules": [
      {
        "fieldPattern": "*email*",
        "type": "email",
        "maskStrategy": "preserve_domain",
        "maskChar": "*",
        "preserveLength": true
      },
      {
        "fieldPattern": "*phone*",
        "type": "phone",
        "maskStrategy": "partial",
        "visibleChars": 4
      },
      {
        "fieldPattern": "*ssn*",
        "type": "ssn",
        "maskStrategy": "partial",
        "visibleChars": 4
      },
      {
        "fieldPattern": "*credit*",
        "type": "credit_card",
        "maskStrategy": "partial",
        "visibleChars": 4
      }
    ]
  }'
```

### Redacting Data

**Input:**
```json
{
  "user": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "555-123-4567",
    "ssn": "123-45-6789"
  },
  "payment": {
    "creditCard": "4532-0151-1283-0366",
    "billingAddress": "123 Main Street"
  },
  "metadata": {
    "ip": "192.168.1.1",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Request:**
```bash
curl -X POST http://localhost:3001/api/profiles/{profile-id}/redact \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "user": {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "555-123-4567",
        "ssn": "123-45-6789"
      },
      "payment": {
        "creditCard": "4532-0151-1283-0366"
      }
    }
  }'
```

**Output:**
```json
{
  "runId": "clx1234567890",
  "redactedData": {
    "user": {
      "name": "********",
      "email": "j******e@example.com",
      "phone": "*******4567",
      "ssn": "***-**-6789"
    },
    "payment": {
      "creditCard": "**** **** **** 0366"
    }
  },
  "stats": {
    "totalFields": 5,
    "redactedFields": 4,
    "detectionsByType": {
      "email": 1,
      "phone": 1,
      "ssn": 1,
      "credit_card": 1
    }
  },
  "detections": [
    {
      "field": "user.email",
      "type": "email",
      "confidence": 0.95
    },
    {
      "field": "user.phone",
      "type": "phone",
      "confidence": 0.9
    },
    {
      "field": "user.ssn",
      "type": "ssn",
      "confidence": 0.95
    },
    {
      "field": "payment.creditCard",
      "type": "credit_card",
      "confidence": 0.9
    }
  ]
}
```

## API Endpoints

### Profiles

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/profiles` | List all redaction profiles |
| `POST` | `/api/profiles` | Create a new profile |
| `GET` | `/api/profiles/:id` | Get profile details |
| `DELETE` | `/api/profiles/:id` | Delete a profile |
| `POST` | `/api/profiles/:id/redact` | Redact data using a profile |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats` | Get overall statistics |
| `GET` | `/api/stats/profiles/:id/runs` | Get runs for a specific profile |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check endpoint |

## Supported PII Types

| Type | Description | Example | Default Masking |
|------|-------------|---------|-----------------|
| `email` | Email addresses | `john@example.com` | `j***n@example.com` |
| `phone` | Phone numbers | `555-123-4567` | `*******4567` |
| `ssn` | Social Security Numbers | `123-45-6789` | `***-**-6789` |
| `credit_card` | Credit card numbers | `4532-0151-1283-0366` | `**** **** **** 0366` |
| `name` | Person names | `John Doe` | `********` |
| `ip_address` | IP addresses (IPv4/IPv6) | `192.168.1.1` | `192.***.*.***` |
| `address` | Physical addresses | `123 Main St` | `********` |

## Masking Strategies

### Full Masking
Replaces the entire value with mask characters.
```
"john.doe@example.com" → "********************"
```

### Partial Masking
Shows first and last N characters, masks the middle.
```
"555-123-4567" → "*******4567"
"4532-0151-1283-0366" → "**** **** **** 0366"
```

### Hash Masking
Replaces value with a SHA-256 hash prefix.
```
"john.doe@example.com" → "[HASH:9b74c9897bac770f]"
```

### Preserve Domain (Email-specific)
Masks local part but preserves the domain.
```
"john.doe@example.com" → "j******e@example.com"
```

## Integration as a Gateway

### Use Case 1: API Gateway Middleware

Deploy the redaction gateway as middleware in front of your services:

```typescript
// Express.js example
app.post('/api/users', async (req, res) => {
  // Redact PII before processing
  const redactionResponse = await fetch(
    'http://redaction-gateway:3001/api/profiles/user-profile/redact',
    {
      method: 'POST',
      body: JSON.stringify({ data: req.body }),
      headers: { 'Content-Type': 'application/json' }
    }
  );

  const { redactedData } = await redactionResponse.json();

  // Process with redacted data
  await saveUser(redactedData);

  res.json({ success: true });
});
```

### Use Case 2: Logging Pipeline

Redact PII before writing logs:

```typescript
// Logger middleware
logger.on('log', async (logEntry) => {
  const { redactedData } = await redactPII(logEntry);
  await writeToLogStorage(redactedData);
});
```

### Use Case 3: Data Export Compliance

Ensure exported data is compliant:

```typescript
// Export handler
app.get('/api/export/users', async (req, res) => {
  const users = await db.users.findMany();

  const { redactedData } = await fetch(
    'http://redaction-gateway:3001/api/profiles/export-profile/redact',
    {
      method: 'POST',
      body: JSON.stringify({ data: users })
    }
  ).then(r => r.json());

  res.csv(redactedData);
});
```

## Testing

Run unit tests:
```bash
cd packages/backend
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Environment Variables

### Backend (`packages/backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PORT` | Server port | `3001` |
| `HOST` | Server host | `0.0.0.0` |
| `OPENAI_API_KEY` | OpenAI API key (optional) | - |
| `REDIS_URL` | Redis connection URL (optional) | - |
| `NODE_ENV` | Environment | `development` |
| `LOG_LEVEL` | Log level | `info` |

### Dashboard (`packages/dashboard/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001/api` |

## Performance Considerations

- **Caching**: Enable Redis for caching detection results
- **Batch Processing**: Process multiple payloads in parallel
- **Field Patterns**: Use specific field patterns to reduce unnecessary detections
- **OpenAI Rate Limits**: Be mindful of OpenAI API rate limits when enabled

## Security Best Practices

1. **Audit Logging**: All redaction operations are logged with timestamps
2. **Input Validation**: All API inputs are validated with Zod schemas
3. **Rate Limiting**: Consider adding rate limiting in production
4. **HTTPS**: Always use HTTPS in production
5. **Database Security**: Use strong passwords and restrict network access

## Roadmap

- [ ] Field-level encryption support
- [ ] Custom regex pattern support via UI
- [ ] Webhooks for redaction events
- [ ] Advanced analytics dashboard
- [ ] Multi-tenant support
- [ ] API key authentication
- [ ] Rate limiting middleware
- [ ] Kafka/RabbitMQ integration for async processing

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues and questions, please open a GitHub issue.
