/**
 * Brevo Service
 *
 * Export all Brevo-related functionality
 */

export { BrevoClient, getBrevoClient } from './client';
export {
  sendInvitationEmail,
  sendReminderEmail,
  sendWelcomeEmail,
  sendAcceptanceNotificationEmail,
} from './email-sender';
export {
  getInvitationEmailTemplate,
  getReminderEmailTemplate,
  getWelcomeEmailTemplate,
  type InvitationEmailParams,
  type ReminderEmailParams,
} from './templates';
