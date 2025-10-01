/**
 * Brevo Email Templates
 *
 * HTML templates for invitation emails with Spanish localization
 */

export interface InvitationEmailParams {
  inviteeName?: string;
  organizationName: string;
  organizationSlug: string;
  role: 'corporativo' | 'gerente' | 'empleado';
  inviterName: string;
  inviterEmail: string;
  acceptUrl: string;
  expiresAt: Date;
}

export interface ReminderEmailParams extends InvitationEmailParams {
  daysRemaining: number;
}

/**
 * Get role label in Spanish
 */
function getRoleLabel(role: 'corporativo' | 'gerente' | 'empleado'): string {
  const roles = {
    corporativo: 'Administrador Corporativo',
    gerente: 'Gerente',
    empleado: 'Empleado',
  };
  return roles[role];
}

/**
 * Base email styles
 */
const baseStyles = `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      color: #667eea;
    }
    .info-box p {
      margin: 5px 0;
      font-size: 14px;
    }
    .cta-button {
      display: inline-block;
      padding: 16px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      text-align: center;
    }
    .cta-button:hover {
      opacity: 0.9;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
    }
    .divider {
      border-top: 1px solid #e9ecef;
      margin: 30px 0;
    }
    .expiry-notice {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #856404;
    }
  </style>
`;

/**
 * Initial invitation email template
 */
export function getInvitationEmailTemplate(params: InvitationEmailParams): string {
  const roleLabel = getRoleLabel(params.role);
  const expiryDate = params.expiresAt.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitación a ${params.organizationName}</title>
      ${baseStyles}
    </head>
    <body>
      <div style="padding: 20px;">
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Tienes una invitación!</h1>
          </div>

          <div class="content">
            <p style="font-size: 16px; margin-bottom: 20px;">
              ${params.inviteeName ? `Hola ${params.inviteeName},` : 'Hola,'}
            </p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>${params.inviterName}</strong> (${params.inviterEmail}) te ha invitado a unirte a
              <strong>${params.organizationName}</strong> en Stratix, la plataforma de gestión de OKRs.
            </p>

            <div class="info-box">
              <h3>📋 Detalles de la invitación</h3>
              <p><strong>Organización:</strong> ${params.organizationName}</p>
              <p><strong>Rol asignado:</strong> ${roleLabel}</p>
              <p><strong>Invitado por:</strong> ${params.inviterName}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${params.acceptUrl}" class="cta-button">
                Aceptar Invitación
              </a>
            </div>

            <div class="expiry-notice">
              ⏰ Esta invitación expira el <strong>${expiryDate}</strong>
            </div>

            <div class="divider"></div>

            <p style="font-size: 14px; color: #6c757d;">
              Como <strong>${roleLabel}</strong>, tendrás acceso a las herramientas de gestión de OKRs
              y podrás colaborar con tu equipo en el seguimiento de objetivos e iniciativas estratégicas.
            </p>

            <p style="font-size: 14px; color: #6c757d; margin-top: 20px;">
              Si no esperabas esta invitación o no deseas unirte, simplemente ignora este correo.
            </p>
          </div>

          <div class="footer">
            <p>
              Enviado por <strong>Stratix OKR Platform</strong><br>
              Plataforma de Gestión de Objetivos y Resultados Clave
            </p>
            <p style="margin-top: 15px;">
              <a href="${params.acceptUrl}" style="color: #667eea; text-decoration: none;">
                ${params.acceptUrl}
              </a>
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Reminder email template
 */
export function getReminderEmailTemplate(params: ReminderEmailParams): string {
  const roleLabel = getRoleLabel(params.role);
  const expiryDate = params.expiresAt.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recordatorio: Invitación a ${params.organizationName}</title>
      ${baseStyles}
    </head>
    <body>
      <div style="padding: 20px;">
        <div class="container">
          <div class="header">
            <h1>⏰ Recordatorio de Invitación</h1>
          </div>

          <div class="content">
            <p style="font-size: 16px; margin-bottom: 20px;">
              ${params.inviteeName ? `Hola ${params.inviteeName},` : 'Hola,'}
            </p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              Tienes una invitación pendiente de <strong>${params.inviterName}</strong> para unirte a
              <strong>${params.organizationName}</strong>.
            </p>

            <div class="expiry-notice">
              ⚠️ Esta invitación expira en <strong>${params.daysRemaining} ${params.daysRemaining === 1 ? 'día' : 'días'}</strong> (${expiryDate})
            </div>

            <div class="info-box">
              <h3>📋 Detalles de la invitación</h3>
              <p><strong>Organización:</strong> ${params.organizationName}</p>
              <p><strong>Rol asignado:</strong> ${roleLabel}</p>
              <p><strong>Invitado por:</strong> ${params.inviterName}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${params.acceptUrl}" class="cta-button">
                Aceptar Invitación Ahora
              </a>
            </div>

            <div class="divider"></div>

            <p style="font-size: 14px; color: #6c757d;">
              No te pierdas la oportunidad de colaborar con tu equipo en la gestión de objetivos estratégicos.
            </p>

            <p style="font-size: 14px; color: #6c757d; margin-top: 20px;">
              Si tienes preguntas, contacta a ${params.inviterName} (${params.inviterEmail}).
            </p>
          </div>

          <div class="footer">
            <p>
              Enviado por <strong>Stratix OKR Platform</strong><br>
              Plataforma de Gestión de Objetivos y Resultados Clave
            </p>
            <p style="margin-top: 15px;">
              <a href="${params.acceptUrl}" style="color: #667eea; text-decoration: none;">
                ${params.acceptUrl}
              </a>
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Welcome email template (sent after accepting invitation)
 */
export function getWelcomeEmailTemplate(params: {
  userName: string;
  organizationName: string;
  role: 'corporativo' | 'gerente' | 'empleado';
  loginUrl: string;
}): string {
  const roleLabel = getRoleLabel(params.role);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenido a ${params.organizationName}</title>
      ${baseStyles}
    </head>
    <body>
      <div style="padding: 20px;">
        <div class="container">
          <div class="header">
            <h1>🎊 ¡Bienvenido!</h1>
          </div>

          <div class="content">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Hola ${params.userName},
            </p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              ¡Felicitaciones! Ya eres parte de <strong>${params.organizationName}</strong> como <strong>${roleLabel}</strong>.
            </p>

            <div class="info-box">
              <h3>🚀 Próximos pasos</h3>
              <p>✓ Completa tu perfil en la plataforma</p>
              <p>✓ Explora los objetivos e iniciativas de tu equipo</p>
              <p>✓ Comienza a colaborar en los OKRs organizacionales</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${params.loginUrl}" class="cta-button">
                Ir a la Plataforma
              </a>
            </div>

            <div class="divider"></div>

            <p style="font-size: 14px; color: #6c757d;">
              Como ${roleLabel}, tienes acceso a herramientas de gestión de OKRs que te permitirán
              contribuir al éxito de tu organización.
            </p>

            <p style="font-size: 14px; color: #6c757d; margin-top: 20px;">
              Si necesitas ayuda para comenzar, no dudes en contactar a tu equipo.
            </p>
          </div>

          <div class="footer">
            <p>
              Enviado por <strong>Stratix OKR Platform</strong><br>
              Plataforma de Gestión de Objetivos y Resultados Clave
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
