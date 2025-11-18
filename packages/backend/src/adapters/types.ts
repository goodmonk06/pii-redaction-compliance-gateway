/**
 * Adapter interface definitions for extensibility
 * These interfaces define integration points for external systems
 */

// Notification events
export interface NotificationEvent {
  type: string;
  timestamp: Date;
  data: Record<string, any>;
}

// Storage operations
export interface StorageObject {
  key: string;
  data: any;
  metadata?: Record<string, string>;
}

// Detection context
export interface DetectionContext {
  fieldPath: string;
  value: string;
  profileId?: string;
}

// Auth context
export interface AuthContext {
  apiKey?: string;
  userId?: string;
  organizationId?: string;
  permissions?: string[];
}

/**
 * Notification adapter for sending alerts and webhooks
 */
export interface INotificationAdapter {
  /**
   * Send a notification for an event
   */
  sendNotification(event: NotificationEvent): Promise<void>;

  /**
   * Check if the adapter is healthy
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Storage adapter for persisting redaction results
 */
export interface IStorageAdapter {
  /**
   * Store an object
   */
  store(object: StorageObject): Promise<string>;

  /**
   * Retrieve an object by key
   */
  retrieve(key: string): Promise<StorageObject | null>;

  /**
   * Delete an object
   */
  delete(key: string): Promise<void>;

  /**
   * List objects with optional prefix
   */
  list(prefix?: string): Promise<string[]>;
}

/**
 * Custom detector adapter for extending PII detection
 */
export interface IDetectorAdapter {
  /**
   * Detect PII in a value
   * Returns confidence score 0-1
   */
  detect(context: DetectionContext): Promise<{
    isPII: boolean;
    confidence: number;
    type?: string;
  }>;

  /**
   * Get the detector name
   */
  getName(): string;
}

/**
 * Metrics adapter for exporting metrics to external systems
 */
export interface IMetricsAdapter {
  /**
   * Record a counter metric
   */
  recordCounter(name: string, value: number, labels?: Record<string, string>): Promise<void>;

  /**
   * Record a gauge metric
   */
  recordGauge(name: string, value: number, labels?: Record<string, string>): Promise<void>;

  /**
   * Record a histogram/timing metric
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): Promise<void>;

  /**
   * Flush buffered metrics
   */
  flush(): Promise<void>;
}

/**
 * Authentication adapter for API key validation
 */
export interface IAuthAdapter {
  /**
   * Authenticate a request
   */
  authenticate(apiKey: string): Promise<AuthContext | null>;

  /**
   * Authorize an action
   */
  authorize(context: AuthContext, action: string, resource?: string): Promise<boolean>;
}
