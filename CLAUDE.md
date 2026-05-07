@AGENTS.md

# PaChinos POS — Contexto del proyecto

Sistema de punto de venta para **PaChinos Calzado**, tienda de calzado en Colombia. Diseño mobile-first pensado para cajeras usando celular en el mostrador. El admin gestiona desde escritorio o móvil.

---

## Stack real (versiones instaladas)

| Tecnología | Versión | Nota importante |
|---|---|---|
| Next.js | **16.2.4** | Tiene breaking changes vs 14/15 — leer AGENTS.md |
| React | 19.2.4 | |
| TypeScript | 5.x | strict mode |
| Tailwind CSS | **v4** | Configuración muy diferente a v3 (usa `@tailwindcss/postcss`) |
| shadcn/ui | 4.7.0 | Componentes en `src/components/ui/` |
| Supabase | `@supabase/ssr` 0.10 + `supabase-js` 2.x | |
| Zustand | **v5** | API ligeramente diferente a v4 |
| jsPDF + autotable | 4.x / 5.x | Para facturas PDF (tickets 80mm) |
| Recharts | 3.x | Gráficas en reportes |
| sonner | 2.x | Toasts |
| date-fns | 4.x | |
| lucide-react | 1.x | Íconos |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (dashboard)/         → rutas protegidas (auth check en layout)
│   │   ├── layout.tsx       → header + BottomNav, guarda de auth client-side
│   │   ├── pos/page.tsx     → punto de venta principal
│   │   ├── inventory/       → gestión de productos y stock
│   │   ├── sales/           → historial de ventas
│   │   ├── reports/         → KPIs y gráficas (solo admin)
│   │   ├── settings/        → configuración del negocio (solo admin)
│   │   └── users/           → gestión de usuarios (solo admin)
│   ├── api/users/route.ts   → único API route (crear usuarios en Supabase Auth)
│   ├── login/page.tsx       → login público
│   └── page.tsx             → redirect a /pos
├── components/
│   ├── ui/                  → shadcn components
│   ├── pos/                 → ProductCard, CartPanel, CheckoutDialog, etc.
│   ├── inventory/           → InventoryCard, ProductForm, StockAdjustment
│   ├── invoice/             → InvoicePreview, InvoiceHtml, PrintStyles
│   ├── reports/             → KpiCards, SalesChart, TopProducts, etc.
│   ├── settings/            → UserForm
│   └── layout/              → BottomNav
├── hooks/
│   ├── use-auth.ts          → user + profile + signOut (client-side)
│   └── use-permissions.ts   → permisos por rol basados en useAuth
├── lib/
│   ├── format.ts            → formatCOP, formatDate, getTodayRange (zona Bogotá)
│   ├── utils.ts             → cn() de shadcn
│   ├── pdf/generate-invoice.ts → genera PDF ticket 80mm con jsPDF
│   └── supabase/
│       ├── client.ts        → createClient() para componentes client
│       ├── server.ts        → createClient() para Server Components
│       └── middleware.ts    → updateSession() para el proxy
├── store/
│   └── cart-store.ts        → Zustand store del carrito (items, pagos, cliente)
├── types/
│   └── database.ts          → todos los tipos TypeScript del dominio
└── proxy.ts                 → punto de entrada del middleware (Next.js 16)
```

---

## Next.js 16 — diferencias clave

- El middleware se llama `src/proxy.ts` (no `middleware.ts`) — es la convención de Next.js 16
- Todas las páginas del dashboard usan `'use client'` + `export const dynamic = 'force-dynamic'`
- No se usan Server Actions en este proyecto — todo es client-side con Supabase JS SDK directo
- Leer `node_modules/next/dist/docs/` antes de tocar routing, middleware o layouts

---

## Autenticación y roles

Dos roles: `admin` y `cajera`.

**Flujo de auth:**
1. `src/proxy.ts` redirige rutas protegidas a `/login` si no hay sesión
2. `(dashboard)/layout.tsx` hace un segundo check client-side con `useAuth()`
3. `usePermissions()` expone permisos granulares derivados del rol

**Permisos por rol** (`src/hooks/use-permissions.ts`):
- `cajera`: solo puede hacer ventas y ver sus propias ventas
- `admin`: acceso total — inventario, usuarios, reportes, configuración, anular ventas

**RLS en Supabase:** todas las tablas tienen Row Level Security activo. Las políticas reflejan los mismos permisos del frontend. No asumir que el frontend es la única línea de defensa.

---

## Base de datos (Supabase)

Migración única: `supabase/migrations/001_initial_schema.sql`

### Tablas principales

| Tabla | Descripción |
|---|---|
| `profiles` | Extiende `auth.users`. Campos: `role`, `full_name`, `is_active` |
| `business_config` | Config del negocio (NIT, dirección, IVA). Una sola fila |
| `products` | Catálogo. `category_id` → `categories`, `brand_id` → `brands` |
| `product_variants` | Talla + stock por producto. `size` es `text` en DB |
| `inventory_movements` | Auditoría de stock: entrada, salida, corrección, venta, anulación |
| `sales` | Cabecera de venta. `invoice_number` formato `PCH-000001` (secuencia PostgreSQL) |
| `sale_items` | Ítems de la venta con snapshot de nombre/SKU/precio |
| `sale_payments` | Pagos de la venta (soporta pagos mixtos) |
| `categories` | Dama, Caballero, Niño, Niña, Unisex |
| `brands` | Marcas de calzado |

### Inconsistencias conocidas entre tipos TS y DB

- `ProductVariant.size` es `number` en TypeScript pero `text` en la DB — la DB es la fuente de verdad
- `Product.price_cost / price_sale` en TypeScript vs `cost_price / sale_price` en la DB — revisar queries

### Métodos de pago

`efectivo` | `tarjeta` | `transferencia` | `nequi` | `daviplata`

Se soportan pagos mixtos (ej: parte efectivo + parte Nequi).

### Storage

Bucket `images` (público) en Supabase Storage para fotos de productos y logo del negocio.

---

## Estado del carrito (Zustand)

`src/store/cart-store.ts` — store persistido en memoria (se limpia al cerrar sesión o completar venta).

Contiene: items, pagos, datos del cliente, descuento (fijo o porcentaje), notas.

Los totales son funciones computadas (no estado): `subtotal()`, `discountAmount()`, `ivaAmount()`, `total()`.

---

## Formateo colombiano

Todas las funciones en `src/lib/format.ts`:

- `formatCOP(amount)` → `$ 1.250.000` (puntos como separador de miles)
- `formatDate()`, `formatDateTime()`, `formatTime()` → locale `es-CO`, zona `America/Bogota`
- `getTodayRange()` → rango del día en UTC ajustado a Bogotá (UTC-5)

---

## Facturas PDF

`src/lib/pdf/generate-invoice.ts` genera tickets de 80mm (~226pt de ancho) con jsPDF.

- Sin customer → "RECIBO DE CAJA"
- Con customer → "FACTURA DE VENTA"
- Número de factura: secuencia PostgreSQL `invoice_number_seq` → función `generate_invoice_number()`

---

## UI y diseño

- **Mobile-first** — navegación inferior (`BottomNav`), drawers desde abajo, FAB en móvil
- **Color principal**: escala amber (`amber-50` fondo, `amber-700/800/900` para texto y botones de marca)
- **shadcn/ui** para todos los componentes base — no crear componentes UI desde cero si ya existe uno en `src/components/ui/`
- **Responsive**: grids 2→3→4→5 columnas en POS; 1→2→3→4 en inventario
- `Sheet` (drawer) para formularios en móvil, `Dialog` para confirmaciones

---

## Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Solo estas dos. El archivo de ejemplo está en `.env.local.example`.

---

## Comandos de desarrollo

```bash
npm run dev      # servidor local
npm run build    # build de producción
npm run lint     # ESLint
```

No hay tests configurados aún (Vitest/Playwright no instalados).

---

## Convenciones observadas en el código

- Componentes: siempre funcionales, `'use client'` explícito en todo lo que usa hooks
- Data fetching: `useCallback` + `useEffect` con Supabase client directo (no Server Actions)
- Errores: estado local `error: string | null`, nunca throw sin catch
- Loading: skeleton components durante carga, no spinners globales
- Imports: absolutos con `@/`
- Nombres de funciones en inglés, strings de UI en español colombiano
- No hay Zod en el proyecto actualmente (aunque es parte del estándar global)
