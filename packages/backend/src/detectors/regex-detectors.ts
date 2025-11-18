import { Detector, PIIType } from './types';

export class EmailDetector implements Detector {
  type = PIIType.EMAIL;
  private regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  detect(value: string): boolean {
    if (typeof value !== 'string') return false;
    return this.regex.test(value.trim());
  }

  getConfidence(value: string): number {
    if (!this.detect(value)) return 0;
    // Higher confidence for common email domains
    const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    const domain = value.split('@')[1]?.toLowerCase();
    return commonDomains.includes(domain) ? 0.95 : 0.85;
  }
}

export class PhoneDetector implements Detector {
  type = PIIType.PHONE;
  private regex = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;

  detect(value: string): boolean {
    if (typeof value !== 'string') return false;
    const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15 && this.regex.test(value);
  }

  getConfidence(value: string): number {
    if (!this.detect(value)) return 0;
    const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
    // Higher confidence for properly formatted numbers
    return value.includes('-') || value.includes('(') ? 0.9 : 0.75;
  }
}

export class SSNDetector implements Detector {
  type = PIIType.SSN;
  private regex = /^\d{3}-?\d{2}-?\d{4}$/;

  detect(value: string): boolean {
    if (typeof value !== 'string') return false;
    return this.regex.test(value.trim());
  }

  getConfidence(value: string): number {
    if (!this.detect(value)) return 0;
    // Higher confidence for properly formatted SSNs with dashes
    return value.includes('-') ? 0.95 : 0.8;
  }
}

export class CreditCardDetector implements Detector {
  type = PIIType.CREDIT_CARD;
  private regex = /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/;

  detect(value: string): boolean {
    if (typeof value !== 'string') return false;
    const cleaned = value.replace(/[\s\-]/g, '');
    if (!this.regex.test(value) || cleaned.length !== 16) return false;

    // Luhn algorithm check
    return this.luhnCheck(cleaned);
  }

  getConfidence(value: string): number {
    if (!this.detect(value)) return 0;
    return 0.9; // High confidence if passes Luhn check
  }

  private luhnCheck(cardNumber: string): boolean {
    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }
}

export class NameDetector implements Detector {
  type = PIIType.NAME;
  // Simple heuristic: 2-4 words, each capitalized, 2+ chars
  private regex = /^[A-Z][a-z]+(\s[A-Z][a-z]+){1,3}$/;

  detect(value: string): boolean {
    if (typeof value !== 'string') return false;
    return this.regex.test(value.trim());
  }

  getConfidence(value: string): number {
    if (!this.detect(value)) return 0;
    const words = value.trim().split(/\s+/);
    // Higher confidence for 2-3 word names
    return words.length === 2 || words.length === 3 ? 0.7 : 0.5;
  }
}

export class IPAddressDetector implements Detector {
  type = PIIType.IP_ADDRESS;
  // IPv4
  private ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 (simplified)
  private ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  detect(value: string): boolean {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();

    if (this.ipv4Regex.test(trimmed)) {
      // Validate IPv4 octets are 0-255
      const octets = trimmed.split('.');
      return octets.every(octet => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
      });
    }

    return this.ipv6Regex.test(trimmed);
  }

  getConfidence(value: string): number {
    if (!this.detect(value)) return 0;
    return 0.95;
  }
}

export class DetectorRegistry {
  private detectors: Detector[] = [
    new EmailDetector(),
    new PhoneDetector(),
    new SSNDetector(),
    new CreditCardDetector(),
    new NameDetector(),
    new IPAddressDetector(),
  ];

  detectAll(value: string): Array<{ type: PIIType; confidence: number }> {
    const results: Array<{ type: PIIType; confidence: number }> = [];

    for (const detector of this.detectors) {
      if (detector.detect(value)) {
        results.push({
          type: detector.type,
          confidence: detector.getConfidence(value),
        });
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  detectByType(value: string, type: PIIType): boolean {
    const detector = this.detectors.find(d => d.type === type);
    return detector ? detector.detect(value) : false;
  }
}
