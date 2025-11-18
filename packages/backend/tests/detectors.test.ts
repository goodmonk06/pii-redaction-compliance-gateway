import { describe, it, expect } from 'vitest';
import {
  EmailDetector,
  PhoneDetector,
  SSNDetector,
  CreditCardDetector,
  NameDetector,
  IPAddressDetector,
  DetectorRegistry,
} from '../src/detectors/regex-detectors';
import { PIIType } from '../src/detectors/types';

describe('EmailDetector', () => {
  const detector = new EmailDetector();

  it('should detect valid emails', () => {
    expect(detector.detect('user@example.com')).toBe(true);
    expect(detector.detect('john.doe@company.co.uk')).toBe(true);
    expect(detector.detect('test+tag@gmail.com')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(detector.detect('invalid.email')).toBe(false);
    expect(detector.detect('@example.com')).toBe(false);
    expect(detector.detect('user@')).toBe(false);
  });

  it('should return higher confidence for common domains', () => {
    expect(detector.getConfidence('user@gmail.com')).toBeGreaterThan(0.9);
    expect(detector.getConfidence('user@unknowndomain.xyz')).toBeLessThan(0.9);
  });
});

describe('PhoneDetector', () => {
  const detector = new PhoneDetector();

  it('should detect valid phone numbers', () => {
    expect(detector.detect('555-123-4567')).toBe(true);
    expect(detector.detect('(555) 123-4567')).toBe(true);
    expect(detector.detect('+1 555 123 4567')).toBe(true);
    expect(detector.detect('5551234567')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(detector.detect('123')).toBe(false);
    expect(detector.detect('abc-def-ghij')).toBe(false);
  });

  it('should return higher confidence for formatted numbers', () => {
    expect(detector.getConfidence('555-123-4567')).toBeGreaterThan(0.8);
  });
});

describe('SSNDetector', () => {
  const detector = new SSNDetector();

  it('should detect valid SSNs', () => {
    expect(detector.detect('123-45-6789')).toBe(true);
    expect(detector.detect('123456789')).toBe(true);
  });

  it('should reject invalid SSNs', () => {
    expect(detector.detect('12-345-6789')).toBe(false);
    expect(detector.detect('123-456-789')).toBe(false);
  });

  it('should return higher confidence for formatted SSNs', () => {
    expect(detector.getConfidence('123-45-6789')).toBeGreaterThan(0.9);
    expect(detector.getConfidence('123456789')).toBeLessThan(0.9);
  });
});

describe('CreditCardDetector', () => {
  const detector = new CreditCardDetector();

  it('should detect valid credit card numbers', () => {
    // Valid test card number
    expect(detector.detect('4532015112830366')).toBe(true);
    expect(detector.detect('4532-0151-1283-0366')).toBe(true);
  });

  it('should reject invalid credit card numbers', () => {
    expect(detector.detect('1234567890123456')).toBe(false); // Fails Luhn check
    expect(detector.detect('4532')).toBe(false);
  });
});

describe('NameDetector', () => {
  const detector = new NameDetector();

  it('should detect valid names', () => {
    expect(detector.detect('John Doe')).toBe(true);
    expect(detector.detect('Mary Jane Watson')).toBe(true);
  });

  it('should reject invalid names', () => {
    expect(detector.detect('john doe')).toBe(false); // Not capitalized
    expect(detector.detect('JOHN DOE')).toBe(false); // All caps
    expect(detector.detect('John')).toBe(false); // Single word
  });

  it('should return higher confidence for 2-3 word names', () => {
    expect(detector.getConfidence('John Doe')).toBeGreaterThan(0.65);
    expect(detector.getConfidence('Mary Jane Watson')).toBeGreaterThan(0.65);
  });
});

describe('IPAddressDetector', () => {
  const detector = new IPAddressDetector();

  it('should detect valid IPv4 addresses', () => {
    expect(detector.detect('192.168.1.1')).toBe(true);
    expect(detector.detect('10.0.0.1')).toBe(true);
    expect(detector.detect('255.255.255.255')).toBe(true);
  });

  it('should reject invalid IPv4 addresses', () => {
    expect(detector.detect('256.1.1.1')).toBe(false); // Out of range
    expect(detector.detect('192.168.1')).toBe(false); // Incomplete
  });

  it('should detect valid IPv6 addresses', () => {
    expect(detector.detect('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
  });
});

describe('DetectorRegistry', () => {
  const registry = new DetectorRegistry();

  it('should detect all PII types in a value', () => {
    const emailResults = registry.detectAll('user@example.com');
    expect(emailResults).toHaveLength(1);
    expect(emailResults[0].type).toBe(PIIType.EMAIL);
  });

  it('should return results sorted by confidence', () => {
    const results = registry.detectAll('user@gmail.com');
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
    }
  });

  it('should detect by specific type', () => {
    expect(registry.detectByType('user@example.com', PIIType.EMAIL)).toBe(true);
    expect(registry.detectByType('user@example.com', PIIType.PHONE)).toBe(false);
  });
});
