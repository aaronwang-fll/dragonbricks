# AGENTS.md — DragonBricks Agent Harness

This file tells AI coding agents how to work in this repository.
Inspired by [OpenAI's harness engineering](https://openai.com/index/harness-engineering/) and [Anthropic's effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents).

## Repository Overview

DragonBricks converts natural language to Pybricks Python for LEGO SPIKE Prime robots. It is a full-stack app:
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS (port 5173)
- **Backend**: Python FastAPI + SQLAlchemy + PostgreSQL (port 8000)

## Session Startup Sequence

Every coding session MUST begin with:

1. Run `pwd` to confirm you're in the project root
2. Review `git log --oneline -10` and `git status` for context
3. Read `AGENTS.md` (this file) and `CLAUDE.md` for project rules
4. If `claude-progress.txt` exists, read it for previous session context
5. Run `./start.sh` to launch dev servers if you need them
6. Run tests before making changes: `cd frontend && npm run test:run && cd ../backend && python -m pytest`

## One Feature Per Session

Focus on a single feature, bugfix, or refactoring task per session. This prevents context exhaustion and incomplete work. If a feature is too large, break it into smaller PRs.

## Development Workflow

### Before Writing Code
1. Read related source files first — never propose changes to code you haven't read
2. Check existing tests to understand expected behavior
3. For new features, write tests first (TDD: Red -> Green -> Refactor)

### While Writing Code
1. Follow the project's existing patterns (see CLAUDE.md for conventions)
2. Keep functions under 50 lines, files under 800 lines
3. Handle errors explicitly — never silently swallow exceptions
4. Validate inputs at system boundaries (API endpoints, user input)
5. Never hardcode secrets, API keys, or credentials

### After Writing Code
1. Run the full test suite and ensure it passes
2. Run linters: `cd frontend && npm run lint` and `cd backend && python3 -m ruff check .`
3. Format code: `cd frontend && npx prettier --write .` and `cd backend && python3 -m ruff format .`
4. Commit with conventional commit messages: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
5. Write a progress update to `claude-progress.txt`

## Test Requirements

- Frontend: Vitest + React Testing Library — `cd frontend && npm run test:run`
- Backend: pytest + pytest-asyncio — `cd backend && python -m pytest`
- All new features must include tests
- Fix tests by changing implementation, not by weakening tests

## File Structure Rules

```
frontend/src/components/     → React components (by feature)
frontend/src/stores/         → Zustand state management
frontend/src/hooks/          → Custom React hooks
frontend/src/lib/            → Utilities (parser, codegen, bluetooth, preview, api)
frontend/src/types/          → TypeScript type definitions
backend/app/api/             → FastAPI route handlers
backend/app/models/          → SQLAlchemy ORM models
backend/app/schemas/         → Pydantic request/response schemas
backend/app/services/        → Business logic (parser, codegen)
backend/app/core/            → Config, database, security
backend/tests/               → pytest test files
```

## Code Style

- **TypeScript**: Strict mode, functional components, Zustand for state, Tailwind for CSS
- **Python**: 3.9+ compatible, use `Optional[]` and `List[]` (not `X | None`), async/await
- **Both**: No callbacks, prefer async/await. No over-engineering.

## Available Sub-Agents

Specialized agents are in `.claude/agents/`:
- `planner.md` — Architecture and feature planning
- `code-reviewer.md` — Code quality and security review
- `tdd-guide.md` — Test-driven development guidance
- `e2e-runner.md` — End-to-end test execution with Playwright
- `python-reviewer.md` — Python-specific code review
- `build-fixer.md` — Build error diagnosis and resolution

## CI/CD

GitHub Actions run on every push and PR:
- Frontend: lint + type-check + test
- Backend: lint + test
- See `.github/workflows/ci.yml`

## Progress Tracking

After each session, append to `claude-progress.txt`:
```
## YYYY-MM-DD Session
- What was done
- What's left
- Any blockers or decisions made
```
