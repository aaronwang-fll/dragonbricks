# Harness Engineering Setup — Design Document

**Date:** 2026-02-15
**Status:** Implemented

## Overview

Set up an AI agent harness for DragonBricks so that Claude Code (and other AI agents) can autonomously develop features, fix bugs, and maintain the codebase with minimal human supervision. Based on practices from [OpenAI's harness engineering](https://openai.com/index/harness-engineering/), [everything-claude-code](https://github.com/affaan-m/everything-claude-code), and [Anthropic's effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents).

## What Was Implemented

### Layer 1: Agent Foundation
- **AGENTS.md** — Master file telling agents how to work in this repo (session startup, workflow, conventions)
- **6 sub-agents** in `.claude/agents/`:
  - `planner.md` — Feature planning and architecture
  - `code-reviewer.md` — Code quality and security review
  - `tdd-guide.md` — Test-driven development guidance
  - `e2e-runner.md` — End-to-end testing with Playwright
  - `python-reviewer.md` — Python/FastAPI-specific review
  - `build-fixer.md` — Build error diagnosis and resolution
- **4 rule files** in `.claude/rules/`:
  - `coding-style.md` — Immutability, file organization, error handling
  - `git-workflow.md` — Conventional commits, PR process, feature dev flow
  - `testing.md` — TDD workflow, test types, failure resolution
  - `security.md` — Input validation, secret management, vulnerability response

### Layer 2: Self-Verification Infrastructure
- **GitHub Actions CI** (`.github/workflows/ci.yml`):
  - Frontend job: lint + type-check + test
  - Backend job: lint + format-check + test
- **Prettier** for frontend (`.prettierrc`, `.prettierignore`)
- **Ruff** for backend (`ruff.toml`, added to `requirements.txt`)

### Layer 3: Session Management
- **Claude Code hooks** (`.claude/settings.json`):
  - PreToolUse: Block random .md/.txt file creation
  - PostToolUse: Auto-format TypeScript/React files with Prettier after edits
- **Progress tracking**: `claude-progress.txt` pattern documented in AGENTS.md

### Layer 4: MCP Integrations
- **Playwright MCP** — Already installed, agents can visually verify UI
- **GitHub plugin** — Already installed for PR/issue management

## Architecture Decision: Why Not everything-claude-code Plugin

The `everything-claude-code` third-party plugin requires manual CLI installation (`/plugin marketplace add` + `/plugin install`) which can't be done from within a session. The user already has the official Anthropic plugins (superpowers, playwright, code-review, commit-commands) which provide overlapping functionality. The custom agents and rules created here are tailored to DragonBricks specifically, which is more valuable than generic rules.

## How to Use

### Starting a coding session
```
# Claude will automatically:
1. Read AGENTS.md + CLAUDE.md
2. Check git status and recent commits
3. Focus on one feature per session
```

### Adding a new feature
```
# Use the planner agent:
/task planner "Design the new feature"

# Then TDD:
/task tdd-guide "Implement the feature with tests first"

# Then review:
/task code-reviewer "Review the changes"
```

### After making changes
```
# Agents will:
1. Run lint + tests
2. Format code automatically
3. Commit with conventional message
4. Update claude-progress.txt
```

## Manual Steps Required

The user needs to run these commands outside of Claude Code to install the third-party plugin:

```bash
# Optional: Install everything-claude-code for additional commands
claude plugin marketplace add affaan-m/everything-claude-code
claude plugin install everything-claude-code@everything-claude-code
./install.sh typescript python  # Install rules (from cloned repo)
```
