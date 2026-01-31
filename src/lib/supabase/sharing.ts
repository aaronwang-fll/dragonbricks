import { getSupabaseClient, type TeamRow, type TeamMemberRow, type EditLockRow } from './client';

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  email?: string;
  name?: string;
}

export interface EditLock {
  id: string;
  programId: string;
  userId: string;
  lockedAt: Date;
  expiresAt: Date;
  userName?: string;
}

// Lock duration in milliseconds (5 minutes)
const LOCK_DURATION_MS = 5 * 60 * 1000;
// Lock refresh interval (every 2 minutes)
const LOCK_REFRESH_INTERVAL_MS = 2 * 60 * 1000;

// ============ Team Management ============

/**
 * Create a new team
 */
export async function createTeam(name: string): Promise<Team | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('teams')
    .insert({ name, owner_id: user.id })
    .select()
    .single();

  if (error) {
    console.error('Error creating team:', error);
    return null;
  }

  const team = data as TeamRow;

  // Add owner as team member
  await supabase
    .from('team_members')
    .insert({ team_id: team.id, user_id: user.id, role: 'owner' });

  return {
    id: team.id,
    name: team.name,
    ownerId: team.owner_id,
    createdAt: new Date(team.created_at),
  };
}

/**
 * Get teams for current user
 */
export async function getTeams(): Promise<Team[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get teams where user is a member
  const { data: memberOf } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id);

  if (!memberOf || memberOf.length === 0) return [];

  const teamIds = memberOf.map(m => m.team_id);

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .in('id', teamIds);

  if (error) {
    console.error('Error fetching teams:', error);
    return [];
  }

  return (data as TeamRow[]).map(t => ({
    id: t.id,
    name: t.name,
    ownerId: t.owner_id,
    createdAt: new Date(t.created_at),
  }));
}

/**
 * Get team members
 */
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId);

  if (error) {
    console.error('Error fetching team members:', error);
    return [];
  }

  return (data as TeamMemberRow[]).map(m => ({
    id: m.id,
    teamId: m.team_id,
    userId: m.user_id,
    role: m.role,
    joinedAt: new Date(m.joined_at),
  }));
}

/**
 * Invite user to team by email
 */
export async function inviteToTeam(
  teamId: string,
  email: string,
  role: 'editor' | 'viewer' = 'editor'
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  // In a real app, this would send an email invitation
  // For now, we'll just add if user exists
  const { data: users } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', email)
    .single();

  if (!users) {
    console.error('User not found:', email);
    return false;
  }

  const { error } = await supabase
    .from('team_members')
    .insert({
      team_id: teamId,
      user_id: users.id,
      role,
    });

  if (error) {
    console.error('Error inviting to team:', error);
    return false;
  }

  return true;
}

/**
 * Remove member from team
 */
export async function removeFromTeam(teamId: string, userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing from team:', error);
    return false;
  }

  return true;
}

/**
 * Update member role
 */
export async function updateMemberRole(
  teamId: string,
  userId: string,
  role: 'editor' | 'viewer'
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating member role:', error);
    return false;
  }

  return true;
}

// ============ Edit Locks ============

/**
 * Acquire edit lock for a program
 */
export async function acquireEditLock(programId: string): Promise<EditLock | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

  // Check for existing lock
  const { data: existingLock } = await supabase
    .from('edit_locks')
    .select('*')
    .eq('program_id', programId)
    .gt('expires_at', now.toISOString())
    .single();

  if (existingLock) {
    const lock = existingLock as EditLockRow;
    // If we already own the lock, refresh it
    if (lock.user_id === user.id) {
      const { data: refreshed } = await supabase
        .from('edit_locks')
        .update({ expires_at: expiresAt.toISOString() })
        .eq('id', lock.id)
        .select()
        .single();

      if (refreshed) {
        const r = refreshed as EditLockRow;
        return {
          id: r.id,
          programId: r.program_id,
          userId: r.user_id,
          lockedAt: new Date(r.locked_at),
          expiresAt: new Date(r.expires_at),
        };
      }
    }

    // Someone else has the lock
    return null;
  }

  // Create new lock
  const { data, error } = await supabase
    .from('edit_locks')
    .insert({
      program_id: programId,
      user_id: user.id,
      locked_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error acquiring lock:', error);
    return null;
  }

  const lockData = data as EditLockRow;
  return {
    id: lockData.id,
    programId: lockData.program_id,
    userId: lockData.user_id,
    lockedAt: new Date(lockData.locked_at),
    expiresAt: new Date(lockData.expires_at),
  };
}

/**
 * Release edit lock
 */
export async function releaseEditLock(lockId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('edit_locks')
    .delete()
    .eq('id', lockId);

  if (error) {
    console.error('Error releasing lock:', error);
    return false;
  }

  return true;
}

/**
 * Get current lock for a program
 */
export async function getEditLock(programId: string): Promise<EditLock | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const now = new Date();

  const { data } = await supabase
    .from('edit_locks')
    .select('*')
    .eq('program_id', programId)
    .gt('expires_at', now.toISOString())
    .single();

  if (!data) return null;

  const lock = data as EditLockRow;
  return {
    id: lock.id,
    programId: lock.program_id,
    userId: lock.user_id,
    lockedAt: new Date(lock.locked_at),
    expiresAt: new Date(lock.expires_at),
  };
}

/**
 * Clean up expired locks (call periodically)
 */
export async function cleanupExpiredLocks(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const now = new Date();

  await supabase
    .from('edit_locks')
    .delete()
    .lt('expires_at', now.toISOString());
}

// Export constants for use in hooks
export { LOCK_DURATION_MS, LOCK_REFRESH_INTERVAL_MS };
