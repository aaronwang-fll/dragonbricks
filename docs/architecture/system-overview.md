# System Overview

## What DragonBricks Does

DragonBricks lets FLL teams write robot programs in plain English. Users type natural language commands like "move forward 200mm" or "turn right 90 degrees" and the system generates valid Pybricks Python code that runs on LEGO SPIKE Prime hubs.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Editor   │  │  Preview     │  │  Settings         │  │
│  │  Panel    │  │  Panel       │  │  Page             │  │
│  └─────┬────┘  └──────────────┘  └───────────────────┘  │
│        │ parse request                                   │
│        ▼                                                 │
│  ┌──────────┐                    ┌───────────────────┐  │
│  │  useParser│───HTTP POST──────▶│  Backend API       │  │
│  │  hook     │◀──ParseResponse──│  /api/v1/parser    │  │
│  └──────────┘                    └────────┬──────────┘  │
└──────────────────────────────────────────│────────────┘
                                           │
                    ┌──────────────────────┼──────────────┐
                    │          Backend (FastAPI)           │
                    │                      ▼              │
                    │  ┌───────────────────────────────┐  │
                    │  │  Parser Service                │  │
                    │  │  tokenizer → patterns → parser │  │
                    │  │         → codegen              │  │
                    │  └───────────┬───────────────────┘  │
                    │              │ if needs_llm          │
                    │              ▼                       │
                    │  ┌───────────────────────────────┐  │
                    │  │  LLM Service (OpenAI/Claude)  │  │
                    │  └───────────────────────────────┘  │
                    │                                     │
                    │  ┌───────────────────────────────┐  │
                    │  │  PostgreSQL (Supabase)         │  │
                    │  │  Users, Teams, Programs        │  │
                    │  └───────────────────────────────┘  │
                    └─────────────────────────────────────┘
```

## Data Flow: Natural Language to Python

1. **User types** natural language in the Editor Panel
2. **Frontend debounces** input, sends lines to `POST /api/v1/parser/parse`
3. **Backend tokenizer** splits input into tokens (words, numbers, units)
4. **Pattern matcher** tries to match tokens against known command patterns
5. **Parser** builds a structured command from matched patterns
6. **Code generator** converts the structured command to Pybricks Python
7. **If no pattern matches**, the command is flagged `needs_llm` for Cloud AI fallback
8. **Response** returns per-line results + full generated program code
9. **Frontend displays** Python code alongside each natural language line

## Two-Tier NLP Strategy

The parser uses a two-tier approach:

| Tier | Coverage | Latency | Cost |
|------|----------|---------|------|
| Rule-based parser | ~80% of commands | <10ms | Free |
| Cloud AI (OpenAI/Anthropic) | Remaining ~20% | 500ms-2s | Per-token |

The rule-based parser handles all standard robotics commands (movement, turns, waits, motor control, sensors). Cloud AI is reserved for ambiguous, complex, or novel commands that don't match known patterns.

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 7.2 | Build tool and dev server |
| Zustand | 5.0 | State management |
| Tailwind CSS | 4.1 | Utility-first styling |
| Vitest | 4.0 | Unit testing |
| ESLint | 9.39 | Linting |
| Prettier | 3.8 | Code formatting |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.109 | Async web framework |
| SQLAlchemy | 2.0 | ORM (async mode) |
| asyncpg | 0.29 | PostgreSQL async driver |
| Pydantic | 2.5 | Request/response validation |
| python-jose | 3.3 | JWT authentication |
| passlib/bcrypt | 1.7/4.1 | Password hashing |
| httpx | 0.26 | HTTP client for LLM APIs |
| pytest | 7.4 | Testing |
| Ruff | 0.4+ | Linting and formatting |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| PostgreSQL (Supabase) | Production database |
| SQLite (aiosqlite) | Test database |
| GitHub Actions | CI pipeline |
| Web Bluetooth API | SPIKE Prime connection (future) |

## Ports

| Service | URL |
|---------|-----|
| Frontend dev server | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
