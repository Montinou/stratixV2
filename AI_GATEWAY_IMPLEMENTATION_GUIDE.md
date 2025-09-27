<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Guía Completa de Implementación del AI Gateway de Vercel

## **Introducción**

El **AI Gateway de Vercel** es una plataforma unificada que proporciona acceso a más de 100 modelos de inteligencia artificial a través de un único endpoint API. Esta herramienta está diseñada para simplificar la integración con múltiples proveedores de IA, ofreciendo características esenciales como alta confiabilidad, monitoreo automático de costos y capacidades avanzadas de failover.[^1][^2]

## **Características Principales**

Las características del AI Gateway incluyen funcionalidades críticas para aplicaciones de producción, como **API unificada** para cambios sencillos entre modelos, **alta confiabilidad** con reintentos automáticos, **monitoreo de gastos** detallado, **load balancing** automático, **soporte para embeddings** vectoriales, y **observabilidad** completa con métricas detalladas.[^3]

## **Proveedores y Modelos Soportados**

El ecosistema incluye proveedores principales como **OpenAI** (GPT-5, GPT-4.1), **Anthropic** (Claude Sonnet 4), **xAI** (Grok-4), **Google AI** (Gemini 2.0), **Amazon Bedrock**, **Azure OpenAI**, **Mistral**, **Cohere**, **DeepSeek**, y **Groq**. Cada proveedor ofrece diferentes modelos, precios y características de rendimiento.[^4][^5]

## **Configuración e Instalación**

### **Requisitos Previos**

Para implementar el AI Gateway necesitas:[^2]

- Node.js 20 o posterior
- Vercel CLI actualizado
- Cuenta de Vercel activa


### **Instalación de Dependencias**

```bash
mkdir mi-proyecto-ai
cd mi-proyecto-ai
pnpm init
pnpm install ai dotenv @types/node tsx typescript
```


### **Configuración de API Key**

**Crear una API Key:**

1. Navega al tab "AI Gateway" en el dashboard de Vercel[^6]
2. Selecciona "API keys" en la barra lateral
3. Haz clic en "Create key" y procede con la creación[^6]

**Configurar variables de entorno:**

```bash
# .env.local
AI_GATEWAY_API_KEY=tu_api_key_aqui
```


### **Autenticación OIDC (Alternativa)**

Para proyectos vinculados con Vercel, puedes usar tokens OIDC:[^6]

```bash
vercel link
vercel env pull
```

Los tokens OIDC son válidos por 12 horas y se renuevan automáticamente en producción.[^6]

## **Implementación Básica**

### **Uso con AI SDK (Recomendado)**

```typescript
// app/api/chat/route.ts
import { generateText } from 'ai';

export async function GET() {
  const result = await generateText({
    model: 'xai/grok-3',
    prompt: 'Explica la computación cuántica',
  });
  
  return Response.json(result);
}
```


### **Streaming de Respuestas**

```typescript
import { streamText } from 'ai';

export async function POST(request: Request) {
  const { prompt } = await request.json();
  
  const result = streamText({
    model: 'anthropic/claude-sonnet-4',
    prompt,
  });
  
  return result.toTextStreamResponse();
}
```


### **Uso con OpenAI SDK**

```python
# Python
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh/v1'
)

response = client.chat.completions.create(
    model='xai/grok-4',
    messages=[{
        'role': 'user',
        'content': '¿Por qué el cielo es azul?'
    }]
)
```


### **Uso con cURL**

```bash
curl -X POST "https://ai-gateway.vercel.sh/v1/chat/completions" \
  -H "Authorization: Bearer $AI_GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-5",
    "messages": [{
      "role": "user",
      "content": "¿Por qué el cielo es azul?"
    }],
    "stream": false
  }'
```


## **Configuración Avanzada**

### **Provider Options y Failover**

```typescript
import { streamText } from 'ai';

export async function POST(request: Request) {
  const { prompt } = await request.json();
  
  const result = streamText({
    model: 'anthropic/claude-sonnet-4',
    prompt,
    providerOptions: {
      gateway: {
        order: ['bedrock', 'anthropic'], // Orden de prioridad
        only: ['bedrock', 'anthropic'], // Restricción de proveedores
      },
    },
  });
  
  return result.toTextStreamResponse();
}
```


### **Generación de Embeddings**

```typescript
// Embedding único
import { embed } from 'ai';

export async function GET() {
  const result = await embed({
    model: 'openai/text-embedding-3-small',
    value: 'Día soleado en la playa',
  });
  
  return Response.json(result);
}

// Múltiples embeddings
import { embedMany } from 'ai';

export async function GET() {
  const result = await embedMany({
    model: 'openai/text-embedding-3-small',
    values: ['Día soleado en la playa', 'Cielo nublado en la ciudad'],
  });
  
  return Response.json(result);
}
```


### **Descubrimiento Dinámico de Modelos**

```typescript
import { gateway } from '@ai-sdk/gateway';
import { generateText } from 'ai';

const availableModels = await gateway.getAvailableModels();

// Filtrar por tipo de modelo
const textModels = availableModels.models.filter(
  (m) => m.modelType === 'language'
);
const embeddingModels = availableModels.models.filter(
  (m) => m.modelType === 'embedding'
);

// Usar el primer modelo disponible
const { text } = await generateText({
  model: availableModels.models[^0].id,
  prompt: 'Hola mundo',
});
```


## **Precios y Facturación**

### **Tier Gratuito**

- **\$5 USD mensuales** de créditos gratuitos para todas las cuentas de equipo[^7]
- Renovación automática cada 30 días después de la primera solicitud[^7]
- Acceso a todo el catálogo de modelos[^7]


### **Tier de Pago**

- Modelo **pay-as-you-go** sin compromisos a largo plazo[^7]
- **Sin markup** - pagas exactamente el precio del proveedor[^7]
- Soporte para **bring-your-own-key** sin tarifas adicionales[^7]


### **Monitoreo de Costos**

- Ver balance de créditos en el dashboard de Vercel[^7]
- Métricas detalladas de gasto por modelo y proveedor[^3]
- Recarga de créditos cuando sea necesario[^7]


## **Observabilidad y Monitoreo**

### **Métricas Disponibles**

El AI Gateway proporciona métricas completas de observabilidad:[^3]

- **Requests por Modelo**: Número de solicitudes por modelo en el tiempo
- **Time to First Token (TTFT)**: Tiempo promedio hasta el primer token
- **Conteos de Tokens**: Tokens de entrada y salida por solicitud
- **Gasto**: Costos totales por período de tiempo


### **Acceso a Métricas**

```typescript
// Metadatos del proveedor en respuestas
const result = streamText({
  model: 'anthropic/claude-sonnet-4',
  prompt: 'test'
});

// Logs de qué proveedor fue usado
console.log(JSON.stringify(await result.providerMetadata, null, 2));
```


## **Casos de Uso Avanzados**

### **Integración con Frameworks**

**Next.js con App Router:**

```typescript
// app/api/ai/route.ts
import { generateText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = await generateText({
    model: 'openai/gpt-5',
    messages,
  });
  
  return Response.json(result);
}
```

**Configuración Global del Proveedor:**

```typescript
// instrumentation.ts
import { openai } from '@ai-sdk/openai';

export async function register() {
  globalThis.AI_SDK_DEFAULT_PROVIDER = openai;
}
```


### **Streaming con Datos Personalizados**

```typescript
import { streamText, createDataStream } from 'ai';

export async function POST(req: Request) {
  const dataStream = createDataStream({
    execute: async (writer) => {
      // Enviar notificación inicial
      writer.data({ 
        type: 'status', 
        message: 'Procesando solicitud...' 
      });
      
      // Stream del modelo
      const result = streamText({
        model: 'anthropic/claude-sonnet-4',
        prompt: 'Explica IA',
        onFinish: () => {
          writer.data({ 
            type: 'status', 
            message: 'Completado' 
          });
        }
      });
      
      writer.merge(result.toDataStream());
    }
  });
  
  return dataStream.toResponse();
}
```


## **Mejores Prácticas**

### **Seguridad**

- **Nunca expongas API keys en el cliente**[^8]
- Usa variables de entorno para credenciales[^6]
- Implementa validación de entrada en el servidor[^8]


### **Rendimiento**

- **Utiliza streaming** para respuestas conversacionales[^8]
- Implementa caché para solicitudes frecuentes
- Configura timeouts apropiados


### **Confiabilidad**

- Configura **órdenes de failover** apropiadas[^4]
- Monitorea métricas de latencia[^3]
- Implementa **circuit breakers** para proveedores problemáticos


### **Gestión de Costos**

- Establece **límites de presupuesto** por proyecto[^7]
- Monitorea uso por modelo y optimiza selección[^3]
- Usa **bring-your-own-key** cuando sea rentable[^7]


## **Resolución de Problemas**

### **Errores Comunes**

**Error de Autenticación:**

```bash
# Verificar API key
echo $AI_GATEWAY_API_KEY
# Regenerar si es necesario desde el dashboard
```

**Errores de Streaming:**

```typescript
// Verificar runtime en Next.js
export const runtime = 'nodejs'; // en lugar de 'edge'
```

**Rate Limiting:**

- Implementar exponential backoff
- Usar múltiples proveedores con failover[^4]


### **Debugging**

```typescript
// Habilitar logs detallados
const result = streamText({
  model: 'openai/gpt-4o',
  prompt: 'test',
  onFinish: (result) => {
    console.log('Tokens usados:', result.usage);
    console.log('Proveedor:', result.providerMetadata);
  }
});
```


## **Integración con Herramientas Externas**

### **Langfuse para Analytics**

```typescript
import { observeOpenAI } from "@langfuse/openai";
import OpenAI from "openai";

const client = observeOpenAI(
  new OpenAI({
    baseURL: "https://ai-gateway.vercel.sh/v1",
    apiKey: process.env.AI_GATEWAY_API_KEY,
  })
);
```


### **LiteLLM para Proxy**

```yaml
# config.yaml
model_list:
  - model_name: gpt-4o-gateway
    litellm_params:
      model: vercel_ai_gateway/openai/gpt-4o
      api_key: os.environ/VERCEL_AI_GATEWAY_API_KEY
```


## **Conclusión**

El AI Gateway de Vercel representa una solución robusta para implementar aplicaciones de IA en producción. Su **API unificada**, **capacidades de failover**, y **observabilidad integrada** lo convierten en una herramienda esencial para desarrolladores que buscan construir aplicaciones de IA escalables y confiables.[^9][^10]

La plataforma elimina la complejidad de gestionar múltiples proveedores de IA mientras proporciona las herramientas necesarias para monitoreo, optimización de costos y alta disponibilidad. Con el soporte para más de 100 modelos y integración nativa con el ecosistema de Vercel, es una opción sólida para proyectos desde prototipos hasta aplicaciones empresariales.
<span style="display:none">[^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32][^33][^34][^35][^36][^37][^38][^39][^40][^41][^42][^43][^44][^45][^46][^47]</span>

<div align="center">⁂</div>

[^1]: https://vercel.com/docs/ai-gateway

[^2]: https://vercel.com/docs/ai-gateway/getting-started

[^3]: https://vercel.com/docs/ai-gateway/observability

[^4]: https://vercel.com/docs/ai-gateway/provider-options

[^5]: https://vercel.com/ai-gateway/models

[^6]: https://vercel.com/docs/ai-gateway/authentication

[^7]: https://vercel.com/docs/ai-gateway/pricing

[^8]: https://blog.getbind.co/2025/08/18/how-to-use-vercel-ai-sdk-with-bind-ai/

[^9]: https://vercel.com/blog/ai-gateway-is-now-generally-available

[^10]: https://mlq.ai/news/vercel-launches-ai-gateway-to-simplify-multi-model-ai-development/

[^11]: https://docs.llamaindex.ai/en/latest/api_reference/llms/vercel_ai_gateway/

[^12]: https://vercel.com/blog/ai-gateway

[^13]: https://vercel.com/docs/pricing

[^14]: https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway

[^15]: https://developers.cloudflare.com/ai-gateway/integrations/vercel-ai-sdk/

[^16]: https://www.infoq.com/news/2025/09/vercel-ai-gateway/

[^17]: https://langfuse.com/integrations/gateways/vercel-ai-gateway

[^18]: https://vercel.com/docs

[^19]: https://vercel.com/docs/ai-gateway/models-and-providers

[^20]: https://aiengineerguide.com/blog/vercel-ai-gateway/

[^21]: https://www.youtube.com/shorts/Poor7kYBba8

[^22]: https://ai-sdk.dev/getting-started

[^23]: https://github.com/sst/opencode/issues/2153

[^24]: https://docs.cline.bot/provider-config/vercel-ai-gateway

[^25]: https://www.youtube.com/watch?v=pql8C8elbnk

[^26]: https://vercel.com/blog/the-resiliency-of-the-frontend-cloud

[^27]: https://voltagent.dev/docs/getting-started/providers-models/

[^28]: https://docs.helicone.ai/getting-started/integration-method/vercel-ai-gateway

[^29]: https://kgateway.dev/blog/ai-gateway-load-balancing-model-failover/

[^30]: https://www.youtube.com/watch?v=dx18utWd5WU

[^31]: https://vercel.com/ai-gateway

[^32]: https://github.com/vercel/build-an-ai-app-starter-sep-25

[^33]: https://www.alibabacloud.com/blog/vercel-ai-gateway-vs-higress-which-one-is-more-suitable-for-your-ai-application_602278

[^34]: https://ai-sdk.dev/docs/foundations/providers-and-models

[^35]: https://developers.cloudflare.com/ai-gateway/usage/providers/

[^36]: https://vercel.com/docs/functions/streaming-functions

[^37]: https://vercel.com/templates/ai/ai-sdk-python-streaming

[^38]: https://docs.litellm.ai/docs/providers/vercel_ai_gateway

[^39]: https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data

[^40]: https://ai-sdk.dev/docs/introduction

[^41]: https://ai-sdk.dev/docs/foundations/streaming

[^42]: https://github.com/vercel/ai-chatbot

[^43]: https://marketplace.visualstudio.com/items?itemName=SferaDev.vscode-extension-vercel-ai

[^44]: https://vercel.com/docs/ai-sdk

[^45]: https://ai-sdk.dev/docs/getting-started

[^46]: https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/dec6f4ce59bf1941ef02a54b167abade/beea32ed-06d8-4fc7-b532-da351ccb49ff/f4943be4.csv

[^47]: https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/dec6f4ce59bf1941ef02a54b167abade/beea32ed-06d8-4fc7-b532-da351ccb49ff/eb83a67f.csv

