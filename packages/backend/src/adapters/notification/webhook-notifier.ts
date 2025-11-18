import { INotificationAdapter, NotificationEvent } from '../types';
import { logger } from '../../lib/logger';

export class WebhookNotifier implements INotificationAdapter {
  private webhookUrl: string;
  private secret?: string;

  constructor(webhookUrl: string, secret?: string) {
    this.webhookUrl = webhookUrl;
    this.secret = secret;
  }

  async sendNotification(event: NotificationEvent): Promise<void> {
    try {
      const payload = {
        event: event.type,
        timestamp: event.timestamp.toISOString(),
        data: event.data,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'PII-Gateway-Webhook/1.0',
      };

      // Add signature if secret is provided
      if (this.secret) {
        const signature = await this.generateSignature(JSON.stringify(payload));
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      logger.info('Webhook notification sent successfully', {
        url: this.webhookUrl,
        eventType: event.type,
      });
    } catch (error) {
      logger.error('Failed to send webhook notification', error, {
        url: this.webhookUrl,
        eventType: event.type,
      });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'HEAD',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async generateSignature(payload: string): Promise<string> {
    if (!this.secret) return '';

    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const key = encoder.encode(this.secret);

    // Simple HMAC-like signature (in production, use crypto.subtle.importKey)
    const hash = await crypto.subtle.digest('SHA-256', new Uint8Array([...key, ...data]));
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
