import type { Program } from '../../types';

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';
const GITHUB_REDIRECT_URI = `${window.location.origin}/auth/github/callback`;

// Auto-sync interval (30 minutes)
const AUTO_SYNC_INTERVAL_MS = 30 * 60 * 1000;

export interface GitHubConfig {
  accessToken: string;
  owner: string;
  repo: string;
  branch: string;
  basePath: string;
}

export interface GitHubFile {
  path: string;
  content: string;
  sha?: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  commitUrl?: string;
}

/**
 * GitHub client for program synchronization
 */
export class GitHubClient {
  private config: GitHubConfig;
  private baseUrl = 'https://api.github.com';

  constructor(config: GitHubConfig) {
    this.config = config;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get file from repository
   */
  async getFile(path: string): Promise<GitHubFile | null> {
    const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}?ref=${this.config.branch}`;

    try {
      const response = await fetch(url, { headers: this.headers });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const content = atob(data.content);

      return {
        path: data.path,
        content,
        sha: data.sha,
      };
    } catch (error) {
      console.error('Failed to get file:', error);
      return null;
    }
  }

  /**
   * Create or update a file in the repository
   */
  async putFile(
    path: string,
    content: string,
    message: string,
    sha?: string
  ): Promise<SyncResult> {
    const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;

    const body: Record<string, unknown> = {
      message,
      content: btoa(content),
      branch: this.config.branch,
    };

    if (sha) {
      body.sha = sha;
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update file');
      }

      const data = await response.json();

      return {
        success: true,
        message: 'File updated successfully',
        commitUrl: data.commit?.html_url,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a file from the repository
   */
  async deleteFile(path: string, sha: string, message: string): Promise<SyncResult> {
    const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.headers,
        body: JSON.stringify({
          message,
          sha,
          branch: this.config.branch,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete file');
      }

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(path: string): Promise<string[]> {
    const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}?ref=${this.config.branch}`;

    try {
      const response = await fetch(url, { headers: this.headers });

      if (response.status === 404) {
        return [];
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        return [];
      }

      return data
        .filter((item: { type: string }) => item.type === 'file')
        .map((item: { path: string }) => item.path);
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }

  /**
   * Sync a program to GitHub
   */
  async syncProgram(program: Program): Promise<SyncResult> {
    const fileName = `${program.name.replace(/[^a-z0-9]/gi, '_')}_${program.id}.json`;
    const path = `${this.config.basePath}/${fileName}`;

    // Get existing file to get SHA
    const existing = await this.getFile(path);

    const content = JSON.stringify(
      {
        id: program.id,
        name: program.name,
        setupSection: program.setupSection,
        mainSection: program.mainSection,
        routines: program.routines,
        profileId: program.profileId,
        updatedAt: program.updatedAt.toISOString(),
      },
      null,
      2
    );

    return this.putFile(
      path,
      content,
      `Update program: ${program.name}`,
      existing?.sha
    );
  }

  /**
   * Load programs from GitHub
   */
  async loadPrograms(): Promise<Program[]> {
    const files = await this.listFiles(this.config.basePath);
    const programs: Program[] = [];

    for (const filePath of files) {
      if (!filePath.endsWith('.json')) continue;

      const file = await this.getFile(filePath);
      if (!file) continue;

      try {
        const data = JSON.parse(file.content);
        programs.push({
          id: data.id,
          name: data.name,
          setupSection: data.setupSection || '',
          mainSection: data.mainSection || '',
          routines: data.routines || [],
          profileId: data.profileId || null,
          createdAt: new Date(data.createdAt || data.updatedAt),
          updatedAt: new Date(data.updatedAt),
        });
      } catch (error) {
        console.error(`Failed to parse program file: ${filePath}`, error);
      }
    }

    return programs;
  }
}

// ============ OAuth Helpers ============

/**
 * Start GitHub OAuth flow
 */
export function startGitHubAuth(): void {
  const state = generateState();
  sessionStorage.setItem('github_oauth_state', state);

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: 'repo',
    state,
  });

  window.location.href = `https://github.com/login/oauth/authorize?${params}`;
}

/**
 * Generate random state for OAuth
 */
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate OAuth callback state
 */
export function validateOAuthState(state: string): boolean {
  const savedState = sessionStorage.getItem('github_oauth_state');
  sessionStorage.removeItem('github_oauth_state');
  return state === savedState;
}

/**
 * Exchange OAuth code for access token
 * Note: This should be done server-side to protect the client secret
 */
export async function exchangeCodeForToken(_code: string): Promise<string | null> {
  // In production, this would be a call to your backend
  // which would then call GitHub's token endpoint with the client secret
  // The _code parameter would be sent to the server

  // For now, we'll return null and expect the token to be provided
  // through environment variables or manual configuration
  console.warn('Token exchange should be done server-side');
  return null;
}

// ============ Storage Helpers ============

const GITHUB_CONFIG_KEY = 'dragonbricks_github_config';

/**
 * Save GitHub configuration
 */
export function saveGitHubConfig(config: GitHubConfig): void {
  localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
}

/**
 * Load GitHub configuration
 */
export function loadGitHubConfig(): GitHubConfig | null {
  const saved = localStorage.getItem(GITHUB_CONFIG_KEY);
  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

/**
 * Clear GitHub configuration
 */
export function clearGitHubConfig(): void {
  localStorage.removeItem(GITHUB_CONFIG_KEY);
}

/**
 * Check if GitHub is configured
 */
export function isGitHubConfigured(): boolean {
  const config = loadGitHubConfig();
  return Boolean(config?.accessToken && config?.owner && config?.repo);
}

// Export auto-sync interval for use in hooks
export { AUTO_SYNC_INTERVAL_MS };
