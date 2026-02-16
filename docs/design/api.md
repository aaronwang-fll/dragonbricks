# API Design

Base URL: `/api/v1`

## Authentication

JWT Bearer token authentication. Include in requests as:
```
Authorization: Bearer <token>
```

Tokens are HS256-signed, valid for 7 days.

## Endpoints

### Auth (`/auth`)

#### POST /auth/register
Create a new user account.

**Request:**
```json
{
  "email": "student@school.edu",
  "username": "team42",
  "password": "securepass",
  "full_name": "Alex Chen"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "email": "student@school.edu",
  "username": "team42",
  "full_name": "Alex Chen",
  "is_active": true
}
```

#### POST /auth/login
Authenticate and receive a JWT token.

**Request:** `application/x-www-form-urlencoded`
```
username=student@school.edu&password=securepass
```

**Response (200):**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

### Users (`/users`)

All endpoints require authentication.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Get current user profile |
| PATCH | `/users/me` | Update profile or settings |
| GET | `/users/{id}` | Get public user info |

### Teams (`/teams`)

All endpoints require authentication.

| Method | Path | Role Required | Description |
|--------|------|---------------|-------------|
| POST | `/teams` | — | Create team (creator = owner) |
| GET | `/teams` | — | List user's teams |
| GET | `/teams/{id}` | member+ | Team details + members |
| PATCH | `/teams/{id}` | admin+ | Update team name/settings |
| DELETE | `/teams/{id}` | owner | Delete team |
| POST | `/teams/{id}/members` | admin+ | Add member by user ID |
| POST | `/teams/{id}/join` | — | Join via invite code |
| DELETE | `/teams/{id}/members/{uid}` | admin+ or self | Remove member |

### Programs (`/programs`)

All endpoints require authentication.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/programs` | Create new program |
| GET | `/programs` | List user's programs |
| GET | `/programs/{id}` | Get program (owner, shared, or public) |
| PATCH | `/programs/{id}` | Update program content |
| DELETE | `/programs/{id}` | Delete program (owner only) |
| POST | `/programs/{id}/shares` | Share with specific user |
| GET | `/programs/{id}/shares` | List shares for program |
| POST | `/programs/{id}/fork` | Fork program (creates copy) |

#### Program Create/Update Schema
```json
{
  "name": "Mission 1",
  "description": "First mission run",
  "team_id": "uuid or null",
  "setup_section": "{...json...}",
  "main_section": "move forward 200mm\nturn right 90",
  "routines": "[{\"name\": \"grab\", \"parameters\": [], \"body\": \"...\"}]",
  "generated_code": "# Python code...",
  "defaults": "{\"speed\": 200, ...}",
  "is_public": false
}
```

### Parser (`/parser`)

#### POST /parser/parse
Parse natural language commands to Python code.

**Request:**
```json
{
  "lines": ["move forward 200mm", "turn right 90 degrees", "wait 1 second"],
  "config": {
    "left_motor_port": "A",
    "right_motor_port": "B",
    "wheel_diameter": 56,
    "axle_track": 112,
    "speed": 200,
    "acceleration": 700,
    "turn_rate": 150,
    "turn_acceleration": 300,
    "motor_speed": 200
  },
  "routines": []
}
```

**Response (200):**
```json
{
  "results": [
    {
      "original": "move forward 200mm",
      "python_code": "drive.straight(200)",
      "status": "parsed",
      "confidence": 0.95,
      "command_type": "movement"
    },
    {
      "original": "turn right 90 degrees",
      "python_code": "drive.turn(90)",
      "status": "parsed",
      "confidence": 0.95,
      "command_type": "turn"
    },
    {
      "original": "wait 1 second",
      "python_code": "wait(1000)",
      "status": "parsed",
      "confidence": 0.90,
      "command_type": "wait"
    }
  ],
  "generated_code": "from pybricks.hubs import PrimeHub\n..."
}
```

**Possible `status` values:**
- `parsed` — Successfully converted to Python
- `needs_clarification` — Missing required parameter (includes `clarification` object)
- `needs_llm` — No pattern match, needs Cloud AI
- `error` — Parsing failed

#### POST /parser/validate
Validate commands without generating the full program.

### LLM (`/llm`)

#### POST /llm/parse
Cloud AI fallback for commands the rule-based parser cannot handle.

**Request:**
```json
{
  "command": "make the robot dance in a zigzag pattern",
  "config": { "..." : "..." },
  "provider": "openai"
}
```

**Response (200):**
```json
{
  "python_code": "for i in range(4):\n    drive.straight(100)\n    drive.turn(45)\n    ...",
  "explanation": "Zigzag pattern using alternating turns",
  "confidence": 0.7
}
```

## Error Responses

All errors follow this format:
```json
{
  "detail": "Human-readable error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (validation error) |
| 401 | Not authenticated |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email/username) |
| 422 | Validation error (Pydantic) |
| 429 | Rate limited |
| 500 | Internal server error |
