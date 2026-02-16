# Data Models

All models use SQLAlchemy 2.0 with UUID primary keys (string-based, 36 chars).

## Entity Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌──────────┐
│   User   │──1:N──│  TeamMember  │──N:1──│   Team   │
│          │       │              │       │          │
│ id       │       │ id           │       │ id       │
│ email    │       │ team_id (FK) │       │ name     │
│ username │       │ user_id (FK) │       │ description│
│ password │       │ role (enum)  │       │ settings │
│ settings │       │ joined_at    │       │ invite_code│
└────┬─────┘       └──────────────┘       └────┬─────┘
     │                                         │
     │ 1:N                                     │ 1:N
     ▼                                         ▼
┌──────────────┐                     ┌─────────────────┐
│   Program    │                     │  (Team Programs) │
│              │◀────────────────────┘                  │
│ id           │
│ name         │
│ owner_id (FK)│
│ team_id (FK) │  ← optional
│ setup_section│
│ main_section │
│ routines     │
│ generated_code│
│ is_public    │
│ share_code   │
│ version      │
│ parent_id(FK)│  ← for forks
└────┬─────────┘
     │ 1:N
     ▼
┌──────────────┐
│ ProgramShare │
│              │
│ id           │
│ program_id   │
│ user_id      │
│ permission   │  ← view/comment/edit
└──────────────┘
```

## Models

### User (`users` table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String(36) | PK, UUID | Unique identifier |
| email | String(255) | Unique, Indexed | Login email |
| username | String(100) | Unique, Indexed | Display name |
| hashed_password | String(255) | Not Null | bcrypt hash |
| full_name | String(255) | Nullable | Optional full name |
| avatar_url | Text | Nullable | Profile picture URL |
| is_active | Boolean | Default: True | Account status |
| is_superuser | Boolean | Default: False | Admin flag |
| settings | Text | Nullable | JSON: theme, defaults, preferences |
| created_at | DateTime(tz) | Auto | Account creation time |
| updated_at | DateTime(tz) | Auto | Last update time |

**Relationships**: `programs` (1:N), `team_memberships` (1:N via TeamMember)

### Team (`teams` table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String(36) | PK, UUID | Unique identifier |
| name | String(255) | Not Null | Team name |
| description | Text | Nullable | Team description |
| avatar_url | Text | Nullable | Team avatar URL |
| settings | Text | Nullable | JSON: robot defaults |
| invite_code | String(20) | Unique, Indexed | Join code |
| invite_enabled | Boolean | Default: True | Whether invites work |
| created_at | DateTime(tz) | Auto | Creation time |
| updated_at | DateTime(tz) | Auto | Last update time |

**Relationships**: `members` (1:N via TeamMember), `programs` (1:N)

### TeamMember (`team_members` table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String(36) | PK, UUID | Unique identifier |
| team_id | String(36) | FK → teams.id, CASCADE | Team reference |
| user_id | String(36) | FK → users.id, CASCADE | User reference |
| role | Enum(TeamRole) | Default: MEMBER | Permission level |
| joined_at | DateTime(tz) | Auto | Join time |

### Program (`programs` table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String(36) | PK, UUID | Unique identifier |
| name | String(255) | Not Null | Program name |
| description | Text | Nullable | Program description |
| owner_id | String(36) | FK → users.id, CASCADE | Creator |
| team_id | String(36) | FK → teams.id, SET NULL | Optional team |
| setup_section | Text | Nullable | JSON: robot config |
| main_section | Text | Nullable | Natural language commands |
| routines | Text | Nullable | JSON: [{name, params, body}] |
| generated_code | Text | Nullable | Generated Python code |
| defaults | Text | Nullable | JSON: speed, turnRate, etc. |
| is_public | Boolean | Default: False | Public link sharing |
| share_code | String(20) | Unique, Indexed | Share URL token |
| version | Integer | Default: 1 | Version counter |
| parent_id | String(36) | FK → programs.id, SET NULL | Fork parent |
| created_at | DateTime(tz) | Auto | Creation time |
| updated_at | DateTime(tz) | Auto | Last update time |

**Relationships**: `owner` (N:1 User), `team` (N:1 Team), `shares` (1:N ProgramShare), `parent`/`forks` (self-referential)

### ProgramShare (`program_shares` table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String(36) | PK, UUID | Unique identifier |
| program_id | String(36) | FK → programs.id, CASCADE | Shared program |
| user_id | String(36) | FK → users.id, CASCADE | Recipient |
| permission | Enum(SharePermission) | Default: VIEW | Access level |
| created_at | DateTime(tz) | Auto | Share time |

## Enums

### TeamRole
```python
class TeamRole(str, Enum):
    OWNER = "owner"    # Full control, can delete team
    ADMIN = "admin"    # Can manage members and settings
    MEMBER = "member"  # Can create/edit programs
    VIEWER = "viewer"  # Read-only access
```

### SharePermission
```python
class SharePermission(str, Enum):
    VIEW = "view"       # Can view and copy
    COMMENT = "comment" # Can view and comment
    EDIT = "edit"       # Can edit
```
