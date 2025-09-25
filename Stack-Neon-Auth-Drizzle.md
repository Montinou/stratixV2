<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Configuración Completa de NeonDB con Stack Auth y Drizzle para Next.js

Esta documentación te guiará paso a paso para configurar una aplicación Next.js con NeonDB como base de datos, Stack Auth para autenticación y Drizzle ORM para el manejo de datos, incluyendo Row Level Security (RLS) para máxima seguridad.

## Requisitos Previos

Antes de comenzar, asegúrate de tener:

- **Node.js 18+** instalado
- Una cuenta en **NeonDB** (regístrate en neon.tech)
- Una cuenta en **Stack Auth**
- **Next.js con App Router** (Stack Auth no soporta Pages Router)


## 1. Configuración Inicial del Proyecto

### Crear el Proyecto Next.js

```bash
npx create-next-app@latest mi-app-stack --typescript --tailwind --eslint --app
cd mi-app-stack
```


### Instalar Dependencias

```bash
# Stack Auth
npx @stackframe/init-stack@latest

# Drizzle ORM y driver de Neon
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# Utilidades adicionales
npm install dotenv
```


## 2. Configuración de NeonDB

### Crear Proyecto en Neon

1. Ve a [neon.tech](https://neon.tech) y crea una nueva cuenta
2. Crea un nuevo proyecto y anota:
    - **Connection String** (para el rol owner)
    - **Connection String** (para el rol authenticated, si usas RLS)

### Variables de Entorno para NeonDB

Crea/actualiza tu archivo `.env.local`:

```env
# NeonDB Configuration
DATABASE_URL="postgresql://usuario:password@endpoint.neon.tech/neondb?sslmode=require"

# Para RLS (opcional)
DATABASE_AUTHENTICATED_URL="postgresql://authenticated_user:password@endpoint.neon.tech/neondb?sslmode=require"
```


## 3. Configuración de Stack Auth

### Ejecutar el Wizard de Instalación

Si no lo hiciste anteriormente:

```bash
npx @stackframe/init-stack@latest
```


### Configurar Variables de Entorno para Stack Auth

Agrega a tu `.env.local`:

```env
# Stack Auth Configuration
NEXT_PUBLIC_STACK_PROJECT_ID="tu-project-id"
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY="tu-publishable-key"
STACK_SECRET_SERVER_KEY="tu-secret-key"
```


### Configuración de Stack Auth con Providers

En el dashboard de Stack Auth, habilita los providers que necesites:

- **Email/Password**
- **Google OAuth**
- **GitHub OAuth**
- Otros según tus necesidades


## 4. Configuración de Drizzle ORM

### Estructura de Carpetas

```
src/
├── db/
│   ├── schema.ts
│   ├── index.ts
│   └── migrations/
├── stack/
│   ├── client.ts
│   └── server.ts
└── app/
```


### Configuración de Drizzle

Crea `drizzle.config.ts` en la raíz:

```typescript
import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```


### Esquema de Base de Datos

Crea `src/db/schema.ts`:

```typescript
import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  stackUserId: text('stack_user_id').unique().notNull(),
  email: text('email').unique().notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabla de ejemplo para RLS
export const todos = pgTable('todos', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  completed: boolean('completed').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```


### Cliente de Base de Datos

Crea `src/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// Para RLS (opcional)
export const createAuthenticatedDb = (authToken: string) => {
  const authenticatedSql = neon(process.env.DATABASE_AUTHENTICATED_URL!, {
    authToken: async () => authToken,
  });
  return drizzle(authenticatedSql, { schema });
};
```


## 5. Configuración de Row Level Security (RLS)

### Habilitar RLS en Neon

1. Ve al **Neon Console**
2. Navega a **Settings > RLS**
3. Agrega Stack Auth como proveedor de autenticación
4. Usa esta JWKS URL: `https://api.stack-auth.com/api/v1/projects/{tu-project-id}/.well-known/jwks.json`

### Políticas RLS con Drizzle

Crea `src/db/policies.ts`:

```typescript
import { sql } from 'drizzle-orm';
import { db } from './index';

export async function setupRLSPolicies() {
  // Habilitar RLS en las tablas
  await db.execute(sql`ALTER TABLE todos ENABLE ROW LEVEL SECURITY;`);
  await db.execute(sql`ALTER TABLE projects ENABLE ROW LEVEL SECURITY;`);

  // Políticas para todos
  await db.execute(sql`
    CREATE POLICY "Users can manage their own todos"
    ON todos
    FOR ALL
    TO authenticated
    USING (user_id = auth.user_id())
    WITH CHECK (user_id = auth.user_id());
  `);

  // Políticas para proyectos
  await db.execute(sql`
    CREATE POLICY "Users can manage their own projects"
    ON projects
    FOR ALL
    TO authenticated
    USING (user_id = auth.user_id())
    WITH CHECK (user_id = auth.user_id());
  `);

  // Política para proyectos públicos (solo lectura)
  await db.execute(sql`
    CREATE POLICY "Anyone can view public projects"
    ON projects
    FOR SELECT
    TO authenticated
    USING (is_public = true);
  `);
}
```


## 6. Integración Stack Auth + Drizzle

### Server Actions con Autenticación

Crea `src/lib/actions.ts`:

```typescript
'use server';

import { stackServerApp } from '@/stack';
import { db, createAuthenticatedDb } from '@/db';
import { users, todos } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';

export async function createTodo(title: string) {
  const user = await stackServerApp.getUser();
  if (!user) throw new Error('No autenticado');

  // Usando RLS
  const authToken = (await user.getAuthJson())?.accessToken;
  if (!authToken) throw new Error('No se pudo obtener el token');

  const authenticatedDb = createAuthenticatedDb(authToken);
  
  const [newTodo] = await authenticatedDb
    .insert(todos)
    .values({
      title,
      userId: user.id,
    })
    .returning();

  return newTodo;
}

export async function getUserTodos() {
  const user = await stackServerApp.getUser();
  if (!user) throw new Error('No autenticado');

  const authToken = (await user.getAuthJson())?.accessToken;
  if (!authToken) throw new Error('No se pudo obtener el token');

  const sql = neon(process.env.DATABASE_AUTHENTICATED_URL!, {
    authToken: async () => authToken,
  });

  // RLS automáticamente filtra por user_id
  const userTodos = await sql('SELECT * FROM todos ORDER BY created_at DESC');
  return userTodos;
}

export async function syncUserWithDatabase() {
  const user = await stackServerApp.getUser();
  if (!user) return null;

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.stackUserId, user.id))
    .limit(1);

  if (existingUser.length === 0) {
    const [newUser] = await db
      .insert(users)
      .values({
        stackUserId: user.id,
        email: user.primaryEmail!,
        name: user.displayName,
        avatarUrl: user.profileImageUrl,
      })
      .returning();
    
    return newUser;
  }

  return existingUser[^1_0];
}
```


### Componente Cliente con Stack Auth

Crea `src/components/TodoApp.tsx`:

```typescript
'use client';

import { useUser } from '@stackframe/stack';
import { useState, useEffect } from 'react';
import { createTodo, getUserTodos } from '@/lib/actions';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export default function TodoApp() {
  const user = useUser();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTodos();
    }
  }, [user]);

  const loadTodos = async () => {
    try {
      const userTodos = await getUserTodos();
      setTodos(userTodos);
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      await createTodo(newTodo);
      setNewTodo('');
      await loadTodos(); // Recargar todos
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Inicia Sesión</h1>
          <a 
            href="/handler/signin" 
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Ir a Iniciar Sesión
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mis Tareas</h1>
        <p className="text-gray-600">Bienvenido, {user.displayName || user.primaryEmail}</p>
      </div>

      <form onSubmit={handleCreateTodo} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Nueva tarea..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Agregar
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {todos.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No tienes tareas aún</p>
        ) : (
          todos.map((todo) => (
            <div key={todo.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="font-medium">{todo.title}</h3>
              <p className="text-sm text-gray-500">
                {new Date(todo.created_at).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```


## 7. Comandos de Migración

### Scripts en package.json

Agrega estos scripts a tu `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:drop": "drizzle-kit drop"
  }
}
```


### Ejecutar Migraciones

```bash
# Generar migraciones desde el esquema
npm run db:generate

# Aplicar migraciones a la base de datos
npm run db:migrate

# O empujar cambios directamente (desarrollo)
npm run db:push

# Abrir Drizzle Studio para visualizar datos
npm run db:studio
```


## 8. Configuración de Producción

### Variables de Entorno de Producción

Para producción, configura estas variables en tu plataforma de deployment (Vercel, Railway, etc.):

```env
# NeonDB
DATABASE_URL="postgresql://..."
DATABASE_AUTHENTICATED_URL="postgresql://..."

# Stack Auth
NEXT_PUBLIC_STACK_PROJECT_ID="..."
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY="..."
STACK_SECRET_SERVER_KEY="..."

# Next.js
NEXTAUTH_URL="https://tu-dominio.com"
NEXTAUTH_SECRET="un-secreto-muy-seguro"
```


### Script de Migración para Producción

Crea `scripts/migrate.ts`:

```typescript
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

async function runMigrations() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log('🚀 Ejecutando migraciones...');
  
  try {
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    console.log('✅ Migraciones completadas exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en las migraciones:', error);
    process.exit(1);
  }
}

runMigrations();
```


### Configuración en Stack Auth Dashboard

Para producción:

1. **Domains \& Handlers**: Agrega tu dominio de producción
2. **Auth Methods**: Configura tus propias credenciales OAuth
3. **Emails**: Configura tu servidor SMTP personalizado
4. **Project Settings**: Habilita el modo de producción

## 9. Página Principal de la Aplicación

Actualiza `src/app/page.tsx`:

```typescript
import TodoApp from '@/components/TodoApp';
import { UserButton } from '@stackframe/stack';
import { syncUserWithDatabase } from '@/lib/actions';

export default async function Home() {
  // Sincronizar usuario con la base de datos al cargar la página
  await syncUserWithDatabase();

  return (
    <main>
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold">Mi App Stack</h1>
            <UserButton />
          </div>
        </div>
      </nav>
      
      <TodoApp />
    </main>
  );
}
```


## 10. Solución de Problemas Comunes

### Error: "No database connection string"

**Problema**: `Error: No database connection string was provided to neon()`

**Solución**:

```bash
# Verifica que las variables estén en .env.local
cat .env.local

# Reinicia el servidor de desarrollo
npm run dev
```


### Error de CORS con Stack Auth

**Problema**: Errores de CORS en desarrollo

**Solución**: En el dashboard de Stack Auth, asegúrate de que `http://localhost:3000` esté en la lista de dominios permitidos.

### Problemas con RLS

**Problema**: Las consultas RLS fallan

**Solución**:

```typescript
// Verifica que el token esté disponible
const authToken = (await user.getAuthJson())?.accessToken;
if (!authToken) {
  throw new Error('Token de autenticación no disponible');
}
```


## 11. Comandos de Desarrollo Útiles

```bash
# Verificar conexión a NeonDB
npx drizzle-kit introspect

# Resetear base de datos (cuidado en producción)
npx drizzle-kit drop

# Ver logs de desarrollo
npm run dev -- --turbo

# Verificar tipos TypeScript
npx tsc --noEmit
```


## Recursos Adicionales

- **Stack Auth Docs**: [docs.stack-auth.com](https://docs.stack-auth.com)[^1_1]
- **Drizzle ORM Docs**: [orm.drizzle.team](https://orm.drizzle.team)
- **Neon Docs**: [neon.com/docs](https://neon.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)

Esta configuración te proporciona una base sólida para desarrollar aplicaciones modernas con autenticación segura, base de datos escalable y ORM type-safe. La combinación de Stack Auth, NeonDB y Drizzle te permite enfocarte en la lógica de negocio mientras mantienes las mejores prácticas de seguridad.
<span style="display:none">[^1_10][^1_11][^1_12][^1_13][^1_14][^1_15][^1_16][^1_17][^1_18][^1_19][^1_2][^1_20][^1_21][^1_22][^1_23][^1_24][^1_25][^1_26][^1_27][^1_28][^1_29][^1_3][^1_30][^1_31][^1_32][^1_33][^1_34][^1_35][^1_36][^1_37][^1_38][^1_39][^1_4][^1_40][^1_41][^1_42][^1_43][^1_44][^1_45][^1_46][^1_47][^1_48][^1_49][^1_5][^1_50][^1_51][^1_52][^1_53][^1_54][^1_55][^1_56][^1_57][^1_58][^1_59][^1_6][^1_60][^1_61][^1_62][^1_7][^1_8][^1_9]</span>

```
<div style="text-align: center">⁂</div>
```

[^1_1]: https://docs.stack-auth.com

[^1_2]: https://github.com/neondatabase-labs/stack-nextjs-neon-rls

[^1_3]: https://dev.to/sam_shalemrajtara_8bda2/full-stack-auth-implementation-using-next-js-and-neon-db-for-neon-challenge-22a7

[^1_4]: https://neon.com/docs/guides/neon-rls-stack-auth

[^1_5]: https://next.jqueryscript.net/next-js/starter-kit-drizzle-orm-better-auth/

[^1_6]: https://neon.com/docs/guides/auth-authjs

[^1_7]: https://www.youtube.com/watch?v=CgrkihbW868

[^1_8]: https://github.com/RvDstudio/nextjs_drizzle_better-auth

[^1_9]: https://dev.to/hackmamba/how-to-set-up-auth0-and-neon-postgres-in-nextjs-app-router-48ad

[^1_10]: https://dev.to/jqueryscript/a-minimal-tanstack-start-template-with-better-auth-drizzle-orm-4mei

[^1_11]: https://neon.com/guides/neon-auth-nextjs

[^1_12]: https://neon.com/docs/neon-auth/quick-start/nextjs

[^1_13]: https://neon.com/blog/nextjs-authentication-using-clerk-drizzle-orm-and-neon

[^1_14]: https://github.com/neondatabase-labs/neon-auth-nextjs-template

[^1_15]: https://www.reddit.com/r/nextjs/comments/1hkktdf/cant_user_neondb_with_drizzle/

[^1_16]: https://www.reddit.com/r/nextjs/comments/1jxs74m/nextjs_neon_db_drizzle_better_auth/

[^1_17]: https://www.youtube.com/watch?v=tiSm8ZjFQP0

[^1_18]: https://www.freecodecamp.org/news/nextjs-clerk-neon-fullstack-development/

[^1_19]: https://www.youtube.com/watch?v=5vdooX7g7AE

[^1_20]: https://www.reddit.com/r/nextjs/comments/1kdos8c/drizzle_orm_neon_db_and_next_js/

[^1_21]: https://orm.drizzle.team/docs/tutorials/drizzle-with-neon

[^1_22]: https://makerkit.dev/blog/tutorials/drizzle-supabase

[^1_23]: https://strapi.io/blog/how-to-use-drizzle-orm-with-postgresql-in-a-nextjs-15-project

[^1_24]: https://authjs.dev/getting-started/adapters/drizzle

[^1_25]: https://www.reddit.com/r/nextjs/comments/1f942zv/automate_neon_schema_changes_with_drizzle_and/

[^1_26]: https://www.drizzlenext.com/drizzle-next/guide.html

[^1_27]: https://www.youtube.com/watch?v=R3r27ldM-TQ

[^1_28]: https://dev.to/canhamzacode/how-to-set-up-a-postgresql-database-with-drizzle-orm-and-neon-db-in-nodejs-3bga

[^1_29]: https://docs.stack-auth.com/docs/next/getting-started/setup

[^1_30]: https://dev.to/showcase/neon/nextjs-tutorial-2025

[^1_31]: https://docs.stackstorm.com/authentication.html

[^1_32]: https://next-auth.js.org/configuration/options

[^1_33]: https://blog.logrocket.com/stackauth-open-source-auth0-alternative/

[^1_34]: https://blog.logrocket.com/configure-environment-variables-next-js/

[^1_35]: https://www.youtube.com/watch?v=LMUsWY5alY0\&vl=es

[^1_36]: https://nextjs.org/docs/pages/guides/environment-variables

[^1_37]: https://dev.to/code_2/how-id-learn-full-stack-development-in-2025-if-i-could-start-over-54h4

[^1_38]: https://www.stackct.com/developers-docs-authentication/

[^1_39]: https://nextjs.org/docs/app/guides/authentication

[^1_40]: https://www.youtube.com/watch?v=MYPKZmb2CAg

[^1_41]: https://stackoverflow.com/questions/66137368/next-js-environment-variables-are-undefined-next-js-10-0-5

[^1_42]: https://www.zignuts.com/blog/mern-stack-2025-full-stack-apps-guide

[^1_43]: https://llama-stack.readthedocs.io/en/latest/distributions/configuration.html

[^1_44]: https://www.reddit.com/r/nextjs/comments/1b0bc6z/best_practices_for_sharing_environment_variables/

[^1_45]: https://javascript.plainenglish.io/mastering-full-stack-web-dev-in-2025-with-next-js-15-react-19-part-1-689c4c9eb624

[^1_46]: https://github.com/vercel/next.js/discussions/36338

[^1_47]: https://dev.to/devjubr/drizzle-orm-in-neon-db-the-ultimate-crash-course-for-modern-web-development-2bo4

[^1_48]: https://neon.com/docs/get-started/connect-neon

[^1_49]: https://budivoogt.com/blog/drizzle-migrations

[^1_50]: https://dev.to/neon-postgres/introducing-neon-authorize-simplifying-row-level-security-for-postgres-14fp

[^1_51]: https://stackoverflow.com/questions/79032081/error-no-database-connection-string-was-provided-to-neon-perhaps-an-enviro

[^1_52]: https://neon.com/docs/guides/drizzle-migrations

[^1_53]: https://neon.com/docs/guides/neon-rls-auth0

[^1_54]: https://neon.com/guides/dotnet-neon-setup

[^1_55]: https://orm.drizzle.team/docs/migrations

[^1_56]: https://community.vercel.com/t/updating-connection-string-for-neon-database-in-a-vercel-application/4299

[^1_57]: https://clerk.com/blog/automate-neon-schema-changes-with-drizzle-and-github-actions

[^1_58]: https://www.simplyblock.io/blog/underated-postgres-multi-tenancy-with-row-level-security/

[^1_59]: https://learn.microsoft.com/en-us/azure/service-connector/how-to-integrate-neon-postgres

[^1_60]: https://orm.drizzle.team/docs/get-started/neon-new

[^1_61]: https://www.reddit.com/r/Supabase/comments/1hdviyr/should_you_still_use_rls_with_next_server/

[^1_62]: https://dev.to/chami/securing-connection-strings-best-practices-for-development-and-production-3cj0

