import { PrismaClient } from '@prisma/client';
import { PIIType } from '../detectors/types';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  console.log('  Clearing existing data...');
  await prisma.redactionRun.deleteMany();
  await prisma.detectionRule.deleteMany();
  await prisma.redactionProfile.deleteMany();

  // Create demo profiles
  console.log('  Creating demo profiles...');

  // Profile 1: General User Data Profile
  const userDataProfile = await prisma.redactionProfile.create({
    data: {
      name: 'User Data Profile',
      description: 'Standard redaction for user registration and account data',
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

  // Profile 3: Logging Profile
  const loggingProfile = await prisma.redactionProfile.create({
    data: {
      name: 'Logging Profile',
      description: 'Aggressive redaction for application logs and monitoring',
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

  console.log('✅ Seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - Profiles: 3`);
  console.log(`  - Detection Rules: ${3 + 3 + 3}`);
  console.log(`  - Demo Runs: 2`);
  console.log('\n🎯 Demo Profile IDs:');
  console.log(`  - User Data Profile: ${userDataProfile.id}`);
  console.log(`  - Payment Data Profile: ${paymentProfile.id}`);
  console.log(`  - Logging Profile: ${loggingProfile.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
