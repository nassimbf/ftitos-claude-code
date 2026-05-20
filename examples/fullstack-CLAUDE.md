# CLAUDE.md

## What

Fullstack application with a React frontend and Node.js/Express backend. Handles [describe domain].

## Where

```
project-root/
├── client/                # React frontend (Vite)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route-level page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API client functions
│   │   └── App.tsx        # Root component
│   └── vite.config.ts
├── server/                # Express backend
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic
│   ├── models/            # Database models (Prisma)
│   ├── middleware/         # Auth, validation, error handling
│   └── index.ts           # Server entry point
├── prisma/
│   └── schema.prisma      # Database schema
├── tests/
│   ├── client/            # Component + hook tests (Vitest)
│   ├── server/            # API integration tests (supertest)
│   └── e2e/               # End-to-end tests (Playwright)
└── CLAUDE.md
```

## How

### Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, TypeScript
- **ORM**: Prisma
- **DB**: PostgreSQL
- **Tests**: Vitest (unit), supertest (API), Playwright (E2E)

### Development

```bash
# Start both (always in tmux)
tmux new -s dev
npm run dev          # Runs client + server concurrently

# Tests
npm run test         # Unit + integration
npm run test:e2e     # Playwright E2E

# Database
npx prisma migrate dev --name "description"
npx prisma generate
```

### Conventions

- Frontend state managed via React hooks, no global state library unless justified
- API calls go through `client/src/services/` -- never fetch directly in components
- All forms validate on both client (immediate feedback) and server (security)
- Backend routes are thin: validate input, call service, return response
- Error responses follow consistent shape: `{ error: string, details?: object }`
- All interactive elements must be keyboard-navigable (WCAG 2.1 AA)

### Environment

- `DATABASE_URL` -- PostgreSQL connection
- `JWT_SECRET` -- Token signing key
- `VITE_API_URL` -- Frontend API base URL
- `PORT` -- Server port
