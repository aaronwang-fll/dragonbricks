import type {
  Program as ApiProgram,
  ProgramCreate,
  ProgramListItem,
  Routine as ApiRoutine,
} from './api';
import type { Program as FrontendProgram, Routine as FrontendRoutine } from '../types';

const LOCAL_PROGRAM_PREFIX = 'program-';

const toDate = (value: string | undefined): Date => {
  if (!value) {
    return new Date();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const fromApiSetupSection = (setupSection: unknown): string => {
  if (!setupSection) {
    return '';
  }
  if (typeof setupSection === 'string') {
    return setupSection;
  }
  if (
    typeof setupSection === 'object' &&
    !Array.isArray(setupSection) &&
    'raw' in setupSection &&
    typeof (setupSection as { raw?: unknown }).raw === 'string'
  ) {
    return (setupSection as { raw: string }).raw;
  }
  return JSON.stringify(setupSection, null, 2);
};

const toApiSetupSection = (setupSection: string): Record<string, unknown> | undefined => {
  const trimmed = setupSection.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Store non-JSON setup text as a raw string payload.
  }

  return { raw: trimmed };
};

const mapRoutineFromApi = (routine: ApiRoutine): FrontendRoutine => ({
  id: routine.id,
  name: routine.name,
  parameters: routine.parameters ?? [],
  body: routine.body ?? '',
});

const mapRoutineToApi = (routine: FrontendRoutine): ApiRoutine => ({
  id: routine.id,
  name: routine.name,
  parameters: routine.parameters,
  body: routine.body,
});

export const isLocalProgramId = (programId: string): boolean =>
  programId.startsWith(LOCAL_PROGRAM_PREFIX);

export const mapApiProgramListItemToFrontendProgram = (
  program: ProgramListItem,
): FrontendProgram => ({
  id: program.id,
  name: program.name,
  setupSection: '',
  mainSection: '',
  routines: [],
  createdAt: toDate(program.created_at),
  updatedAt: toDate(program.updated_at),
  profileId: null,
});

export const mapApiProgramToFrontendProgram = (program: ApiProgram): FrontendProgram => ({
  id: program.id,
  name: program.name,
  setupSection: fromApiSetupSection(program.setup_section),
  mainSection: program.main_section ?? '',
  routines: (program.routines ?? []).map(mapRoutineFromApi),
  createdAt: toDate(program.created_at),
  updatedAt: toDate(program.updated_at),
  profileId: null,
});

export const mapFrontendProgramToProgramCreate = (program: FrontendProgram): ProgramCreate => ({
  name: program.name,
  setup_section: toApiSetupSection(program.setupSection),
  main_section: program.mainSection || undefined,
  routines: program.routines.length > 0 ? program.routines.map(mapRoutineToApi) : undefined,
});

export const mapFrontendProgramToProgramUpdate = (
  program: FrontendProgram,
): Pick<ApiProgram, 'name' | 'setup_section' | 'main_section' | 'routines'> => ({
  name: program.name,
  setup_section: toApiSetupSection(program.setupSection),
  main_section: program.mainSection || undefined,
  routines: program.routines.length > 0 ? program.routines.map(mapRoutineToApi) : [],
});
