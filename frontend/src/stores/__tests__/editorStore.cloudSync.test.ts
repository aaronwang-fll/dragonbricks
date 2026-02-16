import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import type { Program as FrontendProgram } from '../../types';
import type { Program as ApiProgram } from '../../lib/api';

const apiMock = vi.hoisted(() => ({
  getToken: vi.fn<() => string | null>(),
  createProgram: vi.fn(),
  updateProgram: vi.fn(),
}));

vi.mock('../../lib/api', () => ({
  api: apiMock,
}));

import { useEditorStore } from '../editorStore';
import { DEFAULT_VALUES } from '../../types';

const makeFrontendProgram = (overrides: Partial<FrontendProgram> = {}): FrontendProgram => ({
  id: 'cloud-1',
  name: 'Program',
  setupSection: '',
  mainSection: '',
  routines: [],
  createdAt: new Date('2026-02-16T12:00:00.000Z'),
  updatedAt: new Date('2026-02-16T12:00:00.000Z'),
  profileId: null,
  ...overrides,
});

const makeApiProgram = (overrides: Partial<ApiProgram> = {}): ApiProgram => ({
  id: 'cloud-1',
  name: 'Program',
  owner_id: 'owner-1',
  setup_section: undefined,
  main_section: '',
  routines: [],
  is_public: false,
  version: 1,
  created_at: '2026-02-16T12:00:00.000Z',
  updated_at: '2026-02-16T12:00:00.000Z',
  ...overrides,
});

describe('editorStore cloud sync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    apiMock.getToken.mockReturnValue(null);
    apiMock.createProgram.mockResolvedValue(makeApiProgram());
    apiMock.updateProgram.mockResolvedValue(makeApiProgram());

    useEditorStore.setState({
      programs: [],
      currentProgram: null,
      commands: [],
      defaults: DEFAULT_VALUES,
      expandedCommands: new Set(),
      showRoutines: false,
      setupHeight: 150,
      routinesHeight: 200,
      showPythonPanel: false,
      pythonPanelWidth: 300,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('does not sync when unauthenticated', async () => {
    const remote = makeFrontendProgram({ id: 'cloud-1' });
    useEditorStore.setState({ programs: [remote], currentProgram: remote });

    useEditorStore.getState().updateProgram('cloud-1', { mainSection: 'move forward 100mm' });
    vi.advanceTimersByTime(800);
    await Promise.resolve();

    expect(apiMock.updateProgram).not.toHaveBeenCalled();
    expect(apiMock.createProgram).not.toHaveBeenCalled();
  });

  it('creates cloud programs for new local entries when authenticated', async () => {
    apiMock.getToken.mockReturnValue('jwt-token');
    apiMock.createProgram.mockResolvedValue(
      makeApiProgram({ id: 'cloud-created', name: 'Synced Program' }),
    );

    const localProgram = makeFrontendProgram({
      id: 'program-123',
      name: 'Synced Program',
      mainSection: 'move forward 100mm',
    });

    useEditorStore.getState().addProgram(localProgram);

    await vi.waitFor(() => {
      expect(apiMock.createProgram).toHaveBeenCalledTimes(1);
    });

    expect(useEditorStore.getState().programs[0]?.id).toBe('cloud-created');
  });

  it('debounces cloud updates by 750ms', async () => {
    apiMock.getToken.mockReturnValue('jwt-token');
    const remote = makeFrontendProgram({ id: 'cloud-1' });
    useEditorStore.setState({ programs: [remote], currentProgram: remote });

    useEditorStore.getState().updateProgram('cloud-1', { mainSection: 'first' });
    useEditorStore.getState().updateProgram('cloud-1', { mainSection: 'second' });

    vi.advanceTimersByTime(749);
    await Promise.resolve();
    expect(apiMock.updateProgram).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await vi.waitFor(() => {
      expect(apiMock.updateProgram).toHaveBeenCalledTimes(1);
    });
    expect(apiMock.updateProgram.mock.calls[0][0]).toBe('cloud-1');
    expect(apiMock.updateProgram.mock.calls[0][1]).toMatchObject({
      main_section: 'second',
    });
  });

  it('flushes pending sync when switching programs', async () => {
    apiMock.getToken.mockReturnValue('jwt-token');
    const first = makeFrontendProgram({ id: 'cloud-1', name: 'First' });
    const second = makeFrontendProgram({ id: 'cloud-2', name: 'Second' });
    useEditorStore.setState({ programs: [first, second], currentProgram: first });

    useEditorStore.getState().updateProgram('cloud-1', { mainSection: 'updated content' });
    useEditorStore.getState().setCurrentProgram(second);

    await vi.waitFor(() => {
      expect(apiMock.updateProgram).toHaveBeenCalledTimes(1);
    });

    vi.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(apiMock.updateProgram).toHaveBeenCalledTimes(1);
  });
});
