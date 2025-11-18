import { PrismaClient } from '@prisma/client';
import { PIIType } from '../detectors/types';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  console.log('  Clearing existing data...');
  await prisma.batchRedactionJob.deleteMany();
  await prisma.webhook.deleteMany();
  await prisma.redactionRun.deleteMany();
  await prisma.detectionRule.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.redactionProfile.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.redactionTemplate.deleteMany();
  await prisma.detectionHistory.deleteMany();

  // Create organizations
  console.log('  Creating organizations...');

  const acmeOrg = await prisma.organization.create({
    data: {
      name: 'Acme Corporation',
      plan: 'enterprise',
      settings: {
        allowedDomains: ['acme.com'],
        maxProfiles: 50,
      },
    },
  });

  const startupOrg = await prisma.organization.create({
    data: {
      name: 'Startup Inc',
      plan: 'pro',
      settings: {
        allowedDomains: ['startup.io'],
        maxProfiles: 10,
      },
    },
  });

  console.log(`    ✓ Created ${2} organizations`);

  // Create users
  console.log('  Creating users...');

  const admin1 = await prisma.user.create({
    data: {
      email: 'admin@acme.com',
      name: 'Alice Admin',
      role: 'admin',
      organizationId: acmeOrg.id,
    },
  });

  const member1 = await prisma.user.create({
    data: {
      email: 'dev@acme.com',
      name: 'Bob Developer',
      role: 'member',
      organizationId: acmeOrg.id,
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      email: 'founder@startup.io',
      name: 'Charlie Founder',
      role: 'admin',
      organizationId: startupOrg.id,
    },
  });

  console.log(`    ✓ Created ${3} users`);

  // Create API keys
  console.log('  Creating API keys...');

  const apiKey1 = await prisma.apiKey.create({
    data: {
      key: hashApiKey('sk_live_acme_12345678'),
      name: 'Production API Key',
      organizationId: acmeOrg.id,
      permissions: ['redact', 'create_profile', 'read_stats'],
      rateLimit: 10000,
    },
  });

  const apiKey2 = await prisma.apiKey.create({
    data: {
      key: hashApiKey('sk_test_startup_abcdefgh'),
      name: 'Development API Key',
      organizationId: startupOrg.id,
      permissions: ['redact'],
      rateLimit: 1000,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  console.log(`    ✓ Created ${2} API keys`);
  console.log(`      - Acme: sk_live_acme_12345678`);
  console.log(`      - Startup: sk_test_startup_abcdefgh`);

  // Create redaction templates
  console.log('  Creating redaction templates...');

  await prisma.redactionTemplate.create({
    data: {
      name: 'GDPR Standard',
      description: 'Standard GDPR compliance redaction rules',
      category: 'legal',
      isPublic: true,
      rulesJson: {
        rules: [
          { fieldPattern: '*email*', type: PIIType.EMAIL, maskStrategy: 'preserve_domain' },
          { fieldPattern: '*phone*', type: PIIType.PHONE, maskStrategy: 'partial' },
          { fieldPattern: '*name*', type: PIIType.NAME, maskStrategy: 'full' },
          { fieldPattern: '*address*', type: PIIType.ADDRESS, maskStrategy: 'full' },
        ],
      },
    },
  });

  await prisma.redactionTemplate.create({
    data: {
      name: 'HIPAA Medical',
      description: 'HIPAA-compliant medical data redaction',
      category: 'healthcare',
      isPublic: true,
      rulesJson: {
        rules: [
          { fieldPattern: '*ssn*', type: PIIType.SSN, maskStrategy: 'partial' },
          { fieldPattern: '*patient*', type: PIIType.NAME, maskStrategy: 'full' },
          { fieldPattern: '*medical*', type: PIIType.CUSTOM, maskStrategy: 'hash' },
        ],
      },
    },
  });

  await prisma.redactionTemplate.create({
    data: {
      name: 'PCI DSS Payment',
      description: 'PCI DSS compliant payment data redaction',
      category: 'finance',
      isPublic: true,
      rulesJson: {
        rules: [
          { fieldPattern: '*card*', type: PIIType.CREDIT_CARD, maskStrategy: 'partial' },
          { fieldPattern: '*cvv*', type: PIIType.CUSTOM, maskStrategy: 'full' },
          { fieldPattern: '*billing*', type: PIIType.ADDRESS, maskStrategy: 'full' },
        ],
      },
    },
  });

  console.log(`    ✓ Created ${3} public templates`);

  // Create demo profiles
  console.log('  Creating demo profiles...');

  // Profile 1: General User Data Profile
  const userDataProfile = await prisma.redactionProfile.create({
    data: {
      name: 'User Data Profile',
      description: 'Standard redaction for user registration and account data',
      organizationId: acmeOrg.id,
      createdById: admin1.id,
      rulesJson: {
        rules: [
          {
            fieldPattern: '*email*',
            type: PIIType.EMAIL,
            maskStrategy: 'preserve_domain',
            maskChar: '*',
            preserveLength: true,
          },
          {
            fieldPattern: '*phone*',
            type: PIIType.PHONE,
            maskStrategy: 'partial',
            maskChar: '*',
            preserveLength: true,
            visibleChars: 4,
          },
          {
            fieldPattern: '*name*',
            type: PIIType.NAME,
            maskStrategy: 'full',
            maskChar: '*',
            preserveLength: false,
          },
        ],
      },
      detectionRules: {
        create: [
          {
            fieldPattern: '*email*',
            type: PIIType.EMAIL,
            maskStyleJson: {
              strategy: 'preserve_domain',
              char: '*',
              preserveLength: true,
            },
            enabled: true,
          },
          {
            fieldPattern: '*phone*',
            type: PIIType.PHONE,
            maskStyleJson: {
              strategy: 'partial',
              char: '*',
              preserveLength: true,
              visibleChars: 4,
            },
            enabled: true,
          },
          {
            fieldPattern: '*name*',
            type: PIIType.NAME,
            maskStyleJson: {
              strategy: 'full',
              char: '*',
              preserveLength: false,
            },
            enabled: true,
          },
        ],
      },
    },
  });

  console.log(`    ✓ Created profile: ${userDataProfile.name}`);

  // Profile 2: Payment Data Profile
  const paymentProfile = await prisma.redactionProfile.create({
    data: {
      name: 'Payment Data Profile',
      description: 'PCI-compliant redaction for payment and financial data',
      organizationId: acmeOrg.id,
      createdById: member1.id,
      rulesJson: {
        rules: [
          {
            fieldPattern: '*card*',
            type: PIIType.CREDIT_CARD,
            maskStrategy: 'partial',
            maskChar: '*',
            preserveLength: true,
            visibleChars: 4,
          },
          {
            fieldPattern: '*ssn*',
            type: PIIType.SSN,
            maskStrategy: 'partial',
            maskChar: '*',
            preserveLength: true,
            visibleChars: 4,
          },
          {
            fieldPattern: '*billing*',
            type: PIIType.ADDRESS,
            maskStrategy: 'full',
            maskChar: '*',
            preserveLength: false,
          },
        ],
      },
      detectionRules: {
        create: [
          {
            fieldPattern: '*card*',
            type: PIIType.CREDIT_CARD,
            maskStyleJson: {
              strategy: 'partial',
              char: '*',
              preserveLength: true,
              visibleChars: 4,
            },
            enabled: true,
          },
          {
            fieldPattern: '*ssn*',
            type: PIIType.SSN,
            maskStyleJson: {
              strategy: 'partial',
              char: '*',
              preserveLength: true,
              visibleChars: 4,
            },
            enabled: true,
          },
          {
            fieldPattern: '*billing*',
            type: PIIType.ADDRESS,
            maskStyleJson: {
              strategy: 'full',
              char: '*',
              preserveLength: false,
            },
            enabled: true,
          },
        ],
      },
    },
  });

  console.log(`    ✓ Created profile: ${paymentProfile.name}`);

  // Profile 3: Logging Profile (for startup org)
  const loggingProfile = await prisma.redactionProfile.create({
    data: {
      name: 'Logging Profile',
      description: 'Aggressive redaction for application logs and monitoring',
      organizationId: startupOrg.id,
      createdById: admin2.id,
      rulesJson: {
        rules: [
          {
            fieldPattern: '*',
            type: PIIType.EMAIL,
            maskStrategy: 'hash',
            maskChar: '*',
            preserveLength: false,
          },
          {
            fieldPattern: '*',
            type: PIIType.PHONE,
            maskStrategy: 'hash',
            maskChar: '*',
            preserveLength: false,
          },
          {
            fieldPattern: '*',
            type: PIIType.IP_ADDRESS,
            maskStrategy: 'partial',
            maskChar: '*',
            preserveLength: true,
            visibleChars: 4,
          },
        ],
      },
      detectionRules: {
        create: [
          {
            fieldPattern: '*',
            type: PIIType.EMAIL,
            maskStyleJson: {
              strategy: 'hash',
              char: '*',
              preserveLength: false,
            },
            enabled: true,
          },
          {
            fieldPattern: '*',
            type: PIIType.PHONE,
            maskStyleJson: {
              strategy: 'hash',
              char: '*',
              preserveLength: false,
            },
            enabled: true,
          },
          {
            fieldPattern: '*',
            type: PIIType.IP_ADDRESS,
            maskStyleJson: {
              strategy: 'partial',
              char: '*',
              preserveLength: true,
              visibleChars: 4,
            },
            enabled: true,
          },
        ],
      },
    },
  });

  console.log(`    ✓ Created profile: ${loggingProfile.name}`);

  // Create demo redaction runs
  console.log('  Creating demo redaction runs...');

  const demoRun1 = await prisma.redactionRun.create({
    data: {
      profileId: userDataProfile.id,
      inputSampleJson: {
        user: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '555-123-4567',
        },
      },
      outputSampleJson: {
        user: {
          name: '********',
          email: 'j******e@example.com',
          phone: '*******4567',
        },
      },
      statsJson: {
        totalFields: 3,
        redactedFields: 3,
        detectionsByType: {
          email: 1,
          phone: 1,
          name: 1,
        },
      },
    },
  });

  console.log(`    ✓ Created demo run for ${userDataProfile.name}`);

  const demoRun2 = await prisma.redactionRun.create({
    data: {
      profileId: paymentProfile.id,
      inputSampleJson: {
        payment: {
          creditCard: '4532-0151-1283-0366',
          ssn: '123-45-6789',
          billingAddress: '123 Main Street, Apt 4',
        },
      },
      outputSampleJson: {
        payment: {
          creditCard: '**** **** **** 0366',
          ssn: '***-**-6789',
          billingAddress: '********',
        },
      },
      statsJson: {
        totalFields: 3,
        redactedFields: 3,
        detectionsByType: {
          credit_card: 1,
          ssn: 1,
          address: 1,
        },
      },
    },
  });

  console.log(`    ✓ Created demo run for ${paymentProfile.name}`);

  // Create webhooks
  console.log('  Creating webhooks...');

  await prisma.webhook.create({
    data: {
      profileId: userDataProfile.id,
      url: 'https://api.acme.com/webhooks/redaction',
      events: ['redaction.completed', 'detection.found'],
      secret: 'webhook_secret_12345',
      isActive: true,
    },
  });

  console.log(`    ✓ Created ${1} webhook`);

  // Create batch jobs
  console.log('  Creating batch redaction jobs...');

  await prisma.batchRedactionJob.create({
    data: {
      profileId: paymentProfile.id,
      status: 'completed',
      inputUrl: 's3://acme-data/input/batch-001.json',
      outputUrl: 's3://acme-data/output/batch-001-redacted.json',
      statsJson: {
        totalRecords: 1000,
        processedRecords: 1000,
        totalFields: 5000,
        redactedFields: 1200,
      },
      progress: 100,
      startedAt: new Date(Date.now() - 3600000), // 1 hour ago
      completedAt: new Date(Date.now() - 1800000), // 30 min ago
    },
  });

  await prisma.batchRedactionJob.create({
    data: {
      profileId: userDataProfile.id,
      status: 'processing',
      inputUrl: 's3://acme-data/input/batch-002.json',
      statsJson: {},
      progress: 45,
      startedAt: new Date(),
    },
  });

  console.log(`    ✓ Created ${2} batch jobs`);

  // Create detection history
  console.log('  Creating detection history...');

  await prisma.detectionHistory.create({
    data: {
      fieldPath: 'user.email',
      piiType: PIIType.EMAIL,
      frequency: 1523,
      firstSeenAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      lastSeenAt: new Date(),
    },
  });

  await prisma.detectionHistory.create({
    data: {
      fieldPath: 'payment.cardNumber',
      piiType: PIIType.CREDIT_CARD,
      frequency: 842,
      firstSeenAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      lastSeenAt: new Date(),
    },
  });

  await prisma.detectionHistory.create({
    data: {
      fieldPath: 'user.phone',
      piiType: PIIType.PHONE,
      frequency: 956,
      firstSeenAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      lastSeenAt: new Date(),
    },
  });

  console.log(`    ✓ Created ${3} detection history entries`);

  // Create audit logs
  console.log('  Creating audit logs...');

  await prisma.auditLog.create({
    data: {
      organizationId: acmeOrg.id,
      userId: admin1.id,
      action: 'profile.created',
      resourceType: 'profile',
      resourceId: userDataProfile.id,
      changes: {
        before: null,
        after: { name: userDataProfile.name },
      },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0',
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: acmeOrg.id,
      userId: member1.id,
      action: 'redaction.performed',
      resourceType: 'profile',
      resourceId: userDataProfile.id,
      ipAddress: '192.168.1.101',
      userAgent: 'curl/7.68.0',
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: acmeOrg.id,
      userId: admin1.id,
      action: 'api_key.generated',
      resourceType: 'api_key',
      resourceId: apiKey1.id,
      ipAddress: '192.168.1.100',
    },
  });

  console.log(`    ✓ Created ${3} audit log entries`);

  console.log('\n✅ Seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - Organizations: 2`);
  console.log(`  - Users: 3`);
  console.log(`  - API Keys: 2`);
  console.log(`  - Templates: 3`);
  console.log(`  - Profiles: 3`);
  console.log(`  - Detection Rules: ${3 + 3 + 3}`);
  console.log(`  - Redaction Runs: 2`);
  console.log(`  - Webhooks: 1`);
  console.log(`  - Batch Jobs: 2`);
  console.log(`  - Detection History: 3`);
  console.log(`  - Audit Logs: 3`);
  console.log('\n🎯 Demo Credentials:');
  console.log(`  - Acme API Key: sk_live_acme_12345678`);
  console.log(`  - Startup API Key: sk_test_startup_abcdefgh`);
  console.log('\n🏢 Organizations:');
  console.log(`  - Acme Corporation (${acmeOrg.id})`);
  console.log(`  - Startup Inc (${startupOrg.id})`);
  console.log('\n👤 Users:');
  console.log(`  - admin@acme.com (Admin)`);
  console.log(`  - dev@acme.com (Member)`);
  console.log(`  - founder@startup.io (Admin)`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
