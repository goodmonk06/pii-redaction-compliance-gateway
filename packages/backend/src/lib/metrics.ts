/**
 * Centralized metrics utility
 * Provides counters, gauges, and histograms
 * In-memory implementation with export capabilities
 */

interface Labels {
  [key: string]: string;
}

interface MetricValue {
  value: number;
  labels: Labels;
  timestamp: number;
}

interface Histogram {
  count: number;
  sum: number;
  buckets: Map<number, number>;
}

class MetricsRegistry {
  private counters: Map<string, MetricValue[]> = new Map();
  private gauges: Map<string, MetricValue> = new Map();
  private histograms: Map<string, Histogram> = new Map();

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels: Labels = {}, value: number = 1) {
    const key = this.getKey(name, labels);
    const existing = this.counters.get(key) || [];

    existing.push({
      value,
      labels,
      timestamp: Date.now(),
    });

    this.counters.set(key, existing);
  }

  /**
   * Set a gauge metric (point-in-time value)
   */
  setGauge(name: string, value: number, labels: Labels = {}) {
    const key = this.getKey(name, labels);
    this.gauges.set(key, {
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a histogram observation
   */
  recordHistogram(name: string, value: number, labels: Labels = {}) {
    const key = this.getKey(name, labels);
    const existing = this.histograms.get(key) || {
      count: 0,
      sum: 0,
      buckets: new Map(),
    };

    existing.count++;
    existing.sum += value;

    // Simple bucketing
    const bucket = this.getBucket(value);
    existing.buckets.set(bucket, (existing.buckets.get(bucket) || 0) + 1);

    this.histograms.set(key, existing);
  }

  /**
   * Get counter total
   */
  getCounter(name: string, labels: Labels = {}): number {
    const key = this.getKey(name, labels);
    const values = this.counters.get(key) || [];
    return values.reduce((sum, v) => sum + v.value, 0);
  }

  /**
   * Get gauge value
   */
  getGauge(name: string, labels: Labels = {}): number | undefined {
    const key = this.getKey(name, labels);
    return this.gauges.get(key)?.value;
  }

  /**
   * Get histogram stats
   */
  getHistogram(name: string, labels: Labels = {}): Histogram | undefined {
    const key = this.getKey(name, labels);
    return this.histograms.get(key);
  }

  /**
   * Export all metrics
   */
  export(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, any>;
  } {
    const counters: Record<string, number> = {};
    const gauges: Record<string, number> = {};
    const histograms: Record<string, any> = {};

    for (const [key, values] of this.counters.entries()) {
      counters[key] = values.reduce((sum, v) => sum + v.value, 0);
    }

    for (const [key, value] of this.gauges.entries()) {
      gauges[key] = value.value;
    }

    for (const [key, value] of this.histograms.entries()) {
      histograms[key] = {
        count: value.count,
        sum: value.sum,
        avg: value.count > 0 ? value.sum / value.count : 0,
      };
    }

    return { counters, gauges, histograms };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  private getKey(name: string, labels: Labels): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  private getBucket(value: number): number {
    const buckets = [0.001, 0.01, 0.1, 0.5, 1, 5, 10, 50, 100, 500, 1000];
    for (const bucket of buckets) {
      if (value <= bucket) return bucket;
    }
    return Infinity;
  }
}

export const metrics = new MetricsRegistry();

// Common metric names
export const MetricNames = {
  REDACTION_REQUESTS: 'pii.redaction.requests.total',
  REDACTION_DURATION: 'pii.redaction.duration.seconds',
  REDACTION_FIELDS_TOTAL: 'pii.redaction.fields.total',
  REDACTION_FIELDS_MASKED: 'pii.redaction.fields.masked',
  DETECTION_BY_TYPE: 'pii.detection.by_type.total',
  PROFILE_CREATED: 'pii.profile.created.total',
  API_REQUESTS: 'api.requests.total',
  API_ERRORS: 'api.errors.total',
};
