export enum PIIType {
  EMAIL = 'email',
  PHONE = 'phone',
  SSN = 'ssn',
  CREDIT_CARD = 'credit_card',
  NAME = 'name',
  ADDRESS = 'address',
  IP_ADDRESS = 'ip_address',
  CUSTOM = 'custom',
}

export interface Detection {
  field: string;
  value: string;
  type: PIIType;
  confidence: number; // 0-1
}

export interface Detector {
  type: PIIType;
  detect(value: string): boolean;
  getConfidence(value: string): number;
}

export interface MaskConfig {
  strategy: 'full' | 'partial' | 'hash' | 'preserve_domain';
  char?: string;
  preserveLength?: boolean;
  visibleChars?: number; // For partial masking
}
