# FieldTrack — Enterprise Monorepo

FieldTrack is an enterprise-grade GPS tracking, geofencing, and employee attendance platform.

## Monorepo Architecture

```
FieldTrack/
├── apps/
│   ├── admin-web/      # Next.js 13+ App Router admin & dispatcher dashboard
│   └── android/        # Native Android app (Kotlin, Jetpack Compose, Room, WorkManager)
├── supabase/           # PostgreSQL schemas, PostGIS migrations, and Edge Functions
│   ├── migrations/     # Database migration scripts (core schema, tracking, geofences)
│   └── functions/      # Privileged Deno Edge Functions (check-in/out, integrity)
└── docs/               # System architecture, database schema, security & PRD specs
    ├── ARCHITECTURE.md # System components and high-level design
    ├── DATABASE.md     # PostgreSQL/PostGIS schema and table definitions
    └── SECURITY.md     # Authentication, RBAC, anti-spoofing & integrity model
```

## Quick Start (Admin Web)

### Prerequisites
- Node.js 18+
- npm 9+

### Install Dependencies
```bash
npm install
```

### Development
```bash
# Run web admin dashboard
npm run dev:web

# Build web admin dashboard
npm run build:web

# Typecheck web admin dashboard
npm run typecheck:web
```

## Documentation
Refer to the [`docs/`](./docs) directory for architectural and security specifications:
- [Architecture Guide](file:///docs/ARCHITECTURE.md)
- [Database Specifications](file:///docs/DATABASE.md)
- [Security Model](file:///docs/SECURITY.md)
