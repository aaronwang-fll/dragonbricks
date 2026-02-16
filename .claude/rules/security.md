# Security Rules

## Before Every Commit
- [ ] All user input validated
- [ ] SQL injection prevented (use parameterized queries / SQLAlchemy)
- [ ] XSS mitigated (sanitize HTML output)
- [ ] No hardcoded credentials or API keys
- [ ] Error messages don't leak internal details
- [ ] Authentication checked on protected endpoints

## Secret Management
- Use environment variables or secret managers
- Never embed secrets in code
- Validate required secrets at startup
- Rotate any exposed credentials immediately

## When a Vulnerability is Found
1. Stop current work
2. Use security-reviewer agent to assess severity
3. Fix critical issues immediately
4. Rotate compromised secrets
5. Audit codebase for similar vulnerabilities
