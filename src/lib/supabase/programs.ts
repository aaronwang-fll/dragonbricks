import { getSupabaseClient, type ProgramRow, type ProfileRow } from './client';
import type { Program, RobotProfile, Routine } from '../../types';

/**
 * Convert database row to Program type
 */
function rowToProgram(row: ProgramRow): Program {
  return {
    id: row.id,
    name: row.name,
    setupSection: row.setup_section,
    mainSection: row.main_section,
    routines: (row.routines as unknown as Routine[]) || [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    profileId: row.profile_id,
  };
}

/**
 * Convert Program to database insert format
 */
function programToRow(
  program: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string,
  teamId?: string
): Omit<ProgramRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    team_id: teamId || null,
    name: program.name,
    setup_section: program.setupSection,
    main_section: program.mainSection,
    routines: program.routines as unknown as Record<string, unknown>[],
    profile_id: program.profileId,
  };
}

// ============ Program CRUD ============

/**
 * Get all programs for current user
 */
export async function getPrograms(): Promise<Program[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching programs:', error);
    return [];
  }

  return (data as ProgramRow[]).map(rowToProgram);
}

/**
 * Get a single program by ID
 */
export async function getProgram(id: string): Promise<Program | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching program:', error);
    return null;
  }

  return rowToProgram(data as ProgramRow);
}

/**
 * Create a new program
 */
export async function createProgram(
  program: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>,
  teamId?: string
): Promise<Program | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('programs')
    .insert(programToRow(program, user.id, teamId))
    .select()
    .single();

  if (error) {
    console.error('Error creating program:', error);
    return null;
  }

  return rowToProgram(data as ProgramRow);
}

/**
 * Update an existing program
 */
export async function updateProgram(
  id: string,
  updates: Partial<Omit<Program, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Program | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.setupSection !== undefined) dbUpdates.setup_section = updates.setupSection;
  if (updates.mainSection !== undefined) dbUpdates.main_section = updates.mainSection;
  if (updates.routines !== undefined) dbUpdates.routines = updates.routines;
  if (updates.profileId !== undefined) dbUpdates.profile_id = updates.profileId;

  const { data, error } = await supabase
    .from('programs')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating program:', error);
    return null;
  }

  return rowToProgram(data as ProgramRow);
}

/**
 * Delete a program
 */
export async function deleteProgram(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('programs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting program:', error);
    return false;
  }

  return true;
}

// ============ Team Programs ============

/**
 * Get all programs for a team
 */
export async function getTeamPrograms(teamId: string): Promise<Program[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('team_id', teamId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching team programs:', error);
    return [];
  }

  return (data as ProgramRow[]).map(rowToProgram);
}

// ============ Profile CRUD ============

/**
 * Convert database row to RobotProfile type
 */
function rowToProfile(row: ProfileRow): RobotProfile {
  const config = row.config as Record<string, unknown>;
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default,
    leftMotor: config.leftMotor as RobotProfile['leftMotor'],
    rightMotor: config.rightMotor as RobotProfile['rightMotor'],
    wheelDiameter: config.wheelDiameter as number,
    axleTrack: config.axleTrack as number,
    sensors: config.sensors as RobotProfile['sensors'],
    extraMotors: config.extraMotors as RobotProfile['extraMotors'],
  };
}

/**
 * Get all profiles for current user
 */
export async function getProfiles(): Promise<RobotProfile[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }

  return (data as ProfileRow[]).map(rowToProfile);
}

/**
 * Create a new profile
 */
export async function createProfile(
  profile: Omit<RobotProfile, 'id'>
): Promise<RobotProfile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      name: profile.name,
      is_default: profile.isDefault,
      config: {
        leftMotor: profile.leftMotor,
        rightMotor: profile.rightMotor,
        wheelDiameter: profile.wheelDiameter,
        axleTrack: profile.axleTrack,
        sensors: profile.sensors,
        extraMotors: profile.extraMotors,
      },
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    return null;
  }

  return rowToProfile(data as ProfileRow);
}

/**
 * Update a profile
 */
export async function updateProfile(
  id: string,
  updates: Partial<Omit<RobotProfile, 'id'>>
): Promise<RobotProfile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  // First get current profile to merge config
  const { data: current } = await supabase
    .from('profiles')
    .select('config')
    .eq('id', id)
    .single();

  const currentConfig = (current?.config as Record<string, unknown>) || {};
  const dbUpdates: Record<string, unknown> = {};

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault;

  // Merge config updates
  const configUpdates: Record<string, unknown> = { ...currentConfig };
  if (updates.leftMotor !== undefined) configUpdates.leftMotor = updates.leftMotor;
  if (updates.rightMotor !== undefined) configUpdates.rightMotor = updates.rightMotor;
  if (updates.wheelDiameter !== undefined) configUpdates.wheelDiameter = updates.wheelDiameter;
  if (updates.axleTrack !== undefined) configUpdates.axleTrack = updates.axleTrack;
  if (updates.sensors !== undefined) configUpdates.sensors = updates.sensors;
  if (updates.extraMotors !== undefined) configUpdates.extraMotors = updates.extraMotors;

  dbUpdates.config = configUpdates;

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return rowToProfile(data as ProfileRow);
}

/**
 * Delete a profile
 */
export async function deleteProfile(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting profile:', error);
    return false;
  }

  return true;
}
