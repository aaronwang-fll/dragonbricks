import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../editorStore';
import type { Program, ParsedCommand } from '../../types';

describe('editorStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useEditorStore.setState({
      programs: [],
      currentProgram: null,
      commands: [],
      expandedCommands: new Set(),
      showRoutines: false,
      setupHeight: 150,
      routinesHeight: 200,
      showPythonPanel: false,
      pythonPanelWidth: 300,
    });
  });

  describe('program management', () => {
    const testProgram: Program = {
      id: 'test-1',
      name: 'Test Program',
      setupSection: '',
      mainSection: 'move forward 100',
      routines: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      profileId: null,
    };

    it('adds a program', () => {
      useEditorStore.getState().addProgram(testProgram);
      expect(useEditorStore.getState().programs).toHaveLength(1);
      expect(useEditorStore.getState().programs[0].name).toBe('Test Program');
    });

    it('sets current program', () => {
      useEditorStore.getState().addProgram(testProgram);
      useEditorStore.getState().setCurrentProgram(testProgram);
      expect(useEditorStore.getState().currentProgram?.id).toBe('test-1');
    });

    it('updates a program', () => {
      useEditorStore.getState().addProgram(testProgram);
      useEditorStore.getState().setCurrentProgram(testProgram);
      useEditorStore.getState().updateProgram('test-1', { name: 'Updated Name' });

      expect(useEditorStore.getState().programs[0].name).toBe('Updated Name');
      expect(useEditorStore.getState().currentProgram?.name).toBe('Updated Name');
    });

    it('deletes a program', () => {
      useEditorStore.getState().addProgram(testProgram);
      useEditorStore.getState().setCurrentProgram(testProgram);
      useEditorStore.getState().deleteProgram('test-1');

      expect(useEditorStore.getState().programs).toHaveLength(0);
      expect(useEditorStore.getState().currentProgram).toBeNull();
    });

    it('does not delete current program if different id', () => {
      const program2: Program = { ...testProgram, id: 'test-2', name: 'Program 2' };
      useEditorStore.getState().addProgram(testProgram);
      useEditorStore.getState().addProgram(program2);
      useEditorStore.getState().setCurrentProgram(program2);
      useEditorStore.getState().deleteProgram('test-1');

      expect(useEditorStore.getState().programs).toHaveLength(1);
      expect(useEditorStore.getState().currentProgram?.id).toBe('test-2');
    });
  });

  describe('command management', () => {
    const testCommands: ParsedCommand[] = [
      { id: 'cmd-1', naturalLanguage: 'move forward 100', pythonCode: 'robot.straight(100)', status: 'parsed' },
      { id: 'cmd-2', naturalLanguage: 'turn right 90', pythonCode: 'robot.turn(90)', status: 'parsed' },
    ];

    it('sets commands', () => {
      useEditorStore.getState().setCommands(testCommands);
      expect(useEditorStore.getState().commands).toHaveLength(2);
    });

    it('updates a specific command', () => {
      useEditorStore.getState().setCommands(testCommands);
      useEditorStore.getState().updateCommand('cmd-1', { status: 'error', error: 'Something wrong' });

      const cmd = useEditorStore.getState().commands.find(c => c.id === 'cmd-1');
      expect(cmd?.status).toBe('error');
      expect(cmd?.error).toBe('Something wrong');
    });
  });

  describe('command expansion', () => {
    const testCommands: ParsedCommand[] = [
      { id: 'cmd-1', naturalLanguage: 'move forward 100', status: 'parsed' },
      { id: 'cmd-2', naturalLanguage: 'turn right 90', status: 'parsed' },
    ];

    beforeEach(() => {
      useEditorStore.getState().setCommands(testCommands);
    });

    it('toggles command expansion', () => {
      useEditorStore.getState().toggleCommandExpanded('cmd-1');
      expect(useEditorStore.getState().expandedCommands.has('cmd-1')).toBe(true);

      useEditorStore.getState().toggleCommandExpanded('cmd-1');
      expect(useEditorStore.getState().expandedCommands.has('cmd-1')).toBe(false);
    });

    it('expands all commands', () => {
      useEditorStore.getState().expandAllCommands();
      expect(useEditorStore.getState().expandedCommands.size).toBe(2);
      expect(useEditorStore.getState().expandedCommands.has('cmd-1')).toBe(true);
      expect(useEditorStore.getState().expandedCommands.has('cmd-2')).toBe(true);
    });

    it('collapses all commands', () => {
      useEditorStore.getState().expandAllCommands();
      useEditorStore.getState().collapseAllCommands();
      expect(useEditorStore.getState().expandedCommands.size).toBe(0);
    });
  });

  describe('UI state', () => {
    it('sets setup height', () => {
      useEditorStore.getState().setSetupHeight(200);
      expect(useEditorStore.getState().setupHeight).toBe(200);
    });

    it('sets routines height', () => {
      useEditorStore.getState().setRoutinesHeight(250);
      expect(useEditorStore.getState().routinesHeight).toBe(250);
    });

    it('toggles show routines', () => {
      useEditorStore.getState().setShowRoutines(true);
      expect(useEditorStore.getState().showRoutines).toBe(true);
    });

    it('toggles python panel', () => {
      useEditorStore.getState().setShowPythonPanel(true);
      expect(useEditorStore.getState().showPythonPanel).toBe(true);
    });

    it('sets python panel width', () => {
      useEditorStore.getState().setPythonPanelWidth(400);
      expect(useEditorStore.getState().pythonPanelWidth).toBe(400);
    });
  });

  describe('defaults', () => {
    it('sets defaults', () => {
      const newDefaults = { speed: 300, turnRate: 200, motorSpeed: 500, wheelDiameter: 60, axleTrack: 120 };
      useEditorStore.getState().setDefaults(newDefaults);
      expect(useEditorStore.getState().defaults.speed).toBe(300);
    });

    it('updates defaults partially', () => {
      useEditorStore.getState().updateDefaults({ speed: 400 });
      expect(useEditorStore.getState().defaults.speed).toBe(400);
      // Other defaults should remain unchanged
      expect(useEditorStore.getState().defaults.turnRate).toBeDefined();
    });
  });

  describe('LLM config', () => {
    it('updates LLM config', () => {
      useEditorStore.getState().updateLLMConfig({ provider: 'openai', model: 'gpt-4o' });
      expect(useEditorStore.getState().llmConfig.provider).toBe('openai');
      expect(useEditorStore.getState().llmConfig.model).toBe('gpt-4o');
    });
  });
});
