import { DetectorRegistry } from '../detectors/regex-detectors';
import { Masker, defaultMaskConfigs } from '../detectors/masking';
import { PIIType, MaskConfig, Detection } from '../detectors/types';

interface RedactionRule {
  fieldPattern: string;
  type: PIIType;
  maskConfig: MaskConfig;
  enabled: boolean;
}

interface RedactionResult {
  redactedData: any;
  detections: Detection[];
  stats: {
    totalFields: number;
    redactedFields: number;
    detectionsByType: Record<string, number>;
  };
}

export class RedactionService {
  private detectorRegistry = new DetectorRegistry();
  private masker = new Masker();

  async redact(data: any, rules: RedactionRule[]): Promise<RedactionResult> {
    const detections: Detection[] = [];
    let totalFields = 0;
    let redactedFields = 0;
    const detectionsByType: Record<string, number> = {};

    const redactedData = this.processValue(
      data,
      '',
      rules,
      detections,
      { totalFields, redactedFields, detectionsByType }
    );

    return {
      redactedData,
      detections,
      stats: {
        totalFields: totalFields,
        redactedFields: redactedFields,
        detectionsByType,
      },
    };
  }

  private processValue(
    value: any,
    path: string,
    rules: RedactionRule[],
    detections: Detection[],
    counters: { totalFields: number; redactedFields: number; detectionsByType: Record<string, number> }
  ): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item, index) =>
        this.processValue(item, `${path}[${index}]`, rules, detections, counters)
      );
    }

    if (typeof value === 'object') {
      const result: any = {};
      for (const [key, val] of Object.entries(value)) {
        const fieldPath = path ? `${path}.${key}` : key;
        result[key] = this.processValue(val, fieldPath, rules, detections, counters);
      }
      return result;
    }

    // Leaf value - check if it needs redaction
    counters.totalFields++;

    if (typeof value === 'string') {
      const matchingRule = this.findMatchingRule(path, value, rules);
      if (matchingRule) {
        const detection: Detection = {
          field: path,
          value: value,
          type: matchingRule.type,
          confidence: 1.0,
        };
        detections.push(detection);
        counters.redactedFields++;
        counters.detectionsByType[matchingRule.type] = (counters.detectionsByType[matchingRule.type] || 0) + 1;

        return this.masker.mask(value, matchingRule.maskConfig, matchingRule.type);
      }
    }

    return value;
  }

  private findMatchingRule(path: string, value: string, rules: RedactionRule[]): RedactionRule | null {
    for (const rule of rules) {
      if (!rule.enabled) continue;

      // Check if field pattern matches
      const fieldMatches = this.matchesFieldPattern(path, rule.fieldPattern);

      if (fieldMatches) {
        // If field pattern matches, check if value matches the PII type
        const valueMatches = this.detectorRegistry.detectByType(value, rule.type);
        if (valueMatches) {
          return rule;
        }
      }
    }

    // Fallback: Auto-detect PII even if no explicit field pattern matched
    const autoDetections = this.detectorRegistry.detectAll(value);
    if (autoDetections.length > 0 && autoDetections[0].confidence > 0.7) {
      const detectedType = autoDetections[0].type;
      // Check if there's a rule for this type (without field pattern requirement)
      const typeRule = rules.find(r => r.type === detectedType && r.enabled);
      if (typeRule) {
        return typeRule;
      }

      // Return a default rule for the detected type
      return {
        fieldPattern: '*',
        type: detectedType,
        maskConfig: defaultMaskConfigs[detectedType],
        enabled: true,
      };
    }

    return null;
  }

  private matchesFieldPattern(path: string, pattern: string): boolean {
    if (pattern === '*') return true;

    // Convert glob-like pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\[(\d+)\]/g, '\\[$1\\]');

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(path);
  }
}
