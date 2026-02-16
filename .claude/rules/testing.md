# Testing Rules

## Required Test Types
- **Unit tests**: Individual functions and components
- **Integration tests**: API endpoints, database operations
- **E2E tests**: Critical user journeys via Playwright

## TDD Workflow (Mandatory for New Features)
1. Write tests first (RED) — they should fail
2. Verify tests fail
3. Implement minimal code (GREEN) — make tests pass
4. Confirm tests pass
5. Refactor while keeping tests green

## When Tests Fail
- Read the assertion error carefully
- Check test isolation (no shared state between tests)
- Validate mock configurations
- Fix the implementation, NOT the tests (unless the test is wrong)
- Use the tdd-guide agent for help

## Test Commands
```bash
# Frontend
cd frontend && npm run test:run

# Backend
cd backend && python -m pytest -v

# Single frontend test
cd frontend && npx vitest run src/path/to/test.ts

# Single backend test
cd backend && python -m pytest tests/test_specific.py -v
```
