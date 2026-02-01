# DragonBricks

Natural language to Pybricks Python code converter for LEGO SPIKE Prime robots. Designed for FLL (FIRST LEGO League) teams.

## Project Structure

```
dragonbricks/
├── frontend/                 # Frontend (React + TypeScript + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/       # Header, Sidebar, StatusBar
│   │   │   ├── editor/       # EditorPanel, MainSection, SetupSection, RoutinesSection
│   │   │   ├── preview/      # PreviewPanel (path visualization)
│   │   │   ├── settings/     # SettingsPage
│   │   │   └── shared/       # ResizeHandle
│   │   ├── stores/           # Zustand state management
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities
│   │   │   ├── parser/       # Natural language parser
│   │   │   ├── codegen/      # Python code generation
│   │   │   ├── bluetooth/    # Web Bluetooth for SPIKE Prime
│   │   │   ├── preview/      # Path calculation
│   │   │   └── api.ts        # Backend API client
│   │   └── types/            # TypeScript definitions
│   ├── package.json
│   └── vite.config.ts
├── backend/                  # Backend (Python + FastAPI)
│   ├── app/
│   │   ├── api/              # REST endpoints
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic validation
│   │   ├── core/             # Config, DB, security
│   │   └── main.py           # FastAPI entry point
│   ├── tests/                # pytest tests
│   └── requirements.txt
└── docs/                     # Documentation
```

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite for build/dev
- Zustand for state management
- Tailwind CSS for styling
- Web Bluetooth API for SPIKE Prime connection

**Backend:**
- FastAPI (async Python)
- SQLAlchemy + asyncpg (PostgreSQL)
- JWT authentication
- Supabase for hosted database

## Key Features

1. **Natural Language Parser** - Converts plain English to Pybricks Python
2. **Real-time Code Preview** - See Python code as you type
3. **Path Visualization** - 2D preview of robot movement
4. **Bluetooth Upload** - Direct program upload to SPIKE Prime
5. **Team Collaboration** - Share programs with teams
6. **LLM Fallback** - OpenAI/Anthropic for complex commands

## Development Commands

```bash
# Frontend
cd frontend
npm install
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run test         # Run Vitest tests

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Both services
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Environment Variables

**Backend (.env):**
```
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/db
SECRET_KEY=your-secret-key
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register` | POST | Register user |
| `/api/v1/auth/login` | POST | Login |
| `/api/v1/users/me` | GET/PATCH | User profile |
| `/api/v1/teams` | GET/POST | Team management |
| `/api/v1/programs` | GET/POST | Program CRUD |
| `/api/v1/programs/{id}/shares` | GET/POST | Sharing |
| `/api/v1/llm/parse` | POST | LLM code generation |

## Database Models

- **User**: Authentication, profile, settings
- **Team**: Team with members (roles: owner/admin/member/viewer)
- **Program**: Code storage with versioning, sharing, forking
- **ProgramShare**: Direct user sharing with permissions

## Parser Supported Commands

**Movement:**
- `move forward 200mm` → `drive.straight(200)`
- `turn right 90 degrees` → `drive.turn(90)`
- `curve left 500mm radius 90 degrees`

**Timing:**
- `wait 1 second` → `wait(1000)`
- `wait until color is red`

**Motors:**
- `run grabber 180 degrees`
- `run arm motor at speed 200`

**Sensors:**
- `wait until distance < 100mm`
- `follow line for 500mm`

**Control:**
- `repeat 3 times`
- `stop all motors`

## Code Style

- TypeScript strict mode
- Functional React components
- Zustand for state (no Redux)
- Tailwind for styling (no CSS modules)
- async/await (no callbacks)
- Python 3.9+ compatible (use Optional[], List[] not X | None)

## Testing

```bash
# Frontend tests
cd frontend
npm run test

# Backend tests
cd backend
pytest
```

## Known Limitations

- Web Bluetooth requires Chrome/Edge (no Firefox/Safari)
- LLM parsing requires API keys
- Offline mode stores locally only (no sync without backend)
