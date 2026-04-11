# Event Staff Management Platform

A modern, full-stack event staff management and scheduling platform built with Next.js 16, tRPC, Prisma, and better-auth.

## 🚀 Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **tRPC 11** - End-to-end typesafe APIs
- **Prisma 6** - Next-generation ORM
- **PostgreSQL** - Relational database
- **better-auth** - Modern authentication
- **Tailwind CSS 4** - Utility-first styling
- **shadcn/ui** - Component library
- **Zod** - Schema validation
- **React Query** - Data fetching & caching

## ✨ Features

### Completed ✅
- ✅ **Backend Infrastructure**
  - Type-safe API with tRPC (14 procedures)
  - Prisma ORM with PostgreSQL
  - better-auth authentication (session-based)
  - Role-based access control (4 roles: SUPER_ADMIN, ADMIN, MANAGER, STAFF)
  - Business logic services (UserService with 8 methods)
  - Zod schema validation

- ✅ **Frontend Pages**
  - UI component library (14 components with purple/rose theme)
  - Login page with form validation
  - Dashboard with animated stats counters
  - User management (full CRUD with search, filters, pagination)
  - Responsive layout with sidebar and header
  - Protected routes with authentication guards

- ✅ **User Management**
  - Create, read, update, delete users
  - Activate/deactivate users
  - Search with 300ms debouncing
  - Filter by role and status
  - Pagination with customizable items per page
  - Responsive design (desktop table + mobile cards)

- ✅ **Dashboard**
  - Real-time user statistics
  - Role breakdown visualization
  - Animated counters with smooth easing
  - Welcome section with time-based greeting

### Planned 📋
- Event management (schema ready, implementation deferred)
- Staff scheduling
- Time tracking
- Reporting & analytics
- File uploads (profile photos)

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 15+

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Start PostgreSQL with Docker
docker-compose up -d postgres

# 4. Run migrations
npm run db:migrate

# 5. Seed database (creates admin user)
npm run db:seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Default Admin Credentials
```
Email: admin@example.com
Password: admin123
```

**IMPORTANT**: Change these credentials after first login!

## 📁 Project Structure

```
event-nextjs/
├── app/                     # Next.js App Router
│   ├── (guest)/            # Public routes (login)
│   ├── (protected)/        # Protected routes (dashboard, users)
│   │   ├── dashboard/      # Dashboard page
│   │   └── users/          # User management page
│   └── api/                # API routes (auth, tRPC)
├── server/                  # Backend (tRPC routers)
│   └── routers/            # API routers (user, profile, session)
├── services/                # Business logic
│   └── user.service.ts     # User CRUD operations
├── lib/                     # Utilities & config
│   ├── client/             # Client-side code (auth, tRPC)
│   ├── server/             # Server-side code (Prisma, auth)
│   ├── schemas/            # Zod validation schemas
│   └── providers/          # React providers (tRPC, Toast)
├── components/              # React components
│   ├── guards/             # Route protection (AuthGuard, GuestGuard)
│   ├── layout/             # Layout components (Sidebar, Header)
│   ├── dashboard/          # Dashboard components
│   ├── users/              # User management components
│   └── ui/                 # UI component library (14 components)
├── prisma/                  # Database schema & migrations
│   ├── schema.prisma       # Database models
│   ├── seed.ts             # Seed script
│   └── migrations/         # Migration history
└── docker-compose.yml       # PostgreSQL & pgAdmin
```

## 🔐 Authentication

### Roles & Permissions

| Role | Access Level |
|------|-------------|
| **SUPER_ADMIN** | Full system access |
| **ADMIN** | Manage users & events |
| **MANAGER** | View & manage assigned events |
| **STAFF** | View assignments |

### tRPC Procedures

- `publicProcedure` - No auth required
- `protectedProcedure` - Auth required
- `managerProcedure` - Manager+ required
- `adminProcedure` - Admin+ required

## 📖 Usage Examples

### Query Data

```typescript
import { trpc } from '@/lib/client/trpc';

export function UsersList() {
  const { data } = trpc.user.getAll.useQuery({
    page: 1,
    limit: 10,
  });

  return <div>{/* Render users */}</div>;
}
```

### Mutation

```typescript
const createUser = trpc.user.create.useMutation({
  onSuccess: () => {
    // Invalidate and refetch
    utils.user.getAll.invalidate();
  },
});

createUser.mutate({ email, password, firstName, lastName, role });
```

## 🎨 Design System

- **Colors**: Deep Purple (#7C3AED) + Rose (#FB7185)
- **Font**: Lexend
- **Dark Mode**: Supported
- **Animations**: Smooth transitions

## 📚 Scripts

```bash
# Development
npm run dev          # Start dev server

# Build
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linter

# Database
npm run db:generate  # Generate Prisma Client
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio (database GUI)

# Docker
docker-compose up -d postgres  # Start PostgreSQL
docker-compose up -d pgadmin   # Start pgAdmin
docker-compose down            # Stop all services
```

## 🏗️ Architecture

**Type Safety Flow:**
```
Prisma Schema → Service Layer → tRPC Router → Client Hooks
```

All types are automatically inferred - no manual definitions needed!

## 📄 Documentation

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration details from NestJS to Next.js
- [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) - Complete development roadmap
- [PROGRESS_SUMMARY.md](./PROGRESS_SUMMARY.md) - Progress summary and statistics
- [CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md) - Cleanup and migration completion summary
- [BACKEND_IMPLEMENTATION.md](./BACKEND_IMPLEMENTATION.md) - Backend architecture (legacy reference)
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Implementation summary (legacy reference)
- [REFACTORING_INSTRUCTIONS.md](./REFACTORING_INSTRUCTIONS.md) - Refactoring notes (legacy reference)

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

## 📝 Environment Variables

```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your-secret-min-32-chars"
```

See `.env.example` for full list.

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Submit pull request

## 📞 Support

For issues: Create a GitHub issue with detailed information

---

**Built with ❤️ using modern web technologies**
