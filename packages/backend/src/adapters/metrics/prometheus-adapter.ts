import { IMetricsAdapter } from '../types';
import { logger } from '../../lib/logger';

/**
 * Prometheus metrics adapter - stub implementation
 * In production, use prom-client library
 */
export class PrometheusAdapter implements IMetricsAdapter {
  private buffer: Array<{ name: string; value: number; labels: Record<string, string>; type: string }> = [];

  async recordCounter(name: string, value: number, labels?: Record<string, string>): Promise<void> {
    this.buffer.push({
      name,
      value,
      labels: labels || {},
      type: 'counter',
    });

    logger.debug('Recorded counter metric', { name, value, labels });
  }

  async recordGauge(name: string, value: number, labels?: Record<string, string>): Promise<void> {
    this.buffer.push({
      name,
      value,
      labels: labels || {},
      type: 'gauge',
    });

    logger.debug('Recorded gauge metric', { name, value, labels });
  }

  async recordHistogram(name: string, value: number, labels?: Record<string, string>): Promise<void> {
    this.buffer.push({
      name,
      value,
      labels: labels || {},
      type: 'histogram',
    });

    logger.debug('Recorded histogram metric', { name, value, labels });
  }

  async flush(): Promise<void> {
    if (this.buffer.length > 0) {
      logger.info('Flushing metrics buffer', { count: this.buffer.length });
      // In production: send to Prometheus pushgateway
      this.buffer = [];
    }
  }

  /**
   * Export metrics in Prometheus text format
   */
  exportPrometheusFormat(): string {
    const lines: string[] = [];

    for (const metric of this.buffer) {
      const labelStr = Object.entries(metric.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      const metricLine = labelStr
        ? `${metric.name}{${labelStr}} ${metric.value}`
        : `${metric.name} ${metric.value}`;
      lines.push(metricLine);
    }

    return lines.join('\n');
  }
}
