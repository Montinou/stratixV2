import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/webhooks/brevo
 *
 * Webhook endpoint for Brevo email events
 * Configure in Brevo dashboard: https://app.brevo.com/settings/webhooks
 *
 * Events tracked:
 * - sent: Email was sent successfully
 * - delivered: Email was delivered to recipient
 * - opened: Recipient opened the email
 * - click: Recipient clicked a link in the email
 * - hardBounce: Email bounced (invalid address)
 * - softBounce: Email bounced (temporary issue)
 * - blocked: Email was blocked
 * - unsubscribed: Recipient unsubscribed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log the event for debugging
    console.log('[Brevo Webhook] Event received:', {
      event: body.event,
      email: body.email,
      messageId: body['message-id'],
      timestamp: body.ts_event,
    });

    // Handle different event types
    switch (body.event) {
      case 'sent':
        // Email was sent successfully
        console.log(`Email sent to ${body.email}`);
        break;

      case 'delivered':
        // Email was delivered
        console.log(`Email delivered to ${body.email}`);
        break;

      case 'opened':
        // Email was opened
        console.log(`Email opened by ${body.email}`);
        // Could track this in database for analytics
        break;

      case 'click':
        // Link was clicked
        console.log(`Link clicked by ${body.email}`, {
          link: body.link,
        });
        break;

      case 'hardBounce':
      case 'softBounce':
        // Email bounced
        console.error(`Email bounced for ${body.email}:`, {
          reason: body.reason,
          event: body.event,
        });
        // Could mark invitation as failed or notify admin
        break;

      case 'blocked':
        // Email was blocked
        console.error(`Email blocked for ${body.email}:`, {
          reason: body.reason,
        });
        break;

      case 'unsubscribed':
        // User unsubscribed
        console.log(`User unsubscribed: ${body.email}`);
        break;

      default:
        console.log(`Unknown event type: ${body.event}`);
    }

    // Acknowledge receipt
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing Brevo webhook:', error);

    // Still return 200 to prevent Brevo from retrying
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 }
    );
  }
}
