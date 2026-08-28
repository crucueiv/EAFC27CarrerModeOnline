# EAFC27 Career Mode Online MVP

Aplicación web ejecutable en **Next.js 14 App Router** para la gestión de un Modo Carrera Manager Online multijugador. Utiliza TypeScript, Tailwind CSS, Prisma ORM y PostgreSQL (alojado en **Neon**), manteniendo la lógica de dominio de partidos y calendario totalmente desacoplada y libre de dependencias.

---

## 🏗️ Arquitectura del Proyecto

- **`src/domain/`**: Reglas puras y fuertemente tipadas sin dependencias de base de datos ni UI.
  - `simulateMatch.ts`: Motor de simulación de partidos (resultado, eventos de goles/asistencias, MVP y estadísticas).
  - `canUserAdvance.ts`: Verificador de avance de jornada y bloqueos por partidos PvP pendientes o eliminatorias.
  - `provider.ts` / `mockProvider.ts`: Adaptador y contratos de sincronización para proveedores externos de ratings.
- **`src/lib/transfers/`**:
  - `pricingEngine.ts`: Motor financiero puro para calcular valor de mercado, cláusula de rescisión y sueldo semanal con crecimiento exponencial (según media, potencial, edad `birthdate`, reputación internacional, nivel de liga y rendimiento de partidos).
  - `search.ts`: Buscador server-side paginado en Prisma e hidratación idempotente desde EA Sports FC.
- **`src/lib/ratings/`**:
  - `eaClient.ts`: Cliente de integración con la API oficial de EA Sports FC (`drop-api.ea.com`, `locale=es`, retratos CDN).
- **`src/app/`**: Páginas del App Router y Route Handlers (`/transfers`, `/squad`, `/calendar`, `/match/[id]`, `/admin/ratings`, `/api/...`).
- **`src/components/transfers/`**:
  - `PlayerCardRow.tsx`: Ficha visual del jugador con avatar CDN, banderas/escudos, precio, sueldo, cláusula, barras de stats y la insignia de media circular con efecto **Élite 90+**.
  - `TransferFilters.tsx`: Panel de filtros interactivos con selector clicable de posiciones.
- **`prisma/schema.prisma`**: Modelo de datos persistente (Usuarios, Grupos, Ligas, Equipos, Nacionalidades, Jugadores, Plantillas/Rosters, Transferencias, Partidos, Eventos, Estadísticas y Fases de Torneo).

---

## ⚡ Instalación y Configuración

1. **Requisitos**: Node.js 20+.
2. **Base de Datos (Neon)**:
   - El proyecto está enlazado a Neon (`small-dew-39736191`, rama `production`).
   - Copia `.env.example` a `.env.local`:
     - `DATABASE_URL`: URL *pooled* para el runtime de Next.js.
     - `DATABASE_URL_UNPOOLED`: URL *direct* para migraciones de Prisma.
3. **Comandos de Inicialización**:

```bash
npm install
npx prisma generate
npx prisma validate
npx prisma db push
npm run typecheck
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🛠️ Comandos Disponibles

- `npm run dev`: Inicia el servidor de desarrollo local.
- `npm run build`: Compila la aplicación para producción.
- `npm run typecheck`: Verificación estricta de tipos con TypeScript.
- `npm run prisma:generate`: Genera el cliente de Prisma.
- `npm run prisma:validate`: Valida la sintaxis del esquema Prisma.
- `npm run db:seed`: Importa el catálogo de EA Sports FC en Neon (usa `EA_IMPORT_MAX_PLAYERS` para limitar la importación; por defecto: 1.000.000).
- `npm run db:backfill-search`: Normaliza nombres existentes para búsquedas sin tildes ni mayúsculas.
- `npm run db:remove-female`: Elimina registros de fútbol femenino preservando clubes y ligas compartidos.
- `npm run db:recalculate-roles`: Recalcula los roles de plantilla activos (`85+` Clave, `77-84` Importante, `<77` Rotación).

---

## 📁 Árbol de Directorios

```text
prisma/
  schema.prisma
  seed.ts
scripts/
  backfillSearchNames.ts
  recalculateRosterRoles.ts
  removeFemalePlayers.ts
docs/
  EA-POSITIONS.md
src/
  app/
    admin/ratings/page.tsx
    api/admin/ratings/route.ts
    api/calendar/advance/route.ts
    api/matches/simulate/route.ts
    api/transfers/search/route.ts
    calendar/page.tsx
    match/[id]/page.tsx
    squad/page.tsx
    transfers/page.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    transfers/
      PlayerCardRow.tsx
      TransferFilters.tsx
  domain/
    calendar/canUserAdvance.ts
    matches/simulateMatch.ts
    ratings/mockProvider.ts
    ratings/provider.ts
  lib/
    ratings/eaClient.ts
    transfers/pricingEngine.ts
    transfers/search.ts
    prisma.ts
```

---

## 💎 Características Principales

### ⚽ Mercado de Fichajes y Buscador
- Búsqueda server-side en el endpoint `GET /api/transfers/search`.
- Filtros por nombre, posición, rango de media, atributos mínimos (PAC, SHO, PAS, DRI, DEF, PHY), precio máximo, liga, equipo y nacionalidad.
- Búsquedas inmunes a tildes y mayúsculas mediante normalización Unicode.
- Posiciones seleccionables mediante cuadrícula clicable con mapeo numérico de EA ([docs/EA-POSITIONS.md](file:///E:/coding%20projects/EAFC27CarrerModeOnline/docs/EA-POSITIONS.md)).

### 🌟 Insignia Élite 90+ (Efecto Reflejo Metálico)
Los jugadores con **90 o más de media** disponen de un acabado visual premium en su ficha:
- **Círculo con Fondo Radiante Metálico**: Gradiente de alta gama `amber-200` / `purple-100` / `indigo-200`.
- **Anillo de Progreso SVG Multicolor**: Gradiente continuo (Dorado -> Púrpura -> Magenta -> Azul).
- **Reflejo Metálico Animado**: Haz de luz en movimiento continuo generado por CSS (`.elite-rating-ring::after`).
- **Número de Media Centrado en Negro**: El texto del rating se muestra en negro intenso (`#000000`) superpuesto en la capa superior (`z-index: 20`).

### 💰 Motor Financiero (`pricingEngine.ts`)
- **Valor de Mercado**: Cálculo exponencial a partir del rating, potencial, edad (`birthdate`), nivel de liga (Tier 1 a 5) y reputación internacional.
- **Sueldo Semanal**: Calculado dinámicamente según el rol contractual (`CLAVE`, `IMPORTANTE`, `ROTACION`) y el valor de mercado.
- **Rendimiento**: Ajuste dinámico opcional en función de la calificación media de partidos históricos (`MatchStat`).

---

## 🚀 Próximos Pasos (Post-MVP)
- Conexión de autenticación y autorización real de usuarios.
- Persistencia transaccional de operaciones de compra/venta en Prisma.
- Coordinación y salas PvP en tiempo real.
