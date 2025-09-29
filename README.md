# StratixV2 - OKR Management System


Sistema completo de gestión de Objetivos y Resultados Clave (OKRs) desarrollado con Next.js 14, TypeScript, NeonDB y Stack Auth.


## 🚀 Características Principales


- **Gestión Jerárquica de OKRs**: Organización clara de Objetivos, Iniciativas y Actividades
- **Sistema de Roles**: Control granular con roles Corporativo, Gerente y Empleado
- **Dashboard Analítico**: Visualización interactiva con gráficos y métricas en tiempo real
- **IA Integrada**: Insights diarios y sugerencias personalizadas según el rol del usuario
- **Autenticación Segura**: Implementación con Stack Auth y NeonAuth
- **Base de Datos Moderna**: PostgreSQL con NeonDB y Row Level Security (RLS)


## 🛠 Stack Tecnológico


### Frontend
- **Framework**: Next.js 14.2.33 con App Router
- **Lenguaje**: TypeScript con modo estricto
- **Estilos**: Tailwind CSS 4.1.9 con variables CSS
- **Componentes UI**: Shadcn/ui construido sobre Radix UI
- **Iconos**: Lucide React
- **Estado**: React hooks con Zustand
- **Fuentes**: Inter (sans) y JetBrains Mono (mono)


### Backend & Base de Datos
- **Autenticación**: Stack Auth (@stackframe/stack) con NeonAuth
- **Base de Datos**: NeonDB (PostgreSQL 17.5)
- **ORM**: Drizzle ORM con tipos seguros
- **API**: Next.js API Routes en `/app/api/`
- **Manejo de Sesiones**: Stack Auth SSR con middleware


### Infraestructura
- **Despliegue**: Vercel
- **Base de Datos**: NeonDB con conexiones SSL
- **Pool de Conexiones**: @neondatabase/serverless
- **IA**: Vercel AI Gateway integrado


## 📁 Estructura del Proyecto


```
/app/                    # Páginas con Next.js App Router
├── activities/          # Gestión de actividades
├── analytics/           # Análisis y reportes
├── api/                 # Rutas API
├── auth/                # Páginas de autenticación
├── companies/           # Gestión de empresas
├── dashboard/           # Dashboard principal
├── import/              # Funcionalidad de importación
├── initiatives/         # Iniciativas estratégicas
├── insights/            # Insights de negocio
├── objectives/          # Gestión de objetivos OKR
├── profile/             # Perfil de usuario
├── team/                # Gestión de equipos
└── layout.tsx           # Layout raíz con AuthProvider


/components/             # Componentes UI reutilizables
├── ai/                  # Componentes relacionados con IA
├── auth/                # Componentes de autenticación
├── charts/              # Componentes de gráficos (Recharts)
├── dashboard/           # Componentes específicos del dashboard
├── layout/              # Componentes de layout
├── okr/                 # Componentes específicos de OKR
└── ui/                  # Componentes base de Shadcn/ui


/lib/                    # Librerías y utilidades
├── database/            # Configuración y esquemas de BD
├── auth/                # Configuración de autenticación
├── hooks/               # Custom React hooks
├── types/               # Definiciones de tipos TypeScript
└── utils/               # Funciones de utilidad
```


## 🚀 Instalación y Configuración


### Prerrequisitos


- Node.js 20 o superior
- pnpm (recomendado) o npm
- Cuenta en [NeonDB](https://neon.tech)
- Cuenta en [Stack Auth](https://stack-auth.com)


### 1. Clonar el repositorio


```bash
git clone [URL_DEL_REPOSITORIO]
cd stratixV2
```


### 2. Instalar dependencias


```bash
pnpm install
# o
npm install
```


### 3. Configurar variables de entorno


Crear archivo `.env.local`:


```env
# Base de Datos NeonDB
DATABASE_URL=postgresql://[usuario]:[password]@[host]/[database]?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://[usuario]:[password]@[host]/[database]?sslmode=require
NEON_PROJECT_ID=tu_project_id


# Stack Auth
NEXT_PUBLIC_STACK_PROJECT_ID=tu_stack_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=tu_publishable_key
STACK_SECRET_SERVER_KEY=tu_secret_key


# Vercel (opcional para desarrollo)
VERCEL_TOKEN=tu_vercel_token
```


### 4. Configurar la base de datos


```bash
# Ejecutar migraciones
pnpm migrate


# O con datos de prueba
pnpm migrate:with-seed


# Validar conexión
pnpm migrate:test-connection
```


### 5. Ejecutar en desarrollo


```bash
pnpm dev
```


La aplicación estará disponible en `http://localhost:3000`


## 📊 Scripts Disponibles


### Desarrollo
- `pnpm dev` - Servidor de desarrollo
- `pnpm build` - Construcción para producción
- `pnpm start` - Servidor de producción
- `pnpm lint` - Ejecutar ESLint


### Base de Datos
- `pnpm migrate` - Ejecutar migraciones
- `pnpm migrate:with-seed` - Migrar con datos de prueba
- `pnpm migrate:validate` - Validar migraciones
- `pnpm db:studio` - Abrir Drizzle Studio


### Testing
- `pnpm test` - Ejecutar tests
- `pnpm test:watch` - Tests en modo watch
- `pnpm test:coverage` - Tests con cobertura


### Despliegue
- `pnpm deploy:health-check` - Verificar salud del despliegue
- `pnpm rollback` - Rollback automático
- `pnpm rollback:emergency` - Rollback de emergencia


## 🏗 Arquitectura


### Flujo de Datos


1. **Autenticación**: Stack Auth → AuthProvider → useUser hook → Componentes
2. **Base de Datos**: NeonDB client → API routes → React state
3. **Formularios**: React Hook Form + Zod validation
4. **Estado UI**: Estado local de componentes con Zustand ocasional


### Autenticación


El sistema utiliza Stack Auth con un patrón centralizado:
- `AuthProvider` envuelve toda la aplicación en `layout.tsx`
- Hook personalizado `useUser` maneja el estado de autenticación
- Middleware maneja validación de auth en rutas protegidas
- Soporte tanto para autenticación del lado cliente como servidor


### Sistema de Componentes UI


Construido sobre la arquitectura Shadcn/ui:
- Componentes usan variables CSS para temas
- Tailwind CSS con configuración personalizada
- Primitivos Radix UI para accesibilidad
- Class Variance Authority (CVA) para variantes de componentes
- Tokens de diseño consistentes en toda la aplicación


## 🔒 Seguridad


- **Row Level Security (RLS)**: Políticas de seguridad a nivel de fila en PostgreSQL
- **Autenticación JWT**: Tokens seguros con Stack Auth
- **Validación de Entrada**: Zod schemas en todas las APIs
- **Variables de Entorno**: Configuración segura para credenciales
- **HTTPS**: Conexiones SSL obligatorias con NeonDB


## 🌐 Despliegue


### Vercel (Recomendado)


1. Conectar repositorio en Vercel
2. Configurar variables de entorno
3. Desplegar automáticamente


### Variables de Entorno en Producción


Asegurar que todas las variables estén configuradas:
- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
- `NEON_PROJECT_ID`
- `NEXT_PUBLIC_STACK_PROJECT_ID`
- `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`
- `STACK_SECRET_SERVER_KEY`


## 📝 Contribución


1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request


### Estándares de Código


- TypeScript estricto
- ESLint configuration
- Prettier para formateo
- Convenciones de nomenclatura consistentes
- Tests obligatorios para nuevas funcionalidades


## 🧪 Testing


- Framework: Jest con Testing Library
- Tests unitarios para componentes
- Tests de integración para APIs
- Tests de accesibilidad con axe-core
- Cobertura mínima del 80%


## 📄 Licencia


Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.


## 🆘 Soporte


Para problemas y preguntas:
- Abrir un issue en GitHub
- Documentación adicional en `/docs`
- Stack Auth docs: [stack-auth.com](https://stack-auth.com)
- NeonDB docs: [neon.tech/docs](https://neon.tech/docs)


## 🎯 Roadmap


- [ ] Integración con más proveedores de IA
- [ ] Dashboard móvil mejorado
- [ ] Reportes avanzados con exportación
- [ ] Integraciones con herramientas externas
- [ ] API pública para terceros
- [ ] Sistema de notificaciones push


---


esta es la aplicacion# Force redeploy to recognize database schema changes
