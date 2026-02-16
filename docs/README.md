# DragonBricks Documentation

Knowledge base for the DragonBricks project — a natural language to Pybricks Python converter for LEGO SPIKE Prime robots, designed for FLL teams.

## Architecture

| Document | Description |
|----------|-------------|
| [System Overview](architecture/system-overview.md) | High-level architecture, data flow, tech stack |
| [Frontend](architecture/frontend.md) | React component tree, stores, hooks, libraries |
| [Backend](architecture/backend.md) | FastAPI routes, models, services, middleware |
| [Parser](architecture/parser.md) | NLP pipeline: tokenizer, patterns, parser, codegen |

## Design

| Document | Description |
|----------|-------------|
| [Data Models](design/data-models.md) | Database schema, relationships, enums |
| [API](design/api.md) | REST endpoints, request/response schemas, auth |
| [UI](design/ui.md) | Layout, panels, component responsibilities |

## Progress

| Document | Description |
|----------|-------------|
| [Implementation Status](progress/status.md) | Feature-by-feature status, test coverage, what's next |

## Plans (Historical)

Original design and implementation plans from project inception:

| Document | Description |
|----------|-------------|
| [Design Doc](plans/2026-01-31-dragonbricks-design.md) | Original feature spec, UI mockups, NLP design |
| [Implementation Plan](plans/2026-01-31-dragonbricks-implementation.md) | Phased build plan with code scaffolding |
| [Backend Parser Design](plans/2026-01-31-backend-parser-design.md) | Parser migration from frontend to backend |
| [Single-User Experience](plans/2026-01-31-complete-single-user-experience.md) | Completing the core editing flow |
| [Harness Engineering](plans/2026-02-15-harness-engineering-design.md) | AI agent harness setup and configuration |

## Quick Reference

```
dragonbricks/
├── frontend/          → React 19 + TypeScript 5.9 + Vite 7.2 + Tailwind 4.1
├── backend/           → FastAPI 0.109 + SQLAlchemy 2.0 + PostgreSQL (asyncpg)
├── docs/              → This documentation
├── .claude/           → AI agent configuration (agents, rules, hooks)
├── .github/           → CI/CD workflows
├── CLAUDE.md          → Project instructions for Claude Code
└── AGENTS.md          → Agent harness entry point
```
