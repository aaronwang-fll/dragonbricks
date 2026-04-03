import { describe, it, expect, beforeEach } from 'vitest';
import { saveRecording, discardRecording, processAndShow } from '../recordingService';
import { useRecordingStore } from '../../../stores/recordingStore';
import { useEditorStore } from '../../../stores/editorStore';
import type { TelemetrySample } from '../../../types/recording';

describe('recordingService', () => {
  beforeEach(() => {
    // Reset stores
    useRecordingStore.getState().reset();
    // Ensure a currentProgram exists and clear its routines
    const editor = useEditorStore.getState();
    if (!editor.currentProgram) {
      // Restore a default program if a previous test nulled it
      const fallback = editor.programs[0] ?? {
        id: 'test-program',
        name: 'Test',
        commands: [],
        routines: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      editor.setCurrentProgram(fallback);
    }
    const current = useEditorStore.getState().currentProgram!;
    editor.updateProgram(current.id, { routines: [] }, { sync: false });
  });

  describe('saveRecording', () => {
    it('saves a routine to the current program', () => {
      const replayCode = '_moves = [(50, 10, 10)]\nfor dt, l, r in _moves:\n    wait(dt)';
      saveRecording('my_routine', replayCode);

      const { currentProgram } = useEditorStore.getState();
      expect(currentProgram).not.toBeNull();
      expect(currentProgram!.routines).toHaveLength(1);
      expect(currentProgram!.routines[0].name).toBe('my_routine');
      expect(currentProgram!.routines[0].body).toBe(replayCode);
      expect(currentProgram!.routines[0].parameters).toEqual([]);
    });

    it('sanitizes the routine name', () => {
      saveRecording('My Recording!', 'wait(50)');

      const { currentProgram } = useEditorStore.getState();
      expect(currentProgram!.routines[0].name).toBe('my_recording');
    });

    it('appends numeric suffix on name collision', () => {
      saveRecording('test', 'wait(50)');
      saveRecording('test', 'wait(100)');

      const { currentProgram } = useEditorStore.getState();
      expect(currentProgram!.routines).toHaveLength(2);
      expect(currentProgram!.routines[0].name).toBe('test');
      expect(currentProgram!.routines[1].name).toBe('test_1');
    });

    it('resets the recording store after saving', () => {
      saveRecording('test', 'wait(50)');

      const store = useRecordingStore.getState();
      expect(store.phase).toBe('idle');
      expect(store.showSaveDialog).toBe(false);
      expect(store.replayCode).toBe('');
    });

    it('expands the routines section after saving', () => {
      saveRecording('test', 'wait(50)');

      const { showRoutines } = useEditorStore.getState();
      expect(showRoutines).toBe(true);
    });

    it('sets error when no current program', () => {
      // Force currentProgram to null
      useEditorStore.getState().setCurrentProgram(null);

      saveRecording('test', 'wait(50)');

      const store = useRecordingStore.getState();
      expect(store.error).toBe('No active program. Create a program first.');
    });

    it('uses fallback name when sanitized result is empty', () => {
      saveRecording('!!!', 'wait(50)');

      const { currentProgram } = useEditorStore.getState();
      expect(currentProgram!.routines[0].name).toBe('recorded_routine');
    });
  });

  describe('discardRecording', () => {
    it('resets the recording store', () => {
      const store = useRecordingStore.getState();
      store.setPhase('saving');
      store.setShowSaveDialog(true);
      store.setReplayCode('some code');

      discardRecording();

      const updated = useRecordingStore.getState();
      expect(updated.phase).toBe('idle');
      expect(updated.showSaveDialog).toBe(false);
      expect(updated.replayCode).toBe('');
    });
  });

  describe('processAndShow', () => {
    it('processes samples and opens save dialog', () => {
      const samples: TelemetrySample[] = [
        { timestamp: 0, leftAngle: 0, rightAngle: 0 },
        { timestamp: 50, leftAngle: 20, rightAngle: 20 },
        { timestamp: 100, leftAngle: 40, rightAngle: 40 },
      ];

      processAndShow(samples);

      const store = useRecordingStore.getState();
      expect(store.phase).toBe('saving');
      expect(store.showSaveDialog).toBe(true);
      expect(store.replayCode).toContain('robot.straight(');
      expect(store.commands.length).toBeGreaterThanOrEqual(1);
    });

    it('sets error for idle-only recording with <2 samples', () => {
      processAndShow([{ timestamp: 0, leftAngle: 0, rightAngle: 0 }]);

      const store = useRecordingStore.getState();
      expect(store.error).toBeTruthy();
      expect(store.phase).toBe('idle');
    });

    it('end-to-end: processAndShow then saveRecording', () => {
      const samples: TelemetrySample[] = [
        { timestamp: 0, leftAngle: 0, rightAngle: 0 },
        { timestamp: 50, leftAngle: 30, rightAngle: 25 },
        { timestamp: 100, leftAngle: 60, rightAngle: 50 },
      ];

      processAndShow(samples);

      const store = useRecordingStore.getState();
      expect(store.showSaveDialog).toBe(true);

      // Simulate user saving
      saveRecording('test_movement', store.replayCode);

      const { currentProgram } = useEditorStore.getState();
      expect(currentProgram!.routines).toHaveLength(1);
      expect(currentProgram!.routines[0].name).toBe('test_movement');
      expect(currentProgram!.routines[0].body).toContain('robot.');

      // Store should be reset
      const updated = useRecordingStore.getState();
      expect(updated.phase).toBe('idle');
      expect(updated.showSaveDialog).toBe(false);
    });
  });
});
