/**
 * Brevo API Client
 *
 * Handles communication with Brevo (formerly SendinBlue) API
 * with retry logic and error handling.
 */

interface BrevoConfig {
  apiKey: string;
  baseUrl?: string;
}

interface BrevoError {
  code: string;
  message: string;
}

export class BrevoClient {
  private apiKey: string;
  private baseUrl: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second

  constructor(config: BrevoConfig) {
    if (!config.apiKey) {
      throw new Error('Brevo API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.brevo.com/v3';
  }

  /**
   * Make a request to Brevo API with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // If rate limited, wait and retry
      if (response.status === 429 && retryCount < this.maxRetries) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
        await this.sleep(retryAfter * 1000);
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      // If server error, retry with exponential backoff
      if (response.status >= 500 && retryCount < this.maxRetries) {
        await this.sleep(this.retryDelay * Math.pow(2, retryCount));
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      if (!response.ok) {
        const error: BrevoError = await response.json().catch(() => ({
          code: 'UNKNOWN_ERROR',
          message: response.statusText,
        }));

        throw new Error(
          `Brevo API error (${response.status}): ${error.message}`
        );
      }

      return response.json();
    } catch (error) {
      // Network errors - retry
      if (
        error instanceof TypeError &&
        error.message.includes('fetch') &&
        retryCount < this.maxRetries
      ) {
        await this.sleep(this.retryDelay * Math.pow(2, retryCount));
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Send a transactional email via Brevo
   */
  async sendTransactionalEmail(params: {
    to: Array<{ email: string; name?: string }>;
    subject: string;
    htmlContent: string;
    sender: { email: string; name?: string };
    replyTo?: { email: string; name?: string };
    params?: Record<string, string>;
  }): Promise<{ messageId: string }> {
    return this.request('/smtp/email', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Send email using a template
   */
  async sendTemplateEmail(params: {
    templateId: number;
    to: Array<{ email: string; name?: string }>;
    params: Record<string, string>;
    sender?: { email: string; name?: string };
  }): Promise<{ messageId: string }> {
    return this.request('/smtp/email', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get email event history
   */
  async getEmailEvents(params: {
    email?: string;
    event?:
      | 'sent'
      | 'delivered'
      | 'hardBounce'
      | 'softBounce'
      | 'request'
      | 'opened'
      | 'click'
      | 'invalid'
      | 'deferred'
      | 'blocked'
      | 'unsubscribed';
    days?: number;
    limit?: number;
  }): Promise<{
    events: Array<{
      email: string;
      event: string;
      date: string;
      messageId: string;
    }>;
  }> {
    const queryParams = new URLSearchParams(
      Object.entries(params)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    );

    return this.request(`/smtp/statistics/events?${queryParams}`);
  }

  /**
   * Sleep utility for retry logic
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Get configured Brevo client instance
 */
export function getBrevoClient(): BrevoClient {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error(
      'BREVO_API_KEY environment variable is not set. Please configure Brevo in your .env file.'
    );
  }

  return new BrevoClient({ apiKey });
}
