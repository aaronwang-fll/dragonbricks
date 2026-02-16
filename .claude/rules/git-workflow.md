# Git Workflow Rules

## Commit Messages
Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `perf:`, `ci:`

Format:
```
type: concise description

Optional body with more detail.
```

## Before Committing
1. Run `npm run lint` in frontend
2. Run `ruff check .` in backend
3. Run `npm run test:run` in frontend
4. Run `python -m pytest` in backend
5. Review `git diff --staged` to verify changes

## Pull Request Process
1. Analyze full commit history (not just latest commit)
2. Write a clear PR title (< 70 characters)
3. Include a summary and test plan in the PR body
4. Push with `-u` flag for new branches

## Feature Development Flow
1. Plan: Use planner agent to map dependencies and risks
2. Test first: Write failing tests (TDD red phase)
3. Implement: Minimal code to pass tests (TDD green phase)
4. Review: Use code-reviewer agent to check quality
5. Commit: Conventional format with clear message
