# Implementation Status

Last updated: 2026-02-16

## Summary

DragonBricks is a functional MVP with the core editing loop working end-to-end: type natural language commands, see Python code generated in real-time, configure robot settings. The backend parser, API, database, auth, and team systems are fully implemented. Cloud persistence and Bluetooth upload are scaffolded but not yet connected.

**Codebase size**: ~9,100 lines across frontend (~4,800) and backend (~4,300).

## Feature Status

### Fully Implemented

| Feature | Frontend | Backend | Tests |
|---------|----------|---------|-------|
| Natural language parser | useParser hook | tokenizer + patterns + parser + codegen | test_parser.py |
| Fuzzy matching (typo tolerance) | — | fuzzy_match.py (Levenshtein ≤ 3) | test_parser.py |
| Python code generation | PythonPanel display | codegen.py | test_parser.py |
| Clarification system | ClarificationDialog | ParseResult.needs_clarification | test_parser.py |
| Error display | ErrorDisplay | ParseResult.error | test_parser.py |
| Autocomplete suggestions | Autocomplete component | — | — |
| Robot configuration (setup) | SetupSection | RobotConfig dataclass | — |
| Custom routines | RoutinesSection | Routine parsing in parser.py | — |
| Resizable editor panels | ResizeHandle + stores | — | — |
| 2D path preview | PreviewPanel + pathCalculator | — | — |
| Dark/light theme | themeStore + Tailwind dark: | — | — |
| User registration & login | — | auth.py + security.py | test_auth.py |
| JWT authentication | api.ts (token header) | python-jose | test_auth.py |
| User profile management | — | users.py | test_users.py |
| Team CRUD | — | teams.py + TeamMember model | test_teams.py |
| Team roles (owner/admin/member/viewer) | — | TeamRole enum | test_teams.py |
| Team invite codes | — | invite_code + join endpoint | test_teams.py |
| Program CRUD | — | programs.py + Program model | test_programs.py |
| Program sharing (per-user) | — | ProgramShare model | test_programs.py |
| Program forking | — | fork endpoint | test_programs.py |
| LLM fallback API | — | llm.py | — |
| CI/CD pipeline | — | .github/workflows/ci.yml | — |
| Linting (ESLint + Ruff) | Configured | Configured | CI |
| Formatting (Prettier + Ruff) | Configured | Configured | CI |
| AI agent harness | — | AGENTS.md, .claude/ | — |
| Pybricks firmware installer | FirmwareWizard, WebDFU | /api/v1/firmware proxy | Manual tested |

### Partially Implemented (Scaffolded)

| Feature | What Exists | What's Missing |
|---------|-------------|----------------|
| Web Bluetooth | useBluetooth hook, pybricks.ts stub | Actual BLE connection, program upload |
| Cloud persistence | api.ts client, Supabase dep | Frontend auth UI, login/register pages |
| Program list in sidebar | Sidebar component | Connected to backend (currently local only) |
| LLM parsing | llm.py endpoint, config for keys | Frontend trigger for needs_llm commands |

### Not Yet Started

| Feature | Description |
|---------|-------------|
| Login/register UI | Frontend pages for authentication |
| Cloud program sync | Save/load programs via backend API |
| Real-time collaboration | Multiple users editing simultaneously |
| Program export | Download as .py file |
| Program simulation | Step-through execution preview |
| Offline mode | IndexedDB queue for offline edits |
| Onboarding tutorial | First-time user walkthrough |
| Accessibility (a11y) | Screen reader support, keyboard nav |
| Mobile responsive | Tablet/phone layouts |

## Test Coverage

### Backend Tests (pytest)

| Module | File | What's Tested |
|--------|------|---------------|
| Auth | test_auth.py | Registration, login, duplicate prevention, validation |
| Parser | test_parser.py | Movement, turns, waits, motors, sensors, clarifications, edge cases |
| Programs | test_programs.py | CRUD, sharing, permissions, forking |
| Users | test_users.py | Profile read, update, settings |
| Teams | test_teams.py | CRUD, members, roles, invite codes |

Test database: SQLite in-memory (via aiosqlite).

### Frontend Tests (Vitest)

| Store | File | What's Tested |
|-------|------|---------------|
| editorStore | editorStore.test.ts | Program CRUD, command state, UI toggles |
| connectionStore | connectionStore.test.ts | Connection state management |

### CI Pipeline

GitHub Actions runs on every push and PR to `main`:
- **Frontend job**: ESLint lint → TypeScript type-check → Vitest tests
- **Backend job**: Ruff lint → Ruff format check → pytest tests

## Parser Command Coverage

Commands the rule-based parser handles (no LLM needed):

| Category | Commands | Status |
|----------|----------|--------|
| Movement | move forward/backward + distance | Done |
| Turns | turn left/right + angle | Done |
| Curves | curve + direction + distance + radius + angle | Done |
| Timed waits | wait + duration | Done |
| Sensor waits | wait until color/distance/force condition | Done |
| Motor control | run named_motor + angle or speed | Done |
| Line following | follow line for distance | Done |
| Loops | repeat N times | Done |
| Stop | stop / stop all motors | Done |
| Hub display | display icon_name | Done |
| Speaker | beep | Done |
| Routine calls | call routine_name | Done |

## Dependency Versions

### Frontend
| Package | Version |
|---------|---------|
| react | 19.2.0 |
| typescript | 5.9.3 |
| vite | 7.2.4 |
| zustand | 5.0.10 |
| tailwindcss | 4.1.18 |
| vitest | 4.0.18 |
| eslint | 9.39.1 |
| prettier | 3.8.1 |

### Backend
| Package | Version |
|---------|---------|
| fastapi | 0.109.0 |
| sqlalchemy | 2.0.25 |
| asyncpg | 0.29.0 |
| pydantic | 2.5.3 |
| python-jose | 3.3.0 |
| pytest | 7.4.4 |
| ruff | 0.4.0+ |
| httpx | 0.26.0 |

## What's Next (Suggested Priority)

1. **Frontend auth UI** — Login/register pages so users can authenticate
2. **Cloud program sync** — Connect Sidebar program list to backend API
3. **LLM frontend trigger** — Wire up `needs_llm` commands to `/llm/parse` endpoint
4. **Web Bluetooth program upload** — Implement BLE protocol for uploading programs to SPIKE Prime
5. **BLE firmware installer** — Support City/Technic/Move hubs via LWP3 bootloader
6. **Program export** — Download generated Python as `.py` file
7. **E2E tests** — Playwright tests for critical user journeys
