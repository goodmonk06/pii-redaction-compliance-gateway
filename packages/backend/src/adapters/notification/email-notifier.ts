import { INotificationAdapter, NotificationEvent } from '../types';
import { logger } from '../../lib/logger';

/**
 * Email notifier - stub implementation
 * In production, integrate with SendGrid, AWS SES, or similar
 */
export class EmailNotifier implements INotificationAdapter {
  private recipients: string[];

  constructor(recipients: string[]) {
    this.recipients = recipients;
  }

  async sendNotification(event: NotificationEvent): Promise<void> {
    // Stub implementation - log instead of actually sending email
    logger.info('Email notification (stub)', {
      recipients: this.recipients,
      eventType: event.type,
      timestamp: event.timestamp.toISOString(),
    });

    // In production, implement actual email sending:
    // await emailClient.send({
    //   to: this.recipients,
    //   subject: `PII Gateway Alert: ${event.type}`,
    //   body: JSON.stringify(event.data, null, 2),
    // });
  }

  async healthCheck(): Promise<boolean> {
    // Always healthy for stub implementation
    return true;
  }
}
