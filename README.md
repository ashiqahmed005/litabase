# Litabase

A lightweight self-hosted BI dashboard. Connect to your databases, write SQL queries, build dashboards with charts, and schedule automated email reports — all from a single web UI.

![CI](https://github.com/your-org/litabase/actions/workflows/ci.yml/badge.svg)

---

## Features

- **Multi-database connections** — PostgreSQL, MySQL, SQLite
- **SQL editor** — write and run ad-hoc queries with live results
- **Saved queries** — name, describe, and reuse queries across dashboards
- **Dashboards** — drag-and-drop widget grid with bar, line, pie, scatter, and table charts
- **Scheduled reports** — cron-based email delivery with HTML + CSV attachments
- **Role-based access** — Admin / Editor / Viewer permissions
- **Encrypted credentials** — connection passwords stored with AES-256-CBC

---

## Architecture

```
litabase/
├── backend/                Node.js / Express API
│   └── src/
│       ├── app.js          Express app (middleware + routes)
│       ├── server.js       Entry point (migrate → scheduler → listen)
│       ├── controllers/    Business logic — one file per domain
│       ├── repositories/   All SQL — one file per domain entity
│       ├── routes/         HTTP verb + auth wiring only
│       ├── services/       crypto · emailer · queryRunner · scheduler
│       ├── middleware/      auth (JWT) · asyncHandler
│       ├── errors/         Typed AppError subclasses
│       └── db/             Pool, migration, schema.sql
│
├── frontend/               Vanilla JS, no framework dependencies
│   └── js/
│       ├── framework/      Signals, reactive Component base class
│       ├── core/           Router, HTTP client, DOM builder (h()), store
│       ├── ui/             Modal, Toast, state elements
│       ├── components/     DashboardGrid, QueryList, …
│       └── features/       auth · connections · editor · dashboard · schedules · widgets
│
├── docker-compose.yml       Base Compose config
├── docker-compose.dev.yml   Dev overrides (native node + hot-reload)
├── docker-compose.prod.yml  Prod overrides (Docker-only, nginx frontend)
└── dev.sh                   One-command local dev startup
```

---

## Quick start (local development)

### Prerequisites

- **Node.js** ≥ 20
- **Docker** (for PostgreSQL — no local install needed)
- **npm** ≥ 10

### 1 — Clone and start

```bash
git clone https://github.com/your-org/litabase.git
cd litabase
chmod +x dev.sh
./dev.sh
```

`dev.sh` handles everything:

- Starts two PostgreSQL containers via Docker Compose:
  - `postgres` (port **5432**) — the app database
  - `example-db` (port **5433**) — a seeded e-commerce store for exploring queries
- Copies `backend/.env.example` → `backend/.env` if none exists
- Installs npm dependencies for backend and frontend (skipped if already fresh)
- Starts the Express backend (`localhost:3000`) and the Vite dev server (`localhost:5173`)

```
  ✓ Frontend    http://localhost:5173
  ✓ Backend     http://localhost:3000
  ✓ Postgres    localhost:5432  (app DB)
  ✓ Example DB  localhost:5433  host=localhost port=5433
                                db=shop user=demo pass=demo
  i API proxy   /api → :3000 (via Vite)

  Ctrl+C         stop Node processes
  ./dev.sh stop  also stop Docker containers
```

### 2 — Configure the backend

`backend/.env` is created automatically from the example. Open it and set your values:

```dotenv
PORT=3000
NODE_ENV=development

DATABASE_URL=postgresql://litabase:devpassword@localhost:5432/litabase

JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Email (optional — needed only for scheduled reports)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-app-password
EMAIL_FROM=Litabase <your@email.com>

# 32-character key for AES-256 encryption of DB connection passwords
ENCRYPTION_KEY=32-char-secret-key-change-this!!
```

### 3 — Register the first user

Open `http://localhost:5173` and register. The **first account becomes admin**; all subsequent registrations default to viewer.

---

## Try the example database

The dev stack includes a pre-seeded PostgreSQL store (`db=shop`, `user=demo`, `pass=demo`, `port=5433`). After starting:

1. Go to **Connections → New Connection**, enter the credentials above.
2. Open the **SQL Editor**, select the connection, and run any query.
3. See `example-db/example-queries.sql` for ready-made queries (revenue by category, top customers, inventory levels, etc.).

---

## Running tests

### Backend (Jest)

```bash
cd backend
npm test                 # run all tests
npm run test:watch       # watch mode
npm run test:coverage    # run with v8 coverage report
```

Coverage is collected for `controllers/`, `repositories/`, `middleware/`, `errors/`, and `services/`. Routes and the server entry point are excluded (integration-layer, covered by CI).

### Frontend (Vitest)

```bash
cd frontend
npm test                 # run all tests
npm run test:watch       # watch mode
npm run test:coverage    # run with v8 coverage report
```

Coverage is collected for `js/core/`, `js/framework/`, and `js/ui/`. Feature and component files are excluded (require E2E).

---

## Production deployment

### Docker Compose

```bash
# Required env vars — set in shell or a .env file at the project root
export POSTGRES_PASSWORD=<strong-password>
export JWT_SECRET=<64-char-random-string>
export ENCRYPTION_KEY=<exactly-32-chars>
export SMTP_HOST=smtp.example.com
export SMTP_USER=reports@example.com
export SMTP_PASS=<smtp-password>
export EMAIL_FROM="Litabase <reports@example.com>"

# Build frontend static files
cd frontend && npm ci && npm run build && cd ..

# Start all services (postgres, backend, nginx)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Services started:

| Service | Description |
|---|---|
| `postgres` | PostgreSQL 16, internal only — no exposed port |
| `backend` | Node.js API on port 3000 (internal) |
| `frontend` | Nginx serving `frontend/dist/`, proxying `/api` to backend |

The nginx config is at `docker/nginx.conf`. Mount TLS certificates or put a reverse proxy (Caddy, Traefik) in front for HTTPS.

### Docker image (GHCR)

CI publishes the backend image to GitHub Container Registry on every push to `main` and on version tags:

```bash
docker pull ghcr.io/your-org/litabase/backend:main
docker pull ghcr.io/your-org/litabase/backend:v1.2.3
```

---

## API reference

All endpoints (except `/api/auth/register` and `/api/auth/login`) require:

```
Authorization: Bearer <token>
```

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Log in, receive JWT |
| GET | `/api/auth/me` | Any | Current user profile |
| GET | `/api/connections` | Any | List connections |
| POST | `/api/connections` | Admin/Editor | Create connection |
| POST | `/api/connections/:id/test` | Any | Test connectivity |
| PUT | `/api/connections/:id` | Admin/Editor | Update connection |
| DELETE | `/api/connections/:id` | Admin | Delete connection |
| GET | `/api/queries` | Any | List saved queries |
| GET | `/api/queries/:id` | Any | Get query |
| POST | `/api/queries/run` | Any | Run ad-hoc SQL |
| POST | `/api/queries` | Admin/Editor | Save a query |
| PUT | `/api/queries/:id` | Admin/Editor | Update query |
| DELETE | `/api/queries/:id` | Admin/Editor | Delete query |
| POST | `/api/queries/:id/run` | Any | Run saved query |
| GET | `/api/dashboards` | Any | List dashboards |
| GET | `/api/dashboards/:id` | Any | Dashboard + widgets |
| POST | `/api/dashboards` | Admin/Editor | Create dashboard |
| PUT | `/api/dashboards/:id` | Admin/Editor | Update dashboard |
| DELETE | `/api/dashboards/:id` | Admin/Editor | Delete dashboard |
| POST | `/api/dashboards/:id/widgets` | Admin/Editor | Add widget |
| PUT | `/api/dashboards/:id/widgets/:wid` | Admin/Editor | Update widget |
| DELETE | `/api/dashboards/:id/widgets/:wid` | Admin/Editor | Remove widget |
| GET | `/api/schedules` | Any | List schedules |
| POST | `/api/schedules` | Admin/Editor | Create schedule |
| PUT | `/api/schedules/:id` | Admin/Editor | Update schedule |
| DELETE | `/api/schedules/:id` | Admin | Delete schedule |
| POST | `/api/schedules/:id/run` | Admin/Editor | Trigger manually |
| GET | `/api/health` | — | Health check |

---

## CI / CD

| Workflow | Trigger | What it does |
|---|---|---|
| **CI** | Push / PR → `main` | Backend tests + coverage · Frontend tests + coverage + build |
| **Docker** | Push → `main` or `v*.*.*` tag | Build backend image, push to GHCR |
| **Release** | Push `v*.*.*` tag | Create GitHub release with auto-generated notes |

Dependabot opens weekly batched PRs for npm (backend + frontend) and GitHub Actions version updates.

---

## Environment variable reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | No | Token expiry (default `7d`) |
| `ENCRYPTION_KEY` | Yes | Exactly 32 characters, used for AES-256 |
| `PORT` | No | API listen port (default `3000`) |
| `NODE_ENV` | No | `development` or `production` |
| `FRONTEND_URL` | No | CORS origin (default `*`) |
| `SMTP_HOST` | No* | SMTP server for scheduled report emails |
| `SMTP_PORT` | No | SMTP port (default `587`) |
| `SMTP_USER` | No* | SMTP username |
| `SMTP_PASS` | No* | SMTP password |
| `EMAIL_FROM` | No* | From address on report emails |

*Required only if you use scheduled reports.

---

## License

MIT
