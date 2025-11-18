import { describe, it, expect } from 'vitest';
import { Masker } from '../src/detectors/masking';
import { PIIType } from '../src/detectors/types';

describe('Masker', () => {
  const masker = new Masker();

  describe('full masking', () => {
    it('should mask entire value with asterisks', () => {
      const result = masker.mask('sensitive', { strategy: 'full', char: '*', preserveLength: true });
      expect(result).toBe('*********');
    });

    it('should use custom character', () => {
      const result = masker.mask('sensitive', { strategy: 'full', char: 'X', preserveLength: true });
      expect(result).toBe('XXXXXXXXX');
    });

    it('should use fixed length when preserveLength is false', () => {
      const result = masker.mask('sensitive', { strategy: 'full', preserveLength: false });
      expect(result).toBe('********');
    });
  });

  describe('partial masking', () => {
    it('should partially mask generic values', () => {
      const result = masker.mask('1234567890', { strategy: 'partial', visibleChars: 2 }, undefined);
      expect(result).toBe('12***90');
    });

    it('should mask email preserving some characters', () => {
      const result = masker.mask(
        'john.doe@example.com',
        { strategy: 'partial', visibleChars: 2 },
        PIIType.EMAIL
      );
      expect(result).toContain('@example.com');
      expect(result.startsWith('jo')).toBe(true);
    });

    it('should mask phone showing last 4 digits', () => {
      const result = masker.mask('555-123-4567', { strategy: 'partial' }, PIIType.PHONE);
      expect(result).toContain('4567');
      expect(result).toContain('*');
    });

    it('should mask credit card showing last 4 digits', () => {
      const result = masker.mask('4532-0151-1283-0366', { strategy: 'partial' }, PIIType.CREDIT_CARD);
      expect(result).toContain('0366');
      expect(result).toContain('*');
    });

    it('should mask SSN showing last 4 digits', () => {
      const result = masker.mask('123-45-6789', { strategy: 'partial' }, PIIType.SSN);
      expect(result).toBe('***-**-6789');
    });
  });

  describe('hash masking', () => {
    it('should hash the value', () => {
      const result = masker.mask('sensitive', { strategy: 'hash' });
      expect(result).toMatch(/\[HASH:[a-f0-9]{16}\]/);
    });

    it('should produce consistent hashes', () => {
      const result1 = masker.mask('test', { strategy: 'hash' });
      const result2 = masker.mask('test', { strategy: 'hash' });
      expect(result1).toBe(result2);
    });
  });

  describe('preserve_domain masking', () => {
    it('should preserve email domain', () => {
      const result = masker.mask(
        'john.doe@example.com',
        { strategy: 'preserve_domain' },
        PIIType.EMAIL
      );
      expect(result).toContain('@example.com');
      expect(result).toContain('*');
      expect(result.split('@')[0]).toMatch(/^j.*e$/);
    });

    it('should handle short email local parts', () => {
      const result = masker.mask('ab@example.com', { strategy: 'preserve_domain' }, PIIType.EMAIL);
      expect(result).toContain('@example.com');
    });
  });
});
