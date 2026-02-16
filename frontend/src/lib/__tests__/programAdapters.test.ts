import { describe, expect, it } from 'vitest';
import type { Program as ApiProgram, ProgramListItem } from '../api';
import type { Program as FrontendProgram } from '../../types';
import {
  isLocalProgramId,
  mapApiProgramListItemToFrontendProgram,
  mapApiProgramToFrontendProgram,
  mapFrontendProgramToProgramCreate,
  mapFrontendProgramToProgramUpdate,
} from '../programAdapters';

describe('programAdapters', () => {
  it('maps program list items to frontend program placeholders', () => {
    const listItem: ProgramListItem = {
      id: 'cloud-1',
      name: 'Cloud Program',
      owner_id: 'owner-1',
      is_public: false,
      version: 1,
      created_at: '2026-02-16T12:00:00.000Z',
      updated_at: '2026-02-16T12:05:00.000Z',
    };

    const mapped = mapApiProgramListItemToFrontendProgram(listItem);
    expect(mapped.id).toBe('cloud-1');
    expect(mapped.name).toBe('Cloud Program');
    expect(mapped.mainSection).toBe('');
    expect(mapped.routines).toEqual([]);
    expect(mapped.createdAt.toISOString()).toBe('2026-02-16T12:00:00.000Z');
    expect(mapped.updatedAt.toISOString()).toBe('2026-02-16T12:05:00.000Z');
  });

  it('maps full api program to frontend program', () => {
    const apiProgram: ApiProgram = {
      id: 'cloud-2',
      name: 'Hydrated Program',
      owner_id: 'owner-1',
      setup_section: { raw: 'set wheel diameter to 56' },
      main_section: 'move forward 100mm',
      routines: [{ id: 'r1', name: 'turn_around', parameters: [], body: 'turn right 180' }],
      is_public: false,
      version: 2,
      created_at: '2026-02-16T13:00:00.000Z',
      updated_at: '2026-02-16T13:10:00.000Z',
    };

    const mapped = mapApiProgramToFrontendProgram(apiProgram);
    expect(mapped.setupSection).toBe('set wheel diameter to 56');
    expect(mapped.mainSection).toBe('move forward 100mm');
    expect(mapped.routines).toHaveLength(1);
    expect(mapped.createdAt.toISOString()).toBe('2026-02-16T13:00:00.000Z');
  });

  it('maps frontend program payloads for create and update', () => {
    const program: FrontendProgram = {
      id: 'program-123',
      name: 'Local Draft',
      setupSection: '{"wheelDiameter":56}',
      mainSection: 'move forward 100mm',
      routines: [
        { id: 'r1', name: 'start', parameters: ['distance'], body: 'move forward distance' },
      ],
      createdAt: new Date('2026-02-16T12:00:00.000Z'),
      updatedAt: new Date('2026-02-16T12:00:00.000Z'),
      profileId: null,
    };

    const createPayload = mapFrontendProgramToProgramCreate(program);
    expect(createPayload.name).toBe('Local Draft');
    expect(createPayload.setup_section).toEqual({ wheelDiameter: 56 });
    expect(createPayload.main_section).toBe('move forward 100mm');
    expect(createPayload.routines).toHaveLength(1);

    const updatePayload = mapFrontendProgramToProgramUpdate({ ...program, routines: [] });
    expect(updatePayload.routines).toEqual([]);
  });

  it('detects local program ids', () => {
    expect(isLocalProgramId('program-1')).toBe(true);
    expect(isLocalProgramId('cloud-1')).toBe(false);
  });
});
