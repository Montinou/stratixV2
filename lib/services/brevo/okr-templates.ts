/**
 * Brevo Email Templates for OKR Smart Reminders
 *
 * Plantillas de email para recordatorios inteligentes de OKRs
 */

import { sendEmail } from './email-sender';

export interface SmartReminderEmailParams {
  to: string;
  ownerName: string;
  objectiveTitle: string;
  objectiveProgress: number;
  reminderType: 'stale_objective' | 'upcoming_deadline' | 'completion_celebration';
  daysSinceUpdate?: number;
  daysRemaining?: number;
  objectiveId: string;
  companyId: string;
}

/**
 * Base email styles (matching invitation templates)
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
    .btn {
      display: inline-block;
      padding: 14px 32px;
      margin: 20px 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
    }
    .progress-bar {
      width: 100%;
      height: 8px;
      background-color: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin: 10px 0;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    }
    .footer {
      padding: 30px;
      text-align: center;
      background-color: #f8f9fa;
      color: #666;
      font-size: 14px;
    }
  </style>
`;

/**
 * Template for stale objective reminder
 */
function getStaleObjectiveTemplate(params: SmartReminderEmailParams): string {
  const progress = params.objectiveProgress || 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stratix.vercel.app';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Recordatorio de Objetivo</h1>
        </div>
        <div class="content">
          <p>Hola ${params.ownerName},</p>

          <p>Notamos que no has actualizado tu objetivo en <strong>${params.daysSinceUpdate} días</strong>:</p>

          <div class="info-box">
            <h3>📌 ${params.objectiveTitle}</h3>
            <p><strong>Progreso actual:</strong> ${progress}%</p>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
          </div>

          <p><strong>¿Qué puedes hacer ahora?</strong></p>
          <ul>
            <li>Actualiza el progreso de tus iniciativas</li>
            <li>Marca actividades completadas</li>
            <li>Agrega comentarios sobre el estado actual</li>
            <li>Identifica y documenta bloqueos</li>
          </ul>

          <div style="text-align: center;">
            <a href="${appUrl}/tools/objectives?highlight=${params.objectiveId}" class="btn">
              Actualizar Objetivo
            </a>
          </div>

          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            💡 <strong>Tip:</strong> Actualizar tus objetivos regularmente ayuda al equipo a mantenerse alineado
            y permite identificar riesgos temprano.
          </p>
        </div>
        <div class="footer">
          <p>Este es un recordatorio automático de StratixV2</p>
          <p>Para desactivar estos recordatorios, ajusta tus preferencias en la configuración</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Template for upcoming deadline reminder
 */
function getUpcomingDeadlineTemplate(params: SmartReminderEmailParams): string {
  const progress = params.objectiveProgress || 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stratix.vercel.app';
  const isAtRisk = progress < 80 && params.daysRemaining && params.daysRemaining <= 3;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header" style="${isAtRisk ? 'background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);' : ''}">
          <h1>${isAtRisk ? '⚠️' : '⏳'} Deadline Próximo</h1>
        </div>
        <div class="content">
          <p>Hola ${params.ownerName},</p>

          <p>Tu objetivo está próximo a su fecha límite:</p>

          <div class="info-box" style="${isAtRisk ? 'border-left-color: #f5576c;' : ''}">
            <h3>🎯 ${params.objectiveTitle}</h3>
            <p><strong>Tiempo restante:</strong> ${params.daysRemaining} días</p>
            <p><strong>Progreso actual:</strong> ${progress}%</p>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%; ${isAtRisk ? 'background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);' : ''}"></div>
            </div>
          </div>

          ${isAtRisk ? `
            <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>⚠️ Este objetivo está en riesgo</strong><br>
                El progreso actual (${progress}%) está por debajo de lo esperado para el tiempo restante.
              </p>
            </div>

            <p><strong>Acciones recomendadas:</strong></p>
            <ul>
              <li>Revisar iniciativas bloqueadas</li>
              <li>Considerar reasignar recursos</li>
              <li>Evaluar si es necesario ajustar el alcance</li>
              <li>Comunicar riesgos al equipo</li>
            </ul>
          ` : `
            <p><strong>¡Vas por buen camino!</strong> 🎉</p>
            <ul>
              <li>Mantén el ritmo actual de trabajo</li>
              <li>Completa las actividades pendientes</li>
              <li>Prepara el cierre del objetivo</li>
            </ul>
          `}

          <div style="text-align: center;">
            <a href="${appUrl}/tools/objectives?highlight=${params.objectiveId}" class="btn">
              Ver Objetivo
            </a>
          </div>
        </div>
        <div class="footer">
          <p>Este es un recordatorio automático de StratixV2</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Template for completion celebration
 */
function getCompletionCelebrationTemplate(params: SmartReminderEmailParams): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stratix.vercel.app';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
          <h1>🎉 ¡Felicitaciones!</h1>
        </div>
        <div class="content">
          <p>Hola ${params.ownerName},</p>

          <h2 style="color: #11998e; text-align: center; margin: 30px 0;">
            ✨ ¡Has completado un objetivo! ✨
          </h2>

          <div class="info-box" style="border-left-color: #38ef7d;">
            <h3>🎯 ${params.objectiveTitle}</h3>
            <p><strong>Estado:</strong> Completado ✅</p>
            <div class="progress-bar">
              <div class="progress-fill" style="width: 100%; background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%);"></div>
            </div>
          </div>

          <p style="font-size: 16px; text-align: center; margin: 30px 0;">
            Tu dedicación y esfuerzo han dado resultados. ¡Excelente trabajo! 👏
          </p>

          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #155724; text-align: center;">
              <strong>💡 Próximos pasos sugeridos:</strong><br><br>
              • Documenta las lecciones aprendidas<br>
              • Comparte el éxito con tu equipo<br>
              • Comienza a planear tu próximo objetivo
            </p>
          </div>

          <div style="text-align: center;">
            <a href="${appUrl}/tools/objectives?highlight=${params.objectiveId}" class="btn" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
              Ver Objetivo Completado
            </a>
          </div>
        </div>
        <div class="footer">
          <p>¡Sigue así! El equipo de StratixV2 está orgulloso de tu logro 🚀</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send smart reminder email
 */
export async function sendSmartReminderEmail(params: SmartReminderEmailParams): Promise<void> {
  let subject: string;
  let htmlContent: string;

  switch (params.reminderType) {
    case 'stale_objective':
      subject = `⏰ Recordatorio: Actualiza "${params.objectiveTitle}"`;
      htmlContent = getStaleObjectiveTemplate(params);
      break;

    case 'upcoming_deadline':
      const isUrgent = params.objectiveProgress < 80 && params.daysRemaining && params.daysRemaining <= 3;
      subject = isUrgent
        ? `⚠️ Urgente: "${params.objectiveTitle}" vence en ${params.daysRemaining} días`
        : `⏳ Deadline próximo: "${params.objectiveTitle}" (${params.daysRemaining} días)`;
      htmlContent = getUpcomingDeadlineTemplate(params);
      break;

    case 'completion_celebration':
      subject = `🎉 ¡Felicitaciones! Completaste "${params.objectiveTitle}"`;
      htmlContent = getCompletionCelebrationTemplate(params);
      break;

    default:
      throw new Error(`Unknown reminder type: ${params.reminderType}`);
  }

  await sendEmail({
    to: [{ email: params.to, name: params.ownerName }],
    subject,
    htmlContent,
  });
}

/**
 * Weekly Report Email Parameters
 */
export interface WeeklyReportEmailParams {
  to: string;
  recipientName: string;
  companyName: string;
  reportData: any; // WeeklyReportData from report-generator.ts
  aiSummary: string;
}

/**
 * Template for weekly report
 */
function getWeeklyReportTemplate(params: WeeklyReportEmailParams): string {
  const { reportData, aiSummary } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stratix.vercel.app';

  // Formatear fechas
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
          <h1>📊 Reporte Semanal OKRs</h1>
        </div>
        <div class="content">
          <p>Hola ${params.recipientName},</p>

          <p>Este es el resumen de progreso semanal para <strong>${params.companyName}</strong></p>
          <p style="color: #666; font-size: 14px;">
            Periodo: ${formatDate(reportData.period.start)} - ${formatDate(reportData.period.end)}
          </p>

          <h3 style="margin-top: 30px; color: #667eea;">📈 Resumen Ejecutivo</h3>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 15px 0; white-space: pre-line;">
            ${aiSummary}
          </div>

          <h3 style="margin-top: 30px; color: #667eea;">📊 Métricas Clave</h3>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #667eea;">Categoría</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #667eea;">Total</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #667eea;">Completados</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #667eea;">En Progreso</th>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">Objetivos</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">${reportData.objectives.total}</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0; color: #11998e; font-weight: 600;">${reportData.objectives.completed}</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">${reportData.objectives.inProgress}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">Iniciativas</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">${reportData.initiatives.total}</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0; color: #11998e; font-weight: 600;">${reportData.initiatives.completed}</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">${reportData.initiatives.inProgress}</td>
            </tr>
            <tr>
              <td style="padding: 12px;">Actividades</td>
              <td style="padding: 12px; text-align: center;">${reportData.activities.total}</td>
              <td style="padding: 12px; text-align: center; color: #11998e; font-weight: 600;">${reportData.activities.completed}</td>
              <td style="padding: 12px; text-align: center;">-</td>
            </tr>
          </table>

          ${reportData.objectives.atRisk > 0 ? `
            <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>⚠️ Atención:</strong> ${reportData.objectives.atRisk} objetivo(s) en riesgo
              </p>
            </div>
          ` : ''}

          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #155724;">
              <strong>✅ Esta semana:</strong> ${reportData.activities.completedThisWeek} actividades completadas
            </p>
          </div>

          ${reportData.topPerformers.length > 0 ? `
            <h3 style="margin-top: 30px; color: #667eea;">⭐ Top Performers de la Semana</h3>
            <ul style="list-style: none; padding: 0;">
              ${reportData.topPerformers.map((performer: any) => `
                <li style="padding: 10px; background-color: #f8f9fa; margin: 5px 0; border-radius: 4px;">
                  <strong>${performer.name}</strong> (${performer.area})<br>
                  <span style="color: #11998e;">✓ ${performer.completedActivities} actividades completadas</span>
                </li>
              `).join('')}
            </ul>
          ` : ''}

          ${reportData.areaPerformance.length > 0 ? `
            <h3 style="margin-top: 30px; color: #667eea;">🎯 Performance por Área</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #667eea;">Área</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #667eea;">Objetivos</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #667eea;">Progreso Promedio</th>
              </tr>
              ${reportData.areaPerformance.slice(0, 5).map((area: any) => `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${area.areaName}</td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">${area.objectivesCount}</td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">
                    <div class="progress-bar" style="max-width: 100px; margin: 0 auto;">
                      <div class="progress-fill" style="width: ${area.avgProgress}%"></div>
                    </div>
                    ${area.avgProgress}%
                  </td>
                </tr>
              `).join('')}
            </table>
          ` : ''}

          <div style="text-align: center; margin-top: 40px;">
            <a href="${appUrl}/tools/okr" class="btn" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
              Ver Dashboard Completo
            </a>
          </div>
        </div>
        <div class="footer">
          <p>Reporte generado automáticamente por StratixV2</p>
          <p>Para ajustar la frecuencia de reportes, visita tu configuración</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send weekly report email
 */
export async function sendWeeklyReportEmail(params: WeeklyReportEmailParams): Promise<void> {
  const subject = `📊 Reporte Semanal OKRs - ${params.companyName}`;
  const htmlContent = getWeeklyReportTemplate(params);

  await sendEmail({
    to: [{ email: params.to, name: params.recipientName }],
    subject,
    htmlContent,
  });
}
