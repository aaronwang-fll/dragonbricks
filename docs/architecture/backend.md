# Backend Architecture

## Application Structure

```
backend/
├── app/
│   ├── main.py              → FastAPI app, CORS, lifespan, routes
│   ├── api/
│   │   ├── __init__.py      → APIRouter aggregating all route modules
│   │   ├── auth.py          → POST /register, POST /login
│   │   ├── users.py         → GET/PATCH /users/me, GET /users/{id}
│   │   ├── teams.py         → CRUD /teams, members, invite codes
│   │   ├── programs.py      → CRUD /programs, shares, forks
│   │   ├── parser.py        → POST /parser/parse, /parser/validate
│   │   └── llm.py           → POST /llm/parse (cloud AI fallback)
│   ├── models/
│   │   ├── __init__.py      → Re-exports all models
│   │   ├── user.py          → User model
│   │   ├── program.py       → Program + ProgramShare models
│   │   └── team.py          → Team + TeamMember models
│   ├── schemas/
│   │   ├── __init__.py      → Re-exports all schemas
│   │   ├── user.py          → UserCreate, UserUpdate, UserResponse
│   │   ├── program.py       → ProgramCreate, ProgramUpdate, ProgramResponse
│   │   ├── team.py          → TeamCreate, TeamUpdate, TeamResponse
│   │   ├── parser.py        → ParseRequest, ParseResponse, ParseResultItem
│   │   └── llm.py           → LLMParseRequest, LLMParseResponse
│   ├── services/
│   │   └── parser/
│   │       ├── __init__.py  → Package init
│   │       ├── tokenizer.py → Token dataclass, tokenize() function
│   │       ├── patterns.py  → Command patterns and synonyms
│   │       ├── parser.py    → parse_command(), RobotConfig, ParseResult
│   │       ├── codegen.py   → generate_program() from ParseResults
│   │       └── fuzzy_match.py → Levenshtein distance for typo tolerance
│   └── core/
│       ├── config.py        → Settings (pydantic-settings), env vars
│       ├── database.py      → AsyncSession, engine, Base
│       └── security.py      → JWT create/verify, password hashing
├── tests/
│   ├── conftest.py          → Test fixtures (async DB, client, auth)
│   ├── test_auth.py         → Registration and login tests
│   ├── test_parser.py       → Parser unit tests
│   ├── test_programs.py     → Program CRUD tests
│   ├── test_users.py        → User profile tests
│   └── test_teams.py        → Team management tests
├── requirements.txt
└── ruff.toml
```

## Application Lifecycle

```python
# main.py — lifespan handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: close database connections
    await engine.dispose()
```

The app creates tables on startup (no Alembic migrations in dev) and disposes connections on shutdown.

## Middleware

| Middleware | Purpose |
|-----------|---------|
| CORSMiddleware | Allows `localhost:5173` and `localhost:3000` origins |

## Authentication Flow

1. **Register**: `POST /api/v1/auth/register` — Creates user with bcrypt-hashed password
2. **Login**: `POST /api/v1/auth/login` — Verifies password, returns JWT access token
3. **Protected routes**: Use `Depends(get_current_user)` to extract user from JWT Bearer token
4. **Token config**: HS256 algorithm, 7-day expiry, secret key from env or auto-generated

## Database

- **Production**: PostgreSQL via asyncpg (Supabase hosted)
- **Testing**: SQLite via aiosqlite (in-memory)
- **ORM**: SQLAlchemy 2.0 async mode with `AsyncSession`
- **Schema creation**: Auto-created on startup via `Base.metadata.create_all`

## Configuration (core/config.py)

Settings loaded from environment variables with sensible defaults:

| Setting | Default | Description |
|---------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://...localhost/dragonbricks` | DB connection |
| `SECRET_KEY` | Auto-generated | JWT signing key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 10080 (7 days) | Token lifetime |
| `CORS_ORIGINS` | `localhost:5173, localhost:3000` | Allowed origins |
| `OPENAI_API_KEY` | None | For LLM fallback |
| `ANTHROPIC_API_KEY` | None | For LLM fallback |
| `DEFAULT_LLM_PROVIDER` | `openai` | Primary LLM provider |
| `RATE_LIMIT_PER_MINUTE` | 60 | General rate limit |
| `LLM_RATE_LIMIT_PER_MINUTE` | 20 | LLM-specific rate limit |

## Route Modules

### auth.py — Authentication
- `POST /register` — Create account (email, username, password)
- `POST /login` — Get JWT token (email + password)

### users.py — User Management
- `GET /users/me` — Current user profile
- `PATCH /users/me` — Update profile/settings
- `GET /users/{id}` — Public user info

### teams.py — Team Management
- `POST /teams` — Create team (creator becomes owner)
- `GET /teams` — List user's teams
- `GET /teams/{id}` — Team details + members
- `PATCH /teams/{id}` — Update team (admin+)
- `DELETE /teams/{id}` — Delete team (owner only)
- `POST /teams/{id}/members` — Add member
- `POST /teams/{id}/join` — Join via invite code
- `DELETE /teams/{id}/members/{user_id}` — Remove member

### programs.py — Program Management
- `POST /programs` — Create program
- `GET /programs` — List user's programs
- `GET /programs/{id}` — Get program
- `PATCH /programs/{id}` — Update program
- `DELETE /programs/{id}` — Delete program
- `POST /programs/{id}/shares` — Share with user
- `GET /programs/{id}/shares` — List shares
- `POST /programs/{id}/fork` — Fork program

### parser.py — Natural Language Parsing
- `POST /parser/parse` — Parse lines to Python code
- `POST /parser/validate` — Validate commands without codegen

### llm.py — Cloud AI Fallback
- `POST /llm/parse` — Send command to OpenAI/Anthropic for parsing
