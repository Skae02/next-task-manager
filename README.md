# Tasks

Gestor de tareas personal con tableros kanban: creas tablas, las divides en columnas (por ejemplo "Por hacer", "En progreso" y "Hecho") y arrastras las tareas entre ellas para seguir su avance.

## Propósito

Es un proyecto de portafolio. Muestra una aplicación full stack completa sobre Next.js 16:

- Autenticación propia, sin librerías externas de auth.
- Datos aislados por usuario.
- Una API REST validada.
- Estado del cliente con zustand.
- Drag and drop accesible que funciona también con red lenta.

La interfaz busca ser minimalista, en la línea de las apps de tareas de macOS o un Jira simplificado.

## Características

**Cuentas**

- Registro en dos pasos:
  1. Correo y contraseña.
  2. Nombre completo, alias, celular y fecha de nacimiento.

  Hasta completar el segundo paso, la app solo deja entrar a `/onboarding`.
- Contraseñas guardadas con hash bcrypt (12 rondas), nunca en texto plano.
- Sesión con un JWT firmado (HS256) en una cookie `httpOnly`, `SameSite=Lax`, que dura 7 días.

**Tableros**

- Crear, ver, editar y eliminar tablas, columnas y tareas. Al eliminar una tabla o una columna, también se elimina su contenido.
- Cada tarea tiene título, descripción, hasta 20 etiquetas con color (8 colores), autor y asignado. Por ahora una tarea solo se puede asignar a uno mismo.
- Vista de tablero kanban con scroll horizontal, un modal con el detalle de cada tarea y una página propia para crear o editar tareas.
- Modo claro y oscuro según el sistema.

**Drag and drop**

- Mover tareas entre columnas y reordenarlas dentro de una columna.
- Funciona con mouse, con toque largo en pantallas táctiles y con teclado: espacio toma y suelta la tarea, las flechas la mueven y Escape cancela. Tiene textos para lectores de pantalla en español.
- El cambio se ve al instante y se guarda en segundo plano. Los movimientos se envían en orden, uno a la vez, y si mueves la misma tarea varias veces seguidas solo se envía el último. Si el servidor rechaza un movimiento, aparece un aviso y el tablero se recarga desde el servidor.

**Seguridad**

- Cada usuario solo ve y modifica lo suyo. Si un recurso es de otro usuario, la API responde 404, igual que si no existiera.
- La API vuelve a verificar la sesión en cada ruta. `proxy.ts` solo hace redirecciones de páginas.
- Todas las entradas se validan con zod, con mensajes de error en español por cada campo.

## Stack

| Área | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components), React 19, TypeScript |
| Estilos y animación | Tailwind CSS 4, motion |
| Estado del cliente | zustand |
| Drag and drop | dnd-kit (`core` 6, `sortable` 10) |
| Base de datos | PostgreSQL en Supabase, con Prisma 7 y el adaptador `pg` |
| Auth | bcryptjs, jose (JWT) |
| Validación | zod 4 |

## Cómo ejecutarlo

### Requisitos

- Node.js 20.9 o superior.
- Una base PostgreSQL. El proyecto usa Supabase, pero sirve cualquier Postgres.

### Pasos

```bash
npm install
cp .env.example .env          # completa las variables (ver abajo)
npx prisma generate           # genera el cliente de Prisma en lib/generated/prisma
npx prisma migrate deploy     # crea las tablas en la base (usa DIRECT_URL)
npm run dev                   # http://localhost:3000
```

Para producción: `npm run build` y luego `npm start`.

### Variables de entorno

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Conexión de la app. En Supabase, el pooler en modo transacción (puerto 6543). |
| `DIRECT_URL` | Conexión de la CLI de Prisma para las migraciones. En Supabase, el modo sesión (puerto 5432). Si no se define, se usa `DATABASE_URL`. |
| `JWT_SECRET` | Secreto para firmar la sesión, de al menos 32 caracteres. Se genera con `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. |
| `DATABASE_CA_CERT` | Opcional. Certificado CA de la base en formato PEM, para verificar el TLS. Sin él la conexión igual va cifrada, pero sin verificar el certificado. |

Las cadenas de Supabase están en **Project Settings → Database → Connection string**.

### Sin Supabase

Prisma puede levantar un Postgres local:

```bash
npx prisma dev --name task-manager --detach
```

Usa la URL TCP que imprime (`postgres://...@localhost:...`) como `DATABASE_URL`. Las conexiones a `localhost` no usan TLS.

### Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run lint` | ESLint |
| `npx prisma migrate dev --name <cambio>` | Crea una migración después de cambiar `prisma/schema.prisma` |

## API

Todas las rutas, salvo las de `auth/*`, requieren la cookie de sesión. Las de tablas, columnas y tareas también requieren el perfil completo (paso 2 del registro).

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/auth/register` | Paso 1 del registro: `{ email, password }` |
| POST | `/api/auth/login` | `{ email, password }` |
| POST | `/api/auth/logout` | Cierra la sesión |
| GET / PATCH / DELETE | `/api/users/me` | Perfil. `PATCH` es el paso 2: `{ phone, fullName, alias, birthDate }`. `DELETE` elimina la cuenta y todo su contenido. |
| GET / POST | `/api/tables` | Lista o crea tablas |
| GET / PATCH / DELETE | `/api/tables/:tableId` | `GET` incluye las columnas y sus tareas |
| POST | `/api/tables/:tableId/columns` | Crea una columna |
| GET / PATCH / DELETE | `/api/columns/:columnId` | |
| POST | `/api/columns/:columnId/tasks` | Crea una tarea |
| GET / PATCH / DELETE | `/api/tasks/:taskId` | Si `PATCH` cambia `columnId`, la tarea va al final de esa columna |
| PATCH | `/api/tasks/:taskId/move` | Drag and drop: `{ columnId, index }` |

Sobre `move`:

- Coloca la tarea en esa posición y vuelve a numerar las columnas afectadas, dentro de una transacción.
- La petición indica dónde debe quedar la tarea, no de dónde viene. Por eso, si llegan varios movimientos de la misma tarea a la vez, se aplican uno detrás de otro y gana el último.
- Los movimientos de una misma tabla se procesan de a uno.

Los errores responden `{ error, fields? }`: 401 sin sesión, 403 sin el perfil completo, 404 si no existe o no es tuyo, 422 si los datos no son válidos (con un mensaje por campo).

## Estructura

```
app/
  (auth)/            login, registro (paso 1) y onboarding (paso 2)
  (app)/             dashboard de tablas, tablero kanban y editor de tareas
  api/               route handlers de la API
components/
  app/               barra superior, diálogos, menú y avisos
  board/             tablero kanban, columnas, tarjetas, modal y editor de tareas
  ui.tsx             componentes base (botón, campos, modal, etiqueta, avatar)
lib/
  stores/            stores de zustand: auth, board (con la cola de movimientos) y ui
  auth/              sesión JWT y hash de contraseñas
  api.ts             helpers de los route handlers (errores, validación, sesión)
  ownership.ts       búsquedas filtradas por dueño
  validation.ts      esquemas de zod
prisma/              esquema y migraciones
proxy.ts             redirecciones de páginas según la sesión
```

### Prioridades de tareas

Cada tarea tiene una prioridad obligatoria: No prioritario (por defecto), Bajo, Medio o Alto. Se selecciona al crear o editar la tarea y se muestra en el tablero y el detalle. El filtro por prioridad se combina con la búsqueda por título y el filtro por etiqueta.
