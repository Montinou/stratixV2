/**
 * Email Sender Service
 *
 * High-level service for sending invitation emails via Brevo
 */

import { getBrevoClient } from './client';
import {
  getInvitationEmailTemplate,
  getReminderEmailTemplate,
  getWelcomeEmailTemplate,
  type InvitationEmailParams,
  type ReminderEmailParams,
} from './templates';

interface SendInvitationEmailParams {
  to: string;
  toName?: string;
  organizationName: string;
  organizationSlug: string;
  role: 'corporativo' | 'gerente' | 'empleado';
  inviterName: string;
  inviterEmail: string;
  invitationToken: string;
  expiresAt: Date;
}

interface SendReminderEmailParams extends SendInvitationEmailParams {
  daysRemaining: number;
}

interface SendWelcomeEmailParams {
  to: string;
  userName: string;
  organizationName: string;
  role: 'corporativo' | 'gerente' | 'empleado';
}

/**
 * Get sender configuration from environment
 */
function getSenderConfig(): { email: string; name: string } {
  const email = process.env.BREVO_SENDER_EMAIL || 'noreply@stratix.com';
  const name = process.env.BREVO_SENDER_NAME || 'Stratix OKR Platform';

  return { email, name };
}

/**
 * Get base URL for the application
 */
function getBaseUrl(): string {
  // In production, use VERCEL_URL or custom domain
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // In development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  // Fallback
  return 'https://stratix.vercel.app';
}

/**
 * Build invitation acceptance URL
 */
function buildAcceptUrl(token: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/invite/${token}`;
}

/**
 * Send initial invitation email
 */
export async function sendInvitationEmail(
  params: SendInvitationEmailParams
): Promise<{ messageId: string }> {
  const client = getBrevoClient();
  const sender = getSenderConfig();
  const acceptUrl = buildAcceptUrl(params.invitationToken);

  const templateParams: InvitationEmailParams = {
    inviteeName: params.toName,
    organizationName: params.organizationName,
    organizationSlug: params.organizationSlug,
    role: params.role,
    inviterName: params.inviterName,
    inviterEmail: params.inviterEmail,
    acceptUrl,
    expiresAt: params.expiresAt,
  };

  const htmlContent = getInvitationEmailTemplate(templateParams);

  try {
    const result = await client.sendTransactionalEmail({
      to: [{ email: params.to, name: params.toName }],
      subject: `Invitación para unirte a ${params.organizationName}`,
      htmlContent,
      sender,
      replyTo: {
        email: params.inviterEmail,
        name: params.inviterName,
      },
    });

    console.log(`Invitation email sent to ${params.to}. MessageId: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`Failed to send invitation email to ${params.to}:`, error);
    throw new Error(
      `Failed to send invitation email: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Send reminder email
 */
export async function sendReminderEmail(
  params: SendReminderEmailParams
): Promise<{ messageId: string }> {
  const client = getBrevoClient();
  const sender = getSenderConfig();
  const acceptUrl = buildAcceptUrl(params.invitationToken);

  const templateParams: ReminderEmailParams = {
    inviteeName: params.toName,
    organizationName: params.organizationName,
    organizationSlug: params.organizationSlug,
    role: params.role,
    inviterName: params.inviterName,
    inviterEmail: params.inviterEmail,
    acceptUrl,
    expiresAt: params.expiresAt,
    daysRemaining: params.daysRemaining,
  };

  const htmlContent = getReminderEmailTemplate(templateParams);

  try {
    const result = await client.sendTransactionalEmail({
      to: [{ email: params.to, name: params.toName }],
      subject: `Recordatorio: Invitación a ${params.organizationName} (expira en ${params.daysRemaining} ${params.daysRemaining === 1 ? 'día' : 'días'})`,
      htmlContent,
      sender,
      replyTo: {
        email: params.inviterEmail,
        name: params.inviterName,
      },
    });

    console.log(`Reminder email sent to ${params.to}. MessageId: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`Failed to send reminder email to ${params.to}:`, error);
    throw new Error(
      `Failed to send reminder email: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Send welcome email after invitation acceptance
 */
export async function sendWelcomeEmail(
  params: SendWelcomeEmailParams
): Promise<{ messageId: string }> {
  const client = getBrevoClient();
  const sender = getSenderConfig();
  const loginUrl = `${getBaseUrl()}/tools`;

  const htmlContent = getWelcomeEmailTemplate({
    userName: params.userName,
    organizationName: params.organizationName,
    role: params.role,
    loginUrl,
  });

  try {
    const result = await client.sendTransactionalEmail({
      to: [{ email: params.to }],
      subject: `¡Bienvenido a ${params.organizationName}!`,
      htmlContent,
      sender,
    });

    console.log(`Welcome email sent to ${params.to}. MessageId: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`Failed to send welcome email to ${params.to}:`, error);
    // Don't throw - welcome email is not critical
    return { messageId: '' };
  }
}

/**
 * Send notification to admin when invitation is accepted
 */
export async function sendAcceptanceNotificationEmail(params: {
  adminEmail: string;
  adminName: string;
  acceptedBy: string;
  acceptedByName: string;
  organizationName: string;
  role: 'corporativo' | 'gerente' | 'empleado';
}): Promise<{ messageId: string }> {
  const client = getBrevoClient();
  const sender = getSenderConfig();

  const roleLabels = {
    corporativo: 'Administrador Corporativo',
    gerente: 'Gerente',
    empleado: 'Empleado',
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invitación Aceptada</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #667eea;">✅ Invitación Aceptada</h2>

        <p>Hola ${params.adminName},</p>

        <p>
          <strong>${params.acceptedByName}</strong> (${params.acceptedBy}) ha aceptado tu invitación
          para unirse a <strong>${params.organizationName}</strong>.
        </p>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Usuario:</strong> ${params.acceptedByName}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${params.acceptedBy}</p>
          <p style="margin: 5px 0;"><strong>Rol:</strong> ${roleLabels[params.role]}</p>
        </div>

        <p>El usuario ya puede acceder a la plataforma y comenzar a colaborar con tu equipo.</p>

        <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
          Este es un correo automático de notificación.
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await client.sendTransactionalEmail({
      to: [{ email: params.adminEmail, name: params.adminName }],
      subject: `${params.acceptedByName} ha aceptado tu invitación`,
      htmlContent,
      sender,
    });

    console.log(`Acceptance notification sent to ${params.adminEmail}. MessageId: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`Failed to send acceptance notification to ${params.adminEmail}:`, error);
    // Don't throw - notification is not critical
    return { messageId: '' };
  }
}
