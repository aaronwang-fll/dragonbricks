# Coding Style Rules

These rules are always active for AI agents working in this repository.

## Immutability
- Create new objects rather than mutating existing ones
- Use spread operators in TypeScript, new dicts/lists in Python
- Immutable data prevents hidden side effects and makes debugging easier

## File Organization
- Keep files 200-400 lines. Maximum 800 lines.
- Keep functions under 50 lines
- Maximum nesting depth: 4 levels
- Structure by feature/domain, not by type

## Error Handling
- Handle errors explicitly at every level
- User-friendly messages in UI code
- Detailed context in server-side logs
- Never silently ignore errors (no empty catch blocks)

## Input Validation
- Validate all user input before processing
- Use Pydantic schemas for API input validation
- Use TypeScript types for compile-time safety
- Never trust external data (API responses, user input, file content)

## Quality Checklist (Before Every Commit)
- [ ] Code is readable with descriptive names
- [ ] Functions < 50 lines
- [ ] Files < 800 lines
- [ ] Nesting < 4 levels
- [ ] Errors handled explicitly
- [ ] No hardcoded secrets or API keys
- [ ] No console.log/print debug statements
- [ ] Tests written for new functionality
