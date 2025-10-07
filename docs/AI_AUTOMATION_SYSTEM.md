# Sistema de Automatización Inteligente - StratixV2

Sistema completo de automatización de OKRs con inteligencia artificial para análisis proactivo, recordatorios inteligentes y reportes automáticos.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Configuración](#configuración)
- [Feature Flags](#feature-flags)
- [Componentes del Sistema](#componentes-del-sistema)
- [API Endpoints](#api-endpoints)
- [Cron Jobs](#cron-jobs)
- [Uso](#uso)
- [Costos](#costos)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Características

### 1. Análisis Automático Diario de OKRs
- Detecta objetivos en riesgo (progreso < 30%, tiempo > 50%)
- Identifica iniciativas bloqueadas (sin actividades en 7+ días)
- Reconoce high performers (progreso > 80%)
- Genera insights automáticos con IA
- **Cron**: Incluido en `/api/cron/ai-automation` (diario a las 8am)

### 2. Recordatorios Inteligentes
- Objetivos sin updates en 7+ días
- Deadlines próximos (3 días antes)
- Celebraciones de completitud
- **Cron**: Incluido en `/api/cron/ai-automation` (diario a las 8am)

### 3. Reportes Semanales Automáticos
- Resumen ejecutivo generado por IA
- Métricas de objetivos, iniciativas y actividades
- Top performers de la semana
- Performance por área
- **Cron**: Incluido en `/api/cron/ai-automation` (lunes a las 8am)

### 4. UI de Insights en Tiempo Real
- Visualización de insights generados
- Marcar insights como leídos
- Generación manual bajo demanda
- Estadísticas de uso

---

## ⚙️ Configuración

### 1. Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```bash
# AI Gateway (Required)
AI_GATEWAY_API_KEY="vck_xxxxxxxxxxxxx"
# o alternativamente
VERCEL_OIDC_TOKEN="your-vercel-token"

# Email Service (Required para recordatorios y reportes)
BREVO_API_KEY="xkeysib-xxxxxxxxxxxxx"
BREVO_SENDER_EMAIL="noreply@stratix.com"
BREVO_SENDER_NAME="Stratix OKR Platform"

# Cron Secret (Required en production)
CRON_SECRET="your-secure-cron-secret"

# Feature Flags - AI Automation (Default: disabled)
FEATURE_AI_DAILY_OKR_ANALYSIS="false"      # Análisis automático diario
FEATURE_AI_SMART_REMINDERS="false"         # Recordatorios inteligentes
FEATURE_AI_WEEKLY_REPORTS="false"          # Reportes semanales
FEATURE_AI_AUTO_INSIGHTS="false"           # Generación automática de insights
FEATURE_AI_RISK_DETECTION="false"          # Detección automática de riesgos

# Experimental Features (Use with caution)
FEATURE_AI_PREDICTIVE_ANALYTICS="false"    # Analítica predictiva
FEATURE_AI_AUTO_SUGGESTIONS="false"        # Sugerencias automáticas

# Optional - App URL (para links en emails)
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### 2. Activar Features

Para activar una feature, cambia su valor a `"true"`:

```bash
# Activar todas las features principales
FEATURE_AI_DAILY_OKR_ANALYSIS="true"
FEATURE_AI_SMART_REMINDERS="true"
FEATURE_AI_WEEKLY_REPORTS="true"
FEATURE_AI_AUTO_INSIGHTS="true"
FEATURE_AI_RISK_DETECTION="true"
```

**⚠️ Nota**: Las features están **desactivadas por defecto** para evitar costos inesperados.

---

## 🎛️ Feature Flags

El sistema usa feature flags para control granular de cada automatización:

| Feature Flag | Descripción | Impacto en Costos |
|---|---|---|
| `FEATURE_AI_DAILY_OKR_ANALYSIS` | Análisis diario de OKRs | ~$0.10/día/empresa |
| `FEATURE_AI_SMART_REMINDERS` | Recordatorios inteligentes | ~$0.05/día/empresa |
| `FEATURE_AI_WEEKLY_REPORTS` | Reportes semanales | ~$0.15/semana/empresa |
| `FEATURE_AI_AUTO_INSIGHTS` | Insights automáticos | ~$0.02/insight |
| `FEATURE_AI_RISK_DETECTION` | Detección de riesgos | ~$0.03/día/empresa |

### Verificar Features Habilitadas

Las features activas se loguean en cada ejecución de cron job:

```
[Feature Flags] Enabled AI features: FEATURE_AI_DAILY_OKR_ANALYSIS, FEATURE_AI_AUTO_INSIGHTS
```

---

## 🧩 Componentes del Sistema

### 1. Analizador de OKRs
**Archivo**: `lib/ai/okr-analyzer.ts`

```typescript
import { OKRAnalyzer } from '@/lib/ai/okr-analyzer';

// Analizar una empresa
const result = await OKRAnalyzer.analyzeCompany(companyId);

// Analizar todas las empresas
const results = await OKRAnalyzer.analyzeAllCompanies();
```

### 2. Recordatorios Inteligentes
**Archivo**: `lib/ai/smart-reminders.ts`

```typescript
import { SmartReminders } from '@/lib/ai/smart-reminders';

// Procesar recordatorios para una empresa
const result = await SmartReminders.processCompanyReminders(companyId);

// Procesar todas las empresas
const results = await SmartReminders.processAllCompanies();
```

### 3. Generador de Reportes
**Archivo**: `lib/ai/report-generator.ts`

```typescript
import { WeeklyReportGenerator } from '@/lib/ai/report-generator';

// Generar reporte para una empresa
const report = await WeeklyReportGenerator.generateCompanyReport(companyId);

// Generar reportes para todas las empresas
const reports = await WeeklyReportGenerator.generateAllCompanyReports();
```

---

## 🔌 API Endpoints

### GET `/api/insights`
Obtiene insights del usuario actual.

**Response**:
```json
{
  "success": true,
  "stats": {
    "dailyInsights": 3,
    "actionableInsights": 2,
    "activeConversations": 1
  },
  "insights": [...],
  "conversations": [...]
}
```

### PATCH `/api/insights/[id]`
Marca un insight como leído.

**Request**:
```json
{
  "isRead": true
}
```

### POST `/api/insights/generate`
Genera insights manualmente para la empresa del usuario.

**Response**:
```json
{
  "success": true,
  "result": {
    "companyId": "...",
    "insightsGenerated": 5,
    "executionTimeMs": 3500
  }
}
```

---

## ⏰ Cron Jobs

**Nota**: Los cron jobs han sido consolidados para cumplir con los límites del plan de Vercel (máximo 2 crons).

Configurados en `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/ai-automation",
      "schedule": "0 8 * * *"  // Diario 8am - todas las automatizaciones de IA
    }
  ]
}
```

### Endpoint Unificado: `/api/cron/ai-automation`

Este endpoint ejecuta todas las automatizaciones de IA en un solo cron job:

- **Diariamente (8:00 AM)**:
  - Análisis de OKRs (si `FEATURE_AI_DAILY_OKR_ANALYSIS=true`)
  - Recordatorios inteligentes (si `FEATURE_AI_SMART_REMINDERS=true`)

- **Lunes únicamente (8:00 AM)**:
  - Reportes semanales (si `FEATURE_AI_WEEKLY_REPORTS=true`)

Cada feature se ejecuta solo si su feature flag está habilitado, permitiendo control granular sin necesidad de múltiples cron jobs.

### Ejecutar Manualmente

#### Desarrollo (sin autenticación):
```bash
curl http://localhost:3000/api/cron/ai-automation
```

#### Producción (con CRON_SECRET):
```bash
curl https://your-app.vercel.app/api/cron/ai-automation \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

---

## 📱 Uso

### 1. Activar Automatizaciones

1. Configura las variables de entorno en Vercel
2. Activa las feature flags deseadas
3. Deploy la aplicación
4. Los cron jobs empezarán a ejecutarse automáticamente

### 2. Generar Insights Manualmente

Desde la UI:
1. Ve a `/tools/insights`
2. Click en "Generar Insights"
3. Espera la confirmación
4. Los nuevos insights aparecerán en la lista

### 3. Ver Insights

La página `/tools/insights` muestra:
- Estadísticas del día
- Lista de insights recientes
- Conversaciones activas con IA

### 4. Interactuar con Insights

- **Click en un insight no leído**: Lo marca como leído automáticamente
- **Badge "Accionable"**: Requiere tu atención
- **Confianza %**: Nivel de confianza de la IA en el insight

---

## 💰 Costos

### Estimación por Empresa

**Uso Diario** (con todas las features activas):
- Análisis de OKRs: 3 llamadas × $0.003 = $0.009
- Recordatorios: 5 recordatorios × $0.001 = $0.005
- **Total diario**: ~$0.02/día

**Uso Semanal**:
- Reporte semanal: 1 × $0.15 = $0.15
- **Total semanal**: ~$0.30/semana

**Uso Mensual**:
- ~$1.20/mes por empresa (con todas las features)

### Optimización de Costos

1. **Deshabilitar features no necesarias**
   ```bash
   FEATURE_AI_WEEKLY_REPORTS="false"  # Ahorra ~$0.60/mes
   ```

2. **Usar GPT-4o-mini** (ya configurado por defecto)
   - 10x más económico que GPT-4
   - Calidad suficiente para insights de OKRs

3. **Límites configurados**:
   - Máximo 10 objetivos en riesgo por análisis
   - Máximo 10 recordatorios por tipo
   - Máximo 5 top performers por reporte

---

## 🔧 Troubleshooting

### Los Cron Jobs no se ejecutan

1. Verifica que `CRON_SECRET` esté configurado en Vercel
2. Revisa los logs de Vercel: `vercel logs --follow`
3. Confirma que `vercel.json` esté en el root del proyecto

### Feature aparece deshabilitada

1. Verifica el valor exacto en `.env`:
   ```bash
   # ✅ Correcto
   FEATURE_AI_DAILY_OKR_ANALYSIS="true"

   # ❌ Incorrecto
   FEATURE_AI_DAILY_OKR_ANALYSIS=true
   FEATURE_AI_DAILY_OKR_ANALYSIS="yes"
   ```

2. Re-deploy después de cambiar variables de entorno
3. Revisa los logs para ver features habilitadas

### Insights no se generan

1. Verifica que `AI_GATEWAY_API_KEY` o `VERCEL_OIDC_TOKEN` esté configurado
2. Verifica que haya datos en la base de datos (objetivos, iniciativas)
3. Revisa los logs para errores de IA:
   ```
   [OKR Analyzer] Error generating risk insight: ...
   ```

### Emails no se envían

1. Verifica configuración de Brevo:
   ```bash
   BREVO_API_KEY="xkeysib-..."
   BREVO_SENDER_EMAIL="noreply@stratix.com"
   ```

2. Confirma que los usuarios tengan email válido en sus perfiles
3. Revisa logs de Brevo en su dashboard

### Costos muy altos

1. Revisa el número de empresas activas
2. Deshabilita features experimentales:
   ```bash
   FEATURE_AI_PREDICTIVE_ANALYTICS="false"
   FEATURE_AI_AUTO_SUGGESTIONS="false"
   ```

3. Ajusta los límites en el código:
   ```typescript
   // lib/ai/okr-analyzer.ts
   limit: 5  // Reducir de 10 a 5
   ```

---

## 📚 Documentación Adicional

- **AI Gateway**: https://vercel.com/docs/ai-gateway
- **Vercel Cron Jobs**: https://vercel.com/docs/cron-jobs
- **Brevo Email API**: https://developers.brevo.com/

---

## 🤝 Soporte

Para reportar problemas o solicitar features:
1. Abre un issue en GitHub
2. Incluye logs relevantes
3. Especifica qué features tienes habilitadas

---

**Última actualización**: Octubre 2025
**Versión**: 1.0.0
