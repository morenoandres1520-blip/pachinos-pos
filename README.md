# PaChinos POS - Sistema de Punto de Venta

Sistema de punto de venta (POS) para tienda de calzado PaChinos. Aplicación web mobile-first accesible desde el navegador del celular.

## Stack Tecnológico

- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript
- **Base de datos + Auth:** Supabase
- **Hosting:** Vercel
- **Estilos:** Tailwind CSS + shadcn/ui
- **State management:** Zustand
- **PDF:** jsPDF
- **Gráficas:** Recharts
- **Iconos:** Lucide React

## Requisitos Previos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (plan gratuito)
- Cuenta en [Vercel](https://vercel.com) (plan gratuito)

## Configuración Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/pachinos-pos.git
cd pachinos-pos
npm install
```

### 2. Configurar Supabase

1. Crear un nuevo proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ir a **SQL Editor** y ejecutar el archivo `supabase/migrations/001_initial_schema.sql`
3. Copiar las credenciales del proyecto:
   - **Project URL** (Settings > API > Project URL)
   - **Anon/Public Key** (Settings > API > anon public)

### 3. Variables de entorno

Crear archivo `.env.local` en la raíz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 4. Crear usuario admin inicial

En el Dashboard de Supabase > Authentication > Users > Add User:
- Email: admin@pachinos.com
- Password: (tu contraseña segura)

Luego en SQL Editor ejecutar:
```sql
UPDATE public.profiles
SET role = 'admin', full_name = 'Administrador'
WHERE email = 'admin@pachinos.com';
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Despliegue en Vercel

### 1. Conectar con GitHub

1. Subir el código a GitHub
2. Ir a [vercel.com](https://vercel.com) > New Project
3. Importar el repositorio desde GitHub
4. Framework preset: Next.js (se detecta automáticamente)

### 2. Configurar variables de entorno en Vercel

En Settings > Environment Variables, agregar:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |

### 3. Deploy

Vercel desplegará automáticamente con cada push a `main`.

## Estructura del Proyecto

```
src/
├── app/
│   ├── login/          # Página de login
│   ├── (dashboard)/
│   │   ├── pos/        # Punto de venta
│   │   ├── inventory/  # Inventario
│   │   ├── sales/      # Historial de ventas
│   │   ├── reports/    # Reportes (admin)
│   │   ├── settings/   # Configuración (admin)
│   │   └── users/      # Gestión usuarios (admin)
│   └── api/            # API routes
├── components/
│   ├── ui/             # shadcn components
│   ├── pos/            # Componentes POS
│   ├── invoice/        # Facturación y PDF
│   ├── inventory/      # Inventario
│   ├── reports/        # Gráficas
│   └── layout/         # Layout y navegación
├── hooks/              # Custom hooks
├── lib/                # Utilidades
├── store/              # Zustand stores
└── types/              # TypeScript types
```

## Roles

| Rol | Acceso |
|-----|--------|
| **Admin** | Acceso total: inventario, reportes, usuarios, configuración, anular ventas |
| **Cajera** | POS, consulta inventario, sus ventas del día, imprimir facturas |

## Características

- Mobile-first (optimizado para 360-430px)
- PWA instalable
- Generación de PDF para facturas
- Impresión en papel térmico (58mm/80mm)
- Compartir facturas por WhatsApp
- Reportes con gráficas
- Gestión de inventario por talla
- Alertas de bajo stock
- Moneda COP con formato colombiano
- Zona horaria America/Bogota
