import { createHash } from 'crypto';
import { MaskConfig, PIIType } from './types';

export class Masker {
  mask(value: string, config: MaskConfig, type?: PIIType): string {
    if (typeof value !== 'string') return value;

    switch (config.strategy) {
      case 'full':
        return this.maskFull(value, config);
      case 'partial':
        return this.maskPartial(value, config, type);
      case 'hash':
        return this.maskHash(value);
      case 'preserve_domain':
        return this.maskPreserveDomain(value, config, type);
      default:
        return this.maskFull(value, config);
    }
  }

  private maskFull(value: string, config: MaskConfig): string {
    const char = config.char || '*';
    if (config.preserveLength) {
      return char.repeat(value.length);
    }
    return char.repeat(8); // Default masked length
  }

  private maskPartial(value: string, config: MaskConfig, type?: PIIType): string {
    const char = config.char || '*';
    const visibleChars = config.visibleChars || 4;

    // Type-specific partial masking
    if (type === PIIType.EMAIL) {
      return this.maskEmail(value, char, visibleChars);
    } else if (type === PIIType.PHONE) {
      return this.maskPhone(value, char);
    } else if (type === PIIType.CREDIT_CARD) {
      return this.maskCreditCard(value, char);
    } else if (type === PIIType.SSN) {
      return this.maskSSN(value, char);
    }

    // Default partial masking: show first and last N chars
    if (value.length <= visibleChars * 2) {
      return char.repeat(value.length);
    }

    const start = value.substring(0, visibleChars);
    const end = value.substring(value.length - visibleChars);
    const middle = char.repeat(Math.max(3, value.length - visibleChars * 2));

    return `${start}${middle}${end}`;
  }

  private maskHash(value: string): string {
    const hash = createHash('sha256').update(value).digest('hex');
    return `[HASH:${hash.substring(0, 16)}]`;
  }

  private maskPreserveDomain(value: string, config: MaskConfig, type?: PIIType): string {
    const char = config.char || '*';

    if (type === PIIType.EMAIL) {
      const [local, domain] = value.split('@');
      if (!domain) return this.maskFull(value, config);
      const maskedLocal = local.length > 2
        ? local[0] + char.repeat(local.length - 2) + local[local.length - 1]
        : char.repeat(local.length);
      return `${maskedLocal}@${domain}`;
    }

    return this.maskPartial(value, config, type);
  }

  private maskEmail(value: string, char: string, visibleChars: number): string {
    const [local, domain] = value.split('@');
    if (!domain) return char.repeat(value.length);

    const visibleCount = Math.min(visibleChars, Math.floor(local.length / 2));
    if (local.length <= visibleCount * 2) {
      return `${char.repeat(local.length)}@${domain}`;
    }

    const start = local.substring(0, visibleCount);
    const end = local.substring(local.length - visibleCount);
    const maskedLocal = `${start}${char.repeat(local.length - visibleCount * 2)}${end}`;

    return `${maskedLocal}@${domain}`;
  }

  private maskPhone(value: string, char: string): string {
    // Show last 4 digits
    const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
    const lastFour = cleaned.slice(-4);
    return `${char.repeat(cleaned.length - 4)}${lastFour}`;
  }

  private maskCreditCard(value: string, char: string): string {
    // Show last 4 digits (standard PCI compliance)
    const cleaned = value.replace(/[\s\-]/g, '');
    const lastFour = cleaned.slice(-4);
    const masked = char.repeat(12);

    // Format as groups of 4
    return `${masked.slice(0, 4)} ${masked.slice(4, 8)} ${masked.slice(8, 12)} ${lastFour}`;
  }

  private maskSSN(value: string, char: string): string {
    // Show last 4 digits
    const cleaned = value.replace(/-/g, '');
    const lastFour = cleaned.slice(-4);
    return `${char.repeat(3)}-${char.repeat(2)}-${lastFour}`;
  }
}

export const defaultMaskConfigs: Record<PIIType, MaskConfig> = {
  [PIIType.EMAIL]: {
    strategy: 'preserve_domain',
    char: '*',
    preserveLength: true,
  },
  [PIIType.PHONE]: {
    strategy: 'partial',
    char: '*',
    preserveLength: true,
    visibleChars: 4,
  },
  [PIIType.SSN]: {
    strategy: 'partial',
    char: '*',
    preserveLength: true,
    visibleChars: 4,
  },
  [PIIType.CREDIT_CARD]: {
    strategy: 'partial',
    char: '*',
    preserveLength: true,
    visibleChars: 4,
  },
  [PIIType.NAME]: {
    strategy: 'full',
    char: '*',
    preserveLength: false,
  },
  [PIIType.ADDRESS]: {
    strategy: 'full',
    char: '*',
    preserveLength: false,
  },
  [PIIType.IP_ADDRESS]: {
    strategy: 'partial',
    char: '*',
    preserveLength: true,
    visibleChars: 4,
  },
  [PIIType.CUSTOM]: {
    strategy: 'full',
    char: '*',
    preserveLength: true,
  },
};
