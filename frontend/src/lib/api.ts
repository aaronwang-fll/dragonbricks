/**
 * API Client for DragonBricks backend
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

interface ApiError {
  detail: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof localStorage !== 'undefined') {
      if (token && typeof localStorage.setItem === 'function') {
        localStorage.setItem('auth_token', token);
      } else if (!token && typeof localStorage.removeItem === 'function') {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.detail);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Auth endpoints
  async register(email: string, username: string, password: string, fullName?: string) {
    const data = await this.request<{
      access_token: string;
      user: User;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password, full_name: fullName }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{
      access_token: string;
      user: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  logout() {
    this.setToken(null);
  }

  // User endpoints
  async getCurrentUser() {
    return this.request<User>('/users/me');
  }

  async updateProfile(data: Partial<User>) {
    return this.request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Team endpoints
  async listTeams() {
    return this.request<Team[]>('/teams');
  }

  async createTeam(name: string, description?: string) {
    return this.request<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async getTeam(teamId: string) {
    return this.request<Team>(`/teams/${teamId}`);
  }

  async joinTeam(teamId: string, inviteCode: string) {
    return this.request<Team>(`/teams/${teamId}/join`, {
      method: 'POST',
      body: JSON.stringify({ invite_code: inviteCode }),
    });
  }

  async leaveTeam(teamId: string) {
    return this.request<void>(`/teams/${teamId}/leave`, {
      method: 'POST',
    });
  }

  // Program endpoints
  async listPrograms(teamId?: string) {
    const query = teamId ? `?team_id=${teamId}` : '';
    return this.request<ProgramListItem[]>(`/programs${query}`);
  }

  async createProgram(data: ProgramCreate) {
    return this.request<Program>('/programs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProgram(programId: string) {
    return this.request<Program>(`/programs/${programId}`);
  }

  async getProgramByShareCode(shareCode: string) {
    return this.request<Program>(`/programs/shared/${shareCode}`);
  }

  async updateProgram(programId: string, data: Partial<Program>) {
    return this.request<Program>(`/programs/${programId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProgram(programId: string) {
    return this.request<void>(`/programs/${programId}`, {
      method: 'DELETE',
    });
  }

  async forkProgram(programId: string, name?: string) {
    return this.request<Program>(`/programs/${programId}/fork`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  // Sharing
  async shareProgram(
    programId: string,
    userEmail: string,
    permission: 'view' | 'comment' | 'edit' = 'view',
  ) {
    return this.request<ProgramShare>(`/programs/${programId}/shares`, {
      method: 'POST',
      body: JSON.stringify({ user_email: userEmail, permission }),
    });
  }

  async listProgramShares(programId: string) {
    return this.request<ProgramShare[]>(`/programs/${programId}/shares`);
  }

  async removeShare(programId: string, shareId: string) {
    return this.request<void>(`/programs/${programId}/shares/${shareId}`, {
      method: 'DELETE',
    });
  }

  // Parser endpoints
  async parseCommands(commands: string[], config: RobotConfig, routines: RoutineInput[] = []) {
    return this.request<ParseResponse>('/parser/parse', {
      method: 'POST',
      body: JSON.stringify({ commands, config, routines }),
    });
  }

  async getAutocompleteSuggestions(text: string, cursorPosition: number) {
    return this.request<AutocompleteResponse>('/parser/autocomplete', {
      method: 'POST',
      body: JSON.stringify({ text, cursor_position: cursorPosition }),
    });
  }

  async validateCommand(command: string) {
    return this.request<ValidateResponse>('/parser/validate', {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
  }

  // LLM parsing endpoint (auth required)
  async llmParse(command: string, context?: LlmParseRequest['context']) {
    return this.request<LlmParseResponse>('/llm/parse', {
      method: 'POST',
      body: JSON.stringify({ command, context }),
    });
  }
}

// Types
export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  invite_code?: string;
  invite_enabled: boolean;
  created_at: string;
  member_count: number;
  members: TeamMember[];
}

export interface TeamMember {
  id: string;
  user_id: string;
  username: string;
  email: string;
  full_name?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
}

export interface Program {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  owner?: {
    id: string;
    username: string;
    full_name?: string;
  };
  team_id?: string;
  setup_section?: Record<string, unknown>;
  main_section?: string;
  routines?: Routine[];
  defaults?: Defaults;
  generated_code?: string;
  is_public: boolean;
  share_code?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ProgramListItem {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  owner_username?: string;
  team_id?: string;
  is_public: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ProgramCreate {
  name: string;
  description?: string;
  team_id?: string;
  setup_section?: Record<string, unknown>;
  main_section?: string;
  routines?: Routine[];
  defaults?: Defaults;
}

export interface ProgramShare {
  id: string;
  program_id: string;
  user_id: string;
  user_email: string;
  user_username: string;
  permission: 'view' | 'comment' | 'edit';
  created_at: string;
}

export interface Routine {
  id: string;
  name: string;
  parameters: string[];
  body: string;
}

export interface Defaults {
  speed: number;
  acceleration: number;
  turnRate: number;
  turnAcceleration: number;
  wheelDiameter: number;
  axleTrack: number;
  motorSpeed: number;
  lineThreshold: number;
  leftMotorPort: string;
  rightMotorPort: string;
  attachment1Port: string;
  attachment2Port: string;
  colorSensorPort: string;
  ultrasonicPort: string;
  forcePort: string;
}

// Parser types
export interface RobotConfig {
  left_motor_port: string;
  right_motor_port: string;
  wheel_diameter: number;
  axle_track: number;
  speed: number;
  acceleration: number;
  turn_rate: number;
  turn_acceleration: number;
  motor_speed: number;
  attachment1_port?: string;
  attachment2_port?: string;
  color_sensor_port?: string;
  ultrasonic_port?: string;
  force_port?: string;
}

export interface RoutineInput {
  name: string;
  parameters: string[];
  body: string;
}

export interface ClarificationRequest {
  field: string;
  message: string;
  type: 'distance' | 'angle' | 'duration';
}

export interface ParsedCommand {
  original: string;
  python_code?: string;
  status: 'parsed' | 'error' | 'needs_clarification' | 'needs_llm';
  error?: string;
  clarification?: ClarificationRequest;
  command_type?: string;
  confidence: number;
}

export interface ParseResponse {
  results: ParsedCommand[];
  generated_code: string;
  imports: string;
  setup: string;
}

export interface Suggestion {
  text: string;
  label: string;
  category: string;
}

export interface AutocompleteResponse {
  suggestions: Suggestion[];
}

export interface ValidateResponse {
  valid: boolean;
  error?: string;
  needs_clarification?: ClarificationRequest;
}

// LLM parsing types
export interface LlmParseRequest {
  command: string;
  context?: {
    config?: RobotConfig;
    routines?: RoutineInput[];
    previous_commands?: string[];
  };
}

export interface LlmParseResponse {
  success: boolean;
  python_code?: string;
  error?: string;
  command_type?: string;
  confidence?: number;
}

// Export singleton instance
export const api = new ApiClient();
